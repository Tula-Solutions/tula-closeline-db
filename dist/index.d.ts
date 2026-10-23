/**
* The least grace, in milliseconds, {@link ABANDON_RECORD} leaves between a sign-up attempt's
* expiry and the first time its case is due: the retention floor of the service, 10 s (twice the
* 5 s bound on a call to core). A smaller grace passed in is raised to this. The service passes
* its call bound plus a skew margin; this floor is the least safe value, not a good one.
*/
declare const ABANDON_MIN_GRACE_MS = 1e4;
/**
* The least forgetting period or window, in milliseconds, the counter statements store: a
* smaller, null or negative value passed in is raised to it. Without a floor a zero period would
* make a row expire the instant it starts and break the table's `window_order` check, and a
* statement must not be able to throw on caller-supplied durations.
*/
declare const COUNTER_MIN_PERIOD_MS = 1e3;
/**
* The least `Retry-After`, in milliseconds, the service answers with for a locked address when
* {@link LOCKOUT_RETRY_AFTER} gives no row or 0 after a refusal (see {@link LOCKOUT_ATTEMPT}).
*/
declare const LOCKOUT_MIN_RETRY_AFTER_MS = 1e3;
/**
* One attempted sign-in of an address, counted up front. `$1` environment, `$2` key hash, `$3`
* the wait in milliseconds after failure 1, 2, 3, ... (an `int[]`; the last element serves every
* later failure), `$4` the forgetting period in milliseconds, raised to {@link COUNTER_MIN_PERIOD_MS}
* when smaller, null or negative; a missing, null or negative wait counts as 0, so no argument
* makes the statement throw. A row back means the attempt may
* go ahead (`hits` failures counted, `wait_ms` the wait this failure imposes); no row back means
* the address is locked and the attempt was not counted: read {@link LOCKOUT_RETRY_AFTER}. If
* that returns no row or 0 (the lock ended or the row was cleared in between), run this statement
* again at most once; if it still refuses, answer locked with a `Retry-After` of at least
* {@link LOCKOUT_MIN_RETRY_AFTER_MS}.
*/
declare const LOCKOUT_ATTEMPT: string;
/**
* After a refused {@link LOCKOUT_ATTEMPT}: how long the address stays locked, by the database
* clock. A separate read, so it can race: the row may have been cleared or unlocked since, which
* gives no row or 0, and the service then simply tries again. `$1` environment, `$2` key hash.
*/
declare const LOCKOUT_RETRY_AFTER = "select greatest(0, ceil(extract(epoch from locked_until - clock_timestamp()) * 1000))::int as retry_after_ms\\nfrom auth.attempt_counters\\nwhere environment_id = $1 and kind = 'lockout' and key_hash = $2";
/** A right password: forget the address's failures. `$1` environment, `$2` key hash. */
declare const LOCKOUT_CLEAR = "delete from auth.attempt_counters\\nwhere environment_id = $1 and kind = 'lockout' and key_hash = $2";
/**
* One request against a fixed-window limit. `$1` environment, `$2` key hash, `$3` the window in
* milliseconds (raised to {@link COUNTER_MIN_PERIOD_MS} when smaller, null or negative). The
* request is allowed when `hits <= limit`; requests over the limit are counted
* too. `retry_after_ms` is the time to the end of the window.
*/
declare const RATE_HIT = "with ts as (select clock_timestamp() as tick)\\ninsert into auth.attempt_counters as c\\n  (environment_id, kind, key_hash, hits, started_at, expires_at)\\nvalues ($1, 'rate_limit', $2, 1, clock_timestamp(),\\n        clock_timestamp() + make_interval(secs => greatest(coalesce($3::float8, 0), 1000) / 1000))\\non conflict (environment_id, kind, key_hash) do update set\\n  hits = case when c.expires_at <= (select tick from ts) then 1 else least(c.hits + 1, 1000000) end,\\n  started_at = case when c.expires_at <= (select tick from ts) then (select tick from ts) else c.started_at end,\\n  expires_at = case when c.expires_at <= (select tick from ts)\\n                    then (select tick from ts) + make_interval(secs => greatest(coalesce($3::float8, 0), 1000) / 1000)\\n                    else c.expires_at end\\nreturning hits, greatest(0, ceil(extract(epoch from expires_at - clock_timestamp()) * 1000))::int as retry_after_ms";
/**
* The purge of dead counters, one bounded batch, **across all environments on purpose** (it is
* housekeeping of a table without row-level security): rows expired for at least a minute by the
* database clock, oldest first, skipping rows another purge holds. `$1` is the batch size; repeat
* while a batch comes back full.
*/
declare const COUNTER_PURGE_BATCH = "with batch as (\\n  select environment_id, kind, key_hash from auth.attempt_counters\\n  where expires_at < clock_timestamp() - interval '1 minute'\\n  order by expires_at\\n  limit $1\\n  for update skip locked)\\ndelete from auth.attempt_counters c\\nusing batch b\\nwhere c.environment_id = b.environment_id and c.kind = b.kind and c.key_hash = b.key_hash";
/**
* Record an abandon case, once. `$1` id, `$2` project, `$3` environment, `$4` the Organization id
* (null when a timed-out create never revealed it), `$5` user id, `$6` attempt id, `$7` the time
* after which the attempt can no longer write an account, `$8` the grace in milliseconds. The case
* first falls due at `$7` plus the grace: a request that started before the expiry can still
* commit its account up to the call bound later, so "expired and no account" proves nothing until
* then. **The service passes its call bound plus a skew margin**; a grace below
* {@link ABANDON_MIN_GRACE_MS} is raised to it, and that floor is the least safe value. A case
* already recorded for the Organization or for the attempt, open or resolved, is left alone and
* no row comes back. Run it inside `withEnvironment` (forced row-level security).
*/
declare const ABANDON_RECORD = "insert into auth.abandon_cases\n  (id, project_id, environment_id, core_organization_id, user_id, attempt_id,\n   attempt_expires_at, next_attempt_at)\nvalues ($1, $2, $3, $4, $5, $6, $7::timestamptz,\n        $7::timestamptz + make_interval(secs => greatest($8::int, 10000)::float8 / 1000))\non conflict do nothing\nreturning id";
/**
* Claim a batch of due cases as a lease: the short transaction that runs this commits at once,
* and core is called outside any transaction. `$1` environment, `$2` batch size, `$3` the lease in
* milliseconds, which **must exceed the service's call bound to core**: a worker slower than its
* lease can find its case already resolved `gave_up` by {@link ABANDON_GIVE_UP_SPENT} (see
* {@link ABANDON_RESOLVE}). A case is due when its `next_attempt_at` has passed; the table keeps that from
* being earlier than `attempt_expires_at`, so a case is never due while its attempt can still
* write the account. A crash leaves the case due again once the lease ends. A case that has
* used all {@link ABANDON_CASE_MAX_ATTEMPTS} attempts is never claimed (the count would pass the
* table's bound and abort the statement, wedging the batch); {@link ABANDON_GIVE_UP_SPENT}
* resolves it. The service gives up on its own earlier, at its own attempt limit below the
* bound, with {@link ABANDON_RESOLVE} and `gave_up`. {@link ABANDON_SETTLE} excludes it by the
* row lock; the interleaving where this claim's snapshot predates a settle's commit relies on
* READ COMMITTED re-checking `resolved_at is null` after the lock and is not covered by a test, so
* both statements must run at READ COMMITTED (or the caller handles 40001 by rolling back). Run
* it inside `withEnvironment`.
*/
declare const ABANDON_CLAIM = "with due as (\n  select id from auth.abandon_cases\n  where environment_id = $1 and resolved_at is null and attempts < 100\n    and next_attempt_at <= clock_timestamp()\n  order by next_attempt_at\n  limit $2\n  for update skip locked)\nupdate auth.abandon_cases c\nset attempts = c.attempts + 1,\n    next_attempt_at = clock_timestamp() + make_interval(secs => $3::float8 / 1000),\n    updated_at = clock_timestamp()\nfrom due\nwhere c.id = due.id\nreturning c.id, c.core_organization_id, c.user_id, c.attempt_id, c.attempts";
/**
* Record the outcome in a second short transaction. `$1` case id, `$2` environment, `$3` the
* outcome (`done`, `not_needed`, `refused` or `gave_up`; the table's check rejects any other).
* No row back means the case was already resolved.
* This is also what sets `gave_up` when the service reaches its own attempt limit. No row back
* means the case is already resolved, for example `gave_up` by {@link ABANDON_GIVE_UP_SPENT}
* while a worker slower than its lease was still calling core: the worker treats that as "already
* resolved", not as an error. Run it inside `withEnvironment`.
*/
declare const ABANDON_RESOLVE = "update auth.abandon_cases\nset resolved_at = clock_timestamp(), outcome = $3, updated_at = clock_timestamp()\nwhere id = $1 and environment_id = $2 and resolved_at is null\nreturning id";
/**
* Settle a case from inside the account transaction, as its last statement before the commit:
* the account is written only if this returns a row. `$1` case id, `$2` environment. It makes
* "account committed" and "case claimed by the sweep" mutually exclusive by a row lock, not by
* any clock. {@link ABANDON_CLAIM} takes the row `for update skip locked` and raises `attempts`
* from 0; this takes the same row lock, and only while `attempts = 0`:
*
* - **Settle locks first.** The claim skips the locked row. After the commit the case is
*   resolved, so it is never claimable (a claim that took its snapshot earlier re-checks the
*   row after the lock and drops it, `resolved_at` no longer being null).
* - **The claim commits first.** `attempts` is already 1 (or more), so this statement waits on
*   the claim's lock if it is still held, then re-evaluates its `where` against the new row
*   version and returns **no row**. The caller must roll back the account and tell the person to
*   sign up again: the sweep owns the case and will abandon the Organization.
*
* One interleaving has no test, because the real statement cannot be paused mid-scan: a claim
* whose snapshot predates this statement's commit and which reaches the row after it. Its
* safety rests on READ COMMITTED re-running the claim's `resolved_at is null` on the newest row
* version once the lock is granted. **Both statements must run at READ COMMITTED**, or the
* caller must handle SQLSTATE 40001 by rolling back.
*
* Under the default READ COMMITTED level (`withEnvironment` and the pool open plain
* transactions) that re-evaluation is what Postgres does for an updated row. Under REPEATABLE
* READ or SERIALIZABLE the same race is a serialization failure (SQLSTATE 40001) instead of no
* row; the caller treats it the same way and rolls back.
*
* **No row means one of four things, and the caller tells the first from the rest by only
* calling this when it recorded a case for the attempt.** The sweep claimed it (the race
* above), the in-request abandon already resolved it, the sweep gave up on it, or another settle
* won. In every one the account must not be written. If no case was recorded there is nothing to
* settle and this must not be called: it would return no row and look like a lost race.
* {@link ABANDON_LEARN} changes only `core_organization_id` and the lease update only
* `next_attempt_at`, so neither disturbs `attempts = 0`.
*
* The case is closed as `not_needed`: no abandon was needed and none was made. The other
* outcomes mean `done` (core removed the Organization), `refused` (core refused, a person
* reconciles) and `gave_up` (attempts spent, a person reconciles), so a settled case never sends
* anyone to look at a healthy Organization. It runs on the existing column grants (select, and
* update of `resolved_at`, `outcome` and `updated_at`) under forced row-level security. Run it inside
* `withEnvironment`, in the same transaction as the account.
*/
declare const ABANDON_SETTLE = "update auth.abandon_cases\\nset resolved_at = clock_timestamp(), outcome = 'not_needed', updated_at = clock_timestamp()\\nwhere id = $1 and environment_id = $2 and resolved_at is null and attempts = 0\\nreturning id";
/**
* Resolve spent cases as `gave_up`, one bounded batch: open cases that have used every attempt
* and whose lease has ended, so no worker holds them. It is the safety net behind the service's
* own limit (which is lower, so in normal operation this finds nothing). The sweep runs it once
* per run, after the claim, with a small batch, because it walks the due cases; it assumes the
* claim's lease exceeds the service's call bound to core. `$1` environment, `$2` batch size. Run
* it inside `withEnvironment`.
*/
declare const ABANDON_GIVE_UP_SPENT = "with batch as (\\n  select id from auth.abandon_cases\\n  where environment_id = $1 and resolved_at is null and attempts >= 100\\n    and next_attempt_at <= clock_timestamp()\\n  order by next_attempt_at\\n  limit $2\\n  for update skip locked)\\nupdate auth.abandon_cases\\nset resolved_at = clock_timestamp(), outcome = 'gave_up', updated_at = clock_timestamp()\\nwhere id in (select id from batch)\\nreturning id";
/**
* Fill in the Organization id of a case recorded without one, once it is learned. `$1` case id,
* `$2` environment, `$3` the Organization id. A row back means it was filled; no row means the
* case already has an id (it is never overwritten) or is resolved (it is not touched). If another
* case in the environment already holds that Organization id, the statement fails with the unique
* violation `abandon_cases_environment_organization_key` (SQLSTATE 23505). The failed statement
* aborts its transaction, so the service resolves this case with {@link ABANDON_RESOLVE} as
* `gave_up` in a new one. It reports the violation by ids only (both case ids and the
* Organization id, never an email) so a person can reconcile: the other case may already be
* resolved or belong to another user, and the Organization may then never be abandoned. Run it
* inside `withEnvironment`.
*/
declare const ABANDON_LEARN = "update auth.abandon_cases\nset core_organization_id = $3, updated_at = clock_timestamp()\nwhere id = $1 and environment_id = $2 and core_organization_id is null and resolved_at is null\nreturning id";
/**
* The purge of resolved cases, one bounded batch: resolved a day or more ago by the database
* clock, oldest first. `$1` environment, `$2` batch size; repeat while a batch comes back full.
* Run it inside `withEnvironment`.
*/
declare const ABANDON_PURGE_BATCH = "with batch as (\\n  select id from auth.abandon_cases\\n  where environment_id = $1 and resolved_at is not null\\n    and resolved_at < clock_timestamp() - interval '1 day'\\n  order by resolved_at\\n  limit $2\\n  for update skip locked)\\ndelete from auth.abandon_cases\\nwhere id in (select id from batch)";
/** Every statement above by name, for the README check and the integration tests. */
declare const AUTH_STATEMENTS: {
	readonly LOCKOUT_ATTEMPT: string;
	readonly LOCKOUT_RETRY_AFTER: "select greatest(0, ceil(extract(epoch from locked_until - clock_timestamp()) * 1000))::int as retry_after_ms\\nfrom auth.attempt_counters\\nwhere environment_id = $1 and kind = 'lockout' and key_hash = $2";
	readonly LOCKOUT_CLEAR: "delete from auth.attempt_counters\\nwhere environment_id = $1 and kind = 'lockout' and key_hash = $2";
	readonly RATE_HIT: "with ts as (select clock_timestamp() as tick)\\ninsert into auth.attempt_counters as c\\n  (environment_id, kind, key_hash, hits, started_at, expires_at)\\nvalues ($1, 'rate_limit', $2, 1, clock_timestamp(),\\n        clock_timestamp() + make_interval(secs => greatest(coalesce($3::float8, 0), 1000) / 1000))\\non conflict (environment_id, kind, key_hash) do update set\\n  hits = case when c.expires_at <= (select tick from ts) then 1 else least(c.hits + 1, 1000000) end,\\n  started_at = case when c.expires_at <= (select tick from ts) then (select tick from ts) else c.started_at end,\\n  expires_at = case when c.expires_at <= (select tick from ts)\\n                    then (select tick from ts) + make_interval(secs => greatest(coalesce($3::float8, 0), 1000) / 1000)\\n                    else c.expires_at end\\nreturning hits, greatest(0, ceil(extract(epoch from expires_at - clock_timestamp()) * 1000))::int as retry_after_ms";
	readonly COUNTER_PURGE_BATCH: "with batch as (\\n  select environment_id, kind, key_hash from auth.attempt_counters\\n  where expires_at < clock_timestamp() - interval '1 minute'\\n  order by expires_at\\n  limit $1\\n  for update skip locked)\\ndelete from auth.attempt_counters c\\nusing batch b\\nwhere c.environment_id = b.environment_id and c.kind = b.kind and c.key_hash = b.key_hash";
	readonly ABANDON_RECORD: "insert into auth.abandon_cases\n  (id, project_id, environment_id, core_organization_id, user_id, attempt_id,\n   attempt_expires_at, next_attempt_at)\nvalues ($1, $2, $3, $4, $5, $6, $7::timestamptz,\n        $7::timestamptz + make_interval(secs => greatest($8::int, 10000)::float8 / 1000))\non conflict do nothing\nreturning id";
	readonly ABANDON_CLAIM: "with due as (\n  select id from auth.abandon_cases\n  where environment_id = $1 and resolved_at is null and attempts < 100\n    and next_attempt_at <= clock_timestamp()\n  order by next_attempt_at\n  limit $2\n  for update skip locked)\nupdate auth.abandon_cases c\nset attempts = c.attempts + 1,\n    next_attempt_at = clock_timestamp() + make_interval(secs => $3::float8 / 1000),\n    updated_at = clock_timestamp()\nfrom due\nwhere c.id = due.id\nreturning c.id, c.core_organization_id, c.user_id, c.attempt_id, c.attempts";
	readonly ABANDON_RESOLVE: "update auth.abandon_cases\nset resolved_at = clock_timestamp(), outcome = $3, updated_at = clock_timestamp()\nwhere id = $1 and environment_id = $2 and resolved_at is null\nreturning id";
	readonly ABANDON_SETTLE: "update auth.abandon_cases\\nset resolved_at = clock_timestamp(), outcome = 'not_needed', updated_at = clock_timestamp()\\nwhere id = $1 and environment_id = $2 and resolved_at is null and attempts = 0\\nreturning id";
	readonly ABANDON_PURGE_BATCH: "with batch as (\\n  select id from auth.abandon_cases\\n  where environment_id = $1 and resolved_at is not null\\n    and resolved_at < clock_timestamp() - interval '1 day'\\n  order by resolved_at\\n  limit $2\\n  for update skip locked)\\ndelete from auth.abandon_cases\\nwhere id in (select id from batch)";
	readonly ABANDON_GIVE_UP_SPENT: "with batch as (\\n  select id from auth.abandon_cases\\n  where environment_id = $1 and resolved_at is null and attempts >= 100\\n    and next_attempt_at <= clock_timestamp()\\n  order by next_attempt_at\\n  limit $2\\n  for update skip locked)\\nupdate auth.abandon_cases\\nset resolved_at = clock_timestamp(), outcome = 'gave_up', updated_at = clock_timestamp()\\nwhere id in (select id from batch)\\nreturning id";
	readonly ABANDON_LEARN: "update auth.abandon_cases\nset core_organization_id = $3, updated_at = clock_timestamp()\nwhere id = $1 and environment_id = $2 and core_organization_id is null and resolved_at is null\nreturning id";
};
import { NodePgDatabase } from "drizzle-orm/node-postgres";
declare namespace exports_schema {
	export { ABANDON_CASE_MAX_ATTEMPTS, ABANDON_CASE_OUTCOMES, ADDRESS_HASH_BYTES, API_KEY_KINDS, ATTEMPT_COUNTER_KEY_HASH_BYTES, ATTEMPT_COUNTER_KINDS, ATTEMPT_COUNTER_MAX_HITS, AUDIT_ACTOR_TYPES, AUDIT_RETENTION_FLOOR, AbandonCase, ApiKey, AttemptCounter, AuditLog, BackupCode, CALL_CHANNELS, CALL_FAILURE_REASONS, CALL_JOB_KINDS, CALL_JOB_MAX_ATTEMPTS, CALL_JOB_STATES, CALL_KINDS, CALL_MAX_RECORDING_BYTES, CALL_MAX_RECORDING_SECONDS, CALL_MAX_SEQ, CALL_MAX_SPEAKERS, CALL_MAX_TRANSCRIPT_BYTES, CALL_MAX_VENDOR_SENDS, CALL_MEDIA_TYPES, CALL_PENDING_CLEANUP_PREDICATE, CALL_PURGE_MAX_ATTEMPTS, CALL_REP_BY, CALL_SPEAKER_LABEL_MAX_BYTES, CALL_SPEAKER_LABEL_MAX_LENGTH, CALL_STATES, CALL_VENDOR_ID_PATTERN, CONSENT_CHANNELS, CONSENT_EVENT_KINDS, CONSENT_FORM_STATES, CONSENT_GRANT_SOURCES, CONSENT_WITHDRAWAL_SOURCES, CONSUMED_MESSAGE_STATES, CONTACT_ALLOW_BASES, CONTACT_CHECK_RETENTION_DAYS, CONTACT_PURPOSES, CREDENTIAL_TYPES, Credential, DEAL_ID_MAX_BYTES, DEAL_ID_MAX_LENGTH, DEAL_IMPORT_APPLY_BATCH, DEAL_IMPORT_FAILURE_REASONS, DEAL_IMPORT_MAX_ATTEMPTS, DEAL_IMPORT_MAX_BYTES, DEAL_IMPORT_MAX_ROWS, DEAL_IMPORT_ROW_REASONS, DEAL_IMPORT_ROW_REASONS_WITHOUT_DEAL_ID, DEAL_IMPORT_ROW_RESULTS, DEAL_IMPORT_STATES, DEAL_MAX_SEQ, DEAL_NAME_MAX_BYTES, DEAL_NAME_MAX_LENGTH, DEAL_OUTCOMES, DEMO_NOTIFICATION_STATUSES, DEMO_RATE_ADDRESS_HASH_BYTES, DEMO_REQUEST_KEY_LENGTH, DEMO_REQUEST_MESSAGE_MAX, DEMO_REQUEST_NAME_MAX, DEMO_REQUEST_SOURCE_PAGE_MAX, DOCUMENT_FAILURE_REASONS, DOCUMENT_FILE_TYPES, DOCUMENT_MAX_BYTES, DOCUMENT_MAX_PAGE_COUNT, DOCUMENT_PURGE_MAX_ATTEMPTS, DOCUMENT_STATES, DemoRateCounter, DemoRequest, ENVIRONMENT_KINDS, EVENT_RETENTION_FLOOR, Environment, EnvironmentSettingsRow, Event, FIELD_HISTORY_STATES, FORM_TOKEN_PATTERN, FlowAttemptRow, GLOBAL_SCOPE_ORGANIZATION_ID, HookCallCount, HookRow, IDEMPOTENCY_HASH_BYTES, IDEMPOTENCY_KEY_MAX, IDEMPOTENCY_RESPONSE_MAX_BYTES, IDEMPOTENCY_ROUTE_MAX, IDENTITY_PROVIDERS, IDENTITY_VALUE_PATTERNS, INGESTION_JOB_MAX_ATTEMPTS, INGESTION_JOB_STATES, INGESTION_MAX_CHUNKS, INGESTION_STEPS, INTERNAL_CALL_USER_ID, INVITATION_ROLES, INVITATION_STATES, Identity, InstanceAuditLog, LINE_ASSIGNMENT_KINDS, LINE_STATES, LOGGED_DENIAL_CODES, MAX_CALLER_LENGTH, MAX_CALL_DURATION_SECONDS, MAX_CONSENT_FORM_NAME_LENGTH, MAX_CONSENT_WORDING_LENGTH, MAX_EVIDENCE_REF_LENGTH, MAX_FIELD_HISTORY_ENTRIES, MAX_FORM_TOKEN_LENGTH, MAX_LINE_LABEL_LENGTH, MAX_MASKED_ADDRESS_LENGTH, MAX_MERGED_PROSPECTS, MAX_MERGE_SNAPSHOT_BYTES, MAX_PROSPECT_COMPANY_NAME_LENGTH, MAX_PROSPECT_FIELD_VALUE_LENGTH, MAX_PROSPECT_IMPORT_BYTES, MAX_PROSPECT_IMPORT_ROWS, MAX_PROSPECT_NOTES_LENGTH, MAX_PROSPECT_TAGS, MAX_PROSPECT_TAG_LENGTH, MAX_PROVIDER_EVENT_ID_LENGTH, MAX_QUEUED_DEAL_IMPORTS, MAX_RECORDING_KEY_LENGTH, MAX_SEARCH_STATE_IDS, MAX_SOURCE_REF_LENGTH, MAX_SUBMISSION_IP_LENGTH, MAX_SUBMISSION_USER_AGENT_LENGTH, MAX_SUPPRESSION_NOTE_LENGTH, MAX_SUPPRESSION_SOURCE_REF_LENGTH, MAX_VOICE_IDEMPOTENCY_KEY_LENGTH, MAX_WRAP_UP_NOTE_LENGTH, MEMBERSHIP_ROLES, MEMBER_NAME_MAX, MIN_FORM_TOKEN_LENGTH, NativeAppRow, NewAbandonCase, NewApiKey, NewAttemptCounter, NewAuditLog, NewBackupCode, NewCredential, NewDemoRequest, NewEnvironment, NewEnvironmentSettingsRow, NewEvent, NewFlowAttemptRow, NewHookCallCount, NewHookRow, NewIdentity, NewInstanceAuditLog, NewNativeAppRow, NewOAuthProviderRow, NewPasskey, NewPasskeyChallenge, NewPasswordHistoryEntry, NewProject, NewProposalRow, NewRefreshToken, NewSession, NewSigningKey, NewSmsCodeCount, NewUser, NewUserFactor, NewVerificationToken, NewWebhookDeliveryAttemptRow, NewWebhookDeliveryRow, NewWebhookEndpointRow, NewWorkspace, OAUTH_PROVIDERS, OAuthProviderConfig, OAuthProviderRow, ORGANIZATION_REGIONS, ORGANIZATION_STATUSES, PASSKEY_CHALLENGE_PURPOSES, PENDING_CLEANUP_PREDICATE, PROSPECT_COMPANY_FIELD_NAMES, PROSPECT_FIELD_NAMES, PROSPECT_IDENTITY_KINDS, PROSPECT_IMPORT_FAILURE_REASONS, PROSPECT_IMPORT_REJECT_REASONS, PROSPECT_IMPORT_ROW_RESULTS, PROSPECT_IMPORT_SKIP_REASONS, PROSPECT_IMPORT_STATES, PROSPECT_MERGE_STATES, PROSPECT_MERGE_UNDO_DAYS, PROSPECT_STATUSES, Passkey, PasskeyChallenge, PasswordHistoryEntry, Project, ProposalRow, RIGHTS_MAX_WORDING_VERSION, RefreshToken, SESSION_CLIENTS, SESSION_REVOKE_REASONS, SESSION_TYPES, SIGNING_KEY_STATUSES, SMS_COUNT_RETENTION_FLOOR_DAYS, SOURCE_KIND_PATTERN, SUPPRESSION_ADDRESS_KINDS, SUPPRESSION_REASONS, SUPPRESSION_REMOVABLE_REASONS, Session, SigningKey, SmsCodeCount, USER_FACTOR_TYPES, User, UserFactor, VERIFICATION_PURPOSES, VOICE_CALL_DIRECTIONS, VOICE_CALL_ENDED_BY, VOICE_CALL_EVENT_KINDS, VOICE_CALL_FAILURE_REASONS, VOICE_CALL_FINAL_STATES, VOICE_CALL_STATES, VOICE_RECORDING_CHANNELS, VOICE_RECORDING_STATES, VOICE_TRANSCRIPT_STATES, VerificationToken, WEBHOOK_DELIVERY_RETENTION_FLOOR, WEBHOOK_DELIVERY_STATES, WORK_KINDS, WebhookDeliveryAttemptRow, WebhookDeliveryRow, WebhookEndpointRow, Workspace, abandonCases, apiKeys, attemptCounters, auditLogs, authSchema, backupCodes, callJobs, callReuploadRequeues, callVendorSends, calls, consentForms, consentWordings, consumedMessage, contactCheckLog, contactConsentEvents, coreSchema, credentials, dealImportRows, dealImports, deals, demoRateCounters, demoRequests, documents, environmentSettings, environments, events, flowAttempts, hookCallCounts, hooks, idempotencyKeys, identities, indexSettings, ingestionJobs, instanceAuditLogs, invitationDirectory, invitations, membershipDirectory, memberships, nativeApps, oauthProviders, organizationState, organizationUsage, organizations, passkeyChallenges, passkeys, passwordHistory, playbookIdempotencyKeys, playbookOrphanSweeps, playbookSchema, playbookWorkHints, projects, proposals, prospectCompanies, prospectCompanyFields, prospectFields, prospectIdentities, prospectImportRows, prospectImports, prospectMerges, prospects, refreshTokens, repChangeAllowed, rightsConfirmations, sessions, signingKeys, smsCodeCounts, suppressionEntries, teamMembers, teams, userFactors, users, verificationTokens, voiceCallEvents, voiceCalls, voiceLines, voiceRecordings, voiceSchema, webhookDeliveries, webhookDeliveryAttempts, webhookEndpoints, workspaces };
}
import { PgTableWithColumns as PgTableWithColumns_a5zn0g } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp } from "drizzle-orm/pg-core";
/**
* The most times a sweep may try to abandon one case: the bound the database itself keeps
* (`abandon_cases_attempts_bounds`). The service gives up well before it, so the check only
* stops a bug from counting forever.
*/
declare const ABANDON_CASE_MAX_ATTEMPTS = 100;
/**
* How an abandon case ended: `done` (core removed the Organization), `not_needed` (no abandon was
* needed and none was made: an account exists or core holds no Organization for the attempt),
* `refused` (core refused, a person reconciles) or `gave_up` (attempts spent, a person reconciles).
*/
declare const ABANDON_CASE_OUTCOMES: readonly ["done", "not_needed", "refused", "gave_up"];
/**
* An Organization that core made during a sign-up whose account was then never written, kept so a
* sweep can ask core to abandon it (ADR 0011, hub issue 36) and the case is not lost when a
* process stops. A case is written when the in-request abandon call fails, or when the attempt
* ends with the call undone, and is resolved when the sweep has an answer.
*
* **It holds ids only, no personal data**: the Organization id core returned (`core_organization_id`,
* a uuid the service formats as `org_<32 hex>` on the wire, as it does a user id), the user id the
* attempt fixed (`user_id`, which has no account, so no foreign key) and the flow attempt's id
* (`attempt_id`, no foreign key either: attempts are purged seconds after they expire and the case
* must outlive them). No address, name or Organization name.
*
* One row per Organization and one per attempt in an environment, so recording a case twice is
* `insert ... on conflict do nothing`. **A resolved case keeps blocking a new case for the same
* Organization until the purge removes it**; that is by design (core gives a retrying user a
* fresh Organization id, so the same id is never recorded again) and the conflict is silent. It is an environment-scoped
* table like `flow_attempts`, which is written at the same point of a sign-up: the environment is
* known then, the Organization is not a scope here, and it carries no `organization_id` column
* (auth users are global within a Region, ADR 0005), hence the longer name.
*
* A sweep claims a batch as a lease (the README has the statements): a short transaction takes due
* cases with `for update skip locked` over `abandon_cases_due_idx`, pushes `next_attempt_at`
* forward and counts the attempt; core is called outside any transaction; a second short
* transaction records the outcome. The service role may delete only resolved rows
* (`abandon_cases_resolved_only`): the record of an orphan cannot be dropped before it has an
* outcome. It may update only the columns that move a case along.
*/
declare const abandonCases: PgTableWithColumns_a5zn0g<{
	name: "abandon_cases";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp<{
			name: "created_at";
			tableName: "abandon_cases";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp<{
			name: "updated_at";
			tableName: "abandon_cases";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp<{
			name: "project_id";
			tableName: "abandon_cases";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp<{
			name: "environment_id";
			tableName: "abandon_cases";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp<{
			name: "id";
			tableName: "abandon_cases";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		coreOrganizationId: PgColumn_ffrhhp<{
			name: "core_organization_id";
			tableName: "abandon_cases";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userId: PgColumn_ffrhhp<{
			name: "user_id";
			tableName: "abandon_cases";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		attemptId: PgColumn_ffrhhp<{
			name: "attempt_id";
			tableName: "abandon_cases";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		attempts: PgColumn_ffrhhp<{
			name: "attempts";
			tableName: "abandon_cases";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		attemptExpiresAt: PgColumn_ffrhhp<{
			name: "attempt_expires_at";
			tableName: "abandon_cases";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		nextAttemptAt: PgColumn_ffrhhp<{
			name: "next_attempt_at";
			tableName: "abandon_cases";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		resolvedAt: PgColumn_ffrhhp<{
			name: "resolved_at";
			tableName: "abandon_cases";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		outcome: PgColumn_ffrhhp<{
			name: "outcome";
			tableName: "abandon_cases";
			dataType: "string";
			columnType: "PgText";
			data: "done" | "gave_up" | "not_needed" | "refused";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["done", "not_needed", "refused", "gave_up"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A row of the abandon cases. */
type AbandonCase = typeof abandonCases.$inferSelect;
/** Insert shape for an abandon case. */
type NewAbandonCase = typeof abandonCases.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g2 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp2 } from "drizzle-orm/pg-core";
/**
* Publishable keys identify an environment from apps; secret keys authorize server calls; an
* agent key (ADR 0053) reads and proposes for an AI agent and is refused by every write.
*/
declare const API_KEY_KINDS: readonly ["publishable", "secret", "agent"];
/**
* Environment API keys, stored only as SHA-256 hashes.
*
* Deliberately **not** under row-level security: the key lookup is what *determines* the tenant,
* so it has to run before any environment is known. Only key resolution and the admin key routes touch it.
*
* It still carries the composite `(environment_id, project_id)` foreign key every tenant table
* has: without row-level security that key is the only thing stopping a row from naming one
* project and another project's environment, and key resolution trusts both columns.
*/
declare const apiKeys: PgTableWithColumns_a5zn0g2<{
	name: "api_keys";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp2<{
			name: "created_at";
			tableName: "api_keys";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp2<{
			name: "updated_at";
			tableName: "api_keys";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp2<{
			name: "id";
			tableName: "api_keys";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp2<{
			name: "project_id";
			tableName: "api_keys";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp2<{
			name: "environment_id";
			tableName: "api_keys";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		kind: PgColumn_ffrhhp2<{
			name: "kind";
			tableName: "api_keys";
			dataType: "string";
			columnType: "PgText";
			data: "agent" | "publishable" | "secret";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["publishable", "secret", "agent"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		name: PgColumn_ffrhhp2<{
			name: "name";
			tableName: "api_keys";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		keyHash: PgColumn_ffrhhp2<{
			name: "key_hash";
			tableName: "api_keys";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lastFour: PgColumn_ffrhhp2<{
			name: "last_four";
			tableName: "api_keys";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lastUsedAt: PgColumn_ffrhhp2<{
			name: "last_used_at";
			tableName: "api_keys";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		revokedAt: PgColumn_ffrhhp2<{
			name: "revoked_at";
			tableName: "api_keys";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** An API key row. */
type ApiKey = typeof apiKeys.$inferSelect;
/** Insert shape for an API key. */
type NewApiKey = typeof apiKeys.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g3 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp3 } from "drizzle-orm/pg-core";
/** What a counter row counts: failed sign-ins of an address, or requests against a limit. */
declare const ATTEMPT_COUNTER_KINDS: readonly ["lockout", "rate_limit"];
/** The most a counter counts to: the bound the database keeps (`attempt_counters_hits_bounds`). */
declare const ATTEMPT_COUNTER_MAX_HITS = 1e6;
/** Length in bytes of a key hash: HMAC-SHA-256. */
declare const ATTEMPT_COUNTER_KEY_HASH_BYTES = 32;
/**
* The counters behind sign-in lockout and the per-key rate limits (ADR 0014, hub issue 30), shared
* by every instance of the auth service. One table serves both ports: a `lockout` row counts the
* failed sign-ins of one address in one environment and says until when it is locked; a
* `rate_limit` row counts the requests of one key in a fixed window.
*
* **It holds no address and no IP address.** `key_hash` is a keyed hash (HMAC-SHA-256) of the
* port's key, computed by the service with a key that never reaches the database, so a holder of
* the rows cannot test a guess at an address against them. Rotating that key starts every counter
* over; rows expire within hours, so nothing is migrated.
*
* One row per `(environment_id, kind, key_hash)`; the service counts with one
* `insert ... on conflict (environment_id, kind, key_hash) do update` per attempt (see the README),
* which Postgres serialises on the row, so instances never lose a count. `hits` is capped at
* {@link ATTEMPT_COUNTER_MAX_HITS}. A row is dead once `expires_at` has passed: the next attempt
* starts it over, and the purge deletes it in bounded batches over `attempt_counters_purge_idx`,
* so the table does not grow with every address ever seen.
*
* It has no row-level security and no `organization_id`: a sign-in is counted before any account
* or Organization is known. It is listed as a control-plane table of `auth`, held down by the
* grants (the service role may read, insert, delete and update the four counter columns, nothing
* else). It is not on the Organization allowlist, which forbids every service-role privilege: the
* service must write it directly.
*/
declare const attemptCounters: PgTableWithColumns_a5zn0g3<{
	name: "attempt_counters";
	schema: "auth";
	columns: {
		environmentId: PgColumn_ffrhhp3<{
			name: "environment_id";
			tableName: "attempt_counters";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		kind: PgColumn_ffrhhp3<{
			name: "kind";
			tableName: "attempt_counters";
			dataType: "string";
			columnType: "PgText";
			data: "lockout" | "rate_limit";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["lockout", "rate_limit"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		keyHash: PgColumn_ffrhhp3<{
			name: "key_hash";
			tableName: "attempt_counters";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: Uint8Array<ArrayBufferLike>;
			driverParam: Uint8Array<ArrayBufferLike>;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		hits: PgColumn_ffrhhp3<{
			name: "hits";
			tableName: "attempt_counters";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		startedAt: PgColumn_ffrhhp3<{
			name: "started_at";
			tableName: "attempt_counters";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lockedUntil: PgColumn_ffrhhp3<{
			name: "locked_until";
			tableName: "attempt_counters";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		expiresAt: PgColumn_ffrhhp3<{
			name: "expires_at";
			tableName: "attempt_counters";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A row of the sign-in lockout and rate-limit counters. */
type AttemptCounter = typeof attemptCounters.$inferSelect;
/** Insert shape for a counter row. */
type NewAttemptCounter = typeof attemptCounters.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g4 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp4 } from "drizzle-orm/pg-core";
/**
* Who performed an audited action. `agent` tags MCP/AI actions (business plan §4.5);
* `instance_admin` is the deployment's operator, through the dashboard (ADR 0032).
*/
declare const AUDIT_ACTOR_TYPES: readonly ["user", "admin", "system", "agent", "instance_admin"];
/**
* The youngest entry the runtime role may delete, as a Postgres interval: the shortest audit
* retention period an environment can set (`audit.retentionDays` is at least 1 in
* `@tula/contract`). The retention job never asks for less; the policy below is what holds it
* to that if the job, or anything else running as the runtime role, ever does.
*/
declare const AUDIT_RETENTION_FLOOR = "1 day";
/**
* Record of sensitive and administrative actions.
*
* An entry is never changed: the runtime role has no `UPDATE`. It is deleted only by the
* retention job, once it is older than the environment's `audit.retentionDays` (ADR 0012,
* ADR 0017), and row-level security bounds that delete twice over: the tenant policy to the
* environment in scope, and `audit_logs_retention_floor` to entries older than
* {@link AUDIT_RETENTION_FLOOR}.
*/
declare const auditLogs: PgTableWithColumns_a5zn0g4<{
	name: "audit_logs";
	schema: "auth";
	columns: {
		projectId: PgColumn_ffrhhp4<{
			name: "project_id";
			tableName: "audit_logs";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp4<{
			name: "environment_id";
			tableName: "audit_logs";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp4<{
			name: "id";
			tableName: "audit_logs";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		actorType: PgColumn_ffrhhp4<{
			name: "actor_type";
			tableName: "audit_logs";
			dataType: "string";
			columnType: "PgText";
			data: "admin" | "agent" | "instance_admin" | "system" | "user";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["user", "admin", "system", "agent", "instance_admin"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		actorId: PgColumn_ffrhhp4<{
			name: "actor_id";
			tableName: "audit_logs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		action: PgColumn_ffrhhp4<{
			name: "action";
			tableName: "audit_logs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		targetType: PgColumn_ffrhhp4<{
			name: "target_type";
			tableName: "audit_logs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		targetId: PgColumn_ffrhhp4<{
			name: "target_id";
			tableName: "audit_logs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		ipAddress: PgColumn_ffrhhp4<{
			name: "ip_address";
			tableName: "audit_logs";
			dataType: "string";
			columnType: "PgInet";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userAgent: PgColumn_ffrhhp4<{
			name: "user_agent";
			tableName: "audit_logs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		metadata: PgColumn_ffrhhp4<{
			name: "metadata";
			tableName: "audit_logs";
			dataType: "json";
			columnType: "PgJsonb";
			data: Record<string, unknown>;
			driverParam: unknown;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			$type: Record<string, unknown>;
		}>;
		occurredAt: PgColumn_ffrhhp4<{
			name: "occurred_at";
			tableName: "audit_logs";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** An audit log row. */
type AuditLog = typeof auditLogs.$inferSelect;
/** Insert shape for an audit log row. */
type NewAuditLog = typeof auditLogs.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g5 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp5 } from "drizzle-orm/pg-core";
/**
* Single-use backup codes for two-step verification (ADR 0025).
*
* `code_hash` is a **keyed** hash, `HMAC-SHA256(backup-code key, environment : user : code)`.
* A code has about 50 bits of entropy: far more than an emailed 6-digit code, but a plain
* SHA-256 would still let whoever reads a row test guesses offline, so the key from
* `TULA_MASTER_KEY` stays in the way. Binding the hash to the user means a row copied to
* another user matches nothing.
*
* A code is spent by setting `used_at` in one guarded update, so it works exactly once. A
* user's rows are all replaced when the codes are regenerated and all deleted when two-step
* verification is turned off or reset.
*/
declare const backupCodes: PgTableWithColumns_a5zn0g5<{
	name: "backup_codes";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp5<{
			name: "created_at";
			tableName: "backup_codes";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp5<{
			name: "updated_at";
			tableName: "backup_codes";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp5<{
			name: "project_id";
			tableName: "backup_codes";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp5<{
			name: "environment_id";
			tableName: "backup_codes";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp5<{
			name: "id";
			tableName: "backup_codes";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userId: PgColumn_ffrhhp5<{
			name: "user_id";
			tableName: "backup_codes";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		codeHash: PgColumn_ffrhhp5<{
			name: "code_hash";
			tableName: "backup_codes";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		usedAt: PgColumn_ffrhhp5<{
			name: "used_at";
			tableName: "backup_codes";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A backup-code row. */
type BackupCode = typeof backupCodes.$inferSelect;
/** Insert shape for a backup code. */
type NewBackupCode = typeof backupCodes.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g6 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp6 } from "drizzle-orm/pg-core";
/** Credential types. Phase 0 ships `password`. */
declare const CREDENTIAL_TYPES: readonly ["password", "totp", "passkey"];
/**
* Secrets a user signs in with. `secret` holds an argon2id hash for passwords, or AES-256-GCM
* ciphertext (under `TULA_MASTER_KEY`) for material that must be recovered (TOTP seeds).
*/
declare const credentials: PgTableWithColumns_a5zn0g6<{
	name: "credentials";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp6<{
			name: "created_at";
			tableName: "credentials";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp6<{
			name: "updated_at";
			tableName: "credentials";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp6<{
			name: "project_id";
			tableName: "credentials";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp6<{
			name: "environment_id";
			tableName: "credentials";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp6<{
			name: "id";
			tableName: "credentials";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userId: PgColumn_ffrhhp6<{
			name: "user_id";
			tableName: "credentials";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		type: PgColumn_ffrhhp6<{
			name: "type";
			tableName: "credentials";
			dataType: "string";
			columnType: "PgText";
			data: "passkey" | "password" | "totp";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["password", "totp", "passkey"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		secret: PgColumn_ffrhhp6<{
			name: "secret";
			tableName: "credentials";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		policyVersion: PgColumn_ffrhhp6<{
			name: "policy_version";
			tableName: "credentials";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		secretChangedAt: PgColumn_ffrhhp6<{
			name: "secret_changed_at";
			tableName: "credentials";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A credential row. */
type Credential = typeof credentials.$inferSelect;
/** Insert shape for a credential. */
type NewCredential = typeof credentials.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g7 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp7 } from "drizzle-orm/pg-core";
/**
* An environment's settings document (`EnvironmentSettings` in `@tula/contract`): app name,
* password policy, sign-in methods, allowed origins and redirect URLs, audit retention.
*
* At most one row per environment. An environment without a row uses the deployment's
* defaults, and counts as revision 0.
*/
declare const environmentSettings: PgTableWithColumns_a5zn0g7<{
	name: "environment_settings";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp7<{
			name: "created_at";
			tableName: "environment_settings";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp7<{
			name: "updated_at";
			tableName: "environment_settings";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp7<{
			name: "project_id";
			tableName: "environment_settings";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp7<{
			name: "environment_id";
			tableName: "environment_settings";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp7<{
			name: "id";
			tableName: "environment_settings";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		settings: PgColumn_ffrhhp7<{
			name: "settings";
			tableName: "environment_settings";
			dataType: "json";
			columnType: "PgJsonb";
			data: Record<string, unknown>;
			driverParam: unknown;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			$type: Record<string, unknown>;
		}>;
		revision: PgColumn_ffrhhp7<{
			name: "revision";
			tableName: "environment_settings";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		managedBy: PgColumn_ffrhhp7<{
			name: "managed_by";
			tableName: "environment_settings";
			dataType: "json";
			columnType: "PgJsonb";
			data: Record<string, unknown>;
			driverParam: unknown;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			$type: Record<string, unknown>;
		}>;
	};
	dialect: "pg";
}>;
/** An environment settings row. */
type EnvironmentSettingsRow = typeof environmentSettings.$inferSelect;
/** Insert shape for an environment settings row. */
type NewEnvironmentSettingsRow = typeof environmentSettings.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g8 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp8 } from "drizzle-orm/pg-core";
/** Environment kinds shown in the dashboard's Development / Production switch. */
declare const ENVIRONMENT_KINDS: readonly ["development", "production"];
/**
* An isolated copy of a project's users and config (the tenant boundary).
*
* Every tenant table carries `environment_id`, and row-level security scopes it to the
* environment set by `withEnvironment`.
*/
declare const environments: PgTableWithColumns_a5zn0g8<{
	name: "environments";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp8<{
			name: "created_at";
			tableName: "environments";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp8<{
			name: "updated_at";
			tableName: "environments";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp8<{
			name: "id";
			tableName: "environments";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp8<{
			name: "project_id";
			tableName: "environments";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		kind: PgColumn_ffrhhp8<{
			name: "kind";
			tableName: "environments";
			dataType: "string";
			columnType: "PgText";
			data: "development" | "production";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["development", "production"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** An environment row. */
type Environment = typeof environments.$inferSelect;
/** Insert shape for an environment. */
type NewEnvironment = typeof environments.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g9 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp9 } from "drizzle-orm/pg-core";
/**
* The youngest event the runtime role can delete, whatever the retention job asks for: the
* bound the database itself keeps (`events_retention_floor`).
*/
declare const EVENT_RETENTION_FLOOR = "1 day";
/**
* Transactional outbox: auth events are written in the same transaction as the change they
* describe, then delivered to the environment's webhook endpoints by a worker (ADR 0034).
*
* `delivered_at` is `null` until the worker has **settled** the event: every endpoint it is
* owed to has a row in `webhook_deliveries` (also when there was none to go to). Settled is
* not "received": the delivery rows carry that, each with its own retries.
*
* The runtime role may insert an event, set `delivered_at` (the one column it may update) and
* delete an event that is settled and older than {@link EVENT_RETENTION_FLOOR}: the retention
* job's purge (ADR 0017).
*/
declare const events: PgTableWithColumns_a5zn0g9<{
	name: "events";
	schema: "auth";
	columns: {
		projectId: PgColumn_ffrhhp9<{
			name: "project_id";
			tableName: "events";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp9<{
			name: "environment_id";
			tableName: "events";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp9<{
			name: "id";
			tableName: "events";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		type: PgColumn_ffrhhp9<{
			name: "type";
			tableName: "events";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		payload: PgColumn_ffrhhp9<{
			name: "payload";
			tableName: "events";
			dataType: "json";
			columnType: "PgJsonb";
			data: Record<string, unknown>;
			driverParam: unknown;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			$type: Record<string, unknown>;
		}>;
		occurredAt: PgColumn_ffrhhp9<{
			name: "occurred_at";
			tableName: "events";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		deliveredAt: PgColumn_ffrhhp9<{
			name: "delivered_at";
			tableName: "events";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** An event row. */
type Event = typeof events.$inferSelect;
/** Insert shape for an event. */
type NewEvent = typeof events.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g10 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp10 } from "drizzle-orm/pg-core";
/** In-progress sign-in, sign-up and password-reset attempts driving the server-side flow state machine (§5.2). */
declare const flowAttempts: PgTableWithColumns_a5zn0g10<{
	name: "flow_attempts";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp10<{
			name: "created_at";
			tableName: "flow_attempts";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp10<{
			name: "updated_at";
			tableName: "flow_attempts";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp10<{
			name: "project_id";
			tableName: "flow_attempts";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp10<{
			name: "environment_id";
			tableName: "flow_attempts";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp10<{
			name: "id";
			tableName: "flow_attempts";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		kind: PgColumn_ffrhhp10<{
			name: "kind";
			tableName: "flow_attempts";
			dataType: "string";
			columnType: "PgText";
			data: "password_reset" | "sign_in" | "sign_up";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["sign_in", "sign_up", "password_reset"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		status: PgColumn_ffrhhp10<{
			name: "status";
			tableName: "flow_attempts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userId: PgColumn_ffrhhp10<{
			name: "user_id";
			tableName: "flow_attempts";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		identifier: PgColumn_ffrhhp10<{
			name: "identifier";
			tableName: "flow_attempts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		secretHash: PgColumn_ffrhhp10<{
			name: "secret_hash";
			tableName: "flow_attempts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp10<{
			name: "state";
			tableName: "flow_attempts";
			dataType: "json";
			columnType: "PgJsonb";
			data: Record<string, unknown>;
			driverParam: unknown;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			$type: Record<string, unknown>;
		}>;
		expiresAt: PgColumn_ffrhhp10<{
			name: "expires_at";
			tableName: "flow_attempts";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		completedAt: PgColumn_ffrhhp10<{
			name: "completed_at";
			tableName: "flow_attempts";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A flow attempt row. */
type FlowAttemptRow = typeof flowAttempts.$inferSelect;
/** Insert shape for a flow attempt. */
type NewFlowAttemptRow = typeof flowAttempts.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g11 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp11 } from "drizzle-orm/pg-core";
/**
* How many calls of a hook came to each outcome in one hour (ADR 0035, "Recent outcomes"):
* what an operator is shown of a hook's recent calls.
*
* One row per hook, hour (UTC) and outcome, counted up by every call of that outcome.
* **It is a count and not a log**: there is no row for a call, so no time of any call but
* the latest of its hour and outcome (`last_at`), and nothing a call can be told from
* another by. There is no column for anything of the question (it holds an email address
* and an IP address), for the operator's code of a denial, for a claim, for a status code or
* for a failure's reason, and there must never be one: the outcome is one of four fixed
* words (`hook_call_counts_outcome_known`).
*
* `hour` is the beginning of an hour (`hook_call_counts_hour_whole`). Rows go with their
* hook by cascade, and the retention job deletes the hours past its period (ADR 0017). The
* runtime role's `UPDATE` is of the counter, `last_at` and `updated_at` only: a row cannot
* be moved to another hook, hour or outcome.
*/
declare const hookCallCounts: PgTableWithColumns_a5zn0g11<{
	name: "hook_call_counts";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp11<{
			name: "created_at";
			tableName: "hook_call_counts";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp11<{
			name: "updated_at";
			tableName: "hook_call_counts";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp11<{
			name: "project_id";
			tableName: "hook_call_counts";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp11<{
			name: "environment_id";
			tableName: "hook_call_counts";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp11<{
			name: "id";
			tableName: "hook_call_counts";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		hookId: PgColumn_ffrhhp11<{
			name: "hook_id";
			tableName: "hook_call_counts";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		hour: PgColumn_ffrhhp11<{
			name: "hour";
			tableName: "hook_call_counts";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		outcome: PgColumn_ffrhhp11<{
			name: "outcome";
			tableName: "hook_call_counts";
			dataType: "string";
			columnType: "PgText";
			data: "allowed" | "denied" | "failed" | "timed_out";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["allowed", "denied", "failed", "timed_out"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		calls: PgColumn_ffrhhp11<{
			name: "calls";
			tableName: "hook_call_counts";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lastAt: PgColumn_ffrhhp11<{
			name: "last_at";
			tableName: "hook_call_counts";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A row of hook call counts. */
type HookCallCount = typeof hookCallCounts.$inferSelect;
/** Insert shape for a row of hook call counts. */
type NewHookCallCount = typeof hookCallCounts.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g12 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp12 } from "drizzle-orm/pg-core";
/**
* The questions an environment has the server ask an operator's endpoint before it acts
* (ADR 0035): a hook. One row per point at most (`hooks_environment_point_key`).
*
* `secret` is the Standard Webhooks signing secret (`whsec_…`) sealed with AES-256-GCM under
* `TULA_MASTER_KEY`, bound to the environment and the hook's id, under a purpose of its own:
* a ciphertext copied to another row, or to a webhook endpoint, does not open. It is returned
* once, when the hook is registered, and by no API afterwards.
*
* `deadline_ms` is how long the server waits for the answer. The API validates it, and the
* database refuses a value outside 100 to 5000 by itself (`hooks_deadline_bounds`): a hook is
* on the path of someone signing up, and no write of any kind may make that wait longer.
*
* `last_failed_at` and `last_failure_reason` are what the operator is shown of a hook that is
* failing: a time, and one of the server's own fixed words. There is no column for anything
* the endpoint answered, and there must never be one. What its recent calls came to is
* counted beside it, in `hook_call_counts`, never on this row: every sign-in reads it.
*/
declare const hooks: PgTableWithColumns_a5zn0g12<{
	name: "hooks";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp12<{
			name: "created_at";
			tableName: "hooks";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp12<{
			name: "updated_at";
			tableName: "hooks";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp12<{
			name: "project_id";
			tableName: "hooks";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp12<{
			name: "environment_id";
			tableName: "hooks";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp12<{
			name: "id";
			tableName: "hooks";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		point: PgColumn_ffrhhp12<{
			name: "point";
			tableName: "hooks";
			dataType: "string";
			columnType: "PgText";
			data: "before_session" | "before_sign_up" | "before_token";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["before_sign_up", "before_session", "before_token"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		url: PgColumn_ffrhhp12<{
			name: "url";
			tableName: "hooks";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		secret: PgColumn_ffrhhp12<{
			name: "secret";
			tableName: "hooks";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		enabled: PgColumn_ffrhhp12<{
			name: "enabled";
			tableName: "hooks";
			dataType: "boolean";
			columnType: "PgBoolean";
			data: boolean;
			driverParam: boolean;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		deadlineMs: PgColumn_ffrhhp12<{
			name: "deadline_ms";
			tableName: "hooks";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		failureMode: PgColumn_ffrhhp12<{
			name: "failure_mode";
			tableName: "hooks";
			dataType: "string";
			columnType: "PgText";
			data: "allow" | "deny";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["deny", "allow"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lastFailedAt: PgColumn_ffrhhp12<{
			name: "last_failed_at";
			tableName: "hooks";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lastFailureReason: PgColumn_ffrhhp12<{
			name: "last_failure_reason";
			tableName: "hooks";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A hook row. */
type HookRow = typeof hooks.$inferSelect;
/** Insert shape for a hook. */
type NewHookRow = typeof hooks.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g13 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp13 } from "drizzle-orm/pg-core";
/** Identity providers: the email address itself, and the OAuth providers (ADR 0026). */
declare const IDENTITY_PROVIDERS: readonly ["email", "google", "apple", "github", "microsoft", "discord", "linkedin", "x", "facebook"];
/** How a user proves who they are: one row per provider account (email address, Google sub…). */
declare const identities: PgTableWithColumns_a5zn0g13<{
	name: "identities";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp13<{
			name: "created_at";
			tableName: "identities";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp13<{
			name: "updated_at";
			tableName: "identities";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp13<{
			name: "project_id";
			tableName: "identities";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp13<{
			name: "environment_id";
			tableName: "identities";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp13<{
			name: "id";
			tableName: "identities";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userId: PgColumn_ffrhhp13<{
			name: "user_id";
			tableName: "identities";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		provider: PgColumn_ffrhhp13<{
			name: "provider";
			tableName: "identities";
			dataType: "string";
			columnType: "PgText";
			data: "apple" | "discord" | "email" | "facebook" | "github" | "google" | "linkedin" | "microsoft" | "x";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["email", "google", "apple", "github", "microsoft", "discord", "linkedin", "x", "facebook"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		providerSubject: PgColumn_ffrhhp13<{
			name: "provider_subject";
			tableName: "identities";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** An identity row. */
type Identity = typeof identities.$inferSelect;
/** Insert shape for an identity. */
type NewIdentity = typeof identities.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g14 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp14 } from "drizzle-orm/pg-core";
/**
* Append-only record of what the deployment's operator did outside any one environment:
* dashboard sign-ins (and failures), and changes to workspaces, projects and environments
* (ADR 0032).
*
* Control plane, like `workspaces`: no tenant columns and no row-level security, because the
* actions it records are not one environment's. The runtime role may only read and insert.
*/
declare const instanceAuditLogs: PgTableWithColumns_a5zn0g14<{
	name: "instance_audit_logs";
	schema: "auth";
	columns: {
		id: PgColumn_ffrhhp14<{
			name: "id";
			tableName: "instance_audit_logs";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		actorType: PgColumn_ffrhhp14<{
			name: "actor_type";
			tableName: "instance_audit_logs";
			dataType: "string";
			columnType: "PgText";
			data: "admin" | "agent" | "instance_admin" | "system" | "user";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["user", "admin", "system", "agent", "instance_admin"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		actorId: PgColumn_ffrhhp14<{
			name: "actor_id";
			tableName: "instance_audit_logs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		action: PgColumn_ffrhhp14<{
			name: "action";
			tableName: "instance_audit_logs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		targetType: PgColumn_ffrhhp14<{
			name: "target_type";
			tableName: "instance_audit_logs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		targetId: PgColumn_ffrhhp14<{
			name: "target_id";
			tableName: "instance_audit_logs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		ipAddress: PgColumn_ffrhhp14<{
			name: "ip_address";
			tableName: "instance_audit_logs";
			dataType: "string";
			columnType: "PgInet";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userAgent: PgColumn_ffrhhp14<{
			name: "user_agent";
			tableName: "instance_audit_logs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		metadata: PgColumn_ffrhhp14<{
			name: "metadata";
			tableName: "instance_audit_logs";
			dataType: "json";
			columnType: "PgJsonb";
			data: Record<string, unknown>;
			driverParam: unknown;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			$type: Record<string, unknown>;
		}>;
		occurredAt: PgColumn_ffrhhp14<{
			name: "occurred_at";
			tableName: "instance_audit_logs";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** An instance audit log row. */
type InstanceAuditLog = typeof instanceAuditLogs.$inferSelect;
/** Insert shape for an instance audit log row. */
type NewInstanceAuditLog = typeof instanceAuditLogs.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g15 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp15 } from "drizzle-orm/pg-core";
import { Column as Column_xh1aba } from "drizzle-orm";
import { PgColumnBuilder as PgColumnBuilder_r7cy32 } from "drizzle-orm/pg-core";
import { ColumnBuilderExtraConfig as ColumnBuilderExtraConfig_359rmb } from "drizzle-orm";
/**
* The native apps an environment says are its own (ADR 0040): what the two association files
* served for the environment are built from, and from nothing else.
*
* An app is its `platform` and its `identifier` (an iOS bundle id, an Android package name):
* one row per pair in an environment (`native_apps_environment_platform_identifier_key`),
* and neither can be changed afterwards.
*
* An iOS app has a `team_id` and no fingerprints; an Android app has between one and ten
* `sha256_cert_fingerprints` and no team. The API validates all of it, and the database
* refuses a row of another shape by itself: the files are public and are served from these
* rows as they are, so no write of any kind may put something else into one.
*
* Either may have `app_link_paths` (ADR 0044): exact paths whose links the served files hand
* the app. The check `native_apps_app_link_paths_shape` holds each to one plain path.
*
* Nothing here is a secret.
*/
declare const nativeApps: PgTableWithColumns_a5zn0g15<{
	name: "native_apps";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp15<{
			name: "created_at";
			tableName: "native_apps";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp15<{
			name: "updated_at";
			tableName: "native_apps";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp15<{
			name: "project_id";
			tableName: "native_apps";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp15<{
			name: "environment_id";
			tableName: "native_apps";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp15<{
			name: "id";
			tableName: "native_apps";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		platform: PgColumn_ffrhhp15<{
			name: "platform";
			tableName: "native_apps";
			dataType: "string";
			columnType: "PgText";
			data: "android" | "ios";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["ios", "android"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		identifier: PgColumn_ffrhhp15<{
			name: "identifier";
			tableName: "native_apps";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		teamId: PgColumn_ffrhhp15<{
			name: "team_id";
			tableName: "native_apps";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sha256CertFingerprints: PgColumn_ffrhhp15<{
			name: "sha256_cert_fingerprints";
			tableName: "native_apps";
			dataType: "array";
			columnType: "PgArray";
			data: string[];
			driverParam: string | string[];
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: Column_xh1aba<{
				name: "sha256_cert_fingerprints";
				tableName: "native_apps";
				dataType: "string";
				columnType: "PgText";
				data: string;
				driverParam: string;
				notNull: false;
				hasDefault: false;
				isPrimaryKey: false;
				isAutoincrement: false;
				hasRuntimeDefault: false;
				enumValues: [string, ...string[]];
				baseColumn: never;
				identity: undefined;
				generated: undefined;
			}, {}, {}>;
			identity: undefined;
			generated: undefined;
		}, {}, {
			baseBuilder: PgColumnBuilder_r7cy32<{
				name: "sha256_cert_fingerprints";
				dataType: "string";
				columnType: "PgText";
				data: string;
				enumValues: [string, ...string[]];
				driverParam: string;
			}, {}, {}, ColumnBuilderExtraConfig_359rmb>;
			size: undefined;
		}>;
		appLinkPaths: PgColumn_ffrhhp15<{
			name: "app_link_paths";
			tableName: "native_apps";
			dataType: "array";
			columnType: "PgArray";
			data: string[];
			driverParam: string | string[];
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: Column_xh1aba<{
				name: "app_link_paths";
				tableName: "native_apps";
				dataType: "string";
				columnType: "PgText";
				data: string;
				driverParam: string;
				notNull: false;
				hasDefault: false;
				isPrimaryKey: false;
				isAutoincrement: false;
				hasRuntimeDefault: false;
				enumValues: [string, ...string[]];
				baseColumn: never;
				identity: undefined;
				generated: undefined;
			}, {}, {}>;
			identity: undefined;
			generated: undefined;
		}, {}, {
			baseBuilder: PgColumnBuilder_r7cy32<{
				name: "app_link_paths";
				dataType: "string";
				columnType: "PgText";
				data: string;
				enumValues: [string, ...string[]];
				driverParam: string;
			}, {}, {}, ColumnBuilderExtraConfig_359rmb>;
			size: undefined;
		}>;
	};
	dialect: "pg";
}>;
/** A native app row. */
type NativeAppRow = typeof nativeApps.$inferSelect;
/** Insert shape for a native app. */
type NewNativeAppRow = typeof nativeApps.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g16 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp16 } from "drizzle-orm/pg-core";
/** The OAuth providers an environment can configure (ADR 0026). */
declare const OAUTH_PROVIDERS: readonly ["google", "github", "apple", "microsoft", "discord", "linkedin", "x", "facebook"];
/** What a provider needs besides a client id and a secret. Never a secret itself. */
interface OAuthProviderConfig {
	/** Apple: the developer team id (the `iss` of the client-secret JWT). */
	teamId?: string;
	/** Apple: the id of the key the client-secret JWT is signed with. */
	keyId?: string;
	/** Microsoft: which accounts may sign in (`common`, `organizations`, `consumers`, a tenant id). */
	tenant?: string;
	/**
	* Google: the client ids of the operator's native apps, whose ID tokens a native sign-in
	* accepts beside `client_id`'s (ADR 0045). Sorted, without repeats. Read tolerantly: an
	* entry that is not a client id is not an accepted audience.
	*/
	additionalClientIds?: string[];
}
/**
* An environment's own credentials for one OAuth provider (ADR 0026).
*
* One row per environment and provider. `secret` is the provider's secret material (a client
* secret, or Apple's private key) sealed with AES-256-GCM under `TULA_MASTER_KEY` and bound to
* the environment and the provider, so a ciphertext copied to another row does not decrypt. It
* is never returned by any API. `client_id`, `config` and `enabled` are not secrets.
*
* No provider access or refresh token is ever stored: there is no column for one.
*/
declare const oauthProviders: PgTableWithColumns_a5zn0g16<{
	name: "oauth_providers";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp16<{
			name: "created_at";
			tableName: "oauth_providers";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp16<{
			name: "updated_at";
			tableName: "oauth_providers";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp16<{
			name: "project_id";
			tableName: "oauth_providers";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp16<{
			name: "environment_id";
			tableName: "oauth_providers";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp16<{
			name: "id";
			tableName: "oauth_providers";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		provider: PgColumn_ffrhhp16<{
			name: "provider";
			tableName: "oauth_providers";
			dataType: "string";
			columnType: "PgText";
			data: "apple" | "discord" | "facebook" | "github" | "google" | "linkedin" | "microsoft" | "x";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["google", "github", "apple", "microsoft", "discord", "linkedin", "x", "facebook"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		clientId: PgColumn_ffrhhp16<{
			name: "client_id";
			tableName: "oauth_providers";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		secret: PgColumn_ffrhhp16<{
			name: "secret";
			tableName: "oauth_providers";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		config: PgColumn_ffrhhp16<{
			name: "config";
			tableName: "oauth_providers";
			dataType: "json";
			columnType: "PgJsonb";
			data: OAuthProviderConfig;
			driverParam: unknown;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			$type: OAuthProviderConfig;
		}>;
		enabled: PgColumn_ffrhhp16<{
			name: "enabled";
			tableName: "oauth_providers";
			dataType: "boolean";
			columnType: "PgBoolean";
			data: boolean;
			driverParam: boolean;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** An OAuth provider row. */
type OAuthProviderRow = typeof oauthProviders.$inferSelect;
/** Insert shape for an OAuth provider. */
type NewOAuthProviderRow = typeof oauthProviders.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g17 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp17 } from "drizzle-orm/pg-core";
/** What a stored WebAuthn challenge was issued for. */
declare const PASSKEY_CHALLENGE_PURPOSES: readonly ["registration", "step_up"];
/**
* WebAuthn challenges issued to a signed-in session: for registering a passkey and for a
* step-up (ADR 0027). A sign-in's challenge lives on its flow attempt instead.
*
* A session has at most one challenge per purpose (asking again replaces it). A challenge is
* taken by deleting its row, so it is honoured once, and only before `expires_at` (five
* minutes). It is not a secret: the browser is sent it. Expired rows are removed by the
* retention job (ADR 0017).
*/
declare const passkeyChallenges: PgTableWithColumns_a5zn0g17<{
	name: "passkey_challenges";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp17<{
			name: "created_at";
			tableName: "passkey_challenges";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp17<{
			name: "updated_at";
			tableName: "passkey_challenges";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp17<{
			name: "project_id";
			tableName: "passkey_challenges";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp17<{
			name: "environment_id";
			tableName: "passkey_challenges";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp17<{
			name: "id";
			tableName: "passkey_challenges";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userId: PgColumn_ffrhhp17<{
			name: "user_id";
			tableName: "passkey_challenges";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sessionId: PgColumn_ffrhhp17<{
			name: "session_id";
			tableName: "passkey_challenges";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		purpose: PgColumn_ffrhhp17<{
			name: "purpose";
			tableName: "passkey_challenges";
			dataType: "string";
			columnType: "PgText";
			data: "registration" | "step_up";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["registration", "step_up"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		challenge: PgColumn_ffrhhp17<{
			name: "challenge";
			tableName: "passkey_challenges";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		expiresAt: PgColumn_ffrhhp17<{
			name: "expires_at";
			tableName: "passkey_challenges";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A passkey-challenge row. */
type PasskeyChallenge = typeof passkeyChallenges.$inferSelect;
/** Insert shape for a passkey challenge. */
type NewPasskeyChallenge = typeof passkeyChallenges.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g18 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp18 } from "drizzle-orm/pg-core";
/**
* WebAuthn credentials ("passkeys") of users (ADR 0027).
*
* Nothing here is a secret: `public_key` is the credential's COSE public key, and the private
* key never leaves the authenticator. A table of its own rather than `credentials`, because a
* user has many and a sign-in looks one up by `credential_id` alone.
*
* - `credential_id` is unique per environment (base64url, as the browser sends it).
* - `user_handle` is the opaque id given to the authenticator as `user.id`: 32 bytes,
*   `HMAC-SHA256(key from TULA_MASTER_KEY, environment : user)`. It is derived, not random: the
*   same for every passkey of one user, and it says nothing about the email or the user id to
*   anyone without the key. Each row stores the handle it was registered with, and an
*   assertion is checked against its own row's. So after a change of the master key a user's
*   new passkeys carry a different handle than their existing rows; both keep working.
* - `sign_count` is the authenticator's signature counter. `0` for one that keeps none (synced
*   passkeys); otherwise it must grow with every use, and one that does not is refused.
* - `backup_eligible` / `backed_up` are the BE and BS flags of the last authenticator data.
*/
declare const passkeys: PgTableWithColumns_a5zn0g18<{
	name: "passkeys";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp18<{
			name: "created_at";
			tableName: "passkeys";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp18<{
			name: "updated_at";
			tableName: "passkeys";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp18<{
			name: "project_id";
			tableName: "passkeys";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp18<{
			name: "environment_id";
			tableName: "passkeys";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp18<{
			name: "id";
			tableName: "passkeys";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userId: PgColumn_ffrhhp18<{
			name: "user_id";
			tableName: "passkeys";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		credentialId: PgColumn_ffrhhp18<{
			name: "credential_id";
			tableName: "passkeys";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		publicKey: PgColumn_ffrhhp18<{
			name: "public_key";
			tableName: "passkeys";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: Uint8Array<ArrayBufferLike>;
			driverParam: Uint8Array<ArrayBufferLike>;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		signCount: PgColumn_ffrhhp18<{
			name: "sign_count";
			tableName: "passkeys";
			dataType: "number";
			columnType: "PgBigInt53";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		transports: PgColumn_ffrhhp18<{
			name: "transports";
			tableName: "passkeys";
			dataType: "json";
			columnType: "PgJsonb";
			data: string[];
			driverParam: unknown;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			$type: string[];
		}>;
		aaguid: PgColumn_ffrhhp18<{
			name: "aaguid";
			tableName: "passkeys";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		backupEligible: PgColumn_ffrhhp18<{
			name: "backup_eligible";
			tableName: "passkeys";
			dataType: "boolean";
			columnType: "PgBoolean";
			data: boolean;
			driverParam: boolean;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		backedUp: PgColumn_ffrhhp18<{
			name: "backed_up";
			tableName: "passkeys";
			dataType: "boolean";
			columnType: "PgBoolean";
			data: boolean;
			driverParam: boolean;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userHandle: PgColumn_ffrhhp18<{
			name: "user_handle";
			tableName: "passkeys";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		name: PgColumn_ffrhhp18<{
			name: "name";
			tableName: "passkeys";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lastUsedAt: PgColumn_ffrhhp18<{
			name: "last_used_at";
			tableName: "passkeys";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A passkey row. */
type Passkey = typeof passkeys.$inferSelect;
/** Insert shape for a passkey. */
type NewPasskey = typeof passkeys.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g19 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp19 } from "drizzle-orm/pg-core";
/**
* The passwords a user had before their current one (ADR 0038), kept so that the environment's
* `password.history` can refuse one of them as a new password.
*
* One row per previous password. `secret` is the argon2id hash exactly as it stood in
* `credentials` when the password stopped being the current one: the store copies it from that
* row inside the transaction that changes the password, so it is as expensive to attack as a
* current hash and is never a second, cheaper form of the password. The current password is
* not here: it is the `credentials` row.
*
* `position` says how far back a password is: 1 is the one before the current, 2 the one
* before that. A password change moves every row of the user one further back and deletes
* what is then beyond what the policy keeps (`history` minus one, the current one counting).
* It is a column, and not an order read from `created_at`, so that "beyond what the policy
* keeps" is an indexed range of one environment: the retention job deletes the rows a lowered
* `password.history` has left behind without reading the rest (ADR 0017).
*
* Rows go with their user (the foreign key cascades), and with the password itself when an
* address is first proven by someone who did not prove the password (ADR 0024): that password
* and every one before it were chosen by a stranger.
*
* The runtime role may change `position` and `updated_at` only: a row's hash, its user and its
* environment cannot be rewritten.
*
* A user has one row at a position: `password_history_user_position_unique`, a
* `UNIQUE (user_id, position) DEFERRABLE INITIALLY IMMEDIATE` constraint. It is written by hand
* in the migration (0026) and not declared here, because Drizzle cannot say `DEFERRABLE`, and
* a plain unique index would refuse the very statement that moves a user's rows one place
* back (it is judged row by row; a deferrable constraint when the statement ends). Its index
* is also what a user's rows are read by, newest first, so there is no other index on
* `(user_id, position)`.
*/
declare const passwordHistory: PgTableWithColumns_a5zn0g19<{
	name: "password_history";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp19<{
			name: "created_at";
			tableName: "password_history";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp19<{
			name: "updated_at";
			tableName: "password_history";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp19<{
			name: "project_id";
			tableName: "password_history";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp19<{
			name: "environment_id";
			tableName: "password_history";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp19<{
			name: "id";
			tableName: "password_history";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userId: PgColumn_ffrhhp19<{
			name: "user_id";
			tableName: "password_history";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		secret: PgColumn_ffrhhp19<{
			name: "secret";
			tableName: "password_history";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		position: PgColumn_ffrhhp19<{
			name: "position";
			tableName: "password_history";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A previous password's row. */
type PasswordHistoryEntry = typeof passwordHistory.$inferSelect;
/** Insert shape for a previous password's row. */
type NewPasswordHistoryEntry = typeof passwordHistory.$inferInsert;
import { PgSchema as PgSchema_mtt0uw } from "drizzle-orm/pg-core";
/**
* The `auth` Postgres schema, owned by the auth service (login role `closeline_auth`).
*
* The tables in it come from tula-auth (ADR 0005) and keep its names and columns, so the service
* copied from it runs unchanged. They are scoped to an environment by row-level security, not to
* an Organization: users are global within a Region, and Organizations live in core.
*/
declare const authSchema: PgSchema_mtt0uw<"auth">;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g20 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp20 } from "drizzle-orm/pg-core";
/** An app a workspace secures, e.g. "Mobile app" (control plane). */
declare const projects: PgTableWithColumns_a5zn0g20<{
	name: "projects";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp20<{
			name: "created_at";
			tableName: "projects";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp20<{
			name: "updated_at";
			tableName: "projects";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp20<{
			name: "id";
			tableName: "projects";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		workspaceId: PgColumn_ffrhhp20<{
			name: "workspace_id";
			tableName: "projects";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		name: PgColumn_ffrhhp20<{
			name: "name";
			tableName: "projects";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A project row. */
type Project = typeof projects.$inferSelect;
/** Insert shape for a project. */
type NewProject = typeof projects.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g21 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp21 } from "drizzle-orm/pg-core";
/**
* Changes an AI agent has asked for (ADR 0053): a proposal. A row says what would be done
* (`operation`) to what (`target_type`, `target_id`), who asked (`proposed_by`, the id of an
* agent key) and until when a human may approve it (`expires_at`). Nothing happens when a row
* is inserted.
*
* **What a proposal is never changes.** The runtime role may update only the columns that
* record the decision and its outcome (`status`, `approved_*`, `failure_reason`,
* `updated_at`): never the operation, the target, who asked or the expiry. So what a human
* approves is what was proposed, whatever an attacker with the API's own database role tries
* between the two.
*
* `status` is `pending`, `approved`, `executed` or `failed`; "expired" is not stored, it is
* read from `expires_at`. A row leaves `pending` once, by a compare-and-set in the store, and
* the check `proposals_approval_whole` keeps the approver and the time together with it.
*
* There is no column for text: no reason, no note, no name. A proposal holds ids, times and
* words from the contract's closed lists, and must never get a column an agent can write
* prose into. `target_id` and `proposed_by` are deliberately not foreign keys: the row is a
* record, and outlives a user who was deleted or a key that was revoked.
*/
declare const proposals: PgTableWithColumns_a5zn0g21<{
	name: "proposals";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp21<{
			name: "created_at";
			tableName: "proposals";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp21<{
			name: "updated_at";
			tableName: "proposals";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp21<{
			name: "project_id";
			tableName: "proposals";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp21<{
			name: "environment_id";
			tableName: "proposals";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp21<{
			name: "id";
			tableName: "proposals";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		operation: PgColumn_ffrhhp21<{
			name: "operation";
			tableName: "proposals";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		targetType: PgColumn_ffrhhp21<{
			name: "target_type";
			tableName: "proposals";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		targetId: PgColumn_ffrhhp21<{
			name: "target_id";
			tableName: "proposals";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		proposedBy: PgColumn_ffrhhp21<{
			name: "proposed_by";
			tableName: "proposals";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		status: PgColumn_ffrhhp21<{
			name: "status";
			tableName: "proposals";
			dataType: "string";
			columnType: "PgText";
			data: "approved" | "executed" | "failed" | "pending";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["pending", "approved", "executed", "failed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		expiresAt: PgColumn_ffrhhp21<{
			name: "expires_at";
			tableName: "proposals";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		approvedByType: PgColumn_ffrhhp21<{
			name: "approved_by_type";
			tableName: "proposals";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		approvedById: PgColumn_ffrhhp21<{
			name: "approved_by_id";
			tableName: "proposals";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		approvedAt: PgColumn_ffrhhp21<{
			name: "approved_at";
			tableName: "proposals";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		failureReason: PgColumn_ffrhhp21<{
			name: "failure_reason";
			tableName: "proposals";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A proposal row. */
type ProposalRow = typeof proposals.$inferSelect;
/** Insert shape for a proposal. */
type NewProposalRow = typeof proposals.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g22 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp22 } from "drizzle-orm/pg-core";
/**
* Opaque, single-use refresh tokens, stored only as SHA-256 hashes and chained parent → child.
*
* Rotation sets `used_at` and `replaced_by_id`. The child token's secret is **derived**, not
* stored: `HMAC(refresh-derivation key, parent id)`. So within the profile's `reuseGracePeriod`
* the server can hand a racing client the same child again without keeping any recoverable token
* material in the database. Any reuse after the window revokes the session (the token family).
*
* Pruning is **by session only**: delete expired/revoked sessions and let the cascade remove their
* whole chain in one statement. Deleting individual tokens is rejected by the self-referencing
* foreign keys (a parent's `replaced_by_id` or a child's `parent_id` would dangle).
*/
declare const refreshTokens: PgTableWithColumns_a5zn0g22<{
	name: "refresh_tokens";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp22<{
			name: "created_at";
			tableName: "refresh_tokens";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp22<{
			name: "updated_at";
			tableName: "refresh_tokens";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp22<{
			name: "project_id";
			tableName: "refresh_tokens";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp22<{
			name: "environment_id";
			tableName: "refresh_tokens";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp22<{
			name: "id";
			tableName: "refresh_tokens";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sessionId: PgColumn_ffrhhp22<{
			name: "session_id";
			tableName: "refresh_tokens";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		tokenHash: PgColumn_ffrhhp22<{
			name: "token_hash";
			tableName: "refresh_tokens";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		parentId: PgColumn_ffrhhp22<{
			name: "parent_id";
			tableName: "refresh_tokens";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		replacedById: PgColumn_ffrhhp22<{
			name: "replaced_by_id";
			tableName: "refresh_tokens";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		usedAt: PgColumn_ffrhhp22<{
			name: "used_at";
			tableName: "refresh_tokens";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		expiresAt: PgColumn_ffrhhp22<{
			name: "expires_at";
			tableName: "refresh_tokens";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A refresh token row. */
type RefreshToken = typeof refreshTokens.$inferSelect;
/** Insert shape for a refresh token. */
type NewRefreshToken = typeof refreshTokens.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g23 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp23 } from "drizzle-orm/pg-core";
import { Column as Column_xh1aba2 } from "drizzle-orm";
import { PgColumnBuilder as PgColumnBuilder_r7cy322 } from "drizzle-orm/pg-core";
import { ColumnBuilderExtraConfig as ColumnBuilderExtraConfig_359rmb2 } from "drizzle-orm";
/** Client platforms a session was created from. */
declare const SESSION_CLIENTS: readonly ["web", "ios", "android", "server"];
/** Why a session ended early. */
declare const SESSION_REVOKE_REASONS: readonly ["sign_out", "revoked_by_user", "revoked_by_admin", "password_changed", "reuse_detected", "user_banned", "mfa_changed", "session_limit"];
/** How a session is held: `hybrid` (access + refresh tokens) or `stateful` (one cookie). */
declare const SESSION_TYPES: readonly ["hybrid", "stateful"];
/**
* A signed-in device. A session is also the refresh-token *family*: reuse detection revokes the
* session, which invalidates every refresh token issued for it at once.
*/
declare const sessions: PgTableWithColumns_a5zn0g23<{
	name: "sessions";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp23<{
			name: "created_at";
			tableName: "sessions";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp23<{
			name: "updated_at";
			tableName: "sessions";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp23<{
			name: "project_id";
			tableName: "sessions";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp23<{
			name: "environment_id";
			tableName: "sessions";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp23<{
			name: "id";
			tableName: "sessions";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userId: PgColumn_ffrhhp23<{
			name: "user_id";
			tableName: "sessions";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		profile: PgColumn_ffrhhp23<{
			name: "profile";
			tableName: "sessions";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		type: PgColumn_ffrhhp23<{
			name: "type";
			tableName: "sessions";
			dataType: "string";
			columnType: "PgText";
			data: "hybrid" | "stateful";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["hybrid", "stateful"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		client: PgColumn_ffrhhp23<{
			name: "client";
			tableName: "sessions";
			dataType: "string";
			columnType: "PgText";
			data: "android" | "ios" | "server" | "web";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["web", "ios", "android", "server"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userAgent: PgColumn_ffrhhp23<{
			name: "user_agent";
			tableName: "sessions";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		ipAddress: PgColumn_ffrhhp23<{
			name: "ip_address";
			tableName: "sessions";
			dataType: "string";
			columnType: "PgInet";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lastActiveAt: PgColumn_ffrhhp23<{
			name: "last_active_at";
			tableName: "sessions";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		idleExpiresAt: PgColumn_ffrhhp23<{
			name: "idle_expires_at";
			tableName: "sessions";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		absoluteExpiresAt: PgColumn_ffrhhp23<{
			name: "absolute_expires_at";
			tableName: "sessions";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		factorVerifiedAt: PgColumn_ffrhhp23<{
			name: "factor_verified_at";
			tableName: "sessions";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		authMethods: PgColumn_ffrhhp23<{
			name: "auth_methods";
			tableName: "sessions";
			dataType: "array";
			columnType: "PgArray";
			data: string[];
			driverParam: string | string[];
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: Column_xh1aba2<{
				name: "auth_methods";
				tableName: "sessions";
				dataType: "string";
				columnType: "PgText";
				data: string;
				driverParam: string;
				notNull: false;
				hasDefault: false;
				isPrimaryKey: false;
				isAutoincrement: false;
				hasRuntimeDefault: false;
				enumValues: [string, ...string[]];
				baseColumn: never;
				identity: undefined;
				generated: undefined;
			}, {}, {}>;
			identity: undefined;
			generated: undefined;
		}, {}, {
			baseBuilder: PgColumnBuilder_r7cy322<{
				name: "auth_methods";
				dataType: "string";
				columnType: "PgText";
				data: string;
				enumValues: [string, ...string[]];
				driverParam: string;
			}, {}, {}, ColumnBuilderExtraConfig_359rmb2>;
			size: undefined;
		}>;
		hookClaims: PgColumn_ffrhhp23<{
			name: "hook_claims";
			tableName: "sessions";
			dataType: "json";
			columnType: "PgJsonb";
			data: Record<string, unknown>;
			driverParam: unknown;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			$type: Record<string, unknown>;
		}>;
		deviceThumbprint: PgColumn_ffrhhp23<{
			name: "device_thumbprint";
			tableName: "sessions";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		revokedAt: PgColumn_ffrhhp23<{
			name: "revoked_at";
			tableName: "sessions";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		revokeReason: PgColumn_ffrhhp23<{
			name: "revoke_reason";
			tableName: "sessions";
			dataType: "string";
			columnType: "PgText";
			data: "mfa_changed" | "password_changed" | "reuse_detected" | "revoked_by_admin" | "revoked_by_user" | "session_limit" | "sign_out" | "user_banned";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["sign_out", "revoked_by_user", "revoked_by_admin", "password_changed", "reuse_detected", "user_banned", "mfa_changed", "session_limit"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A session row. */
type Session = typeof sessions.$inferSelect;
/** Insert shape for a session. */
type NewSession = typeof sessions.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g24 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp24 } from "drizzle-orm/pg-core";
/** Key lifecycle: `next` is published ahead of use, `active` signs, `retired` only verifies. */
declare const SIGNING_KEY_STATUSES: readonly ["next", "active", "retired"];
/** Ed25519 keys that sign an environment's access tokens. The row id is the JWT `kid`. */
declare const signingKeys: PgTableWithColumns_a5zn0g24<{
	name: "signing_keys";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp24<{
			name: "created_at";
			tableName: "signing_keys";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp24<{
			name: "updated_at";
			tableName: "signing_keys";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp24<{
			name: "project_id";
			tableName: "signing_keys";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp24<{
			name: "environment_id";
			tableName: "signing_keys";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp24<{
			name: "id";
			tableName: "signing_keys";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		algorithm: PgColumn_ffrhhp24<{
			name: "algorithm";
			tableName: "signing_keys";
			dataType: "string";
			columnType: "PgText";
			data: "EdDSA";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["EdDSA"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		publicJwk: PgColumn_ffrhhp24<{
			name: "public_jwk";
			tableName: "signing_keys";
			dataType: "json";
			columnType: "PgJsonb";
			data: Record<string, string>;
			driverParam: unknown;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			$type: Record<string, string>;
		}>;
		privateKeyCiphertext: PgColumn_ffrhhp24<{
			name: "private_key_ciphertext";
			tableName: "signing_keys";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		status: PgColumn_ffrhhp24<{
			name: "status";
			tableName: "signing_keys";
			dataType: "string";
			columnType: "PgText";
			data: "active" | "next" | "retired";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["next", "active", "retired"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		activatedAt: PgColumn_ffrhhp24<{
			name: "activated_at";
			tableName: "signing_keys";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		retiredAt: PgColumn_ffrhhp24<{
			name: "retired_at";
			tableName: "signing_keys";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A signing key row. */
type SigningKey = typeof signingKeys.$inferSelect;
/** Insert shape for a signing key. */
type NewSigningKey = typeof signingKeys.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g25 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp25 } from "drizzle-orm/pg-core";
/**
* How many days of counts no `DELETE` of the runtime role can touch: the bound the database
* itself keeps (`sms_code_counts_retention_floor`). Today's rows are what the daily limit is
* held against, so a statement that deleted them would reopen a spent day; a week is far
* inside the retention job's period and wide of any argument about time zones.
*/
declare const SMS_COUNT_RETENTION_FLOOR_DAYS = 7;
/**
* How many codes an environment texted to the numbers of one destination prefix on one day
* (UTC), and how many of those were then entered correctly (ADR 0037). What an operator reads
* to spot SMS pumping: a prefix whose codes are sent and never used.
*
* One row per environment, day and prefix. **It holds no phone number**: `prefix` is a
* country calling prefix, at most four digits, and the check `sms_code_counts_prefix_shape`
* refuses anything longer whatever a statement asks. Nothing says who asked. `used` never
* exceeds `sent` (`sms_code_counts_bounds`).
*
* The day's rows of an environment, added up, are also what its daily limit
* (`sms.dailyMessageLimit`) is held against.
*
* Rows are removed by the retention job (ADR 0017) once their day is older than its period.
* The runtime role's `DELETE` is bound twice by row-level security: the tenant policy to the
* environment in scope, and `sms_code_counts_retention_floor` to days more than
* {@link SMS_COUNT_RETENTION_FLOOR_DAYS} days before today (UTC). Its `UPDATE` is of the two
* counters and `updated_at` only: a row's day, prefix and environment cannot be rewritten.
* A counter can still be lowered as far as `sms_code_counts_bounds` lets it (a message that
* was not sent is counted back out that way), so the table bounds how a count is erased, not
* that it is right.
*/
declare const smsCodeCounts: PgTableWithColumns_a5zn0g25<{
	name: "sms_code_counts";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp25<{
			name: "created_at";
			tableName: "sms_code_counts";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp25<{
			name: "updated_at";
			tableName: "sms_code_counts";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp25<{
			name: "project_id";
			tableName: "sms_code_counts";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp25<{
			name: "environment_id";
			tableName: "sms_code_counts";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp25<{
			name: "id";
			tableName: "sms_code_counts";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		day: PgColumn_ffrhhp25<{
			name: "day";
			tableName: "sms_code_counts";
			dataType: "string";
			columnType: "PgDateString";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		prefix: PgColumn_ffrhhp25<{
			name: "prefix";
			tableName: "sms_code_counts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sent: PgColumn_ffrhhp25<{
			name: "sent";
			tableName: "sms_code_counts";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		used: PgColumn_ffrhhp25<{
			name: "used";
			tableName: "sms_code_counts";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A row of texted-code counts. */
type SmsCodeCount = typeof smsCodeCounts.$inferSelect;
/** Insert shape for a row of texted-code counts. */
type NewSmsCodeCount = typeof smsCodeCounts.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g26 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp26 } from "drizzle-orm/pg-core";
/** Second-factor types stored here. Passkeys (step 1.10) get their own table. */
declare const USER_FACTOR_TYPES: readonly ["totp"];
/**
* A user's second factor: an authenticator app (TOTP, ADR 0025).
*
* Its own table rather than a `credentials` row because a factor has a lifecycle a password
* does not: it is **pending** until confirmed with a code (`confirmed_at` is null and
* `expires_at` says when the enrolment lapses), it carries a replay counter (`last_used_step`,
* the last RFC 6238 time step a code was accepted for; a code is accepted only for a strictly
* greater one), and later a name. One row per user and type: starting again replaces a pending
* row, never a confirmed one.
*
* `secret` is the shared secret sealed with AES-256-GCM under `TULA_MASTER_KEY`, bound to the
* environment, the user and this row's id, so a ciphertext copied to another row does not
* decrypt.
*/
declare const userFactors: PgTableWithColumns_a5zn0g26<{
	name: "user_factors";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp26<{
			name: "created_at";
			tableName: "user_factors";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp26<{
			name: "updated_at";
			tableName: "user_factors";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp26<{
			name: "project_id";
			tableName: "user_factors";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp26<{
			name: "environment_id";
			tableName: "user_factors";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp26<{
			name: "id";
			tableName: "user_factors";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userId: PgColumn_ffrhhp26<{
			name: "user_id";
			tableName: "user_factors";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		type: PgColumn_ffrhhp26<{
			name: "type";
			tableName: "user_factors";
			dataType: "string";
			columnType: "PgText";
			data: "totp";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["totp"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		secret: PgColumn_ffrhhp26<{
			name: "secret";
			tableName: "user_factors";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		name: PgColumn_ffrhhp26<{
			name: "name";
			tableName: "user_factors";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		confirmedAt: PgColumn_ffrhhp26<{
			name: "confirmed_at";
			tableName: "user_factors";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		expiresAt: PgColumn_ffrhhp26<{
			name: "expires_at";
			tableName: "user_factors";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lastUsedStep: PgColumn_ffrhhp26<{
			name: "last_used_step";
			tableName: "user_factors";
			dataType: "number";
			columnType: "PgBigInt53";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A second-factor row. */
type UserFactor = typeof userFactors.$inferSelect;
/** Insert shape for a second factor. */
type NewUserFactor = typeof userFactors.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g27 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp27 } from "drizzle-orm/pg-core";
/** End users of a customer's app, scoped to one environment. */
declare const users: PgTableWithColumns_a5zn0g27<{
	name: "users";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp27<{
			name: "created_at";
			tableName: "users";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp27<{
			name: "updated_at";
			tableName: "users";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp27<{
			name: "project_id";
			tableName: "users";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp27<{
			name: "environment_id";
			tableName: "users";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp27<{
			name: "id";
			tableName: "users";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		email: PgColumn_ffrhhp27<{
			name: "email";
			tableName: "users";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		emailNormalized: PgColumn_ffrhhp27<{
			name: "email_normalized";
			tableName: "users";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		emailVerifiedAt: PgColumn_ffrhhp27<{
			name: "email_verified_at";
			tableName: "users";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		firstName: PgColumn_ffrhhp27<{
			name: "first_name";
			tableName: "users";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lastName: PgColumn_ffrhhp27<{
			name: "last_name";
			tableName: "users";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		bannedAt: PgColumn_ffrhhp27<{
			name: "banned_at";
			tableName: "users";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lastSignInAt: PgColumn_ffrhhp27<{
			name: "last_sign_in_at";
			tableName: "users";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		phoneNumber: PgColumn_ffrhhp27<{
			name: "phone_number";
			tableName: "users";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		phoneNumberVerifiedAt: PgColumn_ffrhhp27<{
			name: "phone_number_verified_at";
			tableName: "users";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		smsFactorEnabledAt: PgColumn_ffrhhp27<{
			name: "sms_factor_enabled_at";
			tableName: "users";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A user row. */
type User = typeof users.$inferSelect;
/** Insert shape for a user. */
type NewUser = typeof users.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g28 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp28 } from "drizzle-orm/pg-core";
/**
* What a verification token proves. The column is plain `text`, so a new purpose needs no
* migration; `sign_in` is the emailed code or link that is a sign-in's first factor, `step_up`
* the emailed code a signed-in user without a second factor steps up with,
* `phone_verification` the texted code that proves a phone number a signed-in user is adding
* (its `destination` is that number: the pending number lives nowhere else), `sms_sign_in`
* the texted code that is a sign-in's first factor (ADR 0037). Three more are a texted code
* as a **second** factor (ADR 0025), each honoured for its own step only:
* `sms_factor_enrolment` (a signed-in user making it their second factor),
* `sms_second_factor` (the second factor of a sign-in or reset, bound to the attempt) and
* `sms_step_up` (a step-up, bound to the session).
*/
declare const VERIFICATION_PURPOSES: readonly ["email_verification", "password_reset", "sign_in", "step_up", "phone_verification", "sms_sign_in", "sms_factor_enrolment", "sms_second_factor", "sms_step_up"];
/**
* Emailed codes and magic links, with an attempt counter so codes can't be brute-forced online.
*
* `code_hash` is a **keyed** hash, `HMAC-SHA256(verification key, token id || code)`: a 6-digit
* code has only 10^6 values, so a plain SHA-256 would be reversed instantly by anyone who can read
* a row (backup, replica, SQL injection). `link_token_hash` is plain SHA-256 because link tokens
* are 256-bit random values.
*/
declare const verificationTokens: PgTableWithColumns_a5zn0g28<{
	name: "verification_tokens";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp28<{
			name: "created_at";
			tableName: "verification_tokens";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp28<{
			name: "updated_at";
			tableName: "verification_tokens";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp28<{
			name: "project_id";
			tableName: "verification_tokens";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp28<{
			name: "environment_id";
			tableName: "verification_tokens";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp28<{
			name: "id";
			tableName: "verification_tokens";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userId: PgColumn_ffrhhp28<{
			name: "user_id";
			tableName: "verification_tokens";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		flowAttemptId: PgColumn_ffrhhp28<{
			name: "flow_attempt_id";
			tableName: "verification_tokens";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		purpose: PgColumn_ffrhhp28<{
			name: "purpose";
			tableName: "verification_tokens";
			dataType: "string";
			columnType: "PgText";
			data: "email_verification" | "password_reset" | "phone_verification" | "sign_in" | "sms_factor_enrolment" | "sms_second_factor" | "sms_sign_in" | "sms_step_up" | "step_up";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["email_verification", "password_reset", "sign_in", "step_up", "phone_verification", "sms_sign_in", "sms_factor_enrolment", "sms_second_factor", "sms_step_up"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		destination: PgColumn_ffrhhp28<{
			name: "destination";
			tableName: "verification_tokens";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		codeHash: PgColumn_ffrhhp28<{
			name: "code_hash";
			tableName: "verification_tokens";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		linkTokenHash: PgColumn_ffrhhp28<{
			name: "link_token_hash";
			tableName: "verification_tokens";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		attempts: PgColumn_ffrhhp28<{
			name: "attempts";
			tableName: "verification_tokens";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		maxAttempts: PgColumn_ffrhhp28<{
			name: "max_attempts";
			tableName: "verification_tokens";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		expiresAt: PgColumn_ffrhhp28<{
			name: "expires_at";
			tableName: "verification_tokens";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		consumedAt: PgColumn_ffrhhp28<{
			name: "consumed_at";
			tableName: "verification_tokens";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A verification token row. */
type VerificationToken = typeof verificationTokens.$inferSelect;
/** Insert shape for a verification token. */
type NewVerificationToken = typeof verificationTokens.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g29 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp29 } from "drizzle-orm/pg-core";
/**
* Where a delivery stands: `pending` (the worker will try it, or try it again), `delivered`
* (the receiver answered 2xx) or `failed` (given up).
*/
declare const WEBHOOK_DELIVERY_STATES: readonly ["pending", "delivered", "failed"];
/**
* The youngest delivery row the runtime role can delete, whatever the retention job asks for:
* the bound the database itself keeps (`webhook_deliveries_retention_floor`). A week is what
* an operator needs at the least to read last week's failures.
*/
declare const WEBHOOK_DELIVERY_RETENTION_FLOOR = "7 days";
/**
* The delivery of one event to one endpoint (ADR 0034): the unit of work of the webhook worker.
* One row per endpoint and event (the unique key makes a second worker's insert a no-op); a
* test event has no event and so no such key.
*
* The row says where the delivery stands and how its **latest** step ended; every request that
* was made for it is a row of `webhook_delivery_attempts`, which is append-only. The runtime
* role may update this row's state columns and nothing else (not the endpoint, the event, the
* type, the test flag or `created_at`), and may delete only a row that is no longer `pending`
* and is older than {@link WEBHOOK_DELIVERY_RETENTION_FLOOR}.
*
* **Nothing of the receiver's answer is kept beyond its status code and how long it took**: no
* header and no body, and there is no column for either, here or on an attempt. An endpoint's
* address can name anything the outbound guard lets through; what it answered must not become
* readable here. `failure_reason` is one of the server's own fixed words, never text from the
* receiver or the transport.
*
* `event_id` is **not** a foreign key: a settled event is deleted after its own, shorter
* retention period and the record of its deliveries is kept longer. It is only ever written by
* the worker, from an event it read in the same environment, and only ever read back inside
* that environment. Rows go with their endpoint (that foreign key cascades).
*/
declare const webhookDeliveries: PgTableWithColumns_a5zn0g29<{
	name: "webhook_deliveries";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp29<{
			name: "created_at";
			tableName: "webhook_deliveries";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp29<{
			name: "updated_at";
			tableName: "webhook_deliveries";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp29<{
			name: "project_id";
			tableName: "webhook_deliveries";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp29<{
			name: "environment_id";
			tableName: "webhook_deliveries";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp29<{
			name: "id";
			tableName: "webhook_deliveries";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		endpointId: PgColumn_ffrhhp29<{
			name: "endpoint_id";
			tableName: "webhook_deliveries";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		eventId: PgColumn_ffrhhp29<{
			name: "event_id";
			tableName: "webhook_deliveries";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		eventType: PgColumn_ffrhhp29<{
			name: "event_type";
			tableName: "webhook_deliveries";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		test: PgColumn_ffrhhp29<{
			name: "test";
			tableName: "webhook_deliveries";
			dataType: "boolean";
			columnType: "PgBoolean";
			data: boolean;
			driverParam: boolean;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp29<{
			name: "state";
			tableName: "webhook_deliveries";
			dataType: "string";
			columnType: "PgText";
			data: "delivered" | "failed" | "pending";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["pending", "delivered", "failed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		attempts: PgColumn_ffrhhp29<{
			name: "attempts";
			tableName: "webhook_deliveries";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		nextAttemptAt: PgColumn_ffrhhp29<{
			name: "next_attempt_at";
			tableName: "webhook_deliveries";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lastAttemptAt: PgColumn_ffrhhp29<{
			name: "last_attempt_at";
			tableName: "webhook_deliveries";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		statusCode: PgColumn_ffrhhp29<{
			name: "status_code";
			tableName: "webhook_deliveries";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		failureReason: PgColumn_ffrhhp29<{
			name: "failure_reason";
			tableName: "webhook_deliveries";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		completedAt: PgColumn_ffrhhp29<{
			name: "completed_at";
			tableName: "webhook_deliveries";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A webhook delivery row. */
type WebhookDeliveryRow = typeof webhookDeliveries.$inferSelect;
/** Insert shape for a webhook delivery. */
type NewWebhookDeliveryRow = typeof webhookDeliveries.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g30 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp30 } from "drizzle-orm/pg-core";
/**
* One request the server made for a webhook delivery (ADR 0034): when, the receiver's status
* code or `null`, how long it took, and one of the server's fixed words when there was no
* answer. **There is no column for a header or a body and there must never be one.**
*
* Append-only for the runtime role (`SELECT` and `INSERT`, no `UPDATE`, no `DELETE`): the log
* of what was tried cannot be rewritten. A row goes only with its delivery, by cascade.
*
* A row here means a request was attempted. What the worker decided not to send
* (`endpoint_unresponsive`, `signing_failed`) is a word on the delivery, never a row here.
*/
declare const webhookDeliveryAttempts: PgTableWithColumns_a5zn0g30<{
	name: "webhook_delivery_attempts";
	schema: "auth";
	columns: {
		projectId: PgColumn_ffrhhp30<{
			name: "project_id";
			tableName: "webhook_delivery_attempts";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp30<{
			name: "environment_id";
			tableName: "webhook_delivery_attempts";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp30<{
			name: "id";
			tableName: "webhook_delivery_attempts";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		deliveryId: PgColumn_ffrhhp30<{
			name: "delivery_id";
			tableName: "webhook_delivery_attempts";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		attempt: PgColumn_ffrhhp30<{
			name: "attempt";
			tableName: "webhook_delivery_attempts";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		attemptedAt: PgColumn_ffrhhp30<{
			name: "attempted_at";
			tableName: "webhook_delivery_attempts";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		statusCode: PgColumn_ffrhhp30<{
			name: "status_code";
			tableName: "webhook_delivery_attempts";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		durationMs: PgColumn_ffrhhp30<{
			name: "duration_ms";
			tableName: "webhook_delivery_attempts";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		failureReason: PgColumn_ffrhhp30<{
			name: "failure_reason";
			tableName: "webhook_delivery_attempts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A webhook delivery attempt row. */
type WebhookDeliveryAttemptRow = typeof webhookDeliveryAttempts.$inferSelect;
/** Insert shape for a webhook delivery attempt. */
type NewWebhookDeliveryAttemptRow = typeof webhookDeliveryAttempts.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g31 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp31 } from "drizzle-orm/pg-core";
import { Column as Column_xh1aba3 } from "drizzle-orm";
import { PgColumnBuilder as PgColumnBuilder_r7cy323 } from "drizzle-orm/pg-core";
import { ColumnBuilderExtraConfig as ColumnBuilderExtraConfig_359rmb3 } from "drizzle-orm";
/**
* Where an environment's events are delivered (ADR 0034): an address an operator registered,
* the event types it subscribed to, and the secret its deliveries are signed with.
*
* `secret` is the Standard Webhooks signing secret (`whsec_…`) sealed with AES-256-GCM under
* `TULA_MASTER_KEY` and bound to the environment and the endpoint's id, so a ciphertext copied
* to another row does not open. It has to be recoverable (the server signs with it), which is
* why it is sealed rather than hashed. It is returned once, when the endpoint is created, and
* by no API afterwards.
*
* `previous_secret` is the secret that signed before the last rotation, sealed the same way
* but bound to its own slot as well (environment, endpoint id and the word `previous`): a
* ciphertext moved from one of the two columns to the other does not open. It signs beside
* `secret` until `previous_secret_expires_at`, which the API judges by its clock at every
* delivery, and the worker deletes it from the row soon after. The two columns are set and
* cleared together (`webhook_endpoints_previous_secret_whole`).
*
* `failing_since`, `last_failed_at` and `disabled_reason` are the worker's: an endpoint whose deliveries have all
* failed for days is switched off, and says why.
*
* `event_types` holds names from the contract's `ACTIVITY_TYPES`; the API validates them, the
* database does not know the list.
*/
declare const webhookEndpoints: PgTableWithColumns_a5zn0g31<{
	name: "webhook_endpoints";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp31<{
			name: "created_at";
			tableName: "webhook_endpoints";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp31<{
			name: "updated_at";
			tableName: "webhook_endpoints";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		projectId: PgColumn_ffrhhp31<{
			name: "project_id";
			tableName: "webhook_endpoints";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		environmentId: PgColumn_ffrhhp31<{
			name: "environment_id";
			tableName: "webhook_endpoints";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp31<{
			name: "id";
			tableName: "webhook_endpoints";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		url: PgColumn_ffrhhp31<{
			name: "url";
			tableName: "webhook_endpoints";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		eventTypes: PgColumn_ffrhhp31<{
			name: "event_types";
			tableName: "webhook_endpoints";
			dataType: "array";
			columnType: "PgArray";
			data: string[];
			driverParam: string | string[];
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: Column_xh1aba3<{
				name: "event_types";
				tableName: "webhook_endpoints";
				dataType: "string";
				columnType: "PgText";
				data: string;
				driverParam: string;
				notNull: false;
				hasDefault: false;
				isPrimaryKey: false;
				isAutoincrement: false;
				hasRuntimeDefault: false;
				enumValues: [string, ...string[]];
				baseColumn: never;
				identity: undefined;
				generated: undefined;
			}, {}, {}>;
			identity: undefined;
			generated: undefined;
		}, {}, {
			baseBuilder: PgColumnBuilder_r7cy323<{
				name: "event_types";
				dataType: "string";
				columnType: "PgText";
				data: string;
				enumValues: [string, ...string[]];
				driverParam: string;
			}, {}, {}, ColumnBuilderExtraConfig_359rmb3>;
			size: undefined;
		}>;
		secret: PgColumn_ffrhhp31<{
			name: "secret";
			tableName: "webhook_endpoints";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		previousSecret: PgColumn_ffrhhp31<{
			name: "previous_secret";
			tableName: "webhook_endpoints";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		previousSecretExpiresAt: PgColumn_ffrhhp31<{
			name: "previous_secret_expires_at";
			tableName: "webhook_endpoints";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		enabled: PgColumn_ffrhhp31<{
			name: "enabled";
			tableName: "webhook_endpoints";
			dataType: "boolean";
			columnType: "PgBoolean";
			data: boolean;
			driverParam: boolean;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		disabledReason: PgColumn_ffrhhp31<{
			name: "disabled_reason";
			tableName: "webhook_endpoints";
			dataType: "string";
			columnType: "PgText";
			data: "failing" | "gone";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["failing", "gone"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		failingSince: PgColumn_ffrhhp31<{
			name: "failing_since";
			tableName: "webhook_endpoints";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lastFailedAt: PgColumn_ffrhhp31<{
			name: "last_failed_at";
			tableName: "webhook_endpoints";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A webhook endpoint row. */
type WebhookEndpointRow = typeof webhookEndpoints.$inferSelect;
/** Insert shape for a webhook endpoint. */
type NewWebhookEndpointRow = typeof webhookEndpoints.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g32 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp32 } from "drizzle-orm/pg-core";
/** Top of the account model: a team that owns projects (control plane, not tenant data). */
declare const workspaces: PgTableWithColumns_a5zn0g32<{
	name: "workspaces";
	schema: "auth";
	columns: {
		createdAt: PgColumn_ffrhhp32<{
			name: "created_at";
			tableName: "workspaces";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp32<{
			name: "updated_at";
			tableName: "workspaces";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		id: PgColumn_ffrhhp32<{
			name: "id";
			tableName: "workspaces";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: true;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		name: PgColumn_ffrhhp32<{
			name: "name";
			tableName: "workspaces";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A workspace row. */
type Workspace = typeof workspaces.$inferSelect;
/** Insert shape for a workspace. */
type NewWorkspace = typeof workspaces.$inferInsert;
import { PgSchema as PgSchema_mtt0uw2 } from "drizzle-orm/pg-core";
/** The `core` Postgres schema, owned by the core service (login role `closeline_core`). */
declare const coreSchema: PgSchema_mtt0uw2<"core">;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g33 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp33 } from "drizzle-orm/pg-core";
/** The channels a Prospect can be contacted on. Mirrors the contract's `CONSENT_CHANNELS`. */
declare const CONSENT_CHANNELS: readonly ["phone", "sms", "whatsapp", "email", "linkedin"];
/** Where a granted consent came from. Mirrors the contract's `CONSENT_GRANT_SOURCES`. */
declare const CONSENT_GRANT_SOURCES: readonly ["hosted_form", "verbal_call", "import_attestation", "crm", "manual"];
/** Where a withdrawal came from. Mirrors the contract's `CONSENT_WITHDRAWAL_SOURCES`. */
declare const CONSENT_WITHDRAWAL_SOURCES: readonly ["unsubscribe", "stop_reply", "manual", "crm"];
/** The kinds of ledger event. */
declare const CONSENT_EVENT_KINDS: readonly ["granted", "withdrawn"];
/** The longest evidence reference, in characters. Mirrors the contract's `MAX_EVIDENCE_REF_LENGTH`. */
declare const MAX_EVIDENCE_REF_LENGTH = 200;
/** The longest submitter IP address stored with a hosted-form grant. Mirrors the contract. */
declare const MAX_SUBMISSION_IP_LENGTH = 64;
/** The longest submitter user agent stored with a hosted-form grant. Mirrors the contract. */
declare const MAX_SUBMISSION_USER_AGENT_LENGTH = 512;
/** The longest Consent Wording, in characters. Mirrors the contract's `MAX_CONSENT_WORDING_LENGTH`. */
declare const MAX_CONSENT_WORDING_LENGTH = 5e3;
/** The longest hosted form name, in characters. Mirrors the contract's `MAX_CONSENT_FORM_NAME_LENGTH`. */
declare const MAX_CONSENT_FORM_NAME_LENGTH = 100;
/** The states of a hosted consent form. Mirrors the contract's `CONSENT_FORM_STATES`. */
declare const CONSENT_FORM_STATES: readonly ["draft", "published", "closed"];
/** Why an address is suppressed. Mirrors the contract's `SUPPRESSION_REASONS`. */
declare const SUPPRESSION_REASONS: readonly ["unsubscribe", "stop", "bounce", "complaint", "manual", "crm", "erased"];
/** The kinds of address a Suppression entry is kept for. Mirrors the contract's `SUPPRESSION_ADDRESS_KINDS`. */
declare const SUPPRESSION_ADDRESS_KINDS: readonly ["email", "phone", "linkedin"];
/** The reasons whose entry may be removed. Mirrors the contract's `SUPPRESSION_REMOVABLE_REASONS`. */
declare const SUPPRESSION_REMOVABLE_REASONS: readonly ["manual"];
/** The longest reason or note on a Suppression change. Mirrors the contract's `MAX_SUPPRESSION_NOTE_LENGTH`. */
declare const MAX_SUPPRESSION_NOTE_LENGTH = 500;
/** The longest source reference, in characters. Mirrors the contract's `MAX_SUPPRESSION_SOURCE_REF_LENGTH`. */
declare const MAX_SUPPRESSION_SOURCE_REF_LENGTH = 200;
/** The longest masked address, in characters. Mirrors the contract's `maskedAddressSchema`. */
declare const MAX_MASKED_ADDRESS_LENGTH = 100;
/** The purposes of a Contact Check. Mirrors the contract's `CONTACT_PURPOSES`. */
declare const CONTACT_PURPOSES: readonly ["agent_initiated", "rep_initiated", "reply"];
/** The denial codes a logged check carries; `consent.unavailable` is never logged. Mirrors the contract's `CONTACT_DENIAL_CODES` less that one. */
declare const LOGGED_DENIAL_CODES: readonly ["consent.missing", "consent.withdrawn", "consent.suppressed"];
/** Why a contact was allowed. Mirrors the contract's `CONTACT_ALLOW_BASES`. */
declare const CONTACT_ALLOW_BASES: readonly ["consent_granted", "rep_initiated", "reply", "email_no_suppression"];
/** The longest name of a calling service. Mirrors the contract's check request. */
declare const MAX_CALLER_LENGTH = 32;
/** The bytes of a salted address hash (HMAC-SHA-256). */
declare const ADDRESS_HASH_BYTES = 32;
/** The days a Contact Check log row is kept (ADR 0021, proposed); core purges older rows. */
declare const CONTACT_CHECK_RETENTION_DAYS = 90;
/** The characters of a signed form token (22 to 256 of them; a regex cannot repeat more than 255). Mirrors the contract's `consentTokenSchema`. */
declare const FORM_TOKEN_PATTERN = "^[A-Za-z0-9_-]+$";
/** The shortest signed form token, in characters. */
declare const MIN_FORM_TOKEN_LENGTH = 22;
/** The longest signed form token, in characters. */
declare const MAX_FORM_TOKEN_LENGTH = 256;
/**
* A Consent Wording: the exact text a Prospect is shown when agreeing, for the channels it covers.
* Editable only while nothing references it; once a ledger event or a published or closed form
* does, a trigger refuses any change (`core.consent_wording_locked`) and a change is a new version
* naming the one it replaces in `supersedes_id`. Version 1 supersedes nothing. A referenced
* wording cannot be deleted (the foreign keys); deleting the Organization removes everything.
*
* Lists served (newest first, keyset `(created_at, id)`): `consent_wordings_list_idx`.
*/
declare const consentWordings: PgTableWithColumns_a5zn0g33<{
	name: "consent_wording";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp33<{
			name: "id";
			tableName: "consent_wording";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp33<{
			name: "organization_id";
			tableName: "consent_wording";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		version: PgColumn_ffrhhp33<{
			name: "version";
			tableName: "consent_wording";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		text: PgColumn_ffrhhp33<{
			name: "text";
			tableName: "consent_wording";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		channels: PgColumn_ffrhhp33<{
			name: "channels";
			tableName: "consent_wording";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: string[];
			driverParam: string[];
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		supersedesId: PgColumn_ffrhhp33<{
			name: "supersedes_id";
			tableName: "consent_wording";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp33<{
			name: string;
			tableName: "consent_wording";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdByUserId: PgColumn_ffrhhp33<{
			name: "created_by_user_id";
			tableName: "consent_wording";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* A hosted consent form: a wording and the channels it offers. `token` is the one credential of
* the public routes, null while a draft, unique across Organizations. `published_at` is set once
* published and kept when closed; `closed_at` exactly when closed. Publishing locks the wording.
*
* Lists served (newest first, keyset `(created_at, id)`, optionally one state):
* `consent_forms_list_idx` and `consent_forms_state_list_idx`.
*/
declare const consentForms: PgTableWithColumns_a5zn0g33<{
	name: "consent_form";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp33<{
			name: "id";
			tableName: "consent_form";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp33<{
			name: "organization_id";
			tableName: "consent_form";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		wordingId: PgColumn_ffrhhp33<{
			name: "wording_id";
			tableName: "consent_form";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		name: PgColumn_ffrhhp33<{
			name: "name";
			tableName: "consent_form";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		channels: PgColumn_ffrhhp33<{
			name: "channels";
			tableName: "consent_form";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: string[];
			driverParam: string[];
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		state: PgColumn_ffrhhp33<{
			name: "state";
			tableName: "consent_form";
			dataType: "string";
			columnType: "PgText";
			data: "closed" | "draft" | "published";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["draft", "published", "closed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		token: PgColumn_ffrhhp33<{
			name: "token";
			tableName: "consent_form";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp33<{
			name: string;
			tableName: "consent_form";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdByUserId: PgColumn_ffrhhp33<{
			name: "created_by_user_id";
			tableName: "consent_form";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		publishedAt: PgColumn_ffrhhp33<{
			name: string;
			tableName: "consent_form";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		closedAt: PgColumn_ffrhhp33<{
			name: string;
			tableName: "consent_form";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* One event of the consent ledger (ADR 0021): a `granted` or `withdrawn` event for a Prospect and
* channel, with its evidence. Append-only: a trigger refuses every update, and refuses a delete
* unless the Prospect it belongs to is already gone (erasing a Prospect or an Organization
* removes its events through the foreign key; nothing else can), and another refuses TRUNCATE.
* The current state of a channel is the newest event by `seq`, never an edited row. `seq` orders
* events in append order and is the history cursor; `occurred_at` is when the Prospect agreed or
* withdrew, `recorded_at` when core stored it.
*
* Lookups served: a channel's newest event, the check path (`contact_consent_events_channel_idx`),
* a Prospect's history newest first (`contact_consent_events_prospect_idx`), and the events that
* reference a wording (`contact_consent_events_wording_idx`).
*/
declare const contactConsentEvents: PgTableWithColumns_a5zn0g33<{
	name: "contact_consent_event";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp33<{
			name: "id";
			tableName: "contact_consent_event";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp33<{
			name: "organization_id";
			tableName: "contact_consent_event";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		seq: PgColumn_ffrhhp33<{
			name: "seq";
			tableName: "contact_consent_event";
			dataType: "number";
			columnType: "PgBigInt53";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: "always";
			generated: undefined;
		}, {}, {}>;
		prospectId: PgColumn_ffrhhp33<{
			name: "prospect_id";
			tableName: "contact_consent_event";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		channel: PgColumn_ffrhhp33<{
			name: "channel";
			tableName: "contact_consent_event";
			dataType: "string";
			columnType: "PgText";
			data: "email" | "linkedin" | "phone" | "sms" | "whatsapp";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["phone", "sms", "whatsapp", "email", "linkedin"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		kind: PgColumn_ffrhhp33<{
			name: "kind";
			tableName: "contact_consent_event";
			dataType: "string";
			columnType: "PgText";
			data: "granted" | "withdrawn";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["granted", "withdrawn"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		source: PgColumn_ffrhhp33<{
			name: "source";
			tableName: "contact_consent_event";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		wordingId: PgColumn_ffrhhp33<{
			name: "wording_id";
			tableName: "contact_consent_event";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		evidenceRef: PgColumn_ffrhhp33<{
			name: "evidence_ref";
			tableName: "contact_consent_event";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		callId: PgColumn_ffrhhp33<{
			name: "call_id";
			tableName: "contact_consent_event";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		formId: PgColumn_ffrhhp33<{
			name: "form_id";
			tableName: "contact_consent_event";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		ipAddress: PgColumn_ffrhhp33<{
			name: "ip_address";
			tableName: "contact_consent_event";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userAgent: PgColumn_ffrhhp33<{
			name: "user_agent";
			tableName: "contact_consent_event";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		stopAll: PgColumn_ffrhhp33<{
			name: "stop_all";
			tableName: "contact_consent_event";
			dataType: "boolean";
			columnType: "PgBoolean";
			data: boolean;
			driverParam: boolean;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		recordedByUserId: PgColumn_ffrhhp33<{
			name: "recorded_by_user_id";
			tableName: "contact_consent_event";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		occurredAt: PgColumn_ffrhhp33<{
			name: string;
			tableName: "contact_consent_event";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		recordedAt: PgColumn_ffrhhp33<{
			name: string;
			tableName: "contact_consent_event";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* An Organization's Suppression entry (ADR 0021): an address that must not be contacted on any
* channel. The address is kept only as `address_hash`, a salted HMAC-SHA-256 that core computes
* over the normalised address with a per-Organization salt, so the same address in another
* Organization hashes differently. `masked_address` is for display and is null exactly for an
* `erased` entry. `channel` is where the request arrived and does not narrow the entry. At most
* one live (not removed) entry per Organization, address kind and hash; a removed entry stays as
* history and only a `manual` one can be removed, with who, when and why. `removable` is derived.
*
* The check path is the live-entry lookup by `(organization_id, address_kind, address_hash)`,
* served by `suppression_entry_live_key`. Lists served (newest first, keyset `(created_at, id)`):
* live entries, removed entries, and each filtered by reason or address kind, all ending in the
* same keyset.
*/
declare const suppressionEntries: PgTableWithColumns_a5zn0g33<{
	name: "suppression_entry";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp33<{
			name: "id";
			tableName: "suppression_entry";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp33<{
			name: "organization_id";
			tableName: "suppression_entry";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		addressKind: PgColumn_ffrhhp33<{
			name: "address_kind";
			tableName: "suppression_entry";
			dataType: "string";
			columnType: "PgText";
			data: "email" | "linkedin" | "phone";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["email", "phone", "linkedin"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		addressHash: PgColumn_ffrhhp33<{
			name: "address_hash";
			tableName: "suppression_entry";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: Uint8Array<ArrayBufferLike>;
			driverParam: Uint8Array<ArrayBufferLike>;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		maskedAddress: PgColumn_ffrhhp33<{
			name: "masked_address";
			tableName: "suppression_entry";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		reason: PgColumn_ffrhhp33<{
			name: "reason";
			tableName: "suppression_entry";
			dataType: "string";
			columnType: "PgText";
			data: "bounce" | "complaint" | "crm" | "erased" | "manual" | "stop" | "unsubscribe";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["unsubscribe", "stop", "bounce", "complaint", "manual", "crm", "erased"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		channel: PgColumn_ffrhhp33<{
			name: "channel";
			tableName: "suppression_entry";
			dataType: "string";
			columnType: "PgText";
			data: "email" | "linkedin" | "phone" | "sms" | "whatsapp";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["phone", "sms", "whatsapp", "email", "linkedin"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sourceRef: PgColumn_ffrhhp33<{
			name: "source_ref";
			tableName: "suppression_entry";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		addedByUserId: PgColumn_ffrhhp33<{
			name: "added_by_user_id";
			tableName: "suppression_entry";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		removable: PgColumn_ffrhhp33<{
			name: "removable";
			tableName: "suppression_entry";
			dataType: "boolean";
			columnType: "PgBoolean";
			data: boolean;
			driverParam: boolean;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: {
				type: "always";
			};
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp33<{
			name: string;
			tableName: "suppression_entry";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		removedAt: PgColumn_ffrhhp33<{
			name: string;
			tableName: "suppression_entry";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		removedByUserId: PgColumn_ffrhhp33<{
			name: "removed_by_user_id";
			tableName: "suppression_entry";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		removalReason: PgColumn_ffrhhp33<{
			name: "removal_reason";
			tableName: "suppression_entry";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* The audit row of one answered Contact Check. It never holds an address. `prospect_id` has no
* foreign key: a check names a Prospect that may not exist (answered `consent.missing`) or be
* erased later, and the row stands. An allowance has a `basis` and no code; a denial has a code
* and no basis. Rows older than 90 days are purged by core.
*
* Lists served (newest first, keyset `(checked_at, id)`): all (`contact_check_log_list_idx`) and
* one Prospect's (`contact_check_log_prospect_idx`); the other filters narrow within the first.
* The same index serves the per-Organization purge by age.
*/
declare const contactCheckLog: PgTableWithColumns_a5zn0g33<{
	name: "contact_check_log";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp33<{
			name: "id";
			tableName: "contact_check_log";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp33<{
			name: "organization_id";
			tableName: "contact_check_log";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		prospectId: PgColumn_ffrhhp33<{
			name: "prospect_id";
			tableName: "contact_check_log";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		channel: PgColumn_ffrhhp33<{
			name: "channel";
			tableName: "contact_check_log";
			dataType: "string";
			columnType: "PgText";
			data: "email" | "linkedin" | "phone" | "sms" | "whatsapp";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["phone", "sms", "whatsapp", "email", "linkedin"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		purpose: PgColumn_ffrhhp33<{
			name: "purpose";
			tableName: "contact_check_log";
			dataType: "string";
			columnType: "PgText";
			data: "agent_initiated" | "rep_initiated" | "reply";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["agent_initiated", "rep_initiated", "reply"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		caller: PgColumn_ffrhhp33<{
			name: "caller";
			tableName: "contact_check_log";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		allowed: PgColumn_ffrhhp33<{
			name: "allowed";
			tableName: "contact_check_log";
			dataType: "boolean";
			columnType: "PgBoolean";
			data: boolean;
			driverParam: boolean;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		code: PgColumn_ffrhhp33<{
			name: "code";
			tableName: "contact_check_log";
			dataType: "string";
			columnType: "PgText";
			data: "consent.missing" | "consent.suppressed" | "consent.withdrawn";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["consent.missing", "consent.withdrawn", "consent.suppressed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		basis: PgColumn_ffrhhp33<{
			name: "basis";
			tableName: "contact_check_log";
			dataType: "string";
			columnType: "PgText";
			data: "consent_granted" | "email_no_suppression" | "rep_initiated" | "reply";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["consent_granted", "rep_initiated", "reply", "email_no_suppression"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		checkedAt: PgColumn_ffrhhp33<{
			name: string;
			tableName: "contact_check_log";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g34 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp34 } from "drizzle-orm/pg-core";
/** The length in bytes of an address hash: an HMAC-SHA256, which core computes. */
declare const DEMO_RATE_ADDRESS_HASH_BYTES = 32;
/**
* One counter of the per-address rate limit on the public demo-request route: how many requests an
* address made in one fixed window. Closeline itself holds it, not an Organization, so it has no
* `organization_id` and sits outside row-level security, like `core.demo_request`: it is on the
* allowlist, and no service role holds any privilege on it. Only `core.hit_demo_rate_limit` and
* `core.purge_demo_rate_counters` reach it.
*
* - `address_hash` is an HMAC-SHA256 of the address, made by core. A raw address is never stored.
* - `window_start` is the start of the window, aligned to the window length.
* - `hits` counts every request in the window, including those over the limit.
*
* Lists served:
* - The retention purge: `WHERE window_start < $cutoff ORDER BY window_start LIMIT n`, on
*   `demo_rate_counters_window_start_idx`.
*/
declare const demoRateCounters: PgTableWithColumns_a5zn0g34<{
	name: "demo_rate_counter";
	schema: "core";
	columns: {
		addressHash: PgColumn_ffrhhp34<{
			name: "address_hash";
			tableName: "demo_rate_counter";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: Uint8Array<ArrayBufferLike>;
			driverParam: Uint8Array<ArrayBufferLike>;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		windowStart: PgColumn_ffrhhp34<{
			name: "window_start";
			tableName: "demo_rate_counter";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		hits: PgColumn_ffrhhp34<{
			name: "hits";
			tableName: "demo_rate_counter";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A demo rate counter row. */
type DemoRateCounter = typeof demoRateCounters.$inferSelect;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g35 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp35 } from "drizzle-orm/pg-core";
/** The states of the notice that tells Closeline's team about a Demo Request. */
declare const DEMO_NOTIFICATION_STATUSES: readonly ["pending", "sent", "failed"];
/** The longest Visitor name or company name, in characters after trimming. Mirrors the contract. */
declare const DEMO_REQUEST_NAME_MAX = 200;
/** The longest Visitor message, in characters. Mirrors the contract's marketing schemas. */
declare const DEMO_REQUEST_MESSAGE_MAX = 2e3;
/** The longest source page path, in characters. Mirrors the contract's marketing schemas. */
declare const DEMO_REQUEST_SOURCE_PAGE_MAX = 200;
/** The shortest and longest idempotency key of a Demo Request, in characters. */
declare const DEMO_REQUEST_KEY_LENGTH: {
	readonly min: 16;
	readonly max: 128;
};
/**
* A Demo Request: a Visitor's submitted wish to see Closeline. Closeline itself holds it, not an
* Organization, so it has no `organization_id` and sits outside row-level security, as a third kind
* of no-access table beside the core directories (ADR 0011): it is on the allowlist, and no
* service role holds any privilege on it, so no tenant scope can read a row. Only the owner (the
* migration role) and SECURITY DEFINER functions reach it; a Demo Request is not tenant data.
*
* - `id` is `dreq_` and 32 hex digits, built by the service.
* - `work_email` is stored folded (`lower`), with the same shape rule as `invitations.email`.
* - `idempotency_key` is the Visitor's retry key, unique across all rows, so a replayed submit
*   finds the first row. The honeypot field is never stored: there is no column for it.
* - `notification_status`, `notification_attempts` and `notification_last_attempt_at` are the
*   outbox for the notice to the team: a row starts `pending`, a worker settles it as `sent`, or
*   as `failed` after its attempts run out. They follow `webhook_deliveries`' attempts shape.
*
* Lists served:
* - The twelve-month retention purge: `WHERE submitted_at < $cutoff ORDER BY submitted_at LIMIT n`,
*   on `demo_requests_submitted_at_idx`.
* - The notice retry scan: `WHERE notification_status = 'pending' ORDER BY submitted_at LIMIT n`
*   (and `'failed'` for a manual retry), on `demo_requests_notice_idx`.
*/
declare const demoRequests: PgTableWithColumns_a5zn0g35<{
	name: "demo_request";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp35<{
			name: "id";
			tableName: "demo_request";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		name: PgColumn_ffrhhp35<{
			name: "name";
			tableName: "demo_request";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		workEmail: PgColumn_ffrhhp35<{
			name: "work_email";
			tableName: "demo_request";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		companyName: PgColumn_ffrhhp35<{
			name: "company_name";
			tableName: "demo_request";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		message: PgColumn_ffrhhp35<{
			name: "message";
			tableName: "demo_request";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sourcePage: PgColumn_ffrhhp35<{
			name: "source_page";
			tableName: "demo_request";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		idempotencyKey: PgColumn_ffrhhp35<{
			name: "idempotency_key";
			tableName: "demo_request";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		notificationStatus: PgColumn_ffrhhp35<{
			name: "notification_status";
			tableName: "demo_request";
			dataType: "string";
			columnType: "PgText";
			data: "failed" | "pending" | "sent";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["pending", "sent", "failed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		notificationAttempts: PgColumn_ffrhhp35<{
			name: "notification_attempts";
			tableName: "demo_request";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		notificationLastAttemptAt: PgColumn_ffrhhp35<{
			name: "notification_last_attempt_at";
			tableName: "demo_request";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		submittedAt: PgColumn_ffrhhp35<{
			name: "submitted_at";
			tableName: "demo_request";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** A Demo Request row. */
type DemoRequest = typeof demoRequests.$inferSelect;
/** Insert shape for a Demo Request. */
type NewDemoRequest = typeof demoRequests.$inferInsert;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g36 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp36 } from "drizzle-orm/pg-core";
/** The kinds of identity a Prospect is matched on. Mirrors the contract's `PROSPECT_IDENTITY_KINDS`. */
declare const PROSPECT_IDENTITY_KINDS: readonly ["email", "phone", "linkedin"];
/** The states of a Prospect. Mirrors the contract's `PROSPECT_STATUSES`. */
declare const PROSPECT_STATUSES: readonly ["active", "archived"];
/**
* The Prospect fields that carry a Source, in the snake_case the columns use. Mirrors the
* contract's `PROSPECT_FIELD_NAMES` (`firstName`, `lastName`, `jobTitle`, `email`, `phone`,
* `linkedinUrl`).
*/
declare const PROSPECT_FIELD_NAMES: readonly ["first_name", "last_name", "job_title", "email", "phone", "linkedin_url"];
/** The Prospect Company fields that carry a Source. Mirrors the contract's `PROSPECT_COMPANY_FIELD_NAMES`. */
declare const PROSPECT_COMPANY_FIELD_NAMES: readonly ["name", "domain"];
/** The states of a field history entry. Mirrors the contract's `FIELD_HISTORY_STATES`. */
declare const FIELD_HISTORY_STATES: readonly ["current", "superseded", "suggested"];
/** The most history entries kept per field. Mirrors the contract's `MAX_FIELD_HISTORY_ENTRIES`. */
declare const MAX_FIELD_HISTORY_ENTRIES = 50;
/** The longest stored field value, in characters. Mirrors the contract's `MAX_PROSPECT_FIELD_VALUE_LENGTH`. */
declare const MAX_PROSPECT_FIELD_VALUE_LENGTH = 320;
/** The longest Source reference, in characters. Mirrors the contract's `MAX_SOURCE_REF_LENGTH`. */
declare const MAX_SOURCE_REF_LENGTH = 200;
/** The longest Prospect Company name, in characters. Mirrors the contract's `MAX_PROSPECT_COMPANY_NAME_LENGTH`. */
declare const MAX_PROSPECT_COMPANY_NAME_LENGTH = 200;
/** The longest Prospect note, in characters. Mirrors the contract's `MAX_PROSPECT_NOTES_LENGTH`. */
declare const MAX_PROSPECT_NOTES_LENGTH = 5e3;
/** The longest tag, in characters. Mirrors the contract's `MAX_PROSPECT_TAG_LENGTH`. */
declare const MAX_PROSPECT_TAG_LENGTH = 50;
/** The most tags one Prospect carries. Mirrors the contract's `MAX_PROSPECT_TAGS`. */
declare const MAX_PROSPECT_TAGS = 20;
/** The largest import file, 10 MiB. Mirrors the contract's `MAX_PROSPECT_IMPORT_BYTES`. */
declare const MAX_PROSPECT_IMPORT_BYTES: number;
/** The most rows in an import file. Mirrors the contract's `MAX_PROSPECT_IMPORT_ROWS`. */
declare const MAX_PROSPECT_IMPORT_ROWS = 5e4;
/** The states of an import. Mirrors the contract's `PROSPECT_IMPORT_STATES`. */
declare const PROSPECT_IMPORT_STATES: readonly ["uploaded", "processing", "completed", "failed"];
/** Why an import failed. Mirrors the contract's `PROSPECT_IMPORT_FAILURE_REASONS`. */
declare const PROSPECT_IMPORT_FAILURE_REASONS: readonly ["too_many_rows", "unreadable"];
/** What happened to an import row. Mirrors the contract's `PROSPECT_IMPORT_ROW_RESULTS`. */
declare const PROSPECT_IMPORT_ROW_RESULTS: readonly ["created", "updated", "skipped", "rejected"];
/** Why a row was skipped. Mirrors the contract's `PROSPECT_IMPORT_SKIP_REASONS`. */
declare const PROSPECT_IMPORT_SKIP_REASONS: readonly ["no_change", "manual_values_kept"];
/** Why a row was rejected. Mirrors the contract's `PROSPECT_IMPORT_REJECT_REASONS`. */
declare const PROSPECT_IMPORT_REJECT_REASONS: readonly ["wrong_column_count", "blank_row", "missing_identity", "invalid_email", "invalid_phone", "invalid_linkedin_url", "invalid_name", "invalid_job_title", "invalid_company", "invalid_tags", "owner_not_found", "owner_not_allowed", "duplicate_in_file", "identity_conflict"];
/** The states of a merge. Mirrors the contract's `PROSPECT_MERGE_STATES`. */
declare const PROSPECT_MERGE_STATES: readonly ["merged", "undone"];
/** The days after a merge it can be undone. Mirrors the contract's `PROSPECT_MERGE_UNDO_DAYS`. */
declare const PROSPECT_MERGE_UNDO_DAYS = 30;
/** The most Prospects one merge folds into the survivor. Mirrors the contract's `MAX_MERGED_PROSPECTS`. */
declare const MAX_MERGED_PROSPECTS = 5;
/** The largest merge snapshot, in bytes of its text form: five Prospects with a full history. */
declare const MAX_MERGE_SNAPSHOT_BYTES: number;
/**
* The Source kinds as one regular expression: the fixed words and `enrichment:<provider>`.
* Mirrors the contract's `sourceKindSchema`.
*/
declare const SOURCE_KIND_PATTERN = "^(manual|import|crm:hubspot|crm:salesforce|form|enrichment:[a-z][a-z0-9_]{0,31})$";
/**
* The normalised forms of the three identities (ADR 0011), one regular expression each, as the
* database checks them. Email: ASCII-folded, one `@`, printable ASCII (the memberships rule).
* Phone: E.164. LinkedIn: lower case, no scheme, no `www.`, no query or fragment, no trailing
* slash, starting `linkedin.com/`. Core produces them; the database refuses anything else.
*/
declare const IDENTITY_VALUE_PATTERNS: {
	readonly phone: "^\\+[1-9][0-9]{6,14}$";
	readonly linkedin: "^linkedin\\.com(/[a-z0-9%._~-]+)+$";
};
/**
* A Prospect Company of an Organization. `name` and `domain` are the current values; their
* Sources and history are in `prospect_company_fields`. `domain` is the normalised domain
* (ASCII-folded host), unique per Organization when set.
*
* Lists served (keyset `(created_at, id)`, newest first): `prospect_companies_list_idx`. Lookup by
* domain: `prospect_companies_domain_key`.
*/
declare const prospectCompanies: PgTableWithColumns_a5zn0g36<{
	name: "prospect_companies";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp36<{
			name: "id";
			tableName: "prospect_companies";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp36<{
			name: "organization_id";
			tableName: "prospect_companies";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		name: PgColumn_ffrhhp36<{
			name: "name";
			tableName: "prospect_companies";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		domain: PgColumn_ffrhhp36<{
			name: "domain";
			tableName: "prospect_companies";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "prospect_companies";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "prospect_companies";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* A Prospect of an Organization: who owns it, its state, tags and notes. Its fields, with their
* Sources, are in `prospect_fields` and its matchable identities in `prospect_identities`.
* `owner_membership_id` is the owner Rep's Membership, null while unassigned or after that
* Membership is removed; `company_id` is null for none or after the Company is removed. `source`
* is the Source kind that created it. Erasing a Prospect deletes its fields and identities (the
* cascade).
*
* Lists served (keyset `(created_at, id)` both descending, `LIMIT` a page, always scoped by
* `organization_id`): all (`prospects_list_idx`), by status, owner, Company and Source (one index
* each, ending in the same keyset).
*/
declare const prospects: PgTableWithColumns_a5zn0g36<{
	name: "prospects";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp36<{
			name: "id";
			tableName: "prospects";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp36<{
			name: "organization_id";
			tableName: "prospects";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		companyId: PgColumn_ffrhhp36<{
			name: "company_id";
			tableName: "prospects";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		ownerMembershipId: PgColumn_ffrhhp36<{
			name: "owner_membership_id";
			tableName: "prospects";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		status: PgColumn_ffrhhp36<{
			name: "status";
			tableName: "prospects";
			dataType: "string";
			columnType: "PgText";
			data: "active" | "archived";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["active", "archived"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		source: PgColumn_ffrhhp36<{
			name: "source";
			tableName: "prospects";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		tags: PgColumn_ffrhhp36<{
			name: "tags";
			tableName: "prospects";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: string[];
			driverParam: string[];
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		notes: PgColumn_ffrhhp36<{
			name: "notes";
			tableName: "prospects";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "prospects";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "prospects";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* A matchable identity of a Prospect: an email, phone or LinkedIn address in its normalised form
* (ADR 0011). Unique per Organization by `(kind, value)`, whichever Prospect holds it, so a
* duplicate is refused by the database (`prospect.duplicate_identity`) and the same value in
* another Organization is a different row. A Prospect has at most one primary identity per kind.
*
* Lookups served: by value (the primary key `(organization_id, kind, value)`), and all identities
* of one Prospect (`prospect_identities_prospect_idx`).
*/
declare const prospectIdentities: PgTableWithColumns_a5zn0g36<{
	name: "prospect_identities";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp36<{
			name: "organization_id";
			tableName: "prospect_identities";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		kind: PgColumn_ffrhhp36<{
			name: "kind";
			tableName: "prospect_identities";
			dataType: "string";
			columnType: "PgText";
			data: "email" | "linkedin" | "phone";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["email", "phone", "linkedin"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		value: PgColumn_ffrhhp36<{
			name: "value";
			tableName: "prospect_identities";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		prospectId: PgColumn_ffrhhp36<{
			name: "prospect_id";
			tableName: "prospect_identities";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		isPrimary: PgColumn_ffrhhp36<{
			name: "is_primary";
			tableName: "prospect_identities";
			dataType: "boolean";
			columnType: "PgBoolean";
			data: boolean;
			driverParam: boolean;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "prospect_identities";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* One entry of a Prospect field's history (ADR 0020): a value with its Source, time and actor, and
* whether it is the `current` value, a `superseded` earlier one or a `suggested` enrichment value
* kept beside an own value. The current value of a field is the entry whose state is `current`;
* there is at most one per field. At most 50 entries per field (the 51st insert is refused by a
* trigger); the service removes the oldest non-current entries first. `seq` orders entries set at
* the same time, and with `set_at` is the history cursor.
*
* Lists served: a Prospect's current values (`prospect_fields_current_key`) and one field's
* history, newest first (`prospect_fields_history_idx`). Erasing a Prospect deletes its entries (cascade).
*/
declare const prospectFields: PgTableWithColumns_a5zn0g36<{
	name: "prospect_fields";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp36<{
			name: "organization_id";
			tableName: "prospect_fields";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		seq: PgColumn_ffrhhp36<{
			name: "seq";
			tableName: "prospect_fields";
			dataType: "number";
			columnType: "PgBigInt53";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: "always";
			generated: undefined;
		}, {}, {}>;
		fieldName: PgColumn_ffrhhp36<{
			name: "field_name";
			tableName: "prospect_fields";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp36<{
			name: "state";
			tableName: "prospect_fields";
			dataType: "string";
			columnType: "PgText";
			data: "current" | "suggested" | "superseded";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["current", "superseded", "suggested"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		value: PgColumn_ffrhhp36<{
			name: "value";
			tableName: "prospect_fields";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		source: PgColumn_ffrhhp36<{
			name: "source";
			tableName: "prospect_fields";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sourceRef: PgColumn_ffrhhp36<{
			name: "source_ref";
			tableName: "prospect_fields";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		setAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "prospect_fields";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		setByUserId: PgColumn_ffrhhp36<{
			name: "set_by_user_id";
			tableName: "prospect_fields";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		prospectId: PgColumn_ffrhhp36<{
			name: "prospect_id";
			tableName: "prospect_fields";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* One entry of a Prospect Company field's history, as {@link prospectFields} is for a Prospect.
* The fields are `name` and `domain`.
*/
declare const prospectCompanyFields: PgTableWithColumns_a5zn0g36<{
	name: "prospect_company_fields";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp36<{
			name: "organization_id";
			tableName: "prospect_company_fields";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		seq: PgColumn_ffrhhp36<{
			name: "seq";
			tableName: "prospect_company_fields";
			dataType: "number";
			columnType: "PgBigInt53";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: "always";
			generated: undefined;
		}, {}, {}>;
		fieldName: PgColumn_ffrhhp36<{
			name: "field_name";
			tableName: "prospect_company_fields";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp36<{
			name: "state";
			tableName: "prospect_company_fields";
			dataType: "string";
			columnType: "PgText";
			data: "current" | "suggested" | "superseded";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["current", "superseded", "suggested"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		value: PgColumn_ffrhhp36<{
			name: "value";
			tableName: "prospect_company_fields";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		source: PgColumn_ffrhhp36<{
			name: "source";
			tableName: "prospect_company_fields";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sourceRef: PgColumn_ffrhhp36<{
			name: "source_ref";
			tableName: "prospect_company_fields";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		setAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "prospect_company_fields";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		setByUserId: PgColumn_ffrhhp36<{
			name: "set_by_user_id";
			tableName: "prospect_company_fields";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		companyId: PgColumn_ffrhhp36<{
			name: "company_id";
			tableName: "prospect_company_fields";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* A Prospect import (an uploaded CSV, asynchronous like the Playbook's deal import, ADR 0018). The
* file is in object storage under `object_key`; nothing here holds a cell. The counts are null
* until `completed`, then `row_count` is the sum of the other four; `failure_reason` is set
* exactly when `failed`. `processed_rows` is how far the job got, so a crashed job resumes.
*
* Lists served (keyset `(created_at, id)`, newest first): `prospect_imports_list_idx`.
*/
declare const prospectImports: PgTableWithColumns_a5zn0g36<{
	name: "prospect_imports";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp36<{
			name: "id";
			tableName: "prospect_imports";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp36<{
			name: "organization_id";
			tableName: "prospect_imports";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp36<{
			name: "state";
			tableName: "prospect_imports";
			dataType: "string";
			columnType: "PgText";
			data: "completed" | "failed" | "processing" | "uploaded";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["uploaded", "processing", "completed", "failed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		failureReason: PgColumn_ffrhhp36<{
			name: "failure_reason";
			tableName: "prospect_imports";
			dataType: "string";
			columnType: "PgText";
			data: "too_many_rows" | "unreadable";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["too_many_rows", "unreadable"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sizeBytes: PgColumn_ffrhhp36<{
			name: "size_bytes";
			tableName: "prospect_imports";
			dataType: "number";
			columnType: "PgBigInt53";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		contentHash: PgColumn_ffrhhp36<{
			name: "content_hash";
			tableName: "prospect_imports";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: Uint8Array<ArrayBufferLike>;
			driverParam: Uint8Array<ArrayBufferLike>;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		objectKey: PgColumn_ffrhhp36<{
			name: "object_key";
			tableName: "prospect_imports";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		processedRows: PgColumn_ffrhhp36<{
			name: "processed_rows";
			tableName: "prospect_imports";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		rowCount: PgColumn_ffrhhp36<{
			name: "row_count";
			tableName: "prospect_imports";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdCount: PgColumn_ffrhhp36<{
			name: "created_count";
			tableName: "prospect_imports";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedCount: PgColumn_ffrhhp36<{
			name: "updated_count";
			tableName: "prospect_imports";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		skippedCount: PgColumn_ffrhhp36<{
			name: "skipped_count";
			tableName: "prospect_imports";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		rejectedCount: PgColumn_ffrhhp36<{
			name: "rejected_count";
			tableName: "prospect_imports";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		uploadedByUserId: PgColumn_ffrhhp36<{
			name: "uploaded_by_user_id";
			tableName: "prospect_imports";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "prospect_imports";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "prospect_imports";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* One row of an import report: the record number (the header is record 1, so the first data row is
* 2), what happened, why for a skipped or rejected row, and the Prospect it created, updated or
* matched. No cell of the file is kept, so a report holds no personal data. `prospect_id` has no
* foreign key: erasing a Prospect leaves the report row standing, naming an id that no longer
* exists.
*
* Lists served (keyset `row_number`): a report (the primary key) and one result
* (`prospect_import_rows_result_idx`).
*/
declare const prospectImportRows: PgTableWithColumns_a5zn0g36<{
	name: "prospect_import_rows";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp36<{
			name: "organization_id";
			tableName: "prospect_import_rows";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		importId: PgColumn_ffrhhp36<{
			name: "import_id";
			tableName: "prospect_import_rows";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		rowNumber: PgColumn_ffrhhp36<{
			name: "row_number";
			tableName: "prospect_import_rows";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		result: PgColumn_ffrhhp36<{
			name: "result";
			tableName: "prospect_import_rows";
			dataType: "string";
			columnType: "PgText";
			data: "created" | "rejected" | "skipped" | "updated";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["created", "updated", "skipped", "rejected"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		reason: PgColumn_ffrhhp36<{
			name: "reason";
			tableName: "prospect_import_rows";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		prospectId: PgColumn_ffrhhp36<{
			name: "prospect_id";
			tableName: "prospect_import_rows";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* A merge of Prospects into a survivor, undoable for 30 days. `merged_prospect_ids` are the 1 to 5
* Prospects folded in (they no longer exist, so no foreign key); `snapshot` restores both records
* on undo and is never returned by the API. `undoable_until` is exactly 30 days after
* `created_at`; `undone_at` is set exactly when the state is `undone`. Deleting the survivor
* (erasure) deletes the record; a GIN index on the merged ids finds the records that hold an
* erased Prospect's snapshot.
*
* Lists served: a survivor's merges (`prospect_merges_survivor_idx`).
*/
declare const prospectMerges: PgTableWithColumns_a5zn0g36<{
	name: "prospect_merges";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp36<{
			name: "id";
			tableName: "prospect_merges";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp36<{
			name: "organization_id";
			tableName: "prospect_merges";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		survivorProspectId: PgColumn_ffrhhp36<{
			name: "survivor_prospect_id";
			tableName: "prospect_merges";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		mergedProspectIds: PgColumn_ffrhhp36<{
			name: "merged_prospect_ids";
			tableName: "prospect_merges";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: string[];
			driverParam: string[];
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		fieldChoices: PgColumn_ffrhhp36<{
			name: "field_choices";
			tableName: "prospect_merges";
			dataType: "json";
			columnType: "PgJsonb";
			data: unknown;
			driverParam: unknown;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp36<{
			name: "state";
			tableName: "prospect_merges";
			dataType: "string";
			columnType: "PgText";
			data: "merged" | "undone";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["merged", "undone"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		mergedByUserId: PgColumn_ffrhhp36<{
			name: "merged_by_user_id";
			tableName: "prospect_merges";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		snapshot: PgColumn_ffrhhp36<{
			name: "snapshot";
			tableName: "prospect_merges";
			dataType: "json";
			columnType: "PgJsonb";
			data: unknown;
			driverParam: unknown;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "prospect_merges";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		undoableUntil: PgColumn_ffrhhp36<{
			name: string;
			tableName: "prospect_merges";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		undoneAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "prospect_merges";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g37 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp37 } from "drizzle-orm/pg-core";
/** The roles a membership can hold, most privileged first. Mirrors the contract's `ROLES`. */
declare const MEMBERSHIP_ROLES: readonly ["owner", "admin", "manager", "rep"];
/** The roles an invitation can offer: ownership passes by promotion, never by invitation. */
declare const INVITATION_ROLES: readonly ["admin", "manager", "rep"];
/** The Regions an Organization can be created in. Mirrors the contract's `REGIONS`. */
declare const ORGANIZATION_REGIONS: readonly ["us", "eu"];
/** The states an Organization is in; `deleted` keeps the row for the retention window. */
declare const ORGANIZATION_STATUSES: readonly ["active", "suspended", "deleted"];
/** The states an invitation is in; "expired" is not stored, it is read from `expires_at`. */
declare const INVITATION_STATES: readonly ["pending", "accepted", "revoked"];
/**
* The longest member name, in characters after trimming spaces. Mirrors the contract's
* `MAX_PERSON_NAME_LENGTH`: auth's optional first and last names joined by one space, one more
* than the 200 of an Organization or Team name.
*/
declare const MEMBER_NAME_MAX = 201;
/** The longest route name of an idempotency key, in characters. */
declare const IDEMPOTENCY_ROUTE_MAX = 64;
/** The longest client-supplied idempotency key, in characters (printable ASCII only). */
declare const IDEMPOTENCY_KEY_MAX = 255;
/** The length of an idempotency key's request hash, in bytes: a SHA-256 of the request body. */
declare const IDEMPOTENCY_HASH_BYTES = 32;
/** The largest stored response of an idempotency key, in bytes of its text form (`response::text`). */
declare const IDEMPOTENCY_RESPONSE_MAX_BYTES = 16384;
/**
* An Organization (core.organizations). Its primary key is named `organization_id` so the one
* canonical row-level-security policy applies to it unchanged. `region` is fixed at creation:
* a trigger refuses any change (ADR 0001), and the service role holds no `UPDATE` on the column.
* `owner_count` is kept by triggers on `memberships` and is what serialises changes to an
* Organization's Owners, so no concurrent pair of transactions can remove the last two. The
* service role cannot write it, and an insert always starts it at zero; a deferred trigger
* refuses to commit an Organization that has no Owner. The last-Owner rule holds while the
* Organization is `active` or `suspended`; a `deleted` Organization (kept for retention) may have
* every membership removed, the last Owner included, so a retention job can empty it and free its
* users to join another Organization. An emptied Organization cannot be made `active` or
* `suspended` again.
*/
declare const organizations: PgTableWithColumns_a5zn0g37<{
	name: "organizations";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp37<{
			name: "organization_id";
			tableName: "organizations";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		name: PgColumn_ffrhhp37<{
			name: "name";
			tableName: "organizations";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		region: PgColumn_ffrhhp37<{
			name: "region";
			tableName: "organizations";
			dataType: "string";
			columnType: "PgText";
			data: "eu" | "us";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["us", "eu"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		status: PgColumn_ffrhhp37<{
			name: "status";
			tableName: "organizations";
			dataType: "string";
			columnType: "PgText";
			data: "active" | "deleted" | "suspended";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["active", "suspended", "deleted"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		ownerCount: PgColumn_ffrhhp37<{
			name: "owner_count";
			tableName: "organizations";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp37<{
			name: "created_at";
			tableName: "organizations";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp37<{
			name: "updated_at";
			tableName: "organizations";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* A user's membership of an Organization, with one role. `user_id` is an opaque `usr_` id from the
* auth service: no foreign key crosses schemas. A user belongs to exactly one Organization; that
* is enforced by `membership_directory_one_organization_per_user`, because a unique index on this
* table cannot see rows hidden by row-level security.
*
* `email` and `name` are core's copy of the member's profile (ADR 0015); auth stays the source of
* truth and sends both at sign-up and when they change. `email` follows the invitations rule
* (folded ASCII, one `@`, printable ASCII, 3 to 320 characters) and is required, so a membership
* without one cannot exist. `name` is null for a person with no name, else 1 to
* {@link MEMBER_NAME_MAX} characters after trimming surrounding spaces (auth sends the optional
* first and last names joined by one space). Both are covered by the existing row-level security
* policy and table-wide grants; there is no per-column grant on this table.
*
* Lists served (keyset, `LIMIT` a page):
* - Members of an Organization: `WHERE organization_id = $1 AND id > $cursor ORDER BY id`, on
*   `memberships_organization_id_id_key`.
* - One user's membership, for a role check: `memberships_organization_user_key`.
*
* - Is this address already a member, for an invitation: `WHERE organization_id = $1 AND email =
*   $2`, on `memberships_organization_email_idx`.
*
* Index decision: `memberships_organization_email_idx` is plain, not unique: auth owns the address,
* and a stale copy must not make a later change fail. There is none on `name`: nothing searches or
* sorts by it. The database's name rule is the looser bound (it trims spaces only and does not
* reject control characters); core stores only the contract's trimmed output.
*/
declare const memberships: PgTableWithColumns_a5zn0g37<{
	name: "memberships";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp37<{
			name: "id";
			tableName: "memberships";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp37<{
			name: "organization_id";
			tableName: "memberships";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userId: PgColumn_ffrhhp37<{
			name: "user_id";
			tableName: "memberships";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		role: PgColumn_ffrhhp37<{
			name: "role";
			tableName: "memberships";
			dataType: "string";
			columnType: "PgText";
			data: "admin" | "manager" | "owner" | "rep";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["owner", "admin", "manager", "rep"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		email: PgColumn_ffrhhp37<{
			name: "email";
			tableName: "memberships";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		name: PgColumn_ffrhhp37<{
			name: "name";
			tableName: "memberships";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp37<{
			name: "created_at";
			tableName: "memberships";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp37<{
			name: "updated_at";
			tableName: "memberships";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* A Team inside an Organization. Names are unique per Organization, ignoring case.
*
* Lists served:
* - Teams of an Organization: `WHERE organization_id = $1 AND name_key > $cursor ORDER BY
*   name_key`, on `teams_organization_name_key` (unique, so the key is the whole cursor).
*   `lower()` itself cannot be an index condition under row-level security, hence the column.
*
* `name_key` folds ASCII letters only, with the explicit `"C"` collation, so it is the same on
* every cluster whatever its locale; "É" and "é" are different names. The service must fold the
* same way (`name.replace(/[A-Z]/g, ...)`, not `toLowerCase()`) wherever it compares names.
*/
declare const teams: PgTableWithColumns_a5zn0g37<{
	name: "teams";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp37<{
			name: "id";
			tableName: "teams";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp37<{
			name: "organization_id";
			tableName: "teams";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		name: PgColumn_ffrhhp37<{
			name: "name";
			tableName: "teams";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		nameKey: PgColumn_ffrhhp37<{
			name: "name_key";
			tableName: "teams";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: {
				type: "always";
			};
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp37<{
			name: "created_at";
			tableName: "teams";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp37<{
			name: "updated_at";
			tableName: "teams";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* A membership's place in a Team. Both foreign keys carry `organization_id`, so a Team and a member
* of different Organizations cannot be joined; Postgres checks foreign keys without applying
* row-level security, which is why a plain id reference would not be enough.
*
* Lists served:
* - Members of a Team: `WHERE organization_id = $1 AND team_id = $2 AND membership_id > $cursor
*   ORDER BY membership_id`, on the primary key.
* - Teams a membership is in: `WHERE organization_id = $1 AND membership_id = $2 AND team_id >
*   $cursor ORDER BY team_id`, on `team_members_membership_idx` (which also serves the cascade
*   when a membership is removed).
*/
declare const teamMembers: PgTableWithColumns_a5zn0g37<{
	name: "team_members";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp37<{
			name: "organization_id";
			tableName: "team_members";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		teamId: PgColumn_ffrhhp37<{
			name: "team_id";
			tableName: "team_members";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		membershipId: PgColumn_ffrhhp37<{
			name: "membership_id";
			tableName: "team_members";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp37<{
			name: "created_at";
			tableName: "team_members";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* An invitation to join an Organization. Only a hash of the token is stored (64 lowercase hex
* characters, a SHA-256). One pending invitation per email per Organization; a re-invite revokes
* the old one first (an expired invitation stays `pending` until then). `accepted` and `revoked`
* are final: no statement that sets the state, its timestamps, the `id` or the `token_hash` on such
* a row is accepted, so an invitation cannot be accepted twice and a used hash cannot be moved off
* its row and issued again. The database refuses to accept an invitation after `expires_at` (the
* instant itself is expired) or while its Organization is not `active`. The role is never `owner`
* (ownership passes by promotion). The email is stored folded with the ASCII-only rule below and
* is printable ASCII only (no space, control or non-ASCII character) with exactly one `@`; an
* internationalised domain is stored in its ASCII (A-label) form, converted by the service before
* it writes. The service folds with the same rule and validates the whole address at the edge.
* `invited_by_user_id` is an opaque `usr_` id, so it
* outlives the inviter's membership. Deleting the Team clears `team_id` (the migration replaces
* the generated foreign key with `ON DELETE SET NULL (team_id)`, which Drizzle cannot express).
* The service role cannot `DELETE` an invitation: it is revoked, and only deleting its
* Organization removes it. Accepting an invitation and creating its membership is one
* transaction in the service.
*
* Lists served:
* - Pending invitations of an Organization: `WHERE organization_id = $1 AND state = 'pending' AND
*   (created_at, id) > ($c, $i) ORDER BY created_at, id`, on `invitations_pending_list_idx`.
* - Invitations of an Organization in any one state, newest first: `WHERE organization_id = $1 AND
*   state = $2 AND (created_at, id) < ($c, $i) ORDER BY created_at DESC, id DESC LIMIT n`, on
*   `invitations_state_list_idx` (read backwards, so no sort).
* - How many invitations an Organization created since a time, revoked ones included, capped with a
*   `LIMIT`: `WHERE organization_id = $1 AND state IN (...) AND created_at > $t`, on the same index.
*   (`state` is in the index, so the count lists the three states; it is bounded by the cap.)
*/
declare const invitations: PgTableWithColumns_a5zn0g37<{
	name: "invitations";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp37<{
			name: "id";
			tableName: "invitations";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp37<{
			name: "organization_id";
			tableName: "invitations";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		email: PgColumn_ffrhhp37<{
			name: "email";
			tableName: "invitations";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		role: PgColumn_ffrhhp37<{
			name: "role";
			tableName: "invitations";
			dataType: "string";
			columnType: "PgText";
			data: "admin" | "manager" | "rep";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["admin", "manager", "rep"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		teamId: PgColumn_ffrhhp37<{
			name: "team_id";
			tableName: "invitations";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		invitedByUserId: PgColumn_ffrhhp37<{
			name: "invited_by_user_id";
			tableName: "invitations";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		tokenHash: PgColumn_ffrhhp37<{
			name: "token_hash";
			tableName: "invitations";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp37<{
			name: "state";
			tableName: "invitations";
			dataType: "string";
			columnType: "PgText";
			data: "accepted" | "pending" | "revoked";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["pending", "accepted", "revoked"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		expiresAt: PgColumn_ffrhhp37<{
			name: "expires_at";
			tableName: "invitations";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		acceptedAt: PgColumn_ffrhhp37<{
			name: "accepted_at";
			tableName: "invitations";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		revokedAt: PgColumn_ffrhhp37<{
			name: "revoked_at";
			tableName: "invitations";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp37<{
			name: "created_at";
			tableName: "invitations";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp37<{
			name: "updated_at";
			tableName: "invitations";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* Which Organization a user belongs to: the one fact sign-in asks before any Organization is
* known. It is not under row-level security and no service role holds any privilege on it:
* `closeline_core` reaches it only through the `SECURITY DEFINER` function
* `core.organization_of_user(user_id)` (`organizationOfUser`), one row for one exact key, which
* joins {@link organizationState} for the status. The `SECURITY DEFINER` triggers on `memberships`
* write it, and it holds no status of its own, so a status change never touches it. A user belongs
* to exactly one Organization, enforced by the unique constraint on `user_id`. To allow several,
* one migration drops `membership_directory_one_organization_per_user` and replaces the function.
* It has no index on `organization_id` alone: nothing reads it by Organization, and with one a plan
* cached for the delete by key could scan every member of the Organization per row.
*/
declare const membershipDirectory: PgTableWithColumns_a5zn0g37<{
	name: "membership_directory";
	schema: "core";
	columns: {
		userId: PgColumn_ffrhhp37<{
			name: "user_id";
			tableName: "membership_directory";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp37<{
			name: "organization_id";
			tableName: "membership_directory";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* Which Organization and invitation a token hash opens, for the pending invitations only: a row
* leaves when its invitation is accepted or revoked. It carries `expires_at` so that
* `core.invitation_for_token(token_hash)` (`invitationForToken`) can answer, for one exact key,
* only when the invitation is pending and unexpired (and, by joining {@link organizationState},
* in an `active` Organization), without reading a tenant table. Not under row-level security; no
* service role holds any privilege on it. The `SECURITY DEFINER` triggers on `invitations` keep
* it, and a status change never touches it. It has no index on `organization_id` alone: nothing
* reads it by Organization, and such an index is one a cached plan could pick for a delete by key.
*/
declare const invitationDirectory: PgTableWithColumns_a5zn0g37<{
	name: "invitation_directory";
	schema: "core";
	columns: {
		tokenHash: PgColumn_ffrhhp37<{
			name: "token_hash";
			tableName: "invitation_directory";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp37<{
			name: "organization_id";
			tableName: "invitation_directory";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		invitationId: PgColumn_ffrhhp37<{
			name: "invitation_id";
			tableName: "invitation_directory";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		expiresAt: PgColumn_ffrhhp37<{
			name: "expires_at";
			tableName: "invitation_directory";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* An Organization's status, one row per Organization, so a status change writes one row however
* many members and invitations the Organization has. Sign-in and accepting an invitation ask the
* status before any Organization is known, so it cannot sit behind row-level security: it is a
* second no-access table (see {@link membershipDirectory}), joined by `core.organization_of_user`
* and `core.invitation_for_token`, and no service role holds any privilege on it. A trigger on
* `organizations` writes it in the same transaction as the Organization's own row (an insert
* creates it, a change of `status` updates it, and deleting the Organization cascades). It is
* written nowhere else and holds nothing a lookup can use without an exact key from another table.
*/
declare const organizationState: PgTableWithColumns_a5zn0g37<{
	name: "organization_state";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp37<{
			name: "organization_id";
			tableName: "organization_state";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		status: PgColumn_ffrhhp37<{
			name: "status";
			tableName: "organization_state";
			dataType: "string";
			columnType: "PgText";
			data: "active" | "deleted" | "suspended";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["active", "suspended", "deleted"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* The outcome of one public `POST`, kept so a retry with the same `Idempotency-Key` gets the same
* answer instead of doing the work twice. One row per `(organization_id, user_id, route, key)`: the
* key is the primary key in that order, so another Organization, user or route can reuse the same
* client key. The service inserts the row in flight (`status` and `response` both null), does its
* write and completes the row in the same transaction, so an in-flight row is never committed and a
* killed request strands no key; nothing recovers an in-flight row that was committed on its own.
*
* - `route` is a short route name such as `invitations.create` (1 to 64 of `a-z`, `0-9`, `.`, `_`).
* - `key` is the client's key: 1 to 255 printable ASCII characters (`!` to `~`, no space).
* - `request_hash` is the SHA-256 (32 bytes) of the request body, so the same key sent with a
*   different body is told apart from a retry. The body itself is never stored.
* - `status` is the HTTP status of the stored response (100 to 599), null while in flight.
* - `response` is the stored body, null exactly when `status` is null, and at most 16384
*   bytes of its text form (`octet_length(response::text)`), so no one row can be made large.
*
* A row is completed once: a trigger refuses any update of a completed row, and any change to the
* Organization, user, route, key, hash or creation time of a row, in flight or not, so no `UPDATE`
* can replace a stored answer. (A `DELETE` followed by an `INSERT` by the core role can, which the
* purge relies on.) Complete with `UPDATE ... WHERE <key> AND status IS NULL` and treat zero rows
* as already completed. Rows are only removed by the purge or with their Organization. The service role has the schema's
* default `SELECT`, `INSERT`, `UPDATE` and `DELETE`, and no other service role can reach it.
*
* Lists served:
* - The lookup of one key: the primary key.
* - The purge, per Organization and in batches: `DELETE ... WHERE ctid = ANY (ARRAY(SELECT ctid
*   FROM core.idempotency_keys WHERE organization_id = $1 AND created_at < $2 ORDER BY created_at
*   LIMIT $n))`, inside the Organization's scope, on `idempotency_keys_purge_idx` (no sort, and no
*   cross-tenant function). Repeat until a batch removes none: a short batch does not mean the
*   backlog is empty, because a row another session is completing is skipped and goes with the next
*   batch. The `ctid` form assumes the table is not partitioned.
*/
declare const idempotencyKeys: PgTableWithColumns_a5zn0g37<{
	name: "idempotency_keys";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp37<{
			name: "organization_id";
			tableName: "idempotency_keys";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userId: PgColumn_ffrhhp37<{
			name: "user_id";
			tableName: "idempotency_keys";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		route: PgColumn_ffrhhp37<{
			name: "route";
			tableName: "idempotency_keys";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		key: PgColumn_ffrhhp37<{
			name: "key";
			tableName: "idempotency_keys";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		requestHash: PgColumn_ffrhhp37<{
			name: "request_hash";
			tableName: "idempotency_keys";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: Uint8Array<ArrayBufferLike>;
			driverParam: Uint8Array<ArrayBufferLike>;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		status: PgColumn_ffrhhp37<{
			name: "status";
			tableName: "idempotency_keys";
			dataType: "number";
			columnType: "PgSmallInt";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		response: PgColumn_ffrhhp37<{
			name: "response";
			tableName: "idempotency_keys";
			dataType: "json";
			columnType: "PgJsonb";
			data: unknown;
			driverParam: unknown;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			$type: unknown;
		}>;
		createdAt: PgColumn_ffrhhp37<{
			name: "created_at";
			tableName: "idempotency_keys";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
import { PgSchema as PgSchema_mtt0uw3 } from "drizzle-orm/pg-core";
/** The `playbook` Postgres schema, owned by the playbook service (login role `closeline_playbook`). */
declare const playbookSchema: PgSchema_mtt0uw3<"playbook">;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g38 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp38 } from "drizzle-orm/pg-core";
/** The states a Call is in. Mirrors the contract's `CALL_STATES`. */
declare const CALL_STATES: readonly ["uploaded", "transcribing", "awaiting_rep", "processing", "ready", "failed", "deleted"];
/** Why a Call ended `failed`. Mirrors the contract's `CALL_FAILURE_REASONS`. */
declare const CALL_FAILURE_REASONS: readonly ["no_turns", "too_few_speakers", "too_many_speakers", "rep_label_not_found", "not_per_side", "too_long", "transcription_failed", "transcription_timed_out", "unreadable", "processing_failed"];
/** What a Call was uploaded as. Mirrors the contract's `CALL_KINDS`. */
declare const CALL_KINDS: readonly ["transcript", "recording"];
/** The media type of a stored Call file. Mirrors the contract's `CALL_MEDIA_TYPES`. */
declare const CALL_MEDIA_TYPES: readonly ["text/plain", "text/vtt", "application/x-subrip", "application/json", "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm", "audio/flac"];
/** The channels of a per-side Recording. Mirrors the contract's `CALL_CHANNELS`. */
declare const CALL_CHANNELS: readonly ["left", "right"];
/** How a Rep is chosen. Mirrors the contract's `repChoiceSchema` discriminator. */
declare const CALL_REP_BY: readonly ["speaker", "channel"];
/** The largest Transcript, 5 MiB. Mirrors the contract's `MAX_TRANSCRIPT_BYTES`. */
declare const CALL_MAX_TRANSCRIPT_BYTES: number;
/** The largest Recording, 500 MiB. Mirrors the contract's `MAX_RECORDING_BYTES`. */
declare const CALL_MAX_RECORDING_BYTES: number;
/** The longest Recording in seconds (3 hours). Mirrors the contract's `MAX_RECORDING_SECONDS`. */
declare const CALL_MAX_RECORDING_SECONDS: number;
/** The most speakers a Call may list. Mirrors the contract's `MAX_CALL_SPEAKERS`. */
declare const CALL_MAX_SPEAKERS = 20;
/** The longest speaker label in code points. Mirrors the contract's `MAX_SPEAKER_LABEL_LENGTH`. */
declare const CALL_SPEAKER_LABEL_MAX_LENGTH = 64;
/** The most UTF-8 bytes a speaker label takes. Mirrors the contract's `MAX_SPEAKER_LABEL_BYTES`. */
declare const CALL_SPEAKER_LABEL_MAX_BYTES = 256;
/** The largest Rep or Outcome sequence. Mirrors the contract's `MAX_SEQ`. */
declare const CALL_MAX_SEQ = 2147483647;
/** The most times a Call purge may be claimed: the table's bound, as for documents. */
declare const CALL_PURGE_MAX_ATTEMPTS = 20;
/** The most times a Call job may be claimed: the table's bound, as for ingestion jobs. */
declare const CALL_JOB_MAX_ATTEMPTS = 20;
/**
* The most sends of one Recording to the transcription vendor over the Call's whole life. A transcribe
* job is claimed at most {@link CALL_JOB_MAX_ATTEMPTS} times and each attempt sends at most once, but a
* restore starts a new job, so the bound is on the Call itself: the table refuses a twenty-first
* send, and {@link CALL_SENT_TO_VENDOR} answers `sent` false instead of counting it.
*/
declare const CALL_MAX_VENDOR_SENDS = 20;
/** The most Call ids {@link CALL_SEARCH_STATE} reads in one call: the search over-fetch window (topK 100). */
declare const MAX_SEARCH_STATE_IDS = 100;
/** What a vendor id may look like: opaque, 1 to 128 characters of `[A-Za-z0-9._:-]` (the transcriber port's rule). */
declare const CALL_VENDOR_ID_PATTERN = "^[A-Za-z0-9._:-]{1,128}$";
/** The kinds of Call job: transcribe a Recording, build a Call's Moments, rebuild them after a Rep change. */
declare const CALL_JOB_KINDS: readonly ["transcribe", "process", "rebuild"];
/** The states of a Call job; `queued` and `running` are active. */
declare const CALL_JOB_STATES: readonly ["queued", "running", "succeeded", "failed", "cancelled"];
/**
* Whether a Call's Rep may be picked or changed. Mirrors the contract's `repChangeAllowed`, and is
* the same rule `CALL_SET_REP` applies in SQL: the test pins the two to each other.
*/
declare function repChangeAllowed(state: string, failureReason: string | null): boolean;
/**
* Whether a same-Deal re-upload of identical content re-queues a failed Call. Mirrors the
* contract's `callReuploadRequeues`; `CALL_REQUEUE` applies the same rule in SQL.
*/
declare function callReuploadRequeues(failureReason: string | null): boolean;
/**
* The rows whose vector cleanup is pending, as for documents: deleted, and the cleanup recorded
* for an older deletion than the current one. One text, used by `calls_cleanup_idx`, the
* `CALL_LIST_PENDING_CLEANUP` statement and the `call_cleanup` discovery verification.
*/
declare const CALL_PENDING_CLEANUP_PREDICATE = "state = 'deleted' and (vectors_removed_seq is null or vectors_removed_seq < deletion_seq)";
/**
* A Call of an Organization (ADR 0018): the record of an uploaded Transcript or Recording and the
* Deal it belongs to. **Metadata only**: the file is in object storage under `object_key`, the
* Transcript a Recording produced under `transcript_key`, and the turns and Moments in the vector
* index. Nothing here holds a turn, a sentence or audio. `speaker_labels` are untrusted text from
* the file (at most 20, unique), kept so a Rep can be picked from them.
*
* Keyed by `(organization_id, id)`; `deal_record_id` references the Deal without a cascade, so a
* Deal cannot be erased while a Call refers to it: Calls are erased first. The checks tie every
* state to its columns exactly as the contract's `callSchema` does (see the table checks).
*
* `epoch` is bumped by every soft delete and restore (as for documents); `deletion_seq` by every
* soft delete (a queued vector cleanup carries it); `rep_seq` by every Rep pick or change (a
* queued rebuild carries it and applies only while it equals the stored one); `tagged_outcome_seq`
* is the Outcome sequence of the Deal the Call's Moments are tagged with in the index, so a Call is
* in search only while it is `ready`, its Deal is `won` and the tag is current.
*
* Content hash: unique per Organization among Calls whose purge has not started and that are not
* barred from restore (`calls_content_hash_key`), whatever the Deal: the same content under
* another Deal is found by the hash and refused. A Transcript and a Recording of the same Call
* have different hashes and are two Calls.
*
* Quota: `organization_usage.call_count` and `recording_byte_count` count every Call, a soft-deleted
* one and one in `awaiting_rep` included, until it is purged or erased. Recording bytes count
* Recordings only.
*
* Lists (keyset `(created_at, id)`, newest first, always a text `cursor_at`): live Calls
* (`calls_list_idx`), one state (`calls_state_list_idx`, deleted included), one Deal
* (`calls_deal_list_idx`).
*/
declare const calls: PgTableWithColumns_a5zn0g38<{
	name: "calls";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp38<{
			name: "id";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp38<{
			name: "organization_id";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		dealRecordId: PgColumn_ffrhhp38<{
			name: "deal_record_id";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		kind: PgColumn_ffrhhp38<{
			name: "kind";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: "recording" | "transcript";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["transcript", "recording"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		fileName: PgColumn_ffrhhp38<{
			name: "file_name";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		mediaType: PgColumn_ffrhhp38<{
			name: "media_type";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: "application/json" | "application/x-subrip" | "audio/flac" | "audio/mp4" | "audio/mpeg" | "audio/ogg" | "audio/wav" | "audio/webm" | "text/plain" | "text/vtt";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["text/plain", "text/vtt", "application/x-subrip", "application/json", "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm", "audio/flac"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sizeBytes: PgColumn_ffrhhp38<{
			name: "size_bytes";
			tableName: "calls";
			dataType: "number";
			columnType: "PgBigInt53";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		contentHash: PgColumn_ffrhhp38<{
			name: "content_hash";
			tableName: "calls";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: Uint8Array<ArrayBufferLike>;
			driverParam: Uint8Array<ArrayBufferLike>;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		durationSeconds: PgColumn_ffrhhp38<{
			name: "duration_seconds";
			tableName: "calls";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp38<{
			name: "state";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: "awaiting_rep" | "deleted" | "failed" | "processing" | "ready" | "transcribing" | "uploaded";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["uploaded", "transcribing", "awaiting_rep", "processing", "ready", "failed", "deleted"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		failureReason: PgColumn_ffrhhp38<{
			name: "failure_reason";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: "no_turns" | "not_per_side" | "processing_failed" | "rep_label_not_found" | "too_few_speakers" | "too_long" | "too_many_speakers" | "transcription_failed" | "transcription_timed_out" | "unreadable";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["no_turns", "too_few_speakers", "too_many_speakers", "rep_label_not_found", "not_per_side", "too_long", "transcription_failed", "transcription_timed_out", "unreadable", "processing_failed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		repBy: PgColumn_ffrhhp38<{
			name: "rep_by";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: "channel" | "speaker";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["speaker", "channel"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		repLabel: PgColumn_ffrhhp38<{
			name: "rep_label";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		repChannel: PgColumn_ffrhhp38<{
			name: "rep_channel";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: "left" | "right";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["left", "right"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		speakerLabels: PgColumn_ffrhhp38<{
			name: "speaker_labels";
			tableName: "calls";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: string[];
			driverParam: string[];
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		uploadedBy: PgColumn_ffrhhp38<{
			name: "uploaded_by";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		objectKey: PgColumn_ffrhhp38<{
			name: "object_key";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		transcriptKey: PgColumn_ffrhhp38<{
			name: "transcript_key";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		epoch: PgColumn_ffrhhp38<{
			name: "epoch";
			tableName: "calls";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		repSeq: PgColumn_ffrhhp38<{
			name: "rep_seq";
			tableName: "calls";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		deletionSeq: PgColumn_ffrhhp38<{
			name: "deletion_seq";
			tableName: "calls";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		vectorsRemovedSeq: PgColumn_ffrhhp38<{
			name: "vectors_removed_seq";
			tableName: "calls";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		taggedOutcomeSeq: PgColumn_ffrhhp38<{
			name: "tagged_outcome_seq";
			tableName: "calls";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sentToVendorAt: PgColumn_ffrhhp38<{
			name: string;
			tableName: "calls";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		vendorSendSeq: PgColumn_ffrhhp38<{
			name: "vendor_send_seq";
			tableName: "calls";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		vendorRemovedAt: PgColumn_ffrhhp38<{
			name: string;
			tableName: "calls";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		deletedAt: PgColumn_ffrhhp38<{
			name: string;
			tableName: "calls";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		deletedBy: PgColumn_ffrhhp38<{
			name: "deleted_by";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		purgeDueAt: PgColumn_ffrhhp38<{
			name: string;
			tableName: "calls";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		purgeStartedAt: PgColumn_ffrhhp38<{
			name: string;
			tableName: "calls";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		purgeLeaseUntil: PgColumn_ffrhhp38<{
			name: string;
			tableName: "calls";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		purgeAttempts: PgColumn_ffrhhp38<{
			name: "purge_attempts";
			tableName: "calls";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		restoreBarredAt: PgColumn_ffrhhp38<{
			name: string;
			tableName: "calls";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp38<{
			name: string;
			tableName: "calls";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp38<{
			name: string;
			tableName: "calls";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* A job of one Call: `transcribe` a Recording, `process` (build Moments) a Call whose Rep is
* known, or `rebuild` them after a Rep pick or change (it carries `rep_seq` and applies only while
* the Call's stored `rep_seq` equals it). **A sibling of `ingestion_jobs`, not an extension of
* it:** an ingestion job is keyed to a document and its parse, chunk, embed and index steps, and
* its columns and checks say so; a Call job has three kinds and no steps, and sharing the table
* would have made every check conditional on a kind. The lease is the same (`next_attempt_at` is
* the due time while queued and the lease end while running, `claim_token` fences a worker whose
* lease lapsed, `attempts` is bounded by the table). One active job per Call
* (`call_jobs_active_call_key`).
*/
declare const callJobs: PgTableWithColumns_a5zn0g38<{
	name: "call_jobs";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp38<{
			name: "id";
			tableName: "call_jobs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp38<{
			name: "organization_id";
			tableName: "call_jobs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		callId: PgColumn_ffrhhp38<{
			name: "call_id";
			tableName: "call_jobs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		kind: PgColumn_ffrhhp38<{
			name: "kind";
			tableName: "call_jobs";
			dataType: "string";
			columnType: "PgText";
			data: "process" | "rebuild" | "transcribe";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["transcribe", "process", "rebuild"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		epoch: PgColumn_ffrhhp38<{
			name: "epoch";
			tableName: "call_jobs";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		repSeq: PgColumn_ffrhhp38<{
			name: "rep_seq";
			tableName: "call_jobs";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp38<{
			name: "state";
			tableName: "call_jobs";
			dataType: "string";
			columnType: "PgText";
			data: "cancelled" | "failed" | "queued" | "running" | "succeeded";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["queued", "running", "succeeded", "failed", "cancelled"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		attempts: PgColumn_ffrhhp38<{
			name: "attempts";
			tableName: "call_jobs";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		nextAttemptAt: PgColumn_ffrhhp38<{
			name: string;
			tableName: "call_jobs";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		claimToken: PgColumn_ffrhhp38<{
			name: "claim_token";
			tableName: "call_jobs";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		failureReason: PgColumn_ffrhhp38<{
			name: "failure_reason";
			tableName: "call_jobs";
			dataType: "string";
			columnType: "PgText";
			data: "no_turns" | "not_per_side" | "processing_failed" | "rep_label_not_found" | "too_few_speakers" | "too_long" | "too_many_speakers" | "transcription_failed" | "transcription_timed_out" | "unreadable";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["no_turns", "too_few_speakers", "too_many_speakers", "rep_label_not_found", "not_per_side", "too_long", "transcription_failed", "transcription_timed_out", "unreadable", "processing_failed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		finishedAt: PgColumn_ffrhhp38<{
			name: string;
			tableName: "call_jobs";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp38<{
			name: string;
			tableName: "call_jobs";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp38<{
			name: string;
			tableName: "call_jobs";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* One send of a Recording to the transcription vendor, keyed by Call and `calls.vendor_send_seq`.
* {@link CALL_SENT_TO_VENDOR} inserts the row (with no id) in the same write that counts the send;
* {@link CALL_VENDOR_ID_RECORD} sets `vendor_id` after the vendor accepted, once, and never over
* another id. A send may never get an id (a crash), so the purge works without one: the row stays and
* the service finds that copy by its client reference. At most {@link CALL_MAX_VENDOR_SENDS} rows per
* Call. **The only index on `vendor_id`** is unique, partial (set ids only) and led by the
* Organization, so no query reaches an id without one: one vendor copy belongs to one send. Rows go with the Call (the purge deletes it; the key cascades).
*/
declare const callVendorSends: PgTableWithColumns_a5zn0g38<{
	name: "call_vendor_sends";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp38<{
			name: "organization_id";
			tableName: "call_vendor_sends";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		callId: PgColumn_ffrhhp38<{
			name: "call_id";
			tableName: "call_vendor_sends";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		seq: PgColumn_ffrhhp38<{
			name: "seq";
			tableName: "call_vendor_sends";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		vendorId: PgColumn_ffrhhp38<{
			name: "vendor_id";
			tableName: "call_vendor_sends";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp38<{
			name: string;
			tableName: "call_vendor_sends";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		recordedAt: PgColumn_ffrhhp38<{
			name: string;
			tableName: "call_vendor_sends";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g39 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp39 } from "drizzle-orm/pg-core";
/**
* The messages a playbook queue consumer has handled or is handling: the table behind the kit's
* `ProcessedStore` (`claim`, `renew`, `complete`, `release`, `purge`), shaped as the kit README
* sketches it with one difference: `organization_id` is the wire id as text (`org_` and 32 hex
* digits), not a uuid, because every tenant table here carries the wire id and the one canonical
* policy compares it as text; the store passes the id through, with no conversion.
*
* It is a tenant table. A message for an Organization is recorded under that Organization, in its
* scope. A global message (no Organization) is recorded under the all-zero id
* `org_00000000000000000000000000000000`, and the consumer of global messages runs under that
* scope with the same helper; that id is not any real Organization's.
*
* Because of row-level security a purge sees only the scope it runs in: run
* `CONSUMED_PURGE` once per Organization (and once under the all-zero scope), splitting the limit.
* Indexes: the key serves `claim`, `renew`, `complete` and `release`; the two partial indexes
* serve the purge of done records and of lapsed claims.
*/
declare const consumedMessage: PgTableWithColumns_a5zn0g39<{
	name: "consumed_message";
	schema: "playbook";
	columns: {
		consumer: PgColumn_ffrhhp39<{
			name: "consumer";
			tableName: "consumed_message";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp39<{
			name: "organization_id";
			tableName: "consumed_message";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		messageId: PgColumn_ffrhhp39<{
			name: "message_id";
			tableName: "consumed_message";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp39<{
			name: "state";
			tableName: "consumed_message";
			dataType: "string";
			columnType: "PgText";
			data: "claimed" | "done";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["claimed", "done"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		claimToken: PgColumn_ffrhhp39<{
			name: "claim_token";
			tableName: "consumed_message";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		leaseExpiresAt: PgColumn_ffrhhp39<{
			name: string;
			tableName: "consumed_message";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		completedAt: PgColumn_ffrhhp39<{
			name: string;
			tableName: "consumed_message";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g40 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp40 } from "drizzle-orm/pg-core";
/** The user id of an internal call, which has no user: all zeros, in the `usr_` shape the key needs. */
declare const INTERNAL_CALL_USER_ID = "usr_00000000000000000000000000000000";
/**
* The outcome of one public `POST` of the playbook service (upload) or one internal call
* (remove-all), per Organization, user, route and client key: core's `idempotency_keys` (migration
* `0004`) with the same columns, checks and write-once trigger, **without the foreign key to
* organizations** (the playbook schema has no Organization table; the id is checked by shape).
* An internal call has no user and uses {@link INTERNAL_CALL_USER_ID}. The service inserts the row
* in flight, does its write and completes the row in the same transaction; a completed row is
* never rewritten. The purge is per Organization and bounded (`IDEMPOTENCY_PURGE`), on
* `idempotency_keys_purge_idx`.
*/
declare const playbookIdempotencyKeys: PgTableWithColumns_a5zn0g40<{
	name: "idempotency_keys";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp40<{
			name: "organization_id";
			tableName: "idempotency_keys";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		userId: PgColumn_ffrhhp40<{
			name: "user_id";
			tableName: "idempotency_keys";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		route: PgColumn_ffrhhp40<{
			name: "route";
			tableName: "idempotency_keys";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		key: PgColumn_ffrhhp40<{
			name: "key";
			tableName: "idempotency_keys";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		requestHash: PgColumn_ffrhhp40<{
			name: "request_hash";
			tableName: "idempotency_keys";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: Uint8Array<ArrayBufferLike>;
			driverParam: Uint8Array<ArrayBufferLike>;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		status: PgColumn_ffrhhp40<{
			name: "status";
			tableName: "idempotency_keys";
			dataType: "number";
			columnType: "PgSmallInt";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		response: PgColumn_ffrhhp40<{
			name: "response";
			tableName: "idempotency_keys";
			dataType: "json";
			columnType: "PgJsonb";
			data: unknown;
			driverParam: unknown;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			$type: unknown;
		}>;
		createdAt: PgColumn_ffrhhp40<{
			name: "created_at";
			tableName: "idempotency_keys";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g41 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp41 } from "drizzle-orm/pg-core";
/**
* What the `orphan_sweep` work kind remembers between sweeps: one row per Organization, the time
* through which the service has swept stored objects for orphans (`swept_through`). A **tenant
* table** (row-level security, fail-closed). It is written only by `playbook.orphan_sweep_done`
* (`ORPHAN_SWEEP_DONE`), never by an upload attempt, so concurrent attempts of one Organization
* share no row and never wait for each other. The upload attempts themselves are the idempotency
* keys (`created_at`), and the work hint holds the oldest unswept one; the discovery function
* reports an Organization when an attempt is newer than `swept_through`. The role can read its row
* and cannot write it directly.
*
* `erased_attempt_at` is the only trace of upload attempts whose idempotency keys erasure
* (`remove_organization_rest`) deleted: the creation time of the latest one, null when none. It is
* written only by that function and read by the discovery function and `orphan_sweep_done`, which
* treat it as a pending attempt until `swept_through` covers it. It holds a time and no content.
*/
declare const playbookOrphanSweeps: PgTableWithColumns_a5zn0g41<{
	name: "orphan_sweeps";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp41<{
			name: "organization_id";
			tableName: "orphan_sweeps";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sweptThrough: PgColumn_ffrhhp41<{
			name: "swept_through";
			tableName: "orphan_sweeps";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		erasedAttemptAt: PgColumn_ffrhhp41<{
			name: "erased_attempt_at";
			tableName: "orphan_sweeps";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g42 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp42 } from "drizzle-orm/pg-core";
/** The Outcome of a Deal. Mirrors the contract's `OUTCOMES`. */
declare const DEAL_OUTCOMES: readonly ["won", "lost", "open"];
/** The states of a Deal import. Mirrors the contract's `DEAL_IMPORT_STATES`. */
declare const DEAL_IMPORT_STATES: readonly ["uploaded", "processing", "completed", "failed"];
/** Why a whole import ended `failed`. Mirrors the contract's `DEAL_IMPORT_FAILURE_REASONS`. */
declare const DEAL_IMPORT_FAILURE_REASONS: readonly ["too_many_rows", "unreadable", "processing_failed"];
/** The result of one CSV row. Mirrors the contract's `DEAL_IMPORT_ROW_RESULTS`. */
declare const DEAL_IMPORT_ROW_RESULTS: readonly ["applied", "rejected"];
/** Why a row was rejected. Mirrors the contract's `DEAL_IMPORT_ROW_REASONS`. */
declare const DEAL_IMPORT_ROW_REASONS: readonly ["wrong_column_count", "invalid_deal_id", "duplicate_in_file", "invalid_outcome", "invalid_closed_at", "invalid_amount", "invalid_currency", "invalid_name", "outcome_already_decided", "deal_limit_reached", "blank_row"];
/**
* The reasons a rejected row may have no deal id: the id was unusable or the row had no cells at
* all. The check on `deal_import_rows` is built from this list, so a service double can import it.
*/
declare const DEAL_IMPORT_ROW_REASONS_WITHOUT_DEAL_ID: readonly ["invalid_deal_id", "wrong_column_count", "blank_row"];
/** The most unfinished (`uploaded` or `processing`) Deal imports an Organization may have. Mirrors the contract's `MAX_QUEUED_DEAL_IMPORTS` (v0.10.0). */
declare const MAX_QUEUED_DEAL_IMPORTS = 5;
/** The longest deal id in code points. Mirrors the contract's `MAX_DEAL_ID_LENGTH`. */
declare const DEAL_ID_MAX_LENGTH = 128;
/** The most UTF-8 bytes a deal id takes (4 per code point). Mirrors the contract's `MAX_DEAL_ID_BYTES`. */
declare const DEAL_ID_MAX_BYTES = 512;
/** The longest Deal name in code points. Mirrors the contract's `MAX_DEAL_NAME_LENGTH`. */
declare const DEAL_NAME_MAX_LENGTH = 200;
/** The most UTF-8 bytes a Deal name takes. Mirrors the contract's `MAX_DEAL_NAME_BYTES`. */
declare const DEAL_NAME_MAX_BYTES = 800;
/** The most data rows in one CSV. Mirrors the contract's `MAX_DEAL_IMPORT_ROWS`. */
declare const DEAL_IMPORT_MAX_ROWS = 5e4;
/** The largest CSV in bytes (10 MiB). Mirrors the contract's `MAX_DEAL_IMPORT_BYTES`. */
declare const DEAL_IMPORT_MAX_BYTES: number;
/** The largest sequence number (Outcome sequence). Mirrors the contract's `MAX_DELETION_SEQ`. */
declare const DEAL_MAX_SEQ = 2147483647;
/** The largest rights wording version. Mirrors the contract's `MAX_RIGHTS_WORDING_VERSION`. */
declare const RIGHTS_MAX_WORDING_VERSION = 1e6;
/** The most times an import job may be claimed: the table's bound, as for ingestion jobs. */
declare const DEAL_IMPORT_MAX_ATTEMPTS = 20;
/** The most rows one {@link DEAL_IMPORT_APPLY}-style batch may take: the library's batch bound. */
declare const DEAL_IMPORT_APPLY_BATCH = 500;
/**
* A Deal of an Organization (ADR 0018): the record a Call is linked to and a CSV row creates or
* updates. `deal_id` is the customer's own identifier, trimmed by the service and otherwise
* compared exactly (`deals_deal_id_key`, unique per Organization); it is customer text, never
* logged. `outcome` is `won`, `lost` or `open` and `outcome_seq` counts its changes: a trigger
* demands that a change of Outcome raises it by exactly one and that it never falls, so a
* re-tag job that carries it cannot finish in the wrong order (as `deletion_seq` for documents).
* There is **no delete** for the service role: a Deal goes only with its Organization's erasure
* (`playbook.erase_deals`). `appeared_in_import` says whether any CSV ever named it, so a Deal
* made only by a Call upload (a typo) can be listed.
*
* Lists served (keyset on `(created_at, id)`, newest first): all (`deals_list_idx`), by Outcome
* (`deals_outcome_list_idx`), by whether it appeared in an import (`deals_import_list_idx`);
* lookup by the customer's id: `deals_deal_id_key`.
*/
declare const deals: PgTableWithColumns_a5zn0g42<{
	name: "deals";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp42<{
			name: "id";
			tableName: "deals";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp42<{
			name: "organization_id";
			tableName: "deals";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		dealId: PgColumn_ffrhhp42<{
			name: "deal_id";
			tableName: "deals";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		name: PgColumn_ffrhhp42<{
			name: "name";
			tableName: "deals";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		outcome: PgColumn_ffrhhp42<{
			name: "outcome";
			tableName: "deals";
			dataType: "string";
			columnType: "PgText";
			data: "lost" | "open" | "won";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["won", "lost", "open"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		outcomeSeq: PgColumn_ffrhhp42<{
			name: "outcome_seq";
			tableName: "deals";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		retagThrough: PgColumn_ffrhhp42<{
			name: "retag_through";
			tableName: "deals";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		closedAt: PgColumn_ffrhhp42<{
			name: "closed_at";
			tableName: "deals";
			dataType: "string";
			columnType: "PgDateString";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		amount: PgColumn_ffrhhp42<{
			name: "amount";
			tableName: "deals";
			dataType: "string";
			columnType: "PgNumeric";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		currency: PgColumn_ffrhhp42<{
			name: "currency";
			tableName: "deals";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		appearedInImport: PgColumn_ffrhhp42<{
			name: "appeared_in_import";
			tableName: "deals";
			dataType: "boolean";
			columnType: "PgBoolean";
			data: boolean;
			driverParam: boolean;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp42<{
			name: string;
			tableName: "deals";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp42<{
			name: string;
			tableName: "deals";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* A Deal import: one uploaded CSV and the job that applies it. The CSV is in object storage under
* `object_key` until the job ends; the service removes it first and then finishes the import, or
* (for an erased import) records the removal with `DEAL_IMPORT_OBJECT_REMOVED`. The job's lease
* is the same as an ingestion job's: `next_attempt_at` is the due time while `uploaded` and the
* lease end while `processing`, `claim_token` fences a worker whose lease lapsed, and `attempts` is
* bounded by the table. Rows are applied in batches (`DEAL_IMPORT_APPLY`) that move
* `applied_count` and `rejected_count` in the same statement that records the report rows, so the
* counts cannot drift; `row_count` is set when the import completes, and only then. An erased
* import has `erased_at`, is `failed` and is never claimed again; its report rows and then the
* import row itself are removed in bounded batches (`DEAL_IMPORT_PURGE_BATCH`).
*/
declare const dealImports: PgTableWithColumns_a5zn0g42<{
	name: "deal_imports";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp42<{
			name: "id";
			tableName: "deal_imports";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp42<{
			name: "organization_id";
			tableName: "deal_imports";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp42<{
			name: "state";
			tableName: "deal_imports";
			dataType: "string";
			columnType: "PgText";
			data: "completed" | "failed" | "processing" | "uploaded";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["uploaded", "processing", "completed", "failed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		failureReason: PgColumn_ffrhhp42<{
			name: "failure_reason";
			tableName: "deal_imports";
			dataType: "string";
			columnType: "PgText";
			data: "processing_failed" | "too_many_rows" | "unreadable";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["too_many_rows", "unreadable", "processing_failed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		uploadedBy: PgColumn_ffrhhp42<{
			name: "uploaded_by";
			tableName: "deal_imports";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		objectKey: PgColumn_ffrhhp42<{
			name: "object_key";
			tableName: "deal_imports";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sizeBytes: PgColumn_ffrhhp42<{
			name: "size_bytes";
			tableName: "deal_imports";
			dataType: "number";
			columnType: "PgBigInt53";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		attempts: PgColumn_ffrhhp42<{
			name: "attempts";
			tableName: "deal_imports";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		nextAttemptAt: PgColumn_ffrhhp42<{
			name: string;
			tableName: "deal_imports";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		claimToken: PgColumn_ffrhhp42<{
			name: "claim_token";
			tableName: "deal_imports";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		rowCount: PgColumn_ffrhhp42<{
			name: "row_count";
			tableName: "deal_imports";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		appliedCount: PgColumn_ffrhhp42<{
			name: "applied_count";
			tableName: "deal_imports";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		rejectedCount: PgColumn_ffrhhp42<{
			name: "rejected_count";
			tableName: "deal_imports";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		reportThrough: PgColumn_ffrhhp42<{
			name: "report_through";
			tableName: "deal_imports";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		objectRemovedAt: PgColumn_ffrhhp42<{
			name: string;
			tableName: "deal_imports";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		erasedAt: PgColumn_ffrhhp42<{
			name: string;
			tableName: "deal_imports";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		finishedAt: PgColumn_ffrhhp42<{
			name: string;
			tableName: "deal_imports";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp42<{
			name: string;
			tableName: "deal_imports";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp42<{
			name: string;
			tableName: "deal_imports";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* The report of a Deal import, one row per CSV data row: the row number (2 is the first data row,
* counting the header as 1), the deal id the row named, the result and the reason. **Only those
* four things are stored**, never another cell, so the report holds no amount, name or date. A
* row has a deal id unless its id was unusable (`invalid_deal_id`, `wrong_column_count`). The first
* row of a deal id within an import is unique (`deal_import_rows_first_key`); every later row of it
* is `duplicate_in_file`, so a repeat is rejected even when two batches race. Listed by row number
* (`deal_import_rows_pkey`, `deal_import_rows_result_idx` for one result). The foreign key to the
* import is not cascading: rows go in bounded batches before the import row.
*/
declare const dealImportRows: PgTableWithColumns_a5zn0g42<{
	name: "deal_import_rows";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp42<{
			name: "organization_id";
			tableName: "deal_import_rows";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		importId: PgColumn_ffrhhp42<{
			name: "import_id";
			tableName: "deal_import_rows";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		rowNumber: PgColumn_ffrhhp42<{
			name: "row_number";
			tableName: "deal_import_rows";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		dealId: PgColumn_ffrhhp42<{
			name: "deal_id";
			tableName: "deal_import_rows";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		result: PgColumn_ffrhhp42<{
			name: "result";
			tableName: "deal_import_rows";
			dataType: "string";
			columnType: "PgText";
			data: "applied" | "rejected";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["applied", "rejected"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		reason: PgColumn_ffrhhp42<{
			name: "reason";
			tableName: "deal_import_rows";
			dataType: "string";
			columnType: "PgText";
			data: "blank_row" | "deal_limit_reached" | "duplicate_in_file" | "invalid_amount" | "invalid_closed_at" | "invalid_currency" | "invalid_deal_id" | "invalid_name" | "invalid_outcome" | "outcome_already_decided" | "wrong_column_count";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["wrong_column_count", "invalid_deal_id", "duplicate_in_file", "invalid_outcome", "invalid_closed_at", "invalid_amount", "invalid_currency", "invalid_name", "outcome_already_decided", "deal_limit_reached", "blank_row"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* The rights confirmation of ADR 0018, choice 12: one row per Organization, saying which member
* confirmed that the Organization may share its Recordings and Transcripts, when, and the version
* of the wording shown. A newer version replaces it (`RIGHTS_CONFIRM`); the wording itself is not
* here. Whether the stored version is the current one is the service's number to compare.
*/
declare const rightsConfirmations: PgTableWithColumns_a5zn0g42<{
	name: "rights_confirmations";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp42<{
			name: "organization_id";
			tableName: "rights_confirmations";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		confirmedBy: PgColumn_ffrhhp42<{
			name: "confirmed_by";
			tableName: "rights_confirmations";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		confirmedAt: PgColumn_ffrhhp42<{
			name: string;
			tableName: "rights_confirmations";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		wordingVersion: PgColumn_ffrhhp42<{
			name: "wording_version";
			tableName: "rights_confirmations";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g43 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp43 } from "drizzle-orm/pg-core";
/**
* The states a document is in (ADR 0016). `uploaded` is stored and waiting for ingestion,
* `processing` is being ingested, `ready` is searchable, `failed` ended with a reason, and
* `deleted` is soft-deleted and awaiting purge. A purged document is a removed row, not a state.
* Mirrors the contract's list.
*/
declare const DOCUMENT_STATES: readonly ["uploaded", "processing", "ready", "failed", "deleted"];
/** Why a document ended in `failed`; the portal shows it. Mirrors the contract's list. */
declare const DOCUMENT_FAILURE_REASONS: readonly ["too_many_pages", "unreadable", "password_protected", "no_text", "processing_failed"];
/** The file types phase 1 accepts, as detected from the content (ADR 0016). */
declare const DOCUMENT_FILE_TYPES: readonly ["pdf", "docx", "pptx", "txt", "md"];
/** The largest file the table accepts, in bytes: 25 MiB, the upload limit of ADR 0016. */
declare const DOCUMENT_MAX_BYTES = 26214400;
/** The most pages a stored page count may hold. The 300-page limit is the job's rule, not the table's. */
declare const DOCUMENT_MAX_PAGE_COUNT = 1e5;
/** The most times a purge may claim one document; claims stop there and a person reconciles. */
declare const DOCUMENT_PURGE_MAX_ATTEMPTS = 20;
/** The states an ingestion job is in. `queued` and `running` are active; the rest are final. */
declare const INGESTION_JOB_STATES: readonly ["queued", "running", "succeeded", "failed", "cancelled"];
/** The steps of an ingestion job, in order; the stored step is the one to run next. */
declare const INGESTION_STEPS: readonly ["parse", "chunk", "embed", "index"];
/** The most times a job may be claimed: the table's bound. The service gives up below it. */
declare const INGESTION_JOB_MAX_ATTEMPTS = 20;
/** The most chunks one job may record. */
declare const INGESTION_MAX_CHUNKS = 1e6;
/** The states a consumed message is in (the kit's `ProcessedStore`). */
declare const CONSUMED_MESSAGE_STATES: readonly ["claimed", "done"];
/** The all-zero Organization id is the global scope of consumed messages only (ADR 0016 notes). */
declare const GLOBAL_SCOPE_ORGANIZATION_ID = "org_00000000000000000000000000000000";
/**
* The rows whose vector cleanup is pending: deleted, and the cleanup recorded for an older
* deletion than the current one (or never). One text, used by `documents_cleanup_idx` (its
* predicate), the `DOCUMENT_LIST_PENDING_CLEANUP` statement, and, with the alias `d.`, the
* `cleanup_pending` verification in `playbook.organizations_with_work`, so the three cannot differ.
*/
declare const PENDING_CLEANUP_PREDICATE = "state = 'deleted' and (vectors_removed_seq is null or vectors_removed_seq < deletion_seq)";
/**
* A document of an Organization's Playbook: the record of an uploaded file, never its content or
* its text (the file is in object storage under `object_key`, the chunks in the vector store).
*
* Keyed by `(organization_id, id)` so the jobs can hold a composite foreign key. `epoch` is bumped
* by every soft delete and every restore; vectors are written tagged with the epoch of the job
* that wrote them, so a cleanup of the deletion at epoch e removes tags up to e and never the
* vectors of a later restore. `deletion_seq` is bumped by one on every soft delete and is what a
* queued cleanup carries and the guard compares (`vectors_removed_seq` records the cleanup done).
* Checks tie every state to its columns: a `failed` document has a reason, a `deleted` one has its
* deletion and purge-due times, and the purge columns exist only on a deleted document.
*
* Content hash: unique per Organization among documents whose purge has not started and that are
* not barred from restore (`documents_content_hash_key`, partial), so an upload that matches a
* soft-deleted document finds it, and one that matches a document being purged or erased does not
* and creates a new one. `restore_barred_at` is set by erasure and by the reset of a spent purge:
* a barred document never comes back, by either restore.
*
* Lists served (keyset, `LIMIT` a page):
* - Documents not deleted, newest first: `WHERE organization_id = $1 AND state <> 'deleted' AND
*   (created_at, id) < ($c, $i) ORDER BY created_at DESC, id DESC`, on `documents_list_idx` read
*   backwards.
* - One live state, newest first, same keyset: `documents_state_list_idx`.
* - Deleted documents, newest first, same keyset: `documents_deleted_list_idx`.
* - By content hash: `documents_content_hash_key`.
* - Due for purge, and the deleted documents oldest-due first: `documents_purge_idx`.
* - Quota counts: `organization_usage`, one row, kept by triggers.
*/
declare const documents: PgTableWithColumns_a5zn0g43<{
	name: "documents";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp43<{
			name: "id";
			tableName: "documents";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp43<{
			name: "organization_id";
			tableName: "documents";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		name: PgColumn_ffrhhp43<{
			name: "name";
			tableName: "documents";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp43<{
			name: "state";
			tableName: "documents";
			dataType: "string";
			columnType: "PgText";
			data: "deleted" | "failed" | "processing" | "ready" | "uploaded";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["uploaded", "processing", "ready", "failed", "deleted"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		contentHash: PgColumn_ffrhhp43<{
			name: "content_hash";
			tableName: "documents";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: Uint8Array<ArrayBufferLike>;
			driverParam: Uint8Array<ArrayBufferLike>;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		sizeBytes: PgColumn_ffrhhp43<{
			name: "size_bytes";
			tableName: "documents";
			dataType: "number";
			columnType: "PgBigInt53";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		declaredType: PgColumn_ffrhhp43<{
			name: "declared_type";
			tableName: "documents";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		detectedType: PgColumn_ffrhhp43<{
			name: "detected_type";
			tableName: "documents";
			dataType: "string";
			columnType: "PgText";
			data: "docx" | "md" | "pdf" | "pptx" | "txt";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["pdf", "docx", "pptx", "txt", "md"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		uploadedBy: PgColumn_ffrhhp43<{
			name: "uploaded_by";
			tableName: "documents";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		objectKey: PgColumn_ffrhhp43<{
			name: "object_key";
			tableName: "documents";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		failureReason: PgColumn_ffrhhp43<{
			name: "failure_reason";
			tableName: "documents";
			dataType: "string";
			columnType: "PgText";
			data: "no_text" | "password_protected" | "processing_failed" | "too_many_pages" | "unreadable";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["too_many_pages", "unreadable", "password_protected", "no_text", "processing_failed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		pageCount: PgColumn_ffrhhp43<{
			name: "page_count";
			tableName: "documents";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		epoch: PgColumn_ffrhhp43<{
			name: "epoch";
			tableName: "documents";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		deletionSeq: PgColumn_ffrhhp43<{
			name: "deletion_seq";
			tableName: "documents";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		vectorsRemovedSeq: PgColumn_ffrhhp43<{
			name: "vectors_removed_seq";
			tableName: "documents";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		deletedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "documents";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		deletedBy: PgColumn_ffrhhp43<{
			name: "deleted_by";
			tableName: "documents";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		purgeDueAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "documents";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		purgeStartedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "documents";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		purgeLeaseUntil: PgColumn_ffrhhp43<{
			name: string;
			tableName: "documents";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		purgeAttempts: PgColumn_ffrhhp43<{
			name: "purge_attempts";
			tableName: "documents";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		restoreBarredAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "documents";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "documents";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "documents";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* An Organization's document and byte counts, soft-deleted documents included, so a quota check
* reads one row. Written only by the `documents` triggers (SECURITY DEFINER), in the statement's
* own transaction, so it cannot drift from the table; the service role can only read it. A row
* stays, at zero, once an Organization has had a document.
*/
declare const organizationUsage: PgTableWithColumns_a5zn0g43<{
	name: "organization_usage";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp43<{
			name: "organization_id";
			tableName: "organization_usage";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		documentCount: PgColumn_ffrhhp43<{
			name: "document_count";
			tableName: "organization_usage";
			dataType: "number";
			columnType: "PgBigInt53";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		byteCount: PgColumn_ffrhhp43<{
			name: "byte_count";
			tableName: "organization_usage";
			dataType: "number";
			columnType: "PgBigInt53";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		dealCount: PgColumn_ffrhhp43<{
			name: "deal_count";
			tableName: "organization_usage";
			dataType: "number";
			columnType: "PgBigInt53";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		callCount: PgColumn_ffrhhp43<{
			name: "call_count";
			tableName: "organization_usage";
			dataType: "number";
			columnType: "PgBigInt53";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		recordingByteCount: PgColumn_ffrhhp43<{
			name: "recording_byte_count";
			tableName: "organization_usage";
			dataType: "number";
			columnType: "PgBigInt53";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "organization_usage";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* An ingestion job of one document: parse, chunk, embed, index. It is resumable and holds only
* what resuming needs: the next `step`, `attempts`, counts, and the object key of the parsed
* intermediate; no text. `next_attempt_at` is the due time while queued and the end of the lease
* while running, as in auth's abandon cases; `claim_token` fences a worker whose lease lapsed.
* `attempts` is bounded by the table ({@link INGESTION_JOB_MAX_ATTEMPTS}); a claim never takes a
* spent job and the give-up statement fails it. One active job per document
* (`ingestion_jobs_active_document_key`).
*/
declare const ingestionJobs: PgTableWithColumns_a5zn0g43<{
	name: "ingestion_jobs";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp43<{
			name: "id";
			tableName: "ingestion_jobs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp43<{
			name: "organization_id";
			tableName: "ingestion_jobs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		documentId: PgColumn_ffrhhp43<{
			name: "document_id";
			tableName: "ingestion_jobs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		epoch: PgColumn_ffrhhp43<{
			name: "epoch";
			tableName: "ingestion_jobs";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp43<{
			name: "state";
			tableName: "ingestion_jobs";
			dataType: "string";
			columnType: "PgText";
			data: "cancelled" | "failed" | "queued" | "running" | "succeeded";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["queued", "running", "succeeded", "failed", "cancelled"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		step: PgColumn_ffrhhp43<{
			name: "step";
			tableName: "ingestion_jobs";
			dataType: "string";
			columnType: "PgText";
			data: "chunk" | "embed" | "index" | "parse";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["parse", "chunk", "embed", "index"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		attempts: PgColumn_ffrhhp43<{
			name: "attempts";
			tableName: "ingestion_jobs";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		nextAttemptAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "ingestion_jobs";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		claimToken: PgColumn_ffrhhp43<{
			name: "claim_token";
			tableName: "ingestion_jobs";
			dataType: "string";
			columnType: "PgUUID";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		artifactKey: PgColumn_ffrhhp43<{
			name: "artifact_key";
			tableName: "ingestion_jobs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		pageCount: PgColumn_ffrhhp43<{
			name: "page_count";
			tableName: "ingestion_jobs";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		chunkCount: PgColumn_ffrhhp43<{
			name: "chunk_count";
			tableName: "ingestion_jobs";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		chunksDone: PgColumn_ffrhhp43<{
			name: "chunks_done";
			tableName: "ingestion_jobs";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		failureReason: PgColumn_ffrhhp43<{
			name: "failure_reason";
			tableName: "ingestion_jobs";
			dataType: "string";
			columnType: "PgText";
			data: "no_text" | "password_protected" | "processing_failed" | "too_many_pages" | "unreadable";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["too_many_pages", "unreadable", "password_protected", "no_text", "processing_failed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		finishedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "ingestion_jobs";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "ingestion_jobs";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "ingestion_jobs";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* An Organization's index settings: the embedding model and output dimension its vectors use
* (ADR 0010). Once `vectors_written_at` is set a trigger refuses any change of either, and the
* service role cannot delete the row: changing the model is a deliberate re-index, done by an
* operator, not a statement. Choice: refuse, rather than record that a re-index is needed.
*/
declare const indexSettings: PgTableWithColumns_a5zn0g43<{
	name: "index_settings";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp43<{
			name: "organization_id";
			tableName: "index_settings";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: true;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		embeddingModel: PgColumn_ffrhhp43<{
			name: "embedding_model";
			tableName: "index_settings";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		embeddingDimension: PgColumn_ffrhhp43<{
			name: "embedding_dimension";
			tableName: "index_settings";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		vectorsWrittenAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "index_settings";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "index_settings";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "index_settings";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g44 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp44 } from "drizzle-orm/pg-core";
/**
* The kinds of due work `playbook.organizations_with_work` finds: documents due for purge, ingestion
* jobs due or with a lapsed lease, deleted documents whose vector cleanup is not recorded, consumed
* messages old enough to purge, idempotency keys old enough to purge, documents whose purge
* reached the attempt bound, and Organizations with an upload attempt whose stored objects have not
* been swept for orphans (`orphan_sweep`, see `playbookOrphanSweeps`), and Deal imports to
* apply (`import_apply`, see `dealImports`). Calls add `call_jobs` (transcription, processing and
* rebuild jobs), `call_purge`, `call_cleanup`, `call_purge_spent` (the Call counterparts of the
* document kinds) and `outcome_retag` (a Deal whose Outcome changed and whose ready Calls are not
* all re-tagged).
*/
declare const WORK_KINDS: readonly ["purge_due", "jobs_due", "cleanup_pending", "consumed_purge", "idempotency_purge", "purge_spent", "orphan_sweep", "import_apply", "call_jobs", "call_purge", "call_cleanup", "call_purge_spent", "outcome_retag"];
/**
* One row per kind of work and Organization that may have work from `due_at` on: the registry the
* discovery function reads, because row-level security hides every tenant table from any role
* outside one Organization's scope. **Not a tenant table.** SECURITY DEFINER triggers on the
* tenant tables write it (an upsert that only moves `due_at` earlier); the discovery function
* verifies a due row against the tenant tables in that Organization's scope, then moves it to the
* next due time or removes it. A row is a hint, never the truth: it may be earlier than the real
* work or outlive it until the next verification, and is never later. No service role holds any
* privilege on it; the function and the triggers are the only way in. The all-zero global scope
* appears only for `consumed_purge`.
*/
declare const playbookWorkHints: PgTableWithColumns_a5zn0g44<{
	name: "work_hints";
	schema: "playbook";
	columns: {
		kind: PgColumn_ffrhhp44<{
			name: "kind";
			tableName: "work_hints";
			dataType: "string";
			columnType: "PgText";
			data: "call_cleanup" | "call_jobs" | "call_purge" | "call_purge_spent" | "cleanup_pending" | "consumed_purge" | "idempotency_purge" | "import_apply" | "jobs_due" | "orphan_sweep" | "outcome_retag" | "purge_due" | "purge_spent";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["purge_due", "jobs_due", "cleanup_pending", "consumed_purge", "idempotency_purge", "purge_spent", "orphan_sweep", "import_apply", "call_jobs", "call_purge", "call_cleanup", "call_purge_spent", "outcome_retag"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp44<{
			name: "organization_id";
			tableName: "work_hints";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		dueAt: PgColumn_ffrhhp44<{
			name: "due_at";
			tableName: "work_hints";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
import { PgSchema as PgSchema_mtt0uw4 } from "drizzle-orm/pg-core";
/** The `voice` Postgres schema, owned by the voice service (login role `closeline_voice`). */
declare const voiceSchema: PgSchema_mtt0uw4<"voice">;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g45 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp45 } from "drizzle-orm/pg-core";
/** The states of a Line. Mirrors the contract's `LINE_STATES`. */
declare const LINE_STATES: readonly ["porting", "active", "released"];
/** Who inbound Calls on a Line ring. Mirrors the `kind` of the contract's `lineAssignmentSchema`. */
declare const LINE_ASSIGNMENT_KINDS: readonly ["unassigned", "team", "rep"];
/** The longest Line label, in characters. Mirrors the contract's `MAX_LINE_LABEL_LENGTH`. */
declare const MAX_LINE_LABEL_LENGTH = 100;
/** The directions of a Call. Mirrors the contract's `VOICE_CALL_DIRECTIONS`. */
declare const VOICE_CALL_DIRECTIONS: readonly ["inbound", "outbound"];
/** The states of a Call. Mirrors the contract's `VOICE_CALL_STATES`. */
declare const VOICE_CALL_STATES: readonly ["ringing", "connecting", "disclosing", "live", "ended", "failed", "missed"];
/** The states a Call cannot leave. Mirrors the contract's `VOICE_CALL_FINAL_STATES`. */
declare const VOICE_CALL_FINAL_STATES: readonly ["ended", "failed", "missed"];
/** Why a Call ended `failed`. Mirrors the contract's `VOICE_CALL_FAILURE_REASONS`. */
declare const VOICE_CALL_FAILURE_REASONS: readonly ["disclosure_failed", "carrier_dropped", "carrier_rejected", "busy", "no_answer", "rep_unreachable", "provider_error", "timeout"];
/** Who ended a Call. Mirrors the contract's `VOICE_CALL_ENDED_BY`. */
declare const VOICE_CALL_ENDED_BY: readonly ["rep", "prospect", "system"];
/** The states of a Call's Transcript. Mirrors the contract's `VOICE_TRANSCRIPT_STATES`. */
declare const VOICE_TRANSCRIPT_STATES: readonly ["pending", "ready", "deleted"];
/** The longest a Call can last, in seconds. Mirrors the contract's `MAX_CALL_DURATION_SECONDS`. */
declare const MAX_CALL_DURATION_SECONDS = 43200;
/** The longest wrap-up note, in characters. Mirrors the contract's `MAX_WRAP_UP_NOTE_LENGTH`. */
declare const MAX_WRAP_UP_NOTE_LENGTH = 2e3;
/**
* The states a Recording row is in. A Call with no row has no Recording (the contract's `none`).
* Mirrors the contract's `VOICE_RECORDING_STATES` without `none`.
*/
declare const VOICE_RECORDING_STATES: readonly ["storing", "stored", "deleted"];
/** The longest storage key of a Recording, in characters. Mirrors the contract's `MAX_RECORDING_KEY_LENGTH`. */
declare const MAX_RECORDING_KEY_LENGTH = 512;
/** The audio channels of a Recording: one mixed, or two (Rep on channel 1, Prospect on channel 2). */
declare const VOICE_RECORDING_CHANNELS: readonly [1, 2];
/** The kinds of entry in a Call's event log. */
declare const VOICE_CALL_EVENT_KINDS: readonly ["state_changed", "disclosure_played", "recording_started", "recording_stored", "recording_deleted", "provider_callback"];
/** The longest provider event id, in characters. */
declare const MAX_PROVIDER_EVENT_ID_LENGTH = 200;
/** The longest idempotency key, in characters. Mirrors the contract's `idempotencyKeySchema`. */
declare const MAX_VOICE_IDEMPOTENCY_KEY_LENGTH = 255;
/**
* A Line: a phone number an Organization uses to place and receive Calls. `number` is E.164 and
* tenant data (never logged). A number is live in at most one Organization at a time
* (`lines_number_live_key`, over every state but `released`). Assignment is one of three shapes,
* tied by a check: nobody (both ids null), a Team (`assignment_team_id`) or a Rep
* (`assignment_membership_id`); a released Line is unassigned and has its release time.
* `provider_sid` is the telephony provider's id for the number.
*
* Lists served (keyset `(created_at, id)` newest first, `LIMIT` a page): all Lines
* (`lines_list_idx`), one state (`lines_state_list_idx`); the Lines of a Team or a Rep
* (`lines_team_idx`, `lines_rep_idx`).
*/
declare const voiceLines: PgTableWithColumns_a5zn0g45<{
	name: "lines";
	schema: "voice";
	columns: {
		id: PgColumn_ffrhhp45<{
			name: "id";
			tableName: "lines";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp45<{
			name: "organization_id";
			tableName: "lines";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		number: PgColumn_ffrhhp45<{
			name: "number";
			tableName: "lines";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		country: PgColumn_ffrhhp45<{
			name: "country";
			tableName: "lines";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		label: PgColumn_ffrhhp45<{
			name: "label";
			tableName: "lines";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp45<{
			name: "state";
			tableName: "lines";
			dataType: "string";
			columnType: "PgText";
			data: "active" | "porting" | "released";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["porting", "active", "released"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		assignmentKind: PgColumn_ffrhhp45<{
			name: "assignment_kind";
			tableName: "lines";
			dataType: "string";
			columnType: "PgText";
			data: "rep" | "team" | "unassigned";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["unassigned", "team", "rep"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		assignmentTeamId: PgColumn_ffrhhp45<{
			name: "assignment_team_id";
			tableName: "lines";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		assignmentMembershipId: PgColumn_ffrhhp45<{
			name: "assignment_membership_id";
			tableName: "lines";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		providerSid: PgColumn_ffrhhp45<{
			name: "provider_sid";
			tableName: "lines";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp45<{
			name: string;
			tableName: "lines";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		releasedAt: PgColumn_ffrhhp45<{
			name: string;
			tableName: "lines";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* A Call placed or taken in the Softphone. `prospect_number` is E.164 and tenant data (never
* logged); `rep_membership_id` is null on a missed inbound Call nobody answered. The checks are the
* contract's state machine: a `live` or `ended` Call has played its Disclosure (wording version
* and time are both set or both null), `failed` has a reason and nothing else does,
* `disclosure_failed` is only for a Disclosure that did not play, a final state has an end time,
* `live` and `ended` have an answer time, only `ended` has a duration and a wrap-up (`deal_id`,
* `note`), and times never run backwards. `transcript_state` is `pending` until a Transcript
* exists. `idempotency_key` and `request_fingerprint` (both or neither) record how an outbound
* Call was placed: one key, one Call, per Organization.
*
* Lists served (keyset `(created_at, id)` newest first, `LIMIT` a page, always one Organization):
* all Calls (`calls_list_idx`); of one Rep, which is how a Team's Calls are read, `rep_membership_id
* = any($ids)` (`calls_rep_list_idx`); one state, such as the missed inbound Calls
* (`calls_state_list_idx`); of one Prospect (`calls_prospect_list_idx`); of one Line
* (`calls_line_list_idx`, also the foreign key's index). A direction or time-range filter is
* applied to the rows one of those reads.
*/
declare const voiceCalls: PgTableWithColumns_a5zn0g45<{
	name: "calls";
	schema: "voice";
	columns: {
		id: PgColumn_ffrhhp45<{
			name: "id";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp45<{
			name: "organization_id";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		direction: PgColumn_ffrhhp45<{
			name: "direction";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: "inbound" | "outbound";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["inbound", "outbound"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp45<{
			name: "state";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: "connecting" | "disclosing" | "ended" | "failed" | "live" | "missed" | "ringing";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["ringing", "connecting", "disclosing", "live", "ended", "failed", "missed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lineId: PgColumn_ffrhhp45<{
			name: "line_id";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		repMembershipId: PgColumn_ffrhhp45<{
			name: "rep_membership_id";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		prospectId: PgColumn_ffrhhp45<{
			name: "prospect_id";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		prospectNumber: PgColumn_ffrhhp45<{
			name: "prospect_number";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		providerCallSid: PgColumn_ffrhhp45<{
			name: "provider_call_sid";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		idempotencyKey: PgColumn_ffrhhp45<{
			name: "idempotency_key";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		requestFingerprint: PgColumn_ffrhhp45<{
			name: "request_fingerprint";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		disclosureWordingVersion: PgColumn_ffrhhp45<{
			name: "disclosure_wording_version";
			tableName: "calls";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		disclosurePlayedAt: PgColumn_ffrhhp45<{
			name: string;
			tableName: "calls";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		aiAssisted: PgColumn_ffrhhp45<{
			name: "ai_assisted";
			tableName: "calls";
			dataType: "boolean";
			columnType: "PgBoolean";
			data: boolean;
			driverParam: boolean;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp45<{
			name: string;
			tableName: "calls";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		answeredAt: PgColumn_ffrhhp45<{
			name: string;
			tableName: "calls";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		endedAt: PgColumn_ffrhhp45<{
			name: string;
			tableName: "calls";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		durationSeconds: PgColumn_ffrhhp45<{
			name: "duration_seconds";
			tableName: "calls";
			dataType: "number";
			columnType: "PgInteger";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		endedBy: PgColumn_ffrhhp45<{
			name: "ended_by";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: "prospect" | "rep" | "system";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["rep", "prospect", "system"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		failureReason: PgColumn_ffrhhp45<{
			name: "failure_reason";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: "busy" | "carrier_dropped" | "carrier_rejected" | "disclosure_failed" | "no_answer" | "provider_error" | "rep_unreachable" | "timeout";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["disclosure_failed", "carrier_dropped", "carrier_rejected", "busy", "no_answer", "rep_unreachable", "provider_error", "timeout"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		dealId: PgColumn_ffrhhp45<{
			name: "deal_id";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		note: PgColumn_ffrhhp45<{
			name: "note";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		transcriptState: PgColumn_ffrhhp45<{
			name: "transcript_state";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: "deleted" | "pending" | "ready";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["pending", "ready", "deleted"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp45<{
			name: string;
			tableName: "calls";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* One entry of a Call's append-only event log: a state change, the Disclosure played, a Recording
* step, or a provider callback. It is also the idempotency record for webhooks:
* `call_events_provider_event_key` is unique over `(organization_id, provider_event_id)`, so a
* redelivered webhook inserts nothing (`on conflict (organization_id, provider_event_id) do
* nothing`); entries the service makes itself have no provider event id (null, and nulls never
* conflict). `seq` orders the log. The service role may insert and delete (erasure, retention) but
* holds no UPDATE: an entry never changes. A `state_changed` entry carries the new state
* (`to_state`) and the one it left (`from_state`, null for the first); no other kind does.
* Holds no number, name or Transcript text.
*
* Lists served: one Call's log in order, `WHERE organization_id = $1 AND call_id = $2 ORDER BY
* seq` (`call_events_call_idx`).
*/
declare const voiceCallEvents: PgTableWithColumns_a5zn0g45<{
	name: "call_events";
	schema: "voice";
	columns: {
		id: PgColumn_ffrhhp45<{
			name: "id";
			tableName: "call_events";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp45<{
			name: "organization_id";
			tableName: "call_events";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		seq: PgColumn_ffrhhp45<{
			name: "seq";
			tableName: "call_events";
			dataType: "number";
			columnType: "PgBigInt53";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: "always";
			generated: undefined;
		}, {}, {}>;
		callId: PgColumn_ffrhhp45<{
			name: "call_id";
			tableName: "call_events";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		kind: PgColumn_ffrhhp45<{
			name: "kind";
			tableName: "call_events";
			dataType: "string";
			columnType: "PgText";
			data: "disclosure_played" | "provider_callback" | "recording_deleted" | "recording_started" | "recording_stored" | "state_changed";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["state_changed", "disclosure_played", "recording_started", "recording_stored", "recording_deleted", "provider_callback"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		fromState: PgColumn_ffrhhp45<{
			name: "from_state";
			tableName: "call_events";
			dataType: "string";
			columnType: "PgText";
			data: "connecting" | "disclosing" | "ended" | "failed" | "live" | "missed" | "ringing";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["ringing", "connecting", "disclosing", "live", "ended", "failed", "missed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		toState: PgColumn_ffrhhp45<{
			name: "to_state";
			tableName: "call_events";
			dataType: "string";
			columnType: "PgText";
			data: "connecting" | "disclosing" | "ended" | "failed" | "live" | "missed" | "ringing";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["ringing", "connecting", "disclosing", "live", "ended", "failed", "missed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		providerEventId: PgColumn_ffrhhp45<{
			name: "provider_event_id";
			tableName: "call_events";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		occurredAt: PgColumn_ffrhhp45<{
			name: string;
			tableName: "call_events";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		recordedAt: PgColumn_ffrhhp45<{
			name: string;
			tableName: "call_events";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/**
* The reference to a Call's Recording: the audio is in the Region's object storage under
* `storage_key`, never in the database. At most one per Call (`recordings_call_key`). It is
* `storing` while copied from the provider, `stored` once playable (`size_bytes`, `stored_at`
* set), and `deleted` after an Admin deleted it (`deleted_at` set); `purge_due_at`, only on a
* deleted row, is when the object is removed from storage. `channels` is 1 or 2 (two: the Rep and
* the Prospect separately). A Call with no row has no Recording.
*
* Lookups served: by Call (`recordings_call_key`); by storage key (`recordings_storage_key_key`);
* deleted Recordings due for purge, oldest first (`recordings_purge_idx`).
*/
declare const voiceRecordings: PgTableWithColumns_a5zn0g45<{
	name: "recordings";
	schema: "voice";
	columns: {
		id: PgColumn_ffrhhp45<{
			name: "id";
			tableName: "recordings";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp45<{
			name: "organization_id";
			tableName: "recordings";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		callId: PgColumn_ffrhhp45<{
			name: "call_id";
			tableName: "recordings";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		storageKey: PgColumn_ffrhhp45<{
			name: "storage_key";
			tableName: "recordings";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sizeBytes: PgColumn_ffrhhp45<{
			name: "size_bytes";
			tableName: "recordings";
			dataType: "number";
			columnType: "PgBigInt53";
			data: number;
			driverParam: string | number;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		channels: PgColumn_ffrhhp45<{
			name: "channels";
			tableName: "recordings";
			dataType: "number";
			columnType: "PgSmallInt";
			data: number;
			driverParam: string | number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp45<{
			name: "state";
			tableName: "recordings";
			dataType: "string";
			columnType: "PgText";
			data: "deleted" | "stored" | "storing";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["storing", "stored", "deleted"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp45<{
			name: string;
			tableName: "recordings";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		storedAt: PgColumn_ffrhhp45<{
			name: string;
			tableName: "recordings";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		deletedAt: PgColumn_ffrhhp45<{
			name: string;
			tableName: "recordings";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		purgeDueAt: PgColumn_ffrhhp45<{
			name: string;
			tableName: "recordings";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp45<{
			name: string;
			tableName: "recordings";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
	};
	dialect: "pg";
}>;
/** The Drizzle schema object: every Postgres schema the services own. */
type Schema = typeof exports_schema;
/** A Drizzle database over a node-postgres pool. */
type Database = NodePgDatabase<Schema>;
/** The handle `withOrganization` passes to its callback: a transaction on one pooled connection. */
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Pool settings for {@link createDb}; every field has a bounded default. */
interface DbOptions {
	/** Most connections the pool opens, 1 to 100. */
	max?: number;
	/** Longest a single statement may run before Postgres cancels it, in milliseconds. */
	statementTimeoutMs?: number;
	/** Longest to wait for a connection (new or from the pool) before failing, in milliseconds. */
	connectionTimeoutMs?: number;
	/** Longest `close` waits for in-flight work before giving up, in milliseconds. */
	closeTimeoutMs?: number;
	/**
	* Called with an error on any pooled connection, idle or checked out (a server restart, a
	* failover, an idle-in-transaction timeout). Without a listener such an error would crash the
	* process. The default writes one line to stderr with the error code or name, never the message.
	* If it throws, the exception is swallowed and that same line is written instead.
	*/
	onError?: (error: Error) => void;
}
/** The defaults {@link createDb} uses for any option left out. */
declare const DEFAULT_POOL_OPTIONS: {
	readonly max: 10;
	readonly statementTimeoutMs: 30000;
	readonly connectionTimeoutMs: 5000;
	readonly closeTimeoutMs: 10000;
};
/**
* The default `onError`: one line on stderr naming only the error code (or, without one, its
* name). The message is left out because a driver message can carry connection details.
*/
declare function reportConnectionError(error: Error): void;
/** A database handle plus the function that releases its connections. */
interface DbHandle {
	/** The Drizzle database. Reach tenant tables only through `withOrganization`. */
	db: Database;
	/**
	* Waits for in-flight queries, then closes every pooled connection. Safe to call more than
	* once. Rejects if work is still in flight after `closeTimeoutMs`, after asking the remaining
	* connections to end, so a hung transaction cannot hold shutdown.
	*/
	close: () => Promise<void>;
}
/**
* Connect to Postgres with a bounded node-postgres pool, a statement timeout and a connection
* timeout. Connect as a service role (for example `closeline_core`), never as the owner.
*
* @param connectionString - Postgres connection string of the service's own login role.
* @param options - Pool size and timeouts; see {@link DEFAULT_POOL_OPTIONS}.
* @returns The Drizzle database and a `close` function for graceful shutdown.
* @throws If the connection string is empty or an option is out of bounds.
*/
declare function createDb(connectionString: string, options?: DbOptions): DbHandle;
/** The most notices one claim returns; the database caps a larger limit to this. */
declare const DEMO_NOTICE_CLAIM_MAX = 100;
/** The most Demo Requests one purge deletes; the database caps a larger limit to this. */
declare const DEMO_PURGE_BATCH_MAX = 1e3;
/** The most rate counters one purge deletes; the database caps a larger limit to this. */
declare const DEMO_RATE_PURGE_BATCH_MAX = 1e3;
/** What a Visitor submitted, as `core.submit_demo_request` takes it; the service has validated it. */
interface DemoRequestInput {
	/** The new id: `dreq_` and 32 lowercase hex characters. */
	id: string;
	/** The Visitor's name. */
	name: string;
	/** The work email, already lower-cased. */
	workEmail: string;
	/** The Visitor's company name. */
	companyName: string;
	/** An optional message. */
	message: string | null;
	/** The page the form was on, starting with `/`. */
	sourcePage: string;
	/** The Visitor's idempotency key, 16 to 128 characters. */
	idempotencyKey: string;
}
/** The answer of `core.submit_demo_request`. */
interface DemoRequestSubmission {
	/** The id of the stored Demo Request: the submitted one, or the first one with this key. */
	id: string;
	/** True when the idempotency key had been used before, so nothing new was stored. */
	replayed: boolean;
	/** False when the key was reused with different fields; always true for a first submission. */
	sameFields: boolean;
}
/** A Demo Request whose notice a worker has claimed, as `core.claim_demo_notices` returns it. */
interface ClaimedDemoNotice {
	/** The Demo Request id. */
	id: string;
	/** The Visitor's name. */
	name: string;
	/** The work email. */
	workEmail: string;
	/** The company name. */
	companyName: string;
	/** The message, if any. */
	message: string | null;
	/** The page the form was on. */
	sourcePage: string;
	/** When it was submitted. */
	submittedAt: Date;
	/** The attempt this claim made, counting it (1 on the first). */
	attempts: number;
}
/** What one request counts against: the hashed address, the window length and the most allowed. */
interface DemoRateLimitHit {
	/** An HMAC-SHA256 of the address: exactly 32 bytes. A raw address is never sent. */
	addressHash: Uint8Array;
	/** The window length in seconds, 1 to 86400. Windows are aligned to this length. */
	windowSeconds: number;
	/** The most requests allowed per window, at least 1. */
	limit: number;
}
/** The state a notice settles in. */
type SettledDemoNoticeStatus = Exclude<(typeof DEMO_NOTIFICATION_STATUSES)[number], "pending">;
/**
* The database refused a Demo Request. It keeps only the SQLSTATE `code` and the `constraint`
* name: the driver's own error holds the submitted name, email and message in its text, so it is
* deliberately not kept as a `cause`.
*/
declare class DemoRequestRefusedError extends Error {
	/** The Postgres SQLSTATE, such as `23514` for a failed check, when the driver gave one. */
	readonly code: string | undefined;
	/** The constraint that refused the row, when the driver named one. */
	readonly constraint: string | undefined;
	/** Build the error from whatever the driver threw, copying only the code and constraint. */
	constructor(thrown: unknown);
}
/**
* Store a Demo Request, or find the one already stored under the same idempotency key. It calls
* `core.submit_demo_request`, the only way `closeline_core` writes `core.demo_request`. Run it on
* the pooled handle: the table has no Organization.
*
* @param db - A database handle connected as `closeline_core`.
* @param input - The validated submission.
* @returns The stored id, whether the key was a replay, and whether the fields matched the stored ones.
* @throws If `input.id` is malformed (before any query runs); {@link DemoRequestRefusedError} (code and
* constraint only, never the submitted values) if the database refuses a field.
*/
declare function submitDemoRequest(db: Pick<Database, "execute">, input: DemoRequestInput): Promise<DemoRequestSubmission>;
/**
* Claim a batch of pending notices to send: oldest first, none tried in the last `backoffSeconds`,
* each counted as an attempt. Delivery is at least once: a worker that dies after a claim is retried
* once the backoff passes, so the caller caps attempts itself (settle `failed` past its limit). Two concurrent claims never return the same row. It calls
* `core.claim_demo_notices`.
*
* @param db - A database handle connected as `closeline_core`.
* @param limit - The most to claim, at least 1; the database caps it at {@link DEMO_NOTICE_CLAIM_MAX}.
* @param backoffSeconds - A row last tried less than this many seconds ago is skipped (0 or more).
* @returns The claimed notices, oldest first (to the millisecond; ties by id).
* @throws If a number is not a whole number in range (before any query runs).
*/
declare function claimDemoNotices(db: Pick<Database, "execute">, limit: number, backoffSeconds: number): Promise<ClaimedDemoNotice[]>;
/**
* Settle a pending notice as `sent` or `failed`. It calls `core.settle_demo_notice`.
*
* @param db - A database handle connected as `closeline_core`.
* @param id - The Demo Request id.
* @param status - `sent` or `failed`.
* @returns True when the notice was pending and is now settled; false when unknown or already settled.
* @throws If `id` or `status` is malformed (before any query runs).
*/
declare function settleDemoNotice(db: Pick<Database, "execute">, id: string, status: SettledDemoNoticeStatus): Promise<boolean>;
/**
* Delete Demo Requests submitted more than twelve months ago, oldest first, in one bounded batch.
* Repeat until it returns less than `limit`. It calls `core.purge_demo_requests`.
*
* @param db - A database handle connected as `closeline_core`.
* @param limit - The most to delete, at least 1; the database caps it at {@link DEMO_PURGE_BATCH_MAX}.
* @returns How many were deleted.
* @throws If `limit` is not a positive whole number (before any query runs).
*/
declare function purgeDemoRequests(db: Pick<Database, "execute">, limit: number): Promise<number>;
/**
* Count one request against an address and say whether it is within the limit. The count is one
* atomic upsert in `core.hit_demo_rate_limit`, so concurrent calls never let more than `limit`
* through; a request over the limit still counts. The window is the fixed one, aligned to
* `windowSeconds`, that contains now. Run it on the pooled handle: the table has no Organization.
*
* @param db - A database handle connected as `closeline_core`.
* @param hit - The hashed address, the window length and the limit.
* @returns True while the window's count is at most `limit`; false once it is over.
* @throws If the hash is not 32 bytes, or a number is not a whole number in range (before any query runs).
*/
declare function hitDemoRateLimit(db: Pick<Database, "execute">, hit: DemoRateLimitHit): Promise<boolean>;
/**
* Delete rate counters whose window started more than a day ago, oldest first, in one bounded
* batch. Repeat until it returns less than `limit`. It calls `core.purge_demo_rate_counters`.
*
* @param db - A database handle connected as `closeline_core`.
* @param limit - The most to delete, at least 1; the database caps it at {@link DEMO_RATE_PURGE_BATCH_MAX}.
* @returns How many were deleted.
* @throws If `limit` is not a positive whole number (before any query runs).
*/
declare function purgeDemoRateCounters(db: Pick<Database, "execute">, limit: number): Promise<number>;
/** The state an Organization is in, as `core.organizations.status` stores it. */
type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];
/** The Organization a user belongs to, as `core.organization_of_user` answers. */
interface OrganizationOfUser {
	/** The Organization the user belongs to (`org_` and 32 hex characters). */
	organizationId: string;
	/** The Organization's status; a sign-in refuses everything but `active`. */
	status: OrganizationStatus;
}
/** The pending invitation a token hash opens, as `core.invitation_for_token` answers. */
interface InvitationForToken {
	/** The Organization that issued the invitation. */
	organizationId: string;
	/** The invitation to read, inside that Organization's scope. */
	invitationId: string;
}
/**
* Find the Organization a user belongs to: the question sign-in asks before any Organization is
* known. It calls `core.organization_of_user`, the only way `closeline_core` reaches the
* membership directory. Run it on the pooled handle, not inside `withOrganization`; then read the
* membership itself inside `withOrganization` for the Organization it names.
*
* @param db - A database handle connected as `closeline_core`.
* @param userId - The user's opaque id: `usr_` and 32 lowercase hex characters.
* @returns The Organization and its status, or `null` when the user belongs to none.
* @throws If `userId` is malformed (before any query runs), or if the directory holds more than
*   one Organization for the user (the one-Organization rule was relaxed without updating this).
*/
declare function organizationOfUser(db: Pick<Database, "execute">, userId: string): Promise<OrganizationOfUser | null>;
/**
* Find the invitation a token hash opens: the question accepting an invitation asks before any
* Organization is known. It calls `core.invitation_for_token`, the only way `closeline_core`
* reaches the invitation directory. The database answers only for an invitation that is still
* pending and unexpired in an `active` Organization, so a used, revoked or expired token, an
* unknown one and one of a suspended or deleted Organization all give `null` and cannot be told
* apart. Then accept inside `withOrganization`: update the invitation and create the membership
* in one transaction.
*
* @param db - A database handle connected as `closeline_core`.
* @param tokenHash - The SHA-256 of the token: 64 lowercase hex characters, never the token.
* @returns The Organization and invitation ids, or `null`.
* @throws If `tokenHash` is malformed (before any query runs).
*/
declare function invitationForToken(db: Pick<Database, "execute">, tokenHash: string): Promise<InvitationForToken | null>;
/**
* The transaction-local setting the `auth` schema's row-level-security policies compare
* `environment_id` against. It is tula-auth's, kept so the service copied from it runs unchanged;
* it is not {@link ORGANIZATION_SETTING}: an auth environment is not an Organization.
*/
declare const ENVIRONMENT_SETTING = "tula.environment_id";
/**
* The policy expression of the `auth` tables as Postgres stores and prints it in `pg_policies`
* (parenthesised, `::text` casts, the `::uuid` cast on the setting). It is the one place this
* text is derived: the tenant isolation check compares every environment-scoped table's policy
* against it, and an integration test pins it against the live catalog, so a Postgres version
* that deparses differently fails loudly instead of passing or failing every table.
*/
declare const ENVIRONMENT_POLICY_EXPRESSION = "(environment_id = (NULLIF(current_setting('tula.environment_id'::text, true), ''::text))::uuid)";
/**
* Run `fn` in a transaction scoped to one auth environment.
*
* Sets {@link ENVIRONMENT_SETTING} for this transaction only (`set_config(..., true)`), so every
* query on the handle sees and writes only that environment's `auth` rows. The setting ends with
* the transaction and cannot leak to the next user of the pooled connection. Pass the root
* database from `createDb`, not a transaction, and run every `auth` query on the handle `fn`
* receives: a query on `db` itself sees no environment rows.
*
* @param db - The database from `createDb`.
* @param environmentId - The environment id (a UUID).
* @param fn - Work to run inside the scoped transaction.
* @returns Whatever `fn` returns.
* @throws If `environmentId` is not a UUID (before any query runs), or whatever `fn` throws (the
*   transaction rolls back).
*/
declare function withEnvironment<T>(db: Database, environmentId: string, fn: (tx: Transaction) => Promise<T>): Promise<T>;
/**
* The Postgres schemas owned by services; every relation in them must be tenant-isolated. A
* relation in any other schema (bar `public` and drizzle's own) is itself a gap, and a unit test
* keeps this list equal to the schemas exported from `src/schema`.
*/
declare const TENANT_SCHEMAS: readonly ["auth", "core", "playbook", "voice"];
/**
* The `auth` tables scoped to an auth environment, as `schema.table`. Each has no `organization_id`
* (users are global within a Region, ADR 0005) and is instead bound by its own forced row-level
* security: exactly one permissive policy, for all commands, with {@link ENVIRONMENT_POLICY_EXPRESSION}
* as both its USING and WITH CHECK. A restrictive policy may be added to it, never a second
* permissive one. {@link findTenantIsolationGaps} verifies every one against the live catalog.
*/
declare const ENVIRONMENT_SCOPED_TABLES: readonly string[];
/**
* The `auth` control-plane tables, as `schema.table`, each with the one-line reason it is not
* under environment row-level security. They sit above or beside the environments, so the
* environment cannot scope them; they still must not carry an `organization_id`
* ({@link findTenantIsolationGaps} checks that). Their reach is held down by the service role's
* grants (the `auth` integration suite pins them), not by a policy.
*/
declare const CONTROL_PLANE_TABLE_REASONS: Readonly<Record<string, string>>;
/** The `schema.table` names of {@link CONTROL_PLANE_TABLE_REASONS}. */
declare const CONTROL_PLANE_TABLES: readonly string[];
/**
* Tables exempt from the Organization check by explicit entry, as `schema.table`, each with the
* one-line reason. The `auth` tables, which have no `organization_id`, are verified under
* {@link ENVIRONMENT_SCOPED_TABLES} and {@link CONTROL_PLANE_TABLES} instead of being skipped. The
* only entries are the two `core` directories, the Organization status table and the playbook work
* registry, which are asked before an Organization is known. An entry here needs a decision record in the hub. An exempt
* table is under no row-level security, so {@link findTenantIsolationGaps} also reports it as a
* gap when any `closeline_*` service role (or PUBLIC) holds any privilege on it (SELECT, INSERT,
* UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER or MAINTAIN), at table or column level: a read leaks every
* Organization, and a write could forge a user-to-Organization mapping or free a user. It may be
* reached only through a `SECURITY DEFINER` function.
*/
declare const NON_TENANT_TABLE_REASONS: Readonly<Record<string, string>>;
/** The `schema.table` names exempt from the Organization check: the keys of {@link NON_TENANT_TABLE_REASONS}. */
declare const NON_TENANT_TABLES: readonly string[];
/**
* One thing that does not fail closed on `organization_id`, and why. A login role that bypasses
* row-level security is reported with `schema` set to `pg_roles` and `table` set to the role name.
*/
interface TenantIsolationGap {
	/** The Postgres schema. */
	schema: string;
	/** The table (or view) name. */
	table: string;
	/** What is missing, in one sentence. */
	reason: string;
}
/**
* The two named groups of `auth` tables, which {@link findTenantIsolationGaps} verifies instead of
* skipping. Defaults to {@link ENVIRONMENT_SCOPED_TABLES} and {@link CONTROL_PLANE_TABLES}.
*/
interface AuthTableCategories {
	/** `schema.table` names that must be fail-closed on `environment_id`. */
	environmentScoped: readonly string[];
	/** `schema.table` names that must have no `organization_id`. */
	controlPlane: readonly string[];
}
/**
* Find everything that stops the database failing closed.
*
* Every relation in every schema except drizzle's own, Postgres's and any {@link EXTENSION_SCHEMAS} is
* checked, `public` included: nothing belongs there, so any table, view or foreign table in it is a gap. Any
* relation that is not a table (a view, a materialized view, a foreign table) is a gap, because it
* bypasses row-level security. A table in a {@link TENANT_SCHEMAS} schema then passes one of three ways:
*
* - It is in {@link ENVIRONMENT_SCOPED_TABLES}: no `organization_id`, row-level security enabled
*   and forced, and exactly one permissive policy, for all commands, whose USING and WITH CHECK
*   are both {@link ENVIRONMENT_POLICY_EXPRESSION}. Restrictive policies may be added.
* - It is in {@link CONTROL_PLANE_TABLES}: no `organization_id`.
* - Otherwise, a table in `auth` is a gap (it is in neither category), and any other table must
*   have an `organization_id` column, row-level security enabled and forced, and at least one
*   permissive policy, where every permissive policy covers all commands and has exactly the
*   USING and WITH CHECK expression `tenantRlsStatements` writes (any weaker or wider one could
*   open the table across Organizations).
*
* Tables on `allowlist` are skipped, except that one on which any `closeline_*` role other than
* the owner holds a `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` or
* `MAINTAIN` privilege (the check counts column grants and grants to PUBLIC) is a gap: with no row-level
* security a read would show every Organization's rows, and a write could forge or erase the
* mapping the lookups rest on. A `closeline_*` role
* that is a superuser or has `BYPASSRLS` is a gap too, because it ignores every policy.
*
* @param db - A database handle connected as any role; the catalogs are readable by all.
* @param allowlist - `schema.table` names exempt from the check; defaults to {@link NON_TENANT_TABLES}.
* @param extensionSchemas - Schemas owned by extensions, skipped; defaults to {@link EXTENSION_SCHEMAS}.
* @param categories - The `auth` table categories; defaults to the exported lists.
* @returns The offending relations, ordered by schema and name, then the offending roles; empty
*   when all are protected.
*/
declare function findTenantIsolationGaps(db: Pick<Database, "execute">, allowlist?: readonly string[], extensionSchemas?: readonly string[], categories?: AuthTableCategories): Promise<TenantIsolationGap[]>;
/**
* Throw unless {@link findTenantIsolationGaps} finds nothing: every table fail-closed, no role bypassing it.
*
* @param db - A database handle; see {@link findTenantIsolationGaps}.
* @param allowlist - `schema.table` names exempt from the check.
* @throws An error naming each offending table or role and why.
*/
declare function assertTenantIsolation(db: Pick<Database, "execute">, allowlist?: readonly string[]): Promise<void>;
import { types } from "pg";
/**
* node-postgres type parsers for a pool: a `date` stays the text Postgres sends (`YYYY-MM-DD`)
* instead of becoming a JavaScript `Date` at local midnight, which shifts a calendar date by a day
* in a process whose time zone is behind UTC. Every other type keeps the driver's own parser.
* `createDb` passes it; a pool made by hand for these statements should too (`new Pool({ types })`).
*/
declare const DB_TYPES: {
	getTypeParser: typeof types.getTypeParser;
};
/**
* The names of the columns of a Call answer, in order: the contract's `Call` fields (the Rep as
* `rep_by`, `rep_label` and `rep_channel`; `rep` is null exactly when `rep_by` is) plus `rep_seq`,
* `epoch` and `deletion_seq` for the messages and `not_restorable` for the 410. `in_search` and
* `deal_outcome` come from the Deal in the same query: `in_search` is true only for a `ready` Call
* of a `won` Deal whose tag is current (`tagged_outcome_seq >= outcome_seq`), so it is false while
* a Rep rebuild is pending (the Call is `processing`) and while an Outcome re-tag is pending.
* The list statements add `cursor_at`.
*/
declare const CALL_ROW_FIELDS: readonly ["id", "deal_record_id", "deal_id", "deal_outcome", "in_search", "kind", "file_name", "media_type", "size_bytes", "duration_seconds", "state", "failure_reason", "rep_by", "rep_label", "rep_channel", "speaker_labels", "deleted_at", "purge_due_at", "uploaded_by", "created_at", "updated_at", "rep_seq", "epoch", "deletion_seq", "not_restorable"];
/**
* The Organization's Call and Recording-byte counts, from the counter row the `calls` triggers keep.
* `$1` Organization. A Call in any state counts until it is purged or erased, `deleted` and
* `awaiting_rep` included; Recording bytes count Recordings only. No row means nothing was ever
* added. node-postgres returns the bigints as strings.
*/
declare const CALL_USAGE2 = "select call_count, recording_byte_count\nfrom playbook.organization_usage\nwhere organization_id = $1";
/**
* Add a Call and queue its first job in one write. **Order of the upload transaction:**
* `IDEMPOTENCY_BEGIN` first, then `QUOTA_LOCK`, then this (the `calls_require_lock` and
* `deals_require_lock` triggers refuse an insert without the lock). `$1` Organization, `$2` the new
* `call_…` id, `$3` the customer's deal id (trimmed by the caller), `$4` an id for the Deal if it
* must be created (`deal_…`), `$5` file name, `$6` media type, `$7` kind (`transcript` or
* `recording`), `$8` size in bytes, `$9` SHA-256 of the content (32 bytes), `$10` uploader, `$11`
* object key, `$12` to `$14` the Rep choice (`by`, `label`, `channel`; all null for a Recording that
* will wait in `awaiting_rep`), `$15` the new job's `cjob_…` id, `$16` the most Calls, `$17` the most
* Recording bytes in total and `$18` the most Deals the Organization may hold after this one, `$19`
* the service's **current rights wording version**.
*
* One row, whose `result` says what happened, decided in this order and in one statement (so the
* rights check, the duplicate check, the quota and the insert see one snapshot under the upload
* lock): `rights_required` (no confirmation at exactly that version: nothing else is read or
* written); `existing` (the same content is already stored under **this** Deal: the row carries
* that Call's `id`, `state` and `failure_reason`; restore it with {@link CALL_RESTORE_FOR_UPLOAD} if
* `deleted`, {@link CALL_REQUEUE} it if `failed`, else answer with it as it is); `other_deal` (the
* same content under another Deal: refuse, saying nothing of which); `quota_exceeded`; `created`
* (the Call is `uploaded` with a queued `transcribe` job for a Recording or `process` job for a
* Transcript, and an unknown deal id has created an open Deal). The hash is unique per Organization
* among Calls whose purge has not started and that erasure has not barred from restore.
*/
declare const CALL_INSERT2 = "with rights as (\\n  select exists (select 1 from playbook.rights_confirmations\\n                 where organization_id = $1 and wording_version = $19::int) as ok),\\ndup as (\\n  select c.id, c.state, c.failure_reason, (d.deal_id = $3::text) as same_deal\\n  from playbook.calls c join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id\\n  where c.organization_id = $1 and c.content_hash = $9::bytea\\n    and c.purge_started_at is null and c.restore_barred_at is null),\\ndeal as (\\n  select id from playbook.deals where organization_id = $1 and deal_id = $3::text),\\nusage as (\\n  select call_count, recording_byte_count, deal_count from playbook.organization_usage where organization_id = $1),\\ngate as (\\n  select (select ok from rights) as rights_ok,\\n    not exists (select 1 from dup) as no_dup,\\n    (coalesce((select call_count from usage), 0) < $16::bigint\\n      and ($7::text <> 'recording' or coalesce((select recording_byte_count from usage), 0) + $8::bigint <= $17::bigint)\\n      and (exists (select 1 from deal) or coalesce((select deal_count from usage), 0) < $18::bigint)) as quota_ok),\\ngo as (\\n  select 1 as one from gate where rights_ok and no_dup and quota_ok),\\nmade as (\\n  insert into playbook.deals (id, organization_id, deal_id)\\n  select $4::text, $1, $3::text from go where not exists (select 1 from deal)\\n  returning id),\\nins as (\\n  insert into playbook.calls\\n    (id, organization_id, deal_record_id, kind, file_name, media_type, size_bytes, content_hash,\\n     uploaded_by, object_key, rep_by, rep_label, rep_channel)\\n  select $2::text, $1, coalesce((select id from deal), (select id from made)), $7::text, $5::text, $6::text,\\n    $8::bigint, $9::bytea, $10::text, $11::text, $12::text, $13::text, $14::text\\n  from go\\n  returning id, state, epoch, rep_seq),\\nqueued as (\\n  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)\\n  select $15::text, $1, id, case when $7::text = 'recording' then 'transcribe' else 'process' end, epoch, rep_seq, clock_timestamp(), clock_timestamp()\\n  from ins)\\nselect 'created' as result, id, state, null::text as failure_reason from ins\\nunion all\\nselect case when same_deal then 'existing' else 'other_deal' end,\\n  case when same_deal then id end, case when same_deal then state end, case when same_deal then failure_reason end\\nfrom dup where (select ok from rights)\\nunion all\\nselect case when not rights_ok then 'rights_required' else 'quota_exceeded' end, null, null, null\\nfrom gate where not rights_ok or (no_dup and not quota_ok)";
/** Read one Call with its Deal's `deal_id`, Outcome and `in_search`. `$1` Organization, `$2` the Call. No row when absent. */
declare const CALL_GET2 = "select c.id, c.deal_record_id, d.deal_id, d.outcome as deal_outcome,\\n  (c.state = 'ready' and d.outcome = 'won' and c.tagged_outcome_seq >= d.outcome_seq) as in_search,\\n  c.kind, c.file_name, c.media_type, c.size_bytes, c.duration_seconds, c.state, c.failure_reason,\\n  c.rep_by, c.rep_label, c.rep_channel, c.speaker_labels, c.deleted_at, c.purge_due_at,\\n  c.uploaded_by, c.created_at, c.updated_at, c.rep_seq, c.epoch, c.deletion_seq,\\n  (c.state = 'deleted' and (c.purge_due_at <= clock_timestamp() or c.purge_started_at is not null or c.restore_barred_at is not null)) as not_restorable\\nfrom playbook.calls c join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id\\nwhere c.organization_id = $1 and c.id = $2";
/**
* What Postgres says about the Calls a search hit, for the playbook's `momentMayBeReturned`: the
* derived `in_search` (state `ready`, the Deal `won`, the tag current: as in {@link CALL_GET}) and the
* `epoch` and `rep_seq` the Call is at now, with its `deal_record_id`. `$1` Organization, `$2` an
* array of Call ids (`text[]`). One row per id that is a Call of this Organization, in id order; an
* unknown id, another Organization's id, an empty or null array give no row, so a hit with no row is
* dropped. **The statement reads at most {@link MAX_SEARCH_STATE_IDS} ids**: it takes the first 100
* of the array, so its work is bounded whatever is passed, and ids after the 100th get no row. It does
* not refuse them (a statement cannot raise without a function), so **the caller must pass at most
* 100**, which the search's over-fetch window (`topK` 100) already guarantees. A repeated id is
* answered once. Reads `calls` by `calls_pkey` (Organization, id) and the Deal by its key; nothing
* but metadata is returned, no text.
*/
declare const CALL_SEARCH_STATE2 = "select c.id as call_id,\\n  (c.state = 'ready' and d.outcome = 'won' and c.tagged_outcome_seq >= d.outcome_seq) as in_search,\\n  c.epoch, c.rep_seq, c.deal_record_id\\nfrom playbook.calls c\\njoin playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id\\nwhere c.organization_id = $1 and c.id = any(($2::text[])[1:100])\\norder by c.id";
/**
* List the Calls that are not deleted, newest first, one page by keyset. `$1` Organization, `$2`
* and `$3` the `cursor_at` (text, never a Date) and `id` of the last row of the previous page
* (`'infinity'` and `''` first), `$4` the page size (clamped to 1..{@link DOCUMENT_LIST_MAX_PAGE}).
* One query: the Deal's `deal_id`, Outcome and `in_search` are joined, never looked up per row. On
* `calls_list_idx`, read backwards.
*/
declare const CALL_LIST2: string;
/**
* {@link CALL_LIST} for one state (`$5`: any of the seven, `deleted` included, which lists the Calls
* that can still be restored). On `calls_state_list_idx`.
*/
declare const CALL_LIST_BY_STATE2: string;
/**
* {@link CALL_LIST} for one Deal (`$5` the Deal's `deal_…` id), the Calls that are not deleted. On
* `calls_deal_list_idx`. The Deal's Calls in one state, `deleted` included, are
* {@link CALL_LIST_BY_DEAL_STATE}: the two are separate statements so each keeps its index under a
* generic plan.
*/
declare const CALL_LIST_BY_DEAL2: string;
/**
* {@link CALL_LIST} for one Deal (`$5`) in one state (`$6`, any of the seven; `deleted` lists the
* Deal's Calls that can still be restored). On `calls_deal_state_list_idx`, whose equality columns
* are the Organization, the Deal and the state, so the page is read in order with no filter.
* (`calls_deal_list_idx` stays: it serves {@link CALL_LIST_BY_DEAL}, which spans every state but
* `deleted` and so needs the Deal's Calls in one `created_at` order.)
*/
declare const CALL_LIST_BY_DEAL_STATE2: string;
/**
* Soft-delete a Call, as {@link DOCUMENT_SOFT_DELETE} does a document. `$1` Organization, `$2` the
* Call, `$3` the deleting user, `$4` the retention in milliseconds (raised to one hour). Its queued
* or running job is cancelled first (job rows before the Call row, the lock order everywhere),
* `epoch` and `deletion_seq` rise by one and the failure reason is cleared. Returns `id`, `state`,
* `deletion_seq`, `purge_due_at` and `changed`; deleting a deleted Call writes nothing and returns
* `changed` false. Publish the `playbook.call_deleted` message with `deletion_seq` only when
* `changed`. The Call still counts toward the quota until purged.
*/
declare const CALL_SOFT_DELETE2 = "with j as (\\n  update playbook.call_jobs\\n  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp(),\\n      next_attempt_at = case when state = 'running' then next_attempt_at else clock_timestamp() end\\n  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')\\n  returning id),\\nx as (\\n  update playbook.calls\\n  set state = 'deleted', epoch = epoch + 1, deletion_seq = deletion_seq + 1,\\n      deleted_at = clock_timestamp(), deleted_by = $3,\\n      purge_due_at = clock_timestamp() + make_interval(secs => greatest(coalesce($4::float8, 0), 3600000) / 1000),\\n      failure_reason = null, updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and state <> 'deleted' and (select count(*) from j) >= 0\\n  returning id, state, deletion_seq, purge_due_at)\\nselect id, state, deletion_seq, purge_due_at, true as changed from x\\nunion all\\nselect id, state, deletion_seq, purge_due_at, false from playbook.calls\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and not exists (select 1 from x)";
/**
* Restore a soft-deleted Call and queue its work. `$1` Organization, `$2` the Call, `$3` the new
* job's id. Only a `deleted` Call whose purge time has not passed and whose purge has not started,
* and that erasure has not barred. The state it comes back in is the work that remains:
* `uploaded` with a `transcribe` job when the Recording was never transcribed; `awaiting_rep` with
* no job when it was transcribed and has no Rep; otherwise `processing` with a `process` job
* (the contract's "processing"). It cancels a job left on the deleted Call first and bumps `epoch`.
* A Call that is not deleted returns its state with `changed` false. No row: gone, its purge has
* started, or it lost a race (read it, as for a document). Against a purge claim the row lock
* decides, as for documents.
*/
declare const CALL_RESTORE2: string;
/** The restore for an upload that matches a deleted Call: as {@link CALL_RESTORE} without the purge-time check. */
declare const CALL_RESTORE_FOR_UPLOAD2: string;
/**
* Re-queue a `failed` Call when a same-Deal upload of the same content arrives: only for the three
* transient reasons (`transcription_failed`, `transcription_timed_out`, `processing_failed`: the
* contract's `callReuploadRequeues`); it goes back to `uploaded` with a queued `transcribe` job
* (when there is no kept Transcript) or `process` job. `$1` Organization, `$2` the Call, `$3` the new
* job's id. Any other Call, a failed one with another reason included, is returned as it is with
* `changed` false and nothing written, except a deleted one (no row: restore it instead). A Call
* that has used all its vendor sends (`vendor_send_seq` at the bound of 20) is also returned as it
* is: another job could only answer `sent: false` and fail again, so a re-upload does not loop.
*/
declare const CALL_REQUEUE2 = "with j as (\\n  update playbook.call_jobs\\n  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')\\n    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = $2 and x.state = 'failed'\\n                and x.failure_reason in ('transcription_failed', 'transcription_timed_out', 'processing_failed')\\n                and x.vendor_send_seq < 20)\\n  returning id),\\nx as (\\n  update playbook.calls\\n  set state = 'uploaded', failure_reason = null, epoch = epoch + 1, updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and state = 'failed'\\n    and failure_reason in ('transcription_failed', 'transcription_timed_out', 'processing_failed')\\n    and vendor_send_seq < 20\\n    and (select count(*) from j) >= 0\\n  returning organization_id, id, epoch, rep_seq, kind, transcript_key),\\nqueued as (\\n  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)\\n  select $3::text, organization_id, id, case when kind = 'recording' and transcript_key is null then 'transcribe' else 'process' end,\\n    epoch, rep_seq, clock_timestamp(), clock_timestamp()\\n  from x)\\nselect id, 'uploaded' as state, epoch, true as changed from x\\nunion all\\nselect id, state, epoch, false from playbook.calls\\nwhere organization_id = $1 and id = $2 and state <> 'deleted' and not exists (select 1 from x)";
/**
* Pick or change a Call's Rep. `$1` Organization, `$2` the Call, `$3` `speaker` or `channel`, `$4`
* the speaker label (for `speaker`), `$5` the channel (for `channel`), `$6` the new job's id. One
* row, whose `result` is decided in the statement under the row lock (so two changes queue):
* `not_changeable` (the contract's `repChangeAllowed` is false: only `ready`, `awaiting_rep`, or
* `failed` with `rep_label_not_found` or `not_per_side` may change it); `invalid` (the choice does
* not suit the kind: a Transcript takes a speaker only; or the label is not among the Call's
* speaker labels; or the channel is not `left` or `right`); `unchanged` (the Call already has this
* Rep and is not `failed`: nothing is written, whatever its state, so a repeat of a request
* answers 200 even while the rebuild runs); `changed`. A null or unknown `$3` is `invalid` whatever the state. **Lock order:** the Call's active job rows
* first (`for update`), then the Call row, the order of every statement that takes both (the
* claim, the delete, the completion), so a Rep change cannot deadlock with a job claim. A change bumps `rep_seq` by one, cancels
* the Call's job, moves the Call to `processing` with the failure reason cleared and queues a
* `rebuild` job carrying the new `rep_seq` in the same write: the Call is out of search until
* the rebuild finishes ({@link CALL_JOB_COMPLETE} applies only while the stored `rep_seq` still
* equals the job's, so a later change always wins). Publish `playbook.call_rep_changed` with the
* returned `rep_seq` only when `result` is `changed`. No row when the Call does not exist.
*/
declare const CALL_SET_REP2 = "with jl as (\\n  select id from playbook.call_jobs\\n  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')\\n  order by id\\n  for update),\\ncur as (\\n  select * from playbook.calls where organization_id = $1 and id = $2 and (select count(*) from jl) >= 0 for update),\\nv as (\\n  select cur.id, cur.state, cur.rep_seq,\\n    case\\n      when $3::text is null or $3::text not in ('speaker', 'channel') then 'invalid'\\n      when cur.state <> 'deleted' and cur.rep_by is not distinct from $3::text\\n        and cur.rep_label is not distinct from (case when $3::text = 'speaker' then $4::text end)\\n        and cur.rep_channel is not distinct from (case when $3::text = 'channel' then $5::text end)\\n        and cur.state <> 'failed' then 'unchanged'\\n      when not (cur.state in ('ready', 'awaiting_rep')\\n                or (cur.state = 'failed' and cur.failure_reason in ('rep_label_not_found', 'not_per_side')))\\n        then 'not_changeable'\\n      when not coalesce(($3::text = 'speaker' and ($4::text is not null and $4::text = any(cur.speaker_labels)))\\n                or ($3::text = 'channel' and cur.kind = 'recording' and $5::text in ('left', 'right')), false) then 'invalid'\\n      else 'changed'\\n    end as result\\n  from cur),\\nj as (\\n  update playbook.call_jobs\\n  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and id in (select id from jl)\\n    and exists (select 1 from v where result = 'changed')\\n  returning id),\\nu as (\\n  update playbook.calls c\\n  set rep_by = $3::text, rep_label = case when $3::text = 'speaker' then $4::text end,\\n      rep_channel = case when $3::text = 'channel' then $5::text end,\\n      rep_seq = c.rep_seq + 1, state = 'processing', failure_reason = null, updated_at = clock_timestamp()\\n  from v\\n  where c.organization_id = $1 and c.id = v.id and v.result = 'changed' and (select count(*) from j) >= 0\\n  returning c.id, c.rep_seq, c.epoch),\\nqueued as (\\n  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)\\n  select $6::text, $1, id, 'rebuild', epoch, rep_seq, clock_timestamp(), clock_timestamp() from u)\\nselect 'changed' as result, id, 'processing'::text as state, rep_seq from u\\nunion all\\nselect result, id, state, rep_seq from v where result <> 'changed'";
/**
* Claim due Call jobs as a lease, in a short transaction that commits at once. `$1` Organization,
* `$2` batch size, `$3` the lease in milliseconds (raised to one second), `$4` one job id or null
* for any. As {@link INGESTION_JOB_CLAIM} does for documents: each claim counts an attempt and
* issues a `claim_token` every later statement must present; a job is taken only while its Call is
* live for it (`transcribe`: `uploaded` or `transcribing`; `process`: `uploaded` or `processing`;
* `rebuild`: `processing` with the job's `rep_seq`; always at the job's epoch) and a due job whose
* Call is not is cancelled in the same statement; the claim moves an `uploaded` Call to
* `transcribing` or `processing`. A job with all ${CALL_JOB_MAX_ATTEMPTS} attempts used is never
* claimed ({@link CALL_JOB_GIVE_UP_SPENT} resolves it). Locks: job rows (`skip locked`), then the
* Call row, the order everywhere. Rows are the claimed jobs with what the worker needs (the Call's
* kind, keys, Rep and labels, `sent_to_vendor_at`, the job's own `job_created_at` and the Call's
* audio `content_hash`: the sha256 as a Buffer, null only on the signal row); every row carries `cancelled` and `lost`
* as for documents, and one signal row with a null `id` comes back when neither a job was claimed
* nor nothing was due. Run it with a short `lock_timeout`; no publish or network call inside the
* transaction.
*/
declare const CALL_JOB_CLAIM2: string;
/** One row of {@link CALL_JOB_CLAIM}: a claimed job, or (with a null `id`) the signal row. */
interface CallJobClaimRow {
	id: string | null;
	call_id: string | null;
	job_kind: "transcribe" | "process" | "rebuild" | null;
	epoch: number | null;
	rep_seq: number | null;
	attempts: number | null;
	claim_token: string | null;
	call_kind: "transcript" | "recording" | null;
	media_type: string | null;
	size_bytes: string | null;
	object_key: string | null;
	transcript_key: string | null;
	rep_by: "speaker" | "channel" | null;
	rep_label: string | null;
	rep_channel: "left" | "right" | null;
	speaker_labels: string[] | null;
	sent_to_vendor_at: Date | null;
	job_created_at: Date | null;
	content_hash: Buffer | null;
	cancelled: number;
	lost: number;
}
/** A claimed Call job as {@link claimedCallJobs} returns it: a claim row whose `id` is known to be set. */
type ClaimedCallJob = CallJobClaimRow & {
	id: string;
	call_id: string;
	job_created_at: Date;
	content_hash: Buffer;
};
/** Read the rows of {@link CALL_JOB_CLAIM}: the claimed jobs and the counts it `cancelled` and `lost`; claim again at once when either is above zero. */
declare function claimedCallJobs(rows: readonly CallJobClaimRow[]): {
	jobs: ClaimedCallJob[];
	cancelled: number;
	lost: number;
};
/**
* Extend a Call job's lease. `$1` Organization, `$2` job, `$3` the claim token, `$4` the new lease
* in milliseconds. No row: the claim was lost, or the Call is no longer live for the job (deleted,
* restored under a new epoch, its Rep changed again): stop and write nothing more.
*/
declare const CALL_JOB_HEARTBEAT2: string;
/**
* Give a failed attempt back for a later one: the job returns to `queued` with the delay (cut to one
* hour; the service jitters it). `$1` Organization, `$2` job, `$3` the claim token, `$4` the delay in
* milliseconds. No row: the claim was lost.
*/
declare const CALL_JOB_RETRY2 = "update playbook.call_jobs\\nset state = 'queued', claim_token = null,\\n    next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), 3600000) / 1000),\\n    updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'\\nreturning id, attempts";
/**
* Record that the Recording is about to be sent to the vendor, before the request is made, so a
* purge or erasure knows a vendor copy may exist and waits for {@link CALL_VENDOR_REMOVED}. `$1`
* Organization, `$2` job, `$3` the claim token. **Every send counts**: it adds one to
* `vendor_send_seq`, refreshes `sent_to_vendor_at` and clears `vendor_removed_at`, so a copy sent
* again after an earlier one was confirmed gone needs its own confirmation. Returns `id` and the
* new `vendor_send_seq`: the service keeps its vendor reference for that send under this number,
* and **sends a client reference derived from the Call id and this number** (for example
* `<call id>:<n>`), so every counted send can be found and deleted at the vendor even when the
* service crashed after the vendor accepted it and before it stored the vendor's id; a
* confirmation for number `n` means every copy with reference 1 to `n` is gone. That needs the
* vendor to support a client reference or a lookup, which is unverified for AssemblyAI and belongs
* to the transcriber adapter ticket. The same write inserts the send's row (`call_vendor_sends`,
* no id yet): record the vendor's id with {@link CALL_VENDOR_ID_RECORD} after it accepts. **At most
* {@link CALL_MAX_VENDOR_SENDS} sends per Call over its life** (a restore starts a new job, so the
* job's attempt limit alone does not bound them): a twenty-first is not counted and the answer has
* `sent` false; do not send, fail the job. No row: the claim was lost or the Call is not live.
*/
declare const CALL_SENT_TO_VENDOR2: string;
/**
* Record the vendor's id for one send, after the vendor accepted it. `$1` Organization, `$2` Call,
* `$3` the send's `vendor_send_seq` (the number {@link CALL_SENT_TO_VENDOR} returned), `$4` the
* vendor's id (opaque, 1 to 128 characters of `[A-Za-z0-9._:-]`). One row, `result`:
* `recorded`; `unchanged` (that send already holds this id, so a repeat is safe); `conflict` (it
* holds a different id, which is **never overwritten**, or another send of the Organization holds
* this id: the table has a unique Organization-scoped index on it, and a concurrent record of the
* same id on two sends can still raise SQLSTATE 23505, which the service treats as `conflict`
* and never logs `error.detail`, because it carries the id); `invalid` (the id is not of that shape:
* nothing is written and no constraint is reached, so no id appears in any error). **No row** when
* the Call has no such counted send (never sent, or a number above the Call's current one).
* **A late answer is allowed**: the id of any counted send is recorded whatever the Call's state and
* whichever send is the current one, and without a claim, because an answer that arrives after a
* restore, a newer send or a delete still names a real copy at the vendor that must be deleted. A
* send that never gets an id keeps its row with a null id; the purge then finds that copy by its
* client reference. The id is never returned by this statement, logged, or put in an index.
*/
declare const CALL_VENDOR_ID_RECORD2 = "with cur as (\\n  select vendor_id from playbook.call_vendor_sends\\n  where organization_id = $1 and call_id = $2 and seq = $3::int\\n  for update),\\ntaken as (\\n  select 1 from playbook.call_vendor_sends t\\n  where t.organization_id = $1 and t.vendor_id = $4::text and not (t.call_id = $2 and t.seq = $3::int)),\\nu as (\\n  update playbook.call_vendor_sends s\\n  set vendor_id = $4::text, recorded_at = clock_timestamp()\\n  from cur\\n  where s.organization_id = $1 and s.call_id = $2 and s.seq = $3::int and cur.vendor_id is null\\n    and not exists (select 1 from taken)\\n    and coalesce($4::text ~ '^[A-Za-z0-9._:-]{1,128}$', false)\\n  returning 1)\\nselect case\\n  when not coalesce($4::text ~ '^[A-Za-z0-9._:-]{1,128}$', false) then 'invalid'\\n  when exists (select 1 from u) then 'recorded'\\n  when cur.vendor_id = $4::text then 'unchanged'\\n  else 'conflict' end as result\\nfrom cur";
/**
* Record what a step learned and extend the lease. `$1` Organization, `$2` job, `$3` the claim
* token, `$4` the object key of the Transcript a Recording produced (kept and reused), `$5` the
* Recording's duration in seconds, `$6` the speaker labels as a text array (at most 20, unique: more
* is `too_many_speakers`, which the service fails with {@link CALL_JOB_FAIL} instead), `$7` the lease
* in milliseconds. A null leaves that value as it is. No row: the claim was lost or the Call is not
* live. The table refuses a duration over 3 hours (the service fails `too_long` instead).
*/
declare const CALL_JOB_RECORD2: string;
/**
* End a `transcribe` job: the Transcript is stored (and recorded with {@link CALL_JOB_RECORD}).
* `$1` Organization, `$2` job, `$3` the claim token, `$4` the id of the `process` job to queue. The
* Call goes to `awaiting_rep` when it has no Rep (no job; `playbook.call_rep_changed` follows the
* pick) and to `processing` with a queued `process` job when it has (publish
* `playbook.call_transcribed`). One row with the Call's new `state`, or none when the claim was lost,
* the Call is not `transcribing` at the job's epoch, or no Transcript is recorded.
*/
declare const CALL_JOB_TRANSCRIBED2 = "with j as (\\n  update playbook.call_jobs\\n  set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running' and kind = 'transcribe'\\n    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id\\n                and x.state = 'transcribing' and x.epoch = call_jobs.epoch and x.transcript_key is not null)\\n  returning call_id, epoch),\\nc as (\\n  update playbook.calls\\n  set state = case when rep_by is null then 'awaiting_rep' else 'processing' end, updated_at = clock_timestamp()\\n  where organization_id = $1 and id = (select call_id from j) and epoch = (select epoch from j) and state = 'transcribing'\\n  returning id, state, epoch, rep_seq),\\nq as (\\n  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)\\n  select $4::text, $1, id, 'process', epoch, rep_seq, clock_timestamp(), clock_timestamp() from c where state = 'processing')\\nselect id, state from c";
/**
* Finish a `process` or `rebuild` job and make the Call `ready`. `$1` Organization, `$2` job, `$3`
* the claim token, `$4` the Deal's `outcome_seq` the Moments were tagged with (read by the worker
* before it built them). It applies only while the Call is `processing` at the job's epoch, has a
* Rep (and, for a speaker, a label among its labels: else the service fails it with
* `rep_label_not_found`), and for a `rebuild` only while the stored `rep_seq` equals the job's. It
* **locks the Deal row** (`for no key update`, the mode of an Outcome change and of
* {@link DEAL_RETAG_LOCK}, which conflicts with neither the foreign-key `KEY SHARE` of an upload
* nor a reader) **before the Call is written**, because the Call update reads that locked row and
* so waits for it, and reads `outcome_seq` from the locked, newest row, never from the statement's
* snapshot. (Postgres does not order the data-modifying parts of a statement textually, so the
* lock is not promised to come before the job row's; it need not: no statement that holds a Deal
* row waits for a job or Call row, so either order is safe.) It records the tag (never above that sequence) and, when the tag is behind it, lowers
* the Deal's `retag_through` in the same write. Because the re-tag's lock and an Outcome change
* queue on the same row, a completion that is open while the Outcome moves holds the change (and
* so the re-tag's `DONE`) back until it commits, and a completion that waits behind them tags
* against the newer sequence: a Call can never become `ready` with a stale tag unseen. The mode is
* `no key update`, not `share`, because two completions that held `share` and then both lowered
* `retag_through` would deadlock on the upgrade; this way they queue instead, for the length of
* one statement. Keep the transaction of an Outcome change short for the same reason. No row: the
* claim was lost or a guard failed.
*/
declare const CALL_JOB_COMPLETE2 = "with dk as (\\n  select d.id, d.outcome_seq from playbook.deals d\\n  where d.organization_id = $1\\n    and d.id = (select x.deal_record_id from playbook.calls x join playbook.call_jobs y\\n                  on y.organization_id = x.organization_id and y.call_id = x.id\\n                where y.organization_id = $1 and y.id = $2)\\n  for no key update),\\nj as (\\n  update playbook.call_jobs\\n  set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running' and kind in ('process', 'rebuild')\\n    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id\\n                and x.state = 'processing' and x.epoch = call_jobs.epoch\\n                and (call_jobs.kind = 'process' or x.rep_seq = call_jobs.rep_seq)\\n                and x.rep_by is not null and (x.rep_by <> 'speaker' or x.rep_label = any(x.speaker_labels)))\\n  returning call_id, epoch),\\nc as (\\n  update playbook.calls c\\n  set state = 'ready', tagged_outcome_seq = greatest(c.tagged_outcome_seq, least($4::int, dk.outcome_seq)), updated_at = clock_timestamp()\\n  from j, dk\\n  where c.organization_id = $1 and c.id = j.call_id and c.epoch = j.epoch and c.state = 'processing'\\n    and dk.id = c.deal_record_id\\n  returning c.id, c.deal_record_id, c.tagged_outcome_seq),\\ndl as (\\n  update playbook.deals d\\n  set retag_through = least(d.retag_through, c.tagged_outcome_seq)\\n  from c, dk\\n  where d.organization_id = $1 and d.id = c.deal_record_id and dk.id = d.id and c.tagged_outcome_seq < dk.outcome_seq\\n  returning d.id)\\nselect id from c";
/**
* End a Call job as failed with a reason, and the Call with it. `$1` Organization, `$2` job, `$3`
* the claim token, `$4` the reason (one of the ten; the table rejects any other). `too_many_speakers`
* also clears the labels (the contract lists none for it). A Call that failed with
* `rep_label_not_found` or `not_per_side` can be fixed by {@link CALL_SET_REP}. No row: the claim was lost.
*/
declare const CALL_JOB_FAIL2: string;
/**
* Fail spent jobs, one bounded batch: active jobs that used every attempt and whose lease ended, as
* `failed` with `processing_failed`, and their Calls too (the safety net behind the service's own
* limit). `$1` Organization, `$2` batch size. Skips rows another transaction holds.
*/
declare const CALL_JOB_GIVE_UP_SPENT2: string;
/**
* Begin the vector cleanup queued for one Call deletion, as {@link DOCUMENT_CLEANUP_BEGIN} does.
* `$1` Organization, `$2` Call, `$3` the `deletion_seq` the message carried. A row means the
* cleanup still applies; `clear` is false while a worker may still hold a lease on the Call.
*/
declare const CALL_CLEANUP_BEGIN2 = "select c.id, c.epoch,\\n  not exists (\\n    select 1 from playbook.call_jobs j\\n    where j.organization_id = c.organization_id and j.call_id = c.id\\n      and j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp()) as clear\\nfrom playbook.calls c\\nwhere c.organization_id = $1 and c.id = $2 and c.state = 'deleted' and c.deletion_seq = $3::int";
/**
* One page of the deleted Calls whose vector cleanup is pending ({@link CALL_PENDING_CLEANUP_PREDICATE}),
* oldest deletion first. `$1` Organization, `$2` and `$3` the cursor (`deleted_at::text`, `id`;
* `'-infinity'` and `''` first), `$4` the page size. Rows: `id`, `epoch`, `deletion_seq`,
* `deleted_at` and `cursor_at` (the text of `deleted_at`). On `calls_cleanup_idx`.
*/
declare const CALL_LIST_PENDING_CLEANUP2: string;
/** Record that the cleanup of one deletion finished: `$1` Organization, `$2` Call, `$3` the `deletion_seq`. No row: restored or deleted again since. */
declare const CALL_CLEANUP_DONE2 = "update playbook.calls\\nset vectors_removed_seq = $3::int, updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and deletion_seq = $3::int\\nreturning id";
/**
* Record that the vendor confirmed it deleted its copy of a Recording. `$1` Organization, `$2` Call,
* `$3` the `vendor_send_seq` of the send whose copy is gone (the purge claim and the erase rows
* carry the current one). Only for a `deleted` Call whose latest send is that number, so a late
* confirmation of an earlier copy confirms nothing about a later one; idempotent. **No row while a
* job of the Call still holds a live lease** (`running`, or `cancelled` with `next_attempt_at` in
* the future, as delete and erasure leave it): a worker that already recorded the send may still be
* mid-request, so a confirmation taken now could be made before its copy lands, which would be a
* false statement. Retry after the lease. {@link CALL_PURGE_COMPLETE} waits for both.
*/
declare const CALL_VENDOR_REMOVED2 = "update playbook.calls\\nset vendor_removed_at = coalesce(vendor_removed_at, clock_timestamp()), updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and vendor_send_seq = $3::int\\n  and sent_to_vendor_at is not null\\n  and not exists (\\n    select 1 from playbook.call_jobs j\\n    where j.organization_id = $1 and j.call_id = $2\\n      and j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp())\\nreturning id";
/**
* Claim Calls due for purge as a lease, as {@link DOCUMENT_PURGE_CLAIM}. `$1` Organization, `$2`
* batch size, `$3` the lease in milliseconds. Rows carry what the service must remove outside any
* transaction: `object_key` (the original), `transcript_key` (the kept Transcript), `kind`,
* `sent_to_vendor_at`, `vendor_send_seq` and `vendor_removed_at` (remove the vendor's copy and record it
* with {@link CALL_VENDOR_REMOVED} and that `vendor_send_seq`), `vendor_sends` (every counted send as
* `{ seq, vendor_id }`, `vendor_id` null for a send whose id was never stored: delete that copy by its
* client reference; the array is complete, at most {@link CALL_MAX_VENDOR_SENDS} long, and `[]` for a Call
* never sent), `deletion_seq` and `vectors_removed_seq` (run the cleanup first
* when they differ). The service also removes every artefact under the Call's id prefix. **A claim
* means the purge can finish**: a Call is not handed out while a job of it is `running`, or
* `cancelled` with its lease unexpired (delete and erasure cancel a job but keep its lease), the
* state in which {@link CALL_VENDOR_REMOVED} and {@link CALL_PURGE_COMPLETE} refuse, so a service
* that retries during the wait spends none of the {@link CALL_PURGE_MAX_ATTEMPTS} attempts. Erasure
* reaches the purge only through this claim and inherits that.
*/
declare const CALL_PURGE_CLAIM2: string;
/**
* Finish a Call purge: remove the row (its jobs go by cascade and the counts fall in the same
* transaction). `$1` Organization, `$2` Call. Only for a `deleted` Call whose purge was claimed, whose
* current deletion's cleanup is recorded and whose vendor copy, if one was made, is recorded removed,
* and with no live job lease: a `running` job, or a `cancelled` one (delete and erasure cancel a job
* but keep its lease) whose `next_attempt_at` has not passed, may still have a request in flight,
* as {@link CALL_CLEANUP_BEGIN} also treats it. Locks the Call's job rows first (the lock order everywhere).
*/
declare const CALL_PURGE_COMPLETE2 = "with jl as (\\n  select state, next_attempt_at from playbook.call_jobs\\n  where organization_id = $1 and call_id = $2\\n  for update)\\ndelete from playbook.calls\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is not null\\n  and vectors_removed_seq = deletion_seq\\n  and (sent_to_vendor_at is null or vendor_removed_at is not null)\\n  and not exists (select 1 from jl where jl.state in ('running', 'cancelled') and jl.next_attempt_at > clock_timestamp())\\nreturning id, size_bytes";
/** List the Calls whose purge reached the attempt bound, one page by id: `$1` Organization, `$2` last id (`''` first), `$3` page size. On `calls_spent_purge_idx`. */
declare const CALL_LIST_SPENT_PURGES2: string;
/** Give one spent Call purge another round: `$1` Organization, `$2` Call. The Call is barred from restore for good. Idempotent. */
declare const CALL_PURGE_RESET2 = "update playbook.calls\\nset purge_attempts = 0, purge_started_at = null, purge_lease_until = null,\\n    restore_barred_at = coalesce(restore_barred_at, clock_timestamp()), updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and purge_attempts >= 20\\nreturning id, purge_attempts";
/**
* One batch of an erasure of Calls: bar the Organization's Calls from restore and make them due
* for purge at once, as {@link DOCUMENT_ERASE_BATCH} does documents. **Run it, and let the purge
* remove every Call, before {@link DEAL_ERASE_BATCH}**: a Deal a Call refers to cannot be deleted.
* `$1` Organization, `$2` batch size, `$3` the actor (an internal call has no user: `usr_` and 32
* zeros). Rows: `id`, `epoch`, `deletion_seq`, `changed` (publish the cleanup with that sequence),
* and `object_key`, `transcript_key`, `kind`, `sent_to_vendor_at`, `vendor_send_seq`, `vendor_sends` (**read in
* the statement's snapshot, so a send that committed while the statement ran can be in `vendor_send_seq`
* and not yet in `vendor_sends`: when `vendor_sends` is shorter than `vendor_send_seq`, delete the
* missing sequences by client reference; the purge claim, run after the lease gate, is exact**) so the service can remove the
* objects and the vendor copy at once; the purge claim returns them again. Lock order: job rows,
* then Call rows, each in id order. Repeat until no row comes back. An upload still streaming has
* no Call yet: its key is an upload attempt, so the orphan sweep removes its parts and object.
*/
declare const CALL_ERASE_BATCH2: string;
/**
* One page of the Deals that need an Outcome re-tag (`retag_through < outcome_seq`, on
* `deals_retag_idx`): `$1` Organization, `$2` the last Deal id of the previous page (`''` first),
* `$3` the page size (clamped). Rows: `id`, `outcome`, `outcome_seq`, `retag_through`.
*/
declare const DEAL_LIST_PENDING_RETAG2: string;
/**
* One bounded batch of a Deal's `ready` Calls whose tag is behind the Deal's Outcome sequence:
* `$1` Organization, `$2` the Deal, `$3` the last Call id of the previous batch (`''` first), `$4` the
* batch size (clamped). Rows carry the Call `id`, the Deal's current `outcome` and `outcome_seq`:
* re-tag the Call's Moments in the index with that Outcome, then record it with {@link CALL_RETAGGED}.
* One statement reads the batch plus the keyset rows it skips: the keyset on `calls_retag_idx`
* moves forward, so all the batches of one re-tag read the Deal's ready Calls once (bounded by
* the quota, never by the Organization), and the job is idempotent (it reads the Outcome from the database, so a batch
* repeated after a change does the newer work).
*/
declare const DEAL_RETAG_BATCH2: string;
/**
* Record that Calls' Moments carry an Outcome sequence: `$1` Organization, `$2` the Call ids (an
* array; the first 500 are used), `$3` the sequence the batch row carried. A Call's tag only goes
* up and never above its Deal's current sequence. Rows are the Calls updated.
*/
declare const CALL_RETAGGED2 = "update playbook.calls c\\nset tagged_outcome_seq = $3::int, updated_at = clock_timestamp()\\nfrom playbook.deals d\\nwhere c.organization_id = $1 and c.id = any(($2::text[])[1:500]) and c.state = 'ready'\\n  and c.tagged_outcome_seq < $3::int\\n  and d.organization_id = $1 and d.id = c.deal_record_id and $3::int <= d.outcome_seq\\nreturning c.id";
/**
* Take the Deal row before finishing its re-tag: `$1` Organization, `$2` the Deal. **Run it and
* {@link DEAL_RETAG_DONE} in one transaction, as two statements.** The second runs with a new
* snapshot after this lock is granted, so it sees every Call that became `ready` with a stale tag
* (their transaction also takes this row, see {@link CALL_JOB_COMPLETE}) before it decides.
*/
declare const DEAL_RETAG_LOCK2 = "select id, outcome, outcome_seq, retag_through\nfrom playbook.deals\nwhere organization_id = $1 and id = $2\nfor no key update";
/**
* Finish a Deal's re-tag: `$1` Organization, `$2` the Deal, `$3` the `outcome_seq` the batches
* carried. It sets `retag_through` to it only if it is above the stored one and not above the Deal's
* sequence and no `ready` Call of the Deal is still tagged below it (one indexed read of the Deal's
* ready Calls, once per re-tag, short-circuiting on the first stale one). No row means more work
* remains (another Call, or a newer Outcome): list and batch again. Hint: a lowered marker notes the
* `outcome_retag` work again by trigger.
*/
declare const DEAL_RETAG_DONE2 = "update playbook.deals d\\nset retag_through = $3::int\\nwhere d.organization_id = $1 and d.id = $2 and d.retag_through < $3::int and $3::int <= d.outcome_seq\\n  and not exists (\\n    select 1 from playbook.calls c\\n    where c.organization_id = $1 and c.deal_record_id = d.id and c.state = 'ready' and c.tagged_outcome_seq < $3::int)\\nreturning d.id, d.retag_through, d.outcome_seq";
/** Every Call statement above by name, for the README check and the integration tests. */
declare const CALL_STATEMENTS: {
	readonly CALL_USAGE2: "select call_count, recording_byte_count\nfrom playbook.organization_usage\nwhere organization_id = $1";
	readonly CALL_INSERT2: "with rights as (\\n  select exists (select 1 from playbook.rights_confirmations\\n                 where organization_id = $1 and wording_version = $19::int) as ok),\\ndup as (\\n  select c.id, c.state, c.failure_reason, (d.deal_id = $3::text) as same_deal\\n  from playbook.calls c join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id\\n  where c.organization_id = $1 and c.content_hash = $9::bytea\\n    and c.purge_started_at is null and c.restore_barred_at is null),\\ndeal as (\\n  select id from playbook.deals where organization_id = $1 and deal_id = $3::text),\\nusage as (\\n  select call_count, recording_byte_count, deal_count from playbook.organization_usage where organization_id = $1),\\ngate as (\\n  select (select ok from rights) as rights_ok,\\n    not exists (select 1 from dup) as no_dup,\\n    (coalesce((select call_count from usage), 0) < $16::bigint\\n      and ($7::text <> 'recording' or coalesce((select recording_byte_count from usage), 0) + $8::bigint <= $17::bigint)\\n      and (exists (select 1 from deal) or coalesce((select deal_count from usage), 0) < $18::bigint)) as quota_ok),\\ngo as (\\n  select 1 as one from gate where rights_ok and no_dup and quota_ok),\\nmade as (\\n  insert into playbook.deals (id, organization_id, deal_id)\\n  select $4::text, $1, $3::text from go where not exists (select 1 from deal)\\n  returning id),\\nins as (\\n  insert into playbook.calls\\n    (id, organization_id, deal_record_id, kind, file_name, media_type, size_bytes, content_hash,\\n     uploaded_by, object_key, rep_by, rep_label, rep_channel)\\n  select $2::text, $1, coalesce((select id from deal), (select id from made)), $7::text, $5::text, $6::text,\\n    $8::bigint, $9::bytea, $10::text, $11::text, $12::text, $13::text, $14::text\\n  from go\\n  returning id, state, epoch, rep_seq),\\nqueued as (\\n  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)\\n  select $15::text, $1, id, case when $7::text = 'recording' then 'transcribe' else 'process' end, epoch, rep_seq, clock_timestamp(), clock_timestamp()\\n  from ins)\\nselect 'created' as result, id, state, null::text as failure_reason from ins\\nunion all\\nselect case when same_deal then 'existing' else 'other_deal' end,\\n  case when same_deal then id end, case when same_deal then state end, case when same_deal then failure_reason end\\nfrom dup where (select ok from rights)\\nunion all\\nselect case when not rights_ok then 'rights_required' else 'quota_exceeded' end, null, null, null\\nfrom gate where not rights_ok or (no_dup and not quota_ok)";
	readonly CALL_GET2: "select c.id, c.deal_record_id, d.deal_id, d.outcome as deal_outcome,\\n  (c.state = 'ready' and d.outcome = 'won' and c.tagged_outcome_seq >= d.outcome_seq) as in_search,\\n  c.kind, c.file_name, c.media_type, c.size_bytes, c.duration_seconds, c.state, c.failure_reason,\\n  c.rep_by, c.rep_label, c.rep_channel, c.speaker_labels, c.deleted_at, c.purge_due_at,\\n  c.uploaded_by, c.created_at, c.updated_at, c.rep_seq, c.epoch, c.deletion_seq,\\n  (c.state = 'deleted' and (c.purge_due_at <= clock_timestamp() or c.purge_started_at is not null or c.restore_barred_at is not null)) as not_restorable\\nfrom playbook.calls c join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id\\nwhere c.organization_id = $1 and c.id = $2";
	readonly CALL_SEARCH_STATE2: "select c.id as call_id,\\n  (c.state = 'ready' and d.outcome = 'won' and c.tagged_outcome_seq >= d.outcome_seq) as in_search,\\n  c.epoch, c.rep_seq, c.deal_record_id\\nfrom playbook.calls c\\njoin playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id\\nwhere c.organization_id = $1 and c.id = any(($2::text[])[1:100])\\norder by c.id";
	readonly CALL_LIST2: string;
	readonly CALL_LIST_BY_STATE2: string;
	readonly CALL_LIST_BY_DEAL2: string;
	readonly CALL_LIST_BY_DEAL_STATE2: string;
	readonly CALL_SOFT_DELETE2: "with j as (\\n  update playbook.call_jobs\\n  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp(),\\n      next_attempt_at = case when state = 'running' then next_attempt_at else clock_timestamp() end\\n  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')\\n  returning id),\\nx as (\\n  update playbook.calls\\n  set state = 'deleted', epoch = epoch + 1, deletion_seq = deletion_seq + 1,\\n      deleted_at = clock_timestamp(), deleted_by = $3,\\n      purge_due_at = clock_timestamp() + make_interval(secs => greatest(coalesce($4::float8, 0), 3600000) / 1000),\\n      failure_reason = null, updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and state <> 'deleted' and (select count(*) from j) >= 0\\n  returning id, state, deletion_seq, purge_due_at)\\nselect id, state, deletion_seq, purge_due_at, true as changed from x\\nunion all\\nselect id, state, deletion_seq, purge_due_at, false from playbook.calls\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and not exists (select 1 from x)";
	readonly CALL_RESTORE2: string;
	readonly CALL_RESTORE_FOR_UPLOAD2: string;
	readonly CALL_REQUEUE2: "with j as (\\n  update playbook.call_jobs\\n  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')\\n    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = $2 and x.state = 'failed'\\n                and x.failure_reason in ('transcription_failed', 'transcription_timed_out', 'processing_failed')\\n                and x.vendor_send_seq < 20)\\n  returning id),\\nx as (\\n  update playbook.calls\\n  set state = 'uploaded', failure_reason = null, epoch = epoch + 1, updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and state = 'failed'\\n    and failure_reason in ('transcription_failed', 'transcription_timed_out', 'processing_failed')\\n    and vendor_send_seq < 20\\n    and (select count(*) from j) >= 0\\n  returning organization_id, id, epoch, rep_seq, kind, transcript_key),\\nqueued as (\\n  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)\\n  select $3::text, organization_id, id, case when kind = 'recording' and transcript_key is null then 'transcribe' else 'process' end,\\n    epoch, rep_seq, clock_timestamp(), clock_timestamp()\\n  from x)\\nselect id, 'uploaded' as state, epoch, true as changed from x\\nunion all\\nselect id, state, epoch, false from playbook.calls\\nwhere organization_id = $1 and id = $2 and state <> 'deleted' and not exists (select 1 from x)";
	readonly CALL_SET_REP2: "with jl as (\\n  select id from playbook.call_jobs\\n  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')\\n  order by id\\n  for update),\\ncur as (\\n  select * from playbook.calls where organization_id = $1 and id = $2 and (select count(*) from jl) >= 0 for update),\\nv as (\\n  select cur.id, cur.state, cur.rep_seq,\\n    case\\n      when $3::text is null or $3::text not in ('speaker', 'channel') then 'invalid'\\n      when cur.state <> 'deleted' and cur.rep_by is not distinct from $3::text\\n        and cur.rep_label is not distinct from (case when $3::text = 'speaker' then $4::text end)\\n        and cur.rep_channel is not distinct from (case when $3::text = 'channel' then $5::text end)\\n        and cur.state <> 'failed' then 'unchanged'\\n      when not (cur.state in ('ready', 'awaiting_rep')\\n                or (cur.state = 'failed' and cur.failure_reason in ('rep_label_not_found', 'not_per_side')))\\n        then 'not_changeable'\\n      when not coalesce(($3::text = 'speaker' and ($4::text is not null and $4::text = any(cur.speaker_labels)))\\n                or ($3::text = 'channel' and cur.kind = 'recording' and $5::text in ('left', 'right')), false) then 'invalid'\\n      else 'changed'\\n    end as result\\n  from cur),\\nj as (\\n  update playbook.call_jobs\\n  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and id in (select id from jl)\\n    and exists (select 1 from v where result = 'changed')\\n  returning id),\\nu as (\\n  update playbook.calls c\\n  set rep_by = $3::text, rep_label = case when $3::text = 'speaker' then $4::text end,\\n      rep_channel = case when $3::text = 'channel' then $5::text end,\\n      rep_seq = c.rep_seq + 1, state = 'processing', failure_reason = null, updated_at = clock_timestamp()\\n  from v\\n  where c.organization_id = $1 and c.id = v.id and v.result = 'changed' and (select count(*) from j) >= 0\\n  returning c.id, c.rep_seq, c.epoch),\\nqueued as (\\n  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)\\n  select $6::text, $1, id, 'rebuild', epoch, rep_seq, clock_timestamp(), clock_timestamp() from u)\\nselect 'changed' as result, id, 'processing'::text as state, rep_seq from u\\nunion all\\nselect result, id, state, rep_seq from v where result <> 'changed'";
	readonly CALL_JOB_CLAIM2: string;
	readonly CALL_JOB_HEARTBEAT2: string;
	readonly CALL_JOB_RETRY2: "update playbook.call_jobs\\nset state = 'queued', claim_token = null,\\n    next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), 3600000) / 1000),\\n    updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'\\nreturning id, attempts";
	readonly CALL_SENT_TO_VENDOR2: string;
	readonly CALL_JOB_RECORD2: string;
	readonly CALL_JOB_TRANSCRIBED2: "with j as (\\n  update playbook.call_jobs\\n  set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running' and kind = 'transcribe'\\n    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id\\n                and x.state = 'transcribing' and x.epoch = call_jobs.epoch and x.transcript_key is not null)\\n  returning call_id, epoch),\\nc as (\\n  update playbook.calls\\n  set state = case when rep_by is null then 'awaiting_rep' else 'processing' end, updated_at = clock_timestamp()\\n  where organization_id = $1 and id = (select call_id from j) and epoch = (select epoch from j) and state = 'transcribing'\\n  returning id, state, epoch, rep_seq),\\nq as (\\n  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)\\n  select $4::text, $1, id, 'process', epoch, rep_seq, clock_timestamp(), clock_timestamp() from c where state = 'processing')\\nselect id, state from c";
	readonly CALL_JOB_COMPLETE2: "with dk as (\\n  select d.id, d.outcome_seq from playbook.deals d\\n  where d.organization_id = $1\\n    and d.id = (select x.deal_record_id from playbook.calls x join playbook.call_jobs y\\n                  on y.organization_id = x.organization_id and y.call_id = x.id\\n                where y.organization_id = $1 and y.id = $2)\\n  for no key update),\\nj as (\\n  update playbook.call_jobs\\n  set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running' and kind in ('process', 'rebuild')\\n    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id\\n                and x.state = 'processing' and x.epoch = call_jobs.epoch\\n                and (call_jobs.kind = 'process' or x.rep_seq = call_jobs.rep_seq)\\n                and x.rep_by is not null and (x.rep_by <> 'speaker' or x.rep_label = any(x.speaker_labels)))\\n  returning call_id, epoch),\\nc as (\\n  update playbook.calls c\\n  set state = 'ready', tagged_outcome_seq = greatest(c.tagged_outcome_seq, least($4::int, dk.outcome_seq)), updated_at = clock_timestamp()\\n  from j, dk\\n  where c.organization_id = $1 and c.id = j.call_id and c.epoch = j.epoch and c.state = 'processing'\\n    and dk.id = c.deal_record_id\\n  returning c.id, c.deal_record_id, c.tagged_outcome_seq),\\ndl as (\\n  update playbook.deals d\\n  set retag_through = least(d.retag_through, c.tagged_outcome_seq)\\n  from c, dk\\n  where d.organization_id = $1 and d.id = c.deal_record_id and dk.id = d.id and c.tagged_outcome_seq < dk.outcome_seq\\n  returning d.id)\\nselect id from c";
	readonly CALL_JOB_FAIL2: string;
	readonly CALL_JOB_GIVE_UP_SPENT2: string;
	readonly CALL_CLEANUP_BEGIN2: "select c.id, c.epoch,\\n  not exists (\\n    select 1 from playbook.call_jobs j\\n    where j.organization_id = c.organization_id and j.call_id = c.id\\n      and j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp()) as clear\\nfrom playbook.calls c\\nwhere c.organization_id = $1 and c.id = $2 and c.state = 'deleted' and c.deletion_seq = $3::int";
	readonly CALL_LIST_PENDING_CLEANUP2: string;
	readonly CALL_CLEANUP_DONE2: "update playbook.calls\\nset vectors_removed_seq = $3::int, updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and deletion_seq = $3::int\\nreturning id";
	readonly CALL_VENDOR_ID_RECORD2: "with cur as (\\n  select vendor_id from playbook.call_vendor_sends\\n  where organization_id = $1 and call_id = $2 and seq = $3::int\\n  for update),\\ntaken as (\\n  select 1 from playbook.call_vendor_sends t\\n  where t.organization_id = $1 and t.vendor_id = $4::text and not (t.call_id = $2 and t.seq = $3::int)),\\nu as (\\n  update playbook.call_vendor_sends s\\n  set vendor_id = $4::text, recorded_at = clock_timestamp()\\n  from cur\\n  where s.organization_id = $1 and s.call_id = $2 and s.seq = $3::int and cur.vendor_id is null\\n    and not exists (select 1 from taken)\\n    and coalesce($4::text ~ '^[A-Za-z0-9._:-]{1,128}$', false)\\n  returning 1)\\nselect case\\n  when not coalesce($4::text ~ '^[A-Za-z0-9._:-]{1,128}$', false) then 'invalid'\\n  when exists (select 1 from u) then 'recorded'\\n  when cur.vendor_id = $4::text then 'unchanged'\\n  else 'conflict' end as result\\nfrom cur";
	readonly CALL_VENDOR_REMOVED2: "update playbook.calls\\nset vendor_removed_at = coalesce(vendor_removed_at, clock_timestamp()), updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and vendor_send_seq = $3::int\\n  and sent_to_vendor_at is not null\\n  and not exists (\\n    select 1 from playbook.call_jobs j\\n    where j.organization_id = $1 and j.call_id = $2\\n      and j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp())\\nreturning id";
	readonly CALL_PURGE_CLAIM2: string;
	readonly CALL_PURGE_COMPLETE2: "with jl as (\\n  select state, next_attempt_at from playbook.call_jobs\\n  where organization_id = $1 and call_id = $2\\n  for update)\\ndelete from playbook.calls\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is not null\\n  and vectors_removed_seq = deletion_seq\\n  and (sent_to_vendor_at is null or vendor_removed_at is not null)\\n  and not exists (select 1 from jl where jl.state in ('running', 'cancelled') and jl.next_attempt_at > clock_timestamp())\\nreturning id, size_bytes";
	readonly CALL_LIST_SPENT_PURGES2: string;
	readonly CALL_PURGE_RESET2: "update playbook.calls\\nset purge_attempts = 0, purge_started_at = null, purge_lease_until = null,\\n    restore_barred_at = coalesce(restore_barred_at, clock_timestamp()), updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and purge_attempts >= 20\\nreturning id, purge_attempts";
	readonly CALL_ERASE_BATCH2: string;
	readonly DEAL_LIST_PENDING_RETAG2: string;
	readonly DEAL_RETAG_BATCH2: string;
	readonly CALL_RETAGGED2: "update playbook.calls c\\nset tagged_outcome_seq = $3::int, updated_at = clock_timestamp()\\nfrom playbook.deals d\\nwhere c.organization_id = $1 and c.id = any(($2::text[])[1:500]) and c.state = 'ready'\\n  and c.tagged_outcome_seq < $3::int\\n  and d.organization_id = $1 and d.id = c.deal_record_id and $3::int <= d.outcome_seq\\nreturning c.id";
	readonly DEAL_RETAG_LOCK2: "select id, outcome, outcome_seq, retag_through\nfrom playbook.deals\nwhere organization_id = $1 and id = $2\nfor no key update";
	readonly DEAL_RETAG_DONE2: "update playbook.deals d\\nset retag_through = $3::int\\nwhere d.organization_id = $1 and d.id = $2 and d.retag_through < $3::int and $3::int <= d.outcome_seq\\n  and not exists (\\n    select 1 from playbook.calls c\\n    where c.organization_id = $1 and c.deal_record_id = d.id and c.state = 'ready' and c.tagged_outcome_seq < $3::int)\\nreturning d.id, d.retag_through, d.outcome_seq";
};
/**
* The least soft-delete retention, in milliseconds, {@link DOCUMENT_SOFT_DELETE} stores: one hour.
* A smaller, null or negative value passed in is raised to it, so a bug cannot make a mistaken
* delete unrecoverable. The lead's default is 30 days (ADR 0016); the service passes it.
*/
declare const DOCUMENT_MIN_RETENTION_MS = 36e5;
/** The least lease, in milliseconds, any claim or renewal below stores; a smaller value is raised to it. */
declare const PLAYBOOK_MIN_LEASE_MS = 1e3;
/** The longest delay, in milliseconds, {@link INGESTION_JOB_RETRY} will impose; a longer one is cut to it. */
declare const INGESTION_MAX_RETRY_DELAY_MS = 36e5;
/** The most documents one {@link DOCUMENT_LIST} or {@link DOCUMENT_LIST_DELETED} page returns, whatever limit is asked for. */
declare const DOCUMENT_LIST_MAX_PAGE = 100;
/** The most document ids {@link DOCUMENT_SEARCH_STATE} reads in one call: the search over-fetch window (topK 100). */
declare const MAX_DOCUMENT_SEARCH_STATE_IDS = 100;
/**
* The most rows any batch statement takes, whatever size is passed in: the purge claim, the job
* claim, the give-up, and the two purges. A null, zero or negative size is raised to 1.
*/
declare const PLAYBOOK_MAX_BATCH = 500;
/**
* How old an upload attempt is when its stored object may be an orphan worth sweeping, in
* milliseconds: 25 hours. The service deletes an orphan object only when it is older than 24 hours;
* the extra hour covers the time between an attempt's start (its key's `created_at`) and the object
* being written. `organizations_with_work` reports `orphan_sweep` at this age after the oldest
* attempt not yet marked swept, and {@link ORPHAN_SWEEP_DONE} cuts the swept-through time to this
* long before now, so an attempt counts as swept only when its object was surely old enough to be
* deleted.
*/
declare const ORPHAN_SWEEP_AGE_MS: number;
/**
* How old an idempotency key is when it becomes purgeable, in milliseconds: 26 hours, one hour more
* than {@link ORPHAN_SWEEP_AGE_MS}, so the key of an upload attempt is still there when its orphan
* sweep is due. Core documents no age for its own keys, so this is the playbook's.
* `organizations_with_work` hints `idempotency_purge` at this age, and {@link IDEMPOTENCY_PURGE}
* is floored at this age in SQL, so a younger age passed to it is raised to this one.
*/
declare const IDEMPOTENCY_PURGE_AGE_MS: number;
/**
* The least age, in milliseconds, {@link IDEMPOTENCY_PURGE} removes a key at: the same 26 hours as
* {@link IDEMPOTENCY_PURGE_AGE_MS}, so no caller can purge the keys of unswept upload attempts.
*/
declare const IDEMPOTENCY_MIN_PURGE_AGE_MS: number;
/**
* The SQL the playbook service runs against its tables, as text, in the style of the auth
* statements: the integration tests run exactly these strings, the README prints exactly these
* strings (a unit test fails when they differ), and every time is `clock_timestamp()` evaluated
* by the database, so the services pass durations, never points in time. The one exception is
* {@link CONSUMED_PURGE}, whose `before` is the kit's `ProcessedStore.purge` argument.
*
* Every statement runs inside `withOrganization` for the Organization in `$1` (or `$2` for the
* consumed-message ones), and names that Organization in its own `where` as well, so a statement
* given another Organization's id finds nothing even before row-level security. The strings are
* plain text, not type-checked against the schema: the integration suite is their only guard.
*
* **Lock order is job, then document.** Statements that touch both lock the job row first
* ({@link DOCUMENT_SOFT_DELETE} forces this with a data dependency), so a delete racing a job
* statement queues rather than deadlocks. A deadlock (SQLSTATE 40P01) is still possible in
* theory; callers retry it with a bounded, jittered retry.
*
* Every batch size and page size is clamped in SQL (to {@link PLAYBOOK_MAX_BATCH} or
* {@link DOCUMENT_LIST_MAX_PAGE}, and to at least 1, null included).
*
* All statements assume READ COMMITTED, the default: several of them rely on Postgres
* re-checking the `where` against the newest row version once a lock is granted.
*/
/**
* Take the Organization's upload lock for the transaction: run it first in a transaction that
* inserts a document, so two uploads of one Organization queue and the quota check in
* {@link DOCUMENT_INSERT} (a later statement, with its own snapshot) sees the earlier upload's
* counts. `$1` Organization. Always returns one row; the lock ends with the transaction.
*
* **Order matters:** every upload transaction must insert its idempotency key
* ({@link IDEMPOTENCY_BEGIN}) *before* it takes this lock. The key insert takes the orphan-sweep
* hint; erasure, `ORPHAN_SWEEP_DONE` and uploads cannot wait on each other in a cycle only while
* uploads go hint first, then this lock.
*/
declare const QUOTA_LOCK = "select pg_advisory_xact_lock(hashtextextended($1::text, 0)) is not null as locked";
/**
* The Organization's document and byte counts, soft-deleted documents included, from the counter
* row the `documents` triggers keep: one primary-key read, whatever the Organization's size. No
* row means no document has ever been added: both are zero. `$1` Organization. node-postgres
* returns the two bigints as strings.
*/
declare const QUOTA_USAGE = "select document_count, byte_count\nfrom playbook.organization_usage\nwhere organization_id = $1";
/**
* Add a document and queue its ingestion in one write, after {@link QUOTA_LOCK}. `$1` Organization,
* `$2` document id, `$3` name, `$4` SHA-256 of the content (32 bytes), `$5` size in bytes, `$6`
* declared type, `$7` detected type, `$8` uploader, `$9` object key, `$10` job id, `$11` the most
* documents and `$12` the most bytes the Organization may hold after this one (the quota, from
* configuration). A row back means the document exists as `uploaded` with a queued job. No row
* means a quota would be passed, or a document with that content hash whose purge has not
* started exists (the hash is unique among those): read {@link DOCUMENT_BY_HASH}; a row there is
* the duplicate (restore it if `deleted`, {@link DOCUMENT_REQUEUE} it if `failed`), none means the quota.
* A document whose purge has started, or that erasure has barred from restore, does not block a
* new one with the same content.
*/
declare const DOCUMENT_INSERT = "with ins as (\n  insert into playbook.documents\n    (id, organization_id, name, content_hash, size_bytes, declared_type, detected_type, uploaded_by, object_key)\n  select $2::text, $1::text, $3::text, $4::bytea, $5::bigint, $6::text, $7::text, $8::text, $9::text\n  where coalesce((select document_count from playbook.organization_usage where organization_id = $1), 0) < $11::bigint\n    and coalesce((select byte_count from playbook.organization_usage where organization_id = $1), 0) + $5::bigint <= $12::bigint\n  on conflict (organization_id, content_hash) where purge_started_at is null and restore_barred_at is null do nothing\n  returning id, organization_id, epoch),\nqueued as (\n  insert into playbook.ingestion_jobs (id, organization_id, document_id, epoch, next_attempt_at)\n  select $10::text, organization_id, id, epoch, clock_timestamp() from ins)\nselect id, epoch from ins";
/**
* Find the document an upload duplicates: the one with that content hash in the Organization
* whose purge has not started and that is not barred from restore, in any state. `$1` Organization,
* `$2` content hash.
*/
declare const DOCUMENT_BY_HASH = "select id, state, epoch, deletion_seq\nfrom playbook.documents\nwhere organization_id = $1 and content_hash = $2::bytea and purge_started_at is null and restore_barred_at is null";
/**
* The public columns of a document, in the order every document read returns them:
* {@link DOCUMENT_GET}, {@link DOCUMENT_LIST}, {@link DOCUMENT_LIST_DELETED} and
* {@link DOCUMENT_LIST_FILTERED} select exactly these plus `not_restorable`, so a listed row is
* never read a second time and the reads cannot drift apart.
*/
declare const DOCUMENT_ROW_FIELDS: readonly ["id", "name", "state", "size_bytes", "declared_type", "detected_type", "uploaded_by", "failure_reason", "epoch", "deletion_seq", "deleted_at", "deleted_by", "purge_due_at", "purge_started_at", "page_count", "created_at", "updated_at", "not_restorable"];
/** One row of {@link DOCUMENT_GET} or of any document list; times are the database's own values. */
interface DocumentRow {
	id: string;
	name: string;
	state: "uploaded" | "processing" | "ready" | "failed" | "deleted";
	size_bytes: number | string;
	declared_type: string;
	detected_type: string;
	uploaded_by: string;
	failure_reason: string | null;
	epoch: number;
	deletion_seq: number;
	deleted_at: Date | null;
	deleted_by: string | null;
	purge_due_at: Date | null;
	purge_started_at: Date | null;
	page_count: number | null;
	created_at: Date;
	updated_at: Date;
	not_restorable: boolean;
}
/**
* One page of the Organization's documents that are not deleted, newest first. `$1` Organization,
* `$2` and `$3` the cursor, the `created_at` and `id` of the last row of the previous page (pass
* `'infinity'` and `''` for the first page), `$4` the page size, cut to {@link DOCUMENT_LIST_MAX_PAGE}.
* Served by `documents_list_idx`, read backwards, with no sort. Carry the cursor as the database's
* own text form of `created_at` (`created_at::text`), not a JavaScript Date, which drops the
* microseconds and would skip rows created within the same millisecond. Rows carry every column
* of {@link DOCUMENT_ROW_FIELDS}, as {@link DOCUMENT_GET} does.
*/
declare const DOCUMENT_LIST: string;
/**
* One page of the Organization's soft-deleted documents, newest first by `created_at` then `id`,
* the same keyset and cursor rules as {@link DOCUMENT_LIST}, with the deletion fields. `$1`
* Organization, `$2` and `$3` the cursor (`'infinity'` and `''` for the first page), `$4` the page
* size, clamped to 1..{@link DOCUMENT_LIST_MAX_PAGE}, null included. Served by
* `documents_deleted_list_idx`, read backwards, with no sort. Rows carry every column of
* {@link DOCUMENT_ROW_FIELDS}, including the database-computed `not_restorable`.
*/
declare const DOCUMENT_LIST_DELETED: string;
/**
* One page of the Organization's documents with an optional state filter, in one call: `$1`
* Organization, `$2` and `$3` the cursor (`'infinity'` and `''` for the first page), `$4` the page
* size (clamped to 1..{@link DOCUMENT_LIST_MAX_PAGE}), `$5` the state or null. Null lists every
* document that is not deleted, as {@link DOCUMENT_LIST}; `uploaded`, `processing`, `ready` and
* `failed` list that state; `deleted` lists the deleted documents, as {@link DOCUMENT_LIST_DELETED};
* any other value lists nothing. Newest first by `created_at` then `id`, the same keyset and cursor
* rules as {@link DOCUMENT_LIST}, every row with all of {@link DOCUMENT_ROW_FIELDS}. Each value is
* served by one index read backwards with no sort and no pass over other states' rows: null by
* `documents_list_idx`, a live state by `documents_state_list_idx` (equality on the state, then the
* keyset), `deleted` by `documents_deleted_list_idx`. The three branches are guarded by `$5`, so
* only the matching one runs. The state branch repeats the literal `state <> 'deleted'` of the partial
* index's predicate: under a generic plan `state = $5` alone does not prove it, and the index would
* be unusable.
*/
declare const DOCUMENT_LIST_FILTERED: string;
/**
* One document by id with everything the service answers and publishes with: every column of
* {@link DOCUMENT_ROW_FIELDS} (the public columns, `failure_reason`, `page_count`, `epoch`,
* `deletion_seq`, `deleted_at`, `deleted_by`, `purge_due_at` and `purge_started_at`). `$1`
* Organization, `$2` document. No row means no such document (never
* existed, or purged). `not_restorable` is computed by the database clock, so the service never
* compares the purge time with its own: it is true for a `deleted` document whose `purge_due_at`
* has passed, whose purge has started or that erasure barred from restore. It agrees with {@link DOCUMENT_RESTORE}: when the explicit
* restore returns no row and this read shows `state = 'deleted'`, the answer is 410
* `not_restorable`; no row from this read is 404. (The two reads are separate statements, so a
* document due between them can show `not_restorable` false right after a refused restore: ask
* again.)
*/
declare const DOCUMENT_GET: string;
/**
* What Postgres says about the documents a search hit (hub #98): `$1` Organization, `$2` an array of
* document ids. One row per id that is a document of that Organization, in id order: `id`, `name`,
* `state` and `epoch`, read as {@link DOCUMENT_GET} reads them. The playbook drops a hit unless
* `state = 'ready'` and `epoch` equals the vector's epoch, so a deleted or replaced (older epoch)
* document is dropped. Another Organization's ids, unknown ids, an empty array and a null array give
* no row. **The statement reads at most {@link MAX_DOCUMENT_SEARCH_STATE_IDS} ids**: it takes the first
* 100 and does not refuse the rest (a plain statement cannot raise), so the caller must pass at most
* 100. Served by `documents_pkey (organization_id, id)`. Metadata only, no text.
*/
declare const DOCUMENT_SEARCH_STATE = "select id, name, state, epoch\nfrom playbook.documents\nwhere organization_id = $1 and id = any(($2::text[])[1:100])\norder by id";
/**
* Soft delete: hide the document at once and set when it may be purged, in one write. `$1`
* Organization, `$2` document, `$3` who deleted it, `$4` the retention in milliseconds, raised to
* {@link DOCUMENT_MIN_RETENTION_MS}. The purge-due time is the database clock plus the retention.
* The same statement cancels the document's queued or running job (a running job's lease end is
* kept as a fence: {@link DOCUMENT_CLEANUP_BEGIN} waits for it), bumps `epoch` and bumps
* `deletion_seq` by one; the returned `deletion_seq` is what the vector cleanup job is queued
* with. `changed` is true when this call deleted it. Deleting an already deleted document is
* idempotent: it returns the existing `deletion_seq` and `purge_due_at` with `changed` false and
* writes nothing. No row means no such document, or this call lost a race with another delete
* (its snapshot predates the other's commit): run it once more. The row carries `state`
* (`deleted`), `deletion_seq` (publish the cleanup message with it) and `purge_due_at`. Against {@link DOCUMENT_RESTORE}
* and {@link DOCUMENT_PURGE_CLAIM} the row lock decides: whichever takes it first wins and the
* other re-reads the new row; a purge never claims a document that this has not yet deleted.
*
* It cancels the jobs it can see; a job a concurrent restore or requeue commits after this
* statement's snapshot is cancelled by {@link INGESTION_JOB_CLAIM}, which takes only jobs of a
* live document at the job's epoch.
*/
declare const DOCUMENT_SOFT_DELETE = "with j as (\\n  update playbook.ingestion_jobs\\n  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp(),\\n      next_attempt_at = case when state = 'running' then next_attempt_at else clock_timestamp() end\\n  where organization_id = $1 and document_id = $2 and state in ('queued', 'running')\\n  returning id),\\nd as (\\n  update playbook.documents\\n  set state = 'deleted', epoch = epoch + 1, deletion_seq = deletion_seq + 1,\\n      deleted_at = clock_timestamp(), deleted_by = $3,\\n      purge_due_at = clock_timestamp() + make_interval(secs => greatest(coalesce($4::float8, 0), 3600000) / 1000),\\n      failure_reason = null, updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and state <> 'deleted' and (select count(*) from j) >= 0\\n  returning id, state, deletion_seq, purge_due_at)\\nselect id, state, deletion_seq, purge_due_at, true as changed from d\\nunion all\\nselect id, state, deletion_seq, purge_due_at, false from playbook.documents\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and not exists (select 1 from d)";
/**
* The explicit restore: restore a soft-deleted document and queue its re-ingestion from the kept
* file, in one write: it becomes `processing` with a new queued job, and `purge_due_at` and the
* deletion fields are cleared (the purge time is reset, as for any restore). `$1` Organization,
* `$2` document, `$3` the new job's id. It succeeds only for a `deleted` document whose purge time
* has not passed (`purge_due_at > clock_timestamp()`) and whose purge has not started: the
* contract answers 410 `not_restorable` after the purge time, so this refuses it even while the
* purge has not claimed the document (no row, nothing changed; read {@link DOCUMENT_GET} to tell
* `not_restorable` from `not_found`). A matching upload restores a past-due document with
* {@link DOCUMENT_RESTORE_FOR_UPLOAD} instead. Any job still queued or running for the deleted
* document is cancelled first, so a stale job cannot block the new one. `changed` is true
* when this call restored it. Restoring a document that is not deleted is idempotent: it returns
* its current state with `changed` false. No row means the document is gone, its purge has
* started (a restore after the purge's claim is refused because the file is going or gone), or
* the call lost a race with another restore (its snapshot predates the other's commit): read the
* document to tell, which is what the service does.
*
* **Against the purge.** {@link DOCUMENT_PURGE_CLAIM} and this statement both lock the row. If the
* restore takes it first, the claim skips the locked row, and once the restore commits the claim
* no longer sees a deleted document: the restore wins. If the claim takes it first, this waits,
* then re-checks `purge_started_at is null` on the claimed row, finds it set and returns no row:
* the purge wins. The state is never both.
*/
declare const DOCUMENT_RESTORE: string;
/**
* The restore for an upload that matches a deleted document: as {@link DOCUMENT_RESTORE} but
* without the purge-time check, so it restores a past-due document the purge has not claimed (the
* uploader has just supplied the content again, and the content-hash index would otherwise block
* a new document until the purge). It still refuses once the purge has started, and it resets the
* purge time. Same parameters and result.
*/
declare const DOCUMENT_RESTORE_FOR_UPLOAD: string;
/**
* Re-queue a `failed` document when a matching upload arrives: it goes back to `uploaded` with a
* new queued job. `$1` Organization, `$2` document, `$3` the new job's id. `changed` is true when
* this call re-queued it; a document already `uploaded`, `processing` or `ready` is returned with
* `changed` false and nothing written (idempotent by end state). A `deleted` document gives no
* row: restore it instead. A job left queued or running on the failed document is cancelled first,
* as in {@link DOCUMENT_RESTORE}.
*/
declare const DOCUMENT_REQUEUE = "with j as (\\n  update playbook.ingestion_jobs\\n  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and document_id = $2 and state in ('queued', 'running')\\n    and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = $2 and x.state = 'failed')\\n  returning id),\\nd as (\\n  update playbook.documents\\n  set state = 'uploaded', failure_reason = null, updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and state = 'failed' and (select count(*) from j) >= 0\\n  returning organization_id, id, epoch, deletion_seq),\\nqueued as (\\n  insert into playbook.ingestion_jobs (id, organization_id, document_id, epoch, next_attempt_at)\\n  select $3::text, organization_id, id, epoch, clock_timestamp() from d)\\nselect id, 'uploaded' as state, epoch, deletion_seq, true as changed from d\\nunion all\\nselect id, state, epoch, deletion_seq, false from playbook.documents\\nwhere organization_id = $1 and id = $2 and state in ('uploaded', 'processing', 'ready') and not exists (select 1 from d)";
/**
* Begin the vector cleanup queued for one deletion. `$1` Organization, `$2` document, `$3` the
* `deletion_seq` the job was queued with (returned by {@link DOCUMENT_SOFT_DELETE}). A row back
* means the cleanup still applies: the document is deleted and that deletion is the current one.
* No row means it does not (the document was restored, deleted again under a later sequence, or
* purged): do nothing. The row carries `epoch`: remove the vectors tagged with an epoch up to it
* and no later one, so vectors written by a restore are never touched. `clear` is false while a
* worker may still hold a lease on the document: a cancelled job's kept lease end, or a `running`
* job whose lease has not ended (a claim can race a delete and leave a job running on the deleted
* document; its heartbeat is refused, so its lease ends). Wait and run this again. The check is a
* read; {@link DOCUMENT_CLEANUP_DONE} is what is guarded again at the end.
*/
declare const DOCUMENT_CLEANUP_BEGIN = "select d.id, d.epoch,\\n  not exists (\\n    select 1 from playbook.ingestion_jobs j\\n    where j.organization_id = d.organization_id and j.document_id = d.id\\n      and j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp()) as clear\\nfrom playbook.documents d\\nwhere d.organization_id = $1 and d.id = $2 and d.state = 'deleted' and d.deletion_seq = $3::int";
/**
* One page of the Organization's deleted documents whose vector cleanup is pending: not recorded
* for the current `deletion_seq` ({@link DOCUMENT_CLEANUP_DONE} records it) and not yet purged (a
* purged document is a removed row). Oldest deletion first by `deleted_at` then `id`, so a pass
* visits each once. `$1` Organization, `$2` and `$3` the cursor, the `deleted_at` (as the database's
* text form, `deleted_at::text`) and `id` of the last row of the previous page (`'-infinity'` and
* `''` for the first page), `$4` the page size, clamped to 1..{@link PLAYBOOK_MAX_BATCH}, null
* included. Rows carry `id`, `epoch`, `deletion_seq` (what {@link DOCUMENT_CLEANUP_BEGIN} needs)
* and `deleted_at` (the cursor, and for the service's own settle delay). The predicate is
* {@link PENDING_CLEANUP_PREDICATE}, the one `documents_cleanup_idx` is built on and the
* `cleanup_pending` discovery verification uses; the index (Organization, `deleted_at`, `id`) serves
* the page in order with no sort, under a generic plan too.
*/
declare const DOCUMENT_LIST_PENDING_CLEANUP: string;
/**
* Record that the cleanup of one deletion finished. `$1` Organization, `$2` document, `$3` the
* `deletion_seq`. It applies only to that deletion: a row back means it was recorded (repeating it
* is idempotent); no row means the document was restored or deleted again since, and the cleanup
* is moot. {@link DOCUMENT_PURGE_COMPLETE} refuses a document until its current deletion's
* cleanup is recorded here.
*/
declare const DOCUMENT_CLEANUP_DONE = "update playbook.documents\\nset vectors_removed_seq = $3::int, updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and deletion_seq = $3::int\\nreturning id";
/**
* Claim a batch of documents due for purge as a lease, in a short transaction that commits at
* once; the file and vectors are removed outside any transaction. `$1` Organization, `$2` batch
* size, `$3` the lease in milliseconds (raised to {@link PLAYBOOK_MIN_LEASE_MS}; it must exceed
* the worker's time to remove one file). A document is due when it is `deleted`, its purge-due
* time has passed, no lease is live, and fewer than ${DOCUMENT_PURGE_MAX_ATTEMPTS} claims have
* been made: a spent document is never claimed (the count would pass the table's bound and abort
* the statement, wedging the batch) and drops out of the due index; it stays `deleted` and a person
* reconciles. Claiming sets `purge_started_at` once, which ends restores for good, and counts the
* attempt. A crash leaves the document due again when the lease ends. The rows carry
* `vectors_removed_seq` and `deletion_seq`: if they differ, run {@link DOCUMENT_CLEANUP_BEGIN} and
* {@link DOCUMENT_CLEANUP_DONE} with the `deletion_seq` before completing. Skips rows another
* transaction holds (`for update skip locked`); against a restore see {@link DOCUMENT_RESTORE}:
* a claim whose snapshot predates a restore's commit re-checks `state = 'deleted'` on the newest
* row version once the lock is granted and drops the row.
*/
declare const DOCUMENT_PURGE_CLAIM: string;
/**
* Finish a purge: remove the document's row (its jobs go with it by cascade, and the counters
* fall in the same transaction). `$1` Organization, `$2` document. It succeeds only for a
* `deleted` document whose purge was claimed and whose current deletion's vector cleanup is
* recorded; a row back means the record is gone. No row means one of those does not hold (run the
* cleanup statements, then again), the document is already purged (the file removal before it
* is idempotent, so a repeat is safe), or a worker may still hold a lease on one of its jobs (a
* `running` job with an unexpired lease, left by a claim that raced the delete): wait out the lease
* as {@link DOCUMENT_CLEANUP_BEGIN} does and run it again. Run it after the file is removed from storage.
*
* **Lock order.** The statement locks the document's job rows first (`for update`) and the document
* row second, the same order as {@link INGESTION_JOB_CLAIM} and the delete, so the cascade that
* removes the jobs finds them already locked and an immediate purge of a just-erased document cannot
* deadlock with a claim (it waits for the claim's short transaction instead). The lease check reads
* the job rows as locked, so it sees a claim that committed while this one waited.
*/
declare const DOCUMENT_PURGE_COMPLETE = "with jl as (\\n  select state, next_attempt_at from playbook.ingestion_jobs\\n  where organization_id = $1 and document_id = $2\\n  for update)\\ndelete from playbook.documents\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is not null\\n  and vectors_removed_seq = deletion_seq\\n  and not exists (select 1 from jl where jl.state = 'running' and jl.next_attempt_at > clock_timestamp())\\nreturning id, size_bytes";
/**
* Claim due ingestion jobs as a lease, in a short transaction that commits at once. `$1`
* Organization, `$2` batch size, `$3` the lease in milliseconds (raised to
* {@link PLAYBOOK_MIN_LEASE_MS}; it must exceed the time between heartbeats), `$4` one job id to
* claim, or null for any. A job is due when it is `queued` (its `next_attempt_at` is the due time)
* or `running` with a lapsed lease. Each claim counts an attempt, issues a new `claim_token` that
* every later statement for the job must present (a worker whose lease lapsed holds a stale
* token and is refused), and moves an `uploaded` document to `processing`. A job that has used
* all ${INGESTION_JOB_MAX_ATTEMPTS} attempts is never claimed (the count would pass the table's
* bound and abort the statement, wedging the batch); {@link INGESTION_JOB_GIVE_UP_SPENT}
* resolves it. The service gives up on its own earlier, at its own limit below the bound, with
* {@link INGESTION_JOB_FAIL}. **A job is claimed only while its document is `uploaded` or
* `processing` at the job's `epoch`**: the claim reads the document, and a due job whose document
* is deleted, failed, ready, gone or at another epoch is cancelled in the same statement and not
* returned (this covers a job a restore or requeue committed while a delete was already waiting
* for the document, which the delete's own cancel could not see). It locks the job row (`for
* update of j skip locked`) and then the document row, in the delete's order (job before
* document): the document update moves an `uploaded` document to `processing` and touches a
* `processing` one, and it **re-checks the document after any wait**: if a delete took the
* document while the claim waited, the document is no longer live at that epoch, it is not
* updated and the job is not returned. (That job stays `running` with its lease on the deleted
* document, which {@link INGESTION_JOB_HEARTBEAT} and {@link INGESTION_JOB_ADVANCE} refuse and
* {@link DOCUMENT_CLEANUP_BEGIN} waits out; it is cancelled by the next claim once the lease lapses.)
*
* **Rows.** Each claimed job is a row; every row also carries `cancelled`, the number of stale jobs
* this call cancelled (their slots count against the batch), and `lost`, the number of jobs it
* claimed whose document a concurrent delete took before the claim could touch it (those stay
* `running` on the deleted document until their lease lapses). When no job is returned but either
* count is above zero, one signal row comes back with a null `id`: that is not an empty queue. The
* worker claims again at once when either count is above zero; no rows at all means nothing was
* due. Read the rows with {@link claimedJobs}.
*
* **Locks and timeouts.** The claim waits on a document row lock per claimed job while it holds the
* batch's job locks, so the service runs it with a short `lock_timeout` (for example `set local
* lock_timeout = '1s'` in its transaction; a wait that long raises `55P03` and rolls the claim
* back, leaving the jobs unclaimed for the next sweep) and keeps every transaction that locks a
* document short: no queue publish and no other network call inside one.
*/
declare const INGESTION_JOB_CLAIM: string;
/** One row of {@link INGESTION_JOB_CLAIM}: a claimed job, or (with a null `id`) the signal row. */
interface IngestionJobClaimRow {
	id: string | null;
	document_id: string | null;
	epoch: number | null;
	step: string | null;
	attempts: number | null;
	claim_token: string | null;
	artifact_key: string | null;
	page_count: number | null;
	chunk_count: number | null;
	chunks_done: number | null;
	cancelled: number;
	lost: number;
}
/** A claimed job as {@link claimedJobs} returns it: a claim row whose `id` is known to be set. */
type ClaimedIngestionJob = IngestionJobClaimRow & {
	id: string;
	document_id: string;
};
/**
* Read the rows of {@link INGESTION_JOB_CLAIM}: the claimed jobs (the signal row dropped) and the
* counts of stale jobs it `cancelled` and of jobs it `lost` to a concurrent delete. The worker
* claims again at once when `cancelled` or `lost` is above zero, even with no job.
*/
declare function claimedJobs(rows: readonly IngestionJobClaimRow[]): {
	jobs: ClaimedIngestionJob[];
	cancelled: number;
	lost: number;
};
/**
* Extend a job's lease while a step runs. `$1` Organization, `$2` job, `$3` the claim token, `$4`
* the new lease in milliseconds from now. No row means the claim was lost: the lease lapsed and
* another worker took the job, or the job was cancelled by a delete or ended, or its document is
* no longer live at the job's epoch (deleted, failed, ready, gone or restored under a newer epoch,
* which includes a job a claim left running on a document a concurrent delete took). The worker
* stops and writes nothing more.
*/
declare const INGESTION_JOB_HEARTBEAT: string;
/**
* Record progress and extend the lease. `$1` Organization, `$2` job, `$3` the claim token, `$4`
* the next step to run (it may repeat the current one but never go back), `$5` the object key of
* the parsed intermediate, `$6` the page count, `$7` the chunk count, `$8` chunks done, `$9` the
* lease in milliseconds. A null `$5` to `$8` leaves that value as it is. The table refuses chunks
* done above the chunk count. No row means the claim was lost, the document is no longer live at the job's epoch (as for
* {@link INGESTION_JOB_HEARTBEAT}), or the step would go backwards.
*/
declare const INGESTION_JOB_ADVANCE: string;
/**
* Give a failed attempt back for a later one. `$1` Organization, `$2` job, `$3` the claim token,
* `$4` the delay in milliseconds before it is due again (cut to
* {@link INGESTION_MAX_RETRY_DELAY_MS}; the service jitters it). The job returns to `queued` and
* keeps its step and counts, so it resumes. No row means the claim was lost.
*/
declare const INGESTION_JOB_RETRY = "update playbook.ingestion_jobs\\nset state = 'queued', claim_token = null,\\n    next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), 3600000) / 1000),\\n    updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'\\nreturning id, attempts";
/**
* Finish a job and make its document `ready`, in one write, with the document's `page_count` set
* from the job's (the count the worker recorded with {@link INGESTION_JOB_ADVANCE}; null if none).
* `$1` Organization, `$2` job, `$3` the claim token. No row means the claim was lost (including a cancel by a delete) or the document is
* no longer `processing` at the job's epoch: the document is not touched. A job that wins this over a concurrent delete is impossible: the delete
* cancels the job and takes the job row first.
*/
declare const INGESTION_JOB_COMPLETE = "with j as (\\n  update playbook.ingestion_jobs\\n  set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'\\n    and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = ingestion_jobs.document_id\\n                and x.state = 'processing' and x.epoch = ingestion_jobs.epoch)\\n  returning document_id, epoch, page_count),\\nd as (\\n  update playbook.documents\\n  set state = 'ready', page_count = coalesce((select page_count from j), page_count), updated_at = clock_timestamp()\\n  where organization_id = $1 and id = (select document_id from j) and epoch = (select epoch from j)\\n    and state = 'processing')\\nselect document_id from j";
/**
* End a job as failed and make its document `failed` with the reason, in one write. `$1`
* Organization, `$2` job, `$3` the claim token, `$4` the reason (`too_many_pages`, `unreadable`,
* `password_protected`, `no_text` or `processing_failed`; the table rejects any other). The
* document's `page_count` is set from the job's in the same write, so a `too_many_pages` failure
* shows the count when the worker recorded it first with {@link INGESTION_JOB_ADVANCE}. No row
* means the claim was lost.
*/
declare const INGESTION_JOB_FAIL = "with j as (\\n  update playbook.ingestion_jobs\\n  set state = 'failed', failure_reason = $4::text, claim_token = null,\\n      finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'\\n    and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = ingestion_jobs.document_id\\n                and x.state in ('uploaded', 'processing') and x.epoch = ingestion_jobs.epoch)\\n  returning document_id, epoch, page_count),\\nd as (\\n  update playbook.documents\\n  set state = 'failed', failure_reason = $4::text, page_count = coalesce((select page_count from j), page_count),\\n      updated_at = clock_timestamp()\\n  where organization_id = $1 and id = (select document_id from j) and epoch = (select epoch from j)\\n    and state in ('uploaded', 'processing'))\\nselect document_id from j";
/**
* Fail spent jobs, one bounded batch: active jobs that have used every attempt and whose lease
* has ended, so no worker holds them, as `failed` with `processing_failed`, and their documents
* too. It is the safety net behind the service's own limit (which is lower, so in normal
* operation this finds nothing); run it once per sweep after the claim, with a small batch.
* `$1` Organization, `$2` batch size. Skips rows another transaction holds.
*/
declare const INGESTION_JOB_GIVE_UP_SPENT: string;
/**
* Take a message for a consumer (the kit's `ProcessedStore.claim`), in one statement. `$1`
* consumer, `$2` Organization (the all-zero id for a global message), `$3` message id, `$4` a new
* claim token (a uuid the store makes), `$5` the lease in milliseconds (raised to
* {@link PLAYBOOK_MIN_LEASE_MS}). A row back means `claimed` and holds the token. No row means
* read {@link CONSUMED_LOOKUP}: `done`, or `busy`. A claim whose lease has ended is taken over
* with the new token; the old holder's `renew` and `complete` then fail. Run it inside
* `withOrganization` for `$2`.
*/
declare const CONSUMED_CLAIM: string;
/**
* After a {@link CONSUMED_CLAIM} that returned no row: the record's state and, for a `claimed` record
* only, the whole seconds left on its lease, at least 1 (also when the lease has just lapsed);
* `retry_after_seconds` is null for a `done` record. `$1` consumer, `$2` Organization, `$3` message
* id. No row means the record was purged or released in between: claim again. A `claimed` record
* with `retry_after_seconds` 1 may have just lapsed; the consumer retries then.
*/
declare const CONSUMED_LOOKUP = "select state,\\n  case when state = 'claimed'\\n       then greatest(1, ceil(extract(epoch from lease_expires_at - clock_timestamp())))::int end as retry_after_seconds\\nfrom playbook.consumed_message\\nwhere consumer = $1 and organization_id = $2 and message_id = $3";
/**
* Extend a claim (the kit's `ProcessedStore.renew`). `$1` consumer, `$2` Organization, `$3`
* message id, `$4` the token, `$5` the lease in milliseconds from now. A row back means true. No
* row means the claim was lost: it lapsed (even if no one took it over yet) or was taken or
* released.
*/
declare const CONSUMED_RENEW: string;
/**
* Mark a message done (the kit's `ProcessedStore.complete`). `$1` consumer, `$2` Organization,
* `$3` message id, `$4` the token. A row back means true. No row means the claim was lost (another
* consumer took it after the lease lapsed): the kit's contract, which does not check the lease
* here, so a holder that is late but not replaced still completes.
*/
declare const CONSUMED_COMPLETE = "update playbook.consumed_message\\nset state = 'done', completed_at = clock_timestamp(), lease_expires_at = null\\nwhere consumer = $1 and organization_id = $2 and message_id = $3\\n  and claim_token = $4::uuid and state = 'claimed'\\nreturning claim_token";
/**
* Give up a claim (the kit's `ProcessedStore.release`) so the next delivery can take it. `$1`
* consumer, `$2` Organization, `$3` message id, `$4` the token. A lost claim removes nothing.
*/
declare const CONSUMED_RELEASE = "delete from playbook.consumed_message\\nwhere consumer = $1 and organization_id = $2 and message_id = $3\\n  and claim_token = $4::uuid and state = 'claimed'";
/**
* Purge one bounded batch (the kit's `ProcessedStore.purge`), in **one Organization's scope**:
* row-level security hides every other, so the periodic job runs it once per Organization and once
* under the all-zero scope, splitting the limit, and repeats while a batch comes back full.
* Removes `done` records completed before `$2` and `claimed` records whose lease has ended, at
* most `$3`, skipping rows another transaction holds. `$1` Organization, `$2` the cutoff (older
* than the queue's retention, 14 days at most; the kit's argument, the one point in time any
* playbook statement takes from the caller). The row count is the number removed.
*/
declare const CONSUMED_PURGE: string;
/**
* Record the Organization's embedding model and dimension (ADR 0010). `$1` Organization, `$2` the
* model name, `$3` the dimension. A row back means the settings are now those. While no vector
* exists a different model or dimension replaces the old; once {@link INDEX_VECTORS_MARK} has run
* a different one gets **no row** and nothing changes (the choice is to refuse, not to flag a
* re-index; a trigger refuses it for any other statement too). The same values again are
* idempotent and return the row.
*/
declare const INDEX_SETTINGS_UPSERT = "insert into playbook.index_settings as s\n  (organization_id, embedding_model, embedding_dimension)\nvalues ($1, $2, $3::int)\non conflict (organization_id) do update set\n  embedding_model = excluded.embedding_model, embedding_dimension = excluded.embedding_dimension,\n  updated_at = clock_timestamp()\nwhere s.vectors_written_at is null\n   or (s.embedding_model = excluded.embedding_model and s.embedding_dimension = excluded.embedding_dimension)\nreturning embedding_model, embedding_dimension, vectors_written_at";
/**
* Fix the Organization's model and dimension before the first vector is written, and read them
* back. `$1` Organization. A row back holds the model and dimension every vector must use; run it
* at the start of the index step. No row means no settings are recorded (run
* {@link INDEX_SETTINGS_UPSERT} first), or this call lost a race with another mark: run it again.
* A concurrent {@link INDEX_SETTINGS_UPSERT} that wants a different model and a mark exclude each
* other by the row lock: either the upsert commits first and the mark reads its values, or the
* mark does and the upsert gets no row.
*/
declare const INDEX_VECTORS_MARK = "with m as (\n  update playbook.index_settings\n  set vectors_written_at = clock_timestamp(), updated_at = clock_timestamp()\n  where organization_id = $1 and vectors_written_at is null\n  returning embedding_model, embedding_dimension)\nselect embedding_model, embedding_dimension from m\nunion all\nselect embedding_model, embedding_dimension from playbook.index_settings\nwhere organization_id = $1 and vectors_written_at is not null";
/**
* Start an idempotent request: insert its key in flight, inside the transaction that does the
* work. `$1` Organization, `$2` user (`INTERNAL_CALL_USER_ID` for an internal call), `$3` route
* (such as `documents.upload`), `$4` the client's key, `$5` the 32-byte SHA-256 of the request.
* A row back means this call owns the key: do the write and {@link IDEMPOTENCY_COMPLETE} in the
* same transaction, so a crash strands nothing. No row means the key exists, or was inserted by a
* transaction this call waited for: read {@link IDEMPOTENCY_LOOKUP}. Never commit a row in flight.
* A concurrent retry waits on the first transaction's primary-key lock; bound that wait with a
* lock timeout and answer `request.idempotency_in_progress` (409).
*/
declare const IDEMPOTENCY_BEGIN = "insert into playbook.idempotency_keys (organization_id, user_id, route, key, request_hash)\nvalues ($1, $2, $3, $4, $5::bytea)\non conflict (organization_id, user_id, route, key) do nothing\nreturning key";
/**
* Read the stored outcome of a key. `$1` Organization, `$2` user, `$3` route, `$4` key. The row
* carries `request_hash`: a different hash than the request's means the key is reused for another
* request (refuse it); the same hash with a `status` and `response` is a replay (answer the stored
* response); the same hash with a null `status` is still in flight.
*/
declare const IDEMPOTENCY_LOOKUP = "select request_hash, status, response, created_at\nfrom playbook.idempotency_keys\nwhere organization_id = $1 and user_id = $2 and route = $3 and key = $4";
/**
* Complete a key once: store the answer. `$1` Organization, `$2` user, `$3` route, `$4` key, `$5`
* the HTTP status (100 to 599), `$6` the response body as JSON (at most 16384 bytes of text; store
* a body with no secret). No row means the key was already completed (the write-once trigger would
* refuse a rewrite, and `status is null` skips it instead).
*/
declare const IDEMPOTENCY_COMPLETE = "update playbook.idempotency_keys\nset status = $5::smallint, response = $6::jsonb\nwhere organization_id = $1 and user_id = $2 and route = $3 and key = $4 and status is null\nreturning key";
/**
* Purge one bounded batch of an Organization's old keys, inside its scope. `$1` Organization, `$2`
* the least age in milliseconds (raised to {@link IDEMPOTENCY_MIN_PURGE_AGE_MS}, 26 hours: a key
* is the evidence of an upload attempt whose orphan sweep may not have run), `$3` batch size,
* clamped to 1..{@link PLAYBOOK_MAX_BATCH}. Oldest first on `idempotency_keys_purge_idx`, skipping
* rows another transaction holds; repeat until a batch removes none (a short batch does not mean
* the backlog is empty). The row count is the number removed.
*/
declare const IDEMPOTENCY_PURGE: string;
/**
* How old a done consumed message is when it becomes purgeable, in milliseconds: 15 days, above the
* queue's retention (14 days at most, per the kit), because a message younger than the retention
* could still be redelivered. `organizations_with_work` hints `consumed_purge` at this age; a lapsed
* claim is purgeable at its lease end. The cutoff passed to {@link CONSUMED_PURGE} should not be
* younger.
*/
declare const CONSUMED_PURGE_AGE_MS: number;
/**
* The route the remove-all call stores its idempotency key under. Pass it to
* {@link ORGANIZATION_REMOVE_REST} so the call's own key survives the removal it belongs to.
*/
declare const REMOVE_ALL_IDEMPOTENCY_ROUTE = "organizations.remove_all";
/**
* One batch of an erasure: bar the Organization's documents from restore and make them due for
* purge at once, in one write. `$1` Organization, `$2` batch size (clamped to
* 1..{@link PLAYBOOK_MAX_BATCH}), `$3` the actor stored as `deleted_by` (an internal call has no
* user: pass `usr_` and 32 zeros). It takes the first `$2` documents, in id order, that are not yet
* barred (`documents_unbarred_idx`): a live document is soft-deleted as {@link DOCUMENT_SOFT_DELETE}
* does (`epoch` and `deletion_seq` up by one, its queued or running job cancelled, a running job's
* lease end kept as the fence {@link DOCUMENT_CLEANUP_BEGIN} waits for), and an already deleted one
* keeps its sequence and has its purge time pulled forward to now (never pushed back). Every taken
* document gets `restore_barred_at`, so neither restore can bring it back and a re-upload of its
* content creates a new document, and `purge_due_at` is now, so {@link DOCUMENT_PURGE_CLAIM} takes
* it on the next sweep. Erasure overrides retention (ADR 0016).
*
* The rows are the documents taken: `id`, `epoch`, `deletion_seq` and `changed`, true when the
* document's `deletion_seq` is higher than the one this call first read (it deleted a live document,
* or a restore it waited for had brought one back): publish its vector cleanup with that
* `deletion_seq`. False for an already deleted one (its cleanup was published when it was deleted). Repeat until no row comes
* back: the barred documents drop out of the scan, so a repeat is idempotent and a call that finds
* nothing means every document the Organization had when it started is barred or gone. A document
* uploaded meanwhile is taken by a later call; whether the Organization is empty is
* {@link ORGANIZATION_REMOVAL_STATUS}'s answer.
*
* **Locks.** Jobs first, documents second, as the delete does, and each set in id order
* (`order by id for update`), so two batches over the same documents take the same rows in the same
* order and cannot deadlock on each other: the job locks wait for a claim's short transaction, and
* the document locks depend on the job update, so they come after. One erase loop per Organization
* is expected; a `40P01` or `40001` is retried with a bounded, jittered retry. The vector cleanup
* for a `deletion_seq` is idempotent: it may be published twice (a call retried after a lost
* answer, or a restore the batch waited for) and the second does nothing. A job a concurrent restore or requeue commits after this
* statement's snapshot is cancelled by {@link INGESTION_JOB_CLAIM} (the document is no longer live
* at its epoch). A document a concurrent purge claim holds is waited for, then re-read.
*/
declare const DOCUMENT_ERASE_BATCH: string;
/**
* Remove what an Organization has left once it has no document: index settings, the usage row,
* consumed messages, every idempotency key and the work hints (except the orphan sweep's hint, and
* the purge hint of the kept key, which stay). `$1` Organization, `$2` a route whose
* idempotency keys are kept (pass {@link REMOVE_ALL_IDEMPOTENCY_ROUTE}, so the remove-all call's own
* key survives; it ages out through {@link IDEMPOTENCY_PURGE}). Before the keys go it records the
* creation time of the latest upload attempt among them in `orphan_sweeps.erased_attempt_at`, so
* the Organization is still reported for `orphan_sweep` until a sweep covers it; no key content
* remains. Run it inside the
* Organization's scope, in a transaction of its own after the last purge. The one row has `removed`:
* true when nothing is left (also when called again), false, with nothing deleted, while any
* document row exists, soft-deleted ones included. It is a `SECURITY DEFINER` function
* (`playbook.remove_organization_rest`) because the service role may not delete these rows, and it
* acts only on the Organization the transaction is scoped to, so it cannot strip another, and not on
* one that still has a document. It takes the upload lock ({@link QUOTA_LOCK}'s key) first, so an
* upload in flight is seen or waits.
*/
declare const ORGANIZATION_REMOVE_REST = "select playbook.remove_organization_rest($1::text, $2::text) as removed";
/**
* Whether an Organization is fully removed: the answer of the internal remove-all route. `$1`
* Organization. One row: `no_documents`, `no_settings`, `no_usage`, `no_messages` (the
* Organization's own consumed messages), `no_deals`, `no_imports` (a Deal import row, whose report
* rows cannot exist without it), `no_rights` (the rights confirmation), `no_calls` (a Call row, whose jobs cannot exist without it) and `removed`, true when all
* eight hold. Idempotency keys
* are not part of it (the remove-all call's own key stays until it ages out). Run it inside the
* Organization's scope; in any other scope it returns no row, because the tenant tables would
* otherwise look empty and answer "removed" for an Organization the caller cannot see.
*/
declare const ORGANIZATION_REMOVAL_STATUS = "select\n  not exists (select 1 from playbook.documents where organization_id = $1) as no_documents,\n  not exists (select 1 from playbook.index_settings where organization_id = $1) as no_settings,\n  not exists (select 1 from playbook.organization_usage where organization_id = $1) as no_usage,\n  not exists (select 1 from playbook.consumed_message where organization_id = $1) as no_messages,\n  not exists (select 1 from playbook.deals where organization_id = $1) as no_deals,\n  not exists (select 1 from playbook.deal_imports where organization_id = $1) as no_imports,\n  not exists (select 1 from playbook.rights_confirmations where organization_id = $1) as no_rights,\n  not exists (select 1 from playbook.calls where organization_id = $1) as no_calls,\n  (not exists (select 1 from playbook.documents where organization_id = $1)\n    and not exists (select 1 from playbook.index_settings where organization_id = $1)\n    and not exists (select 1 from playbook.organization_usage where organization_id = $1)\n    and not exists (select 1 from playbook.consumed_message where organization_id = $1)\n    and not exists (select 1 from playbook.deals where organization_id = $1)\n    and not exists (select 1 from playbook.deal_imports where organization_id = $1)\n    and not exists (select 1 from playbook.rights_confirmations where organization_id = $1)\n    and not exists (select 1 from playbook.calls where organization_id = $1)) as removed\nwhere $1::text = nullif(current_setting('app.organization_id', true), '')";
/**
* List the documents whose purge reached the attempt bound, one page, for a person to look at. `$1`
* Organization, `$2` the last id of the previous page (`''` for the first), `$3` the page size,
* clamped to 1..{@link DOCUMENT_LIST_MAX_PAGE}. Ordered by id on `documents_spent_purge_idx`. A
* spent document stays `deleted`, counts toward the quota and is never claimed again until
* {@link DOCUMENT_PURGE_RESET} clears it; `object_key` says which file the purge could not remove.
*/
declare const DOCUMENT_LIST_SPENT_PURGES: string;
/**
* Give one spent purge another round: reset its attempt count and lease so
* {@link DOCUMENT_PURGE_CLAIM} takes it again. `$1` Organization, `$2` document. It applies only to
* a `deleted` document whose purge reached the bound; no row means it is not spent (or is gone).
* The document is barred from restore for good (`restore_barred_at`), because its file may be half
* removed; the purge-claim time starts again at the next claim. A person runs it after fixing
* what blocked the purge (the file store, a permission); it is idempotent.
*/
declare const DOCUMENT_PURGE_RESET = "update playbook.documents\\nset purge_attempts = 0, purge_started_at = null, purge_lease_until = null,\\n    restore_barred_at = coalesce(restore_barred_at, clock_timestamp()), updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and purge_attempts >= 20\\nreturning id, purge_attempts";
/**
* Find the Organizations with due work of one kind: `purge_due` (documents due for purge),
* `jobs_due` (jobs queued and due, or running with a lapsed lease, spent ones included),
* `cleanup_pending` (deleted documents whose vector cleanup is not recorded, five minutes after the
* delete), `consumed_purge` (done messages {@link CONSUMED_PURGE_AGE_MS} old, lapsed claims; the
* all-zero global scope is included for this kind only), `idempotency_purge` (keys
* {@link IDEMPOTENCY_PURGE_AGE_MS} old), `purge_spent` (documents whose purge reached the
* bound) and `orphan_sweep` (an Organization with an upload attempt the service has not yet swept
* for orphan objects, {@link ORPHAN_SWEEP_AGE_MS} after that attempt; mark it with
* {@link ORPHAN_SWEEP_DONE}). `$1` the kind, `$2` the point to continue from (null or `''` for the first call), `$3` the
* page size, clamped to 1..{@link PLAYBOOK_MAX_BATCH} here and again inside the function.
*
* **Rows.** Each is an Organization id and `resume_after`, the last hint the call visited. One call
* visits at most four times the page size of hints (stale ones are cleaned as they are met), so its
* work and locks are bounded. When nothing was returned but hints were visited, one marker row has a
* null `organization_id` and the `resume_after`; no rows at all ends the sweep. Read the rows with
* {@link discoveredOrganizations} and call again from `resume_after`. A short page does not end the
* sweep (hints another transaction holds are skipped until the next sweep).
*
* **Rules.** Run it unscoped: inside a tenant-scoped transaction it raises `insufficient_privilege`
* (`42501`). It must be the only statement of its transaction, which commits at once, because it
* holds the visited hints' locks until then. Then run the kind's statement once per id, in that
* Organization's scope. The function is `SECURITY DEFINER` and executable by the playbook role
* only; see the migration for the plan per kind.
*/
declare const ORGANIZATIONS_WITH_WORK: string;
/**
* Mark an Organization's orphan sweep done through a time: `$1` Organization, `$2` the time through
* which stored objects were examined (every object that an upload attempt at or before `$2` could
* have stored was looked at). **Compute `$2` when the sweep starts, not when this is called**: an
* object stored while the sweep ran may have been missed, and a time taken at the end would count
* it as examined. Run it in that Organization's scope (any other scope is refused),
* after the sweep. The database cuts `$2` to {@link ORPHAN_SWEEP_AGE_MS} (25 hours) before now (an
* object younger than that is never counted as swept) and never moves the recorded time back, so a repeat or an older time is harmless.
* Returns `swept_through` (what is recorded) and `more`: true while an upload attempt newer than
* that exists, in which case the work hint stays, due {@link ORPHAN_SWEEP_AGE_MS} after the oldest
* such attempt; false when none does and the hint is removed. It waits for any open upload attempt
* of the Organization (they are short) and then sees the ones that committed meanwhile, so an attempt
* racing the sweep keeps its hint: a hint may be early, never missing. It is
* `playbook.orphan_sweep_done`, `SECURITY DEFINER`, the only writer of `orphan_sweeps`.
*/
declare const ORPHAN_SWEEP_DONE = "select swept_through, more from playbook.orphan_sweep_done($1::text, $2::timestamptz)";
/** One row of {@link ORGANIZATIONS_WITH_WORK}: an Organization with work, or the marker row (null id). */
interface WorkDiscoveryRow {
	organization_id: string | null;
	resume_after: string;
}
/**
* Read the rows of {@link ORGANIZATIONS_WITH_WORK}: the Organizations with work (the marker row
* dropped) and where to continue. `resumeAfter` is null when the call returned no row, which ends
* the sweep; otherwise pass it as the next call's `$2`.
*/
declare function discoveredOrganizations(rows: readonly WorkDiscoveryRow[]): {
	organizations: string[];
	resumeAfter: string | null;
};
/** The names of the columns of a Deal answer, for the service's row type. */
declare const DEAL_ROW_FIELDS: readonly ["id", "deal_id", "name", "outcome", "outcome_seq", "closed_at", "amount", "currency", "appeared_in_import", "created_at", "updated_at", "call_count"];
/**
* Read one Deal by its opaque id. `$1` Organization, `$2` the `deal_…` id. No row when absent. The
* `call_count` is the Deal's live Calls (see the list statements).
*/
declare const DEAL_GET: string;
/**
* Look a Deal up by the customer's own deal id. `$1` Organization, `$2` the deal id, trimmed by the
* caller and otherwise exact: the comparison is byte for byte, so `A-1` and `a-1` are two Deals
* (`deals_deal_id_key`, one index read). No row when none has that id.
*/
declare const DEAL_BY_DEAL_ID: string;
/**
* List the Deals, newest first, one page by keyset. `$1` Organization, `$2` and `$3` the
* `cursor_at` (text, never a Date) and `id` of the last row of the previous page (`'infinity'` and
* `''` for the first). A malformed cursor text raises SQLSTATE 22007 (`invalid_datetime_format`): the
* service maps it to a validation error. Each row carries `cursor_at`, the text of `created_at` to pass back,
* `$4` the page size, clamped to 1..{@link DOCUMENT_LIST_MAX_PAGE}. On `deals_list_idx`, read
* backwards.
*/
declare const DEAL_LIST: string;
/** {@link DEAL_LIST} for one Outcome (`$5`: `won`, `lost` or `open`), on `deals_outcome_list_idx`. */
declare const DEAL_LIST_BY_OUTCOME: string;
/**
* {@link DEAL_LIST} for Deals that did (`$5` true) or never did (`$5` false) appear in an import, on
* `deals_import_list_idx`: the second is the list of Deals only a Call upload created, where a typo
* shows.
*/
declare const DEAL_LIST_BY_IMPORT_FLAG: string;
/**
* Set a Deal's Outcome (an Owner or Admin may set or correct any Deal's, ADR 0018 choice 5). `$1`
* Organization, `$2` the Deal, `$3` the Outcome, `$4` the closing date (`YYYY-MM-DD`, a calendar date with no time or zone; a full timestamp is cut to its date text) and `$5` whether to set it
* (false leaves `closed_at` as it is; true with a null `$4` clears it). The row is locked first, so
* two changes queue and each sees the other's result. When the Outcome or the closing time
* changes, `outcome_seq` rises by exactly one in the same write (a trigger refuses any other
* move); when nothing changes it does not, so a repeat is idempotent and publishes nothing. The
* answer is the Deal's state after the call with `changed`; no row when the Deal does not exist.
* Publish the Outcome-changed message with the returned `outcome_seq` when `changed`.
*/
declare const DEAL_SET_OUTCOME: string;
/** The Deal count of an Organization, kept by a trigger: the quota check reads this one row. */
declare const DEAL_USAGE = "select deal_count\nfrom playbook.organization_usage\nwhere organization_id = $1";
/**
* Record an uploaded CSV as a Deal import and queue its job, unless the Organization already has
* {@link MAX_QUEUED_DEAL_IMPORTS} unfinished imports. `$1` Organization, `$2` the new `dimp_…` id,
* `$3` the uploader, `$4` the object key the CSV was stored under, `$5` its size in bytes (1 to 10
* MiB). One call to `playbook.insert_deal_import`, which takes an advisory lock on the Organization's
* import cap, **then** counts the imports in `uploaded` or `processing` and inserts, as separate
* statements inside the function, so each sees the commits that the lock waited for (a single SQL
* statement could not: its snapshot is taken before the wait). One row, `result`: `created`, with
* the import's columns, or `busy`, with those columns null and **nothing stored** (the service
* removes the CSV it already stored and answers `409`). Run it in the transaction of the upload's
* idempotency key ({@link IDEMPOTENCY_BEGIN} first, then this): the key insert is what lets the
* orphan sweep see a CSV whose outcome was unknown. The lock is held to the end of the transaction
* and is the Organization's alone (it is not {@link QUOTA_LOCK}): two imports of one Organization
* uploading at once queue, and imports of other Organizations never wait. The trigger notes the
* `import_apply` hint.
*/
declare const DEAL_IMPORT_INSERT = "select * from playbook.insert_deal_import($1::text, $2::text, $3::text, $4::text, $5::bigint, 5)";
/** Read one Deal import. `$1` Organization, `$2` the `dimp_…` id. No row when absent or erased. */
declare const DEAL_IMPORT_GET = "select id, state, failure_reason,\\n  case when state = 'completed' then row_count end as row_count,\\n  case when state = 'completed' then applied_count end as applied_count,\\n  case when state = 'completed' then rejected_count end as rejected_count,\\n  uploaded_by, created_at, updated_at\\nfrom playbook.deal_imports\\nwhere organization_id = $1 and id = $2 and erased_at is null";
/**
* List the Deal imports, newest first, by keyset: `$1` Organization, `$2` and `$3` the cursor (the
* last row's `cursor_at`, a text, never a Date, and `id`; `'infinity'` and `''` first), `$4` the page size, clamped to 1..{@link DOCUMENT_LIST_MAX_PAGE}.
* On `deal_imports_list_idx`.
*/
declare const DEAL_IMPORT_LIST: string;
/**
* Claim due import jobs under a lease, as {@link INGESTION_JOB_CLAIM} does for documents: `$1`
* Organization, `$2` how many (clamped to 1..{@link PLAYBOOK_MAX_BATCH}), `$3` the lease in
* milliseconds (raised to {@link PLAYBOOK_MIN_LEASE_MS}). It takes `uploaded` imports and
* `processing` ones whose lease lapsed, never an erased one and never one at the attempt bound
* ({@link DEAL_IMPORT_GIVE_UP_SPENT} fails those), skipping rows another transaction holds. Each
* row carries the `claim_token` that fences every later write and `last_row_number`, the highest
* report row recorded (null for none). The report is always contiguous from row 2: send the next
* batch from the row after it. Rows at or below it are never read again.
*/
declare const DEAL_IMPORT_CLAIM: string;
/**
* Extend the lease of a claimed import: `$1` Organization, `$2` the import, `$3` the claim token,
* `$4` the new lease in milliseconds. No row when the token no longer holds (the import was
* claimed again, finished or erased): stop.
*/
declare const DEAL_IMPORT_HEARTBEAT: string;
/**
* Give a claimed import back to the queue after a failure that may pass: `$1` Organization, `$2`
* the import, `$3` the claim token, `$4` the delay in milliseconds (cut to
* {@link INGESTION_MAX_RETRY_DELAY_MS}). Rows already recorded stay; the next claim resumes.
*/
declare const DEAL_IMPORT_RETRY = "update playbook.deal_imports\\nset state = 'uploaded', claim_token = null,\\n    next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), 3600000) / 1000),\\n    updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null\\nreturning id, attempts";
/**
* Apply one bounded batch of CSV rows to the Deals and record the report, in one statement. `$1`
* Organization, `$2` the import, `$3` the claim token, `$4` a JSON array of rows, `$5` the
* Organization's Deal limit (the service's number, ADR 0018 leaves it to the ticket), `$6` how many
* rows to take (clamped to 1..{@link DEAL_IMPORT_APPLY_BATCH}; the first rows by row number are
* taken and the answer's `taken` says how many). Each element is
* `{row_number, deal_id, reason, outcome, closed_at, amount, currency, name}` (`closed_at` a `YYYY-MM-DD` date) as the contract's
* `checkDealImportRow` produced it: `reason` is its rejection or null, `deal_id` is null only for
* `invalid_deal_id`, `wrong_column_count` and `blank_row` (a row with no cells), a blank cell is null. **Run {@link QUOTA_LOCK} first
* in the same transaction** (the statement refuses without it), so the Deal count and the existing
* Deals are read after the lock.
*
* **Order.** The report is contiguous from row 2 (the header is row 1): the import row keeps
* `report_through`, the highest row number in it, and a check ties `applied_count + rejected_count`
* to `report_through - 1`. The statement reads only the rows numbered `report_through + 1`,
* `report_through + 2` and so on without a gap (a row at or below `report_through` is skipped, so a
* batch resent after a lost answer changes nothing; a row after a gap is not taken) and the answer's
* `taken` says how many it took and `through` the new `report_through`: send the next batch from
* the row after it. A row is therefore judged only after every row before it was judged, which makes
* "the first row of a deal id wins" exact. Every row it takes is decided in the same statement: it
* locks the Deals the batch names (`for update`, in id order, which reads the newest committed version
* after waiting for a concurrent Outcome change), so no row is left undecided; a Deal that
* another transaction decided meanwhile is `outcome_already_decided`. Nothing else inserts a Deal
* without the upload lock, so the insert has no conflict to lose (a conflict, like an undecided
* row, aborts the statement and records nothing). The statement raises
* `playbook.upload_lock` when the transaction does not hold the lock.
*
* Rules, per row in row order: a deal id seen earlier in the file (this batch or an earlier one) is
* `duplicate_in_file`, whatever else is wrong with the repeat; the row's own `reason` is kept; a
* Deal that is `won` or `lost` is `outcome_already_decided`, even for a row that says the same; a
* Deal that is `open` takes the row (the Outcome if the row has one, and the closing time, amount,
* currency and name when the cell is not blank; a blank cell never clears a value; the Outcome
* sequence rises when the Outcome or closing time changes); an unknown deal id creates an open or
* decided Deal (`appeared_in_import` true) unless the count would pass `$5` (`deal_limit_reached`;
* a later row that would create one is refused too). No row at all when the claim token does not hold. The Outcome sequence
* is limited by `DEAL_MAX_SEQ` (the column is a 32-bit integer; a Deal whose sequence is at the
* ceiling cannot take another Outcome change, and the write fails rather than wraps).
*
* **What the service must do.** It counts the CSV's records itself and enforces `too_many_rows`
* ({@link DEAL_IMPORT_MAX_ROWS}) before applying anything, sends each row number once per batch, and
* passes the true data-row count to {@link DEAL_IMPORT_FINISH}. A row number outside 2 to
* `DEAL_IMPORT_MAX_ROWS + 1` or repeated within one batch is refused cleanly: the batch takes
* nothing, records nothing, and the `summary` row's `refusal` is `row_number_range` or
* `row_number_repeated` (null otherwise). A malformed `$4` JSON or a non-integer row number
* raises a data exception (SQLSTATE class 22): a programming error, not data.
*
* The answer: one `summary` row (`taken`, `applied`, `rejected`, `through`, `refusal`) and one
* `outcome_changed` row per Deal this statement moved (`deal_record_id`, `outcome_seq`, read from the
* locked row the import changed, so a portal change made meanwhile never makes a second message):
* publish the Outcome-changed message for each.
*/
declare const DEAL_IMPORT_APPLY: string;
/**
* Finish an import whose rows are all reported: `$1` Organization, `$2` the import, `$3` the claim
* token, `$4` the number of data rows in the CSV. It completes only if the report is contiguous
* through the last row (`report_through = $4 + 1`, and the table check ties the counts to it), else
* returns no row: send the rows after `report_through`. **Remove the stored CSV first**; this records that it is gone (`object_removed_at`). The
* row has the three counts of the contract's import.
*/
declare const DEAL_IMPORT_FINISH = "update playbook.deal_imports\\nset state = 'completed', claim_token = null, row_count = applied_count + rejected_count,\\n    object_removed_at = clock_timestamp(), finished_at = clock_timestamp(), updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null\\n  and report_through = $4::int + 1\\nreturning id, row_count, applied_count, rejected_count";
/**
* End a claimed import as failed with a reason: `$1` Organization, `$2` the import, `$3` the claim
* token, `$4` the reason (`too_many_rows`, `unreadable` or `processing_failed`). Rows already
* applied stay applied and in the report. **Remove the stored CSV first**; this records that it is
* gone.
*/
declare const DEAL_IMPORT_FAIL = "update playbook.deal_imports\\nset state = 'failed', failure_reason = $4::text, claim_token = null,\\n    object_removed_at = clock_timestamp(), finished_at = clock_timestamp(), updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null\\nreturning id";
/**
* Fail the imports that reached the attempt bound ({@link DEAL_IMPORT_MAX_ATTEMPTS}) and whose
* lease lapsed: `$1` Organization, `$2` how many (clamped). The reason is `processing_failed`; the
* rows are `id` and `object_key`, whose stored CSVs the service removes and then records with
* {@link DEAL_IMPORT_OBJECT_REMOVED}.
*/
declare const DEAL_IMPORT_GIVE_UP_SPENT: string;
/**
* Record that the stored CSV of an import is removed: `$1` Organization, `$2` the import. Only for
* an import that ended without finishing through {@link DEAL_IMPORT_FINISH} or
* {@link DEAL_IMPORT_FAIL} (which record it themselves): a spent one from
* {@link DEAL_IMPORT_GIVE_UP_SPENT}, or an erased one from {@link DEAL_IMPORT_ERASE_BATCH}.
* Idempotent.
*/
declare const DEAL_IMPORT_OBJECT_REMOVED = "update playbook.deal_imports\\nset object_removed_at = coalesce(object_removed_at, clock_timestamp()), updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and (erased_at is not null or state = 'failed')\\nreturning id";
/** One page of an import's report by row number: `$1` Organization, `$2` the import, `$3` the last row number of the previous page (0 for the first), `$4` the page size (clamped). On the primary key. */
declare const DEAL_IMPORT_ROWS_LIST: string;
/** {@link DEAL_IMPORT_ROWS_LIST} for one result (`$5`: `applied` or `rejected`), on `deal_import_rows_result_idx`. */
declare const DEAL_IMPORT_ROWS_LIST_BY_RESULT: string;
/**
* One batch of an erasure of Deal imports: `$1` Organization, `$2` batch size (clamped). It takes the
* first imports, in id order, that are not yet erased (`deal_imports_unerased_idx`), marks them
* erased, ends an active one as `failed` with `processing_failed` (its job is fenced: no claim,
* heartbeat, apply or finish holds any more) and returns each as `id`, `object_key` and
* `object_pending`, true when the CSV may still be stored: **remove it, then call
* {@link DEAL_IMPORT_OBJECT_REMOVED}**. An import that ended normally already recorded its removal.
* Repeat until no row comes back. Then purge each with {@link DEAL_IMPORT_PURGE_BATCH}. If the answer
* is lost (a crash, a timeout), the ids are not lost: {@link DEAL_IMPORT_LIST_ERASED} names every
* erased import not yet purged, and an erasure starts by finishing those.
*/
declare const DEAL_IMPORT_ERASE_BATCH: string;
/**
* One page of the imports that are erased and not yet purged, by id: `$1` Organization, `$2` the last
* id of the previous page (`''` for the first), `$3` the page size (clamped to
* 1..{@link DOCUMENT_LIST_MAX_PAGE}). Rows: `id`, `object_key` and `object_pending` (true while the
* CSV is not recorded removed). It is how an erasure interrupted after {@link DEAL_IMPORT_ERASE_BATCH}
* committed is finished, because every other statement filters `erased_at is null` and
* {@link DEAL_IMPORT_PURGE_BATCH} needs the id: **list first, remove each pending CSV and record it
* with {@link DEAL_IMPORT_OBJECT_REMOVED}, purge each import, and only then erase more**. On
* `deal_imports_erased_idx`.
*/
declare const DEAL_IMPORT_LIST_ERASED: string;
/**
* Purge an erased import in bounded steps: `$1` Organization, `$2` the import, `$3` how many report
* rows to delete (clamped). It does nothing unless the import is erased and its stored CSV is
* recorded removed. One call deletes up to `$3` report rows; a call that finds none left deletes the
* import row itself (`import_deleted` true). Repeat until `import_deleted`. The foreign key does not
* cascade, so the import row cannot go while a report row remains.
*/
declare const DEAL_IMPORT_PURGE_BATCH: string;
/**
* Erase one bounded batch of Deals: `$1` Organization, `$2` batch size (clamped); the number deleted
* comes back as `deleted`. Repeat until 0. `playbook.erase_deals` takes the upload lock first (see the
* migration) and runs in the Organization's scope only.
*/
declare const DEAL_ERASE_BATCH = "select playbook.erase_deals($1::text, $2::int) as deleted";
/** The rights confirmation of the Organization: `$1` Organization. No row when none was recorded. */
declare const RIGHTS_GET = "select confirmed_by, confirmed_at, wording_version\nfrom playbook.rights_confirmations\nwhere organization_id = $1";
/**
* Record the rights confirmation (ADR 0018 choice 12): `$1` Organization, `$2` the confirming
* member, `$3` the wording version shown (the service checks it is the current one first). A
* version above the stored one replaces it; the same version keeps the first confirmation (its
* member and time), so a repeat is idempotent; a lower version is ignored. The row is the stored
* confirmation after the call, with `recorded` true when this call wrote it. Whether the stored
* version is the current one is the service's comparison, and the Call upload statement (a later
* migration) takes the current version as a parameter and refuses unless the stored version equals
* it, in the same statement as the insert.
*/
declare const RIGHTS_CONFIRM = "with up as (\n  insert into playbook.rights_confirmations as r (organization_id, confirmed_by, confirmed_at, wording_version)\n  values ($1, $2::text, clock_timestamp(), $3::int)\n  on conflict (organization_id) do update\n    set confirmed_by = excluded.confirmed_by, confirmed_at = excluded.confirmed_at, wording_version = excluded.wording_version\n    where r.wording_version < excluded.wording_version\n  returning confirmed_by, confirmed_at, wording_version)\nselect confirmed_by, confirmed_at, wording_version, true as recorded from up\nunion all\nselect confirmed_by, confirmed_at, wording_version, false\nfrom playbook.rights_confirmations\nwhere organization_id = $1 and not exists (select 1 from up)";
/** Every statement above by name, for the README check and the integration tests. */
declare const PLAYBOOK_STATEMENTS: {
	readonly CALL_USAGE: "select call_count, recording_byte_count\nfrom playbook.organization_usage\nwhere organization_id = $1";
	readonly CALL_INSERT: "with rights as (\\n  select exists (select 1 from playbook.rights_confirmations\\n                 where organization_id = $1 and wording_version = $19::int) as ok),\\ndup as (\\n  select c.id, c.state, c.failure_reason, (d.deal_id = $3::text) as same_deal\\n  from playbook.calls c join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id\\n  where c.organization_id = $1 and c.content_hash = $9::bytea\\n    and c.purge_started_at is null and c.restore_barred_at is null),\\ndeal as (\\n  select id from playbook.deals where organization_id = $1 and deal_id = $3::text),\\nusage as (\\n  select call_count, recording_byte_count, deal_count from playbook.organization_usage where organization_id = $1),\\ngate as (\\n  select (select ok from rights) as rights_ok,\\n    not exists (select 1 from dup) as no_dup,\\n    (coalesce((select call_count from usage), 0) < $16::bigint\\n      and ($7::text <> 'recording' or coalesce((select recording_byte_count from usage), 0) + $8::bigint <= $17::bigint)\\n      and (exists (select 1 from deal) or coalesce((select deal_count from usage), 0) < $18::bigint)) as quota_ok),\\ngo as (\\n  select 1 as one from gate where rights_ok and no_dup and quota_ok),\\nmade as (\\n  insert into playbook.deals (id, organization_id, deal_id)\\n  select $4::text, $1, $3::text from go where not exists (select 1 from deal)\\n  returning id),\\nins as (\\n  insert into playbook.calls\\n    (id, organization_id, deal_record_id, kind, file_name, media_type, size_bytes, content_hash,\\n     uploaded_by, object_key, rep_by, rep_label, rep_channel)\\n  select $2::text, $1, coalesce((select id from deal), (select id from made)), $7::text, $5::text, $6::text,\\n    $8::bigint, $9::bytea, $10::text, $11::text, $12::text, $13::text, $14::text\\n  from go\\n  returning id, state, epoch, rep_seq),\\nqueued as (\\n  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)\\n  select $15::text, $1, id, case when $7::text = 'recording' then 'transcribe' else 'process' end, epoch, rep_seq, clock_timestamp(), clock_timestamp()\\n  from ins)\\nselect 'created' as result, id, state, null::text as failure_reason from ins\\nunion all\\nselect case when same_deal then 'existing' else 'other_deal' end,\\n  case when same_deal then id end, case when same_deal then state end, case when same_deal then failure_reason end\\nfrom dup where (select ok from rights)\\nunion all\\nselect case when not rights_ok then 'rights_required' else 'quota_exceeded' end, null, null, null\\nfrom gate where not rights_ok or (no_dup and not quota_ok)";
	readonly CALL_GET: "select c.id, c.deal_record_id, d.deal_id, d.outcome as deal_outcome,\\n  (c.state = 'ready' and d.outcome = 'won' and c.tagged_outcome_seq >= d.outcome_seq) as in_search,\\n  c.kind, c.file_name, c.media_type, c.size_bytes, c.duration_seconds, c.state, c.failure_reason,\\n  c.rep_by, c.rep_label, c.rep_channel, c.speaker_labels, c.deleted_at, c.purge_due_at,\\n  c.uploaded_by, c.created_at, c.updated_at, c.rep_seq, c.epoch, c.deletion_seq,\\n  (c.state = 'deleted' and (c.purge_due_at <= clock_timestamp() or c.purge_started_at is not null or c.restore_barred_at is not null)) as not_restorable\\nfrom playbook.calls c join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id\\nwhere c.organization_id = $1 and c.id = $2";
	readonly CALL_SEARCH_STATE: "select c.id as call_id,\\n  (c.state = 'ready' and d.outcome = 'won' and c.tagged_outcome_seq >= d.outcome_seq) as in_search,\\n  c.epoch, c.rep_seq, c.deal_record_id\\nfrom playbook.calls c\\njoin playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id\\nwhere c.organization_id = $1 and c.id = any(($2::text[])[1:100])\\norder by c.id";
	readonly CALL_LIST: string;
	readonly CALL_LIST_BY_STATE: string;
	readonly CALL_LIST_BY_DEAL: string;
	readonly CALL_LIST_BY_DEAL_STATE: string;
	readonly CALL_SOFT_DELETE: "with j as (\\n  update playbook.call_jobs\\n  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp(),\\n      next_attempt_at = case when state = 'running' then next_attempt_at else clock_timestamp() end\\n  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')\\n  returning id),\\nx as (\\n  update playbook.calls\\n  set state = 'deleted', epoch = epoch + 1, deletion_seq = deletion_seq + 1,\\n      deleted_at = clock_timestamp(), deleted_by = $3,\\n      purge_due_at = clock_timestamp() + make_interval(secs => greatest(coalesce($4::float8, 0), 3600000) / 1000),\\n      failure_reason = null, updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and state <> 'deleted' and (select count(*) from j) >= 0\\n  returning id, state, deletion_seq, purge_due_at)\\nselect id, state, deletion_seq, purge_due_at, true as changed from x\\nunion all\\nselect id, state, deletion_seq, purge_due_at, false from playbook.calls\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and not exists (select 1 from x)";
	readonly CALL_RESTORE: string;
	readonly CALL_RESTORE_FOR_UPLOAD: string;
	readonly CALL_REQUEUE: "with j as (\\n  update playbook.call_jobs\\n  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')\\n    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = $2 and x.state = 'failed'\\n                and x.failure_reason in ('transcription_failed', 'transcription_timed_out', 'processing_failed')\\n                and x.vendor_send_seq < 20)\\n  returning id),\\nx as (\\n  update playbook.calls\\n  set state = 'uploaded', failure_reason = null, epoch = epoch + 1, updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and state = 'failed'\\n    and failure_reason in ('transcription_failed', 'transcription_timed_out', 'processing_failed')\\n    and vendor_send_seq < 20\\n    and (select count(*) from j) >= 0\\n  returning organization_id, id, epoch, rep_seq, kind, transcript_key),\\nqueued as (\\n  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)\\n  select $3::text, organization_id, id, case when kind = 'recording' and transcript_key is null then 'transcribe' else 'process' end,\\n    epoch, rep_seq, clock_timestamp(), clock_timestamp()\\n  from x)\\nselect id, 'uploaded' as state, epoch, true as changed from x\\nunion all\\nselect id, state, epoch, false from playbook.calls\\nwhere organization_id = $1 and id = $2 and state <> 'deleted' and not exists (select 1 from x)";
	readonly CALL_SET_REP: "with jl as (\\n  select id from playbook.call_jobs\\n  where organization_id = $1 and call_id = $2 and state in ('queued', 'running')\\n  order by id\\n  for update),\\ncur as (\\n  select * from playbook.calls where organization_id = $1 and id = $2 and (select count(*) from jl) >= 0 for update),\\nv as (\\n  select cur.id, cur.state, cur.rep_seq,\\n    case\\n      when $3::text is null or $3::text not in ('speaker', 'channel') then 'invalid'\\n      when cur.state <> 'deleted' and cur.rep_by is not distinct from $3::text\\n        and cur.rep_label is not distinct from (case when $3::text = 'speaker' then $4::text end)\\n        and cur.rep_channel is not distinct from (case when $3::text = 'channel' then $5::text end)\\n        and cur.state <> 'failed' then 'unchanged'\\n      when not (cur.state in ('ready', 'awaiting_rep')\\n                or (cur.state = 'failed' and cur.failure_reason in ('rep_label_not_found', 'not_per_side')))\\n        then 'not_changeable'\\n      when not coalesce(($3::text = 'speaker' and ($4::text is not null and $4::text = any(cur.speaker_labels)))\\n                or ($3::text = 'channel' and cur.kind = 'recording' and $5::text in ('left', 'right')), false) then 'invalid'\\n      else 'changed'\\n    end as result\\n  from cur),\\nj as (\\n  update playbook.call_jobs\\n  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and id in (select id from jl)\\n    and exists (select 1 from v where result = 'changed')\\n  returning id),\\nu as (\\n  update playbook.calls c\\n  set rep_by = $3::text, rep_label = case when $3::text = 'speaker' then $4::text end,\\n      rep_channel = case when $3::text = 'channel' then $5::text end,\\n      rep_seq = c.rep_seq + 1, state = 'processing', failure_reason = null, updated_at = clock_timestamp()\\n  from v\\n  where c.organization_id = $1 and c.id = v.id and v.result = 'changed' and (select count(*) from j) >= 0\\n  returning c.id, c.rep_seq, c.epoch),\\nqueued as (\\n  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)\\n  select $6::text, $1, id, 'rebuild', epoch, rep_seq, clock_timestamp(), clock_timestamp() from u)\\nselect 'changed' as result, id, 'processing'::text as state, rep_seq from u\\nunion all\\nselect result, id, state, rep_seq from v where result <> 'changed'";
	readonly CALL_JOB_CLAIM: string;
	readonly CALL_JOB_HEARTBEAT: string;
	readonly CALL_JOB_RETRY: "update playbook.call_jobs\\nset state = 'queued', claim_token = null,\\n    next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), 3600000) / 1000),\\n    updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'\\nreturning id, attempts";
	readonly CALL_SENT_TO_VENDOR: string;
	readonly CALL_JOB_RECORD: string;
	readonly CALL_JOB_TRANSCRIBED: "with j as (\\n  update playbook.call_jobs\\n  set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running' and kind = 'transcribe'\\n    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id\\n                and x.state = 'transcribing' and x.epoch = call_jobs.epoch and x.transcript_key is not null)\\n  returning call_id, epoch),\\nc as (\\n  update playbook.calls\\n  set state = case when rep_by is null then 'awaiting_rep' else 'processing' end, updated_at = clock_timestamp()\\n  where organization_id = $1 and id = (select call_id from j) and epoch = (select epoch from j) and state = 'transcribing'\\n  returning id, state, epoch, rep_seq),\\nq as (\\n  insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)\\n  select $4::text, $1, id, 'process', epoch, rep_seq, clock_timestamp(), clock_timestamp() from c where state = 'processing')\\nselect id, state from c";
	readonly CALL_JOB_COMPLETE: "with dk as (\\n  select d.id, d.outcome_seq from playbook.deals d\\n  where d.organization_id = $1\\n    and d.id = (select x.deal_record_id from playbook.calls x join playbook.call_jobs y\\n                  on y.organization_id = x.organization_id and y.call_id = x.id\\n                where y.organization_id = $1 and y.id = $2)\\n  for no key update),\\nj as (\\n  update playbook.call_jobs\\n  set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running' and kind in ('process', 'rebuild')\\n    and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id\\n                and x.state = 'processing' and x.epoch = call_jobs.epoch\\n                and (call_jobs.kind = 'process' or x.rep_seq = call_jobs.rep_seq)\\n                and x.rep_by is not null and (x.rep_by <> 'speaker' or x.rep_label = any(x.speaker_labels)))\\n  returning call_id, epoch),\\nc as (\\n  update playbook.calls c\\n  set state = 'ready', tagged_outcome_seq = greatest(c.tagged_outcome_seq, least($4::int, dk.outcome_seq)), updated_at = clock_timestamp()\\n  from j, dk\\n  where c.organization_id = $1 and c.id = j.call_id and c.epoch = j.epoch and c.state = 'processing'\\n    and dk.id = c.deal_record_id\\n  returning c.id, c.deal_record_id, c.tagged_outcome_seq),\\ndl as (\\n  update playbook.deals d\\n  set retag_through = least(d.retag_through, c.tagged_outcome_seq)\\n  from c, dk\\n  where d.organization_id = $1 and d.id = c.deal_record_id and dk.id = d.id and c.tagged_outcome_seq < dk.outcome_seq\\n  returning d.id)\\nselect id from c";
	readonly CALL_JOB_FAIL: string;
	readonly CALL_JOB_GIVE_UP_SPENT: string;
	readonly CALL_CLEANUP_BEGIN: "select c.id, c.epoch,\\n  not exists (\\n    select 1 from playbook.call_jobs j\\n    where j.organization_id = c.organization_id and j.call_id = c.id\\n      and j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp()) as clear\\nfrom playbook.calls c\\nwhere c.organization_id = $1 and c.id = $2 and c.state = 'deleted' and c.deletion_seq = $3::int";
	readonly CALL_LIST_PENDING_CLEANUP: string;
	readonly CALL_CLEANUP_DONE: "update playbook.calls\\nset vectors_removed_seq = $3::int, updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and deletion_seq = $3::int\\nreturning id";
	readonly CALL_VENDOR_ID_RECORD: "with cur as (\\n  select vendor_id from playbook.call_vendor_sends\\n  where organization_id = $1 and call_id = $2 and seq = $3::int\\n  for update),\\ntaken as (\\n  select 1 from playbook.call_vendor_sends t\\n  where t.organization_id = $1 and t.vendor_id = $4::text and not (t.call_id = $2 and t.seq = $3::int)),\\nu as (\\n  update playbook.call_vendor_sends s\\n  set vendor_id = $4::text, recorded_at = clock_timestamp()\\n  from cur\\n  where s.organization_id = $1 and s.call_id = $2 and s.seq = $3::int and cur.vendor_id is null\\n    and not exists (select 1 from taken)\\n    and coalesce($4::text ~ '^[A-Za-z0-9._:-]{1,128}$', false)\\n  returning 1)\\nselect case\\n  when not coalesce($4::text ~ '^[A-Za-z0-9._:-]{1,128}$', false) then 'invalid'\\n  when exists (select 1 from u) then 'recorded'\\n  when cur.vendor_id = $4::text then 'unchanged'\\n  else 'conflict' end as result\\nfrom cur";
	readonly CALL_VENDOR_REMOVED: "update playbook.calls\\nset vendor_removed_at = coalesce(vendor_removed_at, clock_timestamp()), updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and vendor_send_seq = $3::int\\n  and sent_to_vendor_at is not null\\n  and not exists (\\n    select 1 from playbook.call_jobs j\\n    where j.organization_id = $1 and j.call_id = $2\\n      and j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp())\\nreturning id";
	readonly CALL_PURGE_CLAIM: string;
	readonly CALL_PURGE_COMPLETE: "with jl as (\\n  select state, next_attempt_at from playbook.call_jobs\\n  where organization_id = $1 and call_id = $2\\n  for update)\\ndelete from playbook.calls\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is not null\\n  and vectors_removed_seq = deletion_seq\\n  and (sent_to_vendor_at is null or vendor_removed_at is not null)\\n  and not exists (select 1 from jl where jl.state in ('running', 'cancelled') and jl.next_attempt_at > clock_timestamp())\\nreturning id, size_bytes";
	readonly CALL_LIST_SPENT_PURGES: string;
	readonly CALL_PURGE_RESET: "update playbook.calls\\nset purge_attempts = 0, purge_started_at = null, purge_lease_until = null,\\n    restore_barred_at = coalesce(restore_barred_at, clock_timestamp()), updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and purge_attempts >= 20\\nreturning id, purge_attempts";
	readonly CALL_ERASE_BATCH: string;
	readonly DEAL_LIST_PENDING_RETAG: string;
	readonly DEAL_RETAG_BATCH: string;
	readonly CALL_RETAGGED: "update playbook.calls c\\nset tagged_outcome_seq = $3::int, updated_at = clock_timestamp()\\nfrom playbook.deals d\\nwhere c.organization_id = $1 and c.id = any(($2::text[])[1:500]) and c.state = 'ready'\\n  and c.tagged_outcome_seq < $3::int\\n  and d.organization_id = $1 and d.id = c.deal_record_id and $3::int <= d.outcome_seq\\nreturning c.id";
	readonly DEAL_RETAG_LOCK: "select id, outcome, outcome_seq, retag_through\nfrom playbook.deals\nwhere organization_id = $1 and id = $2\nfor no key update";
	readonly DEAL_RETAG_DONE: "update playbook.deals d\\nset retag_through = $3::int\\nwhere d.organization_id = $1 and d.id = $2 and d.retag_through < $3::int and $3::int <= d.outcome_seq\\n  and not exists (\\n    select 1 from playbook.calls c\\n    where c.organization_id = $1 and c.deal_record_id = d.id and c.state = 'ready' and c.tagged_outcome_seq < $3::int)\\nreturning d.id, d.retag_through, d.outcome_seq";
	readonly QUOTA_LOCK: "select pg_advisory_xact_lock(hashtextextended($1::text, 0)) is not null as locked";
	readonly QUOTA_USAGE: "select document_count, byte_count\nfrom playbook.organization_usage\nwhere organization_id = $1";
	readonly DOCUMENT_INSERT: "with ins as (\n  insert into playbook.documents\n    (id, organization_id, name, content_hash, size_bytes, declared_type, detected_type, uploaded_by, object_key)\n  select $2::text, $1::text, $3::text, $4::bytea, $5::bigint, $6::text, $7::text, $8::text, $9::text\n  where coalesce((select document_count from playbook.organization_usage where organization_id = $1), 0) < $11::bigint\n    and coalesce((select byte_count from playbook.organization_usage where organization_id = $1), 0) + $5::bigint <= $12::bigint\n  on conflict (organization_id, content_hash) where purge_started_at is null and restore_barred_at is null do nothing\n  returning id, organization_id, epoch),\nqueued as (\n  insert into playbook.ingestion_jobs (id, organization_id, document_id, epoch, next_attempt_at)\n  select $10::text, organization_id, id, epoch, clock_timestamp() from ins)\nselect id, epoch from ins";
	readonly DOCUMENT_BY_HASH: "select id, state, epoch, deletion_seq\nfrom playbook.documents\nwhere organization_id = $1 and content_hash = $2::bytea and purge_started_at is null and restore_barred_at is null";
	readonly DOCUMENT_GET: string;
	readonly DOCUMENT_SEARCH_STATE: "select id, name, state, epoch\nfrom playbook.documents\nwhere organization_id = $1 and id = any(($2::text[])[1:100])\norder by id";
	readonly DOCUMENT_LIST: string;
	readonly DOCUMENT_LIST_DELETED: string;
	readonly DOCUMENT_SOFT_DELETE: "with j as (\\n  update playbook.ingestion_jobs\\n  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp(),\\n      next_attempt_at = case when state = 'running' then next_attempt_at else clock_timestamp() end\\n  where organization_id = $1 and document_id = $2 and state in ('queued', 'running')\\n  returning id),\\nd as (\\n  update playbook.documents\\n  set state = 'deleted', epoch = epoch + 1, deletion_seq = deletion_seq + 1,\\n      deleted_at = clock_timestamp(), deleted_by = $3,\\n      purge_due_at = clock_timestamp() + make_interval(secs => greatest(coalesce($4::float8, 0), 3600000) / 1000),\\n      failure_reason = null, updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and state <> 'deleted' and (select count(*) from j) >= 0\\n  returning id, state, deletion_seq, purge_due_at)\\nselect id, state, deletion_seq, purge_due_at, true as changed from d\\nunion all\\nselect id, state, deletion_seq, purge_due_at, false from playbook.documents\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and not exists (select 1 from d)";
	readonly DOCUMENT_RESTORE: string;
	readonly DOCUMENT_RESTORE_FOR_UPLOAD: string;
	readonly DOCUMENT_REQUEUE: "with j as (\\n  update playbook.ingestion_jobs\\n  set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and document_id = $2 and state in ('queued', 'running')\\n    and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = $2 and x.state = 'failed')\\n  returning id),\\nd as (\\n  update playbook.documents\\n  set state = 'uploaded', failure_reason = null, updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and state = 'failed' and (select count(*) from j) >= 0\\n  returning organization_id, id, epoch, deletion_seq),\\nqueued as (\\n  insert into playbook.ingestion_jobs (id, organization_id, document_id, epoch, next_attempt_at)\\n  select $3::text, organization_id, id, epoch, clock_timestamp() from d)\\nselect id, 'uploaded' as state, epoch, deletion_seq, true as changed from d\\nunion all\\nselect id, state, epoch, deletion_seq, false from playbook.documents\\nwhere organization_id = $1 and id = $2 and state in ('uploaded', 'processing', 'ready') and not exists (select 1 from d)";
	readonly DOCUMENT_LIST_PENDING_CLEANUP: string;
	readonly DOCUMENT_CLEANUP_BEGIN: "select d.id, d.epoch,\\n  not exists (\\n    select 1 from playbook.ingestion_jobs j\\n    where j.organization_id = d.organization_id and j.document_id = d.id\\n      and j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp()) as clear\\nfrom playbook.documents d\\nwhere d.organization_id = $1 and d.id = $2 and d.state = 'deleted' and d.deletion_seq = $3::int";
	readonly DOCUMENT_CLEANUP_DONE: "update playbook.documents\\nset vectors_removed_seq = $3::int, updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and deletion_seq = $3::int\\nreturning id";
	readonly DOCUMENT_PURGE_CLAIM: string;
	readonly DOCUMENT_PURGE_COMPLETE: "with jl as (\\n  select state, next_attempt_at from playbook.ingestion_jobs\\n  where organization_id = $1 and document_id = $2\\n  for update)\\ndelete from playbook.documents\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is not null\\n  and vectors_removed_seq = deletion_seq\\n  and not exists (select 1 from jl where jl.state = 'running' and jl.next_attempt_at > clock_timestamp())\\nreturning id, size_bytes";
	readonly INGESTION_JOB_CLAIM: string;
	readonly INGESTION_JOB_HEARTBEAT: string;
	readonly INGESTION_JOB_ADVANCE: string;
	readonly INGESTION_JOB_RETRY: "update playbook.ingestion_jobs\\nset state = 'queued', claim_token = null,\\n    next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), 3600000) / 1000),\\n    updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'\\nreturning id, attempts";
	readonly INGESTION_JOB_COMPLETE: "with j as (\\n  update playbook.ingestion_jobs\\n  set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'\\n    and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = ingestion_jobs.document_id\\n                and x.state = 'processing' and x.epoch = ingestion_jobs.epoch)\\n  returning document_id, epoch, page_count),\\nd as (\\n  update playbook.documents\\n  set state = 'ready', page_count = coalesce((select page_count from j), page_count), updated_at = clock_timestamp()\\n  where organization_id = $1 and id = (select document_id from j) and epoch = (select epoch from j)\\n    and state = 'processing')\\nselect document_id from j";
	readonly INGESTION_JOB_FAIL: "with j as (\\n  update playbook.ingestion_jobs\\n  set state = 'failed', failure_reason = $4::text, claim_token = null,\\n      finished_at = clock_timestamp(), updated_at = clock_timestamp()\\n  where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'\\n    and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = ingestion_jobs.document_id\\n                and x.state in ('uploaded', 'processing') and x.epoch = ingestion_jobs.epoch)\\n  returning document_id, epoch, page_count),\\nd as (\\n  update playbook.documents\\n  set state = 'failed', failure_reason = $4::text, page_count = coalesce((select page_count from j), page_count),\\n      updated_at = clock_timestamp()\\n  where organization_id = $1 and id = (select document_id from j) and epoch = (select epoch from j)\\n    and state in ('uploaded', 'processing'))\\nselect document_id from j";
	readonly INGESTION_JOB_GIVE_UP_SPENT: string;
	readonly CONSUMED_CLAIM: string;
	readonly CONSUMED_LOOKUP: "select state,\\n  case when state = 'claimed'\\n       then greatest(1, ceil(extract(epoch from lease_expires_at - clock_timestamp())))::int end as retry_after_seconds\\nfrom playbook.consumed_message\\nwhere consumer = $1 and organization_id = $2 and message_id = $3";
	readonly CONSUMED_RENEW: string;
	readonly CONSUMED_COMPLETE: "update playbook.consumed_message\\nset state = 'done', completed_at = clock_timestamp(), lease_expires_at = null\\nwhere consumer = $1 and organization_id = $2 and message_id = $3\\n  and claim_token = $4::uuid and state = 'claimed'\\nreturning claim_token";
	readonly CONSUMED_RELEASE: "delete from playbook.consumed_message\\nwhere consumer = $1 and organization_id = $2 and message_id = $3\\n  and claim_token = $4::uuid and state = 'claimed'";
	readonly CONSUMED_PURGE: string;
	readonly INDEX_SETTINGS_UPSERT: "insert into playbook.index_settings as s\n  (organization_id, embedding_model, embedding_dimension)\nvalues ($1, $2, $3::int)\non conflict (organization_id) do update set\n  embedding_model = excluded.embedding_model, embedding_dimension = excluded.embedding_dimension,\n  updated_at = clock_timestamp()\nwhere s.vectors_written_at is null\n   or (s.embedding_model = excluded.embedding_model and s.embedding_dimension = excluded.embedding_dimension)\nreturning embedding_model, embedding_dimension, vectors_written_at";
	readonly INDEX_VECTORS_MARK: "with m as (\n  update playbook.index_settings\n  set vectors_written_at = clock_timestamp(), updated_at = clock_timestamp()\n  where organization_id = $1 and vectors_written_at is null\n  returning embedding_model, embedding_dimension)\nselect embedding_model, embedding_dimension from m\nunion all\nselect embedding_model, embedding_dimension from playbook.index_settings\nwhere organization_id = $1 and vectors_written_at is not null";
	readonly IDEMPOTENCY_BEGIN: "insert into playbook.idempotency_keys (organization_id, user_id, route, key, request_hash)\nvalues ($1, $2, $3, $4, $5::bytea)\non conflict (organization_id, user_id, route, key) do nothing\nreturning key";
	readonly IDEMPOTENCY_LOOKUP: "select request_hash, status, response, created_at\nfrom playbook.idempotency_keys\nwhere organization_id = $1 and user_id = $2 and route = $3 and key = $4";
	readonly IDEMPOTENCY_COMPLETE: "update playbook.idempotency_keys\nset status = $5::smallint, response = $6::jsonb\nwhere organization_id = $1 and user_id = $2 and route = $3 and key = $4 and status is null\nreturning key";
	readonly IDEMPOTENCY_PURGE: string;
	readonly DOCUMENT_ERASE_BATCH: string;
	readonly ORGANIZATION_REMOVE_REST: "select playbook.remove_organization_rest($1::text, $2::text) as removed";
	readonly ORGANIZATION_REMOVAL_STATUS: "select\n  not exists (select 1 from playbook.documents where organization_id = $1) as no_documents,\n  not exists (select 1 from playbook.index_settings where organization_id = $1) as no_settings,\n  not exists (select 1 from playbook.organization_usage where organization_id = $1) as no_usage,\n  not exists (select 1 from playbook.consumed_message where organization_id = $1) as no_messages,\n  not exists (select 1 from playbook.deals where organization_id = $1) as no_deals,\n  not exists (select 1 from playbook.deal_imports where organization_id = $1) as no_imports,\n  not exists (select 1 from playbook.rights_confirmations where organization_id = $1) as no_rights,\n  not exists (select 1 from playbook.calls where organization_id = $1) as no_calls,\n  (not exists (select 1 from playbook.documents where organization_id = $1)\n    and not exists (select 1 from playbook.index_settings where organization_id = $1)\n    and not exists (select 1 from playbook.organization_usage where organization_id = $1)\n    and not exists (select 1 from playbook.consumed_message where organization_id = $1)\n    and not exists (select 1 from playbook.deals where organization_id = $1)\n    and not exists (select 1 from playbook.deal_imports where organization_id = $1)\n    and not exists (select 1 from playbook.rights_confirmations where organization_id = $1)\n    and not exists (select 1 from playbook.calls where organization_id = $1)) as removed\nwhere $1::text = nullif(current_setting('app.organization_id', true), '')";
	readonly DOCUMENT_LIST_SPENT_PURGES: string;
	readonly DOCUMENT_PURGE_RESET: "update playbook.documents\\nset purge_attempts = 0, purge_started_at = null, purge_lease_until = null,\\n    restore_barred_at = coalesce(restore_barred_at, clock_timestamp()), updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and state = 'deleted' and purge_attempts >= 20\\nreturning id, purge_attempts";
	readonly ORPHAN_SWEEP_DONE: "select swept_through, more from playbook.orphan_sweep_done($1::text, $2::timestamptz)";
	readonly DEAL_GET: string;
	readonly DEAL_BY_DEAL_ID: string;
	readonly DEAL_LIST: string;
	readonly DEAL_LIST_BY_OUTCOME: string;
	readonly DEAL_LIST_BY_IMPORT_FLAG: string;
	readonly DEAL_SET_OUTCOME: string;
	readonly DEAL_USAGE: "select deal_count\nfrom playbook.organization_usage\nwhere organization_id = $1";
	readonly DEAL_IMPORT_INSERT: "select * from playbook.insert_deal_import($1::text, $2::text, $3::text, $4::text, $5::bigint, 5)";
	readonly DEAL_IMPORT_GET: "select id, state, failure_reason,\\n  case when state = 'completed' then row_count end as row_count,\\n  case when state = 'completed' then applied_count end as applied_count,\\n  case when state = 'completed' then rejected_count end as rejected_count,\\n  uploaded_by, created_at, updated_at\\nfrom playbook.deal_imports\\nwhere organization_id = $1 and id = $2 and erased_at is null";
	readonly DEAL_IMPORT_LIST: string;
	readonly DEAL_IMPORT_CLAIM: string;
	readonly DEAL_IMPORT_HEARTBEAT: string;
	readonly DEAL_IMPORT_RETRY: "update playbook.deal_imports\\nset state = 'uploaded', claim_token = null,\\n    next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), 3600000) / 1000),\\n    updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null\\nreturning id, attempts";
	readonly DEAL_IMPORT_APPLY: string;
	readonly DEAL_IMPORT_FINISH: "update playbook.deal_imports\\nset state = 'completed', claim_token = null, row_count = applied_count + rejected_count,\\n    object_removed_at = clock_timestamp(), finished_at = clock_timestamp(), updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null\\n  and report_through = $4::int + 1\\nreturning id, row_count, applied_count, rejected_count";
	readonly DEAL_IMPORT_FAIL: "update playbook.deal_imports\\nset state = 'failed', failure_reason = $4::text, claim_token = null,\\n    object_removed_at = clock_timestamp(), finished_at = clock_timestamp(), updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null\\nreturning id";
	readonly DEAL_IMPORT_GIVE_UP_SPENT: string;
	readonly DEAL_IMPORT_OBJECT_REMOVED: "update playbook.deal_imports\\nset object_removed_at = coalesce(object_removed_at, clock_timestamp()), updated_at = clock_timestamp()\\nwhere organization_id = $1 and id = $2 and (erased_at is not null or state = 'failed')\\nreturning id";
	readonly DEAL_IMPORT_ROWS_LIST: string;
	readonly DEAL_IMPORT_ROWS_LIST_BY_RESULT: string;
	readonly DEAL_IMPORT_ERASE_BATCH: string;
	readonly DEAL_IMPORT_LIST_ERASED: string;
	readonly DEAL_IMPORT_PURGE_BATCH: string;
	readonly DEAL_ERASE_BATCH: "select playbook.erase_deals($1::text, $2::int) as deleted";
	readonly RIGHTS_GET: "select confirmed_by, confirmed_at, wording_version\nfrom playbook.rights_confirmations\nwhere organization_id = $1";
	readonly RIGHTS_CONFIRM: "with up as (\n  insert into playbook.rights_confirmations as r (organization_id, confirmed_by, confirmed_at, wording_version)\n  values ($1, $2::text, clock_timestamp(), $3::int)\n  on conflict (organization_id) do update\n    set confirmed_by = excluded.confirmed_by, confirmed_at = excluded.confirmed_at, wording_version = excluded.wording_version\n    where r.wording_version < excluded.wording_version\n  returning confirmed_by, confirmed_at, wording_version)\nselect confirmed_by, confirmed_at, wording_version, true as recorded from up\nunion all\nselect confirmed_by, confirmed_at, wording_version, false\nfrom playbook.rights_confirmations\nwhere organization_id = $1 and not exists (select 1 from up)";
	readonly ORGANIZATIONS_WITH_WORK: string;
};
/** The one database role that owns every schema and table and runs every migration. */
declare const OWNER_ROLE = "closeline_owner";
/** The transaction-local Postgres setting every row-level-security policy compares against. */
declare const ORGANIZATION_SETTING = "app.organization_id";
/**
* Run `fn` in a transaction scoped to one Organization.
*
* Sets `app.organization_id` for this transaction only (`set_config(..., true)`), so every
* query on the handle sees and writes only that Organization's rows. The setting ends with the
* transaction, so it cannot leak to the next user of the pooled connection. Pass the root
* database from `createDb`, not a transaction, and run every tenant query on the handle `fn`
* receives: a query on `db` itself runs outside the transaction and sees no tenant rows.
*
* @param db - The database from `createDb`.
* @param organizationId - The Organization id: `org_` and 32 lowercase hex characters.
* @param fn - Work to run inside the scoped transaction.
* @returns Whatever `fn` returns.
* @throws If `organizationId` is malformed (before any query runs), or whatever `fn` throws
*   (the transaction rolls back).
*/
declare function withOrganization<T>(db: Database, organizationId: string, fn: (tx: Transaction) => Promise<T>): Promise<T>;
/**
* The SQL statements that make a tenant table fail closed, for use in a migration.
*
* Enables and forces row-level security (without FORCE the table owner bypasses the policy) and
* creates the one policy: a row is visible and writable only when its `organization_id` equals
* `app.organization_id`. An absent or empty setting matches nothing, so no row is visible and no
* row can be written. The table must have a not-null `organization_id text` column.
*
* @param schemaName - The Postgres schema of the table, such as `core`.
* @param tableName - The table name.
* @returns The statements, in the order to run them.
* @throws If a name is not a plain lowercase identifier.
*/
declare function tenantRlsStatements(schemaName: string, tableName: string): string[];
/** This library's package name, so a consumer can report which shared libraries it resolved. */
declare const PACKAGE = "tula-closeline-db";
export { ABANDON_CLAIM, ABANDON_GIVE_UP_SPENT, ABANDON_LEARN, ABANDON_MIN_GRACE_MS, ABANDON_PURGE_BATCH, ABANDON_RECORD, ABANDON_RESOLVE, ABANDON_SETTLE, AUTH_STATEMENTS, AuthTableCategories, CALL_CHANNELS, CALL_CLEANUP_BEGIN2 as CALL_CLEANUP_BEGIN, CALL_CLEANUP_DONE2 as CALL_CLEANUP_DONE, CALL_ERASE_BATCH2 as CALL_ERASE_BATCH, CALL_FAILURE_REASONS, CALL_GET2 as CALL_GET, CALL_INSERT2 as CALL_INSERT, CALL_JOB_CLAIM2 as CALL_JOB_CLAIM, CALL_JOB_COMPLETE2 as CALL_JOB_COMPLETE, CALL_JOB_FAIL2 as CALL_JOB_FAIL, CALL_JOB_GIVE_UP_SPENT2 as CALL_JOB_GIVE_UP_SPENT, CALL_JOB_HEARTBEAT2 as CALL_JOB_HEARTBEAT, CALL_JOB_KINDS, CALL_JOB_MAX_ATTEMPTS, CALL_JOB_RECORD2 as CALL_JOB_RECORD, CALL_JOB_RETRY2 as CALL_JOB_RETRY, CALL_JOB_STATES, CALL_JOB_TRANSCRIBED2 as CALL_JOB_TRANSCRIBED, CALL_KINDS, CALL_LIST2 as CALL_LIST, CALL_LIST_BY_DEAL2 as CALL_LIST_BY_DEAL, CALL_LIST_BY_DEAL_STATE2 as CALL_LIST_BY_DEAL_STATE, CALL_LIST_BY_STATE2 as CALL_LIST_BY_STATE, CALL_LIST_PENDING_CLEANUP2 as CALL_LIST_PENDING_CLEANUP, CALL_LIST_SPENT_PURGES2 as CALL_LIST_SPENT_PURGES, CALL_MAX_RECORDING_BYTES, CALL_MAX_RECORDING_SECONDS, CALL_MAX_SEQ, CALL_MAX_SPEAKERS, CALL_MAX_TRANSCRIPT_BYTES, CALL_MAX_VENDOR_SENDS, CALL_MEDIA_TYPES, CALL_PENDING_CLEANUP_PREDICATE, CALL_PURGE_CLAIM2 as CALL_PURGE_CLAIM, CALL_PURGE_COMPLETE2 as CALL_PURGE_COMPLETE, CALL_PURGE_MAX_ATTEMPTS, CALL_PURGE_RESET2 as CALL_PURGE_RESET, CALL_REP_BY, CALL_REQUEUE2 as CALL_REQUEUE, CALL_RESTORE2 as CALL_RESTORE, CALL_RESTORE_FOR_UPLOAD2 as CALL_RESTORE_FOR_UPLOAD, CALL_RETAGGED2 as CALL_RETAGGED, CALL_ROW_FIELDS, CALL_SEARCH_STATE2 as CALL_SEARCH_STATE, CALL_SENT_TO_VENDOR2 as CALL_SENT_TO_VENDOR, CALL_SET_REP2 as CALL_SET_REP, CALL_SOFT_DELETE2 as CALL_SOFT_DELETE, CALL_SPEAKER_LABEL_MAX_BYTES, CALL_SPEAKER_LABEL_MAX_LENGTH, CALL_STATEMENTS, CALL_STATES, CALL_USAGE2 as CALL_USAGE, CALL_VENDOR_ID_PATTERN, CALL_VENDOR_ID_RECORD2 as CALL_VENDOR_ID_RECORD, CALL_VENDOR_REMOVED2 as CALL_VENDOR_REMOVED, CONSUMED_CLAIM, CONSUMED_COMPLETE, CONSUMED_LOOKUP, CONSUMED_PURGE, CONSUMED_PURGE_AGE_MS, CONSUMED_RELEASE, CONSUMED_RENEW, CONTROL_PLANE_TABLES, CONTROL_PLANE_TABLE_REASONS, COUNTER_MIN_PERIOD_MS, COUNTER_PURGE_BATCH, CallJobClaimRow, ClaimedCallJob, ClaimedDemoNotice, ClaimedIngestionJob, DB_TYPES, DEAL_BY_DEAL_ID, DEAL_ERASE_BATCH, DEAL_GET, DEAL_ID_MAX_BYTES, DEAL_ID_MAX_LENGTH, DEAL_IMPORT_APPLY, DEAL_IMPORT_APPLY_BATCH, DEAL_IMPORT_CLAIM, DEAL_IMPORT_ERASE_BATCH, DEAL_IMPORT_FAIL, DEAL_IMPORT_FAILURE_REASONS, DEAL_IMPORT_FINISH, DEAL_IMPORT_GET, DEAL_IMPORT_GIVE_UP_SPENT, DEAL_IMPORT_HEARTBEAT, DEAL_IMPORT_INSERT, DEAL_IMPORT_LIST, DEAL_IMPORT_LIST_ERASED, DEAL_IMPORT_MAX_ATTEMPTS, DEAL_IMPORT_MAX_BYTES, DEAL_IMPORT_MAX_ROWS, DEAL_IMPORT_OBJECT_REMOVED, DEAL_IMPORT_PURGE_BATCH, DEAL_IMPORT_RETRY, DEAL_IMPORT_ROWS_LIST, DEAL_IMPORT_ROWS_LIST_BY_RESULT, DEAL_IMPORT_ROW_REASONS, DEAL_IMPORT_ROW_REASONS_WITHOUT_DEAL_ID, DEAL_IMPORT_ROW_RESULTS, DEAL_IMPORT_STATES, DEAL_LIST, DEAL_LIST_BY_IMPORT_FLAG, DEAL_LIST_BY_OUTCOME, DEAL_LIST_PENDING_RETAG2 as DEAL_LIST_PENDING_RETAG, DEAL_MAX_SEQ, DEAL_NAME_MAX_BYTES, DEAL_NAME_MAX_LENGTH, DEAL_OUTCOMES, DEAL_RETAG_BATCH2 as DEAL_RETAG_BATCH, DEAL_RETAG_DONE2 as DEAL_RETAG_DONE, DEAL_RETAG_LOCK2 as DEAL_RETAG_LOCK, DEAL_ROW_FIELDS, DEAL_SET_OUTCOME, DEAL_USAGE, DEFAULT_POOL_OPTIONS, DEMO_NOTICE_CLAIM_MAX, DEMO_PURGE_BATCH_MAX, DEMO_RATE_PURGE_BATCH_MAX, DOCUMENT_BY_HASH, DOCUMENT_CLEANUP_BEGIN, DOCUMENT_CLEANUP_DONE, DOCUMENT_ERASE_BATCH, DOCUMENT_GET, DOCUMENT_INSERT, DOCUMENT_LIST, DOCUMENT_LIST_DELETED, DOCUMENT_LIST_FILTERED, DOCUMENT_LIST_MAX_PAGE, DOCUMENT_LIST_PENDING_CLEANUP, DOCUMENT_LIST_SPENT_PURGES, DOCUMENT_MIN_RETENTION_MS, DOCUMENT_PURGE_CLAIM, DOCUMENT_PURGE_COMPLETE, DOCUMENT_PURGE_RESET, DOCUMENT_REQUEUE, DOCUMENT_RESTORE, DOCUMENT_RESTORE_FOR_UPLOAD, DOCUMENT_ROW_FIELDS, DOCUMENT_SEARCH_STATE, DOCUMENT_SOFT_DELETE, Database, DbHandle, DbOptions, DemoRateLimitHit, DemoRequestInput, DemoRequestRefusedError, DemoRequestSubmission, DocumentRow, ENVIRONMENT_POLICY_EXPRESSION, ENVIRONMENT_SCOPED_TABLES, ENVIRONMENT_SETTING, IDEMPOTENCY_BEGIN, IDEMPOTENCY_COMPLETE, IDEMPOTENCY_LOOKUP, IDEMPOTENCY_MIN_PURGE_AGE_MS, IDEMPOTENCY_PURGE, IDEMPOTENCY_PURGE_AGE_MS, INDEX_SETTINGS_UPSERT, INDEX_VECTORS_MARK, INGESTION_JOB_ADVANCE, INGESTION_JOB_CLAIM, INGESTION_JOB_COMPLETE, INGESTION_JOB_FAIL, INGESTION_JOB_GIVE_UP_SPENT, INGESTION_JOB_HEARTBEAT, INGESTION_JOB_RETRY, INGESTION_MAX_RETRY_DELAY_MS, IngestionJobClaimRow, InvitationForToken, LOCKOUT_ATTEMPT, LOCKOUT_CLEAR, LOCKOUT_MIN_RETRY_AFTER_MS, LOCKOUT_RETRY_AFTER, MAX_DOCUMENT_SEARCH_STATE_IDS, MAX_QUEUED_DEAL_IMPORTS, MAX_SEARCH_STATE_IDS, NON_TENANT_TABLES, NON_TENANT_TABLE_REASONS, ORGANIZATIONS_WITH_WORK, ORGANIZATION_REMOVAL_STATUS, ORGANIZATION_REMOVE_REST, ORGANIZATION_SETTING, ORPHAN_SWEEP_AGE_MS, ORPHAN_SWEEP_DONE, OWNER_ROLE, OrganizationOfUser, OrganizationStatus, PACKAGE, PENDING_CLEANUP_PREDICATE, PLAYBOOK_MAX_BATCH, PLAYBOOK_MIN_LEASE_MS, PLAYBOOK_STATEMENTS, QUOTA_LOCK, QUOTA_USAGE, RATE_HIT, REMOVE_ALL_IDEMPOTENCY_ROUTE, RIGHTS_CONFIRM, RIGHTS_GET, RIGHTS_MAX_WORDING_VERSION, Schema, SettledDemoNoticeStatus, TENANT_SCHEMAS, TenantIsolationGap, Transaction, WORK_KINDS, WorkDiscoveryRow, assertTenantIsolation, callReuploadRequeues, claimDemoNotices, claimedCallJobs, claimedJobs, createDb, discoveredOrganizations, findTenantIsolationGaps, hitDemoRateLimit, invitationForToken, organizationOfUser, purgeDemoRateCounters, purgeDemoRequests, repChangeAllowed, reportConnectionError, settleDemoNotice, submitDemoRequest, tenantRlsStatements, withEnvironment, withOrganization };
