/** The one database role that owns every schema and table and runs every migration. */
export const OWNER_ROLE = 'closeline_owner'

/**
 * The NOLOGIN role that owns the Prospect search functions and bypasses row-level security, so the
 * trigram indexes can serve them. Only a function it owns runs with that bypass; no service role
 * is a member of it.
 */
export const SEARCH_ROLE = 'closeline_core_search'
