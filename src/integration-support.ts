import { runMigrations } from './migrate'

/** The connection strings the integration tests need; see `.env.example`. */
export interface IntegrationEnv {
  owner: string
  auth: string
  core: string
  playbook: string
}

const ENV_NAMES = {
  owner: 'DATABASE_URL',
  auth: 'DATABASE_URL_AUTH',
  core: 'DATABASE_URL_CORE',
  playbook: 'DATABASE_URL_PLAYBOOK',
} as const satisfies Record<keyof IntegrationEnv, string>

/** The host port docker-compose.yml publishes Postgres on; `POSTGRES_PORT` moves both together. */
function composePort(): string {
  return process.env.POSTGRES_PORT || '5432'
}

/**
 * The connection strings `docker compose up -d --wait` sets up (local passwords from
 * docker-compose.yml), used when no connection variable is set so CI needs no environment.
 */
export function composeDefaults(): IntegrationEnv {
  const at = (login: string): string =>
    `postgres://closeline_${login}:closeline_${login}_local@127.0.0.1:${composePort()}/closeline`
  return { owner: at('owner'), auth: at('auth'), core: at('core'), playbook: at('playbook') }
}

/**
 * Read the owner and per-service connection strings. With none of the four variables set, use
 * {@link composeDefaults}. With some set, all must be, so a half-set environment cannot mix a
 * custom Postgres with the default one.
 */
export function integrationEnv(): IntegrationEnv {
  const names = Object.values(ENV_NAMES)
  if (names.every((name) => !process.env[name])) {
    return composeDefaults()
  }
  const read = (name: string): string => {
    const value = process.env[name]
    if (!value) {
      // A silently skipped suite would look green in CI, so a missing URL fails loudly.
      throw new Error(`Integration tests need ${name} (see .env.example and the README)`)
    }
    return value
  }
  return {
    owner: read(ENV_NAMES.owner),
    auth: read(ENV_NAMES.auth),
    core: read(ENV_NAMES.core),
    playbook: read(ENV_NAMES.playbook),
  }
}

/** Apply every pending migration as the owner role. Safe to call from several test files. */
export function migrateUp(ownerUrl: string): Promise<void> {
  return runMigrations(ownerUrl)
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
