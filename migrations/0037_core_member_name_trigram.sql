-- Trigram index and definer search for the members list filter `q` (name ilike '%text%').
-- The same shape as migrations 0029 (pg_trgm and the indexes) and 0030 (the definer functions);
-- read 0030 for why: `ilike` is not leakproof, so under the core role's row-level security the
-- planner will not hand it an index, and the search runs in a function owned by the
-- closeline_core_search role (NOLOGIN, BYPASSRLS) that filters the Organization itself.
-- The index build below runs in the migration transaction (no CONCURRENTLY), so it blocks writes
-- to memberships until it finishes: milliseconds to seconds at the sizes memberships reach.
CREATE INDEX "memberships_name_trgm_idx" ON "core"."memberships" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
-- The search role reads these columns of memberships and nothing else (0030 gave it the Prospect ones).
GRANT SELECT ("id", "organization_id", "name") ON "core"."memberships" TO closeline_core_search;--> statement-breakpoint
-- The memberships whose name contains `q` (case-insensitive; `\`, `%` and `_` in `q` match
-- themselves), as ids in id order after the cursor `after`, in the Organization of the setting
-- `app.organization_id`; at most least(max_rows, 101). A null or empty `q`, a max_rows below 1, or
-- an unset or empty setting gives no row. Fails closed: it never takes the Organization from a
-- caller. plan_cache_mode = force_custom_plan plans each call for its own pattern: a generic plan
-- cannot know how rare the term is and may choose a sequential scan.
CREATE FUNCTION "core"."search_membership_ids"(q text, "after" text, max_rows integer)
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
  SELECT m."id"
    FROM "core"."memberships" m
   WHERE m."organization_id" = v_org
     AND m."id" > v_after
     AND m."name" ILIKE v_pattern
   ORDER BY m."id"
   LIMIT v_limit;
END
$$;--> statement-breakpoint
-- Grants first, while closeline_owner owns the function; the ownership change carries them over.
REVOKE ALL ON FUNCTION "core"."search_membership_ids"(text, text, integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."search_membership_ids"(text, text, integer) TO closeline_core;--> statement-breakpoint
-- ALTER ... OWNER TO needs CREATE on the schema for the new owner; it is held for this statement only.
GRANT CREATE ON SCHEMA "core" TO closeline_core_search;--> statement-breakpoint
ALTER FUNCTION "core"."search_membership_ids"(text, text, integer) OWNER TO closeline_core_search;--> statement-breakpoint
REVOKE CREATE ON SCHEMA "core" FROM closeline_core_search;
