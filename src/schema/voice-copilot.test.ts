import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  CALL_TURN_TRACKS,
  COPILOT_CARD_KINDS,
  COPILOT_OBJECTION_TYPES,
  COPILOT_RATINGS,
  DEFAULT_COPILOT_MIN_DEALS,
  DEFAULT_COPILOT_MIN_MOMENTS,
  MAX_CALL_TURN_TEXT_LENGTH,
  MAX_COPILOT_CARD_TEXT_LENGTH,
  MAX_COPILOT_CARDS_PER_CALL,
  MAX_COPILOT_CITED_MOMENTS,
  MAX_COPILOT_EVIDENCE,
  MAX_COPILOT_MIN_EVIDENCE,
  MIN_COPILOT_MIN_EVIDENCE,
  voiceCallTurns,
  voiceCopilotCards,
  voiceCopilotSettings,
} from './voice-copilot'

const migrationFile = readdirSync(new URL('../../migrations/', import.meta.url)).find((f) =>
  f.startsWith('0056_')
)
const migration = readFileSync(
  new URL(`../../migrations/${migrationFile ?? 'missing'}`, import.meta.url),
  'utf8'
)

const TABLES = {
  call_turns: voiceCallTurns,
  copilot_cards: voiceCopilotCards,
  copilot_settings: voiceCopilotSettings,
}

const indexColumns = (table: Parameters<typeof getTableConfig>[0], name: string) => {
  const index = getTableConfig(table).indexes.find((i) => i.config.name === name)
  return {
    unique: index?.config.unique,
    columns: index?.config.columns.map((c) => ('name' in c ? c.name : '')),
  }
}

describe('the Copilot tables', () => {
  test.each(Object.entries(TABLES))('%s is a tenant-scoped voice table', (name, table) => {
    const config = getTableConfig(table)
    expect(config.name).toBe(name)
    expect(config.schema).toBe('voice')
    expect(config.columns.map((c) => c.name)).toContain('organization_id')
  })

  test.each(Object.keys(TABLES))(
    'the migration runs the canonical RLS statements for %s',
    (name) => {
      for (const statement of tenantRlsStatements('voice', name)) {
        expect(migration).toContain(statement)
      }
    }
  )

  test('a turn is keyed on its Organization, Call, track and sequence', () => {
    const key = getTableConfig(voiceCallTurns).primaryKeys[0]
    expect(key?.columns.map((c) => c.name)).toEqual([
      'organization_id',
      'call_id',
      'track',
      'sequence',
    ])
  })

  test('turns are read in time order and cards by Call and shown time', () => {
    expect(indexColumns(voiceCallTurns, 'call_turns_time_idx').columns).toEqual([
      'organization_id',
      'call_id',
      'start_ms',
      'track',
      'sequence',
    ])
    expect(indexColumns(voiceCopilotCards, 'copilot_cards_shown_idx').columns).toEqual([
      'organization_id',
      'call_id',
      'shown_at',
      'id',
    ])
  })

  test('a card sequence is unique within a Call', () => {
    expect(indexColumns(voiceCopilotCards, 'copilot_cards_call_sequence_key')).toEqual({
      unique: true,
      columns: ['organization_id', 'call_id', 'sequence'],
    })
  })

  test('turns and cards follow their Call when it is deleted', () => {
    for (const table of [voiceCallTurns, voiceCopilotCards]) {
      const fk = getTableConfig(table).foreignKeys.find((f) => f.getName().endsWith('_call_fk'))
      expect(fk?.onDelete).toBe('cascade')
    }
  })

  test('a turn keeps no more than track, text and times', () => {
    expect(getTableConfig(voiceCallTurns).columns.map((c) => c.name)).toEqual([
      'organization_id',
      'call_id',
      'track',
      'sequence',
      'text',
      'start_ms',
      'end_ms',
      'created_at',
    ])
  })

  test('the settings have no column for the Disclosure or the Recording', () => {
    const names = getTableConfig(voiceCopilotSettings)
      .columns.map((c) => c.name)
      .join(' ')
    expect(names).not.toMatch(/disclos|record|consent/)
  })

  test('the values mirror the contract', () => {
    expect(CALL_TURN_TRACKS).toEqual(['rep', 'prospect'])
    expect(MAX_CALL_TURN_TEXT_LENGTH).toBe(4000)
    expect(COPILOT_CARD_KINDS).toEqual(['similar_moment', 'objection', 'next_step', 'document'])
    expect(COPILOT_OBJECTION_TYPES).toEqual([
      'price',
      'timing',
      'competitor',
      'authority',
      'need',
      'trust',
    ])
    expect(COPILOT_RATINGS).toEqual(['useful', 'not_useful'])
    expect(MAX_COPILOT_CARDS_PER_CALL).toBe(60)
    expect(MAX_COPILOT_CITED_MOMENTS).toBe(5)
    expect(MAX_COPILOT_CARD_TEXT_LENGTH).toBe(600)
    expect(MAX_COPILOT_EVIDENCE).toBe(100)
    expect(MIN_COPILOT_MIN_EVIDENCE).toBe(1)
    expect(MAX_COPILOT_MIN_EVIDENCE).toBe(20)
    expect(DEFAULT_COPILOT_MIN_MOMENTS).toBe(3)
    expect(DEFAULT_COPILOT_MIN_DEALS).toBe(2)
  })
})
