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
/** The counts a dashboard shows, per day. Mirrors the contract's `ANALYTICS_METRICS`. */
declare const ROLLUP_METRICS: readonly ["sends", "replies", "positive_replies", "meetings", "outcomes_won", "outcomes_lost"];
/** What a rollup row is split by; `total` has the empty key. The rest mirror `ANALYTICS_GROUP_BYS`. */
declare const ROLLUP_GROUP_KINDS: readonly ["total", "channel", "agent_kind", "campaign", "rep"];
/** The longest group key. Mirrors the contract's `analyticsGroupKeySchema` (an id is shorter). */
declare const MAX_ROLLUP_GROUP_KEY_LENGTH = 64;
/** The largest count a rollup row holds: the table's bound, far above any real day. */
declare const MAX_ROLLUP_COUNT = 0xe8d4a51000;
/** What a touch was. Mirrors the contract's `TOUCH_KINDS`. */
declare const TOUCH_KINDS: readonly ["message", "call"];
/** The channels a touch happened on: the inbox channels and the phone. */
declare const TOUCH_CHANNELS: readonly ["email", "linkedin", "chat", "phone"];
/** The Agent kinds a touch can be credited to. Mirrors the contract's `AGENT_KINDS`. */
declare const TOUCH_AGENT_KINDS: readonly ["inbound", "outbound"];
/** The most Playbook sources one touch cites. Mirrors the contract's `MAX_TOUCH_SOURCES`. */
declare const MAX_TOUCH_SOURCES = 20;
/** What a source of performance is: a Moment or a Document passage. */
declare const SOURCE_KINDS: readonly ["moment", "document"];
/** The longest source key: a Call id and a Moment number, or a document id and a page. */
declare const MAX_SOURCE_KEY_LENGTH = 120;
/** The flag a source can carry. Mirrors the contract's `SOURCE_FLAGS`. */
declare const SOURCE_PERFORMANCE_FLAGS: readonly ["cited_often_lost"];
/** The largest Deal count a source holds: the table's bound. */
declare const MAX_SOURCE_DEALS = 1e9;
/** What an Assessment judged. Mirrors the contract's `ASSESSMENT_SUBJECT_KINDS`. */
declare const ASSESSMENT_SUBJECT_KINDS: readonly ["draft", "call_turn"];
/** What an Assessment decided. Mirrors the contract's `ASSESSMENT_VERDICTS`. */
declare const ASSESSMENT_VERDICTS: readonly ["pass", "warn", "fail"];
/** Who judged. Mirrors the contract's `assessmentJudgeSourceSchema`. */
declare const ASSESSMENT_JUDGE_SOURCES: readonly ["model", "rules"];
/** What a finding is about. Mirrors the contract's `FINDING_CATEGORIES`. */
declare const FINDING_CATEGORIES: readonly ["unsupported_claim", "policy_deviation", "missing_disclosure", "tone"];
/** How serious a finding is, worst last. Mirrors the contract's `FINDING_SEVERITIES`. */
declare const FINDING_SEVERITIES: readonly ["low", "medium", "high"];
/** What an Admin says about a finding. Mirrors the contract's `FINDING_FEEDBACKS`. */
declare const FINDING_FEEDBACKS: readonly ["correct", "false_alarm"];
/** The largest offset a finding's span may reach. Mirrors the contract's `MAX_FINDING_SPAN_OFFSET`. */
declare const MAX_FINDING_SPAN_OFFSET = 2e4;
/** The longest explanation of a finding. Mirrors the contract's `MAX_FINDING_EXPLANATION_LENGTH`. */
declare const MAX_FINDING_EXPLANATION_LENGTH = 500;
/** The largest Draft version number and Call turn number the table holds. */
declare const MAX_ASSESSED_NUMBER = 1e5;
/** The Outcome label of a Conversation. Mirrors the contract's `CONVERSATION_OUTCOME_LABELS`. */
declare const CONVERSATION_OUTCOME_LABELS: readonly ["won", "lost", "open", "no_response", "meeting_booked"];
/** The longest Conversation summary. Mirrors the contract's `MAX_SUMMARY_LENGTH`. */
declare const MAX_SUMMARY_LENGTH = 500;
/**
* One day's count of one metric for one group of an Organization: the read model every dashboard
* series is served from, so a request never scans history. The row is unique per Organization,
* metric, group and UTC day (`rollup_daily_pkey`), so a consumer upserts the count it computed and
* replaying an event stream can only write the same number again; a late event is added to its
* original `day`. `group_kind = 'total'` has the empty `group_key`; any other kind names a
* channel, an Agent kind, a Campaign id or a Membership id in `group_key`.
*
* Lists served: a metric's series over a date range, one group kind, by day then group key, on the
* primary key (`organization_id, metric, group_kind, day, group_key`).
*/
declare const rollupDaily: PgTableWithColumns_a5zn0g33<{
	name: "rollup_daily";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp33<{
			name: "organization_id";
			tableName: "rollup_daily";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		metric: PgColumn_ffrhhp33<{
			name: "metric";
			tableName: "rollup_daily";
			dataType: "string";
			columnType: "PgText";
			data: "meetings" | "outcomes_lost" | "outcomes_won" | "positive_replies" | "replies" | "sends";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["sends", "replies", "positive_replies", "meetings", "outcomes_won", "outcomes_lost"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		groupKind: PgColumn_ffrhhp33<{
			name: "group_kind";
			tableName: "rollup_daily";
			dataType: "string";
			columnType: "PgText";
			data: "agent_kind" | "campaign" | "channel" | "rep" | "total";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["total", "channel", "agent_kind", "campaign", "rep"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		day: PgColumn_ffrhhp33<{
			name: "day";
			tableName: "rollup_daily";
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
		groupKey: PgColumn_ffrhhp33<{
			name: "group_key";
			tableName: "rollup_daily";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		count: PgColumn_ffrhhp33<{
			name: "count";
			tableName: "rollup_daily";
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
		updatedAt: PgColumn_ffrhhp33<{
			name: string;
			tableName: "rollup_daily";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* Which events the rollups have already counted, so replaying an event stream cannot count one twice
* and the nightly reconcile can recompute a day from what was counted. One row per Organization,
* metric and `dedupe_key` (`analytics_event_pkey`): the key is the event id, or the id of the Message
* the event is about when a later event about it must not count again. A consumer inserts the row
* first (`ON CONFLICT DO NOTHING`) and adds to `rollup_daily` only when a row went in, in one
* transaction. `day` is the UTC day the event is counted on, so a late event keeps its original day;
* `channel` is set when the event has one. Holds ids, a day and a label: never text.
*
* Lists served: the reconcile's per-day recount, `group by metric, day, channel` over a bounded day
* range (`analytics_event_day_idx`).
*/
declare const analyticsEvents: PgTableWithColumns_a5zn0g33<{
	name: "analytics_event";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp33<{
			name: "organization_id";
			tableName: "analytics_event";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		metric: PgColumn_ffrhhp33<{
			name: "metric";
			tableName: "analytics_event";
			dataType: "string";
			columnType: "PgText";
			data: "meetings" | "outcomes_lost" | "outcomes_won" | "positive_replies" | "replies" | "sends";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["sends", "replies", "positive_replies", "meetings", "outcomes_won", "outcomes_lost"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		dedupeKey: PgColumn_ffrhhp33<{
			name: "dedupe_key";
			tableName: "analytics_event";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		day: PgColumn_ffrhhp33<{
			name: "day";
			tableName: "analytics_event";
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
		channel: PgColumn_ffrhhp33<{
			name: "channel";
			tableName: "analytics_event";
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
		recordedAt: PgColumn_ffrhhp33<{
			name: string;
			tableName: "analytics_event";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* One Message or Call that Attribution links to a Prospect, kept so a Deal's Outcome can be traced
* to what touched the Prospect. **References only**: the Message or Call is named by `ref_id`
* and holds no text. One row per Message or Call (`touches_ref_key`), so a replayed event is the
* same row. `deal_record_id`, `first_touch` and `last_touch` are set when an Outcome is
* attributed: a touch has credit only with a Deal. `cited_sources` is the Playbook sources
* (Moments and Documents) the touch cited, as the contract's Citation references, at most 20.
*
* Lists served (keyset `occurred_at < $cursor`, newest first): a Prospect's touches
* (`touches_prospect_idx`) and a Deal's touches (`touches_deal_idx`).
*/
declare const touches: PgTableWithColumns_a5zn0g33<{
	name: "touches";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp33<{
			name: "id";
			tableName: "touches";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "touches";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		kind: PgColumn_ffrhhp33<{
			name: "kind";
			tableName: "touches";
			dataType: "string";
			columnType: "PgText";
			data: "call" | "message";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["message", "call"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		refId: PgColumn_ffrhhp33<{
			name: "ref_id";
			tableName: "touches";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "touches";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "touches";
			dataType: "string";
			columnType: "PgText";
			data: "chat" | "email" | "linkedin" | "phone";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["email", "linkedin", "chat", "phone"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		agentKind: PgColumn_ffrhhp33<{
			name: "agent_kind";
			tableName: "touches";
			dataType: "string";
			columnType: "PgText";
			data: "inbound" | "outbound";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["inbound", "outbound"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		repMembershipId: PgColumn_ffrhhp33<{
			name: "rep_membership_id";
			tableName: "touches";
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
		campaignId: PgColumn_ffrhhp33<{
			name: "campaign_id";
			tableName: "touches";
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
			tableName: "touches";
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
		dealRecordId: PgColumn_ffrhhp33<{
			name: "deal_record_id";
			tableName: "touches";
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
		firstTouch: PgColumn_ffrhhp33<{
			name: "first_touch";
			tableName: "touches";
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
		lastTouch: PgColumn_ffrhhp33<{
			name: "last_touch";
			tableName: "touches";
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
		citedSources: PgColumn_ffrhhp33<{
			name: "cited_sources";
			tableName: "touches";
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
		createdAt: PgColumn_ffrhhp33<{
			name: string;
			tableName: "touches";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* How the Deals a Playbook source touched ended: one row per Moment or Document passage of an
* Organization (`source_key` is the Call id and Moment number, or the document id and page).
* `deals_touched` and `deals_won` are counts; the win rate is computed by the reader, and only
* from the minimum sample. `flag` marks a source cited often but correlated with lost Deals.
*
* Lists served (keyset `(deals_touched, source_key)`, most touched first): all sources
* (`source_performance_list_idx`) and flagged ones (`source_performance_flag_idx`).
*/
declare const sourcePerformance: PgTableWithColumns_a5zn0g33<{
	name: "source_performance";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp33<{
			name: "organization_id";
			tableName: "source_performance";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sourceKind: PgColumn_ffrhhp33<{
			name: "source_kind";
			tableName: "source_performance";
			dataType: "string";
			columnType: "PgText";
			data: "document" | "moment";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["moment", "document"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sourceKey: PgColumn_ffrhhp33<{
			name: "source_key";
			tableName: "source_performance";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		dealsTouched: PgColumn_ffrhhp33<{
			name: "deals_touched";
			tableName: "source_performance";
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
		dealsWon: PgColumn_ffrhhp33<{
			name: "deals_won";
			tableName: "source_performance";
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
		flag: PgColumn_ffrhhp33<{
			name: "flag";
			tableName: "source_performance";
			dataType: "string";
			columnType: "PgText";
			data: "cited_often_lost";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["cited_often_lost"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp33<{
			name: string;
			tableName: "source_performance";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* The automatic check of one Agent turn: a Draft version before release or a Call turn after it.
* Unique per subject (`assessments_draft_key`, `assessments_call_turn_key`), so a retried check
* is the same row. `worst_severity_rank` is the worst finding (1 low, 2 medium, 3 high, null for
* none) so a review list can sort by severity on an index. **No text of the turn is stored**: the
* findings hold spans, and the offending sentence is read from the Draft or Call.
*
* Lists served (keyset, newest first): all (`assessments_list_idx`), one verdict
* (`assessments_verdict_idx`), flagged turns by severity (`assessments_review_idx`), and the
* weekly failed rate by Agent kind and instruction version (`assessments_rate_idx`).
*/
declare const assessments: PgTableWithColumns_a5zn0g33<{
	name: "assessments";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp33<{
			name: "id";
			tableName: "assessments";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "assessments";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		subjectKind: PgColumn_ffrhhp33<{
			name: "subject_kind";
			tableName: "assessments";
			dataType: "string";
			columnType: "PgText";
			data: "call_turn" | "draft";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["draft", "call_turn"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		draftId: PgColumn_ffrhhp33<{
			name: "draft_id";
			tableName: "assessments";
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
		draftVersion: PgColumn_ffrhhp33<{
			name: "draft_version";
			tableName: "assessments";
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
		callId: PgColumn_ffrhhp33<{
			name: "call_id";
			tableName: "assessments";
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
		turnIndex: PgColumn_ffrhhp33<{
			name: "turn_index";
			tableName: "assessments";
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
		prospectId: PgColumn_ffrhhp33<{
			name: "prospect_id";
			tableName: "assessments";
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
		agentKind: PgColumn_ffrhhp33<{
			name: "agent_kind";
			tableName: "assessments";
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
		instructionVersion: PgColumn_ffrhhp33<{
			name: "instruction_version";
			tableName: "assessments";
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
		verdict: PgColumn_ffrhhp33<{
			name: "verdict";
			tableName: "assessments";
			dataType: "string";
			columnType: "PgText";
			data: "fail" | "pass" | "warn";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["pass", "warn", "fail"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		judgeSource: PgColumn_ffrhhp33<{
			name: "judge_source";
			tableName: "assessments";
			dataType: "string";
			columnType: "PgText";
			data: "model" | "rules";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["model", "rules"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		worstSeverityRank: PgColumn_ffrhhp33<{
			name: "worst_severity_rank";
			tableName: "assessments";
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
		createdAt: PgColumn_ffrhhp33<{
			name: string;
			tableName: "assessments";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* One problem an Assessment found: a category, a severity and the **sentence span** (character
* offsets, start included, end excluded) with a short explanation. There is no body or text
* column, so the table cannot hold the turn: the offending sentence is read from the Draft or
* Call by the span. An Admin's feedback (`correct` or `false_alarm`) is stored with who and when,
* all three or none.
*
* Lists served: an Assessment's findings by id (`assessment_findings_assessment_idx`).
*/
declare const assessmentFindings: PgTableWithColumns_a5zn0g33<{
	name: "assessment_findings";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp33<{
			name: "id";
			tableName: "assessment_findings";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "assessment_findings";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		assessmentId: PgColumn_ffrhhp33<{
			name: "assessment_id";
			tableName: "assessment_findings";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		category: PgColumn_ffrhhp33<{
			name: "category";
			tableName: "assessment_findings";
			dataType: "string";
			columnType: "PgText";
			data: "missing_disclosure" | "policy_deviation" | "tone" | "unsupported_claim";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["unsupported_claim", "policy_deviation", "missing_disclosure", "tone"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		severity: PgColumn_ffrhhp33<{
			name: "severity";
			tableName: "assessment_findings";
			dataType: "string";
			columnType: "PgText";
			data: "high" | "low" | "medium";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["low", "medium", "high"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		spanStart: PgColumn_ffrhhp33<{
			name: "span_start";
			tableName: "assessment_findings";
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
		spanEnd: PgColumn_ffrhhp33<{
			name: "span_end";
			tableName: "assessment_findings";
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
		explanation: PgColumn_ffrhhp33<{
			name: "explanation";
			tableName: "assessment_findings";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		feedback: PgColumn_ffrhhp33<{
			name: "feedback";
			tableName: "assessment_findings";
			dataType: "string";
			columnType: "PgText";
			data: "correct" | "false_alarm";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["correct", "false_alarm"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		feedbackByMembershipId: PgColumn_ffrhhp33<{
			name: "feedback_by_membership_id";
			tableName: "assessment_findings";
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
		feedbackAt: PgColumn_ffrhhp33<{
			name: string;
			tableName: "assessment_findings";
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
			name: string;
			tableName: "assessment_findings";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* A Conversation's short summary and Outcome label, written by a model from the Conversation: the
* summary is untrusted model output, shown as text and never run, and is stored apart from Message
* bodies. One row per Conversation; regenerating replaces it.
*
* Lists served: none; the primary key is the lookup.
*/
declare const conversationSummaries: PgTableWithColumns_a5zn0g33<{
	name: "conversation_summaries";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp33<{
			name: "organization_id";
			tableName: "conversation_summaries";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		conversationId: PgColumn_ffrhhp33<{
			name: "conversation_id";
			tableName: "conversation_summaries";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		summary: PgColumn_ffrhhp33<{
			name: "summary";
			tableName: "conversation_summaries";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		outcomeLabel: PgColumn_ffrhhp33<{
			name: "outcome_label";
			tableName: "conversation_summaries";
			dataType: "string";
			columnType: "PgText";
			data: "lost" | "meeting_booked" | "no_response" | "open" | "won";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["won", "lost", "open", "no_response", "meeting_booked"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		generatedAt: PgColumn_ffrhhp33<{
			name: string;
			tableName: "conversation_summaries";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
declare const consentWordings: PgTableWithColumns_a5zn0g34<{
	name: "consent_wording";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp34<{
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
		organizationId: PgColumn_ffrhhp34<{
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
		version: PgColumn_ffrhhp34<{
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
		text: PgColumn_ffrhhp34<{
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
		channels: PgColumn_ffrhhp34<{
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
		supersedesId: PgColumn_ffrhhp34<{
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
		createdAt: PgColumn_ffrhhp34<{
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
		createdByUserId: PgColumn_ffrhhp34<{
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
declare const consentForms: PgTableWithColumns_a5zn0g34<{
	name: "consent_form";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp34<{
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
		organizationId: PgColumn_ffrhhp34<{
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
		wordingId: PgColumn_ffrhhp34<{
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
		name: PgColumn_ffrhhp34<{
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
		channels: PgColumn_ffrhhp34<{
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
		state: PgColumn_ffrhhp34<{
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
		token: PgColumn_ffrhhp34<{
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
		createdAt: PgColumn_ffrhhp34<{
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
		createdByUserId: PgColumn_ffrhhp34<{
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
		publishedAt: PgColumn_ffrhhp34<{
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
		closedAt: PgColumn_ffrhhp34<{
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
* Which Organization and form a hosted-form token opens, for published and closed forms only (a
* draft has no token). The public form route receives only the token, so this cannot sit behind
* row-level security: it is a no-access table like `invitation_directory`. It holds the token,
* the Organization id, the form id, the wording id and the state, nothing else. `closeline_core`
* reaches it only through the `SECURITY DEFINER` function `core.consent_form_for_token(token)`
* (one row for one exact key, joined to `organization_state` so only an `active` Organization
* answers); the trigger `consent_form_sync_directory` on `consent_form` keeps it, and no service
* role holds any privilege on it. One-click unsubscribe needs no such table: its token is signed
* and carries the Organization (M03, ADR 0021).
*/
declare const consentFormDirectory: PgTableWithColumns_a5zn0g34<{
	name: "consent_form_directory";
	schema: "core";
	columns: {
		token: PgColumn_ffrhhp34<{
			name: "token";
			tableName: "consent_form_directory";
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
		organizationId: PgColumn_ffrhhp34<{
			name: "organization_id";
			tableName: "consent_form_directory";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		formId: PgColumn_ffrhhp34<{
			name: "form_id";
			tableName: "consent_form_directory";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		wordingId: PgColumn_ffrhhp34<{
			name: "wording_id";
			tableName: "consent_form_directory";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp34<{
			name: "state";
			tableName: "consent_form_directory";
			dataType: "string";
			columnType: "PgText";
			data: "closed" | "published";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["published", "closed"];
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
declare const contactConsentEvents: PgTableWithColumns_a5zn0g34<{
	name: "contact_consent_event";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp34<{
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
		organizationId: PgColumn_ffrhhp34<{
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
		seq: PgColumn_ffrhhp34<{
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
		prospectId: PgColumn_ffrhhp34<{
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
		channel: PgColumn_ffrhhp34<{
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
		kind: PgColumn_ffrhhp34<{
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
		source: PgColumn_ffrhhp34<{
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
		wordingId: PgColumn_ffrhhp34<{
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
		evidenceRef: PgColumn_ffrhhp34<{
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
		callId: PgColumn_ffrhhp34<{
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
		formId: PgColumn_ffrhhp34<{
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
		ipAddress: PgColumn_ffrhhp34<{
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
		userAgent: PgColumn_ffrhhp34<{
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
		stopAll: PgColumn_ffrhhp34<{
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
		recordedByUserId: PgColumn_ffrhhp34<{
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
		occurredAt: PgColumn_ffrhhp34<{
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
		recordedAt: PgColumn_ffrhhp34<{
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
declare const suppressionEntries: PgTableWithColumns_a5zn0g34<{
	name: "suppression_entry";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp34<{
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
		organizationId: PgColumn_ffrhhp34<{
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
		addressKind: PgColumn_ffrhhp34<{
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
		addressHash: PgColumn_ffrhhp34<{
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
		maskedAddress: PgColumn_ffrhhp34<{
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
		reason: PgColumn_ffrhhp34<{
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
		channel: PgColumn_ffrhhp34<{
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
		sourceRef: PgColumn_ffrhhp34<{
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
		addedByUserId: PgColumn_ffrhhp34<{
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
		removable: PgColumn_ffrhhp34<{
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
		createdAt: PgColumn_ffrhhp34<{
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
		removedAt: PgColumn_ffrhhp34<{
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
		removedByUserId: PgColumn_ffrhhp34<{
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
		removalReason: PgColumn_ffrhhp34<{
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
declare const contactCheckLog: PgTableWithColumns_a5zn0g34<{
	name: "contact_check_log";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp34<{
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
		organizationId: PgColumn_ffrhhp34<{
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
		prospectId: PgColumn_ffrhhp34<{
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
		channel: PgColumn_ffrhhp34<{
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
		purpose: PgColumn_ffrhhp34<{
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
		caller: PgColumn_ffrhhp34<{
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
		allowed: PgColumn_ffrhhp34<{
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
		code: PgColumn_ffrhhp34<{
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
		basis: PgColumn_ffrhhp34<{
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
		checkedAt: PgColumn_ffrhhp34<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g35 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp35 } from "drizzle-orm/pg-core";
import { Column as Column_xh1aba4 } from "drizzle-orm";
import { PgColumnBuilder as PgColumnBuilder_r7cy324 } from "drizzle-orm/pg-core";
import { ColumnBuilderExtraConfig as ColumnBuilderExtraConfig_359rmb4 } from "drizzle-orm";
/** The Agents an Organization writes instructions for. Mirrors the contract's `AGENT_KINDS`. */
declare const AGENT_KINDS: readonly ["inbound", "outbound"];
/** The longest instruction text, in characters. Mirrors the contract's `MAX_AGENT_INSTRUCTION_LENGTH`. */
declare const MAX_AGENT_INSTRUCTION_LENGTH = 2e4;
/** How much an Agent may do alone. Mirrors the contract's `CONTROL_LEVELS`. */
declare const CONTROL_LEVELS: readonly ["supervised", "assisted", "autonomous"];
/** The channels an Agent acts on: the channels of Contact Consent. */
declare const AGENT_SETTING_CHANNELS: readonly ["phone", "sms", "whatsapp", "email", "linkedin"];
/** The `channel` of a kind's default row, and of the Organization row: no channel. */
declare const DEFAULT_CHANNEL: "default";
/** The `agent_kind` of the Organization-wide row, which holds the pause switch. */
declare const ORGANIZATION_AGENT_KIND: "organization";
/** The reasons that hand a conversation to a person. Mirrors the contract's `ESCALATION_TRIGGERS`. */
declare const MAX_ESCALATION_RULES = 7;
/** The kinds of actor of an audit event. Mirrors the contract's `AUDIT_ACTOR_KINDS`. */
declare const AUDIT_ACTOR_KINDS: readonly ["member", "agent", "api_key", "system"];
/** The largest stored audit event, in bytes of metadata JSON (ADR 0024: an event is at most 4,096 bytes). */
declare const MAX_AUDIT_METADATA_BYTES = 4096;
/** The kinds of data export. Mirrors the contract's `EXPORT_KINDS`. */
declare const EXPORT_KINDS: readonly ["organization", "enriched_prospects"];
/** The formats of an enriched export. Mirrors the contract's `ENRICHED_EXPORT_FORMATS`. */
declare const EXPORT_FORMATS: readonly ["csv"];
/** The states of an job. Mirrors the contract's `EXPORT_STATES`. */
declare const EXPORT_STATES: readonly ["queued", "running", "ready", "failed", "expired"];
/** The states in which a job counts as running: at most one per Organization. */
declare const EXPORT_ACTIVE_STATES: readonly ["queued", "running"];
/** Why a job failed. Mirrors the contract's `EXPORT_FAILURE_REASONS`. */
declare const EXPORT_FAILURE_REASONS: readonly ["part_failed", "timed_out", "storage_unavailable"];
/** The services that write a slice. Mirrors the contract's `EXPORT_SERVICES`. */
declare const EXPORT_SERVICES: readonly ["core", "playbook", "voice", "outbound"];
/** The states of one service's slice. Mirrors the contract's `EXPORT_PART_STATES`. */
declare const EXPORT_PART_STATES: readonly ["pending", "ready", "failed"];
/** Why a slice failed. Mirrors the contract's `EXPORT_PART_FAILURE_REASONS`. */
declare const EXPORT_PART_FAILURE_REASONS: readonly ["write_failed", "storage_unavailable", "source_unavailable"];
/** The most files in one slice. Mirrors the contract's `MAX_EXPORT_PART_FILES`. */
declare const MAX_EXPORT_PART_FILES = 1e4;
/** The most bytes in one slice. Mirrors the contract's `MAX_EXPORT_PART_BYTES`. */
declare const MAX_EXPORT_PART_BYTES = 5e10;
/** The longest object-storage prefix of a slice. Mirrors the contract's `exportPrefixSchema`. */
declare const MAX_EXPORT_PREFIX_LENGTH = 300;
/** The scopes an API key can hold. Mirrors the contract's `API_KEY_SCOPES`. */
declare const API_KEY_SCOPES: readonly ["prospects:read", "prospects:write", "consent:read", "consent:write", "enrichment:read", "enrichment:write", "campaigns:read", "campaigns:write", "messaging:read", "messaging:write", "bookings:read", "bookings:write", "playbook:read", "playbook:write", "calls:read", "calls:write"];
/** The longest name of an API key. Mirrors the contract's `MAX_API_KEY_NAME_LENGTH`. */
declare const MAX_API_KEY_NAME_LENGTH = 80;
/** Roles a key's ceiling can name: any role. Mirrors the contract's `ROLES` (see `MEMBERSHIP_ROLES`). */
declare const API_KEY_ROLE_CEILINGS: readonly ["owner", "admin", "manager", "rep"];
/**
* One saved version of an Agent's written instructions (ADR 0003 puts them beneath the fixed
* rules). Numbered from 1 per Organization and Agent kind (`agent_instruction_versions_number_key`)
* and immutable: the service role holds INSERT and SELECT only, so a version's text can be neither
* changed nor removed (a catalog test pins the privileges). Whether a version is the published one
* is not stored here, because that would be an update: `agent_instruction_pointer` names it.
*
* Lists served (by number, newest first, keyset `number < $cursor`): an Agent kind's versions on
* `agent_instruction_versions_number_key` scanned backwards; one version by id on the primary key.
*/
declare const agentInstructionVersions: PgTableWithColumns_a5zn0g35<{
	name: "agent_instruction_versions";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp35<{
			name: "id";
			tableName: "agent_instruction_versions";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "agent_instruction_versions";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		agentKind: PgColumn_ffrhhp35<{
			name: "agent_kind";
			tableName: "agent_instruction_versions";
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
		number: PgColumn_ffrhhp35<{
			name: "number";
			tableName: "agent_instruction_versions";
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
		text: PgColumn_ffrhhp35<{
			name: "text";
			tableName: "agent_instruction_versions";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		authorMembershipId: PgColumn_ffrhhp35<{
			name: "author_membership_id";
			tableName: "agent_instruction_versions";
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
		createdAt: PgColumn_ffrhhp35<{
			name: string;
			tableName: "agent_instruction_versions";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* The published instruction version of one Agent kind of an Organization. No row means nothing is
* published and the Agent runs on the fixed rules and the Playbook alone. Publishing and rolling
* back are an upsert that re-points `version_number`; the foreign key keeps it on a version of the
* same Agent kind. Agent services read this row and stamp its number on every Draft and audit event.
*
* Lists served: none; the primary key is the lookup.
*/
declare const agentInstructionPointers: PgTableWithColumns_a5zn0g35<{
	name: "agent_instruction_pointer";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp35<{
			name: "organization_id";
			tableName: "agent_instruction_pointer";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		agentKind: PgColumn_ffrhhp35<{
			name: "agent_kind";
			tableName: "agent_instruction_pointer";
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
		versionNumber: PgColumn_ffrhhp35<{
			name: "version_number";
			tableName: "agent_instruction_pointer";
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
		publishedByMembershipId: PgColumn_ffrhhp35<{
			name: "published_by_membership_id";
			tableName: "agent_instruction_pointer";
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
		publishedAt: PgColumn_ffrhhp35<{
			name: string;
			tableName: "agent_instruction_pointer";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* The controls of the Agents of an Organization. One row per Agent kind and channel: `channel` is
* `default` for the kind's fallback, which a channel without its own row uses. The row with
* `agent_kind = 'organization'` (channel `default`) is the Organization-wide pause switch
* (`agents_paused`, checked by every sender); it holds no level. A set replaces the whole row.
* `send_window` and `escalation_rules` are the contract's validated JSON, bounded here by type and
* size only. There is no column for Contact Consent, the AI and recording disclosure or
* suppression: they are not settings (ADR 0003).
*
* Lists served: an Organization's rows by Agent kind and channel on the primary key.
*/
declare const agentSettings: PgTableWithColumns_a5zn0g35<{
	name: "agent_settings";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp35<{
			name: "organization_id";
			tableName: "agent_settings";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		agentKind: PgColumn_ffrhhp35<{
			name: "agent_kind";
			tableName: "agent_settings";
			dataType: "string";
			columnType: "PgText";
			data: "inbound" | "organization" | "outbound";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["inbound", "outbound", "organization"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		channel: PgColumn_ffrhhp35<{
			name: "channel";
			tableName: "agent_settings";
			dataType: "string";
			columnType: "PgText";
			data: "default" | "email" | "linkedin" | "phone" | "sms" | "whatsapp";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["phone", "sms", "whatsapp", "email", "linkedin", "default"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		level: PgColumn_ffrhhp35<{
			name: "level";
			tableName: "agent_settings";
			dataType: "string";
			columnType: "PgText";
			data: "assisted" | "autonomous" | "supervised";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["supervised", "assisted", "autonomous"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sendWindow: PgColumn_ffrhhp35<{
			name: "send_window";
			tableName: "agent_settings";
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
		}, {}, {}>;
		escalationRules: PgColumn_ffrhhp35<{
			name: "escalation_rules";
			tableName: "agent_settings";
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
		}, {}, {}>;
		agentsPaused: PgColumn_ffrhhp35<{
			name: "agents_paused";
			tableName: "agent_settings";
			dataType: "boolean";
			columnType: "PgBoolean";
			data: boolean;
			driverParam: boolean;
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
		updatedByMembershipId: PgColumn_ffrhhp35<{
			name: "updated_by_membership_id";
			tableName: "agent_settings";
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
		updatedAt: PgColumn_ffrhhp35<{
			name: string;
			tableName: "agent_settings";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* One event of the audit log (ADR 0024): who or what did what to which subject. Append-only: the
* service role holds INSERT and SELECT only. `sequence` counts from 1 per Organization with no
* gaps (`audit_events_sequence_key` is unique, and a trigger refuses an event that does not
* extend the chain: the first has sequence 1 and no previous hash, every later one the next
* number and the previous event's hash). `hash` covers the content and `previous_hash`; the
* service computes it and the verify route recomputes it. `id` is chosen by the publisher, so a
* redelivered `audit.recorded` is `INSERT ... ON CONFLICT (organization_id, id) DO NOTHING`.
* Metadata holds ids and labels only (never Message text, recordings, Transcripts or secrets);
* its key and value limits are the contract's and the writer's, the database bounds its type and
* size.
*
* Lists served, newest first by sequence (keyset `sequence < $cursor`): the whole log on
* `audit_events_sequence_key`; by date range on `audit_events_occurred_idx`; by action on
* `audit_events_action_idx`; one subject on `audit_events_subject_idx`; one Prospect (a Manager's
* view) on `audit_events_prospect_idx`; one actor on the three `audit_events_actor_*_idx`
* partial indexes (the filter ORs the three columns, so Postgres can BitmapOr them).
*/
declare const auditEvents: PgTableWithColumns_a5zn0g35<{
	name: "audit_events";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp35<{
			name: "id";
			tableName: "audit_events";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "audit_events";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sequence: PgColumn_ffrhhp35<{
			name: "sequence";
			tableName: "audit_events";
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
		occurredAt: PgColumn_ffrhhp35<{
			name: string;
			tableName: "audit_events";
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
		actorKind: PgColumn_ffrhhp35<{
			name: "actor_kind";
			tableName: "audit_events";
			dataType: "string";
			columnType: "PgText";
			data: "agent" | "api_key" | "member" | "system";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["member", "agent", "api_key", "system"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		actorMembershipId: PgColumn_ffrhhp35<{
			name: "actor_membership_id";
			tableName: "audit_events";
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
		actorAgentKind: PgColumn_ffrhhp35<{
			name: "actor_agent_kind";
			tableName: "audit_events";
			dataType: "string";
			columnType: "PgText";
			data: "inbound" | "outbound";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["inbound", "outbound"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		actorApiKeyId: PgColumn_ffrhhp35<{
			name: "actor_api_key_id";
			tableName: "audit_events";
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
		action: PgColumn_ffrhhp35<{
			name: "action";
			tableName: "audit_events";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		subjectType: PgColumn_ffrhhp35<{
			name: "subject_type";
			tableName: "audit_events";
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
		subjectId: PgColumn_ffrhhp35<{
			name: "subject_id";
			tableName: "audit_events";
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
		prospectId: PgColumn_ffrhhp35<{
			name: "prospect_id";
			tableName: "audit_events";
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
		instructionVersion: PgColumn_ffrhhp35<{
			name: "instruction_version";
			tableName: "audit_events";
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
		requestId: PgColumn_ffrhhp35<{
			name: "request_id";
			tableName: "audit_events";
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
		metadata: PgColumn_ffrhhp35<{
			name: "metadata";
			tableName: "audit_events";
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
		previousHash: PgColumn_ffrhhp35<{
			name: "previous_hash";
			tableName: "audit_events";
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
		hash: PgColumn_ffrhhp35<{
			name: "hash";
			tableName: "audit_events";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		recordedAt: PgColumn_ffrhhp35<{
			name: string;
			tableName: "audit_events";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* One data of an Organization (ADR 0024). At most one is running per Organization: the
* partial unique index `export_jobs_one_active_key` makes `export.already_running` a database
* fact. The daily limit (two in 24 hours) is counted on `export_jobs_list_idx`. The download link
* is never stored; `expires_at` is when the files stop being served.
*
* Lists served (newest first, keyset `(requested_at, id) < $cursor`): `export_jobs_list_idx`.
*/
declare const exportJobs: PgTableWithColumns_a5zn0g35<{
	name: "export_jobs";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp35<{
			name: "id";
			tableName: "export_jobs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "export_jobs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		kind: PgColumn_ffrhhp35<{
			name: "kind";
			tableName: "export_jobs";
			dataType: "string";
			columnType: "PgText";
			data: "enriched_prospects" | "organization";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["organization", "enriched_prospects"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		format: PgColumn_ffrhhp35<{
			name: "format";
			tableName: "export_jobs";
			dataType: "string";
			columnType: "PgText";
			data: "csv";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["csv"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		filter: PgColumn_ffrhhp35<{
			name: "filter";
			tableName: "export_jobs";
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
		}, {}, {}>;
		state: PgColumn_ffrhhp35<{
			name: "state";
			tableName: "export_jobs";
			dataType: "string";
			columnType: "PgText";
			data: "expired" | "failed" | "queued" | "ready" | "running";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["queued", "running", "ready", "failed", "expired"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		requestedByMembershipId: PgColumn_ffrhhp35<{
			name: "requested_by_membership_id";
			tableName: "export_jobs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		includeRecordingLinks: PgColumn_ffrhhp35<{
			name: "include_recording_links";
			tableName: "export_jobs";
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
		failureReason: PgColumn_ffrhhp35<{
			name: "failure_reason";
			tableName: "export_jobs";
			dataType: "string";
			columnType: "PgText";
			data: "part_failed" | "storage_unavailable" | "timed_out";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["part_failed", "timed_out", "storage_unavailable"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		requestedAt: PgColumn_ffrhhp35<{
			name: string;
			tableName: "export_jobs";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
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
			tableName: "export_jobs";
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
		expiresAt: PgColumn_ffrhhp35<{
			name: string;
			tableName: "export_jobs";
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
* One service's slice of an job: its state and where it wrote under the bucket. A
* redelivered `export.part_ready` finds the row already `ready` and writes nothing.
*
* Lists served: a job's parts (at most four) on the primary key.
*/
declare const exportParts: PgTableWithColumns_a5zn0g35<{
	name: "export_parts";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp35<{
			name: "organization_id";
			tableName: "export_parts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		exportId: PgColumn_ffrhhp35<{
			name: "export_id";
			tableName: "export_parts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		service: PgColumn_ffrhhp35<{
			name: "service";
			tableName: "export_parts";
			dataType: "string";
			columnType: "PgText";
			data: "core" | "outbound" | "playbook" | "voice";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["core", "playbook", "voice", "outbound"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp35<{
			name: "state";
			tableName: "export_parts";
			dataType: "string";
			columnType: "PgText";
			data: "failed" | "pending" | "ready";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["pending", "ready", "failed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		prefix: PgColumn_ffrhhp35<{
			name: "prefix";
			tableName: "export_parts";
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
		fileCount: PgColumn_ffrhhp35<{
			name: "file_count";
			tableName: "export_parts";
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
		bytes: PgColumn_ffrhhp35<{
			name: "bytes";
			tableName: "export_parts";
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
		failureReason: PgColumn_ffrhhp35<{
			name: "failure_reason";
			tableName: "export_parts";
			dataType: "string";
			columnType: "PgText";
			data: "source_unavailable" | "storage_unavailable" | "write_failed";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["write_failed", "storage_unavailable", "source_unavailable"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		readyAt: PgColumn_ffrhhp35<{
			name: string;
			tableName: "export_parts";
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
		updatedAt: PgColumn_ffrhhp35<{
			name: string;
			tableName: "export_parts";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* An API key of an Organization (ADR 0023). Only the SHA-256 of the 256-bit secret is stored
* (`secret_hash`, 64 lower-case hex characters), never the key, and the hash is unique across all
* Organizations (`api_keys_secret_hash_key`): two keys cannot share a hash, and exchanging a key
* is a lookup on that index. `prefix` is the first twelve characters of the key (`clk_` and eight),
* shown so a person can recognise it. A key is revoked by setting `revoked_at`, not deleted, so
* the list keeps its history and audit events keep naming it. `role_ceiling` is the highest role
* the key may act as (the service checks it against the creating Admin's role).
* `created_by_membership_id` has no foreign key: a member who leaves must not delete the key.
*
* The exchange has to find a key from the hash before it knows the Organization, which forced
* row-level security hides from the service role; that lookup is a separate, later piece (a definer
* function in the style of migration 0033) and is not part of this table.
*
* Lists served (newest first, keyset `(created_at, id) < $cursor`): `api_keys_list_idx`.
*/
declare const coreApiKeys: PgTableWithColumns_a5zn0g35<{
	name: "api_keys";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp35<{
			name: "id";
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
		organizationId: PgColumn_ffrhhp35<{
			name: "organization_id";
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
		name: PgColumn_ffrhhp35<{
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
		prefix: PgColumn_ffrhhp35<{
			name: "prefix";
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
		secretHash: PgColumn_ffrhhp35<{
			name: "secret_hash";
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
		scopes: PgColumn_ffrhhp35<{
			name: "scopes";
			tableName: "api_keys";
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
			baseColumn: Column_xh1aba4<{
				name: "scopes";
				tableName: "api_keys";
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
			baseBuilder: PgColumnBuilder_r7cy324<{
				name: "scopes";
				dataType: "string";
				columnType: "PgText";
				data: string;
				enumValues: [string, ...string[]];
				driverParam: string;
			}, {}, {}, ColumnBuilderExtraConfig_359rmb4>;
			size: undefined;
		}>;
		roleCeiling: PgColumn_ffrhhp35<{
			name: "role_ceiling";
			tableName: "api_keys";
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
		expiresAt: PgColumn_ffrhhp35<{
			name: string;
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
		lastUsedAt: PgColumn_ffrhhp35<{
			name: string;
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
		revokedAt: PgColumn_ffrhhp35<{
			name: string;
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
		createdByMembershipId: PgColumn_ffrhhp35<{
			name: "created_by_membership_id";
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
		createdAt: PgColumn_ffrhhp35<{
			name: string;
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
	};
	dialect: "pg";
}>;
/**
* Requests counted per API key per fixed window, for the per-key rate limit (ADR 0023: counters
* live in Postgres, not in memory). The service upserts `request_count + 1` for the current
* window and refuses the exchange or call over the limit; old windows are pruned by age on
* `api_key_usage_age_idx`. Revoking or deleting a key's Organization removes its counters.
*
* Lists served: none; the primary key is the lookup.
*/
declare const apiKeyUsage: PgTableWithColumns_a5zn0g35<{
	name: "api_key_usage";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp35<{
			name: "organization_id";
			tableName: "api_key_usage";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		apiKeyId: PgColumn_ffrhhp35<{
			name: "api_key_id";
			tableName: "api_key_usage";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		windowStart: PgColumn_ffrhhp35<{
			name: string;
			tableName: "api_key_usage";
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
		requestCount: PgColumn_ffrhhp35<{
			name: "request_count";
			tableName: "api_key_usage";
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
	};
	dialect: "pg";
}>;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g36 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp36 } from "drizzle-orm/pg-core";
/** The CRMs Closeline connects to. Mirrors the contract's `CRM_PROVIDERS`. */
declare const CRM_PROVIDERS: readonly ["hubspot", "salesforce"];
/** The kinds of CRM object a run pulls. Mirrors the contract's `CRM_OBJECT_KINDS`. */
declare const CRM_OBJECT_KINDS: readonly ["deal", "call", "company", "contact"];
/** What a connection can do. Mirrors the contract's `CRM_SCOPE_LEVELS`. */
declare const CRM_SCOPE_LEVELS: readonly ["read", "read_write"];
/** The states of a stored connection. Mirrors the contract's `CRM_CONNECTION_STATES`. */
declare const CRM_CONNECTION_STATES: readonly ["connected", "needs_reconnect"];
/** Which way a field moves. Mirrors the contract's `CRM_DIRECTIONS`. */
declare const CRM_DIRECTIONS: readonly ["read_only", "write_only", "both"];
/** What a CRM deal stage means to Closeline. Mirrors the contract's `CRM_STAGE_OUTCOMES`. */
declare const CRM_STAGE_OUTCOMES: readonly ["won", "lost", "open"];
/** The fields with a direction setting. Mirrors the contract's `CRM_FIELD_KEYS`. */
declare const CRM_FIELD_KEYS: readonly ["deal.outcome", "company.name", "company.domain", "company.industry", "company.employeeCount", "company.region", "company.technologies", "contact.firstName", "contact.lastName", "contact.jobTitle", "contact.email", "contact.phone", "contact.linkedinUrl", "activity.notes"];
/** The kinds of row in `crm_mapping`: a deal stage or a field direction. */
declare const CRM_MAPPING_KINDS: readonly ["stage", "field"];
/** Why a run started. Mirrors the contract's `CRM_RUN_TRIGGERS`. */
declare const CRM_RUN_TRIGGERS: readonly ["first_load", "manual", "webhook", "sweep", "retry"];
/** Where a run is. Mirrors the contract's `CRM_RUN_STATES`. */
declare const CRM_RUN_STATES: readonly ["queued", "running", "completed", "failed"];
/** The crm codes a run can end with. Mirrors the contract's `CRM_RUN_ERROR_CODES`. */
declare const CRM_RUN_ERROR_CODES: readonly ["crm.needs_reconnect", "crm.rate_limited", "crm.mapping_incomplete", "crm.rights_not_confirmed"];
/** The states of an external reference: linked, a write recorded before its call, or a Deal gone from the CRM. */
declare const CRM_REF_STATES: readonly ["linked", "pending_write", "unlinked"];
/** The longest id of a CRM's own record, stage, pipeline or account. Mirrors the contract's `MAX_CRM_EXTERNAL_ID_LENGTH`. */
declare const MAX_CRM_EXTERNAL_ID_LENGTH = 128;
/** The longest display label read from a CRM. Mirrors the contract's `MAX_CRM_LABEL_LENGTH`. */
declare const MAX_CRM_LABEL_LENGTH = 200;
/** The largest count a run reports. Mirrors the contract's `countSchema` maximum. */
declare const MAX_CRM_RUN_COUNT = 1e8;
/** How many skip reasons the contract's `CRM_SKIP_REASONS` lists; the report holds one entry per reason. */
declare const CRM_SKIP_REASON_COUNT = 4;
/** The most failed records a run names. Mirrors the contract's `MAX_CRM_RUN_FAILURES`. */
declare const MAX_CRM_RUN_FAILURES = 50;
/** The longest sealed token, in bytes of ciphertext (the nonce and tag included). */
declare const MAX_CRM_SEALED_TOKEN_BYTES = 16384;
/** The longest key id a sealed token names, in characters. */
declare const MAX_CRM_KEY_ID_LENGTH = 128;
/** The longest provider cursor or object version, in characters. */
declare const MAX_CRM_CURSOR_LENGTH = 1024;
/** The longest deterministic write key (ADR 0022), in characters. */
declare const MAX_CRM_WRITE_KEY_LENGTH = 256;
/** The longest local id a reference points at, in characters. */
declare const MAX_CRM_LOCAL_ID_LENGTH = 128;
/** Seconds a webhook receipt is kept at least: the contract's `CRM_WEBHOOK_WINDOW_SECONDS`; core prunes by age with a margin. */
declare const CRM_WEBHOOK_WINDOW_SECONDS = 300;
/**
* An Organization's connection to one CRM (ADR 0022). At most one per provider per Organization
* (`crm_connection_provider_key`), and an external account belongs to at most one Organization
* (`crm_connection_account_key` is unique across Organizations on purpose: a unique index is
* checked whatever the row-level security hides, so connecting an account another Organization
* holds is refused by the database and names no Organization). Disconnecting deletes the row and,
* through the foreign keys, its mapping, runs, references and receipts.
*
* Tokens are stored sealed: `access_token_sealed` and `refresh_token_sealed` hold ciphertext from
* core's `SecretBox`, bound to the Organization and connection id, and `token_key_id` names the
* key that sealed them. There is no plaintext token column and never one. The two ciphertexts are
* both sealed under that key; a ciphertext without a key id is refused.
*
* `connected_by_membership_id` has no foreign key: a member who leaves must neither block nor
* delete the Organization's connection. The Stage mapping is confirmed once an Owner or Admin
* saves it (`stage_mapping_confirmed_*`, both set or both null).
*
* Lists served: the Organization's connections by id (`crm_connection_pkey`) and one provider's
* (`crm_connection_provider_key`).
*/
declare const crmConnections: PgTableWithColumns_a5zn0g36<{
	name: "crm_connection";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp36<{
			name: "id";
			tableName: "crm_connection";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "crm_connection";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		provider: PgColumn_ffrhhp36<{
			name: "provider";
			tableName: "crm_connection";
			dataType: "string";
			columnType: "PgText";
			data: "hubspot" | "salesforce";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["hubspot", "salesforce"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp36<{
			name: "state";
			tableName: "crm_connection";
			dataType: "string";
			columnType: "PgText";
			data: "connected" | "needs_reconnect";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["connected", "needs_reconnect"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		externalAccountId: PgColumn_ffrhhp36<{
			name: "external_account_id";
			tableName: "crm_connection";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		accountLabel: PgColumn_ffrhhp36<{
			name: "account_label";
			tableName: "crm_connection";
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
		scopeLevel: PgColumn_ffrhhp36<{
			name: "scope_level";
			tableName: "crm_connection";
			dataType: "string";
			columnType: "PgText";
			data: "read" | "read_write";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["read", "read_write"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		accessTokenSealed: PgColumn_ffrhhp36<{
			name: "access_token_sealed";
			tableName: "crm_connection";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: Uint8Array<ArrayBufferLike>;
			driverParam: Uint8Array<ArrayBufferLike>;
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
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		refreshTokenSealed: PgColumn_ffrhhp36<{
			name: "refresh_token_sealed";
			tableName: "crm_connection";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: Uint8Array<ArrayBufferLike>;
			driverParam: Uint8Array<ArrayBufferLike>;
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
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		tokenKeyId: PgColumn_ffrhhp36<{
			name: "token_key_id";
			tableName: "crm_connection";
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
		accessTokenExpiresAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "crm_connection";
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
		connectedByMembershipId: PgColumn_ffrhhp36<{
			name: "connected_by_membership_id";
			tableName: "crm_connection";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		connectedAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "crm_connection";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lastSyncedAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "crm_connection";
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
		needsReconnectSince: PgColumn_ffrhhp36<{
			name: string;
			tableName: "crm_connection";
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
		stageMappingConfirmedByMembershipId: PgColumn_ffrhhp36<{
			name: "stage_mapping_confirmed_by_membership_id";
			tableName: "crm_connection";
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
		stageMappingConfirmedAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "crm_connection";
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
		updatedAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "crm_connection";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* One line of a connection's mapping: a deal stage and the Outcome an Admin gave it (`kind =
* 'stage'`, `key` the CRM's stage id, `label` its display name), or a field's direction (`kind =
* 'field'`, `key` one of `CRM_FIELD_KEYS`). A field with no row is `read_only`. `activity.notes`
* is never `both`. Saving the whole Stage mapping replaces its `stage` rows in one transaction;
* the 500-stage limit is the service's, not the database's.
*
* Lists served (by key, keyset `key > $cursor`): a connection's stage lines and field lines,
* both on `crm_mapping_pkey`.
*/
declare const crmMappings: PgTableWithColumns_a5zn0g36<{
	name: "crm_mapping";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp36<{
			name: "organization_id";
			tableName: "crm_mapping";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		connectionId: PgColumn_ffrhhp36<{
			name: "connection_id";
			tableName: "crm_mapping";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "crm_mapping";
			dataType: "string";
			columnType: "PgText";
			data: "field" | "stage";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["stage", "field"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		key: PgColumn_ffrhhp36<{
			name: "key";
			tableName: "crm_mapping";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		outcome: PgColumn_ffrhhp36<{
			name: "outcome";
			tableName: "crm_mapping";
			dataType: "string";
			columnType: "PgText";
			data: "lost" | "open" | "won";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["won", "lost", "open"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		label: PgColumn_ffrhhp36<{
			name: "label";
			tableName: "crm_mapping";
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
		direction: PgColumn_ffrhhp36<{
			name: "direction";
			tableName: "crm_mapping";
			dataType: "string";
			columnType: "PgText";
			data: "both" | "read_only" | "write_only";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["read_only", "write_only", "both"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "crm_mapping";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* One sync run of one kind of CRM object and its report (ADR 0022). The counts are exact; the
* three jsonb columns hold the report: `skipped` (`{reason, count}` by closed reason),
* `skipped_fields` (`{field, count}` by field a manual value protected) and `failures`
* (`{objectRef, reason}`, at most 50, the CRM's record id and a closed reason, never a message or
* CRM data). `cursor` is the provider cursor reached, written only after a page commits; the next
* run for a kind starts from the newest run's cursor that has one. It is never returned by the API.
*
* Lifecycle: `queued` has no start or end; `running` has a start and no end; `completed` and
* `failed` have an end; only `failed` carries an error code.
*
* Lists served (newest first, keyset `(requested_at, id)`): a connection's runs
* (`crm_sync_runs_list_idx`), narrowed to one state (`crm_sync_runs_state_list_idx`) or one object
* kind (`crm_sync_runs_kind_list_idx`, which also finds the cursor to resume from).
*/
declare const crmSyncRuns: PgTableWithColumns_a5zn0g36<{
	name: "crm_sync_run";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp36<{
			name: "id";
			tableName: "crm_sync_run";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "crm_sync_run";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		connectionId: PgColumn_ffrhhp36<{
			name: "connection_id";
			tableName: "crm_sync_run";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		objectKind: PgColumn_ffrhhp36<{
			name: "object_kind";
			tableName: "crm_sync_run";
			dataType: "string";
			columnType: "PgText";
			data: "call" | "company" | "contact" | "deal";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["deal", "call", "company", "contact"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		trigger: PgColumn_ffrhhp36<{
			name: "trigger";
			tableName: "crm_sync_run";
			dataType: "string";
			columnType: "PgText";
			data: "first_load" | "manual" | "retry" | "sweep" | "webhook";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["first_load", "manual", "webhook", "sweep", "retry"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp36<{
			name: "state";
			tableName: "crm_sync_run";
			dataType: "string";
			columnType: "PgText";
			data: "completed" | "failed" | "queued" | "running";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["queued", "running", "completed", "failed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		requestedAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "crm_sync_run";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		requestedByMembershipId: PgColumn_ffrhhp36<{
			name: "requested_by_membership_id";
			tableName: "crm_sync_run";
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
		startedAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "crm_sync_run";
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
		completedAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "crm_sync_run";
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
		createdCount: PgColumn_ffrhhp36<{
			name: "created_count";
			tableName: "crm_sync_run";
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
		updatedCount: PgColumn_ffrhhp36<{
			name: "updated_count";
			tableName: "crm_sync_run";
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
		skippedCount: PgColumn_ffrhhp36<{
			name: "skipped_count";
			tableName: "crm_sync_run";
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
		failedCount: PgColumn_ffrhhp36<{
			name: "failed_count";
			tableName: "crm_sync_run";
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
		unlinkedCount: PgColumn_ffrhhp36<{
			name: "unlinked_count";
			tableName: "crm_sync_run";
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
		skipped: PgColumn_ffrhhp36<{
			name: "skipped";
			tableName: "crm_sync_run";
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
		skippedFields: PgColumn_ffrhhp36<{
			name: "skipped_fields";
			tableName: "crm_sync_run";
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
		failures: PgColumn_ffrhhp36<{
			name: "failures";
			tableName: "crm_sync_run";
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
		failuresTruncated: PgColumn_ffrhhp36<{
			name: "failures_truncated";
			tableName: "crm_sync_run";
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
		errorCode: PgColumn_ffrhhp36<{
			name: "error_code";
			tableName: "crm_sync_run";
			dataType: "string";
			columnType: "PgText";
			data: "crm.mapping_incomplete" | "crm.needs_reconnect" | "crm.rate_limited" | "crm.rights_not_confirmed";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["crm.needs_reconnect", "crm.rate_limited", "crm.mapping_incomplete", "crm.rights_not_confirmed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		retryOfRunId: PgColumn_ffrhhp36<{
			name: "retry_of_run_id";
			tableName: "crm_sync_run";
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
		cursor: PgColumn_ffrhhp36<{
			name: "cursor";
			tableName: "crm_sync_run";
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
* Where one CRM object and one Closeline object meet (ADR 0022): the CRM's id for a Deal, Call,
* company or contact, the Closeline id it maps to, and the last version seen, so a returning
* change that carries our own version is recognised as an echo.
*
* The primary key is the identity of the reference; what makes sync idempotent is the unique key
* on (Organization, provider, object kind, external id): a second reference to one CRM object is
* refused. The reference belongs to the connection (an account's ids mean nothing in another
* account) and is removed with it. The provider is repeated here only to build that key, and a
* composite foreign key keeps it equal to the connection's.
*
* A write to the CRM is recorded here before its call: a `pending_write` row has a `write_key`
* (Closeline object id plus version) and no external id yet; the retry of a lost response finds
* the row by that key and the provider id once it is recorded, instead of creating again. A Deal
* deleted in the CRM is `unlinked`, not removed.
*
* Lookups served: by CRM id (the unique key), by local id (`crm_external_refs_local_idx`, not
* unique, because two CRM records may map to one Prospect), by write key
* (`crm_external_ref_write_key`) and a connection's references in id order
* (`crm_external_refs_connection_idx`, which also serves the cascade).
*/
declare const crmExternalRefs: PgTableWithColumns_a5zn0g36<{
	name: "crm_external_ref";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp36<{
			name: "id";
			tableName: "crm_external_ref";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "crm_external_ref";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		connectionId: PgColumn_ffrhhp36<{
			name: "connection_id";
			tableName: "crm_external_ref";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		provider: PgColumn_ffrhhp36<{
			name: "provider";
			tableName: "crm_external_ref";
			dataType: "string";
			columnType: "PgText";
			data: "hubspot" | "salesforce";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["hubspot", "salesforce"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		objectKind: PgColumn_ffrhhp36<{
			name: "object_kind";
			tableName: "crm_external_ref";
			dataType: "string";
			columnType: "PgText";
			data: "call" | "company" | "contact" | "deal";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["deal", "call", "company", "contact"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		externalId: PgColumn_ffrhhp36<{
			name: "external_id";
			tableName: "crm_external_ref";
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
		localId: PgColumn_ffrhhp36<{
			name: "local_id";
			tableName: "crm_external_ref";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "crm_external_ref";
			dataType: "string";
			columnType: "PgText";
			data: "linked" | "pending_write" | "unlinked";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["linked", "pending_write", "unlinked"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lastSeenVersion: PgColumn_ffrhhp36<{
			name: "last_seen_version";
			tableName: "crm_external_ref";
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
		lastSeenAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "crm_external_ref";
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
		writeKey: PgColumn_ffrhhp36<{
			name: "write_key";
			tableName: "crm_external_ref";
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
			tableName: "crm_external_ref";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
			tableName: "crm_external_ref";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* A webhook delivery already accepted (ADR 0022), so a replayed delivery is refused: the primary
* key is (Organization, connection, provider event id), and recording the same event twice is a
* unique violation. The key is scoped to the connection, so one Organization's event ids can
* neither block nor reveal another's. A receipt is kept for the timestamp window plus a margin
* and pruned by age (`crm_webhook_receipts_age_idx`); nothing from the payload is stored.
*/
declare const crmWebhookReceipts: PgTableWithColumns_a5zn0g36<{
	name: "crm_webhook_receipt";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp36<{
			name: "organization_id";
			tableName: "crm_webhook_receipt";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		connectionId: PgColumn_ffrhhp36<{
			name: "connection_id";
			tableName: "crm_webhook_receipt";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		eventId: PgColumn_ffrhhp36<{
			name: "event_id";
			tableName: "crm_webhook_receipt";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		receivedAt: PgColumn_ffrhhp36<{
			name: string;
			tableName: "crm_webhook_receipt";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
declare const demoRateCounters: PgTableWithColumns_a5zn0g37<{
	name: "demo_rate_counter";
	schema: "core";
	columns: {
		addressHash: PgColumn_ffrhhp37<{
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
		windowStart: PgColumn_ffrhhp37<{
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
		hits: PgColumn_ffrhhp37<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g38 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp38 } from "drizzle-orm/pg-core";
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
declare const demoRequests: PgTableWithColumns_a5zn0g38<{
	name: "demo_request";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp38<{
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
		name: PgColumn_ffrhhp38<{
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
		workEmail: PgColumn_ffrhhp38<{
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
		companyName: PgColumn_ffrhhp38<{
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
		message: PgColumn_ffrhhp38<{
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
		sourcePage: PgColumn_ffrhhp38<{
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
		idempotencyKey: PgColumn_ffrhhp38<{
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
		notificationStatus: PgColumn_ffrhhp38<{
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
		notificationAttempts: PgColumn_ffrhhp38<{
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
		notificationLastAttemptAt: PgColumn_ffrhhp38<{
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
		submittedAt: PgColumn_ffrhhp38<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g39 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp39 } from "drizzle-orm/pg-core";
import { Column as Column_xh1aba5 } from "drizzle-orm";
import { PgColumnBuilder as PgColumnBuilder_r7cy325 } from "drizzle-orm/pg-core";
import { ColumnBuilderExtraConfig as ColumnBuilderExtraConfig_359rmb5 } from "drizzle-orm";
/** The channels a Conversation runs on. Mirrors the contract's `INBOX_CHANNELS`. */
declare const INBOX_CHANNELS: readonly ["email", "linkedin", "chat"];
/** Who is answering a Conversation. Mirrors the contract's `CONVERSATION_CONTROLLERS`. */
declare const CONVERSATION_CONTROLLERS: readonly ["agent", "rep"];
/** The states of a Conversation. Mirrors the contract's `CONVERSATION_STATES`. */
declare const CONVERSATION_STATES: readonly ["agent", "awaiting_approval", "rep", "escalated", "closed"];
/** Whether a Message came from the Prospect or went to them. Mirrors `MESSAGE_DIRECTIONS`. */
declare const MESSAGE_DIRECTIONS: readonly ["inbound", "outbound"];
/** Who wrote a Message. Mirrors the contract's `MESSAGE_AUTHOR_KINDS`. */
declare const MESSAGE_AUTHOR_KINDS: readonly ["prospect", "agent", "rep"];
/** What an inbound Message means. Mirrors the contract's `REPLY_LABELS`. */
declare const REPLY_LABELS: readonly ["positive", "question", "objection", "not_now", "wrong_person", "unsubscribe", "out_of_office", "bounce", "negative", "other"];
/** Who decided a classification: the model or a Rep correcting it. */
declare const CLASSIFICATION_DECIDERS: readonly ["model", "rep"];
/** The longest Message or Draft body, in characters. Mirrors `MAX_MESSAGE_BODY_LENGTH`. */
declare const MAX_MESSAGE_BODY_LENGTH = 2e4;
/** The longest provider message id. Mirrors the contract's `providerMessageIdSchema`. */
declare const MAX_PROVIDER_MESSAGE_ID_LENGTH = 255;
/** The most Conversations a count of pending Drafts can report. Mirrors the contract. */
declare const MAX_PENDING_DRAFT_COUNT = 1e3;
/** Who wrote a Draft. Mirrors the contract's `DRAFT_AUTHORS`. */
declare const DRAFT_AUTHORS: readonly ["agent", "rep"];
/** The states of a Draft. Mirrors the contract's `DRAFT_STATUSES`. */
declare const DRAFT_STATUSES: readonly ["pending", "approved", "rejected", "sent", "superseded", "void"];
/** Why a Draft waits for a person. Mirrors the contract's `DRAFT_HOLD_REASONS`. */
declare const DRAFT_HOLD_REASONS: readonly ["policy", "ungrounded", "check_failed", "escalated", "first_message"];
/** The longest sentence a Draft gives for its strategy. Mirrors `MAX_STRATEGY_LENGTH`. */
declare const MAX_STRATEGY_LENGTH = 300;
/** The most checks a Draft carries. Mirrors the contract's `draftSchema`. */
declare const MAX_DRAFT_CHECKS = 20;
/** What a Source can be. Mirrors the contract's `DRAFT_SOURCE_KINDS`. */
declare const DRAFT_SOURCE_KINDS: readonly ["moment", "document_chunk"];
/** The Outcome of a Deal a Moment belongs to. Mirrors the contract's `OUTCOMES`. */
declare const SOURCE_OUTCOMES: readonly ["won", "lost", "open"];
/** The most evidence a Source reports. Mirrors the contract's `sourceSchema`. */
declare const MAX_EVIDENCE_COUNT = 1e5;
/** The decisions recorded about a Draft or a Conversation. Mirrors the contract's `DECISION_KINDS`. */
declare const DECISION_KINDS: readonly ["approve", "edit_approve", "reject", "auto_release", "takeover", "hand_back"];
/** The longest note with a decision. Mirrors the contract's `MAX_DECISION_NOTE_LENGTH`. */
declare const MAX_DECISION_NOTE_LENGTH = 500;
/** The approval modes. Mirrors the contract's `APPROVAL_MODES`. */
declare const APPROVAL_MODES: readonly ["always", "below_confidence", "except"];
/** The most labels an `except` rule names. Mirrors the contract's `MAX_EXCEPT_LABELS`. */
declare const MAX_EXCEPT_LABELS = 10;
/** What fires an escalation rule (M09 spec, T11). */
declare const ESCALATION_TRIGGERS: readonly ["asks_for_person", "pricing_or_legal", "negative_tone", "low_confidence", "writer_failure"];
/** Where an escalation goes: the Prospect's owner, a Team in turn, or the Admin queue. */
declare const ESCALATION_TARGETS: readonly ["prospect_owner", "team_round_robin", "admin_queue"];
/**
* A Conversation: one Prospect on one channel, and who answers it now. `controller` is `agent` or
* `rep`; a Rep-controlled Conversation names the Rep (`controller_membership_id`) and is in the
* `rep` or `closed` state, as the contract's `conversationSchema` requires. `owner_membership_id`
* is the Rep whose inbox it is in. `latest_label` and `pending_draft_count` are kept by core's
* service so the list needs no join. A Prospect's erasure removes its Conversations.
*
* Lists served (most recent activity first, keyset `(last_message_at, id)`):
* - all of an Organization's Conversations: `conversations_list_idx`;
* - one owner's (a Rep's inbox, a Manager's per-Rep view): `conversations_owner_list_idx`;
* - one state (the escalated and awaiting-approval filters): `conversations_state_list_idx`;
* - one owner in one state: `conversations_owner_state_list_idx`;
* - a Prospect's Conversations and the lookup for an ingested Message: `conversations_prospect_idx`.
*/
declare const conversations: PgTableWithColumns_a5zn0g39<{
	name: "conversations";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp39<{
			name: "id";
			tableName: "conversations";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "conversations";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		prospectId: PgColumn_ffrhhp39<{
			name: "prospect_id";
			tableName: "conversations";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		channel: PgColumn_ffrhhp39<{
			name: "channel";
			tableName: "conversations";
			dataType: "string";
			columnType: "PgText";
			data: "chat" | "email" | "linkedin";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["email", "linkedin", "chat"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		controller: PgColumn_ffrhhp39<{
			name: "controller";
			tableName: "conversations";
			dataType: "string";
			columnType: "PgText";
			data: "agent" | "rep";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["agent", "rep"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		controllerMembershipId: PgColumn_ffrhhp39<{
			name: "controller_membership_id";
			tableName: "conversations";
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
		state: PgColumn_ffrhhp39<{
			name: "state";
			tableName: "conversations";
			dataType: "string";
			columnType: "PgText";
			data: "agent" | "awaiting_approval" | "closed" | "escalated" | "rep";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["agent", "awaiting_approval", "rep", "escalated", "closed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		ownerMembershipId: PgColumn_ffrhhp39<{
			name: "owner_membership_id";
			tableName: "conversations";
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
		latestLabel: PgColumn_ffrhhp39<{
			name: "latest_label";
			tableName: "conversations";
			dataType: "string";
			columnType: "PgText";
			data: "bounce" | "negative" | "not_now" | "objection" | "other" | "out_of_office" | "positive" | "question" | "unsubscribe" | "wrong_person";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["positive", "question", "objection", "not_now", "wrong_person", "unsubscribe", "out_of_office", "bounce", "negative", "other"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		pendingDraftCount: PgColumn_ffrhhp39<{
			name: "pending_draft_count";
			tableName: "conversations";
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
		lastMessageAt: PgColumn_ffrhhp39<{
			name: string;
			tableName: "conversations";
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
		createdAt: PgColumn_ffrhhp39<{
			name: string;
			tableName: "conversations";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* A Message of a Conversation, inbound or outbound. Append-only for the service role: it holds
* INSERT and SELECT, and UPDATE only on the five classification columns (a classifier writes its
* label after the Message is stored, and a Rep may correct it); `body`, the author and the ids are
* never rewritten, and nothing can delete a Message except the cascade of a Prospect's or an
* Organization's removal. `channel` repeats the Conversation's (a composite foreign key keeps them
* equal) so the database holds one row per `(organization_id, channel, provider_message_id)`:
* `messages_provider_message_key` is what makes an ingest idempotent. `body` is the Prospect's or a
* model's text, so it is untrusted data and is never logged. `draft_id` (the Draft an outbound
* Message was sent from) has no foreign key: `drafts.reason_trigger_message_id` already points the
* other way, and Drizzle cannot type a cycle; core's service writes it from the Draft it released.
*
* Lists served (oldest first, keyset `(sent_at, id)`): a Conversation's timeline,
* `messages_conversation_idx`.
*/
declare const messages: PgTableWithColumns_a5zn0g39<{
	name: "messages";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp39<{
			name: "id";
			tableName: "messages";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "messages";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		conversationId: PgColumn_ffrhhp39<{
			name: "conversation_id";
			tableName: "messages";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		channel: PgColumn_ffrhhp39<{
			name: "channel";
			tableName: "messages";
			dataType: "string";
			columnType: "PgText";
			data: "chat" | "email" | "linkedin";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["email", "linkedin", "chat"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		direction: PgColumn_ffrhhp39<{
			name: "direction";
			tableName: "messages";
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
		authorKind: PgColumn_ffrhhp39<{
			name: "author_kind";
			tableName: "messages";
			dataType: "string";
			columnType: "PgText";
			data: "agent" | "prospect" | "rep";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["prospect", "agent", "rep"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		authorMembershipId: PgColumn_ffrhhp39<{
			name: "author_membership_id";
			tableName: "messages";
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
		providerMessageId: PgColumn_ffrhhp39<{
			name: "provider_message_id";
			tableName: "messages";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		draftId: PgColumn_ffrhhp39<{
			name: "draft_id";
			tableName: "messages";
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
		body: PgColumn_ffrhhp39<{
			name: "body";
			tableName: "messages";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sentAt: PgColumn_ffrhhp39<{
			name: string;
			tableName: "messages";
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
		classificationLabel: PgColumn_ffrhhp39<{
			name: "classification_label";
			tableName: "messages";
			dataType: "string";
			columnType: "PgText";
			data: "bounce" | "negative" | "not_now" | "objection" | "other" | "out_of_office" | "positive" | "question" | "unsubscribe" | "wrong_person";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["positive", "question", "objection", "not_now", "wrong_person", "unsubscribe", "out_of_office", "bounce", "negative", "other"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		classificationConfidence: PgColumn_ffrhhp39<{
			name: "classification_confidence";
			tableName: "messages";
			dataType: "number";
			columnType: "PgDoublePrecision";
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
		classificationDecidedBy: PgColumn_ffrhhp39<{
			name: "classification_decided_by";
			tableName: "messages";
			dataType: "string";
			columnType: "PgText";
			data: "model" | "rep";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["model", "rep"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		classificationCorrectedByMembershipId: PgColumn_ffrhhp39<{
			name: "classification_corrected_by_membership_id";
			tableName: "messages";
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
		classifiedAt: PgColumn_ffrhhp39<{
			name: string;
			tableName: "messages";
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
			tableName: "messages";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* A Draft reply to a Conversation, written by an Agent or composed by a Rep. An Agent Draft has a
* `reason` (the trigger Message, its label and a one-sentence strategy), a confidence and its
* Sources in `draft_sources`; a Rep Draft has none of them and is never held. `ungrounded` is true
* exactly when an Agent Draft cites no Source (the service sets both together). `hold` is why a
* pending Draft waits for a person; `checks` is the list of `{name, passed}` the release checks
* produced. `status` and `decided_at` change as the Draft is decided, so the service role may
* update this table.
*
* Lists served: a Conversation's Drafts, newest first (`drafts_conversation_idx`); the approval
* queue, pending Drafts oldest first, keyset `(created_at, id)` (`drafts_pending_queue_idx`,
* partial on `status = 'pending'`).
*/
declare const drafts: PgTableWithColumns_a5zn0g39<{
	name: "drafts";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp39<{
			name: "id";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		conversationId: PgColumn_ffrhhp39<{
			name: "conversation_id";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		author: PgColumn_ffrhhp39<{
			name: "author";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: "agent" | "rep";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["agent", "rep"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		authorMembershipId: PgColumn_ffrhhp39<{
			name: "author_membership_id";
			tableName: "drafts";
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
		body: PgColumn_ffrhhp39<{
			name: "body";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		reasonTriggerMessageId: PgColumn_ffrhhp39<{
			name: "reason_trigger_message_id";
			tableName: "drafts";
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
		reasonLabel: PgColumn_ffrhhp39<{
			name: "reason_label";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: "bounce" | "negative" | "not_now" | "objection" | "other" | "out_of_office" | "positive" | "question" | "unsubscribe" | "wrong_person";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["positive", "question", "objection", "not_now", "wrong_person", "unsubscribe", "out_of_office", "bounce", "negative", "other"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		reasonStrategy: PgColumn_ffrhhp39<{
			name: "reason_strategy";
			tableName: "drafts";
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
		confidence: PgColumn_ffrhhp39<{
			name: "confidence";
			tableName: "drafts";
			dataType: "number";
			columnType: "PgDoublePrecision";
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
		ungrounded: PgColumn_ffrhhp39<{
			name: "ungrounded";
			tableName: "drafts";
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
		checks: PgColumn_ffrhhp39<{
			name: "checks";
			tableName: "drafts";
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
		hold: PgColumn_ffrhhp39<{
			name: "hold";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: "check_failed" | "escalated" | "first_message" | "policy" | "ungrounded";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["policy", "ungrounded", "check_failed", "escalated", "first_message"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		status: PgColumn_ffrhhp39<{
			name: "status";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: "approved" | "pending" | "rejected" | "sent" | "superseded" | "void";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["pending", "approved", "rejected", "sent", "superseded", "void"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp39<{
			name: string;
			tableName: "drafts";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		decidedAt: PgColumn_ffrhhp39<{
			name: string;
			tableName: "drafts";
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
* A Source a Draft cites: a Moment of a Deal or a chunk of a Playbook document, with the Outcome
* and the evidence count shown to the approver. `source_ref` is the Playbook's id; the Deal and
* document ids name rows in the playbook service's schema, which core never reads, so they carry
* no foreign key. A Source is cited once per Draft. Written when the Draft is, never changed.
*
* Lists served: a Draft's Sources (the primary key, in citation order by `position`).
*/
declare const draftSources: PgTableWithColumns_a5zn0g39<{
	name: "draft_sources";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp39<{
			name: "organization_id";
			tableName: "draft_sources";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		draftId: PgColumn_ffrhhp39<{
			name: "draft_id";
			tableName: "draft_sources";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		kind: PgColumn_ffrhhp39<{
			name: "kind";
			tableName: "draft_sources";
			dataType: "string";
			columnType: "PgText";
			data: "document_chunk" | "moment";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["moment", "document_chunk"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sourceRef: PgColumn_ffrhhp39<{
			name: "source_ref";
			tableName: "draft_sources";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		position: PgColumn_ffrhhp39<{
			name: "position";
			tableName: "draft_sources";
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
		dealRecordId: PgColumn_ffrhhp39<{
			name: "deal_record_id";
			tableName: "draft_sources";
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
		documentId: PgColumn_ffrhhp39<{
			name: "document_id";
			tableName: "draft_sources";
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
		outcome: PgColumn_ffrhhp39<{
			name: "outcome";
			tableName: "draft_sources";
			dataType: "string";
			columnType: "PgText";
			data: "lost" | "open" | "won";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["won", "lost", "open"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		evidenceCount: PgColumn_ffrhhp39<{
			name: "evidence_count";
			tableName: "draft_sources";
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
/**
* One decision about a Draft or a Conversation: an approval (with or without an edit), a
* rejection, an automatic release, a takeover or a hand-back. Append-only for the service role
* (INSERT and SELECT). Takeover and hand-back name the Conversation only; the others name a Draft.
* An automatic release has no member; only a rejection carries a note.
*
* Lists served: a Conversation's decisions, newest first (`approval_decisions_conversation_idx`);
* a Draft's (`approval_decisions_draft_idx`).
*/
declare const approvalDecisions: PgTableWithColumns_a5zn0g39<{
	name: "approval_decisions";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp39<{
			name: "id";
			tableName: "approval_decisions";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "approval_decisions";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		conversationId: PgColumn_ffrhhp39<{
			name: "conversation_id";
			tableName: "approval_decisions";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		draftId: PgColumn_ffrhhp39<{
			name: "draft_id";
			tableName: "approval_decisions";
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
		kind: PgColumn_ffrhhp39<{
			name: "kind";
			tableName: "approval_decisions";
			dataType: "string";
			columnType: "PgText";
			data: "approve" | "auto_release" | "edit_approve" | "hand_back" | "reject" | "takeover";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["approve", "edit_approve", "reject", "auto_release", "takeover", "hand_back"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		decidedByMembershipId: PgColumn_ffrhhp39<{
			name: "decided_by_membership_id";
			tableName: "approval_decisions";
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
		note: PgColumn_ffrhhp39<{
			name: "note";
			tableName: "approval_decisions";
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
		acknowledgedUngrounded: PgColumn_ffrhhp39<{
			name: "acknowledged_ungrounded";
			tableName: "approval_decisions";
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
		decidedAt: PgColumn_ffrhhp39<{
			name: string;
			tableName: "approval_decisions";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* The approval rule of one channel of an Organization (the contract's `approvalPolicySchema`):
* `always` (the default when no row exists), `below_confidence` with a `threshold` above 0 and up
* to 1, or `except` with one to ten distinct reply `labels`. The columns not used by the mode are
* null. A row exists only once an Admin has set the rule.
*
* Lists served: one channel's rule by primary key; an Organization's rules are at most three.
*/
declare const approvalPolicies: PgTableWithColumns_a5zn0g39<{
	name: "approval_policies";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp39<{
			name: "organization_id";
			tableName: "approval_policies";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		channel: PgColumn_ffrhhp39<{
			name: "channel";
			tableName: "approval_policies";
			dataType: "string";
			columnType: "PgText";
			data: "chat" | "email" | "linkedin";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["email", "linkedin", "chat"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		mode: PgColumn_ffrhhp39<{
			name: "mode";
			tableName: "approval_policies";
			dataType: "string";
			columnType: "PgText";
			data: "always" | "below_confidence" | "except";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["always", "below_confidence", "except"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		threshold: PgColumn_ffrhhp39<{
			name: "threshold";
			tableName: "approval_policies";
			dataType: "number";
			columnType: "PgDoublePrecision";
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
		labels: PgColumn_ffrhhp39<{
			name: "labels";
			tableName: "approval_policies";
			dataType: "array";
			columnType: "PgArray";
			data: string[];
			driverParam: string | string[];
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: Column_xh1aba5<{
				name: "labels";
				tableName: "approval_policies";
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
			baseBuilder: PgColumnBuilder_r7cy325<{
				name: "labels";
				dataType: "string";
				columnType: "PgText";
				data: string;
				enumValues: [string, ...string[]];
				driverParam: string;
			}, {}, {}, ColumnBuilderExtraConfig_359rmb5>;
			size: undefined;
		}>;
		updatedAt: PgColumn_ffrhhp39<{
			name: string;
			tableName: "approval_policies";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedByMembershipId: PgColumn_ffrhhp39<{
			name: "updated_by_membership_id";
			tableName: "approval_policies";
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
* An escalation rule of an Organization: when `trigger` fires on a Conversation, route it to
* `target` (the Prospect's owner, the members of `team_id` in turn, or the Admin queue). One rule
* per trigger. `team_id` is set exactly for `team_round_robin`; `threshold` (a confidence below
* which the rule fires) exactly for `low_confidence`. An escalation with no matching Rep goes to
* the Admin queue, so it is never dropped (decided in the service, not here).
*
* Lists served: an Organization's rules, at most one per trigger (`escalation_rules_trigger_key`).
*/
declare const escalationRules2: PgTableWithColumns_a5zn0g39<{
	name: "escalation_rules";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp39<{
			name: "id";
			tableName: "escalation_rules";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "escalation_rules";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		trigger: PgColumn_ffrhhp39<{
			name: "trigger";
			tableName: "escalation_rules";
			dataType: "string";
			columnType: "PgText";
			data: "asks_for_person" | "low_confidence" | "negative_tone" | "pricing_or_legal" | "writer_failure";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["asks_for_person", "pricing_or_legal", "negative_tone", "low_confidence", "writer_failure"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		target: PgColumn_ffrhhp39<{
			name: "target";
			tableName: "escalation_rules";
			dataType: "string";
			columnType: "PgText";
			data: "admin_queue" | "prospect_owner" | "team_round_robin";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["prospect_owner", "team_round_robin", "admin_queue"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		teamId: PgColumn_ffrhhp39<{
			name: "team_id";
			tableName: "escalation_rules";
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
		threshold: PgColumn_ffrhhp39<{
			name: "threshold";
			tableName: "escalation_rules";
			dataType: "number";
			columnType: "PgDoublePrecision";
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
		enabled: PgColumn_ffrhhp39<{
			name: "enabled";
			tableName: "escalation_rules";
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
		createdAt: PgColumn_ffrhhp39<{
			name: string;
			tableName: "escalation_rules";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
			tableName: "escalation_rules";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedByMembershipId: PgColumn_ffrhhp39<{
			name: "updated_by_membership_id";
			tableName: "escalation_rules";
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g40 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp40 } from "drizzle-orm/pg-core";
/** The most claims a row gets: after this many the drain leaves it, unpublished, for an operator. */
declare const OUTBOX_MAX_ATTEMPTS = 50;
/** The longest topic: the name of the event, such as `prospect.created`. */
declare const OUTBOX_TOPIC_MAX_LENGTH = 120;
/** The longest dedupe key. */
declare const OUTBOX_DEDUPE_KEY_MAX_LENGTH = 200;
/** The largest payload in bytes, measured on its JSON text. The payload is the event, never a body. */
declare const OUTBOX_PAYLOAD_MAX_BYTES = 16384;
/** The longest error code a failed publish records: a code such as `queue.unavailable`, no text. */
declare const OUTBOX_ERROR_CODE_MAX_LENGTH = 64;
/** The most rows one drain claim returns, and the most one completion names. */
declare const OUTBOX_MAX_BATCH = 100;
/** The shortest and longest lease of a claim, and the longest retry delay, in milliseconds. */
declare const OUTBOX_MIN_LEASE_MS = 1e3;
declare const OUTBOX_MAX_LEASE_MS = 36e5;
declare const OUTBOX_MAX_RETRY_DELAY_MS = 864e5;
/**
* The transactional outbox of core: an event a service function writes in the same transaction as
* the change it reports, so the change and its event commit or roll back together. A drain worker
* later publishes the row to the queue port and marks it published, which makes publishing
* at-least-once: consumers must be idempotent.
*
* - `topic` names the event; `payload` is the event's JSON object, at most
*   {@link OUTBOX_PAYLOAD_MAX_BYTES}. Put ids and facts in it, never a secret, a token, a
*   recording or a message body.
* - `dedupe_key` is unique per Organization (`outbox_dedupe_key`): a replayed write inserts with
*   `on conflict do nothing` and adds no second row.
* - `available_at` is when the row may next be claimed: now at insert, pushed out by a claim
*   (the lease) and by a failed publish (the backoff). `attempts` counts claims.
* - `published_at` is null until the queue accepted the event. `last_error_code` is the code of the
*   last failed publish, never its message.
*
* Tenant table (fail-closed row-level security). The drain must see every Organization's rows, so
* it does not read this table: it calls the `SECURITY DEFINER` functions `core.outbox_claim`,
* `core.outbox_complete` and `core.outbox_fail`, owned by `closeline_core_outbox_drain`.
*
* Lists served:
* - The drain claim: unpublished rows with `available_at <= now()`, oldest first
*   (`outbox_drain_idx`, partial on `published_at is null and attempts < 50`), `for update skip locked`, at most
*   {@link OUTBOX_MAX_BATCH}.
* - The retention purge of published rows: `published_at < $cutoff` (`outbox_published_idx`).
*/
declare const outbox: PgTableWithColumns_a5zn0g40<{
	name: "outbox";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp40<{
			name: "id";
			tableName: "outbox";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp40<{
			name: "organization_id";
			tableName: "outbox";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		topic: PgColumn_ffrhhp40<{
			name: "topic";
			tableName: "outbox";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		payload: PgColumn_ffrhhp40<{
			name: "payload";
			tableName: "outbox";
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
		dedupeKey: PgColumn_ffrhhp40<{
			name: "dedupe_key";
			tableName: "outbox";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp40<{
			name: "created_at";
			tableName: "outbox";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		availableAt: PgColumn_ffrhhp40<{
			name: "available_at";
			tableName: "outbox";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		attempts: PgColumn_ffrhhp40<{
			name: "attempts";
			tableName: "outbox";
			dataType: "number";
			columnType: "PgSmallInt";
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
		publishedAt: PgColumn_ffrhhp40<{
			name: "published_at";
			tableName: "outbox";
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
		lastErrorCode: PgColumn_ffrhhp40<{
			name: "last_error_code";
			tableName: "outbox";
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
/** An outbox row. */
type OutboxRow = typeof outbox.$inferSelect;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g41 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp41 } from "drizzle-orm/pg-core";
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
declare const PROSPECT_COMPANY_FIELD_NAMES: readonly ["name", "domain", "industry", "employee_count", "region", "technologies"];
/** The longest Prospect Company industry or region, in characters. */
declare const MAX_PROSPECT_COMPANY_TEXT_LENGTH = 200;
/** The longest `technologies` history value, a JSON array of up to 50 items of 100 characters. */
declare const MAX_PROSPECT_TECHNOLOGIES_VALUE_LENGTH = 5300;
/** The most technologies one Prospect Company carries. */
declare const MAX_PROSPECT_COMPANY_TECHNOLOGIES = 50;
/** The longest technology, in characters. */
declare const MAX_PROSPECT_COMPANY_TECHNOLOGY_LENGTH = 100;
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
* A Prospect Company of an Organization. `name`, `domain` and the enrichment fields (`industry`,
* `employee_count`, `region`, `technologies`, all nullable) are the current values; their
* Sources and history are in `prospect_company_fields`, which keeps each value as text. `domain` is the normalised domain
* (ASCII-folded host), unique per Organization when set.
*
* Lists served (keyset `(created_at, id)`, newest first): `prospect_companies_list_idx`. Lookup by
* domain: `prospect_companies_domain_key`.
*/
declare const prospectCompanies: PgTableWithColumns_a5zn0g41<{
	name: "prospect_companies";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp41<{
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
		organizationId: PgColumn_ffrhhp41<{
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
		name: PgColumn_ffrhhp41<{
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
		domain: PgColumn_ffrhhp41<{
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
		industry: PgColumn_ffrhhp41<{
			name: "industry";
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
		employeeCount: PgColumn_ffrhhp41<{
			name: "employee_count";
			tableName: "prospect_companies";
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
		region: PgColumn_ffrhhp41<{
			name: "region";
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
		technologies: PgColumn_ffrhhp41<{
			name: "technologies";
			tableName: "prospect_companies";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: string[];
			driverParam: string[];
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
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		createdAt: PgColumn_ffrhhp41<{
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
		updatedAt: PgColumn_ffrhhp41<{
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
declare const prospects: PgTableWithColumns_a5zn0g41<{
	name: "prospects";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp41<{
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
		organizationId: PgColumn_ffrhhp41<{
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
		companyId: PgColumn_ffrhhp41<{
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
		ownerMembershipId: PgColumn_ffrhhp41<{
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
		status: PgColumn_ffrhhp41<{
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
		source: PgColumn_ffrhhp41<{
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
		tags: PgColumn_ffrhhp41<{
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
		notes: PgColumn_ffrhhp41<{
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
		createdAt: PgColumn_ffrhhp41<{
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
		updatedAt: PgColumn_ffrhhp41<{
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
declare const prospectIdentities: PgTableWithColumns_a5zn0g41<{
	name: "prospect_identities";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp41<{
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
		kind: PgColumn_ffrhhp41<{
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
		value: PgColumn_ffrhhp41<{
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
		prospectId: PgColumn_ffrhhp41<{
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
		isPrimary: PgColumn_ffrhhp41<{
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
		createdAt: PgColumn_ffrhhp41<{
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
declare const prospectFields: PgTableWithColumns_a5zn0g41<{
	name: "prospect_fields";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp41<{
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
		seq: PgColumn_ffrhhp41<{
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
		fieldName: PgColumn_ffrhhp41<{
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
		state: PgColumn_ffrhhp41<{
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
		value: PgColumn_ffrhhp41<{
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
		source: PgColumn_ffrhhp41<{
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
		sourceRef: PgColumn_ffrhhp41<{
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
		setAt: PgColumn_ffrhhp41<{
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
		setByUserId: PgColumn_ffrhhp41<{
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
		prospectId: PgColumn_ffrhhp41<{
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
* The fields are `name`, `domain`, `industry`, `employee_count`, `region` and `technologies`; a
* value is kept as text: `employee_count` as 1 to 9 digits and `technologies` as a JSON array of
* strings.
*/
declare const prospectCompanyFields: PgTableWithColumns_a5zn0g41<{
	name: "prospect_company_fields";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp41<{
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
		seq: PgColumn_ffrhhp41<{
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
		fieldName: PgColumn_ffrhhp41<{
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
		state: PgColumn_ffrhhp41<{
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
		value: PgColumn_ffrhhp41<{
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
		source: PgColumn_ffrhhp41<{
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
		sourceRef: PgColumn_ffrhhp41<{
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
		setAt: PgColumn_ffrhhp41<{
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
		setByUserId: PgColumn_ffrhhp41<{
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
		companyId: PgColumn_ffrhhp41<{
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
declare const prospectImports: PgTableWithColumns_a5zn0g41<{
	name: "prospect_imports";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp41<{
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
		organizationId: PgColumn_ffrhhp41<{
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
		state: PgColumn_ffrhhp41<{
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
		failureReason: PgColumn_ffrhhp41<{
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
		sizeBytes: PgColumn_ffrhhp41<{
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
		contentHash: PgColumn_ffrhhp41<{
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
		objectKey: PgColumn_ffrhhp41<{
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
		processedRows: PgColumn_ffrhhp41<{
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
		rowCount: PgColumn_ffrhhp41<{
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
		createdCount: PgColumn_ffrhhp41<{
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
		updatedCount: PgColumn_ffrhhp41<{
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
		skippedCount: PgColumn_ffrhhp41<{
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
		rejectedCount: PgColumn_ffrhhp41<{
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
		uploadedByUserId: PgColumn_ffrhhp41<{
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
		createdAt: PgColumn_ffrhhp41<{
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
		updatedAt: PgColumn_ffrhhp41<{
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
declare const prospectImportRows: PgTableWithColumns_a5zn0g41<{
	name: "prospect_import_rows";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp41<{
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
		importId: PgColumn_ffrhhp41<{
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
		rowNumber: PgColumn_ffrhhp41<{
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
		result: PgColumn_ffrhhp41<{
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
		reason: PgColumn_ffrhhp41<{
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
		prospectId: PgColumn_ffrhhp41<{
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
declare const prospectMerges: PgTableWithColumns_a5zn0g41<{
	name: "prospect_merges";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp41<{
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
		organizationId: PgColumn_ffrhhp41<{
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
		survivorProspectId: PgColumn_ffrhhp41<{
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
		mergedProspectIds: PgColumn_ffrhhp41<{
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
		fieldChoices: PgColumn_ffrhhp41<{
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
		state: PgColumn_ffrhhp41<{
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
		mergedByUserId: PgColumn_ffrhhp41<{
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
		snapshot: PgColumn_ffrhhp41<{
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
		createdAt: PgColumn_ffrhhp41<{
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
		undoableUntil: PgColumn_ffrhhp41<{
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
		undoneAt: PgColumn_ffrhhp41<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g42 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp42 } from "drizzle-orm/pg-core";
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
declare const organizations: PgTableWithColumns_a5zn0g42<{
	name: "organizations";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp42<{
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
		name: PgColumn_ffrhhp42<{
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
		region: PgColumn_ffrhhp42<{
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
		status: PgColumn_ffrhhp42<{
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
		ownerCount: PgColumn_ffrhhp42<{
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
		createdAt: PgColumn_ffrhhp42<{
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
		updatedAt: PgColumn_ffrhhp42<{
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
declare const memberships: PgTableWithColumns_a5zn0g42<{
	name: "memberships";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp42<{
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
		organizationId: PgColumn_ffrhhp42<{
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
		userId: PgColumn_ffrhhp42<{
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
		role: PgColumn_ffrhhp42<{
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
		email: PgColumn_ffrhhp42<{
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
		name: PgColumn_ffrhhp42<{
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
		createdAt: PgColumn_ffrhhp42<{
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
		updatedAt: PgColumn_ffrhhp42<{
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
declare const teams: PgTableWithColumns_a5zn0g42<{
	name: "teams";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp42<{
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
		organizationId: PgColumn_ffrhhp42<{
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
		name: PgColumn_ffrhhp42<{
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
		nameKey: PgColumn_ffrhhp42<{
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
		createdAt: PgColumn_ffrhhp42<{
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
		updatedAt: PgColumn_ffrhhp42<{
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
declare const teamMembers: PgTableWithColumns_a5zn0g42<{
	name: "team_members";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp42<{
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
		teamId: PgColumn_ffrhhp42<{
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
		membershipId: PgColumn_ffrhhp42<{
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
		createdAt: PgColumn_ffrhhp42<{
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
declare const invitations: PgTableWithColumns_a5zn0g42<{
	name: "invitations";
	schema: "core";
	columns: {
		id: PgColumn_ffrhhp42<{
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
		organizationId: PgColumn_ffrhhp42<{
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
		email: PgColumn_ffrhhp42<{
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
		role: PgColumn_ffrhhp42<{
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
		teamId: PgColumn_ffrhhp42<{
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
		invitedByUserId: PgColumn_ffrhhp42<{
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
		tokenHash: PgColumn_ffrhhp42<{
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
		state: PgColumn_ffrhhp42<{
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
		expiresAt: PgColumn_ffrhhp42<{
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
		acceptedAt: PgColumn_ffrhhp42<{
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
		revokedAt: PgColumn_ffrhhp42<{
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
		createdAt: PgColumn_ffrhhp42<{
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
		updatedAt: PgColumn_ffrhhp42<{
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
declare const membershipDirectory: PgTableWithColumns_a5zn0g42<{
	name: "membership_directory";
	schema: "core";
	columns: {
		userId: PgColumn_ffrhhp42<{
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
		organizationId: PgColumn_ffrhhp42<{
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
declare const invitationDirectory: PgTableWithColumns_a5zn0g42<{
	name: "invitation_directory";
	schema: "core";
	columns: {
		tokenHash: PgColumn_ffrhhp42<{
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
		organizationId: PgColumn_ffrhhp42<{
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
		invitationId: PgColumn_ffrhhp42<{
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
		expiresAt: PgColumn_ffrhhp42<{
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
declare const organizationState: PgTableWithColumns_a5zn0g42<{
	name: "organization_state";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp42<{
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
		status: PgColumn_ffrhhp42<{
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
declare const idempotencyKeys: PgTableWithColumns_a5zn0g42<{
	name: "idempotency_keys";
	schema: "core";
	columns: {
		organizationId: PgColumn_ffrhhp42<{
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
		userId: PgColumn_ffrhhp42<{
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
		route: PgColumn_ffrhhp42<{
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
		key: PgColumn_ffrhhp42<{
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
		requestHash: PgColumn_ffrhhp42<{
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
		status: PgColumn_ffrhhp42<{
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
		response: PgColumn_ffrhhp42<{
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
		createdAt: PgColumn_ffrhhp42<{
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
/** The `outbound` Postgres schema, owned by the outbound service (login role `closeline_outbound`). */
declare const outboundSchema: PgSchema_mtt0uw3<"outbound">;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g43 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp43 } from "drizzle-orm/pg-core";
import { Column as Column_xh1aba6 } from "drizzle-orm";
import { PgColumnBuilder as PgColumnBuilder_r7cy326 } from "drizzle-orm/pg-core";
import { ColumnBuilderExtraConfig as ColumnBuilderExtraConfig_359rmb6 } from "drizzle-orm";
/** The email providers a Mailbox is connected through. Mirrors the contract's `MAILBOX_PROVIDERS`. */
declare const MAILBOX_PROVIDERS: readonly ["gmail", "outlook"];
/** Whose address a Mailbox is. Mirrors the contract's `MAILBOX_KINDS`. */
declare const MAILBOX_KINDS: readonly ["personal", "shared"];
/** The state of a Mailbox. Mirrors the contract's `MAILBOX_STATES`. */
declare const MAILBOX_STATES: readonly ["warming", "healthy", "limited", "paused", "disconnected"];
/** Why a Mailbox is in its state. Mirrors the contract's `MAILBOX_STATE_REASONS`. */
declare const MAILBOX_STATE_REASONS: readonly ["owner_paused", "admin_paused", "complaint_spike", "bounce_spike", "provider_suspended", "auth_revoked", "disconnected_by_owner", "health_warning"];
/** What a Mailbox's health did to its limits. Mirrors the `effect` of the contract's `healthSummarySchema`. */
declare const HEALTH_EFFECTS: readonly ["none", "limit_halved", "paused"];
/** The days of a send window, in bit order (Monday is bit 0). Mirrors the contract's `WEEKDAYS`. */
declare const WEEKDAYS: readonly ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
/** The states of a send. Mirrors the contract's `SEND_STATES`. */
declare const SEND_STATES: readonly ["sending", "sent", "refused", "deferred", "failed"];
/** The reasons a send is refused or deferred. Mirrors the contract's `SEND_REFUSAL_REASONS`. */
declare const SEND_REFUSAL_REASONS: readonly ["campaign_not_running", "outside_window", "unverified_address", "suppressed", "no_consent", "mailbox_unavailable", "limit_reached", "organization_cap_reached", "duplicate"];
/** The reasons that defer a send rather than refuse it. Mirrors the contract's `SEND_DEFERRING_REASONS`. */
declare const SEND_DEFERRING_REASONS: readonly ["outside_window", "limit_reached", "organization_cap_reached"];
/** The checks run before a send. Mirrors the contract's `SEND_CHECKS`. */
declare const SEND_CHECKS: readonly ["campaign", "window", "address", "suppression", "consent", "mailbox", "limits", "organization_cap", "idempotency"];
/** What a mail event is. Mirrors the contract's `MAIL_EVENT_KINDS`. */
declare const MAIL_EVENT_KINDS: readonly ["hard_bounce", "soft_bounce", "complaint", "reply", "out_of_office", "unsubscribe"];
/** The components of a health score. Mirrors the contract's `HEALTH_COMPONENTS`. */
declare const HEALTH_COMPONENT_KINDS: readonly ["hard_bounce_rate", "complaint_rate", "soft_bounce_error_rate", "reply_rate", "provider_warnings"];
/** The most Teams a shared Mailbox is opened to. Mirrors the contract's `MAX_MAILBOX_TEAMS`. */
declare const MAX_MAILBOX_TEAMS = 50;
/** The longest display name of a Mailbox. Mirrors the contract's `MAX_MAILBOX_NAME_LENGTH`. */
declare const MAX_MAILBOX_NAME_LENGTH = 100;
/** The most sends a Mailbox may be limited to in a day. Mirrors the contract's `MAX_SENDS_PER_DAY`. */
declare const MAX_SENDS_PER_DAY = 500;
/** The most sends a Mailbox may be limited to in an hour. Mirrors `MAX_SENDS_PER_HOUR`. */
declare const MAX_SENDS_PER_HOUR = 100;
/** The longest minimum gap between sends, in seconds. Mirrors the contract's `MAX_MIN_GAP_SECONDS`. */
declare const MAX_MIN_GAP_SECONDS = 3600;
/** The largest step of a Sequence a send names. Mirrors the contract's `MAX_SEQUENCE_STEP`. */
declare const MAX_SEQUENCE_STEP = 1e3;
/** The largest attempt epoch of a send key. Mirrors the contract's `MAX_ATTEMPT_EPOCH`. */
declare const MAX_ATTEMPT_EPOCH = 1e3;
/** The longest provider message id, in characters. Mirrors the contract's `mailProviderMessageIdSchema`. */
declare const MAX_MAIL_PROVIDER_MESSAGE_ID_LENGTH = 255;
/** The longest provider account id, thread id or sync cursor we keep, in characters. */
declare const MAX_PROVIDER_REFERENCE_LENGTH = 2048;
/** The largest token ciphertext, in bytes: a provider token is a few hundred bytes. */
declare const MAX_TOKEN_CIPHERTEXT_BYTES = 8192;
/** The most components a health score has. Mirrors the contract's `healthComponentSchema` array bound. */
declare const MAX_HEALTH_COMPONENTS = 10;
/** The largest count a health day holds. Mirrors the contract's `healthDailySchema`. */
declare const MAX_HEALTH_COUNT = 1e7;
/**
* An email account a Rep or Admin connected so the Outbound Agent can send and read replies from
* it. `kind` `personal` names its owner (`owner_membership_id`); a `shared` one has none and may be
* opened to Teams (`team_ids`, at most 50). The OAuth tokens are held as **ciphertext only**
* (`access_token_ciphertext`, `refresh_token_ciphertext`, sealed by the service with an envelope
* key; `token_key_id` names the key version), never plaintext: a disconnected Mailbox holds none,
* and a token never leaves the service in a response, log or error report. `state_reason` is set
* for a paused or disconnected Mailbox and for a limited one, and for no other. The health columns
* are the latest score (`health_score` null means not enough data) and what it did to the limits;
* the history is `health_daily`. `sync_cursor` is the provider's history cursor (Gmail history id,
* Graph delta link) and `next_poll_at` when the polling fallback next visits this Mailbox.
* `ramp_started_at` is day 0 of the published ramp. One connection per provider address
* (`mailboxes_address_key`): reconnecting a disconnected address reuses its row.
*
* Lists served (keyset `(connected_at, id)` newest first, `LIMIT` a page): all Mailboxes
* (`mailboxes_list_idx`), one owner's (`mailboxes_owner_idx`), by state (`mailboxes_state_idx`).
* The polling fallback finds its due Mailboxes inside one Organization's scope
* (`mailboxes_poll_idx`).
*/
declare const mailboxes: PgTableWithColumns_a5zn0g43<{
	name: "mailboxes";
	schema: "outbound";
	columns: {
		id: PgColumn_ffrhhp43<{
			name: "id";
			tableName: "mailboxes";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "mailboxes";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		provider: PgColumn_ffrhhp43<{
			name: "provider";
			tableName: "mailboxes";
			dataType: "string";
			columnType: "PgText";
			data: "gmail" | "outlook";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["gmail", "outlook"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		kind: PgColumn_ffrhhp43<{
			name: "kind";
			tableName: "mailboxes";
			dataType: "string";
			columnType: "PgText";
			data: "personal" | "shared";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["personal", "shared"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		address: PgColumn_ffrhhp43<{
			name: "address";
			tableName: "mailboxes";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		displayName: PgColumn_ffrhhp43<{
			name: "display_name";
			tableName: "mailboxes";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		providerAccountId: PgColumn_ffrhhp43<{
			name: "provider_account_id";
			tableName: "mailboxes";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		ownerMembershipId: PgColumn_ffrhhp43<{
			name: "owner_membership_id";
			tableName: "mailboxes";
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
		teamIds: PgColumn_ffrhhp43<{
			name: "team_ids";
			tableName: "mailboxes";
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
			baseColumn: Column_xh1aba6<{
				name: "team_ids";
				tableName: "mailboxes";
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
			baseBuilder: PgColumnBuilder_r7cy326<{
				name: "team_ids";
				dataType: "string";
				columnType: "PgText";
				data: string;
				enumValues: [string, ...string[]];
				driverParam: string;
			}, {}, {}, ColumnBuilderExtraConfig_359rmb6>;
			size: undefined;
		}>;
		state: PgColumn_ffrhhp43<{
			name: "state";
			tableName: "mailboxes";
			dataType: "string";
			columnType: "PgText";
			data: "disconnected" | "healthy" | "limited" | "paused" | "warming";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["warming", "healthy", "limited", "paused", "disconnected"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		stateReason: PgColumn_ffrhhp43<{
			name: "state_reason";
			tableName: "mailboxes";
			dataType: "string";
			columnType: "PgText";
			data: "admin_paused" | "auth_revoked" | "bounce_spike" | "complaint_spike" | "disconnected_by_owner" | "health_warning" | "owner_paused" | "provider_suspended";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["owner_paused", "admin_paused", "complaint_spike", "bounce_spike", "provider_suspended", "auth_revoked", "disconnected_by_owner", "health_warning"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		stateChangedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "mailboxes";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		accessTokenCiphertext: PgColumn_ffrhhp43<{
			name: "access_token_ciphertext";
			tableName: "mailboxes";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: Uint8Array<ArrayBufferLike>;
			driverParam: Uint8Array<ArrayBufferLike>;
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
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		accessTokenExpiresAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "mailboxes";
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
		refreshTokenCiphertext: PgColumn_ffrhhp43<{
			name: "refresh_token_ciphertext";
			tableName: "mailboxes";
			dataType: "custom";
			columnType: "PgCustomColumn";
			data: Uint8Array<ArrayBufferLike>;
			driverParam: Uint8Array<ArrayBufferLike>;
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
			pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
		}>;
		tokenKeyId: PgColumn_ffrhhp43<{
			name: "token_key_id";
			tableName: "mailboxes";
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
		syncCursor: PgColumn_ffrhhp43<{
			name: "sync_cursor";
			tableName: "mailboxes";
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
		lastSyncedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "mailboxes";
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
		nextPollAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "mailboxes";
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
		healthScore: PgColumn_ffrhhp43<{
			name: "health_score";
			tableName: "mailboxes";
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
		healthEffect: PgColumn_ffrhhp43<{
			name: "health_effect";
			tableName: "mailboxes";
			dataType: "string";
			columnType: "PgText";
			data: "limit_halved" | "none" | "paused";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["none", "limit_halved", "paused"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		healthScoredAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "mailboxes";
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
		rampStartedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "mailboxes";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		connectedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "mailboxes";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		disconnectedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "mailboxes";
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
		updatedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "mailboxes";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* The limits a Mailbox sends under: per day, per hour, the minimum gap between sends and the send
* window. One row per Mailbox. The effective limits (after the published ramp, the Organization's
* ceiling and a health penalty) are computed by the service and never stored. The window is a
* time zone, a set of weekdays as a bitmask (`window_days`: Monday is bit 0, Sunday bit 6, so at
* least one and no repeated day) and the start and end minute of the day.
*
* Lookups served: the limits of one Mailbox (the primary key).
*/
declare const mailboxLimits: PgTableWithColumns_a5zn0g43<{
	name: "mailbox_limits";
	schema: "outbound";
	columns: {
		organizationId: PgColumn_ffrhhp43<{
			name: "organization_id";
			tableName: "mailbox_limits";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		mailboxId: PgColumn_ffrhhp43<{
			name: "mailbox_id";
			tableName: "mailbox_limits";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		perDay: PgColumn_ffrhhp43<{
			name: "per_day";
			tableName: "mailbox_limits";
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
		perHour: PgColumn_ffrhhp43<{
			name: "per_hour";
			tableName: "mailbox_limits";
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
		minGapSeconds: PgColumn_ffrhhp43<{
			name: "min_gap_seconds";
			tableName: "mailbox_limits";
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
		windowTimeZone: PgColumn_ffrhhp43<{
			name: "window_time_zone";
			tableName: "mailbox_limits";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		windowDays: PgColumn_ffrhhp43<{
			name: "window_days";
			tableName: "mailbox_limits";
			dataType: "number";
			columnType: "PgSmallInt";
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
		windowStartMinute: PgColumn_ffrhhp43<{
			name: "window_start_minute";
			tableName: "mailbox_limits";
			dataType: "number";
			columnType: "PgSmallInt";
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
		windowEndMinute: PgColumn_ffrhhp43<{
			name: "window_end_minute";
			tableName: "mailbox_limits";
			dataType: "number";
			columnType: "PgSmallInt";
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
		updatedByMembershipId: PgColumn_ffrhhp43<{
			name: "updated_by_membership_id";
			tableName: "mailbox_limits";
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
		updatedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "mailbox_limits";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* The send log: one row per attempt to send one Step of an Enrollment, sent or not. The send key
* (`send_key`, `<enrollment id>:<step>:<attempt epoch>`, a check ties it to the three columns) is
* unique per Organization (`mail_messages_send_key_key`), so a repeated attempt is refused as a
* duplicate and a retry uses the next attempt epoch. A `refused` or `deferred` send names its
* `reason`; a `deferred` one says when it is tried again (`retry_at`); a send that reached the
* transport (`sending`, `sent`, `failed`) names its Mailbox, and `sent` alone has `sent_at` and may
* hold the provider's message and thread ids. The provider message id is unique per Mailbox
* (`mail_messages_provider_message_key`). `checks` is the result of each pre-send check, in order.
* No subject or body is kept here: the text is the Draft's (`draft_id`).
*
* Lists served (keyset `(decided_at, id)` newest first, `LIMIT` a page): all sends
* (`mail_messages_list_idx`), one Campaign (`mail_messages_campaign_idx`), one Prospect
* (`mail_messages_prospect_idx`), one Mailbox (`mail_messages_mailbox_idx`), by state
* (`mail_messages_state_idx`). Limit counting reads sent sends of a Mailbox by `sent_at`
* (`mail_messages_sent_idx`); recovery reads the `sending` ones (`mail_messages_sending_idx`) and
* the retry reads the `deferred` ones by `retry_at` (`mail_messages_deferred_idx`).
*/
declare const mailMessages: PgTableWithColumns_a5zn0g43<{
	name: "mail_messages";
	schema: "outbound";
	columns: {
		id: PgColumn_ffrhhp43<{
			name: "id";
			tableName: "mail_messages";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "mail_messages";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		campaignId: PgColumn_ffrhhp43<{
			name: "campaign_id";
			tableName: "mail_messages";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		enrollmentId: PgColumn_ffrhhp43<{
			name: "enrollment_id";
			tableName: "mail_messages";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		prospectId: PgColumn_ffrhhp43<{
			name: "prospect_id";
			tableName: "mail_messages";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		draftId: PgColumn_ffrhhp43<{
			name: "draft_id";
			tableName: "mail_messages";
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
		step: PgColumn_ffrhhp43<{
			name: "step";
			tableName: "mail_messages";
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
		attemptEpoch: PgColumn_ffrhhp43<{
			name: "attempt_epoch";
			tableName: "mail_messages";
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
		sendKey: PgColumn_ffrhhp43<{
			name: "send_key";
			tableName: "mail_messages";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		mailboxId: PgColumn_ffrhhp43<{
			name: "mailbox_id";
			tableName: "mail_messages";
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
		state: PgColumn_ffrhhp43<{
			name: "state";
			tableName: "mail_messages";
			dataType: "string";
			columnType: "PgText";
			data: "deferred" | "failed" | "refused" | "sending" | "sent";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["sending", "sent", "refused", "deferred", "failed"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		reason: PgColumn_ffrhhp43<{
			name: "reason";
			tableName: "mail_messages";
			dataType: "string";
			columnType: "PgText";
			data: "campaign_not_running" | "duplicate" | "limit_reached" | "mailbox_unavailable" | "no_consent" | "organization_cap_reached" | "outside_window" | "suppressed" | "unverified_address";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["campaign_not_running", "outside_window", "unverified_address", "suppressed", "no_consent", "mailbox_unavailable", "limit_reached", "organization_cap_reached", "duplicate"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		checks: PgColumn_ffrhhp43<{
			name: "checks";
			tableName: "mail_messages";
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
		retryAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "mail_messages";
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
		providerMessageId: PgColumn_ffrhhp43<{
			name: "provider_message_id";
			tableName: "mail_messages";
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
		providerThreadId: PgColumn_ffrhhp43<{
			name: "provider_thread_id";
			tableName: "mail_messages";
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
		decidedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "mail_messages";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sentAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "mail_messages";
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
		updatedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "mail_messages";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* Something seen on a Mailbox after a send: a bounce, a complaint, a reply, an out-of-office or
* an unsubscribe. `provider_message_id` is the provider's id of the message that carried it (the
* service gives an unsubscribe one of its own), unique per Mailbox
* (`mail_events_provider_message_key`), so a replayed notification or a repeated poll inserts
* nothing twice. `send_id`, `prospect_id` and `enrollment_id` say what it is about when the
* service could tell; only an `out_of_office` has a `return_date`. An event never changes (the
* service role holds no UPDATE) and holds ids, a kind and times, never the text of a message.
*
* Lists served (keyset `(occurred_at, id)` newest first, `LIMIT` a page): all events
* (`mail_events_list_idx`), one Mailbox's (`mail_events_mailbox_idx`), one Mailbox's of a kind
* (`mail_events_mailbox_kind_idx`, which also serves the health window's counts), one
* Prospect's (`mail_events_prospect_idx`).
*/
declare const mailEvents: PgTableWithColumns_a5zn0g43<{
	name: "mail_events";
	schema: "outbound";
	columns: {
		id: PgColumn_ffrhhp43<{
			name: "id";
			tableName: "mail_events";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
			tableName: "mail_events";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		mailboxId: PgColumn_ffrhhp43<{
			name: "mailbox_id";
			tableName: "mail_events";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		kind: PgColumn_ffrhhp43<{
			name: "kind";
			tableName: "mail_events";
			dataType: "string";
			columnType: "PgText";
			data: "complaint" | "hard_bounce" | "out_of_office" | "reply" | "soft_bounce" | "unsubscribe";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["hard_bounce", "soft_bounce", "complaint", "reply", "out_of_office", "unsubscribe"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sendId: PgColumn_ffrhhp43<{
			name: "send_id";
			tableName: "mail_events";
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
		prospectId: PgColumn_ffrhhp43<{
			name: "prospect_id";
			tableName: "mail_events";
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
		enrollmentId: PgColumn_ffrhhp43<{
			name: "enrollment_id";
			tableName: "mail_events";
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
		providerMessageId: PgColumn_ffrhhp43<{
			name: "provider_message_id";
			tableName: "mail_events";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		returnDate: PgColumn_ffrhhp43<{
			name: "return_date";
			tableName: "mail_events";
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
		occurredAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "mail_events";
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
		recordedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "mail_events";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* One Mailbox's health on one UTC day: the score (null when the rolling window held fewer sends
* than the minimum sample, shown as "not enough data"), the day's counts and the components with
* their weights and thresholds as the service computed them (a JSON array of at most 10, each
* naming one of the health components). The service upserts the row for the day. Holds numbers
* only.
*
* Lists served: one Mailbox's history newest day first, keyset on `day` (the primary key, read
* backwards).
*/
declare const healthDaily: PgTableWithColumns_a5zn0g43<{
	name: "health_daily";
	schema: "outbound";
	columns: {
		organizationId: PgColumn_ffrhhp43<{
			name: "organization_id";
			tableName: "health_daily";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		mailboxId: PgColumn_ffrhhp43<{
			name: "mailbox_id";
			tableName: "health_daily";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		day: PgColumn_ffrhhp43<{
			name: "day";
			tableName: "health_daily";
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
		score: PgColumn_ffrhhp43<{
			name: "score";
			tableName: "health_daily";
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
		sent: PgColumn_ffrhhp43<{
			name: "sent";
			tableName: "health_daily";
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
		hardBounces: PgColumn_ffrhhp43<{
			name: "hard_bounces";
			tableName: "health_daily";
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
		softBounces: PgColumn_ffrhhp43<{
			name: "soft_bounces";
			tableName: "health_daily";
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
		complaints: PgColumn_ffrhhp43<{
			name: "complaints";
			tableName: "health_daily";
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
		replies: PgColumn_ffrhhp43<{
			name: "replies";
			tableName: "health_daily";
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
		errors: PgColumn_ffrhhp43<{
			name: "errors";
			tableName: "health_daily";
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
		components: PgColumn_ffrhhp43<{
			name: "components";
			tableName: "health_daily";
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
		computedAt: PgColumn_ffrhhp43<{
			name: string;
			tableName: "health_daily";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
import { Column as Column_xh1aba7 } from "drizzle-orm";
import { PgColumnBuilder as PgColumnBuilder_r7cy327 } from "drizzle-orm/pg-core";
import { ColumnBuilderExtraConfig as ColumnBuilderExtraConfig_359rmb7 } from "drizzle-orm";
/** The channels a Draft is written for. Mirrors the contract's `DRAFT_CHANNELS`. */
declare const DRAFT_CHANNELS: readonly ["email"];
/** The languages a Draft or Research Brief is written in. Mirrors the contract's `CAMPAIGN_LANGUAGES`. */
declare const OUTBOUND_LANGUAGES: readonly ["en"];
/** The checks run on every Draft. Mirrors the contract's `DRAFT_CHECKS`. */
declare const DRAFT_CHECKS: readonly ["citations_resolve", "claims_supported", "banned_phrase", "length", "name_match"];
/** The results of a check. Mirrors the `result` of the contract's `outreachDraftCheckSchema`. */
declare const DRAFT_CHECK_RESULTS: readonly ["pass", "fail"];
/** Where the current text of a Draft came from. Mirrors the contract's `draftSourceSchema`. */
declare const DRAFT_TEXT_SOURCES: readonly ["generated", "edited"];
/** Where the suggested angle of a Research Brief came from. Mirrors the contract's `ANGLE_ORIGINS`. */
declare const ANGLE_ORIGINS: readonly ["won_deals", "model_default"];
/** The kinds of source a statement or Citation rests on. Mirrors the `kind` of the contract's `citationSourceSchema`. */
declare const CITATION_KINDS: readonly ["prospect_field", "signal", "web_page", "moment", "document"];
/** The Prospect fields a Citation can name. Mirrors the contract's `PROSPECT_FIELD_NAMES`. */
declare const CITATION_PROSPECT_FIELDS: readonly ["firstName", "lastName", "jobTitle", "email", "phone", "linkedinUrl"];
/** The roles a row of a Research Brief plays: one of its statements, or one source of its angle. */
declare const BRIEF_ENTRY_ROLES: readonly ["statement", "angle_source"];
/** The most statements one Research Brief holds. Mirrors the contract's `MAX_BRIEF_STATEMENTS`. */
declare const MAX_BRIEF_STATEMENTS = 20;
/** The longest statement of a Research Brief, in characters. Mirrors `MAX_BRIEF_STATEMENT_LENGTH`. */
declare const MAX_BRIEF_STATEMENT_LENGTH = 500;
/** The longest angle of a Research Brief, in characters. Mirrors the contract's `MAX_ANGLE_LENGTH`. */
declare const MAX_ANGLE_LENGTH = 500;
/** The most Citations one Draft carries. Mirrors the contract's `MAX_DRAFT_CITATIONS`. */
declare const MAX_DRAFT_CITATIONS = 20;
/** The longest subject of a Draft, in characters. Mirrors the contract's `MAX_DRAFT_SUBJECT_LENGTH`. */
declare const MAX_DRAFT_SUBJECT_LENGTH = 200;
/** The longest body of a Draft, in characters. Mirrors the contract's `MAX_DRAFT_BODY_LENGTH`. */
declare const MAX_DRAFT_BODY_LENGTH = 5e3;
/** The longest goal of a Draft, in characters. Mirrors the contract's `MAX_GOAL_LENGTH`. */
declare const MAX_DRAFT_GOAL_LENGTH = 500;
/** The longest Step key, in characters. Mirrors the contract's `stepKeySchema`. */
declare const MAX_STEP_KEY_LENGTH = 40;
/** The longest model name, in characters. Mirrors the `model` of the contract's `outreachDraftSchema`. */
declare const MAX_MODEL_NAME_LENGTH = 100;
/** The longest tone description of a Brand Voice, in characters. Mirrors `MAX_TONE_LENGTH`. */
declare const MAX_TONE_LENGTH = 500;
/** The most preferred words a Brand Voice lists. Mirrors the contract's `MAX_PREFERRED_WORDS`. */
declare const MAX_PREFERRED_WORDS = 50;
/** The most banned phrases a Brand Voice lists. Mirrors the contract's `MAX_BANNED_PHRASES`. */
declare const MAX_BANNED_PHRASES = 100;
/** The longest preferred word or banned phrase, in characters. Mirrors `MAX_VOICE_TERM_LENGTH`. */
declare const MAX_VOICE_TERM_LENGTH = 100;
/** The longest sign-off of a Brand Voice, in characters. Mirrors the contract's `MAX_SIGN_OFF_LENGTH`. */
declare const MAX_SIGN_OFF_LENGTH = 200;
/** The largest message length a Brand Voice may set. Mirrors `MAX_VOICE_LENGTH_CHARACTERS`. */
declare const MAX_VOICE_LENGTH_CHARACTERS = 5e3;
/** The smallest message length a Brand Voice may set. Mirrors `maxLengthCharacters` in `brandVoiceSettingsSchema`. */
declare const MIN_VOICE_LENGTH_CHARACTERS = 100;
/** The largest Brand Voice version. Mirrors the `version` of the contract's `brandVoiceSchema`. */
declare const MAX_VOICE_VERSION = 1e6;
/** The longest web address a Citation holds, in characters. Mirrors `MAX_CITATION_URL_LENGTH`. */
declare const MAX_CITATION_URL_LENGTH = 2048;
/** The most pages a Document has. Mirrors the contract's `MAX_DOCUMENT_PAGES`. */
declare const MAX_CITATION_DOCUMENT_PAGE = 300;
/** The largest revision of a Draft. Mirrors the `revision` of the contract's `outreachDraftSchema`. */
declare const MAX_DRAFT_REVISION = 1e4;
/** The most won Deals a Draft counts. Mirrors the `wonDealCount` of the contract's `outreachDraftSchema`. */
declare const MAX_WON_DEAL_COUNT = 100;
/** The most findings one check counts. Mirrors the `count` of the contract's `outreachDraftCheckSchema`. */
declare const MAX_CHECK_COUNT = 1e3;
/** The most statements dropped from a Research Brief. Mirrors the `droppedCount` of `researchBriefSchema`. */
declare const MAX_DROPPED_COUNT = 1e3;
/**
* A version of an Organization's Brand Voice: how its outreach sounds. Each change inserts a new
* row with the next `version` (unique per Organization, so two writers racing on the same
* `expectedVersion` cannot both win) and a row never changes afterwards (the service role holds no
* UPDATE), so a Draft names the exact version it was written with. The current version is the
* highest. `preferred_words` and `banned_phrases` hold at most 50 and 100 terms, with no empty or
* null term; the length of each term (100 characters) is checked by the service, and the database
* bounds the total length of the list.
*
* Lookups served: the current version and the version list newest first, keyset on `version`
* (`brand_voices_version_key`); one version by id (the primary key).
*/
declare const outboundBrandVoices: PgTableWithColumns_a5zn0g44<{
	name: "brand_voices";
	schema: "outbound";
	columns: {
		id: PgColumn_ffrhhp44<{
			name: "id";
			tableName: "brand_voices";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp44<{
			name: "organization_id";
			tableName: "brand_voices";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		version: PgColumn_ffrhhp44<{
			name: "version";
			tableName: "brand_voices";
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
		tone: PgColumn_ffrhhp44<{
			name: "tone";
			tableName: "brand_voices";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		preferredWords: PgColumn_ffrhhp44<{
			name: "preferred_words";
			tableName: "brand_voices";
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
			baseColumn: Column_xh1aba7<{
				name: "preferred_words";
				tableName: "brand_voices";
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
			baseBuilder: PgColumnBuilder_r7cy327<{
				name: "preferred_words";
				dataType: "string";
				columnType: "PgText";
				data: string;
				enumValues: [string, ...string[]];
				driverParam: string;
			}, {}, {}, ColumnBuilderExtraConfig_359rmb7>;
			size: undefined;
		}>;
		bannedPhrases: PgColumn_ffrhhp44<{
			name: "banned_phrases";
			tableName: "brand_voices";
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
			baseColumn: Column_xh1aba7<{
				name: "banned_phrases";
				tableName: "brand_voices";
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
			baseBuilder: PgColumnBuilder_r7cy327<{
				name: "banned_phrases";
				dataType: "string";
				columnType: "PgText";
				data: string;
				enumValues: [string, ...string[]];
				driverParam: string;
			}, {}, {}, ColumnBuilderExtraConfig_359rmb7>;
			size: undefined;
		}>;
		signOff: PgColumn_ffrhhp44<{
			name: "sign_off";
			tableName: "brand_voices";
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
		maxLengthCharacters: PgColumn_ffrhhp44<{
			name: "max_length_characters";
			tableName: "brand_voices";
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
		createdByMembershipId: PgColumn_ffrhhp44<{
			name: "created_by_membership_id";
			tableName: "brand_voices";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp44<{
			name: string;
			tableName: "brand_voices";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* A Research Brief: the cited facts about one Prospect that a Draft is written from, with the
* suggested angle. The statements and the sources of the angle are the Brief's rows in
* `brief_statements`. A Brief is cached until `expires_at` and stale once the Prospect changes
* after `prospect_updated_at`; the row never changes after it is written (the service role holds
* no UPDATE), so a new Brief is a new row. `dropped_count` is how many statements the model
* proposed that had no resolvable source. The angle text is model output: tenant data, never
* logged or put in an error report.
*
* Lookups served: the newest Brief of a Prospect, for the cache (`briefs_prospect_idx`); all
* Briefs, keyset `(created_at, id)` newest first (`briefs_list_idx`).
*/
declare const outboundBriefs: PgTableWithColumns_a5zn0g44<{
	name: "briefs";
	schema: "outbound";
	columns: {
		id: PgColumn_ffrhhp44<{
			name: "id";
			tableName: "briefs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp44<{
			name: "organization_id";
			tableName: "briefs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		prospectId: PgColumn_ffrhhp44<{
			name: "prospect_id";
			tableName: "briefs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		angleText: PgColumn_ffrhhp44<{
			name: "angle_text";
			tableName: "briefs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		angleOrigin: PgColumn_ffrhhp44<{
			name: "angle_origin";
			tableName: "briefs";
			dataType: "string";
			columnType: "PgText";
			data: "model_default" | "won_deals";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["won_deals", "model_default"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		droppedCount: PgColumn_ffrhhp44<{
			name: "dropped_count";
			tableName: "briefs";
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
		prospectUpdatedAt: PgColumn_ffrhhp44<{
			name: string;
			tableName: "briefs";
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
		language: PgColumn_ffrhhp44<{
			name: "language";
			tableName: "briefs";
			dataType: "string";
			columnType: "PgText";
			data: "en";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["en"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		model: PgColumn_ffrhhp44<{
			name: "model";
			tableName: "briefs";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp44<{
			name: string;
			tableName: "briefs";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		expiresAt: PgColumn_ffrhhp44<{
			name: string;
			tableName: "briefs";
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
* One row of a Research Brief, in order (`position`): a `statement` (its text and the one source it
* rests on) or an `angle_source` (a source the suggested angle rests on, no text). A statement
* always has exactly one source; the source columns hold ids, times and a web address, never the
* text behind them. A statement or angle source never changes (the service role holds no UPDATE).
* A Brief holds at most 20 statements and the angle at most 20 sources, so `position` runs 0 to 39
* (the service keeps the two counts; positions are not reused across roles).
*
* Lookups served: one Brief's rows in order (the primary key).
*/
declare const outboundBriefStatements: PgTableWithColumns_a5zn0g44<{
	name: "brief_statements";
	schema: "outbound";
	columns: {
		sourceKind: PgColumn_ffrhhp44<{
			name: "source_kind";
			tableName: "brief_statements";
			dataType: "string";
			columnType: "PgText";
			data: "document" | "moment" | "prospect_field" | "signal" | "web_page";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["prospect_field", "signal", "web_page", "moment", "document"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sourceProspectId: PgColumn_ffrhhp44<{
			name: "source_prospect_id";
			tableName: "brief_statements";
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
		sourceField: PgColumn_ffrhhp44<{
			name: "source_field";
			tableName: "brief_statements";
			dataType: "string";
			columnType: "PgText";
			data: "email" | "firstName" | "jobTitle" | "lastName" | "linkedinUrl" | "phone";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["firstName", "lastName", "jobTitle", "email", "phone", "linkedinUrl"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sourceSignalId: PgColumn_ffrhhp44<{
			name: "source_signal_id";
			tableName: "brief_statements";
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
		sourceObservedAt: PgColumn_ffrhhp44<{
			name: string;
			tableName: "brief_statements";
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
		sourceUrl: PgColumn_ffrhhp44<{
			name: "source_url";
			tableName: "brief_statements";
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
		sourceRetrievedAt: PgColumn_ffrhhp44<{
			name: string;
			tableName: "brief_statements";
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
		sourceCallId: PgColumn_ffrhhp44<{
			name: "source_call_id";
			tableName: "brief_statements";
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
		sourceDealRecordId: PgColumn_ffrhhp44<{
			name: "source_deal_record_id";
			tableName: "brief_statements";
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
		sourceDocumentId: PgColumn_ffrhhp44<{
			name: "source_document_id";
			tableName: "brief_statements";
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
		sourcePage: PgColumn_ffrhhp44<{
			name: "source_page";
			tableName: "brief_statements";
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
		organizationId: PgColumn_ffrhhp44<{
			name: "organization_id";
			tableName: "brief_statements";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		briefId: PgColumn_ffrhhp44<{
			name: "brief_id";
			tableName: "brief_statements";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		position: PgColumn_ffrhhp44<{
			name: "position";
			tableName: "brief_statements";
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
		role: PgColumn_ffrhhp44<{
			name: "role";
			tableName: "brief_statements";
			dataType: "string";
			columnType: "PgText";
			data: "angle_source" | "statement";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["statement", "angle_source"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		text: PgColumn_ffrhhp44<{
			name: "text";
			tableName: "brief_statements";
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
* A Draft: one message written for one Prospect and one Step, with the Brand Voice version and
* model it was written with. `subject` and `body` are model output and the Prospect's message:
* tenant data, untrusted, never logged, put in an error report, a trace or an event. `revision`
* starts at 1 and rises with each edit; `source` is `generated` until a person edits the text.
* `ungrounded` is true when no Moment of a won Deal applies, and an ungrounded Draft is never
* `auto_sendable` (a check); that every check passed is a fact about `draft_checks` rows the
* service reads and writes together with this row. `won_deal_count` is the count of won Deals
* behind the Draft's Moments at write time. The Brand Voice and Brief are the Organization's own
* (composite foreign keys), and the voice version is the one of that Brand Voice row.
*
* Lists served (keyset `(created_at, id)` newest first, `LIMIT` a page): all Drafts
* (`drafts_list_idx`), one Prospect (`drafts_prospect_idx`), one Campaign (`drafts_campaign_idx`),
* ungrounded ones (`drafts_ungrounded_idx`).
*/
declare const outboundDrafts: PgTableWithColumns_a5zn0g44<{
	name: "drafts";
	schema: "outbound";
	columns: {
		id: PgColumn_ffrhhp44<{
			name: "id";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp44<{
			name: "organization_id";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		prospectId: PgColumn_ffrhhp44<{
			name: "prospect_id";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		campaignId: PgColumn_ffrhhp44<{
			name: "campaign_id";
			tableName: "drafts";
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
		stepKey: PgColumn_ffrhhp44<{
			name: "step_key";
			tableName: "drafts";
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
		channel: PgColumn_ffrhhp44<{
			name: "channel";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: "email";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["email"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		goal: PgColumn_ffrhhp44<{
			name: "goal";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		language: PgColumn_ffrhhp44<{
			name: "language";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: "en";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["en"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		subject: PgColumn_ffrhhp44<{
			name: "subject";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		body: PgColumn_ffrhhp44<{
			name: "body";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		revision: PgColumn_ffrhhp44<{
			name: "revision";
			tableName: "drafts";
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
		source: PgColumn_ffrhhp44<{
			name: "source";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: "edited" | "generated";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["generated", "edited"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		ungrounded: PgColumn_ffrhhp44<{
			name: "ungrounded";
			tableName: "drafts";
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
		wonDealCount: PgColumn_ffrhhp44<{
			name: "won_deal_count";
			tableName: "drafts";
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
		autoSendable: PgColumn_ffrhhp44<{
			name: "auto_sendable";
			tableName: "drafts";
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
		brandVoiceId: PgColumn_ffrhhp44<{
			name: "brand_voice_id";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		voiceVersion: PgColumn_ffrhhp44<{
			name: "voice_version";
			tableName: "drafts";
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
		briefId: PgColumn_ffrhhp44<{
			name: "brief_id";
			tableName: "drafts";
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
		model: PgColumn_ffrhhp44<{
			name: "model";
			tableName: "drafts";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp44<{
			name: string;
			tableName: "drafts";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp44<{
			name: string;
			tableName: "drafts";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* A Citation on a Draft, in order (`position`): the source (kind and ids; see the source columns),
* whether it still `applies` to the text as it stands, and for a Moment or Document the similarity
* `score` the search gave it. It holds **ids and scores only**, never the text of a Moment,
* Document passage, web page or Prospect field: that is fetched when read, so a deleted source
* shows as removed. At most 20 per Draft (`position` 0 to 19). `applies` is the one column an
* edit changes.
*
* Lookups served: one Draft's Citations in order (the primary key).
*/
declare const outboundDraftCitations: PgTableWithColumns_a5zn0g44<{
	name: "draft_citations";
	schema: "outbound";
	columns: {
		sourceKind: PgColumn_ffrhhp44<{
			name: "source_kind";
			tableName: "draft_citations";
			dataType: "string";
			columnType: "PgText";
			data: "document" | "moment" | "prospect_field" | "signal" | "web_page";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["prospect_field", "signal", "web_page", "moment", "document"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sourceProspectId: PgColumn_ffrhhp44<{
			name: "source_prospect_id";
			tableName: "draft_citations";
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
		sourceField: PgColumn_ffrhhp44<{
			name: "source_field";
			tableName: "draft_citations";
			dataType: "string";
			columnType: "PgText";
			data: "email" | "firstName" | "jobTitle" | "lastName" | "linkedinUrl" | "phone";
			driverParam: string;
			notNull: false;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["firstName", "lastName", "jobTitle", "email", "phone", "linkedinUrl"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sourceSignalId: PgColumn_ffrhhp44<{
			name: "source_signal_id";
			tableName: "draft_citations";
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
		sourceObservedAt: PgColumn_ffrhhp44<{
			name: string;
			tableName: "draft_citations";
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
		sourceUrl: PgColumn_ffrhhp44<{
			name: "source_url";
			tableName: "draft_citations";
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
		sourceRetrievedAt: PgColumn_ffrhhp44<{
			name: string;
			tableName: "draft_citations";
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
		sourceCallId: PgColumn_ffrhhp44<{
			name: "source_call_id";
			tableName: "draft_citations";
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
		sourceDealRecordId: PgColumn_ffrhhp44<{
			name: "source_deal_record_id";
			tableName: "draft_citations";
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
		sourceDocumentId: PgColumn_ffrhhp44<{
			name: "source_document_id";
			tableName: "draft_citations";
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
		sourcePage: PgColumn_ffrhhp44<{
			name: "source_page";
			tableName: "draft_citations";
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
		organizationId: PgColumn_ffrhhp44<{
			name: "organization_id";
			tableName: "draft_citations";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		draftId: PgColumn_ffrhhp44<{
			name: "draft_id";
			tableName: "draft_citations";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		position: PgColumn_ffrhhp44<{
			name: "position";
			tableName: "draft_citations";
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
		applies: PgColumn_ffrhhp44<{
			name: "applies";
			tableName: "draft_citations";
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
		score: PgColumn_ffrhhp44<{
			name: "score";
			tableName: "draft_citations";
			dataType: "number";
			columnType: "PgDoublePrecision";
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
/**
* The result of one check on a Draft: one row per check name (`citations_resolve`,
* `claims_supported`, `banned_phrase`, `length`, `name_match`), so a re-run replaces the row.
* `pass` exactly when nothing was found (`count` 0). Holds no text: only the name, the result and
* how many findings.
*
* Lookups served: one Draft's checks (the primary key).
*/
declare const outboundDraftChecks: PgTableWithColumns_a5zn0g44<{
	name: "draft_checks";
	schema: "outbound";
	columns: {
		organizationId: PgColumn_ffrhhp44<{
			name: "organization_id";
			tableName: "draft_checks";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		draftId: PgColumn_ffrhhp44<{
			name: "draft_id";
			tableName: "draft_checks";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		check: PgColumn_ffrhhp44<{
			name: "check_name";
			tableName: "draft_checks";
			dataType: "string";
			columnType: "PgText";
			data: "banned_phrase" | "citations_resolve" | "claims_supported" | "length" | "name_match";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["citations_resolve", "claims_supported", "banned_phrase", "length", "name_match"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		result: PgColumn_ffrhhp44<{
			name: "result";
			tableName: "draft_checks";
			dataType: "string";
			columnType: "PgText";
			data: "fail" | "pass";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["pass", "fail"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		count: PgColumn_ffrhhp44<{
			name: "count";
			tableName: "draft_checks";
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
		checkedAt: PgColumn_ffrhhp44<{
			name: string;
			tableName: "draft_checks";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* What text generation used and cost one Organization in one calendar month (UTC), per model:
* the input and output tokens, the number of requests and the cost in millionths of a US dollar.
* The service adds to the row with `insert ... on conflict (organization_id, month, model) do
* update`, which is also how a retry stays bounded: the monthly spend limit reads the sum of
* `cost_micros` over `(organization_id, month)`. `month` is the first day of the month. Holds
* counts only, no text.
*
* Lookups served: the usage of one Organization in one month, and its history newest first
* (the primary key, `(organization_id, month, model)`).
*/
declare const outboundModelUsage: PgTableWithColumns_a5zn0g44<{
	name: "model_usage";
	schema: "outbound";
	columns: {
		organizationId: PgColumn_ffrhhp44<{
			name: "organization_id";
			tableName: "model_usage";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		month: PgColumn_ffrhhp44<{
			name: "month";
			tableName: "model_usage";
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
		model: PgColumn_ffrhhp44<{
			name: "model";
			tableName: "model_usage";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		inputTokens: PgColumn_ffrhhp44<{
			name: "input_tokens";
			tableName: "model_usage";
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
		outputTokens: PgColumn_ffrhhp44<{
			name: "output_tokens";
			tableName: "model_usage";
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
		requestCount: PgColumn_ffrhhp44<{
			name: "request_count";
			tableName: "model_usage";
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
		costMicros: PgColumn_ffrhhp44<{
			name: "cost_micros";
			tableName: "model_usage";
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
		updatedAt: PgColumn_ffrhhp44<{
			name: string;
			tableName: "model_usage";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
import { PgSchema as PgSchema_mtt0uw4 } from "drizzle-orm/pg-core";
/** The `playbook` Postgres schema, owned by the playbook service (login role `closeline_playbook`). */
declare const playbookSchema: PgSchema_mtt0uw4<"playbook">;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g45 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp45 } from "drizzle-orm/pg-core";
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
/** The most Moments one Call's counts may state, embedded or skipped; the table's bound. */
declare const CALL_MAX_MOMENTS = 1e6;
/** The most times a Call purge may be claimed: the table's bound, as for documents. */
declare const CALL_PURGE_MAX_ATTEMPTS = 20;
/** The most attempts a Call job may spend: the table's bound, as for ingestion jobs; a deferral ({@link CALL_JOB_DEFER}) gives its claim's attempt back. */
declare const CALL_JOB_MAX_ATTEMPTS = 20;
/**
* The most sends of one Recording to the transcription vendor over the Call's whole life. A transcribe
* job spends at most {@link CALL_JOB_MAX_ATTEMPTS} attempts and each claim sends at most once, and a
* restore starts a new job, so the bound is on the Call itself, not on the claims: the table refuses a twenty-first
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
* Who authored the Moments a Call produces: `imported` for a Call uploaded as sales history,
* `rep` for a Call a Rep made, `agent` for one an Agent made. Mirrors the contract's
* `MOMENT_ORIGINS`. Moments live in the vector index, so the origin is stored on their Call and
* stamped on each Moment when it is built.
*/
declare const CALL_ORIGINS: readonly ["imported", "rep", "agent"];
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
declare const calls: PgTableWithColumns_a5zn0g45<{
	name: "calls";
	schema: "playbook";
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
		dealRecordId: PgColumn_ffrhhp45<{
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
		kind: PgColumn_ffrhhp45<{
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
		fileName: PgColumn_ffrhhp45<{
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
		mediaType: PgColumn_ffrhhp45<{
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
		sizeBytes: PgColumn_ffrhhp45<{
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
		contentHash: PgColumn_ffrhhp45<{
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
		state: PgColumn_ffrhhp45<{
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
		failureReason: PgColumn_ffrhhp45<{
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
		repBy: PgColumn_ffrhhp45<{
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
		repLabel: PgColumn_ffrhhp45<{
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
		repChannel: PgColumn_ffrhhp45<{
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
		speakerLabels: PgColumn_ffrhhp45<{
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
		uploadedBy: PgColumn_ffrhhp45<{
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
		objectKey: PgColumn_ffrhhp45<{
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
		transcriptKey: PgColumn_ffrhhp45<{
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
		epoch: PgColumn_ffrhhp45<{
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
		repSeq: PgColumn_ffrhhp45<{
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
		deletionSeq: PgColumn_ffrhhp45<{
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
		vectorsRemovedSeq: PgColumn_ffrhhp45<{
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
		taggedOutcomeSeq: PgColumn_ffrhhp45<{
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
		origin: PgColumn_ffrhhp45<{
			name: "origin";
			tableName: "calls";
			dataType: "string";
			columnType: "PgText";
			data: "agent" | "imported" | "rep";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["imported", "rep", "agent"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		sentToVendorAt: PgColumn_ffrhhp45<{
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
		vendorSendSeq: PgColumn_ffrhhp45<{
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
		vendorRemovedAt: PgColumn_ffrhhp45<{
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
		deletedAt: PgColumn_ffrhhp45<{
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
		deletedBy: PgColumn_ffrhhp45<{
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
		purgeDueAt: PgColumn_ffrhhp45<{
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
		purgeStartedAt: PgColumn_ffrhhp45<{
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
		purgeLeaseUntil: PgColumn_ffrhhp45<{
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
		purgeAttempts: PgColumn_ffrhhp45<{
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
		restoreBarredAt: PgColumn_ffrhhp45<{
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
		embeddedMoments: PgColumn_ffrhhp45<{
			name: "embedded_moments";
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
		skippedMoments: PgColumn_ffrhhp45<{
			name: "skipped_moments";
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
declare const callJobs: PgTableWithColumns_a5zn0g45<{
	name: "call_jobs";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp45<{
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
		organizationId: PgColumn_ffrhhp45<{
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
		callId: PgColumn_ffrhhp45<{
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
		kind: PgColumn_ffrhhp45<{
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
		epoch: PgColumn_ffrhhp45<{
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
		repSeq: PgColumn_ffrhhp45<{
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
		state: PgColumn_ffrhhp45<{
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
		attempts: PgColumn_ffrhhp45<{
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
		nextAttemptAt: PgColumn_ffrhhp45<{
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
		claimToken: PgColumn_ffrhhp45<{
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
		failureReason: PgColumn_ffrhhp45<{
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
		finishedAt: PgColumn_ffrhhp45<{
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
		createdAt: PgColumn_ffrhhp45<{
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
		updatedAt: PgColumn_ffrhhp45<{
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
declare const callVendorSends: PgTableWithColumns_a5zn0g45<{
	name: "call_vendor_sends";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp45<{
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
		callId: PgColumn_ffrhhp45<{
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
		seq: PgColumn_ffrhhp45<{
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
		vendorId: PgColumn_ffrhhp45<{
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
		createdAt: PgColumn_ffrhhp45<{
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
		recordedAt: PgColumn_ffrhhp45<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g46 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp46 } from "drizzle-orm/pg-core";
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
declare const consumedMessage: PgTableWithColumns_a5zn0g46<{
	name: "consumed_message";
	schema: "playbook";
	columns: {
		consumer: PgColumn_ffrhhp46<{
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
		organizationId: PgColumn_ffrhhp46<{
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
		messageId: PgColumn_ffrhhp46<{
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
		state: PgColumn_ffrhhp46<{
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
		claimToken: PgColumn_ffrhhp46<{
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
		leaseExpiresAt: PgColumn_ffrhhp46<{
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
		completedAt: PgColumn_ffrhhp46<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g47 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp47 } from "drizzle-orm/pg-core";
/** The most Moments one add to the day's count may state; a larger count is cut to it. */
declare const EMBED_USAGE_MAX_ADD = 1e6;
/** The most Moments a day's count holds: the table's bound, which an add stops at rather than fail. */
declare const EMBED_USAGE_MAX_MOMENTS = 1e9;
/**
* How many Moments the Organization's Call jobs reserved to embed on one UTC day: the durable
* counter behind the daily embed budget. A **tenant table** (row-level security, fail-closed),
* keyed by `(organization_id, day)`. The role adds to it with `EMBED_USAGE_ADD` (an upsert that
* returns the day's total) and removes old days with `EMBED_USAGE_PURGE`. It holds a count and a
* date and no content.
*/
declare const playbookEmbedUsage: PgTableWithColumns_a5zn0g47<{
	name: "embed_usage";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp47<{
			name: "organization_id";
			tableName: "embed_usage";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		day: PgColumn_ffrhhp47<{
			name: "day";
			tableName: "embed_usage";
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
		moments: PgColumn_ffrhhp47<{
			name: "moments";
			tableName: "embed_usage";
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g48 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp48 } from "drizzle-orm/pg-core";
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
declare const playbookIdempotencyKeys: PgTableWithColumns_a5zn0g48<{
	name: "idempotency_keys";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp48<{
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
		userId: PgColumn_ffrhhp48<{
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
		route: PgColumn_ffrhhp48<{
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
		key: PgColumn_ffrhhp48<{
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
		requestHash: PgColumn_ffrhhp48<{
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
		status: PgColumn_ffrhhp48<{
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
		response: PgColumn_ffrhhp48<{
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
		createdAt: PgColumn_ffrhhp48<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g49 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp49 } from "drizzle-orm/pg-core";
/** The longest sweep cursor in bytes: an object key is at most 1024 bytes, and the cursor is one. */
declare const ORPHAN_SWEEP_CURSOR_MAX_BYTES = 1024;
/** The shortest claim deadline, in milliseconds, `orphan_sweep_claim` stores; a smaller value is raised to it. */
declare const ORPHAN_SWEEP_MIN_CLAIM_MS = 1e3;
/** The longest claim deadline, in milliseconds, `orphan_sweep_claim` stores; a longer value is cut to it. */
declare const ORPHAN_SWEEP_MAX_CLAIM_MS = 36e5;
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
*
* `sweep_cursor` is the last object key a cut-short listing reached (null when the last sweep
* completed or none is in progress; at most {@link ORPHAN_SWEEP_CURSOR_MAX_BYTES} bytes). It names
* an object key, never content. `sweep_claim_until` is the deadline of the instance sweeping the
* Organization, null when none does. Both are written only by `playbook.orphan_sweep_claim` and
* `playbook.orphan_sweep_page_done`.
*/
declare const playbookOrphanSweeps: PgTableWithColumns_a5zn0g49<{
	name: "orphan_sweeps";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp49<{
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
		sweptThrough: PgColumn_ffrhhp49<{
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
		erasedAttemptAt: PgColumn_ffrhhp49<{
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
		sweepCursor: PgColumn_ffrhhp49<{
			name: "sweep_cursor";
			tableName: "orphan_sweeps";
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
		sweepClaimUntil: PgColumn_ffrhhp49<{
			name: "sweep_claim_until";
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g50 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp50 } from "drizzle-orm/pg-core";
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
declare const deals: PgTableWithColumns_a5zn0g50<{
	name: "deals";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp50<{
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
		organizationId: PgColumn_ffrhhp50<{
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
		dealId: PgColumn_ffrhhp50<{
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
		name: PgColumn_ffrhhp50<{
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
		outcome: PgColumn_ffrhhp50<{
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
		outcomeSeq: PgColumn_ffrhhp50<{
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
		retagThrough: PgColumn_ffrhhp50<{
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
		closedAt: PgColumn_ffrhhp50<{
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
		amount: PgColumn_ffrhhp50<{
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
		currency: PgColumn_ffrhhp50<{
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
		appearedInImport: PgColumn_ffrhhp50<{
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
		createdAt: PgColumn_ffrhhp50<{
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
		updatedAt: PgColumn_ffrhhp50<{
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
declare const dealImports: PgTableWithColumns_a5zn0g50<{
	name: "deal_imports";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp50<{
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
		organizationId: PgColumn_ffrhhp50<{
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
		state: PgColumn_ffrhhp50<{
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
		failureReason: PgColumn_ffrhhp50<{
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
		uploadedBy: PgColumn_ffrhhp50<{
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
		objectKey: PgColumn_ffrhhp50<{
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
		sizeBytes: PgColumn_ffrhhp50<{
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
		attempts: PgColumn_ffrhhp50<{
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
		nextAttemptAt: PgColumn_ffrhhp50<{
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
		claimToken: PgColumn_ffrhhp50<{
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
		rowCount: PgColumn_ffrhhp50<{
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
		appliedCount: PgColumn_ffrhhp50<{
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
		rejectedCount: PgColumn_ffrhhp50<{
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
		reportThrough: PgColumn_ffrhhp50<{
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
		objectRemovedAt: PgColumn_ffrhhp50<{
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
		erasedAt: PgColumn_ffrhhp50<{
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
		finishedAt: PgColumn_ffrhhp50<{
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
		createdAt: PgColumn_ffrhhp50<{
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
		updatedAt: PgColumn_ffrhhp50<{
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
declare const dealImportRows: PgTableWithColumns_a5zn0g50<{
	name: "deal_import_rows";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp50<{
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
		importId: PgColumn_ffrhhp50<{
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
		rowNumber: PgColumn_ffrhhp50<{
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
		dealId: PgColumn_ffrhhp50<{
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
		result: PgColumn_ffrhhp50<{
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
		reason: PgColumn_ffrhhp50<{
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
declare const rightsConfirmations: PgTableWithColumns_a5zn0g50<{
	name: "rights_confirmations";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp50<{
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
		confirmedBy: PgColumn_ffrhhp50<{
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
		confirmedAt: PgColumn_ffrhhp50<{
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
		wordingVersion: PgColumn_ffrhhp50<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g51 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp51 } from "drizzle-orm/pg-core";
/** What a Suggestion proposes to add. Mirrors the contract's `SUGGESTION_KINDS`. */
declare const SUGGESTION_KINDS: readonly ["objection_answer", "discovery_question", "closing_move"];
/** Where a Suggestion is. Mirrors the contract's `SUGGESTION_STATUSES`. */
declare const SUGGESTION_STATUSES: readonly ["pending", "accepted", "rejected"];
/** The longest Suggestion text. Mirrors the contract's `MAX_SUGGESTION_TEXT_LENGTH`. */
declare const MAX_SUGGESTION_TEXT_LENGTH = 1e3;
/** The most Moments one Suggestion cites. Mirrors the contract's `MAX_SUGGESTION_MOMENTS`. */
declare const MAX_SUGGESTION_MOMENTS = 10;
/** The byte length of a Suggestion's fingerprint: a SHA-256 digest. */
declare const SUGGESTION_FINGERPRINT_BYTES = 32;
/**
* A proposed Playbook addition derived from a won Deal (spec M15). It influences no Agent and is
* not searched until an Admin accepts it (`status = 'accepted'`); a rejected one is kept so it is
* not proposed again: `fingerprint` (a digest of the kind and normalised text) is unique per
* Organization (`suggestions_fingerprint_key`), so a second proposal of the same text is refused
* whatever its state. Provenance is the won Deal (`deal_record_id`, an opaque id) and the Moments
* it cites (`moments`, at most 10 references as the contract's Citation references: Call id, Deal
* id and Moment number). The text comes from the Deal's Calls, so it is untrusted data. A decision
* is the time and the Membership that made it, both set exactly when the Suggestion is not pending.
*
* Lists (keyset `(created_at, id)`, newest first): all (`suggestions_list_idx`), one status
* (`suggestions_status_list_idx`).
*/
declare const suggestions: PgTableWithColumns_a5zn0g51<{
	name: "suggestions";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp51<{
			name: "id";
			tableName: "suggestions";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp51<{
			name: "organization_id";
			tableName: "suggestions";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		kind: PgColumn_ffrhhp51<{
			name: "kind";
			tableName: "suggestions";
			dataType: "string";
			columnType: "PgText";
			data: "closing_move" | "discovery_question" | "objection_answer";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["objection_answer", "discovery_question", "closing_move"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		status: PgColumn_ffrhhp51<{
			name: "status";
			tableName: "suggestions";
			dataType: "string";
			columnType: "PgText";
			data: "accepted" | "pending" | "rejected";
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["pending", "accepted", "rejected"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		text: PgColumn_ffrhhp51<{
			name: "text";
			tableName: "suggestions";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		fingerprint: PgColumn_ffrhhp51<{
			name: "fingerprint";
			tableName: "suggestions";
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
		dealRecordId: PgColumn_ffrhhp51<{
			name: "deal_record_id";
			tableName: "suggestions";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		moments: PgColumn_ffrhhp51<{
			name: "moments";
			tableName: "suggestions";
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
		createdAt: PgColumn_ffrhhp51<{
			name: string;
			tableName: "suggestions";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		decidedAt: PgColumn_ffrhhp51<{
			name: string;
			tableName: "suggestions";
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
		decidedByMembershipId: PgColumn_ffrhhp51<{
			name: "decided_by_membership_id";
			tableName: "suggestions";
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g52 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp52 } from "drizzle-orm/pg-core";
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
declare const documents: PgTableWithColumns_a5zn0g52<{
	name: "documents";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp52<{
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
		organizationId: PgColumn_ffrhhp52<{
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
		name: PgColumn_ffrhhp52<{
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
		state: PgColumn_ffrhhp52<{
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
		contentHash: PgColumn_ffrhhp52<{
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
		sizeBytes: PgColumn_ffrhhp52<{
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
		declaredType: PgColumn_ffrhhp52<{
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
		detectedType: PgColumn_ffrhhp52<{
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
		uploadedBy: PgColumn_ffrhhp52<{
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
		objectKey: PgColumn_ffrhhp52<{
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
		failureReason: PgColumn_ffrhhp52<{
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
		pageCount: PgColumn_ffrhhp52<{
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
		epoch: PgColumn_ffrhhp52<{
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
		deletionSeq: PgColumn_ffrhhp52<{
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
		vectorsRemovedSeq: PgColumn_ffrhhp52<{
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
		deletedAt: PgColumn_ffrhhp52<{
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
		deletedBy: PgColumn_ffrhhp52<{
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
		purgeDueAt: PgColumn_ffrhhp52<{
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
		purgeStartedAt: PgColumn_ffrhhp52<{
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
		purgeLeaseUntil: PgColumn_ffrhhp52<{
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
		purgeAttempts: PgColumn_ffrhhp52<{
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
		restoreBarredAt: PgColumn_ffrhhp52<{
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
		createdAt: PgColumn_ffrhhp52<{
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
		updatedAt: PgColumn_ffrhhp52<{
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
declare const organizationUsage: PgTableWithColumns_a5zn0g52<{
	name: "organization_usage";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp52<{
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
		documentCount: PgColumn_ffrhhp52<{
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
		byteCount: PgColumn_ffrhhp52<{
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
		dealCount: PgColumn_ffrhhp52<{
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
		callCount: PgColumn_ffrhhp52<{
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
		recordingByteCount: PgColumn_ffrhhp52<{
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
		updatedAt: PgColumn_ffrhhp52<{
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
declare const ingestionJobs: PgTableWithColumns_a5zn0g52<{
	name: "ingestion_jobs";
	schema: "playbook";
	columns: {
		id: PgColumn_ffrhhp52<{
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
		organizationId: PgColumn_ffrhhp52<{
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
		documentId: PgColumn_ffrhhp52<{
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
		epoch: PgColumn_ffrhhp52<{
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
		state: PgColumn_ffrhhp52<{
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
		step: PgColumn_ffrhhp52<{
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
		attempts: PgColumn_ffrhhp52<{
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
		nextAttemptAt: PgColumn_ffrhhp52<{
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
		claimToken: PgColumn_ffrhhp52<{
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
		artifactKey: PgColumn_ffrhhp52<{
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
		pageCount: PgColumn_ffrhhp52<{
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
		chunkCount: PgColumn_ffrhhp52<{
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
		chunksDone: PgColumn_ffrhhp52<{
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
		failureReason: PgColumn_ffrhhp52<{
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
		finishedAt: PgColumn_ffrhhp52<{
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
		createdAt: PgColumn_ffrhhp52<{
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
		updatedAt: PgColumn_ffrhhp52<{
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
declare const indexSettings: PgTableWithColumns_a5zn0g52<{
	name: "index_settings";
	schema: "playbook";
	columns: {
		organizationId: PgColumn_ffrhhp52<{
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
		embeddingModel: PgColumn_ffrhhp52<{
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
		embeddingDimension: PgColumn_ffrhhp52<{
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
		vectorsWrittenAt: PgColumn_ffrhhp52<{
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
		createdAt: PgColumn_ffrhhp52<{
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
		updatedAt: PgColumn_ffrhhp52<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g53 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp53 } from "drizzle-orm/pg-core";
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
declare const playbookWorkHints: PgTableWithColumns_a5zn0g53<{
	name: "work_hints";
	schema: "playbook";
	columns: {
		kind: PgColumn_ffrhhp53<{
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
		organizationId: PgColumn_ffrhhp53<{
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
		dueAt: PgColumn_ffrhhp53<{
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
import { PgSchema as PgSchema_mtt0uw5 } from "drizzle-orm/pg-core";
/** The `voice` Postgres schema, owned by the voice service (login role `closeline_voice`). */
declare const voiceSchema: PgSchema_mtt0uw5<"voice">;
import { PgTableWithColumns as PgTableWithColumns_a5zn0g54 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp54 } from "drizzle-orm/pg-core";
/**
* The outcome of one public `POST` of the voice service that has an effect worth not repeating
* (`addLine` buys a number), per Organization, user, route and client key: playbook's
* `idempotency_keys` (migration `0011`) with the same columns, checks and write-once trigger, and
* like it **without a foreign key to organizations** (the voice schema has no Organization table;
* the id is checked by shape). The service inserts the row in flight, does its work and completes
* the row (status and response together); a completed row is never rewritten. A retry with the
* same key and the same `request_hash` replays the stored response; a different hash is the
* contract's idempotency conflict. The purge is per Organization and bounded, on
* `idempotency_keys_purge_idx` (`organization_id`, `created_at`).
*/
declare const voiceIdempotencyKeys: PgTableWithColumns_a5zn0g54<{
	name: "idempotency_keys";
	schema: "voice";
	columns: {
		organizationId: PgColumn_ffrhhp54<{
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
		userId: PgColumn_ffrhhp54<{
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
		route: PgColumn_ffrhhp54<{
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
		key: PgColumn_ffrhhp54<{
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
		requestHash: PgColumn_ffrhhp54<{
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
		status: PgColumn_ffrhhp54<{
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
		response: PgColumn_ffrhhp54<{
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
		createdAt: PgColumn_ffrhhp54<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g55 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp55 } from "drizzle-orm/pg-core";
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
declare const voiceLines: PgTableWithColumns_a5zn0g55<{
	name: "lines";
	schema: "voice";
	columns: {
		id: PgColumn_ffrhhp55<{
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
		organizationId: PgColumn_ffrhhp55<{
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
		number: PgColumn_ffrhhp55<{
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
		country: PgColumn_ffrhhp55<{
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
		label: PgColumn_ffrhhp55<{
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
		state: PgColumn_ffrhhp55<{
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
		assignmentKind: PgColumn_ffrhhp55<{
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
		assignmentTeamId: PgColumn_ffrhhp55<{
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
		assignmentMembershipId: PgColumn_ffrhhp55<{
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
		providerSid: PgColumn_ffrhhp55<{
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
		createdAt: PgColumn_ffrhhp55<{
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
		releasedAt: PgColumn_ffrhhp55<{
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
* Which Organization and Line a dialled number reaches, for Lines that are not released. The
* inbound webhook knows only the number, so this cannot sit behind row-level security: it is a
* no-access table like `core.consent_form_directory`. It holds the number, the Organization id,
* the Line id and the Line's state, nothing else. `closeline_voice` reaches it only through the
* `SECURITY DEFINER` function `voice.line_for_number(number)` (one row for one exact key, joined
* to `core.organization_state` so only an `active` Line of an `active` Organization answers); the
* trigger `lines_sync_directory` on `lines` keeps it, and no service role holds any privilege on
* it.
*/
declare const voiceLineDirectory: PgTableWithColumns_a5zn0g55<{
	name: "line_directory";
	schema: "voice";
	columns: {
		number: PgColumn_ffrhhp55<{
			name: "number";
			tableName: "line_directory";
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
		organizationId: PgColumn_ffrhhp55<{
			name: "organization_id";
			tableName: "line_directory";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		lineId: PgColumn_ffrhhp55<{
			name: "line_id";
			tableName: "line_directory";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		state: PgColumn_ffrhhp55<{
			name: "state";
			tableName: "line_directory";
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
declare const voiceCalls: PgTableWithColumns_a5zn0g55<{
	name: "calls";
	schema: "voice";
	columns: {
		id: PgColumn_ffrhhp55<{
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
		organizationId: PgColumn_ffrhhp55<{
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
		direction: PgColumn_ffrhhp55<{
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
		state: PgColumn_ffrhhp55<{
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
		lineId: PgColumn_ffrhhp55<{
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
		repMembershipId: PgColumn_ffrhhp55<{
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
		prospectId: PgColumn_ffrhhp55<{
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
		prospectNumber: PgColumn_ffrhhp55<{
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
		providerCallSid: PgColumn_ffrhhp55<{
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
		idempotencyKey: PgColumn_ffrhhp55<{
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
		requestFingerprint: PgColumn_ffrhhp55<{
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
		disclosureWordingVersion: PgColumn_ffrhhp55<{
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
		disclosurePlayedAt: PgColumn_ffrhhp55<{
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
		aiAssisted: PgColumn_ffrhhp55<{
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
		createdAt: PgColumn_ffrhhp55<{
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
		answeredAt: PgColumn_ffrhhp55<{
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
		endedAt: PgColumn_ffrhhp55<{
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
		durationSeconds: PgColumn_ffrhhp55<{
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
		endedBy: PgColumn_ffrhhp55<{
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
		failureReason: PgColumn_ffrhhp55<{
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
		dealId: PgColumn_ffrhhp55<{
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
		note: PgColumn_ffrhhp55<{
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
		transcriptState: PgColumn_ffrhhp55<{
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
		updatedAt: PgColumn_ffrhhp55<{
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
declare const voiceCallEvents: PgTableWithColumns_a5zn0g55<{
	name: "call_events";
	schema: "voice";
	columns: {
		id: PgColumn_ffrhhp55<{
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
		organizationId: PgColumn_ffrhhp55<{
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
		seq: PgColumn_ffrhhp55<{
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
		callId: PgColumn_ffrhhp55<{
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
		kind: PgColumn_ffrhhp55<{
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
		fromState: PgColumn_ffrhhp55<{
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
		toState: PgColumn_ffrhhp55<{
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
		providerEventId: PgColumn_ffrhhp55<{
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
		occurredAt: PgColumn_ffrhhp55<{
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
		recordedAt: PgColumn_ffrhhp55<{
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
declare const voiceRecordings: PgTableWithColumns_a5zn0g55<{
	name: "recordings";
	schema: "voice";
	columns: {
		id: PgColumn_ffrhhp55<{
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
		organizationId: PgColumn_ffrhhp55<{
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
		callId: PgColumn_ffrhhp55<{
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
		storageKey: PgColumn_ffrhhp55<{
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
		sizeBytes: PgColumn_ffrhhp55<{
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
		channels: PgColumn_ffrhhp55<{
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
		state: PgColumn_ffrhhp55<{
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
		createdAt: PgColumn_ffrhhp55<{
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
		storedAt: PgColumn_ffrhhp55<{
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
		deletedAt: PgColumn_ffrhhp55<{
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
		purgeDueAt: PgColumn_ffrhhp55<{
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
		updatedAt: PgColumn_ffrhhp55<{
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
import { PgTableWithColumns as PgTableWithColumns_a5zn0g56 } from "drizzle-orm/pg-core";
import { PgColumn as PgColumn_ffrhhp56 } from "drizzle-orm/pg-core";
import { Column as Column_xh1aba8 } from "drizzle-orm";
import { PgColumnBuilder as PgColumnBuilder_r7cy328 } from "drizzle-orm/pg-core";
import { ColumnBuilderExtraConfig as ColumnBuilderExtraConfig_359rmb8 } from "drizzle-orm";
/** The most Reps an inbound provider call is meant to ring. */
declare const MAX_TWILIO_RING_IDENTITIES = 100;
/** The longest provider id (call, Recording or stream), in characters. */
declare const MAX_TWILIO_PROVIDER_ID_LENGTH = 128;
/** The longest idempotency key of a placement, in characters. */
declare const MAX_TWILIO_PLACEMENT_KEY_LENGTH = 255;
/** The longest placement fingerprint (a keyed hash of the numbers), in characters. */
declare const MAX_TWILIO_FINGERPRINT_LENGTH = 128;
/** What a directory entry points at: a provider call or a Recording. */
declare const TWILIO_DIRECTORY_KINDS: readonly ["call", "recording"];
/**
* What the Twilio telephony adapter remembers about one provider call, since Twilio holds no tag
* for it (the kit's `TwilioStore`, `TwilioCallRecord`). One row per provider call, keyed by
* `(organization_id, provider_call_id)`; the Organization is the one in the verified token or the
* tag the adapter put on the callback, never a guess. The Disclosure is three columns set or null
* together (`wording_version`, `ai_assisted`, `played_at`); `disclosure_started` is true once it
* began to play. `ring_identities` are the Rep memberships an inbound call was meant to ring.
* Holds no number, name, audio or message body.
*
* Transient: `expires_at` is when the row may be purged (a call is over long before; the purge is
* per Organization and bounded, on `twilio_calls_purge_idx`). The service sets it on insert and a
* purge removes the row, its Recording rows (cascade) and its directory entries (trigger).
*
* Lookups served: by provider call (the primary key, inside the Organization's scope); the owner
* of a provider call before the Organization is known, through `voice.twilio_owner`. The row lock
* of `withCall` is `SELECT ... FOR UPDATE` on the primary key. `claimCall` is `INSERT ... ON
* CONFLICT DO NOTHING` on it. A provider call id that another Organization already holds is
* refused by the directory (unique violation on `twilio_directory_pkey`).
*/
declare const voiceTwilioCalls: PgTableWithColumns_a5zn0g56<{
	name: "twilio_calls";
	schema: "voice";
	columns: {
		organizationId: PgColumn_ffrhhp56<{
			name: "organization_id";
			tableName: "twilio_calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		providerCallId: PgColumn_ffrhhp56<{
			name: "provider_call_id";
			tableName: "twilio_calls";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		callId: PgColumn_ffrhhp56<{
			name: "call_id";
			tableName: "twilio_calls";
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
		direction: PgColumn_ffrhhp56<{
			name: "direction";
			tableName: "twilio_calls";
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
		disclosureWordingVersion: PgColumn_ffrhhp56<{
			name: "disclosure_wording_version";
			tableName: "twilio_calls";
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
		disclosureAiAssisted: PgColumn_ffrhhp56<{
			name: "disclosure_ai_assisted";
			tableName: "twilio_calls";
			dataType: "boolean";
			columnType: "PgBoolean";
			data: boolean;
			driverParam: boolean;
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
		disclosurePlayedAt: PgColumn_ffrhhp56<{
			name: string;
			tableName: "twilio_calls";
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
		disclosureStarted: PgColumn_ffrhhp56<{
			name: "disclosure_started";
			tableName: "twilio_calls";
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
		bridgedTo: PgColumn_ffrhhp56<{
			name: "bridged_to";
			tableName: "twilio_calls";
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
		ringIdentities: PgColumn_ffrhhp56<{
			name: "ring_identities";
			tableName: "twilio_calls";
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
			baseColumn: Column_xh1aba8<{
				name: "ring_identities";
				tableName: "twilio_calls";
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
			baseBuilder: PgColumnBuilder_r7cy328<{
				name: "ring_identities";
				dataType: "string";
				columnType: "PgText";
				data: string;
				enumValues: [string, ...string[]];
				driverParam: string;
			}, {}, {}, ColumnBuilderExtraConfig_359rmb8>;
			size: undefined;
		}>;
		recordingId: PgColumn_ffrhhp56<{
			name: "recording_id";
			tableName: "twilio_calls";
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
		streamId: PgColumn_ffrhhp56<{
			name: "stream_id";
			tableName: "twilio_calls";
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
		createdAt: PgColumn_ffrhhp56<{
			name: string;
			tableName: "twilio_calls";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		updatedAt: PgColumn_ffrhhp56<{
			name: string;
			tableName: "twilio_calls";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		expiresAt: PgColumn_ffrhhp56<{
			name: string;
			tableName: "twilio_calls";
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
* Which provider call a Recording belongs to (the kit's `TwilioStore.putRecording`). One row per
* Recording, keyed `(organization_id, recording_id)`; the provider call is the Organization's own
* (composite foreign key, so the row goes with its call). Written once: `closeline_voice` holds no
* UPDATE. `expires_at` follows the call's. Lookups served: by Recording id, through
* `voice.twilio_owner` before the Organization is known, then the primary key.
*/
declare const voiceTwilioRecordings: PgTableWithColumns_a5zn0g56<{
	name: "twilio_recordings";
	schema: "voice";
	columns: {
		organizationId: PgColumn_ffrhhp56<{
			name: "organization_id";
			tableName: "twilio_recordings";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		recordingId: PgColumn_ffrhhp56<{
			name: "recording_id";
			tableName: "twilio_recordings";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		providerCallId: PgColumn_ffrhhp56<{
			name: "provider_call_id";
			tableName: "twilio_recordings";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp56<{
			name: string;
			tableName: "twilio_recordings";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
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
* What the adapter remembers about a placement to answer a repeated idempotency key (the kit's
* `TwilioPlacement`): the provider call the key placed and a keyed hash of the numbers (never the
* numbers). One row per `(organization_id, idempotency_key)`; written once (no UPDATE). Transient:
* `expires_at` is when the key may be forgotten (purge on `twilio_placements_purge_idx`, per
* Organization and bounded). Lookups served: by key (the primary key).
*/
declare const voiceTwilioPlacements: PgTableWithColumns_a5zn0g56<{
	name: "twilio_placements";
	schema: "voice";
	columns: {
		organizationId: PgColumn_ffrhhp56<{
			name: "organization_id";
			tableName: "twilio_placements";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		idempotencyKey: PgColumn_ffrhhp56<{
			name: "idempotency_key";
			tableName: "twilio_placements";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		providerCallId: PgColumn_ffrhhp56<{
			name: "provider_call_id";
			tableName: "twilio_placements";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		fingerprint: PgColumn_ffrhhp56<{
			name: "fingerprint";
			tableName: "twilio_placements";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		createdAt: PgColumn_ffrhhp56<{
			name: string;
			tableName: "twilio_placements";
			dataType: "date";
			columnType: "PgTimestamp";
			data: Date;
			driverParam: string;
			notNull: true;
			hasDefault: true;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		expiresAt: PgColumn_ffrhhp56<{
			name: string;
			tableName: "twilio_placements";
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
* Which Organization owns a provider call or a Recording, for the questions the adapter asks
* before it knows the Organization (a webhook carries a provider id, and the store's
* `getCall(providerCallId)` and `getRecording(recordingId)` take no Organization). It cannot sit
* behind row-level security: it is a no-access table like `voice.line_directory`. It holds a kind,
* the provider id, the Organization id and the provider call id, nothing else. `closeline_voice`
* reaches it only through the `SECURITY DEFINER` function `voice.twilio_owner(kind, id)` (one row
* for one exact key); the triggers `twilio_calls_sync_directory` and
* `twilio_recordings_sync_directory` keep it, and no service role holds any privilege on it. The
* primary key makes a provider id belong to one Organization for good.
*/
declare const voiceTwilioDirectory: PgTableWithColumns_a5zn0g56<{
	name: "twilio_directory";
	schema: "voice";
	columns: {
		kind: PgColumn_ffrhhp56<{
			name: "kind";
			tableName: "twilio_directory";
			dataType: "string";
			columnType: "PgText";
			data: "call" | "recording";
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: ["call", "recording"];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		refId: PgColumn_ffrhhp56<{
			name: "ref_id";
			tableName: "twilio_directory";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		organizationId: PgColumn_ffrhhp56<{
			name: "organization_id";
			tableName: "twilio_directory";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: [string, ...string[]];
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}, {}, {}>;
		providerCallId: PgColumn_ffrhhp56<{
			name: "provider_call_id";
			tableName: "twilio_directory";
			dataType: "string";
			columnType: "PgText";
			data: string;
			driverParam: string;
			notNull: true;
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
export { ABANDON_CASE_MAX_ATTEMPTS, ABANDON_CASE_OUTCOMES, ADDRESS_HASH_BYTES, AGENT_KINDS, AGENT_SETTING_CHANNELS, ANGLE_ORIGINS, API_KEY_KINDS, API_KEY_ROLE_CEILINGS, API_KEY_SCOPES, APPROVAL_MODES, ASSESSMENT_JUDGE_SOURCES, ASSESSMENT_SUBJECT_KINDS, ASSESSMENT_VERDICTS, ATTEMPT_COUNTER_KEY_HASH_BYTES, ATTEMPT_COUNTER_KINDS, ATTEMPT_COUNTER_MAX_HITS, AUDIT_ACTOR_KINDS, AUDIT_ACTOR_TYPES, AUDIT_RETENTION_FLOOR, AbandonCase, ApiKey, AttemptCounter, AuditLog, BRIEF_ENTRY_ROLES, BackupCode, CALL_CHANNELS, CALL_FAILURE_REASONS, CALL_JOB_KINDS, CALL_JOB_MAX_ATTEMPTS, CALL_JOB_STATES, CALL_KINDS, CALL_MAX_MOMENTS, CALL_MAX_RECORDING_BYTES, CALL_MAX_RECORDING_SECONDS, CALL_MAX_SEQ, CALL_MAX_SPEAKERS, CALL_MAX_TRANSCRIPT_BYTES, CALL_MAX_VENDOR_SENDS, CALL_MEDIA_TYPES, CALL_ORIGINS, CALL_PENDING_CLEANUP_PREDICATE, CALL_PURGE_MAX_ATTEMPTS, CALL_REP_BY, CALL_SPEAKER_LABEL_MAX_BYTES, CALL_SPEAKER_LABEL_MAX_LENGTH, CALL_STATES, CALL_VENDOR_ID_PATTERN, CITATION_KINDS, CITATION_PROSPECT_FIELDS, CLASSIFICATION_DECIDERS, CONSENT_CHANNELS, CONSENT_EVENT_KINDS, CONSENT_FORM_STATES, CONSENT_GRANT_SOURCES, CONSENT_WITHDRAWAL_SOURCES, CONSUMED_MESSAGE_STATES, CONTACT_ALLOW_BASES, CONTACT_CHECK_RETENTION_DAYS, CONTACT_PURPOSES, CONTROL_LEVELS, CONVERSATION_CONTROLLERS, CONVERSATION_OUTCOME_LABELS, CONVERSATION_STATES, CREDENTIAL_TYPES, CRM_CONNECTION_STATES, CRM_DIRECTIONS, CRM_FIELD_KEYS, CRM_MAPPING_KINDS, CRM_OBJECT_KINDS, CRM_PROVIDERS, CRM_REF_STATES, CRM_RUN_ERROR_CODES, CRM_RUN_STATES, CRM_RUN_TRIGGERS, CRM_SCOPE_LEVELS, CRM_SKIP_REASON_COUNT, CRM_STAGE_OUTCOMES, CRM_WEBHOOK_WINDOW_SECONDS, Credential, DEAL_ID_MAX_BYTES, DEAL_ID_MAX_LENGTH, DEAL_IMPORT_APPLY_BATCH, DEAL_IMPORT_FAILURE_REASONS, DEAL_IMPORT_MAX_ATTEMPTS, DEAL_IMPORT_MAX_BYTES, DEAL_IMPORT_MAX_ROWS, DEAL_IMPORT_ROW_REASONS, DEAL_IMPORT_ROW_REASONS_WITHOUT_DEAL_ID, DEAL_IMPORT_ROW_RESULTS, DEAL_IMPORT_STATES, DEAL_MAX_SEQ, DEAL_NAME_MAX_BYTES, DEAL_NAME_MAX_LENGTH, DEAL_OUTCOMES, DECISION_KINDS, DEFAULT_CHANNEL, DEMO_NOTIFICATION_STATUSES, DEMO_RATE_ADDRESS_HASH_BYTES, DEMO_REQUEST_KEY_LENGTH, DEMO_REQUEST_MESSAGE_MAX, DEMO_REQUEST_NAME_MAX, DEMO_REQUEST_SOURCE_PAGE_MAX, DOCUMENT_FAILURE_REASONS, DOCUMENT_FILE_TYPES, DOCUMENT_MAX_BYTES, DOCUMENT_MAX_PAGE_COUNT, DOCUMENT_PURGE_MAX_ATTEMPTS, DOCUMENT_STATES, DRAFT_AUTHORS, DRAFT_CHANNELS, DRAFT_CHECKS, DRAFT_CHECK_RESULTS, DRAFT_HOLD_REASONS, DRAFT_SOURCE_KINDS, DRAFT_STATUSES, DRAFT_TEXT_SOURCES, DemoRateCounter, DemoRequest, EMBED_USAGE_MAX_ADD, EMBED_USAGE_MAX_MOMENTS, ENVIRONMENT_KINDS, ESCALATION_TARGETS, ESCALATION_TRIGGERS, EVENT_RETENTION_FLOOR, EXPORT_ACTIVE_STATES, EXPORT_FAILURE_REASONS, EXPORT_FORMATS, EXPORT_KINDS, EXPORT_PART_FAILURE_REASONS, EXPORT_PART_STATES, EXPORT_SERVICES, EXPORT_STATES, Environment, EnvironmentSettingsRow, Event, FIELD_HISTORY_STATES, FINDING_CATEGORIES, FINDING_FEEDBACKS, FINDING_SEVERITIES, FORM_TOKEN_PATTERN, FlowAttemptRow, GLOBAL_SCOPE_ORGANIZATION_ID, HEALTH_COMPONENT_KINDS, HEALTH_EFFECTS, HookCallCount, HookRow, IDEMPOTENCY_HASH_BYTES, IDEMPOTENCY_KEY_MAX, IDEMPOTENCY_RESPONSE_MAX_BYTES, IDEMPOTENCY_ROUTE_MAX, IDENTITY_PROVIDERS, IDENTITY_VALUE_PATTERNS, INBOX_CHANNELS, INGESTION_JOB_MAX_ATTEMPTS, INGESTION_JOB_STATES, INGESTION_MAX_CHUNKS, INGESTION_STEPS, INTERNAL_CALL_USER_ID, INVITATION_ROLES, INVITATION_STATES, Identity, InstanceAuditLog, LINE_ASSIGNMENT_KINDS, LINE_STATES, LOGGED_DENIAL_CODES, MAILBOX_KINDS, MAILBOX_PROVIDERS, MAILBOX_STATES, MAILBOX_STATE_REASONS, MAIL_EVENT_KINDS, MAX_AGENT_INSTRUCTION_LENGTH, MAX_ANGLE_LENGTH, MAX_API_KEY_NAME_LENGTH, MAX_ASSESSED_NUMBER, MAX_ATTEMPT_EPOCH, MAX_AUDIT_METADATA_BYTES, MAX_BANNED_PHRASES, MAX_BRIEF_STATEMENTS, MAX_BRIEF_STATEMENT_LENGTH, MAX_CALLER_LENGTH, MAX_CALL_DURATION_SECONDS, MAX_CHECK_COUNT, MAX_CITATION_DOCUMENT_PAGE, MAX_CITATION_URL_LENGTH, MAX_CONSENT_FORM_NAME_LENGTH, MAX_CONSENT_WORDING_LENGTH, MAX_CRM_CURSOR_LENGTH, MAX_CRM_EXTERNAL_ID_LENGTH, MAX_CRM_KEY_ID_LENGTH, MAX_CRM_LABEL_LENGTH, MAX_CRM_LOCAL_ID_LENGTH, MAX_CRM_RUN_COUNT, MAX_CRM_RUN_FAILURES, MAX_CRM_SEALED_TOKEN_BYTES, MAX_CRM_WRITE_KEY_LENGTH, MAX_DECISION_NOTE_LENGTH, MAX_DRAFT_BODY_LENGTH, MAX_DRAFT_CHECKS, MAX_DRAFT_CITATIONS, MAX_DRAFT_GOAL_LENGTH, MAX_DRAFT_REVISION, MAX_DRAFT_SUBJECT_LENGTH, MAX_DROPPED_COUNT, MAX_ESCALATION_RULES, MAX_EVIDENCE_COUNT, MAX_EVIDENCE_REF_LENGTH, MAX_EXCEPT_LABELS, MAX_EXPORT_PART_BYTES, MAX_EXPORT_PART_FILES, MAX_EXPORT_PREFIX_LENGTH, MAX_FIELD_HISTORY_ENTRIES, MAX_FINDING_EXPLANATION_LENGTH, MAX_FINDING_SPAN_OFFSET, MAX_FORM_TOKEN_LENGTH, MAX_HEALTH_COMPONENTS, MAX_HEALTH_COUNT, MAX_LINE_LABEL_LENGTH, MAX_MAILBOX_NAME_LENGTH, MAX_MAILBOX_TEAMS, MAX_MAIL_PROVIDER_MESSAGE_ID_LENGTH, MAX_MASKED_ADDRESS_LENGTH, MAX_MERGED_PROSPECTS, MAX_MERGE_SNAPSHOT_BYTES, MAX_MESSAGE_BODY_LENGTH, MAX_MIN_GAP_SECONDS, MAX_MODEL_NAME_LENGTH, MAX_PENDING_DRAFT_COUNT, MAX_PREFERRED_WORDS, MAX_PROSPECT_COMPANY_NAME_LENGTH, MAX_PROSPECT_COMPANY_TECHNOLOGIES, MAX_PROSPECT_COMPANY_TECHNOLOGY_LENGTH, MAX_PROSPECT_COMPANY_TEXT_LENGTH, MAX_PROSPECT_FIELD_VALUE_LENGTH, MAX_PROSPECT_IMPORT_BYTES, MAX_PROSPECT_IMPORT_ROWS, MAX_PROSPECT_NOTES_LENGTH, MAX_PROSPECT_TAGS, MAX_PROSPECT_TAG_LENGTH, MAX_PROSPECT_TECHNOLOGIES_VALUE_LENGTH, MAX_PROVIDER_EVENT_ID_LENGTH, MAX_PROVIDER_MESSAGE_ID_LENGTH, MAX_PROVIDER_REFERENCE_LENGTH, MAX_QUEUED_DEAL_IMPORTS, MAX_RECORDING_KEY_LENGTH, MAX_ROLLUP_COUNT, MAX_ROLLUP_GROUP_KEY_LENGTH, MAX_SEARCH_STATE_IDS, MAX_SENDS_PER_DAY, MAX_SENDS_PER_HOUR, MAX_SEQUENCE_STEP, MAX_SIGN_OFF_LENGTH, MAX_SOURCE_DEALS, MAX_SOURCE_KEY_LENGTH, MAX_SOURCE_REF_LENGTH, MAX_STEP_KEY_LENGTH, MAX_STRATEGY_LENGTH, MAX_SUBMISSION_IP_LENGTH, MAX_SUBMISSION_USER_AGENT_LENGTH, MAX_SUGGESTION_MOMENTS, MAX_SUGGESTION_TEXT_LENGTH, MAX_SUMMARY_LENGTH, MAX_SUPPRESSION_NOTE_LENGTH, MAX_SUPPRESSION_SOURCE_REF_LENGTH, MAX_TOKEN_CIPHERTEXT_BYTES, MAX_TONE_LENGTH, MAX_TOUCH_SOURCES, MAX_TWILIO_FINGERPRINT_LENGTH, MAX_TWILIO_PLACEMENT_KEY_LENGTH, MAX_TWILIO_PROVIDER_ID_LENGTH, MAX_TWILIO_RING_IDENTITIES, MAX_VOICE_IDEMPOTENCY_KEY_LENGTH, MAX_VOICE_LENGTH_CHARACTERS, MAX_VOICE_TERM_LENGTH, MAX_VOICE_VERSION, MAX_WON_DEAL_COUNT, MAX_WRAP_UP_NOTE_LENGTH, MEMBERSHIP_ROLES, MEMBER_NAME_MAX, MESSAGE_AUTHOR_KINDS, MESSAGE_DIRECTIONS, MIN_FORM_TOKEN_LENGTH, MIN_VOICE_LENGTH_CHARACTERS, NativeAppRow, NewAbandonCase, NewApiKey, NewAttemptCounter, NewAuditLog, NewBackupCode, NewCredential, NewDemoRequest, NewEnvironment, NewEnvironmentSettingsRow, NewEvent, NewFlowAttemptRow, NewHookCallCount, NewHookRow, NewIdentity, NewInstanceAuditLog, NewNativeAppRow, NewOAuthProviderRow, NewPasskey, NewPasskeyChallenge, NewPasswordHistoryEntry, NewProject, NewProposalRow, NewRefreshToken, NewSession, NewSigningKey, NewSmsCodeCount, NewUser, NewUserFactor, NewVerificationToken, NewWebhookDeliveryAttemptRow, NewWebhookDeliveryRow, NewWebhookEndpointRow, NewWorkspace, OAUTH_PROVIDERS, OAuthProviderConfig, OAuthProviderRow, ORGANIZATION_AGENT_KIND, ORGANIZATION_REGIONS, ORGANIZATION_STATUSES, ORPHAN_SWEEP_CURSOR_MAX_BYTES, ORPHAN_SWEEP_MAX_CLAIM_MS, ORPHAN_SWEEP_MIN_CLAIM_MS, OUTBOUND_LANGUAGES, OUTBOX_DEDUPE_KEY_MAX_LENGTH, OUTBOX_ERROR_CODE_MAX_LENGTH, OUTBOX_MAX_ATTEMPTS, OUTBOX_MAX_BATCH, OUTBOX_MAX_LEASE_MS, OUTBOX_MAX_RETRY_DELAY_MS, OUTBOX_MIN_LEASE_MS, OUTBOX_PAYLOAD_MAX_BYTES, OUTBOX_TOPIC_MAX_LENGTH, OutboxRow, PASSKEY_CHALLENGE_PURPOSES, PENDING_CLEANUP_PREDICATE, PROSPECT_COMPANY_FIELD_NAMES, PROSPECT_FIELD_NAMES, PROSPECT_IDENTITY_KINDS, PROSPECT_IMPORT_FAILURE_REASONS, PROSPECT_IMPORT_REJECT_REASONS, PROSPECT_IMPORT_ROW_RESULTS, PROSPECT_IMPORT_SKIP_REASONS, PROSPECT_IMPORT_STATES, PROSPECT_MERGE_STATES, PROSPECT_MERGE_UNDO_DAYS, PROSPECT_STATUSES, Passkey, PasskeyChallenge, PasswordHistoryEntry, Project, ProposalRow, REPLY_LABELS, RIGHTS_MAX_WORDING_VERSION, ROLLUP_GROUP_KINDS, ROLLUP_METRICS, RefreshToken, SEND_CHECKS, SEND_DEFERRING_REASONS, SEND_REFUSAL_REASONS, SEND_STATES, SESSION_CLIENTS, SESSION_REVOKE_REASONS, SESSION_TYPES, SIGNING_KEY_STATUSES, SMS_COUNT_RETENTION_FLOOR_DAYS, SOURCE_KINDS, SOURCE_KIND_PATTERN, SOURCE_OUTCOMES, SOURCE_PERFORMANCE_FLAGS, SUGGESTION_FINGERPRINT_BYTES, SUGGESTION_KINDS, SUGGESTION_STATUSES, SUPPRESSION_ADDRESS_KINDS, SUPPRESSION_REASONS, SUPPRESSION_REMOVABLE_REASONS, Session, SigningKey, SmsCodeCount, TOUCH_AGENT_KINDS, TOUCH_CHANNELS, TOUCH_KINDS, TWILIO_DIRECTORY_KINDS, USER_FACTOR_TYPES, User, UserFactor, VERIFICATION_PURPOSES, VOICE_CALL_DIRECTIONS, VOICE_CALL_ENDED_BY, VOICE_CALL_EVENT_KINDS, VOICE_CALL_FAILURE_REASONS, VOICE_CALL_FINAL_STATES, VOICE_CALL_STATES, VOICE_RECORDING_CHANNELS, VOICE_RECORDING_STATES, VOICE_TRANSCRIPT_STATES, VerificationToken, WEBHOOK_DELIVERY_RETENTION_FLOOR, WEBHOOK_DELIVERY_STATES, WEEKDAYS, WORK_KINDS, WebhookDeliveryAttemptRow, WebhookDeliveryRow, WebhookEndpointRow, Workspace, abandonCases, agentInstructionPointers, agentInstructionVersions, agentSettings, analyticsEvents, apiKeyUsage, apiKeys, approvalDecisions, approvalPolicies, assessmentFindings, assessments, attemptCounters, auditEvents, auditLogs, authSchema, backupCodes, callJobs, callReuploadRequeues, callVendorSends, calls, consentFormDirectory, consentForms, consentWordings, consumedMessage, contactCheckLog, contactConsentEvents, conversationSummaries, conversations, coreApiKeys, coreSchema, credentials, crmConnections, crmExternalRefs, crmMappings, crmSyncRuns, crmWebhookReceipts, dealImportRows, dealImports, deals, demoRateCounters, demoRequests, documents, draftSources, drafts, environmentSettings, environments, escalationRules2 as escalationRules, events, exportJobs, exportParts, flowAttempts, healthDaily, hookCallCounts, hooks, idempotencyKeys, identities, indexSettings, ingestionJobs, instanceAuditLogs, invitationDirectory, invitations, mailEvents, mailMessages, mailboxLimits, mailboxes, membershipDirectory, memberships, messages, nativeApps, oauthProviders, organizationState, organizationUsage, organizations, outboundBrandVoices, outboundBriefStatements, outboundBriefs, outboundDraftChecks, outboundDraftCitations, outboundDrafts, outboundModelUsage, outboundSchema, outbox, passkeyChallenges, passkeys, passwordHistory, playbookEmbedUsage, playbookIdempotencyKeys, playbookOrphanSweeps, playbookSchema, playbookWorkHints, projects, proposals, prospectCompanies, prospectCompanyFields, prospectFields, prospectIdentities, prospectImportRows, prospectImports, prospectMerges, prospects, refreshTokens, repChangeAllowed, rightsConfirmations, rollupDaily, sessions, signingKeys, smsCodeCounts, sourcePerformance, suggestions, suppressionEntries, teamMembers, teams, touches, userFactors, users, verificationTokens, voiceCallEvents, voiceCalls, voiceIdempotencyKeys, voiceLineDirectory, voiceLines, voiceRecordings, voiceSchema, voiceTwilioCalls, voiceTwilioDirectory, voiceTwilioPlacements, voiceTwilioRecordings, webhookDeliveries, webhookDeliveryAttempts, webhookEndpoints, workspaces };
