import { sql } from 'drizzle-orm'
import { check, integer, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { coreSchema } from './core'
import { organizations } from './core-tables'

/** The most origins one Inquiry embed allows. */
export const MAX_INQUIRY_EMBED_ORIGINS = 20
/** The longest Inquiry consent wording text, in characters. */
export const MAX_INQUIRY_CONSENT_WORDING_LENGTH = 2000

/**
 * An Organization's Inquiry embed settings: one row per Organization (the primary key). The
 * publishable key itself is never stored, only its SHA-256 hash (`publishable_key_hash`, unique,
 * lowercase hex). `allowed_origins` is the list of page origins that may submit (1 to 20), and the
 * consent wording the form must display is versioned: `consent_wording_version` (1 or more) and its
 * `consent_wording_text`. Row-level security fails closed on `organization_id`; the public intake
 * route does not know the Organization yet and resolves the key through
 * `core.inquiry_embed_for_key_hash` (migration 0071), which returns only the Organization, the
 * origins and the wording.
 */
export const inquiryEmbeds = coreSchema.table(
  'inquiry_embeds',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    publishableKeyHash: text('publishable_key_hash').notNull(),
    allowedOrigins: text('allowed_origins').array().notNull(),
    consentWordingVersion: integer('consent_wording_version').notNull(),
    consentWordingText: text('consent_wording_text').notNull(),
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
    check('inquiry_embeds_key_hash_shape', sql`${t.publishableKeyHash} ~ '^[0-9a-f]{64}$'`),
    check(
      'inquiry_embeds_origins_bounds',
      sql`cardinality(${t.allowedOrigins}) between 1 and ${sql.raw(String(MAX_INQUIRY_EMBED_ORIGINS))}`
    ),
    check('inquiry_embeds_wording_version', sql`${t.consentWordingVersion} >= 1`),
    check(
      'inquiry_embeds_wording_text_shape',
      sql`char_length(${t.consentWordingText}) between 1 and ${sql.raw(String(MAX_INQUIRY_CONSENT_WORDING_LENGTH))}`
    ),
    uniqueIndex('inquiry_embeds_key_hash_key').on(t.publishableKeyHash),
  ]
)

/** An Inquiry embed settings row. */
export type InquiryEmbed = typeof inquiryEmbeds.$inferSelect
