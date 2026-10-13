import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

/** The Drizzle schema object: every Postgres schema the services own. */
export type Schema = typeof schema

/** A Drizzle database over a node-postgres pool. */
export type Database = NodePgDatabase<Schema>

/** The handle `withOrganization` passes to its callback: a transaction on one pooled connection. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

/** Pool settings for {@link createDb}; every field has a bounded default. */
export interface DbOptions {
  /** Most connections the pool opens, 1 to 100. */
  max?: number
  /** Longest a single statement may run before Postgres cancels it, in milliseconds. */
  statementTimeoutMs?: number
  /** Longest to wait for a connection (new or from the pool) before failing, in milliseconds. */
  connectionTimeoutMs?: number
  /** Called with an error from an idle pooled connection, which would otherwise crash the process. */
  onError?: (error: Error) => void
}

/** The defaults {@link createDb} uses for any option left out. */
export const DEFAULT_POOL_OPTIONS = {
  max: 10,
  statementTimeoutMs: 30_000,
  connectionTimeoutMs: 5_000,
} as const

const MAX_POOL = 100
// A transaction left open (a crashed caller, a stuck await) must not hold a connection forever.
const IDLE_IN_TRANSACTION_TIMEOUT_MS = 60_000
const IDLE_CONNECTION_TIMEOUT_MS = 30_000

function positiveInteger(name: string, value: number, upTo = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isInteger(value) || value < 1 || value > upTo) {
    throw new Error(`createDb: ${name} must be an integer from 1 to ${upTo}`)
  }
  return value
}

/** A database handle plus the function that releases its connections. */
export interface DbHandle {
  /** The Drizzle database. Reach tenant tables only through `withOrganization`. */
  db: Database
  /** Waits for in-flight queries, then closes every pooled connection. */
  close: () => Promise<void>
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
export function createDb(connectionString: string, options: DbOptions = {}): DbHandle {
  if (connectionString.trim() === '') {
    throw new Error('createDb: connectionString must not be empty')
  }
  const max = positiveInteger('max', options.max ?? DEFAULT_POOL_OPTIONS.max, MAX_POOL)
  const statementTimeout = positiveInteger(
    'statementTimeoutMs',
    options.statementTimeoutMs ?? DEFAULT_POOL_OPTIONS.statementTimeoutMs
  )
  const connectionTimeoutMillis = positiveInteger(
    'connectionTimeoutMs',
    options.connectionTimeoutMs ?? DEFAULT_POOL_OPTIONS.connectionTimeoutMs
  )

  const pool = new Pool({
    connectionString,
    max,
    connectionTimeoutMillis,
    idleTimeoutMillis: IDLE_CONNECTION_TIMEOUT_MS,
    statement_timeout: statementTimeout,
    idle_in_transaction_session_timeout: IDLE_IN_TRANSACTION_TIMEOUT_MS,
  })
  // An error on an idle connection is emitted on the pool; with no listener it would throw.
  pool.on('error', options.onError ?? (() => undefined))

  return { db: drizzle(pool, { schema }), close: () => pool.end() }
}
