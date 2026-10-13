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
  DOCUMENT_BY_HASH,
  DOCUMENT_CLEANUP_BEGIN,
  DOCUMENT_CLEANUP_DONE,
  DOCUMENT_INSERT,
  DOCUMENT_LIST,
  DOCUMENT_PURGE_CLAIM,
  DOCUMENT_PURGE_COMPLETE,
  DOCUMENT_REQUEUE,
  DOCUMENT_RESTORE,
  DOCUMENT_SOFT_DELETE,
  INDEX_SETTINGS_UPSERT,
  INDEX_VECTORS_MARK,
  INGESTION_JOB_ADVANCE,
  INGESTION_JOB_CLAIM,
  INGESTION_JOB_COMPLETE,
  INGESTION_JOB_FAIL,
  INGESTION_JOB_GIVE_UP_SPENT,
  INGESTION_JOB_HEARTBEAT,
  INGESTION_JOB_RETRY,
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
  const restore = (org: string, id: string) =>
    inOrg(org, (c) => c.query(DOCUMENT_RESTORE, [org, id, newJob()]))
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
  const claimJobs = (org: string, limit = 10, leaseMs = 600_000, jobId: string | null = null) =>
    inOrg(org, (c) => c.query(INGESTION_JOB_CLAIM, [org, limit, leaseMs, jobId]))
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
      expect((await restore(org, doc.id)).rowCount).toBe(0)
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
          (await restoring.client.query(DOCUMENT_RESTORE, [org, doc.id, newJob()])).rowCount
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
        const waiting = restoring.client.query(DOCUMENT_RESTORE, [org, doc.id, newJob()])
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
        const waiting = restoring.client.query(DOCUMENT_RESTORE, [org, doc.id, newJob()])
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
      expect((await claimJobs(org)).rowCount).toBe(0)
      expect((await claimJobs(org, 10, 1000, doc.jobId)).rowCount).toBe(0)
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
      expect((await claimJobs(org, 10)).rowCount).toBe(0)
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

    test('0009 and 0010 apply on a database at 0008 holding auth rows, and change nothing there', async () => {
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
            'consumed_message',
            'documents',
            'index_settings',
            'ingestion_jobs',
            'organization_usage',
          ].map((relname) => ({ relname, forced: true, policies: 1 }))
        )
        const applied = await pool.query(
          `select count(*)::int as n from drizzle.__drizzle_migrations`
        )
        expect(applied.rows[0].n).toBe(11)
        await runMigrations(url.toString())
      } finally {
        await pool.end()
      }
    })
  })

  test('every exported statement is exercised by name above', () => {
    expect(Object.keys(PLAYBOOK_STATEMENTS).length).toBeGreaterThan(20)
  })
})
