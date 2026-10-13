import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Pool } from 'pg'
import { createDb, type DbHandle } from './client'
import { integrationEnv, migrateUp } from './integration-support'
import { assertTenantIsolation, findTenantIsolationGaps } from './isolation'
import { tenantRlsStatements } from './tenant'

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
