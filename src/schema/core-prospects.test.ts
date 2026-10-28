import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  FIELD_HISTORY_STATES,
  IDENTITY_VALUE_PATTERNS,
  MAX_FIELD_HISTORY_ENTRIES,
  MAX_MERGED_PROSPECTS,
  MAX_PROSPECT_IMPORT_BYTES,
  MAX_PROSPECT_IMPORT_ROWS,
  MAX_PROSPECT_TECHNOLOGIES_VALUE_LENGTH,
  PROSPECT_COMPANY_FIELD_NAMES,
  PROSPECT_FIELD_NAMES,
  PROSPECT_IDENTITY_KINDS,
  PROSPECT_IMPORT_REJECT_REASONS,
  PROSPECT_IMPORT_SKIP_REASONS,
  PROSPECT_MERGE_UNDO_DAYS,
  prospectCompanies,
  prospectCompanyFields,
  prospectFields,
  prospectIdentities,
  prospectImportRows,
  prospectImports,
  prospectMerges,
  prospects,
} from './core-prospects'

const migration = readFileSync(
  new URL('../../migrations/0023_core_prospects.sql', import.meta.url),
  'utf8'
)

const TABLES = {
  prospect_companies: prospectCompanies,
  prospect_company_fields: prospectCompanyFields,
  prospect_fields: prospectFields,
  prospect_identities: prospectIdentities,
  prospect_import_rows: prospectImportRows,
  prospect_imports: prospectImports,
  prospect_merges: prospectMerges,
  prospects,
}

describe('the prospect tables', () => {
  test.each(Object.entries(TABLES))(
    '%s is tenant-scoped with an organization_id',
    (name, table) => {
      const config = getTableConfig(table)
      expect(config.name).toBe(name)
      expect(config.schema).toBe('core')
      expect(config.columns.map((c) => c.name)).toContain('organization_id')
    }
  )

  test.each(Object.keys(TABLES))(
    'the migration runs the canonical row-level-security statements for %s',
    (name) => {
      for (const statement of tenantRlsStatements('core', name)) {
        expect(migration).toContain(statement)
      }
    }
  )

  test('the duplicate-identity rule is the primary key (organization_id, kind, value)', () => {
    const pk = getTableConfig(prospectIdentities).primaryKeys[0]
    expect(pk?.columns.map((c) => c.name)).toEqual(['organization_id', 'kind', 'value'])
  })

  test('mirrors the contract constants', () => {
    expect(PROSPECT_IDENTITY_KINDS).toEqual(['email', 'phone', 'linkedin'])
    expect(PROSPECT_FIELD_NAMES).toEqual([
      'first_name',
      'last_name',
      'job_title',
      'email',
      'phone',
      'linkedin_url',
    ])
    expect(FIELD_HISTORY_STATES).toEqual(['current', 'superseded', 'suggested'])
    expect(MAX_FIELD_HISTORY_ENTRIES).toBe(50)
    expect(MAX_MERGED_PROSPECTS).toBe(5)
    expect(PROSPECT_MERGE_UNDO_DAYS).toBe(30)
    expect(MAX_PROSPECT_IMPORT_ROWS).toBe(50_000)
    expect(MAX_PROSPECT_IMPORT_BYTES).toBe(10 * 1024 * 1024)
    expect(PROSPECT_IMPORT_SKIP_REASONS).toEqual(['no_change', 'manual_values_kept'])
    expect(PROSPECT_IMPORT_REJECT_REASONS).toHaveLength(14)
  })

  test('the Company enrichment fields, their bounds and provenance names are in the migration', () => {
    const company = readFileSync(
      new URL('../../migrations/0028_core_company_enrichment.sql', import.meta.url),
      'utf8'
    )
    expect(PROSPECT_COMPANY_FIELD_NAMES).toEqual([
      'name',
      'domain',
      'industry',
      'employee_count',
      'region',
      'technologies',
    ])
    for (const column of [
      'industry" text',
      'employee_count" integer',
      'region" text',
      'technologies" text[]',
    ]) {
      expect(company).toContain(`ADD COLUMN "${column}`)
    }
    expect(company).toContain('cardinality(technologies) <= 50')
    expect(company).toContain('NOT BETWEEN 1 AND 100')
    expect(company).toContain('"employee_count" >= 0')
    expect(MAX_PROSPECT_TECHNOLOGIES_VALUE_LENGTH).toBe(5300)
    expect(company).toContain('between 1 and 5300')
    expect(company).toContain('IMMUTABLE PARALLEL SAFE')
    expect(company).toContain('^[0-9]{1,9}$')
    expect(company).toContain(
      'REVOKE ALL ON FUNCTION "core"."prospect_company_technologies_text_valid"(text) FROM PUBLIC'
    )
    const columns = getTableConfig(prospectCompanies).columns.map((c) => c.name)
    expect(columns).toEqual(
      expect.arrayContaining(['industry', 'employee_count', 'region', 'technologies'])
    )
  })

  test('the history cap in the trigger equals the constant', () => {
    expect(migration).toContain(`IF kept >= ${MAX_FIELD_HISTORY_ENTRIES} THEN`)
  })

  test('the nullable foreign keys null only their own column', () => {
    expect(migration).toContain('ON DELETE set null ("company_id")')
    expect(migration).toContain('ON DELETE set null ("owner_membership_id")')
  })

  test('identity patterns accept normalised values and refuse the rest', () => {
    const phone = new RegExp(IDENTITY_VALUE_PATTERNS.phone)
    expect(phone.test('+14155550123')).toBe(true)
    expect(phone.test('14155550123')).toBe(false)
    const linkedin = new RegExp(IDENTITY_VALUE_PATTERNS.linkedin)
    expect(linkedin.test('linkedin.com/in/ada-lovelace')).toBe(true)
    expect(linkedin.test('https://linkedin.com/in/ada')).toBe(false)
    expect(linkedin.test('www.linkedin.com/in/ada')).toBe(false)
    expect(linkedin.test('linkedin.com/in/ada/')).toBe(false)
    expect(linkedin.test('linkedin.com/in/ada?x=1')).toBe(false)
  })
})

describe('duplicate suggestions', () => {
  test('earlier values are indexed by field and text, outside the current ones', () => {
    const index = getTableConfig(prospectFields).indexes.find(
      (i) => i.config.name === 'prospect_fields_value_idx'
    )

    expect(index?.config.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'organization_id',
      'field_name',
      'value',
    ])
    expect(index?.config.where).toBeDefined()
    expect(
      readFileSync(
        new URL('../../migrations/0070_core_prospect_fields_value_idx.sql', import.meta.url),
        'utf8'
      )
    ).toContain(`WHERE "core"."prospect_fields"."state" <> 'current'`)
  })
})
