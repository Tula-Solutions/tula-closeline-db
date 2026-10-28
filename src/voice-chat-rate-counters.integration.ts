import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { Pool } from 'pg'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const newOrg = (): string => `org_${randomBytes(16).toString('hex')}`
const UPSERT = `insert into voice.chat_rate_counters as c (organization_id, key_hash, window_start, hits)
  values ($1, $2, date_trunc('minute', now()), 1)
  on conflict (organization_id, key_hash, window_start) do update set hits = c.hits + 1
  returning hits`

describe('voice.chat_rate_counters', () => {
  let voice: Pool
  let owner: Pool
  const orgs: string[] = []

  async function scoped(orgId: string | null, sql: string, params: unknown[]) {
    const c = await voice.connect()
    try {
      await c.query('begin')
      if (orgId) {
        await c.query("select set_config('app.organization_id', $1, true)", [orgId])
      }
      const result = await c.query(sql, params)
      await c.query('commit')
      return result
    } catch (error) {
      await c.query('rollback').catch(() => undefined)
      throw error
    } finally {
      c.release()
    }
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    voice = new Pool({ connectionString: env.voice, max: 4 })
    owner = new Pool({ connectionString: env.owner, max: 1 })
  })

  afterAll(async () => {
    for (const org of orgs) {
      await owner.query('delete from voice.chat_rate_counters where organization_id = $1', [org])
    }
    await dropStaleTestObjects(owner, env.owner)
    await Promise.all([owner.end(), voice.end()])
  })

  test('concurrent upserts of one key in one window count every hit', async () => {
    const org = newOrg()
    orgs.push(org)
    const key = randomBytes(32)
    const hits = await Promise.all(Array.from({ length: 8 }, () => scoped(org, UPSERT, [org, key])))
    expect(hits.map((r) => r.rows[0].hits).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  test('a second Organization sees and writes nothing of the first, and no scope sees nothing', async () => {
    const [a, b] = [newOrg(), newOrg()]
    orgs.push(a, b)
    const key = randomBytes(32)
    await scoped(a, UPSERT, [a, key])
    const read = await scoped(
      b,
      'select 1 from voice.chat_rate_counters where organization_id = $1',
      [a]
    )
    expect(read.rowCount).toBe(0)
    const none = await scoped(null, 'select 1 from voice.chat_rate_counters', [])
    expect(none.rowCount).toBe(0)
    await expect(scoped(b, UPSERT, [a, key])).rejects.toMatchObject({ code: '42501' })
  })

  test('a key hash that is not 32 bytes is refused', async () => {
    const org = newOrg()
    await expect(scoped(org, UPSERT, [org, randomBytes(8)])).rejects.toMatchObject({
      code: '23514',
    })
  })
})
