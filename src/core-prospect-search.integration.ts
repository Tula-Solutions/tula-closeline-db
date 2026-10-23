import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'

/**
 * Prospects (each with one current email) in the one Organization the plans are read from.
 * Loading costs about 100 microseconds a row, so the default 200,000 keeps the file near 20
 * seconds; PROSPECT_SEARCH_SCALE=1000000 reads the same plans at one million (about 105 seconds,
 * all passing when this was written). The planner works from statistics (ANALYZE below).
 */
const PROSPECTS = Number(process.env.PROSPECT_SEARCH_SCALE) || 200_000
/** Prospect Companies in that Organization, a quarter as many. */
const COMPANIES = Math.floor(PROSPECTS / 4)

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`

/** The node types of a JSON plan, and the names of the indexes it scans, in one flat list. */
function planFacts(plan: unknown): { nodes: string[]; indexes: string[] } {
  const nodes: string[] = []
  const indexes: string[] = []
  const walk = (node: unknown): void => {
    if (typeof node !== 'object' || node === null) {
      return
    }
    const record = node as Record<string, unknown>
    if (typeof record['Node Type'] === 'string') {
      nodes.push(record['Node Type'])
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
  return { nodes, indexes }
}

describe('the Prospect list filter q uses the trigram indexes', () => {
  let owner: Pool
  let core: Pool
  const orgId = newId('org')

  /** Run `fn` in one transaction scoped to the Organization, as the core role. */
  async function scoped<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await core.connect()
    try {
      await c.query('begin')
      await c.query('select set_config($1, $2, true)', [SETTING, orgId])
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

  /** The plan the core role gets, with row-level security on: the planner's choice on statistics alone. */
  async function explainAsCore(sql: string, values: unknown[]) {
    return scoped(async (c) => {
      const result = await c.query(`explain (format json) ${sql}`, values)
      return planFacts(result.rows[0]['QUERY PLAN'])
    })
  }

  /**
   * The plan with row-level security switched off for the table, inside a transaction that is
   * rolled back. This shows what the index can do on its own: under the tenant policy the
   * planner refuses it (see the last test).
   */
  async function explainWithoutPolicy(table: string, sql: string, values: unknown[]) {
    const c = await owner.connect()
    try {
      await c.query('begin')
      await c.query(`alter table core.${table} no force row level security`)
      await c.query(`alter table core.${table} disable row level security`)
      const result = await c.query(`explain (format json) ${sql}`, values)
      return planFacts(result.rows[0]['QUERY PLAN'])
    } finally {
      await c.query('rollback').catch(() => undefined)
      c.release()
    }
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    core = new Pool({ connectionString: env.core, max: 2 })
    await dropStaleTestObjects(owner, env.owner)
    const c = await owner.connect()
    try {
      await c.query('begin')
      await c.query('select set_config($1, $2, true)', [SETTING, orgId])
      await c.query(
        'insert into core.organizations (organization_id, name, region) values ($1, $2, $3)',
        [orgId, 'Search', 'us']
      )
      await c.query(
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, 'owner', 'o@example.test')",
        [newId('mem'), orgId, newId('usr')]
      )
      // The history triggers take an advisory lock per row, which one transaction cannot hold a
      // million of; the rows below already satisfy what they enforce. Re-enabled before commit.
      for (const table of ['prospect_companies', 'prospects', 'prospect_fields']) {
        await c.query(`alter table core.${table} disable trigger user`)
      }
      // Company n is "Company n"; company 777 carries the rare term "zyxquux".
      await c.query(
        `insert into core.prospect_companies (id, organization_id, name, domain)
         select 'pco_' || md5('c' || n::text), $1,
                case when n = 777 then 'Zyxquux Holdings' else 'Company ' || n end,
                case when n = 777 then 'zyxquux.test' else 'company' || n || '.test' end
           from generate_series(1, $2::int) n`,
        [orgId, COMPANIES]
      )
      await c.query(
        `insert into core.prospects (id, organization_id, source)
         select 'prs_' || md5(n::text), $1, 'manual' from generate_series(1, $2::int) n`,
        [orgId, PROSPECTS]
      )
      // Prospect n has the email "person<n>@mail<n mod 1000>.test"; Prospect 4242 has the rare term.
      await c.query(
        `insert into core.prospect_fields (organization_id, prospect_id, field_name, state, value, source, set_at)
         select $1, 'prs_' || md5(n::text), 'email', 'current',
                case when n = 4242 then 'zyxquux@rare.test'
                     else 'person' || n || '@mail' || (n % 1000) || '.test' end,
                'manual', now()
           from generate_series(1, $2::int) n`,
        [orgId, PROSPECTS]
      )
      for (const table of ['prospect_companies', 'prospects', 'prospect_fields']) {
        await c.query(`alter table core.${table} enable trigger user`)
      }
      await c.query('commit')
    } catch (error) {
      await c.query('rollback').catch(() => undefined)
      throw error
    } finally {
      c.release()
    }
    // Plans depend on statistics, and autovacuum may not have analysed the fresh tables yet.
    await owner.query('analyze core.prospect_fields')
    await owner.query('analyze core.prospect_companies')
  }, 600_000)

  afterAll(async () => {
    await owner.query('delete from core.organizations where organization_id = $1', [orgId])
    await dropStaleTestObjects(owner, env.owner)
    await Promise.all([owner.end(), core.end()])
  }, 600_000)

  const FIELD_QUERY = `select prospect_id from core.prospect_fields
    where organization_id = $1 and state = 'current'
      and field_name in ('first_name', 'last_name', 'email') and value ilike $2`
  const NAME_QUERY =
    'select id from core.prospect_companies where organization_id = $1 and name ilike $2'
  const DOMAIN_QUERY =
    'select id from core.prospect_companies where organization_id = $1 and domain ilike $2'

  test('a rare term in a Prospect field is a bitmap scan of the trigram index', async () => {
    const plan = await explainWithoutPolicy('prospect_fields', FIELD_QUERY, [orgId, '%zyxquux%'])
    expect(plan.indexes).toEqual(['prospect_fields_value_trgm_idx'])
    expect(plan.nodes).toContain('Bitmap Index Scan')
    expect(plan.nodes).not.toContain('Seq Scan')
    expect((await scoped((c) => c.query(FIELD_QUERY, [orgId, '%zyxquux%']))).rowCount).toBe(1)
  })

  test('a rare term in a Company name is a bitmap scan of the trigram index', async () => {
    const plan = await explainWithoutPolicy('prospect_companies', NAME_QUERY, [orgId, '%zyxquux%'])
    expect(plan.indexes).toEqual(['prospect_companies_name_trgm_idx'])
    expect(plan.nodes).toContain('Bitmap Index Scan')
    expect(plan.nodes).not.toContain('Seq Scan')
    expect((await scoped((c) => c.query(NAME_QUERY, [orgId, '%zyxquux%']))).rowCount).toBe(1)
  })

  test('a rare term in a Company domain is a bitmap scan of the trigram index', async () => {
    const plan = await explainWithoutPolicy('prospect_companies', DOMAIN_QUERY, [
      orgId,
      '%zyxquux%',
    ])
    expect(plan.indexes).toEqual(['prospect_companies_domain_trgm_idx'])
    expect(plan.nodes).toContain('Bitmap Index Scan')
    expect(plan.nodes).not.toContain('Seq Scan')
    expect((await scoped((c) => c.query(DOMAIN_QUERY, [orgId, '%zyxquux%']))).rowCount).toBe(1)
  })

  // KNOWN GAP, kept as a tripwire: `ilike` is not leakproof, and PostgreSQL will not hand an index
  // a clause that is not leakproof while a row-level security policy guards the table. So under the
  // tenant policy the core role gets a sequential scan, whatever the indexes. `test.failing` passes
  // while that holds and fails once a change (a leakproof search path, a policy that allows it)
  // makes the planner use the index; then turn it into a plain test.
  test.failing('under the tenant policy the core role also gets the trigram index', async () => {
    const plan = await explainAsCore(FIELD_QUERY, [orgId, '%zyxquux%'])
    expect(plan.indexes).toContain('prospect_fields_value_trgm_idx')
    expect(plan.nodes).not.toContain('Seq Scan')
  })
})
