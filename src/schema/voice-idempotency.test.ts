import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import {
  IDEMPOTENCY_HASH_BYTES,
  IDEMPOTENCY_KEY_MAX,
  IDEMPOTENCY_RESPONSE_MAX_BYTES,
  IDEMPOTENCY_ROUTE_MAX,
} from './core-tables'
import { voiceIdempotencyKeys } from './voice-idempotency'
import { MAX_VOICE_IDEMPOTENCY_KEY_LENGTH } from './voice-tables'

const migration = readFileSync(
  new URL('../../migrations/0036_voice_idempotency_keys.sql', import.meta.url),
  'utf8'
)
const config = getTableConfig(voiceIdempotencyKeys)

describe('voice.idempotency_keys', () => {
  test('lives in the voice schema with core and playbook columns', () => {
    expect(config.schema).toBe('voice')
    expect(config.name).toBe('idempotency_keys')
    expect(config.columns.map((c) => c.name)).toEqual([
      'organization_id',
      'user_id',
      'route',
      'key',
      'request_hash',
      'status',
      'response',
      'created_at',
    ])
  })

  test('the primary key is (organization_id, user_id, route, key)', () => {
    const [pk] = config.primaryKeys
    expect(pk?.columns.map((c) => c.name)).toEqual(['organization_id', 'user_id', 'route', 'key'])
  })

  test('an index over (organization_id, created_at) supports the purge', () => {
    const purge = config.indexes.find((i) => i.config.name === 'idempotency_keys_purge_idx')
    expect(purge?.config.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'organization_id',
      'created_at',
    ])
  })

  test('the key bound is the voice constant, the contract bound and core bound', () => {
    expect(MAX_VOICE_IDEMPOTENCY_KEY_LENGTH).toBe(IDEMPOTENCY_KEY_MAX)
    expect(IDEMPOTENCY_KEY_MAX).toBe(255)
  })

  test('the migration creates the table with the shared bounds and checks', () => {
    expect(migration).toContain('CREATE TABLE "voice"."idempotency_keys"')
    expect(migration).toContain(`between 1 and ${IDEMPOTENCY_ROUTE_MAX}`)
    expect(migration).toContain(`between 1 and ${IDEMPOTENCY_KEY_MAX}`)
    expect(migration).toContain(
      `octet_length("voice"."idempotency_keys"."request_hash") = ${IDEMPOTENCY_HASH_BYTES}`
    )
    expect(migration).toContain(`<= ${IDEMPOTENCY_RESPONSE_MAX_BYTES}`)
    for (const name of [
      'idempotency_keys_pkey',
      'idempotency_keys_organization_id_shape',
      'idempotency_keys_organization_not_global',
      'idempotency_keys_user_id_shape',
      'idempotency_keys_route_shape',
      'idempotency_keys_key_shape',
      'idempotency_keys_request_hash_length',
      'idempotency_keys_status_range',
      'idempotency_keys_response_matches_status',
      'idempotency_keys_response_size',
    ]) {
      expect(migration).toContain(`CONSTRAINT "${name}"`)
    }
    expect(migration).toContain('CREATE INDEX "idempotency_keys_purge_idx"')
  })

  test('the migration runs the canonical row-level-security statements', () => {
    for (const statement of tenantRlsStatements('voice', 'idempotency_keys')) {
      expect(migration).toContain(statement)
    }
  })

  test('the migration makes a completed row write-once and revokes the function from PUBLIC', () => {
    expect(migration).toContain('CREATE TRIGGER "idempotency_keys_final"')
    expect(migration).toContain('"voice"."refuse_idempotency_rewrite"')
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION "voice"."refuse_idempotency_rewrite"() FROM PUBLIC;'
    )
  })
})

describe('release', () => {
  test('package.json is at 0.38.0 and the README names that release for the voice keys', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
    expect(pkg.version).toBe('0.38.0')
    const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8')
    expect(readme).toContain('voice.idempotency_keys')
    expect(readme).toContain('v0.38.0')
  })
})
