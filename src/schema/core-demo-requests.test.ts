import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { NON_TENANT_TABLES } from '../isolation'
import { tenantRlsStatements } from '../tenant'
import { demoRequests } from './core-demo-requests'

const migration = readFileSync(
  new URL('../../migrations/0021_core_demo_request.sql', import.meta.url),
  'utf8'
)
const config = getTableConfig(demoRequests)

describe('core.demo_request', () => {
  test('has no organization_id and no honeypot column', () => {
    const names = config.columns.map((column) => column.name)
    expect(names).not.toContain('organization_id')
    expect(names.filter((name) => /honeypot|website|trap/.test(name))).toEqual([])
    expect(names.sort()).toEqual(
      [
        'company_name',
        'id',
        'idempotency_key',
        'message',
        'name',
        'notification_attempts',
        'notification_last_attempt_at',
        'notification_status',
        'source_page',
        'submitted_at',
        'work_email',
      ].sort()
    )
  })

  test('is on the allowlist, has no row-level security policy, and is revoked from closeline_core', () => {
    expect(NON_TENANT_TABLES).toContain('core.demo_request')
    for (const statement of tenantRlsStatements('core', 'demo_request')) {
      expect(migration).not.toContain(statement)
    }
    expect(migration).toContain('REVOKE ALL ON "core"."demo_request" FROM closeline_core;')
  })

  test('has an index for the retention purge and one for the notice retry scan', () => {
    expect(config.indexes.map((index) => index.config.name).sort()).toEqual([
      'demo_requests_notice_idx',
      'demo_requests_submitted_at_idx',
    ])
  })
})
