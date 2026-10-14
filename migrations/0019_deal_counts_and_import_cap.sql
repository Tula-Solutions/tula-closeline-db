ALTER TABLE "playbook"."deal_import_rows" DROP CONSTRAINT "deal_import_rows_reason_known";--> statement-breakpoint
ALTER TABLE "playbook"."deal_import_rows" DROP CONSTRAINT "deal_import_rows_deal_id_missing_only_when_unusable";--> statement-breakpoint
ALTER TABLE "playbook"."deal_import_rows" ADD CONSTRAINT "deal_import_rows_reason_known" CHECK ("playbook"."deal_import_rows"."reason" is null or "playbook"."deal_import_rows"."reason" in ('wrong_column_count', 'invalid_deal_id', 'duplicate_in_file', 'invalid_outcome', 'invalid_closed_at', 'invalid_amount', 'invalid_currency', 'invalid_name', 'outcome_already_decided', 'deal_limit_reached', 'blank_row'));--> statement-breakpoint
ALTER TABLE "playbook"."deal_import_rows" ADD CONSTRAINT "deal_import_rows_deal_id_missing_only_when_unusable" CHECK ("playbook"."deal_import_rows"."deal_id" is not null or "playbook"."deal_import_rows"."reason" in ('invalid_deal_id', 'wrong_column_count', 'blank_row'));
--> statement-breakpoint

-- Everything below is hand-written (Drizzle cannot express it), appended after the generated SQL.
-- Run as closeline_owner.
--
-- 0019, part 1: no new index for the Deal call count. The count reads calls by (organization_id,
-- deal_record_id) with state <> 'deleted', which is exactly the leading columns and the predicate of
-- calls_deal_list_idx (0016), so a second partial index would only add writes to a hot table.
--
-- 0019, part 2: the cap of unfinished Deal imports. One call that takes an advisory lock on the
-- Organization's import cap, then counts, then inserts. They are separate statements in a function so
-- that each takes a new snapshot (READ COMMITTED): after waiting for the lock, the count sees the
-- insert the previous holder committed. A single SQL statement would count in the snapshot taken
-- before the wait and let two inserts at four both win. It runs with the caller's rights, so
-- row-level security and the table privileges apply as for a plain insert.
CREATE FUNCTION "playbook"."insert_deal_import"(p_organization_id text, p_id text, p_uploaded_by text, p_object_key text, p_size_bytes bigint, p_max integer)
RETURNS TABLE ("result" text, "id" text, "state" text, "failure_reason" text, "row_count" integer, "applied_count" integer, "rejected_count" integer, "uploaded_by" text, "created_at" timestamptz, "updated_at" timestamptz)
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
#variable_conflict use_column
DECLARE
  n integer;
BEGIN
  -- Refuse before taking the lock, as the definer functions do: a caller must not hold another
  -- Organization's cap lock. (The insert would also be refused by row-level security, but only after.)
  IF p_organization_id IS NULL OR p_organization_id !~ '^org_[0-9a-f]{32}$'
     OR p_organization_id = 'org_00000000000000000000000000000000' THEN
    RAISE EXCEPTION 'playbook.insert_deal_import_organization: not an Organization id' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF current_setting('app.organization_id', true) IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'playbook.insert_deal_import_scope: the transaction is not scoped to this Organization' USING ERRCODE = 'insufficient_privilege';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('playbook.deal_import_cap:' || p_organization_id, 0));
  SELECT count(*) INTO n FROM (
    SELECT 1 FROM "playbook"."deal_imports" i
    WHERE i."organization_id" = p_organization_id AND i."state" IN ('uploaded', 'processing')
    LIMIT p_max) AS unfinished;
  IF n >= p_max THEN
    RETURN QUERY SELECT 'busy'::text, NULL::text, NULL::text, NULL::text, NULL::integer, NULL::integer,
      NULL::integer, NULL::text, NULL::timestamptz, NULL::timestamptz;
    RETURN;
  END IF;
  RETURN QUERY WITH ins AS (
    INSERT INTO "playbook"."deal_imports" ("id", "organization_id", "uploaded_by", "object_key", "size_bytes", "next_attempt_at")
    VALUES (p_id, p_organization_id, p_uploaded_by, p_object_key, p_size_bytes, clock_timestamp())
    RETURNING "id", "state", "failure_reason", "row_count", "applied_count", "rejected_count", "uploaded_by", "created_at", "updated_at")
  SELECT 'created'::text, ins."id", ins."state", ins."failure_reason",
    CASE WHEN ins."state" = 'completed' THEN ins."row_count" END,
    CASE WHEN ins."state" = 'completed' THEN ins."applied_count" END,
    CASE WHEN ins."state" = 'completed' THEN ins."rejected_count" END,
    ins."uploaded_by", ins."created_at", ins."updated_at" FROM ins;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "playbook"."insert_deal_import"(text, text, text, text, bigint, integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "playbook"."insert_deal_import"(text, text, text, text, bigint, integer) TO closeline_playbook;
