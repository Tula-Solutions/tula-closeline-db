import { sql } from 'drizzle-orm'
import { check, index, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import { playbookSchema } from './playbook'
import { GLOBAL_SCOPE_ORGANIZATION_ID } from './playbook-tables'

const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })

/**
 * An ended platform Call (a `voice.call.ended` event) that carries no Deal identifier yet, so the
 * Playbook cannot ingest it. It waits in the named state `awaiting_deal`, listed for an Owner or
 * Admin, until a later event for the same Call carries one. Keyed by the voice Call id, which the
 * Playbook reuses as the Call's id. Only metadata is kept: never the Recording or any text.
 * List (keyset `(created_at, id)`, oldest first): `live_call_waits_list_idx`.
 */
export const liveCallWaits = playbookSchema.table(
  'live_call_waits',
  {
    organizationId: text('organization_id').notNull(),
    callId: text('call_id').notNull(),
    direction: text('direction', { enum: ['inbound', 'outbound'] }).notNull(),
    endedAt: ts('ended_at').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'live_call_waits_pkey', columns: [t.organizationId, t.callId] }),
    check('live_call_waits_call_id_shape', idShape('call_id', 'call')),
    check('live_call_waits_organization_id_shape', idShape('organization_id', 'org')),
    check(
      'live_call_waits_organization_not_global',
      sql.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID}'`)
    ),
    check('live_call_waits_direction_known', sql`${t.direction} in ('inbound', 'outbound')`),
    index('live_call_waits_list_idx').on(t.organizationId, t.createdAt, t.callId),
  ]
)
