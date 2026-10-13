import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Pool, type PoolClient } from 'pg'
import { adminUrl, assertLocalTestDatabase, integrationEnv, migrateUp } from './integration-support'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
//
// The plan a trigger's statement runs is fixed per connection, from the table as it looked when the
// plan was built. These tests need a table that looks small at that moment and is large later, which
// the shared test database never is (other suites fill it), so they run in a database of their own.
const env = integrationEnv()
const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`
const database = `it_plans_${suffix}`
const SETTING = 'app.organization_id'
const STALE_AFTER_MS = 60 * 60 * 1000

let seq = Math.floor(Math.random() * 1e9)
const newId = (prefix: string): string => `${prefix}_${(++seq).toString(16).padStart(32, '0')}`

/** The same server and login as `base`, in the database this suite created. */
function inDatabase(base: string): string {
  const url = new URL(base)
  url.pathname = `/${database}`
  return url.toString()
}

describe('deleting a large Organization does a bounded amount of work per member', () => {
  let admin: Pool
  let owner: Pool
  let core: Pool

  beforeAll(async () => {
    admin = new Pool({ connectionString: adminUrl(), max: 1 })
    assertLocalTestDatabase(adminUrl())
    // A run killed before its cleanup leaves its database behind. Only one made over an hour ago
    // (by the timestamp in its name) is dropped, so a second run on the same server never takes
    // the database of a run still in progress.
    const stale = await admin.query<{ name: string }>(
      "select datname as name from pg_database where datname like 'it\\_plans\\_%'"
    )
    for (const { name } of stale.rows) {
      const createdAt = Number(name.split('_')[2])
      if (Number.isFinite(createdAt) && Date.now() - createdAt > STALE_AFTER_MS) {
        await admin.query(`drop database if exists "${name}" with (force)`)
      }
    }
    await admin.query(`create database "${database}" owner closeline_owner`)
    await migrateUp(inDatabase(env.owner))
    owner = new Pool({ connectionString: inDatabase(env.owner), max: 1 })
    // One connection for the service role, so the plans its triggers build stay cached, as they do
    // on a pooled connection in production.
    core = new Pool({ connectionString: inDatabase(env.core), max: 1 })
    // Autovacuum would analyse the tables a minute after the first rows, hiding the very state
    // under test (statistics and plans from when the tables were small).
    for (const table of ['memberships', 'membership_directory', 'team_members', 'invitations']) {
      await owner.query(`alter table core.${table} set (autovacuum_enabled = false)`)
    }
  })

  afterAll(async () => {
    await Promise.all([core?.end(), owner?.end()])
    await admin.query(`drop database if exists "${database}" with (force)`)
    await admin.end()
  })

  /** Run `fn` in one transaction of the service role, scoped to `orgId`. */
  async function inOrg<T>(orgId: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await core.connect()
    try {
      await c.query('begin')
      await c.query('select set_config($1, $2, true)', [SETTING, orgId])
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

  const createOrganization = (c: PoolClient, orgId: string, reps: number) =>
    (async () => {
      await c.query(
        'insert into core.organizations (organization_id, name, region) values ($1, $1, $2)',
        [orgId, 'us']
      )
      await c.query(
        "insert into core.memberships (id, organization_id, user_id, role) values ($1, $2, $3, 'owner')",
        [newId('mem'), orgId, newId('usr')]
      )
      await c.query(
        `insert into core.memberships (id, organization_id, user_id, role)
         select 'mem_' || md5('m' || n || $1::text), $1::text, 'usr_' || md5('u' || n || $1::text), 'rep'
           from generate_series(1, $2::int) n`,
        [orgId, reps]
      )
    })()

  /** Tuples the directory's statements read so far in this transaction (sequentially or by index). */
  const directoryReads = async (c: PoolClient): Promise<number> =>
    Number(
      (
        await c.query<{ read: string }>(
          `select (seq_tup_read + idx_tup_fetch)::text as read from pg_stat_xact_all_tables
            where schemaname = 'core' and relname = 'membership_directory'`
        )
      ).rows[0]?.read ?? 0
    )

  test('removing members one at a time while the directory is small, then adding many, leaves the delete linear', async () => {
    const small = newId('org')
    const big = newId('org')
    const members = 20_000
    // 1. A small Organization, and statistics from when the directory held 13 rows of one Organization.
    await inOrg(small, (c) => createOrganization(c, small, 12))
    await owner.query('analyze core.membership_directory')
    // 2. Removing members one by one runs the directory trigger's DELETE enough times for a
    //    statement to settle on a plan and keep it for this connection.
    const reps = await inOrg(small, async (c) =>
      (
        await c.query<{ id: string }>(
          "select id from core.memberships where organization_id = $1 and role = 'rep' order by id limit 8",
          [small]
        )
      ).rows.map((r) => r.id)
    )
    for (const id of reps) {
      await inOrg(small, (c) => c.query('delete from core.memberships where id = $1', [id]))
    }
    // 3. The directory grows, with no new statistics (autovacuum is off, as it is in a young table).
    await inOrg(big, (c) => createOrganization(c, big, members))
    // 4. Deleting the large Organization deletes each member's directory row in turn. With a plan
    //    built for a table of 13 rows that is a scan of the whole table per member (quadratic: for
    //    100,000 members it did not finish in two minutes); with a plan per key it is one index
    //    lookup per member.
    const read = await inOrg(big, async (c) => {
      const before = await directoryReads(c)
      await c.query('delete from core.organizations where organization_id = $1', [big])
      return (await directoryReads(c)) - before
    })
    expect(read).toBeLessThan(members * 2)
  }, 180_000)
})
