import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  AGENT_KINDS,
  API_KEY_SCOPES,
  AUDIT_ACTOR_KINDS,
  agentInstructionPointers,
  agentInstructionVersions,
  agentSettings,
  apiKeyUsage,
  auditEvents,
  CONTROL_LEVELS,
  coreApiKeys,
  EXPORT_FAILURE_REASONS,
  EXPORT_KINDS,
  EXPORT_PART_FAILURE_REASONS,
  EXPORT_PART_STATES,
  EXPORT_SERVICES,
  EXPORT_STATES,
  exportJobs,
  exportParts,
  MAX_AGENT_INSTRUCTION_LENGTH,
  MAX_API_KEY_NAME_LENGTH,
  MAX_AUDIT_METADATA_BYTES,
  MAX_EXPORT_PART_BYTES,
  MAX_EXPORT_PART_FILES,
} from './core-controls'

const migrationsDir = new URL('../../migrations/', import.meta.url)
const file = readdirSync(migrationsDir).find((name) => name.endsWith('_core_agent_controls.sql'))
const migration = file ? readFileSync(new URL(file, migrationsDir), 'utf8') : ''

const TABLES = {
  agent_instruction_pointer: agentInstructionPointers,
  agent_instruction_versions: agentInstructionVersions,
  agent_settings: agentSettings,
  api_key_usage: apiKeyUsage,
  api_keys: coreApiKeys,
  audit_events: auditEvents,
  export_jobs: exportJobs,
  export_parts: exportParts,
}

type Table = (typeof TABLES)[keyof typeof TABLES]

const indexNames = (table: Table) => getTableConfig(table).indexes.map((i) => i.config.name)
const indexOf = (table: Table, name: string) =>
  getTableConfig(table).indexes.find((i) => i.config.name === name)
const columnsOf = (table: Table, name: string) =>
  indexOf(table, name)?.config.columns.map((c) => ('name' in c ? c.name : ''))

describe('the agent control, audit, export and API key tables', () => {
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

  test('audit events and instruction versions are append-only for the service role', () => {
    for (const name of ['audit_events', 'agent_instruction_versions']) {
      expect(migration).toContain(
        `REVOKE UPDATE, DELETE, TRUNCATE ON "core"."${name}" FROM closeline_core;`
      )
    }
  })

  test('the audit chain is enforced by a trigger and is unique per Organization', () => {
    expect(migration).toContain('CREATE TRIGGER "audit_events_chain"')
    expect(columnsOf(auditEvents, 'audit_events_sequence_key')).toEqual([
      'organization_id',
      'sequence',
    ])
    expect(indexOf(auditEvents, 'audit_events_sequence_key')?.config.unique).toBe(true)
  })

  test('the audit log has a keyset index for each way it is listed', () => {
    expect(indexNames(auditEvents).sort()).toEqual([
      'audit_events_action_idx',
      'audit_events_actor_agent_idx',
      'audit_events_actor_api_key_idx',
      'audit_events_actor_member_idx',
      'audit_events_occurred_idx',
      'audit_events_prospect_idx',
      'audit_events_sequence_key',
      'audit_events_subject_idx',
    ])
  })

  test('a key hash is unique across Organizations and no column holds a plaintext key', () => {
    expect(columnsOf(coreApiKeys, 'api_keys_secret_hash_key')).toEqual(['secret_hash'])
    expect(indexOf(coreApiKeys, 'api_keys_secret_hash_key')?.config.unique).toBe(true)
    const names = getTableConfig(coreApiKeys).columns.map((c) => c.name)
    expect(names.filter((n) => /secret|token/.test(n))).toEqual(['secret_hash'])
    expect(indexNames(coreApiKeys)).toContain('api_keys_list_idx')
  })

  test('one active export per Organization is a partial unique index', () => {
    const index = indexOf(exportJobs, 'export_jobs_one_active_key')
    expect(index?.config.unique).toBe(true)
    expect(index?.config.where).toBeDefined()
    expect(indexNames(exportJobs)).toContain('export_jobs_list_idx')
  })

  test('instruction versions are numbered uniquely per Organization and Agent kind', () => {
    expect(columnsOf(agentInstructionVersions, 'agent_instruction_versions_number_key')).toEqual([
      'organization_id',
      'agent_kind',
      'number',
    ])
    expect(
      indexOf(agentInstructionVersions, 'agent_instruction_versions_number_key')?.config.unique
    ).toBe(true)
  })

  test('no table stores a download link', () => {
    const names = Object.values(TABLES).flatMap((t) => getTableConfig(t).columns.map((c) => c.name))
    expect(names.filter((n) => /url|signed/.test(n))).toEqual([])
  })

  test('the migration grants nothing to another role and leaves auth tables alone', () => {
    expect(migration).not.toMatch(/closeline_(auth|playbook|voice)/)
    expect(migration).not.toMatch(/"auth"\./)
  })

  test('mirrors the contract constants', () => {
    expect(AGENT_KINDS).toEqual(['inbound', 'outbound'])
    expect(MAX_AGENT_INSTRUCTION_LENGTH).toBe(20_000)
    expect(CONTROL_LEVELS).toEqual(['supervised', 'assisted', 'autonomous'])
    expect(AUDIT_ACTOR_KINDS).toEqual(['member', 'agent', 'api_key', 'system'])
    expect(MAX_AUDIT_METADATA_BYTES).toBe(4096)
    expect(EXPORT_KINDS).toEqual(['organization', 'enriched_prospects'])
    expect(EXPORT_STATES).toEqual(['queued', 'running', 'ready', 'failed', 'expired'])
    expect(EXPORT_FAILURE_REASONS).toEqual(['part_failed', 'timed_out', 'storage_unavailable'])
    expect(EXPORT_SERVICES).toEqual(['core', 'playbook', 'voice', 'outbound'])
    expect(EXPORT_PART_STATES).toEqual(['pending', 'ready', 'failed'])
    expect(EXPORT_PART_FAILURE_REASONS).toEqual([
      'write_failed',
      'storage_unavailable',
      'source_unavailable',
    ])
    expect(MAX_EXPORT_PART_FILES).toBe(10_000)
    expect(MAX_EXPORT_PART_BYTES).toBe(50_000_000_000)
    expect(MAX_API_KEY_NAME_LENGTH).toBe(80)
    expect(API_KEY_SCOPES).toHaveLength(16)
  })
})
