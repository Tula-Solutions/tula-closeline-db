import { sql } from 'drizzle-orm'
import {
  check,
  customType,
  index,
  jsonb,
  primaryKey,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import {
  IDEMPOTENCY_HASH_BYTES,
  IDEMPOTENCY_KEY_MAX,
  IDEMPOTENCY_RESPONSE_MAX_BYTES,
  IDEMPOTENCY_ROUTE_MAX,
} from './core-tables'
import { voiceSchema } from './voice'

const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)

// A `bytea` column read and written as bytes, whichever driver is underneath.
const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
})

/**
 * The outcome of one public `POST` of the voice service that has an effect worth not repeating
 * (`addLine` buys a number), per Organization, user, route and client key: playbook's
 * `idempotency_keys` (migration `0011`) with the same columns, checks and write-once trigger, and
 * like it **without a foreign key to organizations** (the voice schema has no Organization table;
 * the id is checked by shape). The service inserts the row in flight, does its work and completes
 * the row (status and response together); a completed row is never rewritten. A retry with the
 * same key and the same `request_hash` replays the stored response; a different hash is the
 * contract's idempotency conflict. The purge is per Organization and bounded, on
 * `idempotency_keys_purge_idx` (`organization_id`, `created_at`).
 */
export const voiceIdempotencyKeys = voiceSchema.table(
  'idempotency_keys',
  {
    organizationId: text('organization_id').notNull(),
    userId: text('user_id').notNull(),
    route: text('route').notNull(),
    key: text('key').notNull(),
    requestHash: bytes('request_hash').notNull(),
    status: smallint('status'),
    response: jsonb('response').$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'idempotency_keys_pkey',
      columns: [t.organizationId, t.userId, t.route, t.key],
    }),
    check('idempotency_keys_organization_id_shape', idShape('organization_id', 'org')),
    check(
      'idempotency_keys_organization_not_global',
      sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
    ),
    check('idempotency_keys_user_id_shape', idShape('user_id', 'usr')),
    check(
      'idempotency_keys_route_shape',
      sql`char_length(${t.route}) between 1 and ${sql.raw(String(IDEMPOTENCY_ROUTE_MAX))}
        and ${t.route} collate "C" ~ '^[a-z0-9._]+$'`
    ),
    check(
      'idempotency_keys_key_shape',
      sql`char_length(${t.key}) between 1 and ${sql.raw(String(IDEMPOTENCY_KEY_MAX))}
        and ${t.key} collate "C" ~ '^[!-~]+$'`
    ),
    check(
      'idempotency_keys_request_hash_length',
      sql`octet_length(${t.requestHash}) = ${sql.raw(String(IDEMPOTENCY_HASH_BYTES))}`
    ),
    check('idempotency_keys_status_range', sql`${t.status} between 100 and 599`),
    check(
      'idempotency_keys_response_matches_status',
      sql`(${t.status} is null) = (${t.response} is null)`
    ),
    check(
      'idempotency_keys_response_size',
      sql`octet_length(${t.response}::text) <= ${sql.raw(String(IDEMPOTENCY_RESPONSE_MAX_BYTES))}`
    ),
    index('idempotency_keys_purge_idx').on(t.organizationId, t.createdAt),
  ]
)
