import { pgSchema } from 'drizzle-orm/pg-core'

/**
 * The `auth` Postgres schema, owned by the auth service (login role `closeline_auth`).
 *
 * The tables in it come from tula-auth (ADR 0005) and keep its names and columns, so the service
 * copied from it runs unchanged. They are scoped to an environment by row-level security, not to
 * an Organization: users are global within a Region, and Organizations live in core.
 */
export const authSchema = pgSchema('auth')
