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

const TABLES = [
  'enrichment_runs',
  'enrichment_attempts',
  'signals',
  'fit_criteria',
  'provider_settings',
  'enrichment_spend',
]

/** One harmless update per table that allows updates, to prove a second Organization updates nothing. */
const UPDATES = {
  enrichment_runs: "status = 'running', started_at = now()",
  fit_criteria: 'weight = 7',
  provider_settings: 'enabled = false',
  enrichment_spend: 'calls = 9',
} as const

interface Seeded {
  orgId: string
  runId: string
  prospectId: string
}

describe('outbound enrichment tables', () => {
  let outbound: Pool
  let owner: Pool
  let handle: DbHandle
  const orgs: string[] = []

  /** Run `fn` in one transaction scoped to `organizationId` (or to none), as the outbound role. */
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

  /** Run a statement as the migration owner, scoped to `orgId`: what an Organization purge uses. */
  const runAsOwner = (orgId: string, sql: string, values: unknown[] = []) =>
    scoped(orgId, (c) => c.query(sql, values), owner)

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

  /** An Organization id that is cleaned up after the run. */
  const newOrg = (): string => {
    const orgId = newId('org')
    orgs.push(orgId)
    return orgId
  }

  const addRun = async (
    orgId: string,
    options: {
      id?: string
      prospectId?: string
      requestId?: string
      status?: string
      stopReason?: string | null
      runSetId?: string | null
      groups?: string[]
      fields?: unknown
      emailVerification?: unknown
      startedAt?: Date | null
      completedAt?: Date | null
      createdAt?: Date
      cost?: number
      ceiling?: number
    } = {}
  ) => {
    const id = options.id ?? newId('erun')
    const status = options.status ?? 'queued'
    const terminal = ['complete', 'incomplete', 'stopped'].includes(status)
    await run(
      orgId,
      `insert into outbound.enrichment_runs (id, organization_id, run_set_id, prospect_id, request_id, status, stop_reason, groups, fields, email_verification, cost_micros, ceiling_micros, created_at, started_at, completed_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13, $14, $15)`,
      [
        id,
        orgId,
        options.runSetId ?? null,
        options.prospectId ?? newId('prs'),
        options.requestId ?? newId('req'),
        status,
        options.stopReason !== undefined
          ? options.stopReason
          : status === 'stopped'
            ? 'monthly_budget'
            : null,
        options.groups ?? ['person', 'company'],
        JSON.stringify(options.fields ?? []),
        options.emailVerification === undefined ? null : JSON.stringify(options.emailVerification),
        options.cost ?? 0,
        options.ceiling ?? 5_000_000,
        options.createdAt ?? new Date(),
        options.startedAt === undefined
          ? status === 'queued'
            ? null
            : new Date()
          : options.startedAt,
        options.completedAt === undefined ? (terminal ? new Date() : null) : options.completedAt,
      ]
    )
    return id
  }

  const addAttempt = (
    orgId: string,
    runId: string,
    options: {
      position?: number
      provider?: string
      group?: string
      outcome?: string
      failure?: string | null
      cost?: number
      duration?: number
    } = {}
  ) =>
    run(
      orgId,
      `insert into outbound.enrichment_attempts (organization_id, run_id, position, provider, field_group, outcome, failure, cost_micros, started_at, duration_ms)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now(), $9)`,
      [
        orgId,
        runId,
        options.position ?? 0,
        options.provider ?? 'apollo',
        options.group ?? 'person',
        options.outcome ?? 'filled',
        options.failure ?? null,
        options.cost ?? 1000,
        options.duration ?? 120,
      ]
    )

  const addSignal = async (
    orgId: string,
    options: {
      id?: string
      prospectId?: string
      kind?: string
      sourceType?: string
      provider?: string | null
      userId?: string | null
      eventId?: string | null
      observedAt?: Date
      expiresAt?: Date
      detail?: unknown
    } = {}
  ) => {
    const id = options.id ?? newId('sig')
    const sourceType = options.sourceType ?? 'provider'
    const observedAt = options.observedAt ?? new Date('2026-10-01T00:00:00Z')
    await run(
      orgId,
      `insert into outbound.signals (id, organization_id, prospect_id, kind, source_type, source_provider, source_user_id, event_id, observed_at, expires_at, detail)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
      [
        id,
        orgId,
        options.prospectId ?? newId('prs'),
        options.kind ?? 'funding',
        sourceType,
        options.provider === undefined
          ? sourceType === 'provider'
            ? 'apollo'
            : null
          : options.provider,
        options.userId === undefined
          ? sourceType === 'manual'
            ? newId('usr')
            : null
          : options.userId,
        options.eventId === undefined
          ? sourceType === 'webhook'
            ? `evt_${randomBytes(6).toString('hex')}`
            : null
          : options.eventId,
        observedAt,
        options.expiresAt ?? new Date(observedAt.getTime() + 30 * 86_400_000),
        JSON.stringify(
          options.detail ?? { round: 'seed', amountMajorUnits: 1000, currency: 'USD' }
        ),
      ]
    )
    return id
  }

  const addCriterion = (
    orgId: string,
    options: {
      id?: string
      name?: string
      field?: string
      condition?: unknown
      weight?: number
      createdAt?: Date
    } = {}
  ) =>
    run(
      orgId,
      `insert into outbound.fit_criteria (id, organization_id, name, field, condition, weight, created_at)
       values ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
      [
        options.id ?? newId('fcr'),
        orgId,
        options.name ?? `Criterion ${randomBytes(4).toString('hex')}`,
        options.field ?? 'industry',
        JSON.stringify(options.condition ?? { operator: 'one_of', values: ['Software'] }),
        options.weight ?? 10,
        options.createdAt ?? new Date(),
      ]
    )

  const addProvider = (
    orgId: string,
    options: {
      provider?: string
      sealed?: Buffer | null
      keyId?: string | null
      updatedAt?: Date | null
      positions?: [number | null, number | null, number | null]
    } = {}
  ) => {
    const sealed = options.sealed === undefined ? Buffer.from('ciphertext') : options.sealed
    const keyId = options.keyId === undefined ? (sealed ? 'k1' : null) : options.keyId
    const updatedAt =
      options.updatedAt === undefined ? (sealed ? new Date() : null) : options.updatedAt
    const [person, company, email] = options.positions ?? [0, null, null]
    return run(
      orgId,
      `insert into outbound.provider_settings (organization_id, provider, enabled, credential_ciphertext, credential_key_id, credential_updated_at, person_position, company_position, email_verification_position)
       values ($1, $2, true, $3, $4, $5, $6, $7, $8)`,
      [orgId, options.provider ?? 'apollo', sealed, keyId, updatedAt, person, company, email]
    )
  }

  const addSpend = (
    orgId: string,
    options: { month?: string; provider?: string; cost?: number; calls?: number } = {}
  ) =>
    run(
      orgId,
      `insert into outbound.enrichment_spend (organization_id, month, provider, cost_micros, calls)
       values ($1, $2, $3, $4, $5)`,
      [
        orgId,
        options.month ?? '2026-10-01',
        options.provider ?? 'apollo',
        options.cost ?? 5000,
        options.calls ?? 5,
      ]
    )

  /** Create an Organization with one row in every table. */
  async function seed(): Promise<Seeded> {
    const orgId = newOrg()
    const prospectId = newId('prs')
    const runId = await addRun(orgId, { prospectId })
    await addAttempt(orgId, runId)
    await addSignal(orgId, { prospectId })
    await addCriterion(orgId)
    await addProvider(orgId)
    await addSpend(orgId)
    return { orgId, runId, prospectId }
  }

  beforeAll(async () => {
    await migrateUp(env.owner)
    outbound = new Pool({ connectionString: env.outbound, max: 6 })
    owner = new Pool({ connectionString: env.owner, max: 2 })
    handle = createDb(env.outbound, { max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      // Runs take their attempts along.
      for (const table of [
        'enrichment_runs',
        'signals',
        'fit_criteria',
        'provider_settings',
        'enrichment_spend',
      ]) {
        await runAsOwner(orgId, `delete from outbound.${table}`)
      }
    }
    await dropStaleTestObjects(owner, env.owner)
    await handle.close()
    await Promise.all([owner.end(), outbound.end()])
  })

  test('every table of the schema passes the tenant isolation check', async () => {
    expect(await findTenantIsolationGaps(handle.db)).toEqual([])
  })

  describe.each(TABLES)('%s', (table) => {
    test('a second Organization reads and removes nothing of the first, and no scope sees nothing', async () => {
      const a = await seed()
      const b = await seed()
      expect(await countOf(a.orgId, table)).toBe(1)
      expect(await countOf(b.orgId, table)).toBe(1)
      expect(await countOf(null, table)).toBe(0)
      const read = await run(
        b.orgId,
        `select 1 from outbound.${table} where organization_id = $1`,
        [a.orgId]
      )
      expect(read.rowCount).toBe(0)
      const removed = await run(
        b.orgId,
        `delete from outbound.${table} where organization_id = $1`,
        [a.orgId]
      )
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
        `update outbound.${table} set ${UPDATES[table]} where organization_id = $1`,
        [a.orgId]
      )
      expect(result.rowCount).toBe(0)
    })
  })

  test('a second Organization cannot insert rows for the first', async () => {
    const a = await seed()
    const b = await seed()
    const error = await refusal(
      run(
        b.orgId,
        `insert into outbound.enrichment_spend (organization_id, month, provider) values ($1, '2026-09-01', 'apollo')`,
        [a.orgId]
      )
    )
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
  })

  test('an attempt cannot name another Organization run, even through its own scope', async () => {
    const a = await seed()
    const b = await seed()
    expect((await refusal(addAttempt(b.orgId, a.runId, { position: 1 }))).code).toBe(
      FOREIGN_KEY_VIOLATION
    )
  })

  test('the service role cannot update an attempt or a signal', async () => {
    const a = await seed()
    const attempt = await refusal(
      run(a.orgId, "update outbound.enrichment_attempts set outcome = 'no_result', cost_micros = 0")
    )
    expect(attempt.code).toBe(INSUFFICIENT_PRIVILEGE)
    const signal = await refusal(run(a.orgId, "update outbound.signals set kind = 'note'"))
    expect(signal.code).toBe(INSUFFICIENT_PRIVILEGE)
  })

  test('the outbound role cannot read another service schema', async () => {
    const a = await seed()
    for (const table of ['core.prospects', 'playbook.calls', 'auth.users', 'voice.calls']) {
      const error = await refusal(run(a.orgId, `select 1 from ${table} limit 1`))
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
    }
  })

  describe('enrichment_runs', () => {
    test('the id, Prospect and run set have their shapes', async () => {
      const orgId = newOrg()
      expect((await refusal(addRun(orgId, { id: 'erun_nope' }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addRun(orgId, { prospectId: 'prs_nope' }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addRun(orgId, { runSetId: 'erset_nope' }))).code).toBe(CHECK_VIOLATION)
      await addRun(orgId, { runSetId: newId('erset') })
    })

    test('a request id charges a Prospect once: a second run with it is refused', async () => {
      const orgId = newOrg()
      const prospectId = newId('prs')
      await addRun(orgId, { prospectId, requestId: 'req-1' })
      expect((await refusal(addRun(orgId, { prospectId, requestId: 'req-1' }))).code).toBe(
        UNIQUE_VIOLATION
      )
      await addRun(orgId, { prospectId: newId('prs'), requestId: 'req-1' })
      await addRun(orgId, { prospectId, requestId: 'req-2' })
      await addRun(newOrg(), { prospectId, requestId: 'req-1' })
    })

    test('the status and stop reason agree', async () => {
      const orgId = newOrg()
      expect((await refusal(addRun(orgId, { status: 'bogus' }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addRun(orgId, { status: 'stopped', stopReason: null }))).code).toBe(
        CHECK_VIOLATION
      )
      expect(
        (await refusal(addRun(orgId, { status: 'complete', stopReason: 'run_ceiling' }))).code
      ).toBe(CHECK_VIOLATION)
      expect(
        (await refusal(addRun(orgId, { status: 'stopped', stopReason: 'someone_said' }))).code
      ).toBe(CHECK_VIOLATION)
      await addRun(orgId, { status: 'stopped', stopReason: 'run_ceiling' })
    })

    test('completion times follow the status', async () => {
      const orgId = newOrg()
      expect((await refusal(addRun(orgId, { status: 'complete', completedAt: null }))).code).toBe(
        CHECK_VIOLATION
      )
      expect(
        (await refusal(addRun(orgId, { status: 'running', completedAt: new Date() }))).code
      ).toBe(CHECK_VIOLATION)
      expect((await refusal(addRun(orgId, { status: 'queued', startedAt: new Date() }))).code).toBe(
        CHECK_VIOLATION
      )
    })

    test('groups are one to three distinct known groups', async () => {
      const orgId = newOrg()
      for (const groups of [[], ['person', 'person'], ['person', 'phone'], ['a', 'b', 'c', 'd']]) {
        expect((await refusal(addRun(orgId, { groups }))).code).toBe(CHECK_VIOLATION)
      }
      await addRun(orgId, { groups: ['person', 'company', 'email_verification'] })
    })

    test('fields are an array of at most eleven and the verification an object or null', async () => {
      const orgId = newOrg()
      expect((await refusal(addRun(orgId, { fields: { a: 1 } }))).code).toBe(CHECK_VIOLATION)
      expect(
        (await refusal(addRun(orgId, { fields: Array.from({ length: 12 }, () => ({})) }))).code
      ).toBe(CHECK_VIOLATION)
      expect((await refusal(addRun(orgId, { emailVerification: [1] }))).code).toBe(CHECK_VIOLATION)
      await addRun(orgId, {
        fields: Array.from({ length: 11 }, () => ({})),
        emailVerification: { status: 'valid' },
      })
    })

    test('costs are whole micro-dollars within the contract bounds', async () => {
      const orgId = newOrg()
      expect((await refusal(addRun(orgId, { cost: -1 }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addRun(orgId, { ceiling: 1_000_000_000_001 }))).code).toBe(
        CHECK_VIOLATION
      )
      await addRun(orgId, { cost: 1_000_000_000_000, ceiling: 1_000_000_000_000 })
    })

    test('runs page newest first by (created_at, id) with no gap or repeat', async () => {
      const orgId = newOrg()
      const sameTime = new Date('2026-10-02T00:00:00Z')
      const ids: string[] = []
      for (let i = 0; i < 7; i += 1) {
        ids.push(
          await addRun(orgId, {
            createdAt: i < 3 ? sameTime : new Date(sameTime.getTime() + i * 1000),
          })
        )
      }
      const seen: string[] = []
      let cursor: { at: Date; id: string } | null = null
      for (;;) {
        const page: { id: string; created_at: Date }[] = (
          await run(
            orgId,
            `select id, created_at from outbound.enrichment_runs
             where ($1::timestamptz is null or (created_at, id) < ($1, $2))
             order by created_at desc, id desc limit 3`,
            [cursor?.at ?? null, cursor?.id ?? null]
          )
        ).rows
        if (page.length === 0) {
          break
        }
        seen.push(...page.map((r) => r.id))
        const last = page[page.length - 1]
        if (!last) {
          break
        }
        cursor = { at: last.created_at, id: last.id }
      }
      expect(seen).toHaveLength(7)
      expect(new Set(seen).size).toBe(7)
      expect([...seen].sort()).toEqual([...ids].sort())
    })

    test('deleting a run deletes its attempts', async () => {
      const orgId = newOrg()
      const runId = await addRun(orgId)
      await addAttempt(orgId, runId)
      expect(await countOf(orgId, 'enrichment_attempts')).toBe(1)
      await run(orgId, 'delete from outbound.enrichment_runs where id = $1', [runId])
      expect(await countOf(orgId, 'enrichment_attempts')).toBe(0)
    })
  })

  describe('enrichment_attempts', () => {
    test('an attempt is one position of one run, once', async () => {
      const orgId = newOrg()
      const runId = await addRun(orgId)
      await addAttempt(orgId, runId, { position: 0 })
      expect((await refusal(addAttempt(orgId, runId, { position: 0 }))).code).toBe(UNIQUE_VIOLATION)
      expect((await refusal(addAttempt(orgId, runId, { position: 150 }))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(addAttempt(orgId, runId, { position: -1 }))).code).toBe(CHECK_VIOLATION)
      await addAttempt(orgId, runId, { position: 149 })
    })

    test('provider, group, outcome and failure are closed values', async () => {
      const orgId = newOrg()
      const runId = await addRun(orgId)
      const attempts = [
        { provider: 'Apollo' },
        { provider: '1apollo' },
        { provider: 'a'.repeat(33) },
        { group: 'phone' },
        { outcome: 'maybe' },
        { outcome: 'failed', failure: 'on_fire' },
      ]
      for (const [i, attempt] of attempts.entries()) {
        expect((await refusal(addAttempt(orgId, runId, { position: i, ...attempt }))).code).toBe(
          CHECK_VIOLATION
        )
      }
    })

    test('a failure is named exactly when the outcome is failed', async () => {
      const orgId = newOrg()
      const runId = await addRun(orgId)
      expect(
        (await refusal(addAttempt(orgId, runId, { outcome: 'failed', failure: null }))).code
      ).toBe(CHECK_VIOLATION)
      expect(
        (await refusal(addAttempt(orgId, runId, { outcome: 'filled', failure: 'timeout' }))).code
      ).toBe(CHECK_VIOLATION)
      await addAttempt(orgId, runId, { position: 1, outcome: 'failed', failure: 'timeout' })
    })

    test('a skipped attempt costs nothing', async () => {
      const orgId = newOrg()
      const runId = await addRun(orgId)
      const skipped = ['skipped_disabled', 'skipped_circuit_open', 'skipped_budget']
      for (const [i, outcome] of skipped.entries()) {
        expect(
          (await refusal(addAttempt(orgId, runId, { position: i, outcome, cost: 1 }))).code
        ).toBe(CHECK_VIOLATION)
        await addAttempt(orgId, runId, { position: i + 10, outcome, cost: 0 })
      }
    })

    test('cost and duration are bounded', async () => {
      const orgId = newOrg()
      const runId = await addRun(orgId)
      expect((await refusal(addAttempt(orgId, runId, { cost: -1 }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addAttempt(orgId, runId, { duration: 600_001 }))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(addAttempt(orgId, runId, { duration: -1 }))).code).toBe(CHECK_VIOLATION)
    })
  })

  describe('signals', () => {
    test('the id, Prospect, kind and times are checked', async () => {
      const orgId = newOrg()
      expect((await refusal(addSignal(orgId, { id: 'sig_nope' }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addSignal(orgId, { prospectId: 'prs_nope' }))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(addSignal(orgId, { kind: 'rumour' }))).code).toBe(CHECK_VIOLATION)
      const observedAt = new Date('2026-10-01T00:00:00Z')
      expect(
        (
          await refusal(
            addSignal(orgId, { observedAt, expiresAt: new Date('2026-09-30T00:00:00Z') })
          )
        ).code
      ).toBe(CHECK_VIOLATION)
      for (const kind of [
        'funding',
        'hiring_spike',
        'job_change',
        'technology_change',
        'website_visit',
        'note',
      ]) {
        await addSignal(orgId, { kind, detail: { text: 'x' } })
      }
    })

    test('the source names exactly what it needs', async () => {
      const orgId = newOrg()
      const bad = [
        { sourceType: 'provider', provider: null },
        { sourceType: 'provider', provider: 'apollo', userId: newId('usr') },
        { sourceType: 'provider', provider: 'Apollo' },
        { sourceType: 'webhook', provider: 'apollo' },
        { sourceType: 'webhook', eventId: null },
        { sourceType: 'webhook', eventId: 'short' },
        { sourceType: 'manual', userId: null },
        { sourceType: 'manual', userId: 'usr_nope' },
        { sourceType: 'manual', eventId: 'evt_12345678' },
        { sourceType: 'carrier_pigeon' },
      ]
      for (const options of bad) {
        expect((await refusal(addSignal(orgId, options))).code).toBe(CHECK_VIOLATION)
      }
      await addSignal(orgId, { sourceType: 'webhook', kind: 'website_visit' })
      await addSignal(orgId, { sourceType: 'manual', kind: 'note' })
    })

    test('a webhook event id records once per Organization', async () => {
      const orgId = newOrg()
      await addSignal(orgId, { sourceType: 'webhook', eventId: 'evt_replay_1' })
      expect(
        (await refusal(addSignal(orgId, { sourceType: 'webhook', eventId: 'evt_replay_1' }))).code
      ).toBe(UNIQUE_VIOLATION)
      await addSignal(newOrg(), { sourceType: 'webhook', eventId: 'evt_replay_1' })
    })

    test('the detail is a bounded object', async () => {
      const orgId = newOrg()
      expect((await refusal(addSignal(orgId, { detail: ['a'] }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addSignal(orgId, { detail: 'text' }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addSignal(orgId, { detail: { text: 'x'.repeat(5000) } }))).code).toBe(
        CHECK_VIOLATION
      )
    })

    test('a Prospect signals page newest first by (observed_at, id), also by kind', async () => {
      const orgId = newOrg()
      const prospectId = newId('prs')
      const base = new Date('2026-10-01T00:00:00Z')
      for (let i = 0; i < 8; i += 1) {
        await addSignal(orgId, {
          prospectId,
          kind: i % 2 === 0 ? 'note' : 'funding',
          sourceType: 'provider',
          observedAt: i < 4 ? base : new Date(base.getTime() + i * 60_000),
        })
      }
      await addSignal(orgId, { prospectId: newId('prs') })
      const page = async (kind: string | null, limit: number) => {
        const out: string[] = []
        let cursor: { at: Date; id: string } | null = null
        for (;;) {
          const rows: { id: string; observed_at: Date }[] = (
            await run(
              orgId,
              `select id, observed_at from outbound.signals
               where prospect_id = $1 and ($2::text is null or kind = $2)
                 and ($3::timestamptz is null or (observed_at, id) < ($3, $4))
               order by observed_at desc, id desc limit $5`,
              [prospectId, kind, cursor?.at ?? null, cursor?.id ?? null, limit]
            )
          ).rows
          if (rows.length === 0) {
            break
          }
          out.push(...rows.map((r) => r.id))
          const last = rows[rows.length - 1]
          if (!last) {
            break
          }
          cursor = { at: last.observed_at, id: last.id }
        }
        return out
      }
      const all = await page(null, 3)
      expect(all).toHaveLength(8)
      expect(new Set(all).size).toBe(8)
      expect(await page('note', 3)).toHaveLength(4)
    })
  })

  describe('fit_criteria', () => {
    test('a name is unique per Organization ignoring case', async () => {
      const orgId = newOrg()
      await addCriterion(orgId, { name: 'Series A software' })
      expect((await refusal(addCriterion(orgId, { name: 'series a SOFTWARE' }))).code).toBe(
        UNIQUE_VIOLATION
      )
      await addCriterion(newOrg(), { name: 'Series A software' })
    })

    test('id, name, field and weight are bounded', async () => {
      const orgId = newOrg()
      expect((await refusal(addCriterion(orgId, { id: 'fcr_nope' }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addCriterion(orgId, { name: '' }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addCriterion(orgId, { name: 'n'.repeat(101) }))).code).toBe(
        CHECK_VIOLATION
      )
      expect((await refusal(addCriterion(orgId, { field: 'shoeSize' }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addCriterion(orgId, { weight: 0 }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addCriterion(orgId, { weight: 101 }))).code).toBe(CHECK_VIOLATION)
      await addCriterion(orgId, { weight: 100 })
    })

    test('the condition suits the field', async () => {
      const orgId = newOrg()
      const bad = [
        { field: 'employeeCount', condition: { operator: 'one_of', values: ['10'] } },
        { field: 'industry', condition: { operator: 'between', min: 1, max: 2 } },
        { field: 'employeeCount', condition: { operator: 'between', min: null, max: null } },
        { field: 'industry', condition: { operator: 'one_of', values: [] } },
        { field: 'industry', condition: { operator: 'one_of' } },
        { field: 'industry', condition: { operator: 'contains_any', values: Array(21).fill('x') } },
        { field: 'industry', condition: { operator: 'starts_with', values: ['x'] } },
        { field: 'industry', condition: ['x'] },
        { field: 'employeeCount', condition: { operator: 'between', min: 'a', max: null } },
        { field: 'employeeCount', condition: { operator: 'between', min: 10, max: 5 } },
      ]
      for (const options of bad) {
        expect((await refusal(addCriterion(orgId, options))).code).toBe(CHECK_VIOLATION)
      }
      await addCriterion(orgId, {
        field: 'employeeCount',
        condition: { operator: 'between', min: 10, max: null },
      })
      await addCriterion(orgId, {
        field: 'technologies',
        condition: { operator: 'contains_any', values: ['postgres'] },
      })
    })

    test('criteria page oldest first by (created_at, id)', async () => {
      const orgId = newOrg()
      const t = new Date('2026-10-01T00:00:00Z')
      for (let i = 0; i < 7; i += 1) {
        await addCriterion(orgId, { createdAt: i < 3 ? t : new Date(t.getTime() + i * 1000) })
      }
      const seen: string[] = []
      let cursor: { at: Date; id: string } | null = null
      for (;;) {
        const rows: { id: string; created_at: Date }[] = (
          await run(
            orgId,
            `select id, created_at from outbound.fit_criteria
             where ($1::timestamptz is null or (created_at, id) > ($1, $2))
             order by created_at, id limit 3`,
            [cursor?.at ?? null, cursor?.id ?? null]
          )
        ).rows
        if (rows.length === 0) {
          break
        }
        seen.push(...rows.map((r) => r.id))
        const last = rows[rows.length - 1]
        if (!last) {
          break
        }
        cursor = { at: last.created_at, id: last.id }
      }
      expect(seen).toHaveLength(7)
      expect(new Set(seen).size).toBe(7)
    })
  })

  describe('provider_settings', () => {
    test('one row per provider per Organization', async () => {
      const orgId = newOrg()
      await addProvider(orgId, { provider: 'apollo' })
      expect((await refusal(addProvider(orgId, { provider: 'apollo' }))).code).toBe(
        UNIQUE_VIOLATION
      )
      await addProvider(newOrg(), { provider: 'apollo' })
    })

    test('the provider key has the contract shape', async () => {
      const orgId = newOrg()
      for (const provider of ['Apollo', '9lives', 'a-b', '', 'a'.repeat(33)]) {
        expect((await refusal(addProvider(orgId, { provider }))).code).toBe(CHECK_VIOLATION)
      }
      await addProvider(orgId, { provider: 'zero_bounce' })
    })

    test('a sealed key comes with its key id and time, or none of the three is set', async () => {
      const orgId = newOrg()
      const bad = [
        { provider: 'p1', sealed: Buffer.from('c'), keyId: null },
        { provider: 'p2', sealed: Buffer.from('c'), updatedAt: null },
        { provider: 'p3', sealed: null, keyId: 'k1', updatedAt: null },
        { provider: 'p4', sealed: null, keyId: null, updatedAt: new Date() },
        { provider: 'p5', sealed: Buffer.alloc(0) },
        { provider: 'p6', sealed: Buffer.alloc(2049) },
        { provider: 'p7', keyId: 'k'.repeat(129) },
      ]
      for (const options of bad) {
        expect((await refusal(addProvider(orgId, options))).code).toBe(CHECK_VIOLATION)
      }
      await addProvider(orgId, { provider: 'with_key' })
      await addProvider(orgId, { provider: 'no_key', sealed: null })
    })

    test('the stored key comes back as the ciphertext written', async () => {
      const orgId = newOrg()
      await addProvider(orgId, { sealed: Buffer.from([1, 2, 3, 4]) })
      const row = (await run(orgId, 'select credential_ciphertext from outbound.provider_settings'))
        .rows[0]
      expect(Buffer.from(row.credential_ciphertext)).toEqual(Buffer.from([1, 2, 3, 4]))
    })

    test('waterfall positions are small and per group', async () => {
      const orgId = newOrg()
      expect(
        (await refusal(addProvider(orgId, { provider: 'q1', positions: [-1, null, null] }))).code
      ).toBe(CHECK_VIOLATION)
      expect(
        (await refusal(addProvider(orgId, { provider: 'q2', positions: [null, 50, null] }))).code
      ).toBe(CHECK_VIOLATION)
      await addProvider(orgId, { provider: 'q3', positions: [0, 49, 3] })
    })
  })

  describe('enrichment_spend', () => {
    test('one row per month and provider, and the month is its first day', async () => {
      const orgId = newOrg()
      await addSpend(orgId, { month: '2026-10-01', provider: 'apollo' })
      expect(
        (await refusal(addSpend(orgId, { month: '2026-10-01', provider: 'apollo' }))).code
      ).toBe(UNIQUE_VIOLATION)
      expect(
        (await refusal(addSpend(orgId, { month: '2026-10-15', provider: 'apollo' }))).code
      ).toBe(CHECK_VIOLATION)
      await addSpend(orgId, { month: '2026-11-01', provider: 'apollo' })
      await addSpend(orgId, { month: '2026-10-01', provider: 'zero_bounce' })
    })

    test('counts are not negative and the provider has its shape', async () => {
      const orgId = newOrg()
      expect((await refusal(addSpend(orgId, { cost: -1 }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addSpend(orgId, { calls: -1 }))).code).toBe(CHECK_VIOLATION)
      expect((await refusal(addSpend(orgId, { provider: 'Bad Name' }))).code).toBe(CHECK_VIOLATION)
    })

    test('the service adds to the row in one upsert, so a retry stays one row', async () => {
      const orgId = newOrg()
      for (let i = 0; i < 3; i += 1) {
        await run(
          orgId,
          `insert into outbound.enrichment_spend (organization_id, month, provider, cost_micros, calls)
           values ($1, '2026-10-01', 'apollo', 100, 1)
           on conflict (organization_id, month, provider) do update
           set cost_micros = enrichment_spend.cost_micros + excluded.cost_micros,
               calls = enrichment_spend.calls + excluded.calls, updated_at = now()`,
          [orgId]
        )
      }
      const rows = (await run(orgId, 'select cost_micros, calls from outbound.enrichment_spend'))
        .rows
      expect(rows).toHaveLength(1)
      expect(Number(rows[0].cost_micros)).toBe(300)
      expect(Number(rows[0].calls)).toBe(3)
    })

    test('spend pages newest month first, then provider', async () => {
      const orgId = newOrg()
      for (const month of ['2026-08-01', '2026-09-01', '2026-10-01']) {
        for (const provider of ['apollo', 'exa', 'zero_bounce']) {
          await addSpend(orgId, { month, provider })
        }
      }
      const seen: string[] = []
      let cursor: { month: string; provider: string } | null = null
      for (;;) {
        const rows: { month: string; provider: string }[] = (
          await run(
            orgId,
            `select to_char(month, 'YYYY-MM-DD') as month, provider from outbound.enrichment_spend
             where ($1::date is null or (month < $1::date or (month = $1::date and provider > $2)))
             order by month desc, provider limit 4`,
            [cursor?.month ?? null, cursor?.provider ?? null]
          )
        ).rows
        if (rows.length === 0) {
          break
        }
        seen.push(...rows.map((r) => `${r.month}/${r.provider}`))
        const last = rows[rows.length - 1]
        if (!last) {
          break
        }
        cursor = last
      }
      expect(seen).toHaveLength(9)
      expect(seen[0]).toBe('2026-10-01/apollo')
      expect(seen[8]).toBe('2026-08-01/zero_bounce')
      expect(new Set(seen).size).toBe(9)
    })
  })
})
