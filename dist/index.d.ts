import { NodePgDatabase } from "drizzle-orm/node-postgres";
declare namespace exports_schema {
	export { authSchema, coreSchema, playbookSchema };
}
import { PgSchema as PgSchema_mtt0uw } from "drizzle-orm/pg-core";
/** The `auth` Postgres schema, owned by the auth service (login role `closeline_auth`). */
declare const authSchema: PgSchema_mtt0uw<"auth">;
import { PgSchema as PgSchema_mtt0uw2 } from "drizzle-orm/pg-core";
/** The `core` Postgres schema, owned by the core service (login role `closeline_core`). */
declare const coreSchema: PgSchema_mtt0uw2<"core">;
import { PgSchema as PgSchema_mtt0uw3 } from "drizzle-orm/pg-core";
/** The `playbook` Postgres schema, owned by the playbook service (login role `closeline_playbook`). */
declare const playbookSchema: PgSchema_mtt0uw3<"playbook">;
/** The Drizzle schema object: every Postgres schema the services own. */
type Schema = typeof exports_schema;
/** A Drizzle database over a node-postgres pool. */
type Database = NodePgDatabase<Schema>;
/** The handle `withOrganization` passes to its callback: a transaction on one pooled connection. */
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Pool settings for {@link createDb}; every field has a bounded default. */
interface DbOptions {
	/** Most connections the pool opens, 1 to 100. */
	max?: number;
	/** Longest a single statement may run before Postgres cancels it, in milliseconds. */
	statementTimeoutMs?: number;
	/** Longest to wait for a connection (new or from the pool) before failing, in milliseconds. */
	connectionTimeoutMs?: number;
	/** Longest `close` waits for in-flight work before giving up, in milliseconds. */
	closeTimeoutMs?: number;
	/**
	* Called with an error on any pooled connection, idle or checked out (a server restart, a
	* failover, an idle-in-transaction timeout). Without a listener such an error would crash the
	* process. The default writes one line to stderr with the error code or name, never the message.
	* If it throws, the exception is swallowed and that same line is written instead.
	*/
	onError?: (error: Error) => void;
}
/** The defaults {@link createDb} uses for any option left out. */
declare const DEFAULT_POOL_OPTIONS: {
	readonly max: 10;
	readonly statementTimeoutMs: 30000;
	readonly connectionTimeoutMs: 5000;
	readonly closeTimeoutMs: 10000;
};
/**
* The default `onError`: one line on stderr naming only the error code (or, without one, its
* name). The message is left out because a driver message can carry connection details.
*/
declare function reportConnectionError(error: Error): void;
/** A database handle plus the function that releases its connections. */
interface DbHandle {
	/** The Drizzle database. Reach tenant tables only through `withOrganization`. */
	db: Database;
	/**
	* Waits for in-flight queries, then closes every pooled connection. Safe to call more than
	* once. Rejects if work is still in flight after `closeTimeoutMs`, after asking the remaining
	* connections to end, so a hung transaction cannot hold shutdown.
	*/
	close: () => Promise<void>;
}
/**
* Connect to Postgres with a bounded node-postgres pool, a statement timeout and a connection
* timeout. Connect as a service role (for example `closeline_core`), never as the owner.
*
* @param connectionString - Postgres connection string of the service's own login role.
* @param options - Pool size and timeouts; see {@link DEFAULT_POOL_OPTIONS}.
* @returns The Drizzle database and a `close` function for graceful shutdown.
* @throws If the connection string is empty or an option is out of bounds.
*/
declare function createDb(connectionString: string, options?: DbOptions): DbHandle;
/**
* The Postgres schemas owned by services; every relation in them must be tenant-isolated. A
* relation in any other schema (bar `public` and drizzle's own) is itself a gap, and a unit test
* keeps this list equal to the schemas exported from `src/schema`.
*/
declare const TENANT_SCHEMAS: readonly ["auth", "core", "playbook"];
/**
* Tables that deliberately have no `organization_id` and no row-level security, as
* `schema.table`. Empty today: add an entry only with a decision record that says why the table
* holds no tenant data.
*/
declare const NON_TENANT_TABLES: readonly string[];
/**
* One thing that does not fail closed on `organization_id`, and why. A login role that bypasses
* row-level security is reported with `schema` set to `pg_roles` and `table` set to the role name.
*/
interface TenantIsolationGap {
	/** The Postgres schema. */
	schema: string;
	/** The table (or view) name. */
	table: string;
	/** What is missing, in one sentence. */
	reason: string;
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
declare function findTenantIsolationGaps(db: Pick<Database, "execute">, allowlist?: readonly string[], extensionSchemas?: readonly string[]): Promise<TenantIsolationGap[]>;
/**
* Throw unless {@link findTenantIsolationGaps} finds nothing: every table fail-closed, no role bypassing it.
*
* @param db - A database handle; see {@link findTenantIsolationGaps}.
* @param allowlist - `schema.table` names exempt from the check.
* @throws An error naming each offending table or role and why.
*/
declare function assertTenantIsolation(db: Pick<Database, "execute">, allowlist?: readonly string[]): Promise<void>;
/** The one database role that owns every schema and table and runs every migration. */
declare const OWNER_ROLE = "closeline_owner";
/** The transaction-local Postgres setting every row-level-security policy compares against. */
declare const ORGANIZATION_SETTING = "app.organization_id";
/**
* Run `fn` in a transaction scoped to one Organization.
*
* Sets `app.organization_id` for this transaction only (`set_config(..., true)`), so every
* query on the handle sees and writes only that Organization's rows. The setting ends with the
* transaction, so it cannot leak to the next user of the pooled connection. Pass the root
* database from `createDb`, not a transaction, and run every tenant query on the handle `fn`
* receives: a query on `db` itself runs outside the transaction and sees no tenant rows.
*
* @param db - The database from `createDb`.
* @param organizationId - The Organization id: `org_` and 32 lowercase hex characters.
* @param fn - Work to run inside the scoped transaction.
* @returns Whatever `fn` returns.
* @throws If `organizationId` is malformed (before any query runs), or whatever `fn` throws
*   (the transaction rolls back).
*/
declare function withOrganization<T>(db: Database, organizationId: string, fn: (tx: Transaction) => Promise<T>): Promise<T>;
/**
* The SQL statements that make a tenant table fail closed, for use in a migration.
*
* Enables and forces row-level security (without FORCE the table owner bypasses the policy) and
* creates the one policy: a row is visible and writable only when its `organization_id` equals
* `app.organization_id`. An absent or empty setting matches nothing, so no row is visible and no
* row can be written. The table must have a not-null `organization_id text` column.
*
* @param schemaName - The Postgres schema of the table, such as `core`.
* @param tableName - The table name.
* @returns The statements, in the order to run them.
* @throws If a name is not a plain lowercase identifier.
*/
declare function tenantRlsStatements(schemaName: string, tableName: string): string[];
/** This library's package name, so a consumer can report which shared libraries it resolved. */
declare const PACKAGE = "tula-closeline-db";
export { DEFAULT_POOL_OPTIONS, Database, DbHandle, DbOptions, NON_TENANT_TABLES, ORGANIZATION_SETTING, OWNER_ROLE, PACKAGE, Schema, TENANT_SCHEMAS, TenantIsolationGap, Transaction, assertTenantIsolation, createDb, findTenantIsolationGaps, reportConnectionError, tenantRlsStatements, withOrganization };
