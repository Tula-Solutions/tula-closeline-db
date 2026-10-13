import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { dropStaleTestObjects, integrationEnv, migrateUp, rejectionOf } from './integration-support'
import { NON_TENANT_TABLES } from './isolation'
import {
  CONSUMED_CLAIM,
  CONSUMED_COMPLETE,
  claimedJobs,
  DOCUMENT_BY_HASH,
  DOCUMENT_CLEANUP_BEGIN,
  DOCUMENT_CLEANUP_DONE,
  DOCUMENT_ERASE_BATCH,
  DOCUMENT_GET,
  DOCUMENT_INSERT,
  DOCUMENT_LIST_PENDING_CLEANUP,
  DOCUMENT_LIST_SPENT_PURGES,
  DOCUMENT_PURGE_CLAIM,
  DOCUMENT_PURGE_COMPLETE,
  DOCUMENT_PURGE_RESET,
  DOCUMENT_RESTORE,
  DOCUMENT_RESTORE_FOR_UPLOAD,
  DOCUMENT_SOFT_DELETE,
  discoveredOrganizations,
  IDEMPOTENCY_BEGIN,
  INDEX_SETTINGS_UPSERT,
  INGESTION_JOB_CLAIM,
  INGESTION_JOB_COMPLETE,
  INGESTION_JOB_FAIL,
  INGESTION_JOB_HEARTBEAT,
  ORGANIZATION_REMOVAL_STATUS,
  ORGANIZATION_REMOVE_REST,
  ORGANIZATIONS_WITH_WORK,
  ORPHAN_SWEEP_AGE_MS,
  ORPHAN_SWEEP_DONE,
  QUOTA_LOCK,
  QUOTA_USAGE,
  REMOVE_ALL_IDEMPOTENCY_ROUTE,
  type WorkDiscoveryRow,
} from './playbook-statements'
import { WORK_KINDS } from './schema/playbook-work-hints'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
// Every test works in Organizations of its own (random ids), so no test sees another's rows.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const hex = (): string => crypto.randomUUID().replaceAll('-', '')
const newOrg = (): string => `org_${hex()}`
const newDoc = (): string => `doc_${hex()}`
const newJob = (): string => `job_${hex()}`
const newUser = (): string => `usr_${hex()}`
const ZERO_ORG = `org_${'0'.repeat(32)}`
const ZERO_USER = `usr_${'0'.repeat(32)}`
const hashOf = (text: string): Buffer => createHash('sha256').update(text).digest()
const BIG = 1_000_000

describe('work discovery, erasure and spent purges', () => {
  let owner: Pool
  let playbook: Pool
  let core: Pool
  let auth: Pool

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 4 })
    await dropStaleTestObjects(owner, env.owner)
    playbook = new Pool({ connectionString: env.playbook, max: 12 })
    core = new Pool({ connectionString: env.core, max: 1 })
    auth = new Pool({ connectionString: env.auth, max: 1 })
  })

  afterAll(async () => {
    await Promise.all([owner.end(), playbook.end(), core.end(), auth.end()])
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
  /** End every transaction and give the connections back. */
  const finish = async (...txs: { client: PoolClient }[]) => {
    for (const tx of txs) {
      await tx.client.query('rollback').catch(() => undefined)
      tx.client.release()
    }
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
  }
  /** Add a document the way the service does (lock, then insert), returning null when refused. */
  async function addDoc(org: string, content?: string): Promise<Added | null> {
    const id = newDoc()
    const jobId = newJob()
    const hash = hashOf(content ?? `content ${hex()}`)
    const result = await inOrg(org, async (c) => {
      await c.query(QUOTA_LOCK, [org])
      return c.query(DOCUMENT_INSERT, [
        org,
        id,
        'Playbook.pdf',
        hash,
        1000,
        'application/pdf',
        'pdf',
        newUser(),
        `${org}/${id}`,
        jobId,
        BIG,
        10 ** 12,
      ])
    })
    return result.rowCount ? { id, jobId, hash } : null
  }
  const mustAdd = async (org: string, content?: string): Promise<Added> => {
    const added = await addDoc(org, content)
    if (!added) {
      throw new Error('the document was refused')
    }
    return added
  }
  const remove = (org: string, id: string) =>
    inOrg(org, (c) => c.query(DOCUMENT_SOFT_DELETE, [org, id, newUser(), 0]))
  const restore = (org: string, id: string, forUpload = false) =>
    inOrg(org, (c) =>
      c.query(forUpload ? DOCUMENT_RESTORE_FOR_UPLOAD : DOCUMENT_RESTORE, [org, id, newJob()])
    )
  const claimPurge = (org: string, limit = 10, leaseMs = 600_000) =>
    inOrg(org, (c) => c.query(DOCUMENT_PURGE_CLAIM, [org, limit, leaseMs]))
  const claimJobs = (org: string, limit = 10, leaseMs = 600_000) =>
    inOrg(org, (c) => c.query(INGESTION_JOB_CLAIM, [org, limit, leaseMs, null]))
  const row = async (org: string, id: string) =>
    (await inOrg(org, (c) => c.query('select * from playbook.documents where id = $1', [id])))
      .rows[0]
  const jobRow = async (org: string, id: string) =>
    (await inOrg(org, (c) => c.query('select * from playbook.ingestion_jobs where id = $1', [id])))
      .rows[0]
  const erase = (org: string, limit: number | null = 100) =>
    inOrg(org, (c) => c.query(DOCUMENT_ERASE_BATCH, [org, limit, ZERO_USER]))
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
  /** End every job lease of the Organization now, as if the workers had died (the owner). */
  const expireLeases = (org: string) =>
    asOwner(org, (c) =>
      c.query(
        `update playbook.ingestion_jobs set next_attempt_at = clock_timestamp() - interval '1 second'
          where state in ('running', 'cancelled')`
      )
    )
  const usageOf = async (org: string) =>
    (await inOrg(org, (c) => c.query(QUOTA_USAGE, [org]))).rows[0]
  /** Every row of every playbook tenant table of one Organization, as text, read as the owner. */
  const snapshot = (org: string) =>
    asOwner(org, async (c) => {
      const out: Record<string, string[]> = {}
      for (const table of [
        'documents',
        'ingestion_jobs',
        'consumed_message',
        'index_settings',
        'idempotency_keys',
        'organization_usage',
        'orphan_sweeps',
      ]) {
        const rows = await c.query(
          `select to_jsonb(t)::text as r from playbook.${table} t order by to_jsonb(t)::text`
        )
        out[table] = rows.rows.map((r) => r.r)
      }
      return out
    })
  const hintOf = async (kind: string, org: string) =>
    (
      await owner.query(
        'select due_at from playbook.work_hints where kind = $1 and organization_id = $2',
        [kind, org]
      )
    ).rows[0]

  /** Ask for one page of Organizations with work, outside any Organization's scope. */
  const rawPage = async (kind: string, after: string | null, batch: number | null) =>
    (await playbook.query<WorkDiscoveryRow>(ORGANIZATIONS_WITH_WORK, [kind, after, batch])).rows
  const page = async (kind: string, after: string | null, batch: number | null) =>
    discoveredOrganizations(await rawPage(kind, after, batch)).organizations

  /** An upload attempt as the owner can write one: an idempotency key created `hoursAgo` hours ago. */
  const insertKey = (org: string, hoursAgo: number) =>
    asOwner(org, (c) =>
      c.query(
        `insert into playbook.idempotency_keys (organization_id, user_id, route, key, request_hash, created_at)
         values ($1, $2, 'documents.upload', $3, $4, clock_timestamp() - ($5::float8 * interval '1 hour'))`,
        [org, newUser(), `key-${hex()}`, hashOf('x'), hoursAgo]
      )
    )
  describe('discovery', () => {
    /** Organization ids that share a random prefix, so a sweep can be confined to them. */
    const family = (count: number) => {
      const prefix = hex().slice(0, 16)
      return {
        after: `org_${prefix}`,
        ids: Array.from(
          { length: count },
          (_, i) => `org_${prefix}${i.toString(16).padStart(16, '0')}`
        ),
      }
    }
    /** Sweep a kind page by page from the family's start, keeping the family's ids, until a page leaves it. */
    const sweep = async (kind: string, f: { after: string }, batch: number) => {
      const found: string[] = []
      let cursor: string | null = f.after
      for (let pages = 0; pages < 500 && cursor; pages++) {
        const result = discoveredOrganizations(await rawPage(kind, cursor, batch))
        found.push(...result.organizations.filter((id) => id.startsWith(f.after)))
        if (result.resumeAfter === null || !result.resumeAfter.startsWith(f.after)) {
          break
        }
        cursor = result.resumeAfter
      }
      return found
    }

    interface KindCase {
      kind: string
      /** Give `org` due work of the kind, with real statements where they exist. */
      due: (org: string) => Promise<void>
      /** Give `org` work of the kind that is not due yet, or none. */
      notDue: (org: string) => Promise<void>
      /** Finish the work so the kind finds nothing for `org`. */
      finish?: (org: string) => Promise<void>
    }
    const insertDoneMessage = (org: string, hoursAgo: number) =>
      asOwner(org, (c) =>
        c.query(
          `insert into playbook.consumed_message (consumer, organization_id, message_id, state, claim_token, completed_at)
           values ('c', $1, $2, 'done', gen_random_uuid(), clock_timestamp() - make_interval(hours => $3))`,
          [org, `m-${hex()}`, hoursAgo]
        )
      )
    const cases: KindCase[] = [
      {
        kind: 'purge_due',
        due: async (org) => {
          const doc = await mustAdd(org)
          await remove(org, doc.id)
          await makeDue(org, doc.id)
        },
        notDue: async (org) => {
          const doc = await mustAdd(org)
          await remove(org, doc.id)
        },
        finish: async (org) => {
          await expireLeases(org)
          const claimed = (await claimPurge(org)).rows[0]
          await inOrg(org, (c) =>
            c.query(DOCUMENT_CLEANUP_DONE, [org, claimed.id, claimed.deletion_seq])
          )
          await inOrg(org, (c) => c.query(DOCUMENT_PURGE_COMPLETE, [org, claimed.id]))
        },
      },
      {
        kind: 'jobs_due',
        due: async (org) => {
          await mustAdd(org)
        },
        notDue: async (org) => {
          const doc = await mustAdd(org)
          await asOwner(org, (c) =>
            c.query(
              `update playbook.ingestion_jobs set next_attempt_at = clock_timestamp() + interval '1 hour' where id = $1`,
              [doc.jobId]
            )
          )
        },
        finish: async (org) => {
          const claimed = (await claimJobs(org)).rows[0]
          await inOrg(org, (c) =>
            c.query(INGESTION_JOB_FAIL, [org, claimed.id, claimed.claim_token, 'unreadable'])
          )
        },
      },
      {
        kind: 'cleanup_pending',
        due: async (org) => {
          const doc = await mustAdd(org)
          await remove(org, doc.id)
          await asOwner(org, (c) =>
            c.query(
              `update playbook.documents
                  set deleted_at = deleted_at - interval '10 minutes', purge_due_at = purge_due_at - interval '10 minutes'
                where id = $1`,
              [doc.id]
            )
          )
        },
        notDue: async (org) => {
          const doc = await mustAdd(org)
          await remove(org, doc.id)
        },
        finish: async (org) => {
          const doc = (await inOrg(org, (c) => c.query('select id from playbook.documents')))
            .rows[0]
          await inOrg(org, (c) => c.query(DOCUMENT_CLEANUP_DONE, [org, doc.id, 1]))
        },
      },
      {
        kind: 'consumed_purge',
        // Completed 16 days ago is purgeable (the cutoff is 15); completed 2 hours ago is not.
        due: async (org) => {
          await insertDoneMessage(org, 16 * 24)
        },
        notDue: async (org) => {
          await insertDoneMessage(org, 2)
        },
        finish: async (org) => {
          await asOwner(org, (c) => c.query('delete from playbook.consumed_message'))
        },
      },
      {
        kind: 'idempotency_purge',
        due: async (org) => {
          await inOrg(org, (c) =>
            c.query(
              `insert into playbook.idempotency_keys (organization_id, user_id, route, key, request_hash, created_at)
               values ($1, $2, 'documents.upload', $3, $4, clock_timestamp() - interval '25 hours')`,
              [org, newUser(), `key-${hex()}`, hashOf('x')]
            )
          )
        },
        notDue: async (org) => {
          await inOrg(org, (c) =>
            c.query(
              `insert into playbook.idempotency_keys (organization_id, user_id, route, key, request_hash, created_at)
               values ($1, $2, 'documents.upload', $3, $4, clock_timestamp() - interval '2 hours')`,
              [org, newUser(), `key-${hex()}`, hashOf('x')]
            )
          )
        },
        finish: async (org) => {
          await asOwner(org, (c) => c.query('delete from playbook.idempotency_keys'))
        },
      },
      {
        kind: 'purge_spent',
        due: async (org) => {
          const doc = await mustAdd(org)
          await remove(org, doc.id)
          await asOwner(org, (c) =>
            c.query(
              `update playbook.documents
                  set purge_attempts = 20, purge_started_at = clock_timestamp(), purge_lease_until = clock_timestamp() - interval '1 second'
                where id = $1`,
              [doc.id]
            )
          )
        },
        notDue: async (org) => {
          const doc = await mustAdd(org)
          await remove(org, doc.id)
        },
        finish: async (org) => {
          const spent = (
            await inOrg(org, (c) => c.query(DOCUMENT_LIST_SPENT_PURGES, [org, '', 10]))
          ).rows[0]
          await inOrg(org, (c) => c.query(DOCUMENT_PURGE_RESET, [org, spent.id]))
        },
      },
      {
        kind: 'orphan_sweep',
        // An upload attempt made 26 hours ago, with nothing else: swept 25 hours after the attempt.
        due: async (org) => {
          await insertKey(org, 26)
        },
        // An attempt made just now is not due for 25 hours.
        notDue: async (org) => {
          await insertKey(org, 0)
        },
        finish: async (org) => {
          await inOrg(org, (c) => c.query(ORPHAN_SWEEP_DONE, [org, new Date()]))
        },
      },
    ]

    test('every kind is covered', () => {
      expect(cases.map((c) => c.kind).sort()).toEqual([...WORK_KINDS].sort())
    })

    test.each(cases)(
      '$kind: returns exactly the Organizations with due work, in id order, paging, and nothing for the others',
      async (c) => {
        const f = family(5)
        const [due1, none, due2, later, due3] = f.ids as [string, string, string, string, string]
        await c.due(due1)
        await c.due(due2)
        await c.due(due3)
        await c.notDue(later)
        // `none` has no work of any kind at all.
        for (const batch of [1, 2, 500]) {
          expect(await sweep(c.kind, f, batch)).toEqual([due1, due2, due3])
        }
        expect(none).not.toBe(later)
        // The cursor is exclusive.
        expect(await page(c.kind, due1, 500)).not.toContain(due1)
        // A null batch is one row, and a huge one is clamped to the cap, not refused.
        expect(await page(c.kind, f.after, null)).toHaveLength(1)
        expect((await page(c.kind, f.after, 2_000_000_000)).length).toBeLessThanOrEqual(500)
        expect((await page(c.kind, f.after, 0)).length).toBe(1)
        expect((await page(c.kind, f.after, -5)).length).toBe(1)
      }
    )

    test.each(cases.filter((c) => c.finish))(
      '$kind: finished work drops out and its hint is removed by the sweep that meets it',
      async (c) => {
        const f = family(2)
        const [a, b] = f.ids as [string, string]
        await c.due(a)
        await c.due(b)
        expect(await sweep(c.kind, f, 10)).toEqual([a, b])
        await c.finish?.(a)
        expect(await sweep(c.kind, f, 10)).toEqual([b])
        expect(await hintOf(c.kind, a)).toBeUndefined()
        expect(await hintOf(c.kind, b)).toBeDefined()
      }
    )

    test('a not-yet-due hint is moved to the next due time, never later than real work', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await remove(org, doc.id)
      const hint = await hintOf('purge_due', org)
      const real = (await row(org, doc.id)).purge_due_at as Date
      // The hint was noted at the document's own purge time, not later.
      expect(new Date(hint.due_at).getTime()).toBeLessThanOrEqual(real.getTime())
      expect(await page('purge_due', org.slice(0, -1), 500)).not.toContain(org)
    })

    test('the all-zero global scope is returned for consumed messages and for no other kind', async () => {
      const token = crypto.randomUUID()
      await inOrg(ZERO_ORG, (c) =>
        c.query(CONSUMED_CLAIM, ['c', ZERO_ORG, `g-${hex()}`, token, 60_000])
      )
      await asOwner(ZERO_ORG, (c) =>
        c.query(
          `insert into playbook.consumed_message (consumer, organization_id, message_id, state, claim_token, completed_at)
           values ('c', $1, $2, 'done', gen_random_uuid(), clock_timestamp() - interval '16 days')`,
          [ZERO_ORG, `old-${hex()}`]
        )
      )
      expect(await page('consumed_purge', '', 500)).toContain(ZERO_ORG)
      for (const kind of WORK_KINDS.filter((k) => k !== 'consumed_purge')) {
        expect(await page(kind, '', 500)).not.toContain(ZERO_ORG)
      }
      await asOwner(ZERO_ORG, (c) => c.query('delete from playbook.consumed_message'))
      expect(await page('consumed_purge', '', 500)).not.toContain(ZERO_ORG)
    })

    test('an unknown or null kind is refused', async () => {
      for (const kind of ['nope', null, '']) {
        expect(await rejectionOf(page(kind as string, null, 5))).toContain('unknown kind of work')
      }
    })

    test('it refuses to run inside an Organization scope, and unscoped it returns ids and a resume point and ends unscoped', async () => {
      const org = newOrg()
      await mustAdd(org)
      expect(
        await rejectionOf(
          inOrg(org, (c) => c.query(ORGANIZATIONS_WITH_WORK, ['jobs_due', org.slice(0, -1), 500]))
        )
      ).toContain('outside any Organization')
      const c = await playbook.connect()
      try {
        await c.query('begin')
        const result = await c.query(ORGANIZATIONS_WITH_WORK, ['jobs_due', org.slice(0, -1), 1])
        expect(result.fields.map((f) => f.name)).toEqual(['organization_id', 'resume_after'])
        const scope = await c.query(
          `select coalesce(current_setting('app.organization_id', true), '') as s`
        )
        expect(scope.rows[0].s).toBe('')
      } finally {
        await c.query('rollback')
        c.release()
      }
    })

    test('2,000 stale hints: each call does bounded work, and repeated calls reach every real Organization and end', async () => {
      const prefix = hex().slice(0, 16)
      const at = (i: number) => `org_${prefix}${i.toString(16).padStart(16, '0')}`
      await owner.query(
        `insert into playbook.work_hints (kind, organization_id, due_at)
         select 'jobs_due', 'org_' || $1 || lpad(to_hex(i), 16, '0'), clock_timestamp() - interval '1 hour'
           from generate_series(1, 2000) i where i <> 1000`,
        [prefix]
      )
      const real = [at(1000), at(2001)]
      for (const org of real) {
        await mustAdd(org)
      }
      const remaining = async () =>
        Number(
          (
            await owner.query(
              `select count(*)::int as n from playbook.work_hints where kind = 'jobs_due' and organization_id like $1`,
              [`org_${prefix}%`]
            )
          ).rows[0].n
        )
      expect(await remaining()).toBe(2001)
      const first = discoveredOrganizations(await rawPage('jobs_due', `org_${prefix}`, 10))
      // A batch of 10 visits at most 40 hints: at most 40 stale hints are gone after one call.
      expect(await remaining()).toBeGreaterThanOrEqual(2001 - 40)
      expect(first.resumeAfter).not.toBeNull()
      const found: string[] = []
      let cursor: string | null = `org_${prefix}`
      let calls = 0
      for (; calls < 500 && cursor; calls++) {
        const result = discoveredOrganizations(await rawPage('jobs_due', cursor, 10))
        found.push(...result.organizations.filter((id) => id.startsWith(`org_${prefix}`)))
        cursor =
          result.resumeAfter?.startsWith(`org_${prefix}`) === true ? result.resumeAfter : null
      }
      expect(calls).toBeLessThan(500)
      expect(found).toEqual(real)
      // The stale hints were cleaned as they were met; the two real ones stay.
      expect(await remaining()).toBe(2)
    })

    test('another service role cannot run it, and the playbook role cannot read the registry', async () => {
      for (const pool of [core, auth]) {
        expect(
          await rejectionOf(pool.query(ORGANIZATIONS_WITH_WORK, ['purge_due', '', 5]))
        ).toMatch(/permission denied/)
      }
      expect(await rejectionOf(playbook.query('select * from playbook.work_hints'))).toContain(
        'permission denied'
      )
      expect(
        await rejectionOf(
          playbook.query(
            `insert into playbook.work_hints (kind, organization_id, due_at) values ('jobs_due', $1, now())`,
            [newOrg()]
          )
        )
      ).toContain('permission denied')
      const grants = await owner.query(
        `select has_function_privilege('public', 'playbook.organizations_with_work(text,text,integer)', 'execute') as pub,
                has_function_privilege('closeline_playbook', 'playbook.organizations_with_work(text,text,integer)', 'execute') as svc,
                has_function_privilege('closeline_playbook', 'playbook.note_work(text,text,timestamptz)', 'execute') as note`
      )
      expect(grants.rows[0]).toEqual({ pub: false, svc: true, note: false })
    })

    test('work_hints is the only playbook table on the allowlist, holds only a kind, an Organization id and a time, and no role can touch it directly', async () => {
      expect(NON_TENANT_TABLES.filter((t) => t.startsWith('playbook.'))).toEqual([
        'playbook.work_hints',
      ])
      const columns = await owner.query(
        `select column_name from information_schema.columns
          where table_schema = 'playbook' and table_name = 'work_hints' order by column_name`
      )
      expect(columns.rows.map((r) => r.column_name)).toEqual(['due_at', 'kind', 'organization_id'])
      const privileges = [
        'SELECT',
        'INSERT',
        'UPDATE',
        'DELETE',
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER',
      ]
      for (const role of ['closeline_playbook', 'closeline_core', 'closeline_auth', 'public']) {
        for (const privilege of privileges) {
          const held = await owner.query(
            `select has_table_privilege($1, 'playbook.work_hints', $2) as held`,
            [role, privilege]
          )
          expect([role, privilege, held.rows[0].held]).toEqual([role, privilege, false])
        }
        const cols = await owner.query(
          `select has_any_column_privilege($1, 'playbook.work_hints', 'SELECT,INSERT,UPDATE,REFERENCES') as held`,
          [role]
        )
        expect([role, cols.rows[0].held]).toEqual([role, false])
      }
      // The definer functions the triggers and the discovery function run are the only way in.
      const definers = await owner.query(
        `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'playbook' and p.prosecdef and p.proname like 'note\\_%' order by p.proname`
      )
      expect(definers.rows.map((r) => r.proname)).toEqual([
        'note_consumed_work',
        'note_document_work',
        'note_idempotency_work',
        'note_job_work',
        'note_work',
      ])
    })

    test('writers noting an already-early hint do not block each other, and the sweeper skips the hint while either is open', async () => {
      const org = newOrg()
      // A key created 30 hours ago: its hint is due, six hours ago.
      await inOrg(org, (c) =>
        c.query(
          `insert into playbook.idempotency_keys (organization_id, user_id, route, key, request_hash, created_at)
           values ($1, $2, 'documents.upload', $3, $4, clock_timestamp() - interval '30 hours')`,
          [org, newUser(), `key-${hex()}`, hashOf('x')]
        )
      )
      const first = await open(org)
      const second = await open(org)
      try {
        for (const tx of [first, second]) {
          // A block here would raise 55P03 after two seconds instead of hanging the run.
          await tx.client.query(`set local lock_timeout = '2s'`)
          await tx.client.query(IDEMPOTENCY_BEGIN, [
            org,
            newUser(),
            'documents.upload',
            `key-${hex()}`,
            hashOf('x'),
          ])
        }
        expect(await page('idempotency_purge', org.slice(0, -1), 500)).not.toContain(org)
        await first.client.query('commit')
        expect(await page('idempotency_purge', org.slice(0, -1), 500)).not.toContain(org)
        await second.client.query('commit')
      } finally {
        await finish(first, second)
      }
      expect(await page('idempotency_purge', org.slice(0, -1), 500)).toContain(org)
    })

    test('two writers each noting a later and then an earlier time on one hint do not deadlock, and the hint ends at the earliest', async () => {
      const org = newOrg()
      const DAY = 86_400_000
      // Real writes as the playbook role: soft-deleting a document notes `purge_due` at a time the
      // retention argument controls, through the trigger (the role cannot call note_work itself).
      const seed = await mustAdd(org)
      const a1 = await mustAdd(org)
      const b1 = await mustAdd(org)
      const a2 = await mustAdd(org)
      const b2 = await mustAdd(org)
      // The hint now exists, due in 100 days.
      await inOrg(org, (c) => c.query(DOCUMENT_SOFT_DELETE, [org, seed.id, newUser(), 100 * DAY]))
      const softDelete = (tx: { client: PoolClient }, id: string, retentionMs: number) =>
        tx.client.query(DOCUMENT_SOFT_DELETE, [org, id, newUser(), retentionMs])
      const first = await open(org)
      const second = await open(org)
      try {
        // A later time than the hint: each finds it and takes a key share lock, no row update.
        await softDelete(first, a1.id, 200 * DAY)
        await softDelete(second, b1.id, 200 * DAY)
        // The hint is held by both, so the sweeper's lock skips it.
        const sweeper = await owner.query(
          `select 1 from (select 1 from playbook.work_hints where kind = 'purge_due' and organization_id = $1 for update skip locked) x`,
          [org]
        )
        expect(sweeper.rowCount).toBe(0)
        // An earlier time than the hint: the first upserts (no-key-exclusive on the row, which the
        // other's key share does not block); with a plain share lock this would deadlock.
        await softDelete(first, a2.id, 10 * DAY)
        // The second also upserts; it waits for the first's row update, not for a lock cycle.
        const writing = softDelete(second, b2.id, 5 * DAY)
        await untilBlocked(second.pid)
        await first.client.query('commit')
        await writing
        await second.client.query('commit')
      } finally {
        await finish(first, second)
      }
      const hint = await hintOf('purge_due', org)
      expect(new Date(hint.due_at)).toEqual(new Date((await row(org, b2.id)).purge_due_at))
    })

    test('purge_due: a sweeper that moves the hint later does not lose the writer earlier time', async () => {
      const org = newOrg()
      const first = await mustAdd(org)
      await remove(org, first.id)
      await owner.query(
        `update playbook.work_hints set due_at = clock_timestamp() - interval '1 minute' where kind = 'purge_due' and organization_id = $1`,
        [org]
      )
      const second = await mustAdd(org)
      const sweeper = await owner.connect()
      const writer = await open(org)
      try {
        await sweeper.query('begin')
        await sweeper.query(
          `select 1 from playbook.work_hints where kind = 'purge_due' and organization_id = $1 for update`,
          [org]
        )
        const writing = writer.client.query(DOCUMENT_SOFT_DELETE, [org, second.id, newUser(), 0])
        await untilBlocked(writer.pid)
        await sweeper.query(
          `update playbook.work_hints set due_at = clock_timestamp() + interval '1 day' where kind = 'purge_due' and organization_id = $1`,
          [org]
        )
        await sweeper.query('commit')
        await writing
        await writer.client.query('commit')
      } finally {
        await sweeper.query('rollback').catch(() => undefined)
        sweeper.release()
        await finish(writer)
      }
      const hint = await hintOf('purge_due', org)
      expect(hint).toBeDefined()
      expect(new Date(hint.due_at)).toEqual(new Date((await row(org, second.id)).purge_due_at))
    })

    describe('a writer racing the sweeper that is about to remove the hint', () => {
      // The sweeper holds the hint FOR UPDATE and removes it; a writer noting work in the meantime
      // takes its share lock first-come or waits for the sweeper. With the share-lock path the
      // writer waits for the sweeper's lock (the writer finds a hint early enough, so it takes
      // FOR SHARE and queues behind FOR UPDATE), then finds no row and writes the hint again.
      interface Race {
        kind: string
        /** Make the first work, so a hint exists. */
        setup: (org: string) => Promise<unknown>
        /** Start the writer's work in an open transaction: the statement that blocks. */
        write: (org: string, tx: { client: PoolClient }) => Promise<unknown>
        /** The time the written hint must have afterwards. */
        expected: (org: string, state: unknown) => Promise<Date>
        prepare?: (org: string) => Promise<unknown>
      }
      const races: Race[] = [
        {
          kind: 'purge_due',
          setup: async (org) => {
            const first = await mustAdd(org)
            await remove(org, first.id)
            return mustAdd(org)
          },
          write: (org, tx) =>
            tx.client.query(DOCUMENT_SOFT_DELETE, [
              org,
              (tx as unknown as { doc: string }).doc,
              newUser(),
              0,
            ]),
          expected: async (org, state) => (await row(org, (state as Added).id)).purge_due_at,
        },
        {
          kind: 'jobs_due',
          setup: async (org) => {
            await mustAdd(org)
            return { id: newDoc(), jobId: newJob() }
          },
          write: (org, tx) => {
            const { id, jobId } = (tx as unknown as { insert: { id: string; jobId: string } })
              .insert
            return tx.client.query(DOCUMENT_INSERT, [
              org,
              id,
              'n.pdf',
              hashOf(`race ${id}`),
              10,
              'application/pdf',
              'pdf',
              newUser(),
              `${org}/${id}`,
              jobId,
              BIG,
              10 ** 12,
            ])
          },
          expected: async (org, state) =>
            (await jobRow(org, (state as { jobId: string }).jobId)).next_attempt_at,
        },
        {
          kind: 'consumed_purge',
          setup: async (org) => {
            await inOrg(org, (c) =>
              c.query(CONSUMED_CLAIM, ['c', org, 'm0', crypto.randomUUID(), 60_000])
            )
            return { message: 'm1' }
          },
          write: (org, tx) =>
            tx.client.query(CONSUMED_CLAIM, ['c', org, 'm1', crypto.randomUUID(), 120_000]),
          expected: async (org) =>
            (
              await inOrg(org, (c) =>
                c.query(
                  `select lease_expires_at from playbook.consumed_message where message_id = 'm1'`
                )
              )
            ).rows[0].lease_expires_at,
        },
        {
          kind: 'orphan_sweep',
          setup: async (org) => {
            await inOrg(org, (c) =>
              c.query(IDEMPOTENCY_BEGIN, [
                org,
                newUser(),
                'documents.upload',
                `k-${hex()}`,
                hashOf('x'),
              ])
            )
            return {}
          },
          write: (org, tx) =>
            tx.client.query(IDEMPOTENCY_BEGIN, [
              org,
              newUser(),
              'documents.upload',
              `k-${hex()}`,
              hashOf('x'),
            ]),
          // The sweeper removed the hint, so the writer wrote it again at its own attempt: 25 hours
          // after the newest key (the writer's).
          expected: async (org) =>
            (
              await asOwner(org, (c) =>
                c.query(
                  `select max(created_at) + interval '25 hours' as d from playbook.idempotency_keys`
                )
              )
            ).rows[0].d,
        },
      ]

      test.each(races)(
        '$kind: the hint exists afterwards, due when the new work is',
        async (race) => {
          const org = newOrg()
          const state = await race.setup(org)
          // The hint exists and is due to be checked: make it due now so a sweeper could take it.
          await owner.query(
            `update playbook.work_hints set due_at = clock_timestamp() - interval '1 minute' where kind = $1 and organization_id = $2`,
            [race.kind, org]
          )
          expect(await hintOf(race.kind, org)).toBeDefined()
          const sweeper = await owner.connect()
          const writer = await open(org)
          try {
            await sweeper.query('begin')
            await sweeper.query(
              `select 1 from playbook.work_hints where kind = $1 and organization_id = $2 for update`,
              [race.kind, org]
            )
            if (race.kind === 'jobs_due') {
              await writer.client.query(QUOTA_LOCK, [org])
            }
            const target = Object.assign(writer, {
              doc: (state as Added).id,
              insert: state,
            })
            const writing = race.write(org, target)
            await untilBlocked(writer.pid)
            // The sweeper saw no work (as it would after the work finished) and removes the hint.
            await sweeper.query(
              `delete from playbook.work_hints where kind = $1 and organization_id = $2`,
              [race.kind, org]
            )
            await sweeper.query('commit')
            await writing
            await writer.client.query('commit')
          } finally {
            await sweeper.query('rollback').catch(() => undefined)
            sweeper.release()
            await finish(writer)
          }
          const hint = await hintOf(race.kind, org)
          expect(hint).toBeDefined()
          expect(new Date(hint.due_at)).toEqual(new Date(await race.expected(org, state)))
        }
      )
    })

    test('a job claimed and heartbeated does not move the hint; a delete notes the purge time', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      const before = (await hintOf('jobs_due', org)).due_at
      const claimed = (await claimJobs(org)).rows[0]
      // The claim moved the job to running with a lease later than the queued time: the hint stays.
      expect((await hintOf('jobs_due', org)).due_at).toEqual(before)
      await inOrg(org, (c) =>
        c.query(INGESTION_JOB_HEARTBEAT, [org, claimed.id, claimed.claim_token, 60_000])
      )
      expect((await hintOf('jobs_due', org)).due_at).toEqual(before)
      await remove(org, doc.id)
      expect(await hintOf('purge_due', org)).toBeDefined()
      expect(await hintOf('cleanup_pending', org)).toBeDefined()
    })
  })

  describe('erasure', () => {
    /** Documents in every state, one Organization: uploaded, processing, ready, failed, deleted twice, purge leased. */
    const everyState = async (org: string) => {
      const uploaded = await mustAdd(org)
      const processing = await mustAdd(org)
      const ready = await mustAdd(org)
      const failed = await mustAdd(org)
      const deletedLater = await mustAdd(org)
      const deletedDue = await mustAdd(org)
      const leased = await mustAdd(org)
      const claims = (await claimJobs(org, 4)).rows
      const tokenOf = (jobId: string) => claims.find((r) => r.id === jobId)?.claim_token as string
      // Claim order is by due time: the first four documents, uploaded to failed, are the ones claimed.
      await inOrg(org, (c) =>
        c.query(INGESTION_JOB_COMPLETE, [org, ready.jobId, tokenOf(ready.jobId)])
      )
      await inOrg(org, (c) =>
        c.query(INGESTION_JOB_FAIL, [org, failed.jobId, tokenOf(failed.jobId), 'no_text'])
      )
      await remove(org, deletedLater.id)
      await remove(org, deletedDue.id)
      await makeDue(org, deletedDue.id)
      await remove(org, leased.id)
      await makeDue(org, leased.id)
      await claimPurge(org, 1, 600_000)
      await inOrg(org, (c) => c.query(INDEX_SETTINGS_UPSERT, [org, 'model-a', 8]))
      const token = crypto.randomUUID()
      await inOrg(org, (c) => c.query(CONSUMED_CLAIM, ['c', org, 'm1', token, 60_000]))
      await inOrg(org, (c) => c.query(CONSUMED_COMPLETE, ['c', org, 'm1', token]))
      await inOrg(org, (c) =>
        c.query(
          `insert into playbook.idempotency_keys (organization_id, user_id, route, key, request_hash)
           values ($1, $2, 'documents.upload', 'k1', $3), ($1, $4, $5, 'k2', $3)`,
          [org, newUser(), hashOf('x'), ZERO_USER, REMOVE_ALL_IDEMPOTENCY_ROUTE]
        )
      )
      return { uploaded, processing, ready, failed, deletedLater, deletedDue, leased }
    }

    /** Run every purge step for what is deleted and due, until nothing is left to claim. */
    const purgeAll = async (org: string) => {
      for (let round = 0; round < 10; round++) {
        await expireLeases(org)
        await asOwner(org, (c) =>
          c.query(
            `update playbook.documents set purge_lease_until = clock_timestamp() - interval '1 second'
              where purge_lease_until is not null`
          )
        )
        const claimed = (await claimPurge(org, 100, 600_000)).rows
        if (claimed.length === 0) {
          return
        }
        for (const doc of claimed) {
          const begin = await inOrg(org, (c) =>
            c.query(DOCUMENT_CLEANUP_BEGIN, [org, doc.id, doc.deletion_seq])
          )
          expect(begin.rows[0]).toMatchObject({ clear: true })
          await inOrg(org, (c) => c.query(DOCUMENT_CLEANUP_DONE, [org, doc.id, doc.deletion_seq]))
          const done = await inOrg(org, (c) => c.query(DOCUMENT_PURGE_COMPLETE, [org, doc.id]))
          expect(done.rowCount).toBe(1)
        }
      }
    }

    test('documents in every state end empty after repeated erase batches and purges; a second Organization is untouched', async () => {
      const org = newOrg()
      const other = newOrg()
      const mine = await everyState(org)
      await everyState(other)
      const otherBefore = await snapshot(other)
      const otherUsage = await usageOf(other)
      expect(Number((await usageOf(org)).document_count)).toBe(7)

      // Erase in batches of 3 until a call returns nothing.
      const taken: { id: string; changed: boolean; deletion_seq: number; epoch: number }[] = []
      for (let calls = 0; calls < 10; calls++) {
        const result = await erase(org, 3)
        if (result.rowCount === 0) {
          break
        }
        expect(result.rowCount).toBeLessThanOrEqual(3)
        taken.push(...result.rows)
      }
      expect(taken.map((t) => t.id).sort()).toEqual(
        Object.values(mine)
          .map((d) => d.id)
          .sort()
      )
      // The four live documents were deleted by this erasure; the three deleted ones only had their time pulled.
      expect(taken.filter((t) => t.changed)).toHaveLength(4)
      for (const t of taken.filter((x) => x.changed)) {
        expect(t).toMatchObject({ deletion_seq: 1, epoch: 1 })
      }
      // A repeat is idempotent: nothing is left to take.
      expect((await erase(org)).rowCount).toBe(0)
      expect((await erase(org, null)).rowCount).toBe(0)

      const states = await inOrg(org, (c) =>
        c.query(
          `select state, restore_barred_at is not null as barred, purge_due_at <= clock_timestamp() as due from playbook.documents`
        )
      )
      expect(states.rows).toHaveLength(7)
      for (const r of states.rows) {
        expect(r).toEqual({ state: 'deleted', barred: true, due: true })
      }
      const active = await inOrg(org, (c) =>
        c.query(
          `select count(*)::int as n from playbook.ingestion_jobs where state in ('queued', 'running')`
        )
      )
      expect(active.rows[0].n).toBe(0)

      await purgeAll(org)
      const left = await inOrg(org, (c) => c.query('select 1 from playbook.documents'))
      expect(left.rowCount).toBe(0)
      expect(Number((await usageOf(org)).document_count)).toBe(0)

      // The rest goes only once no document is left.
      const status = () => inOrg(org, (c) => c.query(ORGANIZATION_REMOVAL_STATUS, [org]))
      expect((await status()).rows[0]).toEqual({
        no_documents: true,
        no_settings: false,
        no_usage: false,
        no_messages: false,
        removed: false,
      })
      const rest = await inOrg(org, (c) =>
        c.query(ORGANIZATION_REMOVE_REST, [org, REMOVE_ALL_IDEMPOTENCY_ROUTE])
      )
      expect(rest.rows[0]).toEqual({ removed: true })
      expect((await status()).rows[0]).toEqual({
        no_documents: true,
        no_settings: true,
        no_usage: true,
        no_messages: true,
        removed: true,
      })
      // Idempotent by end state; the remove-all call's own key survives, the upload key does not.
      expect(
        (
          await inOrg(org, (c) =>
            c.query(ORGANIZATION_REMOVE_REST, [org, REMOVE_ALL_IDEMPOTENCY_ROUTE])
          )
        ).rows[0]
      ).toEqual({ removed: true })
      const keys = await inOrg(org, (c) => c.query('select route from playbook.idempotency_keys'))
      expect(keys.rows).toEqual([{ route: REMOVE_ALL_IDEMPOTENCY_ROUTE }])
      for (const kind of WORK_KINDS.filter(
        (k) => k !== 'idempotency_purge' && k !== 'orphan_sweep'
      )) {
        expect(await hintOf(kind, org)).toBeUndefined()
      }
      // The upload attempt may have left an object only the sweep removes: its marker and hint stay.
      expect(await hintOf('orphan_sweep', org)).toBeDefined()
      expect(
        (await asOwner(org, (c) => c.query('select 1 from playbook.orphan_sweeps'))).rowCount
      ).toBe(1)

      // The second Organization: every row and its counter exactly as before.
      expect(await snapshot(other)).toEqual(otherBefore)
      expect(await usageOf(other)).toEqual(otherUsage)
    })

    test('a barred document cannot come back: neither restore, and an upload of its content makes a new document', async () => {
      const org = newOrg()
      const doc = await mustAdd(org, 'same content')
      await remove(org, doc.id)
      expect((await erase(org)).rows).toEqual([
        expect.objectContaining({ id: doc.id, changed: false }),
      ])
      expect((await restore(org, doc.id)).rowCount).toBe(0)
      expect((await restore(org, doc.id, true)).rowCount).toBe(0)
      const got = (await inOrg(org, (c) => c.query(DOCUMENT_GET, [org, doc.id]))).rows[0]
      expect(got).toMatchObject({ state: 'deleted', not_restorable: true })
      expect(
        (await inOrg(org, (c) => c.query(DOCUMENT_BY_HASH, [org, hashOf('same content')]))).rowCount
      ).toBe(0)
      const again = await mustAdd(org, 'same content')
      expect(again.id).not.toBe(doc.id)
      // The new one is a live document, untouched by the earlier barred one, and the next erase takes it.
      expect((await row(org, again.id)).state).toBe('uploaded')
      expect((await erase(org)).rows.map((r) => r.id)).toEqual([again.id])
    })

    test('erasing an already deleted document pulls its purge time to now and never pushes it back', async () => {
      const org = newOrg()
      const later = await mustAdd(org)
      const earlier = await mustAdd(org)
      await remove(org, later.id)
      await remove(org, earlier.id)
      await makeDue(org, earlier.id)
      const before = (await row(org, earlier.id)).purge_due_at as Date
      await erase(org)
      expect((await row(org, earlier.id)).purge_due_at.getTime()).toBe(before.getTime())
      const pulled = (await row(org, later.id)).purge_due_at as Date
      expect(pulled.getTime()).toBeLessThanOrEqual(Date.now() + 1000)
    })

    describe('two connections', () => {
      test('erase against a job claim: the erase waits for the claim, then cancels the job', async () => {
        const org = newOrg()
        const doc = await mustAdd(org)
        const claiming = await open(org)
        const erasing = await open(org)
        try {
          const claimed = await claiming.client.query(INGESTION_JOB_CLAIM, [org, 10, 600_000, null])
          expect(claimedJobs(claimed.rows).jobs).toHaveLength(1)
          const waiting = erasing.client.query(DOCUMENT_ERASE_BATCH, [org, 10, ZERO_USER])
          await untilBlocked(erasing.pid)
          await claiming.client.query('commit')
          expect((await waiting).rows[0]).toMatchObject({ id: doc.id, changed: true })
          await erasing.client.query('commit')
        } finally {
          await finish(claiming, erasing)
        }
        expect(await row(org, doc.id)).toMatchObject({ state: 'deleted' })
        expect(await jobRow(org, doc.jobId)).toMatchObject({ state: 'cancelled' })
      })

      test('erase against an uncommitted restore: the document ends deleted and barred, the stale job is cancelled by the claim', async () => {
        const org = newOrg()
        const doc = await mustAdd(org)
        await remove(org, doc.id)
        const restoring = await open(org)
        const erasing = await open(org)
        const restoreJob = newJob()
        try {
          expect(
            (await restoring.client.query(DOCUMENT_RESTORE_FOR_UPLOAD, [org, doc.id, restoreJob]))
              .rowCount
          ).toBe(1)
          const waiting = erasing.client.query(DOCUMENT_ERASE_BATCH, [org, 10, ZERO_USER])
          await untilBlocked(erasing.pid)
          await restoring.client.query('commit')
          expect((await waiting).rows[0]).toMatchObject({
            id: doc.id,
            changed: true,
            deletion_seq: 2,
          })
          await erasing.client.query('commit')
        } finally {
          await finish(restoring, erasing)
        }
        expect(await row(org, doc.id)).toMatchObject({ state: 'deleted' })
        expect((await row(org, doc.id)).restore_barred_at).not.toBeNull()
        // The restore's job was committed after the erase's snapshot: the claim cancels it, never runs it.
        expect(claimedJobs((await claimJobs(org)).rows)).toEqual({
          jobs: [],
          cancelled: 1,
          lost: 0,
        })
        expect(await jobRow(org, restoreJob)).toMatchObject({ state: 'cancelled' })
        // And the explicit restore is refused for good.
        expect((await restore(org, doc.id)).rowCount).toBe(0)
      })

      test('erase against an upload in flight: the upload survives that call and the next one takes it; the rest waits for it', async () => {
        const org = newOrg()
        const existing = await mustAdd(org)
        const uploading = await open(org)
        const id = newDoc()
        try {
          await uploading.client.query(QUOTA_LOCK, [org])
          expect(
            (
              await uploading.client.query(DOCUMENT_INSERT, [
                org,
                id,
                'n.pdf',
                hashOf(`in flight ${id}`),
                10,
                'application/pdf',
                'pdf',
                newUser(),
                `${org}/${id}`,
                newJob(),
                BIG,
                10 ** 12,
              ])
            ).rowCount
          ).toBe(1)
          // The first erase does not see the uncommitted document.
          expect((await erase(org)).rows.map((r) => r.id)).toEqual([existing.id])
          // The remove-rest waits for the upload's lock, then sees the document and refuses.
          const rest = await open(org)
          try {
            const waiting = rest.client.query(ORGANIZATION_REMOVE_REST, [
              org,
              REMOVE_ALL_IDEMPOTENCY_ROUTE,
            ])
            await untilBlocked(rest.pid)
            await uploading.client.query('commit')
            expect((await waiting).rows[0]).toEqual({ removed: false })
            await rest.client.query('commit')
          } finally {
            await finish(rest)
          }
        } finally {
          await finish(uploading)
        }
        expect((await row(org, id)).state).toBe('uploaded')
        expect((await erase(org)).rows.map((r) => r.id)).toEqual([id])
      })

      test('erase against a purge claim that holds the row: it waits, then bars the document and keeps the lease', async () => {
        const org = newOrg()
        const doc = await mustAdd(org)
        await remove(org, doc.id)
        await makeDue(org, doc.id)
        const claiming = await open(org)
        const erasing = await open(org)
        try {
          expect(
            (await claiming.client.query(DOCUMENT_PURGE_CLAIM, [org, 10, 600_000])).rowCount
          ).toBe(1)
          const waiting = erasing.client.query(DOCUMENT_ERASE_BATCH, [org, 10, ZERO_USER])
          await untilBlocked(erasing.pid)
          await claiming.client.query('commit')
          expect((await waiting).rows[0]).toMatchObject({ id: doc.id, changed: false })
          await erasing.client.query('commit')
        } finally {
          await finish(claiming, erasing)
        }
        const after = await row(org, doc.id)
        expect(after.restore_barred_at).not.toBeNull()
        expect(after.purge_started_at).not.toBeNull()
        expect(after.purge_attempts).toBe(1)
      })

      test('an immediate purge waits for a claim instead of deadlocking with it, and refuses a live lease', async () => {
        const org = newOrg()
        const doc = await mustAdd(org)
        // A running job with an unexpired lease on a deleted, erased, purge-claimed document whose
        // cleanup is recorded: the state a claim that raced the delete leaves.
        const claimed = (await claimJobs(org)).rows[0]
        await erase(org)
        await asOwner(org, (c) =>
          c.query(
            `update playbook.ingestion_jobs set state = 'running', claim_token = $2::uuid, finished_at = null,
                    next_attempt_at = clock_timestamp() + interval '1 hour' where id = $1`,
            [claimed.id, claimed.claim_token]
          )
        )
        const purge = (await claimPurge(org)).rows[0]
        expect(purge.id).toBe(doc.id)
        await inOrg(org, (c) => c.query(DOCUMENT_CLEANUP_DONE, [org, doc.id, purge.deletion_seq]))

        const claiming = await open(org)
        const purging = await open(org)
        const probe = await open(org)
        try {
          // The claim holds the job row, as the claim statement does, and next wants the document.
          await claiming.client.query(
            'select 1 from playbook.ingestion_jobs where id = $1 for update',
            [claimed.id]
          )
          const waiting = purging.client.query(DOCUMENT_PURGE_COMPLETE, [org, doc.id])
          await untilBlocked(purging.pid)
          // The purge is waiting on the job row and holds no lock on the document: the claim's
          // document step goes through at once, which is the other half of a deadlock that is not there.
          await probe.client.query(
            'select 1 from playbook.documents where id = $1 for update nowait',
            [doc.id]
          )
          await probe.client.query('rollback')
          await claiming.client.query(
            'update playbook.documents set updated_at = clock_timestamp() where id = $1',
            [doc.id]
          )
          await claiming.client.query('commit')
          // With the lease unexpired the purge removes nothing, and says so.
          expect((await waiting).rowCount).toBe(0)
          await purging.client.query('commit')
        } finally {
          await finish(claiming, purging, probe)
        }
        expect(await row(org, doc.id)).toMatchObject({ state: 'deleted' })
        await expireLeases(org)
        const done = await inOrg(org, (c) => c.query(DOCUMENT_PURGE_COMPLETE, [org, doc.id]))
        expect(done.rowCount).toBe(1)
        expect(await jobRow(org, claimed.id)).toBeUndefined()
      })
    })

    describe('the rest of an Organization', () => {
      test('it refuses while any document row exists, soft-deleted ones included, and deletes nothing', async () => {
        const org = newOrg()
        const doc = await mustAdd(org)
        await inOrg(org, (c) => c.query(INDEX_SETTINGS_UPSERT, [org, 'model-a', 8]))
        expect(
          (
            await inOrg(org, (c) =>
              c.query(ORGANIZATION_REMOVE_REST, [org, REMOVE_ALL_IDEMPOTENCY_ROUTE])
            )
          ).rows[0]
        ).toEqual({ removed: false })
        await remove(org, doc.id)
        expect(
          (
            await inOrg(org, (c) =>
              c.query(ORGANIZATION_REMOVE_REST, [org, REMOVE_ALL_IDEMPOTENCY_ROUTE])
            )
          ).rows[0]
        ).toEqual({ removed: false })
        const kept = await inOrg(org, (c) => c.query('select 1 from playbook.index_settings'))
        expect(kept.rowCount).toBe(1)
        expect(Number((await usageOf(org)).document_count)).toBe(1)
      })

      test('it acts only on the Organization the transaction is scoped to, and never on the global scope', async () => {
        const [a, b] = [newOrg(), newOrg()]
        await inOrg(a, (c) => c.query(INDEX_SETTINGS_UPSERT, [a, 'model-a', 8]))
        expect(
          await rejectionOf(
            inOrg(b, (c) => c.query(ORGANIZATION_REMOVE_REST, [a, REMOVE_ALL_IDEMPOTENCY_ROUTE]))
          )
        ).toContain('not scoped to this Organization')
        expect(
          await rejectionOf(
            playbook.query(ORGANIZATION_REMOVE_REST, [a, REMOVE_ALL_IDEMPOTENCY_ROUTE])
          )
        ).toContain('not scoped to this Organization')
        expect(
          await rejectionOf(
            inOrg(ZERO_ORG, (c) => c.query(ORGANIZATION_REMOVE_REST, [ZERO_ORG, 'x']))
          )
        ).toContain('not an Organization id')
        expect(
          await rejectionOf(inOrg(a, (c) => c.query(ORGANIZATION_REMOVE_REST, ['nope', 'x'])))
        ).toContain('not an Organization id')
        expect(
          (await inOrg(a, (c) => c.query('select 1 from playbook.index_settings'))).rowCount
        ).toBe(1)
        // The service role cannot delete these rows itself.
        expect(
          await rejectionOf(inOrg(a, (c) => c.query('delete from playbook.index_settings')))
        ).toContain('permission denied')
        expect(
          await rejectionOf(inOrg(a, (c) => c.query('delete from playbook.organization_usage')))
        ).toContain('permission denied')
        // Other service roles cannot run it.
        expect(await rejectionOf(core.query(ORGANIZATION_REMOVE_REST, [a, 'x']))).toMatch(
          /permission denied/
        )
      })
    })
  })

  describe('spent purges', () => {
    const spend = (org: string, id: string) =>
      asOwner(org, (c) =>
        c.query(
          `update playbook.documents
              set purge_attempts = 20, purge_started_at = clock_timestamp(),
                  purge_lease_until = clock_timestamp() - interval '1 second'
            where id = $1`,
          [id]
        )
      )

    test('they are listed by id, in pages, for one Organization, and live or merely deleted documents are not', async () => {
      const [org, other] = [newOrg(), newOrg()]
      const docs = [await mustAdd(org), await mustAdd(org), await mustAdd(org)]
      const live = await mustAdd(org)
      const notSpent = await mustAdd(org)
      for (const d of docs) {
        await remove(org, d.id)
        await spend(org, d.id)
      }
      await remove(org, notSpent.id)
      const strangers = await mustAdd(other)
      await remove(other, strangers.id)
      await spend(other, strangers.id)
      const list = async (after: string, limit: number | null) =>
        (await inOrg(org, (c) => c.query(DOCUMENT_LIST_SPENT_PURGES, [org, after, limit]))).rows
      const expected = docs.map((d) => d.id).sort()
      const first = await list('', 2)
      expect(first.map((r) => r.id)).toEqual(expected.slice(0, 2))
      expect(first[0]).toMatchObject({ purge_attempts: 20, name: 'Playbook.pdf' })
      expect(first[0]?.object_key).toContain(org)
      const second = await list(first[1]?.id, 2)
      expect(second.map((r) => r.id)).toEqual(expected.slice(2))
      expect((await list('', null)).length).toBe(1)
      expect((await list('', 2_000_000_000)).length).toBe(3)
      expect(live.id).not.toBe(notSpent.id)
      // The document is still counted, and the claim does not take it.
      expect(Number((await usageOf(org)).document_count)).toBe(5)
      await expireLeases(org)
      expect((await claimPurge(org)).rowCount).toBe(0)
    })

    test('a reset gives another round: the claim takes it, restore stays refused, and it is idempotent', async () => {
      const org = newOrg()
      const doc = await mustAdd(org, 'spent content')
      await remove(org, doc.id)
      await spend(org, doc.id)
      const reset = () => inOrg(org, (c) => c.query(DOCUMENT_PURGE_RESET, [org, doc.id]))
      expect((await reset()).rows).toEqual([{ id: doc.id, purge_attempts: 0 }])
      expect(await row(org, doc.id)).toMatchObject({
        purge_attempts: 0,
        purge_started_at: null,
        purge_lease_until: null,
        state: 'deleted',
      })
      expect((await row(org, doc.id)).restore_barred_at).not.toBeNull()
      // Not spent any more, so a second reset is a no-op, and so is a reset of a live document.
      expect((await reset()).rowCount).toBe(0)
      const live = await mustAdd(org)
      expect(
        (await inOrg(org, (c) => c.query(DOCUMENT_PURGE_RESET, [org, live.id]))).rowCount
      ).toBe(0)
      // The next purge claim takes it again (its purge time is long past), and it can be completed.
      await makeDue(org, doc.id)
      const claimed = (await claimPurge(org)).rows
      expect(claimed.map((r) => r.id)).toEqual([doc.id])
      expect(claimed[0]?.purge_attempts).toBe(1)
      expect((await restore(org, doc.id)).rowCount).toBe(0)
      expect((await restore(org, doc.id, true)).rowCount).toBe(0)
    })
  })

  describe('pending cleanups', () => {
    const FIRST = ['-infinity', ''] as const
    const pending = (org: string, cursor: readonly string[] = FIRST, size: number | null = 100) =>
      inOrg(org, (c) => c.query(DOCUMENT_LIST_PENDING_CLEANUP, [org, ...cursor, size]))
    const deletedAtText = async (org: string, id: string) =>
      (
        await asOwner(org, (c) =>
          c.query('select deleted_at::text as t from playbook.documents where id = $1', [id])
        )
      ).rows[0].t as string

    test('it lists exactly the deleted documents whose current deletion is not cleaned, and no cleaned one', async () => {
      const org = newOrg()
      const [live, deleted, cleaned, restored, again] = [
        await mustAdd(org),
        await mustAdd(org),
        await mustAdd(org),
        await mustAdd(org),
        await mustAdd(org),
      ] as [Added, Added, Added, Added, Added]
      await remove(org, deleted.id)
      await remove(org, cleaned.id)
      await inOrg(org, (c) => c.query(DOCUMENT_CLEANUP_DONE, [org, cleaned.id, 1]))
      await remove(org, restored.id)
      expect((await restore(org, restored.id)).rowCount).toBe(1)
      // Deleted, cleaned, restored and deleted again: the second deletion is pending (deletion_seq 2).
      await remove(org, again.id)
      await inOrg(org, (c) => c.query(DOCUMENT_CLEANUP_DONE, [org, again.id, 1]))
      expect((await restore(org, again.id)).rowCount).toBe(1)
      await remove(org, again.id)
      const rows = (await pending(org)).rows
      expect(rows.map((r) => r.id).sort()).toEqual([deleted.id, again.id].sort())
      expect(rows.find((r) => r.id === again.id)).toMatchObject({ deletion_seq: 2 })
      expect(rows.find((r) => r.id === deleted.id)).toMatchObject({ deletion_seq: 1, epoch: 1 })
      expect(rows.map((r) => r.id)).not.toContain(live.id)
      // A row carries what DOCUMENT_CLEANUP_BEGIN takes, and begin accepts it.
      const begin = await inOrg(org, (c) =>
        c.query(DOCUMENT_CLEANUP_BEGIN, [org, deleted.id, rows[0]?.deletion_seq ?? 1])
      )
      expect(begin.rowCount).toBe(1)
      // Recording the cleanup removes it from the list; a purged document is gone with its row.
      await inOrg(org, (c) => c.query(DOCUMENT_CLEANUP_DONE, [org, deleted.id, 1]))
      expect((await pending(org)).rows.map((r) => r.id)).toEqual([again.id])
    })

    test('it agrees with the cleanup_pending discovery kind: an Organization is named exactly when the list has a row', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      await remove(org, doc.id)
      await asOwner(org, (c) =>
        c.query(
          `update playbook.documents set deleted_at = deleted_at - interval '10 minutes', purge_due_at = purge_due_at - interval '10 minutes' where id = $1`,
          [doc.id]
        )
      )
      expect((await pending(org)).rowCount).toBe(1)
      expect(await page('cleanup_pending', org.slice(0, -1), 500)).toContain(org)
      await inOrg(org, (c) => c.query(DOCUMENT_CLEANUP_DONE, [org, doc.id, 1]))
      expect((await pending(org)).rowCount).toBe(0)
      expect(await page('cleanup_pending', org.slice(0, -1), 500)).not.toContain(org)
    })

    test('it pages a deleted_at tie across the page boundary without a repeat or a miss, and clamps the page', async () => {
      const org = newOrg()
      const docs: Added[] = []
      for (let i = 0; i < 5; i++) {
        docs.push(await mustAdd(org))
      }
      for (const d of docs) {
        await remove(org, d.id)
      }
      // Four share one deletion time; the fifth is older.
      await asOwner(org, (c) =>
        c.query(
          `update playbook.documents set deleted_at = '2026-01-01 00:00:00.123456+00' where id = any($1)`,
          [docs.slice(1).map((d) => d.id)]
        )
      )
      await asOwner(org, (c) =>
        c.query(
          `update playbook.documents set deleted_at = '2025-12-31 00:00:00+00' where id = $1`,
          [(docs[0] as Added).id]
        )
      )
      const seen: string[] = []
      let cursor: readonly string[] = FIRST
      const sizes: number[] = []
      for (let pages = 0; pages < 6; pages++) {
        const rows = (await pending(org, cursor, 2)).rows
        if (rows.length === 0) {
          break
        }
        sizes.push(rows.length)
        seen.push(...rows.map((r) => r.id))
        const last = rows.at(-1)?.id as string
        cursor = [await deletedAtText(org, last), last]
      }
      expect(sizes).toEqual([2, 2, 1])
      expect(seen).toEqual([
        (docs[0] as Added).id,
        ...docs
          .slice(1)
          .map((d) => d.id)
          .sort(),
      ])
      // A huge, zero, negative or null page size is clamped, not refused.
      for (const size of [2_000_000_000, 0, -3, null]) {
        const rows = (await pending(org, FIRST, size)).rows
        expect(rows.length).toBeGreaterThanOrEqual(1)
        expect(rows.length).toBeLessThanOrEqual(500)
      }
      expect((await pending(org, FIRST, null)).rowCount).toBe(1)
    })

    test('another Organization sees none of them, and the owner in scope sees them as a control', async () => {
      const [a, b] = [newOrg(), newOrg()]
      const doc = await mustAdd(a)
      await remove(a, doc.id)
      expect((await pending(b)).rowCount).toBe(0)
      expect(
        (await inOrg(b, (c) => c.query(DOCUMENT_LIST_PENDING_CLEANUP, [a, ...FIRST, 100]))).rowCount
      ).toBe(0)
      const control = await asOwner(a, (c) =>
        c.query(DOCUMENT_LIST_PENDING_CLEANUP, [a, ...FIRST, 100])
      )
      expect(control.rows.map((r) => r.id)).toEqual([doc.id])
      const crossed = await asOwner(b, (c) =>
        c.query(DOCUMENT_LIST_PENDING_CLEANUP, [a, ...FIRST, 100])
      )
      expect(crossed.rowCount).toBe(0)
    })

    test('under a generic plan it reads documents_cleanup_idx forward, with no Sort', async () => {
      interface PlanNode {
        'Node Type': string
        'Relation Name'?: string
        'Index Name'?: string
        'Scan Direction'?: string
        Plans?: PlanNode[]
      }
      const walk = (n: PlanNode): PlanNode[] => [n, ...(n.Plans ?? []).flatMap(walk)]
      const org = newOrg()
      const plan = await inOrg(org, async (c) => {
        await c.query('set local plan_cache_mode = force_generic_plan')
        await c.query('set local enable_seqscan = off')
        await c.query(
          `prepare pending_probe(text, timestamptz, text, int) as ${DOCUMENT_LIST_PENDING_CLEANUP}`
        )
        try {
          const r = await c.query(
            `explain (format json, costs off) execute pending_probe('${org}', '-infinity', '', 50)`
          )
          return r.rows[0]['QUERY PLAN'][0].Plan as PlanNode
        } finally {
          await c.query('deallocate pending_probe')
        }
      })
      const nodes = walk(plan)
      const detail = `plan:\n${JSON.stringify(plan, null, 1)}`
      const scans = nodes.filter((n) => n['Relation Name'] === 'documents')
      // Asserted: one scan of documents, an Index Scan on documents_cleanup_idx, forward (the keyset
      // order is ascending), and no Sort node anywhere in the plan.
      expect([scans.length, detail]).toEqual([1, detail])
      expect([
        scans[0]?.['Node Type'],
        scans[0]?.['Index Name'],
        scans[0]?.['Scan Direction'],
        detail,
      ]).toEqual(['Index Scan', 'documents_cleanup_idx', 'Forward', detail])
      expect([nodes.some((n) => n['Node Type'] === 'Sort'), detail]).toEqual([false, detail])
    })
  })

  describe('the orphan sweep', () => {
    const attempt = (org: string) =>
      inOrg(org, (c) =>
        c.query(IDEMPOTENCY_BEGIN, [org, newUser(), 'documents.upload', `k-${hex()}`, hashOf('x')])
      )
    const done = (org: string, through: Date = new Date()) =>
      inOrg(org, (c) => c.query(ORPHAN_SWEEP_DONE, [org, through]))
    const sweptOf = async (org: string) =>
      (await asOwner(org, (c) => c.query('select swept_through from playbook.orphan_sweeps')))
        .rows[0]?.swept_through as Date | undefined
    const named = async (org: string) =>
      (await page('orphan_sweep', org.slice(0, -1), 500)).includes(org)

    test('the age is 25 hours; an Organization with one upload attempt and nothing else is returned after it, not before, and not again once swept', async () => {
      expect(ORPHAN_SWEEP_AGE_MS).toBe(25 * 3_600_000)
      const org = newOrg()
      await attempt(org)
      const hint = await hintOf('orphan_sweep', org)
      const wait = new Date(hint.due_at).getTime() - Date.now()
      expect(wait).toBeGreaterThan(ORPHAN_SWEEP_AGE_MS - 60_000)
      expect(wait).toBeLessThanOrEqual(ORPHAN_SWEEP_AGE_MS)
      // Before the due time: not returned, and the hint is kept.
      expect(await named(org)).toBe(false)
      expect(await hintOf('orphan_sweep', org)).toBeDefined()
      // 24.9 hours after the attempt: still not returned. 25.1 hours after: returned.
      const early = newOrg()
      await insertKey(early, 24.9)
      expect(await named(early)).toBe(false)
      const due = newOrg()
      await insertKey(due, 25.1)
      expect(await named(due)).toBe(true)
      // Marked swept: through the cut, which covers that attempt; not returned again, hint removed.
      const marked = await done(due)
      expect(marked.rows).toEqual([{ swept_through: expect.any(Date), more: false }])
      expect(await named(due)).toBe(false)
      expect(await hintOf('orphan_sweep', due)).toBeUndefined()
      expect(await sweptOf(due)).toBeInstanceOf(Date)
    })

    test('a newer attempt keeps the Organization pending: the sweep covers the old attempt, the hint moves to the newer one', async () => {
      const org = newOrg()
      await insertKey(org, 26)
      expect(await named(org)).toBe(true)
      await attempt(org)
      const marked = await done(org)
      // The attempt made just now is not covered by a sweep through 24 hours ago.
      expect(marked.rows[0]).toMatchObject({ more: true })
      const hint = await hintOf('orphan_sweep', org)
      expect(hint).toBeDefined()
      expect(new Date(hint.due_at).getTime() - Date.now()).toBeGreaterThan(
        ORPHAN_SWEEP_AGE_MS - 60_000
      )
      expect(await named(org)).toBe(false)
      // An older time, or a repeat, is harmless and the recorded time never goes back.
      const before = (await sweptOf(org)) as Date
      const older = await done(org, new Date(Date.now() - 72 * 3_600_000))
      expect(older.rows[0]).toMatchObject({ more: true })
      expect((await sweptOf(org))?.getTime()).toBeGreaterThanOrEqual(before.getTime())
      // A time in the future is cut to 24 hours before now.
      const future = await done(org, new Date(Date.now() + 10 * 86_400_000))
      expect((future.rows[0].swept_through as Date).getTime()).toBeLessThan(
        Date.now() - 23 * 3_600_000
      )
    })

    test('an Organization that never attempted an upload has nothing to mark, and done creates no hint', async () => {
      const org = newOrg()
      const marked = await done(org)
      expect(marked.rows[0]).toMatchObject({ more: false })
      expect(await hintOf('orphan_sweep', org)).toBeUndefined()
    })

    test('an attempt open while the sweeper function runs keeps its hint: the locked hint is skipped, not removed', async () => {
      const org = newOrg()
      await insertKey(org, 26)
      expect(await named(org)).toBe(true)
      await done(org)
      expect(await hintOf('orphan_sweep', org)).toBeUndefined()
      // A stale hint with nothing pending (as a sweep can leave it), and a new attempt open.
      await owner.query(
        `insert into playbook.work_hints (kind, organization_id, due_at) values ('orphan_sweep', $1, clock_timestamp() - interval '1 hour')`,
        [org]
      )
      const writer = await open(org)
      try {
        await writer.client.query(IDEMPOTENCY_BEGIN, [
          org,
          newUser(),
          'documents.upload',
          `k-${hex()}`,
          hashOf('x'),
        ])
        expect(await named(org)).toBe(false)
        await writer.client.query('commit')
      } finally {
        await finish(writer)
      }
      // The hint survived the sweep that met it locked; the next sweep moves it to the attempt's time.
      expect(await hintOf('orphan_sweep', org)).toBeDefined()
      expect(await named(org)).toBe(false)
      const hint = await hintOf('orphan_sweep', org)
      expect(new Date(hint.due_at).getTime() - Date.now()).toBeGreaterThan(
        ORPHAN_SWEEP_AGE_MS - 60_000
      )
    })

    test('a sweep marked done while an attempt is open waits for it, then keeps the Organization pending', async () => {
      const org = newOrg()
      await insertKey(org, 26)
      const writer = await open(org)
      const marking = await open(org)
      try {
        await writer.client.query(IDEMPOTENCY_BEGIN, [
          org,
          newUser(),
          'documents.upload',
          `k-${hex()}`,
          hashOf('x'),
        ])
        const finished = marking.client.query(ORPHAN_SWEEP_DONE, [org, new Date()])
        await untilBlocked(marking.pid)
        await writer.client.query('commit')
        // It returned only after the writer committed, and it saw the writer's key.
        const result = await finished
        expect(result.rows[0]).toMatchObject({ more: true })
        await marking.client.query('commit')
      } finally {
        await finish(writer, marking)
      }
      const hint = await hintOf('orphan_sweep', org)
      expect(hint).toBeDefined()
      expect(new Date(hint.due_at).getTime() - Date.now()).toBeGreaterThan(
        ORPHAN_SWEEP_AGE_MS - 60_000
      )
    })

    test('an attempt that starts while done holds the hint waits for done, then writes the hint at its own time', async () => {
      const org = newOrg()
      await insertKey(org, 26)
      const marking = await open(org)
      const writer = await open(org)
      try {
        const marked = await marking.client.query(ORPHAN_SWEEP_DONE, [org, new Date()])
        // Nothing newer was visible: done removed the hint (uncommitted) and holds it.
        expect(marked.rows[0]).toMatchObject({ more: false })
        const writing = writer.client.query(IDEMPOTENCY_BEGIN, [
          org,
          newUser(),
          'documents.upload',
          `k-${hex()}`,
          hashOf('x'),
        ])
        await untilBlocked(writer.pid)
        await marking.client.query('commit')
        await writing
        await writer.client.query('commit')
      } finally {
        await finish(marking, writer)
      }
      const hint = await hintOf('orphan_sweep', org)
      expect(hint).toBeDefined()
      expect(new Date(hint.due_at).getTime() - Date.now()).toBeGreaterThan(
        ORPHAN_SWEEP_AGE_MS - 60_000
      )
    })

    test('the table is read-only to the role and invisible outside the scope; done refuses another scope and other roles', async () => {
      const [org, other] = [newOrg(), newOrg()]
      await insertKey(org, 26)
      await done(org)
      const read = await inOrg(org, (c) => c.query('select * from playbook.orphan_sweeps'))
      expect(read.rowCount).toBe(1)
      for (const text of [
        `insert into playbook.orphan_sweeps (organization_id, swept_through) values ('${newOrg()}', now())`,
        'delete from playbook.orphan_sweeps',
        'update playbook.orphan_sweeps set swept_through = now()',
      ]) {
        expect(await rejectionOf(inOrg(org, (c) => c.query(text)))).toContain('permission denied')
      }
      expect((await playbook.query('select 1 from playbook.orphan_sweeps')).rowCount).toBe(0)
      expect(
        (await inOrg(other, (c) => c.query('select 1 from playbook.orphan_sweeps'))).rowCount
      ).toBe(0)
      // Another Organization's scope cannot mark this one: refused, and nothing changes.
      const before = await sweptOf(org)
      expect(
        await rejectionOf(inOrg(other, (c) => c.query(ORPHAN_SWEEP_DONE, [org, new Date()])))
      ).toContain('not scoped to this Organization')
      expect(await sweptOf(org)).toEqual(before)
      for (const pool of [core, auth]) {
        expect(
          await rejectionOf(pool.query(ORGANIZATIONS_WITH_WORK, ['orphan_sweep', '', 5]))
        ).toMatch(/permission denied/)
        expect(await rejectionOf(pool.query(ORPHAN_SWEEP_DONE, [org, new Date()]))).toMatch(
          /permission denied/
        )
      }
      for (const [role, held] of [
        ['closeline_playbook', true],
        ['closeline_core', false],
        ['closeline_auth', false],
        ['public', false],
      ] as const) {
        const r = await owner.query(
          `select has_function_privilege($1, 'playbook.organizations_with_work(text, text, integer)', 'EXECUTE') as a,
                  has_function_privilege($1, 'playbook.remove_organization_rest(text, text)', 'EXECUTE') as b,
                  has_function_privilege($1, 'playbook.orphan_sweep_done(text, timestamptz)', 'EXECUTE') as c`,
          [role]
        )
        expect([role, r.rows[0].a, r.rows[0].b, r.rows[0].c]).toEqual([role, held, held, held])
      }
    })

    test('the replaced function still refuses a scope, still resumes, and the old kinds and statements work as before', async () => {
      const org = newOrg()
      const doc = await mustAdd(org)
      expect(
        await rejectionOf(
          inOrg(org, (c) => c.query(ORGANIZATIONS_WITH_WORK, ['orphan_sweep', '', 5]))
        )
      ).toContain('outside any Organization')
      expect(await page('jobs_due', org.slice(0, -1), 500)).toContain(org)
      const rows = await rawPage('jobs_due', org.slice(0, -1), 500)
      expect(rows.every((r) => typeof r.resume_after === 'string')).toBe(true)
      expect((await inOrg(org, (c) => c.query(DOCUMENT_GET, [org, doc.id]))).rowCount).toBe(1)
      expect(await rejectionOf(page('nope', null, 5))).toContain('unknown kind of work')
    })
  })

  describe('concurrent writers of one Organization do not block each other', () => {
    // A block would raise 55P03 after two seconds instead of hanging the run.
    const quick = async (...txs: { client: PoolClient }[]) => {
      for (const tx of txs) {
        await tx.client.query(`set local lock_timeout = '2s'`)
      }
    }
    const beginKey = (tx: { client: PoolClient }, org: string) =>
      tx.client.query(IDEMPOTENCY_BEGIN, [
        org,
        newUser(),
        'documents.upload',
        `k-${hex()}`,
        hashOf('x'),
      ])

    test('two open transactions each inserting an idempotency key, an earlier hint already there', async () => {
      const org = newOrg()
      await insertKey(org, 30)
      const [first, second] = [await open(org), await open(org)]
      try {
        await quick(first, second)
        await beginKey(first, org)
        await beginKey(second, org)
        await first.client.query('commit')
        await second.client.query('commit')
      } finally {
        await finish(first, second)
      }
      expect(await hintOf('orphan_sweep', org)).toBeDefined()
    })

    test('two open transactions each inserting an idempotency key after a fresh attempt', async () => {
      const org = newOrg()
      await inOrg(org, (c) => beginKey({ client: c }, org))
      const [first, second] = [await open(org), await open(org)]
      try {
        await quick(first, second)
        await beginKey(first, org)
        await beginKey(second, org)
        await first.client.query('commit')
        await second.client.query('commit')
      } finally {
        await finish(first, second)
      }
    })

    test('two open transactions each claiming a consumed message', async () => {
      const org = newOrg()
      await inOrg(org, (c) =>
        c.query(CONSUMED_CLAIM, ['c', org, 'm0', crypto.randomUUID(), 60_000])
      )
      const [first, second] = [await open(org), await open(org)]
      try {
        await quick(first, second)
        await first.client.query(CONSUMED_CLAIM, ['c', org, 'm1', crypto.randomUUID(), 120_000])
        await second.client.query(CONSUMED_CLAIM, ['c', org, 'm2', crypto.randomUUID(), 120_000])
        await first.client.query('commit')
        await second.client.query('commit')
      } finally {
        await finish(first, second)
      }
    })

    test('two open transactions each deleting a document', async () => {
      const org = newOrg()
      const seed = await mustAdd(org)
      await remove(org, seed.id)
      const a = await mustAdd(org)
      const b = await mustAdd(org)
      const [first, second] = [await open(org), await open(org)]
      try {
        await quick(first, second)
        await first.client.query(DOCUMENT_SOFT_DELETE, [org, a.id, newUser(), 0])
        await second.client.query(DOCUMENT_SOFT_DELETE, [org, b.id, newUser(), 0])
        await first.client.query('commit')
        await second.client.query('commit')
      } finally {
        await finish(first, second)
      }
    })
  })

  describe('isolation: the new statements', () => {
    const USER = ZERO_USER
    interface Case {
      name: string
      text: string
      /** Set up so the owner of the rows gets a row; returns the parameters. */
      prepare: (org: string) => Promise<unknown[]>
    }
    const cases: Case[] = [
      {
        name: 'DOCUMENT_ERASE_BATCH',
        text: DOCUMENT_ERASE_BATCH,
        prepare: async (a) => {
          await mustAdd(a)
          return [a, 10, USER]
        },
      },
      {
        name: 'DOCUMENT_LIST_SPENT_PURGES',
        text: DOCUMENT_LIST_SPENT_PURGES,
        prepare: async (a) => {
          const doc = await mustAdd(a)
          await remove(a, doc.id)
          await asOwner(a, (c) =>
            c.query(
              `update playbook.documents set purge_attempts = 20, purge_started_at = clock_timestamp(),
                      purge_lease_until = clock_timestamp() - interval '1 second' where id = $1`,
              [doc.id]
            )
          )
          return [a, '', 10]
        },
      },
      {
        name: 'DOCUMENT_PURGE_RESET',
        text: DOCUMENT_PURGE_RESET,
        prepare: async (a) => {
          const doc = await mustAdd(a)
          await remove(a, doc.id)
          await asOwner(a, (c) =>
            c.query(
              `update playbook.documents set purge_attempts = 20, purge_started_at = clock_timestamp(),
                      purge_lease_until = clock_timestamp() - interval '1 second' where id = $1`,
              [doc.id]
            )
          )
          return [a, doc.id]
        },
      },
      {
        name: 'DOCUMENT_LIST_PENDING_CLEANUP',
        text: DOCUMENT_LIST_PENDING_CLEANUP,
        prepare: async (a) => {
          const doc = await mustAdd(a)
          await remove(a, doc.id)
          return [a, '-infinity', '', 10]
        },
      },
      {
        name: 'ORGANIZATION_REMOVAL_STATUS',
        text: ORGANIZATION_REMOVAL_STATUS,
        prepare: async (a) => {
          await mustAdd(a)
          return [a]
        },
      },
    ]

    test.each(cases)(
      '$name: B gets nothing and changes nothing, then A gets the row',
      async (c) => {
        const [a, b] = [newOrg(), newOrg()]
        const params = await c.prepare(a)
        const [beforeA, beforeB] = [await snapshot(a), await snapshot(b)]
        const none = await inOrg(b, (cl) => cl.query(c.text, params))
        expect([c.name, none.rowCount]).toEqual([c.name, 0])
        expect(await snapshot(a)).toEqual(beforeA)
        expect(await snapshot(b)).toEqual(beforeB)
        const mine = await inOrg(a, (cl) => cl.query(c.text, params))
        expect([c.name, (mine.rowCount ?? 0) > 0]).toEqual([c.name, true])
      }
    )

    test('ORGANIZATION_REMOVE_REST: a foreign scope is refused and changes nothing, the owner scope succeeds', async () => {
      const [a, b] = [newOrg(), newOrg()]
      await inOrg(a, (c) => c.query(INDEX_SETTINGS_UPSERT, [a, 'model-a', 8]))
      const [beforeA, beforeB] = [await snapshot(a), await snapshot(b)]
      expect(
        await rejectionOf(
          inOrg(b, (cl) => cl.query(ORGANIZATION_REMOVE_REST, [a, REMOVE_ALL_IDEMPOTENCY_ROUTE]))
        )
      ).toContain('not scoped to this Organization')
      expect(await snapshot(a)).toEqual(beforeA)
      expect(await snapshot(b)).toEqual(beforeB)
      expect(
        (
          await inOrg(a, (cl) =>
            cl.query(ORGANIZATION_REMOVE_REST, [a, REMOVE_ALL_IDEMPOTENCY_ROUTE])
          )
        ).rows[0]
      ).toEqual({ removed: true })
    })
  })
})
