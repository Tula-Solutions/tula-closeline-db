import { sql } from 'drizzle-orm'
import type { Database } from './client'
import { ORGANIZATION_SETTING, TENANT_POLICY_EXPRESSION } from './tenant'

/**
 * The Postgres schemas owned by services; every relation in them must be tenant-isolated. A
 * relation in any other schema (bar `public` and drizzle's own) is itself a gap, and a unit test
 * keeps this list equal to the schemas exported from `src/schema`.
 */
export const TENANT_SCHEMAS = ['auth', 'core', 'playbook'] as const

const ENVIRONMENT_SCOPED =
  'tula-auth tenant data: users are global within a Region (ADR 0005), so it has no organization_id; forced row-level security on environment_id scopes it to one auth environment instead'

/**
 * Tables that deliberately have no `organization_id` and are not under the Organization policy,
 * as `schema.table`, each with the one-line reason. Every entry needs a decision record: today
 * these are all `auth` tables, which come from tula-auth (ADR 0005). Auth users are global within
 * a Region and Organization membership lives in core, so no auth table is per-Organization data.
 * Most are scoped to an auth environment by their own forced row-level security
 * (`src/schema/auth`); the rest are control plane, below.
 */
export const NON_TENANT_TABLE_REASONS: Readonly<Record<string, string>> = {
  'auth.api_keys':
    'control plane: resolving a key is what determines the auth environment, so it cannot be under environment row-level security; stored as SHA-256 hashes only',
  'auth.audit_logs': ENVIRONMENT_SCOPED,
  'auth.backup_codes': ENVIRONMENT_SCOPED,
  'auth.credentials': ENVIRONMENT_SCOPED,
  'auth.environment_settings': ENVIRONMENT_SCOPED,
  'auth.environments':
    "control plane: the auth environment is itself the tenant boundary tula-auth scopes by, one per kind in the Region's fixed project",
  'auth.events': ENVIRONMENT_SCOPED,
  'auth.flow_attempts': ENVIRONMENT_SCOPED,
  'auth.hook_call_counts': ENVIRONMENT_SCOPED,
  'auth.hooks': ENVIRONMENT_SCOPED,
  'auth.identities': ENVIRONMENT_SCOPED,
  'auth.instance_audit_logs':
    'control plane: operator actions outside any one environment, append-only, no tenant columns',
  'auth.native_apps': ENVIRONMENT_SCOPED,
  'auth.oauth_providers': ENVIRONMENT_SCOPED,
  'auth.passkey_challenges': ENVIRONMENT_SCOPED,
  'auth.passkeys': ENVIRONMENT_SCOPED,
  'auth.password_history': ENVIRONMENT_SCOPED,
  'auth.projects':
    'control plane: the app the Region secures (one fixed project per Region, ADR 0005), above the environments, not tenant data',
  'auth.proposals': ENVIRONMENT_SCOPED,
  'auth.refresh_tokens': ENVIRONMENT_SCOPED,
  'auth.sessions': ENVIRONMENT_SCOPED,
  'auth.signing_keys': ENVIRONMENT_SCOPED,
  'auth.sms_code_counts': ENVIRONMENT_SCOPED,
  'auth.user_factors': ENVIRONMENT_SCOPED,
  'auth.users': ENVIRONMENT_SCOPED,
  'auth.verification_tokens': ENVIRONMENT_SCOPED,
  'auth.webhook_deliveries': ENVIRONMENT_SCOPED,
  'auth.webhook_delivery_attempts': ENVIRONMENT_SCOPED,
  'auth.webhook_endpoints': ENVIRONMENT_SCOPED,
  'auth.workspaces':
    "control plane: top of tula-auth's account model, one workspace per Region, not tenant data",
}

/** The `schema.table` names exempt from the Organization check: the keys of {@link NON_TENANT_TABLE_REASONS}. */
export const NON_TENANT_TABLES: readonly string[] = Object.keys(NON_TENANT_TABLE_REASONS)

/**
 * Schemas that an installed Postgres extension owns, whose relations are skipped by the check.
 * Empty today: an entry needs a decision record in the hub saying which extension owns the schema.
 */
export const EXTENSION_SCHEMAS: readonly string[] = []

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
 * Every relation in every schema except drizzle's own, Postgres's and any {@link EXTENSION_SCHEMAS} is
 * checked, `public` included: nothing belongs there, so any table, view or foreign table in it is a gap. A
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
 * @param extensionSchemas - Schemas owned by extensions, skipped; defaults to {@link EXTENSION_SCHEMAS}.
 * @returns The offending relations, ordered by schema and name, then the offending roles; empty
 *   when all are protected.
 */
export async function findTenantIsolationGaps(
  db: Pick<Database, 'execute'>,
  allowlist: readonly string[] = NON_TENANT_TABLES,
  extensionSchemas: readonly string[] = EXTENSION_SCHEMAS
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
     where n.nspname not in ('drizzle', 'information_schema')
       and n.nspname not like 'pg\\_%'
       and c.relkind in ('r', 'p', 'v', 'm', 'f')
     order by n.nspname, c.relname`)

  const gaps: TenantIsolationGap[] = []
  for (const row of result.rows) {
    if (extensionSchemas.includes(row.schema)) {
      continue
    }
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
  if (row.schema === 'public') {
    return 'is in public, where nothing belongs (migration 0000 locks the schema down)'
  }
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
