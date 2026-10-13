import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
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

/** The plan nodes of an `EXPLAIN (FORMAT JSON)` tree, the root first. */
interface PlanNode {
  'Node Type': string
  'Index Name'?: string
  'Index Cond'?: string
  Plans?: PlanNode[]
}

/** Every node of the plan tree, depth first. */
function planNodes(node: PlanNode): PlanNode[] {
  return [node, ...(node.Plans ?? []).flatMap(planNodes)]
}

describe('listing and counting invitations by state reads the state index', () => {
  const orgId = newId('org')
  const INDEX = 'invitations_state_list_idx'
  const TOTAL = 20_000
  let admin: Pool
  let owner: Pool
  let core: Pool
  let planDatabase: string

  beforeAll(async () => {
    admin = new Pool({ connectionString: adminUrl(), max: 1 })
    assertLocalTestDatabase(adminUrl())
    // Its own database, as the suite above: the statistics must be this table's alone.
    planDatabase = `it_plans_${suffix}_inv`
    await admin.query(`create database "${planDatabase}" owner closeline_owner`)
    const url = new URL(env.owner)
    url.pathname = `/${planDatabase}`
    await migrateUp(url.toString())
    owner = new Pool({ connectionString: url.toString(), max: 1 })
    // Row-level security binds the owner too, so the rows go in as the service role, scoped to the
    // Organization.
    const coreUrl = new URL(env.core)
    coreUrl.pathname = `/${planDatabase}`
    core = new Pool({ connectionString: coreUrl.toString(), max: 1 })
    const c = await core.connect()
    try {
      await c.query('begin')
      await c.query('select set_config($1, $2, true)', [SETTING, orgId])
      await c.query(
        'insert into core.organizations (organization_id, name, region) values ($1, $1, $2)',
        [orgId, 'us']
      )
      await c.query(
        "insert into core.memberships (id, organization_id, user_id, role) values ($1, $2, $3, 'owner')",
        [newId('mem'), orgId, newId('usr')]
      )
      // Set-based: one third pending, accepted and revoked each, a distinct email per row (so one
      // pending invitation per email holds), a role other than Owner, and the timestamps its state
      // requires. Creation times are spread over 20,000 minutes and expire a day later.
      await c.query(
        `insert into core.invitations
         (id, organization_id, email, role, invited_by_user_id, token_hash, state,
          expires_at, accepted_at, revoked_at, created_at)
       select 'inv_' || md5('i' || n),
              $1::text,
              'user' || n || '@example.com',
              (array['admin', 'manager', 'rep'])[1 + n % 3],
              'usr_' || md5('u'),
              md5('t' || n) || md5('h' || n),
              s.state,
              base.at + interval '1 day',
              case when s.state = 'accepted' then base.at + interval '1 hour' end,
              case when s.state = 'revoked' then base.at + interval '1 hour' end,
              base.at
         from generate_series(1, $2::int) n
        cross join lateral (select (array['pending', 'accepted', 'revoked'])[1 + n % 3] as state) s
        cross join lateral (
          select timestamptz '2026-01-01 00:00:00+00' + n * interval '1 minute' as at) base`,
        [orgId, TOTAL]
      )
      await c.query('commit')
    } catch (error) {
      await c.query('rollback').catch(() => undefined)
      throw error
    } finally {
      c.release()
    }
    await owner.query('analyze core.invitations')
  }, 120_000)

  afterAll(async () => {
    await Promise.all([core?.end(), owner?.end()])
    await admin?.query(`drop database if exists "${planDatabase}" with (force)`)
    await admin?.end()
  })

  /** Run `fn` in a transaction of the service role scoped to the seeded Organization. */
  async function scoped<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await core.connect()
    try {
      await c.query('begin')
      await c.query('select set_config($1, $2, true)', [SETTING, orgId])
      return await fn(c)
    } finally {
      await c.query('rollback').catch(() => undefined)
      c.release()
    }
  }

  /** The plan nodes the service role's planner chooses for `sql` with these parameters. */
  async function plan(sql: string, params: unknown[]): Promise<PlanNode[]> {
    const result = await scoped((c) =>
      c.query<{ 'QUERY PLAN': { Plan: PlanNode }[] }>(`explain (format json) ${sql}`, params)
    )
    const root = result.rows[0]?.['QUERY PLAN'][0]?.Plan
    if (!root) {
      throw new Error('no plan returned')
    }
    return planNodes(root)
  }

  test('seeds the three states', async () => {
    const counts = await scoped((c) =>
      c.query<{ state: string; n: string }>(
        'select state, count(*)::text as n from core.invitations group by state order by state'
      )
    )
    expect(counts.rows.map((r) => r.state)).toEqual(['accepted', 'pending', 'revoked'])
    expect(counts.rows.every((r) => Number(r.n) > TOTAL / 4)).toBe(true)
  })

  test('a page of revoked invitations, newest first, uses the index and no sort', async () => {
    const nodes = await plan(
      `select id, email, created_at from core.invitations
        where organization_id = $1 and state = 'revoked'
          and (created_at, id) < ($2::timestamptz, $3::text)
        order by created_at desc, id desc
        limit 101`,
      [orgId, '2026-01-10 00:00:00+00', 'inv_ffffffffffffffffffffffffffffffff']
    )
    expect(nodes.map((n) => n['Index Name'])).toContain(INDEX)
    expect(nodes.map((n) => n['Node Type'])).not.toContain('Sort')
    expect(nodes.map((n) => n['Node Type'])).not.toContain('Incremental Sort')
    expect(nodes.map((n) => n['Node Type'])).not.toContain('Seq Scan')
  })

  test('a capped count of invitations created after a time, in every state, uses the index', async () => {
    const nodes = await plan(
      `select count(*) from (
         select 1 from core.invitations
          where organization_id = $1
            and state in ('pending', 'accepted', 'revoked')
            and created_at > $2::timestamptz
          limit 1001) capped`,
      // The window of the last few hours of the seeded range (about 3% of the rows), as a mail cap
      // looks at a recent window, not at everything.
      [orgId, '2026-01-14 12:00:00+00']
    )
    expect(nodes.map((n) => n['Index Name'])).toContain(INDEX)
    expect(nodes.map((n) => n['Node Type'])).not.toContain('Seq Scan')
  })
})

/** An `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` root: the plan, with the buffers it touched. */
interface AnalysedPlan extends PlanNode {
  'Shared Hit Blocks'?: number
  'Shared Read Blocks'?: number
  'Actual Rows'?: number
  'Index Cond'?: string
  Relation?: string
}

describe('looking up and purging idempotency keys read one index each, in a bounded number of buffers', () => {
  const orgId = newId('org')
  const KEY_INDEX = 'idempotency_keys_pkey'
  const PURGE_INDEX = 'idempotency_keys_purge_idx'
  /** Rows of the Organization under test, and of each of the six others. */
  const OWN_ROWS = 20_000
  const OTHER_ROWS = 4_000
  const BATCH = 500
  /** Row 7 of the seed: user `n % 4`, route number `1 + n % 3` and key `md5(n)`. */
  const SEEDED_USER = `usr_${createHash('md5').update('u3').digest('hex')}`
  const SEEDED_ROUTE = 'invitations.revoke'
  const SEEDED_KEY = `key-${createHash('md5').update('7').digest('hex')}`
  /** The purge reads the oldest `BATCH` rows of the Organization: half of its rows are older than this. */
  const CUTOFF = '2026-01-08 00:00:00+00'
  let admin: Pool
  let owner: Pool
  let core: Pool
  let planDatabase: string

  beforeAll(async () => {
    admin = new Pool({ connectionString: adminUrl(), max: 1 })
    assertLocalTestDatabase(adminUrl())
    // Its own database, as the suites above: the statistics must be this table's alone.
    planDatabase = `it_plans_${suffix}_idem`
    await admin.query(`create database "${planDatabase}" owner closeline_owner`)
    const url = new URL(env.owner)
    url.pathname = `/${planDatabase}`
    await migrateUp(url.toString())
    owner = new Pool({ connectionString: url.toString(), max: 1 })
    const coreUrl = new URL(env.core)
    coreUrl.pathname = `/${planDatabase}`
    core = new Pool({ connectionString: coreUrl.toString(), max: 1 })
    // Row-level security binds the owner too, so the rows go in as the service role, scoped to each
    // Organization in turn: this one and six others.
    const orgs = [orgId, ...Array.from({ length: 6 }, () => newId('org'))]
    for (const id of orgs) {
      const c = await core.connect()
      try {
        await c.query('begin')
        await c.query('select set_config($1, $2, true)', [SETTING, id])
        await c.query(
          'insert into core.organizations (organization_id, name, region) values ($1, $1, $2)',
          [id, 'us']
        )
        await c.query(
          "insert into core.memberships (id, organization_id, user_id, role) values ($1, $2, $3, 'owner')",
          [newId('mem'), id, newId('usr')]
        )
        // Four users, three routes, a distinct key per row. Creation times run one minute apart
        // from the first of January, so a cutoff splits the rows by age. A tenth are in flight.
        await c.query(
          `insert into core.idempotency_keys
             (organization_id, user_id, route, key, request_hash, status, response, created_at)
           select $1::text,
                  'usr_' || md5('u' || n % 4),
                  (array['invitations.create', 'invitations.revoke', 'teams.create'])[1 + n % 3],
                  'key-' || md5(n::text),
                  sha256(convert_to(n::text, 'UTF8')),
                  case when n % 10 = 0 then null else 201 end,
                  case when n % 10 = 0 then null else '{"ok":true}'::jsonb end,
                  timestamptz '2026-01-01 00:00:00+00' + n * interval '1 minute'
             from generate_series(1, $2::int) n`,
          [id, id === orgId ? OWN_ROWS : OTHER_ROWS]
        )
        await c.query('commit')
      } catch (error) {
        await c.query('rollback').catch(() => undefined)
        throw error
      } finally {
        c.release()
      }
    }
    await owner.query('analyze core.idempotency_keys')
  }, 120_000)

  afterAll(async () => {
    await Promise.all([core?.end(), owner?.end()])
    await admin?.query(`drop database if exists "${planDatabase}" with (force)`)
    await admin?.end()
  })

  /** The root of the analysed plan, as the service role scoped to the seeded Organization runs `sql`. */
  async function analyse(sql: string, params: unknown[]): Promise<AnalysedPlan> {
    const c = await core.connect()
    try {
      await c.query('begin')
      await c.query('select set_config($1, $2, true)', [SETTING, orgId])
      const result = await c.query<{ 'QUERY PLAN': { Plan: AnalysedPlan }[] }>(
        `explain (analyze, buffers, format json) ${sql}`,
        params
      )
      const root = result.rows[0]?.['QUERY PLAN'][0]?.Plan
      if (!root) {
        throw new Error('no plan returned')
      }
      return root
    } finally {
      // The purge really deletes, so every run rolls back and the next sees the same table.
      await c.query('rollback').catch(() => undefined)
      c.release()
    }
  }

  const buffers = (plan: AnalysedPlan): number =>
    (plan['Shared Hit Blocks'] ?? 0) + (plan['Shared Read Blocks'] ?? 0)

  test('seeds an Organization among others', async () => {
    const total = await owner.query<{ n: string }>(
      'select reltuples::bigint::text as n from pg_class where oid = $1::regclass',
      ['core.idempotency_keys']
    )
    expect(Number(total.rows[0]?.n)).toBeGreaterThan(OWN_ROWS + 5 * OTHER_ROWS)
  })

  test('the lookup of one key uses the primary key and nothing else, in a handful of buffers', async () => {
    const plan = await analyse(
      `select request_hash, status, response from core.idempotency_keys
        where organization_id = $1 and user_id = $2 and route = $3 and key = $4`,
      [orgId, SEEDED_USER, SEEDED_ROUTE, SEEDED_KEY]
    )
    const nodes = planNodes(plan)
    expect(nodes.map((n) => n['Index Name']).filter(Boolean)).toEqual([KEY_INDEX])
    expect(nodes.map((n) => n['Node Type'])).not.toContain('Seq Scan')
    expect(nodes.map((n) => n['Node Type'])).not.toContain('Bitmap Heap Scan')
    expect(plan['Actual Rows']).toBe(1)
    expect(buffers(plan)).toBeLessThanOrEqual(8)
  })

  test('the purge of one batch uses the purge index and nothing else, in a bounded number of buffers', async () => {
    const plan = await analyse(
      `delete from core.idempotency_keys
        where ctid = any(array(
          select ctid from core.idempotency_keys
           where organization_id = $1 and created_at < $2::timestamptz
           order by created_at
           limit ${BATCH}))`,
      [orgId, CUTOFF]
    )
    const nodes = planNodes(plan)
    expect(nodes.map((n) => n['Index Name']).filter(Boolean)).toEqual([PURGE_INDEX])
    // The index is read by its leading column: the Organization comes first in the condition, so
    // only that Organization's range is walked, oldest first. The same two columns the other way
    // round would be read across every Organization's expired rows.
    const condition = nodes.find((n) => n['Index Name'] === PURGE_INDEX)?.['Index Cond'] ?? ''
    expect(condition).toMatch(/^\(\(?[\w.]*organization_id = /)
    expect(condition.indexOf('organization_id')).toBeLessThan(condition.indexOf('created_at'))
    expect(nodes.map((n) => n['Node Type'])).not.toContain('Seq Scan')
    expect(nodes.map((n) => n['Node Type'])).not.toContain('Sort')
    expect(nodes.map((n) => n['Node Type'])).not.toContain('Incremental Sort')
    // A batch touches its own rows, their pages and the entries of the indexes it maintains. It is
    // about two buffers per row, and does not grow with the 20,000 rows of the Organization or the
    // 44,000 of the table (a scan of the table alone would read a thousand pages or more).
    expect(buffers(plan)).toBeLessThanOrEqual(BATCH * 3)
  })

  test('the purge statement removes one batch of the oldest rows of this Organization only', async () => {
    const c = await core.connect()
    try {
      await c.query('begin')
      await c.query('select set_config($1, $2, true)', [SETTING, orgId])
      const removed = await c.query(
        `delete from core.idempotency_keys
          where ctid = any(array(
            select ctid from core.idempotency_keys
             where organization_id = $1 and created_at < $2::timestamptz
             order by created_at
             limit ${BATCH}))`,
        [orgId, CUTOFF]
      )
      expect(removed.rowCount).toBe(BATCH)
      const left = await c.query<{ n: string }>(
        'select count(*)::text as n from core.idempotency_keys'
      )
      expect(Number(left.rows[0]?.n)).toBe(OWN_ROWS - BATCH)
    } finally {
      await c.query('rollback').catch(() => undefined)
      c.release()
    }
  })
})
