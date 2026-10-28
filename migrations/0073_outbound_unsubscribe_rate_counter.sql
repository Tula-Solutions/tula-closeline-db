CREATE TABLE "outbound"."unsubscribe_rate_counter" (
	"key_hash" "bytea" NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"hits" integer NOT NULL,
	CONSTRAINT "unsubscribe_rate_counter_pkey" PRIMARY KEY("key_hash","window_start"),
	CONSTRAINT "unsubscribe_rate_counter_key_hash_length" CHECK (octet_length("outbound"."unsubscribe_rate_counter"."key_hash") = 32),
	CONSTRAINT "unsubscribe_rate_counter_hits_positive" CHECK ("outbound"."unsubscribe_rate_counter"."hits" >= 1)
);
--> statement-breakpoint
CREATE INDEX "unsubscribe_rate_counters_window_start_idx" ON "outbound"."unsubscribe_rate_counter" USING btree ("window_start");
--> statement-breakpoint
-- The public unsubscribe route is asked before any Organization is known, so this counter holds
-- no organization_id and sits outside row-level security (ADR 0011). Default privileges give
-- closeline_outbound SELECT, INSERT, UPDATE and DELETE on every new outbound table; none is wanted
-- here. It is on the isolation allowlist, and the check fails if any service role holds a privilege.
REVOKE ALL ON "outbound"."unsubscribe_rate_counter" FROM closeline_outbound;
--> statement-breakpoint
-- The only way in: two SECURITY DEFINER functions with a pinned search_path and every name
-- schema-qualified, EXECUTE revoked from PUBLIC and granted to closeline_outbound alone.
-- hit_unsubscribe_rate_limit counts one request of a key (an HMAC-SHA256 made by outbound) in the
-- fixed window of p_window_seconds that contains now, and says whether the count is within p_limit.
-- One atomic upsert, so concurrent calls serialise on the row. A request over the limit still counts.
CREATE FUNCTION "outbound"."hit_unsubscribe_rate_limit"(
  p_key_hash bytea, p_window_seconds integer, p_limit integer)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_window_start timestamptz;
  v_hits integer;
BEGIN
  IF p_key_hash IS NULL OR pg_catalog.octet_length(p_key_hash) <> 32 THEN
    RAISE EXCEPTION 'hit_unsubscribe_rate_limit: the key hash must be 32 bytes' USING ERRCODE = '22023';
  END IF;
  IF p_window_seconds IS NULL OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'hit_unsubscribe_rate_limit: the window must be 1 to 86400 seconds' USING ERRCODE = '22023';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'hit_unsubscribe_rate_limit: the limit must be at least 1' USING ERRCODE = '22023';
  END IF;
  v_window_start := pg_catalog.to_timestamp(
    pg_catalog.floor(pg_catalog.date_part('epoch', pg_catalog.statement_timestamp()) / p_window_seconds)
    * p_window_seconds);
  INSERT INTO "outbound"."unsubscribe_rate_counter" AS c ("key_hash", "window_start", "hits")
  VALUES (p_key_hash, v_window_start, 1)
  ON CONFLICT ("key_hash", "window_start") DO UPDATE SET "hits" = least(c."hits", 2147483646) + 1
  RETURNING c."hits" INTO v_hits;
  RETURN v_hits <= p_limit;
END
$$;
--> statement-breakpoint
-- purge_unsubscribe_rate_counters removes up to p_limit (at most 1000) counters whose window started
-- more than a day ago, oldest first, and returns how many went.
CREATE FUNCTION "outbound"."purge_unsubscribe_rate_counters"(p_limit integer)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM "outbound"."unsubscribe_rate_counter" d
   WHERE (d."key_hash", d."window_start") IN (
           SELECT c."key_hash", c."window_start" FROM "outbound"."unsubscribe_rate_counter" c
            WHERE c."window_start" < pg_catalog.statement_timestamp() - interval '1 day'
            ORDER BY c."window_start", c."key_hash"
            LIMIT least(greatest(p_limit, 0), 1000)
              FOR UPDATE SKIP LOCKED);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "outbound"."hit_unsubscribe_rate_limit"(bytea, integer, integer), "outbound"."purge_unsubscribe_rate_counters"(integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "outbound"."hit_unsubscribe_rate_limit"(bytea, integer, integer), "outbound"."purge_unsubscribe_rate_counters"(integer) TO closeline_outbound;
