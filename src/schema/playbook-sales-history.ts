import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { playbookSchema } from './playbook'
import { GLOBAL_SCOPE_ORGANIZATION_ID } from './playbook-tables'

/*
 * The values below mirror the contract at tag v0.8.0 (`tula-closeline-contract`, `src/playbook`);
 * this library does not depend on the contract, so each carries the name of the constant it copies.
 * `playbook-tables.test.ts` pins every value to the number or list written there, so a change on
 * one side that is not made on the other fails a test, as the document lists do.
 */

/** The Outcome of a Deal. Mirrors the contract's `OUTCOMES`. */
export const DEAL_OUTCOMES = ['won', 'lost', 'open'] as const
/** The states of a Deal import. Mirrors the contract's `DEAL_IMPORT_STATES`. */
export const DEAL_IMPORT_STATES = ['uploaded', 'processing', 'completed', 'failed'] as const
/** Why a whole import ended `failed`. Mirrors the contract's `DEAL_IMPORT_FAILURE_REASONS`. */
export const DEAL_IMPORT_FAILURE_REASONS = [
  'too_many_rows',
  'unreadable',
  'processing_failed',
] as const
/** The result of one CSV row. Mirrors the contract's `DEAL_IMPORT_ROW_RESULTS`. */
export const DEAL_IMPORT_ROW_RESULTS = ['applied', 'rejected'] as const
/** Why a row was rejected. Mirrors the contract's `DEAL_IMPORT_ROW_REASONS`. */
export const DEAL_IMPORT_ROW_REASONS = [
  'wrong_column_count',
  'invalid_deal_id',
  'duplicate_in_file',
  'invalid_outcome',
  'invalid_closed_at',
  'invalid_amount',
  'invalid_currency',
  'invalid_name',
  'outcome_already_decided',
  'deal_limit_reached',
] as const
/** The longest deal id in code points. Mirrors the contract's `MAX_DEAL_ID_LENGTH`. */
export const DEAL_ID_MAX_LENGTH = 128
/** The most UTF-8 bytes a deal id takes (4 per code point). Mirrors the contract's `MAX_DEAL_ID_BYTES`. */
export const DEAL_ID_MAX_BYTES = 512
/** The longest Deal name in code points. Mirrors the contract's `MAX_DEAL_NAME_LENGTH`. */
export const DEAL_NAME_MAX_LENGTH = 200
/** The most UTF-8 bytes a Deal name takes. Mirrors the contract's `MAX_DEAL_NAME_BYTES`. */
export const DEAL_NAME_MAX_BYTES = 800
/** The most data rows in one CSV. Mirrors the contract's `MAX_DEAL_IMPORT_ROWS`. */
export const DEAL_IMPORT_MAX_ROWS = 50_000
/** The largest CSV in bytes (10 MiB). Mirrors the contract's `MAX_DEAL_IMPORT_BYTES`. */
export const DEAL_IMPORT_MAX_BYTES = 10 * 1024 * 1024
/** The largest sequence number (Outcome sequence). Mirrors the contract's `MAX_DELETION_SEQ`. */
export const DEAL_MAX_SEQ = 2_147_483_647
/** The largest rights wording version. Mirrors the contract's `MAX_RIGHTS_WORDING_VERSION`. */
export const RIGHTS_MAX_WORDING_VERSION = 1_000_000
/** The most times an import job may be claimed: the table's bound, as for ingestion jobs. */
export const DEAL_IMPORT_MAX_ATTEMPTS = 20
/** The most rows one {@link DEAL_IMPORT_APPLY}-style batch may take: the library's batch bound. */
export const DEAL_IMPORT_APPLY_BATCH = 500

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID}'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })

/**
 * A Deal of an Organization (ADR 0018): the record a Call is linked to and a CSV row creates or
 * updates. `deal_id` is the customer's own identifier, trimmed by the service and otherwise
 * compared exactly (`deals_deal_id_key`, unique per Organization); it is customer text, never
 * logged. `outcome` is `won`, `lost` or `open` and `outcome_seq` counts its changes: a trigger
 * demands that a change of Outcome raises it by exactly one and that it never falls, so a
 * re-tag job that carries it cannot finish in the wrong order (as `deletion_seq` for documents).
 * There is **no delete** for the service role: a Deal goes only with its Organization's erasure
 * (`playbook.erase_deals`). `appeared_in_import` says whether any CSV ever named it, so a Deal
 * made only by a Call upload (a typo) can be listed.
 *
 * Lists served (keyset on `(created_at, id)`, newest first): all (`deals_list_idx`), by Outcome
 * (`deals_outcome_list_idx`), by whether it appeared in an import (`deals_import_list_idx`);
 * lookup by the customer's id: `deals_deal_id_key`.
 */
export const deals = playbookSchema.table(
  'deals',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    dealId: text('deal_id').notNull(),
    name: text('name'),
    outcome: text('outcome', { enum: DEAL_OUTCOMES }).notNull().default('open'),
    outcomeSeq: integer('outcome_seq').notNull().default(0),
    // The Outcome sequence through which every ready Call of the Deal is tagged in the index: the Deal needs a re-tag while this is below `outcome_seq`.
    retagThrough: integer('retag_through').notNull().default(0),
    closedAt: ts('closed_at'),
    amount: numeric('amount', { precision: 17, scale: 2 }),
    currency: text('currency'),
    appearedInImport: boolean('appeared_in_import').notNull().default(false),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'deals_pkey', columns: [t.organizationId, t.id] }),
    check('deals_id_shape', idShape('id', 'deal')),
    check('deals_organization_id_shape', idShape('organization_id', 'org')),
    check('deals_organization_not_global', notGlobal),
    check(
      'deals_deal_id_shape',
      sql`char_length(${t.dealId}) between 1 and ${sql.raw(String(DEAL_ID_MAX_LENGTH))}
        and octet_length(${t.dealId}) <= ${sql.raw(String(DEAL_ID_MAX_BYTES))}
        and ${t.dealId} = btrim(${t.dealId}, E' \\t\\n\\r\\f\\v')`
    ),
    check(
      'deals_name_shape',
      sql`${t.name} is null or (char_length(${t.name}) between 1 and ${sql.raw(String(DEAL_NAME_MAX_LENGTH))}
        and octet_length(${t.name}) <= ${sql.raw(String(DEAL_NAME_MAX_BYTES))})`
    ),
    check('deals_outcome_known', sql`${t.outcome} in (${list(DEAL_OUTCOMES)})`),
    check(
      'deals_outcome_seq_range',
      sql`${t.outcomeSeq} between 0 and ${sql.raw(String(DEAL_MAX_SEQ))}`
    ),
    check('deals_amount_range', sql`${t.amount} is null or ${t.amount} >= 0`),
    check('deals_currency_shape', sql`${t.currency} is null or ${t.currency} ~ '^[A-Z]{3}$'`),
    check('deals_amount_has_currency', sql`${t.amount} is null or ${t.currency} is not null`),
    check('deals_retag_through_range', sql`${t.retagThrough} between 0 and ${t.outcomeSeq}`),
    uniqueIndex('deals_deal_id_key').on(t.organizationId, t.dealId),
    // The Deals that need a re-tag: the `outcome_retag` discovery verification and batch.
    index('deals_retag_idx')
      .on(t.organizationId, t.id)
      .where(sql`${t.retagThrough} < ${t.outcomeSeq}`),
    index('deals_list_idx').on(t.organizationId, t.createdAt, t.id),
    index('deals_outcome_list_idx').on(t.organizationId, t.outcome, t.createdAt, t.id),
    index('deals_import_list_idx').on(t.organizationId, t.appearedInImport, t.createdAt, t.id),
  ]
)

/**
 * A Deal import: one uploaded CSV and the job that applies it. The CSV is in object storage under
 * `object_key` until the job ends; the service removes it first and then finishes the import, or
 * (for an erased import) records the removal with `DEAL_IMPORT_OBJECT_REMOVED`. The job's lease
 * is the same as an ingestion job's: `next_attempt_at` is the due time while `uploaded` and the
 * lease end while `processing`, `claim_token` fences a worker whose lease lapsed, and `attempts` is
 * bounded by the table. Rows are applied in batches (`DEAL_IMPORT_APPLY`) that move
 * `applied_count` and `rejected_count` in the same statement that records the report rows, so the
 * counts cannot drift; `row_count` is set when the import completes, and only then. An erased
 * import has `erased_at`, is `failed` and is never claimed again; its report rows and then the
 * import row itself are removed in bounded batches (`DEAL_IMPORT_PURGE_BATCH`).
 */
export const dealImports = playbookSchema.table(
  'deal_imports',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    state: text('state', { enum: DEAL_IMPORT_STATES }).notNull().default('uploaded'),
    failureReason: text('failure_reason', { enum: DEAL_IMPORT_FAILURE_REASONS }),
    uploadedBy: text('uploaded_by').notNull(),
    objectKey: text('object_key').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: ts('next_attempt_at').notNull().defaultNow(),
    claimToken: uuid('claim_token'),
    rowCount: integer('row_count'),
    appliedCount: integer('applied_count').notNull().default(0),
    rejectedCount: integer('rejected_count').notNull().default(0),
    reportThrough: integer('report_through').notNull().default(1),
    objectRemovedAt: ts('object_removed_at'),
    erasedAt: ts('erased_at'),
    finishedAt: ts('finished_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'deal_imports_pkey', columns: [t.organizationId, t.id] }),
    check('deal_imports_id_shape', idShape('id', 'dimp')),
    check('deal_imports_organization_id_shape', idShape('organization_id', 'org')),
    check('deal_imports_organization_not_global', notGlobal),
    check('deal_imports_uploaded_by_shape', idShape('uploaded_by', 'usr')),
    check('deal_imports_state_known', sql`${t.state} in (${list(DEAL_IMPORT_STATES)})`),
    check(
      'deal_imports_failure_reason_known',
      sql`${t.failureReason} is null or ${t.failureReason} in (${list(DEAL_IMPORT_FAILURE_REASONS)})`
    ),
    check(
      'deal_imports_failure_matches_state',
      sql`(${t.state} = 'failed') = (${t.failureReason} is not null)`
    ),
    check(
      'deal_imports_size_range',
      sql`${t.sizeBytes} between 1 and ${sql.raw(String(DEAL_IMPORT_MAX_BYTES))}`
    ),
    check(
      'deal_imports_attempts_range',
      sql`${t.attempts} between 0 and ${sql.raw(String(DEAL_IMPORT_MAX_ATTEMPTS))}`
    ),
    check(
      'deal_imports_counts_range',
      sql`${t.appliedCount} between 0 and ${sql.raw(String(DEAL_IMPORT_MAX_ROWS))}
        and ${t.rejectedCount} between 0 and ${sql.raw(String(DEAL_IMPORT_MAX_ROWS))}
        and ${t.appliedCount} + ${t.rejectedCount} <= ${sql.raw(String(DEAL_IMPORT_MAX_ROWS))}`
    ),
    check(
      'deal_imports_report_contiguous',
      sql`${t.reportThrough} between 1 and ${sql.raw(String(DEAL_IMPORT_MAX_ROWS + 1))}
        and ${t.appliedCount} + ${t.rejectedCount} = ${t.reportThrough} - 1`
    ),
    check(
      'deal_imports_row_count_matches_state',
      sql`(${t.state} = 'completed') = (${t.rowCount} is not null)
        and (${t.rowCount} is null or ${t.rowCount} = ${t.appliedCount} + ${t.rejectedCount})`
    ),
    check(
      'deal_imports_claim_only_while_processing',
      sql`${t.claimToken} is null or ${t.state} = 'processing'`
    ),
    check(
      'deal_imports_finished_matches_state',
      sql`(${t.state} in ('completed', 'failed')) = (${t.finishedAt} is not null)`
    ),
    check(
      'deal_imports_erased_is_final',
      sql`${t.erasedAt} is null or ${t.state} in ('completed', 'failed')`
    ),
    index('deal_imports_list_idx').on(t.organizationId, t.createdAt, t.id),
    index('deal_imports_due_idx')
      .on(t.organizationId, t.nextAttemptAt)
      .where(sql`${t.state} in ('uploaded', 'processing')`),
    index('deal_imports_unerased_idx').on(t.organizationId, t.id).where(sql`${t.erasedAt} is null`),
  ]
)

/**
 * The report of a Deal import, one row per CSV data row: the row number (2 is the first data row,
 * counting the header as 1), the deal id the row named, the result and the reason. **Only those
 * four things are stored**, never another cell, so the report holds no amount, name or date. A
 * row has a deal id unless its id was unusable (`invalid_deal_id`, `wrong_column_count`). The first
 * row of a deal id within an import is unique (`deal_import_rows_first_key`); every later row of it
 * is `duplicate_in_file`, so a repeat is rejected even when two batches race. Listed by row number
 * (`deal_import_rows_pkey`, `deal_import_rows_result_idx` for one result). The foreign key to the
 * import is not cascading: rows go in bounded batches before the import row.
 */
export const dealImportRows = playbookSchema.table(
  'deal_import_rows',
  {
    organizationId: text('organization_id').notNull(),
    importId: text('import_id').notNull(),
    rowNumber: integer('row_number').notNull(),
    dealId: text('deal_id'),
    result: text('result', { enum: DEAL_IMPORT_ROW_RESULTS }).notNull(),
    reason: text('reason', { enum: DEAL_IMPORT_ROW_REASONS }),
  },
  (t) => [
    primaryKey({
      name: 'deal_import_rows_pkey',
      columns: [t.organizationId, t.importId, t.rowNumber],
    }),
    foreignKey({
      name: 'deal_import_rows_import_fkey',
      columns: [t.organizationId, t.importId],
      foreignColumns: [dealImports.organizationId, dealImports.id],
    }),
    check('deal_import_rows_organization_id_shape', idShape('organization_id', 'org')),
    check('deal_import_rows_organization_not_global', notGlobal),
    check(
      'deal_import_rows_row_number_range',
      sql`${t.rowNumber} between 2 and ${sql.raw(String(DEAL_IMPORT_MAX_ROWS + 1))}`
    ),
    check('deal_import_rows_result_known', sql`${t.result} in (${list(DEAL_IMPORT_ROW_RESULTS)})`),
    check(
      'deal_import_rows_reason_known',
      sql`${t.reason} is null or ${t.reason} in (${list(DEAL_IMPORT_ROW_REASONS)})`
    ),
    check(
      'deal_import_rows_reason_matches_result',
      sql`(${t.result} = 'rejected') = (${t.reason} is not null)`
    ),
    check(
      'deal_import_rows_deal_id_shape',
      sql`${t.dealId} is null or (char_length(${t.dealId}) between 1 and ${sql.raw(String(DEAL_ID_MAX_LENGTH))}
        and octet_length(${t.dealId}) <= ${sql.raw(String(DEAL_ID_MAX_BYTES))})`
    ),
    check(
      'deal_import_rows_deal_id_missing_only_when_unusable',
      sql`${t.dealId} is not null or ${t.reason} in ('invalid_deal_id', 'wrong_column_count')`
    ),
    uniqueIndex('deal_import_rows_first_key')
      .on(t.organizationId, t.importId, t.dealId)
      .where(sql`${t.dealId} is not null and ${t.reason} is distinct from 'duplicate_in_file'`),
    index('deal_import_rows_result_idx').on(t.organizationId, t.importId, t.result, t.rowNumber),
  ]
)

/**
 * The rights confirmation of ADR 0018, choice 12: one row per Organization, saying which member
 * confirmed that the Organization may share its Recordings and Transcripts, when, and the version
 * of the wording shown. A newer version replaces it (`RIGHTS_CONFIRM`); the wording itself is not
 * here. Whether the stored version is the current one is the service's number to compare.
 */
export const rightsConfirmations = playbookSchema.table(
  'rights_confirmations',
  {
    organizationId: text('organization_id').primaryKey(),
    confirmedBy: text('confirmed_by').notNull(),
    confirmedAt: ts('confirmed_at').notNull().defaultNow(),
    wordingVersion: integer('wording_version').notNull(),
  },
  (t) => [
    check('rights_confirmations_organization_id_shape', idShape('organization_id', 'org')),
    check('rights_confirmations_organization_not_global', notGlobal),
    check('rights_confirmations_confirmed_by_shape', idShape('confirmed_by', 'usr')),
    check(
      'rights_confirmations_wording_version_range',
      sql`${t.wordingVersion} between 1 and ${sql.raw(String(RIGHTS_MAX_WORDING_VERSION))}`
    ),
  ]
)
