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

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`

/** Tables whose rows the outbound role cannot remove: disconnecting keeps the Mailbox and its history. */
const DELETE_REVOKED = ['mailboxes', 'mail_messages', 'mail_events']

const TABLES = ['mailboxes', 'mailbox_limits', 'mail_messages', 'mail_events', 'health_daily']

/** One harmless update per table that allows updates, to prove a second Organization updates nothing. */
const UPDATES = {
  mailboxes: "display_name = 'x'",
  mailbox_limits: 'per_day = 5',
  mail_messages: "provider_thread_id = 'x'",
  health_daily: 'sent = 1',
} as const

interface Seeded {
  orgId: string
  mailboxId: string
  sendId: string
}

describe('outbound mail tables', () => {
  let outbound: Pool
  let owner: Pool
  let handle: DbHandle
  const orgs: string[] = []

  /** Run `fn` in one transaction scoped to `organizationId` (or to none), as the outbound role. */
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

  /** Run a statement as the migration owner, scoped to `orgId`: what an Organization purge uses. */
  const runAsOwner = (orgId: string, sql: string, values: unknown[] = []) =>
    scoped(orgId, (c) => c.query(sql, values), owner)

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

  /** An Organization id that is cleaned up after the run. */
  const newOrg = (): string => {
    const orgId = newId('org')
    orgs.push(orgId)
    return orgId
  }

  const addMailbox = async (
    orgId: string,
    options: { address?: string; state?: string; reason?: string | null; kind?: string } = {}
  ) => {
    const id = newId('mbx')
    const kind = options.kind ?? 'personal'
    const state = options.state ?? 'warming'
    await run(
      orgId,
      `insert into outbound.mailboxes (id, organization_id, provider, kind, address, display_name, provider_account_id, owner_membership_id, state, state_reason, disconnected_at, access_token_ciphertext, refresh_token_ciphertext, token_key_id)
       values ($1, $2, 'gmail', $3, $4, 'Sales', 'acct-1', $5, $6, $7, $8, $9, $9, $10)`,
      [
        id,
        orgId,
        kind,
        options.address ?? `rep-${id.slice(4, 12)}@example.com`,
        kind === 'personal' ? newId('mem') : null,
        state,
        options.reason ?? null,
        state === 'disconnected' ? new Date() : null,
        state === 'disconnected' ? null : Buffer.from('ciphertext'),
        state === 'disconnected' ? null : 'k1',
      ]
    )
    return id
  }

  const addLimits = (orgId: string, mailboxId: string, overrides: Record<string, number> = {}) => {
    const v = { per_day: 10, per_hour: 5, min_gap_seconds: 30, start: 540, end: 1020, ...overrides }
    return run(
      orgId,
      `insert into outbound.mailbox_limits (organization_id, mailbox_id, per_day, per_hour, min_gap_seconds, window_time_zone, window_days, window_start_minute, window_end_minute)
       values ($1, $2, $3, $4, $5, 'America/New_York', 31, $6, $7)`,
      [orgId, mailboxId, v.per_day, v.per_hour, v.min_gap_seconds, v.start, v.end]
    )
  }

  const addSend = async (
    orgId: string,
    mailboxId: string | null,
    options: {
      enrollmentId?: string
      step?: number
      epoch?: number
      state?: string
      reason?: string | null
      sendKey?: string
      providerMessageId?: string | null
      retryAt?: Date | null
    } = {}
  ) => {
    const id = newId('snd')
    const enrollmentId = options.enrollmentId ?? newId('enr')
    const step = options.step ?? 0
    const epoch = options.epoch ?? 0
    const state = options.state ?? 'sent'
    await run(
      orgId,
      `insert into outbound.mail_messages (id, organization_id, campaign_id, enrollment_id, prospect_id, step, attempt_epoch, send_key, mailbox_id, state, reason, retry_at, sent_at, provider_message_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id,
        orgId,
        newId('cpg'),
        enrollmentId,
        newId('prs'),
        step,
        epoch,
        options.sendKey ?? `${enrollmentId}:${step}:${epoch}`,
        mailboxId,
        state,
        options.reason ?? null,
        options.retryAt ?? null,
        state === 'sent' ? new Date() : null,
        state === 'sent' ? (options.providerMessageId ?? `<${id}@mail>`) : null,
      ]
    )
    return id
  }

  const addEvent = async (
    orgId: string,
    mailboxId: string,
    options: {
      kind?: string
      sendId?: string | null
      providerMessageId?: string
      returnDate?: string | null
    } = {}
  ) => {
    const id = newId('mev')
    await run(
      orgId,
      `insert into outbound.mail_events (id, organization_id, mailbox_id, kind, send_id, provider_message_id, return_date, occurred_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [
        id,
        orgId,
        mailboxId,
        options.kind ?? 'reply',
        options.sendId ?? null,
        options.providerMessageId ?? `<${id}@mail>`,
        options.returnDate ?? null,
      ]
    )
    return id
  }

  const addHealth = (orgId: string, mailboxId: string, day = '2026-10-01') =>
    run(
      orgId,
      `insert into outbound.health_daily (organization_id, mailbox_id, day, score, sent, components)
       values ($1, $2, $3, 90, 20, '[]'::jsonb)`,
      [orgId, mailboxId, day]
    )

  /** Create an Organization with one row in every table of the mail schema. */
  async function seed(): Promise<Seeded> {
    const orgId = newOrg()
    const mailboxId = await addMailbox(orgId)
    await addLimits(orgId, mailboxId)
    const sendId = await addSend(orgId, mailboxId)
    await addEvent(orgId, mailboxId, { sendId })
    await addHealth(orgId, mailboxId)
    return { orgId, mailboxId, sendId }
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    outbound = new Pool({ connectionString: env.outbound, max: 6 })
    owner = new Pool({ connectionString: env.owner, max: 2 })
    handle = createDb(env.outbound, { max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      // Mailboxes take their limits, sends, events and health days along.
      await runAsOwner(orgId, 'delete from outbound.mailboxes')
      await runAsOwner(orgId, 'delete from outbound.mail_messages')
    }
    await dropStaleTestObjects(owner, env.owner)
    await handle.close()
    await Promise.all([owner.end(), outbound.end()])
  })

  test('every table of the schema passes the tenant isolation check', async () => {
    expect(await findTenantIsolationGaps(handle.db)).toEqual([])
  })

  describe.each(TABLES)('%s', (table) => {
    test('a second Organization reads and removes nothing of the first, and no scope sees nothing', async () => {
      const a = await seed()
      const b = await seed()
      expect(await countOf(a.orgId, table)).toBe(1)
      expect(await countOf(b.orgId, table)).toBe(1)
      expect(await countOf(null, table)).toBe(0)
      const read = await run(
        b.orgId,
        `select 1 from outbound.${table} where organization_id = $1`,
        [a.orgId]
      )
      expect(read.rowCount).toBe(0)
      if (!DELETE_REVOKED.includes(table)) {
        const removed = await run(
          b.orgId,
          `delete from outbound.${table} where organization_id = $1`,
          [a.orgId]
        )
        expect(removed.rowCount).toBe(0)
      }
      expect(await countOf(a.orgId, table)).toBe(1)
    })
  })

  describe.each(Object.keys(UPDATES) as (keyof typeof UPDATES)[])('%s updates', (table) => {
    test('a second Organization updates nothing of the first', async () => {
      const a = await seed()
      const b = await seed()
      const result = await run(
        b.orgId,
        `update outbound.${table} set ${UPDATES[table]} where organization_id = $1`,
        [a.orgId]
      )
      expect(result.rowCount).toBe(0)
    })
  })

  test('a second Organization cannot insert rows for the first', async () => {
    const a = await seed()
    const b = await seed()
    const error = await refusal(
      run(
        b.orgId,
        `insert into outbound.health_daily (organization_id, mailbox_id, day) values ($1, $2, '2026-09-01')`,
        [a.orgId, a.mailboxId]
      )
    )
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
  })

  test('a row cannot name another Organization, even through its own', async () => {
    const a = await seed()
    const b = await seed()
    expect((await refusal(addLimits(b.orgId, a.mailboxId))).code).toBe(FOREIGN_KEY_VIOLATION)
    expect((await refusal(addEvent(b.orgId, a.mailboxId))).code).toBe(FOREIGN_KEY_VIOLATION)
  })

  test.each(DELETE_REVOKED)('the service role cannot remove rows of %s', async (table) => {
    const a = await seed()
    const error = await refusal(run(a.orgId, `delete from outbound.${table}`))
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
    expect(await countOf(a.orgId, table)).toBe(1)
  })

  test('the service role cannot update a mail event', async () => {
    const a = await seed()
    const error = await refusal(
      run(
        a.orgId,
        "update outbound.mail_events set kind = 'complaint' where organization_id = $1",
        [a.orgId]
      )
    )
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
    expect(await countOf(a.orgId, 'mail_events')).toBe(1)
  })

  describe('mailboxes', () => {
    test('one connection per provider address', async () => {
      const orgId = newOrg()
      await addMailbox(orgId, { address: 'dup@example.com' })
      const error = await refusal(addMailbox(orgId, { address: 'dup@example.com' }))
      expect(error.code).toBe(UNIQUE_VIOLATION)
      // Another Organization may connect the same address.
      await addMailbox(newOrg(), { address: 'dup@example.com' })
    })

    test('the address is lowercase and shaped like an address', async () => {
      const orgId = newOrg()
      expect((await refusal(addMailbox(orgId, { address: 'Rep@Example.com' }))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(addMailbox(orgId, { address: 'no-at-sign' }))).code).toBe(
        CHECK_VIOLATION
      )
    })

    test('a personal Mailbox has an owner and a shared one has none', async () => {
      const orgId = newOrg()
      await addMailbox(orgId, { kind: 'shared' })
      const error = await refusal(
        run(
          orgId,
          `insert into outbound.mailboxes (id, organization_id, provider, kind, address, display_name, provider_account_id)
           values ($1, $2, 'gmail', 'personal', 'p@example.com', 'P', 'a')`,
          [newId('mbx'), orgId]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })

    test('only a shared Mailbox has Teams, and each is a Team id', async () => {
      const orgId = newOrg()
      const personal = await addMailbox(orgId)
      const teamId = newId('team')
      const onPersonal = await refusal(
        run(orgId, 'update outbound.mailboxes set team_ids = $1 where id = $2', [
          [teamId],
          personal,
        ])
      )
      expect(onPersonal.code).toBe(CHECK_VIOLATION)
      const shared = await addMailbox(orgId, { kind: 'shared' })
      await run(orgId, 'update outbound.mailboxes set team_ids = $1 where id = $2', [
        [teamId],
        shared,
      ])
      const malformed = await refusal(
        run(orgId, 'update outbound.mailboxes set team_ids = $1 where id = $2', [['nope'], shared])
      )
      expect(malformed.code).toBe(CHECK_VIOLATION)
    })

    test('a reason goes with a limited, paused or disconnected state and no other', async () => {
      const orgId = newOrg()
      await addMailbox(orgId, { state: 'paused', reason: 'owner_paused' })
      await addMailbox(orgId, { state: 'limited', reason: 'health_warning' })
      await addMailbox(orgId, { state: 'disconnected', reason: 'auth_revoked' })
      await addMailbox(orgId, { state: 'healthy' })
      expect((await refusal(addMailbox(orgId, { state: 'paused' }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addMailbox(orgId, { state: 'limited' }))).code).toBe(CHECK_VIOLATION)
      expect(
        (await refusal(addMailbox(orgId, { state: 'healthy', reason: 'owner_paused' }))).code
      ).toBe(CHECK_VIOLATION)
    })

    test('a disconnected Mailbox holds no tokens', async () => {
      const orgId = newOrg()
      const id = await addMailbox(orgId)
      const error = await refusal(
        run(
          orgId,
          "update outbound.mailboxes set state = 'disconnected', state_reason = 'auth_revoked', disconnected_at = now() where id = $1",
          [id]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })

    test('a token is stored with its key id, and bounded', async () => {
      const orgId = newOrg()
      const id = await addMailbox(orgId)
      const noKey = await refusal(
        run(orgId, 'update outbound.mailboxes set token_key_id = null where id = $1', [id])
      )
      expect(noKey.code).toBe(CHECK_VIOLATION)
      const huge = await refusal(
        run(orgId, 'update outbound.mailboxes set access_token_ciphertext = $1 where id = $2', [
          Buffer.alloc(8193),
          id,
        ])
      )
      expect(huge.code).toBe(CHECK_VIOLATION)
    })
  })

  describe('mailbox_limits', () => {
    test('the limits stay inside the contract ranges and the window ends after it starts', async () => {
      const orgId = newOrg()
      const mailboxId = await addMailbox(orgId)
      expect((await refusal(addLimits(orgId, mailboxId, { per_day: 501 }))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(addLimits(orgId, mailboxId, { per_hour: 0 }))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(addLimits(orgId, mailboxId, { min_gap_seconds: 3601 }))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(addLimits(orgId, mailboxId, { start: 600, end: 600 }))).code).toBe(
        CHECK_VIOLATION
      )
      await addLimits(orgId, mailboxId)
      expect((await refusal(addLimits(orgId, mailboxId))).code).toBe(UNIQUE_VIOLATION)
    })
  })

  describe('mail_messages', () => {
    test('a send key is used once per Organization, and the key must match its parts', async () => {
      const orgId = newOrg()
      const mailboxId = await addMailbox(orgId)
      const enrollmentId = newId('enr')
      await addSend(orgId, mailboxId, { enrollmentId, step: 1, epoch: 0 })
      const again = await refusal(addSend(orgId, mailboxId, { enrollmentId, step: 1, epoch: 0 }))
      expect(again.code).toBe(UNIQUE_VIOLATION)
      await addSend(orgId, mailboxId, { enrollmentId, step: 1, epoch: 1 })
      const mismatch = await refusal(
        addSend(orgId, mailboxId, { enrollmentId, step: 2, sendKey: `${enrollmentId}:9:9` })
      )
      expect(mismatch.code).toBe(CHECK_VIOLATION)
    })

    test('a provider message id is used once per Mailbox', async () => {
      const orgId = newOrg()
      const first = await addMailbox(orgId)
      const second = await addMailbox(orgId)
      await addSend(orgId, first, { providerMessageId: '<same@mail>' })
      const again = await refusal(addSend(orgId, first, { providerMessageId: '<same@mail>' }))
      expect(again.code).toBe(UNIQUE_VIOLATION)
      await addSend(orgId, second, { providerMessageId: '<same@mail>' })
    })

    test('the reason, retry time and Mailbox follow the state', async () => {
      const orgId = newOrg()
      const mailboxId = await addMailbox(orgId)
      await addSend(orgId, null, { state: 'refused', reason: 'suppressed' })
      await addSend(orgId, null, {
        state: 'deferred',
        reason: 'limit_reached',
        retryAt: new Date(Date.now() + 60_000),
      })
      // A refusal needs a reason, and a deferring reason belongs to a deferral.
      expect((await refusal(addSend(orgId, null, { state: 'refused' }))).code).toBe(CHECK_VIOLATION)
      expect(
        (await refusal(addSend(orgId, null, { state: 'refused', reason: 'limit_reached' }))).code
      ).toBe(CHECK_VIOLATION)
      expect(
        (
          await refusal(
            addSend(orgId, null, { state: 'deferred', reason: 'suppressed', retryAt: new Date() })
          )
        ).code
      ).toBe(CHECK_VIOLATION)
      // A deferral says when it is retried.
      expect(
        (await refusal(addSend(orgId, null, { state: 'deferred', reason: 'outside_window' }))).code
      ).toBe(CHECK_VIOLATION)
      // A send that reached the transport names its Mailbox.
      expect((await refusal(addSend(orgId, null, { state: 'sent' }))).code).toBe(CHECK_VIOLATION)
      await addSend(orgId, mailboxId, { state: 'sent' })
    })
  })

  describe('mail_events', () => {
    test('a provider message id is recorded once per Mailbox, so a replay inserts nothing twice', async () => {
      const orgId = newOrg()
      const mailboxId = await addMailbox(orgId)
      await addEvent(orgId, mailboxId, { providerMessageId: 'abc123' })
      const again = await refusal(addEvent(orgId, mailboxId, { providerMessageId: 'abc123' }))
      expect(again.code).toBe(UNIQUE_VIOLATION)
    })

    test('only an out-of-office has a return date, and the id has no spaces', async () => {
      const orgId = newOrg()
      const mailboxId = await addMailbox(orgId)
      await addEvent(orgId, mailboxId, { kind: 'out_of_office', returnDate: '2026-11-02' })
      expect(
        (await refusal(addEvent(orgId, mailboxId, { kind: 'reply', returnDate: '2026-11-02' })))
          .code
      ).toBe(CHECK_VIOLATION)
      expect(
        (await refusal(addEvent(orgId, mailboxId, { providerMessageId: 'has space' }))).code
      ).toBe(CHECK_VIOLATION)
    })

    test("an event cannot name another Mailbox's send", async () => {
      const orgId = newOrg()
      const first = await addMailbox(orgId)
      const second = await addMailbox(orgId)
      const sendId = await addSend(orgId, first)
      await addEvent(orgId, first, { sendId })
      const error = await refusal(addEvent(orgId, second, { sendId }))
      expect(error.code).toBe(FOREIGN_KEY_VIOLATION)
    })
  })

  describe('health_daily', () => {
    test('a day is stored once per Mailbox, with a score and components in range', async () => {
      const orgId = newOrg()
      const mailboxId = await addMailbox(orgId)
      await addHealth(orgId, mailboxId, '2026-10-01')
      expect((await refusal(addHealth(orgId, mailboxId, '2026-10-01'))).code).toBe(UNIQUE_VIOLATION)
      const score = await refusal(
        run(
          orgId,
          `insert into outbound.health_daily (organization_id, mailbox_id, day, score) values ($1, $2, '2026-10-02', 101)`,
          [orgId, mailboxId]
        )
      )
      expect(score.code).toBe(CHECK_VIOLATION)
      const components = await refusal(
        run(
          orgId,
          `insert into outbound.health_daily (organization_id, mailbox_id, day, components) values ($1, $2, '2026-10-03', '{}'::jsonb)`,
          [orgId, mailboxId]
        )
      )
      expect(components.code).toBe(CHECK_VIOLATION)
    })
  })

  test('an Organization purge by the owner removes a Mailbox with its limits, sends, events and health days', async () => {
    const a = await seed()
    await runAsOwner(a.orgId, 'delete from outbound.mailboxes where id = $1', [a.mailboxId])
    for (const table of TABLES) {
      expect(await countOf(a.orgId, table)).toBe(0)
    }
  })
})
