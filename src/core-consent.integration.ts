import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { createDb, type DbHandle } from './client'
import {
  dropStaleTestObjects,
  integrationEnv,
  migrateUp,
  pinColumnStats,
} from './integration-support'
import { findTenantIsolationGaps } from './isolation'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const CHECK_VIOLATION = '23514'
const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'
const RESTRICT_VIOLATION = '23001'
const FEATURE_NOT_SUPPORTED = '0A000'

const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`
const hash = (): Buffer => randomBytes(32)

interface Seeded {
  orgId: string
  userId: string
  prospectId: string
  wordingId: string
  formId: string
  eventId: string
  suppressionId: string
  checkId: string
}

/** One harmless update per table, used to prove a second Organization updates nothing. */
const UPDATES = {
  consent_wording: "text = 'x'",
  consent_form: "name = 'x'",
  contact_consent_event: 'stop_all = false',
  suppression_entry: "source_ref = 'x'",
  contact_check_log: "caller = 'x'",
} as const

describe('core consent tables', () => {
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

  async function createOrganization(): Promise<string> {
    const orgId = newId('org')
    orgs.push(orgId)
    await scoped(orgId, async (c) => {
      await c.query(
        'insert into core.organizations (organization_id, name, region) values ($1, $2, $3)',
        [orgId, 'Org', 'us']
      )
      await c.query(
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, 'owner', 'o@example.test')",
        [newId('mem'), orgId, newId('usr')]
      )
    })
    return orgId
  }

  const addProspect = async (orgId: string): Promise<string> => {
    const id = newId('prs')
    await run(
      orgId,
      "insert into core.prospects (id, organization_id, source) values ($1, $2, 'manual')",
      [id, orgId]
    )
    return id
  }

  const addWording = async (orgId: string, userId: string, text = 'I agree'): Promise<string> => {
    const id = newId('cwd')
    await run(
      orgId,
      "insert into core.consent_wording (id, organization_id, version, text, channels, created_by_user_id) values ($1, $2, 1, $3, array['email','sms'], $4)",
      [id, orgId, text, userId]
    )
    return id
  }

  const addGrant = async (
    orgId: string,
    prospectId: string,
    wordingId: string
  ): Promise<string> => {
    const id = newId('cev')
    await run(
      orgId,
      "insert into core.contact_consent_event (id, organization_id, prospect_id, channel, kind, source, wording_id, evidence_ref, occurred_at) values ($1, $2, $3, 'email', 'granted', 'manual', $4, 'ticket 1', now())",
      [id, orgId, prospectId, wordingId]
    )
    return id
  }

  /** Create an Organization with one row in every consent table. */
  async function seed(): Promise<Seeded> {
    const orgId = await createOrganization()
    const userId = newId('usr')
    const prospectId = await addProspect(orgId)
    const wordingId = await addWording(orgId, userId)
    const formId = newId('cfm')
    const suppressionId = newId('sup')
    const checkId = newId('chk')
    await run(
      orgId,
      "insert into core.consent_form (id, organization_id, wording_id, name, channels, created_by_user_id) values ($1, $2, $3, 'Form', array['email'], $4)",
      [formId, orgId, wordingId, userId]
    )
    const eventId = await addGrant(orgId, prospectId, wordingId)
    await run(
      orgId,
      "insert into core.suppression_entry (id, organization_id, address_kind, address_hash, masked_address, reason) values ($1, $2, 'email', $3, 'a***@example.test', 'unsubscribe')",
      [suppressionId, orgId, hash()]
    )
    await run(
      orgId,
      "insert into core.contact_check_log (id, organization_id, prospect_id, channel, purpose, caller, allowed, basis) values ($1, $2, $3, 'email', 'agent_initiated', 'outbound', true, 'consent_granted')",
      [checkId, orgId, prospectId]
    )
    return { orgId, userId, prospectId, wordingId, formId, eventId, suppressionId, checkId }
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

  describe.each(Object.keys(UPDATES) as (keyof typeof UPDATES)[])('%s', (table) => {
    test('a second Organization reads, updates and removes nothing, and no scope sees nothing', async () => {
      const a = await seed()
      const b = await seed()
      expect(await countOf(a.orgId, table)).toBe(1)
      expect(await countOf(b.orgId, table)).toBe(1)
      expect(await countOf(null, table)).toBe(0)
      const read = await run(b.orgId, `select 1 from core.${table} where organization_id = $1`, [
        a.orgId,
      ])
      expect(read.rowCount).toBe(0)
      const update = await run(
        b.orgId,
        `update core.${table} set ${UPDATES[table]} where organization_id = $1`,
        [a.orgId]
      )
      expect(update.rowCount).toBe(0)
      const removal = await run(b.orgId, `delete from core.${table} where organization_id = $1`, [
        a.orgId,
      ])
      expect(removal.rowCount).toBe(0)
      expect(await countOf(a.orgId, table)).toBe(1)
    })
  })

  test('a second Organization cannot write into the first, nor can an unscoped session', async () => {
    const a = await seed()
    const b = await seed()
    const other = await refusal(
      run(
        b.orgId,
        "insert into core.suppression_entry (id, organization_id, address_kind, address_hash, masked_address, reason) values ($1, $2, 'email', $3, 'x', 'bounce')",
        [newId('sup'), a.orgId, hash()]
      )
    )
    expect(other.message).toContain('row-level security')
    const none = await refusal(
      run(
        null,
        "insert into core.contact_check_log (id, organization_id, channel, purpose, caller, allowed, code) values ($1, $2, 'email', 'reply', 'core', false, 'consent.missing')",
        [newId('chk'), a.orgId]
      )
    )
    expect(none.message).toContain('row-level security')
  })

  describe('the consent ledger is append-only', () => {
    test('an update of an event is refused', async () => {
      const a = await seed()
      const error = await refusal(
        run(
          a.orgId,
          "update core.contact_consent_event set evidence_ref = 'edited' where id = $1",
          [a.eventId]
        )
      )
      expect(error.code).toBe(RESTRICT_VIOLATION)
      expect(error.message).toContain('core.consent_ledger_append_only')
    })

    test('a delete of an event whose Prospect exists is refused', async () => {
      const a = await seed()
      const error = await refusal(
        run(a.orgId, 'delete from core.contact_consent_event where id = $1', [a.eventId])
      )
      expect(error.code).toBe(RESTRICT_VIOLATION)
      expect(error.message).toContain('core.consent_ledger_append_only')
      expect(await countOf(a.orgId, 'contact_consent_event')).toBe(1)
    })

    test('truncate is refused, even for the owner', async () => {
      await seed()
      const error = await refusal(owner.query('truncate core.contact_consent_event'))
      expect(error.code).toBe(FEATURE_NOT_SUPPORTED)
    })

    test('erasing the Prospect removes its events, and nothing else does', async () => {
      const a = await seed()
      const other = await addProspect(a.orgId)
      await addGrant(a.orgId, other, a.wordingId)
      expect(await countOf(a.orgId, 'contact_consent_event')).toBe(2)
      await run(a.orgId, 'delete from core.prospects where id = $1', [a.prospectId])
      expect(await countOf(a.orgId, 'contact_consent_event')).toBe(1)
    })

    test('deleting the Organization removes its events', async () => {
      const a = await seed()
      await removeOrganization(a.orgId)
      expect(await countOf(a.orgId, 'contact_consent_event')).toBe(0)
      expect(await countOf(a.orgId, 'consent_wording')).toBe(0)
    })

    test('events are ordered by seq in append order', async () => {
      const a = await seed()
      const second = await addGrant(a.orgId, a.prospectId, a.wordingId)
      const rows = await run(
        a.orgId,
        'select id from core.contact_consent_event where prospect_id = $1 order by seq desc',
        [a.prospectId]
      )
      expect(rows.rows[0].id).toBe(second)
    })

    test.each([
      [
        'a grant without a wording',
        'kind, source, evidence_ref',
        "'granted', 'manual', 'x'",
        false,
      ],
      ['a withdrawal from a grant source', 'kind, source', "'withdrawn', 'hosted_form'", false],
      [
        'stop_all on a grant',
        'kind, source, wording_id, evidence_ref, stop_all',
        "'granted', 'manual', $4, 'x', true",
        true,
      ],
      [
        'a verbal call without a call id',
        'kind, source, wording_id, evidence_ref',
        "'granted', 'verbal_call', $4, 'x'",
        true,
      ],
      [
        'a hosted form without a form id',
        'kind, source, wording_id, evidence_ref',
        "'granted', 'hosted_form', $4, 'x'",
        true,
      ],
    ])('refuses %s', async (_name, columns, values, needsWording) => {
      const a = await seed()
      const sql = `insert into core.contact_consent_event (id, organization_id, prospect_id, channel, occurred_at, ${columns}) values ($1, $2, $3, 'email', now(), ${values})`
      const params: unknown[] = [newId('cev'), a.orgId, a.prospectId]
      if (needsWording) {
        params.push(a.wordingId)
      }
      expect((await refusal(run(a.orgId, sql, params))).code).toBe(CHECK_VIOLATION)
    })

    test('a hosted form grant keeps the submitter IP address and user agent', async () => {
      const a = await seed()
      const id = newId('cev')
      await run(
        a.orgId,
        "insert into core.contact_consent_event (id, organization_id, prospect_id, channel, kind, source, wording_id, evidence_ref, form_id, ip_address, user_agent, occurred_at) values ($1, $2, $3, 'email', 'granted', 'hosted_form', $4, 'x', $5, '203.0.113.9', 'Mozilla/5.0', now())",
        [id, a.orgId, a.prospectId, a.wordingId, a.formId]
      )
      const row = await run(
        a.orgId,
        'select ip_address, user_agent from core.contact_consent_event where id = $1',
        [id]
      )
      expect(row.rows[0]).toEqual({ ip_address: '203.0.113.9', user_agent: 'Mozilla/5.0' })
    })

    test.each([
      ['a hosted form grant without the IP address and user agent', 'null, null', 'hosted_form'],
      ['a hosted form grant with only the IP address', "'203.0.113.9', null", 'hosted_form'],
      ['a manual grant carrying a submission', "'203.0.113.9', 'Mozilla/5.0'", 'manual'],
      ['an IP address over 64 characters', `'${'1'.repeat(65)}', 'ua'`, 'hosted_form'],
      ['a user agent over 512 characters', `'1.1.1.1', '${'u'.repeat(513)}'`, 'hosted_form'],
    ])('refuses %s', async (_name, submission, source) => {
      const a = await seed()
      const form = source === 'hosted_form' ? a.formId : null
      const sql = `insert into core.contact_consent_event (id, organization_id, prospect_id, channel, kind, source, wording_id, evidence_ref, form_id, ip_address, user_agent, occurred_at) values ($1, $2, $3, 'email', 'granted', '${source}', $4, 'x', $5, ${submission}, now())`
      const error = await refusal(
        run(a.orgId, sql, [newId('cev'), a.orgId, a.prospectId, a.wordingId, form])
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })

    test('a form that publishes while a wording edit waits still locks the wording', async () => {
      const a = await seed()
      const wordingId = await addWording(a.orgId, a.userId, 'publish race')
      const formId = newId('cfm')
      await run(
        a.orgId,
        "insert into core.consent_form (id, organization_id, wording_id, name, channels, created_by_user_id) values ($1, $2, $3, 'R', array['email'], $4)",
        [formId, a.orgId, wordingId, a.userId]
      )
      const publish = await core.connect()
      const edit = await core.connect()
      try {
        await publish.query('begin')
        await publish.query('select set_config($1, $2, true)', [SETTING, a.orgId])
        await publish.query(
          "update core.consent_form set state = 'published', token = $2, published_at = now() where id = $1",
          [formId, randomBytes(24).toString('base64url')]
        )
        await edit.query('begin')
        await edit.query('select set_config($1, $2, true)', [SETTING, a.orgId])
        const outcome = refusal(
          edit.query("update core.consent_wording set text = 'raced' where id = $1", [wordingId])
        )
        await new Promise((resolve) => setTimeout(resolve, 300))
        await publish.query('commit')
        expect((await outcome).code).toBe(RESTRICT_VIOLATION)
      } finally {
        await publish.query('rollback').catch(() => undefined)
        await edit.query('rollback').catch(() => undefined)
        publish.release()
        edit.release()
      }
    })

    test('an event for a Prospect that does not exist is refused', async () => {
      const a = await seed()
      const error = await refusal(
        run(
          a.orgId,
          "insert into core.contact_consent_event (id, organization_id, prospect_id, channel, kind, source, occurred_at) values ($1, $2, $3, 'sms', 'withdrawn', 'stop_reply', now())",
          [newId('cev'), a.orgId, newId('prs')]
        )
      )
      expect(error.code).toBe(FOREIGN_KEY_VIOLATION)
    })
  })

  describe('Consent Wording', () => {
    test('is editable while nothing relies on it', async () => {
      const a = await seed()
      const free = await addWording(a.orgId, a.userId, 'free')
      const result = await run(
        a.orgId,
        "update core.consent_wording set text = 'edited' where id = $1",
        [free]
      )
      expect(result.rowCount).toBe(1)
    })

    test('is immutable once a ledger event references it', async () => {
      const a = await seed()
      const error = await refusal(
        run(a.orgId, "update core.consent_wording set text = 'edited' where id = $1", [a.wordingId])
      )
      expect(error.code).toBe(RESTRICT_VIOLATION)
      expect(error.message).toContain('core.consent_wording_locked')
      const text = await run(a.orgId, 'select text from core.consent_wording where id = $1', [
        a.wordingId,
      ])
      expect(text.rows[0].text).toBe('I agree')
    })

    test('is immutable once a published form offers it, but not while the form is a draft', async () => {
      const a = await seed()
      const wordingId = await addWording(a.orgId, a.userId, 'form wording')
      const formId = newId('cfm')
      await run(
        a.orgId,
        "insert into core.consent_form (id, organization_id, wording_id, name, channels, created_by_user_id) values ($1, $2, $3, 'F', array['email'], $4)",
        [formId, a.orgId, wordingId, a.userId]
      )
      const draftEdit = await run(
        a.orgId,
        "update core.consent_wording set text = 'draft edit' where id = $1",
        [wordingId]
      )
      expect(draftEdit.rowCount).toBe(1)
      await run(
        a.orgId,
        "update core.consent_form set state = 'published', token = $2, published_at = now() where id = $1",
        [formId, randomBytes(24).toString('base64url')]
      )
      const error = await refusal(
        run(a.orgId, "update core.consent_wording set text = 'late edit' where id = $1", [
          wordingId,
        ])
      )
      expect(error.code).toBe(RESTRICT_VIOLATION)
    })

    test('an event that commits while an edit waits still locks it', async () => {
      const a = await seed()
      const wordingId = await addWording(a.orgId, a.userId, 'racy')
      const insert = await core.connect()
      const edit = await core.connect()
      try {
        await insert.query('begin')
        await insert.query('select set_config($1, $2, true)', [SETTING, a.orgId])
        await insert.query(
          "insert into core.contact_consent_event (id, organization_id, prospect_id, channel, kind, source, wording_id, evidence_ref, occurred_at) values ($1, $2, $3, 'email', 'granted', 'manual', $4, 'r', now())",
          [newId('cev'), a.orgId, a.prospectId, wordingId]
        )
        await edit.query('begin')
        await edit.query('select set_config($1, $2, true)', [SETTING, a.orgId])
        const outcome = refusal(
          edit.query("update core.consent_wording set text = 'raced' where id = $1", [wordingId])
        )
        await new Promise((resolve) => setTimeout(resolve, 300))
        await insert.query('commit')
        const error = await outcome
        expect(error.code).toBe(RESTRICT_VIOLATION)
      } finally {
        await insert.query('rollback').catch(() => undefined)
        await edit.query('rollback').catch(() => undefined)
        insert.release()
        edit.release()
      }
    })

    test('a referenced wording cannot be deleted', async () => {
      const a = await seed()
      const error = await refusal(
        run(a.orgId, 'delete from core.consent_wording where id = $1', [a.wordingId])
      )
      expect(error.code).toBe(RESTRICT_VIOLATION)
      expect(error.message).toContain('core.consent_ledger_append_only')
      expect(await countOf(a.orgId, 'contact_consent_event')).toBe(1)
    })

    test('a form that an event cites cannot be deleted', async () => {
      const a = await seed()
      await run(
        a.orgId,
        "insert into core.contact_consent_event (id, organization_id, prospect_id, channel, kind, source, wording_id, evidence_ref, form_id, ip_address, user_agent, occurred_at) values ($1, $2, $3, 'email', 'granted', 'hosted_form', $4, 'x', $5, '203.0.113.9', 'ua', now())",
        [newId('cev'), a.orgId, a.prospectId, a.wordingId, a.formId]
      )
      const error = await refusal(
        run(a.orgId, 'delete from core.consent_form where id = $1', [a.formId])
      )
      expect(error.code).toBe(RESTRICT_VIOLATION)
    })

    test('version 1 supersedes nothing and a later version names its predecessor', async () => {
      const a = await seed()
      const bad = await refusal(
        run(
          a.orgId,
          "insert into core.consent_wording (id, organization_id, version, text, channels, supersedes_id, created_by_user_id) values ($1, $2, 1, 't', array['email'], $3, $4)",
          [newId('cwd'), a.orgId, a.wordingId, a.userId]
        )
      )
      expect(bad.code).toBe(CHECK_VIOLATION)
      await run(
        a.orgId,
        "insert into core.consent_wording (id, organization_id, version, text, channels, supersedes_id, created_by_user_id) values ($1, $2, 2, 'v2', array['email'], $3, $4)",
        [newId('cwd'), a.orgId, a.wordingId, a.userId]
      )
    })

    test.each([
      ['no channels', "'{}'::text[]"],
      ['an unknown channel', "array['fax']"],
      ['a repeated channel', "array['email','email']"],
    ])('refuses %s', async (_name, channels) => {
      const a = await seed()
      const error = await refusal(
        run(
          a.orgId,
          `insert into core.consent_wording (id, organization_id, version, text, channels, created_by_user_id) values ($1, $2, 1, 't', ${channels}, $3)`,
          [newId('cwd'), a.orgId, a.userId]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })
  })

  describe('consent forms', () => {
    test('a form token is unique across Organizations and a draft has none', async () => {
      const a = await seed()
      const b = await seed()
      const token = randomBytes(24).toString('base64url')
      const publish = (orgId: string, wordingId: string, userId: string) =>
        run(
          orgId,
          "insert into core.consent_form (id, organization_id, wording_id, name, channels, created_by_user_id, state, token, published_at) values ($1, $2, $3, 'P', array['email'], $4, 'published', $5, now())",
          [newId('cfm'), orgId, wordingId, userId, token]
        )
      await publish(a.orgId, a.wordingId, a.userId)
      expect((await refusal(publish(b.orgId, b.wordingId, b.userId))).code).toBe(UNIQUE_VIOLATION)
      const draftWithToken = await refusal(
        run(
          a.orgId,
          "insert into core.consent_form (id, organization_id, wording_id, name, channels, created_by_user_id, token) values ($1, $2, $3, 'D', array['email'], $4, $5)",
          [newId('cfm'), a.orgId, a.wordingId, a.userId, randomBytes(24).toString('base64url')]
        )
      )
      expect(draftWithToken.code).toBe(CHECK_VIOLATION)
    })

    test('a form cannot use another Organization wording', async () => {
      const a = await seed()
      const b = await seed()
      const error = await refusal(
        run(
          b.orgId,
          "insert into core.consent_form (id, organization_id, wording_id, name, channels, created_by_user_id) values ($1, $2, $3, 'X', array['email'], $4)",
          [newId('cfm'), b.orgId, a.wordingId, b.userId]
        )
      )
      expect(error.code).toBe(FOREIGN_KEY_VIOLATION)
    })
  })

  describe('consent_form_for_token', () => {
    let playbook: Pool
    beforeAll(() => {
      playbook = new Pool({ connectionString: env.playbook, max: 1 })
    })
    afterAll(async () => {
      await playbook.end()
    })

    const newToken = () => randomBytes(24).toString('base64url')
    const lookup = async (token: string | null, orgId: string | null = null) =>
      (
        await scoped(orgId, (c) =>
          c.query('select * from core.consent_form_for_token($1)', [token])
        )
      ).rows
    const publish = async (a: Seeded, token = newToken()) => {
      await run(
        a.orgId,
        "update core.consent_form set state = 'published', token = $2, published_at = now() where id = $1",
        [a.formId, token]
      )
      return token
    }

    test('answers with the Organization, form, wording and state of a published form, whatever the scope', async () => {
      const a = await seed()
      const b = await seed()
      const token = await publish(a)
      const expected = [
        {
          organization_id: a.orgId,
          form_id: a.formId,
          wording_id: a.wordingId,
          state: 'published',
        },
      ]
      expect(await lookup(token)).toEqual(expected)
      expect(await lookup(token, b.orgId)).toEqual(expected)
    })

    test('a draft, an unknown, a malformed and a null token give no row', async () => {
      const a = await seed()
      expect(await lookup(newToken())).toEqual([])
      expect(await lookup(null)).toEqual([])
      for (const probe of ['', '%', '_'.repeat(30), 'x'.repeat(300)]) {
        expect(await lookup(probe)).toEqual([])
      }
      const token = await publish(a)
      for (const probe of [token.slice(0, -1), `${token} `, `${token}%`, token.toUpperCase()]) {
        expect(await lookup(probe)).toEqual([])
      }
    })

    test('a closed form still answers, as closed; a republished token follows the form; a deleted form is gone', async () => {
      const a = await seed()
      const token = await publish(a)
      await run(
        a.orgId,
        "update core.consent_form set state = 'closed', closed_at = now() where id = $1",
        [a.formId]
      )
      expect(await lookup(token)).toEqual([
        { organization_id: a.orgId, form_id: a.formId, wording_id: a.wordingId, state: 'closed' },
      ])
      const next = newToken()
      await run(a.orgId, 'update core.consent_form set token = $2 where id = $1', [a.formId, next])
      expect(await lookup(token)).toEqual([])
      expect((await lookup(next)).map((r) => r.state)).toEqual(['closed'])
      await run(a.orgId, 'delete from core.consent_form where id = $1', [a.formId])
      expect(await lookup(next)).toEqual([])
    })

    test.each(['suspended', 'deleted'])(
      'gives no row for a form of a %s Organization',
      async (status) => {
        const a = await seed()
        const token = await publish(a)
        expect(await lookup(token)).toHaveLength(1)
        await run(a.orgId, 'update core.organizations set status = $2 where organization_id = $1', [
          a.orgId,
          status,
        ])
        expect(await lookup(token)).toEqual([])
      }
    )

    test('deleting the Organization removes the entry', async () => {
      const a = await seed()
      const token = await publish(a)
      await removeOrganization(a.orgId)
      expect(await lookup(token)).toEqual([])
      const left = await owner.query('select 1 from core.consent_form_directory where token = $1', [
        token,
      ])
      expect(left.rows).toEqual([])
    })

    test('a rolled-back publish leaves nothing behind', async () => {
      const a = await seed()
      const token = newToken()
      const c = await core.connect()
      try {
        await c.query('begin')
        await c.query('select set_config($1, $2, true)', [SETTING, a.orgId])
        await c.query(
          "update core.consent_form set state = 'published', token = $2, published_at = now() where id = $1",
          [a.formId, token]
        )
        await c.query('rollback')
      } finally {
        c.release()
      }
      expect(await lookup(token)).toEqual([])
    })

    test('only closeline_core may execute it', async () => {
      const a = await seed()
      const token = await publish(a)
      const denied = await refusal(
        playbook.query('select * from core.consent_form_for_token($1)', [token])
      )
      expect(denied.message).toContain('permission denied')
      const privileges = await owner.query<{ role: string; ok: boolean }>(
        `select r as role, has_function_privilege(r, 'core.consent_form_for_token(text)', 'EXECUTE') as ok
           from unnest(array['closeline_core', 'closeline_auth', 'closeline_playbook', 'closeline_voice', 'public']) r`
      )
      expect(privileges.rows.filter((r) => r.ok).map((r) => r.role)).toEqual(['closeline_core'])
    })

    test('closeline_core cannot read the directory or the form table without the Organization set', async () => {
      const a = await seed()
      await publish(a)
      for (const statement of [
        'select * from core.consent_form_directory',
        'select count(*) from core.consent_form_directory',
        "insert into core.consent_form_directory values ('x', 'y', 'z', 'w', 'published')",
        'update core.consent_form_directory set state = state',
        'delete from core.consent_form_directory',
        'truncate core.consent_form_directory',
      ]) {
        for (const setting of [null, a.orgId]) {
          const error = await refusal(run(setting, statement))
          expect(error.message).toContain('permission denied for table')
        }
      }
      expect((await run(null, 'select * from core.consent_form')).rows).toEqual([])
      expect((await run(null, 'select * from core.consent_wording')).rows).toEqual([])
      // TRUNCATE skips the sync trigger, so the form table and the directory each refuse it.
      const guards = await owner.query<{ tgrelid: string }>(
        `select tgrelid::regclass::text from pg_trigger
          where tgname in ('consent_form_no_truncate', 'consent_form_directory_no_truncate')
          order by 1`
      )
      expect(guards.rows.map((r) => r.tgrelid)).toEqual([
        'core.consent_form',
        'core.consent_form_directory',
      ])
      const truncated = await refusal(owner.query('truncate core.consent_form_directory'))
      expect(truncated.message).toContain('core.truncate_refused')
    })
  })

  describe('suppression', () => {
    const add = (orgId: string, kind: string, value: Buffer, reason = 'unsubscribe') =>
      run(
        orgId,
        "insert into core.suppression_entry (id, organization_id, address_kind, address_hash, masked_address, reason) values ($1, $2, $3, $4, 'm***@x.test', $5)",
        [newId('sup'), orgId, kind, value, reason]
      )

    test('one live entry per Organization, address kind and hash; the same hash is free elsewhere', async () => {
      const a = await seed()
      const b = await seed()
      const value = hash()
      await add(a.orgId, 'email', value)
      expect((await refusal(add(a.orgId, 'email', value))).code).toBe(UNIQUE_VIOLATION)
      await add(a.orgId, 'phone', value)
      await add(b.orgId, 'email', value)
    })

    test('a removed manual entry frees its hash, and only manual entries can be removed', async () => {
      const a = await seed()
      const value = hash()
      await add(a.orgId, 'email', value, 'manual')
      await run(
        a.orgId,
        "update core.suppression_entry set removed_at = now(), removed_by_user_id = $2, removal_reason = 'asked' where address_hash = $1",
        [value, a.userId]
      )
      await add(a.orgId, 'email', value, 'manual')
      const locked = hash()
      await add(a.orgId, 'email', locked, 'complaint')
      const error = await refusal(
        run(
          a.orgId,
          "update core.suppression_entry set removed_at = now(), removed_by_user_id = $2, removal_reason = 'x' where address_hash = $1",
          [locked, a.userId]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })

    test('removal fields are all or none, a hash is 32 octets and an erased entry has no masked address', async () => {
      const a = await seed()
      const partial = await refusal(
        run(a.orgId, 'update core.suppression_entry set removed_at = now() where id = $1', [
          a.suppressionId,
        ])
      )
      expect(partial.code).toBe(CHECK_VIOLATION)
      const short = await refusal(add(a.orgId, 'email', randomBytes(16)))
      expect(short.code).toBe(CHECK_VIOLATION)
      const erased = await refusal(add(a.orgId, 'email', hash(), 'erased'))
      expect(erased.code).toBe(CHECK_VIOLATION)
      await run(
        a.orgId,
        "insert into core.suppression_entry (id, organization_id, address_kind, address_hash, reason) values ($1, $2, 'email', $3, 'erased')",
        [newId('sup'), a.orgId, hash()]
      )
    })

    test('removable is derived from the reason', async () => {
      const a = await seed()
      await add(a.orgId, 'linkedin', hash(), 'manual')
      const rows = await run(
        a.orgId,
        'select reason, removable from core.suppression_entry order by reason',
        []
      )
      expect(rows.rows.map((r) => [r.reason, r.removable])).toEqual([
        ['manual', true],
        ['unsubscribe', false],
      ])
    })
  })

  describe('the check log', () => {
    test.each([
      ['an allowance without a basis', 'true, null, null'],
      ['an allowance with a code', "true, 'consent_granted', 'consent.missing'"],
      ['a denial without a code', 'false, null, null'],
      ['a denial with a basis', "false, 'reply', 'consent.missing'"],
      ['the synthesised unavailable code', "false, null, 'consent.unavailable'"],
    ])('refuses %s', async (_name, outcome) => {
      const a = await seed()
      const error = await refusal(
        run(
          a.orgId,
          `insert into core.contact_check_log (id, organization_id, channel, purpose, caller, allowed, basis, code) values ($1, $2, 'email', 'reply', 'core', ${outcome})`,
          [newId('chk'), a.orgId]
        )
      )
      expect(error.code).toBe(CHECK_VIOLATION)
    })

    test('accepts a denial for a Prospect that does not exist, and keeps it when the Prospect is erased', async () => {
      const a = await seed()
      await run(
        a.orgId,
        "insert into core.contact_check_log (id, organization_id, prospect_id, channel, purpose, caller, allowed, code) values ($1, $2, $3, 'sms', 'agent_initiated', 'voice', false, 'consent.missing')",
        [newId('chk'), a.orgId, newId('prs')]
      )
      await run(a.orgId, 'delete from core.prospects where id = $1', [a.prospectId])
      expect(await countOf(a.orgId, 'contact_check_log')).toBe(2)
    })
  })

  describe('indexes on the check path', () => {
    test("a channel's newest event is read from the channel index", async () => {
      const a = await seed()
      const plan = await scoped(a.orgId, async (c) => {
        await c.query('set local enable_seqscan = off')
        return c.query(
          "explain select * from core.contact_consent_event where organization_id = $1 and prospect_id = $2 and channel = 'email' order by seq desc limit 1",
          [a.orgId, a.prospectId]
        )
      })
      const text = plan.rows.map((r: Record<string, string>) => r['QUERY PLAN']).join('\n')
      // With a handful of rows the Prospect index is as cheap as the channel one, so either serves.
      expect(text).toMatch(/Index Scan using contact_consent_events_(channel|prospect)_idx/)
      expect(text).not.toContain('Seq Scan')
    })

    test('the live suppression lookup uses its unique index at 1,000,000 rows', async () => {
      const orgId = await createOrganization()
      const target = hash()
      // One Organization holds a million entries; the owner is still bound by row-level security.
      const loader = await owner.connect()
      try {
        await loader.query('begin')
        await loader.query('select set_config($1, $2, true)', [SETTING, orgId])
        await loader.query(
          `insert into core.suppression_entry (id, organization_id, address_kind, address_hash, masked_address, reason)
           select 'sup_' || lpad(to_hex(n), 32, '0'), $1, (array['email','phone','linkedin'])[1 + n % 3],
                  sha256(('addr' || n)::text::bytea), 'x***', 'bounce'
           from generate_series(1, 1000000) as n`,
          [orgId]
        )
        await loader.query(
          "insert into core.suppression_entry (id, organization_id, address_kind, address_hash, masked_address, reason) values ($1, $2, 'email', $3, 'x***', 'bounce')",
          [newId('sup'), orgId, target]
        )
        await loader.query('commit')
      } finally {
        loader.release()
      }
      const restore = await pinColumnStats(owner, 'core.suppression_entry', {
        organization_id: 1000,
        address_kind: 3,
      })
      try {
        const plan = await scoped(orgId, async (c) => {
          await c.query(
            'prepare live_lookup (text, text, bytea) as select id from core.suppression_entry where organization_id = $1 and address_kind = $2 and address_hash = $3 and removed_at is null'
          )
          await c.query('set local plan_cache_mode = force_generic_plan')
          return c.query(
            `explain execute live_lookup ('${orgId}', 'email', '\\x${target.toString('hex')}')`
          )
        })
        const text = plan.rows.map((r: Record<string, string>) => r['QUERY PLAN']).join('\n')
        expect(text).toContain('suppression_entry_live_key')
        expect(text).not.toContain('Seq Scan')
      } finally {
        await restore()
        await removeOrganization(orgId)
      }
    }, 180000)
  })

  describe('suppression imports', () => {
    const addImport = (
      orgId: string,
      userId: string,
      columns = '',
      values = ''
    ): Promise<string> => {
      const id = newId('simp')
      return run(
        orgId,
        `insert into core.suppression_imports (id, organization_id, size_bytes, content_hash, object_key, created_by_user_id${columns}) values ($1, $2, 10, $3, 'k/1', $4${values})`,
        [id, orgId, hash(), userId]
      ).then(() => id)
    }

    test('counts are set exactly when completed and add up to the total', async () => {
      const a = await seed()
      const done =
        ', state, total_rows, added_rows, already_suppressed_rows, invalid_rows, completed_at'
      await addImport(a.orgId, a.userId, done, ", 'completed', 3, 1, 1, 1, now()")
      const bad = [
        ", 'completed', 3, 1, 1, 0, now()",
        ", 'completed', 3, 3, 0, 0, null",
        ", 'processing', 3, 3, 0, 0, now()",
      ]
      for (const values of bad) {
        expect((await refusal(addImport(a.orgId, a.userId, done, values))).code).toBe(
          CHECK_VIOLATION
        )
      }
    })

    test('a row is invalid exactly when it has a reason, and rows go with their import', async () => {
      const a = await seed()
      const b = await seed()
      const importId = await addImport(a.orgId, a.userId)
      const row = (n: number, result: string, reason: string | null) =>
        run(
          a.orgId,
          'insert into core.suppression_import_rows (organization_id, import_id, row_number, result, reason) values ($1, $2, $3, $4, $5)',
          [a.orgId, importId, n, result, reason]
        )
      await row(2, 'added', null)
      await row(3, 'invalid', 'unsupported_address')
      expect((await refusal(row(4, 'invalid', null))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(row(4, 'added', 'unreadable_address'))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(row(1, 'added', null))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(row(50_002, 'added', null))).code).toBe(CHECK_VIOLATION)
      expect(await countOf(b.orgId, 'suppression_import_rows')).toBe(0)
      await run(a.orgId, 'delete from core.suppression_imports where id = $1', [importId])
      expect(await countOf(a.orgId, 'suppression_import_rows')).toBe(0)
    })
  })
})
