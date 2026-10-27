import { sql } from 'drizzle-orm'
import { check, customType, index, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { primaryKey, timestamps } from './mixins'
import { authSchema } from './pg-schema'
import { sessions } from './sessions'
import {
  tenantColumns,
  tenantConstraints,
  tenantForeignKey,
  tenantParentKey,
} from './tenant-columns'

// A `bytea` column read and written as bytes, whichever driver is underneath.
const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
})

/**
 * The most bytes a sealed next token may take (`refresh_tokens_sealed_next_token_length`): an
 * AES-256-GCM sealing (12-byte nonce, 16-byte tag) of a prefixed base64url token of 32 random
 * bytes is about 90 bytes, so 256 leaves room for a key-id prefix without allowing a blob.
 */
export const REFRESH_SEALED_NEXT_TOKEN_MAX_BYTES = 256

/**
 * Opaque, single-use refresh tokens, stored only as SHA-256 hashes and chained parent → child.
 *
 * Rotation sets `used_at` and `replaced_by_id`. The child token's secret is **derived**, not
 * stored: `HMAC(refresh-derivation key, parent id)`. So within the profile's `reuseGracePeriod`
 * the server can hand a racing client the same child again without keeping any recoverable token
 * material in the database. Any reuse after the window revokes the session (the token family).
 *
 * ADR 0026 replaces derivation with random tokens: `sealed_next_token` then holds the child token
 * sealed (AES-256-GCM, the row id as associated data) on the spent row for the grace only, and is
 * cleared after it. NULL on every row issued before that change and once the grace has ended.
 *
 * Pruning is **by session only**: delete expired/revoked sessions and let the cascade remove their
 * whole chain in one statement. Deleting individual tokens is rejected by the self-referencing
 * foreign keys (a parent's `replaced_by_id` or a child's `parent_id` would dangle).
 */
export const refreshTokens = authSchema.table(
  'refresh_tokens',
  {
    id: primaryKey(),
    ...tenantColumns(),
    sessionId: uuid('session_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    parentId: uuid('parent_id'),
    replacedById: uuid('replaced_by_id'),
    usedAt: timestamp('used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    sealedNextToken: bytes('sealed_next_token'),
    ...timestamps(),
  },
  (t) => [
    unique('refresh_tokens_token_hash_key').on(t.tokenHash),
    index('refresh_tokens_session_id_idx').on(t.sessionId),
    tenantParentKey('refresh_tokens', t),
    tenantForeignKey('refresh_tokens_session_fk', t, t.sessionId, sessions),
    // Self references: rows only disappear together, via the session cascade.
    tenantForeignKey('refresh_tokens_parent_fk', t, t.parentId, t, 'no action'),
    tenantForeignKey('refresh_tokens_replaced_by_fk', t, t.replacedById, t, 'no action'),
    check(
      'refresh_tokens_sealed_next_token_length',
      sql`octet_length(${t.sealedNextToken}) between 1 and ${sql.raw(String(REFRESH_SEALED_NEXT_TOKEN_MAX_BYTES))}`
    ),
    ...tenantConstraints('refresh_tokens', t),
  ]
)

/** A refresh token row. */
export type RefreshToken = typeof refreshTokens.$inferSelect
/** Insert shape for a refresh token. */
export type NewRefreshToken = typeof refreshTokens.$inferInsert
