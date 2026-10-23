import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
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
import { organizations } from './core-tables'

/*
 * Milestone 16 (`docs/specs/m16-agent-controls-audit-openness.md` in the hub; ADR 0023 for API keys
 * and ADR 0024 for the audit log and the export). The values below mirror the contract at its
 * `develop` (`tula-closeline-contract`, `src/agent`, `src/audit`, `src/export`, `src/apikey`); this
 * library does not depend on the contract, so each carries the name of the constant it copies and
 * `core-controls.test.ts` pins every value. The existing auth `api_keys` and `audit_logs` tables
 * belong to the vendored project model (ADR 0007) and are not touched: these are core's own.
 */

/** The Agents an Organization writes instructions for. Mirrors the contract's `AGENT_KINDS`. */
export const AGENT_KINDS = ['inbound', 'outbound'] as const
/** The longest instruction text, in characters. Mirrors the contract's `MAX_AGENT_INSTRUCTION_LENGTH`. */
export const MAX_AGENT_INSTRUCTION_LENGTH = 20_000
/** How much an Agent may do alone. Mirrors the contract's `CONTROL_LEVELS`. */
export const CONTROL_LEVELS = ['supervised', 'assisted', 'autonomous'] as const
/** The channels an Agent acts on: the channels of Contact Consent. */
export const AGENT_SETTING_CHANNELS = ['phone', 'sms', 'whatsapp', 'email', 'linkedin'] as const
/** The `channel` of a kind's default row, and of the Organization row: no channel. */
export const DEFAULT_CHANNEL = 'default' as const
/** The `agent_kind` of the Organization-wide row, which holds the pause switch. */
export const ORGANIZATION_AGENT_KIND = 'organization' as const
/** The reasons that hand a conversation to a person. Mirrors the contract's `ESCALATION_TRIGGERS`. */
export const MAX_ESCALATION_RULES = 7
/** The kinds of actor of an audit event. Mirrors the contract's `AUDIT_ACTOR_KINDS`. */
export const AUDIT_ACTOR_KINDS = ['member', 'agent', 'api_key', 'system'] as const
/** The largest stored audit event, in bytes of metadata JSON (ADR 0024: an event is at most 4,096 bytes). */
export const MAX_AUDIT_METADATA_BYTES = 4096
/** The kinds of data export. Mirrors the contract's `EXPORT_KINDS`. */
export const EXPORT_KINDS = ['organization', 'enriched_prospects'] as const
/** The formats of an enriched export. Mirrors the contract's `ENRICHED_EXPORT_FORMATS`. */
export const EXPORT_FORMATS = ['csv'] as const
/** The states of an export job. Mirrors the contract's `EXPORT_STATES`. */
export const EXPORT_STATES = ['queued', 'running', 'ready', 'failed', 'expired'] as const
/** The states in which a job counts as running: at most one per Organization. */
export const EXPORT_ACTIVE_STATES = ['queued', 'running'] as const
/** Why a job failed. Mirrors the contract's `EXPORT_FAILURE_REASONS`. */
export const EXPORT_FAILURE_REASONS = ['part_failed', 'timed_out', 'storage_unavailable'] as const
/** The services that write a slice. Mirrors the contract's `EXPORT_SERVICES`. */
export const EXPORT_SERVICES = ['core', 'playbook', 'voice', 'outbound'] as const
/** The states of one service's slice. Mirrors the contract's `EXPORT_PART_STATES`. */
export const EXPORT_PART_STATES = ['pending', 'ready', 'failed'] as const
/** Why a slice failed. Mirrors the contract's `EXPORT_PART_FAILURE_REASONS`. */
export const EXPORT_PART_FAILURE_REASONS = [
  'write_failed',
  'storage_unavailable',
  'source_unavailable',
] as const
/** The most files in one slice. Mirrors the contract's `MAX_EXPORT_PART_FILES`. */
export const MAX_EXPORT_PART_FILES = 10_000
/** The most bytes in one slice. Mirrors the contract's `MAX_EXPORT_PART_BYTES`. */
export const MAX_EXPORT_PART_BYTES = 50_000_000_000
/** The longest object-storage prefix of a slice. Mirrors the contract's `exportPrefixSchema`. */
export const MAX_EXPORT_PREFIX_LENGTH = 300
/** The scopes an API key can hold. Mirrors the contract's `API_KEY_SCOPES`. */
export const API_KEY_SCOPES = [
  'prospects:read',
  'prospects:write',
  'consent:read',
  'consent:write',
  'enrichment:read',
  'enrichment:write',
  'campaigns:read',
  'campaigns:write',
  'messaging:read',
  'messaging:write',
  'bookings:read',
  'bookings:write',
  'playbook:read',
  'playbook:write',
  'calls:read',
  'calls:write',
] as const
/** The longest name of an API key. Mirrors the contract's `MAX_API_KEY_NAME_LENGTH`. */
export const MAX_API_KEY_NAME_LENGTH = 80
/** Roles a key's ceiling can name: any role. Mirrors the contract's `ROLES` (see `MEMBERSHIP_ROLES`). */
export const API_KEY_ROLE_CEILINGS = ['owner', 'admin', 'manager', 'rep'] as const

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
const hexHash = (column: string) => sql.raw(`"${column}" ~ '^[0-9a-f]{64}$'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })
const num = (n: number) => sql.raw(String(n))

/**
 * One saved version of an Agent's written instructions (ADR 0003 puts them beneath the fixed
 * rules). Numbered from 1 per Organization and Agent kind (`agent_instruction_versions_number_key`)
 * and immutable: the service role holds INSERT and SELECT only, so a version's text can be neither
 * changed nor removed (a catalog test pins the privileges). Whether a version is the published one
 * is not stored here, because that would be an update: `agent_instruction_pointer` names it.
 *
 * Lists served (by number, newest first, keyset `number < $cursor`): an Agent kind's versions on
 * `agent_instruction_versions_number_key` scanned backwards; one version by id on the primary key.
 */
export const agentInstructionVersions = coreSchema.table(
  'agent_instruction_versions',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    agentKind: text('agent_kind', { enum: AGENT_KINDS }).notNull(),
    number: integer('number').notNull(),
    text: text('text').notNull(),
    authorMembershipId: text('author_membership_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'agent_instruction_versions_pkey', columns: [t.organizationId, t.id] }),
    check('agent_instruction_versions_id_shape', idShape('id', 'ains')),
    check('agent_instruction_versions_organization_id_shape', orgShape),
    check('agent_instruction_versions_organization_not_global', notGlobal),
    check(
      'agent_instruction_versions_agent_kind_known',
      sql`${t.agentKind} in (${list(AGENT_KINDS)})`
    ),
    check('agent_instruction_versions_number_positive', sql`${t.number} >= 1`),
    check(
      'agent_instruction_versions_text_length',
      sql`char_length(${t.text}) between 1 and ${num(MAX_AGENT_INSTRUCTION_LENGTH)}`
    ),
    check(
      'agent_instruction_versions_author_shape',
      sql`${t.authorMembershipId} is null or ${t.authorMembershipId} ~ '^mem_[0-9a-f]{32}$'`
    ),
    uniqueIndex('agent_instruction_versions_number_key').on(
      t.organizationId,
      t.agentKind,
      t.number
    ),
  ]
)

/**
 * The published instruction version of one Agent kind of an Organization. No row means nothing is
 * published and the Agent runs on the fixed rules and the Playbook alone. Publishing and rolling
 * back are an upsert that re-points `version_number`; the foreign key keeps it on a version of the
 * same Agent kind. Agent services read this row and stamp its number on every Draft and audit event.
 *
 * Lists served: none; the primary key is the lookup.
 */
export const agentInstructionPointers = coreSchema.table(
  'agent_instruction_pointer',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    agentKind: text('agent_kind', { enum: AGENT_KINDS }).notNull(),
    versionNumber: integer('version_number').notNull(),
    publishedByMembershipId: text('published_by_membership_id'),
    publishedAt: ts('published_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'agent_instruction_pointer_pkey',
      columns: [t.organizationId, t.agentKind],
    }),
    foreignKey({
      name: 'agent_instruction_pointer_version_fk',
      columns: [t.organizationId, t.agentKind, t.versionNumber],
      foreignColumns: [
        agentInstructionVersions.organizationId,
        agentInstructionVersions.agentKind,
        agentInstructionVersions.number,
      ],
    }),
    check('agent_instruction_pointer_organization_id_shape', orgShape),
    check('agent_instruction_pointer_organization_not_global', notGlobal),
    check(
      'agent_instruction_pointer_agent_kind_known',
      sql`${t.agentKind} in (${list(AGENT_KINDS)})`
    ),
    check(
      'agent_instruction_pointer_published_by_shape',
      sql`${t.publishedByMembershipId} is null or ${t.publishedByMembershipId} ~ '^mem_[0-9a-f]{32}$'`
    ),
  ]
)

/**
 * The controls of the Agents of an Organization. One row per Agent kind and channel: `channel` is
 * `default` for the kind's fallback, which a channel without its own row uses. The row with
 * `agent_kind = 'organization'` (channel `default`) is the Organization-wide pause switch
 * (`agents_paused`, checked by every sender); it holds no level. A set replaces the whole row.
 * `send_window` and `escalation_rules` are the contract's validated JSON, bounded here by type and
 * size only. There is no column for Contact Consent, the AI and recording disclosure or
 * suppression: they are not settings (ADR 0003).
 *
 * Lists served: an Organization's rows by Agent kind and channel on the primary key.
 */
export const agentSettings = coreSchema.table(
  'agent_settings',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    agentKind: text('agent_kind', { enum: [...AGENT_KINDS, ORGANIZATION_AGENT_KIND] }).notNull(),
    channel: text('channel', { enum: [...AGENT_SETTING_CHANNELS, DEFAULT_CHANNEL] })
      .notNull()
      .default(DEFAULT_CHANNEL),
    level: text('level', { enum: CONTROL_LEVELS }),
    sendWindow: jsonb('send_window'),
    escalationRules: jsonb('escalation_rules'),
    agentsPaused: boolean('agents_paused'),
    updatedByMembershipId: text('updated_by_membership_id'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'agent_settings_pkey',
      columns: [t.organizationId, t.agentKind, t.channel],
    }),
    check('agent_settings_organization_id_shape', orgShape),
    check('agent_settings_organization_not_global', notGlobal),
    check(
      'agent_settings_agent_kind_known',
      sql`${t.agentKind} in (${list([...AGENT_KINDS, ORGANIZATION_AGENT_KIND])})`
    ),
    check(
      'agent_settings_channel_known',
      sql`${t.channel} in (${list([...AGENT_SETTING_CHANNELS, DEFAULT_CHANNEL])})`
    ),
    check(
      'agent_settings_level_known',
      sql`${t.level} is null or ${t.level} in (${list(CONTROL_LEVELS)})`
    ),
    check(
      'agent_settings_updated_by_shape',
      sql`${t.updatedByMembershipId} is null or ${t.updatedByMembershipId} ~ '^mem_[0-9a-f]{32}$'`
    ),
    check(
      'agent_settings_send_window_shape',
      sql`${t.sendWindow} is null or jsonb_typeof(${t.sendWindow}) = 'object'`
    ),
    check(
      'agent_settings_escalation_rules_shape',
      sql`${t.escalationRules} is null or (jsonb_typeof(${t.escalationRules}) = 'array' and jsonb_array_length(${t.escalationRules}) <= ${num(MAX_ESCALATION_RULES)})`
    ),
    // An Agent row carries its level, window and rules and no pause flag; the Organization row
    // carries the flag, on the default channel, and nothing else.
    check(
      'agent_settings_row_columns',
      sql`(${t.agentKind} <> 'organization'
          and ${t.level} is not null and ${t.sendWindow} is not null and ${t.escalationRules} is not null
          and ${t.agentsPaused} is null)
        or (${t.agentKind} = 'organization' and ${t.channel} = 'default'
          and ${t.agentsPaused} is not null
          and ${t.level} is null and ${t.sendWindow} is null and ${t.escalationRules} is null)`
    ),
  ]
)

/**
 * One event of the audit log (ADR 0024): who or what did what to which subject. Append-only: the
 * service role holds INSERT and SELECT only. `sequence` counts from 1 per Organization with no
 * gaps (`audit_events_sequence_key` is unique, and a trigger refuses an event that does not
 * extend the chain: the first has sequence 1 and no previous hash, every later one the next
 * number and the previous event's hash). `hash` covers the content and `previous_hash`; the
 * service computes it and the verify route recomputes it. `id` is chosen by the publisher, so a
 * redelivered `audit.recorded` is `INSERT ... ON CONFLICT (organization_id, id) DO NOTHING`.
 * Metadata holds ids and labels only (never Message text, recordings, Transcripts or secrets);
 * its key and value limits are the contract's and the writer's, the database bounds its type and
 * size.
 *
 * Lists served, newest first by sequence (keyset `sequence < $cursor`): the whole log on
 * `audit_events_sequence_key`; by date range on `audit_events_occurred_idx`; by action on
 * `audit_events_action_idx`; one subject on `audit_events_subject_idx`; one Prospect (a Manager's
 * view) on `audit_events_prospect_idx`; one actor on the three `audit_events_actor_*_idx`
 * partial indexes (the filter ORs the three columns, so Postgres can BitmapOr them).
 */
export const auditEvents = coreSchema.table(
  'audit_events',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    sequence: bigint('sequence', { mode: 'number' }).notNull(),
    occurredAt: ts('occurred_at').notNull(),
    actorKind: text('actor_kind', { enum: AUDIT_ACTOR_KINDS }).notNull(),
    actorMembershipId: text('actor_membership_id'),
    actorAgentKind: text('actor_agent_kind', { enum: AGENT_KINDS }),
    actorApiKeyId: text('actor_api_key_id'),
    action: text('action').notNull(),
    subjectType: text('subject_type'),
    subjectId: text('subject_id'),
    prospectId: text('prospect_id'),
    instructionVersion: integer('instruction_version'),
    requestId: text('request_id'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    previousHash: text('previous_hash'),
    hash: text('hash').notNull(),
    recordedAt: ts('recorded_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'audit_events_pkey', columns: [t.organizationId, t.id] }),
    check('audit_events_id_shape', idShape('id', 'aud')),
    check('audit_events_organization_id_shape', orgShape),
    check('audit_events_organization_not_global', notGlobal),
    check('audit_events_sequence_positive', sql`${t.sequence} >= 1`),
    check('audit_events_actor_kind_known', sql`${t.actorKind} in (${list(AUDIT_ACTOR_KINDS)})`),
    check(
      'audit_events_actor_columns',
      sql`(${t.actorKind} = 'member' and ${t.actorMembershipId} is not null and ${t.actorMembershipId} ~ '^mem_[0-9a-f]{32}$'
            and ${t.actorAgentKind} is null and ${t.actorApiKeyId} is null)
        or (${t.actorKind} = 'agent' and ${t.actorAgentKind} is not null and ${t.actorAgentKind} in (${list(AGENT_KINDS)})
            and ${t.actorMembershipId} is null and ${t.actorApiKeyId} is null)
        or (${t.actorKind} = 'api_key' and ${t.actorApiKeyId} is not null and ${t.actorApiKeyId} ~ '^akey_[0-9a-f]{32}$'
            and ${t.actorMembershipId} is null and ${t.actorAgentKind} is null)
        or (${t.actorKind} = 'system'
            and ${t.actorMembershipId} is null and ${t.actorAgentKind} is null and ${t.actorApiKeyId} is null)`
    ),
    check(
      'audit_events_action_shape',
      sql`char_length(${t.action}) <= 100 and ${t.action} ~ '^[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*$'`
    ),
    check(
      'audit_events_subject_shape',
      sql`(${t.subjectType} is null and ${t.subjectId} is null)
        or (${t.subjectType} is not null and char_length(${t.subjectType}) <= 40 and ${t.subjectType} ~ '^[a-z][a-z0-9_]*$'
            and ${t.subjectId} is not null and char_length(${t.subjectId}) <= 64 and ${t.subjectId} ~ '^[a-z][a-z0-9_]*_[0-9a-f]{32}$')`
    ),
    check(
      'audit_events_prospect_id_shape',
      sql`${t.prospectId} is null or ${t.prospectId} ~ '^prs_[0-9a-f]{32}$'`
    ),
    check(
      'audit_events_instruction_version_positive',
      sql`${t.instructionVersion} is null or ${t.instructionVersion} >= 1`
    ),
    check(
      'audit_events_request_id_shape',
      sql`${t.requestId} is null or ${t.requestId} ~ '^req_[0-9a-f]{32}$'`
    ),
    check(
      'audit_events_metadata_shape',
      sql`jsonb_typeof(${t.metadata}) = 'object' and octet_length(${t.metadata}::text) <= ${num(MAX_AUDIT_METADATA_BYTES)}`
    ),
    check('audit_events_hash_shape', hexHash('hash')),
    check(
      'audit_events_previous_hash_shape',
      sql`${t.previousHash} is null or ${t.previousHash} ~ '^[0-9a-f]{64}$'`
    ),
    // The first event has no predecessor; every later one names its predecessor's hash.
    check('audit_events_chain_start', sql`(${t.sequence} = 1) = (${t.previousHash} is null)`),
    uniqueIndex('audit_events_sequence_key').on(t.organizationId, t.sequence),
    index('audit_events_occurred_idx').on(t.organizationId, t.occurredAt.desc(), t.sequence.desc()),
    index('audit_events_action_idx').on(t.organizationId, t.action, t.sequence.desc()),
    index('audit_events_subject_idx')
      .on(t.organizationId, t.subjectType, t.subjectId, t.sequence.desc())
      .where(sql`${t.subjectId} is not null`),
    index('audit_events_prospect_idx')
      .on(t.organizationId, t.prospectId, t.sequence.desc())
      .where(sql`${t.prospectId} is not null`),
    index('audit_events_actor_member_idx')
      .on(t.organizationId, t.actorMembershipId, t.sequence.desc())
      .where(sql`${t.actorMembershipId} is not null`),
    index('audit_events_actor_api_key_idx')
      .on(t.organizationId, t.actorApiKeyId, t.sequence.desc())
      .where(sql`${t.actorApiKeyId} is not null`),
    index('audit_events_actor_agent_idx')
      .on(t.organizationId, t.actorAgentKind, t.sequence.desc())
      .where(sql`${t.actorAgentKind} is not null`),
  ]
)

/**
 * One data export of an Organization (ADR 0024). At most one is running per Organization: the
 * partial unique index `export_jobs_one_active_key` makes `export.already_running` a database
 * fact. The daily limit (two in 24 hours) is counted on `export_jobs_list_idx`. The download link
 * is never stored; `expires_at` is when the files stop being served.
 *
 * Lists served (newest first, keyset `(requested_at, id) < $cursor`): `export_jobs_list_idx`.
 */
export const exportJobs = coreSchema.table(
  'export_jobs',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    kind: text('kind', { enum: EXPORT_KINDS }).notNull(),
    format: text('format', { enum: EXPORT_FORMATS }),
    filter: jsonb('filter'),
    state: text('state', { enum: EXPORT_STATES }).notNull().default('queued'),
    requestedByMembershipId: text('requested_by_membership_id').notNull(),
    includeRecordingLinks: boolean('include_recording_links').notNull().default(false),
    failureReason: text('failure_reason', { enum: EXPORT_FAILURE_REASONS }),
    requestedAt: ts('requested_at').notNull().defaultNow(),
    completedAt: ts('completed_at'),
    expiresAt: ts('expires_at'),
  },
  (t) => [
    primaryKey({ name: 'export_jobs_pkey', columns: [t.organizationId, t.id] }),
    check('export_jobs_id_shape', idShape('id', 'exp')),
    check('export_jobs_organization_id_shape', orgShape),
    check('export_jobs_organization_not_global', notGlobal),
    check('export_jobs_kind_known', sql`${t.kind} in (${list(EXPORT_KINDS)})`),
    check(
      'export_jobs_format_known',
      sql`${t.format} is null or ${t.format} in (${list(EXPORT_FORMATS)})`
    ),
    check('export_jobs_state_known', sql`${t.state} in (${list(EXPORT_STATES)})`),
    check(
      'export_jobs_failure_reason_known',
      sql`${t.failureReason} is null or ${t.failureReason} in (${list(EXPORT_FAILURE_REASONS)})`
    ),
    check('export_jobs_requested_by_shape', idShape('requested_by_membership_id', 'mem')),
    check(
      'export_jobs_filter_shape',
      sql`${t.filter} is null or jsonb_typeof(${t.filter}) = 'object'`
    ),
    // An organization export has no format or filter; an enriched one has a format and no recordings.
    check(
      'export_jobs_kind_columns',
      sql`(${t.kind} = 'organization' and ${t.format} is null and ${t.filter} is null)
        or (${t.kind} = 'enriched_prospects' and ${t.format} is not null and ${t.includeRecordingLinks} = false)`
    ),
    check(
      'export_jobs_failure_iff_failed',
      sql`(${t.state} = 'failed') = (${t.failureReason} is not null)`
    ),
    check(
      'export_jobs_completion',
      sql`(${t.state} in ('queued', 'running') and ${t.completedAt} is null and ${t.expiresAt} is null)
        or (${t.state} in ('ready', 'expired') and ${t.completedAt} is not null and ${t.expiresAt} is not null)
        or (${t.state} = 'failed' and ${t.completedAt} is not null and ${t.expiresAt} is null)`
    ),
    uniqueIndex('export_jobs_one_active_key')
      .on(t.organizationId)
      .where(sql`${t.state} in (${list(EXPORT_ACTIVE_STATES)})`),
    index('export_jobs_list_idx').on(t.organizationId, t.requestedAt.desc(), t.id.desc()),
  ]
)

/**
 * One service's slice of an export job: its state and where it wrote under the export bucket. A
 * redelivered `export.part_ready` finds the row already `ready` and writes nothing.
 *
 * Lists served: a job's parts (at most four) on the primary key.
 */
export const exportParts = coreSchema.table(
  'export_parts',
  {
    organizationId: text('organization_id').notNull(),
    exportId: text('export_id').notNull(),
    service: text('service', { enum: EXPORT_SERVICES }).notNull(),
    state: text('state', { enum: EXPORT_PART_STATES }).notNull().default('pending'),
    prefix: text('prefix'),
    fileCount: integer('file_count'),
    bytes: bigint('bytes', { mode: 'number' }),
    failureReason: text('failure_reason', { enum: EXPORT_PART_FAILURE_REASONS }),
    readyAt: ts('ready_at'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'export_parts_pkey',
      columns: [t.organizationId, t.exportId, t.service],
    }),
    foreignKey({
      name: 'export_parts_export_fk',
      columns: [t.organizationId, t.exportId],
      foreignColumns: [exportJobs.organizationId, exportJobs.id],
    }).onDelete('cascade'),
    check('export_parts_organization_id_shape', orgShape),
    check('export_parts_organization_not_global', notGlobal),
    check('export_parts_export_id_shape', idShape('export_id', 'exp')),
    check('export_parts_service_known', sql`${t.service} in (${list(EXPORT_SERVICES)})`),
    check('export_parts_state_known', sql`${t.state} in (${list(EXPORT_PART_STATES)})`),
    check(
      'export_parts_failure_reason_known',
      sql`${t.failureReason} is null or ${t.failureReason} in (${list(EXPORT_PART_FAILURE_REASONS)})`
    ),
    check(
      'export_parts_prefix_shape',
      sql`${t.prefix} is null or (char_length(${t.prefix}) <= ${num(MAX_EXPORT_PREFIX_LENGTH)}
        and ${t.prefix} ~ '^[A-Za-z0-9_][A-Za-z0-9_./-]*$' and ('/' || ${t.prefix} || '/') not like '%/../%')`
    ),
    check(
      'export_parts_file_count_range',
      sql`${t.fileCount} is null or ${t.fileCount} between 0 and ${num(MAX_EXPORT_PART_FILES)}`
    ),
    check(
      'export_parts_bytes_range',
      sql`${t.bytes} is null or ${t.bytes} between 0 and ${num(MAX_EXPORT_PART_BYTES)}`
    ),
    check(
      'export_parts_state_columns',
      sql`(${t.state} = 'pending' and ${t.prefix} is null and ${t.fileCount} is null and ${t.bytes} is null and ${t.failureReason} is null and ${t.readyAt} is null)
        or (${t.state} = 'ready' and ${t.prefix} is not null and ${t.fileCount} is not null and ${t.bytes} is not null and ${t.failureReason} is null and ${t.readyAt} is not null)
        or (${t.state} = 'failed' and ${t.failureReason} is not null and ${t.readyAt} is null)`
    ),
  ]
)

/**
 * An API key of an Organization (ADR 0023). Only the SHA-256 of the 256-bit secret is stored
 * (`secret_hash`, 64 lower-case hex characters), never the key, and the hash is unique across all
 * Organizations (`api_keys_secret_hash_key`): two keys cannot share a hash, and exchanging a key
 * is a lookup on that index. `prefix` is the first twelve characters of the key (`clk_` and eight),
 * shown so a person can recognise it. A key is revoked by setting `revoked_at`, not deleted, so
 * the list keeps its history and audit events keep naming it. `role_ceiling` is the highest role
 * the key may act as (the service checks it against the creating Admin's role).
 * `created_by_membership_id` has no foreign key: a member who leaves must not delete the key.
 *
 * The exchange has to find a key from the hash before it knows the Organization, which forced
 * row-level security hides from the service role; that lookup is a separate, later piece (a definer
 * function in the style of migration 0033) and is not part of this table.
 *
 * Lists served (newest first, keyset `(created_at, id) < $cursor`): `api_keys_list_idx`.
 */
export const coreApiKeys = coreSchema.table(
  'api_keys',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.organizationId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    prefix: text('prefix').notNull(),
    secretHash: text('secret_hash').notNull(),
    scopes: text('scopes').array().notNull(),
    roleCeiling: text('role_ceiling', { enum: API_KEY_ROLE_CEILINGS }).notNull(),
    expiresAt: ts('expires_at'),
    lastUsedAt: ts('last_used_at'),
    revokedAt: ts('revoked_at'),
    createdByMembershipId: text('created_by_membership_id').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'api_keys_pkey', columns: [t.organizationId, t.id] }),
    check('api_keys_id_shape', idShape('id', 'akey')),
    check('api_keys_organization_id_shape', orgShape),
    check('api_keys_organization_not_global', notGlobal),
    check(
      'api_keys_name_length',
      sql`char_length(${t.name}) between 1 and ${num(MAX_API_KEY_NAME_LENGTH)}`
    ),
    check('api_keys_prefix_shape', sql`${t.prefix} ~ '^clk_[A-Za-z0-9_-]{8}$'`),
    check('api_keys_secret_hash_shape', hexHash('secret_hash')),
    check(
      'api_keys_scopes_known',
      sql`cardinality(${t.scopes}) between 1 and ${num(API_KEY_SCOPES.length)}
        and ${t.scopes} <@ array[${list(API_KEY_SCOPES)}]::text[]`
    ),
    check('api_keys_role_ceiling_known', sql`${t.roleCeiling} in (${list(API_KEY_ROLE_CEILINGS)})`),
    check('api_keys_created_by_shape', idShape('created_by_membership_id', 'mem')),
    check(
      'api_keys_expiry_after_creation',
      sql`${t.expiresAt} is null or ${t.expiresAt} > ${t.createdAt}`
    ),
    uniqueIndex('api_keys_secret_hash_key').on(t.secretHash),
    index('api_keys_list_idx').on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  ]
)

/**
 * Requests counted per API key per fixed window, for the per-key rate limit (ADR 0023: counters
 * live in Postgres, not in memory). The service upserts `request_count + 1` for the current
 * window and refuses the exchange or call over the limit; old windows are pruned by age on
 * `api_key_usage_age_idx`. Revoking or deleting a key's Organization removes its counters.
 *
 * Lists served: none; the primary key is the lookup.
 */
export const apiKeyUsage = coreSchema.table(
  'api_key_usage',
  {
    organizationId: text('organization_id').notNull(),
    apiKeyId: text('api_key_id').notNull(),
    windowStart: ts('window_start').notNull(),
    requestCount: bigint('request_count', { mode: 'number' }).notNull().default(0),
  },
  (t) => [
    primaryKey({
      name: 'api_key_usage_pkey',
      columns: [t.organizationId, t.apiKeyId, t.windowStart],
    }),
    foreignKey({
      name: 'api_key_usage_key_fk',
      columns: [t.organizationId, t.apiKeyId],
      foreignColumns: [coreApiKeys.organizationId, coreApiKeys.id],
    }).onDelete('cascade'),
    check('api_key_usage_organization_id_shape', orgShape),
    check('api_key_usage_organization_not_global', notGlobal),
    check('api_key_usage_api_key_id_shape', idShape('api_key_id', 'akey')),
    check('api_key_usage_request_count_range', sql`${t.requestCount} between 0 and 1000000000`),
    index('api_key_usage_age_idx').on(t.organizationId, t.windowStart),
  ]
)
