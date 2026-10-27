import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { coreSchema } from './core'
import { memberships, organizations } from './core-tables'

/*
 * The values below mirror the contract at tag v0.17.0 (`tula-closeline-contract`, `src/prospect`);
 * this library does not depend on the contract, so each carries the name of the constant it copies.
 * `core-prospects.test.ts` pins every value to the number or list written there.
 */

/** The kinds of identity a Prospect is matched on. Mirrors the contract's `PROSPECT_IDENTITY_KINDS`. */
export const PROSPECT_IDENTITY_KINDS = ['email', 'phone', 'linkedin'] as const
/** The states of a Prospect. Mirrors the contract's `PROSPECT_STATUSES`. */
export const PROSPECT_STATUSES = ['active', 'archived'] as const
/**
 * The Prospect fields that carry a Source, in the snake_case the columns use. Mirrors the
 * contract's `PROSPECT_FIELD_NAMES` (`firstName`, `lastName`, `jobTitle`, `email`, `phone`,
 * `linkedinUrl`).
 */
export const PROSPECT_FIELD_NAMES = [
  'first_name',
  'last_name',
  'job_title',
  'email',
  'phone',
  'linkedin_url',
] as const
/** The Prospect Company fields that carry a Source. Mirrors the contract's `PROSPECT_COMPANY_FIELD_NAMES`. */
export const PROSPECT_COMPANY_FIELD_NAMES = [
  'name',
  'domain',
  'industry',
  'employee_count',
  'region',
  'technologies',
] as const
/** The longest Prospect Company industry or region, in characters. */
export const MAX_PROSPECT_COMPANY_TEXT_LENGTH = 200
/** The longest `technologies` history value, a JSON array of up to 50 items of 100 characters. */
export const MAX_PROSPECT_TECHNOLOGIES_VALUE_LENGTH = 5300
/** The most technologies one Prospect Company carries. */
export const MAX_PROSPECT_COMPANY_TECHNOLOGIES = 50
/** The longest technology, in characters. */
export const MAX_PROSPECT_COMPANY_TECHNOLOGY_LENGTH = 100
/** The states of a field history entry. Mirrors the contract's `FIELD_HISTORY_STATES`. */
export const FIELD_HISTORY_STATES = ['current', 'superseded', 'suggested'] as const
/** The most history entries kept per field. Mirrors the contract's `MAX_FIELD_HISTORY_ENTRIES`. */
export const MAX_FIELD_HISTORY_ENTRIES = 50
/** The longest stored field value, in characters. Mirrors the contract's `MAX_PROSPECT_FIELD_VALUE_LENGTH`. */
export const MAX_PROSPECT_FIELD_VALUE_LENGTH = 320
/** The longest Source reference, in characters. Mirrors the contract's `MAX_SOURCE_REF_LENGTH`. */
export const MAX_SOURCE_REF_LENGTH = 200
/** The longest Prospect Company name, in characters. Mirrors the contract's `MAX_PROSPECT_COMPANY_NAME_LENGTH`. */
export const MAX_PROSPECT_COMPANY_NAME_LENGTH = 200
/** The longest Prospect note, in characters. Mirrors the contract's `MAX_PROSPECT_NOTES_LENGTH`. */
export const MAX_PROSPECT_NOTES_LENGTH = 5000
/** The longest tag, in characters. Mirrors the contract's `MAX_PROSPECT_TAG_LENGTH`. */
export const MAX_PROSPECT_TAG_LENGTH = 50
/** The most tags one Prospect carries. Mirrors the contract's `MAX_PROSPECT_TAGS`. */
export const MAX_PROSPECT_TAGS = 20
/** The largest import file, 10 MiB. Mirrors the contract's `MAX_PROSPECT_IMPORT_BYTES`. */
export const MAX_PROSPECT_IMPORT_BYTES = 10 * 1024 * 1024
/** The most rows in an import file. Mirrors the contract's `MAX_PROSPECT_IMPORT_ROWS`. */
export const MAX_PROSPECT_IMPORT_ROWS = 50_000
/** The states of an import. Mirrors the contract's `PROSPECT_IMPORT_STATES`. */
export const PROSPECT_IMPORT_STATES = ['uploaded', 'processing', 'completed', 'failed'] as const
/** Why an import failed. Mirrors the contract's `PROSPECT_IMPORT_FAILURE_REASONS`. */
export const PROSPECT_IMPORT_FAILURE_REASONS = [
  'too_many_rows',
  'unreadable',
  'processing_failed',
] as const
/** What happened to an import row. Mirrors the contract's `PROSPECT_IMPORT_ROW_RESULTS`. */
export const PROSPECT_IMPORT_ROW_RESULTS = ['created', 'updated', 'skipped', 'rejected'] as const
/** Why a row was skipped. Mirrors the contract's `PROSPECT_IMPORT_SKIP_REASONS`. */
export const PROSPECT_IMPORT_SKIP_REASONS = ['no_change', 'manual_values_kept'] as const
/** Why a row was rejected. Mirrors the contract's `PROSPECT_IMPORT_REJECT_REASONS`. */
export const PROSPECT_IMPORT_REJECT_REASONS = [
  'wrong_column_count',
  'blank_row',
  'missing_identity',
  'invalid_email',
  'invalid_phone',
  'invalid_linkedin_url',
  'invalid_name',
  'invalid_job_title',
  'invalid_company',
  'invalid_tags',
  'owner_not_found',
  'owner_not_allowed',
  'duplicate_in_file',
  'identity_conflict',
] as const
/** The states of a merge. Mirrors the contract's `PROSPECT_MERGE_STATES`. */
export const PROSPECT_MERGE_STATES = ['merged', 'undone'] as const
/** The days after a merge it can be undone. Mirrors the contract's `PROSPECT_MERGE_UNDO_DAYS`. */
export const PROSPECT_MERGE_UNDO_DAYS = 30
/** The most Prospects one merge folds into the survivor. Mirrors the contract's `MAX_MERGED_PROSPECTS`. */
export const MAX_MERGED_PROSPECTS = 5
/** The largest merge snapshot, in bytes of its text form: five Prospects with a full history. */
export const MAX_MERGE_SNAPSHOT_BYTES = 4 * 1024 * 1024

/**
 * The Source kinds as one regular expression: the fixed words and `enrichment:<provider>`.
 * Mirrors the contract's `sourceKindSchema`.
 */
export const SOURCE_KIND_PATTERN =
  '^(manual|import|crm:hubspot|crm:salesforce|form|enrichment:[a-z][a-z0-9_]{0,31})$'

/**
 * The normalised forms of the three identities (ADR 0011), one regular expression each, as the
 * database checks them. Email: ASCII-folded, one `@`, printable ASCII (the memberships rule).
 * Phone: E.164. LinkedIn: lower case, no scheme, no `www.`, no query or fragment, no trailing
 * slash, starting `linkedin.com/`. Core produces them; the database refuses anything else.
 */
export const IDENTITY_VALUE_PATTERNS = {
  phone: '^\\+[1-9][0-9]{6,14}$',
  linkedin: '^linkedin\\.com(/[a-z0-9%._~-]+)+$',
} as const

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })
const createdAt = () => ts('created_at').notNull().defaultNow()
const updatedAt = () => ts('updated_at').notNull().defaultNow()

const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
})
const textArray = customType<{ data: string[]; driverData: string[] }>({
  dataType: () => 'text[]',
})

/**
 * A Prospect Company of an Organization. `name`, `domain` and the enrichment fields (`industry`,
 * `employee_count`, `region`, `technologies`, all nullable) are the current values; their
 * Sources and history are in `prospect_company_fields`, which keeps each value as text. `domain` is the normalised domain
 * (ASCII-folded host), unique per Organization when set.
 *
 * Lists served (keyset `(created_at, id)`, newest first): `prospect_companies_list_idx`. Lookup by
 * domain: `prospect_companies_domain_key`.
 */
export const prospectCompanies = coreSchema.table(
  'prospect_companies',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    domain: text('domain'),
    industry: text('industry'),
    employeeCount: integer('employee_count'),
    region: text('region'),
    technologies: textArray('technologies'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: 'prospect_companies_pkey', columns: [t.organizationId, t.id] }),
    check('prospect_companies_id_shape', idShape('id', 'pco')),
    check('prospect_companies_organization_id_shape', orgShape),
    check('prospect_companies_organization_not_global', notGlobal),
    check(
      'prospect_companies_name_shape',
      sql`char_length(${t.name}) between 1 and ${sql.raw(String(MAX_PROSPECT_COMPANY_NAME_LENGTH))} and ${t.name} = btrim(${t.name})`
    ),
    check(
      'prospect_companies_domain_shape',
      sql`${t.domain} is null or (char_length(${t.domain}) between 3 and 253
        and ${t.domain} collate "C" ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$')`
    ),
    check(
      'prospect_companies_industry_shape',
      sql`${t.industry} is null or (char_length(${t.industry}) between 1 and ${sql.raw(String(MAX_PROSPECT_COMPANY_TEXT_LENGTH))} and ${t.industry} = btrim(${t.industry}))`
    ),
    check(
      'prospect_companies_region_shape',
      sql`${t.region} is null or (char_length(${t.region}) between 1 and ${sql.raw(String(MAX_PROSPECT_COMPANY_TEXT_LENGTH))} and ${t.region} = btrim(${t.region}))`
    ),
    check(
      'prospect_companies_employee_count_shape',
      sql`${t.employeeCount} is null or ${t.employeeCount} >= 0`
    ),
    check(
      'prospect_companies_technologies_shape',
      sql`${t.technologies} is null or core.prospect_technologies_valid(${t.technologies})`
    ),
    uniqueIndex('prospect_companies_domain_key')
      .on(t.organizationId, t.domain)
      .where(sql`${t.domain} is not null`),
    index('prospect_companies_list_idx').on(t.organizationId, t.createdAt.desc(), t.id.desc()),
    // Serves the Prospect and Company list filter `q` (`name ilike '%text%'`); see pg_trgm in 0029.
    index('prospect_companies_name_trgm_idx').using('gin', t.name.op('gin_trgm_ops')),
    index('prospect_companies_domain_trgm_idx')
      .using('gin', t.domain.op('gin_trgm_ops'))
      .where(sql`${t.domain} is not null`),
  ]
)

/**
 * A Prospect of an Organization: who owns it, its state, tags and notes. Its fields, with their
 * Sources, are in `prospect_fields` and its matchable identities in `prospect_identities`.
 * `owner_membership_id` is the owner Rep's Membership, null while unassigned or after that
 * Membership is removed; `company_id` is null for none or after the Company is removed. `source`
 * is the Source kind that created it. Erasing a Prospect deletes its fields and identities (the
 * cascade).
 *
 * Lists served (keyset `(created_at, id)` both descending, `LIMIT` a page, always scoped by
 * `organization_id`): all (`prospects_list_idx`), by status, owner, Company and Source (one index
 * each, ending in the same keyset).
 */
export const prospects = coreSchema.table(
  'prospects',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    companyId: text('company_id'),
    ownerMembershipId: text('owner_membership_id'),
    status: text('status', { enum: PROSPECT_STATUSES }).notNull().default('active'),
    source: text('source').notNull(),
    tags: textArray('tags').notNull().default(sql`'{}'::text[]`),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: 'prospects_pkey', columns: [t.organizationId, t.id] }),
    check('prospects_id_shape', idShape('id', 'prs')),
    check('prospects_organization_id_shape', orgShape),
    check('prospects_organization_not_global', notGlobal),
    check('prospects_company_id_shape', idShape('company_id', 'pco')),
    check('prospects_owner_membership_id_shape', idShape('owner_membership_id', 'mem')),
    check('prospects_status_known', sql`${t.status} in (${list(PROSPECT_STATUSES)})`),
    check(
      'prospects_source_known',
      sql`${t.source} collate "C" ~ '${sql.raw(SOURCE_KIND_PATTERN)}'`
    ),
    check('prospects_tags_valid', sql`core.prospect_tags_valid(${t.tags})`),
    check(
      'prospects_notes_shape',
      sql`${t.notes} is null or char_length(${t.notes}) between 1 and ${sql.raw(String(MAX_PROSPECT_NOTES_LENGTH))}`
    ),
    foreignKey({
      name: 'prospects_company_fk',
      columns: [t.organizationId, t.companyId],
      foreignColumns: [prospectCompanies.organizationId, prospectCompanies.id],
    }).onDelete('set null'),
    foreignKey({
      name: 'prospects_owner_fk',
      columns: [t.organizationId, t.ownerMembershipId],
      foreignColumns: [memberships.organizationId, memberships.id],
    }).onDelete('set null'),
    index('prospects_list_idx').on(t.organizationId, t.createdAt.desc(), t.id.desc()),
    index('prospects_status_list_idx').on(
      t.organizationId,
      t.status,
      t.createdAt.desc(),
      t.id.desc()
    ),
    index('prospects_owner_list_idx')
      .on(t.organizationId, t.ownerMembershipId, t.createdAt.desc(), t.id.desc())
      .where(sql`${t.ownerMembershipId} is not null`),
    index('prospects_company_list_idx')
      .on(t.organizationId, t.companyId, t.createdAt.desc(), t.id.desc())
      .where(sql`${t.companyId} is not null`),
    index('prospects_source_list_idx').on(
      t.organizationId,
      t.source,
      t.createdAt.desc(),
      t.id.desc()
    ),
  ]
)

/**
 * A matchable identity of a Prospect: an email, phone or LinkedIn address in its normalised form
 * (ADR 0011). Unique per Organization by `(kind, value)`, whichever Prospect holds it, so a
 * duplicate is refused by the database (`prospect.duplicate_identity`) and the same value in
 * another Organization is a different row. A Prospect has at most one primary identity per kind.
 *
 * Lookups served: by value (the primary key `(organization_id, kind, value)`), and all identities
 * of one Prospect (`prospect_identities_prospect_idx`).
 */
export const prospectIdentities = coreSchema.table(
  'prospect_identities',
  {
    organizationId: text('organization_id').notNull(),
    kind: text('kind', { enum: PROSPECT_IDENTITY_KINDS }).notNull(),
    value: text('value').notNull(),
    prospectId: text('prospect_id').notNull(),
    isPrimary: boolean('is_primary').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: 'prospect_identities_pkey', columns: [t.organizationId, t.kind, t.value] }),
    check('prospect_identities_organization_id_shape', orgShape),
    check('prospect_identities_organization_not_global', notGlobal),
    check('prospect_identities_prospect_id_shape', idShape('prospect_id', 'prs')),
    check('prospect_identities_kind_known', sql`${t.kind} in (${list(PROSPECT_IDENTITY_KINDS)})`),
    check(
      'prospect_identities_value_shape',
      sql`char_length(${t.value}) between 3 and ${sql.raw(String(MAX_PROSPECT_FIELD_VALUE_LENGTH))} and (
        (${t.kind} = 'email'
          and ${t.value} = lower(${t.value} collate "C")
          and char_length(${t.value}) - char_length(replace(${t.value}, '@', '')) = 1
          and position('@' in ${t.value}) between 2 and char_length(${t.value}) - 1
          and ${t.value} collate "C" ~ '^[!-~]+$')
        or (${t.kind} = 'phone' and ${t.value} collate "C" ~ '${sql.raw(IDENTITY_VALUE_PATTERNS.phone)}')
        or (${t.kind} = 'linkedin' and char_length(${t.value}) <= 300
          and ${t.value} collate "C" ~ '${sql.raw(IDENTITY_VALUE_PATTERNS.linkedin)}'))`
    ),
    foreignKey({
      name: 'prospect_identities_prospect_fk',
      columns: [t.organizationId, t.prospectId],
      foreignColumns: [prospects.organizationId, prospects.id],
    }).onDelete('cascade'),
    uniqueIndex('prospect_identities_primary_key')
      .on(t.organizationId, t.prospectId, t.kind)
      .where(sql`${t.isPrimary}`),
    index('prospect_identities_prospect_idx').on(t.organizationId, t.prospectId),
  ]
)

/** The columns every field-history table shares (the owner id column is added per table). */
const fieldHistoryColumns = () => ({
  organizationId: text('organization_id').notNull(),
  seq: bigint('seq', { mode: 'number' }).generatedAlwaysAsIdentity().notNull(),
  fieldName: text('field_name').notNull(),
  state: text('state', { enum: FIELD_HISTORY_STATES }).notNull(),
  value: text('value').notNull(),
  source: text('source').notNull(),
  sourceRef: text('source_ref'),
  setAt: ts('set_at').notNull(),
  setByUserId: text('set_by_user_id'),
})

/**
 * The value check of a field-history table: 1 to 320 characters. Prospect Company history
 * relaxes it for `technologies`, whose value is a JSON array of strings.
 */
const fieldValueCheck = (table: string, companyFields = false) =>
  check(
    `${table}_value_shape`,
    sql.raw(
      companyFields
        ? `("field_name" <> 'technologies' and char_length("value") between 1 and ${MAX_PROSPECT_FIELD_VALUE_LENGTH}) or ("field_name" = 'technologies' and char_length("value") between 1 and ${MAX_PROSPECT_TECHNOLOGIES_VALUE_LENGTH} and core.prospect_company_technologies_text_valid("value"))`
        : `char_length("value") between 1 and ${MAX_PROSPECT_FIELD_VALUE_LENGTH}`
    )
  )

/** The checks every field-history table shares, except the value check ({@link fieldValueCheck}). */
const fieldHistoryChecks = (table: string) => [
  check(`${table}_organization_id_shape`, orgShape),
  check(`${table}_organization_not_global`, notGlobal),
  check(
    `${table}_state_known`,
    sql.raw(`"state" in (${FIELD_HISTORY_STATES.map((s) => `'${s}'`).join(', ')})`)
  ),
  check(`${table}_source_known`, sql.raw(`"source" collate "C" ~ '${SOURCE_KIND_PATTERN}'`)),
  check(
    `${table}_source_ref_shape`,
    sql.raw(
      `("source_ref" is null or char_length("source_ref") between 1 and ${MAX_SOURCE_REF_LENGTH}) and ("source" <> 'manual' or "source_ref" is null)`
    )
  ),
  check(
    `${table}_set_by_user_id_shape`,
    sql.raw(`"set_by_user_id" is null or "set_by_user_id" ~ '^usr_[0-9a-f]{32}$'`)
  ),
]

/**
 * One entry of a Prospect field's history (ADR 0020): a value with its Source, time and actor, and
 * whether it is the `current` value, a `superseded` earlier one or a `suggested` enrichment value
 * kept beside an own value. The current value of a field is the entry whose state is `current`;
 * there is at most one per field. At most 50 entries per field (the 51st insert is refused by a
 * trigger); the service removes the oldest non-current entries first. `seq` orders entries set at
 * the same time, and with `set_at` is the history cursor.
 *
 * Lists served: a Prospect's current values (`prospect_fields_current_key`) and one field's
 * history, newest first (`prospect_fields_history_idx`). Erasing a Prospect deletes its entries (cascade).
 */
export const prospectFields = coreSchema.table(
  'prospect_fields',
  { ...fieldHistoryColumns(), prospectId: text('prospect_id').notNull() },
  (t) => [
    primaryKey({ name: 'prospect_fields_pkey', columns: [t.organizationId, t.seq] }),
    ...fieldHistoryChecks('prospect_fields'),
    fieldValueCheck('prospect_fields'),
    check('prospect_fields_prospect_id_shape', idShape('prospect_id', 'prs')),
    check(
      'prospect_fields_field_name_known',
      sql`${t.fieldName} in (${list(PROSPECT_FIELD_NAMES)})`
    ),
    foreignKey({
      name: 'prospect_fields_prospect_fk',
      columns: [t.organizationId, t.prospectId],
      foreignColumns: [prospects.organizationId, prospects.id],
    }).onDelete('cascade'),
    uniqueIndex('prospect_fields_current_key')
      .on(t.organizationId, t.prospectId, t.fieldName)
      .where(sql`${t.state} = 'current'`),
    index('prospect_fields_history_idx').on(
      t.organizationId,
      t.prospectId,
      t.fieldName,
      t.setAt.desc(),
      t.seq.desc()
    ),
    // Serves the Prospect list filter `q` (`value ilike '%text%'` on current values); see 0029.
    index('prospect_fields_value_trgm_idx')
      .using('gin', t.value.op('gin_trgm_ops'))
      .where(sql`${t.state} = 'current'`),
  ]
)

/**
 * One entry of a Prospect Company field's history, as {@link prospectFields} is for a Prospect.
 * The fields are `name`, `domain`, `industry`, `employee_count`, `region` and `technologies`; a
 * value is kept as text: `employee_count` as 1 to 9 digits and `technologies` as a JSON array of
 * strings.
 */
export const prospectCompanyFields = coreSchema.table(
  'prospect_company_fields',
  { ...fieldHistoryColumns(), companyId: text('company_id').notNull() },
  (t) => [
    primaryKey({ name: 'prospect_company_fields_pkey', columns: [t.organizationId, t.seq] }),
    ...fieldHistoryChecks('prospect_company_fields'),
    fieldValueCheck('prospect_company_fields', true),
    check(
      'prospect_company_fields_employee_count_value',
      sql`${t.fieldName} <> 'employee_count' or ${t.value} collate "C" ~ '^[0-9]{1,9}$'`
    ),
    check('prospect_company_fields_company_id_shape', idShape('company_id', 'pco')),
    check(
      'prospect_company_fields_field_name_known',
      sql`${t.fieldName} in (${list(PROSPECT_COMPANY_FIELD_NAMES)})`
    ),
    foreignKey({
      name: 'prospect_company_fields_company_fk',
      columns: [t.organizationId, t.companyId],
      foreignColumns: [prospectCompanies.organizationId, prospectCompanies.id],
    }).onDelete('cascade'),
    uniqueIndex('prospect_company_fields_current_key')
      .on(t.organizationId, t.companyId, t.fieldName)
      .where(sql`${t.state} = 'current'`),
    index('prospect_company_fields_history_idx').on(
      t.organizationId,
      t.companyId,
      t.fieldName,
      t.setAt.desc(),
      t.seq.desc()
    ),
  ]
)

/**
 * A Prospect import (an uploaded CSV, asynchronous like the Playbook's deal import, ADR 0018). The
 * file is in object storage under `object_key`; nothing here holds a cell. The counts are null
 * until `completed`, then `row_count` is the sum of the other four; `failure_reason` is set
 * exactly when `failed`. `processed_rows` is how far the job got, so a crashed job resumes.
 *
 * Lists served (keyset `(created_at, id)`, newest first): `prospect_imports_list_idx`.
 */
export const prospectImports = coreSchema.table(
  'prospect_imports',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    state: text('state', { enum: PROSPECT_IMPORT_STATES }).notNull().default('uploaded'),
    failureReason: text('failure_reason', { enum: PROSPECT_IMPORT_FAILURE_REASONS }),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    contentHash: bytes('content_hash').notNull(),
    objectKey: text('object_key').notNull(),
    processedRows: integer('processed_rows').notNull().default(0),
    rowCount: integer('row_count'),
    createdCount: integer('created_count'),
    updatedCount: integer('updated_count'),
    skippedCount: integer('skipped_count'),
    rejectedCount: integer('rejected_count'),
    uploadedByUserId: text('uploaded_by_user_id').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: 'prospect_imports_pkey', columns: [t.organizationId, t.id] }),
    check('prospect_imports_id_shape', idShape('id', 'pimp')),
    check('prospect_imports_organization_id_shape', orgShape),
    check('prospect_imports_organization_not_global', notGlobal),
    check('prospect_imports_uploaded_by_user_id_shape', idShape('uploaded_by_user_id', 'usr')),
    check('prospect_imports_state_known', sql`${t.state} in (${list(PROSPECT_IMPORT_STATES)})`),
    check(
      'prospect_imports_failure_reason_known',
      sql`${t.failureReason} in (${list(PROSPECT_IMPORT_FAILURE_REASONS)})`
    ),
    check(
      'prospect_imports_failed_has_reason',
      sql`(${t.state} = 'failed') = (${t.failureReason} is not null)`
    ),
    check(
      'prospect_imports_size_bounds',
      sql`${t.sizeBytes} between 1 and ${sql.raw(String(MAX_PROSPECT_IMPORT_BYTES))}`
    ),
    check('prospect_imports_content_hash_length', sql`octet_length(${t.contentHash}) = 32`),
    check(
      'prospect_imports_object_key_shape',
      sql`char_length(${t.objectKey}) between 1 and 1024 and ${t.objectKey} collate "C" ~ '^[!-~]+$'`
    ),
    check(
      'prospect_imports_processed_rows_bounds',
      sql`${t.processedRows} between 0 and ${sql.raw(String(MAX_PROSPECT_IMPORT_ROWS))}`
    ),
    check(
      'prospect_imports_counts_when_completed',
      sql`(${t.state} = 'completed') = (${t.rowCount} is not null)
        and (${t.rowCount} is null) = (${t.createdCount} is null)
        and (${t.rowCount} is null) = (${t.updatedCount} is null)
        and (${t.rowCount} is null) = (${t.skippedCount} is null)
        and (${t.rowCount} is null) = (${t.rejectedCount} is null)`
    ),
    check(
      'prospect_imports_counts_add_up',
      sql`${t.rowCount} is null or (${t.createdCount} >= 0 and ${t.updatedCount} >= 0
        and ${t.skippedCount} >= 0 and ${t.rejectedCount} >= 0
        and ${t.rowCount} <= ${sql.raw(String(MAX_PROSPECT_IMPORT_ROWS))}
        and ${t.rowCount} = ${t.createdCount} + ${t.updatedCount} + ${t.skippedCount} + ${t.rejectedCount})`
    ),
    index('prospect_imports_list_idx').on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  ]
)

/**
 * One row of an import report: the record number (the header is record 1, so the first data row is
 * 2), what happened, why for a skipped or rejected row, and the Prospect it created, updated or
 * matched. No cell of the file is kept, so a report holds no personal data. `prospect_id` has no
 * foreign key: erasing a Prospect leaves the report row standing, naming an id that no longer
 * exists.
 *
 * Lists served (keyset `row_number`): a report (the primary key) and one result
 * (`prospect_import_rows_result_idx`).
 */
export const prospectImportRows = coreSchema.table(
  'prospect_import_rows',
  {
    organizationId: text('organization_id').notNull(),
    importId: text('import_id').notNull(),
    rowNumber: integer('row_number').notNull(),
    result: text('result', { enum: PROSPECT_IMPORT_ROW_RESULTS }).notNull(),
    reason: text('reason'),
    prospectId: text('prospect_id'),
  },
  (t) => [
    primaryKey({
      name: 'prospect_import_rows_pkey',
      columns: [t.organizationId, t.importId, t.rowNumber],
    }),
    check('prospect_import_rows_organization_id_shape', orgShape),
    check('prospect_import_rows_organization_not_global', notGlobal),
    check('prospect_import_rows_import_id_shape', idShape('import_id', 'pimp')),
    check('prospect_import_rows_prospect_id_shape', idShape('prospect_id', 'prs')),
    check(
      'prospect_import_rows_row_number_bounds',
      sql`${t.rowNumber} between 2 and ${sql.raw(String(MAX_PROSPECT_IMPORT_ROWS + 1))}`
    ),
    check(
      'prospect_import_rows_result_known',
      sql`${t.result} in (${list(PROSPECT_IMPORT_ROW_RESULTS)})`
    ),
    check(
      'prospect_import_rows_reason_matches_result',
      sql`(${t.result} = 'skipped' and ${t.reason} is not null and ${t.reason} in (${list(PROSPECT_IMPORT_SKIP_REASONS)}))
        or (${t.result} = 'rejected' and ${t.reason} is not null and ${t.reason} in (${list(PROSPECT_IMPORT_REJECT_REASONS)}))
        or (${t.result} in ('created', 'updated') and ${t.reason} is null)`
    ),
    check(
      'prospect_import_rows_prospect_matches_result',
      sql`(${t.result} = 'rejected' and ${t.prospectId} is null)
        or (${t.result} in ('created', 'updated') and ${t.prospectId} is not null)
        or ${t.result} = 'skipped'`
    ),
    foreignKey({
      name: 'prospect_import_rows_import_fk',
      columns: [t.organizationId, t.importId],
      foreignColumns: [prospectImports.organizationId, prospectImports.id],
    }).onDelete('cascade'),
    index('prospect_import_rows_result_idx').on(
      t.organizationId,
      t.importId,
      t.result,
      t.rowNumber
    ),
  ]
)

/**
 * A merge of Prospects into a survivor, undoable for 30 days. `merged_prospect_ids` are the 1 to 5
 * Prospects folded in (they no longer exist, so no foreign key); `snapshot` restores both records
 * on undo and is never returned by the API. `undoable_until` is exactly 30 days after
 * `created_at`; `undone_at` is set exactly when the state is `undone`. Deleting the survivor
 * (erasure) deletes the record; a GIN index on the merged ids finds the records that hold an
 * erased Prospect's snapshot.
 *
 * Lists served: a survivor's merges (`prospect_merges_survivor_idx`).
 */
export const prospectMerges = coreSchema.table(
  'prospect_merges',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    survivorProspectId: text('survivor_prospect_id').notNull(),
    mergedProspectIds: textArray('merged_prospect_ids').notNull(),
    fieldChoices: jsonb('field_choices').notNull().default(sql`'{}'::jsonb`),
    state: text('state', { enum: PROSPECT_MERGE_STATES }).notNull().default('merged'),
    mergedByUserId: text('merged_by_user_id').notNull(),
    snapshot: jsonb('snapshot').notNull(),
    createdAt: createdAt(),
    undoableUntil: ts('undoable_until').notNull(),
    undoneAt: ts('undone_at'),
  },
  (t) => [
    primaryKey({ name: 'prospect_merges_pkey', columns: [t.organizationId, t.id] }),
    check('prospect_merges_id_shape', idShape('id', 'pmrg')),
    check('prospect_merges_organization_id_shape', orgShape),
    check('prospect_merges_organization_not_global', notGlobal),
    check('prospect_merges_survivor_prospect_id_shape', idShape('survivor_prospect_id', 'prs')),
    check('prospect_merges_merged_by_user_id_shape', idShape('merged_by_user_id', 'usr')),
    check('prospect_merges_state_known', sql`${t.state} in (${list(PROSPECT_MERGE_STATES)})`),
    check(
      'prospect_merges_merged_ids_valid',
      sql`core.prospect_merged_ids_valid(${t.mergedProspectIds}, ${t.survivorProspectId})`
    ),
    check('prospect_merges_field_choices_object', sql`jsonb_typeof(${t.fieldChoices}) = 'object'`),
    check(
      'prospect_merges_snapshot_bounds',
      sql`jsonb_typeof(${t.snapshot}) = 'object' and octet_length(${t.snapshot}::text) <= ${sql.raw(String(MAX_MERGE_SNAPSHOT_BYTES))}`
    ),
    check(
      'prospect_merges_undo_window',
      sql`${t.undoableUntil} = ${t.createdAt} + interval '${sql.raw(String(PROSPECT_MERGE_UNDO_DAYS))} days'`
    ),
    check(
      'prospect_merges_undone_has_time',
      sql`(${t.state} = 'undone') = (${t.undoneAt} is not null)`
    ),
    foreignKey({
      name: 'prospect_merges_survivor_fk',
      columns: [t.organizationId, t.survivorProspectId],
      foreignColumns: [prospects.organizationId, prospects.id],
    }).onDelete('cascade'),
    index('prospect_merges_survivor_idx').on(
      t.organizationId,
      t.survivorProspectId,
      t.createdAt.desc(),
      t.id.desc()
    ),
    index('prospect_merges_merged_ids_idx').using('gin', t.mergedProspectIds),
  ]
)
