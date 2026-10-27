CREATE INDEX "calls_stale_ringing_idx" ON "voice"."calls" USING btree ("created_at","organization_id") WHERE "voice"."calls"."state" = 'ringing' and "voice"."calls"."direction" = 'inbound';
--> statement-breakpoint
-- voice.orgs_with_stale_ringing: the Organizations that hold an inbound Call still `ringing` since
-- before p_before, so the missed-Call sweep (which runs for one Organization at a time) knows whom
-- to visit. Hand-written (Drizzle cannot express it); run as closeline_owner.
--
-- Same shape as voice.twilio_orgs_with_expired (0042): a definer owned by the existing
-- closeline_voice_purge_scan role (NOLOGIN, BYPASSRLS), which here also gets SELECT on four columns
-- of voice.calls (organization_id, state, direction, created_at) and nothing more. Ids only.
GRANT SELECT ("organization_id", "state", "direction", "created_at") ON "voice"."calls" TO closeline_voice_purge_scan;
--> statement-breakpoint
-- Up to p_limit distinct Organization ids, ascending, strictly after p_after (null starts from the
-- beginning), with a Call in state 'ringing', direction 'inbound' and created_at < p_before. p_limit
-- is cut to 500; a null or smaller-than-one value, or a null p_before, gives no row. Page by passing
-- the last id back as p_after. Reads through calls_stale_ringing_idx.
CREATE FUNCTION "voice"."orgs_with_stale_ringing"(p_before timestamptz, p_after text, p_limit integer)
RETURNS TABLE ("organization_id" text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT DISTINCT c."organization_id"
    FROM "voice"."calls" c
   WHERE c."state" = 'ringing' AND c."direction" = 'inbound'
     AND c."created_at" < p_before
     AND (p_after IS NULL OR c."organization_id" > p_after)
   ORDER BY c."organization_id"
   LIMIT CASE WHEN p_limit >= 1 THEN least(p_limit, 500) ELSE 0 END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "voice"."orgs_with_stale_ringing"(timestamptz, text, integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "voice"."orgs_with_stale_ringing"(timestamptz, text, integer) TO closeline_voice;
--> statement-breakpoint
GRANT CREATE ON SCHEMA "voice" TO closeline_voice_purge_scan;
--> statement-breakpoint
ALTER FUNCTION "voice"."orgs_with_stale_ringing"(timestamptz, text, integer) OWNER TO closeline_voice_purge_scan;
--> statement-breakpoint
REVOKE CREATE ON SCHEMA "voice" FROM closeline_voice_purge_scan;
