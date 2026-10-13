import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { createDb, type DbHandle } from './client'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { findTenantIsolationGaps, NON_TENANT_TABLES } from './isolation'
import { organizations } from './schema'
import { withOrganization } from './tenant'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`
const SETTING = 'app.organization_id'
const TENANT_TABLES = ['organizations', 'memberships', 'teams', 'team_members', 'invitations']
const DIRECTORIES = ['membership_directory', 'invitation_directory']
const ONE_PER_USER = 'membership_directory_one_organization_per_user'

let seq = Math.floor(Math.random() * 1e9)
const newId = (prefix: string): string => `${prefix}_${(++seq).toString(16).padStart(32, '0')}`
const newHash = (): string => randomBytes(32).toString('hex')

interface Failure {
  message: string
  code?: string
  constraint?: string
}

/** Run `promise` and describe the error it rejected with, failing if it resolved. */
async function failure(promise: PromiseLike<unknown>): Promise<Failure> {
  try {
    await promise
  } catch (error) {
    const e = error as { message?: string; code?: string; constraint?: string }
    return { message: e.message ?? String(error), code: e.code, constraint: e.constraint }
  }
  throw new Error('expected the statement to be refused, but it succeeded')
}

describe('the core schema: Organizations, memberships, Teams and invitations', () => {
  let owner: Pool
  let core: Pool
  let auth: Pool
  let playbook: Pool
  let handle: DbHandle
  const created = new Set<string>()
  const pids = new WeakMap<PoolClient, number>()

  /** Remember the backend pid, read before a statement blocks the connection. */
  async function track(c: PoolClient): Promise<PoolClient> {
    pids.set(
      c,
      (await c.query<{ pid: number }>('select pg_backend_pid() as pid')).rows[0]?.pid ?? 0
    )
    return c
  }

  /** Run `fn` in one transaction scoped to `organizationId` (or to none), as the given pool's role. */
  async function scoped<T>(
    pool: Pool,
    organizationId: string | null,
    fn: (c: PoolClient) => Promise<T>
  ): Promise<T> {
    const c = await pool.connect()
    try {
      await c.query('begin')
      if (organizationId) {
        await c.query('select set_config($1, $2, true)', [SETTING, organizationId])
      }
      const result = await fn(c)
      await c.query('commit')
      return result
    } catch (error) {
      await c.query('rollback').catch(() => undefined)
      throw error
    } finally {
      c.release()
    }
  }

  const inOrg = <T>(orgId: string, fn: (c: PoolClient) => Promise<T>) => scoped(core, orgId, fn)

  const insertOrganization = (c: PoolClient, orgId: string, region = 'us') =>
    c.query('insert into core.organizations (organization_id, name, region) values ($1, $2, $3)', [
      orgId,
      `Org ${orgId.slice(-6)}`,
      region,
    ])

  const insertMember = async (c: PoolClient, orgId: string, userId: string, role: string) => {
    const id = newId('mem')
    await c.query(
      'insert into core.memberships (id, organization_id, user_id, role) values ($1, $2, $3, $4)',
      [id, orgId, userId, role]
    )
    return id
  }

  /** Create an Organization with its first Owner in one transaction, the way the service does. */
  async function createOrg(region = 'us') {
    const orgId = newId('org')
    const userId = newId('usr')
    created.add(orgId)
    const membershipId = await inOrg(orgId, async (c) => {
      await insertOrganization(c, orgId, region)
      return insertMember(c, orgId, userId, 'owner')
    })
    return { orgId, userId, membershipId }
  }

  const addMember = (orgId: string, role: string, userId = newId('usr')) =>
    inOrg(orgId, async (c) => ({ id: await insertMember(c, orgId, userId, role), userId }))

  const addTeam = (orgId: string, name = `Team ${newId('t').slice(-8)}`) =>
    inOrg(orgId, async (c) => {
      const id = newId('team')
      await c.query('insert into core.teams (id, organization_id, name) values ($1, $2, $3)', [
        id,
        orgId,
        name,
      ])
      return id
    })

  const invite = (
    orgId: string,
    options: { email?: string; role?: string; teamId?: string | null; hash?: string } = {}
  ) =>
    inOrg(orgId, async (c) => {
      const id = newId('inv')
      const hash = options.hash ?? newHash()
      await c.query(
        `insert into core.invitations
           (id, organization_id, email, role, team_id, invited_by_user_id, token_hash, expires_at)
         values ($1, $2, $3, $4, $5, $6, $7, now() + interval '7 days')`,
        [
          id,
          orgId,
          options.email ?? `${id.slice(-8)}@example.com`,
          options.role ?? 'rep',
          options.teamId ?? null,
          newId('usr'),
          hash,
        ]
      )
      return { id, hash }
    })

  const count = async (pool: Pool, orgId: string | null, sqlText: string, values: unknown[] = []) =>
    scoped(pool, orgId, async (c) => Number((await c.query(sqlText, values)).rows[0].n))

  const ownersOf = (orgId: string) =>
    scoped(owner, orgId, async (c) => {
      const owners = await c.query<{ n: string }>(
        "select count(*) as n from core.memberships where organization_id = $1 and role = 'owner'",
        [orgId]
      )
      const counter = await c.query<{ n: number }>(
        'select owner_count as n from core.organizations where organization_id = $1',
        [orgId]
      )
      return { actual: Number(owners.rows[0]?.n), counter: counter.rows[0]?.n }
    })

  const directoryOf = async (orgIds: string[]) =>
    (
      await owner.query<{ user_id: string; organization_id: string }>(
        'select user_id, organization_id from core.membership_directory where organization_id = any($1) order by 1, 2',
        [orgIds]
      )
    ).rows.map((r) => `${r.user_id}>${r.organization_id}`)

  const membersOf = (orgId: string) =>
    scoped(owner, orgId, async (c) =>
      (
        await c.query<{ user_id: string }>(
          'select user_id from core.memberships where organization_id = $1 order by 1',
          [orgId]
        )
      ).rows.map((r) => `${r.user_id}>${orgId}`)
    )

  const invitationDirectoryOf = async (orgIds: string[]) =>
    (
      await owner.query<{ token_hash: string; invitation_id: string; organization_id: string }>(
        'select token_hash, invitation_id, organization_id from core.invitation_directory where organization_id = any($1) order by 1',
        [orgIds]
      )
    ).rows

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 4 })
    core = new Pool({ connectionString: env.core, max: 12 })
    auth = new Pool({ connectionString: env.auth, max: 1 })
    playbook = new Pool({ connectionString: env.playbook, max: 1 })
    await dropStaleTestObjects(owner, env.owner)
    handle = createDb(env.core, { max: 1 })
  })

  afterAll(async () => {
    // Deleting an Organization removes everything under it, last Owner or not.
    for (const orgId of created) {
      await inOrg(orgId, (c) =>
        c.query('delete from core.organizations where organization_id = $1', [orgId])
      ).catch(() => undefined)
    }
    await owner.query(`drop table if exists core.it_naive_${suffix}`)
    await owner.query(`drop function if exists core.it_naive_guard_${suffix}()`)
    await Promise.all([owner.end(), core.end(), auth.end(), playbook.end(), handle.close()])
  })

  describe('tenant isolation', () => {
    test('the migrated database passes the check, and only the two directories need the allowlist', async () => {
      expect(await findTenantIsolationGaps(handle.db)).toEqual([])
      expect([...NON_TENANT_TABLES].sort()).toEqual(
        DIRECTORIES.map((name) => `core.${name}`).sort()
      )
      const without = await findTenantIsolationGaps(handle.db, [])
      expect(
        without
          .filter((gap) => gap.schema === 'core' && !gap.table.startsWith('it_'))
          .map((g) => g.table)
          .sort()
      ).toEqual([...DIRECTORIES].sort())
    })

    describe('a second Organization cannot read or write any tenant table', () => {
      let a: { orgId: string; userId: string; membershipId: string }
      let b: { orgId: string; userId: string; membershipId: string }
      const updates: Record<string, string> = {
        organizations: 'set name = name',
        memberships: 'set role = role',
        teams: 'set name = name',
        team_members: 'set created_at = created_at',
        invitations: 'set updated_at = updated_at',
      }

      beforeAll(async () => {
        a = await createOrg()
        b = await createOrg()
        for (const x of [a, b]) {
          const rep = await addMember(x.orgId, 'rep')
          const teamId = await addTeam(x.orgId)
          await inOrg(x.orgId, (c) =>
            c.query(
              'insert into core.team_members (organization_id, team_id, membership_id) values ($1, $2, $3)',
              [x.orgId, teamId, rep.id]
            )
          )
          await invite(x.orgId)
        }
      })

      /** An insert of one row for `orgId`; ids need not exist, because row-level security is checked first. */
      const insertFor = (table: string, orgId: string): [string, unknown[]] =>
        ({
          organizations: [
            "insert into core.organizations (organization_id, name, region) values ($1, 'x', 'us')",
            [orgId],
          ],
          memberships: [
            'insert into core.memberships (id, organization_id, user_id, role) values ($1, $2, $3, $4)',
            [newId('mem'), orgId, newId('usr'), 'rep'],
          ],
          teams: [
            "insert into core.teams (id, organization_id, name) values ($1, $2, 'smuggled')",
            [newId('team'), orgId],
          ],
          team_members: [
            'insert into core.team_members (organization_id, team_id, membership_id) values ($1, $2, $3)',
            [orgId, newId('team'), newId('mem')],
          ],
          invitations: [
            "insert into core.invitations (id, organization_id, email, role, invited_by_user_id, token_hash, expires_at) values ($1, $2, 'x@example.com', 'rep', $3, $4, now() + interval '1 day')",
            [newId('inv'), orgId, newId('usr'), newHash()],
          ],
        })[table] as [string, unknown[]]

      test.each(TENANT_TABLES)(
        '%s: no Organization set shows nothing and refuses inserts',
        async (table) => {
          expect(await count(core, null, `select count(*) as n from core.${table}`)).toBe(0)
          const [sql, values] = insertFor(table, a.orgId)
          const refused = await failure(scoped(core, null, (c) => c.query(sql, values)))
          expect(refused.message).toContain('row-level security')
        }
      )

      test.each(TENANT_TABLES)('%s: B cannot insert a row for A', async (table) => {
        const [sql, values] = insertFor(table, a.orgId)
        const refused = await failure(scoped(core, b.orgId, (c) => c.query(sql, values)))
        expect(refused.message).toContain('row-level security')
      })

      test.each(TENANT_TABLES)('%s: B cannot read A rows', async (table) => {
        const sql = `select count(*) as n from core.${table} where organization_id = $1`
        expect(await count(core, a.orgId, sql, [a.orgId])).toBeGreaterThan(0)
        expect(await count(core, b.orgId, sql, [a.orgId])).toBe(0)
      })

      test.each(TENANT_TABLES)('%s: B cannot update or delete A rows', async (table) => {
        const sql = `select count(*) as n from core.${table} where organization_id = $1`
        const before = await count(core, a.orgId, sql, [a.orgId])
        const touched = await scoped(core, b.orgId, async (c) => {
          const upd = await c.query(
            `update core.${table} ${updates[table]} where organization_id = $1`,
            [a.orgId]
          )
          const del = await c.query(`delete from core.${table} where organization_id = $1`, [
            a.orgId,
          ])
          return [upd.rowCount, del.rowCount]
        })
        expect(touched).toEqual([0, 0])
        expect(await count(core, a.orgId, sql, [a.orgId])).toBe(before)
      })

      test.each([
        ['closeline_auth', () => auth],
        ['closeline_playbook', () => playbook],
      ])('%s is refused on every core table', async (_role, pool) => {
        for (const table of [...TENANT_TABLES, ...DIRECTORIES]) {
          const refused = await failure(
            scoped(pool(), a.orgId, (c) => c.query(`select * from core.${table}`))
          )
          expect(refused.message).toContain('permission denied for schema core')
        }
      })

      test('the typed schema reads through withOrganization like any tenant table', async () => {
        const found = await withOrganization(handle.db, a.orgId, (tx) =>
          tx.select().from(organizations)
        )
        expect(found.map((row) => row.organizationId)).toEqual([a.orgId])
        expect(found[0]?.ownerCount).toBe(1)
      })
    })
  })

  describe('shapes and the fixed Region', () => {
    test.each([
      [
        'an unknown Region',
        "insert into core.organizations (organization_id, name, region) values ($1, 'x', 'asia')",
        'organizations_region_known',
      ],
      [
        'a blank name',
        "insert into core.organizations (organization_id, name, region) values ($1, '   ', 'us')",
        'organizations_name_shape',
      ],
      [
        'an unknown status',
        "insert into core.organizations (organization_id, name, region, status) values ($1, 'x', 'us', 'gone')",
        'organizations_status_known',
      ],
    ])('an Organization with %s is refused', async (_name, sql, constraint) => {
      const orgId = newId('org')
      const refused = await failure(inOrg(orgId, (c) => c.query(sql, [orgId])))
      expect(refused.constraint).toBe(constraint)
    })

    test('an Organization id that is not org_ and 32 hex characters is refused', async () => {
      const bad = 'org_NOTHEX'
      const refused = await failure(
        scoped(core, bad, (c) =>
          c.query(
            "insert into core.organizations (organization_id, name, region) values ($1, 'x', 'us')",
            [bad]
          )
        )
      )
      expect(refused.constraint).toBe('organizations_id_shape')
    })

    test.each([
      [
        'memberships_user_id_shape',
        'insert into core.memberships (id, organization_id, user_id, role) values ($1, $2, $3, $4)',
        (o: string) => [newId('mem'), o, 'usr_1', 'rep'],
      ],
      [
        'memberships_id_shape',
        'insert into core.memberships (id, organization_id, user_id, role) values ($1, $2, $3, $4)',
        (o: string) => ['mem_1', o, newId('usr'), 'rep'],
      ],
      [
        'memberships_role_known',
        'insert into core.memberships (id, organization_id, user_id, role) values ($1, $2, $3, $4)',
        (o: string) => [newId('mem'), o, newId('usr'), 'boss'],
      ],
      [
        'teams_id_shape',
        'insert into core.teams (id, organization_id, name) values ($1, $2, $3)',
        (o: string) => ['team_1', o, 'x'],
      ],
      [
        'teams_name_shape',
        'insert into core.teams (id, organization_id, name) values ($1, $2, $3)',
        (o: string) => [newId('team'), o, ' '],
      ],
    ])('%s is enforced', async (constraint, sql, values) => {
      const { orgId } = await createOrg()
      const refused = await failure(inOrg(orgId, (c) => c.query(sql, values(orgId))))
      expect(refused.constraint).toBe(constraint)
    })

    test('the Region is fixed at creation: the database refuses a change, even to its owner', async () => {
      const { orgId } = await createOrg('eu')
      const changed = await failure(
        scoped(owner, orgId, (c) =>
          c.query("update core.organizations set region = 'us' where organization_id = $1", [orgId])
        )
      )
      expect(changed.message).toContain('core.region_immutable')
      expect(changed.constraint).toBe('organizations_region_immutable')
      const asService = await failure(
        inOrg(orgId, (c) =>
          c.query("update core.organizations set region = 'us' where organization_id = $1", [orgId])
        )
      )
      expect(asService.message).toContain('permission denied')
      const read = await scoped(owner, orgId, (c) =>
        c.query('select region from core.organizations where organization_id = $1', [orgId])
      )
      expect(read.rows[0].region).toBe('eu')
    })

    test('the service can rename an Organization and change its status', async () => {
      const { orgId } = await createOrg()
      await inOrg(orgId, (c) =>
        c.query(
          "update core.organizations set name = 'Renamed', status = 'suspended' where organization_id = $1",
          [orgId]
        )
      )
      const row = await scoped(owner, orgId, (c) =>
        c.query('select name, status from core.organizations where organization_id = $1', [orgId])
      )
      expect(row.rows[0]).toEqual({ name: 'Renamed', status: 'suspended' })
    })
  })

  describe('one Organization per user', () => {
    test('a second membership for the same user in another Organization is refused by name', async () => {
      const a = await createOrg()
      const b = await createOrg()
      const refused = await failure(addMember(b.orgId, 'rep', a.userId))
      expect(refused.constraint).toBe(ONE_PER_USER)
      expect(refused.code).toBe('23505')
      expect(await directoryOf([a.orgId, b.orgId])).toEqual(
        [`${a.userId}>${a.orgId}`, `${b.userId}>${b.orgId}`].sort()
      )
    })

    test('creating an Organization for a user who already belongs to one is refused whole', async () => {
      const a = await createOrg()
      const orgId = newId('org')
      created.add(orgId)
      const refused = await failure(
        inOrg(orgId, async (c) => {
          await insertOrganization(c, orgId)
          await insertMember(c, orgId, a.userId, 'owner')
        })
      )
      expect(refused.constraint).toBe(ONE_PER_USER)
      expect(await count(owner, orgId, 'select count(*) as n from core.organizations')).toBe(0)
    })

    test('removing the first membership frees the user to join another Organization', async () => {
      const a = await createOrg()
      const b = await createOrg()
      const rep = await addMember(a.orgId, 'rep')
      expect((await failure(addMember(b.orgId, 'rep', rep.userId))).constraint).toBe(ONE_PER_USER)
      await inOrg(a.orgId, (c) => c.query('delete from core.memberships where id = $1', [rep.id]))
      await addMember(b.orgId, 'rep', rep.userId)
      expect(await directoryOf([a.orgId, b.orgId])).toContain(`${rep.userId}>${b.orgId}`)
      expect(await directoryOf([a.orgId])).not.toContain(`${rep.userId}>${a.orgId}`)
    })

    test('moving a membership to a user who belongs elsewhere is refused', async () => {
      const a = await createOrg()
      const b = await createOrg()
      const rep = await addMember(a.orgId, 'rep')
      const refused = await failure(
        inOrg(a.orgId, (c) =>
          c.query('update core.memberships set user_id = $1 where id = $2', [b.userId, rep.id])
        )
      )
      expect(refused.constraint).toBe(ONE_PER_USER)
    })

    test('two transactions adding the same user to different Organizations: one wins', async () => {
      const a = await createOrg()
      const b = await createOrg()
      const userId = newId('usr')
      const c1 = await track(await core.connect())
      const c2 = await track(await core.connect())
      try {
        for (const [c, orgId] of [
          [c1, a.orgId],
          [c2, b.orgId],
        ] as const) {
          await c.query('begin')
          await c.query('select set_config($1, $2, true)', [SETTING, orgId])
        }
        await insertMember(c1, a.orgId, userId, 'rep')
        const second = insertMember(c2, b.orgId, userId, 'rep').then(
          () => null,
          (e: { constraint?: string }) => e.constraint
        )
        await waitUntilBlocked(c2)
        await c1.query('commit')
        expect(await second).toBe(ONE_PER_USER)
        await c2.query('rollback')
      } finally {
        c1.release()
        c2.release()
      }
      expect(await directoryOf([a.orgId, b.orgId])).toContain(`${userId}>${a.orgId}`)
      expect(await directoryOf([b.orgId])).not.toContain(`${userId}>${b.orgId}`)
    })
  })

  describe('memberships, Teams and invitations', () => {
    test('one membership per user per Organization', async () => {
      const { orgId, userId } = await createOrg()
      const refused = await failure(addMember(orgId, 'rep', userId))
      expect(refused.constraint).toBe('memberships_organization_user_key')
    })

    test('a Team member must be a member of the same Organization, by composite foreign key', async () => {
      const a = await createOrg()
      const b = await createOrg()
      const teamA = await addTeam(a.orgId)
      const teamB = await addTeam(b.orgId)
      const crossMember = await failure(
        inOrg(a.orgId, (c) =>
          c.query(
            'insert into core.team_members (organization_id, team_id, membership_id) values ($1, $2, $3)',
            [a.orgId, teamA, b.membershipId]
          )
        )
      )
      expect(crossMember.constraint).toBe('team_members_membership_fk')
      const crossTeam = await failure(
        inOrg(a.orgId, (c) =>
          c.query(
            'insert into core.team_members (organization_id, team_id, membership_id) values ($1, $2, $3)',
            [a.orgId, teamB, a.membershipId]
          )
        )
      )
      expect(crossTeam.constraint).toBe('team_members_team_fk')
      await inOrg(a.orgId, (c) =>
        c.query(
          'insert into core.team_members (organization_id, team_id, membership_id) values ($1, $2, $3)',
          [a.orgId, teamA, a.membershipId]
        )
      )
    })

    test('an invitation can name only a Team of its own Organization', async () => {
      const a = await createOrg()
      const b = await createOrg()
      const teamB = await addTeam(b.orgId)
      const refused = await failure(invite(a.orgId, { teamId: teamB }))
      expect(refused.constraint).toBe('invitations_team_fk')
    })

    test('Team names are unique within an Organization regardless of case, and per Organization', async () => {
      const a = await createOrg()
      const b = await createOrg()
      await addTeam(a.orgId, 'Enterprise East')
      expect((await failure(addTeam(a.orgId, 'ENTERPRISE east'))).constraint).toBe(
        'teams_organization_name_key'
      )
      await addTeam(b.orgId, 'Enterprise East')
    })

    test('removing a membership or a Team removes its Team rows; a deleted Team only clears an invitation', async () => {
      const { orgId } = await createOrg()
      const rep = await addMember(orgId, 'rep')
      const team = await addTeam(orgId)
      const invitation = await invite(orgId, { teamId: team })
      await inOrg(orgId, (c) =>
        c.query('insert into core.team_members values ($1, $2, $3)', [orgId, team, rep.id])
      )
      await inOrg(orgId, (c) => c.query('delete from core.memberships where id = $1', [rep.id]))
      expect(await count(core, orgId, 'select count(*) as n from core.team_members')).toBe(0)
      const again = await addMember(orgId, 'manager')
      await inOrg(orgId, (c) =>
        c.query('insert into core.team_members values ($1, $2, $3)', [orgId, team, again.id])
      )
      await inOrg(orgId, (c) => c.query('delete from core.teams where id = $1', [team]))
      expect(await count(core, orgId, 'select count(*) as n from core.team_members')).toBe(0)
      const row = await inOrg(orgId, (c) =>
        c.query('select team_id, organization_id, state from core.invitations where id = $1', [
          invitation.id,
        ])
      )
      expect(row.rows[0]).toEqual({ team_id: null, organization_id: orgId, state: 'pending' })
    })

    test.each([
      ['the raw token', { hash: 'sometoken' }, 'invitations_token_hash_shape'],
      ['an upper-case hash', { hash: newHash().toUpperCase() }, 'invitations_token_hash_shape'],
      ['an upper-case email', { email: 'Ann@Example.com' }, 'invitations_email_shape'],
      ['an email with no @', { email: 'ann.example.com' }, 'invitations_email_shape'],
      ['an unknown role', { role: 'boss' }, 'invitations_role_known'],
    ])('an invitation with %s is refused', async (_name, options, constraint) => {
      const { orgId } = await createOrg()
      expect((await failure(invite(orgId, options))).constraint).toBe(constraint)
    })

    test('a token hash is unique across Organizations', async () => {
      const a = await createOrg()
      const b = await createOrg()
      const { hash } = await invite(a.orgId)
      expect((await failure(invite(b.orgId, { hash }))).constraint).toBe(
        'invitations_token_hash_key'
      )
    })

    test('one pending invitation per email per Organization', async () => {
      const a = await createOrg()
      const b = await createOrg()
      const first = await invite(a.orgId, { email: 'new@example.com' })
      expect((await failure(invite(a.orgId, { email: 'new@example.com' }))).constraint).toBe(
        'invitations_pending_email_key'
      )
      await invite(b.orgId, { email: 'new@example.com' })
      await inOrg(a.orgId, (c) =>
        c.query("update core.invitations set state = 'revoked', revoked_at = now() where id = $1", [
          first.id,
        ])
      )
      await invite(a.orgId, { email: 'new@example.com' })
    })

    test('state and its timestamps agree, and accepted or revoked are final', async () => {
      const { orgId } = await createOrg()
      const { id } = await invite(orgId)
      const noTime = await failure(
        inOrg(orgId, (c) =>
          c.query("update core.invitations set state = 'accepted' where id = $1", [id])
        )
      )
      expect(noTime.constraint).toBe('invitations_state_shape')
      await inOrg(orgId, (c) =>
        c.query(
          "update core.invitations set state = 'accepted', accepted_at = now() where id = $1",
          [id]
        )
      )
      const reopen = await failure(
        inOrg(orgId, (c) =>
          c.query(
            "update core.invitations set state = 'pending', accepted_at = null where id = $1",
            [id]
          )
        )
      )
      expect(reopen.constraint).toBe('invitations_state_final')
      const swap = await failure(
        inOrg(orgId, (c) =>
          c.query(
            "update core.invitations set state = 'revoked', revoked_at = now(), accepted_at = null where id = $1",
            [id]
          )
        )
      )
      expect(swap.constraint).toBe('invitations_state_final')
    })

    test('an invitation must expire after it was created', async () => {
      const { orgId } = await createOrg()
      const refused = await failure(
        inOrg(orgId, (c) =>
          c.query(
            `insert into core.invitations (id, organization_id, email, role, invited_by_user_id, token_hash, expires_at)
             values ($1, $2, 'late@example.com', 'rep', $3, $4, now() - interval '1 day')`,
            [newId('inv'), orgId, newId('usr'), newHash()]
          )
        )
      )
      expect(refused.constraint).toBe('invitations_expiry_after_creation')
    })
  })

  describe('an Organization always has at least one Owner', () => {
    test('an Organization and its first Owner are created in one transaction', async () => {
      const { orgId } = await createOrg()
      expect(await ownersOf(orgId)).toEqual({ actual: 1, counter: 1 })
    })

    test('an Organization with no Owner cannot be committed', async () => {
      const orgId = newId('org')
      created.add(orgId)
      const refused = await failure(inOrg(orgId, (c) => insertOrganization(c, orgId)))
      expect(refused.message).toContain('core.owner_required')
      expect(await count(owner, orgId, 'select count(*) as n from core.organizations')).toBe(0)
    })

    test('a rolled-back creation leaves no Organization, membership or directory row', async () => {
      const orgId = newId('org')
      const userId = newId('usr')
      created.add(orgId)
      const c = await core.connect()
      try {
        await c.query('begin')
        await c.query('select set_config($1, $2, true)', [SETTING, orgId])
        await insertOrganization(c, orgId)
        await insertMember(c, orgId, userId, 'owner')
        const inside = await c.query(
          'select user_id from core.membership_directory where user_id = $1',
          [userId]
        )
        expect(inside.rows).toHaveLength(1)
        await c.query('rollback')
      } finally {
        c.release()
      }
      expect(await directoryOf([orgId])).toEqual([])
      expect(await count(owner, orgId, 'select count(*) as n from core.organizations')).toBe(0)
    })

    test('the service cannot write the owner count, and a new Organization starts at zero', async () => {
      const { orgId } = await createOrg()
      const refused = await failure(
        inOrg(orgId, (c) =>
          c.query('update core.organizations set owner_count = 9 where organization_id = $1', [
            orgId,
          ])
        )
      )
      expect(refused.message).toContain('permission denied')
      const other = newId('org')
      created.add(other)
      await inOrg(other, async (c) => {
        await c.query(
          "insert into core.organizations (organization_id, name, region, owner_count) values ($1, 'x', 'us', 5)",
          [other]
        )
        const start = await c.query(
          'select owner_count from core.organizations where organization_id = $1',
          [other]
        )
        expect(start.rows[0].owner_count).toBe(0)
        await insertMember(c, other, newId('usr'), 'owner')
      })
      expect(await ownersOf(other)).toEqual({ actual: 1, counter: 1 })
    })

    test('the last Owner can be neither removed nor demoted', async () => {
      const { orgId, membershipId } = await createOrg()
      const removed = await failure(
        inOrg(orgId, (c) => c.query('delete from core.memberships where id = $1', [membershipId]))
      )
      expect(removed.message).toContain('core.last_owner')
      expect(removed.constraint).toBe('organizations_owner_required')
      const demoted = await failure(
        inOrg(orgId, (c) =>
          c.query("update core.memberships set role = 'admin' where id = $1", [membershipId])
        )
      )
      expect(demoted.message).toContain('core.last_owner')
      expect(await ownersOf(orgId)).toEqual({ actual: 1, counter: 1 })
    })

    test('with a second Owner either can go; ownership transfers by promoting before demoting', async () => {
      const { orgId, membershipId } = await createOrg()
      const second = await addMember(orgId, 'admin')
      await inOrg(orgId, (c) =>
        c.query("update core.memberships set role = 'owner' where id = $1", [second.id])
      )
      expect(await ownersOf(orgId)).toEqual({ actual: 2, counter: 2 })
      await inOrg(orgId, (c) =>
        c.query('delete from core.memberships where id = $1', [membershipId])
      )
      expect(await ownersOf(orgId)).toEqual({ actual: 1, counter: 1 })
      const third = await addMember(orgId, 'owner')
      await inOrg(orgId, (c) =>
        c.query("update core.memberships set role = 'rep' where id = $1", [second.id])
      )
      expect(await ownersOf(orgId)).toEqual({ actual: 1, counter: 1 })
      expect(third.id).toBeTruthy()
    })

    test('deleting the Organization removes its last Owner with it', async () => {
      const { orgId, userId } = await createOrg()
      await addTeam(orgId)
      await invite(orgId)
      await inOrg(orgId, (c) =>
        c.query('delete from core.organizations where organization_id = $1', [orgId])
      )
      expect(await directoryOf([orgId])).toEqual([])
      expect(await invitationDirectoryOf([orgId])).toEqual([])
      expect(await directoryOf([orgId])).not.toContain(userId)
    })

    describe('under concurrent transactions', () => {
      async function ownersOrg(n: number) {
        const first = await createOrg()
        const ids = [first.membershipId]
        for (let i = 1; i < n; i++) {
          ids.push((await addMember(first.orgId, 'owner')).id)
        }
        return { orgId: first.orgId, ids }
      }

      async function open(orgId: string, isolation = 'read committed'): Promise<PoolClient> {
        const c = await track(await core.connect())
        await c.query(`begin isolation level ${isolation}`)
        await c.query('select set_config($1, $2, true)', [SETTING, orgId])
        return c
      }

      const demote = (c: PoolClient, id: string) =>
        c.query("update core.memberships set role = 'rep' where id = $1", [id])
      const remove = (c: PoolClient, id: string) =>
        c.query('delete from core.memberships where id = $1', [id])

      test.each([
        ['two demotions', demote, demote],
        ['two removals', remove, remove],
        ['a demotion and a removal', demote, remove],
      ])(
        '%s of the last two Owners: the second waits, then is refused',
        async (_name, first, second) => {
          const { orgId, ids } = await ownersOrg(2)
          const c1 = await open(orgId)
          const c2 = await open(orgId)
          try {
            await first(c1, ids[0] as string)
            const pending = second(c2, ids[1] as string).then(
              () => 'allowed',
              (e: Error) => e.message
            )
            await waitUntilBlocked(c2)
            await c1.query('commit')
            expect(await pending).toContain('core.last_owner')
            await c2.query('rollback')
          } finally {
            c1.release()
            c2.release()
          }
          expect(await ownersOf(orgId)).toEqual({ actual: 1, counter: 1 })
        }
      )

      test('REPEATABLE READ cannot slip past on a stale snapshot: it fails to serialise', async () => {
        const { orgId, ids } = await ownersOrg(2)
        const c1 = await open(orgId)
        const c2 = await open(orgId, 'repeatable read')
        try {
          await c2.query('select count(*) from core.memberships') // takes the snapshot
          await demote(c1, ids[0] as string)
          await c1.query('commit')
          const refused = await failure(demote(c2, ids[1] as string))
          expect(refused.code).toBe('40001')
          await c2.query('rollback')
        } finally {
          c1.release()
          c2.release()
        }
        expect(await ownersOf(orgId)).toEqual({ actual: 1, counter: 1 })
      })

      test('with three Owners two concurrent demotions both succeed', async () => {
        const { orgId, ids } = await ownersOrg(3)
        const c1 = await open(orgId)
        const c2 = await open(orgId)
        try {
          await demote(c1, ids[0] as string)
          const second = demote(c2, ids[1] as string)
          await waitUntilBlocked(c2)
          await c1.query('commit')
          await second
          await c2.query('commit')
        } finally {
          c1.release()
          c2.release()
        }
        expect(await ownersOf(orgId)).toEqual({ actual: 1, counter: 1 })
      })

      test('five rounds of four racing demotions among four Owners leave exactly one', async () => {
        for (let round = 0; round < 5; round++) {
          const { orgId, ids } = await ownersOrg(4)
          const outcomes = await Promise.all(
            ids.map(async (id) => {
              const c = await open(orgId)
              try {
                await demote(c, id)
                await c.query('commit')
                return 'ok'
              } catch (error) {
                await c.query('rollback').catch(() => undefined)
                return (error as Error).message.includes('core.last_owner') ? 'refused' : 'other'
              } finally {
                c.release()
              }
            })
          )
          expect(outcomes.filter((o) => o === 'ok')).toHaveLength(3)
          expect(outcomes.filter((o) => o === 'refused')).toHaveLength(1)
          expect(await ownersOf(orgId)).toEqual({ actual: 1, counter: 1 })
        }
      })

      test('control: a plain count-based trigger lets the same race through, so the harness can see it', async () => {
        const table = `core.it_naive_${suffix}`
        await owner.query(`create table ${table} (id int primary key, role text not null)`)
        await owner.query(`insert into ${table} values (1, 'owner'), (2, 'owner')`)
        await owner.query(`
          create function core.it_naive_guard_${suffix}() returns trigger language plpgsql as $$
          begin
            if (select count(*) from ${table} where role = 'owner') < 1 then
              raise exception 'naive: no owner';
            end if;
            return null;
          end $$`)
        await owner.query(
          `create trigger guard after update on ${table} for each row execute function core.it_naive_guard_${suffix}()`
        )
        const c1 = await owner.connect()
        const c2 = await owner.connect()
        try {
          await c1.query('begin')
          await c2.query('begin')
          await c1.query(`update ${table} set role = 'rep' where id = 1`)
          await c2.query(`update ${table} set role = 'rep' where id = 2`)
          await c1.query('commit')
          await c2.query('commit')
        } finally {
          c1.release()
          c2.release()
        }
        const left = await owner.query(`select count(*) as n from ${table} where role = 'owner'`)
        expect(Number(left.rows[0].n)).toBe(0)
      })
    })
  })

  describe('the directories cannot drift from their tenant tables', () => {
    test('membership_directory follows insert, update, delete and cascade', async () => {
      const a = await createOrg()
      const b = await createOrg()
      const ids = [a.orgId, b.orgId]
      const inStep = async () =>
        expect(await directoryOf(ids)).toEqual(
          [...(await membersOf(a.orgId)), ...(await membersOf(b.orgId))].sort()
        )
      await inStep()
      const rep = await addMember(a.orgId, 'rep')
      await addMember(b.orgId, 'manager')
      await inStep()
      await inOrg(a.orgId, (c) =>
        c.query("update core.memberships set role = 'admin' where id = $1", [rep.id])
      )
      await inStep()
      const moved = newId('usr')
      await inOrg(a.orgId, (c) =>
        c.query('update core.memberships set user_id = $1 where id = $2', [moved, rep.id])
      )
      await inStep()
      expect(await directoryOf(ids)).not.toContain(`${rep.userId}>${a.orgId}`)
      await inOrg(a.orgId, (c) => c.query('delete from core.memberships where id = $1', [rep.id]))
      await inStep()
      await inOrg(b.orgId, (c) =>
        c.query('delete from core.organizations where organization_id = $1', [b.orgId])
      )
      expect(await directoryOf([b.orgId])).toEqual([])
      expect(await directoryOf([a.orgId])).toEqual(await membersOf(a.orgId))
    })

    test('membership_directory follows a rollback, a rolled-back savepoint and a failed statement', async () => {
      const { orgId } = await createOrg()
      const before = await directoryOf([orgId])
      const userId = newId('usr')
      const c = await core.connect()
      try {
        await c.query('begin')
        await c.query('select set_config($1, $2, true)', [SETTING, orgId])
        await insertMember(c, orgId, userId, 'rep')
        await c.query('savepoint s')
        const other = newId('usr')
        await insertMember(c, orgId, other, 'rep')
        await c.query('rollback to savepoint s')
        const failed = await failure(insertMember(c, orgId, userId, 'rep'))
        expect(failed.constraint).toBe('memberships_organization_user_key')
        await c.query('rollback to savepoint s')
        const inside = await c.query(
          'select user_id from core.membership_directory where organization_id = $1 order by 1',
          [orgId]
        )
        expect(inside.rows.map((r) => r.user_id)).toContain(userId)
        expect(inside.rows.map((r) => r.user_id)).not.toContain(other)
        await c.query('rollback')
      } finally {
        c.release()
      }
      expect(await directoryOf([orgId])).toEqual(before)
    })

    test('invitation_directory follows insert, token change, state change, delete and cascade', async () => {
      const { orgId } = await createOrg()
      const one = await invite(orgId)
      const two = await invite(orgId)
      const expectDirectory = async (expected: [string, string][]) =>
        expect(
          (await invitationDirectoryOf([orgId])).map((r) => [r.token_hash, r.invitation_id])
        ).toEqual(expected.sort())
      await expectDirectory([
        [one.hash, one.id],
        [two.hash, two.id],
      ])
      const rotated = newHash()
      await inOrg(orgId, (c) =>
        c.query('update core.invitations set token_hash = $1 where id = $2', [rotated, one.id])
      )
      await expectDirectory([
        [rotated, one.id],
        [two.hash, two.id],
      ])
      await inOrg(orgId, (c) =>
        c.query("update core.invitations set state = 'revoked', revoked_at = now() where id = $1", [
          two.id,
        ])
      )
      await expectDirectory([
        [rotated, one.id],
        [two.hash, two.id],
      ])
      await inOrg(orgId, (c) => c.query('delete from core.invitations where id = $1', [two.id]))
      await expectDirectory([[rotated, one.id]])
      const c = await core.connect()
      try {
        await c.query('begin')
        await c.query('select set_config($1, $2, true)', [SETTING, orgId])
        await c.query(
          `insert into core.invitations (id, organization_id, email, role, invited_by_user_id, token_hash, expires_at)
           values ($1, $2, 'rb@example.com', 'rep', $3, $4, now() + interval '1 day')`,
          [newId('inv'), orgId, newId('usr'), newHash()]
        )
        await c.query('rollback')
      } finally {
        c.release()
      }
      await expectDirectory([[rotated, one.id]])
      await inOrg(orgId, (cc) =>
        cc.query('delete from core.organizations where organization_id = $1', [orgId])
      )
      expect(await invitationDirectoryOf([orgId])).toEqual([])
    })

    test.each(DIRECTORIES)(
      'the service role can read %s with no Organization set, and write nothing',
      async (table) => {
        const sample = (await owner.query(`select * from core.${table} limit 1`)).rows[0]
        expect(sample).toBeDefined()
        expect(await count(core, null, `select count(*) as n from core.${table}`)).toBeGreaterThan(
          0
        )
        const key = table === 'membership_directory' ? 'user_id' : 'token_hash'
        const statements = [
          `insert into core.${table} select * from core.${table} limit 0`,
          `update core.${table} set organization_id = organization_id`,
          `delete from core.${table}`,
          `truncate core.${table}`,
        ]
        for (const statement of statements) {
          const refused = await failure(scoped(core, null, (c) => c.query(statement)))
          expect(refused.message).toContain('permission denied for table')
        }
        const forged =
          table === 'membership_directory'
            ? "insert into core.membership_directory values ('usr_" +
              '0'.repeat(32) +
              "', 'org_" +
              '0'.repeat(32) +
              "')"
            : `insert into core.invitation_directory values ('${'0'.repeat(64)}', 'org_${'0'.repeat(32)}', 'inv_${'0'.repeat(32)}')`
        expect((await failure(scoped(core, null, (c) => c.query(forged)))).message).toContain(
          'permission denied'
        )
        expect(key).toBeTruthy()
      }
    )

    test('the sync functions cannot be called directly', async () => {
      for (const fn of [
        'sync_membership_directory',
        'sync_invitation_directory',
        'track_owner_count',
      ]) {
        const refused = await failure(scoped(core, null, (c) => c.query(`select core.${fn}()`)))
        expect(refused.message).toMatch(
          /trigger functions can only be called as triggers|permission denied/
        )
      }
    })

    test('a directory holds the mapping and nothing else', async () => {
      const columns = await owner.query<{ table_name: string; column_name: string }>(
        `select table_name, column_name from information_schema.columns
          where table_schema = 'core' and table_name = any($1) order by table_name, ordinal_position`,
        [DIRECTORIES]
      )
      expect(columns.rows.map((r) => `${r.table_name}.${r.column_name}`)).toEqual([
        'invitation_directory.token_hash',
        'invitation_directory.organization_id',
        'invitation_directory.invitation_id',
        'membership_directory.user_id',
        'membership_directory.organization_id',
      ])
    })

    test('the sign-in flow: read the directory, open the Organization, read the row under row-level security', async () => {
      const { orgId, userId } = await createOrg()
      const found = await scoped(core, null, (c) =>
        c.query('select organization_id from core.membership_directory where user_id = $1', [
          userId,
        ])
      )
      expect(found.rows).toEqual([{ organization_id: orgId }])
      const role = await inOrg(found.rows[0].organization_id, (c) =>
        c.query('select role from core.memberships where user_id = $1', [userId])
      )
      expect(role.rows).toEqual([{ role: 'owner' }])

      const { hash, id } = await invite(orgId)
      const token = await scoped(core, null, (c) =>
        c.query(
          'select organization_id, invitation_id from core.invitation_directory where token_hash = $1',
          [hash]
        )
      )
      expect(token.rows).toEqual([{ organization_id: orgId, invitation_id: id }])
    })
  })

  describe('every list is a keyset query answered by an index', () => {
    let orgId: string
    let teamId: string
    let membershipId: string

    beforeAll(async () => {
      const first = await createOrg()
      orgId = first.orgId
      membershipId = first.membershipId
      teamId = await addTeam(orgId)
      const otherTeam = await addTeam(orgId)
      // Enough rows, and fresh statistics, for the planner to choose on cost as it would in production.
      await scoped(owner, orgId, async (c) => {
        await c.query(
          `insert into core.memberships (id, organization_id, user_id, role)
           select 'mem_' || md5('m' || n || $1), $1, 'usr_' || md5('u' || n || $1), 'rep'
             from generate_series(1, 2000) n`,
          [orgId]
        )
        await c.query(
          `insert into core.team_members (organization_id, team_id, membership_id)
           select $1, case when n % 2 = 0 then $2 else $3 end, id
             from (select id, row_number() over (order by id) n from core.memberships) m`,
          [orgId, teamId, otherTeam]
        )
      })
      // Other Organizations' members, so that one Organization's share of the table is small.
      for (let i = 0; i < 20; i++) {
        const other = await createOrg()
        await scoped(owner, other.orgId, (c) =>
          c.query(
            `insert into core.memberships (id, organization_id, user_id, role)
             select 'mem_' || md5('m' || n || $1), $1, 'usr_' || md5('u' || n || $1), 'rep'
               from generate_series(1, 100) n`,
            [other.orgId]
          )
        )
      }
      await owner.query('analyze core.memberships')
      await owner.query('analyze core.team_members')
    })

    const A = () => `'${orgId}'`
    const cases: [string, () => string, string][] = [
      [
        'members of an Organization',
        () =>
          `select id from core.memberships where organization_id = ${A()} and id > 'mem_0' order by id limit 50`,
        'memberships_organization_id_id_key',
      ],
      [
        'Teams of an Organization',
        () =>
          `select id from core.teams where organization_id = ${A()} and name_key > 'a' order by name_key limit 50`,
        'teams_organization_name_key',
      ],
      [
        'members of a Team',
        () =>
          `select membership_id from core.team_members where organization_id = ${A()} and team_id = '${teamId}' and membership_id > 'mem_0' order by membership_id limit 50`,
        'team_members_pkey',
      ],
      [
        'Teams of a membership',
        () =>
          `select team_id from core.team_members where organization_id = ${A()} and membership_id = '${membershipId}' and team_id > 'team_0' order by team_id limit 50`,
        'team_members_membership_idx',
      ],
      [
        'pending invitations',
        () =>
          `select id from core.invitations where organization_id = ${A()} and state = 'pending' and (created_at, id) > ('2020-01-01', 'inv_0') order by created_at, id limit 50`,
        'invitations_pending_list_idx',
      ],
    ]

    test.each(cases)('%s', async (_name, query, index) => {
      const plan = await inOrg(orgId, async (c) => {
        await c.query('set local enable_seqscan = off')
        return (await c.query(`explain (format json) ${query()}`)).rows[0]['QUERY PLAN']
      })
      const text = JSON.stringify(plan)
      expect(text).toContain(`"Index Name":"${index}"`)
      expect(text).not.toContain('"Node Type":"Sort"')
    })
  })

  /** Wait until the client's backend is waiting on a lock another transaction holds. */
  async function waitUntilBlocked(client: PoolClient): Promise<void> {
    const pid = pids.get(client)
    for (let i = 0; i < 100; i++) {
      const waiting = await owner.query('select 1 from pg_locks where pid = $1 and not granted', [
        pid,
      ])
      if (waiting.rowCount) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    throw new Error('the second transaction never waited for the first')
  }
})
