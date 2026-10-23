import { pgSchema } from 'drizzle-orm/pg-core'

/** The `outbound` Postgres schema, owned by the outbound service (login role `closeline_outbound`). */
export const outboundSchema = pgSchema('outbound')
