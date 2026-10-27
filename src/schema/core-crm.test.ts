import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  CRM_DIRECTIONS,
  CRM_FIELD_KEYS,
  CRM_MAPPING_KINDS,
  CRM_OBJECT_KINDS,
  CRM_PROVIDERS,
  CRM_REF_STATES,
  CRM_RUN_ERROR_CODES,
  CRM_RUN_STATES,
  CRM_RUN_TRIGGERS,
  CRM_SCOPE_LEVELS,
  CRM_SKIP_REASON_COUNT,
  CRM_STAGE_OUTCOMES,
  CRM_WEBHOOK_WINDOW_SECONDS,
  crmConnections,
  crmExternalRefs,
  crmMappings,
  crmSyncRuns,
  crmWebhookReceipts,
  MAX_CRM_EXTERNAL_ID_LENGTH,
  MAX_CRM_LABEL_LENGTH,
  MAX_CRM_RUN_FAILURES,
} from './core-crm'

const migrationsDir = new URL('../../migrations/', import.meta.url)
const file = readdirSync(migrationsDir).find((name) => name.endsWith('_core_crm.sql'))
const migration = file ? readFileSync(new URL(file, migrationsDir), 'utf8') : ''

const TABLES = {
  crm_connection: crmConnections,
  crm_external_ref: crmExternalRefs,
  crm_mapping: crmMappings,
  crm_sync_run: crmSyncRuns,
  crm_webhook_receipt: crmWebhookReceipts,
}

const indexNames = (table: (typeof TABLES)[keyof typeof TABLES]) =>
  getTableConfig(table).indexes.map((i) => i.config.name)

describe('the CRM tables', () => {
  test('the migration exists', () => {
    expect(file).toBeDefined()
  })

  test.each(Object.entries(TABLES))('%s is a tenant table in the core schema', (name, table) => {
    const config = getTableConfig(table)
    expect(config.name).toBe(name)
    expect(config.schema).toBe('core')
    expect(config.columns.map((c) => c.name)).toContain('organization_id')
  })

  test.each(Object.keys(TABLES))(
    'the migration runs the canonical RLS statements for %s',
    (name) => {
      for (const statement of tenantRlsStatements('core', name)) {
        expect(migration).toContain(statement)
      }
    }
  )

  test('no column holds a plaintext token', () => {
    const names = Object.values(TABLES).flatMap((t) => getTableConfig(t).columns.map((c) => c.name))
    expect(names.filter((n) => /token/.test(n)).sort()).toEqual([
      'access_token_expires_at',
      'access_token_sealed',
      'refresh_token_sealed',
      'token_key_id',
    ])
    const sealed = getTableConfig(crmConnections).columns.filter((c) => c.name.endsWith('_sealed'))
    expect(sealed.map((c) => c.getSQLType())).toEqual(['bytea', 'bytea'])
  })

  test('a connection is unique per provider per Organization and per external account', () => {
    const indexes = getTableConfig(crmConnections).indexes
    const columnsOf = (name: string) =>
      indexes
        .find((i) => i.config.name === name)
        ?.config.columns.map((c) => ('name' in c ? c.name : ''))
    expect(columnsOf('crm_connection_provider_key')).toEqual(['organization_id', 'provider'])
    expect(columnsOf('crm_connection_account_key')).toEqual(['provider', 'external_account_id'])
    expect(
      indexes.filter((i) => i.config.name?.includes('_key')).every((i) => i.config.unique)
    ).toBe(true)
  })

  test('an external reference is unique per Organization, provider, object kind and external id', () => {
    const index = getTableConfig(crmExternalRefs).indexes.find(
      (i) => i.config.name === 'crm_external_ref_object_key'
    )
    expect(index?.config.unique).toBe(true)
    expect(index?.config.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'organization_id',
      'provider',
      'object_kind',
      'external_id',
    ])
    expect(indexNames(crmExternalRefs)).toContain('crm_external_refs_local_idx')
  })

  test('a webhook receipt dedupes on the event id and has an index to prune by age', () => {
    const config = getTableConfig(crmWebhookReceipts)
    expect(config.primaryKeys[0]?.columns.map((c) => c.name)).toEqual([
      'organization_id',
      'connection_id',
      'event_id',
    ])
    expect(indexNames(crmWebhookReceipts)).toEqual(['crm_webhook_receipts_age_idx'])
  })

  test('every run list has a keyset index, newest first', () => {
    expect(indexNames(crmSyncRuns).sort()).toEqual([
      'crm_sync_runs_kind_list_idx',
      'crm_sync_runs_list_idx',
      'crm_sync_runs_retry_of_idx',
      'crm_sync_runs_state_list_idx',
    ])
  })

  test('the migration grants nothing to another role', () => {
    expect(migration).not.toMatch(/closeline_(auth|playbook|voice)/)
  })

  test('mirrors the contract constants', () => {
    expect(CRM_PROVIDERS).toEqual(['hubspot', 'salesforce'])
    expect(CRM_OBJECT_KINDS).toEqual(['deal', 'call', 'company', 'contact'])
    expect(CRM_SCOPE_LEVELS).toEqual(['read', 'read_write'])
    expect(CRM_DIRECTIONS).toEqual(['read_only', 'write_only', 'both'])
    expect(CRM_STAGE_OUTCOMES).toEqual(['won', 'lost', 'open'])
    expect(CRM_RUN_TRIGGERS).toEqual(['first_load', 'manual', 'webhook', 'sweep', 'retry'])
    expect(CRM_RUN_STATES).toEqual(['queued', 'running', 'completed', 'failed'])
    expect(CRM_RUN_ERROR_CODES).toEqual([
      'crm.needs_reconnect',
      'crm.rate_limited',
      'crm.mapping_incomplete',
      'crm.rights_not_confirmed',
    ])
    expect(CRM_FIELD_KEYS).toHaveLength(14)
    expect(CRM_FIELD_KEYS[0]).toBe('deal.outcome')
    expect(CRM_FIELD_KEYS.at(-1)).toBe('activity.notes')
    expect(CRM_MAPPING_KINDS).toEqual(['stage', 'field'])
    expect(CRM_REF_STATES).toEqual(['linked', 'pending_write', 'unlinked'])
    expect(MAX_CRM_EXTERNAL_ID_LENGTH).toBe(128)
    expect(MAX_CRM_LABEL_LENGTH).toBe(200)
    expect(MAX_CRM_RUN_FAILURES).toBe(50)
    expect(CRM_SKIP_REASON_COUNT).toBe(4)
    expect(CRM_WEBHOOK_WINDOW_SECONDS).toBe(300)
  })
})
