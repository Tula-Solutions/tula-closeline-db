import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { createDb, type DbHandle } from './client'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'
import { findTenantIsolationGaps, NON_TENANT_TABLES } from './isolation'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const CHECK_VIOLATION = '23514'
const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'
const INSUFFICIENT_PRIVILEGE = '42501'

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`

/** The tables of the campaign schema, parents first. */
const TABLES = [
  'plays',
  'play_citations',
  'campaigns',
  'sequences',
  'steps',
  'variants',
  'enrollments',
  'enrollment_events',
  'send_decisions',
]

const ORGANIZATIONS_WITH_WORK = 'select * from outbound.organizations_with_work($1, $2, $3)'

interface Seeded {
  orgId: string
  campaignId: string
  enrollmentId: string
  prospectId: string
}

describe('outbound campaign tables', () => {
  let outbound: Pool
  let owner: Pool
  let core: Pool
  let playbook: Pool
  let handle: DbHandle
  const orgs: string[] = []

  /** Run `fn` in one transaction scoped to `organizationId` (or to none). */
  async function scoped<T>(
    orgId: string | null,
    fn: (c: PoolClient) => Promise<T>,
    pool: Pool = outbound
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
      Number((await c.query(`select count(*) as n from outbound.${table}`)).rows[0].n)
    )

  const newOrg = (): string => {
    const orgId = newId('org')
    orgs.push(orgId)
    return orgId
  }

  const SEND_WINDOW = JSON.stringify({
    timeZone: 'America/New_York',
    days: [1, 2, 3, 4, 5],
    startMinute: 540,
    endMinute: 1020,
  })
  const AUDIENCE = JSON.stringify({ kind: 'prospects', prospectIds: [] })

  const addCampaign = async (orgId: string, options: { id?: string; playId?: string } = {}) => {
    const id = options.id ?? newId('cpg')
    await run(
      orgId,
      `insert into outbound.campaigns
         (id, organization_id, name, goal, state, audience, audience_version, sequence_version,
          approval_mode, language, send_window, window_zone, daily_cap, owner_membership_id, play_id)
       values ($1, $2, 'Q3 outreach', 'Book intro calls', 'draft', $3::jsonb, 0, 1,
          'review', 'en', $4::jsonb, 'campaign', 100, $5, $6)`,
      [id, orgId, AUDIENCE, SEND_WINDOW, newId('mem'), options.playId ?? null]
    )
    return id
  }

  const addSequence = async (orgId: string, campaignId: string, version = 1) => {
    await run(
      orgId,
      'insert into outbound.sequences (organization_id, campaign_id, version) values ($1, $2, $3)',
      [orgId, campaignId, version]
    )
    await run(
      orgId,
      `insert into outbound.steps
         (organization_id, campaign_id, version, position, key, kind, goal, next_key)
       values ($1, $2, $3, 0, 'intro', 'email', 'Book a call', 'done'),
              ($1, $2, $3, 1, 'done', 'end', null, null)`,
      [orgId, campaignId, version]
    )
    await run(
      orgId,
      `insert into outbound.variants
         (organization_id, campaign_id, version, step_key, key, position, label, angle, weight)
       values ($1, $2, $3, 'intro', 'a', 0, 'Pain', 'Lead with the pain', 60),
              ($1, $2, $3, 'intro', 'b', 1, 'Proof', 'Lead with a customer', 40)`,
      [orgId, campaignId, version]
    )
  }

  const addEnrollment = async (
    orgId: string,
    campaignId: string,
    options: {
      id?: string
      prospectId?: string
      state?: string
      nextDueAt?: string | null
    } = {}
  ) => {
    const id = options.id ?? newId('enr')
    const prospectId = options.prospectId ?? newId('prs')
    const state = options.state ?? 'active'
    const nextDueAt =
      options.nextDueAt === undefined ? "now() + interval '1 hour'" : options.nextDueAt
    await run(
      orgId,
      `insert into outbound.enrollments
         (id, organization_id, campaign_id, prospect_id, state, stop_reason, current_step_key,
          current_step, next_due_at, stopped_at, completed_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, ${nextDueAt ?? 'null'},
          ${state === 'stopped' ? 'now()' : 'null'}, ${state === 'completed' ? 'now()' : 'null'})`,
      [
        id,
        orgId,
        campaignId,
        prospectId,
        state,
        state === 'stopped' ? 'replied' : null,
        state === 'active' ? 'intro' : null,
        state === 'active' ? 0 : null,
      ]
    )
    return { id, prospectId }
  }

  const seed = async (): Promise<Seeded> => {
    const orgId = newOrg()
    const playId = newId('ply')
    await run(
      orgId,
      `insert into outbound.plays (id, organization_id, name, intent, goal, source, status, steps, evidence_count)
       values ($1, $2, 'Cold intro', 'cold_intro', 'Book a call', 'custom', 'accepted', '[]'::jsonb, 1)`,
      [playId, orgId]
    )
    await run(
      orgId,
      `insert into outbound.play_citations (organization_id, play_id, position, kind, call_id, deal_record_id)
       values ($1, $2, 0, 'moment', $3, $4)`,
      [orgId, playId, newId('call'), newId('deal')]
    )
    const campaignId = await addCampaign(orgId, { playId })
    await addSequence(orgId, campaignId)
    const { id: enrollmentId, prospectId } = await addEnrollment(orgId, campaignId)
    await run(
      orgId,
      `insert into outbound.enrollment_events (id, organization_id, enrollment_id, kind)
       values ($1, $2, $3, 'enrolled')`,
      [newId('eev'), orgId, enrollmentId]
    )
    await run(
      orgId,
      `insert into outbound.send_decisions
         (id, organization_id, campaign_id, enrollment_id, prospect_id, step, attempt_epoch, state,
          reason, checks, retry_at, decided_at)
       values ($1, $2, $3, $4, $5, 0, 0, 'deferred', 'outside_window',
          '[{"check":"window","passed":false}]'::jsonb, now() + interval '1 hour', now())`,
      [newId('snd'), orgId, campaignId, enrollmentId, prospectId]
    )
    return { orgId, campaignId, enrollmentId, prospectId }
  }

  /** The Organizations a sweep call returns, with the marker row's null left out. */
  const discovered = async (after = '', batch = 500) => {
    const result = await outbound.query(ORGANIZATIONS_WITH_WORK, ['step_due', after, batch])
    return result.rows
      .map((row) => row.organization_id as string | null)
      .filter((id): id is string => id !== null)
  }

  const hintOf = async (orgId: string) =>
    (
      await owner.query(
        `select due_at from outbound.work_hints where kind = 'step_due' and organization_id = $1`,
        [orgId]
      )
    ).rows[0] as { due_at: Date } | undefined

  beforeAll(async () => {
    await migrateUp(env.owner)
    outbound = new Pool({ connectionString: env.outbound, max: 6 })
    owner = new Pool({ connectionString: env.owner, max: 2 })
    core = new Pool({ connectionString: env.core, max: 1 })
    playbook = new Pool({ connectionString: env.playbook, max: 1 })
    handle = createDb(env.outbound, { max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      await scoped(
        orgId,
        async (c) => {
          for (const table of ['send_decisions', 'enrollments', 'campaigns', 'plays']) {
            await c.query(`delete from outbound.${table}`)
          }
        },
        owner
      )
    }
    await owner.query('delete from outbound.work_hints where organization_id = any($1)', [orgs])
    await dropStaleTestObjects(owner, env.owner)
    await handle.close()
    await Promise.all([owner.end(), outbound.end(), core.end(), playbook.end()])
  })

  test('every table of the schema passes the tenant isolation check', async () => {
    expect(await findTenantIsolationGaps(handle.db)).toEqual([])
  })

  describe.each(TABLES)('%s', (table) => {
    test('a second Organization reads and removes nothing of the first, and no scope sees nothing', async () => {
      const a = await seed()
      const b = await seed()
      expect(await countOf(a.orgId, table)).toBeGreaterThanOrEqual(1)
      expect(await countOf(null, table)).toBe(0)
      const read = await run(
        b.orgId,
        `select 1 from outbound.${table} where organization_id = $1`,
        [a.orgId]
      )
      expect(read.rowCount).toBe(0)
      // Removal either deletes nothing or is refused (append-only tables); never the other's rows.
      await run(b.orgId, `delete from outbound.${table} where organization_id = $1`, [
        a.orgId,
      ]).catch(() => undefined)
      expect(await countOf(a.orgId, table)).toBeGreaterThanOrEqual(1)
    })

    test('has forced row-level security with its one policy', async () => {
      const rls = await owner.query(
        `select c.relrowsecurity as enabled, c.relforcerowsecurity as forced,
                (select count(*)::int from pg_policies p
                  where p.schemaname = 'outbound' and p.tablename = c.relname) as policies
           from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'outbound' and c.relname = $1`,
        [table]
      )
      expect(rls.rows[0]).toEqual({ enabled: true, forced: true, policies: 1 })
    })
  })

  test('a row cannot be written into another Organization', async () => {
    const a = await seed()
    const b = newOrg()
    const error = await refusal(
      run(
        b,
        `insert into outbound.campaigns
           (id, organization_id, name, goal, state, audience, audience_version, sequence_version,
            approval_mode, language, send_window, window_zone, daily_cap, owner_membership_id)
         values ($1, $2, 'x', 'y', 'draft', $3::jsonb, 0, 0, 'review', 'en', $4::jsonb,
            'campaign', 10, $5)`,
        [newId('cpg'), a.orgId, AUDIENCE, SEND_WINDOW, newId('mem')]
      )
    )
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
  })

  describe('constraints', () => {
    test('an enrollment is active with a step and a due time, stopped with a reason, or completed', async () => {
      const a = await seed()
      const insert = (values: string) =>
        refusal(
          run(
            a.orgId,
            `insert into outbound.enrollments
               (id, organization_id, campaign_id, prospect_id, state, stop_reason, current_step_key,
                current_step, next_due_at, stopped_at, completed_at)
             values ($1, $2, $3, $4, ${values})`,
            [newId('enr'), a.orgId, a.campaignId, newId('prs')]
          )
        )
      // active without a step
      expect((await insert("'active', null, null, null, now(), null, null")).code).toBe(
        CHECK_VIOLATION
      )
      // stopped without a reason
      expect((await insert("'stopped', null, null, null, null, now(), null")).code).toBe(
        CHECK_VIOLATION
      )
      // completed with a due time
      expect((await insert("'completed', null, null, null, now(), null, now()")).code).toBe(
        CHECK_VIOLATION
      )
      // an unknown stop reason
      expect((await insert("'stopped', 'because', null, null, null, now(), null")).code).toBe(
        CHECK_VIOLATION
      )
    })

    test('a Prospect is enrolled in a Campaign once', async () => {
      const a = await seed()
      const error = await refusal(
        addEnrollment(a.orgId, a.campaignId, { prospectId: a.prospectId })
      )
      expect(error.code).toBe(UNIQUE_VIOLATION)
    })

    test('a send is decided once per enrollment, step and attempt epoch', async () => {
      const a = await seed()
      const again = await refusal(
        run(
          a.orgId,
          `insert into outbound.send_decisions
             (id, organization_id, campaign_id, enrollment_id, prospect_id, step, attempt_epoch,
              state, reason, checks, decided_at)
           values ($1, $2, $3, $4, $5, 0, 0, 'refused', 'suppressed', '[]'::jsonb, now())`,
          [newId('snd'), a.orgId, a.campaignId, a.enrollmentId, a.prospectId]
        )
      )
      expect(again.code).toBe(UNIQUE_VIOLATION)
    })

    test('a send decision follows the contract: reasons and times go with the state', async () => {
      const a = await seed()
      const insert = (step: number, state: string, reason: string | null, extra: string) =>
        refusal(
          run(
            a.orgId,
            `insert into outbound.send_decisions
               (id, organization_id, campaign_id, enrollment_id, prospect_id, step, attempt_epoch,
                state, reason, checks, decided_at, retry_at, sent_at, mailbox_id)
             values ($1, $2, $3, $4, $5, $6, 1, $7, $8, '[]'::jsonb, now(), ${extra})`,
            [newId('snd'), a.orgId, a.campaignId, a.enrollmentId, a.prospectId, step, state, reason]
          )
        )
      // refused with a deferring reason
      expect((await insert(1, 'refused', 'outside_window', 'null, null, null')).code).toBe(
        CHECK_VIOLATION
      )
      // refused without a reason
      expect((await insert(2, 'refused', null, 'null, null, null')).code).toBe(CHECK_VIOLATION)
      // deferred without a retry time
      expect((await insert(3, 'deferred', 'limit_reached', 'null, null, null')).code).toBe(
        CHECK_VIOLATION
      )
      // sent without a mailbox
      expect((await insert(4, 'sent', null, 'null, now(), null')).code).toBe(CHECK_VIOLATION)
      // sent without a sent time
      expect((await insert(5, 'sent', null, `null, null, '${newId('mbx')}'`)).code).toBe(
        CHECK_VIOLATION
      )
    })

    test('a step has the fields of its kind, and keys and positions are unique within a version', async () => {
      const a = await seed()
      const step = (
        position: number,
        key: string,
        kind: string,
        goal: string | null,
        next: string | null
      ) =>
        refusal(
          run(
            a.orgId,
            `insert into outbound.steps
               (organization_id, campaign_id, version, position, key, kind, goal, next_key)
             values ($1, $2, 1, $3, $4, $5, $6, $7)`,
            [a.orgId, a.campaignId, position, key, kind, goal, next]
          )
        )
      // a wait without its hours
      expect((await step(2, 'pause', 'wait', null, 'done')).code).toBe(CHECK_VIOLATION)
      // an email without a goal
      expect((await step(3, 'mail', 'email', null, 'done')).code).toBe(CHECK_VIOLATION)
      // an end that names a next step
      expect((await step(4, 'last', 'end', null, 'done')).code).toBe(CHECK_VIOLATION)
      // a repeated key
      expect((await step(5, 'intro', 'email', 'g', 'done')).code).toBe(UNIQUE_VIOLATION)
      // a repeated position
      expect((await step(1, 'again', 'email', 'g', 'done')).code).toBe(UNIQUE_VIOLATION)
    })

    test('one variant of a step is promoted, with who promoted it exactly when it was manual', async () => {
      const a = await seed()
      const promote = (key: string, source: string, by: string | null) =>
        refusal(
          run(
            a.orgId,
            `update outbound.variants set promoted_source = $3, promoted_by_membership_id = $4,
               promoted_at = now() where organization_id = $1 and key = $2`,
            [a.orgId, key, source, by]
          )
        )
      expect((await promote('a', 'manual', null)).code).toBe(CHECK_VIOLATION)
      expect((await promote('a', 'auto', newId('mem'))).code).toBe(CHECK_VIOLATION)
      await run(
        a.orgId,
        `update outbound.variants set promoted_source = 'auto', promoted_at = now()
           where organization_id = $1 and key = 'a'`,
        [a.orgId]
      )
      expect((await promote('b', 'auto', null)).code).toBe(UNIQUE_VIOLATION)
    })

    test('a campaign cannot have a send window that ends before it starts, or an unknown state', async () => {
      const orgId = newOrg()
      const error = await refusal(
        run(
          orgId,
          `insert into outbound.campaigns
             (id, organization_id, name, goal, state, audience, audience_version, sequence_version,
              approval_mode, language, send_window, window_zone, daily_cap, owner_membership_id)
           values ($1, $2, 'x', 'y', 'draft', $3::jsonb, 0, 0, 'review', 'en',
              '{"timeZone":"UTC","days":[1],"startMinute":600,"endMinute":600}'::jsonb,
              'campaign', 10, $4)`,
          [newId('cpg'), orgId, AUDIENCE, newId('mem')]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
      const campaignId = await addCampaign(orgId)
      const state = await refusal(
        run(orgId, `update outbound.campaigns set state = 'gone' where id = $1`, [campaignId])
      )
      expect(state.code).toBe(CHECK_VIOLATION)
    })

    test('a play citation names the source of its kind and nothing else', async () => {
      const a = await seed()
      const playId = (
        await run(a.orgId, 'select id from outbound.plays where organization_id = $1', [a.orgId])
      ).rows[0].id
      const error = await refusal(
        run(
          a.orgId,
          `insert into outbound.play_citations (organization_id, play_id, position, kind, document_id, call_id, deal_record_id)
           values ($1, $2, 1, 'document', $3, $4, $5)`,
          [a.orgId, playId, newId('doc'), newId('call'), newId('deal')]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })

    test('enrollment events cannot be changed by the service role, and need their enrollment', async () => {
      const a = await seed()
      const update = await refusal(
        run(a.orgId, `update outbound.enrollment_events set kind = 'completed'`)
      )
      expect(update.code).toBe(INSUFFICIENT_PRIVILEGE)
      const orphan = await refusal(
        run(
          a.orgId,
          `insert into outbound.enrollment_events (id, organization_id, enrollment_id, kind)
           values ($1, $2, $3, 'enrolled')`,
          [newId('eev'), a.orgId, newId('enr')]
        )
      )
      expect(orphan.code).toBe(FOREIGN_KEY_VIOLATION)
    })
  })

  describe('work discovery for due steps', () => {
    test('an active enrollment notes a step_due hint at its due time, and only an earlier time moves it', async () => {
      const orgId = newOrg()
      const campaignId = await addCampaign(orgId)
      await addSequence(orgId, campaignId)
      await addEnrollment(orgId, campaignId, { nextDueAt: "now() + interval '2 hours'" })
      const first = (await hintOf(orgId))?.due_at
      expect(first).toBeDefined()
      await addEnrollment(orgId, campaignId, { nextDueAt: "now() + interval '5 hours'" })
      expect((await hintOf(orgId))?.due_at).toEqual(first as Date)
      await addEnrollment(orgId, campaignId, { nextDueAt: "now() + interval '1 hour'" })
      const earlier = (await hintOf(orgId))?.due_at as Date
      expect(earlier.getTime()).toBeLessThan((first as Date).getTime())
    })

    test('a stopped or completed enrollment notes nothing', async () => {
      const orgId = newOrg()
      const campaignId = await addCampaign(orgId)
      await addEnrollment(orgId, campaignId, { state: 'stopped', nextDueAt: null })
      await addEnrollment(orgId, campaignId, { state: 'completed', nextDueAt: null })
      expect(await hintOf(orgId)).toBeUndefined()
    })

    test('the sweep returns only Organizations whose work is due now, and cleans or moves the rest', async () => {
      const due = newOrg()
      const later = newOrg()
      const stale = newOrg()
      const campaigns = new Map<string, string>()
      for (const orgId of [due, later, stale]) {
        const campaignId = await addCampaign(orgId)
        await addSequence(orgId, campaignId)
        campaigns.set(orgId, campaignId)
      }
      await addEnrollment(due, campaigns.get(due) as string, {
        nextDueAt: "now() - interval '1 minute'",
      })
      await addEnrollment(later, campaigns.get(later) as string, {
        nextDueAt: "now() + interval '1 day'",
      })
      const staleEnrollment = await addEnrollment(stale, campaigns.get(stale) as string, {
        nextDueAt: "now() + interval '1 hour'",
      })
      // The work stops before it is due, leaving a stale hint behind.
      await run(
        stale,
        `update outbound.enrollments set state = 'stopped', stop_reason = 'replied', stopped_at = now(),
           next_due_at = null, current_step = null, current_step_key = null where id = $1`,
        [staleEnrollment.id]
      )
      // Make both hints look due, as they would once their time passed.
      await owner.query(
        `update outbound.work_hints set due_at = now() - interval '1 hour'
          where kind = 'step_due' and organization_id = any($1)`,
        [[later, stale]]
      )
      const found = (await discovered()).filter((id) => orgs.includes(id))
      expect(found).toEqual([due])
      const moved = (await hintOf(later))?.due_at as Date
      expect(moved.getTime()).toBeGreaterThan(Date.now() + 23 * 3600 * 1000)
      expect(await hintOf(stale)).toBeUndefined()
      expect(await hintOf(due)).toBeDefined()
    })

    test('it returns ids only, with the place to resume', async () => {
      const result = await outbound.query(ORGANIZATIONS_WITH_WORK, ['step_due', '', 1])
      expect(result.fields.map((f) => f.name)).toEqual(['organization_id', 'resume_after'])
    })

    test('it cannot run inside an Organization scope, and the session ends unscoped', async () => {
      const orgId = newOrg()
      const error = await refusal(run(orgId, ORGANIZATIONS_WITH_WORK, ['step_due', '', 5]))
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
      expect(error.message).toContain('outbound.work_scope')
      const c = await outbound.connect()
      try {
        await c.query('begin')
        await c.query(ORGANIZATIONS_WITH_WORK, ['step_due', '', 5])
        const scope = await c.query(
          `select coalesce(current_setting('app.organization_id', true), '') as s`
        )
        expect(scope.rows[0].s).toBe('')
      } finally {
        await c.query('rollback')
        c.release()
      }
    })

    test('it rejects an unknown kind', async () => {
      const error = await refusal(outbound.query(ORGANIZATIONS_WITH_WORK, ['nope', '', 5]))
      expect(error.code).toBe('22023')
    })

    test('only the outbound role may call it, and no role can touch the registry directly', async () => {
      for (const pool of [core, playbook]) {
        expect(
          (await refusal(pool.query(ORGANIZATIONS_WITH_WORK, ['step_due', '', 5]))).message
        ).toMatch(/permission denied/)
      }
      expect(
        (await refusal(outbound.query('select * from outbound.work_hints'))).message
      ).toContain('permission denied')
      expect(
        (
          await refusal(
            outbound.query(
              `insert into outbound.work_hints (kind, organization_id, due_at) values ('step_due', $1, now())`,
              [newOrg()]
            )
          )
        ).message
      ).toContain('permission denied')
      const grants = await owner.query(
        `select has_function_privilege('public', 'outbound.organizations_with_work(text,text,integer)', 'execute') as pub,
                has_function_privilege('closeline_outbound', 'outbound.organizations_with_work(text,text,integer)', 'execute') as svc,
                has_function_privilege('closeline_outbound', 'outbound.note_work(text,text,timestamptz)', 'execute') as note`
      )
      expect(grants.rows[0]).toEqual({ pub: false, svc: true, note: false })
      const privileges = [
        'SELECT',
        'INSERT',
        'UPDATE',
        'DELETE',
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER',
      ]
      for (const role of ['closeline_outbound', 'closeline_playbook', 'closeline_core', 'public']) {
        for (const privilege of privileges) {
          const held = await owner.query(
            `select has_table_privilege($1, 'outbound.work_hints', $2) as held`,
            [role, privilege]
          )
          expect([role, privilege, held.rows[0].held]).toEqual([role, privilege, false])
        }
      }
    })

    test('work_hints is the only outbound table on the allowlist and holds a kind, an id and a time', async () => {
      expect(NON_TENANT_TABLES.filter((t) => t.startsWith('outbound.'))).toEqual([
        'outbound.work_hints',
      ])
      const columns = await owner.query(
        `select column_name from information_schema.columns
          where table_schema = 'outbound' and table_name = 'work_hints' order by column_name`
      )
      expect(columns.rows.map((r) => r.column_name)).toEqual(['due_at', 'kind', 'organization_id'])
    })
  })

  describe('due selection', () => {
    test('picking the due enrollments of an Organization uses the (organization_id, next_due_at) index', async () => {
      const orgId = newOrg()
      const campaignId = await addCampaign(orgId)
      await addSequence(orgId, campaignId)
      await run(
        orgId,
        `insert into outbound.enrollments
           (id, organization_id, campaign_id, prospect_id, state, current_step_key, current_step, next_due_at)
         select 'enr_' || md5($2 || i::text), $1, $2, 'prs_' || md5($2 || i::text), 'active', 'intro', 0,
                now() + make_interval(secs => i)
           from generate_series(1, 20000) i`,
        [orgId, campaignId]
      )
      await owner.query('analyze outbound.enrollments')
      const plan = await scoped(orgId, async (c) => {
        const result = await c.query(
          `explain (format text)
           select id from outbound.enrollments
            where organization_id = $1 and state = 'active' and next_due_at <= now() + interval '10 seconds'
            order by next_due_at limit 100`,
          [orgId]
        )
        return result.rows.map((r) => r['QUERY PLAN'] as string).join('\n')
      })
      expect(plan).toContain('enrollments_due_idx')
      expect(plan).not.toContain('Seq Scan')
      const indexed = await owner.query(
        `select indexdef from pg_indexes
          where schemaname = 'outbound' and indexname = 'enrollments_due_idx'`
      )
      expect(indexed.rows[0].indexdef).toContain('(organization_id, next_due_at)')
    })
  })
})
