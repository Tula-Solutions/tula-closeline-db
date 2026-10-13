import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { Pool, type PoolClient } from 'pg'
import { createDb, type DbHandle } from './client'
import { ENVIRONMENT_POLICY_EXPRESSION, ENVIRONMENT_SETTING, withEnvironment } from './environment'
import { dropStaleTestObjects, integrationEnv, migrateUp, rejectionOf } from './integration-support'
import {
  CONTROL_PLANE_TABLES,
  ENVIRONMENT_SCOPED_TABLES,
  findTenantIsolationGaps,
  NON_TENANT_TABLES,
} from './isolation'
import { environments, projects, users, workspaces } from './schema'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()

/** What `closeline_auth` may do to each table: tula-auth's runtime grants, at its latest migration. */
const TABLE_GRANTS: Record<string, string> = {
  api_keys: 'INSERT,SELECT,UPDATE',
  audit_logs: 'DELETE,INSERT,SELECT',
  backup_codes: 'DELETE,INSERT,SELECT,UPDATE',
  credentials: 'DELETE,INSERT,SELECT,UPDATE',
  environment_settings: 'INSERT,SELECT,UPDATE',
  environments: 'INSERT,SELECT,UPDATE',
  events: 'DELETE,INSERT,SELECT',
  flow_attempts: 'DELETE,INSERT,SELECT,UPDATE',
  hook_call_counts: 'DELETE,INSERT,SELECT',
  hooks: 'DELETE,INSERT,SELECT',
  identities: 'DELETE,INSERT,SELECT,UPDATE',
  instance_audit_logs: 'DELETE,INSERT,SELECT',
  native_apps: 'DELETE,INSERT,SELECT',
  oauth_providers: 'DELETE,INSERT,SELECT,UPDATE',
  passkey_challenges: 'DELETE,INSERT,SELECT,UPDATE',
  passkeys: 'DELETE,INSERT,SELECT,UPDATE',
  password_history: 'DELETE,INSERT,SELECT',
  projects: 'INSERT,SELECT,UPDATE',
  proposals: 'DELETE,INSERT,SELECT',
  refresh_tokens: 'DELETE,INSERT,SELECT,UPDATE',
  sessions: 'DELETE,INSERT,SELECT,UPDATE',
  signing_keys: 'DELETE,INSERT,SELECT,UPDATE',
  sms_code_counts: 'DELETE,INSERT,SELECT',
  user_factors: 'DELETE,INSERT,SELECT,UPDATE',
  users: 'DELETE,INSERT,SELECT,UPDATE',
  verification_tokens: 'DELETE,INSERT,SELECT,UPDATE',
  webhook_deliveries: 'DELETE,INSERT,SELECT',
  webhook_delivery_attempts: 'INSERT,SELECT',
  webhook_endpoints: 'DELETE,INSERT,SELECT,UPDATE',
  workspaces: 'INSERT,SELECT,UPDATE',
}

/** The columns `closeline_auth` may UPDATE on a table where it holds no table-wide UPDATE. */
const COLUMN_GRANTS: Record<string, string> = {
  events: 'delivered_at',
  hook_call_counts: 'calls,last_at,updated_at',
  hooks: 'deadline_ms,enabled,failure_mode,last_failed_at,last_failure_reason,updated_at,url',
  native_apps: 'app_link_paths,sha256_cert_fingerprints,team_id,updated_at',
  password_history: 'position,updated_at',
  proposals: 'approved_at,approved_by_id,approved_by_type,failure_reason,status,updated_at',
  sms_code_counts: 'sent,updated_at,used',
  webhook_deliveries:
    'attempts,completed_at,failure_reason,last_attempt_at,next_attempt_at,state,status_code,updated_at',
}

const uuid = (): string => crypto.randomUUID()

interface Region {
  workspaceId: string
  projectId: string
  otherProjectId: string
  a: { environmentId: string; projectId: string }
  b: { environmentId: string; projectId: string }
  /** An environment of the other project, to prove the (environment, project) pair is checked. */
  c: { environmentId: string; projectId: string }
}

describe('the auth schema, against Postgres', () => {
  let owner: Pool
  let authPool: Pool
  let corePool: Pool
  let playbookPool: Pool
  let handle: DbHandle
  let region: Region
  let tables: string[]

  /** Run `fn` on one connection of the auth role with the environment set, in a transaction. */
  const inEnv = async <T>(
    environmentId: string,
    fn: (client: PoolClient) => Promise<T>
  ): Promise<T> => {
    const client = await authPool.connect()
    try {
      await client.query('begin')
      await client.query('select set_config($1, $2, true)', [ENVIRONMENT_SETTING, environmentId])
      const result = await fn(client)
      await client.query('commit')
      return result
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  const addUser = (target: Region['a'], email: string) =>
    withEnvironment(handle.db, target.environmentId, async (tx) => {
      const [row] = await tx
        .insert(users)
        .values({ ...target, email, emailNormalized: email })
        .returning()
      if (!row) {
        throw new Error('user not inserted')
      }
      return row
    })

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    await dropStaleTestObjects(owner, env.owner)
    authPool = new Pool({ connectionString: env.auth, max: 4 })
    corePool = new Pool({ connectionString: env.core, max: 1 })
    playbookPool = new Pool({ connectionString: env.playbook, max: 1 })
    handle = createDb(env.auth, { max: 4 })

    const found = await owner.query<{ name: string }>(
      `select tablename as name from pg_tables where schemaname = 'auth' order by tablename`
    )
    tables = found.rows.map((row) => row.name)

    // The control plane is written by the service role itself, as 1.7's bootstrap will.
    const [workspace] = await handle.db
      .insert(workspaces)
      .values({ name: `it-${Date.now()}` })
      .returning()
    const [project] = await handle.db
      .insert(projects)
      .values({ workspaceId: workspace?.id ?? '', name: 'it-project' })
      .returning()
    const [otherProject] = await handle.db
      .insert(projects)
      .values({ workspaceId: workspace?.id ?? '', name: 'it-other-project' })
      .returning()
    const added = await handle.db
      .insert(environments)
      .values([
        { projectId: project?.id ?? '', kind: 'development' },
        { projectId: project?.id ?? '', kind: 'production' },
        { projectId: otherProject?.id ?? '', kind: 'development' },
      ])
      .returning()
    const [envA, envB, envC] = added
    if (!(workspace && project && otherProject && envA && envB && envC)) {
      throw new Error('control plane not seeded')
    }
    region = {
      workspaceId: workspace.id,
      projectId: project.id,
      otherProjectId: otherProject.id,
      a: { environmentId: envA.id, projectId: project.id },
      b: { environmentId: envB.id, projectId: project.id },
      c: { environmentId: envC.id, projectId: otherProject.id },
    }
  })

  afterAll(async () => {
    // Control-plane deletes are the owner's; every environment's rows go by cascade.
    await owner.query('delete from auth.workspaces where id = $1', [region?.workspaceId])
    await handle.close()
    await Promise.all([owner.end(), authPool.end(), corePool.end(), playbookPool.end()])
  })

  describe('only closeline_auth may use it', () => {
    test('the migration created every table tula-auth has', () => {
      expect(tables).toEqual(Object.keys(TABLE_GRANTS).sort())
    })

    test.each(['core', 'playbook'] as const)(
      'closeline_%s is refused on every auth table, for reading and writing',
      async (service) => {
        const pool = service === 'core' ? corePool : playbookPool
        for (const table of tables) {
          const read = await rejectionOf(pool.query(`select * from "auth"."${table}"`))
          expect(read, `select on auth.${table}`).toContain('permission denied for schema auth')
          const write = await rejectionOf(pool.query(`delete from "auth"."${table}"`))
          expect(write, `delete on auth.${table}`).toContain('permission denied for schema auth')
        }
      }
    )

    test.each(['core', 'playbook'] as const)(
      'closeline_%s cannot call the migration-history function',
      async (service) => {
        const pool = service === 'core' ? corePool : playbookPool
        const message = await rejectionOf(pool.query('select * from auth.applied_migrations()'))
        expect(message).toContain('permission denied for schema auth')
      }
    )

    test('closeline_auth can read the migration history only through the function', async () => {
      const result = await authPool.query<{ created_at: string }>(
        'select created_at from auth.applied_migrations()'
      )
      expect(result.rows.length).toBeGreaterThanOrEqual(2)
      const direct = await rejectionOf(authPool.query('select * from drizzle.__drizzle_migrations'))
      expect(direct).toContain('permission denied for schema drizzle')
    })

    test('closeline_core and closeline_playbook hold no privilege on any auth relation, schema denial aside', async () => {
      // The catalog functions below ignore schema USAGE, so a stray grant (or one on PUBLIC) is
      // seen even while "permission denied for schema auth" would still hide it from a query.
      const held = await owner.query<{ role: string; relation: string; privilege: string }>(
        `select r.role, c.relname as relation, p.privilege
           from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           cross join (values ('closeline_core'), ('closeline_playbook')) as r(role)
           cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
                              ('REFERENCES'), ('TRIGGER')) as p(privilege)
          where n.nspname = 'auth' and c.relkind in ('r', 'p', 'v', 'm', 'f')
            and (has_table_privilege(r.role, c.oid, p.privilege)
                 or (p.privilege in ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES')
                     and has_any_column_privilege(r.role, c.oid, p.privilege)))
          order by 1, 2, 3`
      )
      expect(held.rows).toEqual([])
      const sequences = await owner.query(
        `select r.role, c.relname
           from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           cross join (values ('closeline_core'), ('closeline_playbook')) as r(role)
           cross join (values ('USAGE'), ('SELECT'), ('UPDATE')) as p(privilege)
          where n.nspname = 'auth' and c.relkind = 'S'
            and has_sequence_privilege(r.role, c.oid, p.privilege)`
      )
      expect(sequences.rows).toEqual([])
      const schema = await owner.query(
        `select r.role from (values ('closeline_core'), ('closeline_playbook')) as r(role)
          where has_schema_privilege(r.role, 'auth', 'USAGE')
             or has_function_privilege(r.role, 'auth.applied_migrations()', 'EXECUTE')`
      )
      expect(schema.rows).toEqual([])
    })

    test('a future auth table grants closeline_auth nothing until its migration says so', async () => {
      const defaults = await owner.query<{ object: string; role: string }>(
        `select d.defaclobjtype as object, a.grantee::regrole::text as role
           from pg_default_acl d
           join pg_namespace n on n.oid = d.defaclnamespace
           cross join lateral aclexplode(d.defaclacl) a
          where n.nspname = 'auth' and a.grantee::regrole::text = 'closeline_auth'`
      )
      expect(defaults.rows).toEqual([])
      // The other services keep theirs: this is auth's rule, not a change to core or playbook.
      const others = await owner.query<{ schema: string; objects: string }>(
        `select n.nspname as schema, string_agg(d.defaclobjtype::text, ',' order by d.defaclobjtype) as objects
           from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
          where n.nspname in ('core', 'playbook') group by n.nspname order by n.nspname`
      )
      expect(others.rows).toEqual([
        { schema: 'core', objects: 'S,r' },
        { schema: 'playbook', objects: 'S,r' },
      ])
      try {
        await owner.query('create table auth.it_probe (id serial primary key, note text)')
        const read = await rejectionOf(authPool.query('select * from auth.it_probe'))
        expect(read).toContain('permission denied for table it_probe')
        const write = await rejectionOf(
          authPool.query(`insert into auth.it_probe (note) values ('x')`)
        )
        expect(write).toContain('permission denied for table it_probe')
        const sequence = await rejectionOf(authPool.query(`select nextval('auth.it_probe_id_seq')`))
        expect(sequence).toContain('permission denied for sequence it_probe_id_seq')
      } finally {
        await owner.query('drop table if exists auth.it_probe')
      }
    })

    test('closeline_auth holds exactly the table privileges tula-auth grants its runtime role', async () => {
      const found = await owner.query<{ table: string; privileges: string }>(
        `select table_name as table, string_agg(privilege_type, ',' order by privilege_type) as privileges
           from information_schema.role_table_grants
          where grantee = 'closeline_auth' and table_schema = 'auth'
          group by table_name order by table_name`
      )
      expect(Object.fromEntries(found.rows.map((row) => [row.table, row.privileges]))).toEqual(
        TABLE_GRANTS
      )
    })

    test('closeline_auth updates only the named columns where it has no table-wide UPDATE', async () => {
      const found = await owner.query<{ table: string; columns: string }>(
        `select table_name as table, string_agg(column_name, ',' order by column_name) as columns
           from information_schema.role_column_grants g
          where grantee = 'closeline_auth' and table_schema = 'auth' and privilege_type = 'UPDATE'
            and not exists (select 1 from information_schema.role_table_grants t
                             where t.grantee = g.grantee and t.table_schema = g.table_schema
                               and t.table_name = g.table_name and t.privilege_type = 'UPDATE')
          group by table_name order by table_name`
      )
      expect(Object.fromEntries(found.rows.map((row) => [row.table, row.columns]))).toEqual(
        COLUMN_GRANTS
      )
    })

    test('closeline_auth owns nothing, and never destroys the control plane', async () => {
      for (const table of ['workspaces', 'projects', 'environments', 'api_keys']) {
        const message = await rejectionOf(authPool.query(`delete from auth.${table}`))
        expect(message, table).toContain(`permission denied for table ${table}`)
      }
      const truncate = await rejectionOf(authPool.query('truncate auth.users'))
      expect(truncate).toContain('permission denied for table users')
    })
  })

  describe('the Region has no Organization in auth', () => {
    test('no auth table has an organization_id column', async () => {
      const found = await owner.query(
        `select table_name from information_schema.columns
          where table_schema = 'auth' and column_name = 'organization_id'`
      )
      expect(found.rows).toEqual([])
    })

    test('every auth table is in exactly one category, and the isolation check verifies it', async () => {
      const categorised = [...ENVIRONMENT_SCOPED_TABLES, ...CONTROL_PLANE_TABLES].sort()
      expect(categorised).toEqual(tables.map((table) => `auth.${table}`))
      // Nothing is exempt any more: the check passes with an empty allowlist.
      expect(NON_TENANT_TABLES).toEqual([])
      expect(await findTenantIsolationGaps(handle.db)).toEqual([])
      expect(await findTenantIsolationGaps(handle.db, [])).toEqual([])
    })

    test('the environment policy text is the one the check compares against, on every scoped table', async () => {
      // Pins how this Postgres deparses the policy, as the Organization one is pinned in
      // isolation.integration.ts: a version that words it differently fails here first.
      const found = await owner.query<{ table: string; qual: string; check: string }>(
        `select tablename as table, qual, with_check as check from pg_policies
          where schemaname = 'auth' and policyname like '%\\_tenant\\_isolation' order by tablename`
      )
      expect(found.rows.map((row) => `auth.${row.table}`)).toEqual(
        [...ENVIRONMENT_SCOPED_TABLES].sort()
      )
      for (const row of found.rows) {
        expect(row.qual, `${row.table} using`).toBe(ENVIRONMENT_POLICY_EXPRESSION)
        expect(row.check, `${row.table} check`).toBe(ENVIRONMENT_POLICY_EXPRESSION)
      }
    })

    test('every table with environment_id is fail-closed on it, except api_keys', async () => {
      const found = await owner.query<{
        table: string
        enabled: boolean
        forced: boolean
        policy: string | null
        qual: string | null
        check: string | null
      }>(
        `select c.relname as table, c.relrowsecurity as enabled, c.relforcerowsecurity as forced,
                p.policyname as policy, p.qual, p.with_check as check
           from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
                                  and p.permissive = 'PERMISSIVE'
          where n.nspname = 'auth' and c.relkind = 'r'
            and exists (select 1 from pg_attribute a where a.attrelid = c.oid
                          and a.attname = 'environment_id' and not a.attisdropped)
          order by c.relname`
      )
      const scoped = found.rows.filter((row) => row.table !== 'api_keys')
      expect(scoped.map((row) => `auth.${row.table}`)).toEqual(
        [...ENVIRONMENT_SCOPED_TABLES].sort()
      )
      for (const row of scoped) {
        expect(row.enabled, `${row.table} enabled`).toBe(true)
        expect(row.forced, `${row.table} forced`).toBe(true)
        expect(row.policy, `${row.table} policy`).toBe(`${row.table}_tenant_isolation`)
        expect(row.qual, `${row.table} using`).toBe(ENVIRONMENT_POLICY_EXPRESSION)
        expect(row.check, `${row.table} check`).toBe(ENVIRONMENT_POLICY_EXPRESSION)
      }
      const apiKeys = found.rows.find((row) => row.table === 'api_keys')
      expect(apiKeys?.enabled).toBe(false)
    })
  })

  describe('one environment cannot reach another', () => {
    test('outside withEnvironment nothing is visible', async () => {
      await addUser(region.a, 'visible-a@example.test')
      expect(await handle.db.select().from(users)).toEqual([])
    })

    test('an environment sees only its own rows', async () => {
      await addUser(region.b, 'only-b@example.test')
      const seenByA = await withEnvironment(handle.db, region.a.environmentId, (tx) =>
        tx.select({ email: users.email }).from(users)
      )
      const seenByB = await withEnvironment(handle.db, region.b.environmentId, (tx) =>
        tx.select({ email: users.email }).from(users)
      )
      expect(seenByA.map((row) => row.email)).toContain('visible-a@example.test')
      expect(seenByA.map((row) => row.email)).not.toContain('only-b@example.test')
      expect(seenByB.map((row) => row.email)).toEqual(['only-b@example.test'])
    })

    test('a row cannot be written into another environment', async () => {
      const message = await rejectionOf(
        withEnvironment(handle.db, region.a.environmentId, (tx) =>
          tx
            .insert(users)
            .values({ ...region.b, email: 'smuggled@example.test', emailNormalized: 'smuggled' })
        )
      )
      expect(message).toContain('row-level security')
    })

    test("another environment's rows cannot be updated or deleted", async () => {
      const victim = await addUser(region.b, 'victim@example.test')
      const changed = await inEnv(region.a.environmentId, (client) =>
        client.query('update auth.users set first_name = $1 where id = $2', ['hacked', victim.id])
      )
      const removed = await inEnv(region.a.environmentId, (client) =>
        client.query('delete from auth.users where id = $1', [victim.id])
      )
      expect([changed.rowCount, removed.rowCount]).toEqual([0, 0])
      const still = await withEnvironment(handle.db, region.b.environmentId, (tx) =>
        tx.select().from(users).where(eq(users.id, victim.id))
      )
      expect(still[0]?.firstName).toBeNull()
    })

    test("a row cannot name a project that is not its environment's", async () => {
      const message = await rejectionOf(
        inEnv(region.a.environmentId, (client) =>
          client.query(
            `insert into auth.users (id, project_id, environment_id) values ($1, $2, $3)`,
            [uuid(), region.otherProjectId, region.a.environmentId]
          )
        )
      )
      expect(message).toContain('users_environment_project_fk')
    })

    test('a child row cannot point at a parent in another environment', async () => {
      const parent = await addUser(region.b, 'parent-b@example.test')
      const message = await rejectionOf(
        inEnv(region.a.environmentId, (client) =>
          client.query(
            `insert into auth.credentials (id, project_id, environment_id, user_id, type, secret)
             values ($1, $2, $3, $4, 'password', 'x')`,
            [uuid(), region.a.projectId, region.a.environmentId, parent.id]
          )
        )
      )
      expect(message).toContain('credentials_user_fk')
    })

    test('the table owner is bound too, because the policies are forced', async () => {
      await addUser(region.a, 'owner-sees-nothing@example.test')
      const count = await owner.query<{ count: string }>('select count(*) from auth.users')
      expect(count.rows[0]?.count).toBe('0')
    })

    test('the same email can exist in two environments, once in each', async () => {
      await addUser(region.a, 'same@example.test')
      await addUser(region.b, 'same@example.test')
      const message = await rejectionOf(addUser(region.a, 'same@example.test'))
      expect(message).toContain('users_environment_email_key')
    })

    test('api_keys is outside row-level security: key lookup runs before any environment is known', async () => {
      // A hash of nothing real, revoked at once so it never authorises anything.
      await authPool.query(
        `insert into auth.api_keys (id, project_id, environment_id, kind, name, key_hash, last_four, revoked_at)
         values ($1, $2, $3, 'secret', 'it', $4, 'abcd', now())`,
        [uuid(), region.a.projectId, region.a.environmentId, `it-${uuid()}`]
      )
      const found = await authPool.query('select id from auth.api_keys where key_hash like $1', [
        'it-%',
      ])
      expect(found.rows.length).toBeGreaterThanOrEqual(1)
    })

    test('deleting an environment, as the owner, removes everything in it', async () => {
      const doomed = await owner.query<{ id: string }>(
        `insert into auth.environments (id, project_id, kind) values ($1, $2, 'production') returning id`,
        [uuid(), region.otherProjectId]
      )
      const target = { environmentId: doomed.rows[0]?.id ?? '', projectId: region.otherProjectId }
      await addUser(target, 'doomed@example.test')
      await owner.query('delete from auth.environments where id = $1', [target.environmentId])
      const left = await inEnv(target.environmentId, (client) =>
        client.query('select id from auth.users')
      )
      expect(left.rows).toEqual([])
    })
  })

  describe('one environment cannot reach another, table by table', () => {
    interface Case {
      table: string
      /** Columns after id, project_id and environment_id, and their values. */
      columns: string
      values: string
      /** A `set` clause the service role may run on the table, or none if it holds no UPDATE. */
      update?: string
    }
    const cases: Case[] = [
      {
        table: 'webhook_endpoints',
        columns: 'url, event_types, secret',
        values: `'https://x.example.test', '{}', 'sealed'`,
        update: `url = 'https://hacked.example.test'`,
      },
      {
        table: 'hooks',
        columns: 'point, url, secret',
        values: `'before_sign_up', 'https://h.example.test', 'sealed'`,
        update: 'enabled = false',
      },
      {
        table: 'events',
        columns: 'type, payload, occurred_at, delivered_at',
        values: `'it.cross', '{}', now() - interval '2 days', now()`,
        update: 'delivered_at = null',
      },
      {
        table: 'audit_logs',
        columns: 'actor_type, action, occurred_at',
        values: `'system', 'it.cross', now() - interval '2 days'`,
      },
      {
        table: 'sms_code_counts',
        columns: 'day, prefix, sent',
        values: `(now() at time zone 'utc')::date - 30, '+9', 1`,
        update: 'sent = 5',
      },
    ]

    test.each(cases)(
      '$table: not readable, writable, updatable or deletable from another environment',
      async (spec) => {
        const id = uuid()
        await inEnv(region.b.environmentId, (client) =>
          client.query(
            `insert into auth.${spec.table} (id, project_id, environment_id, ${spec.columns})
           values ($1, $2, $3, ${spec.values})`,
            [id, region.b.projectId, region.b.environmentId]
          )
        )
        const seenByB = await inEnv(region.b.environmentId, (client) =>
          client.query(`select id from auth.${spec.table} where id = $1`, [id])
        )
        expect(seenByB.rowCount, 'the row exists for its own environment').toBe(1)

        const seenByA = await inEnv(region.a.environmentId, (client) =>
          client.query(`select id from auth.${spec.table} where id = $1`, [id])
        )
        expect(seenByA.rowCount, 'read from another environment').toBe(0)

        if (spec.update) {
          const updated = await inEnv(region.a.environmentId, (client) =>
            client.query(`update auth.${spec.table} set ${spec.update} where id = $1`, [id])
          )
          expect(updated.rowCount, 'update from another environment').toBe(0)
        }
        const removed = await inEnv(region.a.environmentId, (client) =>
          client.query(`delete from auth.${spec.table} where id = $1`, [id])
        )
        expect(removed.rowCount, 'removal from another environment').toBe(0)

        const smuggled = await rejectionOf(
          inEnv(region.a.environmentId, (client) =>
            client.query(
              `insert into auth.${spec.table} (id, project_id, environment_id, ${spec.columns})
             values ($1, $2, $3, ${spec.values})`,
              [uuid(), region.b.projectId, region.b.environmentId]
            )
          )
        )
        expect(smuggled, 'write into another environment').toContain('row-level security')

        const still = await inEnv(region.b.environmentId, (client) =>
          client.query(`select id from auth.${spec.table} where id = $1`, [id])
        )
        expect(still.rowCount, 'the row is untouched').toBe(1)
      }
    )
  })

  describe('the database holds the rules the code relies on', () => {
    const session = async (target: Region['a'], userId: string, thumbprint: string | null) => {
      const id = uuid()
      await inEnv(target.environmentId, (client) =>
        client.query(
          `insert into auth.sessions (id, project_id, environment_id, user_id, profile, client,
                                      last_active_at, idle_expires_at, device_thumbprint)
           values ($1, $2, $3, $4, 'web', 'web', now(), now() + interval '1 day', $5)`,
          [id, target.projectId, target.environmentId, userId, thumbprint]
        )
      )
      return id
    }

    test("a session's device binding cannot be changed, moved or removed", async () => {
      const user = await addUser(region.a, 'bound@example.test')
      const sessionId = await session(region.a, user.id, 'A'.repeat(43))
      for (const value of ['B'.repeat(43), null]) {
        const message = await rejectionOf(
          inEnv(region.a.environmentId, (client) =>
            client.query('update auth.sessions set device_thumbprint = $1 where id = $2', [
              value,
              sessionId,
            ])
          )
        )
        expect(message).toContain('fixed when the session is created')
      }
      await inEnv(region.a.environmentId, (client) =>
        client.query('update auth.sessions set last_active_at = now() where id = $1', [sessionId])
      )
    })

    test('a device thumbprint must be 43 base64url characters on a hybrid session', async () => {
      const user = await addUser(region.a, 'shape@example.test')
      const message = await rejectionOf(session(region.a, user.id, 'too short'))
      expect(message).toContain('sessions_device_thumbprint_shape')
    })

    test('an account has its address in both spellings or in neither', async () => {
      const message = await rejectionOf(
        inEnv(region.a.environmentId, (client) =>
          client.query(
            `insert into auth.users (id, project_id, environment_id, email) values ($1, $2, $3, 'x@y.test')`,
            [uuid(), region.a.projectId, region.a.environmentId]
          )
        )
      )
      expect(message).toContain('users_email_whole')
    })

    test("a hook's deadline cannot be set outside 100 to 5000 ms, whatever the writer", async () => {
      for (const deadline of [99, 5001]) {
        const message = await rejectionOf(
          inEnv(region.a.environmentId, (client) =>
            client.query(
              `insert into auth.hooks (id, project_id, environment_id, point, url, secret, deadline_ms)
               values ($1, $2, $3, 'before_sign_up', 'https://h.example.test', 'sealed', $4)`,
              [uuid(), region.a.projectId, region.a.environmentId, deadline]
            )
          )
        )
        expect(message).toContain('hooks_deadline_bounds')
      }
    })

    test("a hook's sealed secret cannot be rewritten by the service role", async () => {
      const hookId = uuid()
      await inEnv(region.b.environmentId, (client) =>
        client.query(
          `insert into auth.hooks (id, project_id, environment_id, point, url, secret)
           values ($1, $2, $3, 'before_token', 'https://h.example.test', 'sealed')`,
          [hookId, region.b.projectId, region.b.environmentId]
        )
      )
      const message = await rejectionOf(
        inEnv(region.b.environmentId, (client) =>
          client.query(`update auth.hooks set secret = 'swapped' where id = $1`, [hookId])
        )
      )
      expect(message).toContain('permission denied for table hooks')
    })

    test('a proposal that can be approved a day later cannot be written', async () => {
      const message = await rejectionOf(
        inEnv(region.a.environmentId, (client) =>
          client.query(
            `insert into auth.proposals (id, project_id, environment_id, operation, target_type, target_id,
                                         proposed_by, expires_at)
             values ($1, $2, $3, 'ban_user', 'user', $4, $5, now() + interval '1 day')`,
            [uuid(), region.a.projectId, region.a.environmentId, uuid(), uuid()]
          )
        )
      )
      expect(message).toContain('proposals_lifetime_bounds')
    })

    test('a proposal can target a user, a session or an OAuth provider by name, and nothing else', async () => {
      const add = (targetId: string) =>
        inEnv(region.a.environmentId, (client) =>
          client.query(
            `insert into auth.proposals (id, project_id, environment_id, operation, target_type, target_id,
                                         proposed_by, expires_at)
             values ($1, $2, $3, 'disable_provider', 'oauth_provider', $4, $5, now() + interval '10 minutes')`,
            [uuid(), region.a.projectId, region.a.environmentId, targetId, uuid()]
          )
        )
      await add('google')
      await add(uuid())
      for (const bad of ['Bad Target!', 'Google', 'a'.repeat(65), '']) {
        const message = await rejectionOf(add(bad))
        expect(message, JSON.stringify(bad)).toContain('proposals_target_id_shape')
      }
      const column = await owner.query<{ type: string }>(
        `select data_type as type from information_schema.columns
          where table_schema = 'auth' and table_name = 'proposals' and column_name = 'target_id'`
      )
      expect(column.rows).toEqual([{ type: 'text' }])
    })

    test('a count of texted codes is never removed until its day is a week old', async () => {
      const insert = (client: PoolClient, prefix: string, daysAgo: number) =>
        client.query(
          `insert into auth.sms_code_counts (id, project_id, environment_id, day, prefix, sent)
           values ($1, $2, $3, (now() at time zone 'utc')::date - $4::int, $5, 1)`,
          [uuid(), region.a.projectId, region.a.environmentId, daysAgo, prefix]
        )
      await inEnv(region.a.environmentId, async (client) => {
        await insert(client, '+11', 0)
        await insert(client, '+12', 7)
        await insert(client, '+13', 8)
        await insert(client, '+14', 40)
      })
      const removed = await inEnv(region.a.environmentId, (client) =>
        client.query(
          `delete from auth.sms_code_counts where prefix in ('+11', '+12', '+13', '+14') returning prefix`
        )
      )
      expect(removed.rows.map((row) => row.prefix).sort()).toEqual(['+13', '+14'])
      const left = await inEnv(region.a.environmentId, (client) =>
        client.query(
          `select prefix from auth.sms_code_counts where prefix in ('+11', '+12', '+13', '+14')`
        )
      )
      expect(left.rows.map((row) => row.prefix).sort()).toEqual(['+11', '+12'])
    })

    test('a settled webhook delivery is removed only after a week, and a pending one never', async () => {
      const endpointId = uuid()
      await inEnv(region.a.environmentId, (client) =>
        client.query(
          `insert into auth.webhook_endpoints (id, project_id, environment_id, url, event_types, secret)
           values ($1, $2, $3, 'https://floor.example.test', '{}', 'sealed')`,
          [endpointId, region.a.projectId, region.a.environmentId]
        )
      )
      const rows: Record<string, string> = {}
      const insert = (client: PoolClient, name: string, state: string, age: string) => {
        rows[name] = uuid()
        return client.query(
          `insert into auth.webhook_deliveries (id, project_id, environment_id, endpoint_id, event_type, state, created_at)
           values ($1, $2, $3, $4, 'it.floor', $5, now() - $6::interval)`,
          [rows[name], region.a.projectId, region.a.environmentId, endpointId, state, age]
        )
      }
      await inEnv(region.a.environmentId, async (client) => {
        await insert(client, 'youngSettled', 'delivered', '1 hour')
        await insert(client, 'edgeSettled', 'failed', '6 days')
        await insert(client, 'oldDelivered', 'delivered', '8 days')
        await insert(client, 'oldFailed', 'failed', '9 days')
        await insert(client, 'oldPending', 'pending', '30 days')
      })
      const removed = await inEnv(region.a.environmentId, (client) =>
        client.query(
          `delete from auth.webhook_deliveries where event_type = 'it.floor' returning id`
        )
      )
      expect(removed.rows.map((row) => row.id).sort()).toEqual(
        [rows.oldDelivered, rows.oldFailed].sort()
      )
    })

    test('an environment has at most one active signing key', async () => {
      const add = () =>
        inEnv(region.a.environmentId, (client) =>
          client.query(
            `insert into auth.signing_keys (id, project_id, environment_id, public_jwk, private_key_ciphertext, status)
             values ($1, $2, $3, '{}', 'ciphertext', 'active')`,
            [uuid(), region.a.projectId, region.a.environmentId]
          )
        )
      await add()
      const message = await rejectionOf(add())
      expect(message).toContain('signing_keys_one_active_per_environment')
    })

    test('the audit log is append-only, and an entry younger than a day is never deleted', async () => {
      const insert = (client: PoolClient, occurred: string) =>
        client.query(
          `insert into auth.audit_logs (id, project_id, environment_id, actor_type, action, occurred_at)
           values ($1, $2, $3, 'system', 'it.test', now() - $4::interval)`,
          [uuid(), region.a.projectId, region.a.environmentId, occurred]
        )
      await inEnv(region.a.environmentId, async (client) => {
        await insert(client, '2 days')
        await insert(client, '1 hour')
      })
      const update = await rejectionOf(
        inEnv(region.a.environmentId, (client) =>
          client.query(`update auth.audit_logs set action = 'it.forged'`)
        )
      )
      expect(update).toContain('permission denied for table audit_logs')
      const removed = await inEnv(region.a.environmentId, (client) =>
        client.query(`delete from auth.audit_logs where action = 'it.test'`)
      )
      expect(removed.rowCount).toBe(1)
      const left = await inEnv(region.a.environmentId, (client) =>
        client.query(`select id from auth.audit_logs where action = 'it.test'`)
      )
      expect(left.rows).toHaveLength(1)
    })

    test('an event is changed only by marking it delivered, and deleted only once settled', async () => {
      const insert = (client: PoolClient, age: string, delivered: boolean) =>
        client.query(
          `insert into auth.events (id, project_id, environment_id, type, payload, occurred_at, delivered_at)
           values ($1, $2, $3, 'it.event', '{}', now() - $4::interval, $5)`,
          [uuid(), region.a.projectId, region.a.environmentId, age, delivered ? new Date() : null]
        )
      await inEnv(region.a.environmentId, async (client) => {
        await insert(client, '2 days', true)
        await insert(client, '2 days', false)
        await insert(client, '1 hour', true)
      })
      const payload = await rejectionOf(
        inEnv(region.a.environmentId, (client) =>
          client.query(`update auth.events set payload = '{"forged":true}'`)
        )
      )
      expect(payload).toContain('permission denied for table events')
      await inEnv(region.a.environmentId, (client) =>
        client.query(`update auth.events set delivered_at = now() where type = 'it.event'`)
      )
      const removed = await inEnv(region.a.environmentId, (client) =>
        client.query(`delete from auth.events where type = 'it.event'`)
      )
      // Only the 2-day-old ones are past the floor; the hour-old one stays.
      expect(removed.rowCount).toBe(2)
    })

    test('a delivery attempt cannot be rewritten or removed by the service role', async () => {
      const endpointId = uuid()
      const deliveryId = uuid()
      await inEnv(region.a.environmentId, async (client) => {
        await client.query(
          `insert into auth.webhook_endpoints (id, project_id, environment_id, url, event_types, secret)
           values ($1, $2, $3, 'https://e.example.test', '{}', 'sealed')`,
          [endpointId, region.a.projectId, region.a.environmentId]
        )
        await client.query(
          `insert into auth.webhook_deliveries (id, project_id, environment_id, endpoint_id, event_type, state)
           values ($1, $2, $3, $4, 'it.event', 'pending')`,
          [deliveryId, region.a.projectId, region.a.environmentId, endpointId]
        )
        await client.query(
          `insert into auth.webhook_delivery_attempts (id, project_id, environment_id, delivery_id, attempt, attempted_at, duration_ms)
           values ($1, $2, $3, $4, 1, now(), 12)`,
          [uuid(), region.a.projectId, region.a.environmentId, deliveryId]
        )
      })
      for (const statement of [
        `update auth.webhook_delivery_attempts set duration_ms = 1`,
        `delete from auth.webhook_delivery_attempts`,
      ]) {
        const message = await rejectionOf(
          inEnv(region.a.environmentId, (client) => client.query(statement))
        )
        expect(message).toContain('permission denied for table webhook_delivery_attempts')
      }
      // A pending delivery is never deleted, whatever its age.
      const removed = await inEnv(region.a.environmentId, (client) =>
        client.query('delete from auth.webhook_deliveries where id = $1', [deliveryId])
      )
      expect(removed.rowCount).toBe(0)
    })

    test("a password change moves a user's history back in one statement, never to a taken place", async () => {
      const user = await addUser(region.a, 'history@example.test')
      const row = (client: PoolClient, position: number) =>
        client.query(
          `insert into auth.password_history (id, project_id, environment_id, user_id, secret, position)
           values ($1, $2, $3, $4, 'argon2id-hash', $5)`,
          [uuid(), region.a.projectId, region.a.environmentId, user.id, position]
        )
      await inEnv(region.a.environmentId, async (client) => {
        await row(client, 1)
        await row(client, 2)
      })
      const duplicate = await rejectionOf(inEnv(region.a.environmentId, (client) => row(client, 2)))
      expect(duplicate).toContain('password_history_user_position_unique')
      const moved = await inEnv(region.a.environmentId, (client) =>
        client.query(
          'update auth.password_history set position = position + 1 where user_id = $1',
          [user.id]
        )
      )
      expect(moved.rowCount).toBe(2)
      const rewrite = await rejectionOf(
        inEnv(region.a.environmentId, (client) =>
          client.query(`update auth.password_history set secret = 'weaker' where user_id = $1`, [
            user.id,
          ])
        )
      )
      expect(rewrite).toContain('permission denied for table password_history')
    })
  })
})
