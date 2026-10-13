import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

// Applies pending migrations as the owner role named by DATABASE_URL. Run it from this repo only
// (ADR 0007); always as the same owner role, because default privileges are per creating role.
const url = process.env.DATABASE_URL
if (!url) {
  process.stderr.write('db:migrate: set DATABASE_URL to the owner role connection string\n')
  process.exit(1)
}

const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10_000 })
try {
  await migrate(drizzle(pool), {
    migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)),
  })
  process.stdout.write('db:migrate: up to date\n')
} finally {
  await pool.end()
}
