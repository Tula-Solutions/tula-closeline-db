import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { coreSchema } from './core'
import { organizations } from './core-tables'

/*
 * Milestone 15 (`docs/specs/m15-analytics-assessments-learning.md` in the hub): the analytics read
 * model, Attribution, Assessments and Conversation summaries. The values below mirror the contract
 * at its `develop` (`tula-closeline-contract`, `src/analytics`, `src/assessment`); this library does
 * not depend on the contract, so each carries the name of the constant it copies and
 * `core-analytics.test.ts` pins every value.
 */

/** The counts a dashboard shows, per day. Mirrors the contract's `ANALYTICS_METRICS`. */
export const ROLLUP_METRICS = [
  'sends',
  'replies',
  'positive_replies',
  'meetings',
  'outcomes_won',
  'outcomes_lost',
] as const
/** What a rollup row is split by; `total` has the empty key. The rest mirror `ANALYTICS_GROUP_BYS`. */
export const ROLLUP_GROUP_KINDS = ['total', 'channel', 'agent_kind', 'campaign', 'rep'] as const
/** The longest group key. Mirrors the contract's `analyticsGroupKeySchema` (an id is shorter). */
export const MAX_ROLLUP_GROUP_KEY_LENGTH = 64
/** The largest count a rollup row holds: the table's bound, far above any real day. */
export const MAX_ROLLUP_COUNT = 1_000_000_000_000
/** What a touch was. Mirrors the contract's `TOUCH_KINDS`. */
export const TOUCH_KINDS = ['message', 'call'] as const
/** The channels a touch happened on: the inbox channels and the phone. */
export const TOUCH_CHANNELS = ['email', 'linkedin', 'chat', 'phone'] as const
/** The Agent kinds a touch can be credited to. Mirrors the contract's `AGENT_KINDS`. */
export const TOUCH_AGENT_KINDS = ['inbound', 'outbound'] as const
/** The most Playbook sources one touch cites. Mirrors the contract's `MAX_TOUCH_SOURCES`. */
export const MAX_TOUCH_SOURCES = 20
/** What a source of performance is: a Moment or a Document passage. */
export const SOURCE_KINDS = ['moment', 'document'] as const
/** The longest source key: a Call id and a Moment number, or a document id and a page. */
export const MAX_SOURCE_KEY_LENGTH = 120
/** The flag a source can carry. Mirrors the contract's `SOURCE_FLAGS`. */
export const SOURCE_PERFORMANCE_FLAGS = ['cited_often_lost'] as const
/** The largest Deal count a source holds: the table's bound. */
export const MAX_SOURCE_DEALS = 1_000_000_000
/** What an Assessment judged. Mirrors the contract's `ASSESSMENT_SUBJECT_KINDS`. */
export const ASSESSMENT_SUBJECT_KINDS = ['draft', 'call_turn'] as const
/** What an Assessment decided. Mirrors the contract's `ASSESSMENT_VERDICTS`. */
export const ASSESSMENT_VERDICTS = ['pass', 'warn', 'fail'] as const
/** Who judged. Mirrors the contract's `assessmentJudgeSourceSchema`. */
export const ASSESSMENT_JUDGE_SOURCES = ['model', 'rules'] as const
/** What a finding is about. Mirrors the contract's `FINDING_CATEGORIES`. */
export const FINDING_CATEGORIES = [
  'unsupported_claim',
  'policy_deviation',
  'missing_disclosure',
  'tone',
] as const
/** How serious a finding is, worst last. Mirrors the contract's `FINDING_SEVERITIES`. */
export const FINDING_SEVERITIES = ['low', 'medium', 'high'] as const
/** What an Admin says about a finding. Mirrors the contract's `FINDING_FEEDBACKS`. */
export const FINDING_FEEDBACKS = ['correct', 'false_alarm'] as const
/** The largest offset a finding's span may reach. Mirrors the contract's `MAX_FINDING_SPAN_OFFSET`. */
export const MAX_FINDING_SPAN_OFFSET = 20_000
/** The longest explanation of a finding. Mirrors the contract's `MAX_FINDING_EXPLANATION_LENGTH`. */
export const MAX_FINDING_EXPLANATION_LENGTH = 500
/** The largest Draft version number and Call turn number the table holds. */
export const MAX_ASSESSED_NUMBER = 100_000
/** The Outcome label of a Conversation. Mirrors the contract's `CONVERSATION_OUTCOME_LABELS`. */
export const CONVERSATION_OUTCOME_LABELS = [
  'won',
  'lost',
  'open',
  'no_response',
  'meeting_booked',
] as const
/** The longest Conversation summary. Mirrors the contract's `MAX_SUMMARY_LENGTH`. */
export const MAX_SUMMARY_LENGTH = 500

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })
const num = (n: number) => sql.raw(String(n))
const orgRef = () =>
  text('organization_id')
    .notNull()
    .references(() => organizations.organizationId, { onDelete: 'cascade' })

/**
 * One day's count of one metric for one group of an Organization: the read model every dashboard
 * series is served from, so a request never scans history. The row is unique per Organization,
 * metric, group and UTC day (`rollup_daily_pkey`), so a consumer upserts the count it computed and
 * replaying an event stream can only write the same number again; a late event is added to its
 * original `day`. `group_kind = 'total'` has the empty `group_key`; any other kind names a
 * channel, an Agent kind, a Campaign id or a Membership id in `group_key`.
 *
 * Lists served: a metric's series over a date range, one group kind, by day then group key, on the
 * primary key (`organization_id, metric, group_kind, day, group_key`).
 */
export const rollupDaily = coreSchema.table(
  'rollup_daily',
  {
    organizationId: orgRef(),
    metric: text('metric', { enum: ROLLUP_METRICS }).notNull(),
    groupKind: text('group_kind', { enum: ROLLUP_GROUP_KINDS }).notNull(),
    day: date('day', { mode: 'string' }).notNull(),
    groupKey: text('group_key').notNull().default(''),
    count: bigint('count', { mode: 'number' }).notNull().default(0),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'rollup_daily_pkey',
      columns: [t.organizationId, t.metric, t.groupKind, t.day, t.groupKey],
    }),
    check('rollup_daily_organization_id_shape', orgShape),
    check('rollup_daily_organization_not_global', notGlobal),
    check('rollup_daily_metric_known', sql`${t.metric} in (${list(ROLLUP_METRICS)})`),
    check('rollup_daily_group_kind_known', sql`${t.groupKind} in (${list(ROLLUP_GROUP_KINDS)})`),
    check(
      'rollup_daily_group_key_shape',
      sql`(${t.groupKind} = 'total' and ${t.groupKey} = '')
        or (${t.groupKind} <> 'total' and char_length(${t.groupKey}) between 1 and ${num(MAX_ROLLUP_GROUP_KEY_LENGTH)})`
    ),
    check('rollup_daily_count_bounds', sql`${t.count} between 0 and ${num(MAX_ROLLUP_COUNT)}`),
  ]
)

/**
 * One Message or Call that Attribution links to a Prospect, kept so a Deal's Outcome can be traced
 * to what touched the Prospect. **References only**: the Message or Call is named by `ref_id`
 * and holds no text. One row per Message or Call (`touches_ref_key`), so a replayed event is the
 * same row. `deal_record_id`, `first_touch` and `last_touch` are set when an Outcome is
 * attributed: a touch has credit only with a Deal. `cited_sources` is the Playbook sources
 * (Moments and Documents) the touch cited, as the contract's Citation references, at most 20.
 *
 * Lists served (keyset `occurred_at < $cursor`, newest first): a Prospect's touches
 * (`touches_prospect_idx`) and a Deal's touches (`touches_deal_idx`).
 */
export const touches = coreSchema.table(
  'touches',
  {
    id: text('id').notNull(),
    organizationId: orgRef(),
    kind: text('kind', { enum: TOUCH_KINDS }).notNull(),
    refId: text('ref_id').notNull(),
    prospectId: text('prospect_id').notNull(),
    channel: text('channel', { enum: TOUCH_CHANNELS }),
    agentKind: text('agent_kind', { enum: TOUCH_AGENT_KINDS }),
    repMembershipId: text('rep_membership_id'),
    campaignId: text('campaign_id'),
    occurredAt: ts('occurred_at').notNull(),
    dealRecordId: text('deal_record_id'),
    firstTouch: boolean('first_touch').notNull().default(false),
    lastTouch: boolean('last_touch').notNull().default(false),
    citedSources: jsonb('cited_sources').notNull().default(sql`'[]'::jsonb`),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'touches_pkey', columns: [t.organizationId, t.id] }),
    check('touches_id_shape', idShape('id', 'tch')),
    check('touches_organization_id_shape', orgShape),
    check('touches_organization_not_global', notGlobal),
    check('touches_kind_known', sql`${t.kind} in (${list(TOUCH_KINDS)})`),
    check(
      'touches_ref_id_shape',
      sql`(${t.kind} = 'message' and ${t.refId} ~ '^msg_[0-9a-f]{32}$')
        or (${t.kind} = 'call' and ${t.refId} ~ '^call_[0-9a-f]{32}$')`
    ),
    check('touches_prospect_id_shape', idShape('prospect_id', 'prs')),
    check('touches_channel_known', sql`${t.channel} in (${list(TOUCH_CHANNELS)})`),
    check('touches_agent_kind_known', sql`${t.agentKind} in (${list(TOUCH_AGENT_KINDS)})`),
    check(
      'touches_rep_membership_id_shape',
      sql`${t.repMembershipId} is null or ${t.repMembershipId} ~ '^mem_[0-9a-f]{32}$'`
    ),
    check(
      'touches_campaign_id_shape',
      sql`${t.campaignId} is null or ${t.campaignId} ~ '^cpg_[0-9a-f]{32}$'`
    ),
    check(
      'touches_deal_record_id_shape',
      sql`${t.dealRecordId} is null or ${t.dealRecordId} ~ '^deal_[0-9a-f]{32}$'`
    ),
    check(
      'touches_credit_needs_deal',
      sql`${t.dealRecordId} is not null or (not ${t.firstTouch} and not ${t.lastTouch})`
    ),
    check(
      'touches_cited_sources_shape',
      sql`jsonb_typeof(${t.citedSources}) = 'array' and jsonb_array_length(${t.citedSources}) <= ${num(MAX_TOUCH_SOURCES)}`
    ),
    uniqueIndex('touches_ref_key').on(t.organizationId, t.kind, t.refId),
    index('touches_prospect_idx').on(
      t.organizationId,
      t.prospectId,
      t.occurredAt.desc(),
      t.id.desc()
    ),
    index('touches_deal_idx')
      .on(t.organizationId, t.dealRecordId, t.occurredAt.desc(), t.id.desc())
      .where(sql`${t.dealRecordId} is not null`),
  ]
)

/**
 * How the Deals a Playbook source touched ended: one row per Moment or Document passage of an
 * Organization (`source_key` is the Call id and Moment number, or the document id and page).
 * `deals_touched` and `deals_won` are counts; the win rate is computed by the reader, and only
 * from the minimum sample. `flag` marks a source cited often but correlated with lost Deals.
 *
 * Lists served (keyset `(deals_touched, source_key)`, most touched first): all sources
 * (`source_performance_list_idx`) and flagged ones (`source_performance_flag_idx`).
 */
export const sourcePerformance = coreSchema.table(
  'source_performance',
  {
    organizationId: orgRef(),
    sourceKind: text('source_kind', { enum: SOURCE_KINDS }).notNull(),
    sourceKey: text('source_key').notNull(),
    dealsTouched: integer('deals_touched').notNull().default(0),
    dealsWon: integer('deals_won').notNull().default(0),
    flag: text('flag', { enum: SOURCE_PERFORMANCE_FLAGS }),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'source_performance_pkey',
      columns: [t.organizationId, t.sourceKind, t.sourceKey],
    }),
    check('source_performance_organization_id_shape', orgShape),
    check('source_performance_organization_not_global', notGlobal),
    check('source_performance_kind_known', sql`${t.sourceKind} in (${list(SOURCE_KINDS)})`),
    check(
      'source_performance_key_length',
      sql`char_length(${t.sourceKey}) between 1 and ${num(MAX_SOURCE_KEY_LENGTH)}`
    ),
    check(
      'source_performance_counts',
      sql`${t.dealsTouched} between 0 and ${num(MAX_SOURCE_DEALS)} and ${t.dealsWon} between 0 and ${t.dealsTouched}`
    ),
    check('source_performance_flag_known', sql`${t.flag} in (${list(SOURCE_PERFORMANCE_FLAGS)})`),
    index('source_performance_list_idx').on(
      t.organizationId,
      t.dealsTouched.desc(),
      t.sourceKind.desc(),
      t.sourceKey.desc()
    ),
    index('source_performance_flag_idx')
      .on(t.organizationId, t.sourceKind, t.sourceKey)
      .where(sql`${t.flag} is not null`),
  ]
)

/**
 * The automatic check of one Agent turn: a Draft version before release or a Call turn after it.
 * Unique per subject (`assessments_draft_key`, `assessments_call_turn_key`), so a retried check
 * is the same row. `worst_severity_rank` is the worst finding (1 low, 2 medium, 3 high, null for
 * none) so a review list can sort by severity on an index. **No text of the turn is stored**: the
 * findings hold spans, and the offending sentence is read from the Draft or Call.
 *
 * Lists served (keyset, newest first): all (`assessments_list_idx`), one verdict
 * (`assessments_verdict_idx`), flagged turns by severity (`assessments_review_idx`), and the
 * weekly failed rate by Agent kind and instruction version (`assessments_rate_idx`).
 */
export const assessments = coreSchema.table(
  'assessments',
  {
    id: text('id').notNull(),
    organizationId: orgRef(),
    subjectKind: text('subject_kind', { enum: ASSESSMENT_SUBJECT_KINDS }).notNull(),
    draftId: text('draft_id'),
    draftVersion: integer('draft_version'),
    callId: text('call_id'),
    turnIndex: integer('turn_index'),
    prospectId: text('prospect_id'),
    agentKind: text('agent_kind', { enum: TOUCH_AGENT_KINDS }).notNull(),
    instructionVersion: integer('instruction_version'),
    verdict: text('verdict', { enum: ASSESSMENT_VERDICTS }).notNull(),
    judgeSource: text('judge_source', { enum: ASSESSMENT_JUDGE_SOURCES })
      .notNull()
      .default('model'),
    worstSeverityRank: smallint('worst_severity_rank'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'assessments_pkey', columns: [t.organizationId, t.id] }),
    check('assessments_id_shape', idShape('id', 'asm')),
    check('assessments_organization_id_shape', orgShape),
    check('assessments_organization_not_global', notGlobal),
    check(
      'assessments_subject_kind_known',
      sql`${t.subjectKind} in (${list(ASSESSMENT_SUBJECT_KINDS)})`
    ),
    check(
      'assessments_subject_columns',
      sql`(${t.subjectKind} = 'draft' and ${t.draftId} ~ '^drf_[0-9a-f]{32}$'
          and ${t.draftVersion} between 1 and ${num(MAX_ASSESSED_NUMBER)}
          and ${t.callId} is null and ${t.turnIndex} is null)
        or (${t.subjectKind} = 'call_turn' and ${t.callId} ~ '^call_[0-9a-f]{32}$'
          and ${t.turnIndex} between 0 and ${num(MAX_ASSESSED_NUMBER)}
          and ${t.draftId} is null and ${t.draftVersion} is null)`
    ),
    check(
      'assessments_prospect_id_shape',
      sql`${t.prospectId} is null or ${t.prospectId} ~ '^prs_[0-9a-f]{32}$'`
    ),
    check('assessments_agent_kind_known', sql`${t.agentKind} in (${list(TOUCH_AGENT_KINDS)})`),
    check(
      'assessments_instruction_version_positive',
      sql`${t.instructionVersion} is null or ${t.instructionVersion} >= 1`
    ),
    check('assessments_verdict_known', sql`${t.verdict} in (${list(ASSESSMENT_VERDICTS)})`),
    check(
      'assessments_judge_source_known',
      sql`${t.judgeSource} in (${list(ASSESSMENT_JUDGE_SOURCES)})`
    ),
    check(
      'assessments_severity_rank',
      sql`(${t.worstSeverityRank} is null or ${t.worstSeverityRank} between 1 and ${num(FINDING_SEVERITIES.length)})
        and (${t.verdict} <> 'pass' or ${t.worstSeverityRank} is null)
        and (${t.verdict} <> 'fail' or ${t.worstSeverityRank} is not null)`
    ),
    uniqueIndex('assessments_draft_key')
      .on(t.organizationId, t.draftId, t.draftVersion)
      .where(sql`${t.subjectKind} = 'draft'`),
    uniqueIndex('assessments_call_turn_key')
      .on(t.organizationId, t.callId, t.turnIndex)
      .where(sql`${t.subjectKind} = 'call_turn'`),
    index('assessments_list_idx').on(t.organizationId, t.createdAt.desc(), t.id.desc()),
    index('assessments_verdict_idx').on(
      t.organizationId,
      t.verdict,
      t.createdAt.desc(),
      t.id.desc()
    ),
    index('assessments_review_idx')
      .on(t.organizationId, t.worstSeverityRank.desc(), t.createdAt.desc(), t.id.desc())
      .where(sql`${t.verdict} <> 'pass'`),
    index('assessments_rate_idx').on(
      t.organizationId,
      t.agentKind,
      t.instructionVersion,
      t.createdAt
    ),
  ]
)

/**
 * One problem an Assessment found: a category, a severity and the **sentence span** (character
 * offsets, start included, end excluded) with a short explanation. There is no body or text
 * column, so the table cannot hold the turn: the offending sentence is read from the Draft or
 * Call by the span. An Admin's feedback (`correct` or `false_alarm`) is stored with who and when,
 * all three or none.
 *
 * Lists served: an Assessment's findings by id (`assessment_findings_assessment_idx`).
 */
export const assessmentFindings = coreSchema.table(
  'assessment_findings',
  {
    id: text('id').notNull(),
    organizationId: orgRef(),
    assessmentId: text('assessment_id').notNull(),
    category: text('category', { enum: FINDING_CATEGORIES }).notNull(),
    severity: text('severity', { enum: FINDING_SEVERITIES }).notNull(),
    spanStart: integer('span_start').notNull(),
    spanEnd: integer('span_end').notNull(),
    explanation: text('explanation').notNull(),
    feedback: text('feedback', { enum: FINDING_FEEDBACKS }),
    feedbackByMembershipId: text('feedback_by_membership_id'),
    feedbackAt: ts('feedback_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'assessment_findings_pkey', columns: [t.organizationId, t.id] }),
    foreignKey({
      name: 'assessment_findings_assessment_fk',
      columns: [t.organizationId, t.assessmentId],
      foreignColumns: [assessments.organizationId, assessments.id],
    }).onDelete('cascade'),
    check('assessment_findings_id_shape', idShape('id', 'fnd')),
    check('assessment_findings_organization_id_shape', orgShape),
    check('assessment_findings_organization_not_global', notGlobal),
    check('assessment_findings_assessment_id_shape', idShape('assessment_id', 'asm')),
    check(
      'assessment_findings_category_known',
      sql`${t.category} in (${list(FINDING_CATEGORIES)})`
    ),
    check(
      'assessment_findings_severity_known',
      sql`${t.severity} in (${list(FINDING_SEVERITIES)})`
    ),
    check(
      'assessment_findings_span_bounds',
      sql`${t.spanStart} between 0 and ${num(MAX_FINDING_SPAN_OFFSET)}
        and ${t.spanEnd} between 1 and ${num(MAX_FINDING_SPAN_OFFSET)}
        and ${t.spanEnd} > ${t.spanStart}`
    ),
    check(
      'assessment_findings_explanation_length',
      sql`char_length(${t.explanation}) between 1 and ${num(MAX_FINDING_EXPLANATION_LENGTH)}`
    ),
    check('assessment_findings_feedback_known', sql`${t.feedback} in (${list(FINDING_FEEDBACKS)})`),
    check(
      'assessment_findings_feedback_by_shape',
      sql`${t.feedbackByMembershipId} is null or ${t.feedbackByMembershipId} ~ '^mem_[0-9a-f]{32}$'`
    ),
    check(
      'assessment_findings_feedback_complete',
      sql`(${t.feedback} is null) = (${t.feedbackByMembershipId} is null)
        and (${t.feedback} is null) = (${t.feedbackAt} is null)`
    ),
    index('assessment_findings_assessment_idx').on(t.organizationId, t.assessmentId, t.id),
  ]
)

/**
 * A Conversation's short summary and Outcome label, written by a model from the Conversation: the
 * summary is untrusted model output, shown as text and never run, and is stored apart from Message
 * bodies. One row per Conversation; regenerating replaces it.
 *
 * Lists served: none; the primary key is the lookup.
 */
export const conversationSummaries = coreSchema.table(
  'conversation_summaries',
  {
    organizationId: orgRef(),
    conversationId: text('conversation_id').notNull(),
    summary: text('summary').notNull(),
    outcomeLabel: text('outcome_label', { enum: CONVERSATION_OUTCOME_LABELS }).notNull(),
    generatedAt: ts('generated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'conversation_summaries_pkey',
      columns: [t.organizationId, t.conversationId],
    }),
    check('conversation_summaries_organization_id_shape', orgShape),
    check('conversation_summaries_organization_not_global', notGlobal),
    check('conversation_summaries_conversation_id_shape', idShape('conversation_id', 'cnv')),
    check(
      'conversation_summaries_summary_length',
      sql`char_length(${t.summary}) between 1 and ${num(MAX_SUMMARY_LENGTH)}`
    ),
    check(
      'conversation_summaries_outcome_label_known',
      sql`${t.outcomeLabel} in (${list(CONVERSATION_OUTCOME_LABELS)})`
    ),
  ]
)
