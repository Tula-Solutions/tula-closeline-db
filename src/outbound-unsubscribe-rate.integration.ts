import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { Pool } from 'pg'
import { createDb, type DbHandle } from './client'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { findTenantIsolationGaps } from './isolation'
import { hitUnsubscribeRateLimit, purgeUnsubscribeRateCounters } from './outbound-unsubscribe-rate'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const TABLE = 'outbound.unsubscribe_rate_counter'
const newHash = (): Uint8Array => new Uint8Array(randomBytes(32))

describe('outbound unsubscribe rate counter', () => {
  let owner: Pool
  let outbound: Pool
  let ownerHandle: DbHandle
  let handle: DbHandle

  const hit = (keyHash: Uint8Array, limit = 10, windowSeconds = 3600) =>
    hitUnsubscribeRateLimit(handle.db, { keyHash, windowSeconds, limit })

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    outbound = new Pool({ connectionString: env.outbound, max: 2 })
    ownerHandle = createDb(env.owner, { max: 1 })
    handle = createDb(env.outbound, { max: 20 })
    await owner.query(`truncate ${TABLE}`)
  })

  afterAll(async () => {
    await owner.query(`truncate ${TABLE}`)
    await dropStaleTestObjects(owner, env.owner)
    await ownerHandle.close()
    await handle.close()
    await Promise.all([owner.end(), outbound.end()])
  })

  test('with limit 3, four sequential hits give three true then false', async () => {
    const key = newHash()
    const answers: boolean[] = []
    for (let i = 0; i < 4; i++) {
      answers.push(await hit(key, 3))
    }
    expect(answers).toEqual([true, true, true, false])
  })

  test('keys are counted apart', async () => {
    const a = newHash()
    expect(await hit(a, 1)).toBe(true)
    expect(await hit(a, 1)).toBe(false)
    expect(await hit(newHash(), 1)).toBe(true)
  })

  test('40 concurrent hits never allow more than the limit', async () => {
    const key = newHash()
    const answers = await Promise.all(Array.from({ length: 40 }, () => hit(key, 5, 86_400)))
    expect(answers.filter(Boolean)).toHaveLength(5)
  })

  test('refuses a bad hash before any query', async () => {
    await expect(
      hitUnsubscribeRateLimit(handle.db, {
        keyHash: new Uint8Array(5),
        windowSeconds: 60,
        limit: 1,
      })
    ).rejects.toThrow('32 bytes')
  })

  test('the table is closed to closeline_outbound and the catalog check passes', async () => {
    const refused = await outbound.query(`select * from ${TABLE}`).then(
      () => null,
      (error: { message?: string }) => error.message
    )
    expect(refused).toContain('permission denied for table unsubscribe_rate_counter')
    expect(await findTenantIsolationGaps(ownerHandle.db)).toEqual([])
  })

  test('purge removes only windows older than a day', async () => {
    await owner.query(`truncate ${TABLE}`)
    for (const ago of ['3 days', '2 hours']) {
      await owner.query(
        `insert into ${TABLE} (key_hash, window_start, hits)
         values ($1, date_trunc('hour', now() - $2::interval), 3)`,
        [Buffer.from(newHash()), ago]
      )
    }
    expect(await purgeUnsubscribeRateCounters(handle.db, 100)).toBe(1)
    const { rows } = await owner.query(`select count(*)::int as n from ${TABLE}`)
    expect(rows[0].n).toBe(1)
  })

  test('PUBLIC cannot execute the functions', async () => {
    const { rows } = await owner.query(
      `select has_function_privilege('public', 'outbound.hit_unsubscribe_rate_limit(bytea,integer,integer)', 'execute') as h,
              has_function_privilege('public', 'outbound.purge_unsubscribe_rate_counters(integer)', 'execute') as p`
    )
    expect(rows[0]).toEqual({ h: false, p: false })
  })
})
