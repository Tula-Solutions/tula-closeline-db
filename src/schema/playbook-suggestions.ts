import { sql } from 'drizzle-orm'
import {
  check,
  customType,
  index,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { playbookSchema } from './playbook'
import { GLOBAL_SCOPE_ORGANIZATION_ID } from './playbook-tables'

/*
 * Milestone 15 (`docs/specs/m15-analytics-assessments-learning.md` in the hub). The values below
 * mirror the contract at its `develop` (`src/playbook/suggestion.ts`); this library does not
 * depend on the contract, so each names what it copies and `playbook-suggestions.test.ts` pins it.
 */

/** What a Suggestion proposes to add. Mirrors the contract's `SUGGESTION_KINDS`. */
export const SUGGESTION_KINDS = ['objection_answer', 'discovery_question', 'closing_move'] as const
/** Where a Suggestion is. Mirrors the contract's `SUGGESTION_STATUSES`. */
export const SUGGESTION_STATUSES = ['pending', 'accepted', 'rejected'] as const
/** The longest Suggestion text. Mirrors the contract's `MAX_SUGGESTION_TEXT_LENGTH`. */
export const MAX_SUGGESTION_TEXT_LENGTH = 1000
/** The most Moments one Suggestion cites. Mirrors the contract's `MAX_SUGGESTION_MOMENTS`. */
export const MAX_SUGGESTION_MOMENTS = 10
/** The byte length of a Suggestion's fingerprint: a SHA-256 digest. */
export const SUGGESTION_FINGERPRINT_BYTES = 32

const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
})
const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID}'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })

/**
 * A proposed Playbook addition derived from a won Deal (spec M15). It influences no Agent and is
 * not searched until an Admin accepts it (`status = 'accepted'`); a rejected one is kept so it is
 * not proposed again: `fingerprint` (a digest of the kind and normalised text) is unique per
 * Organization (`suggestions_fingerprint_key`), so a second proposal of the same text is refused
 * whatever its state. Provenance is the won Deal (`deal_record_id`, an opaque id) and the Moments
 * it cites (`moments`, at most 10 references as the contract's Citation references: Call id, Deal
 * id and Moment number). The text comes from the Deal's Calls, so it is untrusted data. A decision
 * is the time and the Membership that made it, both set exactly when the Suggestion is not pending.
 *
 * Lists (keyset `(created_at, id)`, newest first): all (`suggestions_list_idx`), one status
 * (`suggestions_status_list_idx`).
 */
export const suggestions = playbookSchema.table(
  'suggestions',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    kind: text('kind', { enum: SUGGESTION_KINDS }).notNull(),
    status: text('status', { enum: SUGGESTION_STATUSES }).notNull().default('pending'),
    text: text('text').notNull(),
    fingerprint: bytes('fingerprint').notNull(),
    dealRecordId: text('deal_record_id').notNull(),
    moments: jsonb('moments').notNull().default(sql`'[]'::jsonb`),
    createdAt: ts('created_at').notNull().defaultNow(),
    decidedAt: ts('decided_at'),
    decidedByMembershipId: text('decided_by_membership_id'),
  },
  (t) => [
    primaryKey({ name: 'suggestions_pkey', columns: [t.organizationId, t.id] }),
    check('suggestions_id_shape', idShape('id', 'sgs')),
    check('suggestions_organization_id_shape', idShape('organization_id', 'org')),
    check('suggestions_organization_not_global', notGlobal),
    check('suggestions_kind_known', sql`${t.kind} in (${list(SUGGESTION_KINDS)})`),
    check('suggestions_status_known', sql`${t.status} in (${list(SUGGESTION_STATUSES)})`),
    check(
      'suggestions_text_length',
      sql`char_length(btrim(${t.text})) between 1 and ${sql.raw(String(MAX_SUGGESTION_TEXT_LENGTH))}`
    ),
    check(
      'suggestions_fingerprint_length',
      sql`octet_length(${t.fingerprint}) = ${sql.raw(String(SUGGESTION_FINGERPRINT_BYTES))}`
    ),
    check('suggestions_deal_record_id_shape', idShape('deal_record_id', 'deal')),
    check(
      'suggestions_moments_shape',
      sql`jsonb_typeof(${t.moments}) = 'array' and jsonb_array_length(${t.moments}) <= ${sql.raw(String(MAX_SUGGESTION_MOMENTS))}`
    ),
    check(
      'suggestions_decided_by_shape',
      sql`${t.decidedByMembershipId} is null or ${t.decidedByMembershipId} ~ '^mem_[0-9a-f]{32}$'`
    ),
    check(
      'suggestions_decision_columns',
      sql`(${t.status} = 'pending' and ${t.decidedAt} is null and ${t.decidedByMembershipId} is null)
        or (${t.status} <> 'pending' and ${t.decidedAt} is not null and ${t.decidedByMembershipId} is not null)`
    ),
    uniqueIndex('suggestions_fingerprint_key').on(t.organizationId, t.fingerprint),
    index('suggestions_list_idx').on(t.organizationId, t.createdAt.desc(), t.id.desc()),
    index('suggestions_status_list_idx').on(
      t.organizationId,
      t.status,
      t.createdAt.desc(),
      t.id.desc()
    ),
  ]
)
