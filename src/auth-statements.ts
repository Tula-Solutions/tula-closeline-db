import { ABANDON_CASE_MAX_ATTEMPTS } from './schema/auth/abandon-cases'

/**
 * The least grace, in milliseconds, {@link ABANDON_RECORD} leaves between a sign-up attempt's
 * expiry and the first time its case is due: the retention floor of the service, 10 s (twice the
 * 5 s bound on a call to core). A smaller grace passed in is raised to this. The service passes
 * its call bound plus a skew margin; this floor is the least safe value, not a good one.
 */
export const ABANDON_MIN_GRACE_MS = 10_000

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

// The index into the wait schedule for that count; the last element serves every later failure.
const SCHEDULE_AT = `($3::int[])[least(${NEXT_FAILURES}, cardinality($3::int[]))]`

/**
 * One attempted sign-in of an address, counted up front. `$1` environment, `$2` key hash, `$3`
 * the wait in milliseconds after failure 1, 2, 3, ... (an `int[]`; the last element serves every
 * later failure), `$4` the forgetting period in milliseconds. A row back means the attempt may
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
        clock_timestamp() + make_interval(secs => ($3::int[])[1]::float8 / 1000),
        clock_timestamp() + make_interval(secs => (($3::int[])[1] + $4::int)::float8 / 1000))
on conflict (environment_id, kind, key_hash) do update set
  hits = least(${NEXT_FAILURES}, 1000000),
  started_at = case when c.expires_at <= (select tick from ts) then (select tick from ts) else c.started_at end,
  locked_until = (select tick from ts) + make_interval(secs => ${SCHEDULE_AT}::float8 / 1000),
  expires_at = (select tick from ts) + make_interval(secs => (${SCHEDULE_AT} + $4::int)::float8 / 1000)
where c.locked_until <= (select tick from ts)
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
export const RATE_HIT = `with ts as (select clock_timestamp() as tick)
insert into auth.attempt_counters as c
  (environment_id, kind, key_hash, hits, started_at, expires_at)
values ($1, 'rate_limit', $2, 1, clock_timestamp(),
        clock_timestamp() + make_interval(secs => $3::float8 / 1000))
on conflict (environment_id, kind, key_hash) do update set
  hits = case when c.expires_at <= (select tick from ts) then 1 else least(c.hits + 1, 1000000) end,
  started_at = case when c.expires_at <= (select tick from ts) then (select tick from ts) else c.started_at end,
  expires_at = case when c.expires_at <= (select tick from ts)
                    then (select tick from ts) + make_interval(secs => $3::float8 / 1000)
                    else c.expires_at end
returning hits, greatest(0, ceil(extract(epoch from expires_at - clock_timestamp()) * 1000))::int as retry_after_ms`

/**
 * The purge of dead counters, one bounded batch, **across all environments on purpose** (it is
 * housekeeping of a table without row-level security): rows expired for at least a minute by the
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
 * milliseconds. A case is due when its `next_attempt_at` has passed; the table keeps that from
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
 * This is also what sets `gave_up` when the service reaches its own attempt limit. Run it inside
 * `withEnvironment`.
 */
export const ABANDON_RESOLVE = `update auth.abandon_cases
set resolved_at = clock_timestamp(), outcome = $3, updated_at = clock_timestamp()
where id = $1 and environment_id = $2 and resolved_at is null
returning id`

/**
 * Resolve spent cases as `gave_up`, one bounded batch: open cases that have used every attempt
 * and whose lease has ended, so no worker holds them. It is the safety net behind the service's
 * own limit (which is lower, so in normal operation this finds nothing); run it now and then, not
 * on every sweep, because it walks the due cases. `$1` environment, `$2` batch size. Run it
 * inside `withEnvironment`.
 */
export const ABANDON_GIVE_UP_SPENT = `update auth.abandon_cases
set resolved_at = clock_timestamp(), outcome = 'gave_up', updated_at = clock_timestamp()
where id in (
  select id from auth.abandon_cases
  where environment_id = $1 and resolved_at is null and attempts >= ${ABANDON_CASE_MAX_ATTEMPTS}
    and next_attempt_at <= clock_timestamp()
  order by next_attempt_at
  limit $2
  for update skip locked)
returning id`

/**
 * Fill in the Organization id of a case recorded without one, once it is learned. `$1` case id,
 * `$2` environment, `$3` the Organization id. A row back means it was filled; no row means the
 * case already has an id (it is never overwritten) or is resolved (it is not touched). If another
 * case in the environment already holds that Organization id, the statement fails with the unique
 * violation `abandon_cases_environment_organization_key` (SQLSTATE 23505): that Organization is
 * already tracked by the other case, so the service resolves this one with {@link ABANDON_RESOLVE}
 * as `gave_up` and does nothing else. Run it inside `withEnvironment`.
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
  ABANDON_GIVE_UP_SPENT,
  ABANDON_LEARN,
} as const
