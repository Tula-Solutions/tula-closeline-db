CREATE TABLE "core"."demo_request" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"work_email" text NOT NULL,
	"company_name" text NOT NULL,
	"message" text,
	"source_page" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"notification_status" text DEFAULT 'pending' NOT NULL,
	"notification_attempts" integer DEFAULT 0 NOT NULL,
	"notification_last_attempt_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demo_request_idempotency_key_key" UNIQUE("idempotency_key"),
	CONSTRAINT "demo_request_id_shape" CHECK ("id" ~ '^dreq_[0-9a-f]{32}$'),
	CONSTRAINT "demo_request_name_shape" CHECK (char_length(btrim("core"."demo_request"."name")) between 1 and 200),
	CONSTRAINT "demo_request_work_email_shape" CHECK ("core"."demo_request"."work_email" = lower("core"."demo_request"."work_email" collate "C")
        and char_length("core"."demo_request"."work_email") between 3 and 320
        and char_length("core"."demo_request"."work_email") - char_length(replace("core"."demo_request"."work_email", '@', '')) = 1
        and position('@' in "core"."demo_request"."work_email") between 2 and char_length("core"."demo_request"."work_email") - 1
        and "core"."demo_request"."work_email" collate "C" !~ '[[:space:][:cntrl:]]'
        and "core"."demo_request"."work_email" collate "C" ~ '^[!-~]+$'),
	CONSTRAINT "demo_request_company_name_shape" CHECK (char_length(btrim("core"."demo_request"."company_name")) between 1 and 200),
	CONSTRAINT "demo_request_message_length" CHECK ("core"."demo_request"."message" is null or char_length("core"."demo_request"."message") <= 2000),
	CONSTRAINT "demo_request_source_page_shape" CHECK (char_length("core"."demo_request"."source_page") between 1 and 200
        and left("core"."demo_request"."source_page", 1) = '/'),
	CONSTRAINT "demo_request_idempotency_key_length" CHECK (char_length("core"."demo_request"."idempotency_key") between 16 and 128),
	CONSTRAINT "demo_request_notification_status_known" CHECK ("core"."demo_request"."notification_status" in ('pending', 'sent', 'failed')),
	CONSTRAINT "demo_request_notification_attempts_not_negative" CHECK ("core"."demo_request"."notification_attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX "demo_requests_submitted_at_idx" ON "core"."demo_request" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "demo_requests_notice_idx" ON "core"."demo_request" USING btree ("submitted_at","id") WHERE "core"."demo_request"."notification_status" = 'pending';--> statement-breakpoint
-- Closeline holds a Demo Request itself, not an Organization, so it has no organization_id and is
-- outside row-level security (ADR 0011). Default privileges give closeline_core SELECT, INSERT, UPDATE
-- and DELETE on every new core table; none is wanted here, or a tenant scope could read every
-- Visitor. The table is on the isolation allowlist, and the check fails if any service role holds
-- a privilege on it.
REVOKE ALL ON "core"."demo_request" FROM closeline_core;
--> statement-breakpoint

-- The only way in for closeline_core: four SECURITY DEFINER functions (they run as the owner, the
-- only role that holds privileges on the table), each with a pinned search_path and every name
-- schema-qualified, EXECUTE revoked from PUBLIC and granted to closeline_core alone.
--
-- submit_demo_request: store a Demo Request, or on a repeated idempotency key return the stored
-- row's id. `replayed` says the key was seen before; `same_fields` says the stored name, work email,
-- company name, message and source page equal the submitted ones, so a caller can tell a replay
-- from a reused key sent with a different body.
CREATE FUNCTION "core"."submit_demo_request"(
  p_id text, p_name text, p_work_email text, p_company_name text, p_message text,
  p_source_page text, p_idempotency_key text)
RETURNS TABLE ("demo_request_id" text, "replayed" boolean, "same_fields" boolean)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_id text;
BEGIN
  INSERT INTO "core"."demo_request" AS d
    ("id", "name", "work_email", "company_name", "message", "source_page", "idempotency_key")
  VALUES (p_id, p_name, p_work_email, p_company_name, p_message, p_source_page, p_idempotency_key)
  ON CONFLICT ("idempotency_key") DO NOTHING
  RETURNING d."id" INTO v_id;
  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT v_id, false, true;
    RETURN;
  END IF;
  RETURN QUERY
    SELECT d."id", true,
           (d."name" = p_name AND d."work_email" = p_work_email
            AND d."company_name" = p_company_name
            AND d."message" IS NOT DISTINCT FROM p_message
            AND d."source_page" = p_source_page)
      FROM "core"."demo_request" d
     WHERE d."idempotency_key" = p_idempotency_key;
END
$$;
--> statement-breakpoint
-- claim_demo_notices: take up to p_limit (at most 100) pending notices, oldest first, that have not
-- been tried in the last p_backoff_seconds. Each is counted as an attempt and stamped with the
-- time, in the same statement; FOR UPDATE SKIP LOCKED means two concurrent claims never return the
-- same row. A claim never reaches a row whose notice is settled.
CREATE FUNCTION "core"."claim_demo_notices"(p_limit integer, p_backoff_seconds integer)
RETURNS TABLE (
  "demo_request_id" text, "name" text, "work_email" text, "company_name" text, "message" text,
  "source_page" text, "submitted_at" timestamptz, "attempts" integer)
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  UPDATE "core"."demo_request" d
     SET "notification_attempts" = d."notification_attempts" + 1,
         "notification_last_attempt_at" = pg_catalog.statement_timestamp()
   WHERE d."id" IN (
           SELECT c."id" FROM "core"."demo_request" c
            WHERE c."notification_status" = 'pending'
              AND (c."notification_last_attempt_at" IS NULL
                   OR c."notification_last_attempt_at" <=
                      pg_catalog.statement_timestamp()
                      - pg_catalog.make_interval(secs => greatest(p_backoff_seconds, 0)))
            ORDER BY c."submitted_at", c."id"
            LIMIT least(greatest(p_limit, 0), 100)
              FOR UPDATE SKIP LOCKED)
  RETURNING d."id", d."name", d."work_email", d."company_name", d."message", d."source_page",
            d."submitted_at", d."notification_attempts"
$$;
--> statement-breakpoint
-- settle_demo_notice: mark a pending notice `sent` or `failed`. False when the row is unknown or
-- already settled, so settling twice changes nothing.
CREATE FUNCTION "core"."settle_demo_notice"(p_id text, p_status text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('sent', 'failed') THEN
    RAISE EXCEPTION 'settle_demo_notice: status must be sent or failed' USING ERRCODE = '22023';
  END IF;
  UPDATE "core"."demo_request"
     SET "notification_status" = p_status
   WHERE "id" = p_id AND "notification_status" = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count = 1;
END
$$;
--> statement-breakpoint
-- purge_demo_requests: delete up to p_limit (at most 1000) Demo Requests submitted more than twelve
-- months ago, oldest first, and return how many went. Repeat until it returns less than the limit.
CREATE FUNCTION "core"."purge_demo_requests"(p_limit integer)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM "core"."demo_request"
   WHERE "id" IN (
           SELECT c."id" FROM "core"."demo_request" c
            WHERE c."submitted_at" < pg_catalog.statement_timestamp() - interval '12 months'
            ORDER BY c."submitted_at", c."id"
            LIMIT least(greatest(p_limit, 0), 1000)
              FOR UPDATE SKIP LOCKED);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "core"."submit_demo_request"(text, text, text, text, text, text, text), "core"."claim_demo_notices"(integer, integer), "core"."settle_demo_notice"(text, text), "core"."purge_demo_requests"(integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."submit_demo_request"(text, text, text, text, text, text, text), "core"."claim_demo_notices"(integer, integer), "core"."settle_demo_notice"(text, text), "core"."purge_demo_requests"(integer) TO closeline_core;
