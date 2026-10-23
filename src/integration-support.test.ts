import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { Pool } from 'pg'
import {
  adminUrl,
  assertLocalTestDatabase,
  dropStaleTestObjects,
  resetTestRoles,
} from './integration-support'

const NAMES = [
  'DATABASE_URL',
  'DATABASE_URL_AUTH',
  'DATABASE_URL_CORE',
  'DATABASE_URL_PLAYBOOK',
  'DATABASE_URL_VOICE',
  'DATABASE_URL_ADMIN',
  'ALLOW_NON_LOCAL_TEST_DATABASE',
  'POSTGRES_PORT',
] as const

const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const name of NAMES) {
    saved[name] = process.env[name]
    delete process.env[name]
  }
})

afterEach(() => {
  for (const name of NAMES) {
    if (saved[name] === undefined) {
      delete process.env[name]
    } else {
      process.env[name] = saved[name]
    }
  }
})

const setServiceUrls = (host = '127.0.0.1') => {
  for (const name of NAMES.slice(0, 5)) {
    process.env[name] = `postgres://u:p@${host}:5432/closeline`
  }
}

/** A pool double that records each statement and answers selects with the given rows. */
const fakePool = (rows: Record<string, unknown>[] = []) => {
  const statements: string[] = []
  const pool = {
    query: async (text: string) => {
      statements.push(text)
      return { rows: text.trimStart().startsWith('select') ? rows : [] }
    },
  } as unknown as Pool
  return { pool, statements }
}

describe('adminUrl', () => {
  test('with no connection variable set it is the compose superuser on loopback', () => {
    process.env.POSTGRES_PORT = '5433'
    expect(adminUrl()).toBe('postgres://postgres:postgres_local@127.0.0.1:5433/closeline')
  })

  test('DATABASE_URL_ADMIN alone is refused, so it cannot pair with the compose database', () => {
    process.env.DATABASE_URL_ADMIN = 'postgres://postgres:x@127.0.0.1:5432/other'
    expect(() => adminUrl()).toThrow('DATABASE_URL_ADMIN')
  })

  test('DATABASE_URL_ADMIN with only some service variables is refused', () => {
    process.env.DATABASE_URL_ADMIN = 'postgres://postgres:x@127.0.0.1:5432/other'
    process.env.DATABASE_URL = 'postgres://u:p@127.0.0.1:5432/closeline'
    process.env.DATABASE_URL_CORE = 'postgres://u:p@127.0.0.1:5432/closeline'
    expect(() => adminUrl()).toThrow()
  })

  test('some service variables without DATABASE_URL_ADMIN are refused', () => {
    process.env.DATABASE_URL = 'postgres://u:p@127.0.0.1:5432/closeline'
    expect(() => adminUrl()).toThrow()
  })

  test('all five service variables without DATABASE_URL_ADMIN are refused', () => {
    setServiceUrls()
    expect(() => adminUrl()).toThrow('DATABASE_URL_ADMIN')
  })

  test('DATABASE_URL_ADMIN with all five service variables is returned', () => {
    setServiceUrls()
    process.env.DATABASE_URL_ADMIN = 'postgres://postgres:x@127.0.0.1:5432/closeline'
    expect(adminUrl()).toBe('postgres://postgres:x@127.0.0.1:5432/closeline')
  })

  test('a remote admin host is refused unless the opt-in is set', () => {
    setServiceUrls('db.example.com')
    process.env.DATABASE_URL_ADMIN = 'postgres://postgres:x@db.example.com:5432/closeline'
    expect(() => adminUrl()).toThrow('db.example.com')
    process.env.ALLOW_NON_LOCAL_TEST_DATABASE = '1'
    expect(adminUrl()).toBe('postgres://postgres:x@db.example.com:5432/closeline')
  })
})

describe('assertLocalTestDatabase', () => {
  test.each(['127.0.0.1', 'localhost', '[::1]'])('%s is allowed', (host) => {
    expect(() => assertLocalTestDatabase(`postgres://u:p@${host}:5432/closeline`)).not.toThrow()
  })

  test('a remote host is refused with the host and the opt-in variable named', () => {
    const message = (() => {
      try {
        assertLocalTestDatabase('postgres://u:p@prod-db.internal:5432/closeline')
      } catch (error) {
        return (error as Error).message
      }
      return ''
    })()
    expect(message).toContain('prod-db.internal')
    expect(message).toContain('ALLOW_NON_LOCAL_TEST_DATABASE')
    expect(message).not.toContain(':p@')
  })

  test('only the value 1 opts in', () => {
    const url = 'postgres://u:p@prod-db.internal:5432/closeline'
    process.env.ALLOW_NON_LOCAL_TEST_DATABASE = 'true'
    expect(() => assertLocalTestDatabase(url)).toThrow()
    process.env.ALLOW_NON_LOCAL_TEST_DATABASE = '1'
    expect(() => assertLocalTestDatabase(url)).not.toThrow()
  })

  test('a string that is not a URL is refused', () => {
    expect(() => assertLocalTestDatabase('not a url')).toThrow()
  })
})

describe('dropStaleTestObjects', () => {
  const remote = 'postgres://u:p@prod-db.internal:5432/closeline'
  const local = 'postgres://u:p@127.0.0.1:5432/closeline'

  test('refuses a remote host before running any statement', async () => {
    const { pool, statements } = fakePool()
    await expect(dropStaleTestObjects(pool, remote)).rejects.toThrow('prod-db.internal')
    expect(statements).toEqual([])
  })

  test('finds stale schemas by the it_schema_ prefix only', async () => {
    const { pool, statements } = fakePool()
    await dropStaleTestObjects(pool, local)
    const schemaQuery = statements.find((text) => text.includes('pg_namespace where'))
    expect(schemaQuery).toContain('it\\_schema\\_%')
    expect(schemaQuery).not.toContain(`like 'it\\_%'`)
  })

  test('also looks for stale tables in public', async () => {
    const { pool, statements } = fakePool()
    await dropStaleTestObjects(pool, local)
    expect(statements[0]).toContain(`'public'`)
  })
})

describe('resetTestRoles', () => {
  const remote = 'postgres://postgres:x@prod-db.internal:5432/closeline'
  const local = 'postgres://postgres:x@127.0.0.1:5432/closeline'

  test('refuses a remote host before running any statement', async () => {
    const { pool, statements } = fakePool()
    await expect(resetTestRoles(pool, remote)).rejects.toThrow('prod-db.internal')
    expect(statements).toEqual([])
  })

  test('resets closeline_core and drops leftover closeline_it_super_ roles', async () => {
    const { pool, statements } = fakePool([{ name: 'closeline_it_super_1' }])
    await resetTestRoles(pool, local)
    expect(statements).toContain('alter role closeline_core nobypassrls')
    expect(statements).toContain('drop role if exists "closeline_it_super_1"')
    expect(statements.find((text) => text.startsWith('select'))).toContain(
      'closeline\\_it\\_super\\_%'
    )
  })
})
