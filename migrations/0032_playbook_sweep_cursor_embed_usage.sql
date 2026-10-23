CREATE TABLE "playbook"."embed_usage" (
	"organization_id" text NOT NULL,
	"day" date NOT NULL,
	"moments" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "embed_usage_pkey" PRIMARY KEY("organization_id","day"),
	CONSTRAINT "embed_usage_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "embed_usage_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "embed_usage_moments_bounds" CHECK ("playbook"."embed_usage"."moments" between 0 and 1000000000)
);
--> statement-breakpoint
ALTER TABLE "playbook"."calls" ADD COLUMN "embedded_moments" integer;--> statement-breakpoint
ALTER TABLE "playbook"."calls" ADD COLUMN "skipped_moments" integer;--> statement-breakpoint
ALTER TABLE "playbook"."orphan_sweeps" ADD COLUMN "sweep_cursor" text;--> statement-breakpoint
ALTER TABLE "playbook"."orphan_sweeps" ADD COLUMN "sweep_claim_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "playbook"."calls" ADD CONSTRAINT "calls_moment_counts" CHECK (("playbook"."calls"."embedded_moments" is null) = ("playbook"."calls"."skipped_moments" is null)
        and ("playbook"."calls"."embedded_moments" is null or ("playbook"."calls"."embedded_moments" between 0 and 1000000
          and "playbook"."calls"."skipped_moments" between 0 and 1000000)));--> statement-breakpoint
ALTER TABLE "playbook"."orphan_sweeps" ADD CONSTRAINT "orphan_sweeps_cursor_bounds" CHECK ("playbook"."orphan_sweeps"."sweep_cursor" is null or octet_length("playbook"."orphan_sweeps"."sweep_cursor") between 1 and 1024);
--> statement-breakpoint

-- Everything below is hand-written (Drizzle cannot express it), appended after the generated SQL
-- as 0009 to 0018 do. Run as closeline_owner.
--
-- 0032 (hub issue 109): the orphan sweep's cursor and claim, the daily embed counter, and the Call
-- Moment counts. The columns and the table are above.

-- embed_usage is a tenant table: the canonical fail-closed policy. The schema's default privileges
-- give closeline_playbook SELECT, INSERT, UPDATE and DELETE on it; it writes its own counts.
ALTER TABLE "playbook"."embed_usage" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."embed_usage" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "embed_usage_tenant_isolation" ON "playbook"."embed_usage" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint

-- The service records a Call's Moment counts itself (CALL_MOMENTS_RECORD); the role's UPDATE on calls
-- is column by column (0016), so these two columns are added to it.
GRANT UPDATE ("embedded_moments", "skipped_moments") ON "playbook"."calls" TO closeline_playbook;
--> statement-breakpoint

-- Claim an Organization's orphan sweep for p_claim_ms (raised to 1 second, cut to 1 hour): returns
-- claimed true with the swept-through time, the saved cursor (null when the last sweep
-- completed) and claim_token, the exact claim deadline it set: a fencing token that
-- orphan_sweep_page_done requires, so a holder whose claim expired and was taken over cannot touch
-- the new holder's claim or cursor. Or claimed false, with nulls, while another instance holds a claim whose deadline has
-- not passed. The row is taken FOR UPDATE SKIP LOCKED, so a claimant never waits for another and two
-- concurrent claims have one winner. It must run in the Organization's scope, like orphan_sweep_done.
-- A row is created if there is none (swept_through -infinity, as erasure does to lock it); the
-- completed sweep's orphan_sweep_done removes it again when the Organization has nothing left. It
-- takes the row and nothing else, so it fits the lock order of orphan_sweep_done (row, then hint)
-- and of erasure (row first).
CREATE FUNCTION "playbook"."orphan_sweep_claim"(p_organization_id text, p_claim_ms integer)
  RETURNS TABLE ("claimed" boolean, "swept_through" timestamptz, "sweep_cursor" text, "claim_token" timestamptz) LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = pg_catalog, pg_temp AS $$
#variable_conflict use_column
DECLARE
  v_swept timestamptz;
  v_cursor text;
  v_token timestamptz;
  v_found boolean;
BEGIN
  IF p_organization_id IS NULL OR p_organization_id !~ '^org_[0-9a-f]{32}$'
     OR p_organization_id = 'org_00000000000000000000000000000000' THEN
    RAISE EXCEPTION 'playbook.orphan_sweep_organization: not an Organization id' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF current_setting('app.organization_id', true) IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'playbook.orphan_sweep_scope: the transaction is not scoped to this Organization' USING ERRCODE = 'insufficient_privilege';
  END IF;
  -- Insert only when there is no row: an INSERT ... ON CONFLICT would wait for the holder's open
  -- transaction on a row it has locked, and a claimant must not wait. (Two claims racing to create
  -- the very first row still queue behind the creator for its short transaction.)
  IF NOT EXISTS (SELECT 1 FROM "playbook"."orphan_sweeps" e WHERE e."organization_id" = p_organization_id) THEN
    INSERT INTO "playbook"."orphan_sweeps" AS s ("organization_id", "swept_through")
      VALUES (p_organization_id, '-infinity')
      ON CONFLICT ("organization_id") DO NOTHING;
  END IF;
  UPDATE "playbook"."orphan_sweeps" s
    SET "sweep_claim_until" = clock_timestamp() + make_interval(secs => least(greatest(coalesce(p_claim_ms, 0), 1000), 3600000) / 1000.0)
    WHERE s."organization_id" = p_organization_id
      AND s."organization_id" = (
        SELECT l."organization_id" FROM "playbook"."orphan_sweeps" l
          WHERE l."organization_id" = p_organization_id
            AND (l."sweep_claim_until" IS NULL OR l."sweep_claim_until" <= clock_timestamp())
          FOR UPDATE SKIP LOCKED)
    RETURNING s."swept_through", s."sweep_cursor", s."sweep_claim_until" INTO v_swept, v_cursor, v_token;
  v_found := FOUND;
  IF v_found THEN
    RETURN QUERY SELECT true, v_swept, v_cursor, v_token;
  ELSE
    RETURN QUERY SELECT false, NULL::timestamptz, NULL::text, NULL::timestamptz;
  END IF;
END
$$;
--> statement-breakpoint

-- Finish one visit of an Organization's orphan sweep and release its claim, but only for the holder:
-- p_token must equal the sweep_claim_until that orphan_sweep_claim returned and must still be in the
-- future. Otherwise (expired, taken over, released, never claimed) nothing is changed and the one
-- row returned has held false and nulls. A late caller can therefore neither release another
-- instance's claim nor overwrite its cursor. p_cursor is the last object key listed when the
-- listing was cut short: it is saved, swept_through is left alone and the work hint stays (the
-- attempts it stands for are still unswept), and `more` is true. With a null p_cursor the listing
-- completed: the cursor is cleared and orphan_sweep_done runs, which advances swept_through to
-- p_through (cut to 25 hours before now, never back) and decides the hint and `more`. A cursor is 1
-- to 1024 bytes (the table refuses any other). Scope as orphan_sweep_done.
-- Lock order: the orphan_sweeps row, then (completed) the hint, as orphan_sweep_done does.
CREATE FUNCTION "playbook"."orphan_sweep_page_done"(p_organization_id text, p_through timestamptz, p_cursor text, p_token timestamptz)
  RETURNS TABLE ("held" boolean, "swept_through" timestamptz, "more" boolean, "sweep_cursor" text) LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = pg_catalog, pg_temp AS $$
#variable_conflict use_column
DECLARE
  v_swept timestamptz;
BEGIN
  IF p_organization_id IS NULL OR p_organization_id !~ '^org_[0-9a-f]{32}$'
     OR p_organization_id = 'org_00000000000000000000000000000000' THEN
    RAISE EXCEPTION 'playbook.orphan_sweep_organization: not an Organization id' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF current_setting('app.organization_id', true) IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'playbook.orphan_sweep_scope: the transaction is not scoped to this Organization' USING ERRCODE = 'insufficient_privilege';
  END IF;
  UPDATE "playbook"."orphan_sweeps" s
    SET "sweep_cursor" = p_cursor, "sweep_claim_until" = NULL
    WHERE s."organization_id" = p_organization_id
      AND p_token IS NOT NULL AND s."sweep_claim_until" = p_token AND p_token > clock_timestamp()
    RETURNING s."swept_through" INTO v_swept;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::timestamptz, NULL::boolean, NULL::text;
    RETURN;
  END IF;
  IF p_cursor IS NULL THEN
    RETURN QUERY SELECT true, d."swept_through", d."more", NULL::text
      FROM "playbook"."orphan_sweep_done"(p_organization_id, p_through) d;
    RETURN;
  END IF;
  RETURN QUERY SELECT true, v_swept, true, p_cursor;
END
$$;
--> statement-breakpoint

-- Erasure also removes the Organization's embed counts (the replaced function is 0016's with that
-- one line added after the usage counts).
CREATE OR REPLACE FUNCTION "playbook"."remove_organization_rest"(p_organization_id text, p_keep_route text) RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF p_organization_id IS NULL OR p_organization_id !~ '^org_[0-9a-f]{32}$'
     OR p_organization_id = 'org_00000000000000000000000000000000' THEN
    RAISE EXCEPTION 'playbook.remove_rest_organization: not an Organization id' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF current_setting('app.organization_id', true) IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'playbook.remove_rest_scope: the transaction is not scoped to this Organization' USING ERRCODE = 'insufficient_privilege';
  END IF;
  -- The orphan_sweeps row is locked FIRST, before the upload lock. orphan_sweep_done takes that row
  -- and then the hint (waiting for every open upload attempt, which holds the hint); an upload
  -- attempt holds the hint and may then wait for the upload lock; so taking the upload lock before
  -- the row would let this function wait on a done that waits on an upload that waits on this
  -- function. With the row first, nothing that holds the row ever waits for the upload lock. This
  -- holds only while every upload transaction inserts its idempotency key BEFORE it takes the
  -- upload lock (the key insert takes the hint, then the lock): that order is a requirement.
  INSERT INTO "playbook"."orphan_sweeps" AS s ("organization_id", "swept_through")
    VALUES (p_organization_id, '-infinity')
    ON CONFLICT ("organization_id") DO UPDATE SET "swept_through" = s."swept_through";
  PERFORM pg_advisory_xact_lock(hashtextextended(p_organization_id, 0));
  -- Calls, Deals, imports and their rows are removed in bounded batches first (erase_deals, the import
  -- erase and purge statements); this function refuses while any is left, so it never does work
  -- proportional to the Organization's size.
  IF EXISTS (SELECT 1 FROM "playbook"."documents" d WHERE d."organization_id" = p_organization_id)
     OR EXISTS (SELECT 1 FROM "playbook"."deal_imports" i WHERE i."organization_id" = p_organization_id)
     OR EXISTS (SELECT 1 FROM "playbook"."deals" e WHERE e."organization_id" = p_organization_id)
     OR EXISTS (SELECT 1 FROM "playbook"."calls" k WHERE k."organization_id" = p_organization_id) THEN
    -- Nothing is erased: drop the row again if it only exists for this lock.
    DELETE FROM "playbook"."orphan_sweeps" s
      WHERE s."organization_id" = p_organization_id AND s."swept_through" = '-infinity' AND s."erased_attempt_at" IS NULL;
    RETURN false;
  END IF;
  DELETE FROM "playbook"."index_settings" s WHERE s."organization_id" = p_organization_id;
  DELETE FROM "playbook"."consumed_message" c WHERE c."organization_id" = p_organization_id;
  -- Every idempotency key goes (the kept route's aside): each holds a user id, the client's key, a
  -- request hash and a stored response. The only thing the keys are still needed for is the time of
  -- the latest upload attempt, because an object it stored may still await the orphan sweep; that
  -- one time is recorded in the row locked above (written only here and by nobody else, so an
  -- upload attempt never waits for it), and the discovery function and orphan_sweep_done count it
  -- as a pending attempt until swept_through covers it.
  -- One statement, so one snapshot decides both: a key that committed between a separate read and
  -- delete would be deleted without being recorded. The data-modifying CTE runs to completion
  -- whether or not the UPDATE matches a row.
  WITH del AS (
    DELETE FROM "playbook"."idempotency_keys" k
      WHERE k."organization_id" = p_organization_id AND k."route" IS DISTINCT FROM p_keep_route
      RETURNING k."created_at")
  UPDATE "playbook"."orphan_sweeps" s
    SET "erased_attempt_at" = greatest(s."erased_attempt_at", (SELECT max(del."created_at") FROM del))
    WHERE s."organization_id" = p_organization_id AND (SELECT max(del."created_at") FROM del) > s."swept_through";
  DELETE FROM "playbook"."rights_confirmations" r WHERE r."organization_id" = p_organization_id;
  DELETE FROM "playbook"."organization_usage" u WHERE u."organization_id" = p_organization_id;
  DELETE FROM "playbook"."embed_usage" e WHERE e."organization_id" = p_organization_id;
  DELETE FROM "playbook"."work_hints" w
    WHERE w."organization_id" = p_organization_id AND w."kind" NOT IN ('idempotency_purge', 'orphan_sweep');
  DELETE FROM "playbook"."orphan_sweeps" s
    WHERE s."organization_id" = p_organization_id AND s."swept_through" = '-infinity' AND s."erased_attempt_at" IS NULL;
  RETURN true;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "playbook"."orphan_sweep_claim"(text, integer), "playbook"."orphan_sweep_page_done"(text, timestamptz, text, timestamptz) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "playbook"."orphan_sweep_claim"(text, integer), "playbook"."orphan_sweep_page_done"(text, timestamptz, text, timestamptz) TO closeline_playbook;
