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
  AGENT_TOOLS: () => AGENT_TOOLS2,
  AGENT_TURN_ROLES: () => AGENT_TURN_ROLES2,
  AGENT_VOICE_STYLES: () => AGENT_VOICE_STYLES2,
  ANGLE_ORIGINS: () => ANGLE_ORIGINS2,
  API_KEY_KINDS: () => API_KEY_KINDS2,
  API_KEY_ROLE_CEILINGS: () => API_KEY_ROLE_CEILINGS2,
  API_KEY_SCOPES: () => API_KEY_SCOPES2,
  APPROVAL_MODES: () => APPROVAL_MODES2,
  ASSESSMENT_JUDGE_SOURCES: () => ASSESSMENT_JUDGE_SOURCES2,
  ASSESSMENT_SUBJECT_KINDS: () => ASSESSMENT_SUBJECT_KINDS2,
  ASSESSMENT_VERDICTS: () => ASSESSMENT_VERDICTS2,
  ATTEMPT_COUNTER_KEY_HASH_BYTES: () => ATTEMPT_COUNTER_KEY_HASH_BYTES2,
  ATTEMPT_COUNTER_KINDS: () => ATTEMPT_COUNTER_KINDS2,
  ATTEMPT_COUNTER_MAX_HITS: () => ATTEMPT_COUNTER_MAX_HITS2,
  ATTEMPT_FAILURES: () => ATTEMPT_FAILURES2,
  ATTEMPT_OUTCOMES: () => ATTEMPT_OUTCOMES2,
  AUDIT_ACTOR_KINDS: () => AUDIT_ACTOR_KINDS2,
  AUDIT_ACTOR_TYPES: () => AUDIT_ACTOR_TYPES2,
  AUDIT_RETENTION_FLOOR: () => AUDIT_RETENTION_FLOOR2,
  BRIEF_ENTRY_ROLES: () => BRIEF_ENTRY_ROLES2,
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
  CAMPAIGN_APPROVAL_MODES: () => CAMPAIGN_APPROVAL_MODES2,
  CAMPAIGN_STATES: () => CAMPAIGN_STATES2,
  CHAT_STATES: () => CHAT_STATES2,
  CHAT_TOKEN_HASH_BYTES: () => CHAT_TOKEN_HASH_BYTES2,
  CITATION_KINDS: () => CITATION_KINDS2,
  CITATION_PROSPECT_FIELDS: () => CITATION_PROSPECT_FIELDS2,
  CLASSIFICATION_DECIDERS: () => CLASSIFICATION_DECIDERS2,
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
  CONVERSATION_CONTROLLERS: () => CONVERSATION_CONTROLLERS2,
  CONVERSATION_OUTCOME_LABELS: () => CONVERSATION_OUTCOME_LABELS2,
  CONVERSATION_STATES: () => CONVERSATION_STATES2,
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
  DECISION_KINDS: () => DECISION_KINDS2,
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
  DRAFT_AUTHORS: () => DRAFT_AUTHORS2,
  DRAFT_CHANNELS: () => DRAFT_CHANNELS2,
  DRAFT_CHECKS: () => DRAFT_CHECKS2,
  DRAFT_CHECK_RESULTS: () => DRAFT_CHECK_RESULTS2,
  DRAFT_HOLD_REASONS: () => DRAFT_HOLD_REASONS2,
  DRAFT_SOURCE_KINDS: () => DRAFT_SOURCE_KINDS2,
  DRAFT_STATUSES: () => DRAFT_STATUSES2,
  DRAFT_TEXT_SOURCES: () => DRAFT_TEXT_SOURCES2,
  EMBED_USAGE_MAX_ADD: () => EMBED_USAGE_MAX_ADD2,
  EMBED_USAGE_MAX_MOMENTS: () => EMBED_USAGE_MAX_MOMENTS2,
  ENROLLMENT_EVENT_KINDS: () => ENROLLMENT_EVENT_KINDS2,
  ENROLLMENT_STATES: () => ENROLLMENT_STATES2,
  ENROLLMENT_STOP_REASONS: () => ENROLLMENT_STOP_REASONS2,
  ENVIRONMENT_KINDS: () => ENVIRONMENT_KINDS2,
  ESCALATION_TARGETS: () => ESCALATION_TARGETS2,
  ESCALATION_TRIGGERS: () => ESCALATION_TRIGGERS2,
  EVENT_RETENTION_FLOOR: () => EVENT_RETENTION_FLOOR2,
  EXPORT_ACTIVE_STATES: () => EXPORT_ACTIVE_STATES2,
  EXPORT_FAILURE_REASONS: () => EXPORT_FAILURE_REASONS2,
  EXPORT_FORMATS: () => EXPORT_FORMATS2,
  EXPORT_KINDS: () => EXPORT_KINDS2,
  EXPORT_PART_FAILURE_REASONS: () => EXPORT_PART_FAILURE_REASONS2,
  EXPORT_PART_STATES: () => EXPORT_PART_STATES2,
  EXPORT_SERVICES: () => EXPORT_SERVICES2,
  EXPORT_STATES: () => EXPORT_STATES2,
  FIELD_GROUPS: () => FIELD_GROUPS2,
  FIELD_HISTORY_STATES: () => FIELD_HISTORY_STATES2,
  FINAL_RUN_STATUSES: () => FINAL_RUN_STATUSES2,
  FINDING_CATEGORIES: () => FINDING_CATEGORIES2,
  FINDING_FEEDBACKS: () => FINDING_FEEDBACKS2,
  FINDING_SEVERITIES: () => FINDING_SEVERITIES2,
  FIT_FIELDS: () => FIT_FIELDS2,
  FIT_OPERATORS: () => FIT_OPERATORS2,
  FORM_TOKEN_PATTERN: () => FORM_TOKEN_PATTERN2,
  GLOBAL_SCOPE_ORGANIZATION_ID: () => GLOBAL_SCOPE_ORGANIZATION_ID2,
  HANDOFF_CHANNELS: () => HANDOFF_CHANNELS2,
  HANDOFF_REASONS: () => HANDOFF_REASONS2,
  HANDOFF_RESULTS: () => HANDOFF_RESULTS2,
  HANDOFF_STATES: () => HANDOFF_STATES2,
  HEALTH_COMPONENT_KINDS: () => HEALTH_COMPONENT_KINDS2,
  HEALTH_EFFECTS: () => HEALTH_EFFECTS2,
  IDEMPOTENCY_HASH_BYTES: () => IDEMPOTENCY_HASH_BYTES2,
  IDEMPOTENCY_KEY_MAX: () => IDEMPOTENCY_KEY_MAX2,
  IDEMPOTENCY_RESPONSE_MAX_BYTES: () => IDEMPOTENCY_RESPONSE_MAX_BYTES2,
  IDEMPOTENCY_ROUTE_MAX: () => IDEMPOTENCY_ROUTE_MAX2,
  IDENTITY_PROVIDERS: () => IDENTITY_PROVIDERS2,
  IDENTITY_VALUE_PATTERNS: () => IDENTITY_VALUE_PATTERNS2,
  INBOX_CHANNELS: () => INBOX_CHANNELS2,
  INGESTION_JOB_MAX_ATTEMPTS: () => INGESTION_JOB_MAX_ATTEMPTS2,
  INGESTION_JOB_STATES: () => INGESTION_JOB_STATES2,
  INGESTION_MAX_CHUNKS: () => INGESTION_MAX_CHUNKS2,
  INGESTION_STEPS: () => INGESTION_STEPS2,
  INQUIRY_CALLBACK_STATES: () => INQUIRY_CALLBACK_STATES2,
  INQUIRY_SKIP_REASONS: () => INQUIRY_SKIP_REASONS2,
  INQUIRY_SOURCES: () => INQUIRY_SOURCES2,
  INTERNAL_CALL_USER_ID: () => INTERNAL_CALL_USER_ID2,
  INVITATION_ROLES: () => INVITATION_ROLES2,
  INVITATION_STATES: () => INVITATION_STATES2,
  LINE_ASSIGNMENT_KINDS: () => LINE_ASSIGNMENT_KINDS2,
  LINE_STATES: () => LINE_STATES2,
  LOGGED_DENIAL_CODES: () => LOGGED_DENIAL_CODES2,
  MAILBOX_KINDS: () => MAILBOX_KINDS2,
  MAILBOX_PROVIDERS: () => MAILBOX_PROVIDERS2,
  MAILBOX_STATES: () => MAILBOX_STATES2,
  MAILBOX_STATE_REASONS: () => MAILBOX_STATE_REASONS2,
  MAIL_EVENT_KINDS: () => MAIL_EVENT_KINDS2,
  MAX_AGENT_CALL_COST_USD_CENTS: () => MAX_AGENT_CALL_COST_USD_CENTS2,
  MAX_AGENT_CALL_SECONDS: () => MAX_AGENT_CALL_SECONDS2,
  MAX_AGENT_CONCURRENCY: () => MAX_AGENT_CONCURRENCY2,
  MAX_AGENT_GREETING_LENGTH: () => MAX_AGENT_GREETING_LENGTH2,
  MAX_AGENT_HOURS_DAYS: () => MAX_AGENT_HOURS_DAYS2,
  MAX_AGENT_IDEMPOTENCY_KEY_LENGTH: () => MAX_AGENT_IDEMPOTENCY_KEY_LENGTH2,
  MAX_AGENT_INSTRUCTION_LENGTH: () => MAX_AGENT_INSTRUCTION_LENGTH2,
  MAX_ANGLE_LENGTH: () => MAX_ANGLE_LENGTH2,
  MAX_ANSWER_LENGTH: () => MAX_ANSWER_LENGTH2,
  MAX_API_KEY_NAME_LENGTH: () => MAX_API_KEY_NAME_LENGTH2,
  MAX_ASSESSED_NUMBER: () => MAX_ASSESSED_NUMBER2,
  MAX_ATTEMPTS_PER_RUN: () => MAX_ATTEMPTS_PER_RUN2,
  MAX_ATTEMPT_DURATION_MS: () => MAX_ATTEMPT_DURATION_MS2,
  MAX_ATTEMPT_EPOCH: () => MAX_ATTEMPT_EPOCH2,
  MAX_AUDIT_METADATA_BYTES: () => MAX_AUDIT_METADATA_BYTES2,
  MAX_BANNED_PHRASES: () => MAX_BANNED_PHRASES2,
  MAX_BRANCH_ARMS: () => MAX_BRANCH_ARMS2,
  MAX_BRIEF_STATEMENTS: () => MAX_BRIEF_STATEMENTS2,
  MAX_BRIEF_STATEMENT_LENGTH: () => MAX_BRIEF_STATEMENT_LENGTH2,
  MAX_CALLBACK_ATTEMPTS: () => MAX_CALLBACK_ATTEMPTS2,
  MAX_CALLER_LENGTH: () => MAX_CALLER_LENGTH2,
  MAX_CALL_DURATION_SECONDS: () => MAX_CALL_DURATION_SECONDS2,
  MAX_CAMPAIGN_NAME_LENGTH: () => MAX_CAMPAIGN_NAME_LENGTH2,
  MAX_CAMPAIGN_VERSION: () => MAX_CAMPAIGN_VERSION2,
  MAX_CHECK_COUNT: () => MAX_CHECK_COUNT2,
  MAX_CITATION_DOCUMENT_PAGE: () => MAX_CITATION_DOCUMENT_PAGE2,
  MAX_CITATION_URL_LENGTH: () => MAX_CITATION_URL_LENGTH2,
  MAX_CONSENT_FORM_NAME_LENGTH: () => MAX_CONSENT_FORM_NAME_LENGTH2,
  MAX_CONSENT_WORDING_LENGTH: () => MAX_CONSENT_WORDING_LENGTH2,
  MAX_COPILOT_QUOTE_LENGTH: () => MAX_COPILOT_QUOTE_LENGTH2,
  MAX_CREDENTIAL_CIPHERTEXT_BYTES: () => MAX_CREDENTIAL_CIPHERTEXT_BYTES2,
  MAX_CREDENTIAL_KEY_ID_LENGTH: () => MAX_CREDENTIAL_KEY_ID_LENGTH2,
  MAX_CRM_CURSOR_LENGTH: () => MAX_CRM_CURSOR_LENGTH2,
  MAX_CRM_EXTERNAL_ID_LENGTH: () => MAX_CRM_EXTERNAL_ID_LENGTH2,
  MAX_CRM_KEY_ID_LENGTH: () => MAX_CRM_KEY_ID_LENGTH2,
  MAX_CRM_LABEL_LENGTH: () => MAX_CRM_LABEL_LENGTH2,
  MAX_CRM_LOCAL_ID_LENGTH: () => MAX_CRM_LOCAL_ID_LENGTH2,
  MAX_CRM_RUN_COUNT: () => MAX_CRM_RUN_COUNT2,
  MAX_CRM_RUN_FAILURES: () => MAX_CRM_RUN_FAILURES2,
  MAX_CRM_SEALED_TOKEN_BYTES: () => MAX_CRM_SEALED_TOKEN_BYTES2,
  MAX_CRM_WRITE_KEY_LENGTH: () => MAX_CRM_WRITE_KEY_LENGTH2,
  MAX_DAILY_CAP: () => MAX_DAILY_CAP2,
  MAX_DECISION_NOTE_LENGTH: () => MAX_DECISION_NOTE_LENGTH2,
  MAX_DOCUMENT_PAGES: () => MAX_DOCUMENT_PAGES2,
  MAX_DRAFT_BODY_LENGTH: () => MAX_DRAFT_BODY_LENGTH2,
  MAX_DRAFT_CHECKS: () => MAX_DRAFT_CHECKS2,
  MAX_DRAFT_CITATIONS: () => MAX_DRAFT_CITATIONS2,
  MAX_DRAFT_GOAL_LENGTH: () => MAX_DRAFT_GOAL_LENGTH2,
  MAX_DRAFT_REVISION: () => MAX_DRAFT_REVISION2,
  MAX_DRAFT_SUBJECT_LENGTH: () => MAX_DRAFT_SUBJECT_LENGTH2,
  MAX_DROPPED_COUNT: () => MAX_DROPPED_COUNT2,
  MAX_ESCALATION_RULES: () => MAX_ESCALATION_RULES2,
  MAX_EVIDENCE_COUNT: () => MAX_EVIDENCE_COUNT2,
  MAX_EVIDENCE_REF_LENGTH: () => MAX_EVIDENCE_REF_LENGTH2,
  MAX_EXCEPT_LABELS: () => MAX_EXCEPT_LABELS2,
  MAX_EXPORT_PART_BYTES: () => MAX_EXPORT_PART_BYTES2,
  MAX_EXPORT_PART_FILES: () => MAX_EXPORT_PART_FILES2,
  MAX_EXPORT_PREFIX_LENGTH: () => MAX_EXPORT_PREFIX_LENGTH2,
  MAX_FIELD_HISTORY_ENTRIES: () => MAX_FIELD_HISTORY_ENTRIES2,
  MAX_FINDING_EXPLANATION_LENGTH: () => MAX_FINDING_EXPLANATION_LENGTH2,
  MAX_FINDING_SPAN_OFFSET: () => MAX_FINDING_SPAN_OFFSET2,
  MAX_FIT_CONDITION_BYTES: () => MAX_FIT_CONDITION_BYTES2,
  MAX_FIT_NAME_LENGTH: () => MAX_FIT_NAME_LENGTH2,
  MAX_FIT_VALUES: () => MAX_FIT_VALUES2,
  MAX_FIT_WEIGHT: () => MAX_FIT_WEIGHT2,
  MAX_FORM_TOKEN_LENGTH: () => MAX_FORM_TOKEN_LENGTH2,
  MAX_HANDOFF_ATTEMPTS: () => MAX_HANDOFF_ATTEMPTS2,
  MAX_HEALTH_COMPONENTS: () => MAX_HEALTH_COMPONENTS2,
  MAX_HEALTH_COUNT: () => MAX_HEALTH_COUNT2,
  MAX_LINE_LABEL_LENGTH: () => MAX_LINE_LABEL_LENGTH2,
  MAX_MAILBOX_NAME_LENGTH: () => MAX_MAILBOX_NAME_LENGTH2,
  MAX_MAILBOX_TEAMS: () => MAX_MAILBOX_TEAMS2,
  MAX_MAIL_PROVIDER_MESSAGE_ID_LENGTH: () => MAX_MAIL_PROVIDER_MESSAGE_ID_LENGTH2,
  MAX_MASKED_ADDRESS_LENGTH: () => MAX_MASKED_ADDRESS_LENGTH2,
  MAX_MERGED_PROSPECTS: () => MAX_MERGED_PROSPECTS2,
  MAX_MERGE_SNAPSHOT_BYTES: () => MAX_MERGE_SNAPSHOT_BYTES2,
  MAX_MESSAGE_BODY_LENGTH: () => MAX_MESSAGE_BODY_LENGTH2,
  MAX_MICRO_DOLLARS: () => MAX_MICRO_DOLLARS2,
  MAX_MIN_GAP_SECONDS: () => MAX_MIN_GAP_SECONDS2,
  MAX_MODEL_NAME_LENGTH: () => MAX_MODEL_NAME_LENGTH2,
  MAX_PENDING_DRAFT_COUNT: () => MAX_PENDING_DRAFT_COUNT2,
  MAX_PLAY_CITATIONS: () => MAX_PLAY_CITATIONS2,
  MAX_PLAY_EVIDENCE: () => MAX_PLAY_EVIDENCE2,
  MAX_PLAY_STEPS: () => MAX_PLAY_STEPS2,
  MAX_PREFERRED_WORDS: () => MAX_PREFERRED_WORDS2,
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
  MAX_PROVIDERS: () => MAX_PROVIDERS2,
  MAX_PROVIDER_EVENT_ID_LENGTH: () => MAX_PROVIDER_EVENT_ID_LENGTH2,
  MAX_PROVIDER_KEY_LENGTH: () => MAX_PROVIDER_KEY_LENGTH2,
  MAX_PROVIDER_MESSAGE_ID_LENGTH: () => MAX_PROVIDER_MESSAGE_ID_LENGTH2,
  MAX_PROVIDER_REFERENCE_LENGTH: () => MAX_PROVIDER_REFERENCE_LENGTH2,
  MAX_QUALIFICATION_QUESTIONS: () => MAX_QUALIFICATION_QUESTIONS2,
  MAX_QUALIFICATION_SUMMARY_LENGTH: () => MAX_QUALIFICATION_SUMMARY_LENGTH2,
  MAX_QUESTION_CHOICES: () => MAX_QUESTION_CHOICES2,
  MAX_QUESTION_PROMPT_LENGTH: () => MAX_QUESTION_PROMPT_LENGTH2,
  MAX_QUEUED_DEAL_IMPORTS: () => MAX_QUEUED_DEAL_IMPORTS2,
  MAX_RECORDING_KEY_LENGTH: () => MAX_RECORDING_KEY_LENGTH2,
  MAX_RESERVATION_HOLD_KEY_LENGTH: () => MAX_RESERVATION_HOLD_KEY_LENGTH2,
  MAX_ROLLUP_COUNT: () => MAX_ROLLUP_COUNT2,
  MAX_ROLLUP_GROUP_KEY_LENGTH: () => MAX_ROLLUP_GROUP_KEY_LENGTH2,
  MAX_RUN_FIELDS: () => MAX_RUN_FIELDS2,
  MAX_RUN_REQUEST_ID_LENGTH: () => MAX_RUN_REQUEST_ID_LENGTH2,
  MAX_SEARCH_STATE_IDS: () => MAX_SEARCH_STATE_IDS2,
  MAX_SENDS_PER_DAY: () => MAX_SENDS_PER_DAY2,
  MAX_SENDS_PER_HOUR: () => MAX_SENDS_PER_HOUR2,
  MAX_SEQUENCE_STEP: () => MAX_SEQUENCE_STEP2,
  MAX_SEQUENCE_STEPS: () => MAX_SEQUENCE_STEPS2,
  MAX_SIGNAL_DETAIL_BYTES: () => MAX_SIGNAL_DETAIL_BYTES2,
  MAX_SIGN_OFF_LENGTH: () => MAX_SIGN_OFF_LENGTH2,
  MAX_SKIP_CONDITIONS: () => MAX_SKIP_CONDITIONS2,
  MAX_SOURCE_DEALS: () => MAX_SOURCE_DEALS2,
  MAX_SOURCE_KEY_LENGTH: () => MAX_SOURCE_KEY_LENGTH2,
  MAX_SOURCE_REF_LENGTH: () => MAX_SOURCE_REF_LENGTH2,
  MAX_SOURCE_URL_LENGTH: () => MAX_SOURCE_URL_LENGTH2,
  MAX_STEP_HOURS: () => MAX_STEP_HOURS2,
  MAX_STEP_KEY_LENGTH: () => MAX_STEP_KEY_LENGTH2,
  MAX_STRATEGY_LENGTH: () => MAX_STRATEGY_LENGTH2,
  MAX_SUBMISSION_IP_LENGTH: () => MAX_SUBMISSION_IP_LENGTH2,
  MAX_SUBMISSION_USER_AGENT_LENGTH: () => MAX_SUBMISSION_USER_AGENT_LENGTH2,
  MAX_SUGGESTION_MOMENTS: () => MAX_SUGGESTION_MOMENTS2,
  MAX_SUGGESTION_TEXT_LENGTH: () => MAX_SUGGESTION_TEXT_LENGTH2,
  MAX_SUMMARY_LENGTH: () => MAX_SUMMARY_LENGTH2,
  MAX_SUPPRESSION_NOTE_LENGTH: () => MAX_SUPPRESSION_NOTE_LENGTH2,
  MAX_SUPPRESSION_SOURCE_REF_LENGTH: () => MAX_SUPPRESSION_SOURCE_REF_LENGTH2,
  MAX_TASK_INSTRUCTION_LENGTH: () => MAX_TASK_INSTRUCTION_LENGTH2,
  MAX_TOKEN_CIPHERTEXT_BYTES: () => MAX_TOKEN_CIPHERTEXT_BYTES2,
  MAX_TONE_LENGTH: () => MAX_TONE_LENGTH2,
  MAX_TOUCH_SOURCES: () => MAX_TOUCH_SOURCES2,
  MAX_TURN_SOURCES: () => MAX_TURN_SOURCES2,
  MAX_TURN_TEXT_LENGTH: () => MAX_TURN_TEXT_LENGTH2,
  MAX_TWILIO_FINGERPRINT_LENGTH: () => MAX_TWILIO_FINGERPRINT_LENGTH2,
  MAX_TWILIO_PLACEMENT_KEY_LENGTH: () => MAX_TWILIO_PLACEMENT_KEY_LENGTH2,
  MAX_TWILIO_PROVIDER_ID_LENGTH: () => MAX_TWILIO_PROVIDER_ID_LENGTH2,
  MAX_TWILIO_RING_IDENTITIES: () => MAX_TWILIO_RING_IDENTITIES2,
  MAX_VARIANT_ANGLE_LENGTH: () => MAX_VARIANT_ANGLE_LENGTH2,
  MAX_VARIANT_LABEL_LENGTH: () => MAX_VARIANT_LABEL_LENGTH2,
  MAX_VARIANT_WEIGHT: () => MAX_VARIANT_WEIGHT2,
  MAX_VOICE_IDEMPOTENCY_KEY_LENGTH: () => MAX_VOICE_IDEMPOTENCY_KEY_LENGTH2,
  MAX_VOICE_LENGTH_CHARACTERS: () => MAX_VOICE_LENGTH_CHARACTERS2,
  MAX_VOICE_TERM_LENGTH: () => MAX_VOICE_TERM_LENGTH2,
  MAX_VOICE_VERSION: () => MAX_VOICE_VERSION2,
  MAX_WON_DEAL_COUNT: () => MAX_WON_DEAL_COUNT2,
  MAX_WRAP_UP_NOTE_LENGTH: () => MAX_WRAP_UP_NOTE_LENGTH2,
  MEMBERSHIP_ROLES: () => MEMBERSHIP_ROLES2,
  MEMBER_NAME_MAX: () => MEMBER_NAME_MAX2,
  MESSAGE_AUTHOR_KINDS: () => MESSAGE_AUTHOR_KINDS2,
  MESSAGE_DIRECTIONS: () => MESSAGE_DIRECTIONS2,
  MIN_AGENT_IDEMPOTENCY_KEY_LENGTH: () => MIN_AGENT_IDEMPOTENCY_KEY_LENGTH2,
  MIN_FORM_TOKEN_LENGTH: () => MIN_FORM_TOKEN_LENGTH2,
  MIN_QUESTION_CHOICES: () => MIN_QUESTION_CHOICES2,
  MIN_VOICE_LENGTH_CHARACTERS: () => MIN_VOICE_LENGTH_CHARACTERS2,
  OAUTH_PROVIDERS: () => OAUTH_PROVIDERS2,
  ORGANIZATION_AGENT_KIND: () => ORGANIZATION_AGENT_KIND2,
  ORGANIZATION_REGIONS: () => ORGANIZATION_REGIONS2,
  ORGANIZATION_STATUSES: () => ORGANIZATION_STATUSES2,
  ORPHAN_SWEEP_CURSOR_MAX_BYTES: () => ORPHAN_SWEEP_CURSOR_MAX_BYTES2,
  ORPHAN_SWEEP_MAX_CLAIM_MS: () => ORPHAN_SWEEP_MAX_CLAIM_MS2,
  ORPHAN_SWEEP_MIN_CLAIM_MS: () => ORPHAN_SWEEP_MIN_CLAIM_MS2,
  OUTBOUND_LANGUAGES: () => OUTBOUND_LANGUAGES2,
  OUTBOUND_WORK_KINDS: () => OUTBOUND_WORK_KINDS2,
  OUTBOX_DEDUPE_KEY_MAX_LENGTH: () => OUTBOX_DEDUPE_KEY_MAX_LENGTH2,
  OUTBOX_ERROR_CODE_MAX_LENGTH: () => OUTBOX_ERROR_CODE_MAX_LENGTH2,
  OUTBOX_MAX_ATTEMPTS: () => OUTBOX_MAX_ATTEMPTS2,
  OUTBOX_MAX_BATCH: () => OUTBOX_MAX_BATCH2,
  OUTBOX_MAX_LEASE_MS: () => OUTBOX_MAX_LEASE_MS2,
  OUTBOX_MAX_RETRY_DELAY_MS: () => OUTBOX_MAX_RETRY_DELAY_MS2,
  OUTBOX_MIN_LEASE_MS: () => OUTBOX_MIN_LEASE_MS2,
  OUTBOX_PAYLOAD_MAX_BYTES: () => OUTBOX_PAYLOAD_MAX_BYTES2,
  OUTBOX_TOPIC_MAX_LENGTH: () => OUTBOX_TOPIC_MAX_LENGTH2,
  PASSKEY_CHALLENGE_PURPOSES: () => PASSKEY_CHALLENGE_PURPOSES2,
  PENDING_CLEANUP_PREDICATE: () => PENDING_CLEANUP_PREDICATE2,
  PLAY_CITATION_KINDS: () => PLAY_CITATION_KINDS2,
  PLAY_INTENTS: () => PLAY_INTENTS2,
  PLAY_SOURCES: () => PLAY_SOURCES2,
  PLAY_STATUSES: () => PLAY_STATUSES2,
  PROMOTION_SOURCES: () => PROMOTION_SOURCES2,
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
  QUALIFICATION_QUESTION_KINDS: () => QUALIFICATION_QUESTION_KINDS2,
  REPLY_LABELS: () => REPLY_LABELS2,
  RIGHTS_MAX_WORDING_VERSION: () => RIGHTS_MAX_WORDING_VERSION2,
  ROLLUP_GROUP_KINDS: () => ROLLUP_GROUP_KINDS2,
  ROLLUP_METRICS: () => ROLLUP_METRICS2,
  RUN_STATUSES: () => RUN_STATUSES2,
  SEND_CHECKS: () => SEND_CHECKS2,
  SEND_DEFERRING_REASONS: () => SEND_DEFERRING_REASONS2,
  SEND_REFUSAL_REASONS: () => SEND_REFUSAL_REASONS2,
  SEND_STATES: () => SEND_STATES2,
  SESSION_CLIENTS: () => SESSION_CLIENTS2,
  SESSION_REVOKE_REASONS: () => SESSION_REVOKE_REASONS2,
  SESSION_TYPES: () => SESSION_TYPES2,
  SIGNAL_KINDS: () => SIGNAL_KINDS2,
  SIGNAL_SOURCE_TYPES: () => SIGNAL_SOURCE_TYPES2,
  SIGNING_KEY_STATUSES: () => SIGNING_KEY_STATUSES2,
  SKIPPED_ATTEMPT_OUTCOMES: () => SKIPPED_ATTEMPT_OUTCOMES2,
  SMS_COUNT_RETENTION_FLOOR_DAYS: () => SMS_COUNT_RETENTION_FLOOR_DAYS2,
  SOURCE_KINDS: () => SOURCE_KINDS2,
  SOURCE_KIND_PATTERN: () => SOURCE_KIND_PATTERN2,
  SOURCE_OUTCOMES: () => SOURCE_OUTCOMES2,
  SOURCE_PERFORMANCE_FLAGS: () => SOURCE_PERFORMANCE_FLAGS2,
  STEP_KINDS: () => STEP_KINDS2,
  STEP_TASKS: () => STEP_TASKS2,
  STOP_REASONS: () => STOP_REASONS2,
  SUGGESTION_FINGERPRINT_BYTES: () => SUGGESTION_FINGERPRINT_BYTES2,
  SUGGESTION_KINDS: () => SUGGESTION_KINDS2,
  SUGGESTION_STATUSES: () => SUGGESTION_STATUSES2,
  SUPPRESSION_ADDRESS_KINDS: () => SUPPRESSION_ADDRESS_KINDS2,
  SUPPRESSION_REASONS: () => SUPPRESSION_REASONS2,
  SUPPRESSION_REMOVABLE_REASONS: () => SUPPRESSION_REMOVABLE_REASONS2,
  TOUCH_AGENT_KINDS: () => TOUCH_AGENT_KINDS2,
  TOUCH_CHANNELS: () => TOUCH_CHANNELS2,
  TOUCH_KINDS: () => TOUCH_KINDS2,
  TWILIO_DIRECTORY_KINDS: () => TWILIO_DIRECTORY_KINDS2,
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
  WEEKDAYS: () => WEEKDAYS2,
  WINDOW_ZONES: () => WINDOW_ZONES2,
  WORK_KINDS: () => WORK_KINDS2,
  abandonCases: () => abandonCases2,
  agentInstructionPointers: () => agentInstructionPointers2,
  agentInstructionVersions: () => agentInstructionVersions2,
  agentSettings: () => agentSettings2,
  analyticsEvents: () => analyticsEvents2,
  apiKeyUsage: () => apiKeyUsage2,
  apiKeys: () => apiKeys2,
  approvalDecisions: () => approvalDecisions2,
  approvalPolicies: () => approvalPolicies2,
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
  conversations: () => conversations2,
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
  draftSources: () => draftSources2,
  drafts: () => drafts2,
  enrichmentAttempts: () => enrichmentAttempts2,
  enrichmentReservations: () => enrichmentReservations2,
  enrichmentRuns: () => enrichmentRuns2,
  enrichmentSpend: () => enrichmentSpend2,
  environmentSettings: () => environmentSettings2,
  environments: () => environments2,
  escalationRules: () => escalationRules2,
  events: () => events2,
  exportJobs: () => exportJobs2,
  exportParts: () => exportParts2,
  fitCriteria: () => fitCriteria2,
  flowAttempts: () => flowAttempts2,
  healthDaily: () => healthDaily2,
  hookCallCounts: () => hookCallCounts2,
  hooks: () => hooks2,
  idempotencyKeys: () => idempotencyKeys2,
  identities: () => identities2,
  indexSettings: () => indexSettings2,
  ingestionJobs: () => ingestionJobs2,
  instanceAuditLogs: () => instanceAuditLogs2,
  invitationDirectory: () => invitationDirectory2,
  invitations: () => invitations2,
  mailEvents: () => mailEvents2,
  mailMessages: () => mailMessages2,
  mailboxLimits: () => mailboxLimits2,
  mailboxes: () => mailboxes2,
  membershipDirectory: () => membershipDirectory2,
  memberships: () => memberships2,
  messages: () => messages2,
  nativeApps: () => nativeApps2,
  oauthProviders: () => oauthProviders2,
  organizationState: () => organizationState2,
  organizationUsage: () => organizationUsage2,
  organizations: () => organizations2,
  outboundBrandVoices: () => outboundBrandVoices2,
  outboundBriefStatements: () => outboundBriefStatements2,
  outboundBriefs: () => outboundBriefs2,
  outboundCampaigns: () => outboundCampaigns2,
  outboundDraftChecks: () => outboundDraftChecks2,
  outboundDraftCitations: () => outboundDraftCitations2,
  outboundDrafts: () => outboundDrafts2,
  outboundEnrollmentEvents: () => outboundEnrollmentEvents2,
  outboundEnrollments: () => outboundEnrollments2,
  outboundModelUsage: () => outboundModelUsage2,
  outboundPlayCitations: () => outboundPlayCitations2,
  outboundPlays: () => outboundPlays2,
  outboundSchema: () => outboundSchema2,
  outboundSendDecisions: () => outboundSendDecisions2,
  outboundSequences: () => outboundSequences2,
  outboundSteps: () => outboundSteps2,
  outboundVariants: () => outboundVariants2,
  outboundWorkHints: () => outboundWorkHints2,
  outbox: () => outbox2,
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
  providerSettings: () => providerSettings2,
  refreshTokens: () => refreshTokens2,
  repChangeAllowed: () => repChangeAllowed2,
  rightsConfirmations: () => rightsConfirmations2,
  rollupDaily: () => rollupDaily2,
  sessions: () => sessions2,
  signals: () => signals2,
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
  voiceAgentSettings: () => voiceAgentSettings2,
  voiceAgentTurnSources: () => voiceAgentTurnSources2,
  voiceAgentTurns: () => voiceAgentTurns2,
  voiceCallEvents: () => voiceCallEvents2,
  voiceCalls: () => voiceCalls2,
  voiceChats: () => voiceChats2,
  voiceHandoffs: () => voiceHandoffs2,
  voiceIdempotencyKeys: () => voiceIdempotencyKeys2,
  voiceInquiries: () => voiceInquiries2,
  voiceLineDirectory: () => voiceLineDirectory2,
  voiceLines: () => voiceLines2,
  voiceQualificationAnswers: () => voiceQualificationAnswers2,
  voiceQualificationQuestions: () => voiceQualificationQuestions2,
  voiceRecordings: () => voiceRecordings2,
  voiceSchema: () => voiceSchema2,
  voiceTwilioCalls: () => voiceTwilioCalls2,
  voiceTwilioDirectory: () => voiceTwilioDirectory2,
  voiceTwilioPlacements: () => voiceTwilioPlacements2,
  voiceTwilioRecordings: () => voiceTwilioRecordings2,
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
var analyticsEvents2 = coreSchema2.table("analytics_event", {
  organizationId: orgRef(),
  metric: text33("metric", { enum: ROLLUP_METRICS2 }).notNull(),
  dedupeKey: text33("dedupe_key").notNull(),
  day: date2("day", { mode: "string" }).notNull(),
  channel: text33("channel"),
  recordedAt: ts("recorded_at").notNull().defaultNow()
}, (t) => [
  primaryKey4({
    name: "analytics_event_pkey",
    columns: [t.organizationId, t.metric, t.dedupeKey]
  }),
  check13("analytics_event_organization_id_shape", orgShape),
  check13("analytics_event_organization_not_global", notGlobal),
  check13("analytics_event_metric_known", sql18`${t.metric} in (${list2(ROLLUP_METRICS2)})`),
  check13("analytics_event_dedupe_key_shape", sql18`char_length(${t.dedupeKey}) between 1 and ${num(MAX_ROLLUP_GROUP_KEY_LENGTH2)}`),
  check13("analytics_event_channel_known", sql18`${t.channel} is null or ${t.channel} in (${list2(TOUCH_CHANNELS2)})`),
  index24("analytics_event_day_idx").on(t.organizationId, t.day, t.metric)
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
  check13("assessments_subject_columns", sql18`(${t.subjectKind} = 'draft' and ${t.draftId} is not null and ${t.draftId} ~ '^drf_[0-9a-f]{32}$'
          and ${t.draftVersion} is not null and ${t.draftVersion} between 1 and ${num(MAX_ASSESSED_NUMBER2)}
          and ${t.callId} is null and ${t.turnIndex} is null)
        or (${t.subjectKind} = 'call_turn' and ${t.callId} is not null and ${t.callId} ~ '^call_[0-9a-f]{32}$'
          and ${t.turnIndex} is not null and ${t.turnIndex} between 0 and ${num(MAX_ASSESSED_NUMBER2)}
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
  index27("audit_events_prospect_idx").on(t.organizationId, t.prospectId, t.sequence.desc()).where(sql21`${t.prospectId} is not null`),
  index27("audit_events_actor_member_idx").on(t.organizationId, t.actorMembershipId, t.sequence.desc()).where(sql21`${t.actorMembershipId} is not null`),
  index27("audit_events_actor_api_key_idx").on(t.organizationId, t.actorApiKeyId, t.sequence.desc()).where(sql21`${t.actorApiKeyId} is not null`),
  index27("audit_events_actor_agent_idx").on(t.organizationId, t.actorAgentKind, t.sequence.desc()).where(sql21`${t.actorAgentKind} is not null`)
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
  index28("crm_sync_runs_retry_of_idx").on(t.organizationId, t.retryOfRunId),
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
// src/schema/core-inbox.ts
import { sql as sql25 } from "drizzle-orm";
import {
  boolean as boolean11,
  check as check20,
  doublePrecision,
  foreignKey as foreignKey10,
  index as index31,
  integer as integer19,
  jsonb as jsonb15,
  primaryKey as primaryKey10,
  text as text39,
  timestamp as timestamp33,
  unique as unique24,
  uniqueIndex as uniqueIndex8
} from "drizzle-orm/pg-core";
var INBOX_CHANNELS2 = ["email", "linkedin", "chat"];
var CONVERSATION_CONTROLLERS2 = ["agent", "rep"];
var CONVERSATION_STATES2 = [
  "agent",
  "awaiting_approval",
  "rep",
  "escalated",
  "closed"
];
var MESSAGE_DIRECTIONS2 = ["inbound", "outbound"];
var MESSAGE_AUTHOR_KINDS2 = ["prospect", "agent", "rep"];
var REPLY_LABELS2 = [
  "positive",
  "question",
  "objection",
  "not_now",
  "wrong_person",
  "unsubscribe",
  "out_of_office",
  "bounce",
  "negative",
  "other"
];
var CLASSIFICATION_DECIDERS2 = ["model", "rep"];
var MAX_MESSAGE_BODY_LENGTH2 = 20000;
var MAX_PROVIDER_MESSAGE_ID_LENGTH2 = 255;
var MAX_PENDING_DRAFT_COUNT2 = 1000;
var DRAFT_AUTHORS2 = ["agent", "rep"];
var DRAFT_STATUSES2 = [
  "pending",
  "approved",
  "rejected",
  "sent",
  "superseded",
  "void"
];
var DRAFT_HOLD_REASONS2 = [
  "policy",
  "ungrounded",
  "check_failed",
  "escalated",
  "first_message"
];
var MAX_STRATEGY_LENGTH2 = 300;
var MAX_DRAFT_CHECKS2 = 20;
var DRAFT_SOURCE_KINDS2 = ["moment", "document_chunk"];
var SOURCE_OUTCOMES2 = ["won", "lost", "open"];
var MAX_EVIDENCE_COUNT2 = 1e5;
var DECISION_KINDS2 = [
  "approve",
  "edit_approve",
  "reject",
  "auto_release",
  "takeover",
  "hand_back"
];
var MAX_DECISION_NOTE_LENGTH2 = 500;
var APPROVAL_MODES2 = ["always", "below_confidence", "except"];
var MAX_EXCEPT_LABELS2 = 10;
var ESCALATION_TRIGGERS2 = [
  "asks_for_person",
  "pricing_or_legal",
  "negative_tone",
  "low_confidence",
  "writer_failure"
];
var ESCALATION_TARGETS2 = ["prospect_owner", "team_round_robin", "admin_queue"];
var list8 = (values) => sql25.raw(values.map((v) => `'${v}'`).join(", "));
var idShape7 = (column, prefix) => sql25.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape6 = sql25.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal6 = sql25.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts6 = (name) => timestamp33(name, { withTimezone: true });
var orgRef2 = () => text39("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" });
var body = (column) => sql25.raw(`char_length("${column}") between 1 and ${MAX_MESSAGE_BODY_LENGTH2} and btrim("${column}") <> ''`);
var conversations2 = coreSchema2.table("conversations", {
  id: text39("id").notNull(),
  organizationId: orgRef2(),
  prospectId: text39("prospect_id").notNull(),
  channel: text39("channel", { enum: INBOX_CHANNELS2 }).notNull(),
  controller: text39("controller", { enum: CONVERSATION_CONTROLLERS2 }).notNull().default("agent"),
  controllerMembershipId: text39("controller_membership_id"),
  state: text39("state", { enum: CONVERSATION_STATES2 }).notNull().default("agent"),
  ownerMembershipId: text39("owner_membership_id"),
  latestLabel: text39("latest_label", { enum: REPLY_LABELS2 }),
  pendingDraftCount: integer19("pending_draft_count").notNull().default(0),
  lastMessageAt: ts6("last_message_at").notNull(),
  createdAt: ts6("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey10({ name: "conversations_pkey", columns: [t.organizationId, t.id] }),
  unique24("conversations_organization_id_channel_key").on(t.organizationId, t.id, t.channel),
  check20("conversations_id_shape", idShape7("id", "cnv")),
  check20("conversations_organization_id_shape", orgShape6),
  check20("conversations_organization_not_global", notGlobal6),
  check20("conversations_prospect_id_shape", idShape7("prospect_id", "prs")),
  check20("conversations_controller_membership_id_shape", idShape7("controller_membership_id", "mem")),
  check20("conversations_owner_membership_id_shape", idShape7("owner_membership_id", "mem")),
  check20("conversations_channel_known", sql25`${t.channel} in (${list8(INBOX_CHANNELS2)})`),
  check20("conversations_controller_known", sql25`${t.controller} in (${list8(CONVERSATION_CONTROLLERS2)})`),
  check20("conversations_state_known", sql25`${t.state} in (${list8(CONVERSATION_STATES2)})`),
  check20("conversations_latest_label_known", sql25`${t.latestLabel} is null or ${t.latestLabel} in (${list8(REPLY_LABELS2)})`),
  check20("conversations_pending_draft_count_bounds", sql25`${t.pendingDraftCount} between 0 and ${sql25.raw(String(MAX_PENDING_DRAFT_COUNT2))}`),
  check20("conversations_controller_names_rep", sql25`(${t.controller} = 'rep') = (${t.controllerMembershipId} is not null)`),
  check20("conversations_rep_state_has_rep", sql25`${t.state} <> 'rep' or ${t.controller} = 'rep'`),
  check20("conversations_rep_controls_rep_or_closed", sql25`${t.controller} <> 'rep' or ${t.state} in ('rep', 'closed')`),
  foreignKey10({
    name: "conversations_prospect_fk",
    columns: [t.organizationId, t.prospectId],
    foreignColumns: [prospects2.organizationId, prospects2.id]
  }).onDelete("cascade"),
  index31("conversations_list_idx").on(t.organizationId, t.lastMessageAt.desc(), t.id.desc()),
  index31("conversations_owner_list_idx").on(t.organizationId, t.ownerMembershipId, t.lastMessageAt.desc(), t.id.desc()).where(sql25`${t.ownerMembershipId} is not null`),
  index31("conversations_state_list_idx").on(t.organizationId, t.state, t.lastMessageAt.desc(), t.id.desc()),
  index31("conversations_owner_state_list_idx").on(t.organizationId, t.ownerMembershipId, t.state, t.lastMessageAt.desc(), t.id.desc()).where(sql25`${t.ownerMembershipId} is not null`),
  index31("conversations_prospect_idx").on(t.organizationId, t.prospectId, t.channel)
]);
var messages2 = coreSchema2.table("messages", {
  id: text39("id").notNull(),
  organizationId: orgRef2(),
  conversationId: text39("conversation_id").notNull(),
  channel: text39("channel", { enum: INBOX_CHANNELS2 }).notNull(),
  direction: text39("direction", { enum: MESSAGE_DIRECTIONS2 }).notNull(),
  authorKind: text39("author_kind", { enum: MESSAGE_AUTHOR_KINDS2 }).notNull(),
  authorMembershipId: text39("author_membership_id"),
  providerMessageId: text39("provider_message_id").notNull(),
  draftId: text39("draft_id"),
  body: text39("body").notNull(),
  sentAt: ts6("sent_at").notNull(),
  classificationLabel: text39("classification_label", { enum: REPLY_LABELS2 }),
  classificationConfidence: doublePrecision("classification_confidence"),
  classificationDecidedBy: text39("classification_decided_by", { enum: CLASSIFICATION_DECIDERS2 }),
  classificationCorrectedByMembershipId: text39("classification_corrected_by_membership_id"),
  classifiedAt: ts6("classified_at"),
  createdAt: ts6("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey10({ name: "messages_pkey", columns: [t.organizationId, t.id] }),
  check20("messages_id_shape", idShape7("id", "msg")),
  check20("messages_organization_id_shape", orgShape6),
  check20("messages_organization_not_global", notGlobal6),
  check20("messages_conversation_id_shape", idShape7("conversation_id", "cnv")),
  check20("messages_author_membership_id_shape", idShape7("author_membership_id", "mem")),
  check20("messages_draft_id_shape", idShape7("draft_id", "drf")),
  check20("messages_classification_corrected_by_shape", idShape7("classification_corrected_by_membership_id", "mem")),
  check20("messages_channel_known", sql25`${t.channel} in (${list8(INBOX_CHANNELS2)})`),
  check20("messages_direction_known", sql25`${t.direction} in (${list8(MESSAGE_DIRECTIONS2)})`),
  check20("messages_author_kind_known", sql25`${t.authorKind} in (${list8(MESSAGE_AUTHOR_KINDS2)})`),
  check20("messages_provider_message_id_shape", sql25`${t.providerMessageId} collate "C" ~ '^[\\x21-\\x7e]{1,${sql25.raw(String(MAX_PROVIDER_MESSAGE_ID_LENGTH2))}}$'`),
  check20("messages_body_shape", body("body")),
  check20("messages_inbound_is_prospect", sql25`(${t.direction} = 'inbound') = (${t.authorKind} = 'prospect')`),
  check20("messages_rep_names_member", sql25`(${t.authorKind} = 'rep') = (${t.authorMembershipId} is not null)`),
  check20("messages_inbound_has_no_draft", sql25`${t.direction} <> 'inbound' or ${t.draftId} is null`),
  check20("messages_rep_has_draft", sql25`${t.authorKind} <> 'rep' or ${t.draftId} is not null`),
  check20("messages_classification_inbound_only", sql25`${t.direction} = 'inbound' or ${t.classificationLabel} is null`),
  check20("messages_classification_complete", sql25`(${t.classificationLabel} is null) = (${t.classificationConfidence} is null)
        and (${t.classificationLabel} is null) = (${t.classificationDecidedBy} is null)
        and (${t.classificationLabel} is null) = (${t.classifiedAt} is null)`),
  check20("messages_classification_confidence_bounds", sql25`${t.classificationConfidence} is null or ${t.classificationConfidence} between 0 and 1`),
  check20("messages_classification_decider_known", sql25`${t.classificationDecidedBy} is null or ${t.classificationDecidedBy} in (${list8(CLASSIFICATION_DECIDERS2)})`),
  check20("messages_classification_correction_names_rep", sql25`${t.classificationLabel} is null
        or (${t.classificationDecidedBy} = 'rep') = (${t.classificationCorrectedByMembershipId} is not null)`),
  check20("messages_correction_needs_label", sql25`${t.classificationCorrectedByMembershipId} is null or ${t.classificationLabel} is not null`),
  check20("messages_classification_label_known", sql25`${t.classificationLabel} is null or ${t.classificationLabel} in (${list8(REPLY_LABELS2)})`),
  foreignKey10({
    name: "messages_conversation_fk",
    columns: [t.organizationId, t.conversationId, t.channel],
    foreignColumns: [conversations2.organizationId, conversations2.id, conversations2.channel]
  }).onDelete("cascade"),
  uniqueIndex8("messages_provider_message_key").on(t.organizationId, t.channel, t.providerMessageId),
  index31("messages_conversation_idx").on(t.organizationId, t.conversationId, t.sentAt, t.id),
  index31("messages_draft_idx").on(t.organizationId, t.draftId).where(sql25`${t.draftId} is not null`)
]);
var drafts2 = coreSchema2.table("drafts", {
  id: text39("id").notNull(),
  organizationId: orgRef2(),
  conversationId: text39("conversation_id").notNull(),
  author: text39("author", { enum: DRAFT_AUTHORS2 }).notNull(),
  authorMembershipId: text39("author_membership_id"),
  body: text39("body").notNull(),
  reasonTriggerMessageId: text39("reason_trigger_message_id"),
  reasonLabel: text39("reason_label", { enum: REPLY_LABELS2 }),
  reasonStrategy: text39("reason_strategy"),
  confidence: doublePrecision("confidence"),
  ungrounded: boolean11("ungrounded").notNull().default(false),
  checks: jsonb15("checks").notNull().default(sql25`'[]'::jsonb`),
  hold: text39("hold", { enum: DRAFT_HOLD_REASONS2 }),
  status: text39("status", { enum: DRAFT_STATUSES2 }).notNull().default("pending"),
  createdAt: ts6("created_at").notNull().defaultNow(),
  decidedAt: ts6("decided_at")
}, (t) => [
  primaryKey10({ name: "drafts_pkey", columns: [t.organizationId, t.id] }),
  check20("drafts_id_shape", idShape7("id", "drf")),
  check20("drafts_organization_id_shape", orgShape6),
  check20("drafts_organization_not_global", notGlobal6),
  check20("drafts_conversation_id_shape", idShape7("conversation_id", "cnv")),
  check20("drafts_author_membership_id_shape", idShape7("author_membership_id", "mem")),
  check20("drafts_reason_trigger_message_id_shape", idShape7("reason_trigger_message_id", "msg")),
  check20("drafts_author_known", sql25`${t.author} in (${list8(DRAFT_AUTHORS2)})`),
  check20("drafts_status_known", sql25`${t.status} in (${list8(DRAFT_STATUSES2)})`),
  check20("drafts_hold_known", sql25`${t.hold} is null or ${t.hold} in (${list8(DRAFT_HOLD_REASONS2)})`),
  check20("drafts_reason_label_known", sql25`${t.reasonLabel} is null or ${t.reasonLabel} in (${list8(REPLY_LABELS2)})`),
  check20("drafts_body_shape", body("body")),
  check20("drafts_reason_strategy_shape", sql25`${t.reasonStrategy} is null or char_length(${t.reasonStrategy}) between 1 and ${sql25.raw(String(MAX_STRATEGY_LENGTH2))}`),
  check20("drafts_confidence_bounds", sql25`${t.confidence} is null or ${t.confidence} between 0 and 1`),
  check20("drafts_checks_shape", sql25`jsonb_typeof(${t.checks}) = 'array' and jsonb_array_length(${t.checks}) <= ${sql25.raw(String(MAX_DRAFT_CHECKS2))}`),
  check20("drafts_agent_has_reason", sql25`(${t.author} = 'agent') = (${t.reasonTriggerMessageId} is not null)
        and (${t.author} = 'agent') = (${t.reasonLabel} is not null)
        and (${t.author} = 'agent') = (${t.reasonStrategy} is not null)`),
  check20("drafts_agent_has_confidence", sql25`(${t.author} = 'agent') = (${t.confidence} is not null)`),
  check20("drafts_rep_names_member", sql25`(${t.author} = 'rep') = (${t.authorMembershipId} is not null)`),
  check20("drafts_rep_is_plain", sql25`${t.author} = 'agent' or (not ${t.ungrounded} and ${t.hold} is null)`),
  check20("drafts_ungrounded_is_held", sql25`not ${t.ungrounded} or ${t.hold} = 'ungrounded'`),
  check20("drafts_ungrounded_hold_matches", sql25`${t.hold} is distinct from 'ungrounded' or ${t.ungrounded}`),
  check20("drafts_pending_is_held", sql25`${t.status} <> 'pending' or ${t.author} = 'rep' or ${t.hold} is not null`),
  check20("drafts_pending_is_undecided", sql25`${t.status} <> 'pending' or ${t.decidedAt} is null`),
  foreignKey10({
    name: "drafts_conversation_fk",
    columns: [t.organizationId, t.conversationId],
    foreignColumns: [conversations2.organizationId, conversations2.id]
  }).onDelete("cascade"),
  foreignKey10({
    name: "drafts_trigger_message_fk",
    columns: [t.organizationId, t.reasonTriggerMessageId],
    foreignColumns: [messages2.organizationId, messages2.id]
  }),
  index31("drafts_conversation_idx").on(t.organizationId, t.conversationId, t.createdAt.desc(), t.id.desc()),
  index31("drafts_trigger_message_idx").on(t.organizationId, t.reasonTriggerMessageId).where(sql25`${t.reasonTriggerMessageId} is not null`),
  index31("drafts_pending_queue_idx").on(t.organizationId, t.createdAt, t.id).where(sql25`${t.status} = 'pending'`)
]);
var draftSources2 = coreSchema2.table("draft_sources", {
  organizationId: orgRef2(),
  draftId: text39("draft_id").notNull(),
  kind: text39("kind", { enum: DRAFT_SOURCE_KINDS2 }).notNull(),
  sourceRef: text39("source_ref").notNull(),
  position: integer19("position").notNull(),
  dealRecordId: text39("deal_record_id"),
  documentId: text39("document_id"),
  outcome: text39("outcome", { enum: SOURCE_OUTCOMES2 }),
  evidenceCount: integer19("evidence_count").notNull()
}, (t) => [
  primaryKey10({
    name: "draft_sources_pkey",
    columns: [t.organizationId, t.draftId, t.kind, t.sourceRef]
  }),
  check20("draft_sources_organization_id_shape", orgShape6),
  check20("draft_sources_organization_not_global", notGlobal6),
  check20("draft_sources_draft_id_shape", idShape7("draft_id", "drf")),
  check20("draft_sources_deal_record_id_shape", idShape7("deal_record_id", "deal")),
  check20("draft_sources_document_id_shape", idShape7("document_id", "doc")),
  check20("draft_sources_kind_known", sql25`${t.kind} in (${list8(DRAFT_SOURCE_KINDS2)})`),
  check20("draft_sources_source_ref_shape", sql25`${t.sourceRef} collate "C" ~ '^[A-Za-z0-9_.:-]{1,128}$'`),
  check20("draft_sources_position_bounds", sql25`${t.position} between 0 and 9`),
  check20("draft_sources_outcome_known", sql25`${t.outcome} is null or ${t.outcome} in (${list8(SOURCE_OUTCOMES2)})`),
  check20("draft_sources_evidence_count_bounds", sql25`${t.evidenceCount} between 1 and ${sql25.raw(String(MAX_EVIDENCE_COUNT2))}`),
  check20("draft_sources_kind_matches_ids", sql25`(${t.kind} = 'moment' and ${t.dealRecordId} is not null and ${t.documentId} is null and ${t.outcome} is not null)
        or (${t.kind} = 'document_chunk' and ${t.documentId} is not null and ${t.dealRecordId} is null and ${t.outcome} is null)`),
  foreignKey10({
    name: "draft_sources_draft_fk",
    columns: [t.organizationId, t.draftId],
    foreignColumns: [drafts2.organizationId, drafts2.id]
  }).onDelete("cascade"),
  unique24("draft_sources_position_key").on(t.organizationId, t.draftId, t.position)
]);
var approvalDecisions2 = coreSchema2.table("approval_decisions", {
  id: text39("id").notNull(),
  organizationId: orgRef2(),
  conversationId: text39("conversation_id").notNull(),
  draftId: text39("draft_id"),
  kind: text39("kind", { enum: DECISION_KINDS2 }).notNull(),
  decidedByMembershipId: text39("decided_by_membership_id"),
  note: text39("note"),
  editedBodySha256: text39("edited_body_sha256"),
  acknowledgedUngrounded: boolean11("acknowledged_ungrounded").notNull().default(false),
  decidedAt: ts6("decided_at").notNull().defaultNow()
}, (t) => [
  primaryKey10({ name: "approval_decisions_pkey", columns: [t.organizationId, t.id] }),
  check20("approval_decisions_id_shape", idShape7("id", "dcs")),
  check20("approval_decisions_organization_id_shape", orgShape6),
  check20("approval_decisions_organization_not_global", notGlobal6),
  check20("approval_decisions_conversation_id_shape", idShape7("conversation_id", "cnv")),
  check20("approval_decisions_draft_id_shape", idShape7("draft_id", "drf")),
  check20("approval_decisions_decided_by_membership_id_shape", idShape7("decided_by_membership_id", "mem")),
  check20("approval_decisions_kind_known", sql25`${t.kind} in (${list8(DECISION_KINDS2)})`),
  check20("approval_decisions_note_shape", sql25`${t.note} is null or (char_length(${t.note}) between 1 and ${sql25.raw(String(MAX_DECISION_NOTE_LENGTH2))} and btrim(${t.note}) <> '')`),
  check20("approval_decisions_draft_matches_kind", sql25`(${t.kind} in ('takeover', 'hand_back')) = (${t.draftId} is null)`),
  check20("approval_decisions_member_matches_kind", sql25`(${t.kind} = 'auto_release') = (${t.decidedByMembershipId} is null)`),
  check20("approval_decisions_acknowledgement_is_approval", sql25`not ${t.acknowledgedUngrounded} or ${t.kind} in ('approve', 'edit_approve')`),
  check20("approval_decisions_note_is_rejection", sql25`${t.note} is null or ${t.kind} = 'reject'`),
  check20("approval_decisions_edited_body_sha256_shape", sql25`${t.editedBodySha256} is null or ${t.editedBodySha256} ~ '^[0-9a-f]{64}$'`),
  check20("approval_decisions_edited_hash_matches_kind", sql25`(${t.kind} = 'edit_approve') = (${t.editedBodySha256} is not null)`),
  foreignKey10({
    name: "approval_decisions_conversation_fk",
    columns: [t.organizationId, t.conversationId],
    foreignColumns: [conversations2.organizationId, conversations2.id]
  }).onDelete("cascade"),
  foreignKey10({
    name: "approval_decisions_draft_fk",
    columns: [t.organizationId, t.draftId],
    foreignColumns: [drafts2.organizationId, drafts2.id]
  }).onDelete("cascade"),
  index31("approval_decisions_conversation_idx").on(t.organizationId, t.conversationId, t.decidedAt.desc(), t.id.desc()),
  index31("approval_decisions_draft_idx").on(t.organizationId, t.draftId).where(sql25`${t.draftId} is not null`)
]);
var approvalPolicies2 = coreSchema2.table("approval_policies", {
  organizationId: orgRef2(),
  channel: text39("channel", { enum: INBOX_CHANNELS2 }).notNull(),
  mode: text39("mode", { enum: APPROVAL_MODES2 }).notNull(),
  threshold: doublePrecision("threshold"),
  labels: text39("labels").array(),
  updatedAt: ts6("updated_at").notNull().defaultNow(),
  updatedByMembershipId: text39("updated_by_membership_id")
}, (t) => [
  primaryKey10({ name: "approval_policies_pkey", columns: [t.organizationId, t.channel] }),
  check20("approval_policies_organization_id_shape", orgShape6),
  check20("approval_policies_organization_not_global", notGlobal6),
  check20("approval_policies_updated_by_membership_id_shape", idShape7("updated_by_membership_id", "mem")),
  check20("approval_policies_channel_known", sql25`${t.channel} in (${list8(INBOX_CHANNELS2)})`),
  check20("approval_policies_mode_known", sql25`${t.mode} in (${list8(APPROVAL_MODES2)})`),
  check20("approval_policies_mode_matches_fields", sql25`(${t.mode} = 'always' and ${t.threshold} is null and ${t.labels} is null)
        or (${t.mode} = 'below_confidence' and ${t.threshold} is not null and ${t.threshold} > 0 and ${t.threshold} <= 1 and ${t.labels} is null)
        or (${t.mode} = 'except' and ${t.threshold} is null and core.reply_labels_valid("labels"))`)
]);
var escalationRules2 = coreSchema2.table("escalation_rules", {
  id: text39("id").notNull(),
  organizationId: orgRef2(),
  trigger: text39("trigger", { enum: ESCALATION_TRIGGERS2 }).notNull(),
  target: text39("target", { enum: ESCALATION_TARGETS2 }).notNull(),
  teamId: text39("team_id"),
  threshold: doublePrecision("threshold"),
  enabled: boolean11("enabled").notNull().default(true),
  createdAt: ts6("created_at").notNull().defaultNow(),
  updatedAt: ts6("updated_at").notNull().defaultNow(),
  updatedByMembershipId: text39("updated_by_membership_id")
}, (t) => [
  primaryKey10({ name: "escalation_rules_pkey", columns: [t.organizationId, t.id] }),
  check20("escalation_rules_id_shape", idShape7("id", "esr")),
  check20("escalation_rules_organization_id_shape", orgShape6),
  check20("escalation_rules_organization_not_global", notGlobal6),
  check20("escalation_rules_team_id_shape", idShape7("team_id", "team")),
  check20("escalation_rules_updated_by_membership_id_shape", idShape7("updated_by_membership_id", "mem")),
  check20("escalation_rules_trigger_known", sql25`${t.trigger} in (${list8(ESCALATION_TRIGGERS2)})`),
  check20("escalation_rules_target_known", sql25`${t.target} in (${list8(ESCALATION_TARGETS2)})`),
  check20("escalation_rules_team_matches_target", sql25`(${t.target} = 'team_round_robin') = (${t.teamId} is not null)`),
  check20("escalation_rules_threshold_matches_trigger", sql25`(${t.trigger} = 'low_confidence') = (${t.threshold} is not null)
        and (${t.threshold} is null or (${t.threshold} > 0 and ${t.threshold} <= 1))`),
  foreignKey10({
    name: "escalation_rules_team_fk",
    columns: [t.organizationId, t.teamId],
    foreignColumns: [teams2.organizationId, teams2.id]
  }).onDelete("cascade"),
  uniqueIndex8("escalation_rules_trigger_key").on(t.organizationId, t.trigger)
]);
// src/schema/core-outbox.ts
import { sql as sql26 } from "drizzle-orm";
import {
  check as check21,
  index as index32,
  jsonb as jsonb16,
  primaryKey as primaryKey11,
  smallint as smallint3,
  text as text40,
  timestamp as timestamp34,
  uniqueIndex as uniqueIndex9
} from "drizzle-orm/pg-core";
var OUTBOX_MAX_ATTEMPTS2 = 50;
var OUTBOX_TOPIC_MAX_LENGTH2 = 120;
var OUTBOX_DEDUPE_KEY_MAX_LENGTH2 = 200;
var OUTBOX_PAYLOAD_MAX_BYTES2 = 16384;
var OUTBOX_ERROR_CODE_MAX_LENGTH2 = 64;
var OUTBOX_MAX_BATCH2 = 100;
var OUTBOX_MIN_LEASE_MS2 = 1000;
var OUTBOX_MAX_LEASE_MS2 = 3600000;
var OUTBOX_MAX_RETRY_DELAY_MS2 = 86400000;
var orgRef3 = () => text40("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" });
var outbox2 = coreSchema2.table("outbox", {
  id: text40("id").notNull(),
  organizationId: orgRef3(),
  topic: text40("topic").notNull(),
  payload: jsonb16("payload").notNull(),
  dedupeKey: text40("dedupe_key").notNull(),
  createdAt: timestamp34("created_at", { withTimezone: true }).notNull().defaultNow(),
  availableAt: timestamp34("available_at", { withTimezone: true }).notNull().defaultNow(),
  attempts: smallint3("attempts").notNull().default(0),
  publishedAt: timestamp34("published_at", { withTimezone: true }),
  lastErrorCode: text40("last_error_code")
}, (t) => [
  primaryKey11({ name: "outbox_pkey", columns: [t.organizationId, t.id] }),
  check21("outbox_id_shape", sql26.raw(`"id" ~ '^obx_[0-9a-f]{32}$'`)),
  check21("outbox_organization_id_shape", sql26.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)),
  check21("outbox_organization_not_global", sql26.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)),
  check21("outbox_topic_shape", sql26`char_length(${t.topic}) between 1 and ${sql26.raw(String(OUTBOX_TOPIC_MAX_LENGTH2))} and ${t.topic} ~ '^[a-z][a-z0-9_.-]*$'`),
  check21("outbox_payload_shape", sql26`jsonb_typeof(${t.payload}) = 'object' and octet_length(${t.payload}::text) <= ${sql26.raw(String(OUTBOX_PAYLOAD_MAX_BYTES2))}`),
  check21("outbox_dedupe_key_length", sql26`char_length(${t.dedupeKey}) between 1 and ${sql26.raw(String(OUTBOX_DEDUPE_KEY_MAX_LENGTH2))}`),
  check21("outbox_attempts_range", sql26`${t.attempts} between 0 and ${sql26.raw(String(OUTBOX_MAX_ATTEMPTS2))}`),
  check21("outbox_last_error_code_shape", sql26`${t.lastErrorCode} is null or (char_length(${t.lastErrorCode}) <= ${sql26.raw(String(OUTBOX_ERROR_CODE_MAX_LENGTH2))} and ${t.lastErrorCode} ~ '^[a-z][a-z0-9_.]*$')`),
  uniqueIndex9("outbox_dedupe_key").on(t.organizationId, t.dedupeKey),
  index32("outbox_drain_idx").on(t.availableAt, t.id).where(sql26`${t.publishedAt} is null and ${t.attempts} < ${sql26.raw(String(OUTBOX_MAX_ATTEMPTS2))}`),
  index32("outbox_published_idx").on(t.publishedAt).where(sql26`${t.publishedAt} is not null`)
]);
// src/schema/outbound.ts
import { pgSchema as pgSchema3 } from "drizzle-orm/pg-core";
var outboundSchema2 = pgSchema3("outbound");
// src/schema/outbound-campaigns.ts
import { sql as sql29 } from "drizzle-orm";
import {
  check as check24,
  foreignKey as foreignKey13,
  index as index35,
  integer as integer22,
  jsonb as jsonb18,
  primaryKey as primaryKey14,
  smallint as smallint6,
  text as text43,
  timestamp as timestamp37,
  unique as unique27,
  uniqueIndex as uniqueIndex12
} from "drizzle-orm/pg-core";

// src/schema/outbound-mail.ts
import { sql as sql27 } from "drizzle-orm";
import {
  check as check22,
  customType as customType8,
  date as date3,
  foreignKey as foreignKey11,
  index as index33,
  integer as integer20,
  jsonb as jsonb17,
  primaryKey as primaryKey12,
  smallint as smallint4,
  text as text41,
  timestamp as timestamp35,
  unique as unique25,
  uniqueIndex as uniqueIndex10
} from "drizzle-orm/pg-core";
var MAILBOX_PROVIDERS2 = ["gmail", "outlook"];
var MAILBOX_KINDS2 = ["personal", "shared"];
var MAILBOX_STATES2 = ["warming", "healthy", "limited", "paused", "disconnected"];
var MAILBOX_STATE_REASONS2 = [
  "owner_paused",
  "admin_paused",
  "complaint_spike",
  "bounce_spike",
  "provider_suspended",
  "auth_revoked",
  "disconnected_by_owner",
  "health_warning"
];
var HEALTH_EFFECTS2 = ["none", "limit_halved", "paused"];
var WEEKDAYS2 = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
var SEND_STATES2 = ["sending", "sent", "refused", "deferred", "failed"];
var SEND_REFUSAL_REASONS2 = [
  "campaign_not_running",
  "outside_window",
  "unverified_address",
  "suppressed",
  "no_consent",
  "mailbox_unavailable",
  "limit_reached",
  "organization_cap_reached",
  "duplicate"
];
var SEND_DEFERRING_REASONS2 = [
  "outside_window",
  "limit_reached",
  "organization_cap_reached"
];
var SEND_CHECKS2 = [
  "campaign",
  "window",
  "address",
  "suppression",
  "consent",
  "mailbox",
  "limits",
  "organization_cap",
  "idempotency"
];
var MAIL_EVENT_KINDS2 = [
  "hard_bounce",
  "soft_bounce",
  "complaint",
  "reply",
  "out_of_office",
  "unsubscribe"
];
var HEALTH_COMPONENT_KINDS2 = [
  "hard_bounce_rate",
  "complaint_rate",
  "soft_bounce_error_rate",
  "reply_rate",
  "provider_warnings"
];
var MAX_MAILBOX_TEAMS2 = 50;
var MAX_MAILBOX_NAME_LENGTH2 = 100;
var MAX_SENDS_PER_DAY2 = 500;
var MAX_SENDS_PER_HOUR2 = 100;
var MAX_MIN_GAP_SECONDS2 = 3600;
var MAX_SEQUENCE_STEP2 = 1000;
var MAX_ATTEMPT_EPOCH2 = 1000;
var MAX_MAIL_PROVIDER_MESSAGE_ID_LENGTH2 = 255;
var MAX_PROVIDER_REFERENCE_LENGTH2 = 2048;
var MAX_TOKEN_CIPHERTEXT_BYTES2 = 8192;
var MAX_HEALTH_COMPONENTS2 = 10;
var MAX_HEALTH_COUNT2 = 1e7;
var list9 = (values) => sql27.raw(values.map((v) => `'${v}'`).join(", "));
var num3 = (value) => sql27.raw(String(value));
var idShape8 = (column, prefix) => sql27.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape7 = sql27.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal7 = sql27.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts7 = (name) => timestamp35(name, { withTimezone: true });
var bytes7 = customType8({
  dataType: () => "bytea"
});
var PROVIDER_MESSAGE_ID = `^[!-~]{1,${MAX_MAIL_PROVIDER_MESSAGE_ID_LENGTH2}}$`;
var mailboxes2 = outboundSchema2.table("mailboxes", {
  id: text41("id").notNull(),
  organizationId: text41("organization_id").notNull(),
  provider: text41("provider", { enum: MAILBOX_PROVIDERS2 }).notNull(),
  kind: text41("kind", { enum: MAILBOX_KINDS2 }).notNull(),
  address: text41("address").notNull(),
  displayName: text41("display_name").notNull(),
  providerAccountId: text41("provider_account_id").notNull(),
  ownerMembershipId: text41("owner_membership_id"),
  teamIds: text41("team_ids").array().notNull().default(sql27`'{}'::text[]`),
  state: text41("state", { enum: MAILBOX_STATES2 }).notNull().default("warming"),
  stateReason: text41("state_reason", { enum: MAILBOX_STATE_REASONS2 }),
  stateChangedAt: ts7("state_changed_at").notNull().defaultNow(),
  accessTokenCiphertext: bytes7("access_token_ciphertext"),
  accessTokenExpiresAt: ts7("access_token_expires_at"),
  refreshTokenCiphertext: bytes7("refresh_token_ciphertext"),
  tokenKeyId: text41("token_key_id"),
  syncCursor: text41("sync_cursor"),
  lastSyncedAt: ts7("last_synced_at"),
  nextPollAt: ts7("next_poll_at"),
  healthScore: smallint4("health_score"),
  healthEffect: text41("health_effect", { enum: HEALTH_EFFECTS2 }).notNull().default("none"),
  healthScoredAt: ts7("health_scored_at"),
  rampStartedAt: ts7("ramp_started_at").notNull().defaultNow(),
  connectedAt: ts7("connected_at").notNull().defaultNow(),
  disconnectedAt: ts7("disconnected_at"),
  updatedAt: ts7("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey12({ name: "mailboxes_pkey", columns: [t.organizationId, t.id] }),
  check22("mailboxes_id_shape", idShape8("id", "mbx")),
  check22("mailboxes_organization_id_shape", orgShape7),
  check22("mailboxes_organization_not_global", notGlobal7),
  check22("mailboxes_provider_known", sql27`${t.provider} in (${list9(MAILBOX_PROVIDERS2)})`),
  check22("mailboxes_kind_known", sql27`${t.kind} in (${list9(MAILBOX_KINDS2)})`),
  check22("mailboxes_address_shape", sql27`char_length(${t.address}) between 3 and 254
        and ${t.address} = lower(${t.address})
        and ${t.address} ~ '^[^@[:space:]]+@[^@[:space:]]+$'`),
  check22("mailboxes_display_name_shape", sql27`char_length(${t.displayName}) between 1 and ${num3(MAX_MAILBOX_NAME_LENGTH2)}`),
  check22("mailboxes_provider_account_id_shape", sql27`char_length(${t.providerAccountId}) between 1 and ${num3(MAX_PROVIDER_REFERENCE_LENGTH2)}`),
  check22("mailboxes_owner_membership_id_shape", idShape8("owner_membership_id", "mem")),
  check22("mailboxes_owner_matches_kind", sql27`(${t.kind} = 'personal') = (${t.ownerMembershipId} is not null)`),
  check22("mailboxes_team_ids_shape", sql27`cardinality(${t.teamIds}) <= ${num3(MAX_MAILBOX_TEAMS2)}
        and array_to_string(${t.teamIds}, ',') ~ '^(team_[0-9a-f]{32}(,team_[0-9a-f]{32})*)?$'`),
  check22("mailboxes_teams_only_shared", sql27`${t.kind} = 'shared' or cardinality(${t.teamIds}) = 0`),
  check22("mailboxes_state_known", sql27`${t.state} in (${list9(MAILBOX_STATES2)})`),
  check22("mailboxes_state_reason_known", sql27`${t.stateReason} is null or ${t.stateReason} in (${list9(MAILBOX_STATE_REASONS2)})`),
  check22("mailboxes_state_reason_matches_state", sql27`case when ${t.state} = 'limited' then ${t.stateReason} is not null
        else (${t.state} in ('paused', 'disconnected')) = (${t.stateReason} is not null) end`),
  check22("mailboxes_disconnected_at_matches_state", sql27`(${t.state} = 'disconnected') = (${t.disconnectedAt} is not null)`),
  check22("mailboxes_tokens_shape", sql27`(${t.accessTokenCiphertext} is null or octet_length(${t.accessTokenCiphertext}) between 1 and ${num3(MAX_TOKEN_CIPHERTEXT_BYTES2)})
        and (${t.refreshTokenCiphertext} is null or octet_length(${t.refreshTokenCiphertext}) between 1 and ${num3(MAX_TOKEN_CIPHERTEXT_BYTES2)})
        and (${t.tokenKeyId} is null or char_length(${t.tokenKeyId}) between 1 and 64)
        and ((${t.accessTokenCiphertext} is null and ${t.refreshTokenCiphertext} is null) = (${t.tokenKeyId} is null))
        and (${t.accessTokenExpiresAt} is null or ${t.accessTokenCiphertext} is not null)`),
  check22("mailboxes_disconnected_holds_no_tokens", sql27`${t.state} <> 'disconnected'
        or (${t.accessTokenCiphertext} is null and ${t.refreshTokenCiphertext} is null)`),
  check22("mailboxes_sync_cursor_shape", sql27`${t.syncCursor} is null or char_length(${t.syncCursor}) between 1 and ${num3(MAX_PROVIDER_REFERENCE_LENGTH2)}`),
  check22("mailboxes_health_score_range", sql27`${t.healthScore} is null or ${t.healthScore} between 0 and 100`),
  check22("mailboxes_health_effect_known", sql27`${t.healthEffect} in (${list9(HEALTH_EFFECTS2)})`),
  check22("mailboxes_health_effect_needs_score", sql27`${t.healthEffect} = 'none' or ${t.healthScore} is not null`),
  uniqueIndex10("mailboxes_address_key").on(t.organizationId, t.provider, t.address),
  index33("mailboxes_list_idx").on(t.organizationId, t.connectedAt.desc(), t.id.desc()),
  index33("mailboxes_owner_idx").on(t.organizationId, t.ownerMembershipId, t.connectedAt.desc(), t.id.desc()).where(sql27`${t.ownerMembershipId} is not null`),
  index33("mailboxes_state_idx").on(t.organizationId, t.state, t.connectedAt.desc(), t.id.desc()),
  index33("mailboxes_poll_idx").on(t.organizationId, t.nextPollAt).where(sql27`${t.nextPollAt} is not null`)
]);
var mailboxLimits2 = outboundSchema2.table("mailbox_limits", {
  organizationId: text41("organization_id").notNull(),
  mailboxId: text41("mailbox_id").notNull(),
  perDay: integer20("per_day").notNull(),
  perHour: integer20("per_hour").notNull(),
  minGapSeconds: integer20("min_gap_seconds").notNull().default(0),
  windowTimeZone: text41("window_time_zone").notNull(),
  windowDays: smallint4("window_days").notNull().default(31),
  windowStartMinute: smallint4("window_start_minute").notNull().default(540),
  windowEndMinute: smallint4("window_end_minute").notNull().default(1020),
  updatedByMembershipId: text41("updated_by_membership_id"),
  updatedAt: ts7("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey12({ name: "mailbox_limits_pkey", columns: [t.organizationId, t.mailboxId] }),
  check22("mailbox_limits_organization_id_shape", orgShape7),
  check22("mailbox_limits_organization_not_global", notGlobal7),
  check22("mailbox_limits_mailbox_id_shape", idShape8("mailbox_id", "mbx")),
  check22("mailbox_limits_per_day_range", sql27`${t.perDay} between 1 and ${num3(MAX_SENDS_PER_DAY2)}`),
  check22("mailbox_limits_per_hour_range", sql27`${t.perHour} between 1 and ${num3(MAX_SENDS_PER_HOUR2)}`),
  check22("mailbox_limits_min_gap_range", sql27`${t.minGapSeconds} between 0 and ${num3(MAX_MIN_GAP_SECONDS2)}`),
  check22("mailbox_limits_window_time_zone_shape", sql27`char_length(${t.windowTimeZone}) between 1 and 64`),
  check22("mailbox_limits_window_days_range", sql27`${t.windowDays} between 1 and 127`),
  check22("mailbox_limits_window_minutes_range", sql27`${t.windowStartMinute} between 0 and 1439
        and ${t.windowEndMinute} between 1 and 1440
        and ${t.windowEndMinute} > ${t.windowStartMinute}`),
  check22("mailbox_limits_updated_by_membership_id_shape", idShape8("updated_by_membership_id", "mem")),
  foreignKey11({
    name: "mailbox_limits_mailbox_fk",
    columns: [t.organizationId, t.mailboxId],
    foreignColumns: [mailboxes2.organizationId, mailboxes2.id]
  }).onDelete("cascade")
]);
var mailMessages2 = outboundSchema2.table("mail_messages", {
  id: text41("id").notNull(),
  organizationId: text41("organization_id").notNull(),
  campaignId: text41("campaign_id").notNull(),
  enrollmentId: text41("enrollment_id").notNull(),
  prospectId: text41("prospect_id").notNull(),
  draftId: text41("draft_id"),
  step: integer20("step").notNull(),
  attemptEpoch: integer20("attempt_epoch").notNull(),
  sendKey: text41("send_key").notNull(),
  mailboxId: text41("mailbox_id"),
  state: text41("state", { enum: SEND_STATES2 }).notNull(),
  reason: text41("reason", { enum: SEND_REFUSAL_REASONS2 }),
  checks: jsonb17("checks").notNull().default(sql27`'[]'::jsonb`),
  retryAt: ts7("retry_at"),
  providerMessageId: text41("provider_message_id"),
  providerThreadId: text41("provider_thread_id"),
  decidedAt: ts7("decided_at").notNull().defaultNow(),
  sentAt: ts7("sent_at"),
  updatedAt: ts7("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey12({ name: "mail_messages_pkey", columns: [t.organizationId, t.id] }),
  check22("mail_messages_id_shape", idShape8("id", "snd")),
  check22("mail_messages_organization_id_shape", orgShape7),
  check22("mail_messages_organization_not_global", notGlobal7),
  check22("mail_messages_campaign_id_shape", idShape8("campaign_id", "cpg")),
  check22("mail_messages_enrollment_id_shape", idShape8("enrollment_id", "enr")),
  check22("mail_messages_prospect_id_shape", idShape8("prospect_id", "prs")),
  check22("mail_messages_draft_id_shape", idShape8("draft_id", "drf")),
  check22("mail_messages_mailbox_id_shape", idShape8("mailbox_id", "mbx")),
  check22("mail_messages_step_range", sql27`${t.step} between 0 and ${num3(MAX_SEQUENCE_STEP2)}`),
  check22("mail_messages_attempt_epoch_range", sql27`${t.attemptEpoch} between 0 and ${num3(MAX_ATTEMPT_EPOCH2)}`),
  check22("mail_messages_send_key_matches", sql27`${t.sendKey} = ${t.enrollmentId} || ':' || ${t.step}::text || ':' || ${t.attemptEpoch}::text`),
  check22("mail_messages_state_known", sql27`${t.state} in (${list9(SEND_STATES2)})`),
  check22("mail_messages_reason_known", sql27`${t.reason} is null or ${t.reason} in (${list9(SEND_REFUSAL_REASONS2)})`),
  check22("mail_messages_reason_matches_state", sql27`(${t.state} in ('refused', 'deferred')) = (${t.reason} is not null)`),
  check22("mail_messages_reason_fits_state", sql27`${t.state} not in ('refused', 'deferred')
        or ((${t.state} = 'deferred') = (${t.reason} in (${list9(SEND_DEFERRING_REASONS2)})))`),
  check22("mail_messages_retry_at_matches_state", sql27`(${t.state} = 'deferred') = (${t.retryAt} is not null)`),
  check22("mail_messages_mailbox_when_sending", sql27`${t.state} not in ('sending', 'sent', 'failed') or ${t.mailboxId} is not null`),
  check22("mail_messages_sent_at_matches_state", sql27`(${t.state} = 'sent') = (${t.sentAt} is not null)`),
  check22("mail_messages_provider_ids_only_when_sent", sql27`(${t.providerMessageId} is null and ${t.providerThreadId} is null) or ${t.state} = 'sent'`),
  check22("mail_messages_provider_message_id_shape", sql27`${t.providerMessageId} is null or ${t.providerMessageId} ~ ${sql27.raw(`'${PROVIDER_MESSAGE_ID}'`)}`),
  check22("mail_messages_provider_thread_id_shape", sql27`${t.providerThreadId} is null or char_length(${t.providerThreadId}) between 1 and ${num3(MAX_PROVIDER_REFERENCE_LENGTH2)}`),
  check22("mail_messages_checks_shape", sql27`jsonb_typeof(${t.checks}) = 'array' and jsonb_array_length(${t.checks}) <= ${num3(SEND_CHECKS2.length)}`),
  uniqueIndex10("mail_messages_send_key_key").on(t.organizationId, t.sendKey),
  uniqueIndex10("mail_messages_provider_message_key").on(t.organizationId, t.mailboxId, t.providerMessageId),
  unique25("mail_messages_id_mailbox_key").on(t.organizationId, t.id, t.mailboxId),
  foreignKey11({
    name: "mail_messages_mailbox_fk",
    columns: [t.organizationId, t.mailboxId],
    foreignColumns: [mailboxes2.organizationId, mailboxes2.id]
  }).onDelete("cascade"),
  index33("mail_messages_list_idx").on(t.organizationId, t.decidedAt.desc(), t.id.desc()),
  index33("mail_messages_campaign_idx").on(t.organizationId, t.campaignId, t.decidedAt.desc(), t.id.desc()),
  index33("mail_messages_prospect_idx").on(t.organizationId, t.prospectId, t.decidedAt.desc(), t.id.desc()),
  index33("mail_messages_mailbox_idx").on(t.organizationId, t.mailboxId, t.decidedAt.desc(), t.id.desc()).where(sql27`${t.mailboxId} is not null`),
  index33("mail_messages_state_idx").on(t.organizationId, t.state, t.decidedAt.desc(), t.id.desc()),
  index33("mail_messages_enrollment_idx").on(t.organizationId, t.enrollmentId, t.step),
  index33("mail_messages_sent_idx").on(t.organizationId, t.mailboxId, t.sentAt.desc()).where(sql27`${t.sentAt} is not null`),
  index33("mail_messages_sending_idx").on(t.organizationId, t.decidedAt).where(sql27`${t.state} = 'sending'`),
  index33("mail_messages_deferred_idx").on(t.organizationId, t.retryAt).where(sql27`${t.state} = 'deferred'`)
]);
var mailEvents2 = outboundSchema2.table("mail_events", {
  id: text41("id").notNull(),
  organizationId: text41("organization_id").notNull(),
  mailboxId: text41("mailbox_id").notNull(),
  kind: text41("kind", { enum: MAIL_EVENT_KINDS2 }).notNull(),
  sendId: text41("send_id"),
  prospectId: text41("prospect_id"),
  enrollmentId: text41("enrollment_id"),
  providerMessageId: text41("provider_message_id").notNull(),
  returnDate: date3("return_date", { mode: "string" }),
  occurredAt: ts7("occurred_at").notNull(),
  recordedAt: ts7("recorded_at").notNull().defaultNow()
}, (t) => [
  primaryKey12({ name: "mail_events_pkey", columns: [t.organizationId, t.id] }),
  check22("mail_events_id_shape", idShape8("id", "mev")),
  check22("mail_events_organization_id_shape", orgShape7),
  check22("mail_events_organization_not_global", notGlobal7),
  check22("mail_events_mailbox_id_shape", idShape8("mailbox_id", "mbx")),
  check22("mail_events_kind_known", sql27`${t.kind} in (${list9(MAIL_EVENT_KINDS2)})`),
  check22("mail_events_send_id_shape", idShape8("send_id", "snd")),
  check22("mail_events_prospect_id_shape", idShape8("prospect_id", "prs")),
  check22("mail_events_enrollment_id_shape", idShape8("enrollment_id", "enr")),
  check22("mail_events_provider_message_id_shape", sql27`${t.providerMessageId} ~ ${sql27.raw(`'${PROVIDER_MESSAGE_ID}'`)}`),
  check22("mail_events_return_date_only_out_of_office", sql27`${t.returnDate} is null or ${t.kind} = 'out_of_office'`),
  uniqueIndex10("mail_events_provider_message_key").on(t.organizationId, t.mailboxId, t.providerMessageId),
  foreignKey11({
    name: "mail_events_mailbox_fk",
    columns: [t.organizationId, t.mailboxId],
    foreignColumns: [mailboxes2.organizationId, mailboxes2.id]
  }).onDelete("cascade"),
  foreignKey11({
    name: "mail_events_send_fk",
    columns: [t.organizationId, t.sendId, t.mailboxId],
    foreignColumns: [mailMessages2.organizationId, mailMessages2.id, mailMessages2.mailboxId]
  }).onDelete("cascade"),
  index33("mail_events_list_idx").on(t.organizationId, t.occurredAt.desc(), t.id.desc()),
  index33("mail_events_mailbox_idx").on(t.organizationId, t.mailboxId, t.occurredAt.desc(), t.id.desc()),
  index33("mail_events_mailbox_kind_idx").on(t.organizationId, t.mailboxId, t.kind, t.occurredAt.desc(), t.id.desc()),
  index33("mail_events_prospect_idx").on(t.organizationId, t.prospectId, t.occurredAt.desc(), t.id.desc()).where(sql27`${t.prospectId} is not null`)
]);
var healthDaily2 = outboundSchema2.table("health_daily", {
  organizationId: text41("organization_id").notNull(),
  mailboxId: text41("mailbox_id").notNull(),
  day: date3("day", { mode: "string" }).notNull(),
  score: smallint4("score"),
  sent: integer20("sent").notNull().default(0),
  hardBounces: integer20("hard_bounces").notNull().default(0),
  softBounces: integer20("soft_bounces").notNull().default(0),
  complaints: integer20("complaints").notNull().default(0),
  replies: integer20("replies").notNull().default(0),
  errors: integer20("errors").notNull().default(0),
  components: jsonb17("components").notNull().default(sql27`'[]'::jsonb`),
  computedAt: ts7("computed_at").notNull().defaultNow()
}, (t) => [
  primaryKey12({ name: "health_daily_pkey", columns: [t.organizationId, t.mailboxId, t.day] }),
  check22("health_daily_organization_id_shape", orgShape7),
  check22("health_daily_organization_not_global", notGlobal7),
  check22("health_daily_mailbox_id_shape", idShape8("mailbox_id", "mbx")),
  check22("health_daily_score_range", sql27`${t.score} is null or ${t.score} between 0 and 100`),
  check22("health_daily_counts_range", sql27`${t.sent} between 0 and ${num3(MAX_HEALTH_COUNT2)}
        and ${t.hardBounces} between 0 and ${num3(MAX_HEALTH_COUNT2)}
        and ${t.softBounces} between 0 and ${num3(MAX_HEALTH_COUNT2)}
        and ${t.complaints} between 0 and ${num3(MAX_HEALTH_COUNT2)}
        and ${t.replies} between 0 and ${num3(MAX_HEALTH_COUNT2)}
        and ${t.errors} between 0 and ${num3(MAX_HEALTH_COUNT2)}`),
  check22("health_daily_components_shape", sql27`jsonb_typeof(${t.components}) = 'array' and jsonb_array_length(${t.components}) <= ${num3(MAX_HEALTH_COMPONENTS2)}`),
  foreignKey11({
    name: "health_daily_mailbox_fk",
    columns: [t.organizationId, t.mailboxId],
    foreignColumns: [mailboxes2.organizationId, mailboxes2.id]
  }).onDelete("cascade")
]);

// src/schema/outbound-tables.ts
import { sql as sql28 } from "drizzle-orm";
import {
  bigint as bigint8,
  boolean as boolean12,
  check as check23,
  date as date4,
  doublePrecision as doublePrecision2,
  foreignKey as foreignKey12,
  index as index34,
  integer as integer21,
  primaryKey as primaryKey13,
  smallint as smallint5,
  text as text42,
  timestamp as timestamp36,
  unique as unique26,
  uniqueIndex as uniqueIndex11
} from "drizzle-orm/pg-core";
var DRAFT_CHANNELS2 = ["email"];
var OUTBOUND_LANGUAGES2 = ["en"];
var DRAFT_CHECKS2 = [
  "citations_resolve",
  "claims_supported",
  "banned_phrase",
  "length",
  "name_match"
];
var DRAFT_CHECK_RESULTS2 = ["pass", "fail"];
var DRAFT_TEXT_SOURCES2 = ["generated", "edited"];
var ANGLE_ORIGINS2 = ["won_deals", "model_default"];
var CITATION_KINDS2 = [
  "prospect_field",
  "signal",
  "web_page",
  "moment",
  "document"
];
var CITATION_PROSPECT_FIELDS2 = [
  "firstName",
  "lastName",
  "jobTitle",
  "email",
  "phone",
  "linkedinUrl"
];
var BRIEF_ENTRY_ROLES2 = ["statement", "angle_source"];
var MAX_BRIEF_STATEMENTS2 = 20;
var MAX_BRIEF_STATEMENT_LENGTH2 = 500;
var MAX_ANGLE_LENGTH2 = 500;
var MAX_DRAFT_CITATIONS2 = 20;
var MAX_DRAFT_SUBJECT_LENGTH2 = 200;
var MAX_DRAFT_BODY_LENGTH2 = 5000;
var MAX_DRAFT_GOAL_LENGTH2 = 500;
var MAX_STEP_KEY_LENGTH2 = 40;
var MAX_MODEL_NAME_LENGTH2 = 100;
var MAX_TONE_LENGTH2 = 500;
var MAX_PREFERRED_WORDS2 = 50;
var MAX_BANNED_PHRASES2 = 100;
var MAX_VOICE_TERM_LENGTH2 = 100;
var MAX_SIGN_OFF_LENGTH2 = 200;
var MAX_VOICE_LENGTH_CHARACTERS2 = 5000;
var MIN_VOICE_LENGTH_CHARACTERS2 = 100;
var MAX_VOICE_VERSION2 = 1e6;
var MAX_CITATION_URL_LENGTH2 = 2048;
var MAX_CITATION_DOCUMENT_PAGE2 = 300;
var MAX_DRAFT_REVISION2 = 1e4;
var MAX_WON_DEAL_COUNT2 = 100;
var MAX_CHECK_COUNT2 = 1000;
var MAX_DROPPED_COUNT2 = 1000;
var list10 = (values) => sql28.raw(values.map((v) => `'${v}'`).join(", "));
var num4 = (value) => sql28.raw(String(value));
var idShape9 = (column, prefix) => sql28.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape8 = sql28.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal8 = sql28.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts8 = (name) => timestamp36(name, { withTimezone: true });
var sourceColumns = () => ({
  sourceKind: text42("source_kind", { enum: CITATION_KINDS2 }).notNull(),
  sourceProspectId: text42("source_prospect_id"),
  sourceField: text42("source_field", { enum: CITATION_PROSPECT_FIELDS2 }),
  sourceSignalId: text42("source_signal_id"),
  sourceObservedAt: ts8("source_observed_at"),
  sourceUrl: text42("source_url"),
  sourceRetrievedAt: ts8("source_retrieved_at"),
  sourceCallId: text42("source_call_id"),
  sourceDealRecordId: text42("source_deal_record_id"),
  sourceDocumentId: text42("source_document_id"),
  sourcePage: smallint5("source_page")
});
var SOURCE_REQUIRED = {
  prospect_field: ["source_prospect_id", "source_field"],
  signal: ["source_signal_id", "source_observed_at"],
  web_page: ["source_url", "source_retrieved_at"],
  moment: ["source_call_id", "source_deal_record_id"],
  document: ["source_document_id"]
};
var SOURCE_COLUMNS = [
  "source_prospect_id",
  "source_field",
  "source_signal_id",
  "source_observed_at",
  "source_url",
  "source_retrieved_at",
  "source_call_id",
  "source_deal_record_id",
  "source_document_id",
  "source_page"
];
var sourceMatchesKind = (table) => sql28.raw(`${CITATION_KINDS2.map((kind) => {
  const required = SOURCE_REQUIRED[kind];
  const parts = SOURCE_COLUMNS.map((column) => {
    if (required.includes(column)) {
      return `"${table}"."${column}" is not null`;
    }
    if (kind === "document" && column === "source_page") {
      return;
    }
    return `"${table}"."${column}" is null`;
  }).filter((part) => part !== undefined);
  return `("${table}"."source_kind" = '${kind}' and ${parts.join(" and ")})`;
}).join(" or ")}`);
var sourceChecks = (table, t) => [
  check23(`${table}_source_kind_known`, sql28`${t.sourceKind} in (${list10(CITATION_KINDS2)})`),
  check23(`${table}_source_matches_kind`, sourceMatchesKind(table)),
  check23(`${table}_source_prospect_id_shape`, idShape9("source_prospect_id", "prs")),
  check23(`${table}_source_signal_id_shape`, idShape9("source_signal_id", "sig")),
  check23(`${table}_source_call_id_shape`, idShape9("source_call_id", "call")),
  check23(`${table}_source_deal_record_id_shape`, idShape9("source_deal_record_id", "deal")),
  check23(`${table}_source_document_id_shape`, idShape9("source_document_id", "doc")),
  check23(`${table}_source_field_known`, sql28`${t.sourceField} is null or ${t.sourceField} in (${list10(CITATION_PROSPECT_FIELDS2)})`),
  check23(`${table}_source_url_shape`, sql28`${t.sourceUrl} is null or (char_length(${t.sourceUrl}) between 1 and ${num4(MAX_CITATION_URL_LENGTH2)}
      and ${t.sourceUrl} ~ '^https?://[^@/?#[:space:]]+([/?#][^[:space:]]*)?$')`),
  check23(`${table}_source_page_shape`, sql28`${t.sourcePage} is null or ${t.sourcePage} between 1 and ${num4(MAX_CITATION_DOCUMENT_PAGE2)}`)
];
var outboundBrandVoices2 = outboundSchema2.table("brand_voices", {
  id: text42("id").notNull(),
  organizationId: text42("organization_id").notNull(),
  version: integer21("version").notNull(),
  tone: text42("tone").notNull(),
  preferredWords: text42("preferred_words").array().notNull().default(sql28`'{}'::text[]`),
  bannedPhrases: text42("banned_phrases").array().notNull().default(sql28`'{}'::text[]`),
  signOff: text42("sign_off"),
  maxLengthCharacters: integer21("max_length_characters").notNull().default(1500),
  createdByMembershipId: text42("created_by_membership_id").notNull(),
  createdAt: ts8("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey13({ name: "brand_voices_pkey", columns: [t.organizationId, t.id] }),
  check23("brand_voices_id_shape", idShape9("id", "bvo")),
  check23("brand_voices_organization_id_shape", orgShape8),
  check23("brand_voices_organization_not_global", notGlobal8),
  check23("brand_voices_version_range", sql28`${t.version} between 1 and ${num4(MAX_VOICE_VERSION2)}`),
  check23("brand_voices_tone_shape", sql28`char_length(${t.tone}) between 1 and ${num4(MAX_TONE_LENGTH2)}`),
  check23("brand_voices_preferred_words_shape", sql28`cardinality(${t.preferredWords}) <= ${num4(MAX_PREFERRED_WORDS2)}
        and array_position(${t.preferredWords}, '') is null
        and array_position(${t.preferredWords}, null) is null
        and char_length(array_to_string(${t.preferredWords}, '')) <= ${num4(MAX_PREFERRED_WORDS2 * MAX_VOICE_TERM_LENGTH2)}`),
  check23("brand_voices_banned_phrases_shape", sql28`cardinality(${t.bannedPhrases}) <= ${num4(MAX_BANNED_PHRASES2)}
        and array_position(${t.bannedPhrases}, '') is null
        and array_position(${t.bannedPhrases}, null) is null
        and char_length(array_to_string(${t.bannedPhrases}, '')) <= ${num4(MAX_BANNED_PHRASES2 * MAX_VOICE_TERM_LENGTH2)}`),
  check23("brand_voices_sign_off_shape", sql28`${t.signOff} is null or char_length(${t.signOff}) between 1 and ${num4(MAX_SIGN_OFF_LENGTH2)}`),
  check23("brand_voices_max_length_range", sql28`${t.maxLengthCharacters} between ${num4(MIN_VOICE_LENGTH_CHARACTERS2)} and ${num4(MAX_VOICE_LENGTH_CHARACTERS2)}`),
  check23("brand_voices_created_by_membership_id_shape", idShape9("created_by_membership_id", "mem")),
  uniqueIndex11("brand_voices_version_key").on(t.organizationId, t.version),
  unique26("brand_voices_id_version_key").on(t.organizationId, t.id, t.version)
]);
var outboundBriefs2 = outboundSchema2.table("briefs", {
  id: text42("id").notNull(),
  organizationId: text42("organization_id").notNull(),
  prospectId: text42("prospect_id").notNull(),
  angleText: text42("angle_text").notNull(),
  angleOrigin: text42("angle_origin", { enum: ANGLE_ORIGINS2 }).notNull(),
  droppedCount: integer21("dropped_count").notNull().default(0),
  prospectUpdatedAt: ts8("prospect_updated_at").notNull(),
  language: text42("language", { enum: OUTBOUND_LANGUAGES2 }).notNull(),
  model: text42("model").notNull(),
  createdAt: ts8("created_at").notNull().defaultNow(),
  expiresAt: ts8("expires_at").notNull()
}, (t) => [
  primaryKey13({ name: "briefs_pkey", columns: [t.organizationId, t.id] }),
  check23("briefs_id_shape", idShape9("id", "brf")),
  check23("briefs_organization_id_shape", orgShape8),
  check23("briefs_organization_not_global", notGlobal8),
  check23("briefs_prospect_id_shape", idShape9("prospect_id", "prs")),
  check23("briefs_angle_text_shape", sql28`char_length(${t.angleText}) between 1 and ${num4(MAX_ANGLE_LENGTH2)}`),
  check23("briefs_angle_origin_known", sql28`${t.angleOrigin} in (${list10(ANGLE_ORIGINS2)})`),
  check23("briefs_dropped_count_range", sql28`${t.droppedCount} between 0 and ${num4(MAX_DROPPED_COUNT2)}`),
  check23("briefs_language_known", sql28`${t.language} in (${list10(OUTBOUND_LANGUAGES2)})`),
  check23("briefs_model_shape", sql28`char_length(${t.model}) between 1 and ${num4(MAX_MODEL_NAME_LENGTH2)}`),
  check23("briefs_expires_after_created", sql28`${t.expiresAt} > ${t.createdAt}`),
  unique26("briefs_id_prospect_key").on(t.organizationId, t.id, t.prospectId),
  index34("briefs_prospect_idx").on(t.organizationId, t.prospectId, t.createdAt.desc(), t.id.desc()),
  index34("briefs_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index34("briefs_expires_at_idx").on(t.expiresAt)
]);
var outboundBriefStatements2 = outboundSchema2.table("brief_statements", {
  organizationId: text42("organization_id").notNull(),
  briefId: text42("brief_id").notNull(),
  position: smallint5("position").notNull(),
  role: text42("role", { enum: BRIEF_ENTRY_ROLES2 }).notNull(),
  text: text42("text"),
  ...sourceColumns()
}, (t) => [
  primaryKey13({
    name: "brief_statements_pkey",
    columns: [t.organizationId, t.briefId, t.position]
  }),
  check23("brief_statements_organization_id_shape", orgShape8),
  check23("brief_statements_organization_not_global", notGlobal8),
  check23("brief_statements_brief_id_shape", idShape9("brief_id", "brf")),
  check23("brief_statements_position_range", sql28`${t.position} between 0 and ${num4(MAX_BRIEF_STATEMENTS2 * 2 - 1)}`),
  check23("brief_statements_role_known", sql28`${t.role} in (${list10(BRIEF_ENTRY_ROLES2)})`),
  check23("brief_statements_text_matches_role", sql28`(${t.role} = 'statement') = (${t.text} is not null)
        and (${t.text} is null or char_length(${t.text}) between 1 and ${num4(MAX_BRIEF_STATEMENT_LENGTH2)})`),
  ...sourceChecks("brief_statements", t),
  foreignKey12({
    name: "brief_statements_brief_fk",
    columns: [t.organizationId, t.briefId],
    foreignColumns: [outboundBriefs2.organizationId, outboundBriefs2.id]
  }).onDelete("cascade")
]);
var outboundDrafts2 = outboundSchema2.table("drafts", {
  id: text42("id").notNull(),
  organizationId: text42("organization_id").notNull(),
  prospectId: text42("prospect_id").notNull(),
  campaignId: text42("campaign_id"),
  stepKey: text42("step_key"),
  channel: text42("channel", { enum: DRAFT_CHANNELS2 }).notNull(),
  goal: text42("goal").notNull(),
  language: text42("language", { enum: OUTBOUND_LANGUAGES2 }).notNull(),
  subject: text42("subject").notNull(),
  body: text42("body").notNull(),
  revision: integer21("revision").notNull().default(1),
  source: text42("source", { enum: DRAFT_TEXT_SOURCES2 }).notNull().default("generated"),
  ungrounded: boolean12("ungrounded").notNull(),
  wonDealCount: integer21("won_deal_count").notNull().default(0),
  autoSendable: boolean12("auto_sendable").notNull().default(false),
  brandVoiceId: text42("brand_voice_id").notNull(),
  voiceVersion: integer21("voice_version").notNull(),
  briefId: text42("brief_id"),
  model: text42("model").notNull(),
  createdAt: ts8("created_at").notNull().defaultNow(),
  updatedAt: ts8("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey13({ name: "drafts_pkey", columns: [t.organizationId, t.id] }),
  check23("drafts_id_shape", idShape9("id", "drf")),
  check23("drafts_organization_id_shape", orgShape8),
  check23("drafts_organization_not_global", notGlobal8),
  check23("drafts_prospect_id_shape", idShape9("prospect_id", "prs")),
  check23("drafts_campaign_id_shape", idShape9("campaign_id", "cpg")),
  check23("drafts_step_key_shape", sql28`${t.stepKey} is null or (char_length(${t.stepKey}) between 1 and ${num4(MAX_STEP_KEY_LENGTH2)}
        and ${t.stepKey} ~ '^[a-z][a-z0-9_-]*$')`),
  check23("drafts_channel_known", sql28`${t.channel} in (${list10(DRAFT_CHANNELS2)})`),
  check23("drafts_goal_shape", sql28`char_length(${t.goal}) between 1 and ${num4(MAX_DRAFT_GOAL_LENGTH2)}`),
  check23("drafts_language_known", sql28`${t.language} in (${list10(OUTBOUND_LANGUAGES2)})`),
  check23("drafts_subject_shape", sql28`char_length(${t.subject}) between 1 and ${num4(MAX_DRAFT_SUBJECT_LENGTH2)}`),
  check23("drafts_body_shape", sql28`char_length(${t.body}) between 1 and ${num4(MAX_DRAFT_BODY_LENGTH2)}`),
  check23("drafts_revision_range", sql28`${t.revision} between 1 and ${num4(MAX_DRAFT_REVISION2)}`),
  check23("drafts_source_known", sql28`${t.source} in (${list10(DRAFT_TEXT_SOURCES2)})`),
  check23("drafts_edited_after_first", sql28`${t.source} = 'generated' or ${t.revision} > 1`),
  check23("drafts_won_deal_count_range", sql28`${t.wonDealCount} between 0 and ${num4(MAX_WON_DEAL_COUNT2)}`),
  check23("drafts_ungrounded_has_no_deals", sql28`not ${t.ungrounded} or ${t.wonDealCount} = 0`),
  check23("drafts_auto_sendable_needs_grounding", sql28`not (${t.autoSendable} and ${t.ungrounded})`),
  check23("drafts_brand_voice_id_shape", idShape9("brand_voice_id", "bvo")),
  check23("drafts_voice_version_range", sql28`${t.voiceVersion} between 1 and ${num4(MAX_VOICE_VERSION2)}`),
  check23("drafts_brief_id_shape", idShape9("brief_id", "brf")),
  check23("drafts_model_shape", sql28`char_length(${t.model}) between 1 and ${num4(MAX_MODEL_NAME_LENGTH2)}`),
  check23("drafts_updated_not_before_created", sql28`${t.updatedAt} >= ${t.createdAt}`),
  foreignKey12({
    name: "drafts_brand_voice_fk",
    columns: [t.organizationId, t.brandVoiceId, t.voiceVersion],
    foreignColumns: [
      outboundBrandVoices2.organizationId,
      outboundBrandVoices2.id,
      outboundBrandVoices2.version
    ]
  }),
  foreignKey12({
    name: "drafts_brief_fk",
    columns: [t.organizationId, t.briefId, t.prospectId],
    foreignColumns: [outboundBriefs2.organizationId, outboundBriefs2.id, outboundBriefs2.prospectId]
  }),
  index34("drafts_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index34("drafts_brief_idx").on(t.organizationId, t.briefId),
  index34("drafts_brand_voice_idx").on(t.organizationId, t.brandVoiceId, t.voiceVersion),
  index34("drafts_prospect_idx").on(t.organizationId, t.prospectId, t.createdAt.desc(), t.id.desc()),
  index34("drafts_campaign_idx").on(t.organizationId, t.campaignId, t.createdAt.desc(), t.id.desc()).where(sql28`${t.campaignId} is not null`),
  index34("drafts_ungrounded_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()).where(sql28`${t.ungrounded}`)
]);
var outboundDraftCitations2 = outboundSchema2.table("draft_citations", {
  organizationId: text42("organization_id").notNull(),
  draftId: text42("draft_id").notNull(),
  position: smallint5("position").notNull(),
  ...sourceColumns(),
  applies: boolean12("applies").notNull().default(true),
  score: doublePrecision2("score")
}, (t) => [
  primaryKey13({
    name: "draft_citations_pkey",
    columns: [t.organizationId, t.draftId, t.position]
  }),
  check23("draft_citations_organization_id_shape", orgShape8),
  check23("draft_citations_organization_not_global", notGlobal8),
  check23("draft_citations_draft_id_shape", idShape9("draft_id", "drf")),
  check23("draft_citations_position_range", sql28`${t.position} between 0 and ${num4(MAX_DRAFT_CITATIONS2 - 1)}`),
  check23("draft_citations_score_shape", sql28`${t.score} is null or (${t.sourceKind} in ('moment', 'document') and ${t.score} > -1000000 and ${t.score} < 1000000)`),
  ...sourceChecks("draft_citations", t),
  foreignKey12({
    name: "draft_citations_draft_fk",
    columns: [t.organizationId, t.draftId],
    foreignColumns: [outboundDrafts2.organizationId, outboundDrafts2.id]
  }).onDelete("cascade")
]);
var outboundDraftChecks2 = outboundSchema2.table("draft_checks", {
  organizationId: text42("organization_id").notNull(),
  draftId: text42("draft_id").notNull(),
  check: text42("check_name", { enum: DRAFT_CHECKS2 }).notNull(),
  result: text42("result", { enum: DRAFT_CHECK_RESULTS2 }).notNull(),
  count: integer21("count").notNull().default(0),
  checkedAt: ts8("checked_at").notNull().defaultNow()
}, (t) => [
  primaryKey13({
    name: "draft_checks_pkey",
    columns: [t.organizationId, t.draftId, t.check]
  }),
  check23("draft_checks_organization_id_shape", orgShape8),
  check23("draft_checks_organization_not_global", notGlobal8),
  check23("draft_checks_draft_id_shape", idShape9("draft_id", "drf")),
  check23("draft_checks_name_known", sql28`${t.check} in (${list10(DRAFT_CHECKS2)})`),
  check23("draft_checks_result_known", sql28`${t.result} in (${list10(DRAFT_CHECK_RESULTS2)})`),
  check23("draft_checks_count_range", sql28`${t.count} between 0 and ${num4(MAX_CHECK_COUNT2)}`),
  check23("draft_checks_pass_means_none", sql28`(${t.result} = 'pass') = (${t.count} = 0)`),
  foreignKey12({
    name: "draft_checks_draft_fk",
    columns: [t.organizationId, t.draftId],
    foreignColumns: [outboundDrafts2.organizationId, outboundDrafts2.id]
  }).onDelete("cascade")
]);
var outboundModelUsage2 = outboundSchema2.table("model_usage", {
  organizationId: text42("organization_id").notNull(),
  month: date4("month", { mode: "string" }).notNull(),
  model: text42("model").notNull(),
  inputTokens: bigint8("input_tokens", { mode: "number" }).notNull().default(0),
  outputTokens: bigint8("output_tokens", { mode: "number" }).notNull().default(0),
  requestCount: bigint8("request_count", { mode: "number" }).notNull().default(0),
  costMicros: bigint8("cost_micros", { mode: "number" }).notNull().default(0),
  updatedAt: ts8("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey13({ name: "model_usage_pkey", columns: [t.organizationId, t.month, t.model] }),
  check23("model_usage_organization_id_shape", orgShape8),
  check23("model_usage_organization_not_global", notGlobal8),
  check23("model_usage_month_first_day", sql28`extract(day from ${t.month}) = 1`),
  check23("model_usage_model_shape", sql28`char_length(${t.model}) between 1 and ${num4(MAX_MODEL_NAME_LENGTH2)}`),
  check23("model_usage_counts_not_negative", sql28`${t.inputTokens} >= 0 and ${t.outputTokens} >= 0 and ${t.requestCount} >= 0 and ${t.costMicros} >= 0`)
]);

// src/schema/outbound-campaigns.ts
var CAMPAIGN_STATES2 = ["draft", "ready", "running", "paused", "archived"];
var CAMPAIGN_APPROVAL_MODES2 = ["auto", "review", "mixed"];
var WINDOW_ZONES2 = ["campaign", "prospect"];
var STEP_KINDS2 = ["email", "wait", "branch", "rep_task", "end"];
var STEP_TASKS2 = ["call", "manual_message", "research", "other"];
var MAX_SEQUENCE_STEPS2 = 50;
var ENROLLMENT_STATES2 = ["active", "completed", "stopped"];
var ENROLLMENT_STOP_REASONS2 = [
  "replied",
  "hard_bounce",
  "unsubscribed",
  "complaint",
  "suppressed",
  "no_consent",
  "unverified_address",
  "removed_by_rep",
  "meeting_booked",
  "prospect_erased",
  "campaign_archived"
];
var ENROLLMENT_EVENT_KINDS2 = [
  "enrolled",
  "step_entered",
  "sent",
  "deferred",
  "refused",
  "rep_task_created",
  "branch_taken",
  "stopped",
  "completed"
];
var PLAY_INTENTS2 = [
  "cold_intro",
  "closed_lost_reengagement",
  "post_event_follow_up",
  "nurture"
];
var PLAY_SOURCES2 = ["builtin", "seeded", "custom"];
var PLAY_STATUSES2 = ["proposed", "accepted", "discarded"];
var PLAY_CITATION_KINDS2 = ["moment", "document"];
var PROMOTION_SOURCES2 = ["auto", "manual"];
var OUTBOUND_WORK_KINDS2 = ["step_due"];
var MAX_CAMPAIGN_NAME_LENGTH2 = 100;
var MAX_DAILY_CAP2 = 5000;
var MAX_CAMPAIGN_VERSION2 = 1e6;
var MAX_STEP_HOURS2 = 2160;
var MAX_TASK_INSTRUCTION_LENGTH2 = 500;
var MAX_BRANCH_ARMS2 = 5;
var MAX_VARIANT_WEIGHT2 = 99;
var MAX_VARIANT_LABEL_LENGTH2 = 100;
var MAX_VARIANT_ANGLE_LENGTH2 = 500;
var MAX_PLAY_EVIDENCE2 = 1e5;
var MAX_PLAY_CITATIONS2 = 100;
var MAX_PLAY_STEPS2 = 50;
var list11 = (values) => sql29.raw(values.map((v) => `'${v}'`).join(", "));
var num5 = (value) => sql29.raw(String(value));
var idShape10 = (column, prefix) => sql29.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape9 = sql29.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal9 = sql29.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var KEY_SHAPE = `^[a-z][a-z0-9_-]{0,${MAX_STEP_KEY_LENGTH2 - 1}}$`;
var keyShape = (column) => sql29.raw(`"${column}" is null or "${column}" ~ '${KEY_SHAPE}'`);
var ts9 = (name) => timestamp37(name, { withTimezone: true });
var outboundPlays2 = outboundSchema2.table("plays", {
  id: text43("id").notNull(),
  organizationId: text43("organization_id").notNull(),
  name: text43("name").notNull(),
  intent: text43("intent", { enum: PLAY_INTENTS2 }).notNull(),
  goal: text43("goal").notNull(),
  source: text43("source", { enum: PLAY_SOURCES2 }).notNull(),
  status: text43("status", { enum: PLAY_STATUSES2 }).notNull().default("proposed"),
  steps: jsonb18("steps").notNull().default(sql29`'[]'::jsonb`),
  evidenceCount: integer22("evidence_count").notNull().default(0),
  createdByMembershipId: text43("created_by_membership_id"),
  createdAt: ts9("created_at").notNull().defaultNow(),
  updatedAt: ts9("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey14({ name: "plays_pkey", columns: [t.organizationId, t.id] }),
  check24("plays_id_shape", idShape10("id", "ply")),
  check24("plays_organization_id_shape", orgShape9),
  check24("plays_organization_not_global", notGlobal9),
  check24("plays_created_by_membership_id_shape", idShape10("created_by_membership_id", "mem")),
  check24("plays_name_shape", sql29`char_length(${t.name}) between 1 and ${num5(MAX_CAMPAIGN_NAME_LENGTH2)}`),
  check24("plays_goal_shape", sql29`char_length(${t.goal}) between 1 and ${num5(MAX_DRAFT_GOAL_LENGTH2)}`),
  check24("plays_intent_known", sql29`${t.intent} in (${list11(PLAY_INTENTS2)})`),
  check24("plays_source_known", sql29`${t.source} in (${list11(PLAY_SOURCES2)})`),
  check24("plays_status_known", sql29`${t.status} in (${list11(PLAY_STATUSES2)})`),
  check24("plays_steps_shape", sql29`jsonb_typeof(${t.steps}) = 'array' and jsonb_array_length(${t.steps}) <= ${num5(MAX_PLAY_STEPS2)}`),
  check24("plays_evidence_count_range", sql29`${t.evidenceCount} between 0 and ${num5(MAX_PLAY_EVIDENCE2)}`),
  index35("plays_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc())
]);
var outboundPlayCitations2 = outboundSchema2.table("play_citations", {
  organizationId: text43("organization_id").notNull(),
  playId: text43("play_id").notNull(),
  position: smallint6("position").notNull(),
  kind: text43("kind", { enum: PLAY_CITATION_KINDS2 }).notNull(),
  callId: text43("call_id"),
  dealRecordId: text43("deal_record_id"),
  documentId: text43("document_id"),
  page: integer22("page")
}, (t) => [
  primaryKey14({
    name: "play_citations_pkey",
    columns: [t.organizationId, t.playId, t.position]
  }),
  check24("play_citations_organization_id_shape", orgShape9),
  check24("play_citations_organization_not_global", notGlobal9),
  check24("play_citations_play_id_shape", idShape10("play_id", "ply")),
  check24("play_citations_call_id_shape", idShape10("call_id", "call")),
  check24("play_citations_deal_record_id_shape", idShape10("deal_record_id", "deal")),
  check24("play_citations_document_id_shape", idShape10("document_id", "doc")),
  check24("play_citations_position_range", sql29`${t.position} between 0 and ${num5(MAX_PLAY_CITATIONS2 - 1)}`),
  check24("play_citations_kind_known", sql29`${t.kind} in (${list11(PLAY_CITATION_KINDS2)})`),
  check24("play_citations_fields_match_kind", sql29`(${t.kind} = 'moment' and ${t.callId} is not null and ${t.dealRecordId} is not null
          and ${t.documentId} is null and ${t.page} is null)
        or (${t.kind} = 'document' and ${t.documentId} is not null
          and ${t.callId} is null and ${t.dealRecordId} is null
          and (${t.page} is null or ${t.page} >= 1))`),
  foreignKey13({
    name: "play_citations_play_fk",
    columns: [t.organizationId, t.playId],
    foreignColumns: [outboundPlays2.organizationId, outboundPlays2.id]
  }).onDelete("cascade")
]);
var outboundCampaigns2 = outboundSchema2.table("campaigns", {
  id: text43("id").notNull(),
  organizationId: text43("organization_id").notNull(),
  name: text43("name").notNull(),
  goal: text43("goal").notNull(),
  state: text43("state", { enum: CAMPAIGN_STATES2 }).notNull().default("draft"),
  audience: jsonb18("audience").notNull(),
  audienceVersion: integer22("audience_version").notNull().default(0),
  sequenceVersion: integer22("sequence_version").notNull().default(0),
  previewedVersion: integer22("previewed_version"),
  previewedAt: ts9("previewed_at"),
  approvalMode: text43("approval_mode", { enum: CAMPAIGN_APPROVAL_MODES2 }).notNull().default("review"),
  language: text43("language", { enum: OUTBOUND_LANGUAGES2 }).notNull().default("en"),
  sendWindow: jsonb18("send_window").notNull(),
  windowZone: text43("window_zone", { enum: WINDOW_ZONES2 }).notNull().default("campaign"),
  dailyCap: integer22("daily_cap").notNull(),
  ownerMembershipId: text43("owner_membership_id").notNull(),
  teamId: text43("team_id"),
  playId: text43("play_id"),
  createdAt: ts9("created_at").notNull().defaultNow(),
  updatedAt: ts9("updated_at").notNull().defaultNow(),
  launchedAt: ts9("launched_at"),
  archivedAt: ts9("archived_at")
}, (t) => [
  primaryKey14({ name: "campaigns_pkey", columns: [t.organizationId, t.id] }),
  check24("campaigns_id_shape", idShape10("id", "cpg")),
  check24("campaigns_organization_id_shape", orgShape9),
  check24("campaigns_organization_not_global", notGlobal9),
  check24("campaigns_owner_membership_id_shape", idShape10("owner_membership_id", "mem")),
  check24("campaigns_team_id_shape", idShape10("team_id", "team")),
  check24("campaigns_play_id_shape", idShape10("play_id", "ply")),
  check24("campaigns_name_shape", sql29`char_length(${t.name}) between 1 and ${num5(MAX_CAMPAIGN_NAME_LENGTH2)}`),
  check24("campaigns_goal_shape", sql29`char_length(${t.goal}) between 1 and ${num5(MAX_DRAFT_GOAL_LENGTH2)}`),
  check24("campaigns_state_known", sql29`${t.state} in (${list11(CAMPAIGN_STATES2)})`),
  check24("campaigns_approval_mode_known", sql29`${t.approvalMode} in (${list11(CAMPAIGN_APPROVAL_MODES2)})`),
  check24("campaigns_language_known", sql29`${t.language} in (${list11(OUTBOUND_LANGUAGES2)})`),
  check24("campaigns_window_zone_known", sql29`${t.windowZone} in (${list11(WINDOW_ZONES2)})`),
  check24("campaigns_audience_shape", sql29`jsonb_typeof(${t.audience}) = 'object'`),
  check24("campaigns_versions_range", sql29`${t.audienceVersion} between 0 and ${num5(MAX_CAMPAIGN_VERSION2)}
        and ${t.sequenceVersion} between 0 and ${num5(MAX_CAMPAIGN_VERSION2)}
        and (${t.previewedVersion} is null
          or ${t.previewedVersion} between 0 and ${num5(MAX_CAMPAIGN_VERSION2)})`),
  check24("campaigns_send_window_shape", sql29`jsonb_typeof(${t.sendWindow}) = 'object'
        and (${t.sendWindow}->>'startMinute')::int between 0 and 1439
        and (${t.sendWindow}->>'endMinute')::int between 1 and 1440
        and (${t.sendWindow}->>'endMinute')::int > (${t.sendWindow}->>'startMinute')::int`),
  check24("campaigns_daily_cap_range", sql29`${t.dailyCap} between 1 and ${num5(MAX_DAILY_CAP2)}`),
  check24("campaigns_archived_matches_state", sql29`(${t.state} = 'archived') = (${t.archivedAt} is not null)`),
  foreignKey13({
    name: "campaigns_play_fk",
    columns: [t.organizationId, t.playId],
    foreignColumns: [outboundPlays2.organizationId, outboundPlays2.id]
  }),
  index35("campaigns_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index35("campaigns_state_idx").on(t.organizationId, t.state, t.createdAt.desc(), t.id.desc())
]);
var outboundSequences2 = outboundSchema2.table("sequences", {
  organizationId: text43("organization_id").notNull(),
  campaignId: text43("campaign_id").notNull(),
  version: integer22("version").notNull(),
  createdByMembershipId: text43("created_by_membership_id"),
  createdAt: ts9("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey14({
    name: "sequences_pkey",
    columns: [t.organizationId, t.campaignId, t.version]
  }),
  check24("sequences_organization_id_shape", orgShape9),
  check24("sequences_organization_not_global", notGlobal9),
  check24("sequences_campaign_id_shape", idShape10("campaign_id", "cpg")),
  check24("sequences_created_by_membership_id_shape", idShape10("created_by_membership_id", "mem")),
  check24("sequences_version_range", sql29`${t.version} between 1 and ${num5(MAX_CAMPAIGN_VERSION2)}`),
  foreignKey13({
    name: "sequences_campaign_fk",
    columns: [t.organizationId, t.campaignId],
    foreignColumns: [outboundCampaigns2.organizationId, outboundCampaigns2.id]
  }).onDelete("cascade")
]);
var outboundSteps2 = outboundSchema2.table("steps", {
  organizationId: text43("organization_id").notNull(),
  campaignId: text43("campaign_id").notNull(),
  version: integer22("version").notNull(),
  position: smallint6("position").notNull(),
  key: text43("key").notNull(),
  kind: text43("kind", { enum: STEP_KINDS2 }).notNull(),
  goal: text43("goal"),
  nextKey: text43("next_key"),
  waitHours: integer22("wait_hours"),
  task: text43("task", { enum: STEP_TASKS2 }),
  instruction: text43("instruction"),
  dueInHours: integer22("due_in_hours"),
  arms: jsonb18("arms"),
  defaultNextKey: text43("default_next_key")
}, (t) => [
  primaryKey14({
    name: "steps_pkey",
    columns: [t.organizationId, t.campaignId, t.version, t.position]
  }),
  check24("steps_organization_id_shape", orgShape9),
  check24("steps_organization_not_global", notGlobal9),
  check24("steps_campaign_id_shape", idShape10("campaign_id", "cpg")),
  check24("steps_key_shape", sql29.raw(`"key" ~ '${KEY_SHAPE}'`)),
  check24("steps_next_key_shape", keyShape("next_key")),
  check24("steps_default_next_key_shape", keyShape("default_next_key")),
  check24("steps_position_range", sql29`${t.position} between 0 and ${num5(MAX_SEQUENCE_STEPS2 - 1)}`),
  check24("steps_kind_known", sql29`${t.kind} in (${list11(STEP_KINDS2)})`),
  check24("steps_fields_match_kind", sql29`(${t.kind} = 'email'
          and ${t.goal} is not null and char_length(${t.goal}) between 1 and ${num5(MAX_DRAFT_GOAL_LENGTH2)}
          and ${t.nextKey} is not null
          and ${t.waitHours} is null and ${t.task} is null and ${t.instruction} is null
          and ${t.dueInHours} is null and ${t.arms} is null and ${t.defaultNextKey} is null)
        or (${t.kind} = 'wait'
          and ${t.waitHours} is not null and ${t.waitHours} between 1 and ${num5(MAX_STEP_HOURS2)}
          and ${t.nextKey} is not null
          and ${t.goal} is null and ${t.task} is null and ${t.instruction} is null
          and ${t.dueInHours} is null and ${t.arms} is null and ${t.defaultNextKey} is null)
        or (${t.kind} = 'branch'
          and jsonb_typeof(${t.arms}) = 'array'
          and jsonb_array_length(${t.arms}) between 1 and ${num5(MAX_BRANCH_ARMS2)}
          and ${t.defaultNextKey} is not null
          and ${t.goal} is null and ${t.nextKey} is null and ${t.waitHours} is null
          and ${t.task} is null and ${t.instruction} is null and ${t.dueInHours} is null)
        or (${t.kind} = 'rep_task'
          and ${t.task} in (${list11(STEP_TASKS2)})
          and ${t.instruction} is not null and char_length(${t.instruction}) between 1 and ${num5(MAX_TASK_INSTRUCTION_LENGTH2)}
          and ${t.dueInHours} is not null and ${t.dueInHours} between 1 and ${num5(MAX_STEP_HOURS2)}
          and ${t.nextKey} is not null
          and ${t.goal} is null and ${t.waitHours} is null
          and ${t.arms} is null and ${t.defaultNextKey} is null)
        or (${t.kind} = 'end'
          and ${t.goal} is null and ${t.nextKey} is null and ${t.waitHours} is null
          and ${t.task} is null and ${t.instruction} is null and ${t.dueInHours} is null
          and ${t.arms} is null and ${t.defaultNextKey} is null)`),
  unique27("steps_key_key").on(t.organizationId, t.campaignId, t.version, t.key),
  foreignKey13({
    name: "steps_sequence_fk",
    columns: [t.organizationId, t.campaignId, t.version],
    foreignColumns: [
      outboundSequences2.organizationId,
      outboundSequences2.campaignId,
      outboundSequences2.version
    ]
  }).onDelete("cascade")
]);
var outboundVariants2 = outboundSchema2.table("variants", {
  organizationId: text43("organization_id").notNull(),
  campaignId: text43("campaign_id").notNull(),
  version: integer22("version").notNull(),
  stepKey: text43("step_key").notNull(),
  key: text43("key").notNull(),
  position: smallint6("position").notNull(),
  label: text43("label").notNull(),
  angle: text43("angle").notNull(),
  weight: smallint6("weight").notNull(),
  promotedSource: text43("promoted_source", { enum: PROMOTION_SOURCES2 }),
  promotedByMembershipId: text43("promoted_by_membership_id"),
  promotedAt: ts9("promoted_at")
}, (t) => [
  primaryKey14({
    name: "variants_pkey",
    columns: [t.organizationId, t.campaignId, t.version, t.stepKey, t.key]
  }),
  check24("variants_organization_id_shape", orgShape9),
  check24("variants_organization_not_global", notGlobal9),
  check24("variants_campaign_id_shape", idShape10("campaign_id", "cpg")),
  check24("variants_step_key_shape", sql29.raw(`"step_key" ~ '${KEY_SHAPE}'`)),
  check24("variants_key_shape", sql29.raw(`"key" ~ '${KEY_SHAPE}'`)),
  check24("variants_promoted_by_membership_id_shape", idShape10("promoted_by_membership_id", "mem")),
  check24("variants_position_range", sql29`${t.position} between 0 and 3`),
  check24("variants_label_shape", sql29`char_length(${t.label}) between 1 and ${num5(MAX_VARIANT_LABEL_LENGTH2)}`),
  check24("variants_angle_shape", sql29`char_length(${t.angle}) between 1 and ${num5(MAX_VARIANT_ANGLE_LENGTH2)}`),
  check24("variants_weight_range", sql29`${t.weight} between 1 and ${num5(MAX_VARIANT_WEIGHT2)}`),
  check24("variants_promotion_matches", sql29`(${t.promotedSource} is null) = (${t.promotedAt} is null)
        and (${t.promotedSource} is null or ${t.promotedSource} in (${list11(PROMOTION_SOURCES2)}))
        and ((${t.promotedSource} = 'manual') = (${t.promotedByMembershipId} is not null))`),
  uniqueIndex12("variants_position_key").on(t.organizationId, t.campaignId, t.version, t.stepKey, t.position),
  uniqueIndex12("variants_promoted_key").on(t.organizationId, t.campaignId, t.version, t.stepKey).where(sql29`${t.promotedSource} is not null`),
  foreignKey13({
    name: "variants_step_fk",
    columns: [t.organizationId, t.campaignId, t.version, t.stepKey],
    foreignColumns: [
      outboundSteps2.organizationId,
      outboundSteps2.campaignId,
      outboundSteps2.version,
      outboundSteps2.key
    ]
  }).onDelete("cascade")
]);
var outboundEnrollments2 = outboundSchema2.table("enrollments", {
  id: text43("id").notNull(),
  organizationId: text43("organization_id").notNull(),
  campaignId: text43("campaign_id").notNull(),
  prospectId: text43("prospect_id").notNull(),
  state: text43("state", { enum: ENROLLMENT_STATES2 }).notNull().default("active"),
  stopReason: text43("stop_reason", { enum: ENROLLMENT_STOP_REASONS2 }),
  currentStepKey: text43("current_step_key"),
  currentStep: smallint6("current_step"),
  attemptEpoch: integer22("attempt_epoch").notNull().default(0),
  nextDueAt: ts9("next_due_at"),
  enrolledAt: ts9("enrolled_at").notNull().defaultNow(),
  stoppedAt: ts9("stopped_at"),
  completedAt: ts9("completed_at"),
  updatedAt: ts9("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey14({ name: "enrollments_pkey", columns: [t.organizationId, t.id] }),
  check24("enrollments_id_shape", idShape10("id", "enr")),
  check24("enrollments_organization_id_shape", orgShape9),
  check24("enrollments_organization_not_global", notGlobal9),
  check24("enrollments_campaign_id_shape", idShape10("campaign_id", "cpg")),
  check24("enrollments_prospect_id_shape", idShape10("prospect_id", "prs")),
  check24("enrollments_current_step_key_shape", keyShape("current_step_key")),
  check24("enrollments_state_known", sql29`${t.state} in (${list11(ENROLLMENT_STATES2)})`),
  check24("enrollments_stop_matches_state", sql29`(${t.state} = 'stopped') = (${t.stopReason} is not null)
        and (${t.state} = 'stopped') = (${t.stoppedAt} is not null)
        and (${t.stopReason} is null or ${t.stopReason} in (${list11(ENROLLMENT_STOP_REASONS2)}))`),
  check24("enrollments_completed_matches_state", sql29`(${t.state} = 'completed') = (${t.completedAt} is not null)`),
  check24("enrollments_step_matches_state", sql29`(${t.currentStepKey} is null) = (${t.currentStep} is null)
        and (${t.state} <> 'active' or ${t.currentStepKey} is not null)
        and (${t.currentStep} is null or ${t.currentStep} between 0 and ${num5(MAX_SEQUENCE_STEPS2 - 1)})`),
  check24("enrollments_due_only_when_active", sql29`${t.state} = 'active' or ${t.nextDueAt} is null`),
  check24("enrollments_attempt_epoch_range", sql29`${t.attemptEpoch} between 0 and ${num5(MAX_ATTEMPT_EPOCH2)}`),
  uniqueIndex12("enrollments_prospect_key").on(t.organizationId, t.campaignId, t.prospectId),
  index35("enrollments_due_idx").on(t.organizationId, t.nextDueAt).where(sql29`${t.state} = 'active' and ${t.nextDueAt} is not null`),
  index35("enrollments_list_idx").on(t.organizationId, t.campaignId, t.enrolledAt.desc(), t.id.desc()),
  index35("enrollments_prospect_idx").on(t.organizationId, t.prospectId),
  foreignKey13({
    name: "enrollments_campaign_fk",
    columns: [t.organizationId, t.campaignId],
    foreignColumns: [outboundCampaigns2.organizationId, outboundCampaigns2.id]
  })
]);
var outboundEnrollmentEvents2 = outboundSchema2.table("enrollment_events", {
  id: text43("id").notNull(),
  organizationId: text43("organization_id").notNull(),
  enrollmentId: text43("enrollment_id").notNull(),
  kind: text43("kind", { enum: ENROLLMENT_EVENT_KINDS2 }).notNull(),
  stepKey: text43("step_key"),
  variantKey: text43("variant_key"),
  sendId: text43("send_id"),
  stopReason: text43("stop_reason", { enum: ENROLLMENT_STOP_REASONS2 }),
  actorMembershipId: text43("actor_membership_id"),
  occurredAt: ts9("occurred_at").notNull().defaultNow()
}, (t) => [
  primaryKey14({ name: "enrollment_events_pkey", columns: [t.organizationId, t.id] }),
  check24("enrollment_events_id_shape", idShape10("id", "eev")),
  check24("enrollment_events_organization_id_shape", orgShape9),
  check24("enrollment_events_organization_not_global", notGlobal9),
  check24("enrollment_events_enrollment_id_shape", idShape10("enrollment_id", "enr")),
  check24("enrollment_events_step_key_shape", keyShape("step_key")),
  check24("enrollment_events_variant_key_shape", keyShape("variant_key")),
  check24("enrollment_events_send_id_shape", idShape10("send_id", "snd")),
  check24("enrollment_events_actor_membership_id_shape", idShape10("actor_membership_id", "mem")),
  check24("enrollment_events_kind_known", sql29`${t.kind} in (${list11(ENROLLMENT_EVENT_KINDS2)})`),
  check24("enrollment_events_stop_reason_matches_kind", sql29`(${t.kind} = 'stopped') = (${t.stopReason} is not null)
        and (${t.stopReason} is null or ${t.stopReason} in (${list11(ENROLLMENT_STOP_REASONS2)}))`),
  index35("enrollment_events_enrollment_idx").on(t.organizationId, t.enrollmentId, t.occurredAt, t.id),
  foreignKey13({
    name: "enrollment_events_enrollment_fk",
    columns: [t.organizationId, t.enrollmentId],
    foreignColumns: [outboundEnrollments2.organizationId, outboundEnrollments2.id]
  }).onDelete("cascade")
]);
var outboundSendDecisions2 = outboundSchema2.table("send_decisions", {
  id: text43("id").notNull(),
  organizationId: text43("organization_id").notNull(),
  campaignId: text43("campaign_id").notNull(),
  enrollmentId: text43("enrollment_id").notNull(),
  prospectId: text43("prospect_id").notNull(),
  step: smallint6("step").notNull(),
  attemptEpoch: integer22("attempt_epoch").notNull().default(0),
  mailboxId: text43("mailbox_id"),
  state: text43("state", { enum: SEND_STATES2 }).notNull(),
  reason: text43("reason", { enum: SEND_REFUSAL_REASONS2 }),
  checks: jsonb18("checks").notNull().default(sql29`'[]'::jsonb`),
  retryAt: ts9("retry_at"),
  decidedAt: ts9("decided_at").notNull().defaultNow(),
  sentAt: ts9("sent_at")
}, (t) => [
  primaryKey14({ name: "send_decisions_pkey", columns: [t.organizationId, t.id] }),
  check24("send_decisions_id_shape", idShape10("id", "snd")),
  check24("send_decisions_organization_id_shape", orgShape9),
  check24("send_decisions_organization_not_global", notGlobal9),
  check24("send_decisions_campaign_id_shape", idShape10("campaign_id", "cpg")),
  check24("send_decisions_enrollment_id_shape", idShape10("enrollment_id", "enr")),
  check24("send_decisions_prospect_id_shape", idShape10("prospect_id", "prs")),
  check24("send_decisions_mailbox_id_shape", idShape10("mailbox_id", "mbx")),
  check24("send_decisions_step_range", sql29`${t.step} between 0 and ${num5(MAX_SEQUENCE_STEP2)}`),
  check24("send_decisions_attempt_epoch_range", sql29`${t.attemptEpoch} between 0 and ${num5(MAX_ATTEMPT_EPOCH2)}`),
  check24("send_decisions_state_known", sql29`${t.state} in (${list11(SEND_STATES2)})`),
  check24("send_decisions_reason_matches_state", sql29`(${t.state} in ('refused', 'deferred')) = (${t.reason} is not null)
        and (${t.reason} is null or ${t.reason} in (${list11(SEND_REFUSAL_REASONS2)}))
        and (${t.state} <> 'refused' or ${t.reason} not in (${list11(SEND_DEFERRING_REASONS2)}))
        and (${t.state} <> 'deferred' or ${t.reason} in (${list11(SEND_DEFERRING_REASONS2)}))`),
  check24("send_decisions_retry_matches_state", sql29`(${t.state} = 'deferred') = (${t.retryAt} is not null)`),
  check24("send_decisions_mailbox_matches_state", sql29`${t.state} not in ('sending', 'sent', 'failed') or ${t.mailboxId} is not null`),
  check24("send_decisions_sent_matches_state", sql29`(${t.state} = 'sent') = (${t.sentAt} is not null)`),
  check24("send_decisions_checks_shape", sql29`jsonb_typeof(${t.checks}) = 'array'
        and jsonb_array_length(${t.checks}) <= ${num5(SEND_CHECKS2.length)}`),
  uniqueIndex12("send_decisions_send_key").on(t.organizationId, t.enrollmentId, t.step, t.attemptEpoch),
  index35("send_decisions_campaign_idx").on(t.organizationId, t.campaignId, t.decidedAt.desc(), t.id.desc()),
  index35("send_decisions_retry_idx").on(t.organizationId, t.retryAt).where(sql29`${t.state} = 'deferred'`),
  foreignKey13({
    name: "send_decisions_campaign_fk",
    columns: [t.organizationId, t.campaignId],
    foreignColumns: [outboundCampaigns2.organizationId, outboundCampaigns2.id]
  }),
  foreignKey13({
    name: "send_decisions_enrollment_fk",
    columns: [t.organizationId, t.enrollmentId],
    foreignColumns: [outboundEnrollments2.organizationId, outboundEnrollments2.id]
  })
]);
var outboundWorkHints2 = outboundSchema2.table("work_hints", {
  kind: text43("kind", { enum: OUTBOUND_WORK_KINDS2 }).notNull(),
  organizationId: text43("organization_id").notNull(),
  dueAt: ts9("due_at").notNull()
}, (t) => [
  primaryKey14({ name: "work_hints_pkey", columns: [t.kind, t.organizationId] }),
  check24("work_hints_kind_known", sql29`${t.kind} in (${list11(OUTBOUND_WORK_KINDS2)})`),
  check24("work_hints_organization_id_shape", orgShape9),
  index35("work_hints_due_idx").on(t.kind, t.dueAt, t.organizationId)
]);
// src/schema/outbound-enrichment.ts
import { sql as sql30 } from "drizzle-orm";
import {
  bigint as bigint9,
  boolean as boolean13,
  check as check25,
  customType as customType9,
  date as date5,
  foreignKey as foreignKey14,
  index as index36,
  integer as integer23,
  jsonb as jsonb19,
  primaryKey as primaryKey15,
  smallint as smallint7,
  text as text44,
  timestamp as timestamp38,
  uniqueIndex as uniqueIndex13,
  uuid as uuid23
} from "drizzle-orm/pg-core";
var FIELD_GROUPS2 = ["person", "company", "email_verification"];
var RUN_STATUSES2 = ["queued", "running", "complete", "incomplete", "stopped"];
var FINAL_RUN_STATUSES2 = ["complete", "incomplete", "stopped"];
var STOP_REASONS2 = ["monthly_budget", "run_ceiling"];
var ATTEMPT_OUTCOMES2 = [
  "filled",
  "no_result",
  "failed",
  "skipped_disabled",
  "skipped_circuit_open",
  "skipped_budget"
];
var SKIPPED_ATTEMPT_OUTCOMES2 = [
  "skipped_disabled",
  "skipped_circuit_open",
  "skipped_budget"
];
var ATTEMPT_FAILURES2 = [
  "timeout",
  "rate_limited",
  "provider_error",
  "invalid_response",
  "key_rejected"
];
var SIGNAL_KINDS2 = [
  "funding",
  "hiring_spike",
  "job_change",
  "technology_change",
  "website_visit",
  "note"
];
var SIGNAL_SOURCE_TYPES2 = ["provider", "webhook", "manual"];
var FIT_FIELDS2 = [
  "jobTitle",
  "industry",
  "employeeCount",
  "region",
  "technologies"
];
var FIT_OPERATORS2 = ["one_of", "contains_any", "between"];
var MAX_ATTEMPTS_PER_RUN2 = 150;
var MAX_RUN_FIELDS2 = 11;
var MAX_PROVIDERS2 = 50;
var MAX_PROVIDER_KEY_LENGTH2 = 32;
var MAX_MICRO_DOLLARS2 = 1000000000000;
var MAX_ATTEMPT_DURATION_MS2 = 600000;
var MAX_RESERVATION_HOLD_KEY_LENGTH2 = 256;
var MAX_RUN_REQUEST_ID_LENGTH2 = 256;
var MAX_SIGNAL_DETAIL_BYTES2 = 4096;
var MAX_FIT_CONDITION_BYTES2 = 4096;
var MAX_FIT_VALUES2 = 20;
var MAX_FIT_NAME_LENGTH2 = 100;
var MAX_FIT_WEIGHT2 = 100;
var MAX_CREDENTIAL_CIPHERTEXT_BYTES2 = 2048;
var MAX_CREDENTIAL_KEY_ID_LENGTH2 = 128;
var list12 = (values) => sql30.raw(values.map((v) => `'${v}'`).join(", "));
var num6 = (value) => sql30.raw(String(value));
var idShape11 = (column, prefix) => sql30.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape10 = sql30.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal10 = sql30.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts10 = (name) => timestamp38(name, { withTimezone: true });
var bytes8 = customType9({
  dataType: () => "bytea"
});
var PROVIDER_KEY = `^[a-z][a-z0-9_]{0,${MAX_PROVIDER_KEY_LENGTH2 - 1}}$`;
var EVENT_ID = "^[A-Za-z0-9_-]{8,100}$";
var enrichmentRuns2 = outboundSchema2.table("enrichment_runs", {
  id: text44("id").notNull(),
  organizationId: text44("organization_id").notNull(),
  runSetId: text44("run_set_id"),
  prospectId: text44("prospect_id").notNull(),
  requestId: text44("request_id").notNull(),
  status: text44("status", { enum: RUN_STATUSES2 }).notNull().default("queued"),
  stopReason: text44("stop_reason", { enum: STOP_REASONS2 }),
  groups: text44("groups").array().notNull(),
  fields: jsonb19("fields").notNull().default(sql30`'[]'::jsonb`),
  emailVerification: jsonb19("email_verification"),
  costMicros: bigint9("cost_micros", { mode: "number" }).notNull().default(0),
  ceilingMicros: bigint9("ceiling_micros", { mode: "number" }).notNull(),
  requestedByUserId: text44("requested_by_user_id"),
  createdAt: ts10("created_at").notNull().defaultNow(),
  startedAt: ts10("started_at"),
  completedAt: ts10("completed_at"),
  leaseToken: uuid23("lease_token"),
  heartbeatAt: ts10("heartbeat_at")
}, (t) => [
  primaryKey15({ name: "enrichment_runs_pkey", columns: [t.organizationId, t.id] }),
  check25("enrichment_runs_id_shape", idShape11("id", "erun")),
  check25("enrichment_runs_organization_id_shape", orgShape10),
  check25("enrichment_runs_organization_not_global", notGlobal10),
  check25("enrichment_runs_run_set_id_shape", idShape11("run_set_id", "erset")),
  check25("enrichment_runs_prospect_id_shape", idShape11("prospect_id", "prs")),
  check25("enrichment_runs_requested_by_user_id_shape", idShape11("requested_by_user_id", "usr")),
  check25("enrichment_runs_request_id_shape", sql30`char_length(${t.requestId}) between 1 and ${num6(MAX_RUN_REQUEST_ID_LENGTH2)}`),
  check25("enrichment_runs_status_known", sql30`${t.status} in (${list12(RUN_STATUSES2)})`),
  check25("enrichment_runs_stop_reason_matches_status", sql30`(${t.status} = 'stopped') = (${t.stopReason} is not null)
        and (${t.stopReason} is null or ${t.stopReason} in (${list12(STOP_REASONS2)}))`),
  check25("enrichment_runs_times_match_status", sql30`(${t.status} in (${list12(FINAL_RUN_STATUSES2)})) = (${t.completedAt} is not null)
        and (${t.status} <> 'queued' or ${t.startedAt} is null)`),
  check25("enrichment_runs_groups_shape", sql30`cardinality(${t.groups}) between 1 and ${num6(FIELD_GROUPS2.length)}
        and ${t.groups} <@ array[${list12(FIELD_GROUPS2)}]::text[]
        and (cardinality(${t.groups}) = 1
          or (${t.groups}[1] <> ${t.groups}[2]
            and (cardinality(${t.groups}) = 2
              or (${t.groups}[3] <> ${t.groups}[1] and ${t.groups}[3] <> ${t.groups}[2]))))`),
  check25("enrichment_runs_fields_shape", sql30`jsonb_typeof(${t.fields}) = 'array' and jsonb_array_length(${t.fields}) <= ${num6(MAX_RUN_FIELDS2)}`),
  check25("enrichment_runs_email_verification_shape", sql30`${t.emailVerification} is null or jsonb_typeof(${t.emailVerification}) = 'object'`),
  check25("enrichment_runs_cost_range", sql30`${t.costMicros} between 0 and ${num6(MAX_MICRO_DOLLARS2)}
        and ${t.ceilingMicros} between 0 and ${num6(MAX_MICRO_DOLLARS2)}`),
  uniqueIndex13("enrichment_runs_request_key").on(t.organizationId, t.prospectId, t.requestId),
  index36("enrichment_runs_request_idx").on(t.organizationId, t.requestId),
  index36("enrichment_runs_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index36("enrichment_runs_prospect_idx").on(t.organizationId, t.prospectId, t.createdAt.desc(), t.id.desc()),
  index36("enrichment_runs_run_set_idx").on(t.organizationId, t.runSetId, t.createdAt.desc(), t.id.desc()).where(sql30`${t.runSetId} is not null`),
  index36("enrichment_runs_status_idx").on(t.organizationId, t.status, t.createdAt.desc(), t.id.desc())
]);
var enrichmentAttempts2 = outboundSchema2.table("enrichment_attempts", {
  organizationId: text44("organization_id").notNull(),
  runId: text44("run_id").notNull(),
  position: smallint7("position").notNull(),
  provider: text44("provider").notNull(),
  fieldGroup: text44("field_group", { enum: FIELD_GROUPS2 }).notNull(),
  outcome: text44("outcome", { enum: ATTEMPT_OUTCOMES2 }).notNull(),
  failure: text44("failure", { enum: ATTEMPT_FAILURES2 }),
  costMicros: bigint9("cost_micros", { mode: "number" }).notNull().default(0),
  startedAt: ts10("started_at").notNull(),
  durationMs: integer23("duration_ms").notNull()
}, (t) => [
  primaryKey15({
    name: "enrichment_attempts_pkey",
    columns: [t.organizationId, t.runId, t.position]
  }),
  check25("enrichment_attempts_organization_id_shape", orgShape10),
  check25("enrichment_attempts_organization_not_global", notGlobal10),
  check25("enrichment_attempts_run_id_shape", idShape11("run_id", "erun")),
  check25("enrichment_attempts_position_range", sql30`${t.position} between 0 and ${num6(MAX_ATTEMPTS_PER_RUN2 - 1)}`),
  check25("enrichment_attempts_provider_shape", sql30`${t.provider} ~ ${sql30.raw(`'${PROVIDER_KEY}'`)}`),
  check25("enrichment_attempts_field_group_known", sql30`${t.fieldGroup} in (${list12(FIELD_GROUPS2)})`),
  check25("enrichment_attempts_outcome_known", sql30`${t.outcome} in (${list12(ATTEMPT_OUTCOMES2)})`),
  check25("enrichment_attempts_failure_matches_outcome", sql30`(${t.outcome} = 'failed') = (${t.failure} is not null)
        and (${t.failure} is null or ${t.failure} in (${list12(ATTEMPT_FAILURES2)}))`),
  check25("enrichment_attempts_skipped_costs_nothing", sql30`${t.outcome} not in (${list12(SKIPPED_ATTEMPT_OUTCOMES2)}) or ${t.costMicros} = 0`),
  check25("enrichment_attempts_cost_range", sql30`${t.costMicros} between 0 and ${num6(MAX_MICRO_DOLLARS2)}`),
  check25("enrichment_attempts_duration_range", sql30`${t.durationMs} between 0 and ${num6(MAX_ATTEMPT_DURATION_MS2)}`),
  foreignKey14({
    name: "enrichment_attempts_run_fk",
    columns: [t.organizationId, t.runId],
    foreignColumns: [enrichmentRuns2.organizationId, enrichmentRuns2.id]
  }).onDelete("cascade")
]);
var signals2 = outboundSchema2.table("signals", {
  id: text44("id").notNull(),
  organizationId: text44("organization_id").notNull(),
  prospectId: text44("prospect_id").notNull(),
  kind: text44("kind", { enum: SIGNAL_KINDS2 }).notNull(),
  sourceType: text44("source_type", { enum: SIGNAL_SOURCE_TYPES2 }).notNull(),
  sourceProvider: text44("source_provider"),
  sourceUserId: text44("source_user_id"),
  eventId: text44("event_id"),
  observedAt: ts10("observed_at").notNull(),
  recordedAt: ts10("recorded_at").notNull().defaultNow(),
  expiresAt: ts10("expires_at").notNull(),
  detail: jsonb19("detail").notNull()
}, (t) => [
  primaryKey15({ name: "signals_pkey", columns: [t.organizationId, t.id] }),
  check25("signals_id_shape", idShape11("id", "sig")),
  check25("signals_organization_id_shape", orgShape10),
  check25("signals_organization_not_global", notGlobal10),
  check25("signals_prospect_id_shape", idShape11("prospect_id", "prs")),
  check25("signals_source_user_id_shape", idShape11("source_user_id", "usr")),
  check25("signals_kind_known", sql30`${t.kind} in (${list12(SIGNAL_KINDS2)})`),
  check25("signals_source_type_known", sql30`${t.sourceType} in (${list12(SIGNAL_SOURCE_TYPES2)})`),
  check25("signals_source_provider_shape", sql30`${t.sourceProvider} is null or ${t.sourceProvider} ~ ${sql30.raw(`'${PROVIDER_KEY}'`)}`),
  check25("signals_event_id_shape", sql30`${t.eventId} is null or ${t.eventId} ~ ${sql30.raw(`'${EVENT_ID}'`)}`),
  check25("signals_source_matches_type", sql30`case ${t.sourceType}
        when 'provider' then ${t.sourceProvider} is not null and ${t.sourceUserId} is null and ${t.eventId} is null
        when 'webhook' then ${t.eventId} is not null and ${t.sourceProvider} is null and ${t.sourceUserId} is null
        else ${t.sourceUserId} is not null and ${t.sourceProvider} is null and ${t.eventId} is null
      end`),
  check25("signals_expires_after_observed", sql30`${t.expiresAt} >= ${t.observedAt}`),
  check25("signals_detail_shape", sql30`jsonb_typeof(${t.detail}) = 'object'
        and octet_length(${t.detail}::text) <= ${num6(MAX_SIGNAL_DETAIL_BYTES2)}`),
  uniqueIndex13("signals_event_key").on(t.organizationId, t.eventId).where(sql30`${t.eventId} is not null`),
  index36("signals_prospect_idx").on(t.organizationId, t.prospectId, t.observedAt.desc(), t.id.desc()),
  index36("signals_prospect_kind_idx").on(t.organizationId, t.prospectId, t.kind, t.observedAt.desc(), t.id.desc())
]);
var fitCriteria2 = outboundSchema2.table("fit_criteria", {
  id: text44("id").notNull(),
  organizationId: text44("organization_id").notNull(),
  name: text44("name").notNull(),
  field: text44("field", { enum: FIT_FIELDS2 }).notNull(),
  condition: jsonb19("condition").notNull(),
  weight: smallint7("weight").notNull(),
  enabled: boolean13("enabled").notNull().default(true),
  createdAt: ts10("created_at").notNull().defaultNow(),
  updatedAt: ts10("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey15({ name: "fit_criteria_pkey", columns: [t.organizationId, t.id] }),
  check25("fit_criteria_id_shape", idShape11("id", "fcr")),
  check25("fit_criteria_organization_id_shape", orgShape10),
  check25("fit_criteria_organization_not_global", notGlobal10),
  check25("fit_criteria_name_shape", sql30`char_length(${t.name}) between 1 and ${num6(MAX_FIT_NAME_LENGTH2)}`),
  check25("fit_criteria_field_known", sql30`${t.field} in (${list12(FIT_FIELDS2)})`),
  check25("fit_criteria_weight_range", sql30`${t.weight} between 1 and ${num6(MAX_FIT_WEIGHT2)}`),
  check25("fit_criteria_condition_shape", sql30`jsonb_typeof(${t.condition}) = 'object'
        and octet_length(${t.condition}::text) <= ${num6(MAX_FIT_CONDITION_BYTES2)}
        and coalesce(${t.condition}->>'operator', '') in (${list12(FIT_OPERATORS2)})
        and ((${t.field} = 'employeeCount') = (${t.condition}->>'operator' = 'between'))
        and case when ${t.condition}->>'operator' = 'between' then
          coalesce(jsonb_typeof(${t.condition}->'min'), 'null') in ('number', 'null')
          and coalesce(jsonb_typeof(${t.condition}->'max'), 'null') in ('number', 'null')
          and (coalesce(jsonb_typeof(${t.condition}->'min'), 'null') = 'number'
            or coalesce(jsonb_typeof(${t.condition}->'max'), 'null') = 'number')
          and case when jsonb_typeof(${t.condition}->'min') = 'number'
              and jsonb_typeof(${t.condition}->'max') = 'number'
            then (${t.condition}->>'min')::numeric <= (${t.condition}->>'max')::numeric
            else true end
        else case when jsonb_typeof(${t.condition}->'values') = 'array'
          then jsonb_array_length(${t.condition}->'values') between 1 and ${num6(MAX_FIT_VALUES2)}
          else false end
        end`),
  uniqueIndex13("fit_criteria_name_key").on(t.organizationId, sql30`lower(${t.name})`),
  index36("fit_criteria_list_idx").on(t.organizationId, t.createdAt, t.id)
]);
var providerSettings2 = outboundSchema2.table("provider_settings", {
  organizationId: text44("organization_id").notNull(),
  provider: text44("provider").notNull(),
  enabled: boolean13("enabled").notNull().default(true),
  credentialCiphertext: bytes8("credential_ciphertext"),
  credentialKeyId: text44("credential_key_id"),
  credentialUpdatedAt: ts10("credential_updated_at"),
  personPosition: smallint7("person_position"),
  companyPosition: smallint7("company_position"),
  emailVerificationPosition: smallint7("email_verification_position"),
  updatedAt: ts10("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey15({ name: "provider_settings_pkey", columns: [t.organizationId, t.provider] }),
  check25("provider_settings_organization_id_shape", orgShape10),
  check25("provider_settings_organization_not_global", notGlobal10),
  check25("provider_settings_provider_shape", sql30`${t.provider} ~ ${sql30.raw(`'${PROVIDER_KEY}'`)}`),
  check25("provider_settings_credential_shape", sql30`(${t.credentialCiphertext} is null or octet_length(${t.credentialCiphertext}) between 1 and ${num6(MAX_CREDENTIAL_CIPHERTEXT_BYTES2)})
        and (${t.credentialKeyId} is null or char_length(${t.credentialKeyId}) between 1 and ${num6(MAX_CREDENTIAL_KEY_ID_LENGTH2)})
        and (${t.credentialCiphertext} is null) = (${t.credentialKeyId} is null)
        and (${t.credentialCiphertext} is null) = (${t.credentialUpdatedAt} is null)`),
  check25("provider_settings_positions_range", sql30`(${t.personPosition} is null or ${t.personPosition} between 0 and ${num6(MAX_PROVIDERS2 - 1)})
        and (${t.companyPosition} is null or ${t.companyPosition} between 0 and ${num6(MAX_PROVIDERS2 - 1)})
        and (${t.emailVerificationPosition} is null or ${t.emailVerificationPosition} between 0 and ${num6(MAX_PROVIDERS2 - 1)})`)
]);
var enrichmentSpend2 = outboundSchema2.table("enrichment_spend", {
  organizationId: text44("organization_id").notNull(),
  month: date5("month", { mode: "string" }).notNull(),
  provider: text44("provider").notNull(),
  costMicros: bigint9("cost_micros", { mode: "number" }).notNull().default(0),
  calls: bigint9("calls", { mode: "number" }).notNull().default(0),
  updatedAt: ts10("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey15({
    name: "enrichment_spend_pkey",
    columns: [t.organizationId, t.month, t.provider]
  }),
  check25("enrichment_spend_organization_id_shape", orgShape10),
  check25("enrichment_spend_organization_not_global", notGlobal10),
  check25("enrichment_spend_month_first_day", sql30`extract(day from ${t.month}) = 1`),
  check25("enrichment_spend_provider_shape", sql30`${t.provider} ~ ${sql30.raw(`'${PROVIDER_KEY}'`)}`),
  check25("enrichment_spend_cost_not_negative", sql30`${t.costMicros} >= 0`),
  check25("enrichment_spend_calls_not_negative", sql30`${t.calls} >= 0`),
  index36("enrichment_spend_list_idx").on(t.organizationId, t.month.desc(), t.provider)
]);
var enrichmentReservations2 = outboundSchema2.table("enrichment_reservations", {
  id: text44("id").notNull(),
  organizationId: text44("organization_id").notNull(),
  runId: text44("run_id").notNull(),
  provider: text44("provider").notNull(),
  month: date5("month", { mode: "string" }).notNull(),
  amountMicros: bigint9("amount_micros", { mode: "number" }).notNull(),
  holdKey: text44("hold_key").notNull(),
  createdAt: ts10("created_at").notNull().defaultNow(),
  releasedAt: ts10("released_at")
}, (t) => [
  primaryKey15({ name: "enrichment_reservations_pkey", columns: [t.organizationId, t.id] }),
  check25("enrichment_reservations_id_shape", idShape11("id", "ersv")),
  check25("enrichment_reservations_organization_id_shape", orgShape10),
  check25("enrichment_reservations_organization_not_global", notGlobal10),
  check25("enrichment_reservations_run_id_shape", idShape11("run_id", "erun")),
  check25("enrichment_reservations_provider_shape", sql30`${t.provider} ~ ${sql30.raw(`'${PROVIDER_KEY}'`)}`),
  check25("enrichment_reservations_month_first_day", sql30`extract(day from ${t.month}) = 1`),
  check25("enrichment_reservations_amount_range", sql30`${t.amountMicros} between 0 and ${num6(MAX_MICRO_DOLLARS2)}`),
  check25("enrichment_reservations_hold_key_shape", sql30`char_length(${t.holdKey}) between 1 and ${num6(MAX_RESERVATION_HOLD_KEY_LENGTH2)}`),
  check25("enrichment_reservations_released_after_created", sql30`${t.releasedAt} is null or ${t.releasedAt} >= ${t.createdAt}`),
  foreignKey14({
    name: "enrichment_reservations_run_fk",
    columns: [t.organizationId, t.runId],
    foreignColumns: [enrichmentRuns2.organizationId, enrichmentRuns2.id]
  }).onDelete("cascade"),
  uniqueIndex13("enrichment_reservations_hold_key").on(t.organizationId, t.holdKey),
  index36("enrichment_reservations_open_idx").on(t.organizationId, t.month).where(sql30`${t.releasedAt} is null`),
  index36("enrichment_reservations_run_idx").on(t.organizationId, t.runId)
]);
// src/schema/playbook.ts
import { pgSchema as pgSchema4 } from "drizzle-orm/pg-core";
var playbookSchema2 = pgSchema4("playbook");
// src/schema/playbook-calls.ts
import { sql as sql33 } from "drizzle-orm";
import {
  bigint as bigint12,
  check as check28,
  customType as customType11,
  foreignKey as foreignKey17,
  index as index39,
  integer as integer26,
  primaryKey as primaryKey18,
  text as text47,
  timestamp as timestamp41,
  uniqueIndex as uniqueIndex16,
  uuid as uuid26
} from "drizzle-orm/pg-core";

// src/schema/playbook-sales-history.ts
import { sql as sql32 } from "drizzle-orm";
import {
  bigint as bigint11,
  boolean as boolean15,
  check as check27,
  date as date6,
  foreignKey as foreignKey16,
  index as index38,
  integer as integer25,
  numeric,
  primaryKey as primaryKey17,
  text as text46,
  timestamp as timestamp40,
  uniqueIndex as uniqueIndex15,
  uuid as uuid25
} from "drizzle-orm/pg-core";

// src/schema/playbook-tables.ts
import { sql as sql31 } from "drizzle-orm";
import {
  bigint as bigint10,
  boolean as boolean14,
  check as check26,
  customType as customType10,
  foreignKey as foreignKey15,
  index as index37,
  integer as integer24,
  primaryKey as primaryKey16,
  text as text45,
  timestamp as timestamp39,
  uniqueIndex as uniqueIndex14,
  uuid as uuid24
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
var bytes9 = customType10({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var list13 = (values) => sql31.raw(values.map((v) => `'${v}'`).join(", "));
var idShape12 = (column, prefix) => sql31.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var GLOBAL_SCOPE_ORGANIZATION_ID2 = "org_00000000000000000000000000000000";
var notGlobal11 = sql31.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`);
var ts11 = (name) => timestamp39(name, { withTimezone: true });
var createdAt3 = () => ts11("created_at").notNull().defaultNow();
var updatedAt3 = () => ts11("updated_at").notNull().defaultNow();
var PENDING_CLEANUP_PREDICATE2 = "state = 'deleted' and (vectors_removed_seq is null or vectors_removed_seq < deletion_seq)";
var documents2 = playbookSchema2.table("documents", {
  id: text45("id").notNull(),
  organizationId: text45("organization_id").notNull(),
  name: text45("name").notNull(),
  state: text45("state", { enum: DOCUMENT_STATES2 }).notNull().default("uploaded"),
  contentHash: bytes9("content_hash").notNull(),
  sizeBytes: bigint10("size_bytes", { mode: "number" }).notNull(),
  declaredType: text45("declared_type").notNull(),
  detectedType: text45("detected_type", { enum: DOCUMENT_FILE_TYPES2 }).notNull(),
  uploadedBy: text45("uploaded_by").notNull(),
  objectKey: text45("object_key").notNull(),
  failureReason: text45("failure_reason", { enum: DOCUMENT_FAILURE_REASONS2 }),
  pageCount: integer24("page_count"),
  epoch: integer24("epoch").notNull().default(0),
  deletionSeq: integer24("deletion_seq").notNull().default(0),
  vectorsRemovedSeq: integer24("vectors_removed_seq"),
  deletedAt: ts11("deleted_at"),
  deletedBy: text45("deleted_by"),
  purgeDueAt: ts11("purge_due_at"),
  purgeStartedAt: ts11("purge_started_at"),
  purgeLeaseUntil: ts11("purge_lease_until"),
  purgeAttempts: integer24("purge_attempts").notNull().default(0),
  restoreBarredAt: ts11("restore_barred_at"),
  createdAt: createdAt3(),
  updatedAt: updatedAt3()
}, (t) => [
  primaryKey16({ name: "documents_pkey", columns: [t.organizationId, t.id] }),
  check26("documents_id_shape", idShape12("id", "doc")),
  check26("documents_organization_id_shape", idShape12("organization_id", "org")),
  check26("documents_organization_not_global", notGlobal11),
  check26("documents_uploaded_by_shape", idShape12("uploaded_by", "usr")),
  check26("documents_deleted_by_shape", sql31`${t.deletedBy} ~ '^usr_[0-9a-f]{32}$'`),
  check26("documents_name_shape", sql31`char_length(btrim(${t.name})) between 1 and 255`),
  check26("documents_state_known", sql31`${t.state} in (${list13(DOCUMENT_STATES2)})`),
  check26("documents_content_hash_length", sql31`octet_length(${t.contentHash}) = 32`),
  check26("documents_size_bounds", sql31`${t.sizeBytes} between 1 and ${sql31.raw(String(DOCUMENT_MAX_BYTES2))}`),
  check26("documents_declared_type_shape", sql31`char_length(${t.declaredType}) between 1 and 255 and ${t.declaredType} collate "C" ~ '^[ -~]+$'`),
  check26("documents_detected_type_known", sql31`${t.detectedType} in (${list13(DOCUMENT_FILE_TYPES2)})`),
  check26("documents_object_key_shape", sql31`char_length(${t.objectKey}) between 1 and 1024 and ${t.objectKey} collate "C" ~ '^[!-~]+$'`),
  check26("documents_failure_reason_known", sql31`${t.failureReason} in (${list13(DOCUMENT_FAILURE_REASONS2)})`),
  check26("documents_failed_has_reason", sql31`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check26("documents_page_count_positive", sql31`${t.pageCount} > 0`),
  check26("documents_epoch_bounds", sql31`${t.epoch} >= 0 and ${t.deletionSeq} >= 0`),
  check26("documents_vectors_removed_seq_bounds", sql31`${t.vectorsRemovedSeq} between 0 and ${t.deletionSeq}`),
  check26("documents_deleted_has_times", sql31`(${t.state} = 'deleted') = (${t.deletedAt} is not null)
        and (${t.state} = 'deleted') = (${t.purgeDueAt} is not null)`),
  check26("documents_deleted_by_when_deleted", sql31`${t.state} = 'deleted' or ${t.deletedBy} is null`),
  check26("documents_deleted_is_counted", sql31`(${t.state} <> 'deleted') or ${t.deletionSeq} >= 1`),
  check26("documents_purge_due_after_delete", sql31`${t.purgeDueAt} >= ${t.deletedAt}`),
  check26("documents_purge_only_when_deleted", sql31`(${t.purgeStartedAt} is null or ${t.state} = 'deleted')
        and (${t.purgeStartedAt} is null) = (${t.purgeLeaseUntil} is null)
        and (${t.purgeStartedAt} is null) = (${t.purgeAttempts} = 0)`),
  check26("documents_purge_attempts_bounds", sql31`${t.purgeAttempts} between 0 and ${sql31.raw(String(DOCUMENT_PURGE_MAX_ATTEMPTS2))}`),
  check26("documents_barred_only_when_deleted", sql31`${t.restoreBarredAt} is null or ${t.state} = 'deleted'`),
  uniqueIndex14("documents_content_hash_key").on(t.organizationId, t.contentHash).where(sql31`${t.purgeStartedAt} is null and ${t.restoreBarredAt} is null`),
  index37("documents_list_idx").on(t.organizationId, t.createdAt, t.id).where(sql31`${t.state} <> 'deleted'`),
  index37("documents_state_list_idx").on(t.organizationId, t.state, t.createdAt, t.id).where(sql31`${t.state} <> 'deleted'`),
  index37("documents_deleted_list_idx").on(t.organizationId, t.createdAt, t.id).where(sql31`${t.state} = 'deleted'`),
  index37("documents_purge_idx").on(t.organizationId, t.purgeDueAt, t.id).where(sql31`${t.state} = 'deleted' and ${t.purgeAttempts} < ${sql31.raw(String(DOCUMENT_PURGE_MAX_ATTEMPTS2))}`),
  index37("documents_unbarred_idx").on(t.organizationId, t.id).where(sql31`${t.restoreBarredAt} is null`),
  index37("documents_cleanup_idx").on(t.organizationId, t.deletedAt, t.id).where(sql31.raw(PENDING_CLEANUP_PREDICATE2)),
  index37("documents_spent_purge_idx").on(t.organizationId, t.id).where(sql31`${t.state} = 'deleted' and ${t.purgeAttempts} >= ${sql31.raw(String(DOCUMENT_PURGE_MAX_ATTEMPTS2))}`)
]);
var organizationUsage2 = playbookSchema2.table("organization_usage", {
  organizationId: text45("organization_id").primaryKey(),
  documentCount: bigint10("document_count", { mode: "number" }).notNull().default(0),
  byteCount: bigint10("byte_count", { mode: "number" }).notNull().default(0),
  dealCount: bigint10("deal_count", { mode: "number" }).notNull().default(0),
  callCount: bigint10("call_count", { mode: "number" }).notNull().default(0),
  recordingByteCount: bigint10("recording_byte_count", { mode: "number" }).notNull().default(0),
  updatedAt: updatedAt3()
}, (t) => [
  check26("organization_usage_organization_id_shape", idShape12("organization_id", "org")),
  check26("organization_usage_organization_not_global", notGlobal11),
  check26("organization_usage_not_negative", sql31`${t.documentCount} >= 0 and ${t.byteCount} >= 0`),
  check26("organization_usage_deal_count_not_negative", sql31`${t.dealCount} >= 0`),
  check26("organization_usage_call_counts_not_negative", sql31`${t.callCount} >= 0 and ${t.recordingByteCount} >= 0`)
]);
var ingestionJobs2 = playbookSchema2.table("ingestion_jobs", {
  id: text45("id").notNull(),
  organizationId: text45("organization_id").notNull(),
  documentId: text45("document_id").notNull(),
  epoch: integer24("epoch").notNull(),
  state: text45("state", { enum: INGESTION_JOB_STATES2 }).notNull().default("queued"),
  step: text45("step", { enum: INGESTION_STEPS2 }).notNull().default("parse"),
  attempts: integer24("attempts").notNull().default(0),
  nextAttemptAt: ts11("next_attempt_at").notNull(),
  claimToken: uuid24("claim_token"),
  artifactKey: text45("artifact_key"),
  pageCount: integer24("page_count"),
  chunkCount: integer24("chunk_count"),
  chunksDone: integer24("chunks_done").notNull().default(0),
  failureReason: text45("failure_reason", { enum: DOCUMENT_FAILURE_REASONS2 }),
  finishedAt: ts11("finished_at"),
  createdAt: createdAt3(),
  updatedAt: updatedAt3()
}, (t) => [
  primaryKey16({ name: "ingestion_jobs_pkey", columns: [t.organizationId, t.id] }),
  foreignKey15({
    name: "ingestion_jobs_document_fk",
    columns: [t.organizationId, t.documentId],
    foreignColumns: [documents2.organizationId, documents2.id]
  }).onDelete("cascade"),
  check26("ingestion_jobs_id_shape", idShape12("id", "job")),
  check26("ingestion_jobs_organization_id_shape", idShape12("organization_id", "org")),
  check26("ingestion_jobs_organization_not_global", notGlobal11),
  check26("ingestion_jobs_epoch_bounds", sql31`${t.epoch} >= 0`),
  check26("ingestion_jobs_state_known", sql31`${t.state} in (${list13(INGESTION_JOB_STATES2)})`),
  check26("ingestion_jobs_step_known", sql31`${t.step} in (${list13(INGESTION_STEPS2)})`),
  check26("ingestion_jobs_attempts_bounds", sql31`${t.attempts} between 0 and ${sql31.raw(String(INGESTION_JOB_MAX_ATTEMPTS2))}`),
  check26("ingestion_jobs_running_has_token", sql31`(${t.state} = 'running') = (${t.claimToken} is not null)`),
  check26("ingestion_jobs_artifact_key_shape", sql31`char_length(${t.artifactKey}) between 1 and 1024 and ${t.artifactKey} collate "C" ~ '^[!-~]+$'`),
  check26("ingestion_jobs_counts_bounds", sql31`${t.pageCount} between 1 and ${sql31.raw(String(DOCUMENT_MAX_PAGE_COUNT2))}
        and ${t.chunkCount} between 0 and ${sql31.raw(String(INGESTION_MAX_CHUNKS2))}
        and ${t.chunksDone} >= 0 and ${t.chunksDone} <= coalesce(${t.chunkCount}, 0)`),
  check26("ingestion_jobs_failure_reason_known", sql31`${t.failureReason} in (${list13(DOCUMENT_FAILURE_REASONS2)})`),
  check26("ingestion_jobs_failed_has_reason", sql31`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check26("ingestion_jobs_final_has_finish", sql31`(${t.state} in ('succeeded', 'failed', 'cancelled')) = (${t.finishedAt} is not null)`),
  index37("ingestion_jobs_document_idx").on(t.organizationId, t.documentId),
  uniqueIndex14("ingestion_jobs_active_document_key").on(t.organizationId, t.documentId).where(sql31`${t.state} in ('queued', 'running')`),
  index37("ingestion_jobs_due_idx").on(t.organizationId, t.nextAttemptAt).where(sql31`${t.state} in ('queued', 'running')`)
]);
var indexSettings2 = playbookSchema2.table("index_settings", {
  organizationId: text45("organization_id").primaryKey(),
  embeddingModel: text45("embedding_model").notNull(),
  embeddingDimension: integer24("embedding_dimension").notNull(),
  vectorsWrittenAt: ts11("vectors_written_at"),
  learnFromAgentMoments: boolean14("learn_from_agent_moments").notNull().default(true),
  createdAt: createdAt3(),
  updatedAt: updatedAt3()
}, (t) => [
  check26("index_settings_organization_id_shape", idShape12("organization_id", "org")),
  check26("index_settings_organization_not_global", notGlobal11),
  check26("index_settings_model_shape", sql31`char_length(${t.embeddingModel}) between 1 and 200 and ${t.embeddingModel} collate "C" ~ '^[A-Za-z0-9._:/-]+$'`),
  check26("index_settings_dimension_bounds", sql31`${t.embeddingDimension} between 1 and 16384`)
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
var list14 = (values) => sql32.raw(values.map((v) => `'${v}'`).join(", "));
var idShape13 = (column, prefix) => sql32.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var notGlobal12 = sql32.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`);
var ts12 = (name) => timestamp40(name, { withTimezone: true });
var deals2 = playbookSchema2.table("deals", {
  id: text46("id").notNull(),
  organizationId: text46("organization_id").notNull(),
  dealId: text46("deal_id").notNull(),
  name: text46("name"),
  outcome: text46("outcome", { enum: DEAL_OUTCOMES2 }).notNull().default("open"),
  outcomeSeq: integer25("outcome_seq").notNull().default(0),
  retagThrough: integer25("retag_through").notNull().default(0),
  closedAt: date6("closed_at", { mode: "string" }),
  amount: numeric("amount", { precision: 17, scale: 2 }),
  currency: text46("currency"),
  appearedInImport: boolean15("appeared_in_import").notNull().default(false),
  createdAt: ts12("created_at").notNull().defaultNow(),
  updatedAt: ts12("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey17({ name: "deals_pkey", columns: [t.organizationId, t.id] }),
  check27("deals_id_shape", idShape13("id", "deal")),
  check27("deals_organization_id_shape", idShape13("organization_id", "org")),
  check27("deals_organization_not_global", notGlobal12),
  check27("deals_deal_id_shape", sql32`char_length(${t.dealId}) between 1 and ${sql32.raw(String(DEAL_ID_MAX_LENGTH2))}
        and octet_length(${t.dealId}) <= ${sql32.raw(String(DEAL_ID_MAX_BYTES2))}
        and ${t.dealId} = btrim(${t.dealId}, E' \\t\\n\\r\\f\\v')`),
  check27("deals_name_shape", sql32`${t.name} is null or (char_length(${t.name}) between 1 and ${sql32.raw(String(DEAL_NAME_MAX_LENGTH2))}
        and octet_length(${t.name}) <= ${sql32.raw(String(DEAL_NAME_MAX_BYTES2))})`),
  check27("deals_outcome_known", sql32`${t.outcome} in (${list14(DEAL_OUTCOMES2)})`),
  check27("deals_outcome_seq_range", sql32`${t.outcomeSeq} between 0 and ${sql32.raw(String(DEAL_MAX_SEQ2))}`),
  check27("deals_amount_range", sql32`${t.amount} is null or ${t.amount} >= 0`),
  check27("deals_currency_shape", sql32`${t.currency} is null or ${t.currency} ~ '^[A-Z]{3}$'`),
  check27("deals_amount_has_currency", sql32`${t.amount} is null or ${t.currency} is not null`),
  check27("deals_retag_through_range", sql32`${t.retagThrough} between 0 and ${t.outcomeSeq}`),
  uniqueIndex15("deals_deal_id_key").on(t.organizationId, t.dealId),
  index38("deals_retag_idx").on(t.organizationId, t.id).where(sql32`${t.retagThrough} < ${t.outcomeSeq}`),
  index38("deals_list_idx").on(t.organizationId, t.createdAt, t.id),
  index38("deals_outcome_list_idx").on(t.organizationId, t.outcome, t.createdAt, t.id),
  index38("deals_import_list_idx").on(t.organizationId, t.appearedInImport, t.createdAt, t.id)
]);
var dealImports2 = playbookSchema2.table("deal_imports", {
  id: text46("id").notNull(),
  organizationId: text46("organization_id").notNull(),
  state: text46("state", { enum: DEAL_IMPORT_STATES2 }).notNull().default("uploaded"),
  failureReason: text46("failure_reason", { enum: DEAL_IMPORT_FAILURE_REASONS2 }),
  uploadedBy: text46("uploaded_by").notNull(),
  objectKey: text46("object_key").notNull(),
  sizeBytes: bigint11("size_bytes", { mode: "number" }).notNull(),
  attempts: integer25("attempts").notNull().default(0),
  nextAttemptAt: ts12("next_attempt_at").notNull().defaultNow(),
  claimToken: uuid25("claim_token"),
  rowCount: integer25("row_count"),
  appliedCount: integer25("applied_count").notNull().default(0),
  rejectedCount: integer25("rejected_count").notNull().default(0),
  reportThrough: integer25("report_through").notNull().default(1),
  objectRemovedAt: ts12("object_removed_at"),
  erasedAt: ts12("erased_at"),
  finishedAt: ts12("finished_at"),
  createdAt: ts12("created_at").notNull().defaultNow(),
  updatedAt: ts12("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey17({ name: "deal_imports_pkey", columns: [t.organizationId, t.id] }),
  check27("deal_imports_id_shape", idShape13("id", "dimp")),
  check27("deal_imports_organization_id_shape", idShape13("organization_id", "org")),
  check27("deal_imports_organization_not_global", notGlobal12),
  check27("deal_imports_uploaded_by_shape", idShape13("uploaded_by", "usr")),
  check27("deal_imports_state_known", sql32`${t.state} in (${list14(DEAL_IMPORT_STATES2)})`),
  check27("deal_imports_failure_reason_known", sql32`${t.failureReason} is null or ${t.failureReason} in (${list14(DEAL_IMPORT_FAILURE_REASONS2)})`),
  check27("deal_imports_failure_matches_state", sql32`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check27("deal_imports_size_range", sql32`${t.sizeBytes} between 1 and ${sql32.raw(String(DEAL_IMPORT_MAX_BYTES2))}`),
  check27("deal_imports_attempts_range", sql32`${t.attempts} between 0 and ${sql32.raw(String(DEAL_IMPORT_MAX_ATTEMPTS2))}`),
  check27("deal_imports_counts_range", sql32`${t.appliedCount} between 0 and ${sql32.raw(String(DEAL_IMPORT_MAX_ROWS2))}
        and ${t.rejectedCount} between 0 and ${sql32.raw(String(DEAL_IMPORT_MAX_ROWS2))}
        and ${t.appliedCount} + ${t.rejectedCount} <= ${sql32.raw(String(DEAL_IMPORT_MAX_ROWS2))}`),
  check27("deal_imports_report_contiguous", sql32`${t.reportThrough} between 1 and ${sql32.raw(String(DEAL_IMPORT_MAX_ROWS2 + 1))}
        and ${t.appliedCount} + ${t.rejectedCount} = ${t.reportThrough} - 1`),
  check27("deal_imports_row_count_matches_state", sql32`(${t.state} = 'completed') = (${t.rowCount} is not null)
        and (${t.rowCount} is null or ${t.rowCount} = ${t.appliedCount} + ${t.rejectedCount})`),
  check27("deal_imports_claim_only_while_processing", sql32`${t.claimToken} is null or ${t.state} = 'processing'`),
  check27("deal_imports_finished_matches_state", sql32`(${t.state} in ('completed', 'failed')) = (${t.finishedAt} is not null)`),
  check27("deal_imports_erased_is_final", sql32`${t.erasedAt} is null or ${t.state} in ('completed', 'failed')`),
  index38("deal_imports_list_idx").on(t.organizationId, t.createdAt, t.id),
  index38("deal_imports_due_idx").on(t.organizationId, t.nextAttemptAt).where(sql32`${t.state} in ('uploaded', 'processing')`),
  index38("deal_imports_erased_idx").on(t.organizationId, t.id).where(sql32`${t.erasedAt} is not null`),
  index38("deal_imports_unerased_idx").on(t.organizationId, t.id).where(sql32`${t.erasedAt} is null`)
]);
var dealImportRows2 = playbookSchema2.table("deal_import_rows", {
  organizationId: text46("organization_id").notNull(),
  importId: text46("import_id").notNull(),
  rowNumber: integer25("row_number").notNull(),
  dealId: text46("deal_id"),
  result: text46("result", { enum: DEAL_IMPORT_ROW_RESULTS2 }).notNull(),
  reason: text46("reason", { enum: DEAL_IMPORT_ROW_REASONS2 })
}, (t) => [
  primaryKey17({
    name: "deal_import_rows_pkey",
    columns: [t.organizationId, t.importId, t.rowNumber]
  }),
  foreignKey16({
    name: "deal_import_rows_import_fkey",
    columns: [t.organizationId, t.importId],
    foreignColumns: [dealImports2.organizationId, dealImports2.id]
  }),
  check27("deal_import_rows_organization_id_shape", idShape13("organization_id", "org")),
  check27("deal_import_rows_organization_not_global", notGlobal12),
  check27("deal_import_rows_row_number_range", sql32`${t.rowNumber} between 2 and ${sql32.raw(String(DEAL_IMPORT_MAX_ROWS2 + 1))}`),
  check27("deal_import_rows_result_known", sql32`${t.result} in (${list14(DEAL_IMPORT_ROW_RESULTS2)})`),
  check27("deal_import_rows_reason_known", sql32`${t.reason} is null or ${t.reason} in (${list14(DEAL_IMPORT_ROW_REASONS2)})`),
  check27("deal_import_rows_reason_matches_result", sql32`(${t.result} = 'rejected') = (${t.reason} is not null)`),
  check27("deal_import_rows_deal_id_shape", sql32`${t.dealId} is null or (char_length(${t.dealId}) between 1 and ${sql32.raw(String(DEAL_ID_MAX_LENGTH2))}
        and octet_length(${t.dealId}) <= ${sql32.raw(String(DEAL_ID_MAX_BYTES2))})`),
  check27("deal_import_rows_deal_id_missing_only_when_unusable", sql32`${t.dealId} is not null or ${t.reason} in (${list14(DEAL_IMPORT_ROW_REASONS_WITHOUT_DEAL_ID2)})`),
  uniqueIndex15("deal_import_rows_first_key").on(t.organizationId, t.importId, t.dealId).where(sql32`${t.dealId} is not null and ${t.reason} is distinct from 'duplicate_in_file'`),
  index38("deal_import_rows_result_idx").on(t.organizationId, t.importId, t.result, t.rowNumber)
]);
var rightsConfirmations2 = playbookSchema2.table("rights_confirmations", {
  organizationId: text46("organization_id").primaryKey(),
  confirmedBy: text46("confirmed_by").notNull(),
  confirmedAt: ts12("confirmed_at").notNull().defaultNow(),
  wordingVersion: integer25("wording_version").notNull()
}, (t) => [
  check27("rights_confirmations_organization_id_shape", idShape13("organization_id", "org")),
  check27("rights_confirmations_organization_not_global", notGlobal12),
  check27("rights_confirmations_confirmed_by_shape", idShape13("confirmed_by", "usr")),
  check27("rights_confirmations_wording_version_range", sql32`${t.wordingVersion} between 1 and ${sql32.raw(String(RIGHTS_MAX_WORDING_VERSION2))}`)
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
var bytes10 = customType11({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var textArray3 = customType11({
  dataType: () => "text[]"
});
var list15 = (values) => sql33.raw(values.map((v) => `'${v}'`).join(", "));
var idShape14 = (column, prefix) => sql33.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var notGlobal13 = sql33.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`);
var ts13 = (name) => timestamp41(name, { withTimezone: true });
var CALL_PENDING_CLEANUP_PREDICATE2 = "state = 'deleted' and (vectors_removed_seq is null or vectors_removed_seq < deletion_seq)";
var CALL_ORIGINS2 = ["imported", "rep", "agent"];
var calls2 = playbookSchema2.table("calls", {
  id: text47("id").notNull(),
  organizationId: text47("organization_id").notNull(),
  dealRecordId: text47("deal_record_id").notNull(),
  kind: text47("kind", { enum: CALL_KINDS2 }).notNull(),
  fileName: text47("file_name").notNull(),
  mediaType: text47("media_type", { enum: CALL_MEDIA_TYPES2 }).notNull(),
  sizeBytes: bigint12("size_bytes", { mode: "number" }).notNull(),
  contentHash: bytes10("content_hash").notNull(),
  durationSeconds: integer26("duration_seconds"),
  state: text47("state", { enum: CALL_STATES2 }).notNull().default("uploaded"),
  failureReason: text47("failure_reason", { enum: CALL_FAILURE_REASONS2 }),
  repBy: text47("rep_by", { enum: CALL_REP_BY2 }),
  repLabel: text47("rep_label"),
  repChannel: text47("rep_channel", { enum: CALL_CHANNELS2 }),
  speakerLabels: textArray3("speaker_labels").notNull().default(sql33`'{}'::text[]`),
  uploadedBy: text47("uploaded_by").notNull(),
  objectKey: text47("object_key").notNull(),
  transcriptKey: text47("transcript_key"),
  epoch: integer26("epoch").notNull().default(0),
  repSeq: integer26("rep_seq").notNull().default(0),
  deletionSeq: integer26("deletion_seq").notNull().default(0),
  vectorsRemovedSeq: integer26("vectors_removed_seq"),
  taggedOutcomeSeq: integer26("tagged_outcome_seq").notNull().default(0),
  origin: text47("origin", { enum: CALL_ORIGINS2 }).notNull().default("imported"),
  sentToVendorAt: ts13("sent_to_vendor_at"),
  vendorSendSeq: integer26("vendor_send_seq").notNull().default(0),
  vendorRemovedAt: ts13("vendor_removed_at"),
  deletedAt: ts13("deleted_at"),
  deletedBy: text47("deleted_by"),
  purgeDueAt: ts13("purge_due_at"),
  purgeStartedAt: ts13("purge_started_at"),
  purgeLeaseUntil: ts13("purge_lease_until"),
  purgeAttempts: integer26("purge_attempts").notNull().default(0),
  restoreBarredAt: ts13("restore_barred_at"),
  embeddedMoments: integer26("embedded_moments"),
  skippedMoments: integer26("skipped_moments"),
  createdAt: ts13("created_at").notNull().defaultNow(),
  updatedAt: ts13("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey18({ name: "calls_pkey", columns: [t.organizationId, t.id] }),
  foreignKey17({
    name: "calls_deal_fk",
    columns: [t.organizationId, t.dealRecordId],
    foreignColumns: [deals2.organizationId, deals2.id]
  }),
  check28("calls_id_shape", idShape14("id", "call")),
  check28("calls_organization_id_shape", idShape14("organization_id", "org")),
  check28("calls_organization_not_global", notGlobal13),
  check28("calls_deal_record_id_shape", idShape14("deal_record_id", "deal")),
  check28("calls_uploaded_by_shape", idShape14("uploaded_by", "usr")),
  check28("calls_deleted_by_shape", sql33`${t.deletedBy} ~ '^usr_[0-9a-f]{32}$'`),
  check28("calls_kind_known", sql33`${t.kind} in (${list15(CALL_KINDS2)})`),
  check28("calls_media_type_known", sql33`${t.mediaType} in (${list15(CALL_MEDIA_TYPES2)})`),
  check28("calls_kind_matches_media_type", sql33`(${t.kind} = 'recording') = (${t.mediaType} like 'audio/%')`),
  check28("calls_file_name_shape", sql33`char_length(btrim(${t.fileName})) between 1 and 255`),
  check28("calls_content_hash_length", sql33`octet_length(${t.contentHash}) = 32`),
  check28("calls_size_bounds", sql33`${t.sizeBytes} between 1 and ${sql33.raw(String(CALL_MAX_RECORDING_BYTES2))}
        and (${t.kind} = 'recording' or ${t.sizeBytes} <= ${sql33.raw(String(CALL_MAX_TRANSCRIPT_BYTES2))})`),
  check28("calls_duration_bounds", sql33`${t.durationSeconds} is null or (${t.durationSeconds} between 1 and ${sql33.raw(String(CALL_MAX_RECORDING_SECONDS2))}
        and ${t.kind} = 'recording')`),
  check28("calls_origin_known", sql33`${t.origin} in (${list15(CALL_ORIGINS2)})`),
  check28("calls_state_known", sql33`${t.state} in (${list15(CALL_STATES2)})`),
  check28("calls_failure_reason_known", sql33`${t.failureReason} in (${list15(CALL_FAILURE_REASONS2)})`),
  check28("calls_failed_has_reason", sql33`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check28("calls_transcript_states", sql33`${t.kind} = 'recording' or ${t.state} not in ('transcribing', 'awaiting_rep')`),
  check28("calls_rep_shape", sql33`(${t.repBy} is null and ${t.repLabel} is null and ${t.repChannel} is null)
        or (${t.repBy} = 'speaker' and ${t.repLabel} is not null and ${t.repChannel} is null)
        or (${t.repBy} = 'channel' and ${t.repChannel} is not null and ${t.repLabel} is null
            and ${t.kind} = 'recording')`),
  check28("calls_rep_label_shape", sql33`${t.repLabel} is null or char_length(${t.repLabel}) between 1 and ${sql33.raw(String(CALL_SPEAKER_LABEL_MAX_LENGTH2))}
      and octet_length(${t.repLabel}) <= ${sql33.raw(String(CALL_SPEAKER_LABEL_MAX_BYTES2))}`),
  check28("calls_awaiting_rep_has_none", sql33`${t.state} <> 'awaiting_rep' or ${t.repBy} is null`),
  check28("calls_ready_has_rep", sql33`${t.state} <> 'ready' or ${t.repBy} is not null`),
  check28("calls_ready_label_listed", sql33`${t.state} <> 'ready' or ${t.repBy} is distinct from 'speaker' or ${t.repLabel} = any(${t.speakerLabels})`),
  check28("calls_moment_counts", sql33`(${t.embeddedMoments} is null) = (${t.skippedMoments} is null)
        and (${t.embeddedMoments} is null or (${t.embeddedMoments} between 0 and ${sql33.raw(String(CALL_MAX_MOMENTS2))}
          and ${t.skippedMoments} between 0 and ${sql33.raw(String(CALL_MAX_MOMENTS2))}))`),
  check28("calls_speaker_labels_valid", sql33`playbook.speaker_labels_ok(${t.speakerLabels})`),
  check28("calls_too_many_speakers_lists_none", sql33`${t.failureReason} is distinct from 'too_many_speakers' or cardinality(${t.speakerLabels}) = 0`),
  check28("calls_object_key_shape", sql33`char_length(${t.objectKey}) between 1 and 1024 and ${t.objectKey} collate "C" ~ '^[!-~]+$'`),
  check28("calls_transcript_key_shape", sql33`char_length(${t.transcriptKey}) between 1 and 1024 and ${t.transcriptKey} collate "C" ~ '^[!-~]+$'`),
  check28("calls_seq_bounds", sql33`${t.epoch} >= 0 and ${t.deletionSeq} >= 0
        and ${t.repSeq} between 0 and ${sql33.raw(String(CALL_MAX_SEQ2))}
        and ${t.taggedOutcomeSeq} between 0 and ${sql33.raw(String(CALL_MAX_SEQ2))}`),
  check28("calls_vectors_removed_seq_bounds", sql33`${t.vectorsRemovedSeq} between 0 and ${t.deletionSeq}`),
  check28("calls_deleted_has_times", sql33`(${t.state} = 'deleted') = (${t.deletedAt} is not null)
        and (${t.state} = 'deleted') = (${t.purgeDueAt} is not null)`),
  check28("calls_deleted_by_when_deleted", sql33`${t.state} = 'deleted' or ${t.deletedBy} is null`),
  check28("calls_deleted_is_counted", sql33`${t.state} <> 'deleted' or ${t.deletionSeq} >= 1`),
  check28("calls_purge_due_after_delete", sql33`${t.purgeDueAt} >= ${t.deletedAt}`),
  check28("calls_purge_only_when_deleted", sql33`(${t.purgeStartedAt} is null or ${t.state} = 'deleted')
        and (${t.purgeStartedAt} is null) = (${t.purgeLeaseUntil} is null)
        and (${t.purgeStartedAt} is null) = (${t.purgeAttempts} = 0)`),
  check28("calls_purge_attempts_bounds", sql33`${t.purgeAttempts} between 0 and ${sql33.raw(String(CALL_PURGE_MAX_ATTEMPTS2))}`),
  check28("calls_barred_only_when_deleted", sql33`${t.restoreBarredAt} is null or ${t.state} = 'deleted'`),
  check28("calls_vendor_removal_after_send", sql33`${t.vendorRemovedAt} is null or ${t.sentToVendorAt} is not null`),
  check28("calls_vendor_send_seq_max", sql33`${t.vendorSendSeq} <= ${sql33.raw(String(CALL_MAX_VENDOR_SENDS2))}`),
  check28("calls_vendor_send_seq_matches", sql33`${t.vendorSendSeq} >= 0 and (${t.sentToVendorAt} is null) = (${t.vendorSendSeq} = 0)`),
  check28("calls_transcript_has_rep", sql33`${t.kind} <> 'transcript' or ${t.repBy} is not null`),
  uniqueIndex16("calls_content_hash_key").on(t.organizationId, t.contentHash).where(sql33`${t.purgeStartedAt} is null and ${t.restoreBarredAt} is null`),
  index39("calls_list_idx").on(t.organizationId, t.createdAt, t.id).where(sql33`${t.state} <> 'deleted'`),
  index39("calls_state_list_idx").on(t.organizationId, t.state, t.createdAt, t.id),
  index39("calls_deal_list_idx").on(t.organizationId, t.dealRecordId, t.createdAt, t.id).where(sql33`${t.state} <> 'deleted'`),
  index39("calls_deal_state_list_idx").on(t.organizationId, t.dealRecordId, t.state, t.createdAt, t.id),
  index39("calls_purge_idx").on(t.organizationId, t.purgeDueAt, t.id).where(sql33`${t.state} = 'deleted' and ${t.purgeAttempts} < ${sql33.raw(String(CALL_PURGE_MAX_ATTEMPTS2))}`),
  index39("calls_unbarred_idx").on(t.organizationId, t.id).where(sql33`${t.restoreBarredAt} is null`),
  index39("calls_cleanup_idx").on(t.organizationId, t.deletedAt, t.id).where(sql33.raw(CALL_PENDING_CLEANUP_PREDICATE2)),
  index39("calls_spent_purge_idx").on(t.organizationId, t.id).where(sql33`${t.state} = 'deleted' and ${t.purgeAttempts} >= ${sql33.raw(String(CALL_PURGE_MAX_ATTEMPTS2))}`),
  index39("calls_retag_idx").on(t.organizationId, t.dealRecordId, t.id).where(sql33`${t.state} = 'ready'`)
]);
var callJobs2 = playbookSchema2.table("call_jobs", {
  id: text47("id").notNull(),
  organizationId: text47("organization_id").notNull(),
  callId: text47("call_id").notNull(),
  kind: text47("kind", { enum: CALL_JOB_KINDS2 }).notNull(),
  epoch: integer26("epoch").notNull(),
  repSeq: integer26("rep_seq").notNull().default(0),
  state: text47("state", { enum: CALL_JOB_STATES2 }).notNull().default("queued"),
  attempts: integer26("attempts").notNull().default(0),
  nextAttemptAt: ts13("next_attempt_at").notNull(),
  claimToken: uuid26("claim_token"),
  failureReason: text47("failure_reason", { enum: CALL_FAILURE_REASONS2 }),
  finishedAt: ts13("finished_at"),
  createdAt: ts13("created_at").notNull().defaultNow(),
  updatedAt: ts13("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey18({ name: "call_jobs_pkey", columns: [t.organizationId, t.id] }),
  foreignKey17({
    name: "call_jobs_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [calls2.organizationId, calls2.id]
  }).onDelete("cascade"),
  check28("call_jobs_id_shape", idShape14("id", "cjob")),
  check28("call_jobs_organization_id_shape", idShape14("organization_id", "org")),
  check28("call_jobs_organization_not_global", notGlobal13),
  check28("call_jobs_kind_known", sql33`${t.kind} in (${list15(CALL_JOB_KINDS2)})`),
  check28("call_jobs_state_known", sql33`${t.state} in (${list15(CALL_JOB_STATES2)})`),
  check28("call_jobs_epoch_seq_bounds", sql33`${t.epoch} >= 0 and ${t.repSeq} between 0 and ${sql33.raw(String(CALL_MAX_SEQ2))}`),
  check28("call_jobs_attempts_bounds", sql33`${t.attempts} between 0 and ${sql33.raw(String(CALL_JOB_MAX_ATTEMPTS2))}`),
  check28("call_jobs_running_has_token", sql33`(${t.state} = 'running') = (${t.claimToken} is not null)`),
  check28("call_jobs_failure_reason_known", sql33`${t.failureReason} in (${list15(CALL_FAILURE_REASONS2)})`),
  check28("call_jobs_failed_has_reason", sql33`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check28("call_jobs_final_has_finish", sql33`(${t.state} in ('succeeded', 'failed', 'cancelled')) = (${t.finishedAt} is not null)`),
  index39("call_jobs_call_idx").on(t.organizationId, t.callId),
  uniqueIndex16("call_jobs_active_call_key").on(t.organizationId, t.callId).where(sql33`${t.state} in ('queued', 'running')`),
  index39("call_jobs_due_idx").on(t.organizationId, t.nextAttemptAt).where(sql33`${t.state} in ('queued', 'running')`)
]);
var callVendorSends2 = playbookSchema2.table("call_vendor_sends", {
  organizationId: text47("organization_id").notNull(),
  callId: text47("call_id").notNull(),
  seq: integer26("seq").notNull(),
  vendorId: text47("vendor_id"),
  createdAt: ts13("created_at").notNull().defaultNow(),
  recordedAt: ts13("recorded_at")
}, (t) => [
  primaryKey18({
    name: "call_vendor_sends_pkey",
    columns: [t.organizationId, t.callId, t.seq]
  }),
  foreignKey17({
    name: "call_vendor_sends_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [calls2.organizationId, calls2.id]
  }).onDelete("cascade"),
  check28("call_vendor_sends_organization_id_shape", idShape14("organization_id", "org")),
  check28("call_vendor_sends_organization_not_global", notGlobal13),
  check28("call_vendor_sends_seq_bounds", sql33`${t.seq} between 1 and ${sql33.raw(String(CALL_MAX_VENDOR_SENDS2))}`),
  check28("call_vendor_sends_vendor_id_shape", sql33.raw(`"vendor_id" is null or "vendor_id" ~ '${CALL_VENDOR_ID_PATTERN2}'`)),
  check28("call_vendor_sends_recorded_matches", sql33`(${t.vendorId} is null) = (${t.recordedAt} is null)`),
  uniqueIndex16("call_vendor_sends_org_vendor_id_key").on(t.organizationId, t.vendorId).where(sql33`${t.vendorId} is not null`)
]);
// src/schema/playbook-consumed.ts
import { sql as sql34 } from "drizzle-orm";
import { check as check29, index as index40, primaryKey as primaryKey19, text as text48, timestamp as timestamp42, uuid as uuid27 } from "drizzle-orm/pg-core";
var list16 = (values) => sql34.raw(values.map((v) => `'${v}'`).join(", "));
var idShape15 = (column, prefix) => sql34.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var ts14 = (name) => timestamp42(name, { withTimezone: true });
var consumedMessage2 = playbookSchema2.table("consumed_message", {
  consumer: text48("consumer").notNull(),
  organizationId: text48("organization_id").notNull(),
  messageId: text48("message_id").notNull(),
  state: text48("state", { enum: CONSUMED_MESSAGE_STATES2 }).notNull(),
  claimToken: uuid27("claim_token").notNull(),
  leaseExpiresAt: ts14("lease_expires_at"),
  completedAt: ts14("completed_at")
}, (t) => [
  primaryKey19({
    name: "consumed_message_pkey",
    columns: [t.consumer, t.organizationId, t.messageId]
  }),
  check29("consumed_message_organization_id_shape", idShape15("organization_id", "org")),
  check29("consumed_message_consumer_shape", sql34`char_length(${t.consumer}) between 1 and 128 and ${t.consumer} collate "C" ~ '^[A-Za-z0-9_.:-]+$'`),
  check29("consumed_message_message_id_shape", sql34`char_length(${t.messageId}) between 1 and 128 and ${t.messageId} collate "C" ~ '^[A-Za-z0-9_.:-]+$'`),
  check29("consumed_message_state_known", sql34`${t.state} in (${list16(CONSUMED_MESSAGE_STATES2)})`),
  check29("consumed_message_state_columns", sql34`(${t.state} = 'claimed' and ${t.leaseExpiresAt} is not null and ${t.completedAt} is null)
        or (${t.state} = 'done' and ${t.leaseExpiresAt} is null and ${t.completedAt} is not null)`),
  index40("consumed_message_done_idx").on(t.organizationId, t.completedAt).where(sql34`${t.state} = 'done'`),
  index40("consumed_message_lease_idx").on(t.organizationId, t.leaseExpiresAt).where(sql34`${t.state} = 'claimed'`)
]);
// src/schema/playbook-embed-usage.ts
import { sql as sql35 } from "drizzle-orm";
import { check as check30, date as date7, integer as integer27, primaryKey as primaryKey20, text as text49 } from "drizzle-orm/pg-core";
var EMBED_USAGE_MAX_ADD2 = 1e6;
var EMBED_USAGE_MAX_MOMENTS2 = 1e9;
var playbookEmbedUsage2 = playbookSchema2.table("embed_usage", {
  organizationId: text49("organization_id").notNull(),
  day: date7("day", { mode: "string" }).notNull(),
  moments: integer27("moments").notNull().default(0)
}, (t) => [
  primaryKey20({ name: "embed_usage_pkey", columns: [t.organizationId, t.day] }),
  check30("embed_usage_organization_id_shape", sql35.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)),
  check30("embed_usage_organization_not_global", sql35.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`)),
  check30("embed_usage_moments_bounds", sql35`${t.moments} between 0 and ${sql35.raw(String(EMBED_USAGE_MAX_MOMENTS2))}`)
]);
// src/schema/playbook-idempotency.ts
import { sql as sql36 } from "drizzle-orm";
import {
  check as check31,
  customType as customType12,
  index as index41,
  jsonb as jsonb20,
  primaryKey as primaryKey21,
  smallint as smallint8,
  text as text50,
  timestamp as timestamp43
} from "drizzle-orm/pg-core";
var idShape16 = (column, prefix) => sql36.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var bytes11 = customType12({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var INTERNAL_CALL_USER_ID2 = "usr_00000000000000000000000000000000";
var playbookIdempotencyKeys2 = playbookSchema2.table("idempotency_keys", {
  organizationId: text50("organization_id").notNull(),
  userId: text50("user_id").notNull(),
  route: text50("route").notNull(),
  key: text50("key").notNull(),
  requestHash: bytes11("request_hash").notNull(),
  status: smallint8("status"),
  response: jsonb20("response").$type(),
  createdAt: timestamp43("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  primaryKey21({
    name: "idempotency_keys_pkey",
    columns: [t.organizationId, t.userId, t.route, t.key]
  }),
  check31("idempotency_keys_organization_id_shape", idShape16("organization_id", "org")),
  check31("idempotency_keys_organization_not_global", sql36.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`)),
  check31("idempotency_keys_user_id_shape", idShape16("user_id", "usr")),
  check31("idempotency_keys_route_shape", sql36`char_length(${t.route}) between 1 and ${sql36.raw(String(IDEMPOTENCY_ROUTE_MAX2))}
        and ${t.route} collate "C" ~ '^[a-z0-9._]+$'`),
  check31("idempotency_keys_key_shape", sql36`char_length(${t.key}) between 1 and ${sql36.raw(String(IDEMPOTENCY_KEY_MAX2))}
        and ${t.key} collate "C" ~ '^[!-~]+$'`),
  check31("idempotency_keys_request_hash_length", sql36`octet_length(${t.requestHash}) = ${sql36.raw(String(IDEMPOTENCY_HASH_BYTES2))}`),
  check31("idempotency_keys_status_range", sql36`${t.status} between 100 and 599`),
  check31("idempotency_keys_response_matches_status", sql36`(${t.status} is null) = (${t.response} is null)`),
  check31("idempotency_keys_response_size", sql36`octet_length(${t.response}::text) <= ${sql36.raw(String(IDEMPOTENCY_RESPONSE_MAX_BYTES2))}`),
  index41("idempotency_keys_purge_idx").on(t.organizationId, t.createdAt)
]);
// src/schema/playbook-orphan-sweeps.ts
import { sql as sql37 } from "drizzle-orm";
import { check as check32, text as text51, timestamp as timestamp44 } from "drizzle-orm/pg-core";
var ORPHAN_SWEEP_CURSOR_MAX_BYTES2 = 1024;
var ORPHAN_SWEEP_MIN_CLAIM_MS2 = 1000;
var ORPHAN_SWEEP_MAX_CLAIM_MS2 = 3600000;
var playbookOrphanSweeps2 = playbookSchema2.table("orphan_sweeps", {
  organizationId: text51("organization_id").primaryKey(),
  sweptThrough: timestamp44("swept_through", { withTimezone: true }).notNull(),
  erasedAttemptAt: timestamp44("erased_attempt_at", { withTimezone: true }),
  sweepCursor: text51("sweep_cursor"),
  sweepClaimUntil: timestamp44("sweep_claim_until", { withTimezone: true })
}, (t) => [
  check32("orphan_sweeps_organization_id_shape", sql37.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)),
  check32("orphan_sweeps_cursor_bounds", sql37`${t.sweepCursor} is null or octet_length(${t.sweepCursor}) between 1 and ${sql37.raw(String(ORPHAN_SWEEP_CURSOR_MAX_BYTES2))}`),
  check32("orphan_sweeps_organization_not_global", sql37.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`))
]);
// src/schema/playbook-suggestions.ts
import { sql as sql38 } from "drizzle-orm";
import {
  check as check33,
  customType as customType13,
  index as index42,
  jsonb as jsonb21,
  primaryKey as primaryKey22,
  text as text52,
  timestamp as timestamp45,
  uniqueIndex as uniqueIndex17
} from "drizzle-orm/pg-core";
var SUGGESTION_KINDS2 = ["objection_answer", "discovery_question", "closing_move"];
var SUGGESTION_STATUSES2 = ["pending", "accepted", "rejected"];
var MAX_SUGGESTION_TEXT_LENGTH2 = 1000;
var MAX_SUGGESTION_MOMENTS2 = 10;
var SUGGESTION_FINGERPRINT_BYTES2 = 32;
var bytes12 = customType13({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var list17 = (values) => sql38.raw(values.map((v) => `'${v}'`).join(", "));
var idShape17 = (column, prefix) => sql38.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var notGlobal14 = sql38.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`);
var ts15 = (name) => timestamp45(name, { withTimezone: true });
var suggestions2 = playbookSchema2.table("suggestions", {
  id: text52("id").notNull(),
  organizationId: text52("organization_id").notNull(),
  kind: text52("kind", { enum: SUGGESTION_KINDS2 }).notNull(),
  status: text52("status", { enum: SUGGESTION_STATUSES2 }).notNull().default("pending"),
  text: text52("text").notNull(),
  fingerprint: bytes12("fingerprint").notNull(),
  dealRecordId: text52("deal_record_id").notNull(),
  moments: jsonb21("moments").notNull().default(sql38`'[]'::jsonb`),
  createdAt: ts15("created_at").notNull().defaultNow(),
  decidedAt: ts15("decided_at"),
  decidedByMembershipId: text52("decided_by_membership_id")
}, (t) => [
  primaryKey22({ name: "suggestions_pkey", columns: [t.organizationId, t.id] }),
  check33("suggestions_id_shape", idShape17("id", "sgs")),
  check33("suggestions_organization_id_shape", idShape17("organization_id", "org")),
  check33("suggestions_organization_not_global", notGlobal14),
  check33("suggestions_kind_known", sql38`${t.kind} in (${list17(SUGGESTION_KINDS2)})`),
  check33("suggestions_status_known", sql38`${t.status} in (${list17(SUGGESTION_STATUSES2)})`),
  check33("suggestions_text_length", sql38`char_length(btrim(${t.text})) between 1 and ${sql38.raw(String(MAX_SUGGESTION_TEXT_LENGTH2))}`),
  check33("suggestions_fingerprint_length", sql38`octet_length(${t.fingerprint}) = ${sql38.raw(String(SUGGESTION_FINGERPRINT_BYTES2))}`),
  check33("suggestions_deal_record_id_shape", idShape17("deal_record_id", "deal")),
  check33("suggestions_moments_shape", sql38`jsonb_typeof(${t.moments}) = 'array' and jsonb_array_length(${t.moments}) <= ${sql38.raw(String(MAX_SUGGESTION_MOMENTS2))}`),
  check33("suggestions_decided_by_shape", sql38`${t.decidedByMembershipId} is null or ${t.decidedByMembershipId} ~ '^mem_[0-9a-f]{32}$'`),
  check33("suggestions_decision_columns", sql38`(${t.status} = 'pending' and ${t.decidedAt} is null and ${t.decidedByMembershipId} is null)
        or (${t.status} <> 'pending' and ${t.decidedAt} is not null and ${t.decidedByMembershipId} is not null)`),
  uniqueIndex17("suggestions_fingerprint_key").on(t.organizationId, t.fingerprint),
  index42("suggestions_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index42("suggestions_status_list_idx").on(t.organizationId, t.status, t.createdAt.desc(), t.id.desc())
]);
// src/schema/playbook-work-hints.ts
import { sql as sql39 } from "drizzle-orm";
import { check as check34, index as index43, primaryKey as primaryKey23, text as text53, timestamp as timestamp46 } from "drizzle-orm/pg-core";
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
  kind: text53("kind", { enum: WORK_KINDS2 }).notNull(),
  organizationId: text53("organization_id").notNull(),
  dueAt: timestamp46("due_at", { withTimezone: true }).notNull()
}, (t) => [
  primaryKey23({ name: "work_hints_pkey", columns: [t.kind, t.organizationId] }),
  check34("work_hints_kind_known", sql39`${t.kind} in (${sql39.raw(WORK_KINDS2.map((k) => `'${k}'`).join(", "))})`),
  check34("work_hints_organization_id_shape", sql39.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)),
  check34("work_hints_global_only_consumed", sql39`${t.kind} = 'consumed_purge' or ${t.organizationId} <> ${sql39.raw(`'${GLOBAL_SCOPE_ORGANIZATION_ID2}'`)}`),
  index43("work_hints_due_idx").on(t.kind, t.dueAt, t.organizationId)
]);
// src/schema/voice.ts
import { pgSchema as pgSchema5 } from "drizzle-orm/pg-core";
var voiceSchema2 = pgSchema5("voice");
// src/schema/voice-agent.ts
import { sql as sql41 } from "drizzle-orm";
import {
  boolean as boolean17,
  check as check36,
  customType as customType14,
  foreignKey as foreignKey19,
  index as index45,
  integer as integer29,
  jsonb as jsonb22,
  primaryKey as primaryKey25,
  smallint as smallint10,
  text as text55,
  timestamp as timestamp48,
  uniqueIndex as uniqueIndex19
} from "drizzle-orm/pg-core";

// src/schema/voice-tables.ts
import { sql as sql40 } from "drizzle-orm";
import {
  bigint as bigint13,
  boolean as boolean16,
  check as check35,
  foreignKey as foreignKey18,
  index as index44,
  integer as integer28,
  primaryKey as primaryKey24,
  smallint as smallint9,
  text as text54,
  timestamp as timestamp47,
  uniqueIndex as uniqueIndex18
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
var list18 = (values) => sql40.raw(values.map((v) => `'${v}'`).join(", "));
var num7 = (value) => sql40.raw(String(value));
var idShape18 = (column, prefix) => sql40.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape11 = sql40.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal15 = sql40.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts16 = (name) => timestamp47(name, { withTimezone: true });
var voiceLines2 = voiceSchema2.table("lines", {
  id: text54("id").notNull(),
  organizationId: text54("organization_id").notNull(),
  number: text54("number").notNull(),
  country: text54("country").notNull(),
  label: text54("label"),
  state: text54("state", { enum: LINE_STATES2 }).notNull(),
  assignmentKind: text54("assignment_kind", { enum: LINE_ASSIGNMENT_KINDS2 }).notNull().default("unassigned"),
  assignmentTeamId: text54("assignment_team_id"),
  assignmentMembershipId: text54("assignment_membership_id"),
  providerSid: text54("provider_sid"),
  createdAt: ts16("created_at").notNull().defaultNow(),
  releasedAt: ts16("released_at")
}, (t) => [
  primaryKey24({ name: "lines_pkey", columns: [t.organizationId, t.id] }),
  check35("lines_id_shape", idShape18("id", "line")),
  check35("lines_organization_id_shape", orgShape11),
  check35("lines_organization_not_global", notGlobal15),
  check35("lines_number_shape", sql40`${t.number} ~ '${sql40.raw(IDENTITY_VALUE_PATTERNS2.phone)}'`),
  check35("lines_country_shape", sql40`${t.country} ~ '^[A-Z]{2}$'`),
  check35("lines_label_shape", sql40`${t.label} is null or char_length(${t.label}) between 1 and ${num7(MAX_LINE_LABEL_LENGTH2)}`),
  check35("lines_state_known", sql40`${t.state} in (${list18(LINE_STATES2)})`),
  check35("lines_assignment_kind_known", sql40`${t.assignmentKind} in (${list18(LINE_ASSIGNMENT_KINDS2)})`),
  check35("lines_assignment_team_id_shape", idShape18("assignment_team_id", "team")),
  check35("lines_assignment_membership_id_shape", idShape18("assignment_membership_id", "mem")),
  check35("lines_assignment_matches_kind", sql40`(${t.assignmentKind} = 'team') = (${t.assignmentTeamId} is not null)
        and (${t.assignmentKind} = 'rep') = (${t.assignmentMembershipId} is not null)`),
  check35("lines_provider_sid_shape", sql40`${t.providerSid} is null or char_length(${t.providerSid}) between 1 and 64`),
  check35("lines_released_at", sql40`(${t.state} = 'released') = (${t.releasedAt} is not null)`),
  check35("lines_released_unassigned", sql40`${t.state} <> 'released' or ${t.assignmentKind} = 'unassigned'`),
  uniqueIndex18("lines_number_live_key").on(t.number).where(sql40`${t.state} <> 'released'`),
  uniqueIndex18("lines_provider_sid_key").on(t.organizationId, t.providerSid).where(sql40`${t.providerSid} is not null`),
  index44("lines_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index44("lines_state_list_idx").on(t.organizationId, t.state, t.createdAt.desc(), t.id.desc()),
  index44("lines_team_idx").on(t.organizationId, t.assignmentTeamId).where(sql40`${t.assignmentTeamId} is not null`),
  index44("lines_rep_idx").on(t.organizationId, t.assignmentMembershipId).where(sql40`${t.assignmentMembershipId} is not null`)
]);
var voiceLineDirectory2 = voiceSchema2.table("line_directory", {
  number: text54("number").primaryKey(),
  organizationId: text54("organization_id").notNull(),
  lineId: text54("line_id").notNull(),
  state: text54("state", { enum: LINE_STATES2 }).notNull()
}, (t) => [
  check35("line_directory_number_shape", sql40`${t.number} ~ '${sql40.raw(IDENTITY_VALUE_PATTERNS2.phone)}'`),
  check35("line_directory_organization_id_shape", orgShape11),
  check35("line_directory_organization_not_global", notGlobal15),
  check35("line_directory_line_id_shape", idShape18("line_id", "line")),
  check35("line_directory_state_known", sql40`${t.state} in ('porting', 'active')`)
]);
var voiceCalls2 = voiceSchema2.table("calls", {
  id: text54("id").notNull(),
  organizationId: text54("organization_id").notNull(),
  direction: text54("direction", { enum: VOICE_CALL_DIRECTIONS2 }).notNull(),
  state: text54("state", { enum: VOICE_CALL_STATES2 }).notNull(),
  lineId: text54("line_id").notNull(),
  repMembershipId: text54("rep_membership_id"),
  prospectId: text54("prospect_id"),
  prospectNumber: text54("prospect_number").notNull(),
  providerCallSid: text54("provider_call_sid"),
  idempotencyKey: text54("idempotency_key"),
  requestFingerprint: text54("request_fingerprint"),
  disclosureWordingVersion: integer28("disclosure_wording_version"),
  disclosurePlayedAt: ts16("disclosure_played_at"),
  aiAssisted: boolean16("ai_assisted").notNull().default(false),
  createdAt: ts16("created_at").notNull().defaultNow(),
  answeredAt: ts16("answered_at"),
  endedAt: ts16("ended_at"),
  durationSeconds: integer28("duration_seconds"),
  endedBy: text54("ended_by", { enum: VOICE_CALL_ENDED_BY2 }),
  failureReason: text54("failure_reason", { enum: VOICE_CALL_FAILURE_REASONS2 }),
  dealId: text54("deal_id"),
  note: text54("note"),
  transcriptState: text54("transcript_state", { enum: VOICE_TRANSCRIPT_STATES2 }).notNull().default("pending"),
  updatedAt: ts16("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey24({ name: "calls_pkey", columns: [t.organizationId, t.id] }),
  check35("calls_id_shape", idShape18("id", "call")),
  check35("calls_organization_id_shape", orgShape11),
  check35("calls_organization_not_global", notGlobal15),
  check35("calls_line_id_shape", idShape18("line_id", "line")),
  check35("calls_rep_membership_id_shape", idShape18("rep_membership_id", "mem")),
  check35("calls_prospect_id_shape", idShape18("prospect_id", "prs")),
  check35("calls_prospect_number_shape", sql40`${t.prospectNumber} ~ '${sql40.raw(IDENTITY_VALUE_PATTERNS2.phone)}'`),
  check35("calls_direction_known", sql40`${t.direction} in (${list18(VOICE_CALL_DIRECTIONS2)})`),
  check35("calls_state_known", sql40`${t.state} in (${list18(VOICE_CALL_STATES2)})`),
  check35("calls_ended_by_known", sql40`${t.endedBy} is null or ${t.endedBy} in (${list18(VOICE_CALL_ENDED_BY2)})`),
  check35("calls_failure_reason_known", sql40`${t.failureReason} is null or ${t.failureReason} in (${list18(VOICE_CALL_FAILURE_REASONS2)})`),
  check35("calls_transcript_state_known", sql40`${t.transcriptState} in (${list18(VOICE_TRANSCRIPT_STATES2)})`),
  check35("calls_provider_call_sid_shape", sql40`${t.providerCallSid} is null or char_length(${t.providerCallSid}) between 1 and 64`),
  check35("calls_idempotency_shape", sql40`(${t.idempotencyKey} is null) = (${t.requestFingerprint} is null)
        and (${t.idempotencyKey} is null or char_length(${t.idempotencyKey}) between 1 and ${num7(MAX_VOICE_IDEMPOTENCY_KEY_LENGTH2)})
        and (${t.requestFingerprint} is null or ${t.requestFingerprint} ~ '^[0-9a-f]{64}$')`),
  check35("calls_disclosure_all_or_none", sql40`(${t.disclosureWordingVersion} is null) = (${t.disclosurePlayedAt} is null)
        and (${t.disclosureWordingVersion} is null or ${t.disclosureWordingVersion} >= 1)`),
  check35("calls_live_has_disclosure", sql40`${t.state} not in ('live', 'ended') or ${t.disclosurePlayedAt} is not null`),
  check35("calls_failed_has_reason", sql40`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check35("calls_disclosure_failure", sql40`${t.failureReason} is distinct from 'disclosure_failed' or ${t.disclosurePlayedAt} is null`),
  check35("calls_final_has_end", sql40`(${t.state} in (${list18(VOICE_CALL_FINAL_STATES2)})) = (${t.endedAt} is not null)`),
  check35("calls_answered", sql40`(${t.state} in ('live', 'ended')) = (${t.answeredAt} is not null)`),
  check35("calls_duration", sql40`(${t.state} = 'ended') = (${t.durationSeconds} is not null)`),
  check35("calls_duration_bounds", sql40`${t.durationSeconds} is null or ${t.durationSeconds} between 0 and ${num7(MAX_CALL_DURATION_SECONDS2)}`),
  check35("calls_ended_by_final", sql40`${t.endedBy} is null or ${t.state} in (${list18(VOICE_CALL_FINAL_STATES2)})`),
  check35("calls_times_ordered", sql40`(${t.answeredAt} is null or ${t.answeredAt} >= ${t.createdAt})
        and (${t.endedAt} is null or ${t.endedAt} >= ${t.createdAt})
        and (${t.answeredAt} is null or ${t.endedAt} is null or ${t.endedAt} >= ${t.answeredAt})`),
  check35("calls_wrap_up_only_ended", sql40`${t.state} = 'ended' or (${t.dealId} is null and ${t.note} is null)`),
  check35("calls_deal_id_shape", sql40`${t.dealId} is null or (char_length(${t.dealId}) between 1 and ${num7(DEAL_ID_MAX_LENGTH2)}
        and octet_length(${t.dealId}) <= ${num7(DEAL_ID_MAX_BYTES2)}
        and ${t.dealId} = btrim(${t.dealId}, E' \\t\\n\\r\\f\\v'))`),
  check35("calls_note_shape", sql40`${t.note} is null or char_length(${t.note}) between 1 and ${num7(MAX_WRAP_UP_NOTE_LENGTH2)}`),
  foreignKey18({
    name: "calls_line_fk",
    columns: [t.organizationId, t.lineId],
    foreignColumns: [voiceLines2.organizationId, voiceLines2.id]
  }),
  uniqueIndex18("calls_provider_call_sid_key").on(t.organizationId, t.providerCallSid).where(sql40`${t.providerCallSid} is not null`),
  uniqueIndex18("calls_idempotency_key_key").on(t.organizationId, t.idempotencyKey).where(sql40`${t.idempotencyKey} is not null`),
  index44("calls_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index44("calls_rep_list_idx").on(t.organizationId, t.repMembershipId, t.createdAt.desc(), t.id.desc()).where(sql40`${t.repMembershipId} is not null`),
  index44("calls_state_list_idx").on(t.organizationId, t.state, t.createdAt.desc(), t.id.desc()),
  index44("calls_prospect_list_idx").on(t.organizationId, t.prospectId, t.createdAt.desc(), t.id.desc()).where(sql40`${t.prospectId} is not null`),
  index44("calls_line_list_idx").on(t.organizationId, t.lineId, t.createdAt.desc(), t.id.desc())
]);
var voiceCallEvents2 = voiceSchema2.table("call_events", {
  id: text54("id").notNull(),
  organizationId: text54("organization_id").notNull(),
  seq: bigint13("seq", { mode: "number" }).generatedAlwaysAsIdentity().notNull(),
  callId: text54("call_id").notNull(),
  kind: text54("kind", { enum: VOICE_CALL_EVENT_KINDS2 }).notNull(),
  fromState: text54("from_state", { enum: VOICE_CALL_STATES2 }),
  toState: text54("to_state", { enum: VOICE_CALL_STATES2 }),
  providerEventId: text54("provider_event_id"),
  occurredAt: ts16("occurred_at").notNull(),
  recordedAt: ts16("recorded_at").notNull().defaultNow()
}, (t) => [
  primaryKey24({ name: "call_events_pkey", columns: [t.organizationId, t.id] }),
  check35("call_events_id_shape", idShape18("id", "vev")),
  check35("call_events_organization_id_shape", orgShape11),
  check35("call_events_organization_not_global", notGlobal15),
  check35("call_events_call_id_shape", idShape18("call_id", "call")),
  check35("call_events_kind_known", sql40`${t.kind} in (${list18(VOICE_CALL_EVENT_KINDS2)})`),
  check35("call_events_from_state_known", sql40`${t.fromState} is null or ${t.fromState} in (${list18(VOICE_CALL_STATES2)})`),
  check35("call_events_to_state_known", sql40`${t.toState} is null or ${t.toState} in (${list18(VOICE_CALL_STATES2)})`),
  check35("call_events_state_change", sql40`(${t.kind} = 'state_changed') = (${t.toState} is not null)
        and (${t.fromState} is null or ${t.toState} is not null)`),
  check35("call_events_provider_event_id_shape", sql40`${t.providerEventId} is null or char_length(${t.providerEventId}) between 1 and ${num7(MAX_PROVIDER_EVENT_ID_LENGTH2)}`),
  foreignKey18({
    name: "call_events_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [voiceCalls2.organizationId, voiceCalls2.id]
  }).onDelete("cascade"),
  uniqueIndex18("call_events_provider_event_key").on(t.organizationId, t.providerEventId),
  index44("call_events_call_idx").on(t.organizationId, t.callId, t.seq)
]);
var voiceRecordings2 = voiceSchema2.table("recordings", {
  id: text54("id").notNull(),
  organizationId: text54("organization_id").notNull(),
  callId: text54("call_id").notNull(),
  storageKey: text54("storage_key").notNull(),
  sizeBytes: bigint13("size_bytes", { mode: "number" }),
  channels: smallint9("channels").notNull(),
  state: text54("state", { enum: VOICE_RECORDING_STATES2 }).notNull().default("storing"),
  createdAt: ts16("created_at").notNull().defaultNow(),
  storedAt: ts16("stored_at"),
  deletedAt: ts16("deleted_at"),
  purgeDueAt: ts16("purge_due_at"),
  updatedAt: ts16("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey24({ name: "recordings_pkey", columns: [t.organizationId, t.id] }),
  check35("recordings_id_shape", idShape18("id", "rec")),
  check35("recordings_organization_id_shape", orgShape11),
  check35("recordings_organization_not_global", notGlobal15),
  check35("recordings_call_id_shape", idShape18("call_id", "call")),
  check35("recordings_storage_key_shape", sql40`char_length(${t.storageKey}) between 1 and ${num7(MAX_RECORDING_KEY_LENGTH2)}
        and ${t.storageKey} collate "C" ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]*$'`),
  check35("recordings_channels_known", sql40`${t.channels} in (1, 2)`),
  check35("recordings_state_known", sql40`${t.state} in (${list18(VOICE_RECORDING_STATES2)})`),
  check35("recordings_size_bounds", sql40`${t.sizeBytes} is null or ${t.sizeBytes} >= 0`),
  check35("recordings_stored", sql40`(${t.state} <> 'storing' or (${t.storedAt} is null and ${t.sizeBytes} is null)) and (${t.state} <> 'stored' or (${t.storedAt} is not null and ${t.sizeBytes} is not null))`),
  check35("recordings_deleted", sql40`(${t.state} = 'deleted') = (${t.deletedAt} is not null)`),
  check35("recordings_purge_only_deleted", sql40`${t.purgeDueAt} is null or ${t.state} = 'deleted'`),
  foreignKey18({
    name: "recordings_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [voiceCalls2.organizationId, voiceCalls2.id]
  }).onDelete("cascade"),
  uniqueIndex18("recordings_call_key").on(t.organizationId, t.callId),
  uniqueIndex18("recordings_storage_key_key").on(t.organizationId, t.storageKey),
  index44("recordings_purge_idx").on(t.organizationId, t.purgeDueAt).where(sql40`${t.state} = 'deleted' and ${t.purgeDueAt} is not null`)
]);

// src/schema/voice-agent.ts
var INQUIRY_SOURCES2 = ["form", "chat", "call"];
var INQUIRY_CALLBACK_STATES2 = [
  "not_applicable",
  "pending",
  "dialling",
  "connected",
  "no_answer",
  "skipped",
  "failed"
];
var INQUIRY_SKIP_REASONS2 = [
  "agent_paused",
  "no_consent",
  "consent_revoked",
  "suppressed",
  "outside_hours",
  "consent_check_unavailable",
  "no_phone_number",
  "concurrency_cap",
  "retries_exhausted"
];
var MAX_CALLBACK_ATTEMPTS2 = 3;
var MAX_SOURCE_URL_LENGTH2 = 2048;
var MIN_AGENT_IDEMPOTENCY_KEY_LENGTH2 = 16;
var MAX_AGENT_IDEMPOTENCY_KEY_LENGTH2 = 128;
var AGENT_VOICE_STYLES2 = ["warm", "neutral", "crisp"];
var MAX_AGENT_CALL_SECONDS2 = 1800;
var MAX_AGENT_CALL_COST_USD_CENTS2 = 5000;
var MAX_AGENT_CONCURRENCY2 = 50;
var MAX_AGENT_GREETING_LENGTH2 = 500;
var MAX_AGENT_HOURS_DAYS2 = 7;
var QUALIFICATION_QUESTION_KINDS2 = ["free_text", "choice", "number", "yes_no"];
var MAX_QUALIFICATION_QUESTIONS2 = 50;
var MAX_QUESTION_PROMPT_LENGTH2 = 500;
var MAX_ANSWER_LENGTH2 = 500;
var MIN_QUESTION_CHOICES2 = 2;
var MAX_QUESTION_CHOICES2 = 10;
var MAX_SKIP_CONDITIONS2 = 5;
var MAX_QUALIFICATION_SUMMARY_LENGTH2 = 2000;
var AGENT_TURN_ROLES2 = ["prospect", "agent"];
var AGENT_TOOLS2 = [
  "record_answer",
  "find_slots",
  "book",
  "hand_off",
  "end_call",
  "revoke_consent"
];
var MAX_TURN_TEXT_LENGTH2 = 2000;
var MAX_TURN_SOURCES2 = 10;
var MAX_DOCUMENT_PAGES2 = 300;
var MAX_COPILOT_QUOTE_LENGTH2 = 512;
var HANDOFF_CHANNELS2 = ["call", "chat"];
var HANDOFF_STATES2 = [
  "pending",
  "accepted",
  "completed",
  "declined",
  "timed_out",
  "no_rep"
];
var HANDOFF_REASONS2 = [
  "asked_for_rep",
  "qualified",
  "agent_unsure",
  "prospect_frustrated"
];
var HANDOFF_RESULTS2 = ["bridged", "booking_offered", "abandoned"];
var MAX_HANDOFF_ATTEMPTS2 = 10;
var CHAT_STATES2 = ["open", "handed_off", "closed"];
var CHAT_TOKEN_HASH_BYTES2 = 32;
var list19 = (values) => sql41.raw(values.map((v) => `'${v}'`).join(", "));
var num8 = (value) => sql41.raw(String(value));
var idShape19 = (column, prefix) => sql41.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape12 = sql41.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal16 = sql41.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts17 = (name) => timestamp48(name, { withTimezone: true });
var SOURCE_URL = String.raw`^https?://[^\s]+$`;
var IDEMPOTENCY_KEY = "^[A-Za-z0-9_.:-]+$";
var bytes13 = customType14({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var voiceChats2 = voiceSchema2.table("chats", {
  id: text55("id").notNull(),
  organizationId: text55("organization_id").notNull(),
  state: text55("state", { enum: CHAT_STATES2 }).notNull().default("open"),
  prospectId: text55("prospect_id"),
  inquiryId: text55("inquiry_id"),
  sessionTokenHash: bytes13("session_token_hash").notNull(),
  sourceUrl: text55("source_url").notNull(),
  startedAt: ts17("started_at").notNull().defaultNow(),
  lastMessageAt: ts17("last_message_at").notNull().defaultNow(),
  expiresAt: ts17("expires_at").notNull(),
  closedAt: ts17("closed_at")
}, (t) => [
  primaryKey25({ name: "chats_pkey", columns: [t.organizationId, t.id] }),
  check36("chats_id_shape", idShape19("id", "cht")),
  check36("chats_organization_id_shape", orgShape12),
  check36("chats_organization_not_global", notGlobal16),
  check36("chats_state_known", sql41`${t.state} in (${list19(CHAT_STATES2)})`),
  check36("chats_prospect_id_shape", idShape19("prospect_id", "prs")),
  check36("chats_inquiry_id_shape", idShape19("inquiry_id", "inq")),
  check36("chats_session_token_hash_length", sql41`octet_length(${t.sessionTokenHash}) = ${num8(CHAT_TOKEN_HASH_BYTES2)}`),
  check36("chats_source_url_shape", sql41`char_length(${t.sourceUrl}) between 1 and ${num8(MAX_SOURCE_URL_LENGTH2)}
        and ${t.sourceUrl} ~ '${sql41.raw(SOURCE_URL)}'`),
  check36("chats_closed", sql41`(${t.state} = 'closed') = (${t.closedAt} is not null)`),
  check36("chats_times_in_order", sql41`${t.lastMessageAt} >= ${t.startedAt} and ${t.expiresAt} > ${t.startedAt}
        and (${t.closedAt} is null or ${t.closedAt} >= ${t.startedAt})`),
  uniqueIndex19("chats_session_token_key").on(t.organizationId, t.sessionTokenHash),
  index45("chats_list_idx").on(t.organizationId, t.startedAt.desc(), t.id.desc()),
  index45("chats_state_list_idx").on(t.organizationId, t.state, t.startedAt.desc(), t.id.desc()),
  index45("chats_prospect_idx").on(t.organizationId, t.prospectId).where(sql41`${t.prospectId} is not null`),
  index45("chats_expiry_idx").on(t.organizationId, t.expiresAt).where(sql41`${t.state} <> 'closed'`)
]);
var voiceInquiries2 = voiceSchema2.table("inquiries", {
  id: text55("id").notNull(),
  organizationId: text55("organization_id").notNull(),
  idempotencyKey: text55("idempotency_key").notNull(),
  source: text55("source", { enum: INQUIRY_SOURCES2 }).notNull(),
  prospectId: text55("prospect_id").notNull(),
  assignedToMembershipId: text55("assigned_to_membership_id"),
  chatId: text55("chat_id"),
  callId: text55("call_id"),
  consentWordingId: text55("consent_wording_id"),
  consentWordingVersion: integer29("consent_wording_version"),
  consentSourceUrl: text55("consent_source_url"),
  consentPhoneGranted: boolean17("consent_phone_granted"),
  callbackState: text55("callback_state", { enum: INQUIRY_CALLBACK_STATES2 }).notNull(),
  callbackSkipReason: text55("callback_skip_reason", { enum: INQUIRY_SKIP_REASONS2 }),
  callbackAttempts: smallint10("callback_attempts").notNull().default(0),
  callbackNextAttemptAt: ts17("callback_next_attempt_at"),
  callbackLastAttemptAt: ts17("callback_last_attempt_at"),
  qualificationSummary: text55("qualification_summary"),
  receivedAt: ts17("received_at").notNull().defaultNow(),
  updatedAt: ts17("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey25({ name: "inquiries_pkey", columns: [t.organizationId, t.id] }),
  check36("inquiries_id_shape", idShape19("id", "inq")),
  check36("inquiries_organization_id_shape", orgShape12),
  check36("inquiries_organization_not_global", notGlobal16),
  check36("inquiries_idempotency_key_shape", sql41`char_length(${t.idempotencyKey}) between ${num8(MIN_AGENT_IDEMPOTENCY_KEY_LENGTH2)} and ${num8(MAX_AGENT_IDEMPOTENCY_KEY_LENGTH2)}
        and ${t.idempotencyKey} collate "C" ~ '${sql41.raw(IDEMPOTENCY_KEY)}'`),
  check36("inquiries_source_known", sql41`${t.source} in (${list19(INQUIRY_SOURCES2)})`),
  check36("inquiries_prospect_id_shape", idShape19("prospect_id", "prs")),
  check36("inquiries_assigned_to_membership_id_shape", idShape19("assigned_to_membership_id", "mem")),
  check36("inquiries_chat_id_shape", idShape19("chat_id", "cht")),
  check36("inquiries_call_id_shape", idShape19("call_id", "call")),
  check36("inquiries_consent_wording_id_shape", idShape19("consent_wording_id", "cwd")),
  check36("inquiries_callback_state_known", sql41`${t.callbackState} in (${list19(INQUIRY_CALLBACK_STATES2)})`),
  check36("inquiries_callback_skip_reason_known", sql41`${t.callbackSkipReason} is null or ${t.callbackSkipReason} in (${list19(INQUIRY_SKIP_REASONS2)})`),
  check36("inquiries_callback_attempts_range", sql41`${t.callbackAttempts} between 0 and ${num8(MAX_CALLBACK_ATTEMPTS2)}`),
  check36("inquiries_consent_all_or_none", sql41`(${t.consentWordingId} is null) = (${t.consentWordingVersion} is null)
        and (${t.consentWordingId} is null) = (${t.consentSourceUrl} is null)
        and (${t.consentWordingId} is null) = (${t.consentPhoneGranted} is null)
        and (${t.consentWordingVersion} is null or ${t.consentWordingVersion} >= 1)
        and (${t.consentSourceUrl} is null or (char_length(${t.consentSourceUrl}) between 1 and ${num8(MAX_SOURCE_URL_LENGTH2)}
          and ${t.consentSourceUrl} ~ '${sql41.raw(SOURCE_URL)}'))`),
  check36("inquiries_form_has_consent", sql41`${t.source} <> 'form' or ${t.consentWordingId} is not null`),
  check36("inquiries_chat_link", sql41`(${t.source} = 'chat') = (${t.chatId} is not null)`),
  check36("inquiries_call_link", sql41`${t.source} <> 'call' or ${t.callId} is not null`),
  check36("inquiries_call_not_called_back", sql41`${t.source} <> 'call' or ${t.callbackState} = 'not_applicable'`),
  check36("inquiries_callback_needs_consent", sql41`${t.callbackState} in ('not_applicable', 'skipped') or ${t.consentWordingId} is not null`),
  check36("inquiries_dialled_has_phone_consent", sql41`${t.callbackState} in ('not_applicable', 'skipped') or ${t.consentPhoneGranted} is true`),
  check36("inquiries_skip_reason", sql41`(${t.callbackState} = 'skipped') = (${t.callbackSkipReason} is not null)`),
  check36("inquiries_next_attempt", sql41`${t.callbackNextAttemptAt} is null or ${t.callbackState} = 'no_answer'`),
  check36("inquiries_not_applicable_never_dialled", sql41`${t.callbackState} <> 'not_applicable' or (${t.callbackAttempts} = 0 and ${t.callbackLastAttemptAt} is null)`),
  check36("inquiries_summary_shape", sql41`${t.qualificationSummary} is null or char_length(${t.qualificationSummary}) between 1 and ${num8(MAX_QUALIFICATION_SUMMARY_LENGTH2)}`),
  foreignKey19({
    name: "inquiries_chat_fk",
    columns: [t.organizationId, t.chatId],
    foreignColumns: [voiceChats2.organizationId, voiceChats2.id]
  }),
  foreignKey19({
    name: "inquiries_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [voiceCalls2.organizationId, voiceCalls2.id]
  }),
  uniqueIndex19("inquiries_idempotency_key").on(t.organizationId, t.idempotencyKey),
  uniqueIndex19("inquiries_chat_key").on(t.organizationId, t.chatId).where(sql41`${t.chatId} is not null`),
  uniqueIndex19("inquiries_call_key").on(t.organizationId, t.callId).where(sql41`${t.callId} is not null`),
  index45("inquiries_list_idx").on(t.organizationId, t.receivedAt.desc(), t.id.desc()),
  index45("inquiries_source_list_idx").on(t.organizationId, t.source, t.receivedAt.desc(), t.id.desc()),
  index45("inquiries_callback_list_idx").on(t.organizationId, t.callbackState, t.receivedAt.desc(), t.id.desc()),
  index45("inquiries_prospect_idx").on(t.organizationId, t.prospectId, t.receivedAt.desc()),
  index45("inquiries_assignee_idx").on(t.organizationId, t.assignedToMembershipId, t.receivedAt.desc(), t.id.desc()).where(sql41`${t.assignedToMembershipId} is not null`),
  index45("inquiries_retry_idx").on(t.organizationId, t.callbackNextAttemptAt).where(sql41`${t.callbackState} = 'no_answer' and ${t.callbackNextAttemptAt} is not null`),
  index45("inquiries_pending_idx").on(t.organizationId, t.receivedAt).where(sql41`${t.callbackState} = 'pending'`)
]);
var voiceAgentSettings2 = voiceSchema2.table("agent_settings", {
  organizationId: text55("organization_id").notNull(),
  paused: boolean17("paused").notNull(),
  greeting: text55("greeting").notNull(),
  voiceStyle: text55("voice_style", { enum: AGENT_VOICE_STYLES2 }).notNull(),
  timeZone: text55("time_zone").notNull(),
  hours: jsonb22("hours").$type().notNull(),
  maxCallSeconds: integer29("max_call_seconds").notNull(),
  maxCostUsdCents: integer29("max_cost_usd_cents").notNull(),
  concurrencyCap: integer29("concurrency_cap").notNull(),
  updatedAt: ts17("updated_at").notNull().defaultNow(),
  updatedByMembershipId: text55("updated_by_membership_id")
}, (t) => [
  primaryKey25({ name: "agent_settings_pkey", columns: [t.organizationId] }),
  check36("agent_settings_organization_id_shape", orgShape12),
  check36("agent_settings_organization_not_global", notGlobal16),
  check36("agent_settings_greeting_shape", sql41`char_length(${t.greeting}) between 1 and ${num8(MAX_AGENT_GREETING_LENGTH2)}`),
  check36("agent_settings_voice_style_known", sql41`${t.voiceStyle} in (${list19(AGENT_VOICE_STYLES2)})`),
  check36("agent_settings_time_zone_shape", sql41`char_length(${t.timeZone}) between 1 and 64
        and ${t.timeZone} collate "C" ~ '^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+){0,2}$'`),
  check36("agent_settings_hours_shape", sql41`jsonb_typeof(${t.hours}) = 'array'
        and jsonb_array_length(${t.hours}) between 1 and ${num8(MAX_AGENT_HOURS_DAYS2)}
        and octet_length(${t.hours}::text) <= 4096`),
  check36("agent_settings_max_call_seconds_range", sql41`${t.maxCallSeconds} between 30 and ${num8(MAX_AGENT_CALL_SECONDS2)}`),
  check36("agent_settings_max_cost_range", sql41`${t.maxCostUsdCents} between 1 and ${num8(MAX_AGENT_CALL_COST_USD_CENTS2)}`),
  check36("agent_settings_concurrency_range", sql41`${t.concurrencyCap} between 1 and ${num8(MAX_AGENT_CONCURRENCY2)}`),
  check36("agent_settings_updated_by_membership_id_shape", idShape19("updated_by_membership_id", "mem"))
]);
var voiceQualificationQuestions2 = voiceSchema2.table("qualification_questions", {
  id: text55("id").notNull(),
  organizationId: text55("organization_id").notNull(),
  position: integer29("position").notNull(),
  prompt: text55("prompt").notNull(),
  kind: text55("kind", { enum: QUALIFICATION_QUESTION_KINDS2 }).notNull(),
  choices: jsonb22("choices").$type(),
  required: boolean17("required").notNull().default(false),
  skipWhen: jsonb22("skip_when").$type().notNull().default([]),
  createdAt: ts17("created_at").notNull().defaultNow(),
  updatedAt: ts17("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey25({ name: "qualification_questions_pkey", columns: [t.organizationId, t.id] }),
  check36("qualification_questions_id_shape", idShape19("id", "qst")),
  check36("qualification_questions_organization_id_shape", orgShape12),
  check36("qualification_questions_organization_not_global", notGlobal16),
  check36("qualification_questions_position_range", sql41`${t.position} between 1 and ${num8(MAX_QUALIFICATION_QUESTIONS2)}`),
  check36("qualification_questions_prompt_shape", sql41`char_length(${t.prompt}) between 1 and ${num8(MAX_QUESTION_PROMPT_LENGTH2)}`),
  check36("qualification_questions_kind_known", sql41`${t.kind} in (${list19(QUALIFICATION_QUESTION_KINDS2)})`),
  check36("qualification_questions_choices_match_kind", sql41`(${t.kind} = 'choice') = (${t.choices} is not null)
        and (${t.choices} is null or (jsonb_typeof(${t.choices}) = 'array'
          and jsonb_array_length(${t.choices}) between ${num8(MIN_QUESTION_CHOICES2)} and ${num8(MAX_QUESTION_CHOICES2)}
          and octet_length(${t.choices}::text) <= 8192))`),
  check36("qualification_questions_skip_when_shape", sql41`jsonb_typeof(${t.skipWhen}) = 'array'
        and jsonb_array_length(${t.skipWhen}) <= ${num8(MAX_SKIP_CONDITIONS2)}
        and octet_length(${t.skipWhen}::text) <= 4096`),
  index45("qualification_questions_order_idx").on(t.organizationId, t.position, t.id)
]);
var voiceQualificationAnswers2 = voiceSchema2.table("qualification_answers", {
  organizationId: text55("organization_id").notNull(),
  inquiryId: text55("inquiry_id").notNull(),
  questionId: text55("question_id").notNull(),
  value: jsonb22("value").$type(),
  skipped: boolean17("skipped").notNull().default(false),
  answeredAt: ts17("answered_at").notNull().defaultNow()
}, (t) => [
  primaryKey25({
    name: "qualification_answers_pkey",
    columns: [t.organizationId, t.inquiryId, t.questionId]
  }),
  check36("qualification_answers_organization_id_shape", orgShape12),
  check36("qualification_answers_organization_not_global", notGlobal16),
  check36("qualification_answers_inquiry_id_shape", idShape19("inquiry_id", "inq")),
  check36("qualification_answers_question_id_shape", idShape19("question_id", "qst")),
  check36("qualification_answers_value_shape", sql41`${t.value} is null or (jsonb_typeof(${t.value}) in ('string', 'number', 'boolean')
        and (jsonb_typeof(${t.value}) <> 'string'
          or char_length(${t.value} #>> '{}') between 1 and ${num8(MAX_ANSWER_LENGTH2)}))`),
  check36("qualification_answers_skipped_has_no_value", sql41`not ${t.skipped} or ${t.value} is null`),
  foreignKey19({
    name: "qualification_answers_inquiry_fk",
    columns: [t.organizationId, t.inquiryId],
    foreignColumns: [voiceInquiries2.organizationId, voiceInquiries2.id]
  }).onDelete("cascade")
]);
var voiceAgentTurns2 = voiceSchema2.table("agent_turns", {
  id: text55("id").notNull(),
  organizationId: text55("organization_id").notNull(),
  callId: text55("call_id"),
  chatId: text55("chat_id"),
  trySessionId: text55("try_session_id"),
  turnIndex: integer29("turn_index").notNull(),
  role: text55("role", { enum: AGENT_TURN_ROLES2 }).notNull(),
  text: text55("text").notNull(),
  deferred: boolean17("deferred").notNull().default(false),
  toolName: text55("tool_name", { enum: AGENT_TOOLS2 }),
  createdAt: ts17("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey25({ name: "agent_turns_pkey", columns: [t.organizationId, t.id] }),
  check36("agent_turns_id_shape", idShape19("id", "trn")),
  check36("agent_turns_organization_id_shape", orgShape12),
  check36("agent_turns_organization_not_global", notGlobal16),
  check36("agent_turns_call_id_shape", idShape19("call_id", "call")),
  check36("agent_turns_chat_id_shape", idShape19("chat_id", "cht")),
  check36("agent_turns_try_session_id_shape", idShape19("try_session_id", "try")),
  check36("agent_turns_one_conversation", sql41`num_nonnulls(${t.callId}, ${t.chatId}, ${t.trySessionId}) = 1`),
  check36("agent_turns_index_range", sql41`${t.turnIndex} >= 0`),
  check36("agent_turns_role_known", sql41`${t.role} in (${list19(AGENT_TURN_ROLES2)})`),
  check36("agent_turns_text_shape", sql41`char_length(${t.text}) between 1 and ${num8(MAX_TURN_TEXT_LENGTH2)}`),
  check36("agent_turns_tool_known", sql41`${t.toolName} is null or ${t.toolName} in (${list19(AGENT_TOOLS2)})`),
  check36("agent_turns_only_agent_acts", sql41`${t.role} = 'agent' or (${t.toolName} is null and not ${t.deferred})`),
  foreignKey19({
    name: "agent_turns_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [voiceCalls2.organizationId, voiceCalls2.id]
  }).onDelete("cascade"),
  foreignKey19({
    name: "agent_turns_chat_fk",
    columns: [t.organizationId, t.chatId],
    foreignColumns: [voiceChats2.organizationId, voiceChats2.id]
  }).onDelete("cascade"),
  uniqueIndex19("agent_turns_call_index_key").on(t.organizationId, t.callId, t.turnIndex).where(sql41`${t.callId} is not null`),
  uniqueIndex19("agent_turns_chat_index_key").on(t.organizationId, t.chatId, t.turnIndex).where(sql41`${t.chatId} is not null`),
  uniqueIndex19("agent_turns_try_index_key").on(t.organizationId, t.trySessionId, t.turnIndex).where(sql41`${t.trySessionId} is not null`)
]);
var voiceAgentTurnSources2 = voiceSchema2.table("agent_turn_sources", {
  organizationId: text55("organization_id").notNull(),
  turnId: text55("turn_id").notNull(),
  position: smallint10("position").notNull(),
  documentId: text55("document_id").notNull(),
  page: integer29("page"),
  passage: text55("passage").notNull()
}, (t) => [
  primaryKey25({
    name: "agent_turn_sources_pkey",
    columns: [t.organizationId, t.turnId, t.position]
  }),
  check36("agent_turn_sources_organization_id_shape", orgShape12),
  check36("agent_turn_sources_organization_not_global", notGlobal16),
  check36("agent_turn_sources_turn_id_shape", idShape19("turn_id", "trn")),
  check36("agent_turn_sources_position_range", sql41`${t.position} between 0 and ${num8(MAX_TURN_SOURCES2 - 1)}`),
  check36("agent_turn_sources_document_id_shape", idShape19("document_id", "doc")),
  check36("agent_turn_sources_page_range", sql41`${t.page} is null or ${t.page} between 1 and ${num8(MAX_DOCUMENT_PAGES2)}`),
  check36("agent_turn_sources_passage_shape", sql41`char_length(${t.passage}) between 1 and ${num8(MAX_COPILOT_QUOTE_LENGTH2)}`),
  foreignKey19({
    name: "agent_turn_sources_turn_fk",
    columns: [t.organizationId, t.turnId],
    foreignColumns: [voiceAgentTurns2.organizationId, voiceAgentTurns2.id]
  }).onDelete("cascade")
]);
var voiceHandoffs2 = voiceSchema2.table("handoffs", {
  id: text55("id").notNull(),
  organizationId: text55("organization_id").notNull(),
  state: text55("state", { enum: HANDOFF_STATES2 }).notNull().default("pending"),
  channel: text55("channel", { enum: HANDOFF_CHANNELS2 }).notNull(),
  callId: text55("call_id"),
  chatId: text55("chat_id"),
  repMembershipId: text55("rep_membership_id"),
  attempt: smallint10("attempt").notNull().default(1),
  reason: text55("reason", { enum: HANDOFF_REASONS2 }).notNull(),
  result: text55("result", { enum: HANDOFF_RESULTS2 }),
  requestedAt: ts17("requested_at").notNull().defaultNow(),
  answeredAt: ts17("answered_at"),
  completedAt: ts17("completed_at"),
  updatedAt: ts17("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey25({ name: "handoffs_pkey", columns: [t.organizationId, t.id] }),
  check36("handoffs_id_shape", idShape19("id", "hof")),
  check36("handoffs_organization_id_shape", orgShape12),
  check36("handoffs_organization_not_global", notGlobal16),
  check36("handoffs_state_known", sql41`${t.state} in (${list19(HANDOFF_STATES2)})`),
  check36("handoffs_channel_known", sql41`${t.channel} in (${list19(HANDOFF_CHANNELS2)})`),
  check36("handoffs_reason_known", sql41`${t.reason} in (${list19(HANDOFF_REASONS2)})`),
  check36("handoffs_result_known", sql41`${t.result} is null or ${t.result} in (${list19(HANDOFF_RESULTS2)})`),
  check36("handoffs_call_id_shape", idShape19("call_id", "call")),
  check36("handoffs_chat_id_shape", idShape19("chat_id", "cht")),
  check36("handoffs_rep_membership_id_shape", idShape19("rep_membership_id", "mem")),
  check36("handoffs_channel_names_its_conversation", sql41`(${t.channel} = 'call' and ${t.callId} is not null and ${t.chatId} is null)
        or (${t.channel} = 'chat' and ${t.chatId} is not null and ${t.callId} is null)`),
  check36("handoffs_attempt_range", sql41`${t.attempt} between 1 and ${num8(MAX_HANDOFF_ATTEMPTS2)}`),
  check36("handoffs_rep_matches_state", sql41`(${t.state} = 'no_rep') = (${t.repMembershipId} is null)`),
  check36("handoffs_answered", sql41`${t.state} not in ('accepted', 'completed') or ${t.answeredAt} is not null`),
  check36("handoffs_completed", sql41`(${t.state} in ('completed', 'no_rep')) = (${t.completedAt} is not null)`),
  check36("handoffs_result_only_when_over", sql41`${t.result} is null or ${t.state} in ('completed', 'no_rep')`),
  check36("handoffs_times_in_order", sql41`(${t.answeredAt} is null or ${t.answeredAt} >= ${t.requestedAt})
        and (${t.completedAt} is null or ${t.completedAt} >= coalesce(${t.answeredAt}, ${t.requestedAt}))`),
  foreignKey19({
    name: "handoffs_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [voiceCalls2.organizationId, voiceCalls2.id]
  }),
  foreignKey19({
    name: "handoffs_chat_fk",
    columns: [t.organizationId, t.chatId],
    foreignColumns: [voiceChats2.organizationId, voiceChats2.id]
  }),
  uniqueIndex19("handoffs_call_live_key").on(t.organizationId, t.callId).where(sql41`${t.callId} is not null and ${t.state} in ('pending', 'accepted')`),
  uniqueIndex19("handoffs_chat_live_key").on(t.organizationId, t.chatId).where(sql41`${t.chatId} is not null and ${t.state} in ('pending', 'accepted')`),
  index45("handoffs_list_idx").on(t.organizationId, t.requestedAt.desc(), t.id.desc()),
  index45("handoffs_state_list_idx").on(t.organizationId, t.state, t.requestedAt.desc(), t.id.desc()),
  index45("handoffs_rep_pending_idx").on(t.organizationId, t.repMembershipId, t.requestedAt).where(sql41`${t.state} = 'pending'`),
  index45("handoffs_call_idx").on(t.organizationId, t.callId).where(sql41`${t.callId} is not null`),
  index45("handoffs_chat_idx").on(t.organizationId, t.chatId).where(sql41`${t.chatId} is not null`)
]);
// src/schema/voice-idempotency.ts
import { sql as sql42 } from "drizzle-orm";
import {
  check as check37,
  customType as customType15,
  index as index46,
  jsonb as jsonb23,
  primaryKey as primaryKey26,
  smallint as smallint11,
  text as text56,
  timestamp as timestamp49
} from "drizzle-orm/pg-core";
var idShape20 = (column, prefix) => sql42.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var bytes14 = customType15({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var voiceIdempotencyKeys2 = voiceSchema2.table("idempotency_keys", {
  organizationId: text56("organization_id").notNull(),
  userId: text56("user_id").notNull(),
  route: text56("route").notNull(),
  key: text56("key").notNull(),
  requestHash: bytes14("request_hash").notNull(),
  status: smallint11("status"),
  response: jsonb23("response").$type(),
  createdAt: timestamp49("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  primaryKey26({
    name: "idempotency_keys_pkey",
    columns: [t.organizationId, t.userId, t.route, t.key]
  }),
  check37("idempotency_keys_organization_id_shape", idShape20("organization_id", "org")),
  check37("idempotency_keys_organization_not_global", sql42.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)),
  check37("idempotency_keys_user_id_shape", idShape20("user_id", "usr")),
  check37("idempotency_keys_route_shape", sql42`char_length(${t.route}) between 1 and ${sql42.raw(String(IDEMPOTENCY_ROUTE_MAX2))}
        and ${t.route} collate "C" ~ '^[a-z0-9._]+$'`),
  check37("idempotency_keys_key_shape", sql42`char_length(${t.key}) between 1 and ${sql42.raw(String(IDEMPOTENCY_KEY_MAX2))}
        and ${t.key} collate "C" ~ '^[!-~]+$'`),
  check37("idempotency_keys_request_hash_length", sql42`octet_length(${t.requestHash}) = ${sql42.raw(String(IDEMPOTENCY_HASH_BYTES2))}`),
  check37("idempotency_keys_status_range", sql42`${t.status} between 100 and 599`),
  check37("idempotency_keys_response_matches_status", sql42`(${t.status} is null) = (${t.response} is null)`),
  check37("idempotency_keys_response_size", sql42`octet_length(${t.response}::text) <= ${sql42.raw(String(IDEMPOTENCY_RESPONSE_MAX_BYTES2))}`),
  index46("idempotency_keys_purge_idx").on(t.organizationId, t.createdAt)
]);
// src/schema/voice-twilio.ts
import { sql as sql43 } from "drizzle-orm";
import {
  boolean as boolean18,
  check as check38,
  foreignKey as foreignKey20,
  index as index47,
  integer as integer30,
  primaryKey as primaryKey27,
  text as text57,
  timestamp as timestamp50
} from "drizzle-orm/pg-core";
var MAX_TWILIO_RING_IDENTITIES2 = 100;
var MAX_TWILIO_PROVIDER_ID_LENGTH2 = 128;
var MAX_TWILIO_PLACEMENT_KEY_LENGTH2 = 255;
var MAX_TWILIO_FINGERPRINT_LENGTH2 = 128;
var TWILIO_DIRECTORY_KINDS2 = ["call", "recording"];
var list20 = (values) => sql43.raw(values.map((v) => `'${v}'`).join(", "));
var orgShape13 = sql43.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal17 = sql43.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var providerIdShape = (column) => sql43.raw(`char_length("${column}") between 1 and ${MAX_TWILIO_PROVIDER_ID_LENGTH2} and "${column}" collate "C" ~ '^[A-Za-z0-9._:-]+$'`);
var ts18 = (name) => timestamp50(name, { withTimezone: true });
var voiceTwilioCalls2 = voiceSchema2.table("twilio_calls", {
  organizationId: text57("organization_id").notNull(),
  providerCallId: text57("provider_call_id").notNull(),
  callId: text57("call_id"),
  direction: text57("direction", { enum: VOICE_CALL_DIRECTIONS2 }).notNull(),
  disclosureWordingVersion: integer30("disclosure_wording_version"),
  disclosureAiAssisted: boolean18("disclosure_ai_assisted"),
  disclosurePlayedAt: ts18("disclosure_played_at"),
  disclosureStarted: boolean18("disclosure_started").notNull().default(false),
  bridgedTo: text57("bridged_to"),
  ringIdentities: text57("ring_identities").array().notNull().default(sql43`'{}'::text[]`),
  recordingId: text57("recording_id"),
  streamId: text57("stream_id"),
  createdAt: ts18("created_at").notNull().defaultNow(),
  updatedAt: ts18("updated_at").notNull().defaultNow(),
  expiresAt: ts18("expires_at").notNull()
}, (t) => [
  primaryKey27({ name: "twilio_calls_pkey", columns: [t.organizationId, t.providerCallId] }),
  check38("twilio_calls_organization_id_shape", orgShape13),
  check38("twilio_calls_organization_not_global", notGlobal17),
  check38("twilio_calls_provider_call_id_shape", providerIdShape("provider_call_id")),
  check38("twilio_calls_call_id_shape", sql43.raw(`"call_id" ~ '^call_[0-9a-f]{32}$'`)),
  check38("twilio_calls_bridged_to_shape", sql43.raw(`"bridged_to" ~ '^mem_[0-9a-f]{32}$'`)),
  check38("twilio_calls_direction_known", sql43`${t.direction} in (${list20(VOICE_CALL_DIRECTIONS2)})`),
  check38("twilio_calls_disclosure_all_or_none", sql43`(${t.disclosureWordingVersion} is null) = (${t.disclosureAiAssisted} is null)
        and (${t.disclosureWordingVersion} is null) = (${t.disclosurePlayedAt} is null)
        and (${t.disclosureWordingVersion} is null or ${t.disclosureWordingVersion} >= 1)`),
  check38("twilio_calls_ring_identities_bounds", sql43`coalesce(cardinality(${t.ringIdentities}), 0) <= ${sql43.raw(String(MAX_TWILIO_RING_IDENTITIES2))}
        and array_position(${t.ringIdentities}, null) is null
        and array_to_string(${t.ringIdentities}, ',') ~ '^(mem_[0-9a-f]{32}(,mem_[0-9a-f]{32})*)?$'`),
  check38("twilio_calls_recording_id_shape", sql43`${t.recordingId} is null or (${sql43.raw(`char_length("recording_id") between 1 and ${MAX_TWILIO_PROVIDER_ID_LENGTH2}`)})`),
  check38("twilio_calls_stream_id_shape", sql43`${t.streamId} is null or (${sql43.raw(`char_length("stream_id") between 1 and ${MAX_TWILIO_PROVIDER_ID_LENGTH2}`)})`),
  check38("twilio_calls_expires_after_creation", sql43`${t.expiresAt} > ${t.createdAt}`),
  index47("twilio_calls_purge_idx").on(t.organizationId, t.expiresAt)
]);
var voiceTwilioRecordings2 = voiceSchema2.table("twilio_recordings", {
  organizationId: text57("organization_id").notNull(),
  recordingId: text57("recording_id").notNull(),
  providerCallId: text57("provider_call_id").notNull(),
  createdAt: ts18("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey27({ name: "twilio_recordings_pkey", columns: [t.organizationId, t.recordingId] }),
  check38("twilio_recordings_organization_id_shape", orgShape13),
  check38("twilio_recordings_organization_not_global", notGlobal17),
  check38("twilio_recordings_recording_id_shape", providerIdShape("recording_id")),
  check38("twilio_recordings_provider_call_id_shape", providerIdShape("provider_call_id")),
  foreignKey20({
    name: "twilio_recordings_call_fk",
    columns: [t.organizationId, t.providerCallId],
    foreignColumns: [voiceTwilioCalls2.organizationId, voiceTwilioCalls2.providerCallId]
  }).onDelete("cascade"),
  index47("twilio_recordings_call_idx").on(t.organizationId, t.providerCallId)
]);
var voiceTwilioPlacements2 = voiceSchema2.table("twilio_placements", {
  organizationId: text57("organization_id").notNull(),
  idempotencyKey: text57("idempotency_key").notNull(),
  providerCallId: text57("provider_call_id").notNull(),
  fingerprint: text57("fingerprint").notNull(),
  createdAt: ts18("created_at").notNull().defaultNow(),
  expiresAt: ts18("expires_at").notNull()
}, (t) => [
  primaryKey27({ name: "twilio_placements_pkey", columns: [t.organizationId, t.idempotencyKey] }),
  check38("twilio_placements_organization_id_shape", orgShape13),
  check38("twilio_placements_organization_not_global", notGlobal17),
  check38("twilio_placements_idempotency_key_shape", sql43`char_length(${t.idempotencyKey}) between 1 and ${sql43.raw(String(MAX_TWILIO_PLACEMENT_KEY_LENGTH2))}`),
  check38("twilio_placements_provider_call_id_shape", providerIdShape("provider_call_id")),
  check38("twilio_placements_fingerprint_shape", sql43`char_length(${t.fingerprint}) between 1 and ${sql43.raw(String(MAX_TWILIO_FINGERPRINT_LENGTH2))}`),
  check38("twilio_placements_expires_after_creation", sql43`${t.expiresAt} > ${t.createdAt}`),
  index47("twilio_placements_purge_idx").on(t.organizationId, t.expiresAt)
]);
var voiceTwilioDirectory2 = voiceSchema2.table("twilio_directory", {
  kind: text57("kind", { enum: TWILIO_DIRECTORY_KINDS2 }).notNull(),
  refId: text57("ref_id").notNull(),
  organizationId: text57("organization_id").notNull(),
  providerCallId: text57("provider_call_id").notNull()
}, (t) => [
  primaryKey27({ name: "twilio_directory_pkey", columns: [t.kind, t.refId] }),
  check38("twilio_directory_kind_known", sql43`${t.kind} in (${list20(TWILIO_DIRECTORY_KINDS2)})`),
  check38("twilio_directory_ref_id_shape", providerIdShape("ref_id")),
  check38("twilio_directory_organization_id_shape", orgShape13),
  check38("twilio_directory_organization_not_global", notGlobal17),
  check38("twilio_directory_provider_call_id_shape", providerIdShape("provider_call_id"))
]);
export { authSchema2, workspaces2, projects2, ENVIRONMENT_KINDS2, environments2, TENANT_SETTING, ABANDON_CASE_MAX_ATTEMPTS2, ABANDON_CASE_OUTCOMES2, abandonCases2, API_KEY_KINDS2, apiKeys2, ATTEMPT_COUNTER_KINDS2, ATTEMPT_COUNTER_MAX_HITS2, ATTEMPT_COUNTER_KEY_HASH_BYTES2, attemptCounters2, AUDIT_ACTOR_TYPES2, AUDIT_RETENTION_FLOOR2, auditLogs2, users2, backupCodes2, CREDENTIAL_TYPES2, credentials2, environmentSettings2, EVENT_RETENTION_FLOOR2, events2, flowAttempts2, hooks2, hookCallCounts2, IDENTITY_PROVIDERS2, identities2, instanceAuditLogs2, nativeApps2, OAUTH_PROVIDERS2, oauthProviders2, PASSKEY_CHALLENGE_PURPOSES2, passkeyChallenges2, passkeys2, passwordHistory2, proposals2, SESSION_CLIENTS2, SESSION_REVOKE_REASONS2, SESSION_TYPES2, sessions2, refreshTokens2, SIGNING_KEY_STATUSES2, signingKeys2, SMS_COUNT_RETENTION_FLOOR_DAYS2, smsCodeCounts2, USER_FACTOR_TYPES2, userFactors2, VERIFICATION_PURPOSES2, verificationTokens2, webhookEndpoints2, WEBHOOK_DELIVERY_STATES2, WEBHOOK_DELIVERY_RETENTION_FLOOR2, webhookDeliveries2, webhookDeliveryAttempts2, coreSchema2, MEMBERSHIP_ROLES2, INVITATION_ROLES2, ORGANIZATION_REGIONS2, ORGANIZATION_STATUSES2, INVITATION_STATES2, MEMBER_NAME_MAX2, IDEMPOTENCY_ROUTE_MAX2, IDEMPOTENCY_KEY_MAX2, IDEMPOTENCY_HASH_BYTES2, IDEMPOTENCY_RESPONSE_MAX_BYTES2, organizations2, memberships2, teams2, teamMembers2, invitations2, membershipDirectory2, invitationDirectory2, organizationState2, idempotencyKeys2, ROLLUP_METRICS2, ROLLUP_GROUP_KINDS2, MAX_ROLLUP_GROUP_KEY_LENGTH2, MAX_ROLLUP_COUNT2, TOUCH_KINDS2, TOUCH_CHANNELS2, TOUCH_AGENT_KINDS2, MAX_TOUCH_SOURCES2, SOURCE_KINDS2, MAX_SOURCE_KEY_LENGTH2, SOURCE_PERFORMANCE_FLAGS2, MAX_SOURCE_DEALS2, ASSESSMENT_SUBJECT_KINDS2, ASSESSMENT_VERDICTS2, ASSESSMENT_JUDGE_SOURCES2, FINDING_CATEGORIES2, FINDING_SEVERITIES2, FINDING_FEEDBACKS2, MAX_FINDING_SPAN_OFFSET2, MAX_FINDING_EXPLANATION_LENGTH2, MAX_ASSESSED_NUMBER2, CONVERSATION_OUTCOME_LABELS2, MAX_SUMMARY_LENGTH2, rollupDaily2, analyticsEvents2, touches2, sourcePerformance2, assessments2, assessmentFindings2, conversationSummaries2, PROSPECT_IDENTITY_KINDS2, PROSPECT_STATUSES2, PROSPECT_FIELD_NAMES2, PROSPECT_COMPANY_FIELD_NAMES2, MAX_PROSPECT_COMPANY_TEXT_LENGTH2, MAX_PROSPECT_TECHNOLOGIES_VALUE_LENGTH2, MAX_PROSPECT_COMPANY_TECHNOLOGIES2, MAX_PROSPECT_COMPANY_TECHNOLOGY_LENGTH2, FIELD_HISTORY_STATES2, MAX_FIELD_HISTORY_ENTRIES2, MAX_PROSPECT_FIELD_VALUE_LENGTH2, MAX_SOURCE_REF_LENGTH2, MAX_PROSPECT_COMPANY_NAME_LENGTH2, MAX_PROSPECT_NOTES_LENGTH2, MAX_PROSPECT_TAG_LENGTH2, MAX_PROSPECT_TAGS2, MAX_PROSPECT_IMPORT_BYTES2, MAX_PROSPECT_IMPORT_ROWS2, PROSPECT_IMPORT_STATES2, PROSPECT_IMPORT_FAILURE_REASONS2, PROSPECT_IMPORT_ROW_RESULTS2, PROSPECT_IMPORT_SKIP_REASONS2, PROSPECT_IMPORT_REJECT_REASONS2, PROSPECT_MERGE_STATES2, PROSPECT_MERGE_UNDO_DAYS2, MAX_MERGED_PROSPECTS2, MAX_MERGE_SNAPSHOT_BYTES2, SOURCE_KIND_PATTERN2, IDENTITY_VALUE_PATTERNS2, prospectCompanies2, prospects2, prospectIdentities2, prospectFields2, prospectCompanyFields2, prospectImports2, prospectImportRows2, prospectMerges2, CONSENT_CHANNELS2, CONSENT_GRANT_SOURCES2, CONSENT_WITHDRAWAL_SOURCES2, CONSENT_EVENT_KINDS2, MAX_EVIDENCE_REF_LENGTH2, MAX_SUBMISSION_IP_LENGTH2, MAX_SUBMISSION_USER_AGENT_LENGTH2, MAX_CONSENT_WORDING_LENGTH2, MAX_CONSENT_FORM_NAME_LENGTH2, CONSENT_FORM_STATES2, SUPPRESSION_REASONS2, SUPPRESSION_ADDRESS_KINDS2, SUPPRESSION_REMOVABLE_REASONS2, MAX_SUPPRESSION_NOTE_LENGTH2, MAX_SUPPRESSION_SOURCE_REF_LENGTH2, MAX_MASKED_ADDRESS_LENGTH2, CONTACT_PURPOSES2, LOGGED_DENIAL_CODES2, CONTACT_ALLOW_BASES2, MAX_CALLER_LENGTH2, ADDRESS_HASH_BYTES2, CONTACT_CHECK_RETENTION_DAYS2, FORM_TOKEN_PATTERN2, MIN_FORM_TOKEN_LENGTH2, MAX_FORM_TOKEN_LENGTH2, consentWordings2, consentForms2, consentFormDirectory2, contactConsentEvents2, suppressionEntries2, contactCheckLog2, AGENT_KINDS2, MAX_AGENT_INSTRUCTION_LENGTH2, CONTROL_LEVELS2, AGENT_SETTING_CHANNELS2, DEFAULT_CHANNEL2, ORGANIZATION_AGENT_KIND2, MAX_ESCALATION_RULES2, AUDIT_ACTOR_KINDS2, MAX_AUDIT_METADATA_BYTES2, EXPORT_KINDS2, EXPORT_FORMATS2, EXPORT_STATES2, EXPORT_ACTIVE_STATES2, EXPORT_FAILURE_REASONS2, EXPORT_SERVICES2, EXPORT_PART_STATES2, EXPORT_PART_FAILURE_REASONS2, MAX_EXPORT_PART_FILES2, MAX_EXPORT_PART_BYTES2, MAX_EXPORT_PREFIX_LENGTH2, API_KEY_SCOPES2, MAX_API_KEY_NAME_LENGTH2, API_KEY_ROLE_CEILINGS2, agentInstructionVersions2, agentInstructionPointers2, agentSettings2, auditEvents2, exportJobs2, exportParts2, coreApiKeys2, apiKeyUsage2, CRM_PROVIDERS2, CRM_OBJECT_KINDS2, CRM_SCOPE_LEVELS2, CRM_CONNECTION_STATES2, CRM_DIRECTIONS2, CRM_STAGE_OUTCOMES2, CRM_FIELD_KEYS2, CRM_MAPPING_KINDS2, CRM_RUN_TRIGGERS2, CRM_RUN_STATES2, CRM_RUN_ERROR_CODES2, CRM_REF_STATES2, MAX_CRM_EXTERNAL_ID_LENGTH2, MAX_CRM_LABEL_LENGTH2, MAX_CRM_RUN_COUNT2, CRM_SKIP_REASON_COUNT2, MAX_CRM_RUN_FAILURES2, MAX_CRM_SEALED_TOKEN_BYTES2, MAX_CRM_KEY_ID_LENGTH2, MAX_CRM_CURSOR_LENGTH2, MAX_CRM_WRITE_KEY_LENGTH2, MAX_CRM_LOCAL_ID_LENGTH2, CRM_WEBHOOK_WINDOW_SECONDS2, crmConnections2, crmMappings2, crmSyncRuns2, crmExternalRefs2, crmWebhookReceipts2, DEMO_RATE_ADDRESS_HASH_BYTES2, demoRateCounters2, DEMO_NOTIFICATION_STATUSES2, DEMO_REQUEST_NAME_MAX2, DEMO_REQUEST_MESSAGE_MAX2, DEMO_REQUEST_SOURCE_PAGE_MAX2, DEMO_REQUEST_KEY_LENGTH2, demoRequests2, INBOX_CHANNELS2, CONVERSATION_CONTROLLERS2, CONVERSATION_STATES2, MESSAGE_DIRECTIONS2, MESSAGE_AUTHOR_KINDS2, REPLY_LABELS2, CLASSIFICATION_DECIDERS2, MAX_MESSAGE_BODY_LENGTH2, MAX_PROVIDER_MESSAGE_ID_LENGTH2, MAX_PENDING_DRAFT_COUNT2, DRAFT_AUTHORS2, DRAFT_STATUSES2, DRAFT_HOLD_REASONS2, MAX_STRATEGY_LENGTH2, MAX_DRAFT_CHECKS2, DRAFT_SOURCE_KINDS2, SOURCE_OUTCOMES2, MAX_EVIDENCE_COUNT2, DECISION_KINDS2, MAX_DECISION_NOTE_LENGTH2, APPROVAL_MODES2, MAX_EXCEPT_LABELS2, ESCALATION_TRIGGERS2, ESCALATION_TARGETS2, conversations2, messages2, drafts2, draftSources2, approvalDecisions2, approvalPolicies2, escalationRules2, OUTBOX_MAX_ATTEMPTS2, OUTBOX_TOPIC_MAX_LENGTH2, OUTBOX_DEDUPE_KEY_MAX_LENGTH2, OUTBOX_PAYLOAD_MAX_BYTES2, OUTBOX_ERROR_CODE_MAX_LENGTH2, OUTBOX_MAX_BATCH2, OUTBOX_MIN_LEASE_MS2, OUTBOX_MAX_LEASE_MS2, OUTBOX_MAX_RETRY_DELAY_MS2, outbox2, outboundSchema2, MAILBOX_PROVIDERS2, MAILBOX_KINDS2, MAILBOX_STATES2, MAILBOX_STATE_REASONS2, HEALTH_EFFECTS2, WEEKDAYS2, SEND_STATES2, SEND_REFUSAL_REASONS2, SEND_DEFERRING_REASONS2, SEND_CHECKS2, MAIL_EVENT_KINDS2, HEALTH_COMPONENT_KINDS2, MAX_MAILBOX_TEAMS2, MAX_MAILBOX_NAME_LENGTH2, MAX_SENDS_PER_DAY2, MAX_SENDS_PER_HOUR2, MAX_MIN_GAP_SECONDS2, MAX_SEQUENCE_STEP2, MAX_ATTEMPT_EPOCH2, MAX_MAIL_PROVIDER_MESSAGE_ID_LENGTH2, MAX_PROVIDER_REFERENCE_LENGTH2, MAX_TOKEN_CIPHERTEXT_BYTES2, MAX_HEALTH_COMPONENTS2, MAX_HEALTH_COUNT2, mailboxes2, mailboxLimits2, mailMessages2, mailEvents2, healthDaily2, DRAFT_CHANNELS2, OUTBOUND_LANGUAGES2, DRAFT_CHECKS2, DRAFT_CHECK_RESULTS2, DRAFT_TEXT_SOURCES2, ANGLE_ORIGINS2, CITATION_KINDS2, CITATION_PROSPECT_FIELDS2, BRIEF_ENTRY_ROLES2, MAX_BRIEF_STATEMENTS2, MAX_BRIEF_STATEMENT_LENGTH2, MAX_ANGLE_LENGTH2, MAX_DRAFT_CITATIONS2, MAX_DRAFT_SUBJECT_LENGTH2, MAX_DRAFT_BODY_LENGTH2, MAX_DRAFT_GOAL_LENGTH2, MAX_STEP_KEY_LENGTH2, MAX_MODEL_NAME_LENGTH2, MAX_TONE_LENGTH2, MAX_PREFERRED_WORDS2, MAX_BANNED_PHRASES2, MAX_VOICE_TERM_LENGTH2, MAX_SIGN_OFF_LENGTH2, MAX_VOICE_LENGTH_CHARACTERS2, MIN_VOICE_LENGTH_CHARACTERS2, MAX_VOICE_VERSION2, MAX_CITATION_URL_LENGTH2, MAX_CITATION_DOCUMENT_PAGE2, MAX_DRAFT_REVISION2, MAX_WON_DEAL_COUNT2, MAX_CHECK_COUNT2, MAX_DROPPED_COUNT2, outboundBrandVoices2, outboundBriefs2, outboundBriefStatements2, outboundDrafts2, outboundDraftCitations2, outboundDraftChecks2, outboundModelUsage2, CAMPAIGN_STATES2, CAMPAIGN_APPROVAL_MODES2, WINDOW_ZONES2, STEP_KINDS2, STEP_TASKS2, MAX_SEQUENCE_STEPS2, ENROLLMENT_STATES2, ENROLLMENT_STOP_REASONS2, ENROLLMENT_EVENT_KINDS2, PLAY_INTENTS2, PLAY_SOURCES2, PLAY_STATUSES2, PLAY_CITATION_KINDS2, PROMOTION_SOURCES2, OUTBOUND_WORK_KINDS2, MAX_CAMPAIGN_NAME_LENGTH2, MAX_DAILY_CAP2, MAX_CAMPAIGN_VERSION2, MAX_STEP_HOURS2, MAX_TASK_INSTRUCTION_LENGTH2, MAX_BRANCH_ARMS2, MAX_VARIANT_WEIGHT2, MAX_VARIANT_LABEL_LENGTH2, MAX_VARIANT_ANGLE_LENGTH2, MAX_PLAY_EVIDENCE2, MAX_PLAY_CITATIONS2, MAX_PLAY_STEPS2, outboundPlays2, outboundPlayCitations2, outboundCampaigns2, outboundSequences2, outboundSteps2, outboundVariants2, outboundEnrollments2, outboundEnrollmentEvents2, outboundSendDecisions2, outboundWorkHints2, FIELD_GROUPS2, RUN_STATUSES2, FINAL_RUN_STATUSES2, STOP_REASONS2, ATTEMPT_OUTCOMES2, SKIPPED_ATTEMPT_OUTCOMES2, ATTEMPT_FAILURES2, SIGNAL_KINDS2, SIGNAL_SOURCE_TYPES2, FIT_FIELDS2, FIT_OPERATORS2, MAX_ATTEMPTS_PER_RUN2, MAX_RUN_FIELDS2, MAX_PROVIDERS2, MAX_PROVIDER_KEY_LENGTH2, MAX_MICRO_DOLLARS2, MAX_ATTEMPT_DURATION_MS2, MAX_RESERVATION_HOLD_KEY_LENGTH2, MAX_RUN_REQUEST_ID_LENGTH2, MAX_SIGNAL_DETAIL_BYTES2, MAX_FIT_CONDITION_BYTES2, MAX_FIT_VALUES2, MAX_FIT_NAME_LENGTH2, MAX_FIT_WEIGHT2, MAX_CREDENTIAL_CIPHERTEXT_BYTES2, MAX_CREDENTIAL_KEY_ID_LENGTH2, enrichmentRuns2, enrichmentAttempts2, signals2, fitCriteria2, providerSettings2, enrichmentSpend2, enrichmentReservations2, playbookSchema2, DOCUMENT_STATES2, DOCUMENT_FAILURE_REASONS2, DOCUMENT_FILE_TYPES2, DOCUMENT_MAX_BYTES2, DOCUMENT_MAX_PAGE_COUNT2, DOCUMENT_PURGE_MAX_ATTEMPTS2, INGESTION_JOB_STATES2, INGESTION_STEPS2, INGESTION_JOB_MAX_ATTEMPTS2, INGESTION_MAX_CHUNKS2, CONSUMED_MESSAGE_STATES2, GLOBAL_SCOPE_ORGANIZATION_ID2, PENDING_CLEANUP_PREDICATE2, documents2, organizationUsage2, ingestionJobs2, indexSettings2, DEAL_OUTCOMES2, DEAL_IMPORT_STATES2, DEAL_IMPORT_FAILURE_REASONS2, DEAL_IMPORT_ROW_RESULTS2, DEAL_IMPORT_ROW_REASONS2, DEAL_IMPORT_ROW_REASONS_WITHOUT_DEAL_ID2, MAX_QUEUED_DEAL_IMPORTS2, DEAL_ID_MAX_LENGTH2, DEAL_ID_MAX_BYTES2, DEAL_NAME_MAX_LENGTH2, DEAL_NAME_MAX_BYTES2, DEAL_IMPORT_MAX_ROWS2, DEAL_IMPORT_MAX_BYTES2, DEAL_MAX_SEQ2, RIGHTS_MAX_WORDING_VERSION2, DEAL_IMPORT_MAX_ATTEMPTS2, DEAL_IMPORT_APPLY_BATCH2, deals2, dealImports2, dealImportRows2, rightsConfirmations2, CALL_STATES2, CALL_FAILURE_REASONS2, CALL_KINDS2, CALL_MEDIA_TYPES2, CALL_CHANNELS2, CALL_REP_BY2, CALL_MAX_TRANSCRIPT_BYTES2, CALL_MAX_RECORDING_BYTES2, CALL_MAX_RECORDING_SECONDS2, CALL_MAX_SPEAKERS2, CALL_SPEAKER_LABEL_MAX_LENGTH2, CALL_SPEAKER_LABEL_MAX_BYTES2, CALL_MAX_SEQ2, CALL_MAX_MOMENTS2, CALL_PURGE_MAX_ATTEMPTS2, CALL_JOB_MAX_ATTEMPTS2, CALL_MAX_VENDOR_SENDS2, MAX_SEARCH_STATE_IDS2, CALL_VENDOR_ID_PATTERN2, CALL_JOB_KINDS2, CALL_JOB_STATES2, repChangeAllowed2, callReuploadRequeues2, CALL_PENDING_CLEANUP_PREDICATE2, CALL_ORIGINS2, calls2, callJobs2, callVendorSends2, consumedMessage2, EMBED_USAGE_MAX_ADD2, EMBED_USAGE_MAX_MOMENTS2, playbookEmbedUsage2, INTERNAL_CALL_USER_ID2, playbookIdempotencyKeys2, ORPHAN_SWEEP_CURSOR_MAX_BYTES2, ORPHAN_SWEEP_MIN_CLAIM_MS2, ORPHAN_SWEEP_MAX_CLAIM_MS2, playbookOrphanSweeps2, SUGGESTION_KINDS2, SUGGESTION_STATUSES2, MAX_SUGGESTION_TEXT_LENGTH2, MAX_SUGGESTION_MOMENTS2, SUGGESTION_FINGERPRINT_BYTES2, suggestions2, WORK_KINDS2, playbookWorkHints2, voiceSchema2, LINE_STATES2, LINE_ASSIGNMENT_KINDS2, MAX_LINE_LABEL_LENGTH2, VOICE_CALL_DIRECTIONS2, VOICE_CALL_STATES2, VOICE_CALL_FINAL_STATES2, VOICE_CALL_FAILURE_REASONS2, VOICE_CALL_ENDED_BY2, VOICE_TRANSCRIPT_STATES2, MAX_CALL_DURATION_SECONDS2, MAX_WRAP_UP_NOTE_LENGTH2, VOICE_RECORDING_STATES2, MAX_RECORDING_KEY_LENGTH2, VOICE_RECORDING_CHANNELS2, VOICE_CALL_EVENT_KINDS2, MAX_PROVIDER_EVENT_ID_LENGTH2, MAX_VOICE_IDEMPOTENCY_KEY_LENGTH2, voiceLines2, voiceLineDirectory2, voiceCalls2, voiceCallEvents2, voiceRecordings2, INQUIRY_SOURCES2, INQUIRY_CALLBACK_STATES2, INQUIRY_SKIP_REASONS2, MAX_CALLBACK_ATTEMPTS2, MAX_SOURCE_URL_LENGTH2, MIN_AGENT_IDEMPOTENCY_KEY_LENGTH2, MAX_AGENT_IDEMPOTENCY_KEY_LENGTH2, AGENT_VOICE_STYLES2, MAX_AGENT_CALL_SECONDS2, MAX_AGENT_CALL_COST_USD_CENTS2, MAX_AGENT_CONCURRENCY2, MAX_AGENT_GREETING_LENGTH2, MAX_AGENT_HOURS_DAYS2, QUALIFICATION_QUESTION_KINDS2, MAX_QUALIFICATION_QUESTIONS2, MAX_QUESTION_PROMPT_LENGTH2, MAX_ANSWER_LENGTH2, MIN_QUESTION_CHOICES2, MAX_QUESTION_CHOICES2, MAX_SKIP_CONDITIONS2, MAX_QUALIFICATION_SUMMARY_LENGTH2, AGENT_TURN_ROLES2, AGENT_TOOLS2, MAX_TURN_TEXT_LENGTH2, MAX_TURN_SOURCES2, MAX_DOCUMENT_PAGES2, MAX_COPILOT_QUOTE_LENGTH2, HANDOFF_CHANNELS2, HANDOFF_STATES2, HANDOFF_REASONS2, HANDOFF_RESULTS2, MAX_HANDOFF_ATTEMPTS2, CHAT_STATES2, CHAT_TOKEN_HASH_BYTES2, voiceChats2, voiceInquiries2, voiceAgentSettings2, voiceQualificationQuestions2, voiceQualificationAnswers2, voiceAgentTurns2, voiceAgentTurnSources2, voiceHandoffs2, voiceIdempotencyKeys2, MAX_TWILIO_RING_IDENTITIES2, MAX_TWILIO_PROVIDER_ID_LENGTH2, MAX_TWILIO_PLACEMENT_KEY_LENGTH2, MAX_TWILIO_FINGERPRINT_LENGTH2, TWILIO_DIRECTORY_KINDS2, voiceTwilioCalls2, voiceTwilioRecordings2, voiceTwilioPlacements2, voiceTwilioDirectory2, exports_schema };
