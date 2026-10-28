import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  integer,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { coreSchema } from './core'
import { consentWordings, MAX_CONSENT_WORDING_LENGTH } from './core-consent'
import { organizations } from './core-tables'

/** The most origins one Inquiry embed allows. */
export const MAX_INQUIRY_EMBED_ORIGINS = 20

/**
 * An Organization's Inquiry embed settings: one row per Organization (the primary key). The
 * publishable key is a public identifier (it sits in page HTML), kept as `publishable_key` so the
 * Admin can read it back; lookups go by its SHA-256 (`publishable_key_hash`, unique, lowercase hex).
 * `allowed_origins` is the list of page origins that may submit (0 to 20), and the consent wording
 * the form must display is a snapshot of one Consent Wording: its id, `consent_wording_version` (1
 * or more) and `consent_wording_text`, all null or all set. An embed is live only with an origin and
 * a wording. Row-level security fails closed on `organization_id`; the public intake
 * route does not know the Organization yet and resolves the key through
 * `core.inquiry_embed_for_key_hash` (migration 0075), which returns only the Organization, the
 * origins and the wording.
 */
export const inquiryEmbeds = coreSchema.table(
  'inquiry_embeds',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    publishableKey: text('publishable_key').notNull(),
    publishableKeyHash: text('publishable_key_hash').notNull(),
    allowedOrigins: text('allowed_origins').array().notNull(),
    consentWordingId: text('consent_wording_id'),
    consentWordingVersion: integer('consent_wording_version'),
    consentWordingText: text('consent_wording_text'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'inquiry_embeds_pkey', columns: [t.organizationId] }),
    check(
      'inquiry_embeds_organization_id_shape',
      sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
    ),
    check(
      'inquiry_embeds_organization_not_global',
      sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
    ),
    check('inquiry_embeds_key_shape', sql`${t.publishableKey} ~ '^[A-Za-z0-9_-]{32,64}$'`),
    check('inquiry_embeds_key_hash_shape', sql`${t.publishableKeyHash} ~ '^[0-9a-f]{64}$'`),
    check(
      'inquiry_embeds_origins_bounds',
      sql`cardinality(${t.allowedOrigins}) between 0 and ${sql.raw(String(MAX_INQUIRY_EMBED_ORIGINS))}`
    ),
    check(
      'inquiry_embeds_wording_all_or_none',
      sql`(${t.consentWordingId} is null) = (${t.consentWordingVersion} is null) and (${t.consentWordingId} is null) = (${t.consentWordingText} is null)`
    ),
    check(
      'inquiry_embeds_wording_id_shape',
      sql`${t.consentWordingId} is null or ${t.consentWordingId} ~ '^cwd_[0-9a-f]{32}$'`
    ),
    check('inquiry_embeds_wording_version', sql`${t.consentWordingVersion} >= 1`),
    check(
      'inquiry_embeds_wording_text_shape',
      sql`char_length(${t.consentWordingText}) between 1 and ${sql.raw(String(MAX_CONSENT_WORDING_LENGTH))}`
    ),
    foreignKey({
      name: 'inquiry_embeds_wording_fk',
      columns: [t.organizationId, t.consentWordingId],
      foreignColumns: [consentWordings.organizationId, consentWordings.id],
    }),
    uniqueIndex('inquiry_embeds_key_hash_key').on(t.publishableKeyHash),
  ]
)

/** An Inquiry embed settings row. */
export type InquiryEmbed = typeof inquiryEmbeds.$inferSelect
