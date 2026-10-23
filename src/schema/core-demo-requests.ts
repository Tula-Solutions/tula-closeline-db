import { sql } from 'drizzle-orm'
import { check, index, integer, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { coreSchema } from './core'

/** The states of the notice that tells Closeline's team about a Demo Request. */
export const DEMO_NOTIFICATION_STATUSES = ['pending', 'sent', 'failed'] as const
/** The longest Visitor name or company name, in characters after trimming. Mirrors the contract. */
export const DEMO_REQUEST_NAME_MAX = 200
/** The longest Visitor message, in characters. Mirrors the contract's marketing schemas. */
export const DEMO_REQUEST_MESSAGE_MAX = 2000
/** The longest source page path, in characters. Mirrors the contract's marketing schemas. */
export const DEMO_REQUEST_SOURCE_PAGE_MAX = 200
/** The shortest and longest idempotency key of a Demo Request, in characters. */
export const DEMO_REQUEST_KEY_LENGTH = { min: 16, max: 128 } as const

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))

/**
 * A Demo Request: a Visitor's submitted wish to see Closeline. Closeline itself holds it, not an
 * Organization, so it has no `organization_id` and sits outside row-level security, as a third kind
 * of no-access table beside the core directories (ADR 0011): it is on the allowlist, and no
 * service role holds any privilege on it, so no tenant scope can read a row. Only the owner (the
 * migration role) and SECURITY DEFINER functions reach it; a Demo Request is not tenant data.
 *
 * - `id` is `dreq_` and 32 hex digits, built by the service.
 * - `work_email` is stored folded (`lower`), with the same shape rule as `invitations.email`.
 * - `idempotency_key` is the Visitor's retry key, unique across all rows, so a replayed submit
 *   finds the first row. The honeypot field is never stored: there is no column for it.
 * - `notification_status`, `notification_attempts` and `notification_last_attempt_at` are the
 *   outbox for the notice to the team: a row starts `pending`, a worker settles it as `sent`, or
 *   as `failed` after its attempts run out. They follow `webhook_deliveries`' attempts shape.
 *
 * Lists served:
 * - The twelve-month retention purge: `WHERE submitted_at < $cutoff ORDER BY submitted_at LIMIT n`,
 *   on `demo_requests_submitted_at_idx`.
 * - The notice retry scan: `WHERE notification_status = 'pending' ORDER BY submitted_at LIMIT n`
 *   (and `'failed'` for a manual retry), on `demo_requests_notice_idx`.
 */
export const demoRequests = coreSchema.table(
  'demo_request',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    workEmail: text('work_email').notNull(),
    companyName: text('company_name').notNull(),
    message: text('message'),
    sourcePage: text('source_page').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    notificationStatus: text('notification_status', { enum: DEMO_NOTIFICATION_STATUSES })
      .notNull()
      .default('pending'),
    notificationAttempts: integer('notification_attempts').notNull().default(0),
    notificationLastAttemptAt: timestamp('notification_last_attempt_at', { withTimezone: true }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('demo_request_id_shape', sql`"id" ~ '^dreq_[0-9a-f]{32}$'`),
    check(
      'demo_request_name_shape',
      sql`char_length(btrim(${t.name})) between 1 and ${sql.raw(String(DEMO_REQUEST_NAME_MAX))}`
    ),
    // The same rule as `invitations_email_shape`, written out again; a test keeps the two equal.
    check(
      'demo_request_work_email_shape',
      sql`${t.workEmail} = lower(${t.workEmail} collate "C")
        and char_length(${t.workEmail}) between 3 and 320
        and char_length(${t.workEmail}) - char_length(replace(${t.workEmail}, '@', '')) = 1
        and position('@' in ${t.workEmail}) between 2 and char_length(${t.workEmail}) - 1
        and ${t.workEmail} collate "C" !~ '[[:space:][:cntrl:]]'
        and ${t.workEmail} collate "C" ~ '^[!-~]+$'`
    ),
    check(
      'demo_request_company_name_shape',
      sql`char_length(btrim(${t.companyName})) between 1 and ${sql.raw(String(DEMO_REQUEST_NAME_MAX))}`
    ),
    check(
      'demo_request_message_length',
      sql`${t.message} is null or char_length(${t.message}) <= ${sql.raw(String(DEMO_REQUEST_MESSAGE_MAX))}`
    ),
    check(
      'demo_request_source_page_shape',
      sql`char_length(${t.sourcePage}) between 1 and ${sql.raw(String(DEMO_REQUEST_SOURCE_PAGE_MAX))}
        and left(${t.sourcePage}, 1) = '/'`
    ),
    check(
      'demo_request_idempotency_key_length',
      sql`char_length(${t.idempotencyKey}) between ${sql.raw(String(DEMO_REQUEST_KEY_LENGTH.min))} and ${sql.raw(String(DEMO_REQUEST_KEY_LENGTH.max))}`
    ),
    check(
      'demo_request_notification_status_known',
      sql`${t.notificationStatus} in (${list(DEMO_NOTIFICATION_STATUSES)})`
    ),
    check('demo_request_notification_attempts_not_negative', sql`${t.notificationAttempts} >= 0`),
    unique('demo_request_idempotency_key_key').on(t.idempotencyKey),
    index('demo_requests_submitted_at_idx').on(t.submittedAt),
    index('demo_requests_notice_idx')
      .on(t.submittedAt, t.id)
      .where(sql`${t.notificationStatus} = 'pending'`),
  ]
)

/** A Demo Request row. */
export type DemoRequest = typeof demoRequests.$inferSelect
/** Insert shape for a Demo Request. */
export type NewDemoRequest = typeof demoRequests.$inferInsert
