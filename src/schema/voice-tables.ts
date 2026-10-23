import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { IDENTITY_VALUE_PATTERNS } from './core-prospects'
import { DEAL_ID_MAX_BYTES, DEAL_ID_MAX_LENGTH } from './playbook-sales-history'
import { voiceSchema } from './voice'

/*
 * The values below mirror the contract (`tula-closeline-contract`, `src/voice`); this library does
 * not depend on the contract, so each carries the name of the constant it copies.
 * `voice-tables.test.ts` pins every value to the list or number written there.
 */

/** The states of a Line. Mirrors the contract's `LINE_STATES`. */
export const LINE_STATES = ['porting', 'active', 'released'] as const
/** Who inbound Calls on a Line ring. Mirrors the `kind` of the contract's `lineAssignmentSchema`. */
export const LINE_ASSIGNMENT_KINDS = ['unassigned', 'team', 'rep'] as const
/** The longest Line label, in characters. Mirrors the contract's `MAX_LINE_LABEL_LENGTH`. */
export const MAX_LINE_LABEL_LENGTH = 100
/** The directions of a Call. Mirrors the contract's `VOICE_CALL_DIRECTIONS`. */
export const VOICE_CALL_DIRECTIONS = ['inbound', 'outbound'] as const
/** The states of a Call. Mirrors the contract's `VOICE_CALL_STATES`. */
export const VOICE_CALL_STATES = [
  'ringing',
  'connecting',
  'disclosing',
  'live',
  'ended',
  'failed',
  'missed',
] as const
/** The states a Call cannot leave. Mirrors the contract's `VOICE_CALL_FINAL_STATES`. */
export const VOICE_CALL_FINAL_STATES = ['ended', 'failed', 'missed'] as const
/** Why a Call ended `failed`. Mirrors the contract's `VOICE_CALL_FAILURE_REASONS`. */
export const VOICE_CALL_FAILURE_REASONS = [
  'disclosure_failed',
  'carrier_dropped',
  'carrier_rejected',
  'busy',
  'no_answer',
  'rep_unreachable',
  'provider_error',
  'timeout',
] as const
/** Who ended a Call. Mirrors the contract's `VOICE_CALL_ENDED_BY`. */
export const VOICE_CALL_ENDED_BY = ['rep', 'prospect', 'system'] as const
/** The states of a Call's Transcript. Mirrors the contract's `VOICE_TRANSCRIPT_STATES`. */
export const VOICE_TRANSCRIPT_STATES = ['pending', 'ready', 'deleted'] as const
/** The longest a Call can last, in seconds. Mirrors the contract's `MAX_CALL_DURATION_SECONDS`. */
export const MAX_CALL_DURATION_SECONDS = 43_200
/** The longest wrap-up note, in characters. Mirrors the contract's `MAX_WRAP_UP_NOTE_LENGTH`. */
export const MAX_WRAP_UP_NOTE_LENGTH = 2000
/**
 * The states a Recording row is in. A Call with no row has no Recording (the contract's `none`).
 * Mirrors the contract's `VOICE_RECORDING_STATES` without `none`.
 */
export const VOICE_RECORDING_STATES = ['storing', 'stored', 'deleted'] as const
/** The longest storage key of a Recording, in characters. Mirrors the contract's `MAX_RECORDING_KEY_LENGTH`. */
export const MAX_RECORDING_KEY_LENGTH = 512
/** The audio channels of a Recording: one mixed, or two (Rep on channel 1, Prospect on channel 2). */
export const VOICE_RECORDING_CHANNELS = [1, 2] as const
/** The kinds of entry in a Call's event log. */
export const VOICE_CALL_EVENT_KINDS = [
  'state_changed',
  'disclosure_played',
  'recording_started',
  'recording_stored',
  'recording_deleted',
  'provider_callback',
] as const
/** The longest provider event id, in characters. */
export const MAX_PROVIDER_EVENT_ID_LENGTH = 200
/** The longest idempotency key, in characters. Mirrors the contract's `idempotencyKeySchema`. */
export const MAX_VOICE_IDEMPOTENCY_KEY_LENGTH = 255

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const num = (value: number) => sql.raw(String(value))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })

/**
 * A Line: a phone number an Organization uses to place and receive Calls. `number` is E.164 and
 * tenant data (never logged). A number is live in at most one Organization at a time
 * (`lines_number_live_key`, over every state but `released`). Assignment is one of three shapes,
 * tied by a check: nobody (both ids null), a Team (`assignment_team_id`) or a Rep
 * (`assignment_membership_id`); a released Line is unassigned and has its release time.
 * `provider_sid` is the telephony provider's id for the number.
 *
 * Lists served (keyset `(created_at, id)` newest first, `LIMIT` a page): all Lines
 * (`lines_list_idx`), one state (`lines_state_list_idx`); the Lines of a Team or a Rep
 * (`lines_team_idx`, `lines_rep_idx`).
 */
export const voiceLines = voiceSchema.table(
  'lines',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    number: text('number').notNull(),
    country: text('country').notNull(),
    label: text('label'),
    state: text('state', { enum: LINE_STATES }).notNull(),
    assignmentKind: text('assignment_kind', { enum: LINE_ASSIGNMENT_KINDS })
      .notNull()
      .default('unassigned'),
    assignmentTeamId: text('assignment_team_id'),
    assignmentMembershipId: text('assignment_membership_id'),
    providerSid: text('provider_sid'),
    createdAt: ts('created_at').notNull().defaultNow(),
    releasedAt: ts('released_at'),
  },
  (t) => [
    primaryKey({ name: 'lines_pkey', columns: [t.organizationId, t.id] }),
    check('lines_id_shape', idShape('id', 'line')),
    check('lines_organization_id_shape', orgShape),
    check('lines_organization_not_global', notGlobal),
    check('lines_number_shape', sql`${t.number} ~ '${sql.raw(IDENTITY_VALUE_PATTERNS.phone)}'`),
    check('lines_country_shape', sql`${t.country} ~ '^[A-Z]{2}$'`),
    check(
      'lines_label_shape',
      sql`${t.label} is null or char_length(${t.label}) between 1 and ${num(MAX_LINE_LABEL_LENGTH)}`
    ),
    check('lines_state_known', sql`${t.state} in (${list(LINE_STATES)})`),
    check(
      'lines_assignment_kind_known',
      sql`${t.assignmentKind} in (${list(LINE_ASSIGNMENT_KINDS)})`
    ),
    check('lines_assignment_team_id_shape', idShape('assignment_team_id', 'team')),
    check('lines_assignment_membership_id_shape', idShape('assignment_membership_id', 'mem')),
    check(
      'lines_assignment_matches_kind',
      sql`(${t.assignmentKind} = 'team') = (${t.assignmentTeamId} is not null)
        and (${t.assignmentKind} = 'rep') = (${t.assignmentMembershipId} is not null)`
    ),
    check(
      'lines_provider_sid_shape',
      sql`${t.providerSid} is null or char_length(${t.providerSid}) between 1 and 64`
    ),
    check('lines_released_at', sql`(${t.state} = 'released') = (${t.releasedAt} is not null)`),
    check(
      'lines_released_unassigned',
      sql`${t.state} <> 'released' or ${t.assignmentKind} = 'unassigned'`
    ),
    uniqueIndex('lines_number_live_key').on(t.number).where(sql`${t.state} <> 'released'`),
    uniqueIndex('lines_provider_sid_key')
      .on(t.organizationId, t.providerSid)
      .where(sql`${t.providerSid} is not null`),
    index('lines_list_idx').on(t.organizationId, t.createdAt.desc(), t.id.desc()),
    index('lines_state_list_idx').on(t.organizationId, t.state, t.createdAt.desc(), t.id.desc()),
    index('lines_team_idx')
      .on(t.organizationId, t.assignmentTeamId)
      .where(sql`${t.assignmentTeamId} is not null`),
    index('lines_rep_idx')
      .on(t.organizationId, t.assignmentMembershipId)
      .where(sql`${t.assignmentMembershipId} is not null`),
  ]
)

/**
 * A Call placed or taken in the Softphone. `prospect_number` is E.164 and tenant data (never
 * logged); `rep_membership_id` is null on a missed inbound Call nobody answered. The checks are the
 * contract's state machine: a `live` or `ended` Call has played its Disclosure (wording version
 * and time are both set or both null), `failed` has a reason and nothing else does,
 * `disclosure_failed` is only for a Disclosure that did not play, a final state has an end time,
 * `live` and `ended` have an answer time, only `ended` has a duration and a wrap-up (`deal_id`,
 * `note`), and times never run backwards. `transcript_state` is `pending` until a Transcript
 * exists. `idempotency_key` and `request_fingerprint` (both or neither) record how an outbound
 * Call was placed: one key, one Call, per Organization.
 *
 * Lists served (keyset `(created_at, id)` newest first, `LIMIT` a page, always one Organization):
 * all Calls (`calls_list_idx`); of one Rep, which is how a Team's Calls are read, `rep_membership_id
 * = any($ids)` (`calls_rep_list_idx`); one state, such as the missed inbound Calls
 * (`calls_state_list_idx`); of one Prospect (`calls_prospect_list_idx`); of one Line
 * (`calls_line_list_idx`, also the foreign key's index). A direction or time-range filter is
 * applied to the rows one of those reads.
 */
export const voiceCalls = voiceSchema.table(
  'calls',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    direction: text('direction', { enum: VOICE_CALL_DIRECTIONS }).notNull(),
    state: text('state', { enum: VOICE_CALL_STATES }).notNull(),
    lineId: text('line_id').notNull(),
    repMembershipId: text('rep_membership_id'),
    prospectId: text('prospect_id'),
    prospectNumber: text('prospect_number').notNull(),
    providerCallSid: text('provider_call_sid'),
    idempotencyKey: text('idempotency_key'),
    requestFingerprint: text('request_fingerprint'),
    disclosureWordingVersion: integer('disclosure_wording_version'),
    disclosurePlayedAt: ts('disclosure_played_at'),
    aiAssisted: boolean('ai_assisted').notNull().default(false),
    createdAt: ts('created_at').notNull().defaultNow(),
    answeredAt: ts('answered_at'),
    endedAt: ts('ended_at'),
    durationSeconds: integer('duration_seconds'),
    endedBy: text('ended_by', { enum: VOICE_CALL_ENDED_BY }),
    failureReason: text('failure_reason', { enum: VOICE_CALL_FAILURE_REASONS }),
    dealId: text('deal_id'),
    note: text('note'),
    transcriptState: text('transcript_state', { enum: VOICE_TRANSCRIPT_STATES })
      .notNull()
      .default('pending'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'calls_pkey', columns: [t.organizationId, t.id] }),
    check('calls_id_shape', idShape('id', 'call')),
    check('calls_organization_id_shape', orgShape),
    check('calls_organization_not_global', notGlobal),
    check('calls_line_id_shape', idShape('line_id', 'line')),
    check('calls_rep_membership_id_shape', idShape('rep_membership_id', 'mem')),
    check('calls_prospect_id_shape', idShape('prospect_id', 'prs')),
    check(
      'calls_prospect_number_shape',
      sql`${t.prospectNumber} ~ '${sql.raw(IDENTITY_VALUE_PATTERNS.phone)}'`
    ),
    check('calls_direction_known', sql`${t.direction} in (${list(VOICE_CALL_DIRECTIONS)})`),
    check('calls_state_known', sql`${t.state} in (${list(VOICE_CALL_STATES)})`),
    check(
      'calls_ended_by_known',
      sql`${t.endedBy} is null or ${t.endedBy} in (${list(VOICE_CALL_ENDED_BY)})`
    ),
    check(
      'calls_failure_reason_known',
      sql`${t.failureReason} is null or ${t.failureReason} in (${list(VOICE_CALL_FAILURE_REASONS)})`
    ),
    check(
      'calls_transcript_state_known',
      sql`${t.transcriptState} in (${list(VOICE_TRANSCRIPT_STATES)})`
    ),
    check(
      'calls_provider_call_sid_shape',
      sql`${t.providerCallSid} is null or char_length(${t.providerCallSid}) between 1 and 64`
    ),
    check(
      'calls_idempotency_shape',
      sql`(${t.idempotencyKey} is null) = (${t.requestFingerprint} is null)
        and (${t.idempotencyKey} is null or char_length(${t.idempotencyKey}) between 1 and ${num(MAX_VOICE_IDEMPOTENCY_KEY_LENGTH)})
        and (${t.requestFingerprint} is null or ${t.requestFingerprint} ~ '^[0-9a-f]{64}$')`
    ),
    check(
      'calls_disclosure_all_or_none',
      sql`(${t.disclosureWordingVersion} is null) = (${t.disclosurePlayedAt} is null)
        and (${t.disclosureWordingVersion} is null or ${t.disclosureWordingVersion} >= 1)`
    ),
    check(
      'calls_live_has_disclosure',
      sql`${t.state} not in ('live', 'ended') or ${t.disclosurePlayedAt} is not null`
    ),
    check(
      'calls_failed_has_reason',
      sql`(${t.state} = 'failed') = (${t.failureReason} is not null)`
    ),
    check(
      'calls_disclosure_failure',
      sql`${t.failureReason} is distinct from 'disclosure_failed' or ${t.disclosurePlayedAt} is null`
    ),
    check(
      'calls_final_has_end',
      sql`(${t.state} in (${list(VOICE_CALL_FINAL_STATES)})) = (${t.endedAt} is not null)`
    ),
    check('calls_answered', sql`(${t.state} in ('live', 'ended')) = (${t.answeredAt} is not null)`),
    check('calls_duration', sql`(${t.state} = 'ended') = (${t.durationSeconds} is not null)`),
    check(
      'calls_duration_bounds',
      sql`${t.durationSeconds} is null or ${t.durationSeconds} between 0 and ${num(MAX_CALL_DURATION_SECONDS)}`
    ),
    check(
      'calls_ended_by_final',
      sql`${t.endedBy} is null or ${t.state} in (${list(VOICE_CALL_FINAL_STATES)})`
    ),
    check(
      'calls_times_ordered',
      sql`(${t.answeredAt} is null or ${t.answeredAt} >= ${t.createdAt})
        and (${t.endedAt} is null or ${t.endedAt} >= ${t.createdAt})
        and (${t.answeredAt} is null or ${t.endedAt} is null or ${t.endedAt} >= ${t.answeredAt})`
    ),
    check(
      'calls_wrap_up_only_ended',
      sql`${t.state} = 'ended' or (${t.dealId} is null and ${t.note} is null)`
    ),
    check(
      'calls_deal_id_shape',
      sql`${t.dealId} is null or (char_length(${t.dealId}) between 1 and ${num(DEAL_ID_MAX_LENGTH)}
        and octet_length(${t.dealId}) <= ${num(DEAL_ID_MAX_BYTES)}
        and ${t.dealId} = btrim(${t.dealId}, E' \\t\\n\\r\\f\\v'))`
    ),
    check(
      'calls_note_shape',
      sql`${t.note} is null or char_length(${t.note}) between 1 and ${num(MAX_WRAP_UP_NOTE_LENGTH)}`
    ),
    foreignKey({
      name: 'calls_line_fk',
      columns: [t.organizationId, t.lineId],
      foreignColumns: [voiceLines.organizationId, voiceLines.id],
    }),
    uniqueIndex('calls_provider_call_sid_key')
      .on(t.organizationId, t.providerCallSid)
      .where(sql`${t.providerCallSid} is not null`),
    uniqueIndex('calls_idempotency_key_key')
      .on(t.organizationId, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
    index('calls_list_idx').on(t.organizationId, t.createdAt.desc(), t.id.desc()),
    index('calls_rep_list_idx')
      .on(t.organizationId, t.repMembershipId, t.createdAt.desc(), t.id.desc())
      .where(sql`${t.repMembershipId} is not null`),
    index('calls_state_list_idx').on(t.organizationId, t.state, t.createdAt.desc(), t.id.desc()),
    index('calls_prospect_list_idx')
      .on(t.organizationId, t.prospectId, t.createdAt.desc(), t.id.desc())
      .where(sql`${t.prospectId} is not null`),
    index('calls_line_list_idx').on(t.organizationId, t.lineId, t.createdAt.desc(), t.id.desc()),
  ]
)

/**
 * One entry of a Call's append-only event log: a state change, the Disclosure played, a Recording
 * step, or a provider callback. It is also the idempotency record for webhooks:
 * `call_events_provider_event_key` is unique over `(organization_id, provider_event_id)`, so a
 * redelivered webhook inserts nothing (`on conflict (organization_id, provider_event_id) do
 * nothing`); entries the service makes itself have no provider event id (null, and nulls never
 * conflict). `seq` orders the log. The service role may insert and delete (erasure, retention) but
 * holds no UPDATE: an entry never changes. A `state_changed` entry carries the new state
 * (`to_state`) and the one it left (`from_state`, null for the first); no other kind does.
 * Holds no number, name or Transcript text.
 *
 * Lists served: one Call's log in order, `WHERE organization_id = $1 AND call_id = $2 ORDER BY
 * seq` (`call_events_call_idx`).
 */
export const voiceCallEvents = voiceSchema.table(
  'call_events',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    seq: bigint('seq', { mode: 'number' }).generatedAlwaysAsIdentity().notNull(),
    callId: text('call_id').notNull(),
    kind: text('kind', { enum: VOICE_CALL_EVENT_KINDS }).notNull(),
    fromState: text('from_state', { enum: VOICE_CALL_STATES }),
    toState: text('to_state', { enum: VOICE_CALL_STATES }),
    providerEventId: text('provider_event_id'),
    occurredAt: ts('occurred_at').notNull(),
    recordedAt: ts('recorded_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'call_events_pkey', columns: [t.organizationId, t.id] }),
    check('call_events_id_shape', idShape('id', 'vev')),
    check('call_events_organization_id_shape', orgShape),
    check('call_events_organization_not_global', notGlobal),
    check('call_events_call_id_shape', idShape('call_id', 'call')),
    check('call_events_kind_known', sql`${t.kind} in (${list(VOICE_CALL_EVENT_KINDS)})`),
    check(
      'call_events_from_state_known',
      sql`${t.fromState} is null or ${t.fromState} in (${list(VOICE_CALL_STATES)})`
    ),
    check(
      'call_events_to_state_known',
      sql`${t.toState} is null or ${t.toState} in (${list(VOICE_CALL_STATES)})`
    ),
    check(
      'call_events_state_change',
      sql`(${t.kind} = 'state_changed') = (${t.toState} is not null)
        and (${t.fromState} is null or ${t.toState} is not null)`
    ),
    check(
      'call_events_provider_event_id_shape',
      sql`${t.providerEventId} is null or char_length(${t.providerEventId}) between 1 and ${num(MAX_PROVIDER_EVENT_ID_LENGTH)}`
    ),
    foreignKey({
      name: 'call_events_call_fk',
      columns: [t.organizationId, t.callId],
      foreignColumns: [voiceCalls.organizationId, voiceCalls.id],
    }).onDelete('cascade'),
    uniqueIndex('call_events_provider_event_key').on(t.organizationId, t.providerEventId),
    index('call_events_call_idx').on(t.organizationId, t.callId, t.seq),
  ]
)

/**
 * The reference to a Call's Recording: the audio is in the Region's object storage under
 * `storage_key`, never in the database. At most one per Call (`recordings_call_key`). It is
 * `storing` while copied from the provider, `stored` once playable (`size_bytes`, `stored_at`
 * set), and `deleted` after an Admin deleted it (`deleted_at` set); `purge_due_at`, only on a
 * deleted row, is when the object is removed from storage. `channels` is 1 or 2 (two: the Rep and
 * the Prospect separately). A Call with no row has no Recording.
 *
 * Lookups served: by Call (`recordings_call_key`); by storage key (`recordings_storage_key_key`);
 * deleted Recordings due for purge, oldest first (`recordings_purge_idx`).
 */
export const voiceRecordings = voiceSchema.table(
  'recordings',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    callId: text('call_id').notNull(),
    storageKey: text('storage_key').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    channels: smallint('channels').notNull(),
    state: text('state', { enum: VOICE_RECORDING_STATES }).notNull().default('storing'),
    createdAt: ts('created_at').notNull().defaultNow(),
    storedAt: ts('stored_at'),
    deletedAt: ts('deleted_at'),
    purgeDueAt: ts('purge_due_at'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'recordings_pkey', columns: [t.organizationId, t.id] }),
    check('recordings_id_shape', idShape('id', 'rec')),
    check('recordings_organization_id_shape', orgShape),
    check('recordings_organization_not_global', notGlobal),
    check('recordings_call_id_shape', idShape('call_id', 'call')),
    check(
      'recordings_storage_key_shape',
      sql`char_length(${t.storageKey}) between 1 and ${num(MAX_RECORDING_KEY_LENGTH)}
        and ${t.storageKey} collate "C" ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]*$'`
    ),
    check('recordings_channels_known', sql`${t.channels} in (1, 2)`),
    check('recordings_state_known', sql`${t.state} in (${list(VOICE_RECORDING_STATES)})`),
    check('recordings_size_bounds', sql`${t.sizeBytes} is null or ${t.sizeBytes} >= 0`),
    check(
      'recordings_stored',
      sql`(${t.state} <> 'storing' or (${t.storedAt} is null and ${t.sizeBytes} is null)) and (${t.state} <> 'stored' or (${t.storedAt} is not null and ${t.sizeBytes} is not null))`
    ),
    check('recordings_deleted', sql`(${t.state} = 'deleted') = (${t.deletedAt} is not null)`),
    check('recordings_purge_only_deleted', sql`${t.purgeDueAt} is null or ${t.state} = 'deleted'`),
    foreignKey({
      name: 'recordings_call_fk',
      columns: [t.organizationId, t.callId],
      foreignColumns: [voiceCalls.organizationId, voiceCalls.id],
    }).onDelete('cascade'),
    uniqueIndex('recordings_call_key').on(t.organizationId, t.callId),
    uniqueIndex('recordings_storage_key_key').on(t.organizationId, t.storageKey),
    index('recordings_purge_idx')
      .on(t.organizationId, t.purgeDueAt)
      .where(sql`${t.state} = 'deleted' and ${t.purgeDueAt} is not null`),
  ]
)
