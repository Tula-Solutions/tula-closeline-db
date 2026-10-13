import { type SQL, sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { coreSchema } from './core'

/** The roles a membership can hold, most privileged first. Mirrors the contract's `ROLES`. */
export const MEMBERSHIP_ROLES = ['owner', 'admin', 'manager', 'rep'] as const
/** The Regions an Organization can be created in. Mirrors the contract's `REGIONS`. */
export const ORGANIZATION_REGIONS = ['us', 'eu'] as const
/** The states an Organization is in; `deleted` keeps the row for the retention window. */
export const ORGANIZATION_STATUSES = ['active', 'suspended', 'deleted'] as const
/** The states an invitation is in; "expired" is not stored, it is read from `expires_at`. */
export const INVITATION_STATES = ['pending', 'accepted', 'revoked'] as const

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

/**
 * An Organization (core.organizations). Its primary key is named `organization_id` so the one
 * canonical row-level-security policy applies to it unchanged. `region` is fixed at creation:
 * a trigger refuses any change (ADR 0001), and the service role holds no `UPDATE` on the column.
 * `owner_count` is kept by triggers on `memberships` and is what serialises changes to an
 * Organization's Owners, so no concurrent pair of transactions can remove the last two. The
 * service role cannot write it, and an insert always starts it at zero; a deferred trigger
 * refuses to commit an Organization that has no Owner.
 */
export const organizations = coreSchema.table(
  'organizations',
  {
    organizationId: text('organization_id').primaryKey(),
    name: text('name').notNull(),
    region: text('region', { enum: ORGANIZATION_REGIONS }).notNull(),
    status: text('status', { enum: ORGANIZATION_STATUSES }).notNull().default('active'),
    ownerCount: integer('owner_count').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('organizations_id_shape', idShape('organization_id', 'org')),
    check('organizations_name_shape', sql`char_length(btrim(${t.name})) between 1 and 200`),
    check('organizations_region_known', sql`${t.region} in (${list(ORGANIZATION_REGIONS)})`),
    check('organizations_status_known', sql`${t.status} in (${list(ORGANIZATION_STATUSES)})`),
    check('organizations_owner_count_not_negative', sql`${t.ownerCount} >= 0`),
  ]
)

/**
 * A user's membership of an Organization, with one role. `user_id` is an opaque `usr_` id from the
 * auth service: no foreign key crosses schemas. A user belongs to exactly one Organization; that
 * is enforced by `membership_directory_one_organization_per_user`, because a unique index on this
 * table cannot see rows hidden by row-level security.
 *
 * Lists served (keyset, `LIMIT` a page):
 * - Members of an Organization: `WHERE organization_id = $1 AND id > $cursor ORDER BY id`, on
 *   `memberships_organization_id_id_key`.
 * - One user's membership, for a role check: `memberships_organization_user_key`.
 */
export const memberships = coreSchema.table(
  'memberships',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    role: text('role', { enum: MEMBERSHIP_ROLES }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('memberships_id_shape', idShape('id', 'mem')),
    check('memberships_organization_id_shape', idShape('organization_id', 'org')),
    check('memberships_user_id_shape', idShape('user_id', 'usr')),
    check('memberships_role_known', sql`${t.role} in (${list(MEMBERSHIP_ROLES)})`),
    unique('memberships_organization_user_key').on(t.organizationId, t.userId),
    unique('memberships_organization_id_id_key').on(t.organizationId, t.id),
  ]
)

/**
 * A Team inside an Organization. Names are unique per Organization, ignoring case.
 *
 * Lists served:
 * - Teams of an Organization: `WHERE organization_id = $1 AND name_key > $cursor ORDER BY
 *   name_key`, on `teams_organization_name_key` (unique, so the key is the whole cursor).
 *   `lower()` itself cannot be an index condition under row-level security, hence the column.
 */
export const teams = coreSchema.table(
  'teams',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** `lower(name)`, stored so the list can order and page on a plain column. */
    nameKey: text('name_key').generatedAlwaysAs((): SQL => sql`lower(name)`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('teams_id_shape', idShape('id', 'team')),
    check('teams_organization_id_shape', idShape('organization_id', 'org')),
    check('teams_name_shape', sql`char_length(btrim(${t.name})) between 1 and 200`),
    unique('teams_organization_id_id_key').on(t.organizationId, t.id),
    unique('teams_organization_name_key').on(t.organizationId, t.nameKey),
  ]
)

/**
 * A membership's place in a Team. Both foreign keys carry `organization_id`, so a Team and a member
 * of different Organizations cannot be joined; Postgres checks foreign keys without applying
 * row-level security, which is why a plain id reference would not be enough.
 *
 * Lists served:
 * - Members of a Team: `WHERE organization_id = $1 AND team_id = $2 AND membership_id > $cursor
 *   ORDER BY membership_id`, on the primary key.
 * - Teams a membership is in: `WHERE organization_id = $1 AND membership_id = $2 AND team_id >
 *   $cursor ORDER BY team_id`, on `team_members_membership_idx` (which also serves the cascade
 *   when a membership is removed).
 */
export const teamMembers = coreSchema.table(
  'team_members',
  {
    organizationId: text('organization_id').notNull(),
    teamId: text('team_id').notNull(),
    membershipId: text('membership_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({
      name: 'team_members_pkey',
      columns: [t.organizationId, t.teamId, t.membershipId],
    }),
    check('team_members_organization_id_shape', idShape('organization_id', 'org')),
    foreignKey({
      name: 'team_members_team_fk',
      columns: [t.organizationId, t.teamId],
      foreignColumns: [teams.organizationId, teams.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'team_members_membership_fk',
      columns: [t.organizationId, t.membershipId],
      foreignColumns: [memberships.organizationId, memberships.id],
    }).onDelete('cascade'),
    index('team_members_membership_idx').on(t.organizationId, t.membershipId, t.teamId),
  ]
)

/**
 * An invitation to join an Organization. Only a hash of the token is stored (64 lowercase hex
 * characters, a SHA-256). One pending invitation per email per Organization; a re-invite revokes
 * the old one first (an expired invitation stays `pending` until then). `accepted` and `revoked`
 * are final. `invited_by_user_id` is an opaque `usr_` id, so it outlives the inviter's membership.
 * Deleting the Team clears `team_id` (the migration replaces the generated foreign key with
 * `ON DELETE SET NULL (team_id)`, which Drizzle cannot express).
 *
 * Lists served:
 * - Pending invitations of an Organization: `WHERE organization_id = $1 AND state = 'pending' AND
 *   (created_at, id) > ($c, $i) ORDER BY created_at, id`, on `invitations_pending_list_idx`.
 */
export const invitations = coreSchema.table(
  'invitations',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role', { enum: MEMBERSHIP_ROLES }).notNull(),
    teamId: text('team_id'),
    invitedByUserId: text('invited_by_user_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    state: text('state', { enum: INVITATION_STATES }).notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('invitations_id_shape', idShape('id', 'inv')),
    check('invitations_organization_id_shape', idShape('organization_id', 'org')),
    check('invitations_invited_by_shape', idShape('invited_by_user_id', 'usr')),
    check(
      'invitations_team_id_shape',
      sql`${t.teamId} is null or "team_id" ~ '^team_[0-9a-f]{32}$'`
    ),
    check(
      'invitations_email_shape',
      sql`${t.email} = lower(btrim(${t.email})) and char_length(${t.email}) between 3 and 320 and position('@' in ${t.email}) > 1`
    ),
    check('invitations_role_known', sql`${t.role} in (${list(MEMBERSHIP_ROLES)})`),
    check('invitations_state_known', sql`${t.state} in (${list(INVITATION_STATES)})`),
    check('invitations_token_hash_shape', sql`${t.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check('invitations_expiry_after_creation', sql`${t.expiresAt} > ${t.createdAt}`),
    check(
      'invitations_state_shape',
      sql`(${t.state} = 'pending' and ${t.acceptedAt} is null and ${t.revokedAt} is null)
        or (${t.state} = 'accepted' and ${t.acceptedAt} is not null and ${t.revokedAt} is null)
        or (${t.state} = 'revoked' and ${t.revokedAt} is not null and ${t.acceptedAt} is null)`
    ),
    unique('invitations_organization_id_id_key').on(t.organizationId, t.id),
    unique('invitations_token_hash_key').on(t.tokenHash),
    foreignKey({
      name: 'invitations_team_fk',
      columns: [t.organizationId, t.teamId],
      foreignColumns: [teams.organizationId, teams.id],
    }),
    uniqueIndex('invitations_pending_email_key')
      .on(t.organizationId, t.email)
      .where(sql`${t.state} = 'pending'`),
    index('invitations_pending_list_idx')
      .on(t.organizationId, t.createdAt, t.id)
      .where(sql`${t.state} = 'pending'`),
    index('invitations_team_idx')
      .on(t.organizationId, t.teamId)
      .where(sql`${t.teamId} is not null`),
  ]
)

/**
 * Which Organization a user belongs to, readable before the Organization is known (asked at
 * sign-in). It holds the mapping and nothing else, is not under row-level security, and is
 * written only by the `SECURITY DEFINER` triggers on `memberships`: the service role can only
 * `SELECT`. A user belongs to exactly one Organization, enforced by the unique constraint on
 * `user_id`. To allow several, one migration drops
 * `membership_directory_one_organization_per_user`; nothing else changes.
 */
export const membershipDirectory = coreSchema.table(
  'membership_directory',
  {
    userId: text('user_id').notNull(),
    organizationId: text('organization_id').notNull(),
  },
  (t) => [
    primaryKey({ name: 'membership_directory_pkey', columns: [t.userId, t.organizationId] }),
    check('membership_directory_user_id_shape', idShape('user_id', 'usr')),
    check('membership_directory_organization_id_shape', idShape('organization_id', 'org')),
    unique('membership_directory_one_organization_per_user').on(t.userId),
  ]
)

/**
 * Which Organization and invitation a token hash belongs to, readable before the Organization is
 * known (asked when accepting). Mapping only, not under row-level security, written only by the
 * `SECURITY DEFINER` triggers on `invitations`; the service role can only `SELECT`.
 */
export const invitationDirectory = coreSchema.table(
  'invitation_directory',
  {
    tokenHash: text('token_hash').primaryKey(),
    organizationId: text('organization_id').notNull(),
    invitationId: text('invitation_id').notNull(),
  },
  () => [
    check('invitation_directory_token_hash_shape', sql`"token_hash" ~ '^[0-9a-f]{64}$'`),
    check('invitation_directory_organization_id_shape', idShape('organization_id', 'org')),
    check('invitation_directory_invitation_id_shape', idShape('invitation_id', 'inv')),
  ]
)
