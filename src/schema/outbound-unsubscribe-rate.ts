import { sql } from 'drizzle-orm'
import { check, customType, index, integer, primaryKey, timestamp } from 'drizzle-orm/pg-core'
import { outboundSchema } from './outbound'

/** The length in bytes of a rate-limit key hash: an HMAC-SHA256, which outbound computes. */
export const UNSUBSCRIBE_RATE_KEY_HASH_BYTES = 32

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType() {
    return 'bytea'
  },
})

/**
 * One counter of the rate limit on the public unsubscribe route: how many requests a key made in
 * one fixed window. A key is an HMAC-SHA256 of a client address or of an unsubscribe token, made
 * by outbound, so no raw address or token is stored. The route is public, so the counter has no
 * Organization and sits outside row-level security; it is on the allowlist and no service role
 * holds any privilege on it. Only `outbound.hit_unsubscribe_rate_limit` and
 * `outbound.purge_unsubscribe_rate_counters` reach it.
 *
 * Lists served:
 * - The retention purge: `WHERE window_start < $cutoff ORDER BY window_start LIMIT n`, on
 *   `unsubscribe_rate_counters_window_start_idx`.
 */
export const unsubscribeRateCounters = outboundSchema.table(
  'unsubscribe_rate_counter',
  {
    keyHash: bytea('key_hash').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    hits: integer('hits').notNull(),
  },
  (t) => [
    primaryKey({ name: 'unsubscribe_rate_counter_pkey', columns: [t.keyHash, t.windowStart] }),
    check(
      'unsubscribe_rate_counter_key_hash_length',
      sql`octet_length(${t.keyHash}) = ${sql.raw(String(UNSUBSCRIBE_RATE_KEY_HASH_BYTES))}`
    ),
    check('unsubscribe_rate_counter_hits_positive', sql`${t.hits} >= 1`),
    index('unsubscribe_rate_counters_window_start_idx').on(t.windowStart),
  ]
)

/** An unsubscribe rate counter row. */
export type UnsubscribeRateCounter = typeof unsubscribeRateCounters.$inferSelect
