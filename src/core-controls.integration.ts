import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash, randomBytes } from 'node:crypto'
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
const INSUFFICIENT_PRIVILEGE = '42501'

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`
const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex')

const TABLES = [
  'agent_instruction_pointer',
  'agent_instruction_versions',
  'agent_settings',
  'api_key_usage',
  'api_keys',
  'audit_events',
  'export_jobs',
  'export_parts',
] as const

/** One harmless update per table the service role may update. */
const UPDATES = {
  agent_instruction_pointer: "published_at = now() + interval '1 second'",
  agent_settings: "level = 'supervised'",
  api_key_usage: 'request_count = request_count + 1',
  api_keys: "name = 'renamed'",
  export_jobs: 'include_recording_links = true',
  export_parts: "updated_at = now() + interval '1 second'",
} as const

interface Seeded {
  orgId: string
  membershipId: string
  keyId: string
  exportId: string
}

describe('core agent control, audit, export and API key tables', () => {
  let owner: Pool
  let core: Pool
  let handle: DbHandle
  const orgs: string[] = []

  /** Run `fn` in one transaction scoped to `orgId` (or to none), as the core role. */
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

  const insertAudit = (
    orgId: string,
    values: { id?: string; sequence: number; previousHash: string | null; hash?: string }
  ) =>
    run(
      orgId,
      `insert into core.audit_events (id, organization_id, sequence, occurred_at, actor_kind,
         action, previous_hash, hash)
       values ($1, $2, $3, now(), 'system', 'organization.created', $4, $5)`,
      [
        values.id ?? newId('aud'),
        orgId,
        values.sequence,
        values.previousHash,
        values.hash ?? sha256(`${orgId}:${values.sequence}`),
      ]
    )

  const insertKey = (orgId: string, membershipId: string, id: string, secretHash: string) =>
    run(
      orgId,
      `insert into core.api_keys (id, organization_id, name, prefix, secret_hash, scopes,
         role_ceiling, created_by_membership_id)
       values ($1, $2, 'Zapier', 'clk_AbCd1234', $3, array['prospects:read'], 'manager', $4)`,
      [id, orgId, secretHash, membershipId]
    )

  /** Insert a key row for `target` while the session is scoped to `scope`. */
  const insertKeyAs = (scope: string | null, target: string, membershipId: string) =>
    run(
      scope,
      `insert into core.api_keys (id, organization_id, name, prefix, secret_hash, scopes, role_ceiling, created_by_membership_id)
       values ($1, $2, 'k', 'clk_Zz9Zz9Zz', $3, array['prospects:read'], 'rep', $4)`,
      [newId('akey'), target, sha256(newId('z')), membershipId]
    )

  const insertExport = (orgId: string, membershipId: string, id: string, state = 'queued') =>
    run(
      orgId,
      `insert into core.export_jobs (id, organization_id, kind, state, requested_by_membership_id)
       values ($1, $2, 'organization', $3, $4)`,
      [id, orgId, state, membershipId]
    )

  /** Create an Organization with one row in every new table. */
  async function seed(): Promise<Seeded> {
    const ids: Seeded = {
      orgId: newId('org'),
      membershipId: newId('mem'),
      keyId: newId('akey'),
      exportId: newId('exp'),
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
        [ids.membershipId, orgId, newId('usr')]
      )
      await c.query(
        `insert into core.agent_instruction_versions (id, organization_id, agent_kind, number, text, author_membership_id)
         values ($1, $2, 'inbound', 1, 'Be brief.', $3)`,
        [newId('ains'), orgId, ids.membershipId]
      )
      await c.query(
        `insert into core.agent_instruction_pointer (organization_id, agent_kind, version_number, published_by_membership_id)
         values ($1, 'inbound', 1, $2)`,
        [orgId, ids.membershipId]
      )
      await c.query(
        `insert into core.agent_settings (organization_id, agent_kind, channel, level, send_window, escalation_rules)
         values ($1, 'outbound', 'email', 'assisted', '{"timeZone":"UTC","days":[]}', '[]')`,
        [orgId]
      )
    })
    await insertAudit(orgId, { sequence: 1, previousHash: null })
    await insertKey(orgId, ids.membershipId, ids.keyId, sha256(newId('secret')))
    await run(
      orgId,
      'insert into core.api_key_usage (organization_id, api_key_id, window_start, request_count) values ($1, $2, now(), 1)',
      [orgId, ids.keyId]
    )
    await insertExport(orgId, ids.membershipId, ids.exportId)
    await run(
      orgId,
      "insert into core.export_parts (organization_id, export_id, service) values ($1, $2, 'core')",
      [orgId, ids.exportId]
    )
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

  describe.each([...TABLES])('%s', (table) => {
    test('a second Organization reads nothing, and no scope sees nothing', async () => {
      const a = await seed()
      const b = await seed()
      expect(await countOf(a.orgId, table)).toBe(1)
      expect(await countOf(b.orgId, table)).toBe(1)
      expect(await countOf(null, table)).toBe(0)
      const read = await run(b.orgId, `select 1 from core.${table} where organization_id = $1`, [
        a.orgId,
      ])
      expect(read.rowCount).toBe(0)
    })
  })

  describe.each(Object.keys(UPDATES) as (keyof typeof UPDATES)[])('%s', (table) => {
    test('a second Organization updates and removes nothing', async () => {
      const a = await seed()
      const b = await seed()
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

  test('a second Organization cannot write an event or a key into the first', async () => {
    const a = await seed()
    const b = await seed()
    const event = await refusal(
      run(
        b.orgId,
        `insert into core.audit_events (id, organization_id, sequence, occurred_at, actor_kind, action, previous_hash, hash)
         values ($1, $2, 1, now(), 'system', 'organization.created', null, $3)`,
        [newId('aud'), a.orgId, sha256('x')]
      )
    )
    expect(event.code).toBe('42501')
    const key = await refusal(insertKeyAs(b.orgId, a.orgId, a.membershipId))
    expect(key.code).toBe('42501')
    const unscoped = await refusal(insertKeyAs(null, a.orgId, a.membershipId))
    expect(unscoped.code).toBe('42501')
  })

  describe('append-only tables', () => {
    test('the service role holds INSERT and SELECT only on the audit log and the instruction versions', async () => {
      const rows = await owner.query(
        `select t.name,
                p.privilege,
                has_table_privilege('closeline_core', 'core.' || t.name, p.privilege) as granted
           from (values ('audit_events'), ('agent_instruction_versions')) as t(name)
           cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) as p(privilege)`
      )
      const granted = (name: string) =>
        rows.rows
          .filter((r) => r.name === name && r.granted)
          .map((r) => r.privilege)
          .sort()
      expect(granted('audit_events')).toEqual(['INSERT', 'SELECT'])
      expect(granted('agent_instruction_versions')).toEqual(['INSERT', 'SELECT'])
    })

    test('an event or a version cannot be changed or removed by the service role', async () => {
      const a = await seed()
      for (const sql of [
        "update core.audit_events set action = 'x.y'",
        'delete from core.audit_events',
        "update core.agent_instruction_versions set text = 'changed'",
        'delete from core.agent_instruction_versions',
      ]) {
        expect((await refusal(run(a.orgId, sql))).code).toBe(INSUFFICIENT_PRIVILEGE)
      }
      expect(await countOf(a.orgId, 'audit_events')).toBe(1)
      expect(await countOf(a.orgId, 'agent_instruction_versions')).toBe(1)
    })

    test('removing an Organization still removes its events and versions', async () => {
      const a = await seed()
      await owner.query('delete from core.organizations where organization_id = $1', [a.orgId])
      for (const table of TABLES) {
        const { rows } = await owner.query(
          `select count(*)::int as n from core.${table} where organization_id = $1`,
          [a.orgId]
        )
        expect(rows[0].n).toBe(0)
      }
    })
  })

  describe('the audit chain', () => {
    test('a sequence is unique per Organization and not across Organizations', async () => {
      const a = await seed()
      const b = await seed()
      const duplicate = await refusal(insertAudit(a.orgId, { sequence: 1, previousHash: null }))
      expect(duplicate.code).toBe(UNIQUE_VIOLATION)
      expect(await countOf(b.orgId, 'audit_events')).toBe(1)
    })

    test('an event extends the chain with the next sequence and the previous hash', async () => {
      const a = await seed()
      const first = sha256(`${a.orgId}:1`)
      await insertAudit(a.orgId, { sequence: 2, previousHash: first, hash: sha256('two') })
      await insertAudit(a.orgId, {
        sequence: 3,
        previousHash: sha256('two'),
        hash: sha256('three'),
      })
      expect(await countOf(a.orgId, 'audit_events')).toBe(3)
    })

    test('a gap, a wrong previous hash and a second start are refused', async () => {
      const a = await seed()
      const gap = await refusal(
        insertAudit(a.orgId, { sequence: 3, previousHash: sha256(`${a.orgId}:1`) })
      )
      expect(gap.code).toBe(CHECK_VIOLATION)
      const fork = await refusal(
        insertAudit(a.orgId, { sequence: 2, previousHash: sha256('nope') })
      )
      expect(fork.code).toBe(CHECK_VIOLATION)
      const start = await refusal(insertAudit(a.orgId, { sequence: 2, previousHash: null }))
      expect(start.code).toBe(CHECK_VIOLATION)
      const second = await refusal(insertAudit(a.orgId, { sequence: 1, previousHash: sha256('x') }))
      expect(second.code).toBe(CHECK_VIOLATION)
      expect(await countOf(a.orgId, 'audit_events')).toBe(1)
    })

    test('a redelivered event is a no-op by its id', async () => {
      const a = await seed()
      const id = newId('aud')
      const first = sha256(`${a.orgId}:1`)
      await insertAudit(a.orgId, { id, sequence: 2, previousHash: first, hash: sha256('two') })
      const again = await run(
        a.orgId,
        `insert into core.audit_events (id, organization_id, sequence, occurred_at, actor_kind, action, previous_hash, hash)
         values ($1, $2, 3, now(), 'system', 'organization.created', $3, $4)
         on conflict (organization_id, id) do nothing`,
        [id, a.orgId, sha256('two'), sha256('three')]
      )
      expect(again.rowCount).toBe(0)
      expect(await countOf(a.orgId, 'audit_events')).toBe(2)
    })

    test('the actor columns agree with the actor kind and the metadata is bounded', async () => {
      const a = await seed()
      const insert = (actor: string, extra: string, metadata = '{}') =>
        run(
          a.orgId,
          `insert into core.audit_events (id, organization_id, sequence, occurred_at, actor_kind,
             actor_membership_id, actor_agent_kind, actor_api_key_id, action, previous_hash, hash, metadata)
           values ($1, $2, 2, now(), '${actor}', ${extra}, 'a.b', $3, $4, $5::jsonb)`,
          [newId('aud'), a.orgId, sha256(`${a.orgId}:1`), sha256('two'), metadata]
        )
      expect((await refusal(insert('member', 'null, null, null'))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('agent', `'${a.membershipId}', 'inbound', null`))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(insert('system', "null, 'inbound', null"))).code).toBe(CHECK_VIOLATION)
      const big = JSON.stringify({ note: 'x'.repeat(4100) })
      expect((await refusal(insert('system', 'null, null, null', big))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('system', 'null, null, null', '[]'))).code).toBe(CHECK_VIOLATION)
    })

    test('the subject and the action have the contract shape', async () => {
      const a = await seed()
      const insert = (action: string, subjectType: string | null, subjectId: string | null) =>
        run(
          a.orgId,
          `insert into core.audit_events (id, organization_id, sequence, occurred_at, actor_kind, action,
             subject_type, subject_id, previous_hash, hash)
           values ($1, $2, 2, now(), 'system', $3, $4, $5, $6, $7)`,
          [
            newId('aud'),
            a.orgId,
            action,
            subjectType,
            subjectId,
            sha256(`${a.orgId}:1`),
            sha256('2'),
          ]
        )
      expect((await refusal(insert('NoDot', null, null))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('a.b', 'prospect', null))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('a.b', null, newId('prs')))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('a.b', 'prospect', 'not-an-id'))).code).toBe(CHECK_VIOLATION)
      await insert('prospect.merged', 'prospect', newId('prs'))
    })
  })

  describe('API keys', () => {
    test('a key hash is unique across Organizations', async () => {
      const a = await seed()
      const b = await seed()
      const hash = sha256(newId('shared'))
      await insertKey(a.orgId, a.membershipId, newId('akey'), hash)
      const same = await refusal(insertKey(b.orgId, b.membershipId, newId('akey'), hash))
      expect(same.code).toBe(UNIQUE_VIOLATION)
    })

    test('no column holds a plaintext key and the hash must be 64 hex characters', async () => {
      const a = await seed()
      const columns = await owner.query(
        "select column_name from information_schema.columns where table_schema = 'core' and table_name = 'api_keys'"
      )
      expect(columns.rows.map((r) => r.column_name).filter((n) => /secret|token/.test(n))).toEqual([
        'secret_hash',
      ])
      expect(
        (await refusal(insertKey(a.orgId, a.membershipId, newId('akey'), 'clk_plaintext'))).code
      ).toBe(CHECK_VIOLATION)
    })

    test('scopes are known, non-empty and the prefix, name and expiry are checked', async () => {
      const a = await seed()
      const insert = (scopes: string, prefix = 'clk_AbCd1234', name = 'k', expires = 'null') =>
        run(
          a.orgId,
          `insert into core.api_keys (id, organization_id, name, prefix, secret_hash, scopes, role_ceiling,
             expires_at, created_by_membership_id)
           values ($1, $2, $3, $4, $5, ${scopes}, 'rep', ${expires}, $6)`,
          [newId('akey'), a.orgId, name, prefix, sha256(newId('s')), a.membershipId]
        )
      expect((await refusal(insert("array['admin:all']"))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert("'{}'::text[]"))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert("array['calls:read']", 'sk_AbCd1234'))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(insert("array['calls:read']", 'clk_AbCd1234', ''))).code).toBe(
        CHECK_VIOLATION
      )
      expect(
        (
          await refusal(
            insert("array['calls:read']", 'clk_AbCd1234', 'k', "now() - interval '1 day'")
          )
        ).code
      ).toBe(CHECK_VIOLATION)
      await insert(
        "array['calls:read', 'calls:write']",
        'clk_AbCd1234',
        'ok',
        "now() + interval '1 day'"
      )
    })

    test("a key's counters go with the key and are one row per window", async () => {
      const a = await seed()
      const dup = await refusal(
        run(
          a.orgId,
          `insert into core.api_key_usage (organization_id, api_key_id, window_start)
           select organization_id, api_key_id, window_start from core.api_key_usage`
        )
      )
      expect(dup.code).toBe(UNIQUE_VIOLATION)
      const orphan = await refusal(
        run(
          a.orgId,
          'insert into core.api_key_usage (organization_id, api_key_id, window_start) values ($1, $2, now())',
          [a.orgId, newId('akey')]
        )
      )
      expect(orphan.code).toBe(FOREIGN_KEY_VIOLATION)
      await run(a.orgId, 'delete from core.api_keys where id = $1', [a.keyId])
      expect(await countOf(a.orgId, 'api_key_usage')).toBe(0)
    })

    test('the auth schema keeps its own api_keys and audit_logs', async () => {
      const { rows } = await owner.query(
        `select to_regclass('auth.api_keys') is not null as keys,
                to_regclass('auth.audit_logs') is not null as logs,
                to_regclass('core.api_keys') is not null as core_keys`
      )
      expect(rows[0]).toEqual({ keys: true, logs: true, core_keys: true })
    })
  })

  describe('exports', () => {
    test('a second queued or running export for one Organization is refused', async () => {
      const a = await seed()
      const second = await refusal(insertExport(a.orgId, a.membershipId, newId('exp'), 'running'))
      expect(second.code).toBe(UNIQUE_VIOLATION)
      await run(
        a.orgId,
        "update core.export_jobs set state = 'failed', failure_reason = 'timed_out', completed_at = now() where id = $1",
        [a.exportId]
      )
      await insertExport(a.orgId, a.membershipId, newId('exp'))
      const other = await seed()
      expect(await countOf(other.orgId, 'export_jobs')).toBe(1)
    })

    test('a failure reason is set exactly when the export failed, and completion fits the state', async () => {
      const a = await seed()
      const fail = (set: string) =>
        run(a.orgId, `update core.export_jobs set ${set} where id = $1`, [a.exportId])
      expect((await refusal(fail("state = 'failed', completed_at = now()"))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(fail("failure_reason = 'timed_out'"))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(fail("state = 'ready'"))).code).toBe(CHECK_VIOLATION)
      await fail("state = 'ready', completed_at = now(), expires_at = now() + interval '1 day'")
    })

    test('an enriched export has a format and no recordings, an Organization export neither format nor filter', async () => {
      const a = await seed()
      await run(
        a.orgId,
        "update core.export_jobs set state = 'failed', failure_reason = 'timed_out', completed_at = now() where id = $1",
        [a.exportId]
      )
      const insert = (kind: string, format: string | null, recordings: boolean) =>
        run(
          a.orgId,
          `insert into core.export_jobs (id, organization_id, kind, format, include_recording_links, requested_by_membership_id)
           values ($1, $2, $3, $4, $5, $6)`,
          [newId('exp'), a.orgId, kind, format, recordings, a.membershipId]
        )
      expect((await refusal(insert('organization', 'csv', false))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('enriched_prospects', null, false))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('enriched_prospects', 'csv', true))).code).toBe(CHECK_VIOLATION)
      await insert('enriched_prospects', 'csv', false)
    })

    test('a part is one row per service, ready with a safe prefix or failed with a reason', async () => {
      const a = await seed()
      const part = (service: string, set: string) =>
        run(
          a.orgId,
          `update core.export_parts set ${set} where export_id = $1 and service = '${service}'`,
          [a.exportId]
        )
      const dup = await refusal(
        run(
          a.orgId,
          "insert into core.export_parts (organization_id, export_id, service) values ($1, $2, 'core')",
          [a.orgId, a.exportId]
        )
      )
      expect(dup.code).toBe(UNIQUE_VIOLATION)
      const ready = (prefix: string, files = 3, bytes = 100) =>
        part(
          'core',
          `state = 'ready', prefix = '${prefix}', file_count = ${files}, bytes = ${bytes}, ready_at = now()`
        )
      expect((await refusal(ready('../escape'))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(ready('a/../b'))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(ready('/absolute'))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(ready('ok/prefix', 10_001))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(ready('ok/prefix', 1, 50_000_000_001))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(part('core', "state = 'failed'"))).code).toBe(CHECK_VIOLATION)
      await ready('exports/org_x/exp_y/core')
      await part(
        'core',
        "state = 'failed', failure_reason = 'write_failed', prefix = null, file_count = null, bytes = null, ready_at = null"
      )
    })

    test('a part follows its job when the job is removed', async () => {
      const a = await seed()
      await run(a.orgId, 'delete from core.export_jobs where id = $1', [a.exportId])
      expect(await countOf(a.orgId, 'export_parts')).toBe(0)
    })

    test('the list indexes exist for the cursor-paged lists', async () => {
      const { rows } = await owner.query(
        "select indexname from pg_indexes where schemaname = 'core' and indexname = any($1)",
        [
          [
            'audit_events_occurred_idx',
            'audit_events_action_idx',
            'audit_events_subject_idx',
            'audit_events_prospect_idx',
            'export_jobs_list_idx',
            'api_keys_list_idx',
            'agent_instruction_versions_number_key',
          ],
        ]
      )
      expect(rows).toHaveLength(7)
    })
  })

  describe('agent instructions and settings', () => {
    test('a version number is unique per Organization and Agent kind, and the text is bounded', async () => {
      const a = await seed()
      const insert = (kind: string, number: number, text: string) =>
        run(
          a.orgId,
          `insert into core.agent_instruction_versions (id, organization_id, agent_kind, number, text)
           values ($1, $2, $3, $4, $5)`,
          [newId('ains'), a.orgId, kind, number, text]
        )
      expect((await refusal(insert('inbound', 1, 'again'))).code).toBe(UNIQUE_VIOLATION)
      await insert('outbound', 1, 'other kind')
      expect((await refusal(insert('inbound', 2, ''))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('inbound', 2, 'x'.repeat(20_001)))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('inbound', 0, 'zero'))).code).toBe(CHECK_VIOLATION)
      await insert('inbound', 2, 'x'.repeat(20_000))
    })

    test('the pointer names a version of its own Agent kind and can be re-pointed', async () => {
      const a = await seed()
      const point = (kind: string, number: number) =>
        run(
          a.orgId,
          `insert into core.agent_instruction_pointer (organization_id, agent_kind, version_number)
           values ($1, $2, $3)
           on conflict (organization_id, agent_kind) do update set version_number = excluded.version_number`,
          [a.orgId, kind, number]
        )
      expect((await refusal(point('inbound', 9))).code).toBe(FOREIGN_KEY_VIOLATION)
      expect((await refusal(point('outbound', 1))).code).toBe(FOREIGN_KEY_VIOLATION)
      await run(
        a.orgId,
        `insert into core.agent_instruction_versions (id, organization_id, agent_kind, number, text)
         values ($1, $2, 'inbound', 2, 'v2')`,
        [newId('ains'), a.orgId]
      )
      await point('inbound', 2)
      const { rows } = await run(
        a.orgId,
        "select version_number from core.agent_instruction_pointer where agent_kind = 'inbound'"
      )
      expect(rows[0].version_number).toBe(2)
    })

    test('an Agent row has a level, a window and rules, and the Organization row only the pause flag', async () => {
      const a = await seed()
      const insert = (columns: string, values: string) =>
        run(
          a.orgId,
          `insert into core.agent_settings (organization_id, ${columns}) values ($1, ${values})`,
          [a.orgId]
        )
      expect((await refusal(insert('agent_kind, channel', "'inbound', 'default'"))).code).toBe(
        CHECK_VIOLATION
      )
      expect(
        (
          await refusal(
            insert(
              'agent_kind, channel, level, send_window, escalation_rules, agents_paused',
              "'inbound', 'default', 'autonomous', '{}', '[]', false"
            )
          )
        ).code
      ).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('agent_kind, channel', "'organization', 'default'"))).code).toBe(
        CHECK_VIOLATION
      )
      expect(
        (
          await refusal(
            insert('agent_kind, channel, agents_paused', "'organization', 'email', true")
          )
        ).code
      ).toBe(CHECK_VIOLATION)
      expect(
        (
          await refusal(
            insert(
              'agent_kind, channel, level, send_window, escalation_rules',
              "'inbound', 'fax', 'autonomous', '{}', '[]'"
            )
          )
        ).code
      ).toBe(CHECK_VIOLATION)
      expect(
        (
          await refusal(
            insert(
              'agent_kind, channel, level, send_window, escalation_rules',
              "'inbound', 'default', 'autonomous', '{}', '{}'"
            )
          )
        ).code
      ).toBe(CHECK_VIOLATION)
      await insert('agent_kind, channel, agents_paused', "'organization', 'default', true")
      await insert(
        'agent_kind, channel, level, send_window, escalation_rules',
        "'inbound', 'default', 'autonomous', '{}', '[]'"
      )
    })
  })
})
