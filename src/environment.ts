import { sql } from 'drizzle-orm'
import type { Database, Transaction } from './client'
import { TENANT_SETTING } from './schema/auth/tenant-columns'

/**
 * The transaction-local setting the `auth` schema's row-level-security policies compare
 * `environment_id` against. It is tula-auth's, kept so the service copied from it runs unchanged;
 * it is not {@link ORGANIZATION_SETTING}: an auth environment is not an Organization.
 */
export const ENVIRONMENT_SETTING = TENANT_SETTING

/**
 * The policy expression of the `auth` tables as Postgres stores and prints it in `pg_policies`
 * (parenthesised, `::text` casts, the `::uuid` cast on the setting). It is the one place this
 * text is derived: the tenant isolation check compares every environment-scoped table's policy
 * against it, and an integration test pins it against the live catalog, so a Postgres version
 * that deparses differently fails loudly instead of passing or failing every table.
 */
export const ENVIRONMENT_POLICY_EXPRESSION = `(environment_id = (NULLIF(current_setting('${ENVIRONMENT_SETTING}'::text, true), ''::text))::uuid)`

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Run `fn` in a transaction scoped to one auth environment.
 *
 * Sets {@link ENVIRONMENT_SETTING} for this transaction only (`set_config(..., true)`), so every
 * query on the handle sees and writes only that environment's `auth` rows. The setting ends with
 * the transaction and cannot leak to the next user of the pooled connection. Pass the root
 * database from `createDb`, not a transaction, and run every `auth` query on the handle `fn`
 * receives: a query on `db` itself sees no environment rows.
 *
 * @param db - The database from `createDb`.
 * @param environmentId - The environment id (a UUID).
 * @param fn - Work to run inside the scoped transaction.
 * @returns Whatever `fn` returns.
 * @throws If `environmentId` is not a UUID (before any query runs), or whatever `fn` throws (the
 *   transaction rolls back).
 */
export async function withEnvironment<T>(
  db: Database,
  environmentId: string,
  fn: (tx: Transaction) => Promise<T>
): Promise<T> {
  if (!UUID.test(environmentId)) {
    throw new Error('withEnvironment: environmentId must be a UUID')
  }
  return db.transaction(async (tx) => {
    // `set_config` takes bound parameters, unlike `SET LOCAL`. The value is never in the SQL text.
    await tx.execute(sql`select set_config(${ENVIRONMENT_SETTING}, ${environmentId}, true)`)
    return fn(tx)
  })
}
