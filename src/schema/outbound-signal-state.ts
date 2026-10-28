import { sql } from 'drizzle-orm'
import {
  check,
  customType,
  index,
  integer,
  jsonb,
  primaryKey,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { outboundSchema } from './outbound'

/*
 * Milestone 5 (`docs/specs/m05-enrichment-and-signals.md` in the hub), ticket T6: the state the
 * Signals and fit modules keep per Organization beyond `signals` and `fit_criteria`. Values mirror
 * the contract (`tula-closeline-contract`, `src/enrichment`).
 */

/** The most bytes of the sealed webhook signing secret. */
export const MAX_WEBHOOK_SECRET_CIPHERTEXT_BYTES = 2048
/** The most bytes of the per-kind settings document. */
export const MAX_SIGNAL_KINDS_BYTES = 4096
/** The most bytes of a stored fit score's per-criterion matches. */
export const MAX_FIT_MATCHES_BYTES = 16384

const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })
const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
})

/**
 * An Organization's Signal setup: which kinds count and how many days each stays fresh (`kinds`, the
 * contract's per-kind list), the sealed signing secret of its Signal webhook (ciphertext only,
 * never plaintext; `webhook_key_id` names the sealing key; all three of ciphertext, key id and
 * `webhook_rotated_at` are set or all null), and `criteria_version`, a counter the service bumps
 * on every change to the fit criteria so a stored score says which criteria it used. `version` is
 * the optimistic-concurrency counter of the settings. One row per Organization, absent meaning the
 * defaults.
 *
 * Lookup served: the row by Organization (the primary key).
 */
export const signalSettings = outboundSchema.table(
  'signal_settings',
  {
    organizationId: text('organization_id').notNull(),
    kinds: jsonb('kinds').notNull(),
    version: integer('version').notNull().default(1),
    criteriaVersion: integer('criteria_version').notNull().default(1),
    webhookSecretCiphertext: bytes('webhook_secret_ciphertext'),
    webhookKeyId: text('webhook_key_id'),
    webhookRotatedAt: ts('webhook_rotated_at'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'signal_settings_pkey', columns: [t.organizationId] }),
    check('signal_settings_organization_id_shape', orgShape),
    check('signal_settings_organization_not_global', notGlobal),
    check(
      'signal_settings_kinds_shape',
      sql`jsonb_typeof(${t.kinds}) = 'array'
        and octet_length(${t.kinds}::text) <= ${sql.raw(String(MAX_SIGNAL_KINDS_BYTES))}`
    ),
    check(
      'signal_settings_versions_positive',
      sql`${t.version} >= 1 and ${t.criteriaVersion} >= 1`
    ),
    check(
      'signal_settings_webhook_shape',
      sql`(${t.webhookSecretCiphertext} is null or octet_length(${t.webhookSecretCiphertext}) between 1 and ${sql.raw(String(MAX_WEBHOOK_SECRET_CIPHERTEXT_BYTES))})
        and (${t.webhookKeyId} is null or char_length(${t.webhookKeyId}) between 1 and 128)
        and (${t.webhookSecretCiphertext} is null) = (${t.webhookKeyId} is null)
        and (${t.webhookSecretCiphertext} is null) = (${t.webhookRotatedAt} is null)`
    ),
  ]
)

/**
 * The latest fit score of one Prospect: the sum of matched weights, the most it could have been,
 * and each criterion's result (`matches`, ids, names, weights and results only), scored against
 * `criteria_version`. One row per Prospect; the service replaces it on a rescore, and reads the old
 * `score` first to report a change.
 *
 * Lists served (keyset `(score, prospect_id)` highest first, `LIMIT` a page): the Organization's
 * scores (`fit_scores_list_idx`).
 */
export const fitScores = outboundSchema.table(
  'fit_scores',
  {
    organizationId: text('organization_id').notNull(),
    prospectId: text('prospect_id').notNull(),
    score: smallint('score').notNull(),
    maxScore: smallint('max_score').notNull(),
    matches: jsonb('matches').notNull(),
    criteriaVersion: integer('criteria_version').notNull(),
    scoredAt: ts('scored_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'fit_scores_pkey', columns: [t.organizationId, t.prospectId] }),
    check('fit_scores_organization_id_shape', orgShape),
    check('fit_scores_organization_not_global', notGlobal),
    check('fit_scores_prospect_id_shape', idShape('prospect_id', 'prs')),
    check('fit_scores_score_range', sql`${t.score} between 0 and ${t.maxScore}`),
    check('fit_scores_criteria_version_positive', sql`${t.criteriaVersion} >= 1`),
    check(
      'fit_scores_matches_shape',
      sql`jsonb_typeof(${t.matches}) = 'array'
        and octet_length(${t.matches}::text) <= ${sql.raw(String(MAX_FIT_MATCHES_BYTES))}`
    ),
    index('fit_scores_list_idx').on(t.organizationId, t.score.desc(), t.prospectId.desc()),
  ]
)
