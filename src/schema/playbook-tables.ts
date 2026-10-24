import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
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

/**
 * The states a document is in (ADR 0016). `uploaded` is stored and waiting for ingestion,
 * `processing` is being ingested, `ready` is searchable, `failed` ended with a reason, and
 * `deleted` is soft-deleted and awaiting purge. A purged document is a removed row, not a state.
 * Mirrors the contract's list.
 */
export const DOCUMENT_STATES = ['uploaded', 'processing', 'ready', 'failed', 'deleted'] as const
/** Why a document ended in `failed`; the portal shows it. Mirrors the contract's list. */
export const DOCUMENT_FAILURE_REASONS = [
  'too_many_pages',
  'unreadable',
  'password_protected',
  'no_text',
  'processing_failed',
] as const
/** The file types phase 1 accepts, as detected from the content (ADR 0016). */
export const DOCUMENT_FILE_TYPES = ['pdf', 'docx', 'pptx', 'txt', 'md'] as const
/** The largest file the table accepts, in bytes: 25 MiB, the upload limit of ADR 0016. */
export const DOCUMENT_MAX_BYTES = 26_214_400
/** The most pages a stored page count may hold. The 300-page limit is the job's rule, not the table's. */
export const DOCUMENT_MAX_PAGE_COUNT = 100_000
/** The most times a purge may claim one document; claims stop there and a person reconciles. */
export const DOCUMENT_PURGE_MAX_ATTEMPTS = 20
/** The states an ingestion job is in. `queued` and `running` are active; the rest are final. */
export const INGESTION_JOB_STATES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
] as const
/** The steps of an ingestion job, in order; the stored step is the one to run next. */
export const INGESTION_STEPS = ['parse', 'chunk', 'embed', 'index'] as const
/** The most times a job may be claimed: the table's bound. The service gives up below it. */
export const INGESTION_JOB_MAX_ATTEMPTS = 20
/** The most chunks one job may record. */
export const INGESTION_MAX_CHUNKS = 1_000_000
/** The states a consumed message is in (the kit's `ProcessedStore`). */
export const CONSUMED_MESSAGE_STATES = ['claimed', 'done'] as const

const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
})

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
/** The all-zero Organization id is the global scope of consumed messages only (ADR 0016 notes). */
export const GLOBAL_SCOPE_ORGANIZATION_ID = 'org_00000000000000000000000000000000'
const notGlobal = sql.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID}'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })
const createdAt = () => ts('created_at').notNull().defaultNow()
const updatedAt = () => ts('updated_at').notNull().defaultNow()

/**
 * The rows whose vector cleanup is pending: deleted, and the cleanup recorded for an older
 * deletion than the current one (or never). One text, used by `documents_cleanup_idx` (its
 * predicate), the `DOCUMENT_LIST_PENDING_CLEANUP` statement, and, with the alias `d.`, the
 * `cleanup_pending` verification in `playbook.organizations_with_work`, so the three cannot differ.
 */
export const PENDING_CLEANUP_PREDICATE =
  "state = 'deleted' and (vectors_removed_seq is null or vectors_removed_seq < deletion_seq)"

/**
 * A document of an Organization's Playbook: the record of an uploaded file, never its content or
 * its text (the file is in object storage under `object_key`, the chunks in the vector store).
 *
 * Keyed by `(organization_id, id)` so the jobs can hold a composite foreign key. `epoch` is bumped
 * by every soft delete and every restore; vectors are written tagged with the epoch of the job
 * that wrote them, so a cleanup of the deletion at epoch e removes tags up to e and never the
 * vectors of a later restore. `deletion_seq` is bumped by one on every soft delete and is what a
 * queued cleanup carries and the guard compares (`vectors_removed_seq` records the cleanup done).
 * Checks tie every state to its columns: a `failed` document has a reason, a `deleted` one has its
 * deletion and purge-due times, and the purge columns exist only on a deleted document.
 *
 * Content hash: unique per Organization among documents whose purge has not started and that are
 * not barred from restore (`documents_content_hash_key`, partial), so an upload that matches a
 * soft-deleted document finds it, and one that matches a document being purged or erased does not
 * and creates a new one. `restore_barred_at` is set by erasure and by the reset of a spent purge:
 * a barred document never comes back, by either restore.
 *
 * Lists served (keyset, `LIMIT` a page):
 * - Documents not deleted, newest first: `WHERE organization_id = $1 AND state <> 'deleted' AND
 *   (created_at, id) < ($c, $i) ORDER BY created_at DESC, id DESC`, on `documents_list_idx` read
 *   backwards.
 * - One live state, newest first, same keyset: `documents_state_list_idx`.
 * - Deleted documents, newest first, same keyset: `documents_deleted_list_idx`.
 * - By content hash: `documents_content_hash_key`.
 * - Due for purge, and the deleted documents oldest-due first: `documents_purge_idx`.
 * - Quota counts: `organization_usage`, one row, kept by triggers.
 */
export const documents = playbookSchema.table(
  'documents',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    name: text('name').notNull(),
    state: text('state', { enum: DOCUMENT_STATES }).notNull().default('uploaded'),
    contentHash: bytes('content_hash').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    declaredType: text('declared_type').notNull(),
    detectedType: text('detected_type', { enum: DOCUMENT_FILE_TYPES }).notNull(),
    uploadedBy: text('uploaded_by').notNull(),
    objectKey: text('object_key').notNull(),
    failureReason: text('failure_reason', { enum: DOCUMENT_FAILURE_REASONS }),
    // Set by the ingestion job's complete or fail write from the job's own count; null until then.
    pageCount: integer('page_count'),
    epoch: integer('epoch').notNull().default(0),
    deletionSeq: integer('deletion_seq').notNull().default(0),
    vectorsRemovedSeq: integer('vectors_removed_seq'),
    deletedAt: ts('deleted_at'),
    deletedBy: text('deleted_by'),
    purgeDueAt: ts('purge_due_at'),
    purgeStartedAt: ts('purge_started_at'),
    purgeLeaseUntil: ts('purge_lease_until'),
    purgeAttempts: integer('purge_attempts').notNull().default(0),
    restoreBarredAt: ts('restore_barred_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: 'documents_pkey', columns: [t.organizationId, t.id] }),
    check('documents_id_shape', idShape('id', 'doc')),
    check('documents_organization_id_shape', idShape('organization_id', 'org')),
    check('documents_organization_not_global', notGlobal),
    check('documents_uploaded_by_shape', idShape('uploaded_by', 'usr')),
    check('documents_deleted_by_shape', sql`${t.deletedBy} ~ '^usr_[0-9a-f]{32}$'`),
    check('documents_name_shape', sql`char_length(btrim(${t.name})) between 1 and 255`),
    check('documents_state_known', sql`${t.state} in (${list(DOCUMENT_STATES)})`),
    check('documents_content_hash_length', sql`octet_length(${t.contentHash}) = 32`),
    check(
      'documents_size_bounds',
      sql`${t.sizeBytes} between 1 and ${sql.raw(String(DOCUMENT_MAX_BYTES))}`
    ),
    check(
      'documents_declared_type_shape',
      sql`char_length(${t.declaredType}) between 1 and 255 and ${t.declaredType} collate "C" ~ '^[ -~]+$'`
    ),
    check(
      'documents_detected_type_known',
      sql`${t.detectedType} in (${list(DOCUMENT_FILE_TYPES)})`
    ),
    check(
      'documents_object_key_shape',
      sql`char_length(${t.objectKey}) between 1 and 1024 and ${t.objectKey} collate "C" ~ '^[!-~]+$'`
    ),
    check(
      'documents_failure_reason_known',
      sql`${t.failureReason} in (${list(DOCUMENT_FAILURE_REASONS)})`
    ),
    check(
      'documents_failed_has_reason',
      sql`(${t.state} = 'failed') = (${t.failureReason} is not null)`
    ),
    check('documents_page_count_positive', sql`${t.pageCount} > 0`),
    check('documents_epoch_bounds', sql`${t.epoch} >= 0 and ${t.deletionSeq} >= 0`),
    check(
      'documents_vectors_removed_seq_bounds',
      sql`${t.vectorsRemovedSeq} between 0 and ${t.deletionSeq}`
    ),
    check(
      'documents_deleted_has_times',
      sql`(${t.state} = 'deleted') = (${t.deletedAt} is not null)
        and (${t.state} = 'deleted') = (${t.purgeDueAt} is not null)`
    ),
    check(
      'documents_deleted_by_when_deleted',
      sql`${t.state} = 'deleted' or ${t.deletedBy} is null`
    ),
    check('documents_deleted_is_counted', sql`(${t.state} <> 'deleted') or ${t.deletionSeq} >= 1`),
    check('documents_purge_due_after_delete', sql`${t.purgeDueAt} >= ${t.deletedAt}`),
    check(
      'documents_purge_only_when_deleted',
      sql`(${t.purgeStartedAt} is null or ${t.state} = 'deleted')
        and (${t.purgeStartedAt} is null) = (${t.purgeLeaseUntil} is null)
        and (${t.purgeStartedAt} is null) = (${t.purgeAttempts} = 0)`
    ),
    check(
      'documents_purge_attempts_bounds',
      sql`${t.purgeAttempts} between 0 and ${sql.raw(String(DOCUMENT_PURGE_MAX_ATTEMPTS))}`
    ),
    check(
      'documents_barred_only_when_deleted',
      sql`${t.restoreBarredAt} is null or ${t.state} = 'deleted'`
    ),
    uniqueIndex('documents_content_hash_key')
      .on(t.organizationId, t.contentHash)
      .where(sql`${t.purgeStartedAt} is null and ${t.restoreBarredAt} is null`),
    index('documents_list_idx')
      .on(t.organizationId, t.createdAt, t.id)
      .where(sql`${t.state} <> 'deleted'`),
    // A list filtered to one live state, newest first: equality on the state, then the keyset, so
    // the scan never passes a row of another state (the unfiltered live list uses documents_list_idx).
    index('documents_state_list_idx')
      .on(t.organizationId, t.state, t.createdAt, t.id)
      .where(sql`${t.state} <> 'deleted'`),
    // The deleted list, newest first: the same keyset as the live list, for the deleted documents.
    index('documents_deleted_list_idx')
      .on(t.organizationId, t.createdAt, t.id)
      .where(sql`${t.state} = 'deleted'`),
    index('documents_purge_idx')
      .on(t.organizationId, t.purgeDueAt, t.id)
      .where(
        sql`${t.state} = 'deleted' and ${t.purgeAttempts} < ${sql.raw(String(DOCUMENT_PURGE_MAX_ATTEMPTS))}`
      ),
    // The erase batch walks the documents not yet barred from restore, in id order.
    index('documents_unbarred_idx')
      .on(t.organizationId, t.id)
      .where(sql`${t.restoreBarredAt} is null`),
    // Deleted documents whose vector cleanup is not recorded for the current deletion
    // ({@link PENDING_CLEANUP_PREDICATE}), by deletion time then id: the pending-cleanup list's keyset
    // and the discovery kind's first entry of an Organization.
    index('documents_cleanup_idx')
      .on(t.organizationId, t.deletedAt, t.id)
      .where(sql.raw(PENDING_CLEANUP_PREDICATE)),
    // Documents whose purge reached the attempt bound, for a person to list and reset.
    index('documents_spent_purge_idx')
      .on(t.organizationId, t.id)
      .where(
        sql`${t.state} = 'deleted' and ${t.purgeAttempts} >= ${sql.raw(String(DOCUMENT_PURGE_MAX_ATTEMPTS))}`
      ),
  ]
)

/**
 * An Organization's document and byte counts, soft-deleted documents included, so a quota check
 * reads one row. Written only by the `documents` triggers (SECURITY DEFINER), in the statement's
 * own transaction, so it cannot drift from the table; the service role can only read it. A row
 * stays, at zero, once an Organization has had a document.
 */
export const organizationUsage = playbookSchema.table(
  'organization_usage',
  {
    organizationId: text('organization_id').primaryKey(),
    documentCount: bigint('document_count', { mode: 'number' }).notNull().default(0),
    byteCount: bigint('byte_count', { mode: 'number' }).notNull().default(0),
    // Deals of the Organization, moved by the `deals` triggers (migration 0015).
    dealCount: bigint('deal_count', { mode: 'number' }).notNull().default(0),
    // Calls of the Organization, soft-deleted and awaiting-Rep ones included until purged (migration 0016).
    callCount: bigint('call_count', { mode: 'number' }).notNull().default(0),
    // Bytes of its Recordings (not Transcripts), counted the same way.
    recordingByteCount: bigint('recording_byte_count', { mode: 'number' }).notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('organization_usage_organization_id_shape', idShape('organization_id', 'org')),
    check('organization_usage_organization_not_global', notGlobal),
    check('organization_usage_not_negative', sql`${t.documentCount} >= 0 and ${t.byteCount} >= 0`),
    check('organization_usage_deal_count_not_negative', sql`${t.dealCount} >= 0`),
    check(
      'organization_usage_call_counts_not_negative',
      sql`${t.callCount} >= 0 and ${t.recordingByteCount} >= 0`
    ),
  ]
)

/**
 * An ingestion job of one document: parse, chunk, embed, index. It is resumable and holds only
 * what resuming needs: the next `step`, `attempts`, counts, and the object key of the parsed
 * intermediate; no text. `next_attempt_at` is the due time while queued and the end of the lease
 * while running, as in auth's abandon cases; `claim_token` fences a worker whose lease lapsed.
 * `attempts` is bounded by the table ({@link INGESTION_JOB_MAX_ATTEMPTS}); a claim never takes a
 * spent job and the give-up statement fails it. One active job per document
 * (`ingestion_jobs_active_document_key`).
 */
export const ingestionJobs = playbookSchema.table(
  'ingestion_jobs',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    documentId: text('document_id').notNull(),
    epoch: integer('epoch').notNull(),
    state: text('state', { enum: INGESTION_JOB_STATES }).notNull().default('queued'),
    step: text('step', { enum: INGESTION_STEPS }).notNull().default('parse'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: ts('next_attempt_at').notNull(),
    claimToken: uuid('claim_token'),
    artifactKey: text('artifact_key'),
    pageCount: integer('page_count'),
    chunkCount: integer('chunk_count'),
    chunksDone: integer('chunks_done').notNull().default(0),
    failureReason: text('failure_reason', { enum: DOCUMENT_FAILURE_REASONS }),
    finishedAt: ts('finished_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: 'ingestion_jobs_pkey', columns: [t.organizationId, t.id] }),
    foreignKey({
      name: 'ingestion_jobs_document_fk',
      columns: [t.organizationId, t.documentId],
      foreignColumns: [documents.organizationId, documents.id],
    }).onDelete('cascade'),
    check('ingestion_jobs_id_shape', idShape('id', 'job')),
    check('ingestion_jobs_organization_id_shape', idShape('organization_id', 'org')),
    check('ingestion_jobs_organization_not_global', notGlobal),
    check('ingestion_jobs_epoch_bounds', sql`${t.epoch} >= 0`),
    check('ingestion_jobs_state_known', sql`${t.state} in (${list(INGESTION_JOB_STATES)})`),
    check('ingestion_jobs_step_known', sql`${t.step} in (${list(INGESTION_STEPS)})`),
    check(
      'ingestion_jobs_attempts_bounds',
      sql`${t.attempts} between 0 and ${sql.raw(String(INGESTION_JOB_MAX_ATTEMPTS))}`
    ),
    check(
      'ingestion_jobs_running_has_token',
      sql`(${t.state} = 'running') = (${t.claimToken} is not null)`
    ),
    check(
      'ingestion_jobs_artifact_key_shape',
      sql`char_length(${t.artifactKey}) between 1 and 1024 and ${t.artifactKey} collate "C" ~ '^[!-~]+$'`
    ),
    check(
      'ingestion_jobs_counts_bounds',
      sql`${t.pageCount} between 1 and ${sql.raw(String(DOCUMENT_MAX_PAGE_COUNT))}
        and ${t.chunkCount} between 0 and ${sql.raw(String(INGESTION_MAX_CHUNKS))}
        and ${t.chunksDone} >= 0 and ${t.chunksDone} <= coalesce(${t.chunkCount}, 0)`
    ),
    check(
      'ingestion_jobs_failure_reason_known',
      sql`${t.failureReason} in (${list(DOCUMENT_FAILURE_REASONS)})`
    ),
    check(
      'ingestion_jobs_failed_has_reason',
      sql`(${t.state} = 'failed') = (${t.failureReason} is not null)`
    ),
    check(
      'ingestion_jobs_final_has_finish',
      sql`(${t.state} in ('succeeded', 'failed', 'cancelled')) = (${t.finishedAt} is not null)`
    ),
    // The job lookup of a document (and the foreign key's cascade); final jobs are in it too.
    index('ingestion_jobs_document_idx').on(t.organizationId, t.documentId),
    uniqueIndex('ingestion_jobs_active_document_key')
      .on(t.organizationId, t.documentId)
      .where(sql`${t.state} in ('queued', 'running')`),
    // The claim: active jobs that are due, oldest first. Spent jobs are in it so the give-up finds them.
    index('ingestion_jobs_due_idx')
      .on(t.organizationId, t.nextAttemptAt)
      .where(sql`${t.state} in ('queued', 'running')`),
  ]
)

/**
 * An Organization's index settings: the embedding model and output dimension its vectors use
 * (ADR 0010). Once `vectors_written_at` is set a trigger refuses any change of either, and the
 * service role cannot delete the row: changing the model is a deliberate re-index, done by an
 * operator, not a statement. Choice: refuse, rather than record that a re-index is needed.
 *
 * `learn_from_agent_moments` is the Organization's switch for indexing Moments of its Agents' own
 * Calls (default on). It may change at any time, vectors or not; a missing row means the default.
 */
export const indexSettings = playbookSchema.table(
  'index_settings',
  {
    organizationId: text('organization_id').primaryKey(),
    embeddingModel: text('embedding_model').notNull(),
    embeddingDimension: integer('embedding_dimension').notNull(),
    vectorsWrittenAt: ts('vectors_written_at'),
    learnFromAgentMoments: boolean('learn_from_agent_moments').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('index_settings_organization_id_shape', idShape('organization_id', 'org')),
    check('index_settings_organization_not_global', notGlobal),
    check(
      'index_settings_model_shape',
      sql`char_length(${t.embeddingModel}) between 1 and 200 and ${t.embeddingModel} collate "C" ~ '^[A-Za-z0-9._:/-]+$'`
    ),
    check('index_settings_dimension_bounds', sql`${t.embeddingDimension} between 1 and 16384`),
  ]
)
