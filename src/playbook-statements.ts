import { CALL_STATEMENTS } from './playbook-call-statements'
import {
  BATCH,
  CLAMP,
  DOCUMENT_LIST_MAX_PAGE,
  DOCUMENT_MIN_RETENTION_MS,
  IDEMPOTENCY_MIN_PURGE_AGE_MS,
  IDEMPOTENCY_PURGE_AGE_MS,
  INGESTION_MAX_RETRY_DELAY_MS,
  LEASE,
  MAX_DOCUMENT_SEARCH_STATE_IDS,
  ORPHAN_SWEEP_AGE_MS,
  PLAYBOOK_MAX_BATCH,
  PLAYBOOK_MIN_LEASE_MS,
} from './playbook-sql'
import {
  DEAL_IMPORT_APPLY_BATCH,
  DEAL_IMPORT_MAX_ATTEMPTS,
  DEAL_IMPORT_MAX_ROWS,
  MAX_QUEUED_DEAL_IMPORTS,
} from './schema/playbook-sales-history'
import {
  DOCUMENT_PURGE_MAX_ATTEMPTS,
  INGESTION_JOB_MAX_ATTEMPTS,
  INGESTION_STEPS,
  PENDING_CLEANUP_PREDICATE,
} from './schema/playbook-tables'

export {
  DOCUMENT_LIST_MAX_PAGE,
  DOCUMENT_MIN_RETENTION_MS,
  IDEMPOTENCY_MIN_PURGE_AGE_MS,
  IDEMPOTENCY_PURGE_AGE_MS,
  INGESTION_MAX_RETRY_DELAY_MS,
  MAX_DOCUMENT_SEARCH_STATE_IDS,
  ORPHAN_SWEEP_AGE_MS,
  PLAYBOOK_MAX_BATCH,
  PLAYBOOK_MIN_LEASE_MS,
} from './playbook-sql'

const STEP_ORDER = `array[${INGESTION_STEPS.map((step) => `'${step}'`).join(', ')}]`

/**
 * The SQL the playbook service runs against its tables, as text, in the style of the auth
 * statements: the integration tests run exactly these strings, the README prints exactly these
 * strings (a unit test fails when they differ), and every time is `clock_timestamp()` evaluated
 * by the database, so the services pass durations, never points in time. The one exception is
 * {@link CONSUMED_PURGE}, whose `before` is the kit's `ProcessedStore.purge` argument.
 *
 * Every statement runs inside `withOrganization` for the Organization in `$1` (or `$2` for the
 * consumed-message ones), and names that Organization in its own `where` as well, so a statement
 * given another Organization's id finds nothing even before row-level security. The strings are
 * plain text, not type-checked against the schema: the integration suite is their only guard.
 *
 * **Lock order is job, then document.** Statements that touch both lock the job row first
 * ({@link DOCUMENT_SOFT_DELETE} forces this with a data dependency), so a delete racing a job
 * statement queues rather than deadlocks. A deadlock (SQLSTATE 40P01) is still possible in
 * theory; callers retry it with a bounded, jittered retry.
 *
 * Every batch size and page size is clamped in SQL (to {@link PLAYBOOK_MAX_BATCH} or
 * {@link DOCUMENT_LIST_MAX_PAGE}, and to at least 1, null included).
 *
 * All statements assume READ COMMITTED, the default: several of them rely on Postgres
 * re-checking the `where` against the newest row version once a lock is granted.
 */

/**
 * Take the Organization's upload lock for the transaction: run it first in a transaction that
 * inserts a document, so two uploads of one Organization queue and the quota check in
 * {@link DOCUMENT_INSERT} (a later statement, with its own snapshot) sees the earlier upload's
 * counts. `$1` Organization. Always returns one row; the lock ends with the transaction.
 *
 * **Order matters:** every upload transaction must insert its idempotency key
 * ({@link IDEMPOTENCY_BEGIN}) *before* it takes this lock. The key insert takes the orphan-sweep
 * hint; erasure, `ORPHAN_SWEEP_DONE` and uploads cannot wait on each other in a cycle only while
 * uploads go hint first, then this lock.
 */
export const QUOTA_LOCK = `select pg_advisory_xact_lock(hashtextextended($1::text, 0)) is not null as locked`

/**
 * The Organization's document and byte counts, soft-deleted documents included, from the counter
 * row the `documents` triggers keep: one primary-key read, whatever the Organization's size. No
 * row means no document has ever been added: both are zero. `$1` Organization. node-postgres
 * returns the two bigints as strings.
 */
export const QUOTA_USAGE = `select document_count, byte_count
from playbook.organization_usage
where organization_id = $1`

/**
 * Add a document and queue its ingestion in one write, after {@link QUOTA_LOCK}. `$1` Organization,
 * `$2` document id, `$3` name, `$4` SHA-256 of the content (32 bytes), `$5` size in bytes, `$6`
 * declared type, `$7` detected type, `$8` uploader, `$9` object key, `$10` job id, `$11` the most
 * documents and `$12` the most bytes the Organization may hold after this one (the quota, from
 * configuration). A row back means the document exists as `uploaded` with a queued job. No row
 * means a quota would be passed, or a document with that content hash whose purge has not
 * started exists (the hash is unique among those): read {@link DOCUMENT_BY_HASH}; a row there is
 * the duplicate (restore it if `deleted`, {@link DOCUMENT_REQUEUE} it if `failed`), none means the quota.
 * A document whose purge has started, or that erasure has barred from restore, does not block a
 * new one with the same content.
 */
export const DOCUMENT_INSERT = `with ins as (
  insert into playbook.documents
    (id, organization_id, name, content_hash, size_bytes, declared_type, detected_type, uploaded_by, object_key)
  select $2::text, $1::text, $3::text, $4::bytea, $5::bigint, $6::text, $7::text, $8::text, $9::text
  where coalesce((select document_count from playbook.organization_usage where organization_id = $1), 0) < $11::bigint
    and coalesce((select byte_count from playbook.organization_usage where organization_id = $1), 0) + $5::bigint <= $12::bigint
  on conflict (organization_id, content_hash) where purge_started_at is null and restore_barred_at is null do nothing
  returning id, organization_id, epoch),
queued as (
  insert into playbook.ingestion_jobs (id, organization_id, document_id, epoch, next_attempt_at)
  select $10::text, organization_id, id, epoch, clock_timestamp() from ins)
select id, epoch from ins`

/**
 * Find the document an upload duplicates: the one with that content hash in the Organization
 * whose purge has not started and that is not barred from restore, in any state. `$1` Organization,
 * `$2` content hash.
 */
export const DOCUMENT_BY_HASH = `select id, state, epoch, deletion_seq
from playbook.documents
where organization_id = $1 and content_hash = $2::bytea and purge_started_at is null and restore_barred_at is null`

/**
 * The public columns of a document, in the order every document read returns them:
 * {@link DOCUMENT_GET}, {@link DOCUMENT_LIST}, {@link DOCUMENT_LIST_DELETED} and
 * {@link DOCUMENT_LIST_FILTERED} select exactly these plus `not_restorable`, so a listed row is
 * never read a second time and the reads cannot drift apart.
 */
export const DOCUMENT_ROW_FIELDS = [
  'id',
  'name',
  'state',
  'size_bytes',
  'declared_type',
  'detected_type',
  'uploaded_by',
  'failure_reason',
  'epoch',
  'deletion_seq',
  'deleted_at',
  'deleted_by',
  'purge_due_at',
  'purge_started_at',
  'page_count',
  'created_at',
  'updated_at',
  'not_restorable',
] as const

/** One row of {@link DOCUMENT_GET} or of any document list; times are the database's own values. */
export interface DocumentRow {
  id: string
  name: string
  state: 'uploaded' | 'processing' | 'ready' | 'failed' | 'deleted'
  size_bytes: number | string
  declared_type: string
  detected_type: string
  uploaded_by: string
  failure_reason: string | null
  epoch: number
  deletion_seq: number
  deleted_at: Date | null
  deleted_by: string | null
  purge_due_at: Date | null
  purge_started_at: Date | null
  page_count: number | null
  created_at: Date
  updated_at: Date
  not_restorable: boolean
}

const NOT_RESTORABLE = `(state = 'deleted' and (purge_due_at <= clock_timestamp() or purge_started_at is not null or restore_barred_at is not null)) as not_restorable`

const DOCUMENT_COLUMNS = `${DOCUMENT_ROW_FIELDS.filter((f) => f !== 'not_restorable').join(', ')},
  ${NOT_RESTORABLE}`

/**
 * One page of the Organization's documents that are not deleted, newest first. `$1` Organization,
 * `$2` and `$3` the cursor, the `created_at` and `id` of the last row of the previous page (pass
 * `'infinity'` and `''` for the first page), `$4` the page size, cut to {@link DOCUMENT_LIST_MAX_PAGE}.
 * Served by `documents_list_idx`, read backwards, with no sort. Carry the cursor as the database's
 * own text form of `created_at` (`created_at::text`), not a JavaScript Date, which drops the
 * microseconds and would skip rows created within the same millisecond. Rows carry every column
 * of {@link DOCUMENT_ROW_FIELDS}, as {@link DOCUMENT_GET} does.
 */
export const DOCUMENT_LIST = `select ${DOCUMENT_COLUMNS}
from playbook.documents
where organization_id = $1 and state <> 'deleted'
  and (created_at, id) < ($2::timestamptz, $3::text)
order by created_at desc, id desc
limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)}`

/**
 * One page of the Organization's soft-deleted documents, newest first by `created_at` then `id`,
 * the same keyset and cursor rules as {@link DOCUMENT_LIST}, with the deletion fields. `$1`
 * Organization, `$2` and `$3` the cursor (`'infinity'` and `''` for the first page), `$4` the page
 * size, clamped to 1..{@link DOCUMENT_LIST_MAX_PAGE}, null included. Served by
 * `documents_deleted_list_idx`, read backwards, with no sort. Rows carry every column of
 * {@link DOCUMENT_ROW_FIELDS}, including the database-computed `not_restorable`.
 */
export const DOCUMENT_LIST_DELETED = `select ${DOCUMENT_COLUMNS}
from playbook.documents
where organization_id = $1 and state = 'deleted'
  and (created_at, id) < ($2::timestamptz, $3::text)
order by created_at desc, id desc
limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)}`

/**
 * One page of the Organization's documents with an optional state filter, in one call: `$1`
 * Organization, `$2` and `$3` the cursor (`'infinity'` and `''` for the first page), `$4` the page
 * size (clamped to 1..{@link DOCUMENT_LIST_MAX_PAGE}), `$5` the state or null. Null lists every
 * document that is not deleted, as {@link DOCUMENT_LIST}; `uploaded`, `processing`, `ready` and
 * `failed` list that state; `deleted` lists the deleted documents, as {@link DOCUMENT_LIST_DELETED};
 * any other value lists nothing. Newest first by `created_at` then `id`, the same keyset and cursor
 * rules as {@link DOCUMENT_LIST}, every row with all of {@link DOCUMENT_ROW_FIELDS}. Each value is
 * served by one index read backwards with no sort and no pass over other states' rows: null by
 * `documents_list_idx`, a live state by `documents_state_list_idx` (equality on the state, then the
 * keyset), `deleted` by `documents_deleted_list_idx`. The three branches are guarded by `$5`, so
 * only the matching one runs. The state branch repeats the literal `state <> 'deleted'` of the partial
 * index's predicate: under a generic plan `state = $5` alone does not prove it, and the index would
 * be unusable.
 */
export const DOCUMENT_LIST_FILTERED = `select * from (
  (select ${DOCUMENT_COLUMNS} from playbook.documents
   where $5::text is null and organization_id = $1 and state <> 'deleted'
     and (created_at, id) < ($2::timestamptz, $3::text)
   order by created_at desc, id desc limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)})
  union all
  (select ${DOCUMENT_COLUMNS} from playbook.documents
   where $5::text in ('uploaded', 'processing', 'ready', 'failed') and organization_id = $1 and state = $5::text and state <> 'deleted'
     and (created_at, id) < ($2::timestamptz, $3::text)
   order by created_at desc, id desc limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)})
  union all
  (select ${DOCUMENT_COLUMNS} from playbook.documents
   where $5::text = 'deleted' and organization_id = $1 and state = 'deleted'
     and (created_at, id) < ($2::timestamptz, $3::text)
   order by created_at desc, id desc limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)})
) page
order by created_at desc, id desc
limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)}`

/**
 * One document by id with everything the service answers and publishes with: every column of
 * {@link DOCUMENT_ROW_FIELDS} (the public columns, `failure_reason`, `page_count`, `epoch`,
 * `deletion_seq`, `deleted_at`, `deleted_by`, `purge_due_at` and `purge_started_at`). `$1`
 * Organization, `$2` document. No row means no such document (never
 * existed, or purged). `not_restorable` is computed by the database clock, so the service never
 * compares the purge time with its own: it is true for a `deleted` document whose `purge_due_at`
 * has passed, whose purge has started or that erasure barred from restore. It agrees with {@link DOCUMENT_RESTORE}: when the explicit
 * restore returns no row and this read shows `state = 'deleted'`, the answer is 410
 * `not_restorable`; no row from this read is 404. (The two reads are separate statements, so a
 * document due between them can show `not_restorable` false right after a refused restore: ask
 * again.)
 */
export const DOCUMENT_GET = `select ${DOCUMENT_COLUMNS}
from playbook.documents
where organization_id = $1 and id = $2`

/**
 * What Postgres says about the documents a search hit (hub #98): `$1` Organization, `$2` an array of
 * document ids. One row per id that is a document of that Organization, in id order: `id`, `name`,
 * `state` and `epoch`, read as {@link DOCUMENT_GET} reads them. The playbook drops a hit unless
 * `state = 'ready'` and `epoch` equals the vector's epoch, so a deleted or replaced (older epoch)
 * document is dropped. Another Organization's ids, unknown ids, an empty array and a null array give
 * no row. **The statement reads at most {@link MAX_DOCUMENT_SEARCH_STATE_IDS} ids**: it takes the first
 * 100 and does not refuse the rest (a plain statement cannot raise), so the caller must pass at most
 * 100. Served by `documents_pkey (organization_id, id)`. Metadata only, no text.
 */
export const DOCUMENT_SEARCH_STATE = `select id, name, state, epoch
from playbook.documents
where organization_id = $1 and id = any(($2::text[])[1:${MAX_DOCUMENT_SEARCH_STATE_IDS}])
order by id`

/**
 * Soft delete: hide the document at once and set when it may be purged, in one write. `$1`
 * Organization, `$2` document, `$3` who deleted it, `$4` the retention in milliseconds, raised to
 * {@link DOCUMENT_MIN_RETENTION_MS}. The purge-due time is the database clock plus the retention.
 * The same statement cancels the document's queued or running job (a running job's lease end is
 * kept as a fence: {@link DOCUMENT_CLEANUP_BEGIN} waits for it), bumps `epoch` and bumps
 * `deletion_seq` by one; the returned `deletion_seq` is what the vector cleanup job is queued
 * with. `changed` is true when this call deleted it. Deleting an already deleted document is
 * idempotent: it returns the existing `deletion_seq` and `purge_due_at` with `changed` false and
 * writes nothing. No row means no such document, or this call lost a race with another delete
 * (its snapshot predates the other's commit): run it once more. The row carries `state`
 * (`deleted`), `deletion_seq` (publish the cleanup message with it) and `purge_due_at`. Against {@link DOCUMENT_RESTORE}
 * and {@link DOCUMENT_PURGE_CLAIM} the row lock decides: whichever takes it first wins and the
 * other re-reads the new row; a purge never claims a document that this has not yet deleted.
 *
 * It cancels the jobs it can see; a job a concurrent restore or requeue commits after this
 * statement's snapshot is cancelled by {@link INGESTION_JOB_CLAIM}, which takes only jobs of a
 * live document at the job's epoch.
 */
export const DOCUMENT_SOFT_DELETE = `with j as (
  update playbook.ingestion_jobs
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp(),
      next_attempt_at = case when state = 'running' then next_attempt_at else clock_timestamp() end
  where organization_id = $1 and document_id = $2 and state in ('queued', 'running')
  returning id),
d as (
  update playbook.documents
  set state = 'deleted', epoch = epoch + 1, deletion_seq = deletion_seq + 1,
      deleted_at = clock_timestamp(), deleted_by = $3,
      purge_due_at = clock_timestamp() + make_interval(secs => greatest(coalesce($4::float8, 0), ${DOCUMENT_MIN_RETENTION_MS}) / 1000),
      failure_reason = null, updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and state <> 'deleted' and (select count(*) from j) >= 0
  returning id, state, deletion_seq, purge_due_at)
select id, state, deletion_seq, purge_due_at, true as changed from d
union all
select id, state, deletion_seq, purge_due_at, false from playbook.documents
where organization_id = $1 and id = $2 and state = 'deleted' and not exists (select 1 from d)`

// The restore, with or without the check that its purge time has not passed. Jobs first, then the
// document (the delete's order); the document update depends on the job update so it runs after it.
const RESTORE = (dueGuard: string) => `with j as (
  update playbook.ingestion_jobs
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and document_id = $2 and state in ('queued', 'running')
    and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = $2 and x.state = 'deleted')
  returning id),
d as (
  update playbook.documents
  set state = 'processing', epoch = epoch + 1, deleted_at = null, deleted_by = null,
      purge_due_at = null, updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is null and restore_barred_at is null${dueGuard}
    and (select count(*) from j) >= 0
  returning organization_id, id, epoch, deletion_seq),
queued as (
  insert into playbook.ingestion_jobs (id, organization_id, document_id, epoch, next_attempt_at)
  select $3::text, organization_id, id, epoch, clock_timestamp() from d)
select id, 'processing' as state, epoch, deletion_seq, true as changed from d
union all
select id, state, epoch, deletion_seq, false from playbook.documents
where organization_id = $1 and id = $2 and state <> 'deleted' and not exists (select 1 from d)`

/**
 * The explicit restore: restore a soft-deleted document and queue its re-ingestion from the kept
 * file, in one write: it becomes `processing` with a new queued job, and `purge_due_at` and the
 * deletion fields are cleared (the purge time is reset, as for any restore). `$1` Organization,
 * `$2` document, `$3` the new job's id. It succeeds only for a `deleted` document whose purge time
 * has not passed (`purge_due_at > clock_timestamp()`) and whose purge has not started: the
 * contract answers 410 `not_restorable` after the purge time, so this refuses it even while the
 * purge has not claimed the document (no row, nothing changed; read {@link DOCUMENT_GET} to tell
 * `not_restorable` from `not_found`). A matching upload restores a past-due document with
 * {@link DOCUMENT_RESTORE_FOR_UPLOAD} instead. Any job still queued or running for the deleted
 * document is cancelled first, so a stale job cannot block the new one. `changed` is true
 * when this call restored it. Restoring a document that is not deleted is idempotent: it returns
 * its current state with `changed` false. No row means the document is gone, its purge has
 * started (a restore after the purge's claim is refused because the file is going or gone), or
 * the call lost a race with another restore (its snapshot predates the other's commit): read the
 * document to tell, which is what the service does.
 *
 * **Against the purge.** {@link DOCUMENT_PURGE_CLAIM} and this statement both lock the row. If the
 * restore takes it first, the claim skips the locked row, and once the restore commits the claim
 * no longer sees a deleted document: the restore wins. If the claim takes it first, this waits,
 * then re-checks `purge_started_at is null` on the claimed row, finds it set and returns no row:
 * the purge wins. The state is never both.
 */
export const DOCUMENT_RESTORE = RESTORE('\n    and purge_due_at > clock_timestamp()')

/**
 * The restore for an upload that matches a deleted document: as {@link DOCUMENT_RESTORE} but
 * without the purge-time check, so it restores a past-due document the purge has not claimed (the
 * uploader has just supplied the content again, and the content-hash index would otherwise block
 * a new document until the purge). It still refuses once the purge has started, and it resets the
 * purge time. Same parameters and result.
 */
export const DOCUMENT_RESTORE_FOR_UPLOAD = RESTORE('')

/**
 * Re-queue a `failed` document when a matching upload arrives: it goes back to `uploaded` with a
 * new queued job. `$1` Organization, `$2` document, `$3` the new job's id. `changed` is true when
 * this call re-queued it; a document already `uploaded`, `processing` or `ready` is returned with
 * `changed` false and nothing written (idempotent by end state). A `deleted` document gives no
 * row: restore it instead. A job left queued or running on the failed document is cancelled first,
 * as in {@link DOCUMENT_RESTORE}.
 */
export const DOCUMENT_REQUEUE = `with j as (
  update playbook.ingestion_jobs
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and document_id = $2 and state in ('queued', 'running')
    and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = $2 and x.state = 'failed')
  returning id),
d as (
  update playbook.documents
  set state = 'uploaded', failure_reason = null, updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and state = 'failed' and (select count(*) from j) >= 0
  returning organization_id, id, epoch, deletion_seq),
queued as (
  insert into playbook.ingestion_jobs (id, organization_id, document_id, epoch, next_attempt_at)
  select $3::text, organization_id, id, epoch, clock_timestamp() from d)
select id, 'uploaded' as state, epoch, deletion_seq, true as changed from d
union all
select id, state, epoch, deletion_seq, false from playbook.documents
where organization_id = $1 and id = $2 and state in ('uploaded', 'processing', 'ready') and not exists (select 1 from d)`

/**
 * Begin the vector cleanup queued for one deletion. `$1` Organization, `$2` document, `$3` the
 * `deletion_seq` the job was queued with (returned by {@link DOCUMENT_SOFT_DELETE}). A row back
 * means the cleanup still applies: the document is deleted and that deletion is the current one.
 * No row means it does not (the document was restored, deleted again under a later sequence, or
 * purged): do nothing. The row carries `epoch`: remove the vectors tagged with an epoch up to it
 * and no later one, so vectors written by a restore are never touched. `clear` is false while a
 * worker may still hold a lease on the document: a cancelled job's kept lease end, or a `running`
 * job whose lease has not ended (a claim can race a delete and leave a job running on the deleted
 * document; its heartbeat is refused, so its lease ends). Wait and run this again. The check is a
 * read; {@link DOCUMENT_CLEANUP_DONE} is what is guarded again at the end.
 */
export const DOCUMENT_CLEANUP_BEGIN = `select d.id, d.epoch,
  not exists (
    select 1 from playbook.ingestion_jobs j
    where j.organization_id = d.organization_id and j.document_id = d.id
      and j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp()) as clear
from playbook.documents d
where d.organization_id = $1 and d.id = $2 and d.state = 'deleted' and d.deletion_seq = $3::int`

/**
 * One page of the Organization's deleted documents whose vector cleanup is pending: not recorded
 * for the current `deletion_seq` ({@link DOCUMENT_CLEANUP_DONE} records it) and not yet purged (a
 * purged document is a removed row). Oldest deletion first by `deleted_at` then `id`, so a pass
 * visits each once. `$1` Organization, `$2` and `$3` the cursor, the `deleted_at` (as the database's
 * text form, `deleted_at::text`) and `id` of the last row of the previous page (`'-infinity'` and
 * `''` for the first page), `$4` the page size, clamped to 1..{@link PLAYBOOK_MAX_BATCH}, null
 * included. Rows carry `id`, `epoch`, `deletion_seq` (what {@link DOCUMENT_CLEANUP_BEGIN} needs)
 * and `deleted_at` (the cursor, and for the service's own settle delay). The predicate is
 * {@link PENDING_CLEANUP_PREDICATE}, the one `documents_cleanup_idx` is built on and the
 * `cleanup_pending` discovery verification uses; the index (Organization, `deleted_at`, `id`) serves
 * the page in order with no sort, under a generic plan too.
 */
export const DOCUMENT_LIST_PENDING_CLEANUP = `select id, epoch, deletion_seq, deleted_at
from playbook.documents
where organization_id = $1 and ${PENDING_CLEANUP_PREDICATE}
  and (deleted_at, id) > ($2::timestamptz, $3::text)
order by deleted_at, id
limit ${BATCH('$4')}`

/**
 * Record that the cleanup of one deletion finished. `$1` Organization, `$2` document, `$3` the
 * `deletion_seq`. It applies only to that deletion: a row back means it was recorded (repeating it
 * is idempotent); no row means the document was restored or deleted again since, and the cleanup
 * is moot. {@link DOCUMENT_PURGE_COMPLETE} refuses a document until its current deletion's
 * cleanup is recorded here.
 */
export const DOCUMENT_CLEANUP_DONE = `update playbook.documents
set vectors_removed_seq = $3::int, updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and state = 'deleted' and deletion_seq = $3::int
returning id`

/**
 * Claim a batch of documents due for purge as a lease, in a short transaction that commits at
 * once; the file and vectors are removed outside any transaction. `$1` Organization, `$2` batch
 * size, `$3` the lease in milliseconds (raised to {@link PLAYBOOK_MIN_LEASE_MS}; it must exceed
 * the worker's time to remove one file). A document is due when it is `deleted`, its purge-due
 * time has passed, no lease is live, and fewer than ${DOCUMENT_PURGE_MAX_ATTEMPTS} claims have
 * been made: a spent document is never claimed (the count would pass the table's bound and abort
 * the statement, wedging the batch) and drops out of the due index; it stays `deleted` and a person
 * reconciles. Claiming sets `purge_started_at` once, which ends restores for good, and counts the
 * attempt. A crash leaves the document due again when the lease ends. The rows carry
 * `vectors_removed_seq` and `deletion_seq`: if they differ, run {@link DOCUMENT_CLEANUP_BEGIN} and
 * {@link DOCUMENT_CLEANUP_DONE} with the `deletion_seq` before completing. Skips rows another
 * transaction holds (`for update skip locked`); against a restore see {@link DOCUMENT_RESTORE}:
 * a claim whose snapshot predates a restore's commit re-checks `state = 'deleted'` on the newest
 * row version once the lock is granted and drops the row.
 */
export const DOCUMENT_PURGE_CLAIM = `with due as (
  select id from playbook.documents
  where organization_id = $1 and state = 'deleted' and purge_due_at <= clock_timestamp()
    and purge_attempts < ${DOCUMENT_PURGE_MAX_ATTEMPTS}
    and (purge_lease_until is null or purge_lease_until <= clock_timestamp())
  order by purge_due_at
  limit ${BATCH('$2')}
  for update skip locked)
update playbook.documents d
set purge_started_at = coalesce(d.purge_started_at, clock_timestamp()),
    purge_attempts = d.purge_attempts + 1,
    purge_lease_until = clock_timestamp() + ${LEASE('$3')},
    updated_at = clock_timestamp()
from due
where d.organization_id = $1 and d.id = due.id
returning d.id, d.object_key, d.size_bytes, d.deletion_seq, d.vectors_removed_seq, d.purge_attempts`

/**
 * Finish a purge: remove the document's row (its jobs go with it by cascade, and the counters
 * fall in the same transaction). `$1` Organization, `$2` document. It succeeds only for a
 * `deleted` document whose purge was claimed and whose current deletion's vector cleanup is
 * recorded; a row back means the record is gone. No row means one of those does not hold (run the
 * cleanup statements, then again), the document is already purged (the file removal before it
 * is idempotent, so a repeat is safe), or a worker may still hold a lease on one of its jobs (a
 * `running` job with an unexpired lease, left by a claim that raced the delete): wait out the lease
 * as {@link DOCUMENT_CLEANUP_BEGIN} does and run it again. Run it after the file is removed from storage.
 *
 * **Lock order.** The statement locks the document's job rows first (`for update`) and the document
 * row second, the same order as {@link INGESTION_JOB_CLAIM} and the delete, so the cascade that
 * removes the jobs finds them already locked and an immediate purge of a just-erased document cannot
 * deadlock with a claim (it waits for the claim's short transaction instead). The lease check reads
 * the job rows as locked, so it sees a claim that committed while this one waited.
 */
export const DOCUMENT_PURGE_COMPLETE = `with jl as (
  select state, next_attempt_at from playbook.ingestion_jobs
  where organization_id = $1 and document_id = $2
  for update)
delete from playbook.documents
where organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is not null
  and vectors_removed_seq = deletion_seq
  and not exists (select 1 from jl where jl.state = 'running' and jl.next_attempt_at > clock_timestamp())
returning id, size_bytes`

/**
 * Claim due ingestion jobs as a lease, in a short transaction that commits at once. `$1`
 * Organization, `$2` batch size, `$3` the lease in milliseconds (raised to
 * {@link PLAYBOOK_MIN_LEASE_MS}; it must exceed the time between heartbeats), `$4` one job id to
 * claim, or null for any. A job is due when it is `queued` (its `next_attempt_at` is the due time)
 * or `running` with a lapsed lease. Each claim counts an attempt, issues a new `claim_token` that
 * every later statement for the job must present (a worker whose lease lapsed holds a stale
 * token and is refused), and moves an `uploaded` document to `processing`. A job that has used
 * all ${INGESTION_JOB_MAX_ATTEMPTS} attempts is never claimed (the count would pass the table's
 * bound and abort the statement, wedging the batch); {@link INGESTION_JOB_GIVE_UP_SPENT}
 * resolves it. The service gives up on its own earlier, at its own limit below the bound, with
 * {@link INGESTION_JOB_FAIL}. **A job is claimed only while its document is `uploaded` or
 * `processing` at the job's `epoch`**: the claim reads the document, and a due job whose document
 * is deleted, failed, ready, gone or at another epoch is cancelled in the same statement and not
 * returned (this covers a job a restore or requeue committed while a delete was already waiting
 * for the document, which the delete's own cancel could not see). It locks the job row (`for
 * update of j skip locked`) and then the document row, in the delete's order (job before
 * document): the document update moves an `uploaded` document to `processing` and touches a
 * `processing` one, and it **re-checks the document after any wait**: if a delete took the
 * document while the claim waited, the document is no longer live at that epoch, it is not
 * updated and the job is not returned. (That job stays `running` with its lease on the deleted
 * document, which {@link INGESTION_JOB_HEARTBEAT} and {@link INGESTION_JOB_ADVANCE} refuse and
 * {@link DOCUMENT_CLEANUP_BEGIN} waits out; it is cancelled by the next claim once the lease lapses.)
 *
 * **Rows.** Each claimed job is a row; every row also carries `cancelled`, the number of stale jobs
 * this call cancelled (their slots count against the batch), and `lost`, the number of jobs it
 * claimed whose document a concurrent delete took before the claim could touch it (those stay
 * `running` on the deleted document until their lease lapses). When no job is returned but either
 * count is above zero, one signal row comes back with a null `id`: that is not an empty queue. The
 * worker claims again at once when either count is above zero; no rows at all means nothing was
 * due. Read the rows with {@link claimedJobs}.
 *
 * **Locks and timeouts.** The claim waits on a document row lock per claimed job while it holds the
 * batch's job locks, so the service runs it with a short `lock_timeout` (for example `set local
 * lock_timeout = '1s'` in its transaction; a wait that long raises `55P03` and rolls the claim
 * back, leaving the jobs unclaimed for the next sweep) and keeps every transaction that locks a
 * document short: no queue publish and no other network call inside one.
 */
export const INGESTION_JOB_CLAIM = `with due as (
  select j.id, coalesce(d.state in ('uploaded', 'processing') and d.epoch = j.epoch, false) as live
  from playbook.ingestion_jobs j
  left join playbook.documents d on d.organization_id = j.organization_id and d.id = j.document_id
  where j.organization_id = $1 and j.state in ('queued', 'running')
    and j.attempts < ${INGESTION_JOB_MAX_ATTEMPTS} and j.next_attempt_at <= clock_timestamp()
    and ($4::text is null or j.id = $4::text)
  order by j.next_attempt_at
  limit ${BATCH('$2')}
  for update of j skip locked),
stale as (
  update playbook.ingestion_jobs t
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  from due
  where t.organization_id = $1 and t.id = due.id and not due.live
  returning t.id),
claimed as (
  update playbook.ingestion_jobs j
  set state = 'running', attempts = j.attempts + 1, claim_token = gen_random_uuid(),
      next_attempt_at = clock_timestamp() + ${LEASE('$3')}, updated_at = clock_timestamp()
  from due
  where j.organization_id = $1 and j.id = due.id and due.live
  returning j.id, j.document_id, j.epoch, j.step, j.attempts, j.claim_token, j.artifact_key,
            j.page_count, j.chunk_count, j.chunks_done),
moved as (
  update playbook.documents d
  set state = 'processing', updated_at = clock_timestamp()
  from claimed
  where d.organization_id = $1 and d.id = claimed.document_id
    and d.state in ('uploaded', 'processing') and d.epoch = claimed.epoch
  returning d.id)
select c.id, c.document_id, c.epoch, c.step, c.attempts, c.claim_token, c.artifact_key, c.page_count,
  c.chunk_count, c.chunks_done, (select count(*) from stale)::int as cancelled,
  ((select count(*) from claimed) - (select count(*) from moved))::int as lost
from claimed c join moved m on m.id = c.document_id
union all
select null, null, null, null, null, null, null, null, null, null, (select count(*) from stale)::int,
  ((select count(*) from claimed) - (select count(*) from moved))::int
where not exists (select 1 from claimed c join moved m on m.id = c.document_id)
  and ((select count(*) from stale) > 0 or (select count(*) from claimed) > 0)`

/** One row of {@link INGESTION_JOB_CLAIM}: a claimed job, or (with a null `id`) the signal row. */
export interface IngestionJobClaimRow {
  id: string | null
  document_id: string | null
  epoch: number | null
  step: string | null
  attempts: number | null
  claim_token: string | null
  artifact_key: string | null
  page_count: number | null
  chunk_count: number | null
  chunks_done: number | null
  cancelled: number
  lost: number
}

/** A claimed job as {@link claimedJobs} returns it: a claim row whose `id` is known to be set. */
export type ClaimedIngestionJob = IngestionJobClaimRow & { id: string; document_id: string }

/**
 * Read the rows of {@link INGESTION_JOB_CLAIM}: the claimed jobs (the signal row dropped) and the
 * counts of stale jobs it `cancelled` and of jobs it `lost` to a concurrent delete. The worker
 * claims again at once when `cancelled` or `lost` is above zero, even with no job.
 */
export function claimedJobs(rows: readonly IngestionJobClaimRow[]): {
  jobs: ClaimedIngestionJob[]
  cancelled: number
  lost: number
} {
  const jobs = rows.filter(
    (row): row is ClaimedIngestionJob => row.id !== null && row.document_id !== null
  )
  return { jobs, cancelled: rows[0]?.cancelled ?? 0, lost: rows[0]?.lost ?? 0 }
}

/**
 * Extend a job's lease while a step runs. `$1` Organization, `$2` job, `$3` the claim token, `$4`
 * the new lease in milliseconds from now. No row means the claim was lost: the lease lapsed and
 * another worker took the job, or the job was cancelled by a delete or ended, or its document is
 * no longer live at the job's epoch (deleted, failed, ready, gone or restored under a newer epoch,
 * which includes a job a claim left running on a document a concurrent delete took). The worker
 * stops and writes nothing more.
 */
export const INGESTION_JOB_HEARTBEAT = `update playbook.ingestion_jobs
set next_attempt_at = clock_timestamp() + ${LEASE('$4')}, updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
  and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = ingestion_jobs.document_id
              and x.state in ('uploaded', 'processing') and x.epoch = ingestion_jobs.epoch)
returning id`

/**
 * Record progress and extend the lease. `$1` Organization, `$2` job, `$3` the claim token, `$4`
 * the next step to run (it may repeat the current one but never go back), `$5` the object key of
 * the parsed intermediate, `$6` the page count, `$7` the chunk count, `$8` chunks done, `$9` the
 * lease in milliseconds. A null `$5` to `$8` leaves that value as it is. The table refuses chunks
 * done above the chunk count. No row means the claim was lost, the document is no longer live at the job's epoch (as for
 * {@link INGESTION_JOB_HEARTBEAT}), or the step would go backwards.
 */
export const INGESTION_JOB_ADVANCE = `update playbook.ingestion_jobs
set step = $4::text, artifact_key = coalesce($5::text, artifact_key), page_count = coalesce($6::int, page_count),
    chunk_count = coalesce($7::int, chunk_count), chunks_done = coalesce($8::int, chunks_done),
    next_attempt_at = clock_timestamp() + ${LEASE('$9')}, updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
  and array_position(${STEP_ORDER}, $4::text) >= array_position(${STEP_ORDER}, step)
  and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = ingestion_jobs.document_id
              and x.state in ('uploaded', 'processing') and x.epoch = ingestion_jobs.epoch)
returning id, step, chunks_done`

/**
 * Give a failed attempt back for a later one. `$1` Organization, `$2` job, `$3` the claim token,
 * `$4` the delay in milliseconds before it is due again (cut to
 * {@link INGESTION_MAX_RETRY_DELAY_MS}; the service jitters it). The job returns to `queued` and
 * keeps its step and counts, so it resumes. No row means the claim was lost.
 */
export const INGESTION_JOB_RETRY = `update playbook.ingestion_jobs
set state = 'queued', claim_token = null,
    next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), ${INGESTION_MAX_RETRY_DELAY_MS}) / 1000),
    updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
returning id, attempts`

/**
 * Finish a job and make its document `ready`, in one write, with the document's `page_count` set
 * from the job's (the count the worker recorded with {@link INGESTION_JOB_ADVANCE}; null if none).
 * `$1` Organization, `$2` job, `$3` the claim token. No row means the claim was lost (including a cancel by a delete) or the document is
 * no longer `processing` at the job's epoch: the document is not touched. A job that wins this over a concurrent delete is impossible: the delete
 * cancels the job and takes the job row first.
 */
export const INGESTION_JOB_COMPLETE = `with j as (
  update playbook.ingestion_jobs
  set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
    and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = ingestion_jobs.document_id
                and x.state = 'processing' and x.epoch = ingestion_jobs.epoch)
  returning document_id, epoch, page_count),
d as (
  update playbook.documents
  set state = 'ready', page_count = coalesce((select page_count from j), page_count), updated_at = clock_timestamp()
  where organization_id = $1 and id = (select document_id from j) and epoch = (select epoch from j)
    and state = 'processing')
select document_id from j`

/**
 * End a job as failed and make its document `failed` with the reason, in one write. `$1`
 * Organization, `$2` job, `$3` the claim token, `$4` the reason (`too_many_pages`, `unreadable`,
 * `password_protected`, `no_text` or `processing_failed`; the table rejects any other). The
 * document's `page_count` is set from the job's in the same write, so a `too_many_pages` failure
 * shows the count when the worker recorded it first with {@link INGESTION_JOB_ADVANCE}. No row
 * means the claim was lost.
 */
export const INGESTION_JOB_FAIL = `with j as (
  update playbook.ingestion_jobs
  set state = 'failed', failure_reason = $4::text, claim_token = null,
      finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
    and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = ingestion_jobs.document_id
                and x.state in ('uploaded', 'processing') and x.epoch = ingestion_jobs.epoch)
  returning document_id, epoch, page_count),
d as (
  update playbook.documents
  set state = 'failed', failure_reason = $4::text, page_count = coalesce((select page_count from j), page_count),
      updated_at = clock_timestamp()
  where organization_id = $1 and id = (select document_id from j) and epoch = (select epoch from j)
    and state in ('uploaded', 'processing'))
select document_id from j`

/**
 * Fail spent jobs, one bounded batch: active jobs that have used every attempt and whose lease
 * has ended, so no worker holds them, as `failed` with `processing_failed`, and their documents
 * too. It is the safety net behind the service's own limit (which is lower, so in normal
 * operation this finds nothing); run it once per sweep after the claim, with a small batch.
 * `$1` Organization, `$2` batch size. Skips rows another transaction holds.
 */
export const INGESTION_JOB_GIVE_UP_SPENT = `with batch as (
  select id from playbook.ingestion_jobs
  where organization_id = $1 and state in ('queued', 'running')
    and attempts >= ${INGESTION_JOB_MAX_ATTEMPTS} and next_attempt_at <= clock_timestamp()
  order by next_attempt_at
  limit ${BATCH('$2')}
  for update skip locked),
j as (
  update playbook.ingestion_jobs t
  set state = 'failed', failure_reason = 'processing_failed', claim_token = null,
      finished_at = clock_timestamp(), updated_at = clock_timestamp()
  from batch
  where t.organization_id = $1 and t.id = batch.id
  returning t.document_id, t.epoch),
d as (
  update playbook.documents
  set state = 'failed', failure_reason = 'processing_failed', updated_at = clock_timestamp()
  from j
  where documents.organization_id = $1 and documents.id = j.document_id and documents.epoch = j.epoch
    and documents.state in ('uploaded', 'processing'))
select document_id from j`

/**
 * Take a message for a consumer (the kit's `ProcessedStore.claim`), in one statement. `$1`
 * consumer, `$2` Organization (the all-zero id for a global message), `$3` message id, `$4` a new
 * claim token (a uuid the store makes), `$5` the lease in milliseconds (raised to
 * {@link PLAYBOOK_MIN_LEASE_MS}). A row back means `claimed` and holds the token. No row means
 * read {@link CONSUMED_LOOKUP}: `done`, or `busy`. A claim whose lease has ended is taken over
 * with the new token; the old holder's `renew` and `complete` then fail. Run it inside
 * `withOrganization` for `$2`.
 */
export const CONSUMED_CLAIM = `insert into playbook.consumed_message as m
  (consumer, organization_id, message_id, state, claim_token, lease_expires_at)
values ($1, $2, $3, 'claimed', $4::uuid, clock_timestamp() + ${LEASE('$5')})
on conflict (consumer, organization_id, message_id) do update set
  claim_token = excluded.claim_token,
  lease_expires_at = clock_timestamp() + ${LEASE('$5')}
where m.state = 'claimed' and m.lease_expires_at <= clock_timestamp()
returning claim_token`

/**
 * After a {@link CONSUMED_CLAIM} that returned no row: the record's state and, for a `claimed` record
 * only, the whole seconds left on its lease, at least 1 (also when the lease has just lapsed);
 * `retry_after_seconds` is null for a `done` record. `$1` consumer, `$2` Organization, `$3` message
 * id. No row means the record was purged or released in between: claim again. A `claimed` record
 * with `retry_after_seconds` 1 may have just lapsed; the consumer retries then.
 */
export const CONSUMED_LOOKUP = `select state,
  case when state = 'claimed'
       then greatest(1, ceil(extract(epoch from lease_expires_at - clock_timestamp())))::int end as retry_after_seconds
from playbook.consumed_message
where consumer = $1 and organization_id = $2 and message_id = $3`

/**
 * Extend a claim (the kit's `ProcessedStore.renew`). `$1` consumer, `$2` Organization, `$3`
 * message id, `$4` the token, `$5` the lease in milliseconds from now. A row back means true. No
 * row means the claim was lost: it lapsed (even if no one took it over yet) or was taken or
 * released.
 */
export const CONSUMED_RENEW = `update playbook.consumed_message
set lease_expires_at = clock_timestamp() + ${LEASE('$5')}
where consumer = $1 and organization_id = $2 and message_id = $3
  and claim_token = $4::uuid and state = 'claimed' and lease_expires_at > clock_timestamp()
returning claim_token`

/**
 * Mark a message done (the kit's `ProcessedStore.complete`). `$1` consumer, `$2` Organization,
 * `$3` message id, `$4` the token. A row back means true. No row means the claim was lost (another
 * consumer took it after the lease lapsed): the kit's contract, which does not check the lease
 * here, so a holder that is late but not replaced still completes.
 */
export const CONSUMED_COMPLETE = `update playbook.consumed_message
set state = 'done', completed_at = clock_timestamp(), lease_expires_at = null
where consumer = $1 and organization_id = $2 and message_id = $3
  and claim_token = $4::uuid and state = 'claimed'
returning claim_token`

/**
 * Give up a claim (the kit's `ProcessedStore.release`) so the next delivery can take it. `$1`
 * consumer, `$2` Organization, `$3` message id, `$4` the token. A lost claim removes nothing.
 */
export const CONSUMED_RELEASE = `delete from playbook.consumed_message
where consumer = $1 and organization_id = $2 and message_id = $3
  and claim_token = $4::uuid and state = 'claimed'`

/**
 * Purge one bounded batch (the kit's `ProcessedStore.purge`), in **one Organization's scope**:
 * row-level security hides every other, so the periodic job runs it once per Organization and once
 * under the all-zero scope, splitting the limit, and repeats while a batch comes back full.
 * Removes `done` records completed before `$2` and `claimed` records whose lease has ended, at
 * most `$3`, skipping rows another transaction holds. `$1` Organization, `$2` the cutoff (older
 * than the queue's retention, 14 days at most; the kit's argument, the one point in time any
 * playbook statement takes from the caller). The row count is the number removed.
 */
export const CONSUMED_PURGE = `with batch as (
  select consumer, message_id from playbook.consumed_message
  where organization_id = $1
    and ((state = 'done' and completed_at < $2::timestamptz)
         or (state = 'claimed' and lease_expires_at <= clock_timestamp()))
  limit ${BATCH('$3')}
  for update skip locked)
delete from playbook.consumed_message c
using batch b
where c.organization_id = $1 and c.consumer = b.consumer and c.message_id = b.message_id`

/**
 * Record the Organization's embedding model and dimension (ADR 0010). `$1` Organization, `$2` the
 * model name, `$3` the dimension. A row back means the settings are now those. While no vector
 * exists a different model or dimension replaces the old; once {@link INDEX_VECTORS_MARK} has run
 * a different one gets **no row** and nothing changes (the choice is to refuse, not to flag a
 * re-index; a trigger refuses it for any other statement too). The same values again are
 * idempotent and return the row.
 */
export const INDEX_SETTINGS_UPSERT = `insert into playbook.index_settings as s
  (organization_id, embedding_model, embedding_dimension)
values ($1, $2, $3::int)
on conflict (organization_id) do update set
  embedding_model = excluded.embedding_model, embedding_dimension = excluded.embedding_dimension,
  updated_at = clock_timestamp()
where s.vectors_written_at is null
   or (s.embedding_model = excluded.embedding_model and s.embedding_dimension = excluded.embedding_dimension)
returning embedding_model, embedding_dimension, vectors_written_at`

/**
 * Fix the Organization's model and dimension before the first vector is written, and read them
 * back. `$1` Organization. A row back holds the model and dimension every vector must use; run it
 * at the start of the index step. No row means no settings are recorded (run
 * {@link INDEX_SETTINGS_UPSERT} first), or this call lost a race with another mark: run it again.
 * A concurrent {@link INDEX_SETTINGS_UPSERT} that wants a different model and a mark exclude each
 * other by the row lock: either the upsert commits first and the mark reads its values, or the
 * mark does and the upsert gets no row.
 */
export const INDEX_VECTORS_MARK = `with m as (
  update playbook.index_settings
  set vectors_written_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and vectors_written_at is null
  returning embedding_model, embedding_dimension)
select embedding_model, embedding_dimension from m
union all
select embedding_model, embedding_dimension from playbook.index_settings
where organization_id = $1 and vectors_written_at is not null`

/**
 * Start an idempotent request: insert its key in flight, inside the transaction that does the
 * work. `$1` Organization, `$2` user (`INTERNAL_CALL_USER_ID` for an internal call), `$3` route
 * (such as `documents.upload`), `$4` the client's key, `$5` the 32-byte SHA-256 of the request.
 * A row back means this call owns the key: do the write and {@link IDEMPOTENCY_COMPLETE} in the
 * same transaction, so a crash strands nothing. No row means the key exists, or was inserted by a
 * transaction this call waited for: read {@link IDEMPOTENCY_LOOKUP}. Never commit a row in flight.
 * A concurrent retry waits on the first transaction's primary-key lock; bound that wait with a
 * lock timeout and answer `request.idempotency_in_progress` (409).
 */
export const IDEMPOTENCY_BEGIN = `insert into playbook.idempotency_keys (organization_id, user_id, route, key, request_hash)
values ($1, $2, $3, $4, $5::bytea)
on conflict (organization_id, user_id, route, key) do nothing
returning key`

/**
 * Read the stored outcome of a key. `$1` Organization, `$2` user, `$3` route, `$4` key. The row
 * carries `request_hash`: a different hash than the request's means the key is reused for another
 * request (refuse it); the same hash with a `status` and `response` is a replay (answer the stored
 * response); the same hash with a null `status` is still in flight.
 */
export const IDEMPOTENCY_LOOKUP = `select request_hash, status, response, created_at
from playbook.idempotency_keys
where organization_id = $1 and user_id = $2 and route = $3 and key = $4`

/**
 * Complete a key once: store the answer. `$1` Organization, `$2` user, `$3` route, `$4` key, `$5`
 * the HTTP status (100 to 599), `$6` the response body as JSON (at most 16384 bytes of text; store
 * a body with no secret). No row means the key was already completed (the write-once trigger would
 * refuse a rewrite, and `status is null` skips it instead).
 */
export const IDEMPOTENCY_COMPLETE = `update playbook.idempotency_keys
set status = $5::smallint, response = $6::jsonb
where organization_id = $1 and user_id = $2 and route = $3 and key = $4 and status is null
returning key`

/**
 * Purge one bounded batch of an Organization's old keys, inside its scope. `$1` Organization, `$2`
 * the least age in milliseconds (raised to {@link IDEMPOTENCY_MIN_PURGE_AGE_MS}, 26 hours: a key
 * is the evidence of an upload attempt whose orphan sweep may not have run), `$3` batch size,
 * clamped to 1..{@link PLAYBOOK_MAX_BATCH}. Oldest first on `idempotency_keys_purge_idx`, skipping
 * rows another transaction holds; repeat until a batch removes none (a short batch does not mean
 * the backlog is empty). The row count is the number removed.
 */
export const IDEMPOTENCY_PURGE = `with batch as (
  select user_id, route, key from playbook.idempotency_keys
  where organization_id = $1
    and created_at < clock_timestamp() - make_interval(secs => greatest(coalesce($2::float8, 0), ${IDEMPOTENCY_MIN_PURGE_AGE_MS}) / 1000)
  order by created_at
  limit ${BATCH('$3')}
  for update skip locked)
delete from playbook.idempotency_keys k
using batch b
where k.organization_id = $1 and k.user_id = b.user_id and k.route = b.route and k.key = b.key`

/**
 * How old a done consumed message is when it becomes purgeable, in milliseconds: 15 days, above the
 * queue's retention (14 days at most, per the kit), because a message younger than the retention
 * could still be redelivered. `organizations_with_work` hints `consumed_purge` at this age; a lapsed
 * claim is purgeable at its lease end. The cutoff passed to {@link CONSUMED_PURGE} should not be
 * younger.
 */
export const CONSUMED_PURGE_AGE_MS = 15 * 24 * 60 * 60 * 1000

/**
 * The route the remove-all call stores its idempotency key under. Pass it to
 * {@link ORGANIZATION_REMOVE_REST} so the call's own key survives the removal it belongs to.
 */
export const REMOVE_ALL_IDEMPOTENCY_ROUTE = 'organizations.remove_all'

/**
 * One batch of an erasure: bar the Organization's documents from restore and make them due for
 * purge at once, in one write. `$1` Organization, `$2` batch size (clamped to
 * 1..{@link PLAYBOOK_MAX_BATCH}), `$3` the actor stored as `deleted_by` (an internal call has no
 * user: pass `usr_` and 32 zeros). It takes the first `$2` documents, in id order, that are not yet
 * barred (`documents_unbarred_idx`): a live document is soft-deleted as {@link DOCUMENT_SOFT_DELETE}
 * does (`epoch` and `deletion_seq` up by one, its queued or running job cancelled, a running job's
 * lease end kept as the fence {@link DOCUMENT_CLEANUP_BEGIN} waits for), and an already deleted one
 * keeps its sequence and has its purge time pulled forward to now (never pushed back). Every taken
 * document gets `restore_barred_at`, so neither restore can bring it back and a re-upload of its
 * content creates a new document, and `purge_due_at` is now, so {@link DOCUMENT_PURGE_CLAIM} takes
 * it on the next sweep. Erasure overrides retention (ADR 0016).
 *
 * The rows are the documents taken: `id`, `epoch`, `deletion_seq` and `changed`, true when the
 * document's `deletion_seq` is higher than the one this call first read (it deleted a live document,
 * or a restore it waited for had brought one back): publish its vector cleanup with that
 * `deletion_seq`. False for an already deleted one (its cleanup was published when it was deleted). Repeat until no row comes
 * back: the barred documents drop out of the scan, so a repeat is idempotent and a call that finds
 * nothing means every document the Organization had when it started is barred or gone. A document
 * uploaded meanwhile is taken by a later call; whether the Organization is empty is
 * {@link ORGANIZATION_REMOVAL_STATUS}'s answer.
 *
 * **Locks.** Jobs first, documents second, as the delete does, and each set in id order
 * (`order by id for update`), so two batches over the same documents take the same rows in the same
 * order and cannot deadlock on each other: the job locks wait for a claim's short transaction, and
 * the document locks depend on the job update, so they come after. One erase loop per Organization
 * is expected; a `40P01` or `40001` is retried with a bounded, jittered retry. The vector cleanup
 * for a `deletion_seq` is idempotent: it may be published twice (a call retried after a lost
 * answer, or a restore the batch waited for) and the second does nothing. A job a concurrent restore or requeue commits after this
 * statement's snapshot is cancelled by {@link INGESTION_JOB_CLAIM} (the document is no longer live
 * at its epoch). A document a concurrent purge claim holds is waited for, then re-read.
 */
export const DOCUMENT_ERASE_BATCH = `with t as (select clock_timestamp() as now),
cand as (
  select id, deletion_seq from playbook.documents
  where organization_id = $1 and restore_barred_at is null
  order by id
  limit ${BATCH('$2')}),
jl as (
  select id from playbook.ingestion_jobs
  where organization_id = $1 and state in ('queued', 'running') and document_id in (select id from cand)
  order by id
  for update),
j as (
  update playbook.ingestion_jobs
  set state = 'cancelled', claim_token = null, finished_at = (select now from t), updated_at = (select now from t),
      next_attempt_at = case when state = 'running' then next_attempt_at else (select now from t) end
  where organization_id = $1 and id in (select id from jl)
  returning id),
dl as (
  select id from playbook.documents
  where organization_id = $1 and id in (select id from cand) and restore_barred_at is null
    and (select count(*) from j) >= 0
  order by id
  for update),
d as (
  update playbook.documents x
  set state = 'deleted',
      epoch = case when x.state <> 'deleted' then x.epoch + 1 else x.epoch end,
      deletion_seq = case when x.state <> 'deleted' then x.deletion_seq + 1 else x.deletion_seq end,
      deleted_at = case when x.state <> 'deleted' then (select now from t) else x.deleted_at end,
      deleted_by = case when x.state <> 'deleted' then $3::text else x.deleted_by end,
      purge_due_at = least(coalesce(x.purge_due_at, (select now from t)), (select now from t)),
      restore_barred_at = (select now from t), failure_reason = null, updated_at = (select now from t)
  from cand
  where x.organization_id = $1 and x.id = cand.id and x.id in (select id from dl)
  returning x.id, x.epoch, x.deletion_seq, (x.deletion_seq <> cand.deletion_seq) as changed)
select id, epoch, deletion_seq, changed from d order by id`

/**
 * Remove what an Organization has left once it has no document: index settings, the usage row,
 * consumed messages, every idempotency key and the work hints (except the orphan sweep's hint, and
 * the purge hint of the kept key, which stay). `$1` Organization, `$2` a route whose
 * idempotency keys are kept (pass {@link REMOVE_ALL_IDEMPOTENCY_ROUTE}, so the remove-all call's own
 * key survives; it ages out through {@link IDEMPOTENCY_PURGE}). Before the keys go it records the
 * creation time of the latest upload attempt among them in `orphan_sweeps.erased_attempt_at`, so
 * the Organization is still reported for `orphan_sweep` until a sweep covers it; no key content
 * remains. Run it inside the
 * Organization's scope, in a transaction of its own after the last purge. The one row has `removed`:
 * true when nothing is left (also when called again), false, with nothing deleted, while any
 * document row exists, soft-deleted ones included. It is a `SECURITY DEFINER` function
 * (`playbook.remove_organization_rest`) because the service role may not delete these rows, and it
 * acts only on the Organization the transaction is scoped to, so it cannot strip another, and not on
 * one that still has a document. It takes the upload lock ({@link QUOTA_LOCK}'s key) first, so an
 * upload in flight is seen or waits.
 */
export const ORGANIZATION_REMOVE_REST = `select playbook.remove_organization_rest($1::text, $2::text) as removed`

/**
 * Whether an Organization is fully removed: the answer of the internal remove-all route. `$1`
 * Organization. One row: `no_documents`, `no_settings`, `no_usage`, `no_messages` (the
 * Organization's own consumed messages), `no_deals`, `no_imports` (a Deal import row, whose report
 * rows cannot exist without it), `no_rights` (the rights confirmation), `no_calls` (a Call row, whose jobs cannot exist without it) and `removed`, true when all
 * eight hold. Idempotency keys
 * are not part of it (the remove-all call's own key stays until it ages out). Run it inside the
 * Organization's scope; in any other scope it returns no row, because the tenant tables would
 * otherwise look empty and answer "removed" for an Organization the caller cannot see.
 */
export const ORGANIZATION_REMOVAL_STATUS = `select
  not exists (select 1 from playbook.documents where organization_id = $1) as no_documents,
  not exists (select 1 from playbook.index_settings where organization_id = $1) as no_settings,
  not exists (select 1 from playbook.organization_usage where organization_id = $1) as no_usage,
  not exists (select 1 from playbook.consumed_message where organization_id = $1) as no_messages,
  not exists (select 1 from playbook.deals where organization_id = $1) as no_deals,
  not exists (select 1 from playbook.deal_imports where organization_id = $1) as no_imports,
  not exists (select 1 from playbook.rights_confirmations where organization_id = $1) as no_rights,
  not exists (select 1 from playbook.calls where organization_id = $1) as no_calls,
  (not exists (select 1 from playbook.documents where organization_id = $1)
    and not exists (select 1 from playbook.index_settings where organization_id = $1)
    and not exists (select 1 from playbook.organization_usage where organization_id = $1)
    and not exists (select 1 from playbook.consumed_message where organization_id = $1)
    and not exists (select 1 from playbook.deals where organization_id = $1)
    and not exists (select 1 from playbook.deal_imports where organization_id = $1)
    and not exists (select 1 from playbook.rights_confirmations where organization_id = $1)
    and not exists (select 1 from playbook.calls where organization_id = $1)) as removed
where $1::text = nullif(current_setting('app.organization_id', true), '')`

/**
 * List the documents whose purge reached the attempt bound, one page, for a person to look at. `$1`
 * Organization, `$2` the last id of the previous page (`''` for the first), `$3` the page size,
 * clamped to 1..{@link DOCUMENT_LIST_MAX_PAGE}. Ordered by id on `documents_spent_purge_idx`. A
 * spent document stays `deleted`, counts toward the quota and is never claimed again until
 * {@link DOCUMENT_PURGE_RESET} clears it; `object_key` says which file the purge could not remove.
 */
export const DOCUMENT_LIST_SPENT_PURGES = `select id, name, size_bytes, object_key, deletion_seq, vectors_removed_seq, deleted_at,
  purge_due_at, purge_started_at, purge_lease_until, purge_attempts, restore_barred_at
from playbook.documents
where organization_id = $1 and state = 'deleted' and purge_attempts >= ${DOCUMENT_PURGE_MAX_ATTEMPTS}
  and id > $2::text
order by id
limit ${CLAMP('$3', DOCUMENT_LIST_MAX_PAGE)}`

/**
 * Give one spent purge another round: reset its attempt count and lease so
 * {@link DOCUMENT_PURGE_CLAIM} takes it again. `$1` Organization, `$2` document. It applies only to
 * a `deleted` document whose purge reached the bound; no row means it is not spent (or is gone).
 * The document is barred from restore for good (`restore_barred_at`), because its file may be half
 * removed; the purge-claim time starts again at the next claim. A person runs it after fixing
 * what blocked the purge (the file store, a permission); it is idempotent.
 */
export const DOCUMENT_PURGE_RESET = `update playbook.documents
set purge_attempts = 0, purge_started_at = null, purge_lease_until = null,
    restore_barred_at = coalesce(restore_barred_at, clock_timestamp()), updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and state = 'deleted' and purge_attempts >= ${DOCUMENT_PURGE_MAX_ATTEMPTS}
returning id, purge_attempts`

/**
 * Find the Organizations with due work of one kind: `purge_due` (documents due for purge),
 * `jobs_due` (jobs queued and due, or running with a lapsed lease, spent ones included),
 * `cleanup_pending` (deleted documents whose vector cleanup is not recorded, five minutes after the
 * delete), `consumed_purge` (done messages {@link CONSUMED_PURGE_AGE_MS} old, lapsed claims; the
 * all-zero global scope is included for this kind only), `idempotency_purge` (keys
 * {@link IDEMPOTENCY_PURGE_AGE_MS} old), `purge_spent` (documents whose purge reached the
 * bound) and `orphan_sweep` (an Organization with an upload attempt the service has not yet swept
 * for orphan objects, {@link ORPHAN_SWEEP_AGE_MS} after that attempt; mark it with
 * {@link ORPHAN_SWEEP_DONE}). `$1` the kind, `$2` the point to continue from (null or `''` for the first call), `$3` the
 * page size, clamped to 1..{@link PLAYBOOK_MAX_BATCH} here and again inside the function.
 *
 * **Rows.** Each is an Organization id and `resume_after`, the last hint the call visited. One call
 * visits at most four times the page size of hints (stale ones are cleaned as they are met), so its
 * work and locks are bounded. When nothing was returned but hints were visited, one marker row has a
 * null `organization_id` and the `resume_after`; no rows at all ends the sweep. Read the rows with
 * {@link discoveredOrganizations} and call again from `resume_after`. A short page does not end the
 * sweep (hints another transaction holds are skipped until the next sweep).
 *
 * **Rules.** Run it unscoped: inside a tenant-scoped transaction it raises `insufficient_privilege`
 * (`42501`). It must be the only statement of its transaction, which commits at once, because it
 * holds the visited hints' locks until then. Then run the kind's statement once per id, in that
 * Organization's scope. The function is `SECURITY DEFINER` and executable by the playbook role
 * only; see the migration for the plan per kind.
 */
export const ORGANIZATIONS_WITH_WORK = `select organization_id, resume_after from playbook.organizations_with_work($1::text, $2::text, ${BATCH('$3')})`

/**
 * Mark an Organization's orphan sweep done through a time: `$1` Organization, `$2` the time through
 * which stored objects were examined (every object that an upload attempt at or before `$2` could
 * have stored was looked at). **Compute `$2` when the sweep starts, not when this is called**: an
 * object stored while the sweep ran may have been missed, and a time taken at the end would count
 * it as examined. Run it in that Organization's scope (any other scope is refused),
 * after the sweep. The database cuts `$2` to {@link ORPHAN_SWEEP_AGE_MS} (25 hours) before now (an
 * object younger than that is never counted as swept) and never moves the recorded time back, so a repeat or an older time is harmless.
 * Returns `swept_through` (what is recorded) and `more`: true while an upload attempt newer than
 * that exists, in which case the work hint stays, due {@link ORPHAN_SWEEP_AGE_MS} after the oldest
 * such attempt; false when none does and the hint is removed. It waits for any open upload attempt
 * of the Organization (they are short) and then sees the ones that committed meanwhile, so an attempt
 * racing the sweep keeps its hint: a hint may be early, never missing. It is
 * `playbook.orphan_sweep_done`, `SECURITY DEFINER`, the only writer of `orphan_sweeps`.
 */
export const ORPHAN_SWEEP_DONE = `select swept_through, more from playbook.orphan_sweep_done($1::text, $2::timestamptz)`

/**
 * Claim an Organization's orphan sweep (hub issue 109): `$1` Organization, `$2` how long the claim
 * lasts in milliseconds (raised to 1 second, cut to 1 hour). Run it in that Organization's scope.
 * Returns one row: `claimed` true with `swept_through` (the time the last completed sweep recorded;
 * `-infinity` if none) and `sweep_cursor` (the last object key listed by a sweep that was cut short,
 * null when none), or `claimed` false with nulls while another instance holds a claim whose
 * deadline has not passed. The row is taken `for update skip locked`, so a claimant never waits and
 * of any number of concurrent claims one wins. Finish with {@link ORPHAN_SWEEP_PAGE_DONE}, which
 * releases the claim; a crashed holder is replaced once its deadline passes. It is
 * `playbook.orphan_sweep_claim`, `SECURITY DEFINER`.
 */
export const ORPHAN_SWEEP_CLAIM = `select claimed, swept_through, sweep_cursor from playbook.orphan_sweep_claim($1::text, $2::int)`

/**
 * Finish one visit of an Organization's orphan sweep (hub issue 109): `$1` Organization, `$2` the
 * time the sweep started (as for {@link ORPHAN_SWEEP_DONE}), `$3` the last object key listed when
 * the listing was cut short, null when it completed. Run it in that Organization's scope. Cut short
 * (`$3` set, 1 to 1024 bytes): the cursor is saved, `swept_through` and the work hint are left
 * alone, the claim is released and `more` is true. Completed (`$3` null): the cursor is cleared, the
 * claim released and {@link ORPHAN_SWEEP_DONE} runs for `$2`, so `swept_through` advances and `more`
 * says whether the hint stays. Returns `swept_through`, `more` and `sweep_cursor` (what is now
 * saved: `$3`, or null). It is `playbook.orphan_sweep_page_done`, `SECURITY DEFINER`.
 * The service's duties: pass the **first** visit's start as `$2` on every visit of one sweep (keep it
 * with the cursor, and begin again from nothing if the sweep is older than the 25 hour window);
 * finish before the claim's deadline, because this call does not check that the caller still holds
 * the claim (a late call after another instance reclaimed would release that claim).
 */
export const ORPHAN_SWEEP_PAGE_DONE = `select swept_through, more, sweep_cursor from playbook.orphan_sweep_page_done($1::text, $2::timestamptz, $3::text)`

/**
 * Read an Organization's orphan sweep state: `$1` Organization. One row, `swept_through`,
 * `sweep_cursor` (null when none is saved) and `sweep_claim_until` (null when unclaimed), or none if
 * the Organization has no `orphan_sweeps` row.
 */
export const ORPHAN_SWEEP_STATE = `select swept_through, sweep_cursor, sweep_claim_until from playbook.orphan_sweeps where organization_id = $1`

/**
 * Add a job's Moment count to today's embed counter (hub issue 109): `$1` Organization, `$2` the
 * number of Moments (null or negative counts 0, above 1,000,000 counts 1,000,000). The day is the
 * database's current UTC date, so every instance agrees. One atomic upsert, so concurrent adds all
 * count; the day's total stops at 1,000,000,000. Returns one row: `day` (`YYYY-MM-DD`) and the
 * day's `moments` total after this add.
 */
export const EMBED_USAGE_ADD = `insert into playbook.embed_usage as u (organization_id, day, moments)
values ($1, (clock_timestamp() at time zone 'utc')::date, least(greatest(coalesce($2::int, 0), 0), 1000000))
on conflict (organization_id, day) do update set moments = least(u.moments + excluded.moments, 1000000000)
returning day::text as day, moments`

/**
 * Purge an Organization's old embed counts (hub issue 109): `$1` Organization, `$2` how many whole
 * days to keep besides today (floored at 1; today is never purged), `$3` the most days to remove
 * (1 to {@link PLAYBOOK_MAX_BATCH}). The oldest go first and a locked row is skipped. The row count
 * is the number removed; fewer than `$3` means none are left.
 */
export const EMBED_USAGE_PURGE = `with old as (
  select day from playbook.embed_usage
  where organization_id = $1
    and day < (clock_timestamp() at time zone 'utc')::date - greatest(coalesce($2::int, 1), 1)
  order by day
  limit ${BATCH('$3')}
  for update skip locked)
delete from playbook.embed_usage e using old
where e.organization_id = $1 and e.day = old.day`

/** One row of {@link ORGANIZATIONS_WITH_WORK}: an Organization with work, or the marker row (null id). */
export interface WorkDiscoveryRow {
  organization_id: string | null
  resume_after: string
}

/**
 * Read the rows of {@link ORGANIZATIONS_WITH_WORK}: the Organizations with work (the marker row
 * dropped) and where to continue. `resumeAfter` is null when the call returned no row, which ends
 * the sweep; otherwise pass it as the next call's `$2`.
 */
export function discoveredOrganizations(rows: readonly WorkDiscoveryRow[]): {
  organizations: string[]
  resumeAfter: string | null
} {
  const organizations = rows.flatMap((row) =>
    row.organization_id === null ? [] : [row.organization_id]
  )
  return { organizations, resumeAfter: rows[0]?.resume_after ?? null }
}

/*
 * Sales history, part one (hub issue 67, ADR 0018): Deals, Deal imports and the rights confirmation.
 * The first page of every keyset list passes `'infinity'` as the cursor time and any text as the
 * cursor id (a finite `created_at` is below infinity whatever the id).
 */

/**
 * The Deal's live Calls (not `deleted`), counted per row. A correlated subquery on the outer row's
 * Organization and Deal, so it reads the Calls through `calls_deal_list_idx` (Organization, Deal;
 * partial on `state <> 'deleted'`): work proportional to the Deal's own Calls, only for the rows
 * returned (one, or a page). `int`, so the driver returns a number.
 */
const CALL_COUNT = (outer: string) => `(select count(*)::int from playbook.calls cc
  where cc.organization_id = ${outer}.organization_id and cc.deal_record_id = ${outer}.id and cc.state <> 'deleted') as call_count`

/** The columns a Deal answer carries (the source is aliased `d`, or a CTE named `source`). */
const DEAL_COLUMNS_OF = (outer: string) =>
  `${outer}.id, ${outer}.deal_id, ${outer}.name, ${outer}.outcome, ${outer}.outcome_seq, ${outer}.closed_at, ${outer}.amount, ${outer}.currency, ${outer}.appeared_in_import, ${outer}.created_at, ${outer}.updated_at, ${CALL_COUNT(outer)}`
const DEAL_COLUMNS = DEAL_COLUMNS_OF('d')

/**
 * The list statements add `cursor_at`, the database's own text form of `created_at`. The next
 * page's `$2` is that text, never a JavaScript Date, which drops the microseconds: Deals created by
 * one statement share a `created_at`, and a truncated cursor would skip rows at a page boundary.
 */
const DEAL_LIST_COLUMNS = `${DEAL_COLUMNS}, d.created_at::text as cursor_at`

/** The names of the columns of a Deal answer, for the service's row type. */
export const DEAL_ROW_FIELDS = [
  'id',
  'deal_id',
  'name',
  'outcome',
  'outcome_seq',
  'closed_at',
  'amount',
  'currency',
  'appeared_in_import',
  'created_at',
  'updated_at',
  'call_count',
] as const

/**
 * Read one Deal by its opaque id. `$1` Organization, `$2` the `deal_…` id. No row when absent. The
 * `call_count` is the Deal's live Calls (see the list statements).
 */
export const DEAL_GET = `select ${DEAL_COLUMNS}
from playbook.deals d
where organization_id = $1 and id = $2`

/**
 * Look a Deal up by the customer's own deal id. `$1` Organization, `$2` the deal id, trimmed by the
 * caller and otherwise exact: the comparison is byte for byte, so `A-1` and `a-1` are two Deals
 * (`deals_deal_id_key`, one index read). No row when none has that id.
 */
export const DEAL_BY_DEAL_ID = `select ${DEAL_COLUMNS}
from playbook.deals d
where organization_id = $1 and deal_id = $2::text`

/**
 * List the Deals, newest first, one page by keyset. `$1` Organization, `$2` and `$3` the
 * `cursor_at` (text, never a Date) and `id` of the last row of the previous page (`'infinity'` and
 * `''` for the first). A malformed cursor text raises SQLSTATE 22007 (`invalid_datetime_format`): the
 * service maps it to a validation error. Each row carries `cursor_at`, the text of `created_at` to pass back,
 * `$4` the page size, clamped to 1..{@link DOCUMENT_LIST_MAX_PAGE}. On `deals_list_idx`, read
 * backwards.
 */
export const DEAL_LIST = `select ${DEAL_LIST_COLUMNS}
from playbook.deals d
where organization_id = $1 and (created_at, id) < ($2::timestamptz, $3::text)
order by created_at desc, id desc
limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)}`

/** {@link DEAL_LIST} for one Outcome (`$5`: `won`, `lost` or `open`), on `deals_outcome_list_idx`. */
export const DEAL_LIST_BY_OUTCOME = `select ${DEAL_LIST_COLUMNS}
from playbook.deals d
where organization_id = $1 and outcome = $5::text and (created_at, id) < ($2::timestamptz, $3::text)
order by created_at desc, id desc
limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)}`

/**
 * {@link DEAL_LIST} for Deals that did (`$5` true) or never did (`$5` false) appear in an import, on
 * `deals_import_list_idx`: the second is the list of Deals only a Call upload created, where a typo
 * shows.
 */
export const DEAL_LIST_BY_IMPORT_FLAG = `select ${DEAL_LIST_COLUMNS}
from playbook.deals d
where organization_id = $1 and appeared_in_import = $5::boolean and (created_at, id) < ($2::timestamptz, $3::text)
order by created_at desc, id desc
limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)}`

/**
 * Set a Deal's Outcome (an Owner or Admin may set or correct any Deal's, ADR 0018 choice 5). `$1`
 * Organization, `$2` the Deal, `$3` the Outcome, `$4` the closing date (`YYYY-MM-DD`, a calendar date with no time or zone; a full timestamp is cut to its date text) and `$5` whether to set it
 * (false leaves `closed_at` as it is; true with a null `$4` clears it). The row is locked first, so
 * two changes queue and each sees the other's result. When the Outcome or the closing time
 * changes, `outcome_seq` rises by exactly one in the same write (a trigger refuses any other
 * move); when nothing changes it does not, so a repeat is idempotent and publishes nothing. The
 * answer is the Deal's state after the call with `changed`; no row when the Deal does not exist.
 * Publish the Outcome-changed message with the returned `outcome_seq` when `changed`.
 */
export const DEAL_SET_OUTCOME = `with cur as (
  select * from playbook.deals where organization_id = $1 and id = $2 for no key update),
u as (
  update playbook.deals d
  set outcome = $3::text, closed_at = case when $5::boolean then $4::date else d.closed_at end,
      outcome_seq = d.outcome_seq + 1, updated_at = clock_timestamp()
  from cur
  where d.organization_id = $1 and d.id = cur.id
    and (d.outcome is distinct from $3::text or ($5::boolean and d.closed_at is distinct from $4::date))
  returning d.*)
select ${DEAL_COLUMNS_OF('u')}, true as changed from u
union all
select ${DEAL_COLUMNS_OF('cur')}, false from cur where not exists (select 1 from u)`

/** The Deal count of an Organization, kept by a trigger: the quota check reads this one row. */
export const DEAL_USAGE = `select deal_count
from playbook.organization_usage
where organization_id = $1`

/** The columns a Deal import answer carries; the counts exist only once the import completed. */
const DEAL_IMPORT_COLUMNS = `id, state, failure_reason,
  case when state = 'completed' then row_count end as row_count,
  case when state = 'completed' then applied_count end as applied_count,
  case when state = 'completed' then rejected_count end as rejected_count,
  uploaded_by, created_at, updated_at`

/**
 * Record an uploaded CSV as a Deal import and queue its job, unless the Organization already has
 * {@link MAX_QUEUED_DEAL_IMPORTS} unfinished imports. `$1` Organization, `$2` the new `dimp_…` id,
 * `$3` the uploader, `$4` the object key the CSV was stored under, `$5` its size in bytes (1 to 10
 * MiB). One call to `playbook.insert_deal_import`, which takes an advisory lock on the Organization's
 * import cap, **then** counts the imports in `uploaded` or `processing` and inserts, as separate
 * statements inside the function, so each sees the commits that the lock waited for (a single SQL
 * statement could not: its snapshot is taken before the wait). One row, `result`: `created`, with
 * the import's columns, or `busy`, with those columns null and **nothing stored** (the service
 * removes the CSV it already stored and answers `409`). Run it in the transaction of the upload's
 * idempotency key ({@link IDEMPOTENCY_BEGIN} first, then this): the key insert is what lets the
 * orphan sweep see a CSV whose outcome was unknown. The lock is held to the end of the transaction
 * and is the Organization's alone (it is not {@link QUOTA_LOCK}): two imports of one Organization
 * uploading at once queue, and imports of other Organizations never wait. The trigger notes the
 * `import_apply` hint.
 */
export const DEAL_IMPORT_INSERT = `select * from playbook.insert_deal_import($1::text, $2::text, $3::text, $4::text, $5::bigint, ${MAX_QUEUED_DEAL_IMPORTS})`

/** Read one Deal import. `$1` Organization, `$2` the `dimp_…` id. No row when absent or erased. */
export const DEAL_IMPORT_GET = `select ${DEAL_IMPORT_COLUMNS}
from playbook.deal_imports
where organization_id = $1 and id = $2 and erased_at is null`

/**
 * List the Deal imports, newest first, by keyset: `$1` Organization, `$2` and `$3` the cursor (the
 * last row's `cursor_at`, a text, never a Date, and `id`; `'infinity'` and `''` first), `$4` the page size, clamped to 1..{@link DOCUMENT_LIST_MAX_PAGE}.
 * On `deal_imports_list_idx`.
 */
export const DEAL_IMPORT_LIST = `select ${DEAL_IMPORT_COLUMNS}, created_at::text as cursor_at
from playbook.deal_imports
where organization_id = $1 and erased_at is null and (created_at, id) < ($2::timestamptz, $3::text)
order by created_at desc, id desc
limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)}`

/**
 * Claim due import jobs under a lease, as {@link INGESTION_JOB_CLAIM} does for documents: `$1`
 * Organization, `$2` how many (clamped to 1..{@link PLAYBOOK_MAX_BATCH}), `$3` the lease in
 * milliseconds (raised to {@link PLAYBOOK_MIN_LEASE_MS}). It takes `uploaded` imports and
 * `processing` ones whose lease lapsed, never an erased one and never one at the attempt bound
 * ({@link DEAL_IMPORT_GIVE_UP_SPENT} fails those), skipping rows another transaction holds. Each
 * row carries the `claim_token` that fences every later write and `last_row_number`, the highest
 * report row recorded (null for none). The report is always contiguous from row 2: send the next
 * batch from the row after it. Rows at or below it are never read again.
 */
export const DEAL_IMPORT_CLAIM = `with due as (
  select id from playbook.deal_imports
  where organization_id = $1 and state in ('uploaded', 'processing') and erased_at is null
    and attempts < ${DEAL_IMPORT_MAX_ATTEMPTS} and next_attempt_at <= clock_timestamp()
  order by next_attempt_at
  limit ${BATCH('$2')}
  for update skip locked)
update playbook.deal_imports i
set state = 'processing', attempts = i.attempts + 1, claim_token = gen_random_uuid(),
    next_attempt_at = clock_timestamp() + ${LEASE('$3')}, updated_at = clock_timestamp()
from due
where i.organization_id = $1 and i.id = due.id
returning i.id, i.object_key, i.size_bytes, i.attempts, i.claim_token,
  case when i.report_through > 1 then i.report_through end as last_row_number`

/**
 * Extend the lease of a claimed import: `$1` Organization, `$2` the import, `$3` the claim token,
 * `$4` the new lease in milliseconds. No row when the token no longer holds (the import was
 * claimed again, finished or erased): stop.
 */
export const DEAL_IMPORT_HEARTBEAT = `update playbook.deal_imports
set next_attempt_at = clock_timestamp() + ${LEASE('$4')}, updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null
returning id`

/**
 * Give a claimed import back to the queue after a failure that may pass: `$1` Organization, `$2`
 * the import, `$3` the claim token, `$4` the delay in milliseconds (cut to
 * {@link INGESTION_MAX_RETRY_DELAY_MS}). Rows already recorded stay; the next claim resumes.
 */
export const DEAL_IMPORT_RETRY = `update playbook.deal_imports
set state = 'uploaded', claim_token = null,
    next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), ${INGESTION_MAX_RETRY_DELAY_MS}) / 1000),
    updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null
returning id, attempts`

/**
 * Apply one bounded batch of CSV rows to the Deals and record the report, in one statement. `$1`
 * Organization, `$2` the import, `$3` the claim token, `$4` a JSON array of rows, `$5` the
 * Organization's Deal limit (the service's number, ADR 0018 leaves it to the ticket), `$6` how many
 * rows to take (clamped to 1..{@link DEAL_IMPORT_APPLY_BATCH}; the first rows by row number are
 * taken and the answer's `taken` says how many). Each element is
 * `{row_number, deal_id, reason, outcome, closed_at, amount, currency, name}` (`closed_at` a `YYYY-MM-DD` date) as the contract's
 * `checkDealImportRow` produced it: `reason` is its rejection or null, `deal_id` is null only for
 * `invalid_deal_id`, `wrong_column_count` and `blank_row` (a row with no cells), a blank cell is null. **Run {@link QUOTA_LOCK} first
 * in the same transaction** (the statement refuses without it), so the Deal count and the existing
 * Deals are read after the lock.
 *
 * **Order.** The report is contiguous from row 2 (the header is row 1): the import row keeps
 * `report_through`, the highest row number in it, and a check ties `applied_count + rejected_count`
 * to `report_through - 1`. The statement reads only the rows numbered `report_through + 1`,
 * `report_through + 2` and so on without a gap (a row at or below `report_through` is skipped, so a
 * batch resent after a lost answer changes nothing; a row after a gap is not taken) and the answer's
 * `taken` says how many it took and `through` the new `report_through`: send the next batch from
 * the row after it. A row is therefore judged only after every row before it was judged, which makes
 * "the first row of a deal id wins" exact. Every row it takes is decided in the same statement: it
 * locks the Deals the batch names (`for update`, in id order, which reads the newest committed version
 * after waiting for a concurrent Outcome change), so no row is left undecided; a Deal that
 * another transaction decided meanwhile is `outcome_already_decided`. Nothing else inserts a Deal
 * without the upload lock, so the insert has no conflict to lose (a conflict, like an undecided
 * row, aborts the statement and records nothing). The statement raises
 * `playbook.upload_lock` when the transaction does not hold the lock.
 *
 * Rules, per row in row order: a deal id seen earlier in the file (this batch or an earlier one) is
 * `duplicate_in_file`, whatever else is wrong with the repeat; the row's own `reason` is kept; a
 * Deal that is `won` or `lost` is `outcome_already_decided`, even for a row that says the same; a
 * Deal that is `open` takes the row (the Outcome if the row has one, and the closing time, amount,
 * currency and name when the cell is not blank; a blank cell never clears a value; the Outcome
 * sequence rises when the Outcome or closing time changes); an unknown deal id creates an open or
 * decided Deal (`appeared_in_import` true) unless the count would pass `$5` (`deal_limit_reached`;
 * a later row that would create one is refused too). No row at all when the claim token does not hold. The Outcome sequence
 * is limited by `DEAL_MAX_SEQ` (the column is a 32-bit integer; a Deal whose sequence is at the
 * ceiling cannot take another Outcome change, and the write fails rather than wraps).
 *
 * **What the service must do.** It counts the CSV's records itself and enforces `too_many_rows`
 * ({@link DEAL_IMPORT_MAX_ROWS}) before applying anything, sends each row number once per batch, and
 * passes the true data-row count to {@link DEAL_IMPORT_FINISH}. A row number outside 2 to
 * `DEAL_IMPORT_MAX_ROWS + 1` or repeated within one batch is refused cleanly: the batch takes
 * nothing, records nothing, and the `summary` row's `refusal` is `row_number_range` or
 * `row_number_repeated` (null otherwise). A malformed `$4` JSON or a non-integer row number
 * raises a data exception (SQLSTATE class 22): a programming error, not data.
 *
 * The answer: one `summary` row (`taken`, `applied`, `rejected`, `through`, `refusal`) and one
 * `outcome_changed` row per Deal this statement moved (`deal_record_id`, `outcome_seq`, read from the
 * locked row the import changed, so a portal change made meanwhile never makes a second message):
 * publish the Outcome-changed message for each.
 */
export const DEAL_IMPORT_APPLY = `with imp as (
  select id, report_through, playbook.require_upload_lock($1) as lock_held from playbook.deal_imports
  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null
  for update),
raw as (
  select x.row_number, x.deal_id, x.reason, x.outcome, x.closed_at, x.amount, x.currency, x.name
  from imp, jsonb_to_recordset($4::jsonb) as x(row_number int, deal_id text, reason text, outcome text, closed_at date, amount numeric, currency text, name text)),
refuse as (
  select case
    when exists (select 1 from raw where row_number is null or row_number not between 2 and ${DEAL_IMPORT_MAX_ROWS + 1}) then 'row_number_range'
    when exists (select 1 from raw group by row_number having count(*) > 1) then 'row_number_repeated'
  end as why),
sent as (
  select raw.row_number, raw.deal_id, raw.reason, raw.outcome, raw.closed_at, raw.amount, raw.currency, raw.name,
    imp.report_through as base, dense_rank() over (order by raw.row_number) as rk
  from imp, raw
  where raw.row_number > imp.report_through and (select why from refuse) is null),
b as (
  select row_number, deal_id, reason, outcome, closed_at, amount, currency, name
  from sent where row_number = base + rk
  order by row_number
  limit ${CLAMP('$6', DEAL_IMPORT_APPLY_BATCH)}),
lk as (
  select d.id, d.deal_id, d.outcome, d.outcome_seq, d.closed_at from playbook.deals d
  where d.organization_id = $1 and d.deal_id in (select deal_id from b where deal_id is not null)
  order by d.id
  for update),
ranked as (
  select b.*, row_number() over (partition by b.deal_id order by b.row_number) as nth from b),
seen as (
  select r.deal_id from playbook.deal_import_rows r
  where r.organization_id = $1 and r.import_id = $2 and r.reason is distinct from 'duplicate_in_file'
    and r.deal_id in (select deal_id from b)),
cls as (
  select k.*, d.id as deal_pk, d.outcome as cur_outcome, d.outcome_seq as cur_seq, d.closed_at as cur_closed_at,
    case
      when k.deal_id is not null and (k.nth > 1 or k.deal_id in (select deal_id from seen)) then 'duplicate_in_file'
      when k.reason is not null then k.reason
      when d.id is not null and d.outcome <> 'open' then 'outcome_already_decided'
    end as bad
  from ranked k left join lk d on d.deal_id = k.deal_id),
fin as (
  select c.*,
    case when c.bad is null and c.deal_pk is null
      and coalesce((select deal_count from playbook.organization_usage where organization_id = $1), 0)
        + count(*) filter (where c.bad is null and c.deal_pk is null) over (order by c.row_number) > $5::bigint
      then 'deal_limit_reached' else c.bad end as final_bad
  from cls c),
upd as (
  update playbook.deals d
  set outcome = f.outcome,
      outcome_seq = d.outcome_seq + (case when f.outcome <> d.outcome or coalesce(f.closed_at, d.closed_at) is distinct from d.closed_at then 1 else 0 end),
      closed_at = coalesce(f.closed_at, d.closed_at), amount = coalesce(f.amount, d.amount),
      currency = coalesce(f.currency, d.currency), name = coalesce(f.name, d.name),
      appeared_in_import = true, updated_at = clock_timestamp()
  from fin f
  where d.organization_id = $1 and d.id = f.deal_pk and f.final_bad is null and d.outcome = 'open'
  returning d.id, d.deal_id, d.outcome_seq, (d.outcome_seq <> f.cur_seq) as bumped),
ins as (
  insert into playbook.deals (id, organization_id, deal_id, name, outcome, closed_at, amount, currency, appeared_in_import)
  select 'deal_' || replace(gen_random_uuid()::text, '-', ''), $1, f.deal_id, f.name, f.outcome, f.closed_at, f.amount, f.currency, true
  from fin f where f.final_bad is null and f.deal_pk is null
  returning deal_id),
res as (
  select f.row_number, f.deal_id, f.final_bad as reason from fin f where f.final_bad is not null
  union all select f.row_number, f.deal_id, null from fin f join upd u on u.id = f.deal_pk where f.final_bad is null
  union all select f.row_number, f.deal_id, null from fin f join ins i on i.deal_id = f.deal_id where f.final_bad is null and f.deal_pk is null),
rep as (
  insert into playbook.deal_import_rows (organization_id, import_id, row_number, deal_id, result, reason)
  select $1, $2, res.row_number, res.deal_id, case when res.reason is null then 'applied' else 'rejected' end, res.reason
  from res
  returning result),
cnt as (
  update playbook.deal_imports
  set applied_count = applied_count + (select count(*) from rep where result = 'applied'),
      rejected_count = rejected_count + (select count(*) from rep where result = 'rejected'),
      report_through = report_through + (select count(*) from b),
      updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and exists (select 1 from imp)
  returning report_through)
select 'summary' as kind, null::text as deal_record_id, null::int as outcome_seq,
  (select count(*) from b)::int as taken,
  (select count(*) from rep where result = 'applied')::int as applied,
  (select count(*) from rep where result = 'rejected')::int as rejected,
  (select report_through from cnt) as through,
  (select why from refuse) as refusal
where exists (select 1 from imp)
union all
select 'outcome_changed', u.id, u.outcome_seq, null, null, null, null, null from upd u where u.bumped`

/**
 * Finish an import whose rows are all reported: `$1` Organization, `$2` the import, `$3` the claim
 * token, `$4` the number of data rows in the CSV. It completes only if the report is contiguous
 * through the last row (`report_through = $4 + 1`, and the table check ties the counts to it), else
 * returns no row: send the rows after `report_through`. **Remove the stored CSV first**; this records that it is gone (`object_removed_at`). The
 * row has the three counts of the contract's import.
 */
export const DEAL_IMPORT_FINISH = `update playbook.deal_imports
set state = 'completed', claim_token = null, row_count = applied_count + rejected_count,
    object_removed_at = clock_timestamp(), finished_at = clock_timestamp(), updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null
  and report_through = $4::int + 1
returning id, row_count, applied_count, rejected_count`

/**
 * End a claimed import as failed with a reason: `$1` Organization, `$2` the import, `$3` the claim
 * token, `$4` the reason (`too_many_rows`, `unreadable` or `processing_failed`). Rows already
 * applied stay applied and in the report. **Remove the stored CSV first**; this records that it is
 * gone.
 */
export const DEAL_IMPORT_FAIL = `update playbook.deal_imports
set state = 'failed', failure_reason = $4::text, claim_token = null,
    object_removed_at = clock_timestamp(), finished_at = clock_timestamp(), updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null
returning id`

/**
 * Fail the imports that reached the attempt bound ({@link DEAL_IMPORT_MAX_ATTEMPTS}) and whose
 * lease lapsed: `$1` Organization, `$2` how many (clamped). The reason is `processing_failed`; the
 * rows are `id` and `object_key`, whose stored CSVs the service removes and then records with
 * {@link DEAL_IMPORT_OBJECT_REMOVED}.
 */
export const DEAL_IMPORT_GIVE_UP_SPENT = `with batch as (
  select id from playbook.deal_imports
  where organization_id = $1 and state in ('uploaded', 'processing') and erased_at is null
    and attempts >= ${DEAL_IMPORT_MAX_ATTEMPTS} and next_attempt_at <= clock_timestamp()
  order by next_attempt_at
  limit ${BATCH('$2')}
  for update skip locked)
update playbook.deal_imports t
set state = 'failed', failure_reason = 'processing_failed', claim_token = null,
    finished_at = clock_timestamp(), updated_at = clock_timestamp()
from batch
where t.organization_id = $1 and t.id = batch.id
returning t.id, t.object_key`

/**
 * Record that the stored CSV of an import is removed: `$1` Organization, `$2` the import. Only for
 * an import that ended without finishing through {@link DEAL_IMPORT_FINISH} or
 * {@link DEAL_IMPORT_FAIL} (which record it themselves): a spent one from
 * {@link DEAL_IMPORT_GIVE_UP_SPENT}, or an erased one from {@link DEAL_IMPORT_ERASE_BATCH}.
 * Idempotent.
 */
export const DEAL_IMPORT_OBJECT_REMOVED = `update playbook.deal_imports
set object_removed_at = coalesce(object_removed_at, clock_timestamp()), updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and (erased_at is not null or state = 'failed')
returning id`

/** One page of an import's report by row number: `$1` Organization, `$2` the import, `$3` the last row number of the previous page (0 for the first), `$4` the page size (clamped). On the primary key. */
export const DEAL_IMPORT_ROWS_LIST = `select row_number, deal_id, result, reason
from playbook.deal_import_rows
where organization_id = $1 and import_id = $2 and row_number > $3::int
order by row_number
limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)}`

/** {@link DEAL_IMPORT_ROWS_LIST} for one result (`$5`: `applied` or `rejected`), on `deal_import_rows_result_idx`. */
export const DEAL_IMPORT_ROWS_LIST_BY_RESULT = `select row_number, deal_id, result, reason
from playbook.deal_import_rows
where organization_id = $1 and import_id = $2 and result = $5::text and row_number > $3::int
order by row_number
limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)}`

/**
 * One batch of an erasure of Deal imports: `$1` Organization, `$2` batch size (clamped). It takes the
 * first imports, in id order, that are not yet erased (`deal_imports_unerased_idx`), marks them
 * erased, ends an active one as `failed` with `processing_failed` (its job is fenced: no claim,
 * heartbeat, apply or finish holds any more) and returns each as `id`, `object_key` and
 * `object_pending`, true when the CSV may still be stored: **remove it, then call
 * {@link DEAL_IMPORT_OBJECT_REMOVED}**. An import that ended normally already recorded its removal.
 * Repeat until no row comes back. Then purge each with {@link DEAL_IMPORT_PURGE_BATCH}. If the answer
 * is lost (a crash, a timeout), the ids are not lost: {@link DEAL_IMPORT_LIST_ERASED} names every
 * erased import not yet purged, and an erasure starts by finishing those.
 */
export const DEAL_IMPORT_ERASE_BATCH = `with batch as (
  select id from playbook.deal_imports
  where organization_id = $1 and erased_at is null
  order by id
  limit ${BATCH('$2')}
  for update)
update playbook.deal_imports i
set state = case when i.state in ('uploaded', 'processing') then 'failed' else i.state end,
    failure_reason = case when i.state in ('uploaded', 'processing') then 'processing_failed' else i.failure_reason end,
    finished_at = coalesce(i.finished_at, clock_timestamp()), claim_token = null,
    erased_at = clock_timestamp(), updated_at = clock_timestamp()
from batch
where i.organization_id = $1 and i.id = batch.id
returning i.id, i.object_key, (i.object_removed_at is null) as object_pending`

/**
 * One page of the imports that are erased and not yet purged, by id: `$1` Organization, `$2` the last
 * id of the previous page (`''` for the first), `$3` the page size (clamped to
 * 1..{@link DOCUMENT_LIST_MAX_PAGE}). Rows: `id`, `object_key` and `object_pending` (true while the
 * CSV is not recorded removed). It is how an erasure interrupted after {@link DEAL_IMPORT_ERASE_BATCH}
 * committed is finished, because every other statement filters `erased_at is null` and
 * {@link DEAL_IMPORT_PURGE_BATCH} needs the id: **list first, remove each pending CSV and record it
 * with {@link DEAL_IMPORT_OBJECT_REMOVED}, purge each import, and only then erase more**. On
 * `deal_imports_erased_idx`.
 */
export const DEAL_IMPORT_LIST_ERASED = `select id, object_key, (object_removed_at is null) as object_pending
from playbook.deal_imports
where organization_id = $1 and erased_at is not null and id > $2::text
order by id
limit ${CLAMP('$3', DOCUMENT_LIST_MAX_PAGE)}`

/**
 * Purge an erased import in bounded steps: `$1` Organization, `$2` the import, `$3` how many report
 * rows to delete (clamped). It does nothing unless the import is erased and its stored CSV is
 * recorded removed. One call deletes up to `$3` report rows; a call that finds none left deletes the
 * import row itself (`import_deleted` true). Repeat until `import_deleted`. The foreign key does not
 * cascade, so the import row cannot go while a report row remains.
 */
export const DEAL_IMPORT_PURGE_BATCH = `with imp as (
  select id from playbook.deal_imports
  where organization_id = $1 and id = $2 and erased_at is not null and object_removed_at is not null
  for update),
pick as (
  select r.row_number from playbook.deal_import_rows r, imp
  where r.organization_id = $1 and r.import_id = $2
  order by r.row_number
  limit ${BATCH('$3')}),
del as (
  delete from playbook.deal_import_rows r
  using pick
  where r.organization_id = $1 and r.import_id = $2 and r.row_number = pick.row_number
  returning 1),
gone as (
  delete from playbook.deal_imports i
  using imp
  where i.organization_id = $1 and i.id = imp.id
    and not exists (select 1 from playbook.deal_import_rows x where x.organization_id = $1 and x.import_id = $2)
  returning 1)
select (select count(*) from del)::int as deleted_rows, exists (select 1 from gone) as import_deleted
where exists (select 1 from imp)`

/**
 * Erase one bounded batch of Deals: `$1` Organization, `$2` batch size (clamped); the number deleted
 * comes back as `deleted`. Repeat until 0. `playbook.erase_deals` takes the upload lock first (see the
 * migration) and runs in the Organization's scope only.
 */
export const DEAL_ERASE_BATCH = `select playbook.erase_deals($1::text, $2::int) as deleted`

/** The rights confirmation of the Organization: `$1` Organization. No row when none was recorded. */
export const RIGHTS_GET = `select confirmed_by, confirmed_at, wording_version
from playbook.rights_confirmations
where organization_id = $1`

/**
 * Record the rights confirmation (ADR 0018 choice 12): `$1` Organization, `$2` the confirming
 * member, `$3` the wording version shown (the service checks it is the current one first). A
 * version above the stored one replaces it; the same version keeps the first confirmation (its
 * member and time), so a repeat is idempotent; a lower version is ignored. The row is the stored
 * confirmation after the call, with `recorded` true when this call wrote it. Whether the stored
 * version is the current one is the service's comparison, and the Call upload statement (a later
 * migration) takes the current version as a parameter and refuses unless the stored version equals
 * it, in the same statement as the insert.
 */
export const RIGHTS_CONFIRM = `with up as (
  insert into playbook.rights_confirmations as r (organization_id, confirmed_by, confirmed_at, wording_version)
  values ($1, $2::text, clock_timestamp(), $3::int)
  on conflict (organization_id) do update
    set confirmed_by = excluded.confirmed_by, confirmed_at = excluded.confirmed_at, wording_version = excluded.wording_version
    where r.wording_version < excluded.wording_version
  returning confirmed_by, confirmed_at, wording_version)
select confirmed_by, confirmed_at, wording_version, true as recorded from up
union all
select confirmed_by, confirmed_at, wording_version, false
from playbook.rights_confirmations
where organization_id = $1 and not exists (select 1 from up)`

/** Every statement above by name, for the README check and the integration tests. */
export const PLAYBOOK_STATEMENTS = {
  QUOTA_LOCK,
  QUOTA_USAGE,
  DOCUMENT_INSERT,
  DOCUMENT_BY_HASH,
  DOCUMENT_GET,
  DOCUMENT_SEARCH_STATE,
  DOCUMENT_LIST,
  DOCUMENT_LIST_DELETED,
  DOCUMENT_SOFT_DELETE,
  DOCUMENT_RESTORE,
  DOCUMENT_RESTORE_FOR_UPLOAD,
  DOCUMENT_REQUEUE,
  DOCUMENT_LIST_PENDING_CLEANUP,
  DOCUMENT_CLEANUP_BEGIN,
  DOCUMENT_CLEANUP_DONE,
  DOCUMENT_PURGE_CLAIM,
  DOCUMENT_PURGE_COMPLETE,
  INGESTION_JOB_CLAIM,
  INGESTION_JOB_HEARTBEAT,
  INGESTION_JOB_ADVANCE,
  INGESTION_JOB_RETRY,
  INGESTION_JOB_COMPLETE,
  INGESTION_JOB_FAIL,
  INGESTION_JOB_GIVE_UP_SPENT,
  CONSUMED_CLAIM,
  CONSUMED_LOOKUP,
  CONSUMED_RENEW,
  CONSUMED_COMPLETE,
  CONSUMED_RELEASE,
  CONSUMED_PURGE,
  INDEX_SETTINGS_UPSERT,
  INDEX_VECTORS_MARK,
  IDEMPOTENCY_BEGIN,
  IDEMPOTENCY_LOOKUP,
  IDEMPOTENCY_COMPLETE,
  IDEMPOTENCY_PURGE,
  DOCUMENT_ERASE_BATCH,
  ORGANIZATION_REMOVE_REST,
  ORGANIZATION_REMOVAL_STATUS,
  DOCUMENT_LIST_SPENT_PURGES,
  DOCUMENT_PURGE_RESET,
  ORPHAN_SWEEP_DONE,
  ORPHAN_SWEEP_CLAIM,
  ORPHAN_SWEEP_PAGE_DONE,
  ORPHAN_SWEEP_STATE,
  EMBED_USAGE_ADD,
  EMBED_USAGE_PURGE,
  DEAL_GET,
  DEAL_BY_DEAL_ID,
  DEAL_LIST,
  DEAL_LIST_BY_OUTCOME,
  DEAL_LIST_BY_IMPORT_FLAG,
  DEAL_SET_OUTCOME,
  DEAL_USAGE,
  DEAL_IMPORT_INSERT,
  DEAL_IMPORT_GET,
  DEAL_IMPORT_LIST,
  DEAL_IMPORT_CLAIM,
  DEAL_IMPORT_HEARTBEAT,
  DEAL_IMPORT_RETRY,
  DEAL_IMPORT_APPLY,
  DEAL_IMPORT_FINISH,
  DEAL_IMPORT_FAIL,
  DEAL_IMPORT_GIVE_UP_SPENT,
  DEAL_IMPORT_OBJECT_REMOVED,
  DEAL_IMPORT_ROWS_LIST,
  DEAL_IMPORT_ROWS_LIST_BY_RESULT,
  DEAL_IMPORT_ERASE_BATCH,
  DEAL_IMPORT_LIST_ERASED,
  DEAL_IMPORT_PURGE_BATCH,
  DEAL_ERASE_BATCH,
  RIGHTS_GET,
  RIGHTS_CONFIRM,
  ORGANIZATIONS_WITH_WORK,
  ...CALL_STATEMENTS,
} as const
