// Shared constants and SQL fragments of the statement files (kept apart so the files that build on them do not import each other).

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

/**
 * How old an upload attempt is when its stored object may be an orphan worth sweeping, in
 * milliseconds: 25 hours. The service deletes an orphan object only when it is older than 24 hours;
 * the extra hour covers the time between an attempt's start (its key's `created_at`) and the object
 * being written. `organizations_with_work` reports `orphan_sweep` at this age after the oldest
 * attempt not yet marked swept, and {@link ORPHAN_SWEEP_DONE} cuts the swept-through time to this
 * long before now, so an attempt counts as swept only when its object was surely old enough to be
 * deleted.
 */
export const ORPHAN_SWEEP_AGE_MS = 25 * 60 * 60 * 1000

/**
 * How old an idempotency key is when it becomes purgeable, in milliseconds: 26 hours, one hour more
 * than {@link ORPHAN_SWEEP_AGE_MS}, so the key of an upload attempt is still there when its orphan
 * sweep is due. Core documents no age for its own keys, so this is the playbook's.
 * `organizations_with_work` hints `idempotency_purge` at this age, and {@link IDEMPOTENCY_PURGE}
 * is floored at this age in SQL, so a younger age passed to it is raised to this one.
 */
export const IDEMPOTENCY_PURGE_AGE_MS = ORPHAN_SWEEP_AGE_MS + 60 * 60 * 1000

/**
 * The least age, in milliseconds, {@link IDEMPOTENCY_PURGE} removes a key at: the same 26 hours as
 * {@link IDEMPOTENCY_PURGE_AGE_MS}, so no caller can purge the keys of unswept upload attempts.
 */
export const IDEMPOTENCY_MIN_PURGE_AGE_MS = IDEMPOTENCY_PURGE_AGE_MS

// A batch size or page size clamped to 1..max in SQL, null included.
export const CLAMP = (parameter: string, max: number) =>
  `least(greatest(coalesce(${parameter}::int, 1), 1), ${max})`
export const BATCH = (parameter: string) => CLAMP(parameter, PLAYBOOK_MAX_BATCH)

export const LEASE = (parameter: string) =>
  `make_interval(secs => greatest(coalesce(${parameter}::float8, 0), ${PLAYBOOK_MIN_LEASE_MS}) / 1000)`
