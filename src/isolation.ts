import { sql } from 'drizzle-orm'
import type { Database } from './client'
import { ENVIRONMENT_POLICY_EXPRESSION, ENVIRONMENT_SETTING } from './environment'
import { OWNER_ROLE } from './roles'
import { ORGANIZATION_SETTING, TENANT_POLICY_EXPRESSION } from './tenant'

/**
 * The Postgres schemas owned by services; every relation in them must be tenant-isolated. A
 * relation in any other schema (bar `public` and drizzle's own) is itself a gap, and a unit test
 * keeps this list equal to the schemas exported from `src/schema`.
 */
export const TENANT_SCHEMAS = ['auth', 'core', 'playbook', 'voice'] as const

/**
 * The only roles a `closeline_*` service role may be a member of: Postgres's read-only monitoring
 * roles. The service roles are NOINHERIT, so no other membership (a predefined role such as
 * `pg_write_all_data` included) is visible to the table checks; {@link findTenantIsolationGaps}
 * reports every other one.
 */
export const ALLOWED_PREDEFINED_ROLES: readonly string[] = [
  'pg_monitor',
  'pg_read_all_settings',
  'pg_read_all_stats',
  'pg_stat_scan_tables',
]

/**
 * The `auth` tables scoped to an auth environment, as `schema.table`. Each has no `organization_id`
 * (users are global within a Region, ADR 0005) and is instead bound by its own forced row-level
 * security: exactly one permissive policy, for all commands, with {@link ENVIRONMENT_POLICY_EXPRESSION}
 * as both its USING and WITH CHECK. A restrictive policy may be added to it, never a second
 * permissive one. {@link findTenantIsolationGaps} verifies every one against the live catalog.
 */
export const ENVIRONMENT_SCOPED_TABLES: readonly string[] = [
  'auth.abandon_cases',
  'auth.audit_logs',
  'auth.backup_codes',
  'auth.credentials',
  'auth.environment_settings',
  'auth.events',
  'auth.flow_attempts',
  'auth.hook_call_counts',
  'auth.hooks',
  'auth.identities',
  'auth.native_apps',
  'auth.oauth_providers',
  'auth.passkey_challenges',
  'auth.passkeys',
  'auth.password_history',
  'auth.proposals',
  'auth.refresh_tokens',
  'auth.sessions',
  'auth.signing_keys',
  'auth.sms_code_counts',
  'auth.user_factors',
  'auth.users',
  'auth.verification_tokens',
  'auth.webhook_deliveries',
  'auth.webhook_delivery_attempts',
  'auth.webhook_endpoints',
]

/**
 * The `auth` control-plane tables, as `schema.table`, each with the one-line reason it is not
 * under environment row-level security. They sit above or beside the environments, so the
 * environment cannot scope them; they still must not carry an `organization_id`
 * ({@link findTenantIsolationGaps} checks that). Their reach is held down by the service role's
 * grants (the `auth` integration suite pins them), not by a policy.
 */
export const CONTROL_PLANE_TABLE_REASONS: Readonly<Record<string, string>> = {
  'auth.api_keys':
    'control plane: resolving a key is what determines the auth environment, so it cannot be under environment row-level security; stored as SHA-256 hashes only',
  'auth.attempt_counters':
    'control plane: sign-in lockout and rate-limit counters, counted before any account, user or Organization is known; keyed by a keyed hash of the address (the key never reaches the database), so it holds no address and no IP address, and no environment-scoped read is needed to count; the service role reads, inserts, deletes and updates only the four counter columns, nothing else (hub issue 30, ADR 0014)',
  'auth.environments':
    "control plane: the auth environment is itself the tenant boundary tula-auth scopes by, one per kind in the Region's fixed project",
  'auth.instance_audit_logs':
    'control plane: operator actions outside any one environment, with no tenant columns; the service role may append and delete (for the retention job) but not update, and no retention floor bounds the delete',
  'auth.projects':
    'control plane: the app the Region secures (one fixed project per Region, ADR 0005), above the environments, not tenant data',
  'auth.workspaces':
    "control plane: top of tula-auth's account model, one workspace per Region, not tenant data",
}

/** The `schema.table` names of {@link CONTROL_PLANE_TABLE_REASONS}. */
export const CONTROL_PLANE_TABLES: readonly string[] = Object.keys(CONTROL_PLANE_TABLE_REASONS)

/**
 * Tables exempt from the Organization check by explicit entry, as `schema.table`, each with the
 * one-line reason. The `auth` tables, which have no `organization_id`, are verified under
 * {@link ENVIRONMENT_SCOPED_TABLES} and {@link CONTROL_PLANE_TABLES} instead of being skipped. The
 * only entries are the three `core` directories, the Organization status table, the voice line
 * directory and the playbook work registry, which are asked before an Organization is known. An entry here needs a decision record in the hub. An exempt
 * table is under no row-level security, so {@link findTenantIsolationGaps} also reports it as a
 * gap when any `closeline_*` service role (or PUBLIC) holds any privilege on it (SELECT, INSERT,
 * UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER or MAINTAIN), at table or column level: a read leaks every
 * Organization, and a write could forge a user-to-Organization mapping or free a user. It may be
 * reached only through a `SECURITY DEFINER` function.
 */
export const NON_TENANT_TABLE_REASONS: Readonly<Record<string, string>> = {
  'core.consent_form_directory':
    'asked before the Organization is known (the public hosted consent form receives only a token); holds token, Organization id, form id, wording id and state for published and closed forms only, is written only by a SECURITY DEFINER trigger on core.consent_form, and no service role holds any privilege on it: core.consent_form_for_token is the only way in',
  'core.demo_rate_counter':
    'a per-address request counter for the public demo-request route, held by Closeline itself and not by any Organization, so it has no organization_id; it holds only an HMAC of an address, a window and a count, is written and read only by SECURITY DEFINER functions and the owner, and no service role holds any privilege on it, so no tenant scope can read it',
  'core.demo_request':
    "a Visitor's Demo Request, held by Closeline itself and not by any Organization, so it has no organization_id; it is written and read only by SECURITY DEFINER functions and the owner, and no service role holds any privilege on it, so no tenant scope can read a Visitor's name, email or message",
  'core.invitation_directory':
    'asked before the Organization is known (accepting an invitation looks up a token hash); holds token hash, Organization id, invitation id and expiry for pending invitations only, is written only by SECURITY DEFINER triggers, and no service role holds any privilege on it: core.invitation_for_token is the only way in',
  'core.membership_directory':
    'asked before the Organization is known (sign-in asks which Organization a user belongs to); holds user id and Organization id, is written only by SECURITY DEFINER triggers, and no service role holds any privilege on it: core.organization_of_user is the only way in',
  'core.organization_state':
    "an Organization's status, one row per Organization, joined by both core lookups before the Organization is known; written only by a SECURITY DEFINER trigger on core.organizations in the same transaction as the status change, so a change writes one row however large the Organization is, and no service role holds any privilege on it: the two lookups are the only way in",
  'voice.line_directory':
    'asked before the Organization is known (the inbound webhook receives only the dialled number); holds number, Organization id, Line id and state for Lines that are not released only, is written only by a SECURITY DEFINER trigger on voice.lines, and no service role holds any privilege on it: voice.line_for_number is the only way in',
  'playbook.work_hints':
    'asked before the Organization is known (a sweep asks which Organizations have purge, job or message work due, and row-level security hides every tenant table from it); holds a kind, an Organization id and a due time, is written only by SECURITY DEFINER triggers and the discovery function, and no service role holds any privilege on it: playbook.organizations_with_work is the only way in',
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
  weak_environment_permissive: number
  reachable_by: string[]
}

interface RoleRow extends Record<string, unknown> {
  role: string
}

interface MembershipRow extends Record<string, unknown> {
  role: string
  granted: string
}

/**
 * The two named groups of `auth` tables, which {@link findTenantIsolationGaps} verifies instead of
 * skipping. Defaults to {@link ENVIRONMENT_SCOPED_TABLES} and {@link CONTROL_PLANE_TABLES}.
 */
export interface AuthTableCategories {
  /** `schema.table` names that must be fail-closed on `environment_id`. */
  environmentScoped: readonly string[]
  /** `schema.table` names that must have no `organization_id`. */
  controlPlane: readonly string[]
}

/**
 * Find everything that stops the database failing closed.
 *
 * Every relation in every schema except drizzle's own, Postgres's and any {@link EXTENSION_SCHEMAS} is
 * checked, `public` included: nothing belongs there, so any table, view or foreign table in it is a gap. Any
 * relation that is not a table (a view, a materialized view, a foreign table) is a gap, because it
 * bypasses row-level security. A table in a {@link TENANT_SCHEMAS} schema then passes one of three ways:
 *
 * - It is in {@link ENVIRONMENT_SCOPED_TABLES}: no `organization_id`, row-level security enabled
 *   and forced, and exactly one permissive policy, for all commands, whose USING and WITH CHECK
 *   are both {@link ENVIRONMENT_POLICY_EXPRESSION}. Restrictive policies may be added.
 * - It is in {@link CONTROL_PLANE_TABLES}: no `organization_id`.
 * - Otherwise, a table in `auth` is a gap (it is in neither category), and any other table must
 *   have an `organization_id` column, row-level security enabled and forced, and at least one
 *   permissive policy, where every permissive policy covers all commands and has exactly the
 *   USING and WITH CHECK expression `tenantRlsStatements` writes (any weaker or wider one could
 *   open the table across Organizations).
 *
 * Tables on `allowlist` are skipped, except that one on which any `closeline_*` role other than
 * the owner holds a `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` or
 * `MAINTAIN` privilege (the check counts column grants and grants to PUBLIC) is a gap: with no row-level
 * security a read would show every Organization's rows, and a write could forge or erase the
 * mapping the lookups rest on. A `closeline_*` role
 * that is a superuser or has `BYPASSRLS` is a gap too, because it ignores every policy.
 *
 * @param db - A database handle connected as any role; the catalogs are readable by all.
 * @param allowlist - `schema.table` names exempt from the check; defaults to {@link NON_TENANT_TABLES}.
 * @param extensionSchemas - Schemas owned by extensions, skipped; defaults to {@link EXTENSION_SCHEMAS}.
 * @param categories - The `auth` table categories; defaults to the exported lists.
 * @returns The offending relations, ordered by schema and name, then the offending roles; empty
 *   when all are protected.
 */
export async function findTenantIsolationGaps(
  db: Pick<Database, 'execute'>,
  allowlist: readonly string[] = NON_TENANT_TABLES,
  extensionSchemas: readonly string[] = EXTENSION_SCHEMAS,
  categories: AuthTableCategories = {
    environmentScoped: ENVIRONMENT_SCOPED_TABLES,
    controlPlane: CONTROL_PLANE_TABLES,
  }
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
           ) as weak_permissive,
           (select count(*)::int from pg_policies p
             where p.schemaname = n.nspname and p.tablename = c.relname
               and p.permissive = 'PERMISSIVE'
               and not (p.cmd = 'ALL'
                        and p.qual = ${ENVIRONMENT_POLICY_EXPRESSION}
                        and p.with_check = ${ENVIRONMENT_POLICY_EXPRESSION})
           ) as weak_environment_permissive,
           (select coalesce(array_agg(r.rolname::text order by r.rolname), '{}'::text[])
              from pg_roles r
             where r.rolname like 'closeline\\_%' and r.rolname <> ${OWNER_ROLE}
               and (has_table_privilege(r.oid, c.oid,
                      'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN')
                    or has_any_column_privilege(r.oid, c.oid, 'SELECT, INSERT, UPDATE, REFERENCES'))
           ) as reachable_by
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
      if (row.reachable_by.length > 0) {
        gaps.push({
          schema: row.schema,
          table: row.table,
          reason: `is exempt from row-level security but ${row.reachable_by.join(', ')} hold a privilege on it (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER or MAINTAIN; on the table, a column or as PUBLIC); only a SECURITY DEFINER function may reach it`,
        })
      }
      continue
    }
    const reason = gapReason(row, categories)
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

  // The service roles are NOINHERIT, so a privilege reached through a role they belong to is
  // invisible to the privilege check above (it applies after SET ROLE). Any membership of a role
  // outside ALLOWED_PREDEFINED_ROLES is therefore a gap. The owner role is excluded by
  // the same constant the table query uses, so a grant made to it is not reported.
  const memberships = await db.execute<MembershipRow>(sql`
    select m.rolname as role, g.rolname as granted
      from pg_auth_members am
      join pg_roles m on m.oid = am.member
      join pg_roles g on g.oid = am.roleid
     where m.rolname like 'closeline\\_%' and m.rolname <> ${OWNER_ROLE}
       and g.rolname not in (${sql.join(
         ALLOWED_PREDEFINED_ROLES.map((role) => sql`${role}`),
         sql`, `
       )})
     order by m.rolname, g.rolname`)
  for (const { role, granted } of memberships.rows) {
    gaps.push({
      schema: 'pg_roles',
      table: role,
      reason: `is a member of ${granted}, whose privileges the table checks do not see (the service roles are NOINHERIT); a service role belongs to no other role outside ${ALLOWED_PREDEFINED_ROLES.join(', ')}`,
    })
  }
  return gaps
}

function gapReason(row: CatalogRow, categories: AuthTableCategories): string | undefined {
  if (row.schema === 'public') {
    return 'is in public, where nothing belongs (migration 0000 locks the schema down)'
  }
  if (!(TENANT_SCHEMAS as readonly string[]).includes(row.schema)) {
    return 'is in a schema that is not a service schema (add it to TENANT_SCHEMAS and src/schema)'
  }
  if (row.kind !== 'r' && row.kind !== 'p') {
    return 'is not a table, so it bypasses row-level security'
  }
  const name = `${row.schema}.${row.table}`
  if (categories.environmentScoped.includes(name)) {
    return environmentScopedReason(row)
  }
  if (categories.controlPlane.includes(name)) {
    return row.has_org
      ? 'is a control-plane table with an organization_id column: auth users are global within a Region (ADR 0005)'
      : undefined
  }
  if (row.schema === 'auth') {
    return 'is in auth but in neither ENVIRONMENT_SCOPED_TABLES nor CONTROL_PLANE_TABLES (add it to one, in src/isolation.ts)'
  }
  return organizationReason(row)
}

function environmentScopedReason(row: CatalogRow): string | undefined {
  if (row.has_org) {
    return 'is environment-scoped but has an organization_id column: auth users are global within a Region (ADR 0005)'
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
  if (row.weak_environment_permissive > 0) {
    return `has a permissive policy that is not the canonical ${ENVIRONMENT_SETTING} isolation (all commands, USING and WITH CHECK as ENVIRONMENT_POLICY_EXPRESSION)`
  }
  if (row.permissive > 1) {
    return 'must have exactly one permissive policy; a second one is evaluated with OR and could open the table (add restrictive policies instead)'
  }
  return undefined
}

function organizationReason(row: CatalogRow): string | undefined {
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
