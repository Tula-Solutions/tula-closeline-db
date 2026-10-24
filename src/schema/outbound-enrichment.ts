import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  customType,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { outboundSchema } from './outbound'

/*
 * Milestone 5 (`docs/specs/m05-enrichment-signals-fit.md` in the hub): enrichment runs and their
 * provider attempts, Signals, fit criteria, provider settings and enrichment spend. The values
 * below mirror the contract (`tula-closeline-contract`, `src/enrichment`) at its `develop`; this
 * library does not depend on the contract, so each carries the name of the constant it copies and
 * `outbound-enrichment.test.ts` pins every value.
 */

/** The groups of fields a run fills. Mirrors the contract's `FIELD_GROUPS`. */
export const FIELD_GROUPS = ['person', 'company', 'email_verification'] as const
/** The states of an enrichment run. Mirrors the contract's `RUN_STATUSES`. */
export const RUN_STATUSES = ['queued', 'running', 'complete', 'incomplete', 'stopped'] as const
/** The states of a run that are final. */
export const FINAL_RUN_STATUSES = ['complete', 'incomplete', 'stopped'] as const
/** Why a run stopped. Mirrors the contract's `STOP_REASONS`. */
export const STOP_REASONS = ['monthly_budget', 'run_ceiling'] as const
/** What one provider attempt came to. Mirrors the contract's `ATTEMPT_OUTCOMES`. */
export const ATTEMPT_OUTCOMES = [
  'filled',
  'no_result',
  'failed',
  'skipped_disabled',
  'skipped_circuit_open',
  'skipped_budget',
] as const
/** The outcomes that skip the provider, so cost nothing. */
export const SKIPPED_ATTEMPT_OUTCOMES = [
  'skipped_disabled',
  'skipped_circuit_open',
  'skipped_budget',
] as const
/** Why a provider attempt failed. Mirrors the contract's `ATTEMPT_FAILURES`. */
export const ATTEMPT_FAILURES = [
  'timeout',
  'rate_limited',
  'provider_error',
  'invalid_response',
  'key_rejected',
] as const
/** The kinds of Signal. Mirrors the contract's `SIGNAL_KINDS`. */
export const SIGNAL_KINDS = [
  'funding',
  'hiring_spike',
  'job_change',
  'technology_change',
  'website_visit',
  'note',
] as const
/** Where a Signal came from. Mirrors the `type` of the contract's Signal source. */
export const SIGNAL_SOURCE_TYPES = ['provider', 'webhook', 'manual'] as const
/** The Prospect fields a fit criterion reads. Mirrors the contract's `FIT_FIELDS`. */
export const FIT_FIELDS = [
  'jobTitle',
  'industry',
  'employeeCount',
  'region',
  'technologies',
] as const
/** The ways a fit criterion compares. Mirrors the `operator` of the contract's fit condition. */
export const FIT_OPERATORS = ['one_of', 'contains_any', 'between'] as const

/** The most provider attempts one run holds. Mirrors the contract's `MAX_ATTEMPTS_PER_RUN`. */
export const MAX_ATTEMPTS_PER_RUN = 150
/** The most fields a run reports. Mirrors the length of the contract's `ENRICHED_FIELDS`. */
export const MAX_RUN_FIELDS = 11
/** The most providers an Organization sets up. Mirrors the contract's `MAX_PROVIDERS`. */
export const MAX_PROVIDERS = 50
/** The longest provider key. Mirrors the contract's `MAX_PROVIDER_KEY_LENGTH`. */
export const MAX_PROVIDER_KEY_LENGTH = 32
/** The most micro-dollars a run cost or ceiling holds. Mirrors the contract's `MAX_MICRO_DOLLARS`. */
export const MAX_MICRO_DOLLARS = 1_000_000_000_000
/** The longest an attempt may take, in milliseconds. Mirrors the contract's attempt `durationMs`. */
export const MAX_ATTEMPT_DURATION_MS = 600_000
/** The longest hold key of a reservation, in characters. */
export const MAX_RESERVATION_HOLD_KEY_LENGTH = 256
/** The longest request id of a run, in characters. */
export const MAX_RUN_REQUEST_ID_LENGTH = 256
/** The largest detail of a Signal, in bytes of its JSON text. */
export const MAX_SIGNAL_DETAIL_BYTES = 4096
/** The largest fit condition, in bytes of its JSON text. */
export const MAX_FIT_CONDITION_BYTES = 4096
/** The most values a fit condition lists. Mirrors the contract's fit condition `values` bound. */
export const MAX_FIT_VALUES = 20
/** The longest name of a fit criterion. Mirrors the contract's `MAX_FIT_NAME_LENGTH`. */
export const MAX_FIT_NAME_LENGTH = 100
/** The heaviest weight of a fit criterion. Mirrors the contract's `MAX_FIT_WEIGHT`. */
export const MAX_FIT_WEIGHT = 100
/** The largest provider key ciphertext, in bytes: an API key is at most 512 characters. */
export const MAX_CREDENTIAL_CIPHERTEXT_BYTES = 2048
/** The longest key id of a sealed credential, in characters. */
export const MAX_CREDENTIAL_KEY_ID_LENGTH = 128

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const num = (value: number) => sql.raw(String(value))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })
const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
})
const PROVIDER_KEY = `^[a-z][a-z0-9_]{0,${MAX_PROVIDER_KEY_LENGTH - 1}}$`
const EVENT_ID = '^[A-Za-z0-9_-]{8,100}$'

/**
 * One enrichment of one Prospect: which groups of fields to fill, what it cost against its ceiling
 * and how it ended. `request_id` is the caller's idempotency key, unique per Prospect
 * (`enrichment_runs_request_key`), so a retried request finds its run instead of charging twice.
 * `run_set_id` ties the runs of one bulk request together (the counts of a set are computed from
 * its runs). `fields` holds the provenance of each filled field (an array of at most 11, validated
 * by the contract at the service edge) and `email_verification` the verification result, or null.
 * `lease_token` is the fencing token of the worker holding the run: a new random uuid on each
 * claim, so a worker that lost its lease cannot write; `heartbeat_at` is when the holder last
 * renewed it (both null until a worker claims the run; `started_at` is when it first started and
 * does not move). `enrichment_runs_request_idx` finds a request id across Prospects.
 * `stop_reason` is set exactly when the run is `stopped`; `completed_at` exactly when it is in a
 * final state; a `queued` run has not started. Costs are whole micro-dollars.
 *
 * Lists served (keyset `(created_at, id)` newest first, `LIMIT` a page): all runs
 * (`enrichment_runs_list_idx`), one Prospect's (`enrichment_runs_prospect_idx`), one run set's
 * (`enrichment_runs_run_set_idx`) and by status (`enrichment_runs_status_idx`).
 */
export const enrichmentRuns = outboundSchema.table(
  'enrichment_runs',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    runSetId: text('run_set_id'),
    prospectId: text('prospect_id').notNull(),
    requestId: text('request_id').notNull(),
    status: text('status', { enum: RUN_STATUSES }).notNull().default('queued'),
    stopReason: text('stop_reason', { enum: STOP_REASONS }),
    groups: text('groups').array().notNull(),
    fields: jsonb('fields').notNull().default(sql`'[]'::jsonb`),
    emailVerification: jsonb('email_verification'),
    costMicros: bigint('cost_micros', { mode: 'number' }).notNull().default(0),
    ceilingMicros: bigint('ceiling_micros', { mode: 'number' }).notNull(),
    requestedByUserId: text('requested_by_user_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
    startedAt: ts('started_at'),
    completedAt: ts('completed_at'),
    leaseToken: uuid('lease_token'),
    heartbeatAt: ts('heartbeat_at'),
  },
  (t) => [
    primaryKey({ name: 'enrichment_runs_pkey', columns: [t.organizationId, t.id] }),
    check('enrichment_runs_id_shape', idShape('id', 'erun')),
    check('enrichment_runs_organization_id_shape', orgShape),
    check('enrichment_runs_organization_not_global', notGlobal),
    check('enrichment_runs_run_set_id_shape', idShape('run_set_id', 'erset')),
    check('enrichment_runs_prospect_id_shape', idShape('prospect_id', 'prs')),
    check('enrichment_runs_requested_by_user_id_shape', idShape('requested_by_user_id', 'usr')),
    check(
      'enrichment_runs_request_id_shape',
      sql`char_length(${t.requestId}) between 1 and ${num(MAX_RUN_REQUEST_ID_LENGTH)}`
    ),
    check('enrichment_runs_status_known', sql`${t.status} in (${list(RUN_STATUSES)})`),
    check(
      'enrichment_runs_stop_reason_matches_status',
      sql`(${t.status} = 'stopped') = (${t.stopReason} is not null)
        and (${t.stopReason} is null or ${t.stopReason} in (${list(STOP_REASONS)}))`
    ),
    check(
      'enrichment_runs_times_match_status',
      sql`(${t.status} in (${list(FINAL_RUN_STATUSES)})) = (${t.completedAt} is not null)
        and (${t.status} <> 'queued' or ${t.startedAt} is null)`
    ),
    check(
      'enrichment_runs_groups_shape',
      sql`cardinality(${t.groups}) between 1 and ${num(FIELD_GROUPS.length)}
        and ${t.groups} <@ array[${list(FIELD_GROUPS)}]::text[]
        and (cardinality(${t.groups}) = 1
          or (${t.groups}[1] <> ${t.groups}[2]
            and (cardinality(${t.groups}) = 2
              or (${t.groups}[3] <> ${t.groups}[1] and ${t.groups}[3] <> ${t.groups}[2]))))`
    ),
    check(
      'enrichment_runs_fields_shape',
      sql`jsonb_typeof(${t.fields}) = 'array' and jsonb_array_length(${t.fields}) <= ${num(MAX_RUN_FIELDS)}`
    ),
    check(
      'enrichment_runs_email_verification_shape',
      sql`${t.emailVerification} is null or jsonb_typeof(${t.emailVerification}) = 'object'`
    ),
    check(
      'enrichment_runs_cost_range',
      sql`${t.costMicros} between 0 and ${num(MAX_MICRO_DOLLARS)}
        and ${t.ceilingMicros} between 0 and ${num(MAX_MICRO_DOLLARS)}`
    ),
    uniqueIndex('enrichment_runs_request_key').on(t.organizationId, t.prospectId, t.requestId),
    index('enrichment_runs_request_idx').on(t.organizationId, t.requestId),
    index('enrichment_runs_list_idx').on(t.organizationId, t.createdAt.desc(), t.id.desc()),
    index('enrichment_runs_prospect_idx').on(
      t.organizationId,
      t.prospectId,
      t.createdAt.desc(),
      t.id.desc()
    ),
    index('enrichment_runs_run_set_idx')
      .on(t.organizationId, t.runSetId, t.createdAt.desc(), t.id.desc())
      .where(sql`${t.runSetId} is not null`),
    index('enrichment_runs_status_idx').on(
      t.organizationId,
      t.status,
      t.createdAt.desc(),
      t.id.desc()
    ),
  ]
)

/**
 * One call (or skipped call) to a provider within a run, in waterfall order (`position`, 0-based,
 * at most 150 per run). Append-only: the service role cannot update it. A `failure` is named
 * exactly when the outcome is `failed`; a skipped attempt cost nothing. Attempts go with their run.
 *
 * Lists served: the attempts of one run in order (the primary key).
 */
export const enrichmentAttempts = outboundSchema.table(
  'enrichment_attempts',
  {
    organizationId: text('organization_id').notNull(),
    runId: text('run_id').notNull(),
    position: smallint('position').notNull(),
    provider: text('provider').notNull(),
    fieldGroup: text('field_group', { enum: FIELD_GROUPS }).notNull(),
    outcome: text('outcome', { enum: ATTEMPT_OUTCOMES }).notNull(),
    failure: text('failure', { enum: ATTEMPT_FAILURES }),
    costMicros: bigint('cost_micros', { mode: 'number' }).notNull().default(0),
    startedAt: ts('started_at').notNull(),
    durationMs: integer('duration_ms').notNull(),
  },
  (t) => [
    primaryKey({
      name: 'enrichment_attempts_pkey',
      columns: [t.organizationId, t.runId, t.position],
    }),
    check('enrichment_attempts_organization_id_shape', orgShape),
    check('enrichment_attempts_organization_not_global', notGlobal),
    check('enrichment_attempts_run_id_shape', idShape('run_id', 'erun')),
    check(
      'enrichment_attempts_position_range',
      sql`${t.position} between 0 and ${num(MAX_ATTEMPTS_PER_RUN - 1)}`
    ),
    check(
      'enrichment_attempts_provider_shape',
      sql`${t.provider} ~ ${sql.raw(`'${PROVIDER_KEY}'`)}`
    ),
    check('enrichment_attempts_field_group_known', sql`${t.fieldGroup} in (${list(FIELD_GROUPS)})`),
    check('enrichment_attempts_outcome_known', sql`${t.outcome} in (${list(ATTEMPT_OUTCOMES)})`),
    check(
      'enrichment_attempts_failure_matches_outcome',
      sql`(${t.outcome} = 'failed') = (${t.failure} is not null)
        and (${t.failure} is null or ${t.failure} in (${list(ATTEMPT_FAILURES)}))`
    ),
    check(
      'enrichment_attempts_skipped_costs_nothing',
      sql`${t.outcome} not in (${list(SKIPPED_ATTEMPT_OUTCOMES)}) or ${t.costMicros} = 0`
    ),
    check(
      'enrichment_attempts_cost_range',
      sql`${t.costMicros} between 0 and ${num(MAX_MICRO_DOLLARS)}`
    ),
    check(
      'enrichment_attempts_duration_range',
      sql`${t.durationMs} between 0 and ${num(MAX_ATTEMPT_DURATION_MS)}`
    ),
    foreignKey({
      name: 'enrichment_attempts_run_fk',
      columns: [t.organizationId, t.runId],
      foreignColumns: [enrichmentRuns.organizationId, enrichmentRuns.id],
    }).onDelete('cascade'),
  ]
)

/**
 * A buying signal about a Prospect (funding, hiring, a job change, a visit, a note). Immutable:
 * the service role cannot update it. `source_type` says where it came from and exactly what must
 * accompany it: `provider` names `source_provider`, `webhook` names the sender's `event_id`
 * (unique per Organization, so a replayed delivery records once) and `manual` names
 * `source_user_id`. `expires_at` is when it stops counting as fresh. `detail` is the kind-specific
 * payload, an object of at most 4096 bytes, validated by the contract at the service edge.
 *
 * Lists served (keyset `(observed_at, id)` newest first, `LIMIT` a page): one Prospect's Signals
 * (`signals_prospect_idx`), and one kind of them (`signals_prospect_kind_idx`).
 */
export const signals = outboundSchema.table(
  'signals',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    prospectId: text('prospect_id').notNull(),
    kind: text('kind', { enum: SIGNAL_KINDS }).notNull(),
    sourceType: text('source_type', { enum: SIGNAL_SOURCE_TYPES }).notNull(),
    sourceProvider: text('source_provider'),
    sourceUserId: text('source_user_id'),
    eventId: text('event_id'),
    observedAt: ts('observed_at').notNull(),
    recordedAt: ts('recorded_at').notNull().defaultNow(),
    expiresAt: ts('expires_at').notNull(),
    detail: jsonb('detail').notNull(),
  },
  (t) => [
    primaryKey({ name: 'signals_pkey', columns: [t.organizationId, t.id] }),
    check('signals_id_shape', idShape('id', 'sig')),
    check('signals_organization_id_shape', orgShape),
    check('signals_organization_not_global', notGlobal),
    check('signals_prospect_id_shape', idShape('prospect_id', 'prs')),
    check('signals_source_user_id_shape', idShape('source_user_id', 'usr')),
    check('signals_kind_known', sql`${t.kind} in (${list(SIGNAL_KINDS)})`),
    check('signals_source_type_known', sql`${t.sourceType} in (${list(SIGNAL_SOURCE_TYPES)})`),
    check(
      'signals_source_provider_shape',
      sql`${t.sourceProvider} is null or ${t.sourceProvider} ~ ${sql.raw(`'${PROVIDER_KEY}'`)}`
    ),
    check(
      'signals_event_id_shape',
      sql`${t.eventId} is null or ${t.eventId} ~ ${sql.raw(`'${EVENT_ID}'`)}`
    ),
    check(
      'signals_source_matches_type',
      sql`case ${t.sourceType}
        when 'provider' then ${t.sourceProvider} is not null and ${t.sourceUserId} is null and ${t.eventId} is null
        when 'webhook' then ${t.eventId} is not null and ${t.sourceProvider} is null and ${t.sourceUserId} is null
        else ${t.sourceUserId} is not null and ${t.sourceProvider} is null and ${t.eventId} is null
      end`
    ),
    check('signals_expires_after_observed', sql`${t.expiresAt} >= ${t.observedAt}`),
    check(
      'signals_detail_shape',
      sql`jsonb_typeof(${t.detail}) = 'object'
        and octet_length(${t.detail}::text) <= ${num(MAX_SIGNAL_DETAIL_BYTES)}`
    ),
    uniqueIndex('signals_event_key')
      .on(t.organizationId, t.eventId)
      .where(sql`${t.eventId} is not null`),
    index('signals_prospect_idx').on(
      t.organizationId,
      t.prospectId,
      t.observedAt.desc(),
      t.id.desc()
    ),
    index('signals_prospect_kind_idx').on(
      t.organizationId,
      t.prospectId,
      t.kind,
      t.observedAt.desc(),
      t.id.desc()
    ),
  ]
)

/**
 * A criterion of the Organization's fit score: a condition on one Prospect field and a weight.
 * Names are unique per Organization ignoring case (`fit_criteria_name_key`). `condition` is the
 * contract's fit condition: `one_of` or `contains_any` with 1 to 20 `values`, or `between` with a
 * numeric `min` and/or `max` (never `min` above `max`); `employeeCount` takes only `between` and
 * no other field does. The length of each value is validated by the contract at the service edge.
 *
 * Lists served (keyset `(created_at, id)` oldest first, `LIMIT` a page): all criteria
 * (`fit_criteria_list_idx`).
 */
export const fitCriteria = outboundSchema.table(
  'fit_criteria',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    name: text('name').notNull(),
    field: text('field', { enum: FIT_FIELDS }).notNull(),
    condition: jsonb('condition').notNull(),
    weight: smallint('weight').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'fit_criteria_pkey', columns: [t.organizationId, t.id] }),
    check('fit_criteria_id_shape', idShape('id', 'fcr')),
    check('fit_criteria_organization_id_shape', orgShape),
    check('fit_criteria_organization_not_global', notGlobal),
    check(
      'fit_criteria_name_shape',
      sql`char_length(${t.name}) between 1 and ${num(MAX_FIT_NAME_LENGTH)}`
    ),
    check('fit_criteria_field_known', sql`${t.field} in (${list(FIT_FIELDS)})`),
    check('fit_criteria_weight_range', sql`${t.weight} between 1 and ${num(MAX_FIT_WEIGHT)}`),
    check(
      'fit_criteria_condition_shape',
      sql`jsonb_typeof(${t.condition}) = 'object'
        and octet_length(${t.condition}::text) <= ${num(MAX_FIT_CONDITION_BYTES)}
        and coalesce(${t.condition}->>'operator', '') in (${list(FIT_OPERATORS)})
        and ((${t.field} = 'employeeCount') = (${t.condition}->>'operator' = 'between'))
        and case when ${t.condition}->>'operator' = 'between' then
          coalesce(jsonb_typeof(${t.condition}->'min'), 'null') in ('number', 'null')
          and coalesce(jsonb_typeof(${t.condition}->'max'), 'null') in ('number', 'null')
          and (coalesce(jsonb_typeof(${t.condition}->'min'), 'null') = 'number'
            or coalesce(jsonb_typeof(${t.condition}->'max'), 'null') = 'number')
          and case when jsonb_typeof(${t.condition}->'min') = 'number'
              and jsonb_typeof(${t.condition}->'max') = 'number'
            then (${t.condition}->>'min')::numeric <= (${t.condition}->>'max')::numeric
            else true end
        else case when jsonb_typeof(${t.condition}->'values') = 'array'
          then jsonb_array_length(${t.condition}->'values') between 1 and ${num(MAX_FIT_VALUES)}
          else false end
        end`
    ),
    uniqueIndex('fit_criteria_name_key').on(t.organizationId, sql`lower(${t.name})`),
    index('fit_criteria_list_idx').on(t.organizationId, t.createdAt, t.id),
  ]
)

/**
 * An Organization's setup of one enrichment provider: whether it is on, its API key and its place
 * in the waterfall of each field group. The key is held as **ciphertext only**
 * (`credential_ciphertext`, sealed by the service with an envelope key; `credential_key_id` names
 * the key version and `credential_updated_at` says when it was set), never plaintext, and never
 * leaves the service in a response, log or error report. The three are all set or all null (no key
 * set). `*_position` is the provider's 0-based place in that group's waterfall, or null when it is
 * not in it; positions are not unique so a reorder is one statement, and ties break by provider.
 *
 * Lookups served: one provider (the primary key); all providers of an Organization (at most 50)
 * by that key.
 */
export const providerSettings = outboundSchema.table(
  'provider_settings',
  {
    organizationId: text('organization_id').notNull(),
    provider: text('provider').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    credentialCiphertext: bytes('credential_ciphertext'),
    credentialKeyId: text('credential_key_id'),
    credentialUpdatedAt: ts('credential_updated_at'),
    personPosition: smallint('person_position'),
    companyPosition: smallint('company_position'),
    emailVerificationPosition: smallint('email_verification_position'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'provider_settings_pkey', columns: [t.organizationId, t.provider] }),
    check('provider_settings_organization_id_shape', orgShape),
    check('provider_settings_organization_not_global', notGlobal),
    check('provider_settings_provider_shape', sql`${t.provider} ~ ${sql.raw(`'${PROVIDER_KEY}'`)}`),
    check(
      'provider_settings_credential_shape',
      sql`(${t.credentialCiphertext} is null or octet_length(${t.credentialCiphertext}) between 1 and ${num(MAX_CREDENTIAL_CIPHERTEXT_BYTES)})
        and (${t.credentialKeyId} is null or char_length(${t.credentialKeyId}) between 1 and ${num(MAX_CREDENTIAL_KEY_ID_LENGTH)})
        and (${t.credentialCiphertext} is null) = (${t.credentialKeyId} is null)
        and (${t.credentialCiphertext} is null) = (${t.credentialUpdatedAt} is null)`
    ),
    check(
      'provider_settings_positions_range',
      sql`(${t.personPosition} is null or ${t.personPosition} between 0 and ${num(MAX_PROVIDERS - 1)})
        and (${t.companyPosition} is null or ${t.companyPosition} between 0 and ${num(MAX_PROVIDERS - 1)})
        and (${t.emailVerificationPosition} is null or ${t.emailVerificationPosition} between 0 and ${num(MAX_PROVIDERS - 1)})`
    ),
  ]
)

/**
 * What an Organization spent on enrichment with one provider in one month: whole micro-dollars and
 * the number of calls. `month` is the first day of the month (UTC). One row per month and provider;
 * the service adds to it with one upsert. The monthly budget is checked against the month's sum.
 *
 * Lists served (keyset `(month, provider)`, newest month first then provider, `LIMIT` a page): the
 * Organization's spend (`enrichment_spend_list_idx`).
 */
export const enrichmentSpend = outboundSchema.table(
  'enrichment_spend',
  {
    organizationId: text('organization_id').notNull(),
    month: date('month', { mode: 'string' }).notNull(),
    provider: text('provider').notNull(),
    costMicros: bigint('cost_micros', { mode: 'number' }).notNull().default(0),
    calls: bigint('calls', { mode: 'number' }).notNull().default(0),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'enrichment_spend_pkey',
      columns: [t.organizationId, t.month, t.provider],
    }),
    check('enrichment_spend_organization_id_shape', orgShape),
    check('enrichment_spend_organization_not_global', notGlobal),
    check('enrichment_spend_month_first_day', sql`extract(day from ${t.month}) = 1`),
    check('enrichment_spend_provider_shape', sql`${t.provider} ~ ${sql.raw(`'${PROVIDER_KEY}'`)}`),
    check('enrichment_spend_cost_not_negative', sql`${t.costMicros} >= 0`),
    check('enrichment_spend_calls_not_negative', sql`${t.calls} >= 0`),
    index('enrichment_spend_list_idx').on(t.organizationId, t.month.desc(), t.provider),
  ]
)

/**
 * Spend held back for a run before its provider calls, so concurrent runs cannot together pass the
 * monthly budget. Replaces the old `hold_`-prefixed rows of `enrichment_spend`: spend by provider
 * no longer has to skip them. `hold_key` is the caller's idempotency key (unique per Organization,
 * `enrichment_reservations_hold_key`), so a retried hold finds its row. `month` is the first day of
 * the month (UTC), as in `enrichment_spend`; `amount_micros` is whole micro-dollars. A reservation
 * counts against the month while `released_at` is null; releasing sets it, never deletes. A run's
 * reservations go with the run.
 *
 * Lookups served: the held sum of an Organization's month (`enrichment_reservations_open_idx`,
 * only unreleased rows), and a run's reservations (`enrichment_reservations_run_idx`).
 */
export const enrichmentReservations = outboundSchema.table(
  'enrichment_reservations',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    runId: text('run_id').notNull(),
    provider: text('provider').notNull(),
    month: date('month', { mode: 'string' }).notNull(),
    amountMicros: bigint('amount_micros', { mode: 'number' }).notNull(),
    holdKey: text('hold_key').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
    releasedAt: ts('released_at'),
  },
  (t) => [
    primaryKey({ name: 'enrichment_reservations_pkey', columns: [t.organizationId, t.id] }),
    check('enrichment_reservations_id_shape', idShape('id', 'ersv')),
    check('enrichment_reservations_organization_id_shape', orgShape),
    check('enrichment_reservations_organization_not_global', notGlobal),
    check('enrichment_reservations_run_id_shape', idShape('run_id', 'erun')),
    check(
      'enrichment_reservations_provider_shape',
      sql`${t.provider} ~ ${sql.raw(`'${PROVIDER_KEY}'`)}`
    ),
    check('enrichment_reservations_month_first_day', sql`extract(day from ${t.month}) = 1`),
    check(
      'enrichment_reservations_amount_range',
      sql`${t.amountMicros} between 0 and ${num(MAX_MICRO_DOLLARS)}`
    ),
    check(
      'enrichment_reservations_hold_key_shape',
      sql`char_length(${t.holdKey}) between 1 and ${num(MAX_RESERVATION_HOLD_KEY_LENGTH)}`
    ),
    check(
      'enrichment_reservations_released_after_created',
      sql`${t.releasedAt} is null or ${t.releasedAt} >= ${t.createdAt}`
    ),
    foreignKey({
      name: 'enrichment_reservations_run_fk',
      columns: [t.organizationId, t.runId],
      foreignColumns: [enrichmentRuns.organizationId, enrichmentRuns.id],
    }).onDelete('cascade'),
    uniqueIndex('enrichment_reservations_hold_key').on(t.organizationId, t.holdKey),
    index('enrichment_reservations_open_idx')
      .on(t.organizationId, t.month)
      .where(sql`${t.releasedAt} is null`),
    index('enrichment_reservations_run_idx').on(t.organizationId, t.runId),
  ]
)
