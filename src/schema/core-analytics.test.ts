import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  ASSESSMENT_JUDGE_SOURCES,
  ASSESSMENT_SUBJECT_KINDS,
  ASSESSMENT_VERDICTS,
  analyticsEvents,
  assessmentFindings,
  assessments,
  CONVERSATION_OUTCOME_LABELS,
  conversationSummaries,
  FINDING_CATEGORIES,
  FINDING_FEEDBACKS,
  FINDING_SEVERITIES,
  MAX_FINDING_EXPLANATION_LENGTH,
  MAX_FINDING_SPAN_OFFSET,
  MAX_ROLLUP_GROUP_KEY_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_TOUCH_SOURCES,
  ROLLUP_GROUP_KINDS,
  ROLLUP_METRICS,
  rollupDaily,
  SOURCE_KINDS,
  SOURCE_PERFORMANCE_FLAGS,
  sourcePerformance,
  TOUCH_AGENT_KINDS,
  TOUCH_CHANNELS,
  TOUCH_KINDS,
  touches,
} from './core-analytics'

const migrationsDir = new URL('../../migrations/', import.meta.url)
const file = readdirSync(migrationsDir).find((name) =>
  name.endsWith('_core_analytics_playbook_suggestions.sql')
)
const migration = file ? readFileSync(new URL(file, migrationsDir), 'utf8') : ''
const ledgerFile = readdirSync(migrationsDir).find((name) =>
  name.endsWith('_core_analytics_event.sql')
)
const ledgerMigration = ledgerFile ? readFileSync(new URL(ledgerFile, migrationsDir), 'utf8') : ''

const TABLES = {
  analytics_event: analyticsEvents,
  assessment_findings: assessmentFindings,
  assessments,
  conversation_summaries: conversationSummaries,
  rollup_daily: rollupDaily,
  source_performance: sourcePerformance,
  touches,
}

type Table = (typeof TABLES)[keyof typeof TABLES]

const indexOf = (table: Table, name: string) =>
  getTableConfig(table).indexes.find((i) => i.config.name === name)
const columnsOf = (table: Table, name: string) =>
  indexOf(table, name)?.config.columns.map((c) => ('name' in c ? c.name : ''))

describe('the analytics, assessment and summary tables', () => {
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
        expect(name === 'analytics_event' ? ledgerMigration : migration).toContain(statement)
      }
    }
  )

  test('the mirrored contract values are pinned', () => {
    expect([...ROLLUP_METRICS]).toEqual([
      'sends',
      'replies',
      'positive_replies',
      'meetings',
      'outcomes_won',
      'outcomes_lost',
    ])
    expect([...ROLLUP_GROUP_KINDS]).toEqual(['total', 'channel', 'agent_kind', 'campaign', 'rep'])
    expect(MAX_ROLLUP_GROUP_KEY_LENGTH).toBe(64)
    expect([...TOUCH_KINDS]).toEqual(['message', 'call'])
    expect([...TOUCH_CHANNELS]).toEqual(['email', 'linkedin', 'chat', 'phone'])
    expect([...TOUCH_AGENT_KINDS]).toEqual(['inbound', 'outbound'])
    expect(MAX_TOUCH_SOURCES).toBe(20)
    expect([...SOURCE_KINDS]).toEqual(['moment', 'document'])
    expect([...SOURCE_PERFORMANCE_FLAGS]).toEqual(['cited_often_lost'])
    expect([...ASSESSMENT_SUBJECT_KINDS]).toEqual(['draft', 'call_turn'])
    expect([...ASSESSMENT_VERDICTS]).toEqual(['pass', 'warn', 'fail'])
    expect([...ASSESSMENT_JUDGE_SOURCES]).toEqual(['model', 'rules'])
    expect([...FINDING_SEVERITIES]).toEqual(['low', 'medium', 'high'])
    expect([...FINDING_FEEDBACKS]).toEqual(['correct', 'false_alarm'])
    expect(MAX_FINDING_SPAN_OFFSET).toBe(20_000)
    expect(MAX_FINDING_EXPLANATION_LENGTH).toBe(500)
    expect(MAX_SUMMARY_LENGTH).toBe(500)
    expect(FINDING_CATEGORIES.length).toBeGreaterThan(0)
    expect(CONVERSATION_OUTCOME_LABELS.length).toBeGreaterThan(0)
  })

  test('a rollup row is unique per Organization, metric, group, day and key', () => {
    const pk = getTableConfig(rollupDaily).primaryKeys[0]
    expect(pk?.getName()).toBe('rollup_daily_pkey')
    expect(pk?.columns.map((c) => c.name)).toEqual([
      'organization_id',
      'metric',
      'group_kind',
      'day',
      'group_key',
    ])
    expect(migration).toContain('CONSTRAINT "rollup_daily_pkey" PRIMARY KEY')
  })

  test('a Touch is unique per source record, so a replayed event adds none', () => {
    expect(columnsOf(touches, 'touches_ref_key')).toEqual(['organization_id', 'kind', 'ref_id'])
    expect(indexOf(touches, 'touches_ref_key')?.config.unique).toBe(true)
  })

  test('an Assessment is unique per Draft version and per Call turn', () => {
    expect(columnsOf(assessments, 'assessments_draft_key')).toEqual([
      'organization_id',
      'draft_id',
      'draft_version',
    ])
    expect(columnsOf(assessments, 'assessments_call_turn_key')).toEqual([
      'organization_id',
      'call_id',
      'turn_index',
    ])
  })

  test('a finding keeps a sentence span and a category, never the body', () => {
    const names = getTableConfig(assessmentFindings).columns.map((c) => c.name)
    expect(names).toContain('span_start')
    expect(names).toContain('span_end')
    expect(names).toContain('category')
    for (const forbidden of ['body', 'text', 'content', 'excerpt', 'quote', 'sentence']) {
      expect(names).not.toContain(forbidden)
    }
  })

  test('a Touch keeps references to its sources, never their text', () => {
    const names = getTableConfig(touches).columns.map((c) => c.name)
    for (const forbidden of ['body', 'text', 'content', 'subject']) {
      expect(names).not.toContain(forbidden)
    }
  })
})
