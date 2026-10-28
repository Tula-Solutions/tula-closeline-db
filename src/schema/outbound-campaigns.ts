import { sql } from 'drizzle-orm'
import {
  check,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { outboundSchema } from './outbound'
import {
  MAX_ATTEMPT_EPOCH,
  MAX_SEQUENCE_STEP,
  SEND_CHECKS,
  SEND_DEFERRING_REASONS,
  SEND_REFUSAL_REASONS,
  SEND_STATES,
} from './outbound-mail'
import { MAX_DRAFT_GOAL_LENGTH, MAX_STEP_KEY_LENGTH, OUTBOUND_LANGUAGES } from './outbound-tables'
import { CALL_RESULTS } from './voice-agent-calls'

/*
 * Milestone 7 (`docs/specs/m07-campaigns-sequences-engine.md` in the hub): Campaigns, their
 * versioned Sequences of steps and variants, Enrollments and their history, Plays and the send
 * decisions the engine records. The values below mirror the contract (`tula-closeline-contract`,
 * `src/campaigns`); this library does not depend on the contract, so each carries the name of the
 * constant it copies and `outbound-campaigns.test.ts` pins every value.
 */

/** The states of a Campaign. Mirrors the contract's `CAMPAIGN_STATES`. */
export const CAMPAIGN_STATES = ['draft', 'ready', 'running', 'paused', 'archived'] as const
/** How a Campaign's drafts are approved. Mirrors the contract's `CAMPAIGN_APPROVAL_MODES`. */
export const CAMPAIGN_APPROVAL_MODES = ['auto', 'review', 'mixed'] as const
/** Whose time zone a send window is read in. Mirrors the contract's `WINDOW_ZONES`. */
export const WINDOW_ZONES = ['campaign', 'prospect'] as const
/** The kinds of step of a Sequence. Mirrors the contract's `STEP_KINDS`. */
export const STEP_KINDS = ['email', 'wait', 'branch', 'rep_task', 'end'] as const
/** The tasks a rep-task step asks of a Rep. Mirrors the contract's `STEP_TASKS`. */
export const STEP_TASKS = ['call', 'manual_message', 'research', 'other'] as const
/** The most steps a Sequence holds. Mirrors the contract's `MAX_SEQUENCE_STEPS`. */
export const MAX_SEQUENCE_STEPS = 50
/** The states of an Enrollment. Mirrors the contract's `ENROLLMENT_STATES`. */
export const ENROLLMENT_STATES = ['active', 'completed', 'stopped'] as const
/** Why an Enrollment stopped. Mirrors the contract's `ENROLLMENT_STOP_REASONS`. */
export const ENROLLMENT_STOP_REASONS = [
  'replied',
  'hard_bounce',
  'unsubscribed',
  'complaint',
  'suppressed',
  'no_consent',
  'unverified_address',
  'removed_by_rep',
  'meeting_booked',
  'prospect_erased',
  'campaign_archived',
] as const
/** What an Enrollment event records. Mirrors the contract's `ENROLLMENT_EVENT_KINDS`. */
export const ENROLLMENT_EVENT_KINDS = [
  'enrolled',
  'step_entered',
  'sent',
  'deferred',
  'refused',
  'rep_task_created',
  'call_result',
  'branch_taken',
  'stopped',
  'completed',
] as const
/** What a Play is for. Mirrors the contract's `PLAY_INTENTS`. */
export const PLAY_INTENTS = [
  'cold_intro',
  'closed_lost_reengagement',
  'post_event_follow_up',
  'nurture',
] as const
/** Where a Play came from. Mirrors the contract's `PLAY_SOURCES`. */
export const PLAY_SOURCES = ['builtin', 'seeded', 'custom'] as const
/** The states of a Play. Mirrors the contract's `PLAY_STATUSES`. */
export const PLAY_STATUSES = ['proposed', 'accepted', 'discarded'] as const
/** What a Play citation points at. Mirrors the contract's `PLAY_CITATION_KINDS`. */
export const PLAY_CITATION_KINDS = ['moment', 'document'] as const
/** How a variant became the promoted one. Mirrors the contract's `PROMOTION_SOURCES`. */
export const PROMOTION_SOURCES = ['auto', 'manual'] as const
/** The kinds of due work `outbound.organizations_with_work` finds: a step due on an Enrollment. */
export const OUTBOUND_WORK_KINDS = ['step_due'] as const

/** The longest name of a Campaign or a Play. Mirrors the contract's `MAX_CAMPAIGN_NAME_LENGTH`. */
export const MAX_CAMPAIGN_NAME_LENGTH = 100
/** The most a Campaign may be capped to send in a day. Mirrors the contract's `MAX_DAILY_CAP`. */
export const MAX_DAILY_CAP = 5000
/** The largest Sequence version or audience version a row holds. */
export const MAX_CAMPAIGN_VERSION = 1_000_000
/** The most hours a wait step or rep task may span: 90 days. Mirrors the contract's `MAX_STEP_HOURS`. */
export const MAX_STEP_HOURS = 2160
/** The longest instruction of a rep-task step. Mirrors the contract's `MAX_TASK_INSTRUCTION_LENGTH`. */
export const MAX_TASK_INSTRUCTION_LENGTH = 500
/** The most arms a branch step has. Mirrors the contract's `MAX_BRANCH_ARMS`. */
export const MAX_BRANCH_ARMS = 5
/** The heaviest weight one variant has: a step's weights sum to 100 across at least two. */
export const MAX_VARIANT_WEIGHT = 99
/** The longest label of a variant. */
export const MAX_VARIANT_LABEL_LENGTH = 100
/** The longest angle of a variant. */
export const MAX_VARIANT_ANGLE_LENGTH = 500
/** The most evidence a Play counts. */
export const MAX_PLAY_EVIDENCE = 100_000
/** The most citations a Play lists. */
export const MAX_PLAY_CITATIONS = 100
/** The largest steps outline of a Play, in elements. */
export const MAX_PLAY_STEPS = 50

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const num = (value: number) => sql.raw(String(value))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
const KEY_SHAPE = `^[a-z][a-z0-9_-]{0,${MAX_STEP_KEY_LENGTH - 1}}$`
const keyShape = (column: string) => sql.raw(`"${column}" is null or "${column}" ~ '${KEY_SHAPE}'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })

/**
 * A Play: a reusable outline of a Campaign, built in, seeded from an Organization's history or
 * written by hand. `steps` is the outline (an array of at most 50 elements, validated by the
 * contract at the service edge). `evidence_count` counts what the Play was drawn from; the
 * citations listed are at most as many, which only the service can check. Whether a Play has no
 * evidence is derived from `evidence_count`, never stored.
 *
 * Lists served (keyset `(created_at, id)` newest first, `LIMIT` a page): all Plays
 * (`plays_list_idx`).
 */
export const outboundPlays = outboundSchema.table(
  'plays',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    name: text('name').notNull(),
    intent: text('intent', { enum: PLAY_INTENTS }).notNull(),
    goal: text('goal').notNull(),
    source: text('source', { enum: PLAY_SOURCES }).notNull(),
    status: text('status', { enum: PLAY_STATUSES }).notNull().default('proposed'),
    steps: jsonb('steps').notNull().default(sql`'[]'::jsonb`),
    evidenceCount: integer('evidence_count').notNull().default(0),
    createdByMembershipId: text('created_by_membership_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'plays_pkey', columns: [t.organizationId, t.id] }),
    check('plays_id_shape', idShape('id', 'ply')),
    check('plays_organization_id_shape', orgShape),
    check('plays_organization_not_global', notGlobal),
    check('plays_created_by_membership_id_shape', idShape('created_by_membership_id', 'mem')),
    check(
      'plays_name_shape',
      sql`char_length(${t.name}) between 1 and ${num(MAX_CAMPAIGN_NAME_LENGTH)}`
    ),
    check(
      'plays_goal_shape',
      sql`char_length(${t.goal}) between 1 and ${num(MAX_DRAFT_GOAL_LENGTH)}`
    ),
    check('plays_intent_known', sql`${t.intent} in (${list(PLAY_INTENTS)})`),
    check('plays_source_known', sql`${t.source} in (${list(PLAY_SOURCES)})`),
    check('plays_status_known', sql`${t.status} in (${list(PLAY_STATUSES)})`),
    check(
      'plays_steps_shape',
      sql`jsonb_typeof(${t.steps}) = 'array' and jsonb_array_length(${t.steps}) <= ${num(MAX_PLAY_STEPS)}`
    ),
    check(
      'plays_evidence_count_range',
      sql`${t.evidenceCount} between 0 and ${num(MAX_PLAY_EVIDENCE)}`
    ),
    index('plays_list_idx').on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  ]
)

/**
 * What a Play was drawn from: a moment of a Call (with its Deal record) or a playbook document
 * page. A citation fills only the columns of its kind (`moment`: `call_id` and `deal_record_id`;
 * `document`: `document_id` and an optional `page`). `position` orders the list within the Play.
 *
 * Lookups served: a Play's citations in order (the primary key).
 */
export const outboundPlayCitations = outboundSchema.table(
  'play_citations',
  {
    organizationId: text('organization_id').notNull(),
    playId: text('play_id').notNull(),
    position: smallint('position').notNull(),
    kind: text('kind', { enum: PLAY_CITATION_KINDS }).notNull(),
    callId: text('call_id'),
    dealRecordId: text('deal_record_id'),
    documentId: text('document_id'),
    page: integer('page'),
  },
  (t) => [
    primaryKey({
      name: 'play_citations_pkey',
      columns: [t.organizationId, t.playId, t.position],
    }),
    check('play_citations_organization_id_shape', orgShape),
    check('play_citations_organization_not_global', notGlobal),
    check('play_citations_play_id_shape', idShape('play_id', 'ply')),
    check('play_citations_call_id_shape', idShape('call_id', 'call')),
    check('play_citations_deal_record_id_shape', idShape('deal_record_id', 'deal')),
    check('play_citations_document_id_shape', idShape('document_id', 'doc')),
    check(
      'play_citations_position_range',
      sql`${t.position} between 0 and ${num(MAX_PLAY_CITATIONS - 1)}`
    ),
    check('play_citations_kind_known', sql`${t.kind} in (${list(PLAY_CITATION_KINDS)})`),
    check(
      'play_citations_fields_match_kind',
      sql`(${t.kind} = 'moment' and ${t.callId} is not null and ${t.dealRecordId} is not null
          and ${t.documentId} is null and ${t.page} is null)
        or (${t.kind} = 'document' and ${t.documentId} is not null
          and ${t.callId} is null and ${t.dealRecordId} is null
          and (${t.page} is null or ${t.page} >= 1))`
    ),
    foreignKey({
      name: 'play_citations_play_fk',
      columns: [t.organizationId, t.playId],
      foreignColumns: [outboundPlays.organizationId, outboundPlays.id],
    }).onDelete('cascade'),
  ]
)

/**
 * A Campaign: an audience, a goal, the Sequence that serves it and how it sends. `sequence_version`
 * is the current version of its Sequence (0 while none is written, so no foreign key to
 * `sequences`); `previewed_version` and `previewed_at` record the version a Rep last previewed,
 * which launching requires to match. `audience` is the audience definition (a JSON object,
 * validated by the contract at the service edge) at `audience_version`. `send_window` is a JSON
 * object with `timeZone`, `days`, `startMinute` and `endMinute`, read in the Campaign's or the
 * Prospect's zone (`window_zone`). A Campaign is archived exactly when `archived_at` is set.
 *
 * Lists served (keyset `(created_at, id)` newest first, `LIMIT` a page): all Campaigns
 * (`campaigns_list_idx`) and by state (`campaigns_state_idx`).
 */
export const outboundCampaigns = outboundSchema.table(
  'campaigns',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    name: text('name').notNull(),
    goal: text('goal').notNull(),
    state: text('state', { enum: CAMPAIGN_STATES }).notNull().default('draft'),
    audience: jsonb('audience').notNull(),
    audienceVersion: integer('audience_version').notNull().default(0),
    sequenceVersion: integer('sequence_version').notNull().default(0),
    previewedVersion: integer('previewed_version'),
    previewedAt: ts('previewed_at'),
    approvalMode: text('approval_mode', { enum: CAMPAIGN_APPROVAL_MODES })
      .notNull()
      .default('review'),
    language: text('language', { enum: OUTBOUND_LANGUAGES }).notNull().default('en'),
    sendWindow: jsonb('send_window').notNull(),
    windowZone: text('window_zone', { enum: WINDOW_ZONES }).notNull().default('campaign'),
    dailyCap: integer('daily_cap').notNull(),
    ownerMembershipId: text('owner_membership_id').notNull(),
    teamId: text('team_id'),
    playId: text('play_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
    launchedAt: ts('launched_at'),
    archivedAt: ts('archived_at'),
  },
  (t) => [
    primaryKey({ name: 'campaigns_pkey', columns: [t.organizationId, t.id] }),
    check('campaigns_id_shape', idShape('id', 'cpg')),
    check('campaigns_organization_id_shape', orgShape),
    check('campaigns_organization_not_global', notGlobal),
    check('campaigns_owner_membership_id_shape', idShape('owner_membership_id', 'mem')),
    check('campaigns_team_id_shape', idShape('team_id', 'team')),
    check('campaigns_play_id_shape', idShape('play_id', 'ply')),
    check(
      'campaigns_name_shape',
      sql`char_length(${t.name}) between 1 and ${num(MAX_CAMPAIGN_NAME_LENGTH)}`
    ),
    check(
      'campaigns_goal_shape',
      sql`char_length(${t.goal}) between 1 and ${num(MAX_DRAFT_GOAL_LENGTH)}`
    ),
    check('campaigns_state_known', sql`${t.state} in (${list(CAMPAIGN_STATES)})`),
    check(
      'campaigns_approval_mode_known',
      sql`${t.approvalMode} in (${list(CAMPAIGN_APPROVAL_MODES)})`
    ),
    check('campaigns_language_known', sql`${t.language} in (${list(OUTBOUND_LANGUAGES)})`),
    check('campaigns_window_zone_known', sql`${t.windowZone} in (${list(WINDOW_ZONES)})`),
    check('campaigns_audience_shape', sql`jsonb_typeof(${t.audience}) = 'object'`),
    check(
      'campaigns_versions_range',
      sql`${t.audienceVersion} between 0 and ${num(MAX_CAMPAIGN_VERSION)}
        and ${t.sequenceVersion} between 0 and ${num(MAX_CAMPAIGN_VERSION)}
        and (${t.previewedVersion} is null
          or ${t.previewedVersion} between 0 and ${num(MAX_CAMPAIGN_VERSION)})`
    ),
    check(
      'campaigns_send_window_shape',
      sql`jsonb_typeof(${t.sendWindow}) = 'object'
        and (${t.sendWindow}->>'startMinute')::int between 0 and 1439
        and (${t.sendWindow}->>'endMinute')::int between 1 and 1440
        and (${t.sendWindow}->>'endMinute')::int > (${t.sendWindow}->>'startMinute')::int`
    ),
    check('campaigns_daily_cap_range', sql`${t.dailyCap} between 1 and ${num(MAX_DAILY_CAP)}`),
    check(
      'campaigns_archived_matches_state',
      sql`(${t.state} = 'archived') = (${t.archivedAt} is not null)`
    ),
    foreignKey({
      name: 'campaigns_play_fk',
      columns: [t.organizationId, t.playId],
      foreignColumns: [outboundPlays.organizationId, outboundPlays.id],
    }),
    index('campaigns_list_idx').on(t.organizationId, t.createdAt.desc(), t.id.desc()),
    index('campaigns_state_idx').on(t.organizationId, t.state, t.createdAt.desc(), t.id.desc()),
  ]
)

/**
 * One version of a Campaign's Sequence. Editing a Sequence writes a new version (the Campaign's
 * `sequence_version` moves to it) and leaves the old ones, which Enrollments in flight may still
 * be on. Its steps and variants hang off it and go with it.
 *
 * Lookups served: a Campaign's versions (the primary key).
 */
export const outboundSequences = outboundSchema.table(
  'sequences',
  {
    organizationId: text('organization_id').notNull(),
    campaignId: text('campaign_id').notNull(),
    version: integer('version').notNull(),
    createdByMembershipId: text('created_by_membership_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'sequences_pkey',
      columns: [t.organizationId, t.campaignId, t.version],
    }),
    check('sequences_organization_id_shape', orgShape),
    check('sequences_organization_not_global', notGlobal),
    check('sequences_campaign_id_shape', idShape('campaign_id', 'cpg')),
    check('sequences_created_by_membership_id_shape', idShape('created_by_membership_id', 'mem')),
    check('sequences_version_range', sql`${t.version} between 1 and ${num(MAX_CAMPAIGN_VERSION)}`),
    foreignKey({
      name: 'sequences_campaign_fk',
      columns: [t.organizationId, t.campaignId],
      foreignColumns: [outboundCampaigns.organizationId, outboundCampaigns.id],
    }).onDelete('cascade'),
  ]
)

/**
 * One step of one version of a Sequence, at `position` (0 to 49) and named by `key` (unique within
 * the version). Which columns a step fills follows its kind: `email` a `goal` and `next_key`;
 * `wait` `wait_hours` (1 to 2160) and `next_key`; `branch` `arms` (a JSON array of 1 to 5 arms)
 * and `default_next_key`; `rep_task` a `task`, an `instruction`, `due_in_hours` and `next_key`;
 * `end` nothing. That the keys named exist in the version is checked by the service.
 *
 * Lookups served: a version's steps in order (the primary key) and by key
 * (`steps_key_key`, which variants reference).
 */
export const outboundSteps = outboundSchema.table(
  'steps',
  {
    organizationId: text('organization_id').notNull(),
    campaignId: text('campaign_id').notNull(),
    version: integer('version').notNull(),
    position: smallint('position').notNull(),
    key: text('key').notNull(),
    kind: text('kind', { enum: STEP_KINDS }).notNull(),
    goal: text('goal'),
    nextKey: text('next_key'),
    waitHours: integer('wait_hours'),
    task: text('task', { enum: STEP_TASKS }),
    instruction: text('instruction'),
    dueInHours: integer('due_in_hours'),
    arms: jsonb('arms'),
    defaultNextKey: text('default_next_key'),
  },
  (t) => [
    primaryKey({
      name: 'steps_pkey',
      columns: [t.organizationId, t.campaignId, t.version, t.position],
    }),
    check('steps_organization_id_shape', orgShape),
    check('steps_organization_not_global', notGlobal),
    check('steps_campaign_id_shape', idShape('campaign_id', 'cpg')),
    check('steps_key_shape', sql.raw(`"key" ~ '${KEY_SHAPE}'`)),
    check('steps_next_key_shape', keyShape('next_key')),
    check('steps_default_next_key_shape', keyShape('default_next_key')),
    check('steps_position_range', sql`${t.position} between 0 and ${num(MAX_SEQUENCE_STEPS - 1)}`),
    check('steps_kind_known', sql`${t.kind} in (${list(STEP_KINDS)})`),
    check(
      'steps_fields_match_kind',
      sql`(${t.kind} = 'email'
          and ${t.goal} is not null and char_length(${t.goal}) between 1 and ${num(MAX_DRAFT_GOAL_LENGTH)}
          and ${t.nextKey} is not null
          and ${t.waitHours} is null and ${t.task} is null and ${t.instruction} is null
          and ${t.dueInHours} is null and ${t.arms} is null and ${t.defaultNextKey} is null)
        or (${t.kind} = 'wait'
          and ${t.waitHours} is not null and ${t.waitHours} between 1 and ${num(MAX_STEP_HOURS)}
          and ${t.nextKey} is not null
          and ${t.goal} is null and ${t.task} is null and ${t.instruction} is null
          and ${t.dueInHours} is null and ${t.arms} is null and ${t.defaultNextKey} is null)
        or (${t.kind} = 'branch'
          and jsonb_typeof(${t.arms}) = 'array'
          and jsonb_array_length(${t.arms}) between 1 and ${num(MAX_BRANCH_ARMS)}
          and ${t.defaultNextKey} is not null
          and ${t.goal} is null and ${t.nextKey} is null and ${t.waitHours} is null
          and ${t.task} is null and ${t.instruction} is null and ${t.dueInHours} is null)
        or (${t.kind} = 'rep_task'
          and ${t.task} in (${list(STEP_TASKS)})
          and ${t.instruction} is not null and char_length(${t.instruction}) between 1 and ${num(MAX_TASK_INSTRUCTION_LENGTH)}
          and ${t.dueInHours} is not null and ${t.dueInHours} between 1 and ${num(MAX_STEP_HOURS)}
          and ${t.nextKey} is not null
          and ${t.goal} is null and ${t.waitHours} is null
          and ${t.arms} is null and ${t.defaultNextKey} is null)
        or (${t.kind} = 'end'
          and ${t.goal} is null and ${t.nextKey} is null and ${t.waitHours} is null
          and ${t.task} is null and ${t.instruction} is null and ${t.dueInHours} is null
          and ${t.arms} is null and ${t.defaultNextKey} is null)`
    ),
    unique('steps_key_key').on(t.organizationId, t.campaignId, t.version, t.key),
    foreignKey({
      name: 'steps_sequence_fk',
      columns: [t.organizationId, t.campaignId, t.version],
      foreignColumns: [
        outboundSequences.organizationId,
        outboundSequences.campaignId,
        outboundSequences.version,
      ],
    }).onDelete('cascade'),
  ]
)

/**
 * One variant of an email step: an angle the step's draft takes, with a share of the sends
 * (`weight`, 1 to 99). At most one variant of a step is promoted (`variants_promoted_key`), by the
 * engine (`auto`) or a Rep (`manual`, which names the Rep). A step has 2 to 4 variants whose
 * weights sum to 100, which only the service can check.
 *
 * Lookups served: a step's variants in order (the primary key).
 */
export const outboundVariants = outboundSchema.table(
  'variants',
  {
    organizationId: text('organization_id').notNull(),
    campaignId: text('campaign_id').notNull(),
    version: integer('version').notNull(),
    stepKey: text('step_key').notNull(),
    key: text('key').notNull(),
    position: smallint('position').notNull(),
    label: text('label').notNull(),
    angle: text('angle').notNull(),
    weight: smallint('weight').notNull(),
    promotedSource: text('promoted_source', { enum: PROMOTION_SOURCES }),
    promotedByMembershipId: text('promoted_by_membership_id'),
    promotedAt: ts('promoted_at'),
    /** Auto-promotion settings of the Step's test, repeated on each of its rows; both null means manual. */
    promotionMinSample: integer('promotion_min_sample'),
    promotionMarginPoints: doublePrecision('promotion_margin_points'),
  },
  (t) => [
    primaryKey({
      name: 'variants_pkey',
      columns: [t.organizationId, t.campaignId, t.version, t.stepKey, t.key],
    }),
    check('variants_organization_id_shape', orgShape),
    check('variants_organization_not_global', notGlobal),
    check('variants_campaign_id_shape', idShape('campaign_id', 'cpg')),
    check('variants_step_key_shape', sql.raw(`"step_key" ~ '${KEY_SHAPE}'`)),
    check('variants_key_shape', sql.raw(`"key" ~ '${KEY_SHAPE}'`)),
    check('variants_promoted_by_membership_id_shape', idShape('promoted_by_membership_id', 'mem')),
    check('variants_position_range', sql`${t.position} between 0 and 3`),
    check(
      'variants_label_shape',
      sql`char_length(${t.label}) between 1 and ${num(MAX_VARIANT_LABEL_LENGTH)}`
    ),
    check(
      'variants_angle_shape',
      sql`char_length(${t.angle}) between 1 and ${num(MAX_VARIANT_ANGLE_LENGTH)}`
    ),
    check('variants_weight_range', sql`${t.weight} between 1 and ${num(MAX_VARIANT_WEIGHT)}`),
    check(
      'variants_promotion_matches',
      sql`(${t.promotedSource} is null) = (${t.promotedAt} is null)
        and (${t.promotedSource} is null or ${t.promotedSource} in (${list(PROMOTION_SOURCES)}))
        and ((${t.promotedSource} = 'manual') = (${t.promotedByMembershipId} is not null))`
    ),
    check(
      'variants_promotion_policy',
      sql`(${t.promotionMinSample} is null) = (${t.promotionMarginPoints} is null)
        and (${t.promotionMinSample} is null or ${t.promotionMinSample} between 100 and 100000)
        and (${t.promotionMarginPoints} is null or ${t.promotionMarginPoints} between 1 and 50)`
    ),
    uniqueIndex('variants_position_key').on(
      t.organizationId,
      t.campaignId,
      t.version,
      t.stepKey,
      t.position
    ),
    uniqueIndex('variants_promoted_key')
      .on(t.organizationId, t.campaignId, t.version, t.stepKey)
      .where(sql`${t.promotedSource} is not null`),
    foreignKey({
      name: 'variants_step_fk',
      columns: [t.organizationId, t.campaignId, t.version, t.stepKey],
      foreignColumns: [
        outboundSteps.organizationId,
        outboundSteps.campaignId,
        outboundSteps.version,
        outboundSteps.key,
      ],
    }).onDelete('cascade'),
  ]
)

/**
 * One Prospect's run through one Campaign: where it is (`current_step_key` and its `current_step`
 * index), when its step is next due, and how it ended. `attempt_epoch` is the counter of the send
 * key, moved when a send is retried on purpose. An Enrollment is `active` with a step (and, unless
 * it is waiting on a reply or a Rep, a due time), `stopped` with a reason and a time, or
 * `completed` with a time; the other two hold no due time. A Prospect is enrolled once per
 * Campaign (`enrollments_prospect_key`).
 *
 * `enrollments_due_idx` is the index due selection reads: an Organization's active Enrollments by
 * `next_due_at`. A SECURITY DEFINER trigger notes `outbound.work_hints` from every row that
 * becomes active with a due time.
 *
 * Lists served (keyset `(enrolled_at, id)` newest first, `LIMIT` a page): a Campaign's Enrollments
 * (`enrollments_list_idx`); one Prospect's, also the erasure lookup (`enrollments_prospect_idx`).
 */
export const outboundEnrollments = outboundSchema.table(
  'enrollments',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    campaignId: text('campaign_id').notNull(),
    prospectId: text('prospect_id').notNull(),
    state: text('state', { enum: ENROLLMENT_STATES }).notNull().default('active'),
    stopReason: text('stop_reason', { enum: ENROLLMENT_STOP_REASONS }),
    currentStepKey: text('current_step_key'),
    currentStep: smallint('current_step'),
    attemptEpoch: integer('attempt_epoch').notNull().default(0),
    nextDueAt: ts('next_due_at'),
    enrolledAt: ts('enrolled_at').notNull().defaultNow(),
    stoppedAt: ts('stopped_at'),
    completedAt: ts('completed_at'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'enrollments_pkey', columns: [t.organizationId, t.id] }),
    check('enrollments_id_shape', idShape('id', 'enr')),
    check('enrollments_organization_id_shape', orgShape),
    check('enrollments_organization_not_global', notGlobal),
    check('enrollments_campaign_id_shape', idShape('campaign_id', 'cpg')),
    check('enrollments_prospect_id_shape', idShape('prospect_id', 'prs')),
    check('enrollments_current_step_key_shape', keyShape('current_step_key')),
    check('enrollments_state_known', sql`${t.state} in (${list(ENROLLMENT_STATES)})`),
    check(
      'enrollments_stop_matches_state',
      sql`(${t.state} = 'stopped') = (${t.stopReason} is not null)
        and (${t.state} = 'stopped') = (${t.stoppedAt} is not null)
        and (${t.stopReason} is null or ${t.stopReason} in (${list(ENROLLMENT_STOP_REASONS)}))`
    ),
    check(
      'enrollments_completed_matches_state',
      sql`(${t.state} = 'completed') = (${t.completedAt} is not null)`
    ),
    check(
      'enrollments_step_matches_state',
      sql`(${t.currentStepKey} is null) = (${t.currentStep} is null)
        and (${t.state} <> 'active' or ${t.currentStepKey} is not null)
        and (${t.currentStep} is null or ${t.currentStep} between 0 and ${num(MAX_SEQUENCE_STEPS - 1)})`
    ),
    check('enrollments_due_only_when_active', sql`${t.state} = 'active' or ${t.nextDueAt} is null`),
    check(
      'enrollments_attempt_epoch_range',
      sql`${t.attemptEpoch} between 0 and ${num(MAX_ATTEMPT_EPOCH)}`
    ),
    uniqueIndex('enrollments_prospect_key').on(t.organizationId, t.campaignId, t.prospectId),
    // Due selection: an Organization's active Enrollments by due time.
    index('enrollments_due_idx')
      .on(t.organizationId, t.nextDueAt)
      .where(sql`${t.state} = 'active' and ${t.nextDueAt} is not null`),
    index('enrollments_list_idx').on(
      t.organizationId,
      t.campaignId,
      t.enrolledAt.desc(),
      t.id.desc()
    ),
    index('enrollments_prospect_idx').on(t.organizationId, t.prospectId),
    foreignKey({
      name: 'enrollments_campaign_fk',
      columns: [t.organizationId, t.campaignId],
      foreignColumns: [outboundCampaigns.organizationId, outboundCampaigns.id],
    }),
  ]
)

/**
 * The running tally of one variant of a Step: how many sends it made and how many Enrollments
 * that last received it then replied, hard bounced or unsubscribed. The engine adds to it in the
 * same transaction that records the event, so a results read costs the number of variants (at
 * most 4) instead of a scan of the Campaign's log.
 *
 * Lookups served: a Step's variants (the primary key prefix).
 */
export const outboundVariantStats = outboundSchema.table(
  'variant_stats',
  {
    organizationId: text('organization_id').notNull(),
    campaignId: text('campaign_id').notNull(),
    version: integer('version').notNull(),
    stepKey: text('step_key').notNull(),
    variantKey: text('variant_key').notNull(),
    sent: integer('sent').notNull().default(0),
    replied: integer('replied').notNull().default(0),
    bounced: integer('bounced').notNull().default(0),
    unsubscribed: integer('unsubscribed').notNull().default(0),
  },
  (t) => [
    primaryKey({
      name: 'variant_stats_pkey',
      columns: [t.organizationId, t.campaignId, t.version, t.stepKey, t.variantKey],
    }),
    check('variant_stats_organization_id_shape', orgShape),
    check('variant_stats_organization_not_global', notGlobal),
    check('variant_stats_campaign_id_shape', idShape('campaign_id', 'cpg')),
    check('variant_stats_step_key_shape', sql.raw(`"step_key" ~ '${KEY_SHAPE}'`)),
    check('variant_stats_variant_key_shape', sql.raw(`"variant_key" ~ '${KEY_SHAPE}'`)),
    check(
      'variant_stats_counts_not_negative',
      sql`${t.sent} >= 0 and ${t.replied} >= 0 and ${t.bounced} >= 0 and ${t.unsubscribed} >= 0`
    ),
    foreignKey({
      name: 'variant_stats_variant_fk',
      columns: [t.organizationId, t.campaignId, t.version, t.stepKey, t.variantKey],
      foreignColumns: [
        outboundVariants.organizationId,
        outboundVariants.campaignId,
        outboundVariants.version,
        outboundVariants.stepKey,
        outboundVariants.key,
      ],
    }).onDelete('cascade'),
  ]
)

/**
 * What happened to an Enrollment, in order: an append-only history (the service role cannot
 * update a row). `send_id` names the send decision of a `sent`, `deferred` or `refused` event;
 * `stop_reason` is set exactly on a `stopped` event and `call_result` exactly on a `call_result`
 * event; `actor_membership_id` names the Rep who caused it, when one did.
 *
 * Lists served (oldest first, `LIMIT` a page): an Enrollment's history
 * (`enrollment_events_enrollment_idx`).
 */
export const outboundEnrollmentEvents = outboundSchema.table(
  'enrollment_events',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    enrollmentId: text('enrollment_id').notNull(),
    kind: text('kind', { enum: ENROLLMENT_EVENT_KINDS }).notNull(),
    stepKey: text('step_key'),
    variantKey: text('variant_key'),
    sendId: text('send_id'),
    stopReason: text('stop_reason', { enum: ENROLLMENT_STOP_REASONS }),
    callResult: text('call_result', { enum: CALL_RESULTS }),
    actorMembershipId: text('actor_membership_id'),
    occurredAt: ts('occurred_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'enrollment_events_pkey', columns: [t.organizationId, t.id] }),
    check('enrollment_events_id_shape', idShape('id', 'eev')),
    check('enrollment_events_organization_id_shape', orgShape),
    check('enrollment_events_organization_not_global', notGlobal),
    check('enrollment_events_enrollment_id_shape', idShape('enrollment_id', 'enr')),
    check('enrollment_events_step_key_shape', keyShape('step_key')),
    check('enrollment_events_variant_key_shape', keyShape('variant_key')),
    check('enrollment_events_send_id_shape', idShape('send_id', 'snd')),
    check('enrollment_events_actor_membership_id_shape', idShape('actor_membership_id', 'mem')),
    check('enrollment_events_kind_known', sql`${t.kind} in (${list(ENROLLMENT_EVENT_KINDS)})`),
    check(
      'enrollment_events_stop_reason_matches_kind',
      sql`(${t.kind} = 'stopped') = (${t.stopReason} is not null)
        and (${t.stopReason} is null or ${t.stopReason} in (${list(ENROLLMENT_STOP_REASONS)}))`
    ),
    check(
      'enrollment_events_call_result_matches_kind',
      sql`(${t.kind} = 'call_result') = (${t.callResult} is not null)
        and (${t.callResult} is null or ${t.callResult} in (${list(CALL_RESULTS)}))`
    ),
    index('enrollment_events_enrollment_idx').on(
      t.organizationId,
      t.enrollmentId,
      t.occurredAt,
      t.id
    ),
    foreignKey({
      name: 'enrollment_events_enrollment_fk',
      columns: [t.organizationId, t.enrollmentId],
      foreignColumns: [outboundEnrollments.organizationId, outboundEnrollments.id],
    }).onDelete('cascade'),
  ]
)

/**
 * The decision the engine took on one send: sent, refused, deferred or failed, with the checks it
 * ran. The send key `(enrollment_id, step, attempt_epoch)` is unique (`send_decisions_send_key`),
 * so a retried step finds its decision instead of deciding twice. `reason` is set exactly when the
 * send is refused or deferred, a refusal never has a deferring reason, and a deferred send has a
 * `retry_at`. A send in flight, sent or failed names its Mailbox, and `sent_at` is set exactly
 * when it is sent. `checks` is a JSON array of at most 9 results, one per check.
 *
 * Lists served (keyset `(decided_at, id)` newest first, `LIMIT` a page): a Campaign's decisions
 * (`send_decisions_campaign_idx`); deferred ones by retry time (`send_decisions_retry_idx`).
 */
export const outboundSendDecisions = outboundSchema.table(
  'send_decisions',
  {
    id: text('id').notNull(),
    organizationId: text('organization_id').notNull(),
    campaignId: text('campaign_id').notNull(),
    enrollmentId: text('enrollment_id').notNull(),
    prospectId: text('prospect_id').notNull(),
    step: smallint('step').notNull(),
    attemptEpoch: integer('attempt_epoch').notNull().default(0),
    mailboxId: text('mailbox_id'),
    state: text('state', { enum: SEND_STATES }).notNull(),
    reason: text('reason', { enum: SEND_REFUSAL_REASONS }),
    checks: jsonb('checks').notNull().default(sql`'[]'::jsonb`),
    retryAt: ts('retry_at'),
    decidedAt: ts('decided_at').notNull().defaultNow(),
    sentAt: ts('sent_at'),
  },
  (t) => [
    primaryKey({ name: 'send_decisions_pkey', columns: [t.organizationId, t.id] }),
    check('send_decisions_id_shape', idShape('id', 'snd')),
    check('send_decisions_organization_id_shape', orgShape),
    check('send_decisions_organization_not_global', notGlobal),
    check('send_decisions_campaign_id_shape', idShape('campaign_id', 'cpg')),
    check('send_decisions_enrollment_id_shape', idShape('enrollment_id', 'enr')),
    check('send_decisions_prospect_id_shape', idShape('prospect_id', 'prs')),
    check('send_decisions_mailbox_id_shape', idShape('mailbox_id', 'mbx')),
    check('send_decisions_step_range', sql`${t.step} between 0 and ${num(MAX_SEQUENCE_STEP)}`),
    check(
      'send_decisions_attempt_epoch_range',
      sql`${t.attemptEpoch} between 0 and ${num(MAX_ATTEMPT_EPOCH)}`
    ),
    check('send_decisions_state_known', sql`${t.state} in (${list(SEND_STATES)})`),
    check(
      'send_decisions_reason_matches_state',
      sql`(${t.state} in ('refused', 'deferred')) = (${t.reason} is not null)
        and (${t.reason} is null or ${t.reason} in (${list(SEND_REFUSAL_REASONS)}))
        and (${t.state} <> 'refused' or ${t.reason} not in (${list(SEND_DEFERRING_REASONS)}))
        and (${t.state} <> 'deferred' or ${t.reason} in (${list(SEND_DEFERRING_REASONS)}))`
    ),
    check(
      'send_decisions_retry_matches_state',
      sql`(${t.state} = 'deferred') = (${t.retryAt} is not null)`
    ),
    check(
      'send_decisions_mailbox_matches_state',
      sql`${t.state} not in ('sending', 'sent', 'failed') or ${t.mailboxId} is not null`
    ),
    check(
      'send_decisions_sent_matches_state',
      sql`(${t.state} = 'sent') = (${t.sentAt} is not null)`
    ),
    check(
      'send_decisions_checks_shape',
      sql`jsonb_typeof(${t.checks}) = 'array'
        and jsonb_array_length(${t.checks}) <= ${num(SEND_CHECKS.length)}`
    ),
    uniqueIndex('send_decisions_send_key').on(
      t.organizationId,
      t.enrollmentId,
      t.step,
      t.attemptEpoch
    ),
    index('send_decisions_campaign_idx').on(
      t.organizationId,
      t.campaignId,
      t.decidedAt.desc(),
      t.id.desc()
    ),
    index('send_decisions_retry_idx')
      .on(t.organizationId, t.retryAt)
      .where(sql`${t.state} = 'deferred'`),
    foreignKey({
      name: 'send_decisions_campaign_fk',
      columns: [t.organizationId, t.campaignId],
      foreignColumns: [outboundCampaigns.organizationId, outboundCampaigns.id],
    }),
    foreignKey({
      name: 'send_decisions_enrollment_fk',
      columns: [t.organizationId, t.enrollmentId],
      foreignColumns: [outboundEnrollments.organizationId, outboundEnrollments.id],
    }),
  ]
)

/**
 * One row per kind of work and Organization that may have work from `due_at` on: the registry
 * `outbound.organizations_with_work` reads, because row-level security hides every tenant table
 * from any role outside one Organization's scope. **Not a tenant table.** A SECURITY DEFINER
 * trigger on `enrollments` writes it (an upsert that only moves `due_at` earlier); the discovery
 * function verifies a due row against `enrollments` in that Organization's scope, then moves it to
 * the next due time or removes it. A row is a hint, never the truth: it may be earlier than the
 * real work or outlive it until the next verification, and is never later. No service role holds
 * any privilege on it; the function and the trigger are the only way in. Mirrors
 * `playbookWorkHints`, without a global scope.
 */
export const outboundWorkHints = outboundSchema.table(
  'work_hints',
  {
    kind: text('kind', { enum: OUTBOUND_WORK_KINDS }).notNull(),
    organizationId: text('organization_id').notNull(),
    dueAt: ts('due_at').notNull(),
  },
  (t) => [
    primaryKey({ name: 'work_hints_pkey', columns: [t.kind, t.organizationId] }),
    check('work_hints_kind_known', sql`${t.kind} in (${list(OUTBOUND_WORK_KINDS)})`),
    check('work_hints_organization_id_shape', orgShape),
    // The due ones of a kind, oldest first: the discovery scan.
    index('work_hints_due_idx').on(t.kind, t.dueAt, t.organizationId),
  ]
)
