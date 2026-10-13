import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** What {@link checkMigrations} needs to know. */
export interface MigrationCheckOptions {
  /** The git repository root. */
  repoDir: string
  /** The ref holding the migrations that are already shared, such as `origin/develop`. */
  baseRef: string
  /** True on CI, where an unresolvable base ref is a failure and not a warning. */
  ci: boolean
  /** The migrations folder relative to the repository root; defaults to `migrations`. */
  migrationsDir?: string
}

/** The outcome of {@link checkMigrations}: pass when `errors` is empty. */
export interface MigrationCheckResult {
  /** Reasons the check fails. */
  errors: string[]
  /** Things worth saying that do not fail the check. */
  warnings: string[]
}

interface JournalEntry {
  tag: string
  when: number
}

function git(repoDir: string, args: string[]): { ok: boolean; out: string } {
  // A git hook sets GIT_DIR and GIT_INDEX_FILE, which would point git at the wrong repository.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))
  )
  const result = Bun.spawnSync(['git', '-C', repoDir, ...args], {
    env,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return { ok: result.exitCode === 0, out: result.stdout.toString() }
}

function parseJournal(text: string): JournalEntry[] | undefined {
  try {
    const parsed: unknown = JSON.parse(text)
    const entries = (parsed as { entries?: unknown }).entries
    if (!Array.isArray(entries)) {
      return undefined
    }
    return entries.map((entry: { tag?: unknown; when?: unknown }) => ({
      tag: String(entry.tag),
      when: Number(entry.when),
    }))
  } catch {
    return undefined
  }
}

/**
 * Check that migrations already shared on a base ref were not edited, and that the journal is
 * append-only with strictly increasing `when` values.
 *
 * Drizzle skips a migration it has already applied, so a hand edit to a file on `develop` changes
 * nothing in an existing database and silently differs from a fresh one. Every file under the
 * migrations folder at `baseRef` must be byte-identical in the working tree (the journal is
 * checked entry by entry instead, because it grows). When the ref cannot be resolved the
 * comparison is skipped with a warning locally and is an error on CI; journal order is checked
 * either way.
 *
 * @param options - The repository, base ref and CI flag.
 * @returns The errors and warnings found.
 */
export function checkMigrations(options: MigrationCheckOptions): MigrationCheckResult {
  const { repoDir, baseRef, ci } = options
  const dir = options.migrationsDir ?? 'migrations'
  const journalPath = `${dir}/meta/_journal.json`
  const errors: string[] = []
  const warnings: string[] = []

  const journalFile = join(repoDir, journalPath)
  const current = existsSync(journalFile)
    ? parseJournal(readFileSync(journalFile, 'utf8'))
    : undefined
  if (current) {
    for (let i = 1; i < current.length; i++) {
      const previous = current[i - 1]
      const entry = current[i]
      if (previous && entry && !(entry.when > previous.when)) {
        errors.push(
          `${journalPath}: "${entry.tag}" has when=${entry.when}, not after "${previous.tag}" (${previous.when})`
        )
      }
    }
  } else {
    errors.push(`${journalPath} is missing or is not a valid journal`)
  }

  const resolved = git(repoDir, ['rev-parse', '--verify', '--quiet', `${baseRef}^{commit}`])
  if (!resolved.ok) {
    const message = `base ref "${baseRef}" cannot be resolved, so migration immutability was not checked (set MIGRATIONS_BASE_REF, and fetch it on CI)`
    if (ci) {
      errors.push(message)
    } else {
      warnings.push(message)
    }
    return { errors, warnings }
  }

  const listed = git(repoDir, ['ls-tree', '-r', '--name-only', baseRef, '--', dir])
  if (!listed.ok) {
    errors.push(`could not list ${dir}/ at ${baseRef}`)
    return { errors, warnings }
  }
  for (const path of listed.out.split('\n').filter((line) => line !== '' && line !== journalPath)) {
    const atBase = git(repoDir, ['show', `${baseRef}:${path}`])
    const file = join(repoDir, path)
    if (!existsSync(file)) {
      errors.push(`${path} exists on ${baseRef} but was deleted`)
    } else if (!atBase.ok || readFileSync(file, 'utf8') !== atBase.out) {
      errors.push(`${path} exists on ${baseRef} but was edited; add a new migration instead`)
    }
  }

  const base = git(repoDir, ['show', `${baseRef}:${journalPath}`])
  const baseEntries = base.ok ? parseJournal(base.out) : undefined
  if (baseEntries && current) {
    for (const [i, expected] of baseEntries.entries()) {
      const actual = current[i]
      if (!actual) {
        errors.push(`${journalPath}: entry "${expected.tag}" exists on ${baseRef} but was removed`)
      } else if (actual.tag !== expected.tag || actual.when !== expected.when) {
        errors.push(
          `${journalPath}: entry ${i} was "${expected.tag}" (${expected.when}) on ${baseRef} and is now "${actual.tag}" (${actual.when})`
        )
      }
    }
  }
  return { errors, warnings }
}
