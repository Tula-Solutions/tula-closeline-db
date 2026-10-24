import { CLAMP, DOCUMENT_LIST_MAX_PAGE } from './playbook-sql'

/*
 * Suggestions (spec M15; hub issue 312): the SQL the playbook service runs
 * against `playbook.suggestions`, in the style of the other playbook statements. Every statement
 * runs inside `withOrganization` for the Organization in `$1` and names it in its own `where`.
 * Every list is a keyset on `(created_at, id)`, newest first, whose cursor is the **text**
 * `cursor_at` each row carries; the first page passes `'infinity'` and `''`. A malformed cursor
 * text raises SQLSTATE 22007. The text of a Suggestion comes from Calls, so it is untrusted data.
 */

// The columns every Suggestion read returns, in the contract's `suggestionSchema` field order
// (`provenance` is `deal_record_id` and `moments`).
const COLUMNS = `id, kind, status, text, deal_record_id, moments, created_at, decided_at,
  decided_by_membership_id`

/** The names of the columns of a Suggestion answer, in order, for the service's row type. */
export const SUGGESTION_ROW_FIELDS = [
  'id',
  'kind',
  'status',
  'text',
  'deal_record_id',
  'moments',
  'created_at',
  'decided_at',
  'decided_by_membership_id',
] as const

/**
 * Propose a Suggestion. `$1` Organization, `$2` id (`sgs_` and 32 hex digits), `$3` kind, `$4` text,
 * `$5` the 32-byte SHA-256 fingerprint of the kind and normalised text, `$6` the won Deal's record
 * id, `$7` the cited Moments as a JSON array (at most 10). A row back means the Suggestion is new.
 * No row means the Organization already holds one with that fingerprint, in any state, so a
 * rejected proposal is not made again and a retried delivery stores it once.
 */
export const SUGGESTION_INSERT = `insert into playbook.suggestions
  (organization_id, id, kind, text, fingerprint, deal_record_id, moments)
values ($1, $2, $3, $4, $5, $6, $7::jsonb)
on conflict (organization_id, fingerprint) do nothing
returning ${COLUMNS}`

/** Read one Suggestion. `$1` Organization, `$2` id. No row means unknown or another Organization's. */
export const SUGGESTION_GET = `select ${COLUMNS}
from playbook.suggestions
where organization_id = $1 and id = $2`

/**
 * List the Suggestions of every status, newest first, one page by keyset. `$1` Organization, `$2`
 * and `$3` the `cursor_at` (text) and `id` of the last row of the previous page (`'infinity'` and
 * `''` for the first), `$4` the page size, clamped to 1..{@link DOCUMENT_LIST_MAX_PAGE}. Each row
 * carries `cursor_at`. On `suggestions_list_idx`, read backwards.
 */
export const SUGGESTION_LIST = `select ${COLUMNS}, created_at::text as cursor_at
from playbook.suggestions
where organization_id = $1 and (created_at, id) < ($2::timestamptz, $3::text)
order by created_at desc, id desc
limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)}`

/**
 * {@link SUGGESTION_LIST} for one status (`$5`: `pending`, `accepted` or `rejected`), on
 * `suggestions_status_list_idx`. The Admin's queue is `pending`.
 */
export const SUGGESTION_LIST_BY_STATUS = `select ${COLUMNS}, created_at::text as cursor_at
from playbook.suggestions
where organization_id = $1 and status = $5::text and (created_at, id) < ($2::timestamptz, $3::text)
order by created_at desc, id desc
limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)}`

/**
 * Decide a Suggestion, once. `$1` Organization, `$2` id, `$3` the new status (`accepted` or
 * `rejected`), `$4` the deciding Membership, `$5` the edited text for an acceptance (null keeps the
 * proposed text). A row back means this call decided it. No row means it is unknown, another
 * Organization's, or already decided: read {@link SUGGESTION_GET} to tell `suggestion.not_found`
 * from `suggestion.not_pending`. Of two concurrent calls exactly one gets the row; the other
 * re-checks `status = 'pending'` once the first commits and gets none.
 */
export const SUGGESTION_DECIDE = `update playbook.suggestions
set status = $3::text, decided_by_membership_id = $4::text, decided_at = clock_timestamp(),
  text = coalesce($5::text, text)
where organization_id = $1 and id = $2 and status = 'pending'
returning ${COLUMNS}`

/**
 * List the accepted Suggestions of an Organization for the index, newest first, one bounded page
 * by keyset. `$1` Organization, `$2` and `$3` the `cursor_at` and `id` of the last row of the
 * previous page (`'infinity'` and `''` for the first), `$4` the page size, clamped to
 * 1..{@link DOCUMENT_LIST_MAX_PAGE}. On `suggestions_status_list_idx`.
 */
export const SUGGESTION_LIST_ACCEPTED = `select ${COLUMNS}, created_at::text as cursor_at
from playbook.suggestions
where organization_id = $1 and status = 'accepted' and (created_at, id) < ($2::timestamptz, $3::text)
order by created_at desc, id desc
limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)}`

/** Every Suggestion statement by name, spread into `PLAYBOOK_STATEMENTS`. */
export const SUGGESTION_STATEMENTS = {
  SUGGESTION_INSERT,
  SUGGESTION_GET,
  SUGGESTION_LIST,
  SUGGESTION_LIST_BY_STATUS,
  SUGGESTION_DECIDE,
  SUGGESTION_LIST_ACCEPTED,
} as const
