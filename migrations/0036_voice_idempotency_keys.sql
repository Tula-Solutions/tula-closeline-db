CREATE TABLE "voice"."idempotency_keys" (
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
	CONSTRAINT "idempotency_keys_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "idempotency_keys_user_id_shape" CHECK ("user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "idempotency_keys_route_shape" CHECK (char_length("voice"."idempotency_keys"."route") between 1 and 64
        and "voice"."idempotency_keys"."route" collate "C" ~ '^[a-z0-9._]+$'),
	CONSTRAINT "idempotency_keys_key_shape" CHECK (char_length("voice"."idempotency_keys"."key") between 1 and 255
        and "voice"."idempotency_keys"."key" collate "C" ~ '^[!-~]+$'),
	CONSTRAINT "idempotency_keys_request_hash_length" CHECK (octet_length("voice"."idempotency_keys"."request_hash") = 32),
	CONSTRAINT "idempotency_keys_status_range" CHECK ("voice"."idempotency_keys"."status" between 100 and 599),
	CONSTRAINT "idempotency_keys_response_matches_status" CHECK (("voice"."idempotency_keys"."status" is null) = ("voice"."idempotency_keys"."response" is null)),
	CONSTRAINT "idempotency_keys_response_size" CHECK (octet_length("voice"."idempotency_keys"."response"::text) <= 16384)
);
--> statement-breakpoint
CREATE INDEX "idempotency_keys_purge_idx" ON "voice"."idempotency_keys" USING btree ("organization_id","created_at");
--> statement-breakpoint
-- Everything below is hand-written (Drizzle cannot express it), appended after the generated SQL
-- as 0011 does. Run as closeline_owner.

-- Row-level security: the one canonical fail-closed policy on every table, written by
-- tenantRlsStatements. Each is a tenant table (every row belongs to one Organization), so the
-- catalog check needs no allowlist entry.
ALTER TABLE "voice"."idempotency_keys" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."idempotency_keys" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "idempotency_keys_tenant_isolation" ON "voice"."idempotency_keys" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint

-- Privileges: none to take away. The schema defaults give closeline_voice SELECT, INSERT,
-- UPDATE and DELETE (no TRUNCATE): voice completes a row with UPDATE and the purge removes
-- batches with DELETE, both inside the Organization's scope.

-- A row is completed once, as in core.idempotency_keys and playbook.idempotency_keys. While `status` is null the request is in
-- flight and the row may be completed (status and response set together, which a check requires);
-- from then on no statement is accepted, not even one that repeats the values. The Organization,
-- user, route, key, request hash and creation time never change, in flight or not. The rule fires
-- on the old row, so a second completion that waited on the first one's lock finds the row
-- completed, and a completion written `WHERE ... AND status IS NULL` skips it instead of failing.
CREATE FUNCTION "voice"."refuse_idempotency_rewrite"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'voice.idempotency_final: an idempotency key is completed once, and its identity never changes'
    USING ERRCODE = 'check_violation', CONSTRAINT = 'idempotency_keys_final';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "idempotency_keys_final" BEFORE UPDATE ON "voice"."idempotency_keys"
  FOR EACH ROW WHEN (
    OLD."status" IS NOT NULL
    OR ROW(OLD."organization_id", OLD."user_id", OLD."route", OLD."key", OLD."request_hash", OLD."created_at")
       IS DISTINCT FROM ROW(NEW."organization_id", NEW."user_id", NEW."route", NEW."key", NEW."request_hash", NEW."created_at"))
  EXECUTE FUNCTION "voice"."refuse_idempotency_rewrite"();
--> statement-breakpoint
-- Only the trigger runs it: no role calls it directly.
REVOKE ALL ON FUNCTION "voice"."refuse_idempotency_rewrite"() FROM PUBLIC;
