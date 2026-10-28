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
  AGENT_CALL_END_REASONS: () => AGENT_CALL_END_REASONS2,
  AGENT_CALL_NUMBER_HASH_BYTES: () => AGENT_CALL_NUMBER_HASH_BYTES2,
  AGENT_CALL_SOURCES: () => AGENT_CALL_SOURCES2,
  AGENT_CALL_STATES: () => AGENT_CALL_STATES2,
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
  BOOKING_MODES: () => BOOKING_MODES2,
  BOOKING_ORIGINS: () => BOOKING_ORIGINS2,
  BOOKING_STATES: () => BOOKING_STATES2,
  BRIEF_ENTRY_ROLES: () => BRIEF_ENTRY_ROLES2,
  CALENDAR_CONNECTION_STATES: () => CALENDAR_CONNECTION_STATES2,
  CALENDAR_PROVIDERS: () => CALENDAR_PROVIDERS2,
  CALL_CHANNELS: () => CALL_CHANNELS2,
  CALL_END_REASONS: () => CALL_END_REASONS2,
  CALL_FAILURE_REASONS: () => CALL_FAILURE_REASONS2,
  CALL_GATE_CODES: () => CALL_GATE_CODES2,
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
  CALL_RESULTS: () => CALL_RESULTS2,
  CALL_SPEAKER_LABEL_MAX_BYTES: () => CALL_SPEAKER_LABEL_MAX_BYTES2,
  CALL_SPEAKER_LABEL_MAX_LENGTH: () => CALL_SPEAKER_LABEL_MAX_LENGTH2,
  CALL_STATES: () => CALL_STATES2,
  CALL_TURN_TRACKS: () => CALL_TURN_TRACKS2,
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
  COPILOT_CARD_KINDS: () => COPILOT_CARD_KINDS2,
  COPILOT_OBJECTION_TYPES: () => COPILOT_OBJECTION_TYPES2,
  COPILOT_RATINGS: () => COPILOT_RATINGS2,
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
  DEFAULT_COPILOT_MIN_DEALS: () => DEFAULT_COPILOT_MIN_DEALS2,
  DEFAULT_COPILOT_MIN_MOMENTS: () => DEFAULT_COPILOT_MIN_MOMENTS2,
  DEFAULT_LINE_CONCURRENT_AGENT_CALLS: () => DEFAULT_LINE_CONCURRENT_AGENT_CALLS2,
  DEFAULT_LINE_DAILY_AGENT_DIAL_CAP: () => DEFAULT_LINE_DAILY_AGENT_DIAL_CAP2,
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
  LINE_ASSIGNMENT_ROLES: () => LINE_ASSIGNMENT_ROLES2,
  LINE_STATES: () => LINE_STATES2,
  LINKEDIN_ACCOUNT_STATUSES: () => LINKEDIN_ACCOUNT_STATUSES2,
  LINKEDIN_DAILY_CONNECTION_CEILING: () => LINKEDIN_DAILY_CONNECTION_CEILING2,
  LINKEDIN_DAILY_MESSAGE_CEILING: () => LINKEDIN_DAILY_MESSAGE_CEILING2,
  LINKEDIN_PAUSE_REASONS: () => LINKEDIN_PAUSE_REASONS2,
  LINKEDIN_SEND_KINDS: () => LINKEDIN_SEND_KINDS2,
  LINKEDIN_SEND_STATES: () => LINKEDIN_SEND_STATES2,
  LINKEDIN_WEEKLY_CONNECTION_CEILING: () => LINKEDIN_WEEKLY_CONNECTION_CEILING2,
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
  MAX_CALL_ATTEMPTS: () => MAX_CALL_ATTEMPTS2,
  MAX_CALL_DURATION_SECONDS: () => MAX_CALL_DURATION_SECONDS2,
  MAX_CALL_TURN_TEXT_LENGTH: () => MAX_CALL_TURN_TEXT_LENGTH2,
  MAX_CAMPAIGN_NAME_LENGTH: () => MAX_CAMPAIGN_NAME_LENGTH2,
  MAX_CAMPAIGN_VERSION: () => MAX_CAMPAIGN_VERSION2,
  MAX_CHECK_COUNT: () => MAX_CHECK_COUNT2,
  MAX_CITATION_DOCUMENT_PAGE: () => MAX_CITATION_DOCUMENT_PAGE2,
  MAX_CITATION_URL_LENGTH: () => MAX_CITATION_URL_LENGTH2,
  MAX_CONSENT_FORM_NAME_LENGTH: () => MAX_CONSENT_FORM_NAME_LENGTH2,
  MAX_CONSENT_WORDING_LENGTH: () => MAX_CONSENT_WORDING_LENGTH2,
  MAX_COPILOT_CARDS_PER_CALL: () => MAX_COPILOT_CARDS_PER_CALL2,
  MAX_COPILOT_CARD_TEXT_LENGTH: () => MAX_COPILOT_CARD_TEXT_LENGTH2,
  MAX_COPILOT_CITED_MOMENTS: () => MAX_COPILOT_CITED_MOMENTS2,
  MAX_COPILOT_EVIDENCE: () => MAX_COPILOT_EVIDENCE2,
  MAX_COPILOT_MIN_EVIDENCE: () => MAX_COPILOT_MIN_EVIDENCE2,
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
  MAX_FIT_MATCHES_BYTES: () => MAX_FIT_MATCHES_BYTES2,
  MAX_FIT_NAME_LENGTH: () => MAX_FIT_NAME_LENGTH2,
  MAX_FIT_VALUES: () => MAX_FIT_VALUES2,
  MAX_FIT_WEIGHT: () => MAX_FIT_WEIGHT2,
  MAX_FORM_TOKEN_LENGTH: () => MAX_FORM_TOKEN_LENGTH2,
  MAX_HANDOFF_ATTEMPTS: () => MAX_HANDOFF_ATTEMPTS2,
  MAX_HEALTH_COMPONENTS: () => MAX_HEALTH_COMPONENTS2,
  MAX_HEALTH_COUNT: () => MAX_HEALTH_COUNT2,
  MAX_LINE_CONCURRENT_AGENT_CALLS: () => MAX_LINE_CONCURRENT_AGENT_CALLS2,
  MAX_LINE_DAILY_AGENT_DIAL_CAP: () => MAX_LINE_DAILY_AGENT_DIAL_CAP2,
  MAX_LINE_LABEL_LENGTH: () => MAX_LINE_LABEL_LENGTH2,
  MAX_LINKEDIN_PROVIDER_REFERENCE_LENGTH: () => MAX_LINKEDIN_PROVIDER_REFERENCE_LENGTH2,
  MAX_LINKEDIN_SEND_KEY_LENGTH: () => MAX_LINKEDIN_SEND_KEY_LENGTH2,
  MAX_LINKEDIN_TYPED_NAME_LENGTH: () => MAX_LINKEDIN_TYPED_NAME_LENGTH2,
  MAX_LINKEDIN_WORDING_VERSION_LENGTH: () => MAX_LINKEDIN_WORDING_VERSION_LENGTH2,
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
  MAX_ROUTING_POOL_MEMBERS: () => MAX_ROUTING_POOL_MEMBERS2,
  MAX_ROUTING_RULES: () => MAX_ROUTING_RULES2,
  MAX_RUN_FIELDS: () => MAX_RUN_FIELDS2,
  MAX_RUN_REQUEST_ID_LENGTH: () => MAX_RUN_REQUEST_ID_LENGTH2,
  MAX_SEARCH_STATE_IDS: () => MAX_SEARCH_STATE_IDS2,
  MAX_SENDS_PER_DAY: () => MAX_SENDS_PER_DAY2,
  MAX_SENDS_PER_HOUR: () => MAX_SENDS_PER_HOUR2,
  MAX_SEQUENCE_STEP: () => MAX_SEQUENCE_STEP2,
  MAX_SEQUENCE_STEPS: () => MAX_SEQUENCE_STEPS2,
  MAX_SIGNAL_DETAIL_BYTES: () => MAX_SIGNAL_DETAIL_BYTES2,
  MAX_SIGNAL_KINDS_BYTES: () => MAX_SIGNAL_KINDS_BYTES2,
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
  MAX_SUPPRESSION_IMPORT_BYTES: () => MAX_SUPPRESSION_IMPORT_BYTES2,
  MAX_SUPPRESSION_IMPORT_ROWS: () => MAX_SUPPRESSION_IMPORT_ROWS2,
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
  MAX_WEBHOOK_SECRET_CIPHERTEXT_BYTES: () => MAX_WEBHOOK_SECRET_CIPHERTEXT_BYTES2,
  MAX_WON_DEAL_COUNT: () => MAX_WON_DEAL_COUNT2,
  MAX_WORKING_WINDOWS: () => MAX_WORKING_WINDOWS2,
  MAX_WRAP_UP_NOTE_LENGTH: () => MAX_WRAP_UP_NOTE_LENGTH2,
  MEMBERSHIP_ROLES: () => MEMBERSHIP_ROLES2,
  MEMBER_NAME_MAX: () => MEMBER_NAME_MAX2,
  MESSAGE_AUTHOR_KINDS: () => MESSAGE_AUTHOR_KINDS2,
  MESSAGE_DIRECTIONS: () => MESSAGE_DIRECTIONS2,
  MIN_AGENT_IDEMPOTENCY_KEY_LENGTH: () => MIN_AGENT_IDEMPOTENCY_KEY_LENGTH2,
  MIN_COPILOT_MIN_EVIDENCE: () => MIN_COPILOT_MIN_EVIDENCE2,
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
  REFRESH_SEALED_NEXT_TOKEN_MAX_BYTES: () => REFRESH_SEALED_NEXT_TOKEN_MAX_BYTES2,
  REPLY_LABELS: () => REPLY_LABELS2,
  RIGHTS_MAX_WORDING_VERSION: () => RIGHTS_MAX_WORDING_VERSION2,
  ROLLUP_GROUP_KINDS: () => ROLLUP_GROUP_KINDS2,
  ROLLUP_METRICS: () => ROLLUP_METRICS2,
  ROUTING_PURPOSES: () => ROUTING_PURPOSES2,
  ROUTING_TARGET_KINDS: () => ROUTING_TARGET_KINDS2,
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
  SUPPRESSION_IMPORT_FAILURE_REASONS: () => SUPPRESSION_IMPORT_FAILURE_REASONS2,
  SUPPRESSION_IMPORT_ROW_REASONS: () => SUPPRESSION_IMPORT_ROW_REASONS2,
  SUPPRESSION_IMPORT_ROW_RESULTS: () => SUPPRESSION_IMPORT_ROW_RESULTS2,
  SUPPRESSION_IMPORT_STATES: () => SUPPRESSION_IMPORT_STATES2,
  SUPPRESSION_REASONS: () => SUPPRESSION_REASONS2,
  SUPPRESSION_REMOVABLE_REASONS: () => SUPPRESSION_REMOVABLE_REASONS2,
  TOUCH_AGENT_KINDS: () => TOUCH_AGENT_KINDS2,
  TOUCH_CHANNELS: () => TOUCH_CHANNELS2,
  TOUCH_KINDS: () => TOUCH_KINDS2,
  TWILIO_DIRECTORY_KINDS: () => TWILIO_DIRECTORY_KINDS2,
  UNSUBSCRIBE_RATE_KEY_HASH_BYTES: () => UNSUBSCRIBE_RATE_KEY_HASH_BYTES2,
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
  VOICE_TRANSCRIPT_UNAVAILABLE_REASONS: () => VOICE_TRANSCRIPT_UNAVAILABLE_REASONS2,
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
  bookingManageDirectory: () => bookingManageDirectory2,
  bookingTypeDirectory: () => bookingTypeDirectory2,
  bookingTypes: () => bookingTypes2,
  bookings: () => bookings2,
  busyBlocks: () => busyBlocks2,
  calendarConnections: () => calendarConnections2,
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
  fitScores: () => fitScores2,
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
  linkedinAccounts: () => linkedinAccounts2,
  linkedinChannelSettings: () => linkedinChannelSettings2,
  linkedinRiskAcceptances: () => linkedinRiskAcceptances2,
  linkedinSends: () => linkedinSends2,
  linkedinUsage: () => linkedinUsage2,
  liveCallWaits: () => liveCallWaits2,
  mailEvents: () => mailEvents2,
  mailMessages: () => mailMessages2,
  mailboxConnectAttempts: () => mailboxConnectAttempts2,
  mailboxLimits: () => mailboxLimits2,
  mailboxTestSends: () => mailboxTestSends2,
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
  routingDecisions: () => routingDecisions2,
  routingRules: () => routingRules2,
  routingState: () => routingState2,
  sessions: () => sessions2,
  signalSettings: () => signalSettings2,
  signals: () => signals2,
  signingKeys: () => signingKeys2,
  smsCodeCounts: () => smsCodeCounts2,
  sourcePerformance: () => sourcePerformance2,
  suggestions: () => suggestions2,
  suppressionEntries: () => suppressionEntries2,
  suppressionImportRows: () => suppressionImportRows2,
  suppressionImports: () => suppressionImports2,
  teamMembers: () => teamMembers2,
  teams: () => teams2,
  touches: () => touches2,
  unsubscribeRateCounters: () => unsubscribeRateCounters2,
  userFactors: () => userFactors2,
  users: () => users2,
  verificationTokens: () => verificationTokens2,
  voiceAgentCalls: () => voiceAgentCalls2,
  voiceAgentSettings: () => voiceAgentSettings2,
  voiceAgentTurnSources: () => voiceAgentTurnSources2,
  voiceAgentTurns: () => voiceAgentTurns2,
  voiceCallEvents: () => voiceCallEvents2,
  voiceCallTurns: () => voiceCallTurns2,
  voiceCalls: () => voiceCalls2,
  voiceChats: () => voiceChats2,
  voiceCopilotCards: () => voiceCopilotCards2,
  voiceCopilotSettings: () => voiceCopilotSettings2,
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
  workingHours: () => workingHours2,
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
import { sql as sql13 } from "drizzle-orm";
import { check as check10, customType as customType3, index as index18, text as text24, timestamp as timestamp18, unique as unique16, uuid as uuid18 } from "drizzle-orm/pg-core";

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
var bytes3 = customType3({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var REFRESH_SEALED_NEXT_TOKEN_MAX_BYTES2 = 256;
var refreshTokens2 = authSchema2.table("refresh_tokens", {
  id: primaryKey(),
  ...tenantColumns(),
  sessionId: uuid18("session_id").notNull(),
  tokenHash: text24("token_hash").notNull(),
  parentId: uuid18("parent_id"),
  replacedById: uuid18("replaced_by_id"),
  usedAt: timestamp18("used_at", { withTimezone: true }),
  expiresAt: timestamp18("expires_at", { withTimezone: true }).notNull(),
  sealedNextToken: bytes3("sealed_next_token"),
  ...timestamps()
}, (t) => [
  unique16("refresh_tokens_token_hash_key").on(t.tokenHash),
  index18("refresh_tokens_session_id_idx").on(t.sessionId),
  tenantParentKey("refresh_tokens", t),
  tenantForeignKey("refresh_tokens_session_fk", t, t.sessionId, sessions2),
  tenantForeignKey("refresh_tokens_parent_fk", t, t.parentId, t, "no action"),
  tenantForeignKey("refresh_tokens_replaced_by_fk", t, t.replacedById, t, "no action"),
  check10("refresh_tokens_sealed_next_token_length", sql13`octet_length(${t.sealedNextToken}) between 1 and ${sql13.raw(String(REFRESH_SEALED_NEXT_TOKEN_MAX_BYTES2))}`),
  ...tenantConstraints("refresh_tokens", t)
]);
// src/schema/auth/signing-keys.ts
import { sql as sql14 } from "drizzle-orm";
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
  uniqueIndex("signing_keys_one_active_per_environment").on(t.environmentId).where(sql14`${t.status} = 'active'`),
  uniqueIndex("signing_keys_one_next_per_environment").on(t.environmentId).where(sql14`${t.status} = 'next'`),
  ...tenantConstraints("signing_keys", t)
]);
// src/schema/auth/sms-code-counts.ts
import { sql as sql15 } from "drizzle-orm";
import { check as check11, date, integer as integer8, pgPolicy as pgPolicy5, text as text26, unique as unique17 } from "drizzle-orm/pg-core";
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
  check11("sms_code_counts_prefix_shape", sql15`${t.prefix} ~ '^\\+[0-9]{1,4}$'`),
  check11("sms_code_counts_bounds", sql15`${t.sent} >= 0 and ${t.used} >= 0 and ${t.used} <= ${t.sent}`),
  ...tenantConstraints("sms_code_counts", t),
  pgPolicy5("sms_code_counts_retention_floor", {
    as: "restrictive",
    for: "delete",
    using: sql15.raw(`day < (now() at time zone 'utc')::date - ${SMS_COUNT_RETENTION_FLOOR_DAYS2}`)
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
import { sql as sql17 } from "drizzle-orm";
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
import { sql as sql16 } from "drizzle-orm";
import { boolean as boolean4, check as check12, text as text29, timestamp as timestamp22 } from "drizzle-orm/pg-core";
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
  check12("webhook_endpoints_previous_secret_whole", sql16`(${t.previousSecret} is null) = (${t.previousSecretExpiresAt} is null)`),
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
  index22("webhook_deliveries_due_idx").on(t.environmentId, t.endpointId, t.nextAttemptAt).where(sql17`state = 'pending'`),
  index22("webhook_deliveries_pending_age_idx").on(t.environmentId, t.createdAt).where(sql17`state = 'pending'`),
  index22("webhook_deliveries_endpoint_log_idx").on(t.environmentId, t.endpointId, t.createdAt),
  index22("webhook_deliveries_environment_created_idx").on(t.environmentId, t.createdAt),
  tenantParentKey("webhook_deliveries", t),
  tenantForeignKey("webhook_deliveries_endpoint_fk", t, t.endpointId, webhookEndpoints2),
  ...tenantConstraints("webhook_deliveries", t),
  pgPolicy6("webhook_deliveries_retention_floor", {
    as: "restrictive",
    for: "delete",
    using: sql17.raw(`state <> 'pending' and created_at < now() - interval '${WEBHOOK_DELIVERY_RETENTION_FLOOR2}'`)
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
import { sql as sql19 } from "drizzle-orm";
import {
  bigint as bigint3,
  boolean as boolean6,
  check as check14,
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
import { sql as sql18 } from "drizzle-orm";
import {
  check as check13,
  customType as customType4,
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
var bytes4 = customType4({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var list = (values) => sql18.raw(values.map((v) => `'${v}'`).join(", "));
var idShape = (column, prefix) => sql18.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
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
  check13("organizations_id_shape", idShape("organization_id", "org")),
  check13("organizations_name_shape", sql18`char_length(btrim(${t.name})) between 1 and 200`),
  check13("organizations_region_known", sql18`${t.region} in (${list(ORGANIZATION_REGIONS2)})`),
  check13("organizations_status_known", sql18`${t.status} in (${list(ORGANIZATION_STATUSES2)})`),
  check13("organizations_owner_count_not_negative", sql18`${t.ownerCount} >= 0`)
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
  check13("memberships_id_shape", idShape("id", "mem")),
  check13("memberships_organization_id_shape", idShape("organization_id", "org")),
  check13("memberships_user_id_shape", idShape("user_id", "usr")),
  check13("memberships_role_known", sql18`${t.role} in (${list(MEMBERSHIP_ROLES2)})`),
  check13("memberships_email_shape", sql18`${t.email} = lower(${t.email} collate "C")
        and char_length(${t.email}) between 3 and 320
        and char_length(${t.email}) - char_length(replace(${t.email}, '@', '')) = 1
        and position('@' in ${t.email}) between 2 and char_length(${t.email}) - 1
        and ${t.email} collate "C" !~ '[[:space:][:cntrl:]]'
        and ${t.email} collate "C" ~ '^[!-~]+$'`),
  check13("memberships_name_shape", sql18`${t.name} is null or char_length(btrim(${t.name})) between 1 and ${sql18.raw(String(MEMBER_NAME_MAX2))}`),
  unique22("memberships_organization_user_key").on(t.organizationId, t.userId),
  unique22("memberships_organization_id_id_key").on(t.organizationId, t.id),
  index23("memberships_organization_email_idx").on(t.organizationId, t.email),
  index23("memberships_name_trgm_idx").using("gin", t.name.op("gin_trgm_ops"))
]);
var teams2 = coreSchema2.table("teams", {
  id: text32("id").primaryKey(),
  organizationId: text32("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  name: text32("name").notNull(),
  nameKey: text32("name_key").generatedAlwaysAs(() => sql18`lower(name collate "C")`),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  check13("teams_id_shape", idShape("id", "team")),
  check13("teams_organization_id_shape", idShape("organization_id", "org")),
  check13("teams_name_shape", sql18`char_length(btrim(${t.name})) between 1 and 200`),
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
  check13("team_members_organization_id_shape", idShape("organization_id", "org")),
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
  check13("invitations_id_shape", idShape("id", "inv")),
  check13("invitations_organization_id_shape", idShape("organization_id", "org")),
  check13("invitations_invited_by_shape", idShape("invited_by_user_id", "usr")),
  check13("invitations_team_id_shape", sql18`${t.teamId} is null or "team_id" ~ '^team_[0-9a-f]{32}$'`),
  check13("invitations_email_shape", sql18`${t.email} = lower(${t.email} collate "C")
        and char_length(${t.email}) between 3 and 320
        and char_length(${t.email}) - char_length(replace(${t.email}, '@', '')) = 1
        and position('@' in ${t.email}) between 2 and char_length(${t.email}) - 1
        and ${t.email} collate "C" !~ '[[:space:][:cntrl:]]'
        and ${t.email} collate "C" ~ '^[!-~]+$'`),
  check13("invitations_role_known", sql18`${t.role} in (${list(MEMBERSHIP_ROLES2)})`),
  check13("invitations_role_not_owner", sql18`${t.role} <> 'owner'`),
  check13("invitations_state_known", sql18`${t.state} in (${list(INVITATION_STATES2)})`),
  check13("invitations_token_hash_shape", sql18`${t.tokenHash} ~ '^[0-9a-f]{64}$'`),
  check13("invitations_expiry_after_creation", sql18`${t.expiresAt} > ${t.createdAt}`),
  check13("invitations_state_shape", sql18`(${t.state} = 'pending' and ${t.acceptedAt} is null and ${t.revokedAt} is null)
        or (${t.state} = 'accepted' and ${t.acceptedAt} is not null and ${t.revokedAt} is null)
        or (${t.state} = 'revoked' and ${t.revokedAt} is not null and ${t.acceptedAt} is null)`),
  unique22("invitations_organization_id_id_key").on(t.organizationId, t.id),
  unique22("invitations_token_hash_key").on(t.tokenHash),
  foreignKey4({
    name: "invitations_team_fk",
    columns: [t.organizationId, t.teamId],
    foreignColumns: [teams2.organizationId, teams2.id]
  }),
  uniqueIndex2("invitations_pending_email_key").on(t.organizationId, t.email).where(sql18`${t.state} = 'pending'`),
  index23("invitations_pending_list_idx").on(t.organizationId, t.createdAt, t.id).where(sql18`${t.state} = 'pending'`),
  index23("invitations_state_list_idx").on(t.organizationId, t.state, t.createdAt, t.id),
  index23("invitations_team_idx").on(t.organizationId, t.teamId).where(sql18`${t.teamId} is not null`)
]);
var membershipDirectory2 = coreSchema2.table("membership_directory", {
  userId: text32("user_id").notNull(),
  organizationId: text32("organization_id").notNull()
}, (t) => [
  primaryKey3({ name: "membership_directory_pkey", columns: [t.userId, t.organizationId] }),
  check13("membership_directory_user_id_shape", idShape("user_id", "usr")),
  check13("membership_directory_organization_id_shape", idShape("organization_id", "org")),
  unique22("membership_directory_one_organization_per_user").on(t.userId)
]);
var invitationDirectory2 = coreSchema2.table("invitation_directory", {
  tokenHash: text32("token_hash").primaryKey(),
  organizationId: text32("organization_id").notNull(),
  invitationId: text32("invitation_id").notNull(),
  expiresAt: timestamp25("expires_at", { withTimezone: true }).notNull()
}, () => [
  check13("invitation_directory_token_hash_shape", sql18`"token_hash" ~ '^[0-9a-f]{64}$'`),
  check13("invitation_directory_organization_id_shape", idShape("organization_id", "org")),
  check13("invitation_directory_invitation_id_shape", idShape("invitation_id", "inv"))
]);
var organizationState2 = coreSchema2.table("organization_state", {
  organizationId: text32("organization_id").primaryKey().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  status: text32("status", { enum: ORGANIZATION_STATUSES2 }).notNull()
}, (t) => [
  check13("organization_state_organization_id_shape", idShape("organization_id", "org")),
  check13("organization_state_status_known", sql18`${t.status} in (${list(ORGANIZATION_STATUSES2)})`)
]);
var idempotencyKeys2 = coreSchema2.table("idempotency_keys", {
  organizationId: text32("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  userId: text32("user_id").notNull(),
  route: text32("route").notNull(),
  key: text32("key").notNull(),
  requestHash: bytes4("request_hash").notNull(),
  status: smallint("status"),
  response: jsonb10("response").$type(),
  createdAt: createdAt()
}, (t) => [
  primaryKey3({
    name: "idempotency_keys_pkey",
    columns: [t.organizationId, t.userId, t.route, t.key]
  }),
  check13("idempotency_keys_organization_id_shape", idShape("organization_id", "org")),
  check13("idempotency_keys_user_id_shape", idShape("user_id", "usr")),
  check13("idempotency_keys_route_shape", sql18`char_length(${t.route}) between 1 and ${sql18.raw(String(IDEMPOTENCY_ROUTE_MAX2))}
        and ${t.route} collate "C" ~ '^[a-z0-9._]+$'`),
  check13("idempotency_keys_key_shape", sql18`char_length(${t.key}) between 1 and ${sql18.raw(String(IDEMPOTENCY_KEY_MAX2))}
        and ${t.key} collate "C" ~ '^[!-~]+$'`),
  check13("idempotency_keys_request_hash_length", sql18`octet_length(${t.requestHash}) = ${sql18.raw(String(IDEMPOTENCY_HASH_BYTES2))}`),
  check13("idempotency_keys_status_range", sql18`${t.status} between 100 and 599`),
  check13("idempotency_keys_response_matches_status", sql18`(${t.status} is null) = (${t.response} is null)`),
  check13("idempotency_keys_response_size", sql18`octet_length(${t.response}::text) <= ${sql18.raw(String(IDEMPOTENCY_RESPONSE_MAX_BYTES2))}`),
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
var list2 = (values) => sql19.raw(values.map((v) => `'${v}'`).join(", "));
var idShape2 = (column, prefix) => sql19.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape = sql19.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal = sql19.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts = (name) => timestamp26(name, { withTimezone: true });
var num = (n) => sql19.raw(String(n));
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
  check14("rollup_daily_organization_id_shape", orgShape),
  check14("rollup_daily_organization_not_global", notGlobal),
  check14("rollup_daily_metric_known", sql19`${t.metric} in (${list2(ROLLUP_METRICS2)})`),
  check14("rollup_daily_group_kind_known", sql19`${t.groupKind} in (${list2(ROLLUP_GROUP_KINDS2)})`),
  check14("rollup_daily_group_key_shape", sql19`(${t.groupKind} = 'total' and ${t.groupKey} = '')
        or (${t.groupKind} <> 'total' and char_length(${t.groupKey}) between 1 and ${num(MAX_ROLLUP_GROUP_KEY_LENGTH2)})`),
  check14("rollup_daily_count_bounds", sql19`${t.count} between 0 and ${num(MAX_ROLLUP_COUNT2)}`)
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
  check14("analytics_event_organization_id_shape", orgShape),
  check14("analytics_event_organization_not_global", notGlobal),
  check14("analytics_event_metric_known", sql19`${t.metric} in (${list2(ROLLUP_METRICS2)})`),
  check14("analytics_event_dedupe_key_shape", sql19`char_length(${t.dedupeKey}) between 1 and ${num(MAX_ROLLUP_GROUP_KEY_LENGTH2)}`),
  check14("analytics_event_channel_known", sql19`${t.channel} is null or ${t.channel} in (${list2(TOUCH_CHANNELS2)})`),
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
  citedSources: jsonb11("cited_sources").notNull().default(sql19`'[]'::jsonb`),
  createdAt: ts("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey4({ name: "touches_pkey", columns: [t.organizationId, t.id] }),
  check14("touches_id_shape", idShape2("id", "tch")),
  check14("touches_organization_id_shape", orgShape),
  check14("touches_organization_not_global", notGlobal),
  check14("touches_kind_known", sql19`${t.kind} in (${list2(TOUCH_KINDS2)})`),
  check14("touches_ref_id_shape", sql19`(${t.kind} = 'message' and ${t.refId} ~ '^msg_[0-9a-f]{32}$')
        or (${t.kind} = 'call' and ${t.refId} ~ '^call_[0-9a-f]{32}$')`),
  check14("touches_prospect_id_shape", idShape2("prospect_id", "prs")),
  check14("touches_channel_known", sql19`${t.channel} in (${list2(TOUCH_CHANNELS2)})`),
  check14("touches_agent_kind_known", sql19`${t.agentKind} in (${list2(TOUCH_AGENT_KINDS2)})`),
  check14("touches_rep_membership_id_shape", sql19`${t.repMembershipId} is null or ${t.repMembershipId} ~ '^mem_[0-9a-f]{32}$'`),
  check14("touches_campaign_id_shape", sql19`${t.campaignId} is null or ${t.campaignId} ~ '^cpg_[0-9a-f]{32}$'`),
  check14("touches_deal_record_id_shape", sql19`${t.dealRecordId} is null or ${t.dealRecordId} ~ '^deal_[0-9a-f]{32}$'`),
  check14("touches_credit_needs_deal", sql19`${t.dealRecordId} is not null or (not ${t.firstTouch} and not ${t.lastTouch})`),
  check14("touches_cited_sources_shape", sql19`jsonb_typeof(${t.citedSources}) = 'array' and jsonb_array_length(${t.citedSources}) <= ${num(MAX_TOUCH_SOURCES2)}`),
  uniqueIndex3("touches_ref_key").on(t.organizationId, t.kind, t.refId),
  index24("touches_prospect_idx").on(t.organizationId, t.prospectId, t.occurredAt.desc(), t.id.desc()),
  index24("touches_deal_idx").on(t.organizationId, t.dealRecordId, t.occurredAt.desc(), t.id.desc()).where(sql19`${t.dealRecordId} is not null`)
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
  check14("source_performance_organization_id_shape", orgShape),
  check14("source_performance_organization_not_global", notGlobal),
  check14("source_performance_kind_known", sql19`${t.sourceKind} in (${list2(SOURCE_KINDS2)})`),
  check14("source_performance_key_length", sql19`char_length(${t.sourceKey}) between 1 and ${num(MAX_SOURCE_KEY_LENGTH2)}`),
  check14("source_performance_counts", sql19`${t.dealsTouched} between 0 and ${num(MAX_SOURCE_DEALS2)} and ${t.dealsWon} between 0 and ${t.dealsTouched}`),
  check14("source_performance_flag_known", sql19`${t.flag} in (${list2(SOURCE_PERFORMANCE_FLAGS2)})`),
  index24("source_performance_list_idx").on(t.organizationId, t.dealsTouched.desc(), t.sourceKind.desc(), t.sourceKey.desc()),
  index24("source_performance_flag_idx").on(t.organizationId, t.sourceKind, t.sourceKey).where(sql19`${t.flag} is not null`)
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
  check14("assessments_id_shape", idShape2("id", "asm")),
  check14("assessments_organization_id_shape", orgShape),
  check14("assessments_organization_not_global", notGlobal),
  check14("assessments_subject_kind_known", sql19`${t.subjectKind} in (${list2(ASSESSMENT_SUBJECT_KINDS2)})`),
  check14("assessments_subject_columns", sql19`(${t.subjectKind} = 'draft' and ${t.draftId} is not null and ${t.draftId} ~ '^drf_[0-9a-f]{32}$'
          and ${t.draftVersion} is not null and ${t.draftVersion} between 1 and ${num(MAX_ASSESSED_NUMBER2)}
          and ${t.callId} is null and ${t.turnIndex} is null)
        or (${t.subjectKind} = 'call_turn' and ${t.callId} is not null and ${t.callId} ~ '^call_[0-9a-f]{32}$'
          and ${t.turnIndex} is not null and ${t.turnIndex} between 0 and ${num(MAX_ASSESSED_NUMBER2)}
          and ${t.draftId} is null and ${t.draftVersion} is null)`),
  check14("assessments_prospect_id_shape", sql19`${t.prospectId} is null or ${t.prospectId} ~ '^prs_[0-9a-f]{32}$'`),
  check14("assessments_agent_kind_known", sql19`${t.agentKind} in (${list2(TOUCH_AGENT_KINDS2)})`),
  check14("assessments_instruction_version_positive", sql19`${t.instructionVersion} is null or ${t.instructionVersion} >= 1`),
  check14("assessments_verdict_known", sql19`${t.verdict} in (${list2(ASSESSMENT_VERDICTS2)})`),
  check14("assessments_judge_source_known", sql19`${t.judgeSource} in (${list2(ASSESSMENT_JUDGE_SOURCES2)})`),
  check14("assessments_severity_rank", sql19`(${t.worstSeverityRank} is null or ${t.worstSeverityRank} between 1 and ${num(FINDING_SEVERITIES2.length)})
        and (${t.verdict} <> 'pass' or ${t.worstSeverityRank} is null)
        and (${t.verdict} <> 'fail' or ${t.worstSeverityRank} is not null)`),
  uniqueIndex3("assessments_draft_key").on(t.organizationId, t.draftId, t.draftVersion).where(sql19`${t.subjectKind} = 'draft'`),
  uniqueIndex3("assessments_call_turn_key").on(t.organizationId, t.callId, t.turnIndex).where(sql19`${t.subjectKind} = 'call_turn'`),
  index24("assessments_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index24("assessments_verdict_idx").on(t.organizationId, t.verdict, t.createdAt.desc(), t.id.desc()),
  index24("assessments_review_idx").on(t.organizationId, t.worstSeverityRank.desc(), t.createdAt.desc(), t.id.desc()).where(sql19`${t.verdict} <> 'pass'`),
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
  check14("assessment_findings_id_shape", idShape2("id", "fnd")),
  check14("assessment_findings_organization_id_shape", orgShape),
  check14("assessment_findings_organization_not_global", notGlobal),
  check14("assessment_findings_assessment_id_shape", idShape2("assessment_id", "asm")),
  check14("assessment_findings_category_known", sql19`${t.category} in (${list2(FINDING_CATEGORIES2)})`),
  check14("assessment_findings_severity_known", sql19`${t.severity} in (${list2(FINDING_SEVERITIES2)})`),
  check14("assessment_findings_span_bounds", sql19`${t.spanStart} between 0 and ${num(MAX_FINDING_SPAN_OFFSET2)}
        and ${t.spanEnd} between 1 and ${num(MAX_FINDING_SPAN_OFFSET2)}
        and ${t.spanEnd} > ${t.spanStart}`),
  check14("assessment_findings_explanation_length", sql19`char_length(${t.explanation}) between 1 and ${num(MAX_FINDING_EXPLANATION_LENGTH2)}`),
  check14("assessment_findings_feedback_known", sql19`${t.feedback} in (${list2(FINDING_FEEDBACKS2)})`),
  check14("assessment_findings_feedback_by_shape", sql19`${t.feedbackByMembershipId} is null or ${t.feedbackByMembershipId} ~ '^mem_[0-9a-f]{32}$'`),
  check14("assessment_findings_feedback_complete", sql19`(${t.feedback} is null) = (${t.feedbackByMembershipId} is null)
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
  check14("conversation_summaries_organization_id_shape", orgShape),
  check14("conversation_summaries_organization_not_global", notGlobal),
  check14("conversation_summaries_conversation_id_shape", idShape2("conversation_id", "cnv")),
  check14("conversation_summaries_summary_length", sql19`char_length(${t.summary}) between 1 and ${num(MAX_SUMMARY_LENGTH2)}`),
  check14("conversation_summaries_outcome_label_known", sql19`${t.outcomeLabel} in (${list2(CONVERSATION_OUTCOME_LABELS2)})`)
]);
// src/schema/core-calendars.ts
import { sql as sql21 } from "drizzle-orm";
import {
  boolean as boolean8,
  check as check16,
  customType as customType6,
  foreignKey as foreignKey7,
  index as index26,
  integer as integer15,
  jsonb as jsonb13,
  primaryKey as primaryKey6,
  smallint as smallint3,
  text as text35,
  timestamp as timestamp28,
  uniqueIndex as uniqueIndex5
} from "drizzle-orm/pg-core";

// src/schema/core-prospects.ts
import { sql as sql20 } from "drizzle-orm";
import {
  bigint as bigint4,
  boolean as boolean7,
  check as check15,
  customType as customType5,
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
var PROSPECT_IMPORT_FAILURE_REASONS2 = [
  "too_many_rows",
  "unreadable",
  "processing_failed"
];
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
var list3 = (values) => sql20.raw(values.map((v) => `'${v}'`).join(", "));
var idShape3 = (column, prefix) => sql20.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape2 = sql20.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal2 = sql20.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts2 = (name) => timestamp27(name, { withTimezone: true });
var createdAt2 = () => ts2("created_at").notNull().defaultNow();
var updatedAt2 = () => ts2("updated_at").notNull().defaultNow();
var bytes5 = customType5({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var textArray = customType5({
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
  check15("prospect_companies_id_shape", idShape3("id", "pco")),
  check15("prospect_companies_organization_id_shape", orgShape2),
  check15("prospect_companies_organization_not_global", notGlobal2),
  check15("prospect_companies_name_shape", sql20`char_length(${t.name}) between 1 and ${sql20.raw(String(MAX_PROSPECT_COMPANY_NAME_LENGTH2))} and ${t.name} = btrim(${t.name})`),
  check15("prospect_companies_domain_shape", sql20`${t.domain} is null or (char_length(${t.domain}) between 3 and 253
        and ${t.domain} collate "C" ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$')`),
  check15("prospect_companies_industry_shape", sql20`${t.industry} is null or (char_length(${t.industry}) between 1 and ${sql20.raw(String(MAX_PROSPECT_COMPANY_TEXT_LENGTH2))} and ${t.industry} = btrim(${t.industry}))`),
  check15("prospect_companies_region_shape", sql20`${t.region} is null or (char_length(${t.region}) between 1 and ${sql20.raw(String(MAX_PROSPECT_COMPANY_TEXT_LENGTH2))} and ${t.region} = btrim(${t.region}))`),
  check15("prospect_companies_employee_count_shape", sql20`${t.employeeCount} is null or ${t.employeeCount} >= 0`),
  check15("prospect_companies_technologies_shape", sql20`${t.technologies} is null or core.prospect_technologies_valid(${t.technologies})`),
  uniqueIndex4("prospect_companies_domain_key").on(t.organizationId, t.domain).where(sql20`${t.domain} is not null`),
  index25("prospect_companies_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index25("prospect_companies_name_trgm_idx").using("gin", t.name.op("gin_trgm_ops")),
  index25("prospect_companies_domain_trgm_idx").using("gin", t.domain.op("gin_trgm_ops")).where(sql20`${t.domain} is not null`)
]);
var prospects2 = coreSchema2.table("prospects", {
  id: text34("id").notNull(),
  organizationId: text34("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  companyId: text34("company_id"),
  ownerMembershipId: text34("owner_membership_id"),
  status: text34("status", { enum: PROSPECT_STATUSES2 }).notNull().default("active"),
  source: text34("source").notNull(),
  tags: textArray("tags").notNull().default(sql20`'{}'::text[]`),
  notes: text34("notes"),
  createdAt: createdAt2(),
  updatedAt: updatedAt2()
}, (t) => [
  primaryKey5({ name: "prospects_pkey", columns: [t.organizationId, t.id] }),
  check15("prospects_id_shape", idShape3("id", "prs")),
  check15("prospects_organization_id_shape", orgShape2),
  check15("prospects_organization_not_global", notGlobal2),
  check15("prospects_company_id_shape", idShape3("company_id", "pco")),
  check15("prospects_owner_membership_id_shape", idShape3("owner_membership_id", "mem")),
  check15("prospects_status_known", sql20`${t.status} in (${list3(PROSPECT_STATUSES2)})`),
  check15("prospects_source_known", sql20`${t.source} collate "C" ~ '${sql20.raw(SOURCE_KIND_PATTERN2)}'`),
  check15("prospects_tags_valid", sql20`core.prospect_tags_valid(${t.tags})`),
  check15("prospects_notes_shape", sql20`${t.notes} is null or char_length(${t.notes}) between 1 and ${sql20.raw(String(MAX_PROSPECT_NOTES_LENGTH2))}`),
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
  index25("prospects_owner_list_idx").on(t.organizationId, t.ownerMembershipId, t.createdAt.desc(), t.id.desc()).where(sql20`${t.ownerMembershipId} is not null`),
  index25("prospects_company_list_idx").on(t.organizationId, t.companyId, t.createdAt.desc(), t.id.desc()).where(sql20`${t.companyId} is not null`),
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
  check15("prospect_identities_organization_id_shape", orgShape2),
  check15("prospect_identities_organization_not_global", notGlobal2),
  check15("prospect_identities_prospect_id_shape", idShape3("prospect_id", "prs")),
  check15("prospect_identities_kind_known", sql20`${t.kind} in (${list3(PROSPECT_IDENTITY_KINDS2)})`),
  check15("prospect_identities_value_shape", sql20`char_length(${t.value}) between 3 and ${sql20.raw(String(MAX_PROSPECT_FIELD_VALUE_LENGTH2))} and (
        (${t.kind} = 'email'
          and ${t.value} = lower(${t.value} collate "C")
          and char_length(${t.value}) - char_length(replace(${t.value}, '@', '')) = 1
          and position('@' in ${t.value}) between 2 and char_length(${t.value}) - 1
          and ${t.value} collate "C" ~ '^[!-~]+$')
        or (${t.kind} = 'phone' and ${t.value} collate "C" ~ '${sql20.raw(IDENTITY_VALUE_PATTERNS2.phone)}')
        or (${t.kind} = 'linkedin' and char_length(${t.value}) <= 300
          and ${t.value} collate "C" ~ '${sql20.raw(IDENTITY_VALUE_PATTERNS2.linkedin)}'))`),
  foreignKey6({
    name: "prospect_identities_prospect_fk",
    columns: [t.organizationId, t.prospectId],
    foreignColumns: [prospects2.organizationId, prospects2.id]
  }).onDelete("cascade"),
  uniqueIndex4("prospect_identities_primary_key").on(t.organizationId, t.prospectId, t.kind).where(sql20`${t.isPrimary}`),
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
var fieldValueCheck = (table, companyFields = false) => check15(`${table}_value_shape`, sql20.raw(companyFields ? `("field_name" <> 'technologies' and char_length("value") between 1 and ${MAX_PROSPECT_FIELD_VALUE_LENGTH2}) or ("field_name" = 'technologies' and char_length("value") between 1 and ${MAX_PROSPECT_TECHNOLOGIES_VALUE_LENGTH2} and core.prospect_company_technologies_text_valid("value"))` : `char_length("value") between 1 and ${MAX_PROSPECT_FIELD_VALUE_LENGTH2}`));
var fieldHistoryChecks = (table) => [
  check15(`${table}_organization_id_shape`, orgShape2),
  check15(`${table}_organization_not_global`, notGlobal2),
  check15(`${table}_state_known`, sql20.raw(`"state" in (${FIELD_HISTORY_STATES2.map((s) => `'${s}'`).join(", ")})`)),
  check15(`${table}_source_known`, sql20.raw(`"source" collate "C" ~ '${SOURCE_KIND_PATTERN2}'`)),
  check15(`${table}_source_ref_shape`, sql20.raw(`("source_ref" is null or char_length("source_ref") between 1 and ${MAX_SOURCE_REF_LENGTH2}) and ("source" <> 'manual' or "source_ref" is null)`)),
  check15(`${table}_set_by_user_id_shape`, sql20.raw(`"set_by_user_id" is null or "set_by_user_id" ~ '^usr_[0-9a-f]{32}$'`))
];
var prospectFields2 = coreSchema2.table("prospect_fields", { ...fieldHistoryColumns(), prospectId: text34("prospect_id").notNull() }, (t) => [
  primaryKey5({ name: "prospect_fields_pkey", columns: [t.organizationId, t.seq] }),
  ...fieldHistoryChecks("prospect_fields"),
  fieldValueCheck("prospect_fields"),
  check15("prospect_fields_prospect_id_shape", idShape3("prospect_id", "prs")),
  check15("prospect_fields_field_name_known", sql20`${t.fieldName} in (${list3(PROSPECT_FIELD_NAMES2)})`),
  foreignKey6({
    name: "prospect_fields_prospect_fk",
    columns: [t.organizationId, t.prospectId],
    foreignColumns: [prospects2.organizationId, prospects2.id]
  }).onDelete("cascade"),
  uniqueIndex4("prospect_fields_current_key").on(t.organizationId, t.prospectId, t.fieldName).where(sql20`${t.state} = 'current'`),
  index25("prospect_fields_history_idx").on(t.organizationId, t.prospectId, t.fieldName, t.setAt.desc(), t.seq.desc()),
  index25("prospect_fields_value_trgm_idx").using("gin", t.value.op("gin_trgm_ops")).where(sql20`${t.state} = 'current'`)
]);
var prospectCompanyFields2 = coreSchema2.table("prospect_company_fields", { ...fieldHistoryColumns(), companyId: text34("company_id").notNull() }, (t) => [
  primaryKey5({ name: "prospect_company_fields_pkey", columns: [t.organizationId, t.seq] }),
  ...fieldHistoryChecks("prospect_company_fields"),
  fieldValueCheck("prospect_company_fields", true),
  check15("prospect_company_fields_employee_count_value", sql20`${t.fieldName} <> 'employee_count' or ${t.value} collate "C" ~ '^[0-9]{1,9}$'`),
  check15("prospect_company_fields_company_id_shape", idShape3("company_id", "pco")),
  check15("prospect_company_fields_field_name_known", sql20`${t.fieldName} in (${list3(PROSPECT_COMPANY_FIELD_NAMES2)})`),
  foreignKey6({
    name: "prospect_company_fields_company_fk",
    columns: [t.organizationId, t.companyId],
    foreignColumns: [prospectCompanies2.organizationId, prospectCompanies2.id]
  }).onDelete("cascade"),
  uniqueIndex4("prospect_company_fields_current_key").on(t.organizationId, t.companyId, t.fieldName).where(sql20`${t.state} = 'current'`),
  index25("prospect_company_fields_history_idx").on(t.organizationId, t.companyId, t.fieldName, t.setAt.desc(), t.seq.desc())
]);
var prospectImports2 = coreSchema2.table("prospect_imports", {
  id: text34("id").notNull(),
  organizationId: text34("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  state: text34("state", { enum: PROSPECT_IMPORT_STATES2 }).notNull().default("uploaded"),
  failureReason: text34("failure_reason", { enum: PROSPECT_IMPORT_FAILURE_REASONS2 }),
  sizeBytes: bigint4("size_bytes", { mode: "number" }).notNull(),
  contentHash: bytes5("content_hash").notNull(),
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
  check15("prospect_imports_id_shape", idShape3("id", "pimp")),
  check15("prospect_imports_organization_id_shape", orgShape2),
  check15("prospect_imports_organization_not_global", notGlobal2),
  check15("prospect_imports_uploaded_by_user_id_shape", idShape3("uploaded_by_user_id", "usr")),
  check15("prospect_imports_state_known", sql20`${t.state} in (${list3(PROSPECT_IMPORT_STATES2)})`),
  check15("prospect_imports_failure_reason_known", sql20`${t.failureReason} in (${list3(PROSPECT_IMPORT_FAILURE_REASONS2)})`),
  check15("prospect_imports_failed_has_reason", sql20`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check15("prospect_imports_size_bounds", sql20`${t.sizeBytes} between 1 and ${sql20.raw(String(MAX_PROSPECT_IMPORT_BYTES2))}`),
  check15("prospect_imports_content_hash_length", sql20`octet_length(${t.contentHash}) = 32`),
  check15("prospect_imports_object_key_shape", sql20`char_length(${t.objectKey}) between 1 and 1024 and ${t.objectKey} collate "C" ~ '^[!-~]+$'`),
  check15("prospect_imports_processed_rows_bounds", sql20`${t.processedRows} between 0 and ${sql20.raw(String(MAX_PROSPECT_IMPORT_ROWS2))}`),
  check15("prospect_imports_counts_when_completed", sql20`(${t.state} = 'completed') = (${t.rowCount} is not null)
        and (${t.rowCount} is null) = (${t.createdCount} is null)
        and (${t.rowCount} is null) = (${t.updatedCount} is null)
        and (${t.rowCount} is null) = (${t.skippedCount} is null)
        and (${t.rowCount} is null) = (${t.rejectedCount} is null)`),
  check15("prospect_imports_counts_add_up", sql20`${t.rowCount} is null or (${t.createdCount} >= 0 and ${t.updatedCount} >= 0
        and ${t.skippedCount} >= 0 and ${t.rejectedCount} >= 0
        and ${t.rowCount} <= ${sql20.raw(String(MAX_PROSPECT_IMPORT_ROWS2))}
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
  check15("prospect_import_rows_organization_id_shape", orgShape2),
  check15("prospect_import_rows_organization_not_global", notGlobal2),
  check15("prospect_import_rows_import_id_shape", idShape3("import_id", "pimp")),
  check15("prospect_import_rows_prospect_id_shape", idShape3("prospect_id", "prs")),
  check15("prospect_import_rows_row_number_bounds", sql20`${t.rowNumber} between 2 and ${sql20.raw(String(MAX_PROSPECT_IMPORT_ROWS2 + 1))}`),
  check15("prospect_import_rows_result_known", sql20`${t.result} in (${list3(PROSPECT_IMPORT_ROW_RESULTS2)})`),
  check15("prospect_import_rows_reason_matches_result", sql20`(${t.result} = 'skipped' and ${t.reason} is not null and ${t.reason} in (${list3(PROSPECT_IMPORT_SKIP_REASONS2)}))
        or (${t.result} = 'rejected' and ${t.reason} is not null and ${t.reason} in (${list3(PROSPECT_IMPORT_REJECT_REASONS2)}))
        or (${t.result} in ('created', 'updated') and ${t.reason} is null)`),
  check15("prospect_import_rows_prospect_matches_result", sql20`(${t.result} = 'rejected' and ${t.prospectId} is null)
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
  fieldChoices: jsonb12("field_choices").notNull().default(sql20`'{}'::jsonb`),
  state: text34("state", { enum: PROSPECT_MERGE_STATES2 }).notNull().default("merged"),
  mergedByUserId: text34("merged_by_user_id").notNull(),
  snapshot: jsonb12("snapshot").notNull(),
  createdAt: createdAt2(),
  undoableUntil: ts2("undoable_until").notNull(),
  undoneAt: ts2("undone_at")
}, (t) => [
  primaryKey5({ name: "prospect_merges_pkey", columns: [t.organizationId, t.id] }),
  check15("prospect_merges_id_shape", idShape3("id", "pmrg")),
  check15("prospect_merges_organization_id_shape", orgShape2),
  check15("prospect_merges_organization_not_global", notGlobal2),
  check15("prospect_merges_survivor_prospect_id_shape", idShape3("survivor_prospect_id", "prs")),
  check15("prospect_merges_merged_by_user_id_shape", idShape3("merged_by_user_id", "usr")),
  check15("prospect_merges_state_known", sql20`${t.state} in (${list3(PROSPECT_MERGE_STATES2)})`),
  check15("prospect_merges_merged_ids_valid", sql20`core.prospect_merged_ids_valid(${t.mergedProspectIds}, ${t.survivorProspectId})`),
  check15("prospect_merges_field_choices_object", sql20`jsonb_typeof(${t.fieldChoices}) = 'object'`),
  check15("prospect_merges_snapshot_bounds", sql20`jsonb_typeof(${t.snapshot}) = 'object' and octet_length(${t.snapshot}::text) <= ${sql20.raw(String(MAX_MERGE_SNAPSHOT_BYTES2))}`),
  check15("prospect_merges_undo_window", sql20`${t.undoableUntil} = ${t.createdAt} + interval '${sql20.raw(String(PROSPECT_MERGE_UNDO_DAYS2))} days'`),
  check15("prospect_merges_undone_has_time", sql20`(${t.state} = 'undone') = (${t.undoneAt} is not null)`),
  foreignKey6({
    name: "prospect_merges_survivor_fk",
    columns: [t.organizationId, t.survivorProspectId],
    foreignColumns: [prospects2.organizationId, prospects2.id]
  }).onDelete("cascade"),
  index25("prospect_merges_survivor_idx").on(t.organizationId, t.survivorProspectId, t.createdAt.desc(), t.id.desc()),
  index25("prospect_merges_merged_ids_idx").using("gin", t.mergedProspectIds)
]);

// src/schema/core-calendars.ts
var CALENDAR_PROVIDERS2 = ["google", "outlook"];
var CALENDAR_CONNECTION_STATES2 = ["healthy", "needs_reconnect"];
var BOOKING_MODES2 = ["phone", "video"];
var BOOKING_STATES2 = ["pending", "confirmed", "cancelled"];
var BOOKING_ORIGINS2 = ["member", "agent", "public"];
var ROUTING_TARGET_KINDS2 = ["rep", "team", "pool"];
var ROUTING_PURPOSES2 = ["booking", "handoff", "test"];
var MAX_ROUTING_POOL_MEMBERS2 = 20;
var MAX_ROUTING_RULES2 = 200;
var MAX_WORKING_WINDOWS2 = 28;
var list4 = (values) => sql21.raw(values.map((v) => `'${v}'`).join(", "));
var idShape4 = (column, prefix) => sql21.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape3 = sql21.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal3 = sql21.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts3 = (name) => timestamp28(name, { withTimezone: true });
var createdAt3 = () => ts3("created_at").notNull().defaultNow();
var updatedAt3 = () => ts3("updated_at").notNull().defaultNow();
var orgColumn = () => text35("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" });
var bytes6 = customType6({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var textArray2 = customType6({
  dataType: () => "text[]"
});
var calendarConnections2 = coreSchema2.table("calendar_connections", {
  id: text35("id").notNull(),
  organizationId: orgColumn(),
  membershipId: text35("membership_id").notNull(),
  provider: text35("provider", { enum: CALENDAR_PROVIDERS2 }).notNull(),
  status: text35("status", { enum: CALENDAR_CONNECTION_STATES2 }).notNull().default("healthy"),
  accountEmail: text35("account_email").notNull(),
  calendarId: text35("calendar_id").notNull(),
  tokensCiphertext: bytes6("tokens_ciphertext").notNull(),
  lastRefreshedAt: ts3("last_refreshed_at"),
  createdAt: createdAt3(),
  updatedAt: updatedAt3()
}, (t) => [
  primaryKey6({ name: "calendar_connections_pkey", columns: [t.organizationId, t.id] }),
  check16("calendar_connections_id_shape", idShape4("id", "cal")),
  check16("calendar_connections_organization_id_shape", orgShape3),
  check16("calendar_connections_organization_not_global", notGlobal3),
  check16("calendar_connections_provider_known", sql21`${t.provider} in (${list4(CALENDAR_PROVIDERS2)})`),
  check16("calendar_connections_status_known", sql21`${t.status} in (${list4(CALENDAR_CONNECTION_STATES2)})`),
  check16("calendar_connections_account_email_shape", sql21`char_length(${t.accountEmail}) between 3 and 320`),
  check16("calendar_connections_calendar_id_shape", sql21`char_length(${t.calendarId}) between 1 and 500`),
  check16("calendar_connections_tokens_size", sql21`octet_length(${t.tokensCiphertext}) between 1 and 8192`),
  foreignKey7({
    name: "calendar_connections_membership_fk",
    columns: [t.organizationId, t.membershipId],
    foreignColumns: [memberships2.organizationId, memberships2.id]
  }).onDelete("cascade"),
  uniqueIndex5("calendar_connections_membership_key").on(t.organizationId, t.membershipId),
  index26("calendar_connections_list_idx").on(t.organizationId, t.createdAt, t.id)
]);
var workingHours2 = coreSchema2.table("working_hours", {
  organizationId: orgColumn(),
  membershipId: text35("membership_id").notNull(),
  timezone: text35("timezone").notNull(),
  windows: jsonb13("windows").$type().notNull().default(sql21`'[]'::jsonb`),
  dailyCap: smallint3("daily_cap"),
  onLeaveUntil: ts3("on_leave_until"),
  updatedAt: updatedAt3()
}, (t) => [
  primaryKey6({ name: "working_hours_pkey", columns: [t.organizationId, t.membershipId] }),
  check16("working_hours_organization_id_shape", orgShape3),
  check16("working_hours_organization_not_global", notGlobal3),
  check16("working_hours_timezone_shape", sql21`${t.timezone} ~ '^[A-Za-z][A-Za-z0-9_+/-]{0,63}$'`),
  check16("working_hours_windows_shape", sql21`jsonb_typeof(${t.windows}) = 'array' and jsonb_array_length(${t.windows}) <= ${sql21.raw(String(MAX_WORKING_WINDOWS2))}`),
  check16("working_hours_daily_cap_range", sql21`${t.dailyCap} is null or ${t.dailyCap} between 1 and 100`),
  foreignKey7({
    name: "working_hours_membership_fk",
    columns: [t.organizationId, t.membershipId],
    foreignColumns: [memberships2.organizationId, memberships2.id]
  }).onDelete("cascade")
]);
var bookingTypes2 = coreSchema2.table("booking_types", {
  id: text35("id").notNull(),
  organizationId: orgColumn(),
  name: text35("name").notNull(),
  lengthMinutes: smallint3("length_minutes").notNull(),
  bufferBeforeMinutes: smallint3("buffer_before_minutes").notNull().default(0),
  bufferAfterMinutes: smallint3("buffer_after_minutes").notNull().default(0),
  minNoticeMinutes: integer15("min_notice_minutes").notNull().default(0),
  mode: text35("mode", { enum: BOOKING_MODES2 }).notNull(),
  active: boolean8("active").notNull().default(true),
  publicTokenHash: text35("public_token_hash"),
  createdAt: createdAt3(),
  updatedAt: updatedAt3()
}, (t) => [
  primaryKey6({ name: "booking_types_pkey", columns: [t.organizationId, t.id] }),
  check16("booking_types_id_shape", idShape4("id", "bkt")),
  check16("booking_types_organization_id_shape", orgShape3),
  check16("booking_types_organization_not_global", notGlobal3),
  check16("booking_types_name_shape", sql21`char_length(${t.name}) between 1 and 200 and ${t.name} = btrim(${t.name})`),
  check16("booking_types_length_range", sql21`${t.lengthMinutes} between 5 and 480`),
  check16("booking_types_buffers_range", sql21`${t.bufferBeforeMinutes} between 0 and 120 and ${t.bufferAfterMinutes} between 0 and 120`),
  check16("booking_types_min_notice_range", sql21`${t.minNoticeMinutes} between 0 and 43200`),
  check16("booking_types_mode_known", sql21`${t.mode} in (${list4(BOOKING_MODES2)})`),
  check16("booking_types_public_token_hash_shape", sql21`${t.publicTokenHash} is null or ${t.publicTokenHash} ~ '^[0-9a-f]{64}$'`),
  uniqueIndex5("booking_types_name_key").on(t.organizationId, sql21`lower(${t.name})`),
  uniqueIndex5("booking_types_public_token_key").on(t.publicTokenHash),
  index26("booking_types_list_idx").on(t.organizationId, t.createdAt, t.id)
]);
var bookingTypeDirectory2 = coreSchema2.table("booking_type_directory", {
  tokenHash: text35("token_hash").primaryKey(),
  organizationId: text35("organization_id").notNull(),
  bookingTypeId: text35("booking_type_id").notNull()
}, (t) => [
  check16("booking_type_directory_token_hash_shape", sql21`${t.tokenHash} ~ '^[0-9a-f]{64}$'`),
  check16("booking_type_directory_organization_id_shape", orgShape3),
  check16("booking_type_directory_booking_type_id_shape", idShape4("booking_type_id", "bkt"))
]);
var routingRules2 = coreSchema2.table("routing_rules", {
  id: text35("id").notNull(),
  organizationId: orgColumn(),
  position: integer15("position").notNull(),
  name: text35("name").notNull(),
  enabled: boolean8("enabled").notNull().default(true),
  conditions: jsonb13("conditions").$type().notNull().default(sql21`'{}'::jsonb`),
  targetKind: text35("target_kind", { enum: ROUTING_TARGET_KINDS2 }).notNull(),
  targetMembershipId: text35("target_membership_id"),
  targetTeamId: text35("target_team_id"),
  poolName: text35("pool_name"),
  poolMembershipIds: textArray2("pool_membership_ids"),
  createdAt: createdAt3(),
  updatedAt: updatedAt3()
}, (t) => [
  primaryKey6({ name: "routing_rules_pkey", columns: [t.organizationId, t.id] }),
  check16("routing_rules_id_shape", idShape4("id", "rrl")),
  check16("routing_rules_organization_id_shape", orgShape3),
  check16("routing_rules_organization_not_global", notGlobal3),
  check16("routing_rules_position_range", sql21`${t.position} between 0 and ${sql21.raw(String(MAX_ROUTING_RULES2 * 100))}`),
  check16("routing_rules_name_shape", sql21`char_length(${t.name}) between 1 and 200 and ${t.name} = btrim(${t.name})`),
  check16("routing_rules_conditions_shape", sql21`jsonb_typeof(${t.conditions}) = 'object'`),
  check16("routing_rules_target_kind_known", sql21`${t.targetKind} in (${list4(ROUTING_TARGET_KINDS2)})`),
  check16("routing_rules_target_matches_kind", sql21`(${t.targetKind} = 'rep' and ${t.targetMembershipId} is not null and ${t.targetTeamId} is null and ${t.poolName} is null and ${t.poolMembershipIds} is null)
        or (${t.targetKind} = 'team' and ${t.targetTeamId} is not null and ${t.targetMembershipId} is null and ${t.poolName} is null and ${t.poolMembershipIds} is null)
        or (${t.targetKind} = 'pool' and ${t.poolName} is not null and ${t.poolMembershipIds} is not null and ${t.targetMembershipId} is null and ${t.targetTeamId} is null)`),
  check16("routing_rules_pool_shape", sql21`${t.poolName} is null or (char_length(${t.poolName}) between 1 and 100
        and coalesce(cardinality(${t.poolMembershipIds}), 0) between 1 and ${sql21.raw(String(MAX_ROUTING_POOL_MEMBERS2))})`),
  foreignKey7({
    name: "routing_rules_target_membership_fk",
    columns: [t.organizationId, t.targetMembershipId],
    foreignColumns: [memberships2.organizationId, memberships2.id]
  }).onDelete("cascade"),
  foreignKey7({
    name: "routing_rules_target_team_fk",
    columns: [t.organizationId, t.targetTeamId],
    foreignColumns: [teams2.organizationId, teams2.id]
  }).onDelete("cascade"),
  index26("routing_rules_order_idx").on(t.organizationId, t.position, t.id),
  index26("routing_rules_target_membership_idx").on(t.organizationId, t.targetMembershipId),
  index26("routing_rules_target_team_idx").on(t.organizationId, t.targetTeamId)
]);
var routingState2 = coreSchema2.table("routing_state", {
  organizationId: orgColumn(),
  targetKey: text35("target_key").notNull(),
  lastMembershipId: text35("last_membership_id"),
  cursor: integer15("cursor").notNull().default(0),
  updatedAt: updatedAt3()
}, (t) => [
  primaryKey6({ name: "routing_state_pkey", columns: [t.organizationId, t.targetKey] }),
  check16("routing_state_organization_id_shape", orgShape3),
  check16("routing_state_organization_not_global", notGlobal3),
  check16("routing_state_target_key_shape", sql21`${t.targetKey} ~ '^(rule|team):[a-z0-9_]{1,80}$'`),
  check16("routing_state_last_membership_id_shape", sql21`${t.lastMembershipId} is null or ${t.lastMembershipId} ~ '^mem_[0-9a-f]{32}$'`),
  check16("routing_state_cursor_not_negative", sql21`${t.cursor} >= 0`)
]);
var routingDecisions2 = coreSchema2.table("routing_decisions", {
  id: text35("id").notNull(),
  organizationId: orgColumn(),
  purpose: text35("purpose", { enum: ROUTING_PURPOSES2 }).notNull(),
  prospectId: text35("prospect_id"),
  bookingTypeId: text35("booking_type_id"),
  ruleId: text35("rule_id"),
  chosenMembershipId: text35("chosen_membership_id"),
  candidates: jsonb13("candidates").$type().notNull().default(sql21`'[]'::jsonb`),
  skipped: jsonb13("skipped").$type().notNull().default(sql21`'[]'::jsonb`),
  reason: text35("reason").notNull(),
  createdAt: createdAt3()
}, (t) => [
  primaryKey6({ name: "routing_decisions_pkey", columns: [t.organizationId, t.id] }),
  check16("routing_decisions_id_shape", idShape4("id", "rdc")),
  check16("routing_decisions_organization_id_shape", orgShape3),
  check16("routing_decisions_organization_not_global", notGlobal3),
  check16("routing_decisions_purpose_known", sql21`${t.purpose} in (${list4(ROUTING_PURPOSES2)})`),
  check16("routing_decisions_arrays_shape", sql21`jsonb_typeof(${t.candidates}) = 'array' and jsonb_typeof(${t.skipped}) = 'array'
        and jsonb_array_length(${t.candidates}) <= ${sql21.raw(String(MAX_ROUTING_POOL_MEMBERS2))}
        and jsonb_array_length(${t.skipped}) <= ${sql21.raw(String(MAX_ROUTING_POOL_MEMBERS2))}`),
  check16("routing_decisions_reason_shape", sql21`char_length(${t.reason}) between 1 and 500`),
  index26("routing_decisions_list_idx").on(t.organizationId, t.createdAt, t.id),
  index26("routing_decisions_prospect_idx").on(t.organizationId, t.prospectId, t.createdAt)
]);
var busyBlocks2 = coreSchema2.table("busy_blocks", {
  organizationId: orgColumn(),
  membershipId: text35("membership_id").notNull(),
  startsAt: ts3("starts_at").notNull(),
  endsAt: ts3("ends_at").notNull(),
  refreshedAt: ts3("refreshed_at").notNull().defaultNow()
}, (t) => [
  primaryKey6({
    name: "busy_blocks_pkey",
    columns: [t.organizationId, t.membershipId, t.startsAt, t.endsAt]
  }),
  check16("busy_blocks_organization_id_shape", orgShape3),
  check16("busy_blocks_organization_not_global", notGlobal3),
  check16("busy_blocks_ends_after_starts", sql21`${t.endsAt} > ${t.startsAt}`),
  foreignKey7({
    name: "busy_blocks_membership_fk",
    columns: [t.organizationId, t.membershipId],
    foreignColumns: [memberships2.organizationId, memberships2.id]
  }).onDelete("cascade"),
  index26("busy_blocks_expiry_idx").on(t.organizationId, t.endsAt)
]);
var bookings2 = coreSchema2.table("bookings", {
  id: text35("id").notNull(),
  organizationId: orgColumn(),
  bookingTypeId: text35("booking_type_id").notNull(),
  membershipId: text35("membership_id").notNull(),
  prospectId: text35("prospect_id").notNull(),
  status: text35("status", { enum: BOOKING_STATES2 }).notNull().default("pending"),
  mode: text35("mode", { enum: BOOKING_MODES2 }).notNull(),
  origin: text35("origin", { enum: BOOKING_ORIGINS2 }).notNull().default("member"),
  startsAt: ts3("starts_at").notNull(),
  endsAt: ts3("ends_at").notNull(),
  blockedFrom: ts3("blocked_from").notNull(),
  blockedUntil: ts3("blocked_until").notNull(),
  idempotencyKeyHash: text35("idempotency_key_hash").notNull(),
  manageTokenHash: text35("manage_token_hash"),
  routingDecisionId: text35("routing_decision_id"),
  calendarEventId: text35("calendar_event_id"),
  joinUrl: text35("join_url"),
  cancelledAt: ts3("cancelled_at"),
  createdAt: createdAt3(),
  updatedAt: updatedAt3()
}, (t) => [
  primaryKey6({ name: "bookings_pkey", columns: [t.organizationId, t.id] }),
  check16("bookings_id_shape", idShape4("id", "bkg")),
  check16("bookings_organization_id_shape", orgShape3),
  check16("bookings_organization_not_global", notGlobal3),
  check16("bookings_status_known", sql21`${t.status} in (${list4(BOOKING_STATES2)})`),
  check16("bookings_mode_known", sql21`${t.mode} in (${list4(BOOKING_MODES2)})`),
  check16("bookings_origin_known", sql21`${t.origin} in (${list4(BOOKING_ORIGINS2)})`),
  check16("bookings_ends_after_starts", sql21`${t.endsAt} > ${t.startsAt}`),
  check16("bookings_blocked_covers_booking", sql21`${t.blockedFrom} <= ${t.startsAt} and ${t.blockedUntil} >= ${t.endsAt}`),
  check16("bookings_idempotency_key_hash_shape", sql21`${t.idempotencyKeyHash} ~ '^[0-9a-f]{64}$'`),
  check16("bookings_manage_token_hash_shape", sql21`${t.manageTokenHash} is null or ${t.manageTokenHash} ~ '^[0-9a-f]{64}$'`),
  check16("bookings_routing_decision_id_shape", sql21`${t.routingDecisionId} is null or ${t.routingDecisionId} ~ '^rdc_[0-9a-f]{32}$'`),
  check16("bookings_calendar_event_id_shape", sql21`${t.calendarEventId} is null or char_length(${t.calendarEventId}) between 1 and 1024`),
  check16("bookings_join_url_shape", sql21`${t.joinUrl} is null or (char_length(${t.joinUrl}) <= 2048 and ${t.joinUrl} ~ '^https://')`),
  check16("bookings_confirmed_has_event", sql21`${t.status} <> 'confirmed' or ${t.calendarEventId} is not null`),
  check16("bookings_cancelled_at_matches_status", sql21`(${t.status} = 'cancelled') = (${t.cancelledAt} is not null)`),
  foreignKey7({
    name: "bookings_booking_type_fk",
    columns: [t.organizationId, t.bookingTypeId],
    foreignColumns: [bookingTypes2.organizationId, bookingTypes2.id]
  }),
  foreignKey7({
    name: "bookings_membership_fk",
    columns: [t.organizationId, t.membershipId],
    foreignColumns: [memberships2.organizationId, memberships2.id]
  }).onDelete("cascade"),
  foreignKey7({
    name: "bookings_prospect_fk",
    columns: [t.organizationId, t.prospectId],
    foreignColumns: [prospects2.organizationId, prospects2.id]
  }).onDelete("cascade"),
  uniqueIndex5("bookings_idempotency_key").on(t.organizationId, t.idempotencyKeyHash),
  uniqueIndex5("bookings_manage_token_key").on(t.manageTokenHash),
  index26("bookings_rep_idx").on(t.organizationId, t.membershipId, t.startsAt, t.id),
  index26("bookings_list_idx").on(t.organizationId, t.startsAt, t.id),
  index26("bookings_prospect_idx").on(t.organizationId, t.prospectId, t.startsAt),
  index26("bookings_booking_type_idx").on(t.organizationId, t.bookingTypeId)
]);
var bookingManageDirectory2 = coreSchema2.table("booking_manage_directory", {
  tokenHash: text35("token_hash").primaryKey(),
  organizationId: text35("organization_id").notNull(),
  bookingId: text35("booking_id").notNull()
}, (t) => [
  check16("booking_manage_directory_token_hash_shape", sql21`${t.tokenHash} ~ '^[0-9a-f]{64}$'`),
  check16("booking_manage_directory_organization_id_shape", orgShape3),
  check16("booking_manage_directory_booking_id_shape", idShape4("booking_id", "bkg"))
]);
// src/schema/core-consent.ts
import { sql as sql22 } from "drizzle-orm";
import {
  bigint as bigint5,
  boolean as boolean9,
  check as check17,
  customType as customType7,
  foreignKey as foreignKey8,
  index as index27,
  integer as integer16,
  primaryKey as primaryKey7,
  text as text36,
  timestamp as timestamp29,
  uniqueIndex as uniqueIndex6
} from "drizzle-orm/pg-core";
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
var list5 = (values) => sql22.raw(values.map((v) => `'${v}'`).join(", "));
var idShape5 = (column, prefix) => sql22.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape4 = sql22.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal4 = sql22.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts4 = (name) => timestamp29(name, { withTimezone: true });
var bytes7 = customType7({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var textArray3 = customType7({
  dataType: () => "text[]"
});
var channelsValid = (column) => sql22.raw(`core.consent_channels_valid("${column}")`);
var consentWordings2 = coreSchema2.table("consent_wording", {
  id: text36("id").notNull(),
  organizationId: text36("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  version: integer16("version").notNull(),
  text: text36("text").notNull(),
  channels: textArray3("channels").notNull(),
  supersedesId: text36("supersedes_id"),
  createdAt: ts4("created_at").notNull().defaultNow(),
  createdByUserId: text36("created_by_user_id").notNull()
}, (t) => [
  primaryKey7({ name: "consent_wording_pkey", columns: [t.organizationId, t.id] }),
  check17("consent_wording_id_shape", idShape5("id", "cwd")),
  check17("consent_wording_organization_id_shape", orgShape4),
  check17("consent_wording_organization_not_global", notGlobal4),
  check17("consent_wording_supersedes_id_shape", idShape5("supersedes_id", "cwd")),
  check17("consent_wording_created_by_user_id_shape", idShape5("created_by_user_id", "usr")),
  check17("consent_wording_version_bounds", sql22`${t.version} >= 1`),
  check17("consent_wording_version_matches_lineage", sql22`(${t.version} = 1) = (${t.supersedesId} is null)`),
  check17("consent_wording_text_shape", sql22`char_length(${t.text}) between 1 and ${sql22.raw(String(MAX_CONSENT_WORDING_LENGTH2))} and ${t.text} = btrim(${t.text})`),
  check17("consent_wording_channels_valid", channelsValid("channels")),
  foreignKey8({
    name: "consent_wording_supersedes_fk",
    columns: [t.organizationId, t.supersedesId],
    foreignColumns: [t.organizationId, t.id]
  }),
  index27("consent_wordings_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  uniqueIndex6("consent_wording_supersedes_key").on(t.organizationId, t.supersedesId).where(sql22`${t.supersedesId} is not null`)
]);
var consentForms2 = coreSchema2.table("consent_form", {
  id: text36("id").notNull(),
  organizationId: text36("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  wordingId: text36("wording_id").notNull(),
  name: text36("name").notNull(),
  channels: textArray3("channels").notNull(),
  state: text36("state", { enum: CONSENT_FORM_STATES2 }).notNull().default("draft"),
  token: text36("token"),
  createdAt: ts4("created_at").notNull().defaultNow(),
  createdByUserId: text36("created_by_user_id").notNull(),
  publishedAt: ts4("published_at"),
  closedAt: ts4("closed_at")
}, (t) => [
  primaryKey7({ name: "consent_form_pkey", columns: [t.organizationId, t.id] }),
  check17("consent_form_id_shape", idShape5("id", "cfm")),
  check17("consent_form_organization_id_shape", orgShape4),
  check17("consent_form_organization_not_global", notGlobal4),
  check17("consent_form_wording_id_shape", idShape5("wording_id", "cwd")),
  check17("consent_form_created_by_user_id_shape", idShape5("created_by_user_id", "usr")),
  check17("consent_form_name_shape", sql22`char_length(${t.name}) between 1 and ${sql22.raw(String(MAX_CONSENT_FORM_NAME_LENGTH2))} and ${t.name} = btrim(${t.name})`),
  check17("consent_form_channels_valid", channelsValid("channels")),
  check17("consent_form_state_known", sql22`${t.state} in (${list5(CONSENT_FORM_STATES2)})`),
  check17("consent_form_token_shape", sql22`${t.token} is null or (char_length(${t.token}) between ${sql22.raw(String(MIN_FORM_TOKEN_LENGTH2))} and ${sql22.raw(String(MAX_FORM_TOKEN_LENGTH2))} and ${t.token} collate "C" ~ '${sql22.raw(FORM_TOKEN_PATTERN2)}')`),
  check17("consent_form_lifecycle", sql22`(${t.state} = 'draft') = (${t.publishedAt} is null)
        and (${t.state} = 'draft') = (${t.token} is null)
        and (${t.state} = 'closed') = (${t.closedAt} is not null)`),
  foreignKey8({
    name: "consent_form_wording_fk",
    columns: [t.organizationId, t.wordingId],
    foreignColumns: [consentWordings2.organizationId, consentWordings2.id]
  }),
  uniqueIndex6("consent_form_token_key").on(t.token).where(sql22`${t.token} is not null`),
  index27("consent_forms_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index27("consent_forms_state_list_idx").on(t.organizationId, t.state, t.createdAt.desc(), t.id.desc()),
  index27("consent_forms_wording_idx").on(t.organizationId, t.wordingId)
]);
var consentFormDirectory2 = coreSchema2.table("consent_form_directory", {
  token: text36("token").primaryKey(),
  organizationId: text36("organization_id").notNull(),
  formId: text36("form_id").notNull(),
  wordingId: text36("wording_id").notNull(),
  state: text36("state", { enum: ["published", "closed"] }).notNull()
}, (t) => [
  check17("consent_form_directory_token_shape", sql22`char_length(${t.token}) between ${sql22.raw(String(MIN_FORM_TOKEN_LENGTH2))} and ${sql22.raw(String(MAX_FORM_TOKEN_LENGTH2))} and ${t.token} collate "C" ~ '${sql22.raw(FORM_TOKEN_PATTERN2)}'`),
  check17("consent_form_directory_organization_id_shape", orgShape4),
  check17("consent_form_directory_form_id_shape", idShape5("form_id", "cfm")),
  check17("consent_form_directory_wording_id_shape", idShape5("wording_id", "cwd")),
  check17("consent_form_directory_state_known", sql22`${t.state} in ('published', 'closed')`)
]);
var contactConsentEvents2 = coreSchema2.table("contact_consent_event", {
  id: text36("id").notNull(),
  organizationId: text36("organization_id").notNull(),
  seq: bigint5("seq", { mode: "number" }).generatedAlwaysAsIdentity().notNull(),
  prospectId: text36("prospect_id").notNull(),
  channel: text36("channel", { enum: CONSENT_CHANNELS2 }).notNull(),
  kind: text36("kind", { enum: CONSENT_EVENT_KINDS2 }).notNull(),
  source: text36("source").notNull(),
  wordingId: text36("wording_id"),
  evidenceRef: text36("evidence_ref"),
  callId: text36("call_id"),
  formId: text36("form_id"),
  ipAddress: text36("ip_address"),
  userAgent: text36("user_agent"),
  stopAll: boolean9("stop_all").notNull().default(false),
  recordedByUserId: text36("recorded_by_user_id"),
  occurredAt: ts4("occurred_at").notNull(),
  recordedAt: ts4("recorded_at").notNull().defaultNow()
}, (t) => [
  primaryKey7({ name: "contact_consent_event_pkey", columns: [t.organizationId, t.id] }),
  check17("contact_consent_event_id_shape", idShape5("id", "cev")),
  check17("contact_consent_event_organization_id_shape", orgShape4),
  check17("contact_consent_event_organization_not_global", notGlobal4),
  check17("contact_consent_event_prospect_id_shape", idShape5("prospect_id", "prs")),
  check17("contact_consent_event_wording_id_shape", idShape5("wording_id", "cwd")),
  check17("contact_consent_event_call_id_shape", idShape5("call_id", "call")),
  check17("contact_consent_event_form_id_shape", idShape5("form_id", "cfm")),
  check17("contact_consent_event_recorded_by_user_id_shape", idShape5("recorded_by_user_id", "usr")),
  check17("contact_consent_event_channel_known", sql22`${t.channel} in (${list5(CONSENT_CHANNELS2)})`),
  check17("contact_consent_event_kind_known", sql22`${t.kind} in (${list5(CONSENT_EVENT_KINDS2)})`),
  check17("contact_consent_event_source_matches_kind", sql22`(${t.kind} = 'granted' and ${t.source} in (${list5(CONSENT_GRANT_SOURCES2)}))
        or (${t.kind} = 'withdrawn' and ${t.source} in (${list5(CONSENT_WITHDRAWAL_SOURCES2)}))`),
  check17("contact_consent_event_grant_has_evidence", sql22`${t.kind} <> 'granted' or (${t.wordingId} is not null and ${t.evidenceRef} is not null)`),
  check17("contact_consent_event_evidence_ref_shape", sql22`${t.evidenceRef} is null or char_length(${t.evidenceRef}) between 1 and ${sql22.raw(String(MAX_EVIDENCE_REF_LENGTH2))}`),
  check17("contact_consent_event_stop_all_withdrawal", sql22`not ${t.stopAll} or ${t.kind} = 'withdrawn'`),
  check17("contact_consent_event_call_matches_source", sql22`(${t.source} = 'verbal_call') = (${t.callId} is not null)`),
  check17("contact_consent_event_form_matches_source", sql22`(${t.source} = 'hosted_form') = (${t.formId} is not null)`),
  check17("contact_consent_event_submission_matches_source", sql22`(${t.source} = 'hosted_form') = (${t.ipAddress} is not null and ${t.userAgent} is not null)
        and (${t.ipAddress} is null) = (${t.userAgent} is null)
        and (${t.ipAddress} is null or char_length(${t.ipAddress}) between 1 and ${sql22.raw(String(MAX_SUBMISSION_IP_LENGTH2))})
        and (${t.userAgent} is null or char_length(${t.userAgent}) <= ${sql22.raw(String(MAX_SUBMISSION_USER_AGENT_LENGTH2))})`),
  foreignKey8({
    name: "contact_consent_event_prospect_fk",
    columns: [t.organizationId, t.prospectId],
    foreignColumns: [prospects2.organizationId, prospects2.id]
  }).onDelete("cascade"),
  foreignKey8({
    name: "contact_consent_event_wording_fk",
    columns: [t.organizationId, t.wordingId],
    foreignColumns: [consentWordings2.organizationId, consentWordings2.id]
  }).onDelete("cascade"),
  foreignKey8({
    name: "contact_consent_event_form_fk",
    columns: [t.organizationId, t.formId],
    foreignColumns: [consentForms2.organizationId, consentForms2.id]
  }).onDelete("cascade"),
  index27("contact_consent_events_channel_idx").on(t.organizationId, t.prospectId, t.channel, t.seq.desc()),
  index27("contact_consent_events_prospect_idx").on(t.organizationId, t.prospectId, t.seq.desc()),
  index27("contact_consent_events_wording_idx").on(t.organizationId, t.wordingId).where(sql22`${t.wordingId} is not null`),
  index27("contact_consent_events_form_idx").on(t.organizationId, t.formId).where(sql22`${t.formId} is not null`)
]);
var suppressionEntries2 = coreSchema2.table("suppression_entry", {
  id: text36("id").notNull(),
  organizationId: text36("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  addressKind: text36("address_kind", { enum: SUPPRESSION_ADDRESS_KINDS2 }).notNull(),
  addressHash: bytes7("address_hash").notNull(),
  maskedAddress: text36("masked_address"),
  reason: text36("reason", { enum: SUPPRESSION_REASONS2 }).notNull(),
  channel: text36("channel", { enum: CONSENT_CHANNELS2 }),
  sourceRef: text36("source_ref"),
  addedByUserId: text36("added_by_user_id"),
  removable: boolean9("removable").notNull().generatedAlwaysAs(sql22`reason in (${list5(SUPPRESSION_REMOVABLE_REASONS2)})`),
  createdAt: ts4("created_at").notNull().defaultNow(),
  removedAt: ts4("removed_at"),
  removedByUserId: text36("removed_by_user_id"),
  removalReason: text36("removal_reason")
}, (t) => [
  primaryKey7({ name: "suppression_entry_pkey", columns: [t.organizationId, t.id] }),
  check17("suppression_entry_id_shape", idShape5("id", "sup")),
  check17("suppression_entry_organization_id_shape", orgShape4),
  check17("suppression_entry_organization_not_global", notGlobal4),
  check17("suppression_entry_added_by_user_id_shape", idShape5("added_by_user_id", "usr")),
  check17("suppression_entry_removed_by_user_id_shape", idShape5("removed_by_user_id", "usr")),
  check17("suppression_entry_address_kind_known", sql22`${t.addressKind} in (${list5(SUPPRESSION_ADDRESS_KINDS2)})`),
  check17("suppression_entry_address_hash_length", sql22`octet_length(${t.addressHash}) = ${sql22.raw(String(ADDRESS_HASH_BYTES2))}`),
  check17("suppression_entry_reason_known", sql22`${t.reason} in (${list5(SUPPRESSION_REASONS2)})`),
  check17("suppression_entry_channel_known", sql22`${t.channel} in (${list5(CONSENT_CHANNELS2)})`),
  check17("suppression_entry_masked_address_shape", sql22`(${t.reason} = 'erased') = (${t.maskedAddress} is null)
        and (${t.maskedAddress} is null or char_length(${t.maskedAddress}) between 1 and ${sql22.raw(String(MAX_MASKED_ADDRESS_LENGTH2))})`),
  check17("suppression_entry_source_ref_shape", sql22`${t.sourceRef} is null or char_length(${t.sourceRef}) between 1 and ${sql22.raw(String(MAX_SUPPRESSION_SOURCE_REF_LENGTH2))}`),
  check17("suppression_entry_removal_complete", sql22`(${t.removedAt} is null) = (${t.removedByUserId} is null)
        and (${t.removedAt} is null) = (${t.removalReason} is null)`),
  check17("suppression_entry_removal_reason_shape", sql22`${t.removalReason} is null or (char_length(${t.removalReason}) between 1 and ${sql22.raw(String(MAX_SUPPRESSION_NOTE_LENGTH2))}
        and ${t.removalReason} = btrim(${t.removalReason}))`),
  check17("suppression_entry_only_removable_removed", sql22`${t.removedAt} is null or ${t.removable}`),
  uniqueIndex6("suppression_entry_live_key").on(t.organizationId, t.addressKind, t.addressHash).where(sql22`${t.removedAt} is null`),
  index27("suppression_entries_live_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()).where(sql22`${t.removedAt} is null`),
  index27("suppression_entries_removed_list_idx").on(t.organizationId, t.removedAt.desc(), t.id.desc()).where(sql22`${t.removedAt} is not null`),
  index27("suppression_entries_reason_list_idx").on(t.organizationId, t.reason, t.createdAt.desc(), t.id.desc()),
  index27("suppression_entries_kind_list_idx").on(t.organizationId, t.addressKind, t.createdAt.desc(), t.id.desc())
]);
var contactCheckLog2 = coreSchema2.table("contact_check_log", {
  id: text36("id").notNull(),
  organizationId: text36("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  prospectId: text36("prospect_id"),
  channel: text36("channel", { enum: CONSENT_CHANNELS2 }).notNull(),
  purpose: text36("purpose", { enum: CONTACT_PURPOSES2 }).notNull(),
  caller: text36("caller").notNull(),
  allowed: boolean9("allowed").notNull(),
  code: text36("code", { enum: LOGGED_DENIAL_CODES2 }),
  basis: text36("basis", { enum: CONTACT_ALLOW_BASES2 }),
  checkedAt: ts4("checked_at").notNull().defaultNow()
}, (t) => [
  primaryKey7({ name: "contact_check_log_pkey", columns: [t.organizationId, t.id] }),
  check17("contact_check_log_id_shape", idShape5("id", "chk")),
  check17("contact_check_log_organization_id_shape", orgShape4),
  check17("contact_check_log_organization_not_global", notGlobal4),
  check17("contact_check_log_prospect_id_shape", idShape5("prospect_id", "prs")),
  check17("contact_check_log_channel_known", sql22`${t.channel} in (${list5(CONSENT_CHANNELS2)})`),
  check17("contact_check_log_purpose_known", sql22`${t.purpose} in (${list5(CONTACT_PURPOSES2)})`),
  check17("contact_check_log_caller_shape", sql22`char_length(${t.caller}) between 1 and ${sql22.raw(String(MAX_CALLER_LENGTH2))} and ${t.caller} collate "C" ~ '^[a-z][a-z0-9_-]*$'`),
  check17("contact_check_log_code_known", sql22`${t.code} in (${list5(LOGGED_DENIAL_CODES2)})`),
  check17("contact_check_log_basis_known", sql22`${t.basis} in (${list5(CONTACT_ALLOW_BASES2)})`),
  check17("contact_check_log_outcome_consistent", sql22`(${t.allowed} and ${t.basis} is not null and ${t.code} is null)
        or (not ${t.allowed} and ${t.basis} is null and ${t.code} is not null)`),
  index27("contact_check_log_list_idx").on(t.organizationId, t.checkedAt.desc(), t.id.desc()),
  index27("contact_check_log_prospect_idx").on(t.organizationId, t.prospectId, t.checkedAt.desc(), t.id.desc()).where(sql22`${t.prospectId} is not null`)
]);
var MAX_SUPPRESSION_IMPORT_ROWS2 = 50000;
var MAX_SUPPRESSION_IMPORT_BYTES2 = 10 * 1024 * 1024;
var SUPPRESSION_IMPORT_STATES2 = ["uploaded", "processing", "completed", "failed"];
var SUPPRESSION_IMPORT_FAILURE_REASONS2 = ["too_many_rows", "unreadable"];
var SUPPRESSION_IMPORT_ROW_RESULTS2 = ["added", "already_suppressed", "invalid"];
var SUPPRESSION_IMPORT_ROW_REASONS2 = ["unreadable_address", "unsupported_address"];
var suppressionImports2 = coreSchema2.table("suppression_imports", {
  id: text36("id").notNull(),
  organizationId: text36("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  state: text36("state", { enum: SUPPRESSION_IMPORT_STATES2 }).notNull().default("uploaded"),
  failureReason: text36("failure_reason", { enum: SUPPRESSION_IMPORT_FAILURE_REASONS2 }),
  sizeBytes: bigint5("size_bytes", { mode: "number" }).notNull(),
  contentHash: bytes7("content_hash").notNull(),
  objectKey: text36("object_key").notNull(),
  processedRows: integer16("processed_rows").notNull().default(0),
  totalRows: integer16("total_rows"),
  addedRows: integer16("added_rows"),
  alreadySuppressedRows: integer16("already_suppressed_rows"),
  invalidRows: integer16("invalid_rows"),
  createdByUserId: text36("created_by_user_id").notNull(),
  createdAt: ts4("created_at").notNull().defaultNow(),
  updatedAt: ts4("updated_at").notNull().defaultNow(),
  completedAt: ts4("completed_at")
}, (t) => [
  primaryKey7({ name: "suppression_imports_pkey", columns: [t.organizationId, t.id] }),
  check17("suppression_imports_id_shape", idShape5("id", "simp")),
  check17("suppression_imports_organization_id_shape", orgShape4),
  check17("suppression_imports_organization_not_global", notGlobal4),
  check17("suppression_imports_created_by_user_id_shape", idShape5("created_by_user_id", "usr")),
  check17("suppression_imports_state_known", sql22`${t.state} in (${list5(SUPPRESSION_IMPORT_STATES2)})`),
  check17("suppression_imports_failure_reason_known", sql22`${t.failureReason} in (${list5(SUPPRESSION_IMPORT_FAILURE_REASONS2)})`),
  check17("suppression_imports_failed_has_reason", sql22`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check17("suppression_imports_size_bounds", sql22`${t.sizeBytes} between 1 and ${sql22.raw(String(MAX_SUPPRESSION_IMPORT_BYTES2))}`),
  check17("suppression_imports_content_hash_length", sql22`octet_length(${t.contentHash}) = 32`),
  check17("suppression_imports_object_key_shape", sql22`char_length(${t.objectKey}) between 1 and 1024 and ${t.objectKey} collate "C" ~ '^[!-~]+$'`),
  check17("suppression_imports_processed_rows_bounds", sql22`${t.processedRows} between 0 and ${sql22.raw(String(MAX_SUPPRESSION_IMPORT_ROWS2))}`),
  check17("suppression_imports_counts_when_completed", sql22`(${t.state} = 'completed') = (${t.totalRows} is not null)
        and (${t.totalRows} is null) = (${t.addedRows} is null)
        and (${t.totalRows} is null) = (${t.alreadySuppressedRows} is null)
        and (${t.totalRows} is null) = (${t.invalidRows} is null)
        and (${t.totalRows} is null) = (${t.completedAt} is null)`),
  check17("suppression_imports_counts_add_up", sql22`${t.totalRows} is null or (${t.addedRows} >= 0 and ${t.alreadySuppressedRows} >= 0
        and ${t.invalidRows} >= 0
        and ${t.totalRows} <= ${sql22.raw(String(MAX_SUPPRESSION_IMPORT_ROWS2))}
        and ${t.totalRows} = ${t.addedRows} + ${t.alreadySuppressedRows} + ${t.invalidRows})`),
  index27("suppression_imports_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc())
]);
var suppressionImportRows2 = coreSchema2.table("suppression_import_rows", {
  organizationId: text36("organization_id").notNull(),
  importId: text36("import_id").notNull(),
  rowNumber: integer16("row_number").notNull(),
  result: text36("result", { enum: SUPPRESSION_IMPORT_ROW_RESULTS2 }).notNull(),
  reason: text36("reason", { enum: SUPPRESSION_IMPORT_ROW_REASONS2 })
}, (t) => [
  primaryKey7({
    name: "suppression_import_rows_pkey",
    columns: [t.organizationId, t.importId, t.rowNumber]
  }),
  check17("suppression_import_rows_organization_id_shape", orgShape4),
  check17("suppression_import_rows_organization_not_global", notGlobal4),
  check17("suppression_import_rows_import_id_shape", idShape5("import_id", "simp")),
  check17("suppression_import_rows_row_number_bounds", sql22`${t.rowNumber} between 2 and ${sql22.raw(String(MAX_SUPPRESSION_IMPORT_ROWS2 + 1))}`),
  check17("suppression_import_rows_result_known", sql22`${t.result} in (${list5(SUPPRESSION_IMPORT_ROW_RESULTS2)})`),
  check17("suppression_import_rows_reason_matches_result", sql22`(${t.result} = 'invalid') = (${t.reason} is not null)
        and (${t.reason} is null or ${t.reason} in (${list5(SUPPRESSION_IMPORT_ROW_REASONS2)}))`),
  foreignKey8({
    name: "suppression_import_rows_import_fk",
    columns: [t.organizationId, t.importId],
    foreignColumns: [suppressionImports2.organizationId, suppressionImports2.id]
  }).onDelete("cascade"),
  index27("suppression_import_rows_result_idx").on(t.organizationId, t.importId, t.result, t.rowNumber)
]);
// src/schema/core-controls.ts
import { sql as sql23 } from "drizzle-orm";
import {
  bigint as bigint6,
  boolean as boolean10,
  check as check18,
  foreignKey as foreignKey9,
  index as index28,
  integer as integer17,
  jsonb as jsonb14,
  primaryKey as primaryKey8,
  text as text37,
  timestamp as timestamp30,
  uniqueIndex as uniqueIndex7
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
var list6 = (values) => sql23.raw(values.map((v) => `'${v}'`).join(", "));
var idShape6 = (column, prefix) => sql23.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape5 = sql23.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal5 = sql23.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var hexHash = (column) => sql23.raw(`"${column}" ~ '^[0-9a-f]{64}$'`);
var ts5 = (name) => timestamp30(name, { withTimezone: true });
var num2 = (n) => sql23.raw(String(n));
var agentInstructionVersions2 = coreSchema2.table("agent_instruction_versions", {
  id: text37("id").notNull(),
  organizationId: text37("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  agentKind: text37("agent_kind", { enum: AGENT_KINDS2 }).notNull(),
  number: integer17("number").notNull(),
  text: text37("text").notNull(),
  authorMembershipId: text37("author_membership_id"),
  createdAt: ts5("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey8({ name: "agent_instruction_versions_pkey", columns: [t.organizationId, t.id] }),
  check18("agent_instruction_versions_id_shape", idShape6("id", "ains")),
  check18("agent_instruction_versions_organization_id_shape", orgShape5),
  check18("agent_instruction_versions_organization_not_global", notGlobal5),
  check18("agent_instruction_versions_agent_kind_known", sql23`${t.agentKind} in (${list6(AGENT_KINDS2)})`),
  check18("agent_instruction_versions_number_positive", sql23`${t.number} >= 1`),
  check18("agent_instruction_versions_text_length", sql23`char_length(${t.text}) between 1 and ${num2(MAX_AGENT_INSTRUCTION_LENGTH2)}`),
  check18("agent_instruction_versions_author_shape", sql23`${t.authorMembershipId} is null or ${t.authorMembershipId} ~ '^mem_[0-9a-f]{32}$'`),
  uniqueIndex7("agent_instruction_versions_number_key").on(t.organizationId, t.agentKind, t.number)
]);
var agentInstructionPointers2 = coreSchema2.table("agent_instruction_pointer", {
  organizationId: text37("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  agentKind: text37("agent_kind", { enum: AGENT_KINDS2 }).notNull(),
  versionNumber: integer17("version_number").notNull(),
  publishedByMembershipId: text37("published_by_membership_id"),
  publishedAt: ts5("published_at").notNull().defaultNow()
}, (t) => [
  primaryKey8({
    name: "agent_instruction_pointer_pkey",
    columns: [t.organizationId, t.agentKind]
  }),
  foreignKey9({
    name: "agent_instruction_pointer_version_fk",
    columns: [t.organizationId, t.agentKind, t.versionNumber],
    foreignColumns: [
      agentInstructionVersions2.organizationId,
      agentInstructionVersions2.agentKind,
      agentInstructionVersions2.number
    ]
  }),
  check18("agent_instruction_pointer_organization_id_shape", orgShape5),
  check18("agent_instruction_pointer_organization_not_global", notGlobal5),
  check18("agent_instruction_pointer_agent_kind_known", sql23`${t.agentKind} in (${list6(AGENT_KINDS2)})`),
  check18("agent_instruction_pointer_published_by_shape", sql23`${t.publishedByMembershipId} is null or ${t.publishedByMembershipId} ~ '^mem_[0-9a-f]{32}$'`)
]);
var agentSettings2 = coreSchema2.table("agent_settings", {
  organizationId: text37("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  agentKind: text37("agent_kind", { enum: [...AGENT_KINDS2, ORGANIZATION_AGENT_KIND2] }).notNull(),
  channel: text37("channel", { enum: [...AGENT_SETTING_CHANNELS2, DEFAULT_CHANNEL2] }).notNull().default(DEFAULT_CHANNEL2),
  level: text37("level", { enum: CONTROL_LEVELS2 }),
  sendWindow: jsonb14("send_window"),
  escalationRules: jsonb14("escalation_rules"),
  agentsPaused: boolean10("agents_paused"),
  updatedByMembershipId: text37("updated_by_membership_id"),
  updatedAt: ts5("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey8({
    name: "agent_settings_pkey",
    columns: [t.organizationId, t.agentKind, t.channel]
  }),
  check18("agent_settings_organization_id_shape", orgShape5),
  check18("agent_settings_organization_not_global", notGlobal5),
  check18("agent_settings_agent_kind_known", sql23`${t.agentKind} in (${list6([...AGENT_KINDS2, ORGANIZATION_AGENT_KIND2])})`),
  check18("agent_settings_channel_known", sql23`${t.channel} in (${list6([...AGENT_SETTING_CHANNELS2, DEFAULT_CHANNEL2])})`),
  check18("agent_settings_level_known", sql23`${t.level} is null or ${t.level} in (${list6(CONTROL_LEVELS2)})`),
  check18("agent_settings_updated_by_shape", sql23`${t.updatedByMembershipId} is null or ${t.updatedByMembershipId} ~ '^mem_[0-9a-f]{32}$'`),
  check18("agent_settings_send_window_shape", sql23`${t.sendWindow} is null or jsonb_typeof(${t.sendWindow}) = 'object'`),
  check18("agent_settings_escalation_rules_shape", sql23`${t.escalationRules} is null or (jsonb_typeof(${t.escalationRules}) = 'array' and jsonb_array_length(${t.escalationRules}) <= ${num2(MAX_ESCALATION_RULES2)})`),
  check18("agent_settings_row_columns", sql23`(${t.agentKind} <> 'organization'
          and ${t.level} is not null and ${t.sendWindow} is not null and ${t.escalationRules} is not null
          and ${t.agentsPaused} is null)
        or (${t.agentKind} = 'organization' and ${t.channel} = 'default'
          and ${t.agentsPaused} is not null
          and ${t.level} is null and ${t.sendWindow} is null and ${t.escalationRules} is null)`)
]);
var auditEvents2 = coreSchema2.table("audit_events", {
  id: text37("id").notNull(),
  organizationId: text37("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  sequence: bigint6("sequence", { mode: "number" }).notNull(),
  occurredAt: ts5("occurred_at").notNull(),
  actorKind: text37("actor_kind", { enum: AUDIT_ACTOR_KINDS2 }).notNull(),
  actorMembershipId: text37("actor_membership_id"),
  actorAgentKind: text37("actor_agent_kind", { enum: AGENT_KINDS2 }),
  actorApiKeyId: text37("actor_api_key_id"),
  action: text37("action").notNull(),
  subjectType: text37("subject_type"),
  subjectId: text37("subject_id"),
  prospectId: text37("prospect_id"),
  instructionVersion: integer17("instruction_version"),
  requestId: text37("request_id"),
  metadata: jsonb14("metadata").notNull().default(sql23`'{}'::jsonb`),
  previousHash: text37("previous_hash"),
  hash: text37("hash").notNull(),
  recordedAt: ts5("recorded_at").notNull().defaultNow()
}, (t) => [
  primaryKey8({ name: "audit_events_pkey", columns: [t.organizationId, t.id] }),
  check18("audit_events_id_shape", idShape6("id", "aud")),
  check18("audit_events_organization_id_shape", orgShape5),
  check18("audit_events_organization_not_global", notGlobal5),
  check18("audit_events_sequence_positive", sql23`${t.sequence} >= 1`),
  check18("audit_events_actor_kind_known", sql23`${t.actorKind} in (${list6(AUDIT_ACTOR_KINDS2)})`),
  check18("audit_events_actor_columns", sql23`(${t.actorKind} = 'member' and ${t.actorMembershipId} is not null and ${t.actorMembershipId} ~ '^mem_[0-9a-f]{32}$'
            and ${t.actorAgentKind} is null and ${t.actorApiKeyId} is null)
        or (${t.actorKind} = 'agent' and ${t.actorAgentKind} is not null and ${t.actorAgentKind} in (${list6(AGENT_KINDS2)})
            and ${t.actorMembershipId} is null and ${t.actorApiKeyId} is null)
        or (${t.actorKind} = 'api_key' and ${t.actorApiKeyId} is not null and ${t.actorApiKeyId} ~ '^akey_[0-9a-f]{32}$'
            and ${t.actorMembershipId} is null and ${t.actorAgentKind} is null)
        or (${t.actorKind} = 'system'
            and ${t.actorMembershipId} is null and ${t.actorAgentKind} is null and ${t.actorApiKeyId} is null)`),
  check18("audit_events_action_shape", sql23`char_length(${t.action}) <= 100 and ${t.action} ~ '^[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*$'`),
  check18("audit_events_subject_shape", sql23`(${t.subjectType} is null and ${t.subjectId} is null)
        or (${t.subjectType} is not null and char_length(${t.subjectType}) <= 40 and ${t.subjectType} ~ '^[a-z][a-z0-9_]*$'
            and ${t.subjectId} is not null and char_length(${t.subjectId}) <= 64 and ${t.subjectId} ~ '^[a-z][a-z0-9_]*_[0-9a-f]{32}$')`),
  check18("audit_events_prospect_id_shape", sql23`${t.prospectId} is null or ${t.prospectId} ~ '^prs_[0-9a-f]{32}$'`),
  check18("audit_events_instruction_version_positive", sql23`${t.instructionVersion} is null or ${t.instructionVersion} >= 1`),
  check18("audit_events_request_id_shape", sql23`${t.requestId} is null or ${t.requestId} ~ '^req_[0-9a-f]{32}$'`),
  check18("audit_events_metadata_shape", sql23`jsonb_typeof(${t.metadata}) = 'object' and octet_length(${t.metadata}::text) <= ${num2(MAX_AUDIT_METADATA_BYTES2)}`),
  check18("audit_events_hash_shape", hexHash("hash")),
  check18("audit_events_previous_hash_shape", sql23`${t.previousHash} is null or ${t.previousHash} ~ '^[0-9a-f]{64}$'`),
  check18("audit_events_chain_start", sql23`(${t.sequence} = 1) = (${t.previousHash} is null)`),
  uniqueIndex7("audit_events_sequence_key").on(t.organizationId, t.sequence),
  index28("audit_events_occurred_idx").on(t.organizationId, t.occurredAt.desc(), t.sequence.desc()),
  index28("audit_events_action_idx").on(t.organizationId, t.action, t.sequence.desc()),
  index28("audit_events_subject_idx").on(t.organizationId, t.subjectType, t.subjectId, t.sequence.desc()).where(sql23`${t.subjectId} is not null`),
  index28("audit_events_prospect_idx").on(t.organizationId, t.prospectId, t.sequence.desc()).where(sql23`${t.prospectId} is not null`),
  index28("audit_events_actor_member_idx").on(t.organizationId, t.actorMembershipId, t.sequence.desc()).where(sql23`${t.actorMembershipId} is not null`),
  index28("audit_events_actor_api_key_idx").on(t.organizationId, t.actorApiKeyId, t.sequence.desc()).where(sql23`${t.actorApiKeyId} is not null`),
  index28("audit_events_actor_agent_idx").on(t.organizationId, t.actorAgentKind, t.sequence.desc()).where(sql23`${t.actorAgentKind} is not null`)
]);
var exportJobs2 = coreSchema2.table("export_jobs", {
  id: text37("id").notNull(),
  organizationId: text37("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  kind: text37("kind", { enum: EXPORT_KINDS2 }).notNull(),
  format: text37("format", { enum: EXPORT_FORMATS2 }),
  filter: jsonb14("filter"),
  state: text37("state", { enum: EXPORT_STATES2 }).notNull().default("queued"),
  requestedByMembershipId: text37("requested_by_membership_id").notNull(),
  includeRecordingLinks: boolean10("include_recording_links").notNull().default(false),
  failureReason: text37("failure_reason", { enum: EXPORT_FAILURE_REASONS2 }),
  requestedAt: ts5("requested_at").notNull().defaultNow(),
  completedAt: ts5("completed_at"),
  expiresAt: ts5("expires_at")
}, (t) => [
  primaryKey8({ name: "export_jobs_pkey", columns: [t.organizationId, t.id] }),
  check18("export_jobs_id_shape", idShape6("id", "exp")),
  check18("export_jobs_organization_id_shape", orgShape5),
  check18("export_jobs_organization_not_global", notGlobal5),
  check18("export_jobs_kind_known", sql23`${t.kind} in (${list6(EXPORT_KINDS2)})`),
  check18("export_jobs_format_known", sql23`${t.format} is null or ${t.format} in (${list6(EXPORT_FORMATS2)})`),
  check18("export_jobs_state_known", sql23`${t.state} in (${list6(EXPORT_STATES2)})`),
  check18("export_jobs_failure_reason_known", sql23`${t.failureReason} is null or ${t.failureReason} in (${list6(EXPORT_FAILURE_REASONS2)})`),
  check18("export_jobs_requested_by_shape", idShape6("requested_by_membership_id", "mem")),
  check18("export_jobs_filter_shape", sql23`${t.filter} is null or jsonb_typeof(${t.filter}) = 'object'`),
  check18("export_jobs_kind_columns", sql23`(${t.kind} = 'organization' and ${t.format} is null and ${t.filter} is null)
        or (${t.kind} = 'enriched_prospects' and ${t.format} is not null and ${t.includeRecordingLinks} = false)`),
  check18("export_jobs_failure_iff_failed", sql23`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check18("export_jobs_completion", sql23`(${t.state} in ('queued', 'running') and ${t.completedAt} is null and ${t.expiresAt} is null)
        or (${t.state} in ('ready', 'expired') and ${t.completedAt} is not null and ${t.expiresAt} is not null)
        or (${t.state} = 'failed' and ${t.completedAt} is not null and ${t.expiresAt} is null)`),
  uniqueIndex7("export_jobs_one_active_key").on(t.organizationId).where(sql23`${t.state} in (${list6(EXPORT_ACTIVE_STATES2)})`),
  index28("export_jobs_list_idx").on(t.organizationId, t.requestedAt.desc(), t.id.desc())
]);
var exportParts2 = coreSchema2.table("export_parts", {
  organizationId: text37("organization_id").notNull(),
  exportId: text37("export_id").notNull(),
  service: text37("service", { enum: EXPORT_SERVICES2 }).notNull(),
  state: text37("state", { enum: EXPORT_PART_STATES2 }).notNull().default("pending"),
  prefix: text37("prefix"),
  fileCount: integer17("file_count"),
  bytes: bigint6("bytes", { mode: "number" }),
  failureReason: text37("failure_reason", { enum: EXPORT_PART_FAILURE_REASONS2 }),
  readyAt: ts5("ready_at"),
  updatedAt: ts5("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey8({
    name: "export_parts_pkey",
    columns: [t.organizationId, t.exportId, t.service]
  }),
  foreignKey9({
    name: "export_parts_export_fk",
    columns: [t.organizationId, t.exportId],
    foreignColumns: [exportJobs2.organizationId, exportJobs2.id]
  }).onDelete("cascade"),
  check18("export_parts_organization_id_shape", orgShape5),
  check18("export_parts_organization_not_global", notGlobal5),
  check18("export_parts_export_id_shape", idShape6("export_id", "exp")),
  check18("export_parts_service_known", sql23`${t.service} in (${list6(EXPORT_SERVICES2)})`),
  check18("export_parts_state_known", sql23`${t.state} in (${list6(EXPORT_PART_STATES2)})`),
  check18("export_parts_failure_reason_known", sql23`${t.failureReason} is null or ${t.failureReason} in (${list6(EXPORT_PART_FAILURE_REASONS2)})`),
  check18("export_parts_prefix_shape", sql23`${t.prefix} is null or (char_length(${t.prefix}) <= ${num2(MAX_EXPORT_PREFIX_LENGTH2)}
        and ${t.prefix} ~ '^[A-Za-z0-9_][A-Za-z0-9_./-]*$' and ('/' || ${t.prefix} || '/') not like '%/../%')`),
  check18("export_parts_file_count_range", sql23`${t.fileCount} is null or ${t.fileCount} between 0 and ${num2(MAX_EXPORT_PART_FILES2)}`),
  check18("export_parts_bytes_range", sql23`${t.bytes} is null or ${t.bytes} between 0 and ${num2(MAX_EXPORT_PART_BYTES2)}`),
  check18("export_parts_state_columns", sql23`(${t.state} = 'pending' and ${t.prefix} is null and ${t.fileCount} is null and ${t.bytes} is null and ${t.failureReason} is null and ${t.readyAt} is null)
        or (${t.state} = 'ready' and ${t.prefix} is not null and ${t.fileCount} is not null and ${t.bytes} is not null and ${t.failureReason} is null and ${t.readyAt} is not null)
        or (${t.state} = 'failed' and ${t.failureReason} is not null and ${t.readyAt} is null)`)
]);
var coreApiKeys2 = coreSchema2.table("api_keys", {
  id: text37("id").notNull(),
  organizationId: text37("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  name: text37("name").notNull(),
  prefix: text37("prefix").notNull(),
  secretHash: text37("secret_hash").notNull(),
  scopes: text37("scopes").array().notNull(),
  roleCeiling: text37("role_ceiling", { enum: API_KEY_ROLE_CEILINGS2 }).notNull(),
  expiresAt: ts5("expires_at"),
  lastUsedAt: ts5("last_used_at"),
  revokedAt: ts5("revoked_at"),
  createdByMembershipId: text37("created_by_membership_id").notNull(),
  createdAt: ts5("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey8({ name: "api_keys_pkey", columns: [t.organizationId, t.id] }),
  check18("api_keys_id_shape", idShape6("id", "akey")),
  check18("api_keys_organization_id_shape", orgShape5),
  check18("api_keys_organization_not_global", notGlobal5),
  check18("api_keys_name_length", sql23`char_length(${t.name}) between 1 and ${num2(MAX_API_KEY_NAME_LENGTH2)}`),
  check18("api_keys_prefix_shape", sql23`${t.prefix} ~ '^clk_[A-Za-z0-9_-]{8}$'`),
  check18("api_keys_secret_hash_shape", hexHash("secret_hash")),
  check18("api_keys_scopes_known", sql23`cardinality(${t.scopes}) between 1 and ${num2(API_KEY_SCOPES2.length)}
        and ${t.scopes} <@ array[${list6(API_KEY_SCOPES2)}]::text[]`),
  check18("api_keys_role_ceiling_known", sql23`${t.roleCeiling} in (${list6(API_KEY_ROLE_CEILINGS2)})`),
  check18("api_keys_created_by_shape", idShape6("created_by_membership_id", "mem")),
  check18("api_keys_expiry_after_creation", sql23`${t.expiresAt} is null or ${t.expiresAt} > ${t.createdAt}`),
  uniqueIndex7("api_keys_secret_hash_key").on(t.secretHash),
  index28("api_keys_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc())
]);
var apiKeyUsage2 = coreSchema2.table("api_key_usage", {
  organizationId: text37("organization_id").notNull(),
  apiKeyId: text37("api_key_id").notNull(),
  windowStart: ts5("window_start").notNull(),
  requestCount: bigint6("request_count", { mode: "number" }).notNull().default(0)
}, (t) => [
  primaryKey8({
    name: "api_key_usage_pkey",
    columns: [t.organizationId, t.apiKeyId, t.windowStart]
  }),
  foreignKey9({
    name: "api_key_usage_key_fk",
    columns: [t.organizationId, t.apiKeyId],
    foreignColumns: [coreApiKeys2.organizationId, coreApiKeys2.id]
  }).onDelete("cascade"),
  check18("api_key_usage_organization_id_shape", orgShape5),
  check18("api_key_usage_organization_not_global", notGlobal5),
  check18("api_key_usage_api_key_id_shape", idShape6("api_key_id", "akey")),
  check18("api_key_usage_request_count_range", sql23`${t.requestCount} between 0 and 1000000000`),
  index28("api_key_usage_age_idx").on(t.organizationId, t.windowStart)
]);
// src/schema/core-crm.ts
import { sql as sql24 } from "drizzle-orm";
import {
  bigint as bigint7,
  boolean as boolean11,
  check as check19,
  customType as customType8,
  foreignKey as foreignKey10,
  index as index29,
  jsonb as jsonb15,
  primaryKey as primaryKey9,
  text as text38,
  timestamp as timestamp31,
  uniqueIndex as uniqueIndex8
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
var list7 = (values) => sql24.raw(values.map((v) => `'${v}'`).join(", "));
var idShape7 = (column, prefix) => sql24.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape6 = sql24.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal6 = sql24.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts6 = (name) => timestamp31(name, { withTimezone: true });
var lengthBetween = (column, max) => sql24.raw(`char_length("${column}") between 1 and ${max}`);
var bytes8 = customType8({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var crmConnections2 = coreSchema2.table("crm_connection", {
  id: text38("id").notNull(),
  organizationId: text38("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" }),
  provider: text38("provider", { enum: CRM_PROVIDERS2 }).notNull(),
  state: text38("state", { enum: CRM_CONNECTION_STATES2 }).notNull().default("connected"),
  externalAccountId: text38("external_account_id").notNull(),
  accountLabel: text38("account_label"),
  scopeLevel: text38("scope_level", { enum: CRM_SCOPE_LEVELS2 }).notNull().default("read"),
  accessTokenSealed: bytes8("access_token_sealed"),
  refreshTokenSealed: bytes8("refresh_token_sealed"),
  tokenKeyId: text38("token_key_id"),
  accessTokenExpiresAt: ts6("access_token_expires_at"),
  connectedByMembershipId: text38("connected_by_membership_id").notNull(),
  connectedAt: ts6("connected_at").notNull().defaultNow(),
  lastSyncedAt: ts6("last_synced_at"),
  needsReconnectSince: ts6("needs_reconnect_since"),
  stageMappingConfirmedByMembershipId: text38("stage_mapping_confirmed_by_membership_id"),
  stageMappingConfirmedAt: ts6("stage_mapping_confirmed_at"),
  updatedAt: ts6("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey9({ name: "crm_connection_pkey", columns: [t.organizationId, t.id] }),
  check19("crm_connection_id_shape", idShape7("id", "crn")),
  check19("crm_connection_organization_id_shape", orgShape6),
  check19("crm_connection_organization_not_global", notGlobal6),
  check19("crm_connection_provider_known", sql24`${t.provider} in (${list7(CRM_PROVIDERS2)})`),
  check19("crm_connection_state_known", sql24`${t.state} in (${list7(CRM_CONNECTION_STATES2)})`),
  check19("crm_connection_scope_level_known", sql24`${t.scopeLevel} in (${list7(CRM_SCOPE_LEVELS2)})`),
  check19("crm_connection_external_account_id_shape", lengthBetween("external_account_id", MAX_CRM_EXTERNAL_ID_LENGTH2)),
  check19("crm_connection_account_label_shape", sql24`${t.accountLabel} is null or char_length(${t.accountLabel}) between 1 and ${sql24.raw(String(MAX_CRM_LABEL_LENGTH2))}`),
  check19("crm_connection_connected_by_membership_id_shape", idShape7("connected_by_membership_id", "mem")),
  check19("crm_connection_stage_mapping_confirmed_by_shape", idShape7("stage_mapping_confirmed_by_membership_id", "mem")),
  check19("crm_connection_access_token_sealed_size", sql24`${t.accessTokenSealed} is null or octet_length(${t.accessTokenSealed}) between 1 and ${sql24.raw(String(MAX_CRM_SEALED_TOKEN_BYTES2))}`),
  check19("crm_connection_refresh_token_sealed_size", sql24`${t.refreshTokenSealed} is null or octet_length(${t.refreshTokenSealed}) between 1 and ${sql24.raw(String(MAX_CRM_SEALED_TOKEN_BYTES2))}`),
  check19("crm_connection_token_key_id_shape", sql24`${t.tokenKeyId} is null or char_length(${t.tokenKeyId}) between 1 and ${sql24.raw(String(MAX_CRM_KEY_ID_LENGTH2))}`),
  check19("crm_connection_sealed_tokens_have_key_id", sql24`(${t.accessTokenSealed} is null and ${t.refreshTokenSealed} is null) or ${t.tokenKeyId} is not null`),
  check19("crm_connection_access_expiry_needs_token", sql24`${t.accessTokenExpiresAt} is null or ${t.accessTokenSealed} is not null`),
  check19("crm_connection_needs_reconnect_since", sql24`(${t.state} = 'needs_reconnect') = (${t.needsReconnectSince} is not null)`),
  check19("crm_connection_stage_mapping_confirmation", sql24`(${t.stageMappingConfirmedByMembershipId} is null) = (${t.stageMappingConfirmedAt} is null)`),
  uniqueIndex8("crm_connection_provider_key").on(t.organizationId, t.provider),
  uniqueIndex8("crm_connection_account_key").on(t.provider, t.externalAccountId),
  uniqueIndex8("crm_connection_provider_id_key").on(t.organizationId, t.id, t.provider)
]);
var crmMappings2 = coreSchema2.table("crm_mapping", {
  organizationId: text38("organization_id").notNull(),
  connectionId: text38("connection_id").notNull(),
  kind: text38("kind", { enum: CRM_MAPPING_KINDS2 }).notNull(),
  key: text38("key").notNull(),
  outcome: text38("outcome", { enum: CRM_STAGE_OUTCOMES2 }),
  label: text38("label"),
  direction: text38("direction", { enum: CRM_DIRECTIONS2 }),
  updatedAt: ts6("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey9({
    name: "crm_mapping_pkey",
    columns: [t.organizationId, t.connectionId, t.kind, t.key]
  }),
  check19("crm_mapping_organization_id_shape", orgShape6),
  check19("crm_mapping_organization_not_global", notGlobal6),
  check19("crm_mapping_connection_id_shape", idShape7("connection_id", "crn")),
  check19("crm_mapping_kind_known", sql24`${t.kind} in (${list7(CRM_MAPPING_KINDS2)})`),
  check19("crm_mapping_key_shape", lengthBetween("key", MAX_CRM_EXTERNAL_ID_LENGTH2)),
  check19("crm_mapping_outcome_known", sql24`${t.outcome} is null or ${t.outcome} in (${list7(CRM_STAGE_OUTCOMES2)})`),
  check19("crm_mapping_direction_known", sql24`${t.direction} is null or ${t.direction} in (${list7(CRM_DIRECTIONS2)})`),
  check19("crm_mapping_label_shape", sql24`${t.label} is null or char_length(${t.label}) between 1 and ${sql24.raw(String(MAX_CRM_LABEL_LENGTH2))}`),
  check19("crm_mapping_kind_columns", sql24`(${t.kind} = 'stage' and ${t.outcome} is not null and ${t.direction} is null)
        or (${t.kind} = 'field' and ${t.direction} is not null and ${t.outcome} is null and ${t.label} is null and ${t.key} in (${list7(CRM_FIELD_KEYS2)}))`),
  check19("crm_mapping_notes_never_both", sql24`${t.key} <> 'activity.notes' or ${t.direction} is distinct from 'both'`),
  foreignKey10({
    name: "crm_mapping_connection_fk",
    columns: [t.organizationId, t.connectionId],
    foreignColumns: [crmConnections2.organizationId, crmConnections2.id]
  }).onDelete("cascade")
]);
var jsonArrayBounded = (column, max) => sql24.raw(`jsonb_typeof("${column}") = 'array' and jsonb_array_length("${column}") <= ${max}`);
var crmSyncRuns2 = coreSchema2.table("crm_sync_run", {
  id: text38("id").notNull(),
  organizationId: text38("organization_id").notNull(),
  connectionId: text38("connection_id").notNull(),
  objectKind: text38("object_kind", { enum: CRM_OBJECT_KINDS2 }).notNull(),
  trigger: text38("trigger", { enum: CRM_RUN_TRIGGERS2 }).notNull(),
  state: text38("state", { enum: CRM_RUN_STATES2 }).notNull().default("queued"),
  requestedAt: ts6("requested_at").notNull().defaultNow(),
  requestedByMembershipId: text38("requested_by_membership_id"),
  startedAt: ts6("started_at"),
  completedAt: ts6("completed_at"),
  createdCount: bigint7("created_count", { mode: "number" }).notNull().default(0),
  updatedCount: bigint7("updated_count", { mode: "number" }).notNull().default(0),
  skippedCount: bigint7("skipped_count", { mode: "number" }).notNull().default(0),
  failedCount: bigint7("failed_count", { mode: "number" }).notNull().default(0),
  unlinkedCount: bigint7("unlinked_count", { mode: "number" }).notNull().default(0),
  skipped: jsonb15("skipped").notNull().default(sql24`'[]'::jsonb`),
  skippedFields: jsonb15("skipped_fields").notNull().default(sql24`'[]'::jsonb`),
  failures: jsonb15("failures").notNull().default(sql24`'[]'::jsonb`),
  failuresTruncated: boolean11("failures_truncated").notNull().default(false),
  errorCode: text38("error_code", { enum: CRM_RUN_ERROR_CODES2 }),
  retryOfRunId: text38("retry_of_run_id"),
  cursor: text38("cursor")
}, (t) => [
  primaryKey9({ name: "crm_sync_run_pkey", columns: [t.organizationId, t.id] }),
  check19("crm_sync_run_id_shape", idShape7("id", "crun")),
  check19("crm_sync_run_organization_id_shape", orgShape6),
  check19("crm_sync_run_organization_not_global", notGlobal6),
  check19("crm_sync_run_connection_id_shape", idShape7("connection_id", "crn")),
  check19("crm_sync_run_requested_by_membership_id_shape", idShape7("requested_by_membership_id", "mem")),
  check19("crm_sync_run_retry_of_run_id_shape", idShape7("retry_of_run_id", "crun")),
  check19("crm_sync_run_object_kind_known", sql24`${t.objectKind} in (${list7(CRM_OBJECT_KINDS2)})`),
  check19("crm_sync_run_trigger_known", sql24`${t.trigger} in (${list7(CRM_RUN_TRIGGERS2)})`),
  check19("crm_sync_run_state_known", sql24`${t.state} in (${list7(CRM_RUN_STATES2)})`),
  check19("crm_sync_run_error_code_known", sql24`${t.errorCode} is null or ${t.errorCode} in (${list7(CRM_RUN_ERROR_CODES2)})`),
  check19("crm_sync_run_counts_bounds", sql24`${t.createdCount} between 0 and ${sql24.raw(String(MAX_CRM_RUN_COUNT2))}
        and ${t.updatedCount} between 0 and ${sql24.raw(String(MAX_CRM_RUN_COUNT2))}
        and ${t.skippedCount} between 0 and ${sql24.raw(String(MAX_CRM_RUN_COUNT2))}
        and ${t.failedCount} between 0 and ${sql24.raw(String(MAX_CRM_RUN_COUNT2))}
        and ${t.unlinkedCount} between 0 and ${sql24.raw(String(MAX_CRM_RUN_COUNT2))}`),
  check19("crm_sync_run_skipped_shape", jsonArrayBounded("skipped", CRM_SKIP_REASON_COUNT2)),
  check19("crm_sync_run_skipped_fields_shape", jsonArrayBounded("skipped_fields", CRM_FIELD_KEYS2.length)),
  check19("crm_sync_run_failures_shape", jsonArrayBounded("failures", MAX_CRM_RUN_FAILURES2)),
  check19("crm_sync_run_cursor_shape", sql24`${t.cursor} is null or char_length(${t.cursor}) between 1 and ${sql24.raw(String(MAX_CRM_CURSOR_LENGTH2))}`),
  check19("crm_sync_run_lifecycle", sql24`(${t.state} = 'queued' and ${t.startedAt} is null and ${t.completedAt} is null)
        or (${t.state} = 'running' and ${t.startedAt} is not null and ${t.completedAt} is null)
        or (${t.state} in ('completed', 'failed') and ${t.completedAt} is not null)`),
  check19("crm_sync_run_error_code_only_when_failed", sql24`${t.errorCode} is null or ${t.state} = 'failed'`),
  foreignKey10({
    name: "crm_sync_run_connection_fk",
    columns: [t.organizationId, t.connectionId],
    foreignColumns: [crmConnections2.organizationId, crmConnections2.id]
  }).onDelete("cascade"),
  foreignKey10({
    name: "crm_sync_run_retry_of_fk",
    columns: [t.organizationId, t.retryOfRunId],
    foreignColumns: [t.organizationId, t.id]
  }),
  index29("crm_sync_runs_retry_of_idx").on(t.organizationId, t.retryOfRunId),
  index29("crm_sync_runs_list_idx").on(t.organizationId, t.connectionId, t.requestedAt.desc(), t.id.desc()),
  index29("crm_sync_runs_state_list_idx").on(t.organizationId, t.connectionId, t.state, t.requestedAt.desc(), t.id.desc()),
  index29("crm_sync_runs_kind_list_idx").on(t.organizationId, t.connectionId, t.objectKind, t.requestedAt.desc(), t.id.desc())
]);
var crmExternalRefs2 = coreSchema2.table("crm_external_ref", {
  id: text38("id").notNull(),
  organizationId: text38("organization_id").notNull(),
  connectionId: text38("connection_id").notNull(),
  provider: text38("provider", { enum: CRM_PROVIDERS2 }).notNull(),
  objectKind: text38("object_kind", { enum: CRM_OBJECT_KINDS2 }).notNull(),
  externalId: text38("external_id"),
  localId: text38("local_id").notNull(),
  state: text38("state", { enum: CRM_REF_STATES2 }).notNull().default("linked"),
  lastSeenVersion: text38("last_seen_version"),
  lastSeenAt: ts6("last_seen_at"),
  writeKey: text38("write_key"),
  createdAt: ts6("created_at").notNull().defaultNow(),
  updatedAt: ts6("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey9({ name: "crm_external_ref_pkey", columns: [t.organizationId, t.id] }),
  check19("crm_external_ref_id_shape", idShape7("id", "cxr")),
  check19("crm_external_ref_organization_id_shape", orgShape6),
  check19("crm_external_ref_organization_not_global", notGlobal6),
  check19("crm_external_ref_connection_id_shape", idShape7("connection_id", "crn")),
  check19("crm_external_ref_provider_known", sql24`${t.provider} in (${list7(CRM_PROVIDERS2)})`),
  check19("crm_external_ref_object_kind_known", sql24`${t.objectKind} in (${list7(CRM_OBJECT_KINDS2)})`),
  check19("crm_external_ref_state_known", sql24`${t.state} in (${list7(CRM_REF_STATES2)})`),
  check19("crm_external_ref_external_id_shape", sql24`${t.externalId} is null or char_length(${t.externalId}) between 1 and ${sql24.raw(String(MAX_CRM_EXTERNAL_ID_LENGTH2))}`),
  check19("crm_external_ref_local_id_shape", lengthBetween("local_id", MAX_CRM_LOCAL_ID_LENGTH2)),
  check19("crm_external_ref_last_seen_version_shape", sql24`${t.lastSeenVersion} is null or char_length(${t.lastSeenVersion}) between 1 and ${sql24.raw(String(MAX_CRM_CURSOR_LENGTH2))}`),
  check19("crm_external_ref_write_key_shape", sql24`${t.writeKey} is null or char_length(${t.writeKey}) between 1 and ${sql24.raw(String(MAX_CRM_WRITE_KEY_LENGTH2))}`),
  check19("crm_external_ref_state_columns", sql24`(${t.state} = 'pending_write' and ${t.writeKey} is not null)
        or (${t.state} in ('linked', 'unlinked') and ${t.externalId} is not null)`),
  foreignKey10({
    name: "crm_external_ref_connection_fk",
    columns: [t.organizationId, t.connectionId, t.provider],
    foreignColumns: [crmConnections2.organizationId, crmConnections2.id, crmConnections2.provider]
  }).onDelete("cascade"),
  uniqueIndex8("crm_external_ref_object_key").on(t.organizationId, t.provider, t.objectKind, t.externalId),
  uniqueIndex8("crm_external_ref_write_key").on(t.organizationId, t.provider, t.writeKey).where(sql24`${t.writeKey} is not null`),
  index29("crm_external_refs_local_idx").on(t.organizationId, t.provider, t.objectKind, t.localId),
  index29("crm_external_refs_connection_idx").on(t.organizationId, t.connectionId, t.id)
]);
var crmWebhookReceipts2 = coreSchema2.table("crm_webhook_receipt", {
  organizationId: text38("organization_id").notNull(),
  connectionId: text38("connection_id").notNull(),
  eventId: text38("event_id").notNull(),
  receivedAt: ts6("received_at").notNull().defaultNow()
}, (t) => [
  primaryKey9({
    name: "crm_webhook_receipt_pkey",
    columns: [t.organizationId, t.connectionId, t.eventId]
  }),
  check19("crm_webhook_receipt_organization_id_shape", orgShape6),
  check19("crm_webhook_receipt_organization_not_global", notGlobal6),
  check19("crm_webhook_receipt_connection_id_shape", idShape7("connection_id", "crn")),
  check19("crm_webhook_receipt_event_id_shape", lengthBetween("event_id", MAX_CRM_EXTERNAL_ID_LENGTH2)),
  foreignKey10({
    name: "crm_webhook_receipt_connection_fk",
    columns: [t.organizationId, t.connectionId],
    foreignColumns: [crmConnections2.organizationId, crmConnections2.id]
  }).onDelete("cascade"),
  index29("crm_webhook_receipts_age_idx").on(t.organizationId, t.receivedAt)
]);
// src/schema/core-demo-rate-counter.ts
import { sql as sql25 } from "drizzle-orm";
import { check as check20, customType as customType9, index as index30, integer as integer18, primaryKey as primaryKey10, timestamp as timestamp32 } from "drizzle-orm/pg-core";
var DEMO_RATE_ADDRESS_HASH_BYTES2 = 32;
var bytea = customType9({
  dataType() {
    return "bytea";
  }
});
var demoRateCounters2 = coreSchema2.table("demo_rate_counter", {
  addressHash: bytea("address_hash").notNull(),
  windowStart: timestamp32("window_start", { withTimezone: true }).notNull(),
  hits: integer18("hits").notNull()
}, (t) => [
  primaryKey10({ name: "demo_rate_counter_pkey", columns: [t.addressHash, t.windowStart] }),
  check20("demo_rate_counter_address_hash_length", sql25`octet_length(${t.addressHash}) = ${sql25.raw(String(DEMO_RATE_ADDRESS_HASH_BYTES2))}`),
  check20("demo_rate_counter_hits_positive", sql25`${t.hits} >= 1`),
  index30("demo_rate_counters_window_start_idx").on(t.windowStart)
]);
// src/schema/core-demo-requests.ts
import { sql as sql26 } from "drizzle-orm";
import { check as check21, index as index31, integer as integer19, text as text39, timestamp as timestamp33, unique as unique23 } from "drizzle-orm/pg-core";
var DEMO_NOTIFICATION_STATUSES2 = ["pending", "sent", "failed"];
var DEMO_REQUEST_NAME_MAX2 = 200;
var DEMO_REQUEST_MESSAGE_MAX2 = 2000;
var DEMO_REQUEST_SOURCE_PAGE_MAX2 = 200;
var DEMO_REQUEST_KEY_LENGTH2 = { min: 16, max: 128 };
var list8 = (values) => sql26.raw(values.map((v) => `'${v}'`).join(", "));
var demoRequests2 = coreSchema2.table("demo_request", {
  id: text39("id").primaryKey(),
  name: text39("name").notNull(),
  workEmail: text39("work_email").notNull(),
  companyName: text39("company_name").notNull(),
  message: text39("message"),
  sourcePage: text39("source_page").notNull(),
  idempotencyKey: text39("idempotency_key").notNull(),
  notificationStatus: text39("notification_status", { enum: DEMO_NOTIFICATION_STATUSES2 }).notNull().default("pending"),
  notificationAttempts: integer19("notification_attempts").notNull().default(0),
  notificationLastAttemptAt: timestamp33("notification_last_attempt_at", { withTimezone: true }),
  submittedAt: timestamp33("submitted_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  check21("demo_request_id_shape", sql26`"id" ~ '^dreq_[0-9a-f]{32}$'`),
  check21("demo_request_name_shape", sql26`char_length(btrim(${t.name})) between 1 and ${sql26.raw(String(DEMO_REQUEST_NAME_MAX2))}`),
  check21("demo_request_work_email_shape", sql26`${t.workEmail} = lower(${t.workEmail} collate "C")
        and char_length(${t.workEmail}) between 3 and 320
        and char_length(${t.workEmail}) - char_length(replace(${t.workEmail}, '@', '')) = 1
        and position('@' in ${t.workEmail}) between 2 and char_length(${t.workEmail}) - 1
        and ${t.workEmail} collate "C" !~ '[[:space:][:cntrl:]]'
        and ${t.workEmail} collate "C" ~ '^[!-~]+$'`),
  check21("demo_request_company_name_shape", sql26`char_length(btrim(${t.companyName})) between 1 and ${sql26.raw(String(DEMO_REQUEST_NAME_MAX2))}`),
  check21("demo_request_message_length", sql26`${t.message} is null or char_length(${t.message}) <= ${sql26.raw(String(DEMO_REQUEST_MESSAGE_MAX2))}`),
  check21("demo_request_source_page_shape", sql26`char_length(${t.sourcePage}) between 1 and ${sql26.raw(String(DEMO_REQUEST_SOURCE_PAGE_MAX2))}
        and left(${t.sourcePage}, 1) = '/'`),
  check21("demo_request_idempotency_key_length", sql26`char_length(${t.idempotencyKey}) between ${sql26.raw(String(DEMO_REQUEST_KEY_LENGTH2.min))} and ${sql26.raw(String(DEMO_REQUEST_KEY_LENGTH2.max))}`),
  check21("demo_request_notification_status_known", sql26`${t.notificationStatus} in (${list8(DEMO_NOTIFICATION_STATUSES2)})`),
  check21("demo_request_notification_attempts_not_negative", sql26`${t.notificationAttempts} >= 0`),
  unique23("demo_request_idempotency_key_key").on(t.idempotencyKey),
  index31("demo_requests_submitted_at_idx").on(t.submittedAt),
  index31("demo_requests_notice_idx").on(t.submittedAt, t.id).where(sql26`${t.notificationStatus} = 'pending'`)
]);
// src/schema/core-inbox.ts
import { sql as sql27 } from "drizzle-orm";
import {
  boolean as boolean12,
  check as check22,
  doublePrecision,
  foreignKey as foreignKey11,
  index as index32,
  integer as integer20,
  jsonb as jsonb16,
  primaryKey as primaryKey11,
  text as text40,
  timestamp as timestamp34,
  unique as unique24,
  uniqueIndex as uniqueIndex9
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
var list9 = (values) => sql27.raw(values.map((v) => `'${v}'`).join(", "));
var idShape8 = (column, prefix) => sql27.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape7 = sql27.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal7 = sql27.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts7 = (name) => timestamp34(name, { withTimezone: true });
var orgRef2 = () => text40("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" });
var body = (column) => sql27.raw(`char_length("${column}") between 1 and ${MAX_MESSAGE_BODY_LENGTH2} and btrim("${column}") <> ''`);
var conversations2 = coreSchema2.table("conversations", {
  id: text40("id").notNull(),
  organizationId: orgRef2(),
  prospectId: text40("prospect_id").notNull(),
  channel: text40("channel", { enum: INBOX_CHANNELS2 }).notNull(),
  controller: text40("controller", { enum: CONVERSATION_CONTROLLERS2 }).notNull().default("agent"),
  controllerMembershipId: text40("controller_membership_id"),
  state: text40("state", { enum: CONVERSATION_STATES2 }).notNull().default("agent"),
  ownerMembershipId: text40("owner_membership_id"),
  latestLabel: text40("latest_label", { enum: REPLY_LABELS2 }),
  pendingDraftCount: integer20("pending_draft_count").notNull().default(0),
  lastMessageAt: ts7("last_message_at").notNull(),
  createdAt: ts7("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey11({ name: "conversations_pkey", columns: [t.organizationId, t.id] }),
  unique24("conversations_organization_id_channel_key").on(t.organizationId, t.id, t.channel),
  check22("conversations_id_shape", idShape8("id", "cnv")),
  check22("conversations_organization_id_shape", orgShape7),
  check22("conversations_organization_not_global", notGlobal7),
  check22("conversations_prospect_id_shape", idShape8("prospect_id", "prs")),
  check22("conversations_controller_membership_id_shape", idShape8("controller_membership_id", "mem")),
  check22("conversations_owner_membership_id_shape", idShape8("owner_membership_id", "mem")),
  check22("conversations_channel_known", sql27`${t.channel} in (${list9(INBOX_CHANNELS2)})`),
  check22("conversations_controller_known", sql27`${t.controller} in (${list9(CONVERSATION_CONTROLLERS2)})`),
  check22("conversations_state_known", sql27`${t.state} in (${list9(CONVERSATION_STATES2)})`),
  check22("conversations_latest_label_known", sql27`${t.latestLabel} is null or ${t.latestLabel} in (${list9(REPLY_LABELS2)})`),
  check22("conversations_pending_draft_count_bounds", sql27`${t.pendingDraftCount} between 0 and ${sql27.raw(String(MAX_PENDING_DRAFT_COUNT2))}`),
  check22("conversations_controller_names_rep", sql27`(${t.controller} = 'rep') = (${t.controllerMembershipId} is not null)`),
  check22("conversations_rep_state_has_rep", sql27`${t.state} <> 'rep' or ${t.controller} = 'rep'`),
  check22("conversations_rep_controls_rep_or_closed", sql27`${t.controller} <> 'rep' or ${t.state} in ('rep', 'closed')`),
  foreignKey11({
    name: "conversations_prospect_fk",
    columns: [t.organizationId, t.prospectId],
    foreignColumns: [prospects2.organizationId, prospects2.id]
  }).onDelete("cascade"),
  index32("conversations_list_idx").on(t.organizationId, t.lastMessageAt.desc(), t.id.desc()),
  index32("conversations_owner_list_idx").on(t.organizationId, t.ownerMembershipId, t.lastMessageAt.desc(), t.id.desc()).where(sql27`${t.ownerMembershipId} is not null`),
  index32("conversations_state_list_idx").on(t.organizationId, t.state, t.lastMessageAt.desc(), t.id.desc()),
  index32("conversations_owner_state_list_idx").on(t.organizationId, t.ownerMembershipId, t.state, t.lastMessageAt.desc(), t.id.desc()).where(sql27`${t.ownerMembershipId} is not null`),
  index32("conversations_prospect_idx").on(t.organizationId, t.prospectId, t.channel)
]);
var messages2 = coreSchema2.table("messages", {
  id: text40("id").notNull(),
  organizationId: orgRef2(),
  conversationId: text40("conversation_id").notNull(),
  channel: text40("channel", { enum: INBOX_CHANNELS2 }).notNull(),
  direction: text40("direction", { enum: MESSAGE_DIRECTIONS2 }).notNull(),
  authorKind: text40("author_kind", { enum: MESSAGE_AUTHOR_KINDS2 }).notNull(),
  authorMembershipId: text40("author_membership_id"),
  providerMessageId: text40("provider_message_id").notNull(),
  draftId: text40("draft_id"),
  body: text40("body").notNull(),
  sentAt: ts7("sent_at").notNull(),
  classificationLabel: text40("classification_label", { enum: REPLY_LABELS2 }),
  classificationConfidence: doublePrecision("classification_confidence"),
  classificationDecidedBy: text40("classification_decided_by", { enum: CLASSIFICATION_DECIDERS2 }),
  classificationCorrectedByMembershipId: text40("classification_corrected_by_membership_id"),
  classifiedAt: ts7("classified_at"),
  createdAt: ts7("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey11({ name: "messages_pkey", columns: [t.organizationId, t.id] }),
  check22("messages_id_shape", idShape8("id", "msg")),
  check22("messages_organization_id_shape", orgShape7),
  check22("messages_organization_not_global", notGlobal7),
  check22("messages_conversation_id_shape", idShape8("conversation_id", "cnv")),
  check22("messages_author_membership_id_shape", idShape8("author_membership_id", "mem")),
  check22("messages_draft_id_shape", idShape8("draft_id", "drf")),
  check22("messages_classification_corrected_by_shape", idShape8("classification_corrected_by_membership_id", "mem")),
  check22("messages_channel_known", sql27`${t.channel} in (${list9(INBOX_CHANNELS2)})`),
  check22("messages_direction_known", sql27`${t.direction} in (${list9(MESSAGE_DIRECTIONS2)})`),
  check22("messages_author_kind_known", sql27`${t.authorKind} in (${list9(MESSAGE_AUTHOR_KINDS2)})`),
  check22("messages_provider_message_id_shape", sql27`${t.providerMessageId} collate "C" ~ '^[\\x21-\\x7e]{1,${sql27.raw(String(MAX_PROVIDER_MESSAGE_ID_LENGTH2))}}$'`),
  check22("messages_body_shape", body("body")),
  check22("messages_inbound_is_prospect", sql27`(${t.direction} = 'inbound') = (${t.authorKind} = 'prospect')`),
  check22("messages_rep_names_member", sql27`(${t.authorKind} = 'rep') = (${t.authorMembershipId} is not null)`),
  check22("messages_inbound_has_no_draft", sql27`${t.direction} <> 'inbound' or ${t.draftId} is null`),
  check22("messages_rep_has_draft", sql27`${t.authorKind} <> 'rep' or ${t.draftId} is not null`),
  check22("messages_classification_inbound_only", sql27`${t.direction} = 'inbound' or ${t.classificationLabel} is null`),
  check22("messages_classification_complete", sql27`(${t.classificationLabel} is null) = (${t.classificationConfidence} is null)
        and (${t.classificationLabel} is null) = (${t.classificationDecidedBy} is null)
        and (${t.classificationLabel} is null) = (${t.classifiedAt} is null)`),
  check22("messages_classification_confidence_bounds", sql27`${t.classificationConfidence} is null or ${t.classificationConfidence} between 0 and 1`),
  check22("messages_classification_decider_known", sql27`${t.classificationDecidedBy} is null or ${t.classificationDecidedBy} in (${list9(CLASSIFICATION_DECIDERS2)})`),
  check22("messages_classification_correction_names_rep", sql27`${t.classificationLabel} is null
        or (${t.classificationDecidedBy} = 'rep') = (${t.classificationCorrectedByMembershipId} is not null)`),
  check22("messages_correction_needs_label", sql27`${t.classificationCorrectedByMembershipId} is null or ${t.classificationLabel} is not null`),
  check22("messages_classification_label_known", sql27`${t.classificationLabel} is null or ${t.classificationLabel} in (${list9(REPLY_LABELS2)})`),
  foreignKey11({
    name: "messages_conversation_fk",
    columns: [t.organizationId, t.conversationId, t.channel],
    foreignColumns: [conversations2.organizationId, conversations2.id, conversations2.channel]
  }).onDelete("cascade"),
  uniqueIndex9("messages_provider_message_key").on(t.organizationId, t.channel, t.providerMessageId),
  index32("messages_conversation_idx").on(t.organizationId, t.conversationId, t.sentAt, t.id),
  index32("messages_draft_idx").on(t.organizationId, t.draftId).where(sql27`${t.draftId} is not null`)
]);
var drafts2 = coreSchema2.table("drafts", {
  id: text40("id").notNull(),
  organizationId: orgRef2(),
  conversationId: text40("conversation_id").notNull(),
  author: text40("author", { enum: DRAFT_AUTHORS2 }).notNull(),
  authorMembershipId: text40("author_membership_id"),
  body: text40("body").notNull(),
  reasonTriggerMessageId: text40("reason_trigger_message_id"),
  reasonLabel: text40("reason_label", { enum: REPLY_LABELS2 }),
  reasonStrategy: text40("reason_strategy"),
  confidence: doublePrecision("confidence"),
  ungrounded: boolean12("ungrounded").notNull().default(false),
  checks: jsonb16("checks").notNull().default(sql27`'[]'::jsonb`),
  hold: text40("hold", { enum: DRAFT_HOLD_REASONS2 }),
  status: text40("status", { enum: DRAFT_STATUSES2 }).notNull().default("pending"),
  createdAt: ts7("created_at").notNull().defaultNow(),
  decidedAt: ts7("decided_at")
}, (t) => [
  primaryKey11({ name: "drafts_pkey", columns: [t.organizationId, t.id] }),
  check22("drafts_id_shape", idShape8("id", "drf")),
  check22("drafts_organization_id_shape", orgShape7),
  check22("drafts_organization_not_global", notGlobal7),
  check22("drafts_conversation_id_shape", idShape8("conversation_id", "cnv")),
  check22("drafts_author_membership_id_shape", idShape8("author_membership_id", "mem")),
  check22("drafts_reason_trigger_message_id_shape", idShape8("reason_trigger_message_id", "msg")),
  check22("drafts_author_known", sql27`${t.author} in (${list9(DRAFT_AUTHORS2)})`),
  check22("drafts_status_known", sql27`${t.status} in (${list9(DRAFT_STATUSES2)})`),
  check22("drafts_hold_known", sql27`${t.hold} is null or ${t.hold} in (${list9(DRAFT_HOLD_REASONS2)})`),
  check22("drafts_reason_label_known", sql27`${t.reasonLabel} is null or ${t.reasonLabel} in (${list9(REPLY_LABELS2)})`),
  check22("drafts_body_shape", body("body")),
  check22("drafts_reason_strategy_shape", sql27`${t.reasonStrategy} is null or char_length(${t.reasonStrategy}) between 1 and ${sql27.raw(String(MAX_STRATEGY_LENGTH2))}`),
  check22("drafts_confidence_bounds", sql27`${t.confidence} is null or ${t.confidence} between 0 and 1`),
  check22("drafts_checks_shape", sql27`jsonb_typeof(${t.checks}) = 'array' and jsonb_array_length(${t.checks}) <= ${sql27.raw(String(MAX_DRAFT_CHECKS2))}`),
  check22("drafts_agent_has_reason", sql27`(${t.author} = 'agent') = (${t.reasonTriggerMessageId} is not null)
        and (${t.author} = 'agent') = (${t.reasonLabel} is not null)
        and (${t.author} = 'agent') = (${t.reasonStrategy} is not null)`),
  check22("drafts_agent_has_confidence", sql27`(${t.author} = 'agent') = (${t.confidence} is not null)`),
  check22("drafts_rep_names_member", sql27`(${t.author} = 'rep') = (${t.authorMembershipId} is not null)`),
  check22("drafts_rep_is_plain", sql27`${t.author} = 'agent' or (not ${t.ungrounded} and ${t.hold} is null)`),
  check22("drafts_ungrounded_is_held", sql27`not ${t.ungrounded} or ${t.hold} = 'ungrounded'`),
  check22("drafts_ungrounded_hold_matches", sql27`${t.hold} is distinct from 'ungrounded' or ${t.ungrounded}`),
  check22("drafts_pending_is_held", sql27`${t.status} <> 'pending' or ${t.author} = 'rep' or ${t.hold} is not null`),
  check22("drafts_pending_is_undecided", sql27`${t.status} <> 'pending' or ${t.decidedAt} is null`),
  foreignKey11({
    name: "drafts_conversation_fk",
    columns: [t.organizationId, t.conversationId],
    foreignColumns: [conversations2.organizationId, conversations2.id]
  }).onDelete("cascade"),
  foreignKey11({
    name: "drafts_trigger_message_fk",
    columns: [t.organizationId, t.reasonTriggerMessageId],
    foreignColumns: [messages2.organizationId, messages2.id]
  }),
  index32("drafts_conversation_idx").on(t.organizationId, t.conversationId, t.createdAt.desc(), t.id.desc()),
  index32("drafts_trigger_message_idx").on(t.organizationId, t.reasonTriggerMessageId).where(sql27`${t.reasonTriggerMessageId} is not null`),
  index32("drafts_pending_queue_idx").on(t.organizationId, t.createdAt, t.id).where(sql27`${t.status} = 'pending'`)
]);
var draftSources2 = coreSchema2.table("draft_sources", {
  organizationId: orgRef2(),
  draftId: text40("draft_id").notNull(),
  kind: text40("kind", { enum: DRAFT_SOURCE_KINDS2 }).notNull(),
  sourceRef: text40("source_ref").notNull(),
  position: integer20("position").notNull(),
  dealRecordId: text40("deal_record_id"),
  documentId: text40("document_id"),
  outcome: text40("outcome", { enum: SOURCE_OUTCOMES2 }),
  evidenceCount: integer20("evidence_count").notNull()
}, (t) => [
  primaryKey11({
    name: "draft_sources_pkey",
    columns: [t.organizationId, t.draftId, t.kind, t.sourceRef]
  }),
  check22("draft_sources_organization_id_shape", orgShape7),
  check22("draft_sources_organization_not_global", notGlobal7),
  check22("draft_sources_draft_id_shape", idShape8("draft_id", "drf")),
  check22("draft_sources_deal_record_id_shape", idShape8("deal_record_id", "deal")),
  check22("draft_sources_document_id_shape", idShape8("document_id", "doc")),
  check22("draft_sources_kind_known", sql27`${t.kind} in (${list9(DRAFT_SOURCE_KINDS2)})`),
  check22("draft_sources_source_ref_shape", sql27`${t.sourceRef} collate "C" ~ '^[A-Za-z0-9_.:-]{1,128}$'`),
  check22("draft_sources_position_bounds", sql27`${t.position} between 0 and 9`),
  check22("draft_sources_outcome_known", sql27`${t.outcome} is null or ${t.outcome} in (${list9(SOURCE_OUTCOMES2)})`),
  check22("draft_sources_evidence_count_bounds", sql27`${t.evidenceCount} between 1 and ${sql27.raw(String(MAX_EVIDENCE_COUNT2))}`),
  check22("draft_sources_kind_matches_ids", sql27`(${t.kind} = 'moment' and ${t.dealRecordId} is not null and ${t.documentId} is null and ${t.outcome} is not null)
        or (${t.kind} = 'document_chunk' and ${t.documentId} is not null and ${t.dealRecordId} is null and ${t.outcome} is null)`),
  foreignKey11({
    name: "draft_sources_draft_fk",
    columns: [t.organizationId, t.draftId],
    foreignColumns: [drafts2.organizationId, drafts2.id]
  }).onDelete("cascade"),
  unique24("draft_sources_position_key").on(t.organizationId, t.draftId, t.position)
]);
var approvalDecisions2 = coreSchema2.table("approval_decisions", {
  id: text40("id").notNull(),
  organizationId: orgRef2(),
  conversationId: text40("conversation_id").notNull(),
  draftId: text40("draft_id"),
  kind: text40("kind", { enum: DECISION_KINDS2 }).notNull(),
  decidedByMembershipId: text40("decided_by_membership_id"),
  note: text40("note"),
  editedBodySha256: text40("edited_body_sha256"),
  acknowledgedUngrounded: boolean12("acknowledged_ungrounded").notNull().default(false),
  decidedAt: ts7("decided_at").notNull().defaultNow()
}, (t) => [
  primaryKey11({ name: "approval_decisions_pkey", columns: [t.organizationId, t.id] }),
  check22("approval_decisions_id_shape", idShape8("id", "dcs")),
  check22("approval_decisions_organization_id_shape", orgShape7),
  check22("approval_decisions_organization_not_global", notGlobal7),
  check22("approval_decisions_conversation_id_shape", idShape8("conversation_id", "cnv")),
  check22("approval_decisions_draft_id_shape", idShape8("draft_id", "drf")),
  check22("approval_decisions_decided_by_membership_id_shape", idShape8("decided_by_membership_id", "mem")),
  check22("approval_decisions_kind_known", sql27`${t.kind} in (${list9(DECISION_KINDS2)})`),
  check22("approval_decisions_note_shape", sql27`${t.note} is null or (char_length(${t.note}) between 1 and ${sql27.raw(String(MAX_DECISION_NOTE_LENGTH2))} and btrim(${t.note}) <> '')`),
  check22("approval_decisions_draft_matches_kind", sql27`(${t.kind} in ('takeover', 'hand_back')) = (${t.draftId} is null)`),
  check22("approval_decisions_member_matches_kind", sql27`(${t.kind} = 'auto_release') = (${t.decidedByMembershipId} is null)`),
  check22("approval_decisions_acknowledgement_is_approval", sql27`not ${t.acknowledgedUngrounded} or ${t.kind} in ('approve', 'edit_approve')`),
  check22("approval_decisions_note_is_rejection", sql27`${t.note} is null or ${t.kind} = 'reject'`),
  check22("approval_decisions_edited_body_sha256_shape", sql27`${t.editedBodySha256} is null or ${t.editedBodySha256} ~ '^[0-9a-f]{64}$'`),
  check22("approval_decisions_edited_hash_matches_kind", sql27`(${t.kind} = 'edit_approve') = (${t.editedBodySha256} is not null)`),
  foreignKey11({
    name: "approval_decisions_conversation_fk",
    columns: [t.organizationId, t.conversationId],
    foreignColumns: [conversations2.organizationId, conversations2.id]
  }).onDelete("cascade"),
  foreignKey11({
    name: "approval_decisions_draft_fk",
    columns: [t.organizationId, t.draftId],
    foreignColumns: [drafts2.organizationId, drafts2.id]
  }).onDelete("cascade"),
  index32("approval_decisions_conversation_idx").on(t.organizationId, t.conversationId, t.decidedAt.desc(), t.id.desc()),
  index32("approval_decisions_draft_idx").on(t.organizationId, t.draftId).where(sql27`${t.draftId} is not null`)
]);
var approvalPolicies2 = coreSchema2.table("approval_policies", {
  organizationId: orgRef2(),
  channel: text40("channel", { enum: INBOX_CHANNELS2 }).notNull(),
  mode: text40("mode", { enum: APPROVAL_MODES2 }).notNull(),
  threshold: doublePrecision("threshold"),
  labels: text40("labels").array(),
  updatedAt: ts7("updated_at").notNull().defaultNow(),
  updatedByMembershipId: text40("updated_by_membership_id")
}, (t) => [
  primaryKey11({ name: "approval_policies_pkey", columns: [t.organizationId, t.channel] }),
  check22("approval_policies_organization_id_shape", orgShape7),
  check22("approval_policies_organization_not_global", notGlobal7),
  check22("approval_policies_updated_by_membership_id_shape", idShape8("updated_by_membership_id", "mem")),
  check22("approval_policies_channel_known", sql27`${t.channel} in (${list9(INBOX_CHANNELS2)})`),
  check22("approval_policies_mode_known", sql27`${t.mode} in (${list9(APPROVAL_MODES2)})`),
  check22("approval_policies_mode_matches_fields", sql27`(${t.mode} = 'always' and ${t.threshold} is null and ${t.labels} is null)
        or (${t.mode} = 'below_confidence' and ${t.threshold} is not null and ${t.threshold} > 0 and ${t.threshold} <= 1 and ${t.labels} is null)
        or (${t.mode} = 'except' and ${t.threshold} is null and core.reply_labels_valid("labels"))`)
]);
var escalationRules2 = coreSchema2.table("escalation_rules", {
  id: text40("id").notNull(),
  organizationId: orgRef2(),
  trigger: text40("trigger", { enum: ESCALATION_TRIGGERS2 }).notNull(),
  target: text40("target", { enum: ESCALATION_TARGETS2 }).notNull(),
  teamId: text40("team_id"),
  threshold: doublePrecision("threshold"),
  enabled: boolean12("enabled").notNull().default(true),
  createdAt: ts7("created_at").notNull().defaultNow(),
  updatedAt: ts7("updated_at").notNull().defaultNow(),
  updatedByMembershipId: text40("updated_by_membership_id")
}, (t) => [
  primaryKey11({ name: "escalation_rules_pkey", columns: [t.organizationId, t.id] }),
  check22("escalation_rules_id_shape", idShape8("id", "esr")),
  check22("escalation_rules_organization_id_shape", orgShape7),
  check22("escalation_rules_organization_not_global", notGlobal7),
  check22("escalation_rules_team_id_shape", idShape8("team_id", "team")),
  check22("escalation_rules_updated_by_membership_id_shape", idShape8("updated_by_membership_id", "mem")),
  check22("escalation_rules_trigger_known", sql27`${t.trigger} in (${list9(ESCALATION_TRIGGERS2)})`),
  check22("escalation_rules_target_known", sql27`${t.target} in (${list9(ESCALATION_TARGETS2)})`),
  check22("escalation_rules_team_matches_target", sql27`(${t.target} = 'team_round_robin') = (${t.teamId} is not null)`),
  check22("escalation_rules_threshold_matches_trigger", sql27`(${t.trigger} = 'low_confidence') = (${t.threshold} is not null)
        and (${t.threshold} is null or (${t.threshold} > 0 and ${t.threshold} <= 1))`),
  foreignKey11({
    name: "escalation_rules_team_fk",
    columns: [t.organizationId, t.teamId],
    foreignColumns: [teams2.organizationId, teams2.id]
  }).onDelete("cascade"),
  uniqueIndex9("escalation_rules_trigger_key").on(t.organizationId, t.trigger)
]);
// src/schema/core-outbox.ts
import { sql as sql28 } from "drizzle-orm";
import {
  check as check23,
  index as index33,
  jsonb as jsonb17,
  primaryKey as primaryKey12,
  smallint as smallint4,
  text as text41,
  timestamp as timestamp35,
  uniqueIndex as uniqueIndex10
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
var orgRef3 = () => text41("organization_id").notNull().references(() => organizations2.organizationId, { onDelete: "cascade" });
var outbox2 = coreSchema2.table("outbox", {
  id: text41("id").notNull(),
  organizationId: orgRef3(),
  topic: text41("topic").notNull(),
  payload: jsonb17("payload").notNull(),
  dedupeKey: text41("dedupe_key").notNull(),
  createdAt: timestamp35("created_at", { withTimezone: true }).notNull().defaultNow(),
  availableAt: timestamp35("available_at", { withTimezone: true }).notNull().defaultNow(),
  attempts: smallint4("attempts").notNull().default(0),
  publishedAt: timestamp35("published_at", { withTimezone: true }),
  lastErrorCode: text41("last_error_code")
}, (t) => [
  primaryKey12({ name: "outbox_pkey", columns: [t.organizationId, t.id] }),
  check23("outbox_id_shape", sql28.raw(`"id" ~ '^obx_[0-9a-f]{32}$'`)),
  check23("outbox_organization_id_shape", sql28.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)),
  check23("outbox_organization_not_global", sql28.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)),
  check23("outbox_topic_shape", sql28`char_length(${t.topic}) between 1 and ${sql28.raw(String(OUTBOX_TOPIC_MAX_LENGTH2))} and ${t.topic} ~ '^[a-z][a-z0-9_.-]*$'`),
  check23("outbox_payload_shape", sql28`jsonb_typeof(${t.payload}) = 'object' and octet_length(${t.payload}::text) <= ${sql28.raw(String(OUTBOX_PAYLOAD_MAX_BYTES2))}`),
  check23("outbox_dedupe_key_length", sql28`char_length(${t.dedupeKey}) between 1 and ${sql28.raw(String(OUTBOX_DEDUPE_KEY_MAX_LENGTH2))}`),
  check23("outbox_attempts_range", sql28`${t.attempts} between 0 and ${sql28.raw(String(OUTBOX_MAX_ATTEMPTS2))}`),
  check23("outbox_last_error_code_shape", sql28`${t.lastErrorCode} is null or (char_length(${t.lastErrorCode}) <= ${sql28.raw(String(OUTBOX_ERROR_CODE_MAX_LENGTH2))} and ${t.lastErrorCode} ~ '^[a-z][a-z0-9_.]*$')`),
  uniqueIndex10("outbox_dedupe_key").on(t.organizationId, t.dedupeKey),
  index33("outbox_drain_idx").on(t.availableAt, t.id).where(sql28`${t.publishedAt} is null and ${t.attempts} < ${sql28.raw(String(OUTBOX_MAX_ATTEMPTS2))}`),
  index33("outbox_published_idx").on(t.publishedAt).where(sql28`${t.publishedAt} is not null`)
]);
// src/schema/outbound.ts
import { pgSchema as pgSchema3 } from "drizzle-orm/pg-core";
var outboundSchema2 = pgSchema3("outbound");
// src/schema/outbound-campaigns.ts
import { sql as sql36 } from "drizzle-orm";
import {
  check as check31,
  foreignKey as foreignKey18,
  index as index41,
  integer as integer28,
  jsonb as jsonb20,
  primaryKey as primaryKey20,
  smallint as smallint10,
  text as text49,
  timestamp as timestamp43,
  unique as unique27,
  uniqueIndex as uniqueIndex18
} from "drizzle-orm/pg-core";

// src/schema/outbound-mail.ts
import { sql as sql29 } from "drizzle-orm";
import {
  check as check24,
  customType as customType10,
  date as date3,
  foreignKey as foreignKey12,
  index as index34,
  integer as integer21,
  jsonb as jsonb18,
  primaryKey as primaryKey13,
  smallint as smallint5,
  text as text42,
  timestamp as timestamp36,
  unique as unique25,
  uniqueIndex as uniqueIndex11
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
var list10 = (values) => sql29.raw(values.map((v) => `'${v}'`).join(", "));
var num3 = (value) => sql29.raw(String(value));
var idShape9 = (column, prefix) => sql29.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape8 = sql29.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal8 = sql29.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts8 = (name) => timestamp36(name, { withTimezone: true });
var bytes9 = customType10({
  dataType: () => "bytea"
});
var PROVIDER_MESSAGE_ID = `^[!-~]{1,${MAX_MAIL_PROVIDER_MESSAGE_ID_LENGTH2}}$`;
var mailboxes2 = outboundSchema2.table("mailboxes", {
  id: text42("id").notNull(),
  organizationId: text42("organization_id").notNull(),
  provider: text42("provider", { enum: MAILBOX_PROVIDERS2 }).notNull(),
  kind: text42("kind", { enum: MAILBOX_KINDS2 }).notNull(),
  address: text42("address").notNull(),
  displayName: text42("display_name").notNull(),
  providerAccountId: text42("provider_account_id").notNull(),
  ownerMembershipId: text42("owner_membership_id"),
  teamIds: text42("team_ids").array().notNull().default(sql29`'{}'::text[]`),
  state: text42("state", { enum: MAILBOX_STATES2 }).notNull().default("warming"),
  stateReason: text42("state_reason", { enum: MAILBOX_STATE_REASONS2 }),
  stateChangedAt: ts8("state_changed_at").notNull().defaultNow(),
  accessTokenCiphertext: bytes9("access_token_ciphertext"),
  accessTokenExpiresAt: ts8("access_token_expires_at"),
  refreshTokenCiphertext: bytes9("refresh_token_ciphertext"),
  tokenKeyId: text42("token_key_id"),
  syncCursor: text42("sync_cursor"),
  lastSyncedAt: ts8("last_synced_at"),
  nextPollAt: ts8("next_poll_at"),
  healthScore: smallint5("health_score"),
  healthEffect: text42("health_effect", { enum: HEALTH_EFFECTS2 }).notNull().default("none"),
  healthScoredAt: ts8("health_scored_at"),
  rampStartedAt: ts8("ramp_started_at").notNull().defaultNow(),
  connectedAt: ts8("connected_at").notNull().defaultNow(),
  disconnectedAt: ts8("disconnected_at"),
  updatedAt: ts8("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey13({ name: "mailboxes_pkey", columns: [t.organizationId, t.id] }),
  check24("mailboxes_id_shape", idShape9("id", "mbx")),
  check24("mailboxes_organization_id_shape", orgShape8),
  check24("mailboxes_organization_not_global", notGlobal8),
  check24("mailboxes_provider_known", sql29`${t.provider} in (${list10(MAILBOX_PROVIDERS2)})`),
  check24("mailboxes_kind_known", sql29`${t.kind} in (${list10(MAILBOX_KINDS2)})`),
  check24("mailboxes_address_shape", sql29`char_length(${t.address}) between 3 and 254
        and ${t.address} = lower(${t.address})
        and ${t.address} ~ '^[^@[:space:]]+@[^@[:space:]]+$'`),
  check24("mailboxes_display_name_shape", sql29`char_length(${t.displayName}) between 1 and ${num3(MAX_MAILBOX_NAME_LENGTH2)}`),
  check24("mailboxes_provider_account_id_shape", sql29`char_length(${t.providerAccountId}) between 1 and ${num3(MAX_PROVIDER_REFERENCE_LENGTH2)}`),
  check24("mailboxes_owner_membership_id_shape", idShape9("owner_membership_id", "mem")),
  check24("mailboxes_owner_matches_kind", sql29`(${t.kind} = 'personal') = (${t.ownerMembershipId} is not null)`),
  check24("mailboxes_team_ids_shape", sql29`cardinality(${t.teamIds}) <= ${num3(MAX_MAILBOX_TEAMS2)}
        and array_to_string(${t.teamIds}, ',') ~ '^(team_[0-9a-f]{32}(,team_[0-9a-f]{32})*)?$'`),
  check24("mailboxes_teams_only_shared", sql29`${t.kind} = 'shared' or cardinality(${t.teamIds}) = 0`),
  check24("mailboxes_state_known", sql29`${t.state} in (${list10(MAILBOX_STATES2)})`),
  check24("mailboxes_state_reason_known", sql29`${t.stateReason} is null or ${t.stateReason} in (${list10(MAILBOX_STATE_REASONS2)})`),
  check24("mailboxes_state_reason_matches_state", sql29`case when ${t.state} = 'limited' then ${t.stateReason} is not null
        else (${t.state} in ('paused', 'disconnected')) = (${t.stateReason} is not null) end`),
  check24("mailboxes_disconnected_at_matches_state", sql29`(${t.state} = 'disconnected') = (${t.disconnectedAt} is not null)`),
  check24("mailboxes_tokens_shape", sql29`(${t.accessTokenCiphertext} is null or octet_length(${t.accessTokenCiphertext}) between 1 and ${num3(MAX_TOKEN_CIPHERTEXT_BYTES2)})
        and (${t.refreshTokenCiphertext} is null or octet_length(${t.refreshTokenCiphertext}) between 1 and ${num3(MAX_TOKEN_CIPHERTEXT_BYTES2)})
        and (${t.tokenKeyId} is null or char_length(${t.tokenKeyId}) between 1 and 64)
        and ((${t.accessTokenCiphertext} is null and ${t.refreshTokenCiphertext} is null) = (${t.tokenKeyId} is null))
        and (${t.accessTokenExpiresAt} is null or ${t.accessTokenCiphertext} is not null)`),
  check24("mailboxes_disconnected_holds_no_tokens", sql29`${t.state} <> 'disconnected'
        or (${t.accessTokenCiphertext} is null and ${t.refreshTokenCiphertext} is null)`),
  check24("mailboxes_sync_cursor_shape", sql29`${t.syncCursor} is null or char_length(${t.syncCursor}) between 1 and ${num3(MAX_PROVIDER_REFERENCE_LENGTH2)}`),
  check24("mailboxes_health_score_range", sql29`${t.healthScore} is null or ${t.healthScore} between 0 and 100`),
  check24("mailboxes_health_effect_known", sql29`${t.healthEffect} in (${list10(HEALTH_EFFECTS2)})`),
  check24("mailboxes_health_effect_needs_score", sql29`${t.healthEffect} = 'none' or ${t.healthScore} is not null`),
  uniqueIndex11("mailboxes_address_key").on(t.organizationId, t.provider, t.address),
  index34("mailboxes_list_idx").on(t.organizationId, t.connectedAt.desc(), t.id.desc()),
  index34("mailboxes_owner_idx").on(t.organizationId, t.ownerMembershipId, t.connectedAt.desc(), t.id.desc()).where(sql29`${t.ownerMembershipId} is not null`),
  index34("mailboxes_state_idx").on(t.organizationId, t.state, t.connectedAt.desc(), t.id.desc()),
  index34("mailboxes_poll_idx").on(t.organizationId, t.nextPollAt).where(sql29`${t.nextPollAt} is not null`)
]);
var mailboxLimits2 = outboundSchema2.table("mailbox_limits", {
  organizationId: text42("organization_id").notNull(),
  mailboxId: text42("mailbox_id").notNull(),
  perDay: integer21("per_day").notNull(),
  perHour: integer21("per_hour").notNull(),
  minGapSeconds: integer21("min_gap_seconds").notNull().default(0),
  windowTimeZone: text42("window_time_zone").notNull(),
  windowDays: smallint5("window_days").notNull().default(31),
  windowStartMinute: smallint5("window_start_minute").notNull().default(540),
  windowEndMinute: smallint5("window_end_minute").notNull().default(1020),
  updatedByMembershipId: text42("updated_by_membership_id"),
  updatedAt: ts8("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey13({ name: "mailbox_limits_pkey", columns: [t.organizationId, t.mailboxId] }),
  check24("mailbox_limits_organization_id_shape", orgShape8),
  check24("mailbox_limits_organization_not_global", notGlobal8),
  check24("mailbox_limits_mailbox_id_shape", idShape9("mailbox_id", "mbx")),
  check24("mailbox_limits_per_day_range", sql29`${t.perDay} between 1 and ${num3(MAX_SENDS_PER_DAY2)}`),
  check24("mailbox_limits_per_hour_range", sql29`${t.perHour} between 1 and ${num3(MAX_SENDS_PER_HOUR2)}`),
  check24("mailbox_limits_min_gap_range", sql29`${t.minGapSeconds} between 0 and ${num3(MAX_MIN_GAP_SECONDS2)}`),
  check24("mailbox_limits_window_time_zone_shape", sql29`char_length(${t.windowTimeZone}) between 1 and 64`),
  check24("mailbox_limits_window_days_range", sql29`${t.windowDays} between 1 and 127`),
  check24("mailbox_limits_window_minutes_range", sql29`${t.windowStartMinute} between 0 and 1439
        and ${t.windowEndMinute} between 1 and 1440
        and ${t.windowEndMinute} > ${t.windowStartMinute}`),
  check24("mailbox_limits_updated_by_membership_id_shape", idShape9("updated_by_membership_id", "mem")),
  foreignKey12({
    name: "mailbox_limits_mailbox_fk",
    columns: [t.organizationId, t.mailboxId],
    foreignColumns: [mailboxes2.organizationId, mailboxes2.id]
  }).onDelete("cascade")
]);
var mailMessages2 = outboundSchema2.table("mail_messages", {
  id: text42("id").notNull(),
  organizationId: text42("organization_id").notNull(),
  campaignId: text42("campaign_id").notNull(),
  enrollmentId: text42("enrollment_id").notNull(),
  prospectId: text42("prospect_id").notNull(),
  draftId: text42("draft_id"),
  step: integer21("step").notNull(),
  attemptEpoch: integer21("attempt_epoch").notNull(),
  sendKey: text42("send_key").notNull(),
  mailboxId: text42("mailbox_id"),
  state: text42("state", { enum: SEND_STATES2 }).notNull(),
  reason: text42("reason", { enum: SEND_REFUSAL_REASONS2 }),
  checks: jsonb18("checks").notNull().default(sql29`'[]'::jsonb`),
  retryAt: ts8("retry_at"),
  providerMessageId: text42("provider_message_id"),
  providerThreadId: text42("provider_thread_id"),
  decidedAt: ts8("decided_at").notNull().defaultNow(),
  sentAt: ts8("sent_at"),
  updatedAt: ts8("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey13({ name: "mail_messages_pkey", columns: [t.organizationId, t.id] }),
  check24("mail_messages_id_shape", idShape9("id", "snd")),
  check24("mail_messages_organization_id_shape", orgShape8),
  check24("mail_messages_organization_not_global", notGlobal8),
  check24("mail_messages_campaign_id_shape", idShape9("campaign_id", "cpg")),
  check24("mail_messages_enrollment_id_shape", idShape9("enrollment_id", "enr")),
  check24("mail_messages_prospect_id_shape", idShape9("prospect_id", "prs")),
  check24("mail_messages_draft_id_shape", idShape9("draft_id", "drf")),
  check24("mail_messages_mailbox_id_shape", idShape9("mailbox_id", "mbx")),
  check24("mail_messages_step_range", sql29`${t.step} between 0 and ${num3(MAX_SEQUENCE_STEP2)}`),
  check24("mail_messages_attempt_epoch_range", sql29`${t.attemptEpoch} between 0 and ${num3(MAX_ATTEMPT_EPOCH2)}`),
  check24("mail_messages_send_key_matches", sql29`${t.sendKey} = ${t.enrollmentId} || ':' || ${t.step}::text || ':' || ${t.attemptEpoch}::text`),
  check24("mail_messages_state_known", sql29`${t.state} in (${list10(SEND_STATES2)})`),
  check24("mail_messages_reason_known", sql29`${t.reason} is null or ${t.reason} in (${list10(SEND_REFUSAL_REASONS2)})`),
  check24("mail_messages_reason_matches_state", sql29`(${t.state} in ('refused', 'deferred')) = (${t.reason} is not null)`),
  check24("mail_messages_reason_fits_state", sql29`${t.state} not in ('refused', 'deferred')
        or ((${t.state} = 'deferred') = (${t.reason} in (${list10(SEND_DEFERRING_REASONS2)})))`),
  check24("mail_messages_retry_at_matches_state", sql29`(${t.state} = 'deferred') = (${t.retryAt} is not null)`),
  check24("mail_messages_mailbox_when_sending", sql29`${t.state} not in ('sending', 'sent', 'failed') or ${t.mailboxId} is not null`),
  check24("mail_messages_sent_at_matches_state", sql29`(${t.state} = 'sent') = (${t.sentAt} is not null)`),
  check24("mail_messages_provider_ids_only_when_sent", sql29`(${t.providerMessageId} is null and ${t.providerThreadId} is null) or ${t.state} = 'sent'`),
  check24("mail_messages_provider_message_id_shape", sql29`${t.providerMessageId} is null or ${t.providerMessageId} ~ ${sql29.raw(`'${PROVIDER_MESSAGE_ID}'`)}`),
  check24("mail_messages_provider_thread_id_shape", sql29`${t.providerThreadId} is null or char_length(${t.providerThreadId}) between 1 and ${num3(MAX_PROVIDER_REFERENCE_LENGTH2)}`),
  check24("mail_messages_checks_shape", sql29`jsonb_typeof(${t.checks}) = 'array' and jsonb_array_length(${t.checks}) <= ${num3(SEND_CHECKS2.length)}`),
  uniqueIndex11("mail_messages_send_key_key").on(t.organizationId, t.sendKey),
  uniqueIndex11("mail_messages_provider_message_key").on(t.organizationId, t.mailboxId, t.providerMessageId),
  unique25("mail_messages_id_mailbox_key").on(t.organizationId, t.id, t.mailboxId),
  foreignKey12({
    name: "mail_messages_mailbox_fk",
    columns: [t.organizationId, t.mailboxId],
    foreignColumns: [mailboxes2.organizationId, mailboxes2.id]
  }).onDelete("cascade"),
  index34("mail_messages_list_idx").on(t.organizationId, t.decidedAt.desc(), t.id.desc()),
  index34("mail_messages_campaign_idx").on(t.organizationId, t.campaignId, t.decidedAt.desc(), t.id.desc()),
  index34("mail_messages_prospect_idx").on(t.organizationId, t.prospectId, t.decidedAt.desc(), t.id.desc()),
  index34("mail_messages_mailbox_idx").on(t.organizationId, t.mailboxId, t.decidedAt.desc(), t.id.desc()).where(sql29`${t.mailboxId} is not null`),
  index34("mail_messages_state_idx").on(t.organizationId, t.state, t.decidedAt.desc(), t.id.desc()),
  index34("mail_messages_enrollment_idx").on(t.organizationId, t.enrollmentId, t.step),
  index34("mail_messages_sent_idx").on(t.organizationId, t.mailboxId, t.sentAt.desc()).where(sql29`${t.sentAt} is not null`),
  index34("mail_messages_sending_idx").on(t.organizationId, t.decidedAt).where(sql29`${t.state} = 'sending'`),
  index34("mail_messages_deferred_idx").on(t.organizationId, t.retryAt).where(sql29`${t.state} = 'deferred'`)
]);
var mailEvents2 = outboundSchema2.table("mail_events", {
  id: text42("id").notNull(),
  organizationId: text42("organization_id").notNull(),
  mailboxId: text42("mailbox_id").notNull(),
  kind: text42("kind", { enum: MAIL_EVENT_KINDS2 }).notNull(),
  sendId: text42("send_id"),
  prospectId: text42("prospect_id"),
  enrollmentId: text42("enrollment_id"),
  providerMessageId: text42("provider_message_id").notNull(),
  returnDate: date3("return_date", { mode: "string" }),
  occurredAt: ts8("occurred_at").notNull(),
  recordedAt: ts8("recorded_at").notNull().defaultNow()
}, (t) => [
  primaryKey13({ name: "mail_events_pkey", columns: [t.organizationId, t.id] }),
  check24("mail_events_id_shape", idShape9("id", "mev")),
  check24("mail_events_organization_id_shape", orgShape8),
  check24("mail_events_organization_not_global", notGlobal8),
  check24("mail_events_mailbox_id_shape", idShape9("mailbox_id", "mbx")),
  check24("mail_events_kind_known", sql29`${t.kind} in (${list10(MAIL_EVENT_KINDS2)})`),
  check24("mail_events_send_id_shape", idShape9("send_id", "snd")),
  check24("mail_events_prospect_id_shape", idShape9("prospect_id", "prs")),
  check24("mail_events_enrollment_id_shape", idShape9("enrollment_id", "enr")),
  check24("mail_events_provider_message_id_shape", sql29`${t.providerMessageId} ~ ${sql29.raw(`'${PROVIDER_MESSAGE_ID}'`)}`),
  check24("mail_events_return_date_only_out_of_office", sql29`${t.returnDate} is null or ${t.kind} = 'out_of_office'`),
  uniqueIndex11("mail_events_provider_message_key").on(t.organizationId, t.mailboxId, t.providerMessageId),
  foreignKey12({
    name: "mail_events_mailbox_fk",
    columns: [t.organizationId, t.mailboxId],
    foreignColumns: [mailboxes2.organizationId, mailboxes2.id]
  }).onDelete("cascade"),
  foreignKey12({
    name: "mail_events_send_fk",
    columns: [t.organizationId, t.sendId, t.mailboxId],
    foreignColumns: [mailMessages2.organizationId, mailMessages2.id, mailMessages2.mailboxId]
  }).onDelete("cascade"),
  index34("mail_events_list_idx").on(t.organizationId, t.occurredAt.desc(), t.id.desc()),
  index34("mail_events_mailbox_idx").on(t.organizationId, t.mailboxId, t.occurredAt.desc(), t.id.desc()),
  index34("mail_events_mailbox_kind_idx").on(t.organizationId, t.mailboxId, t.kind, t.occurredAt.desc(), t.id.desc()),
  index34("mail_events_prospect_idx").on(t.organizationId, t.prospectId, t.occurredAt.desc(), t.id.desc()).where(sql29`${t.prospectId} is not null`)
]);
var healthDaily2 = outboundSchema2.table("health_daily", {
  organizationId: text42("organization_id").notNull(),
  mailboxId: text42("mailbox_id").notNull(),
  day: date3("day", { mode: "string" }).notNull(),
  score: smallint5("score"),
  sent: integer21("sent").notNull().default(0),
  hardBounces: integer21("hard_bounces").notNull().default(0),
  softBounces: integer21("soft_bounces").notNull().default(0),
  complaints: integer21("complaints").notNull().default(0),
  replies: integer21("replies").notNull().default(0),
  errors: integer21("errors").notNull().default(0),
  components: jsonb18("components").notNull().default(sql29`'[]'::jsonb`),
  computedAt: ts8("computed_at").notNull().defaultNow()
}, (t) => [
  primaryKey13({ name: "health_daily_pkey", columns: [t.organizationId, t.mailboxId, t.day] }),
  check24("health_daily_organization_id_shape", orgShape8),
  check24("health_daily_organization_not_global", notGlobal8),
  check24("health_daily_mailbox_id_shape", idShape9("mailbox_id", "mbx")),
  check24("health_daily_score_range", sql29`${t.score} is null or ${t.score} between 0 and 100`),
  check24("health_daily_counts_range", sql29`${t.sent} between 0 and ${num3(MAX_HEALTH_COUNT2)}
        and ${t.hardBounces} between 0 and ${num3(MAX_HEALTH_COUNT2)}
        and ${t.softBounces} between 0 and ${num3(MAX_HEALTH_COUNT2)}
        and ${t.complaints} between 0 and ${num3(MAX_HEALTH_COUNT2)}
        and ${t.replies} between 0 and ${num3(MAX_HEALTH_COUNT2)}
        and ${t.errors} between 0 and ${num3(MAX_HEALTH_COUNT2)}`),
  check24("health_daily_components_shape", sql29`jsonb_typeof(${t.components}) = 'array' and jsonb_array_length(${t.components}) <= ${num3(MAX_HEALTH_COMPONENTS2)}`),
  foreignKey12({
    name: "health_daily_mailbox_fk",
    columns: [t.organizationId, t.mailboxId],
    foreignColumns: [mailboxes2.organizationId, mailboxes2.id]
  }).onDelete("cascade")
]);
var mailboxConnectAttempts2 = outboundSchema2.table("mailbox_connect_attempts", {
  id: text42("id").notNull(),
  organizationId: text42("organization_id").notNull(),
  userId: text42("user_id").notNull(),
  stateHash: text42("state_hash").notNull(),
  createdAt: ts8("created_at").notNull().defaultNow(),
  expiresAt: ts8("expires_at").notNull(),
  consumedAt: ts8("consumed_at")
}, (t) => [
  primaryKey13({ name: "mailbox_connect_attempts_pkey", columns: [t.organizationId, t.id] }),
  check24("mailbox_connect_attempts_id_shape", idShape9("id", "mca")),
  check24("mailbox_connect_attempts_organization_id_shape", orgShape8),
  check24("mailbox_connect_attempts_organization_not_global", notGlobal8),
  check24("mailbox_connect_attempts_user_id_shape", idShape9("user_id", "usr")),
  check24("mailbox_connect_attempts_state_hash_shape", sql29`${t.stateHash} ~ '^[0-9a-f]{64}$'`),
  check24("mailbox_connect_attempts_expires_after_created", sql29`${t.expiresAt} > ${t.createdAt}`),
  check24("mailbox_connect_attempts_consumed_after_created", sql29`${t.consumedAt} is null or ${t.consumedAt} >= ${t.createdAt}`),
  uniqueIndex11("mailbox_connect_attempts_state_key").on(t.organizationId, t.stateHash),
  index34("mailbox_connect_attempts_expiry_idx").on(t.organizationId, t.expiresAt)
]);
var mailboxTestSends2 = outboundSchema2.table("mailbox_test_sends", {
  organizationId: text42("organization_id").notNull(),
  mailboxId: text42("mailbox_id").notNull(),
  keyHash: text42("key_hash").notNull(),
  providerMessageId: text42("provider_message_id").notNull(),
  sentAt: ts8("sent_at").notNull().defaultNow()
}, (t) => [
  primaryKey13({
    name: "mailbox_test_sends_pkey",
    columns: [t.organizationId, t.mailboxId, t.keyHash]
  }),
  check24("mailbox_test_sends_organization_id_shape", orgShape8),
  check24("mailbox_test_sends_organization_not_global", notGlobal8),
  check24("mailbox_test_sends_mailbox_id_shape", idShape9("mailbox_id", "mbx")),
  check24("mailbox_test_sends_key_hash_shape", sql29`${t.keyHash} ~ '^[0-9a-f]{64}$'`),
  check24("mailbox_test_sends_provider_message_id_shape", sql29`${t.providerMessageId} ~ ${sql29.raw(`'${PROVIDER_MESSAGE_ID}'`)}`),
  foreignKey12({
    name: "mailbox_test_sends_mailbox_fk",
    columns: [t.organizationId, t.mailboxId],
    foreignColumns: [mailboxes2.organizationId, mailboxes2.id]
  }).onDelete("cascade"),
  index34("mailbox_test_sends_recent_idx").on(t.organizationId, t.mailboxId, t.sentAt)
]);

// src/schema/outbound-tables.ts
import { sql as sql30 } from "drizzle-orm";
import {
  bigint as bigint8,
  boolean as boolean13,
  check as check25,
  date as date4,
  doublePrecision as doublePrecision2,
  foreignKey as foreignKey13,
  index as index35,
  integer as integer22,
  primaryKey as primaryKey14,
  smallint as smallint6,
  text as text43,
  timestamp as timestamp37,
  unique as unique26,
  uniqueIndex as uniqueIndex12
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
var list11 = (values) => sql30.raw(values.map((v) => `'${v}'`).join(", "));
var num4 = (value) => sql30.raw(String(value));
var idShape10 = (column, prefix) => sql30.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape9 = sql30.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal9 = sql30.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts9 = (name) => timestamp37(name, { withTimezone: true });
var sourceColumns = () => ({
  sourceKind: text43("source_kind", { enum: CITATION_KINDS2 }).notNull(),
  sourceProspectId: text43("source_prospect_id"),
  sourceField: text43("source_field", { enum: CITATION_PROSPECT_FIELDS2 }),
  sourceSignalId: text43("source_signal_id"),
  sourceObservedAt: ts9("source_observed_at"),
  sourceUrl: text43("source_url"),
  sourceRetrievedAt: ts9("source_retrieved_at"),
  sourceCallId: text43("source_call_id"),
  sourceDealRecordId: text43("source_deal_record_id"),
  sourceDocumentId: text43("source_document_id"),
  sourcePage: smallint6("source_page")
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
var sourceMatchesKind = (table) => sql30.raw(`${CITATION_KINDS2.map((kind) => {
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
  check25(`${table}_source_kind_known`, sql30`${t.sourceKind} in (${list11(CITATION_KINDS2)})`),
  check25(`${table}_source_matches_kind`, sourceMatchesKind(table)),
  check25(`${table}_source_prospect_id_shape`, idShape10("source_prospect_id", "prs")),
  check25(`${table}_source_signal_id_shape`, idShape10("source_signal_id", "sig")),
  check25(`${table}_source_call_id_shape`, idShape10("source_call_id", "call")),
  check25(`${table}_source_deal_record_id_shape`, idShape10("source_deal_record_id", "deal")),
  check25(`${table}_source_document_id_shape`, idShape10("source_document_id", "doc")),
  check25(`${table}_source_field_known`, sql30`${t.sourceField} is null or ${t.sourceField} in (${list11(CITATION_PROSPECT_FIELDS2)})`),
  check25(`${table}_source_url_shape`, sql30`${t.sourceUrl} is null or (char_length(${t.sourceUrl}) between 1 and ${num4(MAX_CITATION_URL_LENGTH2)}
      and ${t.sourceUrl} ~ '^https?://[^@/?#[:space:]]+([/?#][^[:space:]]*)?$')`),
  check25(`${table}_source_page_shape`, sql30`${t.sourcePage} is null or ${t.sourcePage} between 1 and ${num4(MAX_CITATION_DOCUMENT_PAGE2)}`)
];
var outboundBrandVoices2 = outboundSchema2.table("brand_voices", {
  id: text43("id").notNull(),
  organizationId: text43("organization_id").notNull(),
  version: integer22("version").notNull(),
  tone: text43("tone").notNull(),
  preferredWords: text43("preferred_words").array().notNull().default(sql30`'{}'::text[]`),
  bannedPhrases: text43("banned_phrases").array().notNull().default(sql30`'{}'::text[]`),
  signOff: text43("sign_off"),
  maxLengthCharacters: integer22("max_length_characters").notNull().default(1500),
  createdByMembershipId: text43("created_by_membership_id").notNull(),
  createdAt: ts9("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey14({ name: "brand_voices_pkey", columns: [t.organizationId, t.id] }),
  check25("brand_voices_id_shape", idShape10("id", "bvo")),
  check25("brand_voices_organization_id_shape", orgShape9),
  check25("brand_voices_organization_not_global", notGlobal9),
  check25("brand_voices_version_range", sql30`${t.version} between 1 and ${num4(MAX_VOICE_VERSION2)}`),
  check25("brand_voices_tone_shape", sql30`char_length(${t.tone}) between 1 and ${num4(MAX_TONE_LENGTH2)}`),
  check25("brand_voices_preferred_words_shape", sql30`cardinality(${t.preferredWords}) <= ${num4(MAX_PREFERRED_WORDS2)}
        and array_position(${t.preferredWords}, '') is null
        and array_position(${t.preferredWords}, null) is null
        and char_length(array_to_string(${t.preferredWords}, '')) <= ${num4(MAX_PREFERRED_WORDS2 * MAX_VOICE_TERM_LENGTH2)}`),
  check25("brand_voices_banned_phrases_shape", sql30`cardinality(${t.bannedPhrases}) <= ${num4(MAX_BANNED_PHRASES2)}
        and array_position(${t.bannedPhrases}, '') is null
        and array_position(${t.bannedPhrases}, null) is null
        and char_length(array_to_string(${t.bannedPhrases}, '')) <= ${num4(MAX_BANNED_PHRASES2 * MAX_VOICE_TERM_LENGTH2)}`),
  check25("brand_voices_sign_off_shape", sql30`${t.signOff} is null or char_length(${t.signOff}) between 1 and ${num4(MAX_SIGN_OFF_LENGTH2)}`),
  check25("brand_voices_max_length_range", sql30`${t.maxLengthCharacters} between ${num4(MIN_VOICE_LENGTH_CHARACTERS2)} and ${num4(MAX_VOICE_LENGTH_CHARACTERS2)}`),
  check25("brand_voices_created_by_membership_id_shape", idShape10("created_by_membership_id", "mem")),
  uniqueIndex12("brand_voices_version_key").on(t.organizationId, t.version),
  unique26("brand_voices_id_version_key").on(t.organizationId, t.id, t.version)
]);
var outboundBriefs2 = outboundSchema2.table("briefs", {
  id: text43("id").notNull(),
  organizationId: text43("organization_id").notNull(),
  prospectId: text43("prospect_id").notNull(),
  angleText: text43("angle_text").notNull(),
  angleOrigin: text43("angle_origin", { enum: ANGLE_ORIGINS2 }).notNull(),
  droppedCount: integer22("dropped_count").notNull().default(0),
  prospectUpdatedAt: ts9("prospect_updated_at").notNull(),
  language: text43("language", { enum: OUTBOUND_LANGUAGES2 }).notNull(),
  model: text43("model").notNull(),
  createdAt: ts9("created_at").notNull().defaultNow(),
  expiresAt: ts9("expires_at").notNull(),
  requestKey: text43("request_key")
}, (t) => [
  primaryKey14({ name: "briefs_pkey", columns: [t.organizationId, t.id] }),
  check25("briefs_id_shape", idShape10("id", "brf")),
  check25("briefs_organization_id_shape", orgShape9),
  check25("briefs_organization_not_global", notGlobal9),
  check25("briefs_prospect_id_shape", idShape10("prospect_id", "prs")),
  check25("briefs_angle_text_shape", sql30`char_length(${t.angleText}) between 1 and ${num4(MAX_ANGLE_LENGTH2)}`),
  check25("briefs_angle_origin_known", sql30`${t.angleOrigin} in (${list11(ANGLE_ORIGINS2)})`),
  check25("briefs_dropped_count_range", sql30`${t.droppedCount} between 0 and ${num4(MAX_DROPPED_COUNT2)}`),
  check25("briefs_language_known", sql30`${t.language} in (${list11(OUTBOUND_LANGUAGES2)})`),
  check25("briefs_model_shape", sql30`char_length(${t.model}) between 1 and ${num4(MAX_MODEL_NAME_LENGTH2)}`),
  check25("briefs_expires_after_created", sql30`${t.expiresAt} > ${t.createdAt}`),
  check25("briefs_request_key_shape", sql30`${t.requestKey} is null or (char_length(${t.requestKey}) between 16 and 128 and ${t.requestKey} ~ '^[A-Za-z0-9_.:-]+$')`),
  uniqueIndex12("briefs_request_key").on(t.organizationId, t.requestKey),
  unique26("briefs_id_prospect_key").on(t.organizationId, t.id, t.prospectId),
  index35("briefs_prospect_idx").on(t.organizationId, t.prospectId, t.createdAt.desc(), t.id.desc()),
  index35("briefs_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index35("briefs_expires_at_idx").on(t.expiresAt)
]);
var outboundBriefStatements2 = outboundSchema2.table("brief_statements", {
  organizationId: text43("organization_id").notNull(),
  briefId: text43("brief_id").notNull(),
  position: smallint6("position").notNull(),
  role: text43("role", { enum: BRIEF_ENTRY_ROLES2 }).notNull(),
  text: text43("text"),
  ...sourceColumns()
}, (t) => [
  primaryKey14({
    name: "brief_statements_pkey",
    columns: [t.organizationId, t.briefId, t.position]
  }),
  check25("brief_statements_organization_id_shape", orgShape9),
  check25("brief_statements_organization_not_global", notGlobal9),
  check25("brief_statements_brief_id_shape", idShape10("brief_id", "brf")),
  check25("brief_statements_position_range", sql30`${t.position} between 0 and ${num4(MAX_BRIEF_STATEMENTS2 * 2 - 1)}`),
  check25("brief_statements_role_known", sql30`${t.role} in (${list11(BRIEF_ENTRY_ROLES2)})`),
  check25("brief_statements_text_matches_role", sql30`(${t.role} = 'statement') = (${t.text} is not null)
        and (${t.text} is null or char_length(${t.text}) between 1 and ${num4(MAX_BRIEF_STATEMENT_LENGTH2)})`),
  ...sourceChecks("brief_statements", t),
  foreignKey13({
    name: "brief_statements_brief_fk",
    columns: [t.organizationId, t.briefId],
    foreignColumns: [outboundBriefs2.organizationId, outboundBriefs2.id]
  }).onDelete("cascade")
]);
var outboundDrafts2 = outboundSchema2.table("drafts", {
  id: text43("id").notNull(),
  organizationId: text43("organization_id").notNull(),
  prospectId: text43("prospect_id").notNull(),
  campaignId: text43("campaign_id"),
  stepKey: text43("step_key"),
  channel: text43("channel", { enum: DRAFT_CHANNELS2 }).notNull(),
  goal: text43("goal").notNull(),
  language: text43("language", { enum: OUTBOUND_LANGUAGES2 }).notNull(),
  subject: text43("subject").notNull(),
  body: text43("body").notNull(),
  revision: integer22("revision").notNull().default(1),
  source: text43("source", { enum: DRAFT_TEXT_SOURCES2 }).notNull().default("generated"),
  ungrounded: boolean13("ungrounded").notNull(),
  wonDealCount: integer22("won_deal_count").notNull().default(0),
  autoSendable: boolean13("auto_sendable").notNull().default(false),
  brandVoiceId: text43("brand_voice_id").notNull(),
  voiceVersion: integer22("voice_version").notNull(),
  briefId: text43("brief_id"),
  model: text43("model").notNull(),
  createdAt: ts9("created_at").notNull().defaultNow(),
  updatedAt: ts9("updated_at").notNull().defaultNow(),
  requestKey: text43("request_key"),
  regenerateKey: text43("regenerate_key")
}, (t) => [
  primaryKey14({ name: "drafts_pkey", columns: [t.organizationId, t.id] }),
  check25("drafts_id_shape", idShape10("id", "drf")),
  check25("drafts_organization_id_shape", orgShape9),
  check25("drafts_organization_not_global", notGlobal9),
  check25("drafts_prospect_id_shape", idShape10("prospect_id", "prs")),
  check25("drafts_campaign_id_shape", idShape10("campaign_id", "cpg")),
  check25("drafts_step_key_shape", sql30`${t.stepKey} is null or (char_length(${t.stepKey}) between 1 and ${num4(MAX_STEP_KEY_LENGTH2)}
        and ${t.stepKey} ~ '^[a-z][a-z0-9_-]*$')`),
  check25("drafts_channel_known", sql30`${t.channel} in (${list11(DRAFT_CHANNELS2)})`),
  check25("drafts_goal_shape", sql30`char_length(${t.goal}) between 1 and ${num4(MAX_DRAFT_GOAL_LENGTH2)}`),
  check25("drafts_language_known", sql30`${t.language} in (${list11(OUTBOUND_LANGUAGES2)})`),
  check25("drafts_subject_shape", sql30`char_length(${t.subject}) between 1 and ${num4(MAX_DRAFT_SUBJECT_LENGTH2)}`),
  check25("drafts_body_shape", sql30`char_length(${t.body}) between 1 and ${num4(MAX_DRAFT_BODY_LENGTH2)}`),
  check25("drafts_revision_range", sql30`${t.revision} between 1 and ${num4(MAX_DRAFT_REVISION2)}`),
  check25("drafts_source_known", sql30`${t.source} in (${list11(DRAFT_TEXT_SOURCES2)})`),
  check25("drafts_edited_after_first", sql30`${t.source} = 'generated' or ${t.revision} > 1`),
  check25("drafts_won_deal_count_range", sql30`${t.wonDealCount} between 0 and ${num4(MAX_WON_DEAL_COUNT2)}`),
  check25("drafts_ungrounded_has_no_deals", sql30`not ${t.ungrounded} or ${t.wonDealCount} = 0`),
  check25("drafts_auto_sendable_needs_grounding", sql30`not (${t.autoSendable} and ${t.ungrounded})`),
  check25("drafts_brand_voice_id_shape", idShape10("brand_voice_id", "bvo")),
  check25("drafts_voice_version_range", sql30`${t.voiceVersion} between 1 and ${num4(MAX_VOICE_VERSION2)}`),
  check25("drafts_brief_id_shape", idShape10("brief_id", "brf")),
  check25("drafts_model_shape", sql30`char_length(${t.model}) between 1 and ${num4(MAX_MODEL_NAME_LENGTH2)}`),
  check25("drafts_updated_not_before_created", sql30`${t.updatedAt} >= ${t.createdAt}`),
  check25("drafts_request_key_shape", sql30`${t.requestKey} is null or (char_length(${t.requestKey}) between 16 and 128 and ${t.requestKey} ~ '^[A-Za-z0-9_.:-]+$')`),
  check25("drafts_regenerate_key_shape", sql30`${t.regenerateKey} is null or (char_length(${t.regenerateKey}) between 16 and 128 and ${t.regenerateKey} ~ '^[A-Za-z0-9_.:-]+$')`),
  uniqueIndex12("drafts_request_key").on(t.organizationId, t.requestKey),
  foreignKey13({
    name: "drafts_brand_voice_fk",
    columns: [t.organizationId, t.brandVoiceId, t.voiceVersion],
    foreignColumns: [
      outboundBrandVoices2.organizationId,
      outboundBrandVoices2.id,
      outboundBrandVoices2.version
    ]
  }),
  foreignKey13({
    name: "drafts_brief_fk",
    columns: [t.organizationId, t.briefId, t.prospectId],
    foreignColumns: [outboundBriefs2.organizationId, outboundBriefs2.id, outboundBriefs2.prospectId]
  }),
  index35("drafts_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index35("drafts_brief_idx").on(t.organizationId, t.briefId),
  index35("drafts_brand_voice_idx").on(t.organizationId, t.brandVoiceId, t.voiceVersion),
  index35("drafts_prospect_idx").on(t.organizationId, t.prospectId, t.createdAt.desc(), t.id.desc()),
  index35("drafts_campaign_idx").on(t.organizationId, t.campaignId, t.createdAt.desc(), t.id.desc()).where(sql30`${t.campaignId} is not null`),
  index35("drafts_ungrounded_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()).where(sql30`${t.ungrounded}`)
]);
var outboundDraftCitations2 = outboundSchema2.table("draft_citations", {
  organizationId: text43("organization_id").notNull(),
  draftId: text43("draft_id").notNull(),
  position: smallint6("position").notNull(),
  ...sourceColumns(),
  applies: boolean13("applies").notNull().default(true),
  score: doublePrecision2("score")
}, (t) => [
  primaryKey14({
    name: "draft_citations_pkey",
    columns: [t.organizationId, t.draftId, t.position]
  }),
  check25("draft_citations_organization_id_shape", orgShape9),
  check25("draft_citations_organization_not_global", notGlobal9),
  check25("draft_citations_draft_id_shape", idShape10("draft_id", "drf")),
  check25("draft_citations_position_range", sql30`${t.position} between 0 and ${num4(MAX_DRAFT_CITATIONS2 - 1)}`),
  check25("draft_citations_score_shape", sql30`${t.score} is null or (${t.sourceKind} in ('moment', 'document') and ${t.score} > -1000000 and ${t.score} < 1000000)`),
  ...sourceChecks("draft_citations", t),
  foreignKey13({
    name: "draft_citations_draft_fk",
    columns: [t.organizationId, t.draftId],
    foreignColumns: [outboundDrafts2.organizationId, outboundDrafts2.id]
  }).onDelete("cascade")
]);
var outboundDraftChecks2 = outboundSchema2.table("draft_checks", {
  organizationId: text43("organization_id").notNull(),
  draftId: text43("draft_id").notNull(),
  check: text43("check_name", { enum: DRAFT_CHECKS2 }).notNull(),
  result: text43("result", { enum: DRAFT_CHECK_RESULTS2 }).notNull(),
  count: integer22("count").notNull().default(0),
  checkedAt: ts9("checked_at").notNull().defaultNow()
}, (t) => [
  primaryKey14({
    name: "draft_checks_pkey",
    columns: [t.organizationId, t.draftId, t.check]
  }),
  check25("draft_checks_organization_id_shape", orgShape9),
  check25("draft_checks_organization_not_global", notGlobal9),
  check25("draft_checks_draft_id_shape", idShape10("draft_id", "drf")),
  check25("draft_checks_name_known", sql30`${t.check} in (${list11(DRAFT_CHECKS2)})`),
  check25("draft_checks_result_known", sql30`${t.result} in (${list11(DRAFT_CHECK_RESULTS2)})`),
  check25("draft_checks_count_range", sql30`${t.count} between 0 and ${num4(MAX_CHECK_COUNT2)}`),
  check25("draft_checks_pass_means_none", sql30`(${t.result} = 'pass') = (${t.count} = 0)`),
  foreignKey13({
    name: "draft_checks_draft_fk",
    columns: [t.organizationId, t.draftId],
    foreignColumns: [outboundDrafts2.organizationId, outboundDrafts2.id]
  }).onDelete("cascade")
]);
var outboundModelUsage2 = outboundSchema2.table("model_usage", {
  organizationId: text43("organization_id").notNull(),
  month: date4("month", { mode: "string" }).notNull(),
  model: text43("model").notNull(),
  inputTokens: bigint8("input_tokens", { mode: "number" }).notNull().default(0),
  outputTokens: bigint8("output_tokens", { mode: "number" }).notNull().default(0),
  requestCount: bigint8("request_count", { mode: "number" }).notNull().default(0),
  costMicros: bigint8("cost_micros", { mode: "number" }).notNull().default(0),
  updatedAt: ts9("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey14({ name: "model_usage_pkey", columns: [t.organizationId, t.month, t.model] }),
  check25("model_usage_organization_id_shape", orgShape9),
  check25("model_usage_organization_not_global", notGlobal9),
  check25("model_usage_month_first_day", sql30`extract(day from ${t.month}) = 1`),
  check25("model_usage_model_shape", sql30`char_length(${t.model}) between 1 and ${num4(MAX_MODEL_NAME_LENGTH2)}`),
  check25("model_usage_counts_not_negative", sql30`${t.inputTokens} >= 0 and ${t.outputTokens} >= 0 and ${t.requestCount} >= 0 and ${t.costMicros} >= 0`)
]);

// src/schema/voice-agent-calls.ts
import { sql as sql35 } from "drizzle-orm";
import {
  check as check30,
  customType as customType13,
  index as index40,
  integer as integer27,
  primaryKey as primaryKey19,
  smallint as smallint9,
  text as text48,
  timestamp as timestamp42,
  uniqueIndex as uniqueIndex17
} from "drizzle-orm/pg-core";

// src/schema/voice.ts
import { pgSchema as pgSchema4 } from "drizzle-orm/pg-core";
var voiceSchema2 = pgSchema4("voice");

// src/schema/voice-agent.ts
import { sql as sql34 } from "drizzle-orm";
import {
  boolean as boolean17,
  check as check29,
  customType as customType12,
  foreignKey as foreignKey17,
  index as index39,
  integer as integer26,
  jsonb as jsonb19,
  primaryKey as primaryKey18,
  smallint as smallint8,
  text as text47,
  timestamp as timestamp41,
  uniqueIndex as uniqueIndex16
} from "drizzle-orm/pg-core";

// src/schema/voice-tables.ts
import { sql as sql33 } from "drizzle-orm";
import {
  bigint as bigint11,
  boolean as boolean16,
  check as check28,
  foreignKey as foreignKey16,
  index as index38,
  integer as integer25,
  primaryKey as primaryKey17,
  smallint as smallint7,
  text as text46,
  timestamp as timestamp40,
  uniqueIndex as uniqueIndex15
} from "drizzle-orm/pg-core";

// src/schema/playbook-sales-history.ts
import { sql as sql32 } from "drizzle-orm";
import {
  bigint as bigint10,
  boolean as boolean15,
  check as check27,
  date as date5,
  foreignKey as foreignKey15,
  index as index37,
  integer as integer24,
  numeric,
  primaryKey as primaryKey16,
  text as text45,
  timestamp as timestamp39,
  uniqueIndex as uniqueIndex14,
  uuid as uuid24
} from "drizzle-orm/pg-core";

// src/schema/playbook.ts
import { pgSchema as pgSchema5 } from "drizzle-orm/pg-core";
var playbookSchema2 = pgSchema5("playbook");

// src/schema/playbook-tables.ts
import { sql as sql31 } from "drizzle-orm";
import {
  bigint as bigint9,
  boolean as boolean14,
  check as check26,
  customType as customType11,
  foreignKey as foreignKey14,
  index as index36,
  integer as integer23,
  primaryKey as primaryKey15,
  text as text44,
  timestamp as timestamp38,
  uniqueIndex as uniqueIndex13,
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
var bytes10 = customType11({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var list12 = (values) => sql31.raw(values.map((v) => `'${v}'`).join(", "));
var idShape11 = (column, prefix) => sql31.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var GLOBAL_SCOPE_ORGANIZATION_ID2 = "org_00000000000000000000000000000000";
var notGlobal10 = sql31.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`);
var ts10 = (name) => timestamp38(name, { withTimezone: true });
var createdAt4 = () => ts10("created_at").notNull().defaultNow();
var updatedAt4 = () => ts10("updated_at").notNull().defaultNow();
var PENDING_CLEANUP_PREDICATE2 = "state = 'deleted' and (vectors_removed_seq is null or vectors_removed_seq < deletion_seq)";
var documents2 = playbookSchema2.table("documents", {
  id: text44("id").notNull(),
  organizationId: text44("organization_id").notNull(),
  name: text44("name").notNull(),
  state: text44("state", { enum: DOCUMENT_STATES2 }).notNull().default("uploaded"),
  contentHash: bytes10("content_hash").notNull(),
  sizeBytes: bigint9("size_bytes", { mode: "number" }).notNull(),
  declaredType: text44("declared_type").notNull(),
  detectedType: text44("detected_type", { enum: DOCUMENT_FILE_TYPES2 }).notNull(),
  uploadedBy: text44("uploaded_by").notNull(),
  objectKey: text44("object_key").notNull(),
  failureReason: text44("failure_reason", { enum: DOCUMENT_FAILURE_REASONS2 }),
  pageCount: integer23("page_count"),
  epoch: integer23("epoch").notNull().default(0),
  deletionSeq: integer23("deletion_seq").notNull().default(0),
  vectorsRemovedSeq: integer23("vectors_removed_seq"),
  deletedAt: ts10("deleted_at"),
  deletedBy: text44("deleted_by"),
  purgeDueAt: ts10("purge_due_at"),
  purgeStartedAt: ts10("purge_started_at"),
  purgeLeaseUntil: ts10("purge_lease_until"),
  purgeAttempts: integer23("purge_attempts").notNull().default(0),
  restoreBarredAt: ts10("restore_barred_at"),
  createdAt: createdAt4(),
  updatedAt: updatedAt4()
}, (t) => [
  primaryKey15({ name: "documents_pkey", columns: [t.organizationId, t.id] }),
  check26("documents_id_shape", idShape11("id", "doc")),
  check26("documents_organization_id_shape", idShape11("organization_id", "org")),
  check26("documents_organization_not_global", notGlobal10),
  check26("documents_uploaded_by_shape", idShape11("uploaded_by", "usr")),
  check26("documents_deleted_by_shape", sql31`${t.deletedBy} ~ '^usr_[0-9a-f]{32}$'`),
  check26("documents_name_shape", sql31`char_length(btrim(${t.name})) between 1 and 255`),
  check26("documents_state_known", sql31`${t.state} in (${list12(DOCUMENT_STATES2)})`),
  check26("documents_content_hash_length", sql31`octet_length(${t.contentHash}) = 32`),
  check26("documents_size_bounds", sql31`${t.sizeBytes} between 1 and ${sql31.raw(String(DOCUMENT_MAX_BYTES2))}`),
  check26("documents_declared_type_shape", sql31`char_length(${t.declaredType}) between 1 and 255 and ${t.declaredType} collate "C" ~ '^[ -~]+$'`),
  check26("documents_detected_type_known", sql31`${t.detectedType} in (${list12(DOCUMENT_FILE_TYPES2)})`),
  check26("documents_object_key_shape", sql31`char_length(${t.objectKey}) between 1 and 1024 and ${t.objectKey} collate "C" ~ '^[!-~]+$'`),
  check26("documents_failure_reason_known", sql31`${t.failureReason} in (${list12(DOCUMENT_FAILURE_REASONS2)})`),
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
  uniqueIndex13("documents_content_hash_key").on(t.organizationId, t.contentHash).where(sql31`${t.purgeStartedAt} is null and ${t.restoreBarredAt} is null`),
  index36("documents_list_idx").on(t.organizationId, t.createdAt, t.id).where(sql31`${t.state} <> 'deleted'`),
  index36("documents_state_list_idx").on(t.organizationId, t.state, t.createdAt, t.id).where(sql31`${t.state} <> 'deleted'`),
  index36("documents_deleted_list_idx").on(t.organizationId, t.createdAt, t.id).where(sql31`${t.state} = 'deleted'`),
  index36("documents_purge_idx").on(t.organizationId, t.purgeDueAt, t.id).where(sql31`${t.state} = 'deleted' and ${t.purgeAttempts} < ${sql31.raw(String(DOCUMENT_PURGE_MAX_ATTEMPTS2))}`),
  index36("documents_unbarred_idx").on(t.organizationId, t.id).where(sql31`${t.restoreBarredAt} is null`),
  index36("documents_cleanup_idx").on(t.organizationId, t.deletedAt, t.id).where(sql31.raw(PENDING_CLEANUP_PREDICATE2)),
  index36("documents_spent_purge_idx").on(t.organizationId, t.id).where(sql31`${t.state} = 'deleted' and ${t.purgeAttempts} >= ${sql31.raw(String(DOCUMENT_PURGE_MAX_ATTEMPTS2))}`)
]);
var organizationUsage2 = playbookSchema2.table("organization_usage", {
  organizationId: text44("organization_id").primaryKey(),
  documentCount: bigint9("document_count", { mode: "number" }).notNull().default(0),
  byteCount: bigint9("byte_count", { mode: "number" }).notNull().default(0),
  dealCount: bigint9("deal_count", { mode: "number" }).notNull().default(0),
  callCount: bigint9("call_count", { mode: "number" }).notNull().default(0),
  recordingByteCount: bigint9("recording_byte_count", { mode: "number" }).notNull().default(0),
  updatedAt: updatedAt4()
}, (t) => [
  check26("organization_usage_organization_id_shape", idShape11("organization_id", "org")),
  check26("organization_usage_organization_not_global", notGlobal10),
  check26("organization_usage_not_negative", sql31`${t.documentCount} >= 0 and ${t.byteCount} >= 0`),
  check26("organization_usage_deal_count_not_negative", sql31`${t.dealCount} >= 0`),
  check26("organization_usage_call_counts_not_negative", sql31`${t.callCount} >= 0 and ${t.recordingByteCount} >= 0`)
]);
var ingestionJobs2 = playbookSchema2.table("ingestion_jobs", {
  id: text44("id").notNull(),
  organizationId: text44("organization_id").notNull(),
  documentId: text44("document_id").notNull(),
  epoch: integer23("epoch").notNull(),
  state: text44("state", { enum: INGESTION_JOB_STATES2 }).notNull().default("queued"),
  step: text44("step", { enum: INGESTION_STEPS2 }).notNull().default("parse"),
  attempts: integer23("attempts").notNull().default(0),
  nextAttemptAt: ts10("next_attempt_at").notNull(),
  claimToken: uuid23("claim_token"),
  artifactKey: text44("artifact_key"),
  pageCount: integer23("page_count"),
  chunkCount: integer23("chunk_count"),
  chunksDone: integer23("chunks_done").notNull().default(0),
  failureReason: text44("failure_reason", { enum: DOCUMENT_FAILURE_REASONS2 }),
  finishedAt: ts10("finished_at"),
  createdAt: createdAt4(),
  updatedAt: updatedAt4()
}, (t) => [
  primaryKey15({ name: "ingestion_jobs_pkey", columns: [t.organizationId, t.id] }),
  foreignKey14({
    name: "ingestion_jobs_document_fk",
    columns: [t.organizationId, t.documentId],
    foreignColumns: [documents2.organizationId, documents2.id]
  }).onDelete("cascade"),
  check26("ingestion_jobs_id_shape", idShape11("id", "job")),
  check26("ingestion_jobs_organization_id_shape", idShape11("organization_id", "org")),
  check26("ingestion_jobs_organization_not_global", notGlobal10),
  check26("ingestion_jobs_epoch_bounds", sql31`${t.epoch} >= 0`),
  check26("ingestion_jobs_state_known", sql31`${t.state} in (${list12(INGESTION_JOB_STATES2)})`),
  check26("ingestion_jobs_step_known", sql31`${t.step} in (${list12(INGESTION_STEPS2)})`),
  check26("ingestion_jobs_attempts_bounds", sql31`${t.attempts} between 0 and ${sql31.raw(String(INGESTION_JOB_MAX_ATTEMPTS2))}`),
  check26("ingestion_jobs_running_has_token", sql31`(${t.state} = 'running') = (${t.claimToken} is not null)`),
  check26("ingestion_jobs_artifact_key_shape", sql31`char_length(${t.artifactKey}) between 1 and 1024 and ${t.artifactKey} collate "C" ~ '^[!-~]+$'`),
  check26("ingestion_jobs_counts_bounds", sql31`${t.pageCount} between 1 and ${sql31.raw(String(DOCUMENT_MAX_PAGE_COUNT2))}
        and ${t.chunkCount} between 0 and ${sql31.raw(String(INGESTION_MAX_CHUNKS2))}
        and ${t.chunksDone} >= 0 and ${t.chunksDone} <= coalesce(${t.chunkCount}, 0)`),
  check26("ingestion_jobs_failure_reason_known", sql31`${t.failureReason} in (${list12(DOCUMENT_FAILURE_REASONS2)})`),
  check26("ingestion_jobs_failed_has_reason", sql31`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check26("ingestion_jobs_final_has_finish", sql31`(${t.state} in ('succeeded', 'failed', 'cancelled')) = (${t.finishedAt} is not null)`),
  index36("ingestion_jobs_document_idx").on(t.organizationId, t.documentId),
  uniqueIndex13("ingestion_jobs_active_document_key").on(t.organizationId, t.documentId).where(sql31`${t.state} in ('queued', 'running')`),
  index36("ingestion_jobs_due_idx").on(t.organizationId, t.nextAttemptAt).where(sql31`${t.state} in ('queued', 'running')`)
]);
var indexSettings2 = playbookSchema2.table("index_settings", {
  organizationId: text44("organization_id").primaryKey(),
  embeddingModel: text44("embedding_model").notNull(),
  embeddingDimension: integer23("embedding_dimension").notNull(),
  vectorsWrittenAt: ts10("vectors_written_at"),
  learnFromAgentMoments: boolean14("learn_from_agent_moments").notNull().default(true),
  createdAt: createdAt4(),
  updatedAt: updatedAt4()
}, (t) => [
  check26("index_settings_organization_id_shape", idShape11("organization_id", "org")),
  check26("index_settings_organization_not_global", notGlobal10),
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
var list13 = (values) => sql32.raw(values.map((v) => `'${v}'`).join(", "));
var idShape12 = (column, prefix) => sql32.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var notGlobal11 = sql32.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`);
var ts11 = (name) => timestamp39(name, { withTimezone: true });
var deals2 = playbookSchema2.table("deals", {
  id: text45("id").notNull(),
  organizationId: text45("organization_id").notNull(),
  dealId: text45("deal_id").notNull(),
  name: text45("name"),
  outcome: text45("outcome", { enum: DEAL_OUTCOMES2 }).notNull().default("open"),
  outcomeSeq: integer24("outcome_seq").notNull().default(0),
  retagThrough: integer24("retag_through").notNull().default(0),
  closedAt: date5("closed_at", { mode: "string" }),
  amount: numeric("amount", { precision: 17, scale: 2 }),
  currency: text45("currency"),
  appearedInImport: boolean15("appeared_in_import").notNull().default(false),
  createdAt: ts11("created_at").notNull().defaultNow(),
  updatedAt: ts11("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey16({ name: "deals_pkey", columns: [t.organizationId, t.id] }),
  check27("deals_id_shape", idShape12("id", "deal")),
  check27("deals_organization_id_shape", idShape12("organization_id", "org")),
  check27("deals_organization_not_global", notGlobal11),
  check27("deals_deal_id_shape", sql32`char_length(${t.dealId}) between 1 and ${sql32.raw(String(DEAL_ID_MAX_LENGTH2))}
        and octet_length(${t.dealId}) <= ${sql32.raw(String(DEAL_ID_MAX_BYTES2))}
        and ${t.dealId} = btrim(${t.dealId}, E' \\t\\n\\r\\f\\v')`),
  check27("deals_name_shape", sql32`${t.name} is null or (char_length(${t.name}) between 1 and ${sql32.raw(String(DEAL_NAME_MAX_LENGTH2))}
        and octet_length(${t.name}) <= ${sql32.raw(String(DEAL_NAME_MAX_BYTES2))})`),
  check27("deals_outcome_known", sql32`${t.outcome} in (${list13(DEAL_OUTCOMES2)})`),
  check27("deals_outcome_seq_range", sql32`${t.outcomeSeq} between 0 and ${sql32.raw(String(DEAL_MAX_SEQ2))}`),
  check27("deals_amount_range", sql32`${t.amount} is null or ${t.amount} >= 0`),
  check27("deals_currency_shape", sql32`${t.currency} is null or ${t.currency} ~ '^[A-Z]{3}$'`),
  check27("deals_amount_has_currency", sql32`${t.amount} is null or ${t.currency} is not null`),
  check27("deals_retag_through_range", sql32`${t.retagThrough} between 0 and ${t.outcomeSeq}`),
  uniqueIndex14("deals_deal_id_key").on(t.organizationId, t.dealId),
  index37("deals_retag_idx").on(t.organizationId, t.id).where(sql32`${t.retagThrough} < ${t.outcomeSeq}`),
  index37("deals_list_idx").on(t.organizationId, t.createdAt, t.id),
  index37("deals_outcome_list_idx").on(t.organizationId, t.outcome, t.createdAt, t.id),
  index37("deals_import_list_idx").on(t.organizationId, t.appearedInImport, t.createdAt, t.id)
]);
var dealImports2 = playbookSchema2.table("deal_imports", {
  id: text45("id").notNull(),
  organizationId: text45("organization_id").notNull(),
  state: text45("state", { enum: DEAL_IMPORT_STATES2 }).notNull().default("uploaded"),
  failureReason: text45("failure_reason", { enum: DEAL_IMPORT_FAILURE_REASONS2 }),
  uploadedBy: text45("uploaded_by").notNull(),
  objectKey: text45("object_key").notNull(),
  sizeBytes: bigint10("size_bytes", { mode: "number" }).notNull(),
  attempts: integer24("attempts").notNull().default(0),
  nextAttemptAt: ts11("next_attempt_at").notNull().defaultNow(),
  claimToken: uuid24("claim_token"),
  rowCount: integer24("row_count"),
  appliedCount: integer24("applied_count").notNull().default(0),
  rejectedCount: integer24("rejected_count").notNull().default(0),
  reportThrough: integer24("report_through").notNull().default(1),
  objectRemovedAt: ts11("object_removed_at"),
  erasedAt: ts11("erased_at"),
  finishedAt: ts11("finished_at"),
  createdAt: ts11("created_at").notNull().defaultNow(),
  updatedAt: ts11("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey16({ name: "deal_imports_pkey", columns: [t.organizationId, t.id] }),
  check27("deal_imports_id_shape", idShape12("id", "dimp")),
  check27("deal_imports_organization_id_shape", idShape12("organization_id", "org")),
  check27("deal_imports_organization_not_global", notGlobal11),
  check27("deal_imports_uploaded_by_shape", idShape12("uploaded_by", "usr")),
  check27("deal_imports_state_known", sql32`${t.state} in (${list13(DEAL_IMPORT_STATES2)})`),
  check27("deal_imports_failure_reason_known", sql32`${t.failureReason} is null or ${t.failureReason} in (${list13(DEAL_IMPORT_FAILURE_REASONS2)})`),
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
  index37("deal_imports_list_idx").on(t.organizationId, t.createdAt, t.id),
  index37("deal_imports_due_idx").on(t.organizationId, t.nextAttemptAt).where(sql32`${t.state} in ('uploaded', 'processing')`),
  index37("deal_imports_erased_idx").on(t.organizationId, t.id).where(sql32`${t.erasedAt} is not null`),
  index37("deal_imports_unerased_idx").on(t.organizationId, t.id).where(sql32`${t.erasedAt} is null`)
]);
var dealImportRows2 = playbookSchema2.table("deal_import_rows", {
  organizationId: text45("organization_id").notNull(),
  importId: text45("import_id").notNull(),
  rowNumber: integer24("row_number").notNull(),
  dealId: text45("deal_id"),
  result: text45("result", { enum: DEAL_IMPORT_ROW_RESULTS2 }).notNull(),
  reason: text45("reason", { enum: DEAL_IMPORT_ROW_REASONS2 })
}, (t) => [
  primaryKey16({
    name: "deal_import_rows_pkey",
    columns: [t.organizationId, t.importId, t.rowNumber]
  }),
  foreignKey15({
    name: "deal_import_rows_import_fkey",
    columns: [t.organizationId, t.importId],
    foreignColumns: [dealImports2.organizationId, dealImports2.id]
  }),
  check27("deal_import_rows_organization_id_shape", idShape12("organization_id", "org")),
  check27("deal_import_rows_organization_not_global", notGlobal11),
  check27("deal_import_rows_row_number_range", sql32`${t.rowNumber} between 2 and ${sql32.raw(String(DEAL_IMPORT_MAX_ROWS2 + 1))}`),
  check27("deal_import_rows_result_known", sql32`${t.result} in (${list13(DEAL_IMPORT_ROW_RESULTS2)})`),
  check27("deal_import_rows_reason_known", sql32`${t.reason} is null or ${t.reason} in (${list13(DEAL_IMPORT_ROW_REASONS2)})`),
  check27("deal_import_rows_reason_matches_result", sql32`(${t.result} = 'rejected') = (${t.reason} is not null)`),
  check27("deal_import_rows_deal_id_shape", sql32`${t.dealId} is null or (char_length(${t.dealId}) between 1 and ${sql32.raw(String(DEAL_ID_MAX_LENGTH2))}
        and octet_length(${t.dealId}) <= ${sql32.raw(String(DEAL_ID_MAX_BYTES2))})`),
  check27("deal_import_rows_deal_id_missing_only_when_unusable", sql32`${t.dealId} is not null or ${t.reason} in (${list13(DEAL_IMPORT_ROW_REASONS_WITHOUT_DEAL_ID2)})`),
  uniqueIndex14("deal_import_rows_first_key").on(t.organizationId, t.importId, t.dealId).where(sql32`${t.dealId} is not null and ${t.reason} is distinct from 'duplicate_in_file'`),
  index37("deal_import_rows_result_idx").on(t.organizationId, t.importId, t.result, t.rowNumber)
]);
var rightsConfirmations2 = playbookSchema2.table("rights_confirmations", {
  organizationId: text45("organization_id").primaryKey(),
  confirmedBy: text45("confirmed_by").notNull(),
  confirmedAt: ts11("confirmed_at").notNull().defaultNow(),
  wordingVersion: integer24("wording_version").notNull()
}, (t) => [
  check27("rights_confirmations_organization_id_shape", idShape12("organization_id", "org")),
  check27("rights_confirmations_organization_not_global", notGlobal11),
  check27("rights_confirmations_confirmed_by_shape", idShape12("confirmed_by", "usr")),
  check27("rights_confirmations_wording_version_range", sql32`${t.wordingVersion} between 1 and ${sql32.raw(String(RIGHTS_MAX_WORDING_VERSION2))}`)
]);

// src/schema/voice-tables.ts
var LINE_STATES2 = ["porting", "active", "released"];
var LINE_ASSIGNMENT_KINDS2 = ["unassigned", "team", "rep", "role"];
var LINE_ASSIGNMENT_ROLES2 = ["owner", "admin", "manager", "rep"];
var DEFAULT_LINE_CONCURRENT_AGENT_CALLS2 = 3;
var DEFAULT_LINE_DAILY_AGENT_DIAL_CAP2 = 150;
var MAX_LINE_CONCURRENT_AGENT_CALLS2 = 50;
var MAX_LINE_DAILY_AGENT_DIAL_CAP2 = 1000;
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
var CALL_END_REASONS2 = [
  "duration_cap",
  "cost_cap",
  "agent_ended",
  "prospect_hung_up",
  "rep_ended"
];
var VOICE_TRANSCRIPT_STATES2 = ["pending", "ready", "deleted"];
var VOICE_TRANSCRIPT_UNAVAILABLE_REASONS2 = [
  "speech_to_text_failed",
  "stream_dropped"
];
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
var list14 = (values) => sql33.raw(values.map((v) => `'${v}'`).join(", "));
var num5 = (value) => sql33.raw(String(value));
var idShape13 = (column, prefix) => sql33.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape10 = sql33.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal12 = sql33.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts12 = (name) => timestamp40(name, { withTimezone: true });
var voiceLines2 = voiceSchema2.table("lines", {
  id: text46("id").notNull(),
  organizationId: text46("organization_id").notNull(),
  number: text46("number").notNull(),
  country: text46("country").notNull(),
  label: text46("label"),
  state: text46("state", { enum: LINE_STATES2 }).notNull(),
  assignmentKind: text46("assignment_kind", { enum: LINE_ASSIGNMENT_KINDS2 }).notNull().default("unassigned"),
  assignmentTeamId: text46("assignment_team_id"),
  assignmentMembershipId: text46("assignment_membership_id"),
  assignmentRole: text46("assignment_role", { enum: LINE_ASSIGNMENT_ROLES2 }),
  providerSid: text46("provider_sid"),
  maxConcurrentAgentCalls: smallint7("max_concurrent_agent_calls").notNull().default(DEFAULT_LINE_CONCURRENT_AGENT_CALLS2),
  dailyAgentDialCap: integer25("daily_agent_dial_cap").notNull().default(DEFAULT_LINE_DAILY_AGENT_DIAL_CAP2),
  createdAt: ts12("created_at").notNull().defaultNow(),
  releasedAt: ts12("released_at")
}, (t) => [
  primaryKey17({ name: "lines_pkey", columns: [t.organizationId, t.id] }),
  check28("lines_id_shape", idShape13("id", "line")),
  check28("lines_organization_id_shape", orgShape10),
  check28("lines_organization_not_global", notGlobal12),
  check28("lines_number_shape", sql33`${t.number} ~ '${sql33.raw(IDENTITY_VALUE_PATTERNS2.phone)}'`),
  check28("lines_country_shape", sql33`${t.country} ~ '^[A-Z]{2}$'`),
  check28("lines_label_shape", sql33`${t.label} is null or char_length(${t.label}) between 1 and ${num5(MAX_LINE_LABEL_LENGTH2)}`),
  check28("lines_state_known", sql33`${t.state} in (${list14(LINE_STATES2)})`),
  check28("lines_assignment_kind_known", sql33`${t.assignmentKind} in (${list14(LINE_ASSIGNMENT_KINDS2)})`),
  check28("lines_assignment_team_id_shape", idShape13("assignment_team_id", "team")),
  check28("lines_assignment_membership_id_shape", idShape13("assignment_membership_id", "mem")),
  check28("lines_assignment_matches_kind", sql33`(${t.assignmentKind} = 'team') = (${t.assignmentTeamId} is not null)
        and (${t.assignmentKind} = 'rep') = (${t.assignmentMembershipId} is not null)
        and (${t.assignmentKind} = 'role') = (${t.assignmentRole} is not null)`),
  check28("lines_assignment_role_known", sql33`${t.assignmentRole} is null or ${t.assignmentRole} in (${list14(LINE_ASSIGNMENT_ROLES2)})`),
  check28("lines_provider_sid_shape", sql33`${t.providerSid} is null or char_length(${t.providerSid}) between 1 and 64`),
  check28("lines_agent_call_caps_range", sql33`${t.maxConcurrentAgentCalls} between 1 and ${num5(MAX_LINE_CONCURRENT_AGENT_CALLS2)}
        and ${t.dailyAgentDialCap} between 1 and ${num5(MAX_LINE_DAILY_AGENT_DIAL_CAP2)}`),
  check28("lines_released_at", sql33`(${t.state} = 'released') = (${t.releasedAt} is not null)`),
  check28("lines_released_unassigned", sql33`${t.state} <> 'released' or ${t.assignmentKind} = 'unassigned'`),
  uniqueIndex15("lines_number_live_key").on(t.number).where(sql33`${t.state} <> 'released'`),
  uniqueIndex15("lines_provider_sid_key").on(t.organizationId, t.providerSid).where(sql33`${t.providerSid} is not null`),
  index38("lines_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index38("lines_state_list_idx").on(t.organizationId, t.state, t.createdAt.desc(), t.id.desc()),
  index38("lines_team_idx").on(t.organizationId, t.assignmentTeamId).where(sql33`${t.assignmentTeamId} is not null`),
  index38("lines_rep_idx").on(t.organizationId, t.assignmentMembershipId).where(sql33`${t.assignmentMembershipId} is not null`),
  index38("lines_role_idx").on(t.organizationId, t.assignmentRole).where(sql33`${t.assignmentRole} is not null`)
]);
var voiceLineDirectory2 = voiceSchema2.table("line_directory", {
  number: text46("number").primaryKey(),
  organizationId: text46("organization_id").notNull(),
  lineId: text46("line_id").notNull(),
  state: text46("state", { enum: LINE_STATES2 }).notNull()
}, (t) => [
  check28("line_directory_number_shape", sql33`${t.number} ~ '${sql33.raw(IDENTITY_VALUE_PATTERNS2.phone)}'`),
  check28("line_directory_organization_id_shape", orgShape10),
  check28("line_directory_organization_not_global", notGlobal12),
  check28("line_directory_line_id_shape", idShape13("line_id", "line")),
  check28("line_directory_state_known", sql33`${t.state} in ('porting', 'active')`)
]);
var voiceCalls2 = voiceSchema2.table("calls", {
  id: text46("id").notNull(),
  organizationId: text46("organization_id").notNull(),
  direction: text46("direction", { enum: VOICE_CALL_DIRECTIONS2 }).notNull(),
  state: text46("state", { enum: VOICE_CALL_STATES2 }).notNull(),
  lineId: text46("line_id").notNull(),
  repMembershipId: text46("rep_membership_id"),
  prospectId: text46("prospect_id"),
  prospectNumber: text46("prospect_number").notNull(),
  providerCallSid: text46("provider_call_sid"),
  idempotencyKey: text46("idempotency_key"),
  requestFingerprint: text46("request_fingerprint"),
  disclosureWordingVersion: integer25("disclosure_wording_version"),
  disclosurePlayedAt: ts12("disclosure_played_at"),
  aiAssisted: boolean16("ai_assisted").notNull().default(false),
  copilot: boolean16("copilot").notNull().default(false),
  createdAt: ts12("created_at").notNull().defaultNow(),
  answeredAt: ts12("answered_at"),
  endedAt: ts12("ended_at"),
  durationSeconds: integer25("duration_seconds"),
  endedBy: text46("ended_by", { enum: VOICE_CALL_ENDED_BY2 }),
  failureReason: text46("failure_reason", { enum: VOICE_CALL_FAILURE_REASONS2 }),
  endReason: text46("end_reason", { enum: CALL_END_REASONS2 }),
  agentCostMicroCents: bigint11("agent_cost_micro_cents", { mode: "number" }).notNull().default(0),
  dealId: text46("deal_id"),
  note: text46("note"),
  transcriptState: text46("transcript_state", { enum: VOICE_TRANSCRIPT_STATES2 }).notNull().default("pending"),
  transcriptUnavailable: text46("transcript_unavailable", {
    enum: VOICE_TRANSCRIPT_UNAVAILABLE_REASONS2
  }),
  updatedAt: ts12("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey17({ name: "calls_pkey", columns: [t.organizationId, t.id] }),
  check28("calls_id_shape", idShape13("id", "call")),
  check28("calls_organization_id_shape", orgShape10),
  check28("calls_organization_not_global", notGlobal12),
  check28("calls_line_id_shape", idShape13("line_id", "line")),
  check28("calls_rep_membership_id_shape", idShape13("rep_membership_id", "mem")),
  check28("calls_prospect_id_shape", idShape13("prospect_id", "prs")),
  check28("calls_prospect_number_shape", sql33`${t.prospectNumber} ~ '${sql33.raw(IDENTITY_VALUE_PATTERNS2.phone)}'`),
  check28("calls_direction_known", sql33`${t.direction} in (${list14(VOICE_CALL_DIRECTIONS2)})`),
  check28("calls_state_known", sql33`${t.state} in (${list14(VOICE_CALL_STATES2)})`),
  check28("calls_ended_by_known", sql33`${t.endedBy} is null or ${t.endedBy} in (${list14(VOICE_CALL_ENDED_BY2)})`),
  check28("calls_failure_reason_known", sql33`${t.failureReason} is null or ${t.failureReason} in (${list14(VOICE_CALL_FAILURE_REASONS2)})`),
  check28("calls_transcript_unavailable_known", sql33`${t.transcriptUnavailable} is null or ${t.transcriptUnavailable} in (${list14(VOICE_TRANSCRIPT_UNAVAILABLE_REASONS2)})`),
  check28("calls_transcript_state_known", sql33`${t.transcriptState} in (${list14(VOICE_TRANSCRIPT_STATES2)})`),
  check28("calls_provider_call_sid_shape", sql33`${t.providerCallSid} is null or char_length(${t.providerCallSid}) between 1 and 64`),
  check28("calls_idempotency_shape", sql33`(${t.idempotencyKey} is null) = (${t.requestFingerprint} is null)
        and (${t.idempotencyKey} is null or char_length(${t.idempotencyKey}) between 1 and ${num5(MAX_VOICE_IDEMPOTENCY_KEY_LENGTH2)})
        and (${t.requestFingerprint} is null or ${t.requestFingerprint} ~ '^[0-9a-f]{64}$')`),
  check28("calls_disclosure_all_or_none", sql33`(${t.disclosureWordingVersion} is null) = (${t.disclosurePlayedAt} is null)
        and (${t.disclosureWordingVersion} is null or ${t.disclosureWordingVersion} >= 1)`),
  check28("calls_live_has_disclosure", sql33`${t.state} not in ('live', 'ended') or ${t.disclosurePlayedAt} is not null`),
  check28("calls_failed_has_reason", sql33`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check28("calls_disclosure_failure", sql33`${t.failureReason} is distinct from 'disclosure_failed' or ${t.disclosurePlayedAt} is null`),
  check28("calls_final_has_end", sql33`(${t.state} in (${list14(VOICE_CALL_FINAL_STATES2)})) = (${t.endedAt} is not null)`),
  check28("calls_answered", sql33`(${t.state} in ('live', 'ended')) = (${t.answeredAt} is not null)`),
  check28("calls_duration", sql33`(${t.state} = 'ended') = (${t.durationSeconds} is not null)`),
  check28("calls_duration_bounds", sql33`${t.durationSeconds} is null or ${t.durationSeconds} between 0 and ${num5(MAX_CALL_DURATION_SECONDS2)}`),
  check28("calls_ended_by_final", sql33`${t.endedBy} is null or ${t.state} in (${list14(VOICE_CALL_FINAL_STATES2)})`),
  check28("calls_end_reason_known", sql33`${t.endReason} is null or ${t.endReason} in (${list14(CALL_END_REASONS2)})`),
  check28("calls_end_reason_ended", sql33`${t.endReason} is null or ${t.state} = 'ended'`),
  check28("calls_agent_cost_non_negative", sql33`${t.agentCostMicroCents} >= 0`),
  check28("calls_times_ordered", sql33`(${t.answeredAt} is null or ${t.answeredAt} >= ${t.createdAt})
        and (${t.endedAt} is null or ${t.endedAt} >= ${t.createdAt})
        and (${t.answeredAt} is null or ${t.endedAt} is null or ${t.endedAt} >= ${t.answeredAt})`),
  check28("calls_wrap_up_only_ended", sql33`${t.state} = 'ended' or (${t.dealId} is null and ${t.note} is null)`),
  check28("calls_deal_id_shape", sql33`${t.dealId} is null or (char_length(${t.dealId}) between 1 and ${num5(DEAL_ID_MAX_LENGTH2)}
        and octet_length(${t.dealId}) <= ${num5(DEAL_ID_MAX_BYTES2)}
        and ${t.dealId} = btrim(${t.dealId}, E' \\t\\n\\r\\f\\v'))`),
  check28("calls_note_shape", sql33`${t.note} is null or char_length(${t.note}) between 1 and ${num5(MAX_WRAP_UP_NOTE_LENGTH2)}`),
  foreignKey16({
    name: "calls_line_fk",
    columns: [t.organizationId, t.lineId],
    foreignColumns: [voiceLines2.organizationId, voiceLines2.id]
  }),
  uniqueIndex15("calls_provider_call_sid_key").on(t.organizationId, t.providerCallSid).where(sql33`${t.providerCallSid} is not null`),
  uniqueIndex15("calls_idempotency_key_key").on(t.organizationId, t.idempotencyKey).where(sql33`${t.idempotencyKey} is not null`),
  index38("calls_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index38("calls_rep_list_idx").on(t.organizationId, t.repMembershipId, t.createdAt.desc(), t.id.desc()).where(sql33`${t.repMembershipId} is not null`),
  index38("calls_state_list_idx").on(t.organizationId, t.state, t.createdAt.desc(), t.id.desc()),
  index38("calls_stale_ringing_idx").on(t.createdAt, t.organizationId).where(sql33`${t.state} = 'ringing' and ${t.direction} = 'inbound'`),
  index38("calls_stale_outbound_idx").on(t.createdAt, t.organizationId).where(sql33`${t.direction} = 'outbound' and ${t.state} in ('ringing', 'connecting')`),
  index38("calls_prospect_list_idx").on(t.organizationId, t.prospectId, t.createdAt.desc(), t.id.desc()).where(sql33`${t.prospectId} is not null`),
  index38("calls_line_list_idx").on(t.organizationId, t.lineId, t.createdAt.desc(), t.id.desc())
]);
var voiceCallEvents2 = voiceSchema2.table("call_events", {
  id: text46("id").notNull(),
  organizationId: text46("organization_id").notNull(),
  seq: bigint11("seq", { mode: "number" }).generatedAlwaysAsIdentity().notNull(),
  callId: text46("call_id").notNull(),
  kind: text46("kind", { enum: VOICE_CALL_EVENT_KINDS2 }).notNull(),
  fromState: text46("from_state", { enum: VOICE_CALL_STATES2 }),
  toState: text46("to_state", { enum: VOICE_CALL_STATES2 }),
  providerEventId: text46("provider_event_id"),
  occurredAt: ts12("occurred_at").notNull(),
  recordedAt: ts12("recorded_at").notNull().defaultNow()
}, (t) => [
  primaryKey17({ name: "call_events_pkey", columns: [t.organizationId, t.id] }),
  check28("call_events_id_shape", idShape13("id", "vev")),
  check28("call_events_organization_id_shape", orgShape10),
  check28("call_events_organization_not_global", notGlobal12),
  check28("call_events_call_id_shape", idShape13("call_id", "call")),
  check28("call_events_kind_known", sql33`${t.kind} in (${list14(VOICE_CALL_EVENT_KINDS2)})`),
  check28("call_events_from_state_known", sql33`${t.fromState} is null or ${t.fromState} in (${list14(VOICE_CALL_STATES2)})`),
  check28("call_events_to_state_known", sql33`${t.toState} is null or ${t.toState} in (${list14(VOICE_CALL_STATES2)})`),
  check28("call_events_state_change", sql33`(${t.kind} = 'state_changed') = (${t.toState} is not null)
        and (${t.fromState} is null or ${t.toState} is not null)`),
  check28("call_events_provider_event_id_shape", sql33`${t.providerEventId} is null or char_length(${t.providerEventId}) between 1 and ${num5(MAX_PROVIDER_EVENT_ID_LENGTH2)}`),
  foreignKey16({
    name: "call_events_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [voiceCalls2.organizationId, voiceCalls2.id]
  }).onDelete("cascade"),
  uniqueIndex15("call_events_provider_event_key").on(t.organizationId, t.providerEventId),
  index38("call_events_call_idx").on(t.organizationId, t.callId, t.seq)
]);
var voiceRecordings2 = voiceSchema2.table("recordings", {
  id: text46("id").notNull(),
  organizationId: text46("organization_id").notNull(),
  callId: text46("call_id").notNull(),
  storageKey: text46("storage_key").notNull(),
  sizeBytes: bigint11("size_bytes", { mode: "number" }),
  channels: smallint7("channels").notNull(),
  state: text46("state", { enum: VOICE_RECORDING_STATES2 }).notNull().default("storing"),
  createdAt: ts12("created_at").notNull().defaultNow(),
  storedAt: ts12("stored_at"),
  deletedAt: ts12("deleted_at"),
  purgeDueAt: ts12("purge_due_at"),
  updatedAt: ts12("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey17({ name: "recordings_pkey", columns: [t.organizationId, t.id] }),
  check28("recordings_id_shape", idShape13("id", "rec")),
  check28("recordings_organization_id_shape", orgShape10),
  check28("recordings_organization_not_global", notGlobal12),
  check28("recordings_call_id_shape", idShape13("call_id", "call")),
  check28("recordings_storage_key_shape", sql33`char_length(${t.storageKey}) between 1 and ${num5(MAX_RECORDING_KEY_LENGTH2)}
        and ${t.storageKey} collate "C" ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]*$'`),
  check28("recordings_channels_known", sql33`${t.channels} in (1, 2)`),
  check28("recordings_state_known", sql33`${t.state} in (${list14(VOICE_RECORDING_STATES2)})`),
  check28("recordings_size_bounds", sql33`${t.sizeBytes} is null or ${t.sizeBytes} >= 0`),
  check28("recordings_stored", sql33`(${t.state} <> 'storing' or (${t.storedAt} is null and ${t.sizeBytes} is null)) and (${t.state} <> 'stored' or (${t.storedAt} is not null and ${t.sizeBytes} is not null))`),
  check28("recordings_deleted", sql33`(${t.state} = 'deleted') = (${t.deletedAt} is not null)`),
  check28("recordings_purge_only_deleted", sql33`${t.purgeDueAt} is null or ${t.state} = 'deleted'`),
  foreignKey16({
    name: "recordings_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [voiceCalls2.organizationId, voiceCalls2.id]
  }).onDelete("cascade"),
  uniqueIndex15("recordings_call_key").on(t.organizationId, t.callId),
  uniqueIndex15("recordings_storage_key_key").on(t.organizationId, t.storageKey),
  index38("recordings_purge_idx").on(t.organizationId, t.purgeDueAt).where(sql33`${t.state} = 'deleted' and ${t.purgeDueAt} is not null`)
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
var list15 = (values) => sql34.raw(values.map((v) => `'${v}'`).join(", "));
var num6 = (value) => sql34.raw(String(value));
var idShape14 = (column, prefix) => sql34.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape11 = sql34.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal13 = sql34.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts13 = (name) => timestamp41(name, { withTimezone: true });
var SOURCE_URL = String.raw`^https?://[^\s]+$`;
var IDEMPOTENCY_KEY = "^[A-Za-z0-9_.:-]+$";
var bytes11 = customType12({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var voiceChats2 = voiceSchema2.table("chats", {
  id: text47("id").notNull(),
  organizationId: text47("organization_id").notNull(),
  state: text47("state", { enum: CHAT_STATES2 }).notNull().default("open"),
  prospectId: text47("prospect_id"),
  inquiryId: text47("inquiry_id"),
  sessionTokenHash: bytes11("session_token_hash").notNull(),
  sourceUrl: text47("source_url").notNull(),
  startedAt: ts13("started_at").notNull().defaultNow(),
  lastMessageAt: ts13("last_message_at").notNull().defaultNow(),
  expiresAt: ts13("expires_at").notNull(),
  closedAt: ts13("closed_at")
}, (t) => [
  primaryKey18({ name: "chats_pkey", columns: [t.organizationId, t.id] }),
  check29("chats_id_shape", idShape14("id", "cht")),
  check29("chats_organization_id_shape", orgShape11),
  check29("chats_organization_not_global", notGlobal13),
  check29("chats_state_known", sql34`${t.state} in (${list15(CHAT_STATES2)})`),
  check29("chats_prospect_id_shape", idShape14("prospect_id", "prs")),
  check29("chats_inquiry_id_shape", idShape14("inquiry_id", "inq")),
  check29("chats_session_token_hash_length", sql34`octet_length(${t.sessionTokenHash}) = ${num6(CHAT_TOKEN_HASH_BYTES2)}`),
  check29("chats_source_url_shape", sql34`char_length(${t.sourceUrl}) between 1 and ${num6(MAX_SOURCE_URL_LENGTH2)}
        and ${t.sourceUrl} ~ '${sql34.raw(SOURCE_URL)}'`),
  check29("chats_closed", sql34`(${t.state} = 'closed') = (${t.closedAt} is not null)`),
  check29("chats_times_in_order", sql34`${t.lastMessageAt} >= ${t.startedAt} and ${t.expiresAt} > ${t.startedAt}
        and (${t.closedAt} is null or ${t.closedAt} >= ${t.startedAt})`),
  uniqueIndex16("chats_session_token_key").on(t.organizationId, t.sessionTokenHash),
  index39("chats_list_idx").on(t.organizationId, t.startedAt.desc(), t.id.desc()),
  index39("chats_state_list_idx").on(t.organizationId, t.state, t.startedAt.desc(), t.id.desc()),
  index39("chats_prospect_idx").on(t.organizationId, t.prospectId).where(sql34`${t.prospectId} is not null`),
  index39("chats_expiry_idx").on(t.organizationId, t.expiresAt).where(sql34`${t.state} <> 'closed'`)
]);
var voiceInquiries2 = voiceSchema2.table("inquiries", {
  id: text47("id").notNull(),
  organizationId: text47("organization_id").notNull(),
  idempotencyKey: text47("idempotency_key").notNull(),
  source: text47("source", { enum: INQUIRY_SOURCES2 }).notNull(),
  prospectId: text47("prospect_id").notNull(),
  assignedToMembershipId: text47("assigned_to_membership_id"),
  chatId: text47("chat_id"),
  callId: text47("call_id"),
  consentWordingId: text47("consent_wording_id"),
  consentWordingVersion: integer26("consent_wording_version"),
  consentSourceUrl: text47("consent_source_url"),
  consentPhoneGranted: boolean17("consent_phone_granted"),
  callbackState: text47("callback_state", { enum: INQUIRY_CALLBACK_STATES2 }).notNull(),
  callbackSkipReason: text47("callback_skip_reason", { enum: INQUIRY_SKIP_REASONS2 }),
  callbackAttempts: smallint8("callback_attempts").notNull().default(0),
  callbackNextAttemptAt: ts13("callback_next_attempt_at"),
  callbackLastAttemptAt: ts13("callback_last_attempt_at"),
  qualificationSummary: text47("qualification_summary"),
  receivedAt: ts13("received_at").notNull().defaultNow(),
  updatedAt: ts13("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey18({ name: "inquiries_pkey", columns: [t.organizationId, t.id] }),
  check29("inquiries_id_shape", idShape14("id", "inq")),
  check29("inquiries_organization_id_shape", orgShape11),
  check29("inquiries_organization_not_global", notGlobal13),
  check29("inquiries_idempotency_key_shape", sql34`char_length(${t.idempotencyKey}) between ${num6(MIN_AGENT_IDEMPOTENCY_KEY_LENGTH2)} and ${num6(MAX_AGENT_IDEMPOTENCY_KEY_LENGTH2)}
        and ${t.idempotencyKey} collate "C" ~ '${sql34.raw(IDEMPOTENCY_KEY)}'`),
  check29("inquiries_source_known", sql34`${t.source} in (${list15(INQUIRY_SOURCES2)})`),
  check29("inquiries_prospect_id_shape", idShape14("prospect_id", "prs")),
  check29("inquiries_assigned_to_membership_id_shape", idShape14("assigned_to_membership_id", "mem")),
  check29("inquiries_chat_id_shape", idShape14("chat_id", "cht")),
  check29("inquiries_call_id_shape", idShape14("call_id", "call")),
  check29("inquiries_consent_wording_id_shape", idShape14("consent_wording_id", "cwd")),
  check29("inquiries_callback_state_known", sql34`${t.callbackState} in (${list15(INQUIRY_CALLBACK_STATES2)})`),
  check29("inquiries_callback_skip_reason_known", sql34`${t.callbackSkipReason} is null or ${t.callbackSkipReason} in (${list15(INQUIRY_SKIP_REASONS2)})`),
  check29("inquiries_callback_attempts_range", sql34`${t.callbackAttempts} between 0 and ${num6(MAX_CALLBACK_ATTEMPTS2)}`),
  check29("inquiries_consent_all_or_none", sql34`(${t.consentWordingId} is null) = (${t.consentWordingVersion} is null)
        and (${t.consentWordingId} is null) = (${t.consentSourceUrl} is null)
        and (${t.consentWordingId} is null) = (${t.consentPhoneGranted} is null)
        and (${t.consentWordingVersion} is null or ${t.consentWordingVersion} >= 1)
        and (${t.consentSourceUrl} is null or (char_length(${t.consentSourceUrl}) between 1 and ${num6(MAX_SOURCE_URL_LENGTH2)}
          and ${t.consentSourceUrl} ~ '${sql34.raw(SOURCE_URL)}'))`),
  check29("inquiries_form_has_consent", sql34`${t.source} <> 'form' or ${t.consentWordingId} is not null`),
  check29("inquiries_chat_link", sql34`(${t.source} = 'chat') = (${t.chatId} is not null)`),
  check29("inquiries_call_link", sql34`${t.source} <> 'call' or ${t.callId} is not null`),
  check29("inquiries_call_not_called_back", sql34`${t.source} <> 'call' or ${t.callbackState} = 'not_applicable'`),
  check29("inquiries_callback_needs_consent", sql34`${t.callbackState} in ('not_applicable', 'skipped') or ${t.consentWordingId} is not null`),
  check29("inquiries_dialled_has_phone_consent", sql34`${t.callbackState} in ('not_applicable', 'skipped') or ${t.consentPhoneGranted} is true`),
  check29("inquiries_skip_reason", sql34`(${t.callbackState} = 'skipped') = (${t.callbackSkipReason} is not null)`),
  check29("inquiries_next_attempt", sql34`${t.callbackNextAttemptAt} is null or ${t.callbackState} = 'no_answer'`),
  check29("inquiries_not_applicable_never_dialled", sql34`${t.callbackState} <> 'not_applicable' or (${t.callbackAttempts} = 0 and ${t.callbackLastAttemptAt} is null)`),
  check29("inquiries_summary_shape", sql34`${t.qualificationSummary} is null or char_length(${t.qualificationSummary}) between 1 and ${num6(MAX_QUALIFICATION_SUMMARY_LENGTH2)}`),
  foreignKey17({
    name: "inquiries_chat_fk",
    columns: [t.organizationId, t.chatId],
    foreignColumns: [voiceChats2.organizationId, voiceChats2.id]
  }),
  foreignKey17({
    name: "inquiries_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [voiceCalls2.organizationId, voiceCalls2.id]
  }),
  uniqueIndex16("inquiries_idempotency_key").on(t.organizationId, t.idempotencyKey),
  uniqueIndex16("inquiries_chat_key").on(t.organizationId, t.chatId).where(sql34`${t.chatId} is not null`),
  uniqueIndex16("inquiries_call_key").on(t.organizationId, t.callId).where(sql34`${t.callId} is not null`),
  index39("inquiries_list_idx").on(t.organizationId, t.receivedAt.desc(), t.id.desc()),
  index39("inquiries_source_list_idx").on(t.organizationId, t.source, t.receivedAt.desc(), t.id.desc()),
  index39("inquiries_callback_list_idx").on(t.organizationId, t.callbackState, t.receivedAt.desc(), t.id.desc()),
  index39("inquiries_prospect_idx").on(t.organizationId, t.prospectId, t.receivedAt.desc()),
  index39("inquiries_assignee_idx").on(t.organizationId, t.assignedToMembershipId, t.receivedAt.desc(), t.id.desc()).where(sql34`${t.assignedToMembershipId} is not null`),
  index39("inquiries_retry_idx").on(t.organizationId, t.callbackNextAttemptAt).where(sql34`${t.callbackState} = 'no_answer' and ${t.callbackNextAttemptAt} is not null`),
  index39("inquiries_pending_idx").on(t.organizationId, t.receivedAt).where(sql34`${t.callbackState} = 'pending'`)
]);
var voiceAgentSettings2 = voiceSchema2.table("agent_settings", {
  organizationId: text47("organization_id").notNull(),
  paused: boolean17("paused").notNull(),
  greeting: text47("greeting").notNull(),
  voiceStyle: text47("voice_style", { enum: AGENT_VOICE_STYLES2 }).notNull(),
  timeZone: text47("time_zone").notNull(),
  hours: jsonb19("hours").$type().notNull(),
  maxCallSeconds: integer26("max_call_seconds").notNull(),
  maxCostUsdCents: integer26("max_cost_usd_cents").notNull(),
  concurrencyCap: integer26("concurrency_cap").notNull(),
  updatedAt: ts13("updated_at").notNull().defaultNow(),
  updatedByMembershipId: text47("updated_by_membership_id")
}, (t) => [
  primaryKey18({ name: "agent_settings_pkey", columns: [t.organizationId] }),
  check29("agent_settings_organization_id_shape", orgShape11),
  check29("agent_settings_organization_not_global", notGlobal13),
  check29("agent_settings_greeting_shape", sql34`char_length(${t.greeting}) between 1 and ${num6(MAX_AGENT_GREETING_LENGTH2)}`),
  check29("agent_settings_voice_style_known", sql34`${t.voiceStyle} in (${list15(AGENT_VOICE_STYLES2)})`),
  check29("agent_settings_time_zone_shape", sql34`char_length(${t.timeZone}) between 1 and 64
        and ${t.timeZone} collate "C" ~ '^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+){0,2}$'`),
  check29("agent_settings_hours_shape", sql34`jsonb_typeof(${t.hours}) = 'array'
        and jsonb_array_length(${t.hours}) between 1 and ${num6(MAX_AGENT_HOURS_DAYS2)}
        and octet_length(${t.hours}::text) <= 4096`),
  check29("agent_settings_max_call_seconds_range", sql34`${t.maxCallSeconds} between 30 and ${num6(MAX_AGENT_CALL_SECONDS2)}`),
  check29("agent_settings_max_cost_range", sql34`${t.maxCostUsdCents} between 1 and ${num6(MAX_AGENT_CALL_COST_USD_CENTS2)}`),
  check29("agent_settings_concurrency_range", sql34`${t.concurrencyCap} between 1 and ${num6(MAX_AGENT_CONCURRENCY2)}`),
  check29("agent_settings_updated_by_membership_id_shape", idShape14("updated_by_membership_id", "mem"))
]);
var voiceQualificationQuestions2 = voiceSchema2.table("qualification_questions", {
  id: text47("id").notNull(),
  organizationId: text47("organization_id").notNull(),
  position: integer26("position").notNull(),
  prompt: text47("prompt").notNull(),
  kind: text47("kind", { enum: QUALIFICATION_QUESTION_KINDS2 }).notNull(),
  choices: jsonb19("choices").$type(),
  required: boolean17("required").notNull().default(false),
  skipWhen: jsonb19("skip_when").$type().notNull().default([]),
  createdAt: ts13("created_at").notNull().defaultNow(),
  updatedAt: ts13("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey18({ name: "qualification_questions_pkey", columns: [t.organizationId, t.id] }),
  check29("qualification_questions_id_shape", idShape14("id", "qst")),
  check29("qualification_questions_organization_id_shape", orgShape11),
  check29("qualification_questions_organization_not_global", notGlobal13),
  check29("qualification_questions_position_range", sql34`${t.position} between 1 and ${num6(MAX_QUALIFICATION_QUESTIONS2)}`),
  check29("qualification_questions_prompt_shape", sql34`char_length(${t.prompt}) between 1 and ${num6(MAX_QUESTION_PROMPT_LENGTH2)}`),
  check29("qualification_questions_kind_known", sql34`${t.kind} in (${list15(QUALIFICATION_QUESTION_KINDS2)})`),
  check29("qualification_questions_choices_match_kind", sql34`(${t.kind} = 'choice') = (${t.choices} is not null)
        and (${t.choices} is null or (jsonb_typeof(${t.choices}) = 'array'
          and jsonb_array_length(${t.choices}) between ${num6(MIN_QUESTION_CHOICES2)} and ${num6(MAX_QUESTION_CHOICES2)}
          and octet_length(${t.choices}::text) <= 8192))`),
  check29("qualification_questions_skip_when_shape", sql34`jsonb_typeof(${t.skipWhen}) = 'array'
        and jsonb_array_length(${t.skipWhen}) <= ${num6(MAX_SKIP_CONDITIONS2)}
        and octet_length(${t.skipWhen}::text) <= 4096`),
  index39("qualification_questions_order_idx").on(t.organizationId, t.position, t.id)
]);
var voiceQualificationAnswers2 = voiceSchema2.table("qualification_answers", {
  organizationId: text47("organization_id").notNull(),
  inquiryId: text47("inquiry_id").notNull(),
  questionId: text47("question_id").notNull(),
  value: jsonb19("value").$type(),
  skipped: boolean17("skipped").notNull().default(false),
  answeredAt: ts13("answered_at").notNull().defaultNow()
}, (t) => [
  primaryKey18({
    name: "qualification_answers_pkey",
    columns: [t.organizationId, t.inquiryId, t.questionId]
  }),
  check29("qualification_answers_organization_id_shape", orgShape11),
  check29("qualification_answers_organization_not_global", notGlobal13),
  check29("qualification_answers_inquiry_id_shape", idShape14("inquiry_id", "inq")),
  check29("qualification_answers_question_id_shape", idShape14("question_id", "qst")),
  check29("qualification_answers_value_shape", sql34`${t.value} is null or (jsonb_typeof(${t.value}) in ('string', 'number', 'boolean')
        and (jsonb_typeof(${t.value}) <> 'string'
          or char_length(${t.value} #>> '{}') between 1 and ${num6(MAX_ANSWER_LENGTH2)}))`),
  check29("qualification_answers_skipped_has_no_value", sql34`not ${t.skipped} or ${t.value} is null`),
  foreignKey17({
    name: "qualification_answers_inquiry_fk",
    columns: [t.organizationId, t.inquiryId],
    foreignColumns: [voiceInquiries2.organizationId, voiceInquiries2.id]
  }).onDelete("cascade")
]);
var voiceAgentTurns2 = voiceSchema2.table("agent_turns", {
  id: text47("id").notNull(),
  organizationId: text47("organization_id").notNull(),
  callId: text47("call_id"),
  chatId: text47("chat_id"),
  trySessionId: text47("try_session_id"),
  turnIndex: integer26("turn_index").notNull(),
  role: text47("role", { enum: AGENT_TURN_ROLES2 }).notNull(),
  text: text47("text").notNull(),
  deferred: boolean17("deferred").notNull().default(false),
  toolName: text47("tool_name", { enum: AGENT_TOOLS2 }),
  createdAt: ts13("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey18({ name: "agent_turns_pkey", columns: [t.organizationId, t.id] }),
  check29("agent_turns_id_shape", idShape14("id", "trn")),
  check29("agent_turns_organization_id_shape", orgShape11),
  check29("agent_turns_organization_not_global", notGlobal13),
  check29("agent_turns_call_id_shape", idShape14("call_id", "call")),
  check29("agent_turns_chat_id_shape", idShape14("chat_id", "cht")),
  check29("agent_turns_try_session_id_shape", idShape14("try_session_id", "try")),
  check29("agent_turns_one_conversation", sql34`num_nonnulls(${t.callId}, ${t.chatId}, ${t.trySessionId}) = 1`),
  check29("agent_turns_index_range", sql34`${t.turnIndex} >= 0`),
  check29("agent_turns_role_known", sql34`${t.role} in (${list15(AGENT_TURN_ROLES2)})`),
  check29("agent_turns_text_shape", sql34`char_length(${t.text}) between 1 and ${num6(MAX_TURN_TEXT_LENGTH2)}`),
  check29("agent_turns_tool_known", sql34`${t.toolName} is null or ${t.toolName} in (${list15(AGENT_TOOLS2)})`),
  check29("agent_turns_only_agent_acts", sql34`${t.role} = 'agent' or (${t.toolName} is null and not ${t.deferred})`),
  foreignKey17({
    name: "agent_turns_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [voiceCalls2.organizationId, voiceCalls2.id]
  }).onDelete("cascade"),
  foreignKey17({
    name: "agent_turns_chat_fk",
    columns: [t.organizationId, t.chatId],
    foreignColumns: [voiceChats2.organizationId, voiceChats2.id]
  }).onDelete("cascade"),
  uniqueIndex16("agent_turns_call_index_key").on(t.organizationId, t.callId, t.turnIndex).where(sql34`${t.callId} is not null`),
  uniqueIndex16("agent_turns_chat_index_key").on(t.organizationId, t.chatId, t.turnIndex).where(sql34`${t.chatId} is not null`),
  uniqueIndex16("agent_turns_try_index_key").on(t.organizationId, t.trySessionId, t.turnIndex).where(sql34`${t.trySessionId} is not null`)
]);
var voiceAgentTurnSources2 = voiceSchema2.table("agent_turn_sources", {
  organizationId: text47("organization_id").notNull(),
  turnId: text47("turn_id").notNull(),
  position: smallint8("position").notNull(),
  documentId: text47("document_id").notNull(),
  page: integer26("page"),
  passage: text47("passage").notNull()
}, (t) => [
  primaryKey18({
    name: "agent_turn_sources_pkey",
    columns: [t.organizationId, t.turnId, t.position]
  }),
  check29("agent_turn_sources_organization_id_shape", orgShape11),
  check29("agent_turn_sources_organization_not_global", notGlobal13),
  check29("agent_turn_sources_turn_id_shape", idShape14("turn_id", "trn")),
  check29("agent_turn_sources_position_range", sql34`${t.position} between 0 and ${num6(MAX_TURN_SOURCES2 - 1)}`),
  check29("agent_turn_sources_document_id_shape", idShape14("document_id", "doc")),
  check29("agent_turn_sources_page_range", sql34`${t.page} is null or ${t.page} between 1 and ${num6(MAX_DOCUMENT_PAGES2)}`),
  check29("agent_turn_sources_passage_shape", sql34`char_length(${t.passage}) between 1 and ${num6(MAX_COPILOT_QUOTE_LENGTH2)}`),
  foreignKey17({
    name: "agent_turn_sources_turn_fk",
    columns: [t.organizationId, t.turnId],
    foreignColumns: [voiceAgentTurns2.organizationId, voiceAgentTurns2.id]
  }).onDelete("cascade")
]);
var voiceHandoffs2 = voiceSchema2.table("handoffs", {
  id: text47("id").notNull(),
  organizationId: text47("organization_id").notNull(),
  state: text47("state", { enum: HANDOFF_STATES2 }).notNull().default("pending"),
  channel: text47("channel", { enum: HANDOFF_CHANNELS2 }).notNull(),
  callId: text47("call_id"),
  chatId: text47("chat_id"),
  repMembershipId: text47("rep_membership_id"),
  attempt: smallint8("attempt").notNull().default(1),
  reason: text47("reason", { enum: HANDOFF_REASONS2 }).notNull(),
  result: text47("result", { enum: HANDOFF_RESULTS2 }),
  requestedAt: ts13("requested_at").notNull().defaultNow(),
  answeredAt: ts13("answered_at"),
  completedAt: ts13("completed_at"),
  updatedAt: ts13("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey18({ name: "handoffs_pkey", columns: [t.organizationId, t.id] }),
  check29("handoffs_id_shape", idShape14("id", "hof")),
  check29("handoffs_organization_id_shape", orgShape11),
  check29("handoffs_organization_not_global", notGlobal13),
  check29("handoffs_state_known", sql34`${t.state} in (${list15(HANDOFF_STATES2)})`),
  check29("handoffs_channel_known", sql34`${t.channel} in (${list15(HANDOFF_CHANNELS2)})`),
  check29("handoffs_reason_known", sql34`${t.reason} in (${list15(HANDOFF_REASONS2)})`),
  check29("handoffs_result_known", sql34`${t.result} is null or ${t.result} in (${list15(HANDOFF_RESULTS2)})`),
  check29("handoffs_call_id_shape", idShape14("call_id", "call")),
  check29("handoffs_chat_id_shape", idShape14("chat_id", "cht")),
  check29("handoffs_rep_membership_id_shape", idShape14("rep_membership_id", "mem")),
  check29("handoffs_channel_names_its_conversation", sql34`(${t.channel} = 'call' and ${t.callId} is not null and ${t.chatId} is null)
        or (${t.channel} = 'chat' and ${t.chatId} is not null and ${t.callId} is null)`),
  check29("handoffs_attempt_range", sql34`${t.attempt} between 1 and ${num6(MAX_HANDOFF_ATTEMPTS2)}`),
  check29("handoffs_rep_matches_state", sql34`(${t.state} = 'no_rep') = (${t.repMembershipId} is null)`),
  check29("handoffs_answered", sql34`${t.state} not in ('accepted', 'completed') or ${t.answeredAt} is not null`),
  check29("handoffs_completed", sql34`(${t.state} in ('completed', 'no_rep')) = (${t.completedAt} is not null)`),
  check29("handoffs_result_only_when_over", sql34`${t.result} is null or ${t.state} in ('completed', 'no_rep')`),
  check29("handoffs_times_in_order", sql34`(${t.answeredAt} is null or ${t.answeredAt} >= ${t.requestedAt})
        and (${t.completedAt} is null or ${t.completedAt} >= coalesce(${t.answeredAt}, ${t.requestedAt}))`),
  foreignKey17({
    name: "handoffs_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [voiceCalls2.organizationId, voiceCalls2.id]
  }),
  foreignKey17({
    name: "handoffs_chat_fk",
    columns: [t.organizationId, t.chatId],
    foreignColumns: [voiceChats2.organizationId, voiceChats2.id]
  }),
  uniqueIndex16("handoffs_call_live_key").on(t.organizationId, t.callId).where(sql34`${t.callId} is not null and ${t.state} in ('pending', 'accepted')`),
  uniqueIndex16("handoffs_chat_live_key").on(t.organizationId, t.chatId).where(sql34`${t.chatId} is not null and ${t.state} in ('pending', 'accepted')`),
  index39("handoffs_list_idx").on(t.organizationId, t.requestedAt.desc(), t.id.desc()),
  index39("handoffs_state_list_idx").on(t.organizationId, t.state, t.requestedAt.desc(), t.id.desc()),
  index39("handoffs_rep_pending_idx").on(t.organizationId, t.repMembershipId, t.requestedAt).where(sql34`${t.state} = 'pending'`),
  index39("handoffs_call_idx").on(t.organizationId, t.callId).where(sql34`${t.callId} is not null`),
  index39("handoffs_chat_idx").on(t.organizationId, t.chatId).where(sql34`${t.chatId} is not null`)
]);

// src/schema/voice-agent-calls.ts
var CALL_RESULTS2 = [
  "answered",
  "voicemail",
  "no_answer",
  "busy",
  "failed",
  "blocked"
];
var AGENT_CALL_END_REASONS2 = [
  "booked",
  "handed_off",
  "not_interested",
  "not_now",
  "opted_out",
  "prospect_hung_up",
  "cap_reached",
  "agent_ended"
];
var CALL_GATE_CODES2 = [
  "agent.paused",
  "consent.missing",
  "consent.withdrawn",
  "consent.suppressed",
  "consent.unavailable",
  "agent.timezone_unknown",
  "agent.outside_hours",
  "agent_call.attempts_exhausted",
  "agent_call.line_cap_reached"
];
var AGENT_CALL_SOURCES2 = ["campaign_step", "rep_request"];
var AGENT_CALL_STATES2 = ["queued", "dialing", "live", "ended"];
var MAX_CALL_ATTEMPTS2 = 3;
var AGENT_CALL_NUMBER_HASH_BYTES2 = 32;
var STEP_KEY_PATTERN = "^[a-z][a-z0-9_-]{0,63}$";
var bytea2 = customType13({ dataType: () => "bytea" });
var list16 = (values) => sql35.raw(values.map((v) => `'${v}'`).join(", "));
var num7 = (value) => sql35.raw(String(value));
var idShape15 = (column, prefix) => sql35.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape12 = sql35.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal14 = sql35.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts14 = (name) => timestamp42(name, { withTimezone: true });
var voiceAgentCalls2 = voiceSchema2.table("agent_calls", {
  id: text48("id").notNull(),
  organizationId: text48("organization_id").notNull(),
  idempotencyKey: text48("idempotency_key").notNull(),
  source: text48("source", { enum: AGENT_CALL_SOURCES2 }).notNull(),
  prospectId: text48("prospect_id").notNull(),
  lineId: text48("line_id"),
  enrollmentId: text48("enrollment_id"),
  stepKey: text48("step_key"),
  requestedByMembershipId: text48("requested_by_membership_id"),
  attempt: smallint9("attempt").notNull().default(1),
  state: text48("state", { enum: AGENT_CALL_STATES2 }).notNull(),
  result: text48("result", { enum: CALL_RESULTS2 }),
  endReason: text48("end_reason", { enum: AGENT_CALL_END_REASONS2 }),
  gateCode: text48("gate_code", { enum: CALL_GATE_CODES2 }),
  retryAt: ts14("retry_at"),
  callId: text48("call_id"),
  durationSeconds: integer27("duration_seconds"),
  numberHash: bytea2("number_hash"),
  createdAt: ts14("created_at").notNull().defaultNow(),
  dialedAt: ts14("dialed_at"),
  endedAt: ts14("ended_at")
}, (t) => [
  primaryKey19({ name: "agent_calls_pkey", columns: [t.organizationId, t.id] }),
  check30("agent_calls_id_shape", idShape15("id", "acl")),
  check30("agent_calls_organization_id_shape", orgShape12),
  check30("agent_calls_organization_not_global", notGlobal14),
  check30("agent_calls_idempotency_key_shape", sql35`char_length(${t.idempotencyKey}) between ${num7(MIN_AGENT_IDEMPOTENCY_KEY_LENGTH2)} and ${num7(MAX_AGENT_IDEMPOTENCY_KEY_LENGTH2)}`),
  check30("agent_calls_prospect_id_shape", idShape15("prospect_id", "prs")),
  check30("agent_calls_line_id_shape", idShape15("line_id", "line")),
  check30("agent_calls_enrollment_id_shape", idShape15("enrollment_id", "enr")),
  check30("agent_calls_step_key_shape", sql35`${t.stepKey} is null or ${t.stepKey} ~ '${sql35.raw(STEP_KEY_PATTERN)}'`),
  check30("agent_calls_requested_by_shape", idShape15("requested_by_membership_id", "mem")),
  check30("agent_calls_call_id_shape", idShape15("call_id", "call")),
  check30("agent_calls_source_known", sql35`${t.source} in (${list16(AGENT_CALL_SOURCES2)})`),
  check30("agent_calls_state_known", sql35`${t.state} in (${list16(AGENT_CALL_STATES2)})`),
  check30("agent_calls_result_known", sql35`${t.result} is null or ${t.result} in (${list16(CALL_RESULTS2)})`),
  check30("agent_calls_end_reason_known", sql35`${t.endReason} is null or ${t.endReason} in (${list16(AGENT_CALL_END_REASONS2)})`),
  check30("agent_calls_gate_code_known", sql35`${t.gateCode} is null or ${t.gateCode} in (${list16(CALL_GATE_CODES2)})`),
  check30("agent_calls_attempt_range", sql35`${t.attempt} between 1 and ${num7(MAX_CALL_ATTEMPTS2)}`),
  check30("agent_calls_duration_range", sql35`${t.durationSeconds} is null or ${t.durationSeconds} between 0 and ${num7(MAX_AGENT_CALL_SECONDS2)}`),
  check30("agent_calls_number_hash_length", sql35`${t.numberHash} is null or octet_length(${t.numberHash}) = ${num7(AGENT_CALL_NUMBER_HASH_BYTES2)}`),
  check30("agent_calls_result_iff_ended", sql35`(${t.state} = 'ended') = (${t.result} is not null)`),
  check30("agent_calls_ended_at_iff_ended", sql35`(${t.state} = 'ended') = (${t.endedAt} is not null)`),
  check30("agent_calls_end_reason_iff_answered", sql35`coalesce(${t.result} = 'answered', false) = (${t.endReason} is not null)`),
  check30("agent_calls_blocked_has_gate_code", sql35`${t.result} is distinct from 'blocked' or ${t.gateCode} is not null`),
  check30("agent_calls_gate_code_when_blocked_or_queued", sql35`${t.gateCode} is null or coalesce(${t.result} = 'blocked', false) or ${t.state} = 'queued'`),
  check30("agent_calls_retry_at_iff_queued", sql35`(${t.state} = 'queued') = (${t.retryAt} is not null)`),
  check30("agent_calls_live_has_call", sql35`${t.state} <> 'live' or ${t.callId} is not null`),
  check30("agent_calls_undialed_has_no_call", sql35`not (${t.state} = 'queued' or ${t.result} = 'blocked') or ${t.callId} is null`),
  check30("agent_calls_duration_needs_call", sql35`${t.durationSeconds} is null or ${t.callId} is not null`),
  check30("agent_calls_dialed_at_iff_dialed", sql35`(${t.dialedAt} is not null)
        = (${t.state} in ('dialing', 'live') or (${t.state} = 'ended' and ${t.result} <> 'blocked'))`),
  check30("agent_calls_dialed_has_line", sql35`${t.dialedAt} is null or ${t.lineId} is not null`),
  check30("agent_calls_dialed_has_number_hash", sql35`${t.dialedAt} is null or ${t.numberHash} is not null`),
  check30("agent_calls_source_shape", sql35`(${t.source} = 'campaign_step'
          and ${t.enrollmentId} is not null and ${t.stepKey} is not null
          and ${t.requestedByMembershipId} is null
          and ${t.idempotencyKey} = ${t.enrollmentId} || ':' || ${t.stepKey} || ':' || ${t.attempt}::text)
        or (${t.source} = 'rep_request'
          and ${t.enrollmentId} is null and ${t.stepKey} is null
          and ${t.requestedByMembershipId} is not null)`),
  check30("agent_calls_times_in_order", sql35`(${t.dialedAt} is null or ${t.dialedAt} >= ${t.createdAt})
        and (${t.endedAt} is null or ${t.endedAt} >= coalesce(${t.dialedAt}, ${t.createdAt}))`),
  uniqueIndex17("agent_calls_key").on(t.organizationId, t.idempotencyKey),
  uniqueIndex17("agent_calls_prospect_open_key").on(t.organizationId, t.prospectId).where(sql35`${t.state} in ('queued', 'dialing', 'live')`),
  index40("agent_calls_number_dials_idx").on(t.organizationId, t.numberHash, t.dialedAt.desc()).where(sql35`${t.dialedAt} is not null`),
  index40("agent_calls_line_dials_idx").on(t.organizationId, t.lineId, t.dialedAt.desc()).where(sql35`${t.dialedAt} is not null`),
  index40("agent_calls_line_open_idx").on(t.organizationId, t.lineId).where(sql35`${t.state} in ('dialing', 'live')`),
  index40("agent_calls_enrollment_idx").on(t.organizationId, t.enrollmentId, t.stepKey).where(sql35`${t.enrollmentId} is not null`),
  index40("agent_calls_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index40("agent_calls_prospect_idx").on(t.organizationId, t.prospectId, t.createdAt.desc(), t.id.desc())
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
  "call_result",
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
var list17 = (values) => sql36.raw(values.map((v) => `'${v}'`).join(", "));
var num8 = (value) => sql36.raw(String(value));
var idShape16 = (column, prefix) => sql36.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape13 = sql36.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal15 = sql36.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var KEY_SHAPE = `^[a-z][a-z0-9_-]{0,${MAX_STEP_KEY_LENGTH2 - 1}}$`;
var keyShape = (column) => sql36.raw(`"${column}" is null or "${column}" ~ '${KEY_SHAPE}'`);
var ts15 = (name) => timestamp43(name, { withTimezone: true });
var outboundPlays2 = outboundSchema2.table("plays", {
  id: text49("id").notNull(),
  organizationId: text49("organization_id").notNull(),
  name: text49("name").notNull(),
  intent: text49("intent", { enum: PLAY_INTENTS2 }).notNull(),
  goal: text49("goal").notNull(),
  source: text49("source", { enum: PLAY_SOURCES2 }).notNull(),
  status: text49("status", { enum: PLAY_STATUSES2 }).notNull().default("proposed"),
  steps: jsonb20("steps").notNull().default(sql36`'[]'::jsonb`),
  evidenceCount: integer28("evidence_count").notNull().default(0),
  createdByMembershipId: text49("created_by_membership_id"),
  createdAt: ts15("created_at").notNull().defaultNow(),
  updatedAt: ts15("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey20({ name: "plays_pkey", columns: [t.organizationId, t.id] }),
  check31("plays_id_shape", idShape16("id", "ply")),
  check31("plays_organization_id_shape", orgShape13),
  check31("plays_organization_not_global", notGlobal15),
  check31("plays_created_by_membership_id_shape", idShape16("created_by_membership_id", "mem")),
  check31("plays_name_shape", sql36`char_length(${t.name}) between 1 and ${num8(MAX_CAMPAIGN_NAME_LENGTH2)}`),
  check31("plays_goal_shape", sql36`char_length(${t.goal}) between 1 and ${num8(MAX_DRAFT_GOAL_LENGTH2)}`),
  check31("plays_intent_known", sql36`${t.intent} in (${list17(PLAY_INTENTS2)})`),
  check31("plays_source_known", sql36`${t.source} in (${list17(PLAY_SOURCES2)})`),
  check31("plays_status_known", sql36`${t.status} in (${list17(PLAY_STATUSES2)})`),
  check31("plays_steps_shape", sql36`jsonb_typeof(${t.steps}) = 'array' and jsonb_array_length(${t.steps}) <= ${num8(MAX_PLAY_STEPS2)}`),
  check31("plays_evidence_count_range", sql36`${t.evidenceCount} between 0 and ${num8(MAX_PLAY_EVIDENCE2)}`),
  index41("plays_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc())
]);
var outboundPlayCitations2 = outboundSchema2.table("play_citations", {
  organizationId: text49("organization_id").notNull(),
  playId: text49("play_id").notNull(),
  position: smallint10("position").notNull(),
  kind: text49("kind", { enum: PLAY_CITATION_KINDS2 }).notNull(),
  callId: text49("call_id"),
  dealRecordId: text49("deal_record_id"),
  documentId: text49("document_id"),
  page: integer28("page")
}, (t) => [
  primaryKey20({
    name: "play_citations_pkey",
    columns: [t.organizationId, t.playId, t.position]
  }),
  check31("play_citations_organization_id_shape", orgShape13),
  check31("play_citations_organization_not_global", notGlobal15),
  check31("play_citations_play_id_shape", idShape16("play_id", "ply")),
  check31("play_citations_call_id_shape", idShape16("call_id", "call")),
  check31("play_citations_deal_record_id_shape", idShape16("deal_record_id", "deal")),
  check31("play_citations_document_id_shape", idShape16("document_id", "doc")),
  check31("play_citations_position_range", sql36`${t.position} between 0 and ${num8(MAX_PLAY_CITATIONS2 - 1)}`),
  check31("play_citations_kind_known", sql36`${t.kind} in (${list17(PLAY_CITATION_KINDS2)})`),
  check31("play_citations_fields_match_kind", sql36`(${t.kind} = 'moment' and ${t.callId} is not null and ${t.dealRecordId} is not null
          and ${t.documentId} is null and ${t.page} is null)
        or (${t.kind} = 'document' and ${t.documentId} is not null
          and ${t.callId} is null and ${t.dealRecordId} is null
          and (${t.page} is null or ${t.page} >= 1))`),
  foreignKey18({
    name: "play_citations_play_fk",
    columns: [t.organizationId, t.playId],
    foreignColumns: [outboundPlays2.organizationId, outboundPlays2.id]
  }).onDelete("cascade")
]);
var outboundCampaigns2 = outboundSchema2.table("campaigns", {
  id: text49("id").notNull(),
  organizationId: text49("organization_id").notNull(),
  name: text49("name").notNull(),
  goal: text49("goal").notNull(),
  state: text49("state", { enum: CAMPAIGN_STATES2 }).notNull().default("draft"),
  audience: jsonb20("audience").notNull(),
  audienceVersion: integer28("audience_version").notNull().default(0),
  sequenceVersion: integer28("sequence_version").notNull().default(0),
  previewedVersion: integer28("previewed_version"),
  previewedAt: ts15("previewed_at"),
  approvalMode: text49("approval_mode", { enum: CAMPAIGN_APPROVAL_MODES2 }).notNull().default("review"),
  language: text49("language", { enum: OUTBOUND_LANGUAGES2 }).notNull().default("en"),
  sendWindow: jsonb20("send_window").notNull(),
  windowZone: text49("window_zone", { enum: WINDOW_ZONES2 }).notNull().default("campaign"),
  dailyCap: integer28("daily_cap").notNull(),
  ownerMembershipId: text49("owner_membership_id").notNull(),
  teamId: text49("team_id"),
  playId: text49("play_id"),
  createdAt: ts15("created_at").notNull().defaultNow(),
  updatedAt: ts15("updated_at").notNull().defaultNow(),
  launchedAt: ts15("launched_at"),
  archivedAt: ts15("archived_at")
}, (t) => [
  primaryKey20({ name: "campaigns_pkey", columns: [t.organizationId, t.id] }),
  check31("campaigns_id_shape", idShape16("id", "cpg")),
  check31("campaigns_organization_id_shape", orgShape13),
  check31("campaigns_organization_not_global", notGlobal15),
  check31("campaigns_owner_membership_id_shape", idShape16("owner_membership_id", "mem")),
  check31("campaigns_team_id_shape", idShape16("team_id", "team")),
  check31("campaigns_play_id_shape", idShape16("play_id", "ply")),
  check31("campaigns_name_shape", sql36`char_length(${t.name}) between 1 and ${num8(MAX_CAMPAIGN_NAME_LENGTH2)}`),
  check31("campaigns_goal_shape", sql36`char_length(${t.goal}) between 1 and ${num8(MAX_DRAFT_GOAL_LENGTH2)}`),
  check31("campaigns_state_known", sql36`${t.state} in (${list17(CAMPAIGN_STATES2)})`),
  check31("campaigns_approval_mode_known", sql36`${t.approvalMode} in (${list17(CAMPAIGN_APPROVAL_MODES2)})`),
  check31("campaigns_language_known", sql36`${t.language} in (${list17(OUTBOUND_LANGUAGES2)})`),
  check31("campaigns_window_zone_known", sql36`${t.windowZone} in (${list17(WINDOW_ZONES2)})`),
  check31("campaigns_audience_shape", sql36`jsonb_typeof(${t.audience}) = 'object'`),
  check31("campaigns_versions_range", sql36`${t.audienceVersion} between 0 and ${num8(MAX_CAMPAIGN_VERSION2)}
        and ${t.sequenceVersion} between 0 and ${num8(MAX_CAMPAIGN_VERSION2)}
        and (${t.previewedVersion} is null
          or ${t.previewedVersion} between 0 and ${num8(MAX_CAMPAIGN_VERSION2)})`),
  check31("campaigns_send_window_shape", sql36`jsonb_typeof(${t.sendWindow}) = 'object'
        and (${t.sendWindow}->>'startMinute')::int between 0 and 1439
        and (${t.sendWindow}->>'endMinute')::int between 1 and 1440
        and (${t.sendWindow}->>'endMinute')::int > (${t.sendWindow}->>'startMinute')::int`),
  check31("campaigns_daily_cap_range", sql36`${t.dailyCap} between 1 and ${num8(MAX_DAILY_CAP2)}`),
  check31("campaigns_archived_matches_state", sql36`(${t.state} = 'archived') = (${t.archivedAt} is not null)`),
  foreignKey18({
    name: "campaigns_play_fk",
    columns: [t.organizationId, t.playId],
    foreignColumns: [outboundPlays2.organizationId, outboundPlays2.id]
  }),
  index41("campaigns_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index41("campaigns_state_idx").on(t.organizationId, t.state, t.createdAt.desc(), t.id.desc())
]);
var outboundSequences2 = outboundSchema2.table("sequences", {
  organizationId: text49("organization_id").notNull(),
  campaignId: text49("campaign_id").notNull(),
  version: integer28("version").notNull(),
  createdByMembershipId: text49("created_by_membership_id"),
  createdAt: ts15("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey20({
    name: "sequences_pkey",
    columns: [t.organizationId, t.campaignId, t.version]
  }),
  check31("sequences_organization_id_shape", orgShape13),
  check31("sequences_organization_not_global", notGlobal15),
  check31("sequences_campaign_id_shape", idShape16("campaign_id", "cpg")),
  check31("sequences_created_by_membership_id_shape", idShape16("created_by_membership_id", "mem")),
  check31("sequences_version_range", sql36`${t.version} between 1 and ${num8(MAX_CAMPAIGN_VERSION2)}`),
  foreignKey18({
    name: "sequences_campaign_fk",
    columns: [t.organizationId, t.campaignId],
    foreignColumns: [outboundCampaigns2.organizationId, outboundCampaigns2.id]
  }).onDelete("cascade")
]);
var outboundSteps2 = outboundSchema2.table("steps", {
  organizationId: text49("organization_id").notNull(),
  campaignId: text49("campaign_id").notNull(),
  version: integer28("version").notNull(),
  position: smallint10("position").notNull(),
  key: text49("key").notNull(),
  kind: text49("kind", { enum: STEP_KINDS2 }).notNull(),
  goal: text49("goal"),
  nextKey: text49("next_key"),
  waitHours: integer28("wait_hours"),
  task: text49("task", { enum: STEP_TASKS2 }),
  instruction: text49("instruction"),
  dueInHours: integer28("due_in_hours"),
  arms: jsonb20("arms"),
  defaultNextKey: text49("default_next_key")
}, (t) => [
  primaryKey20({
    name: "steps_pkey",
    columns: [t.organizationId, t.campaignId, t.version, t.position]
  }),
  check31("steps_organization_id_shape", orgShape13),
  check31("steps_organization_not_global", notGlobal15),
  check31("steps_campaign_id_shape", idShape16("campaign_id", "cpg")),
  check31("steps_key_shape", sql36.raw(`"key" ~ '${KEY_SHAPE}'`)),
  check31("steps_next_key_shape", keyShape("next_key")),
  check31("steps_default_next_key_shape", keyShape("default_next_key")),
  check31("steps_position_range", sql36`${t.position} between 0 and ${num8(MAX_SEQUENCE_STEPS2 - 1)}`),
  check31("steps_kind_known", sql36`${t.kind} in (${list17(STEP_KINDS2)})`),
  check31("steps_fields_match_kind", sql36`(${t.kind} = 'email'
          and ${t.goal} is not null and char_length(${t.goal}) between 1 and ${num8(MAX_DRAFT_GOAL_LENGTH2)}
          and ${t.nextKey} is not null
          and ${t.waitHours} is null and ${t.task} is null and ${t.instruction} is null
          and ${t.dueInHours} is null and ${t.arms} is null and ${t.defaultNextKey} is null)
        or (${t.kind} = 'wait'
          and ${t.waitHours} is not null and ${t.waitHours} between 1 and ${num8(MAX_STEP_HOURS2)}
          and ${t.nextKey} is not null
          and ${t.goal} is null and ${t.task} is null and ${t.instruction} is null
          and ${t.dueInHours} is null and ${t.arms} is null and ${t.defaultNextKey} is null)
        or (${t.kind} = 'branch'
          and jsonb_typeof(${t.arms}) = 'array'
          and jsonb_array_length(${t.arms}) between 1 and ${num8(MAX_BRANCH_ARMS2)}
          and ${t.defaultNextKey} is not null
          and ${t.goal} is null and ${t.nextKey} is null and ${t.waitHours} is null
          and ${t.task} is null and ${t.instruction} is null and ${t.dueInHours} is null)
        or (${t.kind} = 'rep_task'
          and ${t.task} in (${list17(STEP_TASKS2)})
          and ${t.instruction} is not null and char_length(${t.instruction}) between 1 and ${num8(MAX_TASK_INSTRUCTION_LENGTH2)}
          and ${t.dueInHours} is not null and ${t.dueInHours} between 1 and ${num8(MAX_STEP_HOURS2)}
          and ${t.nextKey} is not null
          and ${t.goal} is null and ${t.waitHours} is null
          and ${t.arms} is null and ${t.defaultNextKey} is null)
        or (${t.kind} = 'end'
          and ${t.goal} is null and ${t.nextKey} is null and ${t.waitHours} is null
          and ${t.task} is null and ${t.instruction} is null and ${t.dueInHours} is null
          and ${t.arms} is null and ${t.defaultNextKey} is null)`),
  unique27("steps_key_key").on(t.organizationId, t.campaignId, t.version, t.key),
  foreignKey18({
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
  organizationId: text49("organization_id").notNull(),
  campaignId: text49("campaign_id").notNull(),
  version: integer28("version").notNull(),
  stepKey: text49("step_key").notNull(),
  key: text49("key").notNull(),
  position: smallint10("position").notNull(),
  label: text49("label").notNull(),
  angle: text49("angle").notNull(),
  weight: smallint10("weight").notNull(),
  promotedSource: text49("promoted_source", { enum: PROMOTION_SOURCES2 }),
  promotedByMembershipId: text49("promoted_by_membership_id"),
  promotedAt: ts15("promoted_at")
}, (t) => [
  primaryKey20({
    name: "variants_pkey",
    columns: [t.organizationId, t.campaignId, t.version, t.stepKey, t.key]
  }),
  check31("variants_organization_id_shape", orgShape13),
  check31("variants_organization_not_global", notGlobal15),
  check31("variants_campaign_id_shape", idShape16("campaign_id", "cpg")),
  check31("variants_step_key_shape", sql36.raw(`"step_key" ~ '${KEY_SHAPE}'`)),
  check31("variants_key_shape", sql36.raw(`"key" ~ '${KEY_SHAPE}'`)),
  check31("variants_promoted_by_membership_id_shape", idShape16("promoted_by_membership_id", "mem")),
  check31("variants_position_range", sql36`${t.position} between 0 and 3`),
  check31("variants_label_shape", sql36`char_length(${t.label}) between 1 and ${num8(MAX_VARIANT_LABEL_LENGTH2)}`),
  check31("variants_angle_shape", sql36`char_length(${t.angle}) between 1 and ${num8(MAX_VARIANT_ANGLE_LENGTH2)}`),
  check31("variants_weight_range", sql36`${t.weight} between 1 and ${num8(MAX_VARIANT_WEIGHT2)}`),
  check31("variants_promotion_matches", sql36`(${t.promotedSource} is null) = (${t.promotedAt} is null)
        and (${t.promotedSource} is null or ${t.promotedSource} in (${list17(PROMOTION_SOURCES2)}))
        and ((${t.promotedSource} = 'manual') = (${t.promotedByMembershipId} is not null))`),
  uniqueIndex18("variants_position_key").on(t.organizationId, t.campaignId, t.version, t.stepKey, t.position),
  uniqueIndex18("variants_promoted_key").on(t.organizationId, t.campaignId, t.version, t.stepKey).where(sql36`${t.promotedSource} is not null`),
  foreignKey18({
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
  id: text49("id").notNull(),
  organizationId: text49("organization_id").notNull(),
  campaignId: text49("campaign_id").notNull(),
  prospectId: text49("prospect_id").notNull(),
  state: text49("state", { enum: ENROLLMENT_STATES2 }).notNull().default("active"),
  stopReason: text49("stop_reason", { enum: ENROLLMENT_STOP_REASONS2 }),
  currentStepKey: text49("current_step_key"),
  currentStep: smallint10("current_step"),
  attemptEpoch: integer28("attempt_epoch").notNull().default(0),
  nextDueAt: ts15("next_due_at"),
  enrolledAt: ts15("enrolled_at").notNull().defaultNow(),
  stoppedAt: ts15("stopped_at"),
  completedAt: ts15("completed_at"),
  updatedAt: ts15("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey20({ name: "enrollments_pkey", columns: [t.organizationId, t.id] }),
  check31("enrollments_id_shape", idShape16("id", "enr")),
  check31("enrollments_organization_id_shape", orgShape13),
  check31("enrollments_organization_not_global", notGlobal15),
  check31("enrollments_campaign_id_shape", idShape16("campaign_id", "cpg")),
  check31("enrollments_prospect_id_shape", idShape16("prospect_id", "prs")),
  check31("enrollments_current_step_key_shape", keyShape("current_step_key")),
  check31("enrollments_state_known", sql36`${t.state} in (${list17(ENROLLMENT_STATES2)})`),
  check31("enrollments_stop_matches_state", sql36`(${t.state} = 'stopped') = (${t.stopReason} is not null)
        and (${t.state} = 'stopped') = (${t.stoppedAt} is not null)
        and (${t.stopReason} is null or ${t.stopReason} in (${list17(ENROLLMENT_STOP_REASONS2)}))`),
  check31("enrollments_completed_matches_state", sql36`(${t.state} = 'completed') = (${t.completedAt} is not null)`),
  check31("enrollments_step_matches_state", sql36`(${t.currentStepKey} is null) = (${t.currentStep} is null)
        and (${t.state} <> 'active' or ${t.currentStepKey} is not null)
        and (${t.currentStep} is null or ${t.currentStep} between 0 and ${num8(MAX_SEQUENCE_STEPS2 - 1)})`),
  check31("enrollments_due_only_when_active", sql36`${t.state} = 'active' or ${t.nextDueAt} is null`),
  check31("enrollments_attempt_epoch_range", sql36`${t.attemptEpoch} between 0 and ${num8(MAX_ATTEMPT_EPOCH2)}`),
  uniqueIndex18("enrollments_prospect_key").on(t.organizationId, t.campaignId, t.prospectId),
  index41("enrollments_due_idx").on(t.organizationId, t.nextDueAt).where(sql36`${t.state} = 'active' and ${t.nextDueAt} is not null`),
  index41("enrollments_list_idx").on(t.organizationId, t.campaignId, t.enrolledAt.desc(), t.id.desc()),
  index41("enrollments_prospect_idx").on(t.organizationId, t.prospectId),
  foreignKey18({
    name: "enrollments_campaign_fk",
    columns: [t.organizationId, t.campaignId],
    foreignColumns: [outboundCampaigns2.organizationId, outboundCampaigns2.id]
  })
]);
var outboundEnrollmentEvents2 = outboundSchema2.table("enrollment_events", {
  id: text49("id").notNull(),
  organizationId: text49("organization_id").notNull(),
  enrollmentId: text49("enrollment_id").notNull(),
  kind: text49("kind", { enum: ENROLLMENT_EVENT_KINDS2 }).notNull(),
  stepKey: text49("step_key"),
  variantKey: text49("variant_key"),
  sendId: text49("send_id"),
  stopReason: text49("stop_reason", { enum: ENROLLMENT_STOP_REASONS2 }),
  callResult: text49("call_result", { enum: CALL_RESULTS2 }),
  actorMembershipId: text49("actor_membership_id"),
  occurredAt: ts15("occurred_at").notNull().defaultNow()
}, (t) => [
  primaryKey20({ name: "enrollment_events_pkey", columns: [t.organizationId, t.id] }),
  check31("enrollment_events_id_shape", idShape16("id", "eev")),
  check31("enrollment_events_organization_id_shape", orgShape13),
  check31("enrollment_events_organization_not_global", notGlobal15),
  check31("enrollment_events_enrollment_id_shape", idShape16("enrollment_id", "enr")),
  check31("enrollment_events_step_key_shape", keyShape("step_key")),
  check31("enrollment_events_variant_key_shape", keyShape("variant_key")),
  check31("enrollment_events_send_id_shape", idShape16("send_id", "snd")),
  check31("enrollment_events_actor_membership_id_shape", idShape16("actor_membership_id", "mem")),
  check31("enrollment_events_kind_known", sql36`${t.kind} in (${list17(ENROLLMENT_EVENT_KINDS2)})`),
  check31("enrollment_events_stop_reason_matches_kind", sql36`(${t.kind} = 'stopped') = (${t.stopReason} is not null)
        and (${t.stopReason} is null or ${t.stopReason} in (${list17(ENROLLMENT_STOP_REASONS2)}))`),
  check31("enrollment_events_call_result_matches_kind", sql36`(${t.kind} = 'call_result') = (${t.callResult} is not null)
        and (${t.callResult} is null or ${t.callResult} in (${list17(CALL_RESULTS2)}))`),
  index41("enrollment_events_enrollment_idx").on(t.organizationId, t.enrollmentId, t.occurredAt, t.id),
  foreignKey18({
    name: "enrollment_events_enrollment_fk",
    columns: [t.organizationId, t.enrollmentId],
    foreignColumns: [outboundEnrollments2.organizationId, outboundEnrollments2.id]
  }).onDelete("cascade")
]);
var outboundSendDecisions2 = outboundSchema2.table("send_decisions", {
  id: text49("id").notNull(),
  organizationId: text49("organization_id").notNull(),
  campaignId: text49("campaign_id").notNull(),
  enrollmentId: text49("enrollment_id").notNull(),
  prospectId: text49("prospect_id").notNull(),
  step: smallint10("step").notNull(),
  attemptEpoch: integer28("attempt_epoch").notNull().default(0),
  mailboxId: text49("mailbox_id"),
  state: text49("state", { enum: SEND_STATES2 }).notNull(),
  reason: text49("reason", { enum: SEND_REFUSAL_REASONS2 }),
  checks: jsonb20("checks").notNull().default(sql36`'[]'::jsonb`),
  retryAt: ts15("retry_at"),
  decidedAt: ts15("decided_at").notNull().defaultNow(),
  sentAt: ts15("sent_at")
}, (t) => [
  primaryKey20({ name: "send_decisions_pkey", columns: [t.organizationId, t.id] }),
  check31("send_decisions_id_shape", idShape16("id", "snd")),
  check31("send_decisions_organization_id_shape", orgShape13),
  check31("send_decisions_organization_not_global", notGlobal15),
  check31("send_decisions_campaign_id_shape", idShape16("campaign_id", "cpg")),
  check31("send_decisions_enrollment_id_shape", idShape16("enrollment_id", "enr")),
  check31("send_decisions_prospect_id_shape", idShape16("prospect_id", "prs")),
  check31("send_decisions_mailbox_id_shape", idShape16("mailbox_id", "mbx")),
  check31("send_decisions_step_range", sql36`${t.step} between 0 and ${num8(MAX_SEQUENCE_STEP2)}`),
  check31("send_decisions_attempt_epoch_range", sql36`${t.attemptEpoch} between 0 and ${num8(MAX_ATTEMPT_EPOCH2)}`),
  check31("send_decisions_state_known", sql36`${t.state} in (${list17(SEND_STATES2)})`),
  check31("send_decisions_reason_matches_state", sql36`(${t.state} in ('refused', 'deferred')) = (${t.reason} is not null)
        and (${t.reason} is null or ${t.reason} in (${list17(SEND_REFUSAL_REASONS2)}))
        and (${t.state} <> 'refused' or ${t.reason} not in (${list17(SEND_DEFERRING_REASONS2)}))
        and (${t.state} <> 'deferred' or ${t.reason} in (${list17(SEND_DEFERRING_REASONS2)}))`),
  check31("send_decisions_retry_matches_state", sql36`(${t.state} = 'deferred') = (${t.retryAt} is not null)`),
  check31("send_decisions_mailbox_matches_state", sql36`${t.state} not in ('sending', 'sent', 'failed') or ${t.mailboxId} is not null`),
  check31("send_decisions_sent_matches_state", sql36`(${t.state} = 'sent') = (${t.sentAt} is not null)`),
  check31("send_decisions_checks_shape", sql36`jsonb_typeof(${t.checks}) = 'array'
        and jsonb_array_length(${t.checks}) <= ${num8(SEND_CHECKS2.length)}`),
  uniqueIndex18("send_decisions_send_key").on(t.organizationId, t.enrollmentId, t.step, t.attemptEpoch),
  index41("send_decisions_campaign_idx").on(t.organizationId, t.campaignId, t.decidedAt.desc(), t.id.desc()),
  index41("send_decisions_retry_idx").on(t.organizationId, t.retryAt).where(sql36`${t.state} = 'deferred'`),
  foreignKey18({
    name: "send_decisions_campaign_fk",
    columns: [t.organizationId, t.campaignId],
    foreignColumns: [outboundCampaigns2.organizationId, outboundCampaigns2.id]
  }),
  foreignKey18({
    name: "send_decisions_enrollment_fk",
    columns: [t.organizationId, t.enrollmentId],
    foreignColumns: [outboundEnrollments2.organizationId, outboundEnrollments2.id]
  })
]);
var outboundWorkHints2 = outboundSchema2.table("work_hints", {
  kind: text49("kind", { enum: OUTBOUND_WORK_KINDS2 }).notNull(),
  organizationId: text49("organization_id").notNull(),
  dueAt: ts15("due_at").notNull()
}, (t) => [
  primaryKey20({ name: "work_hints_pkey", columns: [t.kind, t.organizationId] }),
  check31("work_hints_kind_known", sql36`${t.kind} in (${list17(OUTBOUND_WORK_KINDS2)})`),
  check31("work_hints_organization_id_shape", orgShape13),
  index41("work_hints_due_idx").on(t.kind, t.dueAt, t.organizationId)
]);
// src/schema/outbound-enrichment.ts
import { sql as sql37 } from "drizzle-orm";
import {
  bigint as bigint12,
  boolean as boolean18,
  check as check32,
  customType as customType14,
  date as date6,
  foreignKey as foreignKey19,
  index as index42,
  integer as integer29,
  jsonb as jsonb21,
  primaryKey as primaryKey21,
  smallint as smallint11,
  text as text50,
  timestamp as timestamp44,
  uniqueIndex as uniqueIndex19,
  uuid as uuid25
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
var list18 = (values) => sql37.raw(values.map((v) => `'${v}'`).join(", "));
var num9 = (value) => sql37.raw(String(value));
var idShape17 = (column, prefix) => sql37.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape14 = sql37.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal16 = sql37.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts16 = (name) => timestamp44(name, { withTimezone: true });
var bytes12 = customType14({
  dataType: () => "bytea"
});
var PROVIDER_KEY = `^[a-z][a-z0-9_]{0,${MAX_PROVIDER_KEY_LENGTH2 - 1}}$`;
var EVENT_ID = "^[A-Za-z0-9_-]{8,100}$";
var enrichmentRuns2 = outboundSchema2.table("enrichment_runs", {
  id: text50("id").notNull(),
  organizationId: text50("organization_id").notNull(),
  runSetId: text50("run_set_id"),
  prospectId: text50("prospect_id").notNull(),
  requestId: text50("request_id").notNull(),
  status: text50("status", { enum: RUN_STATUSES2 }).notNull().default("queued"),
  stopReason: text50("stop_reason", { enum: STOP_REASONS2 }),
  groups: text50("groups").array().notNull(),
  fields: jsonb21("fields").notNull().default(sql37`'[]'::jsonb`),
  emailVerification: jsonb21("email_verification"),
  costMicros: bigint12("cost_micros", { mode: "number" }).notNull().default(0),
  ceilingMicros: bigint12("ceiling_micros", { mode: "number" }).notNull(),
  requestedByUserId: text50("requested_by_user_id"),
  createdAt: ts16("created_at").notNull().defaultNow(),
  startedAt: ts16("started_at"),
  completedAt: ts16("completed_at"),
  leaseToken: uuid25("lease_token"),
  heartbeatAt: ts16("heartbeat_at")
}, (t) => [
  primaryKey21({ name: "enrichment_runs_pkey", columns: [t.organizationId, t.id] }),
  check32("enrichment_runs_id_shape", idShape17("id", "erun")),
  check32("enrichment_runs_organization_id_shape", orgShape14),
  check32("enrichment_runs_organization_not_global", notGlobal16),
  check32("enrichment_runs_run_set_id_shape", idShape17("run_set_id", "erset")),
  check32("enrichment_runs_prospect_id_shape", idShape17("prospect_id", "prs")),
  check32("enrichment_runs_requested_by_user_id_shape", idShape17("requested_by_user_id", "usr")),
  check32("enrichment_runs_request_id_shape", sql37`char_length(${t.requestId}) between 1 and ${num9(MAX_RUN_REQUEST_ID_LENGTH2)}`),
  check32("enrichment_runs_status_known", sql37`${t.status} in (${list18(RUN_STATUSES2)})`),
  check32("enrichment_runs_stop_reason_matches_status", sql37`(${t.status} = 'stopped') = (${t.stopReason} is not null)
        and (${t.stopReason} is null or ${t.stopReason} in (${list18(STOP_REASONS2)}))`),
  check32("enrichment_runs_times_match_status", sql37`(${t.status} in (${list18(FINAL_RUN_STATUSES2)})) = (${t.completedAt} is not null)
        and (${t.status} <> 'queued' or ${t.startedAt} is null)`),
  check32("enrichment_runs_groups_shape", sql37`cardinality(${t.groups}) between 1 and ${num9(FIELD_GROUPS2.length)}
        and ${t.groups} <@ array[${list18(FIELD_GROUPS2)}]::text[]
        and (cardinality(${t.groups}) = 1
          or (${t.groups}[1] <> ${t.groups}[2]
            and (cardinality(${t.groups}) = 2
              or (${t.groups}[3] <> ${t.groups}[1] and ${t.groups}[3] <> ${t.groups}[2]))))`),
  check32("enrichment_runs_fields_shape", sql37`jsonb_typeof(${t.fields}) = 'array' and jsonb_array_length(${t.fields}) <= ${num9(MAX_RUN_FIELDS2)}`),
  check32("enrichment_runs_email_verification_shape", sql37`${t.emailVerification} is null or jsonb_typeof(${t.emailVerification}) = 'object'`),
  check32("enrichment_runs_cost_range", sql37`${t.costMicros} between 0 and ${num9(MAX_MICRO_DOLLARS2)}
        and ${t.ceilingMicros} between 0 and ${num9(MAX_MICRO_DOLLARS2)}`),
  uniqueIndex19("enrichment_runs_request_key").on(t.organizationId, t.prospectId, t.requestId),
  index42("enrichment_runs_request_idx").on(t.organizationId, t.requestId),
  index42("enrichment_runs_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index42("enrichment_runs_prospect_idx").on(t.organizationId, t.prospectId, t.createdAt.desc(), t.id.desc()),
  index42("enrichment_runs_run_set_idx").on(t.organizationId, t.runSetId, t.createdAt.desc(), t.id.desc()).where(sql37`${t.runSetId} is not null`),
  index42("enrichment_runs_status_idx").on(t.organizationId, t.status, t.createdAt.desc(), t.id.desc())
]);
var enrichmentAttempts2 = outboundSchema2.table("enrichment_attempts", {
  organizationId: text50("organization_id").notNull(),
  runId: text50("run_id").notNull(),
  position: smallint11("position").notNull(),
  provider: text50("provider").notNull(),
  fieldGroup: text50("field_group", { enum: FIELD_GROUPS2 }).notNull(),
  outcome: text50("outcome", { enum: ATTEMPT_OUTCOMES2 }).notNull(),
  failure: text50("failure", { enum: ATTEMPT_FAILURES2 }),
  costMicros: bigint12("cost_micros", { mode: "number" }).notNull().default(0),
  startedAt: ts16("started_at").notNull(),
  durationMs: integer29("duration_ms").notNull()
}, (t) => [
  primaryKey21({
    name: "enrichment_attempts_pkey",
    columns: [t.organizationId, t.runId, t.position]
  }),
  check32("enrichment_attempts_organization_id_shape", orgShape14),
  check32("enrichment_attempts_organization_not_global", notGlobal16),
  check32("enrichment_attempts_run_id_shape", idShape17("run_id", "erun")),
  check32("enrichment_attempts_position_range", sql37`${t.position} between 0 and ${num9(MAX_ATTEMPTS_PER_RUN2 - 1)}`),
  check32("enrichment_attempts_provider_shape", sql37`${t.provider} ~ ${sql37.raw(`'${PROVIDER_KEY}'`)}`),
  check32("enrichment_attempts_field_group_known", sql37`${t.fieldGroup} in (${list18(FIELD_GROUPS2)})`),
  check32("enrichment_attempts_outcome_known", sql37`${t.outcome} in (${list18(ATTEMPT_OUTCOMES2)})`),
  check32("enrichment_attempts_failure_matches_outcome", sql37`(${t.outcome} = 'failed') = (${t.failure} is not null)
        and (${t.failure} is null or ${t.failure} in (${list18(ATTEMPT_FAILURES2)}))`),
  check32("enrichment_attempts_skipped_costs_nothing", sql37`${t.outcome} not in (${list18(SKIPPED_ATTEMPT_OUTCOMES2)}) or ${t.costMicros} = 0`),
  check32("enrichment_attempts_cost_range", sql37`${t.costMicros} between 0 and ${num9(MAX_MICRO_DOLLARS2)}`),
  check32("enrichment_attempts_duration_range", sql37`${t.durationMs} between 0 and ${num9(MAX_ATTEMPT_DURATION_MS2)}`),
  foreignKey19({
    name: "enrichment_attempts_run_fk",
    columns: [t.organizationId, t.runId],
    foreignColumns: [enrichmentRuns2.organizationId, enrichmentRuns2.id]
  }).onDelete("cascade")
]);
var signals2 = outboundSchema2.table("signals", {
  id: text50("id").notNull(),
  organizationId: text50("organization_id").notNull(),
  prospectId: text50("prospect_id").notNull(),
  kind: text50("kind", { enum: SIGNAL_KINDS2 }).notNull(),
  sourceType: text50("source_type", { enum: SIGNAL_SOURCE_TYPES2 }).notNull(),
  sourceProvider: text50("source_provider"),
  sourceUserId: text50("source_user_id"),
  eventId: text50("event_id"),
  observedAt: ts16("observed_at").notNull(),
  recordedAt: ts16("recorded_at").notNull().defaultNow(),
  expiresAt: ts16("expires_at").notNull(),
  detail: jsonb21("detail").notNull()
}, (t) => [
  primaryKey21({ name: "signals_pkey", columns: [t.organizationId, t.id] }),
  check32("signals_id_shape", idShape17("id", "sig")),
  check32("signals_organization_id_shape", orgShape14),
  check32("signals_organization_not_global", notGlobal16),
  check32("signals_prospect_id_shape", idShape17("prospect_id", "prs")),
  check32("signals_source_user_id_shape", idShape17("source_user_id", "usr")),
  check32("signals_kind_known", sql37`${t.kind} in (${list18(SIGNAL_KINDS2)})`),
  check32("signals_source_type_known", sql37`${t.sourceType} in (${list18(SIGNAL_SOURCE_TYPES2)})`),
  check32("signals_source_provider_shape", sql37`${t.sourceProvider} is null or ${t.sourceProvider} ~ ${sql37.raw(`'${PROVIDER_KEY}'`)}`),
  check32("signals_event_id_shape", sql37`${t.eventId} is null or ${t.eventId} ~ ${sql37.raw(`'${EVENT_ID}'`)}`),
  check32("signals_source_matches_type", sql37`case ${t.sourceType}
        when 'provider' then ${t.sourceProvider} is not null and ${t.sourceUserId} is null and ${t.eventId} is null
        when 'webhook' then ${t.eventId} is not null and ${t.sourceProvider} is null and ${t.sourceUserId} is null
        else ${t.sourceUserId} is not null and ${t.sourceProvider} is null and ${t.eventId} is null
      end`),
  check32("signals_expires_after_observed", sql37`${t.expiresAt} >= ${t.observedAt}`),
  check32("signals_detail_shape", sql37`jsonb_typeof(${t.detail}) = 'object'
        and octet_length(${t.detail}::text) <= ${num9(MAX_SIGNAL_DETAIL_BYTES2)}`),
  uniqueIndex19("signals_event_key").on(t.organizationId, t.eventId).where(sql37`${t.eventId} is not null`),
  index42("signals_prospect_idx").on(t.organizationId, t.prospectId, t.observedAt.desc(), t.id.desc()),
  index42("signals_prospect_kind_idx").on(t.organizationId, t.prospectId, t.kind, t.observedAt.desc(), t.id.desc())
]);
var fitCriteria2 = outboundSchema2.table("fit_criteria", {
  id: text50("id").notNull(),
  organizationId: text50("organization_id").notNull(),
  name: text50("name").notNull(),
  field: text50("field", { enum: FIT_FIELDS2 }).notNull(),
  condition: jsonb21("condition").notNull(),
  weight: smallint11("weight").notNull(),
  enabled: boolean18("enabled").notNull().default(true),
  createdAt: ts16("created_at").notNull().defaultNow(),
  updatedAt: ts16("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey21({ name: "fit_criteria_pkey", columns: [t.organizationId, t.id] }),
  check32("fit_criteria_id_shape", idShape17("id", "fcr")),
  check32("fit_criteria_organization_id_shape", orgShape14),
  check32("fit_criteria_organization_not_global", notGlobal16),
  check32("fit_criteria_name_shape", sql37`char_length(${t.name}) between 1 and ${num9(MAX_FIT_NAME_LENGTH2)}`),
  check32("fit_criteria_field_known", sql37`${t.field} in (${list18(FIT_FIELDS2)})`),
  check32("fit_criteria_weight_range", sql37`${t.weight} between 1 and ${num9(MAX_FIT_WEIGHT2)}`),
  check32("fit_criteria_condition_shape", sql37`jsonb_typeof(${t.condition}) = 'object'
        and octet_length(${t.condition}::text) <= ${num9(MAX_FIT_CONDITION_BYTES2)}
        and coalesce(${t.condition}->>'operator', '') in (${list18(FIT_OPERATORS2)})
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
          then jsonb_array_length(${t.condition}->'values') between 1 and ${num9(MAX_FIT_VALUES2)}
          else false end
        end`),
  uniqueIndex19("fit_criteria_name_key").on(t.organizationId, sql37`lower(${t.name})`),
  index42("fit_criteria_list_idx").on(t.organizationId, t.createdAt, t.id)
]);
var providerSettings2 = outboundSchema2.table("provider_settings", {
  organizationId: text50("organization_id").notNull(),
  provider: text50("provider").notNull(),
  enabled: boolean18("enabled").notNull().default(true),
  credentialCiphertext: bytes12("credential_ciphertext"),
  credentialKeyId: text50("credential_key_id"),
  credentialUpdatedAt: ts16("credential_updated_at"),
  personPosition: smallint11("person_position"),
  companyPosition: smallint11("company_position"),
  emailVerificationPosition: smallint11("email_verification_position"),
  updatedAt: ts16("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey21({ name: "provider_settings_pkey", columns: [t.organizationId, t.provider] }),
  check32("provider_settings_organization_id_shape", orgShape14),
  check32("provider_settings_organization_not_global", notGlobal16),
  check32("provider_settings_provider_shape", sql37`${t.provider} ~ ${sql37.raw(`'${PROVIDER_KEY}'`)}`),
  check32("provider_settings_credential_shape", sql37`(${t.credentialCiphertext} is null or octet_length(${t.credentialCiphertext}) between 1 and ${num9(MAX_CREDENTIAL_CIPHERTEXT_BYTES2)})
        and (${t.credentialKeyId} is null or char_length(${t.credentialKeyId}) between 1 and ${num9(MAX_CREDENTIAL_KEY_ID_LENGTH2)})
        and (${t.credentialCiphertext} is null) = (${t.credentialKeyId} is null)
        and (${t.credentialCiphertext} is null) = (${t.credentialUpdatedAt} is null)`),
  check32("provider_settings_positions_range", sql37`(${t.personPosition} is null or ${t.personPosition} between 0 and ${num9(MAX_PROVIDERS2 - 1)})
        and (${t.companyPosition} is null or ${t.companyPosition} between 0 and ${num9(MAX_PROVIDERS2 - 1)})
        and (${t.emailVerificationPosition} is null or ${t.emailVerificationPosition} between 0 and ${num9(MAX_PROVIDERS2 - 1)})`)
]);
var enrichmentSpend2 = outboundSchema2.table("enrichment_spend", {
  organizationId: text50("organization_id").notNull(),
  month: date6("month", { mode: "string" }).notNull(),
  provider: text50("provider").notNull(),
  costMicros: bigint12("cost_micros", { mode: "number" }).notNull().default(0),
  calls: bigint12("calls", { mode: "number" }).notNull().default(0),
  updatedAt: ts16("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey21({
    name: "enrichment_spend_pkey",
    columns: [t.organizationId, t.month, t.provider]
  }),
  check32("enrichment_spend_organization_id_shape", orgShape14),
  check32("enrichment_spend_organization_not_global", notGlobal16),
  check32("enrichment_spend_month_first_day", sql37`extract(day from ${t.month}) = 1`),
  check32("enrichment_spend_provider_shape", sql37`${t.provider} ~ ${sql37.raw(`'${PROVIDER_KEY}'`)}`),
  check32("enrichment_spend_cost_not_negative", sql37`${t.costMicros} >= 0`),
  check32("enrichment_spend_calls_not_negative", sql37`${t.calls} >= 0`),
  index42("enrichment_spend_list_idx").on(t.organizationId, t.month.desc(), t.provider)
]);
var enrichmentReservations2 = outboundSchema2.table("enrichment_reservations", {
  id: text50("id").notNull(),
  organizationId: text50("organization_id").notNull(),
  runId: text50("run_id").notNull(),
  provider: text50("provider").notNull(),
  month: date6("month", { mode: "string" }).notNull(),
  amountMicros: bigint12("amount_micros", { mode: "number" }).notNull(),
  holdKey: text50("hold_key").notNull(),
  createdAt: ts16("created_at").notNull().defaultNow(),
  releasedAt: ts16("released_at")
}, (t) => [
  primaryKey21({ name: "enrichment_reservations_pkey", columns: [t.organizationId, t.id] }),
  check32("enrichment_reservations_id_shape", idShape17("id", "ersv")),
  check32("enrichment_reservations_organization_id_shape", orgShape14),
  check32("enrichment_reservations_organization_not_global", notGlobal16),
  check32("enrichment_reservations_run_id_shape", idShape17("run_id", "erun")),
  check32("enrichment_reservations_provider_shape", sql37`${t.provider} ~ ${sql37.raw(`'${PROVIDER_KEY}'`)}`),
  check32("enrichment_reservations_month_first_day", sql37`extract(day from ${t.month}) = 1`),
  check32("enrichment_reservations_amount_range", sql37`${t.amountMicros} between 0 and ${num9(MAX_MICRO_DOLLARS2)}`),
  check32("enrichment_reservations_hold_key_shape", sql37`char_length(${t.holdKey}) between 1 and ${num9(MAX_RESERVATION_HOLD_KEY_LENGTH2)}`),
  check32("enrichment_reservations_released_after_created", sql37`${t.releasedAt} is null or ${t.releasedAt} >= ${t.createdAt}`),
  foreignKey19({
    name: "enrichment_reservations_run_fk",
    columns: [t.organizationId, t.runId],
    foreignColumns: [enrichmentRuns2.organizationId, enrichmentRuns2.id]
  }).onDelete("cascade"),
  uniqueIndex19("enrichment_reservations_hold_key").on(t.organizationId, t.holdKey),
  index42("enrichment_reservations_open_idx").on(t.organizationId, t.month).where(sql37`${t.releasedAt} is null`),
  index42("enrichment_reservations_run_idx").on(t.organizationId, t.runId)
]);
// src/schema/outbound-linkedin.ts
import { sql as sql38 } from "drizzle-orm";
import {
  boolean as boolean19,
  check as check33,
  date as date7,
  foreignKey as foreignKey20,
  index as index43,
  integer as integer30,
  primaryKey as primaryKey22,
  text as text51,
  timestamp as timestamp45,
  uniqueIndex as uniqueIndex20
} from "drizzle-orm/pg-core";
var LINKEDIN_ACCOUNT_STATUSES2 = [
  "connected",
  "needs_login",
  "paused",
  "restricted",
  "disconnected"
];
var LINKEDIN_PAUSE_REASONS2 = [
  "restricted",
  "checkpoint",
  "provider_unavailable",
  "admin",
  "rate_limited"
];
var LINKEDIN_DAILY_CONNECTION_CEILING2 = 20;
var LINKEDIN_DAILY_MESSAGE_CEILING2 = 40;
var LINKEDIN_WEEKLY_CONNECTION_CEILING2 = 80;
var MAX_LINKEDIN_TYPED_NAME_LENGTH2 = 200;
var MAX_LINKEDIN_PROVIDER_REFERENCE_LENGTH2 = 2048;
var MAX_LINKEDIN_WORDING_VERSION_LENGTH2 = 40;
var list19 = (values) => sql38.raw(values.map((v) => `'${v}'`).join(", "));
var num10 = (value) => sql38.raw(String(value));
var idShape18 = (column, prefix) => sql38.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape15 = sql38.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal17 = sql38.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts17 = (name) => timestamp45(name, { withTimezone: true });
var linkedinAccounts2 = outboundSchema2.table("linkedin_accounts", {
  id: text51("id").notNull(),
  organizationId: text51("organization_id").notNull(),
  membershipId: text51("membership_id").notNull(),
  providerAccountId: text51("provider_account_id").notNull(),
  status: text51("status", { enum: LINKEDIN_ACCOUNT_STATUSES2 }).notNull().default("needs_login"),
  pauseReason: text51("pause_reason", { enum: LINKEDIN_PAUSE_REASONS2 }),
  dailyConnectionLimit: integer30("daily_connection_limit").notNull().default(LINKEDIN_DAILY_CONNECTION_CEILING2),
  dailyMessageLimit: integer30("daily_message_limit").notNull().default(LINKEDIN_DAILY_MESSAGE_CEILING2),
  weeklyConnectionLimit: integer30("weekly_connection_limit").notNull().default(LINKEDIN_WEEKLY_CONNECTION_CEILING2),
  connectedAt: ts17("connected_at").notNull().defaultNow(),
  updatedAt: ts17("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey22({ name: "linkedin_accounts_pkey", columns: [t.organizationId, t.id] }),
  check33("linkedin_accounts_id_shape", idShape18("id", "lia")),
  check33("linkedin_accounts_organization_id_shape", orgShape15),
  check33("linkedin_accounts_organization_not_global", notGlobal17),
  check33("linkedin_accounts_membership_id_shape", idShape18("membership_id", "mem")),
  check33("linkedin_accounts_provider_account_id_shape", sql38`char_length(${t.providerAccountId}) between 1 and ${num10(MAX_LINKEDIN_PROVIDER_REFERENCE_LENGTH2)}`),
  check33("linkedin_accounts_status_known", sql38`${t.status} in (${list19(LINKEDIN_ACCOUNT_STATUSES2)})`),
  check33("linkedin_accounts_pause_reason_known", sql38`${t.pauseReason} is null or ${t.pauseReason} in (${list19(LINKEDIN_PAUSE_REASONS2)})`),
  check33("linkedin_accounts_pause_reason_not_connected", sql38`${t.status} <> 'connected' or ${t.pauseReason} is null`),
  check33("linkedin_accounts_limits_range", sql38`${t.dailyConnectionLimit} between 0 and ${num10(LINKEDIN_DAILY_CONNECTION_CEILING2)}
        and ${t.dailyMessageLimit} between 0 and ${num10(LINKEDIN_DAILY_MESSAGE_CEILING2)}
        and ${t.weeklyConnectionLimit} between 0 and ${num10(LINKEDIN_WEEKLY_CONNECTION_CEILING2)}`),
  uniqueIndex20("linkedin_accounts_member_key").on(t.organizationId, t.membershipId),
  index43("linkedin_accounts_list_idx").on(t.organizationId, t.connectedAt.desc(), t.id.desc())
]);
var linkedinRiskAcceptances2 = outboundSchema2.table("linkedin_risk_acceptances", {
  id: text51("id").notNull(),
  organizationId: text51("organization_id").notNull(),
  wordingVersion: text51("wording_version").notNull(),
  acceptedByMembershipId: text51("accepted_by_membership_id").notNull(),
  typedFullName: text51("typed_full_name").notNull(),
  acceptedAt: ts17("accepted_at").notNull().defaultNow(),
  revokedAt: ts17("revoked_at")
}, (t) => [
  primaryKey22({ name: "linkedin_risk_acceptances_pkey", columns: [t.organizationId, t.id] }),
  check33("linkedin_risk_acceptances_id_shape", idShape18("id", "lra")),
  check33("linkedin_risk_acceptances_organization_id_shape", orgShape15),
  check33("linkedin_risk_acceptances_organization_not_global", notGlobal17),
  check33("linkedin_risk_acceptances_wording_version_shape", sql38`char_length(${t.wordingVersion}) between 1 and ${num10(MAX_LINKEDIN_WORDING_VERSION_LENGTH2)}`),
  check33("linkedin_risk_acceptances_accepted_by_shape", idShape18("accepted_by_membership_id", "mem")),
  check33("linkedin_risk_acceptances_typed_full_name_shape", sql38`char_length(${t.typedFullName}) between 2 and ${num10(MAX_LINKEDIN_TYPED_NAME_LENGTH2)}
        and ${t.typedFullName} !~ '[[:cntrl:]]'`),
  check33("linkedin_risk_acceptances_revoked_after_accepted", sql38`${t.revokedAt} is null or ${t.revokedAt} >= ${t.acceptedAt}`),
  index43("linkedin_risk_acceptances_list_idx").on(t.organizationId, t.acceptedAt.desc(), t.id.desc()),
  index43("linkedin_risk_acceptances_active_idx").on(t.organizationId, t.wordingVersion).where(sql38`${t.revokedAt} is null`)
]);
var linkedinChannelSettings2 = outboundSchema2.table("linkedin_channel_settings", {
  organizationId: text51("organization_id").notNull(),
  enabled: boolean19("enabled").notNull().default(false),
  updatedByMembershipId: text51("updated_by_membership_id"),
  updatedAt: ts17("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey22({ name: "linkedin_channel_settings_pkey", columns: [t.organizationId] }),
  check33("linkedin_channel_settings_organization_id_shape", orgShape15),
  check33("linkedin_channel_settings_organization_not_global", notGlobal17),
  check33("linkedin_channel_settings_updated_by_shape", idShape18("updated_by_membership_id", "mem"))
]);
var linkedinUsage2 = outboundSchema2.table("linkedin_usage", {
  organizationId: text51("organization_id").notNull(),
  accountId: text51("account_id").notNull(),
  day: date7("day", { mode: "string" }).notNull(),
  connections: integer30("connections").notNull().default(0),
  messages: integer30("messages").notNull().default(0),
  updatedAt: ts17("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey22({
    name: "linkedin_usage_pkey",
    columns: [t.organizationId, t.accountId, t.day]
  }),
  check33("linkedin_usage_organization_id_shape", orgShape15),
  check33("linkedin_usage_organization_not_global", notGlobal17),
  check33("linkedin_usage_account_id_shape", idShape18("account_id", "lia")),
  check33("linkedin_usage_counters_not_negative", sql38`${t.connections} >= 0 and ${t.messages} >= 0`),
  foreignKey20({
    name: "linkedin_usage_account_fk",
    columns: [t.organizationId, t.accountId],
    foreignColumns: [linkedinAccounts2.organizationId, linkedinAccounts2.id]
  }).onDelete("cascade")
]);
var LINKEDIN_SEND_KINDS2 = ["connection", "message"];
var LINKEDIN_SEND_STATES2 = ["sending", "sent"];
var MAX_LINKEDIN_SEND_KEY_LENGTH2 = 200;
var linkedinSends2 = outboundSchema2.table("linkedin_sends", {
  organizationId: text51("organization_id").notNull(),
  sendKey: text51("send_key").notNull(),
  accountId: text51("account_id").notNull(),
  kind: text51("kind").notNull(),
  state: text51("state").notNull().default("sending"),
  createdAt: ts17("created_at").notNull().defaultNow(),
  sentAt: ts17("sent_at")
}, (t) => [
  primaryKey22({ name: "linkedin_sends_pkey", columns: [t.organizationId, t.sendKey] }),
  check33("linkedin_sends_organization_id_shape", orgShape15),
  check33("linkedin_sends_organization_not_global", notGlobal17),
  check33("linkedin_sends_account_id_shape", idShape18("account_id", "lia")),
  check33("linkedin_sends_send_key_length", sql38`char_length(${t.sendKey}) between 1 and ${num10(MAX_LINKEDIN_SEND_KEY_LENGTH2)}`),
  check33("linkedin_sends_kind_known", sql38`${t.kind} in (${list19(LINKEDIN_SEND_KINDS2)})`),
  check33("linkedin_sends_state_known", sql38`${t.state} in (${list19(LINKEDIN_SEND_STATES2)})`),
  check33("linkedin_sends_sent_matches_state", sql38`(${t.state} = 'sent') = (${t.sentAt} is not null)`),
  foreignKey20({
    name: "linkedin_sends_account_fk",
    columns: [t.organizationId, t.accountId],
    foreignColumns: [linkedinAccounts2.organizationId, linkedinAccounts2.id]
  }).onDelete("cascade"),
  index43("linkedin_sends_account_idx").on(t.organizationId, t.accountId, t.createdAt.desc())
]);
// src/schema/outbound-signal-state.ts
import { sql as sql39 } from "drizzle-orm";
import {
  check as check34,
  customType as customType15,
  index as index44,
  integer as integer31,
  jsonb as jsonb22,
  primaryKey as primaryKey23,
  smallint as smallint12,
  text as text52,
  timestamp as timestamp46
} from "drizzle-orm/pg-core";
var MAX_WEBHOOK_SECRET_CIPHERTEXT_BYTES2 = 2048;
var MAX_SIGNAL_KINDS_BYTES2 = 4096;
var MAX_FIT_MATCHES_BYTES2 = 16384;
var idShape19 = (column, prefix) => sql39.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape16 = sql39.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal18 = sql39.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts18 = (name) => timestamp46(name, { withTimezone: true });
var bytes13 = customType15({
  dataType: () => "bytea"
});
var signalSettings2 = outboundSchema2.table("signal_settings", {
  organizationId: text52("organization_id").notNull(),
  kinds: jsonb22("kinds").notNull(),
  version: integer31("version").notNull().default(1),
  criteriaVersion: integer31("criteria_version").notNull().default(1),
  webhookSecretCiphertext: bytes13("webhook_secret_ciphertext"),
  webhookKeyId: text52("webhook_key_id"),
  webhookRotatedAt: ts18("webhook_rotated_at"),
  updatedAt: ts18("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey23({ name: "signal_settings_pkey", columns: [t.organizationId] }),
  check34("signal_settings_organization_id_shape", orgShape16),
  check34("signal_settings_organization_not_global", notGlobal18),
  check34("signal_settings_kinds_shape", sql39`jsonb_typeof(${t.kinds}) = 'array'
        and octet_length(${t.kinds}::text) <= ${sql39.raw(String(MAX_SIGNAL_KINDS_BYTES2))}`),
  check34("signal_settings_versions_positive", sql39`${t.version} >= 1 and ${t.criteriaVersion} >= 1`),
  check34("signal_settings_webhook_shape", sql39`(${t.webhookSecretCiphertext} is null or octet_length(${t.webhookSecretCiphertext}) between 1 and ${sql39.raw(String(MAX_WEBHOOK_SECRET_CIPHERTEXT_BYTES2))})
        and (${t.webhookKeyId} is null or char_length(${t.webhookKeyId}) between 1 and 128)
        and (${t.webhookSecretCiphertext} is null) = (${t.webhookKeyId} is null)
        and (${t.webhookSecretCiphertext} is null) = (${t.webhookRotatedAt} is null)`)
]);
var fitScores2 = outboundSchema2.table("fit_scores", {
  organizationId: text52("organization_id").notNull(),
  prospectId: text52("prospect_id").notNull(),
  score: smallint12("score").notNull(),
  maxScore: smallint12("max_score").notNull(),
  matches: jsonb22("matches").notNull(),
  criteriaVersion: integer31("criteria_version").notNull(),
  scoredAt: ts18("scored_at").notNull().defaultNow()
}, (t) => [
  primaryKey23({ name: "fit_scores_pkey", columns: [t.organizationId, t.prospectId] }),
  check34("fit_scores_organization_id_shape", orgShape16),
  check34("fit_scores_organization_not_global", notGlobal18),
  check34("fit_scores_prospect_id_shape", idShape19("prospect_id", "prs")),
  check34("fit_scores_score_range", sql39`${t.score} between 0 and ${t.maxScore}`),
  check34("fit_scores_criteria_version_positive", sql39`${t.criteriaVersion} >= 1`),
  check34("fit_scores_matches_shape", sql39`jsonb_typeof(${t.matches}) = 'array'
        and octet_length(${t.matches}::text) <= ${sql39.raw(String(MAX_FIT_MATCHES_BYTES2))}`),
  index44("fit_scores_list_idx").on(t.organizationId, t.score.desc(), t.prospectId.desc())
]);
// src/schema/outbound-unsubscribe-rate.ts
import { sql as sql40 } from "drizzle-orm";
import { check as check35, customType as customType16, index as index45, integer as integer32, primaryKey as primaryKey24, timestamp as timestamp47 } from "drizzle-orm/pg-core";
var UNSUBSCRIBE_RATE_KEY_HASH_BYTES2 = 32;
var bytea3 = customType16({
  dataType() {
    return "bytea";
  }
});
var unsubscribeRateCounters2 = outboundSchema2.table("unsubscribe_rate_counter", {
  keyHash: bytea3("key_hash").notNull(),
  windowStart: timestamp47("window_start", { withTimezone: true }).notNull(),
  hits: integer32("hits").notNull()
}, (t) => [
  primaryKey24({ name: "unsubscribe_rate_counter_pkey", columns: [t.keyHash, t.windowStart] }),
  check35("unsubscribe_rate_counter_key_hash_length", sql40`octet_length(${t.keyHash}) = ${sql40.raw(String(UNSUBSCRIBE_RATE_KEY_HASH_BYTES2))}`),
  check35("unsubscribe_rate_counter_hits_positive", sql40`${t.hits} >= 1`),
  index45("unsubscribe_rate_counters_window_start_idx").on(t.windowStart)
]);
// src/schema/playbook-calls.ts
import { sql as sql41 } from "drizzle-orm";
import {
  bigint as bigint13,
  check as check36,
  customType as customType17,
  foreignKey as foreignKey21,
  index as index46,
  integer as integer33,
  primaryKey as primaryKey25,
  text as text53,
  timestamp as timestamp48,
  uniqueIndex as uniqueIndex21,
  uuid as uuid26
} from "drizzle-orm/pg-core";
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
var bytes14 = customType17({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var textArray4 = customType17({
  dataType: () => "text[]"
});
var list20 = (values) => sql41.raw(values.map((v) => `'${v}'`).join(", "));
var idShape20 = (column, prefix) => sql41.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var notGlobal19 = sql41.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`);
var ts19 = (name) => timestamp48(name, { withTimezone: true });
var CALL_PENDING_CLEANUP_PREDICATE2 = "state = 'deleted' and (vectors_removed_seq is null or vectors_removed_seq < deletion_seq)";
var CALL_ORIGINS2 = ["imported", "rep", "agent"];
var calls2 = playbookSchema2.table("calls", {
  id: text53("id").notNull(),
  organizationId: text53("organization_id").notNull(),
  dealRecordId: text53("deal_record_id").notNull(),
  kind: text53("kind", { enum: CALL_KINDS2 }).notNull(),
  fileName: text53("file_name").notNull(),
  mediaType: text53("media_type", { enum: CALL_MEDIA_TYPES2 }).notNull(),
  sizeBytes: bigint13("size_bytes", { mode: "number" }).notNull(),
  contentHash: bytes14("content_hash").notNull(),
  durationSeconds: integer33("duration_seconds"),
  state: text53("state", { enum: CALL_STATES2 }).notNull().default("uploaded"),
  failureReason: text53("failure_reason", { enum: CALL_FAILURE_REASONS2 }),
  repBy: text53("rep_by", { enum: CALL_REP_BY2 }),
  repLabel: text53("rep_label"),
  repChannel: text53("rep_channel", { enum: CALL_CHANNELS2 }),
  speakerLabels: textArray4("speaker_labels").notNull().default(sql41`'{}'::text[]`),
  uploadedBy: text53("uploaded_by").notNull(),
  objectKey: text53("object_key").notNull(),
  transcriptKey: text53("transcript_key"),
  epoch: integer33("epoch").notNull().default(0),
  repSeq: integer33("rep_seq").notNull().default(0),
  deletionSeq: integer33("deletion_seq").notNull().default(0),
  vectorsRemovedSeq: integer33("vectors_removed_seq"),
  taggedOutcomeSeq: integer33("tagged_outcome_seq").notNull().default(0),
  origin: text53("origin", { enum: CALL_ORIGINS2 }).notNull().default("imported"),
  sentToVendorAt: ts19("sent_to_vendor_at"),
  vendorSendSeq: integer33("vendor_send_seq").notNull().default(0),
  vendorRemovedAt: ts19("vendor_removed_at"),
  deletedAt: ts19("deleted_at"),
  deletedBy: text53("deleted_by"),
  purgeDueAt: ts19("purge_due_at"),
  purgeStartedAt: ts19("purge_started_at"),
  purgeLeaseUntil: ts19("purge_lease_until"),
  purgeAttempts: integer33("purge_attempts").notNull().default(0),
  restoreBarredAt: ts19("restore_barred_at"),
  embeddedMoments: integer33("embedded_moments"),
  skippedMoments: integer33("skipped_moments"),
  createdAt: ts19("created_at").notNull().defaultNow(),
  updatedAt: ts19("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey25({ name: "calls_pkey", columns: [t.organizationId, t.id] }),
  foreignKey21({
    name: "calls_deal_fk",
    columns: [t.organizationId, t.dealRecordId],
    foreignColumns: [deals2.organizationId, deals2.id]
  }),
  check36("calls_id_shape", idShape20("id", "call")),
  check36("calls_organization_id_shape", idShape20("organization_id", "org")),
  check36("calls_organization_not_global", notGlobal19),
  check36("calls_deal_record_id_shape", idShape20("deal_record_id", "deal")),
  check36("calls_uploaded_by_shape", idShape20("uploaded_by", "usr")),
  check36("calls_deleted_by_shape", sql41`${t.deletedBy} ~ '^usr_[0-9a-f]{32}$'`),
  check36("calls_kind_known", sql41`${t.kind} in (${list20(CALL_KINDS2)})`),
  check36("calls_media_type_known", sql41`${t.mediaType} in (${list20(CALL_MEDIA_TYPES2)})`),
  check36("calls_kind_matches_media_type", sql41`(${t.kind} = 'recording') = (${t.mediaType} like 'audio/%')`),
  check36("calls_file_name_shape", sql41`char_length(btrim(${t.fileName})) between 1 and 255`),
  check36("calls_content_hash_length", sql41`octet_length(${t.contentHash}) = 32`),
  check36("calls_size_bounds", sql41`${t.sizeBytes} between 1 and ${sql41.raw(String(CALL_MAX_RECORDING_BYTES2))}
        and (${t.kind} = 'recording' or ${t.sizeBytes} <= ${sql41.raw(String(CALL_MAX_TRANSCRIPT_BYTES2))})`),
  check36("calls_duration_bounds", sql41`${t.durationSeconds} is null or (${t.durationSeconds} between 1 and ${sql41.raw(String(CALL_MAX_RECORDING_SECONDS2))}
        and ${t.kind} = 'recording')`),
  check36("calls_origin_known", sql41`${t.origin} in (${list20(CALL_ORIGINS2)})`),
  check36("calls_state_known", sql41`${t.state} in (${list20(CALL_STATES2)})`),
  check36("calls_failure_reason_known", sql41`${t.failureReason} in (${list20(CALL_FAILURE_REASONS2)})`),
  check36("calls_failed_has_reason", sql41`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check36("calls_transcript_states", sql41`${t.kind} = 'recording' or ${t.state} not in ('transcribing', 'awaiting_rep')`),
  check36("calls_rep_shape", sql41`(${t.repBy} is null and ${t.repLabel} is null and ${t.repChannel} is null)
        or (${t.repBy} = 'speaker' and ${t.repLabel} is not null and ${t.repChannel} is null)
        or (${t.repBy} = 'channel' and ${t.repChannel} is not null and ${t.repLabel} is null
            and ${t.kind} = 'recording')`),
  check36("calls_rep_label_shape", sql41`${t.repLabel} is null or char_length(${t.repLabel}) between 1 and ${sql41.raw(String(CALL_SPEAKER_LABEL_MAX_LENGTH2))}
      and octet_length(${t.repLabel}) <= ${sql41.raw(String(CALL_SPEAKER_LABEL_MAX_BYTES2))}`),
  check36("calls_awaiting_rep_has_none", sql41`${t.state} <> 'awaiting_rep' or ${t.repBy} is null`),
  check36("calls_ready_has_rep", sql41`${t.state} <> 'ready' or ${t.repBy} is not null`),
  check36("calls_ready_label_listed", sql41`${t.state} <> 'ready' or ${t.repBy} is distinct from 'speaker' or ${t.repLabel} = any(${t.speakerLabels})`),
  check36("calls_moment_counts", sql41`(${t.embeddedMoments} is null) = (${t.skippedMoments} is null)
        and (${t.embeddedMoments} is null or (${t.embeddedMoments} between 0 and ${sql41.raw(String(CALL_MAX_MOMENTS2))}
          and ${t.skippedMoments} between 0 and ${sql41.raw(String(CALL_MAX_MOMENTS2))}))`),
  check36("calls_speaker_labels_valid", sql41`playbook.speaker_labels_ok(${t.speakerLabels})`),
  check36("calls_too_many_speakers_lists_none", sql41`${t.failureReason} is distinct from 'too_many_speakers' or cardinality(${t.speakerLabels}) = 0`),
  check36("calls_object_key_shape", sql41`char_length(${t.objectKey}) between 1 and 1024 and ${t.objectKey} collate "C" ~ '^[!-~]+$'`),
  check36("calls_transcript_key_shape", sql41`char_length(${t.transcriptKey}) between 1 and 1024 and ${t.transcriptKey} collate "C" ~ '^[!-~]+$'`),
  check36("calls_seq_bounds", sql41`${t.epoch} >= 0 and ${t.deletionSeq} >= 0
        and ${t.repSeq} between 0 and ${sql41.raw(String(CALL_MAX_SEQ2))}
        and ${t.taggedOutcomeSeq} between 0 and ${sql41.raw(String(CALL_MAX_SEQ2))}`),
  check36("calls_vectors_removed_seq_bounds", sql41`${t.vectorsRemovedSeq} between 0 and ${t.deletionSeq}`),
  check36("calls_deleted_has_times", sql41`(${t.state} = 'deleted') = (${t.deletedAt} is not null)
        and (${t.state} = 'deleted') = (${t.purgeDueAt} is not null)`),
  check36("calls_deleted_by_when_deleted", sql41`${t.state} = 'deleted' or ${t.deletedBy} is null`),
  check36("calls_deleted_is_counted", sql41`${t.state} <> 'deleted' or ${t.deletionSeq} >= 1`),
  check36("calls_purge_due_after_delete", sql41`${t.purgeDueAt} >= ${t.deletedAt}`),
  check36("calls_purge_only_when_deleted", sql41`(${t.purgeStartedAt} is null or ${t.state} = 'deleted')
        and (${t.purgeStartedAt} is null) = (${t.purgeLeaseUntil} is null)
        and (${t.purgeStartedAt} is null) = (${t.purgeAttempts} = 0)`),
  check36("calls_purge_attempts_bounds", sql41`${t.purgeAttempts} between 0 and ${sql41.raw(String(CALL_PURGE_MAX_ATTEMPTS2))}`),
  check36("calls_barred_only_when_deleted", sql41`${t.restoreBarredAt} is null or ${t.state} = 'deleted'`),
  check36("calls_vendor_removal_after_send", sql41`${t.vendorRemovedAt} is null or ${t.sentToVendorAt} is not null`),
  check36("calls_vendor_send_seq_max", sql41`${t.vendorSendSeq} <= ${sql41.raw(String(CALL_MAX_VENDOR_SENDS2))}`),
  check36("calls_vendor_send_seq_matches", sql41`${t.vendorSendSeq} >= 0 and (${t.sentToVendorAt} is null) = (${t.vendorSendSeq} = 0)`),
  check36("calls_transcript_has_rep", sql41`${t.kind} <> 'transcript' or ${t.repBy} is not null`),
  uniqueIndex21("calls_content_hash_key").on(t.organizationId, t.contentHash).where(sql41`${t.purgeStartedAt} is null and ${t.restoreBarredAt} is null`),
  index46("calls_list_idx").on(t.organizationId, t.createdAt, t.id).where(sql41`${t.state} <> 'deleted'`),
  index46("calls_state_list_idx").on(t.organizationId, t.state, t.createdAt, t.id),
  index46("calls_deal_list_idx").on(t.organizationId, t.dealRecordId, t.createdAt, t.id).where(sql41`${t.state} <> 'deleted'`),
  index46("calls_deal_state_list_idx").on(t.organizationId, t.dealRecordId, t.state, t.createdAt, t.id),
  index46("calls_purge_idx").on(t.organizationId, t.purgeDueAt, t.id).where(sql41`${t.state} = 'deleted' and ${t.purgeAttempts} < ${sql41.raw(String(CALL_PURGE_MAX_ATTEMPTS2))}`),
  index46("calls_unbarred_idx").on(t.organizationId, t.id).where(sql41`${t.restoreBarredAt} is null`),
  index46("calls_cleanup_idx").on(t.organizationId, t.deletedAt, t.id).where(sql41.raw(CALL_PENDING_CLEANUP_PREDICATE2)),
  index46("calls_spent_purge_idx").on(t.organizationId, t.id).where(sql41`${t.state} = 'deleted' and ${t.purgeAttempts} >= ${sql41.raw(String(CALL_PURGE_MAX_ATTEMPTS2))}`),
  index46("calls_retag_idx").on(t.organizationId, t.dealRecordId, t.id).where(sql41`${t.state} = 'ready'`)
]);
var callJobs2 = playbookSchema2.table("call_jobs", {
  id: text53("id").notNull(),
  organizationId: text53("organization_id").notNull(),
  callId: text53("call_id").notNull(),
  kind: text53("kind", { enum: CALL_JOB_KINDS2 }).notNull(),
  epoch: integer33("epoch").notNull(),
  repSeq: integer33("rep_seq").notNull().default(0),
  state: text53("state", { enum: CALL_JOB_STATES2 }).notNull().default("queued"),
  attempts: integer33("attempts").notNull().default(0),
  nextAttemptAt: ts19("next_attempt_at").notNull(),
  claimToken: uuid26("claim_token"),
  failureReason: text53("failure_reason", { enum: CALL_FAILURE_REASONS2 }),
  finishedAt: ts19("finished_at"),
  createdAt: ts19("created_at").notNull().defaultNow(),
  updatedAt: ts19("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey25({ name: "call_jobs_pkey", columns: [t.organizationId, t.id] }),
  foreignKey21({
    name: "call_jobs_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [calls2.organizationId, calls2.id]
  }).onDelete("cascade"),
  check36("call_jobs_id_shape", idShape20("id", "cjob")),
  check36("call_jobs_organization_id_shape", idShape20("organization_id", "org")),
  check36("call_jobs_organization_not_global", notGlobal19),
  check36("call_jobs_kind_known", sql41`${t.kind} in (${list20(CALL_JOB_KINDS2)})`),
  check36("call_jobs_state_known", sql41`${t.state} in (${list20(CALL_JOB_STATES2)})`),
  check36("call_jobs_epoch_seq_bounds", sql41`${t.epoch} >= 0 and ${t.repSeq} between 0 and ${sql41.raw(String(CALL_MAX_SEQ2))}`),
  check36("call_jobs_attempts_bounds", sql41`${t.attempts} between 0 and ${sql41.raw(String(CALL_JOB_MAX_ATTEMPTS2))}`),
  check36("call_jobs_running_has_token", sql41`(${t.state} = 'running') = (${t.claimToken} is not null)`),
  check36("call_jobs_failure_reason_known", sql41`${t.failureReason} in (${list20(CALL_FAILURE_REASONS2)})`),
  check36("call_jobs_failed_has_reason", sql41`(${t.state} = 'failed') = (${t.failureReason} is not null)`),
  check36("call_jobs_final_has_finish", sql41`(${t.state} in ('succeeded', 'failed', 'cancelled')) = (${t.finishedAt} is not null)`),
  index46("call_jobs_call_idx").on(t.organizationId, t.callId),
  uniqueIndex21("call_jobs_active_call_key").on(t.organizationId, t.callId).where(sql41`${t.state} in ('queued', 'running')`),
  index46("call_jobs_due_idx").on(t.organizationId, t.nextAttemptAt).where(sql41`${t.state} in ('queued', 'running')`)
]);
var callVendorSends2 = playbookSchema2.table("call_vendor_sends", {
  organizationId: text53("organization_id").notNull(),
  callId: text53("call_id").notNull(),
  seq: integer33("seq").notNull(),
  vendorId: text53("vendor_id"),
  createdAt: ts19("created_at").notNull().defaultNow(),
  recordedAt: ts19("recorded_at")
}, (t) => [
  primaryKey25({
    name: "call_vendor_sends_pkey",
    columns: [t.organizationId, t.callId, t.seq]
  }),
  foreignKey21({
    name: "call_vendor_sends_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [calls2.organizationId, calls2.id]
  }).onDelete("cascade"),
  check36("call_vendor_sends_organization_id_shape", idShape20("organization_id", "org")),
  check36("call_vendor_sends_organization_not_global", notGlobal19),
  check36("call_vendor_sends_seq_bounds", sql41`${t.seq} between 1 and ${sql41.raw(String(CALL_MAX_VENDOR_SENDS2))}`),
  check36("call_vendor_sends_vendor_id_shape", sql41.raw(`"vendor_id" is null or "vendor_id" ~ '${CALL_VENDOR_ID_PATTERN2}'`)),
  check36("call_vendor_sends_recorded_matches", sql41`(${t.vendorId} is null) = (${t.recordedAt} is null)`),
  uniqueIndex21("call_vendor_sends_org_vendor_id_key").on(t.organizationId, t.vendorId).where(sql41`${t.vendorId} is not null`)
]);
// src/schema/playbook-consumed.ts
import { sql as sql42 } from "drizzle-orm";
import { check as check37, index as index47, primaryKey as primaryKey26, text as text54, timestamp as timestamp49, uuid as uuid27 } from "drizzle-orm/pg-core";
var list21 = (values) => sql42.raw(values.map((v) => `'${v}'`).join(", "));
var idShape21 = (column, prefix) => sql42.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var ts20 = (name) => timestamp49(name, { withTimezone: true });
var consumedMessage2 = playbookSchema2.table("consumed_message", {
  consumer: text54("consumer").notNull(),
  organizationId: text54("organization_id").notNull(),
  messageId: text54("message_id").notNull(),
  state: text54("state", { enum: CONSUMED_MESSAGE_STATES2 }).notNull(),
  claimToken: uuid27("claim_token").notNull(),
  leaseExpiresAt: ts20("lease_expires_at"),
  completedAt: ts20("completed_at")
}, (t) => [
  primaryKey26({
    name: "consumed_message_pkey",
    columns: [t.consumer, t.organizationId, t.messageId]
  }),
  check37("consumed_message_organization_id_shape", idShape21("organization_id", "org")),
  check37("consumed_message_consumer_shape", sql42`char_length(${t.consumer}) between 1 and 128 and ${t.consumer} collate "C" ~ '^[A-Za-z0-9_.:-]+$'`),
  check37("consumed_message_message_id_shape", sql42`char_length(${t.messageId}) between 1 and 128 and ${t.messageId} collate "C" ~ '^[A-Za-z0-9_.:-]+$'`),
  check37("consumed_message_state_known", sql42`${t.state} in (${list21(CONSUMED_MESSAGE_STATES2)})`),
  check37("consumed_message_state_columns", sql42`(${t.state} = 'claimed' and ${t.leaseExpiresAt} is not null and ${t.completedAt} is null)
        or (${t.state} = 'done' and ${t.leaseExpiresAt} is null and ${t.completedAt} is not null)`),
  index47("consumed_message_done_idx").on(t.organizationId, t.completedAt).where(sql42`${t.state} = 'done'`),
  index47("consumed_message_lease_idx").on(t.organizationId, t.leaseExpiresAt).where(sql42`${t.state} = 'claimed'`)
]);
// src/schema/playbook-embed-usage.ts
import { sql as sql43 } from "drizzle-orm";
import { check as check38, date as date8, integer as integer34, primaryKey as primaryKey27, text as text55 } from "drizzle-orm/pg-core";
var EMBED_USAGE_MAX_ADD2 = 1e6;
var EMBED_USAGE_MAX_MOMENTS2 = 1e9;
var playbookEmbedUsage2 = playbookSchema2.table("embed_usage", {
  organizationId: text55("organization_id").notNull(),
  day: date8("day", { mode: "string" }).notNull(),
  moments: integer34("moments").notNull().default(0)
}, (t) => [
  primaryKey27({ name: "embed_usage_pkey", columns: [t.organizationId, t.day] }),
  check38("embed_usage_organization_id_shape", sql43.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)),
  check38("embed_usage_organization_not_global", sql43.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`)),
  check38("embed_usage_moments_bounds", sql43`${t.moments} between 0 and ${sql43.raw(String(EMBED_USAGE_MAX_MOMENTS2))}`)
]);
// src/schema/playbook-idempotency.ts
import { sql as sql44 } from "drizzle-orm";
import {
  check as check39,
  customType as customType18,
  index as index48,
  jsonb as jsonb23,
  primaryKey as primaryKey28,
  smallint as smallint13,
  text as text56,
  timestamp as timestamp50
} from "drizzle-orm/pg-core";
var idShape22 = (column, prefix) => sql44.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var bytes15 = customType18({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var INTERNAL_CALL_USER_ID2 = "usr_00000000000000000000000000000000";
var playbookIdempotencyKeys2 = playbookSchema2.table("idempotency_keys", {
  organizationId: text56("organization_id").notNull(),
  userId: text56("user_id").notNull(),
  route: text56("route").notNull(),
  key: text56("key").notNull(),
  requestHash: bytes15("request_hash").notNull(),
  status: smallint13("status"),
  response: jsonb23("response").$type(),
  createdAt: timestamp50("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  primaryKey28({
    name: "idempotency_keys_pkey",
    columns: [t.organizationId, t.userId, t.route, t.key]
  }),
  check39("idempotency_keys_organization_id_shape", idShape22("organization_id", "org")),
  check39("idempotency_keys_organization_not_global", sql44.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`)),
  check39("idempotency_keys_user_id_shape", idShape22("user_id", "usr")),
  check39("idempotency_keys_route_shape", sql44`char_length(${t.route}) between 1 and ${sql44.raw(String(IDEMPOTENCY_ROUTE_MAX2))}
        and ${t.route} collate "C" ~ '^[a-z0-9._]+$'`),
  check39("idempotency_keys_key_shape", sql44`char_length(${t.key}) between 1 and ${sql44.raw(String(IDEMPOTENCY_KEY_MAX2))}
        and ${t.key} collate "C" ~ '^[!-~]+$'`),
  check39("idempotency_keys_request_hash_length", sql44`octet_length(${t.requestHash}) = ${sql44.raw(String(IDEMPOTENCY_HASH_BYTES2))}`),
  check39("idempotency_keys_status_range", sql44`${t.status} between 100 and 599`),
  check39("idempotency_keys_response_matches_status", sql44`(${t.status} is null) = (${t.response} is null)`),
  check39("idempotency_keys_response_size", sql44`octet_length(${t.response}::text) <= ${sql44.raw(String(IDEMPOTENCY_RESPONSE_MAX_BYTES2))}`),
  index48("idempotency_keys_purge_idx").on(t.organizationId, t.createdAt)
]);
// src/schema/playbook-live-call-waits.ts
import { sql as sql45 } from "drizzle-orm";
import { check as check40, index as index49, primaryKey as primaryKey29, text as text57, timestamp as timestamp51 } from "drizzle-orm/pg-core";
var idShape23 = (column, prefix) => sql45.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var ts21 = (name) => timestamp51(name, { withTimezone: true });
var liveCallWaits2 = playbookSchema2.table("live_call_waits", {
  organizationId: text57("organization_id").notNull(),
  callId: text57("call_id").notNull(),
  direction: text57("direction", { enum: ["inbound", "outbound"] }).notNull(),
  endedAt: ts21("ended_at").notNull(),
  createdAt: ts21("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey29({ name: "live_call_waits_pkey", columns: [t.organizationId, t.callId] }),
  check40("live_call_waits_call_id_shape", idShape23("call_id", "call")),
  check40("live_call_waits_organization_id_shape", idShape23("organization_id", "org")),
  check40("live_call_waits_organization_not_global", sql45.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`)),
  check40("live_call_waits_direction_known", sql45`${t.direction} in ('inbound', 'outbound')`),
  index49("live_call_waits_list_idx").on(t.organizationId, t.createdAt, t.callId)
]);
// src/schema/playbook-orphan-sweeps.ts
import { sql as sql46 } from "drizzle-orm";
import { check as check41, text as text58, timestamp as timestamp52 } from "drizzle-orm/pg-core";
var ORPHAN_SWEEP_CURSOR_MAX_BYTES2 = 1024;
var ORPHAN_SWEEP_MIN_CLAIM_MS2 = 1000;
var ORPHAN_SWEEP_MAX_CLAIM_MS2 = 3600000;
var playbookOrphanSweeps2 = playbookSchema2.table("orphan_sweeps", {
  organizationId: text58("organization_id").primaryKey(),
  sweptThrough: timestamp52("swept_through", { withTimezone: true }).notNull(),
  erasedAttemptAt: timestamp52("erased_attempt_at", { withTimezone: true }),
  sweepCursor: text58("sweep_cursor"),
  sweepClaimUntil: timestamp52("sweep_claim_until", { withTimezone: true })
}, (t) => [
  check41("orphan_sweeps_organization_id_shape", sql46.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)),
  check41("orphan_sweeps_cursor_bounds", sql46`${t.sweepCursor} is null or octet_length(${t.sweepCursor}) between 1 and ${sql46.raw(String(ORPHAN_SWEEP_CURSOR_MAX_BYTES2))}`),
  check41("orphan_sweeps_organization_not_global", sql46.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`))
]);
// src/schema/playbook-suggestions.ts
import { sql as sql47 } from "drizzle-orm";
import {
  check as check42,
  customType as customType19,
  index as index50,
  jsonb as jsonb24,
  primaryKey as primaryKey30,
  text as text59,
  timestamp as timestamp53,
  uniqueIndex as uniqueIndex22
} from "drizzle-orm/pg-core";
var SUGGESTION_KINDS2 = ["objection_answer", "discovery_question", "closing_move"];
var SUGGESTION_STATUSES2 = ["pending", "accepted", "rejected"];
var MAX_SUGGESTION_TEXT_LENGTH2 = 1000;
var MAX_SUGGESTION_MOMENTS2 = 10;
var SUGGESTION_FINGERPRINT_BYTES2 = 32;
var bytes16 = customType19({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var list22 = (values) => sql47.raw(values.map((v) => `'${v}'`).join(", "));
var idShape24 = (column, prefix) => sql47.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var notGlobal20 = sql47.raw(`"organization_id" <> '${GLOBAL_SCOPE_ORGANIZATION_ID2}'`);
var ts22 = (name) => timestamp53(name, { withTimezone: true });
var suggestions2 = playbookSchema2.table("suggestions", {
  id: text59("id").notNull(),
  organizationId: text59("organization_id").notNull(),
  kind: text59("kind", { enum: SUGGESTION_KINDS2 }).notNull(),
  status: text59("status", { enum: SUGGESTION_STATUSES2 }).notNull().default("pending"),
  text: text59("text").notNull(),
  fingerprint: bytes16("fingerprint").notNull(),
  dealRecordId: text59("deal_record_id").notNull(),
  moments: jsonb24("moments").notNull().default(sql47`'[]'::jsonb`),
  createdAt: ts22("created_at").notNull().defaultNow(),
  decidedAt: ts22("decided_at"),
  decidedByMembershipId: text59("decided_by_membership_id")
}, (t) => [
  primaryKey30({ name: "suggestions_pkey", columns: [t.organizationId, t.id] }),
  check42("suggestions_id_shape", idShape24("id", "sgs")),
  check42("suggestions_organization_id_shape", idShape24("organization_id", "org")),
  check42("suggestions_organization_not_global", notGlobal20),
  check42("suggestions_kind_known", sql47`${t.kind} in (${list22(SUGGESTION_KINDS2)})`),
  check42("suggestions_status_known", sql47`${t.status} in (${list22(SUGGESTION_STATUSES2)})`),
  check42("suggestions_text_length", sql47`char_length(btrim(${t.text})) between 1 and ${sql47.raw(String(MAX_SUGGESTION_TEXT_LENGTH2))}`),
  check42("suggestions_fingerprint_length", sql47`octet_length(${t.fingerprint}) = ${sql47.raw(String(SUGGESTION_FINGERPRINT_BYTES2))}`),
  check42("suggestions_deal_record_id_shape", idShape24("deal_record_id", "deal")),
  check42("suggestions_moments_shape", sql47`jsonb_typeof(${t.moments}) = 'array' and jsonb_array_length(${t.moments}) <= ${sql47.raw(String(MAX_SUGGESTION_MOMENTS2))}`),
  check42("suggestions_decided_by_shape", sql47`${t.decidedByMembershipId} is null or ${t.decidedByMembershipId} ~ '^mem_[0-9a-f]{32}$'`),
  check42("suggestions_decision_columns", sql47`(${t.status} = 'pending' and ${t.decidedAt} is null and ${t.decidedByMembershipId} is null)
        or (${t.status} <> 'pending' and ${t.decidedAt} is not null and ${t.decidedByMembershipId} is not null)`),
  uniqueIndex22("suggestions_fingerprint_key").on(t.organizationId, t.fingerprint),
  index50("suggestions_list_idx").on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index50("suggestions_status_list_idx").on(t.organizationId, t.status, t.createdAt.desc(), t.id.desc())
]);
// src/schema/playbook-work-hints.ts
import { sql as sql48 } from "drizzle-orm";
import { check as check43, index as index51, primaryKey as primaryKey31, text as text60, timestamp as timestamp54 } from "drizzle-orm/pg-core";
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
  kind: text60("kind", { enum: WORK_KINDS2 }).notNull(),
  organizationId: text60("organization_id").notNull(),
  dueAt: timestamp54("due_at", { withTimezone: true }).notNull()
}, (t) => [
  primaryKey31({ name: "work_hints_pkey", columns: [t.kind, t.organizationId] }),
  check43("work_hints_kind_known", sql48`${t.kind} in (${sql48.raw(WORK_KINDS2.map((k) => `'${k}'`).join(", "))})`),
  check43("work_hints_organization_id_shape", sql48.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`)),
  check43("work_hints_global_only_consumed", sql48`${t.kind} = 'consumed_purge' or ${t.organizationId} <> ${sql48.raw(`'${GLOBAL_SCOPE_ORGANIZATION_ID2}'`)}`),
  index51("work_hints_due_idx").on(t.kind, t.dueAt, t.organizationId)
]);
// src/schema/voice-copilot.ts
import { sql as sql49 } from "drizzle-orm";
import {
  boolean as boolean20,
  check as check44,
  foreignKey as foreignKey22,
  index as index52,
  integer as integer35,
  jsonb as jsonb25,
  primaryKey as primaryKey32,
  text as text61,
  timestamp as timestamp55,
  uniqueIndex as uniqueIndex23
} from "drizzle-orm/pg-core";
var CALL_TURN_TRACKS2 = ["rep", "prospect"];
var MAX_CALL_TURN_TEXT_LENGTH2 = 4000;
var COPILOT_CARD_KINDS2 = ["similar_moment", "objection", "next_step", "document"];
var COPILOT_OBJECTION_TYPES2 = [
  "price",
  "timing",
  "competitor",
  "authority",
  "need",
  "trust"
];
var COPILOT_RATINGS2 = ["useful", "not_useful"];
var MAX_COPILOT_CARDS_PER_CALL2 = 60;
var MAX_COPILOT_CITED_MOMENTS2 = 5;
var MAX_COPILOT_CARD_TEXT_LENGTH2 = 600;
var MAX_COPILOT_EVIDENCE2 = 100;
var MIN_COPILOT_MIN_EVIDENCE2 = 1;
var MAX_COPILOT_MIN_EVIDENCE2 = 20;
var DEFAULT_COPILOT_MIN_MOMENTS2 = 3;
var DEFAULT_COPILOT_MIN_DEALS2 = 2;
var list23 = (values) => sql49.raw(values.map((v) => `'${v}'`).join(", "));
var num11 = (value) => sql49.raw(String(value));
var idShape25 = (column, prefix) => sql49.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var orgShape17 = sql49.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal21 = sql49.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var ts23 = (name) => timestamp55(name, { withTimezone: true });
var MAX_QUOTES_BYTES = 24576;
var MAX_CITED_BYTES = 1024;
var voiceCallTurns2 = voiceSchema2.table("call_turns", {
  organizationId: text61("organization_id").notNull(),
  callId: text61("call_id").notNull(),
  track: text61("track", { enum: CALL_TURN_TRACKS2 }).notNull(),
  sequence: integer35("sequence").notNull(),
  text: text61("text").notNull(),
  startMs: integer35("start_ms").notNull(),
  endMs: integer35("end_ms").notNull(),
  createdAt: ts23("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey32({
    name: "call_turns_pkey",
    columns: [t.organizationId, t.callId, t.track, t.sequence]
  }),
  check44("call_turns_organization_id_shape", orgShape17),
  check44("call_turns_organization_not_global", notGlobal21),
  check44("call_turns_call_id_shape", idShape25("call_id", "call")),
  check44("call_turns_track_known", sql49`${t.track} in (${list23(CALL_TURN_TRACKS2)})`),
  check44("call_turns_sequence_range", sql49`${t.sequence} >= 1`),
  check44("call_turns_text_shape", sql49`char_length(${t.text}) between 1 and ${num11(MAX_CALL_TURN_TEXT_LENGTH2)}`),
  check44("call_turns_times_range", sql49`${t.startMs} between 0 and ${num11(MAX_CALL_DURATION_SECONDS2 * 1000)}
        and ${t.endMs} between ${t.startMs} and ${num11(MAX_CALL_DURATION_SECONDS2 * 1000)}`),
  foreignKey22({
    name: "call_turns_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [voiceCalls2.organizationId, voiceCalls2.id]
  }).onDelete("cascade"),
  index52("call_turns_time_idx").on(t.organizationId, t.callId, t.startMs, t.track, t.sequence)
]);
var voiceCopilotCards2 = voiceSchema2.table("copilot_cards", {
  id: text61("id").notNull(),
  organizationId: text61("organization_id").notNull(),
  callId: text61("call_id").notNull(),
  sequence: integer35("sequence").notNull(),
  kind: text61("kind", { enum: COPILOT_CARD_KINDS2 }).notNull(),
  evidenceMoments: integer35("evidence_moments").notNull(),
  evidenceDeals: integer35("evidence_deals").notNull(),
  citedMoments: jsonb25("cited_moments").$type().notNull(),
  quotes: jsonb25("quotes").$type().notNull().default(sql49`'[]'::jsonb`),
  objectionType: text61("objection_type", { enum: COPILOT_OBJECTION_TYPES2 }),
  response: text61("response"),
  nextStep: text61("next_step"),
  documentId: text61("document_id"),
  documentPage: integer35("document_page"),
  documentPassage: text61("document_passage"),
  shownAt: ts23("shown_at").notNull().defaultNow(),
  rating: text61("rating", { enum: COPILOT_RATINGS2 }),
  dismissed: boolean20("dismissed").notNull().default(false),
  pinned: boolean20("pinned").notNull().default(false),
  updatedAt: ts23("updated_at").notNull().defaultNow()
}, (t) => [
  primaryKey32({ name: "copilot_cards_pkey", columns: [t.organizationId, t.id] }),
  check44("copilot_cards_id_shape", idShape25("id", "ccard")),
  check44("copilot_cards_organization_id_shape", orgShape17),
  check44("copilot_cards_organization_not_global", notGlobal21),
  check44("copilot_cards_call_id_shape", idShape25("call_id", "call")),
  check44("copilot_cards_sequence_range", sql49`${t.sequence} between 1 and ${num11(MAX_COPILOT_CARDS_PER_CALL2)}`),
  check44("copilot_cards_kind_known", sql49`${t.kind} in (${list23(COPILOT_CARD_KINDS2)})`),
  check44("copilot_cards_evidence_range", sql49`${t.evidenceMoments} between 1 and ${num11(MAX_COPILOT_EVIDENCE2)}
        and ${t.evidenceDeals} between 1 and ${t.evidenceMoments}`),
  check44("copilot_cards_cited_shape", sql49`jsonb_typeof(${t.citedMoments}) = 'array'
        and jsonb_array_length(${t.citedMoments}) between 1 and ${num11(MAX_COPILOT_CITED_MOMENTS2)}
        and octet_length(${t.citedMoments}::text) <= ${num11(MAX_CITED_BYTES)}
        and jsonb_array_length(${t.citedMoments}) <= ${t.evidenceMoments}
        and jsonb_array_length(jsonb_path_query_array(${t.citedMoments},
          '$[*] ? (@.callId like_regex "^call_[0-9a-f]{32}$" && @.dealRecordId like_regex "^deal_[0-9a-f]{32}$")'))
          = jsonb_array_length(${t.citedMoments})`),
  check44("copilot_cards_quotes_shape", sql49`jsonb_typeof(${t.quotes}) = 'array'
        and jsonb_array_length(${t.quotes}) <= ${num11(MAX_COPILOT_CITED_MOMENTS2)}
        and octet_length(${t.quotes}::text) <= ${num11(MAX_QUOTES_BYTES)}`),
  check44("copilot_cards_objection_type_known", sql49`${t.objectionType} is null or ${t.objectionType} in (${list23(COPILOT_OBJECTION_TYPES2)})`),
  check44("copilot_cards_rating_known", sql49`${t.rating} is null or ${t.rating} in (${list23(COPILOT_RATINGS2)})`),
  check44("copilot_cards_response_shape", sql49`${t.response} is null or char_length(${t.response}) between 1 and ${num11(MAX_COPILOT_CARD_TEXT_LENGTH2)}`),
  check44("copilot_cards_next_step_shape", sql49`${t.nextStep} is null or char_length(${t.nextStep}) between 1 and ${num11(MAX_COPILOT_CARD_TEXT_LENGTH2)}`),
  check44("copilot_cards_document_id_shape", idShape25("document_id", "doc")),
  check44("copilot_cards_document_page_range", sql49`${t.documentPage} is null or ${t.documentPage} between 1 and ${num11(MAX_DOCUMENT_PAGES2)}`),
  check44("copilot_cards_document_passage_shape", sql49`${t.documentPassage} is null or char_length(${t.documentPassage}) between 1 and ${num11(MAX_COPILOT_QUOTE_LENGTH2)}`),
  check44("copilot_cards_kind_columns", sql49`(${t.kind} = 'objection') = (${t.objectionType} is not null and ${t.response} is not null)
        and (${t.kind} = 'objection' or (${t.objectionType} is null and ${t.response} is null))
        and (${t.kind} = 'next_step') = (${t.nextStep} is not null)
        and (${t.kind} = 'document') = (${t.documentId} is not null and ${t.documentPassage} is not null)
        and (${t.kind} = 'document' or ${t.documentPage} is null)`),
  check44("copilot_cards_dismissed_or_pinned", sql49`not (${t.dismissed} and ${t.pinned})`),
  foreignKey22({
    name: "copilot_cards_call_fk",
    columns: [t.organizationId, t.callId],
    foreignColumns: [voiceCalls2.organizationId, voiceCalls2.id]
  }).onDelete("cascade"),
  uniqueIndex23("copilot_cards_call_sequence_key").on(t.organizationId, t.callId, t.sequence),
  index52("copilot_cards_shown_idx").on(t.organizationId, t.callId, t.shownAt, t.id)
]);
var voiceCopilotSettings2 = voiceSchema2.table("copilot_settings", {
  organizationId: text61("organization_id").notNull(),
  enabled: boolean20("enabled").notNull().default(false),
  minMoments: integer35("min_moments").notNull().default(DEFAULT_COPILOT_MIN_MOMENTS2),
  minDeals: integer35("min_deals").notNull().default(DEFAULT_COPILOT_MIN_DEALS2),
  updatedAt: ts23("updated_at").notNull().defaultNow(),
  updatedByMembershipId: text61("updated_by_membership_id")
}, (t) => [
  primaryKey32({ name: "copilot_settings_pkey", columns: [t.organizationId] }),
  check44("copilot_settings_organization_id_shape", orgShape17),
  check44("copilot_settings_organization_not_global", notGlobal21),
  check44("copilot_settings_min_range", sql49`${t.minMoments} between ${num11(MIN_COPILOT_MIN_EVIDENCE2)} and ${num11(MAX_COPILOT_MIN_EVIDENCE2)}
        and ${t.minDeals} between ${num11(MIN_COPILOT_MIN_EVIDENCE2)} and ${t.minMoments}`),
  check44("copilot_settings_updated_by_membership_id_shape", idShape25("updated_by_membership_id", "mem"))
]);
// src/schema/voice-idempotency.ts
import { sql as sql50 } from "drizzle-orm";
import {
  check as check45,
  customType as customType20,
  index as index53,
  jsonb as jsonb26,
  primaryKey as primaryKey33,
  smallint as smallint14,
  text as text62,
  timestamp as timestamp56
} from "drizzle-orm/pg-core";
var idShape26 = (column, prefix) => sql50.raw(`"${column}" ~ '^${prefix}_[0-9a-f]{32}$'`);
var bytes17 = customType20({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value)
});
var voiceIdempotencyKeys2 = voiceSchema2.table("idempotency_keys", {
  organizationId: text62("organization_id").notNull(),
  userId: text62("user_id").notNull(),
  route: text62("route").notNull(),
  key: text62("key").notNull(),
  requestHash: bytes17("request_hash").notNull(),
  status: smallint14("status"),
  response: jsonb26("response").$type(),
  createdAt: timestamp56("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  primaryKey33({
    name: "idempotency_keys_pkey",
    columns: [t.organizationId, t.userId, t.route, t.key]
  }),
  check45("idempotency_keys_organization_id_shape", idShape26("organization_id", "org")),
  check45("idempotency_keys_organization_not_global", sql50.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`)),
  check45("idempotency_keys_user_id_shape", idShape26("user_id", "usr")),
  check45("idempotency_keys_route_shape", sql50`char_length(${t.route}) between 1 and ${sql50.raw(String(IDEMPOTENCY_ROUTE_MAX2))}
        and ${t.route} collate "C" ~ '^[a-z0-9._]+$'`),
  check45("idempotency_keys_key_shape", sql50`char_length(${t.key}) between 1 and ${sql50.raw(String(IDEMPOTENCY_KEY_MAX2))}
        and ${t.key} collate "C" ~ '^[!-~]+$'`),
  check45("idempotency_keys_request_hash_length", sql50`octet_length(${t.requestHash}) = ${sql50.raw(String(IDEMPOTENCY_HASH_BYTES2))}`),
  check45("idempotency_keys_status_range", sql50`${t.status} between 100 and 599`),
  check45("idempotency_keys_response_matches_status", sql50`(${t.status} is null) = (${t.response} is null)`),
  check45("idempotency_keys_response_size", sql50`octet_length(${t.response}::text) <= ${sql50.raw(String(IDEMPOTENCY_RESPONSE_MAX_BYTES2))}`),
  index53("idempotency_keys_purge_idx").on(t.organizationId, t.createdAt)
]);
// src/schema/voice-twilio.ts
import { sql as sql51 } from "drizzle-orm";
import {
  boolean as boolean21,
  check as check46,
  foreignKey as foreignKey23,
  index as index54,
  integer as integer36,
  primaryKey as primaryKey34,
  text as text63,
  timestamp as timestamp57
} from "drizzle-orm/pg-core";
var MAX_TWILIO_RING_IDENTITIES2 = 100;
var MAX_TWILIO_PROVIDER_ID_LENGTH2 = 128;
var MAX_TWILIO_PLACEMENT_KEY_LENGTH2 = 255;
var MAX_TWILIO_FINGERPRINT_LENGTH2 = 128;
var TWILIO_DIRECTORY_KINDS2 = ["call", "recording"];
var list24 = (values) => sql51.raw(values.map((v) => `'${v}'`).join(", "));
var orgShape18 = sql51.raw(`"organization_id" ~ '^org_[0-9a-f]{32}$'`);
var notGlobal22 = sql51.raw(`"organization_id" <> 'org_00000000000000000000000000000000'`);
var providerIdShape = (column) => sql51.raw(`char_length("${column}") between 1 and ${MAX_TWILIO_PROVIDER_ID_LENGTH2} and "${column}" collate "C" ~ '^[A-Za-z0-9._:-]+$'`);
var ts24 = (name) => timestamp57(name, { withTimezone: true });
var voiceTwilioCalls2 = voiceSchema2.table("twilio_calls", {
  organizationId: text63("organization_id").notNull(),
  providerCallId: text63("provider_call_id").notNull(),
  callId: text63("call_id"),
  direction: text63("direction", { enum: VOICE_CALL_DIRECTIONS2 }).notNull(),
  disclosureWordingVersion: integer36("disclosure_wording_version"),
  disclosureAiAssisted: boolean21("disclosure_ai_assisted"),
  disclosurePlayedAt: ts24("disclosure_played_at"),
  disclosureStarted: boolean21("disclosure_started").notNull().default(false),
  bridgedTo: text63("bridged_to"),
  ringIdentities: text63("ring_identities").array().notNull().default(sql51`'{}'::text[]`),
  recordingId: text63("recording_id"),
  streamId: text63("stream_id"),
  createdAt: ts24("created_at").notNull().defaultNow(),
  updatedAt: ts24("updated_at").notNull().defaultNow(),
  expiresAt: ts24("expires_at").notNull()
}, (t) => [
  primaryKey34({ name: "twilio_calls_pkey", columns: [t.organizationId, t.providerCallId] }),
  check46("twilio_calls_organization_id_shape", orgShape18),
  check46("twilio_calls_organization_not_global", notGlobal22),
  check46("twilio_calls_provider_call_id_shape", providerIdShape("provider_call_id")),
  check46("twilio_calls_call_id_shape", sql51.raw(`"call_id" ~ '^call_[0-9a-f]{32}$'`)),
  check46("twilio_calls_bridged_to_shape", sql51.raw(`"bridged_to" ~ '^mem_[0-9a-f]{32}$'`)),
  check46("twilio_calls_direction_known", sql51`${t.direction} in (${list24(VOICE_CALL_DIRECTIONS2)})`),
  check46("twilio_calls_disclosure_all_or_none", sql51`(${t.disclosureWordingVersion} is null) = (${t.disclosureAiAssisted} is null)
        and (${t.disclosureWordingVersion} is null) = (${t.disclosurePlayedAt} is null)
        and (${t.disclosureWordingVersion} is null or ${t.disclosureWordingVersion} >= 1)`),
  check46("twilio_calls_ring_identities_bounds", sql51`coalesce(cardinality(${t.ringIdentities}), 0) <= ${sql51.raw(String(MAX_TWILIO_RING_IDENTITIES2))}
        and array_position(${t.ringIdentities}, null) is null
        and array_to_string(${t.ringIdentities}, ',') ~ '^(mem_[0-9a-f]{32}(,mem_[0-9a-f]{32})*)?$'`),
  check46("twilio_calls_recording_id_shape", sql51`${t.recordingId} is null or (${sql51.raw(`char_length("recording_id") between 1 and ${MAX_TWILIO_PROVIDER_ID_LENGTH2}`)})`),
  check46("twilio_calls_stream_id_shape", sql51`${t.streamId} is null or (${sql51.raw(`char_length("stream_id") between 1 and ${MAX_TWILIO_PROVIDER_ID_LENGTH2}`)})`),
  check46("twilio_calls_expires_after_creation", sql51`${t.expiresAt} > ${t.createdAt}`),
  index54("twilio_calls_purge_idx").on(t.organizationId, t.expiresAt)
]);
var voiceTwilioRecordings2 = voiceSchema2.table("twilio_recordings", {
  organizationId: text63("organization_id").notNull(),
  recordingId: text63("recording_id").notNull(),
  providerCallId: text63("provider_call_id").notNull(),
  createdAt: ts24("created_at").notNull().defaultNow()
}, (t) => [
  primaryKey34({ name: "twilio_recordings_pkey", columns: [t.organizationId, t.recordingId] }),
  check46("twilio_recordings_organization_id_shape", orgShape18),
  check46("twilio_recordings_organization_not_global", notGlobal22),
  check46("twilio_recordings_recording_id_shape", providerIdShape("recording_id")),
  check46("twilio_recordings_provider_call_id_shape", providerIdShape("provider_call_id")),
  foreignKey23({
    name: "twilio_recordings_call_fk",
    columns: [t.organizationId, t.providerCallId],
    foreignColumns: [voiceTwilioCalls2.organizationId, voiceTwilioCalls2.providerCallId]
  }).onDelete("cascade"),
  index54("twilio_recordings_call_idx").on(t.organizationId, t.providerCallId)
]);
var voiceTwilioPlacements2 = voiceSchema2.table("twilio_placements", {
  organizationId: text63("organization_id").notNull(),
  idempotencyKey: text63("idempotency_key").notNull(),
  providerCallId: text63("provider_call_id").notNull(),
  fingerprint: text63("fingerprint").notNull(),
  createdAt: ts24("created_at").notNull().defaultNow(),
  expiresAt: ts24("expires_at").notNull()
}, (t) => [
  primaryKey34({ name: "twilio_placements_pkey", columns: [t.organizationId, t.idempotencyKey] }),
  check46("twilio_placements_organization_id_shape", orgShape18),
  check46("twilio_placements_organization_not_global", notGlobal22),
  check46("twilio_placements_idempotency_key_shape", sql51`char_length(${t.idempotencyKey}) between 1 and ${sql51.raw(String(MAX_TWILIO_PLACEMENT_KEY_LENGTH2))}`),
  check46("twilio_placements_provider_call_id_shape", providerIdShape("provider_call_id")),
  check46("twilio_placements_fingerprint_shape", sql51`char_length(${t.fingerprint}) between 1 and ${sql51.raw(String(MAX_TWILIO_FINGERPRINT_LENGTH2))}`),
  check46("twilio_placements_expires_after_creation", sql51`${t.expiresAt} > ${t.createdAt}`),
  index54("twilio_placements_purge_idx").on(t.organizationId, t.expiresAt)
]);
var voiceTwilioDirectory2 = voiceSchema2.table("twilio_directory", {
  kind: text63("kind", { enum: TWILIO_DIRECTORY_KINDS2 }).notNull(),
  refId: text63("ref_id").notNull(),
  organizationId: text63("organization_id").notNull(),
  providerCallId: text63("provider_call_id").notNull()
}, (t) => [
  primaryKey34({ name: "twilio_directory_pkey", columns: [t.kind, t.refId] }),
  check46("twilio_directory_kind_known", sql51`${t.kind} in (${list24(TWILIO_DIRECTORY_KINDS2)})`),
  check46("twilio_directory_ref_id_shape", providerIdShape("ref_id")),
  check46("twilio_directory_organization_id_shape", orgShape18),
  check46("twilio_directory_organization_not_global", notGlobal22),
  check46("twilio_directory_provider_call_id_shape", providerIdShape("provider_call_id"))
]);
export { authSchema2, workspaces2, projects2, ENVIRONMENT_KINDS2, environments2, TENANT_SETTING, ABANDON_CASE_MAX_ATTEMPTS2, ABANDON_CASE_OUTCOMES2, abandonCases2, API_KEY_KINDS2, apiKeys2, ATTEMPT_COUNTER_KINDS2, ATTEMPT_COUNTER_MAX_HITS2, ATTEMPT_COUNTER_KEY_HASH_BYTES2, attemptCounters2, AUDIT_ACTOR_TYPES2, AUDIT_RETENTION_FLOOR2, auditLogs2, users2, backupCodes2, CREDENTIAL_TYPES2, credentials2, environmentSettings2, EVENT_RETENTION_FLOOR2, events2, flowAttempts2, hooks2, hookCallCounts2, IDENTITY_PROVIDERS2, identities2, instanceAuditLogs2, nativeApps2, OAUTH_PROVIDERS2, oauthProviders2, PASSKEY_CHALLENGE_PURPOSES2, passkeyChallenges2, passkeys2, passwordHistory2, proposals2, SESSION_CLIENTS2, SESSION_REVOKE_REASONS2, SESSION_TYPES2, sessions2, REFRESH_SEALED_NEXT_TOKEN_MAX_BYTES2, refreshTokens2, SIGNING_KEY_STATUSES2, signingKeys2, SMS_COUNT_RETENTION_FLOOR_DAYS2, smsCodeCounts2, USER_FACTOR_TYPES2, userFactors2, VERIFICATION_PURPOSES2, verificationTokens2, webhookEndpoints2, WEBHOOK_DELIVERY_STATES2, WEBHOOK_DELIVERY_RETENTION_FLOOR2, webhookDeliveries2, webhookDeliveryAttempts2, coreSchema2, MEMBERSHIP_ROLES2, INVITATION_ROLES2, ORGANIZATION_REGIONS2, ORGANIZATION_STATUSES2, INVITATION_STATES2, MEMBER_NAME_MAX2, IDEMPOTENCY_ROUTE_MAX2, IDEMPOTENCY_KEY_MAX2, IDEMPOTENCY_HASH_BYTES2, IDEMPOTENCY_RESPONSE_MAX_BYTES2, organizations2, memberships2, teams2, teamMembers2, invitations2, membershipDirectory2, invitationDirectory2, organizationState2, idempotencyKeys2, ROLLUP_METRICS2, ROLLUP_GROUP_KINDS2, MAX_ROLLUP_GROUP_KEY_LENGTH2, MAX_ROLLUP_COUNT2, TOUCH_KINDS2, TOUCH_CHANNELS2, TOUCH_AGENT_KINDS2, MAX_TOUCH_SOURCES2, SOURCE_KINDS2, MAX_SOURCE_KEY_LENGTH2, SOURCE_PERFORMANCE_FLAGS2, MAX_SOURCE_DEALS2, ASSESSMENT_SUBJECT_KINDS2, ASSESSMENT_VERDICTS2, ASSESSMENT_JUDGE_SOURCES2, FINDING_CATEGORIES2, FINDING_SEVERITIES2, FINDING_FEEDBACKS2, MAX_FINDING_SPAN_OFFSET2, MAX_FINDING_EXPLANATION_LENGTH2, MAX_ASSESSED_NUMBER2, CONVERSATION_OUTCOME_LABELS2, MAX_SUMMARY_LENGTH2, rollupDaily2, analyticsEvents2, touches2, sourcePerformance2, assessments2, assessmentFindings2, conversationSummaries2, PROSPECT_IDENTITY_KINDS2, PROSPECT_STATUSES2, PROSPECT_FIELD_NAMES2, PROSPECT_COMPANY_FIELD_NAMES2, MAX_PROSPECT_COMPANY_TEXT_LENGTH2, MAX_PROSPECT_TECHNOLOGIES_VALUE_LENGTH2, MAX_PROSPECT_COMPANY_TECHNOLOGIES2, MAX_PROSPECT_COMPANY_TECHNOLOGY_LENGTH2, FIELD_HISTORY_STATES2, MAX_FIELD_HISTORY_ENTRIES2, MAX_PROSPECT_FIELD_VALUE_LENGTH2, MAX_SOURCE_REF_LENGTH2, MAX_PROSPECT_COMPANY_NAME_LENGTH2, MAX_PROSPECT_NOTES_LENGTH2, MAX_PROSPECT_TAG_LENGTH2, MAX_PROSPECT_TAGS2, MAX_PROSPECT_IMPORT_BYTES2, MAX_PROSPECT_IMPORT_ROWS2, PROSPECT_IMPORT_STATES2, PROSPECT_IMPORT_FAILURE_REASONS2, PROSPECT_IMPORT_ROW_RESULTS2, PROSPECT_IMPORT_SKIP_REASONS2, PROSPECT_IMPORT_REJECT_REASONS2, PROSPECT_MERGE_STATES2, PROSPECT_MERGE_UNDO_DAYS2, MAX_MERGED_PROSPECTS2, MAX_MERGE_SNAPSHOT_BYTES2, SOURCE_KIND_PATTERN2, IDENTITY_VALUE_PATTERNS2, prospectCompanies2, prospects2, prospectIdentities2, prospectFields2, prospectCompanyFields2, prospectImports2, prospectImportRows2, prospectMerges2, CALENDAR_PROVIDERS2, CALENDAR_CONNECTION_STATES2, BOOKING_MODES2, BOOKING_STATES2, BOOKING_ORIGINS2, ROUTING_TARGET_KINDS2, ROUTING_PURPOSES2, MAX_ROUTING_POOL_MEMBERS2, MAX_ROUTING_RULES2, MAX_WORKING_WINDOWS2, calendarConnections2, workingHours2, bookingTypes2, bookingTypeDirectory2, routingRules2, routingState2, routingDecisions2, busyBlocks2, bookings2, bookingManageDirectory2, CONSENT_CHANNELS2, CONSENT_GRANT_SOURCES2, CONSENT_WITHDRAWAL_SOURCES2, CONSENT_EVENT_KINDS2, MAX_EVIDENCE_REF_LENGTH2, MAX_SUBMISSION_IP_LENGTH2, MAX_SUBMISSION_USER_AGENT_LENGTH2, MAX_CONSENT_WORDING_LENGTH2, MAX_CONSENT_FORM_NAME_LENGTH2, CONSENT_FORM_STATES2, SUPPRESSION_REASONS2, SUPPRESSION_ADDRESS_KINDS2, SUPPRESSION_REMOVABLE_REASONS2, MAX_SUPPRESSION_NOTE_LENGTH2, MAX_SUPPRESSION_SOURCE_REF_LENGTH2, MAX_MASKED_ADDRESS_LENGTH2, CONTACT_PURPOSES2, LOGGED_DENIAL_CODES2, CONTACT_ALLOW_BASES2, MAX_CALLER_LENGTH2, ADDRESS_HASH_BYTES2, CONTACT_CHECK_RETENTION_DAYS2, FORM_TOKEN_PATTERN2, MIN_FORM_TOKEN_LENGTH2, MAX_FORM_TOKEN_LENGTH2, consentWordings2, consentForms2, consentFormDirectory2, contactConsentEvents2, suppressionEntries2, contactCheckLog2, MAX_SUPPRESSION_IMPORT_ROWS2, MAX_SUPPRESSION_IMPORT_BYTES2, SUPPRESSION_IMPORT_STATES2, SUPPRESSION_IMPORT_FAILURE_REASONS2, SUPPRESSION_IMPORT_ROW_RESULTS2, SUPPRESSION_IMPORT_ROW_REASONS2, suppressionImports2, suppressionImportRows2, AGENT_KINDS2, MAX_AGENT_INSTRUCTION_LENGTH2, CONTROL_LEVELS2, AGENT_SETTING_CHANNELS2, DEFAULT_CHANNEL2, ORGANIZATION_AGENT_KIND2, MAX_ESCALATION_RULES2, AUDIT_ACTOR_KINDS2, MAX_AUDIT_METADATA_BYTES2, EXPORT_KINDS2, EXPORT_FORMATS2, EXPORT_STATES2, EXPORT_ACTIVE_STATES2, EXPORT_FAILURE_REASONS2, EXPORT_SERVICES2, EXPORT_PART_STATES2, EXPORT_PART_FAILURE_REASONS2, MAX_EXPORT_PART_FILES2, MAX_EXPORT_PART_BYTES2, MAX_EXPORT_PREFIX_LENGTH2, API_KEY_SCOPES2, MAX_API_KEY_NAME_LENGTH2, API_KEY_ROLE_CEILINGS2, agentInstructionVersions2, agentInstructionPointers2, agentSettings2, auditEvents2, exportJobs2, exportParts2, coreApiKeys2, apiKeyUsage2, CRM_PROVIDERS2, CRM_OBJECT_KINDS2, CRM_SCOPE_LEVELS2, CRM_CONNECTION_STATES2, CRM_DIRECTIONS2, CRM_STAGE_OUTCOMES2, CRM_FIELD_KEYS2, CRM_MAPPING_KINDS2, CRM_RUN_TRIGGERS2, CRM_RUN_STATES2, CRM_RUN_ERROR_CODES2, CRM_REF_STATES2, MAX_CRM_EXTERNAL_ID_LENGTH2, MAX_CRM_LABEL_LENGTH2, MAX_CRM_RUN_COUNT2, CRM_SKIP_REASON_COUNT2, MAX_CRM_RUN_FAILURES2, MAX_CRM_SEALED_TOKEN_BYTES2, MAX_CRM_KEY_ID_LENGTH2, MAX_CRM_CURSOR_LENGTH2, MAX_CRM_WRITE_KEY_LENGTH2, MAX_CRM_LOCAL_ID_LENGTH2, CRM_WEBHOOK_WINDOW_SECONDS2, crmConnections2, crmMappings2, crmSyncRuns2, crmExternalRefs2, crmWebhookReceipts2, DEMO_RATE_ADDRESS_HASH_BYTES2, demoRateCounters2, DEMO_NOTIFICATION_STATUSES2, DEMO_REQUEST_NAME_MAX2, DEMO_REQUEST_MESSAGE_MAX2, DEMO_REQUEST_SOURCE_PAGE_MAX2, DEMO_REQUEST_KEY_LENGTH2, demoRequests2, INBOX_CHANNELS2, CONVERSATION_CONTROLLERS2, CONVERSATION_STATES2, MESSAGE_DIRECTIONS2, MESSAGE_AUTHOR_KINDS2, REPLY_LABELS2, CLASSIFICATION_DECIDERS2, MAX_MESSAGE_BODY_LENGTH2, MAX_PROVIDER_MESSAGE_ID_LENGTH2, MAX_PENDING_DRAFT_COUNT2, DRAFT_AUTHORS2, DRAFT_STATUSES2, DRAFT_HOLD_REASONS2, MAX_STRATEGY_LENGTH2, MAX_DRAFT_CHECKS2, DRAFT_SOURCE_KINDS2, SOURCE_OUTCOMES2, MAX_EVIDENCE_COUNT2, DECISION_KINDS2, MAX_DECISION_NOTE_LENGTH2, APPROVAL_MODES2, MAX_EXCEPT_LABELS2, ESCALATION_TRIGGERS2, ESCALATION_TARGETS2, conversations2, messages2, drafts2, draftSources2, approvalDecisions2, approvalPolicies2, escalationRules2, OUTBOX_MAX_ATTEMPTS2, OUTBOX_TOPIC_MAX_LENGTH2, OUTBOX_DEDUPE_KEY_MAX_LENGTH2, OUTBOX_PAYLOAD_MAX_BYTES2, OUTBOX_ERROR_CODE_MAX_LENGTH2, OUTBOX_MAX_BATCH2, OUTBOX_MIN_LEASE_MS2, OUTBOX_MAX_LEASE_MS2, OUTBOX_MAX_RETRY_DELAY_MS2, outbox2, outboundSchema2, MAILBOX_PROVIDERS2, MAILBOX_KINDS2, MAILBOX_STATES2, MAILBOX_STATE_REASONS2, HEALTH_EFFECTS2, WEEKDAYS2, SEND_STATES2, SEND_REFUSAL_REASONS2, SEND_DEFERRING_REASONS2, SEND_CHECKS2, MAIL_EVENT_KINDS2, HEALTH_COMPONENT_KINDS2, MAX_MAILBOX_TEAMS2, MAX_MAILBOX_NAME_LENGTH2, MAX_SENDS_PER_DAY2, MAX_SENDS_PER_HOUR2, MAX_MIN_GAP_SECONDS2, MAX_SEQUENCE_STEP2, MAX_ATTEMPT_EPOCH2, MAX_MAIL_PROVIDER_MESSAGE_ID_LENGTH2, MAX_PROVIDER_REFERENCE_LENGTH2, MAX_TOKEN_CIPHERTEXT_BYTES2, MAX_HEALTH_COMPONENTS2, MAX_HEALTH_COUNT2, mailboxes2, mailboxLimits2, mailMessages2, mailEvents2, healthDaily2, mailboxConnectAttempts2, mailboxTestSends2, DRAFT_CHANNELS2, OUTBOUND_LANGUAGES2, DRAFT_CHECKS2, DRAFT_CHECK_RESULTS2, DRAFT_TEXT_SOURCES2, ANGLE_ORIGINS2, CITATION_KINDS2, CITATION_PROSPECT_FIELDS2, BRIEF_ENTRY_ROLES2, MAX_BRIEF_STATEMENTS2, MAX_BRIEF_STATEMENT_LENGTH2, MAX_ANGLE_LENGTH2, MAX_DRAFT_CITATIONS2, MAX_DRAFT_SUBJECT_LENGTH2, MAX_DRAFT_BODY_LENGTH2, MAX_DRAFT_GOAL_LENGTH2, MAX_STEP_KEY_LENGTH2, MAX_MODEL_NAME_LENGTH2, MAX_TONE_LENGTH2, MAX_PREFERRED_WORDS2, MAX_BANNED_PHRASES2, MAX_VOICE_TERM_LENGTH2, MAX_SIGN_OFF_LENGTH2, MAX_VOICE_LENGTH_CHARACTERS2, MIN_VOICE_LENGTH_CHARACTERS2, MAX_VOICE_VERSION2, MAX_CITATION_URL_LENGTH2, MAX_CITATION_DOCUMENT_PAGE2, MAX_DRAFT_REVISION2, MAX_WON_DEAL_COUNT2, MAX_CHECK_COUNT2, MAX_DROPPED_COUNT2, outboundBrandVoices2, outboundBriefs2, outboundBriefStatements2, outboundDrafts2, outboundDraftCitations2, outboundDraftChecks2, outboundModelUsage2, voiceSchema2, playbookSchema2, DOCUMENT_STATES2, DOCUMENT_FAILURE_REASONS2, DOCUMENT_FILE_TYPES2, DOCUMENT_MAX_BYTES2, DOCUMENT_MAX_PAGE_COUNT2, DOCUMENT_PURGE_MAX_ATTEMPTS2, INGESTION_JOB_STATES2, INGESTION_STEPS2, INGESTION_JOB_MAX_ATTEMPTS2, INGESTION_MAX_CHUNKS2, CONSUMED_MESSAGE_STATES2, GLOBAL_SCOPE_ORGANIZATION_ID2, PENDING_CLEANUP_PREDICATE2, documents2, organizationUsage2, ingestionJobs2, indexSettings2, DEAL_OUTCOMES2, DEAL_IMPORT_STATES2, DEAL_IMPORT_FAILURE_REASONS2, DEAL_IMPORT_ROW_RESULTS2, DEAL_IMPORT_ROW_REASONS2, DEAL_IMPORT_ROW_REASONS_WITHOUT_DEAL_ID2, MAX_QUEUED_DEAL_IMPORTS2, DEAL_ID_MAX_LENGTH2, DEAL_ID_MAX_BYTES2, DEAL_NAME_MAX_LENGTH2, DEAL_NAME_MAX_BYTES2, DEAL_IMPORT_MAX_ROWS2, DEAL_IMPORT_MAX_BYTES2, DEAL_MAX_SEQ2, RIGHTS_MAX_WORDING_VERSION2, DEAL_IMPORT_MAX_ATTEMPTS2, DEAL_IMPORT_APPLY_BATCH2, deals2, dealImports2, dealImportRows2, rightsConfirmations2, LINE_STATES2, LINE_ASSIGNMENT_KINDS2, LINE_ASSIGNMENT_ROLES2, DEFAULT_LINE_CONCURRENT_AGENT_CALLS2, DEFAULT_LINE_DAILY_AGENT_DIAL_CAP2, MAX_LINE_CONCURRENT_AGENT_CALLS2, MAX_LINE_DAILY_AGENT_DIAL_CAP2, MAX_LINE_LABEL_LENGTH2, VOICE_CALL_DIRECTIONS2, VOICE_CALL_STATES2, VOICE_CALL_FINAL_STATES2, VOICE_CALL_FAILURE_REASONS2, VOICE_CALL_ENDED_BY2, CALL_END_REASONS2, VOICE_TRANSCRIPT_STATES2, VOICE_TRANSCRIPT_UNAVAILABLE_REASONS2, MAX_CALL_DURATION_SECONDS2, MAX_WRAP_UP_NOTE_LENGTH2, VOICE_RECORDING_STATES2, MAX_RECORDING_KEY_LENGTH2, VOICE_RECORDING_CHANNELS2, VOICE_CALL_EVENT_KINDS2, MAX_PROVIDER_EVENT_ID_LENGTH2, MAX_VOICE_IDEMPOTENCY_KEY_LENGTH2, voiceLines2, voiceLineDirectory2, voiceCalls2, voiceCallEvents2, voiceRecordings2, INQUIRY_SOURCES2, INQUIRY_CALLBACK_STATES2, INQUIRY_SKIP_REASONS2, MAX_CALLBACK_ATTEMPTS2, MAX_SOURCE_URL_LENGTH2, MIN_AGENT_IDEMPOTENCY_KEY_LENGTH2, MAX_AGENT_IDEMPOTENCY_KEY_LENGTH2, AGENT_VOICE_STYLES2, MAX_AGENT_CALL_SECONDS2, MAX_AGENT_CALL_COST_USD_CENTS2, MAX_AGENT_CONCURRENCY2, MAX_AGENT_GREETING_LENGTH2, MAX_AGENT_HOURS_DAYS2, QUALIFICATION_QUESTION_KINDS2, MAX_QUALIFICATION_QUESTIONS2, MAX_QUESTION_PROMPT_LENGTH2, MAX_ANSWER_LENGTH2, MIN_QUESTION_CHOICES2, MAX_QUESTION_CHOICES2, MAX_SKIP_CONDITIONS2, MAX_QUALIFICATION_SUMMARY_LENGTH2, AGENT_TURN_ROLES2, AGENT_TOOLS2, MAX_TURN_TEXT_LENGTH2, MAX_TURN_SOURCES2, MAX_DOCUMENT_PAGES2, MAX_COPILOT_QUOTE_LENGTH2, HANDOFF_CHANNELS2, HANDOFF_STATES2, HANDOFF_REASONS2, HANDOFF_RESULTS2, MAX_HANDOFF_ATTEMPTS2, CHAT_STATES2, CHAT_TOKEN_HASH_BYTES2, voiceChats2, voiceInquiries2, voiceAgentSettings2, voiceQualificationQuestions2, voiceQualificationAnswers2, voiceAgentTurns2, voiceAgentTurnSources2, voiceHandoffs2, CALL_RESULTS2, AGENT_CALL_END_REASONS2, CALL_GATE_CODES2, AGENT_CALL_SOURCES2, AGENT_CALL_STATES2, MAX_CALL_ATTEMPTS2, AGENT_CALL_NUMBER_HASH_BYTES2, voiceAgentCalls2, CAMPAIGN_STATES2, CAMPAIGN_APPROVAL_MODES2, WINDOW_ZONES2, STEP_KINDS2, STEP_TASKS2, MAX_SEQUENCE_STEPS2, ENROLLMENT_STATES2, ENROLLMENT_STOP_REASONS2, ENROLLMENT_EVENT_KINDS2, PLAY_INTENTS2, PLAY_SOURCES2, PLAY_STATUSES2, PLAY_CITATION_KINDS2, PROMOTION_SOURCES2, OUTBOUND_WORK_KINDS2, MAX_CAMPAIGN_NAME_LENGTH2, MAX_DAILY_CAP2, MAX_CAMPAIGN_VERSION2, MAX_STEP_HOURS2, MAX_TASK_INSTRUCTION_LENGTH2, MAX_BRANCH_ARMS2, MAX_VARIANT_WEIGHT2, MAX_VARIANT_LABEL_LENGTH2, MAX_VARIANT_ANGLE_LENGTH2, MAX_PLAY_EVIDENCE2, MAX_PLAY_CITATIONS2, MAX_PLAY_STEPS2, outboundPlays2, outboundPlayCitations2, outboundCampaigns2, outboundSequences2, outboundSteps2, outboundVariants2, outboundEnrollments2, outboundEnrollmentEvents2, outboundSendDecisions2, outboundWorkHints2, FIELD_GROUPS2, RUN_STATUSES2, FINAL_RUN_STATUSES2, STOP_REASONS2, ATTEMPT_OUTCOMES2, SKIPPED_ATTEMPT_OUTCOMES2, ATTEMPT_FAILURES2, SIGNAL_KINDS2, SIGNAL_SOURCE_TYPES2, FIT_FIELDS2, FIT_OPERATORS2, MAX_ATTEMPTS_PER_RUN2, MAX_RUN_FIELDS2, MAX_PROVIDERS2, MAX_PROVIDER_KEY_LENGTH2, MAX_MICRO_DOLLARS2, MAX_ATTEMPT_DURATION_MS2, MAX_RESERVATION_HOLD_KEY_LENGTH2, MAX_RUN_REQUEST_ID_LENGTH2, MAX_SIGNAL_DETAIL_BYTES2, MAX_FIT_CONDITION_BYTES2, MAX_FIT_VALUES2, MAX_FIT_NAME_LENGTH2, MAX_FIT_WEIGHT2, MAX_CREDENTIAL_CIPHERTEXT_BYTES2, MAX_CREDENTIAL_KEY_ID_LENGTH2, enrichmentRuns2, enrichmentAttempts2, signals2, fitCriteria2, providerSettings2, enrichmentSpend2, enrichmentReservations2, LINKEDIN_ACCOUNT_STATUSES2, LINKEDIN_PAUSE_REASONS2, LINKEDIN_DAILY_CONNECTION_CEILING2, LINKEDIN_DAILY_MESSAGE_CEILING2, LINKEDIN_WEEKLY_CONNECTION_CEILING2, MAX_LINKEDIN_TYPED_NAME_LENGTH2, MAX_LINKEDIN_PROVIDER_REFERENCE_LENGTH2, MAX_LINKEDIN_WORDING_VERSION_LENGTH2, linkedinAccounts2, linkedinRiskAcceptances2, linkedinChannelSettings2, linkedinUsage2, LINKEDIN_SEND_KINDS2, LINKEDIN_SEND_STATES2, MAX_LINKEDIN_SEND_KEY_LENGTH2, linkedinSends2, MAX_WEBHOOK_SECRET_CIPHERTEXT_BYTES2, MAX_SIGNAL_KINDS_BYTES2, MAX_FIT_MATCHES_BYTES2, signalSettings2, fitScores2, UNSUBSCRIBE_RATE_KEY_HASH_BYTES2, unsubscribeRateCounters2, CALL_STATES2, CALL_FAILURE_REASONS2, CALL_KINDS2, CALL_MEDIA_TYPES2, CALL_CHANNELS2, CALL_REP_BY2, CALL_MAX_TRANSCRIPT_BYTES2, CALL_MAX_RECORDING_BYTES2, CALL_MAX_RECORDING_SECONDS2, CALL_MAX_SPEAKERS2, CALL_SPEAKER_LABEL_MAX_LENGTH2, CALL_SPEAKER_LABEL_MAX_BYTES2, CALL_MAX_SEQ2, CALL_MAX_MOMENTS2, CALL_PURGE_MAX_ATTEMPTS2, CALL_JOB_MAX_ATTEMPTS2, CALL_MAX_VENDOR_SENDS2, MAX_SEARCH_STATE_IDS2, CALL_VENDOR_ID_PATTERN2, CALL_JOB_KINDS2, CALL_JOB_STATES2, repChangeAllowed2, callReuploadRequeues2, CALL_PENDING_CLEANUP_PREDICATE2, CALL_ORIGINS2, calls2, callJobs2, callVendorSends2, consumedMessage2, EMBED_USAGE_MAX_ADD2, EMBED_USAGE_MAX_MOMENTS2, playbookEmbedUsage2, INTERNAL_CALL_USER_ID2, playbookIdempotencyKeys2, liveCallWaits2, ORPHAN_SWEEP_CURSOR_MAX_BYTES2, ORPHAN_SWEEP_MIN_CLAIM_MS2, ORPHAN_SWEEP_MAX_CLAIM_MS2, playbookOrphanSweeps2, SUGGESTION_KINDS2, SUGGESTION_STATUSES2, MAX_SUGGESTION_TEXT_LENGTH2, MAX_SUGGESTION_MOMENTS2, SUGGESTION_FINGERPRINT_BYTES2, suggestions2, WORK_KINDS2, playbookWorkHints2, CALL_TURN_TRACKS2, MAX_CALL_TURN_TEXT_LENGTH2, COPILOT_CARD_KINDS2, COPILOT_OBJECTION_TYPES2, COPILOT_RATINGS2, MAX_COPILOT_CARDS_PER_CALL2, MAX_COPILOT_CITED_MOMENTS2, MAX_COPILOT_CARD_TEXT_LENGTH2, MAX_COPILOT_EVIDENCE2, MIN_COPILOT_MIN_EVIDENCE2, MAX_COPILOT_MIN_EVIDENCE2, DEFAULT_COPILOT_MIN_MOMENTS2, DEFAULT_COPILOT_MIN_DEALS2, voiceCallTurns2, voiceCopilotCards2, voiceCopilotSettings2, voiceIdempotencyKeys2, MAX_TWILIO_RING_IDENTITIES2, MAX_TWILIO_PROVIDER_ID_LENGTH2, MAX_TWILIO_PLACEMENT_KEY_LENGTH2, MAX_TWILIO_FINGERPRINT_LENGTH2, TWILIO_DIRECTORY_KINDS2, voiceTwilioCalls2, voiceTwilioRecordings2, voiceTwilioPlacements2, voiceTwilioDirectory2, exports_schema };
