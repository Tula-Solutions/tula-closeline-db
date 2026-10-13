import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import {
  type AuthRegion,
  adminUrl,
  dropStaleTestObjects,
  inAuthEnvironment,
  integrationEnv,
  migrateUp,
  rejectionOf,
  seedAuthRegion,
} from './integration-support'
import { runMigrations } from './migrate'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const MIGRATIONS = fileURLToPath(new URL('../migrations', import.meta.url))
const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`
const uuid = (): string => crypto.randomUUID()

describe('auth.abandon_cases', () => {
  let owner: Pool
  let authPool: Pool
  let corePool: Pool
  let region: AuthRegion

  /** Insert a case in an environment; `extra` sets columns after the three ids. */
  const addCase = (
    environmentId: string,
    columns: Record<string, unknown> = {},
    organizationId: string = uuid()
  ) => {
    const names = [
      'id',
      'project_id',
      'environment_id',
      'core_organization_id',
      'user_id',
      'attempt_id',
    ]
    const values: unknown[] = [
      uuid(),
      region.a.projectId,
      environmentId,
      organizationId,
      uuid(),
      uuid(),
    ]
    for (const [name, value] of Object.entries(columns)) {
      names.push(name)
      values.push(value)
    }
    const marks = values.map((_, i) => `$${i + 1}`).join(', ')
    return inAuthEnvironment(authPool, environmentId, (client) =>
      client.query(
        `insert into auth.abandon_cases (${names.join(', ')}) values (${marks}) returning id`,
        values
      )
    )
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    await dropStaleTestObjects(owner, env.owner)
    authPool = new Pool({ connectionString: env.auth, max: 6 })
    corePool = new Pool({ connectionString: env.core, max: 1 })
    region = await seedAuthRegion(authPool)
  })

  afterAll(async () => {
    await owner.query('delete from auth.workspaces where id = $1', [region?.workspaceId])
    await Promise.all([owner.end(), authPool.end(), corePool.end()])
  })

  describe('the rules the table keeps', () => {
    test('a new case is open, unattempted and due now', async () => {
      const added = await addCase(region.b.environmentId)
      const row = await inAuthEnvironment(authPool, region.b.environmentId, (client) =>
        client.query(
          `select attempts, resolved_at, outcome, next_attempt_at <= now() as due
             from auth.abandon_cases where id = $1`,
          [added.rows[0]?.id]
        )
      )
      expect(row.rows).toEqual([{ attempts: 0, resolved_at: null, outcome: null, due: true }])
    })

    test.each([-1, 101])('attempts of %i are refused', async (attempts) => {
      const message = await rejectionOf(addCase(region.b.environmentId, { attempts }))
      expect(message).toContain('abandon_cases_attempts_bounds')
    })

    test.each([0, 1, 100])('attempts of %i are accepted', async (attempts) => {
      await addCase(region.b.environmentId, { attempts })
    })

    test('an outcome outside done, refused and gave_up is refused', async () => {
      const message = await rejectionOf(
        addCase(region.b.environmentId, { resolved_at: new Date(), outcome: 'abandoned' })
      )
      expect(message).toContain('abandon_cases_outcome_known')
    })

    test.each(['done', 'refused', 'gave_up'])(
      'a case resolved as %s is accepted',
      async (outcome) => {
        await addCase(region.b.environmentId, { resolved_at: new Date(), outcome })
      }
    )

    test('a resolved case must have an outcome, and an open case must have none', async () => {
      const noOutcome = await rejectionOf(
        addCase(region.b.environmentId, { resolved_at: new Date() })
      )
      expect(noOutcome).toContain('abandon_cases_resolution_whole')
      const noTime = await rejectionOf(addCase(region.b.environmentId, { outcome: 'done' }))
      expect(noTime).toContain('abandon_cases_resolution_whole')
    })

    test('an open case is resolved by an update that sets both, and by no update that sets one', async () => {
      const added = await addCase(region.b.environmentId)
      const id = added.rows[0]?.id
      const one = await rejectionOf(
        inAuthEnvironment(authPool, region.b.environmentId, (client) =>
          client.query(`update auth.abandon_cases set outcome = 'done' where id = $1`, [id])
        )
      )
      expect(one).toContain('abandon_cases_resolution_whole')
      const both = await inAuthEnvironment(authPool, region.b.environmentId, (client) =>
        client.query(
          `update auth.abandon_cases set outcome = 'done', resolved_at = now() where id = $1`,
          [id]
        )
      )
      expect(both.rowCount).toBe(1)
    })

    test('an Organization has one case in an environment, and may have one in another', async () => {
      const organizationId = uuid()
      await addCase(region.b.environmentId, {}, organizationId)
      const again = await rejectionOf(addCase(region.b.environmentId, {}, organizationId))
      expect(again).toContain('abandon_cases_environment_organization_key')
      await addCase(region.a.environmentId, {}, organizationId)
    })

    test('recording a case twice with on conflict do nothing keeps the first', async () => {
      const organizationId = uuid()
      const record = (attemptId: string) =>
        inAuthEnvironment(authPool, region.b.environmentId, (client) =>
          client.query(
            `insert into auth.abandon_cases
               (id, project_id, environment_id, core_organization_id, user_id, attempt_id)
             values ($1, $2, $3, $4, $5, $6)
             on conflict (environment_id, core_organization_id) do nothing`,
            [uuid(), region.b.projectId, region.b.environmentId, organizationId, uuid(), attemptId]
          )
        )
      const first = uuid()
      expect((await record(first)).rowCount).toBe(1)
      expect((await record(uuid())).rowCount).toBe(0)
      const kept = await inAuthEnvironment(authPool, region.b.environmentId, (client) =>
        client.query('select attempt_id from auth.abandon_cases where core_organization_id = $1', [
          organizationId,
        ])
      )
      expect(kept.rows).toEqual([{ attempt_id: first }])
    })

    test('the ids are uuids and the table holds no text column that could carry personal data', async () => {
      const columns = await owner.query<{ column: string; type: string }>(
        `select column_name as column, data_type as type from information_schema.columns
          where table_schema = 'auth' and table_name = 'abandon_cases' order by column_name`
      )
      const byName = Object.fromEntries(columns.rows.map((row) => [row.column, row.type]))
      for (const id of ['id', 'core_organization_id', 'user_id', 'attempt_id']) {
        expect(byName[id], id).toBe('uuid')
      }
      expect(columns.rows.filter((row) => row.type === 'text').map((row) => row.column)).toEqual([
        'outcome',
      ])
    })
  })

  describe('row-level security and grants', () => {
    test('outside an environment nothing is visible and nothing can be written', async () => {
      await addCase(region.b.environmentId)
      const seen = await inAuthEnvironment(authPool, null, (client) =>
        client.query('select id from auth.abandon_cases')
      )
      expect(seen.rows).toEqual([])
      const message = await rejectionOf(
        inAuthEnvironment(authPool, null, (client) =>
          client.query(
            `insert into auth.abandon_cases
               (id, project_id, environment_id, core_organization_id, user_id, attempt_id)
             values ($1, $2, $3, $4, $5, $6)`,
            [uuid(), region.a.projectId, region.a.environmentId, uuid(), uuid(), uuid()]
          )
        )
      )
      expect(message).toContain('row-level security')
    })

    test('an environment sees only its own cases', async () => {
      const organizationId = uuid()
      await addCase(region.b.environmentId, {}, organizationId)
      const seenByA = await inAuthEnvironment(authPool, region.a.environmentId, (client) =>
        client.query('select id from auth.abandon_cases where core_organization_id = $1', [
          organizationId,
        ])
      )
      expect(seenByA.rows).toEqual([])
    })

    test('the table owner is bound too, because the policy is forced', async () => {
      await addCase(region.b.environmentId)
      const seen = await owner.query('select id from auth.abandon_cases')
      expect(seen.rows).toEqual([])
    })

    test('the service role cannot remove an open case, and can remove a resolved one', async () => {
      const open = (await addCase(region.b.environmentId)).rows[0]?.id
      const resolved = (
        await addCase(region.b.environmentId, { resolved_at: new Date(), outcome: 'done' })
      ).rows[0]?.id
      const removed = await inAuthEnvironment(authPool, region.b.environmentId, (client) =>
        client.query('delete from auth.abandon_cases where id = any($1) returning id', [
          [open, resolved],
        ])
      )
      expect(removed.rows).toEqual([{ id: resolved }])
      const still = await inAuthEnvironment(authPool, region.b.environmentId, (client) =>
        client.query('select id from auth.abandon_cases where id = $1', [open])
      )
      expect(still.rowCount).toBe(1)
    })

    test('an open case moves along by the five columns, and by no other', async () => {
      const id = (await addCase(region.b.environmentId)).rows[0]?.id
      const moved = await inAuthEnvironment(authPool, region.b.environmentId, (client) =>
        client.query(
          `update auth.abandon_cases
              set attempts = attempts + 1, next_attempt_at = now() + interval '1 minute',
                  updated_at = now()
            where id = $1`,
          [id]
        )
      )
      expect(moved.rowCount).toBe(1)
      for (const set of [
        'core_organization_id = gen_random_uuid()',
        'user_id = gen_random_uuid()',
        'attempt_id = gen_random_uuid()',
        'environment_id = gen_random_uuid()',
        'project_id = gen_random_uuid()',
        'created_at = now()',
        'id = gen_random_uuid()',
      ]) {
        const message = await rejectionOf(
          inAuthEnvironment(authPool, region.b.environmentId, (client) =>
            client.query(`update auth.abandon_cases set ${set} where id = $1`, [id])
          )
        )
        expect(message, set).toContain('permission denied for table abandon_cases')
      }
    })

    test('the service role cannot empty it wholesale, and the other service roles cannot reach it', async () => {
      expect(await rejectionOf(authPool.query('truncate auth.abandon_cases'))).toContain(
        'permission denied for table abandon_cases'
      )
      const message = await rejectionOf(corePool.query('select 1 from auth.abandon_cases'))
      expect(message).toContain('permission denied')
    })
  })

  describe('the batch and the purge', () => {
    const OPEN = 3000
    const RESOLVED = 3000
    /** Cases already due in environment a before the bulk is seeded: earlier tests add some. */
    let dueBefore = 0

    beforeAll(async () => {
      const earlier = await inAuthEnvironment(authPool, region.a.environmentId, (client) =>
        client.query<{ n: number }>(
          `select count(*)::int as n from auth.abandon_cases
            where environment_id = $1 and resolved_at is null and next_attempt_at <= now()`,
          [region.a.environmentId]
        )
      )
      dueBefore = earlier.rows[0]?.n ?? 0
      // Environment a holds the bulk: most open cases are not due for days, a few are due, and
      // resolved cases are spread over a year with a few old ones.
      await inAuthEnvironment(authPool, region.a.environmentId, async (client) => {
        await client.query(
          `insert into auth.abandon_cases
             (id, project_id, environment_id, core_organization_id, user_id, attempt_id, next_attempt_at)
           select gen_random_uuid(), $1, $2, gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
                  case when n <= 20 then now() - make_interval(mins => n)
                       else now() + make_interval(mins => n) end
             from generate_series(1, $3::int) n`,
          [region.a.projectId, region.a.environmentId, OPEN]
        )
        await client.query(
          `insert into auth.abandon_cases
             (id, project_id, environment_id, core_organization_id, user_id, attempt_id,
              resolved_at, outcome)
           select gen_random_uuid(), $1, $2, gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
                  case when n <= 50 then now() - interval '400 days' + make_interval(mins => n)
                       else now() - make_interval(mins => n) end,
                  'done'
             from generate_series(1, $3::int) n`,
          [region.a.projectId, region.a.environmentId, RESOLVED]
        )
      })
      await owner.query('vacuum analyze auth.abandon_cases')
    })

    const plan = async (sql: string, params: unknown[]): Promise<string> => {
      const result = await inAuthEnvironment(authPool, region.a.environmentId, (client) =>
        client.query<{ 'QUERY PLAN': object }>(`explain (format json) ${sql}`, params)
      )
      return JSON.stringify(result.rows[0]?.['QUERY PLAN'])
    }

    test('the batch of due open cases, oldest first, uses the due index', async () => {
      const text = await plan(
        `select id from auth.abandon_cases
          where environment_id = $1 and resolved_at is null and next_attempt_at <= now()
          order by next_attempt_at
          limit 10
            for update skip locked`,
        [region.a.environmentId]
      )
      expect(text).toContain('abandon_cases_due_idx')
      expect(text).not.toContain('Seq Scan')
      expect(text).not.toContain('"Sort"')
    })

    test('the batch finds the due cases and none of the others', async () => {
      const due = await inAuthEnvironment(authPool, region.a.environmentId, (client) =>
        client.query(
          `select id from auth.abandon_cases
            where environment_id = $1 and resolved_at is null and next_attempt_at <= now()`,
          [region.a.environmentId]
        )
      )
      // The 20 seeded due cases, and whatever earlier tests left due; the other 2980 are not due.
      expect(due.rowCount).toBe(dueBefore + 20)
    })

    test('the purge of old resolved cases uses the purge index', async () => {
      const text = await plan(
        `select id from auth.abandon_cases
          where environment_id = $1 and resolved_at is not null
            and resolved_at < now() - interval '90 days'
          order by resolved_at
          limit 100`,
        [region.a.environmentId]
      )
      expect(text).toContain('abandon_cases_purge_idx')
      expect(text).not.toContain('Seq Scan')
      expect(text).not.toContain('"Sort"')
    })

    test('a purge batch removes old resolved cases in bounded batches and leaves open ones', async () => {
      const purge = () =>
        inAuthEnvironment(authPool, region.a.environmentId, (client) =>
          client.query(
            `delete from auth.abandon_cases
              where id in (select id from auth.abandon_cases
                            where environment_id = $1 and resolved_at is not null
                              and resolved_at < now() - interval '90 days'
                            order by resolved_at
                            limit 30
                              for update skip locked)`,
            [region.a.environmentId]
          )
        )
      expect((await purge()).rowCount).toBe(30)
      expect((await purge()).rowCount).toBe(20)
      expect((await purge()).rowCount).toBe(0)
      const open = await inAuthEnvironment(authPool, region.a.environmentId, (client) =>
        client.query(
          'select count(*)::int as n from auth.abandon_cases where resolved_at is null and environment_id = $1',
          [region.a.environmentId]
        )
      )
      expect(open.rows[0]?.n).toBeGreaterThanOrEqual(OPEN)
    })
  })

  describe('two sweeps at once', () => {
    test('a skip locked batch shared by two connections takes no case twice', async () => {
      const ids = new Set<string>()
      for (let i = 0; i < 10; i++) {
        const row = await addCase(region.b.environmentId, {
          next_attempt_at: new Date(Date.now() - 3_600_000 - i * 1000),
        })
        ids.add(row.rows[0]?.id)
      }
      const first = await authPool.connect()
      const second = await authPool.connect()
      try {
        for (const client of [first, second]) {
          await client.query('begin')
          await client.query('select set_config($1, $2, true)', [
            'tula.environment_id',
            region.b.environmentId,
          ])
        }
        const batch = (client: typeof first) =>
          client.query<{ id: string }>(
            `select id from auth.abandon_cases
              where environment_id = $1 and resolved_at is null
                and next_attempt_at <= now() - interval '1 hour'
                and id = any($2)
              order by next_attempt_at
              limit 6
                for update skip locked`,
            [region.b.environmentId, [...ids]]
          )
        // Both transactions hold their rows when the second asks, so any overlap would show.
        const one = await batch(first)
        const two = await batch(second)
        expect(one.rows).toHaveLength(6)
        expect(two.rows).toHaveLength(4)
        const taken = [...one.rows, ...two.rows].map((row) => row.id)
        expect(new Set(taken)).toEqual(ids)
      } finally {
        for (const client of [first, second]) {
          await client.query('rollback')
          client.release()
        }
      }
    })
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

    const state = (pool: Pool) =>
      pool.query<{ present: boolean; forced: boolean | null; policies: number; selects: boolean }>(
        `select to_regclass('auth.abandon_cases') is not null as present,
                (select relforcerowsecurity from pg_class where oid = to_regclass('auth.abandon_cases')) as forced,
                (select count(*)::int from pg_policies
                  where schemaname = 'auth' and tablename = 'abandon_cases') as policies,
                coalesce(has_table_privilege('closeline_auth', to_regclass('auth.abandon_cases'), 'SELECT'), false) as selects`
      )

    beforeAll(async () => {
      admin = new Pool({ connectionString: adminUrl(), max: 1 })
      // The migrations up to and including 0005, as a folder of their own.
      folder = mkdtempSync(join(tmpdir(), 'closeline-db-at-0005-'))
      mkdirSync(join(folder, 'meta'))
      const journal = JSON.parse(readFileSync(join(MIGRATIONS, 'meta', '_journal.json'), 'utf8'))
      journal.entries = journal.entries.filter((e: { tag: string }) => e.tag < '0006')
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
      const url = await scratch('abandon_fresh')
      await runMigrations(url)
      const found = await withOwner(url, state)
      expect(found.rows).toEqual([{ present: true, forced: true, policies: 2, selects: true }])
    })

    test('applies on a database at 0005 that already holds auth rows', async () => {
      const url = await scratch('abandon_at0005')
      await runMigrations(url, { migrationsFolder: folder })
      await withOwner(url, async (pool) => {
        expect((await state(pool)).rows[0]?.present).toBe(false)
        await pool.query('insert into auth.workspaces (id, name) values ($1, $2)', [uuid(), 'w'])
      })
      await runMigrations(url)
      const found = await withOwner(url, state)
      expect(found.rows).toEqual([{ present: true, forced: true, policies: 2, selects: true }])
    })
  })
})
