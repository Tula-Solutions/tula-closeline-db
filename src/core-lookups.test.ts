import { describe, expect, test } from 'bun:test'
import { PgDialect } from 'drizzle-orm/pg-core'
import { invitationForToken, organizationOfUser } from './core-lookups'

const USER = `usr_${'a1'.repeat(16)}`
const ORG = `org_${'b2'.repeat(16)}`
const INVITATION = `inv_${'c3'.repeat(16)}`
const HASH = 'd4'.repeat(32)

/** A handle whose `execute` records the query it was given and answers with `rows`. */
function dbAnswering(rows: Record<string, unknown>[]) {
  const seen: { sql: string; params: unknown[] }[] = []
  const dialect = new PgDialect()
  const db = {
    execute: async (query: Parameters<PgDialect['sqlToQuery']>[0]) => {
      seen.push(dialect.sqlToQuery(query))
      return { rows }
    },
  } as never
  return { db, seen }
}

describe('organizationOfUser', () => {
  test.each([
    ['an empty id', ''],
    ['the wrong prefix', `org_${'a1'.repeat(16)}`],
    ['uppercase hex', `usr_${'A1'.repeat(16)}`],
    ['a trailing newline', `${USER}\n`],
    ['a quote and a statement', `usr_'; select 1; --${'a'.repeat(12)}`],
  ])('rejects %s before any query runs', async (_name, id) => {
    const { db, seen } = dbAnswering([])
    await expect(organizationOfUser(db, id)).rejects.toThrow('invalid user id')
    expect(seen).toEqual([])
  })

  test('calls the lookup function with the id as a bound parameter and maps the row', async () => {
    const { db, seen } = dbAnswering([{ organization_id: ORG, status: 'suspended' }])
    expect(await organizationOfUser(db, USER)).toEqual({
      organizationId: ORG,
      status: 'suspended',
    })
    expect(seen).toHaveLength(1)
    expect(seen[0]?.sql).toContain('core.organization_of_user($1)')
    expect(seen[0]?.sql).not.toContain(USER)
    expect(seen[0]?.params).toEqual([USER])
  })

  test('is null for a user who belongs to no Organization', async () => {
    expect(await organizationOfUser(dbAnswering([]).db, USER)).toBeNull()
  })

  test('refuses an answer of more than one Organization instead of picking one', async () => {
    const row = { organization_id: ORG, status: 'active' }
    await expect(organizationOfUser(dbAnswering([row, row]).db, USER)).rejects.toThrow(
      'more than one'
    )
  })
})

describe('invitationForToken', () => {
  test.each([
    ['an empty hash', ''],
    ['the raw token', 'sometoken'],
    ['uppercase hex', 'D4'.repeat(32)],
    ['too short', 'd4'.repeat(31)],
    ['a trailing newline', `${HASH}\n`],
  ])('rejects %s before any query runs', async (_name, hash) => {
    const { db, seen } = dbAnswering([])
    await expect(invitationForToken(db, hash)).rejects.toThrow('invalid token hash')
    expect(seen).toEqual([])
  })

  test('calls the lookup function with the hash as a bound parameter and maps the row', async () => {
    const { db, seen } = dbAnswering([{ organization_id: ORG, invitation_id: INVITATION }])
    expect(await invitationForToken(db, HASH)).toEqual({
      organizationId: ORG,
      invitationId: INVITATION,
    })
    expect(seen[0]?.sql).toContain('core.invitation_for_token($1)')
    expect(seen[0]?.params).toEqual([HASH])
  })

  test('is null when no pending invitation opens', async () => {
    expect(await invitationForToken(dbAnswering([]).db, HASH)).toBeNull()
  })
})
