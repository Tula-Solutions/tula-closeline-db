import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { CRM_CONNECTION_FOR_ACCOUNT } from './core-crm-statements'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const FUNCTION = 'core.crm_connection_for_account(text,text)'

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`

describe('core.crm_connection_for_account, the webhook lookup', () => {
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

  /** Delete an Organization (and, by cascade, its connections) in its own tenant scope. */
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

  /** Create an Organization with one connection; returns the ids. */
  async function seed(provider: string, accountId: string, state = 'connected') {
    const orgId = newId('org')
    const membershipId = newId('mem')
    const connectionId = newId('crn')
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
        `insert into core.crm_connection (id, organization_id, provider, external_account_id, state,
           needs_reconnect_since, access_token_sealed, refresh_token_sealed, token_key_id,
           connected_by_membership_id)
         values ($1, $2, $3, $4, $5::text, case when $5::text = 'needs_reconnect' then now() end,
           $6, $7, 'k1', $8)`,
        [
          connectionId,
          orgId,
          provider,
          accountId,
          state,
          Buffer.from('sealed-access'),
          Buffer.from('sealed-refresh'),
          membershipId,
        ]
      )
    })
    return { orgId, connectionId }
  }

  const lookup = async (provider: unknown, accountId: unknown) =>
    (await core.query(CRM_CONNECTION_FOR_ACCOUNT, [provider, accountId])).rows

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

  test('finds the right Organization and connection among several, with no Organization set', async () => {
    const accountA = newId('acct')
    const accountB = newId('acct')
    const a = await seed('hubspot', accountA)
    const b = await seed('hubspot', accountB)
    expect(await lookup('hubspot', accountA)).toEqual([
      { organization_id: a.orgId, connection_id: a.connectionId },
    ])
    expect(await lookup('hubspot', accountB)).toEqual([
      { organization_id: b.orgId, connection_id: b.connectionId },
    ])
  })

  test('the answer does not depend on the Organization setting', async () => {
    const accountId = newId('acct')
    const a = await seed('hubspot', accountId)
    const other = await seed('hubspot', newId('acct'))
    const rows = await scoped(other.orgId, async (c) => {
      return (await c.query(CRM_CONNECTION_FOR_ACCOUNT, ['hubspot', accountId])).rows
    })
    expect(rows).toEqual([{ organization_id: a.orgId, connection_id: a.connectionId }])
  })

  test('an unknown account gives no row', async () => {
    await seed('hubspot', newId('acct'))
    expect(await lookup('hubspot', newId('acct'))).toEqual([])
  })

  test('the same external id under another provider is not confused', async () => {
    const accountId = newId('acct')
    const hub = await seed('hubspot', accountId)
    expect(await lookup('salesforce', accountId)).toEqual([])
    const sf = await seed('salesforce', accountId)
    expect(await lookup('hubspot', accountId)).toEqual([
      { organization_id: hub.orgId, connection_id: hub.connectionId },
    ])
    expect(await lookup('salesforce', accountId)).toEqual([
      { organization_id: sf.orgId, connection_id: sf.connectionId },
    ])
  })

  test('the account id is matched exactly, not by pattern or case', async () => {
    const accountId = `Acct_${randomBytes(6).toString('hex')}`
    await seed('hubspot', accountId)
    expect(await lookup('hubspot', accountId.toLowerCase())).toEqual([])
    expect(await lookup('hubspot', `${accountId.slice(0, 6)}%`)).toEqual([])
    expect(await lookup('hubspot', `${accountId}\n`)).toEqual([])
  })

  test('a disconnected connection gives no row, and a connection needing reconnect still routes', async () => {
    const gone = newId('acct')
    const stale = newId('acct')
    const g = await seed('hubspot', gone)
    const s = await seed('hubspot', stale, 'needs_reconnect')
    expect(await lookup('hubspot', gone)).toHaveLength(1)
    await scoped(g.orgId, (c) =>
      c.query('delete from core.crm_connection where organization_id = $1 and id = $2', [
        g.orgId,
        g.connectionId,
      ])
    )
    expect(await lookup('hubspot', gone)).toEqual([])
    expect(await lookup('hubspot', stale)).toEqual([
      { organization_id: s.orgId, connection_id: s.connectionId },
    ])
  })

  test('a deleted Organization gives no row', async () => {
    const accountId = newId('acct')
    const a = await seed('hubspot', accountId)
    await removeOrganization(a.orgId)
    expect(await lookup('hubspot', accountId)).toEqual([])
  })

  test.each([
    ['null provider', null, 'x'],
    ['null account', 'hubspot', null],
    ['empty account', 'hubspot', ''],
    ['unknown provider', 'pipedrive', 'x'],
    ['uppercase provider', 'HubSpot', 'x'],
    ['account over 128 characters', 'hubspot', 'a'.repeat(129)],
  ])('%s gives no row and raises nothing', async (_name, provider, accountId) => {
    expect(await lookup(provider, accountId)).toEqual([])
  })

  test('returns exactly the two routing columns, never a token or any other column', async () => {
    const accountId = newId('acct')
    await seed('hubspot', accountId)
    const result = await core.query(CRM_CONNECTION_FOR_ACCOUNT, ['hubspot', accountId])
    expect(result.fields.map((f) => f.name)).toEqual(['organization_id', 'connection_id'])
    const declared = await owner.query(
      `select pg_get_function_result(to_regprocedure('${FUNCTION}')) as result`
    )
    expect(declared.rows[0].result).toBe('TABLE(organization_id text, connection_id text)')
    expect(JSON.stringify(result.rows)).not.toMatch(/sealed|token/i)
  })

  test('closeline_core can execute it but cannot read crm_connection without an Organization', async () => {
    const accountId = newId('acct')
    await seed('hubspot', accountId)
    expect(await lookup('hubspot', accountId)).toHaveLength(1)
    expect((await core.query('select id from core.crm_connection')).rows).toEqual([])
    const other = await seed('hubspot', newId('acct'))
    const visible = await scoped(other.orgId, async (c) =>
      (await c.query('select id from core.crm_connection')).rows.map((r) => r.id)
    )
    expect(visible).toEqual([other.connectionId])
  })

  test('is a fixed-path definer owned by a narrow NOLOGIN BYPASSRLS role, executable by core alone', async () => {
    const fn = await owner.query(
      `select p.proowner::regrole::text as owner, p.prosecdef, p.provolatile, p.proretset,
              p.proconfig
         from pg_proc p where p.oid = to_regprocedure('${FUNCTION}')`
    )
    expect(fn.rows).toHaveLength(1)
    const row = fn.rows[0]
    expect(row.owner).toBe('closeline_core_crm_lookup')
    expect(row.prosecdef).toBe(true)
    expect(row.provolatile).toBe('s')
    expect(row.proretset).toBe(true)
    expect(row.proconfig).toContain('search_path=pg_catalog, core, pg_temp')
    const execute = await owner.query(
      `select r.rolname,
              has_function_privilege(r.oid, to_regprocedure('${FUNCTION}'), 'EXECUTE') as can
         from pg_roles r where r.rolname like 'closeline\\_%' order by r.rolname`
    )
    expect(
      execute.rows
        .filter((r) => r.can)
        .map((r) => r.rolname)
        .filter((r) => !['closeline_owner', 'closeline_core_crm_lookup'].includes(r))
    ).toEqual(['closeline_core'])
    const publicCan = await owner.query(
      `select exists (
         select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
          where p.oid = to_regprocedure('${FUNCTION}') and a.grantee = 0) as public_can`
    )
    expect(publicCan.rows[0].public_can).toBe(false)
  })
})
