import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import { CALL_ORIGINS, calls } from './playbook-calls'
import {
  MAX_SUGGESTION_MOMENTS,
  MAX_SUGGESTION_TEXT_LENGTH,
  SUGGESTION_FINGERPRINT_BYTES,
  SUGGESTION_KINDS,
  SUGGESTION_STATUSES,
  suggestions,
} from './playbook-suggestions'

const migrationsDir = new URL('../../migrations/', import.meta.url)
const file = readdirSync(migrationsDir).find((name) =>
  name.endsWith('_core_analytics_playbook_suggestions.sql')
)
const migration = file ? readFileSync(new URL(file, migrationsDir), 'utf8') : ''

describe('playbook suggestions and the Moment origin', () => {
  test('suggestions is a tenant table in the playbook schema with the canonical policy', () => {
    const config = getTableConfig(suggestions)
    expect(config.schema).toBe('playbook')
    expect(config.name).toBe('suggestions')
    expect(config.columns.map((c) => c.name)).toContain('organization_id')
    for (const statement of tenantRlsStatements('playbook', 'suggestions')) {
      expect(migration).toContain(statement)
    }
  })

  test('the mirrored values are pinned', () => {
    expect([...SUGGESTION_KINDS]).toEqual([
      'objection_answer',
      'discovery_question',
      'closing_move',
    ])
    expect([...SUGGESTION_STATUSES]).toEqual(['pending', 'accepted', 'rejected'])
    expect(MAX_SUGGESTION_TEXT_LENGTH).toBe(1000)
    expect(MAX_SUGGESTION_MOMENTS).toBe(10)
    expect(SUGGESTION_FINGERPRINT_BYTES).toBe(32)
  })

  test('a fingerprint is unique per Organization, so a rejected one is not proposed again', () => {
    const index = getTableConfig(suggestions).indexes.find(
      (i) => i.config.name === 'suggestions_fingerprint_key'
    )
    expect(index?.config.unique).toBe(true)
    expect(index?.config.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'organization_id',
      'fingerprint',
    ])
  })

  test('origin is imported, rep or agent, defaults to imported, and changes no existing row', () => {
    expect([...CALL_ORIGINS]).toEqual(['imported', 'rep', 'agent'])
    const column = getTableConfig(calls).columns.find((c) => c.name === 'origin')
    expect(column?.notNull).toBe(true)
    expect(column?.default).toBe('imported')
    expect(migration).toContain('ADD COLUMN "origin" text DEFAULT \'imported\' NOT NULL')
  })
})
