import { ABANDON_CASE_MAX_ATTEMPTS } from './schema/auth/abandon-cases'

/**
 * The least grace, in milliseconds, {@link ABANDON_RECORD} leaves between a sign-up attempt's
 * expiry and the first time its case is due: the retention floor of the service, 10 s (twice the
 * 5 s bound on a call to core). A smaller grace passed in is raised to this. The service passes
 * its call bound plus a skew margin; this floor is the least safe value, not a good one.
 */
export const ABANDON_MIN_GRACE_MS = 10_000

/**
 * The least forgetting period or window, in milliseconds, the counter statements store: a
 * smaller, null or negative value passed in is raised to it. Without a floor a zero period would
 * make a row expire the instant it starts and break the table's `window_order` check, and a
 * statement must not be able to throw on caller-supplied durations.
 */
export const COUNTER_MIN_PERIOD_MS = 1000

/**
 * The least `Retry-After`, in milliseconds, the service answers with for a locked address when
 * {@link LOCKOUT_RETRY_AFTER} gives no row or 0 after a refusal (see {@link LOCKOUT_ATTEMPT}).
 */
export const LOCKOUT_MIN_RETRY_AFTER_MS = 1000

/**
 * The SQL the auth service runs against `auth.attempt_counters` and `auth.abandon_cases`, as text.
 *
 * The integration tests run exactly these strings and the README prints exactly these strings (a
 * unit test fails when they differ), so what is documented is what was tested. Every time the
 * statements read or store is `clock_timestamp()`, evaluated inside the statement and, in a
 * `do update`, after the row lock is taken: **the database clock is the authority**. The service
 * passes durations (the wait schedule, a window, a lease), never a point in time, so instance
 * clock skew and two sign-ins that read their clocks before waiting for a connection cannot make a
 * stored time go backwards.
 *
 * In a `do update` the clock is read **once** (`with ts as (select clock_timestamp() as tick)`),
 * and only from the `do update` clauses, which Postgres evaluates after it has locked the row; a
 * common table expression runs when first read, so that read is after the lock. The `values` row
 * (used only when the key is new) reads the clock itself, never `ts`, because evaluating `ts` there
 * would read the clock before the lock is taken.
 */

// The failure count after this attempt, as the do-update branch computes it.
const NEXT_FAILURES = 'case when c.expires_at <= (select tick from ts) then 1 else c.hits + 1 end'

// The wait at an index of the schedule, in milliseconds, never negative and 0 where the schedule
// has no such element (an empty or short array, a null element): the statement cannot throw on it.
const WAIT = (index: string) => `greatest(coalesce(($3::int[])[${index}], 0), 0)::float8`

// The forgetting period in milliseconds, raised to the floor (null and negative included).
const FORGET = `greatest(coalesce($4::int, 0), ${COUNTER_MIN_PERIOD_MS})::float8`

// The index into the wait schedule for that count; the last element serves every later failure.
const SCHEDULE_AT = `least(${NEXT_FAILURES}, cardinality($3::int[]))`

/**
 * One attempted sign-in of an address, counted up front. `$1` environment, `$2` key hash, `$3`
 * the wait in milliseconds after failure 1, 2, 3, ... (an `int[]`; the last element serves every
 * later failure), `$4` the forgetting period in milliseconds, raised to {@link COUNTER_MIN_PERIOD_MS}
 * when smaller, null or negative; a missing, null or negative wait counts as 0, so no argument
 * makes the statement throw. A row back means the attempt may
 * go ahead (`hits` failures counted, `wait_ms` the wait this failure imposes); no row back means
 * the address is locked and the attempt was not counted: read {@link LOCKOUT_RETRY_AFTER}. If
 * that returns no row or 0 (the lock ended or the row was cleared in between), run this statement
 * again at most once; if it still refuses, answer locked with a `Retry-After` of at least
 * {@link LOCKOUT_MIN_RETRY_AFTER_MS}.
 */
export const LOCKOUT_ATTEMPT = `with ts as (select clock_timestamp() as tick)
insert into auth.attempt_counters as c
  (environment_id, kind, key_hash, hits, started_at, locked_until, expires_at)
values ($1, 'lockout', $2, 1, clock_timestamp(),
        clock_timestamp() + make_interval(secs => ${WAIT('1')} / 1000),
        clock_timestamp() + make_interval(secs => (${WAIT('1')} + ${FORGET}) / 1000))
on conflict (environment_id, kind, key_hash) do update set
  hits = least(${NEXT_FAILURES}, 1000000),
  started_at = case when c.expires_at <= (select tick from ts) then (select tick from ts) else c.started_at end,
  locked_until = (select tick from ts) + make_interval(secs => ${WAIT(SCHEDULE_AT)} / 1000),
  expires_at = (select tick from ts) + make_interval(secs => (${WAIT(SCHEDULE_AT)} + ${FORGET}) / 1000)
where c.locked_until <= (select tick from ts)
returning hits, ${WAIT('least(hits, cardinality($3::int[]))')}::int as wait_ms`

/**
 * After a refused {@link LOCKOUT_ATTEMPT}: how long the address stays locked, by the database
 * clock. A separate read, so it can race: the row may have been cleared or unlocked since, which
 * gives no row or 0, and the service then simply tries again. `$1` environment, `$2` key hash.
 */
export const LOCKOUT_RETRY_AFTER = `select greatest(0, ceil(extract(epoch from locked_until - clock_timestamp()) * 1000))::int as retry_after_ms
from auth.attempt_counters
where environment_id = $1 and kind = 'lockout' and key_hash = $2`

/** A right password: forget the address's failures. `$1` environment, `$2` key hash. */
export const LOCKOUT_CLEAR = `delete from auth.attempt_counters
where environment_id = $1 and kind = 'lockout' and key_hash = $2`

// The window in milliseconds, raised to the floor (null and negative included).
const WINDOW = `greatest(coalesce($3::float8, 0), ${COUNTER_MIN_PERIOD_MS})`

/**
 * One request against a fixed-window limit. `$1` environment, `$2` key hash, `$3` the window in
 * milliseconds (raised to {@link COUNTER_MIN_PERIOD_MS} when smaller, null or negative). The
 * request is allowed when `hits <= limit`; requests over the limit are counted
 * too. `retry_after_ms` is the time to the end of the window.
 */
export const RATE_HIT = `with ts as (select clock_timestamp() as tick)
insert into auth.attempt_counters as c
  (environment_id, kind, key_hash, hits, started_at, expires_at)
values ($1, 'rate_limit', $2, 1, clock_timestamp(),
        clock_timestamp() + make_interval(secs => ${WINDOW} / 1000))
on conflict (environment_id, kind, key_hash) do update set
  hits = case when c.expires_at <= (select tick from ts) then 1 else least(c.hits + 1, 1000000) end,
  started_at = case when c.expires_at <= (select tick from ts) then (select tick from ts) else c.started_at end,
  expires_at = case when c.expires_at <= (select tick from ts)
                    then (select tick from ts) + make_interval(secs => ${WINDOW} / 1000)
                    else c.expires_at end
returning hits, greatest(0, ceil(extract(epoch from expires_at - clock_timestamp()) * 1000))::int as retry_after_ms`

/**
 * The purge of dead counters, one bounded batch, **across all environments on purpose** (it is
 * housekeeping of a table without row-level security): rows expired for at least a minute by the
 * database clock, oldest first, skipping rows another purge holds. `$1` is the batch size; repeat
 * while a batch comes back full.
 */
export const COUNTER_PURGE_BATCH = `with batch as (
  select environment_id, kind, key_hash from auth.attempt_counters
  where expires_at < clock_timestamp() - interval '1 minute'
  order by expires_at
  limit $1
  for update skip locked)
delete from auth.attempt_counters c
using batch b
where c.environment_id = b.environment_id and c.kind = b.kind and c.key_hash = b.key_hash`

/**
 * Record an abandon case, once. `$1` id, `$2` project, `$3` environment, `$4` the Organization id
 * (null when a timed-out create never revealed it), `$5` user id, `$6` attempt id, `$7` the time
 * after which the attempt can no longer write an account, `$8` the grace in milliseconds. The case
 * first falls due at `$7` plus the grace: a request that started before the expiry can still
 * commit its account up to the call bound later, so "expired and no account" proves nothing until
 * then. **The service passes its call bound plus a skew margin**; a grace below
 * {@link ABANDON_MIN_GRACE_MS} is raised to it, and that floor is the least safe value. A case
 * already recorded for the Organization or for the attempt, open or resolved, is left alone and
 * no row comes back. Run it inside `withEnvironment` (forced row-level security).
 */
export const ABANDON_RECORD = `insert into auth.abandon_cases
  (id, project_id, environment_id, core_organization_id, user_id, attempt_id,
   attempt_expires_at, next_attempt_at)
values ($1, $2, $3, $4, $5, $6, $7::timestamptz,
        $7::timestamptz + make_interval(secs => greatest($8::int, ${ABANDON_MIN_GRACE_MS})::float8 / 1000))
on conflict do nothing
returning id`

/**
 * Claim a batch of due cases as a lease: the short transaction that runs this commits at once,
 * and core is called outside any transaction. `$1` environment, `$2` batch size, `$3` the lease in
 * milliseconds, which **must exceed the service's call bound to core**: a worker slower than its
 * lease can find its case already resolved `gave_up` by {@link ABANDON_GIVE_UP_SPENT} (see
 * {@link ABANDON_RESOLVE}). A case is due when its `next_attempt_at` has passed; the table keeps that from
 * being earlier than `attempt_expires_at`, so a case is never due while its attempt can still
 * write the account. A crash leaves the case due again once the lease ends. A case that has
 * used all {@link ABANDON_CASE_MAX_ATTEMPTS} attempts is never claimed (the count would pass the
 * table's bound and abort the statement, wedging the batch); {@link ABANDON_GIVE_UP_SPENT}
 * resolves it. The service gives up on its own earlier, at its own attempt limit below the
 * bound, with {@link ABANDON_RESOLVE} and `gave_up`. Run it inside `withEnvironment`.
 */
export const ABANDON_CLAIM = `with due as (
  select id from auth.abandon_cases
  where environment_id = $1 and resolved_at is null and attempts < ${ABANDON_CASE_MAX_ATTEMPTS}
    and next_attempt_at <= clock_timestamp()
  order by next_attempt_at
  limit $2
  for update skip locked)
update auth.abandon_cases c
set attempts = c.attempts + 1,
    next_attempt_at = clock_timestamp() + make_interval(secs => $3::float8 / 1000),
    updated_at = clock_timestamp()
from due
where c.id = due.id
returning c.id, c.core_organization_id, c.user_id, c.attempt_id, c.attempts`

/**
 * Record the outcome in a second short transaction. `$1` case id, `$2` environment, `$3` the
 * outcome (`done`, `refused` or `gave_up`). No row back means the case was already resolved.
 * This is also what sets `gave_up` when the service reaches its own attempt limit. No row back
 * means the case is already resolved, for example `gave_up` by {@link ABANDON_GIVE_UP_SPENT}
 * while a worker slower than its lease was still calling core: the worker treats that as "already
 * resolved", not as an error. Run it inside `withEnvironment`.
 */
export const ABANDON_RESOLVE = `update auth.abandon_cases
set resolved_at = clock_timestamp(), outcome = $3, updated_at = clock_timestamp()
where id = $1 and environment_id = $2 and resolved_at is null
returning id`

/**
 * Settle a case from inside the account transaction, as its last statement before the commit:
 * the account is written only if this returns a row. `$1` case id, `$2` environment. It makes
 * "account committed" and "case claimed by the sweep" mutually exclusive by a row lock, not by
 * any clock. {@link ABANDON_CLAIM} takes the row `for update skip locked` and raises `attempts`
 * from 0; this takes the same row lock, and only while `attempts = 0`:
 *
 * - **Settle locks first.** The claim skips the locked row. After the commit the case is
 *   resolved, so it is never claimable (a claim that took its snapshot earlier re-checks the
 *   row after the lock and drops it, `resolved_at` no longer being null).
 * - **The claim commits first.** `attempts` is already 1 (or more), so this statement waits on
 *   the claim's lock if it is still held, then re-evaluates its `where` against the new row
 *   version and returns **no row**. The caller must roll back the account and tell the person to
 *   sign up again: the sweep owns the case and will abandon the Organization.
 *
 * Under the default READ COMMITTED level (`withEnvironment` and the pool open plain
 * transactions) that re-evaluation is what Postgres does for an updated row. Under REPEATABLE
 * READ or SERIALIZABLE the same race is a serialization failure (SQLSTATE 40001) instead of no
 * row; the caller treats it the same way and rolls back.
 *
 * **No row means one of four things, and the caller tells the first from the rest by only
 * calling this when it recorded a case for the attempt.** The sweep claimed it (the race
 * above), the in-request abandon already resolved it, the sweep gave up on it, or another settle
 * won. In every one the account must not be written. If no case was recorded there is nothing to
 * settle and this must not be called: it would return no row and look like a lost race.
 * {@link ABANDON_LEARN} changes only `core_organization_id` and the lease update only
 * `next_attempt_at`, so neither disturbs `attempts = 0`.
 *
 * The case is closed as `refused`, the outcome that leaves the Organization in place; `done`
 * would mean core removed it. A distinct value such as `settled` needs a migration for the
 * `abandon_cases_outcome_known` check. It runs on the existing column grants (select, and update
 * of `resolved_at`, `outcome` and `updated_at`) under forced row-level security. Run it inside
 * `withEnvironment`, in the same transaction as the account.
 */
export const ABANDON_SETTLE = `update auth.abandon_cases
set resolved_at = clock_timestamp(), outcome = 'refused', updated_at = clock_timestamp()
where id = $1 and environment_id = $2 and resolved_at is null and attempts = 0
returning id`

/**
 * Resolve spent cases as `gave_up`, one bounded batch: open cases that have used every attempt
 * and whose lease has ended, so no worker holds them. It is the safety net behind the service's
 * own limit (which is lower, so in normal operation this finds nothing). The sweep runs it once
 * per run, after the claim, with a small batch, because it walks the due cases; it assumes the
 * claim's lease exceeds the service's call bound to core. `$1` environment, `$2` batch size. Run
 * it inside `withEnvironment`.
 */
export const ABANDON_GIVE_UP_SPENT = `with batch as (
  select id from auth.abandon_cases
  where environment_id = $1 and resolved_at is null and attempts >= ${ABANDON_CASE_MAX_ATTEMPTS}
    and next_attempt_at <= clock_timestamp()
  order by next_attempt_at
  limit $2
  for update skip locked)
update auth.abandon_cases
set resolved_at = clock_timestamp(), outcome = 'gave_up', updated_at = clock_timestamp()
where id in (select id from batch)
returning id`

/**
 * Fill in the Organization id of a case recorded without one, once it is learned. `$1` case id,
 * `$2` environment, `$3` the Organization id. A row back means it was filled; no row means the
 * case already has an id (it is never overwritten) or is resolved (it is not touched). If another
 * case in the environment already holds that Organization id, the statement fails with the unique
 * violation `abandon_cases_environment_organization_key` (SQLSTATE 23505). The failed statement
 * aborts its transaction, so the service resolves this case with {@link ABANDON_RESOLVE} as
 * `gave_up` in a new one. It reports the violation by ids only (both case ids and the
 * Organization id, never an email) so a person can reconcile: the other case may already be
 * resolved or belong to another user, and the Organization may then never be abandoned. Run it
 * inside `withEnvironment`.
 */
export const ABANDON_LEARN = `update auth.abandon_cases
set core_organization_id = $3, updated_at = clock_timestamp()
where id = $1 and environment_id = $2 and core_organization_id is null and resolved_at is null
returning id`

/**
 * The purge of resolved cases, one bounded batch: resolved a day or more ago by the database
 * clock, oldest first. `$1` environment, `$2` batch size; repeat while a batch comes back full.
 * Run it inside `withEnvironment`.
 */
export const ABANDON_PURGE_BATCH = `with batch as (
  select id from auth.abandon_cases
  where environment_id = $1 and resolved_at is not null
    and resolved_at < clock_timestamp() - interval '1 day'
  order by resolved_at
  limit $2
  for update skip locked)
delete from auth.abandon_cases
where id in (select id from batch)`

/** Every statement above by name, for the README check and the integration tests. */
export const AUTH_STATEMENTS = {
  LOCKOUT_ATTEMPT,
  LOCKOUT_RETRY_AFTER,
  LOCKOUT_CLEAR,
  RATE_HIT,
  COUNTER_PURGE_BATCH,
  ABANDON_RECORD,
  ABANDON_CLAIM,
  ABANDON_RESOLVE,
  ABANDON_SETTLE,
  ABANDON_PURGE_BATCH,
  ABANDON_GIVE_UP_SPENT,
  ABANDON_LEARN,
} as const
