-- voice.orgs_with_due_recordings: the Organizations that hold a deleted Recording whose purge time
-- has passed, so the purge job (which runs for one Organization at a time) knows whom to visit.
-- Hand-written (Drizzle cannot express it); run as closeline_owner.
--
-- Same shape as voice.orgs_with_stale_ringing (0058): a definer owned by closeline_voice_purge_scan
-- (NOLOGIN, BYPASSRLS), which here gets SELECT on three columns of voice.recordings
-- (organization_id, state, purge_due_at) and nothing more. Ids only.
GRANT SELECT ("organization_id", "state", "purge_due_at") ON "voice"."recordings" TO closeline_voice_purge_scan;
--> statement-breakpoint
-- Up to p_limit distinct Organization ids, ascending, strictly after p_after (null starts from the
-- beginning), with a Recording in state 'deleted' and purge_due_at <= p_before. p_limit is cut to
-- 500; a null or smaller-than-one value, or a null p_before, gives no row. Page by passing the last
-- id back as p_after. Reads through recordings_purge_idx.
CREATE FUNCTION "voice"."orgs_with_due_recordings"(p_before timestamptz, p_after text, p_limit integer)
RETURNS TABLE ("organization_id" text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT DISTINCT r."organization_id"
    FROM "voice"."recordings" r
   WHERE r."state" = 'deleted' AND r."purge_due_at" IS NOT NULL
     AND r."purge_due_at" <= p_before
     AND (p_after IS NULL OR r."organization_id" > p_after)
   ORDER BY r."organization_id"
   LIMIT CASE WHEN p_limit >= 1 THEN least(p_limit, 500) ELSE 0 END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "voice"."orgs_with_due_recordings"(timestamptz, text, integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "voice"."orgs_with_due_recordings"(timestamptz, text, integer) TO closeline_voice;
--> statement-breakpoint
GRANT CREATE ON SCHEMA "voice" TO closeline_voice_purge_scan;
--> statement-breakpoint
ALTER FUNCTION "voice"."orgs_with_due_recordings"(timestamptz, text, integer) OWNER TO closeline_voice_purge_scan;
--> statement-breakpoint
REVOKE CREATE ON SCHEMA "voice" FROM closeline_voice_purge_scan;
