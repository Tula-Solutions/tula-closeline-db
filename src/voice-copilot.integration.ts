import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes, randomInt } from 'node:crypto'
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
const TABLES = ['call_turns', 'copilot_cards', 'copilot_settings']
const ref = () => ({ callId: newId('call'), dealRecordId: newId('deal') })

interface CardOptions {
  sequence?: number
  kind?: string
  cited?: unknown
  moments?: number
  deals?: number
  extra?: Record<string, unknown>
}

describe('voice Copilot tables', () => {
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
      "insert into voice.calls (id, organization_id, direction, state, line_id, prospect_number) values ($1, $2, 'outbound', 'ringing', $3, $4)",
      [id, orgId, lineId, phone()]
    )
    return id
  }

  const addTurn = (
    orgId: string,
    callId: string,
    track = 'prospect',
    sequence = 1,
    over: { text?: string; startMs?: number; endMs?: number } = {}
  ) =>
    run(
      orgId,
      `insert into voice.call_turns (organization_id, call_id, track, sequence, text, start_ms, end_ms)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        orgId,
        callId,
        track,
        sequence,
        over.text ?? 'We are worried about price',
        over.startMs ?? 1000,
        over.endMs ?? 2500,
      ]
    )

  const addCard = async (orgId: string, callId: string, o: CardOptions = {}): Promise<string> => {
    const id = newId('ccard')
    const v: Record<string, unknown> = { kind: o.kind ?? 'similar_moment', ...o.extra }
    await run(
      orgId,
      `insert into voice.copilot_cards
         (id, organization_id, call_id, sequence, kind, evidence_moments, evidence_deals, cited_moments,
          objection_type, response, next_step, document_id, document_page, document_passage, dismissed, pinned)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        id,
        orgId,
        callId,
        o.sequence ?? 1,
        v.kind,
        o.moments ?? 3,
        o.deals ?? 2,
        JSON.stringify(o.cited ?? [ref()]),
        v.objection_type ?? null,
        v.response ?? null,
        v.next_step ?? null,
        v.document_id ?? null,
        v.document_page ?? null,
        v.document_passage ?? null,
        v.dismissed ?? false,
        v.pinned ?? false,
      ]
    )
    return id
  }

  const insertSettings = (orgId: string, minMoments = 3, minDeals = 2) =>
    run(
      orgId,
      `insert into voice.copilot_settings (organization_id, enabled, min_moments, min_deals)
       values ($1, true, $2, $3)`,
      [orgId, minMoments, minDeals]
    )

  /** One Organization with a row in every table. */
  async function seed() {
    const orgId = newOrg()
    const callId = await addCall(orgId)
    await addTurn(orgId, callId)
    const cardId = await addCard(orgId, callId)
    await insertSettings(orgId)
    return { orgId, callId, cardId }
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    voice = new Pool({ connectionString: env.voice, max: 6 })
    owner = new Pool({ connectionString: env.owner, max: 1 })
    handle = createDb(env.voice, { max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      for (const table of ['calls', 'lines', 'copilot_settings']) {
        await run(orgId, `delete from voice.${table}`)
      }
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

  test('a second Organization updates nothing of the first and writes nothing into it', async () => {
    const a = await seed()
    const b = await seed()
    const turn = await run(b.orgId, "update voice.call_turns set text = 'x' where call_id = $1", [
      a.callId,
    ])
    expect(turn.rowCount).toBe(0)
    const card = await run(b.orgId, 'update voice.copilot_cards set pinned = true where id = $1', [
      a.cardId,
    ])
    expect(card.rowCount).toBe(0)
    const settings = await run(
      b.orgId,
      'update voice.copilot_settings set enabled = false where organization_id = $1',
      [a.orgId]
    )
    expect(settings.rowCount).toBe(0)
    expect((await refusal(addTurn(b.orgId, a.callId, 'rep', 9))).code).toBe(FOREIGN_KEY_VIOLATION)
    const foreignTurn = await refusal(
      run(
        b.orgId,
        `insert into voice.call_turns (organization_id, call_id, track, sequence, text, start_ms, end_ms)
         values ($1, $2, 'rep', 1, 'hi', 0, 1)`,
        [a.orgId, a.callId]
      )
    )
    expect(foreignTurn.code).toBe(INSUFFICIENT_PRIVILEGE)
    expect((await refusal(addCard(b.orgId, a.callId, { sequence: 7 }))).code).toBe(
      FOREIGN_KEY_VIOLATION
    )
    const foreignSettings = await refusal(
      run(b.orgId, 'insert into voice.copilot_settings (organization_id) values ($1)', [a.orgId])
    )
    expect(foreignSettings.code).toBe(INSUFFICIENT_PRIVILEGE)
  })

  describe('call_turns', () => {
    test('is unique on Organization, Call, track and sequence', async () => {
      const orgId = newOrg()
      const callId = await addCall(orgId)
      await addTurn(orgId, callId, 'prospect', 1)
      await addTurn(orgId, callId, 'rep', 1)
      await addTurn(orgId, callId, 'prospect', 2)
      expect((await refusal(addTurn(orgId, callId, 'prospect', 1))).code).toBe(UNIQUE_VIOLATION)
      const other = await addCall(orgId)
      await addTurn(orgId, other, 'prospect', 1)
    })

    test('refuses an unknown track, a bad sequence, empty or long text and bad times', async () => {
      const orgId = newOrg()
      const callId = await addCall(orgId)
      expect((await refusal(addTurn(orgId, callId, 'agent', 1))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addTurn(orgId, callId, 'rep', 0))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addTurn(orgId, callId, 'rep', 1, { text: '' }))).code).toBe(
        CHECK_VIOLATION
      )
      expect(
        (await refusal(addTurn(orgId, callId, 'rep', 1, { text: 'x'.repeat(4001) }))).code
      ).toBe(CHECK_VIOLATION)
      await addTurn(orgId, callId, 'rep', 1, { text: 'x'.repeat(4000) })
      expect(
        (await refusal(addTurn(orgId, callId, 'rep', 2, { startMs: 500, endMs: 100 }))).code
      ).toBe(CHECK_VIOLATION)
      expect(
        (await refusal(addTurn(orgId, callId, 'rep', 3, { startMs: -1, endMs: 100 }))).code
      ).toBe(CHECK_VIOLATION)
    })

    test('needs a Call of the same Organization, and goes with the Call', async () => {
      const orgId = newOrg()
      expect((await refusal(addTurn(orgId, newId('call'), 'rep', 1))).code).toBe(
        FOREIGN_KEY_VIOLATION
      )
      const callId = await addCall(orgId)
      await addTurn(orgId, callId)
      await addCard(orgId, callId)
      await run(orgId, 'delete from voice.calls where id = $1', [callId])
      expect(await countOf(orgId, 'call_turns')).toBe(0)
      expect(await countOf(orgId, 'copilot_cards')).toBe(0)
    })
  })

  describe('copilot_cards', () => {
    test('is unique on Call and sequence, 1 to 60', async () => {
      const orgId = newOrg()
      const callId = await addCall(orgId)
      await addCard(orgId, callId, { sequence: 1 })
      await addCard(orgId, callId, { sequence: 2 })
      expect((await refusal(addCard(orgId, callId, { sequence: 2 }))).code).toBe(UNIQUE_VIOLATION)
      expect((await refusal(addCard(orgId, callId, { sequence: 61 }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addCard(orgId, callId, { sequence: 0 }))).code).toBe(CHECK_VIOLATION)
    })

    test('is never without a citation, and the evidence covers the citations', async () => {
      const orgId = newOrg()
      const callId = await addCall(orgId)
      expect((await refusal(addCard(orgId, callId, { cited: [] }))).code).toBe(CHECK_VIOLATION)
      const six = Array.from({ length: 6 }, ref)
      expect((await refusal(addCard(orgId, callId, { cited: six, moments: 6 }))).code).toBe(
        CHECK_VIOLATION
      )
      await addCard(orgId, callId, {
        sequence: 2,
        cited: Array.from({ length: 5 }, ref),
        moments: 5,
        deals: 3,
      })
      const bad = [
        { cited: [ref(), ref()], moments: 1, deals: 1 },
        { cited: [{ callId: 'x', dealRecordId: 'y' }] },
        { cited: [{}] },
        { cited: { a: 1 } },
      ]
      let sequence = 3
      for (const o of bad) {
        expect((await refusal(addCard(orgId, callId, { ...o, sequence: sequence++ }))).code).toBe(
          CHECK_VIOLATION
        )
      }
    })

    test('counts no more Deals than Moments and at least one of each', async () => {
      const orgId = newOrg()
      const callId = await addCall(orgId)
      for (const [moments, deals] of [
        [2, 3],
        [3, 0],
        [101, 2],
      ]) {
        expect((await refusal(addCard(orgId, callId, { moments, deals }))).code).toBe(
          CHECK_VIOLATION
        )
      }
    })

    test('sets the columns of its kind and none of another', async () => {
      const orgId = newOrg()
      const callId = await addCall(orgId)
      const objection = { objection_type: 'price', response: 'Ask what budget they hold' }
      const document = {
        document_id: newId('doc'),
        document_page: 3,
        document_passage: 'Plans start at 10 dollars',
      }
      await addCard(orgId, callId, { sequence: 1, kind: 'objection', extra: objection })
      await addCard(orgId, callId, {
        sequence: 2,
        kind: 'next_step',
        extra: { next_step: 'Book it' },
      })
      await addCard(orgId, callId, { sequence: 3, kind: 'document', extra: document })
      const refused: CardOptions[] = [
        { kind: 'objection' },
        { kind: 'objection', extra: { ...objection, objection_type: 'weather' } },
        { kind: 'next_step' },
        { kind: 'document', extra: { document_id: newId('doc') } },
        { kind: 'similar_moment', extra: objection },
        { kind: 'similar_moment', extra: { next_step: 'x' } },
        { kind: 'similar_moment', extra: document },
        { kind: 'next_step', extra: { next_step: 'x', document_page: 2 } },
        { kind: 'poll' },
        { kind: 'document', extra: { ...document, document_page: 301 } },
        { kind: 'document', extra: { ...document, document_passage: 'x'.repeat(513) } },
        { kind: 'document', extra: { ...document, document_id: 'doc_1' } },
        { kind: 'next_step', extra: { next_step: 'x'.repeat(601) } },
        { kind: 'objection', extra: { ...objection, response: 'x'.repeat(601) } },
      ]
      let sequence = 4
      for (const o of refused) {
        const error = await refusal(addCard(orgId, callId, { ...o, sequence: sequence++ }))
        expect(error.code).toBe(CHECK_VIOLATION)
      }
    })

    test('is dismissed or pinned, not both, and rates only as known', async () => {
      const orgId = newOrg()
      const callId = await addCall(orgId)
      expect(
        (await refusal(addCard(orgId, callId, { extra: { dismissed: true, pinned: true } }))).code
      ).toBe(CHECK_VIOLATION)
      const id = await addCard(orgId, callId, { sequence: 2 })
      await run(orgId, "update voice.copilot_cards set rating = 'useful' where id = $1", [id])
      const bad = await refusal(
        run(orgId, "update voice.copilot_cards set rating = 'great' where id = $1", [id])
      )
      expect(bad.code).toBe(CHECK_VIOLATION)
    })

    test('bounds the stored quotes', async () => {
      const orgId = newOrg()
      const callId = await addCall(orgId)
      const id = await addCard(orgId, callId)
      const quote = (n: number) => ({ ...ref(), prospect: 'p'.repeat(n), repNext: 'r'.repeat(n) })
      const setQuotes = (quotes: unknown) =>
        run(orgId, 'update voice.copilot_cards set quotes = $2::jsonb where id = $1', [
          id,
          JSON.stringify(quotes),
        ])
      await setQuotes([quote(512), quote(512)])
      expect((await refusal(setQuotes(Array.from({ length: 6 }, () => quote(5))))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(setQuotes([quote(20000)]))).code).toBe(CHECK_VIOLATION)
    })

    test('has the index that lists a Call by shown time', async () => {
      const found = await owner.query(
        `select 1 from pg_indexes
          where schemaname = 'voice' and tablename = 'copilot_cards'
            and indexname = 'copilot_cards_shown_idx'`
      )
      expect(found.rowCount).toBe(1)
    })
  })

  describe('copilot_settings', () => {
    test('is one row per Organization with the default minimums', async () => {
      const orgId = newOrg()
      const insert = () =>
        run(orgId, 'insert into voice.copilot_settings (organization_id) values ($1)', [orgId])
      await insert()
      const row = (await run(orgId, 'select * from voice.copilot_settings')).rows[0]
      expect([row.enabled, row.min_moments, row.min_deals]).toEqual([false, 3, 2])
      expect((await refusal(insert())).code).toBe(UNIQUE_VIOLATION)
    })

    test('keeps the minimums within 1 to 20 and deals within moments', async () => {
      for (const [moments, deals] of [
        [0, 0],
        [21, 2],
        [3, 4],
        [3, 0],
      ]) {
        const orgId = newOrg()
        expect((await refusal(insertSettings(orgId, moments, deals))).code).toBe(CHECK_VIOLATION)
      }
      await insertSettings(newOrg(), 20, 20)
    })

    test('refuses a malformed updater id', async () => {
      const orgId = newOrg()
      await insertSettings(orgId)
      const bad = await refusal(
        run(orgId, "update voice.copilot_settings set updated_by_membership_id = 'bob'")
      )
      expect(bad.code).toBe(CHECK_VIOLATION)
    })
  })
})
