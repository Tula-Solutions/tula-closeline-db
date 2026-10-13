import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

/** The connection strings the integration tests need; see `.env.example`. */
export interface IntegrationEnv {
  owner: string
  auth: string
  core: string
  playbook: string
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    // A silently skipped suite would look green in CI, so a missing URL fails loudly.
    throw new Error(`Integration tests need ${name} (see .env.example and the README)`)
  }
  return value
}

/** Read the owner and per-service connection strings, or throw naming the missing variable. */
export function integrationEnv(): IntegrationEnv {
  return {
    owner: required('DATABASE_URL'),
    auth: required('DATABASE_URL_AUTH'),
    core: required('DATABASE_URL_CORE'),
    playbook: required('DATABASE_URL_PLAYBOOK'),
  }
}

/** Apply every pending migration as the owner role. Safe to call from several test files. */
export async function migrateUp(ownerUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: ownerUrl, max: 1 })
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)),
    })
  } finally {
    await pool.end()
  }
}

/** The text of an error and of every error it was caused by, so a driver wrapper is no obstacle. */
export function errorChain(error: unknown): string {
  const parts: string[] = []
  let current: unknown = error
  while (current instanceof Error && parts.length < 8) {
    parts.push(current.message)
    current = current.cause
  }
  return parts.join(' <- ')
}

/** Run `promise` and return the text of the error it rejected with, failing if it resolved. */
export async function rejectionOf(promise: PromiseLike<unknown>): Promise<string> {
  try {
    await promise
  } catch (error) {
    return errorChain(error)
  }
  throw new Error('expected the statement to be refused, but it succeeded')
}
