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
  ADDRESS_HASH_BYTES: () => ADDRESS_HASH_BYTES2,
  AGENT_KINDS: () => AGENT_KINDS2,
  AGENT_SETTING_CHANNELS: () => AGENT_SETTING_CHANNELS2,
  API_KEY_KINDS: () => API_KEY_KINDS2,
  API_KEY_ROLE_CEILINGS: () => API_KEY_ROLE_CEILINGS2,
  API_KEY_SCOPES: () => API_KEY_SCOPES2,
  ASSESSMENT_JUDGE_SOURCES: () => ASSESSMENT_JUDGE_SOURCES2,
  ASSESSMENT_SUBJECT_KINDS: () => ASSESSMENT_SUBJECT_KINDS2,
  ASSESSMENT_VERDICTS: () => ASSESSMENT_VERDICTS2,
  ATTEMPT_COUNTER_KEY_HASH_BYTES: () => ATTEMPT_COUNTER_KEY_HASH_BYTES2,
  ATTEMPT_COUNTER_KINDS: () => ATTEMPT_COUNTER_KINDS2,
  ATTEMPT_COUNTER_MAX_HITS: () => ATTEMPT_COUNTER_MAX_HITS2,
  AUDIT_ACTOR_KINDS: () => AUDIT_ACTOR_KINDS2,
  AUDIT_ACTOR_TYPES: () => AUDIT_ACTOR_TYPES2,
  AUDIT_RETENTION_FLOOR: () => AUDIT_RETENTION_FLOOR2,
  CALL_CHANNELS: () => CALL_CHANNELS2,
  CALL_FAILURE_REASONS: () => CALL_FAILURE_REASONS2,
  CALL_JOB_KINDS: () => CALL_JOB_KINDS2,
  CALL_JOB_MAX_ATTEMPTS: () => CALL_JOB_MAX_ATTEMPTS2,
  CALL_JOB_STATES: () => CALL_JOB_STATES2,
  CALL_KINDS: () => CALL_KINDS2,
  CALL_MAX_MOMENTS: () => CALL_MAX_MOMENTS2,
  CALL_MAX_RECORDING_BYTES: () => CALL_MAX_RECORDING_BYTES2,
  CALL_MAX_RECORDING_SECONDS: () => CALL_MAX_RECORDING_SECONDS2,
  CALL_MAX_SEQ: () => CALL_MAX_SEQ2,
  CALL_MAX_SPEAKERS: () => CALL_MAX_SPEAKERS2,
  CALL_MAX_TRANSCRIPT_BYTES: () => CALL_MAX_TRANSCRIPT_BYTES2,
  CALL_MAX_VENDOR_SENDS: () => CALL_MAX_VENDOR_SENDS2,
  CALL_MEDIA_TYPES: () => CALL_MEDIA_TYPES2,
  CALL_ORIGINS: () => CALL_ORIGINS2,
  CALL_PENDING_CLEANUP_PREDICATE: () => CALL_PENDING_CLEANUP_PREDICATE2,
  CALL_PURGE_MAX_ATTEMPTS: () => CALL_PURGE_MAX_ATTEMPTS2,
  CALL_REP_BY: () => CALL_REP_BY2,
  CALL_SPEAKER_LABEL_MAX_BYTES: () => CALL_SPEAKER_LABEL_MAX_BYTES2,
  CALL_SPEAKER_LABEL_MAX_LENGTH: () => CALL_SPEAKER_LABEL_MAX_LENGTH2,
  CALL_STATES: () => CALL_STATES2,
  CALL_VENDOR_ID_PATTERN: () => CALL_VENDOR_ID_PATTERN2,
  CONSENT_CHANNELS: () => CONSENT_CHANNELS2,
  CONSENT_EVENT_KINDS: () => CONSENT_EVENT_KINDS2,
  CONSENT_FORM_STATES: () => CONSENT_FORM_STATES2,
  CONSENT_GRANT_SOURCES: () => CONSENT_GRANT_SOURCES2,
  CONSENT_WITHDRAWAL_SOURCES: () => CONSENT_WITHDRAWAL_SOURCES2,
  CONSUMED_MESSAGE_STATES: () => CONSUMED_MESSAGE_STATES2,
  CONTACT_ALLOW_BASES: () => CONTACT_ALLOW_BASES2,
  CONTACT_CHECK_RETENTION_DAYS: () => CONTACT_CHECK_RETENTION_DAYS2,
  CONTACT_PURPOSES: () => CONTACT_PURPOSES2,
  CONTROL_LEVELS: () => CONTROL_LEVELS2,
  CONVERSATION_OUTCOME_LABELS: () => CONVERSATION_OUTCOME_LABELS2,
  CREDENTIAL_TYPES: () => CREDENTIAL_TYPES2,
  CRM_CONNECTION_STATES: () => CRM_CONNECTION_STATES2,
  CRM_DIRECTIONS: () => CRM_DIRECTIONS2,
  CRM_FIELD_KEYS: () => CRM_FIELD_KEYS2,
  CRM_MAPPING_KINDS: () => CRM_MAPPING_KINDS2,
  CRM_OBJECT_KINDS: () => CRM_OBJECT_KINDS2,
  CRM_PROVIDERS: () => CRM_PROVIDERS2,
  CRM_REF_STATES: () => CRM_REF_STATES2,
  CRM_RUN_ERROR_CODES: () => CRM_RUN_ERROR_CODES2,
  CRM_RUN_STATES: () => CRM_RUN_STATES2,
  CRM_RUN_TRIGGERS: () => CRM_RUN_TRIGGERS2,
  CRM_SCOPE_LEVELS: () => CRM_SCOPE_LEVELS2,
  CRM_SKIP_REASON_COUNT: () => CRM_SKIP_REASON_COUNT2,
  CRM_STAGE_OUTCOMES: () => CRM_STAGE_OUTCOMES2,
  CRM_WEBHOOK_WINDOW_SECONDS: () => CRM_WEBHOOK_WINDOW_SECONDS2,
  DEAL_ID_MAX_BYTES: () => DEAL_ID_MAX_BYTES2,
  DEAL_ID_MAX_LENGTH: () => DEAL_ID_MAX_LENGTH2,
  DEAL_IMPORT_APPLY_BATCH: () => DEAL_IMPORT_APPLY_BATCH2,
  DEAL_IMPORT_FAILURE_REASONS: () => DEAL_IMPORT_FAILURE_REASONS2,
  DEAL_IMPORT_MAX_ATTEMPTS: () => DEAL_IMPORT_MAX_ATTEMPTS2,
  DEAL_IMPORT_MAX_BYTES: () => DEAL_IMPORT_MAX_BYTES2,
  DEAL_IMPORT_MAX_ROWS: () => DEAL_IMPORT_MAX_ROWS2,
  DEAL_IMPORT_ROW_REASONS: () => DEAL_IMPORT_ROW_REASONS2,
  DEAL_IMPORT_ROW_REASONS_WITHOUT_DEAL_ID: () => DEAL_IMPORT_ROW_REASONS_WITHOUT_DEAL_ID2,
  DEAL_IMPORT_ROW_RESULTS: () => DEAL_IMPORT_ROW_RESULTS2,
  DEAL_IMPORT_STATES: () => DEAL_IMPORT_STATES2,
  DEAL_MAX_SEQ: () => DEAL_MAX_SEQ2,
  DEAL_NAME_MAX_BYTES: () => DEAL_NAME_MAX_BYTES2,
  DEAL_NAME_MAX_LENGTH: () => DEAL_NAME_MAX_LENGTH2,
  DEAL_OUTCOMES: () => DEAL_OUTCOMES2,
  DEFAULT_CHANNEL: () => DEFAULT_CHANNEL2,
  DEMO_NOTIFICATION_STATUSES: () => DEMO_NOTIFICATION_STATUSES2,
  DEMO_RATE_ADDRESS_HASH_BYTES: () => DEMO_RATE_ADDRESS_HASH_BYTES2,
  DEMO_REQUEST_KEY_LENGTH: () => DEMO_REQUEST_KEY_LENGTH2,
  DEMO_REQUEST_MESSAGE_MAX: () => DEMO_REQUEST_MESSAGE_MAX2,
  DEMO_REQUEST_NAME_MAX: () => DEMO_REQUEST_NAME_MAX2,
  DEMO_REQUEST_SOURCE_PAGE_MAX: () => DEMO_REQUEST_SOURCE_PAGE_MAX2,
  DOCUMENT_FAILURE_REASONS: () => DOCUMENT_FAILURE_REASONS2,
  DOCUMENT_FILE_TYPES: () => DOCUMENT_FILE_TYPES2,
  DOCUMENT_MAX_BYTES: () => DOCUMENT_MAX_BYTES2,
  DOCUMENT_MAX_PAGE_COUNT: () => DOCUMENT_MAX_PAGE_COUNT2,
  DOCUMENT_PURGE_MAX_ATTEMPTS: () => DOCUMENT_PURGE_MAX_ATTEMPTS2,
  DOCUMENT_STATES: () => DOCUMENT_STATES2,
  EMBED_USAGE_MAX_ADD: () => EMBED_USAGE_MAX_ADD2,
  EMBED_USAGE_MAX_MOMENTS: () => EMBED_USAGE_MAX_MOMENTS2,
  ENVIRONMENT_KINDS: () => ENVIRONMENT_KINDS2,
  EVENT_RETENTION_FLOOR: () => EVENT_RETENTION_FLOOR2,
  EXPORT_ACTIVE_STATES: () => EXPORT_ACTIVE_STATES2,
  EXPORT_FAILURE_REASONS: () => EXPORT_FAILURE_REASONS2,
  EXPORT_FORMATS: () => EXPORT_FORMATS2,
  EXPORT_KINDS: () => EXPORT_KINDS2,
  EXPORT_PART_FAILURE_REASONS: () => EXPORT_PART_FAILURE_REASONS2,
  EXPORT_PART_STATES: () => EXPORT_PART_STATES2,
  EXPORT_SERVICES: () => EXPORT_SERVICES2,
  EXPORT_STATES: () => EXPORT_STATES2,
  FIELD_HISTORY_STATES: () => FIELD_HISTORY_STATES2,
  FINDING_CATEGORIES: () => FINDING_CATEGORIES2,
  FINDING_FEEDBACKS: () => FINDING_FEEDBACKS2,
  FINDING_SEVERITIES: () => FINDING_SEVERITIES2,
  FORM_TOKEN_PATTERN: () => FORM_TOKEN_PATTERN2,
  GLOBAL_SCOPE_ORGANIZATION_ID: () => GLOBAL_SCOPE_ORGANIZATION_ID2,
  IDEMPOTENCY_HASH_BYTES: () => IDEMPOTENCY_HASH_BYTES2,
  IDEMPOTENCY_KEY_MAX: () => IDEMPOTENCY_KEY_MAX2,
  IDEMPOTENCY_RESPONSE_MAX_BYTES: () => IDEMPOTENCY_RESPONSE_MAX_BYTES2,
  IDEMPOTENCY_ROUTE_MAX: () => IDEMPOTENCY_ROUTE_MAX2,
  IDENTITY_PROVIDERS: () => IDENTITY_PROVIDERS2,
  IDENTITY_VALUE_PATTERNS: () => IDENTITY_VALUE_PATTERNS2,
  INGESTION_JOB_MAX_ATTEMPTS: () => INGESTION_JOB_MAX_ATTEMPTS2,
  INGESTION_JOB_STATES: () => INGESTION_JOB_STATES2,
  INGESTION_MAX_CHUNKS: () => INGESTION_MAX_CHUNKS2,
  INGESTION_STEPS: () => INGESTION_STEPS2,
  INTERNAL_CALL_USER_ID: () => INTERNAL_CALL_USER_ID2,
  INVITATION_ROLES: () => INVITATION_ROLES2,
  INVITATION_STATES: () => INVITATION_STATES2,
  LINE_ASSIGNMENT_KINDS: () => LINE_ASSIGNMENT_KINDS2,
  LINE_STATES: () => LINE_STATES2,
  LOGGED_DENIAL_CODES: () => LOGGED_DENIAL_CODES2,
  MAX_AGENT_INSTRUCTION_LENGTH: () => MAX_AGENT_INSTRUCTION_LENGTH2,
  MAX_API_KEY_NAME_LENGTH: () => MAX_API_KEY_NAME_LENGTH2,
  MAX_ASSESSED_NUMBER: () => MAX_ASSESSED_NUMBER2,
  MAX_AUDIT_METADATA_BYTES: () => MAX_AUDIT_METADATA_BYTES2,
  MAX_CALLER_LENGTH: () => MAX_CALLER_LENGTH2,
  MAX_CALL_DURATION_SECONDS: () => MAX_CALL_DURATION_SECONDS2,
  MAX_CONSENT_FORM_NAME_LENGTH: () => MAX_CONSENT_FORM_NAME_LENGTH2,
  MAX_CONSENT_WORDING_LENGTH: () => MAX_CONSENT_WORDING_LENGTH2,
  MAX_CRM_CURSOR_LENGTH: () => MAX_CRM_CURSOR_LENGTH2,
  MAX_CRM_EXTERNAL_ID_LENGTH: () => MAX_CRM_EXTERNAL_ID_LENGTH2,
  MAX_CRM_KEY_ID_LENGTH: () => MAX_CRM_KEY_ID_LENGTH2,
  MAX_CRM_LABEL_LENGTH: () => MAX_CRM_LABEL_LENGTH2,
  MAX_CRM_LOCAL_ID_LENGTH: () => MAX_CRM_LOCAL_ID_LENGTH2,
  MAX_CRM_RUN_COUNT: () => MAX_CRM_RUN_COUNT2,
  MAX_CRM_RUN_FAILURES: () => MAX_CRM_RUN_FAILURES2,
  MAX_CRM_SEALED_TOKEN_BYTES: () => MAX_CRM_SEALED_TOKEN_BYTES2,
  MAX_CRM_WRITE_KEY_LENGTH: () => MAX_CRM_WRITE_KEY_LENGTH2,
  MAX_ESCALATION_RULES: () => MAX_ESCALATION_RULES2,
  MAX_EVIDENCE_REF_LENGTH: () => MAX_EVIDENCE_REF_LENGTH2,
  MAX_EXPORT_PART_BYTES: () => MAX_EXPORT_PART_BYTES2,
  MAX_EXPORT_PART_FILES: () => MAX_EXPORT_PART_FILES2,
  MAX_EXPORT_PREFIX_LENGTH: () => MAX_EXPORT_PREFIX_LENGTH2,
  MAX_FIELD_HISTORY_ENTRIES: () => MAX_FIELD_HISTORY_ENTRIES2,
  MAX_FINDING_EXPLANATION_LENGTH: () => MAX_FINDING_EXPLANATION_LENGTH2,
  MAX_FINDING_SPAN_OFFSET: () => MAX_FINDING_SPAN_OFFSET2,
  MAX_FORM_TOKEN_LENGTH: () => MAX_FORM_TOKEN_LENGTH2,
  MAX_LINE_LABEL_LENGTH: () => MAX_LINE_LABEL_LENGTH2,
  MAX_MASKED_ADDRESS_LENGTH: () => MAX_MASKED_ADDRESS_LENGTH2,
  MAX_MERGED_PROSPECTS: () => MAX_MERGED_PROSPECTS2,
  MAX_MERGE_SNAPSHOT_BYTES: () => MAX_MERGE_SNAPSHOT_BYTES2,
  MAX_PROSPECT_COMPANY_NAME_LENGTH: () => MAX_PROSPECT_COMPANY_NAME_LENGTH2,
  MAX_PROSPECT_COMPANY_TECHNOLOGIES: () => MAX_PROSPECT_COMPANY_TECHNOLOGIES2,
  MAX_PROSPECT_COMPANY_TECHNOLOGY_LENGTH: () => MAX_PROSPECT_COMPANY_TECHNOLOGY_LENGTH2,
  MAX_PROSPECT_COMPANY_TEXT_LENGTH: () => MAX_PROSPECT_COMPANY_TEXT_LENGTH2,
  MAX_PROSPECT_FIELD_VALUE_LENGTH: () => MAX_PROSPECT_FIELD_VALUE_LENGTH2,
  MAX_PROSPECT_IMPORT_BYTES: () => MAX_PROSPECT_IMPORT_BYTES2,
  MAX_PROSPECT_IMPORT_ROWS: () => MAX_PROSPECT_IMPORT_ROWS2,
  MAX_PROSPECT_NOTES_LENGTH: () => MAX_PROSPECT_NOTES_LENGTH2,
  MAX_PROSPECT_TAGS: () => MAX_PROSPECT_TAGS2,
  MAX_PROSPECT_TAG_LENGTH: () => MAX_PROSPECT_TAG_LENGTH2,
  MAX_PROSPECT_TECHNOLOGIES_VALUE_LENGTH: () => MAX_PROSPECT_TECHNOLOGIES_VALUE_LENGTH2,
  MAX_PROVIDER_EVENT_ID_LENGTH: () => MAX_PROVIDER_EVENT_ID_LENGTH2,
  MAX_QUEUED_DEAL_IMPORTS: () => MAX_QUEUED_DEAL_IMPORTS2,
  MAX_RECORDING_KEY_LENGTH: () => MAX_RECORDING_KEY_LENGTH2,
  MAX_ROLLUP_COUNT: () => MAX_ROLLUP_COUNT2,
  MAX_ROLLUP_GROUP_KEY_LENGTH: () => MAX_ROLLUP_GROUP_KEY_LENGTH2,
  MAX_SEARCH_STATE_IDS: () => MAX_SEARCH_STATE_IDS2,
  MAX_SOURCE_DEALS: () => MAX_SOURCE_DEALS2,
  MAX_SOURCE_KEY_LENGTH: () => MAX_SOURCE_KEY_LENGTH2,
  MAX_SOURCE_REF_LENGTH: () => MAX_SOURCE_REF_LENGTH2,
  MAX_SUBMISSION_IP_LENGTH: () => MAX_SUBMISSION_IP_LENGTH2,
  MAX_SUBMISSION_USER_AGENT_LENGTH: () => MAX_SUBMISSION_USER_AGENT_LENGTH2,
  MAX_SUGGESTION_MOMENTS: () => MAX_SUGGESTION_MOMENTS2,
  MAX_SUGGESTION_TEXT_LENGTH: () => MAX_SUGGESTION_TEXT_LENGTH2,
  MAX_SUMMARY_LENGTH: () => MAX_SUMMARY_LENGTH2,
  MAX_SUPPRESSION_NOTE_LENGTH: () => MAX_SUPPRESSION_NOTE_LENGTH2,
  MAX_SUPPRESSION_SOURCE_REF_LENGTH: () => MAX_SUPPRESSION_SOURCE_REF_LENGTH2,
  MAX_TOUCH_SOURCES: () => MAX_TOUCH_SOURCES2,
  MAX_VOICE_IDEMPOTENCY_KEY_LENGTH: () => MAX_VOICE_IDEMPOTENCY_KEY_LENGTH2,
  MAX_WRAP_UP_NOTE_LENGTH: () => MAX_WRAP_UP_NOTE_LENGTH2,
  MEMBERSHIP_ROLES: () => MEMBERSHIP_ROLES2,
  MEMBER_NAME_MAX: () => MEMBER_NAME_MAX2,
  MIN_FORM_TOKEN_LENGTH: () => MIN_FORM_TOKEN_LENGTH2,
  OAUTH_PROVIDERS: () => OAUTH_PROVIDERS2,
  ORGANIZATION_AGENT_KIND: () => ORGANIZATION_AGENT_KIND2,
  ORGANIZATION_REGIONS: () => ORGANIZATION_REGIONS2,
  ORGANIZATION_STATUSES: () => ORGANIZATION_STATUSES2,
  ORPHAN_SWEEP_CURSOR_MAX_BYTES: () => ORPHAN_SWEEP_CURSOR_MAX_BYTES2,
  ORPHAN_SWEEP_MAX_CLAIM_MS: () => ORPHAN_SWEEP_MAX_CLAIM_MS2,
  ORPHAN_SWEEP_MIN_CLAIM_MS: () => ORPHAN_SWEEP_MIN_CLAIM_MS2,
  PASSKEY_CHALLENGE_PURPOSES: () => PASSKEY_CHALLENGE_PURPOSES2,
  PENDING_CLEANUP_PREDICATE: () => PENDING_CLEANUP_PREDICATE2,
  PROSPECT_COMPANY_FIELD_NAMES: () => PROSPECT_COMPANY_FIELD_NAMES2,
  PROSPECT_FIELD_NAMES: () => PROSPECT_FIELD_NAMES2,
  PROSPECT_IDENTITY_KINDS: () => PROSPECT_IDENTITY_KINDS2,
  PROSPECT_IMPORT_FAILURE_REASONS: () => PROSPECT_IMPORT_FAILURE_REASONS2,
  PROSPECT_IMPORT_REJECT_REASONS: () => PROSPECT_IMPORT_REJECT_REASONS2,
  PROSPECT_IMPORT_ROW_RESULTS: () => PROSPECT_IMPORT_ROW_RESULTS2,
  PROSPECT_IMPORT_SKIP_REASONS: () => PROSPECT_IMPORT_SKIP_REASONS2,
  PROSPECT_IMPORT_STATES: () => PROSPECT_IMPORT_STATES2,
  PROSPECT_MERGE_STATES: () => PROSPECT_MERGE_STATES2,
  PROSPECT_MERGE_UNDO_DAYS: () => PROSPECT_MERGE_UNDO_DAYS2,
  PROSPECT_STATUSES: () => PROSPECT_STATUSES2,
  RIGHTS_MAX_WORDING_VERSION: () => RIGHTS_MAX_WORDING_VERSION2,
  ROLLUP_GROUP_KINDS: () => ROLLUP_GROUP_KINDS2,
  ROLLUP_METRICS: () => ROLLUP_METRICS2,
  SESSION_CLIENTS: () => SESSION_CLIENTS2,
  SESSION_REVOKE_REASONS: () => SESSION_REVOKE_REASONS2,
  SESSION_TYPES: () => SESSION_TYPES2,
  SIGNING_KEY_STATUSES: () => SIGNING_KEY_STATUSES2,
  SMS_COUNT_RETENTION_FLOOR_DAYS: () => SMS_COUNT_RETENTION_FLOOR_DAYS2,
  SOURCE_KINDS: () => SOURCE_KINDS2,
  SOURCE_KIND_PATTERN: () => SOURCE_KIND_PATTERN2,
  SOURCE_PERFORMANCE_FLAGS: () => SOURCE_PERFORMANCE_FLAGS2,
  SUGGESTION_FINGERPRINT_BYTES: () => SUGGESTION_FINGERPRINT_BYTES2,
  SUGGESTION_KINDS: () => SUGGESTION_KINDS2,
  SUGGESTION_STATUSES: () => SUGGESTION_STATUSES2,
  SUPPRESSION_ADDRESS_KINDS: () => SUPPRESSION_ADDRESS_KINDS2,
  SUPPRESSION_REASONS: () => SUPPRESSION_REASONS2,
  SUPPRESSION_REMOVABLE_REASONS: () => SUPPRESSION_REMOVABLE_REASONS2,
  TOUCH_AGENT_KINDS: () => TOUCH_AGENT_KINDS2,
  TOUCH_CHANNELS: () => TOUCH_CHANNELS2,
  TOUCH_KINDS: () => TOUCH_KINDS2,
  USER_FACTOR_TYPES: () => USER_FACTOR_TYPES2,
  VERIFICATION_PURPOSES: () => VERIFICATION_PURPOSES2,
  VOICE_CALL_DIRECTIONS: () => VOICE_CALL_DIRECTIONS2,
  VOICE_CALL_ENDED_BY: () => VOICE_CALL_ENDED_BY2,
  VOICE_CALL_EVENT_KINDS: () => VOICE_CALL_EVENT_KINDS2,
  VOICE_CALL_FAILURE_REASONS: () => VOICE_CALL_FAILURE_REASONS2,
  VOICE_CALL_FINAL_STATES: () => VOICE_CALL_FINAL_STATES2,
  VOICE_CALL_STATES: () => VOICE_CALL_STATES2,
  VOICE_RECORDING_CHANNELS: () => VOICE_RECORDING_CHANNELS2,
  VOICE_RECORDING_STATES: () => VOICE_RECORDING_STATES2,
  VOICE_TRANSCRIPT_STATES: () => VOICE_TRANSCRIPT_STATES2,
  WEBHOOK_DELIVERY_RETENTION_FLOOR: () => WEBHOOK_DELIVERY_RETENTION_FLOOR2,
  WEBHOOK_DELIVERY_STATES: () => WEBHOOK_DELIVERY_STATES2,
  WORK_KINDS: () => WORK_KINDS2,
  abandonCases: () => abandonCases2,
  agentInstructionPointers: () => agentInstructionPointers2,
  agentInstructionVersions: () => agentInstructionVersions2,
  agentSettings: () => agentSettings2,
  apiKeyUsage: () => apiKeyUsage2,
  apiKeys: () => apiKeys2,
  assessmentFindings: () => assessmentFindings2,
  assessments: () => assessments2,
  attemptCounters: () => attemptCounters2,
  auditEvents: () => auditEvents2,
  auditLogs: () => auditLogs2,
  authSchema: () => authSchema2,
  backupCodes: () => backupCodes2,
  callJobs: () => callJobs2,
  callReuploadRequeues: () => callReuploadRequeues2,
  callVendorSends: () => callVendorSends2,
  calls: () => calls2,
  consentFormDirectory: () => consentFormDirectory2,
  consentForms: () => consentForms2,
  consentWordings: () => consentWordings2,
  consumedMessage: () => consumedMessage2,
  contactCheckLog: () => contactCheckLog2,
  contactConsentEvents: () => contactConsentEvents2,
  conversationSummaries: () => conversationSummaries2,
  coreApiKeys: () => coreApiKeys2,
  coreSchema: () => coreSchema2,
  credentials: () => credentials2,
  crmConnections: () => crmConnections2,
  crmExternalRefs: () => crmExternalRefs2,
  crmMappings: () => crmMappings2,
  crmSyncRuns: () => crmSyncRuns2,
  crmWebhookReceipts: () => crmWebhookReceipts2,
  dealImportRows: () => dealImportRows2,
  dealImports: () => dealImports2,
  deals: () => deals2,
  demoRateCounters: () => demoRateCounters2,
  demoRequests: () => demoRequests2,
  documents: () => documents2,
  environmentSettings: () => environmentSettings2,
  environments: () => environments2,
  events: () => events2,
  exportJobs: () => exportJobs2,
  exportParts: () => exportParts2,
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
  playbookEmbedUsage: () => playbookEmbedUsage2,
  playbookIdempotencyKeys: () => playbookIdempotencyKeys2,
  playbookOrphanSweeps: () => playbookOrphanSweeps2,
  playbookSchema: () => playbookSchema2,
  playbookWorkHints: () => playbookWorkHints2,
  projects: () => projects2,
  proposals: () => proposals2,
  prospectCompanies: () => prospectCompanies2,
  prospectCompanyFields: () => prospectCompanyFields2,
  prospectFields: () => prospectFields2,
  prospectIdentities: () => prospectIdentities2,
  prospectImportRows: () => prospectImportRows2,
  prospectImports: () => prospectImports2,
  prospectMerges: () => prospectMerges2,
  prospects: () => prospects2,
  refreshTokens: () => refreshTokens2,
  repChangeAllowed: () => repChangeAllowed2,
  rightsConfirmations: () => rightsConfirmations2,
  rollupDaily: () => rollupDaily2,
  sessions: () => sessions2,
  signingKeys: () => signingKeys2,
  smsCodeCounts: () => smsCodeCounts2,
  sourcePerformance: () => sourcePerformance2,
  suggestions: () => suggestions2,
  suppressionEntries: () => suppressionEntries2,
  teamMembers: () => teamMembers2,
  teams: () => teams2,
  touches: () => touches2,
  userFactors: () => userFactors2,
  users: () => users2,
  verificationTokens: () => verificationTokens2,
  voiceCallEvents: () => voiceCallEvents2,
  voiceCalls: () => voiceCalls2,
  voiceIdempotencyKeys: () => voiceIdempotencyKeys2,
  voiceLineDirectory: () => voiceLineDirectory2,
  voiceLines: () => voiceLines2,
  voiceRecordings: () => voiceRecordings2,
  voiceSchema: () => voiceSchema2,
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
// src/schema/core-analytics.ts
import { sql as sql18 } from "drizzle-orm";
import {
  bigint as bigint3,
  boolean as boolean6,
  check as check13,
  date as date2,
  foreignKey as foreignKey5,
  index as index24,
  integer as integer13,
  jsonb as jsonb11,
  primaryKey as primaryKey4,
  smallint as smallint2,
  text as text33,
  timestamp as timestamp26,
  uniqueIndex as uniqueIndex3
} from "drizzle-orm/pg-core";

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
  index23("memberships_organization_email_idx").on(t.organizationId, t.email),
  index23("memberships_name_trgm_idx").using("gin", t.name.op("gin_trgm_ops"))
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

// src/schema/core-analytics.ts
var ROLLUP_METRICS2 = [
  "sends",
  "replies",
  "positive_replies",
  "meetings",
  "outcomes_won",
  "outcomes_lost"
];
var ROLLUP_GROUP_KINDS2 = ["total", "channel", "agent_kind", "campaign", "rep"];
var MAX_ROLLUP_GROUP_KEY_LENGTH2 = 64;
var MAX_ROLLUP_COUNT2 = 1000000000000;
var TOUCH_KINDS2 = ["message", "call"];
var TOUCH_CHANNELS2 = ["email", "linkedin", "chat", "phone"];
var TOUCH_AGENT_KINDS2 = ["inbound", "outbound"];
var MAX_TOUCH_SOURCES2 = 20;
var SOURCE_KINDS2 = ["moment", "document"];
var MAX_SOURCE_KEY_LENGTH2 = 120;
var SOURCE_PERFORMANCE_FLAGS2 = ["cited_often_lost"];
var MAX_SOURCE_DEALS2 = 1e9;
var ASSESSMENT_SUBJECT_KINDS2 = ["draft", "call_turn"];
var ASSESSMENT_VERDICTS2 = ["pass", "warn", "fail"];
var ASSESSMENT_JUDGE_SOURCES2 = ["model", "rules"];
var FINDING_CATEGORIES2 = [
  "unsupported_claim",
  "policy_deviation",
  "missing_disclosure",
  "tone"
];
var FINDING_SEVERITIES2 = ["low", "medium", "high"];
var FINDING_FEEDBACKS2 = ["correct", "false_alarm"];
var MAX_FINDING_SPAN_OFFSET2 = 20000;
var MAX_FINDING_EXPLANATION_LENGTH2 = 500;
var MAX_ASSESSED_NUMBER2 = 1e5;
var CONVERSATION_OUTCOME_LABELS2 = [
  "won",
  "lost",
  "open",
  "no_response",
  "meeting_booked"
];
var MAX_SUMMARY_LENGTH2 = 500;
var list2 = (values) => sql18.raw(values.map((v) => `'${v}'`).join(", "));
var idShape2 = (column, prefix) => sql18.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape = sql18.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal = sql18.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts = (name) => timestamp26(name, { withTimezone: true });
var num = (n) => sql18.raw(String(n));
var orgRef = () => text33("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" });
var rollupDaily2 = coreSchema2.table("rollup_daily", {
  organizationId: orgRef(),
  metric: text33("metric", { enum: ROLLUP_METRICS2 }).notNull(),
  groupKind: text33("group_kind", { enum: ROLLUP_GROUP_KINDS2 }).notNull(),
  day: date2("day", { mode: "string" }).notNull(),
  groupKey: text33("group_key").notNull().default(""),
  count: bigint3("count", { mode: "number" }).notNull().default(0),
  updatedAt: ts("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey4({
    name: "rollup_daily_pkey",
    columns: [t.organizationId, t.metric, t.groupKind, t.day, t.groupKey]
  }),
  check13("rollup_daily_organization_id_shape", orgShape),
  check13("rollup_daily_organization_not_global", notGlobal),
  check13("rollup_daily_metric_known", sql18`${t.metric} in (${list2(ROLLUP_METRICS2)})`),
  check13("rollup_daily_group_kind_known", sql18`${t.groupKind} in (${list2(ROLLUP_GROUP_KINDS2)})`),
  check13("rollup_daily_group_key_shape", sql18`(${t.groupKind} = 'total' and ${t.groupKey} = '')
        or (${t.groupKind} <> 'total' and char_length(${t.groupKey}) between 1 and ${num(MAX_ROLLUP_GROUP_KEY_LENGTH2)})`),
  check13("rollup_daily_count_bounds", sql18`${t.count} between 0 and ${num(MAX_ROLLUP_COUNT2)}`)
]);
var touches2 = coreSchema2.table("touches", {
  id: text33("id").notNull(),
  organizationId: orgRef(),
  kind: text33("kind", { enum: TOUCH_KINDS2 }).notNull(),
  refId: text33("ref_id").notNull(),
  prospectId: text33("prospect_id").notNull(),
  channel: text33("channel", { enum: TOUCH_CHANNELS2 }),
  agentKind: text33("agent_kind", { enum: TOUCH_AGENT_KINDS2 }),
  repMembershipId: text33("rep_membership_id"),
  campaignId: text33("campaign_id"),
  occurredAt: ts("occurred_at").notNull(),
  dealRecordId: text33("deal_record_id"),
  firstTouch: boolean6("first_touch").notNull().default(false),
  lastTouch: boolean6("last_touch").notNull().default(false),
  citedSources: jsonb11("cited_sources").notNull().default(sql18`'[]'::jsonb`),
  createdAt: ts("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey4({ name: "touches_pkey", columns: [t.organizationId, t.id] }),
  check13("touches_id_shape", idShape2("id", "tch")),
  check13("touches_organization_id_shape", orgShape),
  check13("touches_organization_not_global", notGlobal),
  check13("touches_kind_known", sql18`${t.kind} in (${list2(TOUCH_KINDS2)})`),
  check13("touches_ref_id_shape", sql18`(${t.kind} = 'message' and ${t.refId} ~ '^msg_[0-9a-f]{32}$')
        or (${t.kind} = 'call' and ${t.refId} ~ '^call_[0-9a-f]{32}$')`),
  check13("touches_prospect_id_shape", idShape2("prospect_id", "prs")),
  check13("touches_channel_known", sql18`${t.channel} in (${list2(TOUCH_CHANNELS2)})`),
  check13("touches_agent_kind_known", sql18`${t.agentKind} in (${list2(TOUCH_AGENT_KINDS2)})`),
  check13("touches_rep_membership_id_shape", sql18`${t.repMembershipId} is null or ${t.repMembershipId} ~ '^mem_[0-9a-f]{32}$'`),
  check13("touches_campaign_id_shape", sql18`${t.campaignId} is null or ${t.campaignId} ~ '^cpg_[0-9a-f]{32}$'`),
  check13("touches_deal_record_id_shape", sql18`${t.dealRecordId} is null or ${t.dealRecordId} ~ '^deal_[0-9a-f]{32}$'`),
  check13("touches_credit_needs_deal", sql18`${t.dealRecordId} is not null or (not ${t.firstTouch} and not ${t.lastTouch})`),
  check13("touches_cited_sources_shape", sql18`jsonb_typeof(${t.citedSources}) = 'array' and jsonb_array_length(${t.citedSources}) <= ${num(MAX_TOUCH_SOURCES2)}`),
  uniqueIndex3("touches_ref_key").on(t.organizationId, t.kind, t.refId),
  index24("touches_prospect_idx").on(t.organizationId, t.prospectId, t.occurredAt.desc(), t.id.desc()),
  index24("touches_deal_idx").on(t.organizationId, t.dealRecordId, t.occurredAt.desc(), t.id.desc()).where(sql18`${t.dealRecordId} is not null`)
]);
var sourcePerformance2 = coreSchema2.table("source_performance", {
  organizationId: orgRef(),
  sourceKind: text33("source_kind", { enum: SOURCE_KINDS2 }).notNull(),
  sourceKey: text33("source_key").notNull(),
  dealsTouched: integer13("deals_touched").notNull().default(0),
  dealsWon: integer13("deals_won").notNull().default(0),
  flag: text33("flag", { enum: SOURCE_PERFORMANCE_FLAGS2 }),
  updatedAt: ts("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey4({
    name: "source_performance_pkey",
    columns: [t.organizationId, t.sourceKind, t.sourceKey]
  }),
  check13("source_performance_organization_id_shape", orgShape),
  check13("source_performance_organization_not_global", notGlobal),
  check13("source_performance_kind_known", sql18`${t.sourceKind} in (${list2(SOURCE_KINDS2)})`),
  check13("source_performance_key_length", sql18`char_length(${t.sourceKey}) between 1 and ${num(MAX_SOURCE_KEY_LENGTH2)}`),
  check13("source_performance_counts", sql18`${t.dealsTouched} between 0 and ${num(MAX_SOURCE_DEALS2)} and ${t.dealsWon} between 0 and ${t.dealsTouched}`),
  check13("source_performance_flag_known", sql18`${t.flag} in (${list2(SOURCE_PERFORMANCE_FLAGS2)})`),
  index24("source_performance_list_idx").on(t.organizationId, t.dealsTouched.desc(), t.sourceKind.desc(), t.sourceKey.desc()),
  index24("source_performance_flag_idx").on(t.organizationId, t.sourceKind, t.sourceKey).where(sql18`${t.flag} is not null`)
]);
var assessments2 = coreSchema2.table("assessments", {
  id: text33("id").notNull(),
  organizationId: orgRef(),
  subjectKind: text33("subject_kind", { enum: ASSESSMENT_SUBJECT_KINDS2 }).notNull(),
  draftId: text33("draft_id"),
  draftVersion: integer13("draft_version"),
  callId: text33("call_id"),
  turnIndex: integer13("turn_index"),
  prospectId: text33("prospect_id"),
  agentKind: text33("agent_kind", { enum: TOUCH_AGENT_KINDS2 }).notNull(),
  instructionVersion: integer13("instruction_version"),
  verdict: text33("verdict", { enum: ASSESSMENT_VERDICTS2 }).notNull(),
  judgeSource: text33("judge_source", { enum: ASSESSMENT_JUDGE_SOURCES2 }).notNull().default("model"),
  worstSeverityRank: smallint2("worst_severity_rank"),
  createdAt: ts("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey4({ name: "assessments_pkey", columns: [t.organizationId, t.id] }),
  check13("assessments_id_shape", idShape2("id", "asm")),
  check13("assessments_organization_id_shape", orgShape),
  check13("assessments_organization_not_global", notGlobal),
  check13("assessments_subject_kind_known", sql18`${t.subjectKind} in (${list2(ASSESSMENT_SUBJECT_KINDS2)})`),
  check13("assessments_subject_columns", sql18`(${t.subjectKind} = 'draft' and ${t.draftId} ~ '^drf_[0-9a-f]{32}$'
          and ${t.draftVersion} between 1 and ${num(MAX_ASSESSED_NUMBER2)}
          and ${t.callId} is null and ${t.turnIndex} is null)
        or (${t.subjectKind} = 'call_turn' and ${t.callId} ~ '^call_[0-9a-f]{32}$'
          and ${t.turnIndex} between 0 and ${num(MAX_ASSESSED_NUMBER2)}
          and ${t.draftId} is null and ${t.draftVersion} is null)`),
  check13("assessments_prospect_id_shape", sql18`${t.prospectId} is null or ${t.prospectId} ~ '^prs_[0-9a-f]{32}$'`),
  check13("assessments_agent_kind_known", sql18`${t.agentKind} in (${list2(TOUCH_AGENT_KINDS2)})`),
  check13("assessments_instruction_version_positive", sql18`${t.instructionVersion} is null or ${t.instructionVersion} >= 1`),
  check13("assessments_verdict_known", sql18`${t.verdict} in (${list2(ASSESSMENT_VERDICTS2)})`),
  check13("assessments_judge_source_known", sql18`${t.judgeSource} in (${list2(ASSESSMENT_JUDGE_SOURCES2)})`),
  check13("assessments_severity_rank", sql18`(${t.worstSeverityRank} is null or ${t.worstSeverityRank} between 1 and ${num(FINDING_SEVERITIES2.length)})
        and (${t.verdict} <> 'pass' or ${t.worstSeverityRank} is null)
        and (${t.verdict} <> 'fail' or ${t.worstSeverityRank} is not null)`),
  uniqueIndex3("assessments_draft_key").on(t.organizationId, t.draftId, t.draftVersion).where(sql18`${t.subjectKind} = 'draft'`),
  uniqueIndex3("assessments_call_turn_key").on(t.organizationId, t.callId, t.turnIndex).where(sql18`${t.subjectKind} = 'call_turn'`),
  index24("assessments_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index24("assessments_verdict_idx").on(t.organizationId, t.verdict, t.createdAt.desc(), t.id.desc()),
  index24("assessments_review_idx").on(t.organizationId, t.worstSeverityRank.desc(), t.createdAt.desc(), t.id.desc()).where(sql18`${t.verdict} <> 'pass'`),
  index24("assessments_rate_idx").on(t.organizationId, t.agentKind, t.instructionVersion, t.createdAt)
]);
var assessmentFindings2 = coreSchema2.table("assessment_findings", {
  id: text33("id").notNull(),
  organizationId: orgRef(),
  assessmentId: text33("assessment_id").notNull(),
  category: text33("category", { enum: FINDING_CATEGORIES2 }).notNull(),
  severity: text33("severity", { enum: FINDING_SEVERITIES2 }).notNull(),
  spanStart: integer13("span_start").notNull(),
  spanEnd: integer13("span_end").notNull(),
  explanation: text33("explanation").notNull(),
  feedback: text33("feedback", { enum: FINDING_FEEDBACKS2 }),
  feedbackByMembershipId: text33("feedback_by_membership_id"),
  feedbackAt: ts("feedback_at"),
  createdAt: ts("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey4({ name: "assessment_findings_pkey", columns: [t.organizationId, t.id] }),
  foreignKey5({
    name: "assessment_findings_assessment_fk",
    columns: [t.organizationId, t.assessmentId],
    foreignColumns: [assessments2.organizationId, assessments2.id]
  }).onDelete("cascade"),
  check13("assessment_findings_id_shape", idShape2("id", "fnd")),
  check13("assessment_findings_organization_id_shape", orgShape),
  check13("assessment_findings_organization_not_global", notGlobal),
  check13("assessment_findings_assessment_id_shape", idShape2("assessment_id", "asm")),
  check13("assessment_findings_category_known", sql18`${t.category} in (${list2(FINDING_CATEGORIES2)})`),
  check13("assessment_findings_severity_known", sql18`${t.severity} in (${list2(FINDING_SEVERITIES2)})`),
  check13("assessment_findings_span_bounds", sql18`${t.spanStart} between 0 and ${num(MAX_FINDING_SPAN_OFFSET2)}
        and ${t.spanEnd} between 1 and ${num(MAX_FINDING_SPAN_OFFSET2)}
        and ${t.spanEnd} > ${t.spanStart}`),
  check13("assessment_findings_explanation_length", sql18`char_length(${t.explanation}) between 1 and ${num(MAX_FINDING_EXPLANATION_LENGTH2)}`),
  check13("assessment_findings_feedback_known", sql18`${t.feedback} in (${list2(FINDING_FEEDBACKS2)})`),
  check13("assessment_findings_feedback_by_shape", sql18`${t.feedbackByMembershipId} is null or ${t.feedbackByMembershipId} ~ '^mem_[0-9a-f]{32}$'`),
  check13("assessment_findings_feedback_complete", sql18`(${t.feedback} is null) = (${t.feedbackByMembershipId} is null)
        and (${t.feedback} is null) = (${t.feedbackAt} is null)`),
  index24("assessment_findings_assessment_idx").on(t.organizationId, t.assessmentId, t.id)
]);
var conversationSummaries2 = coreSchema2.table("conversation_summaries", {
  organizationId: orgRef(),
  conversationId: text33("conversation_id").notNull(),
  summary: text33("summary").notNull(),
  outcomeLabel: text33("outcome_label", { enum: CONVERSATION_OUTCOME_LABELS2 }).notNull(),
  generatedAt: ts("generated_at").notNull().defaultNow()
}, (t) => [
  primaryKey4({
    name: "conversation_summaries_pkey",
    columns: [t.organizationId, t.conversationId]
  }),
  check13("conversation_summaries_organization_id_shape", orgShape),
  check13("conversation_summaries_organization_not_global", notGlobal),
  check13("conversation_summaries_conversation_id_shape", idShape2("conversation_id", "cnv")),
  check13("conversation_summaries_summary_length", sql18`char_length(${t.summary}) between 1 and ${num(MAX_SUMMARY_LENGTH2)}`),
  check13("conversation_summaries_outcome_label_known", sql18`${t.outcomeLabel} in (${list2(CONVERSATION_OUTCOME_LABELS2)})`)
]);
// src/schema/core-consent.ts
import { sql as sql20 } from "drizzle-orm";
import {
  bigint as bigint5,
  boolean as boolean8,
  check as check15,
  customType as customType5,
  foreignKey as foreignKey7,
  index as index26,
  integer as integer15,
  primaryKey as primaryKey6,
  text as text35,
  timestamp as timestamp28,
  uniqueIndex as uniqueIndex5
} from "drizzle-orm/pg-core";

// src/schema/core-prospects.ts
import { sql as sql19 } from "drizzle-orm";
import {
  bigint as bigint4,
  boolean as boolean7,
  check as check14,
  customType as customType4,
  foreignKey as foreignKey6,
  index as index25,
  integer as integer14,
  jsonb as jsonb12,
  primaryKey as primaryKey5,
  text as text34,
  timestamp as timestamp27,
  uniqueIndex as uniqueIndex4
} from "drizzle-orm/pg-core";
var PROSPECT_IDENTITY_KINDS2 = ["email", "phone", "linkedin"];
var PROSPECT_STATUSES2 = ["active", "archived"];
var PROSPECT_FIELD_NAMES2 = [
  "first_name",
  "last_name",
  "job_title",
  "email",
  "phone",
  "linkedin_url"
];
var PROSPECT_COMPANY_FIELD_NAMES2 = [
  "name",
  "domain",
  "industry",
  "employee_count",
  "region",
  "technologies"
];
var MAX_PROSPECT_COMPANY_TEXT_LENGTH2 = 200;
var MAX_PROSPECT_TECHNOLOGIES_VALUE_LENGTH2 = 5300;
var MAX_PROSPECT_COMPANY_TECHNOLOGIES2 = 50;
var MAX_PROSPECT_COMPANY_TECHNOLOGY_LENGTH2 = 100;
var FIELD_HISTORY_STATES2 = ["current", "superseded", "suggested"];
var MAX_FIELD_HISTORY_ENTRIES2 = 50;
var MAX_PROSPECT_FIELD_VALUE_LENGTH2 = 320;
var MAX_SOURCE_REF_LENGTH2 = 200;
var MAX_PROSPECT_COMPANY_NAME_LENGTH2 = 200;
var MAX_PROSPECT_NOTES_LENGTH2 = 5000;
var MAX_PROSPECT_TAG_LENGTH2 = 50;
var MAX_PROSPECT_TAGS2 = 20;
var MAX_PROSPECT_IMPORT_BYTES2 = 10 * 1024 * 1024;
var MAX_PROSPECT_IMPORT_ROWS2 = 50000;
var PROSPECT_IMPORT_STATES2 = ["uploaded", "processing", "completed", "failed"];
var PROSPECT_IMPORT_FAILURE_REASONS2 = ["too_many_rows", "unreadable"];
var PROSPECT_IMPORT_ROW_RESULTS2 = ["created", "updated", "skipped", "rejected"];
var PROSPECT_IMPORT_SKIP_REASONS2 = ["no_change", "manual_values_kept"];
var PROSPECT_IMPORT_REJECT_REASONS2 = [
  "wrong_column_count",
  "blank_row",
  "missing_identity",
  "invalid_email",
  "invalid_phone",
  "invalid_linkedin_url",
  "invalid_name",
  "invalid_job_title",
  "invalid_company",
  "invalid_tags",
  "owner_not_found",
  "owner_not_allowed",
  "duplicate_in_file",
  "identity_conflict"
];
var PROSPECT_MERGE_STATES2 = ["merged", "undone"];
var PROSPECT_MERGE_UNDO_DAYS2 = 30;
var MAX_MERGED_PROSPECTS2 = 5;
var MAX_MERGE_SNAPSHOT_BYTES2 = 4 * 1024 * 1024;
var SOURCE_KIND_PATTERN2 = "^(manual|import|crm:hubspot|crm:salesforce|form|enrichment:[a-z][a-z0-9_]{0,31})$";
var IDENTITY_VALUE_PATTERNS2 = {
  phone: "^\\+[1-9][0-9]{6,14}$",
  linkedin: "^linkedin\\.com(/[a-z0-9%._~-]+)+$"
};
var list3 = (values) => sql19.raw(values.map((v) => `'${v}'`).join(", "));
var idShape3 = (column, prefix) => sql19.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape2 = sql19.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal2 = sql19.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts2 = (name) => timestamp27(name, { withTimezone: true });
var createdAt2 = () => ts2("created_at").notNull().defaultNow();
var updatedAt2 = () => ts2("updated_at").notNull().defaultNow();
var bytes4 = customType4({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var textArray = customType4({
  dataType: () => "text[]"
});
var prospectCompanies2 = coreSchema2.table("prospect_companies", {
  id: text34("id").notNull(),
  organizationId: text34("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  name: text34("name").notNull(),
  domain: text34("domain"),
  industry: text34("industry"),
  employeeCount: integer14("employee_count"),
  region: text34("region"),
  technologies: textArray("technologies"),
  createdAt: createdAt2(),
  updatedAt: updatedAt2()
}, (t) => [
  primaryKey5({ name: "prospect_companies_pkey", columns: [t.organizationId, t.id] }),
  check14("prospect_companies_id_shape", idShape3("id", "pco")),
  check14("prospect_companies_organization_id_shape", orgShape2),
  check14("prospect_companies_organization_not_global", notGlobal2),
  check14("prospect_companies_name_shape", sql19`char_length(${t.name}) between 1 and ${sql19.raw(String(MAX_PROSPECT_COMPANY_NAME_LENGTH2))} and ${t.name} = btrim(${t.name})`),
  check14("prospect_companies_domain_shape", sql19`${t.domain} is null or (char_length(${t.domain}) between 3 and 253
        and ${t.domain} collate "C" ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$')`),
  check14("prospect_companies_industry_shape", sql19`${t.industry} is null or (char_length(${t.industry}) between 1 and ${sql19.raw(String(MAX_PROSPECT_COMPANY_TEXT_LENGTH2))} and ${t.industry} = btrim(${t.industry}))`),
  check14("prospect_companies_region_shape", sql19`${t.region} is null or (char_length(${t.region}) between 1 and ${sql19.raw(String(MAX_PROSPECT_COMPANY_TEXT_LENGTH2))} and ${t.region} = btrim(${t.region}))`),
  check14("prospect_companies_employee_count_shape", sql19`${t.employeeCount} is null or ${t.employeeCount} >= 0`),
  check14("prospect_companies_technologies_shape", sql19`${t.technologies} is null or core.prospect_technologies_valid(${t.technologies})`),
  uniqueIndex4("prospect_companies_domain_key").on(t.organizationId, t.domain).where(sql19`${t.domain} is not null`),
  index25("prospect_companies_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index25("prospect_companies_name_trgm_idx").using("gin", t.name.op("gin_trgm_ops")),
  index25("prospect_companies_domain_trgm_idx").using("gin", t.domain.op("gin_trgm_ops")).where(sql19`${t.domain} is not null`)
]);
var prospects2 = coreSchema2.table("prospects", {
  id: text34("id").notNull(),
  organizationId: text34("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  companyId: text34("company_id"),
  ownerMembershipId: text34("owner_membership_id"),
  status: text34("status", { enum: PROSPECT_STATUSES2 }).notNull().default("active"),
  source: text34("source").notNull(),
  tags: textArray("tags").notNull().default(sql19`'{}'::text[]`),
  notes: text34("notes"),
  createdAt: createdAt2(),
  updatedAt: updatedAt2()
}, (t) => [
  primaryKey5({ name: "prospects_pkey", columns: [t.organizationId, t.id] }),
  check14("prospects_id_shape", idShape3("id", "prs")),
  check14("prospects_organization_id_shape", orgShape2),
  check14("prospects_organization_not_global", notGlobal2),
  check14("prospects_company_id_shape", idShape3("company_id", "pco")),
  check14("prospects_owner_membership_id_shape", idShape3("owner_membership_id", "mem")),
  check14("prospects_status_known", sql19`${t.status} in (${list3(PROSPECT_STATUSES2)})`),
  check14("prospects_source_known", sql19`${t.source} collate "C" ~ '${sql19.raw(SOURCE_KIND_PATTERN2)}'`),
  check14("prospects_tags_valid", sql19`core.prospect_tags_valid(${t.tags})`),
  check14("prospects_notes_shape", sql19`${t.notes} is null or char_length(${t.notes}) between 1 and ${sql19.raw(String(MAX_PROSPECT_NOTES_LENGTH2))}`),
  foreignKey6({
    name: "prospects_company_fk",
    columns: [t.organizationId, t.companyId],
    foreignColumns: [prospectCompanies2.organizationId, prospectCompanies2.id]
  }).onDelete("set null"),
  foreignKey6({
    name: "prospects_owner_fk",
    columns: [t.organizationId, t.ownerMembershipId],
    foreignColumns: [memberships2.organizationId, memberships2.id]
  }).onDelete("set null"),
  index25("prospects_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index25("prospects_status_list_idx").on(t.organizationId, t.status, t.createdAt.desc(), t.id.desc()),
  index25("prospects_owner_list_idx").on(t.organizationId, t.ownerMembershipId, t.createdAt.desc(), t.id.desc()).where(sql19`${t.ownerMembershipId} is not null`),
  index25("prospects_company_list_idx").on(t.organizationId, t.companyId, t.createdAt.desc(), t.id.desc()).where(sql19`${t.companyId} is not null`),
  index25("prospects_source_list_idx").on(t.organizationId, t.source, t.createdAt.desc(), t.id.desc())
]);
var prospectIdentities2 = coreSchema2.table("prospect_identities", {
  organizationId: text34("organization_id").notNull(),
  kind: text34("kind", { enum: PROSPECT_IDENTITY_KINDS2 }).notNull(),
  value: text34("value").notNull(),
  prospectId: text34("prospect_id").notNull(),
  isPrimary: boolean7("is_primary").notNull().default(true),
  createdAt: createdAt2()
}, (t) => [
  primaryKey5({ name: "prospect_identities_pkey", columns: [t.organizationId, t.kind, t.value] }),
  check14("prospect_identities_organization_id_shape", orgShape2),
  check14("prospect_identities_organization_not_global", notGlobal2),
  check14("prospect_identities_prospect_id_shape", idShape3("prospect_id", "prs")),
  check14("prospect_identities_kind_known", sql19`${t.kind} in (${list3(PROSPECT_IDENTITY_KINDS2)})`),
  check14("prospect_identities_value_shape", sql19`char_length(${t.value}) between 3 and ${sql19.raw(String(MAX_PROSPECT_FIELD_VALUE_LENGTH2))} and (
        (${t.kind} = 'email'
          and ${t.value} = lower(${t.value} collate "C")
          and char_length(${t.value}) - char_length(replace(${t.value}, '@', '')) = 1
          and position('@' in ${t.value}) between 2 and char_length(${t.value}) - 1
          and ${t.value} collate "C" ~ '^[!-~]+$')
        or (${t.kind} = 'phone' and ${t.value} collate "C" ~ '${sql19.raw(IDENTITY_VALUE_PATTERNS2.phone)}')
        or (${t.kind} = 'linkedin' and char_length(${t.value}) <= 300
          and ${t.value} collate "C" ~ '${sql19.raw(IDENTITY_VALUE_PATTERNS2.linkedin)}'))`),
  foreignKey6({
    name: "prospect_identities_prospect_fk",
    columns: [t.organizationId, t.prospectId],
    foreignColumns: [prospects2.organizationId, prospects2.id]
  }).onDelete("cascade"),
  uniqueIndex4("prospect_identities_primary_key").on(t.organizationId, t.prospectId, t.kind).where(sql19`${t.isPrimary}`),
  index25("prospect_identities_prospect_idx").on(t.organizationId, t.prospectId)
]);
var fieldHistoryColumns = () => ({
  organizationId: text34("organization_id").notNull(),
  seq: bigint4("seq", { mode: "number" }).generatedAlwaysAsIdentity().notNull(),
  fieldName: text34("field_name").notNull(),
  state: text34("state", { enum: FIELD_HISTORY_STATES2 }).notNull(),
  value: text34("value").notNull(),
  source: text34("source").notNull(),
  sourceRef: text34("source_ref"),
  setAt: ts2("set_at").notNull(),
  setByUserId: text34("set_by_user_id")
});
var fieldValueCheck = (table, companyFields = false) => check14(`${table}_value_shape`, sql19.raw(companyFields ? `("field_name" <> 'technologies' and char_length("value") between 1 and ${MAX_PROSPECT_FIELD_VALUE_LENGTH2}) or ("field_name" = 'technologies' and char_length("value") between 1 and ${MAX_PROSPECT_TECHNOLOGIES_VALUE_LENGTH2} and core.prospect_company_technologies_text_valid("value"))` : `char_length("value") between 1 and ${MAX_PROSPECT_FIELD_VALUE_LENGTH2}`));
var fieldHistoryChecks = (table) => [
  check14(`${table}_organization_id_shape`, orgShape2),
  check14(`${table}_organization_not_global`, notGlobal2),
  check14(`${table}_state_known`, sql19.raw(`"state" in (${FIELD_HISTORY_STATES2.map((s) => `'${s}'`).join(", ")})`)),
  check14(`${table}_source_known`, sql19.raw(`"source" collate "C" ~ '${SOURCE_KIND_PATTERN2}'`)),
  check14(`${table}_source_ref_shape`, sql19.raw(`("source_ref" is null or char_length("source_ref") between 1 and ${MAX_SOURCE_REF_LENGTH2}) and ("source" <> 'manual' or "source_ref" is null)`)),
  check14(`${table}_set_by_user_id_shape`, sql19.raw(`"set_by_user_id" is null or "set_by_user_id" ~ '^usr_[0-9a-f]{32}$'`))
];
var prospectFields2 = coreSchema2.table("prospect_fields", { ...fieldHistoryColumns(), prospectId: text34("prospect_id").notNull() }, (t) => [
  primaryKey5({ name: "prospect_fields_pkey", columns: [t.organizationId, t.seq] }),
  ...fieldHistoryChecks("prospect_fields"),
  fieldValueCheck("prospect_fields"),
  check14("prospect_fields_prospect_id_shape", idShape3("prospect_id", "prs")),
  check14("prospect_fields_field_name_known", sql19`${t.fieldName} in (${list3(PROSPECT_FIELD_NAMES2)})`),
  foreignKey6({
    name: "prospect_fields_prospect_fk",
    columns: [t.organizationId, t.prospectId],
    foreignColumns: [prospects2.organizationId, prospects2.id]
  }).onDelete("cascade"),
  uniqueIndex4("prospect_fields_current_key").on(t.organizationId, t.prospectId, t.fieldName).where(sql19`${t.state} = 'current'`),
  index25("prospect_fields_history_idx").on(t.organizationId, t.prospectId, t.fieldName, t.setAt.desc(), t.seq.desc()),
  index25("prospect_fields_value_trgm_idx").using("gin", t.value.op("gin_trgm_ops")).where(sql19`${t.state} = 'current'`)
]);
var prospectCompanyFields2 = coreSchema2.table("prospect_company_fields", { ...fieldHistoryColumns(), companyId: text34("company_id").notNull() }, (t) => [
  primaryKey5({ name: "prospect_company_fields_pkey", columns: [t.organizationId, t.seq] }),
  ...fieldHistoryChecks("prospect_company_fields"),
  fieldValueCheck("prospect_company_fields", true),
  check14("prospect_company_fields_employee_count_value", sql19`${t.fieldName} <> 'employee_count' or ${t.value} collate "C" ~ '^[0-9]{1,9}$'`),
  check14("prospect_company_fields_company_id_shape", idShape3("company_id", "pco")),
  check14("prospect_company_fields_field_name_known", sql19`${t.fieldName} in (${list3(PROSPECT_COMPANY_FIELD_NAMES2)})`),
  foreignKey6({
    name: "prospect_company_fields_company_fk",
    columns: [t.organizationId, t.companyId],
    foreignColumns: [prospectCompanies2.organizationId, prospectCompanies2.id]
  }).onDelete("cascade"),
  uniqueIndex4("prospect_company_fields_current_key").on(t.organizationId, t.companyId, t.fieldName).where(sql19`${t.state} = 'current'`),
  index25("prospect_company_fields_history_idx").on(t.organizationId, t.companyId, t.fieldName, t.setAt.desc(), t.seq.desc())
]);
var prospectImports2 = coreSchema2.table("prospect_imports", {
  id: text34("id").notNull(),
  organizationId: text34("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  state: text34("state", { enum: PROSPECT_IMPORT_STATES2 }).notNull().default("uploaded"),
  failureReason: text34("failure_reason", { enum: PROSPECT_IMPORT_FAILURE_REASONS2 }),
  sizeBytes: bigint4("size_bytes", { mode: "number" }).notNull(),
  contentHash: bytes4("content_hash").notNull(),
  objectKey: text34("object_key").notNull(),
  processedRows: integer14("processed_rows").notNull().default(0),
  rowCount: integer14("row_count"),
  createdCount: integer14("created_count"),
  updatedCount: integer14("updated_count"),
  skippedCount: integer14("skipped_count"),
  rejectedCount: integer14("rejected_count"),
  uploadedByUserId: text34("uploaded_by_user_id").notNull(),
  createdAt: createdAt2(),
  updatedAt: updatedAt2()
}, (t) => [
  primaryKey5({ name: "prospect_imports_pkey", columns: [t.organizationId, t.id] }),
  check14("prospect_imports_id_shape", idShape3("id", "pimp")),
  check14("prospect_imports_organization_id_shape", orgShape2),
  check14("prospect_imports_organization_not_global", notGlobal2),
  check14("prospect_imports_uploaded_by_user_id_shape", idShape3("uploaded_by_user_id", "usr")),
  check14("prospect_imports_state_known", sql19`${t.state} in (${list3(PROSPECT_IMPORT_STATES2)})`),
  check14("prospect_imports_failure_reason_known", sql19`${t.failureReason} in (${list3(PROSPECT_IMPORT_FAILURE_REASONS2)})`),
  check14("prospect_imports_failed_has_reason", sql19`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check14("prospect_imports_size_bounds", sql19`${t.sizeBytes} between 1 and ${sql19.raw(String(MAX_PROSPECT_IMPORT_BYTES2))}`),
  check14("prospect_imports_content_hash_length", sql19`octet_length(${t.contentHash}) = 32`),
  check14("prospect_imports_object_key_shape", sql19`char_length(${t.objectKey}) between 1 and 1024 and ${t.objectKey} collate "C" ~ '^[!-~]+$'`),
  check14("prospect_imports_processed_rows_bounds", sql19`${t.processedRows} between 0 and ${sql19.raw(String(MAX_PROSPECT_IMPORT_ROWS2))}`),
  check14("prospect_imports_counts_when_completed", sql19`(${t.state} = 'completed') = (${t.rowCount} is not null)
        and (${t.rowCount} is null) = (${t.createdCount} is null)
        and (${t.rowCount} is null) = (${t.updatedCount} is null)
        and (${t.rowCount} is null) = (${t.skippedCount} is null)
        and (${t.rowCount} is null) = (${t.rejectedCount} is null)`),
  check14("prospect_imports_counts_add_up", sql19`${t.rowCount} is null or (${t.createdCount} >= 0 and ${t.updatedCount} >= 0
        and ${t.skippedCount} >= 0 and ${t.rejectedCount} >= 0
        and ${t.rowCount} <= ${sql19.raw(String(MAX_PROSPECT_IMPORT_ROWS2))}
        and ${t.rowCount} = ${t.createdCount} + ${t.updatedCount} + ${t.skippedCount} + ${t.rejectedCount})`),
  index25("prospect_imports_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc())
]);
var prospectImportRows2 = coreSchema2.table("prospect_import_rows", {
  organizationId: text34("organization_id").notNull(),
  importId: text34("import_id").notNull(),
  rowNumber: integer14("row_number").notNull(),
  result: text34("result", { enum: PROSPECT_IMPORT_ROW_RESULTS2 }).notNull(),
  reason: text34("reason"),
  prospectId: text34("prospect_id")
}, (t) => [
  primaryKey5({
    name: "prospect_import_rows_pkey",
    columns: [t.organizationId, t.importId, t.rowNumber]
  }),
  check14("prospect_import_rows_organization_id_shape", orgShape2),
  check14("prospect_import_rows_organization_not_global", notGlobal2),
  check14("prospect_import_rows_import_id_shape", idShape3("import_id", "pimp")),
  check14("prospect_import_rows_prospect_id_shape", idShape3("prospect_id", "prs")),
  check14("prospect_import_rows_row_number_bounds", sql19`${t.rowNumber} between 2 and ${sql19.raw(String(MAX_PROSPECT_IMPORT_ROWS2 + 1))}`),
  check14("prospect_import_rows_result_known", sql19`${t.result} in (${list3(PROSPECT_IMPORT_ROW_RESULTS2)})`),
  check14("prospect_import_rows_reason_matches_result", sql19`(${t.result} = 'skipped' and ${t.reason} is not null and ${t.reason} in (${list3(PROSPECT_IMPORT_SKIP_REASONS2)}))
        or (${t.result} = 'rejected' and ${t.reason} is not null and ${t.reason} in (${list3(PROSPECT_IMPORT_REJECT_REASONS2)}))
        or (${t.result} in ('created', 'updated') and ${t.reason} is null)`),
  check14("prospect_import_rows_prospect_matches_result", sql19`(${t.result} = 'rejected' and ${t.prospectId} is null)
        or (${t.result} in ('created', 'updated') and ${t.prospectId} is not null)
        or ${t.result} = 'skipped'`),
  foreignKey6({
    name: "prospect_import_rows_import_fk",
    columns: [t.organizationId, t.importId],
    foreignColumns: [prospectImports2.organizationId, prospectImports2.id]
  }).onDelete("cascade"),
  index25("prospect_import_rows_result_idx").on(t.organizationId, t.importId, t.result, t.rowNumber)
]);
var prospectMerges2 = coreSchema2.table("prospect_merges", {
  id: text34("id").notNull(),
  organizationId: text34("organization_id").notNull(),
  survivorProspectId: text34("survivor_prospect_id").notNull(),
  mergedProspectIds: textArray("merged_prospect_ids").notNull(),
  fieldChoices: jsonb12("field_choices").notNull().default(sql19`'{}'::jsonb`),
  state: text34("state", { enum: PROSPECT_MERGE_STATES2 }).notNull().default("merged"),
  mergedByUserId: text34("merged_by_user_id").notNull(),
  snapshot: jsonb12("snapshot").notNull(),
  createdAt: createdAt2(),
  undoableUntil: ts2("undoable_until").notNull(),
  undoneAt: ts2("undone_at")
}, (t) => [
  primaryKey5({ name: "prospect_merges_pkey", columns: [t.organizationId, t.id] }),
  check14("prospect_merges_id_shape", idShape3("id", "pmrg")),
  check14("prospect_merges_organization_id_shape", orgShape2),
  check14("prospect_merges_organization_not_global", notGlobal2),
  check14("prospect_merges_survivor_prospect_id_shape", idShape3("survivor_prospect_id", "prs")),
  check14("prospect_merges_merged_by_user_id_shape", idShape3("merged_by_user_id", "usr")),
  check14("prospect_merges_state_known", sql19`${t.state} in (${list3(PROSPECT_MERGE_STATES2)})`),
  check14("prospect_merges_merged_ids_valid", sql19`core.prospect_merged_ids_valid(${t.mergedProspectIds}, ${t.survivorProspectId})`),
  check14("prospect_merges_field_choices_object", sql19`jsonb_typeof(${t.fieldChoices}) = 'object'`),
  check14("prospect_merges_snapshot_bounds", sql19`jsonb_typeof(${t.snapshot}) = 'object' and octet_length(${t.snapshot}::text) <= ${sql19.raw(String(MAX_MERGE_SNAPSHOT_BYTES2))}`),
  check14("prospect_merges_undo_window", sql19`${t.undoableUntil} = ${t.createdAt} + interval '${sql19.raw(String(PROSPECT_MERGE_UNDO_DAYS2))} days'`),
  check14("prospect_merges_undone_has_time", sql19`(${t.state} = 'undone') = (${t.undoneAt} is not null)`),
  foreignKey6({
    name: "prospect_merges_survivor_fk",
    columns: [t.organizationId, t.survivorProspectId],
    foreignColumns: [prospects2.organizationId, prospects2.id]
  }).onDelete("cascade"),
  index25("prospect_merges_survivor_idx").on(t.organizationId, t.survivorProspectId, t.createdAt.desc(), t.id.desc()),
  index25("prospect_merges_merged_ids_idx").using("gin", t.mergedProspectIds)
]);

// src/schema/core-consent.ts
var CONSENT_CHANNELS2 = ["phone", "sms", "whatsapp", "email", "linkedin"];
var CONSENT_GRANT_SOURCES2 = [
  "hosted_form",
  "verbal_call",
  "import_attestation",
  "crm",
  "manual"
];
var CONSENT_WITHDRAWAL_SOURCES2 = ["unsubscribe", "stop_reply", "manual", "crm"];
var CONSENT_EVENT_KINDS2 = ["granted", "withdrawn"];
var MAX_EVIDENCE_REF_LENGTH2 = 200;
var MAX_SUBMISSION_IP_LENGTH2 = 64;
var MAX_SUBMISSION_USER_AGENT_LENGTH2 = 512;
var MAX_CONSENT_WORDING_LENGTH2 = 5000;
var MAX_CONSENT_FORM_NAME_LENGTH2 = 100;
var CONSENT_FORM_STATES2 = ["draft", "published", "closed"];
var SUPPRESSION_REASONS2 = [
  "unsubscribe",
  "stop",
  "bounce",
  "complaint",
  "manual",
  "crm",
  "erased"
];
var SUPPRESSION_ADDRESS_KINDS2 = ["email", "phone", "linkedin"];
var SUPPRESSION_REMOVABLE_REASONS2 = ["manual"];
var MAX_SUPPRESSION_NOTE_LENGTH2 = 500;
var MAX_SUPPRESSION_SOURCE_REF_LENGTH2 = 200;
var MAX_MASKED_ADDRESS_LENGTH2 = 100;
var CONTACT_PURPOSES2 = ["agent_initiated", "rep_initiated", "reply"];
var LOGGED_DENIAL_CODES2 = [
  "consent.missing",
  "consent.withdrawn",
  "consent.suppressed"
];
var CONTACT_ALLOW_BASES2 = [
  "consent_granted",
  "rep_initiated",
  "reply",
  "email_no_suppression"
];
var MAX_CALLER_LENGTH2 = 32;
var ADDRESS_HASH_BYTES2 = 32;
var CONTACT_CHECK_RETENTION_DAYS2 = 90;
var FORM_TOKEN_PATTERN2 = "^[A-Za-z0-9_-]+$";
var MIN_FORM_TOKEN_LENGTH2 = 22;
var MAX_FORM_TOKEN_LENGTH2 = 256;
var list4 = (values) => sql20.raw(values.map((v) => `'${v}'`).join(", "));
var idShape4 = (column, prefix) => sql20.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape3 = sql20.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal3 = sql20.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts3 = (name) => timestamp28(name, { withTimezone: true });
var bytes5 = customType5({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var textArray2 = customType5({
  dataType: () => "text[]"
});
var channelsValid = (column) => sql20.raw(`core.consent_channels_valid("${column}")`);
var consentWordings2 = coreSchema2.table("consent_wording", {
  id: text35("id").notNull(),
  organizationId: text35("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  version: integer15("version").notNull(),
  text: text35("text").notNull(),
  channels: textArray2("channels").notNull(),
  supersedesId: text35("supersedes_id"),
  createdAt: ts3("created_at").notNull().defaultNow(),
  createdByUserId: text35("created_by_user_id").notNull()
}, (t) => [
  primaryKey6({ name: "consent_wording_pkey", columns: [t.organizationId, t.id] }),
  check15("consent_wording_id_shape", idShape4("id", "cwd")),
  check15("consent_wording_organization_id_shape", orgShape3),
  check15("consent_wording_organization_not_global", notGlobal3),
  check15("consent_wording_supersedes_id_shape", idShape4("supersedes_id", "cwd")),
  check15("consent_wording_created_by_user_id_shape", idShape4("created_by_user_id", "usr")),
  check15("consent_wording_version_bounds", sql20`${t.version} >= 1`),
  check15("consent_wording_version_matches_lineage", sql20`(${t.version} = 1) = (${t.supersedesId} is null)`),
  check15("consent_wording_text_shape", sql20`char_length(${t.text}) between 1 and ${sql20.raw(String(MAX_CONSENT_WORDING_LENGTH2))} and ${t.text} = btrim(${t.text})`),
  check15("consent_wording_channels_valid", channelsValid("channels")),
  foreignKey7({
    name: "consent_wording_supersedes_fk",
    columns: [t.organizationId, t.supersedesId],
    foreignColumns: [t.organizationId, t.id]
  }),
  index26("consent_wordings_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  uniqueIndex5("consent_wording_supersedes_key").on(t.organizationId, t.supersedesId).where(sql20`${t.supersedesId} is not null`)
]);
var consentForms2 = coreSchema2.table("consent_form", {
  id: text35("id").notNull(),
  organizationId: text35("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  wordingId: text35("wording_id").notNull(),
  name: text35("name").notNull(),
  channels: textArray2("channels").notNull(),
  state: text35("state", { enum: CONSENT_FORM_STATES2 }).notNull().default("draft"),
  token: text35("token"),
  createdAt: ts3("created_at").notNull().defaultNow(),
  createdByUserId: text35("created_by_user_id").notNull(),
  publishedAt: ts3("published_at"),
  closedAt: ts3("closed_at")
}, (t) => [
  primaryKey6({ name: "consent_form_pkey", columns: [t.organizationId, t.id] }),
  check15("consent_form_id_shape", idShape4("id", "cfm")),
  check15("consent_form_organization_id_shape", orgShape3),
  check15("consent_form_organization_not_global", notGlobal3),
  check15("consent_form_wording_id_shape", idShape4("wording_id", "cwd")),
  check15("consent_form_created_by_user_id_shape", idShape4("created_by_user_id", "usr")),
  check15("consent_form_name_shape", sql20`char_length(${t.name}) between 1 and ${sql20.raw(String(MAX_CONSENT_FORM_NAME_LENGTH2))} and ${t.name} = btrim(${t.name})`),
  check15("consent_form_channels_valid", channelsValid("channels")),
  check15("consent_form_state_known", sql20`${t.state} in (${list4(CONSENT_FORM_STATES2)})`),
  check15("consent_form_token_shape", sql20`${t.token} is null or (char_length(${t.token}) between ${sql20.raw(String(MIN_FORM_TOKEN_LENGTH2))} and ${sql20.raw(String(MAX_FORM_TOKEN_LENGTH2))} and ${t.token} collate "C" ~ '${sql20.raw(FORM_TOKEN_PATTERN2)}')`),
  check15("consent_form_lifecycle", sql20`(${t.state} = 'draft') = (${t.publishedAt} is null)
        and (${t.state} = 'draft') = (${t.token} is null)
        and (${t.state} = 'closed') = (${t.closedAt} is not null)`),
  foreignKey7({
    name: "consent_form_wording_fk",
    columns: [t.organizationId, t.wordingId],
    foreignColumns: [consentWordings2.organizationId, consentWordings2.id]
  }),
  uniqueIndex5("consent_form_token_key").on(t.token).where(sql20`${t.token} is not null`),
  index26("consent_forms_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index26("consent_forms_state_list_idx").on(t.organizationId, t.state, t.createdAt.desc(), t.id.desc()),
  index26("consent_forms_wording_idx").on(t.organizationId, t.wordingId)
]);
var consentFormDirectory2 = coreSchema2.table("consent_form_directory", {
  token: text35("token").primaryKey(),
  organizationId: text35("organization_id").notNull(),
  formId: text35("form_id").notNull(),
  wordingId: text35("wording_id").notNull(),
  state: text35("state", { enum: ["published", "closed"] }).notNull()
}, (t) => [
  check15("consent_form_directory_token_shape", sql20`char_length(${t.token}) between ${sql20.raw(String(MIN_FORM_TOKEN_LENGTH2))} and ${sql20.raw(String(MAX_FORM_TOKEN_LENGTH2))} and ${t.token} collate "C" ~ '${sql20.raw(FORM_TOKEN_PATTERN2)}'`),
  check15("consent_form_directory_organization_id_shape", orgShape3),
  check15("consent_form_directory_form_id_shape", idShape4("form_id", "cfm")),
  check15("consent_form_directory_wording_id_shape", idShape4("wording_id", "cwd")),
  check15("consent_form_directory_state_known", sql20`${t.state} in ('published', 'closed')`)
]);
var contactConsentEvents2 = coreSchema2.table("contact_consent_event", {
  id: text35("id").notNull(),
  organizationId: text35("organization_id").notNull(),
  seq: bigint5("seq", { mode: "number" }).generatedAlwaysAsIdentity().notNull(),
  prospectId: text35("prospect_id").notNull(),
  channel: text35("channel", { enum: CONSENT_CHANNELS2 }).notNull(),
  kind: text35("kind", { enum: CONSENT_EVENT_KINDS2 }).notNull(),
  source: text35("source").notNull(),
  wordingId: text35("wording_id"),
  evidenceRef: text35("evidence_ref"),
  callId: text35("call_id"),
  formId: text35("form_id"),
  ipAddress: text35("ip_address"),
  userAgent: text35("user_agent"),
  stopAll: boolean8("stop_all").notNull().default(false),
  recordedByUserId: text35("recorded_by_user_id"),
  occurredAt: ts3("occurred_at").notNull(),
  recordedAt: ts3("recorded_at").notNull().defaultNow()
}, (t) => [
  primaryKey6({ name: "contact_consent_event_pkey", columns: [t.organizationId, t.id] }),
  check15("contact_consent_event_id_shape", idShape4("id", "cev")),
  check15("contact_consent_event_organization_id_shape", orgShape3),
  check15("contact_consent_event_organization_not_global", notGlobal3),
  check15("contact_consent_event_prospect_id_shape", idShape4("prospect_id", "prs")),
  check15("contact_consent_event_wording_id_shape", idShape4("wording_id", "cwd")),
  check15("contact_consent_event_call_id_shape", idShape4("call_id", "call")),
  check15("contact_consent_event_form_id_shape", idShape4("form_id", "cfm")),
  check15("contact_consent_event_recorded_by_user_id_shape", idShape4("recorded_by_user_id", "usr")),
  check15("contact_consent_event_channel_known", sql20`${t.channel} in (${list4(CONSENT_CHANNELS2)})`),
  check15("contact_consent_event_kind_known", sql20`${t.kind} in (${list4(CONSENT_EVENT_KINDS2)})`),
  check15("contact_consent_event_source_matches_kind", sql20`(${t.kind} = 'granted' and ${t.source} in (${list4(CONSENT_GRANT_SOURCES2)}))
        or (${t.kind} = 'withdrawn' and ${t.source} in (${list4(CONSENT_WITHDRAWAL_SOURCES2)}))`),
  check15("contact_consent_event_grant_has_evidence", sql20`${t.kind} <> 'granted' or (${t.wordingId} is not null and ${t.evidenceRef} is not null)`),
  check15("contact_consent_event_evidence_ref_shape", sql20`${t.evidenceRef} is null or char_length(${t.evidenceRef}) between 1 and ${sql20.raw(String(MAX_EVIDENCE_REF_LENGTH2))}`),
  check15("contact_consent_event_stop_all_withdrawal", sql20`not ${t.stopAll} or ${t.kind} = 'withdrawn'`),
  check15("contact_consent_event_call_matches_source", sql20`(${t.source} = 'verbal_call') = (${t.callId} is not null)`),
  check15("contact_consent_event_form_matches_source", sql20`(${t.source} = 'hosted_form') = (${t.formId} is not null)`),
  check15("contact_consent_event_submission_matches_source", sql20`(${t.source} = 'hosted_form') = (${t.ipAddress} is not null and ${t.userAgent} is not null)
        and (${t.ipAddress} is null) = (${t.userAgent} is null)
        and (${t.ipAddress} is null or char_length(${t.ipAddress}) between 1 and ${sql20.raw(String(MAX_SUBMISSION_IP_LENGTH2))})
        and (${t.userAgent} is null or char_length(${t.userAgent}) <= ${sql20.raw(String(MAX_SUBMISSION_USER_AGENT_LENGTH2))})`),
  foreignKey7({
    name: "contact_consent_event_prospect_fk",
    columns: [t.organizationId, t.prospectId],
    foreignColumns: [prospects2.organizationId, prospects2.id]
  }).onDelete("cascade"),
  foreignKey7({
    name: "contact_consent_event_wording_fk",
    columns: [t.organizationId, t.wordingId],
    foreignColumns: [consentWordings2.organizationId, consentWordings2.id]
  }).onDelete("cascade"),
  foreignKey7({
    name: "contact_consent_event_form_fk",
    columns: [t.organizationId, t.formId],
    foreignColumns: [consentForms2.organizationId, consentForms2.id]
  }).onDelete("cascade"),
  index26("contact_consent_events_channel_idx").on(t.organizationId, t.prospectId, t.channel, t.seq.desc()),
  index26("contact_consent_events_prospect_idx").on(t.organizationId, t.prospectId, t.seq.desc()),
  index26("contact_consent_events_wording_idx").on(t.organizationId, t.wordingId).where(sql20`${t.wordingId} is not null`),
  index26("contact_consent_events_form_idx").on(t.organizationId, t.formId).where(sql20`${t.formId} is not null`)
]);
var suppressionEntries2 = coreSchema2.table("suppression_entry", {
  id: text35("id").notNull(),
  organizationId: text35("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  addressKind: text35("address_kind", { enum: SUPPRESSION_ADDRESS_KINDS2 }).notNull(),
  addressHash: bytes5("address_hash").notNull(),
  maskedAddress: text35("masked_address"),
  reason: text35("reason", { enum: SUPPRESSION_REASONS2 }).notNull(),
  channel: text35("channel", { enum: CONSENT_CHANNELS2 }),
  sourceRef: text35("source_ref"),
  addedByUserId: text35("added_by_user_id"),
  removable: boolean8("removable").notNull().generatedAlwaysAs(sql20`reason in (${list4(SUPPRESSION_REMOVABLE_REASONS2)})`),
  createdAt: ts3("created_at").notNull().defaultNow(),
  removedAt: ts3("removed_at"),
  removedByUserId: text35("removed_by_user_id"),
  removalReason: text35("removal_reason")
}, (t) => [
  primaryKey6({ name: "suppression_entry_pkey", columns: [t.organizationId, t.id] }),
  check15("suppression_entry_id_shape", idShape4("id", "sup")),
  check15("suppression_entry_organization_id_shape", orgShape3),
  check15("suppression_entry_organization_not_global", notGlobal3),
  check15("suppression_entry_added_by_user_id_shape", idShape4("added_by_user_id", "usr")),
  check15("suppression_entry_removed_by_user_id_shape", idShape4("removed_by_user_id", "usr")),
  check15("suppression_entry_address_kind_known", sql20`${t.addressKind} in (${list4(SUPPRESSION_ADDRESS_KINDS2)})`),
  check15("suppression_entry_address_hash_length", sql20`octet_length(${t.addressHash}) = ${sql20.raw(String(ADDRESS_HASH_BYTES2))}`),
  check15("suppression_entry_reason_known", sql20`${t.reason} in (${list4(SUPPRESSION_REASONS2)})`),
  check15("suppression_entry_channel_known", sql20`${t.channel} in (${list4(CONSENT_CHANNELS2)})`),
  check15("suppression_entry_masked_address_shape", sql20`(${t.reason} = 'erased') = (${t.maskedAddress} is null)
        and (${t.maskedAddress} is null or char_length(${t.maskedAddress}) between 1 and ${sql20.raw(String(MAX_MASKED_ADDRESS_LENGTH2))})`),
  check15("suppression_entry_source_ref_shape", sql20`${t.sourceRef} is null or char_length(${t.sourceRef}) between 1 and ${sql20.raw(String(MAX_SUPPRESSION_SOURCE_REF_LENGTH2))}`),
  check15("suppression_entry_removal_complete", sql20`(${t.removedAt} is null) = (${t.removedByUserId} is null)
        and (${t.removedAt} is null) = (${t.removalReason} is null)`),
  check15("suppression_entry_removal_reason_shape", sql20`${t.removalReason} is null or (char_length(${t.removalReason}) between 1 and ${sql20.raw(String(MAX_SUPPRESSION_NOTE_LENGTH2))}
        and ${t.removalReason} = btrim(${t.removalReason}))`),
  check15("suppression_entry_only_removable_removed", sql20`${t.removedAt} is null or ${t.removable}`),
  uniqueIndex5("suppression_entry_live_key").on(t.organizationId, t.addressKind, t.addressHash).where(sql20`${t.removedAt} is null`),
  index26("suppression_entries_live_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()).where(sql20`${t.removedAt} is null`),
  index26("suppression_entries_removed_list_idx").on(t.organizationId, t.removedAt.desc(), t.id.desc()).where(sql20`${t.removedAt} is not null`),
  index26("suppression_entries_reason_list_idx").on(t.organizationId, t.reason, t.createdAt.desc(), t.id.desc()),
  index26("suppression_entries_kind_list_idx").on(t.organizationId, t.addressKind, t.createdAt.desc(), t.id.desc())
]);
var contactCheckLog2 = coreSchema2.table("contact_check_log", {
  id: text35("id").notNull(),
  organizationId: text35("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  prospectId: text35("prospect_id"),
  channel: text35("channel", { enum: CONSENT_CHANNELS2 }).notNull(),
  purpose: text35("purpose", { enum: CONTACT_PURPOSES2 }).notNull(),
  caller: text35("caller").notNull(),
  allowed: boolean8("allowed").notNull(),
  code: text35("code", { enum: LOGGED_DENIAL_CODES2 }),
  basis: text35("basis", { enum: CONTACT_ALLOW_BASES2 }),
  checkedAt: ts3("checked_at").notNull().defaultNow()
}, (t) => [
  primaryKey6({ name: "contact_check_log_pkey", columns: [t.organizationId, t.id] }),
  check15("contact_check_log_id_shape", idShape4("id", "chk")),
  check15("contact_check_log_organization_id_shape", orgShape3),
  check15("contact_check_log_organization_not_global", notGlobal3),
  check15("contact_check_log_prospect_id_shape", idShape4("prospect_id", "prs")),
  check15("contact_check_log_channel_known", sql20`${t.channel} in (${list4(CONSENT_CHANNELS2)})`),
  check15("contact_check_log_purpose_known", sql20`${t.purpose} in (${list4(CONTACT_PURPOSES2)})`),
  check15("contact_check_log_caller_shape", sql20`char_length(${t.caller}) between 1 and ${sql20.raw(String(MAX_CALLER_LENGTH2))} and ${t.caller} collate "C" ~ '^[a-z][a-z0-9_-]*$'`),
  check15("contact_check_log_code_known", sql20`${t.code} in (${list4(LOGGED_DENIAL_CODES2)})`),
  check15("contact_check_log_basis_known", sql20`${t.basis} in (${list4(CONTACT_ALLOW_BASES2)})`),
  check15("contact_check_log_outcome_consistent", sql20`(${t.allowed} and ${t.basis} is not null and ${t.code} is null)
        or (not ${t.allowed} and ${t.basis} is null and ${t.code} is not null)`),
  index26("contact_check_log_list_idx").on(t.organizationId, t.checkedAt.desc(), t.id.desc()),
  index26("contact_check_log_prospect_idx").on(t.organizationId, t.prospectId, t.checkedAt.desc(), t.id.desc()).where(sql20`${t.prospectId} is not null`)
]);
// src/schema/core-controls.ts
import { sql as sql21 } from "drizzle-orm";
import {
  bigint as bigint6,
  boolean as boolean9,
  check as check16,
  foreignKey as foreignKey8,
  index as index27,
  integer as integer16,
  jsonb as jsonb13,
  primaryKey as primaryKey7,
  text as text36,
  timestamp as timestamp29,
  uniqueIndex as uniqueIndex6
} from "drizzle-orm/pg-core";
var AGENT_KINDS2 = ["inbound", "outbound"];
var MAX_AGENT_INSTRUCTION_LENGTH2 = 20000;
var CONTROL_LEVELS2 = ["supervised", "assisted", "autonomous"];
var AGENT_SETTING_CHANNELS2 = ["phone", "sms", "whatsapp", "email", "linkedin"];
var DEFAULT_CHANNEL2 = "default";
var ORGANIZATION_AGENT_KIND2 = "organization";
var MAX_ESCALATION_RULES2 = 7;
var AUDIT_ACTOR_KINDS2 = ["member", "agent", "api_key", "system"];
var MAX_AUDIT_METADATA_BYTES2 = 4096;
var EXPORT_KINDS2 = ["organization", "enriched_prospects"];
var EXPORT_FORMATS2 = ["csv"];
var EXPORT_STATES2 = ["queued", "running", "ready", "failed", "expired"];
var EXPORT_ACTIVE_STATES2 = ["queued", "running"];
var EXPORT_FAILURE_REASONS2 = ["part_failed", "timed_out", "storage_unavailable"];
var EXPORT_SERVICES2 = ["core", "playbook", "voice", "outbound"];
var EXPORT_PART_STATES2 = ["pending", "ready", "failed"];
var EXPORT_PART_FAILURE_REASONS2 = [
  "write_failed",
  "storage_unavailable",
  "source_unavailable"
];
var MAX_EXPORT_PART_FILES2 = 1e4;
var MAX_EXPORT_PART_BYTES2 = 50000000000;
var MAX_EXPORT_PREFIX_LENGTH2 = 300;
var API_KEY_SCOPES2 = [
  "prospects:read",
  "prospects:write",
  "consent:read",
  "consent:write",
  "enrichment:read",
  "enrichment:write",
  "campaigns:read",
  "campaigns:write",
  "messaging:read",
  "messaging:write",
  "bookings:read",
  "bookings:write",
  "playbook:read",
  "playbook:write",
  "calls:read",
  "calls:write"
];
var MAX_API_KEY_NAME_LENGTH2 = 80;
var API_KEY_ROLE_CEILINGS2 = ["owner", "admin", "manager", "rep"];
var list5 = (values) => sql21.raw(values.map((v) => `'${v}'`).join(", "));
var idShape5 = (column, prefix) => sql21.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape4 = sql21.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal4 = sql21.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var hexHash = (column) => sql21.raw(`"${column}" ~ '^[0-9a-f]{64}$'`);
var ts4 = (name) => timestamp29(name, { withTimezone: true });
var num2 = (n) => sql21.raw(String(n));
var agentInstructionVersions2 = coreSchema2.table("agent_instruction_versions", {
  id: text36("id").notNull(),
  organizationId: text36("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  agentKind: text36("agent_kind", { enum: AGENT_KINDS2 }).notNull(),
  number: integer16("number").notNull(),
  text: text36("text").notNull(),
  authorMembershipId: text36("author_membership_id"),
  createdAt: ts4("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey7({ name: "agent_instruction_versions_pkey", columns: [t.organizationId, t.id] }),
  check16("agent_instruction_versions_id_shape", idShape5("id", "ains")),
  check16("agent_instruction_versions_organization_id_shape", orgShape4),
  check16("agent_instruction_versions_organization_not_global", notGlobal4),
  check16("agent_instruction_versions_agent_kind_known", sql21`${t.agentKind} in (${list5(AGENT_KINDS2)})`),
  check16("agent_instruction_versions_number_positive", sql21`${t.number} >= 1`),
  check16("agent_instruction_versions_text_length", sql21`char_length(${t.text}) between 1 and ${num2(MAX_AGENT_INSTRUCTION_LENGTH2)}`),
  check16("agent_instruction_versions_author_shape", sql21`${t.authorMembershipId} is null or ${t.authorMembershipId} ~ '^mem_[0-9a-f]{32}$'`),
  uniqueIndex6("agent_instruction_versions_number_key").on(t.organizationId, t.agentKind, t.number)
]);
var agentInstructionPointers2 = coreSchema2.table("agent_instruction_pointer", {
  organizationId: text36("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  agentKind: text36("agent_kind", { enum: AGENT_KINDS2 }).notNull(),
  versionNumber: integer16("version_number").notNull(),
  publishedByMembershipId: text36("published_by_membership_id"),
  publishedAt: ts4("published_at").notNull().defaultNow()
}, (t) => [
  primaryKey7({
    name: "agent_instruction_pointer_pkey",
    columns: [t.organizationId, t.agentKind]
  }),
  foreignKey8({
    name: "agent_instruction_pointer_version_fk",
    columns: [t.organizationId, t.agentKind, t.versionNumber],
    foreignColumns: [
      agentInstructionVersions2.organizationId,
      agentInstructionVersions2.agentKind,
      agentInstructionVersions2.number
    ]
  }),
  check16("agent_instruction_pointer_organization_id_shape", orgShape4),
  check16("agent_instruction_pointer_organization_not_global", notGlobal4),
  check16("agent_instruction_pointer_agent_kind_known", sql21`${t.agentKind} in (${list5(AGENT_KINDS2)})`),
  check16("agent_instruction_pointer_published_by_shape", sql21`${t.publishedByMembershipId} is null or ${t.publishedByMembershipId} ~ '^mem_[0-9a-f]{32}$'`)
]);
var agentSettings2 = coreSchema2.table("agent_settings", {
  organizationId: text36("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  agentKind: text36("agent_kind", { enum: [...AGENT_KINDS2, ORGANIZATION_AGENT_KIND2] }).notNull(),
  channel: text36("channel", { enum: [...AGENT_SETTING_CHANNELS2, DEFAULT_CHANNEL2] }).notNull().default(DEFAULT_CHANNEL2),
  level: text36("level", { enum: CONTROL_LEVELS2 }),
  sendWindow: jsonb13("send_window"),
  escalationRules: jsonb13("escalation_rules"),
  agentsPaused: boolean9("agents_paused"),
  updatedByMembershipId: text36("updated_by_membership_id"),
  updatedAt: ts4("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey7({
    name: "agent_settings_pkey",
    columns: [t.organizationId, t.agentKind, t.channel]
  }),
  check16("agent_settings_organization_id_shape", orgShape4),
  check16("agent_settings_organization_not_global", notGlobal4),
  check16("agent_settings_agent_kind_known", sql21`${t.agentKind} in (${list5([...AGENT_KINDS2, ORGANIZATION_AGENT_KIND2])})`),
  check16("agent_settings_channel_known", sql21`${t.channel} in (${list5([...AGENT_SETTING_CHANNELS2, DEFAULT_CHANNEL2])})`),
  check16("agent_settings_level_known", sql21`${t.level} is null or ${t.level} in (${list5(CONTROL_LEVELS2)})`),
  check16("agent_settings_updated_by_shape", sql21`${t.updatedByMembershipId} is null or ${t.updatedByMembershipId} ~ '^mem_[0-9a-f]{32}$'`),
  check16("agent_settings_send_window_shape", sql21`${t.sendWindow} is null or jsonb_typeof(${t.sendWindow}) = 'object'`),
  check16("agent_settings_escalation_rules_shape", sql21`${t.escalationRules} is null or (jsonb_typeof(${t.escalationRules}) = 'array' and jsonb_array_length(${t.escalationRules}) <= ${num2(MAX_ESCALATION_RULES2)})`),
  check16("agent_settings_row_columns", sql21`(${t.agentKind} <> 'organization'
          and ${t.level} is not null and ${t.sendWindow} is not null and ${t.escalationRules} is not null
          and ${t.agentsPaused} is null)
        or (${t.agentKind} = 'organization' and ${t.channel} = 'default'
          and ${t.agentsPaused} is not null
          and ${t.level} is null and ${t.sendWindow} is null and ${t.escalationRules} is null)`)
]);
var auditEvents2 = coreSchema2.table("audit_events", {
  id: text36("id").notNull(),
  organizationId: text36("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  sequence: bigint6("sequence", { mode: "number" }).notNull(),
  occurredAt: ts4("occurred_at").notNull(),
  actorKind: text36("actor_kind", { enum: AUDIT_ACTOR_KINDS2 }).notNull(),
  actorMembershipId: text36("actor_membership_id"),
  actorAgentKind: text36("actor_agent_kind", { enum: AGENT_KINDS2 }),
  actorApiKeyId: text36("actor_api_key_id"),
  action: text36("action").notNull(),
  subjectType: text36("subject_type"),
  subjectId: text36("subject_id"),
  prospectId: text36("prospect_id"),
  instructionVersion: integer16("instruction_version"),
  requestId: text36("request_id"),
  metadata: jsonb13("metadata").notNull().default(sql21`'{}'::jsonb`),
  previousHash: text36("previous_hash"),
  hash: text36("hash").notNull(),
  recordedAt: ts4("recorded_at").notNull().defaultNow()
}, (t) => [
  primaryKey7({ name: "audit_events_pkey", columns: [t.organizationId, t.id] }),
  check16("audit_events_id_shape", idShape5("id", "aud")),
  check16("audit_events_organization_id_shape", orgShape4),
  check16("audit_events_organization_not_global", notGlobal4),
  check16("audit_events_sequence_positive", sql21`${t.sequence} >= 1`),
  check16("audit_events_actor_kind_known", sql21`${t.actorKind} in (${list5(AUDIT_ACTOR_KINDS2)})`),
  check16("audit_events_actor_columns", sql21`(${t.actorKind} = 'member' and ${t.actorMembershipId} is not null and ${t.actorMembershipId} ~ '^mem_[0-9a-f]{32}$'
            and ${t.actorAgentKind} is null and ${t.actorApiKeyId} is null)
        or (${t.actorKind} = 'agent' and ${t.actorAgentKind} is not null and ${t.actorAgentKind} in (${list5(AGENT_KINDS2)})
            and ${t.actorMembershipId} is null and ${t.actorApiKeyId} is null)
        or (${t.actorKind} = 'api_key' and ${t.actorApiKeyId} is not null and ${t.actorApiKeyId} ~ '^akey_[0-9a-f]{32}$'
            and ${t.actorMembershipId} is null and ${t.actorAgentKind} is null)
        or (${t.actorKind} = 'system'
            and ${t.actorMembershipId} is null and ${t.actorAgentKind} is null and ${t.actorApiKeyId} is null)`),
  check16("audit_events_action_shape", sql21`char_length(${t.action}) <= 100 and ${t.action} ~ '^[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*$'`),
  check16("audit_events_subject_shape", sql21`(${t.subjectType} is null and ${t.subjectId} is null)
        or (${t.subjectType} is not null and char_length(${t.subjectType}) <= 40 and ${t.subjectType} ~ '^[a-z][a-z0-9_]*$'
            and ${t.subjectId} is not null and char_length(${t.subjectId}) <= 64 and ${t.subjectId} ~ '^[a-z][a-z0-9_]*_[0-9a-f]{32}$')`),
  check16("audit_events_prospect_id_shape", sql21`${t.prospectId} is null or ${t.prospectId} ~ '^prs_[0-9a-f]{32}$'`),
  check16("audit_events_instruction_version_positive", sql21`${t.instructionVersion} is null or ${t.instructionVersion} >= 1`),
  check16("audit_events_request_id_shape", sql21`${t.requestId} is null or ${t.requestId} ~ '^req_[0-9a-f]{32}$'`),
  check16("audit_events_metadata_shape", sql21`jsonb_typeof(${t.metadata}) = 'object' and octet_length(${t.metadata}::text) <= ${num2(MAX_AUDIT_METADATA_BYTES2)}`),
  check16("audit_events_hash_shape", hexHash("hash")),
  check16("audit_events_previous_hash_shape", sql21`${t.previousHash} is null or ${t.previousHash} ~ '^[0-9a-f]{64}$'`),
  check16("audit_events_chain_start", sql21`(${t.sequence} = 1) = (${t.previousHash} is null)`),
  uniqueIndex6("audit_events_sequence_key").on(t.organizationId, t.sequence),
  index27("audit_events_occurred_idx").on(t.organizationId, t.occurredAt.desc(), t.sequence.desc()),
  index27("audit_events_action_idx").on(t.organizationId, t.action, t.sequence.desc()),
  index27("audit_events_subject_idx").on(t.organizationId, t.subjectType, t.subjectId, t.sequence.desc()).where(sql21`${t.subjectId} is not null`),
  index27("audit_events_prospect_idx").on(t.organizationId, t.prospectId, t.sequence.desc()).where(sql21`${t.prospectId} is not null`)
]);
var exportJobs2 = coreSchema2.table("export_jobs", {
  id: text36("id").notNull(),
  organizationId: text36("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  kind: text36("kind", { enum: EXPORT_KINDS2 }).notNull(),
  format: text36("format", { enum: EXPORT_FORMATS2 }),
  filter: jsonb13("filter"),
  state: text36("state", { enum: EXPORT_STATES2 }).notNull().default("queued"),
  requestedByMembershipId: text36("requested_by_membership_id").notNull(),
  includeRecordingLinks: boolean9("include_recording_links").notNull().default(false),
  failureReason: text36("failure_reason", { enum: EXPORT_FAILURE_REASONS2 }),
  requestedAt: ts4("requested_at").notNull().defaultNow(),
  completedAt: ts4("completed_at"),
  expiresAt: ts4("expires_at")
}, (t) => [
  primaryKey7({ name: "export_jobs_pkey", columns: [t.organizationId, t.id] }),
  check16("export_jobs_id_shape", idShape5("id", "exp")),
  check16("export_jobs_organization_id_shape", orgShape4),
  check16("export_jobs_organization_not_global", notGlobal4),
  check16("export_jobs_kind_known", sql21`${t.kind} in (${list5(EXPORT_KINDS2)})`),
  check16("export_jobs_format_known", sql21`${t.format} is null or ${t.format} in (${list5(EXPORT_FORMATS2)})`),
  check16("export_jobs_state_known", sql21`${t.state} in (${list5(EXPORT_STATES2)})`),
  check16("export_jobs_failure_reason_known", sql21`${t.failureReason} is null or ${t.failureReason} in (${list5(EXPORT_FAILURE_REASONS2)})`),
  check16("export_jobs_requested_by_shape", idShape5("requested_by_membership_id", "mem")),
  check16("export_jobs_filter_shape", sql21`${t.filter} is null or jsonb_typeof(${t.filter}) = 'object'`),
  check16("export_jobs_kind_columns", sql21`(${t.kind} = 'organization' and ${t.format} is null and ${t.filter} is null)
        or (${t.kind} = 'enriched_prospects' and ${t.format} is not null and ${t.includeRecordingLinks} = false)`),
  check16("export_jobs_failure_iff_failed", sql21`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check16("export_jobs_completion", sql21`(${t.state} in ('queued', 'running') and ${t.completedAt} is null and ${t.expiresAt} is null)
        or (${t.state} in ('ready', 'expired') and ${t.completedAt} is not null and ${t.expiresAt} is not null)
        or (${t.state} = 'failed' and ${t.completedAt} is not null and ${t.expiresAt} is null)`),
  uniqueIndex6("export_jobs_one_active_key").on(t.organizationId).where(sql21`${t.state} in (${list5(EXPORT_ACTIVE_STATES2)})`),
  index27("export_jobs_list_idx").on(t.organizationId, t.requestedAt.desc(), t.id.desc())
]);
var exportParts2 = coreSchema2.table("export_parts", {
  organizationId: text36("organization_id").notNull(),
  exportId: text36("export_id").notNull(),
  service: text36("service", { enum: EXPORT_SERVICES2 }).notNull(),
  state: text36("state", { enum: EXPORT_PART_STATES2 }).notNull().default("pending"),
  prefix: text36("prefix"),
  fileCount: integer16("file_count"),
  bytes: bigint6("bytes", { mode: "number" }),
  failureReason: text36("failure_reason", { enum: EXPORT_PART_FAILURE_REASONS2 }),
  readyAt: ts4("ready_at"),
  updatedAt: ts4("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey7({
    name: "export_parts_pkey",
    columns: [t.organizationId, t.exportId, t.service]
  }),
  foreignKey8({
    name: "export_parts_export_fk",
    columns: [t.organizationId, t.exportId],
    foreignColumns: [exportJobs2.organizationId, exportJobs2.id]
  }).onDelete("cascade"),
  check16("export_parts_organization_id_shape", orgShape4),
  check16("export_parts_organization_not_global", notGlobal4),
  check16("export_parts_export_id_shape", idShape5("export_id", "exp")),
  check16("export_parts_service_known", sql21`${t.service} in (${list5(EXPORT_SERVICES2)})`),
  check16("export_parts_state_known", sql21`${t.state} in (${list5(EXPORT_PART_STATES2)})`),
  check16("export_parts_failure_reason_known", sql21`${t.failureReason} is null or ${t.failureReason} in (${list5(EXPORT_PART_FAILURE_REASONS2)})`),
  check16("export_parts_prefix_shape", sql21`${t.prefix} is null or (char_length(${t.prefix}) <= ${num2(MAX_EXPORT_PREFIX_LENGTH2)}
        and ${t.prefix} ~ '^[A-Za-z0-9_][A-Za-z0-9_./-]*$' and ('/' || ${t.prefix} || '/') not like '%/../%')`),
  check16("export_parts_file_count_range", sql21`${t.fileCount} is null or ${t.fileCount} between 0 and ${num2(MAX_EXPORT_PART_FILES2)}`),
  check16("export_parts_bytes_range", sql21`${t.bytes} is null or ${t.bytes} between 0 and ${num2(MAX_EXPORT_PART_BYTES2)}`),
  check16("export_parts_state_columns", sql21`(${t.state} = 'pending' and ${t.prefix} is null and ${t.fileCount} is null and ${t.bytes} is null and ${t.failureReason} is null and ${t.readyAt} is null)
        or (${t.state} = 'ready' and ${t.prefix} is not null and ${t.fileCount} is not null and ${t.bytes} is not null and ${t.failureReason} is null and ${t.readyAt} is not null)
        or (${t.state} = 'failed' and ${t.failureReason} is not null and ${t.readyAt} is null)`)
]);
var coreApiKeys2 = coreSchema2.table("api_keys", {
  id: text36("id").notNull(),
  organizationId: text36("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  name: text36("name").notNull(),
  prefix: text36("prefix").notNull(),
  secretHash: text36("secret_hash").notNull(),
  scopes: text36("scopes").array().notNull(),
  roleCeiling: text36("role_ceiling", { enum: API_KEY_ROLE_CEILINGS2 }).notNull(),
  expiresAt: ts4("expires_at"),
  lastUsedAt: ts4("last_used_at"),
  revokedAt: ts4("revoked_at"),
  createdByMembershipId: text36("created_by_membership_id").notNull(),
  createdAt: ts4("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey7({ name: "api_keys_pkey", columns: [t.organizationId, t.id] }),
  check16("api_keys_id_shape", idShape5("id", "akey")),
  check16("api_keys_organization_id_shape", orgShape4),
  check16("api_keys_organization_not_global", notGlobal4),
  check16("api_keys_name_length", sql21`char_length(${t.name}) between 1 and ${num2(MAX_API_KEY_NAME_LENGTH2)}`),
  check16("api_keys_prefix_shape", sql21`${t.prefix} ~ '^clk_[A-Za-z0-9_-]{8}$'`),
  check16("api_keys_secret_hash_shape", hexHash("secret_hash")),
  check16("api_keys_scopes_known", sql21`cardinality(${t.scopes}) between 1 and ${num2(API_KEY_SCOPES2.length)}
        and ${t.scopes} <@ array[${list5(API_KEY_SCOPES2)}]::text[]`),
  check16("api_keys_role_ceiling_known", sql21`${t.roleCeiling} in (${list5(API_KEY_ROLE_CEILINGS2)})`),
  check16("api_keys_created_by_shape", idShape5("created_by_membership_id", "mem")),
  check16("api_keys_expiry_after_creation", sql21`${t.expiresAt} is null or ${t.expiresAt} > ${t.createdAt}`),
  uniqueIndex6("api_keys_secret_hash_key").on(t.secretHash),
  index27("api_keys_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc())
]);
var apiKeyUsage2 = coreSchema2.table("api_key_usage", {
  organizationId: text36("organization_id").notNull(),
  apiKeyId: text36("api_key_id").notNull(),
  windowStart: ts4("window_start").notNull(),
  requestCount: bigint6("request_count", { mode: "number" }).notNull().default(0)
}, (t) => [
  primaryKey7({
    name: "api_key_usage_pkey",
    columns: [t.organizationId, t.apiKeyId, t.windowStart]
  }),
  foreignKey8({
    name: "api_key_usage_key_fk",
    columns: [t.organizationId, t.apiKeyId],
    foreignColumns: [coreApiKeys2.organizationId, coreApiKeys2.id]
  }).onDelete("cascade"),
  check16("api_key_usage_organization_id_shape", orgShape4),
  check16("api_key_usage_organization_not_global", notGlobal4),
  check16("api_key_usage_api_key_id_shape", idShape5("api_key_id", "akey")),
  check16("api_key_usage_request_count_range", sql21`${t.requestCount} between 0 and 1000000000`),
  index27("api_key_usage_age_idx").on(t.organizationId, t.windowStart)
]);
// src/schema/core-crm.ts
import { sql as sql22 } from "drizzle-orm";
import {
  bigint as bigint7,
  boolean as boolean10,
  check as check17,
  customType as customType6,
  foreignKey as foreignKey9,
  index as index28,
  jsonb as jsonb14,
  primaryKey as primaryKey8,
  text as text37,
  timestamp as timestamp30,
  uniqueIndex as uniqueIndex7
} from "drizzle-orm/pg-core";
var CRM_PROVIDERS2 = ["hubspot", "salesforce"];
var CRM_OBJECT_KINDS2 = ["deal", "call", "company", "contact"];
var CRM_SCOPE_LEVELS2 = ["read", "read_write"];
var CRM_CONNECTION_STATES2 = ["connected", "needs_reconnect"];
var CRM_DIRECTIONS2 = ["read_only", "write_only", "both"];
var CRM_STAGE_OUTCOMES2 = ["won", "lost", "open"];
var CRM_FIELD_KEYS2 = [
  "deal.outcome",
  "company.name",
  "company.domain",
  "company.industry",
  "company.employeeCount",
  "company.region",
  "company.technologies",
  "contact.firstName",
  "contact.lastName",
  "contact.jobTitle",
  "contact.email",
  "contact.phone",
  "contact.linkedinUrl",
  "activity.notes"
];
var CRM_MAPPING_KINDS2 = ["stage", "field"];
var CRM_RUN_TRIGGERS2 = ["first_load", "manual", "webhook", "sweep", "retry"];
var CRM_RUN_STATES2 = ["queued", "running", "completed", "failed"];
var CRM_RUN_ERROR_CODES2 = [
  "crm.needs_reconnect",
  "crm.rate_limited",
  "crm.mapping_incomplete",
  "crm.rights_not_confirmed"
];
var CRM_REF_STATES2 = ["linked", "pending_write", "unlinked"];
var MAX_CRM_EXTERNAL_ID_LENGTH2 = 128;
var MAX_CRM_LABEL_LENGTH2 = 200;
var MAX_CRM_RUN_COUNT2 = 1e8;
var CRM_SKIP_REASON_COUNT2 = 4;
var MAX_CRM_RUN_FAILURES2 = 50;
var MAX_CRM_SEALED_TOKEN_BYTES2 = 16384;
var MAX_CRM_KEY_ID_LENGTH2 = 128;
var MAX_CRM_CURSOR_LENGTH2 = 1024;
var MAX_CRM_WRITE_KEY_LENGTH2 = 256;
var MAX_CRM_LOCAL_ID_LENGTH2 = 128;
var CRM_WEBHOOK_WINDOW_SECONDS2 = 300;
var list6 = (values) => sql22.raw(values.map((v) => `'${v}'`).join(", "));
var idShape6 = (column, prefix) => sql22.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape5 = sql22.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal5 = sql22.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts5 = (name) => timestamp30(name, { withTimezone: true });
var lengthBetween = (column, max) => sql22.raw(`char_length("${column}") between 1 and ${max}`);
var bytes6 = customType6({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var crmConnections2 = coreSchema2.table("crm_connection", {
  id: text37("id").notNull(),
  organizationId: text37("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  provider: text37("provider", { enum: CRM_PROVIDERS2 }).notNull(),
  state: text37("state", { enum: CRM_CONNECTION_STATES2 }).notNull().default("connected"),
  externalAccountId: text37("external_account_id").notNull(),
  accountLabel: text37("account_label"),
  scopeLevel: text37("scope_level", { enum: CRM_SCOPE_LEVELS2 }).notNull().default("read"),
  accessTokenSealed: bytes6("access_token_sealed"),
  refreshTokenSealed: bytes6("refresh_token_sealed"),
  tokenKeyId: text37("token_key_id"),
  accessTokenExpiresAt: ts5("access_token_expires_at"),
  connectedByMembershipId: text37("connected_by_membership_id").notNull(),
  connectedAt: ts5("connected_at").notNull().defaultNow(),
  lastSyncedAt: ts5("last_synced_at"),
  needsReconnectSince: ts5("needs_reconnect_since"),
  stageMappingConfirmedByMembershipId: text37("stage_mapping_confirmed_by_membership_id"),
  stageMappingConfirmedAt: ts5("stage_mapping_confirmed_at"),
  updatedAt: ts5("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey8({ name: "crm_connection_pkey", columns: [t.organizationId, t.id] }),
  check17("crm_connection_id_shape", idShape6("id", "crn")),
  check17("crm_connection_organization_id_shape", orgShape5),
  check17("crm_connection_organization_not_global", notGlobal5),
  check17("crm_connection_provider_known", sql22`${t.provider} in (${list6(CRM_PROVIDERS2)})`),
  check17("crm_connection_state_known", sql22`${t.state} in (${list6(CRM_CONNECTION_STATES2)})`),
  check17("crm_connection_scope_level_known", sql22`${t.scopeLevel} in (${list6(CRM_SCOPE_LEVELS2)})`),
  check17("crm_connection_external_account_id_shape", lengthBetween("external_account_id", MAX_CRM_EXTERNAL_ID_LENGTH2)),
  check17("crm_connection_account_label_shape", sql22`${t.accountLabel} is null or char_length(${t.accountLabel}) between 1 and ${sql22.raw(String(MAX_CRM_LABEL_LENGTH2))}`),
  check17("crm_connection_connected_by_membership_id_shape", idShape6("connected_by_membership_id", "mem")),
  check17("crm_connection_stage_mapping_confirmed_by_shape", idShape6("stage_mapping_confirmed_by_membership_id", "mem")),
  check17("crm_connection_access_token_sealed_size", sql22`${t.accessTokenSealed} is null or octet_length(${t.accessTokenSealed}) between 1 and ${sql22.raw(String(MAX_CRM_SEALED_TOKEN_BYTES2))}`),
  check17("crm_connection_refresh_token_sealed_size", sql22`${t.refreshTokenSealed} is null or octet_length(${t.refreshTokenSealed}) between 1 and ${sql22.raw(String(MAX_CRM_SEALED_TOKEN_BYTES2))}`),
  check17("crm_connection_token_key_id_shape", sql22`${t.tokenKeyId} is null or char_length(${t.tokenKeyId}) between 1 and ${sql22.raw(String(MAX_CRM_KEY_ID_LENGTH2))}`),
  check17("crm_connection_sealed_tokens_have_key_id", sql22`(${t.accessTokenSealed} is null and ${t.refreshTokenSealed} is null) or ${t.tokenKeyId} is not null`),
  check17("crm_connection_access_expiry_needs_token", sql22`${t.accessTokenExpiresAt} is null or ${t.accessTokenSealed} is not null`),
  check17("crm_connection_needs_reconnect_since", sql22`(${t.state} = 'needs_reconnect') = (${t.needsReconnectSince} is not null)`),
  check17("crm_connection_stage_mapping_confirmation", sql22`(${t.stageMappingConfirmedByMembershipId} is null) = (${t.stageMappingConfirmedAt} is null)`),
  uniqueIndex7("crm_connection_provider_key").on(t.organizationId, t.provider),
  uniqueIndex7("crm_connection_account_key").on(t.provider, t.externalAccountId),
  uniqueIndex7("crm_connection_provider_id_key").on(t.organizationId, t.id, t.provider)
]);
var crmMappings2 = coreSchema2.table("crm_mapping", {
  organizationId: text37("organization_id").notNull(),
  connectionId: text37("connection_id").notNull(),
  kind: text37("kind", { enum: CRM_MAPPING_KINDS2 }).notNull(),
  key: text37("key").notNull(),
  outcome: text37("outcome", { enum: CRM_STAGE_OUTCOMES2 }),
  label: text37("label"),
  direction: text37("direction", { enum: CRM_DIRECTIONS2 }),
  updatedAt: ts5("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey8({
    name: "crm_mapping_pkey",
    columns: [t.organizationId, t.connectionId, t.kind, t.key]
  }),
  check17("crm_mapping_organization_id_shape", orgShape5),
  check17("crm_mapping_organization_not_global", notGlobal5),
  check17("crm_mapping_connection_id_shape", idShape6("connection_id", "crn")),
  check17("crm_mapping_kind_known", sql22`${t.kind} in (${list6(CRM_MAPPING_KINDS2)})`),
  check17("crm_mapping_key_shape", lengthBetween("key", MAX_CRM_EXTERNAL_ID_LENGTH2)),
  check17("crm_mapping_outcome_known", sql22`${t.outcome} is null or ${t.outcome} in (${list6(CRM_STAGE_OUTCOMES2)})`),
  check17("crm_mapping_direction_known", sql22`${t.direction} is null or ${t.direction} in (${list6(CRM_DIRECTIONS2)})`),
  check17("crm_mapping_label_shape", sql22`${t.label} is null or char_length(${t.label}) between 1 and ${sql22.raw(String(MAX_CRM_LABEL_LENGTH2))}`),
  check17("crm_mapping_kind_columns", sql22`(${t.kind} = 'stage' and ${t.outcome} is not null and ${t.direction} is null)
        or (${t.kind} = 'field' and ${t.direction} is not null and ${t.outcome} is null and ${t.label} is null and ${t.key} in (${list6(CRM_FIELD_KEYS2)}))`),
  check17("crm_mapping_notes_never_both", sql22`${t.key} <> 'activity.notes' or ${t.direction} is distinct from 'both'`),
  foreignKey9({
    name: "crm_mapping_connection_fk",
    columns: [t.organizationId, t.connectionId],
    foreignColumns: [crmConnections2.organizationId, crmConnections2.id]
  }).onDelete("cascade")
]);
var jsonArrayBounded = (column, max) => sql22.raw(`jsonb_typeof("${column}") = 'array' and jsonb_array_length("${column}") <= ${max}`);
var crmSyncRuns2 = coreSchema2.table("crm_sync_run", {
  id: text37("id").notNull(),
  organizationId: text37("organization_id").notNull(),
  connectionId: text37("connection_id").notNull(),
  objectKind: text37("object_kind", { enum: CRM_OBJECT_KINDS2 }).notNull(),
  trigger: text37("trigger", { enum: CRM_RUN_TRIGGERS2 }).notNull(),
  state: text37("state", { enum: CRM_RUN_STATES2 }).notNull().default("queued"),
  requestedAt: ts5("requested_at").notNull().defaultNow(),
  requestedByMembershipId: text37("requested_by_membership_id"),
  startedAt: ts5("started_at"),
  completedAt: ts5("completed_at"),
  createdCount: bigint7("created_count", { mode: "number" }).notNull().default(0),
  updatedCount: bigint7("updated_count", { mode: "number" }).notNull().default(0),
  skippedCount: bigint7("skipped_count", { mode: "number" }).notNull().default(0),
  failedCount: bigint7("failed_count", { mode: "number" }).notNull().default(0),
  unlinkedCount: bigint7("unlinked_count", { mode: "number" }).notNull().default(0),
  skipped: jsonb14("skipped").notNull().default(sql22`'[]'::jsonb`),
  skippedFields: jsonb14("skipped_fields").notNull().default(sql22`'[]'::jsonb`),
  failures: jsonb14("failures").notNull().default(sql22`'[]'::jsonb`),
  failuresTruncated: boolean10("failures_truncated").notNull().default(false),
  errorCode: text37("error_code", { enum: CRM_RUN_ERROR_CODES2 }),
  retryOfRunId: text37("retry_of_run_id"),
  cursor: text37("cursor")
}, (t) => [
  primaryKey8({ name: "crm_sync_run_pkey", columns: [t.organizationId, t.id] }),
  check17("crm_sync_run_id_shape", idShape6("id", "crun")),
  check17("crm_sync_run_organization_id_shape", orgShape5),
  check17("crm_sync_run_organization_not_global", notGlobal5),
  check17("crm_sync_run_connection_id_shape", idShape6("connection_id", "crn")),
  check17("crm_sync_run_requested_by_membership_id_shape", idShape6("requested_by_membership_id", "mem")),
  check17("crm_sync_run_retry_of_run_id_shape", idShape6("retry_of_run_id", "crun")),
  check17("crm_sync_run_object_kind_known", sql22`${t.objectKind} in (${list6(CRM_OBJECT_KINDS2)})`),
  check17("crm_sync_run_trigger_known", sql22`${t.trigger} in (${list6(CRM_RUN_TRIGGERS2)})`),
  check17("crm_sync_run_state_known", sql22`${t.state} in (${list6(CRM_RUN_STATES2)})`),
  check17("crm_sync_run_error_code_known", sql22`${t.errorCode} is null or ${t.errorCode} in (${list6(CRM_RUN_ERROR_CODES2)})`),
  check17("crm_sync_run_counts_bounds", sql22`${t.createdCount} between 0 and ${sql22.raw(String(MAX_CRM_RUN_COUNT2))}
        and ${t.updatedCount} between 0 and ${sql22.raw(String(MAX_CRM_RUN_COUNT2))}
        and ${t.skippedCount} between 0 and ${sql22.raw(String(MAX_CRM_RUN_COUNT2))}
        and ${t.failedCount} between 0 and ${sql22.raw(String(MAX_CRM_RUN_COUNT2))}
        and ${t.unlinkedCount} between 0 and ${sql22.raw(String(MAX_CRM_RUN_COUNT2))}`),
  check17("crm_sync_run_skipped_shape", jsonArrayBounded("skipped", CRM_SKIP_REASON_COUNT2)),
  check17("crm_sync_run_skipped_fields_shape", jsonArrayBounded("skipped_fields", CRM_FIELD_KEYS2.length)),
  check17("crm_sync_run_failures_shape", jsonArrayBounded("failures", MAX_CRM_RUN_FAILURES2)),
  check17("crm_sync_run_cursor_shape", sql22`${t.cursor} is null or char_length(${t.cursor}) between 1 and ${sql22.raw(String(MAX_CRM_CURSOR_LENGTH2))}`),
  check17("crm_sync_run_lifecycle", sql22`(${t.state} = 'queued' and ${t.startedAt} is null and ${t.completedAt} is null)
        or (${t.state} = 'running' and ${t.startedAt} is not null and ${t.completedAt} is null)
        or (${t.state} in ('completed', 'failed') and ${t.completedAt} is not null)`),
  check17("crm_sync_run_error_code_only_when_failed", sql22`${t.errorCode} is null or ${t.state} = 'failed'`),
  foreignKey9({
    name: "crm_sync_run_connection_fk",
    columns: [t.organizationId, t.connectionId],
    foreignColumns: [crmConnections2.organizationId, crmConnections2.id]
  }).onDelete("cascade"),
  foreignKey9({
    name: "crm_sync_run_retry_of_fk",
    columns: [t.organizationId, t.retryOfRunId],
    foreignColumns: [t.organizationId, t.id]
  }),
  index28("crm_sync_runs_list_idx").on(t.organizationId, t.connectionId, t.requestedAt.desc(), t.id.desc()),
  index28("crm_sync_runs_state_list_idx").on(t.organizationId, t.connectionId, t.state, t.requestedAt.desc(), t.id.desc()),
  index28("crm_sync_runs_kind_list_idx").on(t.organizationId, t.connectionId, t.objectKind, t.requestedAt.desc(), t.id.desc())
]);
var crmExternalRefs2 = coreSchema2.table("crm_external_ref", {
  id: text37("id").notNull(),
  organizationId: text37("organization_id").notNull(),
  connectionId: text37("connection_id").notNull(),
  provider: text37("provider", { enum: CRM_PROVIDERS2 }).notNull(),
  objectKind: text37("object_kind", { enum: CRM_OBJECT_KINDS2 }).notNull(),
  externalId: text37("external_id"),
  localId: text37("local_id").notNull(),
  state: text37("state", { enum: CRM_REF_STATES2 }).notNull().default("linked"),
  lastSeenVersion: text37("last_seen_version"),
  lastSeenAt: ts5("last_seen_at"),
  writeKey: text37("write_key"),
  createdAt: ts5("created_at").notNull().defaultNow(),
  updatedAt: ts5("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey8({ name: "crm_external_ref_pkey", columns: [t.organizationId, t.id] }),
  check17("crm_external_ref_id_shape", idShape6("id", "cxr")),
  check17("crm_external_ref_organization_id_shape", orgShape5),
  check17("crm_external_ref_organization_not_global", notGlobal5),
  check17("crm_external_ref_connection_id_shape", idShape6("connection_id", "crn")),
  check17("crm_external_ref_provider_known", sql22`${t.provider} in (${list6(CRM_PROVIDERS2)})`),
  check17("crm_external_ref_object_kind_known", sql22`${t.objectKind} in (${list6(CRM_OBJECT_KINDS2)})`),
  check17("crm_external_ref_state_known", sql22`${t.state} in (${list6(CRM_REF_STATES2)})`),
  check17("crm_external_ref_external_id_shape", sql22`${t.externalId} is null or char_length(${t.externalId}) between 1 and ${sql22.raw(String(MAX_CRM_EXTERNAL_ID_LENGTH2))}`),
  check17("crm_external_ref_local_id_shape", lengthBetween("local_id", MAX_CRM_LOCAL_ID_LENGTH2)),
  check17("crm_external_ref_last_seen_version_shape", sql22`${t.lastSeenVersion} is null or char_length(${t.lastSeenVersion}) between 1 and ${sql22.raw(String(MAX_CRM_CURSOR_LENGTH2))}`),
  check17("crm_external_ref_write_key_shape", sql22`${t.writeKey} is null or char_length(${t.writeKey}) between 1 and ${sql22.raw(String(MAX_CRM_WRITE_KEY_LENGTH2))}`),
  check17("crm_external_ref_state_columns", sql22`(${t.state} = 'pending_write' and ${t.writeKey} is not null)
        or (${t.state} in ('linked', 'unlinked') and ${t.externalId} is not null)`),
  foreignKey9({
    name: "crm_external_ref_connection_fk",
    columns: [t.organizationId, t.connectionId, t.provider],
    foreignColumns: [crmConnections2.organizationId, crmConnections2.id, crmConnections2.provider]
  }).onDelete("cascade"),
  uniqueIndex7("crm_external_ref_object_key").on(t.organizationId, t.provider, t.objectKind, t.externalId),
  uniqueIndex7("crm_external_ref_write_key").on(t.organizationId, t.provider, t.writeKey).where(sql22`${t.writeKey} is not null`),
  index28("crm_external_refs_local_idx").on(t.organizationId, t.provider, t.objectKind, t.localId),
  index28("crm_external_refs_connection_idx").on(t.organizationId, t.connectionId, t.id)
]);
var crmWebhookReceipts2 = coreSchema2.table("crm_webhook_receipt", {
  organizationId: text37("organization_id").notNull(),
  connectionId: text37("connection_id").notNull(),
  eventId: text37("event_id").notNull(),
  receivedAt: ts5("received_at").notNull().defaultNow()
}, (t) => [
  primaryKey8({
    name: "crm_webhook_receipt_pkey",
    columns: [t.organizationId, t.connectionId, t.eventId]
  }),
  check17("crm_webhook_receipt_organization_id_shape", orgShape5),
  check17("crm_webhook_receipt_organization_not_global", notGlobal5),
  check17("crm_webhook_receipt_connection_id_shape", idShape6("connection_id", "crn")),
  check17("crm_webhook_receipt_event_id_shape", lengthBetween("event_id", MAX_CRM_EXTERNAL_ID_LENGTH2)),
  foreignKey9({
    name: "crm_webhook_receipt_connection_fk",
    columns: [t.organizationId, t.connectionId],
    foreignColumns: [crmConnections2.organizationId, crmConnections2.id]
  }).onDelete("cascade"),
  index28("crm_webhook_receipts_age_idx").on(t.organizationId, t.receivedAt)
]);
// src/schema/core-demo-rate-counter.ts
import { sql as sql23 } from "drizzle-orm";
import { check as check18, customType as customType7, index as index29, integer as integer17, primaryKey as primaryKey9, timestamp as timestamp31 } from "drizzle-orm/pg-core";
var DEMO_RATE_ADDRESS_HASH_BYTES2 = 32;
var bytea = customType7({
  dataType() {
    return "bytea";
  }
});
var demoRateCounters2 = coreSchema2.table("demo_rate_counter", {
  addressHash: bytea("address_hash").notNull(),
  windowStart: timestamp31("window_start", { withTimezone: true }).notNull(),
  hits: integer17("hits").notNull()
}, (t) => [
  primaryKey9({ name: "demo_rate_counter_pkey", columns: [t.addressHash, t.windowStart] }),
  check18("demo_rate_counter_address_hash_length", sql23`octet_length(${t.addressHash}) = ${sql23.raw(String(DEMO_RATE_ADDRESS_HASH_BYTES2))}`),
  check18("demo_rate_counter_hits_positive", sql23`${t.hits} >= 1`),
  index29("demo_rate_counters_window_start_idx").on(t.windowStart)
]);
// src/schema/core-demo-requests.ts
import { sql as sql24 } from "drizzle-orm";
import { check as check19, index as index30, integer as integer18, text as text38, timestamp as timestamp32, unique as unique23 } from "drizzle-orm/pg-core";
var DEMO_NOTIFICATION_STATUSES2 = ["pending", "sent", "failed"];
var DEMO_REQUEST_NAME_MAX2 = 200;
var DEMO_REQUEST_MESSAGE_MAX2 = 2000;
var DEMO_REQUEST_SOURCE_PAGE_MAX2 = 200;
var DEMO_REQUEST_KEY_LENGTH2 = { min: 16, max: 128 };
var list7 = (values) => sql24.raw(values.map((v) => `'${v}'`).join(", "));
var demoRequests2 = coreSchema2.table("demo_request", {
  id: text38("id").primaryKey(),
  name: text38("name").notNull(),
  workEmail: text38("work_email").notNull(),
  companyName: text38("company_name").notNull(),
  message: text38("message"),
  sourcePage: text38("source_page").notNull(),
  idempotencyKey: text38("idempotency_key").notNull(),
  notificationStatus: text38("notification_status", { enum: DEMO_NOTIFICATION_STATUSES2 }).notNull().default("pending"),
  notificationAttempts: integer18("notification_attempts").notNull().default(0),
  notificationLastAttemptAt: timestamp32("notification_last_attempt_at", { withTimezone: true }),
  submittedAt: timestamp32("submitted_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  check19("demo_request_id_shape", sql24`"id" ~ '^dreq_[0-9a-f]{32}$'`),
  check19("demo_request_name_shape", sql24`char_length(btrim(${t.name})) between 1 and ${sql24.raw(String(DEMO_REQUEST_NAME_MAX2))}`),
  check19("demo_request_work_email_shape", sql24`${t.workEmail} = lower(${t.workEmail} collate "C")
        and char_length(${t.workEmail}) between 3 and 320
        and char_length(${t.workEmail}) - char_length(replace(${t.workEmail}, '@', '')) = 1
        and position('@' in ${t.workEmail}) between 2 and char_length(${t.workEmail}) - 1
        and ${t.workEmail} collate "C" !~ '[[:space:][:cntrl:]]'
        and ${t.workEmail} collate "C" ~ '^[!-~]+$'`),
  check19("demo_request_company_name_shape", sql24`char_length(btrim(${t.companyName})) between 1 and ${sql24.raw(String(DEMO_REQUEST_NAME_MAX2))}`),
  check19("demo_request_message_length", sql24`${t.message} is null or char_length(${t.message}) <= ${sql24.raw(String(DEMO_REQUEST_MESSAGE_MAX2))}`),
  check19("demo_request_source_page_shape", sql24`char_length(${t.sourcePage}) between 1 and ${sql24.raw(String(DEMO_REQUEST_SOURCE_PAGE_MAX2))}
        and left(${t.sourcePage}, 1) = '/'`),
  check19("demo_request_idempotency_key_length", sql24`char_length(${t.idempotencyKey}) between ${sql24.raw(String(DEMO_REQUEST_KEY_LENGTH2.min))} and ${sql24.raw(String(DEMO_REQUEST_KEY_LENGTH2.max))}`),
  check19("demo_request_notification_status_known", sql24`${t.notificationStatus} in (${list7(DEMO_NOTIFICATION_STATUSES2)})`),
  check19("demo_request_notification_attempts_not_negative", sql24`${t.notificationAttempts} >= 0`),
  unique23("demo_request_idempotency_key_key").on(t.idempotencyKey),
  index30("demo_requests_submitted_at_idx").on(t.submittedAt),
  index30("demo_requests_notice_idx").on(t.submittedAt, t.id).where(sql24`${t.notificationStatus} = 'pending'`)
]);
// src/schema/playbook.ts
import { pgSchema as pgSchema3 } from "drizzle-orm/pg-core";
var playbookSchema2 = pgSchema3("playbook");
// src/schema/playbook-calls.ts
import { sql as sql27 } from "drizzle-orm";
import {
  bigint as bigint10,
  check as check22,
  customType as customType9,
  foreignKey as foreignKey12,
  index as index33,
  integer as integer21,
  primaryKey as primaryKey12,
  text as text41,
  timestamp as timestamp35,
  uniqueIndex as uniqueIndex10,
  uuid as uuid25
} from "drizzle-orm/pg-core";

// src/schema/playbook-sales-history.ts
import { sql as sql26 } from "drizzle-orm";
import {
  bigint as bigint9,
  boolean as boolean11,
  check as check21,
  date as date3,
  foreignKey as foreignKey11,
  index as index32,
  integer as integer20,
  numeric,
  primaryKey as primaryKey11,
  text as text40,
  timestamp as timestamp34,
  uniqueIndex as uniqueIndex9,
  uuid as uuid24
} from "drizzle-orm/pg-core";

// src/schema/playbook-tables.ts
import { sql as sql25 } from "drizzle-orm";
import {
  bigint as bigint8,
  check as check20,
  customType as customType8,
  foreignKey as foreignKey10,
  index as index31,
  integer as integer19,
  primaryKey as primaryKey10,
  text as text39,
  timestamp as timestamp33,
  uniqueIndex as uniqueIndex8,
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
var bytes7 = customType8({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var list8 = (values) => sql25.raw(values.map((v) => `'${v}'`).join(", "));
var idShape7 = (column, prefix) => sql25.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var GLOBAL_SCOPE_ORGANIZATION_ID2 = "org_00000000000000000000000000000000";
var notGlobal6 = sql25.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`);
var ts6 = (name) => timestamp33(name, { withTimezone: true });
var createdAt3 = () => ts6("created_at").notNull().defaultNow();
var updatedAt3 = () => ts6("updated_at").notNull().defaultNow();
var PENDING_CLEANUP_PREDICATE2 = "state = 'deleted' and (vectors_removed_seq is null or vectors_removed_seq < deletion_seq)";
var documents2 = playbookSchema2.table("documents", {
  id: text39("id").notNull(),
  organizationId: text39("organization_id").notNull(),
  name: text39("name").notNull(),
  state: text39("state", { enum: DOCUMENT_STATES2 }).notNull().default("uploaded"),
  contentHash: bytes7("content_hash").notNull(),
  sizeBytes: bigint8("size_bytes", { mode: "number" }).notNull(),
  declaredType: text39("declared_type").notNull(),
  detectedType: text39("detected_type", { enum: DOCUMENT_FILE_TYPES2 }).notNull(),
  uploadedBy: text39("uploaded_by").notNull(),
  objectKey: text39("object_key").notNull(),
  failureReason: text39("failure_reason", { enum: DOCUMENT_FAILURE_REASONS2 }),
  pageCount: integer19("page_count"),
  epoch: integer19("epoch").notNull().default(0),
  deletionSeq: integer19("deletion_seq").notNull().default(0),
  vectorsRemovedSeq: integer19("vectors_removed_seq"),
  deletedAt: ts6("deleted_at"),
  deletedBy: text39("deleted_by"),
  purgeDueAt: ts6("purge_due_at"),
  purgeStartedAt: ts6("purge_started_at"),
  purgeLeaseUntil: ts6("purge_lease_until"),
  purgeAttempts: integer19("purge_attempts").notNull().default(0),
  restoreBarredAt: ts6("restore_barred_at"),
  createdAt: createdAt3(),
  updatedAt: updatedAt3()
}, (t) => [
  primaryKey10({ name: "documents_pkey", columns: [t.organizationId, t.id] }),
  check20("documents_id_shape", idShape7("id", "doc")),
  check20("documents_organization_id_shape", idShape7("organization_id", "org")),
  check20("documents_organization_not_global", notGlobal6),
  check20("documents_uploaded_by_shape", idShape7("uploaded_by", "usr")),
  check20("documents_deleted_by_shape", sql25`${t.deletedBy} ~ '^usr_[0-9a-f]{32}$'`),
  check20("documents_name_shape", sql25`char_length(btrim(${t.name})) between 1 and 255`),
  check20("documents_state_known", sql25`${t.state} in (${list8(DOCUMENT_STATES2)})`),
  check20("documents_content_hash_length", sql25`octet_length(${t.contentHash}) = 32`),
  check20("documents_size_bounds", sql25`${t.sizeBytes} between 1 and ${sql25.raw(String(DOCUMENT_MAX_BYTES2))}`),
  check20("documents_declared_type_shape", sql25`char_length(${t.declaredType}) between 1 and 255 and ${t.declaredType} collate "C" ~ '^[ -~]+$'`),
  check20("documents_detected_type_known", sql25`${t.detectedType} in (${list8(DOCUMENT_FILE_TYPES2)})`),
  check20("documents_object_key_shape", sql25`char_length(${t.objectKey}) between 1 and 1024 and ${t.objectKey} collate "C" ~ '^[!-~]+$'`),
  check20("documents_failure_reason_known", sql25`${t.failureReason} in (${list8(DOCUMENT_FAILURE_REASONS2)})`),
  check20("documents_failed_has_reason", sql25`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check20("documents_page_count_positive", sql25`${t.pageCount} > 0`),
  check20("documents_epoch_bounds", sql25`${t.epoch} >= 0 and ${t.deletionSeq} >= 0`),
  check20("documents_vectors_removed_seq_bounds", sql25`${t.vectorsRemovedSeq} between 0 and ${t.deletionSeq}`),
  check20("documents_deleted_has_times", sql25`(${t.state} = 'deleted') = (${t.deletedAt} is not null)
        and (${t.state} = 'deleted') = (${t.purgeDueAt} is not null)`),
  check20("documents_deleted_by_when_deleted", sql25`${t.state} = 'deleted' or ${t.deletedBy} is null`),
  check20("documents_deleted_is_counted", sql25`(${t.state} <> 'deleted') or ${t.deletionSeq} >= 1`),
  check20("documents_purge_due_after_delete", sql25`${t.purgeDueAt} >= ${t.deletedAt}`),
  check20("documents_purge_only_when_deleted", sql25`(${t.purgeStartedAt} is null or ${t.state} = 'deleted')
        and (${t.purgeStartedAt} is null) = (${t.purgeLeaseUntil} is null)
        and (${t.purgeStartedAt} is null) = (${t.purgeAttempts} = 0)`),
  check20("documents_purge_attempts_bounds", sql25`${t.purgeAttempts} between 0 and ${sql25.raw(String(DOCUMENT_PURGE_MAX_ATTEMPTS2))}`),
  check20("documents_barred_only_when_deleted", sql25`${t.restoreBarredAt} is null or ${t.state} = 'deleted'`),
  uniqueIndex8("documents_content_hash_key").on(t.organizationId, t.contentHash).where(sql25`${t.purgeStartedAt} is null and ${t.restoreBarredAt} is null`),
  index31("documents_list_idx").on(t.organizationId, t.createdAt, t.id).where(sql25`${t.state} <> 'deleted'`),
  index31("documents_state_list_idx").on(t.organizationId, t.state, t.createdAt, t.id).where(sql25`${t.state} <> 'deleted'`),
  index31("documents_deleted_list_idx").on(t.organizationId, t.createdAt, t.id).where(sql25`${t.state} = 'deleted'`),
  index31("documents_purge_idx").on(t.organizationId, t.purgeDueAt, t.id).where(sql25`${t.state} = 'deleted' and ${t.purgeAttempts} < ${sql25.raw(String(DOCUMENT_PURGE_MAX_ATTEMPTS2))}`),
  index31("documents_unbarred_idx").on(t.organizationId, t.id).where(sql25`${t.restoreBarredAt} is null`),
  index31("documents_cleanup_idx").on(t.organizationId, t.deletedAt, t.id).where(sql25.raw(PENDING_CLEANUP_PREDICATE2)),
  index31("documents_spent_purge_idx").on(t.organizationId, t.id).where(sql25`${t.state} = 'deleted' and ${t.purgeAttempts} >= ${sql25.raw(String(DOCUMENT_PURGE_MAX_ATTEMPTS2))}`)
]);
var organizationUsage2 = playbookSchema2.table("organization_usage", {
  organizationId: text39("organization_id").primaryKey(),
  documentCount: bigint8("document_count", { mode: "number" }).notNull().default(0),
  byteCount: bigint8("byte_count", { mode: "number" }).notNull().default(0),
  dealCount: bigint8("deal_count", { mode: "number" }).notNull().default(0),
  callCount: bigint8("call_count", { mode: "number" }).notNull().default(0),
  recordingByteCount: bigint8("recording_byte_count", { mode: "number" }).notNull().default(0),
  updatedAt: updatedAt3()
}, (t) => [
  check20("organization_usage_organization_id_shape", idShape7("organization_id", "org")),
  check20("organization_usage_organization_not_global", notGlobal6),
  check20("organization_usage_not_negative", sql25`${t.documentCount} >= 0 and ${t.byteCount} >= 0`),
  check20("organization_usage_deal_count_not_negative", sql25`${t.dealCount} >= 0`),
  check20("organization_usage_call_counts_not_negative", sql25`${t.callCount} >= 0 and ${t.recordingByteCount} >= 0`)
]);
var ingestionJobs2 = playbookSchema2.table("ingestion_jobs", {
  id: text39("id").notNull(),
  organizationId: text39("organization_id").notNull(),
  documentId: text39("document_id").notNull(),
  epoch: integer19("epoch").notNull(),
  state: text39("state", { enum: INGESTION_JOB_STATES2 }).notNull().default("queued"),
  step: text39("step", { enum: INGESTION_STEPS2 }).notNull().default("parse"),
  attempts: integer19("attempts").notNull().default(0),
  nextAttemptAt: ts6("next_attempt_at").notNull(),
  claimToken: uuid23("claim_token"),
  artifactKey: text39("artifact_key"),
  pageCount: integer19("page_count"),
  chunkCount: integer19("chunk_count"),
  chunksDone: integer19("chunks_done").notNull().default(0),
  failureReason: text39("failure_reason", { enum: DOCUMENT_FAILURE_REASONS2 }),
  finishedAt: ts6("finished_at"),
  createdAt: createdAt3(),
  updatedAt: updatedAt3()
}, (t) => [
  primaryKey10({ name: "ingestion_jobs_pkey", columns: [t.organizationId, t.id] }),
  foreignKey10({
    name: "ingestion_jobs_document_fk",
    columns: [t.organizationId, t.documentId],
    foreignColumns: [documents2.organizationId, documents2.id]
  }).onDelete("cascade"),
  check20("ingestion_jobs_id_shape", idShape7("id", "job")),
  check20("ingestion_jobs_organization_id_shape", idShape7("organization_id", "org")),
  check20("ingestion_jobs_organization_not_global", notGlobal6),
  check20("ingestion_jobs_epoch_bounds", sql25`${t.epoch} >= 0`),
  check20("ingestion_jobs_state_known", sql25`${t.state} in (${list8(INGESTION_JOB_STATES2)})`),
  check20("ingestion_jobs_step_known", sql25`${t.step} in (${list8(INGESTION_STEPS2)})`),
  check20("ingestion_jobs_attempts_bounds", sql25`${t.attempts} between 0 and ${sql25.raw(String(INGESTION_JOB_MAX_ATTEMPTS2))}`),
  check20("ingestion_jobs_running_has_token", sql25`(${t.state} = 'running') = (${t.claimToken} is not null)`),
  check20("ingestion_jobs_artifact_key_shape", sql25`char_length(${t.artifactKey}) between 1 and 1024 and ${t.artifactKey} collate "C" ~ '^[!-~]+$'`),
  check20("ingestion_jobs_counts_bounds", sql25`${t.pageCount} between 1 and ${sql25.raw(String(DOCUMENT_MAX_PAGE_COUNT2))}
        and ${t.chunkCount} between 0 and ${sql25.raw(String(INGESTION_MAX_CHUNKS2))}
        and ${t.chunksDone} >= 0 and ${t.chunksDone} <= coalesce(${t.chunkCount}, 0)`),
  check20("ingestion_jobs_failure_reason_known", sql25`${t.failureReason} in (${list8(DOCUMENT_FAILURE_REASONS2)})`),
  check20("ingestion_jobs_failed_has_reason", sql25`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check20("ingestion_jobs_final_has_finish", sql25`(${t.state} in ('succeeded', 'failed', 'cancelled')) = (${t.finishedAt} is not null)`),
  index31("ingestion_jobs_document_idx").on(t.organizationId, t.documentId),
  uniqueIndex8("ingestion_jobs_active_document_key").on(t.organizationId, t.documentId).where(sql25`${t.state} in ('queued', 'running')`),
  index31("ingestion_jobs_due_idx").on(t.organizationId, t.nextAttemptAt).where(sql25`${t.state} in ('queued', 'running')`)
]);
var indexSettings2 = playbookSchema2.table("index_settings", {
  organizationId: text39("organization_id").primaryKey(),
  embeddingModel: text39("embedding_model").notNull(),
  embeddingDimension: integer19("embedding_dimension").notNull(),
  vectorsWrittenAt: ts6("vectors_written_at"),
  createdAt: createdAt3(),
  updatedAt: updatedAt3()
}, (t) => [
  check20("index_settings_organization_id_shape", idShape7("organization_id", "org")),
  check20("index_settings_organization_not_global", notGlobal6),
  check20("index_settings_model_shape", sql25`char_length(${t.embeddingModel}) between 1 and 200 and ${t.embeddingModel} collate "C" ~ '^[A-Za-z0-9._:/-]+$'`),
  check20("index_settings_dimension_bounds", sql25`${t.embeddingDimension} between 1 and 16384`)
]);

// src/schema/playbook-sales-history.ts
var DEAL_OUTCOMES2 = ["won", "lost", "open"];
var DEAL_IMPORT_STATES2 = ["uploaded", "processing", "completed", "failed"];
var DEAL_IMPORT_FAILURE_REASONS2 = [
  "too_many_rows",
  "unreadable",
  "processing_failed"
];
var DEAL_IMPORT_ROW_RESULTS2 = ["applied", "rejected"];
var DEAL_IMPORT_ROW_REASONS2 = [
  "wrong_column_count",
  "invalid_deal_id",
  "duplicate_in_file",
  "invalid_outcome",
  "invalid_closed_at",
  "invalid_amount",
  "invalid_currency",
  "invalid_name",
  "outcome_already_decided",
  "deal_limit_reached",
  "blank_row"
];
var DEAL_IMPORT_ROW_REASONS_WITHOUT_DEAL_ID2 = [
  "invalid_deal_id",
  "wrong_column_count",
  "blank_row"
];
var MAX_QUEUED_DEAL_IMPORTS2 = 5;
var DEAL_ID_MAX_LENGTH2 = 128;
var DEAL_ID_MAX_BYTES2 = 512;
var DEAL_NAME_MAX_LENGTH2 = 200;
var DEAL_NAME_MAX_BYTES2 = 800;
var DEAL_IMPORT_MAX_ROWS2 = 50000;
var DEAL_IMPORT_MAX_BYTES2 = 10 * 1024 * 1024;
var DEAL_MAX_SEQ2 = 2147483647;
var RIGHTS_MAX_WORDING_VERSION2 = 1e6;
var DEAL_IMPORT_MAX_ATTEMPTS2 = 20;
var DEAL_IMPORT_APPLY_BATCH2 = 500;
var list9 = (values) => sql26.raw(values.map((v) => `'${v}'`).join(", "));
var idShape8 = (column, prefix) => sql26.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var notGlobal7 = sql26.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`);
var ts7 = (name) => timestamp34(name, { withTimezone: true });
var deals2 = playbookSchema2.table("deals", {
  id: text40("id").notNull(),
  organizationId: text40("organization_id").notNull(),
  dealId: text40("deal_id").notNull(),
  name: text40("name"),
  outcome: text40("outcome", { enum: DEAL_OUTCOMES2 }).notNull().default("open"),
  outcomeSeq: integer20("outcome_seq").notNull().default(0),
  retagThrough: integer20("retag_through").notNull().default(0),
  closedAt: date3("closed_at", { mode: "string" }),
  amount: numeric("amount", { precision: 17, scale: 2 }),
  currency: text40("currency"),
  appearedInImport: boolean11("appeared_in_import").notNull().default(false),
  createdAt: ts7("created_at").notNull().defaultNow(),
  updatedAt: ts7("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey11({ name: "deals_pkey", columns: [t.organizationId, t.id] }),
  check21("deals_id_shape", idShape8("id", "deal")),
  check21("deals_organization_id_shape", idShape8("organization_id", "org")),
  check21("deals_organization_not_global", notGlobal7),
  check21("deals_deal_id_shape", sql26`char_length(${t.dealId}) between 1 and ${sql26.raw(String(DEAL_ID_MAX_LENGTH2))}
        and octet_length(${t.dealId}) <= ${sql26.raw(String(DEAL_ID_MAX_BYTES2))}
        and ${t.dealId} = btrim(${t.dealId}, E' \\t\\n\\r\\f\\v')`),
  check21("deals_name_shape", sql26`${t.name} is null or (char_length(${t.name}) between 1 and ${sql26.raw(String(DEAL_NAME_MAX_LENGTH2))}
        and octet_length(${t.name}) <= ${sql26.raw(String(DEAL_NAME_MAX_BYTES2))})`),
  check21("deals_outcome_known", sql26`${t.outcome} in (${list9(DEAL_OUTCOMES2)})`),
  check21("deals_outcome_seq_range", sql26`${t.outcomeSeq} between 0 and ${sql26.raw(String(DEAL_MAX_SEQ2))}`),
  check21("deals_amount_range", sql26`${t.amount} is null or ${t.amount} >= 0`),
  check21("deals_currency_shape", sql26`${t.currency} is null or ${t.currency} ~ '^[A-Z]{3}$'`),
  check21("deals_amount_has_currency", sql26`${t.amount} is null or ${t.currency} is not null`),
  check21("deals_retag_through_range", sql26`${t.retagThrough} between 0 and ${t.outcomeSeq}`),
  uniqueIndex9("deals_deal_id_key").on(t.organizationId, t.dealId),
  index32("deals_retag_idx").on(t.organizationId, t.id).where(sql26`${t.retagThrough} < ${t.outcomeSeq}`),
  index32("deals_list_idx").on(t.organizationId, t.createdAt, t.id),
  index32("deals_outcome_list_idx").on(t.organizationId, t.outcome, t.createdAt, t.id),
  index32("deals_import_list_idx").on(t.organizationId, t.appearedInImport, t.createdAt, t.id)
]);
var dealImports2 = playbookSchema2.table("deal_imports", {
  id: text40("id").notNull(),
  organizationId: text40("organization_id").notNull(),
  state: text40("state", { enum: DEAL_IMPORT_STATES2 }).notNull().default("uploaded"),
  failureReason: text40("failure_reason", { enum: DEAL_IMPORT_FAILURE_REASONS2 }),
  uploadedBy: text40("uploaded_by").notNull(),
  objectKey: text40("object_key").notNull(),
  sizeBytes: bigint9("size_bytes", { mode: "number" }).notNull(),
  attempts: integer20("attempts").notNull().default(0),
  nextAttemptAt: ts7("next_attempt_at").notNull().defaultNow(),
  claimToken: uuid24("claim_token"),
  rowCount: integer20("row_count"),
  appliedCount: integer20("applied_count").notNull().default(0),
  rejectedCount: integer20("rejected_count").notNull().default(0),
  reportThrough: integer20("report_through").notNull().default(1),
  objectRemovedAt: ts7("object_removed_at"),
  erasedAt: ts7("erased_at"),
  finishedAt: ts7("finished_at"),
  createdAt: ts7("created_at").notNull().defaultNow(),
  updatedAt: ts7("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey11({ name: "deal_imports_pkey", columns: [t.organizationId, t.id] }),
  check21("deal_imports_id_shape", idShape8("id", "dimp")),
  check21("deal_imports_organization_id_shape", idShape8("organization_id", "org")),
  check21("deal_imports_organization_not_global", notGlobal7),
  check21("deal_imports_uploaded_by_shape", idShape8("uploaded_by", "usr")),
  check21("deal_imports_state_known", sql26`${t.state} in (${list9(DEAL_IMPORT_STATES2)})`),
  check21("deal_imports_failure_reason_known", sql26`${t.failureReason} is null or ${t.failureReason} in (${list9(DEAL_IMPORT_FAILURE_REASONS2)})`),
  check21("deal_imports_failure_matches_state", sql26`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check21("deal_imports_size_range", sql26`${t.sizeBytes} between 1 and ${sql26.raw(String(DEAL_IMPORT_MAX_BYTES2))}`),
  check21("deal_imports_attempts_range", sql26`${t.attempts} between 0 and ${sql26.raw(String(DEAL_IMPORT_MAX_ATTEMPTS2))}`),
  check21("deal_imports_counts_range", sql26`${t.appliedCount} between 0 and ${sql26.raw(String(DEAL_IMPORT_MAX_ROWS2))}
        and ${t.rejectedCount} between 0 and ${sql26.raw(String(DEAL_IMPORT_MAX_ROWS2))}
        and ${t.appliedCount} + ${t.rejectedCount} <= ${sql26.raw(String(DEAL_IMPORT_MAX_ROWS2))}`),
  check21("deal_imports_report_contiguous", sql26`${t.reportThrough} between 1 and ${sql26.raw(String(DEAL_IMPORT_MAX_ROWS2 + 1))}
        and ${t.appliedCount} + ${t.rejectedCount} = ${t.reportThrough} - 1`),
  check21("deal_imports_row_count_matches_state", sql26`(${t.state} = 'completed') = (${t.rowCount} is not null)
        and (${t.rowCount} is null or ${t.rowCount} = ${t.appliedCount} + ${t.rejectedCount})`),
  check21("deal_imports_claim_only_while_processing", sql26`${t.claimToken} is null or ${t.state} = 'processing'`),
  check21("deal_imports_finished_matches_state", sql26`(${t.state} in ('completed', 'failed')) = (${t.finishedAt} is not null)`),
  check21("deal_imports_erased_is_final", sql26`${t.erasedAt} is null or ${t.state} in ('completed', 'failed')`),
  index32("deal_imports_list_idx").on(t.organizationId, t.createdAt, t.id),
  index32("deal_imports_due_idx").on(t.organizationId, t.nextAttemptAt).where(sql26`${t.state} in ('uploaded', 'processing')`),
  index32("deal_imports_erased_idx").on(t.organizationId, t.id).where(sql26`${t.erasedAt} is not null`),
  index32("deal_imports_unerased_idx").on(t.organizationId, t.id).where(sql26`${t.erasedAt} is null`)
]);
var dealImportRows2 = playbookSchema2.table("deal_import_rows", {
  organizationId: text40("organization_id").notNull(),
  importId: text40("import_id").notNull(),
  rowNumber: integer20("row_number").notNull(),
  dealId: text40("deal_id"),
  result: text40("result", { enum: DEAL_IMPORT_ROW_RESULTS2 }).notNull(),
  reason: text40("reason", { enum: DEAL_IMPORT_ROW_REASONS2 })
}, (t) => [
  primaryKey11({
    name: "deal_import_rows_pkey",
    columns: [t.organizationId, t.importId, t.rowNumber]
  }),
  foreignKey11({
    name: "deal_import_rows_import_fkey",
    columns: [t.organizationId, t.importId],
    foreignColumns: [dealImports2.organizationId, dealImports2.id]
  }),
  check21("deal_import_rows_organization_id_shape", idShape8("organization_id", "org")),
  check21("deal_import_rows_organization_not_global", notGlobal7),
  check21("deal_import_rows_row_number_range", sql26`${t.rowNumber} between 2 and ${sql26.raw(String(DEAL_IMPORT_MAX_ROWS2 + 1))}`),
  check21("deal_import_rows_result_known", sql26`${t.result} in (${list9(DEAL_IMPORT_ROW_RESULTS2)})`),
  check21("deal_import_rows_reason_known", sql26`${t.reason} is null or ${t.reason} in (${list9(DEAL_IMPORT_ROW_REASONS2)})`),
  check21("deal_import_rows_reason_matches_result", sql26`(${t.result} = 'rejected') = (${t.reason} is not null)`),
  check21("deal_import_rows_deal_id_shape", sql26`${t.dealId} is null or (char_length(${t.dealId}) between 1 and ${sql26.raw(String(DEAL_ID_MAX_LENGTH2))}
        and octet_length(${t.dealId}) <= ${sql26.raw(String(DEAL_ID_MAX_BYTES2))})`),
  check21("deal_import_rows_deal_id_missing_only_when_unusable", sql26`${t.dealId} is not null or ${t.reason} in (${list9(DEAL_IMPORT_ROW_REASONS_WITHOUT_DEAL_ID2)})`),
  uniqueIndex9("deal_import_rows_first_key").on(t.organizationId, t.importId, t.dealId).where(sql26`${t.dealId} is not null and ${t.reason} is distinct from 'duplicate_in_file'`),
  index32("deal_import_rows_result_idx").on(t.organizationId, t.importId, t.result, t.rowNumber)
]);
var rightsConfirmations2 = playbookSchema2.table("rights_confirmations", {
  organizationId: text40("organization_id").primaryKey(),
  confirmedBy: text40("confirmed_by").notNull(),
  confirmedAt: ts7("confirmed_at").notNull().defaultNow(),
  wordingVersion: integer20("wording_version").notNull()
}, (t) => [
  check21("rights_confirmations_organization_id_shape", idShape8("organization_id", "org")),
  check21("rights_confirmations_organization_not_global", notGlobal7),
  check21("rights_confirmations_confirmed_by_shape", idShape8("confirmed_by", "usr")),
  check21("rights_confirmations_wording_version_range", sql26`${t.wordingVersion} between 1 and ${sql26.raw(String(RIGHTS_MAX_WORDING_VERSION2))}`)
]);

// src/schema/playbook-calls.ts
var CALL_STATES2 = [
  "uploaded",
  "transcribing",
  "awaiting_rep",
  "processing",
  "ready",
  "failed",
  "deleted"
];
var CALL_FAILURE_REASONS2 = [
  "no_turns",
  "too_few_speakers",
  "too_many_speakers",
  "rep_label_not_found",
  "not_per_side",
  "too_long",
  "transcription_failed",
  "transcription_timed_out",
  "unreadable",
  "processing_failed"
];
var CALL_KINDS2 = ["transcript", "recording"];
var CALL_MEDIA_TYPES2 = [
  "text/plain",
  "text/vtt",
  "application/x-subrip",
  "application/json",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/flac"
];
var CALL_CHANNELS2 = ["left", "right"];
var CALL_REP_BY2 = ["speaker", "channel"];
var CALL_MAX_TRANSCRIPT_BYTES2 = 5 * 1024 * 1024;
var CALL_MAX_RECORDING_BYTES2 = 500 * 1024 * 1024;
var CALL_MAX_RECORDING_SECONDS2 = 3 * 60 * 60;
var CALL_MAX_SPEAKERS2 = 20;
var CALL_SPEAKER_LABEL_MAX_LENGTH2 = 64;
var CALL_SPEAKER_LABEL_MAX_BYTES2 = 256;
var CALL_MAX_SEQ2 = 2147483647;
var CALL_MAX_MOMENTS2 = 1e6;
var CALL_PURGE_MAX_ATTEMPTS2 = 20;
var CALL_JOB_MAX_ATTEMPTS2 = 20;
var CALL_MAX_VENDOR_SENDS2 = 20;
var MAX_SEARCH_STATE_IDS2 = 100;
var CALL_VENDOR_ID_PATTERN2 = "^[A-Za-z0-9._:-]{1,128}$";
var CALL_JOB_KINDS2 = ["transcribe", "process", "rebuild"];
var CALL_JOB_STATES2 = ["queued", "running", "succeeded", "failed", "cancelled"];
function repChangeAllowed2(state, failureReason) {
  if (state === "ready" || state === "awaiting_rep") {
    return true;
  }
  return state === "failed" && (failureReason === "rep_label_not_found" || failureReason === "not_per_side");
}
function callReuploadRequeues2(failureReason) {
  return failureReason === "transcription_failed" || failureReason === "transcription_timed_out" || failureReason === "processing_failed";
}
var bytes8 = customType9({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var textArray3 = customType9({
  dataType: () => "text[]"
});
var list10 = (values) => sql27.raw(values.map((v) => `'${v}'`).join(", "));
var idShape9 = (column, prefix) => sql27.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var notGlobal8 = sql27.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`);
var ts8 = (name) => timestamp35(name, { withTimezone: true });
var CALL_PENDING_CLEANUP_PREDICATE2 = "state = 'deleted' and (vectors_removed_seq is null or vectors_removed_seq < deletion_seq)";
var CALL_ORIGINS2 = ["imported", "rep", "agent"];
var calls2 = playbookSchema2.table("calls", {
  id: text41("id").notNull(),
  organizationId: text41("organization_id").notNull(),
  dealRecordId: text41("deal_record_id").notNull(),
  kind: text41("kind", { enum: CALL_KINDS2 }).notNull(),
  fileName: text41("file_name").notNull(),
  mediaType: text41("media_type", { enum: CALL_MEDIA_TYPES2 }).notNull(),
  sizeBytes: bigint10("size_bytes", { mode: "number" }).notNull(),
  contentHash: bytes8("content_hash").notNull(),
  durationSeconds: integer21("duration_seconds"),
  state: text41("state", { enum: CALL_STATES2 }).notNull().default("uploaded"),
  failureReason: text41("failure_reason", { enum: CALL_FAILURE_REASONS2 }),
  repBy: text41("rep_by", { enum: CALL_REP_BY2 }),
  repLabel: text41("rep_label"),
  repChannel: text41("rep_channel", { enum: CALL_CHANNELS2 }),
  speakerLabels: textArray3("speaker_labels").notNull().default(sql27`'{}'::text[]`),
  uploadedBy: text41("uploaded_by").notNull(),
  objectKey: text41("object_key").notNull(),
  transcriptKey: text41("transcript_key"),
  epoch: integer21("epoch").notNull().default(0),
  repSeq: integer21("rep_seq").notNull().default(0),
  deletionSeq: integer21("deletion_seq").notNull().default(0),
  vectorsRemovedSeq: integer21("vectors_removed_seq"),
  taggedOutcomeSeq: integer21("tagged_outcome_seq").notNull().default(0),
  origin: text41("origin", { enum: CALL_ORIGINS2 }).notNull().default("imported"),
  sentToVendorAt: ts8("sent_to_vendor_at"),
  vendorSendSeq: integer21("vendor_send_seq").notNull().default(0),
  vendorRemovedAt: ts8("vendor_removed_at"),
  deletedAt: ts8("deleted_at"),
  deletedBy: text41("deleted_by"),
  purgeDueAt: ts8("purge_due_at"),
  purgeStartedAt: ts8("purge_started_at"),
  purgeLeaseUntil: ts8("purge_lease_until"),
  purgeAttempts: integer21("purge_attempts").notNull().default(0),
  restoreBarredAt: ts8("restore_barred_at"),
  embeddedMoments: integer21("embedded_moments"),
  skippedMoments: integer21("skipped_moments"),
  createdAt: ts8("created_at").notNull().defaultNow(),
  updatedAt: ts8("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey12({ name: "calls_pkey", columns: [t.organizationId, t.id] }),
  foreignKey12({
    name: "calls_deal_fk",
    columns: [t.organizationId, t.dealRecordId],
    foreignColumns: [deals2.organizationId, deals2.id]
  }),
  check22("calls_id_shape", idShape9("id", "call")),
  check22("calls_organization_id_shape", idShape9("organization_id", "org")),
  check22("calls_organization_not_global", notGlobal8),
  check22("calls_deal_record_id_shape", idShape9("deal_record_id", "deal")),
  check22("calls_uploaded_by_shape", idShape9("uploaded_by", "usr")),
  check22("calls_deleted_by_shape", sql27`${t.deletedBy} ~ '^usr_[0-9a-f]{32}$'`),
  check22("calls_kind_known", sql27`${t.kind} in (${list10(CALL_KINDS2)})`),
  check22("calls_media_type_known", sql27`${t.mediaType} in (${list10(CALL_MEDIA_TYPES2)})`),
  check22("calls_kind_matches_media_type", sql27`(${t.kind} = 'recording') = (${t.mediaType} like 'audio/%')`),
  check22("calls_file_name_shape", sql27`char_length(btrim(${t.fileName})) between 1 and 255`),
  check22("calls_content_hash_length", sql27`octet_length(${t.contentHash}) = 32`),
  check22("calls_size_bounds", sql27`${t.sizeBytes} between 1 and ${sql27.raw(String(CALL_MAX_RECORDING_BYTES2))}
        and (${t.kind} = 'recording' or ${t.sizeBytes} <= ${sql27.raw(String(CALL_MAX_TRANSCRIPT_BYTES2))})`),
  check22("calls_duration_bounds", sql27`${t.durationSeconds} is null or (${t.durationSeconds} between 1 and ${sql27.raw(String(CALL_MAX_RECORDING_SECONDS2))}
        and ${t.kind} = 'recording')`),
  check22("calls_origin_known", sql27`${t.origin} in (${list10(CALL_ORIGINS2)})`),
  check22("calls_state_known", sql27`${t.state} in (${list10(CALL_STATES2)})`),
  check22("calls_failure_reason_known", sql27`${t.failureReason} in (${list10(CALL_FAILURE_REASONS2)})`),
  check22("calls_failed_has_reason", sql27`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check22("calls_transcript_states", sql27`${t.kind} = 'recording' or ${t.state} not in ('transcribing', 'awaiting_rep')`),
  check22("calls_rep_shape", sql27`(${t.repBy} is null and ${t.repLabel} is null and ${t.repChannel} is null)
        or (${t.repBy} = 'speaker' and ${t.repLabel} is not null and ${t.repChannel} is null)
        or (${t.repBy} = 'channel' and ${t.repChannel} is not null and ${t.repLabel} is null
            and ${t.kind} = 'recording')`),
  check22("calls_rep_label_shape", sql27`${t.repLabel} is null or char_length(${t.repLabel}) between 1 and ${sql27.raw(String(CALL_SPEAKER_LABEL_MAX_LENGTH2))}
      and octet_length(${t.repLabel}) <= ${sql27.raw(String(CALL_SPEAKER_LABEL_MAX_BYTES2))}`),
  check22("calls_awaiting_rep_has_none", sql27`${t.state} <> 'awaiting_rep' or ${t.repBy} is null`),
  check22("calls_ready_has_rep", sql27`${t.state} <> 'ready' or ${t.repBy} is not null`),
  check22("calls_ready_label_listed", sql27`${t.state} <> 'ready' or ${t.repBy} is distinct from 'speaker' or ${t.repLabel} = any(${t.speakerLabels})`),
  check22("calls_moment_counts", sql27`(${t.embeddedMoments} is null) = (${t.skippedMoments} is null)
        and (${t.embeddedMoments} is null or (${t.embeddedMoments} between 0 and ${sql27.raw(String(CALL_MAX_MOMENTS2))}
          and ${t.skippedMoments} between 0 and ${sql27.raw(String(CALL_MAX_MOMENTS2))}))`),
  check22("calls_speaker_labels_valid", sql27`playbook.speaker_labels_ok(${t.speakerLabels})`),
  check22("calls_too_many_speakers_lists_none", sql27`${t.failureReason} is distinct from 'too_many_speakers' or cardinality(${t.speakerLabels}) = 0`),
  check22("calls_object_key_shape", sql27`char_length(${t.objectKey}) between 1 and 1024 and ${t.objectKey} collate "C" ~ '^[!-~]+$'`),
  check22("calls_transcript_key_shape", sql27`char_length(${t.transcriptKey}) between 1 and 1024 and ${t.transcriptKey} collate "C" ~ '^[!-~]+$'`),
  check22("calls_seq_bounds", sql27`${t.epoch} >= 0 and ${t.deletionSeq} >= 0
        and ${t.repSeq} between 0 and ${sql27.raw(String(CALL_MAX_SEQ2))}
        and ${t.taggedOutcomeSeq} between 0 and ${sql27.raw(String(CALL_MAX_SEQ2))}`),
  check22("calls_vectors_removed_seq_bounds", sql27`${t.vectorsRemovedSeq} between 0 and ${t.deletionSeq}`),
  check22("calls_deleted_has_times", sql27`(${t.state} = 'deleted') = (${t.deletedAt} is not null)
        and (${t.state} = 'deleted') = (${t.purgeDueAt} is not null)`),
  check22("calls_deleted_by_when_deleted", sql27`${t.state} = 'deleted' or ${t.deletedBy} is null`),
  check22("calls_deleted_is_counted", sql27`${t.state} <> 'deleted' or ${t.deletionSeq} >= 1`),
  check22("calls_purge_due_after_delete", sql27`${t.purgeDueAt} >= ${t.deletedAt}`),
  check22("calls_purge_only_when_deleted", sql27`(${t.purgeStartedAt} is null or ${t.state} = 'deleted')
        and (${t.purgeStartedAt} is null) = (${t.purgeLeaseUntil} is null)
        and (${t.purgeStartedAt} is null) = (${t.purgeAttempts} = 0)`),
  check22("calls_purge_attempts_bounds", sql27`${t.purgeAttempts} between 0 and ${sql27.raw(String(CALL_PURGE_MAX_ATTEMPTS2))}`),
  check22("calls_barred_only_when_deleted", sql27`${t.restoreBarredAt} is null or ${t.state} = 'deleted'`),
  check22("calls_vendor_removal_after_send", sql27`${t.vendorRemovedAt} is null or ${t.sentToVendorAt} is not null`),
  check22("calls_vendor_send_seq_max", sql27`${t.vendorSendSeq} <= ${sql27.raw(String(CALL_MAX_VENDOR_SENDS2))}`),
  check22("calls_vendor_send_seq_matches", sql27`${t.vendorSendSeq} >= 0 and (${t.sentToVendorAt} is null) = (${t.vendorSendSeq} = 0)`),
  check22("calls_transcript_has_rep", sql27`${t.kind} <> 'transcript' or ${t.repBy} is not null`),
  uniqueIndex10("calls_content_hash_key").on(t.organizationId, t.contentHash).where(sql27`${t.purgeStartedAt} is null and ${t.restoreBarredAt} is null`),
  index33("calls_list_idx").on(t.organizationId, t.createdAt, t.id).where(sql27`${t.state} <> 'deleted'`),
  index33("calls_state_list_idx").on(t.organizationId, t.state, t.createdAt, t.id),
  index33("calls_deal_list_idx").on(t.organizationId, t.dealRecordId, t.createdAt, t.id).where(sql27`${t.state} <> 'deleted'`),
  index33("calls_deal_state_list_idx").on(t.organizationId, t.dealRecordId, t.state, t.createdAt, t.id),
  index33("calls_purge_idx").on(t.organizationId, t.purgeDueAt, t.id).where(sql27`${t.state} = 'deleted' and ${t.purgeAttempts} < ${sql27.raw(String(CALL_PURGE_MAX_ATTEMPTS2))}`),
  index33("calls_unbarred_idx").on(t.organizationId, t.id).where(sql27`${t.restoreBarredAt} is null`),
  index33("calls_cleanup_idx").on(t.organizationId, t.deletedAt, t.id).where(sql27.raw(CALL_PENDING_CLEANUP_PREDICATE2)),
  index33("calls_spent_purge_idx").on(t.organizationId, t.id).where(sql27`${t.state} = 'deleted' and ${t.purgeAttempts} >= ${sql27.raw(String(CALL_PURGE_MAX_ATTEMPTS2))}`),
  index33("calls_retag_idx").on(t.organizationId, t.dealRecordId, t.id).where(sql27`${t.state} = 'ready'`)
]);
var callJobs2 = playbookSchema2.table("call_jobs", {
  id: text41("id").notNull(),
  organizationId: text41("organization_id").notNull(),
  callId: text41("call_id").notNull(),
  kind: text41("kind", { enum: CALL_JOB_KINDS2 }).notNull(),
  epoch: integer21("epoch").notNull(),
  repSeq: integer21("rep_seq").notNull().default(0),
  state: text41("state", { enum: CALL_JOB_STATES2 }).notNull().default("queued"),
  attempts: integer21("attempts").notNull().default(0),
  nextAttemptAt: ts8("next_attempt_at").notNull(),
  claimToken: uuid25("claim_token"),
  failureReason: text41("failure_reason", { enum: CALL_FAILURE_REASONS2 }),
  finishedAt: ts8("finished_at"),
  createdAt: ts8("created_at").notNull().defaultNow(),
  updatedAt: ts8("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey12({ name: "call_jobs_pkey", columns: [t.organizationId, t.id] }),
  foreignKey12({
    name: "call_jobs_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [calls2.organizationId, calls2.id]
  }).onDelete("cascade"),
  check22("call_jobs_id_shape", idShape9("id", "cjob")),
  check22("call_jobs_organization_id_shape", idShape9("organization_id", "org")),
  check22("call_jobs_organization_not_global", notGlobal8),
  check22("call_jobs_kind_known", sql27`${t.kind} in (${list10(CALL_JOB_KINDS2)})`),
  check22("call_jobs_state_known", sql27`${t.state} in (${list10(CALL_JOB_STATES2)})`),
  check22("call_jobs_epoch_seq_bounds", sql27`${t.epoch} >= 0 and ${t.repSeq} between 0 and ${sql27.raw(String(CALL_MAX_SEQ2))}`),
  check22("call_jobs_attempts_bounds", sql27`${t.attempts} between 0 and ${sql27.raw(String(CALL_JOB_MAX_ATTEMPTS2))}`),
  check22("call_jobs_running_has_token", sql27`(${t.state} = 'running') = (${t.claimToken} is not null)`),
  check22("call_jobs_failure_reason_known", sql27`${t.failureReason} in (${list10(CALL_FAILURE_REASONS2)})`),
  check22("call_jobs_failed_has_reason", sql27`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check22("call_jobs_final_has_finish", sql27`(${t.state} in ('succeeded', 'failed', 'cancelled')) = (${t.finishedAt} is not null)`),
  index33("call_jobs_call_idx").on(t.organizationId, t.callId),
  uniqueIndex10("call_jobs_active_call_key").on(t.organizationId, t.callId).where(sql27`${t.state} in ('queued', 'running')`),
  index33("call_jobs_due_idx").on(t.organizationId, t.nextAttemptAt).where(sql27`${t.state} in ('queued', 'running')`)
]);
var callVendorSends2 = playbookSchema2.table("call_vendor_sends", {
  organizationId: text41("organization_id").notNull(),
  callId: text41("call_id").notNull(),
  seq: integer21("seq").notNull(),
  vendorId: text41("vendor_id"),
  createdAt: ts8("created_at").notNull().defaultNow(),
  recordedAt: ts8("recorded_at")
}, (t) => [
  primaryKey12({
    name: "call_vendor_sends_pkey",
    columns: [t.organizationId, t.callId, t.seq]
  }),
  foreignKey12({
    name: "call_vendor_sends_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [calls2.organizationId, calls2.id]
  }).onDelete("cascade"),
  check22("call_vendor_sends_organization_id_shape", idShape9("organization_id", "org")),
  check22("call_vendor_sends_organization_not_global", notGlobal8),
  check22("call_vendor_sends_seq_bounds", sql27`${t.seq} between 1 and ${sql27.raw(String(CALL_MAX_VENDOR_SENDS2))}`),
  check22("call_vendor_sends_vendor_id_shape", sql27.raw(`"vendor_id" is null or "vendor_id" ~ '${CALL_VENDOR_ID_PATTERN2}'`)),
  check22("call_vendor_sends_recorded_matches", sql27`(${t.vendorId} is null) = (${t.recordedAt} is null)`),
  uniqueIndex10("call_vendor_sends_org_vendor_id_key").on(t.organizationId, t.vendorId).where(sql27`${t.vendorId} is not null`)
]);
// src/schema/playbook-consumed.ts
import { sql as sql28 } from "drizzle-orm";
import { check as check23, index as index34, primaryKey as primaryKey13, text as text42, timestamp as timestamp36, uuid as uuid26 } from "drizzle-orm/pg-core";
var list11 = (values) => sql28.raw(values.map((v) => `'${v}'`).join(", "));
var idShape10 = (column, prefix) => sql28.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var ts9 = (name) => timestamp36(name, { withTimezone: true });
var consumedMessage2 = playbookSchema2.table("consumed_message", {
  consumer: text42("consumer").notNull(),
  organizationId: text42("organization_id").notNull(),
  messageId: text42("message_id").notNull(),
  state: text42("state", { enum: CONSUMED_MESSAGE_STATES2 }).notNull(),
  claimToken: uuid26("claim_token").notNull(),
  leaseExpiresAt: ts9("lease_expires_at"),
  completedAt: ts9("completed_at")
}, (t) => [
  primaryKey13({
    name: "consumed_message_pkey",
    columns: [t.consumer, t.organizationId, t.messageId]
  }),
  check23("consumed_message_organization_id_shape", idShape10("organization_id", "org")),
  check23("consumed_message_consumer_shape", sql28`char_length(${t.consumer}) between 1 and 128 and ${t.consumer} collate "C" ~ '^[A-Za-z0-9_.:-]+$'`),
  check23("consumed_message_message_id_shape", sql28`char_length(${t.messageId}) between 1 and 128 and ${t.messageId} collate "C" ~ '^[A-Za-z0-9_.:-]+$'`),
  check23("consumed_message_state_known", sql28`${t.state} in (${list11(CONSUMED_MESSAGE_STATES2)})`),
  check23("consumed_message_state_columns", sql28`(${t.state} = 'claimed' and ${t.leaseExpiresAt} is not null and ${t.completedAt} is null)
        or (${t.state} = 'done' and ${t.leaseExpiresAt} is null and ${t.completedAt} is not null)`),
  index34("consumed_message_done_idx").on(t.organizationId, t.completedAt).where(sql28`${t.state} = 'done'`),
  index34("consumed_message_lease_idx").on(t.organizationId, t.leaseExpiresAt).where(sql28`${t.state} = 'claimed'`)
]);
// src/schema/playbook-embed-usage.ts
import { sql as sql29 } from "drizzle-orm";
import { check as check24, date as date4, integer as integer22, primaryKey as primaryKey14, text as text43 } from "drizzle-orm/pg-core";
var EMBED_USAGE_MAX_ADD2 = 1e6;
var EMBED_USAGE_MAX_MOMENTS2 = 1e9;
var playbookEmbedUsage2 = playbookSchema2.table("embed_usage", {
  organizationId: text43("organization_id").notNull(),
  day: date4("day", { mode: "string" }).notNull(),
  moments: integer22("moments").notNull().default(0)
}, (t) => [
  primaryKey14({ name: "embed_usage_pkey", columns: [t.organizationId, t.day] }),
  check24("embed_usage_organization_id_shape", sql29.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)),
  check24("embed_usage_organization_not_global", sql29.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`)),
  check24("embed_usage_moments_bounds", sql29`${t.moments} between 0 and ${sql29.raw(String(EMBED_USAGE_MAX_MOMENTS2))}`)
]);
// src/schema/playbook-idempotency.ts
import { sql as sql30 } from "drizzle-orm";
import {
  check as check25,
  customType as customType10,
  index as index35,
  jsonb as jsonb15,
  primaryKey as primaryKey15,
  smallint as smallint3,
  text as text44,
  timestamp as timestamp37
} from "drizzle-orm/pg-core";
var idShape11 = (column, prefix) => sql30.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var bytes9 = customType10({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var INTERNAL_CALL_USER_ID2 = "usr_00000000000000000000000000000000";
var playbookIdempotencyKeys2 = playbookSchema2.table("idempotency_keys", {
  organizationId: text44("organization_id").notNull(),
  userId: text44("user_id").notNull(),
  route: text44("route").notNull(),
  key: text44("key").notNull(),
  requestHash: bytes9("request_hash").notNull(),
  status: smallint3("status"),
  response: jsonb15("response").$type(),
  createdAt: timestamp37("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  primaryKey15({
    name: "idempotency_keys_pkey",
    columns: [t.organizationId, t.userId, t.route, t.key]
  }),
  check25("idempotency_keys_organization_id_shape", idShape11("organization_id", "org")),
  check25("idempotency_keys_organization_not_global", sql30.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`)),
  check25("idempotency_keys_user_id_shape", idShape11("user_id", "usr")),
  check25("idempotency_keys_route_shape", sql30`char_length(${t.route}) between 1 and ${sql30.raw(String(IDEMPOTENCY_ROUTE_MAX2))}
        and ${t.route} collate "C" ~ '^[a-z0-9._]+$'`),
  check25("idempotency_keys_key_shape", sql30`char_length(${t.key}) between 1 and ${sql30.raw(String(IDEMPOTENCY_KEY_MAX2))}
        and ${t.key} collate "C" ~ '^[!-~]+$'`),
  check25("idempotency_keys_request_hash_length", sql30`octet_length(${t.requestHash}) = ${sql30.raw(String(IDEMPOTENCY_HASH_BYTES2))}`),
  check25("idempotency_keys_status_range", sql30`${t.status} between 100 and 599`),
  check25("idempotency_keys_response_matches_status", sql30`(${t.status} is null) = (${t.response} is null)`),
  check25("idempotency_keys_response_size", sql30`octet_length(${t.response}::text) <= ${sql30.raw(String(IDEMPOTENCY_RESPONSE_MAX_BYTES2))}`),
  index35("idempotency_keys_purge_idx").on(t.organizationId, t.createdAt)
]);
// src/schema/playbook-orphan-sweeps.ts
import { sql as sql31 } from "drizzle-orm";
import { check as check26, text as text45, timestamp as timestamp38 } from "drizzle-orm/pg-core";
var ORPHAN_SWEEP_CURSOR_MAX_BYTES2 = 1024;
var ORPHAN_SWEEP_MIN_CLAIM_MS2 = 1000;
var ORPHAN_SWEEP_MAX_CLAIM_MS2 = 3600000;
var playbookOrphanSweeps2 = playbookSchema2.table("orphan_sweeps", {
  organizationId: text45("organization_id").primaryKey(),
  sweptThrough: timestamp38("swept_through", { withTimezone: true }).notNull(),
  erasedAttemptAt: timestamp38("erased_attempt_at", { withTimezone: true }),
  sweepCursor: text45("sweep_cursor"),
  sweepClaimUntil: timestamp38("sweep_claim_until", { withTimezone: true })
}, (t) => [
  check26("orphan_sweeps_organization_id_shape", sql31.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)),
  check26("orphan_sweeps_cursor_bounds", sql31`${t.sweepCursor} is null or octet_length(${t.sweepCursor}) between 1 and ${sql31.raw(String(ORPHAN_SWEEP_CURSOR_MAX_BYTES2))}`),
  check26("orphan_sweeps_organization_not_global", sql31.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`))
]);
// src/schema/playbook-suggestions.ts
import { sql as sql32 } from "drizzle-orm";
import {
  check as check27,
  customType as customType11,
  index as index36,
  jsonb as jsonb16,
  primaryKey as primaryKey16,
  text as text46,
  timestamp as timestamp39,
  uniqueIndex as uniqueIndex11
} from "drizzle-orm/pg-core";
var SUGGESTION_KINDS2 = ["objection_answer", "discovery_question", "closing_move"];
var SUGGESTION_STATUSES2 = ["pending", "accepted", "rejected"];
var MAX_SUGGESTION_TEXT_LENGTH2 = 1000;
var MAX_SUGGESTION_MOMENTS2 = 10;
var SUGGESTION_FINGERPRINT_BYTES2 = 32;
var bytes10 = customType11({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var list12 = (values) => sql32.raw(values.map((v) => `'${v}'`).join(", "));
var idShape12 = (column, prefix) => sql32.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var notGlobal9 = sql32.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`);
var ts10 = (name) => timestamp39(name, { withTimezone: true });
var suggestions2 = playbookSchema2.table("suggestions", {
  id: text46("id").notNull(),
  organizationId: text46("organization_id").notNull(),
  kind: text46("kind", { enum: SUGGESTION_KINDS2 }).notNull(),
  status: text46("status", { enum: SUGGESTION_STATUSES2 }).notNull().default("pending"),
  text: text46("text").notNull(),
  fingerprint: bytes10("fingerprint").notNull(),
  dealRecordId: text46("deal_record_id").notNull(),
  moments: jsonb16("moments").notNull().default(sql32`'[]'::jsonb`),
  createdAt: ts10("created_at").notNull().defaultNow(),
  decidedAt: ts10("decided_at"),
  decidedByMembershipId: text46("decided_by_membership_id")
}, (t) => [
  primaryKey16({ name: "suggestions_pkey", columns: [t.organizationId, t.id] }),
  check27("suggestions_id_shape", idShape12("id", "sgs")),
  check27("suggestions_organization_id_shape", idShape12("organization_id", "org")),
  check27("suggestions_organization_not_global", notGlobal9),
  check27("suggestions_kind_known", sql32`${t.kind} in (${list12(SUGGESTION_KINDS2)})`),
  check27("suggestions_status_known", sql32`${t.status} in (${list12(SUGGESTION_STATUSES2)})`),
  check27("suggestions_text_length", sql32`char_length(btrim(${t.text})) between 1 and ${sql32.raw(String(MAX_SUGGESTION_TEXT_LENGTH2))}`),
  check27("suggestions_fingerprint_length", sql32`octet_length(${t.fingerprint}) = ${sql32.raw(String(SUGGESTION_FINGERPRINT_BYTES2))}`),
  check27("suggestions_deal_record_id_shape", idShape12("deal_record_id", "deal")),
  check27("suggestions_moments_shape", sql32`jsonb_typeof(${t.moments}) = 'array' and jsonb_array_length(${t.moments}) <= ${sql32.raw(String(MAX_SUGGESTION_MOMENTS2))}`),
  check27("suggestions_decided_by_shape", sql32`${t.decidedByMembershipId} is null or ${t.decidedByMembershipId} ~ '^mem_[0-9a-f]{32}$'`),
  check27("suggestions_decision_columns", sql32`(${t.status} = 'pending' and ${t.decidedAt} is null and ${t.decidedByMembershipId} is null)
        or (${t.status} <> 'pending' and ${t.decidedAt} is not null and ${t.decidedByMembershipId} is not null)`),
  uniqueIndex11("suggestions_fingerprint_key").on(t.organizationId, t.fingerprint),
  index36("suggestions_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index36("suggestions_status_list_idx").on(t.organizationId, t.status, t.createdAt.desc(), t.id.desc())
]);
// src/schema/playbook-work-hints.ts
import { sql as sql33 } from "drizzle-orm";
import { check as check28, index as index37, primaryKey as primaryKey17, text as text47, timestamp as timestamp40 } from "drizzle-orm/pg-core";
var WORK_KINDS2 = [
  "purge_due",
  "jobs_due",
  "cleanup_pending",
  "consumed_purge",
  "idempotency_purge",
  "purge_spent",
  "orphan_sweep",
  "import_apply",
  "call_jobs",
  "call_purge",
  "call_cleanup",
  "call_purge_spent",
  "outcome_retag"
];
var playbookWorkHints2 = playbookSchema2.table("work_hints", {
  kind: text47("kind", { enum: WORK_KINDS2 }).notNull(),
  organizationId: text47("organization_id").notNull(),
  dueAt: timestamp40("due_at", { withTimezone: true }).notNull()
}, (t) => [
  primaryKey17({ name: "work_hints_pkey", columns: [t.kind, t.organizationId] }),
  check28("work_hints_kind_known", sql33`${t.kind} in (${sql33.raw(WORK_KINDS2.map((k) => `'${k}'`).join(", "))})`),
  check28("work_hints_organization_id_shape", sql33.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)),
  check28("work_hints_global_only_consumed", sql33`${t.kind} = 'consumed_purge' or ${t.organizationId} <> ${sql33.raw(`'${GLOBAL_SCOPE_ORGANIZATION_ID2}'`)}`),
  index37("work_hints_due_idx").on(t.kind, t.dueAt, t.organizationId)
]);
// src/schema/voice.ts
import { pgSchema as pgSchema4 } from "drizzle-orm/pg-core";
var voiceSchema2 = pgSchema4("voice");
// src/schema/voice-idempotency.ts
import { sql as sql34 } from "drizzle-orm";
import {
  check as check29,
  customType as customType12,
  index as index38,
  jsonb as jsonb17,
  primaryKey as primaryKey18,
  smallint as smallint4,
  text as text48,
  timestamp as timestamp41
} from "drizzle-orm/pg-core";
var idShape13 = (column, prefix) => sql34.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var bytes11 = customType12({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var voiceIdempotencyKeys2 = voiceSchema2.table("idempotency_keys", {
  organizationId: text48("organization_id").notNull(),
  userId: text48("user_id").notNull(),
  route: text48("route").notNull(),
  key: text48("key").notNull(),
  requestHash: bytes11("request_hash").notNull(),
  status: smallint4("status"),
  response: jsonb17("response").$type(),
  createdAt: timestamp41("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  primaryKey18({
    name: "idempotency_keys_pkey",
    columns: [t.organizationId, t.userId, t.route, t.key]
  }),
  check29("idempotency_keys_organization_id_shape", idShape13("organization_id", "org")),
  check29("idempotency_keys_organization_not_global", sql34.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)),
  check29("idempotency_keys_user_id_shape", idShape13("user_id", "usr")),
  check29("idempotency_keys_route_shape", sql34`char_length(${t.route}) between 1 and ${sql34.raw(String(IDEMPOTENCY_ROUTE_MAX2))}
        and ${t.route} collate "C" ~ '^[a-z0-9._]+$'`),
  check29("idempotency_keys_key_shape", sql34`char_length(${t.key}) between 1 and ${sql34.raw(String(IDEMPOTENCY_KEY_MAX2))}
        and ${t.key} collate "C" ~ '^[!-~]+$'`),
  check29("idempotency_keys_request_hash_length", sql34`octet_length(${t.requestHash}) = ${sql34.raw(String(IDEMPOTENCY_HASH_BYTES2))}`),
  check29("idempotency_keys_status_range", sql34`${t.status} between 100 and 599`),
  check29("idempotency_keys_response_matches_status", sql34`(${t.status} is null) = (${t.response} is null)`),
  check29("idempotency_keys_response_size", sql34`octet_length(${t.response}::text) <= ${sql34.raw(String(IDEMPOTENCY_RESPONSE_MAX_BYTES2))}`),
  index38("idempotency_keys_purge_idx").on(t.organizationId, t.createdAt)
]);
// src/schema/voice-tables.ts
import { sql as sql35 } from "drizzle-orm";
import {
  bigint as bigint11,
  boolean as boolean12,
  check as check30,
  foreignKey as foreignKey13,
  index as index39,
  integer as integer23,
  primaryKey as primaryKey19,
  smallint as smallint5,
  text as text49,
  timestamp as timestamp42,
  uniqueIndex as uniqueIndex12
} from "drizzle-orm/pg-core";
var LINE_STATES2 = ["porting", "active", "released"];
var LINE_ASSIGNMENT_KINDS2 = ["unassigned", "team", "rep"];
var MAX_LINE_LABEL_LENGTH2 = 100;
var VOICE_CALL_DIRECTIONS2 = ["inbound", "outbound"];
var VOICE_CALL_STATES2 = [
  "ringing",
  "connecting",
  "disclosing",
  "live",
  "ended",
  "failed",
  "missed"
];
var VOICE_CALL_FINAL_STATES2 = ["ended", "failed", "missed"];
var VOICE_CALL_FAILURE_REASONS2 = [
  "disclosure_failed",
  "carrier_dropped",
  "carrier_rejected",
  "busy",
  "no_answer",
  "rep_unreachable",
  "provider_error",
  "timeout"
];
var VOICE_CALL_ENDED_BY2 = ["rep", "prospect", "system"];
var VOICE_TRANSCRIPT_STATES2 = ["pending", "ready", "deleted"];
var MAX_CALL_DURATION_SECONDS2 = 43200;
var MAX_WRAP_UP_NOTE_LENGTH2 = 2000;
var VOICE_RECORDING_STATES2 = ["storing", "stored", "deleted"];
var MAX_RECORDING_KEY_LENGTH2 = 512;
var VOICE_RECORDING_CHANNELS2 = [1, 2];
var VOICE_CALL_EVENT_KINDS2 = [
  "state_changed",
  "disclosure_played",
  "recording_started",
  "recording_stored",
  "recording_deleted",
  "provider_callback"
];
var MAX_PROVIDER_EVENT_ID_LENGTH2 = 200;
var MAX_VOICE_IDEMPOTENCY_KEY_LENGTH2 = 255;
var list13 = (values) => sql35.raw(values.map((v) => `'${v}'`).join(", "));
var num3 = (value) => sql35.raw(String(value));
var idShape14 = (column, prefix) => sql35.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape6 = sql35.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal10 = sql35.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts11 = (name) => timestamp42(name, { withTimezone: true });
var voiceLines2 = voiceSchema2.table("lines", {
  id: text49("id").notNull(),
  organizationId: text49("organization_id").notNull(),
  number: text49("number").notNull(),
  country: text49("country").notNull(),
  label: text49("label"),
  state: text49("state", { enum: LINE_STATES2 }).notNull(),
  assignmentKind: text49("assignment_kind", { enum: LINE_ASSIGNMENT_KINDS2 }).notNull().default("unassigned"),
  assignmentTeamId: text49("assignment_team_id"),
  assignmentMembershipId: text49("assignment_membership_id"),
  providerSid: text49("provider_sid"),
  createdAt: ts11("created_at").notNull().defaultNow(),
  releasedAt: ts11("released_at")
}, (t) => [
  primaryKey19({ name: "lines_pkey", columns: [t.organizationId, t.id] }),
  check30("lines_id_shape", idShape14("id", "line")),
  check30("lines_organization_id_shape", orgShape6),
  check30("lines_organization_not_global", notGlobal10),
  check30("lines_number_shape", sql35`${t.number} ~ '${sql35.raw(IDENTITY_VALUE_PATTERNS2.phone)}'`),
  check30("lines_country_shape", sql35`${t.country} ~ '^[A-Z]{2}$'`),
  check30("lines_label_shape", sql35`${t.label} is null or char_length(${t.label}) between 1 and ${num3(MAX_LINE_LABEL_LENGTH2)}`),
  check30("lines_state_known", sql35`${t.state} in (${list13(LINE_STATES2)})`),
  check30("lines_assignment_kind_known", sql35`${t.assignmentKind} in (${list13(LINE_ASSIGNMENT_KINDS2)})`),
  check30("lines_assignment_team_id_shape", idShape14("assignment_team_id", "team")),
  check30("lines_assignment_membership_id_shape", idShape14("assignment_membership_id", "mem")),
  check30("lines_assignment_matches_kind", sql35`(${t.assignmentKind} = 'team') = (${t.assignmentTeamId} is not null)
        and (${t.assignmentKind} = 'rep') = (${t.assignmentMembershipId} is not null)`),
  check30("lines_provider_sid_shape", sql35`${t.providerSid} is null or char_length(${t.providerSid}) between 1 and 64`),
  check30("lines_released_at", sql35`(${t.state} = 'released') = (${t.releasedAt} is not null)`),
  check30("lines_released_unassigned", sql35`${t.state} <> 'released' or ${t.assignmentKind} = 'unassigned'`),
  uniqueIndex12("lines_number_live_key").on(t.number).where(sql35`${t.state} <> 'released'`),
  uniqueIndex12("lines_provider_sid_key").on(t.organizationId, t.providerSid).where(sql35`${t.providerSid} is not null`),
  index39("lines_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index39("lines_state_list_idx").on(t.organizationId, t.state, t.createdAt.desc(), t.id.desc()),
  index39("lines_team_idx").on(t.organizationId, t.assignmentTeamId).where(sql35`${t.assignmentTeamId} is not null`),
  index39("lines_rep_idx").on(t.organizationId, t.assignmentMembershipId).where(sql35`${t.assignmentMembershipId} is not null`)
]);
var voiceLineDirectory2 = voiceSchema2.table("line_directory", {
  number: text49("number").primaryKey(),
  organizationId: text49("organization_id").notNull(),
  lineId: text49("line_id").notNull(),
  state: text49("state", { enum: LINE_STATES2 }).notNull()
}, (t) => [
  check30("line_directory_number_shape", sql35`${t.number} ~ '${sql35.raw(IDENTITY_VALUE_PATTERNS2.phone)}'`),
  check30("line_directory_organization_id_shape", orgShape6),
  check30("line_directory_organization_not_global", notGlobal10),
  check30("line_directory_line_id_shape", idShape14("line_id", "line")),
  check30("line_directory_state_known", sql35`${t.state} in ('porting', 'active')`)
]);
var voiceCalls2 = voiceSchema2.table("calls", {
  id: text49("id").notNull(),
  organizationId: text49("organization_id").notNull(),
  direction: text49("direction", { enum: VOICE_CALL_DIRECTIONS2 }).notNull(),
  state: text49("state", { enum: VOICE_CALL_STATES2 }).notNull(),
  lineId: text49("line_id").notNull(),
  repMembershipId: text49("rep_membership_id"),
  prospectId: text49("prospect_id"),
  prospectNumber: text49("prospect_number").notNull(),
  providerCallSid: text49("provider_call_sid"),
  idempotencyKey: text49("idempotency_key"),
  requestFingerprint: text49("request_fingerprint"),
  disclosureWordingVersion: integer23("disclosure_wording_version"),
  disclosurePlayedAt: ts11("disclosure_played_at"),
  aiAssisted: boolean12("ai_assisted").notNull().default(false),
  createdAt: ts11("created_at").notNull().defaultNow(),
  answeredAt: ts11("answered_at"),
  endedAt: ts11("ended_at"),
  durationSeconds: integer23("duration_seconds"),
  endedBy: text49("ended_by", { enum: VOICE_CALL_ENDED_BY2 }),
  failureReason: text49("failure_reason", { enum: VOICE_CALL_FAILURE_REASONS2 }),
  dealId: text49("deal_id"),
  note: text49("note"),
  transcriptState: text49("transcript_state", { enum: VOICE_TRANSCRIPT_STATES2 }).notNull().default("pending"),
  updatedAt: ts11("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey19({ name: "calls_pkey", columns: [t.organizationId, t.id] }),
  check30("calls_id_shape", idShape14("id", "call")),
  check30("calls_organization_id_shape", orgShape6),
  check30("calls_organization_not_global", notGlobal10),
  check30("calls_line_id_shape", idShape14("line_id", "line")),
  check30("calls_rep_membership_id_shape", idShape14("rep_membership_id", "mem")),
  check30("calls_prospect_id_shape", idShape14("prospect_id", "prs")),
  check30("calls_prospect_number_shape", sql35`${t.prospectNumber} ~ '${sql35.raw(IDENTITY_VALUE_PATTERNS2.phone)}'`),
  check30("calls_direction_known", sql35`${t.direction} in (${list13(VOICE_CALL_DIRECTIONS2)})`),
  check30("calls_state_known", sql35`${t.state} in (${list13(VOICE_CALL_STATES2)})`),
  check30("calls_ended_by_known", sql35`${t.endedBy} is null or ${t.endedBy} in (${list13(VOICE_CALL_ENDED_BY2)})`),
  check30("calls_failure_reason_known", sql35`${t.failureReason} is null or ${t.failureReason} in (${list13(VOICE_CALL_FAILURE_REASONS2)})`),
  check30("calls_transcript_state_known", sql35`${t.transcriptState} in (${list13(VOICE_TRANSCRIPT_STATES2)})`),
  check30("calls_provider_call_sid_shape", sql35`${t.providerCallSid} is null or char_length(${t.providerCallSid}) between 1 and 64`),
  check30("calls_idempotency_shape", sql35`(${t.idempotencyKey} is null) = (${t.requestFingerprint} is null)
        and (${t.idempotencyKey} is null or char_length(${t.idempotencyKey}) between 1 and ${num3(MAX_VOICE_IDEMPOTENCY_KEY_LENGTH2)})
        and (${t.requestFingerprint} is null or ${t.requestFingerprint} ~ '^[0-9a-f]{64}$')`),
  check30("calls_disclosure_all_or_none", sql35`(${t.disclosureWordingVersion} is null) = (${t.disclosurePlayedAt} is null)
        and (${t.disclosureWordingVersion} is null or ${t.disclosureWordingVersion} >= 1)`),
  check30("calls_live_has_disclosure", sql35`${t.state} not in ('live', 'ended') or ${t.disclosurePlayedAt} is not null`),
  check30("calls_failed_has_reason", sql35`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check30("calls_disclosure_failure", sql35`${t.failureReason} is distinct from 'disclosure_failed' or ${t.disclosurePlayedAt} is null`),
  check30("calls_final_has_end", sql35`(${t.state} in (${list13(VOICE_CALL_FINAL_STATES2)})) = (${t.endedAt} is not null)`),
  check30("calls_answered", sql35`(${t.state} in ('live', 'ended')) = (${t.answeredAt} is not null)`),
  check30("calls_duration", sql35`(${t.state} = 'ended') = (${t.durationSeconds} is not null)`),
  check30("calls_duration_bounds", sql35`${t.durationSeconds} is null or ${t.durationSeconds} between 0 and ${num3(MAX_CALL_DURATION_SECONDS2)}`),
  check30("calls_ended_by_final", sql35`${t.endedBy} is null or ${t.state} in (${list13(VOICE_CALL_FINAL_STATES2)})`),
  check30("calls_times_ordered", sql35`(${t.answeredAt} is null or ${t.answeredAt} >= ${t.createdAt})
        and (${t.endedAt} is null or ${t.endedAt} >= ${t.createdAt})
        and (${t.answeredAt} is null or ${t.endedAt} is null or ${t.endedAt} >= ${t.answeredAt})`),
  check30("calls_wrap_up_only_ended", sql35`${t.state} = 'ended' or (${t.dealId} is null and ${t.note} is null)`),
  check30("calls_deal_id_shape", sql35`${t.dealId} is null or (char_length(${t.dealId}) between 1 and ${num3(DEAL_ID_MAX_LENGTH2)}
        and octet_length(${t.dealId}) <= ${num3(DEAL_ID_MAX_BYTES2)}
        and ${t.dealId} = btrim(${t.dealId}, E' \\t\\n\\r\\f\\v'))`),
  check30("calls_note_shape", sql35`${t.note} is null or char_length(${t.note}) between 1 and ${num3(MAX_WRAP_UP_NOTE_LENGTH2)}`),
  foreignKey13({
    name: "calls_line_fk",
    columns: [t.organizationId, t.lineId],
    foreignColumns: [voiceLines2.organizationId, voiceLines2.id]
  }),
  uniqueIndex12("calls_provider_call_sid_key").on(t.organizationId, t.providerCallSid).where(sql35`${t.providerCallSid} is not null`),
  uniqueIndex12("calls_idempotency_key_key").on(t.organizationId, t.idempotencyKey).where(sql35`${t.idempotencyKey} is not null`),
  index39("calls_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index39("calls_rep_list_idx").on(t.organizationId, t.repMembershipId, t.createdAt.desc(), t.id.desc()).where(sql35`${t.repMembershipId} is not null`),
  index39("calls_state_list_idx").on(t.organizationId, t.state, t.createdAt.desc(), t.id.desc()),
  index39("calls_prospect_list_idx").on(t.organizationId, t.prospectId, t.createdAt.desc(), t.id.desc()).where(sql35`${t.prospectId} is not null`),
  index39("calls_line_list_idx").on(t.organizationId, t.lineId, t.createdAt.desc(), t.id.desc())
]);
var voiceCallEvents2 = voiceSchema2.table("call_events", {
  id: text49("id").notNull(),
  organizationId: text49("organization_id").notNull(),
  seq: bigint11("seq", { mode: "number" }).generatedAlwaysAsIdentity().notNull(),
  callId: text49("call_id").notNull(),
  kind: text49("kind", { enum: VOICE_CALL_EVENT_KINDS2 }).notNull(),
  fromState: text49("from_state", { enum: VOICE_CALL_STATES2 }),
  toState: text49("to_state", { enum: VOICE_CALL_STATES2 }),
  providerEventId: text49("provider_event_id"),
  occurredAt: ts11("occurred_at").notNull(),
  recordedAt: ts11("recorded_at").notNull().defaultNow()
}, (t) => [
  primaryKey19({ name: "call_events_pkey", columns: [t.organizationId, t.id] }),
  check30("call_events_id_shape", idShape14("id", "vev")),
  check30("call_events_organization_id_shape", orgShape6),
  check30("call_events_organization_not_global", notGlobal10),
  check30("call_events_call_id_shape", idShape14("call_id", "call")),
  check30("call_events_kind_known", sql35`${t.kind} in (${list13(VOICE_CALL_EVENT_KINDS2)})`),
  check30("call_events_from_state_known", sql35`${t.fromState} is null or ${t.fromState} in (${list13(VOICE_CALL_STATES2)})`),
  check30("call_events_to_state_known", sql35`${t.toState} is null or ${t.toState} in (${list13(VOICE_CALL_STATES2)})`),
  check30("call_events_state_change", sql35`(${t.kind} = 'state_changed') = (${t.toState} is not null)
        and (${t.fromState} is null or ${t.toState} is not null)`),
  check30("call_events_provider_event_id_shape", sql35`${t.providerEventId} is null or char_length(${t.providerEventId}) between 1 and ${num3(MAX_PROVIDER_EVENT_ID_LENGTH2)}`),
  foreignKey13({
    name: "call_events_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [voiceCalls2.organizationId, voiceCalls2.id]
  }).onDelete("cascade"),
  uniqueIndex12("call_events_provider_event_key").on(t.organizationId, t.providerEventId),
  index39("call_events_call_idx").on(t.organizationId, t.callId, t.seq)
]);
var voiceRecordings2 = voiceSchema2.table("recordings", {
  id: text49("id").notNull(),
  organizationId: text49("organization_id").notNull(),
  callId: text49("call_id").notNull(),
  storageKey: text49("storage_key").notNull(),
  sizeBytes: bigint11("size_bytes", { mode: "number" }),
  channels: smallint5("channels").notNull(),
  state: text49("state", { enum: VOICE_RECORDING_STATES2 }).notNull().default("storing"),
  createdAt: ts11("created_at").notNull().defaultNow(),
  storedAt: ts11("stored_at"),
  deletedAt: ts11("deleted_at"),
  purgeDueAt: ts11("purge_due_at"),
  updatedAt: ts11("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey19({ name: "recordings_pkey", columns: [t.organizationId, t.id] }),
  check30("recordings_id_shape", idShape14("id", "rec")),
  check30("recordings_organization_id_shape", orgShape6),
  check30("recordings_organization_not_global", notGlobal10),
  check30("recordings_call_id_shape", idShape14("call_id", "call")),
  check30("recordings_storage_key_shape", sql35`char_length(${t.storageKey}) between 1 and ${num3(MAX_RECORDING_KEY_LENGTH2)}
        and ${t.storageKey} collate "C" ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]*$'`),
  check30("recordings_channels_known", sql35`${t.channels} in (1, 2)`),
  check30("recordings_state_known", sql35`${t.state} in (${list13(VOICE_RECORDING_STATES2)})`),
  check30("recordings_size_bounds", sql35`${t.sizeBytes} is null or ${t.sizeBytes} >= 0`),
  check30("recordings_stored", sql35`(${t.state} <> 'storing' or (${t.storedAt} is null and ${t.sizeBytes} is null)) and (${t.state} <> 'stored' or (${t.storedAt} is not null and ${t.sizeBytes} is not null))`),
  check30("recordings_deleted", sql35`(${t.state} = 'deleted') = (${t.deletedAt} is not null)`),
  check30("recordings_purge_only_deleted", sql35`${t.purgeDueAt} is null or ${t.state} = 'deleted'`),
  foreignKey13({
    name: "recordings_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [voiceCalls2.organizationId, voiceCalls2.id]
  }).onDelete("cascade"),
  uniqueIndex12("recordings_call_key").on(t.organizationId, t.callId),
  uniqueIndex12("recordings_storage_key_key").on(t.organizationId, t.storageKey),
  index39("recordings_purge_idx").on(t.organizationId, t.purgeDueAt).where(sql35`${t.state} = 'deleted' and ${t.purgeDueAt} is not null`)
]);
export { authSchema2, workspaces2, projects2, ENVIRONMENT_KINDS2, environments2, TENANT_SETTING, ABANDON_CASE_MAX_ATTEMPTS2, ABANDON_CASE_OUTCOMES2, abandonCases2, API_KEY_KINDS2, apiKeys2, ATTEMPT_COUNTER_KINDS2, ATTEMPT_COUNTER_MAX_HITS2, ATTEMPT_COUNTER_KEY_HASH_BYTES2, attemptCounters2, AUDIT_ACTOR_TYPES2, AUDIT_RETENTION_FLOOR2, auditLogs2, users2, backupCodes2, CREDENTIAL_TYPES2, credentials2, environmentSettings2, EVENT_RETENTION_FLOOR2, events2, flowAttempts2, hooks2, hookCallCounts2, IDENTITY_PROVIDERS2, identities2, instanceAuditLogs2, nativeApps2, OAUTH_PROVIDERS2, oauthProviders2, PASSKEY_CHALLENGE_PURPOSES2, passkeyChallenges2, passkeys2, passwordHistory2, proposals2, SESSION_CLIENTS2, SESSION_REVOKE_REASONS2, SESSION_TYPES2, sessions2, refreshTokens2, SIGNING_KEY_STATUSES2, signingKeys2, SMS_COUNT_RETENTION_FLOOR_DAYS2, smsCodeCounts2, USER_FACTOR_TYPES2, userFactors2, VERIFICATION_PURPOSES2, verificationTokens2, webhookEndpoints2, WEBHOOK_DELIVERY_STATES2, WEBHOOK_DELIVERY_RETENTION_FLOOR2, webhookDeliveries2, webhookDeliveryAttempts2, coreSchema2, MEMBERSHIP_ROLES2, INVITATION_ROLES2, ORGANIZATION_REGIONS2, ORGANIZATION_STATUSES2, INVITATION_STATES2, MEMBER_NAME_MAX2, IDEMPOTENCY_ROUTE_MAX2, IDEMPOTENCY_KEY_MAX2, IDEMPOTENCY_HASH_BYTES2, IDEMPOTENCY_RESPONSE_MAX_BYTES2, organizations2, memberships2, teams2, teamMembers2, invitations2, membershipDirectory2, invitationDirectory2, organizationState2, idempotencyKeys2, ROLLUP_METRICS2, ROLLUP_GROUP_KINDS2, MAX_ROLLUP_GROUP_KEY_LENGTH2, MAX_ROLLUP_COUNT2, TOUCH_KINDS2, TOUCH_CHANNELS2, TOUCH_AGENT_KINDS2, MAX_TOUCH_SOURCES2, SOURCE_KINDS2, MAX_SOURCE_KEY_LENGTH2, SOURCE_PERFORMANCE_FLAGS2, MAX_SOURCE_DEALS2, ASSESSMENT_SUBJECT_KINDS2, ASSESSMENT_VERDICTS2, ASSESSMENT_JUDGE_SOURCES2, FINDING_CATEGORIES2, FINDING_SEVERITIES2, FINDING_FEEDBACKS2, MAX_FINDING_SPAN_OFFSET2, MAX_FINDING_EXPLANATION_LENGTH2, MAX_ASSESSED_NUMBER2, CONVERSATION_OUTCOME_LABELS2, MAX_SUMMARY_LENGTH2, rollupDaily2, touches2, sourcePerformance2, assessments2, assessmentFindings2, conversationSummaries2, PROSPECT_IDENTITY_KINDS2, PROSPECT_STATUSES2, PROSPECT_FIELD_NAMES2, PROSPECT_COMPANY_FIELD_NAMES2, MAX_PROSPECT_COMPANY_TEXT_LENGTH2, MAX_PROSPECT_TECHNOLOGIES_VALUE_LENGTH2, MAX_PROSPECT_COMPANY_TECHNOLOGIES2, MAX_PROSPECT_COMPANY_TECHNOLOGY_LENGTH2, FIELD_HISTORY_STATES2, MAX_FIELD_HISTORY_ENTRIES2, MAX_PROSPECT_FIELD_VALUE_LENGTH2, MAX_SOURCE_REF_LENGTH2, MAX_PROSPECT_COMPANY_NAME_LENGTH2, MAX_PROSPECT_NOTES_LENGTH2, MAX_PROSPECT_TAG_LENGTH2, MAX_PROSPECT_TAGS2, MAX_PROSPECT_IMPORT_BYTES2, MAX_PROSPECT_IMPORT_ROWS2, PROSPECT_IMPORT_STATES2, PROSPECT_IMPORT_FAILURE_REASONS2, PROSPECT_IMPORT_ROW_RESULTS2, PROSPECT_IMPORT_SKIP_REASONS2, PROSPECT_IMPORT_REJECT_REASONS2, PROSPECT_MERGE_STATES2, PROSPECT_MERGE_UNDO_DAYS2, MAX_MERGED_PROSPECTS2, MAX_MERGE_SNAPSHOT_BYTES2, SOURCE_KIND_PATTERN2, IDENTITY_VALUE_PATTERNS2, prospectCompanies2, prospects2, prospectIdentities2, prospectFields2, prospectCompanyFields2, prospectImports2, prospectImportRows2, prospectMerges2, CONSENT_CHANNELS2, CONSENT_GRANT_SOURCES2, CONSENT_WITHDRAWAL_SOURCES2, CONSENT_EVENT_KINDS2, MAX_EVIDENCE_REF_LENGTH2, MAX_SUBMISSION_IP_LENGTH2, MAX_SUBMISSION_USER_AGENT_LENGTH2, MAX_CONSENT_WORDING_LENGTH2, MAX_CONSENT_FORM_NAME_LENGTH2, CONSENT_FORM_STATES2, SUPPRESSION_REASONS2, SUPPRESSION_ADDRESS_KINDS2, SUPPRESSION_REMOVABLE_REASONS2, MAX_SUPPRESSION_NOTE_LENGTH2, MAX_SUPPRESSION_SOURCE_REF_LENGTH2, MAX_MASKED_ADDRESS_LENGTH2, CONTACT_PURPOSES2, LOGGED_DENIAL_CODES2, CONTACT_ALLOW_BASES2, MAX_CALLER_LENGTH2, ADDRESS_HASH_BYTES2, CONTACT_CHECK_RETENTION_DAYS2, FORM_TOKEN_PATTERN2, MIN_FORM_TOKEN_LENGTH2, MAX_FORM_TOKEN_LENGTH2, consentWordings2, consentForms2, consentFormDirectory2, contactConsentEvents2, suppressionEntries2, contactCheckLog2, AGENT_KINDS2, MAX_AGENT_INSTRUCTION_LENGTH2, CONTROL_LEVELS2, AGENT_SETTING_CHANNELS2, DEFAULT_CHANNEL2, ORGANIZATION_AGENT_KIND2, MAX_ESCALATION_RULES2, AUDIT_ACTOR_KINDS2, MAX_AUDIT_METADATA_BYTES2, EXPORT_KINDS2, EXPORT_FORMATS2, EXPORT_STATES2, EXPORT_ACTIVE_STATES2, EXPORT_FAILURE_REASONS2, EXPORT_SERVICES2, EXPORT_PART_STATES2, EXPORT_PART_FAILURE_REASONS2, MAX_EXPORT_PART_FILES2, MAX_EXPORT_PART_BYTES2, MAX_EXPORT_PREFIX_LENGTH2, API_KEY_SCOPES2, MAX_API_KEY_NAME_LENGTH2, API_KEY_ROLE_CEILINGS2, agentInstructionVersions2, agentInstructionPointers2, agentSettings2, auditEvents2, exportJobs2, exportParts2, coreApiKeys2, apiKeyUsage2, CRM_PROVIDERS2, CRM_OBJECT_KINDS2, CRM_SCOPE_LEVELS2, CRM_CONNECTION_STATES2, CRM_DIRECTIONS2, CRM_STAGE_OUTCOMES2, CRM_FIELD_KEYS2, CRM_MAPPING_KINDS2, CRM_RUN_TRIGGERS2, CRM_RUN_STATES2, CRM_RUN_ERROR_CODES2, CRM_REF_STATES2, MAX_CRM_EXTERNAL_ID_LENGTH2, MAX_CRM_LABEL_LENGTH2, MAX_CRM_RUN_COUNT2, CRM_SKIP_REASON_COUNT2, MAX_CRM_RUN_FAILURES2, MAX_CRM_SEALED_TOKEN_BYTES2, MAX_CRM_KEY_ID_LENGTH2, MAX_CRM_CURSOR_LENGTH2, MAX_CRM_WRITE_KEY_LENGTH2, MAX_CRM_LOCAL_ID_LENGTH2, CRM_WEBHOOK_WINDOW_SECONDS2, crmConnections2, crmMappings2, crmSyncRuns2, crmExternalRefs2, crmWebhookReceipts2, DEMO_RATE_ADDRESS_HASH_BYTES2, demoRateCounters2, DEMO_NOTIFICATION_STATUSES2, DEMO_REQUEST_NAME_MAX2, DEMO_REQUEST_MESSAGE_MAX2, DEMO_REQUEST_SOURCE_PAGE_MAX2, DEMO_REQUEST_KEY_LENGTH2, demoRequests2, playbookSchema2, DOCUMENT_STATES2, DOCUMENT_FAILURE_REASONS2, DOCUMENT_FILE_TYPES2, DOCUMENT_MAX_BYTES2, DOCUMENT_MAX_PAGE_COUNT2, DOCUMENT_PURGE_MAX_ATTEMPTS2, INGESTION_JOB_STATES2, INGESTION_STEPS2, INGESTION_JOB_MAX_ATTEMPTS2, INGESTION_MAX_CHUNKS2, CONSUMED_MESSAGE_STATES2, GLOBAL_SCOPE_ORGANIZATION_ID2, PENDING_CLEANUP_PREDICATE2, documents2, organizationUsage2, ingestionJobs2, indexSettings2, DEAL_OUTCOMES2, DEAL_IMPORT_STATES2, DEAL_IMPORT_FAILURE_REASONS2, DEAL_IMPORT_ROW_RESULTS2, DEAL_IMPORT_ROW_REASONS2, DEAL_IMPORT_ROW_REASONS_WITHOUT_DEAL_ID2, MAX_QUEUED_DEAL_IMPORTS2, DEAL_ID_MAX_LENGTH2, DEAL_ID_MAX_BYTES2, DEAL_NAME_MAX_LENGTH2, DEAL_NAME_MAX_BYTES2, DEAL_IMPORT_MAX_ROWS2, DEAL_IMPORT_MAX_BYTES2, DEAL_MAX_SEQ2, RIGHTS_MAX_WORDING_VERSION2, DEAL_IMPORT_MAX_ATTEMPTS2, DEAL_IMPORT_APPLY_BATCH2, deals2, dealImports2, dealImportRows2, rightsConfirmations2, CALL_STATES2, CALL_FAILURE_REASONS2, CALL_KINDS2, CALL_MEDIA_TYPES2, CALL_CHANNELS2, CALL_REP_BY2, CALL_MAX_TRANSCRIPT_BYTES2, CALL_MAX_RECORDING_BYTES2, CALL_MAX_RECORDING_SECONDS2, CALL_MAX_SPEAKERS2, CALL_SPEAKER_LABEL_MAX_LENGTH2, CALL_SPEAKER_LABEL_MAX_BYTES2, CALL_MAX_SEQ2, CALL_MAX_MOMENTS2, CALL_PURGE_MAX_ATTEMPTS2, CALL_JOB_MAX_ATTEMPTS2, CALL_MAX_VENDOR_SENDS2, MAX_SEARCH_STATE_IDS2, CALL_VENDOR_ID_PATTERN2, CALL_JOB_KINDS2, CALL_JOB_STATES2, repChangeAllowed2, callReuploadRequeues2, CALL_PENDING_CLEANUP_PREDICATE2, CALL_ORIGINS2, calls2, callJobs2, callVendorSends2, consumedMessage2, EMBED_USAGE_MAX_ADD2, EMBED_USAGE_MAX_MOMENTS2, playbookEmbedUsage2, INTERNAL_CALL_USER_ID2, playbookIdempotencyKeys2, ORPHAN_SWEEP_CURSOR_MAX_BYTES2, ORPHAN_SWEEP_MIN_CLAIM_MS2, ORPHAN_SWEEP_MAX_CLAIM_MS2, playbookOrphanSweeps2, SUGGESTION_KINDS2, SUGGESTION_STATUSES2, MAX_SUGGESTION_TEXT_LENGTH2, MAX_SUGGESTION_MOMENTS2, SUGGESTION_FINGERPRINT_BYTES2, suggestions2, WORK_KINDS2, playbookWorkHints2, voiceSchema2, voiceIdempotencyKeys2, LINE_STATES2, LINE_ASSIGNMENT_KINDS2, MAX_LINE_LABEL_LENGTH2, VOICE_CALL_DIRECTIONS2, VOICE_CALL_STATES2, VOICE_CALL_FINAL_STATES2, VOICE_CALL_FAILURE_REASONS2, VOICE_CALL_ENDED_BY2, VOICE_TRANSCRIPT_STATES2, MAX_CALL_DURATION_SECONDS2, MAX_WRAP_UP_NOTE_LENGTH2, VOICE_RECORDING_STATES2, MAX_RECORDING_KEY_LENGTH2, VOICE_RECORDING_CHANNELS2, VOICE_CALL_EVENT_KINDS2, MAX_PROVIDER_EVENT_ID_LENGTH2, MAX_VOICE_IDEMPOTENCY_KEY_LENGTH2, voiceLines2, voiceLineDirectory2, voiceCalls2, voiceCallEvents2, voiceRecordings2, exports_schema };
