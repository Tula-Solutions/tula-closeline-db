import { sql } from 'drizzle-orm'
import type { Database, Transaction } from './client'

/** The transaction-local Postgres setting every row-level-security policy compares against. */
export const ORGANIZATION_SETTING = 'app.organization_id'

const ORGANIZATION_ID = /^org_[0-9a-f]{32}$/
const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/

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
export async function withOrganization<T>(
  db: Database,
  organizationId: string,
  fn: (tx: Transaction) => Promise<T>
): Promise<T> {
  if (!ORGANIZATION_ID.test(organizationId)) {
    throw new Error('withOrganization: invalid organization id')
  }
  return db.transaction(async (tx) => {
    // `set_config` takes bound parameters, unlike `SET LOCAL`. The value is never in the SQL text.
    await tx.execute(sql`select set_config(${ORGANIZATION_SETTING}, ${organizationId}, true)`)
    return fn(tx)
  })
}

/**
 * The policy expression of {@link tenantRlsStatements} as Postgres stores and prints it in
 * `pg_policies` (parenthesised, with `::text` casts). The tenant isolation check compares policies
 * against this text, and an integration test pins it against the real server, so a Postgres
 * version that deparses differently fails loudly instead of passing or failing every table.
 */
export const TENANT_POLICY_EXPRESSION = `(organization_id = NULLIF(current_setting('${ORGANIZATION_SETTING}'::text, true), ''::text))`

function quote(identifier: string): string {
  if (!IDENTIFIER.test(identifier)) {
    throw new Error(`tenantRlsStatements: unsafe identifier ${JSON.stringify(identifier)}`)
  }
  return `"${identifier}"`
}

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
export function tenantRlsStatements(schemaName: string, tableName: string): string[] {
  const table = `${quote(schemaName)}.${quote(tableName)}`
  const policy = quote(`${tableName}_tenant_isolation`)
  // current_setting(..., true) is NULL when never set and '' after a transaction that set it has
  // ended on the same connection. NULLIF maps both to NULL, and `x = NULL` is never true.
  const current = `NULLIF(current_setting('${ORGANIZATION_SETTING}', true), '')`
  return [
    `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`,
    `CREATE POLICY ${policy} ON ${table} AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = ${current}) WITH CHECK ("organization_id" = ${current});`,
  ]
}
