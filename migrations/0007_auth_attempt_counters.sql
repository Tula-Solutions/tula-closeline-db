CREATE TABLE "auth"."attempt_counters" (
	"environment_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"key_hash" "bytea" NOT NULL,
	"hits" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"locked_until" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "attempt_counters_pkey" PRIMARY KEY("environment_id","kind","key_hash"),
	CONSTRAINT "attempt_counters_kind_known" CHECK ("auth"."attempt_counters"."kind" in ('lockout', 'rate_limit')),
	CONSTRAINT "attempt_counters_key_hash_length" CHECK (octet_length("auth"."attempt_counters"."key_hash") = 32),
	CONSTRAINT "attempt_counters_hits_bounds" CHECK ("auth"."attempt_counters"."hits" between 1 and 1000000),
	CONSTRAINT "attempt_counters_window_order" CHECK ("auth"."attempt_counters"."expires_at" > "auth"."attempt_counters"."started_at"),
	CONSTRAINT "attempt_counters_lock_whole" CHECK (("auth"."attempt_counters"."kind" = 'lockout') = ("auth"."attempt_counters"."locked_until" is not null)),
	CONSTRAINT "attempt_counters_lock_within_window" CHECK ("auth"."attempt_counters"."locked_until" is null or ("auth"."attempt_counters"."locked_until" >= "auth"."attempt_counters"."started_at" and "auth"."attempt_counters"."locked_until" <= "auth"."attempt_counters"."expires_at"))
);
--> statement-breakpoint
ALTER TABLE "auth"."attempt_counters" ADD CONSTRAINT "attempt_counters_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempt_counters_purge_idx" ON "auth"."attempt_counters" USING btree ("expires_at");
--> statement-breakpoint
-- Everything below is hand-written (Drizzle cannot express it), appended after the generated SQL
-- as 0001 and 0004 do. Run as closeline_owner.

-- No row-level security, on purpose (ADR 0014): a sign-in is counted before any account or
-- Organization is known, and the table is keyed by a keyed hash, so a row names no address and no
-- IP address. It is a control-plane table of auth in src/isolation.ts, held down by these grants.
-- The schema's default privileges for closeline_auth are revoked (0001), so it grants nothing until
-- here. The service counts with INSERT ... ON CONFLICT DO UPDATE (SELECT for RETURNING and for the
-- columns the update reads), clears a lockout with DELETE after a right password, and the purge
-- deletes expired rows in batches. UPDATE is the four counter columns; the environment, kind and
-- key hash of a row never change.
GRANT SELECT, INSERT, DELETE ON "auth"."attempt_counters" TO closeline_auth;
--> statement-breakpoint
GRANT UPDATE ("hits", "started_at", "locked_until", "expires_at") ON "auth"."attempt_counters" TO closeline_auth;
