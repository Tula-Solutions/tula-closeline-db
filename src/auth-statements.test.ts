import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { AUTH_STATEMENTS } from './auth-statements'

const readme = readFileSync(fileURLToPath(new URL('../README.md', import.meta.url)), 'utf8')

describe('the documented statements', () => {
  test.each(Object.entries(AUTH_STATEMENTS))(
    '%s is in the README exactly as the integration tests run it',
    (_name, text) => {
      const indented = text
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n')
      expect(readme).toContain(`\`\`\`sql\n${indented}\n    \`\`\``)
    }
  )

  test.each(Object.entries(AUTH_STATEMENTS).filter(([name]) => name !== 'ABANDON_RECORD'))(
    '%s takes no point in time from the service',
    (_name, text) => {
      // Only a case's own attempt expiry (ABANDON_RECORD) is a time the service supplies; every
      // other time is the database clock's.
      expect(text).not.toContain('now()')
      expect(text).not.toMatch(/\$\d+::timestamptz/)
    }
  )
})
