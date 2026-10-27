import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes, randomInt } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { integrationEnv, migrateUp } from './integration-support'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`
const newNumber = (): string => `+1${randomInt(2_000_000_000, 9_999_999_999)}`
const SIG = 'voice.orgs_with_stale_ringing(timestamptz, text, integer)'

describe('voice.orgs_with_stale_ringing', () => {
  let owner: Pool
  let voice: Pool
  let core: Pool
  let auth: Pool
  let playbook: Pool
  const orgs: string[] = []

  async function scoped<T>(
    pool: Pool,
    orgId: string | null,
    fn: (c: PoolClient) => Promise<T>
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

  /** An Organization with one active Line, tracked for cleanup. */
  async function newOrg(): Promise<{ orgId: string; lineId: string }> {
    const orgId = newId('org')
    const lineId = newId('line')
    orgs.push(orgId)
    await scoped(voice, orgId, (c) =>
      c.query(
        "insert into voice.lines (id, organization_id, number, country, state) values ($1, $2, $3, 'US', 'active')",
        [lineId, orgId, newNumber()]
      )
    )
    return { orgId, lineId }
  }

  /** Add a Call of the given direction and state, created `ageMinutes` ago. */
  const addCall = (
    o: { orgId: string; lineId: string },
    direction: 'inbound' | 'outbound',
    state: 'ringing' | 'connecting',
    ageMinutes: number
  ) =>
    scoped(voice, o.orgId, (c) =>
      c.query(
        `insert into voice.calls (id, organization_id, direction, state, line_id, prospect_number, created_at)
         values ($1, $2, $3, $4, $5, $6, now() - make_interval(mins => $7))`,
        [newId('call'), o.orgId, direction, state, o.lineId, newNumber(), ageMinutes]
      )
    )

  const scan = async (
    pool: Pool,
    before: string,
    after: string | null,
    limit: number | null
  ): Promise<string[]> =>
    (
      await scoped(pool, null, (c) =>
        c.query<{ organization_id: string }>(
          'select * from voice.orgs_with_stale_ringing($1::timestamptz, $2::text, $3::int)',
          [before, after, limit]
        )
      )
    ).rows.map((r) => r.organization_id)

  const cutoff = () => new Date(Date.now() - 10 * 60_000).toISOString()

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 1 })
    voice = new Pool({ connectionString: env.voice, max: 4 })
    core = new Pool({ connectionString: env.core, max: 1 })
    auth = new Pool({ connectionString: env.auth, max: 1 })
    playbook = new Pool({ connectionString: env.playbook, max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      await scoped(voice, orgId, async (c) => {
        await c.query('delete from voice.calls')
        await c.query('delete from voice.lines')
      }).catch(() => undefined)
    }
    await Promise.all([owner.end(), voice.end(), core.end(), auth.end(), playbook.end()])
  })

  test('lists only Organizations with stale inbound ringing Calls, once each', async () => {
    const stale = await newOrg()
    const twice = await newOrg()
    const outbound = await newOrg()
    const answered = await newOrg()
    const fresh = await newOrg()
    await addCall(stale, 'inbound', 'ringing', 30)
    await addCall(twice, 'inbound', 'ringing', 30)
    await addCall(twice, 'inbound', 'ringing', 40)
    await addCall(outbound, 'outbound', 'ringing', 30)
    await addCall(answered, 'inbound', 'connecting', 30)
    await addCall(fresh, 'inbound', 'ringing', 1)
    const mine = new Set([stale, twice, outbound, answered, fresh].map((o) => o.orgId))
    const got = (await scan(voice, cutoff(), null, 500)).filter((id) => mine.has(id))
    expect(got).toEqual([stale.orgId, twice.orgId].sort())
  })

  test('pages after the last id, in order, without repeats', async () => {
    const made = [await newOrg(), await newOrg(), await newOrg()]
    for (const o of made) {
      await addCall(o, 'inbound', 'ringing', 30)
    }
    const mine = new Set(made.map((o) => o.orgId))
    const seen: string[] = []
    let after: string | null = null
    for (;;) {
      const page: string[] = await scan(voice, cutoff(), after, 1)
      expect(page.length).toBeLessThanOrEqual(1)
      if (page.length === 0) {
        break
      }
      after = page[0] ?? null
      seen.push(...page.filter((id) => mine.has(id)))
    }
    expect(seen).toEqual([...mine].sort())
  })

  test('cuts the limit to 500 and gives no row for a limit under one', async () => {
    for (let i = 0; i < 501; i++) {
      await addCall(await newOrg(), 'inbound', 'ringing', 30)
    }
    expect(await scan(voice, cutoff(), null, 501)).toHaveLength(500)
    expect(await scan(voice, cutoff(), null, 1_000_000)).toHaveLength(500)
    expect(await scan(voice, cutoff(), null, 3)).toHaveLength(3)
    expect(await scan(voice, cutoff(), null, 0)).toEqual([])
    expect(await scan(voice, cutoff(), null, -1)).toEqual([])
    expect(await scan(voice, cutoff(), null, null)).toEqual([])
    expect(await scan(voice, 'infinity', null, 500)).not.toEqual([])
  }, 120_000)

  test('returns Organization ids only', async () => {
    const r = await scoped(voice, null, (c) =>
      c.query('select * from voice.orgs_with_stale_ringing(now(), null, 5)')
    )
    expect(r.fields.map((f) => f.name)).toEqual(['organization_id'])
  })

  test('only closeline_voice may execute it', async () => {
    const run = async (role: string) =>
      (
        await owner.query<{ ok: boolean }>('select has_function_privilege($1, $2, $3) as ok', [
          role,
          SIG,
          'EXECUTE',
        ])
      ).rows[0]?.ok
    expect(await run('closeline_voice')).toBe(true)
    for (const role of ['closeline_core', 'closeline_auth', 'closeline_playbook', 'public']) {
      expect([role, await run(role)]).toEqual([role, false])
    }
    for (const pool of [core, auth, playbook]) {
      await expect(scan(pool, new Date().toISOString(), null, 5)).rejects.toThrow(
        'permission denied'
      )
    }
  })

  test('the query can use the partial index on ringing inbound Calls', async () => {
    const c = await owner.connect()
    let text: string
    try {
      await c.query('begin')
      await c.query('set local enable_seqscan = off')
      const r = await c.query<{ 'QUERY PLAN': string }>(
        `explain select distinct organization_id from voice.calls
          where state = 'ringing' and direction = 'inbound' and created_at < now()`
      )
      text = r.rows.map((x) => x['QUERY PLAN']).join('\n')
      await c.query('rollback')
    } finally {
      c.release()
    }
    expect(text).toContain('calls_stale_ringing_idx')
  })
})
