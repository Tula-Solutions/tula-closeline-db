import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { coreSchema } from './core'
import { prospects } from './core-prospects'
import { memberships, organizations, teams } from './core-tables'

/*
 * Milestone 10 (`docs/specs/m10-meetings-routing.md` in the hub): Calendar Connections, working
 * hours, Booking Types, Routing Rules and their state and decisions, busy blocks and Bookings. The
 * values below are the ones core will validate against; this library does not depend on the
 * contract, and `core-calendars.test.ts` pins every value.
 */

/** The calendar vendors a Calendar Connection links to. */
export const CALENDAR_PROVIDERS = ['google', 'outlook'] as const
/** The states of a Calendar Connection. */
export const CALENDAR_CONNECTION_STATES = ['healthy', 'needs_reconnect'] as const
/** How a Booking Type is held: a phone Call or a video conversation. */
export const BOOKING_MODES = ['phone', 'video'] as const
/** The states of a Booking. Only `confirmed` Bookings hold a Rep's time (the exclusion constraint). */
export const BOOKING_STATES = ['pending', 'confirmed', 'cancelled'] as const
/** Who made a Booking: a member, the Inbound Agent, or a Prospect on the public page. Mirrors the contract's `BOOKING_ORIGINS`. */
export const BOOKING_ORIGINS = ['member', 'agent', 'public'] as const
/** What a Routing Rule picks: one Rep, a Team in round-robin, or a named pool of Reps. */
export const ROUTING_TARGET_KINDS = ['rep', 'team', 'pool'] as const
/** What a routing decision was made for. */
export const ROUTING_PURPOSES = ['booking', 'handoff', 'test'] as const
/** The most Reps in one named pool, and the most considered for one slot request. */
export const MAX_ROUTING_POOL_MEMBERS = 20
/** The most Routing Rules an Organization keeps. */
export const MAX_ROUTING_RULES = 200
/** The most weekly windows one Rep's working hours hold (four a day). */
export const MAX_WORKING_WINDOWS = 28

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })
const createdAt = () => ts('created_at').notNull().defaultNow()
const updatedAt = () => ts('updated_at').notNull().defaultNow()
const orgColumn = () =>
  text('organization_id')
    .notNull()
    .references(() => organizations.organizationId, { onDelete: 'cascade' })

const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
})
const textArray = customType<{ data: string[]; driverData: string[] }>({
  dataType: () => 'text[]',
})

/**
 * A Rep's authorised link to their calendar. `tokens_ciphertext` is the sealed grant (never
 * returned by any route); one connection per Rep. `status` flips to `needs_reconnect` when the
 * grant is revoked. Read by Rep (`calendar_connections_membership_key`); the refresh job lists the
 * Organization's connections by `calendar_connections_list_idx` (keyset `(created_at, id)`).
 */
export const calendarConnections = coreSchema.table(
  'calendar_connections',
  {
    id: text('id').notNull(),
    organizationId: orgColumn(),
    membershipId: text('membership_id').notNull(),
    provider: text('provider', { enum: CALENDAR_PROVIDERS }).notNull(),
    status: text('status', { enum: CALENDAR_CONNECTION_STATES }).notNull().default('healthy'),
    accountEmail: text('account_email').notNull(),
    calendarId: text('calendar_id').notNull(),
    tokensCiphertext: bytes('tokens_ciphertext').notNull(),
    lastRefreshedAt: ts('last_refreshed_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: 'calendar_connections_pkey', columns: [t.organizationId, t.id] }),
    check('calendar_connections_id_shape', idShape('id', 'cal')),
    check('calendar_connections_organization_id_shape', orgShape),
    check('calendar_connections_organization_not_global', notGlobal),
    check(
      'calendar_connections_provider_known',
      sql`${t.provider} in (${list(CALENDAR_PROVIDERS)})`
    ),
    check(
      'calendar_connections_status_known',
      sql`${t.status} in (${list(CALENDAR_CONNECTION_STATES)})`
    ),
    check(
      'calendar_connections_account_email_shape',
      sql`char_length(${t.accountEmail}) between 3 and 320`
    ),
    check(
      'calendar_connections_calendar_id_shape',
      sql`char_length(${t.calendarId}) between 1 and 500`
    ),
    check(
      'calendar_connections_tokens_size',
      sql`octet_length(${t.tokensCiphertext}) between 1 and 8192`
    ),
    foreignKey({
      name: 'calendar_connections_membership_fk',
      columns: [t.organizationId, t.membershipId],
      foreignColumns: [memberships.organizationId, memberships.id],
    }).onDelete('cascade'),
    uniqueIndex('calendar_connections_membership_key').on(t.organizationId, t.membershipId),
    index('calendar_connections_list_idx').on(t.organizationId, t.createdAt, t.id),
  ]
)

/**
 * A Rep's working hours, one row per Rep: the IANA `timezone`, the weekly `windows` (a JSON array
 * of `{ day: 0-6 (Monday 0), start: minute, end: minute }`, at most 28, validated by core), an
 * optional `daily_cap` of Bookings and `on_leave_until`. Read by the primary key.
 */
export const workingHours = coreSchema.table(
  'working_hours',
  {
    organizationId: orgColumn(),
    membershipId: text('membership_id').notNull(),
    timezone: text('timezone').notNull(),
    windows: jsonb('windows').$type<unknown[]>().notNull().default(sql`'[]'::jsonb`),
    dailyCap: smallint('daily_cap'),
    onLeaveUntil: ts('on_leave_until'),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: 'working_hours_pkey', columns: [t.organizationId, t.membershipId] }),
    check('working_hours_organization_id_shape', orgShape),
    check('working_hours_organization_not_global', notGlobal),
    check('working_hours_timezone_shape', sql`${t.timezone} ~ '^[A-Za-z][A-Za-z0-9_+/-]{0,63}$'`),
    check(
      'working_hours_windows_shape',
      sql`jsonb_typeof(${t.windows}) = 'array' and jsonb_array_length(${t.windows}) <= ${sql.raw(String(MAX_WORKING_WINDOWS))}`
    ),
    check(
      'working_hours_daily_cap_range',
      sql`${t.dailyCap} is null or ${t.dailyCap} between 1 and 100`
    ),
    foreignKey({
      name: 'working_hours_membership_fk',
      columns: [t.organizationId, t.membershipId],
      foreignColumns: [memberships.organizationId, memberships.id],
    }).onDelete('cascade'),
  ]
)

/**
 * A named kind of Booking: length, buffers, minimum notice, mode. `public_token_hash` (SHA-256 hex
 * of the unguessable link token, null while the public page is off) is unique across Regions' rows
 * so a token resolves to one Booking Type. Lists: `booking_types_list_idx` (keyset
 * `(created_at, id)`); names are unique per Organization ignoring case.
 */
export const bookingTypes = coreSchema.table(
  'booking_types',
  {
    id: text('id').notNull(),
    organizationId: orgColumn(),
    name: text('name').notNull(),
    lengthMinutes: smallint('length_minutes').notNull(),
    bufferBeforeMinutes: smallint('buffer_before_minutes').notNull().default(0),
    bufferAfterMinutes: smallint('buffer_after_minutes').notNull().default(0),
    minNoticeMinutes: integer('min_notice_minutes').notNull().default(0),
    mode: text('mode', { enum: BOOKING_MODES }).notNull(),
    active: boolean('active').notNull().default(true),
    publicTokenHash: text('public_token_hash'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: 'booking_types_pkey', columns: [t.organizationId, t.id] }),
    check('booking_types_id_shape', idShape('id', 'bkt')),
    check('booking_types_organization_id_shape', orgShape),
    check('booking_types_organization_not_global', notGlobal),
    check(
      'booking_types_name_shape',
      sql`char_length(${t.name}) between 1 and 200 and ${t.name} = btrim(${t.name})`
    ),
    check('booking_types_length_range', sql`${t.lengthMinutes} between 5 and 480`),
    check(
      'booking_types_buffers_range',
      sql`${t.bufferBeforeMinutes} between 0 and 120 and ${t.bufferAfterMinutes} between 0 and 120`
    ),
    check('booking_types_min_notice_range', sql`${t.minNoticeMinutes} between 0 and 43200`),
    check('booking_types_mode_known', sql`${t.mode} in (${list(BOOKING_MODES)})`),
    check(
      'booking_types_public_token_hash_shape',
      sql`${t.publicTokenHash} is null or ${t.publicTokenHash} ~ '^[0-9a-f]{64}$'`
    ),
    uniqueIndex('booking_types_name_key').on(t.organizationId, sql`lower(${t.name})`),
    uniqueIndex('booking_types_public_token_key').on(t.publicTokenHash),
    index('booking_types_list_idx').on(t.organizationId, t.createdAt, t.id),
  ]
)

/**
 * The directory behind `core.booking_type_for_token(token_hash)`: one row per active Booking Type
 * that has a public link, keyed by the SHA-256 hex of its token. The public booking routes receive
 * only a token, so no Organization is set and row-level security hides `booking_types`. It is not
 * under row-level security; no service role holds any privilege on it. The trigger
 * `booking_type_sync_directory` on `booking_types` keeps it, and the function (joined to
 * `organization_state`, so only an `active` Organization answers) is the only way in.
 */
export const bookingTypeDirectory = coreSchema.table(
  'booking_type_directory',
  {
    tokenHash: text('token_hash').primaryKey(),
    organizationId: text('organization_id').notNull(),
    bookingTypeId: text('booking_type_id').notNull(),
  },
  (t) => [
    check('booking_type_directory_token_hash_shape', sql`${t.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check('booking_type_directory_organization_id_shape', orgShape),
    check('booking_type_directory_booking_type_id_shape', idShape('booking_type_id', 'bkt')),
  ]
)

/**
 * An ordered Routing Rule: `position` orders the rules (ties broken by id), `conditions` is a JSON
 * object core validates (country, region, company size band, named-account owner, source, Booking
 * Type), and the target is exactly one of a Rep (`target_membership_id`), a Team
 * (`target_team_id`, round-robin) or a named pool (`pool_name` with `pool_membership_ids`).
 * Evaluated in order by `routing_rules_order_idx`.
 */
export const routingRules = coreSchema.table(
  'routing_rules',
  {
    id: text('id').notNull(),
    organizationId: orgColumn(),
    position: integer('position').notNull(),
    name: text('name').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    conditions: jsonb('conditions')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    targetKind: text('target_kind', { enum: ROUTING_TARGET_KINDS }).notNull(),
    targetMembershipId: text('target_membership_id'),
    targetTeamId: text('target_team_id'),
    poolName: text('pool_name'),
    poolMembershipIds: textArray('pool_membership_ids'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: 'routing_rules_pkey', columns: [t.organizationId, t.id] }),
    check('routing_rules_id_shape', idShape('id', 'rrl')),
    check('routing_rules_organization_id_shape', orgShape),
    check('routing_rules_organization_not_global', notGlobal),
    check(
      'routing_rules_position_range',
      sql`${t.position} between 0 and ${sql.raw(String(MAX_ROUTING_RULES * 100))}`
    ),
    check(
      'routing_rules_name_shape',
      sql`char_length(${t.name}) between 1 and 200 and ${t.name} = btrim(${t.name})`
    ),
    check('routing_rules_conditions_shape', sql`jsonb_typeof(${t.conditions}) = 'object'`),
    check(
      'routing_rules_target_kind_known',
      sql`${t.targetKind} in (${list(ROUTING_TARGET_KINDS)})`
    ),
    check(
      'routing_rules_target_matches_kind',
      sql`(${t.targetKind} = 'rep' and ${t.targetMembershipId} is not null and ${t.targetTeamId} is null and ${t.poolName} is null and ${t.poolMembershipIds} is null)
        or (${t.targetKind} = 'team' and ${t.targetTeamId} is not null and ${t.targetMembershipId} is null and ${t.poolName} is null and ${t.poolMembershipIds} is null)
        or (${t.targetKind} = 'pool' and ${t.poolName} is not null and ${t.poolMembershipIds} is not null and ${t.targetMembershipId} is null and ${t.targetTeamId} is null)`
    ),
    check(
      'routing_rules_pool_shape',
      sql`${t.poolName} is null or (char_length(${t.poolName}) between 1 and 100
        and coalesce(cardinality(${t.poolMembershipIds}), 0) between 1 and ${sql.raw(String(MAX_ROUTING_POOL_MEMBERS))})`
    ),
    foreignKey({
      name: 'routing_rules_target_membership_fk',
      columns: [t.organizationId, t.targetMembershipId],
      foreignColumns: [memberships.organizationId, memberships.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'routing_rules_target_team_fk',
      columns: [t.organizationId, t.targetTeamId],
      foreignColumns: [teams.organizationId, teams.id],
    }).onDelete('cascade'),
    index('routing_rules_order_idx').on(t.organizationId, t.position, t.id),
    index('routing_rules_target_membership_idx').on(t.organizationId, t.targetMembershipId),
    index('routing_rules_target_team_idx').on(t.organizationId, t.targetTeamId),
  ]
)

/**
 * Round-robin state, one row per target, advanced under a row lock (`select ... for update`) so
 * concurrent bookings do not pick the same Rep twice. `target_key` is `rule:<id>` or `team:<id>`.
 * Read by the primary key.
 */
export const routingState = coreSchema.table(
  'routing_state',
  {
    organizationId: orgColumn(),
    targetKey: text('target_key').notNull(),
    lastMembershipId: text('last_membership_id'),
    cursor: integer('cursor').notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: 'routing_state_pkey', columns: [t.organizationId, t.targetKey] }),
    check('routing_state_organization_id_shape', orgShape),
    check('routing_state_organization_not_global', notGlobal),
    check('routing_state_target_key_shape', sql`${t.targetKey} ~ '^(rule|team):[a-z0-9_]{1,80}$'`),
    check(
      'routing_state_last_membership_id_shape',
      sql`${t.lastMembershipId} is null or ${t.lastMembershipId} ~ '^mem_[0-9a-f]{32}$'`
    ),
    check('routing_state_cursor_not_negative', sql`${t.cursor} >= 0`),
  ]
)

/**
 * One stored routing decision: the matched rule, the chosen Rep (null when none was eligible), the
 * ordered candidates and the skipped Reps with the reason, as JSON arrays core validates. An audit
 * record, so `rule_id`, `prospect_id` and `booking_type_id` are plain ids with no foreign key (they
 * outlive a deleted rule). Lists: `routing_decisions_list_idx` (keyset `(created_at, id)`, newest
 * first) and `routing_decisions_prospect_idx` (by Prospect).
 */
export const routingDecisions = coreSchema.table(
  'routing_decisions',
  {
    id: text('id').notNull(),
    organizationId: orgColumn(),
    purpose: text('purpose', { enum: ROUTING_PURPOSES }).notNull(),
    prospectId: text('prospect_id'),
    bookingTypeId: text('booking_type_id'),
    ruleId: text('rule_id'),
    chosenMembershipId: text('chosen_membership_id'),
    candidates: jsonb('candidates').$type<unknown[]>().notNull().default(sql`'[]'::jsonb`),
    skipped: jsonb('skipped').$type<unknown[]>().notNull().default(sql`'[]'::jsonb`),
    reason: text('reason').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: 'routing_decisions_pkey', columns: [t.organizationId, t.id] }),
    check('routing_decisions_id_shape', idShape('id', 'rdc')),
    check('routing_decisions_organization_id_shape', orgShape),
    check('routing_decisions_organization_not_global', notGlobal),
    check('routing_decisions_purpose_known', sql`${t.purpose} in (${list(ROUTING_PURPOSES)})`),
    check(
      'routing_decisions_arrays_shape',
      sql`jsonb_typeof(${t.candidates}) = 'array' and jsonb_typeof(${t.skipped}) = 'array'
        and jsonb_array_length(${t.candidates}) <= ${sql.raw(String(MAX_ROUTING_POOL_MEMBERS))}
        and jsonb_array_length(${t.skipped}) <= ${sql.raw(String(MAX_ROUTING_POOL_MEMBERS))}`
    ),
    check('routing_decisions_reason_shape', sql`char_length(${t.reason}) between 1 and 500`),
    index('routing_decisions_list_idx').on(t.organizationId, t.createdAt, t.id),
    index('routing_decisions_prospect_idx').on(t.organizationId, t.prospectId, t.createdAt),
  ]
)

/**
 * A busy interval on a Rep's calendar, refreshed from the vendor for the next 14 days. The refresh
 * deletes a Rep's range and inserts it again. Slot requests read by the primary key prefix
 * `(organization_id, membership_id, starts_at)`; past blocks are swept by
 * `busy_blocks_expiry_idx`. Holds times only, never a title or attendee.
 */
export const busyBlocks = coreSchema.table(
  'busy_blocks',
  {
    organizationId: orgColumn(),
    membershipId: text('membership_id').notNull(),
    startsAt: ts('starts_at').notNull(),
    endsAt: ts('ends_at').notNull(),
    refreshedAt: ts('refreshed_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'busy_blocks_pkey',
      columns: [t.organizationId, t.membershipId, t.startsAt, t.endsAt],
    }),
    check('busy_blocks_organization_id_shape', orgShape),
    check('busy_blocks_organization_not_global', notGlobal),
    check('busy_blocks_ends_after_starts', sql`${t.endsAt} > ${t.startsAt}`),
    foreignKey({
      name: 'busy_blocks_membership_fk',
      columns: [t.organizationId, t.membershipId],
      foreignColumns: [memberships.organizationId, memberships.id],
    }).onDelete('cascade'),
    index('busy_blocks_expiry_idx').on(t.organizationId, t.endsAt),
  ]
)

/**
 * A time reserved on a Rep's calendar for a Prospect. `blocked_from`/`blocked_until` are the
 * Booking's time widened by its Booking Type's buffers. The migration adds an exclusion
 * constraint, `bookings_rep_no_overlap`, so no two `confirmed` Bookings of one Rep have
 * overlapping `[blocked_from, blocked_until)` ranges, even under races; `pending` and `cancelled`
 * Bookings hold no time. `idempotency_key_hash` (SHA-256 hex) makes a retried book find the first
 * Booking. Lists (keyset `(starts_at, id)`): a Rep's by `bookings_rep_idx`, the Organization's by
 * `bookings_list_idx`, a Prospect's by `bookings_prospect_idx`. A Booking Type in use cannot be
 * deleted (`bookings_booking_type_idx` serves the check).
 */
export const bookings = coreSchema.table(
  'bookings',
  {
    id: text('id').notNull(),
    organizationId: orgColumn(),
    bookingTypeId: text('booking_type_id').notNull(),
    membershipId: text('membership_id').notNull(),
    prospectId: text('prospect_id').notNull(),
    status: text('status', { enum: BOOKING_STATES }).notNull().default('pending'),
    mode: text('mode', { enum: BOOKING_MODES }).notNull(),
    origin: text('origin', { enum: BOOKING_ORIGINS }).notNull().default('member'),
    startsAt: ts('starts_at').notNull(),
    endsAt: ts('ends_at').notNull(),
    blockedFrom: ts('blocked_from').notNull(),
    blockedUntil: ts('blocked_until').notNull(),
    idempotencyKeyHash: text('idempotency_key_hash').notNull(),
    routingDecisionId: text('routing_decision_id'),
    calendarEventId: text('calendar_event_id'),
    joinUrl: text('join_url'),
    cancelledAt: ts('cancelled_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: 'bookings_pkey', columns: [t.organizationId, t.id] }),
    check('bookings_id_shape', idShape('id', 'bkg')),
    check('bookings_organization_id_shape', orgShape),
    check('bookings_organization_not_global', notGlobal),
    check('bookings_status_known', sql`${t.status} in (${list(BOOKING_STATES)})`),
    check('bookings_mode_known', sql`${t.mode} in (${list(BOOKING_MODES)})`),
    check('bookings_origin_known', sql`${t.origin} in (${list(BOOKING_ORIGINS)})`),
    check('bookings_ends_after_starts', sql`${t.endsAt} > ${t.startsAt}`),
    check(
      'bookings_blocked_covers_booking',
      sql`${t.blockedFrom} <= ${t.startsAt} and ${t.blockedUntil} >= ${t.endsAt}`
    ),
    check('bookings_idempotency_key_hash_shape', sql`${t.idempotencyKeyHash} ~ '^[0-9a-f]{64}$'`),
    check(
      'bookings_routing_decision_id_shape',
      sql`${t.routingDecisionId} is null or ${t.routingDecisionId} ~ '^rdc_[0-9a-f]{32}$'`
    ),
    check(
      'bookings_calendar_event_id_shape',
      sql`${t.calendarEventId} is null or char_length(${t.calendarEventId}) between 1 and 1024`
    ),
    check(
      'bookings_join_url_shape',
      sql`${t.joinUrl} is null or (char_length(${t.joinUrl}) <= 2048 and ${t.joinUrl} ~ '^https://')`
    ),
    check(
      'bookings_confirmed_has_event',
      sql`${t.status} <> 'confirmed' or ${t.calendarEventId} is not null`
    ),
    check(
      'bookings_cancelled_at_matches_status',
      sql`(${t.status} = 'cancelled') = (${t.cancelledAt} is not null)`
    ),
    foreignKey({
      name: 'bookings_booking_type_fk',
      columns: [t.organizationId, t.bookingTypeId],
      foreignColumns: [bookingTypes.organizationId, bookingTypes.id],
    }),
    foreignKey({
      name: 'bookings_membership_fk',
      columns: [t.organizationId, t.membershipId],
      foreignColumns: [memberships.organizationId, memberships.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'bookings_prospect_fk',
      columns: [t.organizationId, t.prospectId],
      foreignColumns: [prospects.organizationId, prospects.id],
    }).onDelete('cascade'),
    uniqueIndex('bookings_idempotency_key').on(t.organizationId, t.idempotencyKeyHash),
    index('bookings_rep_idx').on(t.organizationId, t.membershipId, t.startsAt, t.id),
    index('bookings_list_idx').on(t.organizationId, t.startsAt, t.id),
    index('bookings_prospect_idx').on(t.organizationId, t.prospectId, t.startsAt),
    index('bookings_booking_type_idx').on(t.organizationId, t.bookingTypeId),
  ]
)
