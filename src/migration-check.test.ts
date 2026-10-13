import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { checkMigrations } from './migration-check'

interface Entry {
  tag: string
  when: number
}

function journal(entries: Entry[]): string {
  return JSON.stringify({
    version: '7',
    dialect: 'postgresql',
    entries: entries.map((entry, idx) => ({ idx, version: '7', breakpoints: true, ...entry })),
  })
}

let repo: string

function write(path: string, content: string): void {
  const full = join(repo, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content)
}

function git(...args: string[]): void {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))
  )
  const result = Bun.spawnSync(['git', '-c', 'commit.gpgsign=false', ...args], {
    cwd: repo,
    env,
    stderr: 'pipe',
  })
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(' ')}: ${result.stderr.toString()}`)
  }
}

const BASE = [
  { tag: '0000_first', when: 1000 },
  { tag: '0001_second', when: 2000 },
]

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'closeline-db-migcheck-'))
  git('init', '-q', '-b', 'develop')
  git('config', 'user.email', 'test@example.com')
  git('config', 'user.name', 'Test')
  write('migrations/0000_first.sql', 'CREATE SCHEMA a;\n')
  write('migrations/0001_second.sql', 'CREATE SCHEMA b;\n')
  write('migrations/meta/0000_snapshot.json', '{"id":"0"}\n')
  write('migrations/meta/_journal.json', journal(BASE))
  git('add', '.')
  git('commit', '-q', '-m', 'base')
  git('checkout', '-q', '-b', 'feat/x')
})

afterEach(() => {
  rmSync(repo, { recursive: true, force: true })
})

const run = (overrides: { baseRef?: string; ci?: boolean } = {}) =>
  checkMigrations({ repoDir: repo, baseRef: 'develop', ci: false, ...overrides })

describe('checkMigrations', () => {
  test('passes when nothing under migrations/ changed', () => {
    expect(run()).toEqual({ errors: [], warnings: [] })
  })

  test('passes when a new migration is appended', () => {
    write('migrations/0002_third.sql', 'CREATE SCHEMA c;\n')
    write('migrations/meta/_journal.json', journal([...BASE, { tag: '0002_third', when: 3000 }]))
    expect(run().errors).toEqual([])
  })

  test('fails when a migration already on the base ref is edited', () => {
    write('migrations/0001_second.sql', 'CREATE SCHEMA b; -- edited\n')
    const { errors } = run()
    expect(errors.length).toBe(1)
    expect(errors[0]).toContain('migrations/0001_second.sql')
  })

  test('fails when a snapshot already on the base ref is edited', () => {
    write('migrations/meta/0000_snapshot.json', '{"id":"changed"}\n')
    expect(run().errors.join('\n')).toContain('migrations/meta/0000_snapshot.json')
  })

  test('fails when a migration already on the base ref is deleted', () => {
    rmSync(join(repo, 'migrations/0000_first.sql'))
    expect(run().errors.join('\n')).toContain('migrations/0000_first.sql')
  })

  test('fails when a journal entry already on the base ref is changed', () => {
    write(
      'migrations/meta/_journal.json',
      journal([BASE[0] as Entry, { tag: '0001_second', when: 2500 }])
    )
    expect(run().errors.join('\n')).toContain('0001_second')
  })

  test('fails when a journal entry already on the base ref is removed', () => {
    write('migrations/meta/_journal.json', journal([BASE[0] as Entry]))
    expect(run().errors.join('\n')).toContain('0001_second')
  })

  test('fails when journal when values do not strictly increase', () => {
    write('migrations/0002_third.sql', 'CREATE SCHEMA c;\n')
    write('migrations/meta/_journal.json', journal([...BASE, { tag: '0002_third', when: 2000 }]))
    expect(run().errors.join('\n')).toContain('0002_third')
  })

  test('checks journal order even when the base ref cannot be resolved', () => {
    write('migrations/meta/_journal.json', journal([BASE[1] as Entry, BASE[0] as Entry]))
    const result = run({ baseRef: 'origin/nowhere' })
    expect(result.errors.join('\n')).toContain('0000_first')
  })

  test('warns and passes locally when the base ref cannot be resolved', () => {
    const result = run({ baseRef: 'origin/nowhere' })
    expect(result.errors).toEqual([])
    expect(result.warnings.join('\n')).toContain('origin/nowhere')
  })

  test('fails in CI when the base ref cannot be resolved', () => {
    const result = run({ baseRef: 'origin/nowhere', ci: true })
    expect(result.errors.join('\n')).toContain('origin/nowhere')
  })

  test('passes when the base ref has no migrations yet', () => {
    git('checkout', '-q', '--orphan', 'empty')
    git('rm', '-rq', '--cached', '.')
    git('commit', '-q', '--allow-empty', '-m', 'empty')
    expect(run({ baseRef: 'empty' }).errors).toEqual([])
  })
})
