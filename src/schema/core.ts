import { pgSchema } from 'drizzle-orm/pg-core'

/** The `core` Postgres schema, owned by the core service (login role `closeline_core`). */
export const coreSchema = pgSchema('core')
