import { sql } from 'drizzle-orm'
import { check, text, timestamp } from 'drizzle-orm/pg-core'
import { playbookSchema } from './playbook'
import { GLOBAL_SCOPE_ORGANIZATION_ID } from './playbook-tables'

/**
 * What the `orphan_sweep` work kind remembers between sweeps: one row per Organization, the time
 * through which the service has swept stored objects for orphans (`swept_through`). A **tenant
 * table** (row-level security, fail-closed). It is written only by `playbook.orphan_sweep_done`
 * (`ORPHAN_SWEEP_DONE`), never by an upload attempt, so concurrent attempts of one Organization
 * share no row and never wait for each other. The upload attempts themselves are the idempotency
 * keys (`created_at`), and the work hint holds the oldest unswept one; the discovery function
 * reports an Organization when an attempt is newer than `swept_through`. The role can read its row
 * and cannot write it directly.
 */
export const playbookOrphanSweeps = playbookSchema.table(
  'orphan_sweeps',
  {
    organizationId: text('organization_id').primaryKey(),
    sweptThrough: timestamp('swept_through', { withTimezone: true }).notNull(),
  },
  () => [
    check(
      'orphan_sweeps_organization_id_shape',
      sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
    ),
    check(
      'orphan_sweeps_organization_not_global',
      sql.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID}'`)
    ),
  ]
)
