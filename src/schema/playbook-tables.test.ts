import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { is } from 'drizzle-orm'
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core'
import { NON_TENANT_TABLES } from '../isolation'
import { tenantRlsStatements } from '../tenant'
import * as schemas from './index'
import {
  CONSUMED_MESSAGE_STATES,
  DOCUMENT_FAILURE_REASONS,
  DOCUMENT_STATES,
  INGESTION_STEPS,
} from './playbook-tables'

const tables = Object.values<unknown>(schemas)
  .filter((value): value is PgTable => is(value, PgTable))
  .map((table) => getTableConfig(table))
  .filter((config) => config.schema === 'playbook')

const read = (name: string) =>
  readFileSync(new URL(`../../migrations/${name}`, import.meta.url), 'utf8')
const documentsMigration = read('0009_playbook_documents.sql')
const consumedMigration = read('0010_playbook_consumed_message.sql')

const NAMES = [
  'consumed_message',
  'documents',
  'index_settings',
  'ingestion_jobs',
  'organization_usage',
]

describe('the playbook schema', () => {
  test('has the five tenant tables and nothing else', () => {
    expect(tables.map((t) => t.name).sort()).toEqual(NAMES)
  })

  test.each(NAMES)('%s has organization_id, the canonical policy, and is not exempt', (name) => {
    const config = tables.find((t) => t.name === name)
    expect(config?.columns.map((c) => c.name)).toContain('organization_id')
    const sql = documentsMigration + consumedMigration
    for (const statement of tenantRlsStatements('playbook', name)) {
      expect(sql).toContain(statement)
    }
    expect(NON_TENANT_TABLES).not.toContain(`playbook.${name}`)
  })

  test('the document states are exactly the five of ADR 0016, in the check constraint too', () => {
    expect<string[]>([...DOCUMENT_STATES]).toEqual([
      'uploaded',
      'processing',
      'ready',
      'failed',
      'deleted',
    ])
    expect(documentsMigration).toContain(
      `"state" in ('uploaded', 'processing', 'ready', 'failed', 'deleted')`
    )
  })

  test('the failure reasons are the closed list, in both tables', () => {
    expect<string[]>([...DOCUMENT_FAILURE_REASONS]).toEqual([
      'too_many_pages',
      'unreadable',
      'password_protected',
      'no_text',
      'processing_failed',
    ])
    const list = DOCUMENT_FAILURE_REASONS.map((r) => `'${r}'`).join(', ')
    expect(documentsMigration).toContain(`"failure_reason" in (${list})`)
    expect(documentsMigration.split(`in (${list})`).length).toBe(3)
  })

  test('the steps and consumed states are the closed lists', () => {
    expect<string[]>([...INGESTION_STEPS]).toEqual(['parse', 'chunk', 'embed', 'index'])
    expect<string[]>([...CONSUMED_MESSAGE_STATES]).toEqual(['claimed', 'done'])
  })

  test('no table stores content or text', () => {
    const forbidden = /^(content|text|body|chunk|chunks|extracted_text|data|file)$/
    for (const table of tables) {
      for (const column of table.columns) {
        expect(column.name).not.toMatch(forbidden)
      }
    }
  })

  test('a deleted document has its times, a failed one its reason, a purged one is a removed row', () => {
    for (const name of [
      'documents_deleted_has_times',
      'documents_failed_has_reason',
      'documents_purge_only_when_deleted',
      'documents_deleted_is_counted',
    ]) {
      expect(documentsMigration).toContain(`CONSTRAINT "${name}"`)
    }
  })

  test('the content hash is unique among documents not being purged', () => {
    const documents = tables.find((t) => t.name === 'documents')
    const index = documents?.indexes.find((i) => i.config.name === 'documents_content_hash_key')
    expect(index?.config.unique).toBe(true)
    expect(index?.config.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'organization_id',
      'content_hash',
    ])
    expect(documentsMigration).toContain('WHERE "playbook"."documents"."purge_started_at" is null')
  })

  test('indexes: the three the ticket names and none else on documents', () => {
    const names = (table: string) =>
      tables
        .find((t) => t.name === table)
        ?.indexes.map((i) => i.config.name)
        .sort()
    expect(names('documents')).toEqual([
      'documents_content_hash_key',
      'documents_list_idx',
      'documents_purge_idx',
    ])
    expect(names('ingestion_jobs')).toEqual([
      'ingestion_jobs_active_document_key',
      'ingestion_jobs_document_idx',
      'ingestion_jobs_due_idx',
    ])
    expect(names('consumed_message')).toEqual([
      'consumed_message_done_idx',
      'consumed_message_lease_idx',
    ])
  })

  test('the consumed-message key is the kit contract key', () => {
    const config = tables.find((t) => t.name === 'consumed_message')
    expect(config?.primaryKeys[0]?.columns.map((c) => c.name)).toEqual([
      'consumer',
      'organization_id',
      'message_id',
    ])
  })

  test('the quota counters are written only by the triggers', () => {
    expect(documentsMigration).toContain(
      'REVOKE INSERT, UPDATE, DELETE ON "playbook"."organization_usage" FROM closeline_playbook'
    )
    expect(documentsMigration).toContain('AFTER INSERT OR DELETE ON "playbook"."documents"')
  })

  test('the role may delete only a deleted document and never a job', () => {
    expect(documentsMigration).toContain('AS RESTRICTIVE FOR DELETE')
    expect(documentsMigration).toContain('REVOKE UPDATE, DELETE ON "playbook"."ingestion_jobs"')
  })
})
