import { sql } from 'drizzle-orm'
import { check, index, integer, pgPolicy, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { primaryKey, timestamps } from './mixins'
import { authSchema } from './pg-schema'
import { tenantColumns, tenantConstraints } from './tenant-columns'

/**
 * The most times a sweep may try to abandon one case: the bound the database itself keeps
 * (`abandon_cases_attempts_bounds`). The service gives up well before it, so the check only
 * stops a bug from counting forever.
 */
export const ABANDON_CASE_MAX_ATTEMPTS = 100

/** How an abandon case ended: core removed the Organization, core refused, or the sweep gave up. */
export const ABANDON_CASE_OUTCOMES = ['done', 'refused', 'gave_up'] as const

/**
 * An Organization that core made during a sign-up whose account was then never written, kept so a
 * sweep can ask core to abandon it (ADR 0011, hub issue 36) and the case is not lost when a
 * process stops. A case is written when the in-request abandon call fails, or when the attempt
 * ends with the call undone, and is resolved when the sweep has an answer.
 *
 * **It holds ids only, no personal data**: the Organization id core returned (`core_organization_id`,
 * a uuid the service formats as `org_<32 hex>` on the wire, as it does a user id), the user id the
 * attempt fixed (`user_id`, which has no account, so no foreign key) and the flow attempt's id
 * (`attempt_id`, no foreign key either: attempts are purged seconds after they expire and the case
 * must outlive them). No address, name or Organization name.
 *
 * One row per Organization in an environment (`abandon_cases_environment_organization_key`), so
 * recording a case twice is `insert ... on conflict do nothing`. It is an environment-scoped
 * table like `flow_attempts`, which is written at the same point of a sign-up: the environment is
 * known then, the Organization is not a scope here, and it carries no `organization_id` column
 * (auth users are global within a Region, ADR 0005), hence the longer name.
 *
 * A sweep takes a batch with `for update skip locked` over `abandon_cases_due_idx`, so instances
 * never take the same case. The service role may delete only resolved rows
 * (`abandon_cases_resolved_only`): the record of an orphan cannot be dropped before it has an
 * outcome. It may update only the columns that move a case along.
 */
export const abandonCases = authSchema.table(
  'abandon_cases',
  {
    id: primaryKey(),
    ...tenantColumns(),
    /** The core Organization to abandon. */
    coreOrganizationId: uuid('core_organization_id').notNull(),
    /** The user id the sign-up attempt fixed; it has no account, so it is not a foreign key. */
    userId: uuid('user_id').notNull(),
    /** The flow attempt, which keys the idempotency of the abandon call (`abandon:<attempt id>`). */
    attemptId: uuid('attempt_id').notNull(),
    /** Times the sweep has tried so far. */
    attempts: integer('attempts').notNull().default(0),
    /** When the sweep may next try. For an open case this is what the due index is ordered by. */
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    /** Set with {@link abandonCases.outcome} when the case ends. Null while it is open. */
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    /** How the case ended: `done`, `refused` (core's guard said no) or `gave_up`. Null while open. */
    outcome: text('outcome', { enum: ABANDON_CASE_OUTCOMES }),
    ...timestamps(),
  },
  (t) => [
    unique('abandon_cases_environment_organization_key').on(t.environmentId, t.coreOrganizationId),
    check(
      'abandon_cases_attempts_bounds',
      sql`${t.attempts} between 0 and ${sql.raw(String(ABANDON_CASE_MAX_ATTEMPTS))}`
    ),
    check('abandon_cases_outcome_known', sql`${t.outcome} in ('done', 'refused', 'gave_up')`),
    check(
      'abandon_cases_resolution_whole',
      sql`(${t.resolvedAt} is null) = (${t.outcome} is null)`
    ),
    // The batch: open cases that are due, oldest first.
    index('abandon_cases_due_idx')
      .on(t.environmentId, t.nextAttemptAt)
      .where(sql`${t.resolvedAt} is null`),
    // The purge: resolved cases, oldest first.
    index('abandon_cases_purge_idx')
      .on(t.environmentId, t.resolvedAt)
      .where(sql`${t.resolvedAt} is not null`),
    ...tenantConstraints('abandon_cases', t),
    // Restrictive: ANDed with the tenant policy, so it can only take rows away from a delete.
    pgPolicy('abandon_cases_resolved_only', {
      as: 'restrictive',
      for: 'delete',
      using: sql`resolved_at is not null`,
    }),
  ]
)

/** A row of the abandon cases. */
export type AbandonCase = typeof abandonCases.$inferSelect
/** Insert shape for an abandon case. */
export type NewAbandonCase = typeof abandonCases.$inferInsert
