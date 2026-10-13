import { sql } from 'drizzle-orm'
import { check, index, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { playbookSchema } from './playbook'
import { CONSUMED_MESSAGE_STATES } from './playbook-tables'

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))
const idShape = (column: string, prefix: string) =>
  sql.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`)
const ts = (name: string) => timestamp(name, { withTimezone: true })

/**
 * The messages a playbook queue consumer has handled or is handling: the table behind the kit's
 * `ProcessedStore` (`claim`, `renew`, `complete`, `release`, `purge`), shaped as the kit README
 * sketches it with one difference: `organization_id` is the wire id as text (`org_` and 32 hex
 * digits), not a uuid, because every tenant table here carries the wire id and the one canonical
 * policy compares it as text; the store passes the id through, with no conversion.
 *
 * It is a tenant table. A message for an Organization is recorded under that Organization, in its
 * scope. A global message (no Organization) is recorded under the all-zero id
 * `org_00000000000000000000000000000000`, and the consumer of global messages runs under that
 * scope with the same helper; that id is not any real Organization's.
 *
 * Because of row-level security a purge sees only the scope it runs in: run
 * `CONSUMED_PURGE` once per Organization (and once under the all-zero scope), splitting the limit.
 * Indexes: the key serves `claim`, `renew`, `complete` and `release`; the two partial indexes
 * serve the purge of done records and of lapsed claims.
 */
export const consumedMessage = playbookSchema.table(
  'consumed_message',
  {
    consumer: text('consumer').notNull(),
    organizationId: text('organization_id').notNull(),
    messageId: text('message_id').notNull(),
    state: text('state', { enum: CONSUMED_MESSAGE_STATES }).notNull(),
    claimToken: uuid('claim_token').notNull(),
    leaseExpiresAt: ts('lease_expires_at'),
    completedAt: ts('completed_at'),
  },
  (t) => [
    primaryKey({
      name: 'consumed_message_pkey',
      columns: [t.consumer, t.organizationId, t.messageId],
    }),
    check('consumed_message_organization_id_shape', idShape('organization_id', 'org')),
    check(
      'consumed_message_consumer_shape',
      sql`char_length(${t.consumer}) between 1 and 128 and ${t.consumer} collate "C" ~ '^[A-Za-z0-9_.:-]+$'`
    ),
    check(
      'consumed_message_message_id_shape',
      sql`char_length(${t.messageId}) between 1 and 128 and ${t.messageId} collate "C" ~ '^[A-Za-z0-9_.:-]+$'`
    ),
    check('consumed_message_state_known', sql`${t.state} in (${list(CONSUMED_MESSAGE_STATES)})`),
    check(
      'consumed_message_state_columns',
      sql`(${t.state} = 'claimed' and ${t.leaseExpiresAt} is not null and ${t.completedAt} is null)
        or (${t.state} = 'done' and ${t.leaseExpiresAt} is null and ${t.completedAt} is not null)`
    ),
    index('consumed_message_done_idx')
      .on(t.organizationId, t.completedAt)
      .where(sql`${t.state} = 'done'`),
    index('consumed_message_lease_idx')
      .on(t.organizationId, t.leaseExpiresAt)
      .where(sql`${t.state} = 'claimed'`),
  ]
)
