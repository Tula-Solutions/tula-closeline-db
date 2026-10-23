import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { NON_TENANT_TABLES } from '../isolation'
import { tenantRlsStatements } from '../tenant'
import { demoRateCounters } from './core-demo-rate-counter'

const migration = readFileSync(
  new URL('../../migrations/0022_core_demo_rate_counter.sql', import.meta.url),
  'utf8'
)
const config = getTableConfig(demoRateCounters)

describe('core.demo_rate_counter', () => {
  test('holds a hash, a window and a count, and never a raw address', () => {
    expect(config.columns.map((column) => column.name).sort()).toEqual([
      'address_hash',
      'hits',
      'window_start',
    ])
    expect(config.primaryKeys[0]?.columns.map((column) => column.name)).toEqual([
      'address_hash',
      'window_start',
    ])
  })

  test('checks the hash is 32 bytes and the count is positive', () => {
    expect(config.checks.map((check) => check.name).sort()).toEqual([
      'demo_rate_counter_address_hash_length',
      'demo_rate_counter_hits_positive',
    ])
  })

  test('is on the allowlist, has no row-level security policy, and is revoked from closeline_core', () => {
    expect(NON_TENANT_TABLES).toContain('core.demo_rate_counter')
    for (const statement of tenantRlsStatements('core', 'demo_rate_counter')) {
      expect(migration).not.toContain(statement)
    }
    expect(migration).toContain('REVOKE ALL ON "core"."demo_rate_counter" FROM closeline_core;')
  })

  test('has an index on window_start for the purge', () => {
    expect(config.indexes.map((index) => index.config.name)).toEqual([
      'demo_rate_counters_window_start_idx',
    ])
  })

  test('the functions are SECURITY DEFINER, pinned, and granted to closeline_core alone', () => {
    for (const name of ['hit_demo_rate_limit', 'purge_demo_rate_counters']) {
      expect(migration).toContain(`CREATE FUNCTION "core"."${name}"`)
    }
    expect(migration.match(/VOLATILE SECURITY DEFINER/g)).toHaveLength(2)
    expect(migration.match(/SET search_path = pg_catalog, pg_temp/g)).toHaveLength(2)
    expect(migration).toContain('FROM PUBLIC;')
    expect(migration).toContain('TO closeline_core;')
  })
})
