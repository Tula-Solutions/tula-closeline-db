import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { is } from 'drizzle-orm'
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core'
import { NON_TENANT_TABLES } from '../isolation'
import { tenantRlsStatements } from '../tenant'
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
})
