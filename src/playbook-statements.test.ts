import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  CONSUMED_CLAIM,
  CONSUMED_COMPLETE,
  CONSUMED_LOOKUP,
  CONSUMED_PURGE,
  CONSUMED_PURGE_AGE_MS,
  CONSUMED_RENEW,
  claimedJobs,
  DOCUMENT_BY_HASH,
  DOCUMENT_CLEANUP_BEGIN,
  DOCUMENT_CLEANUP_DONE,
  DOCUMENT_ERASE_BATCH,
  DOCUMENT_GET,
  DOCUMENT_INSERT,
  DOCUMENT_LIST,
  DOCUMENT_LIST_DELETED,
  DOCUMENT_LIST_PENDING_CLEANUP,
  DOCUMENT_LIST_SPENT_PURGES,
  DOCUMENT_MIN_RETENTION_MS,
  DOCUMENT_PURGE_CLAIM,
  DOCUMENT_PURGE_COMPLETE,
  DOCUMENT_PURGE_RESET,
  DOCUMENT_REQUEUE,
  DOCUMENT_RESTORE,
  DOCUMENT_RESTORE_FOR_UPLOAD,
  DOCUMENT_SOFT_DELETE,
  discoveredOrganizations,
  IDEMPOTENCY_PURGE,
  IDEMPOTENCY_PURGE_AGE_MS,
  INDEX_SETTINGS_UPSERT,
  INGESTION_JOB_ADVANCE,
  INGESTION_JOB_CLAIM,
  INGESTION_JOB_COMPLETE,
  INGESTION_JOB_FAIL,
  INGESTION_JOB_GIVE_UP_SPENT,
  INGESTION_JOB_HEARTBEAT,
  type IngestionJobClaimRow,
  ORGANIZATION_REMOVAL_STATUS,
  ORGANIZATION_REMOVE_REST,
  ORGANIZATIONS_WITH_WORK,
  ORPHAN_SWEEP_AGE_MS,
  ORPHAN_SWEEP_DONE,
  PLAYBOOK_MAX_BATCH,
  PLAYBOOK_MIN_LEASE_MS,
  PLAYBOOK_STATEMENTS,
  REMOVE_ALL_IDEMPOTENCY_ROUTE,
} from './playbook-statements'
import { DOCUMENT_PURGE_MAX_ATTEMPTS, INGESTION_JOB_MAX_ATTEMPTS } from './schema/playbook-tables'
import { WORK_KINDS } from './schema/playbook-work-hints'

const readme = readFileSync(fileURLToPath(new URL('../README.md', import.meta.url)), 'utf8')

/** The statements that take a point in time from the caller, each for one named reason. */
const TAKES_A_TIME = [
  'CONSUMED_PURGE',
  'DOCUMENT_LIST',
  'DOCUMENT_LIST_DELETED',
  'DOCUMENT_LIST_FILTERED',
  'DOCUMENT_LIST_PENDING_CLEANUP',
  'ORPHAN_SWEEP_DONE',
]

describe('the documented playbook statements', () => {
  test.each(Object.entries(PLAYBOOK_STATEMENTS))(
    '%s is in the README exactly as the integration tests run it',
    (_name, text) => {
      const indented = text
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n')
      expect(readme).toContain(`\`\`\`sql\n${indented}\n    \`\`\``)
    }
  )

  test.each(Object.entries(PLAYBOOK_STATEMENTS).filter(([name]) => !TAKES_A_TIME.includes(name)))(
    '%s takes no point in time from the service',
    (_name, text) => {
      expect(text).not.toContain('now()')
      expect(text).not.toMatch(/\$\d+::timestamptz/)
    }
  )

  test.each(Object.entries(PLAYBOOK_STATEMENTS))(
    '%s has no blank line, so the README can hold it',
    (_n, text) => {
      expect(text).not.toMatch(/\n\s*\n/)
    }
  )

  test('every statement but the advisory lock names the Organization in its own where clause', () => {
    for (const [name, text] of Object.entries(PLAYBOOK_STATEMENTS)) {
      if (name === 'QUOTA_LOCK') {
        continue
      }
      if (name === 'ORGANIZATIONS_WITH_WORK') {
        // The one statement that is not about a single Organization; the function does the work.
        expect(text).toContain('playbook.organizations_with_work(')
        continue
      }
      if (name === 'ORPHAN_SWEEP_DONE') {
        expect(text).toContain('playbook.orphan_sweep_done($1::text, $2::timestamptz)')
        continue
      }
      if (name === 'ORGANIZATION_REMOVE_REST') {
        expect(text).toContain('playbook.remove_organization_rest($1::text, $2::text)')
        continue
      }
      expect(text).toMatch(/organization_id\s*=\s*\$[12]|\$1,\s*\$2/)
    }
  })
})

describe('the rules the statements keep', () => {
  test('the claims and the safety nets use the tables bounds, from one constant each', () => {
    expect(INGESTION_JOB_CLAIM).toContain(`attempts < ${INGESTION_JOB_MAX_ATTEMPTS}`)
    expect(INGESTION_JOB_GIVE_UP_SPENT).toContain(`attempts >= ${INGESTION_JOB_MAX_ATTEMPTS}`)
    expect(DOCUMENT_PURGE_CLAIM).toContain(`purge_attempts < ${DOCUMENT_PURGE_MAX_ATTEMPTS}`)
  })

  test('both claims lock with skip locked inside a common table expression', () => {
    for (const text of [INGESTION_JOB_CLAIM, DOCUMENT_PURGE_CLAIM, INGESTION_JOB_GIVE_UP_SPENT]) {
      expect(text).toMatch(/^with \w+ as \(\n\s+select [\s\S]*for update (of j )?skip locked\)/)
    }
  })

  test('a soft delete is one write that sets the due time from the clock and floors the retention', () => {
    expect(DOCUMENT_MIN_RETENTION_MS).toBeGreaterThanOrEqual(3_600_000)
    expect(DOCUMENT_SOFT_DELETE).toContain(
      `greatest(coalesce($4::float8, 0), ${DOCUMENT_MIN_RETENTION_MS})`
    )
    expect(DOCUMENT_SOFT_DELETE).toContain('deletion_seq = deletion_seq + 1')
    expect(DOCUMENT_SOFT_DELETE).toContain("state = 'cancelled'")
    expect(DOCUMENT_SOFT_DELETE).toContain('returning id, state, deletion_seq, purge_due_at')
  })

  test('a restore needs a deleted document whose purge has not started', () => {
    expect(DOCUMENT_RESTORE).toContain("state = 'deleted' and purge_started_at is null")
    expect(DOCUMENT_PURGE_CLAIM).toContain('coalesce(d.purge_started_at, clock_timestamp())')
  })

  test('the cleanup applies only to the deletion it was queued for', () => {
    expect(DOCUMENT_CLEANUP_BEGIN).toContain("d.state = 'deleted' and d.deletion_seq = $3::int")
    expect(DOCUMENT_CLEANUP_DONE).toContain("state = 'deleted' and deletion_seq = $3::int")
    expect(DOCUMENT_PURGE_COMPLETE).toContain('vectors_removed_seq = deletion_seq')
  })

  test('a job statement after the claim must present the claim token', () => {
    expect(INGESTION_JOB_ADVANCE).toContain('claim_token = $3::uuid')
    expect(INGESTION_JOB_ADVANCE).toContain('array_position')
  })

  test('the lease floor is one second', () => {
    expect(PLAYBOOK_MIN_LEASE_MS).toBe(1000)
    expect(INGESTION_JOB_CLAIM).toContain(`${PLAYBOOK_MIN_LEASE_MS}`)
    expect(CONSUMED_CLAIM).toContain(`${PLAYBOOK_MIN_LEASE_MS}`)
  })

  test('the consumed-message statements follow the kit contract', () => {
    expect(CONSUMED_CLAIM).toContain(
      "where m.state = 'claimed' and m.lease_expires_at <= clock_timestamp()"
    )
    expect(CONSUMED_RENEW).toContain("state = 'claimed' and lease_expires_at > clock_timestamp()")
    expect(CONSUMED_COMPLETE).toContain("claim_token = $4::uuid and state = 'claimed'")
    expect(CONSUMED_PURGE).toContain("state = 'done' and completed_at < $2::timestamptz")
    expect(CONSUMED_PURGE).toContain("state = 'claimed' and lease_expires_at <= clock_timestamp()")
  })

  test('the index settings upsert refuses a change once vectors exist', () => {
    expect(INDEX_SETTINGS_UPSERT).toContain('where s.vectors_written_at is null')
    expect(DOCUMENT_INSERT).toContain(
      'where purge_started_at is null and restore_barred_at is null do nothing'
    )
  })

  test('a lookup gives a retry-after only for a claimed record, and at least 1 for it', () => {
    expect(CONSUMED_LOOKUP).toContain("case when state = 'claimed'")
    expect(CONSUMED_LOOKUP).toContain('greatest(1, ceil(')
  })

  test('the explicit restore needs the purge time ahead; the upload restore does not; both need no purge claim', () => {
    expect(DOCUMENT_RESTORE).toContain('and purge_due_at > clock_timestamp()')
    expect(DOCUMENT_RESTORE_FOR_UPLOAD).not.toContain('purge_due_at >')
    for (const text of [DOCUMENT_RESTORE, DOCUMENT_RESTORE_FOR_UPLOAD]) {
      expect(text).toContain("state = 'deleted' and purge_started_at is null")
      expect(text).toContain('purge_due_at = null')
    }
  })

  test('restore and requeue cancel stale jobs first, in the delete order, and the claim checks the document', () => {
    for (const text of [DOCUMENT_RESTORE, DOCUMENT_RESTORE_FOR_UPLOAD, DOCUMENT_REQUEUE]) {
      expect(text.indexOf("set state = 'cancelled'")).toBeLessThan(
        text.indexOf('update playbook.documents')
      )
      expect(text).toContain('(select count(*) from j) >= 0')
    }
    expect(INGESTION_JOB_CLAIM).toContain(
      "d.state in ('uploaded', 'processing') and d.epoch = j.epoch"
    )
    expect(INGESTION_JOB_CLAIM).toContain('for update of j skip locked')
    expect(INGESTION_JOB_COMPLETE).toContain(
      "x.state = 'processing' and x.epoch = ingestion_jobs.epoch"
    )
    expect(INGESTION_JOB_FAIL).toContain("x.state in ('uploaded', 'processing')")
  })

  test('heartbeat and advance need the live document; cleanup waits for a running job; the claim re-checks and reports', () => {
    for (const text of [INGESTION_JOB_HEARTBEAT, INGESTION_JOB_ADVANCE]) {
      expect(text).toContain(
        "x.state in ('uploaded', 'processing') and x.epoch = ingestion_jobs.epoch"
      )
    }
    expect(DOCUMENT_CLEANUP_BEGIN).toContain("j.state in ('cancelled', 'running')")
    expect(INGESTION_JOB_CLAIM).toContain(
      "d.state in ('uploaded', 'processing') and d.epoch = claimed.epoch"
    )
    expect(INGESTION_JOB_CLAIM).toContain('from claimed c join moved m on m.id = c.document_id')
    expect(INGESTION_JOB_CLAIM).toContain('as cancelled')
    expect(DOCUMENT_GET).toContain(
      "(state = 'deleted' and (purge_due_at <= clock_timestamp() or purge_started_at is not null or restore_barred_at is not null)) as not_restorable"
    )
  })

  test('the claim counts the jobs it lost and documents the lock timeout', () => {
    expect(INGESTION_JOB_CLAIM).toContain(
      '((select count(*) from claimed) - (select count(*) from moved))::int as lost'
    )
    expect(INGESTION_JOB_CLAIM).toContain('(select count(*) from claimed) > 0')
  })

  test('claimedJobs drops the signal row and returns the counts', () => {
    const blank = {
      document_id: null,
      epoch: null,
      step: null,
      attempts: null,
      claim_token: null,
      artifact_key: null,
      page_count: null,
      chunk_count: null,
      chunks_done: null,
    }
    const signal: IngestionJobClaimRow = { ...blank, id: null, cancelled: 2, lost: 1 }
    expect(claimedJobs([signal])).toEqual({ jobs: [], cancelled: 2, lost: 1 })
    expect(claimedJobs([])).toEqual({ jobs: [], cancelled: 0, lost: 0 })
    const job: IngestionJobClaimRow = {
      ...blank,
      id: 'job_1',
      document_id: 'doc_1',
      cancelled: 1,
      lost: 0,
    }
    const result = claimedJobs([job])
    expect(result.jobs.map((j) => j.id)).toEqual(['job_1'])
    expect([result.cancelled, result.lost]).toEqual([1, 0])
  })

  test('every batch size and page size is clamped in SQL, null included', () => {
    const batch = `least(greatest(coalesce($N::int, 1), 1), ${PLAYBOOK_MAX_BATCH})`
    expect(DOCUMENT_PURGE_CLAIM).toContain(`limit ${batch.replace('$N', '$2')}`)
    expect(INGESTION_JOB_CLAIM).toContain(`limit ${batch.replace('$N', '$2')}`)
    expect(INGESTION_JOB_GIVE_UP_SPENT).toContain(`limit ${batch.replace('$N', '$2')}`)
    expect(CONSUMED_PURGE).toContain(`limit ${batch.replace('$N', '$3')}`)
    expect(IDEMPOTENCY_PURGE).toContain(`limit ${batch.replace('$N', '$3')}`)
    for (const text of [DOCUMENT_LIST, DOCUMENT_LIST_DELETED]) {
      expect(text).toContain('limit least(greatest(coalesce($4::int, 1), 1), 100)')
    }
    for (const [name, text] of Object.entries(PLAYBOOK_STATEMENTS)) {
      for (const match of text.matchAll(/\blimit (\S+)/g)) {
        expect([name, match[1]?.startsWith('least(greatest(coalesce($')]).toEqual([name, true])
      }
    }
  })

  test('the new reads return what the service answers and publishes with', () => {
    expect(DOCUMENT_GET).toContain('deletion_seq')
    expect(DOCUMENT_GET).toContain('purge_due_at, purge_started_at')
    expect(DOCUMENT_GET).toContain('failure_reason')
    expect(DOCUMENT_LIST_DELETED).toContain("state = 'deleted'")
    expect(DOCUMENT_SOFT_DELETE).toContain(
      'select id, state, deletion_seq, purge_due_at, true as changed'
    )
  })
})

describe('work discovery, erasure and spent purges', () => {
  test('the erase batch locks jobs before documents, bars restore and pulls the purge time to now', () => {
    expect(DOCUMENT_ERASE_BATCH.indexOf('update playbook.ingestion_jobs')).toBeLessThan(
      DOCUMENT_ERASE_BATCH.indexOf('update playbook.documents')
    )
    expect(DOCUMENT_ERASE_BATCH).toContain('(select count(*) from j) >= 0')
    expect(DOCUMENT_ERASE_BATCH).toContain('restore_barred_at = (select now from t)')
    expect(DOCUMENT_ERASE_BATCH).toContain(
      'purge_due_at = least(coalesce(x.purge_due_at, (select now from t)), (select now from t))'
    )
    expect(DOCUMENT_ERASE_BATCH).toContain('x.epoch + 1')
    expect(DOCUMENT_ERASE_BATCH).toContain('x.deletion_seq + 1')
    expect(DOCUMENT_ERASE_BATCH).toContain('restore_barred_at is null')
    expect(DOCUMENT_ERASE_BATCH).toContain(
      `limit least(greatest(coalesce($2::int, 1), 1), ${PLAYBOOK_MAX_BATCH})`
    )
  })

  test('both restores, the hash lookup and the upload insert leave barred documents alone', () => {
    for (const text of [DOCUMENT_RESTORE, DOCUMENT_RESTORE_FOR_UPLOAD]) {
      expect(text).toContain('purge_started_at is null and restore_barred_at is null')
    }
    expect(DOCUMENT_BY_HASH).toContain('restore_barred_at is null')
    expect(DOCUMENT_GET).toContain('or restore_barred_at is not null')
  })

  test('the purge completion locks the job rows first and refuses a live lease', () => {
    expect(DOCUMENT_PURGE_COMPLETE.indexOf('for update')).toBeLessThan(
      DOCUMENT_PURGE_COMPLETE.indexOf('delete from playbook.documents')
    )
    expect(DOCUMENT_PURGE_COMPLETE).toContain(
      "not exists (select 1 from jl where jl.state = 'running' and jl.next_attempt_at > clock_timestamp())"
    )
  })

  test('the discovery statement clamps its page and passes the kind and cursor through', () => {
    expect(ORGANIZATIONS_WITH_WORK).toContain(
      `playbook.organizations_with_work($1::text, $2::text, least(greatest(coalesce($3::int, 1), 1), ${PLAYBOOK_MAX_BATCH}))`
    )
  })

  test('the remove-rest and status statements take only the Organization and a route', () => {
    expect(ORGANIZATION_REMOVE_REST).toContain(
      'playbook.remove_organization_rest($1::text, $2::text)'
    )
    expect(REMOVE_ALL_IDEMPOTENCY_ROUTE).toMatch(/^[a-z0-9._]+$/)
    for (const table of ['documents', 'index_settings', 'organization_usage', 'consumed_message']) {
      expect(ORGANIZATION_REMOVAL_STATUS).toContain(
        `from playbook.${table} where organization_id = $1`
      )
    }
  })

  test('the spent list and the reset use the attempt bound from one constant', () => {
    for (const text of [DOCUMENT_LIST_SPENT_PURGES, DOCUMENT_PURGE_RESET]) {
      expect(text).toContain(`purge_attempts >= ${DOCUMENT_PURGE_MAX_ATTEMPTS}`)
    }
    expect(DOCUMENT_LIST_SPENT_PURGES).toContain(
      'limit least(greatest(coalesce($3::int, 1), 1), 100)'
    )
    expect(DOCUMENT_PURGE_RESET).toContain(
      'restore_barred_at = coalesce(restore_barred_at, clock_timestamp())'
    )
  })
})

describe('review round 1 of the work discovery', () => {
  const migration = readFileSync(
    fileURLToPath(new URL('../migrations/0012_playbook_work_discovery.sql', import.meta.url)),
    'utf8'
  )

  test('the purge ages are constants the migration and the statements share', () => {
    expect(CONSUMED_PURGE_AGE_MS).toBe(15 * 86_400_000)
    expect(IDEMPOTENCY_PURGE_AGE_MS).toBe(24 * 3_600_000)
    expect(migration.split("interval '15 days'").length - 1).toBe(3)
    expect(migration.split("interval '24 hours'").length - 1).toBe(3)
    expect(migration).not.toContain("interval '1 hour'")
  })

  test('the erase batch locks jobs, then documents, each in id order', () => {
    expect(DOCUMENT_ERASE_BATCH).toMatch(/jl as \([\s\S]*order by id\n\s+for update\)/)
    expect(DOCUMENT_ERASE_BATCH).toMatch(/dl as \([\s\S]*order by id\n\s+for update\)/)
    expect(DOCUMENT_ERASE_BATCH.indexOf('jl as')).toBeLessThan(
      DOCUMENT_ERASE_BATCH.indexOf('dl as')
    )
  })

  test('the function refuses a scope, bounds the visited hints and share-locks before writing', () => {
    expect(migration).toContain(
      "nullif(current_setting('app.organization_id', true), '') IS NOT NULL"
    )
    expect(migration).toContain("ERRCODE = 'insufficient_privilege'")
    expect(migration).toContain('v_limit integer := least(v_batch * 4, 2000)')
    expect(migration).toContain('EXIT WHEN cardinality(v_ids) >= v_batch OR v_visited >= v_limit')
    const note = migration.slice(migration.indexOf('CREATE FUNCTION "playbook"."note_work"'))
    expect(note.indexOf('FOR KEY SHARE')).toBeLessThan(
      note.indexOf('INSERT INTO "playbook"."work_hints"')
    )
  })

  test('discoveredOrganizations drops the marker row and returns where to continue', () => {
    expect(discoveredOrganizations([])).toEqual({ organizations: [], resumeAfter: null })
    expect(discoveredOrganizations([{ organization_id: null, resume_after: 'org_z' }])).toEqual({
      organizations: [],
      resumeAfter: 'org_z',
    })
    expect(
      discoveredOrganizations([
        { organization_id: 'org_a', resume_after: 'org_c' },
        { organization_id: 'org_b', resume_after: 'org_c' },
      ])
    ).toEqual({ organizations: ['org_a', 'org_b'], resumeAfter: 'org_c' })
  })
})

describe('pending cleanups and the orphan sweep', () => {
  const read = (name: string) =>
    readFileSync(fileURLToPath(new URL(`../migrations/${name}`, import.meta.url)), 'utf8')
  const migration = read('0014_playbook_pending_cleanup_orphans.sql')
  /** Drop quotes, the schema and the `d.` alias, and case, so predicates in different spellings compare. */
  const normal = (text: string) =>
    text
      .replaceAll('"', '')
      .replaceAll(/\b(?:playbook\.documents|d)\./g, '')
      .replaceAll(/\s+/g, ' ')
      .toLowerCase()

  test('the list, the index and the discovery verification share one predicate', async () => {
    const { PENDING_CLEANUP_PREDICATE } = await import('./schema/playbook-tables')
    expect(DOCUMENT_LIST_PENDING_CLEANUP).toContain(PENDING_CLEANUP_PREDICATE)
    expect(normal(migration)).toContain(
      `(organization_id,deleted_at,id) where ${normal(PENDING_CLEANUP_PREDICATE)};`
    )
    const branch = migration.slice(migration.indexOf("p_kind = 'cleanup_pending' THEN"))
    expect(normal(branch.slice(0, 400))).toContain(normal(PENDING_CLEANUP_PREDICATE))
  })

  test('the pending list is a clamped keyset on deleted_at then id', () => {
    expect(DOCUMENT_LIST_PENDING_CLEANUP).toContain('order by deleted_at, id')
    expect(DOCUMENT_LIST_PENDING_CLEANUP).toContain(
      '(deleted_at, id) > ($2::timestamptz, $3::text)'
    )
    expect(DOCUMENT_LIST_PENDING_CLEANUP).toContain(
      `limit least(greatest(coalesce($4::int, 1), 1), ${PLAYBOOK_MAX_BATCH})`
    )
  })

  test('the orphan age is 25 hours, in the constant and in the migration, and the kind is known', () => {
    expect(ORPHAN_SWEEP_AGE_MS).toBe(25 * 3_600_000)
    // the backfill, the trigger, the verification and the done function
    expect(migration.split("interval '25 hours'").length - 1).toBeGreaterThanOrEqual(6)
    const trigger = migration.slice(migration.indexOf('"playbook"."note_idempotency_work"'))
    expect(trigger).toContain(`NEW."created_at" + interval '25 hours'`)
    expect(WORK_KINDS).toContain('orphan_sweep')
    expect(migration).toContain("'purge_spent', 'orphan_sweep') THEN")
  })

  test('the function keeps its signature, scope refusal, visit bound and grants', () => {
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION "playbook"."organizations_with_work"(p_kind text, p_after_id text, p_batch integer)'
    )
    expect(migration).toContain("ERRCODE = 'insufficient_privilege'")
    expect(migration).toContain('v_limit integer := least(v_batch * 4, 2000)')
    expect(migration).toContain('RETURNS TABLE ("organization_id" text, "resume_after" text)')
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION "playbook"."organizations_with_work"(text, text, integer), "playbook"."remove_organization_rest"(text, text), "playbook"."orphan_sweep_done"(text, timestamptz) TO closeline_playbook;'
    )
  })

  test('the marker is a tenant table the role only reads; an upload attempt writes none of it', () => {
    expect(migration).toContain('ALTER TABLE "playbook"."orphan_sweeps" FORCE ROW LEVEL SECURITY;')
    expect(migration).toContain(
      'REVOKE INSERT, UPDATE, DELETE ON "playbook"."orphan_sweeps" FROM closeline_playbook;'
    )
    // The key-insert trigger notes hints only; it must not write orphan_sweeps (that would take a
    // row lock per attempt and queue an Organization's concurrent uploads behind each other).
    const trigger = migration.slice(
      migration.indexOf('CREATE OR REPLACE FUNCTION "playbook"."note_idempotency_work"'),
      migration.indexOf('CREATE FUNCTION "playbook"."orphan_sweep_done"')
    )
    expect(trigger).not.toContain('orphan_sweeps')
    expect(trigger).toContain(`note_work"('orphan_sweep'`)
    // The done function locks the hint before it reads the attempts again.
    const done = migration.slice(
      migration.indexOf('CREATE FUNCTION "playbook"."orphan_sweep_done"')
    )
    expect(done.indexOf('FOR UPDATE')).toBeGreaterThan(0)
    expect(done.indexOf('FOR UPDATE')).toBeLessThan(done.indexOf('"playbook"."idempotency_keys" k'))
    expect(ORPHAN_SWEEP_DONE).toContain('playbook.orphan_sweep_done(')
  })
})
