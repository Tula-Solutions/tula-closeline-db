ALTER TABLE "voice"."agent_calls" ADD COLUMN "goal" text;--> statement-breakpoint
ALTER TABLE "voice"."agent_calls" ADD COLUMN "organization_name" text;--> statement-breakpoint
CREATE INDEX "agent_calls_due_idx" ON "voice"."agent_calls" USING btree ("retry_at","organization_id") WHERE "voice"."agent_calls"."state" = 'queued';--> statement-breakpoint
ALTER TABLE "voice"."agent_calls" ADD CONSTRAINT "agent_calls_goal_length" CHECK ("voice"."agent_calls"."goal" is null or char_length("voice"."agent_calls"."goal") between 1 and 500);--> statement-breakpoint
ALTER TABLE "voice"."agent_calls" ADD CONSTRAINT "agent_calls_organization_name_length" CHECK ("voice"."agent_calls"."organization_name" is null or char_length("voice"."agent_calls"."organization_name") between 1 and 200);
--> statement-breakpoint
-- voice.orgs_with_due_agent_calls: the Organizations that hold a `queued` Agent Call whose retry_at
-- is at or before p_now, so the dial scheduler (which runs for one Organization at a time) knows
-- whom to visit. Hand-written (Drizzle cannot express it); run as closeline_owner.
--
-- Same shape as voice.orgs_with_stale_outbound (0071): a definer owned by closeline_voice_purge_scan.
-- Up to p_limit distinct Organization ids, ascending, strictly after p_after (null starts from the
-- beginning); p_limit is cut to 500; a null or smaller-than-one value, or a null p_now, gives no row.
-- Reads through agent_calls_due_idx.
CREATE FUNCTION "voice"."orgs_with_due_agent_calls"(p_now timestamptz, p_after text, p_limit integer)
RETURNS TABLE ("organization_id" text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT DISTINCT a."organization_id"
    FROM "voice"."agent_calls" a
   WHERE a."state" = 'queued' AND a."retry_at" <= p_now
     AND (p_after IS NULL OR a."organization_id" > p_after)
   ORDER BY a."organization_id"
   LIMIT CASE WHEN p_limit >= 1 THEN least(p_limit, 500) ELSE 0 END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "voice"."orgs_with_due_agent_calls"(timestamptz, text, integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "voice"."orgs_with_due_agent_calls"(timestamptz, text, integer) TO closeline_voice;
--> statement-breakpoint
GRANT SELECT ("organization_id", "state", "retry_at") ON "voice"."agent_calls" TO closeline_voice_purge_scan;
--> statement-breakpoint
GRANT CREATE ON SCHEMA "voice" TO closeline_voice_purge_scan;
--> statement-breakpoint
ALTER FUNCTION "voice"."orgs_with_due_agent_calls"(timestamptz, text, integer) OWNER TO closeline_voice_purge_scan;
--> statement-breakpoint
REVOKE CREATE ON SCHEMA "voice" FROM closeline_voice_purge_scan;
