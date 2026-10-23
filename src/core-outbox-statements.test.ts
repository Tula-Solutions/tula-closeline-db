import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  OUTBOX_CLAIM,
  OUTBOX_COMPLETE,
  OUTBOX_ENQUEUE,
  OUTBOX_FAIL,
} from './core-outbox-statements'

describe('the outbox statements', () => {
  test('a write replays harmlessly on the dedupe key', () => {
    expect(OUTBOX_ENQUEUE).toContain('on conflict (organization_id, dedupe_key) do nothing')
    expect(OUTBOX_ENQUEUE).toContain('$4::jsonb')
  })

  test('the drain goes through the definer functions, never the table', () => {
    for (const statement of [OUTBOX_CLAIM, OUTBOX_COMPLETE, OUTBOX_FAIL]) {
      expect(statement).not.toMatch(/from core\.outbox\b|update core\.outbox/)
      expect(statement).toContain('core.outbox_')
    }
  })

  test('each is printed in the README exactly as it is run', () => {
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
    for (const statement of [OUTBOX_ENQUEUE, OUTBOX_CLAIM, OUTBOX_COMPLETE, OUTBOX_FAIL]) {
      expect(readme).toContain(statement)
    }
  })
})
