import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  APPROVAL_MODES,
  approvalDecisions,
  approvalPolicies,
  CLASSIFICATION_DECIDERS,
  CONVERSATION_CONTROLLERS,
  CONVERSATION_STATES,
  conversations,
  DECISION_KINDS,
  DRAFT_AUTHORS,
  DRAFT_HOLD_REASONS,
  DRAFT_SOURCE_KINDS,
  DRAFT_STATUSES,
  draftSources,
  drafts,
  ESCALATION_TARGETS,
  ESCALATION_TRIGGERS,
  escalationRules,
  INBOX_CHANNELS,
  MAX_DECISION_NOTE_LENGTH,
  MAX_DRAFT_CHECKS,
  MAX_EXCEPT_LABELS,
  MAX_MESSAGE_BODY_LENGTH,
  MAX_PENDING_DRAFT_COUNT,
  MAX_PROVIDER_MESSAGE_ID_LENGTH,
  MAX_STRATEGY_LENGTH,
  MESSAGE_AUTHOR_KINDS,
  MESSAGE_DIRECTIONS,
  messages,
  REPLY_LABELS,
  SOURCE_OUTCOMES,
} from './core-inbox'

const migration = readFileSync(
  new URL('../../migrations/0044_core_inbox.sql', import.meta.url),
  'utf8'
)

const TABLES = {
  approval_decisions: approvalDecisions,
  approval_policies: approvalPolicies,
  conversations,
  draft_sources: draftSources,
  drafts,
  escalation_rules: escalationRules,
  messages,
}

const indexColumns = (table: Parameters<typeof getTableConfig>[0], name: string) => {
  const index = getTableConfig(table).indexes.find((i) => i.config.name === name)
  return {
    unique: index?.config.unique,
    columns: index?.config.columns.map((c) => ('name' in c ? c.name : '')),
  }
}

describe('the inbox tables', () => {
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

  test('a provider message id is unique per Organization and channel', () => {
    expect(indexColumns(messages, 'messages_provider_message_key')).toEqual({
      unique: true,
      columns: ['organization_id', 'channel', 'provider_message_id'],
    })
  })

  test('the list indexes end in the keyset pair', () => {
    for (const name of [
      'conversations_list_idx',
      'conversations_owner_list_idx',
      'conversations_state_list_idx',
      'conversations_owner_state_list_idx',
    ]) {
      const { columns } = indexColumns(conversations, name)
      expect(columns?.[0]).toBe('organization_id')
      expect(columns?.slice(-2)).toEqual(['last_message_at', 'id'])
    }
  })

  test('there is one escalation rule per trigger and one policy per channel', () => {
    expect(indexColumns(escalationRules, 'escalation_rules_trigger_key')).toEqual({
      unique: true,
      columns: ['organization_id', 'trigger'],
    })
    expect(getTableConfig(approvalPolicies).primaryKeys[0]?.columns.map((c) => c.name)).toEqual([
      'organization_id',
      'channel',
    ])
  })

  test('Messages cannot be rewritten or removed by the service role, only reclassified', () => {
    expect(migration).toContain(
      'REVOKE UPDATE, DELETE, TRUNCATE ON "core"."messages" FROM closeline_core;'
    )
    expect(migration).toContain(
      'GRANT UPDATE ("classification_label", "classification_confidence", "classification_decided_by", "classification_corrected_by_membership_id", "classified_at") ON "core"."messages" TO closeline_core;'
    )
  })

  test('conversations and drafts cannot be deleted by the service role', () => {
    expect(migration).toContain(
      'REVOKE DELETE ON "core"."conversations", "core"."drafts" FROM closeline_core;'
    )
  })

  test('the trigger message of a Draft is indexed for the foreign key', () => {
    expect(indexColumns(drafts, 'drafts_trigger_message_idx')).toEqual({
      unique: false,
      columns: ['organization_id', 'reason_trigger_message_id'],
    })
  })

  test('decisions are append-only and Sources are written once', () => {
    expect(migration).toContain(
      'REVOKE UPDATE, DELETE, TRUNCATE ON "core"."approval_decisions" FROM closeline_core;'
    )
    expect(migration).toContain(
      'REVOKE UPDATE, TRUNCATE ON "core"."draft_sources" FROM closeline_core;'
    )
  })

  test('mirrors the contract constants', () => {
    expect(INBOX_CHANNELS).toEqual(['email', 'linkedin', 'chat'])
    expect(CONVERSATION_CONTROLLERS).toEqual(['agent', 'rep'])
    expect(CONVERSATION_STATES).toEqual([
      'agent',
      'awaiting_approval',
      'rep',
      'escalated',
      'closed',
    ])
    expect(MESSAGE_DIRECTIONS).toEqual(['inbound', 'outbound'])
    expect(MESSAGE_AUTHOR_KINDS).toEqual(['prospect', 'agent', 'rep'])
    expect(REPLY_LABELS).toEqual([
      'positive',
      'question',
      'objection',
      'not_now',
      'wrong_person',
      'unsubscribe',
      'out_of_office',
      'bounce',
      'negative',
      'other',
    ])
    expect(CLASSIFICATION_DECIDERS).toEqual(['model', 'rep'])
    expect(DRAFT_AUTHORS).toEqual(['agent', 'rep'])
    expect(DRAFT_STATUSES).toEqual([
      'pending',
      'approved',
      'rejected',
      'sent',
      'superseded',
      'void',
    ])
    expect(DRAFT_HOLD_REASONS).toEqual([
      'policy',
      'ungrounded',
      'check_failed',
      'escalated',
      'first_message',
    ])
    expect(DRAFT_SOURCE_KINDS).toEqual(['moment', 'document_chunk'])
    expect(SOURCE_OUTCOMES).toEqual(['won', 'lost', 'open'])
    expect(DECISION_KINDS).toEqual([
      'approve',
      'edit_approve',
      'reject',
      'auto_release',
      'takeover',
      'hand_back',
    ])
    expect(APPROVAL_MODES).toEqual(['always', 'below_confidence', 'except'])
    expect(ESCALATION_TRIGGERS).toEqual([
      'asks_for_person',
      'pricing_or_legal',
      'negative_tone',
      'low_confidence',
      'writer_failure',
    ])
    expect(ESCALATION_TARGETS).toEqual(['prospect_owner', 'team_round_robin', 'admin_queue'])
    expect(MAX_MESSAGE_BODY_LENGTH).toBe(20000)
    expect(MAX_PROVIDER_MESSAGE_ID_LENGTH).toBe(255)
    expect(MAX_PENDING_DRAFT_COUNT).toBe(1000)
    expect(MAX_STRATEGY_LENGTH).toBe(300)
    expect(MAX_DRAFT_CHECKS).toBe(20)
    expect(MAX_DECISION_NOTE_LENGTH).toBe(500)
    expect(MAX_EXCEPT_LABELS).toBe(10)
  })
})
