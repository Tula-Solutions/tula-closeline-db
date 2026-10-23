import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash, randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { API_KEY_FOR_HASH } from './core-key-statements'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const FUNCTION = 'core.api_key_for_hash(text)'

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`
const newHash = (): string => createHash('sha256').update(randomBytes(32)).digest('hex')

describe('core.api_key_for_hash, the API key exchange lookup', () => {
  let owner: Pool
  let core: Pool
  const orgs: string[] = []

  /** Run `fn` in one transaction, as the core role, scoped to `orgId` when given. */
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

  /** Remove an Organization (and, by cascade, its keys) in its own tenant scope. */
  async function removeOrganization(orgId: string): Promise<void> {
    const c = await owner.connect()
    try {
      await c.query('begin')
      await c.query('select set_config($1, $2, true)', [SETTING, orgId])
      await c.query('delete from core.organizations where organization_id = $1', [orgId])
      await c.query('commit')
    } catch (error) {
      await c.query('rollback').catch(() => undefined)
      throw error
    } finally {
      c.release()
    }
  }

  interface SeedOptions {
    hash?: string
    scopes?: string[]
    expiresAt?: string | null
    revoked?: boolean
  }

  /** Create an Organization with one API key; returns the ids and the hash. */
  async function seed(options: SeedOptions = {}) {
    const orgId = newId('org')
    const membershipId = newId('mem')
    const keyId = newId('akey')
    const hash = options.hash ?? newHash()
    const scopes = options.scopes ?? ['prospects:read']
    orgs.push(orgId)
    await scoped(orgId, async (c) => {
      await c.query(
        'insert into core.organizations (organization_id, name, region) values ($1, $2, $3)',
        [orgId, 'Org', 'us']
      )
      await c.query(
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, 'owner', 'o@example.test')",
        [membershipId, orgId, newId('usr')]
      )
      await c.query(
        `insert into core.api_keys (id, organization_id, name, prefix, secret_hash, scopes,
           role_ceiling, expires_at, revoked_at, created_by_membership_id)
         values ($1, $2, 'Key', $3, $4, $5, 'admin', $6::timestamptz,
           case when $7::boolean then now() end, $8)`,
        [
          keyId,
          orgId,
          `clk_${randomBytes(4).toString('hex')}`,
          hash,
          scopes,
          options.expiresAt ?? null,
          options.revoked ?? false,
          membershipId,
        ]
      )
    })
    return { orgId, keyId, hash, scopes }
  }

  const lookup = async (hash: unknown) => (await core.query(API_KEY_FOR_HASH, [hash])).rows

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    core = new Pool({ connectionString: env.core, max: 4 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      await removeOrganization(orgId)
    }
    await dropStaleTestObjects(owner, env.owner)
    await Promise.all([owner.end(), core.end()])
  })

  test('finds the right key among several with no Organization set', async () => {
    const a = await seed({ scopes: ['prospects:read', 'calls:write'] })
    const b = await seed()
    expect(await lookup(a.hash)).toEqual([
      {
        organization_id: a.orgId,
        key_id: a.keyId,
        scopes: ['prospects:read', 'calls:write'],
        revoked_at: null,
        expires_at: null,
      },
    ])
    expect((await lookup(b.hash)).map((r) => r.key_id)).toEqual([b.keyId])
  })

  test('the answer does not depend on the Organization setting', async () => {
    const a = await seed()
    const other = await seed()
    const rows = await scoped(other.orgId, async (c) => {
      return (await c.query(API_KEY_FOR_HASH, [a.hash])).rows
    })
    expect(rows.map((r) => r.organization_id)).toEqual([a.orgId])
  })

  test('reports a revoked key and an expiry, and leaves refusing them to the caller', async () => {
    const revoked = await seed({ revoked: true })
    const expiring = await seed({ expiresAt: '2099-01-01T00:00:00Z' })
    const [revokedRow] = await lookup(revoked.hash)
    expect(revokedRow.revoked_at).toBeInstanceOf(Date)
    expect(revokedRow.expires_at).toBeNull()
    const [expiringRow] = await lookup(expiring.hash)
    expect(expiringRow.revoked_at).toBeNull()
    expect(expiringRow.expires_at).toEqual(new Date('2099-01-01T00:00:00Z'))
  })

  test('an unknown hash gives no row', async () => {
    await seed()
    expect(await lookup(newHash())).toEqual([])
  })

  test('an Organization that is gone gives no row', async () => {
    const a = await seed()
    await removeOrganization(a.orgId)
    expect(await lookup(a.hash)).toEqual([])
  })

  test.each([
    ['null', null],
    ['empty', ''],
    ['63 hex characters', 'a'.repeat(63)],
    ['65 hex characters', 'a'.repeat(65)],
    ['non-hex characters', 'g'.repeat(64)],
    ['a LIKE pattern', `${'a'.repeat(63)}%`],
    ['a wildcard', '%'],
    ['an underscore pattern', '_'.repeat(64)],
    ['a trailing newline', `${'a'.repeat(64)}\n`],
    ['a long string', 'a'.repeat(10_000)],
  ])('%s gives no row and raises nothing', async (_name, hash) => {
    await seed()
    expect(await lookup(hash)).toEqual([])
  })

  test('the hash is matched exactly: uppercase and prefixes find nothing', async () => {
    const a = await seed({ hash: `abcdef${newHash().slice(6)}` })
    expect(await lookup(a.hash.toUpperCase())).toEqual([])
    expect(await lookup(a.hash.slice(0, 63))).toEqual([])
    expect(await lookup(a.hash)).toHaveLength(1)
  })

  test('returns exactly the five columns, never the hash, name, prefix or role ceiling', async () => {
    const a = await seed()
    const result = await core.query(API_KEY_FOR_HASH, [a.hash])
    expect(result.fields.map((f) => f.name)).toEqual([
      'organization_id',
      'key_id',
      'scopes',
      'revoked_at',
      'expires_at',
    ])
    const declared = await owner.query(
      `select pg_get_function_result(to_regprocedure('${FUNCTION}')) as result`
    )
    expect(declared.rows[0].result).toBe(
      'TABLE(organization_id text, key_id text, scopes text[], revoked_at timestamp with time zone, expires_at timestamp with time zone)'
    )
    expect(JSON.stringify(result.rows)).not.toContain(a.hash)
  })

  test('closeline_core still cannot read api_keys without an Organization', async () => {
    const a = await seed()
    expect(await lookup(a.hash)).toHaveLength(1)
    expect((await core.query('select id from core.api_keys')).rows).toEqual([])
    const other = await seed()
    const visible = await scoped(other.orgId, async (c) =>
      (await c.query('select id from core.api_keys')).rows.map((r) => r.id)
    )
    expect(visible).toEqual([other.keyId])
  })

  test('is a fixed-path definer owned by a narrow NOLOGIN BYPASSRLS role, executable by core alone', async () => {
    const fn = await owner.query(
      `select p.proowner::regrole::text as owner, p.prosecdef, p.provolatile, p.proretset,
              p.proconfig
         from pg_proc p where p.oid = to_regprocedure('${FUNCTION}')`
    )
    expect(fn.rows).toHaveLength(1)
    const row = fn.rows[0]
    expect(row.owner).toBe('closeline_core_key_lookup')
    expect(row.prosecdef).toBe(true)
    expect(row.provolatile).toBe('s')
    expect(row.proretset).toBe(true)
    expect(row.proconfig).toEqual(['search_path=pg_catalog, core, pg_temp'])
    const execute = await owner.query(
      `select r.rolname,
              has_function_privilege(r.oid, to_regprocedure('${FUNCTION}'), 'EXECUTE') as can
         from pg_roles r where r.rolname like 'closeline\\_%' order by r.rolname`
    )
    expect(
      execute.rows
        .filter((r) => r.can)
        .map((r) => r.rolname)
        .filter((r) => !['closeline_owner', 'closeline_core_key_lookup'].includes(r))
    ).toEqual(['closeline_core'])
    const publicCan = await owner.query(
      `select exists (
         select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
          where p.oid = to_regprocedure('${FUNCTION}') and a.grantee = 0) as public_can`
    )
    expect(publicCan.rows[0].public_can).toBe(false)
  })
})
