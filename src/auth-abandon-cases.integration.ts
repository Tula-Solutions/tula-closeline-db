import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import {
  ABANDON_CLAIM,
  ABANDON_GIVE_UP_SPENT,
  ABANDON_LEARN,
  ABANDON_MIN_GRACE_MS,
  ABANDON_PURGE_BATCH,
  ABANDON_RECORD,
  ABANDON_RESOLVE,
  ABANDON_SETTLE,
} from './auth-statements'
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

/** A column value written as SQL text (a time relative to the database clock), not a parameter. */
class Raw {
  constructor(readonly sql: string) {}
}
const raw = (sql: string): Raw => new Raw(sql)

describe('auth.abandon_cases', () => {
  let owner: Pool
  let authPool: Pool
  let corePool: Pool
  /** Holds the rules, row-level security and grants tests. */
  let region: AuthRegion
  /** Holds the bulk (environment a) and the lease tests (environment b), so counts are exact. */
  let bulk: AuthRegion
  /** Holds the spent-case and grace tests, whose claims must see no other case. */
  let extra: AuthRegion
  /** Holds the settle tests, whose claims and locks must not touch another test's cases. */
  let settling: AuthRegion

  /**
   * Insert a case in an environment. By default it is due, its attempt long over: the attempt
   * expired two hours ago and the case has been due for one. `columns` overrides any column.
   */
  const addCase = (
    environmentId: string,
    columns: Record<string, unknown> = {},
    organizationId: string | null = uuid(),
    projectId: string = region.a.projectId
  ) => {
    const row: Record<string, unknown> = {
      id: uuid(),
      project_id: projectId,
      environment_id: environmentId,
      core_organization_id: organizationId,
      user_id: uuid(),
      attempt_id: uuid(),
      attempt_expires_at: raw(`clock_timestamp() - interval '2 hours'`),
      next_attempt_at: raw(`clock_timestamp() - interval '1 hour'`),
      ...columns,
    }
    const params: unknown[] = []
    const marks = Object.values(row).map((value) => {
      if (value instanceof Raw) {
        return value.sql
      }
      params.push(value)
      return `$${params.length}`
    })
    return inAuthEnvironment(authPool, environmentId, (client) =>
      client.query(
        `insert into auth.abandon_cases (${Object.keys(row).join(', ')})
         values (${marks.join(', ')}) returning id`,
        params
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
    bulk = await seedAuthRegion(authPool)
    extra = await seedAuthRegion(authPool)
    settling = await seedAuthRegion(authPool)
  })

  afterAll(async () => {
    await owner.query('delete from auth.workspaces where id = any($1)', [
      [region?.workspaceId, bulk?.workspaceId, extra?.workspaceId, settling?.workspaceId],
    ])
    await Promise.all([owner.end(), authPool.end(), corePool.end()])
  })

  describe('the rules the table keeps', () => {
    test('a new case is open, unattempted and due by the database clock', async () => {
      const added = await addCase(region.b.environmentId)
      const row = await inAuthEnvironment(authPool, region.b.environmentId, (client) =>
        client.query(
          `select attempts, resolved_at, outcome, next_attempt_at <= clock_timestamp() as due
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
        addCase(region.b.environmentId, { resolved_at: raw('now()'), outcome: 'abandoned' })
      )
      expect(message).toContain('abandon_cases_outcome_known')
    })

    test.each(['done', 'refused', 'gave_up'])(
      'a case resolved as %s is accepted',
      async (outcome) => {
        await addCase(region.b.environmentId, { resolved_at: raw('now()'), outcome })
      }
    )

    test('a resolved case must have an outcome, and an open case must have none', async () => {
      const noOutcome = await rejectionOf(
        addCase(region.b.environmentId, { resolved_at: raw('now()') })
      )
      expect(noOutcome).toContain('abandon_cases_resolution_whole')
      const noTime = await rejectionOf(addCase(region.b.environmentId, { outcome: 'done' }))
      expect(noTime).toContain('abandon_cases_resolution_whole')
    })

    test('an open case is resolved by an update that sets both, and by no update that sets one', async () => {
      const id = (await addCase(region.b.environmentId)).rows[0]?.id
      const one = await rejectionOf(
        inAuthEnvironment(authPool, region.b.environmentId, (client) =>
          client.query(`update auth.abandon_cases set outcome = 'done' where id = $1`, [id])
        )
      )
      expect(one).toContain('abandon_cases_resolution_whole')
      const both = await inAuthEnvironment(authPool, region.b.environmentId, (client) =>
        client.query(ABANDON_RESOLVE, [id, region.b.environmentId, 'done'])
      )
      expect(both.rows).toEqual([{ id }])
      const again = await inAuthEnvironment(authPool, region.b.environmentId, (client) =>
        client.query(ABANDON_RESOLVE, [id, region.b.environmentId, 'gave_up'])
      )
      expect(again.rows).toEqual([])
    })

    test('a case is never due before its attempt has ended', async () => {
      const message = await rejectionOf(
        addCase(region.b.environmentId, {
          attempt_expires_at: raw(`clock_timestamp() + interval '1 hour'`),
          next_attempt_at: raw(`clock_timestamp() + interval '1 minute'`),
        })
      )
      expect(message).toContain('abandon_cases_due_after_expiry')
      await addCase(region.b.environmentId, {
        attempt_expires_at: raw(`timestamptz '2031-01-01 00:00:00+00'`),
        next_attempt_at: raw(`timestamptz '2031-01-01 00:00:00+00'`),
      })
    })

    test('an Organization has one case in an environment, and may have one in another', async () => {
      const organizationId = uuid()
      await addCase(region.b.environmentId, {}, organizationId)
      const again = await rejectionOf(addCase(region.b.environmentId, {}, organizationId))
      expect(again).toContain('abandon_cases_environment_organization_key')
      await addCase(region.a.environmentId, {}, organizationId)
    })

    test('an attempt has one case in an environment, whatever Organization it names', async () => {
      const attemptId = uuid()
      await addCase(region.b.environmentId, { attempt_id: attemptId })
      const again = await rejectionOf(addCase(region.b.environmentId, { attempt_id: attemptId }))
      expect(again).toContain('abandon_cases_environment_attempt_key')
    })

    test('cases with no Organization id yet coexist (nulls are distinct in a unique key), one per attempt', async () => {
      // Postgres treats nulls as distinct in a unique constraint (NULLS DISTINCT, the default), so
      // the Organization key never collides on null; the attempt key keeps each to one case.
      await addCase(region.b.environmentId, {}, null)
      await addCase(region.b.environmentId, {}, null)
      const attemptId = uuid()
      await addCase(region.b.environmentId, { attempt_id: attemptId }, null)
      const again = await rejectionOf(
        addCase(region.b.environmentId, { attempt_id: attemptId }, null)
      )
      expect(again).toContain('abandon_cases_environment_attempt_key')
    })

    test('a case with no Organization id is found by the due batch and gets its id once learned', async () => {
      const attemptId = uuid()
      const id = (
        await addCase(bulk.b.environmentId, { attempt_id: attemptId }, null, bulk.projectId)
      ).rows[0]?.id
      const claimed = await inAuthEnvironment(authPool, bulk.b.environmentId, (client) =>
        client.query(ABANDON_CLAIM, [bulk.b.environmentId, 100, 3_600_000])
      )
      expect(claimed.rows.find((row) => row.id === id)).toMatchObject({
        core_organization_id: null,
        attempt_id: attemptId,
        attempts: 1,
      })
      const organizationId = uuid()
      const filled = await inAuthEnvironment(authPool, bulk.b.environmentId, (client) =>
        client.query(
          'update auth.abandon_cases set core_organization_id = $2 where id = $1 returning id',
          [id, organizationId]
        )
      )
      expect(filled.rowCount).toBe(1)
    })

    test('recording a case twice keeps the first, silently, and a resolved case still blocks its Organization', async () => {
      const organizationId = uuid()
      const record = (attemptId: string, org: string | null) =>
        inAuthEnvironment(authPool, region.b.environmentId, (client) =>
          client.query(ABANDON_RECORD, [
            uuid(),
            region.b.projectId,
            region.b.environmentId,
            org,
            uuid(),
            attemptId,
            new Date(Date.UTC(2020, 0, 1)),
            ABANDON_MIN_GRACE_MS,
          ])
        )
      const first = uuid()
      expect((await record(first, organizationId)).rowCount).toBe(1)
      // The same Organization under another attempt, and the same attempt under another
      // Organization: both are conflicts, both silent.
      expect((await record(uuid(), organizationId)).rowCount).toBe(0)
      expect((await record(first, uuid())).rowCount).toBe(0)
      const resolved = await inAuthEnvironment(authPool, region.b.environmentId, (client) =>
        client.query(
          `update auth.abandon_cases set resolved_at = clock_timestamp(), outcome = 'done'
            where core_organization_id = $1 returning id`,
          [organizationId]
        )
      )
      expect(resolved.rowCount).toBe(1)
      expect((await record(uuid(), organizationId)).rowCount).toBe(0)
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
               (id, project_id, environment_id, core_organization_id, user_id, attempt_id,
                attempt_expires_at, next_attempt_at)
             values ($1, $2, $3, $4, $5, $6, now(), now())`,
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
        await addCase(region.b.environmentId, { resolved_at: raw('now()'), outcome: 'done' })
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

    test('a case moves along by six columns, and by no other', async () => {
      const id = (await addCase(region.b.environmentId)).rows[0]?.id
      const moved = await inAuthEnvironment(authPool, region.b.environmentId, (client) =>
        client.query(
          `update auth.abandon_cases
              set attempts = attempts + 1, next_attempt_at = clock_timestamp() + interval '1 minute',
                  updated_at = clock_timestamp()
            where id = $1`,
          [id]
        )
      )
      expect(moved.rowCount).toBe(1)
      for (const set of [
        'user_id = gen_random_uuid()',
        'attempt_id = gen_random_uuid()',
        'attempt_expires_at = now()',
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

    beforeAll(async () => {
      // Environment a of the bulk region holds nothing else: 20 open cases are due, the rest are
      // not due for days; resolved cases are recent but for 50 that ended 400 days ago.
      await inAuthEnvironment(authPool, bulk.a.environmentId, async (client) => {
        await client.query(
          `insert into auth.abandon_cases
             (id, project_id, environment_id, core_organization_id, user_id, attempt_id,
              attempt_expires_at, next_attempt_at)
           select gen_random_uuid(), $1, $2, gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
                  due - interval '1 hour', due
             from (select case when n <= 20 then clock_timestamp() - make_interval(mins => n)
                               else clock_timestamp() + make_interval(mins => n) end as due
                     from generate_series(1, $3::int) n) s`,
          [bulk.projectId, bulk.a.environmentId, OPEN]
        )
        await client.query(
          `insert into auth.abandon_cases
             (id, project_id, environment_id, core_organization_id, user_id, attempt_id,
              attempt_expires_at, next_attempt_at, resolved_at, outcome)
           select gen_random_uuid(), $1, $2, gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
                  clock_timestamp() - interval '500 days', clock_timestamp() - interval '500 days',
                  case when n <= 50 then clock_timestamp() - interval '400 days' + make_interval(mins => n)
                       else clock_timestamp() - make_interval(secs => n) end,
                  'done'
             from generate_series(1, $3::int) n`,
          [bulk.projectId, bulk.a.environmentId, RESOLVED]
        )
      })
      await owner.query('vacuum analyze auth.abandon_cases')
    })

    const plan = async (sql: string, params: unknown[]): Promise<string> => {
      const result = await inAuthEnvironment(authPool, bulk.a.environmentId, (client) =>
        client.query<{ 'QUERY PLAN': object }>(`explain (format json) ${sql}`, params)
      )
      return JSON.stringify(result.rows[0]?.['QUERY PLAN'])
    }

    test('the selection inside the claim, oldest first, uses the due index', async () => {
      const text = await plan(
        `select id from auth.abandon_cases
          where environment_id = $1 and resolved_at is null and next_attempt_at <= clock_timestamp()
          order by next_attempt_at
          limit 10
            for update skip locked`,
        [bulk.a.environmentId]
      )
      expect(text).toContain('abandon_cases_due_idx')
      expect(text).not.toContain('Seq Scan')
      expect(text).not.toContain('"Sort"')
    })

    test('the due cases are the 20 whose time has passed, and a case whose attempt can still write an account is not among them', async () => {
      // An open case far in the future for its attempt: not due.
      await addCase(
        bulk.a.environmentId,
        {
          attempt_expires_at: raw(`clock_timestamp() + interval '1 hour'`),
          next_attempt_at: raw(`clock_timestamp() + interval '1 hour'`),
        },
        uuid(),
        bulk.projectId
      )
      const due = await inAuthEnvironment(authPool, bulk.a.environmentId, (client) =>
        client.query(
          `select id from auth.abandon_cases
            where environment_id = $1 and resolved_at is null and next_attempt_at <= clock_timestamp()`,
          [bulk.a.environmentId]
        )
      )
      expect(due.rowCount).toBe(20)
    })

    test('the purge of old resolved cases uses the purge index', async () => {
      const text = await plan(
        `select id from auth.abandon_cases
          where environment_id = $1 and resolved_at is not null
            and resolved_at < clock_timestamp() - interval '1 day'
          order by resolved_at
          limit 100`,
        [bulk.a.environmentId]
      )
      expect(text).toContain('abandon_cases_purge_idx')
      expect(text).not.toContain('Seq Scan')
      expect(text).not.toContain('"Sort"')
    })

    test('the purge statement removes old resolved cases in bounded batches and leaves the rest', async () => {
      const purge = () =>
        inAuthEnvironment(authPool, bulk.a.environmentId, (client) =>
          client.query(ABANDON_PURGE_BATCH, [bulk.a.environmentId, 30])
        )
      expect((await purge()).rowCount).toBe(30)
      expect((await purge()).rowCount).toBe(20)
      expect((await purge()).rowCount).toBe(0)
      const left = await inAuthEnvironment(authPool, bulk.a.environmentId, (client) =>
        client.query(
          `select count(*) filter (where resolved_at is null)::int as open,
                  count(*) filter (where resolved_at is not null)::int as resolved
             from auth.abandon_cases where environment_id = $1`,
          [bulk.a.environmentId]
        )
      )
      expect(left.rows).toEqual([{ open: OPEN + 1, resolved: RESOLVED - 50 }])
    })
  })

  describe('a case that has used every attempt', () => {
    test('is never claimed, so it cannot wedge the batch, and ends gave_up through the safety-net statement', async () => {
      const environmentId = extra.a.environmentId
      const spent = (await addCase(environmentId, { attempts: 100 }, uuid(), extra.projectId))
        .rows[0]?.id
      const other = (await addCase(environmentId, {}, uuid(), extra.projectId)).rows[0]?.id
      const claimed = await inAuthEnvironment(authPool, environmentId, (client) =>
        client.query(ABANDON_CLAIM, [environmentId, 10, 60_000])
      )
      expect(claimed.rows.map((row) => ({ id: row.id, attempts: row.attempts }))).toEqual([
        { id: other, attempts: 1 },
      ])
      const given = await inAuthEnvironment(authPool, environmentId, (client) =>
        client.query(ABANDON_GIVE_UP_SPENT, [environmentId, 10])
      )
      expect(given.rows).toEqual([{ id: spent }])
      const row = await inAuthEnvironment(authPool, environmentId, (client) =>
        client.query(
          'select outcome, resolved_at is not null as resolved from auth.abandon_cases where id = $1',
          [spent]
        )
      )
      expect(row.rows).toEqual([{ outcome: 'gave_up', resolved: true }])
      // Nothing left to give up, and the leased case is not spent.
      const again = await inAuthEnvironment(authPool, environmentId, (client) =>
        client.query(ABANDON_GIVE_UP_SPENT, [environmentId, 10])
      )
      expect(again.rows).toEqual([])
    })
  })

  describe('the grace after an attempt expires', () => {
    const databaseNow = async (): Promise<Date> =>
      (await owner.query<{ t: Date }>('select clock_timestamp() as t')).rows[0]?.t ?? new Date(0)

    const record = async (expiresAt: Date, graceMs: number, target: AuthRegion = extra) => {
      const environmentId = target.b.environmentId
      const added = await inAuthEnvironment(authPool, environmentId, (client) =>
        client.query(ABANDON_RECORD, [
          uuid(),
          target.projectId,
          environmentId,
          uuid(),
          uuid(),
          uuid(),
          expiresAt,
          graceMs,
        ])
      )
      return added.rows[0]?.id as string
    }

    const claimIds = async (): Promise<string[]> => {
      const environmentId = extra.b.environmentId
      const claimed = await inAuthEnvironment(authPool, environmentId, (client) =>
        client.query(ABANDON_CLAIM, [environmentId, 50, 600_000])
      )
      return claimed.rows.map((row) => row.id as string)
    }

    test('a grace below the floor is raised to it, and the case never precedes its expiry', async () => {
      const now = await databaseNow()
      // In the rules region, not extra.b: this case is long due and must not reach the claims below.
      const id = await record(new Date(now.getTime() - 3_600_000), 0, region)
      const gap = await inAuthEnvironment(authPool, region.b.environmentId, (client) =>
        client.query(
          `select extract(epoch from next_attempt_at - attempt_expires_at)::float8 as seconds
             from auth.abandon_cases where id = $1`,
          [id]
        )
      )
      expect(gap.rows).toEqual([{ seconds: ABANDON_MIN_GRACE_MS / 1000 }])
    })

    test('a case is not claimable before expiry plus grace, and is after', async () => {
      const now = await databaseNow()
      const future = await record(new Date(now.getTime() + 3_600_000), 1)
      const justExpired = await record(now, 1)
      const longAgo = await record(new Date(now.getTime() - 3_600_000), 1)
      // Only the case whose expiry and grace are both behind the database clock is claimable.
      expect(await claimIds()).toEqual([longAgo])
      // Let the grace of the second pass (move its due time to now, which the table allows
      // because its expiry is past), and it is claimable; the future one still is not.
      await inAuthEnvironment(authPool, extra.b.environmentId, (client) =>
        client.query(
          'update auth.abandon_cases set next_attempt_at = clock_timestamp() where id = $1',
          [justExpired]
        )
      )
      expect(await claimIds()).toEqual([justExpired])
      expect(future).toBeDefined()
    })

    test('a time before the expiry cannot be made the due time', async () => {
      const now = await databaseNow()
      const future = await record(new Date(now.getTime() + 3_600_000), 1)
      const message = await rejectionOf(
        inAuthEnvironment(authPool, extra.b.environmentId, (client) =>
          client.query(
            'update auth.abandon_cases set next_attempt_at = clock_timestamp() where id = $1',
            [future]
          )
        )
      )
      expect(message).toContain('abandon_cases_due_after_expiry')
    })
  })

  describe('settling a case from the account transaction', () => {
    const environmentId = () => settling.a.environmentId
    const add = async (columns: Record<string, unknown> = {}): Promise<string> =>
      (await addCase(environmentId(), columns, uuid(), settling.projectId)).rows[0]?.id as string
    const settle = (id: string, environment: string = environmentId()) =>
      inAuthEnvironment(authPool, environment, (client) =>
        client.query(ABANDON_SETTLE, [id, environment])
      )
    const claimed = async (): Promise<string[]> =>
      (
        await inAuthEnvironment(authPool, environmentId(), (client) =>
          client.query(ABANDON_CLAIM, [environmentId(), 50, 600_000])
        )
      ).rows.map((row) => row.id as string)
    const stored = async (id: string) =>
      (
        await inAuthEnvironment(authPool, environmentId(), (client) =>
          client.query(
            'select attempts, outcome, resolved_at, updated_at from auth.abandon_cases where id = $1',
            [id]
          )
        )
      ).rows[0]

    /** Open a transaction on its own connection, scoped to the environment like the helper. */
    const open = async () => {
      const client = await authPool.connect()
      await client.query('begin')
      await client.query('select set_config($1, $2, true)', [
        'tula.environment_id',
        environmentId(),
      ])
      const pid = (await client.query('select pg_backend_pid() as pid')).rows[0]?.pid as number
      return { client, pid }
    }

    /** Wait until the backend `pid` is waiting for a lock (bounded by tries, not by a clock). */
    const untilBlocked = async (pid: number): Promise<void> => {
      for (let tries = 0; tries < 2000; tries++) {
        const waiting = await owner.query('select 1 from pg_locks where pid = $1 and not granted', [
          pid,
        ])
        if (waiting.rowCount) {
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 5))
      }
      throw new Error(`backend ${pid} never waited for a lock`)
    }

    test('settling an open case resolves it as refused, and the sweep never claims it', async () => {
      const id = await add()
      expect((await settle(id)).rows).toEqual([{ id }])
      const row = await stored(id)
      expect(row).toMatchObject({ attempts: 0, outcome: 'refused' })
      expect(row.resolved_at).toBeInstanceOf(Date)
      expect(await claimed()).not.toContain(id)
      expect(await stored(id)).toMatchObject({ attempts: 0, outcome: 'refused' })
    })

    test('a case the sweep claimed is not settled, and nothing changes', async () => {
      const id = await add()
      expect(await claimed()).toContain(id)
      const before = await stored(id)
      expect((await settle(id)).rowCount).toBe(0)
      expect(await stored(id)).toEqual(before)
      expect(before).toMatchObject({ attempts: 1, outcome: null, resolved_at: null })
    })

    test('learning the Organization does not stop a settle', async () => {
      const id = await add({ core_organization_id: null })
      await inAuthEnvironment(authPool, environmentId(), (client) =>
        client.query(ABANDON_LEARN, [id, environmentId(), uuid()])
      )
      expect((await settle(id)).rows).toEqual([{ id }])
    })

    test('a settle holding the row keeps a claim from it', async () => {
      const id = await add()
      const holder = await open()
      const sweeper = await open()
      try {
        expect((await holder.client.query(ABANDON_SETTLE, [id, environmentId()])).rowCount).toBe(1)
        // Skip locked: the claim does not wait, and it does not take the held case.
        const taken = await sweeper.client.query(ABANDON_CLAIM, [environmentId(), 50, 600_000])
        expect(taken.rows.map((row) => row.id)).not.toContain(id)
        await holder.client.query('commit')
        await sweeper.client.query('commit')
      } finally {
        holder.client.release()
        sweeper.client.release()
      }
      expect(await stored(id)).toMatchObject({ attempts: 0, outcome: 'refused' })
      expect(await claimed()).not.toContain(id)
    })

    test('a settle that waits for a claim finds the case claimed and returns no row', async () => {
      const id = await add()
      const sweeper = await open()
      const request = await open()
      try {
        const taken = await sweeper.client.query(ABANDON_CLAIM, [environmentId(), 50, 600_000])
        expect(taken.rows.map((row) => row.id)).toContain(id)
        const waiting = request.client.query(ABANDON_SETTLE, [id, environmentId()])
        await untilBlocked(request.pid)
        await sweeper.client.query('commit')
        // The predicate is checked again against the claimed row: attempts is now 1.
        expect((await waiting).rowCount).toBe(0)
        await request.client.query('commit')
      } finally {
        sweeper.client.release()
        request.client.release()
      }
      expect(await stored(id)).toMatchObject({ attempts: 1, outcome: null, resolved_at: null })
    })

    test('a settle that waits for a claim that rolls back settles the case', async () => {
      const id = await add()
      const sweeper = await open()
      const request = await open()
      try {
        await sweeper.client.query(ABANDON_CLAIM, [environmentId(), 50, 600_000])
        const waiting = request.client.query(ABANDON_SETTLE, [id, environmentId()])
        await untilBlocked(request.pid)
        await sweeper.client.query('rollback')
        expect((await waiting).rows).toEqual([{ id }])
        await request.client.query('commit')
      } finally {
        sweeper.client.release()
        request.client.release()
      }
      expect(await stored(id)).toMatchObject({ attempts: 0, outcome: 'refused' })
    })

    test.each(['done', 'refused', 'gave_up'])(
      'a case already resolved as %s is not settled, and keeps its outcome',
      async (outcome) => {
        const id = await add({ resolved_at: raw('now()'), outcome })
        const before = await stored(id)
        expect((await settle(id)).rowCount).toBe(0)
        expect(await stored(id)).toEqual(before)
      }
    )

    test('settling twice returns a row once', async () => {
      const id = await add()
      expect((await settle(id)).rowCount).toBe(1)
      expect((await settle(id)).rowCount).toBe(0)
    })

    test('no case at all returns no row, the same as a lost race', async () => {
      expect((await settle(uuid())).rowCount).toBe(0)
    })

    test('a case of another environment is not settled', async () => {
      const id = (await addCase(settling.b.environmentId, {}, uuid(), settling.projectId)).rows[0]
        ?.id as string
      expect((await settle(id)).rowCount).toBe(0)
      expect((await settle(id, settling.b.environmentId)).rowCount).toBe(1)
    })
  })

  describe('learning the Organization of a case', () => {
    const learn = (id: string, organizationId: string) =>
      inAuthEnvironment(authPool, region.a.environmentId, (client) =>
        client.query(ABANDON_LEARN, [id, region.a.environmentId, organizationId])
      )
    const organizationOf = async (id: string) =>
      (
        await inAuthEnvironment(authPool, region.a.environmentId, (client) =>
          client.query('select core_organization_id as org from auth.abandon_cases where id = $1', [
            id,
          ])
        )
      ).rows[0]?.org

    test('fills a null once, and never overwrites an id', async () => {
      const id = (await addCase(region.a.environmentId, {}, null)).rows[0]?.id
      const first = uuid()
      expect((await learn(id, first)).rows).toEqual([{ id }])
      expect(await organizationOf(id)).toBe(first)
      expect((await learn(id, uuid())).rowCount).toBe(0)
      expect(await organizationOf(id)).toBe(first)
    })

    test('does not touch a resolved case', async () => {
      const id = (
        await addCase(region.a.environmentId, { resolved_at: raw('now()'), outcome: 'done' }, null)
      ).rows[0]?.id
      expect((await learn(id, uuid())).rowCount).toBe(0)
      expect(await organizationOf(id)).toBeNull()
    })

    test('an Organization another case already holds is the unique violation, and the case stays without it', async () => {
      const held = uuid()
      await addCase(region.a.environmentId, {}, held)
      const id = (await addCase(region.a.environmentId, {}, null)).rows[0]?.id
      const message = await rejectionOf(learn(id, held))
      expect(message).toContain('abandon_cases_environment_organization_key')
      expect(await organizationOf(id)).toBeNull()
    })
  })

  describe('the lease', () => {
    test('two claims at once take different cases, each case once, and a lease keeps them away until it ends', async () => {
      const environmentId = bulk.b.environmentId
      // One case whose attempt is not over, and ten that are due.
      const notDue = (
        await addCase(
          environmentId,
          {
            attempt_expires_at: raw(`clock_timestamp() + interval '1 hour'`),
            next_attempt_at: raw(`clock_timestamp() + interval '1 hour'`),
          },
          uuid(),
          bulk.projectId
        )
      ).rows[0]?.id
      const ids = new Set<string>()
      for (let i = 0; i < 10; i++) {
        const row = await addCase(
          environmentId,
          { next_attempt_at: raw(`clock_timestamp() - make_interval(secs => ${60 + i})`) },
          uuid(),
          bulk.projectId
        )
        ids.add(row.rows[0]?.id)
      }
      const first = await authPool.connect()
      const second = await authPool.connect()
      try {
        for (const client of [first, second]) {
          await client.query('begin')
          await client.query('select set_config($1, $2, true)', [
            'tula.environment_id',
            environmentId,
          ])
        }
        // The first transaction still holds its rows when the second claims, so an overlap shows.
        const one = await first.query(ABANDON_CLAIM, [environmentId, 6, 300_000])
        const two = await second.query(ABANDON_CLAIM, [environmentId, 6, 300_000])
        expect(one.rows).toHaveLength(6)
        const taken = [...one.rows, ...two.rows].map((row) => row.id as string)
        expect(new Set(taken).size).toBe(taken.length)
        expect(new Set(taken)).toEqual(ids)
        expect(taken).not.toContain(notDue)
        expect([...one.rows, ...two.rows].every((row) => row.attempts === 1)).toBe(true)
        await first.query('commit')
        await second.query('commit')
      } finally {
        first.release()
        second.release()
      }
      // Leased: nothing is due now, and the lease is in the future by the database clock.
      const again = await inAuthEnvironment(authPool, environmentId, (client) =>
        client.query(ABANDON_CLAIM, [environmentId, 100, 300_000])
      )
      expect(again.rows).toEqual([])
      const leased = await inAuthEnvironment(authPool, environmentId, (client) =>
        client.query(
          `select count(*)::int as n from auth.abandon_cases
            where id = any($1) and next_attempt_at > clock_timestamp()`,
          [[...ids]]
        )
      )
      expect(leased.rows[0]?.n).toBe(10)
      // A crashed worker's lease ends: back-date one so it is due again; it is tried a second time.
      const target = [...ids][0]
      await inAuthEnvironment(authPool, environmentId, (client) =>
        client.query(
          'update auth.abandon_cases set next_attempt_at = clock_timestamp() where id = $1',
          [target]
        )
      )
      const retried = await inAuthEnvironment(authPool, environmentId, (client) =>
        client.query(ABANDON_CLAIM, [environmentId, 100, 300_000])
      )
      expect(retried.rows.map((row) => ({ id: row.id, attempts: row.attempts }))).toEqual([
        { id: target, attempts: 2 },
      ])
      // The outcome is recorded in a second short transaction, once.
      const resolved = await inAuthEnvironment(authPool, environmentId, (client) =>
        client.query(ABANDON_RESOLVE, [target, environmentId, 'done'])
      )
      expect(resolved.rows).toEqual([{ id: target }])
      const none = await inAuthEnvironment(authPool, environmentId, (client) =>
        client.query(ABANDON_RESOLVE, [target, environmentId, 'done'])
      )
      expect(none.rows).toEqual([])
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
