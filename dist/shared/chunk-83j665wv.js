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
  API_KEY_KINDS: () => API_KEY_KINDS2,
  AUDIT_ACTOR_TYPES: () => AUDIT_ACTOR_TYPES2,
  AUDIT_RETENTION_FLOOR: () => AUDIT_RETENTION_FLOOR2,
  CREDENTIAL_TYPES: () => CREDENTIAL_TYPES2,
  ENVIRONMENT_KINDS: () => ENVIRONMENT_KINDS2,
  EVENT_RETENTION_FLOOR: () => EVENT_RETENTION_FLOOR2,
  IDEMPOTENCY_HASH_BYTES: () => IDEMPOTENCY_HASH_BYTES2,
  IDEMPOTENCY_KEY_MAX: () => IDEMPOTENCY_KEY_MAX2,
  IDEMPOTENCY_RESPONSE_MAX_BYTES: () => IDEMPOTENCY_RESPONSE_MAX_BYTES2,
  IDEMPOTENCY_ROUTE_MAX: () => IDEMPOTENCY_ROUTE_MAX2,
  IDENTITY_PROVIDERS: () => IDENTITY_PROVIDERS2,
  INVITATION_ROLES: () => INVITATION_ROLES2,
  INVITATION_STATES: () => INVITATION_STATES2,
  MEMBERSHIP_ROLES: () => MEMBERSHIP_ROLES2,
  MEMBER_NAME_MAX: () => MEMBER_NAME_MAX2,
  OAUTH_PROVIDERS: () => OAUTH_PROVIDERS2,
  ORGANIZATION_REGIONS: () => ORGANIZATION_REGIONS2,
  ORGANIZATION_STATUSES: () => ORGANIZATION_STATUSES2,
  PASSKEY_CHALLENGE_PURPOSES: () => PASSKEY_CHALLENGE_PURPOSES2,
  SESSION_CLIENTS: () => SESSION_CLIENTS2,
  SESSION_REVOKE_REASONS: () => SESSION_REVOKE_REASONS2,
  SESSION_TYPES: () => SESSION_TYPES2,
  SIGNING_KEY_STATUSES: () => SIGNING_KEY_STATUSES2,
  SMS_COUNT_RETENTION_FLOOR_DAYS: () => SMS_COUNT_RETENTION_FLOOR_DAYS2,
  USER_FACTOR_TYPES: () => USER_FACTOR_TYPES2,
  VERIFICATION_PURPOSES: () => VERIFICATION_PURPOSES2,
  WEBHOOK_DELIVERY_RETENTION_FLOOR: () => WEBHOOK_DELIVERY_RETENTION_FLOOR2,
  WEBHOOK_DELIVERY_STATES: () => WEBHOOK_DELIVERY_STATES2,
  apiKeys: () => apiKeys2,
  auditLogs: () => auditLogs2,
  authSchema: () => authSchema2,
  backupCodes: () => backupCodes2,
  coreSchema: () => coreSchema2,
  credentials: () => credentials2,
  environmentSettings: () => environmentSettings2,
  environments: () => environments2,
  events: () => events2,
  flowAttempts: () => flowAttempts2,
  hookCallCounts: () => hookCallCounts2,
  hooks: () => hooks2,
  idempotencyKeys: () => idempotencyKeys2,
  identities: () => identities2,
  instanceAuditLogs: () => instanceAuditLogs2,
  invitationDirectory: () => invitationDirectory2,
  invitations: () => invitations2,
  membershipDirectory: () => membershipDirectory2,
  memberships: () => memberships2,
  nativeApps: () => nativeApps2,
  oauthProviders: () => oauthProviders2,
  organizationState: () => organizationState2,
  organizations: () => organizations2,
  passkeyChallenges: () => passkeyChallenges2,
  passkeys: () => passkeys2,
  passwordHistory: () => passwordHistory2,
  playbookSchema: () => playbookSchema2,
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

// src/schema/auth/api-keys.ts
import { foreignKey, index as index3, text as text4, timestamp as timestamp2, unique as unique2, uuid as uuid4 } from "drizzle-orm/pg-core";

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

// src/schema/auth/api-keys.ts
var API_KEY_KINDS2 = ["publishable", "secret", "agent"];
var apiKeys2 = authSchema2.table("api_keys", {
  id: primaryKey(),
  projectId: uuid4("project_id").notNull().references(() => projects2.id, { onDelete: "cascade" }),
  environmentId: uuid4("environment_id").notNull().references(() => environments2.id, { onDelete: "cascade" }),
  kind: text4("kind", { enum: API_KEY_KINDS2 }).notNull(),
  name: text4("name").notNull(),
  keyHash: text4("key_hash").notNull(),
  lastFour: text4("last_four").notNull(),
  lastUsedAt: timestamp2("last_used_at", { withTimezone: true }),
  revokedAt: timestamp2("revoked_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  unique2("api_keys_key_hash_key").on(t.keyHash),
  foreignKey({
    name: "api_keys_environment_project_fk",
    columns: [t.environmentId, t.projectId],
    foreignColumns: [environments2.id, environments2.projectId]
  }).onDelete("cascade"),
  index3("api_keys_environment_id_idx").on(t.environmentId)
]);
// src/schema/auth/audit-logs.ts
import { sql as sql2 } from "drizzle-orm";
import { index as index5, inet, jsonb, pgPolicy as pgPolicy2, text as text5, timestamp as timestamp3 } from "drizzle-orm/pg-core";

// src/schema/auth/tenant-columns.ts
import { sql } from "drizzle-orm";
import { foreignKey as foreignKey2, index as index4, pgPolicy, unique as unique3, uuid as uuid5 } from "drizzle-orm/pg-core";
var TENANT_SETTING = "tula.environment_id";
var TENANT_PREDICATE = sql.raw(`environment_id = nullif(current_setting('${TENANT_SETTING}', true), '')::uuid`);
function tenantColumns() {
  return {
    projectId: uuid5("project_id").notNull().references(() => projects2.id, { onDelete: "cascade" }),
    environmentId: uuid5("environment_id").notNull().references(() => environments2.id, { onDelete: "cascade" })
  };
}
function tenantConstraints(table, t) {
  return [
    foreignKey2({
      name: `${table}_environment_project_fk`,
      columns: [t.environmentId, t.projectId],
      foreignColumns: [environments2.id, environments2.projectId]
    }).onDelete("cascade"),
    index4(`${table}_environment_id_idx`).on(t.environmentId),
    pgPolicy(`${table}_tenant_isolation`, {
      as: "permissive",
      for: "all",
      using: TENANT_PREDICATE,
      withCheck: TENANT_PREDICATE
    })
  ];
}
function tenantForeignKey(name, t, column, parent, onDelete = "cascade") {
  return foreignKey2({
    name,
    columns: [t.environmentId, column],
    foreignColumns: [parent.environmentId, parent.id]
  }).onDelete(onDelete);
}
function tenantParentKey(table, t) {
  return unique3(`${table}_environment_id_id_key`).on(t.environmentId, t.id);
}

// src/schema/auth/audit-logs.ts
var AUDIT_ACTOR_TYPES2 = ["user", "admin", "system", "agent", "instance_admin"];
var AUDIT_RETENTION_FLOOR2 = "1 day";
var auditLogs2 = authSchema2.table("audit_logs", {
  id: primaryKey(),
  ...tenantColumns(),
  actorType: text5("actor_type", { enum: AUDIT_ACTOR_TYPES2 }).notNull(),
  actorId: text5("actor_id"),
  action: text5("action").notNull(),
  targetType: text5("target_type"),
  targetId: text5("target_id"),
  ipAddress: inet("ip_address"),
  userAgent: text5("user_agent"),
  metadata: jsonb("metadata").$type().notNull().default({}),
  occurredAt: timestamp3("occurred_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  index5("audit_logs_environment_occurred_idx").on(t.environmentId, t.occurredAt),
  index5("audit_logs_environment_target_idx").on(t.environmentId, t.targetId, t.occurredAt),
  index5("audit_logs_environment_actor_idx").on(t.environmentId, t.actorId, t.occurredAt),
  ...tenantConstraints("audit_logs", t),
  pgPolicy2("audit_logs_retention_floor", {
    as: "restrictive",
    for: "delete",
    using: sql2.raw(`occurred_at < now() - interval '${AUDIT_RETENTION_FLOOR2}'`)
  })
]);
// src/schema/auth/backup-codes.ts
import { index as index7, text as text7, timestamp as timestamp5, unique as unique5, uuid as uuid6 } from "drizzle-orm/pg-core";

// src/schema/auth/users.ts
import { sql as sql3 } from "drizzle-orm";
import { check, index as index6, text as text6, timestamp as timestamp4, unique as unique4 } from "drizzle-orm/pg-core";
var users2 = authSchema2.table("users", {
  id: primaryKey(),
  ...tenantColumns(),
  email: text6("email"),
  emailNormalized: text6("email_normalized"),
  emailVerifiedAt: timestamp4("email_verified_at", { withTimezone: true }),
  firstName: text6("first_name"),
  lastName: text6("last_name"),
  bannedAt: timestamp4("banned_at", { withTimezone: true }),
  lastSignInAt: timestamp4("last_sign_in_at", { withTimezone: true }),
  phoneNumber: text6("phone_number"),
  phoneNumberVerifiedAt: timestamp4("phone_number_verified_at", { withTimezone: true }),
  smsFactorEnabledAt: timestamp4("sms_factor_enabled_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  unique4("users_environment_email_key").on(t.environmentId, t.emailNormalized),
  check("users_email_whole", sql3`(${t.email} IS NULL) = (${t.emailNormalized} IS NULL) AND (${t.email} IS NOT NULL OR ${t.emailVerifiedAt} IS NULL)`),
  check("users_phone_number_whole", sql3`(${t.phoneNumber} IS NULL) = (${t.phoneNumberVerifiedAt} IS NULL)`),
  check("users_sms_factor_needs_number", sql3`${t.smsFactorEnabledAt} IS NULL OR ${t.phoneNumber} IS NOT NULL`),
  index6("users_environment_phone_number_idx").on(t.environmentId, t.phoneNumber).where(sql3`${t.phoneNumber} IS NOT NULL`),
  tenantParentKey("users", t),
  ...tenantConstraints("users", t)
]);

// src/schema/auth/backup-codes.ts
var backupCodes2 = authSchema2.table("backup_codes", {
  id: primaryKey(),
  ...tenantColumns(),
  userId: uuid6("user_id").notNull(),
  codeHash: text7("code_hash").notNull(),
  usedAt: timestamp5("used_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  unique5("backup_codes_user_code_hash_key").on(t.userId, t.codeHash),
  index7("backup_codes_user_id_idx").on(t.userId),
  tenantForeignKey("backup_codes_user_fk", t, t.userId, users2),
  ...tenantConstraints("backup_codes", t)
]);
// src/schema/auth/credentials.ts
import { integer, text as text8, timestamp as timestamp6, unique as unique6, uuid as uuid7 } from "drizzle-orm/pg-core";
var CREDENTIAL_TYPES2 = ["password", "totp", "passkey"];
var credentials2 = authSchema2.table("credentials", {
  id: primaryKey(),
  ...tenantColumns(),
  userId: uuid7("user_id").notNull(),
  type: text8("type", { enum: CREDENTIAL_TYPES2 }).notNull(),
  secret: text8("secret").notNull(),
  policyVersion: integer("policy_version").notNull().default(1),
  secretChangedAt: timestamp6("secret_changed_at", { withTimezone: true }).notNull().defaultNow(),
  ...timestamps()
}, (t) => [
  unique6("credentials_user_type_key").on(t.userId, t.type),
  tenantForeignKey("credentials_user_fk", t, t.userId, users2),
  ...tenantConstraints("credentials", t)
]);
// src/schema/auth/environment-settings.ts
import { integer as integer2, jsonb as jsonb2, unique as unique7 } from "drizzle-orm/pg-core";
var environmentSettings2 = authSchema2.table("environment_settings", {
  id: primaryKey(),
  ...tenantColumns(),
  settings: jsonb2("settings").$type().notNull(),
  revision: integer2("revision").notNull().default(1),
  managedBy: jsonb2("managed_by").$type(),
  ...timestamps()
}, (t) => [
  unique7("environment_settings_environment_id_key").on(t.environmentId),
  ...tenantConstraints("environment_settings", t)
]);
// src/schema/auth/events.ts
import { sql as sql4 } from "drizzle-orm";
import { index as index8, jsonb as jsonb3, pgPolicy as pgPolicy3, text as text9, timestamp as timestamp7 } from "drizzle-orm/pg-core";
var EVENT_RETENTION_FLOOR2 = "1 day";
var events2 = authSchema2.table("events", {
  id: primaryKey(),
  ...tenantColumns(),
  type: text9("type").notNull(),
  payload: jsonb3("payload").$type().notNull(),
  occurredAt: timestamp7("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  deliveredAt: timestamp7("delivered_at", { withTimezone: true })
}, (t) => [
  index8("events_environment_undelivered_idx").on(t.environmentId, t.occurredAt, t.id).where(sql4`delivered_at is null`),
  index8("events_environment_delivered_idx").on(t.environmentId, t.deliveredAt).where(sql4`delivered_at is not null`),
  tenantParentKey("events", t),
  ...tenantConstraints("events", t),
  pgPolicy3("events_retention_floor", {
    as: "restrictive",
    for: "delete",
    using: sql4.raw(`delivered_at is not null and occurred_at < now() - interval '${EVENT_RETENTION_FLOOR2}'`)
  })
]);
// src/schema/auth/flow-attempts.ts
import { jsonb as jsonb4, text as text10, timestamp as timestamp8, uuid as uuid8 } from "drizzle-orm/pg-core";
var flowAttempts2 = authSchema2.table("flow_attempts", {
  id: primaryKey(),
  ...tenantColumns(),
  kind: text10("kind", { enum: ["sign_in", "sign_up", "password_reset"] }).notNull(),
  status: text10("status").notNull(),
  userId: uuid8("user_id"),
  identifier: text10("identifier").notNull(),
  secretHash: text10("secret_hash"),
  state: jsonb4("state").$type().notNull().default({}),
  expiresAt: timestamp8("expires_at", { withTimezone: true }).notNull(),
  completedAt: timestamp8("completed_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  tenantParentKey("flow_attempts", t),
  tenantForeignKey("flow_attempts_user_fk", t, t.userId, users2),
  ...tenantConstraints("flow_attempts", t)
]);
// src/schema/auth/hook-call-counts.ts
import { sql as sql6 } from "drizzle-orm";
import { check as check3, integer as integer4, text as text12, timestamp as timestamp10, unique as unique9, uuid as uuid9 } from "drizzle-orm/pg-core";

// src/schema/auth/hooks.ts
import { sql as sql5 } from "drizzle-orm";
import { boolean, check as check2, integer as integer3, text as text11, timestamp as timestamp9, unique as unique8 } from "drizzle-orm/pg-core";
var hooks2 = authSchema2.table("hooks", {
  id: primaryKey(),
  ...tenantColumns(),
  point: text11("point", { enum: ["before_sign_up", "before_session", "before_token"] }).notNull(),
  url: text11("url").notNull(),
  secret: text11("secret").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  deadlineMs: integer3("deadline_ms").notNull().default(2000),
  failureMode: text11("failure_mode", { enum: ["deny", "allow"] }).notNull().default("deny"),
  lastFailedAt: timestamp9("last_failed_at", { withTimezone: true }),
  lastFailureReason: text11("last_failure_reason"),
  ...timestamps()
}, (t) => [
  unique8("hooks_environment_point_key").on(t.environmentId, t.point),
  tenantParentKey("hooks", t),
  check2("hooks_deadline_bounds", sql5`${t.deadlineMs} between 100 and 5000`),
  check2("hooks_failure_mode_known", sql5`${t.failureMode} in ('deny', 'allow')`),
  check2("hooks_last_failure_whole", sql5`(${t.lastFailedAt} is null) = (${t.lastFailureReason} is null)`),
  ...tenantConstraints("hooks", t)
]);

// src/schema/auth/hook-call-counts.ts
var hookCallCounts2 = authSchema2.table("hook_call_counts", {
  id: primaryKey(),
  ...tenantColumns(),
  hookId: uuid9("hook_id").notNull(),
  hour: timestamp10("hour", { withTimezone: true }).notNull(),
  outcome: text12("outcome", { enum: ["allowed", "denied", "failed", "timed_out"] }).notNull(),
  calls: integer4("calls").notNull().default(0),
  lastAt: timestamp10("last_at", { withTimezone: true }).notNull(),
  ...timestamps()
}, (t) => [
  unique9("hook_call_counts_hook_hour_outcome_key").on(t.hookId, t.hour, t.outcome),
  tenantForeignKey("hook_call_counts_hook_fk", t, t.hookId, hooks2),
  check3("hook_call_counts_outcome_known", sql6`${t.outcome} in ('allowed', 'denied', 'failed', 'timed_out')`),
  check3("hook_call_counts_calls_bounds", sql6`${t.calls} >= 0`),
  check3("hook_call_counts_hour_whole", sql6`${t.hour} = date_trunc('hour', ${t.hour}, 'UTC')`),
  check3("hook_call_counts_last_at_in_hour", sql6`${t.lastAt} >= ${t.hour} and ${t.lastAt} < ${t.hour} + interval '1 hour'`),
  ...tenantConstraints("hook_call_counts", t)
]);
// src/schema/auth/identities.ts
import { index as index9, text as text13, unique as unique10, uuid as uuid10 } from "drizzle-orm/pg-core";
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
  userId: uuid10("user_id").notNull(),
  provider: text13("provider", { enum: IDENTITY_PROVIDERS2 }).notNull(),
  providerSubject: text13("provider_subject").notNull(),
  ...timestamps()
}, (t) => [
  unique10("identities_environment_provider_subject_key").on(t.environmentId, t.provider, t.providerSubject),
  unique10("identities_user_provider_key").on(t.userId, t.provider),
  index9("identities_user_id_idx").on(t.userId),
  tenantForeignKey("identities_user_fk", t, t.userId, users2),
  ...tenantConstraints("identities", t)
]);
// src/schema/auth/instance-audit-logs.ts
import { index as index10, inet as inet2, jsonb as jsonb5, text as text14, timestamp as timestamp11 } from "drizzle-orm/pg-core";
var instanceAuditLogs2 = authSchema2.table("instance_audit_logs", {
  id: primaryKey(),
  actorType: text14("actor_type", { enum: AUDIT_ACTOR_TYPES2 }).notNull(),
  actorId: text14("actor_id"),
  action: text14("action").notNull(),
  targetType: text14("target_type"),
  targetId: text14("target_id"),
  ipAddress: inet2("ip_address"),
  userAgent: text14("user_agent"),
  metadata: jsonb5("metadata").$type().notNull().default({}),
  occurredAt: timestamp11("occurred_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index10("instance_audit_logs_occurred_idx").on(t.occurredAt)]);
// src/schema/auth/native-apps.ts
import { sql as sql7 } from "drizzle-orm";
import { check as check4, text as text15, unique as unique11 } from "drizzle-orm/pg-core";
var nativeApps2 = authSchema2.table("native_apps", {
  id: primaryKey(),
  ...tenantColumns(),
  platform: text15("platform", { enum: ["ios", "android"] }).notNull(),
  identifier: text15("identifier").notNull(),
  teamId: text15("team_id"),
  sha256CertFingerprints: text15("sha256_cert_fingerprints").array().notNull().default(sql7`'{}'::text[]`),
  appLinkPaths: text15("app_link_paths").array().notNull().default(sql7`'{}'::text[]`),
  ...timestamps()
}, (t) => [
  unique11("native_apps_environment_platform_identifier_key").on(t.environmentId, t.platform, t.identifier),
  check4("native_apps_platform_known", sql7`${t.platform} in ('ios', 'android')`),
  check4("native_apps_identifier_shape", sql7`char_length(${t.identifier}) <= 255 and ${t.identifier} ~ '^[A-Za-z0-9_-]+(\\.[A-Za-z0-9_-]+)+$'`),
  check4("native_apps_ios_whole", sql7`${t.platform} <> 'ios' or (${t.teamId} is not null and ${t.teamId} ~ '^[A-Z0-9]{10}$' and cardinality(${t.sha256CertFingerprints}) = 0)`),
  check4("native_apps_android_whole", sql7`${t.platform} <> 'android' or (${t.teamId} is null and cardinality(${t.sha256CertFingerprints}) between 1 and 10)`),
  check4("native_apps_fingerprints_shape", sql7`array_position(${t.sha256CertFingerprints}, null) is null and array_to_string(${t.sha256CertFingerprints}, ',') ~ '^(([0-9A-F]{2}:){31}[0-9A-F]{2}(,([0-9A-F]{2}:){31}[0-9A-F]{2})*)?$' and char_length(array_to_string(${t.sha256CertFingerprints}, ',')) = greatest(96 * cardinality(${t.sha256CertFingerprints}) - 1, 0)`),
  check4("native_apps_app_link_paths_shape", sql7`cardinality(${t.appLinkPaths}) <= 10 and array_position(${t.appLinkPaths}, null) is null and array_to_string(${t.appLinkPaths}, ',') ~ '^((/[A-Za-z0-9._~-]+)+(,(/[A-Za-z0-9._~-]+)+)*)?$' and array_to_string(${t.appLinkPaths}, ',') !~ '/\\.\\.?(/|,|$)' and char_length(array_to_string(${t.appLinkPaths}, ',')) - char_length(replace(array_to_string(${t.appLinkPaths}, ','), ',', '')) = greatest(cardinality(${t.appLinkPaths}) - 1, 0) and char_length(array_to_string(${t.appLinkPaths}, ',')) <= 2560 and (cardinality(${t.appLinkPaths}) = 0 or char_length(array_to_string(${t.appLinkPaths}, ',')) >= 2)`),
  ...tenantConstraints("native_apps", t)
]);
// src/schema/auth/oauth-providers.ts
import { boolean as boolean2, jsonb as jsonb6, text as text16, unique as unique12 } from "drizzle-orm/pg-core";
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
  provider: text16("provider", { enum: OAUTH_PROVIDERS2 }).notNull(),
  clientId: text16("client_id").notNull(),
  secret: text16("secret").notNull(),
  config: jsonb6("config").$type().notNull().default({}),
  enabled: boolean2("enabled").notNull().default(false),
  ...timestamps()
}, (t) => [
  unique12("oauth_providers_environment_provider_key").on(t.environmentId, t.provider),
  ...tenantConstraints("oauth_providers", t)
]);
// src/schema/auth/passkey-challenges.ts
import { index as index11, text as text17, timestamp as timestamp12, unique as unique13, uuid as uuid11 } from "drizzle-orm/pg-core";
var PASSKEY_CHALLENGE_PURPOSES2 = ["registration", "step_up"];
var passkeyChallenges2 = authSchema2.table("passkey_challenges", {
  id: primaryKey(),
  ...tenantColumns(),
  userId: uuid11("user_id").notNull(),
  sessionId: uuid11("session_id").notNull(),
  purpose: text17("purpose", { enum: PASSKEY_CHALLENGE_PURPOSES2 }).notNull(),
  challenge: text17("challenge").notNull(),
  expiresAt: timestamp12("expires_at", { withTimezone: true }).notNull(),
  ...timestamps()
}, (t) => [
  unique13("passkey_challenges_session_purpose_key").on(t.sessionId, t.purpose),
  index11("passkey_challenges_expires_at_idx").on(t.expiresAt),
  tenantForeignKey("passkey_challenges_user_fk", t, t.userId, users2),
  ...tenantConstraints("passkey_challenges", t)
]);
// src/schema/auth/passkeys.ts
import {
  bigint,
  boolean as boolean3,
  customType,
  index as index12,
  jsonb as jsonb7,
  text as text18,
  timestamp as timestamp13,
  unique as unique14,
  uuid as uuid12
} from "drizzle-orm/pg-core";
var bytes = customType({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var passkeys2 = authSchema2.table("passkeys", {
  id: primaryKey(),
  ...tenantColumns(),
  userId: uuid12("user_id").notNull(),
  credentialId: text18("credential_id").notNull(),
  publicKey: bytes("public_key").notNull(),
  signCount: bigint("sign_count", { mode: "number" }).notNull().default(0),
  transports: jsonb7("transports").$type().notNull().default([]),
  aaguid: text18("aaguid").notNull(),
  backupEligible: boolean3("backup_eligible").notNull().default(false),
  backedUp: boolean3("backed_up").notNull().default(false),
  userHandle: text18("user_handle").notNull(),
  name: text18("name").notNull(),
  lastUsedAt: timestamp13("last_used_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  unique14("passkeys_environment_credential_id_key").on(t.environmentId, t.credentialId),
  index12("passkeys_user_id_idx").on(t.userId),
  tenantForeignKey("passkeys_user_fk", t, t.userId, users2),
  ...tenantConstraints("passkeys", t)
]);
// src/schema/auth/password-history.ts
import { sql as sql8 } from "drizzle-orm";
import { check as check5, index as index13, integer as integer5, text as text19, uuid as uuid13 } from "drizzle-orm/pg-core";
var passwordHistory2 = authSchema2.table("password_history", {
  id: primaryKey(),
  ...tenantColumns(),
  userId: uuid13("user_id").notNull(),
  secret: text19("secret").notNull(),
  position: integer5("position").notNull(),
  ...timestamps()
}, (t) => [
  tenantForeignKey("password_history_user_fk", t, t.userId, users2),
  check5("password_history_position_positive", sql8`${t.position} >= 1`),
  index13("password_history_environment_position_idx").on(t.environmentId, t.position),
  ...tenantConstraints("password_history", t)
]);
// src/schema/auth/proposals.ts
import { sql as sql9 } from "drizzle-orm";
import { check as check6, index as index14, text as text20, timestamp as timestamp14, uuid as uuid14 } from "drizzle-orm/pg-core";
var proposals2 = authSchema2.table("proposals", {
  id: primaryKey(),
  ...tenantColumns(),
  operation: text20("operation").notNull(),
  targetType: text20("target_type").notNull(),
  targetId: text20("target_id").notNull(),
  proposedBy: uuid14("proposed_by").notNull(),
  status: text20("status", { enum: ["pending", "approved", "executed", "failed"] }).notNull().default("pending"),
  expiresAt: timestamp14("expires_at", { withTimezone: true }).notNull(),
  approvedByType: text20("approved_by_type"),
  approvedById: text20("approved_by_id"),
  approvedAt: timestamp14("approved_at", { withTimezone: true }),
  failureReason: text20("failure_reason"),
  ...timestamps()
}, (t) => [
  check6("proposals_status_known", sql9`${t.status} in ('pending', 'approved', 'executed', 'failed')`),
  check6("proposals_operation_shape", sql9`${t.operation} ~ '^[a-z_]{1,64}$'`),
  check6("proposals_target_type_shape", sql9`${t.targetType} ~ '^[a-z_]{1,64}$'`),
  check6("proposals_target_id_shape", sql9`${t.targetId} ~ '^[a-z0-9_-]{1,64}$'`),
  check6("proposals_approval_whole", sql9`(${t.status} = 'pending') = (${t.approvedAt} is null) and (${t.status} = 'pending') = (${t.approvedByType} is null) and (${t.approvedByType} is null or ${t.approvedByType} in ('admin', 'instance_admin')) and (${t.approvedById} is null or (${t.approvedByType} is not null and char_length(${t.approvedById}) between 1 and 128))`),
  check6("proposals_failure_whole", sql9`(${t.status} = 'failed') = (${t.failureReason} is not null) and (${t.failureReason} is null or ${t.failureReason} ~ '^[a-z_]{1,64}$')`),
  check6("proposals_lifetime_bounds", sql9`${t.expiresAt} <= ${t.createdAt} + interval '1 hour'`),
  index14("proposals_environment_created_idx").on(t.environmentId, t.createdAt),
  ...tenantConstraints("proposals", t)
]);
// src/schema/auth/refresh-tokens.ts
import { index as index16, text as text22, timestamp as timestamp16, unique as unique15, uuid as uuid16 } from "drizzle-orm/pg-core";

// src/schema/auth/sessions.ts
import { sql as sql10 } from "drizzle-orm";
import { check as check7, index as index15, inet as inet3, jsonb as jsonb8, text as text21, timestamp as timestamp15, uuid as uuid15 } from "drizzle-orm/pg-core";
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
  userId: uuid15("user_id").notNull(),
  profile: text21("profile").notNull(),
  type: text21("type", { enum: SESSION_TYPES2 }).notNull().default("hybrid"),
  client: text21("client", { enum: SESSION_CLIENTS2 }).notNull(),
  userAgent: text21("user_agent"),
  ipAddress: inet3("ip_address"),
  lastActiveAt: timestamp15("last_active_at", { withTimezone: true }).notNull(),
  idleExpiresAt: timestamp15("idle_expires_at", { withTimezone: true }).notNull(),
  absoluteExpiresAt: timestamp15("absolute_expires_at", { withTimezone: true }),
  factorVerifiedAt: timestamp15("factor_verified_at", { withTimezone: true }),
  authMethods: text21("auth_methods").array().notNull().default(sql10`'{}'::text[]`),
  hookClaims: jsonb8("hook_claims").$type(),
  deviceThumbprint: text21("device_thumbprint"),
  revokedAt: timestamp15("revoked_at", { withTimezone: true }),
  revokeReason: text21("revoke_reason", { enum: SESSION_REVOKE_REASONS2 }),
  ...timestamps()
}, (t) => [
  index15("sessions_user_id_idx").on(t.userId),
  check7("sessions_hook_claims_bounds", sql10`${t.hookClaims} is null or (jsonb_typeof(${t.hookClaims}) = 'object' and octet_length(${t.hookClaims}::text) <= 4096)`),
  check7("sessions_device_thumbprint_shape", sql10`${t.deviceThumbprint} is null or (${t.type} = 'hybrid' and ${t.deviceThumbprint} ~ '^[A-Za-z0-9_-]{43}$')`),
  tenantParentKey("sessions", t),
  tenantForeignKey("sessions_user_fk", t, t.userId, users2),
  ...tenantConstraints("sessions", t)
]);

// src/schema/auth/refresh-tokens.ts
var refreshTokens2 = authSchema2.table("refresh_tokens", {
  id: primaryKey(),
  ...tenantColumns(),
  sessionId: uuid16("session_id").notNull(),
  tokenHash: text22("token_hash").notNull(),
  parentId: uuid16("parent_id"),
  replacedById: uuid16("replaced_by_id"),
  usedAt: timestamp16("used_at", { withTimezone: true }),
  expiresAt: timestamp16("expires_at", { withTimezone: true }).notNull(),
  ...timestamps()
}, (t) => [
  unique15("refresh_tokens_token_hash_key").on(t.tokenHash),
  index16("refresh_tokens_session_id_idx").on(t.sessionId),
  tenantParentKey("refresh_tokens", t),
  tenantForeignKey("refresh_tokens_session_fk", t, t.sessionId, sessions2),
  tenantForeignKey("refresh_tokens_parent_fk", t, t.parentId, t, "no action"),
  tenantForeignKey("refresh_tokens_replaced_by_fk", t, t.replacedById, t, "no action"),
  ...tenantConstraints("refresh_tokens", t)
]);
// src/schema/auth/signing-keys.ts
import { sql as sql11 } from "drizzle-orm";
import { index as index17, jsonb as jsonb9, text as text23, timestamp as timestamp17, uniqueIndex } from "drizzle-orm/pg-core";
var SIGNING_KEY_STATUSES2 = ["next", "active", "retired"];
var signingKeys2 = authSchema2.table("signing_keys", {
  id: primaryKey(),
  ...tenantColumns(),
  algorithm: text23("algorithm", { enum: ["EdDSA"] }).notNull().default("EdDSA"),
  publicJwk: jsonb9("public_jwk").$type().notNull(),
  privateKeyCiphertext: text23("private_key_ciphertext").notNull(),
  status: text23("status", { enum: SIGNING_KEY_STATUSES2 }).notNull(),
  activatedAt: timestamp17("activated_at", { withTimezone: true }),
  retiredAt: timestamp17("retired_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  index17("signing_keys_environment_status_idx").on(t.environmentId, t.status),
  uniqueIndex("signing_keys_one_active_per_environment").on(t.environmentId).where(sql11`${t.status} = 'active'`),
  uniqueIndex("signing_keys_one_next_per_environment").on(t.environmentId).where(sql11`${t.status} = 'next'`),
  ...tenantConstraints("signing_keys", t)
]);
// src/schema/auth/sms-code-counts.ts
import { sql as sql12 } from "drizzle-orm";
import { check as check8, date, integer as integer6, pgPolicy as pgPolicy4, text as text24, unique as unique16 } from "drizzle-orm/pg-core";
var SMS_COUNT_RETENTION_FLOOR_DAYS2 = 7;
var smsCodeCounts2 = authSchema2.table("sms_code_counts", {
  id: primaryKey(),
  ...tenantColumns(),
  day: date("day", { mode: "string" }).notNull(),
  prefix: text24("prefix").notNull(),
  sent: integer6("sent").notNull().default(0),
  used: integer6("used").notNull().default(0),
  ...timestamps()
}, (t) => [
  unique16("sms_code_counts_environment_day_prefix_key").on(t.environmentId, t.day, t.prefix),
  check8("sms_code_counts_prefix_shape", sql12`${t.prefix} ~ '^\\+[0-9]{1,4}$'`),
  check8("sms_code_counts_bounds", sql12`${t.sent} >= 0 and ${t.used} >= 0 and ${t.used} <= ${t.sent}`),
  ...tenantConstraints("sms_code_counts", t),
  pgPolicy4("sms_code_counts_retention_floor", {
    as: "restrictive",
    for: "delete",
    using: sql12.raw(`day < (now() at time zone 'utc')::date - ${SMS_COUNT_RETENTION_FLOOR_DAYS2}`)
  })
]);
// src/schema/auth/user-factors.ts
import { bigint as bigint2, index as index18, text as text25, timestamp as timestamp18, unique as unique17, uuid as uuid17 } from "drizzle-orm/pg-core";
var USER_FACTOR_TYPES2 = ["totp"];
var userFactors2 = authSchema2.table("user_factors", {
  id: primaryKey(),
  ...tenantColumns(),
  userId: uuid17("user_id").notNull(),
  type: text25("type", { enum: USER_FACTOR_TYPES2 }).notNull(),
  secret: text25("secret").notNull(),
  name: text25("name"),
  confirmedAt: timestamp18("confirmed_at", { withTimezone: true }),
  expiresAt: timestamp18("expires_at", { withTimezone: true }),
  lastUsedStep: bigint2("last_used_step", { mode: "number" }),
  ...timestamps()
}, (t) => [
  unique17("user_factors_user_type_key").on(t.userId, t.type),
  index18("user_factors_expires_at_idx").on(t.expiresAt),
  tenantForeignKey("user_factors_user_fk", t, t.userId, users2),
  ...tenantConstraints("user_factors", t)
]);
// src/schema/auth/verification-tokens.ts
import { index as index19, integer as integer7, text as text26, timestamp as timestamp19, unique as unique18, uuid as uuid18 } from "drizzle-orm/pg-core";
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
  userId: uuid18("user_id"),
  flowAttemptId: uuid18("flow_attempt_id"),
  purpose: text26("purpose", { enum: VERIFICATION_PURPOSES2 }).notNull(),
  destination: text26("destination").notNull(),
  codeHash: text26("code_hash").notNull(),
  linkTokenHash: text26("link_token_hash"),
  attempts: integer7("attempts").notNull().default(0),
  maxAttempts: integer7("max_attempts").notNull().default(5),
  expiresAt: timestamp19("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp19("consumed_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  unique18("verification_tokens_link_token_hash_key").on(t.linkTokenHash),
  index19("verification_tokens_flow_attempt_id_idx").on(t.flowAttemptId),
  tenantForeignKey("verification_tokens_user_fk", t, t.userId, users2),
  tenantForeignKey("verification_tokens_flow_attempt_fk", t, t.flowAttemptId, flowAttempts2),
  ...tenantConstraints("verification_tokens", t)
]);
// src/schema/auth/webhook-deliveries.ts
import { sql as sql14 } from "drizzle-orm";
import {
  boolean as boolean5,
  index as index20,
  integer as integer8,
  pgPolicy as pgPolicy5,
  text as text28,
  timestamp as timestamp21,
  unique as unique19,
  uuid as uuid19
} from "drizzle-orm/pg-core";

// src/schema/auth/webhook-endpoints.ts
import { sql as sql13 } from "drizzle-orm";
import { boolean as boolean4, check as check9, text as text27, timestamp as timestamp20 } from "drizzle-orm/pg-core";
var webhookEndpoints2 = authSchema2.table("webhook_endpoints", {
  id: primaryKey(),
  ...tenantColumns(),
  url: text27("url").notNull(),
  eventTypes: text27("event_types").array().notNull(),
  secret: text27("secret").notNull(),
  previousSecret: text27("previous_secret"),
  previousSecretExpiresAt: timestamp20("previous_secret_expires_at", { withTimezone: true }),
  enabled: boolean4("enabled").notNull().default(true),
  disabledReason: text27("disabled_reason", { enum: ["failing", "gone"] }),
  failingSince: timestamp20("failing_since", { withTimezone: true }),
  lastFailedAt: timestamp20("last_failed_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  tenantParentKey("webhook_endpoints", t),
  check9("webhook_endpoints_previous_secret_whole", sql13`(${t.previousSecret} is null) = (${t.previousSecretExpiresAt} is null)`),
  ...tenantConstraints("webhook_endpoints", t)
]);

// src/schema/auth/webhook-deliveries.ts
var WEBHOOK_DELIVERY_STATES2 = ["pending", "delivered", "failed"];
var WEBHOOK_DELIVERY_RETENTION_FLOOR2 = "7 days";
var webhookDeliveries2 = authSchema2.table("webhook_deliveries", {
  id: primaryKey(),
  ...tenantColumns(),
  endpointId: uuid19("endpoint_id").notNull(),
  eventId: uuid19("event_id"),
  eventType: text28("event_type").notNull(),
  test: boolean5("test").notNull().default(false),
  state: text28("state", { enum: WEBHOOK_DELIVERY_STATES2 }).notNull(),
  attempts: integer8("attempts").notNull().default(0),
  nextAttemptAt: timestamp21("next_attempt_at", { withTimezone: true }),
  lastAttemptAt: timestamp21("last_attempt_at", { withTimezone: true }),
  statusCode: integer8("status_code"),
  failureReason: text28("failure_reason"),
  completedAt: timestamp21("completed_at", { withTimezone: true }),
  ...timestamps()
}, (t) => [
  unique19("webhook_deliveries_endpoint_event_key").on(t.endpointId, t.eventId),
  index20("webhook_deliveries_event_idx").on(t.environmentId, t.eventId),
  index20("webhook_deliveries_due_idx").on(t.environmentId, t.endpointId, t.nextAttemptAt).where(sql14`state = 'pending'`),
  index20("webhook_deliveries_pending_age_idx").on(t.environmentId, t.createdAt).where(sql14`state = 'pending'`),
  index20("webhook_deliveries_endpoint_log_idx").on(t.environmentId, t.endpointId, t.createdAt),
  index20("webhook_deliveries_environment_created_idx").on(t.environmentId, t.createdAt),
  tenantParentKey("webhook_deliveries", t),
  tenantForeignKey("webhook_deliveries_endpoint_fk", t, t.endpointId, webhookEndpoints2),
  ...tenantConstraints("webhook_deliveries", t),
  pgPolicy5("webhook_deliveries_retention_floor", {
    as: "restrictive",
    for: "delete",
    using: sql14.raw(`state <> 'pending' and created_at < now() - interval '${WEBHOOK_DELIVERY_RETENTION_FLOOR2}'`)
  })
]);
// src/schema/auth/webhook-delivery-attempts.ts
import { integer as integer9, text as text29, timestamp as timestamp22, unique as unique20, uuid as uuid20 } from "drizzle-orm/pg-core";
var webhookDeliveryAttempts2 = authSchema2.table("webhook_delivery_attempts", {
  id: primaryKey(),
  ...tenantColumns(),
  deliveryId: uuid20("delivery_id").notNull(),
  attempt: integer9("attempt").notNull(),
  attemptedAt: timestamp22("attempted_at", { withTimezone: true }).notNull(),
  statusCode: integer9("status_code"),
  durationMs: integer9("duration_ms").notNull(),
  failureReason: text29("failure_reason")
}, (t) => [
  unique20("webhook_delivery_attempts_delivery_attempt_key").on(t.deliveryId, t.attempt),
  tenantForeignKey("webhook_delivery_attempts_delivery_fk", t, t.deliveryId, webhookDeliveries2),
  ...tenantConstraints("webhook_delivery_attempts", t)
]);
// src/schema/core.ts
import { pgSchema as pgSchema2 } from "drizzle-orm/pg-core";
var coreSchema2 = pgSchema2("core");
// src/schema/core-tables.ts
import { sql as sql15 } from "drizzle-orm";
import {
  check as check10,
  customType as customType2,
  foreignKey as foreignKey3,
  index as index21,
  integer as integer10,
  jsonb as jsonb10,
  primaryKey as primaryKey2,
  smallint,
  text as text30,
  timestamp as timestamp23,
  unique as unique21,
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
var bytes2 = customType2({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var list = (values) => sql15.raw(values.map((v) => `'${v}'`).join(", "));
var idShape = (column, prefix) => sql15.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var createdAt = () => timestamp23("created_at", { withTimezone: true }).notNull().defaultNow();
var updatedAt = () => timestamp23("updated_at", { withTimezone: true }).notNull().defaultNow();
var organizations2 = coreSchema2.table("organizations", {
  organizationId: text30("organization_id").primaryKey(),
  name: text30("name").notNull(),
  region: text30("region", { enum: ORGANIZATION_REGIONS2 }).notNull(),
  status: text30("status", { enum: ORGANIZATION_STATUSES2 }).notNull().default("active"),
  ownerCount: integer10("owner_count").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  check10("organizations_id_shape", idShape("organization_id", "org")),
  check10("organizations_name_shape", sql15`char_length(btrim(${t.name})) between 1 and 200`),
  check10("organizations_region_known", sql15`${t.region} in (${list(ORGANIZATION_REGIONS2)})`),
  check10("organizations_status_known", sql15`${t.status} in (${list(ORGANIZATION_STATUSES2)})`),
  check10("organizations_owner_count_not_negative", sql15`${t.ownerCount} >= 0`)
]);
var memberships2 = coreSchema2.table("memberships", {
  id: text30("id").primaryKey(),
  organizationId: text30("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  userId: text30("user_id").notNull(),
  role: text30("role", { enum: MEMBERSHIP_ROLES2 }).notNull(),
  email: text30("email").notNull(),
  name: text30("name"),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  check10("memberships_id_shape", idShape("id", "mem")),
  check10("memberships_organization_id_shape", idShape("organization_id", "org")),
  check10("memberships_user_id_shape", idShape("user_id", "usr")),
  check10("memberships_role_known", sql15`${t.role} in (${list(MEMBERSHIP_ROLES2)})`),
  check10("memberships_email_shape", sql15`${t.email} = lower(${t.email} collate "C")
        and char_length(${t.email}) between 3 and 320
        and char_length(${t.email}) - char_length(replace(${t.email}, '@', '')) = 1
        and position('@' in ${t.email}) between 2 and char_length(${t.email}) - 1
        and ${t.email} collate "C" !~ '[[:space:][:cntrl:]]'
        and ${t.email} collate "C" ~ '^[!-~]+$'`),
  check10("memberships_name_shape", sql15`${t.name} is null or char_length(btrim(${t.name})) between 1 and ${sql15.raw(String(MEMBER_NAME_MAX2))}`),
  unique21("memberships_organization_user_key").on(t.organizationId, t.userId),
  unique21("memberships_organization_id_id_key").on(t.organizationId, t.id)
]);
var teams2 = coreSchema2.table("teams", {
  id: text30("id").primaryKey(),
  organizationId: text30("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  name: text30("name").notNull(),
  nameKey: text30("name_key").generatedAlwaysAs(() => sql15`lower(name collate "C")`),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  check10("teams_id_shape", idShape("id", "team")),
  check10("teams_organization_id_shape", idShape("organization_id", "org")),
  check10("teams_name_shape", sql15`char_length(btrim(${t.name})) between 1 and 200`),
  unique21("teams_organization_id_id_key").on(t.organizationId, t.id),
  unique21("teams_organization_name_key").on(t.organizationId, t.nameKey)
]);
var teamMembers2 = coreSchema2.table("team_members", {
  organizationId: text30("organization_id").notNull(),
  teamId: text30("team_id").notNull(),
  membershipId: text30("membership_id").notNull(),
  createdAt: createdAt()
}, (t) => [
  primaryKey2({
    name: "team_members_pkey",
    columns: [t.organizationId, t.teamId, t.membershipId]
  }),
  check10("team_members_organization_id_shape", idShape("organization_id", "org")),
  foreignKey3({
    name: "team_members_team_fk",
    columns: [t.organizationId, t.teamId],
    foreignColumns: [teams2.organizationId, teams2.id]
  }).onDelete("cascade"),
  foreignKey3({
    name: "team_members_membership_fk",
    columns: [t.organizationId, t.membershipId],
    foreignColumns: [memberships2.organizationId, memberships2.id]
  }).onDelete("cascade"),
  index21("team_members_membership_idx").on(t.organizationId, t.membershipId, t.teamId)
]);
var invitations2 = coreSchema2.table("invitations", {
  id: text30("id").primaryKey(),
  organizationId: text30("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  email: text30("email").notNull(),
  role: text30("role", { enum: INVITATION_ROLES2 }).notNull(),
  teamId: text30("team_id"),
  invitedByUserId: text30("invited_by_user_id").notNull(),
  tokenHash: text30("token_hash").notNull(),
  state: text30("state", { enum: INVITATION_STATES2 }).notNull().default("pending"),
  expiresAt: timestamp23("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp23("accepted_at", { withTimezone: true }),
  revokedAt: timestamp23("revoked_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  check10("invitations_id_shape", idShape("id", "inv")),
  check10("invitations_organization_id_shape", idShape("organization_id", "org")),
  check10("invitations_invited_by_shape", idShape("invited_by_user_id", "usr")),
  check10("invitations_team_id_shape", sql15`${t.teamId} is null or "team_id" ~ '^team_[0-9a-f]{32}$'`),
  check10("invitations_email_shape", sql15`${t.email} = lower(${t.email} collate "C")
        and char_length(${t.email}) between 3 and 320
        and char_length(${t.email}) - char_length(replace(${t.email}, '@', '')) = 1
        and position('@' in ${t.email}) between 2 and char_length(${t.email}) - 1
        and ${t.email} collate "C" !~ '[[:space:][:cntrl:]]'
        and ${t.email} collate "C" ~ '^[!-~]+$'`),
  check10("invitations_role_known", sql15`${t.role} in (${list(MEMBERSHIP_ROLES2)})`),
  check10("invitations_role_not_owner", sql15`${t.role} <> 'owner'`),
  check10("invitations_state_known", sql15`${t.state} in (${list(INVITATION_STATES2)})`),
  check10("invitations_token_hash_shape", sql15`${t.tokenHash} ~ '^[0-9a-f]{64}$'`),
  check10("invitations_expiry_after_creation", sql15`${t.expiresAt} > ${t.createdAt}`),
  check10("invitations_state_shape", sql15`(${t.state} = 'pending' and ${t.acceptedAt} is null and ${t.revokedAt} is null)
        or (${t.state} = 'accepted' and ${t.acceptedAt} is not null and ${t.revokedAt} is null)
        or (${t.state} = 'revoked' and ${t.revokedAt} is not null and ${t.acceptedAt} is null)`),
  unique21("invitations_organization_id_id_key").on(t.organizationId, t.id),
  unique21("invitations_token_hash_key").on(t.tokenHash),
  foreignKey3({
    name: "invitations_team_fk",
    columns: [t.organizationId, t.teamId],
    foreignColumns: [teams2.organizationId, teams2.id]
  }),
  uniqueIndex2("invitations_pending_email_key").on(t.organizationId, t.email).where(sql15`${t.state} = 'pending'`),
  index21("invitations_pending_list_idx").on(t.organizationId, t.createdAt, t.id).where(sql15`${t.state} = 'pending'`),
  index21("invitations_state_list_idx").on(t.organizationId, t.state, t.createdAt, t.id),
  index21("invitations_team_idx").on(t.organizationId, t.teamId).where(sql15`${t.teamId} is not null`)
]);
var membershipDirectory2 = coreSchema2.table("membership_directory", {
  userId: text30("user_id").notNull(),
  organizationId: text30("organization_id").notNull()
}, (t) => [
  primaryKey2({ name: "membership_directory_pkey", columns: [t.userId, t.organizationId] }),
  check10("membership_directory_user_id_shape", idShape("user_id", "usr")),
  check10("membership_directory_organization_id_shape", idShape("organization_id", "org")),
  unique21("membership_directory_one_organization_per_user").on(t.userId)
]);
var invitationDirectory2 = coreSchema2.table("invitation_directory", {
  tokenHash: text30("token_hash").primaryKey(),
  organizationId: text30("organization_id").notNull(),
  invitationId: text30("invitation_id").notNull(),
  expiresAt: timestamp23("expires_at", { withTimezone: true }).notNull()
}, () => [
  check10("invitation_directory_token_hash_shape", sql15`"token_hash" ~ '^[0-9a-f]{64}$'`),
  check10("invitation_directory_organization_id_shape", idShape("organization_id", "org")),
  check10("invitation_directory_invitation_id_shape", idShape("invitation_id", "inv"))
]);
var organizationState2 = coreSchema2.table("organization_state", {
  organizationId: text30("organization_id").primaryKey().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  status: text30("status", { enum: ORGANIZATION_STATUSES2 }).notNull()
}, (t) => [
  check10("organization_state_organization_id_shape", idShape("organization_id", "org")),
  check10("organization_state_status_known", sql15`${t.status} in (${list(ORGANIZATION_STATUSES2)})`)
]);
var idempotencyKeys2 = coreSchema2.table("idempotency_keys", {
  organizationId: text30("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  userId: text30("user_id").notNull(),
  route: text30("route").notNull(),
  key: text30("key").notNull(),
  requestHash: bytes2("request_hash").notNull(),
  status: smallint("status"),
  response: jsonb10("response").$type(),
  createdAt: createdAt()
}, (t) => [
  primaryKey2({
    name: "idempotency_keys_pkey",
    columns: [t.organizationId, t.userId, t.route, t.key]
  }),
  check10("idempotency_keys_organization_id_shape", idShape("organization_id", "org")),
  check10("idempotency_keys_user_id_shape", idShape("user_id", "usr")),
  check10("idempotency_keys_route_shape", sql15`char_length(${t.route}) between 1 and ${sql15.raw(String(IDEMPOTENCY_ROUTE_MAX2))}
        and ${t.route} collate "C" ~ '^[a-z0-9._]+$'`),
  check10("idempotency_keys_key_shape", sql15`char_length(${t.key}) between 1 and ${sql15.raw(String(IDEMPOTENCY_KEY_MAX2))}
        and ${t.key} collate "C" ~ '^[!-~]+$'`),
  check10("idempotency_keys_request_hash_length", sql15`octet_length(${t.requestHash}) = ${sql15.raw(String(IDEMPOTENCY_HASH_BYTES2))}`),
  check10("idempotency_keys_status_range", sql15`${t.status} between 100 and 599`),
  check10("idempotency_keys_response_matches_status", sql15`(${t.status} is null) = (${t.response} is null)`),
  check10("idempotency_keys_response_size", sql15`octet_length(${t.response}::text) <= ${sql15.raw(String(IDEMPOTENCY_RESPONSE_MAX_BYTES2))}`),
  index21("idempotency_keys_purge_idx").on(t.organizationId, t.createdAt)
]);
// src/schema/playbook.ts
import { pgSchema as pgSchema3 } from "drizzle-orm/pg-core";
var playbookSchema2 = pgSchema3("playbook");
export { authSchema2, workspaces2, projects2, ENVIRONMENT_KINDS2, environments2, API_KEY_KINDS2, apiKeys2, TENANT_SETTING, AUDIT_ACTOR_TYPES2, AUDIT_RETENTION_FLOOR2, auditLogs2, users2, backupCodes2, CREDENTIAL_TYPES2, credentials2, environmentSettings2, EVENT_RETENTION_FLOOR2, events2, flowAttempts2, hooks2, hookCallCounts2, IDENTITY_PROVIDERS2, identities2, instanceAuditLogs2, nativeApps2, OAUTH_PROVIDERS2, oauthProviders2, PASSKEY_CHALLENGE_PURPOSES2, passkeyChallenges2, passkeys2, passwordHistory2, proposals2, SESSION_CLIENTS2, SESSION_REVOKE_REASONS2, SESSION_TYPES2, sessions2, refreshTokens2, SIGNING_KEY_STATUSES2, signingKeys2, SMS_COUNT_RETENTION_FLOOR_DAYS2, smsCodeCounts2, USER_FACTOR_TYPES2, userFactors2, VERIFICATION_PURPOSES2, verificationTokens2, webhookEndpoints2, WEBHOOK_DELIVERY_STATES2, WEBHOOK_DELIVERY_RETENTION_FLOOR2, webhookDeliveries2, webhookDeliveryAttempts2, coreSchema2, MEMBERSHIP_ROLES2, INVITATION_ROLES2, ORGANIZATION_REGIONS2, ORGANIZATION_STATUSES2, INVITATION_STATES2, MEMBER_NAME_MAX2, IDEMPOTENCY_ROUTE_MAX2, IDEMPOTENCY_KEY_MAX2, IDEMPOTENCY_HASH_BYTES2, IDEMPOTENCY_RESPONSE_MAX_BYTES2, organizations2, memberships2, teams2, teamMembers2, invitations2, membershipDirectory2, invitationDirectory2, organizationState2, idempotencyKeys2, playbookSchema2, exports_schema };
