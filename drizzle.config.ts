import { defineConfig } from 'drizzle-kit'

/** Migration settings for drizzle-kit: the schema source, where migrations live, our schemas. */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  schemaFilter: ['auth', 'core', 'playbook', 'voice'],
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
})
