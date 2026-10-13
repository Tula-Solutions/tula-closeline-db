import {
  exports_schema
} from "./shared/chunk-5vjswvjg.js";

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
  const onError = options.onError ?? reportConnectionError;
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
// src/isolation.ts
import { sql as sql2 } from "drizzle-orm";

// src/tenant.ts
import { sql } from "drizzle-orm";
var ORGANIZATION_SETTING = "app.organization_id";
var ORGANIZATION_ID = /^org_[0-9a-f]{32}$/;
var IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;
async function withOrganization(db, organizationId, fn) {
  if (!ORGANIZATION_ID.test(organizationId)) {
    throw new Error("withOrganization: invalid organization id");
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config(${ORGANIZATION_SETTING}, ${organizationId}, true)`);
    return fn(tx);
  });
}
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
var NON_TENANT_TABLES = [];
var REFERENCES_SETTING = `'${ORGANIZATION_SETTING}'`;
async function findTenantIsolationGaps(db, allowlist = NON_TENANT_TABLES) {
  const schemas = sql2.join(TENANT_SCHEMAS.map((name) => sql2`${name}`), sql2`, `);
  const result = await db.execute(sql2`
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
     order by n.nspname, c.relname`);
  const gaps = [];
  for (const row of result.rows) {
    if (allowlist.includes(`${row.schema}.${row.table}`)) {
      continue;
    }
    const reason = gapReason(row);
    if (reason) {
      gaps.push({ schema: row.schema, table: row.table, reason });
    }
  }
  return gaps;
}
function gapReason(row) {
  if (row.kind !== "r" && row.kind !== "p") {
    return "is not a table, so it bypasses row-level security";
  }
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
    return `has a permissive policy that does not cover all commands with ${ORGANIZATION_SETTING} in USING and WITH CHECK`;
  }
  return;
}
async function assertTenantIsolation(db, allowlist = NON_TENANT_TABLES) {
  const gaps = await findTenantIsolationGaps(db, allowlist);
  if (gaps.length > 0) {
    const lines = gaps.map((gap) => `  ${gap.schema}.${gap.table} ${gap.reason}`);
    throw new Error(`tenant isolation: ${gaps.length} table(s) are not fail-closed
${lines.join(`
`)}`);
  }
}
// src/roles.ts
var OWNER_ROLE = "closeline_owner";

// src/index.ts
var PACKAGE = "tula-closeline-db";
export {
  DEFAULT_POOL_OPTIONS,
  NON_TENANT_TABLES,
  ORGANIZATION_SETTING,
  OWNER_ROLE,
  PACKAGE,
  TENANT_SCHEMAS,
  assertTenantIsolation,
  createDb,
  findTenantIsolationGaps,
  reportConnectionError,
  tenantRlsStatements,
  withOrganization
};
