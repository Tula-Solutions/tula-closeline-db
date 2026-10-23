import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  ANGLE_ORIGINS,
  BRIEF_ENTRY_ROLES,
  CITATION_KINDS,
  CITATION_PROSPECT_FIELDS,
  DRAFT_CHANNELS,
  DRAFT_CHECK_RESULTS,
  DRAFT_CHECKS,
  DRAFT_TEXT_SOURCES,
  MAX_ANGLE_LENGTH,
  MAX_BANNED_PHRASES,
  MAX_BRIEF_STATEMENT_LENGTH,
  MAX_BRIEF_STATEMENTS,
  MAX_CITATION_DOCUMENT_PAGE,
  MAX_CITATION_URL_LENGTH,
  MAX_DRAFT_BODY_LENGTH,
  MAX_DRAFT_CITATIONS,
  MAX_DRAFT_SUBJECT_LENGTH,
  MAX_PREFERRED_WORDS,
  MAX_SIGN_OFF_LENGTH,
  MAX_TONE_LENGTH,
  MAX_VOICE_LENGTH_CHARACTERS,
  MAX_VOICE_TERM_LENGTH,
  OUTBOUND_LANGUAGES,
  outboundBrandVoices,
  outboundBriefStatements,
  outboundBriefs,
  outboundDraftChecks,
  outboundDraftCitations,
  outboundDrafts,
  outboundModelUsage,
} from './outbound-tables'

const migrationFile = readdirSync(new URL('../../migrations/', import.meta.url)).find((f) =>
  f.startsWith('0040_')
)
const migration = readFileSync(
  new URL(`../../migrations/${migrationFile ?? 'missing'}`, import.meta.url),
  'utf8'
)

const TABLES = {
  brand_voices: outboundBrandVoices,
  briefs: outboundBriefs,
  brief_statements: outboundBriefStatements,
  drafts: outboundDrafts,
  draft_citations: outboundDraftCitations,
  draft_checks: outboundDraftChecks,
  model_usage: outboundModelUsage,
}

describe('the outbound tables', () => {
  test.each(Object.entries(TABLES))(
    '%s is tenant-scoped with an organization_id',
    (name, table) => {
      const config = getTableConfig(table)
      expect(config.name).toBe(name)
      expect(config.schema).toBe('outbound')
      expect(config.columns.map((c) => c.name)).toContain('organization_id')
    }
  )

  test.each(Object.keys(TABLES))(
    'the migration runs the canonical row-level-security statements for %s',
    (name) => {
      for (const statement of tenantRlsStatements('outbound', name)) {
        expect(migration).toContain(statement)
      }
    }
  )

  test('the migration confines the outbound role to its own schema and keeps history append-only', () => {
    expect(migration).toContain('REVOKE ALL ON SCHEMA public FROM closeline_outbound;')
    expect(migration).toContain('REVOKE ALL ON SCHEMA "outbound" FROM PUBLIC;')
    expect(migration).toContain('GRANT USAGE ON SCHEMA "outbound" TO closeline_outbound;')
    expect(migration).toContain(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA "outbound" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO closeline_outbound;'
    )
    for (const name of ['brand_voices', 'briefs', 'brief_statements']) {
      expect(migration).toContain(`REVOKE UPDATE ON "outbound"."${name}" FROM closeline_outbound;`)
    }
  })

  test.each(Object.entries(TABLES))(
    '%s has a composite primary key led by the Organization',
    (_, table) => {
      const [pk] = getTableConfig(table).primaryKeys
      expect(pk?.columns.map((c) => c.name)[0]).toBe('organization_id')
    }
  )

  test('a Citation holds ids and scores, never the text of its source', () => {
    const names = getTableConfig(outboundDraftCitations).columns.map((c) => c.name)
    expect(names).toContain('score')
    for (const name of names) {
      expect(name).not.toMatch(/snippet|text|excerpt|content|quote/)
    }
    const statementNames = getTableConfig(outboundBriefStatements).columns.map((c) => c.name)
    expect(statementNames.filter((n) => n.startsWith('source_') && /text|snippet/.test(n))).toEqual(
      []
    )
  })

  test('the lists newest first have an index over (organization_id, created_at desc, id desc)', () => {
    for (const [table, name] of [
      [outboundBriefs, 'briefs_list_idx'],
      [outboundDrafts, 'drafts_list_idx'],
    ] as const) {
      const index = getTableConfig(table).indexes.find((i) => i.config.name === name)
      expect(index?.config.columns.length).toBe(3)
    }
  })

  test('the Draft lists by Prospect, Campaign and grounding each end in (created_at, id)', () => {
    const indexes = getTableConfig(outboundDrafts).indexes
    for (const [name, width] of [
      ['drafts_prospect_idx', 4],
      ['drafts_campaign_idx', 4],
      ['drafts_ungrounded_idx', 3],
    ] as const) {
      const index = indexes.find((i) => i.config.name === name)
      expect(index?.config.columns.length).toBe(width)
    }
  })

  test('a Brand Voice version is unique per Organization', () => {
    const index = getTableConfig(outboundBrandVoices).indexes.find(
      (i) => i.config.name === 'brand_voices_version_key'
    )
    expect(index?.config.unique).toBe(true)
    expect(index?.config.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'organization_id',
      'version',
    ])
  })

  test('the child tables and a Draft each have composite foreign keys', () => {
    expect(getTableConfig(outboundBriefStatements).foreignKeys.length).toBe(1)
    expect(getTableConfig(outboundDraftCitations).foreignKeys.length).toBe(1)
    expect(getTableConfig(outboundDraftChecks).foreignKeys.length).toBe(1)
    expect(getTableConfig(outboundDrafts).foreignKeys.length).toBe(2)
  })

  test('the lists and limits mirror the contract', () => {
    expect(DRAFT_CHANNELS).toEqual(['email'])
    expect(OUTBOUND_LANGUAGES).toEqual(['en'])
    expect(DRAFT_CHECKS).toEqual([
      'citations_resolve',
      'claims_supported',
      'banned_phrase',
      'length',
      'name_match',
    ])
    expect(DRAFT_CHECK_RESULTS).toEqual(['pass', 'fail'])
    expect(DRAFT_TEXT_SOURCES).toEqual(['generated', 'edited'])
    expect(ANGLE_ORIGINS).toEqual(['won_deals', 'model_default'])
    expect(CITATION_KINDS).toEqual(['prospect_field', 'signal', 'web_page', 'moment', 'document'])
    expect(CITATION_PROSPECT_FIELDS).toEqual([
      'firstName',
      'lastName',
      'jobTitle',
      'email',
      'phone',
      'linkedinUrl',
    ])
    expect(BRIEF_ENTRY_ROLES).toEqual(['statement', 'angle_source'])
    expect(MAX_BRIEF_STATEMENTS).toBe(20)
    expect(MAX_BRIEF_STATEMENT_LENGTH).toBe(500)
    expect(MAX_ANGLE_LENGTH).toBe(500)
    expect(MAX_DRAFT_CITATIONS).toBe(20)
    expect(MAX_DRAFT_SUBJECT_LENGTH).toBe(200)
    expect(MAX_DRAFT_BODY_LENGTH).toBe(5000)
    expect(MAX_TONE_LENGTH).toBe(500)
    expect(MAX_PREFERRED_WORDS).toBe(50)
    expect(MAX_BANNED_PHRASES).toBe(100)
    expect(MAX_VOICE_TERM_LENGTH).toBe(100)
    expect(MAX_SIGN_OFF_LENGTH).toBe(200)
    expect(MAX_VOICE_LENGTH_CHARACTERS).toBe(5000)
    expect(MAX_CITATION_URL_LENGTH).toBe(2048)
    expect(MAX_CITATION_DOCUMENT_PAGE).toBe(300)
  })
})
