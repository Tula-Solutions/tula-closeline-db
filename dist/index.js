import {
  TENANT_SETTING,
  ABANDON_CASE_MAX_ATTEMPTS2,
  DOCUMENT_PURGE_MAX_ATTEMPTS2,
  INGESTION_STEPS2,
  INGESTION_JOB_MAX_ATTEMPTS2,
  WORK_KINDS2,
  exports_schema
} from "./shared/chunk-2f7ttmtz.js";

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
// src/playbook-statements.ts
var DOCUMENT_MIN_RETENTION_MS = 3600000;
var PLAYBOOK_MIN_LEASE_MS = 1000;
var INGESTION_MAX_RETRY_DELAY_MS = 3600000;
var DOCUMENT_LIST_MAX_PAGE = 100;
var PLAYBOOK_MAX_BATCH = 500;
var IDEMPOTENCY_MIN_PURGE_AGE_MS = 3600000;
var CLAMP = (parameter, max) => `least(greatest(coalesce(${parameter}::int, 1), 1), ${max})`;
var BATCH = (parameter) => CLAMP(parameter, PLAYBOOK_MAX_BATCH);
var LEASE = (parameter) => `make_interval(secs => greatest(coalesce(${parameter}::float8, 0), ${PLAYBOOK_MIN_LEASE_MS}) / 1000)`;
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
var RESTORE = (dueGuard) => `with j as (
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
var DOCUMENT_RESTORE = RESTORE(`
    and purge_due_at > clock_timestamp()`);
var DOCUMENT_RESTORE_FOR_UPLOAD = RESTORE("");
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
var IDEMPOTENCY_PURGE_AGE_MS = 24 * 60 * 60 * 1000;
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
  (not exists (select 1 from playbook.documents where organization_id = $1)
    and not exists (select 1 from playbook.index_settings where organization_id = $1)
    and not exists (select 1 from playbook.organization_usage where organization_id = $1)
    and not exists (select 1 from playbook.consumed_message where organization_id = $1)) as removed
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
function discoveredOrganizations(rows) {
  const organizations = rows.flatMap((row) => row.organization_id === null ? [] : [row.organization_id]);
  return { organizations, resumeAfter: rows[0]?.resume_after ?? null };
}
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
  ORGANIZATIONS_WITH_WORK
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
  OWNER_ROLE,
  PACKAGE,
  PLAYBOOK_MAX_BATCH,
  PLAYBOOK_MIN_LEASE_MS,
  PLAYBOOK_STATEMENTS,
  QUOTA_LOCK,
  QUOTA_USAGE,
  RATE_HIT,
  REMOVE_ALL_IDEMPOTENCY_ROUTE,
  TENANT_SCHEMAS,
  WORK_KINDS2 as WORK_KINDS,
  assertTenantIsolation,
  claimedJobs,
  createDb,
  discoveredOrganizations,
  findTenantIsolationGaps,
  invitationForToken,
  organizationOfUser,
  reportConnectionError,
  tenantRlsStatements,
  withEnvironment,
  withOrganization
};
