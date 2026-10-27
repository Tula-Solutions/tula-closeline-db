import { describe, expect, test } from 'bun:test'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { crmSyncRuns } from './core-crm'
import { outboundDrafts } from './outbound-tables'

/** True when an index on the table starts with exactly the foreign key's columns, in order. */
function fkIsIndexed(table: Parameters<typeof getTableConfig>[0], fkName: string): boolean {
  const config = getTableConfig(table)
  const fk = config.foreignKeys.find((f) => f.getName() === fkName)
  if (!fk) {
    throw new Error(`no foreign key ${fkName}`)
  }
  const cols = fk.reference().columns.map((c) => c.name)
  return config.indexes.some((i) =>
    cols.every((name, n) => {
      const c = i.config.columns[n]
      return c !== undefined && 'name' in c && c.name === name
    })
  )
}

describe('foreign keys that are checked on delete have an index', () => {
  test('crm_sync_run retry_of', () => {
    expect(fkIsIndexed(crmSyncRuns, 'crm_sync_run_retry_of_fk')).toBe(true)
  })
  test('drafts brand voice', () => {
    expect(fkIsIndexed(outboundDrafts, 'drafts_brand_voice_fk')).toBe(true)
  })
})
