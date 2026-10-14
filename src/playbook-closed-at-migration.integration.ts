import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool, type PoolClient } from 'pg'
import { adminUrl, integrationEnv } from './integration-support'
import { runMigrations } from './migrate'
import { DB_TYPES } from './pg-types'
import { QUOTA_LOCK } from './playbook-statements'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
// Migration 0020 runs on a scratch database that is first migrated through 0019 and seeded.
const env = integrationEnv()
const MIGRATIONS = fileURLToPath(new URL('../migrations', import.meta.url))
const SETTING = 'app.organization_id'
const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`
const hex = (): string => crypto.randomUUID().replaceAll('-', '')

describe('migration 0020: a closing date is a calendar date', () => {
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

  beforeAll(async () => {
    admin = new Pool({ connectionString: adminUrl(), max: 1 })
    // The migrations up to and including 0019, as a folder of their own.
    folder = mkdtempSync(join(tmpdir(), 'closeline-db-at-0019-'))
    mkdirSync(join(folder, 'meta'))
    const journal = JSON.parse(readFileSync(join(MIGRATIONS, 'meta', '_journal.json'), 'utf8'))
    journal.entries = journal.entries.filter((e: { tag: string }) => e.tag < '0020')
    writeFileSync(join(folder, 'meta', '_journal.json'), JSON.stringify(journal))
    for (const entry of journal.entries as { tag: string }[]) {
      cpSync(join(MIGRATIONS, `${entry.tag}.sql`), join(folder, `${entry.tag}.sql`))
    }
    const stale = await admin.query<{ datname: string }>(
      "select datname from pg_database where datname like 'it\\_closed\\_at\\_%'"
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

  test('closing instants become their UTC calendar date, whatever time zone the session or database uses', async () => {
    const name = `it_closed_at_${suffix}`
    await admin.query(`create database "${name}" owner closeline_owner`)
    databases.push(name)
    const url = urlFor(env.owner, name)
    await runMigrations(url, { migrationsFolder: folder })
    // A database whose own time zone is not UTC must not change the conversion.
    await admin.query(`alter database "${name}" set timezone = 'America/Los_Angeles'`)
    const owner = new Pool({ connectionString: url, max: 1, types: DB_TYPES })
    const org = `org_${hex()}`
    const seeds: [string, string | null][] = [
      ['D-EST', '2026-01-31T23:00:00-05:00'], // 04:00 UTC on 1 February
      ['D-LATE', '2026-03-10T23:59:59Z'],
      ['D-EARLY', '2026-03-10T00:00:00Z'],
      ['D-NONE', null],
    ]
    try {
      await scoped(owner, org, async (c) => {
        await c.query(QUOTA_LOCK, [org])
        for (const [dealId, closed] of seeds) {
          await c.query(
            `insert into playbook.deals (id, organization_id, deal_id, outcome, closed_at)
             values ($1, $2, $3, $4, $5::timestamptz)`,
            [`deal_${hex()}`, org, dealId, closed ? 'won' : 'open', closed]
          )
        }
      })
      const before = await scoped(owner, org, (c) =>
        c.query(`select pg_typeof(closed_at)::text as t from playbook.deals limit 1`)
      )
      expect(before.rows[0]?.t).toBe('timestamp with time zone')
      await runMigrations(url)
      const after = await scoped(owner, org, (c) =>
        c.query(
          `select deal_id, closed_at, pg_typeof(closed_at)::text as t from playbook.deals order by deal_id`
        )
      )
      expect(after.rows.map((r) => [r.deal_id, r.closed_at])).toEqual([
        ['D-EARLY', '2026-03-10'],
        ['D-EST', '2026-02-01'],
        ['D-LATE', '2026-03-10'],
        ['D-NONE', null],
      ])
      expect(after.rows.every((r) => r.t === 'date')).toBe(true)
      const forced = await owner.query(
        `select relforcerowsecurity as forced from pg_class where oid = 'playbook.deals'::regclass`
      )
      expect(forced.rows[0]?.forced).toBe(true)
    } finally {
      await owner.end()
    }
  })
})
