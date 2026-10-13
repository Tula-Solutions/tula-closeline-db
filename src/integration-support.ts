import type { Pool } from 'pg'
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

/**
 * The bootstrap superuser's connection string, for the few tests that must change a role's
 * attributes. Reads `DATABASE_URL_ADMIN`; with none of the four service variables set, falls back
 * to the compose superuser. Fails loudly otherwise, so no suite is silently skipped.
 */
export function adminUrl(): string {
  const explicit = process.env.DATABASE_URL_ADMIN
  if (explicit) {
    return explicit
  }
  const names = ['DATABASE_URL', 'DATABASE_URL_AUTH', 'DATABASE_URL_CORE', 'DATABASE_URL_PLAYBOOK']
  if (names.every((name) => !process.env[name])) {
    return `postgres://postgres:postgres_local@127.0.0.1:${composePort()}/closeline`
  }
  throw new Error('Integration tests need DATABASE_URL_ADMIN, a superuser (see the README)')
}

/**
 * Drop what a test run killed before its cleanup left behind: relations named `it_*` in the
 * service schemas, and schemas named `it_*`. The tenant isolation check scans whole schemas, so a
 * single stale table would fail every later run until someone dropped it by hand.
 *
 * @param owner - A pool connected as the owner role, which owns everything the tests create.
 */
export async function dropStaleTestObjects(owner: Pool): Promise<void> {
  const stale = await owner.query<{ schema: string; name: string; kind: string }>(
    `select n.nspname as schema, c.relname as name, c.relkind as kind
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in ('auth', 'core', 'playbook') and c.relname like 'it\\_%'
        and c.relkind in ('r', 'p', 'v', 'm', 'f')
      order by (c.relkind in ('v', 'm')) desc`
  )
  for (const { schema, name, kind } of stale.rows) {
    const what = kind === 'v' ? 'view' : kind === 'm' ? 'materialized view' : 'table'
    await owner.query(`drop ${what} if exists "${schema}"."${name}" cascade`)
  }
  const schemas = await owner.query<{ name: string }>(
    `select nspname as name from pg_namespace where nspname like 'it\\_%'`
  )
  for (const { name } of schemas.rows) {
    await owner.query(`drop schema if exists "${name}" cascade`)
  }
}
