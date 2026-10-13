import {
  DOCUMENT_PURGE_MAX_ATTEMPTS,
  INGESTION_JOB_MAX_ATTEMPTS,
  INGESTION_STEPS,
} from './schema/playbook-tables'

/**
 * The least soft-delete retention, in milliseconds, {@link DOCUMENT_SOFT_DELETE} stores: one hour.
 * A smaller, null or negative value passed in is raised to it, so a bug cannot make a mistaken
 * delete unrecoverable. The lead's default is 30 days (ADR 0016); the service passes it.
 */
export const DOCUMENT_MIN_RETENTION_MS = 3_600_000

/** The least lease, in milliseconds, any claim or renewal below stores; a smaller value is raised to it. */
export const PLAYBOOK_MIN_LEASE_MS = 1000

/** The longest delay, in milliseconds, {@link INGESTION_JOB_RETRY} will impose; a longer one is cut to it. */
export const INGESTION_MAX_RETRY_DELAY_MS = 3_600_000

/** The most documents one {@link DOCUMENT_LIST} or {@link DOCUMENT_LIST_DELETED} page returns, whatever limit is asked for. */
export const DOCUMENT_LIST_MAX_PAGE = 100

/**
 * The most rows any batch statement takes, whatever size is passed in: the purge claim, the job
 * claim, the give-up, and the two purges. A null, zero or negative size is raised to 1.
 */
export const PLAYBOOK_MAX_BATCH = 500

/** The least age, in milliseconds, {@link IDEMPOTENCY_PURGE} removes a key at: one hour. */
export const IDEMPOTENCY_MIN_PURGE_AGE_MS = 3_600_000

// A batch size or page size clamped to 1..max in SQL, null included.
const CLAMP = (parameter: string, max: number) =>
  `least(greatest(coalesce(${parameter}::int, 1), 1), ${max})`
const BATCH = (parameter: string) => CLAMP(parameter, PLAYBOOK_MAX_BATCH)

const LEASE = (parameter: string) =>
  `make_interval(secs => greatest(coalesce(${parameter}::float8, 0), ${PLAYBOOK_MIN_LEASE_MS}) / 1000)`

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
 * only the matching one runs.
 */
export const DOCUMENT_LIST_FILTERED = `select * from (
  (select ${DOCUMENT_COLUMNS} from playbook.documents
   where $5::text is null and organization_id = $1 and state <> 'deleted'
     and (created_at, id) < ($2::timestamptz, $3::text)
   order by created_at desc, id desc limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)})
  union all
  (select ${DOCUMENT_COLUMNS} from playbook.documents
   where $5::text in ('uploaded', 'processing', 'ready', 'failed') and organization_id = $1 and state = $5::text
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
 * the least age in milliseconds (raised to {@link IDEMPOTENCY_MIN_PURGE_AGE_MS}), `$3` batch size,
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
 * How old an idempotency key is when it becomes purgeable, in milliseconds: 24 hours. Core documents
 * no age for its own keys, so this is the playbook's. `organizations_with_work` hints
 * `idempotency_purge` at this age; {@link IDEMPOTENCY_PURGE} still accepts any age above
 * {@link IDEMPOTENCY_MIN_PURGE_AGE_MS}.
 */
export const IDEMPOTENCY_PURGE_AGE_MS = 24 * 60 * 60 * 1000

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
 * consumed messages, idempotency keys and work hints. `$1` Organization, `$2` a route whose
 * idempotency keys are kept (pass {@link REMOVE_ALL_IDEMPOTENCY_ROUTE}, so the remove-all call's own
 * key survives; kept keys age out through {@link IDEMPOTENCY_PURGE}). Run it inside the
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
 * Organization's own consumed messages) and `removed`, true when all four hold. Idempotency keys
 * are not part of it (the remove-all call's own key stays until it ages out). Run it inside the
 * Organization's scope; in any other scope it returns no row, because the tenant tables would
 * otherwise look empty and answer "removed" for an Organization the caller cannot see.
 */
export const ORGANIZATION_REMOVAL_STATUS = `select
  not exists (select 1 from playbook.documents where organization_id = $1) as no_documents,
  not exists (select 1 from playbook.index_settings where organization_id = $1) as no_settings,
  not exists (select 1 from playbook.organization_usage where organization_id = $1) as no_usage,
  not exists (select 1 from playbook.consumed_message where organization_id = $1) as no_messages,
  (not exists (select 1 from playbook.documents where organization_id = $1)
    and not exists (select 1 from playbook.index_settings where organization_id = $1)
    and not exists (select 1 from playbook.organization_usage where organization_id = $1)
    and not exists (select 1 from playbook.consumed_message where organization_id = $1)) as removed
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
 * {@link IDEMPOTENCY_PURGE_AGE_MS} old) and `purge_spent` (documents whose purge reached the
 * bound). `$1` the kind, `$2` the point to continue from (null or `''` for the first call), `$3` the
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

/** Every statement above by name, for the README check and the integration tests. */
export const PLAYBOOK_STATEMENTS = {
  QUOTA_LOCK,
  QUOTA_USAGE,
  DOCUMENT_INSERT,
  DOCUMENT_BY_HASH,
  DOCUMENT_GET,
  DOCUMENT_LIST,
  DOCUMENT_LIST_DELETED,
  DOCUMENT_SOFT_DELETE,
  DOCUMENT_RESTORE,
  DOCUMENT_RESTORE_FOR_UPLOAD,
  DOCUMENT_REQUEUE,
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
  ORGANIZATIONS_WITH_WORK,
} as const
