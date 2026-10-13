import { runMigrations } from '../src/migrate'

// Applies pending migrations as the owner role named by DATABASE_URL. Run it from this repo only
// (ADR 0007); always as the same owner role, because default privileges are per creating role.
const url = process.env.DATABASE_URL
if (!url) {
  process.stderr.write('db:migrate: set DATABASE_URL to the owner role connection string\n')
  process.exit(1)
}

try {
  await runMigrations(url)
  process.stdout.write('db:migrate: up to date\n')
} catch (error) {
  process.stderr.write(`db:migrate: ${error instanceof Error ? error.message : 'failed'}\n`)
  process.exit(1)
}
