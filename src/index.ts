export type { Database, DbHandle, DbOptions, Schema, Transaction } from './client'
export { createDb, DEFAULT_POOL_OPTIONS, reportConnectionError } from './client'
export type { InvitationForToken, OrganizationOfUser, OrganizationStatus } from './core-lookups'
export { invitationForToken, organizationOfUser } from './core-lookups'
export { ENVIRONMENT_POLICY_EXPRESSION, ENVIRONMENT_SETTING, withEnvironment } from './environment'
export type { AuthTableCategories, TenantIsolationGap } from './isolation'
export {
  assertTenantIsolation,
  CONTROL_PLANE_TABLE_REASONS,
  CONTROL_PLANE_TABLES,
  ENVIRONMENT_SCOPED_TABLES,
  findTenantIsolationGaps,
  NON_TENANT_TABLE_REASONS,
  NON_TENANT_TABLES,
  TENANT_SCHEMAS,
} from './isolation'
export { OWNER_ROLE } from './roles'
export { ORGANIZATION_SETTING, tenantRlsStatements, withOrganization } from './tenant'

/** This library's package name, so a consumer can report which shared libraries it resolved. */
export const PACKAGE = 'tula-closeline-db'
