import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { createDb, type DbHandle } from './client'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { findTenantIsolationGaps } from './isolation'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const CHECK_VIOLATION = '23514'
const UNIQUE_VIOLATION = '23505'
const INSUFFICIENT_PRIVILEGE = '42501'
const FEATURE_NOT_SUPPORTED = '0A000'

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`
const hash = (): Buffer => randomBytes(32)

type Row = Record<string, unknown>

describe('voice.agent_calls', () => {
  let voice: Pool
  let owner: Pool
  let handle: DbHandle
  const orgs: string[] = []

  async function scoped<T>(
    orgId: string | null,
    fn: (c: PoolClient) => Promise<T>,
    pool: Pool = voice
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

  const run = (orgId: string | null, sql: string, values: unknown[] = []) =>
    scoped(orgId, (c) => c.query(sql, values))

  async function refusal(promise: Promise<unknown>): Promise<{ code?: string; message: string }> {
    try {
      await promise
    } catch (error) {
      return error as { code?: string; message: string }
    }
    throw new Error('expected the statement to be refused')
  }

  const newOrg = (): string => {
    const orgId = newId('org')
    orgs.push(orgId)
    return orgId
  }

  /** Insert an Agent Call; `over` replaces any column. Defaults: a dialing Rep request. */
  async function add(orgId: string, over: Row = {}): Promise<string> {
    const row: Row = {
      id: newId('acl'),
      organization_id: orgId,
      idempotency_key: randomBytes(16).toString('hex'),
      source: 'rep_request',
      prospect_id: newId('prs'),
      line_id: newId('line'),
      requested_by_membership_id: newId('mem'),
      state: 'dialing',
      // Fixed steps back from now, so created <= dialed <= ended however the clock ticks between helpers.
      created_at: new Date(Date.now() - 5000),
      dialed_at: new Date(Date.now() - 4000),
      number_hash: hash(),
      ...over,
    }
    const names = Object.keys(row)
    await run(
      orgId,
      `insert into voice.agent_calls (${names.join(', ')}) values (${names.map((_, i) => `$${i + 1}`).join(', ')})`,
      names.map((n) => row[n])
    )
    return row.id as string
  }

  const endedRow = (result: string, over: Row = {}): Row => ({
    state: 'ended',
    result,
    ended_at: new Date(Date.now() - 1000),
    ...(result === 'answered' ? { end_reason: 'agent_ended' } : {}),
    ...over,
  })

  beforeAll(async () => {
    await migrateUp(env.owner)
    voice = new Pool({ connectionString: env.voice, max: 6 })
    owner = new Pool({ connectionString: env.owner, max: 2 })
    handle = createDb(env.voice, { max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      await scoped(orgId, (c) => c.query('delete from voice.agent_calls'), owner)
    }
    await dropStaleTestObjects(owner, env.owner)
    await handle.close()
    await Promise.all([owner.end(), voice.end()])
  })

  test('every table of the schema passes the tenant isolation check', async () => {
    expect(await findTenantIsolationGaps(handle.db)).toEqual([])
  })

  test('a second Organization reads and writes none of the first, and no scope sees nothing', async () => {
    const a = newOrg()
    const b = newOrg()
    const id = await add(a)
    const count = async (org: string | null) =>
      Number((await run(org, 'select count(*) as n from voice.agent_calls')).rows[0].n)
    expect(await count(a)).toBe(1)
    expect(await count(b)).toBe(0)
    expect(await count(null)).toBe(0)
    expect(
      (await run(b, 'update voice.agent_calls set attempt = 2 where id = $1', [id])).rowCount
    ).toBe(0)
    expect((await refusal(add(b, { organization_id: a }))).code).toBe(INSUFFICIENT_PRIVILEGE)
  })

  test('unique on Organization and idempotency key; another Organization may reuse it', async () => {
    const a = newOrg()
    const key = 'rep-key-0123456789'
    await add(a, { idempotency_key: key })
    expect((await refusal(add(a, { idempotency_key: key }))).code).toBe(UNIQUE_VIOLATION)
    await add(newOrg(), { idempotency_key: key })
  })

  test('a Step key must be enrollment:step:attempt, and a Rep request names its Rep', async () => {
    const a = newOrg()
    const enr = newId('enr')
    const step = {
      source: 'campaign_step',
      enrollment_id: enr,
      step_key: 'call-1',
      requested_by_membership_id: null,
      attempt: 2,
    }
    await add(a, { ...step, idempotency_key: `${enr}:call-1:2` })
    const wrong = await refusal(add(a, { ...step, idempotency_key: `${enr}:call-1:1` }))
    expect(wrong.code).toBe(CHECK_VIOLATION)
    expect((await refusal(add(a, { requested_by_membership_id: null }))).code).toBe(CHECK_VIOLATION)
    expect((await refusal(add(a, { attempt: 4 }))).code).toBe(CHECK_VIOLATION)
  })

  test('at most one queued, dialing or live Agent Call per Prospect', async () => {
    const a = newOrg()
    const prospect = newId('prs')
    const first = await add(a, { prospect_id: prospect })
    expect((await refusal(add(a, { prospect_id: prospect }))).code).toBe(UNIQUE_VIOLATION)
    await run(
      a,
      `update voice.agent_calls set state = 'ended', result = 'no_answer', ended_at = now() + interval '1 minute' where id = $1`,
      [first]
    )
    await add(a, { prospect_id: prospect })
    await add(newOrg(), { prospect_id: prospect })
  })

  describe('the contract invariants', () => {
    const soon = () => new Date(Date.now() + 1000)
    const cases: [string, Row][] = [
      ['a result on a dialing row', { result: 'no_answer' }],
      ['an end reason on a dialing row', { end_reason: 'booked' }],
      ['an ended row without a result', { state: 'ended', ended_at: new Date() }],
      ['an ended row without an end time', { state: 'ended', result: 'no_answer' }],
      ['an end reason on a non-answered result', endedRow('busy', { end_reason: 'booked' })],
      ['an answered row without an end reason', endedRow('answered', { end_reason: null })],
      [
        'a blocked row without a gate code',
        endedRow('blocked', { dialed_at: null, number_hash: null }),
      ],
      ['a gate code on an answered row', endedRow('answered', { gate_code: 'agent.paused' })],
      ['a gate code on a dialing row', { gate_code: 'agent.paused' }],
      ['a queued row without a retry time', { state: 'queued', dialed_at: null }],
      ['a retry time on a dialing row', { retry_at: soon() }],
      ['a live row without a Call', { state: 'live' }],
      [
        'a blocked row with a Call',
        endedRow('blocked', { gate_code: 'agent.paused', dialed_at: null, call_id: newId('call') }),
      ],
      [
        'a queued row with a Call',
        { state: 'queued', dialed_at: null, retry_at: soon(), call_id: newId('call') },
      ],
      ['a duration without a Call', { duration_seconds: 5 }],
      ['a dialed row without a dial time', { dialed_at: null }],
      ['a blocked row with a dial time', endedRow('blocked', { gate_code: 'agent.paused' })],
      ['a dialed row without a number hash', { number_hash: null }],
      ['a dialed row without a Line', { line_id: null }],
      ['a short number hash', { number_hash: Buffer.alloc(8) }],
      [
        'an unknown gate code',
        { state: 'queued', dialed_at: null, retry_at: soon(), gate_code: 'agent.other' },
      ],
    ]
    test.each(cases)('refuses %s', async (_name, over) => {
      expect((await refusal(add(newOrg(), over))).code).toBe(CHECK_VIOLATION)
    })

    test('accepts the valid shape of every state', async () => {
      const a = newOrg()
      await add(a, {
        state: 'queued',
        dialed_at: null,
        number_hash: null,
        gate_code: 'agent_call.line_cap_reached',
        retry_at: soon(),
      })
      await add(a, { state: 'live', call_id: newId('call') })
      await add(a, endedRow('answered', { call_id: newId('call'), duration_seconds: 42 }))
      await add(a, endedRow('voicemail'))
      await add(
        a,
        endedRow('blocked', { gate_code: 'consent.missing', dialed_at: null, number_hash: null })
      )
    })
  })

  test('an ended row never changes, and the service cannot delete or truncate', async () => {
    const a = newOrg()
    const id = await add(a, endedRow('no_answer'))
    const rewrite = await refusal(
      run(a, 'update voice.agent_calls set attempt = 2 where id = $1', [id])
    )
    expect(rewrite.code).toBe(CHECK_VIOLATION)
    expect((await refusal(run(a, 'delete from voice.agent_calls where id = $1', [id]))).code).toBe(
      INSUFFICIENT_PRIVILEGE
    )
    const truncate = await refusal(owner.query('truncate voice.agent_calls'))
    expect(truncate.code).toBe(FEATURE_NOT_SUPPORTED)
  })

  test('Line caps default to 3 and 150 and are range checked', async () => {
    const a = newOrg()
    const lineId = newId('line')
    await run(
      a,
      `insert into voice.lines (id, organization_id, number, country, state) values ($1, $2, $3, 'US', 'active')`,
      [lineId, a, `+1415${Math.floor(1_000_000 + Math.random() * 8_000_000)}`]
    )
    const caps = (
      await run(a, 'select max_concurrent_agent_calls m, daily_agent_dial_cap d from voice.lines')
    ).rows[0]
    expect([caps.m, caps.d]).toEqual([3, 150])
    expect(
      (await refusal(run(a, 'update voice.lines set max_concurrent_agent_calls = 0'))).code
    ).toBe(CHECK_VIOLATION)
    expect((await refusal(run(a, 'update voice.lines set daily_agent_dial_cap = 1001'))).code).toBe(
      CHECK_VIOLATION
    )
    await scoped(a, (c) => c.query('delete from voice.lines'), owner)
  })

  describe('the cap and attempt counts', () => {
    /** The plan of `sql` with sequential scans disabled, so a usable index is the only way. */
    async function plan(orgId: string, sql: string, values: unknown[]): Promise<string> {
      return scoped(orgId, async (c) => {
        await c.query('set local enable_seqscan = off')
        await c.query('set local enable_bitmapscan = off')
        const r = await c.query(`explain ${sql}`, values)
        return r.rows.map((x) => x['QUERY PLAN']).join('\n')
      })
    }

    test('dials of a number, dials of a Line and Calls open on a Line use their index', async () => {
      const a = newOrg()
      const number = hash()
      const line = newId('line')
      await add(a, { number_hash: number, line_id: line })
      // Enough spread rows that the planner has a reason to prefer the narrow index.
      await scoped(
        a,
        (c) =>
          c.query(
            `insert into voice.agent_calls (id, organization_id, idempotency_key, source, prospect_id,
               line_id, requested_by_membership_id, state, created_at, dialed_at, number_hash)
             select 'acl_' || md5(g::text), $1, 'seed-key-' || lpad(g::text, 10, '0'), 'rep_request',
               'prs_' || md5(g::text), 'line_' || md5((g % 50)::text), 'mem_' || md5('m'),
               'dialing', now() - interval '1 hour', now() - interval '30 minutes',
               sha256(g::text::bytea)
             from generate_series(1, 3000) g`,
            [a]
          ),
        owner
      )
      await owner.query('analyze voice.agent_calls')
      const since = new Date(Date.now() - 7 * 86_400_000)
      expect(
        await plan(
          a,
          'select count(*) from voice.agent_calls where organization_id = $1 and number_hash = $2 and dialed_at > $3',
          [a, number, since]
        )
      ).toContain('agent_calls_number_dials_idx')
      expect(
        await plan(
          a,
          'select count(*) from voice.agent_calls where organization_id = $1 and line_id = $2 and dialed_at > $3',
          [a, line, since]
        )
      ).toContain('agent_calls_line_dials_idx')
      expect(
        await plan(
          a,
          `select count(*) from voice.agent_calls where organization_id = $1 and line_id = $2 and state in ('dialing', 'live')`,
          [a, line]
        )
      ).toContain('agent_calls_line_open_idx')
    })

    test('the counts count dialed rows only', async () => {
      const a = newOrg()
      const number = hash()
      const line = newId('line')
      const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000)
      await add(
        a,
        endedRow('no_answer', {
          number_hash: number,
          line_id: line,
          dialed_at: twoDaysAgo,
          created_at: twoDaysAgo,
          ended_at: twoDaysAgo,
        })
      )
      await add(a, { number_hash: number, line_id: line })
      await add(
        a,
        endedRow('blocked', {
          number_hash: null,
          line_id: line,
          gate_code: 'agent.paused',
          dialed_at: null,
        })
      )
      const n = async (where: string, v: unknown[]) =>
        Number(
          (
            await run(
              a,
              `select count(*) n from voice.agent_calls where organization_id = $1 and ${where}`,
              [a, ...v]
            )
          ).rows[0].n
        )
      expect(await n(`number_hash = $2 and dialed_at > now() - interval '7 days'`, [number])).toBe(
        2
      )
      expect(await n(`line_id = $2 and dialed_at > now() - interval '24 hours'`, [line])).toBe(1)
      expect(await n(`line_id = $2 and state in ('dialing', 'live')`, [line])).toBe(1)
    })
  })
})
