import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
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

interface Seeded {
  orgId: string
  memberId: string
  prospectId: string
  conversationId: string
  inboundId: string
  draftId: string
  decisionId: string
  ruleId: string
}

/** The tables a second Organization must not see, with one harmless update where the role may. */
const TABLES: Record<string, string | null> = {
  conversations: "latest_label = 'other'",
  messages: "classification_label = 'other'",
  drafts: "body = 'x'",
  draft_sources: null,
  approval_decisions: null,
  approval_policies: "mode = 'always'",
  escalation_rules: 'enabled = false',
}

const MESSAGE_INSERT =
  'insert into core.messages (id, organization_id, conversation_id, channel, direction, author_kind, provider_message_id, body, sent_at)'

describe('core inbox tables', () => {
  let owner: Pool
  let core: Pool
  let handle: DbHandle
  const orgs: string[] = []

  /** Run `fn` in one transaction scoped to `organizationId` (or to none), as the core role. */
  async function scoped<T>(orgId: string | null, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await core.connect()
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

  /** Remove an Organization as the owner role, scoped to it because RLS is forced on every table. */
  async function removeOrganization(orgId: string): Promise<void> {
    const c = await owner.connect()
    try {
      await c.query('begin')
      await c.query('select set_config($1, $2, true)', [SETTING, orgId])
      await c.query('delete from core.organizations where organization_id = $1', [orgId])
      await c.query('commit')
    } catch (error) {
      await c.query('rollback').catch(() => undefined)
      throw error
    } finally {
      c.release()
    }
  }

  const countOf = (orgId: string | null, table: string) =>
    scoped(orgId, async (c) =>
      Number((await c.query(`select count(*) as n from core.${table}`)).rows[0].n)
    )

  async function addInbound(orgId: string, conversationId: string): Promise<string> {
    const id = newId('msg')
    await run(
      orgId,
      `${MESSAGE_INSERT} values ($1, $2, $3, 'email', 'inbound', 'prospect', $4, 'Hello', now())`,
      [id, orgId, conversationId, newId('pm')]
    )
    return id
  }

  async function addConversation(orgId: string, prospectId: string): Promise<string> {
    const id = newId('cnv')
    await run(
      orgId,
      "insert into core.conversations (id, organization_id, prospect_id, channel, last_message_at) values ($1, $2, $3, 'email', now())",
      [id, orgId, prospectId]
    )
    return id
  }

  async function addProspect(orgId: string): Promise<string> {
    const id = newId('prs')
    await run(
      orgId,
      "insert into core.prospects (id, organization_id, source) values ($1, $2, 'manual')",
      [id, orgId]
    )
    return id
  }

  /** Create an Organization with one row in every inbox table. */
  async function seed(): Promise<Seeded> {
    const orgId = newId('org')
    orgs.push(orgId)
    const memberId = newId('mem')
    await scoped(orgId, async (c) => {
      await c.query(
        'insert into core.organizations (organization_id, name, region) values ($1, $2, $3)',
        [orgId, 'Org', 'us']
      )
      await c.query(
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, 'owner', 'o@example.test')",
        [memberId, orgId, newId('usr')]
      )
    })
    const prospectId = await addProspect(orgId)
    const conversationId = await addConversation(orgId, prospectId)
    const inboundId = await addInbound(orgId, conversationId)
    const draftId = newId('drf')
    await run(
      orgId,
      "insert into core.drafts (id, organization_id, conversation_id, author, body, reason_trigger_message_id, reason_label, reason_strategy, confidence, hold) values ($1, $2, $3, 'agent', 'Hi there', $4, 'question', 'Answer it', 0.8, 'policy')",
      [draftId, orgId, conversationId, inboundId]
    )
    await run(
      orgId,
      "insert into core.draft_sources (organization_id, draft_id, kind, source_ref, position, deal_record_id, outcome, evidence_count) values ($1, $2, 'moment', 'm1', 0, $3, 'won', 3)",
      [orgId, draftId, newId('deal')]
    )
    const decisionId = newId('dcs')
    await run(
      orgId,
      "insert into core.approval_decisions (id, organization_id, conversation_id, draft_id, kind, decided_by_membership_id) values ($1, $2, $3, $4, 'approve', $5)",
      [decisionId, orgId, conversationId, draftId, memberId]
    )
    await run(
      orgId,
      "insert into core.approval_policies (organization_id, channel, mode) values ($1, 'email', 'always')",
      [orgId]
    )
    const ruleId = newId('esr')
    await run(
      orgId,
      "insert into core.escalation_rules (id, organization_id, trigger, target) values ($1, $2, 'asks_for_person', 'admin_queue')",
      [ruleId, orgId]
    )
    return { orgId, memberId, prospectId, conversationId, inboundId, draftId, decisionId, ruleId }
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    core = new Pool({ connectionString: env.core, max: 6 })
    handle = createDb(env.core, { max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      await removeOrganization(orgId)
    }
    await dropStaleTestObjects(owner, env.owner)
    await handle.close()
    await Promise.all([owner.end(), core.end()])
  })

  test('every table of the schema passes the tenant isolation check', async () => {
    expect(await findTenantIsolationGaps(handle.db)).toEqual([])
  })

  describe.each(Object.keys(TABLES))('%s', (table) => {
    test('a second Organization reads and changes nothing, and no scope sees nothing', async () => {
      const a = await seed()
      const b = await seed()
      expect(await countOf(a.orgId, table)).toBe(1)
      expect(await countOf(null, table)).toBe(0)
      const read = await run(b.orgId, `select 1 from core.${table} where organization_id = $1`, [
        a.orgId,
      ])
      expect(read.rowCount).toBe(0)
      const set = TABLES[table]
      if (set) {
        const update = await run(
          b.orgId,
          `update core.${table} set ${set} where organization_id = $1`,
          [a.orgId]
        )
        expect(update.rowCount).toBe(0)
      }
    })
  })

  test('a second Organization cannot write into the first', async () => {
    const a = await seed()
    const b = await seed()
    const error = await refusal(
      run(
        b.orgId,
        "insert into core.conversations (id, organization_id, prospect_id, channel, last_message_at) values ($1, $2, $3, 'email', now())",
        [newId('cnv'), a.orgId, a.prospectId]
      )
    )
    expect(error.message).toContain('row-level security')
  })

  test('a conversation cannot point at a Prospect of another Organization', async () => {
    const a = await seed()
    const b = await seed()
    const error = await refusal(
      run(
        b.orgId,
        "insert into core.conversations (id, organization_id, prospect_id, channel, last_message_at) values ($1, $2, $3, 'email', now())",
        [newId('cnv'), b.orgId, a.prospectId]
      )
    )
    expect(error.code).toBe(FOREIGN_KEY_VIOLATION)
  })

  describe('messages', () => {
    test('a repeated provider message id on the same channel is refused', async () => {
      const a = await seed()
      const providerId = newId('pm')
      const insert = (conversationId: string) =>
        run(
          a.orgId,
          `${MESSAGE_INSERT} values ($1, $2, $3, 'email', 'inbound', 'prospect', $4, 'Hi', now())`,
          [newId('msg'), a.orgId, conversationId, providerId]
        )
      await insert(a.conversationId)
      const other = await addConversation(a.orgId, a.prospectId)
      const error = await refusal(insert(other))
      expect(error.code).toBe(UNIQUE_VIOLATION)
    })

    test('the same provider message id in another Organization is allowed', async () => {
      const a = await seed()
      const b = await seed()
      const providerId = newId('pm')
      for (const s of [a, b]) {
        await run(
          s.orgId,
          `${MESSAGE_INSERT} values ($1, $2, $3, 'email', 'inbound', 'prospect', $4, 'Hi', now())`,
          [newId('msg'), s.orgId, s.conversationId, providerId]
        )
      }
      expect(await countOf(a.orgId, 'messages')).toBe(2)
    })

    test('a message must carry the channel of its conversation', async () => {
      const a = await seed()
      const error = await refusal(
        run(
          a.orgId,
          `${MESSAGE_INSERT} values ($1, $2, $3, 'chat', 'inbound', 'prospect', $4, 'Hi', now())`,
          [newId('msg'), a.orgId, a.conversationId, newId('pm')]
        )
      )
      expect(error.code).toBe(FOREIGN_KEY_VIOLATION)
    })

    test('an inbound message cannot be authored by an agent', async () => {
      const a = await seed()
      const error = await refusal(
        run(
          a.orgId,
          `${MESSAGE_INSERT} values ($1, $2, $3, 'email', 'inbound', 'agent', $4, 'Hi', now())`,
          [newId('msg'), a.orgId, a.conversationId, newId('pm')]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })

    test('the service role may not rewrite or remove a message', async () => {
      const a = await seed()
      const update = await refusal(
        run(a.orgId, "update core.messages set body = 'edited' where id = $1", [a.inboundId])
      )
      expect(update.code).toBe(INSUFFICIENT_PRIVILEGE)
      const remove = await refusal(
        run(a.orgId, 'delete from core.messages where id = $1', [a.inboundId])
      )
      expect(remove.code).toBe(INSUFFICIENT_PRIVILEGE)
      const truncate = await refusal(run(a.orgId, 'truncate core.messages'))
      expect(truncate.code).toBe(INSUFFICIENT_PRIVILEGE)
    })

    test('a correction needs a label', async () => {
      const a = await seed()
      const error = await refusal(
        run(
          a.orgId,
          'update core.messages set classification_corrected_by_membership_id = $2 where id = $1',
          [a.inboundId, a.memberId]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })

    test('the service role may write the classification of a message', async () => {
      const a = await seed()
      await run(
        a.orgId,
        "update core.messages set classification_label = 'question', classification_confidence = 0.9, classification_decided_by = 'model', classified_at = now() where id = $1",
        [a.inboundId]
      )
      const row = await run(
        a.orgId,
        'select classification_label from core.messages where id = $1',
        [a.inboundId]
      )
      expect(row.rows[0].classification_label).toBe('question')
    })
  })

  describe('conversations', () => {
    test('a Rep in control must be named, and the Agent must not name one', async () => {
      const a = await seed()
      const rep = await refusal(
        run(
          a.orgId,
          "update core.conversations set controller = 'rep', state = 'rep' where id = $1",
          [a.conversationId]
        )
      )
      expect(rep.code).toBe(CHECK_VIOLATION)
      await run(
        a.orgId,
        "update core.conversations set controller = 'rep', controller_membership_id = $2, state = 'rep' where id = $1",
        [a.conversationId, a.memberId]
      )
      const agent = await refusal(
        run(
          a.orgId,
          "update core.conversations set controller = 'agent', state = 'agent' where id = $1",
          [a.conversationId]
        )
      )
      expect(agent.code).toBe(CHECK_VIOLATION)
    })

    test('the service role may not delete a conversation, which would cascade into messages', async () => {
      const a = await seed()
      const error = await refusal(
        run(a.orgId, 'delete from core.conversations where id = $1', [a.conversationId])
      )
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
      expect(await countOf(a.orgId, 'messages')).toBe(1)
    })

    test('an unknown state is refused', async () => {
      const a = await seed()
      const error = await refusal(
        run(a.orgId, "update core.conversations set state = 'weird' where id = $1", [
          a.conversationId,
        ])
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })
  })

  describe('drafts', () => {
    test('an agent Draft needs a trigger and a confidence, a Rep Draft needs a Rep', async () => {
      const a = await seed()
      const agent = await refusal(
        run(
          a.orgId,
          "insert into core.drafts (id, organization_id, conversation_id, author, body, hold) values ($1, $2, $3, 'agent', 'x', 'policy')",
          [newId('drf'), a.orgId, a.conversationId]
        )
      )
      expect(agent.code).toBe(CHECK_VIOLATION)
      const rep = await refusal(
        run(
          a.orgId,
          "insert into core.drafts (id, organization_id, conversation_id, author, body) values ($1, $2, $3, 'rep', 'x')",
          [newId('drf'), a.orgId, a.conversationId]
        )
      )
      expect(rep.code).toBe(CHECK_VIOLATION)
      await run(
        a.orgId,
        "insert into core.drafts (id, organization_id, conversation_id, author, author_membership_id, body) values ($1, $2, $3, 'rep', $4, 'x')",
        [newId('drf'), a.orgId, a.conversationId, a.memberId]
      )
    })

    test('the service role may not delete a Draft', async () => {
      const a = await seed()
      const error = await refusal(
        run(a.orgId, 'delete from core.drafts where id = $1', [a.draftId])
      )
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
      expect(await countOf(a.orgId, 'approval_decisions')).toBe(1)
    })

    test('a pending agent Draft must say why it is held', async () => {
      const a = await seed()
      const error = await refusal(
        run(
          a.orgId,
          "insert into core.drafts (id, organization_id, conversation_id, author, body, reason_trigger_message_id, reason_label, reason_strategy, confidence) values ($1, $2, $3, 'agent', 'x', $4, 'question', 'Answer it', 0.5)",
          [newId('drf'), a.orgId, a.conversationId, a.inboundId]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })

    test('sources are written once: no update, and a repeated position is refused', async () => {
      const a = await seed()
      const update = await refusal(
        run(a.orgId, 'update core.draft_sources set evidence_count = 9 where draft_id = $1', [
          a.draftId,
        ])
      )
      expect(update.code).toBe(INSUFFICIENT_PRIVILEGE)
      const error = await refusal(
        run(
          a.orgId,
          "insert into core.draft_sources (organization_id, draft_id, kind, source_ref, position, deal_record_id, outcome, evidence_count) values ($1, $2, 'moment', 'm2', 0, $3, 'lost', 1)",
          [a.orgId, a.draftId, newId('deal')]
        )
      )
      expect(error.code).toBe(UNIQUE_VIOLATION)
    })
  })

  describe('approval decisions are append-only', () => {
    test('an update, a delete and a truncate are refused for the service role', async () => {
      const a = await seed()
      const update = await refusal(
        run(a.orgId, "update core.approval_decisions set note = 'x' where id = $1", [a.decisionId])
      )
      expect(update.code).toBe(INSUFFICIENT_PRIVILEGE)
      const remove = await refusal(
        run(a.orgId, 'delete from core.approval_decisions where id = $1', [a.decisionId])
      )
      expect(remove.code).toBe(INSUFFICIENT_PRIVILEGE)
      const truncate = await refusal(run(a.orgId, 'truncate core.approval_decisions'))
      expect(truncate.code).toBe(INSUFFICIENT_PRIVILEGE)
      expect(await countOf(a.orgId, 'approval_decisions')).toBe(1)
    })

    test('a takeover names no Draft and an automatic release names no Rep', async () => {
      const a = await seed()
      const takeover = await refusal(
        run(
          a.orgId,
          "insert into core.approval_decisions (id, organization_id, conversation_id, draft_id, kind, decided_by_membership_id) values ($1, $2, $3, $4, 'takeover', $5)",
          [newId('dcs'), a.orgId, a.conversationId, a.draftId, a.memberId]
        )
      )
      expect(takeover.code).toBe(CHECK_VIOLATION)
      const auto = await refusal(
        run(
          a.orgId,
          "insert into core.approval_decisions (id, organization_id, conversation_id, draft_id, kind, decided_by_membership_id) values ($1, $2, $3, $4, 'auto_release', $5)",
          [newId('dcs'), a.orgId, a.conversationId, a.draftId, a.memberId]
        )
      )
      expect(auto.code).toBe(CHECK_VIOLATION)
    })
  })

  describe('policies and rules', () => {
    test('the modes carry exactly their own fields', async () => {
      const a = await seed()
      const insert = (channel: string, mode: string, threshold: unknown, labels: unknown) =>
        run(
          a.orgId,
          'insert into core.approval_policies (organization_id, channel, mode, threshold, labels) values ($1, $2, $3, $4, $5)',
          [a.orgId, channel, mode, threshold, labels]
        )
      expect((await refusal(insert('linkedin', 'below_confidence', null, null))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(insert('linkedin', 'except', null, ['nonsense']))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(insert('linkedin', 'except', null, ['bounce', 'bounce']))).code).toBe(
        CHECK_VIOLATION
      )
      await insert('linkedin', 'below_confidence', 0.7, null)
      await insert('chat', 'except', null, ['bounce', 'out_of_office'])
    })

    test('a policy exists once per channel and a trigger has one rule', async () => {
      const a = await seed()
      const policy = await refusal(
        run(
          a.orgId,
          "insert into core.approval_policies (organization_id, channel, mode) values ($1, 'email', 'always')",
          [a.orgId]
        )
      )
      expect(policy.code).toBe(UNIQUE_VIOLATION)
      const rule = await refusal(
        run(
          a.orgId,
          "insert into core.escalation_rules (id, organization_id, trigger, target) values ($1, $2, 'asks_for_person', 'prospect_owner')",
          [newId('esr'), a.orgId]
        )
      )
      expect(rule.code).toBe(UNIQUE_VIOLATION)
    })

    test('a Team is named exactly when the target is the round robin', async () => {
      const a = await seed()
      const without = await refusal(
        run(
          a.orgId,
          "insert into core.escalation_rules (id, organization_id, trigger, target) values ($1, $2, 'negative_tone', 'team_round_robin')",
          [newId('esr'), a.orgId]
        )
      )
      expect(without.code).toBe(CHECK_VIOLATION)
      const teamId = newId('team')
      await run(a.orgId, 'insert into core.teams (id, organization_id, name) values ($1, $2, $3)', [
        teamId,
        a.orgId,
        'Closers',
      ])
      await run(
        a.orgId,
        "insert into core.escalation_rules (id, organization_id, trigger, target, team_id) values ($1, $2, 'negative_tone', 'team_round_robin', $3)",
        [newId('esr'), a.orgId, teamId]
      )
      const lowConfidence = await refusal(
        run(
          a.orgId,
          "insert into core.escalation_rules (id, organization_id, trigger, target) values ($1, $2, 'low_confidence', 'admin_queue')",
          [newId('esr'), a.orgId]
        )
      )
      expect(lowConfidence.code).toBe(CHECK_VIOLATION)
    })
  })

  describe('removal cascades', () => {
    test('erasing the Prospect removes its conversations, messages, drafts and decisions', async () => {
      const a = await seed()
      await run(a.orgId, 'delete from core.prospects where id = $1', [a.prospectId])
      for (const table of [
        'conversations',
        'messages',
        'drafts',
        'draft_sources',
        'approval_decisions',
      ]) {
        expect(await countOf(a.orgId, table)).toBe(0)
      }
      expect(await countOf(a.orgId, 'approval_policies')).toBe(1)
    })

    test('deleting the Organization removes every inbox row', async () => {
      const a = await seed()
      await removeOrganization(a.orgId)
      for (const table of Object.keys(TABLES)) {
        expect(await countOf(a.orgId, table)).toBe(0)
      }
    })
  })
})
