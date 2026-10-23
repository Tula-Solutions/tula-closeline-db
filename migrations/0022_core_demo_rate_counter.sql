CREATE TABLE "core"."demo_rate_counter" (
	"address_hash" "bytea" NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"hits" integer NOT NULL,
	CONSTRAINT "demo_rate_counter_pkey" PRIMARY KEY("address_hash","window_start"),
	CONSTRAINT "demo_rate_counter_address_hash_length" CHECK (octet_length("core"."demo_rate_counter"."address_hash") = 32),
	CONSTRAINT "demo_rate_counter_hits_positive" CHECK ("core"."demo_rate_counter"."hits" >= 1)
);
--> statement-breakpoint
CREATE INDEX "demo_rate_counters_window_start_idx" ON "core"."demo_rate_counter" USING btree ("window_start");
--> statement-breakpoint
-- Closeline holds this counter itself, not an Organization, so it has no organization_id and is
-- outside row-level security (ADR 0011). Default privileges give closeline_core SELECT, INSERT,
-- UPDATE and DELETE on every new core table; none is wanted here. The table is on the isolation
-- allowlist, and the check fails if any service role holds a privilege on it.
REVOKE ALL ON "core"."demo_rate_counter" FROM closeline_core;
--> statement-breakpoint

-- The only way in for closeline_core: two SECURITY DEFINER functions (they run as the owner, the
-- only role that holds privileges on the table), each with a pinned search_path and every name
-- schema-qualified, EXECUTE revoked from PUBLIC and granted to closeline_core alone.
--
-- hit_demo_rate_limit: count one request of an address (an HMAC-SHA256 made by core) in the fixed
-- window of p_window_seconds that contains now, and say whether the count is within p_limit. One
-- atomic upsert, so concurrent calls serialise on the row and never let more than p_limit through.
-- A request over the limit still counts.
CREATE FUNCTION "core"."hit_demo_rate_limit"(
  p_address_hash bytea, p_window_seconds integer, p_limit integer)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_window_start timestamptz;
  v_hits integer;
BEGIN
  IF p_address_hash IS NULL OR pg_catalog.octet_length(p_address_hash) <> 32 THEN
    RAISE EXCEPTION 'hit_demo_rate_limit: the address hash must be 32 bytes' USING ERRCODE = '22023';
  END IF;
  IF p_window_seconds IS NULL OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'hit_demo_rate_limit: the window must be 1 to 86400 seconds' USING ERRCODE = '22023';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'hit_demo_rate_limit: the limit must be at least 1' USING ERRCODE = '22023';
  END IF;
  v_window_start := pg_catalog.to_timestamp(
    pg_catalog.floor(pg_catalog.date_part('epoch', pg_catalog.statement_timestamp()) / p_window_seconds)
    * p_window_seconds);
  INSERT INTO "core"."demo_rate_counter" AS c ("address_hash", "window_start", "hits")
  VALUES (p_address_hash, v_window_start, 1)
  ON CONFLICT ("address_hash", "window_start") DO UPDATE SET "hits" = c."hits" + 1
  RETURNING c."hits" INTO v_hits;
  RETURN v_hits <= p_limit;
END
$$;
--> statement-breakpoint
-- purge_demo_rate_counters: remove up to p_limit (at most 1000) counters whose window started more
-- than a day ago, oldest first, and return how many went. Every window is at most a day long, so
-- such a window has ended. Repeat until it returns less than the limit.
CREATE FUNCTION "core"."purge_demo_rate_counters"(p_limit integer)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM "core"."demo_rate_counter" d
   WHERE (d."address_hash", d."window_start") IN (
           SELECT c."address_hash", c."window_start" FROM "core"."demo_rate_counter" c
            WHERE c."window_start" < pg_catalog.statement_timestamp() - interval '1 day'
            ORDER BY c."window_start", c."address_hash"
            LIMIT least(greatest(p_limit, 0), 1000)
              FOR UPDATE SKIP LOCKED);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "core"."hit_demo_rate_limit"(bytea, integer, integer), "core"."purge_demo_rate_counters"(integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."hit_demo_rate_limit"(bytea, integer, integer), "core"."purge_demo_rate_counters"(integer) TO closeline_core;
