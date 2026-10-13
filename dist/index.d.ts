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
* bound, with {@link ABANDON_RESOLVE} and `gave_up`. Run it inside `withEnvironment`.
*/
declare const ABANDON_CLAIM = "with due as (\n  select id from auth.abandon_cases\n  where environment_id = $1 and resolved_at is null and attempts < 100\n    and next_attempt_at <= clock_timestamp()\n  order by next_attempt_at\n  limit $2\n  for update skip locked)\nupdate auth.abandon_cases c\nset attempts = c.attempts + 1,\n    next_attempt_at = clock_timestamp() + make_interval(secs => $3::float8 / 1000),\n    updated_at = clock_timestamp()\nfrom due\nwhere c.id = due.id\nreturning c.id, c.core_organization_id, c.user_id, c.attempt_id, c.attempts";
/**
* Record the outcome in a second short transaction. `$1` case id, `$2` environment, `$3` the
* outcome (`done`, `refused` or `gave_up`). No row back means the case was already resolved.
* This is also what sets `gave_up` when the service reaches its own attempt limit. No row back
* means the case is already resolved, for example `gave_up` by {@link ABANDON_GIVE_UP_SPENT}
* while a worker slower than its lease was still calling core: the worker treats that as "already
* resolved", not as an error. Run it inside `withEnvironment`.
*/
declare const ABANDON_RESOLVE = "update auth.abandon_cases\nset resolved_at = clock_timestamp(), outcome = $3, updated_at = clock_timestamp()\nwhere id = $1 and environment_id = $2 and resolved_at is null\nreturning id";
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
	readonly ABANDON_PURGE_BATCH: "with batch as (\\n  select id from auth.abandon_cases\\n  where environment_id = $1 and resolved_at is not null\\n    and resolved_at < clock_timestamp() - interval '1 day'\\n  order by resolved_at\\n  limit $2\\n  for update skip locked)\\ndelete from auth.abandon_cases\\nwhere id in (select id from batch)";
	readonly ABANDON_GIVE_UP_SPENT: "with batch as (\\n  select id from auth.abandon_cases\\n  where environment_id = $1 and resolved_at is null and attempts >= 100\\n    and next_attempt_at <= clock_timestamp()\\n  order by next_attempt_at\\n  limit $2\\n  for update skip locked)\\nupdate auth.abandon_cases\\nset resolved_at = clock_timestamp(), outcome = 'gave_up', updated_at = clock_timestamp()\\nwhere id in (select id from batch)\\nreturning id";
	readonly ABANDON_LEARN: "update auth.abandon_cases\nset core_organization_id = $3, updated_at = clock_timestamp()\nwhere id = $1 and environment_id = $2 and core_organization_id is null and resolved_at is null\nreturning id";
};
import { NodePgDatabase } from "drizzle-orm/node-postgres";
declare namespace exports_schema {
	export { ABANDON_CASE_MAX_ATTEMPTS, ABANDON_CASE_OUTCOMES, API_KEY_KINDS, ATTEMPT_COUNTER_KEY_HASH_BYTES, ATTEMPT_COUNTER_KINDS, ATTEMPT_COUNTER_MAX_HITS, AUDIT_ACTOR_TYPES, AUDIT_RETENTION_FLOOR, AbandonCase, ApiKey, AttemptCounter, AuditLog, BackupCode, CREDENTIAL_TYPES, Credential, ENVIRONMENT_KINDS, EVENT_RETENTION_FLOOR, Environment, EnvironmentSettingsRow, Event, FlowAttemptRow, HookCallCount, HookRow, IDEMPOTENCY_HASH_BYTES, IDEMPOTENCY_KEY_MAX, IDEMPOTENCY_RESPONSE_MAX_BYTES, IDEMPOTENCY_ROUTE_MAX, IDENTITY_PROVIDERS, INVITATION_ROLES, INVITATION_STATES, Identity, InstanceAuditLog, MEMBERSHIP_ROLES, MEMBER_NAME_MAX, NativeAppRow, NewAbandonCase, NewApiKey, NewAttemptCounter, NewAuditLog, NewBackupCode, NewCredential, NewEnvironment, NewEnvironmentSettingsRow, NewEvent, NewFlowAttemptRow, NewHookCallCount, NewHookRow, NewIdentity, NewInstanceAuditLog, NewNativeAppRow, NewOAuthProviderRow, NewPasskey, NewPasskeyChallenge, NewPasswordHistoryEntry, NewProject, NewProposalRow, NewRefreshToken, NewSession, NewSigningKey, NewSmsCodeCount, NewUser, NewUserFactor, NewVerificationToken, NewWebhookDeliveryAttemptRow, NewWebhookDeliveryRow, NewWebhookEndpointRow, NewWorkspace, OAUTH_PROVIDERS, OAuthProviderConfig, OAuthProviderRow, ORGANIZATION_REGIONS, ORGANIZATION_STATUSES, PASSKEY_CHALLENGE_PURPOSES, Passkey, PasskeyChallenge, PasswordHistoryEntry, Project, ProposalRow, RefreshToken, SESSION_CLIENTS, SESSION_REVOKE_REASONS, SESSION_TYPES, SIGNING_KEY_STATUSES, SMS_COUNT_RETENTION_FLOOR_DAYS, Session, SigningKey, SmsCodeCount, USER_FACTOR_TYPES, User, UserFactor, VERIFICATION_PURPOSES, VerificationToken, WEBHOOK_DELIVERY_RETENTION_FLOOR, WEBHOOK_DELIVERY_STATES, WebhookDeliveryAttemptRow, WebhookDeliveryRow, WebhookEndpointRow, Workspace, abandonCases, apiKeys, attemptCounters, auditLogs, authSchema, backupCodes, coreSchema, credentials, environmentSettings, environments, events, flowAttempts, hookCallCounts, hooks, idempotencyKeys, identities, instanceAuditLogs, invitationDirectory, invitations, membershipDirectory, memberships, nativeApps, oauthProviders, organizationState, organizations, passkeyChallenges, passkeys, passwordHistory, playbookSchema, projects, proposals, refreshTokens, sessions, signingKeys, smsCodeCounts, teamMembers, teams, userFactors, users, verificationTokens, webhookDeliveries, webhookDeliveryAttempts, webhookEndpoints, workspaces };
}
import { PgTableWithColumns as PgTableWithColumns_a5zn0g } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp } from "drizzle-orm/pg-core";
/**
* The most times a sweep may try to abandon one case: the bound the database itself keeps
* (`abandon_cases_attempts_bounds`). The service gives up well before it, so the check only
* stops a bug from counting forever.
*/
declare const ABANDON_CASE_MAX_ATTEMPTS = 100;
/** How an abandon case ended: core removed the Organization, core refused, or the sweep gave up. */
declare const ABANDON_CASE_OUTCOMES: readonly ["done", "refused", "gave_up"];
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
			data: "done" | "gave_up" | "refused";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["done", "refused", "gave_up"];
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
declare const organizations: PgTableWithColumns_a5zn0g33<{
	name: "organizations";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp33<{
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
		name: PgColumn_ffrhhp33<{
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
		region: PgColumn_ffrhhp33<{
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
		status: PgColumn_ffrhhp33<{
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
		ownerCount: PgColumn_ffrhhp33<{
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
		createdAt: PgColumn_ffrhhp33<{
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
		updatedAt: PgColumn_ffrhhp33<{
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
declare const memberships: PgTableWithColumns_a5zn0g33<{
	name: "memberships";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp33<{
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
		organizationId: PgColumn_ffrhhp33<{
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
		userId: PgColumn_ffrhhp33<{
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
		role: PgColumn_ffrhhp33<{
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
		email: PgColumn_ffrhhp33<{
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
		name: PgColumn_ffrhhp33<{
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
		createdAt: PgColumn_ffrhhp33<{
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
		updatedAt: PgColumn_ffrhhp33<{
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
declare const teams: PgTableWithColumns_a5zn0g33<{
	name: "teams";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp33<{
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
		organizationId: PgColumn_ffrhhp33<{
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
		name: PgColumn_ffrhhp33<{
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
		nameKey: PgColumn_ffrhhp33<{
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
		createdAt: PgColumn_ffrhhp33<{
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
		updatedAt: PgColumn_ffrhhp33<{
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
declare const teamMembers: PgTableWithColumns_a5zn0g33<{
	name: "team_members";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp33<{
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
		teamId: PgColumn_ffrhhp33<{
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
		membershipId: PgColumn_ffrhhp33<{
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
		createdAt: PgColumn_ffrhhp33<{
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
declare const invitations: PgTableWithColumns_a5zn0g33<{
	name: "invitations";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp33<{
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
		organizationId: PgColumn_ffrhhp33<{
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
		email: PgColumn_ffrhhp33<{
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
		role: PgColumn_ffrhhp33<{
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
		teamId: PgColumn_ffrhhp33<{
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
		invitedByUserId: PgColumn_ffrhhp33<{
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
		tokenHash: PgColumn_ffrhhp33<{
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
		state: PgColumn_ffrhhp33<{
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
		expiresAt: PgColumn_ffrhhp33<{
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
		acceptedAt: PgColumn_ffrhhp33<{
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
		revokedAt: PgColumn_ffrhhp33<{
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
		createdAt: PgColumn_ffrhhp33<{
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
		updatedAt: PgColumn_ffrhhp33<{
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
declare const membershipDirectory: PgTableWithColumns_a5zn0g33<{
	name: "membership_directory";
	schema: "core";
	columns: {
		userId: PgColumn_ffrhhp33<{
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
		organizationId: PgColumn_ffrhhp33<{
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
declare const invitationDirectory: PgTableWithColumns_a5zn0g33<{
	name: "invitation_directory";
	schema: "core";
	columns: {
		tokenHash: PgColumn_ffrhhp33<{
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
		organizationId: PgColumn_ffrhhp33<{
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
		invitationId: PgColumn_ffrhhp33<{
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
		expiresAt: PgColumn_ffrhhp33<{
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
declare const organizationState: PgTableWithColumns_a5zn0g33<{
	name: "organization_state";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp33<{
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
		status: PgColumn_ffrhhp33<{
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
declare const idempotencyKeys: PgTableWithColumns_a5zn0g33<{
	name: "idempotency_keys";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp33<{
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
		userId: PgColumn_ffrhhp33<{
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
		route: PgColumn_ffrhhp33<{
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
		key: PgColumn_ffrhhp33<{
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
		requestHash: PgColumn_ffrhhp33<{
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
		status: PgColumn_ffrhhp33<{
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
		response: PgColumn_ffrhhp33<{
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
		createdAt: PgColumn_ffrhhp33<{
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
declare const TENANT_SCHEMAS: readonly ["auth", "core", "playbook"];
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
* only entries are the two `core` directories and the Organization status table, which are asked
* before an Organization is known. An entry here needs a decision record in the hub. An exempt
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
export { ABANDON_CLAIM, ABANDON_GIVE_UP_SPENT, ABANDON_LEARN, ABANDON_MIN_GRACE_MS, ABANDON_PURGE_BATCH, ABANDON_RECORD, ABANDON_RESOLVE, AUTH_STATEMENTS, AuthTableCategories, CONTROL_PLANE_TABLES, CONTROL_PLANE_TABLE_REASONS, COUNTER_MIN_PERIOD_MS, COUNTER_PURGE_BATCH, DEFAULT_POOL_OPTIONS, Database, DbHandle, DbOptions, ENVIRONMENT_POLICY_EXPRESSION, ENVIRONMENT_SCOPED_TABLES, ENVIRONMENT_SETTING, InvitationForToken, LOCKOUT_ATTEMPT, LOCKOUT_CLEAR, LOCKOUT_MIN_RETRY_AFTER_MS, LOCKOUT_RETRY_AFTER, NON_TENANT_TABLES, NON_TENANT_TABLE_REASONS, ORGANIZATION_SETTING, OWNER_ROLE, OrganizationOfUser, OrganizationStatus, PACKAGE, RATE_HIT, Schema, TENANT_SCHEMAS, TenantIsolationGap, Transaction, assertTenantIsolation, createDb, findTenantIsolationGaps, invitationForToken, organizationOfUser, reportConnectionError, tenantRlsStatements, withEnvironment, withOrganization };
