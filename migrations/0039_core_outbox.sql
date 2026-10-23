CREATE TABLE "core"."outbox" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"topic" text NOT NULL,
	"payload" jsonb NOT NULL,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"last_error_code" text,
	CONSTRAINT "outbox_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "outbox_id_shape" CHECK ("id" ~ '^obx_[0-9a-f]{32}$'),
	CONSTRAINT "outbox_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "outbox_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "outbox_topic_shape" CHECK (char_length("core"."outbox"."topic") between 1 and 120 and "core"."outbox"."topic" ~ '^[a-z][a-z0-9_.-]*$'),
	CONSTRAINT "outbox_payload_shape" CHECK (jsonb_typeof("core"."outbox"."payload") = 'object' and octet_length("core"."outbox"."payload"::text) <= 16384),
	CONSTRAINT "outbox_dedupe_key_length" CHECK (char_length("core"."outbox"."dedupe_key") between 1 and 200),
	CONSTRAINT "outbox_attempts_range" CHECK ("core"."outbox"."attempts" between 0 and 50),
	CONSTRAINT "outbox_last_error_code_shape" CHECK ("core"."outbox"."last_error_code" is null or (char_length("core"."outbox"."last_error_code") <= 64 and "core"."outbox"."last_error_code" ~ '^[a-z][a-z0-9_.]*$'))
);
--> statement-breakpoint
ALTER TABLE "core"."outbox" ADD CONSTRAINT "outbox_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_dedupe_key" ON "core"."outbox" USING btree ("organization_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "outbox_drain_idx" ON "core"."outbox" USING btree ("available_at","id") WHERE "core"."outbox"."published_at" is null and "core"."outbox"."attempts" < 50;--> statement-breakpoint
CREATE INDEX "outbox_published_idx" ON "core"."outbox" USING btree ("published_at") WHERE "core"."outbox"."published_at" is not null;
--> statement-breakpoint
-- A tenant table: forced row-level security and the one canonical policy.
ALTER TABLE "core"."outbox" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."outbox" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "outbox_tenant_isolation" ON "core"."outbox" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
-- The drain of the outbox, through a definer role, in the style of migrations 0033 and 0035.
--
-- Why. The drain worker publishes the rows of every Organization, in one ordered scan. Row-level
-- security shows `closeline_core` only the rows of the Organization in `app.organization_id`, so
-- it would have to find the Organizations with work first (a registry to keep, then one
-- transaction per Organization). Instead the three functions below run as
-- closeline_core_outbox_drain: NOLOGIN, BYPASSRLS, NOINHERIT, no member but closeline_owner (which
-- can SET ROLE to it, only so that ALTER FUNCTION ... OWNER TO below is allowed). The role is
-- created with the other closeline_* roles (docker/postgres/init.sql locally, the Region
-- bootstrap in tula-closeline-infra elsewhere), not here: a migration does not create roles.
--
-- What it can reach. The role holds USAGE on `core`, SELECT on seven columns of `outbox` and
-- UPDATE on four of them (attempts, available_at, published_at, last_error_code). It cannot
-- insert or delete, cannot change a payload or a key, and reads no other table. The service writes
-- a row in its own transaction, in an Organization's scope, with ordinary row-level security.
--
-- The claim is a lease, so no transaction stays open while the worker publishes: it takes due rows
-- `FOR UPDATE SKIP LOCKED` (two workers never take the same row, and neither waits for the other),
-- counts the attempt and pushes `available_at` out by the lease. A worker that dies leaves the row
-- to be claimed again when the lease ends. Publishing is therefore at-least-once.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'closeline_core_outbox_drain') THEN
    RAISE EXCEPTION 'role closeline_core_outbox_drain does not exist: create it as NOLOGIN BYPASSRLS NOINHERIT and grant it to closeline_owner WITH SET TRUE, INHERIT FALSE before this migration (docker/postgres/init.sql locally, the Region bootstrap in tula-closeline-infra elsewhere)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles
     WHERE rolname = 'closeline_core_outbox_drain' AND NOT rolcanlogin AND rolbypassrls AND NOT rolsuper
  ) THEN
    RAISE EXCEPTION 'role closeline_core_outbox_drain must be NOLOGIN, NOSUPERUSER and BYPASSRLS';
  END IF;
  IF NOT pg_has_role(current_user, 'closeline_core_outbox_drain', 'SET') THEN
    RAISE EXCEPTION 'role % must be able to SET ROLE closeline_core_outbox_drain: GRANT closeline_core_outbox_drain TO % WITH SET TRUE, INHERIT FALSE', current_user, current_user;
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "core" TO closeline_core_outbox_drain;
--> statement-breakpoint
GRANT SELECT ("organization_id", "id", "topic", "payload", "attempts", "available_at", "published_at") ON "core"."outbox" TO closeline_core_outbox_drain;
--> statement-breakpoint
GRANT UPDATE ("attempts", "available_at", "published_at", "last_error_code") ON "core"."outbox" TO closeline_core_outbox_drain;
--> statement-breakpoint
-- Claim up to p_limit due rows (1 to 100; a null or smaller value gives no row), oldest
-- `available_at` first, for p_lease_ms milliseconds (raised to 1 second, cut to 1 hour). A row is
-- due when it is unpublished, `available_at` has passed and it has been claimed fewer than 50
-- times; a row at 50 stays for an operator. Returns the rows with `attempts` as counted by this
-- claim. The order of the returned rows is not specified.
CREATE FUNCTION "core"."outbox_claim"(p_limit integer, p_lease_ms integer)
RETURNS TABLE ("organization_id" text, "id" text, "topic" text, "payload" jsonb, "attempts" smallint)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, core, pg_temp AS $$
DECLARE
  v_limit integer := least(greatest(coalesce(p_limit, 0), 0), 100);
  v_lease integer := least(greatest(coalesce(p_lease_ms, 1000), 1000), 3600000);
BEGIN
  IF v_limit < 1 THEN
    RETURN;
  END IF;
  RETURN QUERY
  WITH due AS (
    SELECT d."organization_id", d."id"
      FROM "core"."outbox" d
     WHERE d."published_at" IS NULL
       AND d."available_at" <= now()
       AND d."attempts" < 50
     ORDER BY d."available_at", d."id"
     LIMIT v_limit
       FOR UPDATE SKIP LOCKED
  )
  UPDATE "core"."outbox" AS o
     SET "attempts" = o."attempts" + 1,
         "available_at" = now() + make_interval(secs => v_lease / 1000.0)
    FROM due
   WHERE o."organization_id" = due."organization_id" AND o."id" = due."id"
  RETURNING o."organization_id", o."id", o."topic", o."payload", o."attempts";
END
$$;
--> statement-breakpoint
-- Mark rows published: the pairs (p_organization_ids[i], p_ids[i]), 1 to 100 of them. Returns how
-- many rows changed; a row already published, or one that does not exist, is skipped, so a repeat
-- is harmless. Clears the last error code. Arrays that are null, empty, over 100 or of different
-- lengths raise invalid_parameter_value.
CREATE FUNCTION "core"."outbox_complete"(p_organization_ids text[], p_ids text[])
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, core, pg_temp AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_organization_ids IS NULL OR p_ids IS NULL
     OR cardinality(p_ids) NOT BETWEEN 1 AND 100
     OR cardinality(p_organization_ids) <> cardinality(p_ids) THEN
    RAISE EXCEPTION 'outbox_complete: need 1 to 100 organization ids and as many ids' USING ERRCODE = '22023';
  END IF;
  UPDATE "core"."outbox" AS o
     SET "published_at" = now(), "last_error_code" = NULL
    FROM unnest(p_organization_ids, p_ids) AS k(organization_id, id)
   WHERE o."organization_id" = k.organization_id AND o."id" = k.id AND o."published_at" IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$$;
--> statement-breakpoint
-- Record a failed publish of one row: its error code (a short code, never the message) and the
-- next time it may be claimed, p_retry_after_ms from now (0 to 24 hours; null counts as 0). The
-- caller computes the backoff and its jitter. Returns false when the row is already published or
-- does not exist. A malformed id or error code raises invalid_parameter_value.
CREATE FUNCTION "core"."outbox_fail"(p_organization_id text, p_id text, p_error_code text, p_retry_after_ms integer)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, core, pg_temp AS $$
DECLARE
  v_delay integer := least(greatest(coalesce(p_retry_after_ms, 0), 0), 86400000);
BEGIN
  IF p_organization_id IS NULL OR p_organization_id !~ '^org_[0-9a-f]{32}$'
     OR p_id IS NULL OR p_id !~ '^obx_[0-9a-f]{32}$'
     OR p_error_code IS NULL OR char_length(p_error_code) > 64 OR p_error_code !~ '^[a-z][a-z0-9_.]*$' THEN
    RAISE EXCEPTION 'outbox_fail: malformed organization id, id or error code' USING ERRCODE = '22023';
  END IF;
  UPDATE "core"."outbox" AS o
     SET "last_error_code" = p_error_code,
         "available_at" = now() + make_interval(secs => v_delay / 1000.0)
   WHERE o."organization_id" = p_organization_id AND o."id" = p_id AND o."published_at" IS NULL;
  RETURN FOUND;
END
$$;
--> statement-breakpoint
-- Grants first, while closeline_owner owns the functions; the ownership change carries them over.
REVOKE ALL ON FUNCTION "core"."outbox_claim"(integer, integer) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "core"."outbox_complete"(text[], text[]) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "core"."outbox_fail"(text, text, text, integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."outbox_claim"(integer, integer) TO closeline_core;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."outbox_complete"(text[], text[]) TO closeline_core;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."outbox_fail"(text, text, text, integer) TO closeline_core;
--> statement-breakpoint
-- ALTER ... OWNER TO needs CREATE on the schema for the new owner; it is held for these statements only.
GRANT CREATE ON SCHEMA "core" TO closeline_core_outbox_drain;
--> statement-breakpoint
ALTER FUNCTION "core"."outbox_claim"(integer, integer) OWNER TO closeline_core_outbox_drain;
--> statement-breakpoint
ALTER FUNCTION "core"."outbox_complete"(text[], text[]) OWNER TO closeline_core_outbox_drain;
--> statement-breakpoint
ALTER FUNCTION "core"."outbox_fail"(text, text, text, integer) OWNER TO closeline_core_outbox_drain;
--> statement-breakpoint
REVOKE CREATE ON SCHEMA "core" FROM closeline_core_outbox_drain;
