import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { adminUrl, dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'

/** Organizations the memberships are spread over, so the index serves one of several tenants. */
const ORGANIZATIONS = 10
/** Memberships per Organization: 100,000 in all. The planner works from statistics (ANALYZE below). */
const PER_ORGANIZATION = 10_000

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`

/** The node types of a JSON plan, the sequential scans, and the names of the indexes it scans. */
function planFacts(plan: unknown): { nodes: string[]; indexes: string[]; seqScans: string[] } {
  const nodes: string[] = []
  const seqScans: string[] = []
  const indexes: string[] = []
  const walk = (node: unknown): void => {
    if (typeof node !== 'object' || node === null) {
      return
    }
    const record = node as Record<string, unknown>
    if (typeof record['Node Type'] === 'string') {
      nodes.push(record['Node Type'])
    }
    if (record['Node Type'] === 'Seq Scan') {
      seqScans.push(String(record['Relation Name']))
    }
    if (typeof record['Index Name'] === 'string') {
      indexes.push(record['Index Name'])
    }
    for (const value of Object.values(record)) {
      if (Array.isArray(value)) {
        value.forEach(walk)
      } else {
        walk(value)
      }
    }
  }
  walk(plan)
  return { nodes, indexes, seqScans }
}

describe('the members name filter q uses the trigram index', () => {
  let owner: Pool
  let core: Pool
  let admin: Pool
  const orgIds = Array.from({ length: ORGANIZATIONS }, () => newId('org'))
  const orgId = orgIds[0] as string
  const otherOrgId = orgIds[1] as string

  /** Run `fn` in one transaction scoped to the Organization, as the core role. */
  async function scoped<T>(fn: (c: PoolClient) => Promise<T>, organization = orgId): Promise<T> {
    const c = await core.connect()
    try {
      await c.query('begin')
      await c.query('select set_config($1, $2, true)', [SETTING, organization])
      const result = await fn(c)
      await c.query('commit')
      return result
    } catch (error) {
      await c.query('rollback').catch(() => undefined)
      throw error
    } finally {
      c.release()
    }
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    core = new Pool({ connectionString: env.core, max: 2 })
    admin = new Pool({ connectionString: adminUrl(), max: 1 })
    await dropStaleTestObjects(owner, env.owner)
    for (const [index, organization] of orgIds.entries()) {
      const c = await owner.connect()
      try {
        await c.query('begin')
        await c.query('select set_config($1, $2, true)', [SETTING, organization])
        await c.query(
          'insert into core.organizations (organization_id, name, region) values ($1, $2, $3)',
          [organization, 'Members', 'us']
        )
        await c.query(
          "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, 'owner', 'o@example.test')",
          [newId('mem'), organization, newId('usr')]
        )
        // The directory and owner-count triggers run once per row; the rows below already satisfy
        // what they keep. Re-enabled before commit.
        await c.query('alter table core.memberships disable trigger user')
        // Member n is "Member n". In the first two Organizations member 7 carries the rare term
        // "zyxquux", and member 8 has a name that probes the escaping of `%`, `_` and `\`.
        await c.query(
          `insert into core.memberships (id, organization_id, user_id, role, email, name)
           select 'mem_' || md5($1::text || n::text), $1, 'usr_' || md5($1::text || 'u' || n::text),
                  'rep', 'm' || n || '@org' || $3::int || '.test',
                  case when n = 7 and $3::int < 2 then 'Zyxquux Person ' || $3::int
                       when n = 8 and $3::int < 2 then '50%_off\\deal'
                       when n % 10 = 0 then null
                       else 'Member ' || n end
             from generate_series(1, $2::int) n`,
          [organization, PER_ORGANIZATION, index]
        )
        await c.query('alter table core.memberships enable trigger user')
        await c.query('commit')
      } catch (error) {
        await c.query('rollback').catch(() => undefined)
        throw error
      } finally {
        c.release()
      }
    }
    // Plans depend on statistics, and autovacuum may not have analysed the fresh table yet.
    await owner.query('analyze core.memberships')
  }, 600_000)

  afterAll(async () => {
    // Row-level security binds the owner too, so each Organization is scoped before its delete.
    const c = await owner.connect()
    let left = 0
    try {
      for (const organization of orgIds) {
        await c.query('begin')
        await c.query('select set_config($1, $2, true)', [SETTING, organization])
        await c.query('delete from core.organizations where organization_id = $1', [organization])
        left += (await c.query('select count(*)::int as n from core.memberships')).rows[0].n
        await c.query('commit')
      }
    } catch (error) {
      await c.query('rollback').catch(() => undefined)
      throw error
    } finally {
      c.release()
      await dropStaleTestObjects(owner, env.owner).catch(() => undefined)
      await Promise.all([owner.end(), core.end(), admin.end()])
    }
    expect(left).toBe(0)
  }, 600_000)

  const searchIds = async (
    q: string | null,
    after: string | null = null,
    maxRows = 101,
    organization = orgId
  ): Promise<string[]> =>
    scoped(
      async (c) =>
        (
          await c.query('select id from core.search_membership_ids($1, $2, $3)', [
            q,
            after,
            maxRows,
          ])
        ).rows.map((row) => row.id),
      organization
    )

  /**
   * The plans of every statement a call runs, inside the function too: the core role calls it with
   * the Organization set, and auto_explain (loaded by the superuser for this session) sends each
   * nested plan back as a notice. Rolled back, so nothing it does is kept.
   */
  async function planOfCall(sql: string, values: unknown[]) {
    const c = await admin.connect()
    const plans: unknown[] = []
    c.on('notice', (notice) => {
      const message = notice.message ?? ''
      const at = message.indexOf('plan:')
      if (at >= 0) {
        plans.push(JSON.parse(message.slice(at + 5)))
      }
    })
    try {
      await c.query("load 'auto_explain'")
      await c.query('set auto_explain.log_min_duration = 0')
      await c.query('set auto_explain.log_nested_statements = on')
      await c.query("set auto_explain.log_format = 'json'")
      await c.query('set client_min_messages = log')
      await c.query('begin')
      await c.query('set local role closeline_core')
      await c.query('select set_config($1, $2, true)', [SETTING, orgId])
      await c.query(sql, values)
      return planFacts(plans)
    } finally {
      await c.query('rollback').catch(() => undefined)
      c.release()
    }
  }

  // Under the tenant policy the core role cannot hand a trigram index an `ilike` (it is not
  // leakproof), so the search runs in a function owned by a role that bypasses row-level security,
  // with the Organization filter written out in the query (migration 0037).
  test('called by the core role, the member search is a bitmap scan of the name trigram index', async () => {
    const plan = await planOfCall('select id from core.search_membership_ids($1, $2, $3)', [
      'zyxquux',
      null,
      101,
    ])
    expect(plan.nodes).toContain('Bitmap Index Scan')
    expect(plan.seqScans).toEqual([])
    expect([...new Set(plan.indexes)]).toEqual(['memberships_name_trgm_idx'])
  })

  test('the function returns the rare match, and only for the Organization in the setting', async () => {
    const own = `mem_${(await owner.query("select md5($1::text || '7') as h", [orgId])).rows[0].h}`
    const other = `mem_${(await owner.query("select md5($1::text || '7') as h", [otherOrgId])).rows[0].h}`
    expect(await searchIds('zyxquux')).toEqual([own])
    expect(await searchIds('ZYXQUUX')).toEqual([own])
    expect(await searchIds('zyxquux', null, 101, otherOrgId)).toEqual([other])
    expect(await searchIds('zyxquux', null, 101, orgIds[2] as string)).toEqual([])
    // Past the cursor, nothing remains.
    expect(await searchIds('zyxquux', own)).toEqual([])
  })

  test('% _ and \\ in q match themselves, and a limit and cursor page by id', async () => {
    expect((await searchIds('50%_off\\deal')).length).toBe(1)
    expect(await searchIds('50x')).toEqual([])
    const first = await searchIds('Member 12', null, 3)
    expect(first.length).toBe(3)
    expect([...first].sort()).toEqual(first)
    const next = await searchIds('Member 12', first[2] as string, 3)
    expect(next.every((id) => id > (first[2] as string))).toBe(true)
    expect(await searchIds('Member 12', null, 500)).toEqual(
      expect.arrayContaining([...first, ...next])
    )
    expect((await searchIds('Member', null, 5000)).length).toBe(101)
  })

  test('a null or empty q, or no tenant setting, gives no row', async () => {
    expect(await searchIds(null)).toEqual([])
    expect(await searchIds('')).toEqual([])
    expect(await searchIds('zyxquux', null, 0)).toEqual([])
    const c = await core.connect()
    try {
      await c.query('begin')
      const rows = await c.query("select id from core.search_membership_ids('zyxquux', null, 101)")
      expect(rows.rowCount).toBe(0)
    } finally {
      await c.query('rollback').catch(() => undefined)
      c.release()
    }
  })
})
