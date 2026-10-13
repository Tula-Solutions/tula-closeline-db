import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool, type PoolClient } from 'pg'
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
  /** Longest `close` waits for in-flight work before giving up, in milliseconds. */
  closeTimeoutMs?: number
  /**
   * Called with an error on any pooled connection, idle or checked out (a server restart, a
   * failover, an idle-in-transaction timeout). Without a listener such an error would crash the
   * process. The default writes one line to stderr with the error code or name, never the message.
   * If it throws, the exception is swallowed and that same line is written instead.
   */
  onError?: (error: Error) => void
}

/** The defaults {@link createDb} uses for any option left out. */
export const DEFAULT_POOL_OPTIONS = {
  max: 10,
  statementTimeoutMs: 30_000,
  connectionTimeoutMs: 5_000,
  closeTimeoutMs: 10_000,
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

/**
 * The default `onError`: one line on stderr naming only the error code (or, without one, its
 * name). The message is left out because a driver message can carry connection details.
 */
export function reportConnectionError(error: Error): void {
  const code = (error as { code?: unknown }).code
  const label = typeof code === 'string' && code !== '' ? code : error.name
  process.stderr.write(`closeline-db: database connection error (${label})\n`)
}

/** A database handle plus the function that releases its connections. */
export interface DbHandle {
  /** The Drizzle database. Reach tenant tables only through `withOrganization`. */
  db: Database
  /**
   * Waits for in-flight queries, then closes every pooled connection. Safe to call more than
   * once. Rejects if work is still in flight after `closeTimeoutMs`, after asking the remaining
   * connections to end, so a hung transaction cannot hold shutdown.
   */
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

  const closeTimeoutMs = positiveInteger(
    'closeTimeoutMs',
    options.closeTimeoutMs ?? DEFAULT_POOL_OPTIONS.closeTimeoutMs
  )
  const handler = options.onError ?? reportConnectionError
  // A listener that throws inside an EventEmitter is an uncaught exception, the crash this
  // handler exists to prevent. A handler that fails is noted the way the default reports.
  const onError = (error: Error): void => {
    try {
      handler(error)
    } catch {
      reportConnectionError(error)
    }
  }

  const pool = new Pool({
    connectionString,
    max,
    connectionTimeoutMillis,
    idleTimeoutMillis: IDLE_CONNECTION_TIMEOUT_MS,
    statement_timeout: statementTimeout,
    idle_in_transaction_session_timeout: IDLE_IN_TRANSACTION_TIMEOUT_MS,
  })
  // pg-pool listens for errors on a connection only while it is idle and removes that listener
  // on checkout, so an error on a checked-out connection (which a transaction holds) would be an
  // uncaught exception. A listener on every client from the moment it connects covers both.
  const clients = new Set<PoolClient>()
  pool.on('connect', (client) => {
    client.on('error', onError)
    clients.add(client)
  })
  pool.on('remove', (client) => {
    clients.delete(client)
  })
  // An idle-connection error is also emitted on the pool, which throws with no listener. The
  // client listener above already reported it, so this one only keeps it from throwing.
  pool.on('error', () => undefined)

  let closing: Promise<void> | undefined
  const close = (): Promise<void> => {
    closing ??= closePool(pool, clients, closeTimeoutMs)
    return closing
  }

  return { db: drizzle(pool, { schema }), close }
}

async function closePool(pool: Pool, clients: Set<PoolClient>, timeoutMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      // Work is still in flight: ask each remaining connection to end, without waiting for it.
      for (const client of clients) {
        client.end().catch(() => undefined)
      }
      reject(new Error('createDb: close timed out'))
    }, timeoutMs)
  })
  try {
    await Promise.race([pool.end(), deadline])
  } finally {
    clearTimeout(timer)
  }
}
