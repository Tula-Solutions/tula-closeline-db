CREATE TABLE "core"."idempotency_keys" (
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"route" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" "bytea" NOT NULL,
	"status" smallint,
	"response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY("organization_id","user_id","route","key"),
	CONSTRAINT "idempotency_keys_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "idempotency_keys_user_id_shape" CHECK ("user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "idempotency_keys_route_shape" CHECK (char_length("core"."idempotency_keys"."route") between 1 and 64
        and "core"."idempotency_keys"."route" collate "C" ~ '^[a-z0-9._]+$'),
	CONSTRAINT "idempotency_keys_key_shape" CHECK (char_length("core"."idempotency_keys"."key") between 1 and 255
        and "core"."idempotency_keys"."key" collate "C" ~ '^[!-~]+$'),
	CONSTRAINT "idempotency_keys_request_hash_length" CHECK (octet_length("core"."idempotency_keys"."request_hash") = 32),
	CONSTRAINT "idempotency_keys_status_range" CHECK ("core"."idempotency_keys"."status" between 100 and 599),
	CONSTRAINT "idempotency_keys_response_matches_status" CHECK (("core"."idempotency_keys"."status" is null) = ("core"."idempotency_keys"."response" is null)),
	CONSTRAINT "idempotency_keys_response_size" CHECK (pg_column_size("core"."idempotency_keys"."response") <= 16384)
);
--> statement-breakpoint
ALTER TABLE "core"."idempotency_keys" ADD CONSTRAINT "idempotency_keys_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idempotency_keys_purge_idx" ON "core"."idempotency_keys" USING btree ("organization_id","created_at");
--> statement-breakpoint
-- Everything below is hand-written (Drizzle cannot express it), appended after the generated SQL
-- as 0002 does. Run as closeline_owner.

-- Row-level security: the one canonical fail-closed policy, written by tenantRlsStatements. The
-- table is a tenant table like the others, so the catalog check needs no allowlist entry.
ALTER TABLE "core"."idempotency_keys" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."idempotency_keys" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "idempotency_keys_tenant_isolation" ON "core"."idempotency_keys" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint

-- Privileges: none to write. The schema's default privileges give closeline_core SELECT, INSERT,
-- UPDATE and DELETE on every new core table (TRUNCATE is not among them), and closeline_auth and
-- closeline_playbook have no privilege on the core schema at all. The service completes a row with
-- UPDATE and the purge removes batches with DELETE, both inside the Organization's scope, so no
-- cross-tenant function is needed.

-- A row is completed once. While `status` is null the request is in flight and the row may be
-- completed (status and response set together, which a check requires); from then on no statement
-- is accepted, not even one that repeats the values. The Organization, user, route, key, request
-- hash and creation time of a row never change, in flight or not, so a key cannot be moved onto
-- another request and a stored answer cannot be replaced. The rule fires on the old row, so a
-- second completion that waited on the first one's lock finds the row completed, and a completion
-- written `WHERE ... AND status IS NULL` skips it instead of failing.
CREATE FUNCTION "core"."refuse_idempotency_rewrite"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'core.idempotency_final: an idempotency key is completed once, and its identity never changes'
    USING ERRCODE = 'check_violation', CONSTRAINT = 'idempotency_keys_final';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "idempotency_keys_final" BEFORE UPDATE ON "core"."idempotency_keys"
  FOR EACH ROW WHEN (
    OLD."status" IS NOT NULL
    OR ROW(OLD."organization_id", OLD."user_id", OLD."route", OLD."key", OLD."request_hash", OLD."created_at")
       IS DISTINCT FROM ROW(NEW."organization_id", NEW."user_id", NEW."route", NEW."key", NEW."request_hash", NEW."created_at"))
  EXECUTE FUNCTION "core"."refuse_idempotency_rewrite"();
--> statement-breakpoint
-- Only the trigger runs it: no role calls it directly.
REVOKE ALL ON FUNCTION "core"."refuse_idempotency_rewrite"() FROM PUBLIC;
