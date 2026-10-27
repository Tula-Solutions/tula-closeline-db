import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  AGENT_TOOLS,
  AGENT_TURN_ROLES,
  AGENT_VOICE_STYLES,
  CHAT_STATES,
  HANDOFF_CHANNELS,
  HANDOFF_REASONS,
  HANDOFF_RESULTS,
  HANDOFF_STATES,
  INQUIRY_CALLBACK_STATES,
  INQUIRY_SKIP_REASONS,
  INQUIRY_SOURCES,
  MAX_AGENT_CALL_COST_USD_CENTS,
  MAX_AGENT_CALL_SECONDS,
  MAX_AGENT_CONCURRENCY,
  MAX_AGENT_GREETING_LENGTH,
  MAX_ANSWER_LENGTH,
  MAX_CALLBACK_ATTEMPTS,
  MAX_COPILOT_QUOTE_LENGTH,
  MAX_DOCUMENT_PAGES,
  MAX_QUALIFICATION_QUESTIONS,
  MAX_QUALIFICATION_SUMMARY_LENGTH,
  MAX_QUESTION_CHOICES,
  MAX_QUESTION_PROMPT_LENGTH,
  MAX_SKIP_CONDITIONS,
  MAX_SOURCE_URL_LENGTH,
  MAX_TURN_SOURCES,
  MAX_TURN_TEXT_LENGTH,
  MIN_QUESTION_CHOICES,
  QUALIFICATION_QUESTION_KINDS,
  voiceAgentSettings,
  voiceAgentTurnSources,
  voiceAgentTurns,
  voiceChats,
  voiceHandoffs,
  voiceInquiries,
  voiceQualificationAnswers,
  voiceQualificationQuestions,
} from './voice-agent'

const migrationFile = readdirSync(new URL('../../migrations/', import.meta.url)).find((f) =>
  f.startsWith('0051_')
)
const migration = readFileSync(
  new URL(`../../migrations/${migrationFile ?? 'missing'}`, import.meta.url),
  'utf8'
)

const TABLES = {
  chats: voiceChats,
  inquiries: voiceInquiries,
  agent_settings: voiceAgentSettings,
  qualification_questions: voiceQualificationQuestions,
  qualification_answers: voiceQualificationAnswers,
  agent_turns: voiceAgentTurns,
  agent_turn_sources: voiceAgentTurnSources,
  handoffs: voiceHandoffs,
}

describe('the voice agent tables', () => {
  test.each(Object.entries(TABLES))(
    '%s is tenant-scoped with an organization_id',
    (name, table) => {
      const config = getTableConfig(table)
      expect(config.name).toBe(name)
      expect(config.schema).toBe('voice')
      expect(config.columns.map((c) => c.name)).toContain('organization_id')
    }
  )

  test.each(Object.keys(TABLES))(
    'the migration runs the canonical row-level-security statements for %s',
    (name) => {
      for (const statement of tenantRlsStatements('voice', name)) {
        expect(migration).toContain(statement)
      }
    }
  )

  test('an Inquiry is unique on its Organization and idempotency key', () => {
    const index = getTableConfig(voiceInquiries).indexes.find(
      (i) => i.config.name === 'inquiries_idempotency_key'
    )
    expect(index?.config.unique).toBe(true)
    expect(index?.config.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'organization_id',
      'idempotency_key',
    ])
  })

  test('the settings have no column for the Disclosure, the Recording or the consent gate', () => {
    const names = getTableConfig(voiceAgentSettings)
      .columns.map((c) => c.name)
      .join(' ')
    expect(names).not.toMatch(/disclos|record|consent/)
  })

  test('the values mirror the contract', () => {
    expect(INQUIRY_SOURCES).toEqual(['form', 'chat', 'call'])
    expect(INQUIRY_CALLBACK_STATES).toEqual([
      'not_applicable',
      'pending',
      'dialling',
      'connected',
      'no_answer',
      'skipped',
      'failed',
    ])
    expect(INQUIRY_SKIP_REASONS).toEqual([
      'agent_paused',
      'no_consent',
      'consent_revoked',
      'suppressed',
      'outside_hours',
      'consent_check_unavailable',
      'no_phone_number',
      'concurrency_cap',
      'retries_exhausted',
    ])
    expect(MAX_CALLBACK_ATTEMPTS).toBe(3)
    expect(MAX_SOURCE_URL_LENGTH).toBe(2048)
    expect(AGENT_VOICE_STYLES).toEqual(['warm', 'neutral', 'crisp'])
    expect(MAX_AGENT_CALL_SECONDS).toBe(1800)
    expect(MAX_AGENT_CALL_COST_USD_CENTS).toBe(5000)
    expect(MAX_AGENT_CONCURRENCY).toBe(50)
    expect(MAX_AGENT_GREETING_LENGTH).toBe(500)
    expect(QUALIFICATION_QUESTION_KINDS).toEqual(['free_text', 'choice', 'number', 'yes_no'])
    expect(MAX_QUALIFICATION_QUESTIONS).toBe(50)
    expect(MAX_QUESTION_PROMPT_LENGTH).toBe(500)
    expect(MAX_ANSWER_LENGTH).toBe(500)
    expect(MIN_QUESTION_CHOICES).toBe(2)
    expect(MAX_QUESTION_CHOICES).toBe(10)
    expect(MAX_SKIP_CONDITIONS).toBe(5)
    expect(MAX_QUALIFICATION_SUMMARY_LENGTH).toBe(2000)
    expect(AGENT_TURN_ROLES).toEqual(['prospect', 'agent'])
    expect(AGENT_TOOLS).toEqual([
      'record_answer',
      'find_slots',
      'book',
      'hand_off',
      'end_call',
      'revoke_consent',
    ])
    expect(MAX_TURN_TEXT_LENGTH).toBe(2000)
    expect(MAX_TURN_SOURCES).toBe(10)
    expect(MAX_DOCUMENT_PAGES).toBe(300)
    expect(MAX_COPILOT_QUOTE_LENGTH).toBe(512)
    expect(HANDOFF_CHANNELS).toEqual(['call', 'chat'])
    expect(HANDOFF_STATES).toEqual([
      'pending',
      'accepted',
      'completed',
      'declined',
      'timed_out',
      'no_rep',
    ])
    expect(HANDOFF_REASONS).toEqual([
      'asked_for_rep',
      'qualified',
      'agent_unsure',
      'prospect_frustrated',
    ])
    expect(HANDOFF_RESULTS).toEqual(['bridged', 'booking_offered', 'abandoned'])
    expect(CHAT_STATES).toEqual(['open', 'handed_off', 'closed'])
  })
})
