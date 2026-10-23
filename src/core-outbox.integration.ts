import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import {
  OUTBOX_CLAIM,
  OUTBOX_COMPLETE,
  OUTBOX_ENQUEUE,
  OUTBOX_FAIL,
} from './core-outbox-statements'
import { dropStaleTestObjects, integrationEnv, migrateUp, rejectionOf } from './integration-support'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`

describe('core.outbox, the transactional outbox and its drain', () => {
  let owner: Pool
  let core: Pool
  const orgs: string[] = []

  /** Run `fn` in one transaction on `pool`, scoped to `orgId` when given. */
  async function scopedOn<T>(
    pool: Pool,
    orgId: string | null,
    fn: (c: PoolClient) => Promise<T>
  ): Promise<T> {
    const c = await pool.connect()
    try {
      await c.query('begin')
      if (orgId) {
        await c.query('select set_config($1, $2, true)', [SETTING, orgId])
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

  const scoped = <T>(orgId: string | null, fn: (c: PoolClient) => Promise<T>) =>
    scopedOn(core, orgId, fn)
  const asOwner = <T>(orgId: string, fn: (c: PoolClient) => Promise<T>) =>
    scopedOn(owner, orgId, fn)

  async function newOrganization(): Promise<string> {
    const orgId = newId('org')
    orgs.push(orgId)
    await scoped(orgId, async (c) => {
      await c.query(
        'insert into core.organizations (organization_id, name, region) values ($1, $2, $3)',
        [orgId, 'Org', 'us']
      )
      await c.query(
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, 'owner', 'o@example.test')",
        [newId('mem'), orgId, newId('usr')]
      )
    })
    return orgId
  }

  /** Enqueue one event as the service does; returns its id, or null when the key was used. */
  async function enqueue(
    orgId: string,
    key: string,
    payload: unknown = { prospect_id: newId('prs') },
    topic = 'prospect.created'
  ): Promise<string | null> {
    const id = newId('obx')
    const result = await scoped(orgId, (c) =>
      c.query(OUTBOX_ENQUEUE, [id, orgId, topic, JSON.stringify(payload), key])
    )
    return result.rows.length === 1 ? id : null
  }

  const rowsOf = (orgId: string) =>
    asOwner(orgId, async (c) => (await c.query('select * from core.outbox order by id')).rows)

  const makeDue = (orgId: string) =>
    asOwner(orgId, (c) =>
      c.query("update core.outbox set available_at = now() - interval '1 second'")
    )

  /** Claim as the drain does, keeping only the rows of the Organizations this test made. */
  async function claim(only: string[] = orgs, limit = 100, leaseMs = 60_000) {
    const { rows } = await core.query(OUTBOX_CLAIM, [limit, leaseMs])
    return rows.filter((r) => only.includes(r.organization_id))
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 3 })
    core = new Pool({ connectionString: env.core, max: 6 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      await asOwner(orgId, (c) =>
        c.query('delete from core.organizations where organization_id = $1', [orgId])
      )
    }
    await dropStaleTestObjects(owner, env.owner)
    await Promise.all([owner.end(), core.end()])
  })

  test('a write adds a due, unpublished row, and a replay of its dedupe key adds none', async () => {
    const org = await newOrganization()
    const first = await enqueue(org, 'prospect.created:1')
    expect(first).not.toBeNull()
    expect(await enqueue(org, 'prospect.created:1')).toBeNull()
    expect(await enqueue(org, 'prospect.created:2')).not.toBeNull()
    const rows = await rowsOf(org)
    expect(rows).toHaveLength(2)
    const row = rows.find((r) => r.id === first)
    expect(row.attempts).toBe(0)
    expect(row.published_at).toBeNull()
    expect(row.last_error_code).toBeNull()
    expect(row.available_at.getTime()).toBeLessThanOrEqual(Date.now() + 1000)
  })

  test('the dedupe key is per Organization', async () => {
    const a = await newOrganization()
    const b = await newOrganization()
    expect(await enqueue(a, 'shared-key')).not.toBeNull()
    expect(await enqueue(b, 'shared-key')).not.toBeNull()
  })

  test('a second Organization reads nothing and cannot write into another', async () => {
    const a = await newOrganization()
    const b = await newOrganization()
    const id = await enqueue(a, 'k')
    expect(id).not.toBeNull()
    expect(
      await scoped(b, async (c) => (await c.query('select id from core.outbox')).rows)
    ).toEqual([])
    expect(
      await scoped(null, async (c) => (await c.query('select id from core.outbox')).rows)
    ).toEqual([])
    const crossWrite = await rejectionOf(
      scoped(b, (c) => c.query(OUTBOX_ENQUEUE, [newId('obx'), a, 'prospect.created', '{}', 'x']))
    )
    expect(crossWrite).toContain('row-level security')
    const crossUpdate = await scoped(b, (c) =>
      c.query("update core.outbox set topic = 'prospect.lost' where id = $1", [id])
    )
    expect(crossUpdate.rowCount).toBe(0)
    const crossDelete = await scoped(b, (c) =>
      c.query('delete from core.outbox where id = $1', [id])
    )
    expect(crossDelete.rowCount).toBe(0)
    expect(await rowsOf(a)).toHaveLength(1)
  })

  const refused: [string, Record<string, string>, string][] = [
    ['a payload that is not an object', { payload: '[1]' }, 'outbox_payload_shape'],
    [
      'a payload over 16384 bytes',
      { payload: JSON.stringify({ x: 'a'.repeat(16_400) }) },
      'outbox_payload_shape',
    ],
    ['an empty topic', { topic: '' }, 'outbox_topic_shape'],
    ['an uppercase topic', { topic: 'Prospect.Created' }, 'outbox_topic_shape'],
    ['an empty dedupe key', { key: '' }, 'outbox_dedupe_key_length'],
    ['a dedupe key over 200 characters', { key: 'k'.repeat(201) }, 'outbox_dedupe_key_length'],
    ['a malformed id', { id: 'obx_1' }, 'outbox_id_shape'],
  ]
  test.each(refused)('refuses %s', async (_name, change, constraint) => {
    const org = await newOrganization()
    const args = { id: newId('obx'), topic: 'prospect.created', payload: '{}', key: 'k', ...change }
    const message = await rejectionOf(
      scoped(org, (c) =>
        c.query(OUTBOX_ENQUEUE, [args.id, org, args.topic, args.payload, args.key])
      )
    )
    expect(message).toContain(constraint)
  })

  test('refuses an attempts count or an error code out of range', async () => {
    const org = await newOrganization()
    await enqueue(org, 'k')
    const attempts = await rejectionOf(
      asOwner(org, (c) => c.query('update core.outbox set attempts = 51'))
    )
    expect(attempts).toContain('outbox_attempts_range')
    const code = await rejectionOf(
      asOwner(org, (c) => c.query("update core.outbox set last_error_code = 'Queue says: no'"))
    )
    expect(code).toContain('outbox_last_error_code_shape')
  })

  test('the drain claims the rows of every Organization, counts the attempt and leases them', async () => {
    const a = await newOrganization()
    const b = await newOrganization()
    const idA = await enqueue(a, 'k', { n: 1 })
    const idB = await enqueue(b, 'k', { n: 2 }, 'prospect.updated')
    const claimed = await claim([a, b])
    expect(claimed.map((r) => r.id).sort()).toEqual([idA, idB].sort())
    expect(claimed.find((r) => r.id === idB)).toEqual({
      organization_id: b,
      id: idB,
      topic: 'prospect.updated',
      payload: { n: 2 },
      attempts: 1,
    })
    // Leased: not due again until the lease ends.
    expect(await claim([a, b])).toEqual([])
    const [row] = await rowsOf(a)
    expect(row.attempts).toBe(1)
    expect(row.available_at.getTime()).toBeGreaterThan(Date.now() + 30_000)
    // The lease ends: claimed again.
    await makeDue(a)
    const again = await claim([a])
    expect(again.map((r) => [r.id, r.attempts])).toEqual([[idA, 2]])
  })

  test('concurrent claims take disjoint rows and neither waits', async () => {
    const org = await newOrganization()
    const ids: string[] = []
    for (let i = 0; i < 6; i += 1) {
      ids.push((await enqueue(org, `k${i}`)) as string)
    }
    const one = await core.connect()
    const two = await core.connect()
    try {
      await one.query('begin')
      await two.query('begin')
      const first = (await one.query(OUTBOX_CLAIM, [100, 60_000])).rows
      // `one` still holds its row locks: `two` must skip them, not wait.
      const second = await Promise.race([
        two.query(OUTBOX_CLAIM, [100, 60_000]).then((r) => r.rows),
        new Promise<'blocked'>((resolve) => setTimeout(() => resolve('blocked'), 5000)),
      ])
      expect(second).not.toBe('blocked')
      const takenOne = first.filter((r) => ids.includes(r.id)).map((r) => r.id)
      const takenTwo = (second as typeof first).filter((r) => ids.includes(r.id)).map((r) => r.id)
      expect(takenOne.length + takenTwo.length).toBe(6)
      expect(takenOne.filter((id) => takenTwo.includes(id))).toEqual([])
    } finally {
      await one.query('rollback').catch(() => undefined)
      await two.query('rollback').catch(() => undefined)
      one.release()
      two.release()
    }
  })

  test('a claim returns at most the limit, and none for a limit below one', async () => {
    const org = await newOrganization()
    for (const key of ['k1', 'k2', 'k3']) {
      await enqueue(org, key)
    }
    expect((await core.query(OUTBOX_CLAIM, [0, 1000])).rows).toEqual([])
    expect((await core.query(OUTBOX_CLAIM, [null, null])).rows).toEqual([])
    const got = (await core.query(OUTBOX_CLAIM, [1, 1000])).rows
    expect(got).toHaveLength(1)
  })

  test('completing marks rows published and a repeat changes nothing', async () => {
    const a = await newOrganization()
    const b = await newOrganization()
    const idA = await enqueue(a, 'k')
    const idB = await enqueue(b, 'k')
    await claim([a, b])
    const done = await core.query(OUTBOX_COMPLETE, [
      [a, b],
      [idA, idB],
    ])
    expect(done.rows[0].published).toBe(2)
    expect(
      (
        await core.query(OUTBOX_COMPLETE, [
          [a, b],
          [idA, idB],
        ])
      ).rows[0].published
    ).toBe(0)
    const [row] = await rowsOf(a)
    expect(row.published_at).not.toBeNull()
    expect(row.last_error_code).toBeNull()
    // Published rows are never claimed again, even once due.
    await makeDue(a)
    await makeDue(b)
    expect(await claim([a, b])).toEqual([])
  })

  test('completing refuses arrays that are empty, over 100 or of different lengths', async () => {
    const org = await newOrganization()
    const id = newId('obx')
    const bad: (string[] | null)[][] = [
      [[], []],
      [[org], [id, id]],
      [null, [id]],
      [Array(101).fill(org), Array(101).fill(id)],
    ]
    for (const args of bad) {
      expect(await rejectionOf(core.query(OUTBOX_COMPLETE, args))).toBeTruthy()
    }
  })

  test('a failure records the code and the retry time, and the row is claimed again then', async () => {
    const org = await newOrganization()
    const id = await enqueue(org, 'k')
    await claim([org])
    const failed = await core.query(OUTBOX_FAIL, [org, id, 'queue.unavailable', 120_000])
    expect(failed.rows[0].recorded).toBe(true)
    const [row] = await rowsOf(org)
    expect(row.last_error_code).toBe('queue.unavailable')
    expect(row.published_at).toBeNull()
    expect(row.available_at.getTime()).toBeGreaterThan(Date.now() + 100_000)
    expect(await claim([org])).toEqual([])
    await makeDue(org)
    expect((await claim([org])).map((r) => r.attempts)).toEqual([2])
  })

  test('a failure of a published or unknown row records nothing; bad arguments raise', async () => {
    const org = await newOrganization()
    const id = await enqueue(org, 'k')
    await claim([org])
    await core.query(OUTBOX_COMPLETE, [[org], [id]])
    expect((await core.query(OUTBOX_FAIL, [org, id, 'late', 0])).rows[0].recorded).toBe(false)
    expect((await core.query(OUTBOX_FAIL, [org, newId('obx'), 'late', 0])).rows[0].recorded).toBe(
      false
    )
    const bad: (string | null | number)[][] = [
      ['org_1', id, 'late', 0],
      [org, 'obx_1', 'late', 0],
      [org, id, 'Queue said no', 0],
      [org, id, 'x'.repeat(65), 0],
      [org, id, null, 0],
    ]
    for (const args of bad) {
      expect(await rejectionOf(core.query(OUTBOX_FAIL, args))).toBeTruthy()
    }
  })

  test('a row claimed 50 times is left for an operator', async () => {
    const org = await newOrganization()
    await enqueue(org, 'k')
    await asOwner(org, (c) => c.query('update core.outbox set attempts = 50'))
    expect(await claim([org])).toEqual([])
    expect((await rowsOf(org))[0].published_at).toBeNull()
  })

  test('the drain scans unpublished rows through the partial index', async () => {
    const plan = await owner.query(
      "select indexdef from pg_indexes where schemaname = 'core' and indexname = 'outbox_drain_idx'"
    )
    expect(plan.rows[0].indexdef).toContain('(available_at, id)')
    expect(plan.rows[0].indexdef).toContain('published_at IS NULL')
    expect(plan.rows[0].indexdef).toContain('attempts < 50')
  })

  test('closeline_core cannot read the outbox without an Organization, and the drain role is narrow', async () => {
    const org = await newOrganization()
    await enqueue(org, 'k')
    expect((await core.query('select id from core.outbox')).rows).toEqual([])
    const privileges = await owner.query(
      `select has_table_privilege('closeline_core_outbox_drain', 'core.outbox', 'INSERT') as ins,
              has_table_privilege('closeline_core_outbox_drain', 'core.outbox', 'DELETE') as del,
              has_table_privilege('closeline_core_outbox_drain', 'core.outbox', 'SELECT') as whole_select,
              has_column_privilege('closeline_core_outbox_drain', 'core.outbox', 'dedupe_key', 'SELECT') as key_select,
              has_column_privilege('closeline_core_outbox_drain', 'core.outbox', 'payload', 'UPDATE') as payload_update,
              has_column_privilege('closeline_core_outbox_drain', 'core.outbox', 'published_at', 'UPDATE') as published_update`
    )
    expect(privileges.rows[0]).toEqual({
      ins: false,
      del: false,
      whole_select: false,
      key_select: false,
      payload_update: false,
      published_update: true,
    })
  })

  test('the functions are fixed-path definers owned by the drain role, executable by core alone', async () => {
    const functions = await owner.query(
      `select p.proname, p.proowner::regrole::text as owner, p.prosecdef, p.proconfig,
              exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                       where a.grantee = 0) as public_can,
              has_function_privilege('closeline_core', p.oid, 'EXECUTE') as core_can
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'core' and p.proname like 'outbox\\_%' order by p.proname`
    )
    expect(functions.rows.map((r) => r.proname)).toEqual([
      'outbox_claim',
      'outbox_complete',
      'outbox_fail',
    ])
    for (const row of functions.rows) {
      expect(row.owner).toBe('closeline_core_outbox_drain')
      expect(row.prosecdef).toBe(true)
      expect(row.proconfig).toEqual(['search_path=pg_catalog, core, pg_temp'])
      expect(row.public_can).toBe(false)
      expect(row.core_can).toBe(true)
    }
  })
})
