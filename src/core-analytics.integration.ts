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

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`

const TABLES = [
  'assessment_findings',
  'assessments',
  'conversation_summaries',
  'rollup_daily',
  'source_performance',
  'touches',
] as const

describe('core analytics, assessment and summary tables', () => {
  let owner: Pool
  let core: Pool
  let handle: DbHandle
  const orgs: string[] = []

  /** Run `fn` in one transaction scoped to `orgId` (or to none), as the core role. */
  async function scoped<T>(orgId: string | null, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await core.connect()
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
      Number((await c.query(`select count(*) as n from core.${table}`)).rows[0].n)
    )

  const insertRollup = (orgId: string, metric: string, day: string, count: number) =>
    run(
      orgId,
      `insert into core.rollup_daily (organization_id, metric, group_kind, day, group_key, count)
       values ($1, $2, 'total', $3, '', $4)`,
      [orgId, metric, day, count]
    )

  const insertAssessment = (
    orgId: string,
    id: string,
    subject: { draftId: string; version: number } | { callId: string; turn: number },
    verdict = 'pass'
  ) =>
    'draftId' in subject
      ? run(
          orgId,
          `insert into core.assessments (id, organization_id, subject_kind, draft_id, draft_version, agent_kind, verdict)
           values ($1, $2, 'draft', $3, $4, 'outbound', $5)`,
          [id, orgId, subject.draftId, subject.version, verdict]
        )
      : run(
          orgId,
          `insert into core.assessments (id, organization_id, subject_kind, call_id, turn_index, agent_kind, verdict)
           values ($1, $2, 'call_turn', $3, $4, 'inbound', $5)`,
          [id, orgId, subject.callId, subject.turn, verdict]
        )

  /** An Organization with one row in each table, returning its ids. */
  async function seed(): Promise<{ orgId: string; assessmentId: string }> {
    const orgId = newId('org')
    orgs.push(orgId)
    await scoped(orgId, async (c) => {
      await c.query(
        'insert into core.organizations (organization_id, name, region) values ($1, $2, $3)',
        [orgId, 'Org', 'us']
      )
      await c.query(
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, 'owner', 'o@example.test')",
        [newId('mem'), orgId, newId('usr')]
      )
    })
    await insertRollup(orgId, 'sends', '2026-05-01', 3)
    await run(
      orgId,
      `insert into core.touches (id, organization_id, kind, ref_id, prospect_id, channel, occurred_at, cited_sources)
       values ($1, $2, 'message', $3, $4, 'email', now(), '[{"kind":"moment","key":"call_x:1"}]')`,
      [newId('tch'), orgId, newId('msg'), newId('prs')]
    )
    await run(
      orgId,
      `insert into core.source_performance (organization_id, source_kind, source_key, deals_touched, deals_won)
       values ($1, 'moment', 'k1', 4, 1)`,
      [orgId]
    )
    const assessmentId = newId('asm')
    await run(
      orgId,
      `insert into core.assessments (id, organization_id, subject_kind, draft_id, draft_version, agent_kind, verdict, worst_severity_rank)
       values ($1, $2, 'draft', $3, 1, 'outbound', 'fail', 3)`,
      [assessmentId, orgId, newId('drf')]
    )
    await run(
      orgId,
      `insert into core.assessment_findings (id, organization_id, assessment_id, category, severity, span_start, span_end, explanation)
       values ($1, $2, $3, 'unsupported_claim', 'high', 10, 42, 'No source supports this.')`,
      [newId('fnd'), orgId, assessmentId]
    )
    await run(
      orgId,
      `insert into core.conversation_summaries (organization_id, conversation_id, summary, outcome_label)
       values ($1, $2, 'They asked for pricing.', 'open')`,
      [orgId, newId('cnv')]
    )
    return { orgId, assessmentId }
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    core = new Pool({ connectionString: env.core, max: 4 })
    handle = createDb(env.core, { max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      await owner.query('delete from core.organizations where organization_id = $1', [orgId])
    }
    await dropStaleTestObjects(owner, env.owner)
    await handle.close()
    await Promise.all([owner.end(), core.end()])
  })

  test.each([...TABLES])('a second Organization reads nothing from %s', async (table) => {
    const a = await seed()
    const b = await seed()
    expect(await countOf(a.orgId, table)).toBe(1)
    expect(await countOf(b.orgId, table)).toBe(1)
    expect(await countOf(null, table)).toBe(0)
    const other = await run(b.orgId, `select * from core.${table} where organization_id = $1`, [
      a.orgId,
    ])
    expect(other.rowCount).toBe(0)
  })

  test('a second Organization cannot write a row for the first', async () => {
    const a = await seed()
    const b = await seed()
    const error = await refusal(
      insertRollup(a.orgId, 'replies', '2026-05-02', 1).then(() =>
        run(
          b.orgId,
          `insert into core.rollup_daily (organization_id, metric, group_kind, day, group_key, count)
        values ($1, 'sends', 'total', '2026-05-09', '', 1)`,
          [a.orgId]
        )
      )
    )
    expect(error.message).toContain('row-level security')
  })

  test('every table of the schema passes the tenant isolation check', async () => {
    expect(await findTenantIsolationGaps(handle.db)).toEqual([])
  })

  test('a rollup row is unique per Organization, metric, group, day and key', async () => {
    const { orgId } = await seed()
    const error = await refusal(insertRollup(orgId, 'sends', '2026-05-01', 9))
    expect(error.code).toBe(UNIQUE_VIOLATION)
    // The same key on another day, another metric or another group is a different row.
    await insertRollup(orgId, 'sends', '2026-05-02', 1)
    await insertRollup(orgId, 'replies', '2026-05-01', 1)
    await run(
      orgId,
      `insert into core.rollup_daily (organization_id, metric, group_kind, day, group_key, count)
       values ($1, 'sends', 'channel', '2026-05-01', 'email', 2)`,
      [orgId]
    )
    expect(await countOf(orgId, 'rollup_daily')).toBe(4)
  })

  test('replaying a rollup upsert with the same count changes nothing', async () => {
    const { orgId } = await seed()
    const upsert = () =>
      run(
        orgId,
        `insert into core.rollup_daily (organization_id, metric, group_kind, day, group_key, count)
         values ($1, 'sends', 'total', '2026-05-01', '', 3)
         on conflict (organization_id, metric, group_kind, day, group_key)
         do update set count = excluded.count, updated_at = now()`,
        [orgId]
      )
    await upsert()
    await upsert()
    const rows = await run(orgId, 'select count from core.rollup_daily')
    expect(rows.rows.map((r) => String(r.count))).toEqual(['3'])
  })

  test('a total row has the empty key and a split row has a key', async () => {
    const { orgId } = await seed()
    const bad = [
      ['total', 'x'],
      ['channel', ''],
    ]
    for (const [kind, key] of bad) {
      const error = await refusal(
        run(
          orgId,
          `insert into core.rollup_daily (organization_id, metric, group_kind, day, group_key, count)
           values ($1, 'meetings', $2, '2026-06-01', $3, 1)`,
          [orgId, kind, key]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    }
    const negative = await refusal(insertRollup(orgId, 'meetings', '2026-06-01', -1))
    expect(negative.code).toBe(CHECK_VIOLATION)
  })

  test('a Touch is unique per source record and credit needs a Deal', async () => {
    const { orgId } = await seed()
    const ref = newId('msg')
    const insert = (extra = '', values: unknown[] = []) =>
      run(
        orgId,
        `insert into core.touches (id, organization_id, kind, ref_id, prospect_id, occurred_at ${extra ? `, ${extra.split('|')[0]}` : ''})
         values ($1, $2, 'message', $3, $4, now() ${extra ? `, ${extra.split('|')[1]}` : ''})`,
        [newId('tch'), orgId, ref, newId('prs'), ...values]
      )
    await insert()
    expect((await refusal(insert())).code).toBe(UNIQUE_VIOLATION)
    const credit = await refusal(
      run(
        orgId,
        `insert into core.touches (id, organization_id, kind, ref_id, prospect_id, occurred_at, first_touch)
         values ($1, $2, 'message', $3, $4, now(), true)`,
        [newId('tch'), orgId, newId('msg'), newId('prs')]
      )
    )
    expect(credit.code).toBe(CHECK_VIOLATION)
    const kind = await refusal(
      run(
        orgId,
        `insert into core.touches (id, organization_id, kind, ref_id, prospect_id, occurred_at)
         values ($1, $2, 'call', $3, $4, now())`,
        [newId('tch'), orgId, newId('msg'), newId('prs')]
      )
    )
    expect(kind.code).toBe(CHECK_VIOLATION)
  })

  test('an Assessment is unique per Draft version and per Call turn', async () => {
    const { orgId } = await seed()
    const draftId = newId('drf')
    await insertAssessment(orgId, newId('asm'), { draftId, version: 1 })
    expect(
      (await refusal(insertAssessment(orgId, newId('asm'), { draftId, version: 1 }))).code
    ).toBe(UNIQUE_VIOLATION)
    await insertAssessment(orgId, newId('asm'), { draftId, version: 2 })
    const callId = newId('call')
    await insertAssessment(orgId, newId('asm'), { callId, turn: 0 })
    expect((await refusal(insertAssessment(orgId, newId('asm'), { callId, turn: 0 }))).code).toBe(
      UNIQUE_VIOLATION
    )
  })

  test('an Assessment cannot omit its subject key (a NULL must not pass the check)', async () => {
    const { orgId } = await seed()
    const cases: [string, string, unknown[]][] = [
      ['draft_id, draft_version', "'draft', null, 1", []],
      ['draft_id, draft_version', "'draft', $3, null", [newId('drf')]],
      ['call_id, turn_index', "'call_turn', null, 0", []],
      ['call_id, turn_index', "'call_turn', $3, null", [newId('call')]],
    ]
    for (const [columns, values, extra] of cases) {
      const error = await refusal(
        run(
          orgId,
          `insert into core.assessments (id, organization_id, subject_kind, ${columns}, agent_kind, verdict)
           values ($1, $2, ${values}, 'inbound', 'pass')`,
          [newId('asm'), orgId, ...extra]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    }
  })

  test('a failed Assessment needs a severity and a passed one has none', async () => {
    const { orgId } = await seed()
    const failNoRank = await refusal(
      insertAssessment(orgId, newId('asm'), { draftId: newId('drf'), version: 1 }, 'fail')
    )
    expect(failNoRank.code).toBe(CHECK_VIOLATION)
    const passRank = await refusal(
      run(
        orgId,
        `insert into core.assessments (id, organization_id, subject_kind, draft_id, draft_version, agent_kind, verdict, worst_severity_rank)
         values ($1, $2, 'draft', $3, 1, 'outbound', 'pass', 1)`,
        [newId('asm'), orgId, newId('drf')]
      )
    )
    expect(passRank.code).toBe(CHECK_VIOLATION)
  })

  test('a finding stores a span and a category and no text of the message', async () => {
    const { orgId, assessmentId } = await seed()
    const row = await run(
      orgId,
      'select * from core.assessment_findings where assessment_id = $1',
      [assessmentId]
    )
    const found = row.rows[0]
    expect(found.category).toBe('unsupported_claim')
    expect(found.span_start).toBe(10)
    expect(found.span_end).toBe(42)
    expect(Object.keys(found)).not.toContain('body')
    expect(Object.keys(found)).not.toContain('text')
    const backwards = await refusal(
      run(
        orgId,
        `insert into core.assessment_findings (id, organization_id, assessment_id, category, severity, span_start, span_end, explanation)
         values ($1, $2, $3, 'tone', 'low', 20, 20, 'x')`,
        [newId('fnd'), orgId, assessmentId]
      )
    )
    expect(backwards.code).toBe(CHECK_VIOLATION)
    const orphan = await refusal(
      run(
        orgId,
        `insert into core.assessment_findings (id, organization_id, assessment_id, category, severity, span_start, span_end, explanation)
         values ($1, $2, $3, 'tone', 'low', 0, 5, 'x')`,
        [newId('fnd'), orgId, newId('asm')]
      )
    )
    expect(orphan.code).toBe(FOREIGN_KEY_VIOLATION)
  })

  test('feedback on a finding names who gave it and when, or is absent', async () => {
    const { orgId, assessmentId } = await seed()
    const error = await refusal(
      run(
        orgId,
        `update core.assessment_findings set feedback = 'correct' where assessment_id = $1`,
        [assessmentId]
      )
    )
    expect(error.code).toBe(CHECK_VIOLATION)
    await run(
      orgId,
      `update core.assessment_findings set feedback = 'false_alarm', feedback_by_membership_id = $2, feedback_at = now()
       where assessment_id = $1`,
      [assessmentId, newId('mem')]
    )
  })

  test('deleting an Organization removes its findings with its Assessments', async () => {
    const { orgId } = await seed()
    await owner.query('delete from core.organizations where organization_id = $1', [orgId])
    for (const table of TABLES) {
      const left = await owner.query(
        `select count(*) as n from core.${table} where organization_id = $1`,
        [orgId]
      )
      expect(Number(left.rows[0].n)).toBe(0)
    }
  })

  test('a Conversation summary is one row per Conversation, with a bounded length', async () => {
    const { orgId } = await seed()
    const id = newId('cnv')
    const insert = (summary: string) =>
      run(
        orgId,
        `insert into core.conversation_summaries (organization_id, conversation_id, summary, outcome_label)
         values ($1, $2, $3, 'won')`,
        [orgId, id, summary]
      )
    await insert('Signed.')
    expect((await refusal(insert('Again.'))).code).toBe(UNIQUE_VIOLATION)
    expect(
      (
        await refusal(
          run(
            orgId,
            `insert into core.conversation_summaries (organization_id, conversation_id, summary, outcome_label) values ($1, $2, $3, 'won')`,
            [orgId, newId('cnv'), 'x'.repeat(501)]
          )
        )
      ).code
    ).toBe(CHECK_VIOLATION)
  })
})
