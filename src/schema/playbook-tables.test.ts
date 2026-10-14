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
const idempotencyMigration = read('0011_playbook_idempotency_keys.sql')
const discoveryMigration = read('0012_playbook_work_discovery.sql')
const orphanMigration = read('0014_playbook_pending_cleanup_orphans.sql')
const salesMigration = read('0015_playbook_sales_history.sql')
const callsMigration = read('0016_playbook_calls.sql')

const NAMES = [
  'call_jobs',
  'calls',
  'consumed_message',
  'deal_import_rows',
  'deal_imports',
  'deals',
  'documents',
  'idempotency_keys',
  'index_settings',
  'ingestion_jobs',
  'organization_usage',
  'orphan_sweeps',
  'rights_confirmations',
]

describe('the playbook schema', () => {
  test('has the thirteen tenant tables and the work registry, and nothing else', () => {
    expect(tables.map((t) => t.name).sort()).toEqual([...NAMES, 'work_hints'].sort())
  })

  test('the work registry is exempt from the Organization check, and no role may touch it', () => {
    expect(NON_TENANT_TABLES).toContain('playbook.work_hints')
    expect(discoveryMigration).toContain(
      'REVOKE ALL ON "playbook"."work_hints" FROM closeline_playbook;'
    )
    expect(discoveryMigration).not.toContain('ENABLE ROW LEVEL SECURITY')
  })

  test.each(NAMES)('%s has organization_id, the canonical policy, and is not exempt', (name) => {
    const config = tables.find((t) => t.name === name)
    expect(config?.columns.map((c) => c.name)).toContain('organization_id')
    const sql =
      documentsMigration +
      consumedMigration +
      idempotencyMigration +
      orphanMigration +
      salesMigration +
      callsMigration
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

  test('indexes: the ones the ticket names, the deleted list, and none else on documents', () => {
    const names = (table: string) =>
      tables
        .find((t) => t.name === table)
        ?.indexes.map((i) => i.config.name)
        .sort()
    expect(names('documents')).toEqual([
      'documents_cleanup_idx',
      'documents_content_hash_key',
      'documents_deleted_list_idx',
      'documents_list_idx',
      'documents_purge_idx',
      'documents_spent_purge_idx',
      'documents_state_list_idx',
      'documents_unbarred_idx',
    ])
    expect(names('work_hints')).toEqual(['work_hints_due_idx'])
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

  test.each([
    'documents',
    'organization_usage',
    'ingestion_jobs',
    'index_settings',
    'idempotency_keys',
  ])(
    '%s refuses the all-zero Organization id, which is the global scope of consumed messages only',
    (name) => {
      const sql = documentsMigration + idempotencyMigration
      expect(sql).toContain(
        `CONSTRAINT "${name}_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000')`
      )
      expect(consumedMigration).not.toContain('not_global')
    }
  )

  test("the deleted list has its own partial index, and the idempotency key is core's without the foreign key", () => {
    expect(documentsMigration).toContain(
      'CREATE INDEX "documents_deleted_list_idx" ON "playbook"."documents" USING btree ("organization_id","created_at","id") WHERE "playbook"."documents"."state" = \'deleted\''
    )
    expect(idempotencyMigration).toContain('PRIMARY KEY("organization_id","user_id","route","key")')
    expect(idempotencyMigration).not.toContain('FOREIGN KEY')
    expect(idempotencyMigration).toContain('BEFORE UPDATE ON "playbook"."idempotency_keys"')
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

  describe('migration 0012', () => {
    test('the discovery function is a pinned, definer, capped, playbook-only entry point', () => {
      const fn = discoveryMigration.slice(
        discoveryMigration.indexOf('CREATE FUNCTION "playbook"."organizations_with_work"'),
        discoveryMigration.indexOf('CREATE FUNCTION "playbook"."remove_organization_rest"')
      )
      expect(fn).toContain('SECURITY DEFINER')
      expect(fn).toContain('SET search_path = pg_catalog, pg_temp')
      expect(fn).toContain('least(greatest(coalesce(p_batch, 1), 1), 500)')
      expect(fn).toContain('FOR UPDATE OF h SKIP LOCKED')
      expect(fn).toContain('p_kind = \'consumed_purge\' OR h."organization_id" <> v_global')
      expect(discoveryMigration).toContain(
        'REVOKE ALL ON FUNCTION "playbook"."organizations_with_work"(text, text, integer), "playbook"."remove_organization_rest"(text, text) FROM PUBLIC;'
      )
      expect(discoveryMigration).toContain(
        'GRANT EXECUTE ON FUNCTION "playbook"."organizations_with_work"(text, text, integer), "playbook"."remove_organization_rest"(text, text) TO closeline_playbook;'
      )
    })

    test('every function pins its search path, and every definer function lives in the playbook schema', () => {
      const functions = discoveryMigration.split('CREATE FUNCTION').slice(1)
      expect(functions.length).toBe(7)
      for (const body of functions) {
        expect(body.startsWith(' "playbook".')).toBe(true)
        expect(body).toContain('SET search_path = pg_catalog, pg_temp')
        expect(body).toContain('SECURITY DEFINER')
      }
    })

    test('the erase and restore bar is a column with a check, and the hash index leaves barred documents out', () => {
      expect(discoveryMigration).toContain('ADD COLUMN "restore_barred_at"')
      expect(discoveryMigration).toContain('"documents_barred_only_when_deleted"')
      expect(discoveryMigration).toContain(
        '"purge_started_at" is null and "playbook"."documents"."restore_barred_at" is null'
      )
    })

    test('the remove-rest function refuses while a document exists and acts on the scoped Organization only', () => {
      expect(discoveryMigration).toContain(
        'IF EXISTS (SELECT 1 FROM "playbook"."documents" d WHERE d."organization_id" = p_organization_id) THEN'
      )
      expect(discoveryMigration).toContain(
        "current_setting('app.organization_id', true) IS DISTINCT FROM p_organization_id"
      )
      expect(discoveryMigration).toContain(
        'pg_advisory_xact_lock(hashtextextended(p_organization_id, 0))'
      )
    })
  })
})
