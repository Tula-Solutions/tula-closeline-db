import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool, type PoolClient } from 'pg'
import {
  adminUrl,
  dropStaleTestObjects,
  integrationEnv,
  migrateUp,
  rejectionOf,
} from './integration-support'
import { runMigrations } from './migrate'
import { MEMBER_NAME_MAX } from './schema/core-tables'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const MIGRATIONS = fileURLToPath(new URL('../migrations', import.meta.url))
const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`

let seq = Math.floor(Math.random() * 1e9)
const newId = (prefix: string): string => `${prefix}_${(++seq).toString(16).padStart(32, '0')}`

/** Run `fn` in one transaction scoped to `organizationId` (or to none). */
async function scoped<T>(
  pool: Pool,
  organizationId: string | null,
  fn: (c: PoolClient) => Promise<T>
): Promise<T> {
  const c = await pool.connect()
  try {
    await c.query('begin')
    if (organizationId) {
      await c.query('select set_config($1, $2, true)', [SETTING, organizationId])
    }
    const result = await fn(c)
    await c.query('commit')
    return result
  } catch (error) {
    await c.query('rollback').catch(() => undefined)
    throw error
  } finally {
    c.release()
  }
}

describe('core.memberships email and name', () => {
  let owner: Pool
  let core: Pool
  const created = new Set<string>()

  /** Create an Organization whose first Owner has the given email and name. */
  async function createOrg(email = 'owner@example.test', name: string | null = 'Olive Owner') {
    const orgId = newId('org')
    created.add(orgId)
    await scoped(core, orgId, async (c) => {
      await c.query(
        "insert into core.organizations (organization_id, name, region) values ($1, 'Org', 'us')",
        [orgId]
      )
      await c.query(
        "insert into core.memberships (id, organization_id, user_id, role, email, name) values ($1, $2, $3, 'owner', $4, $5)",
        [newId('mem'), orgId, newId('usr'), email, name]
      )
    })
    return orgId
  }

  /** Try to add a rep with these values to `orgId`; resolves to the violated constraint, if any. */
  async function addRep(orgId: string, email: unknown, name: unknown): Promise<string | undefined> {
    try {
      await scoped(core, orgId, (c) =>
        c.query(
          "insert into core.memberships (id, organization_id, user_id, role, email, name) values ($1, $2, $3, 'rep', $4, $5)",
          [newId('mem'), orgId, newId('usr'), email, name]
        )
      )
      return undefined
    } catch (error) {
      return (error as { constraint?: string }).constraint ?? String(error)
    }
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    core = new Pool({ connectionString: env.core, max: 2 })
    await dropStaleTestObjects(owner, env.owner)
  })

  afterAll(async () => {
    for (const orgId of created) {
      await owner.query('delete from core.organizations where organization_id = $1', [orgId])
    }
    await owner.end()
    await core.end()
  })

  test('email is required text and name is optional text', async () => {
    const { rows } = await owner.query<{
      column_name: string
      data_type: string
      nullable: string
      dflt: string | null
    }>(
      `select column_name, data_type, is_nullable as nullable, column_default as dflt
         from information_schema.columns
        where table_schema = 'core' and table_name = 'memberships' and column_name in ('email', 'name')
        order by column_name`
    )
    expect(rows).toEqual([
      { column_name: 'email', data_type: 'text', nullable: 'NO', dflt: null },
      { column_name: 'name', data_type: 'text', nullable: 'YES', dflt: null },
    ])
  })

  test('an email of null, or one the invitations rule rejects, is refused', async () => {
    const orgId = await createOrg()
    const nullEmail = await scoped(core, orgId, (c) =>
      c.query(
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, 'rep', null)",
        [newId('mem'), orgId, newId('usr')]
      )
    ).then(
      () => undefined,
      (error: { code?: string }) => error.code
    )
    expect(nullEmail).toBe('23502')
    for (const bad of [
      'Mixed@Example.test',
      'no-at.example.test',
      'two@@example.test',
      'a@b@example.test',
      '@example.test',
      'user@',
      'sp ace@example.test',
      'tab\t@example.test',
      'zero\u200b@example.test',
      'café@example.test',
      `${'a'.repeat(320)}@example.test`,
    ]) {
      expect(await addRep(orgId, bad, null)).toBe('memberships_email_shape')
    }
  })

  test('the email accepts what the invitations rule accepts', async () => {
    const orgId = await createOrg()
    for (const good of [
      'a@b',
      'first.last+tag@sub.example.test',
      `${'a'.repeat(300)}@example.test`,
    ]) {
      expect(await addRep(orgId, good, null)).toBeUndefined()
    }
  })

  test.each([
    ['null', null, true],
    ['a plain name', 'Ada Lovelace', true],
    ['one character', 'A', true],
    ['201 characters', 'x'.repeat(MEMBER_NAME_MAX), true],
    ['201 characters with surrounding spaces', `  ${'x'.repeat(MEMBER_NAME_MAX)}  `, true],
    ['a tab only (the database trims spaces only)', '\t', true],
    [
      '201 astral characters (counted as characters, not bytes)',
      '\u{1F600}'.repeat(MEMBER_NAME_MAX),
      true,
    ],
    ['202 characters', 'x'.repeat(MEMBER_NAME_MAX + 1), false],
    ['an empty string', '', false],
    ['only spaces', '   ', false],
  ])('the name %s', async (_label, name, accepted) => {
    const orgId = await createOrg()
    expect(await addRep(orgId, 'rep@example.test', name)).toBe(
      accepted ? undefined : 'memberships_name_shape'
    )
  })

  test('a second Organization cannot read or change a member email and name', async () => {
    const a = await createOrg('alice@example.test', 'Alice A')
    const b = await createOrg('bob@example.test', 'Bob B')
    const readAll = (orgId: string | null) =>
      scoped(core, orgId, (c) =>
        c.query<{ email: string; name: string | null }>('select email, name from core.memberships')
      )
    expect((await readAll(a)).rows).toEqual([{ email: 'alice@example.test', name: 'Alice A' }])
    expect((await readAll(b)).rows).toEqual([{ email: 'bob@example.test', name: 'Bob B' }])
    expect((await readAll(null)).rows).toEqual([])
    const fromB = await scoped(core, b, (c) =>
      c.query('select email from core.memberships where organization_id = $1', [a])
    )
    expect(fromB.rows).toEqual([])
    const changed = await scoped(core, b, (c) =>
      c.query("update core.memberships set email = 'x@example.test' where organization_id = $1", [
        a,
      ])
    )
    expect(changed.rowCount).toBe(0)
    expect((await readAll(a)).rows[0]?.email).toBe('alice@example.test')
  })

  test('looking a member up by address in an Organization uses the index', async () => {
    const orgId = await createOrg('first@example.test', null)
    const other = await createOrg('other@example.test', null)
    // Enough rows that a scan is clearly dearer, and fresh statistics, so the plan does not depend
    // on when autovacuum ran.
    for (const id of [orgId, other]) {
      await scoped(core, id, (c) =>
        c.query(
          `insert into core.memberships (id, organization_id, user_id, role, email)
           select 'mem_' || md5('m' || n || $1::text), $1::text, 'usr_' || md5('u' || n || $1::text),
                  'rep', 'rep' || n || '@example.test'
             from generate_series(1, 3000) n`,
          [id]
        )
      )
    }
    await owner.query('vacuum analyze core.memberships')
    const result = await scoped(core, orgId, (c) =>
      c.query<{ 'QUERY PLAN': { Plan: object }[] }>(
        'explain (format json) select id from core.memberships where organization_id = $1 and email = $2',
        [orgId, 'rep1500@example.test']
      )
    )
    const text = JSON.stringify(result.rows[0]?.['QUERY PLAN'])
    expect(text).not.toContain('Seq Scan')
    expect(text).toContain('memberships_organization_email_idx')
  })

  describe('the migration on its own database', () => {
    const databases: string[] = []
    let admin: Pool
    let folder: string

    /** The owner connection string for a fresh scratch database in the same cluster. */
    async function scratch(label: string): Promise<string> {
      const name = `it_migrate_${label}_${suffix}`
      await admin.query(`create database "${name}" owner closeline_owner`)
      databases.push(name)
      const url = new URL(env.owner)
      url.pathname = `/${name}`
      return url.toString()
    }

    const withOwner = async <T>(url: string, fn: (pool: Pool) => Promise<T>): Promise<T> => {
      const pool = new Pool({ connectionString: url, max: 1 })
      try {
        return await fn(pool)
      } finally {
        await pool.end()
      }
    }

    const hasColumn = (pool: Pool, column: string) =>
      pool
        .query(
          `select 1 from information_schema.columns
            where table_schema = 'core' and table_name = 'memberships' and column_name = $1`,
          [column]
        )
        .then((r) => r.rowCount === 1)

    beforeAll(async () => {
      admin = new Pool({ connectionString: adminUrl(), max: 1 })
      // The migrations up to and including 0004, as a folder of their own.
      folder = mkdtempSync(join(tmpdir(), 'closeline-db-at-0004-'))
      mkdirSync(join(folder, 'meta'))
      const journal = JSON.parse(readFileSync(join(MIGRATIONS, 'meta', '_journal.json'), 'utf8'))
      journal.entries = journal.entries.filter((e: { tag: string }) => e.tag < '0005')
      writeFileSync(join(folder, 'meta', '_journal.json'), JSON.stringify(journal))
      for (const entry of journal.entries as { tag: string }[]) {
        cpSync(join(MIGRATIONS, `${entry.tag}.sql`), join(folder, `${entry.tag}.sql`))
      }
      const stale = await admin.query<{ datname: string }>(
        "select datname from pg_database where datname like 'it\\_migrate\\_%'"
      )
      for (const { datname } of stale.rows) {
        await admin.query(`drop database if exists "${datname}" with (force)`)
      }
    })

    afterAll(async () => {
      for (const name of databases) {
        await admin.query(`drop database if exists "${name}" with (force)`)
      }
      await admin.end()
      rmSync(folder, { recursive: true, force: true })
    })

    test('applies on a fresh database', async () => {
      const url = await scratch('fresh')
      await runMigrations(url)
      await withOwner(url, async (pool) => {
        expect(await hasColumn(pool, 'email')).toBe(true)
        expect(await hasColumn(pool, 'name')).toBe(true)
      })
    })

    test('applies on a database at 0004 that has no memberships', async () => {
      const url = await scratch('at0004')
      await runMigrations(url, { migrationsFolder: folder })
      await withOwner(url, async (pool) => {
        expect(await hasColumn(pool, 'email')).toBe(false)
      })
      await runMigrations(url)
      await withOwner(url, async (pool) => {
        expect(await hasColumn(pool, 'email')).toBe(true)
      })
    })

    test('refuses a database at 0004 that has a membership, and leaves it at 0004', async () => {
      const url = await scratch('rows')
      await runMigrations(url, { migrationsFolder: folder })
      const orgId = newId('org')
      await withOwner(url, (pool) =>
        scoped(pool, orgId, async (c) => {
          await c.query(
            "insert into core.organizations (organization_id, name, region) values ($1, 'Org', 'us')",
            [orgId]
          )
          await c.query(
            "insert into core.memberships (id, organization_id, user_id, role) values ($1, $2, $3, 'owner')",
            [newId('mem'), orgId, newId('usr')]
          )
        })
      )
      const message = await rejectionOf(runMigrations(url))
      expect(message).toContain('core.memberships already has rows')
      expect(message).toContain('Reset the local database')
      expect(message).toContain('docker compose down -v')
      expect(message).toContain('dev --down --volumes')
      expect(message).not.toContain('not-null')
      await withOwner(url, async (pool) => {
        expect(await hasColumn(pool, 'email')).toBe(false)
      })
    })
  })
})
