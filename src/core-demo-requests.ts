import { sql } from 'drizzle-orm'
import type { Database } from './client'
import type { DEMO_NOTIFICATION_STATUSES } from './schema'

const DEMO_REQUEST_ID = /^dreq_[0-9a-f]{32}$/

/** The most notices one claim returns; the database caps a larger limit to this. */
export const DEMO_NOTICE_CLAIM_MAX = 100
/** The most Demo Requests one purge deletes; the database caps a larger limit to this. */
export const DEMO_PURGE_BATCH_MAX = 1000

/** What a Visitor submitted, as `core.submit_demo_request` takes it; the service has validated it. */
export interface DemoRequestInput {
  /** The new id: `dreq_` and 32 lowercase hex characters. */
  id: string
  /** The Visitor's name. */
  name: string
  /** The work email, already lower-cased. */
  workEmail: string
  /** The Visitor's company name. */
  companyName: string
  /** An optional message. */
  message: string | null
  /** The page the form was on, starting with `/`. */
  sourcePage: string
  /** The Visitor's idempotency key, 16 to 128 characters. */
  idempotencyKey: string
}

/** The answer of `core.submit_demo_request`. */
export interface DemoRequestSubmission {
  /** The id of the stored Demo Request: the submitted one, or the first one with this key. */
  id: string
  /** True when the idempotency key had been used before, so nothing new was stored. */
  replayed: boolean
  /** False when the key was reused with different fields; always true for a first submission. */
  sameFields: boolean
}

/** A Demo Request whose notice a worker has claimed, as `core.claim_demo_notices` returns it. */
export interface ClaimedDemoNotice {
  /** The Demo Request id. */
  id: string
  /** The Visitor's name. */
  name: string
  /** The work email. */
  workEmail: string
  /** The company name. */
  companyName: string
  /** The message, if any. */
  message: string | null
  /** The page the form was on. */
  sourcePage: string
  /** When it was submitted. */
  submittedAt: Date
  /** The attempt this claim made, counting it (1 on the first). */
  attempts: number
}

/** The state a notice settles in. */
export type SettledDemoNoticeStatus = Exclude<
  (typeof DEMO_NOTIFICATION_STATUSES)[number],
  'pending'
>

interface SubmissionRow extends Record<string, unknown> {
  demo_request_id: string
  replayed: boolean
  same_fields: boolean
}

interface ClaimRow extends Record<string, unknown> {
  demo_request_id: string
  name: string
  work_email: string
  company_name: string
  message: string | null
  source_page: string
  submitted_at: Date | string
  attempts: number
}

/**
 * The database refused a Demo Request. It keeps only the SQLSTATE `code` and the `constraint`
 * name: the driver's own error holds the submitted name, email and message in its text, so it is
 * deliberately not kept as a `cause`.
 */
export class DemoRequestRefusedError extends Error {
  /** The Postgres SQLSTATE, such as `23514` for a failed check, when the driver gave one. */
  readonly code: string | undefined
  /** The constraint that refused the row, when the driver named one. */
  readonly constraint: string | undefined

  /** Build the error from whatever the driver threw, copying only the code and constraint. */
  constructor(thrown: unknown) {
    super('submitDemoRequest: the database refused the Demo Request')
    this.name = 'DemoRequestRefusedError'
    const source = (thrown as { cause?: unknown } | null)?.cause ?? thrown
    const fields = (typeof source === 'object' && source !== null ? source : {}) as {
      code?: unknown
      constraint?: unknown
    }
    this.code = typeof fields.code === 'string' ? fields.code : undefined
    this.constraint = typeof fields.constraint === 'string' ? fields.constraint : undefined
  }
}

function assertLimit(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 2_147_483_647) {
    throw new Error(`${name}: limit must be a positive integer`)
  }
}

/**
 * Store a Demo Request, or find the one already stored under the same idempotency key. It calls
 * `core.submit_demo_request`, the only way `closeline_core` writes `core.demo_request`. Run it on
 * the pooled handle: the table has no Organization.
 *
 * @param db - A database handle connected as `closeline_core`.
 * @param input - The validated submission.
 * @returns The stored id, whether the key was a replay, and whether the fields matched the stored ones.
 * @throws If `input.id` is malformed (before any query runs); {@link DemoRequestRefusedError} (code and
 * constraint only, never the submitted values) if the database refuses a field.
 */
export async function submitDemoRequest(
  db: Pick<Database, 'execute'>,
  input: DemoRequestInput
): Promise<DemoRequestSubmission> {
  if (!DEMO_REQUEST_ID.test(input.id)) {
    throw new Error('submitDemoRequest: invalid id')
  }
  let rows: SubmissionRow[]
  try {
    ;({ rows } = await db.execute<SubmissionRow>(
      sql`select demo_request_id, replayed, same_fields from core.submit_demo_request(
      ${input.id}, ${input.name}, ${input.workEmail}, ${input.companyName}, ${input.message},
      ${input.sourcePage}, ${input.idempotencyKey})`
    ))
  } catch (error) {
    throw new DemoRequestRefusedError(error)
  }
  const row = rows[0]
  if (!row) {
    throw new Error('submitDemoRequest: the database returned no row')
  }
  return { id: row.demo_request_id, replayed: row.replayed, sameFields: row.same_fields }
}

/**
 * Claim a batch of pending notices to send: oldest first, none tried in the last `backoffSeconds`,
 * each counted as an attempt. Delivery is at least once: a worker that dies after a claim is retried
 * once the backoff passes, so the caller caps attempts itself (settle `failed` past its limit). Two concurrent claims never return the same row. It calls
 * `core.claim_demo_notices`.
 *
 * @param db - A database handle connected as `closeline_core`.
 * @param limit - The most to claim, at least 1; the database caps it at {@link DEMO_NOTICE_CLAIM_MAX}.
 * @param backoffSeconds - A row last tried less than this many seconds ago is skipped (0 or more).
 * @returns The claimed notices, oldest first (to the millisecond; ties by id).
 * @throws If a number is not a whole number in range (before any query runs).
 */
export async function claimDemoNotices(
  db: Pick<Database, 'execute'>,
  limit: number,
  backoffSeconds: number
): Promise<ClaimedDemoNotice[]> {
  assertLimit('claimDemoNotices', limit)
  if (!Number.isInteger(backoffSeconds) || backoffSeconds < 0 || backoffSeconds > 2_147_483_647) {
    throw new Error('claimDemoNotices: backoff must be a non-negative integer')
  }
  const { rows } = await db.execute<ClaimRow>(
    sql`select * from core.claim_demo_notices(${limit}, ${backoffSeconds})`
  )
  return rows
    .map((row) => ({
      id: row.demo_request_id,
      name: row.name,
      workEmail: row.work_email,
      companyName: row.company_name,
      message: row.message,
      sourcePage: row.source_page,
      submittedAt: new Date(row.submitted_at),
      attempts: row.attempts,
    }))
    .sort(
      (a, b) =>
        a.submittedAt.getTime() - b.submittedAt.getTime() ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    )
}

/**
 * Settle a pending notice as `sent` or `failed`. It calls `core.settle_demo_notice`.
 *
 * @param db - A database handle connected as `closeline_core`.
 * @param id - The Demo Request id.
 * @param status - `sent` or `failed`.
 * @returns True when the notice was pending and is now settled; false when unknown or already settled.
 * @throws If `id` or `status` is malformed (before any query runs).
 */
export async function settleDemoNotice(
  db: Pick<Database, 'execute'>,
  id: string,
  status: SettledDemoNoticeStatus
): Promise<boolean> {
  if (!DEMO_REQUEST_ID.test(id)) {
    throw new Error('settleDemoNotice: invalid id')
  }
  if (status !== 'sent' && status !== 'failed') {
    throw new Error('settleDemoNotice: status must be sent or failed')
  }
  const { rows } = await db.execute<{ settled: boolean }>(
    sql`select core.settle_demo_notice(${id}, ${status}) as settled`
  )
  return rows[0]?.settled === true
}

/**
 * Delete Demo Requests submitted more than twelve months ago, oldest first, in one bounded batch.
 * Repeat until it returns less than `limit`. It calls `core.purge_demo_requests`.
 *
 * @param db - A database handle connected as `closeline_core`.
 * @param limit - The most to delete, at least 1; the database caps it at {@link DEMO_PURGE_BATCH_MAX}.
 * @returns How many were deleted.
 * @throws If `limit` is not a positive whole number (before any query runs).
 */
export async function purgeDemoRequests(
  db: Pick<Database, 'execute'>,
  limit: number
): Promise<number> {
  assertLimit('purgeDemoRequests', limit)
  const { rows } = await db.execute<{ purged: number }>(
    sql`select core.purge_demo_requests(${limit}) as purged`
  )
  return Number(rows[0]?.purged ?? 0)
}
