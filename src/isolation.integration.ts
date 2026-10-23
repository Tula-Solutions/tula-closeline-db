import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { createDb, type DbHandle } from './client'
import { ENVIRONMENT_SETTING } from './environment'
import {
  adminUrl,
  dropStaleTestObjects,
  integrationEnv,
  migrateUp,
  resetTestRoles,
} from './integration-support'
import {
  ALLOWED_PREDEFINED_ROLES,
  assertTenantIsolation,
  findTenantIsolationGaps,
} from './isolation'
import { TENANT_POLICY_EXPRESSION, tenantRlsStatements } from './tenant'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`
const table = `it_gap_${suffix}`
const qualified = `core.${table}`
/** The environment predicate as a migration would write it, for tests that build a policy by hand. */
const ENVIRONMENT_POLICY_SQL = `environment_id = nullif(current_setting('${ENVIRONMENT_SETTING}', true), '')::uuid`

describe('the tenant isolation catalog check', () => {
  let owner: Pool
  let handle: DbHandle

  const gapsFor = async (allowlist?: readonly string[]) =>
    (await findTenantIsolationGaps(handle.db, allowlist)).filter((gap) => gap.table === table)

  const reset = async (columns: string) => {
    await owner.query(`drop table if exists "core"."${table}"`)
    await owner.query(`create table "core"."${table}" (${columns})`)
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 1 })
    await dropStaleTestObjects(owner, env.owner)
    handle = createDb(env.owner, { max: 1 })
  })

  afterAll(async () => {
    await owner.query(`drop table if exists "core"."${table}"`)
    await owner.end()
    await handle.close()
  })

  test('the migrated database has no table without fail-closed isolation', async () => {
    expect(await findTenantIsolationGaps(handle.db)).toEqual([])
    await assertTenantIsolation(handle.db)
  })

  test('a table with organization_id and no row-level security is reported', async () => {
    await reset('id text primary key, organization_id text not null')
    const gaps = await gapsFor()
    expect(gaps.map((gap) => `${gap.schema}.${gap.table}`)).toEqual([qualified])
    expect(gaps[0]?.reason).toContain('row-level security')
    const failure = await assertTenantIsolation(handle.db).catch((error: Error) => error)
    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error).message).toContain(qualified)
  })

  test('enabled but not forced row-level security is reported', async () => {
    await reset('id text primary key, organization_id text not null')
    await owner.query(`alter table "core"."${table}" enable row level security`)
    expect((await gapsFor())[0]?.reason).toContain('forced')
  })

  test('forced row-level security with no policy is reported', async () => {
    await reset('id text primary key, organization_id text not null')
    await owner.query(`alter table "core"."${table}" enable row level security`)
    await owner.query(`alter table "core"."${table}" force row level security`)
    expect((await gapsFor())[0]?.reason).toContain('policy')
  })

  test('a policy that does not compare against app.organization_id is reported', async () => {
    await reset('id text primary key, organization_id text not null')
    await owner.query(`alter table "core"."${table}" enable row level security`)
    await owner.query(`alter table "core"."${table}" force row level security`)
    await owner.query(`create policy open_all on "core"."${table}" using (true) with check (true)`)
    expect((await gapsFor())[0]?.reason).toContain('app.organization_id')
  })

  test('a second permissive policy that opens the table is reported', async () => {
    await reset('id text primary key, organization_id text not null')
    for (const statement of tenantRlsStatements('core', table)) {
      await owner.query(statement)
    }
    expect(await gapsFor()).toEqual([])
    await owner.query(`create policy open_all on "core"."${table}" using (true)`)
    expect((await gapsFor())[0]?.reason).toContain('app.organization_id')
  })

  test('a table without organization_id is reported unless it is on the allowlist', async () => {
    await reset('id text primary key')
    expect((await gapsFor())[0]?.reason).toContain('organization_id')
    // An allowlisted table has no row-level security, so no service role may be able to read it.
    await owner.query(`revoke all on "core"."${table}" from closeline_core`)
    expect(await gapsFor([qualified])).toEqual([])
  })

  test.each([
    ['a table SELECT', (t: string) => `grant select on ${t} to closeline_core`],
    ['a single-column SELECT', (t: string) => `grant select (id) on ${t} to closeline_core`],
    ['a SELECT to PUBLIC', (t: string) => `grant select on ${t} to public`],
    ['a table INSERT', (t: string) => `grant insert on ${t} to closeline_core`],
    ['a single-column INSERT', (t: string) => `grant insert (id) on ${t} to closeline_core`],
    ['an INSERT to PUBLIC', (t: string) => `grant insert on ${t} to public`],
    ['a table UPDATE', (t: string) => `grant update on ${t} to closeline_core`],
    ['a single-column UPDATE', (t: string) => `grant update (id) on ${t} to closeline_core`],
    ['a table DELETE', (t: string) => `grant delete on ${t} to closeline_core`],
    ['a TRUNCATE', (t: string) => `grant truncate on ${t} to closeline_core`],
    ['a table REFERENCES', (t: string) => `grant references on ${t} to closeline_core`],
    [
      'a single-column REFERENCES',
      (t: string) => `grant references (id) on ${t} to closeline_core`,
    ],
    ['a TRIGGER', (t: string) => `grant trigger on ${t} to closeline_core`],
    ['a MAINTAIN (LOCK TABLE, VACUUM)', (t: string) => `grant maintain on ${t} to closeline_core`],
  ])(
    'an allowlisted table a service role holds a privilege on is reported: %s',
    async (_name, grant) => {
      await reset('id text primary key')
      await owner.query(`revoke all on "core"."${table}" from closeline_core`)
      expect(await gapsFor([qualified])).toEqual([])
      await owner.query(grant(qualified))
      const gaps = await gapsFor([qualified])
      expect(gaps.map((gap) => `${gap.schema}.${gap.table}`)).toEqual([qualified])
      expect(gaps[0]?.reason).toContain('closeline_core')
      expect(gaps[0]?.reason).toContain('SECURITY DEFINER')
      const failure = await assertTenantIsolation(handle.db, [qualified]).catch((e: Error) => e)
      expect((failure as Error).message).toContain(qualified)
    }
  )

  test('the owner holding every privilege on an allowlisted table is not a gap', async () => {
    await reset('id text primary key')
    await owner.query(`revoke all on "core"."${table}" from closeline_core`)
    expect(await gapsFor([qualified])).toEqual([])
  })

  test('a table protected by tenantRlsStatements passes', async () => {
    await reset('id text primary key, organization_id text not null')
    for (const statement of tenantRlsStatements('core', table)) {
      await owner.query(statement)
    }
    expect(await gapsFor()).toEqual([])
    // Pins how this Postgres deparses the policy. If a version words it differently the check
    // would report every protected table, and this fails first with the text in hand.
    const policies = await owner.query<{ qual: string; with_check: string }>(
      'select qual, with_check from pg_policies where schemaname = $1 and tablename = $2',
      ['core', table]
    )
    expect(policies.rows).toEqual([
      { qual: TENANT_POLICY_EXPRESSION, with_check: TENANT_POLICY_EXPRESSION },
    ])
  })

  const setting = `current_setting('app.organization_id', true)`
  test.each([
    ['an OR true escape', `organization_id = ${setting} OR true`],
    ['an OR on another column', `organization_id = ${setting} OR visibility = 'public'`],
    ['a leading true', `true OR ${setting} IS NULL`],
    ['the wrong column', `id = ${setting}`],
    ['no NULLIF for the empty setting', `organization_id = ${setting}`],
  ])('a policy with %s is reported', async (_name, expression) => {
    await reset(`id text primary key, organization_id text not null, visibility text`)
    await owner.query(`alter table "core"."${table}" enable row level security`)
    await owner.query(`alter table "core"."${table}" force row level security`)
    await owner.query(
      `create policy weak on "core"."${table}" using (${expression}) with check (${expression})`
    )
    expect((await gapsFor())[0]?.reason).toContain('canonical')
  })

  test('a table in a schema that is not a service schema is reported', async () => {
    const other = `it_schema_${suffix}`
    await owner.query(`create schema "${other}"`)
    try {
      await owner.query(`create table "${other}"."things" (id text, organization_id text)`)
      const gaps = await findTenantIsolationGaps(handle.db)
      expect(gaps.filter((gap) => gap.schema === other).map((gap) => gap.table)).toEqual(['things'])
    } finally {
      await owner.query(`drop schema "${other}" cascade`)
    }
  })

  test('a leftover test table from a killed run is dropped before the suite starts', async () => {
    await owner.query(`create table "core"."it_gap_stale_${suffix}" (id text)`)
    expect((await findTenantIsolationGaps(handle.db)).length).toBeGreaterThan(0)
    await dropStaleTestObjects(owner, env.owner)
    expect(await findTenantIsolationGaps(handle.db)).toEqual([])
  })

  test('cleanup leaves a schema the suites did not create alone', async () => {
    const keep = `it_keep_${suffix}`
    await owner.query(`create schema "${keep}"`)
    try {
      await dropStaleTestObjects(owner, env.owner)
      const found = await owner.query('select 1 from pg_namespace where nspname = $1', [keep])
      expect(found.rowCount).toBe(1)
    } finally {
      await owner.query(`drop schema if exists "${keep}" cascade`)
    }
  })

  test('cleanup drops a leftover schema the suites create', async () => {
    const stale = `it_schema_stale_${suffix}`
    await owner.query(`create schema "${stale}"`)
    await dropStaleTestObjects(owner, env.owner)
    const found = await owner.query('select 1 from pg_namespace where nspname = $1', [stale])
    expect(found.rowCount).toBe(0)
  })

  test.each([
    ['a table', 'create table public.IT_NAME (id int)', 'drop table if exists public.IT_NAME'],
    [
      'a view',
      'create view public.IT_NAME as select 1 as id',
      'drop view if exists public.IT_NAME',
    ],
    [
      'a materialized view',
      'create materialized view public.IT_NAME as select 1 as id',
      'drop materialized view if exists public.IT_NAME',
    ],
  ])('%s in public is reported, and cleanup removes it', async (_name, create, remove) => {
    const name = `it_public_${suffix}`
    await owner.query(create.replace('IT_NAME', name))
    try {
      const gaps = (await findTenantIsolationGaps(handle.db)).filter((gap) => gap.table === name)
      expect(gaps.map((gap) => gap.schema)).toEqual(['public'])
      await dropStaleTestObjects(owner, env.owner)
      expect(await findTenantIsolationGaps(handle.db)).toEqual([])
    } finally {
      await owner.query(remove.replace('IT_NAME', name))
    }
  })

  test('a view in a service schema is reported', async () => {
    await reset('id text primary key, organization_id text not null')
    for (const statement of tenantRlsStatements('core', table)) {
      await owner.query(statement)
    }
    await owner.query(`create view "core"."${table}_view" as select * from "core"."${table}"`)
    try {
      const gaps = (await findTenantIsolationGaps(handle.db)).filter(
        (gap) => gap.table === `${table}_view`
      )
      expect(gaps.length).toBe(1)
    } finally {
      await owner.query(`drop view "core"."${table}_view"`)
    }
  })
})

describe('the check on the auth tables', () => {
  let owner: Pool

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 1 })
    await dropStaleTestObjects(owner, env.owner)
  })

  afterAll(async () => {
    await owner.end()
  })

  /** Run `change` in a transaction, report the gaps it causes on `auth`, and roll it back. */
  const gapsAfter = async (change: string | undefined) => {
    const client = await owner.connect()
    try {
      await client.query('begin')
      if (change) {
        await client.query(change)
      }
      const gaps = await findTenantIsolationGaps(drizzle(client))
      return gaps.filter((gap) => gap.schema === 'auth')
    } finally {
      await client.query('rollback')
      client.release()
    }
  }

  test('the migrated auth schema has no gap', async () => {
    expect(await gapsAfter(undefined)).toEqual([])
  })

  test.each([
    [
      'a dropped policy',
      'drop policy hooks_tenant_isolation on auth.hooks',
      'no permissive policy',
    ],
    ['NO FORCE', 'alter table auth.hooks no force row level security', 'forced'],
    ['row-level security disabled', 'alter table auth.hooks disable row level security', 'enabled'],
    [
      'an added policy that opens the table',
      'create policy open_all on auth.hooks using (true)',
      'canonical',
    ],
    [
      'an added permissive policy that is itself canonical',
      `create policy second on auth.hooks using (${ENVIRONMENT_POLICY_SQL}) with check (${ENVIRONMENT_POLICY_SQL})`,
      'exactly one',
    ],
    [
      'a policy widened to an OR',
      `alter policy hooks_tenant_isolation on auth.hooks using (${ENVIRONMENT_POLICY_SQL} or true)`,
      'canonical',
    ],
    [
      'a policy for reads only',
      `drop policy hooks_tenant_isolation on auth.hooks; create policy hooks_tenant_isolation on auth.hooks for select using (${ENVIRONMENT_POLICY_SQL})`,
      'canonical',
    ],
    [
      'an organization_id column',
      'alter table auth.hooks add column organization_id text',
      'organization_id',
    ],
  ])('an environment-scoped table with %s is reported', async (_name, change, reason) => {
    const gaps = await gapsAfter(change)
    expect(gaps.map((gap) => gap.table)).toEqual(['hooks'])
    expect(gaps[0]?.reason).toContain(reason)
  })

  test('a restrictive policy on top of the environment policy is allowed', async () => {
    const change = 'create policy extra_floor on auth.hooks as restrictive for delete using (false)'
    expect(await gapsAfter(change)).toEqual([])
  })

  test('a control-plane table gaining an organization_id column is reported', async () => {
    const gaps = await gapsAfter('alter table auth.workspaces add column organization_id text')
    expect(gaps.map((gap) => gap.table)).toEqual(['workspaces'])
    expect(gaps[0]?.reason).toContain('organization_id')
  })

  test('a new auth table that is in neither category is reported, however well protected', async () => {
    const change = `create table auth.it_unplaced (id uuid primary key, environment_id uuid not null);
      alter table auth.it_unplaced enable row level security;
      alter table auth.it_unplaced force row level security;
      create policy it_unplaced_tenant_isolation on auth.it_unplaced using (${ENVIRONMENT_POLICY_SQL}) with check (${ENVIRONMENT_POLICY_SQL})`
    const gaps = await gapsAfter(change)
    expect(gaps.map((gap) => gap.table)).toEqual(['it_unplaced'])
    expect(gaps[0]?.reason).toContain('CONTROL_PLANE_TABLES')
  })
})

describe('the role check', () => {
  let admin: Pool
  let handle: DbHandle

  beforeAll(async () => {
    await migrateUp(env.owner)
    admin = new Pool({ connectionString: adminUrl(), max: 1 })
    await resetTestRoles(admin, adminUrl())
    handle = createDb(env.owner, { max: 1 })
  })

  afterAll(async () => {
    await handle.close()
    await admin.end()
  })

  const roleGaps = async () =>
    (await findTenantIsolationGaps(handle.db)).filter((gap) => gap.schema === 'pg_roles')

  test('the service roles are not superusers and do not bypass row-level security', async () => {
    expect(await roleGaps()).toEqual([])
  })

  test('a role left behind by a killed run is reset before the suite starts', async () => {
    const leftover = `closeline_it_super_left_${suffix}`
    await admin.query(`create role "${leftover}" superuser`)
    await admin.query('alter role closeline_core bypassrls')
    expect((await roleGaps()).length).toBe(2)
    await resetTestRoles(admin, adminUrl())
    expect(await roleGaps()).toEqual([])
  })

  test('a service role with BYPASSRLS is reported', async () => {
    await admin.query('alter role closeline_core bypassrls')
    try {
      const gaps = await roleGaps()
      expect(gaps.map((gap) => gap.table)).toEqual(['closeline_core'])
      expect(gaps[0]?.reason).toContain('BYPASSRLS')
      const failure = await assertTenantIsolation(handle.db).catch((error: Error) => error)
      expect((failure as Error).message).toContain('closeline_core')
    } finally {
      await admin.query('alter role closeline_core nobypassrls')
    }
    expect(await roleGaps()).toEqual([])
  })

  test('a service role that is a member of a role that is not predefined is reported', async () => {
    // Named closeline_it_super_* so resetTestRoles drops it if this run is killed first.
    const group = `closeline_it_super_group_${suffix}`
    await admin.query(`create role "${group}" nologin`)
    await admin.query(`grant "${group}" to closeline_core`)
    try {
      const gaps = await roleGaps()
      expect(gaps.map((gap) => gap.table)).toEqual(['closeline_core'])
      expect(gaps[0]?.reason).toContain(group)
      const failure = await assertTenantIsolation(handle.db).catch((error: Error) => error)
      expect((failure as Error).message).toContain('closeline_core')
    } finally {
      await admin.query(`drop role "${group}"`)
    }
    expect(await roleGaps()).toEqual([])
  })

  test('a service role in a monitoring role on the allow-list is not reported', async () => {
    for (const role of ALLOWED_PREDEFINED_ROLES) {
      await admin.query(`grant ${role} to closeline_core`)
      try {
        expect(await roleGaps()).toEqual([])
      } finally {
        await admin.query(`revoke ${role} from closeline_core`)
      }
    }
  })

  test.each([
    'pg_read_all_data',
    'pg_write_all_data',
    'pg_execute_server_program',
    'pg_write_server_files',
  ])(
    'a service role in %s is reported, because a predefined role is not safe by being predefined',
    async (predefined) => {
      await admin.query(`grant ${predefined} to closeline_core`)
      try {
        const gaps = await roleGaps()
        expect(gaps.map((gap) => gap.table)).toEqual(['closeline_core'])
        expect(gaps[0]?.reason).toContain(predefined)
      } finally {
        await admin.query(`revoke ${predefined} from closeline_core`)
      }
      expect(await roleGaps()).toEqual([])
    }
  )

  test('a role granted to the owner is not a membership of a service role', async () => {
    await admin.query('grant closeline_core to closeline_owner')
    try {
      expect(await roleGaps()).toEqual([])
    } finally {
      await admin.query('revoke closeline_core from closeline_owner')
    }
  })

  test('closeline_core_search, the Prospect search definer, bypasses row-level security by design', async () => {
    expect(await roleGaps()).toEqual([])
  })

  test('closeline_core_search is reported if it can log in', async () => {
    await admin.query('alter role closeline_core_search login')
    try {
      const gaps = await roleGaps()
      expect(gaps.map((gap) => gap.table)).toEqual(['closeline_core_search'])
      expect(gaps[0]?.reason).toContain('log in')
    } finally {
      await admin.query('alter role closeline_core_search nologin')
    }
    expect(await roleGaps()).toEqual([])
  })

  test('closeline_core_search is reported if it is a superuser', async () => {
    await admin.query('alter role closeline_core_search superuser')
    try {
      expect((await roleGaps()).map((gap) => gap.table)).toEqual(['closeline_core_search'])
    } finally {
      await admin.query('alter role closeline_core_search nosuperuser')
    }
    expect(await roleGaps()).toEqual([])
  })

  test('a service role that is a member of closeline_core_search is reported', async () => {
    await admin.query('grant closeline_core_search to closeline_core')
    try {
      const gaps = await roleGaps()
      expect(gaps.map((gap) => gap.table)).toEqual(['closeline_core'])
      expect(gaps[0]?.reason).toContain('closeline_core_search')
    } finally {
      await admin.query('revoke closeline_core_search from closeline_core')
    }
    expect(await roleGaps()).toEqual([])
  })

  test('a killed run that left closeline_core_search altered is reset before the suite starts', async () => {
    await admin.query('alter role closeline_core_search login nobypassrls')
    await admin.query('grant closeline_core_search to closeline_core')
    expect((await roleGaps()).length).toBeGreaterThan(0)
    await resetTestRoles(admin, adminUrl())
    expect(await roleGaps()).toEqual([])
    const flags = await admin.query(
      `select rolcanlogin, rolbypassrls from pg_roles where rolname = 'closeline_core_search'`
    )
    expect(flags.rows).toEqual([{ rolcanlogin: false, rolbypassrls: true }])
  })

  test('a closeline role that is a superuser is reported', async () => {
    const role = `closeline_it_super_${suffix}`
    await admin.query(`create role "${role}" superuser`)
    try {
      expect((await roleGaps()).map((gap) => gap.table)).toEqual([role])
    } finally {
      await admin.query(`drop role "${role}"`)
    }
  })
})
