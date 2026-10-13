import { pgSchema } from 'drizzle-orm/pg-core'

/** The `playbook` Postgres schema, owned by the playbook service (login role `closeline_playbook`). */
export const playbookSchema = pgSchema('playbook')
