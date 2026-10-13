import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Pool } from 'pg'
import { integrationEnv, rejectionOf } from './integration-support'
import { runMigrations } from './migrate'
import { OWNER_ROLE } from './roles'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`

describe('runMigrations', () => {
  test('refuses to run as any role but the owner', async () => {
    const message = await rejectionOf(runMigrations(env.core))
    expect(message).toContain(OWNER_ROLE)
    expect(message).toContain('closeline_core')
  })

  test('applies the migrations as the owner', async () => {
    await runMigrations(env.owner)
    await runMigrations(env.owner)
  })
})

describe('the lock timeout of a migration session', () => {
  let owner: Pool
  let folder: string
  const lockTable = `it_lock_${suffix}`

  beforeAll(async () => {
    owner = new Pool({ connectionString: env.owner, max: 2 })
    await owner.query(`create table "core"."${lockTable}" (id int)`)
    // A migration newer than any applied one, so drizzle treats it as pending. It fails on the
    // lock below, which rolls it back and records nothing.
    folder = mkdtempSync(join(tmpdir(), 'closeline-db-lock-'))
    mkdirSync(join(folder, 'meta'))
    writeFileSync(
      join(folder, '9999_wait_for_lock.sql'),
      `ALTER TABLE "core"."${lockTable}" ENABLE ROW LEVEL SECURITY;\n`
    )
    writeFileSync(
      join(folder, 'meta', '_journal.json'),
      JSON.stringify({
        version: '7',
        dialect: 'postgresql',
        entries: [
          {
            idx: 0,
            version: '7',
            when: 4_000_000_000_000,
            tag: '9999_wait_for_lock',
            breakpoints: true,
          },
        ],
      })
    )
  })

  afterAll(async () => {
    await owner.query(`drop table if exists "core"."${lockTable}"`)
    await owner.end()
    rmSync(folder, { recursive: true, force: true })
  })

  test('a migration queued behind a long transaction fails instead of waiting forever', async () => {
    const holder = await owner.connect()
    try {
      await holder.query('begin')
      await holder.query(`lock table "core"."${lockTable}" in access exclusive mode`)
      const started = Date.now()
      const message = await rejectionOf(
        runMigrations(env.owner, { migrationsFolder: folder, lockTimeoutMs: 300 })
      )
      expect(message).toContain('lock timeout')
      expect(Date.now() - started).toBeLessThan(5000)
    } finally {
      await holder.query('rollback')
      holder.release()
    }
  })
})
