import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  BOOKING_MODES,
  BOOKING_STATES,
  bookings,
  bookingTypes,
  busyBlocks,
  CALENDAR_CONNECTION_STATES,
  CALENDAR_PROVIDERS,
  calendarConnections,
  MAX_ROUTING_POOL_MEMBERS,
  MAX_WORKING_WINDOWS,
  ROUTING_PURPOSES,
  ROUTING_TARGET_KINDS,
  routingDecisions,
  routingRules,
  routingState,
  workingHours,
} from './core-calendars'

const migration = readFileSync(
  new URL('../../migrations/0055_core_calendars.sql', import.meta.url),
  'utf8'
)

const TABLES = {
  booking_types: bookingTypes,
  bookings,
  busy_blocks: busyBlocks,
  calendar_connections: calendarConnections,
  routing_decisions: routingDecisions,
  routing_rules: routingRules,
  routing_state: routingState,
  working_hours: workingHours,
}

type Table = Parameters<typeof getTableConfig>[0]

const index = (table: Table, name: string) =>
  getTableConfig(table).indexes.find((i) => i.config.name === name)?.config

const indexColumns = (table: Table, name: string) =>
  index(table, name)?.columns.map((c) => ('name' in c ? c.name : 'expression'))

describe('the calendar, routing and Booking tables', () => {
  test.each(Object.entries(TABLES))('%s is tenant-scoped in the core schema', (name, table) => {
    const config = getTableConfig(table)
    expect(config.name).toBe(name)
    expect(config.schema).toBe('core')
    expect(config.primaryKeys[0]?.columns[0]?.name).toBe('organization_id')
    expect(config.columns.find((c) => c.name === 'organization_id')?.notNull).toBe(true)
  })

  test.each(Object.keys(TABLES))(
    'the migration runs the canonical RLS statements for %s',
    (name) => {
      for (const statement of tenantRlsStatements('core', name)) {
        expect(migration).toContain(statement)
      }
    }
  )

  test('the values are pinned', () => {
    expect(CALENDAR_PROVIDERS).toEqual(['google', 'outlook'])
    expect(CALENDAR_CONNECTION_STATES).toEqual(['healthy', 'needs_reconnect'])
    expect(BOOKING_MODES).toEqual(['phone', 'video'])
    expect(BOOKING_STATES).toEqual(['pending', 'confirmed', 'cancelled'])
    expect(ROUTING_TARGET_KINDS).toEqual(['rep', 'team', 'pool'])
    expect(ROUTING_PURPOSES).toEqual(['booking', 'handoff', 'test'])
    expect(MAX_ROUTING_POOL_MEMBERS).toBe(20)
    expect(MAX_WORKING_WINDOWS).toBe(28)
  })

  test('a confirmed Booking cannot overlap another of the same Rep, buffers included', () => {
    expect(migration).toContain('CREATE EXTENSION IF NOT EXISTS btree_gist;')
    expect(migration).toContain('"bookings_rep_no_overlap"')
    expect(migration).toContain('EXCLUDE USING gist')
    expect(migration).toContain('WHERE ("status" = \'confirmed\')')
  })

  test('every list the consumer runs has an index', () => {
    expect(indexColumns(bookings, 'bookings_rep_idx')).toEqual([
      'organization_id',
      'membership_id',
      'starts_at',
      'id',
    ])
    expect(indexColumns(bookings, 'bookings_list_idx')).toEqual([
      'organization_id',
      'starts_at',
      'id',
    ])
    expect(indexColumns(bookings, 'bookings_prospect_idx')).toEqual([
      'organization_id',
      'prospect_id',
      'starts_at',
    ])
    expect(indexColumns(bookings, 'bookings_booking_type_idx')).toEqual([
      'organization_id',
      'booking_type_id',
    ])
    expect(indexColumns(routingRules, 'routing_rules_order_idx')).toEqual([
      'organization_id',
      'position',
      'id',
    ])
    expect(indexColumns(routingDecisions, 'routing_decisions_list_idx')).toEqual([
      'organization_id',
      'created_at',
      'id',
    ])
    expect(indexColumns(bookingTypes, 'booking_types_list_idx')).toEqual([
      'organization_id',
      'created_at',
      'id',
    ])
    expect(indexColumns(calendarConnections, 'calendar_connections_list_idx')).toEqual([
      'organization_id',
      'created_at',
      'id',
    ])
    expect(getTableConfig(busyBlocks).primaryKeys[0]?.columns.map((c) => c.name)).toEqual([
      'organization_id',
      'membership_id',
      'starts_at',
      'ends_at',
    ])
  })

  test('a Rep has one connection, a token resolves to one Booking Type, a key is used once', () => {
    expect(index(calendarConnections, 'calendar_connections_membership_key')?.unique).toBe(true)
    expect(index(bookingTypes, 'booking_types_public_token_key')?.unique).toBe(true)
    expect(index(bookings, 'bookings_idempotency_key')?.unique).toBe(true)
  })

  test('the connection stores sealed tokens only', () => {
    const names = getTableConfig(calendarConnections).columns.map((c) => c.name)
    expect(names.filter((n) => /token/.test(n))).toEqual(['tokens_ciphertext'])
  })
})
