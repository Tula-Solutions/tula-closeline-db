import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { dropStaleTestObjects, integrationEnv, migrateUp, rejectionOf } from './integration-support'
import {
  DEAL_BY_DEAL_ID,
  DEAL_ERASE_BATCH,
  DEAL_GET,
  DEAL_IMPORT_APPLY,
  DEAL_IMPORT_CLAIM,
  DEAL_IMPORT_ERASE_BATCH,
  DEAL_IMPORT_FINISH,
  DEAL_IMPORT_GET,
  DEAL_IMPORT_GIVE_UP_SPENT,
  DEAL_IMPORT_HEARTBEAT,
  DEAL_IMPORT_INSERT,
  DEAL_IMPORT_LIST,
  DEAL_IMPORT_LIST_ERASED,
  DEAL_IMPORT_OBJECT_REMOVED,
  DEAL_IMPORT_PURGE_BATCH,
  DEAL_IMPORT_RETRY,
  DEAL_IMPORT_ROWS_LIST,
  DEAL_IMPORT_ROWS_LIST_BY_RESULT,
  DEAL_LIST,
  DEAL_LIST_BY_IMPORT_FLAG,
  DEAL_LIST_BY_OUTCOME,
  DEAL_SET_OUTCOME,
  DEAL_USAGE,
  IDEMPOTENCY_BEGIN,
  ORGANIZATION_REMOVAL_STATUS,
  ORGANIZATION_REMOVE_REST,
  ORGANIZATIONS_WITH_WORK,
  ORPHAN_SWEEP_AGE_MS,
  QUOTA_LOCK,
  REMOVE_ALL_IDEMPOTENCY_ROUTE,
  RIGHTS_CONFIRM,
  RIGHTS_GET,
} from './playbook-statements'
import { DEAL_IMPORT_MAX_ROWS, MAX_QUEUED_DEAL_IMPORTS } from './schema/playbook-sales-history'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
// Every test works in Organizations of its own (random ids), so no test sees another's rows.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const hex = (): string => crypto.randomUUID().replaceAll('-', '')
const newOrg = (): string => `org_${hex()}`
const newUser = (): string => `usr_${hex()}`
const newImport = (): string => `dimp_${hex()}`
const newDealId = (): string => `deal_${hex()}`
const hashOf = (text: string): Buffer => createHash('sha256').update(text).digest()
const NIL_TOKEN = '00000000-0000-0000-0000-000000000000'

interface CsvRow {
  row_number: number
  deal_id: string | null
  reason: string | null
  outcome: string
  closed_at: string | null
  amount: string | null
  currency: string | null
  name: string | null
}
const row = (n: number, dealId: string | null, over: Partial<CsvRow> = {}): CsvRow => ({
  row_number: n,
  deal_id: dealId,
  reason: null,
  outcome: 'open',
  closed_at: null,
  amount: null,
  currency: null,
  name: null,
  ...over,
})

describe('sales history, part one', () => {
  let owner: Pool
  let playbook: Pool
  let core: Pool

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 4 })
    await dropStaleTestObjects(owner, env.owner)
    playbook = new Pool({ connectionString: env.playbook, max: 12 })
    core = new Pool({ connectionString: env.core, max: 1 })
  })

  afterAll(async () => {
    await Promise.all([owner.end(), playbook.end(), core.end()])
  })

  async function scoped<T>(
    pool: Pool,
    org: string | null,
    fn: (c: PoolClient) => Promise<T>
  ): Promise<T> {
    const c = await pool.connect()
    try {
      await c.query('begin')
      if (org) {
        await c.query('select set_config($1, $2, true)', [SETTING, org])
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
  const inOrg = <T>(org: string, fn: (c: PoolClient) => Promise<T>) => scoped(playbook, org, fn)
  const asOwner = <T>(org: string, fn: (c: PoolClient) => Promise<T>) => scoped(owner, org, fn)
  const q = (org: string, text: string, params: unknown[]) =>
    inOrg(org, (c) => c.query(text, params))

  async function open(org: string) {
    const client = await playbook.connect()
    await client.query('begin')
    await client.query('select set_config($1, $2, true)', [SETTING, org])
    const pid = (await client.query('select pg_backend_pid() as pid')).rows[0]?.pid as number
    return { client, pid }
  }
  const finish = async (...txs: { client: PoolClient }[]) => {
    for (const tx of txs) {
      await tx.client.query('rollback').catch(() => undefined)
      tx.client.release()
    }
  }
  async function untilBlocked(pid: number): Promise<void> {
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
  const quick = async (...txs: { client: PoolClient }[]) => {
    for (const tx of txs) {
      await tx.client.query(`set local lock_timeout = '2s'`)
    }
  }

  const addImport = async (org: string): Promise<string> => {
    const id = newImport()
    await q(org, DEAL_IMPORT_INSERT, [org, id, newUser(), `obj-${hex()}`, 1000])
    return id
  }
  const claim = async (org: string) => (await q(org, DEAL_IMPORT_CLAIM, [org, 5, 60_000])).rows
  const apply = (org: string, id: string, token: string, rows: CsvRow[], max = 100) =>
    inOrg(org, async (c) => {
      await c.query(QUOTA_LOCK, [org])
      return c.query(DEAL_IMPORT_APPLY, [org, id, token, JSON.stringify(rows), max, 500])
    })
  const summary = (rows: { kind: string }[]) =>
    rows.find((r) => r.kind === 'summary') as unknown as {
      taken: number
      applied: number
      rejected: number
      through: number
    }
  const reportOf = async (org: string, id: string) =>
    (await q(org, DEAL_IMPORT_ROWS_LIST, [org, id, 0, 100])).rows.map((r) => [
      r.row_number,
      r.deal_id,
      r.result,
      r.reason,
    ])
  const named = async (org: string, kind: string) =>
    (await playbook.query(ORGANIZATIONS_WITH_WORK, [kind, org.slice(0, -1), 500])).rows.some(
      (r: { organization_id: string | null }) => r.organization_id === org
    )

  describe('Deals', () => {
    test('a CSV creates Deals, looked up by the exact customer id, and a second Organization sees none', async () => {
      const [org, other] = [newOrg(), newOrg()]
      const id = await addImport(org)
      const [job] = await claim(org)
      await apply(org, id, job.claim_token, [
        row(2, 'A-1', { outcome: 'won', amount: '100.50', currency: 'USD', name: 'Acme' }),
      ])
      const deal = (await q(org, DEAL_BY_DEAL_ID, [org, 'A-1'])).rows[0]
      expect(deal).toMatchObject({
        outcome: 'won',
        outcome_seq: 0,
        appeared_in_import: true,
        amount: '100.50',
        currency: 'USD',
        name: 'Acme',
      })
      expect((await q(org, DEAL_BY_DEAL_ID, [org, 'a-1'])).rowCount).toBe(0)
      expect((await q(other, DEAL_BY_DEAL_ID, [other, 'A-1'])).rowCount).toBe(0)
      expect((await q(other, DEAL_GET, [other, deal.id])).rowCount).toBe(0)
      // The other Organization cannot name this one's rows even with its id.
      expect(
        await rejectionOf(
          q(
            other,
            `insert into playbook.deals (id, organization_id, deal_id) values ($1, $2, 'x')`,
            [newDealId(), org]
          )
        )
      ).toContain('row-level security')
      expect(Number((await q(org, DEAL_USAGE, [org])).rows[0].deal_count)).toBe(1)
    })

    test('the role cannot delete a Deal or change its identity, and the Outcome sequence is exact', async () => {
      const org = newOrg()
      const id = await addImport(org)
      const [job] = await claim(org)
      await apply(org, id, job.claim_token, [row(2, 'S-1')])
      const deal = (await q(org, DEAL_BY_DEAL_ID, [org, 'S-1'])).rows[0]
      expect(await rejectionOf(q(org, 'delete from playbook.deals', []))).toContain(
        'permission denied'
      )
      expect(await rejectionOf(q(org, `update playbook.deals set deal_id = 'x'`, []))).toContain(
        'permission denied'
      )
      expect(
        await rejectionOf(
          asOwner(org, (c) => c.query('update playbook.deals set outcome_seq = outcome_seq + 5'))
        )
      ).toContain('playbook.deal_identity')
      expect(
        await rejectionOf(asOwner(org, (c) => c.query(`update playbook.deals set outcome = 'won'`)))
      ).toContain('playbook.deal_identity')
      expect(deal.outcome_seq).toBe(0)
    })

    test('setting an Outcome raises the sequence once per change and a repeat changes nothing', async () => {
      const org = newOrg()
      const id = await addImport(org)
      const [job] = await claim(org)
      await apply(org, id, job.claim_token, [row(2, 'O-1')])
      const deal = (await q(org, DEAL_BY_DEAL_ID, [org, 'O-1'])).rows[0]
      const set = async (outcome: string, closedAt: string | null, withClosed: boolean) =>
        (await q(org, DEAL_SET_OUTCOME, [org, deal.id, outcome, closedAt, withClosed])).rows[0]
      expect(await set('won', null, false)).toMatchObject({ outcome_seq: 1, changed: true })
      expect(await set('won', null, false)).toMatchObject({ outcome_seq: 1, changed: false })
      expect(await set('won', '2026-03-01T00:00:00Z', true)).toMatchObject({
        outcome_seq: 2,
        changed: true,
      })
      expect(await set('lost', null, false)).toMatchObject({ outcome_seq: 3, changed: true })
      expect(
        (await q(org, DEAL_SET_OUTCOME, [org, newDealId(), 'won', null, false])).rowCount
      ).toBe(0)
    })

    test('two Outcome changes at once queue on the row and the sequence counts both', async () => {
      const org = newOrg()
      const id = await addImport(org)
      const [job] = await claim(org)
      await apply(org, id, job.claim_token, [row(2, 'Q-1')])
      const deal = (await q(org, DEAL_BY_DEAL_ID, [org, 'Q-1'])).rows[0]
      const [first, second] = [await open(org), await open(org)]
      try {
        await first.client.query(DEAL_SET_OUTCOME, [org, deal.id, 'won', null, false])
        const waiting = second.client.query(DEAL_SET_OUTCOME, [org, deal.id, 'lost', null, false])
        await untilBlocked(second.pid)
        await first.client.query('commit')
        const result = await waiting
        expect(result.rows[0]).toMatchObject({ outcome: 'lost', outcome_seq: 2, changed: true })
        await second.client.query('commit')
      } finally {
        await finish(first, second)
      }
      expect((await q(org, DEAL_GET, [org, deal.id])).rows[0]).toMatchObject({
        outcome: 'lost',
        outcome_seq: 2,
      })
    })

    test('lists page by (created_at, id) newest first on their indexes, and filter by Outcome and import flag', async () => {
      const org = newOrg()
      const id = await addImport(org)
      const [job] = await claim(org)
      await apply(org, id, job.claim_token, [
        row(2, 'L-1', { outcome: 'won' }),
        row(3, 'L-2'),
        row(4, 'L-3', { outcome: 'lost' }),
      ])
      // A Deal no CSV named, as a Call upload will make one.
      await asOwner(org, async (c) => {
        await c.query(QUOTA_LOCK, [org])
        await c.query(
          `insert into playbook.deals (id, organization_id, deal_id) values ($1, $2, 'typo')`,
          [newDealId(), org]
        )
      })
      const first = (await q(org, DEAL_LIST, [org, 'infinity', '', 3])).rows
      expect(first.length).toBe(3)
      const last = first[2]
      const rest = (await q(org, DEAL_LIST, [org, last.cursor_at, last.id, 50])).rows
      expect(first.length + rest.length).toBe(4)
      expect(new Set([...first, ...rest].map((r) => r.id)).size).toBe(4)
      expect((await q(org, DEAL_LIST_BY_OUTCOME, [org, 'infinity', '', 50, 'won'])).rowCount).toBe(
        1
      )
      const never = (await q(org, DEAL_LIST_BY_IMPORT_FLAG, [org, 'infinity', '', 50, false])).rows
      expect(never.map((r) => r.deal_id)).toEqual(['typo'])
    })
    test('Deals created by one statement share a created_at, and paging by the cursor text skips and repeats none', async () => {
      const org = newOrg()
      const id = await addImport(org)
      const [job] = await claim(org)
      await apply(org, id, job.claim_token, [
        row(2, 'T-1'),
        row(3, 'T-2'),
        row(4, 'T-3'),
        row(5, 'T-4'),
      ])
      const stamps = await q(
        org,
        'select count(distinct created_at)::int as n from playbook.deals',
        []
      )
      expect(stamps.rows[0].n).toBe(1)
      const seen: string[] = []
      let cursor: [string, string] = ['infinity', '']
      for (let pages = 0; pages < 10; pages++) {
        const page = (await q(org, DEAL_LIST, [org, cursor[0], cursor[1], 2])).rows
        if (page.length === 0) {
          break
        }
        expect(typeof page[0].cursor_at).toBe('string')
        seen.push(...page.map((r) => r.id as string))
        const last = page[page.length - 1]
        cursor = [last.cursor_at, last.id]
      }
      expect(seen.length).toBe(4)
      expect(new Set(seen).size).toBe(4)
      // The other two lists and the import list carry the same cursor text.
      for (const [text, extra] of [
        [DEAL_LIST_BY_OUTCOME, 'open'],
        [DEAL_LIST_BY_IMPORT_FLAG, true],
      ] as const) {
        const page = (await q(org, text, [org, 'infinity', '', 2, extra])).rows
        expect(typeof page[0].cursor_at).toBe('string')
      }
      const imports = (await q(org, DEAL_IMPORT_LIST, [org, 'infinity', '', 10])).rows
      expect(typeof imports[0].cursor_at).toBe('string')
    })
  })

  describe('imports', () => {
    test('rows are applied by the rules: repeats, decided Deals, blanks, invalid rows and the Deal limit', async () => {
      const org = newOrg()
      const first = await addImport(org)
      const [job] = await claim(org)
      expect(job).toMatchObject({ id: first, last_row_number: null })
      const a = await apply(org, first, job.claim_token, [
        row(2, 'A-1', { outcome: 'won', closed_at: '2026-01-02T00:00:00.000Z', name: 'Acme' }),
        row(3, 'A-1', { outcome: 'lost' }),
        row(4, 'B-2'),
        row(5, null, { reason: 'wrong_column_count' }),
        row(6, 'C-3', { reason: 'invalid_outcome' }),
        row(7, 'C-3'),
      ])
      expect(summary(a.rows)).toMatchObject({ taken: 6, applied: 2, rejected: 4 })
      expect(a.rows.filter((r) => r.kind === 'outcome_changed')).toEqual([])
      expect(await reportOf(org, first)).toEqual([
        [2, 'A-1', 'applied', null],
        [3, 'A-1', 'rejected', 'duplicate_in_file'],
        [4, 'B-2', 'applied', null],
        [5, null, 'rejected', 'wrong_column_count'],
        [6, 'C-3', 'rejected', 'invalid_outcome'],
        [7, 'C-3', 'rejected', 'duplicate_in_file'],
      ])
      expect(
        (await q(org, DEAL_IMPORT_ROWS_LIST_BY_RESULT, [org, first, 0, 50, 'rejected'])).rowCount
      ).toBe(4)
      // A batch sent again changes nothing.
      expect(
        summary((await apply(org, first, job.claim_token, [row(2, 'A-1')])).rows)
      ).toMatchObject({
        taken: 0,
        applied: 0,
      })
      // The count must match before it completes.
      expect((await q(org, DEAL_IMPORT_FINISH, [org, first, job.claim_token, 7])).rowCount).toBe(0)
      expect(
        (await q(org, DEAL_IMPORT_FINISH, [org, first, job.claim_token, 6])).rows[0]
      ).toMatchObject({
        row_count: 6,
        applied_count: 2,
        rejected_count: 4,
      })
      // A later CSV: a decided Deal is rejected, an open one takes the row, a blank never clears.
      const second = await addImport(org)
      const [job2] = await claim(org)
      const b = await apply(org, second, job2.claim_token, [
        row(2, 'A-1', { outcome: 'won' }),
        row(3, 'B-2', { outcome: 'won', closed_at: '2026-02-01T00:00:00.000Z', name: 'Beta' }),
        row(4, 'NEW'),
      ])
      expect(summary(b.rows)).toMatchObject({ applied: 2, rejected: 1 })
      const beta = (await q(org, DEAL_BY_DEAL_ID, [org, 'B-2'])).rows[0]
      expect(b.rows.filter((r) => r.kind === 'outcome_changed')).toEqual([
        expect.objectContaining({ deal_record_id: beta.id, outcome_seq: 1 }),
      ])
      expect((await reportOf(org, second))[0]).toEqual([
        2,
        'A-1',
        'rejected',
        'outcome_already_decided',
      ])
      const acme = (await q(org, DEAL_BY_DEAL_ID, [org, 'A-1'])).rows[0]
      expect(acme.name).toBe('Acme')
      // The limit: 3 Deals exist (A-1, B-2, NEW); with a limit of 4 only the first new one fits.
      const third = await addImport(org)
      const [job3] = await claim(org)
      const c = await apply(
        org,
        third,
        job3.claim_token,
        [row(2, 'L1'), row(3, 'L2'), row(4, 'L3')],
        4
      )
      expect(summary(c.rows)).toMatchObject({ applied: 1, rejected: 2 })
      expect((await reportOf(org, third)).map((r) => r[3])).toEqual([
        null,
        'deal_limit_reached',
        'deal_limit_reached',
      ])
    })

    test('a stale claim token applies nothing and a second Organization has no import', async () => {
      const [org, other] = [newOrg(), newOrg()]
      const id = await addImport(org)
      const [job] = await claim(org)
      expect((await apply(org, id, NIL_TOKEN, [row(2, 'Z')])).rowCount).toBe(0)
      expect((await q(org, DEAL_BY_DEAL_ID, [org, 'Z'])).rowCount).toBe(0)
      expect((await q(other, DEAL_IMPORT_GET, [other, id])).rowCount).toBe(0)
      expect((await q(other, DEAL_IMPORT_LIST, [other, 'infinity', '', 10])).rowCount).toBe(0)
      expect((await q(other, DEAL_IMPORT_ROWS_LIST, [other, id, 0, 10])).rowCount).toBe(0)
      expect(
        await q(other, DEAL_IMPORT_HEARTBEAT, [other, id, job.claim_token, 1000])
      ).toMatchObject({
        rowCount: 0,
      })
      expect(
        (await q(org, DEAL_IMPORT_HEARTBEAT, [org, id, job.claim_token, 60_000])).rowCount
      ).toBe(1)
    })

    test('a lapsed claim is taken again and resumes after the last recorded row; retry and spent are handled', async () => {
      const org = newOrg()
      const id = await addImport(org)
      const [job] = await claim(org)
      await apply(org, id, job.claim_token, [row(2, 'R-1'), row(3, 'R-2')])
      await asOwner(org, (c) =>
        c.query(
          `update playbook.deal_imports set next_attempt_at = clock_timestamp() - interval '1 second'`
        )
      )
      const [again] = await claim(org)
      expect(again).toMatchObject({ id, last_row_number: 3, attempts: 2 })
      expect(again.claim_token).not.toBe(job.claim_token)
      // The old token no longer holds.
      expect((await apply(org, id, job.claim_token, [row(4, 'R-3')])).rowCount).toBe(0)
      expect((await q(org, DEAL_IMPORT_RETRY, [org, id, again.claim_token, 0])).rowCount).toBe(1)
      await asOwner(org, (c) =>
        c.query(
          `update playbook.deal_imports set attempts = 20, state = 'processing', claim_token = gen_random_uuid(), next_attempt_at = clock_timestamp() - interval '1 second'`
        )
      )
      expect(await claim(org)).toEqual([])
      const spent = await q(org, DEAL_IMPORT_GIVE_UP_SPENT, [org, 10])
      expect(spent.rows.map((r) => r.id)).toEqual([id])
      expect((await q(org, DEAL_IMPORT_GET, [org, id])).rows[0]).toMatchObject({
        state: 'failed',
        failure_reason: 'processing_failed',
      })
    })

    test('the hint import_apply is named when an import is due and not while it is leased, and cleared after', async () => {
      const org = newOrg()
      const id = await addImport(org)
      expect(await named(org, 'import_apply')).toBe(true)
      const [job] = await claim(org)
      expect(await named(org, 'import_apply')).toBe(false)
      expect((await q(org, DEAL_IMPORT_FINISH, [org, id, job.claim_token, 0])).rowCount).toBe(1)
      // The hint is only verified once due: make it so, as the clock would.
      await asOwner(org, (c) =>
        c.query(
          `update playbook.work_hints set due_at = clock_timestamp() - interval '1 second' where kind = 'import_apply'`
        )
      )
      expect(await named(org, 'import_apply')).toBe(false)
      const rows = (
        await asOwner(org, (c) =>
          c.query(
            `select 1 from playbook.work_hints where kind = 'import_apply' and organization_id = $1`,
            [org]
          )
        )
      ).rowCount
      expect(rows).toBe(0)
    })

    test('the CSV upload is an upload attempt for the orphan sweep: its idempotency key names the Organization', async () => {
      const org = newOrg()
      await inOrg(org, async (c) => {
        await c.query(IDEMPOTENCY_BEGIN, [
          org,
          newUser(),
          'deal_imports.upload',
          `k-${hex()}`,
          hashOf('x'),
        ])
        await c.query(DEAL_IMPORT_INSERT, [org, newImport(), newUser(), `obj-${hex()}`, 10])
      })
      const hint = (
        await asOwner(org, (c) =>
          c.query(
            `select due_at from playbook.work_hints where kind = 'orphan_sweep' and organization_id = $1`,
            [org]
          )
        )
      ).rows[0]
      expect(new Date(hint.due_at).getTime() - Date.now()).toBeGreaterThan(
        ORPHAN_SWEEP_AGE_MS - 60_000
      )
    })

    test('two import uploads open at once do not wait for each other once a hint exists, and queue only on the first hint', async () => {
      const key = (tx: { client: PoolClient }, org: string) =>
        tx.client.query(IDEMPOTENCY_BEGIN, [
          org,
          newUser(),
          'deal_imports.upload',
          `k-${hex()}`,
          hashOf('x'),
        ])
      const insert = (tx: { client: PoolClient }, org: string) =>
        tx.client.query(DEAL_IMPORT_INSERT, [org, newImport(), newUser(), `obj-${hex()}`, 10])
      // A hint already there: neither key insert waits for the other (the 2 second lock timeout turns a
      // hang into an error).
      const early = newOrg()
      await inOrg(early, async (c) => {
        await c.query(IDEMPOTENCY_BEGIN, [
          early,
          newUser(),
          'deal_imports.upload',
          `k-${hex()}`,
          hashOf('x'),
        ])
        await c.query(DEAL_IMPORT_INSERT, [early, newImport(), newUser(), 'obj-0', 10])
      })
      const [one, two] = [await open(early), await open(early)]
      try {
        await quick(one, two)
        await key(one, early)
        await key(two, early)
        await insert(one, early)
        // The inserts of one Organization queue on the cap check (0019): the second waits for the
        // first to commit, and the key inserts above did not wait at all.
        const second = insert(two, early)
        await untilBlocked(two.pid)
        await one.client.query('commit')
        await second
        await two.client.query('commit')
      } finally {
        await finish(one, two)
      }
      expect((await q(early, DEAL_IMPORT_LIST, [early, 'infinity', '', 10])).rowCount).toBe(3)
      // No hint yet: the second upload waits for the first to write the hint, then proceeds.
      const fresh = newOrg()
      const [three, four] = [await open(fresh), await open(fresh)]
      try {
        await key(three, fresh)
        await insert(three, fresh)
        const waiting = key(four, fresh)
        await untilBlocked(four.pid)
        await three.client.query('commit')
        await waiting
        await insert(four, fresh)
        await four.client.query('commit')
      } finally {
        await finish(three, four)
      }
      expect((await q(fresh, DEAL_IMPORT_LIST, [fresh, 'infinity', '', 10])).rowCount).toBe(2)
    })

    test('two imports of one Organization apply one at a time: the second waits for the upload lock and sees the first Deal', async () => {
      const org = newOrg()
      const [a, b] = [await addImport(org), await addImport(org)]
      await claim(org)
      const claimed = (
        await q(
          org,
          `select id, claim_token from playbook.deal_imports where state = 'processing'`,
          []
        )
      ).rows
      expect(claimed.length).toBe(2)
      const tokenOf = (id: string) => claimed.find((r) => r.id === id).claim_token as string
      const [first, second] = [await open(org), await open(org)]
      try {
        await first.client.query(QUOTA_LOCK, [org])
        await first.client.query(DEAL_IMPORT_APPLY, [
          org,
          a,
          tokenOf(a),
          JSON.stringify([row(2, 'SAME')]),
          100,
          500,
        ])
        const waiting = second.client.query(QUOTA_LOCK, [org])
        await untilBlocked(second.pid)
        await first.client.query('commit')
        await waiting
        const result = await second.client.query(DEAL_IMPORT_APPLY, [
          org,
          b,
          tokenOf(b),
          JSON.stringify([row(2, 'SAME', { outcome: 'won' })]),
          100,
          500,
        ])
        // The second import found the Deal the first created and updated it, creating no second one.
        expect(summary(result.rows)).toMatchObject({ applied: 1 })
        expect(result.rows.filter((r) => r.kind === 'outcome_changed').length).toBe(1)
        await second.client.query('commit')
      } finally {
        await finish(first, second)
      }
      expect(Number((await q(org, DEAL_USAGE, [org])).rows[0].deal_count)).toBe(1)
    })

    test('two claims at once take different imports', async () => {
      const org = newOrg()
      await addImport(org)
      await addImport(org)
      const [x, y] = await Promise.all([claim(org), claim(org)])
      expect(x.length + y.length).toBe(2)
      expect(new Set([...x, ...y].map((r) => r.id)).size).toBe(2)
    })
  })

  describe('import order and contention', () => {
    const tokensOf = async (org: string) =>
      (
        await q(
          org,
          `select id, claim_token from playbook.deal_imports where state = 'processing'`,
          []
        )
      ).rows as { id: string; claim_token: string }[]

    test('a row that meets a concurrent Outcome change is decided in the same statement, a later repeat is a duplicate, and the import completes', async () => {
      const org = newOrg()
      const seed = await addImport(org)
      const [seedJob] = await claim(org)
      await apply(org, seed, seedJob.claim_token, [row(2, 'X')])
      const x = (await q(org, DEAL_BY_DEAL_ID, [org, 'X'])).rows[0]
      const id = await addImport(org)
      const [job] = await claim(org)
      const [portal, importer] = [await open(org), await open(org)]
      try {
        await portal.client.query(DEAL_SET_OUTCOME, [org, x.id, 'won', null, false])
        await importer.client.query(QUOTA_LOCK, [org])
        const waiting = importer.client.query(DEAL_IMPORT_APPLY, [
          org,
          id,
          job.claim_token,
          JSON.stringify([row(2, 'F'), row(3, 'X', { outcome: 'lost' })]),
          100,
          500,
        ])
        await untilBlocked(importer.pid)
        await portal.client.query('commit')
        const result = await waiting
        expect(summary(result.rows)).toMatchObject({
          taken: 2,
          applied: 1,
          rejected: 1,
          through: 3,
        })
        // The portal's change is not the import's: no second Outcome-changed message.
        expect(result.rows.filter((r) => r.kind === 'outcome_changed')).toEqual([])
        await importer.client.query('commit')
      } finally {
        await finish(portal, importer)
      }
      expect(await reportOf(org, id)).toEqual([
        [2, 'F', 'applied', null],
        [3, 'X', 'rejected', 'outcome_already_decided'],
      ])
      expect((await q(org, DEAL_GET, [org, x.id])).rows[0]).toMatchObject({
        outcome: 'won',
        outcome_seq: 1,
      })
      // A repeat sent past a gap is not taken: it cannot be judged before the rows before it.
      expect(summary((await apply(org, id, job.claim_token, [row(5, 'X')])).rows)).toMatchObject({
        taken: 0,
        through: 3,
      })
      const next = summary(
        (await apply(org, id, job.claim_token, [row(4, 'G'), row(5, 'X'), row(7, 'X')])).rows
      )
      expect(next).toMatchObject({ taken: 2, through: 5 })
      expect((await reportOf(org, id)).slice(2)).toEqual([
        [4, 'G', 'applied', null],
        [5, 'X', 'rejected', 'duplicate_in_file'],
      ])
      // Finish counts the contiguous report: a CSV of six data rows is not done at five.
      expect((await q(org, DEAL_IMPORT_FINISH, [org, id, job.claim_token, 6])).rowCount).toBe(0)
      expect(
        (await q(org, DEAL_IMPORT_FINISH, [org, id, job.claim_token, 4])).rows[0]
      ).toMatchObject({ row_count: 4, applied_count: 2, rejected_count: 2 })
    })

    test('a first row sent late is judged first: rows after a gap are not taken, and the report stays contiguous', async () => {
      const org = newOrg()
      const id = await addImport(org)
      const [job] = await claim(org)
      expect(
        summary((await apply(org, id, job.claim_token, [row(3, 'R'), row(4, 'S')])).rows)
      ).toMatchObject({ taken: 0, through: 1 })
      expect(await reportOf(org, id)).toEqual([])
      expect(
        summary((await apply(org, id, job.claim_token, [row(2, 'R'), row(3, 'R')])).rows)
      ).toMatchObject({ taken: 2, applied: 1, rejected: 1, through: 3 })
      expect(await reportOf(org, id)).toEqual([
        [2, 'R', 'applied', null],
        [3, 'R', 'rejected', 'duplicate_in_file'],
      ])
      expect((await q(org, DEAL_IMPORT_FINISH, [org, id, job.claim_token, 2])).rowCount).toBe(1)
    })

    test('the apply refuses unless this transaction holds the upload lock; a lock held by another transaction does not count', async () => {
      const org = newOrg()
      const id = await addImport(org)
      const [job] = await claim(org)
      const withoutLock = () =>
        inOrg(org, (c) =>
          c.query(DEAL_IMPORT_APPLY, [
            org,
            id,
            job.claim_token,
            JSON.stringify([row(2, 'L')]),
            100,
            500,
          ])
        ).then(
          () => '',
          (error: Error) => error.message
        )
      expect(await withoutLock()).toContain('playbook.upload_lock')
      const holder = await open(org)
      try {
        await holder.client.query(QUOTA_LOCK, [org])
        expect(await withoutLock()).toContain('playbook.upload_lock')
      } finally {
        await finish(holder)
      }
      expect(await reportOf(org, id)).toEqual([])
      expect((await q(org, DEAL_BY_DEAL_ID, [org, 'L'])).rowCount).toBe(0)
      // With the lock it applies.
      expect(summary((await apply(org, id, job.claim_token, [row(2, 'L')])).rows)).toMatchObject({
        applied: 1,
      })
    })

    test('two imports at once, repeating a deal id across them, keep the Deal count exact, and erasure brings it to zero', async () => {
      const org = newOrg()
      const [a, b] = [await addImport(org), await addImport(org)]
      await claim(org)
      const tokens = await tokensOf(org)
      const tokenOf = (id: string) => tokens.find((r) => r.id === id)?.claim_token as string
      const results = await Promise.all([
        apply(org, a, tokenOf(a), [row(2, 'D1'), row(3, 'D2')]),
        apply(org, b, tokenOf(b), [row(2, 'D2'), row(3, 'D3')]),
      ])
      expect(results.map((r) => summary(r.rows).applied)).toEqual([2, 2])
      // The repeat of D2 across two imports is no duplicate in either file: each file's first D2 wins.
      expect((await reportOf(org, a)).every((r) => r[2] === 'applied')).toBe(true)
      expect((await reportOf(org, b)).every((r) => r[2] === 'applied')).toBe(true)
      expect((await q(org, 'select count(*)::int as n from playbook.deals', [])).rows[0].n).toBe(3)
      expect(Number((await q(org, DEAL_USAGE, [org])).rows[0].deal_count)).toBe(3)
      for (let steps = 0; steps < 10; steps++) {
        if ((await q(org, DEAL_ERASE_BATCH, [org, 2])).rows[0].deleted === 0) {
          break
        }
      }
      expect(Number((await q(org, DEAL_USAGE, [org])).rows[0].deal_count)).toBe(0)
    })
  })

  describe('what the statements refuse', () => {
    const insertDeal = (c: PoolClient, org: string) =>
      c.query(`insert into playbook.deals (id, organization_id, deal_id) values ($1, $2, $3)`, [
        newDealId(),
        org,
        `T-${hex()}`,
      ])

    test('a Deal insert without the upload lock fails with playbook.upload_lock, for the role and the owner; with it, it succeeds', async () => {
      const org = newOrg()
      expect(await rejectionOf(inOrg(org, (c) => insertDeal(c, org)))).toContain(
        'playbook.upload_lock'
      )
      expect(await rejectionOf(asOwner(org, (c) => insertDeal(c, org)))).toContain(
        'playbook.upload_lock'
      )
      await inOrg(org, async (c) => {
        await c.query(QUOTA_LOCK, [org])
        await insertDeal(c, org)
      })
      expect(Number((await q(org, DEAL_USAGE, [org])).rows[0].deal_count)).toBe(1)
      // The check is one statement-level trigger, not one per row.
      const trigger = await owner.query(
        `select (tgtype & 1) as per_row from pg_trigger where tgname = 'deals_require_lock'`
      )
      expect(trigger.rows).toEqual([{ per_row: 0 }])
    })

    test('an apply of 500 new Deals passes the check once and creates them all', async () => {
      const org = newOrg()
      const id = await addImport(org)
      const [job] = await claim(org)
      const rows = Array.from({ length: 500 }, (_, i) => row(i + 2, `BIG-${i}`))
      expect(summary((await apply(org, id, job.claim_token, rows, 1000)).rows)).toMatchObject({
        taken: 500,
        applied: 500,
        through: 501,
      })
      expect(Number((await q(org, DEAL_USAGE, [org])).rows[0].deal_count)).toBe(500)
    })

    test('a row number above the limit or repeated in a batch is refused, taking and recording nothing', async () => {
      const org = newOrg()
      const id = await addImport(org)
      const [job] = await claim(org)
      const refusal = async (rows: CsvRow[]) => {
        const result = (await apply(org, id, job.claim_token, rows)).rows[0]
        return [result.kind, result.taken, result.refusal]
      }
      expect(await refusal([row(DEAL_IMPORT_MAX_ROWS + 2, 'Z')])).toEqual([
        'summary',
        0,
        'row_number_range',
      ])
      expect(await refusal([row(2, 'Z'), row(2, 'Y')])).toEqual([
        'summary',
        0,
        'row_number_repeated',
      ])
      expect(await reportOf(org, id)).toEqual([])
      expect((await q(org, DEAL_BY_DEAL_ID, [org, 'Z'])).rowCount).toBe(0)
      expect(await refusal([row(2, 'Z'), row(3, 'Y')])).toEqual(['summary', 2, null])
    })

    test('finishing with a row count too high or too low returns no row, and the exact count completes', async () => {
      const org = newOrg()
      const id = await addImport(org)
      const [job] = await claim(org)
      await apply(org, id, job.claim_token, [row(2, 'Z'), row(3, 'Y')])
      for (const count of [3, 1, 0]) {
        expect((await q(org, DEAL_IMPORT_FINISH, [org, id, job.claim_token, count])).rowCount).toBe(
          0
        )
      }
      expect((await q(org, DEAL_IMPORT_FINISH, [org, id, job.claim_token, 2])).rowCount).toBe(1)
    })

    test('a malformed cursor text raises SQLSTATE 22007', async () => {
      const org = newOrg()
      const error = await q(org, DEAL_LIST, [org, 'x', '', 10]).then(
        () => undefined,
        (e: { code?: string }) => e
      )
      expect(error?.code).toBe('22007')
    })

    test('an Organization whose lock key hash is negative: the apply succeeds with the lock and raises without it', async () => {
      let org = newOrg()
      for (let tries = 0; tries < 200; tries++) {
        const negative = await owner.query('select hashtextextended($1, 0) < 0 as negative', [org])
        if (negative.rows[0].negative) {
          break
        }
        org = newOrg()
      }
      const id = await addImport(org)
      const [job] = await claim(org)
      const bare = inOrg(org, (c) =>
        c.query(DEAL_IMPORT_APPLY, [
          org,
          id,
          job.claim_token,
          JSON.stringify([row(2, 'N')]),
          100,
          500,
        ])
      )
      expect(await rejectionOf(bare)).toContain('playbook.upload_lock')
      expect(summary((await apply(org, id, job.claim_token, [row(2, 'N')])).rows)).toMatchObject({
        applied: 1,
      })
    })
  })

  describe('the rights confirmation', () => {
    test('a newer version replaces, the same keeps the first, an older is ignored, and a second Organization sees none', async () => {
      const [org, other] = [newOrg(), newOrg()]
      const [u1, u2] = [newUser(), newUser()]
      expect((await q(org, RIGHTS_GET, [org])).rowCount).toBe(0)
      expect((await q(org, RIGHTS_CONFIRM, [org, u1, 1])).rows[0]).toMatchObject({
        recorded: true,
        confirmed_by: u1,
      })
      expect((await q(org, RIGHTS_CONFIRM, [org, u2, 1])).rows[0]).toMatchObject({
        recorded: false,
        confirmed_by: u1,
      })
      expect((await q(org, RIGHTS_CONFIRM, [org, u2, 2])).rows[0]).toMatchObject({
        recorded: true,
        confirmed_by: u2,
        wording_version: 2,
      })
      expect((await q(org, RIGHTS_CONFIRM, [org, u1, 1])).rows[0]).toMatchObject({
        recorded: false,
        wording_version: 2,
      })
      expect((await q(other, RIGHTS_GET, [other])).rowCount).toBe(0)
      expect(await rejectionOf(q(org, 'delete from playbook.rights_confirmations', []))).toContain(
        'permission denied'
      )
    })

    test('two confirmations at once end with the higher version and one row', async () => {
      const org = newOrg()
      await Promise.all([
        q(org, RIGHTS_CONFIRM, [org, newUser(), 1]),
        q(org, RIGHTS_CONFIRM, [org, newUser(), 2]),
      ])
      const rows = (await q(org, RIGHTS_GET, [org])).rows
      expect(rows.length).toBe(1)
      expect(rows[0].wording_version).toBe(2)
    })
  })

  describe('erasure', () => {
    test('imports, report rows, Deals and the rights row go in bounded batches, then the rest, and the status says removed', async () => {
      const org = newOrg()
      const ids = [await addImport(org), await addImport(org)]
      const [job] = await claim(org)
      await apply(org, job.id, job.claim_token, [row(2, 'E-1'), row(3, 'E-2'), row(4, 'E-3')])
      await q(org, RIGHTS_CONFIRM, [org, newUser(), 1])
      expect(
        (await q(org, ORGANIZATION_REMOVE_REST, [org, REMOVE_ALL_IDEMPOTENCY_ROUTE])).rows[0]
      ).toEqual({ removed: false })
      const status = (await q(org, ORGANIZATION_REMOVAL_STATUS, [org])).rows[0]
      expect(status).toMatchObject({
        no_deals: false,
        no_imports: false,
        no_rights: false,
        removed: false,
      })
      // Erase the imports: one at a time, the active ones are ended and report the CSV pending.
      const batchOne = (await q(org, DEAL_IMPORT_ERASE_BATCH, [org, 1])).rows
      const batchTwo = (await q(org, DEAL_IMPORT_ERASE_BATCH, [org, 500])).rows
      expect(batchOne.length + batchTwo.length).toBe(2)
      expect((await q(org, DEAL_IMPORT_ERASE_BATCH, [org, 500])).rowCount).toBe(0)
      expect((await q(org, DEAL_IMPORT_GET, [org, ids[0]])).rowCount).toBe(0)
      expect(await claim(org)).toEqual([])
      // The erased job is fenced.
      expect((await apply(org, job.id, job.claim_token, [row(5, 'LATE')])).rowCount).toBe(0)
      // Purge needs the CSV recorded removed first.
      expect((await q(org, DEAL_IMPORT_PURGE_BATCH, [org, job.id, 10])).rowCount).toBe(0)
      for (const id of ids) {
        await q(org, DEAL_IMPORT_OBJECT_REMOVED, [org, id])
        let steps = 0
        let done = false
        while (!done && steps++ < 20) {
          const r = (await q(org, DEAL_IMPORT_PURGE_BATCH, [org, id, 2])).rows[0]
          expect(r.deleted_rows).toBeLessThanOrEqual(2)
          done = r.import_deleted
        }
        expect(done).toBe(true)
      }
      expect(
        (await q(org, ORGANIZATION_REMOVE_REST, [org, REMOVE_ALL_IDEMPOTENCY_ROUTE])).rows[0]
      ).toEqual({ removed: false })
      let total = 0
      for (;;) {
        const n = (await q(org, DEAL_ERASE_BATCH, [org, 2])).rows[0].deleted as number
        expect(n).toBeLessThanOrEqual(2)
        total += n
        if (n === 0) {
          break
        }
      }
      expect(total).toBe(3)
      expect(
        (await q(org, ORGANIZATION_REMOVE_REST, [org, REMOVE_ALL_IDEMPOTENCY_ROUTE])).rows[0]
      ).toEqual({ removed: true })
      expect((await q(org, ORGANIZATION_REMOVAL_STATUS, [org])).rows[0]).toMatchObject({
        removed: true,
      })
    })

    // Fails without DEAL_IMPORT_LIST_ERASED: after the erase commits nothing can name the imports.
    test('an erasure interrupted after the erase is finished from the list of erased imports', async () => {
      const org = newOrg()
      const ids = [await addImport(org), await addImport(org), await addImport(org)]
      const [job] = await claim(org)
      await apply(org, job.id, job.claim_token, [row(2, 'L-1'), row(3, 'L-2')])
      expect((await q(org, DEAL_IMPORT_LIST_ERASED, [org, '', 10])).rowCount).toBe(0)
      const erased = (await q(org, DEAL_IMPORT_ERASE_BATCH, [org, 500])).rows
      expect(erased.length).toBe(3)
      // The service "crashes" here: it keeps nothing. The list names every unfinished import.
      const listed = (await q(org, DEAL_IMPORT_LIST_ERASED, [org, '', 10])).rows
      expect(listed.map((r) => r.id)).toEqual([...ids].sort())
      expect(
        listed.every((r) => typeof r.object_key === 'string' && r.object_pending === true)
      ).toBe(true)
      // Finish part of it: remove one CSV and purge it.
      const [first, ...rest] = listed
      await q(org, DEAL_IMPORT_OBJECT_REMOVED, [org, first.id])
      expect(
        (await q(org, DEAL_IMPORT_LIST_ERASED, [org, '', 10])).rows.find((r) => r.id === first.id)
          ?.object_pending
      ).toBe(false)
      for (let steps = 0; steps < 20; steps++) {
        if ((await q(org, DEAL_IMPORT_PURGE_BATCH, [org, first.id, 2])).rows[0].import_deleted) {
          break
        }
      }
      const unfinished = (await q(org, DEAL_IMPORT_LIST_ERASED, [org, '', 10])).rows
      expect(unfinished.map((r) => r.id)).toEqual(rest.map((r) => r.id))
      expect((await q(org, ORGANIZATION_REMOVAL_STATUS, [org])).rows[0].no_imports).toBe(false)
      // A second Organization sees none of them.
      const other = newOrg()
      expect((await q(other, DEAL_IMPORT_LIST_ERASED, [other, '', 10])).rowCount).toBe(0)
      // Page by the id cursor, one at a time.
      const pageOne = (await q(org, DEAL_IMPORT_LIST_ERASED, [org, '', 1])).rows
      const pageTwo = (await q(org, DEAL_IMPORT_LIST_ERASED, [org, pageOne[0].id, 1])).rows
      expect([pageOne[0].id, pageTwo[0].id]).toEqual(rest.map((r) => r.id))
      expect((await q(org, DEAL_IMPORT_LIST_ERASED, [org, pageTwo[0].id, 1])).rowCount).toBe(0)
      // Finish the rest from the list alone.
      for (const r of unfinished) {
        await q(org, DEAL_IMPORT_OBJECT_REMOVED, [org, r.id])
        for (let steps = 0; steps < 20; steps++) {
          if ((await q(org, DEAL_IMPORT_PURGE_BATCH, [org, r.id, 2])).rows[0].import_deleted) {
            break
          }
        }
      }
      expect((await q(org, DEAL_IMPORT_LIST_ERASED, [org, '', 10])).rowCount).toBe(0)
      expect((await q(org, ORGANIZATION_REMOVAL_STATUS, [org])).rows[0].no_imports).toBe(true)
    })

    test('a live import cannot be deleted by the role, and report rows only while their import is erased', async () => {
      const org = newOrg()
      const id = await addImport(org)
      const [job] = await claim(org)
      await apply(org, id, job.claim_token, [row(2, 'D-1')])
      await q(org, 'delete from playbook.deal_imports where id = $1', [id])
      await q(org, 'delete from playbook.deal_import_rows where import_id = $1', [id])
      expect((await q(org, DEAL_IMPORT_GET, [org, id])).rowCount).toBe(1)
      expect((await q(org, DEAL_IMPORT_ROWS_LIST, [org, id, 0, 10])).rowCount).toBe(1)
    })

    test('erase_deals refuses another Organization’s scope and waits for an import batch instead of deadlocking with it', async () => {
      const [org, other] = [newOrg(), newOrg()]
      const id = await addImport(org)
      const [job] = await claim(org)
      await apply(org, id, job.claim_token, [row(2, 'W-1'), row(3, 'W-2')])
      expect(await rejectionOf(q(other, DEAL_ERASE_BATCH, [org, 10]))).toContain('not scoped')
      const [applying, erasing] = [await open(org), await open(org)]
      try {
        await applying.client.query(QUOTA_LOCK, [org])
        await applying.client.query(DEAL_IMPORT_APPLY, [
          org,
          id,
          job.claim_token,
          JSON.stringify([row(4, 'W-3'), row(5, 'W-1', { outcome: 'won' })]),
          100,
          500,
        ])
        const waiting = erasing.client.query(DEAL_ERASE_BATCH, [org, 100])
        await untilBlocked(erasing.pid)
        await applying.client.query('commit')
        expect((await waiting).rows[0].deleted).toBeGreaterThanOrEqual(3)
        await erasing.client.query('commit')
      } finally {
        await finish(applying, erasing)
      }
    })

    test('an import erase batch racing an apply waits for its row and the apply then finds the import erased', async () => {
      const org = newOrg()
      const id = await addImport(org)
      const [job] = await claim(org)
      const [applying, erasing] = [await open(org), await open(org)]
      try {
        await applying.client.query(QUOTA_LOCK, [org])
        await applying.client.query(DEAL_IMPORT_APPLY, [
          org,
          id,
          job.claim_token,
          JSON.stringify([row(2, 'X-1')]),
          100,
          500,
        ])
        const waiting = erasing.client.query(DEAL_IMPORT_ERASE_BATCH, [org, 10])
        await untilBlocked(erasing.pid)
        await applying.client.query('commit')
        expect((await waiting).rows[0]).toMatchObject({ id, object_pending: true })
        await erasing.client.query('commit')
      } finally {
        await finish(applying, erasing)
      }
      expect((await apply(org, id, job.claim_token, [row(3, 'X-2')])).rowCount).toBe(0)
    })

    test('erasure keeps the v0.13.0 evidence: an import upload attempt still makes the Organization reported for the orphan sweep', async () => {
      const org = newOrg()
      // An attempt 30 hours old; the owner writes it, since a key's identity is final once made.
      await asOwner(org, (c) =>
        c.query(
          `insert into playbook.idempotency_keys (organization_id, user_id, route, key, request_hash, created_at)
           values ($1, $2, 'deal_imports.upload', $3, $4, clock_timestamp() - interval '30 hours')`,
          [org, newUser(), `k-${hex()}`, hashOf('x')]
        )
      )
      expect(
        (await q(org, ORGANIZATION_REMOVE_REST, [org, REMOVE_ALL_IDEMPOTENCY_ROUTE])).rows[0]
      ).toEqual({ removed: true })
      const erased = (
        await asOwner(org, (c) => c.query('select erased_attempt_at from playbook.orphan_sweeps'))
      ).rows[0]
      expect(erased.erased_attempt_at).toBeInstanceOf(Date)
    })
  })

  describe('the plans use the list indexes under a generic plan', () => {
    interface PlanNode {
      'Node Type': string
      'Relation Name'?: string
      'Index Name'?: string
      'Scan Direction'?: string
      Plans?: PlanNode[]
    }
    const walk = (node: PlanNode): PlanNode[] => [node, ...(node.Plans ?? []).flatMap(walk)]
    async function planOf(org: string, text: string, types: string, args: string) {
      return inOrg(org, async (c) => {
        await c.query('set local plan_cache_mode = force_generic_plan')
        await c.query('set local enable_seqscan = off')
        await c.query(`prepare plan_probe(${types}) as ${text}`)
        try {
          const r = await c.query(`explain (format json, costs off) execute plan_probe(${args})`)
          return r.rows[0]['QUERY PLAN'][0].Plan as PlanNode
        } finally {
          await c.query('deallocate plan_probe')
        }
      })
    }
    const expectScan = (root: PlanNode, relation: string, index: string, direction?: string) => {
      const nodes = walk(root)
      const scans = nodes.filter((n) => n['Relation Name'] === relation)
      const dump = JSON.stringify(root, null, 1)
      expect([scans.length, dump]).toEqual([1, dump])
      expect([scans[0]?.['Index Name'], dump]).toEqual([index, dump])
      if (direction) {
        expect([scans[0]?.['Scan Direction'], dump]).toEqual([direction, dump])
      }
      expect([nodes.some((n) => n['Node Type'] === 'Sort'), dump]).toEqual([false, dump])
    }

    test.each([
      [
        'DEAL_LIST',
        DEAL_LIST,
        'deals',
        'deals_list_idx',
        'text, timestamptz, text, int',
        `'infinity', '', 50`,
      ],
      [
        'DEAL_LIST_BY_OUTCOME',
        DEAL_LIST_BY_OUTCOME,
        'deals',
        'deals_outcome_list_idx',
        'text, timestamptz, text, int, text',
        `'infinity', '', 50, 'won'`,
      ],
      [
        'DEAL_LIST_BY_IMPORT_FLAG',
        DEAL_LIST_BY_IMPORT_FLAG,
        'deals',
        'deals_import_list_idx',
        'text, timestamptz, text, int, boolean',
        `'infinity', '', 50, false`,
      ],
      [
        'DEAL_IMPORT_LIST',
        DEAL_IMPORT_LIST,
        'deal_imports',
        'deal_imports_list_idx',
        'text, timestamptz, text, int',
        `'infinity', '', 50`,
      ],
    ] as const)(
      '%s: its index, read backwards, with no Sort',
      async (_name, text, relation, index, types, args) => {
        const org = newOrg()
        const plan = await planOf(org, text, types, `${`'${org}'`}, ${args}`)
        expectScan(plan, relation, index, 'Backward')
      }
    )

    test('DEAL_IMPORT_LIST_ERASED: its partial index, in order, with no Sort', async () => {
      const org = newOrg()
      const plan = await planOf(org, DEAL_IMPORT_LIST_ERASED, 'text, text, int', `'${org}', '', 50`)
      expectScan(plan, 'deal_imports', 'deal_imports_erased_idx')
    })

    test.each([
      ['DEAL_BY_DEAL_ID', DEAL_BY_DEAL_ID, 'deals', 'deals_deal_id_key', 'text, text', `'x'`],
      [
        'DEAL_IMPORT_ROWS_LIST',
        DEAL_IMPORT_ROWS_LIST,
        'deal_import_rows',
        'deal_import_rows_pkey',
        'text, text, int, int',
        `'dimp_x', 0, 50`,
      ],
      [
        'DEAL_IMPORT_ROWS_LIST_BY_RESULT',
        DEAL_IMPORT_ROWS_LIST_BY_RESULT,
        'deal_import_rows',
        'deal_import_rows_result_idx',
        'text, text, int, int, text',
        `'dimp_x', 0, 50, 'rejected'`,
      ],
    ] as const)(
      '%s: its index, in order, with no Sort',
      async (_name, text, relation, index, types, args) => {
        const org = newOrg()
        const plan = await planOf(org, text, types, `${`'${org}'`}, ${args}`)
        expectScan(plan, relation, index)
      }
    )
  })

  test('the tables are tenant tables: the other roles have no privilege on them', async () => {
    for (const table of ['deals', 'deal_imports', 'deal_import_rows', 'rights_confirmations']) {
      expect(await rejectionOf(core.query(`select 1 from playbook.${table}`))).toContain(
        'permission denied'
      )
    }
  })
  describe('the cap of unfinished imports and blank rows (0019)', () => {
    const insertImport = async (org: string) =>
      (await q(org, DEAL_IMPORT_INSERT, [org, newImport(), newUser(), `obj-${hex()}`, 10])).rows[0]
    const countOf = async (org: string) =>
      (
        await asOwner(org, (c) =>
          c.query(
            'select count(*)::int as n from playbook.deal_imports where organization_id = $1',
            [org]
          )
        )
      ).rows[0].n as number

    test('five unfinished imports are accepted and the sixth answers busy and stores nothing', async () => {
      const org = newOrg()
      for (let n = 0; n < MAX_QUEUED_DEAL_IMPORTS; n++) {
        expect(await insertImport(org)).toMatchObject({ result: 'created', state: 'uploaded' })
      }
      const busy = await insertImport(org)
      expect(busy).toMatchObject({ result: 'busy', id: null })
      expect(await countOf(org)).toBe(MAX_QUEUED_DEAL_IMPORTS)
      // Another Organization is not affected.
      expect(await insertImport(newOrg())).toMatchObject({ result: 'created' })
    })

    test('a finished import frees a place; a processing one holds it', async () => {
      const org = newOrg()
      const ids: string[] = []
      for (let n = 0; n < MAX_QUEUED_DEAL_IMPORTS; n++) {
        ids.push((await insertImport(org)).id)
      }
      expect(await insertImport(org)).toMatchObject({ result: 'busy' })
      await asOwner(org, (c) =>
        c.query(
          `update playbook.deal_imports set state = 'failed', failure_reason = 'unreadable', finished_at = now() where id = $1`,
          [ids[0]]
        )
      )
      expect(await insertImport(org)).toMatchObject({ result: 'created' })
      expect(await insertImport(org)).toMatchObject({ result: 'busy' })
    })

    test('two concurrent inserts at four queued: exactly one wins', async () => {
      const org = newOrg()
      for (let n = 0; n < MAX_QUEUED_DEAL_IMPORTS - 1; n++) {
        await insertImport(org)
      }
      const [one, two] = [await open(org), await open(org)]
      try {
        await one.client.query(`set local lock_timeout = '5s'`)
        await two.client.query(`set local lock_timeout = '5s'`)
        const first = (
          await one.client.query(DEAL_IMPORT_INSERT, [org, newImport(), newUser(), 'obj-a', 10])
        ).rows[0]
        const waiting = two.client.query(DEAL_IMPORT_INSERT, [
          org,
          newImport(),
          newUser(),
          'obj-b',
          10,
        ])
        await untilBlocked(two.pid)
        await one.client.query('commit')
        const second = (await waiting).rows[0]
        await two.client.query('commit')
        expect([first.result, second.result].sort()).toEqual(['busy', 'created'])
        expect(first.result).toBe('created')
      } finally {
        await finish(one, two)
      }
      expect(await countOf(org)).toBe(MAX_QUEUED_DEAL_IMPORTS)
    })

    describe('a blank CSV row is reported with no deal id', () => {
      const report = async (
        org: string,
        importId: string,
        row: number,
        dealId: string | null,
        reason: string
      ) =>
        asOwner(org, (c) =>
          c.query(
            `insert into playbook.deal_import_rows (organization_id, import_id, row_number, deal_id, result, reason)
             values ($1, $2, $3, $4, 'rejected', $5)`,
            [org, importId, row, dealId, reason]
          )
        )

      test('blank_row with a null deal id is accepted; an unknown reason and a null id with another reason are refused', async () => {
        const org = newOrg()
        const importId = (await insertImport(org)).id as string
        await report(org, importId, 2, null, 'blank_row')
        expect(await rejectionOf(report(org, importId, 3, 'D-3', 'not_a_reason'))).toContain(
          'deal_import_rows_reason_known'
        )
        expect(await rejectionOf(report(org, importId, 4, null, 'invalid_outcome'))).toContain(
          'deal_import_rows_deal_id_missing_only_when_unusable'
        )
        for (const [row, reason] of [
          [5, 'invalid_deal_id'],
          [6, 'wrong_column_count'],
        ] as const) {
          await report(org, importId, row, null, reason)
        }
      })
    })
  })
})
