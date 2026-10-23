-- Prospect search through a definer role, so the trigram indexes of migration 0029 are used.
--
-- Why. The core role is bound by row-level security. `ilike` (texticlike) is not leakproof, and
-- PostgreSQL will not hand an index a clause that is not leakproof while a policy guards the
-- table, so core's `ilike '%text%'` filter was a sequential scan whatever the indexes. A role that
-- bypasses row-level security has no such limit. Giving core that role would drop the isolation
-- the policies provide, so the search runs in two SECURITY DEFINER functions owned by
-- closeline_core_search instead: NOLOGIN, BYPASSRLS, NOINHERIT, no member but closeline_owner (which
-- can SET ROLE to it, only so that ALTER FUNCTION ... OWNER TO below is allowed). The role is
-- created with the other closeline_* roles (docker/postgres/init.sql locally, the Region bootstrap
-- in tula-closeline-infra elsewhere), not here: a migration does not create roles.
--
-- Isolation. A BYPASSRLS function sees every Organization, so it never trusts a caller for the
-- Organization. It reads it from the setting `app.organization_id` that withOrganization sets for
-- the transaction (the same one the tenant policy reads), and every branch filters
-- `organization_id = <that>` itself. With the setting unset or empty it returns no row and raises
-- nothing, so it fails closed. The pattern is built from a bound `q` with `\`, `%` and `_`
-- escaped, never concatenated into SQL. The role can read only the columns the search needs.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'closeline_core_search') THEN
    RAISE EXCEPTION 'role closeline_core_search does not exist: create it as NOLOGIN BYPASSRLS NOINHERIT and grant it to closeline_owner WITH SET TRUE, INHERIT FALSE before this migration (docker/postgres/init.sql locally, the Region bootstrap in tula-closeline-infra elsewhere)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles
     WHERE rolname = 'closeline_core_search' AND NOT rolcanlogin AND rolbypassrls AND NOT rolsuper
  ) THEN
    RAISE EXCEPTION 'role closeline_core_search must be NOLOGIN, NOSUPERUSER and BYPASSRLS';
  END IF;
  IF NOT pg_has_role(current_user, 'closeline_core_search', 'SET') THEN
    RAISE EXCEPTION 'role % must be able to SET ROLE closeline_core_search: GRANT closeline_core_search TO % WITH SET TRUE, INHERIT FALSE', current_user, current_user;
  END IF;
END
$$;
--> statement-breakpoint
-- The search role reads these columns and nothing else, in no other schema.
GRANT USAGE ON SCHEMA "core" TO closeline_core_search;
--> statement-breakpoint
GRANT SELECT ("organization_id", "prospect_id", "state", "value") ON "core"."prospect_fields" TO closeline_core_search;
--> statement-breakpoint
GRANT SELECT ("id", "organization_id", "name", "domain") ON "core"."prospect_companies" TO closeline_core_search;
--> statement-breakpoint
GRANT SELECT ("id", "organization_id", "company_id") ON "core"."prospects" TO closeline_core_search;
--> statement-breakpoint
-- The Prospects whose current field value, or whose Company's name or domain, contains `q`
-- (case-insensitive), as distinct ids in id order after the cursor `after`; at most
-- least(max_rows, 101). A null or empty `q`, or a max_rows below 1, gives no row.
-- plan_cache_mode = force_custom_plan plans each call for its own pattern: a generic plan cannot
-- know how rare the term is and may choose a sequential scan.
CREATE FUNCTION "core"."search_prospect_ids"(q text, "after" text, max_rows integer)
RETURNS TABLE ("id" text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, core, public, pg_temp
SET plan_cache_mode = force_custom_plan AS $$
DECLARE
  v_org text := NULLIF(current_setting('app.organization_id', true), '');
  v_limit integer := least(coalesce(max_rows, 0), 101);
  v_pattern text;
  v_after text := coalesce("after", '');
BEGIN
  IF v_org IS NULL OR v_limit < 1 OR q IS NULL OR q = '' THEN
    RETURN;
  END IF;
  v_pattern := '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  RETURN QUERY
  SELECT u.pid
    FROM (
      SELECT f."prospect_id" AS pid
        FROM "core"."prospect_fields" f
       WHERE f."organization_id" = v_org
         AND f."state" = 'current'
         AND f."value" ILIKE v_pattern
         AND f."prospect_id" > v_after
      UNION
      SELECT p."id" AS pid
        FROM "core"."prospects" p
       WHERE p."organization_id" = v_org
         AND p."id" > v_after
         AND p."company_id" IN (
           SELECT c."id"
             FROM "core"."prospect_companies" c
            WHERE c."organization_id" = v_org
              AND (c."name" ILIKE v_pattern OR c."domain" ILIKE v_pattern))
    ) u
   ORDER BY u.pid
   LIMIT v_limit;
END
$$;
--> statement-breakpoint
-- The Prospect Companies whose name or domain contains `q`; the same rules as above.
CREATE FUNCTION "core"."search_prospect_company_ids"(q text, "after" text, max_rows integer)
RETURNS TABLE ("id" text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, core, public, pg_temp
SET plan_cache_mode = force_custom_plan AS $$
DECLARE
  v_org text := NULLIF(current_setting('app.organization_id', true), '');
  v_limit integer := least(coalesce(max_rows, 0), 101);
  v_pattern text;
  v_after text := coalesce("after", '');
BEGIN
  IF v_org IS NULL OR v_limit < 1 OR q IS NULL OR q = '' THEN
    RETURN;
  END IF;
  v_pattern := '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  RETURN QUERY
  SELECT c."id"
    FROM "core"."prospect_companies" c
   WHERE c."organization_id" = v_org
     AND c."id" > v_after
     AND (c."name" ILIKE v_pattern OR c."domain" ILIKE v_pattern)
   ORDER BY c."id"
   LIMIT v_limit;
END
$$;
--> statement-breakpoint
-- Grants first, while closeline_owner owns the functions; the ownership change carries them over.
REVOKE ALL ON FUNCTION "core"."search_prospect_ids"(text, text, integer), "core"."search_prospect_company_ids"(text, text, integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."search_prospect_ids"(text, text, integer), "core"."search_prospect_company_ids"(text, text, integer) TO closeline_core;
--> statement-breakpoint
-- ALTER ... OWNER TO needs CREATE on the schema for the new owner; it is held for these statements only.
GRANT CREATE ON SCHEMA "core" TO closeline_core_search;
--> statement-breakpoint
ALTER FUNCTION "core"."search_prospect_ids"(text, text, integer) OWNER TO closeline_core_search;
--> statement-breakpoint
ALTER FUNCTION "core"."search_prospect_company_ids"(text, text, integer) OWNER TO closeline_core_search;
--> statement-breakpoint
REVOKE CREATE ON SCHEMA "core" FROM closeline_core_search;
