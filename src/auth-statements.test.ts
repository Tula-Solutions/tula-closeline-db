import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  ABANDON_CLAIM,
  ABANDON_GIVE_UP_SPENT,
  ABANDON_MIN_GRACE_MS,
  ABANDON_RECORD,
  ABANDON_SETTLE,
  AUTH_STATEMENTS,
  COUNTER_MIN_PERIOD_MS,
  LOCKOUT_ATTEMPT,
  LOCKOUT_MIN_RETRY_AFTER_MS,
  RATE_HIT,
} from './auth-statements'
import { ABANDON_CASE_MAX_ATTEMPTS } from './schema/auth/abandon-cases'

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

describe('the rules the statements keep', () => {
  test("the claim and the safety net use the table's bound, from one constant", () => {
    expect(ABANDON_CLAIM).toContain(`attempts < ${ABANDON_CASE_MAX_ATTEMPTS}`)
    expect(ABANDON_GIVE_UP_SPENT).toContain(`attempts >= ${ABANDON_CASE_MAX_ATTEMPTS}`)
  })

  test('recording raises a grace below the floor, and the floor is the 10 s retention floor', () => {
    expect(ABANDON_MIN_GRACE_MS).toBe(10_000)
    expect(ABANDON_RECORD).toContain(`greatest($8::int, ${ABANDON_MIN_GRACE_MS})`)
  })

  test('a refused lockout attempt has a minimum Retry-After', () => {
    expect(LOCKOUT_MIN_RETRY_AFTER_MS).toBeGreaterThan(0)
  })

  test.each([
    ['LOCKOUT_ATTEMPT', LOCKOUT_ATTEMPT],
    ['RATE_HIT', RATE_HIT],
  ])(
    '%s reads the shared clock only after the row lock, never in its values row',
    (_name, text) => {
      // The `values` row is evaluated before the conflict is found, so it must not read the
      // common table expression that the `do update` reads after the lock.
      const [beforeConflict, afterConflict] = text.split('on conflict')
      expect(beforeConflict).not.toContain('from ts')
      expect(afterConflict).toContain('from ts')
    }
  )

  test('the counter statements floor the forgetting period and the window on every path', () => {
    expect(COUNTER_MIN_PERIOD_MS).toBeGreaterThan(0)
    const floor = (text: string, argument: string) => {
      const pattern = new RegExp(
        `greatest\\(coalesce\\(${argument}, 0\\), ${COUNTER_MIN_PERIOD_MS}\\)`,
        'g'
      )
      return text.match(pattern)?.length ?? 0
    }
    // Once in the values row and once in each of the update's two uses of the period.
    expect(floor(LOCKOUT_ATTEMPT, '\\$4::int')).toBeGreaterThanOrEqual(2)
    expect(floor(RATE_HIT, '\\$3::float8')).toBeGreaterThanOrEqual(2)
  })

  test('settling is decided by the row, only while the case is open and unclaimed', () => {
    expect(ABANDON_SETTLE).toContain('resolved_at is null and attempts = 0')
    expect(ABANDON_SETTLE).toContain("outcome = 'not_needed'")
    expect(ABANDON_SETTLE).not.toMatch(/now\(\)|\$3/)
  })
})
