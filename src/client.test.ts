import { describe, expect, test } from 'bun:test'
import { createDb, DEFAULT_POOL_OPTIONS } from './client'

const URL = 'postgres://nobody:nothing@127.0.0.1:1/none'

describe('createDb', () => {
  test('returns a handle that closes its pool', async () => {
    const handle = createDb(URL)
    expect(typeof handle.db.transaction).toBe('function')
    await handle.close()
  })

  test('bounds the pool and sets timeouts by default', () => {
    expect(DEFAULT_POOL_OPTIONS.max).toBeGreaterThan(0)
    expect(DEFAULT_POOL_OPTIONS.max).toBeLessThanOrEqual(100)
    expect(DEFAULT_POOL_OPTIONS.statementTimeoutMs).toBeGreaterThan(0)
    expect(DEFAULT_POOL_OPTIONS.connectionTimeoutMs).toBeGreaterThan(0)
  })

  test.each([
    ['zero connections', { max: 0 }],
    ['a negative pool', { max: -1 }],
    ['a fractional pool', { max: 1.5 }],
    ['an unbounded pool', { max: 1000 }],
    ['no statement timeout', { statementTimeoutMs: 0 }],
    ['no connection timeout', { connectionTimeoutMs: 0 }],
    ['a NaN timeout', { statementTimeoutMs: Number.NaN }],
  ])('rejects %s', (_name, options) => {
    expect(() => createDb(URL, options)).toThrow('createDb')
  })

  test('rejects an empty connection string', () => {
    expect(() => createDb('')).toThrow('createDb')
  })
})
