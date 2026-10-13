import { describe, expect, test } from 'bun:test'
import { is } from 'drizzle-orm'
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core'
import { NON_TENANT_TABLE_REASONS, NON_TENANT_TABLES } from '../../isolation'
import * as schemas from '../index'
import { TENANT_PREDICATE, TENANT_SETTING } from './tenant-columns'

const authTables = Object.values<unknown>(schemas)
  .filter((value): value is PgTable => is(value, PgTable))
  .map((table) => getTableConfig(table))
  .filter((config) => config.schema === 'auth')

const names = authTables.map((config) => config.name).sort()

/** Control-plane tables: no environment of their own to scope by (see their JSDoc in source). */
const CONTROL_PLANE = ['api_keys', 'environments', 'instance_audit_logs', 'projects', 'workspaces']

describe('the auth schema', () => {
  test('has exactly the tables tula-auth has, in the auth Postgres schema', () => {
    expect(names).toEqual(
      [
        'api_keys',
        'audit_logs',
        'backup_codes',
        'credentials',
        'environment_settings',
        'environments',
        'events',
        'flow_attempts',
        'hook_call_counts',
        'hooks',
        'identities',
        'instance_audit_logs',
        'native_apps',
        'oauth_providers',
        'passkey_challenges',
        'passkeys',
        'password_history',
        'projects',
        'proposals',
        'refresh_tokens',
        'sessions',
        'signing_keys',
        'sms_code_counts',
        'user_factors',
        'users',
        'verification_tokens',
        'webhook_deliveries',
        'webhook_delivery_attempts',
        'webhook_endpoints',
        'workspaces',
      ].sort()
    )
  })

  test('no auth table carries organization_id: users are global within a Region', () => {
    const withOrganization = authTables
      .filter((config) => config.columns.some((column) => column.name === 'organization_id'))
      .map((config) => config.name)
    expect(withOrganization).toEqual([])
  })

  test('every table keyed by an environment has the tenant policy on that environment', () => {
    const scoped = authTables.filter((config) =>
      config.columns.some((column) => column.name === 'environment_id')
    )
    const unscoped = scoped.filter((config) => !config.policies.some((policy) => policy.using))
    // api_keys has the column but is deliberately outside row-level security (key lookup decides
    // the tenant); every other table must carry the policy.
    expect(unscoped.map((config) => config.name)).toEqual(['api_keys'])
    for (const config of scoped.filter((c) => c.name !== 'api_keys')) {
      const policy = config.policies.find((p) => p.name === `${config.name}_tenant_isolation`)
      expect(policy?.as).toBe('permissive')
      expect(policy?.for).toBe('all')
      expect(policy?.using).toBe(TENANT_PREDICATE)
      expect(policy?.withCheck).toBe(TENANT_PREDICATE)
    }
  })

  test('control-plane tables are exactly the ones with no row-level security', () => {
    const withoutPolicy = authTables
      .filter((config) => config.policies.length === 0)
      .map((config) => config.name)
      .sort()
    expect(withoutPolicy).toEqual(CONTROL_PLANE)
  })

  test("the policy setting is tula-auth's, which the copied service sets", () => {
    expect(TENANT_SETTING).toBe('tula.environment_id')
  })
})

describe('the non-tenant allowlist', () => {
  test('names every auth table and nothing else, so a new one must be added on purpose', () => {
    const qualified = authTables.map((config) => `auth.${config.name}`)
    expect([...NON_TENANT_TABLES].sort()).toEqual(qualified.sort())
  })

  test('gives every entry a reason on one line', () => {
    for (const name of NON_TENANT_TABLES) {
      const reason = NON_TENANT_TABLE_REASONS[name]
      expect(typeof reason).toBe('string')
      expect(reason?.trim().length).toBeGreaterThan(20)
      expect(reason).not.toContain('\n')
    }
    expect(Object.keys(NON_TENANT_TABLE_REASONS).sort()).toEqual([...NON_TENANT_TABLES].sort())
  })
})
