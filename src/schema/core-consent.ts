import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  customType,
  foreignKey,
  index,
  integer,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { coreSchema } from './core'
import { prospects } from './core-prospects'
import { organizations } from './core-tables'

/*
 * The values below mirror the contract at tag v0.23.0 (`tula-closeline-contract`, `src/consent`);
 * this library does not depend on the contract, so each carries the name of the constant it copies.
 * `core-consent.test.ts` pins every value to the number or list written there. The design is
 * ADR 0021 (proposed): an append-only ledger, per-Organization Suppression, an audit of every
 * Contact Check.
 */

/** The channels a Prospect can be contacted on. Mirrors the contract's `CONSENT_CHANNELS`. */
export const CONSENT_CHANNELS = ['phone', 'sms', 'whatsapp', 'email', 'linkedin'] as const
/** Where a granted consent came from. Mirrors the contract's `CONSENT_GRANT_SOURCES`. */
export const CONSENT_GRANT_SOURCES = [
  'hosted_form',
  'verbal_call',
  'import_attestation',
  'crm',
  'manual',
] as const
/** Where a withdrawal came from. Mirrors the contract's `CONSENT_WITHDRAWAL_SOURCES`. */
export const CONSENT_WITHDRAWAL_SOURCES = ['unsubscribe', 'stop_reply', 'manual', 'crm'] as const
/** The kinds of ledger event. */
export const CONSENT_EVENT_KINDS = ['granted', 'withdrawn'] as const
/** The longest evidence reference, in characters. Mirrors the contract's `MAX_EVIDENCE_REF_LENGTH`. */
export const MAX_EVIDENCE_REF_LENGTH = 200
/** The longest submitter IP address stored with a hosted-form grant. Mirrors the contract. */
export const MAX_SUBMISSION_IP_LENGTH = 64
/** The longest submitter user agent stored with a hosted-form grant. Mirrors the contract. */
export const MAX_SUBMISSION_USER_AGENT_LENGTH = 512
/** The longest Consent Wording, in characters. Mirrors the contract's `MAX_CONSENT_WORDING_LENGTH`. */
export const MAX_CONSENT_WORDING_LENGTH = 5000
/** The longest hosted form name, in characters. Mirrors the contract's `MAX_CONSENT_FORM_NAME_LENGTH`. */
export const MAX_CONSENT_FORM_NAME_LENGTH = 100
/** The states of a hosted consent form. Mirrors the contract's `CONSENT_FORM_STATES`. */
export const CONSENT_FORM_STATES = ['draft', 'published', 'closed'] as const
/** Why an address is suppressed. Mirrors the contract's `SUPPRESSION_REASONS`. */
export const SUPPRESSION_REASONS = [
  'unsubscribe',
  'stop',
  'bounce',
  'complaint',
  'manual',
  'crm',
  'erased',
] as const
/** The kinds of address a Suppression entry is kept for. Mirrors the contract's `SUPPRESSION_ADDRESS_KINDS`. */
export const SUPPRESSION_ADDRESS_KINDS = ['email', 'phone', 'linkedin'] as const
/** The reasons whose entry may be removed. Mirrors the contract's `SUPPRESSION_REMOVABLE_REASONS`. */
export const SUPPRESSION_REMOVABLE_REASONS = ['manual'] as const
/** The longest reason or note on a Suppression change. Mirrors the contract's `MAX_SUPPRESSION_NOTE_LENGTH`. */
export const MAX_SUPPRESSION_NOTE_LENGTH = 500
/** The longest source reference, in characters. Mirrors the contract's `MAX_SUPPRESSION_SOURCE_REF_LENGTH`. */
export const MAX_SUPPRESSION_SOURCE_REF_LENGTH = 200
/** The longest masked address, in characters. Mirrors the contract's `maskedAddressSchema`. */
export const MAX_MASKED_ADDRESS_LENGTH = 100
/** The purposes of a Contact Check. Mirrors the contract's `CONTACT_PURPOSES`. */
export const CONTACT_PURPOSES = ['agent_initiated', 'rep_initiated', 'reply'] as const
/** The denial codes a logged check carries; `consent.unavailable` is never logged. Mirrors the contract's `CONTACT_DENIAL_CODES` less that one. */
export const LOGGED_DENIAL_CODES = [
  'consent.missing',
  'consent.withdrawn',
  'consent.suppressed',
] as const
/** Why a contact was allowed. Mirrors the contract's `CONTACT_ALLOW_BASES`. */
export const CONTACT_ALLOW_BASES = [
  'consent_granted',
  'rep_initiated',
  'reply',
  'email_no_suppression',
] as const
/** The longest name of a calling service. Mirrors the contract's check request. */
export const MAX_CALLER_LENGTH = 32
/** The bytes of a salted address hash (HMAC-SHA-256). */
export const ADDRESS_HASH_BYTES = 32
/** The days a Contact Check log row is kept (ADR 0021, proposed); core purges older rows. */
export const CONTACT_CHECK_RETENTION_DAYS = 90
/** The characters of a signed form token (22 to 256 of them; a regex cannot repeat more than 255). Mirrors the contract's `consentTokenSchema`. */
export const FORM_TOKEN_PATTERN = '^[A-Za-z0-9_-]+$'
/** The shortest signed form token, in characters. */
export const MIN_FORM_TOKEN_LENGTH = 22
/** The longest signed form token, in characters. */
export const MAX_FORM_TOKEN_LENGTH = 256

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })

const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
})
const textArray = customType<{ data: string[]; driverData: string[] }>({
  dataType: () => 'text[]',
})

/** The channels array check: one to five distinct known channels (a function: no subqueries in a CHECK). */
const channelsValid = (column: string) => sql.raw(`core.consent_channels_valid("${column}")`)

/**
 * A Consent Wording: the exact text a Prospect is shown when agreeing, for the channels it covers.
 * Editable only while nothing references it; once a ledger event or a published or closed form
 * does, a trigger refuses any change (`core.consent_wording_locked`) and a change is a new version
 * naming the one it replaces in `supersedes_id`. Version 1 supersedes nothing. A referenced
 * wording cannot be deleted (the foreign keys); deleting the Organization removes everything.
 *
 * Lists served (newest first, keyset `(created_at, id)`): `consent_wordings_list_idx`.
 */
export const consentWordings = coreSchema.table(
  'consent_wording',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    text: text('text').notNull(),
    channels: textArray('channels').notNull(),
    supersedesId: text('supersedes_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
    createdByUserId: text('created_by_user_id').notNull(),
  },
  (t) => [
    primaryKey({ name: 'consent_wording_pkey', columns: [t.organizationId, t.id] }),
    check('consent_wording_id_shape', idShape('id', 'cwd')),
    check('consent_wording_organization_id_shape', orgShape),
    check('consent_wording_organization_not_global', notGlobal),
    check('consent_wording_supersedes_id_shape', idShape('supersedes_id', 'cwd')),
    check('consent_wording_created_by_user_id_shape', idShape('created_by_user_id', 'usr')),
    check('consent_wording_version_bounds', sql`${t.version} >= 1`),
    check(
      'consent_wording_version_matches_lineage',
      sql`(${t.version} = 1) = (${t.supersedesId} is null)`
    ),
    check(
      'consent_wording_text_shape',
      sql`char_length(${t.text}) between 1 and ${sql.raw(String(MAX_CONSENT_WORDING_LENGTH))} and ${t.text} = btrim(${t.text})`
    ),
    check('consent_wording_channels_valid', channelsValid('channels')),
    foreignKey({
      name: 'consent_wording_supersedes_fk',
      columns: [t.organizationId, t.supersedesId],
      foreignColumns: [t.organizationId, t.id],
    }),
    index('consent_wordings_list_idx').on(t.organizationId, t.createdAt.desc(), t.id.desc()),
    uniqueIndex('consent_wording_supersedes_key')
      .on(t.organizationId, t.supersedesId)
      .where(sql`${t.supersedesId} is not null`),
  ]
)

/**
 * A hosted consent form: a wording and the channels it offers. `token` is the one credential of
 * the public routes, null while a draft, unique across Organizations. `published_at` is set once
 * published and kept when closed; `closed_at` exactly when closed. Publishing locks the wording.
 *
 * Lists served (newest first, keyset `(created_at, id)`, optionally one state):
 * `consent_forms_list_idx` and `consent_forms_state_list_idx`.
 */
export const consentForms = coreSchema.table(
  'consent_form',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    wordingId: text('wording_id').notNull(),
    name: text('name').notNull(),
    channels: textArray('channels').notNull(),
    state: text('state', { enum: CONSENT_FORM_STATES }).notNull().default('draft'),
    token: text('token'),
    createdAt: ts('created_at').notNull().defaultNow(),
    createdByUserId: text('created_by_user_id').notNull(),
    publishedAt: ts('published_at'),
    closedAt: ts('closed_at'),
  },
  (t) => [
    primaryKey({ name: 'consent_form_pkey', columns: [t.organizationId, t.id] }),
    check('consent_form_id_shape', idShape('id', 'cfm')),
    check('consent_form_organization_id_shape', orgShape),
    check('consent_form_organization_not_global', notGlobal),
    check('consent_form_wording_id_shape', idShape('wording_id', 'cwd')),
    check('consent_form_created_by_user_id_shape', idShape('created_by_user_id', 'usr')),
    check(
      'consent_form_name_shape',
      sql`char_length(${t.name}) between 1 and ${sql.raw(String(MAX_CONSENT_FORM_NAME_LENGTH))} and ${t.name} = btrim(${t.name})`
    ),
    check('consent_form_channels_valid', channelsValid('channels')),
    check('consent_form_state_known', sql`${t.state} in (${list(CONSENT_FORM_STATES)})`),
    check(
      'consent_form_token_shape',
      sql`${t.token} is null or (char_length(${t.token}) between ${sql.raw(String(MIN_FORM_TOKEN_LENGTH))} and ${sql.raw(String(MAX_FORM_TOKEN_LENGTH))} and ${t.token} collate "C" ~ '${sql.raw(FORM_TOKEN_PATTERN)}')`
    ),
    check(
      'consent_form_lifecycle',
      sql`(${t.state} = 'draft') = (${t.publishedAt} is null)
        and (${t.state} = 'draft') = (${t.token} is null)
        and (${t.state} = 'closed') = (${t.closedAt} is not null)`
    ),
    foreignKey({
      name: 'consent_form_wording_fk',
      columns: [t.organizationId, t.wordingId],
      foreignColumns: [consentWordings.organizationId, consentWordings.id],
    }),
    uniqueIndex('consent_form_token_key').on(t.token).where(sql`${t.token} is not null`),
    index('consent_forms_list_idx').on(t.organizationId, t.createdAt.desc(), t.id.desc()),
    index('consent_forms_state_list_idx').on(
      t.organizationId,
      t.state,
      t.createdAt.desc(),
      t.id.desc()
    ),
    index('consent_forms_wording_idx').on(t.organizationId, t.wordingId),
  ]
)

/**
 * One event of the consent ledger (ADR 0021): a `granted` or `withdrawn` event for a Prospect and
 * channel, with its evidence. Append-only: a trigger refuses every update, and refuses a delete
 * unless the Prospect it belongs to is already gone (erasing a Prospect or an Organization
 * removes its events through the foreign key; nothing else can), and another refuses TRUNCATE.
 * The current state of a channel is the newest event by `seq`, never an edited row. `seq` orders
 * events in append order and is the history cursor; `occurred_at` is when the Prospect agreed or
 * withdrew, `recorded_at` when core stored it.
 *
 * Lookups served: a channel's newest event, the check path (`contact_consent_events_channel_idx`),
 * a Prospect's history newest first (`contact_consent_events_prospect_idx`), and the events that
 * reference a wording (`contact_consent_events_wording_idx`).
 */
export const contactConsentEvents = coreSchema.table(
  'contact_consent_event',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    seq: bigint('seq', { mode: 'number' }).generatedAlwaysAsIdentity().notNull(),
    prospectId: text('prospect_id').notNull(),
    channel: text('channel', { enum: CONSENT_CHANNELS }).notNull(),
    kind: text('kind', { enum: CONSENT_EVENT_KINDS }).notNull(),
    source: text('source').notNull(),
    wordingId: text('wording_id'),
    evidenceRef: text('evidence_ref'),
    callId: text('call_id'),
    formId: text('form_id'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    stopAll: boolean('stop_all').notNull().default(false),
    recordedByUserId: text('recorded_by_user_id'),
    occurredAt: ts('occurred_at').notNull(),
    recordedAt: ts('recorded_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'contact_consent_event_pkey', columns: [t.organizationId, t.id] }),
    check('contact_consent_event_id_shape', idShape('id', 'cev')),
    check('contact_consent_event_organization_id_shape', orgShape),
    check('contact_consent_event_organization_not_global', notGlobal),
    check('contact_consent_event_prospect_id_shape', idShape('prospect_id', 'prs')),
    check('contact_consent_event_wording_id_shape', idShape('wording_id', 'cwd')),
    check('contact_consent_event_call_id_shape', idShape('call_id', 'call')),
    check('contact_consent_event_form_id_shape', idShape('form_id', 'cfm')),
    check('contact_consent_event_recorded_by_user_id_shape', idShape('recorded_by_user_id', 'usr')),
    check('contact_consent_event_channel_known', sql`${t.channel} in (${list(CONSENT_CHANNELS)})`),
    check('contact_consent_event_kind_known', sql`${t.kind} in (${list(CONSENT_EVENT_KINDS)})`),
    check(
      'contact_consent_event_source_matches_kind',
      sql`(${t.kind} = 'granted' and ${t.source} in (${list(CONSENT_GRANT_SOURCES)}))
        or (${t.kind} = 'withdrawn' and ${t.source} in (${list(CONSENT_WITHDRAWAL_SOURCES)}))`
    ),
    check(
      'contact_consent_event_grant_has_evidence',
      sql`${t.kind} <> 'granted' or (${t.wordingId} is not null and ${t.evidenceRef} is not null)`
    ),
    check(
      'contact_consent_event_evidence_ref_shape',
      sql`${t.evidenceRef} is null or char_length(${t.evidenceRef}) between 1 and ${sql.raw(String(MAX_EVIDENCE_REF_LENGTH))}`
    ),
    check(
      'contact_consent_event_stop_all_withdrawal',
      sql`not ${t.stopAll} or ${t.kind} = 'withdrawn'`
    ),
    check(
      'contact_consent_event_call_matches_source',
      sql`(${t.source} = 'verbal_call') = (${t.callId} is not null)`
    ),
    check(
      'contact_consent_event_form_matches_source',
      sql`(${t.source} = 'hosted_form') = (${t.formId} is not null)`
    ),
    check(
      'contact_consent_event_submission_matches_source',
      sql`(${t.source} = 'hosted_form') = (${t.ipAddress} is not null and ${t.userAgent} is not null)
        and (${t.ipAddress} is null) = (${t.userAgent} is null)
        and (${t.ipAddress} is null or char_length(${t.ipAddress}) between 1 and ${sql.raw(String(MAX_SUBMISSION_IP_LENGTH))})
        and (${t.userAgent} is null or char_length(${t.userAgent}) <= ${sql.raw(String(MAX_SUBMISSION_USER_AGENT_LENGTH))})`
    ),
    foreignKey({
      name: 'contact_consent_event_prospect_fk',
      columns: [t.organizationId, t.prospectId],
      foreignColumns: [prospects.organizationId, prospects.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'contact_consent_event_wording_fk',
      columns: [t.organizationId, t.wordingId],
      foreignColumns: [consentWordings.organizationId, consentWordings.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'contact_consent_event_form_fk',
      columns: [t.organizationId, t.formId],
      foreignColumns: [consentForms.organizationId, consentForms.id],
    }).onDelete('cascade'),
    index('contact_consent_events_channel_idx').on(
      t.organizationId,
      t.prospectId,
      t.channel,
      t.seq.desc()
    ),
    index('contact_consent_events_prospect_idx').on(t.organizationId, t.prospectId, t.seq.desc()),
    index('contact_consent_events_wording_idx')
      .on(t.organizationId, t.wordingId)
      .where(sql`${t.wordingId} is not null`),
    index('contact_consent_events_form_idx')
      .on(t.organizationId, t.formId)
      .where(sql`${t.formId} is not null`),
  ]
)

/**
 * An Organization's Suppression entry (ADR 0021): an address that must not be contacted on any
 * channel. The address is kept only as `address_hash`, a salted HMAC-SHA-256 that core computes
 * over the normalised address with a per-Organization salt, so the same address in another
 * Organization hashes differently. `masked_address` is for display and is null exactly for an
 * `erased` entry. `channel` is where the request arrived and does not narrow the entry. At most
 * one live (not removed) entry per Organization, address kind and hash; a removed entry stays as
 * history and only a `manual` one can be removed, with who, when and why. `removable` is derived.
 *
 * The check path is the live-entry lookup by `(organization_id, address_kind, address_hash)`,
 * served by `suppression_entry_live_key`. Lists served (newest first, keyset `(created_at, id)`):
 * live entries, removed entries, and each filtered by reason or address kind, all ending in the
 * same keyset.
 */
export const suppressionEntries = coreSchema.table(
  'suppression_entry',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    addressKind: text('address_kind', { enum: SUPPRESSION_ADDRESS_KINDS }).notNull(),
    addressHash: bytes('address_hash').notNull(),
    maskedAddress: text('masked_address'),
    reason: text('reason', { enum: SUPPRESSION_REASONS }).notNull(),
    channel: text('channel', { enum: CONSENT_CHANNELS }),
    sourceRef: text('source_ref'),
    addedByUserId: text('added_by_user_id'),
    removable: boolean('removable')
      .notNull()
      .generatedAlwaysAs(sql`reason in (${list(SUPPRESSION_REMOVABLE_REASONS)})`),
    createdAt: ts('created_at').notNull().defaultNow(),
    removedAt: ts('removed_at'),
    removedByUserId: text('removed_by_user_id'),
    removalReason: text('removal_reason'),
  },
  (t) => [
    primaryKey({ name: 'suppression_entry_pkey', columns: [t.organizationId, t.id] }),
    check('suppression_entry_id_shape', idShape('id', 'sup')),
    check('suppression_entry_organization_id_shape', orgShape),
    check('suppression_entry_organization_not_global', notGlobal),
    check('suppression_entry_added_by_user_id_shape', idShape('added_by_user_id', 'usr')),
    check('suppression_entry_removed_by_user_id_shape', idShape('removed_by_user_id', 'usr')),
    check(
      'suppression_entry_address_kind_known',
      sql`${t.addressKind} in (${list(SUPPRESSION_ADDRESS_KINDS)})`
    ),
    check(
      'suppression_entry_address_hash_length',
      sql`octet_length(${t.addressHash}) = ${sql.raw(String(ADDRESS_HASH_BYTES))}`
    ),
    check('suppression_entry_reason_known', sql`${t.reason} in (${list(SUPPRESSION_REASONS)})`),
    check('suppression_entry_channel_known', sql`${t.channel} in (${list(CONSENT_CHANNELS)})`),
    check(
      'suppression_entry_masked_address_shape',
      sql`(${t.reason} = 'erased') = (${t.maskedAddress} is null)
        and (${t.maskedAddress} is null or char_length(${t.maskedAddress}) between 1 and ${sql.raw(String(MAX_MASKED_ADDRESS_LENGTH))})`
    ),
    check(
      'suppression_entry_source_ref_shape',
      sql`${t.sourceRef} is null or char_length(${t.sourceRef}) between 1 and ${sql.raw(String(MAX_SUPPRESSION_SOURCE_REF_LENGTH))}`
    ),
    check(
      'suppression_entry_removal_complete',
      sql`(${t.removedAt} is null) = (${t.removedByUserId} is null)
        and (${t.removedAt} is null) = (${t.removalReason} is null)`
    ),
    check(
      'suppression_entry_removal_reason_shape',
      sql`${t.removalReason} is null or (char_length(${t.removalReason}) between 1 and ${sql.raw(String(MAX_SUPPRESSION_NOTE_LENGTH))}
        and ${t.removalReason} = btrim(${t.removalReason}))`
    ),
    check(
      'suppression_entry_only_removable_removed',
      sql`${t.removedAt} is null or ${t.removable}`
    ),
    uniqueIndex('suppression_entry_live_key')
      .on(t.organizationId, t.addressKind, t.addressHash)
      .where(sql`${t.removedAt} is null`),
    index('suppression_entries_live_list_idx')
      .on(t.organizationId, t.createdAt.desc(), t.id.desc())
      .where(sql`${t.removedAt} is null`),
    index('suppression_entries_removed_list_idx')
      .on(t.organizationId, t.removedAt.desc(), t.id.desc())
      .where(sql`${t.removedAt} is not null`),
    index('suppression_entries_reason_list_idx').on(
      t.organizationId,
      t.reason,
      t.createdAt.desc(),
      t.id.desc()
    ),
    index('suppression_entries_kind_list_idx').on(
      t.organizationId,
      t.addressKind,
      t.createdAt.desc(),
      t.id.desc()
    ),
  ]
)

/**
 * The audit row of one answered Contact Check. It never holds an address. `prospect_id` has no
 * foreign key: a check names a Prospect that may not exist (answered `consent.missing`) or be
 * erased later, and the row stands. An allowance has a `basis` and no code; a denial has a code
 * and no basis. Rows older than 90 days are purged by core.
 *
 * Lists served (newest first, keyset `(checked_at, id)`): all (`contact_check_log_list_idx`) and
 * one Prospect's (`contact_check_log_prospect_idx`); the other filters narrow within the first.
 * The same index serves the per-Organization purge by age.
 */
export const contactCheckLog = coreSchema.table(
  'contact_check_log',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    prospectId: text('prospect_id'),
    channel: text('channel', { enum: CONSENT_CHANNELS }).notNull(),
    purpose: text('purpose', { enum: CONTACT_PURPOSES }).notNull(),
    caller: text('caller').notNull(),
    allowed: boolean('allowed').notNull(),
    code: text('code', { enum: LOGGED_DENIAL_CODES }),
    basis: text('basis', { enum: CONTACT_ALLOW_BASES }),
    checkedAt: ts('checked_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'contact_check_log_pkey', columns: [t.organizationId, t.id] }),
    check('contact_check_log_id_shape', idShape('id', 'chk')),
    check('contact_check_log_organization_id_shape', orgShape),
    check('contact_check_log_organization_not_global', notGlobal),
    check('contact_check_log_prospect_id_shape', idShape('prospect_id', 'prs')),
    check('contact_check_log_channel_known', sql`${t.channel} in (${list(CONSENT_CHANNELS)})`),
    check('contact_check_log_purpose_known', sql`${t.purpose} in (${list(CONTACT_PURPOSES)})`),
    check(
      'contact_check_log_caller_shape',
      sql`char_length(${t.caller}) between 1 and ${sql.raw(String(MAX_CALLER_LENGTH))} and ${t.caller} collate "C" ~ '^[a-z][a-z0-9_-]*$'`
    ),
    check('contact_check_log_code_known', sql`${t.code} in (${list(LOGGED_DENIAL_CODES)})`),
    check('contact_check_log_basis_known', sql`${t.basis} in (${list(CONTACT_ALLOW_BASES)})`),
    check(
      'contact_check_log_outcome_consistent',
      sql`(${t.allowed} and ${t.basis} is not null and ${t.code} is null)
        or (not ${t.allowed} and ${t.basis} is null and ${t.code} is not null)`
    ),
    index('contact_check_log_list_idx').on(t.organizationId, t.checkedAt.desc(), t.id.desc()),
    index('contact_check_log_prospect_idx')
      .on(t.organizationId, t.prospectId, t.checkedAt.desc(), t.id.desc())
      .where(sql`${t.prospectId} is not null`),
  ]
)
