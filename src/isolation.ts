import { sql } from 'drizzle-orm'
import type { Database } from './client'
import { ORGANIZATION_SETTING } from './tenant'

/** The Postgres schemas owned by services; every relation in them must be tenant-isolated. */
export const TENANT_SCHEMAS = ['auth', 'core', 'playbook'] as const

/**
 * Tables that deliberately have no `organization_id` and no row-level security, as
 * `schema.table`. Empty today: add an entry only with a decision record that says why the table
 * holds no tenant data.
 */
export const NON_TENANT_TABLES: readonly string[] = []

/** One relation that does not fail closed on `organization_id`, and why. */
export interface TenantIsolationGap {
  /** The Postgres schema. */
  schema: string
  /** The table (or view) name. */
  table: string
  /** What is missing, in one sentence. */
  reason: string
}

interface CatalogRow extends Record<string, unknown> {
  schema: string
  table: string
  kind: string
  has_org: boolean
  enabled: boolean
  forced: boolean
  permissive: number
  weak_permissive: number
}

// Policy text as Postgres stores it contains the setting name as a string literal.
const REFERENCES_SETTING = `'${ORGANIZATION_SETTING}'`

/**
 * Find every table in the service schemas that is not fail-closed on `organization_id`.
 *
 * A table passes when it has an `organization_id` column, row-level security enabled and forced,
 * and at least one permissive policy, with every permissive policy covering all commands and
 * naming `app.organization_id` in both USING and WITH CHECK (so none can open the table). Any
 * other relation (a view, a materialized view, a foreign table) is a gap, because it bypasses
 * row-level security. Tables on `allowlist` are skipped.
 *
 * @param db - A database handle connected as any role; the catalogs are readable by all.
 * @param allowlist - `schema.table` names exempt from the check; defaults to {@link NON_TENANT_TABLES}.
 * @returns The offending relations, ordered by schema and name; empty when all are protected.
 */
export async function findTenantIsolationGaps(
  db: Pick<Database, 'execute'>,
  allowlist: readonly string[] = NON_TENANT_TABLES
): Promise<TenantIsolationGap[]> {
  const schemas = sql.join(
    TENANT_SCHEMAS.map((name) => sql`${name}`),
    sql`, `
  )
  const result = await db.execute<CatalogRow>(sql`
    select n.nspname as schema,
           c.relname as "table",
           c.relkind as kind,
           exists (select 1 from pg_attribute a
                   where a.attrelid = c.oid and a.attname = 'organization_id'
                     and a.attnum > 0 and not a.attisdropped) as has_org,
           c.relrowsecurity as enabled,
           c.relforcerowsecurity as forced,
           (select count(*)::int from pg_policies p
             where p.schemaname = n.nspname and p.tablename = c.relname
               and p.permissive = 'PERMISSIVE') as permissive,
           (select count(*)::int from pg_policies p
             where p.schemaname = n.nspname and p.tablename = c.relname
               and p.permissive = 'PERMISSIVE'
               and not (p.cmd = 'ALL'
                        and coalesce(p.qual, '') like ${`%${REFERENCES_SETTING}%`}
                        and coalesce(p.with_check, '') like ${`%${REFERENCES_SETTING}%`})
           ) as weak_permissive
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname in (${schemas})
       and c.relkind in ('r', 'p', 'v', 'm', 'f')
     order by n.nspname, c.relname`)

  const gaps: TenantIsolationGap[] = []
  for (const row of result.rows) {
    if (allowlist.includes(`${row.schema}.${row.table}`)) {
      continue
    }
    const reason = gapReason(row)
    if (reason) {
      gaps.push({ schema: row.schema, table: row.table, reason })
    }
  }
  return gaps
}

function gapReason(row: CatalogRow): string | undefined {
  if (row.kind !== 'r' && row.kind !== 'p') {
    return 'is not a table, so it bypasses row-level security'
  }
  if (!row.has_org) {
    return 'has no organization_id column and is not on the non-tenant allowlist'
  }
  if (!row.enabled) {
    return 'does not have row-level security enabled'
  }
  if (!row.forced) {
    return 'does not have row-level security forced (the owner would bypass it)'
  }
  if (row.permissive === 0) {
    return 'has no permissive policy, so no role can ever read it (or a later policy is missing)'
  }
  if (row.weak_permissive > 0) {
    return `has a permissive policy that does not cover all commands with ${ORGANIZATION_SETTING} in USING and WITH CHECK`
  }
  return undefined
}

/**
 * Throw unless every table in the service schemas is fail-closed on `organization_id`.
 *
 * @param db - A database handle; see {@link findTenantIsolationGaps}.
 * @param allowlist - `schema.table` names exempt from the check.
 * @throws An error naming each offending table and why.
 */
export async function assertTenantIsolation(
  db: Pick<Database, 'execute'>,
  allowlist: readonly string[] = NON_TENANT_TABLES
): Promise<void> {
  const gaps = await findTenantIsolationGaps(db, allowlist)
  if (gaps.length > 0) {
    const lines = gaps.map((gap) => `  ${gap.schema}.${gap.table} ${gap.reason}`)
    throw new Error(
      `tenant isolation: ${gaps.length} table(s) are not fail-closed\n${lines.join('\n')}`
    )
  }
}
