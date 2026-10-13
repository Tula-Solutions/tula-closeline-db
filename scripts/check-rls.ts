import { createDb } from '../src/client'
import { assertTenantIsolation } from '../src/isolation'

// Fails when any table is not fail-closed on organization_id (or, for the auth tables, on
// environment_id or listed as control plane), or a closeline role bypasses it. Run it after
// `db:migrate`, against the same database.
const url = process.env.DATABASE_URL
if (!url) {
  process.stderr.write('db:check:rls: set DATABASE_URL to a connection string for the database\n')
  process.exit(1)
}

const { db, close } = createDb(url, { max: 1 })
try {
  await assertTenantIsolation(db)
  process.stdout.write(
    'db:check:rls: every table is fail-closed and no closeline role bypasses row-level security\n'
  )
} catch (error) {
  process.stderr.write(`db:check:rls: ${error instanceof Error ? error.message : 'failed'}\n`)
  process.exitCode = 1
} finally {
  await close()
}
