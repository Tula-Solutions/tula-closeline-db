import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  customType,
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
import { voiceSchema } from './voice'
import { voiceCalls } from './voice-tables'

/*
 * The values below mirror the contract (`tula-closeline-contract`, `src/inquiry`, `src/agent` and
 * `src/chat`); this library does not depend on the contract, so each carries the name of the
 * constant it copies. `voice-agent.test.ts` pins every value to the list or number written there.
 */

/** Where an Inquiry came from. Mirrors the contract's `INQUIRY_SOURCES`. */
export const INQUIRY_SOURCES = ['form', 'chat', 'call'] as const
/** The states of an Inquiry's callback. Mirrors the contract's `INQUIRY_CALLBACK_STATES`. */
export const INQUIRY_CALLBACK_STATES = [
  'not_applicable',
  'pending',
  'dialling',
  'connected',
  'no_answer',
  'skipped',
  'failed',
] as const
/** Why a callback did not happen. Mirrors the contract's `INQUIRY_SKIP_REASONS`. */
export const INQUIRY_SKIP_REASONS = [
  'agent_paused',
  'no_consent',
  'consent_revoked',
  'suppressed',
  'outside_hours',
  'consent_check_unavailable',
  'no_phone_number',
  'concurrency_cap',
  'retries_exhausted',
] as const
/** The most callback attempts for one Inquiry. Mirrors the contract's `MAX_CALLBACK_ATTEMPTS`. */
export const MAX_CALLBACK_ATTEMPTS = 3
/** The longest page address of a form or Chat. Mirrors the contract's `MAX_SOURCE_URL_LENGTH`. */
export const MAX_SOURCE_URL_LENGTH = 2048
/** The shortest idempotency key. Mirrors the contract's `idempotencyKeySchema`. */
export const MIN_AGENT_IDEMPOTENCY_KEY_LENGTH = 16
/** The longest idempotency key. Mirrors the contract's `idempotencyKeySchema`. */
export const MAX_AGENT_IDEMPOTENCY_KEY_LENGTH = 128

/** The voice styles of the Inbound Agent. Mirrors the contract's `AGENT_VOICE_STYLES`. */
export const AGENT_VOICE_STYLES = ['warm', 'neutral', 'crisp'] as const
/** The longest Call the Agent may hold, in seconds. Mirrors the contract's `MAX_AGENT_CALL_SECONDS`. */
export const MAX_AGENT_CALL_SECONDS = 1800
/** The highest cost cap of one Call, in US cents. Mirrors the contract's `MAX_AGENT_CALL_COST_USD_CENTS`. */
export const MAX_AGENT_CALL_COST_USD_CENTS = 5000
/** The most Calls an Organization's Agent runs at once. Mirrors the contract's `MAX_AGENT_CONCURRENCY`. */
export const MAX_AGENT_CONCURRENCY = 50
/** The longest greeting. Mirrors the contract's `MAX_AGENT_GREETING_LENGTH`. */
export const MAX_AGENT_GREETING_LENGTH = 500
/** The most days in the Agent's hours. Mirrors the contract's `hoursSchema`. */
export const MAX_AGENT_HOURS_DAYS = 7

/** The kinds of Qualification question. Mirrors the contract's `QUALIFICATION_QUESTION_KINDS`. */
export const QUALIFICATION_QUESTION_KINDS = ['free_text', 'choice', 'number', 'yes_no'] as const
/** The most Qualification questions an Organization keeps. Mirrors the contract's `MAX_QUALIFICATION_QUESTIONS`. */
export const MAX_QUALIFICATION_QUESTIONS = 50
/** The longest question prompt. Mirrors the contract's `MAX_QUESTION_PROMPT_LENGTH`. */
export const MAX_QUESTION_PROMPT_LENGTH = 500
/** The longest answer or choice. Mirrors the contract's `MAX_ANSWER_LENGTH`. */
export const MAX_ANSWER_LENGTH = 500
/** The fewest choices of a `choice` question. Mirrors the contract's `MIN_QUESTION_CHOICES`. */
export const MIN_QUESTION_CHOICES = 2
/** The most choices of a `choice` question. Mirrors the contract's `MAX_QUESTION_CHOICES`. */
export const MAX_QUESTION_CHOICES = 10
/** The most skip conditions of a question. Mirrors the contract's `MAX_SKIP_CONDITIONS`. */
export const MAX_SKIP_CONDITIONS = 5
/** The longest Qualification summary. Mirrors the contract's `MAX_QUALIFICATION_SUMMARY_LENGTH`. */
export const MAX_QUALIFICATION_SUMMARY_LENGTH = 2000

/** Who spoke a turn. Mirrors the contract's `agentTurnRoleSchema`. */
export const AGENT_TURN_ROLES = ['prospect', 'agent'] as const
/** The tools the Agent may call. Mirrors the contract's `AGENT_TOOLS`. */
export const AGENT_TOOLS = [
  'record_answer',
  'find_slots',
  'book',
  'hand_off',
  'end_call',
  'revoke_consent',
] as const
/** The longest text of a turn. Mirrors the contract's `MAX_TURN_TEXT_LENGTH`. */
export const MAX_TURN_TEXT_LENGTH = 2000
/** The most passages one turn cites. Mirrors the contract's `MAX_TURN_SOURCES`. */
export const MAX_TURN_SOURCES = 10
/** The most pages of a Document. Mirrors the contract's `MAX_DOCUMENT_PAGES`. */
export const MAX_DOCUMENT_PAGES = 300
/** The longest quoted passage. Mirrors the contract's `MAX_COPILOT_QUOTE_LENGTH`. */
export const MAX_COPILOT_QUOTE_LENGTH = 512

/** Where a Handoff happens. Mirrors the contract's `HANDOFF_CHANNELS`. */
export const HANDOFF_CHANNELS = ['call', 'chat'] as const
/** The states of a Handoff. Mirrors the contract's `HANDOFF_STATES`. */
export const HANDOFF_STATES = [
  'pending',
  'accepted',
  'completed',
  'declined',
  'timed_out',
  'no_rep',
] as const
/** Why the Agent handed off. Mirrors the contract's `HANDOFF_REASONS`. */
export const HANDOFF_REASONS = [
  'asked_for_rep',
  'qualified',
  'agent_unsure',
  'prospect_frustrated',
] as const
/** How a Handoff ended. Mirrors the contract's `HANDOFF_RESULTS`. */
export const HANDOFF_RESULTS = ['bridged', 'booking_offered', 'abandoned'] as const
/** The most Reps tried for one Handoff. Mirrors the bound of the contract's `handoffSchema`. */
export const MAX_HANDOFF_ATTEMPTS = 10

/** The states of a Chat. Mirrors the contract's `CHAT_STATES`. */
export const CHAT_STATES = ['open', 'handed_off', 'closed'] as const
/** The length of a Chat session token's SHA-256 hash, in bytes. */
export const CHAT_TOKEN_HASH_BYTES = 32

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const num = (value: number) => sql.raw(String(value))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })
const SOURCE_URL = String.raw`^https?://[^\s]+$`
const IDEMPOTENCY_KEY = '^[A-Za-z0-9_.:-]+$'

// A `bytea` column read and written as bytes, whichever driver is underneath.
const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
})

/** A value a Qualification answer or a skip comparison holds: text, a number or a yes or no. */
export type QualificationJsonValue = string | number | boolean
/** One condition of a question's skip logic, as stored. */
export interface StoredSkipCondition {
  questionId: string
  operator: string
  value?: QualificationJsonValue
}
/** One day of the Agent's hours, as stored: the contract's working day. */
export interface StoredWorkingDay {
  day: string
  windows: { start: string; end: string }[]
}

/**
 * A Chat: a text conversation between a visitor and the Inbound Agent on an Organization's site.
 * `session_token_hash` is the SHA-256 of the secret session token (never the token), so a copied
 * database does not hold a usable one; it is unique within the Organization. `prospect_id` and
 * `inquiry_id` are null until the visitor gave their details or asked for a callback;
 * `inquiry_id` has no foreign key (the Inquiry's `chat_id` has it, and two foreign keys would make
 * the pair impossible to insert in either order). The messages are `agent_turns` rows with this
 * `chat_id`. `closed_at` is set exactly when the state is `closed`.
 *
 * Lists served (keyset `(started_at, id)` newest first, `LIMIT` a page): all Chats
 * (`chats_list_idx`), one state (`chats_state_list_idx`); the Chats of a Prospect
 * (`chats_prospect_idx`). Chats past their expiry that are still not closed, oldest first
 * (`chats_expiry_idx`).
 */
export const voiceChats = voiceSchema.table(
  'chats',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    state: text('state', { enum: CHAT_STATES }).notNull().default('open'),
    prospectId: text('prospect_id'),
    inquiryId: text('inquiry_id'),
    sessionTokenHash: bytes('session_token_hash').notNull(),
    sourceUrl: text('source_url').notNull(),
    startedAt: ts('started_at').notNull().defaultNow(),
    lastMessageAt: ts('last_message_at').notNull().defaultNow(),
    expiresAt: ts('expires_at').notNull(),
    closedAt: ts('closed_at'),
  },
  (t) => [
    primaryKey({ name: 'chats_pkey', columns: [t.organizationId, t.id] }),
    check('chats_id_shape', idShape('id', 'cht')),
    check('chats_organization_id_shape', orgShape),
    check('chats_organization_not_global', notGlobal),
    check('chats_state_known', sql`${t.state} in (${list(CHAT_STATES)})`),
    check('chats_prospect_id_shape', idShape('prospect_id', 'prs')),
    check('chats_inquiry_id_shape', idShape('inquiry_id', 'inq')),
    check(
      'chats_session_token_hash_length',
      sql`octet_length(${t.sessionTokenHash}) = ${num(CHAT_TOKEN_HASH_BYTES)}`
    ),
    check(
      'chats_source_url_shape',
      sql`char_length(${t.sourceUrl}) between 1 and ${num(MAX_SOURCE_URL_LENGTH)}
        and ${t.sourceUrl} ~ '${sql.raw(SOURCE_URL)}'`
    ),
    check('chats_closed', sql`(${t.state} = 'closed') = (${t.closedAt} is not null)`),
    check(
      'chats_times_in_order',
      sql`${t.lastMessageAt} >= ${t.startedAt} and ${t.expiresAt} > ${t.startedAt}
        and (${t.closedAt} is null or ${t.closedAt} >= ${t.startedAt})`
    ),
    uniqueIndex('chats_session_token_key').on(t.organizationId, t.sessionTokenHash),
    index('chats_list_idx').on(t.organizationId, t.startedAt.desc(), t.id.desc()),
    index('chats_state_list_idx').on(t.organizationId, t.state, t.startedAt.desc(), t.id.desc()),
    index('chats_prospect_idx')
      .on(t.organizationId, t.prospectId)
      .where(sql`${t.prospectId} is not null`),
    index('chats_expiry_idx').on(t.organizationId, t.expiresAt).where(sql`${t.state} <> 'closed'`),
  ]
)

/**
 * An Inquiry: a request from a Prospect through a form, a Chat or a Call to talk to the
 * Organization, and the state of the Agent's callback. One Inquiry per Organization and
 * `idempotency_key` (`inquiries_idempotency_key`), so the same submission twice is one row and one
 * callback; the service takes the key from the `Idempotency-Key` header, or derives one for a Chat
 * or Call Inquiry. The Prospect's name, number and email are on the Prospect in core, not here
 * (`prospect_id` has no foreign key across services).
 *
 * The checks are the contract's `inquirySchema`: a form carries its consent evidence; the
 * evidence (`consent_*`) is all or none; a Chat Inquiry names its Chat and no other does; a Call
 * Inquiry names its Call and is never called back; a callback is dialled only with phone consent
 * (ADR 0003, so no row can say `dialling` for a Prospect who did not tick the box); a callback that
 * did not happen says why; only a callback waiting for a retry has a next attempt.
 * `qualification_summary` is untrusted text the Agent wrote; the answers are in
 * `qualification_answers`.
 *
 * Lists served (keyset `(received_at, id)` newest first, `LIMIT` a page, always one Organization):
 * all (`inquiries_list_idx`), one source (`inquiries_source_list_idx`), one callback state
 * (`inquiries_callback_list_idx`), of one Prospect (`inquiries_prospect_idx`), assigned to a Rep
 * (`inquiries_assignee_idx`). Callbacks to dial, soonest first: those waiting for a retry
 * (`inquiries_retry_idx`) and the pending ones (`inquiries_pending_idx`).
 */
export const voiceInquiries = voiceSchema.table(
  'inquiries',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    source: text('source', { enum: INQUIRY_SOURCES }).notNull(),
    prospectId: text('prospect_id').notNull(),
    assignedToMembershipId: text('assigned_to_membership_id'),
    chatId: text('chat_id'),
    callId: text('call_id'),
    consentWordingId: text('consent_wording_id'),
    consentWordingVersion: integer('consent_wording_version'),
    consentSourceUrl: text('consent_source_url'),
    consentPhoneGranted: boolean('consent_phone_granted'),
    callbackState: text('callback_state', { enum: INQUIRY_CALLBACK_STATES }).notNull(),
    callbackSkipReason: text('callback_skip_reason', { enum: INQUIRY_SKIP_REASONS }),
    callbackAttempts: smallint('callback_attempts').notNull().default(0),
    callbackNextAttemptAt: ts('callback_next_attempt_at'),
    callbackLastAttemptAt: ts('callback_last_attempt_at'),
    qualificationSummary: text('qualification_summary'),
    receivedAt: ts('received_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'inquiries_pkey', columns: [t.organizationId, t.id] }),
    check('inquiries_id_shape', idShape('id', 'inq')),
    check('inquiries_organization_id_shape', orgShape),
    check('inquiries_organization_not_global', notGlobal),
    check(
      'inquiries_idempotency_key_shape',
      sql`char_length(${t.idempotencyKey}) between ${num(MIN_AGENT_IDEMPOTENCY_KEY_LENGTH)} and ${num(MAX_AGENT_IDEMPOTENCY_KEY_LENGTH)}
        and ${t.idempotencyKey} collate "C" ~ '${sql.raw(IDEMPOTENCY_KEY)}'`
    ),
    check('inquiries_source_known', sql`${t.source} in (${list(INQUIRY_SOURCES)})`),
    check('inquiries_prospect_id_shape', idShape('prospect_id', 'prs')),
    check('inquiries_assigned_to_membership_id_shape', idShape('assigned_to_membership_id', 'mem')),
    check('inquiries_chat_id_shape', idShape('chat_id', 'cht')),
    check('inquiries_call_id_shape', idShape('call_id', 'call')),
    check('inquiries_consent_wording_id_shape', idShape('consent_wording_id', 'cwd')),
    check(
      'inquiries_callback_state_known',
      sql`${t.callbackState} in (${list(INQUIRY_CALLBACK_STATES)})`
    ),
    check(
      'inquiries_callback_skip_reason_known',
      sql`${t.callbackSkipReason} is null or ${t.callbackSkipReason} in (${list(INQUIRY_SKIP_REASONS)})`
    ),
    check(
      'inquiries_callback_attempts_range',
      sql`${t.callbackAttempts} between 0 and ${num(MAX_CALLBACK_ATTEMPTS)}`
    ),
    check(
      'inquiries_consent_all_or_none',
      sql`(${t.consentWordingId} is null) = (${t.consentWordingVersion} is null)
        and (${t.consentWordingId} is null) = (${t.consentSourceUrl} is null)
        and (${t.consentWordingId} is null) = (${t.consentPhoneGranted} is null)
        and (${t.consentWordingVersion} is null or ${t.consentWordingVersion} >= 1)
        and (${t.consentSourceUrl} is null or (char_length(${t.consentSourceUrl}) between 1 and ${num(MAX_SOURCE_URL_LENGTH)}
          and ${t.consentSourceUrl} ~ '${sql.raw(SOURCE_URL)}'))`
    ),
    check(
      'inquiries_form_has_consent',
      sql`${t.source} <> 'form' or ${t.consentWordingId} is not null`
    ),
    check('inquiries_chat_link', sql`(${t.source} = 'chat') = (${t.chatId} is not null)`),
    check('inquiries_call_link', sql`${t.source} <> 'call' or ${t.callId} is not null`),
    check(
      'inquiries_call_not_called_back',
      sql`${t.source} <> 'call' or ${t.callbackState} = 'not_applicable'`
    ),
    check(
      'inquiries_callback_needs_consent',
      sql`${t.callbackState} in ('not_applicable', 'skipped') or ${t.consentWordingId} is not null`
    ),
    check(
      'inquiries_dialled_has_phone_consent',
      sql`${t.callbackState} in ('not_applicable', 'skipped') or ${t.consentPhoneGranted} is true`
    ),
    check(
      'inquiries_skip_reason',
      sql`(${t.callbackState} = 'skipped') = (${t.callbackSkipReason} is not null)`
    ),
    check(
      'inquiries_next_attempt',
      sql`${t.callbackNextAttemptAt} is null or ${t.callbackState} = 'no_answer'`
    ),
    check(
      'inquiries_not_applicable_never_dialled',
      sql`${t.callbackState} <> 'not_applicable' or (${t.callbackAttempts} = 0 and ${t.callbackLastAttemptAt} is null)`
    ),
    check(
      'inquiries_summary_shape',
      sql`${t.qualificationSummary} is null or char_length(${t.qualificationSummary}) between 1 and ${num(MAX_QUALIFICATION_SUMMARY_LENGTH)}`
    ),
    foreignKey({
      name: 'inquiries_chat_fk',
      columns: [t.organizationId, t.chatId],
      foreignColumns: [voiceChats.organizationId, voiceChats.id],
    }),
    foreignKey({
      name: 'inquiries_call_fk',
      columns: [t.organizationId, t.callId],
      foreignColumns: [voiceCalls.organizationId, voiceCalls.id],
    }),
    uniqueIndex('inquiries_idempotency_key').on(t.organizationId, t.idempotencyKey),
    uniqueIndex('inquiries_chat_key')
      .on(t.organizationId, t.chatId)
      .where(sql`${t.chatId} is not null`),
    uniqueIndex('inquiries_call_key')
      .on(t.organizationId, t.callId)
      .where(sql`${t.callId} is not null`),
    index('inquiries_list_idx').on(t.organizationId, t.receivedAt.desc(), t.id.desc()),
    index('inquiries_source_list_idx').on(
      t.organizationId,
      t.source,
      t.receivedAt.desc(),
      t.id.desc()
    ),
    index('inquiries_callback_list_idx').on(
      t.organizationId,
      t.callbackState,
      t.receivedAt.desc(),
      t.id.desc()
    ),
    index('inquiries_prospect_idx').on(t.organizationId, t.prospectId, t.receivedAt.desc()),
    index('inquiries_assignee_idx')
      .on(t.organizationId, t.assignedToMembershipId, t.receivedAt.desc(), t.id.desc())
      .where(sql`${t.assignedToMembershipId} is not null`),
    index('inquiries_retry_idx')
      .on(t.organizationId, t.callbackNextAttemptAt)
      .where(sql`${t.callbackState} = 'no_answer' and ${t.callbackNextAttemptAt} is not null`),
    index('inquiries_pending_idx')
      .on(t.organizationId, t.receivedAt)
      .where(sql`${t.callbackState} = 'pending'`),
  ]
)

/**
 * The Inbound Agent's settings: one row per Organization (the primary key), written whole by an
 * Admin or Owner. There is deliberately no column for the Disclosure, the Recording or the
 * Contact Consent check: they are not settings (ADR 0003). `hours` is the contract's list of
 * working days (1 to 7, each with its windows) and can only narrow the fixed calling window, which
 * the service checks; `time_zone` is an IANA name core validates. The language is fixed (English)
 * and not stored. A missing row means the Agent is not set up, which the service treats as paused.
 */
export const voiceAgentSettings = voiceSchema.table(
  'agent_settings',
  {
    organizationId: text('organization_id').notNull(),
    paused: boolean('paused').notNull(),
    greeting: text('greeting').notNull(),
    voiceStyle: text('voice_style', { enum: AGENT_VOICE_STYLES }).notNull(),
    timeZone: text('time_zone').notNull(),
    hours: jsonb('hours').$type<StoredWorkingDay[]>().notNull(),
    maxCallSeconds: integer('max_call_seconds').notNull(),
    maxCostUsdCents: integer('max_cost_usd_cents').notNull(),
    concurrencyCap: integer('concurrency_cap').notNull(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
    updatedByMembershipId: text('updated_by_membership_id'),
  },
  (t) => [
    primaryKey({ name: 'agent_settings_pkey', columns: [t.organizationId] }),
    check('agent_settings_organization_id_shape', orgShape),
    check('agent_settings_organization_not_global', notGlobal),
    check(
      'agent_settings_greeting_shape',
      sql`char_length(${t.greeting}) between 1 and ${num(MAX_AGENT_GREETING_LENGTH)}`
    ),
    check(
      'agent_settings_voice_style_known',
      sql`${t.voiceStyle} in (${list(AGENT_VOICE_STYLES)})`
    ),
    check(
      'agent_settings_time_zone_shape',
      sql`char_length(${t.timeZone}) between 1 and 64
        and ${t.timeZone} collate "C" ~ '^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+){0,2}$'`
    ),
    check(
      'agent_settings_hours_shape',
      sql`jsonb_typeof(${t.hours}) = 'array'
        and jsonb_array_length(${t.hours}) between 1 and ${num(MAX_AGENT_HOURS_DAYS)}
        and octet_length(${t.hours}::text) <= 4096`
    ),
    check(
      'agent_settings_max_call_seconds_range',
      sql`${t.maxCallSeconds} between 30 and ${num(MAX_AGENT_CALL_SECONDS)}`
    ),
    check(
      'agent_settings_max_cost_range',
      sql`${t.maxCostUsdCents} between 1 and ${num(MAX_AGENT_CALL_COST_USD_CENTS)}`
    ),
    check(
      'agent_settings_concurrency_range',
      sql`${t.concurrencyCap} between 1 and ${num(MAX_AGENT_CONCURRENCY)}`
    ),
    check(
      'agent_settings_updated_by_membership_id_shape',
      idShape('updated_by_membership_id', 'mem')
    ),
  ]
)

/**
 * A Qualification question an Admin wrote for the Agent to ask. `position` orders the questions
 * from 1 (the service keeps them 1..n; there is no unique constraint on it so a reorder can move
 * several rows in one statement, and ties break on `id`). `choices` is a JSON array of 2 to 10
 * texts exactly for a `choice` question. `skip_when` is a JSON array of at most 5 conditions the
 * service validates (no unknown question, no cycle: `agent.question_invalid`). At most 50 questions
 * per Organization is the service's rule.
 *
 * Lists served: the questions of an Organization in order (`qualification_questions_order_idx`).
 */
export const voiceQualificationQuestions = voiceSchema.table(
  'qualification_questions',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    position: integer('position').notNull(),
    prompt: text('prompt').notNull(),
    kind: text('kind', { enum: QUALIFICATION_QUESTION_KINDS }).notNull(),
    choices: jsonb('choices').$type<string[]>(),
    required: boolean('required').notNull().default(false),
    skipWhen: jsonb('skip_when').$type<StoredSkipCondition[]>().notNull().default([]),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'qualification_questions_pkey', columns: [t.organizationId, t.id] }),
    check('qualification_questions_id_shape', idShape('id', 'qst')),
    check('qualification_questions_organization_id_shape', orgShape),
    check('qualification_questions_organization_not_global', notGlobal),
    check(
      'qualification_questions_position_range',
      sql`${t.position} between 1 and ${num(MAX_QUALIFICATION_QUESTIONS)}`
    ),
    check(
      'qualification_questions_prompt_shape',
      sql`char_length(${t.prompt}) between 1 and ${num(MAX_QUESTION_PROMPT_LENGTH)}`
    ),
    check(
      'qualification_questions_kind_known',
      sql`${t.kind} in (${list(QUALIFICATION_QUESTION_KINDS)})`
    ),
    check(
      'qualification_questions_choices_match_kind',
      sql`(${t.kind} = 'choice') = (${t.choices} is not null)
        and (${t.choices} is null or (jsonb_typeof(${t.choices}) = 'array'
          and jsonb_array_length(${t.choices}) between ${num(MIN_QUESTION_CHOICES)} and ${num(MAX_QUESTION_CHOICES)}
          and octet_length(${t.choices}::text) <= 8192))`
    ),
    check(
      'qualification_questions_skip_when_shape',
      sql`jsonb_typeof(${t.skipWhen}) = 'array'
        and jsonb_array_length(${t.skipWhen}) <= ${num(MAX_SKIP_CONDITIONS)}
        and octet_length(${t.skipWhen}::text) <= 4096`
    ),
    index('qualification_questions_order_idx').on(t.organizationId, t.position, t.id),
  ]
)

/**
 * One answer of an Inquiry's Qualification. `value` is a JSON string, number or boolean, or null
 * when the question was skipped by its skip logic (`skipped`) or the Prospect declined; a skipped
 * answer has no value. One answer per Inquiry and question. `question_id` has no foreign key on
 * purpose: deleting a question must not delete what a Prospect answered, and the answer stays
 * readable by its id. Answers are tenant data from the Prospect and untrusted text.
 *
 * Lists served: the answers of one Inquiry (the primary key).
 */
export const voiceQualificationAnswers = voiceSchema.table(
  'qualification_answers',
  {
    organizationId: text('organization_id').notNull(),
    inquiryId: text('inquiry_id').notNull(),
    questionId: text('question_id').notNull(),
    value: jsonb('value').$type<QualificationJsonValue>(),
    skipped: boolean('skipped').notNull().default(false),
    answeredAt: ts('answered_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'qualification_answers_pkey',
      columns: [t.organizationId, t.inquiryId, t.questionId],
    }),
    check('qualification_answers_organization_id_shape', orgShape),
    check('qualification_answers_organization_not_global', notGlobal),
    check('qualification_answers_inquiry_id_shape', idShape('inquiry_id', 'inq')),
    check('qualification_answers_question_id_shape', idShape('question_id', 'qst')),
    check(
      'qualification_answers_value_shape',
      sql`${t.value} is null or (jsonb_typeof(${t.value}) in ('string', 'number', 'boolean')
        and (jsonb_typeof(${t.value}) <> 'string'
          or char_length(${t.value} #>> '{}') between 1 and ${num(MAX_ANSWER_LENGTH)}))`
    ),
    check(
      'qualification_answers_skipped_has_no_value',
      sql`not ${t.skipped} or ${t.value} is null`
    ),
    foreignKey({
      name: 'qualification_answers_inquiry_fk',
      columns: [t.organizationId, t.inquiryId],
      foreignColumns: [voiceInquiries.organizationId, voiceInquiries.id],
    }).onDelete('cascade'),
  ]
)

/**
 * One turn of the Agent's conversation: what the Prospect said or what the Agent answered, in a
 * Call (`call_id`), a Chat (`chat_id`) or an Admin's try-it session (`try_session_id`, a text
 * rehearsal; no foreign key because a session is not stored elsewhere), exactly one of the three.
 * `turn_index` counts from 0 within that conversation and is unique there
 * (`agent_turns_call_index_key`, `agent_turns_chat_index_key`, `agent_turns_try_index_key`), so a
 * retried turn is the same row and the insert either does nothing or is refused: it never
 * duplicates. `deferred` is true when the Agent said someone would follow up instead of answering;
 * `tool_name` is the one tool it called, from the closed list. An Agent turn that answered from
 * evidence has its passages in `agent_turn_sources`. Text is a Prospect's or a model's words:
 * untrusted data, never logged.
 *
 * Lists served (oldest first): the turns of a Call, a Chat or a session, by the three indexes
 * above.
 */
export const voiceAgentTurns = voiceSchema.table(
  'agent_turns',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    callId: text('call_id'),
    chatId: text('chat_id'),
    trySessionId: text('try_session_id'),
    turnIndex: integer('turn_index').notNull(),
    role: text('role', { enum: AGENT_TURN_ROLES }).notNull(),
    text: text('text').notNull(),
    deferred: boolean('deferred').notNull().default(false),
    toolName: text('tool_name', { enum: AGENT_TOOLS }),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'agent_turns_pkey', columns: [t.organizationId, t.id] }),
    check('agent_turns_id_shape', idShape('id', 'trn')),
    check('agent_turns_organization_id_shape', orgShape),
    check('agent_turns_organization_not_global', notGlobal),
    check('agent_turns_call_id_shape', idShape('call_id', 'call')),
    check('agent_turns_chat_id_shape', idShape('chat_id', 'cht')),
    check('agent_turns_try_session_id_shape', idShape('try_session_id', 'try')),
    check(
      'agent_turns_one_conversation',
      sql`num_nonnulls(${t.callId}, ${t.chatId}, ${t.trySessionId}) = 1`
    ),
    check('agent_turns_index_range', sql`${t.turnIndex} >= 0`),
    check('agent_turns_role_known', sql`${t.role} in (${list(AGENT_TURN_ROLES)})`),
    check(
      'agent_turns_text_shape',
      sql`char_length(${t.text}) between 1 and ${num(MAX_TURN_TEXT_LENGTH)}`
    ),
    check(
      'agent_turns_tool_known',
      sql`${t.toolName} is null or ${t.toolName} in (${list(AGENT_TOOLS)})`
    ),
    check(
      'agent_turns_only_agent_acts',
      sql`${t.role} = 'agent' or (${t.toolName} is null and not ${t.deferred})`
    ),
    foreignKey({
      name: 'agent_turns_call_fk',
      columns: [t.organizationId, t.callId],
      foreignColumns: [voiceCalls.organizationId, voiceCalls.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'agent_turns_chat_fk',
      columns: [t.organizationId, t.chatId],
      foreignColumns: [voiceChats.organizationId, voiceChats.id],
    }).onDelete('cascade'),
    uniqueIndex('agent_turns_call_index_key')
      .on(t.organizationId, t.callId, t.turnIndex)
      .where(sql`${t.callId} is not null`),
    uniqueIndex('agent_turns_chat_index_key')
      .on(t.organizationId, t.chatId, t.turnIndex)
      .where(sql`${t.chatId} is not null`),
    uniqueIndex('agent_turns_try_index_key')
      .on(t.organizationId, t.trySessionId, t.turnIndex)
      .where(sql`${t.trySessionId} is not null`),
  ]
)

/**
 * A Playbook passage an Agent turn rests on: the Document, its page (null for a format without
 * pages) and the quoted passage (the contract's `copilotDocumentSourceSchema`). At most 10 per
 * turn (`position` 0 to 9, the primary key). `document_id` has no foreign key (the Document is
 * the Playbook service's); a Document deleted later leaves its citation, which is the record of
 * what the Agent said at the time. Only an `agent` turn has sources. The passage is the
 * Organization's own sales material: untrusted data, never logged.
 *
 * Lists served: the sources of one turn, in order (the primary key).
 */
export const voiceAgentTurnSources = voiceSchema.table(
  'agent_turn_sources',
  {
    organizationId: text('organization_id').notNull(),
    turnId: text('turn_id').notNull(),
    position: smallint('position').notNull(),
    documentId: text('document_id').notNull(),
    page: integer('page'),
    passage: text('passage').notNull(),
  },
  (t) => [
    primaryKey({
      name: 'agent_turn_sources_pkey',
      columns: [t.organizationId, t.turnId, t.position],
    }),
    check('agent_turn_sources_organization_id_shape', orgShape),
    check('agent_turn_sources_organization_not_global', notGlobal),
    check('agent_turn_sources_turn_id_shape', idShape('turn_id', 'trn')),
    check(
      'agent_turn_sources_position_range',
      sql`${t.position} between 0 and ${num(MAX_TURN_SOURCES - 1)}`
    ),
    check('agent_turn_sources_document_id_shape', idShape('document_id', 'doc')),
    check(
      'agent_turn_sources_page_range',
      sql`${t.page} is null or ${t.page} between 1 and ${num(MAX_DOCUMENT_PAGES)}`
    ),
    check(
      'agent_turn_sources_passage_shape',
      sql`char_length(${t.passage}) between 1 and ${num(MAX_COPILOT_QUOTE_LENGTH)}`
    ),
    foreignKey({
      name: 'agent_turn_sources_turn_fk',
      columns: [t.organizationId, t.turnId],
      foreignColumns: [voiceAgentTurns.organizationId, voiceAgentTurns.id],
    }).onDelete('cascade'),
  ]
)

/**
 * A Handoff: the Agent passing a live Call or Chat to a Rep. It names a Call or a Chat by
 * `channel` (exactly one). `rep_membership_id` is the Rep it is currently offered to, null exactly
 * when no Rep is left (`no_rep`); `attempt` counts the Reps tried (1 to 10). A Handoff that was
 * answered (`accepted`, `completed`) has `answered_at`; one that is over for good (`completed`,
 * `no_rep`) has `completed_at` and, as the event reports, a `result`; times never run backwards.
 * At most one Handoff per Call and per Chat is live (`pending` or `accepted`) at a time, so a
 * retried `hand_off` tool call cannot ring two Reps.
 *
 * Lists served (keyset `(requested_at, id)` newest first, `LIMIT` a page): all Handoffs
 * (`handoffs_list_idx`), one state (`handoffs_state_list_idx`); the pending ones of a Rep, which is
 * what a Rep's screen reads (`handoffs_rep_pending_idx`); of a Call or a Chat (`handoffs_call_idx`,
 * `handoffs_chat_idx`, also the foreign keys' indexes).
 */
export const voiceHandoffs = voiceSchema.table(
  'handoffs',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    state: text('state', { enum: HANDOFF_STATES }).notNull().default('pending'),
    channel: text('channel', { enum: HANDOFF_CHANNELS }).notNull(),
    callId: text('call_id'),
    chatId: text('chat_id'),
    repMembershipId: text('rep_membership_id'),
    attempt: smallint('attempt').notNull().default(1),
    reason: text('reason', { enum: HANDOFF_REASONS }).notNull(),
    result: text('result', { enum: HANDOFF_RESULTS }),
    requestedAt: ts('requested_at').notNull().defaultNow(),
    answeredAt: ts('answered_at'),
    completedAt: ts('completed_at'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'handoffs_pkey', columns: [t.organizationId, t.id] }),
    check('handoffs_id_shape', idShape('id', 'hof')),
    check('handoffs_organization_id_shape', orgShape),
    check('handoffs_organization_not_global', notGlobal),
    check('handoffs_state_known', sql`${t.state} in (${list(HANDOFF_STATES)})`),
    check('handoffs_channel_known', sql`${t.channel} in (${list(HANDOFF_CHANNELS)})`),
    check('handoffs_reason_known', sql`${t.reason} in (${list(HANDOFF_REASONS)})`),
    check(
      'handoffs_result_known',
      sql`${t.result} is null or ${t.result} in (${list(HANDOFF_RESULTS)})`
    ),
    check('handoffs_call_id_shape', idShape('call_id', 'call')),
    check('handoffs_chat_id_shape', idShape('chat_id', 'cht')),
    check('handoffs_rep_membership_id_shape', idShape('rep_membership_id', 'mem')),
    check(
      'handoffs_channel_names_its_conversation',
      sql`(${t.channel} = 'call' and ${t.callId} is not null and ${t.chatId} is null)
        or (${t.channel} = 'chat' and ${t.chatId} is not null and ${t.callId} is null)`
    ),
    check('handoffs_attempt_range', sql`${t.attempt} between 1 and ${num(MAX_HANDOFF_ATTEMPTS)}`),
    check(
      'handoffs_rep_matches_state',
      sql`(${t.state} = 'no_rep') = (${t.repMembershipId} is null)`
    ),
    check(
      'handoffs_answered',
      sql`${t.state} not in ('accepted', 'completed') or ${t.answeredAt} is not null`
    ),
    check(
      'handoffs_completed',
      sql`(${t.state} in ('completed', 'no_rep')) = (${t.completedAt} is not null)`
    ),
    check(
      'handoffs_result_only_when_over',
      sql`${t.result} is null or ${t.state} in ('completed', 'no_rep')`
    ),
    check(
      'handoffs_times_in_order',
      sql`(${t.answeredAt} is null or ${t.answeredAt} >= ${t.requestedAt})
        and (${t.completedAt} is null or ${t.completedAt} >= coalesce(${t.answeredAt}, ${t.requestedAt}))`
    ),
    foreignKey({
      name: 'handoffs_call_fk',
      columns: [t.organizationId, t.callId],
      foreignColumns: [voiceCalls.organizationId, voiceCalls.id],
    }),
    foreignKey({
      name: 'handoffs_chat_fk',
      columns: [t.organizationId, t.chatId],
      foreignColumns: [voiceChats.organizationId, voiceChats.id],
    }),
    uniqueIndex('handoffs_call_live_key')
      .on(t.organizationId, t.callId)
      .where(sql`${t.callId} is not null and ${t.state} in ('pending', 'accepted')`),
    uniqueIndex('handoffs_chat_live_key')
      .on(t.organizationId, t.chatId)
      .where(sql`${t.chatId} is not null and ${t.state} in ('pending', 'accepted')`),
    index('handoffs_list_idx').on(t.organizationId, t.requestedAt.desc(), t.id.desc()),
    index('handoffs_state_list_idx').on(
      t.organizationId,
      t.state,
      t.requestedAt.desc(),
      t.id.desc()
    ),
    index('handoffs_rep_pending_idx')
      .on(t.organizationId, t.repMembershipId, t.requestedAt)
      .where(sql`${t.state} = 'pending'`),
    index('handoffs_call_idx').on(t.organizationId, t.callId).where(sql`${t.callId} is not null`),
    index('handoffs_chat_idx').on(t.organizationId, t.chatId).where(sql`${t.chatId} is not null`),
  ]
)
