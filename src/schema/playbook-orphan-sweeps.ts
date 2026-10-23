import { sql } from 'drizzle-orm'
import { check, text, timestamp } from 'drizzle-orm/pg-core'
import { playbookSchema } from './playbook'
import { GLOBAL_SCOPE_ORGANIZATION_ID } from './playbook-tables'

/** The longest sweep cursor in bytes: an object key is at most 1024 bytes, and the cursor is one. */
export const ORPHAN_SWEEP_CURSOR_MAX_BYTES = 1024

/** The shortest claim deadline, in milliseconds, `orphan_sweep_claim` stores; a smaller value is raised to it. */
export const ORPHAN_SWEEP_MIN_CLAIM_MS = 1000

/** The longest claim deadline, in milliseconds, `orphan_sweep_claim` stores; a longer value is cut to it. */
export const ORPHAN_SWEEP_MAX_CLAIM_MS = 3_600_000

/**
 * What the `orphan_sweep` work kind remembers between sweeps: one row per Organization, the time
 * through which the service has swept stored objects for orphans (`swept_through`). A **tenant
 * table** (row-level security, fail-closed). It is written only by `playbook.orphan_sweep_done`
 * (`ORPHAN_SWEEP_DONE`), never by an upload attempt, so concurrent attempts of one Organization
 * share no row and never wait for each other. The upload attempts themselves are the idempotency
 * keys (`created_at`), and the work hint holds the oldest unswept one; the discovery function
 * reports an Organization when an attempt is newer than `swept_through`. The role can read its row
 * and cannot write it directly.
 *
 * `erased_attempt_at` is the only trace of upload attempts whose idempotency keys erasure
 * (`remove_organization_rest`) deleted: the creation time of the latest one, null when none. It is
 * written only by that function and read by the discovery function and `orphan_sweep_done`, which
 * treat it as a pending attempt until `swept_through` covers it. It holds a time and no content.
 *
 * `sweep_cursor` is the last object key a cut-short listing reached (null when the last sweep
 * completed or none is in progress; at most {@link ORPHAN_SWEEP_CURSOR_MAX_BYTES} bytes). It names
 * an object key, never content. `sweep_claim_until` is the deadline of the instance sweeping the
 * Organization, null when none does. Both are written only by `playbook.orphan_sweep_claim` and
 * `playbook.orphan_sweep_page_done`.
 */
export const playbookOrphanSweeps = playbookSchema.table(
  'orphan_sweeps',
  {
    organizationId: text('organization_id').primaryKey(),
    sweptThrough: timestamp('swept_through', { withTimezone: true }).notNull(),
    erasedAttemptAt: timestamp('erased_attempt_at', { withTimezone: true }),
    sweepCursor: text('sweep_cursor'),
    sweepClaimUntil: timestamp('sweep_claim_until', { withTimezone: true }),
  },
  (t) => [
    check(
      'orphan_sweeps_organization_id_shape',
      sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
    ),
    check(
      'orphan_sweeps_cursor_bounds',
      sql`${t.sweepCursor} is null or octet_length(${t.sweepCursor}) between 1 and ${sql.raw(String(ORPHAN_SWEEP_CURSOR_MAX_BYTES))}`
    ),
    check(
      'orphan_sweeps_organization_not_global',
      sql.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID}'`)
    ),
  ]
)
