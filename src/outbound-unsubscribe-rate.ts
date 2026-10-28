import { sql } from 'drizzle-orm'
import type { Database } from './client'

const KEY_HASH_BYTES = 32
const WINDOW_SECONDS_MAX = 86_400
const INT4_MAX = 2_147_483_647

/** The most rate counters one purge deletes; the database caps a larger limit to this. */
export const UNSUBSCRIBE_RATE_PURGE_BATCH_MAX = 1000

/** What one request counts against: the hashed key, the window length and the most allowed. */
export interface UnsubscribeRateLimitHit {
  /** An HMAC-SHA256 of a client address or token: exactly 32 bytes. A raw value is never sent. */
  keyHash: Uint8Array
  /** The window length in seconds, 1 to 86400. Windows are aligned to this length. */
  windowSeconds: number
  /** The most requests allowed per window, at least 1. */
  limit: number
}

/**
 * Count one unsubscribe request against a key and say whether it is within the limit. One atomic
 * upsert in `outbound.hit_unsubscribe_rate_limit`, so concurrent calls never let more than `limit`
 * through; a request over the limit still counts. Run it on the pooled handle: the table has no
 * Organization.
 *
 * @param db - A database handle connected as `closeline_outbound`.
 * @param hit - The hashed key, the window length and the limit.
 * @returns True while the window's count is at most `limit`; false once it is over.
 * @throws If the hash is not 32 bytes, or a number is not a whole number in range (before any query runs).
 */
export async function hitUnsubscribeRateLimit(
  db: Pick<Database, 'execute'>,
  hit: UnsubscribeRateLimitHit
): Promise<boolean> {
  if (!(hit.keyHash instanceof Uint8Array) || hit.keyHash.length !== KEY_HASH_BYTES) {
    throw new Error(`hitUnsubscribeRateLimit: keyHash must be ${KEY_HASH_BYTES} bytes`)
  }
  if (
    !Number.isInteger(hit.windowSeconds) ||
    hit.windowSeconds < 1 ||
    hit.windowSeconds > WINDOW_SECONDS_MAX
  ) {
    throw new Error(
      `hitUnsubscribeRateLimit: windowSeconds must be a whole number from 1 to ${WINDOW_SECONDS_MAX}`
    )
  }
  if (!Number.isInteger(hit.limit) || hit.limit < 1 || hit.limit > INT4_MAX) {
    throw new Error('hitUnsubscribeRateLimit: limit must be a positive integer')
  }
  const { rows } = await db.execute<{ allowed: boolean }>(
    sql`select outbound.hit_unsubscribe_rate_limit(${Buffer.from(hit.keyHash)}, ${hit.windowSeconds}, ${hit.limit}) as allowed`
  )
  return rows[0]?.allowed === true
}

/**
 * Delete rate counters whose window started more than a day ago, oldest first, in one bounded
 * batch. Repeat until it returns less than `limit`. It calls `outbound.purge_unsubscribe_rate_counters`.
 *
 * @param db - A database handle connected as `closeline_outbound`.
 * @param limit - The most to delete, at least 1; the database caps it at {@link UNSUBSCRIBE_RATE_PURGE_BATCH_MAX}.
 * @returns How many were deleted.
 * @throws If `limit` is not a positive whole number (before any query runs).
 */
export async function purgeUnsubscribeRateCounters(
  db: Pick<Database, 'execute'>,
  limit: number
): Promise<number> {
  if (!Number.isInteger(limit) || limit < 1 || limit > INT4_MAX) {
    throw new Error('purgeUnsubscribeRateCounters: limit must be a positive integer')
  }
  const { rows } = await db.execute<{ purged: number }>(
    sql`select outbound.purge_unsubscribe_rate_counters(${limit}) as purged`
  )
  return Number(rows[0]?.purged ?? 0)
}
