import { type SQL, sql } from 'drizzle-orm'
import {
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
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { coreSchema } from './core'

/** The roles a membership can hold, most privileged first. Mirrors the contract's `ROLES`. */
export const MEMBERSHIP_ROLES = ['owner', 'admin', 'manager', 'rep'] as const
/** The roles an invitation can offer: ownership passes by promotion, never by invitation. */
export const INVITATION_ROLES = ['admin', 'manager', 'rep'] as const
/** The Regions an Organization can be created in. Mirrors the contract's `REGIONS`. */
export const ORGANIZATION_REGIONS = ['us', 'eu'] as const
/** The states an Organization is in; `deleted` keeps the row for the retention window. */
export const ORGANIZATION_STATUSES = ['active', 'suspended', 'deleted'] as const
/** The states an invitation is in; "expired" is not stored, it is read from `expires_at`. */
export const INVITATION_STATES = ['pending', 'accepted', 'revoked'] as const

/**
 * The longest member name, in characters after trimming spaces. Mirrors the contract's
 * `MAX_PERSON_NAME_LENGTH`: auth's optional first and last names joined by one space, one more
 * than the 200 of an Organization or Team name.
 */
export const MEMBER_NAME_MAX = 201

/** The longest route name of an idempotency key, in characters. */
export const IDEMPOTENCY_ROUTE_MAX = 64
/** The longest client-supplied idempotency key, in characters (printable ASCII only). */
export const IDEMPOTENCY_KEY_MAX = 255
/** The length of an idempotency key's request hash, in bytes: a SHA-256 of the request body. */
export const IDEMPOTENCY_HASH_BYTES = 32
/** The largest stored response of an idempotency key, in bytes of its text form (`response::text`). */
export const IDEMPOTENCY_RESPONSE_MAX_BYTES = 16_384

// A `bytea` column read and written as bytes, whichever driver is underneath.
const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
})

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
 * refuses to commit an Organization that has no Owner. The last-Owner rule holds while the
 * Organization is `active` or `suspended`; a `deleted` Organization (kept for retention) may have
 * every membership removed, the last Owner included, so a retention job can empty it and free its
 * users to join another Organization. An emptied Organization cannot be made `active` or
 * `suspended` again.
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
 * `email` and `name` are core's copy of the member's profile (ADR 0015); auth stays the source of
 * truth and sends both at sign-up and when they change. `email` follows the invitations rule
 * (folded ASCII, one `@`, printable ASCII, 3 to 320 characters) and is required, so a membership
 * without one cannot exist. `name` is null for a person with no name, else 1 to
 * {@link MEMBER_NAME_MAX} characters after trimming surrounding spaces (auth sends the optional
 * first and last names joined by one space). Both are covered by the existing row-level security
 * policy and table-wide grants; there is no per-column grant on this table.
 *
 * Lists served (keyset, `LIMIT` a page):
 * - Members of an Organization: `WHERE organization_id = $1 AND id > $cursor ORDER BY id`, on
 *   `memberships_organization_id_id_key`.
 * - One user's membership, for a role check: `memberships_organization_user_key`.
 *
 * - Is this address already a member, for an invitation: `WHERE organization_id = $1 AND email =
 *   $2`, on `memberships_organization_email_idx`.
 *
 * Index decision: `memberships_organization_email_idx` is plain, not unique: auth owns the address,
 * and a stale copy must not make a later change fail. There is none on `name`: nothing searches or
 * sorts by it. The database's name rule is the looser bound (it trims spaces only and does not
 * reject control characters); core stores only the contract's trimmed output.
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
    email: text('email').notNull(),
    name: text('name'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('memberships_id_shape', idShape('id', 'mem')),
    check('memberships_organization_id_shape', idShape('organization_id', 'org')),
    check('memberships_user_id_shape', idShape('user_id', 'usr')),
    check('memberships_role_known', sql`${t.role} in (${list(MEMBERSHIP_ROLES)})`),
    // The same rule as `invitations_email_shape`, written out again; a test keeps the two equal.
    check(
      'memberships_email_shape',
      sql`${t.email} = lower(${t.email} collate "C")
        and char_length(${t.email}) between 3 and 320
        and char_length(${t.email}) - char_length(replace(${t.email}, '@', '')) = 1
        and position('@' in ${t.email}) between 2 and char_length(${t.email}) - 1
        and ${t.email} collate "C" !~ '[[:space:][:cntrl:]]'
        and ${t.email} collate "C" ~ '^[!-~]+$'`
    ),
    check(
      'memberships_name_shape',
      sql`${t.name} is null or char_length(btrim(${t.name})) between 1 and ${sql.raw(String(MEMBER_NAME_MAX))}`
    ),
    unique('memberships_organization_user_key').on(t.organizationId, t.userId),
    unique('memberships_organization_id_id_key').on(t.organizationId, t.id),
    index('memberships_organization_email_idx').on(t.organizationId, t.email),
    // Serves the members list filter `q` (`name ilike '%text%'`) through core.search_membership_ids; see 0029 and 0037.
    index('memberships_name_trgm_idx').using('gin', t.name.op('gin_trgm_ops')),
  ]
)

/**
 * A Team inside an Organization. Names are unique per Organization, ignoring case.
 *
 * Lists served:
 * - Teams of an Organization: `WHERE organization_id = $1 AND name_key > $cursor ORDER BY
 *   name_key`, on `teams_organization_name_key` (unique, so the key is the whole cursor).
 *   `lower()` itself cannot be an index condition under row-level security, hence the column.
 *
 * `name_key` folds ASCII letters only, with the explicit `"C"` collation, so it is the same on
 * every cluster whatever its locale; "É" and "é" are different names. The service must fold the
 * same way (`name.replace(/[A-Z]/g, ...)`, not `toLowerCase()`) wherever it compares names.
 */
export const teams = coreSchema.table(
  'teams',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** `lower(name)` in the `"C"` collation (ASCII only), stored so the list can page on a column. */
    nameKey: text('name_key').generatedAlwaysAs((): SQL => sql`lower(name collate "C")`),
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
 * are final: no statement that sets the state, its timestamps, the `id` or the `token_hash` on such
 * a row is accepted, so an invitation cannot be accepted twice and a used hash cannot be moved off
 * its row and issued again. The database refuses to accept an invitation after `expires_at` (the
 * instant itself is expired) or while its Organization is not `active`. The role is never `owner`
 * (ownership passes by promotion). The email is stored folded with the ASCII-only rule below and
 * is printable ASCII only (no space, control or non-ASCII character) with exactly one `@`; an
 * internationalised domain is stored in its ASCII (A-label) form, converted by the service before
 * it writes. The service folds with the same rule and validates the whole address at the edge.
 * `invited_by_user_id` is an opaque `usr_` id, so it
 * outlives the inviter's membership. Deleting the Team clears `team_id` (the migration replaces
 * the generated foreign key with `ON DELETE SET NULL (team_id)`, which Drizzle cannot express).
 * The service role cannot `DELETE` an invitation: it is revoked, and only deleting its
 * Organization removes it. Accepting an invitation and creating its membership is one
 * transaction in the service.
 *
 * Lists served:
 * - Pending invitations of an Organization: `WHERE organization_id = $1 AND state = 'pending' AND
 *   (created_at, id) > ($c, $i) ORDER BY created_at, id`, on `invitations_pending_list_idx`.
 * - Invitations of an Organization in any one state, newest first: `WHERE organization_id = $1 AND
 *   state = $2 AND (created_at, id) < ($c, $i) ORDER BY created_at DESC, id DESC LIMIT n`, on
 *   `invitations_state_list_idx` (read backwards, so no sort).
 * - How many invitations an Organization created since a time, revoked ones included, capped with a
 *   `LIMIT`: `WHERE organization_id = $1 AND state IN (...) AND created_at > $t`, on the same index.
 *   (`state` is in the index, so the count lists the three states; it is bounded by the cap.)
 */
export const invitations = coreSchema.table(
  'invitations',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role', { enum: INVITATION_ROLES }).notNull(),
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
    // ASCII-only folding in the explicit "C" collation, so the stored form does not depend on the
    // cluster's locale. Exactly one "@", neither first nor last, and printable ASCII throughout
    // (`[!-~]`: no space, control or non-ASCII character, so no zero-width, no-break or
    // direction-override character and no fullwidth "@"). The "C" collation makes the range a
    // range of code points. This is a backstop, not an address parser.
    check(
      'invitations_email_shape',
      sql`${t.email} = lower(${t.email} collate "C")
        and char_length(${t.email}) between 3 and 320
        and char_length(${t.email}) - char_length(replace(${t.email}, '@', '')) = 1
        and position('@' in ${t.email}) between 2 and char_length(${t.email}) - 1
        and ${t.email} collate "C" !~ '[[:space:][:cntrl:]]'
        and ${t.email} collate "C" ~ '^[!-~]+$'`
    ),
    check('invitations_role_known', sql`${t.role} in (${list(MEMBERSHIP_ROLES)})`),
    check('invitations_role_not_owner', sql`${t.role} <> 'owner'`),
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
    index('invitations_state_list_idx').on(t.organizationId, t.state, t.createdAt, t.id),
    index('invitations_team_idx')
      .on(t.organizationId, t.teamId)
      .where(sql`${t.teamId} is not null`),
  ]
)

/**
 * Which Organization a user belongs to: the one fact sign-in asks before any Organization is
 * known. It is not under row-level security and no service role holds any privilege on it:
 * `closeline_core` reaches it only through the `SECURITY DEFINER` function
 * `core.organization_of_user(user_id)` (`organizationOfUser`), one row for one exact key, which
 * joins {@link organizationState} for the status. The `SECURITY DEFINER` triggers on `memberships`
 * write it, and it holds no status of its own, so a status change never touches it. A user belongs
 * to exactly one Organization, enforced by the unique constraint on `user_id`. To allow several,
 * one migration drops `membership_directory_one_organization_per_user` and replaces the function.
 * It has no index on `organization_id` alone: nothing reads it by Organization, and with one a plan
 * cached for the delete by key could scan every member of the Organization per row.
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
 * Which Organization and invitation a token hash opens, for the pending invitations only: a row
 * leaves when its invitation is accepted or revoked. It carries `expires_at` so that
 * `core.invitation_for_token(token_hash)` (`invitationForToken`) can answer, for one exact key,
 * only when the invitation is pending and unexpired (and, by joining {@link organizationState},
 * in an `active` Organization), without reading a tenant table. Not under row-level security; no
 * service role holds any privilege on it. The `SECURITY DEFINER` triggers on `invitations` keep
 * it, and a status change never touches it. It has no index on `organization_id` alone: nothing
 * reads it by Organization, and such an index is one a cached plan could pick for a delete by key.
 */
export const invitationDirectory = coreSchema.table(
  'invitation_directory',
  {
    tokenHash: text('token_hash').primaryKey(),
    organizationId: text('organization_id').notNull(),
    invitationId: text('invitation_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  () => [
    check('invitation_directory_token_hash_shape', sql`"token_hash" ~ '^[0-9a-f]{64}$'`),
    check('invitation_directory_organization_id_shape', idShape('organization_id', 'org')),
    check('invitation_directory_invitation_id_shape', idShape('invitation_id', 'inv')),
  ]
)

/**
 * An Organization's status, one row per Organization, so a status change writes one row however
 * many members and invitations the Organization has. Sign-in and accepting an invitation ask the
 * status before any Organization is known, so it cannot sit behind row-level security: it is a
 * second no-access table (see {@link membershipDirectory}), joined by `core.organization_of_user`
 * and `core.invitation_for_token`, and no service role holds any privilege on it. A trigger on
 * `organizations` writes it in the same transaction as the Organization's own row (an insert
 * creates it, a change of `status` updates it, and deleting the Organization cascades). It is
 * written nowhere else and holds nothing a lookup can use without an exact key from another table.
 */
export const organizationState = coreSchema.table(
  'organization_state',
  {
    organizationId: text('organization_id')
      .primaryKey()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    status: text('status', { enum: ORGANIZATION_STATUSES }).notNull(),
  },
  (t) => [
    check('organization_state_organization_id_shape', idShape('organization_id', 'org')),
    check('organization_state_status_known', sql`${t.status} in (${list(ORGANIZATION_STATUSES)})`),
  ]
)

/**
 * The outcome of one public `POST`, kept so a retry with the same `Idempotency-Key` gets the same
 * answer instead of doing the work twice. One row per `(organization_id, user_id, route, key)`: the
 * key is the primary key in that order, so another Organization, user or route can reuse the same
 * client key. The service inserts the row in flight (`status` and `response` both null), does its
 * write and completes the row in the same transaction, so an in-flight row is never committed and a
 * killed request strands no key; nothing recovers an in-flight row that was committed on its own.
 *
 * - `route` is a short route name such as `invitations.create` (1 to 64 of `a-z`, `0-9`, `.`, `_`).
 * - `key` is the client's key: 1 to 255 printable ASCII characters (`!` to `~`, no space).
 * - `request_hash` is the SHA-256 (32 bytes) of the request body, so the same key sent with a
 *   different body is told apart from a retry. The body itself is never stored.
 * - `status` is the HTTP status of the stored response (100 to 599), null while in flight.
 * - `response` is the stored body, null exactly when `status` is null, and at most 16384
 *   bytes of its text form (`octet_length(response::text)`), so no one row can be made large.
 *
 * A row is completed once: a trigger refuses any update of a completed row, and any change to the
 * Organization, user, route, key, hash or creation time of a row, in flight or not, so no `UPDATE`
 * can replace a stored answer. (A `DELETE` followed by an `INSERT` by the core role can, which the
 * purge relies on.) Complete with `UPDATE ... WHERE <key> AND status IS NULL` and treat zero rows
 * as already completed. Rows are only removed by the purge or with their Organization. The service role has the schema's
 * default `SELECT`, `INSERT`, `UPDATE` and `DELETE`, and no other service role can reach it.
 *
 * Lists served:
 * - The lookup of one key: the primary key.
 * - The purge, per Organization and in batches: `DELETE ... WHERE ctid = ANY (ARRAY(SELECT ctid
 *   FROM core.idempotency_keys WHERE organization_id = $1 AND created_at < $2 ORDER BY created_at
 *   LIMIT $n))`, inside the Organization's scope, on `idempotency_keys_purge_idx` (no sort, and no
 *   cross-tenant function). Repeat until a batch removes none: a short batch does not mean the
 *   backlog is empty, because a row another session is completing is skipped and goes with the next
 *   batch. The `ctid` form assumes the table is not partitioned.
 */
export const idempotencyKeys = coreSchema.table(
  'idempotency_keys',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    route: text('route').notNull(),
    key: text('key').notNull(),
    requestHash: bytes('request_hash').notNull(),
    status: smallint('status'),
    response: jsonb('response').$type<unknown>(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({
      name: 'idempotency_keys_pkey',
      columns: [t.organizationId, t.userId, t.route, t.key],
    }),
    check('idempotency_keys_organization_id_shape', idShape('organization_id', 'org')),
    check('idempotency_keys_user_id_shape', idShape('user_id', 'usr')),
    // `collate "C"` makes the character classes a range of code points whatever the cluster's locale.
    check(
      'idempotency_keys_route_shape',
      sql`char_length(${t.route}) between 1 and ${sql.raw(String(IDEMPOTENCY_ROUTE_MAX))}
        and ${t.route} collate "C" ~ '^[a-z0-9._]+$'`
    ),
    check(
      'idempotency_keys_key_shape',
      sql`char_length(${t.key}) between 1 and ${sql.raw(String(IDEMPOTENCY_KEY_MAX))}
        and ${t.key} collate "C" ~ '^[!-~]+$'`
    ),
    check(
      'idempotency_keys_request_hash_length',
      sql`octet_length(${t.requestHash}) = ${sql.raw(String(IDEMPOTENCY_HASH_BYTES))}`
    ),
    check('idempotency_keys_status_range', sql`${t.status} between 100 and 599`),
    check(
      'idempotency_keys_response_matches_status',
      sql`(${t.status} is null) = (${t.response} is null)`
    ),
    check(
      'idempotency_keys_response_size',
      sql`octet_length(${t.response}::text) <= ${sql.raw(String(IDEMPOTENCY_RESPONSE_MAX_BYTES))}`
    ),
    index('idempotency_keys_purge_idx').on(t.organizationId, t.createdAt),
  ]
)
