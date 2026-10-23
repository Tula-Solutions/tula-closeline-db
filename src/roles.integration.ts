import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Pool } from 'pg'
import { dropStaleTestObjects, integrationEnv, migrateUp, rejectionOf } from './integration-support'

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
  { schema: 'voice', role: 'closeline_voice', url: env.voice },
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
    await dropStaleTestObjects(owner, env.owner)
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

  // `auth` is the exception: its default privileges are revoked (migration 0001), so a new auth
  // table is unreachable until its own migration grants it. auth.integration.ts pins that.
  test('closeline_auth is refused a table the owner just created in auth, until a grant says so', async () => {
    const table = `"auth"."${probe}"`
    const message = await rejectionOf(pool('auth').query(`select id from ${table}`))
    expect(message).toContain(`permission denied for table ${probe}`)
    await owner.query(`grant select on ${table} to closeline_auth`)
    expect((await pool('auth').query(`select id from ${table}`)).rows).toEqual([{ id: 1 }])
  })

  test.each(SERVICES.filter(({ schema }) => schema !== 'auth'))(
    '$role can use tables the owner created in $schema',
    async ({ schema }) => {
      const p = pool(schema)
      const table = `"${schema}"."${probe}"`
      expect((await p.query(`select id from ${table}`)).rows).toEqual([{ id: 1 }])
      await p.query(`insert into ${table} values (2, 'inserted')`)
      await p.query(`update ${table} set note = 'updated' where id = 2`)
      await p.query(`delete from ${table} where id = 2`)
    }
  )

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

describe('closeline_core_search, the role that owns the Prospect search functions', () => {
  let owner: Pool
  const pools = new Map<string, Pool>()
  const pool = (schema: string): Pool => {
    const found = pools.get(schema)
    if (!found) {
      throw new Error(`no pool for ${schema}`)
    }
    return found
  }
  const SEARCH_FUNCTIONS = [
    'search_prospect_ids(text,text,integer)',
    'search_prospect_company_ids(text,text,integer)',
  ]

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 1 })
    for (const { schema, url } of SERVICES) {
      pools.set(schema, new Pool({ connectionString: url, max: 1 }))
    }
  })

  afterAll(async () => {
    await owner.end()
    await Promise.all([...pools.values()].map((p) => p.end()))
  })

  test('cannot log in, bypasses row-level security, is no superuser and inherits nothing', async () => {
    const result = await owner.query(
      `select rolcanlogin, rolbypassrls, rolsuper, rolinherit, rolcreaterole, rolcreatedb
         from pg_roles where rolname = 'closeline_core_search'`
    )
    expect(result.rows).toEqual([
      {
        rolcanlogin: false,
        rolbypassrls: true,
        rolsuper: false,
        rolinherit: false,
        rolcreaterole: false,
        rolcreatedb: false,
      },
    ])
  })

  test('no service role is a member of it, and only the owner role can set it', async () => {
    const members = await owner.query(
      `select m.rolname as member, am.set_option, am.inherit_option
         from pg_auth_members am
         join pg_roles m on m.oid = am.member
         join pg_roles g on g.oid = am.roleid
        where g.rolname = 'closeline_core_search'`
    )
    expect(members.rows).toEqual([
      { member: 'closeline_owner', set_option: true, inherit_option: false },
    ])
  })

  test.each(SERVICES)('$role cannot SET ROLE to it', async ({ schema }) => {
    const message = await rejectionOf(pool(schema).query('set role closeline_core_search'))
    expect(message).toContain('permission denied to set role "closeline_core_search"')
  })

  test('it holds only USAGE on core and column SELECT on the three tables the search reads', async () => {
    const schemas = await owner.query(
      `select n.nspname,
              has_schema_privilege('closeline_core_search', n.oid, 'USAGE') as usage,
              has_schema_privilege('closeline_core_search', n.oid, 'CREATE') as can_create
         from pg_namespace n where n.nspname in ('auth', 'core', 'playbook', 'voice', 'public')
        order by n.nspname`
    )
    expect(schemas.rows.filter((r) => r.usage).map((r) => r.nspname)).toEqual(['core'])
    expect(schemas.rows.some((r) => r.can_create)).toBe(false)
    const tables = await owner.query(
      `select n.nspname || '.' || c.relname as name,
              has_table_privilege('closeline_core_search', c.oid,
                'INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN') as writes,
              has_any_column_privilege('closeline_core_search', c.oid, 'SELECT') as some_columns,
              has_any_column_privilege('closeline_core_search', c.oid, 'INSERT, UPDATE, REFERENCES') as column_writes
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('auth', 'core', 'playbook', 'voice') and c.relkind in ('r', 'p', 'v', 'm', 'f')`
    )
    expect(tables.rows.filter((r) => r.writes || r.column_writes)).toEqual([])
    expect(
      tables.rows
        .filter((r) => r.some_columns)
        .map((r) => r.name)
        .sort()
    ).toEqual(['core.prospect_companies', 'core.prospect_fields', 'core.prospects'])
    // It can execute the two search functions it owns, and nothing but what PUBLIC may execute.
    const functions = await owner.query(
      `select p.oid::regprocedure::text as name from pg_proc p
        where has_function_privilege('closeline_core_search', p.oid, 'EXECUTE')
          and p.pronamespace::regnamespace::text in ('auth', 'core', 'playbook', 'voice')
          and p.proowner <> 'closeline_core_search'::regrole
          and not exists (
            select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
             where a.grantee = 0 and a.privilege_type = 'EXECUTE')`
    )
    expect(functions.rows).toEqual([])
    const owned = await owner.query(
      `select p.oid::regprocedure::text as name from pg_proc p
        where p.proowner = 'closeline_core_search'::regrole order by 1`
    )
    expect(owned.rows.map((r) => r.name)).toEqual([
      'core.search_prospect_company_ids(text,text,integer)',
      'core.search_prospect_ids(text,text,integer)',
    ])
  })

  test.each(SEARCH_FUNCTIONS)('core.%s is a fixed-path definer owned by it', async (signature) => {
    const result = await owner.query(
      `select p.proowner::regrole::text as owner, p.prosecdef, p.provolatile, p.proconfig,
              p.proretset
         from pg_proc p where p.oid = to_regprocedure('core.${signature}')`
    )
    expect(result.rows).toHaveLength(1)
    const row = result.rows[0]
    expect(row.owner).toBe('closeline_core_search')
    expect(row.prosecdef).toBe(true)
    expect(row.provolatile).toBe('s')
    expect(row.proretset).toBe(true)
    expect(row.proconfig).toContain('search_path=pg_catalog, core, public, pg_temp')
  })

  test.each(SEARCH_FUNCTIONS)('EXECUTE on core.%s is closeline_core only', async (signature) => {
    const result = await owner.query(
      `select r.rolname,
              has_function_privilege(r.oid, to_regprocedure('core.${signature}'), 'EXECUTE') as can
         from pg_roles r where r.rolname like 'closeline\\_%' order by r.rolname`
    )
    const allowed = result.rows.filter((r) => r.can).map((r) => r.rolname)
    // closeline_owner reaches it only through its SET membership, closeline_core_search owns it.
    expect(
      allowed.filter((r) => !['closeline_owner', 'closeline_core_search'].includes(r))
    ).toEqual(['closeline_core'])
    const publicCan = await owner.query(
      `select exists (
         select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
          where p.oid = to_regprocedure('core.${signature}') and a.grantee = 0) as public_can`
    )
    expect(publicCan.rows[0].public_can).toBe(false)
  })
})
