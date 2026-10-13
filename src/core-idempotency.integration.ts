import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { createDb, type DbHandle } from './client'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { assertTenantIsolation, findTenantIsolationGaps, NON_TENANT_TABLES } from './isolation'
import { idempotencyKeys } from './schema'
import { tenantRlsStatements, withOrganization } from './tenant'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const TABLE = 'core.idempotency_keys'

let seq = Math.floor(Math.random() * 1e9)
const newId = (prefix: string): string => `${prefix}_${(++seq).toString(16).padStart(32, '0')}`
const hashOf = (body: string): Buffer => createHash('sha256').update(body).digest()

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

/** The values of one idempotency row; anything left out is a valid default. */
interface Row {
  orgId: string
  userId?: string
  route?: string
  key?: string
  hash?: Buffer
  status?: number | null
  response?: unknown
}

describe('core.idempotency_keys', () => {
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

  const inOrg = <T>(orgId: string, fn: (c: PoolClient) => Promise<T>) => scoped(core, orgId, fn)

  /** Create an Organization with its first Owner, the way the service does. */
  async function createOrg(): Promise<string> {
    const orgId = newId('org')
    created.add(orgId)
    await inOrg(orgId, async (c) => {
      await c.query(
        'insert into core.organizations (organization_id, name, region) values ($1, $2, $3)',
        [orgId, `Org ${orgId.slice(-6)}`, 'us']
      )
      await c.query(
        "insert into core.memberships (id, organization_id, user_id, role) values ($1, $2, $3, 'owner')",
        [newId('mem'), orgId, newId('usr')]
      )
    })
    return orgId
  }

  /** The insert statement and values for a row; a null status leaves the request in flight. */
  const insertOf = (row: Row): [string, unknown[]] => [
    `insert into ${TABLE} (organization_id, user_id, route, key, request_hash, status, response)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      row.orgId,
      row.userId ?? 'usr_00000000000000000000000000000001',
      row.route ?? 'invitations.create',
      row.key ?? 'key-1',
      row.hash ?? hashOf('body'),
      row.status ?? null,
      row.response === undefined ? null : JSON.stringify(row.response),
    ],
  ]

  const put = (row: Row, pool: Pool = core) =>
    scoped(pool, row.orgId, (c) => c.query(...insertOf(row)))

  const count = async (orgId: string | null, where = 'true', values: unknown[] = []) =>
    scoped(owner, orgId, async (c) =>
      Number((await c.query(`select count(*) as n from ${TABLE} where ${where}`, values)).rows[0].n)
    )

  /** An in-flight row's key under a fresh route name, so tests do not collide. */
  let n = 0
  const freshKey = (): string => `key-${++n}-${Math.random().toString(36).slice(2)}`

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    core = new Pool({ connectionString: env.core, max: 4 })
    auth = new Pool({ connectionString: env.auth, max: 1 })
    playbook = new Pool({ connectionString: env.playbook, max: 1 })
    await dropStaleTestObjects(owner, env.owner)
    handle = createDb(env.core, { max: 1 })
  })

  afterAll(async () => {
    for (const orgId of created) {
      await inOrg(orgId, (c) =>
        c.query('delete from core.organizations where organization_id = $1', [orgId])
      ).catch(() => undefined)
    }
    await Promise.all([owner.end(), core.end(), auth.end(), playbook.end(), handle.close()])
  }, 60_000)

  describe('tenant isolation', () => {
    let a: string
    let b: string

    beforeAll(async () => {
      a = await createOrg()
      b = await createOrg()
      for (const orgId of [a, b]) {
        await put({ orgId, key: 'in-flight' })
        await put({ orgId, key: 'done', status: 201, response: { id: 'inv_1' } })
      }
    })

    test('with no Organization set every statement sees nothing, and an insert is refused', async () => {
      expect(await count(null)).toBe(0)
      const rows = await scoped(core, null, (c) => c.query(`select * from ${TABLE}`))
      expect(rows.rowCount).toBe(0)
      const updated = await scoped(core, null, (c) =>
        c.query(`update ${TABLE} set response = response where true`)
      )
      const removed = await scoped(core, null, (c) => c.query(`delete from ${TABLE}`))
      expect([updated.rowCount, removed.rowCount]).toEqual([0, 0])
      const unscoped = await failure(scoped(core, null, (c) => c.query(...insertOf({ orgId: a }))))
      expect(unscoped.message).toContain('row-level security')
      expect(await count(a)).toBe(2)
    })

    test('a second Organization cannot insert a row for the first', async () => {
      const refused = await failure(
        scoped(core, b, (c) => c.query(...insertOf({ orgId: a, key: freshKey() })))
      )
      expect(refused.message).toContain('row-level security')
    })

    test('a second Organization cannot read the first rows', async () => {
      const where = 'organization_id = $1'
      expect(await count(a, where, [a])).toBe(2)
      expect(await count(b, where, [a])).toBe(0)
      expect(await count(b, 'true')).toBe(2)
    })

    test('a second Organization cannot update or delete the first rows', async () => {
      const updated = await scoped(core, b, (c) =>
        c.query(`update ${TABLE} set response = '{"x":1}' where organization_id = $1`, [a])
      )
      const removed = await scoped(core, b, (c) =>
        c.query(`delete from ${TABLE} where organization_id = $1`, [a])
      )
      expect([updated.rowCount, removed.rowCount]).toEqual([0, 0])
      expect(await count(a)).toBe(2)
      const first = await scoped(
        owner,
        a,
        async (c) => (await c.query(`select response from ${TABLE} where key = 'done'`)).rows[0]
      )
      expect(first.response).toEqual({ id: 'inv_1' })
    })

    test('the typed schema reads and writes through withOrganization', async () => {
      const key = freshKey()
      await withOrganization(handle.db, a, (tx) =>
        tx.insert(idempotencyKeys).values({
          organizationId: a,
          userId: 'usr_00000000000000000000000000000009',
          route: 'invitations.create',
          key,
          requestHash: hashOf('typed'),
        })
      )
      const found = await withOrganization(handle.db, a, (tx) => tx.select().from(idempotencyKeys))
      const row = found.find((r) => r.key === key)
      expect(row?.status).toBeNull()
      expect(row?.response).toBeNull()
      expect(Buffer.from(row?.requestHash ?? []).equals(hashOf('typed'))).toBe(true)
      const other = await withOrganization(handle.db, b, (tx) => tx.select().from(idempotencyKeys))
      expect(other.find((r) => r.key === key)).toBeUndefined()
    })

    test('closeline_core may select, insert, update and delete; no other service role may do anything', async () => {
      const privilege = async (role: string, what: string) =>
        (
          await owner.query<{ ok: boolean }>('select has_table_privilege($1, $2, $3) as ok', [
            role,
            TABLE,
            what,
          ])
        ).rows[0]?.ok
      for (const what of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        expect([what, await privilege('closeline_core', what)]).toEqual([what, true])
      }
      for (const what of ['TRUNCATE', 'REFERENCES', 'TRIGGER']) {
        expect([what, await privilege('closeline_core', what)]).toEqual([what, false])
      }
      for (const role of ['closeline_auth', 'closeline_playbook', 'public']) {
        for (const what of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) {
          expect([role, what, await privilege(role, what)]).toEqual([role, what, false])
        }
      }
    })

    test.each([
      ['closeline_auth', () => auth],
      ['closeline_playbook', () => playbook],
    ])('%s is refused', async (_role, pool) => {
      const refused = await failure(scoped(pool(), a, (c) => c.query(`select * from ${TABLE}`)))
      expect(refused.message).toContain('permission denied for schema core')
    })

    test('it needs no allowlist entry: the catalog check passes, and fails when the policy is dropped', async () => {
      expect(NON_TENANT_TABLES).not.toContain(TABLE)
      expect(await findTenantIsolationGaps(handle.db)).toEqual([])
      await assertTenantIsolation(handle.db)
      const statements = tenantRlsStatements('core', 'idempotency_keys')
      const policy = statements[2] ?? ''
      try {
        await owner.query(
          'drop policy "idempotency_keys_tenant_isolation" on core.idempotency_keys'
        )
        const gaps = (await findTenantIsolationGaps(handle.db)).filter(
          (gap) => gap.table === 'idempotency_keys'
        )
        expect(gaps.length).toBe(1)
        const failed = await assertTenantIsolation(handle.db).catch((error: Error) => error)
        expect(failed).toBeInstanceOf(Error)
        expect((failed as Error).message).toContain(TABLE)
      } finally {
        await owner.query(policy).catch(() => undefined)
      }
      expect(await findTenantIsolationGaps(handle.db)).toEqual([])
    })
  })

  describe('the key is unique per Organization, user, route and key', () => {
    let a: string
    let b: string

    beforeAll(async () => {
      a = await createOrg()
      b = await createOrg()
    })

    test('the same key cannot be inserted twice, in flight or completed', async () => {
      const key = freshKey()
      await put({ orgId: a, key })
      const again = await failure(put({ orgId: a, key, hash: hashOf('other body') }))
      expect([again.code, again.constraint]).toEqual(['23505', 'idempotency_keys_pkey'])
      const done = freshKey()
      await put({ orgId: a, key: done, status: 200, response: {} })
      const twice = await failure(put({ orgId: a, key: done, status: 200, response: {} }))
      expect(twice.constraint).toBe('idempotency_keys_pkey')
    })

    test('the same key under another Organization, user or route is a different row', async () => {
      const key = freshKey()
      await put({ orgId: a, key })
      await put({ orgId: b, key })
      await put({ orgId: a, key, userId: 'usr_00000000000000000000000000000002' })
      await put({ orgId: a, key, route: 'invitations.revoke' })
      expect(await count(a, 'key = $1', [key])).toBe(3)
      expect(await count(b, 'key = $1', [key])).toBe(1)
    })

    test('the primary key is (organization_id, user_id, route, key), in that order', async () => {
      const columns = await owner.query<{ column_name: string }>(
        `select a.attname as column_name
           from pg_index i
           join pg_class c on c.oid = i.indrelid and c.relname = 'idempotency_keys'
           join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'core'
           cross join lateral unnest(i.indkey) with ordinality as k(attnum, ord)
           join pg_attribute a on a.attrelid = c.oid and a.attnum = k.attnum
          where i.indisprimary order by k.ord`
      )
      expect(columns.rows.map((r) => r.column_name)).toEqual([
        'organization_id',
        'user_id',
        'route',
        'key',
      ])
    })
  })

  describe('every check rejects its bad values', () => {
    let a: string

    beforeAll(async () => {
      a = await createOrg()
    })

    const cases: [string, Partial<Row>, string][] = [
      ['route: empty', { route: '' }, 'idempotency_keys_route_shape'],
      ['route: 65 characters', { route: 'a'.repeat(65) }, 'idempotency_keys_route_shape'],
      ['route: upper case', { route: 'Invitations.create' }, 'idempotency_keys_route_shape'],
      ['route: a space', { route: 'invitations create' }, 'idempotency_keys_route_shape'],
      ['route: a hyphen', { route: 'invitations-create' }, 'idempotency_keys_route_shape'],
      ['route: non-ASCII', { route: 'invitaciónes.create' }, 'idempotency_keys_route_shape'],
      [
        'route: a trailing newline',
        { route: 'invitations.create\n' },
        'idempotency_keys_route_shape',
      ],
      ['key: empty', { key: '' }, 'idempotency_keys_key_shape'],
      ['key: 256 characters', { key: 'k'.repeat(256) }, 'idempotency_keys_key_shape'],
      ['key: non-ASCII', { key: 'clé-123' }, 'idempotency_keys_key_shape'],
      ['key: a space', { key: 'key 1' }, 'idempotency_keys_key_shape'],
      ['key: a control character', { key: 'key\u0001' }, 'idempotency_keys_key_shape'],
      ['key: a newline', { key: 'key\n1' }, 'idempotency_keys_key_shape'],
      ['key: a trailing newline', { key: 'key-1\n' }, 'idempotency_keys_key_shape'],
      ['hash: empty', { hash: Buffer.alloc(0) }, 'idempotency_keys_request_hash_length'],
      ['hash: 31 bytes', { hash: Buffer.alloc(31, 1) }, 'idempotency_keys_request_hash_length'],
      ['hash: 33 bytes', { hash: Buffer.alloc(33, 1) }, 'idempotency_keys_request_hash_length'],
      ['status: 99', { status: 99, response: {} }, 'idempotency_keys_status_range'],
      ['status: 600', { status: 600, response: {} }, 'idempotency_keys_status_range'],
      ['status: 0', { status: 0, response: {} }, 'idempotency_keys_status_range'],
      ['status: negative', { status: -200, response: {} }, 'idempotency_keys_status_range'],
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
        'a very large response that compresses well',
        { status: 200, response: { body: 'x'.repeat(2_000_000) } },
        'idempotency_keys_response_size',
      ],
      [
        'a user id that is not a usr_ id',
        { userId: 'not-a-user' },
        'idempotency_keys_user_id_shape',
      ],
    ]

    test.each(cases)('%s', async (_name, values, constraint) => {
      const refused = await failure(put({ orgId: a, key: freshKey(), ...values }))
      expect([refused.code, refused.constraint]).toEqual(['23514', constraint])
    })

    test('an Organization id that is not an org_ id is refused', async () => {
      const refused = await failure(
        scoped(core, 'not-an-org', (c) => c.query(...insertOf({ orgId: 'not-an-org' })))
      )
      expect(refused.code).toBe('23514')
    })

    test('an Organization that does not exist is refused by the foreign key', async () => {
      const ghost = newId('org')
      const refused = await failure(put({ orgId: ghost }))
      expect(refused.code).toBe('23503')
    })

    test('the largest response that fits is accepted and one byte more is not', async () => {
      // The size of a jsonb string is its length plus a fixed overhead; measure the overhead.
      const probe = await owner.query<{ size: number }>(
        "select pg_column_size(to_jsonb(repeat('a', 1000))) as size"
      )
      const overhead = (probe.rows[0]?.size ?? 0) - 1000
      const fits = 16_384 - overhead
      await put({ orgId: a, key: freshKey(), status: 200, response: 'a'.repeat(fits) })
      const refused = await failure(
        put({ orgId: a, key: freshKey(), status: 200, response: 'a'.repeat(fits + 1) })
      )
      expect(refused.constraint).toBe('idempotency_keys_response_size')
    })

    test.each([
      ['a status of 100', 100],
      ['a status of 599', 599],
    ])('%s is accepted', async (_name, status) => {
      await put({ orgId: a, key: freshKey(), status, response: { ok: true } })
    })

    test('a key of 255 printable characters and a route of 64 are accepted', async () => {
      await put({ orgId: a, key: '~'.repeat(255), route: 'a0._'.repeat(16) })
    })

    test('a JSON null is a response: it goes with a status', async () => {
      const key = freshKey()
      await scoped(core, a, (c) =>
        c.query(
          `insert into ${TABLE} (organization_id, user_id, route, key, request_hash, status, response)
           values ($1, 'usr_00000000000000000000000000000001', 'r', $2, $3, 204, 'null'::jsonb)`,
          [a, key, hashOf('x')]
        )
      )
      expect(await count(a, 'key = $1 and response is not null', [key])).toBe(1)
    })
  })

  describe('a row is completed once and its identity never changes', () => {
    let a: string

    beforeAll(async () => {
      a = await createOrg()
    })

    test('an in-flight row can be completed exactly once', async () => {
      const key = freshKey()
      await put({ orgId: a, key })
      const complete = (status: number, body: unknown) =>
        scoped(core, a, (c) =>
          c.query(`update ${TABLE} set status = $2, response = $3 where key = $1`, [
            key,
            status,
            JSON.stringify(body),
          ])
        )
      expect((await complete(201, { id: 'inv_1' })).rowCount).toBe(1)
      const again = await failure(complete(500, { error: 'x' }))
      expect(again.message).toContain('core.idempotency_final')
      const same = await failure(complete(201, { id: 'inv_1' }))
      expect(same.message).toContain('core.idempotency_final')
      const row = await scoped(
        owner,
        a,
        async (c) =>
          (await c.query(`select status, response from ${TABLE} where key = $1`, [key])).rows[0]
      )
      expect(row).toEqual({ status: 201, response: { id: 'inv_1' } })
    })

    test.each([
      ['status', 'status = 500'],
      ['response', `response = '{"changed":true}'`],
      ['status and response', `status = 500, response = '{}'`],
      ['both back to null', 'status = null, response = null'],
      ['the request hash', `request_hash = '\\x${'11'.repeat(32)}'`],
      ['the route', `route = 'other.route'`],
      ['the key', `key = 'other-key'`],
      ['the user', `user_id = 'usr_000000000000000000000000000000ff'`],
      ['created_at', `created_at = now() - interval '1 year'`],
      ['updated with its own values', 'status = status'],
    ])('a completed row refuses a change to %s', async (_name, set) => {
      const key = freshKey()
      await put({ orgId: a, key, status: 200, response: { id: 'inv_1' } })
      const refused = await failure(
        scoped(core, a, (c) => c.query(`update ${TABLE} set ${set} where key = $1`, [key]))
      )
      expect(refused.message).toContain('core.idempotency_final')
      const row = await scoped(
        owner,
        a,
        async (c) =>
          (await c.query(`select status, response from ${TABLE} where key = $1`, [key])).rows[0]
      )
      expect(row).toEqual({ status: 200, response: { id: 'inv_1' } })
    })

    test.each([
      ['the request hash', `request_hash = '\\x${'11'.repeat(32)}'`],
      ['the route', `route = 'other.route'`],
      ['the key', `key = 'other-key'`],
      ['the user', `user_id = 'usr_000000000000000000000000000000ff'`],
      ['created_at', `created_at = now() - interval '1 year'`],
    ])('an in-flight row refuses a change to %s', async (_name, set) => {
      const key = freshKey()
      await put({ orgId: a, key })
      const refused = await failure(
        scoped(core, a, (c) => c.query(`update ${TABLE} set ${set} where key = $1`, [key]))
      )
      expect(refused.message).toContain('core.idempotency_final')
    })

    test('an Organization cannot be moved: the row stays with the Organization that made it', async () => {
      const key = freshKey()
      const other = await createOrg()
      await put({ orgId: a, key })
      const refused = await failure(
        scoped(core, a, (c) =>
          c.query(`update ${TABLE} set organization_id = $2 where key = $1`, [key, other])
        )
      )
      expect(refused.message).toMatch(/row-level security|core\.idempotency_final/)
      expect(await count(other, 'key = $1', [key])).toBe(0)
    })

    test('the row can still be removed, in flight or completed, so a purge can reach it', async () => {
      const [done, flying] = [freshKey(), freshKey()]
      await put({ orgId: a, key: done, status: 200, response: {} })
      await put({ orgId: a, key: flying })
      const removed = await scoped(core, a, (c) =>
        c.query(`delete from ${TABLE} where key = any($1)`, [[done, flying]])
      )
      expect(removed.rowCount).toBe(2)
    })

    test('two completions of one in-flight row race: the one that waited finds it completed and writes nothing', async () => {
      const key = freshKey()
      await put({ orgId: a, key })
      const run = (c: PoolClient, status: number, body: string) =>
        c.query(
          `update ${TABLE} set status = $1, response = $2 where organization_id = $3 and key = $4 and status is null`,
          [status, body, a, key]
        )
      const c1 = await core.connect()
      const c2 = await core.connect()
      try {
        for (const c of [c1, c2]) {
          await c.query('begin')
          await c.query('select set_config($1, $2, true)', [SETTING, a])
        }
        const pid = (await c2.query<{ pid: number }>('select pg_backend_pid() as pid')).rows[0]?.pid
        expect((await run(c1, 200, '{"winner":1}')).rowCount).toBe(1)
        const waiting = run(c2, 500, '{"winner":2}')
        for (let i = 0; i < 100; i++) {
          const blocked = await owner.query(
            'select 1 from pg_locks where pid = $1 and not granted',
            [pid]
          )
          if (blocked.rowCount) {
            break
          }
          await new Promise((resolve) => setTimeout(resolve, 20))
        }
        await c1.query('commit')
        expect((await waiting).rowCount).toBe(0)
        await c2.query('commit')
      } finally {
        await c1.query('rollback').catch(() => undefined)
        await c2.query('rollback').catch(() => undefined)
        c1.release()
        c2.release()
      }
      const row = await scoped(
        owner,
        a,
        async (c) =>
          (await c.query(`select status, response from ${TABLE} where key = $1`, [key])).rows[0]
      )
      expect(row).toEqual({ status: 200, response: { winner: 1 } })
    })
  })

  describe('deleting the Organization removes its rows', () => {
    test('every row goes with its Organization, and another Organization keeps its own', async () => {
      const gone = await createOrg()
      const kept = await createOrg()
      for (const orgId of [gone, kept]) {
        await put({ orgId, key: freshKey() })
        await put({ orgId, key: freshKey(), status: 200, response: { ok: true } })
      }
      await inOrg(gone, (c) =>
        c.query('delete from core.organizations where organization_id = $1', [gone])
      )
      // Row-level security binds the owner too, so count per Organization.
      expect(await count(gone)).toBe(0)
      expect(await count(kept)).toBe(2)
    })
  })
})
