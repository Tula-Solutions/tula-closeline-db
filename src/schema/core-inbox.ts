import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { coreSchema } from './core'
import { prospects } from './core-prospects'
import { organizations, teams } from './core-tables'

/*
 * The values below mirror the contract's `src/inbox` area (M09-T1, tula-closeline-contract); this
 * library does not depend on the contract, so each carries the name of the constant it copies.
 * `core-inbox.test.ts` pins every value to the list written here.
 */

/** The channels a Conversation runs on. Mirrors the contract's `INBOX_CHANNELS`. */
export const INBOX_CHANNELS = ['email', 'linkedin', 'chat'] as const
/** Who is answering a Conversation. Mirrors the contract's `CONVERSATION_CONTROLLERS`. */
export const CONVERSATION_CONTROLLERS = ['agent', 'rep'] as const
/** The states of a Conversation. Mirrors the contract's `CONVERSATION_STATES`. */
export const CONVERSATION_STATES = [
  'agent',
  'awaiting_approval',
  'rep',
  'escalated',
  'closed',
] as const
/** Whether a Message came from the Prospect or went to them. Mirrors `MESSAGE_DIRECTIONS`. */
export const MESSAGE_DIRECTIONS = ['inbound', 'outbound'] as const
/** Who wrote a Message. Mirrors the contract's `MESSAGE_AUTHOR_KINDS`. */
export const MESSAGE_AUTHOR_KINDS = ['prospect', 'agent', 'rep'] as const
/** What an inbound Message means. Mirrors the contract's `REPLY_LABELS`. */
export const REPLY_LABELS = [
  'positive',
  'question',
  'objection',
  'not_now',
  'wrong_person',
  'unsubscribe',
  'out_of_office',
  'bounce',
  'negative',
  'other',
] as const
/** Who decided a classification: the model or a Rep correcting it. */
export const CLASSIFICATION_DECIDERS = ['model', 'rep'] as const
/** The longest Message or Draft body, in characters. Mirrors `MAX_MESSAGE_BODY_LENGTH`. */
export const MAX_MESSAGE_BODY_LENGTH = 20000
/** The longest provider message id. Mirrors the contract's `providerMessageIdSchema`. */
export const MAX_PROVIDER_MESSAGE_ID_LENGTH = 255
/** The most Conversations a count of pending Drafts can report. Mirrors the contract. */
export const MAX_PENDING_DRAFT_COUNT = 1000
/** Who wrote a Draft. Mirrors the contract's `DRAFT_AUTHORS`. */
export const DRAFT_AUTHORS = ['agent', 'rep'] as const
/** The states of a Draft. Mirrors the contract's `DRAFT_STATUSES`. */
export const DRAFT_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'sent',
  'superseded',
  'void',
] as const
/** Why a Draft waits for a person. Mirrors the contract's `DRAFT_HOLD_REASONS`. */
export const DRAFT_HOLD_REASONS = [
  'policy',
  'ungrounded',
  'check_failed',
  'escalated',
  'first_message',
] as const
/** The longest sentence a Draft gives for its strategy. Mirrors `MAX_STRATEGY_LENGTH`. */
export const MAX_STRATEGY_LENGTH = 300
/** The most checks a Draft carries. Mirrors the contract's `draftSchema`. */
export const MAX_DRAFT_CHECKS = 20
/** What a Source can be. Mirrors the contract's `DRAFT_SOURCE_KINDS`. */
export const DRAFT_SOURCE_KINDS = ['moment', 'document_chunk'] as const
/** The Outcome of a Deal a Moment belongs to. Mirrors the contract's `OUTCOMES`. */
export const SOURCE_OUTCOMES = ['won', 'lost', 'open'] as const
/** The most evidence a Source reports. Mirrors the contract's `sourceSchema`. */
export const MAX_EVIDENCE_COUNT = 100000
/** The decisions recorded about a Draft or a Conversation. Mirrors the contract's `DECISION_KINDS`. */
export const DECISION_KINDS = [
  'approve',
  'edit_approve',
  'reject',
  'auto_release',
  'takeover',
  'hand_back',
] as const
/** The longest note with a decision. Mirrors the contract's `MAX_DECISION_NOTE_LENGTH`. */
export const MAX_DECISION_NOTE_LENGTH = 500
/** The approval modes. Mirrors the contract's `APPROVAL_MODES`. */
export const APPROVAL_MODES = ['always', 'below_confidence', 'except'] as const
/** The most labels an `except` rule names. Mirrors the contract's `MAX_EXCEPT_LABELS`. */
export const MAX_EXCEPT_LABELS = 10
/** What fires an escalation rule (M09 spec, T11). */
export const ESCALATION_TRIGGERS = [
  'asks_for_person',
  'pricing_or_legal',
  'negative_tone',
  'low_confidence',
  'writer_failure',
] as const
/** Where an escalation goes: the Prospect's owner, a Team in turn, or the Admin queue. */
export const ESCALATION_TARGETS = ['prospect_owner', 'team_round_robin', 'admin_queue'] as const

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })
const orgRef = () =>
  text('organization_id')
    .notNull()
    .references(() => organizations.organizationId, { onDelete: 'cascade' })
const body = (column: string) =>
  sql.raw(
    `char_length("${column}") between 1 and ${MAX_MESSAGE_BODY_LENGTH} and btrim("${column}") <> ''`
  )

/**
 * A Conversation: one Prospect on one channel, and who answers it now. `controller` is `agent` or
 * `rep`; a Rep-controlled Conversation names the Rep (`controller_membership_id`) and is in the
 * `rep` or `closed` state, as the contract's `conversationSchema` requires. `owner_membership_id`
 * is the Rep whose inbox it is in. `latest_label` and `pending_draft_count` are kept by core's
 * service so the list needs no join. A Prospect's erasure removes its Conversations.
 *
 * Lists served (most recent activity first, keyset `(last_message_at, id)`):
 * - all of an Organization's Conversations: `conversations_list_idx`;
 * - one owner's (a Rep's inbox, a Manager's per-Rep view): `conversations_owner_list_idx`;
 * - one state (the escalated and awaiting-approval filters): `conversations_state_list_idx`;
 * - one owner in one state: `conversations_owner_state_list_idx`;
 * - a Prospect's Conversations and the lookup for an ingested Message: `conversations_prospect_idx`.
 */
export const conversations = coreSchema.table(
  'conversations',
  {
    id: text('id').notNull(),
    organizationId: orgRef(),
    prospectId: text('prospect_id').notNull(),
    channel: text('channel', { enum: INBOX_CHANNELS }).notNull(),
    controller: text('controller', { enum: CONVERSATION_CONTROLLERS }).notNull().default('agent'),
    controllerMembershipId: text('controller_membership_id'),
    state: text('state', { enum: CONVERSATION_STATES }).notNull().default('agent'),
    ownerMembershipId: text('owner_membership_id'),
    latestLabel: text('latest_label', { enum: REPLY_LABELS }),
    pendingDraftCount: integer('pending_draft_count').notNull().default(0),
    lastMessageAt: ts('last_message_at').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'conversations_pkey', columns: [t.organizationId, t.id] }),
    unique('conversations_organization_id_channel_key').on(t.organizationId, t.id, t.channel),
    check('conversations_id_shape', idShape('id', 'cnv')),
    check('conversations_organization_id_shape', orgShape),
    check('conversations_organization_not_global', notGlobal),
    check('conversations_prospect_id_shape', idShape('prospect_id', 'prs')),
    check(
      'conversations_controller_membership_id_shape',
      idShape('controller_membership_id', 'mem')
    ),
    check('conversations_owner_membership_id_shape', idShape('owner_membership_id', 'mem')),
    check('conversations_channel_known', sql`${t.channel} in (${list(INBOX_CHANNELS)})`),
    check(
      'conversations_controller_known',
      sql`${t.controller} in (${list(CONVERSATION_CONTROLLERS)})`
    ),
    check('conversations_state_known', sql`${t.state} in (${list(CONVERSATION_STATES)})`),
    check(
      'conversations_latest_label_known',
      sql`${t.latestLabel} is null or ${t.latestLabel} in (${list(REPLY_LABELS)})`
    ),
    check(
      'conversations_pending_draft_count_bounds',
      sql`${t.pendingDraftCount} between 0 and ${sql.raw(String(MAX_PENDING_DRAFT_COUNT))}`
    ),
    check(
      'conversations_controller_names_rep',
      sql`(${t.controller} = 'rep') = (${t.controllerMembershipId} is not null)`
    ),
    check('conversations_rep_state_has_rep', sql`${t.state} <> 'rep' or ${t.controller} = 'rep'`),
    check(
      'conversations_rep_controls_rep_or_closed',
      sql`${t.controller} <> 'rep' or ${t.state} in ('rep', 'closed')`
    ),
    foreignKey({
      name: 'conversations_prospect_fk',
      columns: [t.organizationId, t.prospectId],
      foreignColumns: [prospects.organizationId, prospects.id],
    }).onDelete('cascade'),
    index('conversations_list_idx').on(t.organizationId, t.lastMessageAt.desc(), t.id.desc()),
    index('conversations_owner_list_idx')
      .on(t.organizationId, t.ownerMembershipId, t.lastMessageAt.desc(), t.id.desc())
      .where(sql`${t.ownerMembershipId} is not null`),
    index('conversations_state_list_idx').on(
      t.organizationId,
      t.state,
      t.lastMessageAt.desc(),
      t.id.desc()
    ),
    index('conversations_owner_state_list_idx')
      .on(t.organizationId, t.ownerMembershipId, t.state, t.lastMessageAt.desc(), t.id.desc())
      .where(sql`${t.ownerMembershipId} is not null`),
    index('conversations_prospect_idx').on(t.organizationId, t.prospectId, t.channel),
  ]
)

/**
 * A Message of a Conversation, inbound or outbound. Append-only for the service role: it holds
 * INSERT and SELECT, and UPDATE only on the five classification columns (a classifier writes its
 * label after the Message is stored, and a Rep may correct it); `body`, the author and the ids are
 * never rewritten, and nothing can delete a Message except the cascade of a Prospect's or an
 * Organization's removal. `channel` repeats the Conversation's (a composite foreign key keeps them
 * equal) so the database holds one row per `(organization_id, channel, provider_message_id)`:
 * `messages_provider_message_key` is what makes an ingest idempotent. `body` is the Prospect's or a
 * model's text, so it is untrusted data and is never logged. `draft_id` (the Draft an outbound
 * Message was sent from) has no foreign key: `drafts.reason_trigger_message_id` already points the
 * other way, and Drizzle cannot type a cycle; core's service writes it from the Draft it released.
 *
 * Lists served (oldest first, keyset `(sent_at, id)`): a Conversation's timeline,
 * `messages_conversation_idx`.
 */
export const messages = coreSchema.table(
  'messages',
  {
    id: text('id').notNull(),
    organizationId: orgRef(),
    conversationId: text('conversation_id').notNull(),
    channel: text('channel', { enum: INBOX_CHANNELS }).notNull(),
    direction: text('direction', { enum: MESSAGE_DIRECTIONS }).notNull(),
    authorKind: text('author_kind', { enum: MESSAGE_AUTHOR_KINDS }).notNull(),
    authorMembershipId: text('author_membership_id'),
    providerMessageId: text('provider_message_id').notNull(),
    draftId: text('draft_id'),
    body: text('body').notNull(),
    sentAt: ts('sent_at').notNull(),
    classificationLabel: text('classification_label', { enum: REPLY_LABELS }),
    classificationConfidence: doublePrecision('classification_confidence'),
    classificationDecidedBy: text('classification_decided_by', { enum: CLASSIFICATION_DECIDERS }),
    classificationCorrectedByMembershipId: text('classification_corrected_by_membership_id'),
    classifiedAt: ts('classified_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'messages_pkey', columns: [t.organizationId, t.id] }),
    check('messages_id_shape', idShape('id', 'msg')),
    check('messages_organization_id_shape', orgShape),
    check('messages_organization_not_global', notGlobal),
    check('messages_conversation_id_shape', idShape('conversation_id', 'cnv')),
    check('messages_author_membership_id_shape', idShape('author_membership_id', 'mem')),
    check('messages_draft_id_shape', idShape('draft_id', 'drf')),
    check(
      'messages_classification_corrected_by_shape',
      idShape('classification_corrected_by_membership_id', 'mem')
    ),
    check('messages_channel_known', sql`${t.channel} in (${list(INBOX_CHANNELS)})`),
    check('messages_direction_known', sql`${t.direction} in (${list(MESSAGE_DIRECTIONS)})`),
    check('messages_author_kind_known', sql`${t.authorKind} in (${list(MESSAGE_AUTHOR_KINDS)})`),
    check(
      'messages_provider_message_id_shape',
      sql`${t.providerMessageId} collate "C" ~ '^[\\x21-\\x7e]{1,${sql.raw(String(MAX_PROVIDER_MESSAGE_ID_LENGTH))}}$'`
    ),
    check('messages_body_shape', body('body')),
    check(
      'messages_inbound_is_prospect',
      sql`(${t.direction} = 'inbound') = (${t.authorKind} = 'prospect')`
    ),
    check(
      'messages_rep_names_member',
      sql`(${t.authorKind} = 'rep') = (${t.authorMembershipId} is not null)`
    ),
    check(
      'messages_inbound_has_no_draft',
      sql`${t.direction} <> 'inbound' or ${t.draftId} is null`
    ),
    check('messages_rep_has_draft', sql`${t.authorKind} <> 'rep' or ${t.draftId} is not null`),
    check(
      'messages_classification_inbound_only',
      sql`${t.direction} = 'inbound' or ${t.classificationLabel} is null`
    ),
    check(
      'messages_classification_complete',
      sql`(${t.classificationLabel} is null) = (${t.classificationConfidence} is null)
        and (${t.classificationLabel} is null) = (${t.classificationDecidedBy} is null)
        and (${t.classificationLabel} is null) = (${t.classifiedAt} is null)`
    ),
    check(
      'messages_classification_confidence_bounds',
      sql`${t.classificationConfidence} is null or ${t.classificationConfidence} between 0 and 1`
    ),
    check(
      'messages_classification_decider_known',
      sql`${t.classificationDecidedBy} is null or ${t.classificationDecidedBy} in (${list(CLASSIFICATION_DECIDERS)})`
    ),
    check(
      'messages_classification_correction_names_rep',
      sql`${t.classificationLabel} is null
        or (${t.classificationDecidedBy} = 'rep') = (${t.classificationCorrectedByMembershipId} is not null)`
    ),
    check(
      'messages_correction_needs_label',
      sql`${t.classificationCorrectedByMembershipId} is null or ${t.classificationLabel} is not null`
    ),
    check(
      'messages_classification_label_known',
      sql`${t.classificationLabel} is null or ${t.classificationLabel} in (${list(REPLY_LABELS)})`
    ),
    foreignKey({
      name: 'messages_conversation_fk',
      columns: [t.organizationId, t.conversationId, t.channel],
      foreignColumns: [conversations.organizationId, conversations.id, conversations.channel],
    }).onDelete('cascade'),
    uniqueIndex('messages_provider_message_key').on(
      t.organizationId,
      t.channel,
      t.providerMessageId
    ),
    index('messages_conversation_idx').on(t.organizationId, t.conversationId, t.sentAt, t.id),
    index('messages_draft_idx')
      .on(t.organizationId, t.draftId)
      .where(sql`${t.draftId} is not null`),
  ]
)

/**
 * A Draft reply to a Conversation, written by an Agent or composed by a Rep. An Agent Draft has a
 * `reason` (the trigger Message, its label and a one-sentence strategy), a confidence and its
 * Sources in `draft_sources`; a Rep Draft has none of them and is never held. `ungrounded` is true
 * exactly when an Agent Draft cites no Source (the service sets both together). `hold` is why a
 * pending Draft waits for a person; `checks` is the list of `{name, passed}` the release checks
 * produced. `status` and `decided_at` change as the Draft is decided, so the service role may
 * update this table.
 *
 * Lists served: a Conversation's Drafts, newest first (`drafts_conversation_idx`); the approval
 * queue, pending Drafts oldest first, keyset `(created_at, id)` (`drafts_pending_queue_idx`,
 * partial on `status = 'pending'`).
 */
export const drafts = coreSchema.table(
  'drafts',
  {
    id: text('id').notNull(),
    organizationId: orgRef(),
    conversationId: text('conversation_id').notNull(),
    author: text('author', { enum: DRAFT_AUTHORS }).notNull(),
    authorMembershipId: text('author_membership_id'),
    body: text('body').notNull(),
    reasonTriggerMessageId: text('reason_trigger_message_id'),
    reasonLabel: text('reason_label', { enum: REPLY_LABELS }),
    reasonStrategy: text('reason_strategy'),
    confidence: doublePrecision('confidence'),
    ungrounded: boolean('ungrounded').notNull().default(false),
    checks: jsonb('checks').notNull().default(sql`'[]'::jsonb`),
    hold: text('hold', { enum: DRAFT_HOLD_REASONS }),
    status: text('status', { enum: DRAFT_STATUSES }).notNull().default('pending'),
    createdAt: ts('created_at').notNull().defaultNow(),
    decidedAt: ts('decided_at'),
  },
  (t) => [
    primaryKey({ name: 'drafts_pkey', columns: [t.organizationId, t.id] }),
    check('drafts_id_shape', idShape('id', 'drf')),
    check('drafts_organization_id_shape', orgShape),
    check('drafts_organization_not_global', notGlobal),
    check('drafts_conversation_id_shape', idShape('conversation_id', 'cnv')),
    check('drafts_author_membership_id_shape', idShape('author_membership_id', 'mem')),
    check('drafts_reason_trigger_message_id_shape', idShape('reason_trigger_message_id', 'msg')),
    check('drafts_author_known', sql`${t.author} in (${list(DRAFT_AUTHORS)})`),
    check('drafts_status_known', sql`${t.status} in (${list(DRAFT_STATUSES)})`),
    check(
      'drafts_hold_known',
      sql`${t.hold} is null or ${t.hold} in (${list(DRAFT_HOLD_REASONS)})`
    ),
    check(
      'drafts_reason_label_known',
      sql`${t.reasonLabel} is null or ${t.reasonLabel} in (${list(REPLY_LABELS)})`
    ),
    check('drafts_body_shape', body('body')),
    check(
      'drafts_reason_strategy_shape',
      sql`${t.reasonStrategy} is null or char_length(${t.reasonStrategy}) between 1 and ${sql.raw(String(MAX_STRATEGY_LENGTH))}`
    ),
    check(
      'drafts_confidence_bounds',
      sql`${t.confidence} is null or ${t.confidence} between 0 and 1`
    ),
    check(
      'drafts_checks_shape',
      sql`jsonb_typeof(${t.checks}) = 'array' and jsonb_array_length(${t.checks}) <= ${sql.raw(String(MAX_DRAFT_CHECKS))}`
    ),
    check(
      'drafts_agent_has_reason',
      sql`(${t.author} = 'agent') = (${t.reasonTriggerMessageId} is not null)
        and (${t.author} = 'agent') = (${t.reasonLabel} is not null)
        and (${t.author} = 'agent') = (${t.reasonStrategy} is not null)`
    ),
    check(
      'drafts_agent_has_confidence',
      sql`(${t.author} = 'agent') = (${t.confidence} is not null)`
    ),
    check(
      'drafts_rep_names_member',
      sql`(${t.author} = 'rep') = (${t.authorMembershipId} is not null)`
    ),
    check(
      'drafts_rep_is_plain',
      sql`${t.author} = 'agent' or (not ${t.ungrounded} and ${t.hold} is null)`
    ),
    check('drafts_ungrounded_is_held', sql`not ${t.ungrounded} or ${t.hold} = 'ungrounded'`),
    check(
      'drafts_ungrounded_hold_matches',
      sql`${t.hold} is distinct from 'ungrounded' or ${t.ungrounded}`
    ),
    check(
      'drafts_pending_is_held',
      sql`${t.status} <> 'pending' or ${t.author} = 'rep' or ${t.hold} is not null`
    ),
    check('drafts_pending_is_undecided', sql`${t.status} <> 'pending' or ${t.decidedAt} is null`),
    foreignKey({
      name: 'drafts_conversation_fk',
      columns: [t.organizationId, t.conversationId],
      foreignColumns: [conversations.organizationId, conversations.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'drafts_trigger_message_fk',
      columns: [t.organizationId, t.reasonTriggerMessageId],
      foreignColumns: [messages.organizationId, messages.id],
    }),
    index('drafts_conversation_idx').on(
      t.organizationId,
      t.conversationId,
      t.createdAt.desc(),
      t.id.desc()
    ),
    index('drafts_trigger_message_idx')
      .on(t.organizationId, t.reasonTriggerMessageId)
      .where(sql`${t.reasonTriggerMessageId} is not null`),
    index('drafts_pending_queue_idx')
      .on(t.organizationId, t.createdAt, t.id)
      .where(sql`${t.status} = 'pending'`),
  ]
)

/**
 * A Source a Draft cites: a Moment of a Deal or a chunk of a Playbook document, with the Outcome
 * and the evidence count shown to the approver. `source_ref` is the Playbook's id; the Deal and
 * document ids name rows in the playbook service's schema, which core never reads, so they carry
 * no foreign key. A Source is cited once per Draft. Written when the Draft is, never changed.
 *
 * Lists served: a Draft's Sources (the primary key, in citation order by `position`).
 */
export const draftSources = coreSchema.table(
  'draft_sources',
  {
    organizationId: orgRef(),
    draftId: text('draft_id').notNull(),
    kind: text('kind', { enum: DRAFT_SOURCE_KINDS }).notNull(),
    sourceRef: text('source_ref').notNull(),
    position: integer('position').notNull(),
    dealRecordId: text('deal_record_id'),
    documentId: text('document_id'),
    outcome: text('outcome', { enum: SOURCE_OUTCOMES }),
    evidenceCount: integer('evidence_count').notNull(),
  },
  (t) => [
    primaryKey({
      name: 'draft_sources_pkey',
      columns: [t.organizationId, t.draftId, t.kind, t.sourceRef],
    }),
    check('draft_sources_organization_id_shape', orgShape),
    check('draft_sources_organization_not_global', notGlobal),
    check('draft_sources_draft_id_shape', idShape('draft_id', 'drf')),
    check('draft_sources_deal_record_id_shape', idShape('deal_record_id', 'deal')),
    check('draft_sources_document_id_shape', idShape('document_id', 'doc')),
    check('draft_sources_kind_known', sql`${t.kind} in (${list(DRAFT_SOURCE_KINDS)})`),
    check(
      'draft_sources_source_ref_shape',
      sql`${t.sourceRef} collate "C" ~ '^[A-Za-z0-9_.:-]{1,128}$'`
    ),
    check('draft_sources_position_bounds', sql`${t.position} between 0 and 9`),
    check(
      'draft_sources_outcome_known',
      sql`${t.outcome} is null or ${t.outcome} in (${list(SOURCE_OUTCOMES)})`
    ),
    check(
      'draft_sources_evidence_count_bounds',
      sql`${t.evidenceCount} between 1 and ${sql.raw(String(MAX_EVIDENCE_COUNT))}`
    ),
    check(
      'draft_sources_kind_matches_ids',
      sql`(${t.kind} = 'moment' and ${t.dealRecordId} is not null and ${t.documentId} is null and ${t.outcome} is not null)
        or (${t.kind} = 'document_chunk' and ${t.documentId} is not null and ${t.dealRecordId} is null and ${t.outcome} is null)`
    ),
    foreignKey({
      name: 'draft_sources_draft_fk',
      columns: [t.organizationId, t.draftId],
      foreignColumns: [drafts.organizationId, drafts.id],
    }).onDelete('cascade'),
    unique('draft_sources_position_key').on(t.organizationId, t.draftId, t.position),
  ]
)

/**
 * One decision about a Draft or a Conversation: an approval (with or without an edit), a
 * rejection, an automatic release, a takeover or a hand-back. Append-only for the service role
 * (INSERT and SELECT). Takeover and hand-back name the Conversation only; the others name a Draft.
 * An automatic release has no member; only a rejection carries a note.
 *
 * Lists served: a Conversation's decisions, newest first (`approval_decisions_conversation_idx`);
 * a Draft's (`approval_decisions_draft_idx`).
 */
export const approvalDecisions = coreSchema.table(
  'approval_decisions',
  {
    id: text('id').notNull(),
    organizationId: orgRef(),
    conversationId: text('conversation_id').notNull(),
    draftId: text('draft_id'),
    kind: text('kind', { enum: DECISION_KINDS }).notNull(),
    decidedByMembershipId: text('decided_by_membership_id'),
    note: text('note'),
    acknowledgedUngrounded: boolean('acknowledged_ungrounded').notNull().default(false),
    decidedAt: ts('decided_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'approval_decisions_pkey', columns: [t.organizationId, t.id] }),
    check('approval_decisions_id_shape', idShape('id', 'dcs')),
    check('approval_decisions_organization_id_shape', orgShape),
    check('approval_decisions_organization_not_global', notGlobal),
    check('approval_decisions_conversation_id_shape', idShape('conversation_id', 'cnv')),
    check('approval_decisions_draft_id_shape', idShape('draft_id', 'drf')),
    check(
      'approval_decisions_decided_by_membership_id_shape',
      idShape('decided_by_membership_id', 'mem')
    ),
    check('approval_decisions_kind_known', sql`${t.kind} in (${list(DECISION_KINDS)})`),
    check(
      'approval_decisions_note_shape',
      sql`${t.note} is null or (char_length(${t.note}) between 1 and ${sql.raw(String(MAX_DECISION_NOTE_LENGTH))} and btrim(${t.note}) <> '')`
    ),
    check(
      'approval_decisions_draft_matches_kind',
      sql`(${t.kind} in ('takeover', 'hand_back')) = (${t.draftId} is null)`
    ),
    check(
      'approval_decisions_member_matches_kind',
      sql`(${t.kind} = 'auto_release') = (${t.decidedByMembershipId} is null)`
    ),
    check(
      'approval_decisions_acknowledgement_is_approval',
      sql`not ${t.acknowledgedUngrounded} or ${t.kind} in ('approve', 'edit_approve')`
    ),
    check('approval_decisions_note_is_rejection', sql`${t.note} is null or ${t.kind} = 'reject'`),
    foreignKey({
      name: 'approval_decisions_conversation_fk',
      columns: [t.organizationId, t.conversationId],
      foreignColumns: [conversations.organizationId, conversations.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'approval_decisions_draft_fk',
      columns: [t.organizationId, t.draftId],
      foreignColumns: [drafts.organizationId, drafts.id],
    }).onDelete('cascade'),
    index('approval_decisions_conversation_idx').on(
      t.organizationId,
      t.conversationId,
      t.decidedAt.desc(),
      t.id.desc()
    ),
    index('approval_decisions_draft_idx')
      .on(t.organizationId, t.draftId)
      .where(sql`${t.draftId} is not null`),
  ]
)

/**
 * The approval rule of one channel of an Organization (the contract's `approvalPolicySchema`):
 * `always` (the default when no row exists), `below_confidence` with a `threshold` above 0 and up
 * to 1, or `except` with one to ten distinct reply `labels`. The columns not used by the mode are
 * null. A row exists only once an Admin has set the rule.
 *
 * Lists served: one channel's rule by primary key; an Organization's rules are at most three.
 */
export const approvalPolicies = coreSchema.table(
  'approval_policies',
  {
    organizationId: orgRef(),
    channel: text('channel', { enum: INBOX_CHANNELS }).notNull(),
    mode: text('mode', { enum: APPROVAL_MODES }).notNull(),
    threshold: doublePrecision('threshold'),
    labels: text('labels').array(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
    updatedByMembershipId: text('updated_by_membership_id'),
  },
  (t) => [
    primaryKey({ name: 'approval_policies_pkey', columns: [t.organizationId, t.channel] }),
    check('approval_policies_organization_id_shape', orgShape),
    check('approval_policies_organization_not_global', notGlobal),
    check(
      'approval_policies_updated_by_membership_id_shape',
      idShape('updated_by_membership_id', 'mem')
    ),
    check('approval_policies_channel_known', sql`${t.channel} in (${list(INBOX_CHANNELS)})`),
    check('approval_policies_mode_known', sql`${t.mode} in (${list(APPROVAL_MODES)})`),
    check(
      'approval_policies_mode_matches_fields',
      sql`(${t.mode} = 'always' and ${t.threshold} is null and ${t.labels} is null)
        or (${t.mode} = 'below_confidence' and ${t.threshold} is not null and ${t.threshold} > 0 and ${t.threshold} <= 1 and ${t.labels} is null)
        or (${t.mode} = 'except' and ${t.threshold} is null and core.reply_labels_valid("labels"))`
    ),
  ]
)

/**
 * An escalation rule of an Organization: when `trigger` fires on a Conversation, route it to
 * `target` (the Prospect's owner, the members of `team_id` in turn, or the Admin queue). One rule
 * per trigger. `team_id` is set exactly for `team_round_robin`; `threshold` (a confidence below
 * which the rule fires) exactly for `low_confidence`. An escalation with no matching Rep goes to
 * the Admin queue, so it is never dropped (decided in the service, not here).
 *
 * Lists served: an Organization's rules, at most one per trigger (`escalation_rules_trigger_key`).
 */
export const escalationRules = coreSchema.table(
  'escalation_rules',
  {
    id: text('id').notNull(),
    organizationId: orgRef(),
    trigger: text('trigger', { enum: ESCALATION_TRIGGERS }).notNull(),
    target: text('target', { enum: ESCALATION_TARGETS }).notNull(),
    teamId: text('team_id'),
    threshold: doublePrecision('threshold'),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
    updatedByMembershipId: text('updated_by_membership_id'),
  },
  (t) => [
    primaryKey({ name: 'escalation_rules_pkey', columns: [t.organizationId, t.id] }),
    check('escalation_rules_id_shape', idShape('id', 'esr')),
    check('escalation_rules_organization_id_shape', orgShape),
    check('escalation_rules_organization_not_global', notGlobal),
    check('escalation_rules_team_id_shape', idShape('team_id', 'team')),
    check(
      'escalation_rules_updated_by_membership_id_shape',
      idShape('updated_by_membership_id', 'mem')
    ),
    check('escalation_rules_trigger_known', sql`${t.trigger} in (${list(ESCALATION_TRIGGERS)})`),
    check('escalation_rules_target_known', sql`${t.target} in (${list(ESCALATION_TARGETS)})`),
    check(
      'escalation_rules_team_matches_target',
      sql`(${t.target} = 'team_round_robin') = (${t.teamId} is not null)`
    ),
    check(
      'escalation_rules_threshold_matches_trigger',
      sql`(${t.trigger} = 'low_confidence') = (${t.threshold} is not null)
        and (${t.threshold} is null or (${t.threshold} > 0 and ${t.threshold} <= 1))`
    ),
    foreignKey({
      name: 'escalation_rules_team_fk',
      columns: [t.organizationId, t.teamId],
      foreignColumns: [teams.organizationId, teams.id],
    }).onDelete('cascade'),
    uniqueIndex('escalation_rules_trigger_key').on(t.organizationId, t.trigger),
  ]
)
