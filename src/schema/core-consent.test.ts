import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  ADDRESS_HASH_BYTES,
  CONSENT_CHANNELS,
  CONSENT_FORM_STATES,
  CONSENT_GRANT_SOURCES,
  CONSENT_WITHDRAWAL_SOURCES,
  CONTACT_ALLOW_BASES,
  CONTACT_PURPOSES,
  consentForms,
  consentWordings,
  contactCheckLog,
  contactConsentEvents,
  LOGGED_DENIAL_CODES,
  MAX_CONSENT_FORM_NAME_LENGTH,
  MAX_CONSENT_WORDING_LENGTH,
  MAX_EVIDENCE_REF_LENGTH,
  MAX_FORM_TOKEN_LENGTH,
  MAX_SUPPRESSION_NOTE_LENGTH,
  MAX_SUPPRESSION_SOURCE_REF_LENGTH,
  MIN_FORM_TOKEN_LENGTH,
  SUPPRESSION_ADDRESS_KINDS,
  SUPPRESSION_REASONS,
  SUPPRESSION_REMOVABLE_REASONS,
  suppressionEntries,
} from './core-consent'

const migration = readFileSync(
  new URL('../../migrations/0024_core_consent.sql', import.meta.url),
  'utf8'
)

const TABLES = {
  consent_form: consentForms,
  consent_wording: consentWordings,
  contact_check_log: contactCheckLog,
  contact_consent_event: contactConsentEvents,
  suppression_entry: suppressionEntries,
}

describe('the consent tables', () => {
  test.each(Object.entries(TABLES))(
    '%s is tenant-scoped with an organization_id',
    (name, table) => {
      const config = getTableConfig(table)
      expect(config.name).toBe(name)
      expect(config.schema).toBe('core')
      expect(config.columns.map((c) => c.name)).toContain('organization_id')
    }
  )

  test.each(Object.keys(TABLES))(
    'the migration runs the canonical row-level-security statements for %s',
    (name) => {
      for (const statement of tenantRlsStatements('core', name)) {
        expect(migration).toContain(statement)
      }
    }
  )

  test('the ledger is guarded by append-only, no-truncate and the wording lock triggers', () => {
    expect(migration).toContain(
      'CREATE TRIGGER "contact_consent_event_append_only" BEFORE UPDATE OR DELETE'
    )
    expect(migration).toContain(
      'CREATE TRIGGER "contact_consent_event_no_truncate" BEFORE TRUNCATE'
    )
    expect(migration).toContain('CREATE TRIGGER "consent_wording_locked" BEFORE UPDATE')
  })

  test('suppression is unique per Organization, address kind and hash while live', () => {
    const index = getTableConfig(suppressionEntries).indexes.find(
      (i) => i.config.name === 'suppression_entry_live_key'
    )
    expect(index?.config.unique).toBe(true)
    expect(index?.config.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'organization_id',
      'address_kind',
      'address_hash',
    ])
  })

  test('mirrors the contract constants', () => {
    expect(CONSENT_CHANNELS).toEqual(['phone', 'sms', 'whatsapp', 'email', 'linkedin'])
    expect(CONSENT_GRANT_SOURCES).toEqual([
      'hosted_form',
      'verbal_call',
      'import_attestation',
      'crm',
      'manual',
    ])
    expect(CONSENT_WITHDRAWAL_SOURCES).toEqual(['unsubscribe', 'stop_reply', 'manual', 'crm'])
    expect(CONSENT_FORM_STATES).toEqual(['draft', 'published', 'closed'])
    expect(SUPPRESSION_REASONS).toEqual([
      'unsubscribe',
      'stop',
      'bounce',
      'complaint',
      'manual',
      'crm',
      'erased',
    ])
    expect(SUPPRESSION_REMOVABLE_REASONS).toEqual(['manual'])
    expect(SUPPRESSION_ADDRESS_KINDS).toEqual(['email', 'phone', 'linkedin'])
    expect(CONTACT_PURPOSES).toEqual(['agent_initiated', 'rep_initiated', 'reply'])
    expect(LOGGED_DENIAL_CODES).toEqual([
      'consent.missing',
      'consent.withdrawn',
      'consent.suppressed',
    ])
    expect(CONTACT_ALLOW_BASES).toEqual([
      'consent_granted',
      'rep_initiated',
      'reply',
      'email_no_suppression',
    ])
    expect(MAX_EVIDENCE_REF_LENGTH).toBe(200)
    expect(MAX_CONSENT_WORDING_LENGTH).toBe(5000)
    expect(MAX_CONSENT_FORM_NAME_LENGTH).toBe(100)
    expect(MAX_SUPPRESSION_NOTE_LENGTH).toBe(500)
    expect(MAX_SUPPRESSION_SOURCE_REF_LENGTH).toBe(200)
    expect(ADDRESS_HASH_BYTES).toBe(32)
    expect([MIN_FORM_TOKEN_LENGTH, MAX_FORM_TOKEN_LENGTH]).toEqual([22, 256])
  })
})
