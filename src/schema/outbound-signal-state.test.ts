import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import { fitScores, signalSettings } from './outbound-signal-state'

const file = readdirSync(new URL('../../migrations/', import.meta.url)).find((f) =>
  f.startsWith('0065_')
)
const migration = readFileSync(
  new URL(`../../migrations/${file ?? 'missing'}`, import.meta.url),
  'utf8'
)
const TABLES = { signal_settings: signalSettings, fit_scores: fitScores }

describe('the outbound Signal state tables', () => {
  test.each(Object.entries(TABLES))(
    '%s is in the outbound schema under its name',
    (name, table) => {
      const config = getTableConfig(table)
      expect(config.name).toBe(name)
      expect(config.schema).toBe('outbound')
    }
  )

  test.each(Object.keys(TABLES))(
    'the migration runs the canonical row-level security for %s',
    (name) => {
      for (const statement of tenantRlsStatements('outbound', name)) {
        expect(migration).toContain(statement)
      }
    }
  )

  test('the settings row is one per Organization and a score is one per Prospect', () => {
    const key = (t: typeof signalSettings | typeof fitScores) =>
      getTableConfig(t).primaryKeys[0]?.columns.map((c) => c.name)
    expect(key(signalSettings)).toEqual(['organization_id'])
    expect(key(fitScores)).toEqual(['organization_id', 'prospect_id'])
  })

  test('scores list by the keyset (score, prospect_id) highest first', () => {
    const index = getTableConfig(fitScores).indexes.find(
      (i) => i.config.name === 'fit_scores_list_idx'
    )
    expect(index?.config.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'organization_id',
      'score',
      'prospect_id',
    ])
  })
})
