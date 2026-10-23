import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { createDb, type DbHandle } from './client'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { findTenantIsolationGaps } from './isolation'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const CHECK_VIOLATION = '23514'
const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`
const hex = (n: number): string => n.toString(16).padStart(64, '0')

interface Seeded {
  orgId: string
  membershipId: string
  companyId: string
  prospectId: string
  importId: string
  mergeId: string
  userId: string
}

/** One harmless update per table, used to prove a second Organization updates nothing. */
const UPDATES = {
  prospect_companies: "name = 'x'",
  prospect_company_fields: "value = 'x'",
  prospects: "notes = 'x'",
  prospect_identities: 'is_primary = false',
  prospect_fields: "value = 'x'",
  prospect_imports: 'processed_rows = 1',
  prospect_import_rows: "result = 'created'",
  prospect_merges: "state = 'merged'",
} as const

describe('core prospect tables', () => {
  let owner: Pool
  let core: Pool
  let handle: DbHandle
  const orgs: string[] = []

  /** Run `fn` in one transaction scoped to `organizationId` (or to none), as the core role. */
  async function scoped<T>(orgId: string | null, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await core.connect()
    try {
      await c.query('begin')
      if (orgId) {
        await c.query('select set_config($1, $2, true)', [SETTING, orgId])
      }
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

  const run = (orgId: string | null, sql: string, values: unknown[] = []) =>
    scoped(orgId, (c) => c.query(sql, values))

  /** The error a statement is refused with; fails the test when it succeeds. */
  async function refusal(promise: Promise<unknown>): Promise<{ code?: string; message: string }> {
    try {
      await promise
    } catch (error) {
      return error as { code?: string; message: string }
    }
    throw new Error('expected the statement to be refused')
  }

  const countOf = (orgId: string | null, table: string) =>
    scoped(orgId, async (c) =>
      Number((await c.query(`select count(*) as n from core.${table}`)).rows[0].n)
    )

  /** Create an Organization with a Membership and one row in every prospect table. */
  async function seed(): Promise<Seeded> {
    const ids: Seeded = {
      orgId: newId('org'),
      membershipId: newId('mem'),
      companyId: newId('pco'),
      prospectId: newId('prs'),
      importId: newId('pimp'),
      mergeId: newId('pmrg'),
      userId: newId('usr'),
    }
    const { orgId } = ids
    orgs.push(orgId)
    await scoped(orgId, async (c) => {
      await c.query(
        'insert into core.organizations (organization_id, name, region) values ($1, $2, $3)',
        [orgId, 'Org', 'us']
      )
      await c.query(
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, 'owner', 'o@example.test')",
        [ids.membershipId, orgId, ids.userId]
      )
      await c.query(
        "insert into core.prospect_companies (id, organization_id, name, domain) values ($1, $2, 'Acme', 'acme.test')",
        [ids.companyId, orgId]
      )
      await c.query(
        "insert into core.prospect_company_fields (organization_id, company_id, field_name, state, value, source, set_at) values ($1, $2, 'name', 'current', 'Acme', 'manual', now())",
        [orgId, ids.companyId]
      )
      await c.query(
        "insert into core.prospects (id, organization_id, company_id, owner_membership_id, source, tags) values ($1, $2, $3, $4, 'manual', array['a','b'])",
        [ids.prospectId, orgId, ids.companyId, ids.membershipId]
      )
      await c.query(
        "insert into core.prospect_identities (organization_id, kind, value, prospect_id) values ($1, 'email', 'ada@example.test', $2)",
        [orgId, ids.prospectId]
      )
      await c.query(
        "insert into core.prospect_fields (organization_id, prospect_id, field_name, state, value, source, set_at, set_by_user_id) values ($1, $2, 'email', 'current', 'ada@example.test', 'manual', now(), $3)",
        [orgId, ids.prospectId, ids.userId]
      )
      await c.query(
        "insert into core.prospect_imports (id, organization_id, state, size_bytes, content_hash, object_key, uploaded_by_user_id) values ($1, $2, 'uploaded', 10, decode($3, 'hex'), 'k/1', $4)",
        [ids.importId, orgId, hex(1), ids.userId]
      )
      await c.query(
        "insert into core.prospect_import_rows (organization_id, import_id, row_number, result, prospect_id) values ($1, $2, 2, 'created', $3)",
        [orgId, ids.importId, ids.prospectId]
      )
      await c.query(
        "insert into core.prospect_merges (id, organization_id, survivor_prospect_id, merged_prospect_ids, merged_by_user_id, snapshot, created_at, undoable_until) values ($1, $2, $3, array[$4], $5, '{}'::jsonb, '2026-01-01T00:00:00Z', '2026-01-31T00:00:00Z')",
        [ids.mergeId, orgId, ids.prospectId, newId('prs'), ids.userId]
      )
    })
    return ids
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    core = new Pool({ connectionString: env.core, max: 4 })
    handle = createDb(env.core, { max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      await owner.query('delete from core.organizations where organization_id = $1', [orgId])
    }
    await dropStaleTestObjects(owner, env.owner)
    await handle.close()
    await Promise.all([owner.end(), core.end()])
  })

  test('every table of the schema passes the tenant isolation check', async () => {
    expect(await findTenantIsolationGaps(handle.db)).toEqual([])
  })

  describe.each(Object.keys(UPDATES) as (keyof typeof UPDATES)[])('%s', (table) => {
    test('a second Organization reads, updates and removes nothing, and no scope sees nothing', async () => {
      const a = await seed()
      const b = await seed()
      expect(await countOf(a.orgId, table)).toBe(1)
      expect(await countOf(b.orgId, table)).toBe(1)
      expect(await countOf(null, table)).toBe(0)
      const read = await run(b.orgId, `select 1 from core.${table} where organization_id = $1`, [
        a.orgId,
      ])
      expect(read.rowCount).toBe(0)
      const update = await run(
        b.orgId,
        `update core.${table} set ${UPDATES[table]} where organization_id = $1`,
        [a.orgId]
      )
      expect(update.rowCount).toBe(0)
      const removal = await run(b.orgId, `delete from core.${table} where organization_id = $1`, [
        a.orgId,
      ])
      expect(removal.rowCount).toBe(0)
      expect(await countOf(a.orgId, table)).toBe(1)
    })
  })

  test('a second Organization cannot write a row into the first, nor can an unscoped session', async () => {
    const a = await seed()
    const b = await seed()
    const other = await refusal(
      run(
        b.orgId,
        "insert into core.prospects (id, organization_id, source) values ($1, $2, 'manual')",
        [newId('prs'), a.orgId]
      )
    )
    expect(other.message).toContain('row-level security')
    const none = await refusal(
      run(
        null,
        "insert into core.prospect_companies (id, organization_id, name) values ($1, $2, 'x')",
        [newId('pco'), a.orgId]
      )
    )
    expect(none.message).toContain('row-level security')
  })

  test('a Prospect cannot point at another Organization company, owner or Prospect', async () => {
    const a = await seed()
    const b = await seed()
    const company = await refusal(
      run(
        b.orgId,
        "insert into core.prospects (id, organization_id, company_id, source) values ($1, $2, $3, 'manual')",
        [newId('prs'), b.orgId, a.companyId]
      )
    )
    const ownerRef = await refusal(
      run(
        b.orgId,
        "insert into core.prospects (id, organization_id, owner_membership_id, source) values ($1, $2, $3, 'manual')",
        [newId('prs'), b.orgId, a.membershipId]
      )
    )
    const identity = await refusal(
      run(
        b.orgId,
        "insert into core.prospect_identities (organization_id, kind, value, prospect_id) values ($1, 'email', 'x@example.test', $2)",
        [b.orgId, a.prospectId]
      )
    )
    expect([company.code, ownerRef.code, identity.code]).toEqual([
      FOREIGN_KEY_VIOLATION,
      FOREIGN_KEY_VIOLATION,
      FOREIGN_KEY_VIOLATION,
    ])
  })

  describe('identity uniqueness', () => {
    const addProspect = async (orgId: string) => {
      const id = newId('prs')
      await run(
        orgId,
        "insert into core.prospects (id, organization_id, source) values ($1, $2, 'manual')",
        [id, orgId]
      )
      return id
    }
    const addEmail = (orgId: string, prospectId: string, email: string) =>
      run(
        orgId,
        "insert into core.prospect_identities (organization_id, kind, value, prospect_id) values ($1, 'email', $2, $3)",
        [orgId, email, prospectId]
      )

    test('a duplicate normalised email in one Organization is refused', async () => {
      const a = await seed()
      const second = await addProspect(a.orgId)
      const refused = await refusal(addEmail(a.orgId, second, 'ada@example.test'))
      expect(refused.code).toBe(UNIQUE_VIOLATION)
      expect(refused.message).toContain('prospect_identities_pkey')
    })

    test('the same email in another Organization is allowed', async () => {
      const a = await seed()
      const b = await seed()
      const mine = await run(
        b.orgId,
        "select value from core.prospect_identities where kind = 'email'"
      )
      expect(mine.rows).toEqual([{ value: 'ada@example.test' }])
      const third = await addProspect(b.orgId)
      expect((await refusal(addEmail(b.orgId, third, 'ada@example.test'))).code).toBe(
        UNIQUE_VIOLATION
      )
      expect(a.orgId).not.toBe(b.orgId)
    })

    test('a second primary identity of one kind is refused, a non-primary one is not', async () => {
      const a = await seed()
      const add = (primary: boolean, value: string) =>
        run(
          a.orgId,
          "insert into core.prospect_identities (organization_id, kind, value, prospect_id, is_primary) values ($1, 'email', $2, $3, $4)",
          [a.orgId, value, a.prospectId, primary]
        )
      expect((await refusal(add(true, 'b@example.test'))).code).toBe(UNIQUE_VIOLATION)
      await add(false, 'c@example.test')
    })

    test.each([
      ['email', 'Ada@Example.test'],
      ['email', 'a b@example.test'],
      ['email', 'ada@@example.test'],
      ['email', 'ada'],
      ['phone', '4155550123'],
      ['phone', '+0155550123'],
      ['linkedin', 'https://linkedin.com/in/ada'],
      ['linkedin', 'www.linkedin.com/in/ada'],
      ['linkedin', 'linkedin.com/in/ada/'],
      ['linkedin', 'linkedin.com/in/ada?x=1'],
      ['fax', '+14155550123'],
    ])('refuses %s value %s', async (kind, value) => {
      const a = await seed()
      const refused = await refusal(
        run(
          a.orgId,
          'insert into core.prospect_identities (organization_id, kind, value, prospect_id) values ($1, $2, $3, $4)',
          [a.orgId, kind, value, a.prospectId]
        )
      )
      expect(refused.code).toBe(CHECK_VIOLATION)
    })

    test('accepts a normalised phone and LinkedIn address', async () => {
      const a = await seed()
      await run(
        a.orgId,
        "insert into core.prospect_identities (organization_id, kind, value, prospect_id) values ($1, 'phone', '+14155550123', $2), ($1, 'linkedin', 'linkedin.com/in/ada-lovelace', $2)",
        [a.orgId, a.prospectId]
      )
    })
  })

  describe('field history', () => {
    const addField = (
      a: Seeded,
      field: string,
      state: string,
      source = 'import',
      sourceRef: string | null = null
    ) =>
      run(
        a.orgId,
        'insert into core.prospect_fields (organization_id, prospect_id, field_name, state, value, source, source_ref, set_at) values ($1, $2, $3, $4, $5, $6, $7, now())',
        [a.orgId, a.prospectId, field, state, 'v', source, sourceRef]
      )

    test('a second current value for one field is refused, other states are not', async () => {
      const a = await seed()
      expect((await refusal(addField(a, 'email', 'current'))).code).toBe(UNIQUE_VIOLATION)
      await addField(a, 'email', 'superseded')
      await addField(a, 'email', 'suggested')
    })

    test('the 51st entry for a field is refused, and another field is unaffected', async () => {
      const a = await seed()
      for (let n = 0; n < 49; n++) {
        await addField(a, 'email', 'superseded')
      }
      const refused = await refusal(addField(a, 'email', 'superseded'))
      expect(refused.code).toBe(CHECK_VIOLATION)
      expect(refused.message).toContain('at most 50 entries')
      await addField(a, 'first_name', 'superseded')
    })

    test('two concurrent inserts for the 50th entry of a field: exactly one succeeds', async () => {
      const a = await seed()
      for (let n = 0; n < 48; n++) {
        await addField(a, 'email', 'superseded')
      }
      const sql =
        "insert into core.prospect_fields (organization_id, prospect_id, field_name, state, value, source, set_at) values ($1, $2, 'email', 'superseded', 'v', 'import', now())"
      const open = async () => {
        const c = await core.connect()
        await c.query('begin')
        await c.query('select set_config($1, $2, true)', [SETTING, a.orgId])
        return c
      }
      const first = await open()
      const second = await open()
      try {
        await first.query(sql, [a.orgId, a.prospectId])
        const pending = second.query(sql, [a.orgId, a.prospectId]).then(
          () => 'inserted',
          (error: { code?: string }) => error.code
        )
        // The second insert waits on the field's lock until the first transaction ends.
        await new Promise((resolve) => setTimeout(resolve, 200))
        await first.query('commit')
        expect(await pending).toBe(CHECK_VIOLATION)
        await second.query('rollback')
      } finally {
        first.release()
        second.release()
      }
      const counted = await run(
        a.orgId,
        "select count(*)::int as n from core.prospect_fields where field_name = 'email'"
      )
      expect(counted.rows[0].n).toBe(50)
    })

    test('an UPDATE that moves an entry onto a full field is refused', async () => {
      const a = await seed()
      for (let n = 0; n < 49; n++) {
        await addField(a, 'email', 'superseded')
      }
      await addField(a, 'first_name', 'superseded')
      const refused = await refusal(
        run(
          a.orgId,
          "update core.prospect_fields set field_name = 'email' where prospect_id = $1 and field_name = 'first_name'",
          [a.prospectId]
        )
      )
      expect(refused.code).toBe(CHECK_VIOLATION)
      expect(refused.message).toContain('at most 50 entries')
      // An update that keeps the field is not counted again.
      await run(
        a.orgId,
        "update core.prospect_fields set value = 'w' where prospect_id = $1 and field_name = 'email'",
        [a.prospectId]
      )
    })

    test('an UPDATE that moves a company entry onto a full field is refused', async () => {
      const a = await seed()
      const add = (field: string) =>
        run(
          a.orgId,
          "insert into core.prospect_company_fields (organization_id, company_id, field_name, state, value, source, set_at) values ($1, $2, $3, 'superseded', 'v', 'import', now())",
          [a.orgId, a.companyId, field]
        )
      for (let n = 0; n < 49; n++) {
        await add('name')
      }
      await add('domain')
      const refused = await refusal(
        run(
          a.orgId,
          "update core.prospect_company_fields set field_name = 'name' where company_id = $1 and field_name = 'domain'",
          [a.companyId]
        )
      )
      expect(refused.code).toBe(CHECK_VIOLATION)
    })

    test('the unique current-value index serves the per-Prospect lookup', async () => {
      const a = await seed()
      const plan = await scoped(a.orgId, async (c) => {
        await c.query('set local enable_seqscan = off')
        return c.query(
          "explain select * from core.prospect_fields where organization_id = $1 and prospect_id = $2 and state = 'current'",
          [a.orgId, a.prospectId]
        )
      })
      const text = plan.rows.map((r: Record<string, string>) => r['QUERY PLAN']).join('\n')
      expect(text).toContain('prospect_fields_current_key')
    })

    test('the 51st company entry is refused', async () => {
      const a = await seed()
      const add = () =>
        run(
          a.orgId,
          "insert into core.prospect_company_fields (organization_id, company_id, field_name, state, value, source, set_at) values ($1, $2, 'name', 'superseded', 'v', 'import', now())",
          [a.orgId, a.companyId]
        )
      for (let n = 0; n < 49; n++) {
        await add()
      }
      expect((await refusal(add())).code).toBe(CHECK_VIOLATION)
    })

    test.each([
      ['an unknown field', 'nickname', 'manual', null],
      ['a manual source with a reference', 'email', 'manual', 'ref'],
      ['an unknown source kind', 'email', 'crm:other', null],
      ['an enrichment source without a provider', 'email', 'enrichment:', null],
      ['an empty reference', 'email', 'import', ''],
    ])('refuses %s', async (_name, field, source, ref) => {
      const a = await seed()
      expect((await refusal(addField(a, field, 'superseded', source, ref))).code).toBe(
        CHECK_VIOLATION
      )
    })

    test('accepts an enrichment source with a provider and a reference', async () => {
      const a = await seed()
      await addField(a, 'job_title', 'suggested', 'enrichment:apollo_io', 'rec-1')
    })
  })

  describe('prospects', () => {
    const add = (orgId: string, column: string, value: unknown) =>
      run(
        orgId,
        `insert into core.prospects (id, organization_id, source, ${column}) values ($1, $2, 'manual', $3)`,
        [newId('prs'), orgId, value]
      )

    test.each([
      ['more than 20 tags', Array.from({ length: 21 }, (_, i) => `t${i}`)],
      ['a repeated tag', ['a', 'a']],
      ['an empty tag', ['']],
      ['a tag over 50 characters', ['x'.repeat(51)]],
    ])('refuses %s', async (_name, tags) => {
      const a = await seed()
      expect((await refusal(add(a.orgId, 'tags', tags))).code).toBe(CHECK_VIOLATION)
    })

    test('refuses empty or oversized notes and an unknown status', async () => {
      const a = await seed()
      expect((await refusal(add(a.orgId, 'notes', ''))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(add(a.orgId, 'notes', 'x'.repeat(5001)))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(add(a.orgId, 'status', 'deleted'))).code).toBe(CHECK_VIOLATION)
    })

    test('refuses an unknown creating source', async () => {
      const a = await seed()
      const refused = await refusal(
        run(
          a.orgId,
          "insert into core.prospects (id, organization_id, source) values ($1, $2, 'crm:pipedrive')",
          [newId('prs'), a.orgId]
        )
      )
      expect(refused.code).toBe(CHECK_VIOLATION)
    })

    test('removing the owner Membership or the Company leaves the Prospect, unassigned', async () => {
      const a = await seed()
      const rep = newId('mem')
      await run(
        a.orgId,
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, 'rep', 'r@example.test')",
        [rep, a.orgId, newId('usr')]
      )
      await run(a.orgId, 'update core.prospects set owner_membership_id = $2 where id = $1', [
        a.prospectId,
        rep,
      ])
      await run(a.orgId, 'delete from core.prospect_companies where id = $1', [a.companyId])
      await run(a.orgId, 'delete from core.memberships where id = $1', [rep])
      const { rows } = await run(
        a.orgId,
        'select organization_id, company_id, owner_membership_id from core.prospects where id = $1',
        [a.prospectId]
      )
      expect(rows).toEqual([
        { organization_id: a.orgId, company_id: null, owner_membership_id: null },
      ])
    })

    test('erasing a Prospect removes its identities, fields and merges but not the import report', async () => {
      const a = await seed()
      await run(a.orgId, 'delete from core.prospects where id = $1', [a.prospectId])
      expect(await countOf(a.orgId, 'prospect_identities')).toBe(0)
      expect(await countOf(a.orgId, 'prospect_fields')).toBe(0)
      expect(await countOf(a.orgId, 'prospect_merges')).toBe(0)
      expect(await countOf(a.orgId, 'prospect_import_rows')).toBe(1)
    })

    test('removing an Organization removes every prospect row', async () => {
      const a = await seed()
      await owner.query('delete from core.organizations where organization_id = $1', [a.orgId])
      for (const table of Object.keys(UPDATES)) {
        const { rows } = await owner.query(
          `select count(*)::int as n from core.${table} where organization_id = $1`,
          [a.orgId]
        )
        expect(rows[0].n).toBe(0)
      }
    })
  })

  describe('companies', () => {
    test('one domain per Organization', async () => {
      const a = await seed()
      const refused = await refusal(
        run(
          a.orgId,
          "insert into core.prospect_companies (id, organization_id, name, domain) values ($1, $2, 'Other', 'acme.test')",
          [newId('pco'), a.orgId]
        )
      )
      expect(refused.code).toBe(UNIQUE_VIOLATION)
    })

    test('Companies without a domain never collide', async () => {
      await seed()
      await seed()
      const b = await seed()
      const add = () =>
        run(
          b.orgId,
          "insert into core.prospect_companies (id, organization_id, name) values ($1, $2, 'No domain')",
          [newId('pco'), b.orgId]
        )
      await add()
      await add()
    })

    test.each(['Acme.test', 'acme', '-acme.test', 'ac me.test'])(
      'refuses domain %s',
      async (domain) => {
        const a = await seed()
        const refused = await refusal(
          run(
            a.orgId,
            "insert into core.prospect_companies (id, organization_id, name, domain) values ($1, $2, 'X', $3)",
            [newId('pco'), a.orgId, domain]
          )
        )
        expect(refused.code).toBe(CHECK_VIOLATION)
      }
    )
  })

  describe('company enrichment fields', () => {
    const update = (a: Seeded, set: string, value: unknown) =>
      run(a.orgId, `update core.prospect_companies set ${set} = $1 where id = $2`, [
        value,
        a.companyId,
      ])

    test('are null on a new Company and accept good values', async () => {
      const a = await seed()
      const fresh = await run(
        a.orgId,
        'select industry, employee_count, region, technologies from core.prospect_companies where id = $1',
        [a.companyId]
      )
      expect(fresh.rows[0]).toEqual({
        industry: null,
        employee_count: null,
        region: null,
        technologies: null,
      })
      await run(
        a.orgId,
        "update core.prospect_companies set industry = 'Software', employee_count = 0, region = 'EMEA', technologies = $1 where id = $2",
        [['postgres', 'x'.repeat(100)], a.companyId]
      )
      await update(
        a,
        'technologies',
        Array.from({ length: 50 }, (_, i) => `t${i}`)
      )
      await update(a, 'technologies', [])
    })

    test.each([
      ['industry', ''],
      ['industry', ' padded '],
      ['industry', 'x'.repeat(201)],
      ['region', ''],
      ['region', 'x '],
      ['region', 'x'.repeat(201)],
      ['employee_count', -1],
      ['technologies', Array.from({ length: 51 }, (_, i) => `t${i}`)],
      ['technologies', ['x'.repeat(101)]],
      ['technologies', ['']],
      ['technologies', ['ok', null]],
    ])('refuses %s = %p', async (column, value) => {
      const a = await seed()
      const refused = await refusal(update(a, column as string, value))
      expect(refused.code).toBe(CHECK_VIOLATION)
    })

    describe('history values', () => {
      const putEntry = (a: Seeded, field: string, value: string) =>
        run(
          a.orgId,
          "insert into core.prospect_company_fields (organization_id, company_id, field_name, state, value, source, set_at) values ($1, $2, $3, 'current', $4, 'enrichment:acme', now())",
          [a.orgId, a.companyId, field, value]
        )

      test('a technologies value is a JSON array of up to 50 strings of up to 100 characters', async () => {
        const a = await seed()
        const full = JSON.stringify(Array.from({ length: 50 }, (_, i) => `${i}`.padEnd(100, 'x')))
        expect(full.length).toBeGreaterThan(320)
        expect(full.length).toBeLessThanOrEqual(5300)
        await putEntry(a, 'technologies', full)
      })

      test.each([
        ['non-JSON text', 'postgres, redis'],
        ['a JSON object', '{"a":"b"}'],
        ['an array holding a number', '["a",1]'],
        ['an array holding null', '["a",null]'],
        ['an array holding an empty string', '[""]'],
        ['51 items', JSON.stringify(Array.from({ length: 51 }, (_, i) => `t${i}`))],
        ['an item of 101 characters', JSON.stringify(['x'.repeat(101)])],
        ['more than 5300 characters', `["${'x'.repeat(5300)}"]`],
      ])('a technologies value of %s is refused', async (_name, value) => {
        const a = await seed()
        const refused = await refusal(putEntry(a, 'technologies', value))
        expect(refused.code).toBe(CHECK_VIOLATION)
      })

      test('every other field keeps the 320-character limit', async () => {
        const a = await seed()
        await putEntry(a, 'industry', 'x'.repeat(320))
        const refused = await refusal(putEntry(a, 'region', 'x'.repeat(321)))
        expect(refused.code).toBe(CHECK_VIOLATION)
      })

      test('an employee_count value is 1 to 9 digits', async () => {
        const a = await seed()
        await putEntry(a, 'employee_count', '123456789')
        for (const bad of ['many', '-1', '1.5', '1234567890', ' 5']) {
          const refused = await refusal(putEntry(a, 'employee_count', bad))
          expect([bad, refused.code]).toEqual([bad, CHECK_VIOLATION])
        }
      })
    })

    test('history entries accept the new field names and refuse unknown ones', async () => {
      const a = await seed()
      const values = { industry: 'v', employee_count: '12', region: 'v', technologies: '["v"]' }
      for (const [field, value] of Object.entries(values)) {
        await run(
          a.orgId,
          "insert into core.prospect_company_fields (organization_id, company_id, field_name, state, value, source, set_at) values ($1, $2, $3, 'current', $4, 'enrichment:acme', now())",
          [a.orgId, a.companyId, field, value]
        )
      }
      const refused = await refusal(
        run(
          a.orgId,
          "insert into core.prospect_company_fields (organization_id, company_id, field_name, state, value, source, set_at) values ($1, $2, 'revenue', 'current', 'v', 'manual', now())",
          [a.orgId, a.companyId]
        )
      )
      expect(refused.code).toBe(CHECK_VIOLATION)
    })
  })

  describe('imports', () => {
    const COUNT_COLUMNS =
      'state, row_count, created_count, updated_count, skipped_count, rejected_count'
    const insertImport = (a: Seeded, columns: string, values: string) =>
      run(
        a.orgId,
        `insert into core.prospect_imports (id, organization_id, size_bytes, content_hash, object_key, uploaded_by_user_id, ${columns}) values ($1, $2, 10, decode($3, 'hex'), 'k/2', $4, ${values})`,
        [newId('pimp'), a.orgId, hex(2), a.userId]
      )

    test('accepts a completed import whose counts add up and refuses the rest', async () => {
      const a = await seed()
      await insertImport(a, COUNT_COLUMNS, "'completed', 10, 4, 3, 2, 1")
      for (const bad of [
        "'completed', 10, 4, 3, 2, 2",
        "'uploaded', 10, 4, 3, 2, 1",
        "'completed', null, null, null, null, null",
        "'completed', 50001, 50001, 0, 0, 0",
        "'completed', 10, 4, 3, 2, null",
      ]) {
        expect((await refusal(insertImport(a, COUNT_COLUMNS, bad))).code).toBe(CHECK_VIOLATION)
      }
    })

    test('a failure reason is set exactly when the import failed', async () => {
      const a = await seed()
      await insertImport(a, 'state, failure_reason', "'failed', 'too_many_rows'")
      expect((await refusal(insertImport(a, 'state', "'failed'"))).code).toBe(CHECK_VIOLATION)
      expect(
        (await refusal(insertImport(a, 'state, failure_reason', "'processing', 'unreadable'"))).code
      ).toBe(CHECK_VIOLATION)
    })

    test.each([
      [10485761, hex(3)],
      [0, hex(3)],
      [10, '00ff'],
    ])('refuses a file of %p bytes with hash %p', async (size, hash) => {
      const a = await seed()
      const refused = await refusal(
        run(
          a.orgId,
          "insert into core.prospect_imports (id, organization_id, size_bytes, content_hash, object_key, uploaded_by_user_id) values ($1, $2, $3, decode($4, 'hex'), 'k/3', $5)",
          [newId('pimp'), a.orgId, size, hash, a.userId]
        )
      )
      expect(refused.code).toBe(CHECK_VIOLATION)
    })

    test.each([
      [1, 'created', null, true],
      [50002, 'created', null, true],
      [3, 'created', 'no_change', true],
      [3, 'created', null, false],
      [3, 'rejected', 'invalid_email', true],
      [3, 'rejected', null, false],
      [3, 'rejected', 'no_change', false],
      [3, 'skipped', 'invalid_email', false],
      [3, 'skipped', null, false],
      [3, 'merged', null, false],
    ])(
      'refuses report row %p %p %p (prospect %p)',
      async (rowNumber, result, reason, withProspect) => {
        const a = await seed()
        const refused = await refusal(
          run(
            a.orgId,
            'insert into core.prospect_import_rows (organization_id, import_id, row_number, result, reason, prospect_id) values ($1, $2, $3, $4, $5, $6)',
            [a.orgId, a.importId, rowNumber, result, reason, withProspect ? a.prospectId : null]
          )
        )
        expect(refused.code).toBe(CHECK_VIOLATION)
      }
    )

    test('accepts rejected and skipped rows and refuses a repeated row number', async () => {
      const a = await seed()
      await run(
        a.orgId,
        "insert into core.prospect_import_rows (organization_id, import_id, row_number, result, reason) values ($1, $2, 3, 'rejected', 'invalid_email'), ($1, $2, 4, 'skipped', 'no_change'), ($1, $2, 50001, 'rejected', 'blank_row')",
        [a.orgId, a.importId]
      )
      const repeated = await refusal(
        run(
          a.orgId,
          "insert into core.prospect_import_rows (organization_id, import_id, row_number, result, reason) values ($1, $2, 3, 'rejected', 'blank_row')",
          [a.orgId, a.importId]
        )
      )
      expect(repeated.code).toBe(UNIQUE_VIOLATION)
    })
  })

  describe('merges', () => {
    const MERGE =
      "insert into core.prospect_merges (id, organization_id, survivor_prospect_id, merged_prospect_ids, merged_by_user_id, snapshot, field_choices, state, undone_at, created_at, undoable_until) values ($1, $2, $3, $4::text[], $5, $6::jsonb, $7::jsonb, $8, $9, '2026-01-01T00:00:00Z', $10)"
    const merge = (
      a: Seeded,
      over: {
        merged?: string[]
        snapshot?: string
        choices?: string
        state?: string
        undoneAt?: string | null
        until?: string
      } = {}
    ) =>
      run(a.orgId, MERGE, [
        newId('pmrg'),
        a.orgId,
        a.prospectId,
        over.merged ?? [newId('prs')],
        a.userId,
        over.snapshot ?? '{}',
        over.choices ?? '{}',
        over.state ?? 'merged',
        over.undoneAt ?? null,
        over.until ?? '2026-01-31T00:00:00Z',
      ])

    test('accepts one to five merged Prospects and refuses none, six, a repeat and the survivor', async () => {
      const a = await seed()
      const six = Array.from({ length: 6 }, () => newId('prs'))
      const repeated = newId('prs')
      for (const merged of [[], six, [repeated, repeated], [a.prospectId], ['prs_nope']]) {
        expect((await refusal(merge(a, { merged }))).code).toBe(CHECK_VIOLATION)
      }
      await merge(a, { merged: six.slice(0, 5) })
    })

    test('the undo window is exactly 30 days', async () => {
      const a = await seed()
      const refused = await refusal(merge(a, { until: '2026-01-29T00:00:00Z' }))
      expect(refused.code).toBe(CHECK_VIOLATION)
    })

    test('undone_at is set exactly when the merge is undone', async () => {
      const a = await seed()
      expect((await refusal(merge(a, { state: 'undone' }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(merge(a, { undoneAt: '2026-01-02T00:00:00Z' }))).code).toBe(
        CHECK_VIOLATION
      )
      await merge(a, { state: 'undone', undoneAt: '2026-01-02T00:00:00Z' })
    })

    test('the snapshot and the field choices must be objects', async () => {
      const a = await seed()
      expect((await refusal(merge(a, { snapshot: '[]' }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(merge(a, { choices: '[]' }))).code).toBe(CHECK_VIOLATION)
    })
  })
})
