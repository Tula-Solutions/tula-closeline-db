import type { Pool, PoolClient } from 'pg'
import { ENVIRONMENT_SETTING } from './environment'
import { runMigrations } from './migrate'

/** The connection strings the integration tests need; see `.env.example`. */
export interface IntegrationEnv {
  owner: string
  auth: string
  core: string
  playbook: string
  voice: string
}

const ENV_NAMES = {
  owner: 'DATABASE_URL',
  auth: 'DATABASE_URL_AUTH',
  core: 'DATABASE_URL_CORE',
  playbook: 'DATABASE_URL_PLAYBOOK',
  voice: 'DATABASE_URL_VOICE',
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
  return {
    owner: at('owner'),
    auth: at('auth'),
    core: at('core'),
    playbook: at('playbook'),
    voice: at('voice'),
  }
}

/**
 * Read the owner and per-service connection strings. With none of the five variables set, use
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
    voice: read(ENV_NAMES.voice),
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

const SERVICE_URL_NAMES = Object.values(ENV_NAMES)

/** Whether `host` is a loopback address, with the brackets of an IPv6 literal removed. */
function isLoopback(host: string): boolean {
  const bare = host.replace(/^\[|\]$/g, '')
  return bare === '127.0.0.1' || bare === 'localhost' || bare === '::1'
}

/**
 * Refuse to let test support change or drop anything unless the database is on this machine.
 * Set `ALLOW_NON_LOCAL_TEST_DATABASE=1` to test against a disposable remote Postgres.
 *
 * @param url - The connection string the destructive action is about to use.
 * @throws An error naming the host and the opt-in variable; the password is never included.
 */
export function assertLocalTestDatabase(url: string): void {
  if (process.env.ALLOW_NON_LOCAL_TEST_DATABASE === '1') {
    return
  }
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    throw new Error(
      'Refusing to change a test database whose connection string cannot be parsed; ' +
        'set ALLOW_NON_LOCAL_TEST_DATABASE=1 only for a disposable database'
    )
  }
  if (!isLoopback(host)) {
    throw new Error(
      `Refusing to drop or alter objects on host "${host}": it is not loopback. ` +
        'Set ALLOW_NON_LOCAL_TEST_DATABASE=1 only if this is a disposable test database'
    )
  }
}

/**
 * The bootstrap superuser's connection string, for the few tests that must change a role's
 * attributes. With none of the five service variables set, it is the compose superuser. An
 * explicit `DATABASE_URL_ADMIN` is returned only together with all five service variables, so the
 * superuser and the database under test cannot name different clusters. Any other combination
 * throws, so no suite is silently skipped. The host must be loopback (see
 * {@link assertLocalTestDatabase}).
 */
export function adminUrl(): string {
  const explicit = process.env.DATABASE_URL_ADMIN
  const setCount = SERVICE_URL_NAMES.filter((name) => process.env[name]).length
  let url: string
  if (explicit && setCount === SERVICE_URL_NAMES.length) {
    url = explicit
  } else if (!explicit && setCount === 0) {
    url = `postgres://postgres:postgres_local@127.0.0.1:${composePort()}/closeline`
  } else {
    throw new Error(
      'Integration tests need DATABASE_URL_ADMIN (a superuser) together with all of ' +
        `${SERVICE_URL_NAMES.join(', ')}, or none of the five to use the compose database (see the README)`
    )
  }
  assertLocalTestDatabase(url)
  return url
}

/**
 * Drop what a test run killed before its cleanup left behind: relations named `it_*` in the
 * service schemas and `public`, and schemas named `it_schema_*`. The tenant isolation check scans
 * whole schemas, so a single stale table would fail every later run until someone dropped it by
 * hand. Refuses to run unless the host is loopback ({@link assertLocalTestDatabase}).
 *
 * @param owner - A pool connected as the owner role, which owns everything the tests create.
 * @param ownerUrl - The connection string `owner` uses, checked before anything is dropped.
 */
export async function dropStaleTestObjects(owner: Pool, ownerUrl: string): Promise<void> {
  assertLocalTestDatabase(ownerUrl)
  const stale = await owner.query<{ schema: string; name: string; kind: string }>(
    `select n.nspname as schema, c.relname as name, c.relkind as kind
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in ('auth', 'core', 'playbook', 'voice', 'public') and c.relname like 'it\\_%'
        and c.relkind in ('r', 'p', 'v', 'm', 'f')
      order by (c.relkind in ('v', 'm')) desc`
  )
  for (const { schema, name, kind } of stale.rows) {
    const what = kind === 'v' ? 'view' : kind === 'm' ? 'materialized view' : 'table'
    await owner.query(`drop ${what} if exists "${schema}"."${name}" cascade`)
  }
  const schemas = await owner.query<{ name: string }>(
    `select nspname as name from pg_namespace where nspname like 'it\\_schema\\_%'`
  )
  for (const { name } of schemas.rows) {
    await owner.query(`drop schema if exists "${name}" cascade`)
  }
}

/**
 * Undo the cluster-wide role changes the role tests make, in case a run was killed inside one:
 * `closeline_core` goes back to `NOBYPASSRLS` and any `closeline_it_super_*` role is dropped.
 * Refuses to run unless the host is loopback ({@link assertLocalTestDatabase}).
 *
 * @param admin - A pool connected as the bootstrap superuser.
 * @param adminConnectionUrl - The connection string `admin` uses, checked before anything changes.
 */
export async function resetTestRoles(admin: Pool, adminConnectionUrl: string): Promise<void> {
  assertLocalTestDatabase(adminConnectionUrl)
  await admin.query('alter role closeline_core nobypassrls')
  // The search definer role is NOLOGIN, BYPASSRLS and held by no service role.
  for (const definer of ['closeline_core_search', 'closeline_core_crm_lookup']) {
    await admin.query(`alter role ${definer} nologin nosuperuser bypassrls`)
    const members = await admin.query<{ name: string }>(
      `select m.rolname as name from pg_auth_members am
         join pg_roles m on m.oid = am.member
         join pg_roles g on g.oid = am.roleid
        where g.rolname = $1 and m.rolname <> 'closeline_owner'`,
      [definer]
    )
    for (const { name } of members.rows) {
      await admin.query(`revoke ${definer} from "${name}"`)
    }
  }
  const leftover = await admin.query<{ name: string }>(
    `select rolname as name from pg_roles where rolname like 'closeline\\_it\\_super\\_%'`
  )
  for (const { name } of leftover.rows) {
    await admin.query(`drop role if exists "${name}"`)
  }
}

/** Two environments of one project, seeded for an `auth` integration test. */
export interface AuthRegion {
  workspaceId: string
  projectId: string
  a: { environmentId: string; projectId: string }
  b: { environmentId: string; projectId: string }
}

/**
 * Seed a workspace, a project and two environments through the auth role, as the service's
 * bootstrap does. The owner removes them by deleting the workspace; the rest goes by cascade.
 *
 * @param authPool - A pool connected as `closeline_auth`.
 * @returns The ids.
 */
export async function seedAuthRegion(authPool: Pool): Promise<AuthRegion> {
  const ids = {
    workspaceId: crypto.randomUUID(),
    projectId: crypto.randomUUID(),
    a: crypto.randomUUID(),
    b: crypto.randomUUID(),
  }
  await authPool.query('insert into auth.workspaces (id, name) values ($1, $2)', [
    ids.workspaceId,
    `it-${Date.now()}`,
  ])
  await authPool.query('insert into auth.projects (id, workspace_id, name) values ($1, $2, $3)', [
    ids.projectId,
    ids.workspaceId,
    'it-project',
  ])
  await authPool.query(
    `insert into auth.environments (id, project_id, kind) values ($1, $3, 'development'), ($2, $3, 'production')`,
    [ids.a, ids.b, ids.projectId]
  )
  return {
    workspaceId: ids.workspaceId,
    projectId: ids.projectId,
    a: { environmentId: ids.a, projectId: ids.projectId },
    b: { environmentId: ids.b, projectId: ids.projectId },
  }
}

/**
 * Run `fn` on one connection of `pool` in a transaction scoped to an auth environment (or to none
 * when `environmentId` is null), committing on success and rolling back on a throw.
 *
 * @param pool - A pool connected as any `auth` role.
 * @param environmentId - The environment to set, or null to set none.
 * @param fn - Work to run on the connection.
 * @returns What `fn` returns.
 */
export async function inAuthEnvironment<T>(
  pool: Pool,
  environmentId: string | null,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('begin')
    if (environmentId) {
      await client.query('select set_config($1, $2, true)', [ENVIRONMENT_SETTING, environmentId])
    }
    const result = await fn(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Fix the planner's view of a table for a plan test: turn the table's autovacuum off, pin
 * `n_distinct` for the named columns, and analyze. Autovacuum re-analyzes a table a minute or
 * more after its first rows, and a sample that holds one value of a column (a state's default, a
 * single Deal) gives n_distinct 1 and a most-common frequency of 1, which makes an equality on
 * that column look free under a generic plan and flips which index wins. Pinning the count a
 * production table has keeps the plan the test asserts independent of when that sample is taken.
 *
 * @param owner - A pool connected as the owner role.
 * @param table - A table in a service schema, as `schema.table`.
 * @param columns - Column name to the `n_distinct` to pin (a positive count).
 * @returns A function that undoes the pins; each step runs on its own, so one failure does not
 * skip the rest, and the first failure is thrown after all of them ran.
 */
export async function pinColumnStats(
  owner: Pool,
  table: string,
  columns: Record<string, number>
): Promise<() => Promise<void>> {
  const entries = Object.entries(columns)
  if (
    !/^[a-z_]+\.[a-z_]+$/.test(table) ||
    entries.some(([c, n]) => !/^[a-z_]+$/.test(c) || !Number.isFinite(n) || n < 1)
  ) {
    throw new Error(`pinColumnStats: unexpected identifier in ${table}`)
  }
  const restore = async (): Promise<void> => {
    const steps = [
      `alter table ${table} reset (autovacuum_enabled)`,
      ...entries.map(
        ([column]) => `alter table ${table} alter column ${column} reset (n_distinct)`
      ),
      `analyze ${table}`,
    ]
    const failures: unknown[] = []
    for (const step of steps) {
      try {
        await owner.query(step)
      } catch (error) {
        failures.push(error)
      }
    }
    if (failures.length > 0) {
      throw failures[0]
    }
  }
  try {
    await owner.query(`alter table ${table} set (autovacuum_enabled = false)`)
    for (const [column, nDistinct] of entries) {
      await owner.query(
        `alter table ${table} alter column ${column} set (n_distinct = ${Math.trunc(nDistinct)})`
      )
    }
    await owner.query(`analyze ${table}`)
  } catch (error) {
    await restore().catch(() => undefined)
    throw error
  }
  return restore
}
