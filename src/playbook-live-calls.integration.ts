import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { CALL_INSERT } from './playbook-call-statements'
import {
  LIVE_CALL_WAIT_CLEAR,
  LIVE_CALL_WAIT_LIST,
  LIVE_CALL_WAIT_RECORD,
} from './playbook-live-call-statements'
import { QUOTA_LOCK } from './playbook-statements'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`

describe('platform Calls that wait for a Deal, and the rights exception', () => {
  let playbook: Pool
  let owner: Pool

  async function scoped<T>(org: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await playbook.connect()
    try {
      await c.query('begin')
      await c.query('select set_config($1, $2, true)', [SETTING, org])
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

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    playbook = new Pool({ connectionString: env.playbook, max: 4 })
  })

  afterAll(async () => {
    await dropStaleTestObjects(owner, env.owner)
    await Promise.all([owner.end(), playbook.end()])
  })

  const record = (org: string, callId: string) =>
    scoped(org, (c) =>
      c.query(LIVE_CALL_WAIT_RECORD, [org, callId, 'outbound', '2026-01-01T00:00:00Z'])
    )
  const list = (org: string, at = '-infinity', after = '', size = 50) =>
    scoped(org, (c) => c.query(LIVE_CALL_WAIT_LIST, [org, at, after, size]))

  test('a wait is recorded once, listed oldest first by keyset, cleared, and never seen by another Organization', async () => {
    const a = newId('org')
    const b = newId('org')
    const ids = [newId('call'), newId('call'), newId('call')]
    for (const id of ids) {
      expect((await record(a, id)).rows).toHaveLength(1)
    }
    expect((await record(a, ids[0] as string)).rows).toHaveLength(0)
    await record(b, newId('call'))
    const first = await list(a, '-infinity', '', 2)
    expect(first.rows).toHaveLength(2)
    const last = first.rows[1]
    const rest = await list(a, last.cursor_at, last.call_id, 2)
    expect(rest.rows).toHaveLength(1)
    const seen = [...first.rows, ...rest.rows].map((r) => r.call_id)
    expect(new Set(seen)).toEqual(new Set(ids))
    expect((await list(b)).rows).toHaveLength(1)
    expect((await scoped(a, (c) => c.query(LIVE_CALL_WAIT_CLEAR, [a, ids[0]]))).rows).toHaveLength(
      1
    )
    expect((await list(a)).rows).toHaveLength(2)
    await owner.query('delete from playbook.live_call_waits where organization_id in ($1, $2)', [
      a,
      b,
    ])
  })

  test('a Call the platform recorded needs no rights confirmation, an import still does', async () => {
    const org = newId('org')
    const insert = (origin: string | null) =>
      scoped(org, async (c) => {
        await c.query(QUOTA_LOCK, [org])
        const id = newId('call')
        return (
          await c.query(CALL_INSERT, [
            org,
            id,
            'deal-1',
            newId('deal'),
            'a.wav',
            'audio/wav',
            'recording',
            10,
            randomBytes(32),
            `usr_${'0'.repeat(32)}`,
            `${org}/${id}`,
            'channel',
            null,
            'left',
            newId('cjob'),
            100,
            1_000_000,
            100,
            1,
            origin,
          ])
        ).rows[0] as { result: string }
      })
    expect((await insert(null)).result).toBe('rights_required')
    expect((await insert('rep')).result).toBe('created')
    await owner.query('delete from playbook.calls where organization_id = $1', [org])
    await owner.query('delete from playbook.deals where organization_id = $1', [org])
  })
})
