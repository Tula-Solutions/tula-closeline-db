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
const INSUFFICIENT_PRIVILEGE = '42501'
const FEATURE_NOT_SUPPORTED = '0A000'

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`

const TABLES = [
  'linkedin_accounts',
  'linkedin_risk_acceptances',
  'linkedin_channel_settings',
  'linkedin_usage',
]

describe('outbound LinkedIn tables', () => {
  let outbound: Pool
  let owner: Pool
  let handle: DbHandle
  const orgs: string[] = []

  /** Run `fn` in one transaction scoped to `orgId` (or to none), as the outbound role. */
  async function scoped<T>(
    orgId: string | null,
    fn: (c: PoolClient) => Promise<T>,
    pool: Pool = outbound
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
      Number((await c.query(`select count(*) as n from outbound.${table}`)).rows[0].n)
    )

  const newOrg = (): string => {
    const orgId = newId('org')
    orgs.push(orgId)
    return orgId
  }

  const addAccount = async (orgId: string, membershipId = newId('mem'), status = 'connected') => {
    const id = newId('lia')
    await run(
      orgId,
      `insert into outbound.linkedin_accounts (id, organization_id, membership_id, provider_account_id, status)
       values ($1, $2, $3, 'prov-1', $4)`,
      [id, orgId, membershipId, status]
    )
    return id
  }

  const addAcceptance = async (orgId: string, name = 'Ada Lovelace') => {
    const id = newId('lra')
    await run(
      orgId,
      `insert into outbound.linkedin_risk_acceptances (id, organization_id, wording_version, accepted_by_membership_id, typed_full_name)
       values ($1, $2, '2026-10-1', $3, $4)`,
      [id, orgId, newId('mem'), name]
    )
    return id
  }

  const addUsage = (orgId: string, accountId: string, day = '2026-10-28', counts = [1, 1]) =>
    run(
      orgId,
      `insert into outbound.linkedin_usage (organization_id, account_id, day, connections, messages)
       values ($1, $2, $3, $4, $5)`,
      [orgId, accountId, day, counts[0], counts[1]]
    )

  /** Create an Organization with one row in every LinkedIn table. */
  async function seed() {
    const orgId = newOrg()
    const accountId = await addAccount(orgId)
    const acceptanceId = await addAcceptance(orgId)
    await run(
      orgId,
      'insert into outbound.linkedin_channel_settings (organization_id, enabled) values ($1, true)',
      [orgId]
    )
    await addUsage(orgId, accountId)
    return { orgId, accountId, acceptanceId }
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    outbound = new Pool({ connectionString: env.outbound, max: 6 })
    owner = new Pool({ connectionString: env.owner, max: 2 })
    handle = createDb(env.outbound, { max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      // Accounts take their usage along; acceptances and settings go by Organization.
      for (const table of [
        'linkedin_accounts',
        'linkedin_risk_acceptances',
        'linkedin_channel_settings',
      ]) {
        await scoped(orgId, (c) => c.query(`delete from outbound.${table}`), owner)
      }
    }
    await dropStaleTestObjects(owner, env.owner)
    await handle.close()
    await Promise.all([owner.end(), outbound.end()])
  })

  test('every table of the schema passes the tenant isolation check', async () => {
    expect(await findTenantIsolationGaps(handle.db)).toEqual([])
  })

  describe.each(TABLES)('%s', (table) => {
    test('a second Organization reads nothing of the first, and no scope sees nothing', async () => {
      const a = await seed()
      const b = await seed()
      expect(await countOf(a.orgId, table)).toBe(1)
      expect(await countOf(null, table)).toBe(0)
      const read = await run(
        b.orgId,
        `select 1 from outbound.${table} where organization_id = $1`,
        [a.orgId]
      )
      expect(read.rowCount).toBe(0)
    })
  })

  test('a second Organization cannot insert rows for the first or spend its usage', async () => {
    const a = await seed()
    const b = await seed()
    const error = await refusal(
      run(
        b.orgId,
        `insert into outbound.linkedin_usage (organization_id, account_id, day) values ($1, $2, '2026-09-01')`,
        [a.orgId, a.accountId]
      )
    )
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
    // Naming the first Organization's account from the second is refused by the composite key.
    const foreign = await refusal(addUsage(b.orgId, a.accountId, '2026-09-02'))
    expect(foreign.code).toBe(FOREIGN_KEY_VIOLATION)
    const bump = await run(
      b.orgId,
      'update outbound.linkedin_usage set connections = connections + 1 where account_id = $1',
      [a.accountId]
    )
    expect(bump.rowCount).toBe(0)
  })

  describe('linkedin_accounts', () => {
    test('one account per Rep per Organization; another Organization may have its own', async () => {
      const orgId = newOrg()
      const rep = newId('mem')
      await addAccount(orgId, rep)
      expect((await refusal(addAccount(orgId, rep))).code).toBe(UNIQUE_VIOLATION)
      await addAccount(orgId)
      await addAccount(newOrg(), rep)
    })

    test('status, pause reason and limits are checked', async () => {
      const orgId = newOrg()
      expect((await refusal(addAccount(orgId, newId('mem'), 'weird'))).code).toBe(CHECK_VIOLATION)
      const id = await addAccount(orgId)
      const update = (set: string) =>
        run(orgId, `update outbound.linkedin_accounts set ${set} where id = $1`, [id])
      expect((await refusal(update("pause_reason = 'admin'"))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(update("status = 'paused', pause_reason = 'bad'"))).code).toBe(
        CHECK_VIOLATION
      )
      await update("status = 'paused', pause_reason = 'admin'")
      expect((await refusal(update('daily_connection_limit = 21'))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(update('daily_message_limit = 41'))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(update('weekly_connection_limit = 81'))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(update('daily_connection_limit = -1'))).code).toBe(CHECK_VIOLATION)
      await update(
        'daily_connection_limit = 5, daily_message_limit = 0, weekly_connection_limit = 80'
      )
    })

    test('the service role cannot remove an account', async () => {
      const a = await seed()
      const error = await refusal(run(a.orgId, 'delete from outbound.linkedin_accounts'))
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
    })
  })

  describe('linkedin_risk_acceptances', () => {
    const setRevoked = (orgId: string, id: string) =>
      run(orgId, 'update outbound.linkedin_risk_acceptances set revoked_at = now() where id = $1', [
        id,
      ])

    test('the only change an acceptance accepts is the revoked time, once', async () => {
      const a = await seed()
      for (const set of [
        "typed_full_name = 'Someone Else'",
        "wording_version = '2026-10-2'",
        "accepted_at = now() - interval '1 day'",
        `accepted_by_membership_id = '${newId('mem')}'`,
        // Changing a field together with the revoke fails too.
        "revoked_at = now(), typed_full_name = 'Nope Nope'",
      ]) {
        const error = await refusal(
          run(a.orgId, `update outbound.linkedin_risk_acceptances set ${set} where id = $1`, [
            a.acceptanceId,
          ])
        )
        expect(error.code).toBe(CHECK_VIOLATION)
      }
      expect((await setRevoked(a.orgId, a.acceptanceId)).rowCount).toBe(1)
      expect((await refusal(setRevoked(a.orgId, a.acceptanceId))).code).toBe(CHECK_VIOLATION)
      const clear = await refusal(
        run(
          a.orgId,
          'update outbound.linkedin_risk_acceptances set revoked_at = null where id = $1',
          [a.acceptanceId]
        )
      )
      expect(clear.code).toBe(CHECK_VIOLATION)
    })

    test('it cannot be removed by the service role or truncated by anyone', async () => {
      const a = await seed()
      expect(
        (await refusal(run(a.orgId, 'delete from outbound.linkedin_risk_acceptances'))).code
      ).toBe(INSUFFICIENT_PRIVILEGE)
      const truncate = await refusal(
        scoped(a.orgId, (c) => c.query('truncate outbound.linkedin_risk_acceptances'), owner)
      )
      expect(truncate.code).toBe(FEATURE_NOT_SUPPORTED)
      expect(await countOf(a.orgId, 'linkedin_risk_acceptances')).toBe(1)
    })

    test('the typed name has a length and no control characters', async () => {
      const orgId = newOrg()
      expect((await refusal(addAcceptance(orgId, 'A'))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addAcceptance(orgId, 'A'.repeat(201)))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addAcceptance(orgId, 'Ada\nLovelace'))).code).toBe(CHECK_VIOLATION)
    })

    test('a revoke cannot precede the acceptance', async () => {
      const a = await seed()
      const error = await refusal(
        run(
          a.orgId,
          "update outbound.linkedin_risk_acceptances set revoked_at = accepted_at - interval '1 second' where id = $1",
          [a.acceptanceId]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })
  })

  describe('linkedin_channel_settings', () => {
    test('one row per Organization', async () => {
      const a = await seed()
      const error = await refusal(
        run(
          a.orgId,
          'insert into outbound.linkedin_channel_settings (organization_id) values ($1)',
          [a.orgId]
        )
      )
      expect(error.code).toBe(UNIQUE_VIOLATION)
    })
  })

  describe('linkedin_usage', () => {
    test('one row per account and day', async () => {
      const a = await seed()
      expect((await refusal(addUsage(a.orgId, a.accountId))).code).toBe(UNIQUE_VIOLATION)
      await addUsage(a.orgId, a.accountId, '2026-10-29')
    })

    test('counters cannot go negative, by insert or by update', async () => {
      const a = await seed()
      expect((await refusal(addUsage(a.orgId, a.accountId, '2026-10-30', [-1, 0]))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(addUsage(a.orgId, a.accountId, '2026-10-30', [0, -1]))).code).toBe(
        CHECK_VIOLATION
      )
      const error = await refusal(
        run(
          a.orgId,
          'update outbound.linkedin_usage set connections = connections - 2 where account_id = $1',
          [a.accountId]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })

    test('concurrent reservations by upsert add up', async () => {
      const a = await seed()
      await Promise.all(
        Array.from({ length: 8 }, () =>
          run(
            a.orgId,
            `insert into outbound.linkedin_usage (organization_id, account_id, day, connections)
             values ($1, $2, '2026-11-01', 1)
             on conflict (organization_id, account_id, day)
             do update set connections = outbound.linkedin_usage.connections + 1`,
            [a.orgId, a.accountId]
          )
        )
      )
      const row = await run(
        a.orgId,
        "select connections from outbound.linkedin_usage where day = '2026-11-01'"
      )
      expect(row.rows[0].connections).toBe(8)
    })

    test('removing the account takes its usage along', async () => {
      const a = await seed()
      await scoped(a.orgId, (c) => c.query('delete from outbound.linkedin_accounts'), owner)
      expect(await countOf(a.orgId, 'linkedin_usage')).toBe(0)
    })
  })
})
