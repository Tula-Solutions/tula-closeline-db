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
const EXCLUSION_VIOLATION = '23P01'

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`
const hash = (value: string): string => createHash('sha256').update(value).digest('hex')
const at = (hour: number, minute = 0): string =>
  new Date(Date.UTC(2026, 10, 2, hour, minute)).toISOString()

interface Seeded {
  orgId: string
  repId: string
  teamId: string
  prospectId: string
  typeId: string
  bookingId: string
}

/** One harmless update per table, to prove a second Organization updates nothing. */
const UPDATES = {
  booking_types: "name = 'x'",
  bookings: "join_url = 'https://x.test'",
  busy_blocks: 'refreshed_at = now()',
  calendar_connections: "account_email = 'x@example.test'",
  routing_decisions: "reason = 'x'",
  routing_rules: "name = 'x'",
  routing_state: 'cursor = 9',
  working_hours: "timezone = 'UTC'",
} as const
const TABLES = Object.keys(UPDATES) as (keyof typeof UPDATES)[]

describe('core calendar, routing and Booking tables', () => {
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

  /** Insert a Booking whose blocked range is its time plus `buffer` minutes each side. */
  const addBooking = async (
    s: Seeded,
    start: string,
    end: string,
    options: { status?: string; repId?: string; buffer?: number } = {}
  ) => {
    const status = options.status ?? 'confirmed'
    const id = newId('bkg')
    await run(
      s.orgId,
      `insert into core.bookings (id, organization_id, booking_type_id, membership_id, prospect_id, status, mode, starts_at, ends_at, blocked_from, blocked_until, idempotency_key_hash, calendar_event_id, cancelled_at)
       values ($1, $2, $3, $4, $5, $6, 'video', $7::timestamptz, $8::timestamptz, $7::timestamptz - make_interval(mins => $9::int), $8::timestamptz + make_interval(mins => $9::int), $10, $11, $12)`,
      [
        id,
        s.orgId,
        s.typeId,
        options.repId ?? s.repId,
        s.prospectId,
        status,
        start,
        end,
        options.buffer ?? 0,
        hash(id),
        status === 'pending' ? null : `evt-${id}`,
        status === 'cancelled' ? new Date() : null,
      ]
    )
    return id
  }

  /** Create an Organization with a Rep, a Team, a Prospect, a Booking Type and one row in every table. */
  async function seed(): Promise<Seeded> {
    const s: Seeded = {
      orgId: newId('org'),
      repId: newId('mem'),
      teamId: newId('team'),
      prospectId: newId('prs'),
      typeId: newId('bkt'),
      bookingId: '',
    }
    orgs.push(s.orgId)
    await scoped(s.orgId, async (c) => {
      await c.query(
        'insert into core.organizations (organization_id, name, region) values ($1, $2, $3)',
        [s.orgId, 'Org', 'us']
      )
      await c.query(
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, 'owner', 'o@example.test')",
        [s.repId, s.orgId, newId('usr')]
      )
      await c.query('insert into core.teams (id, organization_id, name) values ($1, $2, $3)', [
        s.teamId,
        s.orgId,
        'Sales',
      ])
      await c.query(
        "insert into core.prospects (id, organization_id, source) values ($1, $2, 'manual')",
        [s.prospectId, s.orgId]
      )
      await c.query(
        "insert into core.booking_types (id, organization_id, name, length_minutes, mode) values ($1, $2, 'Discovery', 30, 'video')",
        [s.typeId, s.orgId]
      )
      await c.query(
        "insert into core.calendar_connections (id, organization_id, membership_id, provider, account_email, calendar_id, tokens_ciphertext) values ($1, $2, $3, 'google', 'rep@example.test', 'primary', $4)",
        [newId('cal'), s.orgId, s.repId, Buffer.from('sealed')]
      )
      await c.query(
        `insert into core.working_hours (organization_id, membership_id, timezone, windows) values ($1, $2, 'America/New_York', '[{"day":0,"start":540,"end":1020}]')`,
        [s.orgId, s.repId]
      )
      await c.query(
        "insert into core.routing_rules (id, organization_id, position, name, target_kind, target_membership_id) values ($1, $2, 0, 'Default', 'rep', $3)",
        [newId('rrl'), s.orgId, s.repId]
      )
      await c.query(
        'insert into core.routing_state (organization_id, target_key, cursor) values ($1, $2, 1)',
        [s.orgId, 'team:sales']
      )
      await c.query(
        "insert into core.routing_decisions (id, organization_id, purpose, chosen_membership_id, reason) values ($1, $2, 'booking', $3, 'default rule')",
        [newId('rdc'), s.orgId, s.repId]
      )
      await c.query(
        'insert into core.busy_blocks (organization_id, membership_id, starts_at, ends_at) values ($1, $2, $3, $4)',
        [s.orgId, s.repId, at(8), at(9)]
      )
    })
    s.bookingId = await addBooking(s, at(14), at(14, 30))
    return s
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    core = new Pool({ connectionString: env.core, max: 6 })
    owner = new Pool({ connectionString: env.owner, max: 2 })
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

  describe.each(TABLES)('%s', (table) => {
    test('a second Organization reads, updates and removes nothing of the first, and no scope sees nothing', async () => {
      const a = await seed()
      const b = await seed()
      expect(await countOf(a.orgId, table)).toBe(1)
      expect(await countOf(b.orgId, table)).toBe(1)
      expect(await countOf(null, table)).toBe(0)
      const read = await run(b.orgId, `select 1 from core.${table} where organization_id = $1`, [
        a.orgId,
      ])
      expect(read.rowCount).toBe(0)
      const updated = await run(
        b.orgId,
        `update core.${table} set ${UPDATES[table]} where organization_id = $1`,
        [a.orgId]
      )
      expect(updated.rowCount).toBe(0)
      const removed = await run(b.orgId, `delete from core.${table} where organization_id = $1`, [
        a.orgId,
      ])
      expect(removed.rowCount).toBe(0)
      expect(await countOf(a.orgId, table)).toBe(1)
    })
  })

  test('a second Organization cannot write a row under the first, or reference its Rep', async () => {
    const a = await seed()
    const b = await seed()
    const insert = (orgId: string, repId: string) =>
      run(
        b.orgId,
        'insert into core.busy_blocks (organization_id, membership_id, starts_at, ends_at) values ($1, $2, $3, $4)',
        [orgId, repId, at(10), at(11)]
      )
    expect((await refusal(insert(a.orgId, a.repId))).message).toContain('row-level security')
    expect((await refusal(insert(b.orgId, a.repId))).code).toBe(FOREIGN_KEY_VIOLATION)
    const booking = await refusal(addBooking({ ...b, repId: a.repId }, at(16), at(17)))
    expect(booking.code).toBe(FOREIGN_KEY_VIOLATION)
  })

  describe('bookings', () => {
    test('two overlapping confirmed Bookings for one Rep are refused by the database', async () => {
      const s = await seed()
      expect((await refusal(addBooking(s, at(14, 15), at(14, 45)))).code).toBe(EXCLUSION_VIOLATION)
      expect((await refusal(addBooking(s, at(14), at(14, 30)))).code).toBe(EXCLUSION_VIOLATION)
    })

    test('the buffers count: a Booking inside the buffer of another is refused', async () => {
      const s = await seed()
      await addBooking(s, at(15), at(15, 30), { buffer: 15 })
      // The second Booking blocks 14:45 to 15:45, so 14:40 to 14:50 overlaps it.
      const error = await refusal(addBooking(s, at(14, 40), at(14, 50)))
      expect(error.code).toBe(EXCLUSION_VIOLATION)
    })

    test('back-to-back, other-Rep, cancelled and pending Bookings succeed', async () => {
      const s = await seed()
      await addBooking(s, at(14, 30), at(15))
      await addBooking(s, at(13, 30), at(14))
      const other = newId('mem')
      await run(
        s.orgId,
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, 'rep', 'r@example.test')",
        [other, s.orgId, newId('usr')]
      )
      await addBooking(s, at(14), at(14, 30), { repId: other })
      await addBooking(s, at(14), at(14, 30), { status: 'cancelled' })
      await addBooking(s, at(14), at(14, 30), { status: 'pending' })
      expect(await countOf(s.orgId, 'bookings')).toBe(6)
    })

    test('cancelling a Booking frees its time', async () => {
      const s = await seed()
      await run(
        s.orgId,
        "update core.bookings set status = 'cancelled', cancelled_at = now() where id = $1",
        [s.bookingId]
      )
      await addBooking(s, at(14), at(14, 30))
    })

    test('two Organizations may hold the same times', async () => {
      const a = await seed()
      const b = await seed()
      expect(await countOf(a.orgId, 'bookings')).toBe(1)
      expect(await countOf(b.orgId, 'bookings')).toBe(1)
    })

    test('two simultaneous confirms for one slot yield one winner', async () => {
      const s = await seed()
      const results = await Promise.allSettled([
        addBooking(s, at(18), at(18, 30)),
        addBooking(s, at(18), at(18, 30)),
      ])
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
      const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult
      expect((rejected.reason as { code?: string }).code).toBe(EXCLUSION_VIOLATION)
    })

    test('a retried idempotency key is refused, and malformed times are refused', async () => {
      const s = await seed()
      const insert = (key: string, start: string, end: string, from = start, until = end) =>
        run(
          s.orgId,
          `insert into core.bookings (id, organization_id, booking_type_id, membership_id, prospect_id, status, mode, starts_at, ends_at, blocked_from, blocked_until, idempotency_key_hash, calendar_event_id)
           values ($1, $2, $3, $4, $5, 'confirmed', 'video', $6, $7, $8, $9, $10, 'evt')`,
          [newId('bkg'), s.orgId, s.typeId, s.repId, s.prospectId, start, end, from, until, key]
        )
      await insert(hash('k'), at(20), at(20, 30))
      expect((await refusal(insert(hash('k'), at(22), at(22, 30)))).code).toBe(UNIQUE_VIOLATION)
      expect((await refusal(insert(hash('b'), at(23), at(22)))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert(hash('n'), at(21), at(21, 30), at(21, 5)))).code).toBe(
        CHECK_VIOLATION
      )
    })

    test('a confirmed Booking has a calendar event, and cancelled_at matches the status', async () => {
      const s = await seed()
      const noEvent = await refusal(
        run(s.orgId, 'update core.bookings set calendar_event_id = null where id = $1', [
          s.bookingId,
        ])
      )
      expect(noEvent.code).toBe(CHECK_VIOLATION)
      const stray = await refusal(
        run(s.orgId, 'update core.bookings set cancelled_at = now() where id = $1', [s.bookingId])
      )
      expect(stray.code).toBe(CHECK_VIOLATION)
    })

    test('a Booking Type in use cannot be removed', async () => {
      const s = await seed()
      const error = await refusal(
        run(s.orgId, 'delete from core.booking_types where id = $1', [s.typeId])
      )
      expect(error.code).toBe(FOREIGN_KEY_VIOLATION)
    })
  })

  describe('booking_types', () => {
    test('names are unique per Organization ignoring case; lengths, buffers and mode are checked', async () => {
      const s = await seed()
      const insert = (name: string, length: number, buffer: number, mode: string) =>
        run(
          s.orgId,
          'insert into core.booking_types (id, organization_id, name, length_minutes, buffer_after_minutes, mode) values ($1, $2, $3, $4, $5, $6)',
          [newId('bkt'), s.orgId, name, length, buffer, mode]
        )
      await insert('Demo', 30, 0, 'phone')
      expect((await refusal(insert('DEMO', 30, 0, 'phone'))).code).toBe(UNIQUE_VIOLATION)
      expect((await refusal(insert('A', 4, 0, 'phone'))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('B', 30, 121, 'phone'))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('C', 30, 0, 'carrier'))).code).toBe(CHECK_VIOLATION)
    })

    test('a public token hash is unique across Organizations and must be a SHA-256', async () => {
      const a = await seed()
      const b = await seed()
      const set = (s: Seeded, value: string) =>
        run(s.orgId, 'update core.booking_types set public_token_hash = $1 where id = $2', [
          value,
          s.typeId,
        ])
      const token = hash(newId('tok'))
      await set(a, token)
      expect((await refusal(set(b, token))).code).toBe(UNIQUE_VIOLATION)
      expect((await refusal(set(b, 'short'))).code).toBe(CHECK_VIOLATION)
    })
  })

  describe('routing_rules', () => {
    test('exactly the target of its kind is set, and a pool has 1 to 20 members', async () => {
      const s = await seed()
      const insert = (kind: string, columns: string, values: unknown[]) =>
        run(
          s.orgId,
          `insert into core.routing_rules (id, organization_id, position, name, target_kind, ${columns}) values ($1, $2, 1, 'r', $3, ${values.map((_, n) => `$${n + 4}`).join(', ')})`,
          [newId('rrl'), s.orgId, kind, ...values]
        )
      await insert('team', 'target_team_id', [s.teamId])
      await insert('pool', 'pool_name, pool_membership_ids', ['EMEA', [s.repId]])
      expect((await refusal(insert('rep', 'target_team_id', [s.teamId]))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(insert('team', 'target_membership_id', [s.repId]))).code).toBe(
        CHECK_VIOLATION
      )
      expect(
        (await refusal(insert('pool', 'pool_name, pool_membership_ids', ['x', []]))).code
      ).toBe(CHECK_VIOLATION)
      const tooMany = Array.from({ length: 21 }, () => newId('mem'))
      expect(
        (await refusal(insert('pool', 'pool_name, pool_membership_ids', ['x', tooMany]))).code
      ).toBe(CHECK_VIOLATION)
    })

    test('only the contract rrl_ id prefix is accepted', async () => {
      const s = await seed()
      const insert = (id: string) =>
        run(
          s.orgId,
          "insert into core.routing_rules (id, organization_id, position, name, target_kind, target_membership_id) values ($1, $2, 1, 'r', 'rep', $3)",
          [id, s.orgId, s.repId]
        )
      await insert(newId('rrl'))
      expect((await refusal(insert(newId('rul')))).code).toBe(CHECK_VIOLATION)
    })

    test("a rule cannot target another Organization's Team", async () => {
      const a = await seed()
      const b = await seed()
      const error = await refusal(
        run(
          b.orgId,
          "insert into core.routing_rules (id, organization_id, position, name, target_kind, target_team_id) values ($1, $2, 1, 'r', 'team', $3)",
          [newId('rrl'), b.orgId, a.teamId]
        )
      )
      expect(error.code).toBe(FOREIGN_KEY_VIOLATION)
    })
  })

  describe('other tables', () => {
    test('one connection per Rep', async () => {
      const s = await seed()
      const error = await refusal(
        run(
          s.orgId,
          "insert into core.calendar_connections (id, organization_id, membership_id, provider, account_email, calendar_id, tokens_ciphertext) values ($1, $2, $3, 'outlook', 'r@example.test', 'c', $4)",
          [newId('cal'), s.orgId, s.repId, Buffer.from('x')]
        )
      )
      expect(error.code).toBe(UNIQUE_VIOLATION)
    })

    test('working hours are one row per Rep with at most 28 windows', async () => {
      const s = await seed()
      const windows = JSON.stringify(Array.from({ length: 29 }, () => ({})))
      const error = await refusal(
        run(s.orgId, 'update core.working_hours set windows = $1::jsonb', [windows])
      )
      expect(error.code).toBe(CHECK_VIOLATION)
      const dup = await refusal(
        run(
          s.orgId,
          "insert into core.working_hours (organization_id, membership_id, timezone) values ($1, $2, 'UTC')",
          [s.orgId, s.repId]
        )
      )
      expect(dup.code).toBe(UNIQUE_VIOLATION)
    })

    test('a busy block ends after it starts; a routing state key has a known shape', async () => {
      const s = await seed()
      const block = await refusal(
        run(
          s.orgId,
          'insert into core.busy_blocks (organization_id, membership_id, starts_at, ends_at) values ($1, $2, $3, $3)',
          [s.orgId, s.repId, at(10)]
        )
      )
      expect(block.code).toBe(CHECK_VIOLATION)
      const key = await refusal(
        run(
          s.orgId,
          "insert into core.routing_state (organization_id, target_key) values ($1, 'anything')",
          [s.orgId]
        )
      )
      expect(key.code).toBe(CHECK_VIOLATION)
    })

    test('a routing decision keeps its candidates as a bounded array', async () => {
      const s = await seed()
      const error = await refusal(
        run(
          s.orgId,
          "insert into core.routing_decisions (id, organization_id, purpose, skipped, reason) values ($1, $2, 'test', '{}'::jsonb, 'r')",
          [newId('rdc'), s.orgId]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })
  })

  test('removing an Organization removes every calendar table row', async () => {
    const s = await seed()
    await owner.query('delete from core.organizations where organization_id = $1', [s.orgId])
    for (const table of TABLES) {
      const n = await owner.query(
        `select count(*) as n from core.${table} where organization_id = $1`,
        [s.orgId]
      )
      expect(Number(n.rows[0].n)).toBe(0)
    }
  })
})
