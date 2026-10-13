import { createRequire } from "node:module";
var __defProp = Object.defineProperty;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// src/schema/index.ts
var exports_schema = {};
__export(exports_schema, {
  ABANDON_CASE_MAX_ATTEMPTS: () => ABANDON_CASE_MAX_ATTEMPTS2,
  ABANDON_CASE_OUTCOMES: () => ABANDON_CASE_OUTCOMES2,
  API_KEY_KINDS: () => API_KEY_KINDS2,
  ATTEMPT_COUNTER_KEY_HASH_BYTES: () => ATTEMPT_COUNTER_KEY_HASH_BYTES2,
  ATTEMPT_COUNTER_KINDS: () => ATTEMPT_COUNTER_KINDS2,
  ATTEMPT_COUNTER_MAX_HITS: () => ATTEMPT_COUNTER_MAX_HITS2,
  AUDIT_ACTOR_TYPES: () => AUDIT_ACTOR_TYPES2,
  AUDIT_RETENTION_FLOOR: () => AUDIT_RETENTION_FLOOR2,
  CONSUMED_MESSAGE_STATES: () => CONSUMED_MESSAGE_STATES2,
  CREDENTIAL_TYPES: () => CREDENTIAL_TYPES2,
  DOCUMENT_FAILURE_REASONS: () => DOCUMENT_FAILURE_REASONS2,
  DOCUMENT_FILE_TYPES: () => DOCUMENT_FILE_TYPES2,
  DOCUMENT_MAX_BYTES: () => DOCUMENT_MAX_BYTES2,
  DOCUMENT_MAX_PAGE_COUNT: () => DOCUMENT_MAX_PAGE_COUNT2,
  DOCUMENT_PURGE_MAX_ATTEMPTS: () => DOCUMENT_PURGE_MAX_ATTEMPTS2,
  DOCUMENT_STATES: () => DOCUMENT_STATES2,
  ENVIRONMENT_KINDS: () => ENVIRONMENT_KINDS2,
  EVENT_RETENTION_FLOOR: () => EVENT_RETENTION_FLOOR2,
  GLOBAL_SCOPE_ORGANIZATION_ID: () => GLOBAL_SCOPE_ORGANIZATION_ID2,
  IDEMPOTENCY_HASH_BYTES: () => IDEMPOTENCY_HASH_BYTES2,
  IDEMPOTENCY_KEY_MAX: () => IDEMPOTENCY_KEY_MAX2,
  IDEMPOTENCY_RESPONSE_MAX_BYTES: () => IDEMPOTENCY_RESPONSE_MAX_BYTES2,
  IDEMPOTENCY_ROUTE_MAX: () => IDEMPOTENCY_ROUTE_MAX2,
  IDENTITY_PROVIDERS: () => IDENTITY_PROVIDERS2,
  INGESTION_JOB_MAX_ATTEMPTS: () => INGESTION_JOB_MAX_ATTEMPTS2,
  INGESTION_JOB_STATES: () => INGESTION_JOB_STATES2,
  INGESTION_MAX_CHUNKS: () => INGESTION_MAX_CHUNKS2,
  INGESTION_STEPS: () => INGESTION_STEPS2,
  INTERNAL_CALL_USER_ID: () => INTERNAL_CALL_USER_ID2,
  INVITATION_ROLES: () => INVITATION_ROLES2,
  INVITATION_STATES: () => INVITATION_STATES2,
  MEMBERSHIP_ROLES: () => MEMBERSHIP_ROLES2,
  MEMBER_NAME_MAX: () => MEMBER_NAME_MAX2,
  OAUTH_PROVIDERS: () => OAUTH_PROVIDERS2,
  ORGANIZATION_REGIONS: () => ORGANIZATION_REGIONS2,
  ORGANIZATION_STATUSES: () => ORGANIZATION_STATUSES2,
  PASSKEY_CHALLENGE_PURPOSES: () => PASSKEY_CHALLENGE_PURPOSES2,
  PENDING_CLEANUP_PREDICATE: () => PENDING_CLEANUP_PREDICATE2,
  SESSION_CLIENTS: () => SESSION_CLIENTS2,
  SESSION_REVOKE_REASONS: () => SESSION_REVOKE_REASONS2,
  SESSION_TYPES: () => SESSION_TYPES2,
  SIGNING_KEY_STATUSES: () => SIGNING_KEY_STATUSES2,
  SMS_COUNT_RETENTION_FLOOR_DAYS: () => SMS_COUNT_RETENTION_FLOOR_DAYS2,
  USER_FACTOR_TYPES: () => USER_FACTOR_TYPES2,
  VERIFICATION_PURPOSES: () => VERIFICATION_PURPOSES2,
  WEBHOOK_DELIVERY_RETENTION_FLOOR: () => WEBHOOK_DELIVERY_RETENTION_FLOOR2,
  WEBHOOK_DELIVERY_STATES: () => WEBHOOK_DELIVERY_STATES2,
  WORK_KINDS: () => WORK_KINDS2,
  abandonCases: () => abandonCases2,
  apiKeys: () => apiKeys2,
  attemptCounters: () => attemptCounters2,
  auditLogs: () => auditLogs2,
  authSchema: () => authSchema2,
  backupCodes: () => backupCodes2,
  consumedMessage: () => consumedMessage2,
  coreSchema: () => coreSchema2,
  credentials: () => credentials2,
  documents: () => documents2,
  environmentSettings: () => environmentSettings2,
  environments: () => environments2,
  events: () => events2,
  flowAttempts: () => flowAttempts2,
  hookCallCounts: () => hookCallCounts2,
  hooks: () => hooks2,
  idempotencyKeys: () => idempotencyKeys2,
  identities: () => identities2,
  indexSettings: () => indexSettings2,
  ingestionJobs: () => ingestionJobs2,
  instanceAuditLogs: () => instanceAuditLogs2,
  invitationDirectory: () => invitationDirectory2,
  invitations: () => invitations2,
  membershipDirectory: () => membershipDirectory2,
  memberships: () => memberships2,
  nativeApps: () => nativeApps2,
  oauthProviders: () => oauthProviders2,
  organizationState: () => organizationState2,
  organizationUsage: () => organizationUsage2,
  organizations: () => organizations2,
  passkeyChallenges: () => passkeyChallenges2,
  passkeys: () => passkeys2,
  passwordHistory: () => passwordHistory2,
  playbookIdempotencyKeys: () => playbookIdempotencyKeys2,
  playbookOrphanSweeps: () => playbookOrphanSweeps2,
  playbookSchema: () => playbookSchema2,
  playbookWorkHints: () => playbookWorkHints2,
  projects: () => projects2,
  proposals: () => proposals2,
  refreshTokens: () => refreshTokens2,
  sessions: () => sessions2,
  signingKeys: () => signingKeys2,
  smsCodeCounts: () => smsCodeCounts2,
  teamMembers: () => teamMembers2,
  teams: () => teams2,
  userFactors: () => userFactors2,
  users: () => users2,
  verificationTokens: () => verificationTokens2,
  webhookDeliveries: () => webhookDeliveries2,
  webhookDeliveryAttempts: () => webhookDeliveryAttempts2,
  webhookEndpoints: () => webhookEndpoints2,
  workspaces: () => workspaces2
});

// src/schema/auth/abandon-cases.ts
import { sql as sql2 } from "drizzle-orm";
import {
  check,
  foreignKey as foreignKey2,
  index as index4,
  integer,
  pgPolicy as pgPolicy2,
  text as text4,
  timestamp as timestamp2,
  unique as unique3,
  uuid as uuid5
} from "drizzle-orm/pg-core";

// src/schema/auth/environments.ts
import { index as index2, text as text3, unique, uuid as uuid3 } from "drizzle-orm/pg-core";

// src/schema/auth/mixins.ts
import { timestamp, uuid } from "drizzle-orm/pg-core";
function primaryKey() {
  return uuid("id").primaryKey().$defaultFn(() => Bun.randomUUIDv7());
}
function timestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date)
  };
}

// src/schema/auth/pg-schema.ts
import { pgSchema } from "drizzle-orm/pg-core";
var authSchema2 = pgSchema("auth");

// src/schema/auth/projects.ts
import { index, text as text2, uuid as uuid2 } from "drizzle-orm/pg-core";

// src/schema/auth/workspaces.ts
import { text } from "drizzle-orm/pg-core";
var workspaces2 = authSchema2.table("workspaces", {
  id: primaryKey(),
  name: text("name").notNull(),
  ...timestamps()
});

// src/schema/auth/projects.ts
var projects2 = authSchema2.table("projects", {
  id: primaryKey(),
  workspaceId: uuid2("workspace_id").notNull().references(() => workspaces2.id, { onDelete: "cascade" }),
  name: text2("name").notNull(),
  ...timestamps()
}, (t) => [index("projects_workspace_id_idx").on(t.workspaceId)]);

// src/schema/auth/environments.ts
var ENVIRONMENT_KINDS2 = ["development", "production"];
var environments2 = authSchema2.table("environments", {
  id: primaryKey(),
  projectId: uuid3("project_id").notNull().references(() => projects2.id, { onDelete: "cascade" }),
  kind: text3("kind", { enum: ENVIRONMENT_KINDS2 }).notNull(),
  ...timestamps()
}, (t) => [
  unique("environments_project_kind_key").on(t.projectId, t.kind),
  unique("environments_id_project_key").on(t.id, t.projectId),
  index2("environments_project_id_idx").on(t.projectId)
]);

// src/schema/auth/tenant-columns.ts
import { sql } from "drizzle-orm";
import { foreignKey, index as index3, pgPolicy, unique as unique2, uuid as uuid4 } from "drizzle-orm/pg-core";
var TENANT_SETTING = "tula.environment_id";
var TENANT_PREDICATE = sql.raw(`environment_id = nullif(current_setting('${TENANT_SETTING}', true), '')::uuid`);
function tenantColumns() {
  return {
    projectId: uuid4("project_id").notNull().references(() => projects2.id, { onDelete: "cascade" }),
    environmentId: uuid4("environment_id").notNull().references(() => environments2.id, { onDelete: "cascade" })
  };
}
function tenantConstraints(table, t) {
  return [
    foreignKey({
      name: `${table}_environment_project_fk`,
      columns: [t.environmentId, t.projectId],
      foreignColumns: [environments2.id, environments2.projectId]
    }).onDelete("cascade"),
    index3(`${table}_environment_id_idx`).on(t.environmentId),
    pgPolicy(`${table}_tenant_isolation`, {
      as: "permissive",
      for: "all",
      using: TENANT_PREDICATE,
      withCheck: TENANT_PREDICATE
    })
  ];
}
function tenantForeignKey(name, t, column, parent, onDelete = "cascade") {
  return foreignKey({
    name,
    columns: [t.environmentId, column],
    foreignColumns: [parent.environmentId, parent.id]
  }).onDelete(onDelete);
}
function tenantParentKey(table, t) {
  return unique2(`${table}_environment_id_id_key`).on(t.environmentId, t.id);
}

// src/schema/auth/abandon-cases.ts
var ABANDON_CASE_MAX_ATTEMPTS2 = 100;
var ABANDON_CASE_OUTCOMES2 = ["done", "not_needed", "refused", "gave_up"];
var abandonCases2 = authSchema2.table("abandon_cases", {
  id: primaryKey(),
  ...tenantColumns(),
  coreOrganizationId: uuid5("core_organization_id"),
  userId: uuid5("user_id").notNull(),
  attemptId: uuid5("attempt_id").notNull(),
  attempts: integer("attempts").notNull().default(0),
  attemptExpiresAt: timestamp2("attempt_expires_at", { withTimezone: true }).notNull(),
  nextAttemptAt: timestamp2("next_attempt_at", { withTimezone: true }).notNull(),
  resolvedAt: timestamp2("resolved_at", { withTimezone: true }),
  outcome: text4("outcome", { enum: ABANDON_CASE_OUTCOMES2 }),
  ...timestamps()
}, (t) => [
  unique3("abandon_cases_environment_organization_key").on(t.environmentId, t.coreOrganizationId),
  unique3("abandon_cases_environment_attempt_key").on(t.environmentId, t.attemptId),
  check("abandon_cases_due_after_expiry", sql2`${t.nextAttemptAt} >= ${t.attemptExpiresAt}`),
  check("abandon_cases_attempts_bounds", sql2`${t.attempts} between 0 and ${sql2.raw(String(ABANDON_CASE_MAX_ATTEMPTS2))}`),
  check("abandon_cases_outcome_known", sql2`${t.outcome} in ('done', 'not_needed', 'refused', 'gave_up')`),
  check("abandon_cases_resolution_whole", sql2`(${t.resolvedAt} is null) = (${t.outcome} is null)`),
  index4("abandon_cases_due_idx").on(t.environmentId, t.nextAttemptAt).where(sql2`${t.resolvedAt} is null`),
  index4("abandon_cases_purge_idx").on(t.environmentId, t.resolvedAt).where(sql2`${t.resolvedAt} is not null`),
  foreignKey2({
    name: "abandon_cases_environment_project_fk",
    columns: [t.environmentId, t.projectId],
    foreignColumns: [environments2.id, environments2.projectId]
  }).onDelete("cascade"),
  pgPolicy2("abandon_cases_tenant_isolation", {
    as: "permissive",
    for: "all",
    using: TENANT_PREDICATE,
    withCheck: TENANT_PREDICATE
  }),
  pgPolicy2("abandon_cases_resolved_only", {
    as: "restrictive",
    for: "delete",
    using: sql2`resolved_at is not null`
  })
]);
// src/schema/auth/api-keys.ts
import { foreignKey as foreignKey3, index as index5, text as text5, timestamp as timestamp3, unique as unique4, uuid as uuid6 } from "drizzle-orm/pg-core";
var API_KEY_KINDS2 = ["publishable", "secret", "agent"];
var apiKeys2 = authSchema2.table("api_keys", {
  id: primaryKey(),
  projectId: uuid6("project_id").notNull().references(() => projects2.id, { onDelete: "cascade" }),
  environmentId: uuid6("environment_id").notNull().references(() => environments2.id, { onDelete: "cascade" }),
  kind: text5("kind", { enum: API_KEY_KINDS2 }).notNull(),
  name: text5("name").notNull(),
  keyHash: text5("key_hash").notNull(),
  lastFour: text5("last_four").notNull(),
  lastUsedAt: timestamp3("last_used_at", { withTimezone: true }),
  revokedAt: timestamp3("revoked_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  unique4("api_keys_key_hash_key").on(t.keyHash),
  foreignKey3({
    name: "api_keys_environment_project_fk",
    columns: [t.environmentId, t.projectId],
    foreignColumns: [environments2.id, environments2.projectId]
  }).onDelete("cascade"),
  index5("api_keys_environment_id_idx").on(t.environmentId)
]);
// src/schema/auth/attempt-counters.ts
import { sql as sql3 } from "drizzle-orm";
import {
  check as check2,
  customType,
  index as index6,
  integer as integer2,
  primaryKey as primaryKey2,
  text as text6,
  timestamp as timestamp4,
  uuid as uuid7
} from "drizzle-orm/pg-core";
var bytes = customType({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var ATTEMPT_COUNTER_KINDS2 = ["lockout", "rate_limit"];
var ATTEMPT_COUNTER_MAX_HITS2 = 1e6;
var ATTEMPT_COUNTER_KEY_HASH_BYTES2 = 32;
var attemptCounters2 = authSchema2.table("attempt_counters", {
  environmentId: uuid7("environment_id").notNull().references(() => environments2.id, { onDelete: "cascade" }),
  kind: text6("kind", { enum: ATTEMPT_COUNTER_KINDS2 }).notNull(),
  keyHash: bytes("key_hash").notNull(),
  hits: integer2("hits").notNull(),
  startedAt: timestamp4("started_at", { withTimezone: true }).notNull(),
  lockedUntil: timestamp4("locked_until", { withTimezone: true }),
  expiresAt: timestamp4("expires_at", { withTimezone: true }).notNull()
}, (t) => [
  primaryKey2({ name: "attempt_counters_pkey", columns: [t.environmentId, t.kind, t.keyHash] }),
  check2("attempt_counters_kind_known", sql3`${t.kind} in ('lockout', 'rate_limit')`),
  check2("attempt_counters_key_hash_length", sql3`octet_length(${t.keyHash}) = ${sql3.raw(String(ATTEMPT_COUNTER_KEY_HASH_BYTES2))}`),
  check2("attempt_counters_hits_bounds", sql3`${t.hits} between 1 and ${sql3.raw(String(ATTEMPT_COUNTER_MAX_HITS2))}`),
  check2("attempt_counters_window_order", sql3`${t.expiresAt} > ${t.startedAt}`),
  check2("attempt_counters_lock_whole", sql3`(${t.kind} = 'lockout') = (${t.lockedUntil} is not null)`),
  check2("attempt_counters_lock_before_expiry", sql3`${t.lockedUntil} is null or ${t.lockedUntil} <= ${t.expiresAt}`),
  index6("attempt_counters_purge_idx").on(t.expiresAt)
]);
// src/schema/auth/audit-logs.ts
import { sql as sql4 } from "drizzle-orm";
import { index as index7, inet, jsonb, pgPolicy as pgPolicy3, text as text7, timestamp as timestamp5 } from "drizzle-orm/pg-core";
var AUDIT_ACTOR_TYPES2 = ["user", "admin", "system", "agent", "instance_admin"];
var AUDIT_RETENTION_FLOOR2 = "1 day";
var auditLogs2 = authSchema2.table("audit_logs", {
  id: primaryKey(),
  ...tenantColumns(),
  actorType: text7("actor_type", { enum: AUDIT_ACTOR_TYPES2 }).notNull(),
  actorId: text7("actor_id"),
  action: text7("action").notNull(),
  targetType: text7("target_type"),
  targetId: text7("target_id"),
  ipAddress: inet("ip_address"),
  userAgent: text7("user_agent"),
  metadata: jsonb("metadata").$type().notNull().default({}),
  occurredAt: timestamp5("occurred_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  index7("audit_logs_environment_occurred_idx").on(t.environmentId, t.occurredAt),
  index7("audit_logs_environment_target_idx").on(t.environmentId, t.targetId, t.occurredAt),
  index7("audit_logs_environment_actor_idx").on(t.environmentId, t.actorId, t.occurredAt),
  ...tenantConstraints("audit_logs", t),
  pgPolicy3("audit_logs_retention_floor", {
    as: "restrictive",
    for: "delete",
    using: sql4.raw(`occurred_at < now() - interval '${AUDIT_RETENTION_FLOOR2}'`)
  })
]);
// src/schema/auth/backup-codes.ts
import { index as index9, text as text9, timestamp as timestamp7, unique as unique6, uuid as uuid8 } from "drizzle-orm/pg-core";

// src/schema/auth/users.ts
import { sql as sql5 } from "drizzle-orm";
import { check as check3, index as index8, text as text8, timestamp as timestamp6, unique as unique5 } from "drizzle-orm/pg-core";
var users2 = authSchema2.table("users", {
  id: primaryKey(),
  ...tenantColumns(),
  email: text8("email"),
  emailNormalized: text8("email_normalized"),
  emailVerifiedAt: timestamp6("email_verified_at", { withTimezone: true }),
  firstName: text8("first_name"),
  lastName: text8("last_name"),
  bannedAt: timestamp6("banned_at", { withTimezone: true }),
  lastSignInAt: timestamp6("last_sign_in_at", { withTimezone: true }),
  phoneNumber: text8("phone_number"),
  phoneNumberVerifiedAt: timestamp6("phone_number_verified_at", { withTimezone: true }),
  smsFactorEnabledAt: timestamp6("sms_factor_enabled_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  unique5("users_environment_email_key").on(t.environmentId, t.emailNormalized),
  check3("users_email_whole", sql5`(${t.email} IS NULL) = (${t.emailNormalized} IS NULL) AND (${t.email} IS NOT NULL OR ${t.emailVerifiedAt} IS NULL)`),
  check3("users_phone_number_whole", sql5`(${t.phoneNumber} IS NULL) = (${t.phoneNumberVerifiedAt} IS NULL)`),
  check3("users_sms_factor_needs_number", sql5`${t.smsFactorEnabledAt} IS NULL OR ${t.phoneNumber} IS NOT NULL`),
  index8("users_environment_phone_number_idx").on(t.environmentId, t.phoneNumber).where(sql5`${t.phoneNumber} IS NOT NULL`),
  tenantParentKey("users", t),
  ...tenantConstraints("users", t)
]);

// src/schema/auth/backup-codes.ts
var backupCodes2 = authSchema2.table("backup_codes", {
  id: primaryKey(),
  ...tenantColumns(),
  userId: uuid8("user_id").notNull(),
  codeHash: text9("code_hash").notNull(),
  usedAt: timestamp7("used_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  unique6("backup_codes_user_code_hash_key").on(t.userId, t.codeHash),
  index9("backup_codes_user_id_idx").on(t.userId),
  tenantForeignKey("backup_codes_user_fk", t, t.userId, users2),
  ...tenantConstraints("backup_codes", t)
]);
// src/schema/auth/credentials.ts
import { integer as integer3, text as text10, timestamp as timestamp8, unique as unique7, uuid as uuid9 } from "drizzle-orm/pg-core";
var CREDENTIAL_TYPES2 = ["password", "totp", "passkey"];
var credentials2 = authSchema2.table("credentials", {
  id: primaryKey(),
  ...tenantColumns(),
  userId: uuid9("user_id").notNull(),
  type: text10("type", { enum: CREDENTIAL_TYPES2 }).notNull(),
  secret: text10("secret").notNull(),
  policyVersion: integer3("policy_version").notNull().default(1),
  secretChangedAt: timestamp8("secret_changed_at", { withTimezone: true }).notNull().defaultNow(),
  ...timestamps()
}, (t) => [
  unique7("credentials_user_type_key").on(t.userId, t.type),
  tenantForeignKey("credentials_user_fk", t, t.userId, users2),
  ...tenantConstraints("credentials", t)
]);
// src/schema/auth/environment-settings.ts
import { integer as integer4, jsonb as jsonb2, unique as unique8 } from "drizzle-orm/pg-core";
var environmentSettings2 = authSchema2.table("environment_settings", {
  id: primaryKey(),
  ...tenantColumns(),
  settings: jsonb2("settings").$type().notNull(),
  revision: integer4("revision").notNull().default(1),
  managedBy: jsonb2("managed_by").$type(),
  ...timestamps()
}, (t) => [
  unique8("environment_settings_environment_id_key").on(t.environmentId),
  ...tenantConstraints("environment_settings", t)
]);
// src/schema/auth/events.ts
import { sql as sql6 } from "drizzle-orm";
import { index as index10, jsonb as jsonb3, pgPolicy as pgPolicy4, text as text11, timestamp as timestamp9 } from "drizzle-orm/pg-core";
var EVENT_RETENTION_FLOOR2 = "1 day";
var events2 = authSchema2.table("events", {
  id: primaryKey(),
  ...tenantColumns(),
  type: text11("type").notNull(),
  payload: jsonb3("payload").$type().notNull(),
  occurredAt: timestamp9("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  deliveredAt: timestamp9("delivered_at", { withTimezone: true })
}, (t) => [
  index10("events_environment_undelivered_idx").on(t.environmentId, t.occurredAt, t.id).where(sql6`delivered_at is null`),
  index10("events_environment_delivered_idx").on(t.environmentId, t.deliveredAt).where(sql6`delivered_at is not null`),
  tenantParentKey("events", t),
  ...tenantConstraints("events", t),
  pgPolicy4("events_retention_floor", {
    as: "restrictive",
    for: "delete",
    using: sql6.raw(`delivered_at is not null and occurred_at < now() - interval '${EVENT_RETENTION_FLOOR2}'`)
  })
]);
// src/schema/auth/flow-attempts.ts
import { jsonb as jsonb4, text as text12, timestamp as timestamp10, uuid as uuid10 } from "drizzle-orm/pg-core";
var flowAttempts2 = authSchema2.table("flow_attempts", {
  id: primaryKey(),
  ...tenantColumns(),
  kind: text12("kind", { enum: ["sign_in", "sign_up", "password_reset"] }).notNull(),
  status: text12("status").notNull(),
  userId: uuid10("user_id"),
  identifier: text12("identifier").notNull(),
  secretHash: text12("secret_hash"),
  state: jsonb4("state").$type().notNull().default({}),
  expiresAt: timestamp10("expires_at", { withTimezone: true }).notNull(),
  completedAt: timestamp10("completed_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  tenantParentKey("flow_attempts", t),
  tenantForeignKey("flow_attempts_user_fk", t, t.userId, users2),
  ...tenantConstraints("flow_attempts", t)
]);
// src/schema/auth/hook-call-counts.ts
import { sql as sql8 } from "drizzle-orm";
import { check as check5, integer as integer6, text as text14, timestamp as timestamp12, unique as unique10, uuid as uuid11 } from "drizzle-orm/pg-core";

// src/schema/auth/hooks.ts
import { sql as sql7 } from "drizzle-orm";
import { boolean, check as check4, integer as integer5, text as text13, timestamp as timestamp11, unique as unique9 } from "drizzle-orm/pg-core";
var hooks2 = authSchema2.table("hooks", {
  id: primaryKey(),
  ...tenantColumns(),
  point: text13("point", { enum: ["before_sign_up", "before_session", "before_token"] }).notNull(),
  url: text13("url").notNull(),
  secret: text13("secret").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  deadlineMs: integer5("deadline_ms").notNull().default(2000),
  failureMode: text13("failure_mode", { enum: ["deny", "allow"] }).notNull().default("deny"),
  lastFailedAt: timestamp11("last_failed_at", { withTimezone: true }),
  lastFailureReason: text13("last_failure_reason"),
  ...timestamps()
}, (t) => [
  unique9("hooks_environment_point_key").on(t.environmentId, t.point),
  tenantParentKey("hooks", t),
  check4("hooks_deadline_bounds", sql7`${t.deadlineMs} between 100 and 5000`),
  check4("hooks_failure_mode_known", sql7`${t.failureMode} in ('deny', 'allow')`),
  check4("hooks_last_failure_whole", sql7`(${t.lastFailedAt} is null) = (${t.lastFailureReason} is null)`),
  ...tenantConstraints("hooks", t)
]);

// src/schema/auth/hook-call-counts.ts
var hookCallCounts2 = authSchema2.table("hook_call_counts", {
  id: primaryKey(),
  ...tenantColumns(),
  hookId: uuid11("hook_id").notNull(),
  hour: timestamp12("hour", { withTimezone: true }).notNull(),
  outcome: text14("outcome", { enum: ["allowed", "denied", "failed", "timed_out"] }).notNull(),
  calls: integer6("calls").notNull().default(0),
  lastAt: timestamp12("last_at", { withTimezone: true }).notNull(),
  ...timestamps()
}, (t) => [
  unique10("hook_call_counts_hook_hour_outcome_key").on(t.hookId, t.hour, t.outcome),
  tenantForeignKey("hook_call_counts_hook_fk", t, t.hookId, hooks2),
  check5("hook_call_counts_outcome_known", sql8`${t.outcome} in ('allowed', 'denied', 'failed', 'timed_out')`),
  check5("hook_call_counts_calls_bounds", sql8`${t.calls} >= 0`),
  check5("hook_call_counts_hour_whole", sql8`${t.hour} = date_trunc('hour', ${t.hour}, 'UTC')`),
  check5("hook_call_counts_last_at_in_hour", sql8`${t.lastAt} >= ${t.hour} and ${t.lastAt} < ${t.hour} + interval '1 hour'`),
  ...tenantConstraints("hook_call_counts", t)
]);
// src/schema/auth/identities.ts
import { index as index11, text as text15, unique as unique11, uuid as uuid12 } from "drizzle-orm/pg-core";
var IDENTITY_PROVIDERS2 = [
  "email",
  "google",
  "apple",
  "github",
  "microsoft",
  "discord",
  "linkedin",
  "x",
  "facebook"
];
var identities2 = authSchema2.table("identities", {
  id: primaryKey(),
  ...tenantColumns(),
  userId: uuid12("user_id").notNull(),
  provider: text15("provider", { enum: IDENTITY_PROVIDERS2 }).notNull(),
  providerSubject: text15("provider_subject").notNull(),
  ...timestamps()
}, (t) => [
  unique11("identities_environment_provider_subject_key").on(t.environmentId, t.provider, t.providerSubject),
  unique11("identities_user_provider_key").on(t.userId, t.provider),
  index11("identities_user_id_idx").on(t.userId),
  tenantForeignKey("identities_user_fk", t, t.userId, users2),
  ...tenantConstraints("identities", t)
]);
// src/schema/auth/instance-audit-logs.ts
import { index as index12, inet as inet2, jsonb as jsonb5, text as text16, timestamp as timestamp13 } from "drizzle-orm/pg-core";
var instanceAuditLogs2 = authSchema2.table("instance_audit_logs", {
  id: primaryKey(),
  actorType: text16("actor_type", { enum: AUDIT_ACTOR_TYPES2 }).notNull(),
  actorId: text16("actor_id"),
  action: text16("action").notNull(),
  targetType: text16("target_type"),
  targetId: text16("target_id"),
  ipAddress: inet2("ip_address"),
  userAgent: text16("user_agent"),
  metadata: jsonb5("metadata").$type().notNull().default({}),
  occurredAt: timestamp13("occurred_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index12("instance_audit_logs_occurred_idx").on(t.occurredAt)]);
// src/schema/auth/native-apps.ts
import { sql as sql9 } from "drizzle-orm";
import { check as check6, text as text17, unique as unique12 } from "drizzle-orm/pg-core";
var nativeApps2 = authSchema2.table("native_apps", {
  id: primaryKey(),
  ...tenantColumns(),
  platform: text17("platform", { enum: ["ios", "android"] }).notNull(),
  identifier: text17("identifier").notNull(),
  teamId: text17("team_id"),
  sha256CertFingerprints: text17("sha256_cert_fingerprints").array().notNull().default(sql9`'{}'::text[]`),
  appLinkPaths: text17("app_link_paths").array().notNull().default(sql9`'{}'::text[]`),
  ...timestamps()
}, (t) => [
  unique12("native_apps_environment_platform_identifier_key").on(t.environmentId, t.platform, t.identifier),
  check6("native_apps_platform_known", sql9`${t.platform} in ('ios', 'android')`),
  check6("native_apps_identifier_shape", sql9`char_length(${t.identifier}) <= 255 and ${t.identifier} ~ '^[A-Za-z0-9_-]+(\\.[A-Za-z0-9_-]+)+$'`),
  check6("native_apps_ios_whole", sql9`${t.platform} <> 'ios' or (${t.teamId} is not null and ${t.teamId} ~ '^[A-Z0-9]{10}$' and cardinality(${t.sha256CertFingerprints}) = 0)`),
  check6("native_apps_android_whole", sql9`${t.platform} <> 'android' or (${t.teamId} is null and cardinality(${t.sha256CertFingerprints}) between 1 and 10)`),
  check6("native_apps_fingerprints_shape", sql9`array_position(${t.sha256CertFingerprints}, null) is null and array_to_string(${t.sha256CertFingerprints}, ',') ~ '^(([0-9A-F]{2}:){31}[0-9A-F]{2}(,([0-9A-F]{2}:){31}[0-9A-F]{2})*)?$' and char_length(array_to_string(${t.sha256CertFingerprints}, ',')) = greatest(96 * cardinality(${t.sha256CertFingerprints}) - 1, 0)`),
  check6("native_apps_app_link_paths_shape", sql9`cardinality(${t.appLinkPaths}) <= 10 and array_position(${t.appLinkPaths}, null) is null and array_to_string(${t.appLinkPaths}, ',') ~ '^((/[A-Za-z0-9._~-]+)+(,(/[A-Za-z0-9._~-]+)+)*)?$' and array_to_string(${t.appLinkPaths}, ',') !~ '/\\.\\.?(/|,|$)' and char_length(array_to_string(${t.appLinkPaths}, ',')) - char_length(replace(array_to_string(${t.appLinkPaths}, ','), ',', '')) = greatest(cardinality(${t.appLinkPaths}) - 1, 0) and char_length(array_to_string(${t.appLinkPaths}, ',')) <= 2560 and (cardinality(${t.appLinkPaths}) = 0 or char_length(array_to_string(${t.appLinkPaths}, ',')) >= 2)`),
  ...tenantConstraints("native_apps", t)
]);
// src/schema/auth/oauth-providers.ts
import { boolean as boolean2, jsonb as jsonb6, text as text18, unique as unique13 } from "drizzle-orm/pg-core";
var OAUTH_PROVIDERS2 = [
  "google",
  "github",
  "apple",
  "microsoft",
  "discord",
  "linkedin",
  "x",
  "facebook"
];
var oauthProviders2 = authSchema2.table("oauth_providers", {
  id: primaryKey(),
  ...tenantColumns(),
  provider: text18("provider", { enum: OAUTH_PROVIDERS2 }).notNull(),
  clientId: text18("client_id").notNull(),
  secret: text18("secret").notNull(),
  config: jsonb6("config").$type().notNull().default({}),
  enabled: boolean2("enabled").notNull().default(false),
  ...timestamps()
}, (t) => [
  unique13("oauth_providers_environment_provider_key").on(t.environmentId, t.provider),
  ...tenantConstraints("oauth_providers", t)
]);
// src/schema/auth/passkey-challenges.ts
import { index as index13, text as text19, timestamp as timestamp14, unique as unique14, uuid as uuid13 } from "drizzle-orm/pg-core";
var PASSKEY_CHALLENGE_PURPOSES2 = ["registration", "step_up"];
var passkeyChallenges2 = authSchema2.table("passkey_challenges", {
  id: primaryKey(),
  ...tenantColumns(),
  userId: uuid13("user_id").notNull(),
  sessionId: uuid13("session_id").notNull(),
  purpose: text19("purpose", { enum: PASSKEY_CHALLENGE_PURPOSES2 }).notNull(),
  challenge: text19("challenge").notNull(),
  expiresAt: timestamp14("expires_at", { withTimezone: true }).notNull(),
  ...timestamps()
}, (t) => [
  unique14("passkey_challenges_session_purpose_key").on(t.sessionId, t.purpose),
  index13("passkey_challenges_expires_at_idx").on(t.expiresAt),
  tenantForeignKey("passkey_challenges_user_fk", t, t.userId, users2),
  ...tenantConstraints("passkey_challenges", t)
]);
// src/schema/auth/passkeys.ts
import {
  bigint,
  boolean as boolean3,
  customType as customType2,
  index as index14,
  jsonb as jsonb7,
  text as text20,
  timestamp as timestamp15,
  unique as unique15,
  uuid as uuid14
} from "drizzle-orm/pg-core";
var bytes2 = customType2({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var passkeys2 = authSchema2.table("passkeys", {
  id: primaryKey(),
  ...tenantColumns(),
  userId: uuid14("user_id").notNull(),
  credentialId: text20("credential_id").notNull(),
  publicKey: bytes2("public_key").notNull(),
  signCount: bigint("sign_count", { mode: "number" }).notNull().default(0),
  transports: jsonb7("transports").$type().notNull().default([]),
  aaguid: text20("aaguid").notNull(),
  backupEligible: boolean3("backup_eligible").notNull().default(false),
  backedUp: boolean3("backed_up").notNull().default(false),
  userHandle: text20("user_handle").notNull(),
  name: text20("name").notNull(),
  lastUsedAt: timestamp15("last_used_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  unique15("passkeys_environment_credential_id_key").on(t.environmentId, t.credentialId),
  index14("passkeys_user_id_idx").on(t.userId),
  tenantForeignKey("passkeys_user_fk", t, t.userId, users2),
  ...tenantConstraints("passkeys", t)
]);
// src/schema/auth/password-history.ts
import { sql as sql10 } from "drizzle-orm";
import { check as check7, index as index15, integer as integer7, text as text21, uuid as uuid15 } from "drizzle-orm/pg-core";
var passwordHistory2 = authSchema2.table("password_history", {
  id: primaryKey(),
  ...tenantColumns(),
  userId: uuid15("user_id").notNull(),
  secret: text21("secret").notNull(),
  position: integer7("position").notNull(),
  ...timestamps()
}, (t) => [
  tenantForeignKey("password_history_user_fk", t, t.userId, users2),
  check7("password_history_position_positive", sql10`${t.position} >= 1`),
  index15("password_history_environment_position_idx").on(t.environmentId, t.position),
  ...tenantConstraints("password_history", t)
]);
// src/schema/auth/proposals.ts
import { sql as sql11 } from "drizzle-orm";
import { check as check8, index as index16, text as text22, timestamp as timestamp16, uuid as uuid16 } from "drizzle-orm/pg-core";
var proposals2 = authSchema2.table("proposals", {
  id: primaryKey(),
  ...tenantColumns(),
  operation: text22("operation").notNull(),
  targetType: text22("target_type").notNull(),
  targetId: text22("target_id").notNull(),
  proposedBy: uuid16("proposed_by").notNull(),
  status: text22("status", { enum: ["pending", "approved", "executed", "failed"] }).notNull().default("pending"),
  expiresAt: timestamp16("expires_at", { withTimezone: true }).notNull(),
  approvedByType: text22("approved_by_type"),
  approvedById: text22("approved_by_id"),
  approvedAt: timestamp16("approved_at", { withTimezone: true }),
  failureReason: text22("failure_reason"),
  ...timestamps()
}, (t) => [
  check8("proposals_status_known", sql11`${t.status} in ('pending', 'approved', 'executed', 'failed')`),
  check8("proposals_operation_shape", sql11`${t.operation} ~ '^[a-z_]{1,64}$'`),
  check8("proposals_target_type_shape", sql11`${t.targetType} ~ '^[a-z_]{1,64}$'`),
  check8("proposals_target_id_shape", sql11`${t.targetId} ~ '^[a-z0-9_-]{1,64}$'`),
  check8("proposals_approval_whole", sql11`(${t.status} = 'pending') = (${t.approvedAt} is null) and (${t.status} = 'pending') = (${t.approvedByType} is null) and (${t.approvedByType} is null or ${t.approvedByType} in ('admin', 'instance_admin')) and (${t.approvedById} is null or (${t.approvedByType} is not null and char_length(${t.approvedById}) between 1 and 128))`),
  check8("proposals_failure_whole", sql11`(${t.status} = 'failed') = (${t.failureReason} is not null) and (${t.failureReason} is null or ${t.failureReason} ~ '^[a-z_]{1,64}$')`),
  check8("proposals_lifetime_bounds", sql11`${t.expiresAt} <= ${t.createdAt} + interval '1 hour'`),
  index16("proposals_environment_created_idx").on(t.environmentId, t.createdAt),
  ...tenantConstraints("proposals", t)
]);
// src/schema/auth/refresh-tokens.ts
import { index as index18, text as text24, timestamp as timestamp18, unique as unique16, uuid as uuid18 } from "drizzle-orm/pg-core";

// src/schema/auth/sessions.ts
import { sql as sql12 } from "drizzle-orm";
import { check as check9, index as index17, inet as inet3, jsonb as jsonb8, text as text23, timestamp as timestamp17, uuid as uuid17 } from "drizzle-orm/pg-core";
var SESSION_CLIENTS2 = ["web", "ios", "android", "server"];
var SESSION_REVOKE_REASONS2 = [
  "sign_out",
  "revoked_by_user",
  "revoked_by_admin",
  "password_changed",
  "reuse_detected",
  "user_banned",
  "mfa_changed",
  "session_limit"
];
var SESSION_TYPES2 = ["hybrid", "stateful"];
var sessions2 = authSchema2.table("sessions", {
  id: primaryKey(),
  ...tenantColumns(),
  userId: uuid17("user_id").notNull(),
  profile: text23("profile").notNull(),
  type: text23("type", { enum: SESSION_TYPES2 }).notNull().default("hybrid"),
  client: text23("client", { enum: SESSION_CLIENTS2 }).notNull(),
  userAgent: text23("user_agent"),
  ipAddress: inet3("ip_address"),
  lastActiveAt: timestamp17("last_active_at", { withTimezone: true }).notNull(),
  idleExpiresAt: timestamp17("idle_expires_at", { withTimezone: true }).notNull(),
  absoluteExpiresAt: timestamp17("absolute_expires_at", { withTimezone: true }),
  factorVerifiedAt: timestamp17("factor_verified_at", { withTimezone: true }),
  authMethods: text23("auth_methods").array().notNull().default(sql12`'{}'::text[]`),
  hookClaims: jsonb8("hook_claims").$type(),
  deviceThumbprint: text23("device_thumbprint"),
  revokedAt: timestamp17("revoked_at", { withTimezone: true }),
  revokeReason: text23("revoke_reason", { enum: SESSION_REVOKE_REASONS2 }),
  ...timestamps()
}, (t) => [
  index17("sessions_user_id_idx").on(t.userId),
  check9("sessions_hook_claims_bounds", sql12`${t.hookClaims} is null or (jsonb_typeof(${t.hookClaims}) = 'object' and octet_length(${t.hookClaims}::text) <= 4096)`),
  check9("sessions_device_thumbprint_shape", sql12`${t.deviceThumbprint} is null or (${t.type} = 'hybrid' and ${t.deviceThumbprint} ~ '^[A-Za-z0-9_-]{43}$')`),
  tenantParentKey("sessions", t),
  tenantForeignKey("sessions_user_fk", t, t.userId, users2),
  ...tenantConstraints("sessions", t)
]);

// src/schema/auth/refresh-tokens.ts
var refreshTokens2 = authSchema2.table("refresh_tokens", {
  id: primaryKey(),
  ...tenantColumns(),
  sessionId: uuid18("session_id").notNull(),
  tokenHash: text24("token_hash").notNull(),
  parentId: uuid18("parent_id"),
  replacedById: uuid18("replaced_by_id"),
  usedAt: timestamp18("used_at", { withTimezone: true }),
  expiresAt: timestamp18("expires_at", { withTimezone: true }).notNull(),
  ...timestamps()
}, (t) => [
  unique16("refresh_tokens_token_hash_key").on(t.tokenHash),
  index18("refresh_tokens_session_id_idx").on(t.sessionId),
  tenantParentKey("refresh_tokens", t),
  tenantForeignKey("refresh_tokens_session_fk", t, t.sessionId, sessions2),
  tenantForeignKey("refresh_tokens_parent_fk", t, t.parentId, t, "no action"),
  tenantForeignKey("refresh_tokens_replaced_by_fk", t, t.replacedById, t, "no action"),
  ...tenantConstraints("refresh_tokens", t)
]);
// src/schema/auth/signing-keys.ts
import { sql as sql13 } from "drizzle-orm";
import { index as index19, jsonb as jsonb9, text as text25, timestamp as timestamp19, uniqueIndex } from "drizzle-orm/pg-core";
var SIGNING_KEY_STATUSES2 = ["next", "active", "retired"];
var signingKeys2 = authSchema2.table("signing_keys", {
  id: primaryKey(),
  ...tenantColumns(),
  algorithm: text25("algorithm", { enum: ["EdDSA"] }).notNull().default("EdDSA"),
  publicJwk: jsonb9("public_jwk").$type().notNull(),
  privateKeyCiphertext: text25("private_key_ciphertext").notNull(),
  status: text25("status", { enum: SIGNING_KEY_STATUSES2 }).notNull(),
  activatedAt: timestamp19("activated_at", { withTimezone: true }),
  retiredAt: timestamp19("retired_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  index19("signing_keys_environment_status_idx").on(t.environmentId, t.status),
  uniqueIndex("signing_keys_one_active_per_environment").on(t.environmentId).where(sql13`${t.status} = 'active'`),
  uniqueIndex("signing_keys_one_next_per_environment").on(t.environmentId).where(sql13`${t.status} = 'next'`),
  ...tenantConstraints("signing_keys", t)
]);
// src/schema/auth/sms-code-counts.ts
import { sql as sql14 } from "drizzle-orm";
import { check as check10, date, integer as integer8, pgPolicy as pgPolicy5, text as text26, unique as unique17 } from "drizzle-orm/pg-core";
var SMS_COUNT_RETENTION_FLOOR_DAYS2 = 7;
var smsCodeCounts2 = authSchema2.table("sms_code_counts", {
  id: primaryKey(),
  ...tenantColumns(),
  day: date("day", { mode: "string" }).notNull(),
  prefix: text26("prefix").notNull(),
  sent: integer8("sent").notNull().default(0),
  used: integer8("used").notNull().default(0),
  ...timestamps()
}, (t) => [
  unique17("sms_code_counts_environment_day_prefix_key").on(t.environmentId, t.day, t.prefix),
  check10("sms_code_counts_prefix_shape", sql14`${t.prefix} ~ '^\\+[0-9]{1,4}$'`),
  check10("sms_code_counts_bounds", sql14`${t.sent} >= 0 and ${t.used} >= 0 and ${t.used} <= ${t.sent}`),
  ...tenantConstraints("sms_code_counts", t),
  pgPolicy5("sms_code_counts_retention_floor", {
    as: "restrictive",
    for: "delete",
    using: sql14.raw(`day < (now() at time zone 'utc')::date - ${SMS_COUNT_RETENTION_FLOOR_DAYS2}`)
  })
]);
// src/schema/auth/user-factors.ts
import { bigint as bigint2, index as index20, text as text27, timestamp as timestamp20, unique as unique18, uuid as uuid19 } from "drizzle-orm/pg-core";
var USER_FACTOR_TYPES2 = ["totp"];
var userFactors2 = authSchema2.table("user_factors", {
  id: primaryKey(),
  ...tenantColumns(),
  userId: uuid19("user_id").notNull(),
  type: text27("type", { enum: USER_FACTOR_TYPES2 }).notNull(),
  secret: text27("secret").notNull(),
  name: text27("name"),
  confirmedAt: timestamp20("confirmed_at", { withTimezone: true }),
  expiresAt: timestamp20("expires_at", { withTimezone: true }),
  lastUsedStep: bigint2("last_used_step", { mode: "number" }),
  ...timestamps()
}, (t) => [
  unique18("user_factors_user_type_key").on(t.userId, t.type),
  index20("user_factors_expires_at_idx").on(t.expiresAt),
  tenantForeignKey("user_factors_user_fk", t, t.userId, users2),
  ...tenantConstraints("user_factors", t)
]);
// src/schema/auth/verification-tokens.ts
import { index as index21, integer as integer9, text as text28, timestamp as timestamp21, unique as unique19, uuid as uuid20 } from "drizzle-orm/pg-core";
var VERIFICATION_PURPOSES2 = [
  "email_verification",
  "password_reset",
  "sign_in",
  "step_up",
  "phone_verification",
  "sms_sign_in",
  "sms_factor_enrolment",
  "sms_second_factor",
  "sms_step_up"
];
var verificationTokens2 = authSchema2.table("verification_tokens", {
  id: primaryKey(),
  ...tenantColumns(),
  userId: uuid20("user_id"),
  flowAttemptId: uuid20("flow_attempt_id"),
  purpose: text28("purpose", { enum: VERIFICATION_PURPOSES2 }).notNull(),
  destination: text28("destination").notNull(),
  codeHash: text28("code_hash").notNull(),
  linkTokenHash: text28("link_token_hash"),
  attempts: integer9("attempts").notNull().default(0),
  maxAttempts: integer9("max_attempts").notNull().default(5),
  expiresAt: timestamp21("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp21("consumed_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  unique19("verification_tokens_link_token_hash_key").on(t.linkTokenHash),
  index21("verification_tokens_flow_attempt_id_idx").on(t.flowAttemptId),
  tenantForeignKey("verification_tokens_user_fk", t, t.userId, users2),
  tenantForeignKey("verification_tokens_flow_attempt_fk", t, t.flowAttemptId, flowAttempts2),
  ...tenantConstraints("verification_tokens", t)
]);
// src/schema/auth/webhook-deliveries.ts
import { sql as sql16 } from "drizzle-orm";
import {
  boolean as boolean5,
  index as index22,
  integer as integer10,
  pgPolicy as pgPolicy6,
  text as text30,
  timestamp as timestamp23,
  unique as unique20,
  uuid as uuid21
} from "drizzle-orm/pg-core";

// src/schema/auth/webhook-endpoints.ts
import { sql as sql15 } from "drizzle-orm";
import { boolean as boolean4, check as check11, text as text29, timestamp as timestamp22 } from "drizzle-orm/pg-core";
var webhookEndpoints2 = authSchema2.table("webhook_endpoints", {
  id: primaryKey(),
  ...tenantColumns(),
  url: text29("url").notNull(),
  eventTypes: text29("event_types").array().notNull(),
  secret: text29("secret").notNull(),
  previousSecret: text29("previous_secret"),
  previousSecretExpiresAt: timestamp22("previous_secret_expires_at", { withTimezone: true }),
  enabled: boolean4("enabled").notNull().default(true),
  disabledReason: text29("disabled_reason", { enum: ["failing", "gone"] }),
  failingSince: timestamp22("failing_since", { withTimezone: true }),
  lastFailedAt: timestamp22("last_failed_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  tenantParentKey("webhook_endpoints", t),
  check11("webhook_endpoints_previous_secret_whole", sql15`(${t.previousSecret} is null) = (${t.previousSecretExpiresAt} is null)`),
  ...tenantConstraints("webhook_endpoints", t)
]);

// src/schema/auth/webhook-deliveries.ts
var WEBHOOK_DELIVERY_STATES2 = ["pending", "delivered", "failed"];
var WEBHOOK_DELIVERY_RETENTION_FLOOR2 = "7 days";
var webhookDeliveries2 = authSchema2.table("webhook_deliveries", {
  id: primaryKey(),
  ...tenantColumns(),
  endpointId: uuid21("endpoint_id").notNull(),
  eventId: uuid21("event_id"),
  eventType: text30("event_type").notNull(),
  test: boolean5("test").notNull().default(false),
  state: text30("state", { enum: WEBHOOK_DELIVERY_STATES2 }).notNull(),
  attempts: integer10("attempts").notNull().default(0),
  nextAttemptAt: timestamp23("next_attempt_at", { withTimezone: true }),
  lastAttemptAt: timestamp23("last_attempt_at", { withTimezone: true }),
  statusCode: integer10("status_code"),
  failureReason: text30("failure_reason"),
  completedAt: timestamp23("completed_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  unique20("webhook_deliveries_endpoint_event_key").on(t.endpointId, t.eventId),
  index22("webhook_deliveries_event_idx").on(t.environmentId, t.eventId),
  index22("webhook_deliveries_due_idx").on(t.environmentId, t.endpointId, t.nextAttemptAt).where(sql16`state = 'pending'`),
  index22("webhook_deliveries_pending_age_idx").on(t.environmentId, t.createdAt).where(sql16`state = 'pending'`),
  index22("webhook_deliveries_endpoint_log_idx").on(t.environmentId, t.endpointId, t.createdAt),
  index22("webhook_deliveries_environment_created_idx").on(t.environmentId, t.createdAt),
  tenantParentKey("webhook_deliveries", t),
  tenantForeignKey("webhook_deliveries_endpoint_fk", t, t.endpointId, webhookEndpoints2),
  ...tenantConstraints("webhook_deliveries", t),
  pgPolicy6("webhook_deliveries_retention_floor", {
    as: "restrictive",
    for: "delete",
    using: sql16.raw(`state <> 'pending' and created_at < now() - interval '${WEBHOOK_DELIVERY_RETENTION_FLOOR2}'`)
  })
]);
// src/schema/auth/webhook-delivery-attempts.ts
import { integer as integer11, text as text31, timestamp as timestamp24, unique as unique21, uuid as uuid22 } from "drizzle-orm/pg-core";
var webhookDeliveryAttempts2 = authSchema2.table("webhook_delivery_attempts", {
  id: primaryKey(),
  ...tenantColumns(),
  deliveryId: uuid22("delivery_id").notNull(),
  attempt: integer11("attempt").notNull(),
  attemptedAt: timestamp24("attempted_at", { withTimezone: true }).notNull(),
  statusCode: integer11("status_code"),
  durationMs: integer11("duration_ms").notNull(),
  failureReason: text31("failure_reason")
}, (t) => [
  unique21("webhook_delivery_attempts_delivery_attempt_key").on(t.deliveryId, t.attempt),
  tenantForeignKey("webhook_delivery_attempts_delivery_fk", t, t.deliveryId, webhookDeliveries2),
  ...tenantConstraints("webhook_delivery_attempts", t)
]);
// src/schema/core.ts
import { pgSchema as pgSchema2 } from "drizzle-orm/pg-core";
var coreSchema2 = pgSchema2("core");
// src/schema/core-tables.ts
import { sql as sql17 } from "drizzle-orm";
import {
  check as check12,
  customType as customType3,
  foreignKey as foreignKey4,
  index as index23,
  integer as integer12,
  jsonb as jsonb10,
  primaryKey as primaryKey3,
  smallint,
  text as text32,
  timestamp as timestamp25,
  unique as unique22,
  uniqueIndex as uniqueIndex2
} from "drizzle-orm/pg-core";
var MEMBERSHIP_ROLES2 = ["owner", "admin", "manager", "rep"];
var INVITATION_ROLES2 = ["admin", "manager", "rep"];
var ORGANIZATION_REGIONS2 = ["us", "eu"];
var ORGANIZATION_STATUSES2 = ["active", "suspended", "deleted"];
var INVITATION_STATES2 = ["pending", "accepted", "revoked"];
var MEMBER_NAME_MAX2 = 201;
var IDEMPOTENCY_ROUTE_MAX2 = 64;
var IDEMPOTENCY_KEY_MAX2 = 255;
var IDEMPOTENCY_HASH_BYTES2 = 32;
var IDEMPOTENCY_RESPONSE_MAX_BYTES2 = 16384;
var bytes3 = customType3({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var list = (values) => sql17.raw(values.map((v) => `'${v}'`).join(", "));
var idShape = (column, prefix) => sql17.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var createdAt = () => timestamp25("created_at", { withTimezone: true }).notNull().defaultNow();
var updatedAt = () => timestamp25("updated_at", { withTimezone: true }).notNull().defaultNow();
var organizations2 = coreSchema2.table("organizations", {
  organizationId: text32("organization_id").primaryKey(),
  name: text32("name").notNull(),
  region: text32("region", { enum: ORGANIZATION_REGIONS2 }).notNull(),
  status: text32("status", { enum: ORGANIZATION_STATUSES2 }).notNull().default("active"),
  ownerCount: integer12("owner_count").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  check12("organizations_id_shape", idShape("organization_id", "org")),
  check12("organizations_name_shape", sql17`char_length(btrim(${t.name})) between 1 and 200`),
  check12("organizations_region_known", sql17`${t.region} in (${list(ORGANIZATION_REGIONS2)})`),
  check12("organizations_status_known", sql17`${t.status} in (${list(ORGANIZATION_STATUSES2)})`),
  check12("organizations_owner_count_not_negative", sql17`${t.ownerCount} >= 0`)
]);
var memberships2 = coreSchema2.table("memberships", {
  id: text32("id").primaryKey(),
  organizationId: text32("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  userId: text32("user_id").notNull(),
  role: text32("role", { enum: MEMBERSHIP_ROLES2 }).notNull(),
  email: text32("email").notNull(),
  name: text32("name"),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  check12("memberships_id_shape", idShape("id", "mem")),
  check12("memberships_organization_id_shape", idShape("organization_id", "org")),
  check12("memberships_user_id_shape", idShape("user_id", "usr")),
  check12("memberships_role_known", sql17`${t.role} in (${list(MEMBERSHIP_ROLES2)})`),
  check12("memberships_email_shape", sql17`${t.email} = lower(${t.email} collate "C")
        and char_length(${t.email}) between 3 and 320
        and char_length(${t.email}) - char_length(replace(${t.email}, '@', '')) = 1
        and position('@' in ${t.email}) between 2 and char_length(${t.email}) - 1
        and ${t.email} collate "C" !~ '[[:space:][:cntrl:]]'
        and ${t.email} collate "C" ~ '^[!-~]+$'`),
  check12("memberships_name_shape", sql17`${t.name} is null or char_length(btrim(${t.name})) between 1 and ${sql17.raw(String(MEMBER_NAME_MAX2))}`),
  unique22("memberships_organization_user_key").on(t.organizationId, t.userId),
  unique22("memberships_organization_id_id_key").on(t.organizationId, t.id),
  index23("memberships_organization_email_idx").on(t.organizationId, t.email)
]);
var teams2 = coreSchema2.table("teams", {
  id: text32("id").primaryKey(),
  organizationId: text32("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  name: text32("name").notNull(),
  nameKey: text32("name_key").generatedAlwaysAs(() => sql17`lower(name collate "C")`),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  check12("teams_id_shape", idShape("id", "team")),
  check12("teams_organization_id_shape", idShape("organization_id", "org")),
  check12("teams_name_shape", sql17`char_length(btrim(${t.name})) between 1 and 200`),
  unique22("teams_organization_id_id_key").on(t.organizationId, t.id),
  unique22("teams_organization_name_key").on(t.organizationId, t.nameKey)
]);
var teamMembers2 = coreSchema2.table("team_members", {
  organizationId: text32("organization_id").notNull(),
  teamId: text32("team_id").notNull(),
  membershipId: text32("membership_id").notNull(),
  createdAt: createdAt()
}, (t) => [
  primaryKey3({
    name: "team_members_pkey",
    columns: [t.organizationId, t.teamId, t.membershipId]
  }),
  check12("team_members_organization_id_shape", idShape("organization_id", "org")),
  foreignKey4({
    name: "team_members_team_fk",
    columns: [t.organizationId, t.teamId],
    foreignColumns: [teams2.organizationId, teams2.id]
  }).onDelete("cascade"),
  foreignKey4({
    name: "team_members_membership_fk",
    columns: [t.organizationId, t.membershipId],
    foreignColumns: [memberships2.organizationId, memberships2.id]
  }).onDelete("cascade"),
  index23("team_members_membership_idx").on(t.organizationId, t.membershipId, t.teamId)
]);
var invitations2 = coreSchema2.table("invitations", {
  id: text32("id").primaryKey(),
  organizationId: text32("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  email: text32("email").notNull(),
  role: text32("role", { enum: INVITATION_ROLES2 }).notNull(),
  teamId: text32("team_id"),
  invitedByUserId: text32("invited_by_user_id").notNull(),
  tokenHash: text32("token_hash").notNull(),
  state: text32("state", { enum: INVITATION_STATES2 }).notNull().default("pending"),
  expiresAt: timestamp25("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp25("accepted_at", { withTimezone: true }),
  revokedAt: timestamp25("revoked_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  check12("invitations_id_shape", idShape("id", "inv")),
  check12("invitations_organization_id_shape", idShape("organization_id", "org")),
  check12("invitations_invited_by_shape", idShape("invited_by_user_id", "usr")),
  check12("invitations_team_id_shape", sql17`${t.teamId} is null or "team_id" ~ '^team_[0-9a-f]{32}$'`),
  check12("invitations_email_shape", sql17`${t.email} = lower(${t.email} collate "C")
        and char_length(${t.email}) between 3 and 320
        and char_length(${t.email}) - char_length(replace(${t.email}, '@', '')) = 1
        and position('@' in ${t.email}) between 2 and char_length(${t.email}) - 1
        and ${t.email} collate "C" !~ '[[:space:][:cntrl:]]'
        and ${t.email} collate "C" ~ '^[!-~]+$'`),
  check12("invitations_role_known", sql17`${t.role} in (${list(MEMBERSHIP_ROLES2)})`),
  check12("invitations_role_not_owner", sql17`${t.role} <> 'owner'`),
  check12("invitations_state_known", sql17`${t.state} in (${list(INVITATION_STATES2)})`),
  check12("invitations_token_hash_shape", sql17`${t.tokenHash} ~ '^[0-9a-f]{64}$'`),
  check12("invitations_expiry_after_creation", sql17`${t.expiresAt} > ${t.createdAt}`),
  check12("invitations_state_shape", sql17`(${t.state} = 'pending' and ${t.acceptedAt} is null and ${t.revokedAt} is null)
        or (${t.state} = 'accepted' and ${t.acceptedAt} is not null and ${t.revokedAt} is null)
        or (${t.state} = 'revoked' and ${t.revokedAt} is not null and ${t.acceptedAt} is null)`),
  unique22("invitations_organization_id_id_key").on(t.organizationId, t.id),
  unique22("invitations_token_hash_key").on(t.tokenHash),
  foreignKey4({
    name: "invitations_team_fk",
    columns: [t.organizationId, t.teamId],
    foreignColumns: [teams2.organizationId, teams2.id]
  }),
  uniqueIndex2("invitations_pending_email_key").on(t.organizationId, t.email).where(sql17`${t.state} = 'pending'`),
  index23("invitations_pending_list_idx").on(t.organizationId, t.createdAt, t.id).where(sql17`${t.state} = 'pending'`),
  index23("invitations_state_list_idx").on(t.organizationId, t.state, t.createdAt, t.id),
  index23("invitations_team_idx").on(t.organizationId, t.teamId).where(sql17`${t.teamId} is not null`)
]);
var membershipDirectory2 = coreSchema2.table("membership_directory", {
  userId: text32("user_id").notNull(),
  organizationId: text32("organization_id").notNull()
}, (t) => [
  primaryKey3({ name: "membership_directory_pkey", columns: [t.userId, t.organizationId] }),
  check12("membership_directory_user_id_shape", idShape("user_id", "usr")),
  check12("membership_directory_organization_id_shape", idShape("organization_id", "org")),
  unique22("membership_directory_one_organization_per_user").on(t.userId)
]);
var invitationDirectory2 = coreSchema2.table("invitation_directory", {
  tokenHash: text32("token_hash").primaryKey(),
  organizationId: text32("organization_id").notNull(),
  invitationId: text32("invitation_id").notNull(),
  expiresAt: timestamp25("expires_at", { withTimezone: true }).notNull()
}, () => [
  check12("invitation_directory_token_hash_shape", sql17`"token_hash" ~ '^[0-9a-f]{64}$'`),
  check12("invitation_directory_organization_id_shape", idShape("organization_id", "org")),
  check12("invitation_directory_invitation_id_shape", idShape("invitation_id", "inv"))
]);
var organizationState2 = coreSchema2.table("organization_state", {
  organizationId: text32("organization_id").primaryKey().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  status: text32("status", { enum: ORGANIZATION_STATUSES2 }).notNull()
}, (t) => [
  check12("organization_state_organization_id_shape", idShape("organization_id", "org")),
  check12("organization_state_status_known", sql17`${t.status} in (${list(ORGANIZATION_STATUSES2)})`)
]);
var idempotencyKeys2 = coreSchema2.table("idempotency_keys", {
  organizationId: text32("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  userId: text32("user_id").notNull(),
  route: text32("route").notNull(),
  key: text32("key").notNull(),
  requestHash: bytes3("request_hash").notNull(),
  status: smallint("status"),
  response: jsonb10("response").$type(),
  createdAt: createdAt()
}, (t) => [
  primaryKey3({
    name: "idempotency_keys_pkey",
    columns: [t.organizationId, t.userId, t.route, t.key]
  }),
  check12("idempotency_keys_organization_id_shape", idShape("organization_id", "org")),
  check12("idempotency_keys_user_id_shape", idShape("user_id", "usr")),
  check12("idempotency_keys_route_shape", sql17`char_length(${t.route}) between 1 and ${sql17.raw(String(IDEMPOTENCY_ROUTE_MAX2))}
        and ${t.route} collate "C" ~ '^[a-z0-9._]+$'`),
  check12("idempotency_keys_key_shape", sql17`char_length(${t.key}) between 1 and ${sql17.raw(String(IDEMPOTENCY_KEY_MAX2))}
        and ${t.key} collate "C" ~ '^[!-~]+$'`),
  check12("idempotency_keys_request_hash_length", sql17`octet_length(${t.requestHash}) = ${sql17.raw(String(IDEMPOTENCY_HASH_BYTES2))}`),
  check12("idempotency_keys_status_range", sql17`${t.status} between 100 and 599`),
  check12("idempotency_keys_response_matches_status", sql17`(${t.status} is null) = (${t.response} is null)`),
  check12("idempotency_keys_response_size", sql17`octet_length(${t.response}::text) <= ${sql17.raw(String(IDEMPOTENCY_RESPONSE_MAX_BYTES2))}`),
  index23("idempotency_keys_purge_idx").on(t.organizationId, t.createdAt)
]);
// src/schema/playbook.ts
import { pgSchema as pgSchema3 } from "drizzle-orm/pg-core";
var playbookSchema2 = pgSchema3("playbook");
// src/schema/playbook-consumed.ts
import { sql as sql19 } from "drizzle-orm";
import { check as check14, index as index25, primaryKey as primaryKey5, text as text34, timestamp as timestamp27, uuid as uuid24 } from "drizzle-orm/pg-core";

// src/schema/playbook-tables.ts
import { sql as sql18 } from "drizzle-orm";
import {
  bigint as bigint3,
  check as check13,
  customType as customType4,
  foreignKey as foreignKey5,
  index as index24,
  integer as integer13,
  primaryKey as primaryKey4,
  text as text33,
  timestamp as timestamp26,
  uniqueIndex as uniqueIndex3,
  uuid as uuid23
} from "drizzle-orm/pg-core";
var DOCUMENT_STATES2 = ["uploaded", "processing", "ready", "failed", "deleted"];
var DOCUMENT_FAILURE_REASONS2 = [
  "too_many_pages",
  "unreadable",
  "password_protected",
  "no_text",
  "processing_failed"
];
var DOCUMENT_FILE_TYPES2 = ["pdf", "docx", "pptx", "txt", "md"];
var DOCUMENT_MAX_BYTES2 = 26214400;
var DOCUMENT_MAX_PAGE_COUNT2 = 1e5;
var DOCUMENT_PURGE_MAX_ATTEMPTS2 = 20;
var INGESTION_JOB_STATES2 = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled"
];
var INGESTION_STEPS2 = ["parse", "chunk", "embed", "index"];
var INGESTION_JOB_MAX_ATTEMPTS2 = 20;
var INGESTION_MAX_CHUNKS2 = 1e6;
var CONSUMED_MESSAGE_STATES2 = ["claimed", "done"];
var bytes4 = customType4({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var list2 = (values) => sql18.raw(values.map((v) => `'${v}'`).join(", "));
var idShape2 = (column, prefix) => sql18.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var GLOBAL_SCOPE_ORGANIZATION_ID2 = "org_00000000000000000000000000000000";
var notGlobal = sql18.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`);
var ts = (name) => timestamp26(name, { withTimezone: true });
var createdAt2 = () => ts("created_at").notNull().defaultNow();
var updatedAt2 = () => ts("updated_at").notNull().defaultNow();
var PENDING_CLEANUP_PREDICATE2 = "state = 'deleted' and (vectors_removed_seq is null or vectors_removed_seq < deletion_seq)";
var documents2 = playbookSchema2.table("documents", {
  id: text33("id").notNull(),
  organizationId: text33("organization_id").notNull(),
  name: text33("name").notNull(),
  state: text33("state", { enum: DOCUMENT_STATES2 }).notNull().default("uploaded"),
  contentHash: bytes4("content_hash").notNull(),
  sizeBytes: bigint3("size_bytes", { mode: "number" }).notNull(),
  declaredType: text33("declared_type").notNull(),
  detectedType: text33("detected_type", { enum: DOCUMENT_FILE_TYPES2 }).notNull(),
  uploadedBy: text33("uploaded_by").notNull(),
  objectKey: text33("object_key").notNull(),
  failureReason: text33("failure_reason", { enum: DOCUMENT_FAILURE_REASONS2 }),
  pageCount: integer13("page_count"),
  epoch: integer13("epoch").notNull().default(0),
  deletionSeq: integer13("deletion_seq").notNull().default(0),
  vectorsRemovedSeq: integer13("vectors_removed_seq"),
  deletedAt: ts("deleted_at"),
  deletedBy: text33("deleted_by"),
  purgeDueAt: ts("purge_due_at"),
  purgeStartedAt: ts("purge_started_at"),
  purgeLeaseUntil: ts("purge_lease_until"),
  purgeAttempts: integer13("purge_attempts").notNull().default(0),
  restoreBarredAt: ts("restore_barred_at"),
  createdAt: createdAt2(),
  updatedAt: updatedAt2()
}, (t) => [
  primaryKey4({ name: "documents_pkey", columns: [t.organizationId, t.id] }),
  check13("documents_id_shape", idShape2("id", "doc")),
  check13("documents_organization_id_shape", idShape2("organization_id", "org")),
  check13("documents_organization_not_global", notGlobal),
  check13("documents_uploaded_by_shape", idShape2("uploaded_by", "usr")),
  check13("documents_deleted_by_shape", sql18`${t.deletedBy} ~ '^usr_[0-9a-f]{32}$'`),
  check13("documents_name_shape", sql18`char_length(btrim(${t.name})) between 1 and 255`),
  check13("documents_state_known", sql18`${t.state} in (${list2(DOCUMENT_STATES2)})`),
  check13("documents_content_hash_length", sql18`octet_length(${t.contentHash}) = 32`),
  check13("documents_size_bounds", sql18`${t.sizeBytes} between 1 and ${sql18.raw(String(DOCUMENT_MAX_BYTES2))}`),
  check13("documents_declared_type_shape", sql18`char_length(${t.declaredType}) between 1 and 255 and ${t.declaredType} collate "C" ~ '^[ -~]+$'`),
  check13("documents_detected_type_known", sql18`${t.detectedType} in (${list2(DOCUMENT_FILE_TYPES2)})`),
  check13("documents_object_key_shape", sql18`char_length(${t.objectKey}) between 1 and 1024 and ${t.objectKey} collate "C" ~ '^[!-~]+$'`),
  check13("documents_failure_reason_known", sql18`${t.failureReason} in (${list2(DOCUMENT_FAILURE_REASONS2)})`),
  check13("documents_failed_has_reason", sql18`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check13("documents_page_count_positive", sql18`${t.pageCount} > 0`),
  check13("documents_epoch_bounds", sql18`${t.epoch} >= 0 and ${t.deletionSeq} >= 0`),
  check13("documents_vectors_removed_seq_bounds", sql18`${t.vectorsRemovedSeq} between 0 and ${t.deletionSeq}`),
  check13("documents_deleted_has_times", sql18`(${t.state} = 'deleted') = (${t.deletedAt} is not null)
        and (${t.state} = 'deleted') = (${t.purgeDueAt} is not null)`),
  check13("documents_deleted_by_when_deleted", sql18`${t.state} = 'deleted' or ${t.deletedBy} is null`),
  check13("documents_deleted_is_counted", sql18`(${t.state} <> 'deleted') or ${t.deletionSeq} >= 1`),
  check13("documents_purge_due_after_delete", sql18`${t.purgeDueAt} >= ${t.deletedAt}`),
  check13("documents_purge_only_when_deleted", sql18`(${t.purgeStartedAt} is null or ${t.state} = 'deleted')
        and (${t.purgeStartedAt} is null) = (${t.purgeLeaseUntil} is null)
        and (${t.purgeStartedAt} is null) = (${t.purgeAttempts} = 0)`),
  check13("documents_purge_attempts_bounds", sql18`${t.purgeAttempts} between 0 and ${sql18.raw(String(DOCUMENT_PURGE_MAX_ATTEMPTS2))}`),
  check13("documents_barred_only_when_deleted", sql18`${t.restoreBarredAt} is null or ${t.state} = 'deleted'`),
  uniqueIndex3("documents_content_hash_key").on(t.organizationId, t.contentHash).where(sql18`${t.purgeStartedAt} is null and ${t.restoreBarredAt} is null`),
  index24("documents_list_idx").on(t.organizationId, t.createdAt, t.id).where(sql18`${t.state} <> 'deleted'`),
  index24("documents_state_list_idx").on(t.organizationId, t.state, t.createdAt, t.id).where(sql18`${t.state} <> 'deleted'`),
  index24("documents_deleted_list_idx").on(t.organizationId, t.createdAt, t.id).where(sql18`${t.state} = 'deleted'`),
  index24("documents_purge_idx").on(t.organizationId, t.purgeDueAt, t.id).where(sql18`${t.state} = 'deleted' and ${t.purgeAttempts} < ${sql18.raw(String(DOCUMENT_PURGE_MAX_ATTEMPTS2))}`),
  index24("documents_unbarred_idx").on(t.organizationId, t.id).where(sql18`${t.restoreBarredAt} is null`),
  index24("documents_cleanup_idx").on(t.organizationId, t.deletedAt, t.id).where(sql18.raw(PENDING_CLEANUP_PREDICATE2)),
  index24("documents_spent_purge_idx").on(t.organizationId, t.id).where(sql18`${t.state} = 'deleted' and ${t.purgeAttempts} >= ${sql18.raw(String(DOCUMENT_PURGE_MAX_ATTEMPTS2))}`)
]);
var organizationUsage2 = playbookSchema2.table("organization_usage", {
  organizationId: text33("organization_id").primaryKey(),
  documentCount: bigint3("document_count", { mode: "number" }).notNull().default(0),
  byteCount: bigint3("byte_count", { mode: "number" }).notNull().default(0),
  updatedAt: updatedAt2()
}, (t) => [
  check13("organization_usage_organization_id_shape", idShape2("organization_id", "org")),
  check13("organization_usage_organization_not_global", notGlobal),
  check13("organization_usage_not_negative", sql18`${t.documentCount} >= 0 and ${t.byteCount} >= 0`)
]);
var ingestionJobs2 = playbookSchema2.table("ingestion_jobs", {
  id: text33("id").notNull(),
  organizationId: text33("organization_id").notNull(),
  documentId: text33("document_id").notNull(),
  epoch: integer13("epoch").notNull(),
  state: text33("state", { enum: INGESTION_JOB_STATES2 }).notNull().default("queued"),
  step: text33("step", { enum: INGESTION_STEPS2 }).notNull().default("parse"),
  attempts: integer13("attempts").notNull().default(0),
  nextAttemptAt: ts("next_attempt_at").notNull(),
  claimToken: uuid23("claim_token"),
  artifactKey: text33("artifact_key"),
  pageCount: integer13("page_count"),
  chunkCount: integer13("chunk_count"),
  chunksDone: integer13("chunks_done").notNull().default(0),
  failureReason: text33("failure_reason", { enum: DOCUMENT_FAILURE_REASONS2 }),
  finishedAt: ts("finished_at"),
  createdAt: createdAt2(),
  updatedAt: updatedAt2()
}, (t) => [
  primaryKey4({ name: "ingestion_jobs_pkey", columns: [t.organizationId, t.id] }),
  foreignKey5({
    name: "ingestion_jobs_document_fk",
    columns: [t.organizationId, t.documentId],
    foreignColumns: [documents2.organizationId, documents2.id]
  }).onDelete("cascade"),
  check13("ingestion_jobs_id_shape", idShape2("id", "job")),
  check13("ingestion_jobs_organization_id_shape", idShape2("organization_id", "org")),
  check13("ingestion_jobs_organization_not_global", notGlobal),
  check13("ingestion_jobs_epoch_bounds", sql18`${t.epoch} >= 0`),
  check13("ingestion_jobs_state_known", sql18`${t.state} in (${list2(INGESTION_JOB_STATES2)})`),
  check13("ingestion_jobs_step_known", sql18`${t.step} in (${list2(INGESTION_STEPS2)})`),
  check13("ingestion_jobs_attempts_bounds", sql18`${t.attempts} between 0 and ${sql18.raw(String(INGESTION_JOB_MAX_ATTEMPTS2))}`),
  check13("ingestion_jobs_running_has_token", sql18`(${t.state} = 'running') = (${t.claimToken} is not null)`),
  check13("ingestion_jobs_artifact_key_shape", sql18`char_length(${t.artifactKey}) between 1 and 1024 and ${t.artifactKey} collate "C" ~ '^[!-~]+$'`),
  check13("ingestion_jobs_counts_bounds", sql18`${t.pageCount} between 1 and ${sql18.raw(String(DOCUMENT_MAX_PAGE_COUNT2))}
        and ${t.chunkCount} between 0 and ${sql18.raw(String(INGESTION_MAX_CHUNKS2))}
        and ${t.chunksDone} >= 0 and ${t.chunksDone} <= coalesce(${t.chunkCount}, 0)`),
  check13("ingestion_jobs_failure_reason_known", sql18`${t.failureReason} in (${list2(DOCUMENT_FAILURE_REASONS2)})`),
  check13("ingestion_jobs_failed_has_reason", sql18`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check13("ingestion_jobs_final_has_finish", sql18`(${t.state} in ('succeeded', 'failed', 'cancelled')) = (${t.finishedAt} is not null)`),
  index24("ingestion_jobs_document_idx").on(t.organizationId, t.documentId),
  uniqueIndex3("ingestion_jobs_active_document_key").on(t.organizationId, t.documentId).where(sql18`${t.state} in ('queued', 'running')`),
  index24("ingestion_jobs_due_idx").on(t.organizationId, t.nextAttemptAt).where(sql18`${t.state} in ('queued', 'running')`)
]);
var indexSettings2 = playbookSchema2.table("index_settings", {
  organizationId: text33("organization_id").primaryKey(),
  embeddingModel: text33("embedding_model").notNull(),
  embeddingDimension: integer13("embedding_dimension").notNull(),
  vectorsWrittenAt: ts("vectors_written_at"),
  createdAt: createdAt2(),
  updatedAt: updatedAt2()
}, (t) => [
  check13("index_settings_organization_id_shape", idShape2("organization_id", "org")),
  check13("index_settings_organization_not_global", notGlobal),
  check13("index_settings_model_shape", sql18`char_length(${t.embeddingModel}) between 1 and 200 and ${t.embeddingModel} collate "C" ~ '^[A-Za-z0-9._:/-]+$'`),
  check13("index_settings_dimension_bounds", sql18`${t.embeddingDimension} between 1 and 16384`)
]);

// src/schema/playbook-consumed.ts
var list3 = (values) => sql19.raw(values.map((v) => `'${v}'`).join(", "));
var idShape3 = (column, prefix) => sql19.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var ts2 = (name) => timestamp27(name, { withTimezone: true });
var consumedMessage2 = playbookSchema2.table("consumed_message", {
  consumer: text34("consumer").notNull(),
  organizationId: text34("organization_id").notNull(),
  messageId: text34("message_id").notNull(),
  state: text34("state", { enum: CONSUMED_MESSAGE_STATES2 }).notNull(),
  claimToken: uuid24("claim_token").notNull(),
  leaseExpiresAt: ts2("lease_expires_at"),
  completedAt: ts2("completed_at")
}, (t) => [
  primaryKey5({
    name: "consumed_message_pkey",
    columns: [t.consumer, t.organizationId, t.messageId]
  }),
  check14("consumed_message_organization_id_shape", idShape3("organization_id", "org")),
  check14("consumed_message_consumer_shape", sql19`char_length(${t.consumer}) between 1 and 128 and ${t.consumer} collate "C" ~ '^[A-Za-z0-9_.:-]+$'`),
  check14("consumed_message_message_id_shape", sql19`char_length(${t.messageId}) between 1 and 128 and ${t.messageId} collate "C" ~ '^[A-Za-z0-9_.:-]+$'`),
  check14("consumed_message_state_known", sql19`${t.state} in (${list3(CONSUMED_MESSAGE_STATES2)})`),
  check14("consumed_message_state_columns", sql19`(${t.state} = 'claimed' and ${t.leaseExpiresAt} is not null and ${t.completedAt} is null)
        or (${t.state} = 'done' and ${t.leaseExpiresAt} is null and ${t.completedAt} is not null)`),
  index25("consumed_message_done_idx").on(t.organizationId, t.completedAt).where(sql19`${t.state} = 'done'`),
  index25("consumed_message_lease_idx").on(t.organizationId, t.leaseExpiresAt).where(sql19`${t.state} = 'claimed'`)
]);
// src/schema/playbook-idempotency.ts
import { sql as sql20 } from "drizzle-orm";
import {
  check as check15,
  customType as customType5,
  index as index26,
  jsonb as jsonb11,
  primaryKey as primaryKey6,
  smallint as smallint2,
  text as text35,
  timestamp as timestamp28
} from "drizzle-orm/pg-core";
var idShape4 = (column, prefix) => sql20.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var bytes5 = customType5({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var INTERNAL_CALL_USER_ID2 = "usr_00000000000000000000000000000000";
var playbookIdempotencyKeys2 = playbookSchema2.table("idempotency_keys", {
  organizationId: text35("organization_id").notNull(),
  userId: text35("user_id").notNull(),
  route: text35("route").notNull(),
  key: text35("key").notNull(),
  requestHash: bytes5("request_hash").notNull(),
  status: smallint2("status"),
  response: jsonb11("response").$type(),
  createdAt: timestamp28("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  primaryKey6({
    name: "idempotency_keys_pkey",
    columns: [t.organizationId, t.userId, t.route, t.key]
  }),
  check15("idempotency_keys_organization_id_shape", idShape4("organization_id", "org")),
  check15("idempotency_keys_organization_not_global", sql20.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`)),
  check15("idempotency_keys_user_id_shape", idShape4("user_id", "usr")),
  check15("idempotency_keys_route_shape", sql20`char_length(${t.route}) between 1 and ${sql20.raw(String(IDEMPOTENCY_ROUTE_MAX2))}
        and ${t.route} collate "C" ~ '^[a-z0-9._]+$'`),
  check15("idempotency_keys_key_shape", sql20`char_length(${t.key}) between 1 and ${sql20.raw(String(IDEMPOTENCY_KEY_MAX2))}
        and ${t.key} collate "C" ~ '^[!-~]+$'`),
  check15("idempotency_keys_request_hash_length", sql20`octet_length(${t.requestHash}) = ${sql20.raw(String(IDEMPOTENCY_HASH_BYTES2))}`),
  check15("idempotency_keys_status_range", sql20`${t.status} between 100 and 599`),
  check15("idempotency_keys_response_matches_status", sql20`(${t.status} is null) = (${t.response} is null)`),
  check15("idempotency_keys_response_size", sql20`octet_length(${t.response}::text) <= ${sql20.raw(String(IDEMPOTENCY_RESPONSE_MAX_BYTES2))}`),
  index26("idempotency_keys_purge_idx").on(t.organizationId, t.createdAt)
]);
// src/schema/playbook-orphan-sweeps.ts
import { sql as sql21 } from "drizzle-orm";
import { check as check16, text as text36, timestamp as timestamp29 } from "drizzle-orm/pg-core";
var playbookOrphanSweeps2 = playbookSchema2.table("orphan_sweeps", {
  organizationId: text36("organization_id").primaryKey(),
  sweptThrough: timestamp29("swept_through", { withTimezone: true }).notNull(),
  erasedAttemptAt: timestamp29("erased_attempt_at", { withTimezone: true })
}, () => [
  check16("orphan_sweeps_organization_id_shape", sql21.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)),
  check16("orphan_sweeps_organization_not_global", sql21.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`))
]);
// src/schema/playbook-work-hints.ts
import { sql as sql22 } from "drizzle-orm";
import { check as check17, index as index27, primaryKey as primaryKey7, text as text37, timestamp as timestamp30 } from "drizzle-orm/pg-core";
var WORK_KINDS2 = [
  "purge_due",
  "jobs_due",
  "cleanup_pending",
  "consumed_purge",
  "idempotency_purge",
  "purge_spent",
  "orphan_sweep"
];
var playbookWorkHints2 = playbookSchema2.table("work_hints", {
  kind: text37("kind", { enum: WORK_KINDS2 }).notNull(),
  organizationId: text37("organization_id").notNull(),
  dueAt: timestamp30("due_at", { withTimezone: true }).notNull()
}, (t) => [
  primaryKey7({ name: "work_hints_pkey", columns: [t.kind, t.organizationId] }),
  check17("work_hints_kind_known", sql22`${t.kind} in (${sql22.raw(WORK_KINDS2.map((k) => `'${k}'`).join(", "))})`),
  check17("work_hints_organization_id_shape", sql22.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)),
  check17("work_hints_global_only_consumed", sql22`${t.kind} = 'consumed_purge' or ${t.organizationId} <> ${sql22.raw(`'${GLOBAL_SCOPE_ORGANIZATION_ID2}'`)}`),
  index27("work_hints_due_idx").on(t.kind, t.dueAt, t.organizationId)
]);
export { authSchema2, workspaces2, projects2, ENVIRONMENT_KINDS2, environments2, TENANT_SETTING, ABANDON_CASE_MAX_ATTEMPTS2, ABANDON_CASE_OUTCOMES2, abandonCases2, API_KEY_KINDS2, apiKeys2, ATTEMPT_COUNTER_KINDS2, ATTEMPT_COUNTER_MAX_HITS2, ATTEMPT_COUNTER_KEY_HASH_BYTES2, attemptCounters2, AUDIT_ACTOR_TYPES2, AUDIT_RETENTION_FLOOR2, auditLogs2, users2, backupCodes2, CREDENTIAL_TYPES2, credentials2, environmentSettings2, EVENT_RETENTION_FLOOR2, events2, flowAttempts2, hooks2, hookCallCounts2, IDENTITY_PROVIDERS2, identities2, instanceAuditLogs2, nativeApps2, OAUTH_PROVIDERS2, oauthProviders2, PASSKEY_CHALLENGE_PURPOSES2, passkeyChallenges2, passkeys2, passwordHistory2, proposals2, SESSION_CLIENTS2, SESSION_REVOKE_REASONS2, SESSION_TYPES2, sessions2, refreshTokens2, SIGNING_KEY_STATUSES2, signingKeys2, SMS_COUNT_RETENTION_FLOOR_DAYS2, smsCodeCounts2, USER_FACTOR_TYPES2, userFactors2, VERIFICATION_PURPOSES2, verificationTokens2, webhookEndpoints2, WEBHOOK_DELIVERY_STATES2, WEBHOOK_DELIVERY_RETENTION_FLOOR2, webhookDeliveries2, webhookDeliveryAttempts2, coreSchema2, MEMBERSHIP_ROLES2, INVITATION_ROLES2, ORGANIZATION_REGIONS2, ORGANIZATION_STATUSES2, INVITATION_STATES2, MEMBER_NAME_MAX2, IDEMPOTENCY_ROUTE_MAX2, IDEMPOTENCY_KEY_MAX2, IDEMPOTENCY_HASH_BYTES2, IDEMPOTENCY_RESPONSE_MAX_BYTES2, organizations2, memberships2, teams2, teamMembers2, invitations2, membershipDirectory2, invitationDirectory2, organizationState2, idempotencyKeys2, playbookSchema2, DOCUMENT_STATES2, DOCUMENT_FAILURE_REASONS2, DOCUMENT_FILE_TYPES2, DOCUMENT_MAX_BYTES2, DOCUMENT_MAX_PAGE_COUNT2, DOCUMENT_PURGE_MAX_ATTEMPTS2, INGESTION_JOB_STATES2, INGESTION_STEPS2, INGESTION_JOB_MAX_ATTEMPTS2, INGESTION_MAX_CHUNKS2, CONSUMED_MESSAGE_STATES2, GLOBAL_SCOPE_ORGANIZATION_ID2, PENDING_CLEANUP_PREDICATE2, documents2, organizationUsage2, ingestionJobs2, indexSettings2, consumedMessage2, INTERNAL_CALL_USER_ID2, playbookIdempotencyKeys2, playbookOrphanSweeps2, WORK_KINDS2, playbookWorkHints2, exports_schema };
