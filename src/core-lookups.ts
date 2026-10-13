import { sql } from 'drizzle-orm'
import type { Database } from './client'
import type { ORGANIZATION_STATUSES } from './schema'

const USER_ID = /^usr_[0-9a-f]{32}$/
const TOKEN_HASH = /^[0-9a-f]{64}$/

/** The state an Organization is in, as `core.organizations.status` stores it. */
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number]

/** The Organization a user belongs to, as `core.organization_of_user` answers. */
export interface OrganizationOfUser {
  /** The Organization the user belongs to (`org_` and 32 hex characters). */
  organizationId: string
  /** The Organization's status; a sign-in refuses everything but `active`. */
  status: OrganizationStatus
}

/** The pending invitation a token hash opens, as `core.invitation_for_token` answers. */
export interface InvitationForToken {
  /** The Organization that issued the invitation. */
  organizationId: string
  /** The invitation to read, inside that Organization's scope. */
  invitationId: string
}

interface OrganizationRow extends Record<string, unknown> {
  organization_id: string
  status: OrganizationStatus
}

interface InvitationRow extends Record<string, unknown> {
  organization_id: string
  invitation_id: string
}

/**
 * Find the Organization a user belongs to: the question sign-in asks before any Organization is
 * known. It calls `core.organization_of_user`, the only way `closeline_core` reaches the
 * membership directory. Run it on the pooled handle, not inside `withOrganization`; then read the
 * membership itself inside `withOrganization` for the Organization it names.
 *
 * @param db - A database handle connected as `closeline_core`.
 * @param userId - The user's opaque id: `usr_` and 32 lowercase hex characters.
 * @returns The Organization and its status, or `null` when the user belongs to none.
 * @throws If `userId` is malformed (before any query runs), or if the directory holds more than
 *   one Organization for the user (the one-Organization rule was relaxed without updating this).
 */
export async function organizationOfUser(
  db: Pick<Database, 'execute'>,
  userId: string
): Promise<OrganizationOfUser | null> {
  if (!USER_ID.test(userId)) {
    throw new Error('organizationOfUser: invalid user id')
  }
  const { rows } = await db.execute<OrganizationRow>(
    sql`select organization_id, status from core.organization_of_user(${userId})`
  )
  if (rows.length > 1) {
    throw new Error('organizationOfUser: more than one Organization for a user')
  }
  const row = rows[0]
  return row ? { organizationId: row.organization_id, status: row.status } : null
}

/**
 * Find the invitation a token hash opens: the question accepting an invitation asks before any
 * Organization is known. It calls `core.invitation_for_token`, the only way `closeline_core`
 * reaches the invitation directory. The database answers only for an invitation that is still
 * pending and unexpired in an `active` Organization, so a used, revoked or expired token, an
 * unknown one and one of a suspended or deleted Organization all give `null` and cannot be told
 * apart. Then accept inside `withOrganization`: update the invitation and create the membership
 * in one transaction.
 *
 * @param db - A database handle connected as `closeline_core`.
 * @param tokenHash - The SHA-256 of the token: 64 lowercase hex characters, never the token.
 * @returns The Organization and invitation ids, or `null`.
 * @throws If `tokenHash` is malformed (before any query runs).
 */
export async function invitationForToken(
  db: Pick<Database, 'execute'>,
  tokenHash: string
): Promise<InvitationForToken | null> {
  if (!TOKEN_HASH.test(tokenHash)) {
    throw new Error('invitationForToken: invalid token hash')
  }
  const { rows } = await db.execute<InvitationRow>(
    sql`select organization_id, invitation_id from core.invitation_for_token(${tokenHash})`
  )
  const row = rows[0]
  return row ? { organizationId: row.organization_id, invitationId: row.invitation_id } : null
}
