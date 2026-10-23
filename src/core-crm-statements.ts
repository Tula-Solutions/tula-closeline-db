/** One row of {@link CRM_CONNECTION_FOR_ACCOUNT}: where to route a webhook and nothing secret. */
export interface CrmConnectionForAccountRow extends Record<string, unknown> {
  /** The Organization that owns the connection (`org_` and 32 hex characters). */
  organization_id: string
  /** The connection to read, inside that Organization's scope (`crn_` and 32 hex characters). */
  connection_id: string
}

/**
 * The SQL a CRM webhook handler runs before it knows the Organization: `$1` is the provider
 * (`hubspot` or `salesforce`), `$2` the provider's account id from the event. It calls
 * `core.crm_connection_for_account`, a `SECURITY DEFINER` function, and is the only way
 * `closeline_core` reaches `crm_connection` without an Organization. It returns at most one row
 * of {@link CrmConnectionForAccountRow}, and no row for an unknown account, a disconnected one
 * (disconnecting deletes the connection), another provider's account, or input that is not a
 * known provider and an account id of 1 to 128 characters. It never returns a token. Run it on the
 * pooled handle, not inside `withOrganization`, then read the connection inside
 * `withOrganization` for the Organization it names. The integration tests run exactly this string.
 */
export const CRM_CONNECTION_FOR_ACCOUNT =
  'select organization_id, connection_id from core.crm_connection_for_account($1, $2)'
