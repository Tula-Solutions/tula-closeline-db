import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { CRM_CONNECTION_FOR_ACCOUNT } from './core-crm-statements'

describe('CRM_CONNECTION_FOR_ACCOUNT', () => {
  test('binds the provider and the account id and names no token column', () => {
    expect(CRM_CONNECTION_FOR_ACCOUNT).toContain('core.crm_connection_for_account($1, $2)')
    expect(CRM_CONNECTION_FOR_ACCOUNT).not.toMatch(/token|sealed/i)
  })

  test('is printed in the README exactly as it is run', () => {
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
    expect(readme).toContain(CRM_CONNECTION_FOR_ACCOUNT)
  })
})
