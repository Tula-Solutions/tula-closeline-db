import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { inquiryEmbeds } from './core-inquiry-embeds'

const migration = readFileSync(
  new URL('../../migrations/0077_core_inquiry_embeds.sql', import.meta.url),
  'utf8'
)

describe('core.inquiry_embeds', () => {
  test('holds the key and its hash, the origins and the wording snapshot', () => {
    expect(
      getTableConfig(inquiryEmbeds)
        .columns.map((c) => c.name)
        .sort()
    ).toEqual([
      'allowed_origins',
      'consent_wording_id',
      'consent_wording_text',
      'consent_wording_version',
      'created_at',
      'organization_id',
      'publishable_key',
      'publishable_key_hash',
      'updated_at',
    ])
  })

  test('forces row-level security and defines both functions in the migration', () => {
    expect(migration).toContain('ALTER TABLE "core"."inquiry_embeds" FORCE ROW LEVEL SECURITY')
    expect(migration).toContain('CREATE POLICY "inquiry_embeds_tenant_isolation"')
    expect(migration).toContain('FUNCTION "core"."inquiry_embed_for_key_hash"')
    expect(migration).toContain('FUNCTION "voice"."orgs_with_due_callbacks"')
  })
})
