import { sql } from 'drizzle-orm'
import type { Database } from './client'

const E164 = /^\+[1-9][0-9]{6,14}$/

/** The Line a dialled number reaches, as `voice.line_for_number` answers. */
export interface LineForNumber {
  /** The Organization that owns the Line (`org_` and 32 hex characters). */
  organizationId: string
  /** The Line to read, inside that Organization's scope (`line_` and 32 hex characters). */
  lineId: string
}

interface LineRow extends Record<string, unknown> {
  organization_id: string
  line_id: string
}

/**
 * Find the Line a dialled number reaches: the question the inbound webhook asks before any
 * Organization is known. It calls `voice.line_for_number`, the only way `closeline_voice` reaches
 * the line directory. The database answers only for an `active` Line of an `active` Organization,
 * so an unknown number, a Line still porting or released, and a Line of a suspended or deleted
 * Organization all give `null` and cannot be told apart. A malformed number also gives `null`
 * without a query, since it comes from a webhook. Then read the Line, and record the Call, inside
 * `withOrganization`.
 *
 * @param db - A database handle connected as `closeline_voice`.
 * @param number - The dialled number in E.164 (`+` and 7 to 15 digits).
 * @returns The Organization and Line ids, or `null`.
 */
export async function lineForNumber(
  db: Pick<Database, 'execute'>,
  number: string
): Promise<LineForNumber | null> {
  if (!E164.test(number)) {
    return null
  }
  const { rows } = await db.execute<LineRow>(
    sql`select organization_id, line_id from voice.line_for_number(${number})`
  )
  const row = rows[0]
  return row ? { organizationId: row.organization_id, lineId: row.line_id } : null
}
