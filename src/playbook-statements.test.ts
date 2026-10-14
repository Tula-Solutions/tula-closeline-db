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
  DEAL_IMPORT_APPLY,
  DEAL_IMPORT_CLAIM,
  DEAL_IMPORT_FINISH,
  DEAL_IMPORT_GIVE_UP_SPENT,
  DEAL_IMPORT_LIST,
  DEAL_IMPORT_PURGE_BATCH,
  DEAL_LIST,
  DEAL_LIST_BY_IMPORT_FLAG,
  DEAL_LIST_BY_OUTCOME,
  DEAL_SET_OUTCOME,
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
  IDEMPOTENCY_MIN_PURGE_AGE_MS,
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
  RIGHTS_CONFIRM,
} from './playbook-statements'
import {
  DEAL_IMPORT_APPLY_BATCH,
  DEAL_IMPORT_MAX_ATTEMPTS,
  DEAL_IMPORT_MAX_ROWS,
} from './schema/playbook-sales-history'
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
  'DEAL_LIST',
  'DEAL_LIST_BY_OUTCOME',
  'DEAL_LIST_BY_IMPORT_FLAG',
  'DEAL_SET_OUTCOME',
  'DEAL_IMPORT_LIST',
  'CALL_LIST',
  'CALL_LIST_BY_STATE',
  'CALL_LIST_BY_DEAL',
  'CALL_LIST_PENDING_CLEANUP',
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
      if (name === 'DEAL_ERASE_BATCH') {
        expect(text).toContain('playbook.erase_deals($1::text, $2::int)')
        continue
      }
      if (name === 'DEAL_IMPORT_INSERT') {
        expect(text).toContain('values ($2::text, $1,')
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
    // 26 hours: one more than the orphan age, so an attempt's key outlives its sweep's due time.
    expect(IDEMPOTENCY_PURGE_AGE_MS).toBe(ORPHAN_SWEEP_AGE_MS + 3_600_000)
    expect(IDEMPOTENCY_PURGE_AGE_MS).toBe(26 * 3_600_000)
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

  test('the hour counts in 0014 are the constants: 25 hours cut and due, 26 hours purge hint, erase age', () => {
    const hours = (ms: number) => `interval '${ms / 3_600_000} hours'`
    expect(hours(ORPHAN_SWEEP_AGE_MS)).toBe("interval '25 hours'")
    expect(hours(IDEMPOTENCY_PURGE_AGE_MS)).toBe("interval '26 hours'")
    const trigger = migration.slice(
      migration.indexOf('CREATE OR REPLACE FUNCTION "playbook"."note_idempotency_work"'),
      migration.indexOf('CREATE FUNCTION "playbook"."orphan_sweep_done"')
    )
    expect(trigger).toContain(`NEW."created_at" + ${hours(IDEMPOTENCY_PURGE_AGE_MS)}`)
    expect(trigger).toContain(`NEW."created_at" + ${hours(ORPHAN_SWEEP_AGE_MS)}`)
    // The swept-through time is cut to the orphan age, not 24 hours.
    expect(migration).toContain(`clock_timestamp() - ${hours(ORPHAN_SWEEP_AGE_MS)})`)
    expect(migration).not.toContain("clock_timestamp() - interval '24 hours')")
    // The idempotency_purge verification uses the purge age.
    expect(migration).toContain(
      `min(k."created_at") + ${hours(IDEMPOTENCY_PURGE_AGE_MS)} INTO v_next`
    )
    // Erasure keeps no key (the kept route's aside); one statement deletes them and records the
    // latest one's time, so one snapshot decides both.
    const erase = migration.slice(
      migration.indexOf('CREATE OR REPLACE FUNCTION "playbook"."remove_organization_rest"')
    )
    expect(erase).not.toContain(`k."created_at" <= clock_timestamp()`)
    const start = erase.indexOf('WITH del AS (\n    DELETE FROM "playbook"."idempotency_keys" k')
    expect(start).toBeGreaterThan(0)
    const statement = erase.slice(start, erase.indexOf(';\n', start))
    expect(statement).toContain('RETURNING k."created_at")')
    expect(statement).toContain('UPDATE "playbook"."orphan_sweeps" s')
    expect(statement).toContain(
      'greatest(s."erased_attempt_at", (SELECT max(del."created_at") FROM del))'
    )
    expect(statement).toContain('(SELECT max(del."created_at") FROM del) > s."swept_through"')
    // No other statement deletes the keys or writes the erased time.
    expect(erase.split('DELETE FROM "playbook"."idempotency_keys"').length - 1).toBe(1)
    expect(erase.split('"erased_attempt_at" = ').length - 1).toBe(1)
  })

  test('erasure locks the orphan_sweeps row before the upload lock; done takes the row before the hint', () => {
    const erase = migration.slice(
      migration.indexOf('CREATE OR REPLACE FUNCTION "playbook"."remove_organization_rest"')
    )
    const row = erase.indexOf('INSERT INTO "playbook"."orphan_sweeps" AS s')
    expect(row).toBeGreaterThan(0)
    expect(row).toBeLessThan(erase.indexOf('pg_advisory_xact_lock'))
    // Erasure never locks or moves the orphan_sweep hint.
    expect(erase).toContain(`w."kind" NOT IN ('idempotency_purge', 'orphan_sweep')`)
    expect(erase).not.toContain('note_work')
    const done = migration.slice(
      migration.indexOf('CREATE FUNCTION "playbook"."orphan_sweep_done"')
    )
    expect(done.indexOf('INSERT INTO "playbook"."orphan_sweeps"')).toBeLessThan(
      done.indexOf('FOR UPDATE')
    )
    // Both the discovery function and done count the erased attempt while uncovered.
    expect(done).toContain('v_erased > v_swept')
    expect(migration).toContain(`s."erased_attempt_at" > s."swept_through"`)
  })

  test('the purge is floored at the purge age, a constant the statement and the README share', () => {
    expect(IDEMPOTENCY_MIN_PURGE_AGE_MS).toBe(IDEMPOTENCY_PURGE_AGE_MS)
    expect(IDEMPOTENCY_PURGE).toContain(`${IDEMPOTENCY_PURGE_AGE_MS}) / 1000`)
  })

  test('done removes the row only with the hint, and only when no key and no document remain', () => {
    const done = migration.slice(
      migration.indexOf('CREATE FUNCTION "playbook"."orphan_sweep_done"')
    )
    const del = done.indexOf('DELETE FROM "playbook"."orphan_sweeps"')
    expect(del).toBeGreaterThan(done.indexOf('DELETE FROM "playbook"."work_hints"'))
    expect(done.slice(done.indexOf('IF NOT EXISTS'), del)).toContain('"playbook"."documents"')
    expect(done.slice(done.indexOf('IF NOT EXISTS'), del)).toContain(
      '"playbook"."idempotency_keys"'
    )
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
    const start = migration.indexOf('CREATE OR REPLACE FUNCTION "playbook"."note_idempotency_work"')
    const trigger = migration.slice(start, migration.indexOf('$$;', start))
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

describe('sales history, part one', () => {
  const migration = readFileSync(
    fileURLToPath(new URL('../migrations/0015_playbook_sales_history.sql', import.meta.url)),
    'utf8'
  )

  test('an import applies a bounded batch under its claim token and records only four things per row', () => {
    expect(DEAL_IMPORT_APPLY).toContain(
      "claim_token = $3::uuid and state = 'processing' and erased_at is null"
    )
    expect(DEAL_IMPORT_APPLY).toContain(
      `limit least(greatest(coalesce($6::int, 1), 1), ${DEAL_IMPORT_APPLY_BATCH})`
    )
    expect(DEAL_IMPORT_APPLY).toContain(
      'insert into playbook.deal_import_rows (organization_id, import_id, row_number, deal_id, result, reason)'
    )
    for (const reason of ['duplicate_in_file', 'outcome_already_decided', 'deal_limit_reached']) {
      expect(DEAL_IMPORT_APPLY).toContain(`'${reason}'`)
    }
    // A decided Deal is never updated, even if the snapshot said open: the write re-checks it.
    expect(DEAL_IMPORT_APPLY).toContain("d.outcome = 'open'")
    // The Outcome sequence rises by the amount the trigger demands.
    expect(DEAL_IMPORT_APPLY).toContain(
      'when f.outcome <> d.outcome or coalesce(f.closed_at, d.closed_at) is distinct from d.closed_at then 1 else 0'
    )
    // Only the contiguous rows after the report are read, so a repeat changes nothing and order holds.
    expect(DEAL_IMPORT_APPLY).toContain('where raw.row_number > imp.report_through')
    expect(DEAL_IMPORT_APPLY).toContain('from sent where row_number = base + rk')
    // The Deals the batch names are locked first, so no row is left undecided, and the insert has no
    // conflict clause that could drop a row.
    expect(DEAL_IMPORT_APPLY).toMatch(/lk as \(\n[\s\S]*order by d\.id\n\s+for update\)/)
    expect(DEAL_IMPORT_APPLY).toContain('from ranked k left join lk d')
    expect(DEAL_IMPORT_APPLY).not.toContain('on conflict')
    expect(DEAL_IMPORT_APPLY).toContain('playbook.require_upload_lock($1)')
    expect(DEAL_IMPORT_APPLY).toContain(
      'report_through = report_through + (select count(*) from b)'
    )
  })

  test('the apply refuses a row number out of range or repeated in one batch, taking nothing', () => {
    expect(DEAL_IMPORT_APPLY).toContain("then 'row_number_range'")
    expect(DEAL_IMPORT_APPLY).toContain("then 'row_number_repeated'")
    expect(DEAL_IMPORT_APPLY).toContain('(select why from refuse) is null')
    expect(DEAL_IMPORT_APPLY).toContain(`not between 2 and ${DEAL_IMPORT_MAX_ROWS + 1}`)
  })

  test('the Deal and import lists return the cursor as text', () => {
    for (const text of [
      DEAL_LIST,
      DEAL_LIST_BY_OUTCOME,
      DEAL_LIST_BY_IMPORT_FLAG,
      DEAL_IMPORT_LIST,
    ]) {
      expect(text).toContain('created_at::text as cursor_at')
    }
  })

  test('a repeat in the file is judged before the row’s own reason, because the unique index is on the first row', () => {
    const duplicate = DEAL_IMPORT_APPLY.indexOf("then 'duplicate_in_file'")
    const own = DEAL_IMPORT_APPLY.indexOf('when k.reason is not null then k.reason')
    expect(duplicate).toBeGreaterThan(0)
    expect(duplicate).toBeLessThan(own)
  })

  test('the claim and the safety net use the attempt bound from one constant', () => {
    expect(DEAL_IMPORT_CLAIM).toContain(`attempts < ${DEAL_IMPORT_MAX_ATTEMPTS}`)
    expect(DEAL_IMPORT_GIVE_UP_SPENT).toContain(`attempts >= ${DEAL_IMPORT_MAX_ATTEMPTS}`)
    for (const text of [DEAL_IMPORT_CLAIM, DEAL_IMPORT_GIVE_UP_SPENT]) {
      expect(text).toContain('for update skip locked')
    }
  })

  test('an Outcome change locks the row first and finishing checks the row count', () => {
    expect(DEAL_SET_OUTCOME).toMatch(
      /with cur as \(\n\s+select \* from playbook\.deals[\s\S]*for update\)/
    )
    expect(DEAL_IMPORT_FINISH).toContain('report_through = $4::int + 1')
  })

  test('purge deletes report rows before the import and only an erased one with its CSV removed', () => {
    expect(DEAL_IMPORT_PURGE_BATCH).toContain(
      'erased_at is not null and object_removed_at is not null'
    )
    expect(DEAL_IMPORT_PURGE_BATCH).toContain(
      'not exists (select 1 from playbook.deal_import_rows x'
    )
  })

  test('the rights confirmation never goes down in version and keeps the first of a version', () => {
    expect(RIGHTS_CONFIRM).toContain('where r.wording_version < excluded.wording_version')
  })

  test('the status of removal accounts for the new tables', () => {
    for (const table of ['deals', 'deal_imports', 'rights_confirmations']) {
      expect(ORGANIZATION_REMOVAL_STATUS).toContain(`playbook.${table} where organization_id = $1`)
    }
  })

  test('the migration: forced row-level security, one policy per table, restrictive deletes', () => {
    for (const table of ['deals', 'deal_imports', 'deal_import_rows', 'rights_confirmations']) {
      expect(migration).toContain(`ALTER TABLE "playbook"."${table}" FORCE ROW LEVEL SECURITY;`)
      expect(migration).toContain(`CREATE POLICY "${table}_tenant_isolation"`)
    }
    expect(migration).toContain(
      'REVOKE UPDATE, DELETE ON "playbook"."deals" FROM closeline_playbook;'
    )
    expect(migration).toContain('"deal_import_rows_erased_only"')
    expect(migration).toContain('"deal_imports_erased_only"')
  })

  test('erase_deals takes the upload lock before it touches a Deal row', () => {
    const erase = migration.slice(migration.indexOf('CREATE FUNCTION "playbook"."erase_deals"'))
    expect(erase.indexOf('pg_advisory_xact_lock')).toBeGreaterThan(0)
    expect(erase.indexOf('pg_advisory_xact_lock')).toBeLessThan(erase.indexOf('FOR UPDATE'))
  })

  test('erasure refuses while a Deal, an import or a document remains and removes the rights row', () => {
    const rest = migration.slice(
      migration.indexOf('CREATE OR REPLACE FUNCTION "playbook"."remove_organization_rest"')
    )
    expect(rest).toContain('"playbook"."deal_imports" i')
    expect(rest).toContain('"playbook"."deals" e')
    expect(rest).toContain('DELETE FROM "playbook"."rights_confirmations"')
    // The v0.13.0 order is intact: the orphan_sweeps row before the upload lock, one statement for keys.
    expect(rest.indexOf('INSERT INTO "playbook"."orphan_sweeps"')).toBeLessThan(
      rest.indexOf('pg_advisory_xact_lock')
    )
    expect(rest).toContain('WITH del AS (')
  })

  test('the hint for imports is noted by triggers and verified by the due index', () => {
    expect(migration).toContain('"deal_imports_note_work_insert"')
    expect(migration).toContain('"deal_imports_note_work_update"')
    expect(migration).toContain("ELSIF p_kind = 'import_apply' THEN")
    expect(migration).toContain("'purge_spent', 'orphan_sweep', 'import_apply') THEN")
  })
})
