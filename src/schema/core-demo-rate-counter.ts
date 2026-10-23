import { sql } from 'drizzle-orm'
import { check, customType, index, integer, primaryKey, timestamp } from 'drizzle-orm/pg-core'
import { coreSchema } from './core'

/** The length in bytes of an address hash: an HMAC-SHA256, which core computes. */
export const DEMO_RATE_ADDRESS_HASH_BYTES = 32

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType() {
    return 'bytea'
  },
})

/**
 * One counter of the per-address rate limit on the public demo-request route: how many requests an
 * address made in one fixed window. Closeline itself holds it, not an Organization, so it has no
 * `organization_id` and sits outside row-level security, like `core.demo_request`: it is on the
 * allowlist, and no service role holds any privilege on it. Only `core.hit_demo_rate_limit` and
 * `core.purge_demo_rate_counters` reach it.
 *
 * - `address_hash` is an HMAC-SHA256 of the address, made by core. A raw address is never stored.
 * - `window_start` is the start of the window, aligned to the window length.
 * - `hits` counts every request in the window, including those over the limit.
 *
 * Lists served:
 * - The retention purge: `WHERE window_start < $cutoff ORDER BY window_start LIMIT n`, on
 *   `demo_rate_counters_window_start_idx`.
 */
export const demoRateCounters = coreSchema.table(
  'demo_rate_counter',
  {
    addressHash: bytea('address_hash').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    hits: integer('hits').notNull(),
  },
  (t) => [
    primaryKey({ name: 'demo_rate_counter_pkey', columns: [t.addressHash, t.windowStart] }),
    check(
      'demo_rate_counter_address_hash_length',
      sql`octet_length(${t.addressHash}) = ${sql.raw(String(DEMO_RATE_ADDRESS_HASH_BYTES))}`
    ),
    check('demo_rate_counter_hits_positive', sql`${t.hits} >= 1`),
    index('demo_rate_counters_window_start_idx').on(t.windowStart),
  ]
)

/** A demo rate counter row. */
export type DemoRateCounter = typeof demoRateCounters.$inferSelect
