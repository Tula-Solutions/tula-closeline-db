import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  CONSUMED_CLAIM,
  CONSUMED_COMPLETE,
  CONSUMED_LOOKUP,
  CONSUMED_PURGE,
  CONSUMED_RENEW,
  DOCUMENT_CLEANUP_BEGIN,
  DOCUMENT_CLEANUP_DONE,
  DOCUMENT_GET,
  DOCUMENT_INSERT,
  DOCUMENT_LIST,
  DOCUMENT_LIST_DELETED,
  DOCUMENT_MIN_RETENTION_MS,
  DOCUMENT_PURGE_CLAIM,
  DOCUMENT_PURGE_COMPLETE,
  DOCUMENT_REQUEUE,
  DOCUMENT_RESTORE,
  DOCUMENT_RESTORE_FOR_UPLOAD,
  DOCUMENT_SOFT_DELETE,
  IDEMPOTENCY_PURGE,
  INDEX_SETTINGS_UPSERT,
  INGESTION_JOB_ADVANCE,
  INGESTION_JOB_CLAIM,
  INGESTION_JOB_COMPLETE,
  INGESTION_JOB_FAIL,
  INGESTION_JOB_GIVE_UP_SPENT,
  PLAYBOOK_MAX_BATCH,
  PLAYBOOK_MIN_LEASE_MS,
  PLAYBOOK_STATEMENTS,
} from './playbook-statements'
import { DOCUMENT_PURGE_MAX_ATTEMPTS, INGESTION_JOB_MAX_ATTEMPTS } from './schema/playbook-tables'

const readme = readFileSync(fileURLToPath(new URL('../README.md', import.meta.url)), 'utf8')

/** The statements that take a point in time from the caller, each for one named reason. */
const TAKES_A_TIME = ['CONSUMED_PURGE', 'DOCUMENT_LIST', 'DOCUMENT_LIST_DELETED']

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
    expect(DOCUMENT_INSERT).toContain('where purge_started_at is null do nothing')
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
