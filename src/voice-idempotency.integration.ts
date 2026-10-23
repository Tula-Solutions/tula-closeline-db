import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash, randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { createDb, type DbHandle } from './client'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { assertTenantIsolation, findTenantIsolationGaps, NON_TENANT_TABLES } from './isolation'
import { voiceIdempotencyKeys } from './schema'
import { tenantRlsStatements, withOrganization } from './tenant'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const TABLE = 'voice.idempotency_keys'
const USER = 'usr_00000000000000000000000000000001'

const newOrg = (): string => `org_${randomBytes(16).toString('hex')}`
const hashOf = (body: string): Buffer => createHash('sha256').update(body).digest()
let n = 0
const freshKey = (): string => `key-${++n}-${Math.random().toString(36).slice(2)}`

interface Row {
  orgId: string
  userId?: string
  route?: string
  key?: string
  hash?: Buffer
  status?: number | null
  response?: unknown
}

/** Run `promise` and describe the error it rejected with, failing if it resolved. */
async function failure(promise: PromiseLike<unknown>) {
  try {
    await promise
  } catch (error) {
    const e = error as { message?: string; code?: string; constraint?: string }
    return { message: e.message ?? String(error), code: e.code, constraint: e.constraint }
  }
  throw new Error('expected the statement to be refused, but it succeeded')
}

describe('voice.idempotency_keys', () => {
  let owner: Pool
  let voice: Pool
  let core: Pool
  let auth: Pool
  let playbook: Pool
  let handle: DbHandle
  const orgs: string[] = []

  async function scoped<T>(
    pool: Pool,
    orgId: string | null,
    fn: (c: PoolClient) => Promise<T>
  ): Promise<T> {
    const c = await pool.connect()
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

  const insertOf = (row: Row): [string, unknown[]] => [
    `insert into ${TABLE} (organization_id, user_id, route, key, request_hash, status, response)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      row.orgId,
      row.userId ?? USER,
      row.route ?? 'lines.add',
      row.key ?? freshKey(),
      row.hash ?? hashOf('body'),
      row.status ?? null,
      row.response === undefined ? null : JSON.stringify(row.response),
    ],
  ]
  const put = (row: Row, pool: Pool = voice) =>
    scoped(pool, row.orgId, (c) => c.query(...insertOf(row)))
  const count = (orgId: string | null, where = 'true', values: unknown[] = []) =>
    scoped(owner, orgId, async (c) =>
      Number((await c.query(`select count(*) as n from ${TABLE} where ${where}`, values)).rows[0].n)
    )
  const newScoped = (): string => {
    const id = newOrg()
    orgs.push(id)
    return id
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    voice = new Pool({ connectionString: env.voice, max: 4 })
    core = new Pool({ connectionString: env.core, max: 1 })
    auth = new Pool({ connectionString: env.auth, max: 1 })
    playbook = new Pool({ connectionString: env.playbook, max: 1 })
    await dropStaleTestObjects(owner, env.owner)
    handle = createDb(env.voice, { max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      await scoped(voice, orgId, (c) =>
        c.query(`delete from ${TABLE} where organization_id = $1`, [orgId])
      ).catch(() => undefined)
    }
    await Promise.all([
      owner.end(),
      voice.end(),
      core.end(),
      auth.end(),
      playbook.end(),
      handle.close(),
    ])
  }, 60_000)

  describe('tenant isolation', () => {
    let a: string
    let b: string

    beforeAll(async () => {
      a = newScoped()
      b = newScoped()
      for (const orgId of [a, b]) {
        await put({ orgId, key: 'in-flight' })
        await put({ orgId, key: 'done', status: 201, response: { id: 'line_1' } })
      }
    })

    test('with no Organization set every statement sees nothing, and an insert is refused', async () => {
      expect(await count(null)).toBe(0)
      const rows = await scoped(voice, null, (c) => c.query(`select * from ${TABLE}`))
      expect(rows.rowCount).toBe(0)
      const refused = await failure(scoped(voice, null, (c) => c.query(...insertOf({ orgId: a }))))
      expect(refused.message).toContain('row-level security')
    })

    test('a second Organization cannot insert a row for the first', async () => {
      const refused = await failure(scoped(voice, b, (c) => c.query(...insertOf({ orgId: a }))))
      expect(refused.message).toContain('row-level security')
    })

    test('a second Organization cannot read, update or remove the first rows', async () => {
      expect(await count(a, 'organization_id = $1', [a])).toBe(2)
      expect(await count(b, 'organization_id = $1', [a])).toBe(0)
      const updated = await scoped(voice, b, (c) =>
        c.query(`update ${TABLE} set response = '{"x":1}' where organization_id = $1`, [a])
      )
      const removed = await scoped(voice, b, (c) =>
        c.query(`delete from ${TABLE} where organization_id = $1`, [a])
      )
      expect([updated.rowCount, removed.rowCount]).toEqual([0, 0])
      expect(await count(a)).toBe(2)
    })

    test('the typed schema reads and writes through withOrganization', async () => {
      const key = freshKey()
      await withOrganization(handle.db, a, (tx) =>
        tx.insert(voiceIdempotencyKeys).values({
          organizationId: a,
          userId: USER,
          route: 'lines.add',
          key,
          requestHash: hashOf('typed'),
        })
      )
      const found = await withOrganization(handle.db, a, (tx) =>
        tx.select().from(voiceIdempotencyKeys)
      )
      const row = found.find((r) => r.key === key)
      expect(row?.status).toBeNull()
      expect(Buffer.from(row?.requestHash ?? []).equals(hashOf('typed'))).toBe(true)
      const other = await withOrganization(handle.db, b, (tx) =>
        tx.select().from(voiceIdempotencyKeys)
      )
      expect(other.find((r) => r.key === key)).toBeUndefined()
    })

    test('closeline_voice may select, insert, update and delete; no other role may do anything', async () => {
      const privilege = async (role: string, what: string) =>
        (
          await owner.query<{ ok: boolean }>('select has_table_privilege($1, $2, $3) as ok', [
            role,
            TABLE,
            what,
          ])
        ).rows[0]?.ok
      for (const what of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        expect([what, await privilege('closeline_voice', what)]).toEqual([what, true])
      }
      for (const what of ['TRUNCATE', 'REFERENCES', 'TRIGGER']) {
        expect([what, await privilege('closeline_voice', what)]).toEqual([what, false])
      }
      for (const role of ['closeline_auth', 'closeline_core', 'closeline_playbook', 'public']) {
        for (const what of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) {
          expect([role, what, await privilege(role, what)]).toEqual([role, what, false])
        }
      }
    })

    test.each([
      ['closeline_auth', () => auth],
      ['closeline_core', () => core],
      ['closeline_playbook', () => playbook],
    ])('%s is refused', async (_role, pool) => {
      const refused = await failure(scoped(pool(), a, (c) => c.query(`select * from ${TABLE}`)))
      expect(refused.message).toContain('permission denied for schema voice')
    })

    test('it needs no allowlist entry: the catalog check passes, and fails without the policy', async () => {
      expect(NON_TENANT_TABLES).not.toContain(TABLE)
      expect(await findTenantIsolationGaps(handle.db)).toEqual([])
      await assertTenantIsolation(handle.db)
      const policy = tenantRlsStatements('voice', 'idempotency_keys')[2] ?? ''
      try {
        await owner.query(
          'drop policy "idempotency_keys_tenant_isolation" on voice.idempotency_keys'
        )
        const gaps = (await findTenantIsolationGaps(handle.db)).filter(
          (gap) => gap.table === 'idempotency_keys'
        )
        expect(gaps.length).toBe(1)
      } finally {
        await owner.query(policy).catch(() => undefined)
      }
      expect(await findTenantIsolationGaps(handle.db)).toEqual([])
    })
  })

  describe('keys and checks', () => {
    let a: string
    let b: string

    beforeAll(() => {
      a = newScoped()
      b = newScoped()
    })

    test('the same key cannot be inserted twice, but is a different row per Organization, user and route', async () => {
      const key = freshKey()
      await put({ orgId: a, key })
      const again = await failure(put({ orgId: a, key, hash: hashOf('other body') }))
      expect([again.code, again.constraint]).toEqual(['23505', 'idempotency_keys_pkey'])
      await put({ orgId: b, key })
      await put({ orgId: a, key, userId: 'usr_00000000000000000000000000000002' })
      await put({ orgId: a, key, route: 'lines.release' })
      expect(await count(a, 'key = $1', [key])).toBe(3)
      expect(await count(b, 'key = $1', [key])).toBe(1)
    })

    const cases: [string, Partial<Row>, string][] = [
      ['route: empty', { route: '' }, 'idempotency_keys_route_shape'],
      ['route: 65 characters', { route: 'a'.repeat(65) }, 'idempotency_keys_route_shape'],
      ['route: upper case', { route: 'Lines.add' }, 'idempotency_keys_route_shape'],
      ['route: a trailing newline', { route: 'lines.add\n' }, 'idempotency_keys_route_shape'],
      ['key: empty', { key: '' }, 'idempotency_keys_key_shape'],
      ['key: 256 characters', { key: 'k'.repeat(256) }, 'idempotency_keys_key_shape'],
      ['key: a space', { key: 'key 1' }, 'idempotency_keys_key_shape'],
      ['key: a trailing newline', { key: 'key-1\n' }, 'idempotency_keys_key_shape'],
      ['hash: 31 bytes', { hash: Buffer.alloc(31, 1) }, 'idempotency_keys_request_hash_length'],
      ['hash: 33 bytes', { hash: Buffer.alloc(33, 1) }, 'idempotency_keys_request_hash_length'],
      ['status: 99', { status: 99, response: {} }, 'idempotency_keys_status_range'],
      ['status: 600', { status: 600, response: {} }, 'idempotency_keys_status_range'],
      [
        'a response without a status',
        { response: { a: 1 } },
        'idempotency_keys_response_matches_status',
      ],
      ['a status without a response', { status: 200 }, 'idempotency_keys_response_matches_status'],
      [
        'a response over 16384 bytes',
        { status: 200, response: { body: 'x'.repeat(20_000) } },
        'idempotency_keys_response_size',
      ],
      [
        'a user id that is not a usr_ id',
        { userId: 'not-a-user' },
        'idempotency_keys_user_id_shape',
      ],
    ]

    test.each(cases)('%s is refused', async (_name, values, constraint) => {
      const refused = await failure(put({ orgId: a, key: freshKey(), ...values }))
      expect([refused.code, refused.constraint]).toEqual(['23514', constraint])
    })

    test('the global scope Organization id is refused', async () => {
      const global = 'org_00000000000000000000000000000000'
      const refused = await failure(
        scoped(voice, global, (c) => c.query(...insertOf({ orgId: global })))
      )
      expect(refused.constraint).toBe('idempotency_keys_organization_not_global')
    })

    test('the largest key, route and response are accepted', async () => {
      await put({ orgId: a, key: '~'.repeat(255), route: 'a0._'.repeat(16) })
      await put({ orgId: a, key: freshKey(), status: 200, response: 'a'.repeat(16_382) })
    })
  })

  describe('a row is completed once and its identity never changes', () => {
    let a: string

    beforeAll(() => {
      a = newScoped()
    })

    test('an in-flight row can be completed exactly once', async () => {
      const key = freshKey()
      await put({ orgId: a, key })
      const complete = (status: number, body: unknown) =>
        scoped(voice, a, (c) =>
          c.query(`update ${TABLE} set status = $2, response = $3 where key = $1`, [
            key,
            status,
            JSON.stringify(body),
          ])
        )
      expect((await complete(201, { id: 'line_1' })).rowCount).toBe(1)
      const again = await failure(complete(500, { error: 'x' }))
      expect(again.message).toContain('voice.idempotency_final')
    })

    test.each([
      ['status', 'status = 500'],
      ['response', `response = '{"changed":true}'`],
      ['the request hash', `request_hash = '\\x${'11'.repeat(32)}'`],
      ['the route', `route = 'other.route'`],
      ['the key', `key = 'other-key'`],
      ['the user', `user_id = 'usr_000000000000000000000000000000ff'`],
      ['created_at', `created_at = now() - interval '1 year'`],
      ['its own values', 'status = status'],
    ])('a completed row refuses a change to %s', async (_name, set) => {
      const key = freshKey()
      await put({ orgId: a, key, status: 200, response: { id: 'line_1' } })
      const refused = await failure(
        scoped(voice, a, (c) => c.query(`update ${TABLE} set ${set} where key = $1`, [key]))
      )
      expect(refused.message).toContain('voice.idempotency_final')
    })

    test.each([
      ['the request hash', `request_hash = '\\x${'11'.repeat(32)}'`],
      ['the route', `route = 'other.route'`],
      ['created_at', `created_at = now() - interval '1 year'`],
    ])('an in-flight row refuses a change to %s', async (_name, set) => {
      const key = freshKey()
      await put({ orgId: a, key })
      const refused = await failure(
        scoped(voice, a, (c) => c.query(`update ${TABLE} set ${set} where key = $1`, [key]))
      )
      expect(refused.message).toContain('voice.idempotency_final')
    })

    test('a row can still be removed, in flight or completed, so a purge can reach it', async () => {
      const [done, flying] = [freshKey(), freshKey()]
      await put({ orgId: a, key: done, status: 200, response: {} })
      await put({ orgId: a, key: flying })
      const removed = await scoped(voice, a, (c) =>
        c.query(`delete from ${TABLE} where key = any($1)`, [[done, flying]])
      )
      expect(removed.rowCount).toBe(2)
    })

    test('the purge index serves a bounded delete by age', async () => {
      const plan = await scoped(owner, a, async (c) => {
        await c.query('set local enable_seqscan = off')
        return (
          await c.query<Record<string, string>>(
            `explain select 1 from ${TABLE} where organization_id = $1 and created_at < now() order by created_at limit 10`,
            [a]
          )
        ).rows
          .map((r) => r['QUERY PLAN'])
          .join('\n')
      })
      expect(plan).toContain('idempotency_keys_purge_idx')
    })
  })
})
