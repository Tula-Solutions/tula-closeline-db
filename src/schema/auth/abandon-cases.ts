import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
  pgPolicy,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { environments } from './environments'
import { primaryKey, timestamps } from './mixins'
import { authSchema } from './pg-schema'
import { TENANT_PREDICATE, tenantColumns } from './tenant-columns'

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
 * One row per Organization and one per attempt in an environment, so recording a case twice is
 * `insert ... on conflict do nothing`. **A resolved case keeps blocking a new case for the same
 * Organization until the purge removes it**; that is by design (core gives a retrying user a
 * fresh Organization id, so the same id is never recorded again) and the conflict is silent. It is an environment-scoped
 * table like `flow_attempts`, which is written at the same point of a sign-up: the environment is
 * known then, the Organization is not a scope here, and it carries no `organization_id` column
 * (auth users are global within a Region, ADR 0005), hence the longer name.
 *
 * A sweep claims a batch as a lease (the README has the statements): a short transaction takes due
 * cases with `for update skip locked` over `abandon_cases_due_idx`, pushes `next_attempt_at`
 * forward and counts the attempt; core is called outside any transaction; a second short
 * transaction records the outcome. The service role may delete only resolved rows
 * (`abandon_cases_resolved_only`): the record of an orphan cannot be dropped before it has an
 * outcome. It may update only the columns that move a case along.
 */
export const abandonCases = authSchema.table(
  'abandon_cases',
  {
    id: primaryKey(),
    ...tenantColumns(),
    /**
     * The core Organization to abandon. Null for a timed-out create whose Organization id was never
     * learned: that case is keyed by its attempt (`abandon_cases_environment_attempt_key`) and the
     * service fills the id in once it learns it.
     */
    coreOrganizationId: uuid('core_organization_id'),
    /** The user id the sign-up attempt fixed; it has no account, so it is not a foreign key. */
    userId: uuid('user_id').notNull(),
    /** The flow attempt, which keys the idempotency of the abandon call (`abandon:<attempt id>`). */
    attemptId: uuid('attempt_id').notNull(),
    /** Times the sweep has tried so far. */
    attempts: integer('attempts').notNull().default(0),
    /**
     * The time after which the attempt can no longer write an account, supplied at insert, so the
     * sweep does not depend on the purged `flow_attempts` row.
     */
    attemptExpiresAt: timestamp('attempt_expires_at', { withTimezone: true }).notNull(),
    /**
     * When the sweep may next try, never before {@link abandonCases.attemptExpiresAt}
     * (`abandon_cases_due_after_expiry`), so a case that is due is one whose attempt is over. The
     * claim pushes it forward by a lease. For an open case the due index is ordered by it.
     */
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull(),
    /** Set with {@link abandonCases.outcome} when the case ends. Null while it is open. */
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    /** How the case ended: `done`, `refused` (core's guard said no) or `gave_up`. Null while open. */
    outcome: text('outcome', { enum: ABANDON_CASE_OUTCOMES }),
    ...timestamps(),
  },
  (t) => [
    // Postgres treats nulls as distinct in a unique key (NULLS DISTINCT, the default), so any
    // number of cases with no Organization id yet coexist, each held to one per attempt below.
    unique('abandon_cases_environment_organization_key').on(t.environmentId, t.coreOrganizationId),
    unique('abandon_cases_environment_attempt_key').on(t.environmentId, t.attemptId),
    check('abandon_cases_due_after_expiry', sql`${t.nextAttemptAt} >= ${t.attemptExpiresAt}`),
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
    // The tenant constraints of every environment table, without the plain `environment_id`
    // index: both unique keys and both partial indexes lead with it, so it would only slow writes.
    foreignKey({
      name: 'abandon_cases_environment_project_fk',
      columns: [t.environmentId, t.projectId],
      foreignColumns: [environments.id, environments.projectId],
    }).onDelete('cascade'),
    pgPolicy('abandon_cases_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      using: TENANT_PREDICATE,
      withCheck: TENANT_PREDICATE,
    }),
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
