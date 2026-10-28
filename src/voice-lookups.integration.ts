import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes, randomInt } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { createDb, type DbHandle } from './client'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { lineForNumber } from './voice-lookups'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const SERVICE_ROLES = ['closeline_auth', 'closeline_core', 'closeline_playbook', 'closeline_voice']

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`
const newNumber = (): string => `+1${randomInt(2_000_000_000, 9_999_999_999)}`

describe('the voice line lookup', () => {
  let owner: Pool
  let voice: Pool
  let core: Pool
  let auth: Pool
  let playbook: Pool
  let handle: DbHandle
  const orgs: string[] = []

  /** Run `fn` in one transaction scoped to `orgId` (or to none) on the given pool's role. */
  async function scoped<T>(
    pool: Pool,
    orgId: string | null,
    fn: (c: PoolClient) => Promise<T>
  ): Promise<T> {
    const c = await pool.connect()
    try {
      await c.query('begin')
      if (orgId) {
        await c.query('select set_config($1, $2, true)', [SETTING, orgId])
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

  /** The error a statement is refused with; fails the test when it succeeds. */
  async function refusal(promise: Promise<unknown>): Promise<{ code?: string; message: string }> {
    try {
      await promise
    } catch (error) {
      return error as { code?: string; message: string }
    }
    throw new Error('expected the statement to be refused')
  }

  /** An Organization in core (with its Owner, as the service creates it), tracked for cleanup. */
  async function createOrg(): Promise<string> {
    const orgId = newId('org')
    orgs.push(orgId)
    await scoped(core, orgId, async (c) => {
      await c.query(
        'insert into core.organizations (organization_id, name, region) values ($1, $2, $3)',
        [orgId, `Org ${orgId.slice(-6)}`, 'us']
      )
      await c.query(
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, 'owner', 'owner@example.test')",
        [newId('mem'), orgId, newId('usr')]
      )
    })
    return orgId
  }

  const setStatus = (orgId: string, status: string) =>
    scoped(core, orgId, (c) =>
      c.query('update core.organizations set status = $2 where organization_id = $1', [
        orgId,
        status,
      ])
    )

  const addLine = async (orgId: string, state = 'active', number = newNumber()) => {
    const id = newId('line')
    await scoped(voice, orgId, (c) =>
      c.query(
        'insert into voice.lines (id, organization_id, number, country, state, released_at) values ($1, $2, $3, $4, $5, case when $5 = $6 then now() end)',
        [id, orgId, number, 'US', state, 'released']
      )
    )
    return { id, number }
  }

  const release = (orgId: string, lineId: string) =>
    scoped(voice, orgId, (c) =>
      c.query("update voice.lines set state = 'released', released_at = now() where id = $1", [
        lineId,
      ])
    )

  const lookup = (number: string) => lineForNumber(handle.db, number)

  const rawLookup = (pool: Pool, scope: string | null, number: string | null) =>
    scoped(
      pool,
      scope,
      async (c) =>
        (await c.query('select * from voice.line_for_number($1)', [number])).rows as {
          organization_id: string
          line_id: string
        }[]
    )

  const directoryRows = async (number: string) =>
    (await owner.query('select * from voice.line_directory where number = $1', [number])).rows

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 1 })
    voice = new Pool({ connectionString: env.voice, max: 4 })
    core = new Pool({ connectionString: env.core, max: 2 })
    auth = new Pool({ connectionString: env.auth, max: 1 })
    playbook = new Pool({ connectionString: env.playbook, max: 1 })
    handle = createDb(env.voice, { max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      await scoped(voice, orgId, (c) => c.query('delete from voice.lines')).catch(() => undefined)
      await scoped(core, orgId, (c) =>
        c.query('delete from core.organizations where organization_id = $1', [orgId])
      ).catch(() => undefined)
    }
    await dropStaleTestObjects(owner, env.owner)
    await handle.close()
    await Promise.all([owner.end(), voice.end(), core.end(), auth.end(), playbook.end()])
  })

  test('an active Line of an active Organization answers with exactly its ids', async () => {
    const orgId = await createOrg()
    const line = await addLine(orgId)
    expect(await lookup(line.number)).toEqual({ organizationId: orgId, lineId: line.id })
  })

  test('an unknown number and a malformed one give nothing', async () => {
    expect(await lookup(newNumber())).toBeNull()
    for (const probe of ['', '+1%', '%', '+', 'null', '+14155550123 ']) {
      expect(await lookup(probe)).toBeNull()
    }
    // The database itself also answers nothing to a pattern, an empty value or NULL.
    for (const probe of ['+1%', '+1_________', '', null]) {
      expect(await rawLookup(voice, null, probe)).toEqual([])
    }
  })

  test('a Line still porting and a released Line give nothing', async () => {
    const orgId = await createOrg()
    const porting = await addLine(orgId, 'porting')
    const released = await addLine(orgId, 'released')
    expect(await lookup(porting.number)).toBeNull()
    expect(await lookup(released.number)).toBeNull()
    expect(await directoryRows(released.number)).toEqual([])
    expect(await directoryRows(porting.number)).toHaveLength(1)
  })

  test('a Line answers once it goes active and stops when it is released', async () => {
    const orgId = await createOrg()
    const line = await addLine(orgId, 'porting')
    expect(await lookup(line.number)).toBeNull()
    await scoped(voice, orgId, (c) =>
      c.query("update voice.lines set state = 'active' where id = $1", [line.id])
    )
    expect(await lookup(line.number)).toEqual({ organizationId: orgId, lineId: line.id })
    await release(orgId, line.id)
    expect(await lookup(line.number)).toBeNull()
    expect(await directoryRows(line.number)).toEqual([])
  })

  test('a released number can be taken by another Organization, and touching the old Line again removes nothing of the new one', async () => {
    const a = await createOrg()
    const b = await createOrg()
    const first = await addLine(a)
    await release(a, first.id)
    const second = await addLine(b, 'active', first.number)
    expect(await lookup(first.number)).toEqual({ organizationId: b, lineId: second.id })
    await scoped(voice, a, (c) =>
      c.query('update voice.lines set number = $2 where id = $1', [first.id, newNumber()])
    )
    await scoped(voice, a, (c) => c.query('delete from voice.lines where id = $1', [first.id]))
    expect(await lookup(first.number)).toEqual({ organizationId: b, lineId: second.id })
  })

  test('an Organization that is suspended or deleted gives nothing, and one that is active again answers', async () => {
    const orgId = await createOrg()
    const line = await addLine(orgId)
    for (const status of ['suspended', 'deleted']) {
      await setStatus(orgId, status)
      expect(await lookup(line.number)).toBeNull()
      expect(await directoryRows(line.number)).toHaveLength(1)
    }
    await setStatus(orgId, 'active')
    expect(await lookup(line.number)).toEqual({ organizationId: orgId, lineId: line.id })
  })

  test('removing the Organization gives nothing', async () => {
    const orgId = await createOrg()
    const line = await addLine(orgId)
    await scoped(core, orgId, (c) =>
      c.query('delete from core.organizations where organization_id = $1', [orgId])
    )
    expect(await lookup(line.number)).toBeNull()
  })

  test('a renumbered Line loses its old number and answers on the new one', async () => {
    const orgId = await createOrg()
    const line = await addLine(orgId)
    const next = newNumber()
    await scoped(voice, orgId, (c) =>
      c.query('update voice.lines set number = $2 where id = $1', [line.id, next])
    )
    expect(await lookup(line.number)).toBeNull()
    expect(await directoryRows(line.number)).toEqual([])
    expect(await lookup(next)).toEqual({ organizationId: orgId, lineId: line.id })
  })

  test('removing one Line, or all of an Organization’s Lines, gives nothing', async () => {
    const orgId = await createOrg()
    const one = await addLine(orgId)
    const two = await addLine(orgId)
    const three = await addLine(orgId)
    await scoped(voice, orgId, (c) => c.query('delete from voice.lines where id = $1', [one.id]))
    expect(await lookup(one.number)).toBeNull()
    expect(await lookup(two.number)).not.toBeNull()
    await scoped(voice, orgId, (c) => c.query('delete from voice.lines'))
    expect(await lookup(two.number)).toBeNull()
    expect(await lookup(three.number)).toBeNull()
    expect(await directoryRows(three.number)).toEqual([])
  })

  test('the answer does not depend on the Organization the caller has set', async () => {
    const a = await createOrg()
    const b = await createOrg()
    const line = await addLine(a)
    for (const scope of [null, a, b]) {
      expect(await rawLookup(voice, scope, line.number)).toEqual([
        { organization_id: a, line_id: line.id },
      ])
    }
  })

  test('emptying voice.lines or voice.line_directory in bulk is refused, for the owner and the service', async () => {
    const orgId = await createOrg()
    const line = await addLine(orgId)
    for (const table of ['voice.lines', 'voice.line_directory']) {
      const asOwner = await refusal(owner.query(`truncate ${table}`))
      // voice.lines is also the target of foreign keys, which Postgres refuses first.
      expect(asOwner.message).toMatch(/voice\.truncate_refused|foreign key constraint/)
      const asVoice = await refusal(scoped(voice, orgId, (c) => c.query(`truncate ${table}`)))
      expect(asVoice.message).toMatch(/permission denied|voice\.truncate_refused/)
    }
    expect(await lookup(line.number)).not.toBeNull()
  })

  describe('closeline_voice cannot read or write the directory, only look a number up', () => {
    const zeros = (prefix: string) => `${prefix}_${'0'.repeat(32)}`

    test('every statement is refused, whatever the Organization set', async () => {
      const orgId = await createOrg()
      await addLine(orgId)
      const statements = [
        'select * from voice.line_directory',
        'select count(*) from voice.line_directory',
        'select number from voice.line_directory',
        `select 1 from voice.line_directory where organization_id = '${orgId}'`,
        'insert into voice.line_directory select * from voice.line_directory limit 0',
        `insert into voice.line_directory values ('+10000000000', '${zeros('org')}', '${zeros('line')}', 'active')`,
        'update voice.line_directory set organization_id = organization_id',
        'delete from voice.line_directory',
        'truncate voice.line_directory',
      ]
      for (const setting of [null, orgId]) {
        for (const statement of statements) {
          const refused = await refusal(scoped(voice, setting, (c) => c.query(statement)))
          expect(refused.message).toContain('permission denied for table')
        }
      }
    })

    test('no service role holds any privilege on it, column level included', async () => {
      const held = await owner.query<{ role: string; privilege: string }>(
        `select r.role, p.privilege
           from unnest($2::text[]) r(role)
           cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
                              ('REFERENCES'), ('TRIGGER')) p(privilege)
          where has_table_privilege(r.role, $1, p.privilege)
             or (p.privilege in ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES')
                 and has_any_column_privilege(r.role, $1, p.privilege))`,
        ['voice.line_directory', SERVICE_ROLES]
      )
      expect(held.rows).toEqual([])
    })

    test('closeline_voice still has no privilege on core', async () => {
      const refused = await refusal(
        scoped(voice, null, (c) => c.query('select * from core.organization_state'))
      )
      expect(refused.message).toContain('permission denied for schema core')
    })

    test('no other service role can run the lookup', async () => {
      for (const pool of [auth, core, playbook]) {
        const refused = await refusal(rawLookup(pool, null, newNumber()))
        expect(refused.message).toContain('permission denied for')
      }
    })
  })

  describe('every function in voice is owned, pinned and callable by exactly the roles meant to', () => {
    /** name: [SECURITY DEFINER, trigger function, closeline_voice may execute it]. */
    const FUNCTIONS: Record<string, [boolean, boolean, boolean]> = {
      line_for_number: [true, false, true],
      orgs_with_due_callbacks: [true, false, true],
      orgs_with_due_recordings: [true, false, true],
      orgs_with_stale_ringing: [true, false, true],
      orgs_with_stale_outbound: [true, false, true],
      refuse_agent_call_rewrite: [false, true, false],
      refuse_agent_call_truncate: [false, true, false],
      refuse_idempotency_rewrite: [false, true, false],
      refuse_truncate: [false, true, false],
      refuse_twilio_call_identity_change: [false, true, false],
      refuse_twilio_truncate: [false, true, false],
      sync_line_directory: [true, true, false],
      sync_twilio_call_directory: [true, true, false],
      sync_twilio_recording_directory: [true, true, false],
      twilio_orgs_with_expired: [true, false, true],
      twilio_owner: [true, false, true],
    }

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
      voice: boolean
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
                  has_function_privilege('closeline_playbook', p.oid, 'EXECUTE') as playbook,
                  has_function_privilege('closeline_voice', p.oid, 'EXECUTE') as voice
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'voice' and p.proname not like 'it\\_%' order by p.proname`
        )
      ).rows

    test('the set of functions is exactly the one classified here, so a new one must be', async () => {
      expect((await catalog()).map((f) => f.name)).toEqual(Object.keys(FUNCTIONS).sort())
    })

    test('each is owned by closeline_owner with search_path pinned, SECURITY DEFINER only where intended, and the lookup is STABLE', async () => {
      for (const fn of await catalog()) {
        const [definer, trigger] = FUNCTIONS[fn.name] ?? [false, false, false]
        expect([fn.name, fn.owner]).toEqual([
          fn.name,
          fn.name === 'twilio_orgs_with_expired' ||
          fn.name === 'orgs_with_stale_ringing' ||
          fn.name === 'orgs_with_stale_outbound' ||
          fn.name === 'orgs_with_due_callbacks' ||
          fn.name === 'orgs_with_due_recordings'
            ? 'closeline_voice_purge_scan'
            : 'closeline_owner',
        ])
        expect([fn.name, fn.config]).toEqual([fn.name, ['search_path=pg_catalog, pg_temp']])
        expect([fn.name, fn.definer]).toEqual([fn.name, definer])
        expect([fn.name, fn.trigger]).toEqual([fn.name, trigger])
        expect([fn.name, fn.volatility]).toEqual([
          fn.name,
          fn.name === 'line_for_number' ||
          fn.name === 'twilio_owner' ||
          fn.name === 'twilio_orgs_with_expired' ||
          fn.name === 'orgs_with_stale_ringing' ||
          fn.name === 'orgs_with_stale_outbound' ||
          fn.name === 'orgs_with_due_callbacks' ||
          fn.name === 'orgs_with_due_recordings'
            ? 's'
            : 'v',
        ])
      }
    })

    test('EXECUTE is revoked from PUBLIC on all of them and only the lookup is granted, to closeline_voice', async () => {
      for (const fn of await catalog()) {
        const voiceMayRun = FUNCTIONS[fn.name]?.[2] ?? false
        expect([fn.name, fn.has_acl, fn.public_execute]).toEqual([fn.name, true, false])
        expect([fn.name, fn.auth, fn.core, fn.playbook]).toEqual([fn.name, false, false, false])
        expect([fn.name, fn.voice]).toEqual([fn.name, voiceMayRun])
      }
    })

    test('no service role can fire a trigger function by calling it', async () => {
      for (const [name, [, trigger]] of Object.entries(FUNCTIONS)) {
        if (!trigger) {
          continue
        }
        for (const pool of [voice, core, auth, playbook]) {
          const refused = await refusal(
            scoped(pool, null, (c) => c.query(`select voice.${name}()`))
          )
          expect(refused.message).toMatch(/permission denied/)
        }
      }
    })
  })
})
