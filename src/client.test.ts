import { describe, expect, spyOn, test } from 'bun:test'
import { createDb, DEFAULT_POOL_OPTIONS, reportConnectionError } from './client'

const URL = 'postgres://nobody:nothing@127.0.0.1:1/none'

describe('createDb', () => {
  test('returns a handle that closes its pool', async () => {
    const handle = createDb(URL)
    expect(typeof handle.db.transaction).toBe('function')
    await handle.close()
  })

  test('close can be called twice', async () => {
    const handle = createDb(URL)
    await handle.close()
    await handle.close()
  })

  test('bounds the pool and sets timeouts by default', () => {
    expect(DEFAULT_POOL_OPTIONS.max).toBeGreaterThan(0)
    expect(DEFAULT_POOL_OPTIONS.max).toBeLessThanOrEqual(100)
    expect(DEFAULT_POOL_OPTIONS.statementTimeoutMs).toBeGreaterThan(0)
    expect(DEFAULT_POOL_OPTIONS.connectionTimeoutMs).toBeGreaterThan(0)
    expect(DEFAULT_POOL_OPTIONS.closeTimeoutMs).toBeGreaterThan(0)
  })

  test.each([
    ['zero connections', { max: 0 }],
    ['a negative pool', { max: -1 }],
    ['a fractional pool', { max: 1.5 }],
    ['an unbounded pool', { max: 1000 }],
    ['no statement timeout', { statementTimeoutMs: 0 }],
    ['no connection timeout', { connectionTimeoutMs: 0 }],
    ['no close timeout', { closeTimeoutMs: 0 }],
    ['a NaN timeout', { statementTimeoutMs: Number.NaN }],
  ])('rejects %s', (_name, options) => {
    expect(() => createDb(URL, options)).toThrow('createDb')
  })

  test('rejects an empty connection string', () => {
    expect(() => createDb('')).toThrow('createDb')
  })
})

describe('the default error handler', () => {
  test('writes one line with the error code and never the message', () => {
    const lines: string[] = []
    const write = spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      lines.push(String(chunk))
      return true
    })
    try {
      const error = Object.assign(new Error('password=hunter2 host=10.0.0.5'), { code: '57P01' })
      reportConnectionError(error)
    } finally {
      write.mockRestore()
    }
    expect(lines.length).toBe(1)
    expect(lines[0]).toContain('57P01')
    expect(lines[0]?.trim().split('\n').length).toBe(1)
    expect(lines[0]).not.toContain('hunter2')
  })

  test('falls back to the error name when there is no code', () => {
    const lines: string[] = []
    const write = spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      lines.push(String(chunk))
      return true
    })
    try {
      reportConnectionError(new TypeError('secret detail'))
      expect(lines[0]).toContain('TypeError')
      expect(lines[0]).not.toContain('secret detail')
    } finally {
      write.mockRestore()
    }
  })
})
