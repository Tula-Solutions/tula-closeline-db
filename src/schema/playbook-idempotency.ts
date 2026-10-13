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
import { playbookSchema } from './playbook'
import { GLOBAL_SCOPE_ORGANIZATION_ID } from './playbook-tables'

const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)

// A `bytea` column read and written as bytes, whichever driver is underneath.
const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
})

/** The user id of an internal call, which has no user: all zeros, in the `usr_` shape the key needs. */
export const INTERNAL_CALL_USER_ID = 'usr_00000000000000000000000000000000'

/**
 * The outcome of one public `POST` of the playbook service (upload) or one internal call
 * (remove-all), per Organization, user, route and client key: core's `idempotency_keys` (migration
 * `0004`) with the same columns, checks and write-once trigger, **without the foreign key to
 * organizations** (the playbook schema has no Organization table; the id is checked by shape).
 * An internal call has no user and uses {@link INTERNAL_CALL_USER_ID}. The service inserts the row
 * in flight, does its write and completes the row in the same transaction; a completed row is
 * never rewritten. The purge is per Organization and bounded (`IDEMPOTENCY_PURGE`), on
 * `idempotency_keys_purge_idx`.
 */
export const playbookIdempotencyKeys = playbookSchema.table(
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
      sql.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID}'`)
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
