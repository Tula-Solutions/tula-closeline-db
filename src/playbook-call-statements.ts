import {
  BATCH,
  CLAMP,
  DOCUMENT_LIST_MAX_PAGE,
  INGESTION_MAX_RETRY_DELAY_MS,
  LEASE,
} from './playbook-sql'
import {
  CALL_JOB_MAX_ATTEMPTS,
  CALL_MAX_VENDOR_SENDS,
  CALL_PENDING_CLEANUP_PREDICATE,
  CALL_PURGE_MAX_ATTEMPTS,
  CALL_VENDOR_ID_PATTERN,
  MAX_SEARCH_STATE_IDS,
} from './schema/playbook-calls'

/*
 * Sales history, part two (hub issue 68, ADR 0018): Calls, their jobs, the Outcome re-tag and the
 * erasure of Calls. Every list is a keyset on `(created_at, id)` whose cursor is the **text**
 * `cursor_at` each row carries, never a JavaScript Date (see the Deal lists). The first page passes
 * `'infinity'` and any id. A malformed cursor text raises SQLSTATE 22007. A Call is metadata only:
 * nothing here returns a turn, a sentence or audio.
 */

// The columns every Call read returns, from the Call `c` joined to its Deal `d`.
const READ_COLUMNS = `c.id, c.deal_record_id, d.deal_id, d.outcome as deal_outcome,
  (c.state = 'ready' and d.outcome = 'won' and c.tagged_outcome_seq >= d.outcome_seq) as in_search,
  c.kind, c.file_name, c.media_type, c.size_bytes, c.duration_seconds, c.state, c.failure_reason,
  c.rep_by, c.rep_label, c.rep_channel, c.speaker_labels, c.deleted_at, c.purge_due_at,
  c.uploaded_by, c.created_at, c.updated_at, c.rep_seq, c.epoch, c.deletion_seq,
  (c.state = 'deleted' and (c.purge_due_at <= clock_timestamp() or c.purge_started_at is not null or c.restore_barred_at is not null)) as not_restorable`

/**
 * The names of the columns of a Call answer, in order: the contract's `Call` fields (the Rep as
 * `rep_by`, `rep_label` and `rep_channel`; `rep` is null exactly when `rep_by` is) plus `rep_seq`,
 * `epoch` and `deletion_seq` for the messages and `not_restorable` for the 410. `in_search` and
 * `deal_outcome` come from the Deal in the same query: `in_search` is true only for a `ready` Call
 * of a `won` Deal whose tag is current (`tagged_outcome_seq >= outcome_seq`), so it is false while
 * a Rep rebuild is pending (the Call is `processing`) and while an Outcome re-tag is pending.
 * The list statements add `cursor_at`.
 */
export const CALL_ROW_FIELDS = [
  'id',
  'deal_record_id',
  'deal_id',
  'deal_outcome',
  'in_search',
  'kind',
  'file_name',
  'media_type',
  'size_bytes',
  'duration_seconds',
  'state',
  'failure_reason',
  'rep_by',
  'rep_label',
  'rep_channel',
  'speaker_labels',
  'deleted_at',
  'purge_due_at',
  'uploaded_by',
  'created_at',
  'updated_at',
  'rep_seq',
  'epoch',
  'deletion_seq',
  'not_restorable',
] as const

const FROM_CALL = `from playbook.calls c join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id`

/**
 * The Organization's Call and Recording-byte counts, from the counter row the `calls` triggers keep.
 * `$1` Organization. A Call in any state counts until it is purged or erased, `deleted` and
 * `awaiting_rep` included; Recording bytes count Recordings only. No row means nothing was ever
 * added. node-postgres returns the bigints as strings.
 */
export const CALL_USAGE = `select call_count, recording_byte_count
from playbook.organization_usage
where organization_id = $1`

/**
 * Add a Call and queue its first job in one write. **Order of the upload transaction:**
 * `IDEMPOTENCY_BEGIN` first, then `QUOTA_LOCK`, then this (the `calls_require_lock` and
 * `deals_require_lock` triggers refuse an insert without the lock). `$1` Organization, `$2` the new
 * `call_…` id, `$3` the customer's deal id (trimmed by the caller), `$4` an id for the Deal if it
 * must be created (`deal_…`), `$5` file name, `$6` media type, `$7` kind (`transcript` or
 * `recording`), `$8` size in bytes, `$9` SHA-256 of the content (32 bytes), `$10` uploader, `$11`
 * object key, `$12` to `$14` the Rep choice (`by`, `label`, `channel`; all null for a Recording that
 * will wait in `awaiting_rep`), `$15` the new job's `cjob_…` id, `$16` the most Calls, `$17` the most
 * Recording bytes in total and `$18` the most Deals the Organization may hold after this one, `$19`
 * the service's **current rights wording version**.
 *
 * One row, whose `result` says what happened, decided in this order and in one statement (so the
 * rights check, the duplicate check, the quota and the insert see one snapshot under the upload
 * lock): `rights_required` (no confirmation at exactly that version: nothing else is read or
 * written); `existing` (the same content is already stored under **this** Deal: the row carries
 * that Call's `id`, `state` and `failure_reason`; restore it with {@link CALL_RESTORE_FOR_UPLOAD} if
 * `deleted`, {@link CALL_REQUEUE} it if `failed`, else answer with it as it is); `other_deal` (the
 * same content under another Deal: refuse, saying nothing of which); `quota_exceeded`; `created`
 * (the Call is `uploaded` with a queued `transcribe` job for a Recording or `process` job for a
 * Transcript, and an unknown deal id has created an open Deal). The hash is unique per Organization
 * among Calls whose purge has not started and that erasure has not barred from restore.
 */
export const CALL_INSERT = `with rights as (
  select exists (select 1 from playbook.rights_confirmations
                 where organization_id = $1 and wording_version = $19::int) as ok),
dup as (
  select c.id, c.state, c.failure_reason, (d.deal_id = $3::text) as same_deal
  ${FROM_CALL}
  where c.organization_id = $1 and c.content_hash = $9::bytea
    and c.purge_started_at is null and c.restore_barred_at is null),
deal as (
  select id from playbook.deals where organization_id = $1 and deal_id = $3::text),
usage as (
  select call_count, recording_byte_count, deal_count from playbook.organization_usage where organization_id = $1),
gate as (
  select (select ok from rights) as rights_ok,
    not exists (select 1 from dup) as no_dup,
    (coalesce((select call_count from usage), 0) < $16::bigint
      and ($7::text <> 'recording' or coalesce((select recording_byte_count from usage), 0) + $8::bigint <= $17::bigint)
      and (exists (select 1 from deal) or coalesce((select deal_count from usage), 0) < $18::bigint)) as quota_ok),
go as (
  select 1 as one from gate where rights_ok and no_dup and quota_ok),
made as (
  insert into playbook.deals (id, organization_id, deal_id)
  select $4::text, $1, $3::text from go where not exists (select 1 from deal)
  returning id),
ins as (
  insert into playbook.calls
    (id, organization_id, deal_record_id, kind, file_name, media_type, size_bytes, content_hash,
     uploaded_by, object_key, rep_by, rep_label, rep_channel)
  select $2::text, $1, coalesce((select id from deal), (select id from made)), $7::text, $5::text, $6::text,
    $8::bigint, $9::bytea, $10::text, $11::text, $12::text, $13::text, $14::text
  from go
  returning id, state, epoch, rep_seq),
queued as (
  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)
  select $15::text, $1, id, case when $7::text = 'recording' then 'transcribe' else 'process' end, epoch, rep_seq, clock_timestamp(), clock_timestamp()
  from ins)
select 'created' as result, id, state, null::text as failure_reason from ins
union all
select case when same_deal then 'existing' else 'other_deal' end,
  case when same_deal then id end, case when same_deal then state end, case when same_deal then failure_reason end
from dup where (select ok from rights)
union all
select case when not rights_ok then 'rights_required' else 'quota_exceeded' end, null, null, null
from gate where not rights_ok or (no_dup and not quota_ok)`

/** Read one Call with its Deal's `deal_id`, Outcome and `in_search`. `$1` Organization, `$2` the Call. No row when absent. */
export const CALL_GET = `select ${READ_COLUMNS}
${FROM_CALL}
where c.organization_id = $1 and c.id = $2`

/**
 * What Postgres says about the Calls a search hit, for the playbook's `momentMayBeReturned`: the
 * derived `in_search` (state `ready`, the Deal `won`, the tag current: as in {@link CALL_GET}) and the
 * `epoch` and `rep_seq` the Call is at now, with its `deal_record_id`. `$1` Organization, `$2` an
 * array of Call ids (`text[]`). One row per id that is a Call of this Organization, in id order; an
 * unknown id, another Organization's id, an empty or null array give no row, so a hit with no row is
 * dropped. **The statement reads at most {@link MAX_SEARCH_STATE_IDS} ids**: it takes the first 100
 * of the array, so its work is bounded whatever is passed, and ids after the 100th get no row. It does
 * not refuse them (a statement cannot raise without a function), so **the caller must pass at most
 * 100**, which the search's over-fetch window (`topK` 100) already guarantees. A repeated id is
 * answered once. Reads `calls` by `calls_pkey` (Organization, id) and the Deal by its key; nothing
 * but metadata is returned, no text.
 */
export const CALL_SEARCH_STATE = `select c.id as call_id,
  (c.state = 'ready' and d.outcome = 'won' and c.tagged_outcome_seq >= d.outcome_seq) as in_search,
  c.epoch, c.rep_seq, c.deal_record_id
from playbook.calls c
join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id
where c.organization_id = $1 and c.id = any(($2::text[])[1:${MAX_SEARCH_STATE_IDS}])
order by c.id`

/** The sends of the Call aliased `alias`, as a JSON array ordered by `seq` (`[]` when none; at most {@link CALL_MAX_VENDOR_SENDS}), read through the primary key. */
const VENDOR_SENDS = (
  alias: string
) => `(select coalesce(jsonb_agg(jsonb_build_object('seq', s.seq, 'vendor_id', s.vendor_id) order by s.seq), '[]'::jsonb)
   from playbook.call_vendor_sends s
   where s.organization_id = ${alias}.organization_id and s.call_id = ${alias}.id) as vendor_sends`

const KEYSET = `(c.created_at, c.id) < ($2::timestamptz, $3::text)`
const LIST_END = `order by c.created_at desc, c.id desc
limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)}`

/**
 * List the Calls that are not deleted, newest first, one page by keyset. `$1` Organization, `$2`
 * and `$3` the `cursor_at` (text, never a Date) and `id` of the last row of the previous page
 * (`'infinity'` and `''` first), `$4` the page size (clamped to 1..{@link DOCUMENT_LIST_MAX_PAGE}).
 * One query: the Deal's `deal_id`, Outcome and `in_search` are joined, never looked up per row. On
 * `calls_list_idx`, read backwards.
 */
export const CALL_LIST = `select ${READ_COLUMNS}, c.created_at::text as cursor_at
${FROM_CALL}
where c.organization_id = $1 and c.state <> 'deleted' and ${KEYSET}
${LIST_END}`

/**
 * {@link CALL_LIST} for one state (`$5`: any of the seven, `deleted` included, which lists the Calls
 * that can still be restored). On `calls_state_list_idx`.
 */
export const CALL_LIST_BY_STATE = `select ${READ_COLUMNS}, c.created_at::text as cursor_at
${FROM_CALL}
where c.organization_id = $1 and c.state = $5::text and ${KEYSET}
${LIST_END}`

/**
 * {@link CALL_LIST} for one Deal (`$5` the Deal's `deal_…` id), the Calls that are not deleted. On
 * `calls_deal_list_idx`. The Deal's Calls in one state, `deleted` included, are
 * {@link CALL_LIST_BY_DEAL_STATE}: the two are separate statements so each keeps its index under a
 * generic plan.
 */
export const CALL_LIST_BY_DEAL = `select ${READ_COLUMNS}, c.created_at::text as cursor_at
${FROM_CALL}
where c.organization_id = $1 and c.deal_record_id = $5::text and c.state <> 'deleted' and ${KEYSET}
${LIST_END}`

/**
 * {@link CALL_LIST} for one Deal (`$5`) in one state (`$6`, any of the seven; `deleted` lists the
 * Deal's Calls that can still be restored). On `calls_deal_state_list_idx`, whose equality columns
 * are the Organization, the Deal and the state, so the page is read in order with no filter.
 * (`calls_deal_list_idx` stays: it serves {@link CALL_LIST_BY_DEAL}, which spans every state but
 * `deleted` and so needs the Deal's Calls in one `created_at` order.)
 */
export const CALL_LIST_BY_DEAL_STATE = `select ${READ_COLUMNS}, c.created_at::text as cursor_at
${FROM_CALL}
where c.organization_id = $1 and c.state = $6::text and c.deal_record_id = $5::text and ${KEYSET}
${LIST_END}`

/**
 * Soft-delete a Call, as {@link DOCUMENT_SOFT_DELETE} does a document. `$1` Organization, `$2` the
 * Call, `$3` the deleting user, `$4` the retention in milliseconds (raised to one hour). Its queued
 * or running job is cancelled first (job rows before the Call row, the lock order everywhere),
 * `epoch` and `deletion_seq` rise by one and the failure reason is cleared. Returns `id`, `state`,
 * `deletion_seq`, `purge_due_at` and `changed`; deleting a deleted Call writes nothing and returns
 * `changed` false. Publish the `playbook.call_deleted` message with `deletion_seq` only when
 * `changed`. The Call still counts toward the quota until purged.
 */
export const CALL_SOFT_DELETE = `with j as (
  update playbook.call_jobs
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp(),
      next_attempt_at = case when state = 'running' then next_attempt_at else clock_timestamp() end
  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')
  returning id),
x as (
  update playbook.calls
  set state = 'deleted', epoch = epoch + 1, deletion_seq = deletion_seq + 1,
      deleted_at = clock_timestamp(), deleted_by = $3,
      purge_due_at = clock_timestamp() + make_interval(secs => greatest(coalesce($4::float8, 0), 3600000) / 1000),
      failure_reason = null, updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and state <> 'deleted' and (select count(*) from j) >= 0
  returning id, state, deletion_seq, purge_due_at)
select id, state, deletion_seq, purge_due_at, true as changed from x
union all
select id, state, deletion_seq, purge_due_at, false from playbook.calls
where organization_id = $1 and id = $2 and state = 'deleted' and not exists (select 1 from x)`

// A restored Call goes back to the work it still needs: a Recording never transcribed is transcribed
// again; a transcribed Recording with no Rep waits for one (no job); the rest is built again from
// the kept Transcript (a Recording is never transcribed twice).
const RESTORE = (dueGuard: string) => `with j as (
  update playbook.call_jobs
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')
    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = $2 and x.state = 'deleted')
  returning id),
x as (
  update playbook.calls
  set state = case when kind = 'recording' and transcript_key is null then 'uploaded'
                   when rep_by is null then 'awaiting_rep' else 'processing' end,
      epoch = epoch + 1, deleted_at = null, deleted_by = null, purge_due_at = null, updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is null and restore_barred_at is null${dueGuard}
    and (select count(*) from j) >= 0
  returning organization_id, id, epoch, deletion_seq, state, rep_seq),
queued as (
  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)
  select $3::text, organization_id, id, case when state = 'uploaded' then 'transcribe' else 'process' end, epoch, rep_seq, clock_timestamp(), clock_timestamp()
  from x where state <> 'awaiting_rep')
select id, state, epoch, deletion_seq, true as changed from x
union all
select id, state, epoch, deletion_seq, false from playbook.calls
where organization_id = $1 and id = $2 and state <> 'deleted' and not exists (select 1 from x)`

/**
 * Restore a soft-deleted Call and queue its work. `$1` Organization, `$2` the Call, `$3` the new
 * job's id. Only a `deleted` Call whose purge time has not passed and whose purge has not started,
 * and that erasure has not barred. The state it comes back in is the work that remains:
 * `uploaded` with a `transcribe` job when the Recording was never transcribed; `awaiting_rep` with
 * no job when it was transcribed and has no Rep; otherwise `processing` with a `process` job
 * (the contract's "processing"). It cancels a job left on the deleted Call first and bumps `epoch`.
 * A Call that is not deleted returns its state with `changed` false. No row: gone, its purge has
 * started, or it lost a race (read it, as for a document). Against a purge claim the row lock
 * decides, as for documents.
 */
export const CALL_RESTORE = RESTORE('\n    and purge_due_at > clock_timestamp()')

/** The restore for an upload that matches a deleted Call: as {@link CALL_RESTORE} without the purge-time check. */
export const CALL_RESTORE_FOR_UPLOAD = RESTORE('')

/**
 * Re-queue a `failed` Call when a same-Deal upload of the same content arrives: only for the three
 * transient reasons (`transcription_failed`, `transcription_timed_out`, `processing_failed`: the
 * contract's `callReuploadRequeues`); it goes back to `uploaded` with a queued `transcribe` job
 * (when there is no kept Transcript) or `process` job. `$1` Organization, `$2` the Call, `$3` the new
 * job's id. Any other Call, a failed one with another reason included, is returned as it is with
 * `changed` false and nothing written, except a deleted one (no row: restore it instead). A Call
 * that has used all its vendor sends (`vendor_send_seq` at the bound of 20) is also returned as it
 * is: another job could only answer `sent: false` and fail again, so a re-upload does not loop.
 */
export const CALL_REQUEUE = `with j as (
  update playbook.call_jobs
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')
    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = $2 and x.state = 'failed'
                and x.failure_reason in ('transcription_failed', 'transcription_timed_out', 'processing_failed')
                and x.vendor_send_seq < ${CALL_MAX_VENDOR_SENDS})
  returning id),
x as (
  update playbook.calls
  set state = 'uploaded', failure_reason = null, epoch = epoch + 1, updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and state = 'failed'
    and failure_reason in ('transcription_failed', 'transcription_timed_out', 'processing_failed')
    and vendor_send_seq < ${CALL_MAX_VENDOR_SENDS}
    and (select count(*) from j) >= 0
  returning organization_id, id, epoch, rep_seq, kind, transcript_key),
queued as (
  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)
  select $3::text, organization_id, id, case when kind = 'recording' and transcript_key is null then 'transcribe' else 'process' end,
    epoch, rep_seq, clock_timestamp(), clock_timestamp()
  from x)
select id, 'uploaded' as state, epoch, true as changed from x
union all
select id, state, epoch, false from playbook.calls
where organization_id = $1 and id = $2 and state <> 'deleted' and not exists (select 1 from x)`

/**
 * Pick or change a Call's Rep. `$1` Organization, `$2` the Call, `$3` `speaker` or `channel`, `$4`
 * the speaker label (for `speaker`), `$5` the channel (for `channel`), `$6` the new job's id. One
 * row, whose `result` is decided in the statement under the row lock (so two changes queue):
 * `not_changeable` (the contract's `repChangeAllowed` is false: only `ready`, `awaiting_rep`, or
 * `failed` with `rep_label_not_found` or `not_per_side` may change it); `invalid` (the choice does
 * not suit the kind: a Transcript takes a speaker only; or the label is not among the Call's
 * speaker labels; or the channel is not `left` or `right`); `unchanged` (the Call already has this
 * Rep and is not `failed`: nothing is written, whatever its state, so a repeat of a request
 * answers 200 even while the rebuild runs); `changed`. A null or unknown `$3` is `invalid` whatever the state. **Lock order:** the Call's active job rows
 * first (`for update`), then the Call row, the order of every statement that takes both (the
 * claim, the delete, the completion), so a Rep change cannot deadlock with a job claim. A change bumps `rep_seq` by one, cancels
 * the Call's job, moves the Call to `processing` with the failure reason cleared and queues a
 * `rebuild` job carrying the new `rep_seq` in the same write: the Call is out of search until
 * the rebuild finishes ({@link CALL_JOB_COMPLETE} applies only while the stored `rep_seq` still
 * equals the job's, so a later change always wins). Publish `playbook.call_rep_changed` with the
 * returned `rep_seq` only when `result` is `changed`. No row when the Call does not exist.
 */
export const CALL_SET_REP = `with jl as (
  select id from playbook.call_jobs
  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')
  order by id
  for update),
cur as (
  select * from playbook.calls where organization_id = $1 and id = $2 and (select count(*) from jl) >= 0 for update),
v as (
  select cur.id, cur.state, cur.rep_seq,
    case
      when $3::text is null or $3::text not in ('speaker', 'channel') then 'invalid'
      when cur.state <> 'deleted' and cur.rep_by is not distinct from $3::text
        and cur.rep_label is not distinct from (case when $3::text = 'speaker' then $4::text end)
        and cur.rep_channel is not distinct from (case when $3::text = 'channel' then $5::text end)
        and cur.state <> 'failed' then 'unchanged'
      when not (cur.state in ('ready', 'awaiting_rep')
                or (cur.state = 'failed' and cur.failure_reason in ('rep_label_not_found', 'not_per_side')))
        then 'not_changeable'
      when not coalesce(($3::text = 'speaker' and ($4::text is not null and $4::text = any(cur.speaker_labels)))
                or ($3::text = 'channel' and cur.kind = 'recording' and $5::text in ('left', 'right')), false) then 'invalid'
      else 'changed'
    end as result
  from cur),
j as (
  update playbook.call_jobs
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and id in (select id from jl)
    and exists (select 1 from v where result = 'changed')
  returning id),
u as (
  update playbook.calls c
  set rep_by = $3::text, rep_label = case when $3::text = 'speaker' then $4::text end,
      rep_channel = case when $3::text = 'channel' then $5::text end,
      rep_seq = c.rep_seq + 1, state = 'processing', failure_reason = null, updated_at = clock_timestamp()
  from v
  where c.organization_id = $1 and c.id = v.id and v.result = 'changed' and (select count(*) from j) >= 0
  returning c.id, c.rep_seq, c.epoch),
queued as (
  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)
  select $6::text, $1, id, 'rebuild', epoch, rep_seq, clock_timestamp(), clock_timestamp() from u)
select 'changed' as result, id, 'processing'::text as state, rep_seq from u
union all
select result, id, state, rep_seq from v where result <> 'changed'`

// A job is live while its Call is at the job's epoch and in a state its kind works on.
const LIVE = (job: string, call: string) => `(${call}.epoch = ${job}.epoch and (
    (${job}.kind = 'transcribe' and ${call}.state in ('uploaded', 'transcribing'))
    or (${job}.kind = 'process' and ${call}.state in ('uploaded', 'processing'))
    or (${job}.kind = 'rebuild' and ${call}.state = 'processing' and ${call}.rep_seq = ${job}.rep_seq)))`

const CLAIM_COLUMNS = [
  'id',
  'call_id',
  'job_kind',
  'epoch',
  'rep_seq',
  'attempts',
  'claim_token',
  'call_kind',
  'media_type',
  'size_bytes',
  'object_key',
  'transcript_key',
  'rep_by',
  'rep_label',
  'rep_channel',
  'speaker_labels',
  'sent_to_vendor_at',
  'job_created_at',
  'content_hash',
] as const

/**
 * Claim due Call jobs as a lease, in a short transaction that commits at once. `$1` Organization,
 * `$2` batch size, `$3` the lease in milliseconds (raised to one second), `$4` one job id or null
 * for any. As {@link INGESTION_JOB_CLAIM} does for documents: each claim counts an attempt and
 * issues a `claim_token` every later statement must present; a job is taken only while its Call is
 * live for it (`transcribe`: `uploaded` or `transcribing`; `process`: `uploaded` or `processing`;
 * `rebuild`: `processing` with the job's `rep_seq`; always at the job's epoch) and a due job whose
 * Call is not is cancelled in the same statement; the claim moves an `uploaded` Call to
 * `transcribing` or `processing`. A job with all ${CALL_JOB_MAX_ATTEMPTS} attempts used is never
 * claimed ({@link CALL_JOB_GIVE_UP_SPENT} resolves it). Locks: job rows (`skip locked`), then the
 * Call row, the order everywhere. Rows are the claimed jobs with what the worker needs (the Call's
 * kind, keys, Rep and labels, `sent_to_vendor_at`, the job's own `job_created_at` and the Call's
 * audio `content_hash`: the sha256 as a Buffer, null only on the signal row); every row carries `cancelled` and `lost`
 * as for documents, and one signal row with a null `id` comes back when neither a job was claimed
 * nor nothing was due. Run it with a short `lock_timeout`; no publish or network call inside the
 * transaction.
 */
export const CALL_JOB_CLAIM = `with due as (
  select j.id, coalesce(${LIVE('j', 'c')}, false) as live
  from playbook.call_jobs j
  left join playbook.calls c on c.organization_id = j.organization_id and c.id = j.call_id
  where j.organization_id = $1 and j.state in ('queued', 'running')
    and j.attempts < ${CALL_JOB_MAX_ATTEMPTS} and j.next_attempt_at <= clock_timestamp()
    and ($4::text is null or j.id = $4::text)
  order by j.next_attempt_at
  limit ${BATCH('$2')}
  for update of j skip locked),
stale as (
  update playbook.call_jobs t
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  from due
  where t.organization_id = $1 and t.id = due.id and not due.live
  returning t.id),
claimed as (
  update playbook.call_jobs j
  set state = 'running', attempts = j.attempts + 1, claim_token = gen_random_uuid(),
      next_attempt_at = clock_timestamp() + ${LEASE('$3')}, updated_at = clock_timestamp()
  from due
  where j.organization_id = $1 and j.id = due.id and due.live
  returning j.id, j.call_id, j.kind, j.epoch, j.rep_seq, j.attempts, j.claim_token, j.created_at as job_created_at),
moved as (
  update playbook.calls c
  set state = case claimed.kind when 'transcribe' then 'transcribing' when 'process' then 'processing' else c.state end,
      updated_at = clock_timestamp()
  from claimed
  where c.organization_id = $1 and c.id = claimed.call_id
    and ${LIVE('claimed', 'c')}
  returning c.id, c.kind as call_kind, c.media_type, c.size_bytes, c.object_key, c.transcript_key,
            c.rep_by, c.rep_label, c.rep_channel, c.speaker_labels, c.sent_to_vendor_at, c.content_hash)
select cl.id, cl.call_id, cl.kind as job_kind, cl.epoch, cl.rep_seq, cl.attempts, cl.claim_token,
  m.call_kind, m.media_type, m.size_bytes, m.object_key, m.transcript_key, m.rep_by, m.rep_label,
  m.rep_channel, m.speaker_labels, m.sent_to_vendor_at,
  cl.job_created_at, m.content_hash,
  (select count(*) from stale)::int as cancelled,
  ((select count(*) from claimed) - (select count(*) from moved))::int as lost
from claimed cl join moved m on m.id = cl.call_id
union all
select ${CLAIM_COLUMNS.map((column) => (column === 'epoch' || column === 'rep_seq' || column === 'attempts' ? 'null::int' : column === 'claim_token' ? 'null::uuid' : column === 'size_bytes' ? 'null::bigint' : column === 'speaker_labels' ? 'null::text[]' : column === 'sent_to_vendor_at' || column === 'job_created_at' ? 'null::timestamptz' : column === 'content_hash' ? 'null::bytea' : 'null::text')).join(', ')},
  (select count(*) from stale)::int, ((select count(*) from claimed) - (select count(*) from moved))::int
where not exists (select 1 from claimed cl join moved m on m.id = cl.call_id)
  and ((select count(*) from stale) > 0 or (select count(*) from claimed) > 0)`

/** One row of {@link CALL_JOB_CLAIM}: a claimed job, or (with a null `id`) the signal row. */
export interface CallJobClaimRow {
  id: string | null
  call_id: string | null
  job_kind: 'transcribe' | 'process' | 'rebuild' | null
  epoch: number | null
  rep_seq: number | null
  attempts: number | null
  claim_token: string | null
  call_kind: 'transcript' | 'recording' | null
  media_type: string | null
  size_bytes: string | null
  object_key: string | null
  transcript_key: string | null
  rep_by: 'speaker' | 'channel' | null
  rep_label: string | null
  rep_channel: 'left' | 'right' | null
  speaker_labels: string[] | null
  sent_to_vendor_at: Date | null
  job_created_at: Date | null
  content_hash: Buffer | null
  cancelled: number
  lost: number
}

/** A claimed Call job as {@link claimedCallJobs} returns it: a claim row whose `id` is known to be set. */
export type ClaimedCallJob = CallJobClaimRow & {
  id: string
  call_id: string
  job_created_at: Date
  content_hash: Buffer
}

/** Read the rows of {@link CALL_JOB_CLAIM}: the claimed jobs and the counts it `cancelled` and `lost`; claim again at once when either is above zero. */
export function claimedCallJobs(rows: readonly CallJobClaimRow[]): {
  jobs: ClaimedCallJob[]
  cancelled: number
  lost: number
} {
  const jobs = rows.filter((row): row is ClaimedCallJob => row.id !== null && row.call_id !== null)
  return { jobs, cancelled: rows[0]?.cancelled ?? 0, lost: rows[0]?.lost ?? 0 }
}

/**
 * Extend a Call job's lease. `$1` Organization, `$2` job, `$3` the claim token, `$4` the new lease
 * in milliseconds. No row: the claim was lost, or the Call is no longer live for the job (deleted,
 * restored under a new epoch, its Rep changed again): stop and write nothing more.
 */
export const CALL_JOB_HEARTBEAT = `update playbook.call_jobs
set next_attempt_at = clock_timestamp() + ${LEASE('$4')}, updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
  and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id and ${LIVE('call_jobs', 'x')})
returning id`

/**
 * Give a failed attempt back for a later one: the job returns to `queued` with the delay (cut to one
 * hour; the service jitters it). `$1` Organization, `$2` job, `$3` the claim token, `$4` the delay in
 * milliseconds. No row: the claim was lost.
 */
export const CALL_JOB_RETRY = `update playbook.call_jobs
set state = 'queued', claim_token = null,
    next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), ${INGESTION_MAX_RETRY_DELAY_MS}) / 1000),
    updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
returning id, attempts`

/** The longest delay, in milliseconds, {@link CALL_JOB_DEFER} will impose (25 hours: the next UTC day plus jitter); a longer one is cut to it. */
export const CALL_JOB_MAX_DEFER_DELAY_MS = 90_000_000

/**
 * Put a job back for a later time without spending the attempt its claim counted, for a wait that
 * is not a failure (the Organization's daily embed budget is used up and the Call waits for the
 * next UTC day). `$1` Organization, `$2` job, `$3` the claim token, `$4` the delay in milliseconds
 * (cut to {@link CALL_JOB_MAX_DEFER_DELAY_MS}; the service jitters it). The job returns to `queued`
 * and its `attempts` goes back by the one the claim added, so any number of deferrals leaves the
 * {@link CALL_JOB_MAX_ATTEMPTS} limit untouched; a real failure still ends an attempt with
 * {@link CALL_JOB_RETRY} or {@link CALL_JOB_FAIL}. Returns `id` and `attempts` (as kept). No row: the
 * claim was lost. The service must bound deferrals itself: this statement counts none.
 */
export const CALL_JOB_DEFER = `update playbook.call_jobs
set state = 'queued', claim_token = null, attempts = greatest(attempts - 1, 0),
    next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), ${CALL_JOB_MAX_DEFER_DELAY_MS}) / 1000),
    updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
returning id, attempts`

/**
 * Record that the Recording is about to be sent to the vendor, before the request is made, so a
 * purge or erasure knows a vendor copy may exist and waits for {@link CALL_VENDOR_REMOVED}. `$1`
 * Organization, `$2` job, `$3` the claim token. **Every send counts**: it adds one to
 * `vendor_send_seq`, refreshes `sent_to_vendor_at` and clears `vendor_removed_at`, so a copy sent
 * again after an earlier one was confirmed gone needs its own confirmation. Returns `id` and the
 * new `vendor_send_seq`: the service keeps its vendor reference for that send under this number,
 * and **sends a client reference derived from the Call id and this number** (for example
 * `<call id>:<n>`), so every counted send can be found and deleted at the vendor even when the
 * service crashed after the vendor accepted it and before it stored the vendor's id; a
 * confirmation for number `n` means every copy with reference 1 to `n` is gone. That needs the
 * vendor to support a client reference or a lookup, which is unverified for AssemblyAI and belongs
 * to the transcriber adapter ticket. The same write inserts the send's row (`call_vendor_sends`,
 * no id yet): record the vendor's id with {@link CALL_VENDOR_ID_RECORD} after it accepts. **At most
 * {@link CALL_MAX_VENDOR_SENDS} sends per Call over its life** (a restore starts a new job, so the
 * job's attempt limit alone does not bound them): a twenty-first is not counted and the answer has
 * `sent` false; do not send, fail the job. No row: the claim was lost or the Call is not live.
 */
export const CALL_SENT_TO_VENDOR = `with live as (
  select c.id, c.vendor_send_seq from playbook.calls c
  join playbook.call_jobs j on j.organization_id = c.organization_id and j.call_id = c.id
  where j.organization_id = $1 and j.id = $2 and j.claim_token = $3::uuid and j.state = 'running'
    and ${LIVE('j', 'c')}),
u as (
  update playbook.calls c
  set sent_to_vendor_at = clock_timestamp(), vendor_send_seq = c.vendor_send_seq + 1,
      vendor_removed_at = null, updated_at = clock_timestamp()
  from live
  where c.organization_id = $1 and c.id = live.id and live.vendor_send_seq < ${CALL_MAX_VENDOR_SENDS}
  returning c.id, c.vendor_send_seq),
ins as (
  insert into playbook.call_vendor_sends (organization_id, call_id, seq)
  select $1, id, vendor_send_seq from u)
select id, vendor_send_seq, true as sent from u
union all
select id, vendor_send_seq, false from live where vendor_send_seq >= ${CALL_MAX_VENDOR_SENDS}`

/**
 * Record the vendor's id for one send, after the vendor accepted it. `$1` Organization, `$2` Call,
 * `$3` the send's `vendor_send_seq` (the number {@link CALL_SENT_TO_VENDOR} returned), `$4` the
 * vendor's id (opaque, 1 to 128 characters of `[A-Za-z0-9._:-]`). One row, `result`:
 * `recorded`; `unchanged` (that send already holds this id, so a repeat is safe); `conflict` (it
 * holds a different id, which is **never overwritten**, or another send of the Organization holds
 * this id: the table has a unique Organization-scoped index on it, and a concurrent record of the
 * same id on two sends can still raise SQLSTATE 23505, which the service treats as `conflict`
 * and never logs `error.detail`, because it carries the id); `invalid` (the id is not of that shape:
 * nothing is written and no constraint is reached, so no id appears in any error). **No row** when
 * the Call has no such counted send (never sent, or a number above the Call's current one).
 * **A late answer is allowed**: the id of any counted send is recorded whatever the Call's state and
 * whichever send is the current one, and without a claim, because an answer that arrives after a
 * restore, a newer send or a delete still names a real copy at the vendor that must be deleted. A
 * send that never gets an id keeps its row with a null id; the purge then finds that copy by its
 * client reference. The id is never returned by this statement, logged, or put in an index.
 */
export const CALL_VENDOR_ID_RECORD = `with cur as (
  select vendor_id from playbook.call_vendor_sends
  where organization_id = $1 and call_id = $2 and seq = $3::int
  for update),
taken as (
  select 1 from playbook.call_vendor_sends t
  where t.organization_id = $1 and t.vendor_id = $4::text and not (t.call_id = $2 and t.seq = $3::int)),
u as (
  update playbook.call_vendor_sends s
  set vendor_id = $4::text, recorded_at = clock_timestamp()
  from cur
  where s.organization_id = $1 and s.call_id = $2 and s.seq = $3::int and cur.vendor_id is null
    and not exists (select 1 from taken)
    and coalesce($4::text ~ '${CALL_VENDOR_ID_PATTERN}', false)
  returning 1)
select case
  when not coalesce($4::text ~ '${CALL_VENDOR_ID_PATTERN}', false) then 'invalid'
  when exists (select 1 from u) then 'recorded'
  when cur.vendor_id = $4::text then 'unchanged'
  else 'conflict' end as result
from cur`

/**
 * Record what a step learned and extend the lease. `$1` Organization, `$2` job, `$3` the claim
 * token, `$4` the object key of the Transcript a Recording produced (kept and reused), `$5` the
 * Recording's duration in seconds, `$6` the speaker labels as a text array (at most 20, unique: more
 * is `too_many_speakers`, which the service fails with {@link CALL_JOB_FAIL} instead), `$7` the lease
 * in milliseconds. A null leaves that value as it is. No row: the claim was lost or the Call is not
 * live. The table refuses a duration over 3 hours (the service fails `too_long` instead).
 */
export const CALL_JOB_RECORD = `with j as (
  update playbook.call_jobs
  set next_attempt_at = clock_timestamp() + ${LEASE('$7')}, updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id and ${LIVE('call_jobs', 'x')})
  returning call_id, epoch)
update playbook.calls c
set transcript_key = coalesce($4::text, c.transcript_key), duration_seconds = coalesce($5::int, c.duration_seconds),
    speaker_labels = coalesce($6::text[], c.speaker_labels), updated_at = clock_timestamp()
from j
where c.organization_id = $1 and c.id = j.call_id and c.epoch = j.epoch
returning c.id`

/**
 * End a `transcribe` job: the Transcript is stored (and recorded with {@link CALL_JOB_RECORD}).
 * `$1` Organization, `$2` job, `$3` the claim token, `$4` the id of the `process` job to queue. The
 * Call goes to `awaiting_rep` when it has no Rep (no job; `playbook.call_rep_changed` follows the
 * pick) and to `processing` with a queued `process` job when it has (publish
 * `playbook.call_transcribed`). One row with the Call's new `state`, or none when the claim was lost,
 * the Call is not `transcribing` at the job's epoch, or no Transcript is recorded.
 */
export const CALL_JOB_TRANSCRIBED = `with j as (
  update playbook.call_jobs
  set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running' and kind = 'transcribe'
    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id
                and x.state = 'transcribing' and x.epoch = call_jobs.epoch and x.transcript_key is not null)
  returning call_id, epoch),
c as (
  update playbook.calls
  set state = case when rep_by is null then 'awaiting_rep' else 'processing' end, updated_at = clock_timestamp()
  where organization_id = $1 and id = (select call_id from j) and epoch = (select epoch from j) and state = 'transcribing'
  returning id, state, epoch, rep_seq),
q as (
  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)
  select $4::text, $1, id, 'process', epoch, rep_seq, clock_timestamp(), clock_timestamp() from c where state = 'processing')
select id, state from c`

/**
 * Finish a `process` or `rebuild` job and make the Call `ready`. `$1` Organization, `$2` job, `$3`
 * the claim token, `$4` the Deal's `outcome_seq` the Moments were tagged with (read by the worker
 * before it built them). It applies only while the Call is `processing` at the job's epoch, has a
 * Rep (and, for a speaker, a label among its labels: else the service fails it with
 * `rep_label_not_found`), and for a `rebuild` only while the stored `rep_seq` equals the job's. It
 * **locks the Deal row** (`for no key update`, the mode of an Outcome change and of
 * {@link DEAL_RETAG_LOCK}, which conflicts with neither the foreign-key `KEY SHARE` of an upload
 * nor a reader) **before the Call is written**, because the Call update reads that locked row and
 * so waits for it, and reads `outcome_seq` from the locked, newest row, never from the statement's
 * snapshot. (Postgres does not order the data-modifying parts of a statement textually, so the
 * lock is not promised to come before the job row's; it need not: no statement that holds a Deal
 * row waits for a job or Call row, so either order is safe.) It records the tag (never above that sequence) and, when the tag is behind it, lowers
 * the Deal's `retag_through` in the same write. Because the re-tag's lock and an Outcome change
 * queue on the same row, a completion that is open while the Outcome moves holds the change (and
 * so the re-tag's `DONE`) back until it commits, and a completion that waits behind them tags
 * against the newer sequence: a Call can never become `ready` with a stale tag unseen. The mode is
 * `no key update`, not `share`, because two completions that held `share` and then both lowered
 * `retag_through` would deadlock on the upgrade; this way they queue instead, for the length of
 * one statement. Keep the transaction of an Outcome change short for the same reason. No row: the
 * claim was lost or a guard failed.
 */
export const CALL_JOB_COMPLETE = `with dk as (
  select d.id, d.outcome_seq from playbook.deals d
  where d.organization_id = $1
    and d.id = (select x.deal_record_id from playbook.calls x join playbook.call_jobs y
                  on y.organization_id = x.organization_id and y.call_id = x.id
                where y.organization_id = $1 and y.id = $2)
  for no key update),
j as (
  update playbook.call_jobs
  set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running' and kind in ('process', 'rebuild')
    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id
                and x.state = 'processing' and x.epoch = call_jobs.epoch
                and (call_jobs.kind = 'process' or x.rep_seq = call_jobs.rep_seq)
                and x.rep_by is not null and (x.rep_by <> 'speaker' or x.rep_label = any(x.speaker_labels)))
  returning call_id, epoch),
c as (
  update playbook.calls c
  set state = 'ready', tagged_outcome_seq = greatest(c.tagged_outcome_seq, least($4::int, dk.outcome_seq)), updated_at = clock_timestamp()
  from j, dk
  where c.organization_id = $1 and c.id = j.call_id and c.epoch = j.epoch and c.state = 'processing'
    and dk.id = c.deal_record_id
  returning c.id, c.deal_record_id, c.tagged_outcome_seq),
dl as (
  update playbook.deals d
  set retag_through = least(d.retag_through, c.tagged_outcome_seq)
  from c, dk
  where d.organization_id = $1 and d.id = c.deal_record_id and dk.id = d.id and c.tagged_outcome_seq < dk.outcome_seq
  returning d.id)
select id from c`

/**
 * End a Call job as failed with a reason, and the Call with it. `$1` Organization, `$2` job, `$3`
 * the claim token, `$4` the reason (one of the ten; the table rejects any other). `too_many_speakers`
 * also clears the labels (the contract lists none for it). A Call that failed with
 * `rep_label_not_found` or `not_per_side` can be fixed by {@link CALL_SET_REP}. No row: the claim was lost.
 */
export const CALL_JOB_FAIL = `with j as (
  update playbook.call_jobs
  set state = 'failed', failure_reason = $4::text, claim_token = null,
      finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id and ${LIVE('call_jobs', 'x')})
  returning call_id, epoch),
c as (
  update playbook.calls
  set state = 'failed', failure_reason = $4::text,
      speaker_labels = case when $4::text = 'too_many_speakers' then '{}'::text[] else speaker_labels end,
      updated_at = clock_timestamp()
  where organization_id = $1 and id = (select call_id from j) and epoch = (select epoch from j)
    and state in ('uploaded', 'transcribing', 'processing')
  returning id)
select id from c`

/**
 * Fail spent jobs, one bounded batch: active jobs that used every attempt and whose lease ended, as
 * `failed` with `processing_failed`, and their Calls too (the safety net behind the service's own
 * limit). `$1` Organization, `$2` batch size. Skips rows another transaction holds.
 */
export const CALL_JOB_GIVE_UP_SPENT = `with batch as (
  select id from playbook.call_jobs
  where organization_id = $1 and state in ('queued', 'running')
    and attempts >= ${CALL_JOB_MAX_ATTEMPTS} and next_attempt_at <= clock_timestamp()
  order by next_attempt_at
  limit ${BATCH('$2')}
  for update skip locked),
j as (
  update playbook.call_jobs t
  set state = 'failed', failure_reason = 'processing_failed', claim_token = null,
      finished_at = clock_timestamp(), updated_at = clock_timestamp()
  from batch
  where t.organization_id = $1 and t.id = batch.id
  returning t.call_id, t.epoch),
c as (
  update playbook.calls
  set state = 'failed', failure_reason = 'processing_failed', updated_at = clock_timestamp()
  from j
  where calls.organization_id = $1 and calls.id = j.call_id and calls.epoch = j.epoch
    and calls.state in ('uploaded', 'transcribing', 'processing'))
select call_id from j`

/**
 * Begin the vector cleanup queued for one Call deletion, as {@link DOCUMENT_CLEANUP_BEGIN} does.
 * `$1` Organization, `$2` Call, `$3` the `deletion_seq` the message carried. A row means the
 * cleanup still applies; `clear` is false while a worker may still hold a lease on the Call.
 */
export const CALL_CLEANUP_BEGIN = `select c.id, c.epoch,
  not exists (
    select 1 from playbook.call_jobs j
    where j.organization_id = c.organization_id and j.call_id = c.id
      and j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp()) as clear
from playbook.calls c
where c.organization_id = $1 and c.id = $2 and c.state = 'deleted' and c.deletion_seq = $3::int`

/**
 * One page of the deleted Calls whose vector cleanup is pending ({@link CALL_PENDING_CLEANUP_PREDICATE}),
 * oldest deletion first. `$1` Organization, `$2` and `$3` the cursor (`deleted_at::text`, `id`;
 * `'-infinity'` and `''` first), `$4` the page size. Rows: `id`, `epoch`, `deletion_seq`,
 * `deleted_at` and `cursor_at` (the text of `deleted_at`). On `calls_cleanup_idx`.
 */
export const CALL_LIST_PENDING_CLEANUP = `select id, epoch, deletion_seq, deleted_at, deleted_at::text as cursor_at
from playbook.calls
where organization_id = $1 and ${CALL_PENDING_CLEANUP_PREDICATE}
  and (deleted_at, id) > ($2::timestamptz, $3::text)
order by deleted_at, id
limit ${BATCH('$4')}`

/** Record that the cleanup of one deletion finished: `$1` Organization, `$2` Call, `$3` the `deletion_seq`. No row: restored or deleted again since. */
export const CALL_CLEANUP_DONE = `update playbook.calls
set vectors_removed_seq = $3::int, updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and state = 'deleted' and deletion_seq = $3::int
returning id`

/**
 * Record that the vendor confirmed it deleted its copy of a Recording. `$1` Organization, `$2` Call,
 * `$3` the `vendor_send_seq` of the send whose copy is gone (the purge claim and the erase rows
 * carry the current one). Only for a `deleted` Call whose latest send is that number, so a late
 * confirmation of an earlier copy confirms nothing about a later one; idempotent. **No row while a
 * job of the Call still holds a live lease** (`running`, or `cancelled` with `next_attempt_at` in
 * the future, as delete and erasure leave it): a worker that already recorded the send may still be
 * mid-request, so a confirmation taken now could be made before its copy lands, which would be a
 * false statement. Retry after the lease. {@link CALL_PURGE_COMPLETE} waits for both.
 */
export const CALL_VENDOR_REMOVED = `update playbook.calls
set vendor_removed_at = coalesce(vendor_removed_at, clock_timestamp()), updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and state = 'deleted' and vendor_send_seq = $3::int
  and sent_to_vendor_at is not null
  and not exists (
    select 1 from playbook.call_jobs j
    where j.organization_id = $1 and j.call_id = $2
      and j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp())
returning id`

/**
 * Claim Calls due for purge as a lease, as {@link DOCUMENT_PURGE_CLAIM}. `$1` Organization, `$2`
 * batch size, `$3` the lease in milliseconds. Rows carry what the service must remove outside any
 * transaction: `object_key` (the original), `transcript_key` (the kept Transcript), `kind`,
 * `sent_to_vendor_at`, `vendor_send_seq` and `vendor_removed_at` (remove the vendor's copy and record it
 * with {@link CALL_VENDOR_REMOVED} and that `vendor_send_seq`), `vendor_sends` (every counted send as
 * `{ seq, vendor_id }`, `vendor_id` null for a send whose id was never stored: delete that copy by its
 * client reference; the array is complete, at most {@link CALL_MAX_VENDOR_SENDS} long, and `[]` for a Call
 * never sent), `deletion_seq` and `vectors_removed_seq` (run the cleanup first
 * when they differ). The service also removes every artefact under the Call's id prefix. **A claim
 * means the purge can finish**: a Call is not handed out while a job of it is `running`, or
 * `cancelled` with its lease unexpired (delete and erasure cancel a job but keep its lease), the
 * state in which {@link CALL_VENDOR_REMOVED} and {@link CALL_PURGE_COMPLETE} refuse, so a service
 * that retries during the wait spends none of the {@link CALL_PURGE_MAX_ATTEMPTS} attempts. Erasure
 * reaches the purge only through this claim and inherits that.
 */
export const CALL_PURGE_CLAIM = `with due as (
  select id from playbook.calls
  where organization_id = $1 and state = 'deleted' and purge_due_at <= clock_timestamp()
    and purge_attempts < ${CALL_PURGE_MAX_ATTEMPTS}
    and (purge_lease_until is null or purge_lease_until <= clock_timestamp())
    and not exists (
      select 1 from playbook.call_jobs j
      where j.organization_id = calls.organization_id and j.call_id = calls.id
        and j.state in ('running', 'cancelled') and j.next_attempt_at > clock_timestamp())
  order by purge_due_at
  limit ${BATCH('$2')}
  for update skip locked)
update playbook.calls c
set purge_started_at = coalesce(c.purge_started_at, clock_timestamp()),
    purge_attempts = c.purge_attempts + 1,
    purge_lease_until = clock_timestamp() + ${LEASE('$3')},
    updated_at = clock_timestamp()
from due
where c.organization_id = $1 and c.id = due.id
returning c.id, c.kind, c.object_key, c.transcript_key, c.size_bytes, c.deletion_seq, c.vectors_removed_seq,
  c.sent_to_vendor_at, c.vendor_send_seq, c.vendor_removed_at, c.purge_attempts,
  ${VENDOR_SENDS('c')}`

/**
 * Finish a Call purge: remove the row (its jobs go by cascade and the counts fall in the same
 * transaction). `$1` Organization, `$2` Call. Only for a `deleted` Call whose purge was claimed, whose
 * current deletion's cleanup is recorded and whose vendor copy, if one was made, is recorded removed,
 * and with no live job lease: a `running` job, or a `cancelled` one (delete and erasure cancel a job
 * but keep its lease) whose `next_attempt_at` has not passed, may still have a request in flight,
 * as {@link CALL_CLEANUP_BEGIN} also treats it. Locks the Call's job rows first (the lock order everywhere).
 */
export const CALL_PURGE_COMPLETE = `with jl as (
  select state, next_attempt_at from playbook.call_jobs
  where organization_id = $1 and call_id = $2
  for update)
delete from playbook.calls
where organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is not null
  and vectors_removed_seq = deletion_seq
  and (sent_to_vendor_at is null or vendor_removed_at is not null)
  and not exists (select 1 from jl where jl.state in ('running', 'cancelled') and jl.next_attempt_at > clock_timestamp())
returning id, size_bytes`

/** List the Calls whose purge reached the attempt bound, one page by id: `$1` Organization, `$2` last id (`''` first), `$3` page size. On `calls_spent_purge_idx`. */
export const CALL_LIST_SPENT_PURGES = `select id, kind, object_key, transcript_key, deletion_seq, vectors_removed_seq,
  sent_to_vendor_at, vendor_send_seq, vendor_removed_at, deleted_at, purge_due_at, purge_started_at, purge_lease_until, purge_attempts,
  ${VENDOR_SENDS('c')}
from playbook.calls c
where organization_id = $1 and state = 'deleted' and purge_attempts >= ${CALL_PURGE_MAX_ATTEMPTS}
  and id > $2::text
order by id
limit ${CLAMP('$3', DOCUMENT_LIST_MAX_PAGE)}`

/** Give one spent Call purge another round: `$1` Organization, `$2` Call. The Call is barred from restore for good. Idempotent. */
export const CALL_PURGE_RESET = `update playbook.calls
set purge_attempts = 0, purge_started_at = null, purge_lease_until = null,
    restore_barred_at = coalesce(restore_barred_at, clock_timestamp()), updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and state = 'deleted' and purge_attempts >= ${CALL_PURGE_MAX_ATTEMPTS}
returning id, purge_attempts`

/**
 * One batch of an erasure of Calls: bar the Organization's Calls from restore and make them due
 * for purge at once, as {@link DOCUMENT_ERASE_BATCH} does documents. **Run it, and let the purge
 * remove every Call, before {@link DEAL_ERASE_BATCH}**: a Deal a Call refers to cannot be deleted.
 * `$1` Organization, `$2` batch size, `$3` the actor (an internal call has no user: `usr_` and 32
 * zeros). Rows: `id`, `epoch`, `deletion_seq`, `changed` (publish the cleanup with that sequence),
 * and `object_key`, `transcript_key`, `kind`, `sent_to_vendor_at`, `vendor_send_seq`, `vendor_sends` (**read in
 * the statement's snapshot, so a send that committed while the statement ran can be in `vendor_send_seq`
 * and not yet in `vendor_sends`: when `vendor_sends` is shorter than `vendor_send_seq`, delete the
 * missing sequences by client reference; the purge claim, run after the lease gate, is exact**) so the service can remove the
 * objects and the vendor copy at once; the purge claim returns them again. Lock order: job rows,
 * then Call rows, each in id order. Repeat until no row comes back. An upload still streaming has
 * no Call yet: its key is an upload attempt, so the orphan sweep removes its parts and object.
 */
export const CALL_ERASE_BATCH = `with t as (select clock_timestamp() as now),
cand as (
  select id, deletion_seq from playbook.calls
  where organization_id = $1 and restore_barred_at is null
  order by id
  limit ${BATCH('$2')}),
jl as (
  select id from playbook.call_jobs
  where organization_id = $1 and state in ('queued', 'running') and call_id in (select id from cand)
  order by id
  for update),
j as (
  update playbook.call_jobs
  set state = 'cancelled', claim_token = null, finished_at = (select now from t), updated_at = (select now from t),
      next_attempt_at = case when state = 'running' then next_attempt_at else (select now from t) end
  where organization_id = $1 and id in (select id from jl)
  returning id),
cl as (
  select id from playbook.calls
  where organization_id = $1 and id in (select id from cand) and restore_barred_at is null
    and (select count(*) from j) >= 0
  order by id
  for update),
x as (
  update playbook.calls c
  set state = 'deleted',
      epoch = case when c.state <> 'deleted' then c.epoch + 1 else c.epoch end,
      deletion_seq = case when c.state <> 'deleted' then c.deletion_seq + 1 else c.deletion_seq end,
      deleted_at = case when c.state <> 'deleted' then (select now from t) else c.deleted_at end,
      deleted_by = case when c.state <> 'deleted' then $3::text else c.deleted_by end,
      purge_due_at = least(coalesce(c.purge_due_at, (select now from t)), (select now from t)),
      restore_barred_at = (select now from t), failure_reason = null, updated_at = (select now from t)
  from cand
  where c.organization_id = $1 and c.id = cand.id and c.id in (select id from cl)
  returning c.id, c.epoch, c.deletion_seq, (c.deletion_seq <> cand.deletion_seq) as changed,
    c.object_key, c.transcript_key, c.kind, c.sent_to_vendor_at, c.vendor_send_seq,
    ${VENDOR_SENDS('c')})
select id, epoch, deletion_seq, changed, object_key, transcript_key, kind, sent_to_vendor_at, vendor_send_seq, vendor_sends from x order by id`

/**
 * One page of the Deals that need an Outcome re-tag (`retag_through < outcome_seq`, on
 * `deals_retag_idx`): `$1` Organization, `$2` the last Deal id of the previous page (`''` first),
 * `$3` the page size (clamped). Rows: `id`, `outcome`, `outcome_seq`, `retag_through`.
 */
export const DEAL_LIST_PENDING_RETAG = `select id, outcome, outcome_seq, retag_through
from playbook.deals
where organization_id = $1 and retag_through < outcome_seq and id > $2::text
order by id
limit ${BATCH('$3')}`

/**
 * One bounded batch of a Deal's `ready` Calls whose tag is behind the Deal's Outcome sequence:
 * `$1` Organization, `$2` the Deal, `$3` the last Call id of the previous batch (`''` first), `$4` the
 * batch size (clamped). Rows carry the Call `id`, the Deal's current `outcome` and `outcome_seq`:
 * re-tag the Call's Moments in the index with that Outcome, then record it with {@link CALL_RETAGGED}.
 * One statement reads the batch plus the keyset rows it skips: the keyset on `calls_retag_idx`
 * moves forward, so all the batches of one re-tag read the Deal's ready Calls once (bounded by
 * the quota, never by the Organization), and the job is idempotent (it reads the Outcome from the database, so a batch
 * repeated after a change does the newer work).
 */
export const DEAL_RETAG_BATCH = `select c.id, d.outcome, d.outcome_seq
from playbook.calls c
join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id
where c.organization_id = $1 and c.deal_record_id = $2::text and c.state = 'ready'
  and c.tagged_outcome_seq < d.outcome_seq and c.id > $3::text
order by c.id
limit ${BATCH('$4')}`

/**
 * Record that Calls' Moments carry an Outcome sequence: `$1` Organization, `$2` the Call ids (an
 * array; the first 500 are used), `$3` the sequence the batch row carried. A Call's tag only goes
 * up and never above its Deal's current sequence. Rows are the Calls updated.
 */
export const CALL_RETAGGED = `update playbook.calls c
set tagged_outcome_seq = $3::int, updated_at = clock_timestamp()
from playbook.deals d
where c.organization_id = $1 and c.id = any(($2::text[])[1:500]) and c.state = 'ready'
  and c.tagged_outcome_seq < $3::int
  and d.organization_id = $1 and d.id = c.deal_record_id and $3::int <= d.outcome_seq
returning c.id`

/**
 * Take the Deal row before finishing its re-tag: `$1` Organization, `$2` the Deal. **Run it and
 * {@link DEAL_RETAG_DONE} in one transaction, as two statements.** The second runs with a new
 * snapshot after this lock is granted, so it sees every Call that became `ready` with a stale tag
 * (their transaction also takes this row, see {@link CALL_JOB_COMPLETE}) before it decides.
 */
export const DEAL_RETAG_LOCK = `select id, outcome, outcome_seq, retag_through
from playbook.deals
where organization_id = $1 and id = $2
for no key update`

/**
 * Finish a Deal's re-tag: `$1` Organization, `$2` the Deal, `$3` the `outcome_seq` the batches
 * carried. It sets `retag_through` to it only if it is above the stored one and not above the Deal's
 * sequence and no `ready` Call of the Deal is still tagged below it (one indexed read of the Deal's
 * ready Calls, once per re-tag, short-circuiting on the first stale one). No row means more work
 * remains (another Call, or a newer Outcome): list and batch again. Hint: a lowered marker notes the
 * `outcome_retag` work again by trigger.
 */
export const DEAL_RETAG_DONE = `update playbook.deals d
set retag_through = $3::int
where d.organization_id = $1 and d.id = $2 and d.retag_through < $3::int and $3::int <= d.outcome_seq
  and not exists (
    select 1 from playbook.calls c
    where c.organization_id = $1 and c.deal_record_id = d.id and c.state = 'ready' and c.tagged_outcome_seq < $3::int)
returning d.id, d.retag_through, d.outcome_seq`

/**
 * Record how many Moments a Call's embedding job embedded and skipped (hub issue 109): `$1`
 * Organization, `$2` Call id, `$3` embedded, `$4` skipped (each null or negative counts 0, above
 * 1,000,000 counts 1,000,000). Only a Call that is `processing` or `ready` is updated; a repeat
 * overwrites. Returns `id`, `embedded_moments` and `skipped_moments`, or no row for any other Call.
 */
export const CALL_MOMENTS_RECORD = `update playbook.calls
set embedded_moments = least(greatest(coalesce($3::int, 0), 0), 1000000),
    skipped_moments = least(greatest(coalesce($4::int, 0), 0), 1000000)
where organization_id = $1 and id = $2 and state in ('processing', 'ready')
returning id, embedded_moments, skipped_moments`

/** Every Call statement above by name, for the README check and the integration tests. */
export const CALL_STATEMENTS = {
  CALL_MOMENTS_RECORD,
  CALL_USAGE,
  CALL_INSERT,
  CALL_GET,
  CALL_SEARCH_STATE,
  CALL_LIST,
  CALL_LIST_BY_STATE,
  CALL_LIST_BY_DEAL,
  CALL_LIST_BY_DEAL_STATE,
  CALL_SOFT_DELETE,
  CALL_RESTORE,
  CALL_RESTORE_FOR_UPLOAD,
  CALL_REQUEUE,
  CALL_SET_REP,
  CALL_JOB_CLAIM,
  CALL_JOB_HEARTBEAT,
  CALL_JOB_RETRY,
  CALL_JOB_DEFER,
  CALL_SENT_TO_VENDOR,
  CALL_JOB_RECORD,
  CALL_JOB_TRANSCRIBED,
  CALL_JOB_COMPLETE,
  CALL_JOB_FAIL,
  CALL_JOB_GIVE_UP_SPENT,
  CALL_CLEANUP_BEGIN,
  CALL_LIST_PENDING_CLEANUP,
  CALL_CLEANUP_DONE,
  CALL_VENDOR_ID_RECORD,
  CALL_VENDOR_REMOVED,
  CALL_PURGE_CLAIM,
  CALL_PURGE_COMPLETE,
  CALL_LIST_SPENT_PURGES,
  CALL_PURGE_RESET,
  CALL_ERASE_BATCH,
  DEAL_LIST_PENDING_RETAG,
  DEAL_RETAG_BATCH,
  CALL_RETAGGED,
  DEAL_RETAG_LOCK,
  DEAL_RETAG_DONE,
} as const
