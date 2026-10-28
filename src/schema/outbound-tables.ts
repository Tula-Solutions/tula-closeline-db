import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  date,
  doublePrecision,
  foreignKey,
  index,
  integer,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { outboundSchema } from './outbound'

/*
 * The values below mirror the contract (`tula-closeline-contract`, `src/messaging`); this library
 * does not depend on the contract, so each carries the name of the constant it copies.
 * `outbound-tables.test.ts` pins every value to the list or number written there.
 */

/** The channels a Draft is written for. Mirrors the contract's `DRAFT_CHANNELS`. */
export const DRAFT_CHANNELS = ['email'] as const
/** The languages a Draft or Research Brief is written in. Mirrors the contract's `CAMPAIGN_LANGUAGES`. */
export const OUTBOUND_LANGUAGES = ['en'] as const
/** The checks run on every Draft. Mirrors the contract's `DRAFT_CHECKS`. */
export const DRAFT_CHECKS = [
  'citations_resolve',
  'claims_supported',
  'banned_phrase',
  'length',
  'name_match',
] as const
/** The results of a check. Mirrors the `result` of the contract's `outreachDraftCheckSchema`. */
export const DRAFT_CHECK_RESULTS = ['pass', 'fail'] as const
/** Where the current text of a Draft came from. Mirrors the contract's `draftSourceSchema`. */
export const DRAFT_TEXT_SOURCES = ['generated', 'edited'] as const
/** Where the suggested angle of a Research Brief came from. Mirrors the contract's `ANGLE_ORIGINS`. */
export const ANGLE_ORIGINS = ['won_deals', 'model_default'] as const
/** The kinds of source a statement or Citation rests on. Mirrors the `kind` of the contract's `citationSourceSchema`. */
export const CITATION_KINDS = [
  'prospect_field',
  'signal',
  'web_page',
  'moment',
  'document',
] as const
/** The Prospect fields a Citation can name. Mirrors the contract's `PROSPECT_FIELD_NAMES`. */
export const CITATION_PROSPECT_FIELDS = [
  'firstName',
  'lastName',
  'jobTitle',
  'email',
  'phone',
  'linkedinUrl',
] as const
/** The roles a row of a Research Brief plays: one of its statements, or one source of its angle. */
export const BRIEF_ENTRY_ROLES = ['statement', 'angle_source'] as const

/** The most statements one Research Brief holds. Mirrors the contract's `MAX_BRIEF_STATEMENTS`. */
export const MAX_BRIEF_STATEMENTS = 20
/** The longest statement of a Research Brief, in characters. Mirrors `MAX_BRIEF_STATEMENT_LENGTH`. */
export const MAX_BRIEF_STATEMENT_LENGTH = 500
/** The longest angle of a Research Brief, in characters. Mirrors the contract's `MAX_ANGLE_LENGTH`. */
export const MAX_ANGLE_LENGTH = 500
/** The most Citations one Draft carries. Mirrors the contract's `MAX_DRAFT_CITATIONS`. */
export const MAX_DRAFT_CITATIONS = 20
/** The longest subject of a Draft, in characters. Mirrors the contract's `MAX_DRAFT_SUBJECT_LENGTH`. */
export const MAX_DRAFT_SUBJECT_LENGTH = 200
/** The longest body of a Draft, in characters. Mirrors the contract's `MAX_DRAFT_BODY_LENGTH`. */
export const MAX_DRAFT_BODY_LENGTH = 5000
/** The longest goal of a Draft, in characters. Mirrors the contract's `MAX_GOAL_LENGTH`. */
export const MAX_DRAFT_GOAL_LENGTH = 500
/** The longest Step key, in characters. Mirrors the contract's `stepKeySchema`. */
export const MAX_STEP_KEY_LENGTH = 40
/** The longest model name, in characters. Mirrors the `model` of the contract's `outreachDraftSchema`. */
export const MAX_MODEL_NAME_LENGTH = 100
/** The longest tone description of a Brand Voice, in characters. Mirrors `MAX_TONE_LENGTH`. */
export const MAX_TONE_LENGTH = 500
/** The most preferred words a Brand Voice lists. Mirrors the contract's `MAX_PREFERRED_WORDS`. */
export const MAX_PREFERRED_WORDS = 50
/** The most banned phrases a Brand Voice lists. Mirrors the contract's `MAX_BANNED_PHRASES`. */
export const MAX_BANNED_PHRASES = 100
/** The longest preferred word or banned phrase, in characters. Mirrors `MAX_VOICE_TERM_LENGTH`. */
export const MAX_VOICE_TERM_LENGTH = 100
/** The longest sign-off of a Brand Voice, in characters. Mirrors the contract's `MAX_SIGN_OFF_LENGTH`. */
export const MAX_SIGN_OFF_LENGTH = 200
/** The largest message length a Brand Voice may set. Mirrors `MAX_VOICE_LENGTH_CHARACTERS`. */
export const MAX_VOICE_LENGTH_CHARACTERS = 5000
/** The smallest message length a Brand Voice may set. Mirrors `maxLengthCharacters` in `brandVoiceSettingsSchema`. */
export const MIN_VOICE_LENGTH_CHARACTERS = 100
/** The largest Brand Voice version. Mirrors the `version` of the contract's `brandVoiceSchema`. */
export const MAX_VOICE_VERSION = 1_000_000
/** The longest web address a Citation holds, in characters. Mirrors `MAX_CITATION_URL_LENGTH`. */
export const MAX_CITATION_URL_LENGTH = 2048
/** The most pages a Document has. Mirrors the contract's `MAX_DOCUMENT_PAGES`. */
export const MAX_CITATION_DOCUMENT_PAGE = 300
/** The largest revision of a Draft. Mirrors the `revision` of the contract's `outreachDraftSchema`. */
export const MAX_DRAFT_REVISION = 10_000
/** The most won Deals a Draft counts. Mirrors the `wonDealCount` of the contract's `outreachDraftSchema`. */
export const MAX_WON_DEAL_COUNT = 100
/** The most findings one check counts. Mirrors the `count` of the contract's `outreachDraftCheckSchema`. */
export const MAX_CHECK_COUNT = 1000
/** The most statements dropped from a Research Brief. Mirrors the `droppedCount` of `researchBriefSchema`. */
export const MAX_DROPPED_COUNT = 1000

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const num = (value: number) => sql.raw(String(value))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })

/** The columns that say which source a statement or Citation rests on; the unused ones stay null. */
const sourceColumns = () => ({
  sourceKind: text('source_kind', { enum: CITATION_KINDS }).notNull(),
  sourceProspectId: text('source_prospect_id'),
  sourceField: text('source_field', { enum: CITATION_PROSPECT_FIELDS }),
  sourceSignalId: text('source_signal_id'),
  sourceObservedAt: ts('source_observed_at'),
  sourceUrl: text('source_url'),
  sourceRetrievedAt: ts('source_retrieved_at'),
  sourceCallId: text('source_call_id'),
  sourceDealRecordId: text('source_deal_record_id'),
  sourceDocumentId: text('source_document_id'),
  sourcePage: smallint('source_page'),
})

/** The columns each kind of source fills; `source_page` is the one optional column of a document. */
const SOURCE_REQUIRED: Record<(typeof CITATION_KINDS)[number], readonly string[]> = {
  prospect_field: ['source_prospect_id', 'source_field'],
  signal: ['source_signal_id', 'source_observed_at'],
  web_page: ['source_url', 'source_retrieved_at'],
  moment: ['source_call_id', 'source_deal_record_id'],
  document: ['source_document_id'],
}
const SOURCE_COLUMNS = [
  'source_prospect_id',
  'source_field',
  'source_signal_id',
  'source_observed_at',
  'source_url',
  'source_retrieved_at',
  'source_call_id',
  'source_deal_record_id',
  'source_document_id',
  'source_page',
] as const

/** The SQL of a check that each kind of source fills exactly its own columns and no other. */
const sourceMatchesKind = (table: string) =>
  sql.raw(
    `${CITATION_KINDS.map((kind) => {
      const required = SOURCE_REQUIRED[kind]
      const parts = SOURCE_COLUMNS.map((column) => {
        if (required.includes(column)) {
          return `"${table}"."${column}" is not null`
        }
        if (kind === 'document' && column === 'source_page') {
          return undefined
        }
        return `"${table}"."${column}" is null`
      }).filter((part) => part !== undefined)
      return `("${table}"."source_kind" = '${kind}' and ${parts.join(' and ')})`
    }).join(' or ')}`
  )

/** The shape checks of the source columns of `table`, named `<table>_source_*`. */
const sourceChecks = (
  table: string,
  t: {
    sourceKind: AnyPgColumn
    sourceField: AnyPgColumn
    sourceUrl: AnyPgColumn
    sourcePage: AnyPgColumn
  }
) => [
  check(`${table}_source_kind_known`, sql`${t.sourceKind} in (${list(CITATION_KINDS)})`),
  check(`${table}_source_matches_kind`, sourceMatchesKind(table)),
  check(`${table}_source_prospect_id_shape`, idShape('source_prospect_id', 'prs')),
  check(`${table}_source_signal_id_shape`, idShape('source_signal_id', 'sig')),
  check(`${table}_source_call_id_shape`, idShape('source_call_id', 'call')),
  check(`${table}_source_deal_record_id_shape`, idShape('source_deal_record_id', 'deal')),
  check(`${table}_source_document_id_shape`, idShape('source_document_id', 'doc')),
  check(
    `${table}_source_field_known`,
    sql`${t.sourceField} is null or ${t.sourceField} in (${list(CITATION_PROSPECT_FIELDS)})`
  ),
  check(
    `${table}_source_url_shape`,
    sql`${t.sourceUrl} is null or (char_length(${t.sourceUrl}) between 1 and ${num(MAX_CITATION_URL_LENGTH)}
      and ${t.sourceUrl} ~ '^https?://[^@/?#[:space:]]+([/?#][^[:space:]]*)?$')`
  ),
  check(
    `${table}_source_page_shape`,
    sql`${t.sourcePage} is null or ${t.sourcePage} between 1 and ${num(MAX_CITATION_DOCUMENT_PAGE)}`
  ),
]

/**
 * A version of an Organization's Brand Voice: how its outreach sounds. Each change inserts a new
 * row with the next `version` (unique per Organization, so two writers racing on the same
 * `expectedVersion` cannot both win) and a row never changes afterwards (the service role holds no
 * UPDATE), so a Draft names the exact version it was written with. The current version is the
 * highest. `preferred_words` and `banned_phrases` hold at most 50 and 100 terms, with no empty or
 * null term; the length of each term (100 characters) is checked by the service, and the database
 * bounds the total length of the list.
 *
 * Lookups served: the current version and the version list newest first, keyset on `version`
 * (`brand_voices_version_key`); one version by id (the primary key).
 */
export const outboundBrandVoices = outboundSchema.table(
  'brand_voices',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    version: integer('version').notNull(),
    tone: text('tone').notNull(),
    preferredWords: text('preferred_words').array().notNull().default(sql`'{}'::text[]`),
    bannedPhrases: text('banned_phrases').array().notNull().default(sql`'{}'::text[]`),
    signOff: text('sign_off'),
    maxLengthCharacters: integer('max_length_characters').notNull().default(1500),
    createdByMembershipId: text('created_by_membership_id').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'brand_voices_pkey', columns: [t.organizationId, t.id] }),
    check('brand_voices_id_shape', idShape('id', 'bvo')),
    check('brand_voices_organization_id_shape', orgShape),
    check('brand_voices_organization_not_global', notGlobal),
    check('brand_voices_version_range', sql`${t.version} between 1 and ${num(MAX_VOICE_VERSION)}`),
    check(
      'brand_voices_tone_shape',
      sql`char_length(${t.tone}) between 1 and ${num(MAX_TONE_LENGTH)}`
    ),
    check(
      'brand_voices_preferred_words_shape',
      sql`cardinality(${t.preferredWords}) <= ${num(MAX_PREFERRED_WORDS)}
        and array_position(${t.preferredWords}, '') is null
        and array_position(${t.preferredWords}, null) is null
        and char_length(array_to_string(${t.preferredWords}, '')) <= ${num(MAX_PREFERRED_WORDS * MAX_VOICE_TERM_LENGTH)}`
    ),
    check(
      'brand_voices_banned_phrases_shape',
      sql`cardinality(${t.bannedPhrases}) <= ${num(MAX_BANNED_PHRASES)}
        and array_position(${t.bannedPhrases}, '') is null
        and array_position(${t.bannedPhrases}, null) is null
        and char_length(array_to_string(${t.bannedPhrases}, '')) <= ${num(MAX_BANNED_PHRASES * MAX_VOICE_TERM_LENGTH)}`
    ),
    check(
      'brand_voices_sign_off_shape',
      sql`${t.signOff} is null or char_length(${t.signOff}) between 1 and ${num(MAX_SIGN_OFF_LENGTH)}`
    ),
    check(
      'brand_voices_max_length_range',
      sql`${t.maxLengthCharacters} between ${num(MIN_VOICE_LENGTH_CHARACTERS)} and ${num(MAX_VOICE_LENGTH_CHARACTERS)}`
    ),
    check(
      'brand_voices_created_by_membership_id_shape',
      idShape('created_by_membership_id', 'mem')
    ),
    uniqueIndex('brand_voices_version_key').on(t.organizationId, t.version),
    // The target of the Draft's foreign key, so a Draft cannot name a version its Voice lacks.
    unique('brand_voices_id_version_key').on(t.organizationId, t.id, t.version),
  ]
)

/**
 * A Research Brief: the cited facts about one Prospect that a Draft is written from, with the
 * suggested angle. The statements and the sources of the angle are the Brief's rows in
 * `brief_statements`. A Brief is cached until `expires_at` and stale once the Prospect changes
 * after `prospect_updated_at`; the row never changes after it is written (the service role holds
 * no UPDATE), so a new Brief is a new row. `dropped_count` is how many statements the model
 * proposed that had no resolvable source. The angle text is model output: tenant data, never
 * logged or put in an error report.
 *
 * `request_key` is the `Idempotency-Key` of the request that built the Brief (null when none): a retry
 * under the key finds the Brief, and two concurrent builds cannot both insert (`briefs_request_key`).
 *
 * Lookups served: the newest Brief of a Prospect, for the cache (`briefs_prospect_idx`); all
 * Briefs, keyset `(created_at, id)` newest first (`briefs_list_idx`).
 */
export const outboundBriefs = outboundSchema.table(
  'briefs',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    prospectId: text('prospect_id').notNull(),
    angleText: text('angle_text').notNull(),
    angleOrigin: text('angle_origin', { enum: ANGLE_ORIGINS }).notNull(),
    droppedCount: integer('dropped_count').notNull().default(0),
    prospectUpdatedAt: ts('prospect_updated_at').notNull(),
    language: text('language', { enum: OUTBOUND_LANGUAGES }).notNull(),
    model: text('model').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
    expiresAt: ts('expires_at').notNull(),
    requestKey: text('request_key'),
  },
  (t) => [
    primaryKey({ name: 'briefs_pkey', columns: [t.organizationId, t.id] }),
    check('briefs_id_shape', idShape('id', 'brf')),
    check('briefs_organization_id_shape', orgShape),
    check('briefs_organization_not_global', notGlobal),
    check('briefs_prospect_id_shape', idShape('prospect_id', 'prs')),
    check(
      'briefs_angle_text_shape',
      sql`char_length(${t.angleText}) between 1 and ${num(MAX_ANGLE_LENGTH)}`
    ),
    check('briefs_angle_origin_known', sql`${t.angleOrigin} in (${list(ANGLE_ORIGINS)})`),
    check(
      'briefs_dropped_count_range',
      sql`${t.droppedCount} between 0 and ${num(MAX_DROPPED_COUNT)}`
    ),
    check('briefs_language_known', sql`${t.language} in (${list(OUTBOUND_LANGUAGES)})`),
    check(
      'briefs_model_shape',
      sql`char_length(${t.model}) between 1 and ${num(MAX_MODEL_NAME_LENGTH)}`
    ),
    check('briefs_expires_after_created', sql`${t.expiresAt} > ${t.createdAt}`),
    check(
      'briefs_request_key_shape',
      sql`${t.requestKey} is null or (char_length(${t.requestKey}) between 16 and 128 and ${t.requestKey} ~ '^[A-Za-z0-9_.:-]+$')`
    ),
    uniqueIndex('briefs_request_key').on(t.organizationId, t.requestKey),
    unique('briefs_id_prospect_key').on(t.organizationId, t.id, t.prospectId),
    index('briefs_prospect_idx').on(
      t.organizationId,
      t.prospectId,
      t.createdAt.desc(),
      t.id.desc()
    ),
    index('briefs_list_idx').on(t.organizationId, t.createdAt.desc(), t.id.desc()),
    index('briefs_expires_at_idx').on(t.expiresAt),
  ]
)

/**
 * One row of a Research Brief, in order (`position`): a `statement` (its text and the one source it
 * rests on) or an `angle_source` (a source the suggested angle rests on, no text). A statement
 * always has exactly one source; the source columns hold ids, times and a web address, never the
 * text behind them. A statement or angle source never changes (the service role holds no UPDATE).
 * A Brief holds at most 20 statements and the angle at most 20 sources, so `position` runs 0 to 39
 * (the service keeps the two counts; positions are not reused across roles).
 *
 * Lookups served: one Brief's rows in order (the primary key).
 */
export const outboundBriefStatements = outboundSchema.table(
  'brief_statements',
  {
    organizationId: text('organization_id').notNull(),
    briefId: text('brief_id').notNull(),
    position: smallint('position').notNull(),
    role: text('role', { enum: BRIEF_ENTRY_ROLES }).notNull(),
    text: text('text'),
    ...sourceColumns(),
  },
  (t) => [
    primaryKey({
      name: 'brief_statements_pkey',
      columns: [t.organizationId, t.briefId, t.position],
    }),
    check('brief_statements_organization_id_shape', orgShape),
    check('brief_statements_organization_not_global', notGlobal),
    check('brief_statements_brief_id_shape', idShape('brief_id', 'brf')),
    check(
      'brief_statements_position_range',
      sql`${t.position} between 0 and ${num(MAX_BRIEF_STATEMENTS * 2 - 1)}`
    ),
    check('brief_statements_role_known', sql`${t.role} in (${list(BRIEF_ENTRY_ROLES)})`),
    check(
      'brief_statements_text_matches_role',
      sql`(${t.role} = 'statement') = (${t.text} is not null)
        and (${t.text} is null or char_length(${t.text}) between 1 and ${num(MAX_BRIEF_STATEMENT_LENGTH)})`
    ),
    ...sourceChecks('brief_statements', t),
    foreignKey({
      name: 'brief_statements_brief_fk',
      columns: [t.organizationId, t.briefId],
      foreignColumns: [outboundBriefs.organizationId, outboundBriefs.id],
    }).onDelete('cascade'),
  ]
)

/**
 * A Draft: one message written for one Prospect and one Step, with the Brand Voice version and
 * model it was written with. `subject` and `body` are model output and the Prospect's message:
 * tenant data, untrusted, never logged, put in an error report, a trace or an event. `revision`
 * starts at 1 and rises with each edit; `source` is `generated` until a person edits the text.
 * `ungrounded` is true when no Moment of a won Deal applies, and an ungrounded Draft is never
 * `auto_sendable` (a check); that every check passed is a fact about `draft_checks` rows the
 * service reads and writes together with this row. `won_deal_count` is the count of won Deals
 * behind the Draft's Moments at write time. The Brand Voice and Brief are the Organization's own
 * (composite foreign keys), and the voice version is the one of that Brand Voice row.
 *
 * Lists served (keyset `(created_at, id)` newest first, `LIMIT` a page): all Drafts
 * (`drafts_list_idx`), one Prospect (`drafts_prospect_idx`), one Campaign (`drafts_campaign_idx`),
 * ungrounded ones (`drafts_ungrounded_idx`).
 */
export const outboundDrafts = outboundSchema.table(
  'drafts',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    prospectId: text('prospect_id').notNull(),
    campaignId: text('campaign_id'),
    stepKey: text('step_key'),
    channel: text('channel', { enum: DRAFT_CHANNELS }).notNull(),
    goal: text('goal').notNull(),
    language: text('language', { enum: OUTBOUND_LANGUAGES }).notNull(),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    revision: integer('revision').notNull().default(1),
    source: text('source', { enum: DRAFT_TEXT_SOURCES }).notNull().default('generated'),
    ungrounded: boolean('ungrounded').notNull(),
    wonDealCount: integer('won_deal_count').notNull().default(0),
    autoSendable: boolean('auto_sendable').notNull().default(false),
    brandVoiceId: text('brand_voice_id').notNull(),
    voiceVersion: integer('voice_version').notNull(),
    briefId: text('brief_id'),
    model: text('model').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'drafts_pkey', columns: [t.organizationId, t.id] }),
    check('drafts_id_shape', idShape('id', 'drf')),
    check('drafts_organization_id_shape', orgShape),
    check('drafts_organization_not_global', notGlobal),
    check('drafts_prospect_id_shape', idShape('prospect_id', 'prs')),
    check('drafts_campaign_id_shape', idShape('campaign_id', 'cpg')),
    check(
      'drafts_step_key_shape',
      sql`${t.stepKey} is null or (char_length(${t.stepKey}) between 1 and ${num(MAX_STEP_KEY_LENGTH)}
        and ${t.stepKey} ~ '^[a-z][a-z0-9_-]*$')`
    ),
    check('drafts_channel_known', sql`${t.channel} in (${list(DRAFT_CHANNELS)})`),
    check(
      'drafts_goal_shape',
      sql`char_length(${t.goal}) between 1 and ${num(MAX_DRAFT_GOAL_LENGTH)}`
    ),
    check('drafts_language_known', sql`${t.language} in (${list(OUTBOUND_LANGUAGES)})`),
    check(
      'drafts_subject_shape',
      sql`char_length(${t.subject}) between 1 and ${num(MAX_DRAFT_SUBJECT_LENGTH)}`
    ),
    check(
      'drafts_body_shape',
      sql`char_length(${t.body}) between 1 and ${num(MAX_DRAFT_BODY_LENGTH)}`
    ),
    check('drafts_revision_range', sql`${t.revision} between 1 and ${num(MAX_DRAFT_REVISION)}`),
    check('drafts_source_known', sql`${t.source} in (${list(DRAFT_TEXT_SOURCES)})`),
    check('drafts_edited_after_first', sql`${t.source} = 'generated' or ${t.revision} > 1`),
    check(
      'drafts_won_deal_count_range',
      sql`${t.wonDealCount} between 0 and ${num(MAX_WON_DEAL_COUNT)}`
    ),
    check('drafts_ungrounded_has_no_deals', sql`not ${t.ungrounded} or ${t.wonDealCount} = 0`),
    check('drafts_auto_sendable_needs_grounding', sql`not (${t.autoSendable} and ${t.ungrounded})`),
    check('drafts_brand_voice_id_shape', idShape('brand_voice_id', 'bvo')),
    check(
      'drafts_voice_version_range',
      sql`${t.voiceVersion} between 1 and ${num(MAX_VOICE_VERSION)}`
    ),
    check('drafts_brief_id_shape', idShape('brief_id', 'brf')),
    check(
      'drafts_model_shape',
      sql`char_length(${t.model}) between 1 and ${num(MAX_MODEL_NAME_LENGTH)}`
    ),
    check('drafts_updated_not_before_created', sql`${t.updatedAt} >= ${t.createdAt}`),
    foreignKey({
      name: 'drafts_brand_voice_fk',
      columns: [t.organizationId, t.brandVoiceId, t.voiceVersion],
      foreignColumns: [
        outboundBrandVoices.organizationId,
        outboundBrandVoices.id,
        outboundBrandVoices.version,
      ],
    }),
    foreignKey({
      name: 'drafts_brief_fk',
      columns: [t.organizationId, t.briefId, t.prospectId],
      foreignColumns: [outboundBriefs.organizationId, outboundBriefs.id, outboundBriefs.prospectId],
    }),
    index('drafts_list_idx').on(t.organizationId, t.createdAt.desc(), t.id.desc()),
    index('drafts_brief_idx').on(t.organizationId, t.briefId),
    index('drafts_brand_voice_idx').on(t.organizationId, t.brandVoiceId, t.voiceVersion),
    index('drafts_prospect_idx').on(
      t.organizationId,
      t.prospectId,
      t.createdAt.desc(),
      t.id.desc()
    ),
    index('drafts_campaign_idx')
      .on(t.organizationId, t.campaignId, t.createdAt.desc(), t.id.desc())
      .where(sql`${t.campaignId} is not null`),
    index('drafts_ungrounded_idx')
      .on(t.organizationId, t.createdAt.desc(), t.id.desc())
      .where(sql`${t.ungrounded}`),
  ]
)

/**
 * A Citation on a Draft, in order (`position`): the source (kind and ids; see the source columns),
 * whether it still `applies` to the text as it stands, and for a Moment or Document the similarity
 * `score` the search gave it. It holds **ids and scores only**, never the text of a Moment,
 * Document passage, web page or Prospect field: that is fetched when read, so a deleted source
 * shows as removed. At most 20 per Draft (`position` 0 to 19). `applies` is the one column an
 * edit changes.
 *
 * Lookups served: one Draft's Citations in order (the primary key).
 */
export const outboundDraftCitations = outboundSchema.table(
  'draft_citations',
  {
    organizationId: text('organization_id').notNull(),
    draftId: text('draft_id').notNull(),
    position: smallint('position').notNull(),
    ...sourceColumns(),
    applies: boolean('applies').notNull().default(true),
    score: doublePrecision('score'),
  },
  (t) => [
    primaryKey({
      name: 'draft_citations_pkey',
      columns: [t.organizationId, t.draftId, t.position],
    }),
    check('draft_citations_organization_id_shape', orgShape),
    check('draft_citations_organization_not_global', notGlobal),
    check('draft_citations_draft_id_shape', idShape('draft_id', 'drf')),
    check(
      'draft_citations_position_range',
      sql`${t.position} between 0 and ${num(MAX_DRAFT_CITATIONS - 1)}`
    ),
    check(
      'draft_citations_score_shape',
      sql`${t.score} is null or (${t.sourceKind} in ('moment', 'document') and ${t.score} > -1000000 and ${t.score} < 1000000)`
    ),
    ...sourceChecks('draft_citations', t),
    foreignKey({
      name: 'draft_citations_draft_fk',
      columns: [t.organizationId, t.draftId],
      foreignColumns: [outboundDrafts.organizationId, outboundDrafts.id],
    }).onDelete('cascade'),
  ]
)

/**
 * The result of one check on a Draft: one row per check name (`citations_resolve`,
 * `claims_supported`, `banned_phrase`, `length`, `name_match`), so a re-run replaces the row.
 * `pass` exactly when nothing was found (`count` 0). Holds no text: only the name, the result and
 * how many findings.
 *
 * Lookups served: one Draft's checks (the primary key).
 */
export const outboundDraftChecks = outboundSchema.table(
  'draft_checks',
  {
    organizationId: text('organization_id').notNull(),
    draftId: text('draft_id').notNull(),
    check: text('check_name', { enum: DRAFT_CHECKS }).notNull(),
    result: text('result', { enum: DRAFT_CHECK_RESULTS }).notNull(),
    count: integer('count').notNull().default(0),
    checkedAt: ts('checked_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'draft_checks_pkey',
      columns: [t.organizationId, t.draftId, t.check],
    }),
    check('draft_checks_organization_id_shape', orgShape),
    check('draft_checks_organization_not_global', notGlobal),
    check('draft_checks_draft_id_shape', idShape('draft_id', 'drf')),
    check('draft_checks_name_known', sql`${t.check} in (${list(DRAFT_CHECKS)})`),
    check('draft_checks_result_known', sql`${t.result} in (${list(DRAFT_CHECK_RESULTS)})`),
    check('draft_checks_count_range', sql`${t.count} between 0 and ${num(MAX_CHECK_COUNT)}`),
    check('draft_checks_pass_means_none', sql`(${t.result} = 'pass') = (${t.count} = 0)`),
    foreignKey({
      name: 'draft_checks_draft_fk',
      columns: [t.organizationId, t.draftId],
      foreignColumns: [outboundDrafts.organizationId, outboundDrafts.id],
    }).onDelete('cascade'),
  ]
)

/**
 * What text generation used and cost one Organization in one calendar month (UTC), per model:
 * the input and output tokens, the number of requests and the cost in millionths of a US dollar.
 * The service adds to the row with `insert ... on conflict (organization_id, month, model) do
 * update`, which is also how a retry stays bounded: the monthly spend limit reads the sum of
 * `cost_micros` over `(organization_id, month)`. `month` is the first day of the month. Holds
 * counts only, no text.
 *
 * Lookups served: the usage of one Organization in one month, and its history newest first
 * (the primary key, `(organization_id, month, model)`).
 */
export const outboundModelUsage = outboundSchema.table(
  'model_usage',
  {
    organizationId: text('organization_id').notNull(),
    month: date('month', { mode: 'string' }).notNull(),
    model: text('model').notNull(),
    inputTokens: bigint('input_tokens', { mode: 'number' }).notNull().default(0),
    outputTokens: bigint('output_tokens', { mode: 'number' }).notNull().default(0),
    requestCount: bigint('request_count', { mode: 'number' }).notNull().default(0),
    costMicros: bigint('cost_micros', { mode: 'number' }).notNull().default(0),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'model_usage_pkey', columns: [t.organizationId, t.month, t.model] }),
    check('model_usage_organization_id_shape', orgShape),
    check('model_usage_organization_not_global', notGlobal),
    check('model_usage_month_first_day', sql`extract(day from ${t.month}) = 1`),
    check(
      'model_usage_model_shape',
      sql`char_length(${t.model}) between 1 and ${num(MAX_MODEL_NAME_LENGTH)}`
    ),
    check(
      'model_usage_counts_not_negative',
      sql`${t.inputTokens} >= 0 and ${t.outputTokens} >= 0 and ${t.requestCount} >= 0 and ${t.costMicros} >= 0`
    ),
  ]
)
