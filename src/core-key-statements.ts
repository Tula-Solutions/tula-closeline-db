/** One row of {@link API_KEY_FOR_HASH}: whose key it is and what state it is in, never the hash. */
export interface ApiKeyForHashRow extends Record<string, unknown> {
  /** The Organization that owns the key (`org_` and 32 hex characters). */
  organization_id: string
  /** The key to read, inside that Organization's scope (`akey_` and 32 hex characters). */
  key_id: string
  /** The scopes the key grants (1 to 16 of the known scope names). */
  scopes: string[]
  /** When the key was revoked, or null while it is not. */
  revoked_at: Date | null
  /** When the key stops working, or null if it never expires. */
  expires_at: Date | null
}

/**
 * The SQL the API key exchange runs before it knows the Organization: `$1` is the SHA-256 hash of
 * the presented key, as 64 lowercase hex characters. It calls `core.api_key_for_hash`, a
 * `SECURITY DEFINER` function, and is the only way `closeline_core` reaches `api_keys` without an
 * Organization. It returns at most one row of {@link ApiKeyForHashRow}, and no row for an unknown
 * hash or one that is not 64 lowercase hex characters (null included). It matches exactly, never
 * as a pattern, and never returns the hash, the name, the prefix or the role ceiling. It does not
 * judge the key: a revoked or expired key is returned with `revoked_at` / `expires_at` set, and
 * the caller refuses it. Run it on the pooled handle, not inside `withOrganization`. The
 * integration tests run exactly this string.
 */
export const API_KEY_FOR_HASH =
  'select organization_id, key_id, scopes, revoked_at, expires_at from core.api_key_for_hash($1)'
