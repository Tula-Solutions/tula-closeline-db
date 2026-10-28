import { sql } from 'drizzle-orm'
import { check, customType, index, integer, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import { voiceSchema } from './voice'

/** The length of a Chat rate-limit key hash, in bytes (an HMAC-SHA256). */
export const CHAT_RATE_KEY_HASH_BYTES = 32

const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
})

/**
 * A fixed-window request counter of the public Website Chat routes. `key_hash` is an HMAC-SHA256
 * made by the service of what is counted (a site, or a client address within a site), never the
 * value itself. One row per Organization, key and window; the service upserts and adds one, so
 * concurrent requests serialise on the row. Rows older than a day are deleted in bounded batches
 * (`chat_rate_counters_window_idx`).
 */
export const voiceChatRateCounters = voiceSchema.table(
  'chat_rate_counters',
  {
    organizationId: text('organization_id').notNull(),
    keyHash: bytes('key_hash').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    hits: integer('hits').notNull(),
  },
  (t) => [
    primaryKey({
      name: 'chat_rate_counters_pkey',
      columns: [t.organizationId, t.keyHash, t.windowStart],
    }),
    check(
      'chat_rate_counters_organization_id_shape',
      sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
    ),
    check(
      'chat_rate_counters_organization_not_global',
      sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
    ),
    check(
      'chat_rate_counters_key_hash_length',
      sql`octet_length(${t.keyHash}) = ${sql.raw(String(CHAT_RATE_KEY_HASH_BYTES))}`
    ),
    check('chat_rate_counters_hits_positive', sql`${t.hits} >= 1`),
    index('chat_rate_counters_window_idx').on(t.organizationId, t.windowStart),
  ]
)
