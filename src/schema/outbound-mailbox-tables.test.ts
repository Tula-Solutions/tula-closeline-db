import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { tenantRlsStatements } from '../tenant'
import { mailboxConnectAttempts, mailboxTestSends } from './outbound-mail'

const migrationFile = readdirSync(new URL('../../migrations/', import.meta.url)).find((f) =>
  f.startsWith('0054_')
)
const migration = readFileSync(
  new URL(`../../migrations/${migrationFile ?? 'missing'}`, import.meta.url),
  'utf8'
)

const TABLES = {
  mailbox_connect_attempts: mailboxConnectAttempts,
  mailbox_test_sends: mailboxTestSends,
}

const columnsOf = (index?: { config: { columns: unknown[] } }) =>
  index?.config.columns.map((c) => (c as { name: string }).name)

describe('the Mailbox connect and test-send tables', () => {
  test.each(Object.entries(TABLES))('%s is tenant-scoped in the outbound schema', (name, table) => {
    const config = getTableConfig(table)
    expect(config.name).toBe(name)
    expect(config.schema).toBe('outbound')
    expect(config.primaryKeys[0]?.columns[0]?.name).toBe('organization_id')
  })

  test.each(Object.keys(TABLES))(
    'the migration runs the canonical RLS statements for %s',
    (name) => {
      for (const statement of tenantRlsStatements('outbound', name)) {
        expect(migration).toContain(statement)
      }
    }
  )

  test('a connect attempt stores a hash of the state, never the state', () => {
    const names = getTableConfig(mailboxConnectAttempts).columns.map((c) => c.name)
    expect(names).toContain('state_hash')
    expect(names).not.toContain('state')
    const unique = getTableConfig(mailboxConnectAttempts).indexes.find(
      (i) => i.config.name === 'mailbox_connect_attempts_state_key'
    )
    expect(unique?.config.unique).toBe(true)
    expect(columnsOf(unique)).toEqual(['organization_id', 'state_hash'])
  })

  test('expired attempts are swept by (organization_id, expires_at)', () => {
    const index = getTableConfig(mailboxConnectAttempts).indexes.find(
      (i) => i.config.name === 'mailbox_connect_attempts_expiry_idx'
    )
    expect(columnsOf(index)).toEqual(['organization_id', 'expires_at'])
  })

  test('a test send is unique per Mailbox and key, and the rate cap reads by sent_at', () => {
    const config = getTableConfig(mailboxTestSends)
    expect(config.primaryKeys[0]?.columns.map((c) => c.name)).toEqual([
      'organization_id',
      'mailbox_id',
      'key_hash',
    ])
    const recent = config.indexes.find((i) => i.config.name === 'mailbox_test_sends_recent_idx')
    expect(columnsOf(recent)).toEqual(['organization_id', 'mailbox_id', 'sent_at'])
    expect(config.foreignKeys[0]?.onDelete).toBe('cascade')
  })
})
