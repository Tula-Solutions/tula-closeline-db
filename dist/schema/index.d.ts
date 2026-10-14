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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g34 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp34 } from "drizzle-orm/pg-core";
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
declare const calls: PgTableWithColumns_a5zn0g34<{
	name: "calls";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp34<{
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
		organizationId: PgColumn_ffrhhp34<{
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
		dealRecordId: PgColumn_ffrhhp34<{
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
		kind: PgColumn_ffrhhp34<{
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
		fileName: PgColumn_ffrhhp34<{
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
		mediaType: PgColumn_ffrhhp34<{
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
		sizeBytes: PgColumn_ffrhhp34<{
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
		contentHash: PgColumn_ffrhhp34<{
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
		durationSeconds: PgColumn_ffrhhp34<{
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
		state: PgColumn_ffrhhp34<{
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
		failureReason: PgColumn_ffrhhp34<{
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
		repBy: PgColumn_ffrhhp34<{
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
		repLabel: PgColumn_ffrhhp34<{
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
		repChannel: PgColumn_ffrhhp34<{
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
		speakerLabels: PgColumn_ffrhhp34<{
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
		uploadedBy: PgColumn_ffrhhp34<{
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
		objectKey: PgColumn_ffrhhp34<{
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
		transcriptKey: PgColumn_ffrhhp34<{
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
		epoch: PgColumn_ffrhhp34<{
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
		repSeq: PgColumn_ffrhhp34<{
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
		deletionSeq: PgColumn_ffrhhp34<{
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
		vectorsRemovedSeq: PgColumn_ffrhhp34<{
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
		taggedOutcomeSeq: PgColumn_ffrhhp34<{
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
		sentToVendorAt: PgColumn_ffrhhp34<{
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
		vendorSendSeq: PgColumn_ffrhhp34<{
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
		vendorRemovedAt: PgColumn_ffrhhp34<{
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
		deletedAt: PgColumn_ffrhhp34<{
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
		deletedBy: PgColumn_ffrhhp34<{
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
		purgeDueAt: PgColumn_ffrhhp34<{
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
		purgeStartedAt: PgColumn_ffrhhp34<{
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
		purgeLeaseUntil: PgColumn_ffrhhp34<{
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
		purgeAttempts: PgColumn_ffrhhp34<{
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
		restoreBarredAt: PgColumn_ffrhhp34<{
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
		createdAt: PgColumn_ffrhhp34<{
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
		updatedAt: PgColumn_ffrhhp34<{
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
declare const callJobs: PgTableWithColumns_a5zn0g34<{
	name: "call_jobs";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp34<{
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
		organizationId: PgColumn_ffrhhp34<{
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
		callId: PgColumn_ffrhhp34<{
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
		kind: PgColumn_ffrhhp34<{
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
		epoch: PgColumn_ffrhhp34<{
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
		repSeq: PgColumn_ffrhhp34<{
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
		state: PgColumn_ffrhhp34<{
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
		attempts: PgColumn_ffrhhp34<{
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
		nextAttemptAt: PgColumn_ffrhhp34<{
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
		claimToken: PgColumn_ffrhhp34<{
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
		failureReason: PgColumn_ffrhhp34<{
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
		finishedAt: PgColumn_ffrhhp34<{
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
		createdAt: PgColumn_ffrhhp34<{
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
		updatedAt: PgColumn_ffrhhp34<{
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
declare const callVendorSends: PgTableWithColumns_a5zn0g34<{
	name: "call_vendor_sends";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp34<{
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
		callId: PgColumn_ffrhhp34<{
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
		seq: PgColumn_ffrhhp34<{
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
		vendorId: PgColumn_ffrhhp34<{
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
		createdAt: PgColumn_ffrhhp34<{
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
		recordedAt: PgColumn_ffrhhp34<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g35 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp35 } from "drizzle-orm/pg-core";
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
declare const consumedMessage: PgTableWithColumns_a5zn0g35<{
	name: "consumed_message";
	schema: "playbook";
	columns: {
		consumer: PgColumn_ffrhhp35<{
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
		organizationId: PgColumn_ffrhhp35<{
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
		messageId: PgColumn_ffrhhp35<{
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
		state: PgColumn_ffrhhp35<{
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
		claimToken: PgColumn_ffrhhp35<{
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
		leaseExpiresAt: PgColumn_ffrhhp35<{
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
		completedAt: PgColumn_ffrhhp35<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g36 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp36 } from "drizzle-orm/pg-core";
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
declare const playbookIdempotencyKeys: PgTableWithColumns_a5zn0g36<{
	name: "idempotency_keys";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp36<{
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
		userId: PgColumn_ffrhhp36<{
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
		route: PgColumn_ffrhhp36<{
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
		key: PgColumn_ffrhhp36<{
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
		requestHash: PgColumn_ffrhhp36<{
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
		status: PgColumn_ffrhhp36<{
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
		response: PgColumn_ffrhhp36<{
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
		createdAt: PgColumn_ffrhhp36<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g37 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp37 } from "drizzle-orm/pg-core";
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
declare const playbookOrphanSweeps: PgTableWithColumns_a5zn0g37<{
	name: "orphan_sweeps";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp37<{
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
		sweptThrough: PgColumn_ffrhhp37<{
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
		erasedAttemptAt: PgColumn_ffrhhp37<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g38 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp38 } from "drizzle-orm/pg-core";
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
declare const deals: PgTableWithColumns_a5zn0g38<{
	name: "deals";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp38<{
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
		organizationId: PgColumn_ffrhhp38<{
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
		dealId: PgColumn_ffrhhp38<{
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
		name: PgColumn_ffrhhp38<{
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
		outcome: PgColumn_ffrhhp38<{
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
		outcomeSeq: PgColumn_ffrhhp38<{
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
		retagThrough: PgColumn_ffrhhp38<{
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
		closedAt: PgColumn_ffrhhp38<{
			name: string;
			tableName: "deals";
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
		amount: PgColumn_ffrhhp38<{
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
		currency: PgColumn_ffrhhp38<{
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
		appearedInImport: PgColumn_ffrhhp38<{
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
		createdAt: PgColumn_ffrhhp38<{
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
		updatedAt: PgColumn_ffrhhp38<{
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
declare const dealImports: PgTableWithColumns_a5zn0g38<{
	name: "deal_imports";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp38<{
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
		organizationId: PgColumn_ffrhhp38<{
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
		state: PgColumn_ffrhhp38<{
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
		failureReason: PgColumn_ffrhhp38<{
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
		uploadedBy: PgColumn_ffrhhp38<{
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
		objectKey: PgColumn_ffrhhp38<{
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
		sizeBytes: PgColumn_ffrhhp38<{
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
		attempts: PgColumn_ffrhhp38<{
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
		nextAttemptAt: PgColumn_ffrhhp38<{
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
		claimToken: PgColumn_ffrhhp38<{
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
		rowCount: PgColumn_ffrhhp38<{
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
		appliedCount: PgColumn_ffrhhp38<{
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
		rejectedCount: PgColumn_ffrhhp38<{
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
		reportThrough: PgColumn_ffrhhp38<{
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
		objectRemovedAt: PgColumn_ffrhhp38<{
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
		erasedAt: PgColumn_ffrhhp38<{
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
		finishedAt: PgColumn_ffrhhp38<{
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
		createdAt: PgColumn_ffrhhp38<{
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
		updatedAt: PgColumn_ffrhhp38<{
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
declare const dealImportRows: PgTableWithColumns_a5zn0g38<{
	name: "deal_import_rows";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp38<{
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
		importId: PgColumn_ffrhhp38<{
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
		rowNumber: PgColumn_ffrhhp38<{
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
		dealId: PgColumn_ffrhhp38<{
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
		result: PgColumn_ffrhhp38<{
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
		reason: PgColumn_ffrhhp38<{
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
declare const rightsConfirmations: PgTableWithColumns_a5zn0g38<{
	name: "rights_confirmations";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp38<{
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
		confirmedBy: PgColumn_ffrhhp38<{
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
		confirmedAt: PgColumn_ffrhhp38<{
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
		wordingVersion: PgColumn_ffrhhp38<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g39 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp39 } from "drizzle-orm/pg-core";
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
declare const documents: PgTableWithColumns_a5zn0g39<{
	name: "documents";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp39<{
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
		organizationId: PgColumn_ffrhhp39<{
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
		name: PgColumn_ffrhhp39<{
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
		state: PgColumn_ffrhhp39<{
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
		contentHash: PgColumn_ffrhhp39<{
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
		sizeBytes: PgColumn_ffrhhp39<{
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
		declaredType: PgColumn_ffrhhp39<{
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
		detectedType: PgColumn_ffrhhp39<{
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
		uploadedBy: PgColumn_ffrhhp39<{
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
		objectKey: PgColumn_ffrhhp39<{
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
		failureReason: PgColumn_ffrhhp39<{
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
		pageCount: PgColumn_ffrhhp39<{
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
		epoch: PgColumn_ffrhhp39<{
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
		deletionSeq: PgColumn_ffrhhp39<{
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
		vectorsRemovedSeq: PgColumn_ffrhhp39<{
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
		deletedAt: PgColumn_ffrhhp39<{
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
		deletedBy: PgColumn_ffrhhp39<{
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
		purgeDueAt: PgColumn_ffrhhp39<{
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
		purgeStartedAt: PgColumn_ffrhhp39<{
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
		purgeLeaseUntil: PgColumn_ffrhhp39<{
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
		purgeAttempts: PgColumn_ffrhhp39<{
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
		restoreBarredAt: PgColumn_ffrhhp39<{
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
		createdAt: PgColumn_ffrhhp39<{
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
		updatedAt: PgColumn_ffrhhp39<{
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
declare const organizationUsage: PgTableWithColumns_a5zn0g39<{
	name: "organization_usage";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp39<{
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
		documentCount: PgColumn_ffrhhp39<{
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
		byteCount: PgColumn_ffrhhp39<{
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
		dealCount: PgColumn_ffrhhp39<{
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
		callCount: PgColumn_ffrhhp39<{
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
		recordingByteCount: PgColumn_ffrhhp39<{
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
		updatedAt: PgColumn_ffrhhp39<{
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
declare const ingestionJobs: PgTableWithColumns_a5zn0g39<{
	name: "ingestion_jobs";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp39<{
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
		organizationId: PgColumn_ffrhhp39<{
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
		documentId: PgColumn_ffrhhp39<{
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
		epoch: PgColumn_ffrhhp39<{
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
		state: PgColumn_ffrhhp39<{
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
		step: PgColumn_ffrhhp39<{
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
		attempts: PgColumn_ffrhhp39<{
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
		nextAttemptAt: PgColumn_ffrhhp39<{
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
		claimToken: PgColumn_ffrhhp39<{
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
		artifactKey: PgColumn_ffrhhp39<{
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
		pageCount: PgColumn_ffrhhp39<{
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
		chunkCount: PgColumn_ffrhhp39<{
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
		chunksDone: PgColumn_ffrhhp39<{
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
		failureReason: PgColumn_ffrhhp39<{
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
		finishedAt: PgColumn_ffrhhp39<{
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
		createdAt: PgColumn_ffrhhp39<{
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
		updatedAt: PgColumn_ffrhhp39<{
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
declare const indexSettings: PgTableWithColumns_a5zn0g39<{
	name: "index_settings";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp39<{
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
		embeddingModel: PgColumn_ffrhhp39<{
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
		embeddingDimension: PgColumn_ffrhhp39<{
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
		vectorsWrittenAt: PgColumn_ffrhhp39<{
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
		createdAt: PgColumn_ffrhhp39<{
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
		updatedAt: PgColumn_ffrhhp39<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g40 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp40 } from "drizzle-orm/pg-core";
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
declare const playbookWorkHints: PgTableWithColumns_a5zn0g40<{
	name: "work_hints";
	schema: "playbook";
	columns: {
		kind: PgColumn_ffrhhp40<{
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
		organizationId: PgColumn_ffrhhp40<{
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
		dueAt: PgColumn_ffrhhp40<{
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
export { ABANDON_CASE_MAX_ATTEMPTS, ABANDON_CASE_OUTCOMES, API_KEY_KINDS, ATTEMPT_COUNTER_KEY_HASH_BYTES, ATTEMPT_COUNTER_KINDS, ATTEMPT_COUNTER_MAX_HITS, AUDIT_ACTOR_TYPES, AUDIT_RETENTION_FLOOR, AbandonCase, ApiKey, AttemptCounter, AuditLog, BackupCode, CALL_CHANNELS, CALL_FAILURE_REASONS, CALL_JOB_KINDS, CALL_JOB_MAX_ATTEMPTS, CALL_JOB_STATES, CALL_KINDS, CALL_MAX_RECORDING_BYTES, CALL_MAX_RECORDING_SECONDS, CALL_MAX_SEQ, CALL_MAX_SPEAKERS, CALL_MAX_TRANSCRIPT_BYTES, CALL_MAX_VENDOR_SENDS, CALL_MEDIA_TYPES, CALL_PENDING_CLEANUP_PREDICATE, CALL_PURGE_MAX_ATTEMPTS, CALL_REP_BY, CALL_SPEAKER_LABEL_MAX_BYTES, CALL_SPEAKER_LABEL_MAX_LENGTH, CALL_STATES, CALL_VENDOR_ID_PATTERN, CONSUMED_MESSAGE_STATES, CREDENTIAL_TYPES, Credential, DEAL_ID_MAX_BYTES, DEAL_ID_MAX_LENGTH, DEAL_IMPORT_APPLY_BATCH, DEAL_IMPORT_FAILURE_REASONS, DEAL_IMPORT_MAX_ATTEMPTS, DEAL_IMPORT_MAX_BYTES, DEAL_IMPORT_MAX_ROWS, DEAL_IMPORT_ROW_REASONS, DEAL_IMPORT_ROW_REASONS_WITHOUT_DEAL_ID, DEAL_IMPORT_ROW_RESULTS, DEAL_IMPORT_STATES, DEAL_MAX_SEQ, DEAL_NAME_MAX_BYTES, DEAL_NAME_MAX_LENGTH, DEAL_OUTCOMES, DOCUMENT_FAILURE_REASONS, DOCUMENT_FILE_TYPES, DOCUMENT_MAX_BYTES, DOCUMENT_MAX_PAGE_COUNT, DOCUMENT_PURGE_MAX_ATTEMPTS, DOCUMENT_STATES, ENVIRONMENT_KINDS, EVENT_RETENTION_FLOOR, Environment, EnvironmentSettingsRow, Event, FlowAttemptRow, GLOBAL_SCOPE_ORGANIZATION_ID, HookCallCount, HookRow, IDEMPOTENCY_HASH_BYTES, IDEMPOTENCY_KEY_MAX, IDEMPOTENCY_RESPONSE_MAX_BYTES, IDEMPOTENCY_ROUTE_MAX, IDENTITY_PROVIDERS, INGESTION_JOB_MAX_ATTEMPTS, INGESTION_JOB_STATES, INGESTION_MAX_CHUNKS, INGESTION_STEPS, INTERNAL_CALL_USER_ID, INVITATION_ROLES, INVITATION_STATES, Identity, InstanceAuditLog, MAX_QUEUED_DEAL_IMPORTS, MEMBERSHIP_ROLES, MEMBER_NAME_MAX, NativeAppRow, NewAbandonCase, NewApiKey, NewAttemptCounter, NewAuditLog, NewBackupCode, NewCredential, NewEnvironment, NewEnvironmentSettingsRow, NewEvent, NewFlowAttemptRow, NewHookCallCount, NewHookRow, NewIdentity, NewInstanceAuditLog, NewNativeAppRow, NewOAuthProviderRow, NewPasskey, NewPasskeyChallenge, NewPasswordHistoryEntry, NewProject, NewProposalRow, NewRefreshToken, NewSession, NewSigningKey, NewSmsCodeCount, NewUser, NewUserFactor, NewVerificationToken, NewWebhookDeliveryAttemptRow, NewWebhookDeliveryRow, NewWebhookEndpointRow, NewWorkspace, OAUTH_PROVIDERS, OAuthProviderConfig, OAuthProviderRow, ORGANIZATION_REGIONS, ORGANIZATION_STATUSES, PASSKEY_CHALLENGE_PURPOSES, PENDING_CLEANUP_PREDICATE, Passkey, PasskeyChallenge, PasswordHistoryEntry, Project, ProposalRow, RIGHTS_MAX_WORDING_VERSION, RefreshToken, SESSION_CLIENTS, SESSION_REVOKE_REASONS, SESSION_TYPES, SIGNING_KEY_STATUSES, SMS_COUNT_RETENTION_FLOOR_DAYS, Session, SigningKey, SmsCodeCount, USER_FACTOR_TYPES, User, UserFactor, VERIFICATION_PURPOSES, VerificationToken, WEBHOOK_DELIVERY_RETENTION_FLOOR, WEBHOOK_DELIVERY_STATES, WORK_KINDS, WebhookDeliveryAttemptRow, WebhookDeliveryRow, WebhookEndpointRow, Workspace, abandonCases, apiKeys, attemptCounters, auditLogs, authSchema, backupCodes, callJobs, callReuploadRequeues, callVendorSends, calls, consumedMessage, coreSchema, credentials, dealImportRows, dealImports, deals, documents, environmentSettings, environments, events, flowAttempts, hookCallCounts, hooks, idempotencyKeys, identities, indexSettings, ingestionJobs, instanceAuditLogs, invitationDirectory, invitations, membershipDirectory, memberships, nativeApps, oauthProviders, organizationState, organizationUsage, organizations, passkeyChallenges, passkeys, passwordHistory, playbookIdempotencyKeys, playbookOrphanSweeps, playbookSchema, playbookWorkHints, projects, proposals, refreshTokens, repChangeAllowed, rightsConfirmations, sessions, signingKeys, smsCodeCounts, teamMembers, teams, userFactors, users, verificationTokens, webhookDeliveries, webhookDeliveryAttempts, webhookEndpoints, workspaces };
