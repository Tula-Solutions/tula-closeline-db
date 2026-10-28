import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool, type QueryResult, type QueryResultRow } from 'pg'
import {
  COUNTER_MIN_PERIOD_MS,
  COUNTER_PURGE_BATCH,
  LOCKOUT_ATTEMPT,
  LOCKOUT_CLEAR,
  LOCKOUT_RETRY_AFTER,
  RATE_HIT,
} from './auth-statements'
import { createDb } from './client'
import {
  type AuthRegion,
  adminUrl,
  dropStaleTestObjects,
  dropTestDatabase,
  integrationEnv,
  migrateUp,
  rejectionOf,
  seedAuthRegion,
} from './integration-support'
import {
  CONTROL_PLANE_TABLE_REASONS,
  CONTROL_PLANE_TABLES,
  findTenantIsolationGaps,
  NON_TENANT_TABLES,
} from './isolation'
import { runMigrations } from './migrate'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const MIGRATIONS = fileURLToPath(new URL('../migrations', import.meta.url))
const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`

/** The lockout policy of tula-closeline-auth (`CREDENTIAL_LOCKOUT`), restated here. */
const POLICY = {
  freeAttempts: 5,
  baseDelayMs: 30_000,
  maxDelayMs: 900_000,
  forgetAfterMs: 3_600_000,
}

/** The wait after the n-th failure under {@link POLICY}: auth's `lockoutDelayMs`. */
function delayMs(failures: number): number {
  const over = failures - POLICY.freeAttempts
  return over <= 0
    ? 0
    : Math.min(POLICY.maxDelayMs, POLICY.baseDelayMs * 2 ** Math.min(over - 1, 30))
}

/** The waits for failures 1 to 12; the last applies to every failure after it. */
const SCHEDULE = Array.from({ length: 12 }, (_, i) => delayMs(i + 1))

/** What `attempt` and `hit` need: a pool, or one connection of it inside a transaction. */
interface Queryable {
  query<R extends QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<R>>
}

/** A fixed 32-byte stand-in for the service's keyed hash of a key. */
const keyHash = (label: string): Buffer => {
  const bytes = new Bun.CryptoHasher('sha256').update(`${suffix}:${label}`).digest()
  return Buffer.from(bytes)
}

/** A time for a row written directly (a constraint test), far from any database clock reading. */
const at = (ms: number): Date => new Date(Date.UTC(2030, 0, 1) + ms)

describe('auth.attempt_counters', () => {
  let owner: Pool
  let authPool: Pool
  let otherInstance: Pool
  let corePool: Pool
  let region: AuthRegion
  let seq = 0

  /** One attempted sign-in, the README statement: the wait it imposed, or `refused`. */
  const attempt = async (db: Queryable, environmentId: string, hash: Buffer) => {
    const result = await db.query<{ hits: number; wait_ms: number }>(LOCKOUT_ATTEMPT, [
      environmentId,
      hash,
      SCHEDULE,
      POLICY.forgetAfterMs,
    ])
    const row = result.rows[0]
    return row
      ? { allowed: true as const, hits: row.hits, waitMs: row.wait_ms }
      : { allowed: false as const }
  }

  const hit = async (db: Queryable, environmentId: string, hash: Buffer, windowMs: number) => {
    const result = await db.query<{ hits: number; retry_after_ms: number }>(RATE_HIT, [
      environmentId,
      hash,
      windowMs,
    ])
    return result.rows[0]
  }

  const retryAfter = async (environmentId: string, hash: Buffer) =>
    (await authPool.query<{ retry_after_ms: number }>(LOCKOUT_RETRY_AFTER, [environmentId, hash]))
      .rows[0]?.retry_after_ms

  /**
   * Move a row back in time by `ms`, as if that long had passed: the three times shift together.
   * Tests drive time this way, never by sleeping or by asserting on the wall clock.
   */
  const backdate = (environmentId: string, hash: Buffer, ms: number) =>
    authPool.query(
      `update auth.attempt_counters
          set started_at = started_at - make_interval(secs => $3::float8 / 1000),
              locked_until = locked_until - make_interval(secs => $3::float8 / 1000),
              expires_at = expires_at - make_interval(secs => $3::float8 / 1000)
        where environment_id = $1 and key_hash = $2`,
      [environmentId, hash, ms]
    )

  /** End a lock exactly now by the database clock (the boundary: locked_until <= now). */
  const unlock = (environmentId: string, hash: Buffer) =>
    authPool.query(
      `update auth.attempt_counters set locked_until = clock_timestamp()
        where environment_id = $1 and kind = 'lockout' and key_hash = $2`,
      [environmentId, hash]
    )

  const rowOf = async (environmentId: string, hash: Buffer) =>
    (
      await owner.query(
        `select hits, started_at, locked_until, expires_at from auth.attempt_counters
          where environment_id = $1 and key_hash = $2`,
        [environmentId, hash]
      )
    ).rows[0]

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 3 })
    await dropStaleTestObjects(owner, env.owner)
    authPool = new Pool({ connectionString: env.auth, max: 8 })
    otherInstance = new Pool({ connectionString: env.auth, max: 3 })
    corePool = new Pool({ connectionString: env.core, max: 1 })
    region = await seedAuthRegion(authPool)
  })

  afterAll(async () => {
    await owner.query('delete from auth.workspaces where id = $1', [region?.workspaceId])
    await Promise.all([owner.end(), authPool.end(), otherInstance.end(), corePool.end()])
  })

  describe('the rules the table keeps', () => {
    const insert = (columns: Record<string, unknown>) => {
      const row = {
        environment_id: region.a.environmentId,
        kind: 'rate_limit',
        key_hash: keyHash(`rule-${++seq}`),
        hits: 1,
        started_at: at(0),
        locked_until: null,
        expires_at: at(60_000),
        ...columns,
      }
      const names = Object.keys(row)
      return authPool.query(
        `insert into auth.attempt_counters (${names.join(', ')})
         values (${names.map((_, i) => `$${i + 1}`).join(', ')})`,
        Object.values(row)
      )
    }

    test.each([
      [
        'a key hash of 31 bytes',
        { key_hash: Buffer.alloc(31) },
        'attempt_counters_key_hash_length',
      ],
      [
        'a key hash of 33 bytes',
        { key_hash: Buffer.alloc(33) },
        'attempt_counters_key_hash_length',
      ],
      ['a kind that is neither', { kind: 'other' }, 'attempt_counters_kind_known'],
      ['no hits', { hits: 0 }, 'attempt_counters_hits_bounds'],
      ['more hits than the bound', { hits: 1_000_001 }, 'attempt_counters_hits_bounds'],
      [
        'a window that ends where it starts',
        { expires_at: at(0) },
        'attempt_counters_window_order',
      ],
      [
        'a window that ends before it starts',
        { expires_at: at(-1) },
        'attempt_counters_window_order',
      ],
      ['a lockout with no lock', { kind: 'lockout' }, 'attempt_counters_lock_whole'],
      ['a rate limit with a lock', { locked_until: at(10) }, 'attempt_counters_lock_whole'],
      [
        'a lock past the row expiring',
        { kind: 'lockout', locked_until: at(60_001) },
        'attempt_counters_lock_before_expiry',
      ],
    ])('refuses %s', async (_name, columns, constraint) => {
      expect(await rejectionOf(insert(columns))).toContain(constraint)
    })

    test.each([
      ['a rate limit at the bound', { hits: 1_000_000 }],
      ['a lockout locked for the whole window', { kind: 'lockout', locked_until: at(60_000) }],
      ['a lockout not yet locked', { kind: 'lockout', locked_until: at(0) }],
      // Relaxed: a lock may precede started_at, because the statement reads the clock several
      // times and the database clock, not an instance, decides the order.
      ['a lock a moment before the count began', { kind: 'lockout', locked_until: at(-1) }],
    ])('accepts %s', async (_name, columns) => {
      await insert(columns)
    })

    test('a key is counted once per environment and kind, and separately across them', async () => {
      const hash = keyHash('unique')
      await insert({ key_hash: hash })
      expect(await rejectionOf(insert({ key_hash: hash }))).toContain('attempt_counters_pkey')
      await insert({ key_hash: hash, environment_id: region.b.environmentId })
      await insert({ key_hash: hash, kind: 'lockout', locked_until: at(0) })
    })

    test('the row of a missing environment is refused', async () => {
      const message = await rejectionOf(
        insert({ environment_id: crypto.randomUUID(), key_hash: keyHash('orphan') })
      )
      expect(message).toContain('attempt_counters_environment_id_environments_id_fk')
    })

    test('it keeps no address: the columns are an environment, a kind, a hash, counts and times', async () => {
      const columns = await owner.query<{ column: string; type: string }>(
        `select column_name as column, data_type as type from information_schema.columns
          where table_schema = 'auth' and table_name = 'attempt_counters' order by ordinal_position`
      )
      expect(columns.rows).toEqual([
        { column: 'environment_id', type: 'uuid' },
        { column: 'kind', type: 'text' },
        { column: 'key_hash', type: 'bytea' },
        { column: 'hits', type: 'integer' },
        { column: 'started_at', type: 'timestamp with time zone' },
        { column: 'locked_until', type: 'timestamp with time zone' },
        { column: 'expires_at', type: 'timestamp with time zone' },
      ])
    })
  })

  describe('the lockout statement', () => {
    test('five free failures, then the waits double up to the cap, as the schedule says', async () => {
      const hash = keyHash('schedule')
      const environmentId = region.a.environmentId
      for (let failure = 1; failure <= 16; failure++) {
        const wait = SCHEDULE[Math.min(failure, SCHEDULE.length) - 1] ?? 0
        expect(await attempt(authPool, environmentId, hash), `failure ${failure}`).toEqual({
          allowed: true,
          hits: failure,
          waitMs: wait,
        })
        // The lock has to pass before the next failure can be counted.
        await unlock(environmentId, hash)
      }
      expect(SCHEDULE.at(-1)).toBe(POLICY.maxDelayMs)
    })

    test('a locked address refuses, is not counted, and says how long is left', async () => {
      const hash = keyHash('refuse')
      const environmentId = region.a.environmentId
      for (let failure = 1; failure <= 6; failure++) {
        expect(await attempt(authPool, environmentId, hash)).toMatchObject({ allowed: true })
      }
      expect(await attempt(authPool, environmentId, hash)).toEqual({ allowed: false })
      expect((await rowOf(environmentId, hash)).hits).toBe(6)
      const left = await retryAfter(environmentId, hash)
      expect(left).toBeGreaterThan(0)
      expect(left).toBeLessThanOrEqual(30_000)
    })

    test('a lock refuses whatever the client passes: it carries no time, and a zero schedule changes nothing', async () => {
      const hash = keyHash('refuse-any-client')
      const environmentId = region.a.environmentId
      for (let failure = 1; failure <= 6; failure++) {
        await attempt(authPool, environmentId, hash)
      }
      const result = await authPool.query(LOCKOUT_ATTEMPT, [
        environmentId,
        hash,
        SCHEDULE.map(() => 0),
        0,
      ])
      expect(result.rows).toEqual([])
    })

    test('a lock that has just passed by the database clock lets the next attempt through', async () => {
      const hash = keyHash('boundary')
      const environmentId = region.a.environmentId
      for (let failure = 1; failure <= 6; failure++) {
        await attempt(authPool, environmentId, hash)
      }
      expect(await attempt(authPool, environmentId, hash)).toEqual({ allowed: false })
      await unlock(environmentId, hash)
      expect(await attempt(authPool, environmentId, hash)).toEqual({
        allowed: true,
        hits: 7,
        waitMs: 60_000,
      })
    })

    test('failures are forgotten after the quiet period and counted from one again', async () => {
      const hash = keyHash('forget')
      const environmentId = region.a.environmentId
      for (let failure = 1; failure <= 6; failure++) {
        await attempt(authPool, environmentId, hash)
      }
      // Just inside the period the lock is over, the row lives, and the count goes on.
      await backdate(environmentId, hash, 30_000 + POLICY.forgetAfterMs - 60_000)
      expect(await attempt(authPool, environmentId, hash)).toMatchObject({ allowed: true, hits: 7 })
      // Past the period it starts over.
      await backdate(environmentId, hash, 60_000 + POLICY.forgetAfterMs + 1_000)
      const before = await rowOf(environmentId, hash)
      expect(await attempt(authPool, environmentId, hash)).toEqual({
        allowed: true,
        hits: 1,
        waitMs: 0,
      })
      const after = await rowOf(environmentId, hash)
      expect(after.started_at.getTime()).toBeGreaterThan(before.started_at.getTime())
    })

    test('a right password clears the lockout by one delete', async () => {
      const hash = keyHash('clear')
      const environmentId = region.a.environmentId
      for (let failure = 1; failure <= 6; failure++) {
        await attempt(authPool, environmentId, hash)
      }
      const cleared = await authPool.query(LOCKOUT_CLEAR, [environmentId, hash])
      expect(cleared.rowCount).toBe(1)
      expect(await attempt(authPool, environmentId, hash)).toMatchObject({ allowed: true, hits: 1 })
    })

    test('the same key in two environments, and as a rate limit, is counted apart', async () => {
      const hash = keyHash('apart')
      for (let failure = 1; failure <= 6; failure++) {
        await attempt(authPool, region.a.environmentId, hash)
      }
      expect(await attempt(authPool, region.a.environmentId, hash)).toEqual({ allowed: false })
      expect(await attempt(authPool, region.b.environmentId, hash)).toMatchObject({
        allowed: true,
        hits: 1,
      })
      expect(await hit(authPool, region.a.environmentId, hash, 60_000)).toMatchObject({ hits: 1 })
    })
  })

  describe('durations a caller passes cannot make a statement throw', () => {
    const FLOOR_SECONDS = COUNTER_MIN_PERIOD_MS / 1000

    /** Seconds from a row's `from` column to its expiry, computed by the database. */
    const spanOf = async (
      environmentId: string,
      hash: Buffer,
      from: 'locked_until' | 'started_at'
    ): Promise<number> =>
      (
        await owner.query<{ seconds: number }>(
          `select extract(epoch from expires_at - ${from})::float8 as seconds
             from auth.attempt_counters where environment_id = $1 and key_hash = $2`,
          [environmentId, hash]
        )
      ).rows[0]?.seconds ?? Number.NaN

    test.each([0, -5, null, 1])(
      'a lockout forgetting period of %p is raised to the floor, on a new row and on a conflict',
      async (period) => {
        const hash = keyHash(`period-${period}`)
        const environmentId = region.a.environmentId
        const run = () => authPool.query(LOCKOUT_ATTEMPT, [environmentId, hash, [0, 0, 0], period])
        expect((await run()).rows).toHaveLength(1)
        expect(await spanOf(environmentId, hash, 'locked_until')).toBeGreaterThanOrEqual(
          FLOOR_SECONDS
        )
        expect((await run()).rows).toHaveLength(1)
        expect(await spanOf(environmentId, hash, 'locked_until')).toBeGreaterThanOrEqual(
          FLOOR_SECONDS
        )
        expect((await rowOf(environmentId, hash)).hits).toBe(2)
      }
    )

    test.each([[[]], [[-5]], [[0]], [[null]]])(
      'a wait schedule of %j counts as no wait, on a new row and on a conflict',
      async (schedule) => {
        const hash = keyHash(`schedule-${JSON.stringify(schedule)}`)
        const environmentId = region.a.environmentId
        const run = () =>
          authPool.query<{ hits: number; wait_ms: number }>(LOCKOUT_ATTEMPT, [
            environmentId,
            hash,
            schedule,
            0,
          ])
        expect((await run()).rows).toEqual([{ hits: 1, wait_ms: 0 }])
        expect((await run()).rows).toEqual([{ hits: 2, wait_ms: 0 }])
      }
    )

    test.each([0, -5, null, 1])(
      'a rate-limit window of %p is raised to the floor, on a new row and on a conflict',
      async (window) => {
        const hash = keyHash(`window-${window}`)
        const environmentId = region.a.environmentId
        const run = () => authPool.query(RATE_HIT, [environmentId, hash, window])
        expect((await run()).rows).toHaveLength(1)
        expect(await spanOf(environmentId, hash, 'started_at')).toBeGreaterThanOrEqual(
          FLOOR_SECONDS
        )
        expect((await run()).rows).toHaveLength(1)
      }
    )
  })

  describe('the rate-limit statement', () => {
    test('counts in a fixed window, and says how long the window has left', async () => {
      const hash = keyHash('window')
      const environmentId = region.a.environmentId
      const first = await hit(authPool, environmentId, hash, 60_000)
      expect(first?.hits).toBe(1)
      expect(first?.retry_after_ms).toBeGreaterThan(0)
      expect(first?.retry_after_ms).toBeLessThanOrEqual(60_000)
      expect((await hit(authPool, environmentId, hash, 60_000))?.hits).toBe(2)
      // Requests over the limit are still counted, as the memory adapter counts them.
      expect((await hit(authPool, environmentId, hash, 60_000))?.hits).toBe(3)
    })

    test('a window that has ended by the database clock starts a new one', async () => {
      const hash = keyHash('window-end')
      const environmentId = region.a.environmentId
      await hit(authPool, environmentId, hash, 60_000)
      await hit(authPool, environmentId, hash, 60_000)
      // A moment inside the window: still the same window.
      await authPool.query(
        `update auth.attempt_counters set started_at = started_at - interval '30 seconds',
            expires_at = expires_at - interval '30 seconds'
          where environment_id = $1 and key_hash = $2`,
        [environmentId, hash]
      )
      expect((await hit(authPool, environmentId, hash, 60_000))?.hits).toBe(3)
      const before = await rowOf(environmentId, hash)
      // Past its end: a new window of one.
      await authPool.query(
        `update auth.attempt_counters set expires_at = clock_timestamp()
          where environment_id = $1 and key_hash = $2`,
        [environmentId, hash]
      )
      expect((await hit(authPool, environmentId, hash, 60_000))?.hits).toBe(1)
      const after = await rowOf(environmentId, hash)
      expect(after.started_at.getTime()).toBeGreaterThan(before.started_at.getTime())
    })
  })

  describe('several instances at once', () => {
    test('six wrong passwords split across two instances lock the sixth', async () => {
      const hash = keyHash('two-instances')
      const environmentId = region.a.environmentId
      const instances = [authPool, otherInstance]
      for (let failure = 1; failure <= 6; failure++) {
        const result = await attempt(instances[failure % 2] ?? authPool, environmentId, hash)
        expect(result, `failure ${failure}`).toMatchObject({ allowed: true, hits: failure })
      }
      for (const instance of instances) {
        expect(await attempt(instance, environmentId, hash)).toEqual({ allowed: false })
      }
    })

    /** Wait until the backend `pid` is waiting for a lock (bounded by tries, not by a clock). */
    const untilBlocked = async (pid: number): Promise<void> => {
      for (let tries = 0; tries < 2000; tries++) {
        const waiting = await owner.query('select 1 from pg_locks where pid = $1 and not granted', [
          pid,
        ])
        if (waiting.rowCount) {
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 5))
      }
      throw new Error(`backend ${pid} never waited for a lock`)
    }

    /** Two connections of two "instances", in either order of who goes first. */
    const connections = async (swap: boolean) => {
      const [a, b] = await Promise.all([authPool.connect(), otherInstance.connect()])
      const [first, second] = swap ? [b, a] : [a, b]
      const pid = (await second.query<{ pid: number }>('select pg_backend_pid() as pid')).rows[0]
        ?.pid
      if (pid === undefined) {
        throw new Error('no backend pid')
      }
      return { first, second, pid }
    }

    test.each([false, true])(
      'a failure that waits for another instance’s open transaction is added, not lost or refused (swapped: %p)',
      async (swap) => {
        const hash = keyHash(`wait-update-${swap}`)
        const environmentId = region.a.environmentId
        await attempt(authPool, environmentId, hash)
        const { first, second, pid } = await connections(swap)
        try {
          await first.query('begin')
          await second.query('begin')
          expect(await attempt(first, environmentId, hash)).toMatchObject({
            allowed: true,
            hits: 2,
          })
          const waiting = attempt(second, environmentId, hash)
          await untilBlocked(pid)
          // A reading of the database clock taken while the second statement is already waiting for
          // the row and the first transaction still holds it.
          const held = (await first.query<{ t: Date }>('select clock_timestamp() as t')).rows[0]?.t
          await first.query('commit')
          // The second statement reads its clock after the row lock, so its times cannot precede
          // the first's: it is counted, with no constraint violated.
          expect(await waiting).toMatchObject({ allowed: true, hits: 3 })
          await second.query('commit')
          // Free failures lock until the instant they are counted, so the stored lock is the
          // second statement's own clock reading. That statement was issued before `held` was
          // read: a tick taken at statement start would be earlier than `held` and fail here; one
          // taken after the lock follows the first commit, which follows `held`.
          const stored = await rowOf(environmentId, hash)
          expect(stored.locked_until.getTime()).toBeGreaterThanOrEqual(held?.getTime() ?? Infinity)
        } finally {
          first.release()
          second.release()
        }
        expect((await rowOf(environmentId, hash)).hits).toBe(3)
      }
    )

    test.each([false, true])(
      'two first failures that race for a new row are both counted (swapped: %p)',
      async (swap) => {
        const hash = keyHash(`wait-insert-${swap}`)
        const environmentId = region.a.environmentId
        const { first, second, pid } = await connections(swap)
        try {
          await first.query('begin')
          await second.query('begin')
          expect(await attempt(first, environmentId, hash)).toMatchObject({
            allowed: true,
            hits: 1,
          })
          const waiting = attempt(second, environmentId, hash)
          await untilBlocked(pid)
          await first.query('commit')
          expect(await waiting).toMatchObject({ allowed: true, hits: 2 })
          await second.query('commit')
        } finally {
          first.release()
          second.release()
        }
        expect((await rowOf(environmentId, hash)).hits).toBe(2)
      }
    )

    test.each([false, true])(
      'two rate-limit hits that wait on each other are both counted (swapped: %p)',
      async (swap) => {
        const hash = keyHash(`wait-rate-${swap}`)
        const environmentId = region.a.environmentId
        const { first, second, pid } = await connections(swap)
        try {
          await first.query('begin')
          await second.query('begin')
          expect((await hit(first, environmentId, hash, 60_000))?.hits).toBe(1)
          const waiting = hit(second, environmentId, hash, 60_000)
          await untilBlocked(pid)
          await first.query('commit')
          expect((await waiting)?.hits).toBe(2)
          await second.query('commit')
        } finally {
          first.release()
          second.release()
        }
      }
    )

    test('fifty simultaneous hits over several connections are fifty', async () => {
      const hash = keyHash('fifty')
      const environmentId = region.a.environmentId
      const results = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          hit(i % 2 ? authPool : otherInstance, environmentId, hash, 60_000)
        )
      )
      expect(results.map((row) => row?.hits).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual(
        Array.from({ length: 50 }, (_, i) => i + 1)
      )
      expect((await rowOf(environmentId, hash)).hits).toBe(50)
    })
  })

  describe('where it sits in the isolation check', () => {
    test('it is a control-plane table with a reason, not an Organization-allowlist table', () => {
      expect(CONTROL_PLANE_TABLES).toContain('auth.attempt_counters')
      expect(CONTROL_PLANE_TABLE_REASONS['auth.attempt_counters']).toContain('keyed hash')
      expect(NON_TENANT_TABLES).not.toContain('auth.attempt_counters')
    })

    test('the catalog check passes with it, and it has no organization_id and no row-level security', async () => {
      const handle = createDb(env.auth, { max: 1 })
      try {
        expect(await findTenantIsolationGaps(handle.db)).toEqual([])
      } finally {
        await handle.close()
      }
      const found = await owner.query<{ enabled: boolean; policies: number; org: number }>(
        `select c.relrowsecurity as enabled,
                (select count(*)::int from pg_policies
                  where schemaname = 'auth' and tablename = 'attempt_counters') as policies,
                (select count(*)::int from information_schema.columns
                  where table_schema = 'auth' and table_name = 'attempt_counters'
                    and column_name = 'organization_id') as org
           from pg_class c where c.oid = 'auth.attempt_counters'::regclass`
      )
      expect(found.rows).toEqual([{ enabled: false, policies: 0, org: 0 }])
    })

    test('without row-level security every environment’s rows are visible, which is why they hold only hashes', async () => {
      const hash = keyHash('visible')
      await hit(authPool, region.b.environmentId, hash, 60_000)
      const seen = await authPool.query(
        'select hits from auth.attempt_counters where key_hash = $1',
        [hash]
      )
      expect(seen.rows).toEqual([{ hits: 1 }])
    })

    test('the service role can clear another environment’s counter in the same Region, as with the other control-plane tables', async () => {
      const hash = keyHash('cross-environment')
      await attempt(authPool, region.b.environmentId, hash)
      const removed = await authPool.query(LOCKOUT_CLEAR, [region.b.environmentId, hash])
      expect(removed.rowCount).toBe(1)
    })
  })

  describe('grants', () => {
    test('the service role updates the four counter columns, and no others', async () => {
      const hash = keyHash('grant')
      await hit(authPool, region.a.environmentId, hash, 60_000)
      const allowed = await authPool.query(
        `update auth.attempt_counters set hits = 2, started_at = $2, expires_at = $3
          where key_hash = $1`,
        [hash, at(0), at(90_000)]
      )
      expect(allowed.rowCount).toBe(1)
      for (const set of [
        'environment_id = gen_random_uuid()',
        `kind = 'lockout'`,
        `key_hash = '\\x00'::bytea`,
      ]) {
        const message = await rejectionOf(
          authPool.query(`update auth.attempt_counters set ${set} where key_hash = $1`, [hash])
        )
        expect(message, set).toContain('permission denied for table attempt_counters')
      }
    })

    test('the service role cannot empty the table wholesale, and the other service roles cannot reach it', async () => {
      expect(await rejectionOf(authPool.query('truncate auth.attempt_counters'))).toContain(
        'permission denied for table attempt_counters'
      )
      expect(await rejectionOf(corePool.query('select 1 from auth.attempt_counters'))).toContain(
        'permission denied'
      )
    })
  })

  describe('the purge', () => {
    const TOTAL = 6000
    const EXPIRED = 700

    beforeAll(async () => {
      // Most rows live on; EXPIRED have ended. The owner seeds them (rows are not under row-level
      // security) so the statistics reflect a table that has seen traffic.
      await owner.query(
        `insert into auth.attempt_counters (environment_id, kind, key_hash, hits, started_at, expires_at)
         select $1, 'rate_limit', sha256((($3::text) || n::text)::bytea), 1, now() - interval '2 days',
                case when n <= $2 then now() - interval '1 day' - make_interval(secs => n)
                     else now() + make_interval(secs => n) end
           from generate_series(1, $4::int) n`,
        [region.a.environmentId, EXPIRED, `purge-${suffix}-`, TOTAL]
      )
      await owner.query('vacuum analyze auth.attempt_counters')
    })

    const plan = async (sql: string, params: unknown[]): Promise<string> => {
      const result = await authPool.query<{ 'QUERY PLAN': object }>(
        `explain (format json) ${sql}`,
        params
      )
      return JSON.stringify(result.rows[0]?.['QUERY PLAN'])
    }

    // The selection inside COUNTER_PURGE_BATCH.
    const BATCH = `select environment_id, kind, key_hash from auth.attempt_counters
                    where expires_at < clock_timestamp() - interval '1 minute'
                    order by expires_at
                    limit $1
                      for update skip locked`

    test('the batch of expired rows, oldest first, uses the purge index', async () => {
      const text = await plan(BATCH, [100])
      expect(text).toContain('attempt_counters_purge_idx')
      expect(text).not.toContain('Seq Scan')
      expect(text).not.toContain('"Sort"')
    })

    test('the selection is the one inside the purge statement', () => {
      const flat = (text: string) => text.replace(/\s+/g, ' ').trim()
      expect(flat(COUNTER_PURGE_BATCH)).toContain(flat(BATCH))
    })

    test('a count lookup by environment, kind and key uses the primary key', async () => {
      const text = await plan(
        `select hits, locked_until from auth.attempt_counters
          where environment_id = $1 and kind = 'lockout' and key_hash = $2`,
        [region.a.environmentId, keyHash('nothing')]
      )
      expect(text).toContain('attempt_counters_pkey')
      expect(text).not.toContain('Seq Scan')
    })

    test('two purges at once take different rows, in batches no larger than asked', async () => {
      const first = await authPool.connect()
      const second = await otherInstance.connect()
      try {
        await first.query('begin')
        await second.query('begin')
        const one = await first.query(BATCH, [300])
        const two = await second.query(BATCH, [300])
        expect(one.rows).toHaveLength(300)
        expect(two.rows.length).toBeGreaterThan(0)
        expect(two.rows.length).toBeLessThanOrEqual(300)
        const keys = [...one.rows, ...two.rows].map((row) =>
          Buffer.from(row.key_hash).toString('hex')
        )
        expect(new Set(keys).size).toBe(keys.length)
      } finally {
        await first.query('rollback')
        await second.query('rollback')
        first.release()
        second.release()
      }
    })

    test('the purge statement removes the expired rows batch by batch and only them', async () => {
      const live = () =>
        owner.query<{ n: number }>(
          `select count(*)::int as n from auth.attempt_counters
            where expires_at >= clock_timestamp() - interval '1 minute'`
        )
      const before = await live()
      const removed: number[] = []
      for (;;) {
        const result = await authPool.query(COUNTER_PURGE_BATCH, [250])
        removed.push(result.rowCount ?? 0)
        if ((result.rowCount ?? 0) < 250) {
          break
        }
      }
      expect(Math.max(...removed)).toBeLessThanOrEqual(250)
      expect(removed.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(EXPIRED)
      expect((await live()).rows[0]?.n).toBe(before.rows[0]?.n)
    })
  })

  describe('the migration on its own database', () => {
    const databases: string[] = []
    let admin: Pool
    let folder: string

    /** The owner connection string for a fresh scratch database in the same cluster. */
    async function scratch(label: string): Promise<string> {
      const name = `it_migrate_${label}_${suffix}`
      await admin.query(`create database "${name}" owner closeline_owner`)
      databases.push(name)
      const url = new URL(env.owner)
      url.pathname = `/${name}`
      return url.toString()
    }

    const withOwner = async <T>(url: string, fn: (pool: Pool) => Promise<T>): Promise<T> => {
      const pool = new Pool({ connectionString: url, max: 1 })
      try {
        return await fn(pool)
      } finally {
        await pool.end()
      }
    }

    const state = (pool: Pool) =>
      pool.query<{ present: boolean; rls: boolean | null; selects: boolean; updatesKey: boolean }>(
        `select to_regclass('auth.attempt_counters') is not null as present,
                (select relrowsecurity from pg_class where oid = to_regclass('auth.attempt_counters')) as rls,
                coalesce(has_table_privilege('closeline_auth', to_regclass('auth.attempt_counters'), 'SELECT'), false) as selects,
                coalesce(has_column_privilege('closeline_auth', to_regclass('auth.attempt_counters'), 'key_hash', 'UPDATE'), false) as "updatesKey"`
      )

    beforeAll(async () => {
      admin = new Pool({ connectionString: adminUrl(), max: 1 })
      // The migrations up to and including 0006, as a folder of their own.
      folder = mkdtempSync(join(tmpdir(), 'closeline-db-at-0006-'))
      mkdirSync(join(folder, 'meta'))
      const journal = JSON.parse(readFileSync(join(MIGRATIONS, 'meta', '_journal.json'), 'utf8'))
      journal.entries = journal.entries.filter((e: { tag: string }) => e.tag < '0007')
      writeFileSync(join(folder, 'meta', '_journal.json'), JSON.stringify(journal))
      for (const entry of journal.entries as { tag: string }[]) {
        cpSync(join(MIGRATIONS, `${entry.tag}.sql`), join(folder, `${entry.tag}.sql`))
      }
      const stale = await admin.query<{ datname: string }>(
        "select datname from pg_database where datname like 'it\\_migrate\\_%'"
      )
      for (const { datname } of stale.rows) {
        await dropTestDatabase(admin, datname)
      }
    })

    afterAll(async () => {
      for (const name of databases) {
        await dropTestDatabase(admin, name)
      }
      await admin.end()
      rmSync(folder, { recursive: true, force: true })
    })

    test('applies on a fresh database', async () => {
      const url = await scratch('counters_fresh')
      await runMigrations(url)
      const found = await withOwner(url, state)
      expect(found.rows).toEqual([{ present: true, rls: false, selects: true, updatesKey: false }])
    })

    test('the check would report it if the table ever gained an organization_id column', async () => {
      const url = await scratch('counters_isolation')
      await runMigrations(url)
      await withOwner(url, (pool) =>
        pool.query('alter table auth.attempt_counters add column organization_id text')
      )
      const handle = createDb(url, { max: 1 })
      try {
        const gaps = await findTenantIsolationGaps(handle.db)
        expect(gaps.filter((gap) => gap.table === 'attempt_counters')).toEqual([
          {
            schema: 'auth',
            table: 'attempt_counters',
            reason: expect.stringContaining('organization_id'),
          },
        ])
      } finally {
        await handle.close()
      }
    })

    test('applies on a database at 0006 that already holds auth rows', async () => {
      const url = await scratch('counters_at0006')
      await runMigrations(url, { migrationsFolder: folder })
      await withOwner(url, async (pool) => {
        expect((await state(pool)).rows[0]?.present).toBe(false)
        await pool.query('insert into auth.workspaces (id, name) values ($1, $2)', [
          crypto.randomUUID(),
          'w',
        ])
      })
      await runMigrations(url)
      const found = await withOwner(url, state)
      expect(found.rows).toEqual([{ present: true, rls: false, selects: true, updatesKey: false }])
    })
  })
})
