import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { OWNER_ROLE } from './roles'

/** Options for {@link runMigrations}. */
export interface MigrateOptions {
  /** The folder holding the migrations and `meta/_journal.json`; defaults to this repo's. */
  migrationsFolder?: string
  /** Longest a statement waits for a lock before failing, in milliseconds. */
  lockTimeoutMs?: number
}

/** The default longest a migration statement waits for a lock. */
export const DEFAULT_LOCK_TIMEOUT_MS = 10_000

/**
 * Apply every pending migration as the owner role.
 *
 * Default privileges attach to the role that creates an object, so the connection must be
 * `closeline_owner`: any other role would create tables the service roles cannot reach. The
 * session also sets `lock_timeout`, so `ENABLE/FORCE ROW LEVEL SECURITY` (which needs an
 * exclusive lock) fails instead of queueing behind a long transaction, and blocking every query
 * that queues after it.
 *
 * @param ownerUrl - Connection string of the owner role.
 * @param options - Migrations folder and lock timeout.
 * @throws If the connection is not the owner role, or a migration fails (all roll back together).
 */
export async function runMigrations(ownerUrl: string, options: MigrateOptions = {}): Promise<void> {
  const pool = new Pool({
    connectionString: ownerUrl,
    max: 1,
    connectionTimeoutMillis: 10_000,
    lock_timeout: options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS,
  })
  try {
    const who = await pool.query<{ role: string }>('select current_user as role')
    const role = who.rows[0]?.role
    if (role !== OWNER_ROLE) {
      throw new Error(`migrate: must run as ${OWNER_ROLE}, not ${role ?? 'an unknown role'}`)
    }
    await migrate(drizzle(pool), {
      migrationsFolder:
        options.migrationsFolder ?? fileURLToPath(new URL('../migrations', import.meta.url)),
    })
  } finally {
    await pool.end()
  }
}
