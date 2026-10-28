import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  AGENT_CALL_END_REASONS,
  AGENT_CALL_SOURCES,
  AGENT_CALL_STATES,
  CALL_GATE_CODES,
  CALL_RESULTS,
  MAX_CALL_ATTEMPTS,
  voiceAgentCalls,
} from './voice-agent-calls'
import {
  DEFAULT_LINE_CONCURRENT_AGENT_CALLS,
  DEFAULT_LINE_DAILY_AGENT_DIAL_CAP,
} from './voice-tables'

const migration = readFileSync(
  new URL('../../migrations/0067_voice_agent_calls.sql', import.meta.url),
  'utf8'
)

describe('voice.agent_calls', () => {
  test('the values copy the contract (src/agent-call) at v0.63.0', () => {
    expect(CALL_RESULTS).toEqual([
      'answered',
      'voicemail',
      'no_answer',
      'busy',
      'failed',
      'blocked',
    ])
    expect(AGENT_CALL_END_REASONS).toHaveLength(8)
    expect(CALL_GATE_CODES).toHaveLength(9)
    expect(AGENT_CALL_SOURCES).toEqual(['campaign_step', 'rep_request'])
    expect(AGENT_CALL_STATES).toEqual(['queued', 'dialing', 'live', 'ended'])
    expect(MAX_CALL_ATTEMPTS).toBe(3)
    expect(DEFAULT_LINE_CONCURRENT_AGENT_CALLS).toBe(3)
    expect(DEFAULT_LINE_DAILY_AGENT_DIAL_CAP).toBe(150)
  })

  test('it is tenant-scoped and the migration runs the canonical RLS statements', () => {
    const config = getTableConfig(voiceAgentCalls)
    expect(config.schema).toBe('voice')
    expect(config.primaryKeys[0]?.columns.map((c) => c.name)[0]).toBe('organization_id')
    for (const statement of tenantRlsStatements('voice', 'agent_calls')) {
      expect(migration).toContain(statement)
    }
  })

  test('it is a record: no delete, ended rows final, no truncate', () => {
    expect(migration).toContain('REVOKE DELETE ON "voice"."agent_calls" FROM closeline_voice;')
    expect(migration).toContain('CREATE TRIGGER "agent_calls_ended_final" BEFORE UPDATE')
    expect(migration).toContain('CREATE TRIGGER "agent_calls_no_truncate" BEFORE TRUNCATE')
  })

  test('no column can hold a raw phone number', () => {
    for (const column of getTableConfig(voiceAgentCalls).columns) {
      expect(column.name).not.toMatch(/phone|^number$|e164|msisdn/)
    }
  })
})
