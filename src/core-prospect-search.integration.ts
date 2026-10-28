import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash, randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { adminUrl, dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'

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

const md5Of = (text: string): string => createHash('md5').update(text).digest('hex')

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`

/** The node types of a JSON plan, and the names of the indexes it scans, in one flat list. */
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

describe('the Prospect list filter q uses the trigram indexes', () => {
  let owner: Pool
  let core: Pool
  let admin: Pool
  const orgId = newId('org')
  /** A second Organization with a few hand-made rows, for isolation, distinctness and escaping. */
  const otherOrgId = newId('org')
  const fixtureProspect = (name: string): string => `prs_${md5Of(name)}`
  const fixtureCompany = (name: string): string => `pco_${md5Of(name)}`

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

  /** The second Organization: one company, and prospects whose values probe the search rules. */
  async function seedOtherOrganization(): Promise<void> {
    const c = await owner.connect()
    try {
      await c.query('begin')
      await c.query('select set_config($1, $2, true)', [SETTING, otherOrgId])
      await c.query(
        'insert into core.organizations (organization_id, name, region) values ($1, $2, $3)',
        [otherOrgId, 'Other', 'us']
      )
      await c.query(
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, 'owner', 'p@example.test')",
        [newId('mem'), otherOrgId, newId('usr')]
      )
      await c.query(
        'insert into core.prospect_companies (id, organization_id, name, domain) values ($1, $2, $3, $4), ($5, $2, $6, $7)',
        [
          fixtureCompany('dup'),
          otherOrgId,
          'Dupcorp',
          'dupcorp.test',
          fixtureCompany('rare'),
          'Zyxquux Other',
          'zyxquux-other.test',
        ]
      )
      const prospects: [string, string | null][] = [
        ['dup', fixtureCompany('dup')],
        ['rare', fixtureCompany('rare')],
        ['percent', null],
        ['plain-x', null],
        ['underscore', null],
        ['plain-abc', null],
        ['backslash', null],
      ]
      for (const [name, company] of prospects) {
        await c.query(
          "insert into core.prospects (id, organization_id, company_id, source) values ($1, $2, $3, 'manual')",
          [fixtureProspect(name), otherOrgId, company]
        )
      }
      const fields: [string, string, string][] = [
        // Two matching fields and a matching Company: still one row for 'dupcorp'.
        ['dup', 'email', 'x@dupcorp.test'],
        ['dup', 'first_name', 'Dupcorp'],
        ['rare', 'email', 'zyxquux@other.test'],
        ['percent', 'first_name', '50%off'],
        ['plain-x', 'first_name', '50xoff'],
        ['underscore', 'first_name', 'a_c'],
        ['plain-abc', 'first_name', 'abc'],
        ['backslash', 'first_name', 'back\\slash'],
      ]
      for (const [name, fieldName, value] of fields) {
        await c.query(
          `insert into core.prospect_fields (organization_id, prospect_id, field_name, state, value, source, set_at)
           values ($1, $2, $3, 'current', $4, 'manual', now())`,
          [otherOrgId, fixtureProspect(name), fieldName, value]
        )
      }
      await c.query('commit')
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
      // Earlier values for the first 5,000 Prospects: what a duplicate suggestion looks up by text.
      await c.query(
        `insert into core.prospect_fields (organization_id, prospect_id, field_name, state, value, source, set_at)
         select $1, 'prs_' || md5(n::text), 'email', 'superseded', 'old' || n || '@mail.test',
                'manual', now() - interval '1 day'
           from generate_series(1, 5000) n`,
        [orgId]
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
    await owner.query('analyze core.prospects')
    await seedOtherOrganization()
  }, 600_000)

  afterAll(async () => {
    // Row-level security binds the owner too: without the setting the delete matches nothing and
    // the rows stay behind, so the Organization is scoped, then the count is checked in the same
    // transaction. The history trigger is BEFORE INSERT OR UPDATE, so the delete needs no disable.
    const c = await owner.connect()
    let left = -1
    let trigger = ''
    try {
      await c.query('begin')
      await c.query('select set_config($1, $2, true)', [SETTING, orgId])
      await c.query('delete from core.organizations where organization_id = $1', [orgId])
      left = (await c.query('select count(*)::int as n from core.prospects')).rows[0].n
      await c.query('commit')
      await c.query('begin')
      await c.query('select set_config($1, $2, true)', [SETTING, otherOrgId])
      await c.query('delete from core.organizations where organization_id = $1', [otherOrgId])
      left += (await c.query('select count(*)::int as n from core.prospects')).rows[0].n
      await c.query('commit')
      trigger = (
        await c.query(
          "select tgenabled from pg_trigger where tgname = 'prospect_fields_history_limit'"
        )
      ).rows[0]?.tgenabled
    } catch (error) {
      await c.query('rollback').catch(() => undefined)
      throw error
    } finally {
      c.release()
      await dropStaleTestObjects(owner, env.owner).catch(() => undefined)
      await Promise.all([owner.end(), core.end(), admin.end()])
    }
    expect(left).toBe(0)
    // The load disables triggers only inside its own transaction; the shared database keeps them.
    expect(trigger).toBe('O')
  }, 600_000)

  const FIELD_QUERY = `select prospect_id from core.prospect_fields
    where organization_id = $1 and state = 'current'
      and value ilike $2`
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

  const EARLIER_QUERY = `select prospect_id from core.prospect_fields
    where organization_id = $1 and field_name = $2 and value = $3 and state <> 'current'`

  test('an earlier value looked up by its text is an index scan of the partial value index', async () => {
    const args = [orgId, 'email', 'old42@mail.test']
    const plan = await explainWithoutPolicy('prospect_fields', EARLIER_QUERY, args)
    expect(plan.indexes).toEqual(['prospect_fields_value_idx'])
    expect(plan.nodes).not.toContain('Seq Scan')
    expect((await scoped((c) => c.query(EARLIER_QUERY, args))).rowCount).toBe(1)
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

  const searchIds = async (
    q: string | null,
    after: string | null = null,
    maxRows = 101,
    organization = orgId
  ): Promise<string[]> =>
    scoped(
      async (c) =>
        (
          await c.query('select id from core.search_prospect_ids($1, $2, $3)', [q, after, maxRows])
        ).rows.map((row) => row.id),
      organization
    )
  const searchCompanyIds = async (
    q: string | null,
    after: string | null = null,
    maxRows = 101,
    organization = orgId
  ): Promise<string[]> =>
    scoped(
      async (c) =>
        (
          await c.query('select id from core.search_prospect_company_ids($1, $2, $3)', [
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

  // The tripwire this replaces pinned the gap: under the tenant policy the core role cannot hand
  // the trigram index an `ilike` (it is not leakproof). The search functions run as a role that
  // bypasses row-level security, with the Organization filter written out in the query, so the
  // index is used even though the caller is the core role with row-level security on.
  test('called by the core role, the Prospect search is a bitmap scan of each trigram index', async () => {
    const plan = await planOfCall('select id from core.search_prospect_ids($1, $2, $3)', [
      'zyxquux',
      null,
      101,
    ])
    expect(plan.nodes).toContain('Bitmap Index Scan')
    expect(plan.seqScans).toEqual([])
    expect([...new Set(plan.indexes)].filter((name) => name.endsWith('_trgm_idx')).sort()).toEqual([
      'prospect_companies_domain_trgm_idx',
      'prospect_companies_name_trgm_idx',
      'prospect_fields_value_trgm_idx',
    ])
  })

  test('called by the core role, the Company search is a bitmap scan of the name and domain indexes', async () => {
    const plan = await planOfCall('select id from core.search_prospect_company_ids($1, $2, $3)', [
      'zyxquux',
      null,
      101,
    ])
    expect(plan.nodes).toContain('Bitmap Index Scan')
    expect(plan.seqScans).toEqual([])
    expect([...new Set(plan.indexes)].filter((name) => name.endsWith('_trgm_idx')).sort()).toEqual([
      'prospect_companies_domain_trgm_idx',
      'prospect_companies_name_trgm_idx',
    ])
  })

  test('the functions return the rare match', async () => {
    expect(await searchIds('zyxquux')).toEqual([`prs_${md5Of('4242')}`])
    expect(await searchCompanyIds('zyxquux')).toEqual([`pco_${md5Of('c777')}`])
  })

  test('a second Organization is never returned, and each Organization sees only its own', async () => {
    expect(await searchIds('zyxquux')).toEqual([`prs_${md5Of('4242')}`])
    expect(await searchCompanyIds('zyxquux')).toEqual([`pco_${md5Of('c777')}`])
    const other = fixtureProspect('rare')
    expect(await searchIds('zyxquux', null, 101, otherOrgId)).toEqual([other])
    expect(await searchCompanyIds('zyxquux', null, 101, otherOrgId)).toEqual([
      fixtureCompany('rare'),
    ])
    // A Company that no Prospect works at gives no Prospect.
    expect(await searchIds('Zyxquux Holdings')).toEqual([])
  })

  test('with the tenant setting unset or empty the functions return zero rows', async () => {
    for (const value of [null, '', 'org_00000000000000000000000000000000']) {
      const c = await core.connect()
      try {
        await c.query('begin')
        if (value !== null) {
          await c.query('select set_config($1, $2, true)', [SETTING, value])
        }
        const prospects = await c.query(
          "select id from core.search_prospect_ids('person', null, 101)"
        )
        const companies = await c.query(
          "select id from core.search_prospect_company_ids('company', null, 101)"
        )
        expect([prospects.rowCount, companies.rowCount]).toEqual([0, 0])
        await c.query('commit')
      } finally {
        c.release()
      }
    }
    // The setting cannot be supplied as an argument: there is no such parameter.
    expect(await searchIds(null)).toEqual([])
    expect(await searchIds('')).toEqual([])
  })

  test('max_rows is clamped at 101 and the cursor pages through distinct ids in order', async () => {
    const first = await searchIds('person', null, 100_000)
    expect(first).toHaveLength(101)
    expect(first).toEqual([...first].sort())
    expect(new Set(first).size).toBe(101)
    expect(await searchIds('person', null, 5)).toEqual(first.slice(0, 5))
    expect(await searchIds('person', null, 0)).toEqual([])
    const next = await searchIds('person', first[100], 3)
    expect(next).toHaveLength(3)
    expect((next[0] ?? '') > (first[100] ?? '')).toBe(true)
    const companies = await searchCompanyIds('company', null, 100_000)
    expect(companies).toHaveLength(101)
    expect(companies).toEqual([...companies].sort())
  })

  test('a Prospect matching through several fields and its Company is returned once', async () => {
    expect(await searchIds('dupcorp', null, 101, otherOrgId)).toEqual([fixtureProspect('dup')])
  })

  test('%, _ and a backslash in q match themselves, not as patterns', async () => {
    const ids = (names: string[]) => names.map(fixtureProspect).sort()
    expect(await searchIds('%', null, 101, otherOrgId)).toEqual(ids(['percent']))
    expect(await searchIds('0%o', null, 101, otherOrgId)).toEqual(ids(['percent']))
    expect(await searchIds('_', null, 101, otherOrgId)).toEqual(ids(['underscore']))
    expect(await searchIds('a_c', null, 101, otherOrgId)).toEqual(ids(['underscore']))
    expect(await searchIds('\\', null, 101, otherOrgId)).toEqual(ids(['backslash']))
    expect(await searchIds('k\\s', null, 101, otherOrgId)).toEqual(ids(['backslash']))
    expect(await searchCompanyIds('%', null, 101, otherOrgId)).toEqual([])
    expect(await searchCompanyIds('_', null, 101, otherOrgId)).toEqual([])
  })
})
