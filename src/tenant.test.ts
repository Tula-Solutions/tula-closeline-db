import { describe, expect, spyOn, test } from 'bun:test'
import { PgDialect } from 'drizzle-orm/pg-core'
import { createDb } from './client'
import { tenantRlsStatements, withOrganization } from './tenant'

const VALID = `org_${'a1'.repeat(16)}`

// Nothing here connects: the pool is lazy and validation fails before a transaction opens.
const { db, close } = createDb('postgres://nobody:nothing@127.0.0.1:1/none')

type TransactionCallback = Parameters<typeof db.transaction>[0]

describe('withOrganization', () => {
  test.each([
    ['an empty id', ''],
    ['the wrong prefix', `usr_${'a1'.repeat(16)}`],
    ['no prefix', 'a1'.repeat(16)],
    ['uppercase hex', `org_${'A1'.repeat(16)}`],
    ['too short', `org_${'a1'.repeat(15)}`],
    ['too long', `org_${'a1'.repeat(17)}`],
    ['non-hex letters', `org_${'g1'.repeat(16)}`],
    ['a trailing newline', `${VALID}\n`],
    ['a leading space', ` ${VALID}`],
    ['a quote and a statement', `org_'; select pg_sleep(10); --${'a'.repeat(10)}`],
    ['a comment marker', `${VALID}--`],
    ['a semicolon suffix', `${VALID};`],
  ])('rejects %s before any query runs', async (_name, id) => {
    const transaction = spyOn(db, 'transaction')
    let ran = false
    await expect(
      withOrganization(db, id, async () => {
        ran = true
      })
    ).rejects.toThrow('organization id')
    expect(transaction).not.toHaveBeenCalled()
    expect(ran).toBe(false)
    transaction.mockRestore()
  })

  test('sets the setting for the transaction only, as a bound parameter', async () => {
    const executed: { sql: string; params: unknown[] }[] = []
    const dialect = new PgDialect()
    const transaction = spyOn(db, 'transaction').mockImplementation(async (callback) => {
      const tx = {
        execute: async (query: Parameters<PgDialect['sqlToQuery']>[0]) => {
          executed.push(dialect.sqlToQuery(query))
          return []
        },
      }
      // The handle only needs `execute` here; the real transaction type is used against Postgres.
      return callback(tx as unknown as Parameters<TransactionCallback>[0])
    })
    const result = await withOrganization(db, VALID, async () => 'done')
    transaction.mockRestore()

    expect(result).toBe('done')
    expect(executed).toHaveLength(1)
    expect(executed[0]?.sql).toContain('set_config')
    expect(executed[0]?.sql).toContain('true)')
    expect(executed[0]?.sql).not.toContain(VALID)
    expect(executed[0]?.params).toEqual(['app.organization_id', VALID])
  })

  test('propagates the callback error so the transaction rolls back', async () => {
    const transaction = spyOn(db, 'transaction').mockImplementation(async (callback) =>
      callback({ execute: async () => [] } as unknown as Parameters<TransactionCallback>[0])
    )
    await expect(
      withOrganization(db, VALID, async () => {
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')
    transaction.mockRestore()
  })
})

describe('tenantRlsStatements', () => {
  const statements = tenantRlsStatements('core', 'prospects')

  test('enables and forces row-level security on the table', () => {
    expect(statements).toContain('ALTER TABLE "core"."prospects" ENABLE ROW LEVEL SECURITY;')
    expect(statements).toContain('ALTER TABLE "core"."prospects" FORCE ROW LEVEL SECURITY;')
  })

  test('creates one policy that reads the setting and treats an empty value as unset', () => {
    const policy = statements.filter((s) => s.startsWith('CREATE POLICY'))
    expect(policy).toHaveLength(1)
    const text = policy[0] ?? ''
    expect(text).toContain(`NULLIF(current_setting('app.organization_id', true), '')`)
    expect(text).toContain('USING (')
    expect(text).toContain('WITH CHECK (')
    expect(text).toContain('ON "core"."prospects"')
    expect(text).toContain('FOR ALL')
  })

  test('enables, then forces, then creates the policy', () => {
    const enable = statements.findIndex((s) => s.includes('ENABLE ROW LEVEL SECURITY'))
    const force = statements.findIndex((s) => s.includes('FORCE ROW LEVEL SECURITY'))
    const policy = statements.findIndex((s) => s.startsWith('CREATE POLICY'))
    expect(enable).toBeGreaterThanOrEqual(0)
    expect(force).toBeGreaterThan(enable)
    expect(policy).toBeGreaterThan(force)
  })

  test.each([
    ['a quote', 'core', 'x"; select 1; --'],
    ['uppercase', 'Core', 'x'],
    ['a dot', 'core', 'a.b'],
    ['a leading digit', 'core', '1x'],
    ['empty', '', 'x'],
    ['too long for an identifier', 'core', 'a'.repeat(64)],
  ])('rejects an unsafe identifier (%s)', (_name, schema, table) => {
    expect(() => tenantRlsStatements(schema, table)).toThrow('identifier')
  })
})

test('closes the pool', async () => {
  await close()
})
