import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { createDb, type DbHandle } from './client'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { assertTenantIsolation, findTenantIsolationGaps, NON_TENANT_TABLES } from './isolation'
import { voiceTwilioCalls } from './schema'
import { withOrganization } from './tenant'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const TENANT_TABLES: string[] = ['twilio_calls', 'twilio_recordings', 'twilio_placements']
const MEMBER = `mem_${'1'.repeat(32)}`

const newOrg = (): string => `org_${randomBytes(16).toString('hex')}`
let n = 0
const fresh = (prefix: string): string => `${prefix}${++n}${randomBytes(4).toString('hex')}`
const inOneHour = "now() + interval '1 hour'"

/** Run `promise` and describe the error it rejected with, failing if it resolved. */
async function failure(promise: PromiseLike<unknown>) {
  try {
    await promise
  } catch (error) {
    const e = error as { message?: string; code?: string; constraint?: string }
    return { message: e.message ?? String(error), code: e.code, constraint: e.constraint }
  }
  throw new Error('expected the statement to be refused, but it succeeded')
}

describe('voice twilio store tables', () => {
  let owner: Pool
  let voice: Pool
  let core: Pool
  let auth: Pool
  let playbook: Pool
  let handle: DbHandle
  const orgs: string[] = []

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

  const putCall = (orgId: string, id: string, extra = '') =>
    scoped(voice, orgId, (c) =>
      c.query(
        `insert into voice.twilio_calls (organization_id, provider_call_id, direction, expires_at)
         values ($1, $2, 'outbound', ${inOneHour}) ${extra}`,
        [orgId, id]
      )
    )
  const putRecording = (orgId: string, recordingId: string, callId: string) =>
    scoped(voice, orgId, (c) =>
      c.query(
        'insert into voice.twilio_recordings (organization_id, recording_id, provider_call_id) values ($1, $2, $3)',
        [orgId, recordingId, callId]
      )
    )
  const putPlacement = (orgId: string, key: string, callId: string) =>
    scoped(voice, orgId, (c) =>
      c.query(
        `insert into voice.twilio_placements (organization_id, idempotency_key, provider_call_id, fingerprint, expires_at)
         values ($1, $2, $3, 'abc123', ${inOneHour})`,
        [orgId, key, callId]
      )
    )
  const ownerOf = async (kind: string, id: string) =>
    (
      await scoped(voice, null, (c) =>
        c.query<{ organization_id: string; provider_call_id: string }>(
          'select * from voice.twilio_owner($1, $2)',
          [kind, id]
        )
      )
    ).rows
  const newScoped = (): string => {
    const id = newOrg()
    orgs.push(id)
    return id
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    voice = new Pool({ connectionString: env.voice, max: 4 })
    core = new Pool({ connectionString: env.core, max: 1 })
    auth = new Pool({ connectionString: env.auth, max: 1 })
    playbook = new Pool({ connectionString: env.playbook, max: 1 })
    await dropStaleTestObjects(owner, env.owner)
    handle = createDb(env.voice, { max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      for (const table of ['twilio_placements', 'twilio_calls']) {
        await scoped(voice, orgId, (c) =>
          c.query(`delete from voice.${table} where organization_id = $1`, [orgId])
        ).catch(() => undefined)
      }
    }
    await Promise.all([
      owner.end(),
      voice.end(),
      core.end(),
      auth.end(),
      playbook.end(),
      handle.close(),
    ])
  }, 60_000)

  describe('tenant isolation', () => {
    let a: string
    let b: string
    let callA: string
    let recA: string
    let keyA: string

    beforeAll(async () => {
      a = newScoped()
      b = newScoped()
      callA = fresh('CA')
      recA = fresh('RE')
      keyA = fresh('key')
      await putCall(a, callA)
      await putRecording(a, recA, callA)
      await putPlacement(a, keyA, callA)
    })

    test.each(TENANT_TABLES)(
      '%s: with no Organization set nothing is seen or written',
      async (table) => {
        const rows = await scoped(voice, null, (c) => c.query(`select * from voice.${table}`))
        expect(rows.rowCount).toBe(0)
        const inserts: Record<string, string> = {
          twilio_calls: `insert into voice.twilio_calls (organization_id, provider_call_id, direction, expires_at) values ($1, 'CAx', 'inbound', ${inOneHour})`,
          twilio_recordings:
            "insert into voice.twilio_recordings (organization_id, recording_id, provider_call_id) values ($1, 'REx', 'CAx')",
          twilio_placements: `insert into voice.twilio_placements (organization_id, idempotency_key, provider_call_id, fingerprint, expires_at) values ($1, 'k', 'CAx', 'f', ${inOneHour})`,
        }
        const refused = await failure(
          scoped(voice, null, (c) => c.query(inserts[table] ?? '', [a]))
        )
        expect(refused.message).toContain('row-level security')
      }
    )

    test('a second Organization cannot insert a row for the first', async () => {
      const call = await failure(
        scoped(voice, b, (c) =>
          c.query(
            `insert into voice.twilio_calls (organization_id, provider_call_id, direction, expires_at)
             values ($1, $2, 'inbound', ${inOneHour})`,
            [a, fresh('CA')]
          )
        )
      )
      expect(call.message).toContain('row-level security')
      const placement = await failure(
        scoped(voice, b, (c) =>
          c.query(
            `insert into voice.twilio_placements (organization_id, idempotency_key, provider_call_id, fingerprint, expires_at)
             values ($1, 'k', $2, 'f', ${inOneHour})`,
            [a, callA]
          )
        )
      )
      expect(placement.message).toContain('row-level security')
    })

    test('a second Organization cannot read, lock, update or remove the first rows', async () => {
      for (const table of TENANT_TABLES) {
        const seen = await scoped(voice, b, (c) =>
          c.query(
            `select 1 from voice.${table} where organization_id = $1 ${table === 'twilio_calls' ? 'for update' : ''}`,
            [a]
          )
        )
        expect([table, seen.rowCount]).toEqual([table, 0])
        const removed = await scoped(voice, b, (c) =>
          c.query(`delete from voice.${table} where organization_id = $1`, [a])
        )
        expect([table, removed.rowCount]).toEqual([table, 0])
      }
      const updated = await scoped(voice, b, (c) =>
        c.query('update voice.twilio_calls set bridged_to = $1 where organization_id = $2', [
          MEMBER,
          a,
        ])
      )
      expect(updated.rowCount).toBe(0)
      const own = await scoped(voice, a, (c) =>
        c.query('select 1 from voice.twilio_calls where provider_call_id = $1', [callA])
      )
      expect(own.rowCount).toBe(1)
    })

    test('the typed schema reads and writes through withOrganization', async () => {
      const id = fresh('CA')
      await withOrganization(handle.db, a, (tx) =>
        tx.insert(voiceTwilioCalls).values({
          organizationId: a,
          providerCallId: id,
          direction: 'inbound',
          ringIdentities: [MEMBER],
          expiresAt: new Date(Date.now() + 3_600_000),
        })
      )
      const mine = await withOrganization(handle.db, a, (tx) => tx.select().from(voiceTwilioCalls))
      expect(mine.find((r) => r.providerCallId === id)?.ringIdentities).toEqual([MEMBER])
      const theirs = await withOrganization(handle.db, b, (tx) =>
        tx.select().from(voiceTwilioCalls)
      )
      expect(theirs.find((r) => r.providerCallId === id)).toBeUndefined()
    })

    test('the owner function answers for a call and a Recording before the Organization is known', async () => {
      expect(await ownerOf('call', callA)).toEqual([
        { organization_id: a, provider_call_id: callA },
      ])
      expect(await ownerOf('recording', recA)).toEqual([
        { organization_id: a, provider_call_id: callA },
      ])
      expect(await ownerOf('call', recA)).toEqual([])
      expect(await ownerOf('recording', callA)).toEqual([])
      expect(await ownerOf('call', 'CAunknown')).toEqual([])
      expect(await ownerOf('other', callA)).toEqual([])
    })

    test('a provider call or Recording of one Organization cannot be claimed by another', async () => {
      const call = await failure(putCall(b, callA))
      expect(call.code).toBe('23505')
      expect(call.constraint).toBe('twilio_directory_pkey')
      const ownAgain = await failure(putCall(a, callA))
      expect(ownAgain.code).toBe('23505')
      const bCall = fresh('CA')
      await putCall(b, bCall)
      const recording = await failure(putRecording(b, recA, bCall))
      expect(recording.constraint).toBe('twilio_directory_pkey')
      expect(await ownerOf('call', callA)).toEqual([
        { organization_id: a, provider_call_id: callA },
      ])
      const gone = await scoped(voice, b, (c) =>
        c.query('select 1 from voice.twilio_calls where provider_call_id = $1', [callA])
      )
      expect(gone.rowCount).toBe(0)
    })

    test('claiming a call twice with ON CONFLICT DO NOTHING keeps the first record', async () => {
      const id = fresh('CA')
      await putCall(a, id)
      const second = await putCall(a, id, 'on conflict do nothing')
      expect(second.rowCount).toBe(0)
    })

    test('a Recording must belong to a call of the same Organization', async () => {
      const refused = await failure(putRecording(b, fresh('RE'), callA))
      expect(refused.message).toMatch(/foreign key|row-level security/)
      expect(refused.code).toBe('23503')
    })

    test('removing a call removes its Recordings and directory entries', async () => {
      const call = fresh('CA')
      const rec = fresh('RE')
      await putCall(a, call)
      await putRecording(a, rec, call)
      expect(await ownerOf('recording', rec)).toHaveLength(1)
      await scoped(voice, a, (c) =>
        c.query('delete from voice.twilio_calls where provider_call_id = $1', [call])
      )
      expect(await ownerOf('call', call)).toEqual([])
      expect(await ownerOf('recording', rec)).toEqual([])
      const left = await scoped(voice, a, (c) =>
        c.query('select 1 from voice.twilio_recordings where recording_id = $1', [rec])
      )
      expect(left.rowCount).toBe(0)
      // the id is free again for any Organization
      await putCall(b, call)
      expect(await ownerOf('call', call)).toEqual([{ organization_id: b, provider_call_id: call }])
    })

    test('the same idempotency key is separate per Organization, and unique within one', async () => {
      const callB = fresh('CA')
      await putCall(b, callB)
      await putPlacement(b, keyA, callB)
      const again = await failure(putPlacement(a, keyA, callA))
      expect(again.code).toBe('23505')
      const mine = await scoped(voice, a, (c) =>
        c.query<{ provider_call_id: string }>(
          'select provider_call_id from voice.twilio_placements where idempotency_key = $1',
          [keyA]
        )
      )
      expect(mine.rows).toEqual([{ provider_call_id: callA }])
    })
  })

  describe('rows are checked', () => {
    let a: string
    beforeAll(() => {
      a = newScoped()
    })

    const withCols = (cols: string, vals: string) =>
      scoped(voice, a, (c) =>
        c.query(
          `insert into voice.twilio_calls (organization_id, provider_call_id, direction, expires_at, ${cols})
           values ($1, $2, 'outbound', ${inOneHour}, ${vals})`,
          [a, fresh('CA')]
        )
      )

    test('a Disclosure is all or nothing', async () => {
      expect((await failure(withCols('disclosure_wording_version', '1'))).constraint).toBe(
        'twilio_calls_disclosure_all_or_none'
      )
      await withCols(
        'disclosure_wording_version, disclosure_ai_assisted, disclosure_played_at',
        'null, null, null'
      )
      await withCols(
        'disclosure_wording_version, disclosure_ai_assisted, disclosure_played_at, disclosure_started',
        'null, null, null, false'
      )
      await withCols(
        'disclosure_wording_version, disclosure_ai_assisted, disclosure_played_at, disclosure_started',
        'null, null, null, false'
      )
      await withCols(
        'disclosure_wording_version, disclosure_ai_assisted, disclosure_played_at, disclosure_started',
        '2, true, now(), true'
      )
    })

    test('ids, ring identities and expiry are checked', async () => {
      const bad = async (cols: string, vals: string) =>
        (await failure(withCols(cols, vals))).constraint
      expect(await bad('call_id', "'x'")).toBe('twilio_calls_call_id_shape')
      expect(await bad('bridged_to', "'x'")).toBe('twilio_calls_bridged_to_shape')
      expect(await bad('ring_identities', "array['x']")).toBe('twilio_calls_ring_identities_bounds')
      expect(await bad('ring_identities', `array['${MEMBER}', null]`)).toBe(
        'twilio_calls_ring_identities_bounds'
      )
      const refused = await failure(
        scoped(voice, a, (c) =>
          c.query(
            `insert into voice.twilio_calls (organization_id, provider_call_id, direction, expires_at)
             values ($1, 'has space', 'outbound', ${inOneHour})`,
            [a]
          )
        )
      )
      expect(refused.constraint).toBe('twilio_calls_provider_call_id_shape')
      const expired = await failure(
        scoped(voice, a, (c) =>
          c.query(
            `insert into voice.twilio_calls (organization_id, provider_call_id, direction, expires_at)
             values ($1, $2, 'outbound', now() - interval '1 day')`,
            [a, fresh('CA')]
          )
        )
      )
      expect(expired.constraint).toBe('twilio_calls_expires_after_creation')
    })

    test('the Organization and provider call id of a record never change', async () => {
      const id = fresh('CA')
      await putCall(a, id)
      const refused = await failure(
        scoped(voice, a, (c) =>
          c.query(
            "update voice.twilio_calls set provider_call_id = 'CAother' where provider_call_id = $1",
            [id]
          )
        )
      )
      expect(refused.constraint).toBe('twilio_calls_identity')
      await scoped(voice, a, (c) =>
        c.query('update voice.twilio_calls set recording_id = $2 where provider_call_id = $1', [
          id,
          'RE1',
        ])
      )
    })
  })

  describe('privileges', () => {
    const privilege = async (role: string, table: string, what: string) =>
      (
        await owner.query<{ ok: boolean }>('select has_table_privilege($1, $2, $3) as ok', [
          role,
          `voice.${table}`,
          what,
        ])
      ).rows[0]?.ok

    test('closeline_voice holds exactly the privileges each table needs', async () => {
      const expected: Record<string, string[]> = {
        twilio_calls: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
        twilio_recordings: ['SELECT', 'INSERT', 'DELETE'],
        twilio_placements: ['SELECT', 'INSERT', 'DELETE'],
        twilio_directory: [],
      }
      for (const [table, allowed] of Object.entries(expected)) {
        for (const what of [
          'SELECT',
          'INSERT',
          'UPDATE',
          'DELETE',
          'TRUNCATE',
          'REFERENCES',
          'TRIGGER',
        ]) {
          expect([table, what, await privilege('closeline_voice', table, what)]).toEqual([
            table,
            what,
            allowed.includes(what),
          ])
        }
      }
    })

    test('no other role holds any privilege', async () => {
      for (const table of [...TENANT_TABLES, 'twilio_directory']) {
        for (const role of ['closeline_auth', 'closeline_core', 'closeline_playbook', 'public']) {
          for (const what of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) {
            expect([table, role, what, await privilege(role, table, what)]).toEqual([
              table,
              role,
              what,
              false,
            ])
          }
        }
      }
    })

    test('closeline_voice cannot read the directory directly, and may run only the owner function', async () => {
      const refused = await failure(
        scoped(voice, null, (c) => c.query('select * from voice.twilio_directory'))
      )
      expect(refused.message).toContain('permission denied')
      const run = async (role: string, fn: string) =>
        (
          await owner.query<{ ok: boolean }>('select has_function_privilege($1, $2, $3) as ok', [
            role,
            fn,
            'EXECUTE',
          ])
        ).rows[0]?.ok
      expect(await run('closeline_voice', 'voice.twilio_owner(text, text)')).toBe(true)
      for (const role of ['closeline_core', 'closeline_auth', 'closeline_playbook', 'public']) {
        expect(await run(role, 'voice.twilio_owner(text, text)')).toBe(false)
      }
      for (const fn of [
        'voice.sync_twilio_call_directory()',
        'voice.sync_twilio_recording_directory()',
        'voice.refuse_twilio_call_identity_change()',
      ]) {
        expect(await run('closeline_voice', fn)).toBe(false)
      }
    })

    test.each([
      ['closeline_auth', () => auth],
      ['closeline_core', () => core],
      ['closeline_playbook', () => playbook],
    ])('%s is refused', async (_role, pool) => {
      const refused = await failure(
        scoped(pool(), newScoped(), (c) => c.query('select * from voice.twilio_calls'))
      )
      expect(refused.message).toContain('permission denied for schema voice')
    })

    test('TRUNCATE is refused for the owner, so the directory cannot fall out of step', async () => {
      for (const table of ['twilio_calls', 'twilio_recordings', 'twilio_directory']) {
        const refused = await failure(owner.query(`truncate voice.${table} cascade`))
        expect([table, refused.message]).toEqual([
          table,
          expect.stringContaining('truncate_refused') as unknown as string,
        ])
      }
    })

    test('the catalog check lists only the directory as exempt and the tenant tables fail closed', async () => {
      expect(NON_TENANT_TABLES).toContain('voice.twilio_directory')
      for (const table of TENANT_TABLES) {
        expect(NON_TENANT_TABLES).not.toContain(`voice.${table}`)
      }
      expect(await findTenantIsolationGaps(handle.db)).toEqual([])
      await assertTenantIsolation(handle.db)
      try {
        await owner.query('drop policy "twilio_calls_tenant_isolation" on voice.twilio_calls')
        const gaps = (await findTenantIsolationGaps(handle.db)).filter(
          (gap) => gap.table === 'twilio_calls'
        )
        expect(gaps.length).toBe(1)
      } finally {
        await owner
          .query(
            `create policy "twilio_calls_tenant_isolation" on voice.twilio_calls as permissive for all to public using ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) with check ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''))`
          )
          .catch(() => undefined)
      }
      expect(await findTenantIsolationGaps(handle.db)).toEqual([])
    })
  })

  describe('twilio_orgs_with_expired', () => {
    const PAST = "now() - interval '1 hour'"
    const created = "now() - interval '3 hours'"
    const bulk: string[] = []

    /** Insert one row into a table of the store, expired (`expires_at` an hour ago) or not. */
    const put = (
      table: 'twilio_calls' | 'twilio_placements',
      orgId: string,
      expired: boolean
    ): Promise<unknown> =>
      scoped(voice, orgId, (c) =>
        table === 'twilio_calls'
          ? c.query(
              `insert into voice.twilio_calls (organization_id, provider_call_id, direction, created_at, expires_at)
               values ($1, $2, 'outbound', ${expired ? created : 'now()'}, ${expired ? PAST : inOneHour})`,
              [orgId, fresh('CA')]
            )
          : c.query(
              `insert into voice.twilio_placements (organization_id, idempotency_key, provider_call_id, fingerprint, created_at, expires_at)
               values ($1, $2, $3, 'abc123', ${expired ? created : 'now()'}, ${expired ? PAST : inOneHour})`,
              [orgId, fresh('key'), fresh('CA')]
            )
      )

    const scan = async (now: string | null, after: string | null, limit: number | null) =>
      (
        await scoped(voice, null, (c) =>
          c.query<{ organization_id: string }>(
            'select * from voice.twilio_orgs_with_expired($1::timestamptz, $2::text, $3::int)',
            [now, after, limit]
          )
        )
      ).rows.map((r) => r.organization_id)

    /** Page through every Organization with expired rows, `size` at a time, returning each page. */
    async function pages(size: number): Promise<string[][]> {
      const out: string[][] = []
      let after: string | null = null
      for (;;) {
        const page: string[] = await scan(new Date().toISOString(), after, size)
        if (page.length === 0) {
          return out
        }
        out.push(page)
        after = page[page.length - 1] ?? null
      }
    }

    afterAll(async () => {
      for (const orgId of bulk) {
        for (const table of ['twilio_placements', 'twilio_calls']) {
          await scoped(voice, orgId, (c) =>
            c.query(`delete from voice.${table} where organization_id = $1`, [orgId])
          ).catch(() => undefined)
        }
      }
    }, 60_000)

    test('lists an Organization once whichever table holds its expired rows, and never one with only unexpired rows', async () => {
      const callsOnly = newScoped()
      const placementsOnly = newScoped()
      const both = newScoped()
      const live = newScoped()
      const mixed = newScoped()
      await put('twilio_calls', callsOnly, true)
      await put('twilio_placements', placementsOnly, true)
      await put('twilio_calls', both, true)
      await put('twilio_calls', both, true)
      await put('twilio_placements', both, true)
      await put('twilio_calls', live, false)
      await put('twilio_placements', live, false)
      await put('twilio_calls', mixed, false)
      await put('twilio_placements', mixed, true)
      const mine = new Set([callsOnly, placementsOnly, both, live, mixed])
      const found = (await scan(new Date().toISOString(), null, 500)).filter((o) => mine.has(o))
      expect(found).toEqual([callsOnly, placementsOnly, both, mixed].sort())
    })

    test('a row is expired at its expiry instant and not a moment before', async () => {
      const org = newScoped()
      await scoped(voice, org, (c) =>
        c.query(
          `insert into voice.twilio_calls (organization_id, provider_call_id, direction, created_at, expires_at)
           values ($1, $2, 'inbound', '2030-01-01T00:00:00Z', '2030-01-01T01:00:00Z')`,
          [org, fresh('CA')]
        )
      )
      expect(await scan('2030-01-01T00:59:59Z', org.slice(0, -1), 500)).not.toContain(org)
      expect(await scan('2030-01-01T01:00:00Z', org.slice(0, -1), 500)).toContain(org)
    })

    test('a null clock or a limit below one gives nothing', async () => {
      const org = newScoped()
      await put('twilio_calls', org, true)
      const now = new Date().toISOString()
      expect(await scan(null, null, 500)).toEqual([])
      expect(await scan(now, null, 0)).toEqual([])
      expect(await scan(now, null, -5)).toEqual([])
      expect(await scan(now, null, null)).toEqual([])
    })

    test('pages in ascending order after the cursor, each Organization once, with no gaps', async () => {
      const mine = [newScoped(), newScoped(), newScoped(), newScoped(), newScoped()]
      for (const [i, org] of mine.entries()) {
        await put(i % 2 === 0 ? 'twilio_calls' : 'twilio_placements', org, true)
      }
      const all = (await pages(2)).flatMap((page) => {
        expect(page.length).toBeLessThanOrEqual(2)
        expect(page).toEqual([...page].sort())
        return page
      })
      expect(all).toEqual([...all].sort())
      expect(new Set(all).size).toBe(all.length)
      for (const org of mine) {
        expect(all).toContain(org)
      }
      // The cursor is exclusive: asking after an Organization never returns it or anything below.
      const [first, second, third] = [...mine].sort() as [string, string, string]
      const after = await scan(new Date().toISOString(), second, 500)
      expect(after).not.toContain(first)
      expect(after).not.toContain(second)
      expect(after).toContain(third)
      expect(after.every((o) => o > second)).toBe(true)
      // Past the last Organization, nothing.
      expect(await scan(new Date().toISOString(), `org_${'f'.repeat(32)}`, 500)).toEqual([])
    })

    test('a limit of at most 500 is honoured and a larger one is cut to 500', async () => {
      const count = 520
      await scoped(voice, null, (c) =>
        c.query(
          `do $$
           declare o text;
           begin
             for i in 1..${count} loop
               o := 'org_' || lpad(to_hex(i), 32, 'e');
               perform set_config('app.organization_id', o, true);
               insert into voice.twilio_calls (organization_id, provider_call_id, direction, created_at, expires_at)
                 values (o, 'CAbulk' || i, 'outbound', ${created}, ${PAST});
             end loop;
           end $$`
        )
      )
      for (let i = 1; i <= count; i++) {
        bulk.push(`org_${i.toString(16).padStart(32, 'e')}`)
      }
      const now = new Date().toISOString()
      expect(await scan(now, null, 3)).toHaveLength(3)
      expect(await scan(now, null, 500)).toHaveLength(500)
      expect(await scan(now, null, 501)).toHaveLength(500)
      expect(await scan(now, null, 1_000_000)).toHaveLength(500)
    })

    test('returns Organization ids only, never a column of a row', async () => {
      const org = newScoped()
      await put('twilio_calls', org, true)
      const result = await scoped(voice, null, (c) =>
        c.query('select * from voice.twilio_orgs_with_expired(now(), null, 500)')
      )
      expect(result.fields.map((f) => f.name)).toEqual(['organization_id'])
    })

    test('only closeline_voice may execute it, and every other role is refused', async () => {
      const sig = 'voice.twilio_orgs_with_expired(timestamptz, text, integer)'
      const run = async (role: string) =>
        (
          await owner.query<{ ok: boolean }>('select has_function_privilege($1, $2, $3) as ok', [
            role,
            sig,
            'EXECUTE',
          ])
        ).rows[0]?.ok
      expect(await run('closeline_voice')).toBe(true)
      for (const role of ['closeline_core', 'closeline_auth', 'closeline_playbook', 'public']) {
        expect([role, await run(role)]).toEqual([role, false])
      }
      for (const pool of [core, auth, playbook]) {
        const refused = await failure(
          scoped(pool, null, (c) =>
            c.query('select * from voice.twilio_orgs_with_expired(now(), null, 5)')
          )
        )
        expect(refused.message).toContain('permission denied')
      }
    })
  })
})
