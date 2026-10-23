import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { is } from 'drizzle-orm'
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core'
import { NON_TENANT_TABLES } from '../isolation'
import { tenantRlsStatements } from '../tenant'
import {
  IDEMPOTENCY_HASH_BYTES,
  IDEMPOTENCY_KEY_MAX,
  IDEMPOTENCY_RESPONSE_MAX_BYTES,
  IDEMPOTENCY_ROUTE_MAX,
  INVITATION_ROLES,
  MEMBER_NAME_MAX,
  MEMBERSHIP_ROLES,
} from './core-tables'
import * as schemas from './index'

const coreTables = Object.values<unknown>(schemas)
  .filter((value): value is PgTable => is(value, PgTable))
  .map((table) => getTableConfig(table))
  .filter((config) => config.schema === 'core')

const migration = readFileSync(
  new URL('../../migrations/0002_core_schema.sql', import.meta.url),
  'utf8'
)

const idempotencyMigration = readFileSync(
  new URL('../../migrations/0004_core_idempotency_keys.sql', import.meta.url),
  'utf8'
)

const TENANT = [
  'idempotency_keys',
  'invitations',
  'memberships',
  'organizations',
  'team_members',
  'teams',
]
const NO_ACCESS = ['invitation_directory', 'membership_directory', 'organization_state']

describe('the core schema', () => {
  test('has the six tenant tables, the two directories, the status table and the Demo Request table, and nothing else', () => {
    expect(coreTables.map((config) => config.name).sort()).toEqual(
      [...NO_ACCESS, 'demo_request', ...TENANT].sort()
    )
  })

  test.each(TENANT)('%s has an organization_id column', (name) => {
    const config = coreTables.find((table) => table.name === name)
    expect(config?.columns.map((column) => column.name)).toContain('organization_id')
  })

  test('organizations is keyed by organization_id, so the canonical policy applies unchanged', () => {
    const config = coreTables.find((table) => table.name === 'organizations')
    expect(config?.columns.find((column) => column.primary)?.name).toBe('organization_id')
  })

  test.each(TENANT)(
    'the migration runs the canonical row-level-security statements for %s',
    (name) => {
      for (const statement of tenantRlsStatements('core', name)) {
        expect(migration + idempotencyMigration).toContain(statement)
      }
    }
  )

  test.each(NO_ACCESS)('%s is on the allowlist and has no policy', (name) => {
    expect(NON_TENANT_TABLES).toContain(`core.${name}`)
    for (const statement of tenantRlsStatements('core', name)) {
      expect(migration).not.toContain(statement)
    }
  })

  test('one Organization per user is a single named constraint on the membership directory', () => {
    const directory = coreTables.find((table) => table.name === 'membership_directory')
    expect(directory?.uniqueConstraints.map((constraint) => constraint.name)).toEqual([
      'membership_directory_one_organization_per_user',
    ])
    expect(directory?.uniqueConstraints[0]?.columns.map((column) => column.name)).toEqual([
      'user_id',
    ])
  })

  test('invitations are indexed by Organization, state, creation time and id, in that order', () => {
    const config = coreTables.find((table) => table.name === 'invitations')
    const index = config?.indexes.find((i) => i.config.name === 'invitations_state_list_idx')
    expect(index?.config.columns.map((column) => ('name' in column ? column.name : ''))).toEqual([
      'organization_id',
      'state',
      'created_at',
      'id',
    ])
    expect(index?.config.unique).toBe(false)
    expect(index?.config.where).toBeUndefined()
    expect(
      readFileSync(
        new URL('../../migrations/0003_invitation_state_index.sql', import.meta.url),
        'utf8'
      )
    ).toContain(
      'CREATE INDEX "invitations_state_list_idx" ON "core"."invitations" USING btree ("organization_id","state","created_at","id")'
    )
  })

  test('an invitation can offer every role but Owner', () => {
    expect<string[]>([...INVITATION_ROLES]).toEqual(
      MEMBERSHIP_ROLES.filter((role) => role !== 'owner')
    )
  })
})

describe('idempotency keys', () => {
  const config = coreTables.find((table) => table.name === 'idempotency_keys')
  const columnNames = (indexName: string) =>
    config?.indexes
      .find((i) => i.config.name === indexName)
      ?.config.columns.map((column) => ('name' in column ? column.name : ''))

  test('the key is (organization_id, user_id, route, key), in that order', () => {
    expect(config?.primaryKeys.map((pk) => pk.columns.map((column) => column.name))).toEqual([
      ['organization_id', 'user_id', 'route', 'key'],
    ])
    expect(config?.primaryKeys[0]?.getName()).toBe('idempotency_keys_pkey')
  })

  test('the purge is served by an index on (organization_id, created_at) and no other index exists', () => {
    expect(columnNames('idempotency_keys_purge_idx')).toEqual(['organization_id', 'created_at'])
    expect(config?.indexes.map((i) => i.config.name)).toEqual(['idempotency_keys_purge_idx'])
  })

  test('a request is in flight while status and response are null', () => {
    const byName = (name: string) => config?.columns.find((column) => column.name === name)
    expect(byName('status')?.notNull).toBe(false)
    expect(byName('response')?.notNull).toBe(false)
    for (const name of [
      'route',
      'key',
      'request_hash',
      'user_id',
      'organization_id',
      'created_at',
    ]) {
      expect([name, byName(name)?.notNull]).toEqual([name, true])
    }
  })

  test('the bounds the checks use are exported', () => {
    expect([
      IDEMPOTENCY_ROUTE_MAX,
      IDEMPOTENCY_KEY_MAX,
      IDEMPOTENCY_HASH_BYTES,
      IDEMPOTENCY_RESPONSE_MAX_BYTES,
    ]).toEqual([64, 255, 32, 16_384])
  })

  test('its migration is written for this table alone and never rewrites an earlier one', () => {
    expect(idempotencyMigration).toContain('CREATE TABLE "core"."idempotency_keys"')
    expect(idempotencyMigration).not.toContain('SECURITY DEFINER')
    expect(idempotencyMigration).not.toMatch(/DROP |ALTER TABLE "core"\."(?!idempotency_keys)/)
  })

  test('its trigger function pins search_path and is revoked from PUBLIC', () => {
    expect(idempotencyMigration).toContain(
      'CREATE FUNCTION "core"."refuse_idempotency_rewrite"() RETURNS trigger LANGUAGE plpgsql\nSET search_path = pg_catalog, pg_temp'
    )
    expect(idempotencyMigration).toContain(
      'REVOKE ALL ON FUNCTION "core"."refuse_idempotency_rewrite"() FROM PUBLIC;'
    )
  })

  test('it grants nothing: closeline_core has the schema defaults and no other role has any', () => {
    const statements = idempotencyMigration
      .split('\n')
      .filter((line) => !line.startsWith('--'))
      .join('\n')
    expect(statements).not.toMatch(/\bGRANT\b/)
    expect(statements).not.toContain('closeline_')
  })
})

describe('the hand-written SQL of the migration', () => {
  // The `CREATE FUNCTION "core"."name"` statements, split at the statement breakpoint.
  const functions = migration
    .split('--> statement-breakpoint')
    .filter((statement) => statement.includes('CREATE FUNCTION "core"'))
    .map((statement) => ({
      name: /CREATE FUNCTION "core"\."(\w+)"/.exec(statement)?.[1] ?? '',
      text: statement,
    }))

  test('creates the fourteen functions the integration suite classifies', () => {
    expect(functions.map((fn) => fn.name).sort()).toEqual([
      'has_expired',
      'invitation_for_token',
      'organization_of_user',
      'refuse_region_change',
      'refuse_reopened_invitation',
      'refuse_revived_ownerless_organization',
      'refuse_truncate',
      'refuse_unacceptable_invitation',
      'require_owner',
      'start_organization',
      'sync_invitation_directory',
      'sync_membership_directory',
      'sync_organization_state',
      'track_owner_count',
    ])
  })

  test.each(functions.map((fn) => [fn.name, fn.text] as const))(
    '%s pins search_path to pg_catalog, pg_temp',
    (_name, text) => {
      expect(text).toContain('SET search_path = pg_catalog, pg_temp')
    }
  )

  test.each(['sync_membership_directory', 'sync_invitation_directory'])(
    '%s plans each statement for its key, so a plan built on a small table is not kept',
    (name) => {
      const text = functions.find((fn) => fn.name === name)?.text ?? ''
      expect(text).toContain('SET plan_cache_mode = force_custom_plan')
    }
  )

  test('the directories have no index on organization_id alone', () => {
    expect(migration).not.toMatch(
      /CREATE INDEX "(membership|invitation)_directory_organization_idx"/
    )
    for (const name of ['membership_directory', 'invitation_directory']) {
      const config = coreTables.find((table) => table.name === name)
      expect(config?.indexes).toEqual([])
    }
  })

  test('revokes EXECUTE on every function from PUBLIC, and grants only the lookups and the expiry rule to closeline_core', () => {
    const revoke = /REVOKE ALL ON FUNCTION ([^;]+) FROM PUBLIC;/.exec(migration)?.[1] ?? ''
    for (const fn of functions) {
      expect(revoke).toContain(`"core"."${fn.name}"(`)
    }
    const grants = [...migration.matchAll(/GRANT EXECUTE ON FUNCTION ([^;]+) TO ([^;]+);/g)]
    expect(grants.map((grant) => grant[2])).toEqual(['closeline_core'])
    expect(grants[0]?.[1]).toBe(
      '"core"."organization_of_user"(text), "core"."invitation_for_token"(text), "core"."has_expired"(timestamp with time zone, timestamp with time zone)'
    )
  })

  test('takes every privilege on the directories and the status table, and the right to remove invitations, from closeline_core', () => {
    expect(migration).toContain(
      'REVOKE ALL ON "core"."membership_directory", "core"."invitation_directory", "core"."organization_state" FROM closeline_core;'
    )
    expect(migration).toContain('REVOKE DELETE ON "core"."invitations" FROM closeline_core;')
  })

  test('guards bulk emptying of the six tables whose triggers keep the directories, the status and the Owner count', () => {
    for (const table of [
      'organizations',
      'memberships',
      'invitations',
      'membership_directory',
      'invitation_directory',
      'organization_state',
    ]) {
      expect(migration).toContain(
        `CREATE TRIGGER "${table}_no_truncate" BEFORE TRUNCATE ON "core"."${table}"`
      )
    }
  })
})

describe('a member email and name', () => {
  const config = coreTables.find((table) => table.name === 'memberships')
  const column = (name: string) => config?.columns.find((c) => c.name === name)
  const profileMigration = readFileSync(
    new URL('../../migrations/0005_core_membership_profile.sql', import.meta.url),
    'utf8'
  )

  test('email is required text and name is optional text', () => {
    expect(column('email')?.getSQLType()).toBe('text')
    expect(column('email')?.notNull).toBe(true)
    expect(column('email')?.hasDefault).toBe(false)
    expect(column('name')?.getSQLType()).toBe('text')
    expect(column('name')?.notNull).toBe(false)
  })

  test('the name bound is the contract MAX_PERSON_NAME_LENGTH, one more than a Team name', () => {
    expect(MEMBER_NAME_MAX).toBe(201)
  })

  test('the email rule is the invitations rule, word for word', () => {
    const body = (table: string, constraint: string) => {
      const start = migration.indexOf(`CONSTRAINT "${constraint}" CHECK (`)
      const text = start >= 0 ? migration : profileMigration
      const from = text.indexOf(`"${constraint}" CHECK (`)
      return text
        .slice(from)
        .split("'^[!-~]+$'")[0]
        ?.replaceAll(`"core"."${table}"`, '<table>')
        .replace(/^[^(]*\(/, '')
    }
    expect(body('memberships', 'memberships_email_shape')).toBe(
      body('invitations', 'invitations_email_shape')
    )
  })

  test('one plain index serves the "already a member" check, and none is on name', () => {
    expect(config?.indexes.map((i) => i.config.name)).toEqual([
      'memberships_organization_email_idx',
    ])
    const index = config?.indexes[0]
    expect(index?.config.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'organization_id',
      'email',
    ])
    expect(index?.config.unique).toBe(false)
    expect(profileMigration).toContain(
      'CREATE INDEX "memberships_organization_email_idx" ON "core"."memberships" USING btree ("organization_id","email")'
    )
  })

  test('the guard message names both resets', () => {
    expect(profileMigration).toContain('docker compose down -v')
    expect(profileMigration).toContain('dev --down --volumes')
  })

  test('the migration guards existing memberships before it adds the required column', () => {
    expect(profileMigration.indexOf('RAISE EXCEPTION')).toBeGreaterThan(-1)
    expect(profileMigration.indexOf('RAISE EXCEPTION')).toBeLessThan(
      profileMigration.indexOf('ADD COLUMN "email"')
    )
    expect(profileMigration).not.toMatch(/DEFAULT/i)
  })
})
