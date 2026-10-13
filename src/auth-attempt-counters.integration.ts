import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool, type QueryResult, type QueryResultRow } from 'pg'
import { createDb, type DbHandle } from './client'
import {
  type AuthRegion,
  adminUrl,
  dropStaleTestObjects,
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

/** The delays for failures 1 to 12; the last applies to every failure after it. */
const SCHEDULE = Array.from({ length: 12 }, (_, i) => delayMs(i + 1))

/** The failure count a lockout statement would give the row, as the statement writes it. */
const NEXT_HITS = 'case when c.expires_at <= $3::timestamptz then 1 else c.hits + 1 end'

/** One failed or attempted sign-in: the README's statement, one round trip. */
const LOCKOUT_ATTEMPT = `
  insert into auth.attempt_counters as c
    (environment_id, kind, key_hash, hits, started_at, locked_until, expires_at)
  values ($1, 'lockout', $2, 1, $3::timestamptz,
          $3::timestamptz + make_interval(secs => ($4::int[])[1]::float8 / 1000),
          $3::timestamptz + make_interval(secs => (($4::int[])[1] + $5::int)::float8 / 1000))
  on conflict (environment_id, kind, key_hash) do update set
    hits = least(${NEXT_HITS}, 1000000),
    started_at = case when c.expires_at <= $3::timestamptz then $3::timestamptz else c.started_at end,
    locked_until = $3::timestamptz + make_interval(secs =>
      ($4::int[])[least(${NEXT_HITS}, cardinality($4::int[]))]::float8 / 1000),
    expires_at = $3::timestamptz + make_interval(secs =>
      (($4::int[])[least(${NEXT_HITS}, cardinality($4::int[]))] + $5::int)::float8 / 1000)
  where c.locked_until <= $3::timestamptz
  returning hits, locked_until`

/** One request against a fixed-window limit. */
const RATE_HIT = `
  insert into auth.attempt_counters as c (environment_id, kind, key_hash, hits, started_at, expires_at)
  values ($1, 'rate_limit', $2, 1, $3::timestamptz,
          $3::timestamptz + make_interval(secs => $4::float8 / 1000))
  on conflict (environment_id, kind, key_hash) do update set
    hits = case when c.expires_at <= $3::timestamptz then 1 else least(c.hits + 1, 1000000) end,
    started_at = case when c.expires_at <= $3::timestamptz then $3::timestamptz else c.started_at end,
    expires_at = case when c.expires_at <= $3::timestamptz
                      then $3::timestamptz + make_interval(secs => $4::float8 / 1000)
                      else c.expires_at end
  returning hits, expires_at`

/** What `attempt` and `hit` need: a pool, or one connection of it inside a transaction. */
interface Queryable {
  query<R extends QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<R>>
}

/** A fixed 32-byte stand-in for the service's keyed hash of a key. */
const keyHash = (label: string): Buffer => {
  const bytes = new Bun.CryptoHasher('sha256').update(`${suffix}:${label}`).digest()
  return Buffer.from(bytes)
}

const at = (ms: number): Date => new Date(Date.UTC(2030, 0, 1) + ms)

describe('auth.attempt_counters', () => {
  let owner: Pool
  let authPool: Pool
  let otherInstance: Pool
  let corePool: Pool
  let handle: DbHandle
  let region: AuthRegion
  let seq = 0

  const attempt = async (db: Queryable, environmentId: string, hash: Buffer, now: Date) => {
    const result = await db.query<{ hits: number; locked_until: Date }>(LOCKOUT_ATTEMPT, [
      environmentId,
      hash,
      now,
      SCHEDULE,
      POLICY.forgetAfterMs,
    ])
    const row = result.rows[0]
    return row
      ? { allowed: true as const, hits: row.hits, lockedUntil: row.locked_until }
      : { allowed: false as const }
  }

  const hit = async (
    db: Queryable,
    environmentId: string,
    hash: Buffer,
    now: Date,
    windowMs: number
  ) => {
    const result = await db.query<{ hits: number; expires_at: Date }>(RATE_HIT, [
      environmentId,
      hash,
      now,
      windowMs,
    ])
    return result.rows[0]
  }

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
    handle = createDb(env.auth, { max: 2 })
    region = await seedAuthRegion(authPool)
  })

  afterAll(async () => {
    await owner.query('delete from auth.workspaces where id = $1', [region?.workspaceId])
    await handle.close()
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
        'a lock before the count began',
        { kind: 'lockout', locked_until: at(-1) },
        'attempt_counters_lock_within_window',
      ],
      [
        'a lock past the row expiring',
        { kind: 'lockout', locked_until: at(60_001) },
        'attempt_counters_lock_within_window',
      ],
    ])('refuses %s', async (_name, columns, constraint) => {
      expect(await rejectionOf(insert(columns))).toContain(constraint)
    })

    test.each([
      ['a rate limit at the bound', { hits: 1_000_000 }],
      ['a lockout locked for the whole window', { kind: 'lockout', locked_until: at(60_000) }],
      ['a lockout not yet locked', { kind: 'lockout', locked_until: at(0) }],
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

    test('the row of a missing environment is refused, and goes with its environment', async () => {
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
    test('five free failures, then waits that double, and a refused attempt is not counted', async () => {
      const hash = keyHash('schedule')
      const env = region.a.environmentId
      let now = 0
      for (let failure = 1; failure <= 5; failure++) {
        const result = await attempt(authPool, env, hash, at(now))
        expect(result).toEqual({ allowed: true, hits: failure, lockedUntil: at(now) })
      }
      const sixth = await attempt(authPool, env, hash, at(now))
      expect(sixth).toEqual({ allowed: true, hits: 6, lockedUntil: at(now + 30_000) })
      // Locked: refused, and the count stays at 6.
      expect(await attempt(authPool, env, hash, at(now + 29_999))).toEqual({ allowed: false })
      expect((await rowOf(env, hash)).hits).toBe(6)
      // At the lock's end the next failure is allowed and waits twice as long.
      now += 30_000
      expect(await attempt(authPool, env, hash, at(now))).toEqual({
        allowed: true,
        hits: 7,
        lockedUntil: at(now + 60_000),
      })
    })

    test('each failure waits as long as the schedule says, and no longer than the cap', async () => {
      const hash = keyHash('cap')
      let now = 0
      for (let failure = 1; failure <= 16; failure++) {
        const wait = SCHEDULE[Math.min(failure, SCHEDULE.length) - 1] ?? 0
        expect(
          await attempt(authPool, region.a.environmentId, hash, at(now)),
          `failure ${failure}`
        ).toEqual({ allowed: true, hits: failure, lockedUntil: at(now + wait) })
        now += wait
      }
      expect(SCHEDULE.at(-1)).toBe(POLICY.maxDelayMs)
    })

    test('failures are forgotten after the quiet period and counted from one again', async () => {
      const hash = keyHash('forget')
      const env = region.a.environmentId
      for (let failure = 1; failure <= 6; failure++) {
        await attempt(authPool, env, hash, at(0))
      }
      const row = await rowOf(env, hash)
      // Locked for 30 s, forgotten an hour after that.
      expect(row.expires_at).toEqual(at(30_000 + POLICY.forgetAfterMs))
      expect(
        await attempt(authPool, env, hash, at(30_000 + POLICY.forgetAfterMs - 1))
      ).toMatchObject({ allowed: true, hits: 7 })
      const later = at(30_000 + POLICY.forgetAfterMs + 60_000 + 3_600_000)
      expect(await attempt(authPool, env, hash, later)).toEqual({
        allowed: true,
        hits: 1,
        lockedUntil: later,
      })
      expect((await rowOf(env, hash)).started_at).toEqual(later)
    })

    test('a right password clears the lockout by one delete', async () => {
      const hash = keyHash('clear')
      const env = region.a.environmentId
      for (let failure = 1; failure <= 6; failure++) {
        await attempt(authPool, env, hash, at(0))
      }
      const cleared = await authPool.query(
        `delete from auth.attempt_counters where environment_id = $1 and kind = 'lockout' and key_hash = $2`,
        [env, hash]
      )
      expect(cleared.rowCount).toBe(1)
      expect(await attempt(authPool, env, hash, at(1))).toMatchObject({ allowed: true, hits: 1 })
    })

    test('the same key in two environments, and as a rate limit, is counted apart', async () => {
      const hash = keyHash('apart')
      for (let failure = 1; failure <= 6; failure++) {
        await attempt(authPool, region.a.environmentId, hash, at(0))
      }
      expect(await attempt(authPool, region.a.environmentId, hash, at(1))).toEqual({
        allowed: false,
      })
      expect(await attempt(authPool, region.b.environmentId, hash, at(1))).toMatchObject({
        allowed: true,
        hits: 1,
      })
      expect(await hit(authPool, region.a.environmentId, hash, at(1), 60_000)).toMatchObject({
        hits: 1,
      })
    })
  })

  describe('the rate-limit statement', () => {
    test('counts in a fixed window and starts a new one when it ends', async () => {
      const hash = keyHash('window')
      const env = region.a.environmentId
      expect(await hit(authPool, env, hash, at(0), 60_000)).toEqual({
        hits: 1,
        expires_at: at(60_000),
      })
      expect(await hit(authPool, env, hash, at(59_999), 60_000)).toEqual({
        hits: 2,
        expires_at: at(60_000),
      })
      // Requests over the limit are still counted, as the memory adapter counts them.
      expect(await hit(authPool, env, hash, at(59_999), 60_000)).toMatchObject({ hits: 3 })
      expect(await hit(authPool, env, hash, at(60_000), 60_000)).toEqual({
        hits: 1,
        expires_at: at(120_000),
      })
      expect((await rowOf(env, hash)).started_at).toEqual(at(60_000))
    })
  })

  describe('several instances at once', () => {
    test('six wrong passwords split across two instances lock the sixth', async () => {
      const hash = keyHash('two-instances')
      const env = region.a.environmentId
      const instances = [authPool, otherInstance]
      for (let failure = 1; failure <= 6; failure++) {
        const result = await attempt(instances[failure % 2] ?? authPool, env, hash, at(0))
        expect(result, `failure ${failure}`).toMatchObject({ allowed: true, hits: failure })
      }
      for (const instance of instances) {
        expect(await attempt(instance, env, hash, at(1))).toEqual({ allowed: false })
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

    const twoConnections = async () => {
      const [first, second] = await Promise.all([authPool.connect(), otherInstance.connect()])
      const pid = (await second.query<{ pid: number }>('select pg_backend_pid() as pid')).rows[0]
        ?.pid
      if (pid === undefined) {
        throw new Error('no backend pid')
      }
      return { first, second, pid }
    }

    test('an increment that waits for another instance’s open transaction is added, not lost', async () => {
      const hash = keyHash('wait-update')
      const env = region.a.environmentId
      await hit(authPool, env, hash, at(0), 60_000)
      const { first, second, pid } = await twoConnections()
      try {
        await first.query('begin')
        await second.query('begin')
        expect((await hit(first, env, hash, at(1), 60_000))?.hits).toBe(2)
        const waiting = hit(second, env, hash, at(2), 60_000)
        await untilBlocked(pid)
        await first.query('commit')
        expect((await waiting)?.hits).toBe(3)
        await second.query('commit')
      } finally {
        first.release()
        second.release()
      }
      expect((await rowOf(env, hash)).hits).toBe(3)
    })

    test('two first failures that race for a new row are both counted', async () => {
      const hash = keyHash('wait-insert')
      const env = region.a.environmentId
      const { first, second, pid } = await twoConnections()
      try {
        await first.query('begin')
        await second.query('begin')
        expect(await attempt(first, env, hash, at(0))).toMatchObject({ allowed: true, hits: 1 })
        const waiting = attempt(second, env, hash, at(0))
        await untilBlocked(pid)
        await first.query('commit')
        expect(await waiting).toMatchObject({ allowed: true, hits: 2 })
        await second.query('commit')
      } finally {
        first.release()
        second.release()
      }
      expect((await rowOf(env, hash)).hits).toBe(2)
    })

    test('fifty simultaneous hits over several connections are fifty', async () => {
      const hash = keyHash('fifty')
      const env = region.a.environmentId
      const results = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          hit(i % 2 ? authPool : otherInstance, env, hash, at(i), 60_000)
        )
      )
      expect(results.map((row) => row?.hits).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual(
        Array.from({ length: 50 }, (_, i) => i + 1)
      )
      expect((await rowOf(env, hash)).hits).toBe(50)
    })
  })

  describe('where it sits in the isolation check', () => {
    test('it is a control-plane table with a reason, not an Organization-allowlist table', () => {
      expect(CONTROL_PLANE_TABLES).toContain('auth.attempt_counters')
      expect(CONTROL_PLANE_TABLE_REASONS['auth.attempt_counters']).toContain('keyed hash')
      expect(NON_TENANT_TABLES).not.toContain('auth.attempt_counters')
    })

    test('the catalog check passes with it, and has no organization_id and no row-level security', async () => {
      expect(await findTenantIsolationGaps(handle.db)).toEqual([])
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

    test('the check would report it if it ever gained an organization_id column', async () => {
      await owner.query('alter table auth.attempt_counters add column organization_id text')
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
        await owner.query('alter table auth.attempt_counters drop column organization_id')
      }
    })

    test('without row-level security every environment’s rows are visible, which is why they hold only hashes', async () => {
      const hash = keyHash('visible')
      await hit(authPool, region.b.environmentId, hash, at(0), 60_000)
      const seen = await authPool.query(
        'select hits from auth.attempt_counters where key_hash = $1',
        [hash]
      )
      expect(seen.rows).toEqual([{ hits: 1 }])
    })
  })

  describe('grants', () => {
    test('the service role updates the four counter columns, and no others', async () => {
      const hash = keyHash('grant')
      await hit(authPool, region.a.environmentId, hash, at(0), 60_000)
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

    const BATCH = `select environment_id, kind, key_hash from auth.attempt_counters
                    where expires_at < $1::timestamptz
                    order by expires_at
                    limit $2
                      for update skip locked`

    test('the batch of expired rows, oldest first, uses the purge index', async () => {
      const text = await plan(BATCH, [new Date(), 100])
      expect(text).toContain('attempt_counters_purge_idx')
      expect(text).not.toContain('Seq Scan')
      expect(text).not.toContain('"Sort"')
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
        const cutoff = new Date()
        const one = await first.query(BATCH, [cutoff, 300])
        const two = await second.query(BATCH, [cutoff, 300])
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

    test('deleting batch by batch removes the expired rows and only them', async () => {
      const cutoff = new Date()
      const purge = (size: number) =>
        authPool.query(
          `delete from auth.attempt_counters
            where (environment_id, kind, key_hash) in (${BATCH})`,
          [cutoff, size]
        )
      const before = await owner.query<{ n: number }>(
        'select count(*)::int as n from auth.attempt_counters where expires_at >= $1',
        [cutoff]
      )
      const removed: number[] = []
      for (;;) {
        const result = await purge(250)
        removed.push(result.rowCount ?? 0)
        if ((result.rowCount ?? 0) < 250) {
          break
        }
      }
      expect(Math.max(...removed)).toBeLessThanOrEqual(250)
      expect(removed.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(EXPIRED)
      const after = await owner.query<{ n: number }>(
        'select count(*)::int as n from auth.attempt_counters where expires_at >= $1',
        [cutoff]
      )
      expect(after.rows[0]?.n).toBe(before.rows[0]?.n)
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
        await admin.query(`drop database if exists "${datname}" with (force)`)
      }
    })

    afterAll(async () => {
      for (const name of databases) {
        await admin.query(`drop database if exists "${name}" with (force)`)
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
