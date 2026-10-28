import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  CAMPAIGN_APPROVAL_MODES,
  CAMPAIGN_STATES,
  ENROLLMENT_EVENT_KINDS,
  ENROLLMENT_STATES,
  ENROLLMENT_STOP_REASONS,
  MAX_SEQUENCE_STEPS,
  OUTBOUND_WORK_KINDS,
  outboundCampaigns,
  outboundEnrollmentEvents,
  outboundEnrollments,
  outboundPlayCitations,
  outboundPlays,
  outboundSendDecisions,
  outboundSequences,
  outboundSteps,
  outboundVariantStats,
  outboundVariants,
  outboundWorkHints,
  PLAY_CITATION_KINDS,
  PLAY_INTENTS,
  PLAY_SOURCES,
  PLAY_STATUSES,
  STEP_KINDS,
  STEP_TASKS,
  WINDOW_ZONES,
} from './outbound-campaigns'

const migrationFile = readdirSync(new URL('../../migrations/', import.meta.url)).find((f) =>
  f.startsWith('0049_')
)
const migration = readFileSync(
  new URL(`../../migrations/${migrationFile ?? 'missing'}`, import.meta.url),
  'utf8'
)

const TABLES = {
  campaigns: outboundCampaigns,
  sequences: outboundSequences,
  steps: outboundSteps,
  variants: outboundVariants,
  enrollments: outboundEnrollments,
  enrollment_events: outboundEnrollmentEvents,
  plays: outboundPlays,
  play_citations: outboundPlayCitations,
  send_decisions: outboundSendDecisions,
}

describe('the outbound campaign tables', () => {
  test.each(Object.entries(TABLES))(
    '%s is tenant-scoped with an organization_id',
    (name, table) => {
      const config = getTableConfig(table)
      expect(config.name).toBe(name)
      expect(config.schema).toBe('outbound')
      expect(config.columns.map((c) => c.name)).toContain('organization_id')
    }
  )

  test.each(Object.keys(TABLES))(
    'the migration runs the canonical row-level-security statements for %s',
    (name) => {
      for (const statement of tenantRlsStatements('outbound', name)) {
        expect(migration).toContain(statement)
      }
    }
  )

  test('the work registry is not a tenant table and the service role holds nothing on it', () => {
    const config = getTableConfig(outboundWorkHints)
    expect(config.name).toBe('work_hints')
    expect(config.schema).toBe('outbound')
    expect(migration).toContain('REVOKE ALL ON "outbound"."work_hints" FROM closeline_outbound;')
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION "outbound"."organizations_with_work"(text, text, integer) TO closeline_outbound;'
    )
  })

  test('the migration keeps history append-only', () => {
    expect(migration).toContain(
      'REVOKE UPDATE ON "outbound"."enrollment_events" FROM closeline_outbound;'
    )
  })

  test('the values mirror the contract', () => {
    expect(CAMPAIGN_STATES).toEqual(['draft', 'ready', 'running', 'paused', 'archived'])
    expect(CAMPAIGN_APPROVAL_MODES).toEqual(['auto', 'review', 'mixed'])
    expect(WINDOW_ZONES).toEqual(['campaign', 'prospect'])
    expect(STEP_KINDS).toEqual(['email', 'wait', 'branch', 'rep_task', 'end'])
    expect(STEP_TASKS).toEqual(['call', 'manual_message', 'research', 'other'])
    expect(MAX_SEQUENCE_STEPS).toBe(50)
    expect(ENROLLMENT_STATES).toEqual(['active', 'completed', 'stopped'])
    expect(ENROLLMENT_STOP_REASONS).toEqual([
      'replied',
      'hard_bounce',
      'unsubscribed',
      'complaint',
      'suppressed',
      'no_consent',
      'unverified_address',
      'removed_by_rep',
      'meeting_booked',
      'prospect_erased',
      'campaign_archived',
    ])
    expect(ENROLLMENT_EVENT_KINDS).toEqual([
      'enrolled',
      'step_entered',
      'sent',
      'deferred',
      'refused',
      'rep_task_created',
      'call_result',
      'branch_taken',
      'stopped',
      'completed',
    ])
    expect(PLAY_INTENTS).toEqual([
      'cold_intro',
      'closed_lost_reengagement',
      'post_event_follow_up',
      'nurture',
    ])
    expect(PLAY_SOURCES).toEqual(['builtin', 'seeded', 'custom'])
    expect(PLAY_STATUSES).toEqual(['proposed', 'accepted', 'discarded'])
    expect(PLAY_CITATION_KINDS).toEqual(['moment', 'document'])
    expect(OUTBOUND_WORK_KINDS).toEqual(['step_due'])
  })
})

describe('the variant tally table', () => {
  const file = readdirSync(new URL('../../migrations/', import.meta.url)).find((f) =>
    f.includes('_variant_stats')
  )
  const sqlText = readFileSync(
    new URL(`../../migrations/${file ?? 'missing'}`, import.meta.url),
    'utf8'
  )

  test('is tenant-scoped and keyed by Campaign, version, Step and variant', () => {
    const config = getTableConfig(outboundVariantStats)
    expect(config.name).toBe('variant_stats')
    expect(config.schema).toBe('outbound')
    expect(config.primaryKeys[0]?.columns.map((c) => c.name)).toEqual([
      'organization_id',
      'campaign_id',
      'version',
      'step_key',
      'variant_key',
    ])
  })

  test('the migration runs the canonical row-level-security statements', () => {
    for (const statement of tenantRlsStatements('outbound', 'variant_stats')) {
      expect(sqlText).toContain(statement)
    }
  })
})
