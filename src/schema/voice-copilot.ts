import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { voiceSchema } from './voice'
import { MAX_COPILOT_QUOTE_LENGTH, MAX_DOCUMENT_PAGES } from './voice-agent'
import { MAX_CALL_DURATION_SECONDS, voiceCalls } from './voice-tables'

/*
 * The values below mirror the contract (`tula-closeline-contract`, `src/copilot` and
 * `src/voice/call.ts`); this library does not depend on the contract, so each carries the name of
 * the constant it copies. `voice-copilot.test.ts` pins every value.
 */

/** The tracks a Call's audio is split into: who spoke. Mirrors the contract's `transcriptSpeakerSchema`. */
export const CALL_TURN_TRACKS = ['rep', 'prospect'] as const
/** The longest text of one turn. Mirrors the contract's `MAX_TRANSCRIPT_TURN_LENGTH`. */
export const MAX_CALL_TURN_TEXT_LENGTH = 4000
/** The kinds of Copilot Card. Mirrors the contract's `COPILOT_CARD_KINDS`. */
export const COPILOT_CARD_KINDS = ['similar_moment', 'objection', 'next_step', 'document'] as const
/** The objection taxonomy. Mirrors the contract's `COPILOT_OBJECTION_TYPES`. */
export const COPILOT_OBJECTION_TYPES = [
  'price',
  'timing',
  'competitor',
  'authority',
  'need',
  'trust',
] as const
/** How a Rep rates a card. Mirrors the contract's `COPILOT_RATINGS`. */
export const COPILOT_RATINGS = ['useful', 'not_useful'] as const
/** The most cards one Call shows. Mirrors the contract's `MAX_COPILOT_CARDS_PER_CALL`. */
export const MAX_COPILOT_CARDS_PER_CALL = 60
/** The most Moments one card cites or quotes. Mirrors the contract's `MAX_COPILOT_CITED_MOMENTS`. */
export const MAX_COPILOT_CITED_MOMENTS = 5
/** The longest model-composed text of a card. Mirrors the contract's `MAX_COPILOT_CARD_TEXT_LENGTH`. */
export const MAX_COPILOT_CARD_TEXT_LENGTH = 600
/** The most Moments or Deals the Evidence of a card counts. Mirrors the contract's `MAX_SEARCH_CANDIDATES`. */
export const MAX_COPILOT_EVIDENCE = 100
/** The lowest minimum Evidence. Mirrors the contract's `MIN_COPILOT_MIN_EVIDENCE`. */
export const MIN_COPILOT_MIN_EVIDENCE = 1
/** The highest minimum Evidence. Mirrors the contract's `MAX_COPILOT_MIN_EVIDENCE`. */
export const MAX_COPILOT_MIN_EVIDENCE = 20
/** The default minimum Moments. Mirrors the contract's `DEFAULT_COPILOT_MIN_MOMENTS`. */
export const DEFAULT_COPILOT_MIN_MOMENTS = 3
/** The default minimum distinct won Deals. Mirrors the contract's `DEFAULT_COPILOT_MIN_DEALS`. */
export const DEFAULT_COPILOT_MIN_DEALS = 2

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const num = (value: number) => sql.raw(String(value))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })
// Room for the longest quote pair of five Moments (four bytes a character) and their keys.
const MAX_QUOTES_BYTES = 24_576
const MAX_CITED_BYTES = 1024

/** One Moment a card cites, as stored: the opaque Call and Deal record it comes from. */
export interface StoredMomentRef {
  callId: string
  dealRecordId: string
}
/** One quote of a cited Moment, as stored. */
export interface StoredQuote extends StoredMomentRef {
  prospect: string
  repNext: string
}

/**
 * One final turn of a Call's live Transcript, written as it arrives so any instance can take over
 * the Call's pipeline. The key is the Organization, the Call, the track and the turn's `sequence`
 * on that track (from 1), so a retried write of the same turn changes nothing. Times are
 * milliseconds from the start of the Recording. The text is the Prospect's and the Rep's words:
 * untrusted data, never logged, and gone with the Call (the foreign key cascades). Only the
 * text, the track and the times are kept: no word timings, no confidence, no audio.
 *
 * Lists served: the turns of one Call in time order, the last few for a search window
 * (`call_turns_time_idx`); one track in order (the primary key).
 */
export const voiceCallTurns = voiceSchema.table(
  'call_turns',
  {
    organizationId: text('organization_id').notNull(),
    callId: text('call_id').notNull(),
    track: text('track', { enum: CALL_TURN_TRACKS }).notNull(),
    sequence: integer('sequence').notNull(),
    text: text('text').notNull(),
    startMs: integer('start_ms').notNull(),
    endMs: integer('end_ms').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'call_turns_pkey',
      columns: [t.organizationId, t.callId, t.track, t.sequence],
    }),
    check('call_turns_organization_id_shape', orgShape),
    check('call_turns_organization_not_global', notGlobal),
    check('call_turns_call_id_shape', idShape('call_id', 'call')),
    check('call_turns_track_known', sql`${t.track} in (${list(CALL_TURN_TRACKS)})`),
    check('call_turns_sequence_range', sql`${t.sequence} >= 1`),
    check(
      'call_turns_text_shape',
      sql`char_length(${t.text}) between 1 and ${num(MAX_CALL_TURN_TEXT_LENGTH)}`
    ),
    check(
      'call_turns_times_range',
      sql`${t.startMs} between 0 and ${num(MAX_CALL_DURATION_SECONDS * 1000)}
        and ${t.endMs} between ${t.startMs} and ${num(MAX_CALL_DURATION_SECONDS * 1000)}`
    ),
    foreignKey({
      name: 'call_turns_call_fk',
      columns: [t.organizationId, t.callId],
      foreignColumns: [voiceCalls.organizationId, voiceCalls.id],
    }).onDelete('cascade'),
    index('call_turns_time_idx').on(t.organizationId, t.callId, t.startMs, t.track, t.sequence),
  ]
)

/**
 * A Copilot Card shown to a Rep on a Call (the contract's `copilotCardSchema`). `sequence` is the
 * card's place among the Call's cards (1 to 60), unique per Call. A card is never without a
 * citation: `cited_moments` holds 1 to 5 `{callId, dealRecordId}` references (the Playbook gives a
 * Moment no id of its own), and the Evidence counts cover them (`evidence_deals` never above
 * `evidence_moments`). The columns of a kind are set exactly for that kind: `objection` has an
 * `objection_type` and a `response`, `next_step` a `next_step`, `document` a `document_id`, an
 * optional page and a `document_passage`, `similar_moment` none of these. A card is dismissed or
 * pinned, never both. `quotes` hold at most 5 quotes of cited Moments, `{callId, dealRecordId,
 * prospect, repNext}`, each text at most 512 characters (the service validates the text; the
 * database bounds the size). Quotes, passages and the composed text are tenant text or model output:
 * untrusted data, never logged, gone with the Call. `document_id` has no foreign key (the Document
 * is the Playbook's).
 *
 * Lists served: the cards of a Call oldest first, keyset by `sequence` (the unique index);
 * the cards shown in a time range for one Call (`copilot_cards_shown_idx`).
 */
export const voiceCopilotCards = voiceSchema.table(
  'copilot_cards',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    callId: text('call_id').notNull(),
    sequence: integer('sequence').notNull(),
    kind: text('kind', { enum: COPILOT_CARD_KINDS }).notNull(),
    evidenceMoments: integer('evidence_moments').notNull(),
    evidenceDeals: integer('evidence_deals').notNull(),
    citedMoments: jsonb('cited_moments').$type<StoredMomentRef[]>().notNull(),
    quotes: jsonb('quotes').$type<StoredQuote[]>().notNull().default(sql`'[]'::jsonb`),
    objectionType: text('objection_type', { enum: COPILOT_OBJECTION_TYPES }),
    response: text('response'),
    nextStep: text('next_step'),
    documentId: text('document_id'),
    documentPage: integer('document_page'),
    documentPassage: text('document_passage'),
    shownAt: ts('shown_at').notNull().defaultNow(),
    rating: text('rating', { enum: COPILOT_RATINGS }),
    dismissed: boolean('dismissed').notNull().default(false),
    pinned: boolean('pinned').notNull().default(false),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'copilot_cards_pkey', columns: [t.organizationId, t.id] }),
    check('copilot_cards_id_shape', idShape('id', 'ccard')),
    check('copilot_cards_organization_id_shape', orgShape),
    check('copilot_cards_organization_not_global', notGlobal),
    check('copilot_cards_call_id_shape', idShape('call_id', 'call')),
    check(
      'copilot_cards_sequence_range',
      sql`${t.sequence} between 1 and ${num(MAX_COPILOT_CARDS_PER_CALL)}`
    ),
    check('copilot_cards_kind_known', sql`${t.kind} in (${list(COPILOT_CARD_KINDS)})`),
    check(
      'copilot_cards_evidence_range',
      sql`${t.evidenceMoments} between 1 and ${num(MAX_COPILOT_EVIDENCE)}
        and ${t.evidenceDeals} between 1 and ${t.evidenceMoments}`
    ),
    check(
      'copilot_cards_cited_shape',
      sql`jsonb_typeof(${t.citedMoments}) = 'array'
        and jsonb_array_length(${t.citedMoments}) between 1 and ${num(MAX_COPILOT_CITED_MOMENTS)}
        and octet_length(${t.citedMoments}::text) <= ${num(MAX_CITED_BYTES)}
        and jsonb_array_length(${t.citedMoments}) <= ${t.evidenceMoments}
        and jsonb_array_length(jsonb_path_query_array(${t.citedMoments},
          '$[*] ? (@.callId like_regex "^call_[0-9a-f]{32}$" && @.dealRecordId like_regex "^deal_[0-9a-f]{32}$")'))
          = jsonb_array_length(${t.citedMoments})`
    ),
    check(
      'copilot_cards_quotes_shape',
      sql`jsonb_typeof(${t.quotes}) = 'array'
        and jsonb_array_length(${t.quotes}) <= ${num(MAX_COPILOT_CITED_MOMENTS)}
        and octet_length(${t.quotes}::text) <= ${num(MAX_QUOTES_BYTES)}`
    ),
    check(
      'copilot_cards_objection_type_known',
      sql`${t.objectionType} is null or ${t.objectionType} in (${list(COPILOT_OBJECTION_TYPES)})`
    ),
    check(
      'copilot_cards_rating_known',
      sql`${t.rating} is null or ${t.rating} in (${list(COPILOT_RATINGS)})`
    ),
    check(
      'copilot_cards_response_shape',
      sql`${t.response} is null or char_length(${t.response}) between 1 and ${num(MAX_COPILOT_CARD_TEXT_LENGTH)}`
    ),
    check(
      'copilot_cards_next_step_shape',
      sql`${t.nextStep} is null or char_length(${t.nextStep}) between 1 and ${num(MAX_COPILOT_CARD_TEXT_LENGTH)}`
    ),
    check('copilot_cards_document_id_shape', idShape('document_id', 'doc')),
    check(
      'copilot_cards_document_page_range',
      sql`${t.documentPage} is null or ${t.documentPage} between 1 and ${num(MAX_DOCUMENT_PAGES)}`
    ),
    check(
      'copilot_cards_document_passage_shape',
      sql`${t.documentPassage} is null or char_length(${t.documentPassage}) between 1 and ${num(MAX_COPILOT_QUOTE_LENGTH)}`
    ),
    check(
      'copilot_cards_kind_columns',
      sql`(${t.kind} = 'objection') = (${t.objectionType} is not null and ${t.response} is not null)
        and (${t.kind} = 'objection' or (${t.objectionType} is null and ${t.response} is null))
        and (${t.kind} = 'next_step') = (${t.nextStep} is not null)
        and (${t.kind} = 'document') = (${t.documentId} is not null and ${t.documentPassage} is not null)
        and (${t.kind} = 'document' or ${t.documentPage} is null)`
    ),
    check('copilot_cards_dismissed_or_pinned', sql`not (${t.dismissed} and ${t.pinned})`),
    foreignKey({
      name: 'copilot_cards_call_fk',
      columns: [t.organizationId, t.callId],
      foreignColumns: [voiceCalls.organizationId, voiceCalls.id],
    }).onDelete('cascade'),
    uniqueIndex('copilot_cards_call_sequence_key').on(t.organizationId, t.callId, t.sequence),
    index('copilot_cards_shown_idx').on(t.organizationId, t.callId, t.shownAt, t.id),
  ]
)

/**
 * The Copilot settings: one row per Organization (the primary key), written whole by an Admin or
 * Owner. `min_moments` and `min_deals` are the least Evidence a card needs (1 to 20, deals never
 * above moments). There is deliberately no column for the Disclosure or the Recording: they are
 * not settings (ADR 0003). A missing row means the Copilot is off with the default minimums.
 */
export const voiceCopilotSettings = voiceSchema.table(
  'copilot_settings',
  {
    organizationId: text('organization_id').notNull(),
    enabled: boolean('enabled').notNull().default(false),
    minMoments: integer('min_moments').notNull().default(DEFAULT_COPILOT_MIN_MOMENTS),
    minDeals: integer('min_deals').notNull().default(DEFAULT_COPILOT_MIN_DEALS),
    updatedAt: ts('updated_at').notNull().defaultNow(),
    updatedByMembershipId: text('updated_by_membership_id'),
  },
  (t) => [
    primaryKey({ name: 'copilot_settings_pkey', columns: [t.organizationId] }),
    check('copilot_settings_organization_id_shape', orgShape),
    check('copilot_settings_organization_not_global', notGlobal),
    check(
      'copilot_settings_min_range',
      sql`${t.minMoments} between ${num(MIN_COPILOT_MIN_EVIDENCE)} and ${num(MAX_COPILOT_MIN_EVIDENCE)}
        and ${t.minDeals} between ${num(MIN_COPILOT_MIN_EVIDENCE)} and ${t.minMoments}`
    ),
    check(
      'copilot_settings_updated_by_membership_id_shape',
      idShape('updated_by_membership_id', 'mem')
    ),
  ]
)
