import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes, randomInt } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { createDb, type DbHandle } from './client'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { findTenantIsolationGaps } from './isolation'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const CHECK_VIOLATION = '23514'
const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'
const INSUFFICIENT_PRIVILEGE = '42501'

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`
const newNumber = (): string => `+1${randomInt(2_000_000_000, 9_999_999_999)}`

interface Seeded {
  orgId: string
  lineId: string
  callId: string
  eventId: string
  recordingId: string
}

/** One harmless update per table, used to prove a second Organization updates nothing. */
const UPDATES = {
  lines: "label = 'x'",
  calls: "note = 'x'",
  recordings: 'channels = 1',
} as const

describe('voice tables', () => {
  let voice: Pool
  let handle: DbHandle
  const orgs: string[] = []

  /** Run `fn` in one transaction scoped to `organizationId` (or to none), as the voice role. */
  async function scoped<T>(orgId: string | null, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await voice.connect()
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

  const run = (orgId: string | null, sql: string, values: unknown[] = []) =>
    scoped(orgId, (c) => c.query(sql, values))

  /** The error a statement is refused with; fails the test when it succeeds. */
  async function refusal(promise: Promise<unknown>): Promise<{ code?: string; message: string }> {
    try {
      await promise
    } catch (error) {
      return error as { code?: string; message: string }
    }
    throw new Error('expected the statement to be refused')
  }

  const countOf = (orgId: string | null, table: string) =>
    scoped(orgId, async (c) =>
      Number((await c.query(`select count(*) as n from voice.${table}`)).rows[0].n)
    )

  const addLine = async (orgId: string, state = 'active', number = newNumber()) => {
    const id = newId('line')
    await run(
      orgId,
      'insert into voice.lines (id, organization_id, number, country, state, released_at) values ($1, $2, $3, $4, $5, case when $5 = $6 then now() end)',
      [id, orgId, number, 'US', state, 'released']
    )
    return id
  }

  const addCall = async (orgId: string, lineId: string): Promise<string> => {
    const id = newId('call')
    await run(
      orgId,
      "insert into voice.calls (id, organization_id, direction, state, line_id, prospect_number) values ($1, $2, 'outbound', 'ringing', $3, $4)",
      [id, orgId, lineId, newNumber()]
    )
    return id
  }

  const addEvent = async (orgId: string, callId: string, providerEventId: string | null) => {
    const id = newId('vev')
    await run(
      orgId,
      "insert into voice.call_events (id, organization_id, call_id, kind, provider_event_id, occurred_at) values ($1, $2, $3, 'provider_callback', $4, now())",
      [id, orgId, callId, providerEventId]
    )
    return id
  }

  const addRecording = async (orgId: string, callId: string) => {
    const id = newId('rec')
    await run(
      orgId,
      'insert into voice.recordings (id, organization_id, call_id, storage_key, channels) values ($1, $2, $3, $4, 2)',
      [id, orgId, callId, `voice/${orgId}/${callId}.wav`]
    )
    return id
  }

  /** Create an Organization with one row in every voice table. */
  async function seed(): Promise<Seeded> {
    const orgId = newId('org')
    orgs.push(orgId)
    const lineId = await addLine(orgId)
    const callId = await addCall(orgId, lineId)
    const eventId = await addEvent(orgId, callId, newId('evt'))
    const recordingId = await addRecording(orgId, callId)
    return { orgId, lineId, callId, eventId, recordingId }
  }

  /** Remove an Organization's rows; deleting its Calls takes their events and Recordings along. */
  async function removeOrganization(orgId: string): Promise<void> {
    await run(orgId, 'delete from voice.calls')
    await run(orgId, 'delete from voice.lines')
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    voice = new Pool({ connectionString: env.voice, max: 6 })
    handle = createDb(env.voice, { max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      await removeOrganization(orgId)
    }
    const owner = new Pool({ connectionString: env.owner, max: 1 })
    await dropStaleTestObjects(owner, env.owner)
    await handle.close()
    await Promise.all([owner.end(), voice.end()])
  })

  test('every table of the schema passes the tenant isolation check', async () => {
    expect(await findTenantIsolationGaps(handle.db)).toEqual([])
  })

  describe.each(['lines', 'calls', 'call_events', 'recordings'])('%s', (table) => {
    test('a second Organization reads and removes nothing of the first, and no scope sees nothing', async () => {
      const a = await seed()
      const b = await seed()
      expect(await countOf(a.orgId, table)).toBe(1)
      expect(await countOf(b.orgId, table)).toBe(1)
      expect(await countOf(null, table)).toBe(0)
      const read = await run(b.orgId, `select 1 from voice.${table} where organization_id = $1`, [
        a.orgId,
      ])
      expect(read.rowCount).toBe(0)
      const removed = await run(b.orgId, `delete from voice.${table} where organization_id = $1`, [
        a.orgId,
      ])
      expect(removed.rowCount).toBe(0)
      expect(await countOf(a.orgId, table)).toBe(1)
    })
  })

  describe.each(Object.keys(UPDATES) as (keyof typeof UPDATES)[])('%s updates', (table) => {
    test('a second Organization updates nothing of the first', async () => {
      const a = await seed()
      const b = await seed()
      const result = await run(
        b.orgId,
        `update voice.${table} set ${UPDATES[table]} where organization_id = $1`,
        [a.orgId]
      )
      expect(result.rowCount).toBe(0)
    })
  })

  test('a second Organization cannot insert rows for the first', async () => {
    const a = await seed()
    const b = await seed()
    const lineError = await refusal(
      run(
        b.orgId,
        "insert into voice.lines (id, organization_id, number, country, state) values ($1, $2, $3, 'US', 'active')",
        [newId('line'), a.orgId, newNumber()]
      )
    )
    expect(lineError.code).toBe(INSUFFICIENT_PRIVILEGE)
    const callError = await refusal(
      run(
        b.orgId,
        "insert into voice.calls (id, organization_id, direction, state, line_id, prospect_number) values ($1, $2, 'outbound', 'ringing', $3, $4)",
        [newId('call'), a.orgId, a.lineId, newNumber()]
      )
    )
    expect(callError.code).toBe(INSUFFICIENT_PRIVILEGE)
    const eventError = await refusal(
      run(
        b.orgId,
        "insert into voice.call_events (id, organization_id, call_id, kind, occurred_at) values ($1, $2, $3, 'provider_callback', now())",
        [newId('vev'), a.orgId, a.callId]
      )
    )
    expect(eventError.code).toBe(INSUFFICIENT_PRIVILEGE)
    const recordingError = await refusal(
      run(
        b.orgId,
        "insert into voice.recordings (id, organization_id, call_id, storage_key, channels) values ($1, $2, $3, 'voice/x.wav', 2)",
        [newId('rec'), a.orgId, a.callId]
      )
    )
    expect(recordingError.code).toBe(INSUFFICIENT_PRIVILEGE)
    expect(await countOf(a.orgId, 'calls')).toBe(1)
  })

  test('an insert with no Organization in scope is refused', async () => {
    const error = await refusal(
      run(
        null,
        "insert into voice.lines (id, organization_id, number, country, state) values ($1, $2, $3, 'US', 'active')",
        [newId('line'), newId('org'), newNumber()]
      )
    )
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
  })

  test('a Call cannot reference a Line of another Organization', async () => {
    const a = await seed()
    const b = await seed()
    const error = await refusal(addCall(b.orgId, a.lineId))
    expect(error.code).toBe(FOREIGN_KEY_VIOLATION)
  })

  describe('call events', () => {
    test('a provider event id is recorded once per Organization, so a redelivery inserts nothing', async () => {
      const a = await seed()
      const providerEventId = newId('evt')
      await addEvent(a.orgId, a.callId, providerEventId)
      const error = await refusal(addEvent(a.orgId, a.callId, providerEventId))
      expect(error.code).toBe(UNIQUE_VIOLATION)
      const redelivered = await run(
        a.orgId,
        "insert into voice.call_events (id, organization_id, call_id, kind, provider_event_id, occurred_at) values ($1, $2, $3, 'provider_callback', $4, now()) on conflict (organization_id, provider_event_id) do nothing",
        [newId('vev'), a.orgId, a.callId, providerEventId]
      )
      expect(redelivered.rowCount).toBe(0)
    })

    test('the same provider event id is accepted in another Organization', async () => {
      const a = await seed()
      const b = await seed()
      const providerEventId = newId('evt')
      await addEvent(a.orgId, a.callId, providerEventId)
      await addEvent(b.orgId, b.callId, providerEventId)
      expect(await countOf(b.orgId, 'call_events')).toBe(2)
    })

    test('entries without a provider event id never conflict', async () => {
      const a = await seed()
      await addEvent(a.orgId, a.callId, null)
      await addEvent(a.orgId, a.callId, null)
      expect(await countOf(a.orgId, 'call_events')).toBe(3)
    })

    test('an entry cannot be updated, even by its own Organization', async () => {
      const a = await seed()
      const error = await refusal(
        run(a.orgId, "update voice.call_events set kind = 'state_changed' where id = $1", [
          a.eventId,
        ])
      )
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
    })

    test('entries are numbered in the order they are written', async () => {
      const a = await seed()
      await addEvent(a.orgId, a.callId, null)
      const rows = await run(
        a.orgId,
        'select seq from voice.call_events where call_id = $1 order by seq',
        [a.callId]
      )
      const seqs = rows.rows.map((r) => Number(r.seq))
      expect(seqs.length).toBe(2)
      expect(seqs[1]).toBeGreaterThan(seqs[0] as number)
    })

    test('deleting a Call removes its events and Recording', async () => {
      const a = await seed()
      await run(a.orgId, 'delete from voice.calls where id = $1', [a.callId])
      expect(await countOf(a.orgId, 'call_events')).toBe(0)
      expect(await countOf(a.orgId, 'recordings')).toBe(0)
    })
  })

  describe('lines', () => {
    test('a number is live in one Organization at a time, and free again once released', async () => {
      const a = await seed()
      const b = await seed()
      const number = newNumber()
      const lineId = await addLine(a.orgId, 'active', number)
      const error = await refusal(addLine(b.orgId, 'active', number))
      expect(error.code).toBe(UNIQUE_VIOLATION)
      await run(
        a.orgId,
        "update voice.lines set state = 'released', released_at = now() where id = $1",
        [lineId]
      )
      await addLine(b.orgId, 'active', number)
    })

    test('a Line is assigned to nobody, a Team or a Rep, never a mix', async () => {
      const a = await seed()
      const insert = (kind: string, team: string | null, rep: string | null) =>
        run(
          a.orgId,
          'insert into voice.lines (id, organization_id, number, country, state, assignment_kind, assignment_team_id, assignment_membership_id) values ($1, $2, $3, $4, $5, $6, $7, $8)',
          [newId('line'), a.orgId, newNumber(), 'US', 'active', kind, team, rep]
        )
      await insert('team', newId('team'), null)
      await insert('rep', null, newId('mem'))
      expect((await refusal(insert('team', null, null))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('unassigned', newId('team'), null))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(insert('rep', newId('team'), newId('mem')))).code).toBe(CHECK_VIOLATION)
    })
  })

  describe('calls', () => {
    test('a live Call must have played the Disclosure', async () => {
      const a = await seed()
      const error = await refusal(
        run(a.orgId, "update voice.calls set state = 'live', answered_at = now() where id = $1", [
          a.callId,
        ])
      )
      expect(error.code).toBe(CHECK_VIOLATION)
      await run(
        a.orgId,
        "update voice.calls set state = 'live', answered_at = now(), disclosure_wording_version = 1, disclosure_played_at = now() where id = $1",
        [a.callId]
      )
    })

    test('a failed Call has a reason and no other Call has one', async () => {
      const a = await seed()
      const noReason = await refusal(
        run(a.orgId, "update voice.calls set state = 'failed', ended_at = now() where id = $1", [
          a.callId,
        ])
      )
      expect(noReason.code).toBe(CHECK_VIOLATION)
      const stray = await refusal(
        run(a.orgId, "update voice.calls set failure_reason = 'busy' where id = $1", [a.callId])
      )
      expect(stray.code).toBe(CHECK_VIOLATION)
      await run(
        a.orgId,
        "update voice.calls set state = 'failed', ended_at = now(), failure_reason = 'busy' where id = $1",
        [a.callId]
      )
    })

    test('a Disclosure failure cannot follow a Disclosure that played', async () => {
      const a = await seed()
      const error = await refusal(
        run(
          a.orgId,
          "update voice.calls set state = 'failed', ended_at = now(), failure_reason = 'disclosure_failed', disclosure_wording_version = 1, disclosure_played_at = now() where id = $1",
          [a.callId]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })

    test('only an ended Call has a duration and a wrap-up', async () => {
      const a = await seed()
      const early = await refusal(
        run(a.orgId, "update voice.calls set note = 'x' where id = $1", [a.callId])
      )
      expect(early.code).toBe(CHECK_VIOLATION)
      const ended =
        "state = 'ended', answered_at = now(), ended_at = now(), disclosure_wording_version = 1, disclosure_played_at = now()"
      const noDuration = await refusal(
        run(a.orgId, `update voice.calls set ${ended} where id = $1`, [a.callId])
      )
      expect(noDuration.code).toBe(CHECK_VIOLATION)
      await run(
        a.orgId,
        `update voice.calls set ${ended}, duration_seconds = 61, ended_by = 'rep', deal_id = 'D-1', note = 'Booked a demo' where id = $1`,
        [a.callId]
      )
    })

    test('an idempotency key is one Call per Organization, and needs its fingerprint', async () => {
      const a = await seed()
      const b = await seed()
      const key = newId('key')
      const fingerprint = randomBytes(32).toString('hex')
      const place = (orgId: string, lineId: string, fp: string | null = fingerprint) =>
        run(
          orgId,
          "insert into voice.calls (id, organization_id, direction, state, line_id, prospect_number, idempotency_key, request_fingerprint) values ($1, $2, 'outbound', 'ringing', $3, $4, $5, $6)",
          [newId('call'), orgId, lineId, newNumber(), key, fp]
        )
      await place(a.orgId, a.lineId)
      expect((await refusal(place(a.orgId, a.lineId))).code).toBe(UNIQUE_VIOLATION)
      await place(b.orgId, b.lineId)
      expect((await refusal(place(a.orgId, a.lineId, null))).code).toBe(CHECK_VIOLATION)
    })

    test('a provider call id belongs to one Call per Organization', async () => {
      const a = await seed()
      const sid = `CA${randomBytes(8).toString('hex')}`
      await run(a.orgId, 'update voice.calls set provider_call_sid = $2 where id = $1', [
        a.callId,
        sid,
      ])
      const other = await addCall(a.orgId, a.lineId)
      const error = await refusal(
        run(a.orgId, 'update voice.calls set provider_call_sid = $2 where id = $1', [other, sid])
      )
      expect(error.code).toBe(UNIQUE_VIOLATION)
    })
  })

  describe('recordings', () => {
    test('a Call has at most one Recording', async () => {
      const a = await seed()
      const error = await refusal(addRecording(a.orgId, a.callId))
      expect(error.code).toBe(UNIQUE_VIOLATION)
    })

    test('a stored Recording records its size and time, and a deleted one its deletion', async () => {
      const a = await seed()
      const noSize = await refusal(
        run(
          a.orgId,
          "update voice.recordings set state = 'stored', stored_at = now() where id = $1",
          [a.recordingId]
        )
      )
      expect(noSize.code).toBe(CHECK_VIOLATION)
      await run(
        a.orgId,
        "update voice.recordings set state = 'stored', stored_at = now(), size_bytes = 1024 where id = $1",
        [a.recordingId]
      )
      const noDeletedAt = await refusal(
        run(a.orgId, "update voice.recordings set state = 'deleted' where id = $1", [a.recordingId])
      )
      expect(noDeletedAt.code).toBe(CHECK_VIOLATION)
      await run(
        a.orgId,
        "update voice.recordings set state = 'deleted', deleted_at = now(), purge_due_at = now() + interval '30 days' where id = $1",
        [a.recordingId]
      )
    })

    test('a Recording still being stored can be deleted without a size or stored time', async () => {
      const a = await seed()
      await run(
        a.orgId,
        "update voice.recordings set state = 'deleted', deleted_at = now(), purge_due_at = now() where id = $1",
        [a.recordingId]
      )
      expect(await countOf(a.orgId, 'recordings')).toBe(1)
    })

    test('a storage key is a plain path', async () => {
      const a = await seed()
      const call = await addCall(a.orgId, a.lineId)
      const error = await refusal(
        run(
          a.orgId,
          "insert into voice.recordings (id, organization_id, call_id, storage_key, channels) values ($1, $2, $3, '../escape', 2)",
          [newId('rec'), a.orgId, call]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })
  })
})
