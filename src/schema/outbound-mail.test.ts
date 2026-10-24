import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  HEALTH_COMPONENT_KINDS,
  healthDaily,
  MAIL_EVENT_KINDS,
  MAILBOX_KINDS,
  MAILBOX_PROVIDERS,
  MAILBOX_STATE_REASONS,
  MAILBOX_STATES,
  mailboxes,
  mailboxLimits,
  mailEvents,
  mailMessages,
  SEND_REFUSAL_REASONS,
  SEND_STATES,
  WEEKDAYS,
} from './outbound-mail'

const migrationFile = readdirSync(new URL('../../migrations/', import.meta.url)).find((f) =>
  f.startsWith('0046_')
)
const migration = readFileSync(
  new URL(`../../migrations/${migrationFile ?? 'missing'}`, import.meta.url),
  'utf8'
)

const TABLES = {
  mailboxes,
  mailbox_limits: mailboxLimits,
  mail_messages: mailMessages,
  mail_events: mailEvents,
  health_daily: healthDaily,
}

describe('the outbound mail tables', () => {
  test('the values copy the contract (src/mail) at its develop', () => {
    expect(MAILBOX_PROVIDERS).toEqual(['gmail', 'outlook'])
    expect(MAILBOX_KINDS).toEqual(['personal', 'shared'])
    expect(MAILBOX_STATES).toEqual(['warming', 'healthy', 'limited', 'paused', 'disconnected'])
    expect(MAILBOX_STATE_REASONS).toEqual([
      'owner_paused',
      'admin_paused',
      'complaint_spike',
      'bounce_spike',
      'provider_suspended',
      'auth_revoked',
      'disconnected_by_owner',
      'health_warning',
    ])
    expect(SEND_STATES).toEqual(['sending', 'sent', 'refused', 'deferred', 'failed'])
    expect(SEND_REFUSAL_REASONS).toEqual([
      'campaign_not_running',
      'outside_window',
      'unverified_address',
      'suppressed',
      'no_consent',
      'mailbox_unavailable',
      'limit_reached',
      'organization_cap_reached',
      'duplicate',
    ])
    expect(MAIL_EVENT_KINDS).toEqual([
      'hard_bounce',
      'soft_bounce',
      'complaint',
      'reply',
      'out_of_office',
      'unsubscribe',
    ])
    expect(WEEKDAYS).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
    expect(HEALTH_COMPONENT_KINDS).toEqual([
      'hard_bounce_rate',
      'complaint_rate',
      'soft_bounce_error_rate',
      'reply_rate',
      'provider_warnings',
    ])
  })

  test.each(Object.entries(TABLES))('%s is tenant-scoped in the outbound schema', (name, table) => {
    const config = getTableConfig(table)
    expect(config.name).toBe(name)
    expect(config.schema).toBe('outbound')
    expect(config.columns.map((c) => c.name)).toContain('organization_id')
    const [pk] = config.primaryKeys.length > 0 ? config.primaryKeys : []
    const keyColumns = pk
      ? pk.columns.map((c) => c.name)
      : config.columns.filter((c) => c.primary).map((c) => c.name)
    expect(keyColumns[0]).toBe('organization_id')
  })

  test.each(Object.keys(TABLES))(
    'the migration runs the canonical row-level-security statements for %s',
    (name) => {
      for (const statement of tenantRlsStatements('outbound', name)) {
        expect(migration).toContain(statement)
      }
    }
  )

  test('the migration keeps the send and event history append-only where it can', () => {
    expect(migration).toContain(
      'REVOKE UPDATE ON "outbound"."mail_events" FROM closeline_outbound;'
    )
  })

  test('tokens are stored as ciphertext only, never under a plaintext name', () => {
    const names = getTableConfig(mailboxes).columns.map((c) => c.name)
    expect(names).toContain('access_token_ciphertext')
    expect(names).toContain('refresh_token_ciphertext')
    for (const name of names) {
      if (/token|secret|password/.test(name)) {
        expect(name).toMatch(/ciphertext|expires_at|key_id/)
      }
    }
    for (const table of Object.values(TABLES)) {
      for (const column of getTableConfig(table).columns) {
        expect(column.name).not.toMatch(/^(body|subject|snippet|content|text)$/)
      }
    }
  })

  test('the send key is unique per Organization', () => {
    const unique = getTableConfig(mailMessages).uniqueConstraints.map((u) => u.name)
    const indexes = getTableConfig(mailMessages).indexes.filter((i) => i.config.unique)
    const named = [...unique, ...indexes.map((i) => i.config.name)]
    expect(named).toContain('mail_messages_send_key_key')
    const index = indexes.find((i) => i.config.name === 'mail_messages_send_key_key')
    expect(index?.config.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'organization_id',
      'send_key',
    ])
  })

  test.each([
    ['mail_messages_provider_message_key', mailMessages],
    ['mail_events_provider_message_key', mailEvents],
  ] as const)('%s is unique per Mailbox', (name, table) => {
    const index = getTableConfig(table).indexes.find((i) => i.config.name === name)
    expect(index?.config.unique).toBe(true)
    expect(index?.config.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'organization_id',
      'mailbox_id',
      'provider_message_id',
    ])
  })

  test.each([
    [mailboxes, 'mailboxes_list_idx', 3],
    [mailMessages, 'mail_messages_list_idx', 3],
    [mailEvents, 'mail_events_list_idx', 3],
  ] as const)(
    '%s has the newest-first list index %s over (organization_id, time, id)',
    (table, name, width) => {
      const index = getTableConfig(table).indexes.find((i) => i.config.name === name)
      expect(index?.config.columns.length).toBe(width)
    }
  )

  test('the lists by Campaign, Prospect and Mailbox each end in (time desc, id desc)', () => {
    const indexes = getTableConfig(mailMessages).indexes
    for (const name of [
      'mail_messages_campaign_idx',
      'mail_messages_prospect_idx',
      'mail_messages_mailbox_idx',
      'mail_messages_state_idx',
    ]) {
      expect(indexes.find((i) => i.config.name === name)?.config.columns.length).toBe(4)
    }
  })
})
