import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes, randomInt } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { integrationEnv, migrateUp } from './integration-support'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`
const newNumber = (): string => `+1${randomInt(2_000_000_000, 9_999_999_999)}`
const SIG = 'voice.orgs_with_due_recordings(timestamptz, text, integer)'

describe('voice.orgs_with_due_recordings', () => {
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

  /** Add an ended Call with a Recording; `dueMinutesAgo` sets purge_due_at (deleted only). */
  async function addRecording(
    o: { orgId: string; lineId: string },
    state: 'stored' | 'deleted',
    dueMinutesAgo: number | null
  ): Promise<void> {
    const callId = newId('call')
    await scoped(voice, o.orgId, async (c) => {
      await c.query(
        `insert into voice.calls (id, organization_id, direction, state, line_id, prospect_number,
           answered_at, duration_seconds, ended_at, disclosure_wording_version, disclosure_played_at)
         values ($1, $2, 'inbound', 'ended', $3, $4, now(), 30, now(), 1, now())`,
        [callId, o.orgId, o.lineId, newNumber()]
      )
      await c.query(
        `insert into voice.recordings (id, organization_id, call_id, storage_key, channels, state,
           size_bytes, stored_at, deleted_at, purge_due_at)
         values ($1, $2, $3, $4, 2, $5, 10, now(),
           case when $5 = 'deleted' then now() end,
           case when $5 = 'deleted' and $6::int is not null
             then now() - make_interval(mins => $6::int) end)`,
        [newId('rec'), o.orgId, callId, `recordings/${callId}.mp3`, state, dueMinutesAgo]
      )
    })
  }

  const scan = async (
    pool: Pool,
    before: string,
    after: string | null,
    limit: number | null
  ): Promise<string[]> =>
    (
      await scoped(pool, null, (c) =>
        c.query<{ organization_id: string }>(
          'select * from voice.orgs_with_due_recordings($1::timestamptz, $2::text, $3::int)',
          [before, after, limit]
        )
      )
    ).rows.map((r) => r.organization_id)

  const now = () => new Date().toISOString()

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
        await c.query('delete from voice.recordings')
        await c.query('delete from voice.calls')
        await c.query('delete from voice.lines')
      }).catch(() => undefined)
    }
    await Promise.all([owner.end(), voice.end(), core.end(), auth.end(), playbook.end()])
  })

  test('lists only Organizations with a deleted Recording past its purge time, once each', async () => {
    const due = await newOrg()
    const twice = await newOrg()
    const future = await newOrg()
    const stored = await newOrg()
    const unscheduled = await newOrg()
    await addRecording(due, 'deleted', 5)
    await addRecording(twice, 'deleted', 5)
    await addRecording(twice, 'deleted', 9)
    await addRecording(future, 'deleted', -60)
    await addRecording(stored, 'stored', null)
    await addRecording(unscheduled, 'deleted', null)
    const mine = new Set([due, twice, future, stored, unscheduled].map((o) => o.orgId))
    const got = (await scan(voice, now(), null, 500)).filter((id) => mine.has(id))
    expect(got).toEqual([due.orgId, twice.orgId].sort())
  })

  test('pages after the last id, in order, without repeats', async () => {
    const made = [await newOrg(), await newOrg(), await newOrg()]
    for (const o of made) {
      await addRecording(o, 'deleted', 5)
    }
    const mine = new Set(made.map((o) => o.orgId))
    const seen: string[] = []
    let after: string | null = null
    for (;;) {
      const page: string[] = await scan(voice, now(), after, 1)
      expect(page.length).toBeLessThanOrEqual(1)
      if (page.length === 0) {
        break
      }
      after = page[0] ?? null
      seen.push(...page.filter((id) => mine.has(id)))
    }
    expect(seen).toEqual([...mine].sort())
  })

  test('a limit under one, or a null limit or time, gives no row', async () => {
    const o = await newOrg()
    await addRecording(o, 'deleted', 5)
    expect(await scan(voice, now(), null, 3)).not.toEqual([])
    expect(await scan(voice, now(), null, 0)).toEqual([])
    expect(await scan(voice, now(), null, -1)).toEqual([])
    expect(await scan(voice, now(), null, null)).toEqual([])
    const r = await scoped(voice, null, (c) =>
      c.query('select * from voice.orgs_with_due_recordings(null, null, 5)')
    )
    expect(r.rows).toEqual([])
  })

  test('returns Organization ids only', async () => {
    const r = await scoped(voice, null, (c) =>
      c.query('select * from voice.orgs_with_due_recordings(now(), null, 5)')
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
      await expect(scan(pool, now(), null, 5)).rejects.toThrow('permission denied')
    }
  })
})
