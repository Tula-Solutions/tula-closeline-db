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

interface Seeded {
  orgId: string
  membershipId: string
  connectionId: string
  runId: string
  accountId: string
}

/** One harmless update per table, used to prove a second Organization updates nothing. */
const UPDATES = {
  crm_connection: "account_label = 'x'",
  crm_mapping: "label = 'x'",
  crm_sync_run: "cursor = 'x'",
  crm_external_ref: "last_seen_version = 'x'",
  crm_webhook_receipt: "received_at = now() + interval '1 second'",
} as const

describe('core CRM tables', () => {
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

  const insertConnection = async (
    orgId: string,
    membershipId: string,
    values: { id?: string; provider?: string; accountId?: string } = {}
  ) => {
    const id = values.id ?? newId('crn')
    await run(
      orgId,
      `insert into core.crm_connection (id, organization_id, provider, external_account_id,
         access_token_sealed, refresh_token_sealed, token_key_id, connected_by_membership_id)
       values ($1, $2, $3, $4, $5, $6, 'k1', $7)`,
      [
        id,
        orgId,
        values.provider ?? 'hubspot',
        values.accountId ?? newId('acct'),
        Buffer.from('sealed-access'),
        Buffer.from('sealed-refresh'),
        membershipId,
      ]
    )
    return id
  }

  const insertRef = (orgId: string, connectionId: string, externalId: string, localId: string) =>
    run(
      orgId,
      `insert into core.crm_external_ref (id, organization_id, connection_id, provider, object_kind,
         external_id, local_id) values ($1, $2, $3, 'hubspot', 'contact', $4, $5)`,
      [newId('cxr'), orgId, connectionId, externalId, localId]
    )

  const insertReceipt = (orgId: string, connectionId: string, eventId: string) =>
    run(
      orgId,
      'insert into core.crm_webhook_receipt (organization_id, connection_id, event_id) values ($1, $2, $3)',
      [orgId, connectionId, eventId]
    )

  /** Create an Organization with a connection and one row in every CRM table. */
  async function seed(): Promise<Seeded> {
    const ids: Seeded = {
      orgId: newId('org'),
      membershipId: newId('mem'),
      connectionId: newId('crn'),
      runId: newId('crun'),
      accountId: newId('acct'),
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
    })
    await insertConnection(orgId, ids.membershipId, {
      id: ids.connectionId,
      accountId: ids.accountId,
    })
    await run(
      orgId,
      `insert into core.crm_mapping (organization_id, connection_id, kind, key, outcome, label)
       values ($1, $2, 'stage', 'closedwon', 'won', 'Closed won')`,
      [orgId, ids.connectionId]
    )
    await run(
      orgId,
      `insert into core.crm_sync_run (id, organization_id, connection_id, object_kind, trigger)
       values ($1, $2, $3, 'deal', 'manual')`,
      [ids.runId, orgId, ids.connectionId]
    )
    await insertRef(orgId, ids.connectionId, '501', 'prs_local')
    await insertReceipt(orgId, ids.connectionId, 'evt-1')
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
    const inserts = [
      [
        'crm_connection',
        `insert into core.crm_connection (id, organization_id, provider, external_account_id, connected_by_membership_id)
         values ($1, $2, 'salesforce', 'acct-x', $3)`,
        [newId('crn'), a.orgId, newId('mem')],
      ],
      [
        'crm_mapping',
        `insert into core.crm_mapping (organization_id, connection_id, kind, key, direction)
         values ($1, $2, 'field', 'contact.email', 'both')`,
        [a.orgId, a.connectionId],
      ],
      [
        'crm_sync_run',
        `insert into core.crm_sync_run (id, organization_id, connection_id, object_kind, trigger)
         values ($1, $2, $3, 'call', 'sweep')`,
        [newId('crun'), a.orgId, a.connectionId],
      ],
      [
        'crm_external_ref',
        `insert into core.crm_external_ref (id, organization_id, connection_id, provider, object_kind, external_id, local_id)
         values ($1, $2, $3, 'hubspot', 'deal', '900', 'deal_1')`,
        [newId('cxr'), a.orgId, a.connectionId],
      ],
      [
        'crm_webhook_receipt',
        'insert into core.crm_webhook_receipt (organization_id, connection_id, event_id) values ($1, $2, $3)',
        [a.orgId, a.connectionId, 'evt-9'],
      ],
    ] as const
    for (const [table, sql, values] of inserts) {
      const other = await refusal(run(b.orgId, sql, [...values]))
      expect([table, other.message.includes('row-level security')]).toEqual([table, true])
      const none = await refusal(run(null, sql, [...values]))
      expect([table, none.message.includes('row-level security')]).toEqual([table, true])
    }
  })

  test('a row cannot point at another Organization connection', async () => {
    const a = await seed()
    const b = await seed()
    const refused = await Promise.all([
      refusal(
        run(
          b.orgId,
          `insert into core.crm_sync_run (id, organization_id, connection_id, object_kind, trigger)
           values ($1, $2, $3, 'deal', 'manual')`,
          [newId('crun'), b.orgId, a.connectionId]
        )
      ),
      refusal(
        run(
          b.orgId,
          `insert into core.crm_mapping (organization_id, connection_id, kind, key, direction)
           values ($1, $2, 'field', 'contact.email', 'both')`,
          [b.orgId, a.connectionId]
        )
      ),
      refusal(insertRef(b.orgId, a.connectionId, '777', 'prs_x')),
      refusal(insertReceipt(b.orgId, a.connectionId, 'evt-z')),
    ])
    expect(refused.map((e) => e.code)).toEqual(Array(4).fill(FOREIGN_KEY_VIOLATION))
  })

  describe('connection uniqueness', () => {
    test('a second HubSpot connection in one Organization is refused', async () => {
      const a = await seed()
      const refused = await refusal(insertConnection(a.orgId, a.membershipId))
      expect(refused.code).toBe(UNIQUE_VIOLATION)
      expect(refused.message).toContain('crm_connection_provider_key')
      expect(await countOf(a.orgId, 'crm_connection')).toBe(1)
    })

    test('the same Organization may connect the other provider, another may connect HubSpot', async () => {
      const a = await seed()
      const b = await seed()
      await insertConnection(a.orgId, a.membershipId, { provider: 'salesforce' })
      expect(await countOf(a.orgId, 'crm_connection')).toBe(2)
      expect(await countOf(b.orgId, 'crm_connection')).toBe(1)
    })

    test('an external account another Organization holds is refused', async () => {
      const a = await seed()
      const b = await seed()
      await run(b.orgId, 'delete from core.crm_connection where organization_id = $1', [b.orgId])
      const refused = await refusal(
        insertConnection(b.orgId, b.membershipId, { accountId: a.accountId })
      )
      expect(refused.code).toBe(UNIQUE_VIOLATION)
      expect(refused.message).toContain('crm_connection_account_key')
    })

    test('disconnecting removes the mapping, runs, references and receipts with the tokens', async () => {
      const a = await seed()
      await run(a.orgId, 'delete from core.crm_connection where organization_id = $1', [a.orgId])
      for (const table of Object.keys(UPDATES)) {
        expect([table, await countOf(a.orgId, table)]).toEqual([table, 0])
      }
    })

    test('sealed tokens need a key id', async () => {
      const a = await seed()
      const noKey = await refusal(
        run(
          a.orgId,
          'update core.crm_connection set token_key_id = null where organization_id = $1',
          [a.orgId]
        )
      )
      expect(noKey.code).toBe(CHECK_VIOLATION)
      const cleared = await run(
        a.orgId,
        `update core.crm_connection set access_token_sealed = null, refresh_token_sealed = null,
           token_key_id = null where organization_id = $1`,
        [a.orgId]
      )
      expect(cleared.rowCount).toBe(1)
    })

    test('needs_reconnect carries its time', async () => {
      const a = await seed()
      const bare = await refusal(
        run(
          a.orgId,
          "update core.crm_connection set state = 'needs_reconnect' where organization_id = $1",
          [a.orgId]
        )
      )
      expect(bare.code).toBe(CHECK_VIOLATION)
      const ok = await run(
        a.orgId,
        `update core.crm_connection set state = 'needs_reconnect', needs_reconnect_since = now()
          where organization_id = $1`,
        [a.orgId]
      )
      expect(ok.rowCount).toBe(1)
    })
  })

  describe('external references', () => {
    test('a duplicate external ref is refused', async () => {
      const a = await seed()
      const refused = await refusal(insertRef(a.orgId, a.connectionId, '501', 'prs_other'))
      expect(refused.code).toBe(UNIQUE_VIOLATION)
      expect(refused.message).toContain('crm_external_ref_object_key')
    })

    test('the same external id of another object kind or Organization is allowed', async () => {
      const a = await seed()
      const b = await seed()
      await run(
        a.orgId,
        `insert into core.crm_external_ref (id, organization_id, connection_id, provider, object_kind, external_id, local_id)
         values ($1, $2, $3, 'hubspot', 'company', '501', 'pco_1')`,
        [newId('cxr'), a.orgId, a.connectionId]
      )
      expect(await countOf(a.orgId, 'crm_external_ref')).toBe(2)
      expect(await countOf(b.orgId, 'crm_external_ref')).toBe(1)
    })

    test('the local lookup finds every CRM record of one local object', async () => {
      const a = await seed()
      await insertRef(a.orgId, a.connectionId, '502', 'prs_local')
      const found = await run(
        a.orgId,
        `select external_id from core.crm_external_ref
          where organization_id = $1 and provider = 'hubspot' and object_kind = 'contact'
            and local_id = $2 order by external_id`,
        [a.orgId, 'prs_local']
      )
      expect(found.rows.map((r) => r.external_id)).toEqual(['501', '502'])
    })

    test('a provider that differs from the connection is refused', async () => {
      const a = await seed()
      const refused = await refusal(
        run(
          a.orgId,
          `insert into core.crm_external_ref (id, organization_id, connection_id, provider, object_kind, external_id, local_id)
           values ($1, $2, $3, 'salesforce', 'deal', '1', 'deal_1')`,
          [newId('cxr'), a.orgId, a.connectionId]
        )
      )
      expect(refused.code).toBe(FOREIGN_KEY_VIOLATION)
    })

    test('a write recorded before its call is unique by key and needs that key', async () => {
      const a = await seed()
      const insert = () =>
        run(
          a.orgId,
          `insert into core.crm_external_ref (id, organization_id, connection_id, provider, object_kind, local_id, state, write_key)
           values ($1, $2, $3, 'hubspot', 'deal', 'deal_9', 'pending_write', 'deal_9:v3')`,
          [newId('cxr'), a.orgId, a.connectionId]
        )
      await insert()
      expect((await refusal(insert())).code).toBe(UNIQUE_VIOLATION)
      const noKey = await refusal(
        run(
          a.orgId,
          `insert into core.crm_external_ref (id, organization_id, connection_id, provider, object_kind, local_id, state)
           values ($1, $2, $3, 'hubspot', 'deal', 'deal_8', 'pending_write')`,
          [newId('cxr'), a.orgId, a.connectionId]
        )
      )
      const noExternal = await refusal(
        run(
          a.orgId,
          `insert into core.crm_external_ref (id, organization_id, connection_id, provider, object_kind, local_id)
           values ($1, $2, $3, 'hubspot', 'deal', 'deal_7')`,
          [newId('cxr'), a.orgId, a.connectionId]
        )
      )
      expect([noKey.code, noExternal.code]).toEqual([CHECK_VIOLATION, CHECK_VIOLATION])
    })
  })

  describe('webhook receipts', () => {
    test('a duplicate webhook receipt is refused', async () => {
      const a = await seed()
      const refused = await refusal(insertReceipt(a.orgId, a.connectionId, 'evt-1'))
      expect(refused.code).toBe(UNIQUE_VIOLATION)
      expect(refused.message).toContain('crm_webhook_receipt_pkey')
    })

    test('the same event id in another Organization is not a duplicate', async () => {
      const a = await seed()
      const b = await seed()
      expect(await countOf(a.orgId, 'crm_webhook_receipt')).toBe(1)
      expect(await countOf(b.orgId, 'crm_webhook_receipt')).toBe(1)
    })

    test('old receipts are pruned by age within an Organization', async () => {
      const a = await seed()
      await run(
        a.orgId,
        `insert into core.crm_webhook_receipt (organization_id, connection_id, event_id, received_at)
         values ($1, $2, 'evt-old', now() - interval '1 day')`,
        [a.orgId, a.connectionId]
      )
      const pruned = await run(
        a.orgId,
        `delete from core.crm_webhook_receipt
          where organization_id = $1 and received_at < now() - interval '1 hour'`,
        [a.orgId]
      )
      expect(pruned.rowCount).toBe(1)
      expect(await countOf(a.orgId, 'crm_webhook_receipt')).toBe(1)
    })
  })

  describe('mapping and runs', () => {
    test('a stage needs an outcome, a field a known key and a direction, notes never both ways', async () => {
      const a = await seed()
      const bad = (kind: string, key: string, outcome: string | null, direction: string | null) =>
        refusal(
          run(
            a.orgId,
            `insert into core.crm_mapping (organization_id, connection_id, kind, key, outcome, direction)
             values ($1, $2, $3, $4, $5, $6)`,
            [a.orgId, a.connectionId, kind, key, outcome, direction]
          )
        )
      const results = await Promise.all([
        bad('stage', 's1', null, null),
        bad('stage', 's2', 'won', 'both'),
        bad('field', 'contact.nickname', null, 'both'),
        bad('field', 'contact.email', null, null),
        bad('field', 'activity.notes', null, 'both'),
      ])
      expect(results.map((e) => e.code)).toEqual(Array(5).fill(CHECK_VIOLATION))
      const ok = await run(
        a.orgId,
        `insert into core.crm_mapping (organization_id, connection_id, kind, key, direction)
         values ($1, $2, 'field', 'activity.notes', 'write_only')`,
        [a.orgId, a.connectionId]
      )
      expect(ok.rowCount).toBe(1)
    })

    test('a stage appears once per connection', async () => {
      const a = await seed()
      const refused = await refusal(
        run(
          a.orgId,
          `insert into core.crm_mapping (organization_id, connection_id, kind, key, outcome)
           values ($1, $2, 'stage', 'closedwon', 'lost')`,
          [a.orgId, a.connectionId]
        )
      )
      expect(refused.code).toBe(UNIQUE_VIOLATION)
    })

    test('a run follows its lifecycle and only a failed run has an error code', async () => {
      const a = await seed()
      const set = (sql: string) =>
        run(a.orgId, `update core.crm_sync_run set ${sql} where organization_id = $1`, [a.orgId])
      const results = await Promise.all([
        refusal(set("state = 'running'")),
        refusal(set("state = 'completed'")),
        refusal(set("error_code = 'crm.rate_limited'")),
        refusal(set('created_count = -1')),
        refusal(set("failures = '{}'::jsonb")),
        refusal(set("failures = (select jsonb_agg('{}'::jsonb) from generate_series(1, 51))")),
      ])
      expect(results.map((e) => e.code)).toEqual(Array(6).fill(CHECK_VIOLATION))
      expect((await set("state = 'running', started_at = now()")).rowCount).toBe(1)
      expect(
        (await set("state = 'failed', completed_at = now(), error_code = 'crm.needs_reconnect'"))
          .rowCount
      ).toBe(1)
    })

    test('runs list newest first by a keyset on the index', async () => {
      const a = await seed()
      for (let i = 0; i < 3; i++) {
        await run(
          a.orgId,
          `insert into core.crm_sync_run (id, organization_id, connection_id, object_kind, trigger, requested_at)
           values ($1, $2, $3, 'deal', 'sweep', now() + ($4 || ' seconds')::interval)`,
          [newId('crun'), a.orgId, a.connectionId, String(i + 1)]
        )
      }
      const page = await run(
        a.orgId,
        `select id from core.crm_sync_run where organization_id = $1 and connection_id = $2
          order by requested_at desc, id desc limit 2`,
        [a.orgId, a.connectionId]
      )
      expect(page.rowCount).toBe(2)
    })
  })
})
