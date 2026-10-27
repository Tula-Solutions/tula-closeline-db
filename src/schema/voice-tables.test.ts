import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  CALL_END_REASONS,
  LINE_ASSIGNMENT_KINDS,
  LINE_STATES,
  MAX_CALL_DURATION_SECONDS,
  MAX_LINE_LABEL_LENGTH,
  MAX_PROVIDER_EVENT_ID_LENGTH,
  MAX_RECORDING_KEY_LENGTH,
  MAX_VOICE_IDEMPOTENCY_KEY_LENGTH,
  MAX_WRAP_UP_NOTE_LENGTH,
  VOICE_CALL_DIRECTIONS,
  VOICE_CALL_ENDED_BY,
  VOICE_CALL_EVENT_KINDS,
  VOICE_CALL_FAILURE_REASONS,
  VOICE_CALL_FINAL_STATES,
  VOICE_CALL_STATES,
  VOICE_RECORDING_STATES,
  VOICE_TRANSCRIPT_STATES,
  voiceCallEvents,
  voiceCalls,
  voiceLines,
  voiceRecordings,
} from './voice-tables'

const migration = readFileSync(
  new URL('../../migrations/0025_voice_schema.sql', import.meta.url),
  'utf8'
)

const TABLES = {
  lines: voiceLines,
  calls: voiceCalls,
  call_events: voiceCallEvents,
  recordings: voiceRecordings,
}

describe('the voice tables', () => {
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

  test('the migration confines the voice role to its own schema and keeps the event log append-only', () => {
    expect(migration).toContain('REVOKE ALL ON SCHEMA public FROM closeline_voice;')
    expect(migration).toContain('REVOKE ALL ON SCHEMA "voice" FROM PUBLIC;')
    expect(migration).toContain('GRANT USAGE ON SCHEMA "voice" TO closeline_voice;')
    expect(migration).toContain(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA "voice" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO closeline_voice;'
    )
    expect(migration).toContain('REVOKE UPDATE ON "voice"."call_events" FROM closeline_voice;')
  })

  test.each(Object.entries(TABLES))(
    '%s has a composite primary key led by the Organization',
    (_, table) => {
      const [pk] = getTableConfig(table).primaryKeys
      expect(pk?.columns.map((c) => c.name)[0]).toBe('organization_id')
    }
  )

  test('the lists newest first have an index over (organization_id, created_at desc, id desc)', () => {
    for (const [table, name] of [
      [voiceLines, 'lines_list_idx'],
      [voiceCalls, 'calls_list_idx'],
    ] as const) {
      const index = getTableConfig(table).indexes.find((i) => i.config.name === name)
      expect(index).toBeDefined()
      expect(index?.config.columns.length).toBe(3)
    }
  })

  test('the stale ringing lookup has a partial index over (created_at, organization_id)', () => {
    const index = getTableConfig(voiceCalls).indexes.find(
      (i) => i.config.name === 'calls_stale_ringing_idx'
    )
    expect(index?.config.columns.map((c) => (c as { name: string }).name)).toEqual([
      'created_at',
      'organization_id',
    ])
    expect(index?.config.where).toBeDefined()
  })

  test('the Call lists by Rep, Prospect, Line and state each end in (created_at, id)', () => {
    const indexes = getTableConfig(voiceCalls).indexes
    for (const name of [
      'calls_rep_list_idx',
      'calls_prospect_list_idx',
      'calls_line_list_idx',
      'calls_state_list_idx',
    ]) {
      const index = indexes.find((i) => i.config.name === name)
      expect(index).toBeDefined()
      expect(index?.config.columns.length).toBe(4)
    }
  })

  test('a webhook is idempotent on (organization_id, provider_event_id) with a plain unique index', () => {
    const index = getTableConfig(voiceCallEvents).indexes.find(
      (i) => i.config.name === 'call_events_provider_event_key'
    )
    expect(index?.config.unique).toBe(true)
    expect(index?.config.where).toBeUndefined()
    expect(index?.config.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'organization_id',
      'provider_event_id',
    ])
  })

  test('the Call, event and Recording tables each have one composite foreign key', () => {
    expect(getTableConfig(voiceCalls).foreignKeys.length).toBe(1)
    expect(getTableConfig(voiceCallEvents).foreignKeys.length).toBe(1)
    expect(getTableConfig(voiceRecordings).foreignKeys.length).toBe(1)
  })

  test('the lists and limits mirror the contract', () => {
    expect(LINE_STATES).toEqual(['porting', 'active', 'released'])
    expect(LINE_ASSIGNMENT_KINDS).toEqual(['unassigned', 'team', 'rep'])
    expect(VOICE_CALL_DIRECTIONS).toEqual(['inbound', 'outbound'])
    expect(VOICE_CALL_STATES).toEqual([
      'ringing',
      'connecting',
      'disclosing',
      'live',
      'ended',
      'failed',
      'missed',
    ])
    expect(VOICE_CALL_FINAL_STATES).toEqual(['ended', 'failed', 'missed'])
    expect(VOICE_CALL_FAILURE_REASONS).toEqual([
      'disclosure_failed',
      'carrier_dropped',
      'carrier_rejected',
      'busy',
      'no_answer',
      'rep_unreachable',
      'provider_error',
      'timeout',
    ])
    expect(VOICE_CALL_ENDED_BY).toEqual(['rep', 'prospect', 'system'])
    expect(VOICE_TRANSCRIPT_STATES).toEqual(['pending', 'ready', 'deleted'])
    expect(VOICE_RECORDING_STATES).toEqual(['storing', 'stored', 'deleted'])
    expect(VOICE_CALL_EVENT_KINDS).toContain('provider_callback')
    expect(MAX_LINE_LABEL_LENGTH).toBe(100)
    expect(MAX_CALL_DURATION_SECONDS).toBe(43_200)
    expect(MAX_WRAP_UP_NOTE_LENGTH).toBe(2000)
    expect(MAX_RECORDING_KEY_LENGTH).toBe(512)
    expect(MAX_PROVIDER_EVENT_ID_LENGTH).toBe(200)
    expect(MAX_VOICE_IDEMPOTENCY_KEY_LENGTH).toBe(255)
  })
})

describe('the Call end reason and Agent cost columns', () => {
  const columns = Object.fromEntries(getTableConfig(voiceCalls).columns.map((c) => [c.name, c]))

  test('end_reason is a nullable text column and lists the reasons', () => {
    expect(columns.end_reason?.dataType).toBe('string')
    expect(columns.end_reason?.notNull).toBe(false)
    expect(CALL_END_REASONS).toEqual([
      'duration_cap',
      'cost_cap',
      'agent_ended',
      'prospect_hung_up',
      'rep_ended',
    ])
  })

  test('agent_cost_micro_cents is a bigint that is required and defaults to 0', () => {
    expect(columns.agent_cost_micro_cents?.columnType).toBe('PgBigInt53')
    expect(columns.agent_cost_micro_cents?.notNull).toBe(true)
    expect(columns.agent_cost_micro_cents?.default).toBe(0)
  })
})
