import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { outboundSchema } from './outbound'

/*
 * Milestone 11 (`docs/specs/m11-linkedin-channel.md` in the hub): LinkedIn accounts, the written
 * risk acceptance, the channel switch and the per-account daily usage. The values below mirror the
 * contract (`tula-closeline-contract`, `src/linkedin`); this library does not depend on the
 * contract, so each carries the name of the constant it copies and `outbound-linkedin.test.ts`
 * pins every value.
 */

/** The states of a LinkedIn account. Mirrors the contract's `LINKEDIN_ACCOUNT_STATUSES`. */
export const LINKEDIN_ACCOUNT_STATUSES = [
  'connected',
  'needs_login',
  'paused',
  'restricted',
  'disconnected',
] as const
/** Why an account is paused. Mirrors the contract's `LINKEDIN_PAUSE_REASONS`. */
export const LINKEDIN_PAUSE_REASONS = [
  'restricted',
  'checkpoint',
  'provider_unavailable',
  'admin',
  'rate_limited',
] as const
/** The most connection requests one account sends in a day. Mirrors `LINKEDIN_DAILY_CONNECTION_CEILING`. */
export const LINKEDIN_DAILY_CONNECTION_CEILING = 20
/** The most messages one account sends in a day. Mirrors `LINKEDIN_DAILY_MESSAGE_CEILING`. */
export const LINKEDIN_DAILY_MESSAGE_CEILING = 40
/** The most connection requests one account sends in a week. Mirrors `LINKEDIN_WEEKLY_CONNECTION_CEILING`. */
export const LINKEDIN_WEEKLY_CONNECTION_CEILING = 80
/** The most characters of a typed full name. Mirrors the contract's `MAX_LINKEDIN_TYPED_NAME_LENGTH`. */
export const MAX_LINKEDIN_TYPED_NAME_LENGTH = 200
/** The longest provider account reference we keep, in characters. */
export const MAX_LINKEDIN_PROVIDER_REFERENCE_LENGTH = 2048
/** The longest risk wording version string. Mirrors the contract's `linkedinRiskStatementSchema`. */
export const MAX_LINKEDIN_WORDING_VERSION_LENGTH = 40

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const num = (value: number) => sql.raw(String(value))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })

/**
 * A Rep's own LinkedIn account, connected through the provider's hosted login so an Outbound Agent
 * can send for them. One per Rep per Organization (`linkedin_accounts_member_key`): reconnecting
 * after a disconnect reuses the row. `provider_account_id` is the provider's reference only; no
 * credential, cookie or profile data is stored here. The three limits are what the Organization
 * lowered them to and never exceed the system ceiling. `pause_reason` is set only for an account
 * that is not `connected`.
 *
 * Lists served (keyset `(connected_at, id)` newest first, `LIMIT` a page): all accounts
 * (`linkedin_accounts_list_idx`); one Rep's account is the unique index.
 */
export const linkedinAccounts = outboundSchema.table(
  'linkedin_accounts',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    membershipId: text('membership_id').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    status: text('status', { enum: LINKEDIN_ACCOUNT_STATUSES }).notNull().default('needs_login'),
    pauseReason: text('pause_reason', { enum: LINKEDIN_PAUSE_REASONS }),
    dailyConnectionLimit: integer('daily_connection_limit')
      .notNull()
      .default(LINKEDIN_DAILY_CONNECTION_CEILING),
    dailyMessageLimit: integer('daily_message_limit')
      .notNull()
      .default(LINKEDIN_DAILY_MESSAGE_CEILING),
    weeklyConnectionLimit: integer('weekly_connection_limit')
      .notNull()
      .default(LINKEDIN_WEEKLY_CONNECTION_CEILING),
    connectedAt: ts('connected_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'linkedin_accounts_pkey', columns: [t.organizationId, t.id] }),
    check('linkedin_accounts_id_shape', idShape('id', 'lia')),
    check('linkedin_accounts_organization_id_shape', orgShape),
    check('linkedin_accounts_organization_not_global', notGlobal),
    check('linkedin_accounts_membership_id_shape', idShape('membership_id', 'mem')),
    check(
      'linkedin_accounts_provider_account_id_shape',
      sql`char_length(${t.providerAccountId}) between 1 and ${num(MAX_LINKEDIN_PROVIDER_REFERENCE_LENGTH)}`
    ),
    check(
      'linkedin_accounts_status_known',
      sql`${t.status} in (${list(LINKEDIN_ACCOUNT_STATUSES)})`
    ),
    check(
      'linkedin_accounts_pause_reason_known',
      sql`${t.pauseReason} is null or ${t.pauseReason} in (${list(LINKEDIN_PAUSE_REASONS)})`
    ),
    check(
      'linkedin_accounts_pause_reason_not_connected',
      sql`${t.status} <> 'connected' or ${t.pauseReason} is null`
    ),
    check(
      'linkedin_accounts_limits_range',
      sql`${t.dailyConnectionLimit} between 0 and ${num(LINKEDIN_DAILY_CONNECTION_CEILING)}
        and ${t.dailyMessageLimit} between 0 and ${num(LINKEDIN_DAILY_MESSAGE_CEILING)}
        and ${t.weeklyConnectionLimit} between 0 and ${num(LINKEDIN_WEEKLY_CONNECTION_CEILING)}`
    ),
    uniqueIndex('linkedin_accounts_member_key').on(t.organizationId, t.membershipId),
    index('linkedin_accounts_list_idx').on(t.organizationId, t.connectedAt.desc(), t.id.desc()),
  ]
)

/**
 * An Admin's written acceptance that LinkedIn may restrict the Reps' accounts, against one version
 * of the risk wording, with the full name as typed. Append-only: the only change a row accepts is
 * setting `revoked_at` once (the `linkedin_risk_acceptances_revoke_only` trigger), and a row is
 * never removed by the service role or truncated. The channel is enabled only with a row whose
 * `revoked_at` is null for the current wording version (`linkedin_risk_acceptances_active_idx`).
 *
 * Lists served (keyset `(accepted_at, id)` newest first, `LIMIT` a page): the history
 * (`linkedin_risk_acceptances_list_idx`).
 */
export const linkedinRiskAcceptances = outboundSchema.table(
  'linkedin_risk_acceptances',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    wordingVersion: text('wording_version').notNull(),
    acceptedByMembershipId: text('accepted_by_membership_id').notNull(),
    typedFullName: text('typed_full_name').notNull(),
    acceptedAt: ts('accepted_at').notNull().defaultNow(),
    revokedAt: ts('revoked_at'),
  },
  (t) => [
    primaryKey({ name: 'linkedin_risk_acceptances_pkey', columns: [t.organizationId, t.id] }),
    check('linkedin_risk_acceptances_id_shape', idShape('id', 'lra')),
    check('linkedin_risk_acceptances_organization_id_shape', orgShape),
    check('linkedin_risk_acceptances_organization_not_global', notGlobal),
    check(
      'linkedin_risk_acceptances_wording_version_shape',
      sql`char_length(${t.wordingVersion}) between 1 and ${num(MAX_LINKEDIN_WORDING_VERSION_LENGTH)}`
    ),
    check(
      'linkedin_risk_acceptances_accepted_by_shape',
      idShape('accepted_by_membership_id', 'mem')
    ),
    check(
      'linkedin_risk_acceptances_typed_full_name_shape',
      sql`char_length(${t.typedFullName}) between 2 and ${num(MAX_LINKEDIN_TYPED_NAME_LENGTH)}
        and ${t.typedFullName} !~ '[[:cntrl:]]'`
    ),
    check(
      'linkedin_risk_acceptances_revoked_after_accepted',
      sql`${t.revokedAt} is null or ${t.revokedAt} >= ${t.acceptedAt}`
    ),
    index('linkedin_risk_acceptances_list_idx').on(
      t.organizationId,
      t.acceptedAt.desc(),
      t.id.desc()
    ),
    index('linkedin_risk_acceptances_active_idx')
      .on(t.organizationId, t.wordingVersion)
      .where(sql`${t.revokedAt} is null`),
  ]
)

/**
 * The Admin switch of the LinkedIn channel: one row per Organization, absent meaning off. The
 * channel is effectively enabled only when this is on and a current acceptance is not revoked.
 */
export const linkedinChannelSettings = outboundSchema.table(
  'linkedin_channel_settings',
  {
    organizationId: text('organization_id').notNull(),
    enabled: boolean('enabled').notNull().default(false),
    updatedByMembershipId: text('updated_by_membership_id'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'linkedin_channel_settings_pkey', columns: [t.organizationId] }),
    check('linkedin_channel_settings_organization_id_shape', orgShape),
    check('linkedin_channel_settings_organization_not_global', notGlobal),
    check('linkedin_channel_settings_updated_by_shape', idShape('updated_by_membership_id', 'mem')),
  ]
)

/**
 * One account's sends on one calendar day: connection requests and messages. The atomic quota
 * reservation is an upsert of this row (`day` is the account's local date, chosen by the service);
 * the week's count is the sum over the week's rows (the primary key range). Counters never go
 * negative. Numbers only.
 *
 * Lookups served: one account's days, newest first (the primary key, read backwards).
 */
export const linkedinUsage = outboundSchema.table(
  'linkedin_usage',
  {
    organizationId: text('organization_id').notNull(),
    accountId: text('account_id').notNull(),
    day: date('day', { mode: 'string' }).notNull(),
    connections: integer('connections').notNull().default(0),
    messages: integer('messages').notNull().default(0),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'linkedin_usage_pkey',
      columns: [t.organizationId, t.accountId, t.day],
    }),
    check('linkedin_usage_organization_id_shape', orgShape),
    check('linkedin_usage_organization_not_global', notGlobal),
    check('linkedin_usage_account_id_shape', idShape('account_id', 'lia')),
    check(
      'linkedin_usage_counters_not_negative',
      sql`${t.connections} >= 0 and ${t.messages} >= 0`
    ),
    foreignKey({
      name: 'linkedin_usage_account_fk',
      columns: [t.organizationId, t.accountId],
      foreignColumns: [linkedinAccounts.organizationId, linkedinAccounts.id],
    }).onDelete('cascade'),
  ]
)

/** The kinds of LinkedIn send: a connection request or a message. */
export const LINKEDIN_SEND_KINDS = ['connection', 'message'] as const
/** The states of a LinkedIn send: `sending` (reserved, outcome not yet known) and `sent`. */
export const LINKEDIN_SEND_STATES = ['sending', 'sent'] as const
/** The longest send key, in characters. */
export const MAX_LINKEDIN_SEND_KEY_LENGTH = 200

/**
 * One LinkedIn send, keyed by the caller's idempotency key: written in the same transaction as the
 * quota reservation, so a retried job finds it and never sends or counts twice. A row left in
 * `sending` means the outcome is unknown and is never sent again. Ids and times only.
 *
 * Lookups served: by key (the primary key); an account's latest send (`linkedin_sends_account_idx`).
 */
export const linkedinSends = outboundSchema.table(
  'linkedin_sends',
  {
    organizationId: text('organization_id').notNull(),
    sendKey: text('send_key').notNull(),
    accountId: text('account_id').notNull(),
    kind: text('kind').notNull(),
    state: text('state').notNull().default('sending'),
    createdAt: ts('created_at').notNull().defaultNow(),
    sentAt: ts('sent_at'),
  },
  (t) => [
    primaryKey({ name: 'linkedin_sends_pkey', columns: [t.organizationId, t.sendKey] }),
    check('linkedin_sends_organization_id_shape', orgShape),
    check('linkedin_sends_organization_not_global', notGlobal),
    check('linkedin_sends_account_id_shape', idShape('account_id', 'lia')),
    check(
      'linkedin_sends_send_key_length',
      sql`char_length(${t.sendKey}) between 1 and ${num(MAX_LINKEDIN_SEND_KEY_LENGTH)}`
    ),
    check('linkedin_sends_kind_known', sql`${t.kind} in (${list(LINKEDIN_SEND_KINDS)})`),
    check('linkedin_sends_state_known', sql`${t.state} in (${list(LINKEDIN_SEND_STATES)})`),
    check(
      'linkedin_sends_sent_matches_state',
      sql`(${t.state} = 'sent') = (${t.sentAt} is not null)`
    ),
    foreignKey({
      name: 'linkedin_sends_account_fk',
      columns: [t.organizationId, t.accountId],
      foreignColumns: [linkedinAccounts.organizationId, linkedinAccounts.id],
    }).onDelete('cascade'),
    index('linkedin_sends_account_idx').on(t.organizationId, t.accountId, t.createdAt.desc()),
  ]
)
