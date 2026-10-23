import { pgSchema } from 'drizzle-orm/pg-core'

/** The `voice` Postgres schema, owned by the voice service (login role `closeline_voice`). */
export const voiceSchema = pgSchema('voice')
