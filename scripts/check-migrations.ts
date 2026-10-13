import { join } from 'node:path'
import { checkMigrations } from '../src/migration-check'

// Fails when a migration already on the base ref was edited or deleted, or when the journal is
// not append-only with strictly increasing `when`. MIGRATIONS_BASE_REF defaults to origin/develop.
const result = checkMigrations({
  repoDir: join(import.meta.dir, '..'),
  baseRef: process.env.MIGRATIONS_BASE_REF || 'origin/develop',
  ci: Boolean(process.env.CI),
})

for (const warning of result.warnings) {
  process.stderr.write(`db:check: warning: ${warning}\n`)
}
if (result.errors.length > 0) {
  for (const error of result.errors) {
    process.stderr.write(`db:check: ${error}\n`)
  }
  process.exit(1)
}
process.stdout.write('db:check: migrations are immutable and the journal is ordered\n')
