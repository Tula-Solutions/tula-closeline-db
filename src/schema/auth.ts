import { pgSchema } from 'drizzle-orm/pg-core'

/** The `auth` Postgres schema, owned by the auth service (login role `closeline_auth`). */
export const authSchema = pgSchema('auth')
