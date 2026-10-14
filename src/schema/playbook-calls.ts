import { sql } from 'drizzle-orm'
import {
  bigint,
  check,
  customType,
  foreignKey,
  index,
  integer,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { playbookSchema } from './playbook'
import { deals } from './playbook-sales-history'
import { GLOBAL_SCOPE_ORGANIZATION_ID } from './playbook-tables'

/*
 * The values below mirror the contract at tag v0.8.0 (`tula-closeline-contract`, `src/playbook`);
 * this library does not depend on the contract, so each carries the name of the constant it copies.
 * `playbook-calls.test.ts` pins every value to the number or list written there, and mirrors
 * `repChangeAllowed` and `callReuploadRequeues`, so a change on one side that is not made on the
 * other fails a test.
 */

/** The states a Call is in. Mirrors the contract's `CALL_STATES`. */
export const CALL_STATES = [
  'uploaded',
  'transcribing',
  'awaiting_rep',
  'processing',
  'ready',
  'failed',
  'deleted',
] as const
/** Why a Call ended `failed`. Mirrors the contract's `CALL_FAILURE_REASONS`. */
export const CALL_FAILURE_REASONS = [
  'no_turns',
  'too_few_speakers',
  'too_many_speakers',
  'rep_label_not_found',
  'not_per_side',
  'too_long',
  'transcription_failed',
  'transcription_timed_out',
  'unreadable',
  'processing_failed',
] as const
/** What a Call was uploaded as. Mirrors the contract's `CALL_KINDS`. */
export const CALL_KINDS = ['transcript', 'recording'] as const
/** The media type of a stored Call file. Mirrors the contract's `CALL_MEDIA_TYPES`. */
export const CALL_MEDIA_TYPES = [
  'text/plain',
  'text/vtt',
  'application/x-subrip',
  'application/json',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/flac',
] as const
/** The channels of a per-side Recording. Mirrors the contract's `CALL_CHANNELS`. */
export const CALL_CHANNELS = ['left', 'right'] as const
/** How a Rep is chosen. Mirrors the contract's `repChoiceSchema` discriminator. */
export const CALL_REP_BY = ['speaker', 'channel'] as const
/** The largest Transcript, 5 MiB. Mirrors the contract's `MAX_TRANSCRIPT_BYTES`. */
export const CALL_MAX_TRANSCRIPT_BYTES = 5 * 1024 * 1024
/** The largest Recording, 500 MiB. Mirrors the contract's `MAX_RECORDING_BYTES`. */
export const CALL_MAX_RECORDING_BYTES = 500 * 1024 * 1024
/** The longest Recording in seconds (3 hours). Mirrors the contract's `MAX_RECORDING_SECONDS`. */
export const CALL_MAX_RECORDING_SECONDS = 3 * 60 * 60
/** The most speakers a Call may list. Mirrors the contract's `MAX_CALL_SPEAKERS`. */
export const CALL_MAX_SPEAKERS = 20
/** The longest speaker label in code points. Mirrors the contract's `MAX_SPEAKER_LABEL_LENGTH`. */
export const CALL_SPEAKER_LABEL_MAX_LENGTH = 64
/** The most UTF-8 bytes a speaker label takes. Mirrors the contract's `MAX_SPEAKER_LABEL_BYTES`. */
export const CALL_SPEAKER_LABEL_MAX_BYTES = 256
/** The largest Rep or Outcome sequence. Mirrors the contract's `MAX_SEQ`. */
export const CALL_MAX_SEQ = 2_147_483_647
/** The most times a Call purge may be claimed: the table's bound, as for documents. */
export const CALL_PURGE_MAX_ATTEMPTS = 20
/** The most times a Call job may be claimed: the table's bound, as for ingestion jobs. */
export const CALL_JOB_MAX_ATTEMPTS = 20
/**
 * The most sends of one Recording to the transcription vendor over the Call's whole life. A transcribe
 * job is claimed at most {@link CALL_JOB_MAX_ATTEMPTS} times and each attempt sends at most once, but a
 * restore starts a new job, so the bound is on the Call itself: the table refuses a twenty-first
 * send, and {@link CALL_SENT_TO_VENDOR} answers `sent` false instead of counting it.
 */
export const CALL_MAX_VENDOR_SENDS = 20
/** The most Call ids {@link CALL_SEARCH_STATE} reads in one call: the search over-fetch window (topK 100). */
export const MAX_SEARCH_STATE_IDS = 100
/** What a vendor id may look like: opaque, 1 to 128 characters of `[A-Za-z0-9._:-]` (the transcriber port's rule). */
export const CALL_VENDOR_ID_PATTERN = '^[A-Za-z0-9._:-]{1,128}$'
/** The kinds of Call job: transcribe a Recording, build a Call's Moments, rebuild them after a Rep change. */
export const CALL_JOB_KINDS = ['transcribe', 'process', 'rebuild'] as const
/** The states of a Call job; `queued` and `running` are active. */
export const CALL_JOB_STATES = ['queued', 'running', 'succeeded', 'failed', 'cancelled'] as const

/**
 * Whether a Call's Rep may be picked or changed. Mirrors the contract's `repChangeAllowed`, and is
 * the same rule `CALL_SET_REP` applies in SQL: the test pins the two to each other.
 */
export function repChangeAllowed(state: string, failureReason: string | null): boolean {
  if (state === 'ready' || state === 'awaiting_rep') {
    return true
  }
  return (
    state === 'failed' &&
    (failureReason === 'rep_label_not_found' || failureReason === 'not_per_side')
  )
}

/**
 * Whether a same-Deal re-upload of identical content re-queues a failed Call. Mirrors the
 * contract's `callReuploadRequeues`; `CALL_REQUEUE` applies the same rule in SQL.
 */
export function callReuploadRequeues(failureReason: string | null): boolean {
  return (
    failureReason === 'transcription_failed' ||
    failureReason === 'transcription_timed_out' ||
    failureReason === 'processing_failed'
  )
}

const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
})
const textArray = customType<{ data: string[]; driverData: string[] }>({
  dataType: () => 'text[]',
})

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID}'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })

/**
 * The rows whose vector cleanup is pending, as for documents: deleted, and the cleanup recorded
 * for an older deletion than the current one. One text, used by `calls_cleanup_idx`, the
 * `CALL_LIST_PENDING_CLEANUP` statement and the `call_cleanup` discovery verification.
 */
export const CALL_PENDING_CLEANUP_PREDICATE =
  "state = 'deleted' and (vectors_removed_seq is null or vectors_removed_seq < deletion_seq)"

/**
 * A Call of an Organization (ADR 0018): the record of an uploaded Transcript or Recording and the
 * Deal it belongs to. **Metadata only**: the file is in object storage under `object_key`, the
 * Transcript a Recording produced under `transcript_key`, and the turns and Moments in the vector
 * index. Nothing here holds a turn, a sentence or audio. `speaker_labels` are untrusted text from
 * the file (at most 20, unique), kept so a Rep can be picked from them.
 *
 * Keyed by `(organization_id, id)`; `deal_record_id` references the Deal without a cascade, so a
 * Deal cannot be erased while a Call refers to it: Calls are erased first. The checks tie every
 * state to its columns exactly as the contract's `callSchema` does (see the table checks).
 *
 * `epoch` is bumped by every soft delete and restore (as for documents); `deletion_seq` by every
 * soft delete (a queued vector cleanup carries it); `rep_seq` by every Rep pick or change (a
 * queued rebuild carries it and applies only while it equals the stored one); `tagged_outcome_seq`
 * is the Outcome sequence of the Deal the Call's Moments are tagged with in the index, so a Call is
 * in search only while it is `ready`, its Deal is `won` and the tag is current.
 *
 * Content hash: unique per Organization among Calls whose purge has not started and that are not
 * barred from restore (`calls_content_hash_key`), whatever the Deal: the same content under
 * another Deal is found by the hash and refused. A Transcript and a Recording of the same Call
 * have different hashes and are two Calls.
 *
 * Quota: `organization_usage.call_count` and `recording_byte_count` count every Call, a soft-deleted
 * one and one in `awaiting_rep` included, until it is purged or erased. Recording bytes count
 * Recordings only.
 *
 * Lists (keyset `(created_at, id)`, newest first, always a text `cursor_at`): live Calls
 * (`calls_list_idx`), one state (`calls_state_list_idx`, deleted included), one Deal
 * (`calls_deal_list_idx`).
 */
export const calls = playbookSchema.table(
  'calls',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    dealRecordId: text('deal_record_id').notNull(),
    kind: text('kind', { enum: CALL_KINDS }).notNull(),
    fileName: text('file_name').notNull(),
    mediaType: text('media_type', { enum: CALL_MEDIA_TYPES }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    contentHash: bytes('content_hash').notNull(),
    durationSeconds: integer('duration_seconds'),
    state: text('state', { enum: CALL_STATES }).notNull().default('uploaded'),
    failureReason: text('failure_reason', { enum: CALL_FAILURE_REASONS }),
    repBy: text('rep_by', { enum: CALL_REP_BY }),
    repLabel: text('rep_label'),
    repChannel: text('rep_channel', { enum: CALL_CHANNELS }),
    speakerLabels: textArray('speaker_labels').notNull().default(sql`'{}'::text[]`),
    uploadedBy: text('uploaded_by').notNull(),
    objectKey: text('object_key').notNull(),
    transcriptKey: text('transcript_key'),
    epoch: integer('epoch').notNull().default(0),
    repSeq: integer('rep_seq').notNull().default(0),
    deletionSeq: integer('deletion_seq').notNull().default(0),
    vectorsRemovedSeq: integer('vectors_removed_seq'),
    taggedOutcomeSeq: integer('tagged_outcome_seq').notNull().default(0),
    sentToVendorAt: ts('sent_to_vendor_at'),
    // Counts the sends to the vendor, so each copy needs its own confirmed removal.
    vendorSendSeq: integer('vendor_send_seq').notNull().default(0),
    vendorRemovedAt: ts('vendor_removed_at'),
    deletedAt: ts('deleted_at'),
    deletedBy: text('deleted_by'),
    purgeDueAt: ts('purge_due_at'),
    purgeStartedAt: ts('purge_started_at'),
    purgeLeaseUntil: ts('purge_lease_until'),
    purgeAttempts: integer('purge_attempts').notNull().default(0),
    restoreBarredAt: ts('restore_barred_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'calls_pkey', columns: [t.organizationId, t.id] }),
    foreignKey({
      name: 'calls_deal_fk',
      columns: [t.organizationId, t.dealRecordId],
      foreignColumns: [deals.organizationId, deals.id],
    }),
    check('calls_id_shape', idShape('id', 'call')),
    check('calls_organization_id_shape', idShape('organization_id', 'org')),
    check('calls_organization_not_global', notGlobal),
    check('calls_deal_record_id_shape', idShape('deal_record_id', 'deal')),
    check('calls_uploaded_by_shape', idShape('uploaded_by', 'usr')),
    check('calls_deleted_by_shape', sql`${t.deletedBy} ~ '^usr_[0-9a-f]{32}$'`),
    check('calls_kind_known', sql`${t.kind} in (${list(CALL_KINDS)})`),
    check('calls_media_type_known', sql`${t.mediaType} in (${list(CALL_MEDIA_TYPES)})`),
    check(
      'calls_kind_matches_media_type',
      sql`(${t.kind} = 'recording') = (${t.mediaType} like 'audio/%')`
    ),
    check('calls_file_name_shape', sql`char_length(btrim(${t.fileName})) between 1 and 255`),
    check('calls_content_hash_length', sql`octet_length(${t.contentHash}) = 32`),
    check(
      'calls_size_bounds',
      sql`${t.sizeBytes} between 1 and ${sql.raw(String(CALL_MAX_RECORDING_BYTES))}
        and (${t.kind} = 'recording' or ${t.sizeBytes} <= ${sql.raw(String(CALL_MAX_TRANSCRIPT_BYTES))})`
    ),
    check(
      'calls_duration_bounds',
      sql`${t.durationSeconds} is null or (${t.durationSeconds} between 1 and ${sql.raw(String(CALL_MAX_RECORDING_SECONDS))}
        and ${t.kind} = 'recording')`
    ),
    check('calls_state_known', sql`${t.state} in (${list(CALL_STATES)})`),
    check('calls_failure_reason_known', sql`${t.failureReason} in (${list(CALL_FAILURE_REASONS)})`),
    check(
      'calls_failed_has_reason',
      sql`(${t.state} = 'failed') = (${t.failureReason} is not null)`
    ),
    check(
      'calls_transcript_states',
      sql`${t.kind} = 'recording' or ${t.state} not in ('transcribing', 'awaiting_rep')`
    ),
    check(
      'calls_rep_shape',
      sql`(${t.repBy} is null and ${t.repLabel} is null and ${t.repChannel} is null)
        or (${t.repBy} = 'speaker' and ${t.repLabel} is not null and ${t.repChannel} is null)
        or (${t.repBy} = 'channel' and ${t.repChannel} is not null and ${t.repLabel} is null
            and ${t.kind} = 'recording')`
    ),
    check(
      'calls_rep_label_shape',
      sql`${t.repLabel} is null or char_length(${t.repLabel}) between 1 and ${sql.raw(String(CALL_SPEAKER_LABEL_MAX_LENGTH))}
      and octet_length(${t.repLabel}) <= ${sql.raw(String(CALL_SPEAKER_LABEL_MAX_BYTES))}`
    ),
    check('calls_awaiting_rep_has_none', sql`${t.state} <> 'awaiting_rep' or ${t.repBy} is null`),
    check('calls_ready_has_rep', sql`${t.state} <> 'ready' or ${t.repBy} is not null`),
    check(
      'calls_ready_label_listed',
      sql`${t.state} <> 'ready' or ${t.repBy} is distinct from 'speaker' or ${t.repLabel} = any(${t.speakerLabels})`
    ),
    check('calls_speaker_labels_valid', sql`playbook.speaker_labels_ok(${t.speakerLabels})`),
    check(
      'calls_too_many_speakers_lists_none',
      sql`${t.failureReason} is distinct from 'too_many_speakers' or cardinality(${t.speakerLabels}) = 0`
    ),
    check(
      'calls_object_key_shape',
      sql`char_length(${t.objectKey}) between 1 and 1024 and ${t.objectKey} collate "C" ~ '^[!-~]+$'`
    ),
    check(
      'calls_transcript_key_shape',
      sql`char_length(${t.transcriptKey}) between 1 and 1024 and ${t.transcriptKey} collate "C" ~ '^[!-~]+$'`
    ),
    check(
      'calls_seq_bounds',
      sql`${t.epoch} >= 0 and ${t.deletionSeq} >= 0
        and ${t.repSeq} between 0 and ${sql.raw(String(CALL_MAX_SEQ))}
        and ${t.taggedOutcomeSeq} between 0 and ${sql.raw(String(CALL_MAX_SEQ))}`
    ),
    check(
      'calls_vectors_removed_seq_bounds',
      sql`${t.vectorsRemovedSeq} between 0 and ${t.deletionSeq}`
    ),
    check(
      'calls_deleted_has_times',
      sql`(${t.state} = 'deleted') = (${t.deletedAt} is not null)
        and (${t.state} = 'deleted') = (${t.purgeDueAt} is not null)`
    ),
    check('calls_deleted_by_when_deleted', sql`${t.state} = 'deleted' or ${t.deletedBy} is null`),
    check('calls_deleted_is_counted', sql`${t.state} <> 'deleted' or ${t.deletionSeq} >= 1`),
    check('calls_purge_due_after_delete', sql`${t.purgeDueAt} >= ${t.deletedAt}`),
    check(
      'calls_purge_only_when_deleted',
      sql`(${t.purgeStartedAt} is null or ${t.state} = 'deleted')
        and (${t.purgeStartedAt} is null) = (${t.purgeLeaseUntil} is null)
        and (${t.purgeStartedAt} is null) = (${t.purgeAttempts} = 0)`
    ),
    check(
      'calls_purge_attempts_bounds',
      sql`${t.purgeAttempts} between 0 and ${sql.raw(String(CALL_PURGE_MAX_ATTEMPTS))}`
    ),
    check(
      'calls_barred_only_when_deleted',
      sql`${t.restoreBarredAt} is null or ${t.state} = 'deleted'`
    ),
    check(
      'calls_vendor_removal_after_send',
      sql`${t.vendorRemovedAt} is null or ${t.sentToVendorAt} is not null`
    ),
    check(
      'calls_vendor_send_seq_max',
      sql`${t.vendorSendSeq} <= ${sql.raw(String(CALL_MAX_VENDOR_SENDS))}`
    ),
    check(
      'calls_vendor_send_seq_matches',
      sql`${t.vendorSendSeq} >= 0 and (${t.sentToVendorAt} is null) = (${t.vendorSendSeq} = 0)`
    ),
    check('calls_transcript_has_rep', sql`${t.kind} <> 'transcript' or ${t.repBy} is not null`),
    uniqueIndex('calls_content_hash_key')
      .on(t.organizationId, t.contentHash)
      .where(sql`${t.purgeStartedAt} is null and ${t.restoreBarredAt} is null`),
    index('calls_list_idx')
      .on(t.organizationId, t.createdAt, t.id)
      .where(sql`${t.state} <> 'deleted'`),
    index('calls_state_list_idx').on(t.organizationId, t.state, t.createdAt, t.id),
    index('calls_deal_list_idx')
      .on(t.organizationId, t.dealRecordId, t.createdAt, t.id)
      .where(sql`${t.state} <> 'deleted'`),
    // A Deal's Calls in one state, newest first: the equality columns come before the order.
    index('calls_deal_state_list_idx').on(
      t.organizationId,
      t.dealRecordId,
      t.state,
      t.createdAt,
      t.id
    ),
    index('calls_purge_idx')
      .on(t.organizationId, t.purgeDueAt, t.id)
      .where(
        sql`${t.state} = 'deleted' and ${t.purgeAttempts} < ${sql.raw(String(CALL_PURGE_MAX_ATTEMPTS))}`
      ),
    index('calls_unbarred_idx').on(t.organizationId, t.id).where(sql`${t.restoreBarredAt} is null`),
    index('calls_cleanup_idx')
      .on(t.organizationId, t.deletedAt, t.id)
      .where(sql.raw(CALL_PENDING_CLEANUP_PREDICATE)),
    index('calls_spent_purge_idx')
      .on(t.organizationId, t.id)
      .where(
        sql`${t.state} = 'deleted' and ${t.purgeAttempts} >= ${sql.raw(String(CALL_PURGE_MAX_ATTEMPTS))}`
      ),
    // The re-tag batch of a Deal: its ready Calls, by id.
    index('calls_retag_idx')
      .on(t.organizationId, t.dealRecordId, t.id)
      .where(sql`${t.state} = 'ready'`),
  ]
)

/**
 * A job of one Call: `transcribe` a Recording, `process` (build Moments) a Call whose Rep is
 * known, or `rebuild` them after a Rep pick or change (it carries `rep_seq` and applies only while
 * the Call's stored `rep_seq` equals it). **A sibling of `ingestion_jobs`, not an extension of
 * it:** an ingestion job is keyed to a document and its parse, chunk, embed and index steps, and
 * its columns and checks say so; a Call job has three kinds and no steps, and sharing the table
 * would have made every check conditional on a kind. The lease is the same (`next_attempt_at` is
 * the due time while queued and the lease end while running, `claim_token` fences a worker whose
 * lease lapsed, `attempts` is bounded by the table). One active job per Call
 * (`call_jobs_active_call_key`).
 */
export const callJobs = playbookSchema.table(
  'call_jobs',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    callId: text('call_id').notNull(),
    kind: text('kind', { enum: CALL_JOB_KINDS }).notNull(),
    epoch: integer('epoch').notNull(),
    repSeq: integer('rep_seq').notNull().default(0),
    state: text('state', { enum: CALL_JOB_STATES }).notNull().default('queued'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: ts('next_attempt_at').notNull(),
    claimToken: uuid('claim_token'),
    failureReason: text('failure_reason', { enum: CALL_FAILURE_REASONS }),
    finishedAt: ts('finished_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'call_jobs_pkey', columns: [t.organizationId, t.id] }),
    foreignKey({
      name: 'call_jobs_call_fk',
      columns: [t.organizationId, t.callId],
      foreignColumns: [calls.organizationId, calls.id],
    }).onDelete('cascade'),
    check('call_jobs_id_shape', idShape('id', 'cjob')),
    check('call_jobs_organization_id_shape', idShape('organization_id', 'org')),
    check('call_jobs_organization_not_global', notGlobal),
    check('call_jobs_kind_known', sql`${t.kind} in (${list(CALL_JOB_KINDS)})`),
    check('call_jobs_state_known', sql`${t.state} in (${list(CALL_JOB_STATES)})`),
    check(
      'call_jobs_epoch_seq_bounds',
      sql`${t.epoch} >= 0 and ${t.repSeq} between 0 and ${sql.raw(String(CALL_MAX_SEQ))}`
    ),
    check(
      'call_jobs_attempts_bounds',
      sql`${t.attempts} between 0 and ${sql.raw(String(CALL_JOB_MAX_ATTEMPTS))}`
    ),
    check(
      'call_jobs_running_has_token',
      sql`(${t.state} = 'running') = (${t.claimToken} is not null)`
    ),
    check(
      'call_jobs_failure_reason_known',
      sql`${t.failureReason} in (${list(CALL_FAILURE_REASONS)})`
    ),
    check(
      'call_jobs_failed_has_reason',
      sql`(${t.state} = 'failed') = (${t.failureReason} is not null)`
    ),
    check(
      'call_jobs_final_has_finish',
      sql`(${t.state} in ('succeeded', 'failed', 'cancelled')) = (${t.finishedAt} is not null)`
    ),
    index('call_jobs_call_idx').on(t.organizationId, t.callId),
    uniqueIndex('call_jobs_active_call_key')
      .on(t.organizationId, t.callId)
      .where(sql`${t.state} in ('queued', 'running')`),
    index('call_jobs_due_idx')
      .on(t.organizationId, t.nextAttemptAt)
      .where(sql`${t.state} in ('queued', 'running')`),
  ]
)

/**
 * One send of a Recording to the transcription vendor, keyed by Call and `calls.vendor_send_seq`.
 * {@link CALL_SENT_TO_VENDOR} inserts the row (with no id) in the same write that counts the send;
 * {@link CALL_VENDOR_ID_RECORD} sets `vendor_id` after the vendor accepted, once, and never over
 * another id. A send may never get an id (a crash), so the purge works without one: the row stays and
 * the service finds that copy by its client reference. At most {@link CALL_MAX_VENDOR_SENDS} rows per
 * Call. **The only index on `vendor_id`** is unique, partial (set ids only) and led by the
 * Organization, so no query reaches an id without one: one vendor copy belongs to one send. Rows go with the Call (the purge deletes it; the key cascades).
 */
export const callVendorSends = playbookSchema.table(
  'call_vendor_sends',
  {
    organizationId: text('organization_id').notNull(),
    callId: text('call_id').notNull(),
    seq: integer('seq').notNull(),
    vendorId: text('vendor_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
    recordedAt: ts('recorded_at'),
  },
  (t) => [
    primaryKey({
      name: 'call_vendor_sends_pkey',
      columns: [t.organizationId, t.callId, t.seq],
    }),
    foreignKey({
      name: 'call_vendor_sends_call_fk',
      columns: [t.organizationId, t.callId],
      foreignColumns: [calls.organizationId, calls.id],
    }).onDelete('cascade'),
    check('call_vendor_sends_organization_id_shape', idShape('organization_id', 'org')),
    check('call_vendor_sends_organization_not_global', notGlobal),
    check(
      'call_vendor_sends_seq_bounds',
      sql`${t.seq} between 1 and ${sql.raw(String(CALL_MAX_VENDOR_SENDS))}`
    ),
    check(
      'call_vendor_sends_vendor_id_shape',
      sql.raw(`"vendor_id" is null or "vendor_id" ~ '${CALL_VENDOR_ID_PATTERN}'`)
    ),
    check(
      'call_vendor_sends_recorded_matches',
      sql`(${t.vendorId} is null) = (${t.recordedAt} is null)`
    ),
    uniqueIndex('call_vendor_sends_org_vendor_id_key')
      .on(t.organizationId, t.vendorId)
      .where(sql`${t.vendorId} is not null`),
  ]
)
