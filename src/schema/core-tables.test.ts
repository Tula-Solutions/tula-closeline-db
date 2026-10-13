import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { is } from 'drizzle-orm'
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core'
import { NON_TENANT_TABLES } from '../isolation'
import { tenantRlsStatements } from '../tenant'
import { INVITATION_ROLES, MEMBERSHIP_ROLES } from './core-tables'
import * as schemas from './index'

const coreTables = Object.values<unknown>(schemas)
  .filter((value): value is PgTable => is(value, PgTable))
  .map((table) => getTableConfig(table))
  .filter((config) => config.schema === 'core')

const migration = readFileSync(
  new URL('../../migrations/0002_core_schema.sql', import.meta.url),
  'utf8'
)

const TENANT = ['invitations', 'memberships', 'organizations', 'team_members', 'teams']
const DIRECTORIES = ['invitation_directory', 'membership_directory']

describe('the core schema', () => {
  test('has the five tenant tables and the two directories, and nothing else', () => {
    expect(coreTables.map((config) => config.name).sort()).toEqual(
      [...DIRECTORIES, ...TENANT].sort()
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
        expect(migration).toContain(statement)
      }
    }
  )

  test.each(DIRECTORIES)('%s is on the allowlist and has no policy', (name) => {
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

  test('an invitation can offer every role but Owner', () => {
    expect<string[]>([...INVITATION_ROLES]).toEqual(
      MEMBERSHIP_ROLES.filter((role) => role !== 'owner')
    )
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

  test('creates the thirteen functions the integration suite classifies', () => {
    expect(functions.map((fn) => fn.name).sort()).toEqual([
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
      'sync_organization_status',
      'track_owner_count',
    ])
  })

  test.each(functions.map((fn) => [fn.name, fn.text] as const))(
    '%s pins search_path to pg_catalog, pg_temp',
    (_name, text) => {
      expect(text).toContain('SET search_path = pg_catalog, pg_temp')
    }
  )

  test('revokes EXECUTE on every function from PUBLIC, and grants only the lookups to closeline_core', () => {
    const revoke = /REVOKE ALL ON FUNCTION ([^;]+) FROM PUBLIC;/.exec(migration)?.[1] ?? ''
    for (const fn of functions) {
      expect(revoke).toContain(`"core"."${fn.name}"(`)
    }
    const grants = [...migration.matchAll(/GRANT EXECUTE ON FUNCTION ([^;]+) TO ([^;]+);/g)]
    expect(grants.map((grant) => grant[2])).toEqual(['closeline_core'])
    expect(grants[0]?.[1]).toBe(
      '"core"."organization_of_user"(text), "core"."invitation_for_token"(text)'
    )
  })

  test('takes every privilege on the directories, and the right to remove invitations, from closeline_core', () => {
    expect(migration).toContain(
      'REVOKE ALL ON "core"."membership_directory", "core"."invitation_directory" FROM closeline_core;'
    )
    expect(migration).toContain('REVOKE DELETE ON "core"."invitations" FROM closeline_core;')
  })

  test('guards bulk emptying of the five tables whose triggers keep the directories and Owner count', () => {
    for (const table of [
      'organizations',
      'memberships',
      'invitations',
      'membership_directory',
      'invitation_directory',
    ]) {
      expect(migration).toContain(
        `CREATE TRIGGER "${table}_no_truncate" BEFORE TRUNCATE ON "core"."${table}"`
      )
    }
  })
})
