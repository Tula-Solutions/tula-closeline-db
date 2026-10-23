import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { createDb, type DbHandle } from './client'
import { invitationForToken, organizationOfUser } from './core-lookups'
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
/** The tables outside row-level security that no service role holds any privilege on. */
const NO_ACCESS_TABLES = [...DIRECTORIES, 'organization_state']
const ONE_PER_USER = 'membership_directory_one_organization_per_user'
const SERVICE_ROLES = ['closeline_auth', 'closeline_core', 'closeline_playbook']

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

  const insertMember = async (
    c: PoolClient,
    orgId: string,
    userId: string,
    role: string,
    id = newId('mem')
  ) => {
    await c.query(
      "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, $4, 'member@example.test')",
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

  const addMember = (orgId: string, role: string, userId = newId('usr'), id = newId('mem')) =>
    inOrg(orgId, async (c) => ({ id: await insertMember(c, orgId, userId, role, id), userId }))

  const setStatus = (orgId: string, status: string) =>
    inOrg(orgId, (c) =>
      c.query('update core.organizations set status = $2 where organization_id = $1', [
        orgId,
        status,
      ])
    )

  /** Accept an invitation the way the service does: only while it is still pending. */
  const accept = (orgId: string, invitationId: string, at = 'now()') =>
    inOrg(orgId, (c) =>
      c.query(
        `update core.invitations set state = 'accepted', accepted_at = ${at}
          where id = $1 and state = 'pending'`,
        [invitationId]
      )
    )

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
    options: {
      email?: string
      role?: string
      teamId?: string | null
      hash?: string
      expired?: boolean
    } = {}
  ) =>
    inOrg(orgId, async (c) => {
      const id = newId('inv')
      const hash = options.hash ?? newHash()
      const [createdAt, expiresAt] = options.expired
        ? ["now() - interval '2 days'", "now() - interval '1 day'"]
        : ['now()', "now() + interval '7 days'"]
      await c.query(
        `insert into core.invitations
           (id, organization_id, email, role, team_id, invited_by_user_id, token_hash, created_at, expires_at)
         values ($1, $2, $3, $4, $5, $6, $7, ${createdAt}, ${expiresAt})`,
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

  const membersOfUser = (orgId: string) =>
    scoped(owner, orgId, async (c) =>
      (
        await c.query<{ user_id: string }>(
          'select user_id from core.memberships where organization_id = $1 order by 1',
          [orgId]
        )
      ).rows.map((r) => r.user_id)
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
  }, 120_000)

  describe('tenant isolation', () => {
    test('the migrated database passes the check, and only the three directories, the status table and the playbook work registry need the allowlist', async () => {
      expect(await findTenantIsolationGaps(handle.db)).toEqual([])
      expect([...NON_TENANT_TABLES].sort()).toEqual(
        [
          ...NO_ACCESS_TABLES.map((name) => `core.${name}`),
          'core.consent_form_directory',
          'core.demo_rate_counter',
          'core.demo_request',
          'playbook.work_hints',
          'voice.line_directory',
        ].sort()
      )
      const without = await findTenantIsolationGaps(handle.db, [])
      expect(
        without
          .filter((gap) => gap.schema === 'core' && !gap.table.startsWith('it_'))
          .map((g) => g.table)
          .sort()
      ).toEqual(
        [...NO_ACCESS_TABLES, 'consent_form_directory', 'demo_rate_counter', 'demo_request'].sort()
      )
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
            "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, $4, 'member@example.test')",
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
        const updated = await scoped(
          core,
          b.orgId,
          async (c) =>
            (
              await c.query(`update core.${table} ${updates[table]} where organization_id = $1`, [
                a.orgId,
              ])
            ).rowCount
        )
        // The service role cannot remove invitations at all (its own test below), so for that
        // table the owner role, which row-level security also binds, stands in.
        const remover = table === 'invitations' ? owner : core
        const removed = await scoped(
          remover,
          b.orgId,
          async (c) =>
            (await c.query(`delete from core.${table} where organization_id = $1`, [a.orgId]))
              .rowCount
        )
        expect([updated, removed]).toEqual([0, 0])
        expect(await count(core, a.orgId, sql, [a.orgId])).toBe(before)
      })

      test.each([
        ['closeline_auth', () => auth],
        ['closeline_playbook', () => playbook],
      ])('%s is refused on every core table', async (_role, pool) => {
        for (const table of [...TENANT_TABLES, ...NO_ACCESS_TABLES]) {
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
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, $4, 'member@example.test')",
        (o: string) => [newId('mem'), o, 'usr_1', 'rep'],
      ],
      [
        'memberships_id_shape',
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, $4, 'member@example.test')",
        (o: string) => ['mem_1', o, newId('usr'), 'rep'],
      ],
      [
        'memberships_role_known',
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, $4, 'member@example.test')",
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

    test('names and emails fold ASCII letters only, the same way in every locale', async () => {
      const a = await createOrg()
      // Non-ASCII letters in a Team name are kept as typed: "É" and "é" are different, so both
      // Teams exist. A cluster whose locale lower-cases "É" would merge the names. (An email may
      // not hold a non-ASCII character at all; see the refusals below.)
      await addTeam(a.orgId, 'Équipe')
      await addTeam(a.orgId, 'équipe')
      const keys = await inOrg(a.orgId, (c) =>
        c.query<{ name_key: string }>(
          'select name_key from core.teams where organization_id = $1 order by 1',
          [a.orgId]
        )
      )
      expect(keys.rows.map((r) => r.name_key)).toEqual(['Équipe', 'équipe'])
      const [email, key] = await Promise.all([
        owner.query<{ def: string }>(
          "select pg_get_constraintdef(oid) as def from pg_constraint where conname = 'invitations_email_shape'"
        ),
        owner.query<{ def: string }>(
          `select pg_get_expr(d.adbin, d.adrelid) as def from pg_attrdef d
             join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
            where d.adrelid = 'core.teams'::regclass and a.attname = 'name_key'`
        ),
      ])
      expect(email.rows[0]?.def).toContain('COLLATE "C"')
      expect(key.rows[0]?.def).toContain('COLLATE "C"')
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
      ['an email with two @', { email: 'a@b@example.com' }, 'invitations_email_shape'],
      ['an email with a doubled @', { email: 'a@@example.com' }, 'invitations_email_shape'],
      ['an email that starts with @', { email: '@example.com' }, 'invitations_email_shape'],
      ['an email that ends with @', { email: 'ann@' }, 'invitations_email_shape'],
      [
        'an email with a trailing newline',
        { email: 'ann@example.com\n' },
        'invitations_email_shape',
      ],
      [
        'an email with a header injection',
        { email: 'ann@example.com\r\nbcc:x@y.z' },
        'invitations_email_shape',
      ],
      ['an email with a tab', { email: 'an\tn@example.com' }, 'invitations_email_shape'],
      ['an email with a space', { email: 'ann @example.com' }, 'invitations_email_shape'],
      [
        'an email with a control character',
        { email: 'a\u0001nn@example.com' },
        'invitations_email_shape',
      ],
      [
        'an email with a DEL character',
        { email: 'ann\u007f@example.com' },
        'invitations_email_shape',
      ],
      ['a zero-width space', { email: 'ann\u200b@example.com' }, 'invitations_email_shape'],
      ['a no-break space', { email: 'ann\u00a0@example.com' }, 'invitations_email_shape'],
      ['a right-to-left override', { email: 'ann@example\u202e.com' }, 'invitations_email_shape'],
      ['a fullwidth @ as the only @', { email: 'ann\uff20example.com' }, 'invitations_email_shape'],
      [
        'a fullwidth @ beside the real one',
        { email: 'ann\uff20b@example.com' },
        'invitations_email_shape',
      ],
      ['a non-ASCII letter', { email: 'é@example.com' }, 'invitations_email_shape'],
      ['an unknown role', { role: 'boss' }, 'invitations_role_known'],
      [
        'an Owner role (ownership passes by promotion)',
        { role: 'owner' },
        'invitations_role_not_owner',
      ],
    ])('an invitation with %s is refused', async (_name, options, constraint) => {
      const { orgId } = await createOrg()
      expect((await failure(invite(orgId, options))).constraint).toBe(constraint)
    })

    test('an internationalised domain is stored in its ASCII (A-label) form', async () => {
      const { orgId } = await createOrg()
      await invite(orgId, { email: 'ann@xn--bcher-kva.example' })
      await invite(orgId, { email: "o'brien+tag@example.com" })
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

    test('an invitation cannot be accepted after it expired, but can still be revoked', async () => {
      const { orgId } = await createOrg()
      const { id } = await invite(orgId, { expired: true })
      const refused = await failure(accept(orgId, id))
      expect(refused.message).toContain('core.invitation_expired')
      expect(refused.constraint).toBe('invitations_not_expired')
      const state = () =>
        inOrg(
          orgId,
          async (c) =>
            (await c.query('select state from core.invitations where id = $1', [id])).rows[0]
        )
      expect(await state()).toEqual({ state: 'pending' })
      await inOrg(orgId, (c) =>
        c.query("update core.invitations set state = 'revoked', revoked_at = now() where id = $1", [
          id,
        ])
      )
      expect(await state()).toEqual({ state: 'revoked' })
    })

    test('an invitation cannot be accepted twice, even with the same timestamp', async () => {
      const { orgId } = await createOrg()
      const { id } = await invite(orgId)
      await inOrg(orgId, (c) =>
        c.query(
          "update core.invitations set state = 'accepted', accepted_at = '2026-01-01T00:00:00Z' where id = $1",
          [id]
        )
      )
      for (const again of [
        "set state = 'accepted', accepted_at = '2026-01-01T00:00:00Z'",
        "set state = 'accepted', accepted_at = now()",
        'set accepted_at = now()',
        "set state = 'revoked', revoked_at = now(), accepted_at = null",
      ]) {
        const refused = await failure(
          inOrg(orgId, (c) => c.query(`update core.invitations ${again} where id = $1`, [id]))
        )
        expect(refused.constraint).toBe('invitations_state_final')
      }
    })

    test.each(['accepted', 'revoked'])(
      'the token hash and id of a %s invitation cannot change, and its hash cannot be issued again',
      async (state) => {
        const { orgId } = await createOrg()
        const { id, hash } = await invite(orgId)
        if (state === 'accepted') {
          await accept(orgId, id)
        } else {
          await inOrg(orgId, (c) =>
            c.query(
              "update core.invitations set state = 'revoked', revoked_at = now() where id = $1",
              [id]
            )
          )
        }
        for (const change of ['token_hash = $2', 'id = $2']) {
          const value = change.startsWith('id') ? newId('inv') : newHash()
          const refused = await failure(
            inOrg(orgId, (c) =>
              c.query(`update core.invitations set ${change} where id = $1`, [id, value])
            )
          )
          expect(refused.constraint).toBe('invitations_state_final')
        }
        // The used hash stays on its row, so it cannot be reinserted as a new pending invitation.
        const reused = await failure(invite(orgId, { hash }))
        expect(reused.constraint).toBe('invitations_token_hash_key')
        expect(await invitationDirectoryOf([orgId])).toEqual([])
      }
    )

    test('a pending invitation can still rotate its token hash', async () => {
      const { orgId } = await createOrg()
      const { id } = await invite(orgId)
      const rotated = newHash()
      await inOrg(orgId, (c) =>
        c.query('update core.invitations set token_hash = $1 where id = $2', [rotated, id])
      )
      expect((await invitationDirectoryOf([orgId])).map((r) => r.token_hash)).toEqual([rotated])
    })

    describe('the moment an invitation expires', () => {
      /** An invitation that expires `seconds` after it is created, by the database clock. */
      const inviteExpiringIn = (orgId: string, seconds: number) =>
        inOrg(orgId, async (c) => {
          const id = newId('inv')
          await c.query(
            `insert into core.invitations
               (id, organization_id, email, role, invited_by_user_id, token_hash, created_at, expires_at)
             values ($1, $2, $3, 'rep', $4, $5, now(), now() + make_interval(secs => $6))`,
            [id, orgId, `${id.slice(-8)}@example.com`, newId('usr'), newHash(), seconds]
          )
          return id
        })

      test('an invitation is expired at the instant it expires, not only after it', async () => {
        const probe = async (expiresAt: string, at: string) =>
          (
            await owner.query<{ expired: boolean }>(
              'select core.has_expired($1::timestamptz, $2::timestamptz) as expired',
              [expiresAt, at]
            )
          ).rows[0]?.expired
        expect(await probe('2026-06-01T12:00:00.000000Z', '2026-06-01T11:59:59.999999Z')).toBe(
          false
        )
        expect(await probe('2026-06-01T12:00:00.000000Z', '2026-06-01T12:00:00.000000Z')).toBe(true)
        expect(await probe('2026-06-01T12:00:00.000000Z', '2026-06-01T12:00:00.000001Z')).toBe(true)
      })

      test('the lookup and the accept guard both decide through core.has_expired, so they share the boundary', async () => {
        const defs = await owner.query<{ name: string; def: string }>(
          `select p.proname as name, pg_get_functiondef(p.oid) as def
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'core'
              and p.proname in ('invitation_for_token', 'refuse_unacceptable_invitation')
            order by 1`
        )
        expect(defs.rows.map((r) => r.name)).toEqual([
          'invitation_for_token',
          'refuse_unacceptable_invitation',
        ])
        for (const { def } of defs.rows) {
          expect(def).toMatch(/"?core"?\."?has_expired"?\(/)
        }
        const [lookup, guard] = defs.rows.map((r) => r.def)
        expect(lookup).toContain('statement_timestamp()')
        expect(guard).toContain('clock_timestamp()')
        expect(guard).not.toContain('statement_timestamp()')
      })

      test('an accept that waits for a lock past the expiry is refused: the guard reads the clock when it runs', async () => {
        const { orgId } = await createOrg()
        const id = await inviteExpiringIn(orgId, 1.5)
        const holder = await track(await core.connect())
        const waiter = await track(await core.connect())
        try {
          for (const c of [holder, waiter]) {
            await c.query('begin')
            await c.query('select set_config($1, $2, true)', [SETTING, orgId])
          }
          await holder.query('select 1 from core.invitations where id = $1 for update', [id])
          // The statement starts while the invitation is still valid, then waits for the lock.
          const pending = waiter
            .query(
              "update core.invitations set state = 'accepted', accepted_at = now() where id = $1 and state = 'pending'",
              [id]
            )
            .then(
              () => 'accepted',
              (e: Error) => e.message
            )
          await waitUntilBlocked(waiter)
          // Let the database clock pass the expiry while the accept is still waiting.
          for (let i = 0; i < 200; i++) {
            const gone = await owner.query<{ gone: boolean }>(
              'select clock_timestamp() > expires_at as gone from core.invitation_directory where invitation_id = $1',
              [id]
            )
            if (gone.rows[0]?.gone) {
              break
            }
            await new Promise((resolve) => setTimeout(resolve, 20))
          }
          await holder.query('rollback')
          expect(await pending).toContain('core.invitation_expired')
          await waiter.query('rollback')
        } finally {
          holder.release()
          waiter.release()
        }
      })
    })

    test('the service cannot delete an invitation, so a used token cannot be re-issued', async () => {
      const { orgId } = await createOrg()
      const { id, hash } = await invite(orgId)
      await accept(orgId, id)
      const refused = await failure(
        inOrg(orgId, (c) => c.query('delete from core.invitations where id = $1', [id]))
      )
      expect(refused.message).toContain('permission denied for table invitations')
      expect(await count(core, orgId, 'select count(*) as n from core.invitations')).toBe(1)
      // The only way out is deleting the whole Organization, which takes the token with it.
      await inOrg(orgId, (c) =>
        c.query('delete from core.organizations where organization_id = $1', [orgId])
      )
      expect(await invitationDirectoryOf([orgId])).toEqual([])
      expect(hash).toHaveLength(64)
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
        const inside = await c.query('select * from core.organization_of_user($1)', [userId])
        expect(inside.rows).toEqual([{ organization_id: orgId, status: 'active' }])
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

      describe('the Organization row is locked first, so none of these can deadlock', () => {
        /** Run `statement` and commit, answering 'ok' or the SQLSTATE of the error. */
        const finish = (c: PoolClient, statement: () => Promise<unknown>) => async () => {
          try {
            await statement()
            await c.query('commit')
            return 'ok'
          } catch (error) {
            await c.query('rollback').catch(() => undefined)
            return (error as { code?: string }).code ?? 'error'
          }
        }

        /** A transaction of the owner role that holds `mode` on the Organization's row. */
        async function hold(orgId: string, mode: string): Promise<PoolClient> {
          const c = await owner.connect()
          await c.query('begin')
          await c.query('select set_config($1, $2, true)', [SETTING, orgId])
          await c.query(`select 1 from core.organizations where organization_id = $1 ${mode}`, [
            orgId,
          ])
          return c
        }

        test('two concurrent Owner inserts into one Organization both succeed', async () => {
          const { orgId } = await createOrg()
          const holder = await hold(orgId, 'for share')
          const c1 = await open(orgId)
          const c2 = await open(orgId)
          try {
            // Both statements start while the Organization row is share-locked, so each reaches
            // the Owner counter and waits there; neither may already hold a share lock of its own.
            const first = finish(c1, () => insertMember(c1, orgId, newId('usr'), 'owner'))()
            await waitUntilBlocked(c1)
            const second = finish(c2, () => insertMember(c2, orgId, newId('usr'), 'owner'))()
            await waitUntilBlocked(c2)
            await holder.query('commit')
            expect(await Promise.all([first, second])).toEqual(['ok', 'ok'])
          } finally {
            holder.release()
            c1.release()
            c2.release()
          }
          expect(await ownersOf(orgId)).toEqual({ actual: 3, counter: 3 })
        })

        test('removing an Owner while another transaction suspends the Organization completes both', async () => {
          const { orgId, ids } = await ownersOrg(2)
          const holder = await hold(orgId, 'for no key update')
          const suspender = await open(orgId)
          const remover = await open(orgId)
          try {
            // The suspension asks for the Organization row first; the removal then asks for it
            // too. If the removal had already written the directory row, the suspension's
            // statement would wait for that row and the two would wait for each other.
            const suspension = finish(suspender, () =>
              suspender.query(
                "update core.organizations set status = 'suspended' where organization_id = $1",
                [orgId]
              )
            )()
            await waitUntilBlocked(suspender)
            const removal = finish(remover, () => remove(remover, ids[1] as string))()
            await waitUntilBlocked(remover)
            await holder.query('commit')
            expect(await Promise.all([suspension, removal])).toEqual(['ok', 'ok'])
          } finally {
            holder.release()
            suspender.release()
            remover.release()
          }
          expect(await ownersOf(orgId)).toEqual({ actual: 1, counter: 1 })
          expect(
            (await organizationOfUser(handle.db, (await membersOfUser(orgId))[0] ?? ''))?.status
          ).toBe('suspended')
        })

        test('the Owner counter trigger sorts before the directory trigger', async () => {
          const triggers = await owner.query<{ name: string }>(
            `select tgname as name from pg_trigger
              where tgrelid = 'core.memberships'::regclass and not tgisinternal
                and (tgtype & 1) = 1 order by tgname`
          )
          expect(triggers.rows.map((r) => r.name)).toEqual([
            'memberships_a_track_owner_count',
            'memberships_b_sync_directory',
          ])
        })
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
        // The lookup sees this transaction's own writes: the kept one, not the savepoint's.
        const kept = await c.query('select * from core.organization_of_user($1)', [userId])
        expect(kept.rows).toHaveLength(1)
        const undone = await c.query('select * from core.organization_of_user($1)', [other])
        expect(undone.rows).toEqual([])
        await c.query('rollback')
      } finally {
        c.release()
      }
      expect(await directoryOf([orgId])).toEqual(before)
    })

    test('invitation_directory holds the pending invitations only, and follows insert, token, expiry, accept, revoke and cascade', async () => {
      const { orgId } = await createOrg()
      const one = await invite(orgId)
      const two = await invite(orgId)
      const three = await invite(orgId)
      const expectDirectory = async (expected: [string, string][]) =>
        expect(
          (await invitationDirectoryOf([orgId])).map((r) => [r.token_hash, r.invitation_id])
        ).toEqual(expected.sort())
      await expectDirectory([
        [one.hash, one.id],
        [two.hash, two.id],
        [three.hash, three.id],
      ])
      const rotated = newHash()
      await inOrg(orgId, (c) =>
        c.query('update core.invitations set token_hash = $1 where id = $2', [rotated, one.id])
      )
      await expectDirectory([
        [rotated, one.id],
        [two.hash, two.id],
        [three.hash, three.id],
      ])
      await inOrg(orgId, (c) =>
        c.query(
          "update core.invitations set expires_at = now() + interval '30 days' where id = $1",
          [one.id]
        )
      )
      const expiry = await owner.query<{ longer: boolean }>(
        "select expires_at > now() + interval '29 days' as longer from core.invitation_directory where invitation_id = $1",
        [one.id]
      )
      expect(expiry.rows).toEqual([{ longer: true }])
      await inOrg(orgId, (c) =>
        c.query("update core.invitations set state = 'revoked', revoked_at = now() where id = $1", [
          two.id,
        ])
      )
      await accept(orgId, three.id)
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

    describe("an Organization's status is one row, in organization_state", () => {
      const stateOf = async (orgId: string) =>
        (
          await owner.query<{ status: string; xmin: string }>(
            'select status, xmin::text as xmin from core.organization_state where organization_id = $1',
            [orgId]
          )
        ).rows

      test('there is one row per Organization, created with it, following every change of its status, and gone with it', async () => {
        const { orgId, userId } = await createOrg()
        const { id, hash } = await invite(orgId)
        expect((await stateOf(orgId)).map((r) => r.status)).toEqual(['active'])
        for (const status of ['suspended', 'active', 'deleted', 'active']) {
          await setStatus(orgId, status)
          expect((await stateOf(orgId)).map((r) => r.status)).toEqual([status])
          const found = await organizationOfUser(handle.db, userId)
          expect<string | undefined>(found?.status).toBe(status)
          expect(await invitationForToken(handle.db, hash)).toEqual(
            status === 'active' ? { organizationId: orgId, invitationId: id } : null
          )
        }
        // A member written while the Organization is suspended needs no status of its own.
        await setStatus(orgId, 'suspended')
        const late = await addMember(orgId, 'rep')
        expect((await organizationOfUser(handle.db, late.userId))?.status).toBe('suspended')
        await inOrg(orgId, (c) =>
          c.query('delete from core.organizations where organization_id = $1', [orgId])
        )
        expect(await stateOf(orgId)).toEqual([])
      })

      test('every Organization has a state row, equal to its status', async () => {
        await createOrg()
        const orphans = await owner.query<{ n: string }>(
          `select count(*) as n from core.organizations o
            where not exists (select 1 from core.organization_state s
                               where s.organization_id = o.organization_id)`
        )
        expect(Number(orphans.rows[0]?.n)).toBe(0)
        const mismatched = await owner.query<{ n: string }>(
          `select count(*) as n from core.organizations o join core.organization_state s
             on s.organization_id = o.organization_id where s.status <> o.status`
        )
        expect(Number(mismatched.rows[0]?.n)).toBe(0)
      })

      test('a statement that leaves the status as it was writes nothing; one that changes it writes the row once', async () => {
        const { orgId } = await createOrg()
        const before = await stateOf(orgId)
        await inOrg(orgId, (c) =>
          c.query('update core.organizations set status = status where organization_id = $1', [
            orgId,
          ])
        )
        await inOrg(orgId, (c) =>
          c.query("update core.organizations set name = 'Renamed' where organization_id = $1", [
            orgId,
          ])
        )
        expect(await stateOf(orgId)).toEqual(before)
        await setStatus(orgId, 'suspended')
        const after = await stateOf(orgId)
        expect(after).toHaveLength(1)
        expect(after[0]?.status).toBe('suspended')
        expect(after[0]?.xmin).not.toBe(before[0]?.xmin)
      })

      test.each(['repeatable read', 'serializable'])(
        'a member added by a transaction that committed after a %s snapshot is suspended with the rest',
        async (isolation) => {
          const { orgId } = await createOrg()
          const late = newId('usr')
          const suspender = await track(await core.connect())
          try {
            await suspender.query(`begin isolation level ${isolation}`)
            await suspender.query('select set_config($1, $2, true)', [SETTING, orgId])
            await suspender.query('select count(*) from core.memberships') // takes the snapshot
            await addMember(orgId, 'rep', late) // commits after that snapshot
            await suspender.query(
              "update core.organizations set status = 'suspended' where organization_id = $1",
              [orgId]
            )
            await suspender.query('commit')
          } finally {
            suspender.release()
          }
          expect((await organizationOfUser(handle.db, late))?.status).toBe('suspended')
        }
      )

      test('suspending an Organization of 100,000 members and 200 pending invitations writes one row', async () => {
        const { orgId, userId } = await createOrg()
        await scoped(owner, orgId, async (c) => {
          await c.query(
            `insert into core.memberships (id, organization_id, user_id, role, email)
               select 'mem_' || md5('m' || $1::text || n), $1::text, 'usr_' || md5('u' || $1::text || n), 'rep', 'member@example.test'
                 from generate_series(1, 100000) n`,
            [orgId]
          )
          await c.query(
            `insert into core.invitations
                 (id, organization_id, email, role, invited_by_user_id, token_hash, expires_at)
               select 'inv_' || md5('i' || $1::text || n), $1::text, 'u' || n || '@example.com', 'rep',
                      'usr_' || md5('b' || $1::text), md5('h' || $1::text || n) || md5('k' || $1::text || n),
                      now() + interval '7 days'
                 from generate_series(1, 200) n`,
            [orgId]
          )
        })
        expect(await count(owner, orgId, 'select count(*) as n from core.memberships')).toBe(100001)
        // The per-transaction counters keep what this connection wrote earlier until they are
        // flushed, so the change is measured as the difference around the one statement.
        const counters = (c: PoolClient) =>
          c.query<{ relname: string; written: string }>(
            `select relname, (n_tup_ins + n_tup_upd + n_tup_del)::text as written
               from pg_stat_xact_all_tables where schemaname = 'core'`
          )
        const change = async (status: string) => {
          const c = await core.connect()
          try {
            await c.query('begin')
            await c.query('select set_config($1, $2, true)', [SETTING, orgId])
            const before = new Map((await counters(c)).rows.map((r) => [r.relname, +r.written]))
            await c.query('update core.organizations set status = $2 where organization_id = $1', [
              orgId,
              status,
            ])
            const after = (await counters(c)).rows
            await c.query('commit')
            const rows = Object.fromEntries(
              after
                .map((r) => [r.relname, +r.written - (before.get(r.relname) ?? 0)] as const)
                .filter(([, written]) => written > 0)
            )
            return { rows }
          } catch (error) {
            await c.query('rollback').catch(() => undefined)
            throw error
          } finally {
            c.release()
          }
        }
        for (const status of ['suspended', 'active']) {
          const { rows } = await change(status)
          // One row of the Organization and one of its state; no directory row is touched.
          expect(rows).toEqual({ organization_state: 1, organizations: 1 })
        }
        await setStatus(orgId, 'suspended')
        expect((await organizationOfUser(handle.db, userId))?.status).toBe('suspended')
      }, 180_000)
    })

    test('a member added while another transaction suspends the Organization is not left active, and neither waits', async () => {
      const { orgId } = await createOrg()
      const c1 = await track(await core.connect())
      const c2 = await track(await core.connect())
      const userId = newId('usr')
      try {
        for (const c of [c1, c2]) {
          await c.query('begin')
          await c.query('select set_config($1, $2, true)', [SETTING, orgId])
        }
        await insertMember(c1, orgId, userId, 'rep')
        // The suspension does not wait for the uncommitted insert: it writes the status row, not
        // one row per member, so there is no member row for it to miss.
        await c2.query(
          "update core.organizations set status = 'suspended' where organization_id = $1",
          [orgId]
        )
        await c2.query('commit')
        await c1.query('commit')
      } finally {
        c1.release()
        c2.release()
      }
      expect((await organizationOfUser(handle.db, userId))?.status).toBe('suspended')
    })

    describe('closeline_core cannot read a directory or the status table, only look a key up', () => {
      const zeros = (prefix: string) => `${prefix}_${'0'.repeat(32)}`
      const forged = (table: string) =>
        ({
          membership_directory: `insert into core.membership_directory values ('${zeros('usr')}', '${zeros('org')}')`,
          invitation_directory: `insert into core.invitation_directory values ('${'0'.repeat(64)}', '${zeros('org')}', '${zeros('inv')}', now() + interval '1 day')`,
          organization_state: `insert into core.organization_state values ('${zeros('org')}', 'active')`,
        })[table] as string

      test.each(NO_ACCESS_TABLES)(
        '%s: every statement is refused, whatever the Organization set',
        async (table) => {
          const { orgId } = await createOrg()
          await invite(orgId)
          const key =
            table === 'membership_directory'
              ? 'user_id'
              : table === 'invitation_directory'
                ? 'token_hash'
                : 'status'
          const statements = [
            `select * from core.${table}`,
            `select count(*) from core.${table}`,
            `select ${key} from core.${table}`,
            `select organization_id from core.${table} where organization_id = '${orgId}'`,
            `select 1 from core.${table} limit 1`,
            `insert into core.${table} select * from core.${table} limit 0`,
            forged(table),
            `update core.${table} set organization_id = organization_id`,
            `delete from core.${table}`,
            `truncate core.${table}`,
          ]
          for (const setting of [null, orgId]) {
            for (const statement of statements) {
              const refused = await failure(scoped(core, setting, (c) => c.query(statement)))
              expect(refused.message).toContain('permission denied for table')
            }
          }
        }
      )

      test.each(NO_ACCESS_TABLES)(
        '%s: no service role holds any privilege on it, column level included',
        async (table) => {
          const held = await owner.query<{ role: string; privilege: string }>(
            `select r.role, p.privilege
               from unnest($2::text[]) r(role)
               cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
                                  ('REFERENCES'), ('TRIGGER')) p(privilege)
              where has_table_privilege(r.role, $1, p.privilege)
                 or (p.privilege in ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES')
                     and has_any_column_privilege(r.role, $1, p.privilege))`,
            [`core.${table}`, SERVICE_ROLES]
          )
          expect(held.rows).toEqual([])
        }
      )

      test('closeline_auth and closeline_playbook cannot reach the lookups either', async () => {
        const { userId } = await createOrg()
        for (const pool of [auth, playbook]) {
          const refused = await failure(
            scoped(pool, null, (c) =>
              c.query('select * from core.organization_of_user($1)', [userId])
            )
          )
          expect(refused.message).toContain('permission denied for schema core')
        }
      })
    })

    describe('the two lookups', () => {
      const lookupUser = (userId: string) =>
        scoped(
          core,
          null,
          async (c) =>
            (await c.query('select * from core.organization_of_user($1)', [userId])).rows as {
              organization_id: string
              status: string
            }[]
        )
      const lookupToken = (hash: string) =>
        scoped(
          core,
          null,
          async (c) =>
            (await c.query('select * from core.invitation_for_token($1)', [hash])).rows as {
              organization_id: string
              invitation_id: string
            }[]
        )

      test('organization_of_user returns the one row for a user, with the status, and nothing for anyone else', async () => {
        const a = await createOrg()
        const b = await createOrg()
        expect(await lookupUser(a.userId)).toEqual([{ organization_id: a.orgId, status: 'active' }])
        expect(await lookupUser(b.userId)).toEqual([{ organization_id: b.orgId, status: 'active' }])
        expect(await lookupUser(newId('usr'))).toEqual([])
        // An exact key: no pattern, empty value or NULL enumerates anything.
        for (const probe of ['usr_%', 'usr_', '', '%', a.userId.toUpperCase(), `${a.userId} `]) {
          expect(await lookupUser(probe)).toEqual([])
        }
        expect(
          await scoped(
            core,
            null,
            async (c) => (await c.query('select * from core.organization_of_user(null)')).rows
          )
        ).toEqual([])
        // The answer does not depend on the Organization the caller has set.
        const viaB = await scoped(
          core,
          b.orgId,
          async (c) =>
            (await c.query('select * from core.organization_of_user($1)', [a.userId])).rows
        )
        expect(viaB).toEqual([{ organization_id: a.orgId, status: 'active' }])
      })

      test('invitation_for_token returns the one pending, unexpired invitation of an active Organization', async () => {
        const a = await createOrg()
        const one = await invite(a.orgId)
        const two = await invite(a.orgId)
        expect(await lookupToken(one.hash)).toEqual([
          { organization_id: a.orgId, invitation_id: one.id },
        ])
        expect(await lookupToken(two.hash)).toEqual([
          { organization_id: a.orgId, invitation_id: two.id },
        ])
        expect(await lookupToken(newHash())).toEqual([])
        for (const probe of ['', '%', '0'.repeat(64), one.hash.toUpperCase(), `${one.hash} `]) {
          expect(await lookupToken(probe)).toEqual([])
        }
        expect(
          await scoped(
            core,
            null,
            async (c) => (await c.query('select * from core.invitation_for_token(null)')).rows
          )
        ).toEqual([])
      })

      test.each([
        ['accepted', 'accept'],
        ['revoked', 'revoke'],
        ['expired', 'expire'],
        ['in a suspended Organization', 'suspend'],
        ['in a deleted Organization', 'delete'],
      ])(
        'invitation_for_token returns nothing for an invitation that is %s',
        async (_name, how) => {
          const a = await createOrg()
          const { id, hash } = await invite(a.orgId, { expired: how === 'expire' })
          const opens = [{ organization_id: a.orgId, invitation_id: id }]
          expect(await lookupToken(hash)).toEqual(how === 'expire' ? [] : opens)
          if (how === 'accept') {
            await accept(a.orgId, id)
          } else if (how === 'revoke') {
            await inOrg(a.orgId, (c) =>
              c.query(
                "update core.invitations set state = 'revoked', revoked_at = now() where id = $1",
                [id]
              )
            )
          } else if (how === 'suspend') {
            await setStatus(a.orgId, 'suspended')
          } else if (how === 'delete') {
            await setStatus(a.orgId, 'deleted')
          }
          expect(await lookupToken(hash)).toEqual([])
          if (how === 'suspend') {
            await setStatus(a.orgId, 'active')
            expect(await lookupToken(hash)).toEqual(opens)
          }
        }
      )

      test('a token stops opening an invitation the instant it is rotated', async () => {
        const a = await createOrg()
        const { id, hash } = await invite(a.orgId)
        const rotated = newHash()
        await inOrg(a.orgId, (c) =>
          c.query('update core.invitations set token_hash = $1 where id = $2', [rotated, id])
        )
        expect(await lookupToken(hash)).toEqual([])
        expect(await lookupToken(rotated)).toEqual([
          { organization_id: a.orgId, invitation_id: id },
        ])
      })

      test('the typed helpers answer from the same functions, as a service connection with no Organization set', async () => {
        const a = await createOrg()
        const { id, hash } = await invite(a.orgId)
        expect(await organizationOfUser(handle.db, a.userId)).toEqual({
          organizationId: a.orgId,
          status: 'active',
        })
        expect(await organizationOfUser(handle.db, newId('usr'))).toBeNull()
        expect(await invitationForToken(handle.db, hash)).toEqual({
          organizationId: a.orgId,
          invitationId: id,
        })
        expect(await invitationForToken(handle.db, newHash())).toBeNull()
      })
    })

    test('a directory holds the mapping and the expiry, the status table holds the status, and nothing else', async () => {
      const columns = await owner.query<{ table_name: string; column_name: string }>(
        `select table_name, column_name from information_schema.columns
          where table_schema = 'core' and table_name = any($1) order by table_name, ordinal_position`,
        [NO_ACCESS_TABLES]
      )
      expect(columns.rows.map((r) => `${r.table_name}.${r.column_name}`)).toEqual([
        'invitation_directory.token_hash',
        'invitation_directory.organization_id',
        'invitation_directory.invitation_id',
        'invitation_directory.expires_at',
        'membership_directory.user_id',
        'membership_directory.organization_id',
        'organization_state.organization_id',
        'organization_state.status',
      ])
    })

    test('the sign-in flow: look the user up, open the Organization, read the row under row-level security', async () => {
      const { orgId, userId } = await createOrg()
      const found = await organizationOfUser(handle.db, userId)
      expect(found).toEqual({ organizationId: orgId, status: 'active' })
      const role = await inOrg(found?.organizationId ?? '', (c) =>
        c.query('select role from core.memberships where user_id = $1', [userId])
      )
      expect(role.rows).toEqual([{ role: 'owner' }])

      const { hash, id } = await invite(orgId)
      const token = await invitationForToken(handle.db, hash)
      expect(token).toEqual({ organizationId: orgId, invitationId: id })
      const row = await inOrg(token?.organizationId ?? '', (c) =>
        c.query('select email, state from core.invitations where id = $1', [token?.invitationId])
      )
      expect(row.rows).toHaveLength(1)
    })
  })

  describe('every function in core is owned, pinned and callable by exactly the roles meant to', () => {
    /** name: [SECURITY DEFINER, trigger function, closeline_core may execute it]. */
    const FUNCTIONS: Record<string, [boolean, boolean, boolean]> = {
      claim_demo_notices: [true, false, true],
      consent_channels_valid: [false, false, true],
      consent_form_for_token: [true, false, true],
      has_expired: [false, false, true],
      limit_field_history: [false, true, false],
      prospect_merged_ids_valid: [false, false, true],
      prospect_tags_valid: [false, false, true],
      prospect_technologies_valid: [false, false, true],
      prospect_company_technologies_text_valid: [false, false, true],
      hit_demo_rate_limit: [true, false, true],
      invitation_for_token: [true, false, true],
      lock_form_wording: [false, true, false],
      organization_of_user: [true, false, true],
      purge_demo_rate_counters: [true, false, true],
      purge_demo_requests: [true, false, true],
      refuse_consent_ledger_change: [false, true, false],
      refuse_consent_ledger_truncate: [false, true, false],
      refuse_idempotency_rewrite: [false, true, false],
      refuse_locked_wording_change: [false, true, false],
      refuse_region_change: [false, true, false],
      refuse_reopened_invitation: [false, true, false],
      refuse_revived_ownerless_organization: [false, true, false],
      refuse_truncate: [false, true, false],
      refuse_unacceptable_invitation: [false, true, false],
      require_owner: [false, true, false],
      search_prospect_company_ids: [true, false, true],
      search_prospect_ids: [true, false, true],
      settle_demo_notice: [true, false, true],
      start_organization: [false, true, false],
      submit_demo_request: [true, false, true],
      sync_consent_form_directory: [true, true, false],
      sync_invitation_directory: [true, true, false],
      sync_membership_directory: [true, true, false],
      sync_organization_state: [true, true, false],
      track_owner_count: [true, true, false],
    }

    const SEARCH_FUNCTION_NAMES = ['search_prospect_ids', 'search_prospect_company_ids']

    interface FunctionRow {
      name: string
      owner: string
      definer: boolean
      trigger: boolean
      volatility: string
      config: string[] | null
      has_acl: boolean
      public_execute: boolean
      auth: boolean
      core: boolean
      playbook: boolean
    }

    const catalog = async () =>
      (
        await owner.query<FunctionRow>(
          `select p.proname as name, pg_get_userbyid(p.proowner) as owner,
                  p.prosecdef as definer, p.prorettype = 'trigger'::regtype as trigger,
                  p.provolatile as volatility, p.proconfig as config,
                  p.proacl is not null as has_acl,
                  coalesce((select bool_or(a.grantee = 0) from aclexplode(p.proacl) a), false) as public_execute,
                  has_function_privilege('closeline_auth', p.oid, 'EXECUTE') as auth,
                  has_function_privilege('closeline_core', p.oid, 'EXECUTE') as core,
                  has_function_privilege('closeline_playbook', p.oid, 'EXECUTE') as playbook
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'core' and p.proname not like 'it\\_%' order by p.proname`
        )
      ).rows

    test('the set of functions is exactly the one classified here, so a new one must be', async () => {
      expect((await catalog()).map((f) => f.name)).toEqual(Object.keys(FUNCTIONS).sort())
    })

    test('each is owned by closeline_owner with search_path pinned, and SECURITY DEFINER only where intended', async () => {
      for (const fn of await catalog()) {
        const [definer, trigger] = FUNCTIONS[fn.name] ?? [false, false, false]
        // The two Prospect searches are owned by the role that bypasses row-level security (0030);
        // roles.integration.ts and core-prospect-search.integration.ts pin their other properties.
        const searchFn = SEARCH_FUNCTION_NAMES.includes(fn.name)
        expect([fn.name, fn.owner]).toEqual([
          fn.name,
          searchFn ? 'closeline_core_search' : 'closeline_owner',
        ])
        // The directory writers also pin their plans to one per key (see the migration).
        const planPinned =
          fn.name === 'sync_membership_directory' || fn.name === 'sync_invitation_directory'
        expect([fn.name, fn.config]).toEqual([
          fn.name,
          searchFn
            ? ['search_path=pg_catalog, core, public, pg_temp', 'plan_cache_mode=force_custom_plan']
            : planPinned
              ? ['search_path=pg_catalog, pg_temp', 'plan_cache_mode=force_custom_plan']
              : ['search_path=pg_catalog, pg_temp'],
        ])
        expect([fn.name, fn.definer]).toEqual([fn.name, definer])
        expect([fn.name, fn.trigger]).toEqual([fn.name, trigger])
      }
    })

    test('the lookups are STABLE, the expiry rule is IMMUTABLE and every other function is volatile', async () => {
      const expected: Record<string, string> = {
        organization_of_user: 's',
        invitation_for_token: 's',
        consent_form_for_token: 's',
        consent_channels_valid: 'i',
        has_expired: 'i',
        prospect_merged_ids_valid: 'i',
        prospect_tags_valid: 'i',
        prospect_technologies_valid: 'i',
        prospect_company_technologies_text_valid: 'i',
        search_prospect_ids: 's',
        search_prospect_company_ids: 's',
      }
      for (const fn of await catalog()) {
        expect([fn.name, fn.volatility]).toEqual([fn.name, expected[fn.name] ?? 'v'])
      }
    })

    test('EXECUTE is revoked from PUBLIC on all of them, and only the lookups, the expiry rule and the Demo Request functions are granted to closeline_core', async () => {
      for (const fn of await catalog()) {
        const coreMayRun = FUNCTIONS[fn.name]?.[2] ?? false
        expect([fn.name, fn.has_acl, fn.public_execute]).toEqual([fn.name, true, false])
        expect([fn.name, fn.auth, fn.playbook]).toEqual([fn.name, false, false])
        expect([fn.name, fn.core]).toEqual([fn.name, coreMayRun])
      }
    })

    test('no service role can fire a trigger function by calling it', async () => {
      for (const [name, [, trigger]] of Object.entries(FUNCTIONS)) {
        if (!trigger) {
          continue
        }
        for (const pool of [core, auth, playbook]) {
          const refused = await failure(scoped(pool, null, (c) => c.query(`select core.${name}()`)))
          expect(refused.message).toMatch(/permission denied/)
        }
      }
    })

    test('an Organization cannot commit when the setting no longer names it', async () => {
      const orgId = newId('org')
      created.add(orgId)
      for (const other of ['', newId('org')]) {
        const refused = await failure(
          scoped(core, orgId, async (c) => {
            await insertOrganization(c, orgId)
            await insertMember(c, orgId, newId('usr'), 'owner')
            await c.query('select set_config($1, $2, true)', [SETTING, other])
          })
        )
        expect(refused.message).toContain('core.owner_required')
      }
      expect(await count(owner, orgId, 'select count(*) as n from core.organizations')).toBe(0)
    })
  })

  describe('an Organization that is deleted can be emptied; one that is not keeps its Owner', () => {
    test('a deleted Organization lets its last Owner and every member go, freeing them to join another', async () => {
      const a = await createOrg()
      const b = await createOrg()
      const rep = await addMember(a.orgId, 'rep')
      await setStatus(a.orgId, 'deleted')
      await inOrg(a.orgId, (c) => c.query('delete from core.memberships where id = $1', [rep.id]))
      await inOrg(a.orgId, (c) =>
        c.query('delete from core.memberships where id = $1', [a.membershipId])
      )
      expect(await ownersOf(a.orgId)).toEqual({ actual: 0, counter: 0 })
      expect(await directoryOf([a.orgId])).toEqual([])
      expect(await organizationOfUser(handle.db, a.userId)).toBeNull()
      expect(await count(owner, a.orgId, 'select count(*) as n from core.organizations')).toBe(1)
      await addMember(b.orgId, 'rep', a.userId)
      expect(await organizationOfUser(handle.db, a.userId)).toEqual({
        organizationId: b.orgId,
        status: 'active',
      })
    })

    test('the last Owner of a deleted Organization can also be demoted', async () => {
      const a = await createOrg()
      await setStatus(a.orgId, 'deleted')
      await inOrg(a.orgId, (c) =>
        c.query("update core.memberships set role = 'rep' where id = $1", [a.membershipId])
      )
      expect(await ownersOf(a.orgId)).toEqual({ actual: 0, counter: 0 })
    })

    test.each(['active', 'suspended'])(
      'an %s Organization keeps its last Owner',
      async (status) => {
        const a = await createOrg()
        await setStatus(a.orgId, status)
        const removed = await failure(
          inOrg(a.orgId, (c) =>
            c.query('delete from core.memberships where id = $1', [a.membershipId])
          )
        )
        expect(removed.message).toContain('core.last_owner')
        const demoted = await failure(
          inOrg(a.orgId, (c) =>
            c.query("update core.memberships set role = 'rep' where id = $1", [a.membershipId])
          )
        )
        expect(demoted.message).toContain('core.last_owner')
        expect(await ownersOf(a.orgId)).toEqual({ actual: 1, counter: 1 })
      }
    )

    test('an emptied deleted Organization cannot be revived without an Owner, a deleted one with an Owner can', async () => {
      const a = await createOrg()
      const b = await createOrg()
      await setStatus(a.orgId, 'deleted')
      await setStatus(b.orgId, 'deleted')
      await inOrg(a.orgId, (c) =>
        c.query('delete from core.memberships where id = $1', [a.membershipId])
      )
      for (const status of ['active', 'suspended']) {
        const refused = await failure(setStatus(a.orgId, status))
        expect(refused.message).toContain('core.owner_required')
      }
      await setStatus(b.orgId, 'suspended')
      await setStatus(b.orgId, 'active')
    })

    test.each(['suspended', 'deleted'])(
      'an invitation cannot be accepted while its Organization is %s, and can once it is active',
      async (status) => {
        const a = await createOrg()
        const { id } = await invite(a.orgId)
        await setStatus(a.orgId, status)
        const refused = await failure(accept(a.orgId, id))
        expect(refused.message).toContain('core.invitation_organization_inactive')
        expect(refused.constraint).toBe('invitations_organization_active')
        if (status === 'suspended') {
          await setStatus(a.orgId, 'active')
          const accepted = await accept(a.orgId, id)
          expect(accepted.rowCount).toBe(1)
        }
      }
    )

    test('accepting an invitation waits for a concurrent suspension, then is refused', async () => {
      const a = await createOrg()
      const { id } = await invite(a.orgId)
      const c1 = await track(await core.connect())
      const c2 = await track(await core.connect())
      try {
        for (const c of [c1, c2]) {
          await c.query('begin')
          await c.query('select set_config($1, $2, true)', [SETTING, a.orgId])
        }
        await c1.query(
          "update core.organizations set status = 'suspended' where organization_id = $1",
          [a.orgId]
        )
        const pending = c2
          .query(
            "update core.invitations set state = 'accepted', accepted_at = now() where id = $1",
            [id]
          )
          .then(
            () => 'accepted',
            (e: Error) => e.message
          )
        await waitUntilBlocked(c2)
        await c1.query('commit')
        expect(await pending).toContain('core.invitation_organization_inactive')
        await c2.query('rollback')
      } finally {
        c1.release()
        c2.release()
      }
    })
  })

  describe('writes that skip a per-row trigger, and the ones that conflict', () => {
    test.each([
      ['memberships', 'truncate core.memberships cascade'],
      [
        'memberships and team_members',
        'truncate core.memberships, core.team_members, core.prospects, core.prospect_identities, core.prospect_fields, core.prospect_merges, core.contact_consent_event',
      ],
      ['invitations', 'truncate core.invitations'],
      ['organizations', 'truncate core.organizations cascade'],
      ['membership_directory', 'truncate core.membership_directory'],
      ['invitation_directory', 'truncate core.invitation_directory'],
    ])(
      'TRUNCATE of %s is refused, even for the owner, and nothing is lost',
      async (_table, statement) => {
        const a = await createOrg()
        await invite(a.orgId)
        const before = await directoryOf([a.orgId])
        const refused = await failure(scoped(owner, a.orgId, (c) => c.query(statement)))
        expect(refused.message).toContain('core.truncate_refused')
        expect(await directoryOf([a.orgId])).toEqual(before)
        expect(await ownersOf(a.orgId)).toEqual({ actual: 1, counter: 1 })
        expect(await invitationDirectoryOf([a.orgId])).toHaveLength(1)
      }
    )

    describe('one statement that both promotes and demotes depends on the row order', () => {
      // The Owner counter moves once per row, so a statement that promotes one member and demotes
      // the sole Owner is refused when the Owner row is processed first, and allowed when the
      // promoted row is. The end state is the same (one Owner) either way. The order is fixed by
      // the keys and the insert order: with sequential scans off the statement reads an index, which returns rows in
      // key order, and both `id` and `user_id` are chosen to sort the same way, so it does not
      // matter which of the two indexes the planner picks.
      async function transfer(ownerFirst: boolean) {
        const [lowMem, highMem] = [newId('mem'), newId('mem')]
        const [lowUser, highUser] = [newId('usr'), newId('usr')]
        const [ownerMem, ownerUser, memberMem, memberUser] = ownerFirst
          ? [lowMem, lowUser, highMem, highUser]
          : [highMem, highUser, lowMem, lowUser]
        const orgId = newId('org')
        created.add(orgId)
        await inOrg(orgId, async (c) => {
          await insertOrganization(c, orgId)
          // Inserted in key order whichever one is the Owner. Every member has the same email, so
          // the planner may also pick `memberships_organization_email_idx`, which returns equal keys
          // in physical order: inserting the Owner first made that plan process the Owner row first
          // and the "promoted row first" case fail whenever the planner chose it.
          const rows = [
            { id: ownerMem, user: ownerUser, role: 'owner' },
            { id: memberMem, user: memberUser, role: 'rep' },
          ].sort((x, y) => (x.id < y.id ? -1 : 1))
          for (const row of rows) {
            await insertMember(c, orgId, row.user, row.role, row.id)
          }
        })
        const result = await scoped(core, orgId, async (c) => {
          await c.query('set local enable_seqscan = off')
          await c.query('set local enable_bitmapscan = off')
          return c.query(
            `update core.memberships
                set role = case when id = $1 then 'rep' else 'owner' end
              where organization_id = $3 and id = any($2::text[])`,
            [ownerMem, [ownerMem, memberMem], orgId]
          )
        })
        return { orgId, result }
      }

      test('the Owner row first: refused as the last Owner, though the end state has one', async () => {
        const refused = await failure(transfer(true))
        expect(refused.message).toContain('core.last_owner')
      })

      test('the promoted row first: allowed, and the Organization ends with exactly one Owner', async () => {
        const { orgId, result } = await transfer(false)
        expect(result.rowCount).toBe(2)
        expect(await ownersOf(orgId)).toEqual({ actual: 1, counter: 1 })
      })
    })

    test('opposite-order updates around the Owner lock deadlock (40P01), so callers retry', async () => {
      const first = await createOrg()
      const orgId = first.orgId
      const second = await addMember(orgId, 'owner')
      const rep = await addMember(orgId, 'rep')
      const c1 = await track(await core.connect())
      const c2 = await track(await core.connect())
      try {
        for (const c of [c1, c2]) {
          await c.query('begin')
          await c.query('select set_config($1, $2, true)', [SETTING, orgId])
        }
        // c1 holds the rep's row, c2 holds an Owner's row and the Organization's Owner counter.
        await c1.query("update core.memberships set role = 'admin' where id = $1", [rep.id])
        await c2.query("update core.memberships set role = 'rep' where id = $1", [
          first.membershipId,
        ])
        // c1 now wants the counter (a second Owner demotion), c2 wants the rep's row: a cycle.
        const p1 = c1
          .query("update core.memberships set role = 'rep' where id = $1", [second.id])
          .then(
            () => 'ok',
            (e: { code?: string }) => e.code
          )
        await waitUntilBlocked(c1)
        const p2 = c2
          .query("update core.memberships set role = 'manager' where id = $1", [rep.id])
          .then(
            () => 'ok',
            (e: { code?: string }) => e.code
          )
        const outcomes = await Promise.all([p1, p2])
        expect(outcomes.filter((o) => o === '40P01')).toHaveLength(1)
        expect(outcomes.filter((o) => o === 'ok')).toHaveLength(1)
        await c1.query('rollback')
        await c2.query('rollback')
      } finally {
        c1.release()
        c2.release()
      }
      expect(await ownersOf(orgId)).toEqual({ actual: 2, counter: 2 })
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
          `insert into core.memberships (id, organization_id, user_id, role, email)
           select 'mem_' || md5('m' || n || $1), $1, 'usr_' || md5('u' || n || $1), 'rep', 'member@example.test'
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
            `insert into core.memberships (id, organization_id, user_id, role, email)
             select 'mem_' || md5('m' || n || $1), $1, 'usr_' || md5('u' || n || $1), 'rep', 'member@example.test'
               from generate_series(1, 100) n`,
            [other.orgId]
          )
        )
      }
      // Pending invitations too, so the planner has statistics to choose their list index on.
      await scoped(owner, orgId, (c) =>
        c.query(
          `insert into core.invitations
             (id, organization_id, email, role, invited_by_user_id, token_hash, created_at, expires_at)
           select 'inv_' || md5('i' || n || $1), $1, 'e' || n || '@example.com', 'rep',
                  'usr_' || md5('b' || n || $1), md5('t' || n || $1) || md5('u' || n || $1),
                  now() - interval '1 hour' + n * interval '1 second', now() + interval '30 days'
             from generate_series(1, 1000) n`,
          [orgId]
        )
      )
      await owner.query('analyze core.memberships')
      await owner.query('analyze core.team_members')
      await owner.query('analyze core.invitations')
    })

    const A = () => `'${orgId}'`
    // The index each list may use: the pending list is answered by its own partial index or, equally
    // well, by the all-states index added for the other states (same columns, same order).
    const cases: [string, () => string, string[]][] = [
      [
        'members of an Organization',
        () =>
          `select id from core.memberships where organization_id = ${A()} and id > 'mem_0' order by id limit 50`,
        ['memberships_organization_id_id_key'],
      ],
      [
        'Teams of an Organization',
        () =>
          `select id from core.teams where organization_id = ${A()} and name_key > 'a' order by name_key limit 50`,
        ['teams_organization_name_key'],
      ],
      [
        'members of a Team',
        () =>
          `select membership_id from core.team_members where organization_id = ${A()} and team_id = '${teamId}' and membership_id > 'mem_0' order by membership_id limit 50`,
        ['team_members_pkey'],
      ],
      [
        'Teams of a membership',
        () =>
          `select team_id from core.team_members where organization_id = ${A()} and membership_id = '${membershipId}' and team_id > 'team_0' order by team_id limit 50`,
        ['team_members_membership_idx'],
      ],
      [
        'pending invitations',
        () =>
          `select id from core.invitations where organization_id = ${A()} and state = 'pending' and (created_at, id) > ('2020-01-01', 'inv_0') order by created_at, id limit 50`,
        ['invitations_pending_list_idx', 'invitations_state_list_idx'],
      ],
    ]

    test.each(cases)('%s', async (_name, query, indexes) => {
      const plan = await inOrg(orgId, async (c) => {
        await c.query('set local enable_seqscan = off')
        return (await c.query(`explain (format json) ${query()}`)).rows[0]['QUERY PLAN']
      })
      const text = JSON.stringify(plan)
      expect(indexes.some((index) => text.includes(`"Index Name":"${index}"`))).toBe(true)
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
