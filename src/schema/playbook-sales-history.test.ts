import { describe, expect, test } from 'bun:test'
import { getTableConfig } from 'drizzle-orm/pg-core'
import {
  DEAL_ID_MAX_BYTES,
  DEAL_ID_MAX_LENGTH,
  DEAL_IMPORT_FAILURE_REASONS,
  DEAL_IMPORT_MAX_BYTES,
  DEAL_IMPORT_MAX_ROWS,
  DEAL_IMPORT_ROW_REASONS,
  DEAL_IMPORT_ROW_RESULTS,
  DEAL_IMPORT_STATES,
  DEAL_MAX_SEQ,
  DEAL_NAME_MAX_BYTES,
  DEAL_NAME_MAX_LENGTH,
  DEAL_OUTCOMES,
  dealImportRows,
  dealImports,
  deals,
  RIGHTS_MAX_WORDING_VERSION,
  rightsConfirmations,
} from './playbook-sales-history'
import { WORK_KINDS } from './playbook-work-hints'

describe('the sales-history values match the contract at v0.8.0', () => {
  // Each line names the contract constant it copies. A change there that is not made here (or the
  // reverse) fails this test, which is how the document lists are kept aligned.
  test('lists', () => {
    expect(DEAL_OUTCOMES).toEqual(['won', 'lost', 'open']) // OUTCOMES
    expect(DEAL_IMPORT_STATES).toEqual(['uploaded', 'processing', 'completed', 'failed']) // DEAL_IMPORT_STATES
    expect(DEAL_IMPORT_FAILURE_REASONS).toEqual([
      'too_many_rows',
      'unreadable',
      'processing_failed',
    ]) // DEAL_IMPORT_FAILURE_REASONS
    expect(DEAL_IMPORT_ROW_RESULTS).toEqual(['applied', 'rejected']) // DEAL_IMPORT_ROW_RESULTS
    expect(DEAL_IMPORT_ROW_REASONS).toEqual([
      'wrong_column_count',
      'invalid_deal_id',
      'duplicate_in_file',
      'invalid_outcome',
      'invalid_closed_at',
      'invalid_amount',
      'invalid_currency',
      'invalid_name',
      'outcome_already_decided',
      'deal_limit_reached',
    ]) // DEAL_IMPORT_ROW_REASONS
  })

  test('numbers', () => {
    expect(DEAL_ID_MAX_LENGTH).toBe(128) // MAX_DEAL_ID_LENGTH
    expect(DEAL_ID_MAX_BYTES).toBe(128 * 4) // MAX_DEAL_ID_BYTES
    expect(DEAL_NAME_MAX_LENGTH).toBe(200) // MAX_DEAL_NAME_LENGTH
    expect(DEAL_NAME_MAX_BYTES).toBe(200 * 4) // MAX_DEAL_NAME_BYTES
    expect(DEAL_IMPORT_MAX_ROWS).toBe(50_000) // MAX_DEAL_IMPORT_ROWS
    expect(DEAL_IMPORT_MAX_BYTES).toBe(10 * 1024 * 1024) // MAX_DEAL_IMPORT_BYTES
    expect(DEAL_MAX_SEQ).toBe(2_147_483_647) // MAX_DELETION_SEQ
    expect(RIGHTS_MAX_WORDING_VERSION).toBe(1_000_000) // MAX_RIGHTS_WORDING_VERSION
  })

  test('the id prefixes are the contract ids', () => {
    const checks = (table: Parameters<typeof getTableConfig>[0]) =>
      getTableConfig(table).checks.map((c) => c.name)
    expect(checks(deals)).toContain('deals_id_shape') // dealRecordIdSchema: deal_<32 hex>
    expect(checks(dealImports)).toContain('deal_imports_id_shape') // dealImportIdSchema: dimp_<32 hex>
  })
})

describe('the sales-history tables', () => {
  const names = (table: Parameters<typeof getTableConfig>[0]) => {
    const config = getTableConfig(table)
    return {
      checks: config.checks.map((c) => c.name),
      indexes: config.indexes.map((i) => i.config.name),
    }
  }

  test('a Deal has a unique customer id per Organization and the list indexes', () => {
    const { indexes, checks } = names(deals)
    expect(indexes).toEqual(
      expect.arrayContaining([
        'deals_deal_id_key',
        'deals_list_idx',
        'deals_outcome_list_idx',
        'deals_import_list_idx',
      ])
    )
    expect(checks).toEqual(
      expect.arrayContaining(['deals_outcome_seq_range', 'deals_amount_has_currency'])
    )
  })

  test('an import row is unique per first deal id and has no cell but the four it reports', () => {
    expect(Object.keys(dealImportRows).sort()).toEqual(
      expect.arrayContaining(['dealId', 'reason', 'result', 'rowNumber'])
    )
    const columns = getTableConfig(dealImportRows).columns.map((c) => c.name)
    expect(columns.sort()).toEqual(
      ['deal_id', 'import_id', 'organization_id', 'reason', 'result', 'row_number'].sort()
    )
    expect(names(dealImportRows).indexes).toContain('deal_import_rows_first_key')
  })

  test('an import is a job: a lease, a due index and an unerased index', () => {
    const { indexes } = names(dealImports)
    expect(indexes).toEqual(
      expect.arrayContaining(['deal_imports_due_idx', 'deal_imports_unerased_idx'])
    )
  })

  test('the rights confirmation is one row per Organization', () => {
    const columns = getTableConfig(rightsConfirmations).columns
    expect(columns.find((c) => c.name === 'organization_id')?.primary).toBe(true)
  })

  test('the work kind exists', () => {
    expect(WORK_KINDS).toContain('import_apply')
  })
})
