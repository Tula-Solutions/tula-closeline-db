import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { text } from 'drizzle-orm/pg-core'
import { Pool } from 'pg'
import { createDb, type DbHandle } from './client'
import { integrationEnv, migrateUp, rejectionOf } from './integration-support'
import { coreSchema } from './schema'
import { tenantRlsStatements, withOrganization } from './tenant'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`
const tableName = `it_tenant_${suffix}`
const A = `org_${'a1'.repeat(16)}`
const B = `org_${'b2'.repeat(16)}`

const items = coreSchema.table(tableName, {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  note: text('note').notNull(),
})

const RLS = 'row-level security'

describe('tenant isolation on a table with the row-level-security helper', () => {
  let owner: Pool
  let core: DbHandle

  const idsOf = (rows: { id: string }[]): string[] => rows.map((row) => row.id).sort()

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 1 })
    await owner.query(
      `create table "core"."${tableName}" (id text primary key, organization_id text not null, note text not null)`
    )
    for (const statement of tenantRlsStatements('core', tableName)) {
      await owner.query(statement)
    }
    // A pool of one makes "does the setting leak to the next checkout?" deterministic.
    core = createDb(env.core, { max: 1 })
    await withOrganization(core.db, A, (tx) =>
      tx.insert(items).values([
        { id: 'a1', organizationId: A, note: 'a one' },
        { id: 'a2', organizationId: A, note: 'a two' },
      ])
    )
    await withOrganization(core.db, B, (tx) =>
      tx.insert(items).values({ id: 'b1', organizationId: B, note: 'b one' })
    )
  })

  afterAll(async () => {
    await owner.query(`drop table if exists "core"."${tableName}"`)
    await owner.end()
    await core.close()
  })

  test('with no organization set, no row is visible', async () => {
    expect(await core.db.select().from(items)).toEqual([])
  })

  test('with no organization set, an insert is refused', async () => {
    const message = await rejectionOf(
      core.db.insert(items).values({ id: 'x1', organizationId: A, note: 'bare' })
    )
    expect(message).toContain(RLS)
  })

  test('with no organization set, an update or delete changes nothing', async () => {
    await core.db.update(items).set({ note: 'changed' })
    await core.db.delete(items)
    const seen = await withOrganization(core.db, A, (tx) => tx.select().from(items))
    expect(idsOf(seen)).toEqual(['a1', 'a2'])
    expect(seen.every((row) => row.note !== 'changed')).toBe(true)
  })

  test('inside withOrganization(A) only A rows are visible', async () => {
    const seen = await withOrganization(core.db, A, (tx) => tx.select().from(items))
    expect(idsOf(seen)).toEqual(['a1', 'a2'])
    expect(seen.every((row) => row.organizationId === A)).toBe(true)
  })

  test('inside withOrganization(B) only B rows are visible', async () => {
    const seen = await withOrganization(core.db, B, (tx) => tx.select().from(items))
    expect(idsOf(seen)).toEqual(['b1'])
  })

  test('a row inserted inside A with B organization_id is refused', async () => {
    const message = await rejectionOf(
      withOrganization(core.db, A, (tx) =>
        tx.insert(items).values({ id: 'x2', organizationId: B, note: 'smuggled' })
      )
    )
    expect(message).toContain(RLS)
    const seen = await withOrganization(core.db, B, (tx) => tx.select().from(items))
    expect(idsOf(seen)).toEqual(['b1'])
  })

  test('an update inside A cannot move a row to B', async () => {
    const message = await rejectionOf(
      withOrganization(core.db, A, (tx) =>
        tx.update(items).set({ organizationId: B }).where(eq(items.id, 'a1'))
      )
    )
    expect(message).toContain(RLS)
    const seen = await withOrganization(core.db, A, (tx) => tx.select().from(items))
    expect(idsOf(seen)).toEqual(['a1', 'a2'])
  })

  test('inside A, B rows can be neither updated nor deleted', async () => {
    await withOrganization(core.db, A, async (tx) => {
      await tx.update(items).set({ note: 'hijacked' }).where(eq(items.id, 'b1'))
      await tx.delete(items).where(eq(items.id, 'b1'))
    })
    const seen = await withOrganization(core.db, B, (tx) => tx.select().from(items))
    expect(seen).toEqual([{ id: 'b1', organizationId: B, note: 'b one' }])
  })

  test('the setting does not leak to the next query on the same pooled connection', async () => {
    const inside = await withOrganization(core.db, A, async (tx) => {
      const result = await tx.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`)
      return result.rows[0]?.pid
    })
    const after = await core.db.execute<{ pid: number; setting: string | null }>(
      sql`select pg_backend_pid() as pid,
                 nullif(current_setting('app.organization_id', true), '') as setting`
    )
    // Same backend: this is the connection the transaction used.
    expect(after.rows[0]?.pid).toBe(inside)
    expect(after.rows[0]?.setting).toBeNull()
    expect(await core.db.select().from(items)).toEqual([])
  })

  test('the setting does not leak when the callback throws', async () => {
    await rejectionOf(
      withOrganization(core.db, A, async () => {
        throw new Error('boom')
      })
    )
    expect(await core.db.select().from(items)).toEqual([])
  })

  test('two concurrent organizations on a pool of one each see only their own rows', async () => {
    const read = (organizationId: string) =>
      withOrganization(core.db, organizationId, async (tx) => {
        await tx.execute(sql`select pg_sleep(0.05)`)
        return idsOf(await tx.select().from(items))
      })
    const results = await Promise.all([read(A), read(B), read(A), read(B)])
    expect(results).toEqual([['a1', 'a2'], ['b1'], ['a1', 'a2'], ['b1']])
  })

  test('a row with an empty organization_id stays hidden while the setting is empty', async () => {
    // Only the owner can plant it, and only by lifting FORCE for the insert, as a bad backfill might.
    const client = await owner.connect()
    try {
      await client.query('begin')
      await client.query(`alter table "core"."${tableName}" no force row level security`)
      await client.query(`insert into "core"."${tableName}" values ('e1', '', 'empty')`)
      await client.query(`alter table "core"."${tableName}" force row level security`)
      await client.query('commit')
    } finally {
      client.release()
    }
    await core.db.execute(sql`select set_config('app.organization_id', '', false)`)
    expect(await core.db.select().from(items)).toEqual([])
    const message = await rejectionOf(
      core.db.insert(items).values({ id: 'e2', organizationId: '', note: 'empty' })
    )
    expect(message).toContain(RLS)
    await core.db.execute(sql`reset app.organization_id`)
  })

  test('the table owner is bound by the policy too, because row-level security is forced', async () => {
    const flags = await owner.query<{ enabled: boolean; forced: boolean }>(
      `select relrowsecurity as enabled, relforcerowsecurity as forced
         from pg_class where oid = $1::regclass`,
      [`core.${tableName}`]
    )
    expect(flags.rows).toEqual([{ enabled: true, forced: true }])
    const rows = await owner.query(`select * from "core"."${tableName}"`)
    expect(rows.rows).toEqual([])
    const message = await rejectionOf(
      owner.query(`insert into "core"."${tableName}" values ('o1', '${A}', 'owner')`)
    )
    expect(message).toContain(RLS)
  })

  test('another service role cannot reach the table at all', async () => {
    const playbook = createDb(env.playbook, { max: 1 })
    try {
      const message = await rejectionOf(
        withOrganization(playbook.db, A, (tx) => tx.select().from(items))
      )
      expect(message).toContain('permission denied for schema core')
    } finally {
      await playbook.close()
    }
  })
})
