import { describe, expect, test } from 'bun:test'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { Database, Transaction } from './client'
import { ENVIRONMENT_SETTING, withEnvironment } from './environment'

const ENVIRONMENT_ID = '0192f3a4-5b6c-7d8e-9f01-2a3b4c5d6e7f'

/** A database whose transaction records the SQL the callback runs, and whether it ran at all. */
function fakeDb() {
  const dialect = new PgDialect()
  const statements: { sql: string; params: unknown[] }[] = []
  const tx = {
    execute: async (query: Parameters<PgDialect['sqlToQuery']>[0]) => {
      const { sql, params } = dialect.sqlToQuery(query)
      statements.push({ sql, params })
      return { rows: [] }
    },
  } as unknown as Transaction
  const db = {
    transaction: async <T>(fn: (tx: Transaction) => Promise<T>) => fn(tx),
  } as unknown as Database
  return { db, statements }
}

describe('withEnvironment', () => {
  test.each([
    ['an empty string', ''],
    ['an Organization id', `org_${'a'.repeat(32)}`],
    ['a UUID with a suffix', `${ENVIRONMENT_ID}x`],
    ['an injection attempt', `${ENVIRONMENT_ID}'; drop table x; --`],
    ['a UUID without hyphens', ENVIRONMENT_ID.replaceAll('-', '')],
  ])('refuses %s before any query runs', async (_name, id) => {
    const { db, statements } = fakeDb()
    let ran = false
    await expect(
      withEnvironment(db, id, async () => {
        ran = true
      })
    ).rejects.toThrow('withEnvironment: environmentId must be a UUID')
    expect(ran).toBe(false)
    expect(statements).toEqual([])
  })

  test('sets the environment for this transaction only, as a bound parameter', async () => {
    const { db, statements } = fakeDb()
    const result = await withEnvironment(db, ENVIRONMENT_ID, async () => 'done')
    expect(result).toBe('done')
    expect(statements).toHaveLength(1)
    expect(statements[0]?.sql).toBe('select set_config($1, $2, true)')
    expect(statements[0]?.params).toEqual([ENVIRONMENT_SETTING, ENVIRONMENT_ID])
  })

  test('the setting is the one the policies read, not the Organization setting', () => {
    expect(ENVIRONMENT_SETTING).toBe('tula.environment_id')
  })

  test('whatever the callback throws leaves the caller, so the transaction rolls back', async () => {
    const { db } = fakeDb()
    await expect(
      withEnvironment(db, ENVIRONMENT_ID, async () => {
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')
  })
})
