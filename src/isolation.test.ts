import { describe, expect, test } from 'bun:test'
import { isPgSchema } from 'drizzle-orm/pg-core'
import { assertTenantIsolation, findTenantIsolationGaps, TENANT_SCHEMAS } from './isolation'
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
}

interface RoleRow {
  role: string
}

// The catalog queries themselves are exercised against Postgres in isolation.integration.ts; here
// the verdict on each row is. The first query lists relations, the second the risky roles.
const dbWith = (rows: Row[], roles: RoleRow[] = []) => {
  const results = [rows, roles]
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

  test('a role that bypasses row-level security is a gap', async () => {
    const gaps = await findTenantIsolationGaps(dbWith([GOOD], [{ role: 'closeline_core' }]))
    expect(gaps.map((gap) => `${gap.schema}.${gap.table}`)).toEqual(['pg_roles.closeline_core'])
    expect(gaps[0]?.reason).toContain('BYPASSRLS')
  })

  test('an allowlisted table is skipped', async () => {
    const row = { ...GOOD, has_org: false }
    expect(await findTenantIsolationGaps(dbWith([row]), ['core.prospects'])).toEqual([])
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

describe('TENANT_SCHEMAS', () => {
  test('names exactly the Postgres schemas exported from src/schema', () => {
    const declared = Object.values(schemas)
      .filter(isPgSchema)
      .map((schema) => schema.schemaName)
    expect([...TENANT_SCHEMAS].sort()).toEqual(declared.sort())
  })
})
