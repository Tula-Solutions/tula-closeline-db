import { CLAMP, DOCUMENT_LIST_MAX_PAGE } from './playbook-sql'

/*
 * Platform Calls that wait for a Deal (spec M12, hub issue 183): the SQL the playbook service runs
 * against `playbook.live_call_waits`. Every statement runs inside `withOrganization` for the
 * Organization in `$1` and names it in its own `where`. Only metadata is stored, never a Recording.
 */

/**
 * Record that an ended Call waits for a Deal. `$1` Organization, `$2` the Call id (`call_…`), `$3`
 * direction (`inbound` or `outbound`), `$4` when it ended. A redelivery changes nothing. A row back
 * means the wait is new.
 */
export const LIVE_CALL_WAIT_RECORD = `insert into playbook.live_call_waits
  (organization_id, call_id, direction, ended_at)
values ($1, $2, $3, $4::timestamptz)
on conflict (organization_id, call_id) do nothing
returning call_id`

/** Clear the wait of a Call once it is ingested. `$1` Organization, `$2` the Call id. */
export const LIVE_CALL_WAIT_CLEAR = `delete from playbook.live_call_waits
where organization_id = $1 and call_id = $2
returning call_id`

/**
 * List the waiting Calls, oldest first, one page by keyset. `$1` Organization, `$2` and `$3` the
 * `cursor_at` (text) and `call_id` of the last row of the previous page (`'-infinity'` and `''`
 * first), `$4` the page size, clamped to 1..{@link DOCUMENT_LIST_MAX_PAGE}. On
 * `live_call_waits_list_idx`.
 */
export const LIVE_CALL_WAIT_LIST = `select call_id, direction, ended_at, created_at, created_at::text as cursor_at
from playbook.live_call_waits
where organization_id = $1 and (created_at, call_id) > ($2::timestamptz, $3::text)
order by created_at, call_id
limit ${CLAMP('$4', DOCUMENT_LIST_MAX_PAGE)}`

/** Every live-Call statement by name, spread into `PLAYBOOK_STATEMENTS`. */
export const LIVE_CALL_STATEMENTS = {
  LIVE_CALL_WAIT_RECORD,
  LIVE_CALL_WAIT_CLEAR,
  LIVE_CALL_WAIT_LIST,
} as const
