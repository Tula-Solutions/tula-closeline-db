-- voice.twilio_orgs_with_expired: the Organizations that hold expired rows in voice.twilio_calls or
-- voice.twilio_placements, so the purge (which runs for one Organization at a time) knows whom to
-- visit. Hand-written (Drizzle cannot express it); run as closeline_owner.
--
-- Why a definer. Row-level security shows closeline_voice only the rows of the Organization in
-- `app.organization_id`, so it cannot list the Organizations that have work. The function runs as
-- closeline_voice_purge_scan: NOLOGIN, BYPASSRLS, NOINHERIT, no member but closeline_owner (which
-- can SET ROLE to it, only so that ALTER FUNCTION ... OWNER TO below is allowed). The role is
-- created with the other closeline_* roles (docker/postgres/init.sql locally, the Region bootstrap
-- in tula-closeline-infra elsewhere), not here: a migration does not create roles.
--
-- What it can reach. USAGE on `voice` and SELECT on two columns (organization_id, expires_at) of
-- each of the two tables. It reads no other column or table, writes nothing, and the function
-- returns Organization ids only, never a row.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'closeline_voice_purge_scan') THEN
    RAISE EXCEPTION 'role closeline_voice_purge_scan does not exist: create it as NOLOGIN BYPASSRLS NOINHERIT and grant it to closeline_owner WITH SET TRUE, INHERIT FALSE before this migration (docker/postgres/init.sql locally, the Region bootstrap in tula-closeline-infra elsewhere)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles
     WHERE rolname = 'closeline_voice_purge_scan' AND NOT rolcanlogin AND rolbypassrls AND NOT rolsuper
  ) THEN
    RAISE EXCEPTION 'role closeline_voice_purge_scan must be NOLOGIN, NOSUPERUSER and BYPASSRLS';
  END IF;
  IF NOT pg_has_role(current_user, 'closeline_voice_purge_scan', 'SET') THEN
    RAISE EXCEPTION 'role % must be able to SET ROLE closeline_voice_purge_scan: GRANT closeline_voice_purge_scan TO % WITH SET TRUE, INHERIT FALSE', current_user, current_user;
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "voice" TO closeline_voice_purge_scan;
--> statement-breakpoint
GRANT SELECT ("organization_id", "expires_at") ON "voice"."twilio_calls" TO closeline_voice_purge_scan;
--> statement-breakpoint
GRANT SELECT ("organization_id", "expires_at") ON "voice"."twilio_placements" TO closeline_voice_purge_scan;
--> statement-breakpoint
-- Up to p_limit distinct Organization ids, ascending, strictly after p_after (null starts from the
-- beginning), that hold at least one row with expires_at <= p_now. p_limit is cut to 500; a null
-- or smaller-than-one value, or a null p_now, gives no row. Page by passing the last id back as
-- p_after. Each branch reads only the (organization_id, expires_at) purge index of its table
-- (twilio_calls_purge_idx, twilio_placements_purge_idx), with the expiry as an index condition:
-- an ordered index walk that stops at p_limit distinct Organizations, or a bitmap scan of the
-- expired entries, whichever the planner prices lower. It reads no column other than those two.
CREATE FUNCTION "voice"."twilio_orgs_with_expired"(p_now timestamptz, p_after text, p_limit integer)
RETURNS TABLE ("organization_id" text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT u."organization_id"
    FROM (
      (SELECT DISTINCT c."organization_id"
         FROM "voice"."twilio_calls" c
        WHERE c."expires_at" <= p_now
          AND (p_after IS NULL OR c."organization_id" > p_after)
        ORDER BY c."organization_id"
        LIMIT CASE WHEN p_limit >= 1 THEN least(p_limit, 500) ELSE 0 END)
      UNION
      (SELECT DISTINCT p."organization_id"
         FROM "voice"."twilio_placements" p
        WHERE p."expires_at" <= p_now
          AND (p_after IS NULL OR p."organization_id" > p_after)
        ORDER BY p."organization_id"
        LIMIT CASE WHEN p_limit >= 1 THEN least(p_limit, 500) ELSE 0 END)
    ) u
   ORDER BY u."organization_id"
   LIMIT CASE WHEN p_limit >= 1 THEN least(p_limit, 500) ELSE 0 END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "voice"."twilio_orgs_with_expired"(timestamptz, text, integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "voice"."twilio_orgs_with_expired"(timestamptz, text, integer) TO closeline_voice;
--> statement-breakpoint
GRANT CREATE ON SCHEMA "voice" TO closeline_voice_purge_scan;
--> statement-breakpoint
ALTER FUNCTION "voice"."twilio_orgs_with_expired"(timestamptz, text, integer) OWNER TO closeline_voice_purge_scan;
--> statement-breakpoint
REVOKE CREATE ON SCHEMA "voice" FROM closeline_voice_purge_scan;
