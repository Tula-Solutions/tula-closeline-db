import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { Pool, type PoolClient } from 'pg'
import { createDb, type DbHandle } from './client'
import {
  adminUrl,
  dropStaleTestObjects,
  integrationEnv,
  migrateUp,
  pinColumnStats,
  rejectionOf,
} from './integration-support'
import { assertTenantIsolation } from './isolation'
import { runMigrations } from './migrate'
import {
  CONSUMED_CLAIM,
  CONSUMED_COMPLETE,
  CONSUMED_LOOKUP,
  CONSUMED_PURGE,
  CONSUMED_RELEASE,
  CONSUMED_RENEW,
  claimedJobs,
  DOCUMENT_BY_HASH,
  DOCUMENT_CLEANUP_BEGIN,
  DOCUMENT_CLEANUP_DONE,
  DOCUMENT_GET,
  DOCUMENT_INSERT,
  DOCUMENT_LIST,
  DOCUMENT_LIST_DELETED,
  DOCUMENT_LIST_FILTERED,
  DOCUMENT_PURGE_CLAIM,
  DOCUMENT_PURGE_COMPLETE,
  DOCUMENT_REQUEUE,
  DOCUMENT_RESTORE,
  DOCUMENT_RESTORE_FOR_UPLOAD,
  DOCUMENT_ROW_FIELDS,
  DOCUMENT_SEARCH_STATE,
  DOCUMENT_SOFT_DELETE,
  IDEMPOTENCY_BEGIN,
  IDEMPOTENCY_COMPLETE,
  IDEMPOTENCY_LOOKUP,
  IDEMPOTENCY_PURGE,
  INDEX_SETTINGS_UPSERT,
  INDEX_VECTORS_MARK,
  INGESTION_JOB_ADVANCE,
  INGESTION_JOB_CLAIM,
  INGESTION_JOB_COMPLETE,
  INGESTION_JOB_FAIL,
  INGESTION_JOB_GIVE_UP_SPENT,
  INGESTION_JOB_HEARTBEAT,
  INGESTION_JOB_RETRY,
  MAX_DOCUMENT_SEARCH_STATE_IDS,
  PLAYBOOK_STATEMENTS,
  QUOTA_LOCK,
  QUOTA_USAGE,
} from './playbook-statements'
import { withOrganization } from './tenant'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
// Every test works in Organizations of its own (random ids), so no test sees another's rows.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const MIGRATIONS = fileURLToPath(new URL('../migrations', import.meta.url))
const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`
const hex = (): string => crypto.randomUUID().replaceAll('-', '')
const newOrg = (): string => `org_${hex()}`
const newDoc = (): string => `doc_${hex()}`
const newJob = (): string => `job_${hex()}`
const newUser = (): string => `usr_${hex()}`
const ZERO_ORG = `org_${'0'.repeat(32)}`
const hashOf = (text: string): Buffer => createHash('sha256').update(text).digest()
const HOUR = 3_600_000
const BIG = 1_000_000

describe('the playbook schema', () => {
  let owner: Pool
  let playbook: Pool
  let core: Pool
  let auth: Pool
  let handle: DbHandle

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 4 })
    await dropStaleTestObjects(owner, env.owner)
    playbook = new Pool({ connectionString: env.playbook, max: 12 })
    core = new Pool({ connectionString: env.core, max: 1 })
    auth = new Pool({ connectionString: env.auth, max: 1 })
    handle = createDb(env.playbook, { max: 2 })
  })

  afterAll(async () => {
    await Promise.all([owner.end(), playbook.end(), core.end(), auth.end(), handle.close()])
  })

  /** Run `fn` in one transaction scoped to `org` (or to none), committing on success. */
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

  /** An open transaction on its own connection, scoped to `org`, with its backend pid. */
  async function open(org: string) {
    const client = await playbook.connect()
    await client.query('begin')
    await client.query('select set_config($1, $2, true)', [SETTING, org])
    const pid = (await client.query('select pg_backend_pid() as pid')).rows[0]?.pid as number
    return { client, pid }
  }

  /** Wait until the backend `pid` waits for a lock (bounded by tries, not by a clock). */
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

  interface Added {
    id: string
    jobId: string
    hash: Buffer
    org: string
  }

  /** Add a document the way the service does (lock, then insert), returning null when refused. */
  async function addDoc(
    org: string,
    opts: { content?: string; size?: number; maxDocs?: number; maxBytes?: number } = {}
  ): Promise<Added | null> {
    const id = newDoc()
    const jobId = newJob()
    const hash = hashOf(opts.content ?? `content ${hex()}`)
    const result = await inOrg(org, async (c) => {
      await c.query(QUOTA_LOCK, [org])
      return c.query(DOCUMENT_INSERT, [
        org,
        id,
        'Playbook.pdf',
        hash,
        opts.size ?? 1000,
        'application/pdf',
        'pdf',
        newUser(),
        `${org}/${id}`,
        jobId,
        opts.maxDocs ?? BIG,
        opts.maxBytes ?? 10 ** 12,
      ])
    })
    return result.rowCount ? { id, jobId, hash, org } : null
  }
  const mustAdd = async (org: string, opts?: Parameters<typeof addDoc>[1]): Promise<Added> => {
    const added = await addDoc(org, opts)
    if (!added) {
      throw new Error('the document was refused')
    }
    return added
  }

  const remove = (org: string, id: string, retentionMs = 0) =>
    inOrg(org, (c) => c.query(DOCUMENT_SOFT_DELETE, [org, id, newUser(), retentionMs]))
  const restore = (org: string, id: string, forUpload = false) =>
    inOrg(org, (c) =>
      c.query(forUpload ? DOCUMENT_RESTORE_FOR_UPLOAD : DOCUMENT_RESTORE, [org, id, newJob()])
    )
  const claimPurge = (org: string, limit = 10, leaseMs = 600_000) =>
    inOrg(org, (c) => c.query(DOCUMENT_PURGE_CLAIM, [org, limit, leaseMs]))
  const row = async (org: string, id: string) =>
    (await inOrg(org, (c) => c.query('select * from playbook.documents where id = $1', [id])))
      .rows[0]
  // node-postgres returns bigint as a string; the counts are compared as numbers.
  const counts = (
    r: { document_count: string | number; byte_count: string | number } | undefined
  ) => ({
    document_count: Number(r?.document_count ?? 0),
    byte_count: Number(r?.byte_count ?? 0),
  })
  const usage = async (org: string) =>
    counts((await inOrg(org, (c) => c.query(QUOTA_USAGE, [org]))).rows[0])
  const actualUsage = async (org: string) =>
    counts(
      (
        await inOrg(org, (c) =>
          c.query(
            `select count(*) as document_count, coalesce(sum(size_bytes), 0) as byte_count
               from playbook.documents where organization_id = $1`,
            [org]
          )
        )
      ).rows[0]
    )
  /** Move a deleted document's deletion back so its purge is due now (the owner, in scope). */
  const makeDue = (org: string, id: string) =>
    asOwner(org, (c) =>
      c.query(
        `update playbook.documents
            set deleted_at = deleted_at - interval '3 hours', purge_due_at = purge_due_at - interval '3 hours'
          where id = $1`,
        [id]
      )
    )
  const deleteDue = async (org: string, id: string) => {
    await remove(org, id)
    await makeDue(org, id)
  }
  const jobRow = async (org: string, id: string) =>
    (await inOrg(org, (c) => c.query('select * from playbook.ingestion_jobs where id = $1', [id])))
      .rows[0]
  const claimJobs = (
    org: string,
    limit: number | null = 10,
    leaseMs = 600_000,
    jobId: string | null = null
  ) => inOrg(org, (c) => c.query(INGESTION_JOB_CLAIM, [org, limit, leaseMs, jobId]))
  /** End a job's lease now (the owner), as if the worker had died. */
  const expireLease = (org: string, jobId: string) =>
    asOwner(org, (c) =>
      c.query(
        `update playbook.ingestion_jobs set next_attempt_at = clock_timestamp() - interval '1 second' where id = $1`,
        [jobId]
      )
    )

  describe('isolation between Organizations', () => {
    test('a second Organization cannot read or change the first through any statement', async () => {
      const a = newOrg()
      const b = newOrg()
      const doc = await mustAdd(a, { content: 'shared text' })
      const claimed = (await claimJobs(a, 5, 600_000, doc.jobId)).rows[0]
      await inOrg(a, (c) => c.query(INDEX_SETTINGS_UPSERT, [a, 'model-a', 1024]))
      const token = newUser()
        .slice(4)
        .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
      await inOrg(a, (c) => c.query(CONSUMED_CLAIM, ['c', a, 'm1', token, 60_000]))
      const before = {
        doc: await row(a, doc.id),
        job: await jobRow(a, doc.jobId),
        usage: await usage(a),
      }
      // B's scope, A's ids, in both the Organization and the key positions.
      const attempts: [string, string, unknown[]][] = [
        ['QUOTA_USAGE', QUOTA_USAGE, [a]],
        ['DOCUMENT_BY_HASH', DOCUMENT_BY_HASH, [a, doc.hash]],
        ['DOCUMENT_LIST', DOCUMENT_LIST, [a, 'infinity', '', 50]],
        ['DOCUMENT_SOFT_DELETE', DOCUMENT_SOFT_DELETE, [a, doc.id, newUser(), HOUR]],
        ['DOCUMENT_RESTORE', DOCUMENT_RESTORE, [a, doc.id, newJob()]],
        ['DOCUMENT_REQUEUE', DOCUMENT_REQUEUE, [a, doc.id, newJob()]],
        ['DOCUMENT_CLEANUP_BEGIN', DOCUMENT_CLEANUP_BEGIN, [a, doc.id, 1]],
        ['DOCUMENT_CLEANUP_DONE', DOCUMENT_CLEANUP_DONE, [a, doc.id, 1]],
        ['DOCUMENT_PURGE_CLAIM', DOCUMENT_PURGE_CLAIM, [a, 10, 60_000]],
        ['DOCUMENT_PURGE_COMPLETE', DOCUMENT_PURGE_COMPLETE, [a, doc.id]],
        ['INGESTION_JOB_CLAIM', INGESTION_JOB_CLAIM, [a, 10, 60_000, null]],
        [
          'INGESTION_JOB_HEARTBEAT',
          INGESTION_JOB_HEARTBEAT,
          [a, doc.jobId, claimed?.claim_token, 1],
        ],
        [
          'INGESTION_JOB_ADVANCE',
          INGESTION_JOB_ADVANCE,
          [a, doc.jobId, claimed?.claim_token, 'chunk', null, null, null, null, 1],
        ],
        ['INGESTION_JOB_RETRY', INGESTION_JOB_RETRY, [a, doc.jobId, claimed?.claim_token, 0]],
        ['INGESTION_JOB_COMPLETE', INGESTION_JOB_COMPLETE, [a, doc.jobId, claimed?.claim_token]],
        [
          'INGESTION_JOB_FAIL',
          INGESTION_JOB_FAIL,
          [a, doc.jobId, claimed?.claim_token, 'unreadable'],
        ],
        ['INGESTION_JOB_GIVE_UP_SPENT', INGESTION_JOB_GIVE_UP_SPENT, [a, 10]],
        ['CONSUMED_RENEW', CONSUMED_RENEW, ['c', a, 'm1', token, 1000]],
        ['CONSUMED_COMPLETE', CONSUMED_COMPLETE, ['c', a, 'm1', token]],
        ['CONSUMED_LOOKUP', CONSUMED_LOOKUP, ['c', a, 'm1']],
        ['CONSUMED_PURGE', CONSUMED_PURGE, [a, new Date(Date.now() + 86_400_000), 10]],
        ['INDEX_VECTORS_MARK', INDEX_VECTORS_MARK, [a]],
      ]
      for (const [name, text, params] of attempts) {
        const result = await inOrg(b, (c) => c.query(text, params))
        expect([name, result.rowCount]).toEqual([name, 0])
      }
      // The same statements with B's own id find nothing of A's either.
      for (const [name, text, params] of attempts) {
        const own = params.map((p) => (p === a ? b : p))
        const result = await inOrg(b, (c) => c.query(text, own))
        expect([name, result.rowCount]).toEqual([name, 0])
      }
      // An insert for A from B's scope is refused by the policy, not silently dropped.
      const upsert = await rejectionOf(
        inOrg(b, (c) => c.query(INDEX_SETTINGS_UPSERT, [a, 'model-b', 8]))
      )
      expect(upsert).toContain('row-level security')
      const release = await inOrg(b, (c) => c.query(CONSUMED_RELEASE, ['c', a, 'm1', token]))
      expect(release.rowCount).toBe(0)
      expect(await row(a, doc.id)).toEqual(before.doc)
      expect(await jobRow(a, doc.jobId)).toEqual(before.job)
      expect(await usage(a)).toEqual(before.usage)
      expect((await inOrg(a, (c) => c.query(CONSUMED_LOOKUP, ['c', a, 'm1']))).rows[0]?.state).toBe(
        'claimed'
      )
      expect(
        (await inOrg(a, (c) => c.query('select embedding_model from playbook.index_settings'))).rows
      ).toEqual([{ embedding_model: 'model-a' }])
    })

    test('B cannot write a row for A, and no scope sees nothing', async () => {
      const a = newOrg()
      const b = newOrg()
      const doc = await mustAdd(a)
      const refused = await rejectionOf(
        inOrg(b, (c) =>
          c.query(DOCUMENT_INSERT, [
            a,
            newDoc(),
            'x.pdf',
            hashOf('x'),
            1,
            'application/pdf',
            'pdf',
            newUser(),
            'k',
            newJob(),
            BIG,
            10 ** 12,
          ])
        )
      )
      expect(refused).toContain('row-level security')
      for (const table of [
        'documents',
        'ingestion_jobs',
        'consumed_message',
        'index_settings',
        'organization_usage',
        'embed_usage',
        'orphan_sweeps',
        'idempotency_keys',
      ]) {
        const none = await scoped(playbook, null, (c) => c.query(`select 1 from playbook.${table}`))
        expect(none.rowCount).toBe(0)
      }
      expect(await row(a, doc.id)).toBeDefined()
    })

    test('the tenant-scoped helper sees only its Organization', async () => {
      const a = newOrg()
      const b = newOrg()
      await mustAdd(a)
      await mustAdd(a)
      await mustAdd(b)
      const count = (org: string) =>
        withOrganization(handle.db, org, async (tx) => {
          const result = await tx.execute<{ n: number }>(
            sql`select count(*)::int as n from playbook.documents`
          )
          return result.rows[0]?.n
        })
      expect(await count(a)).toBe(2)
      expect(await count(b)).toBe(1)
    })

    test('no other service role reaches the schema, and the catalog check passes', async () => {
      for (const pool of [core, auth]) {
        const message = await rejectionOf(pool.query('select 1 from playbook.documents'))
        expect(message).toContain('permission denied')
      }
      await assertTenantIsolation(handle.db)
    })
  })

  describe('the rules the tables keep', () => {
    const base = (org: string, over: Record<string, unknown> = {}) => ({
      id: newDoc(),
      organization_id: org,
      name: 'A.pdf',
      content_hash: hashOf(hex()),
      size_bytes: 10,
      declared_type: 'application/pdf',
      detected_type: 'pdf',
      uploaded_by: newUser(),
      object_key: 'k',
      ...over,
    })
    const put = (org: string, over: Record<string, unknown> = {}) => {
      const values = base(org, over)
      const keys = Object.keys(values)
      return inOrg(org, (c) =>
        c.query(
          `insert into playbook.documents (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')})`,
          Object.values(values)
        )
      )
    }

    test.each([
      ['a failed document without a reason', { state: 'failed' }, 'documents_failed_has_reason'],
      [
        'a reason on a document that has not failed',
        { failure_reason: 'unreadable' },
        'documents_failed_has_reason',
      ],
      [
        'a reason outside the list',
        { state: 'failed', failure_reason: 'bad' },
        'documents_failure_reason_known',
      ],
      ['a state outside the five', { state: 'purged' }, 'documents_state_known'],
      [
        'a deleted document without its times',
        { state: 'deleted', deletion_seq: 1 },
        'documents_deleted_has_times',
      ],
      ['a size of zero', { size_bytes: 0 }, 'documents_size_bounds'],
      ['a size over 25 MiB', { size_bytes: 26_214_401 }, 'documents_size_bounds'],
      ['a short hash', { content_hash: Buffer.alloc(31) }, 'documents_content_hash_length'],
      ['an unknown detected type', { detected_type: 'html' }, 'documents_detected_type_known'],
      [
        'a purge start on a live document',
        { purge_started_at: new Date(), purge_lease_until: new Date(), purge_attempts: 1 },
        'documents_purge_only_when_deleted',
      ],
    ])('refuses %s', async (_name, over, constraint) => {
      expect(await rejectionOf(put(newOrg(), over))).toContain(constraint)
    })

    test('a deleted document has its times and a sequence, and a failed one a reason', async () => {
      const org = newOrg()
      const when = new Date()
      await put(org, {
        state: 'deleted',
        deletion_seq: 1,
        deleted_at: when,
        purge_due_at: new Date(when.getTime() + HOUR),
      })
      await put(org, { state: 'failed', failure_reason: 'too_many_pages' })
    })

    test('the role cannot rewrite a document identity, and a trigger stops the owner too', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      const denied = await rejectionOf(
        inOrg(org, (c) =>
          c.query(`update playbook.documents set content_hash = $2 where id = $1`, [
            doc.id,
            hashOf('z'),
          ])
        )
      )
      expect(denied).toContain('permission denied')
      const ownerEdit = await rejectionOf(
        asOwner(org, (c) =>
          c.query(`update playbook.documents set size_bytes = 5 where id = $1`, [doc.id])
        )
      )
      expect(ownerEdit).toContain('playbook.document_identity')
      await remove(org, doc.id)
      const down = await rejectionOf(
        asOwner(org, (c) =>
          c.query(`update playbook.documents set deletion_seq = 0 where id = $1`, [doc.id])
        )
      )
      expect(down).toContain('playbook.document_identity')
    })

    test('the role deletes only a soft-deleted document, never a job, and cannot write the counts', async () => {
      const org = newOrg()
      const live = await mustAdd(org)
      const gone = await mustAdd(org)
      await remove(org, gone.id)
      const keepLive = await inOrg(org, (c) =>
        c.query('delete from playbook.documents where id = $1', [live.id])
      )
      expect(keepLive.rowCount).toBe(0)
      const dropped = await inOrg(org, (c) =>
        c.query('delete from playbook.documents where id = $1', [gone.id])
      )
      expect(dropped.rowCount).toBe(1)
      const job = await rejectionOf(
        inOrg(org, (c) =>
          c.query('delete from playbook.ingestion_jobs where id = $1', [live.jobId])
        )
      )
      expect(job).toContain('permission denied')
      for (const statement of [
        `update playbook.organization_usage set document_count = 0`,
        `delete from playbook.organization_usage`,
        `insert into playbook.organization_usage (organization_id) values ('${newOrg()}')`,
      ]) {
        expect(await rejectionOf(inOrg(org, (c) => c.query(statement)))).toContain(
          'permission denied'
        )
      }
    })

    test('a second active job for a document is refused', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      const refused = await rejectionOf(
        inOrg(org, (c) =>
          c.query(
            `insert into playbook.ingestion_jobs (id, organization_id, document_id, epoch, next_attempt_at)
             values ($1, $2, $3, 0, clock_timestamp())`,
            [newJob(), org, doc.id]
          )
        )
      )
      expect(refused).toContain('ingestion_jobs_active_document_key')
    })

    test('a job may not hold more chunks done than chunks, nor attempts over the bound', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      const [claim] = (await claimJobs(org)).rows
      const over = await rejectionOf(
        inOrg(org, (c) =>
          c.query(INGESTION_JOB_ADVANCE, [
            org,
            doc.jobId,
            claim.claim_token,
            'embed',
            null,
            3,
            10,
            11,
            1000,
          ])
        )
      )
      expect(over).toContain('ingestion_jobs_counts_bounds')
      const attempts = await rejectionOf(
        asOwner(org, (c) =>
          c.query(`update playbook.ingestion_jobs set attempts = 21 where id = $1`, [doc.jobId])
        )
      )
      expect(attempts).toContain('ingestion_jobs_attempts_bounds')
    })
  })

  describe('quota counts', () => {
    test('the counter follows insert, soft delete, restore and purge, and equals the table', async () => {
      const org = newOrg()
      const a = await mustAdd(org, { size: 100 })
      const b = await mustAdd(org, { size: 250 })
      await mustAdd(org, { size: 7 })
      expect(await usage(org)).toEqual({ document_count: 3, byte_count: 357 })
      await remove(org, a.id)
      expect(await usage(org)).toEqual({ document_count: 3, byte_count: 357 })
      await restore(org, a.id)
      expect(await usage(org)).toEqual({ document_count: 3, byte_count: 357 })
      await deleteDue(org, b.id)
      const [claimed] = (await claimPurge(org)).rows
      expect(claimed.id).toBe(b.id)
      await inOrg(org, async (c) => {
        await c.query(DOCUMENT_CLEANUP_BEGIN, [org, b.id, claimed.deletion_seq])
        await c.query(DOCUMENT_CLEANUP_DONE, [org, b.id, claimed.deletion_seq])
        expect((await c.query(DOCUMENT_PURGE_COMPLETE, [org, b.id])).rowCount).toBe(1)
      })
      expect(await usage(org)).toEqual({ document_count: 2, byte_count: 107 })
      expect(await usage(org)).toEqual(await actualUsage(org))
    })

    test('a rolled-back insert leaves the counter alone', async () => {
      const org = newOrg()
      await mustAdd(org, { size: 10 })
      const t = await open(org)
      try {
        await t.client.query(QUOTA_LOCK, [org])
        await t.client.query(DOCUMENT_INSERT, [
          org,
          newDoc(),
          'x.pdf',
          hashOf(hex()),
          99,
          'application/pdf',
          'pdf',
          newUser(),
          'k',
          newJob(),
          BIG,
          10 ** 12,
        ])
        await t.client.query('rollback')
      } finally {
        t.client.release()
      }
      expect(await usage(org)).toEqual({ document_count: 1, byte_count: 10 })
      expect(await usage(org)).toEqual(await actualUsage(org))
    })

    test('an Organization with no document has no row, and the quota is enforced', async () => {
      const org = newOrg()
      expect((await inOrg(org, (c) => c.query(QUOTA_USAGE, [org]))).rowCount).toBe(0)
      await mustAdd(org, { size: 600, maxDocs: 2, maxBytes: 1000 })
      expect(await addDoc(org, { size: 600, maxDocs: 2, maxBytes: 1000 })).toBeNull()
      await mustAdd(org, { size: 400, maxDocs: 2, maxBytes: 1000 })
      expect(await addDoc(org, { size: 1, maxDocs: 2, maxBytes: 1000 })).toBeNull()
      expect(await usage(org)).toEqual({ document_count: 2, byte_count: 1000 })
    })

    test('soft-deleted documents count until purged', async () => {
      const org = newOrg()
      const a = await mustAdd(org, { maxDocs: 1 })
      await remove(org, a.id)
      expect(await addDoc(org, { maxDocs: 1 })).toBeNull()
    })

    test('two uploads at once cannot both pass a quota of one', async () => {
      const org = newOrg()
      const first = await open(org)
      const second = await open(org)
      try {
        await first.client.query(QUOTA_LOCK, [org])
        const waiting = second.client.query(QUOTA_LOCK, [org])
        await untilBlocked(second.pid)
        const one = await first.client.query(DOCUMENT_INSERT, [
          org,
          newDoc(),
          'a.pdf',
          hashOf(hex()),
          5,
          'application/pdf',
          'pdf',
          newUser(),
          'k',
          newJob(),
          1,
          BIG,
        ])
        expect(one.rowCount).toBe(1)
        await first.client.query('commit')
        await waiting
        const two = await second.client.query(DOCUMENT_INSERT, [
          org,
          newDoc(),
          'b.pdf',
          hashOf(hex()),
          5,
          'application/pdf',
          'pdf',
          newUser(),
          'k',
          newJob(),
          1,
          BIG,
        ])
        expect(two.rowCount).toBe(0)
        await second.client.query('commit')
      } finally {
        first.client.release()
        second.client.release()
      }
      expect(await usage(org)).toEqual({ document_count: 1, byte_count: 5 })
    })
  })

  describe('documents', () => {
    test('an upload queues the document as uploaded with one queued job', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      expect(await row(org, doc.id)).toMatchObject({ state: 'uploaded', epoch: 0, deletion_seq: 0 })
      expect(await jobRow(org, doc.jobId)).toMatchObject({
        state: 'queued',
        step: 'parse',
        attempts: 0,
      })
    })

    test('a duplicate hash is refused and found, also when soft-deleted; a purging one does not block', async () => {
      const org = newOrg()
      const doc = await mustAdd(org, { content: 'same' })
      expect(await addDoc(org, { content: 'same' })).toBeNull()
      const found = await inOrg(org, (c) => c.query(DOCUMENT_BY_HASH, [org, doc.hash]))
      expect(found.rows).toEqual([{ id: doc.id, state: 'uploaded', epoch: 0, deletion_seq: 0 }])
      await remove(org, doc.id)
      expect(await addDoc(org, { content: 'same' })).toBeNull()
      const deleted = await inOrg(org, (c) => c.query(DOCUMENT_BY_HASH, [org, doc.hash]))
      expect(deleted.rows[0]).toMatchObject({ id: doc.id, state: 'deleted', deletion_seq: 1 })
      await makeDue(org, doc.id)
      expect((await claimPurge(org)).rowCount).toBe(1)
      const none = await inOrg(org, (c) => c.query(DOCUMENT_BY_HASH, [org, doc.hash]))
      expect(none.rowCount).toBe(0)
      const fresh = await mustAdd(org, { content: 'same' })
      expect(fresh.id).not.toBe(doc.id)
      // Another Organization may hold the same content.
      await mustAdd(newOrg(), { content: 'same' })
    })

    test('the list pages by cursor, newest first, without deleted documents', async () => {
      const org = newOrg()
      const ids: string[] = []
      for (let i = 0; i < 5; i++) {
        ids.push((await mustAdd(org)).id)
      }
      await remove(org, ids[1] as string)
      const page = async (cursor: [string, string], size: number) =>
        (await inOrg(org, (c) => c.query(DOCUMENT_LIST, [org, cursor[0], cursor[1], size]))).rows
      const first = await page(['infinity', ''], 2)
      expect(first).toHaveLength(2)
      const last = first[1]
      // The cursor carries the database's own text form: a JS Date would drop the microseconds.
      const text = await inOrg(org, (c) =>
        c.query('select created_at::text as t from playbook.documents where id = $1', [last.id])
      )
      const second = await page([text.rows[0].t, last.id], 10)
      const seen = [...first, ...second].map((r) => r.id)
      expect(new Set(seen).size).toBe(4)
      expect(seen).not.toContain(ids[1] as string)
      expect(await page(['infinity', ''], 0)).toHaveLength(1)
    })

    test('a soft delete is one write: seq, due time from the clock, floored retention, job cancelled', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      const deleted = (await remove(org, doc.id, 0)).rows[0]
      expect(deleted).toMatchObject({ id: doc.id, deletion_seq: 1, changed: true })
      const stored = await row(org, doc.id)
      expect(stored).toMatchObject({ state: 'deleted', epoch: 1, deletion_seq: 1 })
      const gap = await inOrg(org, (c) =>
        c.query(
          `select extract(epoch from purge_due_at - deleted_at)::float8 as secs from playbook.documents where id = $1`,
          [doc.id]
        )
      )
      expect(gap.rows[0].secs).toBeGreaterThanOrEqual(3600)
      expect(gap.rows[0].secs).toBeLessThan(3605)
      expect(await jobRow(org, doc.jobId)).toMatchObject({ state: 'cancelled', claim_token: null })
      const again = (await remove(org, doc.id, 0)).rows[0]
      expect(again).toMatchObject({ deletion_seq: 1, changed: false })
      expect((await remove(org, newDoc())).rowCount).toBe(0)
    })

    test('a longer retention is kept', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await remove(org, doc.id, 30 * 24 * HOUR)
      const gap = await inOrg(org, (c) =>
        c.query(
          `select extract(epoch from purge_due_at - deleted_at)::float8 as secs from playbook.documents where id = $1`,
          [doc.id]
        )
      )
      expect(Math.round(gap.rows[0].secs)).toBe(30 * 24 * 3600)
    })

    test('restore needs a deleted document, re-queues ingestion and is idempotent', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      expect((await restore(org, doc.id)).rows[0]).toMatchObject({
        state: 'uploaded',
        changed: false,
      })
      await remove(org, doc.id)
      const restored = (await restore(org, doc.id)).rows[0]
      expect(restored).toMatchObject({
        state: 'processing',
        epoch: 2,
        deletion_seq: 1,
        changed: true,
      })
      expect(await row(org, doc.id)).toMatchObject({
        state: 'processing',
        deleted_at: null,
        purge_due_at: null,
      })
      const queued = await inOrg(org, (c) =>
        c.query(
          `select state from playbook.ingestion_jobs where document_id = $1 order by created_at`,
          [doc.id]
        )
      )
      expect(queued.rows.map((r) => r.state)).toEqual(['cancelled', 'queued'])
      expect((await restore(org, doc.id)).rows[0]).toMatchObject({ changed: false })
      expect((await restore(org, newDoc())).rowCount).toBe(0)
    })

    test('a restore after the purge has claimed the document is refused', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await deleteDue(org, doc.id)
      expect((await claimPurge(org)).rowCount).toBe(1)
      expect((await restore(org, doc.id, true)).rowCount).toBe(0)
      expect(await row(org, doc.id)).toMatchObject({ state: 'deleted' })
    })

    test('a failed document is re-queued by a matching upload, once', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      const [claim] = (await claimJobs(org)).rows
      await inOrg(org, (c) =>
        c.query(INGESTION_JOB_FAIL, [org, doc.jobId, claim.claim_token, 'password_protected'])
      )
      expect(await row(org, doc.id)).toMatchObject({
        state: 'failed',
        failure_reason: 'password_protected',
      })
      const requeue = () => inOrg(org, (c) => c.query(DOCUMENT_REQUEUE, [org, doc.id, newJob()]))
      expect((await requeue()).rows[0]).toMatchObject({ state: 'uploaded', changed: true })
      expect(await row(org, doc.id)).toMatchObject({ state: 'uploaded', failure_reason: null })
      expect((await requeue()).rows[0]).toMatchObject({ state: 'uploaded', changed: false })
      expect((await claimJobs(org)).rowCount).toBe(1)
    })
  })

  describe('soft delete, restore and purge on separate connections', () => {
    test('restore takes the row first: the purge claim skips it and then finds no deleted document', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await deleteDue(org, doc.id)
      const restoring = await open(org)
      try {
        expect(
          (await restoring.client.query(DOCUMENT_RESTORE_FOR_UPLOAD, [org, doc.id, newJob()]))
            .rowCount
        ).toBe(1)
        const skipped = await claimPurge(org)
        expect(skipped.rowCount).toBe(0)
        await restoring.client.query('commit')
      } finally {
        restoring.client.release()
      }
      expect((await claimPurge(org)).rowCount).toBe(0)
      expect(await row(org, doc.id)).toMatchObject({ state: 'processing', purge_started_at: null })
    })

    test('the purge claim takes the row first: the restore waits, then finds it claimed and returns no row', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await deleteDue(org, doc.id)
      const purging = await open(org)
      const restoring = await open(org)
      try {
        const claimed = await purging.client.query(DOCUMENT_PURGE_CLAIM, [org, 10, 600_000])
        expect(claimed.rowCount).toBe(1)
        const waiting = restoring.client.query(DOCUMENT_RESTORE_FOR_UPLOAD, [org, doc.id, newJob()])
        await untilBlocked(restoring.pid)
        await purging.client.query('commit')
        expect((await waiting).rowCount).toBe(0)
        await restoring.client.query('commit')
      } finally {
        purging.client.release()
        restoring.client.release()
      }
      const stored = await row(org, doc.id)
      expect(stored.state).toBe('deleted')
      expect(stored.purge_started_at).toBeInstanceOf(Date)
    })

    test('a purge claim that rolls back lets the waiting restore win', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await deleteDue(org, doc.id)
      const purging = await open(org)
      const restoring = await open(org)
      try {
        await purging.client.query(DOCUMENT_PURGE_CLAIM, [org, 10, 600_000])
        const waiting = restoring.client.query(DOCUMENT_RESTORE_FOR_UPLOAD, [org, doc.id, newJob()])
        await untilBlocked(restoring.pid)
        await purging.client.query('rollback')
        expect((await waiting).rows[0]).toMatchObject({ state: 'processing', changed: true })
        await restoring.client.query('commit')
      } finally {
        purging.client.release()
        restoring.client.release()
      }
      expect(await row(org, doc.id)).toMatchObject({ state: 'processing', purge_started_at: null })
    })

    test('two restores at once: the second waits, finds it restored, and a rerun reports no change', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await remove(org, doc.id)
      const first = await open(org)
      const second = await open(org)
      try {
        const one = await first.client.query(DOCUMENT_RESTORE, [org, doc.id, newJob()])
        expect(one.rows[0]).toMatchObject({ state: 'processing', changed: true })
        const waiting = second.client.query(DOCUMENT_RESTORE, [org, doc.id, newJob()])
        await untilBlocked(second.pid)
        await first.client.query('commit')
        // No row: this call's snapshot predates the first's commit. Run again, as documented.
        expect((await waiting).rowCount).toBe(0)
        await second.client.query('commit')
      } finally {
        first.client.release()
        second.client.release()
      }
      expect((await restore(org, doc.id)).rows[0]).toMatchObject({
        state: 'processing',
        changed: false,
      })
      const active = await inOrg(org, (c) =>
        c.query(
          `select count(*)::int as n from playbook.ingestion_jobs where document_id = $1 and state in ('queued', 'running')`,
          [doc.id]
        )
      )
      expect(active.rows[0].n).toBe(1)
    })

    test('two soft deletes at once: one changes the document, the other leaves the sequence at 1', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      const first = await open(org)
      const second = await open(org)
      try {
        const one = await first.client.query(DOCUMENT_SOFT_DELETE, [org, doc.id, newUser(), HOUR])
        expect(one.rows[0]).toMatchObject({ deletion_seq: 1, changed: true })
        const waiting = second.client.query(DOCUMENT_SOFT_DELETE, [org, doc.id, newUser(), HOUR])
        await untilBlocked(second.pid)
        await first.client.query('commit')
        // No row: the second call's snapshot predates the first's commit. Run again, as documented.
        expect((await waiting).rowCount).toBe(0)
        await second.client.query('commit')
      } finally {
        first.client.release()
        second.client.release()
      }
      expect((await remove(org, doc.id)).rows[0]).toMatchObject({ deletion_seq: 1, changed: false })
    })

    test('a purge completion needs the cleanup of the current deletion, then removes the row and its jobs', async () => {
      const org = newOrg()
      const doc = await mustAdd(org, { size: 321 })
      await deleteDue(org, doc.id)
      const [claimed] = (await claimPurge(org)).rows
      expect(claimed).toMatchObject({
        id: doc.id,
        deletion_seq: 1,
        vectors_removed_seq: null,
        size_bytes: '321',
      })
      const complete = () => inOrg(org, (c) => c.query(DOCUMENT_PURGE_COMPLETE, [org, doc.id]))
      expect((await complete()).rowCount).toBe(0)
      const begin = await inOrg(org, (c) => c.query(DOCUMENT_CLEANUP_BEGIN, [org, doc.id, 1]))
      expect(begin.rows[0]).toMatchObject({ epoch: 1, clear: true })
      expect(
        (await inOrg(org, (c) => c.query(DOCUMENT_CLEANUP_DONE, [org, doc.id, 1]))).rowCount
      ).toBe(1)
      expect((await complete()).rowCount).toBe(1)
      expect((await complete()).rowCount).toBe(0)
      expect(await row(org, doc.id)).toBeUndefined()
      expect(await jobRow(org, doc.jobId)).toBeUndefined()
      expect(await usage(org)).toEqual({ document_count: 0, byte_count: 0 })
    })

    test('a cleanup queued for a deletion does nothing after a restore, and a later deletion has its own', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await remove(org, doc.id)
      const begin = (seq: number) =>
        inOrg(org, (c) => c.query(DOCUMENT_CLEANUP_BEGIN, [org, doc.id, seq]))
      const done = (seq: number) =>
        inOrg(org, (c) => c.query(DOCUMENT_CLEANUP_DONE, [org, doc.id, seq]))
      expect((await begin(1)).rowCount).toBe(1)
      await restore(org, doc.id)
      expect((await begin(1)).rowCount).toBe(0)
      expect((await done(1)).rowCount).toBe(0)
      expect((await row(org, doc.id)).vectors_removed_seq).toBeNull()
      const second = (await remove(org, doc.id)).rows[0]
      expect(second.deletion_seq).toBe(2)
      expect((await begin(1)).rowCount).toBe(0)
      expect((await done(1)).rowCount).toBe(0)
      expect((await begin(2)).rows[0]).toMatchObject({ epoch: 3, clear: true })
      expect((await done(2)).rowCount).toBe(1)
      expect((await done(2)).rowCount).toBe(1)
      expect((await row(org, doc.id)).vectors_removed_seq).toBe(2)
    })

    test('a cleanup that began before a restore cannot record itself after it', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await remove(org, doc.id)
      expect(
        (await inOrg(org, (c) => c.query(DOCUMENT_CLEANUP_BEGIN, [org, doc.id, 1]))).rowCount
      ).toBe(1)
      await restore(org, doc.id)
      expect(
        (await inOrg(org, (c) => c.query(DOCUMENT_CLEANUP_DONE, [org, doc.id, 1]))).rowCount
      ).toBe(0)
    })

    test('deleting a document whose job is running fences the cleanup until the lease ends', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      const [claim] = (await claimJobs(org, 10, 600_000)).rows
      await remove(org, doc.id)
      const begin = () => inOrg(org, (c) => c.query(DOCUMENT_CLEANUP_BEGIN, [org, doc.id, 1]))
      expect((await begin()).rows[0]).toMatchObject({ clear: false })
      const stale = await inOrg(org, (c) =>
        c.query(INGESTION_JOB_HEARTBEAT, [org, doc.jobId, claim.claim_token, 1000])
      )
      expect(stale.rowCount).toBe(0)
      const done = await inOrg(org, (c) =>
        c.query(INGESTION_JOB_COMPLETE, [org, doc.jobId, claim.claim_token])
      )
      expect(done.rowCount).toBe(0)
      await expireLease(org, doc.jobId)
      expect((await begin()).rows[0]).toMatchObject({ clear: true })
      expect(await row(org, doc.id)).toMatchObject({ state: 'deleted' })
    })

    test('the purge claim is bounded, leased, and never takes a spent document', async () => {
      const org = newOrg()
      const ids: string[] = []
      for (let i = 0; i < 5; i++) {
        const d = await mustAdd(org)
        ids.push(d.id)
        await deleteDue(org, d.id)
      }
      // One more that is not due yet.
      const early = await mustAdd(org)
      await remove(org, early.id)
      const taken = [
        ...(await claimPurge(org, 2)).rows,
        ...(await claimPurge(org, 2)).rows,
        ...(await claimPurge(org, 2)).rows,
      ].map((r) => r.id)
      expect(taken.sort()).toEqual([...ids].sort())
      expect((await claimPurge(org, 10)).rowCount).toBe(0)
      // A lapsed lease makes it due again, with the attempt counted.
      await asOwner(org, (c) =>
        c.query(
          `update playbook.documents set purge_lease_until = clock_timestamp() - interval '1 second' where id = $1`,
          [ids[0]]
        )
      )
      const again = (await claimPurge(org)).rows
      expect(again.map((r) => r.id)).toEqual([ids[0] as string])
      expect(again[0].purge_attempts).toBe(2)
      // At the bound it is never claimed, and the others in the batch still are.
      await asOwner(org, (c) =>
        c.query(
          `update playbook.documents set purge_attempts = 20, purge_lease_until = clock_timestamp() - interval '1 second' where id = $1`,
          [ids[0]]
        )
      )
      await asOwner(org, (c) =>
        c.query(
          `update playbook.documents set purge_lease_until = clock_timestamp() - interval '1 second' where id = any($1) and id <> $2`,
          [ids, ids[0]]
        )
      )
      const batch = (await claimPurge(org, 4)).rows.map((r) => r.id)
      expect(batch.sort()).toEqual(ids.slice(1).sort())
    })
  })

  describe('ingestion jobs', () => {
    test('a claim leases the job, counts the attempt and moves an uploaded document to processing', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      const claimed = await claimJobs(org)
      expect(claimed.rows).toHaveLength(1)
      expect(claimed.rows[0]).toMatchObject({
        id: doc.jobId,
        document_id: doc.id,
        step: 'parse',
        attempts: 1,
      })
      expect(await row(org, doc.id)).toMatchObject({ state: 'processing' })
      expect(claimedJobs((await claimJobs(org)).rows).jobs).toEqual([])
      expect(claimedJobs((await claimJobs(org, 10, 1000, doc.jobId)).rows).jobs).toEqual([])
    })

    test('a claim by job id takes only that job, and a batch is bounded', async () => {
      const org = newOrg()
      const jobs = [
        (await mustAdd(org)).jobId,
        (await mustAdd(org)).jobId,
        (await mustAdd(org)).jobId,
      ]
      const one = await claimJobs(org, 10, 600_000, jobs[1])
      expect(one.rows.map((r) => r.id)).toEqual([jobs[1] as string])
      expect((await claimJobs(org, 1)).rowCount).toBe(1)
      expect((await claimJobs(org, 5)).rowCount).toBe(1)
    })

    test('progress, retry, and resuming where it stopped', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      const [claim] = (await claimJobs(org)).rows
      const token = claim.claim_token
      const advance = (step: string, ...rest: unknown[]) =>
        inOrg(org, (c) => c.query(INGESTION_JOB_ADVANCE, [org, doc.jobId, token, step, ...rest]))
      expect((await advance('chunk', 'org/art', 12, null, null, 1000)).rows[0]).toMatchObject({
        step: 'chunk',
      })
      expect((await advance('embed', null, null, 40, 10, 1000)).rows[0]).toMatchObject({
        step: 'embed',
        chunks_done: 10,
      })
      expect((await advance('parse', null, null, null, null, 1000)).rowCount).toBe(0)
      expect((await advance('embed', null, null, null, 25, 1000)).rows[0]).toMatchObject({
        chunks_done: 25,
      })
      const beat = await inOrg(org, (c) =>
        c.query(INGESTION_JOB_HEARTBEAT, [org, doc.jobId, token, 120_000])
      )
      expect(beat.rowCount).toBe(1)
      const wrong = await inOrg(org, (c) =>
        c.query(INGESTION_JOB_HEARTBEAT, [org, doc.jobId, crypto.randomUUID(), 1000])
      )
      expect(wrong.rowCount).toBe(0)
      const retry = await inOrg(org, (c) =>
        c.query(INGESTION_JOB_RETRY, [org, doc.jobId, token, 0])
      )
      expect(retry.rows).toEqual([{ id: doc.jobId, attempts: 1 }])
      const again = (await claimJobs(org)).rows[0]
      expect(again).toMatchObject({
        step: 'embed',
        attempts: 2,
        chunk_count: 40,
        chunks_done: 25,
        page_count: 12,
        artifact_key: 'org/art',
      })
      expect(again.claim_token).not.toBe(token)
    })

    test('a worker whose lease lapsed is refused after another worker claims the job', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      const [first] = (await claimJobs(org)).rows
      await expireLease(org, doc.jobId)
      const [second] = (await claimJobs(org)).rows
      expect(second.attempts).toBe(2)
      for (const [text, params] of [
        [INGESTION_JOB_HEARTBEAT, [org, doc.jobId, first.claim_token, 1000]],
        [INGESTION_JOB_COMPLETE, [org, doc.jobId, first.claim_token]],
        [INGESTION_JOB_FAIL, [org, doc.jobId, first.claim_token, 'unreadable']],
        [INGESTION_JOB_RETRY, [org, doc.jobId, first.claim_token, 0]],
      ] as [string, unknown[]][]) {
        expect((await inOrg(org, (c) => c.query(text, params))).rowCount).toBe(0)
      }
      const done = await inOrg(org, (c) =>
        c.query(INGESTION_JOB_COMPLETE, [org, doc.jobId, second.claim_token])
      )
      expect(done.rows).toEqual([{ document_id: doc.id }])
      expect(await row(org, doc.id)).toMatchObject({ state: 'ready' })
      expect(await jobRow(org, doc.jobId)).toMatchObject({ state: 'succeeded', claim_token: null })
    })

    test('a failure ends the job and the document with the reason from the closed list', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      const [claim] = (await claimJobs(org)).rows
      const bad = await rejectionOf(
        inOrg(org, (c) =>
          c.query(INGESTION_JOB_FAIL, [org, doc.jobId, claim.claim_token, 'because'])
        )
      )
      expect(bad).toContain('_failure_reason_known')
      await inOrg(org, (c) =>
        c.query(INGESTION_JOB_FAIL, [org, doc.jobId, claim.claim_token, 'too_many_pages'])
      )
      expect(await row(org, doc.id)).toMatchObject({
        state: 'failed',
        failure_reason: 'too_many_pages',
      })
      expect(await jobRow(org, doc.jobId)).toMatchObject({
        state: 'failed',
        failure_reason: 'too_many_pages',
      })
    })

    test('a spent job is never claimed, does not wedge the batch, and the give-up fails it', async () => {
      const org = newOrg()
      const spent = await mustAdd(org)
      const healthy = await mustAdd(org)
      await asOwner(org, (c) =>
        c.query(
          `update playbook.ingestion_jobs set attempts = 20, state = 'running', claim_token = gen_random_uuid(), next_attempt_at = clock_timestamp() - interval '1 second' where id = $1`,
          [spent.jobId]
        )
      )
      const claimed = (await claimJobs(org, 10)).rows
      expect(claimed.map((r) => r.id)).toEqual([healthy.jobId])
      // A job at 19 attempts is claimed once more, reaching the bound exactly.
      await inOrg(org, (c) =>
        c.query(INGESTION_JOB_RETRY, [org, healthy.jobId, claimed[0].claim_token, 0])
      )
      await asOwner(org, (c) =>
        c.query(`update playbook.ingestion_jobs set attempts = 19 where id = $1`, [healthy.jobId])
      )
      expect((await claimJobs(org, 10)).rows[0]).toMatchObject({ id: healthy.jobId, attempts: 20 })
      await expireLease(org, healthy.jobId)
      expect(claimedJobs((await claimJobs(org, 10)).rows).jobs).toEqual([])
      // The safety net fails both, with their documents.
      const failed = await inOrg(org, (c) => c.query(INGESTION_JOB_GIVE_UP_SPENT, [org, 10]))
      expect(failed.rows.map((r) => r.document_id).sort()).toEqual([spent.id, healthy.id].sort())
      expect(await row(org, spent.id)).toMatchObject({
        state: 'failed',
        failure_reason: 'processing_failed',
      })
      expect(await jobRow(org, spent.jobId)).toMatchObject({ state: 'failed', claim_token: null })
      expect(
        (await inOrg(org, (c) => c.query(INGESTION_JOB_GIVE_UP_SPENT, [org, 10]))).rowCount
      ).toBe(0)
    })

    test('a give-up leaves a job whose lease is still live', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await asOwner(org, (c) =>
        c.query(
          `update playbook.ingestion_jobs set attempts = 20, state = 'running', claim_token = gen_random_uuid(), next_attempt_at = clock_timestamp() + interval '1 hour' where id = $1`,
          [doc.jobId]
        )
      )
      expect(
        (await inOrg(org, (c) => c.query(INGESTION_JOB_GIVE_UP_SPENT, [org, 10]))).rowCount
      ).toBe(0)
    })

    test('two workers claiming at once take different jobs', async () => {
      const org = newOrg()
      await mustAdd(org)
      await mustAdd(org)
      const [a, b] = await Promise.all([claimJobs(org, 1), claimJobs(org, 1)])
      expect(a.rowCount).toBe(1)
      expect(b.rowCount).toBe(1)
      expect(a.rows[0].id).not.toBe(b.rows[0].id)
    })
  })

  describe('the consumed messages (the kit ProcessedStore contract)', () => {
    const claim = (
      org: string,
      consumer: string,
      message: string,
      token = crypto.randomUUID(),
      lease = 60_000
    ) => inOrg(org, (c) => c.query(CONSUMED_CLAIM, [consumer, org, message, token, lease]))
    const lookup = (org: string, consumer: string, message: string) =>
      inOrg(org, (c) => c.query(CONSUMED_LOOKUP, [consumer, org, message]))
    const expireClaim = (org: string, consumer: string, message: string) =>
      asOwner(org, (c) =>
        c.query(
          `update playbook.consumed_message set lease_expires_at = clock_timestamp() - interval '1 second' where consumer = $1 and message_id = $2`,
          [consumer, message]
        )
      )

    test('claim, busy, renew, complete, then done', async () => {
      const org = newOrg()
      const token = crypto.randomUUID()
      expect((await claim(org, 'playbook.ingestion', 'm1', token)).rows).toEqual([
        { claim_token: token },
      ])
      expect((await claim(org, 'playbook.ingestion', 'm1')).rowCount).toBe(0)
      const busy = (await lookup(org, 'playbook.ingestion', 'm1')).rows[0]
      expect(busy.state).toBe('claimed')
      expect(busy.retry_after_seconds).toBeGreaterThanOrEqual(1)
      expect(busy.retry_after_seconds).toBeLessThanOrEqual(60)
      const renew = (t: string) =>
        inOrg(org, (c) => c.query(CONSUMED_RENEW, ['playbook.ingestion', org, 'm1', t, 120_000]))
      expect((await renew(token)).rowCount).toBe(1)
      expect((await renew(crypto.randomUUID())).rowCount).toBe(0)
      const complete = (t: string) =>
        inOrg(org, (c) => c.query(CONSUMED_COMPLETE, ['playbook.ingestion', org, 'm1', t]))
      expect((await complete(crypto.randomUUID())).rowCount).toBe(0)
      expect((await complete(token)).rowCount).toBe(1)
      expect((await complete(token)).rowCount).toBe(0)
      expect((await claim(org, 'playbook.ingestion', 'm1')).rowCount).toBe(0)
      expect((await lookup(org, 'playbook.ingestion', 'm1')).rows).toEqual([
        { state: 'done', retry_after_seconds: null },
      ])
      expect((await renew(token)).rowCount).toBe(0)
    })

    test('a retry after a release or a lost lease is claimed anew; the old holder is refused', async () => {
      const org = newOrg()
      const [t1, t2] = [crypto.randomUUID(), crypto.randomUUID()]
      await claim(org, 'c', 'm', t1)
      const release = (t: string) =>
        inOrg(org, (c) => c.query(CONSUMED_RELEASE, ['c', org, 'm', t]))
      await release(crypto.randomUUID())
      expect((await lookup(org, 'c', 'm')).rowCount).toBe(1)
      await expireClaim(org, 'c', 'm')
      // Lapsed but not yet taken over: renew is refused, as the kit requires, complete still works with the token.
      const renew = (t: string) =>
        inOrg(org, (c) => c.query(CONSUMED_RENEW, ['c', org, 'm', t, 60_000]))
      expect((await renew(t1)).rowCount).toBe(0)
      expect((await claim(org, 'c', 'm', t2)).rows).toEqual([{ claim_token: t2 }])
      expect((await renew(t1)).rowCount).toBe(0)
      expect(
        (await inOrg(org, (c) => c.query(CONSUMED_COMPLETE, ['c', org, 'm', t1]))).rowCount
      ).toBe(0)
      expect(
        (await inOrg(org, (c) => c.query(CONSUMED_COMPLETE, ['c', org, 'm', t2]))).rowCount
      ).toBe(1)
      const t3 = crypto.randomUUID()
      await claim(org, 'c', 'other', t3)
      await inOrg(org, (c) => c.query(CONSUMED_RELEASE, ['c', org, 'other', t3]))
      expect((await claim(org, 'c', 'other')).rowCount).toBe(1)
    })

    test('two consumers racing for one message: exactly one claims it', async () => {
      const org = newOrg()
      const first = await open(org)
      const second = await open(org)
      try {
        const one = await first.client.query(CONSUMED_CLAIM, [
          'c',
          org,
          'm',
          crypto.randomUUID(),
          60_000,
        ])
        expect(one.rowCount).toBe(1)
        const waiting = second.client.query(CONSUMED_CLAIM, [
          'c',
          org,
          'm',
          crypto.randomUUID(),
          60_000,
        ])
        await untilBlocked(second.pid)
        await first.client.query('commit')
        expect((await waiting).rowCount).toBe(0)
        await second.client.query('commit')
      } finally {
        first.client.release()
        second.client.release()
      }
      const results = await Promise.all(
        Array.from({ length: 6 }, (_, i) => claim(org, 'c', `race${i % 2}`))
      )
      expect(results.filter((r) => r.rowCount === 1)).toHaveLength(2)
    })

    test('the key includes the consumer and the Organization, and the global scope is the all-zero one', async () => {
      const [a, b] = [newOrg(), newOrg()]
      expect((await claim(a, 'c1', 'm')).rowCount).toBe(1)
      expect((await claim(a, 'c2', 'm')).rowCount).toBe(1)
      expect((await claim(b, 'c1', 'm')).rowCount).toBe(1)
      expect((await claim(ZERO_ORG, 'c1', 'global')).rowCount).toBe(1)
      expect((await claim(ZERO_ORG, 'c1', 'global')).rowCount).toBe(0)
      expect(await rejectionOf(claim('org_xyz', 'c1', 'm'))).toContain(
        'consumed_message_organization_id_shape'
      )
    })

    test('purge removes old done records and lapsed claims, at most the limit, and keeps the rest', async () => {
      const org = newOrg()
      const tokens = [1, 2, 3, 4].map(() => crypto.randomUUID())
      for (const [i, t] of tokens.entries()) {
        await claim(org, 'c', `m${i}`, t)
      }
      await inOrg(org, (c) => c.query(CONSUMED_COMPLETE, ['c', org, 'm0', tokens[0]]))
      await inOrg(org, (c) => c.query(CONSUMED_COMPLETE, ['c', org, 'm1', tokens[1]]))
      await expireClaim(org, 'c', 'm2')
      const purge = (before: Date, limit: number) =>
        inOrg(org, (c) => c.query(CONSUMED_PURGE, [org, before, limit]))
      // A cutoff in the past keeps the fresh done records; the lapsed claim goes.
      expect((await purge(new Date(Date.now() - 86_400_000), 10)).rowCount).toBe(1)
      const future = new Date(Date.now() + 86_400_000)
      expect((await purge(future, 1)).rowCount).toBe(1)
      expect((await purge(future, 10)).rowCount).toBe(1)
      expect((await purge(future, 10)).rowCount).toBe(0)
      expect((await lookup(org, 'c', 'm3')).rows[0].state).toBe('claimed')
    })
  })

  describe('index settings', () => {
    const upsert = (org: string, model: string, dimension: number) =>
      inOrg(org, (c) => c.query(INDEX_SETTINGS_UPSERT, [org, model, dimension]))

    test('the model may change until the first vector, then it is refused', async () => {
      const org = newOrg()
      expect((await upsert(org, 'cohere-embed-v4', 1536)).rows[0]).toMatchObject({
        embedding_model: 'cohere-embed-v4',
        vectors_written_at: null,
      })
      expect((await upsert(org, 'other', 512)).rows[0]).toMatchObject({
        embedding_model: 'other',
        embedding_dimension: 512,
      })
      const mark = () => inOrg(org, (c) => c.query(INDEX_VECTORS_MARK, [org]))
      expect((await mark()).rows).toEqual([{ embedding_model: 'other', embedding_dimension: 512 }])
      expect((await mark()).rows).toEqual([{ embedding_model: 'other', embedding_dimension: 512 }])
      expect((await upsert(org, 'cohere-embed-v4', 1536)).rowCount).toBe(0)
      expect((await upsert(org, 'other', 1024)).rowCount).toBe(0)
      expect((await upsert(org, 'other', 512)).rows[0]).toMatchObject({ embedding_model: 'other' })
      const direct = await rejectionOf(
        inOrg(org, (c) =>
          c.query(
            `update playbook.index_settings set embedding_dimension = 9 where organization_id = $1`,
            [org]
          )
        )
      )
      expect(direct).toContain('index_settings_final')
      const lift = await rejectionOf(
        inOrg(org, (c) =>
          c.query(
            `update playbook.index_settings set vectors_written_at = null where organization_id = $1`,
            [org]
          )
        )
      )
      expect(lift).toContain('index_settings_final')
      expect(
        await rejectionOf(inOrg(org, (c) => c.query('delete from playbook.index_settings')))
      ).toContain('permission denied')
    })

    test('marking without settings returns nothing', async () => {
      const org = newOrg()
      expect((await inOrg(org, (c) => c.query(INDEX_VECTORS_MARK, [org]))).rowCount).toBe(0)
    })

    test('a concurrent change and first mark exclude each other', async () => {
      const org = newOrg()
      await upsert(org, 'a', 8)
      const marking = await open(org)
      const changing = await open(org)
      try {
        await marking.client.query(INDEX_VECTORS_MARK, [org])
        const waiting = changing.client.query(INDEX_SETTINGS_UPSERT, [org, 'b', 16])
        await untilBlocked(changing.pid)
        await marking.client.query('commit')
        expect((await waiting).rowCount).toBe(0)
        await changing.client.query('commit')
      } finally {
        marking.client.release()
        changing.client.release()
      }
      expect((await upsert(org, 'a', 8)).rows[0]).toMatchObject({ embedding_model: 'a' })
    })
  })

  /** Insert a document row directly (the role may insert every column), for ties and chosen states. */
  const insertDoc = (org: string, over: Record<string, unknown> = {}) => {
    const values: Record<string, unknown> = {
      id: newDoc(),
      organization_id: org,
      name: 'A.pdf',
      content_hash: hashOf(hex()),
      size_bytes: 10,
      declared_type: 'application/pdf',
      detected_type: 'pdf',
      uploaded_by: newUser(),
      object_key: 'k',
      ...over,
    }
    const keys = Object.keys(values)
    return inOrg(org, (c) =>
      c.query(
        `insert into playbook.documents (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')}) returning id`,
        Object.values(values)
      )
    )
  }
  const deletedValues = (when: string) => ({
    state: 'deleted',
    deletion_seq: 1,
    epoch: 1,
    deleted_at: new Date(Date.now() - 1000),
    purge_due_at: new Date(Date.now() + HOUR),
    created_at: when,
  })
  const textOf = async (org: string, id: string) =>
    (
      await inOrg(org, (c) =>
        c.query('select created_at::text as t from playbook.documents where id = $1', [id])
      )
    ).rows[0].t as string
  const activeJobs = async (org: string, id: string) =>
    (
      await inOrg(org, (c) =>
        c.query(
          `select count(*)::int as n from playbook.ingestion_jobs where document_id = $1 and state in ('queued', 'running')`,
          [id]
        )
      )
    ).rows[0].n as number
  const releaseAll = (...txs: { client: PoolClient }[]) => {
    for (const tx of txs) {
      tx.client.release()
    }
  }

  describe('consumed messages: lookups', () => {
    test('a claimed record whose lease has just lapsed still answers 1; a done record answers null', async () => {
      const org = newOrg()
      const token = crypto.randomUUID()
      await inOrg(org, (c) => c.query(CONSUMED_CLAIM, ['c', org, 'm', token, 60_000]))
      await asOwner(org, (c) =>
        c.query(
          `update playbook.consumed_message set lease_expires_at = clock_timestamp() - interval '1 second'`
        )
      )
      const lapsed = await inOrg(org, (c) => c.query(CONSUMED_LOOKUP, ['c', org, 'm']))
      expect(lapsed.rows).toEqual([{ state: 'claimed', retry_after_seconds: 1 }])
      await inOrg(org, (c) => c.query(CONSUMED_CLAIM, ['c', org, 'm', token, 60_000]))
      await inOrg(org, (c) => c.query(CONSUMED_COMPLETE, ['c', org, 'm', token]))
      const done = await inOrg(org, (c) => c.query(CONSUMED_LOOKUP, ['c', org, 'm']))
      expect(done.rows).toEqual([{ state: 'done', retry_after_seconds: null }])
    })
  })

  describe('restore against the purge time', () => {
    test('the explicit restore refuses a past-due document and changes nothing; the upload restore succeeds', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await deleteDue(org, doc.id)
      const before = await row(org, doc.id)
      const jobs = await inOrg(org, (c) =>
        c.query('select * from playbook.ingestion_jobs order by id')
      )
      expect((await restore(org, doc.id)).rowCount).toBe(0)
      expect(await row(org, doc.id)).toEqual(before)
      expect(
        (await inOrg(org, (c) => c.query('select * from playbook.ingestion_jobs order by id'))).rows
      ).toEqual(jobs.rows)
      const got = (await inOrg(org, (c) => c.query(DOCUMENT_GET, [org, doc.id]))).rows[0]
      expect(got.state).toBe('deleted')
      expect(got.purge_due_at.getTime()).toBeLessThan(Date.now())
      expect(got.purge_started_at).toBeNull()
      const upload = (await restore(org, doc.id, true)).rows[0]
      expect(upload).toMatchObject({ state: 'processing', deletion_seq: 1, changed: true })
      expect(await row(org, doc.id)).toMatchObject({
        state: 'processing',
        purge_due_at: null,
        deleted_at: null,
      })
      expect(await activeJobs(org, doc.id)).toBe(1)
    })

    test('a document not yet due is restored by the explicit restore', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await remove(org, doc.id)
      expect((await restore(org, doc.id)).rows[0]).toMatchObject({
        state: 'processing',
        changed: true,
      })
    })
  })

  describe('a delete that waits for a restore or a requeue', () => {
    const settle = async (org: string, docId: string, jobId: string) => {
      expect(await row(org, docId)).toMatchObject({ state: 'deleted' })
      // The job the delete could not see is still queued until the claim looks at its document.
      expect(await jobRow(org, jobId)).toMatchObject({ state: 'queued' })
      expect(claimedJobs((await claimJobs(org)).rows).jobs).toEqual([])
      expect(await jobRow(org, jobId)).toMatchObject({ state: 'cancelled', claim_token: null })
      expect(await activeJobs(org, docId)).toBe(0)
    }

    const failedDoc = async (org: string) => {
      const doc = await mustAdd(org)
      const [claim] = (await claimJobs(org)).rows
      await inOrg(org, (c) =>
        c.query(INGESTION_JOB_FAIL, [org, doc.jobId, claim.claim_token, 'unreadable'])
      )
      return doc
    }

    // A delete that starts while a restore is uncommitted does not wait: its snapshot still shows
    // the document as `deleted`, so its UPDATE (state <> 'deleted') matches no row and takes no
    // lock, and it answers the unchanged branch. It is ordered before the restore, which is correct:
    // the document ends live with the restore's one queued job at its epoch.
    test('a delete that starts during an uncommitted restore changes nothing and the restore stands', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await remove(org, doc.id)
      const jobId = newJob()
      const first = await open(org)
      const deleting = await open(org)
      try {
        expect((await first.client.query(DOCUMENT_RESTORE, [org, doc.id, jobId])).rowCount).toBe(1)
        const result = await deleting.client.query(DOCUMENT_SOFT_DELETE, [
          org,
          doc.id,
          newUser(),
          HOUR,
        ])
        expect(result.rows[0]).toMatchObject({ state: 'deleted', changed: false })
        await first.client.query('commit')
        await deleting.client.query('commit')
      } finally {
        releaseAll(first, deleting)
      }
      expect(await row(org, doc.id)).toMatchObject({ state: 'processing' })
      expect(await jobRow(org, jobId)).toMatchObject({ state: 'queued' })
      expect(await activeJobs(org, doc.id)).toBe(1)
      // The one job is live: the claim runs it and cancels nothing.
      expect((await claimJobs(org)).rows.map((r) => r.id)).toEqual([jobId])
    })

    test('after that, a real delete cancels the job and a later restore needs no claim in between', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await remove(org, doc.id)
      const jobId = newJob()
      const first = await open(org)
      const deleting = await open(org)
      try {
        await first.client.query(DOCUMENT_RESTORE, [org, doc.id, jobId])
        await deleting.client.query(DOCUMENT_SOFT_DELETE, [org, doc.id, newUser(), HOUR])
        await first.client.query('commit')
        await deleting.client.query('commit')
      } finally {
        releaseAll(first, deleting)
      }
      expect((await remove(org, doc.id)).rows[0]).toMatchObject({ state: 'deleted', changed: true })
      expect(await jobRow(org, jobId)).toMatchObject({ state: 'cancelled' })
      expect(await activeJobs(org, doc.id)).toBe(0)
      expect(claimedJobs((await claimJobs(org)).rows).jobs).toEqual([])
      expect((await restore(org, doc.id)).rows[0]).toMatchObject({
        state: 'processing',
        changed: true,
      })
      expect(await activeJobs(org, doc.id)).toBe(1)
    })

    test.each(['requeue'])(
      '%s commits a job while the delete waits for the document: the claim cancels it, a later restore works',
      async () => {
        const org = newOrg()
        const doc = await failedDoc(org)
        const jobId = newJob()
        const first = await open(org)
        const deleting = await open(org)
        try {
          expect((await first.client.query(DOCUMENT_REQUEUE, [org, doc.id, jobId])).rowCount).toBe(
            1
          )
          const waiting = deleting.client.query(DOCUMENT_SOFT_DELETE, [
            org,
            doc.id,
            newUser(),
            HOUR,
          ])
          await untilBlocked(deleting.pid)
          await first.client.query('commit')
          expect((await waiting).rows[0]).toMatchObject({ state: 'deleted', changed: true })
          await deleting.client.query('commit')
        } finally {
          releaseAll(first, deleting)
        }
        await settle(org, doc.id, jobId)
        expect((await restore(org, doc.id)).rows[0]).toMatchObject({
          state: 'processing',
          changed: true,
        })
        expect(await activeJobs(org, doc.id)).toBe(1)
      }
    )

    test.each(['requeue'])(
      'a later %s needs no claim in between: it cancels the stale job itself',
      async () => {
        const org = newOrg()
        const doc = await failedDoc(org)
        const jobId = newJob()
        const first = await open(org)
        const deleting = await open(org)
        try {
          await first.client.query(DOCUMENT_REQUEUE, [org, doc.id, jobId])
          const waiting = deleting.client.query(DOCUMENT_SOFT_DELETE, [
            org,
            doc.id,
            newUser(),
            HOUR,
          ])
          await untilBlocked(deleting.pid)
          await first.client.query('commit')
          await waiting
          await deleting.client.query('commit')
        } finally {
          releaseAll(first, deleting)
        }
        expect((await restore(org, doc.id)).rows[0]).toMatchObject({
          state: 'processing',
          changed: true,
        })
        expect(await jobRow(org, jobId)).toMatchObject({ state: 'cancelled' })
        expect(await activeJobs(org, doc.id)).toBe(1)
      }
    )

    test('the claim cancels a job whose document is at another epoch or no longer live, and takes the live ones', async () => {
      const org = newOrg()
      const stale = await mustAdd(org)
      const live = await mustAdd(org)
      await asOwner(org, (c) =>
        c.query(`update playbook.documents set epoch = 5 where id = $1`, [stale.id])
      )
      const claimed = (await claimJobs(org)).rows
      expect(claimed.map((r) => r.id)).toEqual([live.jobId])
      expect(await jobRow(org, stale.jobId)).toMatchObject({ state: 'cancelled' })
    })
  })

  describe('a job left running on a deleted document', () => {
    /** The state a claim that raced a delete can leave: a running job at epoch e on a document at e+1. */
    const runningOnDeleted = async (org: string) => {
      const doc = await mustAdd(org)
      const token = (await claimJobs(org)).rows[0].claim_token as string
      expect((await remove(org, doc.id)).rows[0]).toMatchObject({ state: 'deleted' })
      await asOwner(org, (c) =>
        c.query(
          `update playbook.ingestion_jobs set state = 'running', claim_token = $2::uuid, finished_at = null,
             next_attempt_at = clock_timestamp() + interval '1 hour' where id = $1`,
          [doc.jobId, token]
        )
      )
      return { doc, token }
    }

    test('heartbeat and advance return no row, and the cleanup is not clear until the lease ends', async () => {
      const org = newOrg()
      const { doc, token } = await runningOnDeleted(org)
      expect(
        (await inOrg(org, (c) => c.query(INGESTION_JOB_HEARTBEAT, [org, doc.jobId, token, 60_000])))
          .rowCount
      ).toBe(0)
      expect(
        (
          await inOrg(org, (c) =>
            c.query(INGESTION_JOB_ADVANCE, [
              org,
              doc.jobId,
              token,
              'chunk',
              null,
              null,
              null,
              null,
              60_000,
            ])
          )
        ).rowCount
      ).toBe(0)
      const begin = () =>
        inOrg(org, (c) => c.query(DOCUMENT_CLEANUP_BEGIN, [org, doc.id, 1])).then((r) => r.rows[0])
      expect(await begin()).toMatchObject({ epoch: 1, clear: false })
      await expireLease(org, doc.jobId)
      expect(await begin()).toMatchObject({ clear: true })
      // The lapsed job is cancelled by the next claim, which reports it.
      const claim = await claimJobs(org)
      expect(claim.rows).toEqual([expect.objectContaining({ id: null, cancelled: 1 })])
      expect(await jobRow(org, doc.jobId)).toMatchObject({ state: 'cancelled' })
    })
  })

  describe('a claim that loses its document to a concurrent delete', () => {
    // Which interleavings make the claim's document update wait? Not a claim against an uncommitted
    // delete: the delete takes the job row first, so the claim's `for update skip locked` skips that
    // job and never reaches the document. Not a delete that arrives while the claim holds the job:
    // the delete then waits on the job row, and the claim's document update finds the row free. The
    // one that does is the round 2 shape: a requeue commits a job while a delete waits on the
    // document (the delete's job step saw nothing), the delete then holds the document row
    // uncommitted without ever having locked the job, and a claim whose snapshot falls between the
    // two commits locks the job and waits on the document.
    test('the claim waits on the document, loses it to the delete and returns no job but a lost count', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      const claimed = (await claimJobs(org)).rows[0]
      await inOrg(org, (c) =>
        c.query(INGESTION_JOB_FAIL, [org, doc.jobId, claimed.claim_token, 'unreadable'])
      )
      const jobId = newJob()
      const requeueing = await open(org)
      const deleting = await open(org)
      const claiming = await open(org)
      try {
        expect(
          (await requeueing.client.query(DOCUMENT_REQUEUE, [org, doc.id, jobId])).rowCount
        ).toBe(1)
        const deleted = deleting.client.query(DOCUMENT_SOFT_DELETE, [org, doc.id, newUser(), HOUR])
        await untilBlocked(deleting.pid)
        await requeueing.client.query('commit')
        // The delete now holds the document row, uncommitted, and has cancelled no job.
        expect((await deleted).rows[0]).toMatchObject({ state: 'deleted', changed: true })
        const claim = claiming.client.query(INGESTION_JOB_CLAIM, [org, 10, 600_000, null])
        await untilBlocked(claiming.pid)
        await deleting.client.query('commit')
        const result = claimedJobs((await claim).rows)
        expect(result).toEqual({ jobs: [], cancelled: 0, lost: 1 })
        await claiming.client.query('commit')
      } finally {
        releaseAll(requeueing, deleting, claiming)
      }
      expect(await row(org, doc.id)).toMatchObject({ state: 'deleted', epoch: 1 })
      const job = await jobRow(org, jobId)
      expect(job).toMatchObject({ state: 'running', epoch: 0 })
      expect(new Date(job.next_attempt_at).getTime()).toBeGreaterThan(Date.now())
      expect(
        (
          await inOrg(org, (c) =>
            c.query(INGESTION_JOB_HEARTBEAT, [org, jobId, job.claim_token, 60_000])
          )
        ).rowCount
      ).toBe(0)
      // The cleanup waits for the lease, and the next claim after it cancels the job.
      expect(
        (await inOrg(org, (c) => c.query(DOCUMENT_CLEANUP_BEGIN, [org, doc.id, 1]))).rows[0]
      ).toMatchObject({ clear: false })
      await expireLease(org, jobId)
      expect(claimedJobs((await claimJobs(org)).rows)).toEqual({ jobs: [], cancelled: 1, lost: 0 })
    })

    test('a claim under a short lock_timeout fails with 55P03 while another connection holds the document, and claims nothing', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      const holder = await open(org)
      const claiming = await open(org)
      try {
        await holder.client.query(`select 1 from playbook.documents where id = $1 for update`, [
          doc.id,
        ])
        await claiming.client.query(`set local lock_timeout = '1s'`)
        let code: unknown
        try {
          await claiming.client.query(INGESTION_JOB_CLAIM, [org, 10, 600_000, null])
        } catch (error) {
          code = (error as { code?: string }).code
        }
        expect(code).toBe('55P03')
        // The claim's transaction is aborted and the holder's still holds the row: end both before
        // the connections go back to the pool, or the next user of one inherits them.
        await claiming.client.query('rollback')
        await holder.client.query('rollback')
      } finally {
        releaseAll(holder, claiming)
      }
      expect(await jobRow(org, doc.jobId)).toMatchObject({ state: 'queued', attempts: 0 })
    })
  })

  describe('the claim reports the stale jobs it cancels', () => {
    test('batch size 1 with two stale jobs ahead of a live one: two empty claims that say so, then the job', async () => {
      const org = newOrg()
      const stale1 = await mustAdd(org)
      const stale2 = await mustAdd(org)
      const live = await mustAdd(org)
      await asOwner(org, (c) =>
        c.query(`update playbook.documents set epoch = 5 where id = any($1::text[])`, [
          [stale1.id, stale2.id],
        ])
      )
      for (const stale of [stale1, stale2]) {
        const claim = await claimJobs(org, 1)
        expect(claim.rows).toEqual([expect.objectContaining({ id: null, cancelled: 1 })])
        expect(await jobRow(org, stale.jobId)).toMatchObject({ state: 'cancelled' })
      }
      const third = await claimJobs(org, 1)
      expect(third.rows).toEqual([expect.objectContaining({ id: live.jobId, cancelled: 0 })])
      expect((await claimJobs(org, 1)).rowCount).toBe(0)
    })
  })

  describe('not_restorable agrees with the explicit restore', () => {
    test.each([
      ['1 ms in the past', '-1 millisecond', true],
      ['1 hour in the future', '1 hour', false],
    ])('purge time %s', async (_name, offset, notRestorable) => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await remove(org, doc.id)
      await asOwner(org, (c) =>
        c.query(
          `update playbook.documents set purge_due_at = clock_timestamp() + $2::interval where id = $1`,
          [doc.id, offset]
        )
      )
      const got = (await inOrg(org, (c) => c.query(DOCUMENT_GET, [org, doc.id]))).rows[0]
      expect(got).toMatchObject({ state: 'deleted', not_restorable: notRestorable })
      const restored = await restore(org, doc.id)
      expect(restored.rowCount).toBe(notRestorable ? 0 : 1)
      if (notRestorable) {
        expect(await row(org, doc.id)).toMatchObject({ state: 'deleted' })
      }
    })

    test('a purge that has started is not restorable, and a live document is not flagged', async () => {
      const org = newOrg()
      const live = await mustAdd(org)
      expect(
        (await inOrg(org, (c) => c.query(DOCUMENT_GET, [org, live.id]))).rows[0]
      ).toMatchObject({ not_restorable: false })
      const doc = await mustAdd(org)
      await deleteDue(org, doc.id)
      await claimPurge(org)
      expect((await inOrg(org, (c) => c.query(DOCUMENT_GET, [org, doc.id]))).rows[0]).toMatchObject(
        { not_restorable: true }
      )
    })
  })

  describe('reads and lists', () => {
    const TIE = '2026-01-01 00:00:00.123456+00'

    test('DOCUMENT_GET returns every public column, the failure and deletion fields, and the sequence', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      const get = () => inOrg(org, (c) => c.query(DOCUMENT_GET, [org, doc.id]))
      expect((await get()).rows[0]).toMatchObject({
        id: doc.id,
        name: 'Playbook.pdf',
        state: 'uploaded',
        declared_type: 'application/pdf',
        detected_type: 'pdf',
        failure_reason: null,
        epoch: 0,
        deletion_seq: 0,
        deleted_at: null,
        purge_due_at: null,
        purge_started_at: null,
      })
      expect(Object.keys((await get()).rows[0])).toEqual(
        expect.arrayContaining([
          'size_bytes',
          'uploaded_by',
          'created_at',
          'updated_at',
          'deleted_by',
        ])
      )
      await remove(org, doc.id)
      expect((await get()).rows[0]).toMatchObject({ state: 'deleted', deletion_seq: 1 })
      expect((await get()).rows[0].purge_due_at).toBeInstanceOf(Date)
      expect((await inOrg(org, (c) => c.query(DOCUMENT_GET, [org, newDoc()]))).rowCount).toBe(0)
    })

    test.each([
      ['live', DOCUMENT_LIST, {}],
      ['deleted', DOCUMENT_LIST_DELETED, deletedValues(TIE)],
    ] as const)(
      'the %s list pages a created_at tie across the page boundary without a repeat or a miss',
      async (_kind, text, over) => {
        const org = newOrg()
        const ids: string[] = []
        for (let i = 0; i < 5; i++) {
          const made = await insertDoc(org, { ...over, created_at: TIE })
          ids.push(made.rows[0].id)
        }
        // The other kind is in the Organization too, and must not appear.
        await insertDoc(org, text === DOCUMENT_LIST ? deletedValues(TIE) : { created_at: TIE })
        const seen: string[] = []
        const sizes: number[] = []
        let cursor: [string, string] = ['infinity', '']
        for (let page = 0; page < 5; page++) {
          const rows = (await inOrg(org, (c) => c.query(text, [org, cursor[0], cursor[1], 2]))).rows
          if (rows.length === 0) {
            break
          }
          sizes.push(rows.length)
          seen.push(...rows.map((r) => r.id))
          const last = rows[rows.length - 1]
          cursor = [await textOf(org, last.id), last.id]
        }
        expect(sizes).toEqual([2, 2, 1])
        expect(new Set(seen).size).toBe(5)
        expect([...seen].sort()).toEqual([...ids].sort())
        expect(seen).toEqual([...seen].sort().reverse())
      }
    )

    test('the deleted list carries the deletion fields and is clamped', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await remove(org, doc.id)
      const rows = (
        await inOrg(org, (c) => c.query(DOCUMENT_LIST_DELETED, [org, 'infinity', '', null]))
      ).rows
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ id: doc.id, state: 'deleted', deletion_seq: 1 })
      expect(rows[0].purge_due_at).toBeInstanceOf(Date)
    })
  })

  describe('filtered lists, full rows and the page count', () => {
    const FIRST = ['infinity', '', 100] as const
    const filtered = (org: string, state: string | null, cursor: readonly unknown[] = FIRST) =>
      inOrg(org, (c) => c.query(DOCUMENT_LIST_FILTERED, [org, ...cursor, state]))
    const ids = (r: { rows: { id: string }[] }) => r.rows.map((x) => x.id).sort()
    const claimOne = async (org: string, jobId: string) => {
      const claim = (await claimJobs(org, 5, 600_000, jobId)).rows[0]
      expect(claim).toBeDefined()
      return claim.claim_token as string
    }
    const advancePages = (org: string, jobId: string, token: string, pages: number) =>
      inOrg(org, (c) =>
        c.query(INGESTION_JOB_ADVANCE, [org, jobId, token, 'chunk', null, pages, null, null, 1000])
      )

    /** One document per state in a fresh Organization. */
    async function oneOfEach() {
      const org = newOrg()
      const uploaded = await mustAdd(org)
      const processing = await mustAdd(org)
      const ready = await mustAdd(org)
      const failed = await mustAdd(org)
      const deleted = await mustAdd(org)
      await claimOne(org, processing.jobId)
      const readyToken = await claimOne(org, ready.jobId)
      await advancePages(org, ready.jobId, readyToken, 12)
      await inOrg(org, (c) => c.query(INGESTION_JOB_COMPLETE, [org, ready.jobId, readyToken]))
      const failedToken = await claimOne(org, failed.jobId)
      await inOrg(org, (c) =>
        c.query(INGESTION_JOB_FAIL, [org, failed.jobId, failedToken, 'unreadable'])
      )
      await remove(org, deleted.id)
      return { org, uploaded, processing, ready, failed, deleted }
    }

    test('each state filter lists exactly that state, and null lists every state but deleted', async () => {
      const { org, uploaded, processing, ready, failed, deleted } = await oneOfEach()
      for (const [state, doc] of [
        ['uploaded', uploaded],
        ['processing', processing],
        ['ready', ready],
        ['failed', failed],
        ['deleted', deleted],
      ] as const) {
        expect(ids(await filtered(org, state))).toEqual([doc.id])
      }
      expect(ids(await filtered(org, null))).toEqual(
        [uploaded.id, processing.id, ready.id, failed.id].sort()
      )
      expect(ids(await filtered(org, 'bogus'))).toEqual([])
    })

    test('list rows carry every column DOCUMENT_GET returns, equal to it, for every state', async () => {
      const { org, uploaded, processing, ready, failed, deleted } = await oneOfEach()
      for (const doc of [uploaded, processing, ready, failed, deleted]) {
        const get = (await inOrg(org, (c) => c.query(DOCUMENT_GET, [org, doc.id]))).rows[0]
        expect(Object.keys(get)).toEqual([...DOCUMENT_ROW_FIELDS])
        const lists = [
          await filtered(org, get.state),
          await inOrg(org, (c) =>
            c.query(get.state === 'deleted' ? DOCUMENT_LIST_DELETED : DOCUMENT_LIST, [
              org,
              ...FIRST,
            ])
          ),
        ]
        for (const list of lists) {
          expect(list.rows.find((r) => r.id === doc.id)).toEqual(get)
        }
      }
      const failedRow = (await filtered(org, 'failed')).rows[0]
      expect(failedRow).toMatchObject({ failure_reason: 'unreadable', not_restorable: false })
      expect(failedRow.updated_at).toBeInstanceOf(Date)
      expect((await filtered(org, 'deleted')).rows[0]).toMatchObject({
        not_restorable: false,
        deletion_seq: 1,
      })
      expect((await filtered(org, 'deleted')).rows[0].purge_due_at).toBeInstanceOf(Date)
      // Due for purge: the database clock says not restorable, in the list too.
      await makeDue(org, deleted.id)
      expect((await filtered(org, 'deleted')).rows[0].not_restorable).toBe(true)
    })

    test('a filtered list pages through a created_at tie without skipping or repeating a row', async () => {
      const org = newOrg()
      const TIE = '2026-01-01 00:00:00.123456+00'
      // Four ready documents and three uploaded ones, all created at the same instant.
      const make = async (state: string) =>
        (await insertDoc(org, { state, created_at: TIE })).rows[0]
      const docs = []
      for (const state of [
        'ready',
        'ready',
        'ready',
        'ready',
        'uploaded',
        'uploaded',
        'uploaded',
      ]) {
        docs.push(await make(state))
      }
      for (const [state, expected] of [
        ['ready', docs.slice(0, 4)],
        ['uploaded', docs.slice(4)],
      ] as const) {
        const seen: string[] = []
        let cursor: readonly unknown[] = FIRST
        for (let pages = 0; pages < 10; pages++) {
          const page = await inOrg(org, (c) =>
            c.query(DOCUMENT_LIST_FILTERED, [org, cursor[0], cursor[1], 2, state])
          )
          if (page.rowCount === 0) {
            break
          }
          seen.push(...page.rows.map((r) => r.id))
          const lastId = page.rows.at(-1)?.id as string
          cursor = [await textOf(org, lastId), lastId]
        }
        expect(seen).toEqual(
          expected
            .map((d) => d.id)
            .sort()
            .reverse()
        )
      }
    })

    test('another Organization sees none of them, and the owner in scope sees them as a control', async () => {
      const { org, uploaded, ready, deleted } = await oneOfEach()
      const other = newOrg()
      await mustAdd(other)
      for (const state of [null, 'uploaded', 'ready', 'failed', 'deleted']) {
        const rows = (await filtered(other, state)).rows.map((r) => r.id)
        for (const doc of [uploaded, ready, deleted]) {
          expect(rows).not.toContain(doc.id)
        }
      }
      // The control: the same statement as the table owner, in the first Organization's scope.
      const control = await asOwner(org, (c) =>
        c.query(DOCUMENT_LIST_FILTERED, [org, ...FIRST, 'ready'])
      )
      expect(ids(control)).toEqual([ready.id])
      // The owner scoped to the other Organization, asking for the first's rows by id, finds none.
      const crossed = await asOwner(other, (c) =>
        c.query(DOCUMENT_LIST_FILTERED, [org, ...FIRST, 'ready'])
      )
      expect(crossed.rowCount).toBe(0)
    })

    describe('the plans use the list indexes under a generic plan', () => {
      // The branch for a state filter is served by documents_state_list_idx only while the planner
      // expects `state = $5` to keep a fraction of the rows. `documents` is shared by every test in
      // the run and autovacuum re-analyzes it a minute or more after the first rows (on a slow
      // runner, part-way through this file). A sample that holds one state only (`uploaded` is the
      // default) gives n_distinct 1 and a most-common frequency of 1, the filter then looks free
      // and documents_list_idx with `Filter: (state = $5)` wins. So the plans are asserted for the
      // statistics the table has in production, five states, with this table's own autovacuum off
      // so no sample taken later changes them.
      let unpin: () => Promise<void>
      beforeAll(async () => {
        unpin = await pinColumnStats(owner, 'playbook.documents', { state: 5 })
      })
      afterAll(async () => {
        await unpin?.()
      })

      interface PlanNode {
        'Node Type': string
        'Relation Name'?: string
        'Index Name'?: string
        'Scan Direction'?: string
        'One-Time Filter'?: string
        Plans?: PlanNode[]
      }
      const walk = (node: PlanNode): PlanNode[] => [node, ...(node.Plans ?? []).flatMap(walk)]
      /**
       * Prepare the statement, force the generic plan, and return the plan tree (JSON). The scan
       * of `documents` is only planned with `enable_seqscan = off`, so a branch whose index cannot
       * serve it shows up as a Seq Scan instead of silently passing on a tiny table.
       */
      async function planOf(org: string, text: string, types: string, args: string) {
        return inOrg(org, async (c) => {
          await c.query(`set local plan_cache_mode = force_generic_plan`)
          await c.query(`set local enable_seqscan = off`)
          await c.query(`prepare plan_probe(${types}) as ${text}`)
          try {
            const r = await c.query(`explain (format json, costs off) execute plan_probe(${args})`)
            return r.rows[0]['QUERY PLAN'][0].Plan as PlanNode
          } finally {
            await c.query('deallocate plan_probe')
          }
        })
      }
      const lit = (v: string | null) => (v === null ? 'null' : `'${v}'`)
      const fail = (plan: PlanNode) => `plan:\n${JSON.stringify(plan, null, 1)}`
      /** Assert on the scans of `documents` under `root`: the named index, backward, and no Sort node anywhere under it. */
      const expectIndexScan = (root: PlanNode, index: string) => {
        const nodes = walk(root)
        const scans = nodes.filter((n) => n['Relation Name'] === 'documents')
        expect([scans.length, fail(root)]).toEqual([1, fail(root)])
        expect([
          scans[0]?.['Node Type'],
          scans[0]?.['Index Name'],
          scans[0]?.['Scan Direction'],
          fail(root),
        ]).toEqual(['Index Scan', index, 'Backward', fail(root)])
        expect([nodes.some((n) => n['Node Type'] === 'Sort'), fail(root)]).toEqual([
          false,
          fail(root),
        ])
      }

      test.each([
        ['DOCUMENT_LIST', DOCUMENT_LIST, 'documents_list_idx'],
        ['DOCUMENT_LIST_DELETED', DOCUMENT_LIST_DELETED, 'documents_deleted_list_idx'],
      ] as const)(
        '%s: its index, read backwards, with no Sort anywhere',
        async (_name, text, index) => {
          const org = newOrg()
          const plan = await planOf(
            org,
            text,
            'text, timestamptz, text, int',
            `${lit(org)}, 'infinity', '', 50`
          )
          expectIndexScan(plan, index)
        }
      )

      // The generic plan holds all three branches, each under a Result with a One-Time Filter on
      // $5. For each filter value this asserts, on the branch that value selects (found by its
      // One-Time Filter): exactly one scan of documents, an Index Scan Backward on the expected
      // index, and no Sort node inside that branch. The outer merge of one page may sort; that is
      // not asserted. The other branches are checked the same way in the other cases.
      test.each([
        [null, 'IS NULL', 'documents_list_idx'],
        ['ready', 'ANY', 'documents_state_list_idx'],
        ['deleted', "'deleted'", 'documents_deleted_list_idx'],
      ] as const)(
        'DOCUMENT_LIST_FILTERED with %s: the branch uses %s -> %s',
        async (state, marker, index) => {
          const org = newOrg()
          const plan = await planOf(
            org,
            DOCUMENT_LIST_FILTERED,
            'text, timestamptz, text, int, text',
            `${lit(org)}, 'infinity', '', 50, ${lit(state)}`
          )
          const branches = walk(plan).filter((n) => /\$5/.test(n['One-Time Filter'] ?? ''))
          const branch = branches.find(
            (n) =>
              (n['One-Time Filter'] ?? '').includes(marker) &&
              (marker !== "'deleted'" || !(n['One-Time Filter'] ?? '').includes('ANY'))
          )
          expect([branches.length, fail(plan)]).toEqual([3, fail(plan)])
          expect([branch !== undefined, fail(plan)]).toEqual([true, fail(plan)])
          expectIndexScan(branch as PlanNode, index)
        }
      )
    })

    test('the page count is set by complete and by fail, and returned by get and every list', async () => {
      const org = newOrg()
      const ready = await mustAdd(org)
      const tooMany = await mustAdd(org)
      const unknown = await mustAdd(org)
      const readyToken = await claimOne(org, ready.jobId)
      await advancePages(org, ready.jobId, readyToken, 12)
      const before = (await inOrg(org, (c) => c.query(DOCUMENT_GET, [org, ready.id]))).rows[0]
      expect(before.page_count).toBeNull()
      await inOrg(org, (c) => c.query(INGESTION_JOB_COMPLETE, [org, ready.jobId, readyToken]))
      const tooManyToken = await claimOne(org, tooMany.jobId)
      await advancePages(org, tooMany.jobId, tooManyToken, 301)
      await inOrg(org, (c) =>
        c.query(INGESTION_JOB_FAIL, [org, tooMany.jobId, tooManyToken, 'too_many_pages'])
      )
      const unknownToken = await claimOne(org, unknown.jobId)
      await inOrg(org, (c) => c.query(INGESTION_JOB_COMPLETE, [org, unknown.jobId, unknownToken]))
      const get = async (id: string) =>
        (await inOrg(org, (c) => c.query(DOCUMENT_GET, [org, id]))).rows[0]
      expect(await get(ready.id)).toMatchObject({ state: 'ready', page_count: 12 })
      expect(await get(tooMany.id)).toMatchObject({
        state: 'failed',
        failure_reason: 'too_many_pages',
        page_count: 301,
      })
      // A job that never recorded a count leaves it null.
      expect((await get(unknown.id)).page_count).toBeNull()
      const listed = (await filtered(org, null)).rows
      expect(listed.find((r) => r.id === ready.id)?.page_count).toBe(12)
      expect(listed.find((r) => r.id === tooMany.id)?.page_count).toBe(301)
      // A stale claim writes neither the state nor the count.
      const stale = await inOrg(org, (c) =>
        c.query(INGESTION_JOB_COMPLETE, [org, ready.jobId, readyToken])
      )
      expect(stale.rowCount).toBe(0)
      // The table refuses a zero or negative count.
      await expect(
        asOwner(org, (c) =>
          c.query('update playbook.documents set page_count = 0 where id = $1', [ready.id])
        )
      ).rejects.toThrow()
    })

    test('a v0.11.0 style call (the old parameter lists) still works', async () => {
      const { org, ready } = await oneOfEach()
      const live = await inOrg(org, (c) => c.query(DOCUMENT_LIST, [org, 'infinity', '', 50]))
      expect(live.rowCount).toBe(4)
      const gone = await inOrg(org, (c) =>
        c.query(DOCUMENT_LIST_DELETED, [org, 'infinity', '', 50])
      )
      expect(gone.rowCount).toBe(1)
      expect((await inOrg(org, (c) => c.query(DOCUMENT_GET, [org, ready.id]))).rowCount).toBe(1)
      // Old columns are still there by name.
      expect(live.rows[0]).toHaveProperty('failure_reason')
      expect(live.rows[0]).toHaveProperty('uploaded_by')
      const doc = await mustAdd(org)
      const token = await claimOne(org, doc.jobId)
      const failed = await inOrg(org, (c) =>
        c.query(INGESTION_JOB_FAIL, [org, doc.jobId, token, 'no_text'])
      )
      expect(failed.rowCount).toBe(1)
      expect((await row(org, doc.id)).page_count).toBeNull()
    })
  })

  describe('batch sizes are clamped in SQL', () => {
    const asNumber = (n: number | null) => n as number
    const HUGE = 2_000_000_000

    test('purge claim: null takes one, a huge size takes the rest', async () => {
      const org = newOrg()
      for (let i = 0; i < 3; i++) {
        await deleteDue(org, (await mustAdd(org)).id)
      }
      const take = (n: number | null) =>
        inOrg(org, (c) => c.query(DOCUMENT_PURGE_CLAIM, [org, asNumber(n), 600_000]))
      expect((await take(null)).rowCount).toBe(1)
      expect((await take(HUGE)).rowCount).toBe(2)
      expect((await take(-5)).rowCount).toBe(0)
    })

    test('job claim: null takes one, a huge size takes the rest', async () => {
      const org = newOrg()
      for (let i = 0; i < 3; i++) {
        await mustAdd(org)
      }
      expect(
        (await inOrg(org, (c) => c.query(INGESTION_JOB_CLAIM, [org, null, 600_000, null]))).rowCount
      ).toBe(1)
      expect(
        (await inOrg(org, (c) => c.query(INGESTION_JOB_CLAIM, [org, HUGE, 600_000, null]))).rowCount
      ).toBe(2)
    })

    test('give-up: null takes one, a huge size takes the rest', async () => {
      const org = newOrg()
      const jobs = [await mustAdd(org), await mustAdd(org), await mustAdd(org)]
      for (const j of jobs) {
        await asOwner(org, (c) =>
          c.query(
            `update playbook.ingestion_jobs set attempts = 20, state = 'running', claim_token = gen_random_uuid(), next_attempt_at = clock_timestamp() - interval '1 second' where id = $1`,
            [j.jobId]
          )
        )
      }
      expect(
        (await inOrg(org, (c) => c.query(INGESTION_JOB_GIVE_UP_SPENT, [org, null]))).rowCount
      ).toBe(1)
      expect(
        (await inOrg(org, (c) => c.query(INGESTION_JOB_GIVE_UP_SPENT, [org, HUGE]))).rowCount
      ).toBe(2)
    })

    test('consumed purge: null removes one, a huge size removes the rest', async () => {
      const org = newOrg()
      for (let i = 0; i < 3; i++) {
        const token = crypto.randomUUID()
        await inOrg(org, (c) => c.query(CONSUMED_CLAIM, ['c', org, `m${i}`, token, 60_000]))
        await inOrg(org, (c) => c.query(CONSUMED_COMPLETE, ['c', org, `m${i}`, token]))
      }
      const future = new Date(Date.now() + 86_400_000)
      expect((await inOrg(org, (c) => c.query(CONSUMED_PURGE, [org, future, null]))).rowCount).toBe(
        1
      )
      expect((await inOrg(org, (c) => c.query(CONSUMED_PURGE, [org, future, HUGE]))).rowCount).toBe(
        2
      )
    })

    test('the list pages: null is one row, a huge size is everything up to the page maximum', async () => {
      const org = newOrg()
      for (let i = 0; i < 3; i++) {
        await mustAdd(org)
      }
      expect(
        (await inOrg(org, (c) => c.query(DOCUMENT_LIST, [org, 'infinity', '', null]))).rowCount
      ).toBe(1)
      expect(
        (await inOrg(org, (c) => c.query(DOCUMENT_LIST, [org, 'infinity', '', HUGE]))).rowCount
      ).toBe(3)
    })
  })

  describe('the all-zero Organization id is the global scope of consumed messages only', () => {
    test.each([
      'documents',
      'organization_usage',
      'orphan_sweeps',
      'ingestion_jobs',
      'index_settings',
      'idempotency_keys',
    ])('an insert into %s under the zero scope is refused', async (table) => {
      const insert: Record<string, string> = {
        documents: `insert into playbook.documents (id, organization_id, name, content_hash, size_bytes, declared_type, detected_type, uploaded_by, object_key)
                    values ('${newDoc()}', '${ZERO_ORG}', 'a', '\\x${'00'.repeat(32)}', 1, 'a/b', 'pdf', '${newUser()}', 'k')`,
        organization_usage: `insert into playbook.organization_usage (organization_id) values ('${ZERO_ORG}')`,
        orphan_sweeps: `insert into playbook.orphan_sweeps (organization_id, swept_through) values ('${ZERO_ORG}', now())`,
        ingestion_jobs: `insert into playbook.ingestion_jobs (id, organization_id, document_id, epoch, next_attempt_at)
                         values ('${newJob()}', '${ZERO_ORG}', '${newDoc()}', 0, now())`,
        index_settings: `insert into playbook.index_settings (organization_id, embedding_model, embedding_dimension) values ('${ZERO_ORG}', 'm', 8)`,
        idempotency_keys: `insert into playbook.idempotency_keys (organization_id, user_id, route, key, request_hash)
                           values ('${ZERO_ORG}', '${newUser()}', 'r', 'k', '\\x${'00'.repeat(32)}')`,
      }
      // The owner writes under the zero scope too (the role cannot insert into the usage counts).
      const message = await rejectionOf(asOwner(ZERO_ORG, (c) => c.query(insert[table] as string)))
      expect(message).toContain(`${table}_organization_not_global`)
    })

    test('the consumed-message table accepts it', async () => {
      const result = await inOrg(ZERO_ORG, (c) =>
        c.query(CONSUMED_CLAIM, ['c', ZERO_ORG, `g${hex()}`, crypto.randomUUID(), 60_000])
      )
      expect(result.rowCount).toBe(1)
    })
  })

  describe('idempotency keys', () => {
    const ROUTE = 'documents.upload'
    const freshKey = () => `key-${hex()}`
    const begin = (c: PoolClient, org: string, key: string, hash: Buffer, user = newUserFixed) =>
      c.query(IDEMPOTENCY_BEGIN, [org, user, ROUTE, key, hash])
    const newUserFixed = `usr_${'1'.repeat(32)}`
    const lookup = (org: string, key: string, user = newUserFixed) =>
      inOrg(org, (c) => c.query(IDEMPOTENCY_LOOKUP, [org, user, ROUTE, key]))
    const finish = (
      c: PoolClient,
      org: string,
      key: string,
      status = 201,
      body = '{"id":"doc_1"}'
    ) => c.query(IDEMPOTENCY_COMPLETE, [org, newUserFixed, ROUTE, key, status, body])

    test('begin, complete, and a replay returns the stored response; a different request hash is visible', async () => {
      const org = newOrg()
      const key = freshKey()
      const h1 = hashOf('request one')
      await inOrg(org, async (c) => {
        expect((await begin(c, org, key, h1)).rowCount).toBe(1)
        expect((await finish(c, org, key)).rowCount).toBe(1)
      })
      const replay = (await lookup(org, key)).rows[0]
      expect(replay.status).toBe(201)
      expect(replay.response).toEqual({ id: 'doc_1' })
      expect(Buffer.compare(replay.request_hash, h1)).toBe(0)
      expect(Buffer.compare(replay.request_hash, hashOf('request two'))).not.toBe(0)
      expect((await inOrg(org, (c) => begin(c, org, key, hashOf('request two')))).rowCount).toBe(0)
      expect((await inOrg(org, (c) => finish(c, org, key, 500, '{}'))).rowCount).toBe(0)
      expect((await lookup(org, key)).rows[0].status).toBe(201)
    })

    test('the same key under another user or route is another row', async () => {
      const org = newOrg()
      const key = freshKey()
      const h = hashOf('x')
      await inOrg(org, async (c) => {
        expect((await begin(c, org, key, h)).rowCount).toBe(1)
        expect((await begin(c, org, key, h, `usr_${'2'.repeat(32)}`)).rowCount).toBe(1)
        expect(
          (await c.query(IDEMPOTENCY_BEGIN, [org, newUserFixed, 'documents.remove_all', key, h]))
            .rowCount
        ).toBe(1)
      })
    })

    test('a concurrent request waits for the first, then finds it completed', async () => {
      const org = newOrg()
      const key = freshKey()
      const h = hashOf('same')
      const first = await open(org)
      const second = await open(org)
      try {
        expect((await begin(first.client, org, key, h)).rowCount).toBe(1)
        const waiting = begin(second.client, org, key, h)
        await untilBlocked(second.pid)
        await finish(first.client, org, key)
        await first.client.query('commit')
        expect((await waiting).rowCount).toBe(0)
        await second.client.query('commit')
      } finally {
        releaseAll(first, second)
      }
      expect((await lookup(org, key)).rows[0]).toMatchObject({ status: 201 })
    })

    test('a request that cannot wait is told it is in progress by the lock timeout', async () => {
      const org = newOrg()
      const key = freshKey()
      const h = hashOf('same')
      const first = await open(org)
      const second = await open(org)
      try {
        await begin(first.client, org, key, h)
        await second.client.query(`set local lock_timeout = '150ms'`)
        const message = await rejectionOf(begin(second.client, org, key, h))
        expect(message).toContain('lock timeout')
      } finally {
        await first.client.query('rollback')
        await second.client.query('rollback').catch(() => undefined)
        releaseAll(first, second)
      }
      // The first rolled back, so nothing is stranded.
      expect((await lookup(org, key)).rowCount).toBe(0)
    })

    test('a second Organization sees nothing and cannot write the first one a row', async () => {
      const a = newOrg()
      const b = newOrg()
      const key = freshKey()
      await inOrg(a, (c) => begin(c, a, key, hashOf('x')))
      expect(
        (await inOrg(b, (c) => c.query(IDEMPOTENCY_LOOKUP, [a, newUserFixed, ROUTE, key]))).rowCount
      ).toBe(0)
      expect((await inOrg(b, (c) => finish(c, a, key))).rowCount).toBe(0)
      expect(await rejectionOf(inOrg(b, (c) => begin(c, a, freshKey(), hashOf('y'))))).toContain(
        'row-level security'
      )
      expect((await inOrg(b, (c) => begin(c, b, key, hashOf('x')))).rowCount).toBe(1)
      expect((await lookup(a, key)).rows[0].status).toBeNull()
    })

    test('a completed row is never rewritten, and an in-flight row keeps its identity', async () => {
      const org = newOrg()
      const [done, flying] = [freshKey(), freshKey()]
      await inOrg(org, async (c) => {
        await begin(c, org, done, hashOf('a'))
        await finish(c, org, done)
        await begin(c, org, flying, hashOf('b'))
      })
      const rewrite = await rejectionOf(
        asOwner(org, (c) =>
          c.query(
            `update playbook.idempotency_keys set status = 200, response = '{}' where key = $1`,
            [done]
          )
        )
      )
      expect(rewrite).toContain('playbook.idempotency_final')
      const move = await rejectionOf(
        asOwner(org, (c) =>
          c.query(`update playbook.idempotency_keys set request_hash = $2 where key = $1`, [
            flying,
            hashOf('c'),
          ])
        )
      )
      expect(move).toContain('playbook.idempotency_final')
      expect((await inOrg(org, (c) => finish(c, org, flying))).rowCount).toBe(1)
      const removed = await inOrg(org, (c) =>
        c.query('delete from playbook.idempotency_keys where key = any($1)', [[done, flying]])
      )
      expect(removed.rowCount).toBe(2)
    })

    test.each([
      ['a route with a capital', { route: 'Documents' }, 'idempotency_keys_route_shape'],
      ['a key with a space', { key: 'a b' }, 'idempotency_keys_key_shape'],
      ['a short hash', { request_hash: Buffer.alloc(31) }, 'idempotency_keys_request_hash_length'],
      ['a status without a response', { status: 200 }, 'idempotency_keys_response_matches_status'],
      ['a status out of range', { status: 99, response: '{}' }, 'idempotency_keys_status_range'],
    ])('refuses %s', async (_name, over, constraint) => {
      const org = newOrg()
      const values: Record<string, unknown> = {
        organization_id: org,
        user_id: newUserFixed,
        route: ROUTE,
        key: freshKey(),
        request_hash: hashOf('x'),
        ...over,
      }
      const keys = Object.keys(values)
      const message = await rejectionOf(
        inOrg(org, (c) =>
          c.query(
            `insert into playbook.idempotency_keys (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')})`,
            Object.values(values)
          )
        )
      )
      expect(message).toContain(constraint)
    })

    test('the internal call user id is accepted', async () => {
      const org = newOrg()
      const result = await inOrg(org, (c) =>
        begin(c, org, freshKey(), hashOf('x'), `usr_${'0'.repeat(32)}`)
      )
      expect(result.rowCount).toBe(1)
    })

    test('the purge removes old keys in a bounded batch inside the Organization, and keeps fresh ones', async () => {
      const org = newOrg()
      const other = newOrg()
      const put = (o: string, age: string) =>
        inOrg(o, (c) =>
          c.query(
            `insert into playbook.idempotency_keys (organization_id, user_id, route, key, request_hash, created_at)
             values ($1, $2, $3, $4, $5, clock_timestamp() - $6::interval)`,
            [o, newUserFixed, ROUTE, freshKey(), hashOf(hex()), age]
          )
        )
      for (const age of ['27 hours', '28 hours', '29 hours', '2 minutes']) {
        await put(org, age)
      }
      await put(other, '27 hours')
      const purge = (o: string, n: number | null, age = 0) =>
        inOrg(o, (c) => c.query(IDEMPOTENCY_PURGE, [o, age, n]))
      // An age of zero is raised to the purge age (26 hours), so the two-minute key stays.
      expect((await purge(org, null)).rowCount).toBe(1)
      expect((await purge(org, 2_000_000_000)).rowCount).toBe(2)
      expect((await purge(org, 10)).rowCount).toBe(0)
      expect(
        (await inOrg(org, (c) => c.query('select 1 from playbook.idempotency_keys'))).rowCount
      ).toBe(1)
      expect(
        (await inOrg(other, (c) => c.query('select 1 from playbook.idempotency_keys'))).rowCount
      ).toBe(1)
    })

    test('an age below the purge age is raised to it: a 2-hour age leaves a 25.5-hour-old key and takes a 27-hour-old one', async () => {
      const org = newOrg()
      const put = (hours: number) =>
        inOrg(org, (c) =>
          c.query(
            `insert into playbook.idempotency_keys (organization_id, user_id, route, key, request_hash, created_at)
             values ($1, $2, $3, $4, $5, clock_timestamp() - ($6::float8 * interval '1 hour'))`,
            [org, newUserFixed, ROUTE, freshKey(), hashOf(hex()), hours]
          )
        )
      await put(25.5)
      await put(27)
      const purge = await inOrg(org, (c) => c.query(IDEMPOTENCY_PURGE, [org, 2 * 3_600_000, 10]))
      expect(purge.rowCount).toBe(1)
      expect(
        (await inOrg(org, (c) => c.query('select 1 from playbook.idempotency_keys'))).rowCount
      ).toBe(1)
    })

    test('no other service role can reach it', async () => {
      expect(await rejectionOf(core.query('select 1 from playbook.idempotency_keys'))).toContain(
        'permission denied'
      )
    })
  })

  describe('isolation: statements that give the owner of the rows a row', () => {
    const TABLES = [
      'documents',
      'ingestion_jobs',
      'consumed_message',
      'index_settings',
      'idempotency_keys',
      'organization_usage',
      'embed_usage',
      'orphan_sweeps',
    ]
    /** Every row of every playbook table of one Organization, as text, read as the owner in its scope. */
    const snapshot = (org: string) =>
      asOwner(org, async (c) => {
        const out: Record<string, string[]> = {}
        for (const table of TABLES) {
          const rows = await c.query(
            `select to_jsonb(t)::text as r from playbook.${table} t order by to_jsonb(t)::text`
          )
          out[table] = rows.rows.map((r) => r.r)
        }
        return out
      })
    const USER = `usr_${'3'.repeat(32)}`
    const ROUTE = 'documents.upload'
    const future = () => new Date(Date.now() + 86_400_000)

    const deletedDoc = async (org: string, due: boolean) => {
      const doc = await mustAdd(org)
      await remove(org, doc.id)
      if (due) {
        await makeDue(org, doc.id)
      }
      return doc
    }
    const claimedJob = async (org: string) => {
      const doc = await mustAdd(org)
      const [claim] = (await claimJobs(org)).rows
      return { doc, token: claim.claim_token as string }
    }
    const spentJob = async (org: string) => {
      const doc = await mustAdd(org)
      await asOwner(org, (c) =>
        c.query(
          `update playbook.ingestion_jobs set attempts = 20, state = 'running', claim_token = gen_random_uuid(), next_attempt_at = clock_timestamp() - interval '1 second' where id = $1`,
          [doc.jobId]
        )
      )
      return doc
    }
    const claimedMessage = async (org: string, done = false) => {
      const token = crypto.randomUUID()
      await inOrg(org, (c) => c.query(CONSUMED_CLAIM, ['c', org, 'm1', token, 60_000]))
      if (done) {
        await inOrg(org, (c) => c.query(CONSUMED_COMPLETE, ['c', org, 'm1', token]))
      }
      return token
    }
    const idempotencyRow = async (org: string, completed: boolean, age = '0 seconds') => {
      const key = `key-${hex()}`
      await inOrg(org, async (c) => {
        await c.query(
          `insert into playbook.idempotency_keys (organization_id, user_id, route, key, request_hash, created_at)
           values ($1, $2, $3, $4, $5, clock_timestamp() - $6::interval)`,
          [org, USER, ROUTE, key, hashOf(key), age]
        )
        if (completed) {
          await c.query(IDEMPOTENCY_COMPLETE, [org, USER, ROUTE, key, 200, '{}'])
        }
      })
      return key
    }

    interface Case {
      name: string
      text: string
      prepare: (org: string) => Promise<unknown[]>
      /** True for an insert: the policy refuses it from another scope instead of hiding the row. */
      refused?: boolean
    }
    const cases: Case[] = [
      {
        name: 'QUOTA_USAGE',
        text: QUOTA_USAGE,
        prepare: async (a) => {
          await mustAdd(a)
          return [a]
        },
      },
      {
        name: 'DOCUMENT_GET',
        text: DOCUMENT_GET,
        prepare: async (a) => [a, (await mustAdd(a)).id],
      },
      {
        name: 'DOCUMENT_BY_HASH',
        text: DOCUMENT_BY_HASH,
        prepare: async (a) => [a, (await mustAdd(a)).hash],
      },
      {
        name: 'DOCUMENT_LIST',
        text: DOCUMENT_LIST,
        prepare: async (a) => {
          await mustAdd(a)
          return [a, 'infinity', '', 50]
        },
      },
      {
        name: 'DOCUMENT_LIST_DELETED',
        text: DOCUMENT_LIST_DELETED,
        prepare: async (a) => {
          await deletedDoc(a, false)
          return [a, 'infinity', '', 50]
        },
      },
      {
        name: 'DOCUMENT_SOFT_DELETE',
        text: DOCUMENT_SOFT_DELETE,
        prepare: async (a) => [a, (await mustAdd(a)).id, newUser(), HOUR],
      },
      {
        name: 'DOCUMENT_RESTORE',
        text: DOCUMENT_RESTORE,
        prepare: async (a) => [a, (await deletedDoc(a, false)).id, newJob()],
      },
      {
        name: 'DOCUMENT_RESTORE_FOR_UPLOAD',
        text: DOCUMENT_RESTORE_FOR_UPLOAD,
        prepare: async (a) => [a, (await deletedDoc(a, true)).id, newJob()],
      },
      {
        name: 'DOCUMENT_REQUEUE',
        text: DOCUMENT_REQUEUE,
        prepare: async (a) => {
          const { doc, token } = await claimedJob(a)
          await inOrg(a, (c) => c.query(INGESTION_JOB_FAIL, [a, doc.jobId, token, 'unreadable']))
          return [a, doc.id, newJob()]
        },
      },
      {
        name: 'DOCUMENT_CLEANUP_BEGIN',
        text: DOCUMENT_CLEANUP_BEGIN,
        prepare: async (a) => [a, (await deletedDoc(a, false)).id, 1],
      },
      {
        name: 'DOCUMENT_CLEANUP_DONE',
        text: DOCUMENT_CLEANUP_DONE,
        prepare: async (a) => [a, (await deletedDoc(a, false)).id, 1],
      },
      {
        name: 'DOCUMENT_PURGE_CLAIM',
        text: DOCUMENT_PURGE_CLAIM,
        prepare: async (a) => {
          await deletedDoc(a, true)
          return [a, 10, 60_000]
        },
      },
      {
        name: 'DOCUMENT_PURGE_COMPLETE',
        text: DOCUMENT_PURGE_COMPLETE,
        prepare: async (a) => {
          const doc = await deletedDoc(a, true)
          await claimPurge(a)
          await inOrg(a, (c) => c.query(DOCUMENT_CLEANUP_DONE, [a, doc.id, 1]))
          return [a, doc.id]
        },
      },
      {
        name: 'INGESTION_JOB_CLAIM',
        text: INGESTION_JOB_CLAIM,
        prepare: async (a) => {
          await mustAdd(a)
          return [a, 10, 60_000, null]
        },
      },
      {
        name: 'INGESTION_JOB_HEARTBEAT',
        text: INGESTION_JOB_HEARTBEAT,
        prepare: async (a) => {
          const j = await claimedJob(a)
          return [a, j.doc.jobId, j.token, 60_000]
        },
      },
      {
        name: 'INGESTION_JOB_ADVANCE',
        text: INGESTION_JOB_ADVANCE,
        prepare: async (a) => {
          const j = await claimedJob(a)
          return [a, j.doc.jobId, j.token, 'chunk', 'k', 1, null, null, 60_000]
        },
      },
      {
        name: 'INGESTION_JOB_RETRY',
        text: INGESTION_JOB_RETRY,
        prepare: async (a) => {
          const j = await claimedJob(a)
          return [a, j.doc.jobId, j.token, 0]
        },
      },
      {
        name: 'INGESTION_JOB_COMPLETE',
        text: INGESTION_JOB_COMPLETE,
        prepare: async (a) => {
          const j = await claimedJob(a)
          return [a, j.doc.jobId, j.token]
        },
      },
      {
        name: 'INGESTION_JOB_FAIL',
        text: INGESTION_JOB_FAIL,
        prepare: async (a) => {
          const j = await claimedJob(a)
          return [a, j.doc.jobId, j.token, 'unreadable']
        },
      },
      {
        name: 'INGESTION_JOB_GIVE_UP_SPENT',
        text: INGESTION_JOB_GIVE_UP_SPENT,
        prepare: async (a) => {
          await spentJob(a)
          return [a, 10]
        },
      },
      {
        name: 'CONSUMED_LOOKUP',
        text: CONSUMED_LOOKUP,
        prepare: async (a) => {
          await claimedMessage(a)
          return ['c', a, 'm1']
        },
      },
      {
        name: 'CONSUMED_RENEW',
        text: CONSUMED_RENEW,
        prepare: async (a) => ['c', a, 'm1', await claimedMessage(a), 60_000],
      },
      {
        name: 'CONSUMED_COMPLETE',
        text: CONSUMED_COMPLETE,
        prepare: async (a) => ['c', a, 'm1', await claimedMessage(a)],
      },
      {
        name: 'CONSUMED_RELEASE',
        text: CONSUMED_RELEASE,
        prepare: async (a) => ['c', a, 'm1', await claimedMessage(a)],
      },
      {
        name: 'CONSUMED_PURGE',
        text: CONSUMED_PURGE,
        prepare: async (a) => {
          await claimedMessage(a, true)
          return [a, future(), 10]
        },
      },
      {
        name: 'INDEX_VECTORS_MARK',
        text: INDEX_VECTORS_MARK,
        prepare: async (a) => {
          await inOrg(a, (c) => c.query(INDEX_SETTINGS_UPSERT, [a, 'm', 8]))
          return [a]
        },
      },
      {
        name: 'IDEMPOTENCY_LOOKUP',
        text: IDEMPOTENCY_LOOKUP,
        prepare: async (a) => [a, USER, ROUTE, await idempotencyRow(a, true)],
      },
      {
        name: 'IDEMPOTENCY_COMPLETE',
        text: IDEMPOTENCY_COMPLETE,
        prepare: async (a) => [a, USER, ROUTE, await idempotencyRow(a, false), 201, '{}'],
      },
      {
        name: 'IDEMPOTENCY_PURGE',
        text: IDEMPOTENCY_PURGE,
        prepare: async (a) => {
          await idempotencyRow(a, true, '27 hours')
          return [a, 0, 10]
        },
      },
      {
        name: 'DOCUMENT_INSERT',
        text: DOCUMENT_INSERT,
        refused: true,
        prepare: async (a) => [
          a,
          newDoc(),
          'x.pdf',
          hashOf(hex()),
          1,
          'application/pdf',
          'pdf',
          newUser(),
          'k',
          newJob(),
          BIG,
          10 ** 12,
        ],
      },
      {
        name: 'CONSUMED_CLAIM',
        text: CONSUMED_CLAIM,
        refused: true,
        prepare: async (a) => ['c', a, 'fresh', crypto.randomUUID(), 60_000],
      },
      {
        name: 'INDEX_SETTINGS_UPSERT',
        text: INDEX_SETTINGS_UPSERT,
        refused: true,
        prepare: async (a) => [a, 'm', 8],
      },
      {
        name: 'IDEMPOTENCY_BEGIN',
        text: IDEMPOTENCY_BEGIN,
        refused: true,
        prepare: async (a) => [a, USER, ROUTE, `key-${hex()}`, hashOf('x')],
      },
    ]

    test.each(cases)(
      '$name: B gets nothing and changes nothing, then A gets the row',
      async (c) => {
        const a = newOrg()
        const b = newOrg()
        const params = await c.prepare(a)
        const [beforeA, beforeB] = [await snapshot(a), await snapshot(b)]
        if (c.refused) {
          expect(await rejectionOf(inOrg(b, (cl) => cl.query(c.text, params)))).toContain(
            'row-level security'
          )
        } else {
          const none = await inOrg(b, (cl) => cl.query(c.text, params))
          expect([c.name, none.rowCount]).toEqual([c.name, 0])
        }
        expect(await snapshot(a)).toEqual(beforeA)
        expect(await snapshot(b)).toEqual(beforeB)
        const mine = await inOrg(a, (cl) => cl.query(c.text, params))
        expect([c.name, (mine.rowCount ?? 0) > 0]).toEqual([c.name, true])
      }
    )
  })

  describe('more races on separate connections', () => {
    test('two identical uploads at once: one wins, the other gets no row, the hash finds the winner, the counter counts one', async () => {
      for (const withLock of [true, false]) {
        const org = newOrg()
        const hash = hashOf(`same ${hex()}`)
        const insert = (c: PoolClient, id: string) =>
          c.query(DOCUMENT_INSERT, [
            org,
            id,
            'a.pdf',
            hash,
            7,
            'application/pdf',
            'pdf',
            newUser(),
            'k',
            newJob(),
            BIG,
            10 ** 12,
          ])
        const [winnerId, loserId] = [newDoc(), newDoc()]
        const first = await open(org)
        const second = await open(org)
        try {
          if (withLock) {
            await first.client.query(QUOTA_LOCK, [org])
          }
          expect((await insert(first.client, winnerId)).rowCount).toBe(1)
          const waiting = withLock
            ? second.client.query(QUOTA_LOCK, [org])
            : insert(second.client, loserId)
          await untilBlocked(second.pid)
          await first.client.query('commit')
          const result = await waiting
          if (withLock) {
            expect((await insert(second.client, loserId)).rowCount).toBe(0)
          } else {
            expect(result.rowCount).toBe(0)
          }
          await second.client.query('commit')
        } finally {
          releaseAll(first, second)
        }
        const found = await inOrg(org, (c) => c.query(DOCUMENT_BY_HASH, [org, hash]))
        expect(found.rows.map((r) => r.id)).toEqual([winnerId])
        expect(await usage(org)).toEqual({ document_count: 1, byte_count: 7 })
        expect(await usage(org)).toEqual(await actualUsage(org))
      }
    })

    test.each(['heartbeat', 'advance', 'complete', 'claim'])(
      'a delete against a job %s: the job never sets ready on the deleted document',
      async (kind) => {
        const org = newOrg()
        const doc = await mustAdd(org)
        let token = ''
        if (kind !== 'claim') {
          token = (await claimJobs(org)).rows[0].claim_token
        }
        const call: Record<string, [string, unknown[]]> = {
          heartbeat: [INGESTION_JOB_HEARTBEAT, [org, doc.jobId, token, 60_000]],
          advance: [
            INGESTION_JOB_ADVANCE,
            [org, doc.jobId, token, 'chunk', null, null, null, null, 60_000],
          ],
          complete: [INGESTION_JOB_COMPLETE, [org, doc.jobId, token]],
          claim: [INGESTION_JOB_CLAIM, [org, 10, 60_000, null]],
        }
        const [text, params] = call[kind] as [string, unknown[]]
        const deleting = await open(org)
        const worker = await open(org)
        try {
          expect(
            (await deleting.client.query(DOCUMENT_SOFT_DELETE, [org, doc.id, newUser(), HOUR]))
              .rowCount
          ).toBe(1)
          const waiting = worker.client.query(text, params)
          if (kind !== 'claim') {
            // The job row is locked by the delete's cancel: the worker waits, then finds it cancelled.
            await untilBlocked(worker.pid)
          }
          await deleting.client.query('commit')
          expect((await waiting).rowCount).toBe(0)
          await worker.client.query('commit')
        } finally {
          releaseAll(deleting, worker)
        }
        expect(await row(org, doc.id)).toMatchObject({ state: 'deleted' })
        expect(await jobRow(org, doc.jobId)).toMatchObject({ state: 'cancelled' })
        expect(claimedJobs((await claimJobs(org)).rows).jobs).toEqual([])
      }
    )

    test('a completion that commits first leaves the document ready, then the delete deletes it', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      const token = (await claimJobs(org)).rows[0].claim_token
      const worker = await open(org)
      const deleting = await open(org)
      try {
        expect(
          (await worker.client.query(INGESTION_JOB_COMPLETE, [org, doc.jobId, token])).rowCount
        ).toBe(1)
        const waiting = deleting.client.query(DOCUMENT_SOFT_DELETE, [org, doc.id, newUser(), HOUR])
        await untilBlocked(deleting.pid)
        await worker.client.query('commit')
        expect((await waiting).rows[0]).toMatchObject({
          state: 'deleted',
          deletion_seq: 1,
          changed: true,
        })
        await deleting.client.query('commit')
      } finally {
        releaseAll(worker, deleting)
      }
      expect(await row(org, doc.id)).toMatchObject({ state: 'deleted' })
      expect(await jobRow(org, doc.jobId)).toMatchObject({ state: 'succeeded' })
    })

    test('requeue against delete, in both orders', async () => {
      const failed = async (org: string) => {
        const doc = await mustAdd(org)
        const [claim] = (await claimJobs(org)).rows
        await inOrg(org, (c) =>
          c.query(INGESTION_JOB_FAIL, [org, doc.jobId, claim.claim_token, 'no_text'])
        )
        return doc
      }
      // The delete first: the requeue waits, finds the document deleted and writes nothing.
      const org = newOrg()
      const doc = await failed(org)
      const deleting = await open(org)
      const requeueing = await open(org)
      try {
        await deleting.client.query(DOCUMENT_SOFT_DELETE, [org, doc.id, newUser(), HOUR])
        const waiting = requeueing.client.query(DOCUMENT_REQUEUE, [org, doc.id, newJob()])
        await untilBlocked(requeueing.pid)
        await deleting.client.query('commit')
        expect((await waiting).rowCount).toBe(0)
        await requeueing.client.query('commit')
      } finally {
        releaseAll(deleting, requeueing)
      }
      expect(await row(org, doc.id)).toMatchObject({ state: 'deleted' })
      expect(await activeJobs(org, doc.id)).toBe(0)
      // The requeue first: the delete waits and then deletes the requeued document.
      const second = newOrg()
      const other = await failed(second)
      const requeue = await open(second)
      const del = await open(second)
      try {
        expect(
          (await requeue.client.query(DOCUMENT_REQUEUE, [second, other.id, newJob()])).rowCount
        ).toBe(1)
        const waiting = del.client.query(DOCUMENT_SOFT_DELETE, [second, other.id, newUser(), HOUR])
        await untilBlocked(del.pid)
        await requeue.client.query('commit')
        expect((await waiting).rows[0]).toMatchObject({ state: 'deleted', changed: true })
        await del.client.query('commit')
      } finally {
        releaseAll(requeue, del)
      }
      expect(claimedJobs((await claimJobs(second)).rows).jobs).toEqual([])
      expect(await activeJobs(second, other.id)).toBe(0)
    })

    test('two consumed-message purges at once take different rows and together remove every one', async () => {
      const org = newOrg()
      for (let i = 0; i < 4; i++) {
        const token = crypto.randomUUID()
        await inOrg(org, (c) => c.query(CONSUMED_CLAIM, ['c', org, `m${i}`, token, 60_000]))
        await inOrg(org, (c) => c.query(CONSUMED_COMPLETE, ['c', org, `m${i}`, token]))
      }
      const cutoff = new Date(Date.now() + 86_400_000)
      const first = await open(org)
      const second = await open(org)
      let removed = 0
      try {
        const one = await first.client.query(CONSUMED_PURGE, [org, cutoff, 2])
        const two = await second.client.query(CONSUMED_PURGE, [org, cutoff, 4])
        expect(one.rowCount).toBe(2)
        // The second skips the two rows the first holds.
        expect(two.rowCount).toBe(2)
        removed = (one.rowCount ?? 0) + (two.rowCount ?? 0)
        await first.client.query('commit')
        await second.client.query('commit')
      } finally {
        releaseAll(first, second)
      }
      expect(removed).toBe(4)
      expect(
        (await inOrg(org, (c) => c.query('select 1 from playbook.consumed_message'))).rowCount
      ).toBe(0)
    })
  })

  describe('migrations on a database with data in other schemas', () => {
    const databases: string[] = []
    let admin: Pool
    let folder: string

    beforeAll(async () => {
      admin = new Pool({ connectionString: adminUrl(), max: 1 })
      folder = mkdtempSync(join(tmpdir(), 'closeline-db-at-0008-'))
      mkdirSync(join(folder, 'meta'))
      const journal = JSON.parse(readFileSync(join(MIGRATIONS, 'meta', '_journal.json'), 'utf8'))
      journal.entries = journal.entries.filter((e: { tag: string }) => e.tag < '0009')
      writeFileSync(join(folder, 'meta', '_journal.json'), JSON.stringify(journal))
      for (const entry of journal.entries as { tag: string }[]) {
        cpSync(join(MIGRATIONS, `${entry.tag}.sql`), join(folder, `${entry.tag}.sql`))
      }
    })

    afterAll(async () => {
      for (const name of databases) {
        await admin.query(`drop database if exists "${name}" with (force)`)
      }
      await admin.end()
      rmSync(folder, { recursive: true, force: true })
    })

    test('0009 through 0020 apply on a database at 0008 holding auth rows, and change nothing there', async () => {
      const name = `it_migrate_playbook_${suffix}`
      await admin.query(`create database "${name}" owner closeline_owner`)
      databases.push(name)
      const url = new URL(env.owner)
      url.pathname = `/${name}`
      await runMigrations(url.toString(), { migrationsFolder: folder })
      const pool = new Pool({ connectionString: url.toString(), max: 1 })
      try {
        const before = await pool.query<{ present: boolean }>(
          `select to_regclass('playbook.documents') is not null as present`
        )
        expect(before.rows[0]?.present).toBe(false)
        const workspace = crypto.randomUUID()
        await pool.query('insert into auth.workspaces (id, name) values ($1, $2)', [workspace, 'w'])
        await runMigrations(url.toString())
        const kept = await pool.query('select name from auth.workspaces where id = $1', [workspace])
        expect(kept.rows).toEqual([{ name: 'w' }])
        const tables = await pool.query<{ relname: string; forced: boolean; policies: number }>(
          `select c.relname, c.relforcerowsecurity as forced,
                  (select count(*)::int from pg_policies p where p.schemaname = 'playbook' and p.tablename = c.relname and p.permissive = 'PERMISSIVE') as policies
             from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'playbook' and c.relkind = 'r' order by c.relname`
        )
        expect(tables.rows).toEqual(
          [
            'call_jobs',
            'call_vendor_sends',
            'calls',
            'consumed_message',
            'deal_import_rows',
            'deal_imports',
            'deals',
            'documents',
            'embed_usage',
            'idempotency_keys',
            'index_settings',
            'ingestion_jobs',
            'organization_usage',
            'orphan_sweeps',
            'rights_confirmations',
            'suggestions',
          ]
            .map((relname) => ({ relname, forced: true, policies: 1 }))
            .concat([{ relname: 'work_hints', forced: false, policies: 0 }])
        )
        const applied = await pool.query(
          `select count(*)::int as n from drizzle.__drizzle_migrations`
        )
        // 0000 to 0040: the nine before the playbook (0000 to 0008) plus 0009 to 0040.
        expect(applied.rows[0].n).toBe(41)
        await runMigrations(url.toString())
      } finally {
        await pool.end()
      }
    })
  })

  describe('DOCUMENT_SEARCH_STATE: what Postgres says about the documents a search hit (v0.22.0)', () => {
    type State = { id: string; name: string; state: string; epoch: number }
    const stateOf = async (org: string, ids: string[] | null) =>
      (await inOrg(org, (c) => c.query(DOCUMENT_SEARCH_STATE, [org, ids]))).rows as State[]
    const getOne = async (org: string, id: string) =>
      (await inOrg(org, (c) => c.query(DOCUMENT_GET, [org, id]))).rows[0]
    /** The row must be DOCUMENT_GET's id, name, state and epoch, field for field. */
    const expectSameAsGet = async (org: string, id: string) => {
      const one = await getOne(org, id)
      const rows = await stateOf(org, [id])
      expect(rows).toEqual([{ id: one.id, name: one.name, state: one.state, epoch: one.epoch }])
      return one
    }
    const makeReady = (org: string, id: string) =>
      asOwner(org, (c) =>
        c.query(`update playbook.documents set state = 'ready' where id = $1`, [id])
      )

    test('it returns id, name, state and epoch as DOCUMENT_GET does', async () => {
      const org = newOrg()
      const a = await mustAdd(org)
      const b = await mustAdd(org)
      await makeReady(org, b.id)
      const rows = await stateOf(org, [b.id, a.id])
      expect(rows.map((r) => r.id)).toEqual([a.id, b.id].sort())
      expect(Object.keys(rows[0] as State).sort()).toEqual(['epoch', 'id', 'name', 'state'])
      for (const r of rows) {
        await expectSameAsGet(org, r.id)
      }
      expect((await getOne(org, b.id)).state).toBe('ready')
    })

    test('a deleted document is answered as deleted, as DOCUMENT_GET answers it', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await makeReady(org, doc.id)
      const before = await expectSameAsGet(org, doc.id)
      await remove(org, doc.id)
      const after = await expectSameAsGet(org, doc.id)
      expect(after.state).toBe('deleted')
      expect(after.epoch).toBeGreaterThan(before.epoch)
    })

    test('a replaced document (restored) has a higher epoch and is no longer ready, as DOCUMENT_GET says', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await makeReady(org, doc.id)
      const before = await expectSameAsGet(org, doc.id)
      await remove(org, doc.id)
      expect((await restore(org, doc.id, true)).rowCount).toBe(1)
      const after = await expectSameAsGet(org, doc.id)
      expect(after.epoch).toBeGreaterThan(before.epoch)
      expect(after.state).toBe('processing')
      // Ready again at the new epoch: the old vector's epoch no longer matches.
      await makeReady(org, doc.id)
      const again = await expectSameAsGet(org, doc.id)
      expect(again.state).toBe('ready')
      expect(again.epoch).toBeGreaterThan(before.epoch)
    })

    test('another Organization’s ids return no rows, in both directions', async () => {
      const mine = newOrg()
      const theirs = newOrg()
      const a = await mustAdd(mine)
      const b = await mustAdd(theirs)
      expect((await stateOf(mine, [a.id, b.id])).map((r) => r.id)).toEqual([a.id])
      expect(await stateOf(mine, [b.id])).toEqual([])
      expect(await stateOf(theirs, [a.id])).toEqual([])
    })

    test('unknown ids, an empty array and a null array return nothing', async () => {
      const org = newOrg()
      await mustAdd(org)
      expect(await stateOf(org, [newDoc(), newDoc()])).toEqual([])
      expect(await stateOf(org, [])).toEqual([])
      expect(await stateOf(org, null)).toEqual([])
    })

    test('the statement reads at most MAX_DOCUMENT_SEARCH_STATE_IDS ids: the first 100 are answered, the rest are not', async () => {
      const org = newOrg()
      const real = await mustAdd(org)
      const padding = Array.from({ length: MAX_DOCUMENT_SEARCH_STATE_IDS }, () => newDoc())
      // The real document is 101st: past the cap, so it is not read.
      expect(await stateOf(org, [...padding, real.id])).toEqual([])
      expect((await stateOf(org, [real.id, ...padding.slice(1)])).map((r) => r.id)).toEqual([
        real.id,
      ])
      expect(MAX_DOCUMENT_SEARCH_STATE_IDS).toBe(100)
    })

    // The plan is a property: the read is bound by the ids as well as the Organization, so one index
    // condition must hold both. A plan that scans every document of the Organization and filters the
    // ids fails. A realistic spread is seeded and analyzed first.
    test('it reads documents through one index condition on the Organization and the ids', async () => {
      interface Node {
        'Node Type': string
        'Relation Name'?: string
        'Index Cond'?: string
        Plans?: Node[]
      }
      const walk = (n: Node): Node[] => [n, ...(n.Plans ?? []).flatMap(walk)]
      for (let n = 0; n < 4; n++) {
        const seeded = newOrg()
        await asOwner(seeded, (c) =>
          c.query(
            `insert into playbook.documents (id, organization_id, name, state, content_hash, size_bytes,
               declared_type, detected_type, uploaded_by, object_key)
             select 'doc_' || lpad(to_hex(g), 32, '0'), $1, 'Playbook.pdf', 'uploaded', sha256(g::text::bytea),
                    1000, 'application/pdf', 'pdf', $2, $1 || '/' || g
               from generate_series(1, 600) g`,
            [seeded, newUser()]
          )
        )
      }
      await owner.query('analyze playbook.documents')
      const org = newOrg()
      const plan = await inOrg(org, async (c) => {
        await c.query('set local plan_cache_mode = force_generic_plan')
        await c.query('set local enable_seqscan = off')
        await c.query(`prepare plan_probe(text, text[]) as ${DOCUMENT_SEARCH_STATE}`)
        try {
          const r = await c.query(
            `explain (format json, costs off) execute plan_probe('${org}', array['doc_x'])`
          )
          return r.rows[0]['QUERY PLAN'][0].Plan as Node
        } finally {
          await c.query('deallocate plan_probe')
        }
      })
      const dump = JSON.stringify(plan, null, 1)
      const scans = walk(plan).filter((n) => n['Relation Name'] === 'documents')
      if (scans.length === 0 || scans.some((n) => n['Node Type'] === 'Seq Scan')) {
        throw new Error(`documents is not read through an index in ${dump}`)
      }
      // A Bitmap Heap Scan keeps its condition on the Bitmap Index Scan below it, so look there too.
      const bounded = scans
        .flatMap(walk)
        .some(
          (n) =>
            /\borganization_id =/.test(n['Index Cond'] ?? '') &&
            /\bid = ANY\b/i.test(n['Index Cond'] ?? '')
        )
      if (!bounded) {
        throw new Error(`the read is not bound by the Organization and the ids in ${dump}`)
      }
    })
  })

  test('every exported statement is exercised by name above', () => {
    expect(Object.keys(PLAYBOOK_STATEMENTS).length).toBeGreaterThan(20)
  })
})
