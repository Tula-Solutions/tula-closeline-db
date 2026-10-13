import { sql } from 'drizzle-orm'
import type { Database } from './client'
import { ORGANIZATION_SETTING, TENANT_POLICY_EXPRESSION } from './tenant'

/**
 * The Postgres schemas owned by services; every relation in them must be tenant-isolated. A
 * relation in any other schema (bar `public` and drizzle's own) is itself a gap, and a unit test
 * keeps this list equal to the schemas exported from `src/schema`.
 */
export const TENANT_SCHEMAS = ['auth', 'core', 'playbook'] as const

/**
 * Tables that deliberately have no `organization_id` and no row-level security, as
 * `schema.table`. Empty today: add an entry only with a decision record that says why the table
 * holds no tenant data.
 */
export const NON_TENANT_TABLES: readonly string[] = []

/**
 * One thing that does not fail closed on `organization_id`, and why. A login role that bypasses
 * row-level security is reported with `schema` set to `pg_roles` and `table` set to the role name.
 */
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

interface RoleRow extends Record<string, unknown> {
  role: string
}

/**
 * Find everything that stops the database failing closed on `organization_id`.
 *
 * Every relation in every schema except `public`, drizzle's own and Postgres's is checked. A
 * table passes when it is in a {@link TENANT_SCHEMAS} schema, has an `organization_id` column,
 * row-level security enabled and forced, and at least one permissive policy, where every
 * permissive policy covers all commands and has exactly the USING and WITH CHECK expression
 * `tenantRlsStatements` writes (any weaker or wider one could open the table across
 * Organizations, so there is no other way to pass than the allowlist). Any other relation (a view,
 * a materialized view, a foreign table) is a gap, because it bypasses row-level security. Tables
 * on `allowlist` are skipped. A `closeline_*` role that is a superuser or has `BYPASSRLS` is a
 * gap too, because it ignores every policy.
 *
 * @param db - A database handle connected as any role; the catalogs are readable by all.
 * @param allowlist - `schema.table` names exempt from the check; defaults to {@link NON_TENANT_TABLES}.
 * @returns The offending relations, ordered by schema and name, then the offending roles; empty
 *   when all are protected.
 */
export async function findTenantIsolationGaps(
  db: Pick<Database, 'execute'>,
  allowlist: readonly string[] = NON_TENANT_TABLES
): Promise<TenantIsolationGap[]> {
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
                        and p.qual = ${TENANT_POLICY_EXPRESSION}
                        and p.with_check = ${TENANT_POLICY_EXPRESSION})
           ) as weak_permissive
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname not in ('public', 'drizzle', 'information_schema')
       and n.nspname not like 'pg\\_%'
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

  const roles = await db.execute<RoleRow>(sql`
    select rolname as role from pg_roles
     where rolname like 'closeline\\_%' and (rolsuper or rolbypassrls)
     order by rolname`)
  for (const { role } of roles.rows) {
    gaps.push({
      schema: 'pg_roles',
      table: role,
      reason: 'is a superuser or has BYPASSRLS, so it ignores every row-level security policy',
    })
  }
  return gaps
}

function gapReason(row: CatalogRow): string | undefined {
  if (!(TENANT_SCHEMAS as readonly string[]).includes(row.schema)) {
    return 'is in a schema that is not a service schema (add it to TENANT_SCHEMAS and src/schema)'
  }
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
    return `has a permissive policy that is not the canonical ${ORGANIZATION_SETTING} isolation (all commands, USING and WITH CHECK as tenantRlsStatements writes them)`
  }
  return undefined
}

/**
 * Throw unless {@link findTenantIsolationGaps} finds nothing: every table fail-closed, no role bypassing it.
 *
 * @param db - A database handle; see {@link findTenantIsolationGaps}.
 * @param allowlist - `schema.table` names exempt from the check.
 * @throws An error naming each offending table or role and why.
 */
export async function assertTenantIsolation(
  db: Pick<Database, 'execute'>,
  allowlist: readonly string[] = NON_TENANT_TABLES
): Promise<void> {
  const gaps = await findTenantIsolationGaps(db, allowlist)
  if (gaps.length > 0) {
    const lines = gaps.map((gap) => `  ${gap.schema}.${gap.table} ${gap.reason}`)
    throw new Error(
      `tenant isolation: ${gaps.length} gap(s) in fail-closed isolation\n${lines.join('\n')}`
    )
  }
}
