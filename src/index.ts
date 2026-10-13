export type { Database, DbHandle, DbOptions, Schema, Transaction } from './client'
export { createDb, DEFAULT_POOL_OPTIONS, reportConnectionError } from './client'
export { ENVIRONMENT_SETTING, withEnvironment } from './environment'
export type { TenantIsolationGap } from './isolation'
export {
  assertTenantIsolation,
  findTenantIsolationGaps,
  NON_TENANT_TABLE_REASONS,
  NON_TENANT_TABLES,
  TENANT_SCHEMAS,
} from './isolation'
export { OWNER_ROLE } from './roles'
export { ORGANIZATION_SETTING, tenantRlsStatements, withOrganization } from './tenant'

/** This library's package name, so a consumer can report which shared libraries it resolved. */
export const PACKAGE = 'tula-closeline-db'
