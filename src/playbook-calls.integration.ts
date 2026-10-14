import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { dropStaleTestObjects, integrationEnv, migrateUp, rejectionOf } from './integration-support'
import {
  CALL_CLEANUP_BEGIN,
  CALL_CLEANUP_DONE,
  CALL_ERASE_BATCH,
  CALL_GET,
  CALL_INSERT,
  CALL_JOB_CLAIM,
  CALL_JOB_COMPLETE,
  CALL_JOB_FAIL,
  CALL_JOB_GIVE_UP_SPENT,
  CALL_JOB_HEARTBEAT,
  CALL_JOB_RECORD,
  CALL_JOB_RETRY,
  CALL_JOB_TRANSCRIBED,
  CALL_LIST,
  CALL_LIST_BY_DEAL,
  CALL_LIST_BY_DEAL_STATE,
  CALL_LIST_BY_STATE,
  CALL_LIST_PENDING_CLEANUP,
  CALL_LIST_SPENT_PURGES,
  CALL_PURGE_CLAIM,
  CALL_PURGE_COMPLETE,
  CALL_PURGE_RESET,
  CALL_REQUEUE,
  CALL_RESTORE,
  CALL_RESTORE_FOR_UPLOAD,
  CALL_RETAGGED,
  CALL_SENT_TO_VENDOR,
  CALL_SET_REP,
  CALL_SOFT_DELETE,
  CALL_USAGE,
  CALL_VENDOR_REMOVED,
  claimedCallJobs,
  DEAL_LIST_PENDING_RETAG,
  DEAL_RETAG_BATCH,
  DEAL_RETAG_DONE,
  DEAL_RETAG_LOCK,
} from './playbook-call-statements'
import {
  DEAL_BY_DEAL_ID,
  DEAL_ERASE_BATCH,
  DEAL_GET,
  DEAL_SET_OUTCOME,
  ORGANIZATION_REMOVAL_STATUS,
  ORGANIZATION_REMOVE_REST,
  ORGANIZATIONS_WITH_WORK,
  QUOTA_LOCK,
  REMOVE_ALL_IDEMPOTENCY_ROUTE,
  RIGHTS_CONFIRM,
} from './playbook-statements'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
// Every test works in Organizations of its own (random ids), so no test sees another's rows.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const hex = (): string => crypto.randomUUID().replaceAll('-', '')
const newOrg = (): string => `org_${hex()}`
const newUser = (): string => `usr_${hex()}`
const newCall = (): string => `call_${hex()}`
const newCjob = (): string => `cjob_${hex()}`
const newDeal = (): string => `deal_${hex()}`
const hashOf = (text: string): Buffer => createHash('sha256').update(text).digest()
const ERASER = `usr_${'0'.repeat(32)}`

interface Upload {
  id: string
  dealId: string
  kind: 'transcript' | 'recording'
  size: number
  hash: Buffer
  repBy: string | null
  repLabel: string | null
  repChannel: string | null
  maxCalls: number
  maxRecordingBytes: number
  maxDeals: number
  wording: number
}

describe('sales history, part two: Calls', () => {
  let owner: Pool
  let playbook: Pool

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 4 })
    await dropStaleTestObjects(owner, env.owner)
    playbook = new Pool({ connectionString: env.playbook, max: 12 })
  })

  afterAll(async () => {
    await Promise.all([owner.end(), playbook.end()])
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

  /** An Organization with a current rights confirmation (wording version 1). */
  const newConfirmedOrg = async (): Promise<string> => {
    const org = newOrg()
    await q(org, RIGHTS_CONFIRM, [org, newUser(), 1])
    return org
  }
  const upload = (over: Partial<Upload> = {}): Upload => ({
    id: newCall(),
    dealId: 'D-1',
    kind: 'transcript',
    size: 100,
    hash: hashOf(`content ${hex()}`),
    repBy: 'speaker',
    repLabel: 'Alice',
    repChannel: null,
    maxCalls: 100,
    maxRecordingBytes: 10 ** 12,
    maxDeals: 100,
    wording: 1,
    ...over,
  })
  const recording = (over: Partial<Upload> = {}): Upload =>
    upload({ kind: 'recording', size: 5000, repBy: null, repLabel: null, ...over })
  const insertParams = (org: string, u: Upload) => [
    org,
    u.id,
    u.dealId,
    newDeal(),
    u.kind === 'recording' ? 'a.mp3' : 'a.txt',
    u.kind === 'recording' ? 'audio/mpeg' : 'text/plain',
    u.kind,
    u.size,
    u.hash,
    newUser(),
    `${org}/${u.id}`,
    u.repBy,
    u.repLabel,
    u.repChannel,
    newCjob(),
    u.maxCalls,
    u.maxRecordingBytes,
    u.maxDeals,
    u.wording,
  ]
  /** The upload transaction: the lock first, then the insert. */
  const add = async (org: string, u: Upload) =>
    (
      await inOrg(org, async (c) => {
        await c.query(QUOTA_LOCK, [org])
        return c.query(CALL_INSERT, insertParams(org, u))
      })
    ).rows[0] as {
      result: string
      id: string | null
      state: string | null
      failure_reason: string | null
    }
  const mustAdd = async (org: string, u: Upload = upload()): Promise<Upload> => {
    const result = await add(org, u)
    if (result.result !== 'created') {
      throw new Error(`the upload was ${result.result}`)
    }
    return u
  }
  const claim = async (org: string, limit = 10, leaseMs = 60_000) =>
    claimedCallJobs((await q(org, CALL_JOB_CLAIM, [org, limit, leaseMs, null])).rows).jobs
  const claimOf = async (org: string, callId: string) => {
    const jobs = await claim(org)
    const job = jobs.find((j) => j.call_id === callId)
    if (!job) {
      throw new Error('no job claimed for the Call')
    }
    return job
  }
  const get = async (org: string, id: string) => (await q(org, CALL_GET, [org, id])).rows[0]
  const usage = async (org: string) =>
    (await q(org, CALL_USAGE, [org])).rows[0] as {
      call_count: string
      recording_byte_count: string
    }
  /** Take a Transcript Call to `ready` with the labels Alice and Bob. */
  const makeReady = async (org: string, u: Upload = upload()): Promise<Upload> => {
    await mustAdd(org, u)
    const job = await claimOf(org, u.id)
    await q(org, CALL_JOB_RECORD, [
      org,
      job.id,
      job.claim_token,
      null,
      null,
      ['Alice', 'Bob'],
      60_000,
    ])
    const done = await q(org, CALL_JOB_COMPLETE, [org, job.id, job.claim_token, 0])
    expect(done.rowCount).toBe(1)
    return u
  }
  const dealOf = async (org: string, dealId: string) =>
    (await q(org, DEAL_BY_DEAL_ID, [org, dealId])).rows[0]
  const setRep = async (
    org: string,
    id: string,
    by: string,
    label: string | null,
    channel: string | null = null
  ) =>
    (await q(org, CALL_SET_REP, [org, id, by, label, channel, newCjob()])).rows[0] as {
      result: string
      id: string
      state: string
      rep_seq: number
    }
  const named = async (org: string, kind: string) =>
    (await playbook.query(ORGANIZATIONS_WITH_WORK, [kind, org.slice(0, -1), 500])).rows.some(
      (r: { organization_id: string | null }) => r.organization_id === org
    )

  describe('the upload', () => {
    test('is refused without a confirmation at exactly the current wording version, and writes nothing', async () => {
      const org = newOrg()
      expect((await add(org, upload())).result).toBe('rights_required')
      await q(org, RIGHTS_CONFIRM, [org, newUser(), 1])
      expect((await add(org, upload({ wording: 2 }))).result).toBe('rights_required')
      expect((await q(org, CALL_LIST, [org, 'infinity', '', 10])).rowCount).toBe(0)
      expect((await dealOf(org, 'D-1')) ?? null).toBeNull()
      expect((await add(org, upload())).result).toBe('created')
    })

    test('creates the Call uploaded with its job, and an unknown deal id creates an open Deal', async () => {
      const org = await newConfirmedOrg()
      const u = await mustAdd(org)
      const call = await get(org, u.id)
      expect(call).toMatchObject({
        state: 'uploaded',
        kind: 'transcript',
        deal_id: 'D-1',
        deal_outcome: 'open',
        in_search: false,
        rep_by: 'speaker',
        rep_label: 'Alice',
      })
      const deal = await dealOf(org, 'D-1')
      expect(deal).toMatchObject({ outcome: 'open', appeared_in_import: false })
      const jobs = await asOwner(org, (c) => c.query('select kind, state from playbook.call_jobs'))
      expect(jobs.rows).toEqual([{ kind: 'process', state: 'queued' }])
      expect(await named(org, 'call_jobs')).toBe(true)
      const r = await mustAdd(org, recording({ dealId: 'D-2' }))
      const rec = await asOwner(org, (c) =>
        c.query('select kind from playbook.call_jobs where call_id = $1', [r.id])
      )
      expect(rec.rows).toEqual([{ kind: 'transcribe' }])
    })

    test('without the upload lock the insert fails with playbook.upload_lock', async () => {
      const org = await newConfirmedOrg()
      const u = upload()
      expect(
        await rejectionOf(inOrg(org, (c) => c.query(CALL_INSERT, insertParams(org, u))))
      ).toContain('playbook.upload_lock')
    })

    test('the same content under the same Deal answers with the stored Call; under another Deal it is refused and creates no Deal', async () => {
      const org = await newConfirmedOrg()
      const u = await mustAdd(org)
      const same = await add(org, upload({ hash: u.hash }))
      expect(same).toMatchObject({ result: 'existing', id: u.id, state: 'uploaded' })
      const other = await add(org, upload({ hash: u.hash, dealId: 'D-OTHER' }))
      expect(other.result).toBe('other_deal')
      expect(other.id).toBeNull()
      expect((await dealOf(org, 'D-OTHER')) ?? null).toBeNull()
      expect(Number((await usage(org)).call_count)).toBe(1)
    })

    test('a Transcript and a Recording of the same Call are two Calls', async () => {
      const org = await newConfirmedOrg()
      await mustAdd(org, upload())
      await mustAdd(org, recording())
      expect(Number((await usage(org)).call_count)).toBe(2)
    })

    test('a deleted match is restored by the upload; a failed one is re-queued only for the three transient reasons', async () => {
      const org = await newConfirmedOrg()
      const u = await mustAdd(org)
      await q(org, CALL_SOFT_DELETE, [org, u.id, newUser(), 0])
      expect(await add(org, upload({ hash: u.hash }))).toMatchObject({
        result: 'existing',
        state: 'deleted',
      })
      const restored = (await q(org, CALL_RESTORE_FOR_UPLOAD, [org, u.id, newCjob()])).rows[0]
      expect(restored).toMatchObject({ state: 'processing', changed: true })
      const transient = ['transcription_failed', 'transcription_timed_out', 'processing_failed']
      const permanent = [
        'no_turns',
        'too_few_speakers',
        'too_many_speakers',
        'rep_label_not_found',
        'not_per_side',
        'too_long',
        'unreadable',
      ]
      for (const reason of [...transient, ...permanent]) {
        const f = await mustAdd(org, upload({ dealId: `F-${reason}` }))
        const job = await claimOf(org, f.id)
        expect((await q(org, CALL_JOB_FAIL, [org, job.id, job.claim_token, reason])).rowCount).toBe(
          1
        )
        const again = (await q(org, CALL_REQUEUE, [org, f.id, newCjob()])).rows[0]
        if (transient.includes(reason)) {
          expect(again).toMatchObject({ state: 'uploaded', changed: true })
        } else {
          expect(again).toMatchObject({ state: 'failed', changed: false })
        }
      }
    })

    test('quota: calls, recording bytes and deals, exact under two uploads at once', async () => {
      const org = await newConfirmedOrg()
      const results = await Promise.all([
        add(org, upload({ maxCalls: 1, dealId: 'Q-1' })),
        add(org, upload({ maxCalls: 1, dealId: 'Q-2' })),
      ])
      expect(results.map((r) => r.result).sort()).toEqual(['created', 'quota_exceeded'])
      expect(Number((await usage(org)).call_count)).toBe(1)
      const rec = await add(org, recording({ maxRecordingBytes: 4000, dealId: 'Q-1' }))
      expect(rec.result).toBe('quota_exceeded')
      const deals = await add(org, upload({ maxDeals: 1, dealId: 'Q-NEW' }))
      expect(deals.result).toBe('quota_exceeded')
      expect((await dealOf(org, 'Q-NEW')) ?? null).toBeNull()
      // A Call for an existing Deal does not need a Deal slot.
      expect(
        (
          await add(
            org,
            upload({
              maxDeals: 1,
              maxCalls: 5,
              dealId: results[0]?.result === 'created' ? 'Q-1' : 'Q-2',
            })
          )
        ).result
      ).toBe('created')
    })

    test('counts include deleted and awaiting_rep Calls, and fall exactly after restore, purge and erasure', async () => {
      const org = await newConfirmedOrg()
      const rec = await mustAdd(org, recording())
      const t = await mustAdd(org, upload({ dealId: 'D-2' }))
      expect(await usage(org)).toMatchObject({ call_count: '2', recording_byte_count: '5000' })
      // Take the Recording to awaiting_rep: it still counts.
      const job = await claimOf(org, rec.id)
      await q(org, CALL_JOB_RECORD, [
        org,
        job.id,
        job.claim_token,
        `${org}/t`,
        60,
        ['A', 'B'],
        60_000,
      ])
      expect(
        (await q(org, CALL_JOB_TRANSCRIBED, [org, job.id, job.claim_token, newCjob()])).rows[0]
      ).toMatchObject({ state: 'awaiting_rep' })
      expect(await usage(org)).toMatchObject({ call_count: '2' })
      await q(org, CALL_SOFT_DELETE, [org, rec.id, newUser(), 0])
      expect(await usage(org)).toMatchObject({ call_count: '2', recording_byte_count: '5000' })
      // Restore: back to awaiting_rep (transcribed, no Rep), no job.
      expect((await q(org, CALL_RESTORE, [org, rec.id, newCjob()])).rows[0]).toMatchObject({
        state: 'awaiting_rep',
      })
      // Delete and purge both.
      for (const id of [rec.id, t.id]) {
        await q(org, CALL_SOFT_DELETE, [org, id, newUser(), 0])
      }
      await asOwner(org, (c) =>
        c.query(`update playbook.calls set purge_due_at = deleted_at where state = 'deleted'`)
      )
      const claimed = (await q(org, CALL_PURGE_CLAIM, [org, 10, 60_000])).rows
      expect(claimed.length).toBe(2)
      for (const c of claimed) {
        await q(org, CALL_CLEANUP_DONE, [org, c.id, c.deletion_seq])
        if (c.sent_to_vendor_at) {
          await q(org, CALL_VENDOR_REMOVED, [org, c.id, c.vendor_send_seq])
        }
        expect((await q(org, CALL_PURGE_COMPLETE, [org, c.id])).rowCount).toBe(1)
      }
      expect(await usage(org)).toMatchObject({ call_count: '0', recording_byte_count: '0' })
    })
  })

  describe('reads', () => {
    test('one query gives the Deal’s id, Outcome and in_search; the lists page by the cursor text and filter', async () => {
      const org = await newConfirmedOrg()
      const ids: string[] = []
      for (let i = 0; i < 4; i++) {
        ids.push((await makeReady(org, upload({ dealId: i < 3 ? 'W-1' : 'W-2' }))).id)
      }
      const deal = await dealOf(org, 'W-1')
      const seen: string[] = []
      let cursor: [string, string] = ['infinity', '']
      for (let pages = 0; pages < 10; pages++) {
        const page = (await q(org, CALL_LIST, [org, cursor[0], cursor[1], 2])).rows
        if (page.length === 0) {
          break
        }
        expect(typeof page[0].cursor_at).toBe('string')
        seen.push(...page.map((r) => r.id as string))
        const last = page[page.length - 1]
        cursor = [last.cursor_at, last.id]
      }
      expect(new Set(seen).size).toBe(4)
      expect((await q(org, CALL_LIST_BY_STATE, [org, 'infinity', '', 10, 'ready'])).rowCount).toBe(
        4
      )
      expect((await q(org, CALL_LIST_BY_DEAL, [org, 'infinity', '', 10, deal.id])).rowCount).toBe(3)
      expect(
        (await q(org, CALL_LIST_BY_DEAL_STATE, [org, 'infinity', '', 10, deal.id, 'deleted']))
          .rowCount
      ).toBe(0)
      expect(await rejectionOf(q(org, CALL_LIST, [org, 'x', '', 10]))).toContain(
        'invalid input syntax'
      )
      // A second Organization sees none and cannot read one by id.
      const other = await newConfirmedOrg()
      expect((await q(other, CALL_LIST, [other, 'infinity', '', 10])).rowCount).toBe(0)
      expect((await q(other, CALL_GET, [other, ids[0]])).rowCount).toBe(0)
    })

    test('in_search is derived: ready, won and tagged; false while a rebuild or a re-tag is pending', async () => {
      const org = await newConfirmedOrg()
      const u = await makeReady(org)
      expect((await get(org, u.id)).in_search).toBe(false)
      const deal = await dealOf(org, 'D-1')
      await q(org, DEAL_SET_OUTCOME, [org, deal.id, 'won', null, false])
      // Won, but the Moments carry the old Outcome until the re-tag finishes.
      expect(await get(org, u.id)).toMatchObject({ deal_outcome: 'won', in_search: false })
      const batch = (await q(org, DEAL_RETAG_BATCH, [org, deal.id, '', 10])).rows
      await q(org, CALL_RETAGGED, [org, batch.map((r) => r.id), batch[0].outcome_seq])
      expect((await get(org, u.id)).in_search).toBe(true)
      // A Rep change takes it out of search until the rebuild finishes.
      expect(await setRep(org, u.id, 'speaker', 'Bob')).toMatchObject({
        result: 'changed',
        state: 'processing',
      })
      expect((await get(org, u.id)).in_search).toBe(false)
      const job = await claimOf(org, u.id)
      await q(org, CALL_JOB_COMPLETE, [org, job.id, job.claim_token, batch[0].outcome_seq])
      expect((await get(org, u.id)).in_search).toBe(true)
      // A Deal that turns lost takes it out at once, with no job.
      await q(org, DEAL_SET_OUTCOME, [org, deal.id, 'lost', null, false])
      expect((await get(org, u.id)).in_search).toBe(false)
    })
  })

  describe('the Rep', () => {
    test('a Recording waits in awaiting_rep, a pick rebuilds with the new rep_seq, and the contract’s allowed states and invalid choices are enforced', async () => {
      const org = await newConfirmedOrg()
      const rec = await mustAdd(org, recording())
      const job = await claimOf(org, rec.id)
      expect(job.job_kind).toBe('transcribe')
      expect(await get(org, rec.id)).toMatchObject({ state: 'transcribing' })
      expect((await q(org, CALL_SENT_TO_VENDOR, [org, job.id, job.claim_token])).rowCount).toBe(1)
      // Not transcribed yet: the Transcript key is not recorded.
      expect(
        (await q(org, CALL_JOB_TRANSCRIBED, [org, job.id, job.claim_token, newCjob()])).rowCount
      ).toBe(0)
      await q(org, CALL_JOB_RECORD, [
        org,
        job.id,
        job.claim_token,
        `${org}/t`,
        90,
        ['A', 'B'],
        60_000,
      ])
      expect(
        (await q(org, CALL_JOB_TRANSCRIBED, [org, job.id, job.claim_token, newCjob()])).rows[0]
      ).toMatchObject({ state: 'awaiting_rep' })
      expect(await get(org, rec.id)).toMatchObject({
        state: 'awaiting_rep',
        rep_by: null,
        speaker_labels: ['A', 'B'],
      })
      expect((await setRep(org, rec.id, 'speaker', 'Z')).result).toBe('invalid')
      expect((await setRep(org, rec.id, 'channel', null, 'middle')).result).toBe('invalid')
      expect(await setRep(org, rec.id, 'speaker', 'A')).toMatchObject({
        result: 'changed',
        state: 'processing',
        rep_seq: 1,
      })
      // A repeat is idempotent, even while the rebuild is queued; a different choice is not allowed yet.
      expect((await setRep(org, rec.id, 'speaker', 'A')).result).toBe('unchanged')
      expect((await setRep(org, rec.id, 'speaker', 'B')).result).toBe('not_changeable')
      const rebuild = await claimOf(org, rec.id)
      expect(rebuild).toMatchObject({ job_kind: 'rebuild', rep_seq: 1 })
      expect(
        (await q(org, CALL_JOB_COMPLETE, [org, rebuild.id, rebuild.claim_token, 0])).rowCount
      ).toBe(1)
      expect(await get(org, rec.id)).toMatchObject({ state: 'ready', rep_label: 'A' })
      // A Transcript takes a speaker only.
      const t = await makeReady(org, upload({ dealId: 'D-T' }))
      expect((await setRep(org, t.id, 'channel', null, 'left')).result).toBe('invalid')
    })

    test('a stale rebuild cannot finish after the Rep sequence moved', async () => {
      const org = await newConfirmedOrg()
      const u = await makeReady(org)
      expect((await setRep(org, u.id, 'speaker', 'Bob')).rep_seq).toBe(1)
      const job = await claimOf(org, u.id)
      // The sequence moves on (the owner forces what a second change would do).
      await asOwner(org, (c) => c.query(`update playbook.calls set rep_seq = rep_seq + 1`))
      expect(
        (await q(org, CALL_JOB_HEARTBEAT, [org, job.id, job.claim_token, 60_000])).rowCount
      ).toBe(0)
      expect((await q(org, CALL_JOB_COMPLETE, [org, job.id, job.claim_token, 0])).rowCount).toBe(0)
      expect(await get(org, u.id)).toMatchObject({ state: 'processing', rep_seq: 2 })
    })

    test('a failed Call with rep_label_not_found takes a new Rep; one with a file-bound reason does not', async () => {
      const org = await newConfirmedOrg()
      const a = await mustAdd(org, upload({ dealId: 'R-A' }))
      const jobA = await claimOf(org, a.id)
      await q(org, CALL_JOB_RECORD, [org, jobA.id, jobA.claim_token, null, null, ['Bob'], 60_000])
      await q(org, CALL_JOB_FAIL, [org, jobA.id, jobA.claim_token, 'rep_label_not_found'])
      expect(await setRep(org, a.id, 'speaker', 'Bob')).toMatchObject({
        result: 'changed',
        rep_seq: 1,
      })
      const b = await mustAdd(org, upload({ dealId: 'R-B' }))
      const jobB = await claimOf(org, b.id)
      await q(org, CALL_JOB_FAIL, [org, jobB.id, jobB.claim_token, 'no_turns'])
      expect((await setRep(org, b.id, 'speaker', 'Alice')).result).toBe('not_changeable')
    })

    test('too_many_speakers clears the labels', async () => {
      const org = await newConfirmedOrg()
      const u = await mustAdd(org)
      const job = await claimOf(org, u.id)
      await q(org, CALL_JOB_RECORD, [
        org,
        job.id,
        job.claim_token,
        null,
        null,
        ['A', 'B', 'C'],
        60_000,
      ])
      await q(org, CALL_JOB_FAIL, [org, job.id, job.claim_token, 'too_many_speakers'])
      expect(await get(org, u.id)).toMatchObject({
        state: 'failed',
        failure_reason: 'too_many_speakers',
        speaker_labels: [],
      })
    })
  })

  describe('jobs', () => {
    test('claim, lease, retry and give-up: a spent job fails its Call; a lapsed lease is claimed again', async () => {
      const org = await newConfirmedOrg()
      const u = await mustAdd(org)
      const first = await claimOf(org, u.id)
      expect(first.attempts).toBe(1)
      expect(await claim(org)).toEqual([])
      expect(
        (await q(org, CALL_JOB_RETRY, [org, first.id, first.claim_token, 0])).rows[0]
      ).toMatchObject({ attempts: 1 })
      const second = await claimOf(org, u.id)
      expect(second.attempts).toBe(2)
      expect(
        (await q(org, CALL_JOB_HEARTBEAT, [org, first.id, first.claim_token, 60_000])).rowCount
      ).toBe(0)
      await asOwner(org, (c) =>
        c.query(
          `update playbook.call_jobs set attempts = 20, next_attempt_at = clock_timestamp() - interval '1 second'`
        )
      )
      expect(await claim(org)).toEqual([])
      expect((await q(org, CALL_JOB_GIVE_UP_SPENT, [org, 10])).rowCount).toBe(1)
      expect(await get(org, u.id)).toMatchObject({
        state: 'failed',
        failure_reason: 'processing_failed',
      })
    })

    test('a job whose Call was deleted meanwhile is cancelled by the claim, not run', async () => {
      const org = await newConfirmedOrg()
      const u = await mustAdd(org)
      await q(org, CALL_SOFT_DELETE, [org, u.id, newUser(), 0])
      expect(await claim(org)).toEqual([])
      const jobs = await asOwner(org, (c) => c.query('select state from playbook.call_jobs'))
      expect(jobs.rows).toEqual([{ state: 'cancelled' }])
    })
  })

  describe('the Outcome re-tag', () => {
    test('fans out over the Deal’s Calls in bounded batches, finishes only when none is stale, and never marks a late Call done', async () => {
      const org = await newConfirmedOrg()
      const calls: string[] = []
      for (let i = 0; i < 3; i++) {
        calls.push((await makeReady(org, upload())).id)
      }
      const deal = await dealOf(org, 'D-1')
      await q(org, DEAL_SET_OUTCOME, [org, deal.id, 'won', null, false])
      expect(await named(org, 'outcome_retag')).toBe(true)
      const pending = (await q(org, DEAL_LIST_PENDING_RETAG, [org, '', 10])).rows
      expect(pending).toMatchObject([{ id: deal.id, outcome_seq: 1, retag_through: 0 }])
      const first = (await q(org, DEAL_RETAG_BATCH, [org, deal.id, '', 2])).rows
      expect(first.length).toBe(2)
      await q(org, CALL_RETAGGED, [org, first.map((r) => r.id), 1])
      // One Call is still stale: the Deal is not done.
      const premature = await inOrg(org, async (c) => {
        await c.query(DEAL_RETAG_LOCK, [org, deal.id])
        return c.query(DEAL_RETAG_DONE, [org, deal.id, 1])
      })
      expect(premature.rowCount).toBe(0)
      const second = (await q(org, DEAL_RETAG_BATCH, [org, deal.id, first[1].id, 2])).rows
      expect(second.length).toBe(1)
      await q(org, CALL_RETAGGED, [org, second.map((r) => r.id), 1])
      const done = await inOrg(org, async (c) => {
        await c.query(DEAL_RETAG_LOCK, [org, deal.id])
        return c.query(DEAL_RETAG_DONE, [org, deal.id, 1])
      })
      expect(done.rows).toEqual([{ id: deal.id, retag_through: 1, outcome_seq: 1 }])
      expect(await named(org, 'outcome_retag')).toBe(false)
      expect((await q(org, DEAL_LIST_PENDING_RETAG, [org, '', 10])).rowCount).toBe(0)
      // A tag never goes above the Deal's sequence.
      expect((await q(org, CALL_RETAGGED, [org, calls, 5])).rowCount).toBe(0)
    })

    test('a Call that becomes ready with a stale tag while the re-tag finishes lowers the marker again: it waits for the Deal row, so it is never lost', async () => {
      const org = await newConfirmedOrg()
      const early = await makeReady(org, upload())
      const deal = await dealOf(org, 'D-1')
      const late = await mustAdd(org, upload())
      const lateJob = await claimOf(org, late.id)
      await q(org, CALL_JOB_RECORD, [
        org,
        lateJob.id,
        lateJob.claim_token,
        null,
        null,
        ['Alice'],
        60_000,
      ])
      await q(org, DEAL_SET_OUTCOME, [org, deal.id, 'won', null, false])
      const batch = (await q(org, DEAL_RETAG_BATCH, [org, deal.id, '', 10])).rows
      await q(org, CALL_RETAGGED, [org, batch.map((r) => r.id), 1])
      const [retagger, completer] = [await open(org), await open(org)]
      try {
        await retagger.client.query(DEAL_RETAG_LOCK, [org, deal.id])
        // The late Call completes with the old sequence: it waits for the Deal row.
        const waiting = completer.client.query(CALL_JOB_COMPLETE, [
          org,
          lateJob.id,
          lateJob.claim_token,
          0,
        ])
        await untilBlocked(completer.pid)
        const done = await retagger.client.query(DEAL_RETAG_DONE, [org, deal.id, 1])
        expect(done.rowCount).toBe(1)
        await retagger.client.query('commit')
        expect((await waiting).rowCount).toBe(1)
        await completer.client.query('commit')
      } finally {
        await finish(retagger, completer)
      }
      expect(early.id).toBeDefined()
      // The marker is lowered again and the late Call is found stale.
      expect((await q(org, DEAL_LIST_PENDING_RETAG, [org, '', 10])).rowCount).toBe(1)
      expect(
        (await q(org, DEAL_RETAG_BATCH, [org, deal.id, '', 10])).rows.map((r) => r.id)
      ).toEqual([late.id])
      expect(await named(org, 'outcome_retag')).toBe(true)
    })
  })

  describe('delete, restore, purge and erasure', () => {
    test('delete bumps the sequence once, cleanup and purge wait for each other, and the vendor copy gates the purge', async () => {
      const org = await newConfirmedOrg()
      const rec = await mustAdd(org, recording())
      const job = await claimOf(org, rec.id)
      await q(org, CALL_SENT_TO_VENDOR, [org, job.id, job.claim_token])
      const del = (await q(org, CALL_SOFT_DELETE, [org, rec.id, newUser(), 0])).rows[0]
      expect(del).toMatchObject({ state: 'deleted', deletion_seq: 1, changed: true })
      expect((await q(org, CALL_SOFT_DELETE, [org, rec.id, newUser(), 0])).rows[0]).toMatchObject({
        changed: false,
        deletion_seq: 1,
      })
      expect(await named(org, 'call_cleanup')).toBe(false)
      await asOwner(org, (c) =>
        c.query(
          `update playbook.calls set deleted_at = deleted_at - interval '10 minutes', purge_due_at = deleted_at - interval '9 minutes'`
        )
      ).catch(() => undefined)
      const pending = (await q(org, CALL_LIST_PENDING_CLEANUP, [org, '-infinity', '', 10])).rows
      expect(pending.map((r) => r.id)).toEqual([rec.id])
      const begin = (await q(org, CALL_CLEANUP_BEGIN, [org, rec.id, 1])).rows[0]
      expect(begin.id).toBe(rec.id)
      expect((await q(org, CALL_PURGE_COMPLETE, [org, rec.id])).rowCount).toBe(0)
      await q(org, CALL_CLEANUP_DONE, [org, rec.id, 1])
      // Claim (the purge time has passed) and try to complete: the vendor copy is not confirmed removed.
      await asOwner(org, (c) =>
        c.query(`update playbook.calls set purge_due_at = clock_timestamp() - interval '1 second'`)
      )
      expect((await q(org, CALL_PURGE_CLAIM, [org, 10, 60_000])).rowCount).toBe(1)
      expect((await q(org, CALL_PURGE_COMPLETE, [org, rec.id])).rowCount).toBe(0)
      await asOwner(org, (c) =>
        c.query(
          `update playbook.calls set purge_lease_until = clock_timestamp() - interval '1 second'`
        )
      )
      expect((await q(org, CALL_VENDOR_REMOVED, [org, rec.id, 1])).rowCount).toBe(1)
      expect((await q(org, CALL_PURGE_COMPLETE, [org, rec.id])).rowCount).toBe(1)
      expect((await get(org, rec.id)) ?? null).toBeNull()
    })

    test('a spent purge is listed and reset; the reset bars the Call from restore', async () => {
      const org = await newConfirmedOrg()
      const u = await mustAdd(org)
      await q(org, CALL_SOFT_DELETE, [org, u.id, newUser(), 0])
      await asOwner(org, (c) =>
        c.query(
          `update playbook.calls set purge_due_at = deleted_at, purge_attempts = 20,
                  purge_started_at = clock_timestamp(), purge_lease_until = clock_timestamp()`
        )
      )
      expect((await q(org, CALL_PURGE_CLAIM, [org, 10, 60_000])).rowCount).toBe(0)
      expect((await q(org, CALL_LIST_SPENT_PURGES, [org, '', 10])).rows.map((r) => r.id)).toEqual([
        u.id,
      ])
      expect((await q(org, CALL_PURGE_RESET, [org, u.id])).rows[0]).toMatchObject({
        purge_attempts: 0,
      })
      expect((await q(org, CALL_RESTORE_FOR_UPLOAD, [org, u.id, newCjob()])).rowCount).toBe(0)
    })

    test('erasure: Calls go before Deals, the status and the rest refuse until they are gone, and a barred Call cannot be restored', async () => {
      const org = await newConfirmedOrg()
      const u = await makeReady(org)
      const rec = await mustAdd(org, recording({ dealId: 'D-2' }))
      const rows = (await q(org, CALL_ERASE_BATCH, [org, 10, ERASER])).rows
      expect(rows.map((r) => r.id).sort()).toEqual([u.id, rec.id].sort())
      expect(rows.every((r) => r.object_key.startsWith(org))).toBe(true)
      expect((await q(org, CALL_ERASE_BATCH, [org, 10, ERASER])).rowCount).toBe(0)
      expect((await q(org, CALL_RESTORE, [org, u.id, newCjob()])).rowCount).toBe(0)
      expect((await q(org, CALL_RESTORE_FOR_UPLOAD, [org, u.id, newCjob()])).rowCount).toBe(0)
      // The same content uploaded again is a new Call (the barred one no longer blocks its hash).
      expect(
        (
          await add(
            org,
            upload({
              hash: (
                await asOwner(org, (c) =>
                  c.query('select content_hash from playbook.calls where id = $1', [u.id])
                )
              ).rows[0].content_hash,
            })
          )
        ).result
      ).toBe('created')
      await q(org, CALL_ERASE_BATCH, [org, 10, ERASER])
      expect(await rejectionOf(q(org, DEAL_ERASE_BATCH, [org, 10]))).toContain('calls_deal_fk')
      expect((await q(org, ORGANIZATION_REMOVAL_STATUS, [org])).rows[0]).toMatchObject({
        no_calls: false,
        removed: false,
      })
      expect(
        (await q(org, ORGANIZATION_REMOVE_REST, [org, REMOVE_ALL_IDEMPOTENCY_ROUTE])).rows[0]
      ).toEqual({ removed: false })
      // Purge every Call (cleanup, vendor copy and objects are the service's), then the Deals, then the rest.
      for (let rounds = 0; rounds < 5; rounds++) {
        const claimed = (await q(org, CALL_PURGE_CLAIM, [org, 10, 60_000])).rows
        for (const c of claimed) {
          await q(org, CALL_CLEANUP_DONE, [org, c.id, c.deletion_seq])
          await q(org, CALL_VENDOR_REMOVED, [org, c.id, c.vendor_send_seq])
          await q(org, CALL_PURGE_COMPLETE, [org, c.id])
        }
        if (claimed.length === 0) {
          break
        }
      }
      expect(Number((await usage(org)).call_count)).toBe(0)
      let total = 0
      for (;;) {
        const n = (await q(org, DEAL_ERASE_BATCH, [org, 10])).rows[0].deleted as number
        total += n
        if (n === 0) {
          break
        }
      }
      expect(total).toBe(2)
      expect(
        (await q(org, ORGANIZATION_REMOVE_REST, [org, REMOVE_ALL_IDEMPOTENCY_ROUTE])).rows[0]
      ).toEqual({ removed: true })
      expect((await q(org, ORGANIZATION_REMOVAL_STATUS, [org])).rows[0]).toMatchObject({
        no_calls: true,
        removed: true,
      })
    })
  })

  describe('open transactions: no write path takes the Organization upload lock per attempt', () => {
    test('while an upload holds the lock, the job, Rep, delete, restore, purge and erase statements of other Calls do not wait', async () => {
      const org = await newConfirmedOrg()
      const ready = await makeReady(org, upload({ dealId: 'L-1' }))
      const todo = await mustAdd(org, upload({ dealId: 'L-2' }))
      const gone = await mustAdd(org, upload({ dealId: 'L-3' }))
      await q(org, CALL_SOFT_DELETE, [org, gone.id, newUser(), 0])
      const holder = await open(org)
      const worker = await open(org)
      try {
        await holder.client.query(QUOTA_LOCK, [org])
        await worker.client.query(`set local lock_timeout = '2s'`)
        const claimed = claimedCallJobs(
          (await worker.client.query(CALL_JOB_CLAIM, [org, 1, 60_000, null])).rows
        ).jobs[0]
        if (!claimed) {
          throw new Error('no job claimed')
        }
        const { claim_token, id: jobId } = claimed
        await worker.client.query(CALL_JOB_HEARTBEAT, [org, jobId, claim_token, 60_000])
        await worker.client.query(CALL_JOB_FAIL, [org, jobId, claim_token, 'unreadable'])
        const rep = await worker.client.query(CALL_SET_REP, [
          org,
          ready.id,
          'speaker',
          'Bob',
          null,
          newCjob(),
        ])
        expect(rep.rows[0].result).toBe('changed')
        expect(
          (await worker.client.query(CALL_RESTORE, [org, gone.id, newCjob()])).rows[0].changed
        ).toBe(true)
        await worker.client.query(CALL_SOFT_DELETE, [org, todo.id, newUser(), 0])
        await worker.client.query(CALL_ERASE_BATCH, [org, 10, ERASER])
        await worker.client.query(CALL_PURGE_CLAIM, [org, 10, 60_000])
        await worker.client.query('commit')
      } finally {
        await finish(holder, worker)
      }
    })

    test('an upload for a Deal whose Outcome is being changed does not wait for the change; a second upload waits for the first and sees its Deal', async () => {
      const org = await newConfirmedOrg()
      await mustAdd(org, upload({ dealId: 'O-1' }))
      const deal = await dealOf(org, 'O-1')
      const [portal, first, second] = [await open(org), await open(org), await open(org)]
      try {
        await portal.client.query(DEAL_SET_OUTCOME, [org, deal.id, 'won', null, false])
        await first.client.query(`set local lock_timeout = '2s'`)
        await first.client.query(QUOTA_LOCK, [org])
        const a = upload({ dealId: 'O-1' })
        expect((await first.client.query(CALL_INSERT, insertParams(org, a))).rows[0].result).toBe(
          'created'
        )
        const waiting = second.client.query(QUOTA_LOCK, [org])
        await untilBlocked(second.pid)
        await first.client.query('commit')
        await waiting
        // The second sees the first's Call: the same content under the same Deal is the stored Call.
        const again = await second.client.query(
          CALL_INSERT,
          insertParams(org, upload({ dealId: 'O-1', hash: a.hash }))
        )
        expect(again.rows[0]).toMatchObject({ result: 'existing', id: a.id })
        await second.client.query('commit')
        await portal.client.query('commit')
      } finally {
        await finish(portal, first, second)
      }
    })

    test('a Rep change and a job claim on the same Call do not deadlock: both lock the job row before the Call', async () => {
      const org = await newConfirmedOrg()
      const u = await makeReady(org)
      expect((await setRep(org, u.id, 'speaker', 'Bob')).result).toBe('changed')
      const [a, b] = [await open(org), await open(org)]
      try {
        await a.client.query(`set local lock_timeout = '5s'`)
        await b.client.query(`set local lock_timeout = '5s'`)
        // The claim holds the job row and the Call row; the Rep change must queue behind it.
        const claimed = claimedCallJobs(
          (await a.client.query(CALL_JOB_CLAIM, [org, 5, 60_000, null])).rows
        ).jobs
        expect(claimed.map((j) => j.job_kind)).toEqual(['rebuild'])
        const changing = b.client.query(CALL_SET_REP, [
          org,
          u.id,
          'speaker',
          'Bob',
          null,
          newCjob(),
        ])
        await untilBlocked(b.pid)
        await a.client.query('commit')
        expect((await changing).rows[0].result).toBe('unchanged')
        await b.client.query('commit')
      } finally {
        await finish(a, b)
      }
    })

    test('a claim does not wait for an uncommitted Rep change: it skips the new job and finds it afterwards', async () => {
      const org = await newConfirmedOrg()
      const u = await makeReady(org)
      const [a, b] = [await open(org), await open(org)]
      try {
        await b.client.query(`set local lock_timeout = '2s'`)
        const rep = await a.client.query(CALL_SET_REP, [
          org,
          u.id,
          'speaker',
          'Bob',
          null,
          newCjob(),
        ])
        expect(rep.rows[0].result).toBe('changed')
        expect(
          claimedCallJobs((await b.client.query(CALL_JOB_CLAIM, [org, 5, 60_000, null])).rows).jobs
        ).toEqual([])
        await a.client.query('commit')
        await b.client.query('commit')
      } finally {
        await finish(a, b)
      }
      expect((await claim(org)).map((j) => j.job_kind)).toEqual(['rebuild'])
    })

    test('two claims at once take different jobs', async () => {
      const org = await newConfirmedOrg()
      await mustAdd(org, upload({ dealId: 'C-1' }))
      await mustAdd(org, upload({ dealId: 'C-2' }))
      const [x, y] = await Promise.all([claim(org, 1), claim(org, 1)])
      expect(x.length + y.length).toBe(2)
      expect(new Set([...x, ...y].map((j) => j.id)).size).toBe(2)
    })
  })

  describe('the discovery kinds are noted by the writes that create the work', () => {
    test('an upload notes call_jobs, a delete notes call_purge and call_cleanup, an Outcome change notes outcome_retag', async () => {
      const org = await newConfirmedOrg()
      const u = await mustAdd(org)
      expect(await named(org, 'call_jobs')).toBe(true)
      const deal = await dealOf(org, 'D-1')
      expect((await q(org, DEAL_GET, [org, deal.id])).rowCount).toBe(1)
      await q(org, DEAL_SET_OUTCOME, [org, deal.id, 'lost', null, false])
      expect(await named(org, 'outcome_retag')).toBe(true)
      await q(org, CALL_SOFT_DELETE, [org, u.id, newUser(), 0])
      const hints = await owner.query(
        `select kind from playbook.work_hints where organization_id = $1 and kind like 'call%' order by kind`,
        [org]
      )
      expect(hints.rows.map((r) => r.kind)).toEqual(['call_cleanup', 'call_jobs', 'call_purge'])
    })
  })

  describe('review round 1', () => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
    const ageAllDeleted = (org: string) =>
      asOwner(org, (c) =>
        c.query(`update playbook.calls set purge_due_at = deleted_at where state = 'deleted'`)
      )

    // F1. Fails on fcea62e: the second send keeps vendor_removed_at, so the purge completes at once.
    test('F1: a Recording sent again after its first copy was confirmed gone needs a second confirmation', async () => {
      const org = await newConfirmedOrg()
      const rec = await mustAdd(org, recording())
      const first = await claimOf(org, rec.id)
      expect(
        (await q(org, CALL_SENT_TO_VENDOR, [org, first.id, first.claim_token])).rows[0]
      ).toMatchObject({ vendor_send_seq: 1 })
      await q(org, CALL_SOFT_DELETE, [org, rec.id, newUser(), 0])
      expect((await q(org, CALL_VENDOR_REMOVED, [org, rec.id, 1])).rowCount).toBe(1)
      // Restored before a Transcript exists: back to uploaded with a transcribe job.
      expect((await q(org, CALL_RESTORE, [org, rec.id, newCjob()])).rows[0]).toMatchObject({
        state: 'uploaded',
      })
      const second = await claimOf(org, rec.id)
      expect(
        (await q(org, CALL_SENT_TO_VENDOR, [org, second.id, second.claim_token])).rows[0]
      ).toMatchObject({ vendor_send_seq: 2 })
      const again = await asOwner(org, (c) =>
        c.query('select vendor_removed_at, vendor_send_seq from playbook.calls where id = $1', [
          rec.id,
        ])
      )
      expect(again.rows[0]).toEqual({ vendor_removed_at: null, vendor_send_seq: 2 })
      await q(org, CALL_SOFT_DELETE, [org, rec.id, newUser(), 0])
      await ageAllDeleted(org)
      expect((await q(org, CALL_PURGE_CLAIM, [org, 10, 60_000])).rows[0]).toMatchObject({
        vendor_send_seq: 2,
        vendor_removed_at: null,
      })
      await q(org, CALL_CLEANUP_DONE, [org, rec.id, 2])
      expect((await q(org, CALL_PURGE_COMPLETE, [org, rec.id])).rowCount).toBe(0)
      // A late confirmation of the first copy confirms nothing about the second.
      expect((await q(org, CALL_VENDOR_REMOVED, [org, rec.id, 1])).rowCount).toBe(0)
      expect((await q(org, CALL_PURGE_COMPLETE, [org, rec.id])).rowCount).toBe(0)
      expect((await q(org, CALL_VENDOR_REMOVED, [org, rec.id, 2])).rowCount).toBe(1)
      expect((await q(org, CALL_PURGE_COMPLETE, [org, rec.id])).rowCount).toBe(1)
    })

    test('F1: erasure has the same gate: the purge of an erased Call waits for the latest send', async () => {
      const org = await newConfirmedOrg()
      const rec = await mustAdd(org, recording())
      const job = await claimOf(org, rec.id)
      await q(org, CALL_SENT_TO_VENDOR, [org, job.id, job.claim_token])
      const erased = (await q(org, CALL_ERASE_BATCH, [org, 10, ERASER])).rows[0]
      expect(erased).toMatchObject({ id: rec.id, vendor_send_seq: 1 })
      const claimed = (await q(org, CALL_PURGE_CLAIM, [org, 10, 60_000])).rows[0]
      await q(org, CALL_CLEANUP_DONE, [org, rec.id, claimed.deletion_seq])
      expect((await q(org, CALL_PURGE_COMPLETE, [org, rec.id])).rowCount).toBe(0)
      await q(org, CALL_VENDOR_REMOVED, [org, rec.id, claimed.vendor_send_seq])
      expect((await q(org, CALL_PURGE_COMPLETE, [org, rec.id])).rowCount).toBe(1)
    })

    // F2. Fails on fcea62e: the Outcome change and the re-tag finish while the completion is open.
    test('F2: a completion open at sequence N holds back an Outcome change and its re-tag, and no Call ends stale and unseen', async () => {
      const org = await newConfirmedOrg()
      const u = upload()
      await mustAdd(org, u)
      const job = await claimOf(org, u.id)
      await q(org, CALL_JOB_RECORD, [org, job.id, job.claim_token, null, null, ['Alice'], 60_000])
      const deal = await dealOf(org, 'D-1')
      const completer = await open(org)
      let changed = false
      let change: Promise<void> | undefined
      try {
        expect(
          (await completer.client.query(CALL_JOB_COMPLETE, [org, job.id, job.claim_token, 0]))
            .rowCount
        ).toBe(1)
        change = (async () => {
          await q(org, DEAL_SET_OUTCOME, [org, deal.id, 'won', null, false])
          await inOrg(org, async (c) => {
            await c.query(DEAL_RETAG_LOCK, [org, deal.id])
            await c.query(DEAL_RETAG_DONE, [org, deal.id, 1])
          })
          changed = true
        })()
        await sleep(400)
        expect(changed).toBe(false)
        await completer.client.query('commit')
      } finally {
        await finish(completer)
      }
      await change
      const row = (
        await asOwner(org, (c) =>
          c.query(
            `select c.tagged_outcome_seq, d.outcome_seq, d.retag_through
             from playbook.calls c join playbook.deals d on d.id = c.deal_record_id and d.organization_id = c.organization_id
             where c.id = $1`,
            [u.id]
          )
        )
      ).rows[0]
      const stale = row.tagged_outcome_seq < row.outcome_seq
      const unseen = row.retag_through >= row.outcome_seq
      expect([stale, unseen]).not.toEqual([true, true])
      if (stale) {
        expect(
          (await q(org, DEAL_RETAG_BATCH, [org, deal.id, '', 10])).rows.map((r) => r.id)
        ).toEqual([u.id])
      }
    })

    test('F2: a completion behind an open Outcome change tags against the new sequence', async () => {
      const org = await newConfirmedOrg()
      const u = upload()
      await mustAdd(org, u)
      const job = await claimOf(org, u.id)
      await q(org, CALL_JOB_RECORD, [org, job.id, job.claim_token, null, null, ['Alice'], 60_000])
      const deal = await dealOf(org, 'D-1')
      const [portal, worker] = [await open(org), await open(org)]
      try {
        await portal.client.query(DEAL_SET_OUTCOME, [org, deal.id, 'won', null, false])
        const completing = worker.client.query(CALL_JOB_COMPLETE, [org, job.id, job.claim_token, 0])
        await untilBlocked(worker.pid)
        await portal.client.query('commit')
        expect((await completing).rowCount).toBe(1)
        await worker.client.query('commit')
      } finally {
        await finish(portal, worker)
      }
      expect((await q(org, DEAL_LIST_PENDING_RETAG, [org, '', 10])).rows).toMatchObject([
        { id: deal.id },
      ])
      expect(
        (await q(org, DEAL_RETAG_BATCH, [org, deal.id, '', 10])).rows.map((r) => r.id)
      ).toEqual([u.id])
    })

    // F3. Fails on fcea62e: the role may delete a ready Call.
    test('F3: the service role deletes only a Call whose purge has started', async () => {
      const org = await newConfirmedOrg()
      const ready = await makeReady(org)
      const due = await mustAdd(org, upload({ dealId: 'F3-B' }))
      const gone = await mustAdd(org, upload({ dealId: 'F3-C' }))
      const del = (id: string) =>
        q(org, 'delete from playbook.calls where organization_id = $1 and id = $2', [org, id])
      expect((await del(ready.id)).rowCount).toBe(0)
      await q(org, CALL_SOFT_DELETE, [org, due.id, newUser(), 0])
      expect((await del(due.id)).rowCount).toBe(0)
      await q(org, CALL_SOFT_DELETE, [org, gone.id, newUser(), 0])
      await ageAllDeleted(org)
      expect((await q(org, CALL_PURGE_CLAIM, [org, 1, 60_000])).rowCount).toBe(1)
      const started = (
        await asOwner(org, (c) =>
          c.query('select id from playbook.calls where purge_started_at is not null')
        )
      ).rows[0].id as string
      expect((await del(started)).rowCount).toBe(1)
      expect((await get(org, ready.id)).state).toBe('ready')
    })

    // F5. Fails on fcea62e: a null choice is applied and strands a ready Call in processing.
    test('F5: a null or unknown Rep choice is invalid and writes nothing', async () => {
      const org = await newConfirmedOrg()
      const u = await makeReady(org)
      const bad = async (by: string | null) =>
        (await q(org, CALL_SET_REP, [org, u.id, by, 'Bob', null, newCjob()])).rows[0]
      expect(await bad(null)).toMatchObject({ result: 'invalid', state: 'ready' })
      expect(await bad('nobody')).toMatchObject({ result: 'invalid', state: 'ready' })
      expect(await get(org, u.id)).toMatchObject({ state: 'ready', rep_by: 'speaker', rep_seq: 0 })
      const rec = await mustAdd(org, recording({ dealId: 'F5-R' }))
      const job = await claimOf(org, rec.id)
      await q(org, CALL_JOB_RECORD, [
        org,
        job.id,
        job.claim_token,
        `${org}/t`,
        60,
        ['A', 'B'],
        60_000,
      ])
      await q(org, CALL_JOB_TRANSCRIBED, [org, job.id, job.claim_token, newCjob()])
      expect((await setRepNull(org, rec.id)).result).toBe('invalid')
      expect(await get(org, rec.id)).toMatchObject({ state: 'awaiting_rep' })
    })
    const setRepNull = async (org: string, id: string) =>
      (await q(org, CALL_SET_REP, [org, id, null, null, null, newCjob()])).rows[0] as {
        result: string
      }

    // F6. Fails on fcea62e: a Transcript without a Rep is stored.
    test('F6: a Transcript without a Rep is refused by the table', async () => {
      const org = await newConfirmedOrg()
      expect(
        await rejectionOf(add(org, upload({ repBy: null, repLabel: null, dealId: 'F6' })))
      ).toContain('calls_transcript_has_rep')
      const u = await makeReady(org)
      expect(
        await rejectionOf(
          asOwner(org, (c) =>
            c.query('update playbook.calls set rep_by = null, state = $2 where id = $1', [
              u.id,
              'processing',
            ])
          )
        )
      ).toContain('calls_transcript_has_rep')
    })

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

    // F4. CALL_LIST_BY_DEAL_STATE and the split of CALL_LIST_BY_DEAL fail on fcea62e (the one
    // statement could not use calls_deal_list_idx under a generic plan).
    test.each([
      [
        'CALL_LIST',
        CALL_LIST,
        'calls_list_idx',
        'text, timestamptz, text, int',
        `'infinity', '', 50`,
        'Backward',
      ],
      [
        'CALL_LIST_BY_STATE',
        CALL_LIST_BY_STATE,
        'calls_state_list_idx',
        'text, timestamptz, text, int, text',
        `'infinity', '', 50, 'ready'`,
        'Backward',
      ],
      [
        'CALL_LIST_BY_DEAL',
        CALL_LIST_BY_DEAL,
        'calls_deal_list_idx',
        'text, timestamptz, text, int, text',
        `'infinity', '', 50, 'deal_x'`,
        'Backward',
      ],
      [
        'CALL_LIST_BY_DEAL_STATE',
        CALL_LIST_BY_DEAL_STATE,
        'calls_state_list_idx',
        'text, timestamptz, text, int, text, text',
        `'infinity', '', 50, 'deal_x', 'deleted'`,
        'Backward',
      ],
      [
        'CALL_LIST_PENDING_CLEANUP',
        CALL_LIST_PENDING_CLEANUP,
        'calls_cleanup_idx',
        'text, timestamptz, text, int',
        `'-infinity', '', 50`,
        'Forward',
      ],
      [
        'CALL_LIST_SPENT_PURGES',
        CALL_LIST_SPENT_PURGES,
        'calls_spent_purge_idx',
        'text, text, int',
        `'', 50`,
        'Forward',
      ],
      [
        'DEAL_RETAG_BATCH',
        DEAL_RETAG_BATCH,
        'calls_retag_idx',
        'text, text, text, int',
        `'deal_x', '', 50`,
        'Forward',
      ],
    ] as const)(
      'F4: %s uses its index under a generic plan, in order, with no Sort',
      async (_n, text, index, types, args, direction) => {
        const org = newOrg()
        const plan = await planOf(org, text, types, `'${org}', ${args}`)
        const nodes = walk(plan)
        const dump = JSON.stringify(plan, null, 1)
        const scans = nodes.filter((n) => n['Relation Name'] === 'calls')
        expect([scans.map((n) => n['Index Name']), dump]).toEqual([[index], dump])
        expect([scans[0]?.['Scan Direction'], dump]).toEqual([direction, dump])
        expect([nodes.some((n) => n['Node Type'] === 'Sort'), dump]).toEqual([false, dump])
      }
    )

    test.each([
      ['CALL_PURGE_CLAIM', CALL_PURGE_CLAIM, 'calls_purge_idx', 'text, int, int', `10, 60000`],
      [
        'DEAL_LIST_PENDING_RETAG',
        DEAL_LIST_PENDING_RETAG,
        'deals_retag_idx',
        'text, text, int',
        `'', 50`,
      ],
    ] as const)(
      'F4: %s reads through its partial index under a generic plan',
      async (_n, text, index, types, args) => {
        const org = newOrg()
        const plan = await planOf(org, text, types, `'${org}', ${args}`)
        const dump = JSON.stringify(plan, null, 1)
        expect([walk(plan).some((n) => n['Index Name'] === index), dump]).toEqual([true, dump])
        expect([walk(plan).some((n) => n['Node Type'] === 'Seq Scan'), dump]).toEqual([false, dump])
      }
    )
  })
})
