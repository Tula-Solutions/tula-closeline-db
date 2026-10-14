import { sql } from 'drizzle-orm'
import { check, index, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import { playbookSchema } from './playbook'
import { GLOBAL_SCOPE_ORGANIZATION_ID } from './playbook-tables'

/**
 * The kinds of due work `playbook.organizations_with_work` finds: documents due for purge, ingestion
 * jobs due or with a lapsed lease, deleted documents whose vector cleanup is not recorded, consumed
 * messages old enough to purge, idempotency keys old enough to purge, documents whose purge
 * reached the attempt bound, and Organizations with an upload attempt whose stored objects have not
 * been swept for orphans (`orphan_sweep`, see `playbookOrphanSweeps`), and Deal imports to
 * apply (`import_apply`, see `dealImports`). Calls add `call_jobs` (transcription, processing and
 * rebuild jobs), `call_purge`, `call_cleanup`, `call_purge_spent` (the Call counterparts of the
 * document kinds) and `outcome_retag` (a Deal whose Outcome changed and whose ready Calls are not
 * all re-tagged).
 */
export const WORK_KINDS = [
  'purge_due',
  'jobs_due',
  'cleanup_pending',
  'consumed_purge',
  'idempotency_purge',
  'purge_spent',
  'orphan_sweep',
  'import_apply',
  'call_jobs',
  'call_purge',
  'call_cleanup',
  'call_purge_spent',
  'outcome_retag',
] as const

/**
 * One row per kind of work and Organization that may have work from `due_at` on: the registry the
 * discovery function reads, because row-level security hides every tenant table from any role
 * outside one Organization's scope. **Not a tenant table.** SECURITY DEFINER triggers on the
 * tenant tables write it (an upsert that only moves `due_at` earlier); the discovery function
 * verifies a due row against the tenant tables in that Organization's scope, then moves it to the
 * next due time or removes it. A row is a hint, never the truth: it may be earlier than the real
 * work or outlive it until the next verification, and is never later. No service role holds any
 * privilege on it; the function and the triggers are the only way in. The all-zero global scope
 * appears only for `consumed_purge`.
 */
export const playbookWorkHints = playbookSchema.table(
  'work_hints',
  {
    kind: text('kind', { enum: WORK_KINDS }).notNull(),
    organizationId: text('organization_id').notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ name: 'work_hints_pkey', columns: [t.kind, t.organizationId] }),
    check(
      'work_hints_kind_known',
      sql`${t.kind} in (${sql.raw(WORK_KINDS.map((k) => `'${k}'`).join(', '))})`
    ),
    check('work_hints_organization_id_shape', sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)),
    check(
      'work_hints_global_only_consumed',
      sql`${t.kind} = 'consumed_purge' or ${t.organizationId} <> ${sql.raw(`'${GLOBAL_SCOPE_ORGANIZATION_ID}'`)}`
    ),
    // The due ones of a kind, oldest first: the discovery scan.
    index('work_hints_due_idx').on(t.kind, t.dueAt, t.organizationId),
  ]
)
