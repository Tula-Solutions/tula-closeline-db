import {
  TENANT_SETTING,
  ABANDON_CASE_MAX_ATTEMPTS2,
  DOCUMENT_PURGE_MAX_ATTEMPTS2,
  INGESTION_STEPS2,
  INGESTION_JOB_MAX_ATTEMPTS2,
  PENDING_CLEANUP_PREDICATE2,
  DEAL_OUTCOMES2,
  DEAL_IMPORT_STATES2,
  DEAL_IMPORT_FAILURE_REASONS2,
  DEAL_IMPORT_ROW_RESULTS2,
  DEAL_IMPORT_ROW_REASONS2,
  DEAL_ID_MAX_LENGTH2,
  DEAL_ID_MAX_BYTES2,
  DEAL_NAME_MAX_LENGTH2,
  DEAL_NAME_MAX_BYTES2,
  DEAL_IMPORT_MAX_ROWS2,
  DEAL_IMPORT_MAX_BYTES2,
  DEAL_MAX_SEQ2,
  RIGHTS_MAX_WORDING_VERSION2,
  DEAL_IMPORT_MAX_ATTEMPTS2,
  DEAL_IMPORT_APPLY_BATCH2,
  CALL_STATES2,
  CALL_FAILURE_REASONS2,
  CALL_KINDS2,
  CALL_MEDIA_TYPES2,
  CALL_CHANNELS2,
  CALL_REP_BY2,
  CALL_MAX_TRANSCRIPT_BYTES2,
  CALL_MAX_RECORDING_BYTES2,
  CALL_MAX_RECORDING_SECONDS2,
  CALL_MAX_SPEAKERS2,
  CALL_SPEAKER_LABEL_MAX_LENGTH2,
  CALL_SPEAKER_LABEL_MAX_BYTES2,
  CALL_MAX_SEQ2,
  CALL_PURGE_MAX_ATTEMPTS2,
  CALL_JOB_MAX_ATTEMPTS2,
  CALL_JOB_KINDS2,
  CALL_JOB_STATES2,
  repChangeAllowed2,
  callReuploadRequeues2,
  CALL_PENDING_CLEANUP_PREDICATE2,
  WORK_KINDS2,
  exports_schema
} from "./shared/chunk-gppqzz5v.js";

// src/auth-statements.ts
var ABANDON_MIN_GRACE_MS = 1e4;
var COUNTER_MIN_PERIOD_MS = 1000;
var LOCKOUT_MIN_RETRY_AFTER_MS = 1000;
var NEXT_FAILURES = "case when c.expires_at <= (select tick from ts) then 1 else c.hits + 1 end";
var WAIT = (index) => `greatest(coalesce(($3::int[])[${index}], 0), 0)::float8`;
var FORGET = `greatest(coalesce($4::int, 0), ${COUNTER_MIN_PERIOD_MS})::float8`;
var SCHEDULE_AT = `least(${NEXT_FAILURES}, cardinality($3::int[]))`;
var LOCKOUT_ATTEMPT = `with ts as (select clock_timestamp() as tick)
insert into auth.attempt_counters as c
  (environment_id, kind, key_hash, hits, started_at, locked_until, expires_at)
values ($1, 'lockout', $2, 1, clock_timestamp(),
        clock_timestamp() + make_interval(secs => ${WAIT("1")} / 1000),
        clock_timestamp() + make_interval(secs => (${WAIT("1")} + ${FORGET}) / 1000))
on conflict (environment_id, kind, key_hash) do update set
  hits = least(${NEXT_FAILURES}, 1000000),
  started_at = case when c.expires_at <= (select tick from ts) then (select tick from ts) else c.started_at end,
  locked_until = (select tick from ts) + make_interval(secs => ${WAIT(SCHEDULE_AT)} / 1000),
  expires_at = (select tick from ts) + make_interval(secs => (${WAIT(SCHEDULE_AT)} + ${FORGET}) / 1000)
where c.locked_until <= (select tick from ts)
returning hits, ${WAIT("least(hits, cardinality($3::int[]))")}::int as wait_ms`;
var LOCKOUT_RETRY_AFTER = `select greatest(0, ceil(extract(epoch from locked_until - clock_timestamp()) * 1000))::int as retry_after_ms
from auth.attempt_counters
where environment_id = $1 and kind = 'lockout' and key_hash = $2`;
var LOCKOUT_CLEAR = `delete from auth.attempt_counters
where environment_id = $1 and kind = 'lockout' and key_hash = $2`;
var WINDOW = `greatest(coalesce($3::float8, 0), ${COUNTER_MIN_PERIOD_MS})`;
var RATE_HIT = `with ts as (select clock_timestamp() as tick)
insert into auth.attempt_counters as c
  (environment_id, kind, key_hash, hits, started_at, expires_at)
values ($1, 'rate_limit', $2, 1, clock_timestamp(),
        clock_timestamp() + make_interval(secs => ${WINDOW} / 1000))
on conflict (environment_id, kind, key_hash) do update set
  hits = case when c.expires_at <= (select tick from ts) then 1 else least(c.hits + 1, 1000000) end,
  started_at = case when c.expires_at <= (select tick from ts) then (select tick from ts) else c.started_at end,
  expires_at = case when c.expires_at <= (select tick from ts)
                    then (select tick from ts) + make_interval(secs => ${WINDOW} / 1000)
                    else c.expires_at end
returning hits, greatest(0, ceil(extract(epoch from expires_at - clock_timestamp()) * 1000))::int as retry_after_ms`;
var COUNTER_PURGE_BATCH = `with batch as (
  select environment_id, kind, key_hash from auth.attempt_counters
  where expires_at < clock_timestamp() - interval '1 minute'
  order by expires_at
  limit $1
  for update skip locked)
delete from auth.attempt_counters c
using batch b
where c.environment_id = b.environment_id and c.kind = b.kind and c.key_hash = b.key_hash`;
var ABANDON_RECORD = `insert into auth.abandon_cases
  (id, project_id, environment_id, core_organization_id, user_id, attempt_id,
   attempt_expires_at, next_attempt_at)
values ($1, $2, $3, $4, $5, $6, $7::timestamptz,
        $7::timestamptz + make_interval(secs => greatest($8::int, ${ABANDON_MIN_GRACE_MS})::float8 / 1000))
on conflict do nothing
returning id`;
var ABANDON_CLAIM = `with due as (
  select id from auth.abandon_cases
  where environment_id = $1 and resolved_at is null and attempts < ${ABANDON_CASE_MAX_ATTEMPTS2}
    and next_attempt_at <= clock_timestamp()
  order by next_attempt_at
  limit $2
  for update skip locked)
update auth.abandon_cases c
set attempts = c.attempts + 1,
    next_attempt_at = clock_timestamp() + make_interval(secs => $3::float8 / 1000),
    updated_at = clock_timestamp()
from due
where c.id = due.id
returning c.id, c.core_organization_id, c.user_id, c.attempt_id, c.attempts`;
var ABANDON_RESOLVE = `update auth.abandon_cases
set resolved_at = clock_timestamp(), outcome = $3, updated_at = clock_timestamp()
where id = $1 and environment_id = $2 and resolved_at is null
returning id`;
var ABANDON_SETTLE = `update auth.abandon_cases
set resolved_at = clock_timestamp(), outcome = 'not_needed', updated_at = clock_timestamp()
where id = $1 and environment_id = $2 and resolved_at is null and attempts = 0
returning id`;
var ABANDON_GIVE_UP_SPENT = `with batch as (
  select id from auth.abandon_cases
  where environment_id = $1 and resolved_at is null and attempts >= ${ABANDON_CASE_MAX_ATTEMPTS2}
    and next_attempt_at <= clock_timestamp()
  order by next_attempt_at
  limit $2
  for update skip locked)
update auth.abandon_cases
set resolved_at = clock_timestamp(), outcome = 'gave_up', updated_at = clock_timestamp()
where id in (select id from batch)
returning id`;
var ABANDON_LEARN = `update auth.abandon_cases
set core_organization_id = $3, updated_at = clock_timestamp()
where id = $1 and environment_id = $2 and core_organization_id is null and resolved_at is null
returning id`;
var ABANDON_PURGE_BATCH = `with batch as (
  select id from auth.abandon_cases
  where environment_id = $1 and resolved_at is not null
    and resolved_at < clock_timestamp() - interval '1 day'
  order by resolved_at
  limit $2
  for update skip locked)
delete from auth.abandon_cases
where id in (select id from batch)`;
var AUTH_STATEMENTS = {
  LOCKOUT_ATTEMPT,
  LOCKOUT_RETRY_AFTER,
  LOCKOUT_CLEAR,
  RATE_HIT,
  COUNTER_PURGE_BATCH,
  ABANDON_RECORD,
  ABANDON_CLAIM,
  ABANDON_RESOLVE,
  ABANDON_SETTLE,
  ABANDON_PURGE_BATCH,
  ABANDON_GIVE_UP_SPENT,
  ABANDON_LEARN
};
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
  "auth.abandon_cases",
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
  "auth.attempt_counters": "control plane: sign-in lockout and rate-limit counters, counted before any account, user or Organization is known; keyed by a keyed hash of the address (the key never reaches the database), so it holds no address and no IP address, and no environment-scoped read is needed to count; the service role reads, inserts, deletes and updates only the four counter columns, nothing else (hub issue 30, ADR 0014)",
  "auth.environments": "control plane: the auth environment is itself the tenant boundary tula-auth scopes by, one per kind in the Region's fixed project",
  "auth.instance_audit_logs": "control plane: operator actions outside any one environment, with no tenant columns; the service role may append and delete (for the retention job) but not update, and no retention floor bounds the delete",
  "auth.projects": "control plane: the app the Region secures (one fixed project per Region, ADR 0005), above the environments, not tenant data",
  "auth.workspaces": "control plane: top of tula-auth's account model, one workspace per Region, not tenant data"
};
var CONTROL_PLANE_TABLES = Object.keys(CONTROL_PLANE_TABLE_REASONS);
var NON_TENANT_TABLE_REASONS = {
  "core.invitation_directory": "asked before the Organization is known (accepting an invitation looks up a token hash); holds token hash, Organization id, invitation id and expiry for pending invitations only, is written only by SECURITY DEFINER triggers, and no service role holds any privilege on it: core.invitation_for_token is the only way in",
  "core.membership_directory": "asked before the Organization is known (sign-in asks which Organization a user belongs to); holds user id and Organization id, is written only by SECURITY DEFINER triggers, and no service role holds any privilege on it: core.organization_of_user is the only way in",
  "core.organization_state": "an Organization's status, one row per Organization, joined by both core lookups before the Organization is known; written only by a SECURITY DEFINER trigger on core.organizations in the same transaction as the status change, so a change writes one row however large the Organization is, and no service role holds any privilege on it: the two lookups are the only way in",
  "playbook.work_hints": "asked before the Organization is known (a sweep asks which Organizations have purge, job or message work due, and row-level security hides every tenant table from it); holds a kind, an Organization id and a due time, is written only by SECURITY DEFINER triggers and the discovery function, and no service role holds any privilege on it: playbook.organizations_with_work is the only way in"
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
// src/playbook-sql.ts
var DOCUMENT_MIN_RETENTION_MS = 3600000;
var PLAYBOOK_MIN_LEASE_MS = 1000;
var INGESTION_MAX_RETRY_DELAY_MS = 3600000;
var DOCUMENT_LIST_MAX_PAGE = 100;
var PLAYBOOK_MAX_BATCH = 500;
var ORPHAN_SWEEP_AGE_MS = 25 * 60 * 60 * 1000;
var IDEMPOTENCY_PURGE_AGE_MS = ORPHAN_SWEEP_AGE_MS + 60 * 60 * 1000;
var IDEMPOTENCY_MIN_PURGE_AGE_MS = IDEMPOTENCY_PURGE_AGE_MS;
var CLAMP = (parameter, max) => `least(greatest(coalesce(${parameter}::int, 1), 1), ${max})`;
var BATCH = (parameter) => CLAMP(parameter, PLAYBOOK_MAX_BATCH);
var LEASE = (parameter) => `make_interval(secs => greatest(coalesce(${parameter}::float8, 0), ${PLAYBOOK_MIN_LEASE_MS}) / 1000)`;

// src/playbook-call-statements.ts
var READ_COLUMNS = `c.id, c.deal_record_id, d.deal_id, d.outcome as deal_outcome,
  (c.state = 'ready' and d.outcome = 'won' and c.tagged_outcome_seq >= d.outcome_seq) as in_search,
  c.kind, c.file_name, c.media_type, c.size_bytes, c.duration_seconds, c.state, c.failure_reason,
  c.rep_by, c.rep_label, c.rep_channel, c.speaker_labels, c.deleted_at, c.purge_due_at,
  c.uploaded_by, c.created_at, c.updated_at, c.rep_seq, c.epoch, c.deletion_seq,
  (c.state = 'deleted' and (c.purge_due_at <= clock_timestamp() or c.purge_started_at is not null or c.restore_barred_at is not null)) as not_restorable`;
var CALL_ROW_FIELDS = [
  "id",
  "deal_record_id",
  "deal_id",
  "deal_outcome",
  "in_search",
  "kind",
  "file_name",
  "media_type",
  "size_bytes",
  "duration_seconds",
  "state",
  "failure_reason",
  "rep_by",
  "rep_label",
  "rep_channel",
  "speaker_labels",
  "deleted_at",
  "purge_due_at",
  "uploaded_by",
  "created_at",
  "updated_at",
  "rep_seq",
  "epoch",
  "deletion_seq",
  "not_restorable"
];
var FROM_CALL = `from playbook.calls c join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id`;
var CALL_USAGE = `select call_count, recording_byte_count
from playbook.organization_usage
where organization_id = $1`;
var CALL_INSERT = `with rights as (
  select exists (select 1 from playbook.rights_confirmations
                 where organization_id = $1 and wording_version = $19::int) as ok),
dup as (
  select c.id, c.state, c.failure_reason, (d.deal_id = $3::text) as same_deal
  ${FROM_CALL}
  where c.organization_id = $1 and c.content_hash = $9::bytea
    and c.purge_started_at is null and c.restore_barred_at is null),
deal as (
  select id from playbook.deals where organization_id = $1 and deal_id = $3::text),
usage as (
  select call_count, recording_byte_count, deal_count from playbook.organization_usage where organization_id = $1),
gate as (
  select (select ok from rights) as rights_ok,
    not exists (select 1 from dup) as no_dup,
    (coalesce((select call_count from usage), 0) < $16::bigint
      and ($7::text <> 'recording' or coalesce((select recording_byte_count from usage), 0) + $8::bigint <= $17::bigint)
      and (exists (select 1 from deal) or coalesce((select deal_count from usage), 0) < $18::bigint)) as quota_ok),
go as (
  select 1 as one from gate where rights_ok and no_dup and quota_ok),
made as (
  insert into playbook.deals (id, organization_id, deal_id)
  select $4::text, $1, $3::text from go where not exists (select 1 from deal)
  returning id),
ins as (
  insert into playbook.calls
    (id, organization_id, deal_record_id, kind, file_name, media_type, size_bytes, content_hash,
     uploaded_by, object_key, rep_by, rep_label, rep_channel)
  select $2::text, $1, coalesce((select id from deal), (select id from made)), $7::text, $5::text, $6::text,
    $8::bigint, $9::bytea, $10::text, $11::text, $12::text, $13::text, $14::text
  from go
  returning id, state, epoch, rep_seq),
queued as (
  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at)
  select $15::text, $1, id, case when $7::text = 'recording' then 'transcribe' else 'process' end, epoch, rep_seq, clock_timestamp()
  from ins)
select 'created' as result, id, state, null::text as failure_reason from ins
union all
select case when same_deal then 'existing' else 'other_deal' end, id, state, failure_reason
from dup where (select ok from rights)
union all
select case when not rights_ok then 'rights_required' else 'quota_exceeded' end, null, null, null
from gate where not rights_ok or (no_dup and not quota_ok)`;
var CALL_GET = `select ${READ_COLUMNS}
${FROM_CALL}
where c.organization_id = $1 and c.id = $2`;
var KEYSET = `(c.created_at, c.id) < ($2::timestamptz, $3::text)`;
var LIST_END = `order by c.created_at desc, c.id desc
limit ${CLAMP("$4", DOCUMENT_LIST_MAX_PAGE)}`;
var CALL_LIST = `select ${READ_COLUMNS}, c.created_at::text as cursor_at
${FROM_CALL}
where c.organization_id = $1 and c.state <> 'deleted' and ${KEYSET}
${LIST_END}`;
var CALL_LIST_BY_STATE = `select ${READ_COLUMNS}, c.created_at::text as cursor_at
${FROM_CALL}
where c.organization_id = $1 and c.state = $5::text and ${KEYSET}
${LIST_END}`;
var CALL_LIST_BY_DEAL = `select ${READ_COLUMNS}, c.created_at::text as cursor_at
${FROM_CALL}
where c.organization_id = $1 and c.deal_record_id = $5::text
  and (($6::text is null and c.state <> 'deleted') or c.state = $6::text) and ${KEYSET}
${LIST_END}`;
var CALL_SOFT_DELETE = `with j as (
  update playbook.call_jobs
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp(),
      next_attempt_at = case when state = 'running' then next_attempt_at else clock_timestamp() end
  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')
  returning id),
x as (
  update playbook.calls
  set state = 'deleted', epoch = epoch + 1, deletion_seq = deletion_seq + 1,
      deleted_at = clock_timestamp(), deleted_by = $3,
      purge_due_at = clock_timestamp() + make_interval(secs => greatest(coalesce($4::float8, 0), 3600000) / 1000),
      failure_reason = null, updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and state <> 'deleted' and (select count(*) from j) >= 0
  returning id, state, deletion_seq, purge_due_at)
select id, state, deletion_seq, purge_due_at, true as changed from x
union all
select id, state, deletion_seq, purge_due_at, false from playbook.calls
where organization_id = $1 and id = $2 and state = 'deleted' and not exists (select 1 from x)`;
var RESTORE = (dueGuard) => `with j as (
  update playbook.call_jobs
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')
    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = $2 and x.state = 'deleted')
  returning id),
x as (
  update playbook.calls
  set state = case when kind = 'recording' and transcript_key is null then 'uploaded'
                   when rep_by is null then 'awaiting_rep' else 'processing' end,
      epoch = epoch + 1, deleted_at = null, deleted_by = null, purge_due_at = null, updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is null and restore_barred_at is null${dueGuard}
    and (select count(*) from j) >= 0
  returning organization_id, id, epoch, deletion_seq, state, rep_seq),
queued as (
  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at)
  select $3::text, organization_id, id, case when state = 'uploaded' then 'transcribe' else 'process' end, epoch, rep_seq, clock_timestamp()
  from x where state <> 'awaiting_rep')
select id, state, epoch, deletion_seq, true as changed from x
union all
select id, state, epoch, deletion_seq, false from playbook.calls
where organization_id = $1 and id = $2 and state <> 'deleted' and not exists (select 1 from x)`;
var CALL_RESTORE = RESTORE(`
    and purge_due_at > clock_timestamp()`);
var CALL_RESTORE_FOR_UPLOAD = RESTORE("");
var CALL_REQUEUE = `with j as (
  update playbook.call_jobs
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')
    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = $2 and x.state = 'failed'
                and x.failure_reason in ('transcription_failed', 'transcription_timed_out', 'processing_failed'))
  returning id),
x as (
  update playbook.calls
  set state = 'uploaded', failure_reason = null, epoch = epoch + 1, updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and state = 'failed'
    and failure_reason in ('transcription_failed', 'transcription_timed_out', 'processing_failed')
    and (select count(*) from j) >= 0
  returning organization_id, id, epoch, rep_seq, kind, transcript_key),
queued as (
  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at)
  select $3::text, organization_id, id, case when kind = 'recording' and transcript_key is null then 'transcribe' else 'process' end,
    epoch, rep_seq, clock_timestamp()
  from x)
select id, 'uploaded' as state, epoch, true as changed from x
union all
select id, state, epoch, false from playbook.calls
where organization_id = $1 and id = $2 and state <> 'deleted' and not exists (select 1 from x)`;
var CALL_SET_REP = `with jl as (
  select id from playbook.call_jobs
  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')
  order by id
  for update),
cur as (
  select * from playbook.calls where organization_id = $1 and id = $2 and (select count(*) from jl) >= 0 for update),
v as (
  select cur.id, cur.state, cur.rep_seq,
    case
      when cur.state <> 'deleted' and cur.rep_by is not distinct from $3::text
        and cur.rep_label is not distinct from (case when $3::text = 'speaker' then $4::text end)
        and cur.rep_channel is not distinct from (case when $3::text = 'channel' then $5::text end)
        and cur.state <> 'failed' then 'unchanged'
      when not (cur.state in ('ready', 'awaiting_rep')
                or (cur.state = 'failed' and cur.failure_reason in ('rep_label_not_found', 'not_per_side')))
        then 'not_changeable'
      when not (($3::text = 'speaker' and ($4::text is not null and $4::text = any(cur.speaker_labels)))
                or ($3::text = 'channel' and cur.kind = 'recording' and $5::text in ('left', 'right'))) then 'invalid'
      else 'changed'
    end as result
  from cur),
j as (
  update playbook.call_jobs
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and id in (select id from jl)
    and exists (select 1 from v where result = 'changed')
  returning id),
u as (
  update playbook.calls c
  set rep_by = $3::text, rep_label = case when $3::text = 'speaker' then $4::text end,
      rep_channel = case when $3::text = 'channel' then $5::text end,
      rep_seq = c.rep_seq + 1, state = 'processing', failure_reason = null, updated_at = clock_timestamp()
  from v
  where c.organization_id = $1 and c.id = v.id and v.result = 'changed' and (select count(*) from j) >= 0
  returning c.id, c.rep_seq, c.epoch),
queued as (
  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at)
  select $6::text, $1, id, 'rebuild', epoch, rep_seq, clock_timestamp() from u)
select 'changed' as result, id, 'processing'::text as state, rep_seq from u
union all
select result, id, state, rep_seq from v where result <> 'changed'`;
var LIVE = (job, call) => `(${call}.epoch = ${job}.epoch and (
    (${job}.kind = 'transcribe' and ${call}.state in ('uploaded', 'transcribing'))
    or (${job}.kind = 'process' and ${call}.state in ('uploaded', 'processing'))
    or (${job}.kind = 'rebuild' and ${call}.state = 'processing' and ${call}.rep_seq = ${job}.rep_seq)))`;
var CLAIM_COLUMNS = [
  "id",
  "call_id",
  "job_kind",
  "epoch",
  "rep_seq",
  "attempts",
  "claim_token",
  "call_kind",
  "media_type",
  "size_bytes",
  "object_key",
  "transcript_key",
  "rep_by",
  "rep_label",
  "rep_channel",
  "speaker_labels",
  "sent_to_vendor_at"
];
var CALL_JOB_CLAIM = `with due as (
  select j.id, coalesce(${LIVE("j", "c")}, false) as live
  from playbook.call_jobs j
  left join playbook.calls c on c.organization_id = j.organization_id and c.id = j.call_id
  where j.organization_id = $1 and j.state in ('queued', 'running')
    and j.attempts < ${CALL_JOB_MAX_ATTEMPTS2} and j.next_attempt_at <= clock_timestamp()
    and ($4::text is null or j.id = $4::text)
  order by j.next_attempt_at
  limit ${BATCH("$2")}
  for update of j skip locked),
stale as (
  update playbook.call_jobs t
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  from due
  where t.organization_id = $1 and t.id = due.id and not due.live
  returning t.id),
claimed as (
  update playbook.call_jobs j
  set state = 'running', attempts = j.attempts + 1, claim_token = gen_random_uuid(),
      next_attempt_at = clock_timestamp() + ${LEASE("$3")}, updated_at = clock_timestamp()
  from due
  where j.organization_id = $1 and j.id = due.id and due.live
  returning j.id, j.call_id, j.kind, j.epoch, j.rep_seq, j.attempts, j.claim_token),
moved as (
  update playbook.calls c
  set state = case claimed.kind when 'transcribe' then 'transcribing' when 'process' then 'processing' else c.state end,
      updated_at = clock_timestamp()
  from claimed
  where c.organization_id = $1 and c.id = claimed.call_id
    and ${LIVE("claimed", "c")}
  returning c.id, c.kind as call_kind, c.media_type, c.size_bytes, c.object_key, c.transcript_key,
            c.rep_by, c.rep_label, c.rep_channel, c.speaker_labels, c.sent_to_vendor_at)
select cl.id, cl.call_id, cl.kind as job_kind, cl.epoch, cl.rep_seq, cl.attempts, cl.claim_token,
  m.call_kind, m.media_type, m.size_bytes, m.object_key, m.transcript_key, m.rep_by, m.rep_label,
  m.rep_channel, m.speaker_labels, m.sent_to_vendor_at,
  (select count(*) from stale)::int as cancelled,
  ((select count(*) from claimed) - (select count(*) from moved))::int as lost
from claimed cl join moved m on m.id = cl.call_id
union all
select ${CLAIM_COLUMNS.map((column) => column === "epoch" || column === "rep_seq" || column === "attempts" ? "null::int" : column === "claim_token" ? "null::uuid" : column === "size_bytes" ? "null::bigint" : column === "speaker_labels" ? "null::text[]" : column === "sent_to_vendor_at" ? "null::timestamptz" : "null::text").join(", ")},
  (select count(*) from stale)::int, ((select count(*) from claimed) - (select count(*) from moved))::int
where not exists (select 1 from claimed cl join moved m on m.id = cl.call_id)
  and ((select count(*) from stale) > 0 or (select count(*) from claimed) > 0)`;
function claimedCallJobs(rows) {
  const jobs = rows.filter((row) => row.id !== null && row.call_id !== null);
  return { jobs, cancelled: rows[0]?.cancelled ?? 0, lost: rows[0]?.lost ?? 0 };
}
var CALL_JOB_HEARTBEAT = `update playbook.call_jobs
set next_attempt_at = clock_timestamp() + ${LEASE("$4")}, updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
  and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id and ${LIVE("call_jobs", "x")})
returning id`;
var CALL_JOB_RETRY = `update playbook.call_jobs
set state = 'queued', claim_token = null,
    next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), ${INGESTION_MAX_RETRY_DELAY_MS}) / 1000),
    updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
returning id, attempts`;
var CALL_SENT_TO_VENDOR = `update playbook.calls c
set sent_to_vendor_at = coalesce(c.sent_to_vendor_at, clock_timestamp()), updated_at = clock_timestamp()
from playbook.call_jobs j
where j.organization_id = $1 and j.id = $2 and j.claim_token = $3::uuid and j.state = 'running'
  and c.organization_id = $1 and c.id = j.call_id and ${LIVE("j", "c")}
returning c.id`;
var CALL_JOB_RECORD = `with j as (
  update playbook.call_jobs
  set next_attempt_at = clock_timestamp() + ${LEASE("$7")}, updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id and ${LIVE("call_jobs", "x")})
  returning call_id, epoch)
update playbook.calls c
set transcript_key = coalesce($4::text, c.transcript_key), duration_seconds = coalesce($5::int, c.duration_seconds),
    speaker_labels = coalesce($6::text[], c.speaker_labels), updated_at = clock_timestamp()
from j
where c.organization_id = $1 and c.id = j.call_id and c.epoch = j.epoch
returning c.id`;
var CALL_JOB_TRANSCRIBED = `with j as (
  update playbook.call_jobs
  set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running' and kind = 'transcribe'
    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id
                and x.state = 'transcribing' and x.epoch = call_jobs.epoch and x.transcript_key is not null)
  returning call_id, epoch),
c as (
  update playbook.calls
  set state = case when rep_by is null then 'awaiting_rep' else 'processing' end, updated_at = clock_timestamp()
  where organization_id = $1 and id = (select call_id from j) and epoch = (select epoch from j) and state = 'transcribing'
  returning id, state, epoch, rep_seq),
q as (
  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at)
  select $4::text, $1, id, 'process', epoch, rep_seq, clock_timestamp() from c where state = 'processing')
select id, state from c`;
var CALL_JOB_COMPLETE = `with j as (
  update playbook.call_jobs
  set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running' and kind in ('process', 'rebuild')
    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id
                and x.state = 'processing' and x.epoch = call_jobs.epoch
                and (call_jobs.kind = 'process' or x.rep_seq = call_jobs.rep_seq)
                and x.rep_by is not null and (x.rep_by <> 'speaker' or x.rep_label = any(x.speaker_labels)))
  returning call_id, epoch),
c as (
  update playbook.calls c
  set state = 'ready', tagged_outcome_seq = greatest(c.tagged_outcome_seq, least($4::int, dd.outcome_seq)), updated_at = clock_timestamp()
  from j, playbook.deals dd
  where c.organization_id = $1 and c.id = j.call_id and c.epoch = j.epoch and c.state = 'processing'
    and dd.organization_id = $1 and dd.id = c.deal_record_id
  returning c.id, c.deal_record_id, c.tagged_outcome_seq),
dl as (
  update playbook.deals d
  set retag_through = least(d.retag_through, c.tagged_outcome_seq)
  from c
  where d.organization_id = $1 and d.id = c.deal_record_id and c.tagged_outcome_seq < d.outcome_seq
  returning d.id)
select id from c`;
var CALL_JOB_FAIL = `with j as (
  update playbook.call_jobs
  set state = 'failed', failure_reason = $4::text, claim_token = null,
      finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id and ${LIVE("call_jobs", "x")})
  returning call_id, epoch),
c as (
  update playbook.calls
  set state = 'failed', failure_reason = $4::text,
      speaker_labels = case when $4::text = 'too_many_speakers' then '{}'::text[] else speaker_labels end,
      updated_at = clock_timestamp()
  where organization_id = $1 and id = (select call_id from j) and epoch = (select epoch from j)
    and state in ('uploaded', 'transcribing', 'processing')
  returning id)
select id from c`;
var CALL_JOB_GIVE_UP_SPENT = `with batch as (
  select id from playbook.call_jobs
  where organization_id = $1 and state in ('queued', 'running')
    and attempts >= ${CALL_JOB_MAX_ATTEMPTS2} and next_attempt_at <= clock_timestamp()
  order by next_attempt_at
  limit ${BATCH("$2")}
  for update skip locked),
j as (
  update playbook.call_jobs t
  set state = 'failed', failure_reason = 'processing_failed', claim_token = null,
      finished_at = clock_timestamp(), updated_at = clock_timestamp()
  from batch
  where t.organization_id = $1 and t.id = batch.id
  returning t.call_id, t.epoch),
c as (
  update playbook.calls
  set state = 'failed', failure_reason = 'processing_failed', updated_at = clock_timestamp()
  from j
  where calls.organization_id = $1 and calls.id = j.call_id and calls.epoch = j.epoch
    and calls.state in ('uploaded', 'transcribing', 'processing'))
select call_id from j`;
var CALL_CLEANUP_BEGIN = `select c.id, c.epoch,
  not exists (
    select 1 from playbook.call_jobs j
    where j.organization_id = c.organization_id and j.call_id = c.id
      and j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp()) as clear
from playbook.calls c
where c.organization_id = $1 and c.id = $2 and c.state = 'deleted' and c.deletion_seq = $3::int`;
var CALL_LIST_PENDING_CLEANUP = `select id, epoch, deletion_seq, deleted_at, deleted_at::text as cursor_at
from playbook.calls
where organization_id = $1 and ${CALL_PENDING_CLEANUP_PREDICATE2}
  and (deleted_at, id) > ($2::timestamptz, $3::text)
order by deleted_at, id
limit ${BATCH("$4")}`;
var CALL_CLEANUP_DONE = `update playbook.calls
set vectors_removed_seq = $3::int, updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and state = 'deleted' and deletion_seq = $3::int
returning id`;
var CALL_VENDOR_REMOVED = `update playbook.calls
set vendor_removed_at = coalesce(vendor_removed_at, clock_timestamp()), updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and state = 'deleted' and sent_to_vendor_at is not null
returning id`;
var CALL_PURGE_CLAIM = `with due as (
  select id from playbook.calls
  where organization_id = $1 and state = 'deleted' and purge_due_at <= clock_timestamp()
    and purge_attempts < ${CALL_PURGE_MAX_ATTEMPTS2}
    and (purge_lease_until is null or purge_lease_until <= clock_timestamp())
  order by purge_due_at
  limit ${BATCH("$2")}
  for update skip locked)
update playbook.calls c
set purge_started_at = coalesce(c.purge_started_at, clock_timestamp()),
    purge_attempts = c.purge_attempts + 1,
    purge_lease_until = clock_timestamp() + ${LEASE("$3")},
    updated_at = clock_timestamp()
from due
where c.organization_id = $1 and c.id = due.id
returning c.id, c.kind, c.object_key, c.transcript_key, c.size_bytes, c.deletion_seq, c.vectors_removed_seq,
  c.sent_to_vendor_at, c.vendor_removed_at, c.purge_attempts`;
var CALL_PURGE_COMPLETE = `with jl as (
  select state, next_attempt_at from playbook.call_jobs
  where organization_id = $1 and call_id = $2
  for update)
delete from playbook.calls
where organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is not null
  and vectors_removed_seq = deletion_seq
  and (sent_to_vendor_at is null or vendor_removed_at is not null)
  and not exists (select 1 from jl where jl.state = 'running' and jl.next_attempt_at > clock_timestamp())
returning id, size_bytes`;
var CALL_LIST_SPENT_PURGES = `select id, kind, object_key, transcript_key, deletion_seq, vectors_removed_seq,
  sent_to_vendor_at, vendor_removed_at, deleted_at, purge_due_at, purge_started_at, purge_lease_until, purge_attempts
from playbook.calls
where organization_id = $1 and state = 'deleted' and purge_attempts >= ${CALL_PURGE_MAX_ATTEMPTS2}
  and id > $2::text
order by id
limit ${CLAMP("$3", DOCUMENT_LIST_MAX_PAGE)}`;
var CALL_PURGE_RESET = `update playbook.calls
set purge_attempts = 0, purge_started_at = null, purge_lease_until = null,
    restore_barred_at = coalesce(restore_barred_at, clock_timestamp()), updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and state = 'deleted' and purge_attempts >= ${CALL_PURGE_MAX_ATTEMPTS2}
returning id, purge_attempts`;
var CALL_ERASE_BATCH = `with t as (select clock_timestamp() as now),
cand as (
  select id, deletion_seq from playbook.calls
  where organization_id = $1 and restore_barred_at is null
  order by id
  limit ${BATCH("$2")}),
jl as (
  select id from playbook.call_jobs
  where organization_id = $1 and state in ('queued', 'running') and call_id in (select id from cand)
  order by id
  for update),
j as (
  update playbook.call_jobs
  set state = 'cancelled', claim_token = null, finished_at = (select now from t), updated_at = (select now from t),
      next_attempt_at = case when state = 'running' then next_attempt_at else (select now from t) end
  where organization_id = $1 and id in (select id from jl)
  returning id),
cl as (
  select id from playbook.calls
  where organization_id = $1 and id in (select id from cand) and restore_barred_at is null
    and (select count(*) from j) >= 0
  order by id
  for update),
x as (
  update playbook.calls c
  set state = 'deleted',
      epoch = case when c.state <> 'deleted' then c.epoch + 1 else c.epoch end,
      deletion_seq = case when c.state <> 'deleted' then c.deletion_seq + 1 else c.deletion_seq end,
      deleted_at = case when c.state <> 'deleted' then (select now from t) else c.deleted_at end,
      deleted_by = case when c.state <> 'deleted' then $3::text else c.deleted_by end,
      purge_due_at = least(coalesce(c.purge_due_at, (select now from t)), (select now from t)),
      restore_barred_at = (select now from t), failure_reason = null, updated_at = (select now from t)
  from cand
  where c.organization_id = $1 and c.id = cand.id and c.id in (select id from cl)
  returning c.id, c.epoch, c.deletion_seq, (c.deletion_seq <> cand.deletion_seq) as changed,
    c.object_key, c.transcript_key, c.kind, c.sent_to_vendor_at)
select id, epoch, deletion_seq, changed, object_key, transcript_key, kind, sent_to_vendor_at from x order by id`;
var DEAL_LIST_PENDING_RETAG = `select id, outcome, outcome_seq, retag_through
from playbook.deals
where organization_id = $1 and retag_through < outcome_seq and id > $2::text
order by id
limit ${BATCH("$3")}`;
var DEAL_RETAG_BATCH = `select c.id, d.outcome, d.outcome_seq
from playbook.calls c
join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id
where c.organization_id = $1 and c.deal_record_id = $2::text and c.state = 'ready'
  and c.tagged_outcome_seq < d.outcome_seq and c.id > $3::text
order by c.id
limit ${BATCH("$4")}`;
var CALL_RETAGGED = `update playbook.calls c
set tagged_outcome_seq = $3::int, updated_at = clock_timestamp()
from playbook.deals d
where c.organization_id = $1 and c.id = any(($2::text[])[1:500]) and c.state = 'ready'
  and c.tagged_outcome_seq < $3::int
  and d.organization_id = $1 and d.id = c.deal_record_id and $3::int <= d.outcome_seq
returning c.id`;
var DEAL_RETAG_LOCK = `select id, outcome, outcome_seq, retag_through
from playbook.deals
where organization_id = $1 and id = $2
for update`;
var DEAL_RETAG_DONE = `update playbook.deals d
set retag_through = $3::int
where d.organization_id = $1 and d.id = $2 and d.retag_through < $3::int and $3::int <= d.outcome_seq
  and not exists (
    select 1 from playbook.calls c
    where c.organization_id = $1 and c.deal_record_id = d.id and c.state = 'ready' and c.tagged_outcome_seq < $3::int)
returning d.id, d.retag_through, d.outcome_seq`;
var CALL_STATEMENTS = {
  CALL_USAGE,
  CALL_INSERT,
  CALL_GET,
  CALL_LIST,
  CALL_LIST_BY_STATE,
  CALL_LIST_BY_DEAL,
  CALL_SOFT_DELETE,
  CALL_RESTORE,
  CALL_RESTORE_FOR_UPLOAD,
  CALL_REQUEUE,
  CALL_SET_REP,
  CALL_JOB_CLAIM,
  CALL_JOB_HEARTBEAT,
  CALL_JOB_RETRY,
  CALL_SENT_TO_VENDOR,
  CALL_JOB_RECORD,
  CALL_JOB_TRANSCRIBED,
  CALL_JOB_COMPLETE,
  CALL_JOB_FAIL,
  CALL_JOB_GIVE_UP_SPENT,
  CALL_CLEANUP_BEGIN,
  CALL_LIST_PENDING_CLEANUP,
  CALL_CLEANUP_DONE,
  CALL_VENDOR_REMOVED,
  CALL_PURGE_CLAIM,
  CALL_PURGE_COMPLETE,
  CALL_LIST_SPENT_PURGES,
  CALL_PURGE_RESET,
  CALL_ERASE_BATCH,
  DEAL_LIST_PENDING_RETAG,
  DEAL_RETAG_BATCH,
  CALL_RETAGGED,
  DEAL_RETAG_LOCK,
  DEAL_RETAG_DONE
};
// src/playbook-statements.ts
var STEP_ORDER = `array[${INGESTION_STEPS2.map((step) => `'${step}'`).join(", ")}]`;
var QUOTA_LOCK = `select pg_advisory_xact_lock(hashtextextended($1::text, 0)) is not null as locked`;
var QUOTA_USAGE = `select document_count, byte_count
from playbook.organization_usage
where organization_id = $1`;
var DOCUMENT_INSERT = `with ins as (
  insert into playbook.documents
    (id, organization_id, name, content_hash, size_bytes, declared_type, detected_type, uploaded_by, object_key)
  select $2::text, $1::text, $3::text, $4::bytea, $5::bigint, $6::text, $7::text, $8::text, $9::text
  where coalesce((select document_count from playbook.organization_usage where organization_id = $1), 0) < $11::bigint
    and coalesce((select byte_count from playbook.organization_usage where organization_id = $1), 0) + $5::bigint <= $12::bigint
  on conflict (organization_id, content_hash) where purge_started_at is null and restore_barred_at is null do nothing
  returning id, organization_id, epoch),
queued as (
  insert into playbook.ingestion_jobs (id, organization_id, document_id, epoch, next_attempt_at)
  select $10::text, organization_id, id, epoch, clock_timestamp() from ins)
select id, epoch from ins`;
var DOCUMENT_BY_HASH = `select id, state, epoch, deletion_seq
from playbook.documents
where organization_id = $1 and content_hash = $2::bytea and purge_started_at is null and restore_barred_at is null`;
var DOCUMENT_ROW_FIELDS = [
  "id",
  "name",
  "state",
  "size_bytes",
  "declared_type",
  "detected_type",
  "uploaded_by",
  "failure_reason",
  "epoch",
  "deletion_seq",
  "deleted_at",
  "deleted_by",
  "purge_due_at",
  "purge_started_at",
  "page_count",
  "created_at",
  "updated_at",
  "not_restorable"
];
var NOT_RESTORABLE = `(state = 'deleted' and (purge_due_at <= clock_timestamp() or purge_started_at is not null or restore_barred_at is not null)) as not_restorable`;
var DOCUMENT_COLUMNS = `${DOCUMENT_ROW_FIELDS.filter((f) => f !== "not_restorable").join(", ")},
  ${NOT_RESTORABLE}`;
var DOCUMENT_LIST = `select ${DOCUMENT_COLUMNS}
from playbook.documents
where organization_id = $1 and state <> 'deleted'
  and (created_at, id) < ($2::timestamptz, $3::text)
order by created_at desc, id desc
limit ${CLAMP("$4", DOCUMENT_LIST_MAX_PAGE)}`;
var DOCUMENT_LIST_DELETED = `select ${DOCUMENT_COLUMNS}
from playbook.documents
where organization_id = $1 and state = 'deleted'
  and (created_at, id) < ($2::timestamptz, $3::text)
order by created_at desc, id desc
limit ${CLAMP("$4", DOCUMENT_LIST_MAX_PAGE)}`;
var DOCUMENT_LIST_FILTERED = `select * from (
  (select ${DOCUMENT_COLUMNS} from playbook.documents
   where $5::text is null and organization_id = $1 and state <> 'deleted'
     and (created_at, id) < ($2::timestamptz, $3::text)
   order by created_at desc, id desc limit ${CLAMP("$4", DOCUMENT_LIST_MAX_PAGE)})
  union all
  (select ${DOCUMENT_COLUMNS} from playbook.documents
   where $5::text in ('uploaded', 'processing', 'ready', 'failed') and organization_id = $1 and state = $5::text and state <> 'deleted'
     and (created_at, id) < ($2::timestamptz, $3::text)
   order by created_at desc, id desc limit ${CLAMP("$4", DOCUMENT_LIST_MAX_PAGE)})
  union all
  (select ${DOCUMENT_COLUMNS} from playbook.documents
   where $5::text = 'deleted' and organization_id = $1 and state = 'deleted'
     and (created_at, id) < ($2::timestamptz, $3::text)
   order by created_at desc, id desc limit ${CLAMP("$4", DOCUMENT_LIST_MAX_PAGE)})
) page
order by created_at desc, id desc
limit ${CLAMP("$4", DOCUMENT_LIST_MAX_PAGE)}`;
var DOCUMENT_GET = `select ${DOCUMENT_COLUMNS}
from playbook.documents
where organization_id = $1 and id = $2`;
var DOCUMENT_SOFT_DELETE = `with j as (
  update playbook.ingestion_jobs
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp(),
      next_attempt_at = case when state = 'running' then next_attempt_at else clock_timestamp() end
  where organization_id = $1 and document_id = $2 and state in ('queued', 'running')
  returning id),
d as (
  update playbook.documents
  set state = 'deleted', epoch = epoch + 1, deletion_seq = deletion_seq + 1,
      deleted_at = clock_timestamp(), deleted_by = $3,
      purge_due_at = clock_timestamp() + make_interval(secs => greatest(coalesce($4::float8, 0), ${DOCUMENT_MIN_RETENTION_MS}) / 1000),
      failure_reason = null, updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and state <> 'deleted' and (select count(*) from j) >= 0
  returning id, state, deletion_seq, purge_due_at)
select id, state, deletion_seq, purge_due_at, true as changed from d
union all
select id, state, deletion_seq, purge_due_at, false from playbook.documents
where organization_id = $1 and id = $2 and state = 'deleted' and not exists (select 1 from d)`;
var RESTORE2 = (dueGuard) => `with j as (
  update playbook.ingestion_jobs
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and document_id = $2 and state in ('queued', 'running')
    and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = $2 and x.state = 'deleted')
  returning id),
d as (
  update playbook.documents
  set state = 'processing', epoch = epoch + 1, deleted_at = null, deleted_by = null,
      purge_due_at = null, updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is null and restore_barred_at is null${dueGuard}
    and (select count(*) from j) >= 0
  returning organization_id, id, epoch, deletion_seq),
queued as (
  insert into playbook.ingestion_jobs (id, organization_id, document_id, epoch, next_attempt_at)
  select $3::text, organization_id, id, epoch, clock_timestamp() from d)
select id, 'processing' as state, epoch, deletion_seq, true as changed from d
union all
select id, state, epoch, deletion_seq, false from playbook.documents
where organization_id = $1 and id = $2 and state <> 'deleted' and not exists (select 1 from d)`;
var DOCUMENT_RESTORE = RESTORE2(`
    and purge_due_at > clock_timestamp()`);
var DOCUMENT_RESTORE_FOR_UPLOAD = RESTORE2("");
var DOCUMENT_REQUEUE = `with j as (
  update playbook.ingestion_jobs
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and document_id = $2 and state in ('queued', 'running')
    and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = $2 and x.state = 'failed')
  returning id),
d as (
  update playbook.documents
  set state = 'uploaded', failure_reason = null, updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and state = 'failed' and (select count(*) from j) >= 0
  returning organization_id, id, epoch, deletion_seq),
queued as (
  insert into playbook.ingestion_jobs (id, organization_id, document_id, epoch, next_attempt_at)
  select $3::text, organization_id, id, epoch, clock_timestamp() from d)
select id, 'uploaded' as state, epoch, deletion_seq, true as changed from d
union all
select id, state, epoch, deletion_seq, false from playbook.documents
where organization_id = $1 and id = $2 and state in ('uploaded', 'processing', 'ready') and not exists (select 1 from d)`;
var DOCUMENT_CLEANUP_BEGIN = `select d.id, d.epoch,
  not exists (
    select 1 from playbook.ingestion_jobs j
    where j.organization_id = d.organization_id and j.document_id = d.id
      and j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp()) as clear
from playbook.documents d
where d.organization_id = $1 and d.id = $2 and d.state = 'deleted' and d.deletion_seq = $3::int`;
var DOCUMENT_LIST_PENDING_CLEANUP = `select id, epoch, deletion_seq, deleted_at
from playbook.documents
where organization_id = $1 and ${PENDING_CLEANUP_PREDICATE2}
  and (deleted_at, id) > ($2::timestamptz, $3::text)
order by deleted_at, id
limit ${BATCH("$4")}`;
var DOCUMENT_CLEANUP_DONE = `update playbook.documents
set vectors_removed_seq = $3::int, updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and state = 'deleted' and deletion_seq = $3::int
returning id`;
var DOCUMENT_PURGE_CLAIM = `with due as (
  select id from playbook.documents
  where organization_id = $1 and state = 'deleted' and purge_due_at <= clock_timestamp()
    and purge_attempts < ${DOCUMENT_PURGE_MAX_ATTEMPTS2}
    and (purge_lease_until is null or purge_lease_until <= clock_timestamp())
  order by purge_due_at
  limit ${BATCH("$2")}
  for update skip locked)
update playbook.documents d
set purge_started_at = coalesce(d.purge_started_at, clock_timestamp()),
    purge_attempts = d.purge_attempts + 1,
    purge_lease_until = clock_timestamp() + ${LEASE("$3")},
    updated_at = clock_timestamp()
from due
where d.organization_id = $1 and d.id = due.id
returning d.id, d.object_key, d.size_bytes, d.deletion_seq, d.vectors_removed_seq, d.purge_attempts`;
var DOCUMENT_PURGE_COMPLETE = `with jl as (
  select state, next_attempt_at from playbook.ingestion_jobs
  where organization_id = $1 and document_id = $2
  for update)
delete from playbook.documents
where organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is not null
  and vectors_removed_seq = deletion_seq
  and not exists (select 1 from jl where jl.state = 'running' and jl.next_attempt_at > clock_timestamp())
returning id, size_bytes`;
var INGESTION_JOB_CLAIM = `with due as (
  select j.id, coalesce(d.state in ('uploaded', 'processing') and d.epoch = j.epoch, false) as live
  from playbook.ingestion_jobs j
  left join playbook.documents d on d.organization_id = j.organization_id and d.id = j.document_id
  where j.organization_id = $1 and j.state in ('queued', 'running')
    and j.attempts < ${INGESTION_JOB_MAX_ATTEMPTS2} and j.next_attempt_at <= clock_timestamp()
    and ($4::text is null or j.id = $4::text)
  order by j.next_attempt_at
  limit ${BATCH("$2")}
  for update of j skip locked),
stale as (
  update playbook.ingestion_jobs t
  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  from due
  where t.organization_id = $1 and t.id = due.id and not due.live
  returning t.id),
claimed as (
  update playbook.ingestion_jobs j
  set state = 'running', attempts = j.attempts + 1, claim_token = gen_random_uuid(),
      next_attempt_at = clock_timestamp() + ${LEASE("$3")}, updated_at = clock_timestamp()
  from due
  where j.organization_id = $1 and j.id = due.id and due.live
  returning j.id, j.document_id, j.epoch, j.step, j.attempts, j.claim_token, j.artifact_key,
            j.page_count, j.chunk_count, j.chunks_done),
moved as (
  update playbook.documents d
  set state = 'processing', updated_at = clock_timestamp()
  from claimed
  where d.organization_id = $1 and d.id = claimed.document_id
    and d.state in ('uploaded', 'processing') and d.epoch = claimed.epoch
  returning d.id)
select c.id, c.document_id, c.epoch, c.step, c.attempts, c.claim_token, c.artifact_key, c.page_count,
  c.chunk_count, c.chunks_done, (select count(*) from stale)::int as cancelled,
  ((select count(*) from claimed) - (select count(*) from moved))::int as lost
from claimed c join moved m on m.id = c.document_id
union all
select null, null, null, null, null, null, null, null, null, null, (select count(*) from stale)::int,
  ((select count(*) from claimed) - (select count(*) from moved))::int
where not exists (select 1 from claimed c join moved m on m.id = c.document_id)
  and ((select count(*) from stale) > 0 or (select count(*) from claimed) > 0)`;
function claimedJobs(rows) {
  const jobs = rows.filter((row) => row.id !== null && row.document_id !== null);
  return { jobs, cancelled: rows[0]?.cancelled ?? 0, lost: rows[0]?.lost ?? 0 };
}
var INGESTION_JOB_HEARTBEAT = `update playbook.ingestion_jobs
set next_attempt_at = clock_timestamp() + ${LEASE("$4")}, updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
  and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = ingestion_jobs.document_id
              and x.state in ('uploaded', 'processing') and x.epoch = ingestion_jobs.epoch)
returning id`;
var INGESTION_JOB_ADVANCE = `update playbook.ingestion_jobs
set step = $4::text, artifact_key = coalesce($5::text, artifact_key), page_count = coalesce($6::int, page_count),
    chunk_count = coalesce($7::int, chunk_count), chunks_done = coalesce($8::int, chunks_done),
    next_attempt_at = clock_timestamp() + ${LEASE("$9")}, updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
  and array_position(${STEP_ORDER}, $4::text) >= array_position(${STEP_ORDER}, step)
  and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = ingestion_jobs.document_id
              and x.state in ('uploaded', 'processing') and x.epoch = ingestion_jobs.epoch)
returning id, step, chunks_done`;
var INGESTION_JOB_RETRY = `update playbook.ingestion_jobs
set state = 'queued', claim_token = null,
    next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), ${INGESTION_MAX_RETRY_DELAY_MS}) / 1000),
    updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
returning id, attempts`;
var INGESTION_JOB_COMPLETE = `with j as (
  update playbook.ingestion_jobs
  set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
    and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = ingestion_jobs.document_id
                and x.state = 'processing' and x.epoch = ingestion_jobs.epoch)
  returning document_id, epoch, page_count),
d as (
  update playbook.documents
  set state = 'ready', page_count = coalesce((select page_count from j), page_count), updated_at = clock_timestamp()
  where organization_id = $1 and id = (select document_id from j) and epoch = (select epoch from j)
    and state = 'processing')
select document_id from j`;
var INGESTION_JOB_FAIL = `with j as (
  update playbook.ingestion_jobs
  set state = 'failed', failure_reason = $4::text, claim_token = null,
      finished_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
    and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = ingestion_jobs.document_id
                and x.state in ('uploaded', 'processing') and x.epoch = ingestion_jobs.epoch)
  returning document_id, epoch, page_count),
d as (
  update playbook.documents
  set state = 'failed', failure_reason = $4::text, page_count = coalesce((select page_count from j), page_count),
      updated_at = clock_timestamp()
  where organization_id = $1 and id = (select document_id from j) and epoch = (select epoch from j)
    and state in ('uploaded', 'processing'))
select document_id from j`;
var INGESTION_JOB_GIVE_UP_SPENT = `with batch as (
  select id from playbook.ingestion_jobs
  where organization_id = $1 and state in ('queued', 'running')
    and attempts >= ${INGESTION_JOB_MAX_ATTEMPTS2} and next_attempt_at <= clock_timestamp()
  order by next_attempt_at
  limit ${BATCH("$2")}
  for update skip locked),
j as (
  update playbook.ingestion_jobs t
  set state = 'failed', failure_reason = 'processing_failed', claim_token = null,
      finished_at = clock_timestamp(), updated_at = clock_timestamp()
  from batch
  where t.organization_id = $1 and t.id = batch.id
  returning t.document_id, t.epoch),
d as (
  update playbook.documents
  set state = 'failed', failure_reason = 'processing_failed', updated_at = clock_timestamp()
  from j
  where documents.organization_id = $1 and documents.id = j.document_id and documents.epoch = j.epoch
    and documents.state in ('uploaded', 'processing'))
select document_id from j`;
var CONSUMED_CLAIM = `insert into playbook.consumed_message as m
  (consumer, organization_id, message_id, state, claim_token, lease_expires_at)
values ($1, $2, $3, 'claimed', $4::uuid, clock_timestamp() + ${LEASE("$5")})
on conflict (consumer, organization_id, message_id) do update set
  claim_token = excluded.claim_token,
  lease_expires_at = clock_timestamp() + ${LEASE("$5")}
where m.state = 'claimed' and m.lease_expires_at <= clock_timestamp()
returning claim_token`;
var CONSUMED_LOOKUP = `select state,
  case when state = 'claimed'
       then greatest(1, ceil(extract(epoch from lease_expires_at - clock_timestamp())))::int end as retry_after_seconds
from playbook.consumed_message
where consumer = $1 and organization_id = $2 and message_id = $3`;
var CONSUMED_RENEW = `update playbook.consumed_message
set lease_expires_at = clock_timestamp() + ${LEASE("$5")}
where consumer = $1 and organization_id = $2 and message_id = $3
  and claim_token = $4::uuid and state = 'claimed' and lease_expires_at > clock_timestamp()
returning claim_token`;
var CONSUMED_COMPLETE = `update playbook.consumed_message
set state = 'done', completed_at = clock_timestamp(), lease_expires_at = null
where consumer = $1 and organization_id = $2 and message_id = $3
  and claim_token = $4::uuid and state = 'claimed'
returning claim_token`;
var CONSUMED_RELEASE = `delete from playbook.consumed_message
where consumer = $1 and organization_id = $2 and message_id = $3
  and claim_token = $4::uuid and state = 'claimed'`;
var CONSUMED_PURGE = `with batch as (
  select consumer, message_id from playbook.consumed_message
  where organization_id = $1
    and ((state = 'done' and completed_at < $2::timestamptz)
         or (state = 'claimed' and lease_expires_at <= clock_timestamp()))
  limit ${BATCH("$3")}
  for update skip locked)
delete from playbook.consumed_message c
using batch b
where c.organization_id = $1 and c.consumer = b.consumer and c.message_id = b.message_id`;
var INDEX_SETTINGS_UPSERT = `insert into playbook.index_settings as s
  (organization_id, embedding_model, embedding_dimension)
values ($1, $2, $3::int)
on conflict (organization_id) do update set
  embedding_model = excluded.embedding_model, embedding_dimension = excluded.embedding_dimension,
  updated_at = clock_timestamp()
where s.vectors_written_at is null
   or (s.embedding_model = excluded.embedding_model and s.embedding_dimension = excluded.embedding_dimension)
returning embedding_model, embedding_dimension, vectors_written_at`;
var INDEX_VECTORS_MARK = `with m as (
  update playbook.index_settings
  set vectors_written_at = clock_timestamp(), updated_at = clock_timestamp()
  where organization_id = $1 and vectors_written_at is null
  returning embedding_model, embedding_dimension)
select embedding_model, embedding_dimension from m
union all
select embedding_model, embedding_dimension from playbook.index_settings
where organization_id = $1 and vectors_written_at is not null`;
var IDEMPOTENCY_BEGIN = `insert into playbook.idempotency_keys (organization_id, user_id, route, key, request_hash)
values ($1, $2, $3, $4, $5::bytea)
on conflict (organization_id, user_id, route, key) do nothing
returning key`;
var IDEMPOTENCY_LOOKUP = `select request_hash, status, response, created_at
from playbook.idempotency_keys
where organization_id = $1 and user_id = $2 and route = $3 and key = $4`;
var IDEMPOTENCY_COMPLETE = `update playbook.idempotency_keys
set status = $5::smallint, response = $6::jsonb
where organization_id = $1 and user_id = $2 and route = $3 and key = $4 and status is null
returning key`;
var IDEMPOTENCY_PURGE = `with batch as (
  select user_id, route, key from playbook.idempotency_keys
  where organization_id = $1
    and created_at < clock_timestamp() - make_interval(secs => greatest(coalesce($2::float8, 0), ${IDEMPOTENCY_MIN_PURGE_AGE_MS}) / 1000)
  order by created_at
  limit ${BATCH("$3")}
  for update skip locked)
delete from playbook.idempotency_keys k
using batch b
where k.organization_id = $1 and k.user_id = b.user_id and k.route = b.route and k.key = b.key`;
var CONSUMED_PURGE_AGE_MS = 15 * 24 * 60 * 60 * 1000;
var REMOVE_ALL_IDEMPOTENCY_ROUTE = "organizations.remove_all";
var DOCUMENT_ERASE_BATCH = `with t as (select clock_timestamp() as now),
cand as (
  select id, deletion_seq from playbook.documents
  where organization_id = $1 and restore_barred_at is null
  order by id
  limit ${BATCH("$2")}),
jl as (
  select id from playbook.ingestion_jobs
  where organization_id = $1 and state in ('queued', 'running') and document_id in (select id from cand)
  order by id
  for update),
j as (
  update playbook.ingestion_jobs
  set state = 'cancelled', claim_token = null, finished_at = (select now from t), updated_at = (select now from t),
      next_attempt_at = case when state = 'running' then next_attempt_at else (select now from t) end
  where organization_id = $1 and id in (select id from jl)
  returning id),
dl as (
  select id from playbook.documents
  where organization_id = $1 and id in (select id from cand) and restore_barred_at is null
    and (select count(*) from j) >= 0
  order by id
  for update),
d as (
  update playbook.documents x
  set state = 'deleted',
      epoch = case when x.state <> 'deleted' then x.epoch + 1 else x.epoch end,
      deletion_seq = case when x.state <> 'deleted' then x.deletion_seq + 1 else x.deletion_seq end,
      deleted_at = case when x.state <> 'deleted' then (select now from t) else x.deleted_at end,
      deleted_by = case when x.state <> 'deleted' then $3::text else x.deleted_by end,
      purge_due_at = least(coalesce(x.purge_due_at, (select now from t)), (select now from t)),
      restore_barred_at = (select now from t), failure_reason = null, updated_at = (select now from t)
  from cand
  where x.organization_id = $1 and x.id = cand.id and x.id in (select id from dl)
  returning x.id, x.epoch, x.deletion_seq, (x.deletion_seq <> cand.deletion_seq) as changed)
select id, epoch, deletion_seq, changed from d order by id`;
var ORGANIZATION_REMOVE_REST = `select playbook.remove_organization_rest($1::text, $2::text) as removed`;
var ORGANIZATION_REMOVAL_STATUS = `select
  not exists (select 1 from playbook.documents where organization_id = $1) as no_documents,
  not exists (select 1 from playbook.index_settings where organization_id = $1) as no_settings,
  not exists (select 1 from playbook.organization_usage where organization_id = $1) as no_usage,
  not exists (select 1 from playbook.consumed_message where organization_id = $1) as no_messages,
  not exists (select 1 from playbook.deals where organization_id = $1) as no_deals,
  not exists (select 1 from playbook.deal_imports where organization_id = $1) as no_imports,
  not exists (select 1 from playbook.rights_confirmations where organization_id = $1) as no_rights,
  not exists (select 1 from playbook.calls where organization_id = $1) as no_calls,
  (not exists (select 1 from playbook.documents where organization_id = $1)
    and not exists (select 1 from playbook.index_settings where organization_id = $1)
    and not exists (select 1 from playbook.organization_usage where organization_id = $1)
    and not exists (select 1 from playbook.consumed_message where organization_id = $1)
    and not exists (select 1 from playbook.deals where organization_id = $1)
    and not exists (select 1 from playbook.deal_imports where organization_id = $1)
    and not exists (select 1 from playbook.rights_confirmations where organization_id = $1)
    and not exists (select 1 from playbook.calls where organization_id = $1)) as removed
where $1::text = nullif(current_setting('app.organization_id', true), '')`;
var DOCUMENT_LIST_SPENT_PURGES = `select id, name, size_bytes, object_key, deletion_seq, vectors_removed_seq, deleted_at,
  purge_due_at, purge_started_at, purge_lease_until, purge_attempts, restore_barred_at
from playbook.documents
where organization_id = $1 and state = 'deleted' and purge_attempts >= ${DOCUMENT_PURGE_MAX_ATTEMPTS2}
  and id > $2::text
order by id
limit ${CLAMP("$3", DOCUMENT_LIST_MAX_PAGE)}`;
var DOCUMENT_PURGE_RESET = `update playbook.documents
set purge_attempts = 0, purge_started_at = null, purge_lease_until = null,
    restore_barred_at = coalesce(restore_barred_at, clock_timestamp()), updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and state = 'deleted' and purge_attempts >= ${DOCUMENT_PURGE_MAX_ATTEMPTS2}
returning id, purge_attempts`;
var ORGANIZATIONS_WITH_WORK = `select organization_id, resume_after from playbook.organizations_with_work($1::text, $2::text, ${BATCH("$3")})`;
var ORPHAN_SWEEP_DONE = `select swept_through, more from playbook.orphan_sweep_done($1::text, $2::timestamptz)`;
function discoveredOrganizations(rows) {
  const organizations = rows.flatMap((row) => row.organization_id === null ? [] : [row.organization_id]);
  return { organizations, resumeAfter: rows[0]?.resume_after ?? null };
}
var DEAL_COLUMNS = `id, deal_id, name, outcome, outcome_seq, closed_at, amount, currency, appeared_in_import, created_at, updated_at`;
var DEAL_LIST_COLUMNS = `${DEAL_COLUMNS}, created_at::text as cursor_at`;
var DEAL_ROW_FIELDS = [
  "id",
  "deal_id",
  "name",
  "outcome",
  "outcome_seq",
  "closed_at",
  "amount",
  "currency",
  "appeared_in_import",
  "created_at",
  "updated_at"
];
var DEAL_GET = `select ${DEAL_COLUMNS}
from playbook.deals
where organization_id = $1 and id = $2`;
var DEAL_BY_DEAL_ID = `select ${DEAL_COLUMNS}
from playbook.deals
where organization_id = $1 and deal_id = $2::text`;
var DEAL_LIST = `select ${DEAL_LIST_COLUMNS}
from playbook.deals
where organization_id = $1 and (created_at, id) < ($2::timestamptz, $3::text)
order by created_at desc, id desc
limit ${CLAMP("$4", DOCUMENT_LIST_MAX_PAGE)}`;
var DEAL_LIST_BY_OUTCOME = `select ${DEAL_LIST_COLUMNS}
from playbook.deals
where organization_id = $1 and outcome = $5::text and (created_at, id) < ($2::timestamptz, $3::text)
order by created_at desc, id desc
limit ${CLAMP("$4", DOCUMENT_LIST_MAX_PAGE)}`;
var DEAL_LIST_BY_IMPORT_FLAG = `select ${DEAL_LIST_COLUMNS}
from playbook.deals
where organization_id = $1 and appeared_in_import = $5::boolean and (created_at, id) < ($2::timestamptz, $3::text)
order by created_at desc, id desc
limit ${CLAMP("$4", DOCUMENT_LIST_MAX_PAGE)}`;
var DEAL_SET_OUTCOME = `with cur as (
  select * from playbook.deals where organization_id = $1 and id = $2 for update),
u as (
  update playbook.deals d
  set outcome = $3::text, closed_at = case when $5::boolean then $4::timestamptz else d.closed_at end,
      outcome_seq = d.outcome_seq + 1, updated_at = clock_timestamp()
  from cur
  where d.organization_id = $1 and d.id = cur.id
    and (d.outcome is distinct from $3::text or ($5::boolean and d.closed_at is distinct from $4::timestamptz))
  returning d.*)
select ${DEAL_COLUMNS}, true as changed from u
union all
select ${DEAL_COLUMNS}, false from cur where not exists (select 1 from u)`;
var DEAL_USAGE = `select deal_count
from playbook.organization_usage
where organization_id = $1`;
var DEAL_IMPORT_COLUMNS = `id, state, failure_reason,
  case when state = 'completed' then row_count end as row_count,
  case when state = 'completed' then applied_count end as applied_count,
  case when state = 'completed' then rejected_count end as rejected_count,
  uploaded_by, created_at, updated_at`;
var DEAL_IMPORT_INSERT = `insert into playbook.deal_imports (id, organization_id, uploaded_by, object_key, size_bytes, next_attempt_at)
values ($2::text, $1, $3::text, $4::text, $5::bigint, clock_timestamp())
returning ${DEAL_IMPORT_COLUMNS}`;
var DEAL_IMPORT_GET = `select ${DEAL_IMPORT_COLUMNS}
from playbook.deal_imports
where organization_id = $1 and id = $2 and erased_at is null`;
var DEAL_IMPORT_LIST = `select ${DEAL_IMPORT_COLUMNS}, created_at::text as cursor_at
from playbook.deal_imports
where organization_id = $1 and erased_at is null and (created_at, id) < ($2::timestamptz, $3::text)
order by created_at desc, id desc
limit ${CLAMP("$4", DOCUMENT_LIST_MAX_PAGE)}`;
var DEAL_IMPORT_CLAIM = `with due as (
  select id from playbook.deal_imports
  where organization_id = $1 and state in ('uploaded', 'processing') and erased_at is null
    and attempts < ${DEAL_IMPORT_MAX_ATTEMPTS2} and next_attempt_at <= clock_timestamp()
  order by next_attempt_at
  limit ${BATCH("$2")}
  for update skip locked)
update playbook.deal_imports i
set state = 'processing', attempts = i.attempts + 1, claim_token = gen_random_uuid(),
    next_attempt_at = clock_timestamp() + ${LEASE("$3")}, updated_at = clock_timestamp()
from due
where i.organization_id = $1 and i.id = due.id
returning i.id, i.object_key, i.size_bytes, i.attempts, i.claim_token,
  case when i.report_through > 1 then i.report_through end as last_row_number`;
var DEAL_IMPORT_HEARTBEAT = `update playbook.deal_imports
set next_attempt_at = clock_timestamp() + ${LEASE("$4")}, updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null
returning id`;
var DEAL_IMPORT_RETRY = `update playbook.deal_imports
set state = 'uploaded', claim_token = null,
    next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), ${INGESTION_MAX_RETRY_DELAY_MS}) / 1000),
    updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null
returning id, attempts`;
var DEAL_IMPORT_APPLY = `with imp as (
  select id, report_through, playbook.require_upload_lock($1) as lock_held from playbook.deal_imports
  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null
  for update),
raw as (
  select x.row_number, x.deal_id, x.reason, x.outcome, x.closed_at, x.amount, x.currency, x.name
  from imp, jsonb_to_recordset($4::jsonb) as x(row_number int, deal_id text, reason text, outcome text, closed_at timestamptz, amount numeric, currency text, name text)),
refuse as (
  select case
    when exists (select 1 from raw where row_number is null or row_number not between 2 and ${DEAL_IMPORT_MAX_ROWS2 + 1}) then 'row_number_range'
    when exists (select 1 from raw group by row_number having count(*) > 1) then 'row_number_repeated'
  end as why),
sent as (
  select raw.row_number, raw.deal_id, raw.reason, raw.outcome, raw.closed_at, raw.amount, raw.currency, raw.name,
    imp.report_through as base, dense_rank() over (order by raw.row_number) as rk
  from imp, raw
  where raw.row_number > imp.report_through and (select why from refuse) is null),
b as (
  select row_number, deal_id, reason, outcome, closed_at, amount, currency, name
  from sent where row_number = base + rk
  order by row_number
  limit ${CLAMP("$6", DEAL_IMPORT_APPLY_BATCH2)}),
lk as (
  select d.id, d.deal_id, d.outcome, d.outcome_seq, d.closed_at from playbook.deals d
  where d.organization_id = $1 and d.deal_id in (select deal_id from b where deal_id is not null)
  order by d.id
  for update),
ranked as (
  select b.*, row_number() over (partition by b.deal_id order by b.row_number) as nth from b),
seen as (
  select r.deal_id from playbook.deal_import_rows r
  where r.organization_id = $1 and r.import_id = $2 and r.reason is distinct from 'duplicate_in_file'
    and r.deal_id in (select deal_id from b)),
cls as (
  select k.*, d.id as deal_pk, d.outcome as cur_outcome, d.outcome_seq as cur_seq, d.closed_at as cur_closed_at,
    case
      when k.deal_id is not null and (k.nth > 1 or k.deal_id in (select deal_id from seen)) then 'duplicate_in_file'
      when k.reason is not null then k.reason
      when d.id is not null and d.outcome <> 'open' then 'outcome_already_decided'
    end as bad
  from ranked k left join lk d on d.deal_id = k.deal_id),
fin as (
  select c.*,
    case when c.bad is null and c.deal_pk is null
      and coalesce((select deal_count from playbook.organization_usage where organization_id = $1), 0)
        + count(*) filter (where c.bad is null and c.deal_pk is null) over (order by c.row_number) > $5::bigint
      then 'deal_limit_reached' else c.bad end as final_bad
  from cls c),
upd as (
  update playbook.deals d
  set outcome = f.outcome,
      outcome_seq = d.outcome_seq + (case when f.outcome <> d.outcome or coalesce(f.closed_at, d.closed_at) is distinct from d.closed_at then 1 else 0 end),
      closed_at = coalesce(f.closed_at, d.closed_at), amount = coalesce(f.amount, d.amount),
      currency = coalesce(f.currency, d.currency), name = coalesce(f.name, d.name),
      appeared_in_import = true, updated_at = clock_timestamp()
  from fin f
  where d.organization_id = $1 and d.id = f.deal_pk and f.final_bad is null and d.outcome = 'open'
  returning d.id, d.deal_id, d.outcome_seq, (d.outcome_seq <> f.cur_seq) as bumped),
ins as (
  insert into playbook.deals (id, organization_id, deal_id, name, outcome, closed_at, amount, currency, appeared_in_import)
  select 'deal_' || replace(gen_random_uuid()::text, '-', ''), $1, f.deal_id, f.name, f.outcome, f.closed_at, f.amount, f.currency, true
  from fin f where f.final_bad is null and f.deal_pk is null
  returning deal_id),
res as (
  select f.row_number, f.deal_id, f.final_bad as reason from fin f where f.final_bad is not null
  union all select f.row_number, f.deal_id, null from fin f join upd u on u.id = f.deal_pk where f.final_bad is null
  union all select f.row_number, f.deal_id, null from fin f join ins i on i.deal_id = f.deal_id where f.final_bad is null and f.deal_pk is null),
rep as (
  insert into playbook.deal_import_rows (organization_id, import_id, row_number, deal_id, result, reason)
  select $1, $2, res.row_number, res.deal_id, case when res.reason is null then 'applied' else 'rejected' end, res.reason
  from res
  returning result),
cnt as (
  update playbook.deal_imports
  set applied_count = applied_count + (select count(*) from rep where result = 'applied'),
      rejected_count = rejected_count + (select count(*) from rep where result = 'rejected'),
      report_through = report_through + (select count(*) from b),
      updated_at = clock_timestamp()
  where organization_id = $1 and id = $2 and exists (select 1 from imp)
  returning report_through)
select 'summary' as kind, null::text as deal_record_id, null::int as outcome_seq,
  (select count(*) from b)::int as taken,
  (select count(*) from rep where result = 'applied')::int as applied,
  (select count(*) from rep where result = 'rejected')::int as rejected,
  (select report_through from cnt) as through,
  (select why from refuse) as refusal
where exists (select 1 from imp)
union all
select 'outcome_changed', u.id, u.outcome_seq, null, null, null, null, null from upd u where u.bumped`;
var DEAL_IMPORT_FINISH = `update playbook.deal_imports
set state = 'completed', claim_token = null, row_count = applied_count + rejected_count,
    object_removed_at = clock_timestamp(), finished_at = clock_timestamp(), updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null
  and report_through = $4::int + 1
returning id, row_count, applied_count, rejected_count`;
var DEAL_IMPORT_FAIL = `update playbook.deal_imports
set state = 'failed', failure_reason = $4::text, claim_token = null,
    object_removed_at = clock_timestamp(), finished_at = clock_timestamp(), updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null
returning id`;
var DEAL_IMPORT_GIVE_UP_SPENT = `with batch as (
  select id from playbook.deal_imports
  where organization_id = $1 and state in ('uploaded', 'processing') and erased_at is null
    and attempts >= ${DEAL_IMPORT_MAX_ATTEMPTS2} and next_attempt_at <= clock_timestamp()
  order by next_attempt_at
  limit ${BATCH("$2")}
  for update skip locked)
update playbook.deal_imports t
set state = 'failed', failure_reason = 'processing_failed', claim_token = null,
    finished_at = clock_timestamp(), updated_at = clock_timestamp()
from batch
where t.organization_id = $1 and t.id = batch.id
returning t.id, t.object_key`;
var DEAL_IMPORT_OBJECT_REMOVED = `update playbook.deal_imports
set object_removed_at = coalesce(object_removed_at, clock_timestamp()), updated_at = clock_timestamp()
where organization_id = $1 and id = $2 and (erased_at is not null or state = 'failed')
returning id`;
var DEAL_IMPORT_ROWS_LIST = `select row_number, deal_id, result, reason
from playbook.deal_import_rows
where organization_id = $1 and import_id = $2 and row_number > $3::int
order by row_number
limit ${CLAMP("$4", DOCUMENT_LIST_MAX_PAGE)}`;
var DEAL_IMPORT_ROWS_LIST_BY_RESULT = `select row_number, deal_id, result, reason
from playbook.deal_import_rows
where organization_id = $1 and import_id = $2 and result = $5::text and row_number > $3::int
order by row_number
limit ${CLAMP("$4", DOCUMENT_LIST_MAX_PAGE)}`;
var DEAL_IMPORT_ERASE_BATCH = `with batch as (
  select id from playbook.deal_imports
  where organization_id = $1 and erased_at is null
  order by id
  limit ${BATCH("$2")}
  for update)
update playbook.deal_imports i
set state = case when i.state in ('uploaded', 'processing') then 'failed' else i.state end,
    failure_reason = case when i.state in ('uploaded', 'processing') then 'processing_failed' else i.failure_reason end,
    finished_at = coalesce(i.finished_at, clock_timestamp()), claim_token = null,
    erased_at = clock_timestamp(), updated_at = clock_timestamp()
from batch
where i.organization_id = $1 and i.id = batch.id
returning i.id, i.object_key, (i.object_removed_at is null) as object_pending`;
var DEAL_IMPORT_PURGE_BATCH = `with imp as (
  select id from playbook.deal_imports
  where organization_id = $1 and id = $2 and erased_at is not null and object_removed_at is not null
  for update),
pick as (
  select r.row_number from playbook.deal_import_rows r, imp
  where r.organization_id = $1 and r.import_id = $2
  order by r.row_number
  limit ${BATCH("$3")}),
del as (
  delete from playbook.deal_import_rows r
  using pick
  where r.organization_id = $1 and r.import_id = $2 and r.row_number = pick.row_number
  returning 1),
gone as (
  delete from playbook.deal_imports i
  using imp
  where i.organization_id = $1 and i.id = imp.id
    and not exists (select 1 from playbook.deal_import_rows x where x.organization_id = $1 and x.import_id = $2)
  returning 1)
select (select count(*) from del)::int as deleted_rows, exists (select 1 from gone) as import_deleted
where exists (select 1 from imp)`;
var DEAL_ERASE_BATCH = `select playbook.erase_deals($1::text, $2::int) as deleted`;
var RIGHTS_GET = `select confirmed_by, confirmed_at, wording_version
from playbook.rights_confirmations
where organization_id = $1`;
var RIGHTS_CONFIRM = `with up as (
  insert into playbook.rights_confirmations as r (organization_id, confirmed_by, confirmed_at, wording_version)
  values ($1, $2::text, clock_timestamp(), $3::int)
  on conflict (organization_id) do update
    set confirmed_by = excluded.confirmed_by, confirmed_at = excluded.confirmed_at, wording_version = excluded.wording_version
    where r.wording_version < excluded.wording_version
  returning confirmed_by, confirmed_at, wording_version)
select confirmed_by, confirmed_at, wording_version, true as recorded from up
union all
select confirmed_by, confirmed_at, wording_version, false
from playbook.rights_confirmations
where organization_id = $1 and not exists (select 1 from up)`;
var PLAYBOOK_STATEMENTS = {
  QUOTA_LOCK,
  QUOTA_USAGE,
  DOCUMENT_INSERT,
  DOCUMENT_BY_HASH,
  DOCUMENT_GET,
  DOCUMENT_LIST,
  DOCUMENT_LIST_DELETED,
  DOCUMENT_SOFT_DELETE,
  DOCUMENT_RESTORE,
  DOCUMENT_RESTORE_FOR_UPLOAD,
  DOCUMENT_REQUEUE,
  DOCUMENT_LIST_PENDING_CLEANUP,
  DOCUMENT_CLEANUP_BEGIN,
  DOCUMENT_CLEANUP_DONE,
  DOCUMENT_PURGE_CLAIM,
  DOCUMENT_PURGE_COMPLETE,
  INGESTION_JOB_CLAIM,
  INGESTION_JOB_HEARTBEAT,
  INGESTION_JOB_ADVANCE,
  INGESTION_JOB_RETRY,
  INGESTION_JOB_COMPLETE,
  INGESTION_JOB_FAIL,
  INGESTION_JOB_GIVE_UP_SPENT,
  CONSUMED_CLAIM,
  CONSUMED_LOOKUP,
  CONSUMED_RENEW,
  CONSUMED_COMPLETE,
  CONSUMED_RELEASE,
  CONSUMED_PURGE,
  INDEX_SETTINGS_UPSERT,
  INDEX_VECTORS_MARK,
  IDEMPOTENCY_BEGIN,
  IDEMPOTENCY_LOOKUP,
  IDEMPOTENCY_COMPLETE,
  IDEMPOTENCY_PURGE,
  DOCUMENT_ERASE_BATCH,
  ORGANIZATION_REMOVE_REST,
  ORGANIZATION_REMOVAL_STATUS,
  DOCUMENT_LIST_SPENT_PURGES,
  DOCUMENT_PURGE_RESET,
  ORPHAN_SWEEP_DONE,
  DEAL_GET,
  DEAL_BY_DEAL_ID,
  DEAL_LIST,
  DEAL_LIST_BY_OUTCOME,
  DEAL_LIST_BY_IMPORT_FLAG,
  DEAL_SET_OUTCOME,
  DEAL_USAGE,
  DEAL_IMPORT_INSERT,
  DEAL_IMPORT_GET,
  DEAL_IMPORT_LIST,
  DEAL_IMPORT_CLAIM,
  DEAL_IMPORT_HEARTBEAT,
  DEAL_IMPORT_RETRY,
  DEAL_IMPORT_APPLY,
  DEAL_IMPORT_FINISH,
  DEAL_IMPORT_FAIL,
  DEAL_IMPORT_GIVE_UP_SPENT,
  DEAL_IMPORT_OBJECT_REMOVED,
  DEAL_IMPORT_ROWS_LIST,
  DEAL_IMPORT_ROWS_LIST_BY_RESULT,
  DEAL_IMPORT_ERASE_BATCH,
  DEAL_IMPORT_PURGE_BATCH,
  DEAL_ERASE_BATCH,
  RIGHTS_GET,
  RIGHTS_CONFIRM,
  ORGANIZATIONS_WITH_WORK,
  ...CALL_STATEMENTS
};

// src/index.ts
var PACKAGE = "tula-closeline-db";
export {
  ABANDON_CLAIM,
  ABANDON_GIVE_UP_SPENT,
  ABANDON_LEARN,
  ABANDON_MIN_GRACE_MS,
  ABANDON_PURGE_BATCH,
  ABANDON_RECORD,
  ABANDON_RESOLVE,
  ABANDON_SETTLE,
  AUTH_STATEMENTS,
  CALL_CHANNELS2 as CALL_CHANNELS,
  CALL_CLEANUP_BEGIN,
  CALL_CLEANUP_DONE,
  CALL_ERASE_BATCH,
  CALL_FAILURE_REASONS2 as CALL_FAILURE_REASONS,
  CALL_GET,
  CALL_INSERT,
  CALL_JOB_CLAIM,
  CALL_JOB_COMPLETE,
  CALL_JOB_FAIL,
  CALL_JOB_GIVE_UP_SPENT,
  CALL_JOB_HEARTBEAT,
  CALL_JOB_KINDS2 as CALL_JOB_KINDS,
  CALL_JOB_MAX_ATTEMPTS2 as CALL_JOB_MAX_ATTEMPTS,
  CALL_JOB_RECORD,
  CALL_JOB_RETRY,
  CALL_JOB_STATES2 as CALL_JOB_STATES,
  CALL_JOB_TRANSCRIBED,
  CALL_KINDS2 as CALL_KINDS,
  CALL_LIST,
  CALL_LIST_BY_DEAL,
  CALL_LIST_BY_STATE,
  CALL_LIST_PENDING_CLEANUP,
  CALL_LIST_SPENT_PURGES,
  CALL_MAX_RECORDING_BYTES2 as CALL_MAX_RECORDING_BYTES,
  CALL_MAX_RECORDING_SECONDS2 as CALL_MAX_RECORDING_SECONDS,
  CALL_MAX_SEQ2 as CALL_MAX_SEQ,
  CALL_MAX_SPEAKERS2 as CALL_MAX_SPEAKERS,
  CALL_MAX_TRANSCRIPT_BYTES2 as CALL_MAX_TRANSCRIPT_BYTES,
  CALL_MEDIA_TYPES2 as CALL_MEDIA_TYPES,
  CALL_PENDING_CLEANUP_PREDICATE2 as CALL_PENDING_CLEANUP_PREDICATE,
  CALL_PURGE_CLAIM,
  CALL_PURGE_COMPLETE,
  CALL_PURGE_MAX_ATTEMPTS2 as CALL_PURGE_MAX_ATTEMPTS,
  CALL_PURGE_RESET,
  CALL_REP_BY2 as CALL_REP_BY,
  CALL_REQUEUE,
  CALL_RESTORE,
  CALL_RESTORE_FOR_UPLOAD,
  CALL_RETAGGED,
  CALL_ROW_FIELDS,
  CALL_SENT_TO_VENDOR,
  CALL_SET_REP,
  CALL_SOFT_DELETE,
  CALL_SPEAKER_LABEL_MAX_BYTES2 as CALL_SPEAKER_LABEL_MAX_BYTES,
  CALL_SPEAKER_LABEL_MAX_LENGTH2 as CALL_SPEAKER_LABEL_MAX_LENGTH,
  CALL_STATEMENTS,
  CALL_STATES2 as CALL_STATES,
  CALL_USAGE,
  CALL_VENDOR_REMOVED,
  CONSUMED_CLAIM,
  CONSUMED_COMPLETE,
  CONSUMED_LOOKUP,
  CONSUMED_PURGE,
  CONSUMED_PURGE_AGE_MS,
  CONSUMED_RELEASE,
  CONSUMED_RENEW,
  CONTROL_PLANE_TABLES,
  CONTROL_PLANE_TABLE_REASONS,
  COUNTER_MIN_PERIOD_MS,
  COUNTER_PURGE_BATCH,
  DEAL_BY_DEAL_ID,
  DEAL_ERASE_BATCH,
  DEAL_GET,
  DEAL_ID_MAX_BYTES2 as DEAL_ID_MAX_BYTES,
  DEAL_ID_MAX_LENGTH2 as DEAL_ID_MAX_LENGTH,
  DEAL_IMPORT_APPLY,
  DEAL_IMPORT_APPLY_BATCH2 as DEAL_IMPORT_APPLY_BATCH,
  DEAL_IMPORT_CLAIM,
  DEAL_IMPORT_ERASE_BATCH,
  DEAL_IMPORT_FAIL,
  DEAL_IMPORT_FAILURE_REASONS2 as DEAL_IMPORT_FAILURE_REASONS,
  DEAL_IMPORT_FINISH,
  DEAL_IMPORT_GET,
  DEAL_IMPORT_GIVE_UP_SPENT,
  DEAL_IMPORT_HEARTBEAT,
  DEAL_IMPORT_INSERT,
  DEAL_IMPORT_LIST,
  DEAL_IMPORT_MAX_ATTEMPTS2 as DEAL_IMPORT_MAX_ATTEMPTS,
  DEAL_IMPORT_MAX_BYTES2 as DEAL_IMPORT_MAX_BYTES,
  DEAL_IMPORT_MAX_ROWS2 as DEAL_IMPORT_MAX_ROWS,
  DEAL_IMPORT_OBJECT_REMOVED,
  DEAL_IMPORT_PURGE_BATCH,
  DEAL_IMPORT_RETRY,
  DEAL_IMPORT_ROWS_LIST,
  DEAL_IMPORT_ROWS_LIST_BY_RESULT,
  DEAL_IMPORT_ROW_REASONS2 as DEAL_IMPORT_ROW_REASONS,
  DEAL_IMPORT_ROW_RESULTS2 as DEAL_IMPORT_ROW_RESULTS,
  DEAL_IMPORT_STATES2 as DEAL_IMPORT_STATES,
  DEAL_LIST,
  DEAL_LIST_BY_IMPORT_FLAG,
  DEAL_LIST_BY_OUTCOME,
  DEAL_LIST_PENDING_RETAG,
  DEAL_MAX_SEQ2 as DEAL_MAX_SEQ,
  DEAL_NAME_MAX_BYTES2 as DEAL_NAME_MAX_BYTES,
  DEAL_NAME_MAX_LENGTH2 as DEAL_NAME_MAX_LENGTH,
  DEAL_OUTCOMES2 as DEAL_OUTCOMES,
  DEAL_RETAG_BATCH,
  DEAL_RETAG_DONE,
  DEAL_RETAG_LOCK,
  DEAL_ROW_FIELDS,
  DEAL_SET_OUTCOME,
  DEAL_USAGE,
  DEFAULT_POOL_OPTIONS,
  DOCUMENT_BY_HASH,
  DOCUMENT_CLEANUP_BEGIN,
  DOCUMENT_CLEANUP_DONE,
  DOCUMENT_ERASE_BATCH,
  DOCUMENT_GET,
  DOCUMENT_INSERT,
  DOCUMENT_LIST,
  DOCUMENT_LIST_DELETED,
  DOCUMENT_LIST_FILTERED,
  DOCUMENT_LIST_MAX_PAGE,
  DOCUMENT_LIST_PENDING_CLEANUP,
  DOCUMENT_LIST_SPENT_PURGES,
  DOCUMENT_MIN_RETENTION_MS,
  DOCUMENT_PURGE_CLAIM,
  DOCUMENT_PURGE_COMPLETE,
  DOCUMENT_PURGE_RESET,
  DOCUMENT_REQUEUE,
  DOCUMENT_RESTORE,
  DOCUMENT_RESTORE_FOR_UPLOAD,
  DOCUMENT_ROW_FIELDS,
  DOCUMENT_SOFT_DELETE,
  ENVIRONMENT_POLICY_EXPRESSION,
  ENVIRONMENT_SCOPED_TABLES,
  ENVIRONMENT_SETTING,
  IDEMPOTENCY_BEGIN,
  IDEMPOTENCY_COMPLETE,
  IDEMPOTENCY_LOOKUP,
  IDEMPOTENCY_MIN_PURGE_AGE_MS,
  IDEMPOTENCY_PURGE,
  IDEMPOTENCY_PURGE_AGE_MS,
  INDEX_SETTINGS_UPSERT,
  INDEX_VECTORS_MARK,
  INGESTION_JOB_ADVANCE,
  INGESTION_JOB_CLAIM,
  INGESTION_JOB_COMPLETE,
  INGESTION_JOB_FAIL,
  INGESTION_JOB_GIVE_UP_SPENT,
  INGESTION_JOB_HEARTBEAT,
  INGESTION_JOB_RETRY,
  INGESTION_MAX_RETRY_DELAY_MS,
  LOCKOUT_ATTEMPT,
  LOCKOUT_CLEAR,
  LOCKOUT_MIN_RETRY_AFTER_MS,
  LOCKOUT_RETRY_AFTER,
  NON_TENANT_TABLES,
  NON_TENANT_TABLE_REASONS,
  ORGANIZATIONS_WITH_WORK,
  ORGANIZATION_REMOVAL_STATUS,
  ORGANIZATION_REMOVE_REST,
  ORGANIZATION_SETTING,
  ORPHAN_SWEEP_AGE_MS,
  ORPHAN_SWEEP_DONE,
  OWNER_ROLE,
  PACKAGE,
  PENDING_CLEANUP_PREDICATE2 as PENDING_CLEANUP_PREDICATE,
  PLAYBOOK_MAX_BATCH,
  PLAYBOOK_MIN_LEASE_MS,
  PLAYBOOK_STATEMENTS,
  QUOTA_LOCK,
  QUOTA_USAGE,
  RATE_HIT,
  REMOVE_ALL_IDEMPOTENCY_ROUTE,
  RIGHTS_CONFIRM,
  RIGHTS_GET,
  RIGHTS_MAX_WORDING_VERSION2 as RIGHTS_MAX_WORDING_VERSION,
  TENANT_SCHEMAS,
  WORK_KINDS2 as WORK_KINDS,
  assertTenantIsolation,
  callReuploadRequeues2 as callReuploadRequeues,
  claimedCallJobs,
  claimedJobs,
  createDb,
  discoveredOrganizations,
  findTenantIsolationGaps,
  invitationForToken,
  organizationOfUser,
  repChangeAllowed2 as repChangeAllowed,
  reportConnectionError,
  tenantRlsStatements,
  withEnvironment,
  withOrganization
};
