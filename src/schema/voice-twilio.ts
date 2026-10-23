import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { voiceSchema } from './voice'
import { VOICE_CALL_DIRECTIONS } from './voice-tables'

/** The most Reps an inbound provider call is meant to ring. */
export const MAX_TWILIO_RING_IDENTITIES = 100
/** The longest provider id (call, Recording or stream), in characters. */
export const MAX_TWILIO_PROVIDER_ID_LENGTH = 128
/** The longest idempotency key of a placement, in characters. */
export const MAX_TWILIO_PLACEMENT_KEY_LENGTH = 255
/** The longest placement fingerprint (a keyed hash of the numbers), in characters. */
export const MAX_TWILIO_FINGERPRINT_LENGTH = 128
/** What a directory entry points at: a provider call or a Recording. */
export const TWILIO_DIRECTORY_KINDS = ['call', 'recording'] as const

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const orgShape = sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)
const notGlobal = sql.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)
// The shape of a provider id: 1 to 128 of letters, digits, `.`, `_`, `:` and `-` (the kit's rule).
const providerIdShape = (column: string) =>
  sql.raw(
    `char_length("${column}") between 1 and ${MAX_TWILIO_PROVIDER_ID_LENGTH} and "${column}" collate "C" ~ '^[A-Za-z0-9._:-]+$'`
  )
const ts = (name: string) => timestamp(name, { withTimezone: true })

/**
 * What the Twilio telephony adapter remembers about one provider call, since Twilio holds no tag
 * for it (the kit's `TwilioStore`, `TwilioCallRecord`). One row per provider call, keyed by
 * `(organization_id, provider_call_id)`; the Organization is the one in the verified token or the
 * tag the adapter put on the callback, never a guess. The Disclosure is three columns set or null
 * together (`wording_version`, `ai_assisted`, `played_at`); `disclosure_started` is true once it
 * began to play. `ring_identities` are the Rep memberships an inbound call was meant to ring.
 * Holds no number, name, audio or message body.
 *
 * Transient: `expires_at` is when the row may be purged (a call is over long before; the purge is
 * per Organization and bounded, on `twilio_calls_purge_idx`). The service sets it on insert and a
 * purge removes the row, its Recording rows (cascade) and its directory entries (trigger).
 *
 * Lookups served: by provider call (the primary key, inside the Organization's scope); the owner
 * of a provider call before the Organization is known, through `voice.twilio_owner`. The row lock
 * of `withCall` is `SELECT ... FOR UPDATE` on the primary key. `claimCall` is `INSERT ... ON
 * CONFLICT DO NOTHING` on it. A provider call id that another Organization already holds is
 * refused by the directory (unique violation on `twilio_directory_pkey`).
 */
export const voiceTwilioCalls = voiceSchema.table(
  'twilio_calls',
  {
    organizationId: text('organization_id').notNull(),
    providerCallId: text('provider_call_id').notNull(),
    callId: text('call_id'),
    direction: text('direction', { enum: VOICE_CALL_DIRECTIONS }).notNull(),
    disclosureWordingVersion: integer('disclosure_wording_version'),
    disclosureAiAssisted: boolean('disclosure_ai_assisted'),
    disclosurePlayedAt: ts('disclosure_played_at'),
    disclosureStarted: boolean('disclosure_started').notNull().default(false),
    bridgedTo: text('bridged_to'),
    ringIdentities: text('ring_identities').array().notNull().default(sql`'{}'::text[]`),
    recordingId: text('recording_id'),
    streamId: text('stream_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
    expiresAt: ts('expires_at').notNull(),
  },
  (t) => [
    primaryKey({ name: 'twilio_calls_pkey', columns: [t.organizationId, t.providerCallId] }),
    check('twilio_calls_organization_id_shape', orgShape),
    check('twilio_calls_organization_not_global', notGlobal),
    check('twilio_calls_provider_call_id_shape', providerIdShape('provider_call_id')),
    check('twilio_calls_call_id_shape', sql.raw(`"call_id" ~ '^call_[0-9a-f]{32}$'`)),
    check('twilio_calls_bridged_to_shape', sql.raw(`"bridged_to" ~ '^mem_[0-9a-f]{32}$'`)),
    check('twilio_calls_direction_known', sql`${t.direction} in (${list(VOICE_CALL_DIRECTIONS)})`),
    check(
      'twilio_calls_disclosure_all_or_none',
      sql`(${t.disclosureWordingVersion} is null) = (${t.disclosureAiAssisted} is null)
        and (${t.disclosureWordingVersion} is null) = (${t.disclosurePlayedAt} is null)
        and (${t.disclosureWordingVersion} is null or ${t.disclosureWordingVersion} >= 1)`
    ),
    check(
      'twilio_calls_ring_identities_bounds',
      sql`coalesce(cardinality(${t.ringIdentities}), 0) <= ${sql.raw(String(MAX_TWILIO_RING_IDENTITIES))}
        and array_position(${t.ringIdentities}, null) is null
        and array_to_string(${t.ringIdentities}, ',') ~ '^(mem_[0-9a-f]{32}(,mem_[0-9a-f]{32})*)?$'`
    ),
    check(
      'twilio_calls_recording_id_shape',
      sql`${t.recordingId} is null or (${sql.raw(`char_length("recording_id") between 1 and ${MAX_TWILIO_PROVIDER_ID_LENGTH}`)})`
    ),
    check(
      'twilio_calls_stream_id_shape',
      sql`${t.streamId} is null or (${sql.raw(`char_length("stream_id") between 1 and ${MAX_TWILIO_PROVIDER_ID_LENGTH}`)})`
    ),
    check('twilio_calls_expires_after_creation', sql`${t.expiresAt} > ${t.createdAt}`),
    index('twilio_calls_purge_idx').on(t.organizationId, t.expiresAt),
  ]
)

/**
 * Which provider call a Recording belongs to (the kit's `TwilioStore.putRecording`). One row per
 * Recording, keyed `(organization_id, recording_id)`; the provider call is the Organization's own
 * (composite foreign key, so the row goes with its call). Written once: `closeline_voice` holds no
 * UPDATE. `expires_at` follows the call's. Lookups served: by Recording id, through
 * `voice.twilio_owner` before the Organization is known, then the primary key.
 */
export const voiceTwilioRecordings = voiceSchema.table(
  'twilio_recordings',
  {
    organizationId: text('organization_id').notNull(),
    recordingId: text('recording_id').notNull(),
    providerCallId: text('provider_call_id').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'twilio_recordings_pkey', columns: [t.organizationId, t.recordingId] }),
    check('twilio_recordings_organization_id_shape', orgShape),
    check('twilio_recordings_organization_not_global', notGlobal),
    check('twilio_recordings_recording_id_shape', providerIdShape('recording_id')),
    check('twilio_recordings_provider_call_id_shape', providerIdShape('provider_call_id')),
    foreignKey({
      name: 'twilio_recordings_call_fk',
      columns: [t.organizationId, t.providerCallId],
      foreignColumns: [voiceTwilioCalls.organizationId, voiceTwilioCalls.providerCallId],
    }).onDelete('cascade'),
    index('twilio_recordings_call_idx').on(t.organizationId, t.providerCallId),
  ]
)

/**
 * What the adapter remembers about a placement to answer a repeated idempotency key (the kit's
 * `TwilioPlacement`): the provider call the key placed and a keyed hash of the numbers (never the
 * numbers). One row per `(organization_id, idempotency_key)`; written once (no UPDATE). Transient:
 * `expires_at` is when the key may be forgotten (purge on `twilio_placements_purge_idx`, per
 * Organization and bounded). Lookups served: by key (the primary key).
 */
export const voiceTwilioPlacements = voiceSchema.table(
  'twilio_placements',
  {
    organizationId: text('organization_id').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    providerCallId: text('provider_call_id').notNull(),
    fingerprint: text('fingerprint').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
    expiresAt: ts('expires_at').notNull(),
  },
  (t) => [
    primaryKey({ name: 'twilio_placements_pkey', columns: [t.organizationId, t.idempotencyKey] }),
    check('twilio_placements_organization_id_shape', orgShape),
    check('twilio_placements_organization_not_global', notGlobal),
    check(
      'twilio_placements_idempotency_key_shape',
      sql`char_length(${t.idempotencyKey}) between 1 and ${sql.raw(String(MAX_TWILIO_PLACEMENT_KEY_LENGTH))}`
    ),
    check('twilio_placements_provider_call_id_shape', providerIdShape('provider_call_id')),
    check(
      'twilio_placements_fingerprint_shape',
      sql`char_length(${t.fingerprint}) between 1 and ${sql.raw(String(MAX_TWILIO_FINGERPRINT_LENGTH))}`
    ),
    check('twilio_placements_expires_after_creation', sql`${t.expiresAt} > ${t.createdAt}`),
    index('twilio_placements_purge_idx').on(t.organizationId, t.expiresAt),
  ]
)

/**
 * Which Organization owns a provider call or a Recording, for the questions the adapter asks
 * before it knows the Organization (a webhook carries a provider id, and the store's
 * `getCall(providerCallId)` and `getRecording(recordingId)` take no Organization). It cannot sit
 * behind row-level security: it is a no-access table like `voice.line_directory`. It holds a kind,
 * the provider id, the Organization id and the provider call id, nothing else. `closeline_voice`
 * reaches it only through the `SECURITY DEFINER` function `voice.twilio_owner(kind, id)` (one row
 * for one exact key); the triggers `twilio_calls_sync_directory` and
 * `twilio_recordings_sync_directory` keep it, and no service role holds any privilege on it. The
 * primary key makes a provider id belong to one Organization for good.
 */
export const voiceTwilioDirectory = voiceSchema.table(
  'twilio_directory',
  {
    kind: text('kind', { enum: TWILIO_DIRECTORY_KINDS }).notNull(),
    refId: text('ref_id').notNull(),
    organizationId: text('organization_id').notNull(),
    providerCallId: text('provider_call_id').notNull(),
  },
  (t) => [
    primaryKey({ name: 'twilio_directory_pkey', columns: [t.kind, t.refId] }),
    check('twilio_directory_kind_known', sql`${t.kind} in (${list(TWILIO_DIRECTORY_KINDS)})`),
    check('twilio_directory_ref_id_shape', providerIdShape('ref_id')),
    check('twilio_directory_organization_id_shape', orgShape),
    check('twilio_directory_organization_not_global', notGlobal),
    check('twilio_directory_provider_call_id_shape', providerIdShape('provider_call_id')),
  ]
)
