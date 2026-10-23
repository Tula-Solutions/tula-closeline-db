import { describe, expect, test } from 'bun:test'
import { PgDialect } from 'drizzle-orm/pg-core'
import {
  claimDemoNotices,
  purgeDemoRequests,
  settleDemoNotice,
  submitDemoRequest,
} from './core-demo-requests'

const ID = `dreq_${'a1'.repeat(16)}`

/** A handle whose `execute` records the query it was given and answers with `rows`. */
function dbAnswering(rows: Record<string, unknown>[]) {
  const seen: { sql: string; params: unknown[] }[] = []
  const dialect = new PgDialect()
  const db = {
    execute: async (query: Parameters<PgDialect['sqlToQuery']>[0]) => {
      seen.push(dialect.sqlToQuery(query))
      return { rows }
    },
  } as never
  return { db, seen }
}

describe('submitDemoRequest', () => {
  test('binds every field as a parameter and maps the row', async () => {
    const { db, seen } = dbAnswering([{ demo_request_id: ID, replayed: true, same_fields: false }])
    const result = await submitDemoRequest(db, {
      id: ID,
      name: "n'; drop table x; --",
      workEmail: 'a@b.test',
      companyName: 'c',
      message: null,
      sourcePage: '/p',
      idempotencyKey: 'k'.repeat(16),
    })
    expect(result).toEqual({ id: ID, replayed: true, sameFields: false })
    expect(seen[0]?.sql).toContain('core.submit_demo_request(')
    expect(seen[0]?.sql).not.toContain('drop table')
    expect(seen[0]?.params).toContain("n'; drop table x; --")
  })

  test('rejects a malformed id before any query', async () => {
    const { db, seen } = dbAnswering([])
    await expect(
      submitDemoRequest(db, {
        id: 'x',
        name: 'n',
        workEmail: 'a@b.test',
        companyName: 'c',
        message: null,
        sourcePage: '/',
        idempotencyKey: 'k'.repeat(16),
      })
    ).rejects.toThrow('invalid id')
    expect(seen).toEqual([])
  })
})

describe('claimDemoNotices', () => {
  test.each([
    [0, 0],
    [1.5, 0],
    [Number.NaN, 0],
    [1, -1],
    [1, 0.5],
  ])('rejects limit %p backoff %p before any query', async (limit, backoff) => {
    const { db, seen } = dbAnswering([])
    await expect(claimDemoNotices(db, limit, backoff)).rejects.toThrow()
    expect(seen).toEqual([])
  })

  test('maps rows to camelCase, dates and oldest first', async () => {
    const row = (id: string, at: string) => ({
      demo_request_id: id,
      name: 'n',
      work_email: 'a@b.test',
      company_name: 'c',
      message: null,
      source_page: '/',
      submitted_at: at,
      attempts: 1,
    })
    const { db, seen } = dbAnswering([
      row('dreq_b', '2026-01-02T00:00:00Z'),
      row('dreq_a', '2026-01-01T00:00:00Z'),
    ])
    const claimed = await claimDemoNotices(db, 5, 60)
    expect(claimed.map((r) => r.id)).toEqual(['dreq_a', 'dreq_b'])
    expect(claimed[0]?.submittedAt).toBeInstanceOf(Date)
    expect(seen[0]?.params).toEqual([5, 60])
  })
})

describe('settleDemoNotice', () => {
  test('rejects a bad id or status before any query', async () => {
    const { db, seen } = dbAnswering([])
    await expect(settleDemoNotice(db, 'x', 'sent')).rejects.toThrow('invalid id')
    await expect(settleDemoNotice(db, ID, 'pending' as never)).rejects.toThrow('status')
    expect(seen).toEqual([])
  })

  test('returns the boolean the function answers', async () => {
    expect(await settleDemoNotice(dbAnswering([{ settled: true }]).db, ID, 'sent')).toBe(true)
    expect(await settleDemoNotice(dbAnswering([{ settled: false }]).db, ID, 'failed')).toBe(false)
  })
})

describe('purgeDemoRequests', () => {
  test('rejects a bad limit and returns the count', async () => {
    await expect(purgeDemoRequests(dbAnswering([]).db, 0)).rejects.toThrow('limit')
    expect(await purgeDemoRequests(dbAnswering([{ purged: 7 }]).db, 10)).toBe(7)
  })
})
