import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  customType,
  foreignKey,
  index,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { coreSchema } from './core'
import { organizations } from './core-tables'

/*
 * The values below mirror the contract at tag v0.38.0 (`tula-closeline-contract`, `src/crm`); this
 * library does not depend on the contract, so each carries the name of the constant it copies.
 * `core-crm.test.ts` pins every value to the number or list written there. The design is ADR 0022
 * (CRM sync): core owns the connection, the tokens are stored sealed, one connection per provider
 * per Organization.
 */

/** The CRMs Closeline connects to. Mirrors the contract's `CRM_PROVIDERS`. */
export const CRM_PROVIDERS = ['hubspot', 'salesforce'] as const
/** The kinds of CRM object a run pulls. Mirrors the contract's `CRM_OBJECT_KINDS`. */
export const CRM_OBJECT_KINDS = ['deal', 'call', 'company', 'contact'] as const
/** What a connection can do. Mirrors the contract's `CRM_SCOPE_LEVELS`. */
export const CRM_SCOPE_LEVELS = ['read', 'read_write'] as const
/** The states of a stored connection. Mirrors the contract's `CRM_CONNECTION_STATES`. */
export const CRM_CONNECTION_STATES = ['connected', 'needs_reconnect'] as const
/** Which way a field moves. Mirrors the contract's `CRM_DIRECTIONS`. */
export const CRM_DIRECTIONS = ['read_only', 'write_only', 'both'] as const
/** What a CRM deal stage means to Closeline. Mirrors the contract's `CRM_STAGE_OUTCOMES`. */
export const CRM_STAGE_OUTCOMES = ['won', 'lost', 'open'] as const
/** The fields with a direction setting. Mirrors the contract's `CRM_FIELD_KEYS`. */
export const CRM_FIELD_KEYS = [
  'deal.outcome',
  'company.name',
  'company.domain',
  'company.industry',
  'company.employeeCount',
  'company.region',
  'company.technologies',
  'contact.firstName',
  'contact.lastName',
  'contact.jobTitle',
  'contact.email',
  'contact.phone',
  'contact.linkedinUrl',
  'activity.notes',
] as const
/** The kinds of row in `crm_mapping`: a deal stage or a field direction. */
export const CRM_MAPPING_KINDS = ['stage', 'field'] as const
/** Why a run started. Mirrors the contract's `CRM_RUN_TRIGGERS`. */
export const CRM_RUN_TRIGGERS = ['first_load', 'manual', 'webhook', 'sweep', 'retry'] as const
/** Where a run is. Mirrors the contract's `CRM_RUN_STATES`. */
export const CRM_RUN_STATES = ['queued', 'running', 'completed', 'failed'] as const
/** The crm codes a run can end with. Mirrors the contract's `CRM_RUN_ERROR_CODES`. */
export const CRM_RUN_ERROR_CODES = [
  'crm.needs_reconnect',
  'crm.rate_limited',
  'crm.mapping_incomplete',
  'crm.rights_not_confirmed',
] as const
/** The states of an external reference: linked, a write recorded before its call, or a Deal gone from the CRM. */
export const CRM_REF_STATES = ['linked', 'pending_write', 'unlinked'] as const
/** The longest id of a CRM's own record, stage, pipeline or account. Mirrors the contract's `MAX_CRM_EXTERNAL_ID_LENGTH`. */
export const MAX_CRM_EXTERNAL_ID_LENGTH = 128
/** The longest display label read from a CRM. Mirrors the contract's `MAX_CRM_LABEL_LENGTH`. */
export const MAX_CRM_LABEL_LENGTH = 200
/** The largest count a run reports. Mirrors the contract's `countSchema` maximum. */
export const MAX_CRM_RUN_COUNT = 100_000_000
/** How many skip reasons the contract's `CRM_SKIP_REASONS` lists; the report holds one entry per reason. */
export const CRM_SKIP_REASON_COUNT = 4
/** The most failed records a run names. Mirrors the contract's `MAX_CRM_RUN_FAILURES`. */
export const MAX_CRM_RUN_FAILURES = 50
/** The longest sealed token, in bytes of ciphertext (the nonce and tag included). */
export const MAX_CRM_SEALED_TOKEN_BYTES = 16_384
/** The longest key id a sealed token names, in characters. */
export const MAX_CRM_KEY_ID_LENGTH = 128
/** The longest provider cursor or object version, in characters. */
export const MAX_CRM_CURSOR_LENGTH = 1024
/** The longest deterministic write key (ADR 0022), in characters. */
export const MAX_CRM_WRITE_KEY_LENGTH = 256
/** The longest local id a reference points at, in characters. */
export const MAX_CRM_LOCAL_ID_LENGTH = 128
/** Seconds a webhook receipt is kept at least: the contract's `CRM_WEBHOOK_WINDOW_SECONDS`; core prunes by age with a margin. */
export const CRM_WEBHOOK_WINDOW_SECONDS = 300

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })
const lengthBetween = (column: string, max: number) =>
  sql.raw(`char_length("${column}") between 1 and ${max}`)

const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
})

/**
 * An Organization's connection to one CRM (ADR 0022). At most one per provider per Organization
 * (`crm_connection_provider_key`), and an external account belongs to at most one Organization
 * (`crm_connection_account_key` is unique across Organizations on purpose: a unique index is
 * checked whatever the row-level security hides, so connecting an account another Organization
 * holds is refused by the database and names no Organization). Disconnecting deletes the row and,
 * through the foreign keys, its mapping, runs, references and receipts.
 *
 * Tokens are stored sealed: `access_token_sealed` and `refresh_token_sealed` hold ciphertext from
 * core's `SecretBox`, bound to the Organization and connection id, and `token_key_id` names the
 * key that sealed them. There is no plaintext token column and never one. The two ciphertexts are
 * both sealed under that key; a ciphertext without a key id is refused.
 *
 * `connected_by_membership_id` has no foreign key: a member who leaves must neither block nor
 * delete the Organization's connection. The Stage mapping is confirmed once an Owner or Admin
 * saves it (`stage_mapping_confirmed_*`, both set or both null).
 *
 * Lists served: the Organization's connections by id (`crm_connection_pkey`) and one provider's
 * (`crm_connection_provider_key`).
 */
export const crmConnections = coreSchema.table(
  'crm_connection',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    provider: text('provider', { enum: CRM_PROVIDERS }).notNull(),
    state: text('state', { enum: CRM_CONNECTION_STATES }).notNull().default('connected'),
    externalAccountId: text('external_account_id').notNull(),
    accountLabel: text('account_label'),
    scopeLevel: text('scope_level', { enum: CRM_SCOPE_LEVELS }).notNull().default('read'),
    accessTokenSealed: bytes('access_token_sealed'),
    refreshTokenSealed: bytes('refresh_token_sealed'),
    tokenKeyId: text('token_key_id'),
    accessTokenExpiresAt: ts('access_token_expires_at'),
    connectedByMembershipId: text('connected_by_membership_id').notNull(),
    connectedAt: ts('connected_at').notNull().defaultNow(),
    lastSyncedAt: ts('last_synced_at'),
    needsReconnectSince: ts('needs_reconnect_since'),
    stageMappingConfirmedByMembershipId: text('stage_mapping_confirmed_by_membership_id'),
    stageMappingConfirmedAt: ts('stage_mapping_confirmed_at'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'crm_connection_pkey', columns: [t.organizationId, t.id] }),
    check('crm_connection_id_shape', idShape('id', 'crn')),
    check('crm_connection_organization_id_shape', orgShape),
    check('crm_connection_organization_not_global', notGlobal),
    check('crm_connection_provider_known', sql`${t.provider} in (${list(CRM_PROVIDERS)})`),
    check('crm_connection_state_known', sql`${t.state} in (${list(CRM_CONNECTION_STATES)})`),
    check('crm_connection_scope_level_known', sql`${t.scopeLevel} in (${list(CRM_SCOPE_LEVELS)})`),
    check(
      'crm_connection_external_account_id_shape',
      lengthBetween('external_account_id', MAX_CRM_EXTERNAL_ID_LENGTH)
    ),
    check(
      'crm_connection_account_label_shape',
      sql`${t.accountLabel} is null or char_length(${t.accountLabel}) between 1 and ${sql.raw(String(MAX_CRM_LABEL_LENGTH))}`
    ),
    check(
      'crm_connection_connected_by_membership_id_shape',
      idShape('connected_by_membership_id', 'mem')
    ),
    check(
      'crm_connection_stage_mapping_confirmed_by_shape',
      idShape('stage_mapping_confirmed_by_membership_id', 'mem')
    ),
    check(
      'crm_connection_access_token_sealed_size',
      sql`${t.accessTokenSealed} is null or octet_length(${t.accessTokenSealed}) between 1 and ${sql.raw(String(MAX_CRM_SEALED_TOKEN_BYTES))}`
    ),
    check(
      'crm_connection_refresh_token_sealed_size',
      sql`${t.refreshTokenSealed} is null or octet_length(${t.refreshTokenSealed}) between 1 and ${sql.raw(String(MAX_CRM_SEALED_TOKEN_BYTES))}`
    ),
    check(
      'crm_connection_token_key_id_shape',
      sql`${t.tokenKeyId} is null or char_length(${t.tokenKeyId}) between 1 and ${sql.raw(String(MAX_CRM_KEY_ID_LENGTH))}`
    ),
    check(
      'crm_connection_sealed_tokens_have_key_id',
      sql`(${t.accessTokenSealed} is null and ${t.refreshTokenSealed} is null) or ${t.tokenKeyId} is not null`
    ),
    check(
      'crm_connection_access_expiry_needs_token',
      sql`${t.accessTokenExpiresAt} is null or ${t.accessTokenSealed} is not null`
    ),
    check(
      'crm_connection_needs_reconnect_since',
      sql`(${t.state} = 'needs_reconnect') = (${t.needsReconnectSince} is not null)`
    ),
    check(
      'crm_connection_stage_mapping_confirmation',
      sql`(${t.stageMappingConfirmedByMembershipId} is null) = (${t.stageMappingConfirmedAt} is null)`
    ),
    uniqueIndex('crm_connection_provider_key').on(t.organizationId, t.provider),
    uniqueIndex('crm_connection_account_key').on(t.provider, t.externalAccountId),
    // The target of the composite foreign keys that must agree with a connection's provider.
    uniqueIndex('crm_connection_provider_id_key').on(t.organizationId, t.id, t.provider),
  ]
)

/**
 * One line of a connection's mapping: a deal stage and the Outcome an Admin gave it (`kind =
 * 'stage'`, `key` the CRM's stage id, `label` its display name), or a field's direction (`kind =
 * 'field'`, `key` one of `CRM_FIELD_KEYS`). A field with no row is `read_only`. `activity.notes`
 * is never `both`. Saving the whole Stage mapping replaces its `stage` rows in one transaction;
 * the 500-stage limit is the service's, not the database's.
 *
 * Lists served (by key, keyset `key > $cursor`): a connection's stage lines and field lines,
 * both on `crm_mapping_pkey`.
 */
export const crmMappings = coreSchema.table(
  'crm_mapping',
  {
    organizationId: text('organization_id').notNull(),
    connectionId: text('connection_id').notNull(),
    kind: text('kind', { enum: CRM_MAPPING_KINDS }).notNull(),
    key: text('key').notNull(),
    outcome: text('outcome', { enum: CRM_STAGE_OUTCOMES }),
    label: text('label'),
    direction: text('direction', { enum: CRM_DIRECTIONS }),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'crm_mapping_pkey',
      columns: [t.organizationId, t.connectionId, t.kind, t.key],
    }),
    check('crm_mapping_organization_id_shape', orgShape),
    check('crm_mapping_organization_not_global', notGlobal),
    check('crm_mapping_connection_id_shape', idShape('connection_id', 'crn')),
    check('crm_mapping_kind_known', sql`${t.kind} in (${list(CRM_MAPPING_KINDS)})`),
    check('crm_mapping_key_shape', lengthBetween('key', MAX_CRM_EXTERNAL_ID_LENGTH)),
    check(
      'crm_mapping_outcome_known',
      sql`${t.outcome} is null or ${t.outcome} in (${list(CRM_STAGE_OUTCOMES)})`
    ),
    check(
      'crm_mapping_direction_known',
      sql`${t.direction} is null or ${t.direction} in (${list(CRM_DIRECTIONS)})`
    ),
    check(
      'crm_mapping_label_shape',
      sql`${t.label} is null or char_length(${t.label}) between 1 and ${sql.raw(String(MAX_CRM_LABEL_LENGTH))}`
    ),
    check(
      'crm_mapping_kind_columns',
      sql`(${t.kind} = 'stage' and ${t.outcome} is not null and ${t.direction} is null)
        or (${t.kind} = 'field' and ${t.direction} is not null and ${t.outcome} is null and ${t.label} is null and ${t.key} in (${list(CRM_FIELD_KEYS)}))`
    ),
    check(
      'crm_mapping_notes_never_both',
      sql`${t.key} <> 'activity.notes' or ${t.direction} is distinct from 'both'`
    ),
    foreignKey({
      name: 'crm_mapping_connection_fk',
      columns: [t.organizationId, t.connectionId],
      foreignColumns: [crmConnections.organizationId, crmConnections.id],
    }).onDelete('cascade'),
  ]
)

const jsonArrayBounded = (column: string, max: number) =>
  sql.raw(`jsonb_typeof("${column}") = 'array' and jsonb_array_length("${column}") <= ${max}`)

/**
 * One sync run of one kind of CRM object and its report (ADR 0022). The counts are exact; the
 * three jsonb columns hold the report: `skipped` (`{reason, count}` by closed reason),
 * `skipped_fields` (`{field, count}` by field a manual value protected) and `failures`
 * (`{objectRef, reason}`, at most 50, the CRM's record id and a closed reason, never a message or
 * CRM data). `cursor` is the provider cursor reached, written only after a page commits; the next
 * run for a kind starts from the newest run's cursor that has one. It is never returned by the API.
 *
 * Lifecycle: `queued` has no start or end; `running` has a start and no end; `completed` and
 * `failed` have an end; only `failed` carries an error code.
 *
 * Lists served (newest first, keyset `(requested_at, id)`): a connection's runs
 * (`crm_sync_runs_list_idx`), narrowed to one state (`crm_sync_runs_state_list_idx`) or one object
 * kind (`crm_sync_runs_kind_list_idx`, which also finds the cursor to resume from).
 */
export const crmSyncRuns = coreSchema.table(
  'crm_sync_run',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    connectionId: text('connection_id').notNull(),
    objectKind: text('object_kind', { enum: CRM_OBJECT_KINDS }).notNull(),
    trigger: text('trigger', { enum: CRM_RUN_TRIGGERS }).notNull(),
    state: text('state', { enum: CRM_RUN_STATES }).notNull().default('queued'),
    requestedAt: ts('requested_at').notNull().defaultNow(),
    requestedByMembershipId: text('requested_by_membership_id'),
    startedAt: ts('started_at'),
    completedAt: ts('completed_at'),
    createdCount: bigint('created_count', { mode: 'number' }).notNull().default(0),
    updatedCount: bigint('updated_count', { mode: 'number' }).notNull().default(0),
    skippedCount: bigint('skipped_count', { mode: 'number' }).notNull().default(0),
    failedCount: bigint('failed_count', { mode: 'number' }).notNull().default(0),
    unlinkedCount: bigint('unlinked_count', { mode: 'number' }).notNull().default(0),
    skipped: jsonb('skipped').notNull().default(sql`'[]'::jsonb`),
    skippedFields: jsonb('skipped_fields').notNull().default(sql`'[]'::jsonb`),
    failures: jsonb('failures').notNull().default(sql`'[]'::jsonb`),
    failuresTruncated: boolean('failures_truncated').notNull().default(false),
    errorCode: text('error_code', { enum: CRM_RUN_ERROR_CODES }),
    retryOfRunId: text('retry_of_run_id'),
    cursor: text('cursor'),
  },
  (t) => [
    primaryKey({ name: 'crm_sync_run_pkey', columns: [t.organizationId, t.id] }),
    check('crm_sync_run_id_shape', idShape('id', 'crun')),
    check('crm_sync_run_organization_id_shape', orgShape),
    check('crm_sync_run_organization_not_global', notGlobal),
    check('crm_sync_run_connection_id_shape', idShape('connection_id', 'crn')),
    check(
      'crm_sync_run_requested_by_membership_id_shape',
      idShape('requested_by_membership_id', 'mem')
    ),
    check('crm_sync_run_retry_of_run_id_shape', idShape('retry_of_run_id', 'crun')),
    check('crm_sync_run_object_kind_known', sql`${t.objectKind} in (${list(CRM_OBJECT_KINDS)})`),
    check('crm_sync_run_trigger_known', sql`${t.trigger} in (${list(CRM_RUN_TRIGGERS)})`),
    check('crm_sync_run_state_known', sql`${t.state} in (${list(CRM_RUN_STATES)})`),
    check(
      'crm_sync_run_error_code_known',
      sql`${t.errorCode} is null or ${t.errorCode} in (${list(CRM_RUN_ERROR_CODES)})`
    ),
    check(
      'crm_sync_run_counts_bounds',
      sql`${t.createdCount} between 0 and ${sql.raw(String(MAX_CRM_RUN_COUNT))}
        and ${t.updatedCount} between 0 and ${sql.raw(String(MAX_CRM_RUN_COUNT))}
        and ${t.skippedCount} between 0 and ${sql.raw(String(MAX_CRM_RUN_COUNT))}
        and ${t.failedCount} between 0 and ${sql.raw(String(MAX_CRM_RUN_COUNT))}
        and ${t.unlinkedCount} between 0 and ${sql.raw(String(MAX_CRM_RUN_COUNT))}`
    ),
    check('crm_sync_run_skipped_shape', jsonArrayBounded('skipped', CRM_SKIP_REASON_COUNT)),
    check(
      'crm_sync_run_skipped_fields_shape',
      jsonArrayBounded('skipped_fields', CRM_FIELD_KEYS.length)
    ),
    check('crm_sync_run_failures_shape', jsonArrayBounded('failures', MAX_CRM_RUN_FAILURES)),
    check(
      'crm_sync_run_cursor_shape',
      sql`${t.cursor} is null or char_length(${t.cursor}) between 1 and ${sql.raw(String(MAX_CRM_CURSOR_LENGTH))}`
    ),
    check(
      'crm_sync_run_lifecycle',
      sql`(${t.state} = 'queued' and ${t.startedAt} is null and ${t.completedAt} is null)
        or (${t.state} = 'running' and ${t.startedAt} is not null and ${t.completedAt} is null)
        or (${t.state} in ('completed', 'failed') and ${t.completedAt} is not null)`
    ),
    check(
      'crm_sync_run_error_code_only_when_failed',
      sql`${t.errorCode} is null or ${t.state} = 'failed'`
    ),
    foreignKey({
      name: 'crm_sync_run_connection_fk',
      columns: [t.organizationId, t.connectionId],
      foreignColumns: [crmConnections.organizationId, crmConnections.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'crm_sync_run_retry_of_fk',
      columns: [t.organizationId, t.retryOfRunId],
      foreignColumns: [t.organizationId, t.id],
    }),
    index('crm_sync_runs_retry_of_idx').on(t.organizationId, t.retryOfRunId),
    index('crm_sync_runs_list_idx').on(
      t.organizationId,
      t.connectionId,
      t.requestedAt.desc(),
      t.id.desc()
    ),
    index('crm_sync_runs_state_list_idx').on(
      t.organizationId,
      t.connectionId,
      t.state,
      t.requestedAt.desc(),
      t.id.desc()
    ),
    index('crm_sync_runs_kind_list_idx').on(
      t.organizationId,
      t.connectionId,
      t.objectKind,
      t.requestedAt.desc(),
      t.id.desc()
    ),
  ]
)

/**
 * Where one CRM object and one Closeline object meet (ADR 0022): the CRM's id for a Deal, Call,
 * company or contact, the Closeline id it maps to, and the last version seen, so a returning
 * change that carries our own version is recognised as an echo.
 *
 * The primary key is the identity of the reference; what makes sync idempotent is the unique key
 * on (Organization, provider, object kind, external id): a second reference to one CRM object is
 * refused. The reference belongs to the connection (an account's ids mean nothing in another
 * account) and is removed with it. The provider is repeated here only to build that key, and a
 * composite foreign key keeps it equal to the connection's.
 *
 * A write to the CRM is recorded here before its call: a `pending_write` row has a `write_key`
 * (Closeline object id plus version) and no external id yet; the retry of a lost response finds
 * the row by that key and the provider id once it is recorded, instead of creating again. A Deal
 * deleted in the CRM is `unlinked`, not removed.
 *
 * Lookups served: by CRM id (the unique key), by local id (`crm_external_refs_local_idx`, not
 * unique, because two CRM records may map to one Prospect), by write key
 * (`crm_external_ref_write_key`) and a connection's references in id order
 * (`crm_external_refs_connection_idx`, which also serves the cascade).
 */
export const crmExternalRefs = coreSchema.table(
  'crm_external_ref',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    connectionId: text('connection_id').notNull(),
    provider: text('provider', { enum: CRM_PROVIDERS }).notNull(),
    objectKind: text('object_kind', { enum: CRM_OBJECT_KINDS }).notNull(),
    externalId: text('external_id'),
    localId: text('local_id').notNull(),
    state: text('state', { enum: CRM_REF_STATES }).notNull().default('linked'),
    lastSeenVersion: text('last_seen_version'),
    lastSeenAt: ts('last_seen_at'),
    writeKey: text('write_key'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'crm_external_ref_pkey', columns: [t.organizationId, t.id] }),
    check('crm_external_ref_id_shape', idShape('id', 'cxr')),
    check('crm_external_ref_organization_id_shape', orgShape),
    check('crm_external_ref_organization_not_global', notGlobal),
    check('crm_external_ref_connection_id_shape', idShape('connection_id', 'crn')),
    check('crm_external_ref_provider_known', sql`${t.provider} in (${list(CRM_PROVIDERS)})`),
    check(
      'crm_external_ref_object_kind_known',
      sql`${t.objectKind} in (${list(CRM_OBJECT_KINDS)})`
    ),
    check('crm_external_ref_state_known', sql`${t.state} in (${list(CRM_REF_STATES)})`),
    check(
      'crm_external_ref_external_id_shape',
      sql`${t.externalId} is null or char_length(${t.externalId}) between 1 and ${sql.raw(String(MAX_CRM_EXTERNAL_ID_LENGTH))}`
    ),
    check('crm_external_ref_local_id_shape', lengthBetween('local_id', MAX_CRM_LOCAL_ID_LENGTH)),
    check(
      'crm_external_ref_last_seen_version_shape',
      sql`${t.lastSeenVersion} is null or char_length(${t.lastSeenVersion}) between 1 and ${sql.raw(String(MAX_CRM_CURSOR_LENGTH))}`
    ),
    check(
      'crm_external_ref_write_key_shape',
      sql`${t.writeKey} is null or char_length(${t.writeKey}) between 1 and ${sql.raw(String(MAX_CRM_WRITE_KEY_LENGTH))}`
    ),
    check(
      'crm_external_ref_state_columns',
      sql`(${t.state} = 'pending_write' and ${t.writeKey} is not null)
        or (${t.state} in ('linked', 'unlinked') and ${t.externalId} is not null)`
    ),
    foreignKey({
      name: 'crm_external_ref_connection_fk',
      columns: [t.organizationId, t.connectionId, t.provider],
      foreignColumns: [crmConnections.organizationId, crmConnections.id, crmConnections.provider],
    }).onDelete('cascade'),
    uniqueIndex('crm_external_ref_object_key').on(
      t.organizationId,
      t.provider,
      t.objectKind,
      t.externalId
    ),
    uniqueIndex('crm_external_ref_write_key')
      .on(t.organizationId, t.provider, t.writeKey)
      .where(sql`${t.writeKey} is not null`),
    index('crm_external_refs_local_idx').on(t.organizationId, t.provider, t.objectKind, t.localId),
    index('crm_external_refs_connection_idx').on(t.organizationId, t.connectionId, t.id),
  ]
)

/**
 * A webhook delivery already accepted (ADR 0022), so a replayed delivery is refused: the primary
 * key is (Organization, connection, provider event id), and recording the same event twice is a
 * unique violation. The key is scoped to the connection, so one Organization's event ids can
 * neither block nor reveal another's. A receipt is kept for the timestamp window plus a margin
 * and pruned by age (`crm_webhook_receipts_age_idx`); nothing from the payload is stored.
 */
export const crmWebhookReceipts = coreSchema.table(
  'crm_webhook_receipt',
  {
    organizationId: text('organization_id').notNull(),
    connectionId: text('connection_id').notNull(),
    eventId: text('event_id').notNull(),
    receivedAt: ts('received_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'crm_webhook_receipt_pkey',
      columns: [t.organizationId, t.connectionId, t.eventId],
    }),
    check('crm_webhook_receipt_organization_id_shape', orgShape),
    check('crm_webhook_receipt_organization_not_global', notGlobal),
    check('crm_webhook_receipt_connection_id_shape', idShape('connection_id', 'crn')),
    check(
      'crm_webhook_receipt_event_id_shape',
      lengthBetween('event_id', MAX_CRM_EXTERNAL_ID_LENGTH)
    ),
    foreignKey({
      name: 'crm_webhook_receipt_connection_fk',
      columns: [t.organizationId, t.connectionId],
      foreignColumns: [crmConnections.organizationId, crmConnections.id],
    }).onDelete('cascade'),
    index('crm_webhook_receipts_age_idx').on(t.organizationId, t.receivedAt),
  ]
)
