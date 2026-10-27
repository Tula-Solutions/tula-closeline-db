import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash, randomBytes, randomInt } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { createDb, type DbHandle } from './client'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { findTenantIsolationGaps } from './isolation'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const CHECK_VIOLATION = '23514'
const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'
const INSUFFICIENT_PRIVILEGE = '42501'

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`

/** The tables of the Inbound Agent, parents first. */
const TABLES = [
  'chats',
  'inquiries',
  'agent_settings',
  'qualification_questions',
  'qualification_answers',
  'agent_turns',
  'agent_turn_sources',
  'handoffs',
]

const HOURS = JSON.stringify([{ day: 'mon', windows: [{ start: '09:00', end: '17:00' }] }])
const FORM_URL = 'https://example.com/contact'

interface Seeded {
  orgId: string
  callId: string
  chatId: string
  inquiryId: string
  questionId: string
  turnId: string
  handoffId: string
}

interface InquiryOptions {
  key?: string
  source?: string
  chatId?: string | null
  callId?: string | null
  consent?: boolean
  phone?: boolean
  callback?: string
  skipReason?: string | null
  attempts?: number
  nextAttemptAt?: string | null
}

interface HandoffOptions {
  channel?: string
  callId?: string | null
  chatId?: string | null
  state?: string
  rep?: string | null
  answeredAt?: string | null
  completedAt?: string | null
}

interface TurnOwner {
  callId?: string
  chatId?: string
  trySessionId?: string
}

describe('voice agent tables', () => {
  let voice: Pool
  let owner: Pool
  let handle: DbHandle
  const orgs: string[] = []

  /** Run `fn` in one transaction scoped to `orgId` (or to none). */
  async function scoped<T>(orgId: string | null, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await voice.connect()
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

  /** The error a statement is refused with; fails the test when it succeeds. */
  async function refusal(promise: Promise<unknown>): Promise<{ code?: string; message: string }> {
    try {
      await promise
    } catch (error) {
      return error as { code?: string; message: string }
    }
    throw new Error('expected the statement to be refused')
  }

  const countOf = (orgId: string | null, table: string) =>
    scoped(orgId, async (c) =>
      Number((await c.query(`select count(*) as n from voice.${table}`)).rows[0].n)
    )

  const newOrg = (): string => {
    const orgId = newId('org')
    orgs.push(orgId)
    return orgId
  }

  const phone = () => `+1415${randomInt(1_000_000, 9_999_999)}`

  const addCall = async (orgId: string): Promise<string> => {
    const lineId = newId('line')
    await run(
      orgId,
      "insert into voice.lines (id, organization_id, number, country, state) values ($1, $2, $3, 'US', 'active')",
      [lineId, orgId, phone()]
    )
    const id = newId('call')
    await run(
      orgId,
      "insert into voice.calls (id, organization_id, direction, state, line_id, prospect_number) values ($1, $2, 'inbound', 'ringing', $3, $4)",
      [id, orgId, lineId, phone()]
    )
    return id
  }

  const addChat = async (orgId: string, state = 'open'): Promise<string> => {
    const id = newId('cht')
    await run(
      orgId,
      `insert into voice.chats (id, organization_id, state, source_url, session_token_hash, expires_at, closed_at)
       values ($1, $2, $3, $4, $5, now() + interval '1 day', case when $3 = 'closed' then now() end)`,
      [id, orgId, state, FORM_URL, createHash('sha256').update(randomBytes(24)).digest()]
    )
    return id
  }

  const addInquiry = async (orgId: string, o: InquiryOptions = {}): Promise<string> => {
    const id = newId('inq')
    const consent = o.consent ?? true
    await run(
      orgId,
      `insert into voice.inquiries
         (id, organization_id, idempotency_key, source, prospect_id, chat_id, call_id,
          consent_wording_id, consent_wording_version, consent_source_url, consent_phone_granted,
          callback_state, callback_skip_reason, callback_attempts, callback_next_attempt_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        id,
        orgId,
        o.key ?? randomBytes(16).toString('hex'),
        o.source ?? 'form',
        newId('prs'),
        o.chatId ?? null,
        o.callId ?? null,
        consent ? newId('cwd') : null,
        consent ? 1 : null,
        consent ? FORM_URL : null,
        consent ? (o.phone ?? true) : null,
        o.callback ?? 'pending',
        o.skipReason ?? null,
        o.attempts ?? 0,
        o.nextAttemptAt ?? null,
      ]
    )
    return id
  }

  const addQuestion = async (
    orgId: string,
    position: number,
    kind = 'free_text',
    choices?: string[]
  ): Promise<string> => {
    const id = newId('qst')
    await run(
      orgId,
      `insert into voice.qualification_questions (id, organization_id, position, prompt, kind, choices)
       values ($1, $2, $3, 'What is your budget?', $4, $5::jsonb)`,
      [id, orgId, position, kind, choices ? JSON.stringify(choices) : null]
    )
    return id
  }

  const addTurn = async (
    orgId: string,
    of: TurnOwner,
    index: number,
    role = 'agent',
    extra: { toolName?: string | null; deferred?: boolean } = {}
  ): Promise<string> => {
    const id = newId('trn')
    await run(
      orgId,
      `insert into voice.agent_turns
         (id, organization_id, call_id, chat_id, try_session_id, turn_index, role, text, deferred, tool_name)
       values ($1, $2, $3, $4, $5, $6, $7, 'Hello there', $8, $9)`,
      [
        id,
        orgId,
        of.callId ?? null,
        of.chatId ?? null,
        of.trySessionId ?? null,
        index,
        role,
        extra.deferred ?? false,
        extra.toolName ?? null,
      ]
    )
    return id
  }

  const addHandoff = async (orgId: string, o: HandoffOptions): Promise<string> => {
    const id = newId('hof')
    await run(
      orgId,
      `insert into voice.handoffs
         (id, organization_id, state, channel, call_id, chat_id, rep_membership_id, reason, answered_at, completed_at)
       values ($1, $2, $3, $4, $5, $6, $7, 'asked_for_rep', $8, $9)`,
      [
        id,
        orgId,
        o.state ?? 'pending',
        o.channel ?? 'call',
        o.callId ?? null,
        o.chatId ?? null,
        o.rep === undefined ? newId('mem') : o.rep,
        o.answeredAt ?? null,
        o.completedAt ?? null,
      ]
    )
    return id
  }

  const insertSettings = (orgId: string, overrides: Record<string, unknown> = {}) => {
    const v = {
      paused: false,
      greeting: 'Hi',
      voice_style: 'warm',
      time_zone: 'America/New_York',
      hours: HOURS,
      max_call_seconds: 600,
      max_cost_usd_cents: 200,
      concurrency_cap: 5,
      ...overrides,
    }
    return run(
      orgId,
      `insert into voice.agent_settings
         (organization_id, paused, greeting, voice_style, time_zone, hours, max_call_seconds, max_cost_usd_cents, concurrency_cap)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`,
      [
        orgId,
        v.paused,
        v.greeting,
        v.voice_style,
        v.time_zone,
        v.hours,
        v.max_call_seconds,
        v.max_cost_usd_cents,
        v.concurrency_cap,
      ]
    )
  }

  /** One Organization with a row in every table. */
  async function seed(): Promise<Seeded> {
    const orgId = newOrg()
    const callId = await addCall(orgId)
    const chatId = await addChat(orgId)
    const inquiryId = await addInquiry(orgId)
    await insertSettings(orgId)
    const questionId = await addQuestion(orgId, 1)
    await run(
      orgId,
      `insert into voice.qualification_answers (organization_id, inquiry_id, question_id, value)
       values ($1, $2, $3, '"about 5k"'::jsonb)`,
      [orgId, inquiryId, questionId]
    )
    const turnId = await addTurn(orgId, { callId }, 0)
    await run(
      orgId,
      `insert into voice.agent_turn_sources (organization_id, turn_id, position, document_id, page, passage)
       values ($1, $2, 0, $3, 3, 'We ship in 5 days')`,
      [orgId, turnId, newId('doc')]
    )
    const handoffId = await addHandoff(orgId, { callId })
    return { orgId, callId, chatId, inquiryId, questionId, turnId, handoffId }
  }

  async function removeOrganization(orgId: string): Promise<void> {
    for (const table of [
      'handoffs',
      'inquiries',
      'chats',
      'agent_turns',
      'qualification_questions',
      'agent_settings',
      'calls',
      'lines',
    ]) {
      await run(orgId, `delete from voice.${table}`)
    }
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    voice = new Pool({ connectionString: env.voice, max: 6 })
    owner = new Pool({ connectionString: env.owner, max: 1 })
    handle = createDb(env.voice, { max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      await removeOrganization(orgId)
    }
    await dropStaleTestObjects(owner, env.owner)
    await handle.close()
    await Promise.all([owner.end(), voice.end()])
  })

  test('every table of the schema passes the tenant isolation check', async () => {
    expect(await findTenantIsolationGaps(handle.db)).toEqual([])
  })

  describe.each(TABLES)('%s', (table) => {
    test('a second Organization reads and removes nothing of the first, and no scope sees nothing', async () => {
      const a = await seed()
      const b = await seed()
      expect(await countOf(a.orgId, table)).toBeGreaterThanOrEqual(1)
      expect(await countOf(b.orgId, table)).toBeGreaterThanOrEqual(1)
      expect(await countOf(null, table)).toBe(0)
      const read = await run(b.orgId, `select 1 from voice.${table} where organization_id = $1`, [
        a.orgId,
      ])
      expect(read.rowCount).toBe(0)
      const before = await countOf(a.orgId, table)
      const removed = await run(b.orgId, `delete from voice.${table} where organization_id = $1`, [
        a.orgId,
      ])
      expect(removed.rowCount).toBe(0)
      expect(await countOf(a.orgId, table)).toBe(before)
    })

    test('has forced row-level security with its one policy', async () => {
      const rls = await owner.query(
        `select c.relrowsecurity as enabled, c.relforcerowsecurity as forced,
                (select count(*)::int from pg_policies p
                  where p.schemaname = 'voice' and p.tablename = c.relname) as policies
           from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'voice' and c.relname = $1`,
        [table]
      )
      expect(rls.rows[0]).toEqual({ enabled: true, forced: true, policies: 1 })
    })
  })

  test('a second Organization updates nothing of the first', async () => {
    const a = await seed()
    const b = await seed()
    const inquiry = await run(
      b.orgId,
      "update voice.inquiries set qualification_summary = 'x' where id = $1",
      [a.inquiryId]
    )
    expect(inquiry.rowCount).toBe(0)
    const settings = await run(
      b.orgId,
      'update voice.agent_settings set paused = true where organization_id = $1',
      [a.orgId]
    )
    expect(settings.rowCount).toBe(0)
  })

  test('rows cannot be written into another Organization', async () => {
    const a = await seed()
    const b = newOrg()
    const inquiry = await refusal(
      run(
        b,
        `insert into voice.inquiries
           (id, organization_id, idempotency_key, source, prospect_id, consent_wording_id,
            consent_wording_version, consent_source_url, consent_phone_granted, callback_state)
         values ($1, $2, $3, 'form', $4, $5, 1, $6, true, 'pending')`,
        [
          newId('inq'),
          a.orgId,
          randomBytes(16).toString('hex'),
          newId('prs'),
          newId('cwd'),
          FORM_URL,
        ]
      )
    )
    expect(inquiry.code).toBe(INSUFFICIENT_PRIVILEGE)
    const foreignSettings = await refusal(
      run(
        b,
        `insert into voice.agent_settings
           (organization_id, paused, greeting, voice_style, time_zone, hours, max_call_seconds, max_cost_usd_cents, concurrency_cap)
         values ($1, false, 'Hi', 'warm', 'UTC', $2::jsonb, 600, 200, 5)`,
        [newId('org'), HOURS]
      )
    )
    expect(foreignSettings.code).toBe(INSUFFICIENT_PRIVILEGE)
    const handoff = await refusal(
      run(
        b,
        `insert into voice.handoffs (id, organization_id, state, channel, call_id, rep_membership_id, reason)
         values ($1, $2, 'pending', 'call', $3, $4, 'qualified')`,
        [newId('hof'), a.orgId, a.callId, newId('mem')]
      )
    )
    expect(handoff.code).toBe(INSUFFICIENT_PRIVILEGE)
  })

  test('a row cannot reference the parent of another Organization', async () => {
    const a = await seed()
    const b = await seed()
    const answer = await refusal(
      run(
        b.orgId,
        "insert into voice.qualification_answers (organization_id, inquiry_id, question_id, value) values ($1, $2, $3, 'true'::jsonb)",
        [b.orgId, a.inquiryId, b.questionId]
      )
    )
    expect(answer.code).toBe(FOREIGN_KEY_VIOLATION)
    const turn = await refusal(addTurn(b.orgId, { callId: a.callId }, 7))
    expect(turn.code).toBe(FOREIGN_KEY_VIOLATION)
  })

  describe('inquiries', () => {
    test('one Inquiry per Organization and idempotency key', async () => {
      const a = await seed()
      const b = await seed()
      const key = `form:${randomBytes(12).toString('hex')}`
      await addInquiry(a.orgId, { key })
      expect((await refusal(addInquiry(a.orgId, { key }))).code).toBe(UNIQUE_VIOLATION)
      await addInquiry(b.orgId, { key })
    })

    test('an idempotency key must be 16 to 128 characters of the allowed set', async () => {
      const a = await seed()
      expect((await refusal(addInquiry(a.orgId, { key: 'short' }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addInquiry(a.orgId, { key: 'has space in it!!' }))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(addInquiry(a.orgId, { key: 'k'.repeat(129) }))).code).toBe(
        CHECK_VIOLATION
      )
    })

    test('a form carries consent evidence, and the evidence is all or none', async () => {
      const a = await seed()
      const noConsent = await refusal(
        addInquiry(a.orgId, { consent: false, callback: 'not_applicable' })
      )
      expect(noConsent.code).toBe(CHECK_VIOLATION)
      const partial = await refusal(
        run(
          a.orgId,
          `insert into voice.inquiries (id, organization_id, idempotency_key, source, prospect_id, consent_wording_id, callback_state)
           values ($1, $2, $3, 'form', $4, $5, 'pending')`,
          [newId('inq'), a.orgId, randomBytes(16).toString('hex'), newId('prs'), newId('cwd')]
        )
      )
      expect(partial.code).toBe(CHECK_VIOLATION)
    })

    test('a callback is never dialled without the phone box ticked', async () => {
      const a = await seed()
      for (const callback of ['pending', 'dialling', 'connected', 'no_answer', 'failed']) {
        const error = await refusal(addInquiry(a.orgId, { phone: false, callback }))
        expect(error.code).toBe(CHECK_VIOLATION)
      }
      await addInquiry(a.orgId, { phone: false, callback: 'skipped', skipReason: 'no_consent' })
      await addInquiry(a.orgId, { phone: false, callback: 'not_applicable' })
    })

    test('a skip reason is set exactly when the callback was skipped', async () => {
      const a = await seed()
      expect((await refusal(addInquiry(a.orgId, { callback: 'skipped' }))).code).toBe(
        CHECK_VIOLATION
      )
      const reasonOnly = await refusal(
        addInquiry(a.orgId, { callback: 'pending', skipReason: 'outside_hours' })
      )
      expect(reasonOnly.code).toBe(CHECK_VIOLATION)
      await addInquiry(a.orgId, { callback: 'skipped', skipReason: 'outside_hours' })
    })

    test('attempts stay within the maximum and a next attempt needs a no_answer callback', async () => {
      const a = await seed()
      expect((await refusal(addInquiry(a.orgId, { attempts: 4 }))).code).toBe(CHECK_VIOLATION)
      const early = await refusal(addInquiry(a.orgId, { nextAttemptAt: '2030-01-01T00:00:00Z' }))
      expect(early.code).toBe(CHECK_VIOLATION)
      await addInquiry(a.orgId, {
        callback: 'no_answer',
        attempts: 1,
        nextAttemptAt: '2030-01-01T00:00:00Z',
      })
    })

    test('a Chat Inquiry names its Chat; a Call Inquiry names its Call and is not called back', async () => {
      const a = await seed()
      const chatId = await addChat(a.orgId)
      expect((await refusal(addInquiry(a.orgId, { source: 'chat' }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addInquiry(a.orgId, { source: 'form', chatId }))).code).toBe(
        CHECK_VIOLATION
      )
      await addInquiry(a.orgId, { source: 'chat', chatId })
      expect((await refusal(addInquiry(a.orgId, { source: 'chat', chatId }))).code).toBe(
        UNIQUE_VIOLATION
      )
      const callId = await addCall(a.orgId)
      const noCall = await refusal(addInquiry(a.orgId, { source: 'call', consent: false }))
      expect(noCall.code).toBe(CHECK_VIOLATION)
      const calledBack = await refusal(
        addInquiry(a.orgId, { source: 'call', callId, consent: false, callback: 'pending' })
      )
      expect(calledBack.code).toBe(CHECK_VIOLATION)
      await addInquiry(a.orgId, {
        source: 'call',
        callId,
        consent: false,
        callback: 'not_applicable',
      })
    })

    test('an unknown source or callback state is refused', async () => {
      const a = await seed()
      expect((await refusal(addInquiry(a.orgId, { source: 'fax' }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addInquiry(a.orgId, { callback: 'ringing' }))).code).toBe(
        CHECK_VIOLATION
      )
    })
  })

  describe('agent settings', () => {
    test('there is one row per Organization', async () => {
      const a = await seed()
      expect((await refusal(insertSettings(a.orgId))).code).toBe(UNIQUE_VIOLATION)
    })

    test.each([
      ['an empty greeting', { greeting: '' }],
      ['a long greeting', { greeting: 'x'.repeat(501) }],
      ['an unknown voice style', { voice_style: 'robotic' }],
      ['a malformed time zone', { time_zone: 'not a zone' }],
      ['no working days', { hours: '[]' }],
      ['hours that are not a list', { hours: '{}' }],
      ['eight working days', { hours: JSON.stringify(Array.from({ length: 8 }, () => ({}))) }],
      ['a call shorter than 30 seconds', { max_call_seconds: 29 }],
      ['a call longer than 1800 seconds', { max_call_seconds: 1801 }],
      ['a zero cost cap', { max_cost_usd_cents: 0 }],
      ['a cost cap above 5000', { max_cost_usd_cents: 5001 }],
      ['no concurrency', { concurrency_cap: 0 }],
      ['concurrency above 50', { concurrency_cap: 51 }],
    ])('refuses %s', async (_name, overrides) => {
      expect((await refusal(insertSettings(newOrg(), overrides))).code).toBe(CHECK_VIOLATION)
    })

    test('has no column for the Disclosure, the Recording or the consent gate', async () => {
      const columns = await owner.query(
        "select column_name from information_schema.columns where table_schema = 'voice' and table_name = 'agent_settings'"
      )
      const names = columns.rows.map((r: { column_name: string }) => r.column_name).join(' ')
      expect(names).not.toMatch(/disclos|record|consent/)
    })
  })

  describe('qualification questions and answers', () => {
    test('choices are present exactly for a choice question, 2 to 10 of them', async () => {
      const orgId = newOrg()
      expect((await refusal(addQuestion(orgId, 1, 'choice'))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addQuestion(orgId, 1, 'free_text', ['a', 'b']))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(addQuestion(orgId, 1, 'choice', ['only']))).code).toBe(CHECK_VIOLATION)
      const eleven = Array.from({ length: 11 }, (_, i) => `c${i}`)
      expect((await refusal(addQuestion(orgId, 1, 'choice', eleven))).code).toBe(CHECK_VIOLATION)
      await addQuestion(orgId, 1, 'choice', ['a', 'b'])
    })

    test('position is 1 to 50 and the kind is known', async () => {
      const orgId = newOrg()
      expect((await refusal(addQuestion(orgId, 0))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addQuestion(orgId, 51))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addQuestion(orgId, 1, 'essay'))).code).toBe(CHECK_VIOLATION)
    })

    test('a reorder can move several questions in one statement', async () => {
      const orgId = newOrg()
      await addQuestion(orgId, 1)
      await addQuestion(orgId, 2)
      await run(orgId, 'update voice.qualification_questions set position = 3 - position')
      const rows = await run(
        orgId,
        'select position from voice.qualification_questions order by position'
      )
      expect(rows.rows.map((r: { position: number }) => r.position)).toEqual([1, 2])
    })

    test('an Inquiry has one answer per question, which survives the question', async () => {
      const a = await seed()
      const duplicate = await refusal(
        run(
          a.orgId,
          "insert into voice.qualification_answers (organization_id, inquiry_id, question_id, value) values ($1, $2, $3, 'true'::jsonb)",
          [a.orgId, a.inquiryId, a.questionId]
        )
      )
      expect(duplicate.code).toBe(UNIQUE_VIOLATION)
      await run(a.orgId, 'delete from voice.qualification_questions where id = $1', [a.questionId])
      expect(await countOf(a.orgId, 'qualification_answers')).toBe(1)
    })

    test('a skipped answer has no value, and a value is text, a number or a yes or no', async () => {
      const a = await seed()
      const answer = (value: string | null, skipped: boolean) =>
        run(
          a.orgId,
          'insert into voice.qualification_answers (organization_id, inquiry_id, question_id, value, skipped) values ($1, $2, $3, $4::jsonb, $5)',
          [a.orgId, a.inquiryId, newId('qst'), value, skipped]
        )
      expect((await refusal(answer('"x"', true))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(answer('{"a":1}', false))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(answer('[1]', false))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(answer(JSON.stringify('x'.repeat(501)), false))).code).toBe(
        CHECK_VIOLATION
      )
      await answer(null, true)
      await answer('42', false)
      await answer('true', false)
    })

    test('answers go with their Inquiry', async () => {
      const a = await seed()
      await run(a.orgId, 'delete from voice.inquiries where id = $1', [a.inquiryId])
      expect(await countOf(a.orgId, 'qualification_answers')).toBe(0)
    })
  })

  describe('agent turns and their sources', () => {
    test('a turn belongs to exactly one of a Call, a Chat and a try-it session', async () => {
      const a = await seed()
      expect((await refusal(addTurn(a.orgId, {}, 1))).code).toBe(CHECK_VIOLATION)
      const two = await refusal(addTurn(a.orgId, { callId: a.callId, chatId: a.chatId }, 1))
      expect(two.code).toBe(CHECK_VIOLATION)
      await addTurn(a.orgId, { chatId: a.chatId }, 0)
      await addTurn(a.orgId, { trySessionId: newId('try') }, 0)
    })

    test('a retried turn is the same row: the index is unique within its conversation', async () => {
      const a = await seed()
      expect((await refusal(addTurn(a.orgId, { callId: a.callId }, 0))).code).toBe(UNIQUE_VIOLATION)
      await addTurn(a.orgId, { callId: a.callId }, 1, 'prospect')
      await addTurn(a.orgId, { chatId: a.chatId }, 0)
      expect((await refusal(addTurn(a.orgId, { chatId: a.chatId }, 0))).code).toBe(UNIQUE_VIOLATION)
      const session = newId('try')
      await addTurn(a.orgId, { trySessionId: session }, 0)
      expect((await refusal(addTurn(a.orgId, { trySessionId: session }, 0))).code).toBe(
        UNIQUE_VIOLATION
      )
    })

    test('the role, the tool, the index and the text are bounded', async () => {
      const a = await seed()
      const call = { callId: a.callId }
      expect((await refusal(addTurn(a.orgId, call, -1))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addTurn(a.orgId, call, 2, 'system'))).code).toBe(CHECK_VIOLATION)
      const unknownTool = await refusal(addTurn(a.orgId, call, 2, 'agent', { toolName: 'format' }))
      expect(unknownTool.code).toBe(CHECK_VIOLATION)
      const prospectTool = await refusal(
        addTurn(a.orgId, call, 2, 'prospect', { toolName: 'book' })
      )
      expect(prospectTool.code).toBe(CHECK_VIOLATION)
      const long = await refusal(
        run(
          a.orgId,
          `insert into voice.agent_turns (id, organization_id, call_id, turn_index, role, text)
           values ($1, $2, $3, 9, 'agent', $4)`,
          [newId('trn'), a.orgId, a.callId, 'x'.repeat(2001)]
        )
      )
      expect(long.code).toBe(CHECK_VIOLATION)
      await addTurn(a.orgId, call, 2, 'agent', { toolName: 'book' })
    })

    test('a source has a position of 0 to 9, a page of 1 to 300 and a bounded passage', async () => {
      const a = await seed()
      const source = (position: number, page: number | null, passage = 'quote') =>
        run(
          a.orgId,
          'insert into voice.agent_turn_sources (organization_id, turn_id, position, document_id, page, passage) values ($1, $2, $3, $4, $5, $6)',
          [a.orgId, a.turnId, position, newId('doc'), page, passage]
        )
      expect((await refusal(source(0, 1))).code).toBe(UNIQUE_VIOLATION)
      expect((await refusal(source(10, 1))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(source(1, 0))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(source(1, 301))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(source(1, 1, 'x'.repeat(513)))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(source(1, 1, ''))).code).toBe(CHECK_VIOLATION)
      await source(1, null)
      await source(9, 300)
    })

    test('sources go with their turn, and turns go with their Call or Chat', async () => {
      const a = await seed()
      const chatTurn = await addTurn(a.orgId, { chatId: a.chatId }, 0)
      await run(
        a.orgId,
        "insert into voice.agent_turn_sources (organization_id, turn_id, position, document_id, passage) values ($1, $2, 0, $3, 'q')",
        [a.orgId, chatTurn, newId('doc')]
      )
      await run(a.orgId, 'delete from voice.handoffs')
      await run(a.orgId, 'delete from voice.inquiries')
      await run(a.orgId, 'delete from voice.chats where id = $1', [a.chatId])
      await run(a.orgId, 'delete from voice.calls where id = $1', [a.callId])
      expect(await countOf(a.orgId, 'agent_turns')).toBe(0)
      expect(await countOf(a.orgId, 'agent_turn_sources')).toBe(0)
    })
  })

  describe('handoffs', () => {
    test('a Handoff names a Call or a Chat by its channel, never both or neither', async () => {
      const a = await seed()
      await run(a.orgId, 'delete from voice.handoffs')
      expect((await refusal(addHandoff(a.orgId, { channel: 'call' }))).code).toBe(CHECK_VIOLATION)
      const both = await refusal(
        addHandoff(a.orgId, { channel: 'call', callId: a.callId, chatId: a.chatId })
      )
      expect(both.code).toBe(CHECK_VIOLATION)
      const wrong = await refusal(addHandoff(a.orgId, { channel: 'chat', callId: a.callId }))
      expect(wrong.code).toBe(CHECK_VIOLATION)
      await addHandoff(a.orgId, { channel: 'chat', chatId: a.chatId })
    })

    test('at most one Handoff per Call or Chat is live at a time', async () => {
      const a = await seed()
      expect((await refusal(addHandoff(a.orgId, { callId: a.callId }))).code).toBe(UNIQUE_VIOLATION)
      await run(a.orgId, "update voice.handoffs set state = 'declined' where id = $1", [
        a.handoffId,
      ])
      await addHandoff(a.orgId, { callId: a.callId })
      await addHandoff(a.orgId, { channel: 'chat', chatId: a.chatId })
      const second = await refusal(addHandoff(a.orgId, { channel: 'chat', chatId: a.chatId }))
      expect(second.code).toBe(UNIQUE_VIOLATION)
    })

    test('the Rep is null exactly when no Rep is left', async () => {
      const a = await seed()
      await run(a.orgId, 'delete from voice.handoffs')
      // an hour ahead, so a skewed database clock cannot put requested_at after it
      const now = new Date(Date.now() + 3_600_000).toISOString()
      const missing = await refusal(addHandoff(a.orgId, { callId: a.callId, rep: null }))
      expect(missing.code).toBe(CHECK_VIOLATION)
      const extra = await refusal(
        addHandoff(a.orgId, { callId: a.callId, state: 'no_rep', completedAt: now })
      )
      expect(extra.code).toBe(CHECK_VIOLATION)
      await addHandoff(a.orgId, { callId: a.callId, state: 'no_rep', rep: null, completedAt: now })
    })

    test('an answered or completed Handoff says when, and the times do not run backwards', async () => {
      const a = await seed()
      await run(a.orgId, 'delete from voice.handoffs')
      // an hour ahead, so a skewed database clock cannot put requested_at after it
      const now = new Date(Date.now() + 3_600_000).toISOString()
      const callId = a.callId
      expect((await refusal(addHandoff(a.orgId, { callId, state: 'accepted' }))).code).toBe(
        CHECK_VIOLATION
      )
      const noEnd = await refusal(
        addHandoff(a.orgId, { callId, state: 'completed', answeredAt: now })
      )
      expect(noEnd.code).toBe(CHECK_VIOLATION)
      const earlyEnd = await refusal(addHandoff(a.orgId, { callId, completedAt: now }))
      expect(earlyEnd.code).toBe(CHECK_VIOLATION)
      const backwards = await refusal(
        addHandoff(a.orgId, { callId, state: 'accepted', answeredAt: '2000-01-01T00:00:00Z' })
      )
      expect(backwards.code).toBe(CHECK_VIOLATION)
      await addHandoff(a.orgId, { callId, state: 'completed', answeredAt: now, completedAt: now })
    })

    test('the state, reason, attempt and result are bounded', async () => {
      const a = await seed()
      const bad = (set: string) =>
        refusal(run(a.orgId, `update voice.handoffs set ${set} where id = $1`, [a.handoffId]))
      expect((await bad("state = 'ringing'")).code).toBe(CHECK_VIOLATION)
      expect((await bad("reason = 'bored'")).code).toBe(CHECK_VIOLATION)
      expect((await bad('attempt = 0')).code).toBe(CHECK_VIOLATION)
      expect((await bad('attempt = 11')).code).toBe(CHECK_VIOLATION)
      expect((await bad("result = 'bridged'")).code).toBe(CHECK_VIOLATION)
    })
  })

  describe('chats', () => {
    test('the session token hash is 32 bytes and unique within the Organization', async () => {
      const orgId = newOrg()
      const hash = createHash('sha256').update('t').digest()
      const insert = (h: Buffer) =>
        run(
          orgId,
          `insert into voice.chats (id, organization_id, source_url, session_token_hash, expires_at)
           values ($1, $2, $3, $4, now() + interval '1 hour')`,
          [newId('cht'), orgId, FORM_URL, h]
        )
      expect((await refusal(insert(Buffer.from('short')))).code).toBe(CHECK_VIOLATION)
      await insert(hash)
      expect((await refusal(insert(hash))).code).toBe(UNIQUE_VIOLATION)
    })

    test('a Chat is closed exactly when it has a close time', async () => {
      const orgId = newOrg()
      const chatId = await addChat(orgId)
      const closedWithoutTime = await refusal(
        run(orgId, "update voice.chats set state = 'closed' where id = $1", [chatId])
      )
      expect(closedWithoutTime.code).toBe(CHECK_VIOLATION)
      const timeWithoutClosed = await refusal(
        run(orgId, 'update voice.chats set closed_at = now() where id = $1', [chatId])
      )
      expect(timeWithoutClosed.code).toBe(CHECK_VIOLATION)
      await addChat(orgId, 'closed')
    })

    test('the source address is an http or https address', async () => {
      const orgId = newOrg()
      const chatId = await addChat(orgId)
      const bad = await refusal(
        run(orgId, "update voice.chats set source_url = 'javascript:alert(1)' where id = $1", [
          chatId,
        ])
      )
      expect(bad.code).toBe(CHECK_VIOLATION)
    })
  })
})
