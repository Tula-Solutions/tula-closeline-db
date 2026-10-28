import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  LINKEDIN_ACCOUNT_STATUSES,
  LINKEDIN_DAILY_CONNECTION_CEILING,
  LINKEDIN_DAILY_MESSAGE_CEILING,
  LINKEDIN_PAUSE_REASONS,
  LINKEDIN_WEEKLY_CONNECTION_CEILING,
  linkedinAccounts,
  linkedinChannelSettings,
  linkedinRiskAcceptances,
  linkedinSends,
  linkedinUsage,
  MAX_LINKEDIN_TYPED_NAME_LENGTH,
} from './outbound-linkedin'

const migrationFile = readdirSync(new URL('../../migrations/', import.meta.url)).find((f) =>
  f.startsWith('0064_')
)
const sendsFile = readdirSync(new URL('../../migrations/', import.meta.url)).find((f) =>
  f.startsWith('0065_')
)
const migration = [migrationFile, sendsFile]
  .map((f) => readFileSync(new URL(`../../migrations/${f ?? 'missing'}`, import.meta.url), 'utf8'))
  .join('\n')

const TABLES = {
  linkedin_accounts: linkedinAccounts,
  linkedin_risk_acceptances: linkedinRiskAcceptances,
  linkedin_channel_settings: linkedinChannelSettings,
  linkedin_usage: linkedinUsage,
  linkedin_sends: linkedinSends,
}

describe('the outbound LinkedIn tables', () => {
  test('the values copy the contract (src/linkedin) at its develop', () => {
    expect(LINKEDIN_ACCOUNT_STATUSES).toEqual([
      'connected',
      'needs_login',
      'paused',
      'restricted',
      'disconnected',
    ])
    expect(LINKEDIN_PAUSE_REASONS).toEqual([
      'restricted',
      'checkpoint',
      'provider_unavailable',
      'admin',
      'rate_limited',
    ])
    expect(LINKEDIN_DAILY_CONNECTION_CEILING).toBe(20)
    expect(LINKEDIN_DAILY_MESSAGE_CEILING).toBe(40)
    expect(LINKEDIN_WEEKLY_CONNECTION_CEILING).toBe(80)
    expect(MAX_LINKEDIN_TYPED_NAME_LENGTH).toBe(200)
  })

  test.each(Object.entries(TABLES))('%s is tenant-scoped in the outbound schema', (name, table) => {
    const config = getTableConfig(table)
    expect(config.name).toBe(name)
    expect(config.schema).toBe('outbound')
    expect(config.primaryKeys[0]?.columns.map((c) => c.name)[0]).toBe('organization_id')
    expect(config.columns.map((c) => c.name)).toContain('organization_id')
  })

  test.each(Object.keys(TABLES))(
    'the migration runs the canonical row-level-security statements for %s',
    (name) => {
      for (const statement of tenantRlsStatements('outbound', name)) {
        expect(migration).toContain(statement)
      }
    }
  )

  test('one account per Rep per Organization is a unique index', () => {
    const index = getTableConfig(linkedinAccounts).indexes.find(
      (i) => i.config.name === 'linkedin_accounts_member_key'
    )
    expect(index?.config.unique).toBe(true)
    expect(index?.config.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'organization_id',
      'membership_id',
    ])
  })

  test('the usage primary key is one row per account and day, and its counters are checked', () => {
    const config = getTableConfig(linkedinUsage)
    expect(config.primaryKeys[0]?.columns.map((c) => c.name)).toEqual([
      'organization_id',
      'account_id',
      'day',
    ])
    expect(config.checks.map((c) => c.name)).toContain('linkedin_usage_counters_not_negative')
  })

  test('acceptances are append-only: no delete, revoke-only updates, no truncate', () => {
    expect(migration).toContain(
      'REVOKE DELETE ON "outbound"."linkedin_risk_acceptances" FROM closeline_outbound;'
    )
    expect(migration).toContain(
      'CREATE TRIGGER "linkedin_risk_acceptances_revoke_only" BEFORE UPDATE'
    )
    expect(migration).toContain(
      'CREATE TRIGGER "linkedin_risk_acceptances_no_truncate" BEFORE TRUNCATE'
    )
  })

  test('no column holds a credential or profile data', () => {
    for (const table of Object.values(TABLES)) {
      for (const column of getTableConfig(table).columns) {
        expect(column.name).not.toMatch(/token|secret|password|cookie|profile|url/)
      }
    }
  })
})
