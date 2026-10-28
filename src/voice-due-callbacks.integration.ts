import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { integrationEnv, migrateUp } from './integration-support'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const SIG = 'voice.orgs_with_due_callbacks(text, integer)'
const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`

describe('voice.orgs_with_due_callbacks', () => {
  let owner: Pool
  let voice: Pool
  let core: Pool
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

  /** Add a form Inquiry to `orgId` in callback state `state`, with a retry time (minutes from now). */
  const addInquiry = (orgId: string, state: string, retryMinutes: number | null = null) =>
    scoped(voice, orgId, (c) =>
      c.query(
        `insert into voice.inquiries (id, organization_id, idempotency_key, source, prospect_id,
           consent_wording_id, consent_wording_version, consent_source_url, consent_phone_granted,
           callback_state, callback_next_attempt_at)
         values ($1, $2, $3, 'form', $4, $5, 1, 'https://a.example.test/', true, $6,
           case when $7::int is null then null else now() + make_interval(mins => $7::int) end)`,
        [
          newId('inq'),
          orgId,
          randomBytes(12).toString('hex'),
          newId('prs'),
          newId('cwd'),
          state,
          retryMinutes,
        ]
      )
    )

  /** A fresh Organization with one Inquiry. */
  async function inquiry(state: string, retryMinutes: number | null = null): Promise<string> {
    const orgId = newId('org')
    orgs.push(orgId)
    await addInquiry(orgId, state, retryMinutes)
    return orgId
  }

  const due = async (
    pool: Pool,
    limit: number | null,
    after: string | null = null
  ): Promise<string[]> =>
    (
      await scoped(pool, null, (c) =>
        c.query<{ organization_id: string }>(
          'select * from voice.orgs_with_due_callbacks($1::text, $2::int)',
          [after, limit]
        )
      )
    ).rows.map((r) => r.organization_id)

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 1 })
    voice = new Pool({ connectionString: env.voice, max: 4 })
    core = new Pool({ connectionString: env.core, max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      await scoped(voice, orgId, (c) => c.query('delete from voice.inquiries')).catch(
        () => undefined
      )
    }
    await Promise.all([owner.end(), voice.end(), core.end()])
  })

  test('lists Organizations with a pending or an overdue retry callback, once each', async () => {
    const pending = await inquiry('pending')
    const twice = await inquiry('pending')
    await addInquiry(twice, 'pending')
    const overdue = await inquiry('no_answer', -5)
    const later = await inquiry('no_answer', 30)
    const dialling = await inquiry('dialling')
    const connected = await inquiry('connected')
    const mine = new Set([pending, twice, overdue, later, dialling, connected])
    const got = (await due(voice, 500)).filter((id) => mine.has(id))
    expect(got).toEqual([pending, twice, overdue].sort())
  })

  test('is bounded: cut to 500, none for a limit under one or null', async () => {
    for (let i = 0; i < 3; i++) {
      await inquiry('pending')
    }
    expect(await due(voice, 2)).toHaveLength(2)
    expect(await due(voice, 0)).toEqual([])
    expect(await due(voice, -1)).toEqual([])
    expect(await due(voice, null)).toEqual([])
    expect((await due(voice, 1_000_000)).length).toBeLessThanOrEqual(500)
  })

  test('pages by keyset: every due Organization is visited across pages, once', async () => {
    const mine = new Set<string>()
    for (let i = 0; i < 5; i++) {
      mine.add(await inquiry('pending'))
    }
    const seen: string[] = []
    let after: string | null = null
    for (;;) {
      const page: string[] = await due(voice, 2, after)
      if (page.length === 0) {
        break
      }
      expect(page.every((id) => after === null || id > after)).toBe(true)
      seen.push(...page)
      after = page[page.length - 1] ?? null
    }
    expect(seen).toEqual([...seen].sort())
    expect(new Set(seen).size).toBe(seen.length)
    expect([...mine].filter((id) => !seen.includes(id))).toEqual([])
  })

  test('returns Organization ids only, and only closeline_voice may execute it', async () => {
    const r = await scoped(voice, null, (c) =>
      c.query('select * from voice.orgs_with_due_callbacks(null, 5)')
    )
    expect(r.fields.map((f) => f.name)).toEqual(['organization_id'])
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
    await expect(due(core, 5)).rejects.toThrow('permission denied')
  })
})
