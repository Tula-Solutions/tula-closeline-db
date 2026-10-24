import { sql } from 'drizzle-orm'
import {
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
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { outboundSchema } from './outbound'

/*
 * Milestone 8 (`docs/specs/m08-email-and-deliverability.md` in the hub): Mailboxes, the send log,
 * mail events and Mailbox health. The values below mirror the contract (`tula-closeline-contract`,
 * `src/mail`) at its `develop`; this library does not depend on the contract, so each carries the
 * name of the constant it copies and `outbound-mail.test.ts` pins every value.
 */

/** The email providers a Mailbox is connected through. Mirrors the contract's `MAILBOX_PROVIDERS`. */
export const MAILBOX_PROVIDERS = ['gmail', 'outlook'] as const
/** Whose address a Mailbox is. Mirrors the contract's `MAILBOX_KINDS`. */
export const MAILBOX_KINDS = ['personal', 'shared'] as const
/** The state of a Mailbox. Mirrors the contract's `MAILBOX_STATES`. */
export const MAILBOX_STATES = ['warming', 'healthy', 'limited', 'paused', 'disconnected'] as const
/** Why a Mailbox is in its state. Mirrors the contract's `MAILBOX_STATE_REASONS`. */
export const MAILBOX_STATE_REASONS = [
  'owner_paused',
  'admin_paused',
  'complaint_spike',
  'bounce_spike',
  'provider_suspended',
  'auth_revoked',
  'disconnected_by_owner',
  'health_warning',
] as const
/** What a Mailbox's health did to its limits. Mirrors the `effect` of the contract's `healthSummarySchema`. */
export const HEALTH_EFFECTS = ['none', 'limit_halved', 'paused'] as const
/** The days of a send window, in bit order (Monday is bit 0). Mirrors the contract's `WEEKDAYS`. */
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
/** The states of a send. Mirrors the contract's `SEND_STATES`. */
export const SEND_STATES = ['sending', 'sent', 'refused', 'deferred', 'failed'] as const
/** The reasons a send is refused or deferred. Mirrors the contract's `SEND_REFUSAL_REASONS`. */
export const SEND_REFUSAL_REASONS = [
  'campaign_not_running',
  'outside_window',
  'unverified_address',
  'suppressed',
  'no_consent',
  'mailbox_unavailable',
  'limit_reached',
  'organization_cap_reached',
  'duplicate',
] as const
/** The reasons that defer a send rather than refuse it. Mirrors the contract's `SEND_DEFERRING_REASONS`. */
export const SEND_DEFERRING_REASONS = [
  'outside_window',
  'limit_reached',
  'organization_cap_reached',
] as const
/** The checks run before a send. Mirrors the contract's `SEND_CHECKS`. */
export const SEND_CHECKS = [
  'campaign',
  'window',
  'address',
  'suppression',
  'consent',
  'mailbox',
  'limits',
  'organization_cap',
  'idempotency',
] as const
/** What a mail event is. Mirrors the contract's `MAIL_EVENT_KINDS`. */
export const MAIL_EVENT_KINDS = [
  'hard_bounce',
  'soft_bounce',
  'complaint',
  'reply',
  'out_of_office',
  'unsubscribe',
] as const
/** The components of a health score. Mirrors the contract's `HEALTH_COMPONENTS`. */
export const HEALTH_COMPONENT_KINDS = [
  'hard_bounce_rate',
  'complaint_rate',
  'soft_bounce_error_rate',
  'reply_rate',
  'provider_warnings',
] as const

/** The most Teams a shared Mailbox is opened to. Mirrors the contract's `MAX_MAILBOX_TEAMS`. */
export const MAX_MAILBOX_TEAMS = 50
/** The longest display name of a Mailbox. Mirrors the contract's `MAX_MAILBOX_NAME_LENGTH`. */
export const MAX_MAILBOX_NAME_LENGTH = 100
/** The most sends a Mailbox may be limited to in a day. Mirrors the contract's `MAX_SENDS_PER_DAY`. */
export const MAX_SENDS_PER_DAY = 500
/** The most sends a Mailbox may be limited to in an hour. Mirrors `MAX_SENDS_PER_HOUR`. */
export const MAX_SENDS_PER_HOUR = 100
/** The longest minimum gap between sends, in seconds. Mirrors the contract's `MAX_MIN_GAP_SECONDS`. */
export const MAX_MIN_GAP_SECONDS = 3600
/** The largest step of a Sequence a send names. Mirrors the contract's `MAX_SEQUENCE_STEP`. */
export const MAX_SEQUENCE_STEP = 1000
/** The largest attempt epoch of a send key. Mirrors the contract's `MAX_ATTEMPT_EPOCH`. */
export const MAX_ATTEMPT_EPOCH = 1000
/** The longest provider message id, in characters. Mirrors the contract's `mailProviderMessageIdSchema`. */
export const MAX_MAIL_PROVIDER_MESSAGE_ID_LENGTH = 255
/** The longest provider account id, thread id or sync cursor we keep, in characters. */
export const MAX_PROVIDER_REFERENCE_LENGTH = 2048
/** The largest token ciphertext, in bytes: a provider token is a few hundred bytes. */
export const MAX_TOKEN_CIPHERTEXT_BYTES = 8192
/** The most components a health score has. Mirrors the contract's `healthComponentSchema` array bound. */
export const MAX_HEALTH_COMPONENTS = 10
/** The largest count a health day holds. Mirrors the contract's `healthDailySchema`. */
export const MAX_HEALTH_COUNT = 10_000_000

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
const PROVIDER_MESSAGE_ID = `^[!-~]{1,${MAX_MAIL_PROVIDER_MESSAGE_ID_LENGTH}}$`

/**
 * An email account a Rep or Admin connected so the Outbound Agent can send and read replies from
 * it. `kind` `personal` names its owner (`owner_membership_id`); a `shared` one has none and may be
 * opened to Teams (`team_ids`, at most 50). The OAuth tokens are held as **ciphertext only**
 * (`access_token_ciphertext`, `refresh_token_ciphertext`, sealed by the service with an envelope
 * key; `token_key_id` names the key version), never plaintext: a disconnected Mailbox holds none,
 * and a token never leaves the service in a response, log or error report. `state_reason` is set
 * for a paused or disconnected Mailbox and for a limited one, and for no other. The health columns
 * are the latest score (`health_score` null means not enough data) and what it did to the limits;
 * the history is `health_daily`. `sync_cursor` is the provider's history cursor (Gmail history id,
 * Graph delta link) and `next_poll_at` when the polling fallback next visits this Mailbox.
 * `ramp_started_at` is day 0 of the published ramp. One connection per provider address
 * (`mailboxes_address_key`): reconnecting a disconnected address reuses its row.
 *
 * Lists served (keyset `(connected_at, id)` newest first, `LIMIT` a page): all Mailboxes
 * (`mailboxes_list_idx`), one owner's (`mailboxes_owner_idx`), by state (`mailboxes_state_idx`).
 * The polling fallback finds its due Mailboxes inside one Organization's scope
 * (`mailboxes_poll_idx`).
 */
export const mailboxes = outboundSchema.table(
  'mailboxes',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    provider: text('provider', { enum: MAILBOX_PROVIDERS }).notNull(),
    kind: text('kind', { enum: MAILBOX_KINDS }).notNull(),
    address: text('address').notNull(),
    displayName: text('display_name').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    ownerMembershipId: text('owner_membership_id'),
    teamIds: text('team_ids').array().notNull().default(sql`'{}'::text[]`),
    state: text('state', { enum: MAILBOX_STATES }).notNull().default('warming'),
    stateReason: text('state_reason', { enum: MAILBOX_STATE_REASONS }),
    stateChangedAt: ts('state_changed_at').notNull().defaultNow(),
    accessTokenCiphertext: bytes('access_token_ciphertext'),
    accessTokenExpiresAt: ts('access_token_expires_at'),
    refreshTokenCiphertext: bytes('refresh_token_ciphertext'),
    tokenKeyId: text('token_key_id'),
    syncCursor: text('sync_cursor'),
    lastSyncedAt: ts('last_synced_at'),
    nextPollAt: ts('next_poll_at'),
    healthScore: smallint('health_score'),
    healthEffect: text('health_effect', { enum: HEALTH_EFFECTS }).notNull().default('none'),
    healthScoredAt: ts('health_scored_at'),
    rampStartedAt: ts('ramp_started_at').notNull().defaultNow(),
    connectedAt: ts('connected_at').notNull().defaultNow(),
    disconnectedAt: ts('disconnected_at'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'mailboxes_pkey', columns: [t.organizationId, t.id] }),
    check('mailboxes_id_shape', idShape('id', 'mbx')),
    check('mailboxes_organization_id_shape', orgShape),
    check('mailboxes_organization_not_global', notGlobal),
    check('mailboxes_provider_known', sql`${t.provider} in (${list(MAILBOX_PROVIDERS)})`),
    check('mailboxes_kind_known', sql`${t.kind} in (${list(MAILBOX_KINDS)})`),
    check(
      'mailboxes_address_shape',
      sql`char_length(${t.address}) between 3 and 254
        and ${t.address} = lower(${t.address})
        and ${t.address} ~ '^[^@[:space:]]+@[^@[:space:]]+$'`
    ),
    check(
      'mailboxes_display_name_shape',
      sql`char_length(${t.displayName}) between 1 and ${num(MAX_MAILBOX_NAME_LENGTH)}`
    ),
    check(
      'mailboxes_provider_account_id_shape',
      sql`char_length(${t.providerAccountId}) between 1 and ${num(MAX_PROVIDER_REFERENCE_LENGTH)}`
    ),
    check('mailboxes_owner_membership_id_shape', idShape('owner_membership_id', 'mem')),
    check(
      'mailboxes_owner_matches_kind',
      sql`(${t.kind} = 'personal') = (${t.ownerMembershipId} is not null)`
    ),
    check(
      'mailboxes_team_ids_shape',
      sql`cardinality(${t.teamIds}) <= ${num(MAX_MAILBOX_TEAMS)}
        and array_to_string(${t.teamIds}, ',') ~ '^(team_[0-9a-f]{32}(,team_[0-9a-f]{32})*)?$'`
    ),
    check(
      'mailboxes_teams_only_shared',
      sql`${t.kind} = 'shared' or cardinality(${t.teamIds}) = 0`
    ),
    check('mailboxes_state_known', sql`${t.state} in (${list(MAILBOX_STATES)})`),
    check(
      'mailboxes_state_reason_known',
      sql`${t.stateReason} is null or ${t.stateReason} in (${list(MAILBOX_STATE_REASONS)})`
    ),
    check(
      'mailboxes_state_reason_matches_state',
      sql`case when ${t.state} = 'limited' then ${t.stateReason} is not null
        else (${t.state} in ('paused', 'disconnected')) = (${t.stateReason} is not null) end`
    ),
    check(
      'mailboxes_disconnected_at_matches_state',
      sql`(${t.state} = 'disconnected') = (${t.disconnectedAt} is not null)`
    ),
    check(
      'mailboxes_tokens_shape',
      sql`(${t.accessTokenCiphertext} is null or octet_length(${t.accessTokenCiphertext}) between 1 and ${num(MAX_TOKEN_CIPHERTEXT_BYTES)})
        and (${t.refreshTokenCiphertext} is null or octet_length(${t.refreshTokenCiphertext}) between 1 and ${num(MAX_TOKEN_CIPHERTEXT_BYTES)})
        and (${t.tokenKeyId} is null or char_length(${t.tokenKeyId}) between 1 and 64)
        and ((${t.accessTokenCiphertext} is null and ${t.refreshTokenCiphertext} is null) = (${t.tokenKeyId} is null))
        and (${t.accessTokenExpiresAt} is null or ${t.accessTokenCiphertext} is not null)`
    ),
    check(
      'mailboxes_disconnected_holds_no_tokens',
      sql`${t.state} <> 'disconnected'
        or (${t.accessTokenCiphertext} is null and ${t.refreshTokenCiphertext} is null)`
    ),
    check(
      'mailboxes_sync_cursor_shape',
      sql`${t.syncCursor} is null or char_length(${t.syncCursor}) between 1 and ${num(MAX_PROVIDER_REFERENCE_LENGTH)}`
    ),
    check(
      'mailboxes_health_score_range',
      sql`${t.healthScore} is null or ${t.healthScore} between 0 and 100`
    ),
    check('mailboxes_health_effect_known', sql`${t.healthEffect} in (${list(HEALTH_EFFECTS)})`),
    check(
      'mailboxes_health_effect_needs_score',
      sql`${t.healthEffect} = 'none' or ${t.healthScore} is not null`
    ),
    uniqueIndex('mailboxes_address_key').on(t.organizationId, t.provider, t.address),
    index('mailboxes_list_idx').on(t.organizationId, t.connectedAt.desc(), t.id.desc()),
    index('mailboxes_owner_idx')
      .on(t.organizationId, t.ownerMembershipId, t.connectedAt.desc(), t.id.desc())
      .where(sql`${t.ownerMembershipId} is not null`),
    index('mailboxes_state_idx').on(t.organizationId, t.state, t.connectedAt.desc(), t.id.desc()),
    index('mailboxes_poll_idx')
      .on(t.organizationId, t.nextPollAt)
      .where(sql`${t.nextPollAt} is not null`),
  ]
)

/**
 * The limits a Mailbox sends under: per day, per hour, the minimum gap between sends and the send
 * window. One row per Mailbox. The effective limits (after the published ramp, the Organization's
 * ceiling and a health penalty) are computed by the service and never stored. The window is a
 * time zone, a set of weekdays as a bitmask (`window_days`: Monday is bit 0, Sunday bit 6, so at
 * least one and no repeated day) and the start and end minute of the day.
 *
 * Lookups served: the limits of one Mailbox (the primary key).
 */
export const mailboxLimits = outboundSchema.table(
  'mailbox_limits',
  {
    organizationId: text('organization_id').notNull(),
    mailboxId: text('mailbox_id').notNull(),
    perDay: integer('per_day').notNull(),
    perHour: integer('per_hour').notNull(),
    minGapSeconds: integer('min_gap_seconds').notNull().default(0),
    windowTimeZone: text('window_time_zone').notNull(),
    windowDays: smallint('window_days').notNull().default(31),
    windowStartMinute: smallint('window_start_minute').notNull().default(540),
    windowEndMinute: smallint('window_end_minute').notNull().default(1020),
    updatedByMembershipId: text('updated_by_membership_id'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'mailbox_limits_pkey', columns: [t.organizationId, t.mailboxId] }),
    check('mailbox_limits_organization_id_shape', orgShape),
    check('mailbox_limits_organization_not_global', notGlobal),
    check('mailbox_limits_mailbox_id_shape', idShape('mailbox_id', 'mbx')),
    check('mailbox_limits_per_day_range', sql`${t.perDay} between 1 and ${num(MAX_SENDS_PER_DAY)}`),
    check(
      'mailbox_limits_per_hour_range',
      sql`${t.perHour} between 1 and ${num(MAX_SENDS_PER_HOUR)}`
    ),
    check(
      'mailbox_limits_min_gap_range',
      sql`${t.minGapSeconds} between 0 and ${num(MAX_MIN_GAP_SECONDS)}`
    ),
    check(
      'mailbox_limits_window_time_zone_shape',
      sql`char_length(${t.windowTimeZone}) between 1 and 64`
    ),
    check('mailbox_limits_window_days_range', sql`${t.windowDays} between 1 and 127`),
    check(
      'mailbox_limits_window_minutes_range',
      sql`${t.windowStartMinute} between 0 and 1439
        and ${t.windowEndMinute} between 1 and 1440
        and ${t.windowEndMinute} > ${t.windowStartMinute}`
    ),
    check(
      'mailbox_limits_updated_by_membership_id_shape',
      idShape('updated_by_membership_id', 'mem')
    ),
    foreignKey({
      name: 'mailbox_limits_mailbox_fk',
      columns: [t.organizationId, t.mailboxId],
      foreignColumns: [mailboxes.organizationId, mailboxes.id],
    }).onDelete('cascade'),
  ]
)

/**
 * The send log: one row per attempt to send one Step of an Enrollment, sent or not. The send key
 * (`send_key`, `<enrollment id>:<step>:<attempt epoch>`, a check ties it to the three columns) is
 * unique per Organization (`mail_messages_send_key_key`), so a repeated attempt is refused as a
 * duplicate and a retry uses the next attempt epoch. A `refused` or `deferred` send names its
 * `reason`; a `deferred` one says when it is tried again (`retry_at`); a send that reached the
 * transport (`sending`, `sent`, `failed`) names its Mailbox, and `sent` alone has `sent_at` and may
 * hold the provider's message and thread ids. The provider message id is unique per Mailbox
 * (`mail_messages_provider_message_key`). `checks` is the result of each pre-send check, in order.
 * No subject or body is kept here: the text is the Draft's (`draft_id`).
 *
 * Lists served (keyset `(decided_at, id)` newest first, `LIMIT` a page): all sends
 * (`mail_messages_list_idx`), one Campaign (`mail_messages_campaign_idx`), one Prospect
 * (`mail_messages_prospect_idx`), one Mailbox (`mail_messages_mailbox_idx`), by state
 * (`mail_messages_state_idx`). Limit counting reads sent sends of a Mailbox by `sent_at`
 * (`mail_messages_sent_idx`); recovery reads the `sending` ones (`mail_messages_sending_idx`) and
 * the retry reads the `deferred` ones by `retry_at` (`mail_messages_deferred_idx`).
 */
export const mailMessages = outboundSchema.table(
  'mail_messages',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    campaignId: text('campaign_id').notNull(),
    enrollmentId: text('enrollment_id').notNull(),
    prospectId: text('prospect_id').notNull(),
    draftId: text('draft_id'),
    step: integer('step').notNull(),
    attemptEpoch: integer('attempt_epoch').notNull(),
    sendKey: text('send_key').notNull(),
    mailboxId: text('mailbox_id'),
    state: text('state', { enum: SEND_STATES }).notNull(),
    reason: text('reason', { enum: SEND_REFUSAL_REASONS }),
    checks: jsonb('checks').notNull().default(sql`'[]'::jsonb`),
    retryAt: ts('retry_at'),
    providerMessageId: text('provider_message_id'),
    providerThreadId: text('provider_thread_id'),
    decidedAt: ts('decided_at').notNull().defaultNow(),
    sentAt: ts('sent_at'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'mail_messages_pkey', columns: [t.organizationId, t.id] }),
    check('mail_messages_id_shape', idShape('id', 'snd')),
    check('mail_messages_organization_id_shape', orgShape),
    check('mail_messages_organization_not_global', notGlobal),
    check('mail_messages_campaign_id_shape', idShape('campaign_id', 'cpg')),
    check('mail_messages_enrollment_id_shape', idShape('enrollment_id', 'enr')),
    check('mail_messages_prospect_id_shape', idShape('prospect_id', 'prs')),
    check('mail_messages_draft_id_shape', idShape('draft_id', 'drf')),
    check('mail_messages_mailbox_id_shape', idShape('mailbox_id', 'mbx')),
    check('mail_messages_step_range', sql`${t.step} between 0 and ${num(MAX_SEQUENCE_STEP)}`),
    check(
      'mail_messages_attempt_epoch_range',
      sql`${t.attemptEpoch} between 0 and ${num(MAX_ATTEMPT_EPOCH)}`
    ),
    check(
      'mail_messages_send_key_matches',
      sql`${t.sendKey} = ${t.enrollmentId} || ':' || ${t.step}::text || ':' || ${t.attemptEpoch}::text`
    ),
    check('mail_messages_state_known', sql`${t.state} in (${list(SEND_STATES)})`),
    check(
      'mail_messages_reason_known',
      sql`${t.reason} is null or ${t.reason} in (${list(SEND_REFUSAL_REASONS)})`
    ),
    check(
      'mail_messages_reason_matches_state',
      sql`(${t.state} in ('refused', 'deferred')) = (${t.reason} is not null)`
    ),
    check(
      'mail_messages_reason_fits_state',
      sql`${t.state} not in ('refused', 'deferred')
        or ((${t.state} = 'deferred') = (${t.reason} in (${list(SEND_DEFERRING_REASONS)})))`
    ),
    check(
      'mail_messages_retry_at_matches_state',
      sql`(${t.state} = 'deferred') = (${t.retryAt} is not null)`
    ),
    check(
      'mail_messages_mailbox_when_sending',
      sql`${t.state} not in ('sending', 'sent', 'failed') or ${t.mailboxId} is not null`
    ),
    check(
      'mail_messages_sent_at_matches_state',
      sql`(${t.state} = 'sent') = (${t.sentAt} is not null)`
    ),
    check(
      'mail_messages_provider_ids_only_when_sent',
      sql`(${t.providerMessageId} is null and ${t.providerThreadId} is null) or ${t.state} = 'sent'`
    ),
    check(
      'mail_messages_provider_message_id_shape',
      sql`${t.providerMessageId} is null or ${t.providerMessageId} ~ ${sql.raw(`'${PROVIDER_MESSAGE_ID}'`)}`
    ),
    check(
      'mail_messages_provider_thread_id_shape',
      sql`${t.providerThreadId} is null or char_length(${t.providerThreadId}) between 1 and ${num(MAX_PROVIDER_REFERENCE_LENGTH)}`
    ),
    check(
      'mail_messages_checks_shape',
      sql`jsonb_typeof(${t.checks}) = 'array' and jsonb_array_length(${t.checks}) <= ${num(SEND_CHECKS.length)}`
    ),
    uniqueIndex('mail_messages_send_key_key').on(t.organizationId, t.sendKey),
    uniqueIndex('mail_messages_provider_message_key').on(
      t.organizationId,
      t.mailboxId,
      t.providerMessageId
    ),
    // The target of a mail event's foreign key, so an event cannot name another Mailbox's send.
    unique('mail_messages_id_mailbox_key').on(t.organizationId, t.id, t.mailboxId),
    foreignKey({
      name: 'mail_messages_mailbox_fk',
      columns: [t.organizationId, t.mailboxId],
      foreignColumns: [mailboxes.organizationId, mailboxes.id],
    }).onDelete('cascade'),
    index('mail_messages_list_idx').on(t.organizationId, t.decidedAt.desc(), t.id.desc()),
    index('mail_messages_campaign_idx').on(
      t.organizationId,
      t.campaignId,
      t.decidedAt.desc(),
      t.id.desc()
    ),
    index('mail_messages_prospect_idx').on(
      t.organizationId,
      t.prospectId,
      t.decidedAt.desc(),
      t.id.desc()
    ),
    index('mail_messages_mailbox_idx')
      .on(t.organizationId, t.mailboxId, t.decidedAt.desc(), t.id.desc())
      .where(sql`${t.mailboxId} is not null`),
    index('mail_messages_state_idx').on(t.organizationId, t.state, t.decidedAt.desc(), t.id.desc()),
    index('mail_messages_enrollment_idx').on(t.organizationId, t.enrollmentId, t.step),
    index('mail_messages_sent_idx')
      .on(t.organizationId, t.mailboxId, t.sentAt.desc())
      .where(sql`${t.sentAt} is not null`),
    index('mail_messages_sending_idx')
      .on(t.organizationId, t.decidedAt)
      .where(sql`${t.state} = 'sending'`),
    index('mail_messages_deferred_idx')
      .on(t.organizationId, t.retryAt)
      .where(sql`${t.state} = 'deferred'`),
  ]
)

/**
 * Something seen on a Mailbox after a send: a bounce, a complaint, a reply, an out-of-office or
 * an unsubscribe. `provider_message_id` is the provider's id of the message that carried it (the
 * service gives an unsubscribe one of its own), unique per Mailbox
 * (`mail_events_provider_message_key`), so a replayed notification or a repeated poll inserts
 * nothing twice. `send_id`, `prospect_id` and `enrollment_id` say what it is about when the
 * service could tell; only an `out_of_office` has a `return_date`. An event never changes (the
 * service role holds no UPDATE) and holds ids, a kind and times, never the text of a message.
 *
 * Lists served (keyset `(occurred_at, id)` newest first, `LIMIT` a page): all events
 * (`mail_events_list_idx`), one Mailbox's (`mail_events_mailbox_idx`), one Mailbox's of a kind
 * (`mail_events_mailbox_kind_idx`, which also serves the health window's counts), one
 * Prospect's (`mail_events_prospect_idx`).
 */
export const mailEvents = outboundSchema.table(
  'mail_events',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    mailboxId: text('mailbox_id').notNull(),
    kind: text('kind', { enum: MAIL_EVENT_KINDS }).notNull(),
    sendId: text('send_id'),
    prospectId: text('prospect_id'),
    enrollmentId: text('enrollment_id'),
    providerMessageId: text('provider_message_id').notNull(),
    returnDate: date('return_date', { mode: 'string' }),
    occurredAt: ts('occurred_at').notNull(),
    recordedAt: ts('recorded_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'mail_events_pkey', columns: [t.organizationId, t.id] }),
    check('mail_events_id_shape', idShape('id', 'mev')),
    check('mail_events_organization_id_shape', orgShape),
    check('mail_events_organization_not_global', notGlobal),
    check('mail_events_mailbox_id_shape', idShape('mailbox_id', 'mbx')),
    check('mail_events_kind_known', sql`${t.kind} in (${list(MAIL_EVENT_KINDS)})`),
    check('mail_events_send_id_shape', idShape('send_id', 'snd')),
    check('mail_events_prospect_id_shape', idShape('prospect_id', 'prs')),
    check('mail_events_enrollment_id_shape', idShape('enrollment_id', 'enr')),
    check(
      'mail_events_provider_message_id_shape',
      sql`${t.providerMessageId} ~ ${sql.raw(`'${PROVIDER_MESSAGE_ID}'`)}`
    ),
    check(
      'mail_events_return_date_only_out_of_office',
      sql`${t.returnDate} is null or ${t.kind} = 'out_of_office'`
    ),
    uniqueIndex('mail_events_provider_message_key').on(
      t.organizationId,
      t.mailboxId,
      t.providerMessageId
    ),
    foreignKey({
      name: 'mail_events_mailbox_fk',
      columns: [t.organizationId, t.mailboxId],
      foreignColumns: [mailboxes.organizationId, mailboxes.id],
    }).onDelete('cascade'),
    // The send, when named, is this Mailbox's own.
    foreignKey({
      name: 'mail_events_send_fk',
      columns: [t.organizationId, t.sendId, t.mailboxId],
      foreignColumns: [mailMessages.organizationId, mailMessages.id, mailMessages.mailboxId],
    }).onDelete('cascade'),
    index('mail_events_list_idx').on(t.organizationId, t.occurredAt.desc(), t.id.desc()),
    index('mail_events_mailbox_idx').on(
      t.organizationId,
      t.mailboxId,
      t.occurredAt.desc(),
      t.id.desc()
    ),
    index('mail_events_mailbox_kind_idx').on(
      t.organizationId,
      t.mailboxId,
      t.kind,
      t.occurredAt.desc(),
      t.id.desc()
    ),
    index('mail_events_prospect_idx')
      .on(t.organizationId, t.prospectId, t.occurredAt.desc(), t.id.desc())
      .where(sql`${t.prospectId} is not null`),
  ]
)

/**
 * One Mailbox's health on one UTC day: the score (null when the rolling window held fewer sends
 * than the minimum sample, shown as "not enough data"), the day's counts and the components with
 * their weights and thresholds as the service computed them (a JSON array of at most 10, each
 * naming one of the health components). The service upserts the row for the day. Holds numbers
 * only.
 *
 * Lists served: one Mailbox's history newest day first, keyset on `day` (the primary key, read
 * backwards).
 */
export const healthDaily = outboundSchema.table(
  'health_daily',
  {
    organizationId: text('organization_id').notNull(),
    mailboxId: text('mailbox_id').notNull(),
    day: date('day', { mode: 'string' }).notNull(),
    score: smallint('score'),
    sent: integer('sent').notNull().default(0),
    hardBounces: integer('hard_bounces').notNull().default(0),
    softBounces: integer('soft_bounces').notNull().default(0),
    complaints: integer('complaints').notNull().default(0),
    replies: integer('replies').notNull().default(0),
    errors: integer('errors').notNull().default(0),
    components: jsonb('components').notNull().default(sql`'[]'::jsonb`),
    computedAt: ts('computed_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'health_daily_pkey', columns: [t.organizationId, t.mailboxId, t.day] }),
    check('health_daily_organization_id_shape', orgShape),
    check('health_daily_organization_not_global', notGlobal),
    check('health_daily_mailbox_id_shape', idShape('mailbox_id', 'mbx')),
    check('health_daily_score_range', sql`${t.score} is null or ${t.score} between 0 and 100`),
    check(
      'health_daily_counts_range',
      sql`${t.sent} between 0 and ${num(MAX_HEALTH_COUNT)}
        and ${t.hardBounces} between 0 and ${num(MAX_HEALTH_COUNT)}
        and ${t.softBounces} between 0 and ${num(MAX_HEALTH_COUNT)}
        and ${t.complaints} between 0 and ${num(MAX_HEALTH_COUNT)}
        and ${t.replies} between 0 and ${num(MAX_HEALTH_COUNT)}
        and ${t.errors} between 0 and ${num(MAX_HEALTH_COUNT)}`
    ),
    check(
      'health_daily_components_shape',
      sql`jsonb_typeof(${t.components}) = 'array' and jsonb_array_length(${t.components}) <= ${num(MAX_HEALTH_COMPONENTS)}`
    ),
    foreignKey({
      name: 'health_daily_mailbox_fk',
      columns: [t.organizationId, t.mailboxId],
      foreignColumns: [mailboxes.organizationId, mailboxes.id],
    }).onDelete('cascade'),
  ]
)
