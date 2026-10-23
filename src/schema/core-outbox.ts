import { sql } from 'drizzle-orm'
import {
  check,
  index,
  jsonb,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { coreSchema } from './core'
import { organizations } from './core-tables'

/** The most claims a row gets: after this many the drain leaves it, unpublished, for an operator. */
export const OUTBOX_MAX_ATTEMPTS = 50
/** The longest topic: the name of the event, such as `prospect.created`. */
export const OUTBOX_TOPIC_MAX_LENGTH = 120
/** The longest dedupe key. */
export const OUTBOX_DEDUPE_KEY_MAX_LENGTH = 200
/** The largest payload in bytes, measured on its JSON text. The payload is the event, never a body. */
export const OUTBOX_PAYLOAD_MAX_BYTES = 16_384
/** The longest error code a failed publish records: a code such as `queue.unavailable`, no text. */
export const OUTBOX_ERROR_CODE_MAX_LENGTH = 64
/** The most rows one drain claim returns, and the most one completion names. */
export const OUTBOX_MAX_BATCH = 100
/** The shortest and longest lease of a claim, and the longest retry delay, in milliseconds. */
export const OUTBOX_MIN_LEASE_MS = 1_000
export const OUTBOX_MAX_LEASE_MS = 3_600_000
export const OUTBOX_MAX_RETRY_DELAY_MS = 86_400_000

const orgRef = () =>
  text('organization_id')
    .notNull()
    .references(() => organizations.organizationId, { onDelete: 'cascade' })

/**
 * The transactional outbox of core: an event a service function writes in the same transaction as
 * the change it reports, so the change and its event commit or roll back together. A drain worker
 * later publishes the row to the queue port and marks it published, which makes publishing
 * at-least-once: consumers must be idempotent.
 *
 * - `topic` names the event; `payload` is the event's JSON object, at most
 *   {@link OUTBOX_PAYLOAD_MAX_BYTES}. Put ids and facts in it, never a secret, a token, a
 *   recording or a message body.
 * - `dedupe_key` is unique per Organization (`outbox_dedupe_key`): a replayed write inserts with
 *   `on conflict do nothing` and adds no second row.
 * - `available_at` is when the row may next be claimed: now at insert, pushed out by a claim
 *   (the lease) and by a failed publish (the backoff). `attempts` counts claims.
 * - `published_at` is null until the queue accepted the event. `last_error_code` is the code of the
 *   last failed publish, never its message.
 *
 * Tenant table (fail-closed row-level security). The drain must see every Organization's rows, so
 * it does not read this table: it calls the `SECURITY DEFINER` functions `core.outbox_claim`,
 * `core.outbox_complete` and `core.outbox_fail`, owned by `closeline_core_outbox_drain`.
 *
 * Lists served:
 * - The drain claim: unpublished rows with `available_at <= now()`, oldest first
 *   (`outbox_drain_idx`, partial on `published_at is null`), `for update skip locked`, at most
 *   {@link OUTBOX_MAX_BATCH}.
 * - The retention purge of published rows: `published_at < $cutoff` (`outbox_published_idx`).
 */
export const outbox = coreSchema.table(
  'outbox',
  {
    id: text('id').notNull(),
    organizationId: orgRef(),
    topic: text('topic').notNull(),
    payload: jsonb('payload').notNull(),
    dedupeKey: text('dedupe_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    attempts: smallint('attempts').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    lastErrorCode: text('last_error_code'),
  },
  (t) => [
    primaryKey({ name: 'outbox_pkey', columns: [t.organizationId, t.id] }),
    check('outbox_id_shape', sql.raw(`"id" ~ '^obx_[0-9a-f]{32}$'`)),
    check('outbox_organization_id_shape', sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)),
    check(
      'outbox_organization_not_global',
      sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
    ),
    check(
      'outbox_topic_shape',
      sql`char_length(${t.topic}) between 1 and ${sql.raw(String(OUTBOX_TOPIC_MAX_LENGTH))} and ${t.topic} ~ '^[a-z][a-z0-9_.-]*$'`
    ),
    check(
      'outbox_payload_shape',
      sql`jsonb_typeof(${t.payload}) = 'object' and octet_length(${t.payload}::text) <= ${sql.raw(String(OUTBOX_PAYLOAD_MAX_BYTES))}`
    ),
    check(
      'outbox_dedupe_key_length',
      sql`char_length(${t.dedupeKey}) between 1 and ${sql.raw(String(OUTBOX_DEDUPE_KEY_MAX_LENGTH))}`
    ),
    check(
      'outbox_attempts_range',
      sql`${t.attempts} between 0 and ${sql.raw(String(OUTBOX_MAX_ATTEMPTS))}`
    ),
    check(
      'outbox_last_error_code_shape',
      sql`${t.lastErrorCode} is null or (char_length(${t.lastErrorCode}) <= ${sql.raw(String(OUTBOX_ERROR_CODE_MAX_LENGTH))} and ${t.lastErrorCode} ~ '^[a-z][a-z0-9_.]*$')`
    ),
    uniqueIndex('outbox_dedupe_key').on(t.organizationId, t.dedupeKey),
    index('outbox_drain_idx').on(t.availableAt, t.id).where(sql`${t.publishedAt} is null`),
    index('outbox_published_idx').on(t.publishedAt).where(sql`${t.publishedAt} is not null`),
  ]
)

/** An outbox row. */
export type OutboxRow = typeof outbox.$inferSelect
