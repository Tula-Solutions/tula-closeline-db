import { describe, expect, test } from 'bun:test'
import { PgDialect } from 'drizzle-orm/pg-core'
import { lineForNumber } from './voice-lookups'

const ORG = `org_${'b2'.repeat(16)}`
const LINE = `line_${'c3'.repeat(16)}`
const NUMBER = '+14155550123'

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

describe('lineForNumber', () => {
  test.each([
    ['an empty number', ''],
    ['no plus sign', '14155550123'],
    ['a leading zero after the plus', '+04155550123'],
    ['too few digits', '+141555'],
    ['too many digits', '+1415555012345678'],
    ['a trailing newline', `${NUMBER}\n`],
    ['a space', `${NUMBER} `],
    ['a pattern character', '+1415555%'],
    ['letters', '+1415555012a'],
  ])('is null for %s without any query', async (_name, number) => {
    const { db, seen } = dbAnswering([{ organization_id: ORG, line_id: LINE }])
    expect(await lineForNumber(db, number)).toBeNull()
    expect(seen).toEqual([])
  })

  test('calls the lookup function with the number as a bound parameter and maps the row', async () => {
    const { db, seen } = dbAnswering([{ organization_id: ORG, line_id: LINE }])
    expect(await lineForNumber(db, NUMBER)).toEqual({ organizationId: ORG, lineId: LINE })
    expect(seen[0]?.sql).toContain('voice.line_for_number($1)')
    expect(seen[0]?.params).toEqual([NUMBER])
  })

  test('is null when no active Line of an active Organization opens', async () => {
    expect(await lineForNumber(dbAnswering([]).db, NUMBER)).toBeNull()
  })
})
