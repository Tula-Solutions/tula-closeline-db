import {
  TENANT_SETTING,
  exports_schema
} from "./shared/chunk-83j665wv.js";

// src/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
var DEFAULT_POOL_OPTIONS = {
  max: 10,
  statementTimeoutMs: 30000,
  connectionTimeoutMs: 5000,
  closeTimeoutMs: 1e4
};
var MAX_POOL = 100;
var IDLE_IN_TRANSACTION_TIMEOUT_MS = 60000;
var IDLE_CONNECTION_TIMEOUT_MS = 30000;
function positiveInteger(name, value, upTo = Number.MAX_SAFE_INTEGER) {
  if (!Number.isInteger(value) || value < 1 || value > upTo) {
    throw new Error(`createDb: ${name} must be an integer from 1 to ${upTo}`);
  }
  return value;
}
function reportConnectionError(error) {
  const code = error.code;
  const label = typeof code === "string" && code !== "" ? code : error.name;
  process.stderr.write(`closeline-db: database connection error (${label})
`);
}
function createDb(connectionString, options = {}) {
  if (connectionString.trim() === "") {
    throw new Error("createDb: connectionString must not be empty");
  }
  const max = positiveInteger("max", options.max ?? DEFAULT_POOL_OPTIONS.max, MAX_POOL);
  const statementTimeout = positiveInteger("statementTimeoutMs", options.statementTimeoutMs ?? DEFAULT_POOL_OPTIONS.statementTimeoutMs);
  const connectionTimeoutMillis = positiveInteger("connectionTimeoutMs", options.connectionTimeoutMs ?? DEFAULT_POOL_OPTIONS.connectionTimeoutMs);
  const closeTimeoutMs = positiveInteger("closeTimeoutMs", options.closeTimeoutMs ?? DEFAULT_POOL_OPTIONS.closeTimeoutMs);
  const handler = options.onError ?? reportConnectionError;
  const onError = (error) => {
    try {
      handler(error);
    } catch {
      reportConnectionError(error);
    }
  };
  const pool = new Pool({
    connectionString,
    max,
    connectionTimeoutMillis,
    idleTimeoutMillis: IDLE_CONNECTION_TIMEOUT_MS,
    statement_timeout: statementTimeout,
    idle_in_transaction_session_timeout: IDLE_IN_TRANSACTION_TIMEOUT_MS
  });
  const clients = new Set;
  pool.on("connect", (client) => {
    client.on("error", onError);
    clients.add(client);
  });
  pool.on("remove", (client) => {
    clients.delete(client);
  });
  pool.on("error", () => {
    return;
  });
  let closing;
  const close = () => {
    closing ??= closePool(pool, clients, closeTimeoutMs);
    return closing;
  };
  return { db: drizzle(pool, { schema: exports_schema }), close };
}
async function closePool(pool, clients, timeoutMs) {
  let timer;
  const deadline = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      for (const client of clients) {
        client.end().catch(() => {
          return;
        });
      }
      reject(new Error("createDb: close timed out"));
    }, timeoutMs);
  });
  try {
    await Promise.race([pool.end(), deadline]);
  } finally {
    clearTimeout(timer);
  }
}
// src/core-lookups.ts
import { sql } from "drizzle-orm";
var USER_ID = /^usr_[0-9a-f]{32}$/;
var TOKEN_HASH = /^[0-9a-f]{64}$/;
async function organizationOfUser(db, userId) {
  if (!USER_ID.test(userId)) {
    throw new Error("organizationOfUser: invalid user id");
  }
  const { rows } = await db.execute(sql`select organization_id, status from core.organization_of_user(${userId})`);
  if (rows.length > 1) {
    throw new Error("organizationOfUser: more than one Organization for a user");
  }
  const row = rows[0];
  return row ? { organizationId: row.organization_id, status: row.status } : null;
}
async function invitationForToken(db, tokenHash) {
  if (!TOKEN_HASH.test(tokenHash)) {
    throw new Error("invitationForToken: invalid token hash");
  }
  const { rows } = await db.execute(sql`select organization_id, invitation_id from core.invitation_for_token(${tokenHash})`);
  const row = rows[0];
  return row ? { organizationId: row.organization_id, invitationId: row.invitation_id } : null;
}
// src/environment.ts
import { sql as sql2 } from "drizzle-orm";
var ENVIRONMENT_SETTING = TENANT_SETTING;
var ENVIRONMENT_POLICY_EXPRESSION = `(environment_id = (NULLIF(current_setting('${ENVIRONMENT_SETTING}'::text, true), ''::text))::uuid)`;
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function withEnvironment(db, environmentId, fn) {
  if (!UUID.test(environmentId)) {
    throw new Error("withEnvironment: environmentId must be a UUID");
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql2`select set_config(${ENVIRONMENT_SETTING}, ${environmentId}, true)`);
    return fn(tx);
  });
}
// src/isolation.ts
import { sql as sql4 } from "drizzle-orm";

// src/roles.ts
var OWNER_ROLE = "closeline_owner";

// src/tenant.ts
import { sql as sql3 } from "drizzle-orm";
var ORGANIZATION_SETTING = "app.organization_id";
var ORGANIZATION_ID = /^org_[0-9a-f]{32}$/;
var IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;
async function withOrganization(db, organizationId, fn) {
  if (!ORGANIZATION_ID.test(organizationId)) {
    throw new Error("withOrganization: invalid organization id");
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql3`select set_config(${ORGANIZATION_SETTING}, ${organizationId}, true)`);
    return fn(tx);
  });
}
var TENANT_POLICY_EXPRESSION = `(organization_id = NULLIF(current_setting('${ORGANIZATION_SETTING}'::text, true), ''::text))`;
function quote(identifier) {
  if (!IDENTIFIER.test(identifier)) {
    throw new Error(`tenantRlsStatements: unsafe identifier ${JSON.stringify(identifier)}`);
  }
  return `"${identifier}"`;
}
function tenantRlsStatements(schemaName, tableName) {
  const table = `${quote(schemaName)}.${quote(tableName)}`;
  const policy = quote(`${tableName}_tenant_isolation`);
  const current = `NULLIF(current_setting('${ORGANIZATION_SETTING}', true), '')`;
  return [
    `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`,
    `CREATE POLICY ${policy} ON ${table} AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = ${current}) WITH CHECK ("organization_id" = ${current});`
  ];
}

// src/isolation.ts
var TENANT_SCHEMAS = ["auth", "core", "playbook"];
var ALLOWED_PREDEFINED_ROLES = [
  "pg_monitor",
  "pg_read_all_settings",
  "pg_read_all_stats",
  "pg_stat_scan_tables"
];
var ENVIRONMENT_SCOPED_TABLES = [
  "auth.audit_logs",
  "auth.backup_codes",
  "auth.credentials",
  "auth.environment_settings",
  "auth.events",
  "auth.flow_attempts",
  "auth.hook_call_counts",
  "auth.hooks",
  "auth.identities",
  "auth.native_apps",
  "auth.oauth_providers",
  "auth.passkey_challenges",
  "auth.passkeys",
  "auth.password_history",
  "auth.proposals",
  "auth.refresh_tokens",
  "auth.sessions",
  "auth.signing_keys",
  "auth.sms_code_counts",
  "auth.user_factors",
  "auth.users",
  "auth.verification_tokens",
  "auth.webhook_deliveries",
  "auth.webhook_delivery_attempts",
  "auth.webhook_endpoints"
];
var CONTROL_PLANE_TABLE_REASONS = {
  "auth.api_keys": "control plane: resolving a key is what determines the auth environment, so it cannot be under environment row-level security; stored as SHA-256 hashes only",
  "auth.environments": "control plane: the auth environment is itself the tenant boundary tula-auth scopes by, one per kind in the Region's fixed project",
  "auth.instance_audit_logs": "control plane: operator actions outside any one environment, with no tenant columns; the service role may append and delete (for the retention job) but not update, and no retention floor bounds the delete",
  "auth.projects": "control plane: the app the Region secures (one fixed project per Region, ADR 0005), above the environments, not tenant data",
  "auth.workspaces": "control plane: top of tula-auth's account model, one workspace per Region, not tenant data"
};
var CONTROL_PLANE_TABLES = Object.keys(CONTROL_PLANE_TABLE_REASONS);
var NON_TENANT_TABLE_REASONS = {
  "core.invitation_directory": "asked before the Organization is known (accepting an invitation looks up a token hash); holds token hash, Organization id, invitation id and expiry for pending invitations only, is written only by SECURITY DEFINER triggers, and no service role holds any privilege on it: core.invitation_for_token is the only way in",
  "core.membership_directory": "asked before the Organization is known (sign-in asks which Organization a user belongs to); holds user id and Organization id, is written only by SECURITY DEFINER triggers, and no service role holds any privilege on it: core.organization_of_user is the only way in",
  "core.organization_state": "an Organization's status, one row per Organization, joined by both core lookups before the Organization is known; written only by a SECURITY DEFINER trigger on core.organizations in the same transaction as the status change, so a change writes one row however large the Organization is, and no service role holds any privilege on it: the two lookups are the only way in"
};
var NON_TENANT_TABLES = Object.keys(NON_TENANT_TABLE_REASONS);
var EXTENSION_SCHEMAS = [];
async function findTenantIsolationGaps(db, allowlist = NON_TENANT_TABLES, extensionSchemas = EXTENSION_SCHEMAS, categories = {
  environmentScoped: ENVIRONMENT_SCOPED_TABLES,
  controlPlane: CONTROL_PLANE_TABLES
}) {
  const result = await db.execute(sql4`
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
     order by n.nspname, c.relname`);
  const gaps = [];
  for (const row of result.rows) {
    if (extensionSchemas.includes(row.schema)) {
      continue;
    }
    if (allowlist.includes(`${row.schema}.${row.table}`)) {
      if (row.reachable_by.length > 0) {
        gaps.push({
          schema: row.schema,
          table: row.table,
          reason: `is exempt from row-level security but ${row.reachable_by.join(", ")} hold a privilege on it (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER or MAINTAIN; on the table, a column or as PUBLIC); only a SECURITY DEFINER function may reach it`
        });
      }
      continue;
    }
    const reason = gapReason(row, categories);
    if (reason) {
      gaps.push({ schema: row.schema, table: row.table, reason });
    }
  }
  const roles = await db.execute(sql4`
    select rolname as role from pg_roles
     where rolname like 'closeline\\_%' and (rolsuper or rolbypassrls)
     order by rolname`);
  for (const { role } of roles.rows) {
    gaps.push({
      schema: "pg_roles",
      table: role,
      reason: "is a superuser or has BYPASSRLS, so it ignores every row-level security policy"
    });
  }
  const memberships = await db.execute(sql4`
    select m.rolname as role, g.rolname as granted
      from pg_auth_members am
      join pg_roles m on m.oid = am.member
      join pg_roles g on g.oid = am.roleid
     where m.rolname like 'closeline\\_%' and m.rolname <> ${OWNER_ROLE}
       and g.rolname not in (${sql4.join(ALLOWED_PREDEFINED_ROLES.map((role) => sql4`${role}`), sql4`, `)})
     order by m.rolname, g.rolname`);
  for (const { role, granted } of memberships.rows) {
    gaps.push({
      schema: "pg_roles",
      table: role,
      reason: `is a member of ${granted}, whose privileges the table checks do not see (the service roles are NOINHERIT); a service role belongs to no other role outside ${ALLOWED_PREDEFINED_ROLES.join(", ")}`
    });
  }
  return gaps;
}
function gapReason(row, categories) {
  if (row.schema === "public") {
    return "is in public, where nothing belongs (migration 0000 locks the schema down)";
  }
  if (!TENANT_SCHEMAS.includes(row.schema)) {
    return "is in a schema that is not a service schema (add it to TENANT_SCHEMAS and src/schema)";
  }
  if (row.kind !== "r" && row.kind !== "p") {
    return "is not a table, so it bypasses row-level security";
  }
  const name = `${row.schema}.${row.table}`;
  if (categories.environmentScoped.includes(name)) {
    return environmentScopedReason(row);
  }
  if (categories.controlPlane.includes(name)) {
    return row.has_org ? "is a control-plane table with an organization_id column: auth users are global within a Region (ADR 0005)" : undefined;
  }
  if (row.schema === "auth") {
    return "is in auth but in neither ENVIRONMENT_SCOPED_TABLES nor CONTROL_PLANE_TABLES (add it to one, in src/isolation.ts)";
  }
  return organizationReason(row);
}
function environmentScopedReason(row) {
  if (row.has_org) {
    return "is environment-scoped but has an organization_id column: auth users are global within a Region (ADR 0005)";
  }
  if (!row.enabled) {
    return "does not have row-level security enabled";
  }
  if (!row.forced) {
    return "does not have row-level security forced (the owner would bypass it)";
  }
  if (row.permissive === 0) {
    return "has no permissive policy, so no role can ever read it (or a later policy is missing)";
  }
  if (row.weak_environment_permissive > 0) {
    return `has a permissive policy that is not the canonical ${ENVIRONMENT_SETTING} isolation (all commands, USING and WITH CHECK as ENVIRONMENT_POLICY_EXPRESSION)`;
  }
  if (row.permissive > 1) {
    return "must have exactly one permissive policy; a second one is evaluated with OR and could open the table (add restrictive policies instead)";
  }
  return;
}
function organizationReason(row) {
  if (!row.has_org) {
    return "has no organization_id column and is not on the non-tenant allowlist";
  }
  if (!row.enabled) {
    return "does not have row-level security enabled";
  }
  if (!row.forced) {
    return "does not have row-level security forced (the owner would bypass it)";
  }
  if (row.permissive === 0) {
    return "has no permissive policy, so no role can ever read it (or a later policy is missing)";
  }
  if (row.weak_permissive > 0) {
    return `has a permissive policy that is not the canonical ${ORGANIZATION_SETTING} isolation (all commands, USING and WITH CHECK as tenantRlsStatements writes them)`;
  }
  return;
}
async function assertTenantIsolation(db, allowlist = NON_TENANT_TABLES) {
  const gaps = await findTenantIsolationGaps(db, allowlist);
  if (gaps.length > 0) {
    const lines = gaps.map((gap) => `  ${gap.schema}.${gap.table} ${gap.reason}`);
    throw new Error(`tenant isolation: ${gaps.length} gap(s) in fail-closed isolation
${lines.join(`
`)}`);
  }
}

// src/index.ts
var PACKAGE = "tula-closeline-db";
export {
  CONTROL_PLANE_TABLES,
  CONTROL_PLANE_TABLE_REASONS,
  DEFAULT_POOL_OPTIONS,
  ENVIRONMENT_POLICY_EXPRESSION,
  ENVIRONMENT_SCOPED_TABLES,
  ENVIRONMENT_SETTING,
  NON_TENANT_TABLES,
  NON_TENANT_TABLE_REASONS,
  ORGANIZATION_SETTING,
  OWNER_ROLE,
  PACKAGE,
  TENANT_SCHEMAS,
  assertTenantIsolation,
  createDb,
  findTenantIsolationGaps,
  invitationForToken,
  organizationOfUser,
  reportConnectionError,
  tenantRlsStatements,
  withEnvironment,
  withOrganization
};
