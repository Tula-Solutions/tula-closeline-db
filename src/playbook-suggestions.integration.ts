import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash, randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { QUOTA_LOCK } from './playbook-statements'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const CHECK_VIOLATION = '23514'
const UNIQUE_VIOLATION = '23505'

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`
const fingerprint = (text: string): Buffer => createHash('sha256').update(text).digest()

describe('playbook suggestions and the Call origin', () => {
  let playbook: Pool
  let owner: Pool

  async function scoped<T>(orgId: string | null, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await playbook.connect()
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

  async function refusal(promise: Promise<unknown>): Promise<{ code?: string; message: string }> {
    try {
      await promise
    } catch (error) {
      return error as { code?: string; message: string }
    }
    throw new Error('expected the statement to be refused')
  }

  const insertSuggestion = (orgId: string, text: string, kind = 'objection_answer') =>
    scoped(orgId, (c) =>
      c.query(
        `insert into playbook.suggestions (id, organization_id, kind, text, fingerprint, deal_record_id, moments)
         values ($1, $2, $3, $4, $5, $6, '[{"callId":"call_x","momentIndex":1}]')`,
        [newId('sgs'), orgId, kind, text, fingerprint(kind + text), newId('deal')]
      )
    )

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    playbook = new Pool({ connectionString: env.playbook, max: 4 })
  })

  afterAll(async () => {
    await dropStaleTestObjects(owner, env.owner)
    await Promise.all([owner.end(), playbook.end()])
  })

  test('a second Organization reads nothing from suggestions', async () => {
    const a = newId('org')
    const b = newId('org')
    await insertSuggestion(a, 'Lead with the audit trail.')
    await insertSuggestion(b, 'Ask about the budget cycle.')
    const read = (org: string | null) =>
      scoped(
        org,
        async (c) => (await c.query('select organization_id from playbook.suggestions')).rows
      )
    expect((await read(a)).map((r) => r.organization_id)).toEqual([a])
    expect((await read(b)).map((r) => r.organization_id)).toEqual([b])
    expect(await read(null)).toEqual([])
    const crossWrite = await refusal(
      scoped(b, (c) =>
        c.query(
          `insert into playbook.suggestions (id, organization_id, kind, text, fingerprint, deal_record_id)
           values ($1, $2, 'closing_move', 'x', $3, $4)`,
          [newId('sgs'), a, fingerprint('x'), newId('deal')]
        )
      )
    )
    expect(crossWrite.message).toContain('row-level security')
    await owner.query('delete from playbook.suggestions where organization_id in ($1, $2)', [a, b])
  })

  test('the same proposal is stored once per Organization, so a rejected one is not proposed again', async () => {
    const a = newId('org')
    const b = newId('org')
    await insertSuggestion(a, 'Same words.')
    expect((await refusal(insertSuggestion(a, 'Same words.'))).code).toBe(UNIQUE_VIOLATION)
    await insertSuggestion(b, 'Same words.')
    await owner.query('delete from playbook.suggestions where organization_id in ($1, $2)', [a, b])
  })

  test('a decision names who made it and when, and a pending one has neither', async () => {
    const a = newId('org')
    await insertSuggestion(a, 'Decide me.')
    const lone = await refusal(
      scoped(a, (c) => c.query("update playbook.suggestions set status = 'accepted'"))
    )
    expect(lone.code).toBe(CHECK_VIOLATION)
    await scoped(a, (c) =>
      c.query(
        "update playbook.suggestions set status = 'rejected', decided_at = now(), decided_by_membership_id = $1",
        [newId('mem')]
      )
    )
    await owner.query('delete from playbook.suggestions where organization_id = $1', [a])
  })

  test('a Call has an origin that defaults to imported, and a row already there keeps it', async () => {
    const org = newId('org')
    const callId = newId('call')
    await scoped(org, async (c) => {
      await c.query(QUOTA_LOCK, [org])
      await c.query(
        `insert into playbook.deals (id, organization_id, deal_id, outcome) values ($1, $2, 'D-1', 'open')`,
        [newId('deal'), org]
      )
    })
    const deal = await scoped(org, (c) => c.query('select id from playbook.deals limit 1'))
    await scoped(org, async (c) => {
      await c.query(QUOTA_LOCK, [org])
      await c.query(
        `insert into playbook.calls (id, organization_id, deal_record_id, kind, file_name, media_type,
           size_bytes, content_hash, state, rep_by, rep_label, speaker_labels, uploaded_by, object_key)
         values ($1, $2, $3, 'transcript', 'a.txt', 'text/plain', 100, sha256('a'::bytea), 'uploaded', 'speaker',
           'Alice', array['Alice'], $4, $5)`,
        [callId, org, deal.rows[0].id, newId('usr'), `${org}/1`]
      )
    })
    const row = await scoped(org, (c) =>
      c.query('select origin from playbook.calls where id = $1', [callId])
    )
    expect(row.rows[0].origin).toBe('imported')
    // Fixed when the Call is made: the service role has no UPDATE grant on the column.
    const changed = await refusal(
      scoped(org, async (c) => {
        await c.query(QUOTA_LOCK, [org])
        return c.query("update playbook.calls set origin = 'rep' where id = $1", [callId])
      })
    )
    expect(changed.code).toBe('42501')
    const bad = await refusal(
      (async () => {
        const c = await owner.connect()
        try {
          await c.query('begin')
          await c.query('select set_config($1, $2, true)', [SETTING, org])
          await c.query(QUOTA_LOCK, [org])
          await c.query("update playbook.calls set origin = 'robot' where id = $1", [callId])
        } finally {
          await c.query('rollback').catch(() => undefined)
          c.release()
        }
      })()
    )
    expect(bad.code).toBe(CHECK_VIOLATION)
  })
})
