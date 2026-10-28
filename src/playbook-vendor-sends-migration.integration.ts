import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool, type PoolClient } from 'pg'
import { adminUrl, dropTestDatabase, integrationEnv, rejectionOf } from './integration-support'
import { runMigrations } from './migrate'
import { CALL_INSERT } from './playbook-call-statements'
import { QUOTA_LOCK, RIGHTS_CONFIRM } from './playbook-statements'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
// Migration 0018 runs on a scratch database that is first migrated through 0017 and seeded.
const env = integrationEnv()
const MIGRATIONS = fileURLToPath(new URL('../migrations', import.meta.url))
const SETTING = 'app.organization_id'
const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`
const hex = (): string => crypto.randomUUID().replaceAll('-', '')

/** CALL_INSERT as it was before the `origin` column existed: this test runs at an old schema. */
const CALL_INSERT_BEFORE_ORIGIN = CALL_INSERT.replace(', origin)', ')').replace(
  ",\n    coalesce($20::text, 'imported')",
  ''
)

describe('migration 0018 on data that exists before it', () => {
  let admin: Pool
  let folder: string
  const databases: string[] = []

  const urlFor = (base: string, name: string): string => {
    const url = new URL(base)
    url.pathname = `/${name}`
    return url.toString()
  }
  async function scoped<T>(pool: Pool, org: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await pool.connect()
    try {
      await c.query('begin')
      await c.query('select set_config($1, $2, true)', [SETTING, org])
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
  /** A scratch database migrated through 0017, with a pool per role and one Recording Call. */
  async function seeded(label: string, sends: number) {
    const name = `it_vendor18_${label}_${suffix}`
    await admin.query(`create database "${name}" owner closeline_owner`)
    databases.push(name)
    await runMigrations(urlFor(env.owner, name), { migrationsFolder: folder })
    const owner = new Pool({ connectionString: urlFor(env.owner, name), max: 1 })
    const playbook = new Pool({ connectionString: urlFor(env.playbook, name), max: 1 })
    const org = `org_${hex()}`
    const id = `call_${hex()}`
    try {
      await scoped(playbook, org, (c) => c.query(RIGHTS_CONFIRM, [org, `usr_${hex()}`, 1]))
      await scoped(playbook, org, async (c) => {
        await c.query(QUOTA_LOCK, [org])
        return c.query(CALL_INSERT_BEFORE_ORIGIN, [
          org,
          id,
          'D-1',
          `deal_${hex()}`,
          'a.mp3',
          'audio/mpeg',
          'recording',
          5000,
          createHash('sha256').update(hex()).digest(),
          `usr_${hex()}`,
          `${org}/${id}`,
          null,
          null,
          null,
          `cjob_${hex()}`,
          100,
          10 ** 12,
          100,
          1,
        ])
      })
      await scoped(owner, org, (c) =>
        c.query(
          `update playbook.calls set vendor_send_seq = $2, sent_to_vendor_at = now() where id = $1`,
          [id, sends]
        )
      )
      return { owner, playbook, org, id, url: urlFor(env.owner, name) }
    } catch (error) {
      await Promise.all([owner.end(), playbook.end()])
      throw error
    }
  }

  beforeAll(async () => {
    admin = new Pool({ connectionString: adminUrl(), max: 1 })
    // The migrations up to and including 0017, as a folder of their own.
    folder = mkdtempSync(join(tmpdir(), 'closeline-db-at-0017-'))
    mkdirSync(join(folder, 'meta'))
    const journal = JSON.parse(readFileSync(join(MIGRATIONS, 'meta', '_journal.json'), 'utf8'))
    journal.entries = journal.entries.filter((e: { tag: string }) => e.tag < '0018')
    writeFileSync(join(folder, 'meta', '_journal.json'), JSON.stringify(journal))
    for (const entry of journal.entries as { tag: string }[]) {
      cpSync(join(MIGRATIONS, `${entry.tag}.sql`), join(folder, `${entry.tag}.sql`))
    }
    const stale = await admin.query<{ datname: string }>(
      "select datname from pg_database where datname like 'it\\_vendor18\\_%'"
    )
    for (const { datname } of stale.rows) {
      await dropTestDatabase(admin, datname)
    }
  })

  afterAll(async () => {
    for (const name of databases) {
      await dropTestDatabase(admin, name)
    }
    await admin.end()
    rmSync(folder, { recursive: true, force: true })
  })

  test('a Call counted past 20 sends stops the migration and creates nothing', async () => {
    const db = await seeded('over', 21)
    try {
      const message = await rejectionOf(runMigrations(db.url))
      expect(message).toContain('1 Call(s) have more than 20 vendor sends')
      expect(message).not.toContain(db.id)
      const found = await db.owner.query(
        `select to_regclass('playbook.call_vendor_sends') is null as absent`
      )
      expect(found.rows[0]?.absent).toBe(true)
      // Nothing was changed: the count is as it was.
      const call = await scoped(db.owner, db.org, (c) =>
        c.query('select vendor_send_seq from playbook.calls where id = $1', [db.id])
      )
      expect(call.rows[0]?.vendor_send_seq).toBe(21)
    } finally {
      await Promise.all([db.owner.end(), db.playbook.end()])
    }
  })

  test('a Call with 3 sends gets three rows with no id, and forced row-level security is back', async () => {
    const db = await seeded('three', 3)
    try {
      await runMigrations(db.url)
      const rows = await scoped(db.owner, db.org, (c) =>
        c.query(
          'select seq, vendor_id from playbook.call_vendor_sends where call_id = $1 order by seq',
          [db.id]
        )
      )
      expect(rows.rows).toEqual([
        { seq: 1, vendor_id: null },
        { seq: 2, vendor_id: null },
        { seq: 3, vendor_id: null },
      ])
      const forced = await db.owner.query(
        `select relname, relforcerowsecurity as forced from pg_class
         where oid in ('playbook.calls'::regclass, 'playbook.call_vendor_sends'::regclass)
         order by relname`
      )
      expect(forced.rows).toEqual([
        { relname: 'call_vendor_sends', forced: true },
        { relname: 'calls', forced: true },
      ])
    } finally {
      await Promise.all([db.owner.end(), db.playbook.end()])
    }
  })
})
