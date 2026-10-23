import { describe, expect, test } from 'bun:test'
import { isPgSchema } from 'drizzle-orm/pg-core'
import {
  ALLOWED_PREDEFINED_ROLES,
  assertTenantIsolation,
  CONTROL_PLANE_TABLE_REASONS,
  CONTROL_PLANE_TABLES,
  ENVIRONMENT_SCOPED_TABLES,
  EXTENSION_SCHEMAS,
  findTenantIsolationGaps,
  NON_TENANT_TABLE_REASONS,
  NON_TENANT_TABLES,
  TENANT_SCHEMAS,
} from './isolation'
import * as schemas from './schema'

interface Row {
  schema: string
  table: string
  kind: string
  has_org: boolean
  enabled: boolean
  forced: boolean
  permissive: number
  weak_permissive: number
  weak_environment_permissive: number
  reachable_by: string[]
}

const GOOD: Row = {
  schema: 'core',
  table: 'prospects',
  kind: 'r',
  has_org: true,
  enabled: true,
  forced: true,
  permissive: 1,
  weak_permissive: 0,
  weak_environment_permissive: 1,
  reachable_by: [],
}

/** An environment-scoped auth table that is fail-closed on environment_id. */
const GOOD_ENVIRONMENT: Row = {
  ...GOOD,
  schema: 'auth',
  table: 'users',
  has_org: false,
  weak_permissive: 1,
  weak_environment_permissive: 0,
}

/** A control-plane auth table: no organization_id, and no row-level security of its own. */
const GOOD_CONTROL_PLANE: Row = {
  ...GOOD,
  schema: 'auth',
  table: 'workspaces',
  has_org: false,
  enabled: false,
  forced: false,
  permissive: 0,
  weak_permissive: 0,
}

interface RoleRow {
  role: string
}

interface MembershipRow {
  role: string
  granted: string
}

// The catalog queries themselves are exercised against Postgres in isolation.integration.ts; here
// the verdict on each row is. The first query lists relations, the second the risky roles.
const dbWith = (rows: Row[], roles: RoleRow[] = [], memberships: MembershipRow[] = []) => {
  const results = [rows, roles, memberships]
  return { execute: async () => ({ rows: results.shift() ?? [] }) } as never
}

describe('findTenantIsolationGaps', () => {
  test('a protected table is not a gap', async () => {
    expect(await findTenantIsolationGaps(dbWith([GOOD]))).toEqual([])
  })

  test.each([
    ['a view', { kind: 'v' }, 'not a table'],
    ['no organization_id', { has_org: false }, 'organization_id'],
    ['row-level security off', { enabled: false }, 'enabled'],
    ['row-level security not forced', { forced: false }, 'forced'],
    ['no policy', { permissive: 0 }, 'policy'],
    ['a policy that is not the canonical tenant expression', { weak_permissive: 1 }, 'canonical'],
    ['a schema that is not a service schema', { schema: 'elsewhere' }, 'not a service schema'],
  ])('%s is a gap', async (_name, change, reason) => {
    const gaps = await findTenantIsolationGaps(dbWith([{ ...GOOD, ...change }]))
    expect(gaps.length).toBe(1)
    expect(gaps[0]?.reason).toContain(reason)
  })

  test.each(['r', 'p', 'v', 'm', 'f'])('relkind %s in public is a gap', async (kind) => {
    const gaps = await findTenantIsolationGaps(
      dbWith([{ ...GOOD, schema: 'public', table: 'leftover', kind }])
    )
    expect(gaps.map((gap) => `${gap.schema}.${gap.table}`)).toEqual(['public.leftover'])
    expect(gaps[0]?.reason).toContain('public')
  })

  test('a relation in an extension-owned schema is skipped', async () => {
    const row = { ...GOOD, schema: 'ext_owned', kind: 'v' }
    expect(await findTenantIsolationGaps(dbWith([row]))).toHaveLength(1)
    expect(await findTenantIsolationGaps(dbWith([row]), [], ['ext_owned'])).toEqual([])
  })

  test('a role that bypasses row-level security is a gap', async () => {
    const gaps = await findTenantIsolationGaps(dbWith([GOOD], [{ role: 'closeline_core' }]))
    expect(gaps.map((gap) => `${gap.schema}.${gap.table}`)).toEqual(['pg_roles.closeline_core'])
    expect(gaps[0]?.reason).toContain('BYPASSRLS')
  })

  test('an allowlisted table nothing can select from is skipped', async () => {
    const row = { ...GOOD, has_org: false }
    expect(await findTenantIsolationGaps(dbWith([row]), ['core.prospects'])).toEqual([])
  })

  test('an allowlisted table a service role holds a privilege on is a gap, naming the roles', async () => {
    const row = {
      ...GOOD,
      has_org: false,
      enabled: false,
      reachable_by: ['closeline_core', 'closeline_auth'],
    }
    const gaps = await findTenantIsolationGaps(dbWith([row]), ['core.prospects'])
    expect(gaps.map((gap) => `${gap.schema}.${gap.table}`)).toEqual(['core.prospects'])
    expect(gaps[0]?.reason).toContain('closeline_core, closeline_auth')
    expect(gaps[0]?.reason).toContain('SECURITY DEFINER')
  })

  test('a protected table that a service role can reach is not a gap: row-level security governs it', async () => {
    const row = { ...GOOD, reachable_by: ['closeline_core'] }
    expect(await findTenantIsolationGaps(dbWith([row]))).toEqual([])
  })
})

describe('findTenantIsolationGaps on role membership', () => {
  test('a service role in a role that is not predefined is a gap, naming both', async () => {
    const gaps = await findTenantIsolationGaps(
      dbWith([GOOD], [], [{ role: 'closeline_core', granted: 'ops_admin' }])
    )
    expect(gaps.map((gap) => `${gap.schema}.${gap.table}`)).toEqual(['pg_roles.closeline_core'])
    expect(gaps[0]?.reason).toContain('ops_admin')
  })

  test('the predefined roles a service role may belong to are the four monitoring ones', () => {
    expect([...ALLOWED_PREDEFINED_ROLES]).toEqual([
      'pg_monitor',
      'pg_read_all_settings',
      'pg_read_all_stats',
      'pg_stat_scan_tables',
    ])
  })
})

describe('findTenantIsolationGaps on the auth schema', () => {
  test('an environment-scoped table fail-closed on environment_id is not a gap', async () => {
    expect(await findTenantIsolationGaps(dbWith([GOOD_ENVIRONMENT]))).toEqual([])
  })

  test('a control-plane table with no organization_id is not a gap', async () => {
    expect(await findTenantIsolationGaps(dbWith([GOOD_CONTROL_PLANE]))).toEqual([])
  })

  test.each([
    ['an organization_id column', { has_org: true }, 'organization_id'],
    ['row-level security off', { enabled: false }, 'enabled'],
    ['row-level security not forced', { forced: false }, 'forced'],
    ['no policy', { permissive: 0, weak_environment_permissive: 0 }, 'no permissive policy'],
    ['a second permissive policy', { permissive: 2 }, 'exactly one'],
    [
      'a permissive policy that is not the environment expression',
      { weak_environment_permissive: 1 },
      'canonical',
    ],
  ])('an environment-scoped table with %s is a gap', async (_name, change, reason) => {
    const gaps = await findTenantIsolationGaps(dbWith([{ ...GOOD_ENVIRONMENT, ...change }]))
    expect(gaps.map((gap) => `${gap.schema}.${gap.table}`)).toEqual(['auth.users'])
    expect(gaps[0]?.reason).toContain(reason)
  })

  test('a control-plane table with an organization_id column is a gap', async () => {
    const gaps = await findTenantIsolationGaps(dbWith([{ ...GOOD_CONTROL_PLANE, has_org: true }]))
    expect(gaps.map((gap) => gap.table)).toEqual(['workspaces'])
    expect(gaps[0]?.reason).toContain('organization_id')
  })

  test('an auth table in neither category is a gap, even if it looks protected', async () => {
    for (const row of [GOOD_ENVIRONMENT, GOOD, GOOD_CONTROL_PLANE]) {
      const gaps = await findTenantIsolationGaps(dbWith([{ ...row, schema: 'auth', table: 'new' }]))
      expect(gaps.map((gap) => gap.table)).toEqual(['new'])
      expect(gaps[0]?.reason).toContain('ENVIRONMENT_SCOPED_TABLES')
      expect(gaps[0]?.reason).toContain('CONTROL_PLANE_TABLES')
    }
  })

  test('a view in the auth schema is a gap whatever its name', async () => {
    const gaps = await findTenantIsolationGaps(dbWith([{ ...GOOD_ENVIRONMENT, kind: 'v' }]))
    expect(gaps[0]?.reason).toContain('not a table')
  })

  test('the organization rule still applies to core and playbook', async () => {
    const gaps = await findTenantIsolationGaps(
      dbWith([
        { ...GOOD, table: 'a', has_org: false },
        { ...GOOD_ENVIRONMENT, schema: 'core' },
      ])
    )
    expect(gaps.map((gap) => gap.table)).toEqual(['a', 'users'])
    expect(gaps.every((gap) => gap.reason.includes('organization_id'))).toBe(true)
  })
})

describe('the auth table categories', () => {
  test('are disjoint, in the auth schema, and split 26 and 6', () => {
    expect(ENVIRONMENT_SCOPED_TABLES).toHaveLength(26)
    expect(CONTROL_PLANE_TABLES).toHaveLength(6)
    const all = [...ENVIRONMENT_SCOPED_TABLES, ...CONTROL_PLANE_TABLES]
    expect(new Set(all).size).toBe(all.length)
    expect(all.every((name) => name.startsWith('auth.'))).toBe(true)
  })

  test('give every control-plane table a one-line reason', () => {
    expect(Object.keys(CONTROL_PLANE_TABLE_REASONS).sort()).toEqual(
      [...CONTROL_PLANE_TABLES].sort()
    )
    for (const reason of Object.values(CONTROL_PLANE_TABLE_REASONS)) {
      expect(reason.trim().length).toBeGreaterThan(20)
      expect(reason).not.toContain('\n')
    }
  })

  test('exempt only the three core directories, the status table, the Demo Request table, the demo rate counter, the playbook work registry, the voice line directory and the voice Twilio directory, each with a precise reason, and no auth table', () => {
    expect([...NON_TENANT_TABLES].sort()).toEqual([
      'core.consent_form_directory',
      'core.demo_rate_counter',
      'core.demo_request',
      'core.invitation_directory',
      'core.membership_directory',
      'core.organization_state',
      'playbook.work_hints',
      'voice.line_directory',
      'voice.twilio_directory',
    ])
    expect(Object.keys(NON_TENANT_TABLE_REASONS).sort()).toEqual([...NON_TENANT_TABLES].sort())
    for (const reason of Object.values(NON_TENANT_TABLE_REASONS)) {
      expect(reason.trim().length).toBeGreaterThan(60)
      expect(reason).not.toContain('\n')
    }
  })
})

describe('assertTenantIsolation', () => {
  test('passes with no gaps and names every gap otherwise', async () => {
    await assertTenantIsolation(dbWith([GOOD]))
    const bad = [
      { ...GOOD, table: 'a', enabled: false },
      { ...GOOD, table: 'b', forced: false },
    ]
    const error = await assertTenantIsolation(dbWith(bad)).catch((e: Error) => e)
    expect((error as Error).message).toContain('core.a')
    expect((error as Error).message).toContain('core.b')
  })
})

describe('EXTENSION_SCHEMAS', () => {
  test('is empty until a decision record allows an extension schema', () => {
    expect(EXTENSION_SCHEMAS).toEqual([])
  })
})

describe('TENANT_SCHEMAS', () => {
  test('names exactly the Postgres schemas exported from src/schema', () => {
    const declared = Object.values<unknown>(schemas)
      .filter(isPgSchema)
      .map((schema): string => schema.schemaName)
      .sort()
    expect<string[]>([...TENANT_SCHEMAS].sort()).toEqual(declared)
  })
})
