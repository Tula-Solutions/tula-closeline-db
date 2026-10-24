import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash, randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { QUOTA_LOCK } from './playbook-statements'
import {
  SUGGESTION_DECIDE,
  SUGGESTION_GET,
  SUGGESTION_INSERT,
  SUGGESTION_LIST,
  SUGGESTION_LIST_ACCEPTED,
  SUGGESTION_LIST_BY_STATUS,
} from './playbook-suggestion-statements'

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

  describe('the learning switch', () => {
    const setting = (org: string) =>
      scoped(
        org,
        async (c) =>
          (await c.query('select learn_from_agent_moments as v from playbook.index_settings')).rows
      )

    test('it defaults to on, and the service role can turn it off and on, vectors written or not', async () => {
      const org = newId('org')
      await scoped(org, (c) =>
        c.query(
          "insert into playbook.index_settings (organization_id, embedding_model, embedding_dimension) values ($1, 'm', 8)",
          [org]
        )
      )
      expect(await setting(org)).toEqual([{ v: true }])
      await scoped(org, (c) =>
        c.query('update playbook.index_settings set learn_from_agent_moments = false')
      )
      expect(await setting(org)).toEqual([{ v: false }])
      await scoped(org, (c) =>
        c.query('update playbook.index_settings set vectors_written_at = now()')
      )
      await scoped(org, (c) =>
        c.query('update playbook.index_settings set learn_from_agent_moments = true')
      )
      expect(await setting(org)).toEqual([{ v: true }])
      // The model is still final once vectors exist.
      const model = await refusal(
        scoped(org, (c) => c.query("update playbook.index_settings set embedding_model = 'other'"))
      )
      expect(model.code).toBe(CHECK_VIOLATION)
      await owner.query('delete from playbook.index_settings where organization_id = $1', [org])
    })

    test('a second Organization neither reads nor changes it', async () => {
      const a = newId('org')
      const b = newId('org')
      for (const org of [a, b]) {
        await scoped(org, (c) =>
          c.query(
            "insert into playbook.index_settings (organization_id, embedding_model, embedding_dimension) values ($1, 'm', 8)",
            [org]
          )
        )
      }
      await scoped(b, (c) =>
        c.query('update playbook.index_settings set learn_from_agent_moments = false')
      )
      expect(await setting(a)).toEqual([{ v: true }])
      expect(await setting(b)).toEqual([{ v: false }])
      await owner.query('delete from playbook.index_settings where organization_id in ($1, $2)', [
        a,
        b,
      ])
    })
  })

  describe('the Suggestion statements', () => {
    const MEMBER = () => newId('mem')
    const propose = (org: string, text: string, kind = 'objection_answer', id = newId('sgs')) =>
      scoped(org, (c) =>
        c.query(SUGGESTION_INSERT, [
          org,
          id,
          kind,
          text,
          fingerprint(kind + text),
          newId('deal'),
          JSON.stringify([{ callId: newId('call'), momentIndex: 1 }]),
        ])
      )
    const cleanup = (...orgs: string[]) =>
      owner.query('delete from playbook.suggestions where organization_id = any($1)', [orgs])

    test('inserting the same proposal twice stores it once and the second returns no row', async () => {
      const org = newId('org')
      const first = await propose(org, 'Offer a pilot.')
      const second = await propose(org, 'Offer a pilot.')
      expect(first.rowCount).toBe(1)
      expect(first.rows[0]).toMatchObject({
        kind: 'objection_answer',
        status: 'pending',
        text: 'Offer a pilot.',
      })
      expect(first.rows[0].decided_at).toBeNull()
      expect(second.rowCount).toBe(0)
      expect(
        await scoped(org, (c) => c.query(SUGGESTION_LIST, [org, 'infinity', '', 10]))
      ).toMatchObject({ rowCount: 1 })
      await cleanup(org)
    })

    test('a rejected proposal is not proposed again', async () => {
      const org = newId('org')
      const made = await propose(org, 'Cut the price.')
      await scoped(org, (c) =>
        c.query(SUGGESTION_DECIDE, [org, made.rows[0].id, 'rejected', MEMBER(), null])
      )
      expect((await propose(org, 'Cut the price.')).rowCount).toBe(0)
      await cleanup(org)
    })

    test('concurrent inserts of one proposal store it once', async () => {
      const org = newId('org')
      const results = await Promise.all(Array.from({ length: 5 }, () => propose(org, 'Race me.')))
      expect(results.filter((r) => r.rowCount === 1)).toHaveLength(1)
      await cleanup(org)
    })

    test('a decision wins once: the second call, of two racing, gets no row', async () => {
      const org = newId('org')
      const made = await propose(org, 'Decide once.')
      const id = made.rows[0].id
      const member = MEMBER()
      const results = await Promise.all([
        scoped(org, (c) =>
          c.query(SUGGESTION_DECIDE, [org, id, 'accepted', member, 'Edited words.'])
        ),
        scoped(org, (c) => c.query(SUGGESTION_DECIDE, [org, id, 'rejected', MEMBER(), null])),
      ])
      expect(results.map((r) => r.rowCount).sort()).toEqual([0, 1])
      const won = results.find((r) => r.rowCount === 1)
      const read = await scoped(org, (c) => c.query(SUGGESTION_GET, [org, id]))
      expect(read.rows[0].status).toBe(won?.rows[0].status)
      expect(read.rows[0].decided_by_membership_id).not.toBeNull()
      expect(read.rows[0].decided_at).not.toBeNull()
      const again = await scoped(org, (c) =>
        c.query(SUGGESTION_DECIDE, [org, id, 'accepted', MEMBER(), null])
      )
      expect(again.rowCount).toBe(0)
      await cleanup(org)
    })

    test('an acceptance may carry edited text and keeps the proposal otherwise', async () => {
      const org = newId('org')
      const a = await propose(org, 'Proposed A.')
      const b = await propose(org, 'Proposed B.')
      const edited = await scoped(org, (c) =>
        c.query(SUGGESTION_DECIDE, [org, a.rows[0].id, 'accepted', MEMBER(), 'Edited A.'])
      )
      const kept = await scoped(org, (c) =>
        c.query(SUGGESTION_DECIDE, [org, b.rows[0].id, 'accepted', MEMBER(), null])
      )
      expect(edited.rows[0].text).toBe('Edited A.')
      expect(kept.rows[0].text).toBe('Proposed B.')
      await cleanup(org)
    })

    test('lists page newest first by cursor, clamp the page size and filter by status', async () => {
      const org = newId('org')
      const ids: string[] = []
      for (let i = 0; i < 5; i++) {
        ids.push((await propose(org, `Suggestion ${i}`)).rows[0].id)
      }
      await scoped(org, (c) =>
        c.query(SUGGESTION_DECIDE, [org, ids[1], 'accepted', MEMBER(), null])
      )
      await scoped(org, (c) =>
        c.query(SUGGESTION_DECIDE, [org, ids[3], 'rejected', MEMBER(), null])
      )
      const page1 = await scoped(org, (c) => c.query(SUGGESTION_LIST, [org, 'infinity', '', 2]))
      expect(page1.rowCount).toBe(2)
      const last = page1.rows[1]
      const page2 = await scoped(org, (c) =>
        c.query(SUGGESTION_LIST, [org, last.cursor_at, last.id, 10])
      )
      expect(page2.rowCount).toBe(3)
      expect([...page1.rows, ...page2.rows].map((r) => r.id).sort()).toEqual([...ids].sort())
      const pending = await scoped(org, (c) =>
        c.query(SUGGESTION_LIST_BY_STATUS, [org, 'infinity', '', 10, 'pending'])
      )
      expect(pending.rows.every((r) => r.status === 'pending')).toBe(true)
      expect(pending.rowCount).toBe(3)
      const accepted = await scoped(org, (c) =>
        c.query(SUGGESTION_LIST_ACCEPTED, [org, 'infinity', '', 10])
      )
      expect(accepted.rows.map((r) => r.id)).toEqual([ids[1]])
      // Null and absurd page sizes are clamped, never unbounded.
      const nullSize = await scoped(org, (c) =>
        c.query(SUGGESTION_LIST, [org, 'infinity', '', null])
      )
      expect(nullSize.rowCount).toBe(1)
      const huge = await scoped(org, (c) =>
        c.query(SUGGESTION_LIST, [org, 'infinity', '', 1_000_000])
      )
      expect(huge.rowCount).toBe(5)
      const bad = await refusal(
        scoped(org, (c) => c.query(SUGGESTION_LIST, [org, 'garbage', '', 10]))
      )
      expect(bad.code).toBe('22007')
      await cleanup(org)
    })

    test('a second Organization sees, decides and inserts nothing of the first', async () => {
      const a = newId('org')
      const b = newId('org')
      const made = await propose(a, 'Only for A.')
      const id = made.rows[0].id
      expect((await scoped(b, (c) => c.query(SUGGESTION_GET, [b, id]))).rowCount).toBe(0)
      expect(
        (await scoped(b, (c) => c.query(SUGGESTION_LIST, [b, 'infinity', '', 10]))).rowCount
      ).toBe(0)
      expect(
        (await scoped(b, (c) => c.query(SUGGESTION_LIST_ACCEPTED, [b, 'infinity', '', 10])))
          .rowCount
      ).toBe(0)
      // Naming A's id from B's scope, and A's Organization from B's scope, finds nothing.
      expect(
        (await scoped(b, (c) => c.query(SUGGESTION_DECIDE, [b, id, 'accepted', MEMBER(), null])))
          .rowCount
      ).toBe(0)
      expect((await scoped(b, (c) => c.query(SUGGESTION_GET, [a, id]))).rowCount).toBe(0)
      const crossInsert = await refusal(
        propose(b, 'x').then(() =>
          scoped(b, (c) =>
            c.query(SUGGESTION_INSERT, [
              a,
              newId('sgs'),
              'closing_move',
              'x',
              fingerprint('zz'),
              newId('deal'),
              '[]',
            ])
          )
        )
      )
      expect(crossInsert.message).toContain('row-level security')
      expect((await scoped(a, (c) => c.query(SUGGESTION_GET, [a, id]))).rows[0].status).toBe(
        'pending'
      )
      // The same text in B is B's own Suggestion, not a conflict with A's.
      expect((await propose(b, 'Only for A.')).rowCount).toBe(1)
      await cleanup(a, b)
    })
  })
})
