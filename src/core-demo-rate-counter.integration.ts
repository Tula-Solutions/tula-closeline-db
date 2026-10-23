import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { Pool } from 'pg'
import { createDb, type DbHandle } from './client'
import { hitDemoRateLimit, purgeDemoRateCounters } from './core-demo-requests'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { findTenantIsolationGaps } from './isolation'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const TABLE = 'core.demo_rate_counter'

const newHash = (): Uint8Array => new Uint8Array(randomBytes(32))
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe('core demo rate counter', () => {
  let owner: Pool
  let core: Pool
  let auth: Pool
  let playbook: Pool
  let handle: DbHandle
  let coreHandle: DbHandle

  const hit = (addressHash: Uint8Array, limit = 10, windowSeconds = 3600) =>
    hitDemoRateLimit(coreHandle.db, { addressHash, windowSeconds, limit })

  /** The stored count for a hash, summed over its windows. */
  async function hitsOf(addressHash: Uint8Array): Promise<number> {
    const { rows } = await owner.query(
      `select coalesce(sum(hits), 0)::int as n from ${TABLE} where address_hash = $1`,
      [Buffer.from(addressHash)]
    )
    return rows[0].n
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    core = new Pool({ connectionString: env.core, max: 4 })
    auth = new Pool({ connectionString: env.auth, max: 1 })
    playbook = new Pool({ connectionString: env.playbook, max: 1 })
    handle = createDb(env.core, { max: 1 })
    coreHandle = createDb(env.core, { max: 20 })
    await owner.query(`delete from ${TABLE}`)
  })

  afterAll(async () => {
    await owner.query(`delete from ${TABLE}`)
    await dropStaleTestObjects(owner, env.owner)
    await handle.close()
    await coreHandle.close()
    await Promise.all([owner.end(), core.end(), auth.end(), playbook.end()])
  })

  describe('hit_demo_rate_limit', () => {
    test('with limit 10, eleven sequential hits give ten true then false', async () => {
      const addressHash = newHash()
      const answers: boolean[] = []
      for (let i = 0; i < 11; i++) {
        answers.push(await hit(addressHash, 10))
      }
      expect(answers).toEqual([...Array(10).fill(true), false])
      expect(await hitsOf(addressHash)).toBe(11)
    })

    test('a hash is counted apart from every other hash', async () => {
      const a = newHash()
      const b = newHash()
      expect(await hit(a, 1)).toBe(true)
      expect(await hit(a, 1)).toBe(false)
      expect(await hit(b, 1)).toBe(true)
    })

    test('a new window resets the count', async () => {
      const addressHash = newHash()
      expect(await hit(addressHash, 1, 1)).toBe(true)
      await sleep(1100)
      expect(await hit(addressHash, 1, 1)).toBe(true)
      const { rows } = await owner.query(`select hits from ${TABLE} where address_hash = $1`, [
        Buffer.from(addressHash),
      ])
      expect(rows.map((row) => row.hits)).toEqual([1, 1])
    })

    test('the window is aligned to its length', async () => {
      const addressHash = newHash()
      await hit(addressHash, 5, 3600)
      const { rows } = await owner.query(
        `select (extract(epoch from window_start)::bigint % 3600)::int as off,
                window_start <= now() and window_start > now() - interval '1 hour' as current
           from ${TABLE} where address_hash = $1`,
        [Buffer.from(addressHash)]
      )
      expect(rows).toEqual([{ off: 0, current: true }])
    })

    test('50 concurrent hits never allow more than the limit', async () => {
      const addressHash = newHash()
      const answers = await Promise.all(Array.from({ length: 50 }, () => hit(addressHash, 10)))
      expect(answers.filter(Boolean)).toHaveLength(10)
      expect(await hitsOf(addressHash)).toBe(50)
    })

    test('concurrent hits on a fresh hash are exact over many rounds', async () => {
      for (let round = 0; round < 5; round++) {
        const addressHash = newHash()
        const answers = await Promise.all(Array.from({ length: 30 }, () => hit(addressHash, 7)))
        expect(answers.filter(Boolean)).toHaveLength(7)
      }
    })

    test('the database refuses a bad hash, window or limit', async () => {
      const code = (params: unknown[]) =>
        core.query('select core.hit_demo_rate_limit($1, $2, $3)', params).then(
          () => null,
          (error: { code?: string }) => error.code
        )
      const good = Buffer.alloc(32, 1)
      expect(await code([Buffer.alloc(31), 60, 5])).toBe('22023')
      expect(await code([null, 60, 5])).toBe('22023')
      expect(await code([good, 0, 5])).toBe('22023')
      expect(await code([good, 86_401, 5])).toBe('22023')
      expect(await code([good, 60, 0])).toBe('22023')
    })
  })

  describe('the table', () => {
    test('has no raw address column and refuses a hash that is not 32 bytes', async () => {
      const { rows } = await owner.query(
        `select column_name from information_schema.columns
          where table_schema = 'core' and table_name = 'demo_rate_counter' order by column_name`
      )
      expect(rows.map((row) => row.column_name)).toEqual(['address_hash', 'hits', 'window_start'])
      const refused = await owner
        .query(`insert into ${TABLE} (address_hash, window_start, hits) values ($1, now(), 1)`, [
          Buffer.alloc(16),
        ])
        .then(
          () => null,
          (error: { constraint?: string }) => error.constraint
        )
      expect(refused).toBe('demo_rate_counter_address_hash_length')
    })

    test('stays closed to closeline_core and the catalog check passes', async () => {
      const refused = await core.query(`select * from ${TABLE}`).then(
        () => null,
        (error: { message?: string }) => error.message
      )
      expect(refused).toContain('permission denied for table demo_rate_counter')
      expect(await findTenantIsolationGaps(handle.db)).toEqual([])
    })
  })

  describe('purge_demo_rate_counters', () => {
    /** Insert a window that started `ago` before now. */
    async function seed(ago: string): Promise<Uint8Array> {
      const addressHash = newHash()
      await owner.query(
        `insert into ${TABLE} (address_hash, window_start, hits)
         values ($1, date_trunc('hour', now() - $2::interval), 3)`,
        [Buffer.from(addressHash), ago]
      )
      return addressHash
    }

    test('deletes only expired windows and returns the count', async () => {
      await owner.query(`delete from ${TABLE}`)
      await seed('3 days')
      await seed('40 hours')
      const recent = await seed('2 hours')
      const live = newHash()
      await hit(live, 5)
      expect(await purgeDemoRateCounters(coreHandle.db, 100)).toBe(2)
      const { rows } = await owner.query(`select count(*)::int as n from ${TABLE}`)
      expect(rows[0].n).toBe(2)
      expect(await hitsOf(recent)).toBe(3)
      expect(await hitsOf(live)).toBe(1)
      expect(await purgeDemoRateCounters(coreHandle.db, 100)).toBe(0)
    })

    test('respects the batch size, and caps it at 1000', async () => {
      await owner.query(`delete from ${TABLE}`)
      await owner.query(
        `insert into ${TABLE} (address_hash, window_start, hits)
         select decode(lpad(to_hex(g), 64, '0'), 'hex'), now() - interval '5 days', 1
           from generate_series(1, 1050) g`
      )
      expect(await purgeDemoRateCounters(coreHandle.db, 5)).toBe(5)
      const { rows } = await owner.query(`select count(*)::int as n from ${TABLE}`)
      expect(rows[0].n).toBe(1045)
      expect(await purgeDemoRateCounters(coreHandle.db, 100_000)).toBe(1000)
      expect(await purgeDemoRateCounters(coreHandle.db, 100_000)).toBe(45)
    })

    test('rejects a bad limit before any query', async () => {
      await expect(purgeDemoRateCounters(coreHandle.db, 0)).rejects.toThrow('limit')
    })
  })

  describe('who may execute them', () => {
    const calls = [
      `select core.hit_demo_rate_limit(decode(repeat('ab', 32), 'hex'), 60, 5)`,
      'select core.purge_demo_rate_counters(1)',
    ]

    test('closeline_auth and closeline_playbook cannot execute either', async () => {
      for (const pool of [auth, playbook]) {
        for (const call of calls) {
          const refused = await pool.query(call).then(
            () => null,
            (error: { message?: string }) => error.message
          )
          expect(refused).toContain('permission denied for schema core')
        }
      }
    })

    test('EXECUTE is held by closeline_core alone, never PUBLIC', async () => {
      const { rows } = await owner.query(
        `select p.proname,
                has_function_privilege('closeline_core', p.oid, 'EXECUTE') as core,
                has_function_privilege('closeline_auth', p.oid, 'EXECUTE') as auth,
                has_function_privilege('closeline_playbook', p.oid, 'EXECUTE') as playbook,
                exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                         where a.grantee = 0) as public_grant,
                p.prosecdef, p.proconfig
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'core'
            and p.proname in ('hit_demo_rate_limit', 'purge_demo_rate_counters')
          order by p.proname`
      )
      expect(rows.map((row) => row.proname)).toEqual([
        'hit_demo_rate_limit',
        'purge_demo_rate_counters',
      ])
      for (const row of rows) {
        expect(row).toMatchObject({
          core: true,
          auth: false,
          playbook: false,
          public_grant: false,
          prosecdef: true,
        })
        expect(row.proconfig).toContain('search_path=pg_catalog, pg_temp')
      }
    })
  })
})
