import { sql } from 'drizzle-orm'
import { check, date, integer, primaryKey, text } from 'drizzle-orm/pg-core'
import { playbookSchema } from './playbook'
import { GLOBAL_SCOPE_ORGANIZATION_ID } from './playbook-tables'

/** The most Moments one add to the day's count may state; a larger count is cut to it. */
export const EMBED_USAGE_MAX_ADD = 1_000_000

/** The most Moments a day's count holds: the table's bound, which an add stops at rather than fail. */
export const EMBED_USAGE_MAX_MOMENTS = 1_000_000_000

/**
 * How many Moments the Organization's Call jobs reserved to embed on one UTC day: the durable
 * counter behind the daily embed budget. A **tenant table** (row-level security, fail-closed),
 * keyed by `(organization_id, day)`. The role adds to it with `EMBED_USAGE_ADD` (an upsert that
 * returns the day's total) and removes old days with `EMBED_USAGE_PURGE`. It holds a count and a
 * date and no content.
 */
export const playbookEmbedUsage = playbookSchema.table(
  'embed_usage',
  {
    organizationId: text('organization_id').notNull(),
    day: date('day', { mode: 'string' }).notNull(),
    moments: integer('moments').notNull().default(0),
  },
  (t) => [
    primaryKey({ name: 'embed_usage_pkey', columns: [t.organizationId, t.day] }),
    check('embed_usage_organization_id_shape', sql.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)),
    check(
      'embed_usage_organization_not_global',
      sql.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID}'`)
    ),
    check(
      'embed_usage_moments_bounds',
      sql`${t.moments} between 0 and ${sql.raw(String(EMBED_USAGE_MAX_MOMENTS))}`
    ),
  ]
)
