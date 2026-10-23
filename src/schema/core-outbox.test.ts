import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  OUTBOX_DEDUPE_KEY_MAX_LENGTH,
  OUTBOX_ERROR_CODE_MAX_LENGTH,
  OUTBOX_MAX_ATTEMPTS,
  OUTBOX_MAX_BATCH,
  OUTBOX_PAYLOAD_MAX_BYTES,
  OUTBOX_TOPIC_MAX_LENGTH,
  outbox,
} from './core-outbox'

const migrationsDir = new URL('../../migrations/', import.meta.url)
const file = readdirSync(migrationsDir).find((name) => name.endsWith('_core_outbox.sql'))
const migration = file ? readFileSync(new URL(file, migrationsDir), 'utf8') : ''
const config = getTableConfig(outbox)
const indexOf = (name: string) => config.indexes.find((i) => i.config.name === name)

describe('core.outbox', () => {
  test('the migration exists and is a tenant table in the core schema', () => {
    expect(file).toBeDefined()
    expect(config.name).toBe('outbox')
    expect(config.schema).toBe('core')
    expect(config.columns.map((c) => c.name)).toEqual([
      'id',
      'organization_id',
      'topic',
      'payload',
      'dedupe_key',
      'created_at',
      'available_at',
      'attempts',
      'published_at',
      'last_error_code',
    ])
  })

  test('the migration runs the canonical RLS statements', () => {
    for (const statement of tenantRlsStatements('core', 'outbox')) {
      expect(migration).toContain(statement)
    }
  })

  test('the bounds are pinned', () => {
    expect(OUTBOX_MAX_ATTEMPTS).toBe(50)
    expect(OUTBOX_TOPIC_MAX_LENGTH).toBe(120)
    expect(OUTBOX_DEDUPE_KEY_MAX_LENGTH).toBe(200)
    expect(OUTBOX_PAYLOAD_MAX_BYTES).toBe(16_384)
    expect(OUTBOX_ERROR_CODE_MAX_LENGTH).toBe(64)
    expect(OUTBOX_MAX_BATCH).toBe(100)
  })

  test('a write is unique per Organization and dedupe key, so a replay adds no row', () => {
    expect(config.primaryKeys[0]?.getName()).toBe('outbox_pkey')
    const key = indexOf('outbox_dedupe_key')
    expect(key?.config.unique).toBe(true)
    expect(key?.config.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'organization_id',
      'dedupe_key',
    ])
  })

  test('the drain scans unpublished rows by availability, and published rows are indexed for purge', () => {
    const drain = indexOf('outbox_drain_idx')
    expect(drain?.config.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'available_at',
      'id',
    ])
    expect(drain?.config.where).toBeDefined()
    // Parked rows (50 attempts) stay out of the index, so a claim never steps over them.
    expect(migration).toMatch(/outbox_drain_idx[^;]*"attempts" < 50/)
    expect(indexOf('outbox_published_idx')?.config.where).toBeDefined()
  })

  test('the drain functions are owned by their own definer role, and the table is not granted to it whole', () => {
    expect(migration).toContain('OWNER TO closeline_core_outbox_drain')
    expect(migration).not.toMatch(/GRANT (ALL|INSERT|DELETE)[^;]*TO closeline_core_outbox_drain/)
    expect(migration).toContain('FOR UPDATE SKIP LOCKED')
  })
})
