import { sql } from 'drizzle-orm'
import { check, text, timestamp } from 'drizzle-orm/pg-core'
import { playbookSchema } from './playbook'
import { GLOBAL_SCOPE_ORGANIZATION_ID } from './playbook-tables'

/**
 * The marker behind the `orphan_sweep` work kind, one row per Organization that has ever attempted
 * an upload. A **tenant table** (row-level security, fail-closed). The idempotency-key insert
 * trigger (every upload attempt writes a key) writes it as `SECURITY DEFINER`: `last_attempt_at` is
 * the newest attempt, `pending_since` a lower bound on the oldest attempt whose stored object the
 * service has not yet examined (null when none is pending). The service moves it with
 * `ORPHAN_SWEEP_DONE`, which sets `swept_through` (the time through which objects were examined) and
 * clears or advances `pending_since`; it can update those two columns and nothing else. The
 * discovery function reports an Organization as having work when `pending_since` is set, due
 * `pending_since + ORPHAN_SWEEP_AGE_MS`. It outlives the work hint and the idempotency keys (which
 * are purged earlier than the orphan age), which is why it is a table and not a hint column.
 */
export const playbookOrphanSweeps = playbookSchema.table(
  'orphan_sweeps',
  {
    organizationId: text('organization_id').primaryKey(),
    pendingSince: timestamp('pending_since', { withTimezone: true }),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }).notNull(),
    sweptThrough: timestamp('swept_through', { withTimezone: true }),
  },
  (t) => [
    check(
      'orphan_sweeps_organization_id_shape',
      sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
    ),
    check(
      'orphan_sweeps_organization_not_global',
      sql.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID}'`)
    ),
    check('orphan_sweeps_pending_not_after_last', sql`${t.pendingSince} <= ${t.lastAttemptAt}`),
  ]
)
