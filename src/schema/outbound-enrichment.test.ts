import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  ATTEMPT_FAILURES,
  ATTEMPT_OUTCOMES,
  enrichmentAttempts,
  enrichmentReservations,
  enrichmentRuns,
  enrichmentSpend,
  FIELD_GROUPS,
  FIT_FIELDS,
  FIT_OPERATORS,
  fitCriteria,
  providerSettings,
  RUN_STATUSES,
  SIGNAL_KINDS,
  SIGNAL_SOURCE_TYPES,
  STOP_REASONS,
  signals,
} from './outbound-enrichment'

const migrationFile = readdirSync(new URL('../../migrations/', import.meta.url)).find((f) =>
  f.startsWith('0048_')
)
const migration = readFileSync(
  new URL(`../../migrations/${migrationFile ?? 'missing'}`, import.meta.url),
  'utf8'
)
const leaseMigrationFile = readdirSync(new URL('../../migrations/', import.meta.url)).find((f) =>
  f.startsWith('0050_')
)
const leaseMigration = readFileSync(
  new URL(`../../migrations/${leaseMigrationFile ?? 'missing'}`, import.meta.url),
  'utf8'
)

const TABLES = {
  enrichment_runs: enrichmentRuns,
  enrichment_attempts: enrichmentAttempts,
  signals,
  fit_criteria: fitCriteria,
  provider_settings: providerSettings,
  enrichment_spend: enrichmentSpend,
  enrichment_reservations: enrichmentReservations,
}

const columnNames = (table: (typeof TABLES)[keyof typeof TABLES]) =>
  getTableConfig(table).columns.map((c) => c.name)

describe('the outbound enrichment tables', () => {
  test('the values copy the contract (src/enrichment) at its develop', () => {
    expect(RUN_STATUSES).toEqual(['queued', 'running', 'complete', 'incomplete', 'stopped'])
    expect(STOP_REASONS).toEqual(['monthly_budget', 'run_ceiling'])
    expect(ATTEMPT_OUTCOMES).toEqual([
      'filled',
      'no_result',
      'failed',
      'skipped_disabled',
      'skipped_circuit_open',
      'skipped_budget',
    ])
    expect(ATTEMPT_FAILURES).toEqual([
      'timeout',
      'rate_limited',
      'provider_error',
      'invalid_response',
      'key_rejected',
    ])
    expect(FIELD_GROUPS).toEqual(['person', 'company', 'email_verification'])
    expect(SIGNAL_KINDS).toEqual([
      'funding',
      'hiring_spike',
      'job_change',
      'technology_change',
      'website_visit',
      'note',
    ])
    expect(SIGNAL_SOURCE_TYPES).toEqual(['provider', 'webhook', 'manual'])
    expect(FIT_FIELDS).toEqual(['jobTitle', 'industry', 'employeeCount', 'region', 'technologies'])
    expect(FIT_OPERATORS).toEqual(['one_of', 'contains_any', 'between'])
  })

  test.each(Object.entries(TABLES))('%s is tenant-scoped in the outbound schema', (name, table) => {
    const config = getTableConfig(table)
    expect(config.name).toBe(name)
    expect(config.schema).toBe('outbound')
    expect(columnNames(table)).toContain('organization_id')
    const [pk] = config.primaryKeys
    const keyColumns = pk
      ? pk.columns.map((c) => c.name)
      : config.columns.filter((c) => c.primary).map((c) => c.name)
    expect(keyColumns[0]).toBe('organization_id')
  })

  test.each(Object.keys(TABLES))(
    'the migration runs the canonical row-level-security statements for %s',
    (name) => {
      const source = name === 'enrichment_reservations' ? leaseMigration : migration
      for (const statement of tenantRlsStatements('outbound', name)) {
        expect(source).toContain(statement)
      }
    }
  )

  test('attempts and signals are append-only for the service role', () => {
    for (const table of ['enrichment_attempts', 'signals']) {
      expect(migration).toContain(`REVOKE UPDATE ON "outbound"."${table}" FROM closeline_outbound;`)
    }
  })

  test('a provider key is stored as ciphertext only, never under a plaintext name', () => {
    const names = columnNames(providerSettings)
    expect(names).toContain('credential_ciphertext')
    expect(names).toContain('credential_key_id')
    for (const table of Object.values(TABLES)) {
      for (const name of columnNames(table)) {
        if (/key|secret|token|password|credential/.test(name)) {
          expect(name).toMatch(/ciphertext|key_id|updated_at|request_id|^lease_token$|^hold_key$/)
        }
      }
    }
  })

  test.each([
    [enrichmentRuns, 'enrichment_runs_list_idx', 3],
    [enrichmentRuns, 'enrichment_runs_prospect_idx', 4],
    [enrichmentRuns, 'enrichment_runs_run_set_idx', 4],
    [enrichmentRuns, 'enrichment_runs_status_idx', 4],
    [signals, 'signals_prospect_idx', 4],
    [signals, 'signals_prospect_kind_idx', 5],
    [fitCriteria, 'fit_criteria_list_idx', 3],
    [enrichmentSpend, 'enrichment_spend_list_idx', 3],
    [enrichmentRuns, 'enrichment_runs_request_idx', 2],
    [enrichmentReservations, 'enrichment_reservations_open_idx', 2],
    [enrichmentReservations, 'enrichment_reservations_run_idx', 2],
  ] as const)('%s has the keyset list index %s', (table, name, width) => {
    const index = getTableConfig(table).indexes.find((i) => i.config.name === name)
    expect(index?.config.columns.length).toBe(width)
  })

  test('the request id makes a retried run unique per Prospect', () => {
    const index = getTableConfig(enrichmentRuns).indexes.find(
      (i) => i.config.name === 'enrichment_runs_request_key'
    )
    expect(index?.config.unique).toBe(true)
    expect(index?.config.columns.length).toBe(3)
  })

  test('a webhook event id is unique per Organization', () => {
    const index = getTableConfig(signals).indexes.find((i) => i.config.name === 'signals_event_key')
    expect(index?.config.unique).toBe(true)
  })

  test('a run holds a lease token and heartbeat, both optional', () => {
    const columns = getTableConfig(enrichmentRuns).columns
    for (const name of ['lease_token', 'heartbeat_at']) {
      expect(columns.find((c) => c.name === name)?.notNull).toBe(false)
    }
    expect(columns.find((c) => c.name === 'lease_token')?.getSQLType()).toBe('uuid')
  })

  test('a hold key is unique per Organization, and reservations carry a month and amount', () => {
    const index = getTableConfig(enrichmentReservations).indexes.find(
      (i) => i.config.name === 'enrichment_reservations_hold_key'
    )
    expect(index?.config.unique).toBe(true)
    expect(index?.config.columns.length).toBe(2)
    expect(columnNames(enrichmentReservations)).toEqual(
      expect.arrayContaining(['month', 'amount_micros', 'released_at', 'run_id', 'provider'])
    )
  })
})
