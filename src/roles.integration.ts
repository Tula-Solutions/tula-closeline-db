import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Pool } from 'pg'
import { integrationEnv, migrateUp, rejectionOf } from './integration-support'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`
const probe = `it_probe_${suffix}`

interface Service {
  schema: string
  role: string
  url: string
}

const SERVICES: Service[] = [
  { schema: 'auth', role: 'closeline_auth', url: env.auth },
  { schema: 'core', role: 'closeline_core', url: env.core },
  { schema: 'playbook', role: 'closeline_playbook', url: env.playbook },
]

const crossings = SERVICES.flatMap((from) =>
  SERVICES.filter((to) => to.schema !== from.schema).map((to) => ({
    role: from.role,
    from: from.schema,
    to: to.schema,
  }))
)

describe('service roles are confined to their own schema', () => {
  let owner: Pool
  const pools = new Map<string, Pool>()

  const pool = (schema: string): Pool => {
    const found = pools.get(schema)
    if (!found) {
      throw new Error(`no pool for ${schema}`)
    }
    return found
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 1 })
    for (const { schema, url } of SERVICES) {
      // Created by the owner, as a later migration would: default privileges decide who can use it.
      await owner.query(`create table "${schema}"."${probe}" (id int primary key, note text)`)
      await owner.query(`insert into "${schema}"."${probe}" values (1, 'seed')`)
      pools.set(schema, new Pool({ connectionString: url, max: 1 }))
    }
  })

  afterAll(async () => {
    for (const { schema } of SERVICES) {
      await owner.query(`drop table if exists "${schema}"."${probe}"`)
    }
    await owner.end()
    await Promise.all([...pools.values()].map((p) => p.end()))
  })

  test.each(SERVICES)(
    '$role is not a superuser, has no BYPASSRLS and owns nothing',
    async ({ schema, role }) => {
      const p = pool(schema)
      const attributes = await p.query<{ name: string; super: boolean; bypass: boolean }>(
        `select rolname as name, rolsuper as super, rolbypassrls as bypass
         from pg_roles where rolname = current_user`
      )
      expect(attributes.rows).toEqual([{ name: role, super: false, bypass: false }])

      const owned = await p.query<{ count: string }>(
        `select count(*) from pg_class
        where relowner = (select oid from pg_roles where rolname = current_user)`
      )
      expect(owned.rows[0]?.count).toBe('0')
      const schemas = await p.query<{ count: string }>(
        `select count(*) from pg_namespace
        where nspowner = (select oid from pg_roles where rolname = current_user)`
      )
      expect(schemas.rows[0]?.count).toBe('0')
    }
  )

  test.each(SERVICES)('$role can use tables the owner created in $schema', async ({ schema }) => {
    const p = pool(schema)
    const table = `"${schema}"."${probe}"`
    expect((await p.query(`select id from ${table}`)).rows).toEqual([{ id: 1 }])
    await p.query(`insert into ${table} values (2, 'inserted')`)
    await p.query(`update ${table} set note = 'updated' where id = 2`)
    await p.query(`delete from ${table} where id = 2`)
  })

  test.each(SERVICES)('$role cannot create anything in its own schema', async ({ schema }) => {
    const message = await rejectionOf(
      pool(schema).query(`create table "${schema}"."it_own_${suffix}" (id int)`)
    )
    expect(message).toContain('permission denied for schema')
  })

  test.each(SERVICES)('$role cannot create anything in public', async ({ schema }) => {
    const message = await rejectionOf(
      pool(schema).query(`create table public.it_public_${suffix} (id int)`)
    )
    expect(message).toContain('permission denied for schema public')
  })

  test.each(SERVICES)('$role cannot read the migration history', async ({ schema }) => {
    const message = await rejectionOf(
      pool(schema).query('select * from drizzle.__drizzle_migrations')
    )
    expect(message).toContain('permission denied for schema drizzle')
  })

  test.each(crossings)('$role cannot create in the $to schema', async ({ from, to }) => {
    const message = await rejectionOf(
      pool(from).query(`create table "${to}"."it_cross_${suffix}" (id int)`)
    )
    expect(message).toContain(`permission denied for schema ${to}`)
  })

  test.each(crossings)(
    '$role cannot select from a table in the $to schema',
    async ({ from, to }) => {
      const message = await rejectionOf(pool(from).query(`select * from "${to}"."${probe}"`))
      expect(message).toContain(`permission denied for schema ${to}`)
    }
  )

  test.each(crossings)('$role cannot write to a table in the $to schema', async ({ from, to }) => {
    const message = await rejectionOf(
      pool(from).query(`insert into "${to}"."${probe}" values (9, 'x')`)
    )
    expect(message).toContain(`permission denied for schema ${to}`)
  })
})
