import { createDb } from '../src/client'
import { assertTenantIsolation } from '../src/isolation'

// Fails when any table in auth, core or playbook is not fail-closed on organization_id. Run it
// after `db:migrate`, against the same database.
const url = process.env.DATABASE_URL
if (!url) {
  process.stderr.write('db:check:rls: set DATABASE_URL to a connection string for the database\n')
  process.exit(1)
}

const { db, close } = createDb(url, { max: 1 })
try {
  await assertTenantIsolation(db)
  process.stdout.write('db:check:rls: every table in auth, core and playbook is fail-closed\n')
} catch (error) {
  process.stderr.write(`db:check:rls: ${error instanceof Error ? error.message : 'failed'}\n`)
  process.exitCode = 1
} finally {
  await close()
}
