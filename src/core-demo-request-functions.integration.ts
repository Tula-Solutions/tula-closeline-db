import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Pool } from 'pg'
import { createDb, type DbHandle } from './client'
import {
  claimDemoNotices,
  purgeDemoRequests,
  settleDemoNotice,
  submitDemoRequest,
} from './core-demo-requests'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { findTenantIsolationGaps } from './isolation'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const TABLE = 'core.demo_request'

let seq = Math.floor(Math.random() * 1e9)
const newId = (): string => `dreq_${(++seq).toString(16).padStart(32, '0')}`
const newKey = (): string => `fn-key-${(++seq).toString(16).padStart(24, '0')}`

const input = (over: Record<string, unknown> = {}) => ({
  id: newId(),
  name: 'Ada Visitor',
  workEmail: 'ada@example.test',
  companyName: 'Analytical Engines',
  message: null as string | null,
  sourcePage: '/pricing',
  idempotencyKey: newKey(),
  ...over,
})

describe('core demo request functions', () => {
  let owner: Pool
  let core: Pool
  let auth: Pool
  let playbook: Pool
  let handle: DbHandle
  let coreHandle: DbHandle

  /** Remove every row so a test starts from an empty table (the owner is the only role that may). */
  async function emptyTable(): Promise<void> {
    await owner.query(`truncate ${TABLE}`)
  }

  /** Move a row's submission time back by `interval`. */
  async function age(id: string, interval: string): Promise<void> {
    await owner.query(`update ${TABLE} set submitted_at = now() - $2::interval where id = $1`, [
      id,
      interval,
    ])
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    core = new Pool({ connectionString: env.core, max: 4 })
    auth = new Pool({ connectionString: env.auth, max: 1 })
    playbook = new Pool({ connectionString: env.playbook, max: 1 })
    handle = createDb(env.core, { max: 1 })
    coreHandle = createDb(env.core, { max: 4 })
  })

  afterAll(async () => {
    await emptyTable()
    await dropStaleTestObjects(owner, env.owner)
    await handle.close()
    await coreHandle.close()
    await Promise.all([owner.end(), core.end(), auth.end(), playbook.end()])
  })

  describe('submit_demo_request', () => {
    test('stores a row as closeline_core with no Organization set', async () => {
      await emptyTable()
      const first = input({ message: 'hello' })
      const result = await submitDemoRequest(coreHandle.db, first)
      expect(result).toEqual({ id: first.id, replayed: false, sameFields: true })
      const { rows } = await owner.query(
        `select name, work_email, message, notification_status, notification_attempts from ${TABLE} where id = $1`,
        [first.id]
      )
      expect(rows).toEqual([
        {
          name: 'Ada Visitor',
          work_email: 'ada@example.test',
          message: 'hello',
          notification_status: 'pending',
          notification_attempts: 0,
        },
      ])
    })

    test('a replay with the same fields returns the first id and stores nothing new', async () => {
      await emptyTable()
      const first = input()
      await submitDemoRequest(coreHandle.db, first)
      const replay = await submitDemoRequest(coreHandle.db, { ...first, id: newId() })
      expect(replay).toEqual({ id: first.id, replayed: true, sameFields: true })
      const { rows } = await owner.query(`select count(*)::int as n from ${TABLE}`)
      expect(rows[0].n).toBe(1)
    })

    test('a reused key with a different body is reported as different, and changes nothing', async () => {
      await emptyTable()
      const first = input()
      await submitDemoRequest(coreHandle.db, first)
      for (const changed of [
        { name: 'Someone Else' },
        { workEmail: 'other@example.test' },
        { companyName: 'Other Co' },
        { message: 'now with a message' },
        { sourcePage: '/other' },
      ]) {
        const result = await submitDemoRequest(coreHandle.db, { ...first, id: newId(), ...changed })
        expect(result).toEqual({ id: first.id, replayed: true, sameFields: false })
      }
      const { rows } = await owner.query(`select name, message from ${TABLE}`)
      expect(rows).toEqual([{ name: 'Ada Visitor', message: null }])
    })

    test('a null message replays as the same, not as different', async () => {
      await emptyTable()
      const first = input({ message: null })
      await submitDemoRequest(coreHandle.db, first)
      const replay = await submitDemoRequest(coreHandle.db, { ...first, id: newId() })
      expect(replay.sameFields).toBe(true)
    })

    test('the table constraints still refuse a bad field', async () => {
      await emptyTable()
      await expect(
        submitDemoRequest(coreHandle.db, input({ workEmail: 'not-an-email' }))
      ).rejects.toThrow()
      const { rows } = await owner.query(`select count(*)::int as n from ${TABLE}`)
      expect(rows[0].n).toBe(0)
    })

    test('a refused field raises an error that carries no Visitor data', async () => {
      await emptyTable()
      const error = await submitDemoRequest(
        coreHandle.db,
        input({ workEmail: 'bad', name: 'SECRETNAME', message: 'SECRETBODY' })
      ).then(
        () => null,
        (e: unknown) => e as Error & { code?: string; constraint?: string }
      )
      expect(error).not.toBeNull()
      expect(error?.code).toBe('23514')
      expect(error?.constraint).toBe('demo_request_work_email_shape')
      const seen = JSON.stringify(error, Object.getOwnPropertyNames(error ?? {}))
      const chain: string[] = [seen, error?.stack ?? '']
      for (let c = error?.cause as Error | undefined; c; c = c.cause as Error | undefined) {
        chain.push(c.message, JSON.stringify(c, Object.getOwnPropertyNames(c)))
      }
      for (const text of chain) {
        expect(text).not.toContain('SECRETNAME')
        expect(text).not.toContain('SECRETBODY')
      }
    })

    test('a malformed id is refused before any query', async () => {
      await expect(submitDemoRequest(coreHandle.db, input({ id: 'nope' }))).rejects.toThrow(
        'invalid id'
      )
    })
  })

  describe('claim_demo_notices', () => {
    test('claims oldest first, counts the attempt and stamps the time', async () => {
      await emptyTable()
      const a = input()
      const b = input()
      const c = input()
      for (const row of [a, b, c]) {
        await submitDemoRequest(coreHandle.db, row)
      }
      await age(a.id, '3 hours')
      await age(b.id, '2 hours')
      await age(c.id, '1 hour')
      const claimed = await claimDemoNotices(coreHandle.db, 2, 0)
      expect(claimed.map((row) => row.id)).toEqual([a.id, b.id])
      expect(claimed.every((row) => row.attempts === 1)).toBe(true)
      expect(claimed[0]?.workEmail).toBe('ada@example.test')
      const { rows } = await owner.query(
        `select id, notification_attempts as n, notification_last_attempt_at is not null as stamped
           from ${TABLE} order by id`
      )
      const byId = new Map(rows.map((row) => [row.id, row]))
      expect(byId.get(a.id)).toMatchObject({ n: 1, stamped: true })
      expect(byId.get(c.id)).toMatchObject({ n: 0, stamped: false })
    })

    test('skips a row tried within the backoff, and takes it again after', async () => {
      await emptyTable()
      const a = input()
      await submitDemoRequest(coreHandle.db, a)
      expect(await claimDemoNotices(coreHandle.db, 10, 60)).toHaveLength(1)
      expect(await claimDemoNotices(coreHandle.db, 10, 60)).toHaveLength(0)
      await owner.query(
        `update ${TABLE} set notification_last_attempt_at = now() - interval '2 minutes' where id = $1`,
        [a.id]
      )
      const again = await claimDemoNotices(coreHandle.db, 10, 60)
      expect(again.map((row) => [row.id, row.attempts])).toEqual([[a.id, 2]])
    })

    test('never returns a settled row', async () => {
      await emptyTable()
      const a = input()
      const b = input()
      await submitDemoRequest(coreHandle.db, a)
      await submitDemoRequest(coreHandle.db, b)
      await settleDemoNotice(coreHandle.db, a.id, 'sent')
      await settleDemoNotice(coreHandle.db, b.id, 'failed')
      expect(await claimDemoNotices(coreHandle.db, 10, 0)).toEqual([])
    })

    test('caps the limit at 100 rows', async () => {
      await emptyTable()
      await owner.query(
        `insert into ${TABLE} (id, name, work_email, company_name, source_page, idempotency_key)
         select 'dreq_' || lpad(to_hex(g), 32, '0'), 'n', 'a@b.test', 'c', '/',
                'cap-key-' || lpad(g::text, 12, '0')
           from generate_series(1, 130) g`
      )
      expect(await claimDemoNotices(coreHandle.db, 1000, 3600)).toHaveLength(100)
      expect(await claimDemoNotices(coreHandle.db, 1000, 3600)).toHaveLength(30)
    })

    test('two concurrent claims never return the same row', async () => {
      await emptyTable()
      await owner.query(
        `insert into ${TABLE} (id, name, work_email, company_name, source_page, idempotency_key)
         select 'dreq_' || lpad(to_hex(g), 32, '0'), 'n', 'a@b.test', 'c', '/',
                'race-key-' || lpad(g::text, 12, '0')
           from generate_series(1, 40) g`
      )
      const batches = await Promise.all(
        Array.from({ length: 6 }, () => claimDemoNotices(coreHandle.db, 15, 3600))
      )
      const ids = batches.flat().map((row) => row.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids).toHaveLength(40)
    })

    test('rejects a bad limit or backoff before any query', async () => {
      await expect(claimDemoNotices(coreHandle.db, 0, 0)).rejects.toThrow('limit')
      await expect(claimDemoNotices(coreHandle.db, 1.5, 0)).rejects.toThrow('limit')
      await expect(claimDemoNotices(coreHandle.db, 1, -1)).rejects.toThrow('backoff')
    })
  })

  describe('settle_demo_notice', () => {
    test('settles a pending notice once, then reports false', async () => {
      await emptyTable()
      const a = input()
      await submitDemoRequest(coreHandle.db, a)
      expect(await settleDemoNotice(coreHandle.db, a.id, 'sent')).toBe(true)
      expect(await settleDemoNotice(coreHandle.db, a.id, 'failed')).toBe(false)
      const { rows } = await owner.query(`select notification_status as s from ${TABLE}`)
      expect(rows).toEqual([{ s: 'sent' }])
    })

    test('reports false for an unknown id', async () => {
      expect(await settleDemoNotice(coreHandle.db, newId(), 'failed')).toBe(false)
    })

    test('the database refuses any status but sent or failed', async () => {
      const refused = await core
        .query('select core.settle_demo_notice($1, $2)', [newId(), 'pending'])
        .then(
          () => null,
          (error: { code?: string }) => error.code
        )
      expect(refused).toBe('22023')
    })
  })

  describe('purge_demo_requests', () => {
    test('deletes only rows older than twelve months and returns the count', async () => {
      await emptyTable()
      const old1 = input()
      const old2 = input()
      const edge = input()
      const young = input()
      for (const row of [old1, old2, edge, young]) {
        await submitDemoRequest(coreHandle.db, row)
      }
      await age(old1.id, '13 months')
      await age(old2.id, '400 days')
      await age(edge.id, '11 months 29 days')
      await age(young.id, '1 day')
      expect(await purgeDemoRequests(coreHandle.db, 100)).toBe(2)
      const { rows } = await owner.query(`select id from ${TABLE}`)
      expect(rows.map((row) => row.id).sort()).toEqual([edge.id, young.id].sort())
      expect(await purgeDemoRequests(coreHandle.db, 100)).toBe(0)
    })

    test('works in bounded batches, oldest first', async () => {
      await emptyTable()
      const ids = [input(), input(), input()]
      for (const row of ids) {
        await submitDemoRequest(coreHandle.db, row)
      }
      await age(ids[0]?.id ?? '', '30 months')
      await age(ids[1]?.id ?? '', '20 months')
      await age(ids[2]?.id ?? '', '14 months')
      expect(await purgeDemoRequests(coreHandle.db, 2)).toBe(2)
      const { rows } = await owner.query(`select id from ${TABLE}`)
      expect(rows.map((row) => row.id)).toEqual([ids[2]?.id])
    })

    test('caps the limit at 1000 rows', async () => {
      await emptyTable()
      await owner.query(
        `insert into ${TABLE}
           (id, name, work_email, company_name, source_page, idempotency_key, submitted_at)
         select 'dreq_' || lpad(to_hex(g), 32, '0'), 'n', 'a@b.test', 'c', '/',
                'purge-key-' || lpad(g::text, 12, '0'), now() - interval '2 years'
           from generate_series(1, 1050) g`
      )
      expect(await purgeDemoRequests(coreHandle.db, 100000)).toBe(1000)
      expect(await purgeDemoRequests(coreHandle.db, 100000)).toBe(50)
    })

    test('rejects a bad limit before any query', async () => {
      await expect(purgeDemoRequests(coreHandle.db, 0)).rejects.toThrow('limit')
    })
  })

  describe('who may execute them', () => {
    const calls = [
      "select core.submit_demo_request('dreq_00000000000000000000000000000001', 'n', 'a@b.test', 'c', null, '/', 'xxxxxxxxxxxxxxxx')",
      'select * from core.claim_demo_notices(1, 0)',
      "select core.settle_demo_notice('dreq_00000000000000000000000000000001', 'sent')",
      'select core.purge_demo_requests(1)',
    ]

    test('closeline_auth and closeline_playbook cannot execute any of them', async () => {
      for (const pool of [auth, playbook]) {
        for (const call of calls) {
          const refused = await pool.query(call).then(
            () => null,
            (error: { message?: string }) => error.message
          )
          expect(refused).toContain('permission denied for schema core')
        }
      }
    })

    test('EXECUTE is held by closeline_core alone, never PUBLIC', async () => {
      const { rows } = await owner.query(
        `select p.proname,
                has_function_privilege('closeline_core', p.oid, 'EXECUTE') as core,
                has_function_privilege('closeline_auth', p.oid, 'EXECUTE') as auth,
                has_function_privilege('closeline_playbook', p.oid, 'EXECUTE') as playbook,
                exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                         where a.grantee = 0) as public_grant,
                p.prosecdef, p.proconfig
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'core'
            and p.proname in ('submit_demo_request', 'claim_demo_notices', 'settle_demo_notice',
                              'purge_demo_requests')
          order by p.proname`
      )
      expect(rows.map((row) => row.proname)).toEqual([
        'claim_demo_notices',
        'purge_demo_requests',
        'settle_demo_notice',
        'submit_demo_request',
      ])
      for (const row of rows) {
        expect(row).toMatchObject({
          core: true,
          auth: false,
          playbook: false,
          public_grant: false,
          prosecdef: true,
        })
        expect(row.proconfig).toContain('search_path=pg_catalog, pg_temp')
      }
    })

    test('the table itself stays closed to closeline_core and the catalog check passes', async () => {
      const refused = await core.query(`select * from ${TABLE}`).then(
        () => null,
        (error: { message?: string }) => error.message
      )
      expect(refused).toContain('permission denied for table demo_request')
      expect(await findTenantIsolationGaps(handle.db)).toEqual([])
    })
  })
})
