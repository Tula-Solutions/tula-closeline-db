import { sql } from 'drizzle-orm'
import {
  check,
  customType,
  index,
  integer,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { voiceSchema } from './voice'
import {
  MAX_AGENT_CALL_SECONDS,
  MAX_AGENT_IDEMPOTENCY_KEY_LENGTH,
  MIN_AGENT_IDEMPOTENCY_KEY_LENGTH,
} from './voice-agent'

/*
 * Milestone 17 (`docs/specs/m17-outbound-agent-call.md`, ADR 0030): the record of each request that
 * the Outbound Agent place a Call. The values mirror the contract (`tula-closeline-contract`,
 * `src/agent-call`); this library does not depend on the contract, so each carries the name of the
 * constant it copies and `voice-agent-calls.test.ts` pins every value.
 */

/** What became of one placed Call. Mirrors the contract's `CALL_RESULTS`. */
export const CALL_RESULTS = [
  'answered',
  'voicemail',
  'no_answer',
  'busy',
  'failed',
  'blocked',
] as const
/** Why an answered Call ended. Mirrors the contract's `CALL_END_REASONS`. */
export const AGENT_CALL_END_REASONS = [
  'booked',
  'handed_off',
  'not_interested',
  'not_now',
  'opted_out',
  'prospect_hung_up',
  'cap_reached',
  'agent_ended',
] as const
/** Why the gate refused a Call. Mirrors the contract's `CALL_GATE_CODES`. */
export const CALL_GATE_CODES = [
  'agent.paused',
  'consent.missing',
  'consent.withdrawn',
  'consent.suppressed',
  'consent.unavailable',
  'agent.timezone_unknown',
  'agent.outside_hours',
  'agent_call.attempts_exhausted',
  'agent_call.line_cap_reached',
] as const
/** Who asked for the Call. Mirrors the contract's `AGENT_CALL_SOURCES`. */
export const AGENT_CALL_SOURCES = ['campaign_step', 'rep_request'] as const
/** The states of an Agent Call. Mirrors the contract's `AGENT_CALL_STATES`. */
export const AGENT_CALL_STATES = ['queued', 'dialing', 'live', 'ended'] as const
/** The most attempts of a call Step. Mirrors the contract's `MAX_CALL_ATTEMPTS`. */
export const MAX_CALL_ATTEMPTS = 3
/** The length of a number hash, in bytes (SHA-256). */
export const AGENT_CALL_NUMBER_HASH_BYTES = 32

/** The largest step key: matches the Sequence's step key shape in `outbound`. */
const STEP_KEY_PATTERN = '^[a-z][a-z0-9_-]{0,63}$'

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' })
const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const num = (value: number) => sql.raw(String(value))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })

/**
 * One request that the Outbound Agent place a Call, and what came of it: the record `voice` keeps
 * for the gate, the Sequence branch and the audit. Ids, closed values, a number hash and times
 * only: never the number, the words said or the Transcript (the Call, by `call_id`, holds those).
 *
 * The checks restate the contract's `agentCallSchema`: `result` and `ended_at` are set exactly on an
 * `ended` row; an answered row has an `end_reason`; a blocked row has its `gate_code`, and only a
 * blocked or `queued` (deferred) row has one; `retry_at` is set exactly on a `queued` row; a live
 * row has its Call and a queued or blocked row has none; a Step request names its Enrollment, Step
 * and the key `<enrollment id>:<step key>:<attempt>`, a Rep request names the Rep. `dialed_at` is
 * set exactly on a row that was dialed (dialing, live, or ended with a result other than
 * `blocked`), and a dialed row has its `number_hash`.
 *
 * `number_hash` is a keyed SHA-256 of the dialed number (the same key for every row, chosen by
 * `voice`), so per-number counts need no number. Ended rows are final (trigger
 * `agent_calls_ended_final`), nothing deletes a row, and nothing truncates the table.
 *
 * Unique: Organization and idempotency key (`agent_calls_key`); and at most one `queued`, `dialing`
 * or `live` row per Prospect (`agent_calls_prospect_open_key`).
 *
 * Counts served, each an index range scan, never the table:
 * - dials of one number since an instant (one per calendar day in the Prospect's zone, three per
 *   rolling 7 days): `agent_calls_number_dials_idx` on (organization, number hash, dialed_at);
 * - dials from one Line in the last 24 hours (cap 150): `agent_calls_line_dials_idx` on
 *   (organization, line, dialed_at);
 * - Calls open on one Line now (cap 3): `agent_calls_line_open_idx`, partial over `dialing`/`live`;
 * - the attempts of one Step: `agent_calls_enrollment_idx`.
 * Lists (keyset `(created_at, id)` newest first, `LIMIT` a page): all (`agent_calls_list_idx`), one
 * Prospect's (`agent_calls_prospect_idx`).
 */
export const voiceAgentCalls = voiceSchema.table(
  'agent_calls',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    source: text('source', { enum: AGENT_CALL_SOURCES }).notNull(),
    prospectId: text('prospect_id').notNull(),
    lineId: text('line_id'),
    enrollmentId: text('enrollment_id'),
    stepKey: text('step_key'),
    requestedByMembershipId: text('requested_by_membership_id'),
    attempt: smallint('attempt').notNull().default(1),
    state: text('state', { enum: AGENT_CALL_STATES }).notNull(),
    result: text('result', { enum: CALL_RESULTS }),
    endReason: text('end_reason', { enum: AGENT_CALL_END_REASONS }),
    gateCode: text('gate_code', { enum: CALL_GATE_CODES }),
    retryAt: ts('retry_at'),
    callId: text('call_id'),
    durationSeconds: integer('duration_seconds'),
    numberHash: bytea('number_hash'),
    createdAt: ts('created_at').notNull().defaultNow(),
    dialedAt: ts('dialed_at'),
    endedAt: ts('ended_at'),
  },
  (t) => [
    primaryKey({ name: 'agent_calls_pkey', columns: [t.organizationId, t.id] }),
    check('agent_calls_id_shape', idShape('id', 'acl')),
    check('agent_calls_organization_id_shape', orgShape),
    check('agent_calls_organization_not_global', notGlobal),
    check(
      'agent_calls_idempotency_key_shape',
      sql`char_length(${t.idempotencyKey}) between ${num(MIN_AGENT_IDEMPOTENCY_KEY_LENGTH)} and ${num(MAX_AGENT_IDEMPOTENCY_KEY_LENGTH)}`
    ),
    check('agent_calls_prospect_id_shape', idShape('prospect_id', 'prs')),
    check('agent_calls_line_id_shape', idShape('line_id', 'line')),
    check('agent_calls_enrollment_id_shape', idShape('enrollment_id', 'enr')),
    check(
      'agent_calls_step_key_shape',
      sql`${t.stepKey} is null or ${t.stepKey} ~ '${sql.raw(STEP_KEY_PATTERN)}'`
    ),
    check('agent_calls_requested_by_shape', idShape('requested_by_membership_id', 'mem')),
    check('agent_calls_call_id_shape', idShape('call_id', 'call')),
    check('agent_calls_source_known', sql`${t.source} in (${list(AGENT_CALL_SOURCES)})`),
    check('agent_calls_state_known', sql`${t.state} in (${list(AGENT_CALL_STATES)})`),
    check(
      'agent_calls_result_known',
      sql`${t.result} is null or ${t.result} in (${list(CALL_RESULTS)})`
    ),
    check(
      'agent_calls_end_reason_known',
      sql`${t.endReason} is null or ${t.endReason} in (${list(AGENT_CALL_END_REASONS)})`
    ),
    check(
      'agent_calls_gate_code_known',
      sql`${t.gateCode} is null or ${t.gateCode} in (${list(CALL_GATE_CODES)})`
    ),
    check('agent_calls_attempt_range', sql`${t.attempt} between 1 and ${num(MAX_CALL_ATTEMPTS)}`),
    check(
      'agent_calls_duration_range',
      sql`${t.durationSeconds} is null or ${t.durationSeconds} between 0 and ${num(MAX_AGENT_CALL_SECONDS)}`
    ),
    check(
      'agent_calls_number_hash_length',
      sql`${t.numberHash} is null or octet_length(${t.numberHash}) = ${num(AGENT_CALL_NUMBER_HASH_BYTES)}`
    ),
    check('agent_calls_result_iff_ended', sql`(${t.state} = 'ended') = (${t.result} is not null)`),
    check(
      'agent_calls_ended_at_iff_ended',
      sql`(${t.state} = 'ended') = (${t.endedAt} is not null)`
    ),
    check(
      'agent_calls_end_reason_iff_answered',
      sql`coalesce(${t.result} = 'answered', false) = (${t.endReason} is not null)`
    ),
    check(
      'agent_calls_blocked_has_gate_code',
      sql`${t.result} is distinct from 'blocked' or ${t.gateCode} is not null`
    ),
    check(
      'agent_calls_gate_code_when_blocked_or_queued',
      sql`${t.gateCode} is null or coalesce(${t.result} = 'blocked', false) or ${t.state} = 'queued'`
    ),
    check(
      'agent_calls_retry_at_iff_queued',
      sql`(${t.state} = 'queued') = (${t.retryAt} is not null)`
    ),
    check('agent_calls_live_has_call', sql`${t.state} <> 'live' or ${t.callId} is not null`),
    check(
      'agent_calls_undialed_has_no_call',
      sql`not (${t.state} = 'queued' or ${t.result} = 'blocked') or ${t.callId} is null`
    ),
    check(
      'agent_calls_duration_needs_call',
      sql`${t.durationSeconds} is null or ${t.callId} is not null`
    ),
    check(
      'agent_calls_dialed_at_iff_dialed',
      sql`(${t.dialedAt} is not null)
        = (${t.state} in ('dialing', 'live') or (${t.state} = 'ended' and ${t.result} <> 'blocked'))`
    ),
    check('agent_calls_dialed_has_line', sql`${t.dialedAt} is null or ${t.lineId} is not null`),
    check(
      'agent_calls_dialed_has_number_hash',
      sql`${t.dialedAt} is null or ${t.numberHash} is not null`
    ),
    check(
      'agent_calls_source_shape',
      sql`(${t.source} = 'campaign_step'
          and ${t.enrollmentId} is not null and ${t.stepKey} is not null
          and ${t.requestedByMembershipId} is null
          and ${t.idempotencyKey} = ${t.enrollmentId} || ':' || ${t.stepKey} || ':' || ${t.attempt}::text)
        or (${t.source} = 'rep_request'
          and ${t.enrollmentId} is null and ${t.stepKey} is null
          and ${t.requestedByMembershipId} is not null)`
    ),
    check(
      'agent_calls_times_in_order',
      sql`(${t.dialedAt} is null or ${t.dialedAt} >= ${t.createdAt})
        and (${t.endedAt} is null or ${t.endedAt} >= coalesce(${t.dialedAt}, ${t.createdAt}))`
    ),
    uniqueIndex('agent_calls_key').on(t.organizationId, t.idempotencyKey),
    uniqueIndex('agent_calls_prospect_open_key')
      .on(t.organizationId, t.prospectId)
      .where(sql`${t.state} in ('queued', 'dialing', 'live')`),
    index('agent_calls_number_dials_idx')
      .on(t.organizationId, t.numberHash, t.dialedAt.desc())
      .where(sql`${t.dialedAt} is not null`),
    index('agent_calls_line_dials_idx')
      .on(t.organizationId, t.lineId, t.dialedAt.desc())
      .where(sql`${t.dialedAt} is not null`),
    index('agent_calls_line_open_idx')
      .on(t.organizationId, t.lineId)
      .where(sql`${t.state} in ('dialing', 'live')`),
    index('agent_calls_enrollment_idx')
      .on(t.organizationId, t.enrollmentId, t.stepKey)
      .where(sql`${t.enrollmentId} is not null`),
    index('agent_calls_list_idx').on(t.organizationId, t.createdAt.desc(), t.id.desc()),
    index('agent_calls_prospect_idx').on(
      t.organizationId,
      t.prospectId,
      t.createdAt.desc(),
      t.id.desc()
    ),
  ]
)
