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
 */

// The failure count after this attempt, as the do-update branch computes it.
const NEXT_FAILURES = 'case when c.expires_at <= clock_timestamp() then 1 else c.hits + 1 end'

// The index into the wait schedule for that count; the last element serves every later failure.
const SCHEDULE_AT = `($3::int[])[least(${NEXT_FAILURES}, cardinality($3::int[]))]`

/**
 * One attempted sign-in of an address, counted up front. `$1` environment, `$2` key hash, `$3`
 * the wait in milliseconds after failure 1, 2, 3, ... (an `int[]`; the last element serves every
 * later failure), `$4` the forgetting period in milliseconds. A row back means the attempt may
 * go ahead (`hits` failures counted, `wait_ms` the wait this failure imposes); no row back means
 * the address is locked and the attempt was not counted (read {@link LOCKOUT_RETRY_AFTER}).
 */
export const LOCKOUT_ATTEMPT = `insert into auth.attempt_counters as c
  (environment_id, kind, key_hash, hits, started_at, locked_until, expires_at)
values ($1, 'lockout', $2, 1, clock_timestamp(),
        clock_timestamp() + make_interval(secs => ($3::int[])[1]::float8 / 1000),
        clock_timestamp() + make_interval(secs => (($3::int[])[1] + $4::int)::float8 / 1000))
on conflict (environment_id, kind, key_hash) do update set
  hits = least(${NEXT_FAILURES}, 1000000),
  started_at = case when c.expires_at <= clock_timestamp() then clock_timestamp() else c.started_at end,
  locked_until = clock_timestamp() + make_interval(secs => ${SCHEDULE_AT}::float8 / 1000),
  expires_at = clock_timestamp() + make_interval(secs => (${SCHEDULE_AT} + $4::int)::float8 / 1000)
where c.locked_until <= clock_timestamp()
returning hits, ($3::int[])[least(hits, cardinality($3::int[]))] as wait_ms`

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

/**
 * One request against a fixed-window limit. `$1` environment, `$2` key hash, `$3` the window in
 * milliseconds. The request is allowed when `hits <= limit`; requests over the limit are counted
 * too. `retry_after_ms` is the time to the end of the window.
 */
export const RATE_HIT = `insert into auth.attempt_counters as c
  (environment_id, kind, key_hash, hits, started_at, expires_at)
values ($1, 'rate_limit', $2, 1, clock_timestamp(),
        clock_timestamp() + make_interval(secs => $3::float8 / 1000))
on conflict (environment_id, kind, key_hash) do update set
  hits = case when c.expires_at <= clock_timestamp() then 1 else least(c.hits + 1, 1000000) end,
  started_at = case when c.expires_at <= clock_timestamp() then clock_timestamp() else c.started_at end,
  expires_at = case when c.expires_at <= clock_timestamp()
                    then clock_timestamp() + make_interval(secs => $3::float8 / 1000)
                    else c.expires_at end
returning hits, greatest(0, ceil(extract(epoch from expires_at - clock_timestamp()) * 1000))::int as retry_after_ms`

/**
 * The purge of dead counters, one bounded batch: rows expired for at least a minute by the
 * database clock, oldest first, skipping rows another purge holds. `$1` is the batch size; repeat
 * while a batch comes back full.
 */
export const COUNTER_PURGE_BATCH = `delete from auth.attempt_counters
where (environment_id, kind, key_hash) in (
  select environment_id, kind, key_hash from auth.attempt_counters
  where expires_at < clock_timestamp() - interval '1 minute'
  order by expires_at
  limit $1
  for update skip locked)`

/**
 * Record an abandon case, once. `$1` id, `$2` project, `$3` environment, `$4` the Organization id
 * (null when a timed-out create never revealed it), `$5` user id, `$6` attempt id, `$7` the time
 * after which the attempt can no longer write an account. A case already recorded for the
 * Organization or for the attempt, open or resolved, is left alone and no row comes back.
 */
export const ABANDON_RECORD = `insert into auth.abandon_cases
  (id, project_id, environment_id, core_organization_id, user_id, attempt_id,
   attempt_expires_at, next_attempt_at)
values ($1, $2, $3, $4, $5, $6, $7::timestamptz, $7::timestamptz)
on conflict do nothing
returning id`

/**
 * Claim a batch of due cases as a lease: the short transaction that runs this commits at once,
 * and core is called outside any transaction. `$1` environment, `$2` batch size, `$3` the lease in
 * milliseconds. A case is due when its `next_attempt_at` has passed; the table keeps that from
 * being earlier than `attempt_expires_at`, so a case is never due while its attempt can still
 * write the account. A crash leaves the case due again once the lease ends.
 */
export const ABANDON_CLAIM = `with due as (
  select id from auth.abandon_cases
  where environment_id = $1 and resolved_at is null and next_attempt_at <= clock_timestamp()
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
 */
export const ABANDON_RESOLVE = `update auth.abandon_cases
set resolved_at = clock_timestamp(), outcome = $3, updated_at = clock_timestamp()
where id = $1 and environment_id = $2 and resolved_at is null
returning id`

/**
 * The purge of resolved cases, one bounded batch: resolved a day or more ago by the database
 * clock, oldest first. `$1` environment, `$2` batch size; repeat while a batch comes back full.
 */
export const ABANDON_PURGE_BATCH = `delete from auth.abandon_cases
where id in (
  select id from auth.abandon_cases
  where environment_id = $1 and resolved_at is not null
    and resolved_at < clock_timestamp() - interval '1 day'
  order by resolved_at
  limit $2
  for update skip locked)`

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
  ABANDON_PURGE_BATCH,
} as const
