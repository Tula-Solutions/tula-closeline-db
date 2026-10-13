import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Pool } from 'pg'
import { createDb, type DbHandle } from './client'
import {
  adminUrl,
  dropStaleTestObjects,
  integrationEnv,
  migrateUp,
  resetTestRoles,
} from './integration-support'
import { assertTenantIsolation, findTenantIsolationGaps } from './isolation'
import { TENANT_POLICY_EXPRESSION, tenantRlsStatements } from './tenant'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`
const table = `it_gap_${suffix}`
const qualified = `core.${table}`

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
