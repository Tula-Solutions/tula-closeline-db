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
const FOREIGN_KEY_VIOLATION = '23503'
const INSUFFICIENT_PRIVILEGE = '42501'

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`

interface Seeded {
  orgId: string
  voiceId: string
  briefId: string
  prospectId: string
  draftId: string
}

const TABLES = [
  'brand_voices',
  'briefs',
  'brief_statements',
  'drafts',
  'draft_citations',
  'draft_checks',
  'model_usage',
]

/** One harmless update per table that allows updates, to prove a second Organization updates nothing. */
const UPDATES = {
  drafts: "subject = 'x'",
  draft_citations: 'applies = false',
  draft_checks: 'count = count',
  model_usage: 'request_count = 1',
} as const

const PROSPECT_FIELD_SOURCE = 'source_kind, source_prospect_id, source_field'

describe('outbound tables', () => {
  let outbound: Pool
  let handle: DbHandle
  const orgs: string[] = []

  /** Run `fn` in one transaction scoped to `organizationId` (or to none), as the outbound role. */
  async function scoped<T>(orgId: string | null, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await outbound.connect()
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
      Number((await c.query(`select count(*) as n from outbound.${table}`)).rows[0].n)
    )

  const addVoice = async (orgId: string, version = 1) => {
    const id = newId('bvo')
    await run(
      orgId,
      'insert into outbound.brand_voices (id, organization_id, version, tone, created_by_membership_id) values ($1, $2, $3, $4, $5)',
      [id, orgId, version, 'plain and warm', newId('mem')]
    )
    return id
  }

  const addBrief = async (orgId: string, prospectId = newId('prs')) => {
    const id = newId('brf')
    await run(
      orgId,
      `insert into outbound.briefs (id, organization_id, prospect_id, angle_text, angle_origin, prospect_updated_at, language, model, expires_at)
       values ($1, $2, $3, 'lead with the renewal date', 'model_default', now(), 'en', 'model-a', now() + interval '1 day')`,
      [id, orgId, prospectId]
    )
    return { id, prospectId }
  }

  const addStatement = (orgId: string, briefId: string, position: number) =>
    run(
      orgId,
      `insert into outbound.brief_statements (organization_id, brief_id, position, role, text, ${PROSPECT_FIELD_SOURCE})
       values ($1, $2, $3, 'statement', 'Works as a buyer', 'prospect_field', $4, 'jobTitle')`,
      [orgId, briefId, position, newId('prs')]
    )

  const addDraft = async (
    orgId: string,
    voiceId: string,
    prospectId: string,
    options: { briefId?: string | null; voiceVersion?: number; ungrounded?: boolean } = {}
  ) => {
    const id = newId('drf')
    await run(
      orgId,
      `insert into outbound.drafts (id, organization_id, prospect_id, channel, goal, language, subject, body, ungrounded, brand_voice_id, voice_version, brief_id, model)
       values ($1, $2, $3, 'email', 'book a call', 'en', 'Hello', 'Body text', $4, $5, $6, $7, 'model-a')`,
      [
        id,
        orgId,
        prospectId,
        options.ungrounded ?? false,
        voiceId,
        options.voiceVersion ?? 1,
        options.briefId ?? null,
      ]
    )
    return id
  }

  const addCitation = (orgId: string, draftId: string, position: number) =>
    run(
      orgId,
      `insert into outbound.draft_citations (organization_id, draft_id, position, ${PROSPECT_FIELD_SOURCE})
       values ($1, $2, $3, 'prospect_field', $4, 'email')`,
      [orgId, draftId, position, newId('prs')]
    )

  const addCheck = (orgId: string, draftId: string, name = 'length', result = 'pass', count = 0) =>
    run(
      orgId,
      'insert into outbound.draft_checks (organization_id, draft_id, check_name, result, count) values ($1, $2, $3, $4, $5)',
      [orgId, draftId, name, result, count]
    )

  const addUsage = (orgId: string, month = '2026-10-01', model = 'model-a') =>
    run(
      orgId,
      'insert into outbound.model_usage (organization_id, month, model, input_tokens, output_tokens, request_count, cost_micros) values ($1, $2, $3, 10, 20, 1, 500)',
      [orgId, month, model]
    )

  /** Create an Organization with one row in every outbound table. */
  async function seed(): Promise<Seeded> {
    const orgId = newId('org')
    orgs.push(orgId)
    const voiceId = await addVoice(orgId)
    const brief = await addBrief(orgId)
    await addStatement(orgId, brief.id, 0)
    const draftId = await addDraft(orgId, voiceId, brief.prospectId, { briefId: brief.id })
    await addCitation(orgId, draftId, 0)
    await addCheck(orgId, draftId)
    await addUsage(orgId)
    return { orgId, voiceId, briefId: brief.id, prospectId: brief.prospectId, draftId }
  }

  /** Remove an Organization's rows in dependency order; Drafts and Briefs take their children along. */
  async function removeOrganization(orgId: string): Promise<void> {
    await run(orgId, 'delete from outbound.drafts')
    await run(orgId, 'delete from outbound.briefs')
    await run(orgId, 'delete from outbound.brand_voices')
    await run(orgId, 'delete from outbound.model_usage')
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    outbound = new Pool({ connectionString: env.outbound, max: 6 })
    handle = createDb(env.outbound, { max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      await removeOrganization(orgId)
    }
    const owner = new Pool({ connectionString: env.owner, max: 1 })
    await dropStaleTestObjects(owner, env.owner)
    await handle.close()
    await Promise.all([owner.end(), outbound.end()])
  })

  test('every table of the schema passes the tenant isolation check', async () => {
    expect(await findTenantIsolationGaps(handle.db)).toEqual([])
  })

  describe.each(TABLES)('%s', (table) => {
    test('a second Organization reads and removes nothing of the first, and no scope sees nothing', async () => {
      const a = await seed()
      const b = await seed()
      expect(await countOf(a.orgId, table)).toBe(1)
      expect(await countOf(b.orgId, table)).toBe(1)
      expect(await countOf(null, table)).toBe(0)
      const read = await run(
        b.orgId,
        `select 1 from outbound.${table} where organization_id = $1`,
        [a.orgId]
      )
      expect(read.rowCount).toBe(0)
      const removed = await run(
        b.orgId,
        `delete from outbound.${table} where organization_id = $1`,
        [a.orgId]
      )
      expect(removed.rowCount).toBe(0)
      expect(await countOf(a.orgId, table)).toBe(1)
    })
  })

  describe.each(Object.keys(UPDATES) as (keyof typeof UPDATES)[])('%s updates', (table) => {
    test('a second Organization updates nothing of the first', async () => {
      const a = await seed()
      const b = await seed()
      const result = await run(
        b.orgId,
        `update outbound.${table} set ${UPDATES[table]} where organization_id = $1`,
        [a.orgId]
      )
      expect(result.rowCount).toBe(0)
    })
  })

  test('a second Organization cannot insert rows for the first', async () => {
    const a = await seed()
    const b = await seed()
    const voiceError = await refusal(
      run(
        b.orgId,
        'insert into outbound.brand_voices (id, organization_id, version, tone, created_by_membership_id) values ($1, $2, 9, $3, $4)',
        [newId('bvo'), a.orgId, 'x', newId('mem')]
      )
    )
    expect(voiceError.code).toBe(INSUFFICIENT_PRIVILEGE)
    const usageError = await refusal(
      run(
        b.orgId,
        "insert into outbound.model_usage (organization_id, month, model) values ($1, '2026-09-01', 'm')",
        [a.orgId]
      )
    )
    expect(usageError.code).toBe(INSUFFICIENT_PRIVILEGE)
    expect(await countOf(a.orgId, 'model_usage')).toBe(1)
  })

  test('an insert with no Organization in scope is refused', async () => {
    const error = await refusal(
      run(
        null,
        'insert into outbound.brand_voices (id, organization_id, version, tone, created_by_membership_id) values ($1, $2, 1, $3, $4)',
        [newId('bvo'), newId('org'), 'x', newId('mem')]
      )
    )
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
  })

  describe('brand voices', () => {
    test('a version is recorded once per Organization and another Organization may reuse it', async () => {
      const a = await seed()
      const b = await seed()
      expect((await refusal(addVoice(a.orgId, 1))).code).toBe(UNIQUE_VIOLATION)
      await addVoice(a.orgId, 2)
      await addVoice(b.orgId, 2)
    })

    test('a version never changes: the role holds no UPDATE', async () => {
      const a = await seed()
      const error = await refusal(
        run(a.orgId, "update outbound.brand_voices set tone = 'x' where id = $1", [a.voiceId])
      )
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
    })

    test('the shape checks refuse an empty tone, an empty term, too many terms and a bad length', async () => {
      const orgId = newId('org')
      orgs.push(orgId)
      const insert = (set: string, value: unknown) =>
        run(
          orgId,
          `insert into outbound.brand_voices (id, organization_id, version, tone, created_by_membership_id, ${set}) values ($1, $2, 1, 'ok', $3, $4)`,
          [newId('bvo'), orgId, newId('mem'), value]
        )
      expect((await refusal(insert('banned_phrases', ['fine', '']))).code).toBe(CHECK_VIOLATION)
      expect(
        (
          await refusal(
            insert(
              'preferred_words',
              Array.from({ length: 51 }, (_, i) => `w${i}`)
            )
          )
        ).code
      ).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('max_length_characters', 99))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('max_length_characters', 5001))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('sign_off', ''))).code).toBe(CHECK_VIOLATION)
      const emptyTone = await refusal(
        run(
          orgId,
          "insert into outbound.brand_voices (id, organization_id, version, tone, created_by_membership_id) values ($1, $2, 2, '', $3)",
          [newId('bvo'), orgId, newId('mem')]
        )
      )
      expect(emptyTone.code).toBe(CHECK_VIOLATION)
    })
  })

  describe('briefs', () => {
    test('a Brief and its statements never change: the role holds no UPDATE', async () => {
      const a = await seed()
      const briefError = await refusal(
        run(a.orgId, "update outbound.briefs set angle_text = 'x' where id = $1", [a.briefId])
      )
      expect(briefError.code).toBe(INSUFFICIENT_PRIVILEGE)
      const statementError = await refusal(
        run(a.orgId, "update outbound.brief_statements set text = 'x' where brief_id = $1", [
          a.briefId,
        ])
      )
      expect(statementError.code).toBe(INSUFFICIENT_PRIVILEGE)
    })

    test('a Brief expires after it is created', async () => {
      const a = await seed()
      const error = await refusal(
        run(
          a.orgId,
          `insert into outbound.briefs (id, organization_id, prospect_id, angle_text, angle_origin, prospect_updated_at, language, model, created_at, expires_at)
           values ($1, $2, $3, 'x', 'won_deals', now(), 'en', 'm', now(), now() - interval '1 day')`,
          [newId('brf'), a.orgId, newId('prs')]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })

    test('a request key builds one Brief per Organization and has a bounded shape', async () => {
      const a = await seed()
      const b = await seed()
      const insert = (orgId: string, key: string) =>
        run(
          orgId,
          `insert into outbound.briefs (id, organization_id, prospect_id, angle_text, angle_origin, prospect_updated_at, language, model, expires_at, request_key)
           values ($1, $2, $3, 'x', 'won_deals', now(), 'en', 'm', now() + interval '1 day', $4)`,
          [newId('brf'), orgId, newId('prs'), key]
        )
      const key = 'idem-key-0000000001'
      await insert(a.orgId, key)
      expect((await refusal(insert(a.orgId, key))).code).toBe(UNIQUE_VIOLATION)
      await insert(b.orgId, key)
      expect((await refusal(insert(a.orgId, 'too-short'))).code).toBe(CHECK_VIOLATION)
    })

    test('a statement needs text and a source, an angle source has no text', async () => {
      const a = await seed()
      const noText = await refusal(
        run(
          a.orgId,
          `insert into outbound.brief_statements (organization_id, brief_id, position, role, ${PROSPECT_FIELD_SOURCE}) values ($1, $2, 1, 'statement', 'prospect_field', $3, 'email')`,
          [a.orgId, a.briefId, newId('prs')]
        )
      )
      expect(noText.code).toBe(CHECK_VIOLATION)
      const textOnAngle = await refusal(
        run(
          a.orgId,
          `insert into outbound.brief_statements (organization_id, brief_id, position, role, text, ${PROSPECT_FIELD_SOURCE}) values ($1, $2, 1, 'angle_source', 'x', 'prospect_field', $3, 'email')`,
          [a.orgId, a.briefId, newId('prs')]
        )
      )
      expect(textOnAngle.code).toBe(CHECK_VIOLATION)
      await run(
        a.orgId,
        `insert into outbound.brief_statements (organization_id, brief_id, position, role, ${PROSPECT_FIELD_SOURCE}) values ($1, $2, 1, 'angle_source', 'prospect_field', $3, 'email')`,
        [a.orgId, a.briefId, newId('prs')]
      )
    })

    test('a statement cannot reference a Brief of another Organization', async () => {
      const a = await seed()
      const b = await seed()
      const error = await refusal(addStatement(b.orgId, a.briefId, 1))
      expect(error.code).toBe(FOREIGN_KEY_VIOLATION)
    })

    test('deleting a Brief takes its statements along', async () => {
      const a = await seed()
      const brief = await addBrief(a.orgId)
      await addStatement(a.orgId, brief.id, 0)
      expect(await countOf(a.orgId, 'brief_statements')).toBe(2)
      await run(a.orgId, 'delete from outbound.briefs where id = $1', [brief.id])
      expect(await countOf(a.orgId, 'brief_statements')).toBe(1)
    })
  })

  describe('drafts', () => {
    test('a Draft names a version of a Brand Voice its Organization holds', async () => {
      const a = await seed()
      const b = await seed()
      expect(
        (await refusal(addDraft(a.orgId, a.voiceId, a.prospectId, { voiceVersion: 2 }))).code
      ).toBe(FOREIGN_KEY_VIOLATION)
      expect((await refusal(addDraft(b.orgId, a.voiceId, a.prospectId))).code).toBe(
        FOREIGN_KEY_VIOLATION
      )
    })

    test('a Draft cannot cite a Brief of another Prospect or Organization', async () => {
      const a = await seed()
      const b = await seed()
      expect(
        (await refusal(addDraft(a.orgId, a.voiceId, newId('prs'), { briefId: a.briefId }))).code
      ).toBe(FOREIGN_KEY_VIOLATION)
      expect(
        (await refusal(addDraft(b.orgId, b.voiceId, b.prospectId, { briefId: a.briefId }))).code
      ).toBe(FOREIGN_KEY_VIOLATION)
    })

    test('an ungrounded Draft is never auto-sendable', async () => {
      const a = await seed()
      const error = await refusal(
        run(
          a.orgId,
          'update outbound.drafts set ungrounded = true, auto_sendable = true where id = $1',
          [a.draftId]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
      await run(a.orgId, 'update outbound.drafts set ungrounded = true where id = $1', [a.draftId])
    })

    test('an edit raises the revision and the shape checks hold', async () => {
      const a = await seed()
      const unrevised = await refusal(
        run(a.orgId, "update outbound.drafts set source = 'edited' where id = $1", [a.draftId])
      )
      expect(unrevised.code).toBe(CHECK_VIOLATION)
      await run(
        a.orgId,
        "update outbound.drafts set source = 'edited', revision = 2, body = 'New body', updated_at = now() where id = $1",
        [a.draftId]
      )
      for (const set of [
        "subject = ''",
        `body = '${'x'.repeat(5001)}'`,
        `subject = '${'x'.repeat(201)}'`,
        "step_key = 'Bad Key'",
        "channel = 'sms'",
        "updated_at = now() - interval '1 day'",
      ]) {
        const error = await refusal(
          run(a.orgId, `update outbound.drafts set ${set} where id = $1`, [a.draftId])
        )
        expect(error.code).toBe(CHECK_VIOLATION)
      }
    })

    test('deleting a Draft takes its Citations and checks along', async () => {
      const a = await seed()
      const draftId = await addDraft(a.orgId, a.voiceId, a.prospectId)
      await addCitation(a.orgId, draftId, 0)
      await addCheck(a.orgId, draftId)
      expect(await countOf(a.orgId, 'draft_citations')).toBe(2)
      await run(a.orgId, 'delete from outbound.drafts where id = $1', [draftId])
      expect(await countOf(a.orgId, 'draft_citations')).toBe(1)
      expect(await countOf(a.orgId, 'draft_checks')).toBe(1)
    })

    test('a Brand Voice version a Draft uses cannot be removed', async () => {
      const a = await seed()
      const error = await refusal(
        run(a.orgId, 'delete from outbound.brand_voices where id = $1', [a.voiceId])
      )
      expect(error.code).toBe(FOREIGN_KEY_VIOLATION)
    })
  })

  describe('draft citations', () => {
    test('a Citation stores ids and a score and has no column for the source text', async () => {
      const a = await seed()
      await run(
        a.orgId,
        `insert into outbound.draft_citations (organization_id, draft_id, position, source_kind, source_call_id, source_deal_record_id, score)
         values ($1, $2, 1, 'moment', $3, $4, 0.83)`,
        [a.orgId, a.draftId, newId('call'), newId('deal')]
      )
      const columns = await run(
        a.orgId,
        "select column_name from information_schema.columns where table_schema = 'outbound' and table_name = 'draft_citations'"
      )
      expect(columns.rows.length).toBeGreaterThan(5)
      for (const row of columns.rows as { column_name: string }[]) {
        expect(row.column_name).not.toMatch(/snippet|text|excerpt|content|quote/)
      }
    })

    test('each kind of source fills exactly its own columns', async () => {
      const a = await seed()
      const insert = (cols: string, values: unknown[], position: number) =>
        run(
          a.orgId,
          `insert into outbound.draft_citations (organization_id, draft_id, position, ${cols}) values ($1, $2, ${position}, ${values.map((_, i) => `$${i + 3}`).join(', ')})`,
          [a.orgId, a.draftId, ...values]
        )
      expect(
        (await refusal(insert('source_kind, source_signal_id', ['signal', newId('sig')], 2))).code
      ).toBe(CHECK_VIOLATION)
      expect(
        (
          await refusal(
            insert(
              'source_kind, source_prospect_id, source_field, source_page',
              ['prospect_field', newId('prs'), 'email', 3],
              2
            )
          )
        ).code
      ).toBe(CHECK_VIOLATION)
      expect(
        (
          await refusal(
            insert(
              'source_kind, source_url, source_retrieved_at',
              ['web_page', 'javascript:alert(1)', new Date()],
              2
            )
          )
        ).code
      ).toBe(CHECK_VIOLATION)
      expect(
        (
          await refusal(
            insert(
              'source_kind, source_url, source_retrieved_at',
              ['web_page', 'https://user:pw@example.com/a', new Date()],
              2
            )
          )
        ).code
      ).toBe(CHECK_VIOLATION)
      await insert(
        'source_kind, source_url, source_retrieved_at',
        ['web_page', 'https://example.com/a?b=1', new Date()],
        2
      )
      await insert(
        'source_kind, source_document_id, source_page',
        ['document', newId('doc'), 12],
        3
      )
      await insert('source_kind, source_document_id', ['document', newId('doc')], 4)
      expect(
        (
          await refusal(
            insert(
              'source_kind, source_document_id, source_page',
              ['document', newId('doc'), 301],
              5
            )
          )
        ).code
      ).toBe(CHECK_VIOLATION)
    })

    test('a score belongs to a Moment or a Document only, and a Draft holds at most 20 Citations', async () => {
      const a = await seed()
      const scored = await refusal(
        run(a.orgId, 'update outbound.draft_citations set score = 0.5 where draft_id = $1', [
          a.draftId,
        ])
      )
      expect(scored.code).toBe(CHECK_VIOLATION)
      const tooMany = await refusal(addCitation(a.orgId, a.draftId, 20))
      expect(tooMany.code).toBe(CHECK_VIOLATION)
      expect((await refusal(addCitation(a.orgId, a.draftId, 0))).code).toBe(UNIQUE_VIOLATION)
    })

    test('a Citation cannot reference a Draft of another Organization', async () => {
      const a = await seed()
      const b = await seed()
      expect((await refusal(addCitation(b.orgId, a.draftId, 1))).code).toBe(FOREIGN_KEY_VIOLATION)
    })
  })

  describe('draft checks', () => {
    test('a check name is recorded once per Draft and a re-run replaces it', async () => {
      const a = await seed()
      expect((await refusal(addCheck(a.orgId, a.draftId, 'length'))).code).toBe(UNIQUE_VIOLATION)
      await run(
        a.orgId,
        `insert into outbound.draft_checks (organization_id, draft_id, check_name, result, count) values ($1, $2, 'length', 'fail', 2)
         on conflict (organization_id, draft_id, check_name) do update set result = excluded.result, count = excluded.count`,
        [a.orgId, a.draftId]
      )
      const row = await run(a.orgId, 'select result, count from outbound.draft_checks')
      expect(row.rows).toEqual([{ result: 'fail', count: 2 }])
    })

    test('pass means no findings, and the name is one of the five', async () => {
      const a = await seed()
      expect((await refusal(addCheck(a.orgId, a.draftId, 'banned_phrase', 'pass', 1))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(addCheck(a.orgId, a.draftId, 'banned_phrase', 'fail', 0))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(addCheck(a.orgId, a.draftId, 'tone', 'pass', 0))).code).toBe(
        CHECK_VIOLATION
      )
    })
  })

  describe('model usage', () => {
    test('an upsert adds to the month, and the month must be its first day', async () => {
      const a = await seed()
      await run(
        a.orgId,
        `insert into outbound.model_usage (organization_id, month, model, input_tokens, output_tokens, request_count, cost_micros)
         values ($1, '2026-10-01', 'model-a', 5, 5, 1, 100)
         on conflict (organization_id, month, model) do update set
           input_tokens = outbound.model_usage.input_tokens + excluded.input_tokens,
           cost_micros = outbound.model_usage.cost_micros + excluded.cost_micros`,
        [a.orgId]
      )
      const row = await run(a.orgId, 'select input_tokens, cost_micros from outbound.model_usage')
      expect(row.rows).toEqual([{ input_tokens: '15', cost_micros: '600' }])
      expect((await refusal(addUsage(a.orgId, '2026-10-15', 'model-b'))).code).toBe(CHECK_VIOLATION)
      const negative = await refusal(
        run(a.orgId, 'update outbound.model_usage set cost_micros = -1')
      )
      expect(negative.code).toBe(CHECK_VIOLATION)
    })

    test('the same month and model is accepted in another Organization', async () => {
      const a = await seed()
      const b = await seed()
      await addUsage(a.orgId, '2026-08-01', 'model-z')
      await addUsage(b.orgId, '2026-08-01', 'model-z')
    })
  })
})
