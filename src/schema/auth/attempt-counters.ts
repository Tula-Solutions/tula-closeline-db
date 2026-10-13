import { sql } from 'drizzle-orm'
import {
  check,
  customType,
  index,
  integer,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { environments } from './environments'
import { authSchema } from './pg-schema'

// A `bytea` column read and written as bytes, whichever driver is underneath.
const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
})

/** What a counter row counts: failed sign-ins of an address, or requests against a limit. */
export const ATTEMPT_COUNTER_KINDS = ['lockout', 'rate_limit'] as const

/** The most a counter counts to: the bound the database keeps (`attempt_counters_hits_bounds`). */
export const ATTEMPT_COUNTER_MAX_HITS = 1_000_000

/** Length in bytes of a key hash: HMAC-SHA-256. */
export const ATTEMPT_COUNTER_KEY_HASH_BYTES = 32

/**
 * The counters behind sign-in lockout and the per-key rate limits (ADR 0014, hub issue 30), shared
 * by every instance of the auth service. One table serves both ports: a `lockout` row counts the
 * failed sign-ins of one address in one environment and says until when it is locked; a
 * `rate_limit` row counts the requests of one key in a fixed window.
 *
 * **It holds no address and no IP address.** `key_hash` is a keyed hash (HMAC-SHA-256) of the
 * port's key, computed by the service with a key that never reaches the database, so a holder of
 * the rows cannot test a guess at an address against them. Rotating that key starts every counter
 * over; rows expire within hours, so nothing is migrated.
 *
 * One row per `(environment_id, kind, key_hash)`; the service counts with one
 * `insert ... on conflict (environment_id, kind, key_hash) do update` per attempt (see the README),
 * which Postgres serialises on the row, so instances never lose a count. `hits` is capped at
 * {@link ATTEMPT_COUNTER_MAX_HITS}. A row is dead once `expires_at` has passed: the next attempt
 * starts it over, and the purge deletes it in bounded batches over `attempt_counters_purge_idx`,
 * so the table does not grow with every address ever seen.
 *
 * It has no row-level security and no `organization_id`: a sign-in is counted before any account
 * or Organization is known. It is listed as a control-plane table of `auth`, held down by the
 * grants (the service role may read, insert, delete and update the four counter columns, nothing
 * else). It is not on the Organization allowlist, which forbids every service-role privilege: the
 * service must write it directly.
 */
export const attemptCounters = authSchema.table(
  'attempt_counters',
  {
    environmentId: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ATTEMPT_COUNTER_KINDS }).notNull(),
    /** HMAC-SHA-256 of the port's key (`sign_in:<identifier>`, `sign_up:ip:<address>`, ...). */
    keyHash: bytes('key_hash').notNull(),
    /** Failures (`lockout`) or requests (`rate_limit`) counted since `started_at`, at least 1. */
    hits: integer('hits').notNull(),
    /** When this count began: the first failure since the address was forgotten, or the window start. */
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    /** A `lockout` row's lock: attempts before it are refused. Null on a `rate_limit` row. */
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    /** When the row is forgotten: the end of a window, or the lock plus the forgetting period. */
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ name: 'attempt_counters_pkey', columns: [t.environmentId, t.kind, t.keyHash] }),
    check('attempt_counters_kind_known', sql`${t.kind} in ('lockout', 'rate_limit')`),
    check(
      'attempt_counters_key_hash_length',
      sql`octet_length(${t.keyHash}) = ${sql.raw(String(ATTEMPT_COUNTER_KEY_HASH_BYTES))}`
    ),
    check(
      'attempt_counters_hits_bounds',
      sql`${t.hits} between 1 and ${sql.raw(String(ATTEMPT_COUNTER_MAX_HITS))}`
    ),
    check('attempt_counters_window_order', sql`${t.expiresAt} > ${t.startedAt}`),
    check(
      'attempt_counters_lock_whole',
      sql`(${t.kind} = 'lockout') = (${t.lockedUntil} is not null)`
    ),
    check(
      'attempt_counters_lock_before_expiry',
      sql`${t.lockedUntil} is null or ${t.lockedUntil} <= ${t.expiresAt}`
    ),
    // The purge: expired rows, oldest first.
    index('attempt_counters_purge_idx').on(t.expiresAt),
  ]
)

/** A row of the sign-in lockout and rate-limit counters. */
export type AttemptCounter = typeof attemptCounters.$inferSelect
/** Insert shape for a counter row. */
export type NewAttemptCounter = typeof attemptCounters.$inferInsert
