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
	/** Called with an error from an idle pooled connection, which would otherwise crash the process. */
	onError?: (error: Error) => void;
}
/** The defaults {@link createDb} uses for any option left out. */
declare const DEFAULT_POOL_OPTIONS: {
	readonly max: 10;
	readonly statementTimeoutMs: 30000;
	readonly connectionTimeoutMs: 5000;
};
/** A database handle plus the function that releases its connections. */
interface DbHandle {
	/** The Drizzle database. Reach tenant tables only through `withOrganization`. */
	db: Database;
	/** Waits for in-flight queries, then closes every pooled connection. */
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
export { DEFAULT_POOL_OPTIONS, Database, DbHandle, DbOptions, ORGANIZATION_SETTING, PACKAGE, Schema, Transaction, createDb, tenantRlsStatements, withOrganization };
