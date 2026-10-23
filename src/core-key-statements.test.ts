import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { API_KEY_FOR_HASH } from './core-key-statements'

describe('API_KEY_FOR_HASH', () => {
  test('binds the hash and selects neither the hash nor any other column', () => {
    expect(API_KEY_FOR_HASH).toContain('core.api_key_for_hash($1)')
    expect(API_KEY_FOR_HASH).not.toMatch(/secret_hash|name|prefix|role_ceiling|\*/)
  })

  test('is printed in the README exactly as it is run', () => {
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
    expect(readme).toContain(API_KEY_FOR_HASH)
  })
})

describe('release', () => {
  test('package.json is at 0.37.0 and the README names that release for the key lookup', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    expect(pkg.version).toBe('0.37.0')
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
    expect(readme).toContain('API key lookup (v0.37.0')
  })
})
