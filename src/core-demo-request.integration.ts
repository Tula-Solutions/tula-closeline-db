import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Pool, type PoolClient } from 'pg'
import { createDb, type DbHandle } from './client'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { findTenantIsolationGaps, NON_TENANT_TABLES } from './isolation'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const TABLE = 'core.demo_request'
const SERVICE_ROLES = ['closeline_auth', 'closeline_core', 'closeline_playbook']

let seq = Math.floor(Math.random() * 1e9)
const newId = (prefix: string): string => `${prefix}_${(++seq).toString(16).padStart(32, '0')}`

interface Failure {
  message: string
  code?: string
  constraint?: string
}

/** Run `promise` and describe the error it rejected with, failing if it resolved. */
async function failure(promise: PromiseLike<unknown>): Promise<Failure> {
  try {
    await promise
  } catch (error) {
    const e = error as { message?: string; code?: string; constraint?: string }
    return { message: e.message ?? String(error), code: e.code, constraint: e.constraint }
  }
  throw new Error('expected the statement to be refused, but it succeeded')
}

/** The values of a valid Demo Request; a test overrides the one column it is about. */
const valid = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: newId('dreq'),
  name: 'Ada Visitor',
  work_email: 'ada@example.test',
  company_name: 'Analytical Engines',
  message: null,
  source_page: '/pricing',
  idempotency_key: `key-${newId('k')}`,
  ...over,
})

describe('core.demo_request', () => {
  let owner: Pool
  let core: Pool
  let auth: Pool
  let playbook: Pool
  let handle: DbHandle
  const created = new Set<string>()

  /** Run `fn` in one transaction scoped to `organizationId` (or to none), as the given pool's role. */
  async function scoped<T>(
    pool: Pool,
    organizationId: string | null,
    fn: (c: PoolClient) => Promise<T>
  ): Promise<T> {
    const c = await pool.connect()
    try {
      await c.query('begin')
      if (organizationId) {
        await c.query('select set_config($1, $2, true)', [SETTING, organizationId])
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

  /** Insert one row as the owner (the only role that may), returning its id. */
  async function put(over: Record<string, unknown> = {}): Promise<string> {
    const row = valid(over)
    const columns = Object.keys(row)
    await owner.query(
      `insert into ${TABLE} (${columns.join(', ')}) values (${columns.map((_, i) => `$${i + 1}`).join(', ')})`,
      Object.values(row)
    )
    created.add(row.id as string)
    return row.id as string
  }

  async function createOrg(): Promise<string> {
    const orgId = newId('org')
    await scoped(core, orgId, async (c) => {
      await c.query(
        'insert into core.organizations (organization_id, name, region) values ($1, $2, $3)',
        [orgId, `Org ${orgId.slice(-6)}`, 'us']
      )
      await c.query(
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, 'owner', 'member@example.test')",
        [newId('mem'), orgId, newId('usr')]
      )
    })
    orgs.add(orgId)
    return orgId
  }
  const orgs = new Set<string>()

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    core = new Pool({ connectionString: env.core, max: 2 })
    auth = new Pool({ connectionString: env.auth, max: 1 })
    playbook = new Pool({ connectionString: env.playbook, max: 1 })
    await dropStaleTestObjects(owner, env.owner)
    handle = createDb(env.core, { max: 1 })
  })

  afterAll(async () => {
    if (created.size > 0) {
      await owner.query(`delete from ${TABLE} where id = any($1)`, [[...created]])
    }
    for (const orgId of orgs) {
      await scoped(core, orgId, (c) =>
        c.query('delete from core.organizations where organization_id = $1', [orgId])
      ).catch(() => undefined)
    }
    await Promise.all([owner.end(), core.end(), auth.end(), playbook.end(), handle.close()])
  }, 60_000)

  test('a valid row is accepted with a pending notice, no attempts and a submission time', async () => {
    const id = await put()
    const { rows } = await owner.query(
      `select notification_status, notification_attempts, notification_last_attempt_at, submitted_at
         from ${TABLE} where id = $1`,
      [id]
    )
    expect(rows[0].notification_status).toBe('pending')
    expect(rows[0].notification_attempts).toBe(0)
    expect(rows[0].notification_last_attempt_at).toBeNull()
    expect(rows[0].submitted_at).toBeInstanceOf(Date)
  })

  test.each([
    [
      'an upper-case work email',
      { work_email: 'Ada@Example.test' },
      'demo_request_work_email_shape',
    ],
    ['a message of 2001 characters', { message: 'x'.repeat(2001) }, 'demo_request_message_length'],
    [
      'a source page without a leading slash',
      { source_page: 'pricing' },
      'demo_request_source_page_shape',
    ],
    [
      'a source page of 201 characters',
      { source_page: `/${'p'.repeat(200)}` },
      'demo_request_source_page_shape',
    ],
    [
      'an idempotency key of 15 characters',
      { idempotency_key: 'k'.repeat(15) },
      'demo_request_idempotency_key_length',
    ],
    [
      'an idempotency key of 129 characters',
      { idempotency_key: 'k'.repeat(129) },
      'demo_request_idempotency_key_length',
    ],
    [
      'an unknown notification status',
      { notification_status: 'queued' },
      'demo_request_notification_status_known',
    ],
    ['an id of the wrong shape', { id: 'dreq_123' }, 'demo_request_id_shape'],
    ['a blank name', { name: '   ' }, 'demo_request_name_shape'],
    ['a name of 201 characters', { name: 'n'.repeat(201) }, 'demo_request_name_shape'],
    ['a blank company name', { company_name: ' ' }, 'demo_request_company_name_shape'],
    [
      'a negative attempt count',
      { notification_attempts: -1 },
      'demo_request_notification_attempts_not_negative',
    ],
  ])('refuses %s', async (_label, over, constraint) => {
    const refused = await failure(put(over))
    expect(refused.code).toBe('23514')
    expect(refused.constraint).toBe(constraint)
  })

  test('accepts a message of exactly 2000 characters and a source page of exactly 200', async () => {
    await put({ message: 'x'.repeat(2000), source_page: `/${'p'.repeat(199)}` })
  })

  test('a duplicate idempotency key is a unique violation', async () => {
    const key = `dup-${'k'.repeat(20)}${seq}`
    await put({ idempotency_key: key })
    const refused = await failure(put({ idempotency_key: key }))
    expect(refused.code).toBe('23505')
    expect(refused.constraint).toBe('demo_request_idempotency_key_key')
  })

  describe('no tenant role can reach it', () => {
    test('closeline_core, in any Organization scope or none, can neither read nor write a row', async () => {
      await put()
      const orgId = await createOrg()
      const statements = [
        `select * from ${TABLE}`,
        `select count(*) from ${TABLE}`,
        `select id from ${TABLE} limit 1`,
        `update ${TABLE} set notification_status = 'sent'`,
        `delete from ${TABLE}`,
        `truncate ${TABLE}`,
        `insert into ${TABLE} (id, name, work_email, company_name, source_page, idempotency_key)
           values ('dreq_${'0'.repeat(32)}', 'a', 'a@b.test', 'c', '/', '${'k'.repeat(16)}')`,
      ]
      for (const setting of [null, orgId]) {
        for (const statement of statements) {
          const refused = await failure(scoped(core, setting, (c) => c.query(statement)))
          expect(refused.message).toContain('permission denied for table demo_request')
        }
      }
      const { rows } = await owner.query(`select count(*)::int as n from ${TABLE}`)
      expect(rows[0].n).toBeGreaterThan(0)
    })

    test('closeline_auth and closeline_playbook are refused at the schema', async () => {
      for (const pool of [auth, playbook]) {
        const refused = await failure(scoped(pool, null, (c) => c.query(`select * from ${TABLE}`)))
        expect(refused.message).toContain('permission denied for schema core')
      }
    })

    test('no service role holds any privilege on it, column level included', async () => {
      const held = await owner.query(
        `select r.role, p.privilege
           from unnest($2::text[]) r(role)
           cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
                              ('REFERENCES'), ('TRIGGER')) p(privilege)
          where has_table_privilege(r.role, $1, p.privilege)
             or (p.privilege in ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES')
                 and has_any_column_privilege(r.role, $1, p.privilege))`,
        [TABLE, SERVICE_ROLES]
      )
      expect(held.rows).toEqual([])
    })
  })

  describe('the catalog check', () => {
    test('passes with the table on the allowlist', async () => {
      expect(NON_TENANT_TABLES).toContain(TABLE)
      expect(await findTenantIsolationGaps(handle.db)).toEqual([])
    })

    test('reports the table as a gap without the allowlist entry', async () => {
      const gaps = await findTenantIsolationGaps(handle.db, [])
      expect(gaps.find((gap) => gap.table === 'demo_request')?.reason).toContain('organization_id')
    })

    test('fails when a tenant role is granted SELECT on it', async () => {
      try {
        await owner.query(`grant select on ${TABLE} to closeline_core`)
        const gaps = (await findTenantIsolationGaps(handle.db)).filter(
          (gap) => gap.table === 'demo_request'
        )
        expect(gaps).toHaveLength(1)
        expect(gaps[0]?.reason).toContain('closeline_core')
      } finally {
        await owner.query(`revoke all on ${TABLE} from closeline_core`)
      }
      expect(await findTenantIsolationGaps(handle.db)).toEqual([])
    })

    test('fails when a column of it is granted to a tenant role', async () => {
      try {
        await owner.query(`grant select (work_email) on ${TABLE} to closeline_playbook`)
        const gaps = (await findTenantIsolationGaps(handle.db)).filter(
          (gap) => gap.table === 'demo_request'
        )
        expect(gaps).toHaveLength(1)
      } finally {
        await owner.query(`revoke all on ${TABLE} from closeline_playbook`)
      }
    })
  })
})
