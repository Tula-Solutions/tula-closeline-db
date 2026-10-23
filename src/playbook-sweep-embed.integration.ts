import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { dropStaleTestObjects, integrationEnv, migrateUp, rejectionOf } from './integration-support'
import { CALL_INSERT, CALL_MOMENTS_RECORD } from './playbook-call-statements'
import {
  EMBED_USAGE_ADD,
  EMBED_USAGE_PURGE,
  IDEMPOTENCY_BEGIN,
  ORGANIZATION_REMOVE_REST,
  ORPHAN_SWEEP_CLAIM,
  ORPHAN_SWEEP_PAGE_DONE,
  ORPHAN_SWEEP_STATE,
  QUOTA_LOCK,
  REMOVE_ALL_IDEMPOTENCY_ROUTE,
  RIGHTS_CONFIRM,
} from './playbook-statements'
import { EMBED_USAGE_MAX_ADD, EMBED_USAGE_MAX_MOMENTS } from './schema/playbook-embed-usage'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
// Every test works in Organizations of its own (random ids), so no test sees another's rows.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const hex = (): string => crypto.randomUUID().replaceAll('-', '')
const newOrg = (): string => `org_${hex()}`
const newUser = (): string => `usr_${hex()}`
const hashOf = (text: string): Buffer => createHash('sha256').update(text).digest()

describe('the orphan sweep cursor, the embed usage counter and the Call Moment counts', () => {
  let owner: Pool
  let playbook: Pool

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    await dropStaleTestObjects(owner, env.owner)
    playbook = new Pool({ connectionString: env.playbook, max: 16 })
  })

  afterAll(async () => {
    await Promise.all([owner.end(), playbook.end()])
  })

  async function scoped<T>(pool: Pool, org: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await pool.connect()
    try {
      await c.query('begin')
      await c.query('select set_config($1, $2, true)', [SETTING, org])
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
  const inOrg = <T>(org: string, fn: (c: PoolClient) => Promise<T>) => scoped(playbook, org, fn)
  const asOwner = <T>(org: string, fn: (c: PoolClient) => Promise<T>) => scoped(owner, org, fn)

  describe('the sweep claim', () => {
    const claim = (org: string, ms = 60_000) =>
      inOrg(org, async (c) => (await c.query(ORPHAN_SWEEP_CLAIM, [org, ms])).rows[0])
    const state = (org: string) =>
      inOrg(org, async (c) => (await c.query(ORPHAN_SWEEP_STATE, [org])).rows[0])

    test('the first claim wins and sets a deadline; a second finds it held', async () => {
      const org = newOrg()
      const first = await claim(org)
      expect(first.claimed).toBe(true)
      expect(first.sweep_cursor).toBeNull()
      const held = await state(org)
      expect(new Date(held.sweep_claim_until).getTime()).toBeGreaterThan(Date.now())
      expect((await claim(org)).claimed).toBe(false)
    })

    test('a claim whose deadline passed can be taken again', async () => {
      const org = newOrg()
      expect((await claim(org)).claimed).toBe(true)
      await asOwner(org, (c) =>
        c.query(
          `update playbook.orphan_sweeps set sweep_claim_until = clock_timestamp() - interval '1 second'`
        )
      )
      expect((await claim(org)).claimed).toBe(true)
    })

    test('the deadline is at least a second and at most an hour whatever is asked', async () => {
      const low = newOrg()
      await claim(low, -5)
      const lowUntil = new Date((await state(low)).sweep_claim_until).getTime() - Date.now()
      expect(lowUntil).toBeGreaterThan(0)
      expect(lowUntil).toBeLessThanOrEqual(1500)
      const high = newOrg()
      await claim(high, 2_000_000_000)
      const highUntil = new Date((await state(high)).sweep_claim_until).getTime() - Date.now()
      expect(highUntil).toBeLessThanOrEqual(3_600_000)
      expect(highUntil).toBeGreaterThan(3_500_000)
    })

    test('concurrent claims of one Organization have exactly one winner', async () => {
      for (const existing of [false, true]) {
        const org = newOrg()
        if (existing) {
          await claim(org)
          await asOwner(org, (c) =>
            c.query(`update playbook.orphan_sweeps set sweep_claim_until = null`)
          )
        }
        const results = await Promise.all(Array.from({ length: 10 }, () => claim(org)))
        expect(results.filter((r) => r.claimed)).toHaveLength(1)
      }
    })

    test('a claim held by an open transaction is skipped, not waited for', async () => {
      const org = newOrg()
      await claim(org)
      await asOwner(org, (c) =>
        c.query(`update playbook.orphan_sweeps set sweep_claim_until = null`)
      )
      const holder = await playbook.connect()
      try {
        await holder.query('begin')
        await holder.query('select set_config($1, $2, true)', [SETTING, org])
        expect((await holder.query(ORPHAN_SWEEP_CLAIM, [org, 60_000])).rows[0].claimed).toBe(true)
        expect((await claim(org)).claimed).toBe(false)
        await holder.query('commit')
      } finally {
        await holder.query('rollback').catch(() => undefined)
        holder.release()
      }
    })

    test('the page done with a cursor saves it, leaves swept_through alone and frees the claim', async () => {
      const org = newOrg()
      await inOrg(org, (c) =>
        c.query(IDEMPOTENCY_BEGIN, [org, newUser(), 'documents.upload', `k-${hex()}`, hashOf('x')])
      )
      await claim(org)
      const before = await state(org)
      const cut = await inOrg(
        org,
        async (c) =>
          (await c.query(ORPHAN_SWEEP_PAGE_DONE, [org, new Date(), `${org}/docs/a-key`])).rows[0]
      )
      expect(cut.more).toBe(true)
      expect(cut.sweep_cursor).toBe(`${org}/docs/a-key`)
      const after = await state(org)
      expect(after.sweep_cursor).toBe(`${org}/docs/a-key`)
      expect(after.swept_through).toEqual(before.swept_through)
      expect(after.sweep_claim_until).toBeNull()
      // The next claim hands the cursor back.
      const next = await claim(org)
      expect(next.claimed).toBe(true)
      expect(next.sweep_cursor).toBe(`${org}/docs/a-key`)
    })

    test('the page done without a cursor clears it, advances swept_through and frees the claim', async () => {
      const org = newOrg()
      await inOrg(org, (c) =>
        c.query(IDEMPOTENCY_BEGIN, [org, newUser(), 'documents.upload', `k-${hex()}`, hashOf('x')])
      )
      await claim(org)
      await inOrg(org, (c) => c.query(ORPHAN_SWEEP_PAGE_DONE, [org, new Date(), 'some/key']))
      const through = new Date()
      const done = await inOrg(
        org,
        async (c) => (await c.query(ORPHAN_SWEEP_PAGE_DONE, [org, through, null])).rows[0]
      )
      expect(done.sweep_cursor).toBeNull()
      const after = await state(org)
      expect(after.sweep_cursor).toBeNull()
      expect(after.sweep_claim_until).toBeNull()
      // Cut to 25 hours before now, like ORPHAN_SWEEP_DONE.
      expect(new Date(after.swept_through).getTime()).toBeGreaterThan(
        through.getTime() - 25 * 3_600_000 - 60_000
      )
      expect(new Date(after.swept_through).getTime()).toBeLessThanOrEqual(
        Date.now() - 25 * 3_600_000 + 1000
      )
      expect(done.swept_through).toEqual(after.swept_through)
    })

    test('a cursor of zero or more than 1024 bytes is refused', async () => {
      const org = newOrg()
      await claim(org)
      for (const cursor of ['', 'k'.repeat(1025), 'é'.repeat(513)]) {
        const refused = await rejectionOf(
          inOrg(org, (c) => c.query(ORPHAN_SWEEP_PAGE_DONE, [org, new Date(), cursor]))
        )
        expect(refused).toMatch(/sweep_cursor|orphan_sweeps_cursor/)
      }
      await inOrg(org, (c) => c.query(ORPHAN_SWEEP_PAGE_DONE, [org, new Date(), 'é'.repeat(512)]))
    })

    test("a second Organization cannot read, claim, finish or change the first one's sweep state", async () => {
      const a = newOrg()
      const b = newOrg()
      await inOrg(a, (c) =>
        c.query(IDEMPOTENCY_BEGIN, [a, newUser(), 'documents.upload', `k-${hex()}`, hashOf('x')])
      )
      await claim(a)
      await inOrg(a, (c) => c.query(ORPHAN_SWEEP_PAGE_DONE, [a, new Date(), 'a-cursor']))
      // Reading A's row from B's scope finds nothing.
      expect(await inOrg(b, async (c) => (await c.query(ORPHAN_SWEEP_STATE, [a])).rowCount)).toBe(0)
      // The functions refuse a scope that is not the Organization's.
      for (const query of [
        [ORPHAN_SWEEP_CLAIM, [a, 60_000]],
        [ORPHAN_SWEEP_PAGE_DONE, [a, new Date(), 'b-cursor']],
        [ORPHAN_SWEEP_PAGE_DONE, [a, new Date(), null]],
      ] as const) {
        const refused = await rejectionOf(inOrg(b, (c) => c.query(query[0], [...query[1]])))
        expect(refused).toContain('orphan_sweep_scope')
      }
      // The role cannot write the table directly.
      for (const write of [
        `update playbook.orphan_sweeps set sweep_cursor = 'x'`,
        `update playbook.orphan_sweeps set sweep_claim_until = null`,
      ]) {
        expect(await rejectionOf(inOrg(b, (c) => c.query(write)))).toContain('permission denied')
      }
      const kept = await state(a)
      expect(kept.sweep_cursor).toBe('a-cursor')
    })
  })

  describe('embed usage', () => {
    const add = (org: string, moments: number | null) =>
      inOrg(org, async (c) => (await c.query(EMBED_USAGE_ADD, [org, moments])).rows[0])
    const rowsOf = (org: string) =>
      asOwner(
        org,
        async (c) => (await c.query('select day::text, moments from playbook.embed_usage')).rows
      )

    test('an add returns the UTC day and its running total', async () => {
      const org = newOrg()
      const first = await add(org, 40)
      expect(first.moments).toBe(40)
      const today = (
        await owner.query(`select (clock_timestamp() at time zone 'utc')::date::text as d`)
      ).rows[0].d
      expect(first.day).toBe(today)
      expect((await add(org, 2)).moments).toBe(42)
      expect(await rowsOf(org)).toEqual([{ day: today, moments: 42 }])
    })

    test('a null, negative or huge count is bounded, and the total stops at its cap', async () => {
      const org = newOrg()
      expect((await add(org, null)).moments).toBe(0)
      expect((await add(org, -9)).moments).toBe(0)
      expect((await add(org, 10 ** 9)).moments).toBe(EMBED_USAGE_MAX_ADD)
      let total = EMBED_USAGE_MAX_ADD
      while (total < EMBED_USAGE_MAX_MOMENTS) {
        total = Math.min(total + EMBED_USAGE_MAX_ADD, EMBED_USAGE_MAX_MOMENTS)
        expect((await add(org, EMBED_USAGE_MAX_ADD)).moments).toBe(total)
      }
      expect((await add(org, 5)).moments).toBe(EMBED_USAGE_MAX_MOMENTS)
    })

    test('the table refuses a count outside its bounds and the zero Organization', async () => {
      const org = newOrg()
      await add(org, 1)
      for (const moments of [-1, EMBED_USAGE_MAX_MOMENTS + 1]) {
        const refused = await rejectionOf(
          inOrg(org, (c) => c.query('update playbook.embed_usage set moments = $1', [moments]))
        )
        expect(refused).toContain('embed_usage_moments_bounds')
      }
      const zero = `org_${'0'.repeat(32)}`
      const refused = await rejectionOf(
        asOwner(zero, (c) =>
          c.query(
            `insert into playbook.embed_usage (organization_id, day, moments) values ($1, current_date, 1)`,
            [zero]
          )
        )
      )
      expect(refused).toContain('embed_usage_organization_not_global')
    })

    test('concurrent adds each see a distinct running total and none is lost', async () => {
      const org = newOrg()
      const counts = Array.from({ length: 12 }, (_, i) => i + 1)
      const results = await Promise.all(counts.map((n) => add(org, n)))
      const totals = results.map((r) => r.moments as number)
      expect(new Set(totals).size).toBe(counts.length)
      expect(Math.max(...totals)).toBe(78)
      expect((await rowsOf(org))[0]?.moments).toBe(78)
    })

    test("a second Organization sees, changes and removes none of the first one's counts", async () => {
      const a = newOrg()
      const b = newOrg()
      await add(a, 7)
      const peek = await inOrg(b, (c) => c.query('select * from playbook.embed_usage'))
      expect(peek.rowCount).toBe(0)
      const none = await inOrg(b, (c) =>
        c.query('select moments from playbook.embed_usage where organization_id = $1', [a])
      )
      expect(none.rowCount).toBe(0)
      expect(
        (
          await inOrg(b, (c) =>
            c.query(`update playbook.embed_usage set moments = 0 where organization_id = $1`, [a])
          )
        ).rowCount
      ).toBe(0)
      expect(
        (
          await inOrg(b, (c) =>
            c.query(`delete from playbook.embed_usage where organization_id = $1`, [a])
          )
        ).rowCount
      ).toBe(0)
      // Writing a row for A from B's scope is refused, and so is the statement.
      const refused = await rejectionOf(
        inOrg(b, (c) =>
          c.query(
            `insert into playbook.embed_usage (organization_id, day, moments) values ($1, current_date, 1)`,
            [a]
          )
        )
      )
      expect(refused).toContain('row-level security')
      expect(await rejectionOf(inOrg(b, (c) => c.query(EMBED_USAGE_ADD, [a, 1])))).toContain(
        'row-level security'
      )
      // No scope at all sees nothing.
      const c = await playbook.connect()
      try {
        expect((await c.query('select 1 from playbook.embed_usage')).rowCount).toBe(0)
      } finally {
        c.release()
      }
      expect((await rowsOf(a))[0]?.moments).toBe(7)
    })

    test("erasing the Organization removes its embed counts and no other Organization's", async () => {
      const [a, b] = [newOrg(), newOrg()]
      await add(a, 4)
      await add(b, 6)
      const removed = await inOrg(
        a,
        async (c) =>
          (await c.query(ORGANIZATION_REMOVE_REST, [a, REMOVE_ALL_IDEMPOTENCY_ROUTE])).rows[0]
      )
      expect(removed.removed).toBe(true)
      expect(await rowsOf(a)).toHaveLength(0)
      expect((await rowsOf(b))[0]?.moments).toBe(6)
    })

    test('the purge removes days older than the kept ones, a bounded batch at a time, in its own scope', async () => {
      const a = newOrg()
      const b = newOrg()
      for (const org of [a, b]) {
        await asOwner(org, (c) =>
          c.query(
            `insert into playbook.embed_usage (organization_id, day, moments)
             select $1, (clock_timestamp() at time zone 'utc')::date - g, g from generate_series(0, 9) g`,
            [org]
          )
        )
      }
      const purge = (org: string, keep: number | null, batch: number | null) =>
        inOrg(org, (c) => c.query(EMBED_USAGE_PURGE, [org, keep, batch]))
      // Keep 3 days besides today: days 4..9 back are old, 6 rows; a batch of 5 takes the oldest 5.
      expect((await purge(a, 3, 5)).rowCount).toBe(5)
      expect((await rowsOf(a)).map((r) => r.moments).sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4])
      expect((await purge(a, 3, 5)).rowCount).toBe(1)
      expect((await purge(a, 3, 5)).rowCount).toBe(0)
      expect(await rowsOf(a)).toHaveLength(4)
      // Today and yesterday are never purged, whatever is asked; B's rows were not touched.
      expect((await purge(a, 0, 500)).rowCount).toBe(2)
      expect((await purge(a, null, null)).rowCount).toBe(0)
      expect(await rowsOf(a)).toHaveLength(2)
      expect(await rowsOf(b)).toHaveLength(10)
    })
  })

  describe('the Moment counts on a Call', () => {
    test('a Call starts with no counts, a record sets both, and the table bounds them', async () => {
      const org = newOrg()
      const id = `call_${hex()}`
      await inOrg(org, (c) => c.query(RIGHTS_CONFIRM, [org, newUser(), 1]))
      await inOrg(org, async (c) => {
        await c.query(QUOTA_LOCK, [org])
        return c.query(CALL_INSERT, [
          org,
          id,
          'D-1',
          `deal_${hex()}`,
          'a.txt',
          'text/plain',
          'transcript',
          100,
          hashOf(hex()),
          newUser(),
          `${org}/${id}`,
          'speaker',
          'Rep',
          null,
          `cjob_${hex()}`,
          100,
          10 ** 12,
          100,
          1,
        ])
      })
      const read = () =>
        asOwner(
          org,
          async (c) =>
            (await c.query('select embedded_moments, skipped_moments from playbook.calls')).rows[0]
        )
      expect(await read()).toEqual({ embedded_moments: null, skipped_moments: null })
      // Not yet processing: nothing to record.
      expect(
        (await inOrg(org, (c) => c.query(CALL_MOMENTS_RECORD, [org, id, 5, 2]))).rowCount
      ).toBe(0)
      await asOwner(org, (c) =>
        c.query(
          `update playbook.calls set state = 'processing', rep_by = 'speaker', rep_label = 'a', speaker_labels = '{a,b}'`
        )
      )
      const recorded = await inOrg(org, (c) => c.query(CALL_MOMENTS_RECORD, [org, id, 5, 2]))
      expect(recorded.rows).toEqual([{ id, embedded_moments: 5, skipped_moments: 2 }])
      expect(await read()).toEqual({ embedded_moments: 5, skipped_moments: 2 })
      const refused = await rejectionOf(
        asOwner(org, (c) =>
          c.query(`update playbook.calls set embedded_moments = -1, skipped_moments = 0`)
        )
      )
      expect(refused).toContain('calls_moment_counts')
      const lone = await rejectionOf(
        asOwner(org, (c) => c.query(`update playbook.calls set embedded_moments = null`))
      )
      expect(lone).toContain('calls_moment_counts')
    })
  })
})
