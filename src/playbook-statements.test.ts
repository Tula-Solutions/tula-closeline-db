import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  CONSUMED_CLAIM,
  CONSUMED_COMPLETE,
  CONSUMED_PURGE,
  CONSUMED_RENEW,
  DOCUMENT_CLEANUP_BEGIN,
  DOCUMENT_CLEANUP_DONE,
  DOCUMENT_INSERT,
  DOCUMENT_MIN_RETENTION_MS,
  DOCUMENT_PURGE_CLAIM,
  DOCUMENT_PURGE_COMPLETE,
  DOCUMENT_RESTORE,
  DOCUMENT_SOFT_DELETE,
  INDEX_SETTINGS_UPSERT,
  INGESTION_JOB_ADVANCE,
  INGESTION_JOB_CLAIM,
  INGESTION_JOB_GIVE_UP_SPENT,
  PLAYBOOK_MIN_LEASE_MS,
  PLAYBOOK_STATEMENTS,
} from './playbook-statements'
import { DOCUMENT_PURGE_MAX_ATTEMPTS, INGESTION_JOB_MAX_ATTEMPTS } from './schema/playbook-tables'

const readme = readFileSync(fileURLToPath(new URL('../README.md', import.meta.url)), 'utf8')

/** The statements that take a point in time from the caller, each for one named reason. */
const TAKES_A_TIME = ['CONSUMED_PURGE', 'DOCUMENT_LIST']

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
      expect(text).toMatch(/^with \w+ as \(\n\s+select [\s\S]*for update skip locked\)/)
    }
  })

  test('a soft delete is one write that sets the due time from the clock and floors the retention', () => {
    expect(DOCUMENT_MIN_RETENTION_MS).toBeGreaterThanOrEqual(3_600_000)
    expect(DOCUMENT_SOFT_DELETE).toContain(
      `greatest(coalesce($4::float8, 0), ${DOCUMENT_MIN_RETENTION_MS})`
    )
    expect(DOCUMENT_SOFT_DELETE).toContain('deletion_seq = deletion_seq + 1')
    expect(DOCUMENT_SOFT_DELETE).toContain("state = 'cancelled'")
    expect(DOCUMENT_SOFT_DELETE).toContain('returning id, deletion_seq, purge_due_at')
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
})
