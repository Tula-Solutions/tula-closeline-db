import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import { Pool } from 'pg'
import { createDb } from './client'
import { integrationEnv, migrateUp, rejectionOf } from './integration-support'
import { withOrganization } from './tenant'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const A = `org_${'a1'.repeat(16)}`
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

describe('a connection the server ends while it is checked out', () => {
  // The owner role may not signal another role's backend, so a second connection as the same
  // service role plays the part of the failover or the idle-in-transaction timeout.
  let killer: Pool

  beforeAll(async () => {
    await migrateUp(env.owner)
    killer = new Pool({ connectionString: env.core, max: 1 })
  })

  afterAll(async () => {
    await killer.end()
  })

  test('rejects the call, reports to onError and throws nothing uncaught', async () => {
    const uncaught: unknown[] = []
    const record = (error: unknown) => uncaught.push(error)
    process.on('uncaughtException', record)
    const reported: Error[] = []
    const core = createDb(env.core, { max: 1, onError: (error) => reported.push(error) })
    try {
      const outcome = await rejectionOf(
        withOrganization(core.db, A, async (tx) => {
          const result = await tx.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`)
          await killer.query('select pg_terminate_backend($1)', [result.rows[0]?.pid])
          // No statement is running now, so the termination arrives as a bare client error.
          await pause(300)
          await tx.execute(sql`select 1`)
        })
      )
      expect(outcome).not.toBe('')
      await pause(100)
      expect(reported.length).toBeGreaterThan(0)
      expect(uncaught).toEqual([])
    } finally {
      process.off('uncaughtException', record)
      await core.close().catch(() => undefined)
    }
  })

  test('the pool serves the next caller after a connection was lost', async () => {
    const core = createDb(env.core, { max: 1, onError: () => undefined })
    try {
      await rejectionOf(
        withOrganization(core.db, A, async (tx) => {
          const result = await tx.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`)
          await killer.query('select pg_terminate_backend($1)', [result.rows[0]?.pid])
          await pause(300)
          await tx.execute(sql`select 1`)
        })
      )
      const ok = await withOrganization(core.db, A, (tx) => tx.execute(sql`select 1 as one`))
      expect(ok.rows).toEqual([{ one: 1 }])
    } finally {
      await core.close()
    }
  })
})

describe('close', () => {
  test('is bounded by closeTimeoutMs when a transaction never finishes', async () => {
    const core = createDb(env.core, { max: 1, closeTimeoutMs: 300 })
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const held = withOrganization(core.db, A, async () => gate)
    await pause(200)
    const started = Date.now()
    const message = await rejectionOf(core.close())
    expect(message).toContain('close')
    expect(Date.now() - started).toBeLessThan(3000)
    release()
    await held.catch(() => undefined)
  })
})
