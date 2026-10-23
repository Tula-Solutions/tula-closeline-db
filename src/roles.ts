/** The one database role that owns every schema and table and runs every migration. */
export const OWNER_ROLE = 'closeline_owner'

/**
 * The NOLOGIN role that owns the Prospect search functions and bypasses row-level security, so the
 * trigram indexes can serve them. Only a function it owns runs with that bypass; no service role
 * is a member of it.
 */
export const SEARCH_ROLE = 'closeline_core_search'

/**
 * The NOLOGIN role that owns `core.crm_connection_for_account` and bypasses row-level security to
 * answer a CRM webhook before its Organization is known. It reads four routing columns of
 * `crm_connection` and no token; no service role is a member of it.
 */
export const CRM_LOOKUP_ROLE = 'closeline_core_crm_lookup'

/**
 * The NOLOGIN role that owns `core.api_key_for_hash` and bypasses row-level security to find an API
 * key from its hash before the Organization is known. It reads six columns of `api_keys`; no
 * service role is a member of it.
 */
export const KEY_LOOKUP_ROLE = 'closeline_core_key_lookup'

/** The NOLOGIN definer roles that bypass row-level security by design. */
export const DEFINER_ROLES = [SEARCH_ROLE, CRM_LOOKUP_ROLE, KEY_LOOKUP_ROLE] as const
