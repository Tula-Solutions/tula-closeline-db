CREATE TABLE "playbook"."deal_import_rows" (
	"organization_id" text NOT NULL,
	"import_id" text NOT NULL,
	"row_number" integer NOT NULL,
	"deal_id" text,
	"result" text NOT NULL,
	"reason" text,
	CONSTRAINT "deal_import_rows_pkey" PRIMARY KEY("organization_id","import_id","row_number"),
	CONSTRAINT "deal_import_rows_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "deal_import_rows_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "deal_import_rows_row_number_range" CHECK ("playbook"."deal_import_rows"."row_number" between 2 and 50001),
	CONSTRAINT "deal_import_rows_result_known" CHECK ("playbook"."deal_import_rows"."result" in ('applied', 'rejected')),
	CONSTRAINT "deal_import_rows_reason_known" CHECK ("playbook"."deal_import_rows"."reason" is null or "playbook"."deal_import_rows"."reason" in ('wrong_column_count', 'invalid_deal_id', 'duplicate_in_file', 'invalid_outcome', 'invalid_closed_at', 'invalid_amount', 'invalid_currency', 'invalid_name', 'outcome_already_decided', 'deal_limit_reached')),
	CONSTRAINT "deal_import_rows_reason_matches_result" CHECK (("playbook"."deal_import_rows"."result" = 'rejected') = ("playbook"."deal_import_rows"."reason" is not null)),
	CONSTRAINT "deal_import_rows_deal_id_shape" CHECK ("playbook"."deal_import_rows"."deal_id" is null or (char_length("playbook"."deal_import_rows"."deal_id") between 1 and 128
        and octet_length("playbook"."deal_import_rows"."deal_id") <= 512)),
	CONSTRAINT "deal_import_rows_deal_id_missing_only_when_unusable" CHECK ("playbook"."deal_import_rows"."deal_id" is not null or "playbook"."deal_import_rows"."reason" in ('invalid_deal_id', 'wrong_column_count'))
);
--> statement-breakpoint
CREATE TABLE "playbook"."deal_imports" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"state" text DEFAULT 'uploaded' NOT NULL,
	"failure_reason" text,
	"uploaded_by" text NOT NULL,
	"object_key" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claim_token" uuid,
	"row_count" integer,
	"applied_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"object_removed_at" timestamp with time zone,
	"erased_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deal_imports_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "deal_imports_id_shape" CHECK ("id" ~ '^dimp_[0-9a-f]{32}$'),
	CONSTRAINT "deal_imports_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "deal_imports_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "deal_imports_uploaded_by_shape" CHECK ("uploaded_by" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "deal_imports_state_known" CHECK ("playbook"."deal_imports"."state" in ('uploaded', 'processing', 'completed', 'failed')),
	CONSTRAINT "deal_imports_failure_reason_known" CHECK ("playbook"."deal_imports"."failure_reason" is null or "playbook"."deal_imports"."failure_reason" in ('too_many_rows', 'unreadable', 'processing_failed')),
	CONSTRAINT "deal_imports_failure_matches_state" CHECK (("playbook"."deal_imports"."state" = 'failed') = ("playbook"."deal_imports"."failure_reason" is not null)),
	CONSTRAINT "deal_imports_size_range" CHECK ("playbook"."deal_imports"."size_bytes" between 1 and 10485760),
	CONSTRAINT "deal_imports_attempts_range" CHECK ("playbook"."deal_imports"."attempts" between 0 and 20),
	CONSTRAINT "deal_imports_counts_range" CHECK ("playbook"."deal_imports"."applied_count" between 0 and 50000
        and "playbook"."deal_imports"."rejected_count" between 0 and 50000
        and "playbook"."deal_imports"."applied_count" + "playbook"."deal_imports"."rejected_count" <= 50000),
	CONSTRAINT "deal_imports_row_count_matches_state" CHECK (("playbook"."deal_imports"."state" = 'completed') = ("playbook"."deal_imports"."row_count" is not null)
        and ("playbook"."deal_imports"."row_count" is null or "playbook"."deal_imports"."row_count" = "playbook"."deal_imports"."applied_count" + "playbook"."deal_imports"."rejected_count")),
	CONSTRAINT "deal_imports_claim_only_while_processing" CHECK ("playbook"."deal_imports"."claim_token" is null or "playbook"."deal_imports"."state" = 'processing'),
	CONSTRAINT "deal_imports_finished_matches_state" CHECK (("playbook"."deal_imports"."state" in ('completed', 'failed')) = ("playbook"."deal_imports"."finished_at" is not null)),
	CONSTRAINT "deal_imports_erased_is_final" CHECK ("playbook"."deal_imports"."erased_at" is null or "playbook"."deal_imports"."state" in ('completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "playbook"."deals" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"deal_id" text NOT NULL,
	"name" text,
	"outcome" text DEFAULT 'open' NOT NULL,
	"outcome_seq" integer DEFAULT 0 NOT NULL,
	"closed_at" timestamp with time zone,
	"amount" numeric(17, 2),
	"currency" text,
	"appeared_in_import" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deals_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "deals_id_shape" CHECK ("id" ~ '^deal_[0-9a-f]{32}$'),
	CONSTRAINT "deals_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "deals_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "deals_deal_id_shape" CHECK (char_length("playbook"."deals"."deal_id") between 1 and 128
        and octet_length("playbook"."deals"."deal_id") <= 512
        and "playbook"."deals"."deal_id" = btrim("playbook"."deals"."deal_id", E' \t\n\r\f\v')),
	CONSTRAINT "deals_name_shape" CHECK ("playbook"."deals"."name" is null or (char_length("playbook"."deals"."name") between 1 and 200
        and octet_length("playbook"."deals"."name") <= 800)),
	CONSTRAINT "deals_outcome_known" CHECK ("playbook"."deals"."outcome" in ('won', 'lost', 'open')),
	CONSTRAINT "deals_outcome_seq_range" CHECK ("playbook"."deals"."outcome_seq" between 0 and 2147483647),
	CONSTRAINT "deals_amount_range" CHECK ("playbook"."deals"."amount" is null or "playbook"."deals"."amount" >= 0),
	CONSTRAINT "deals_currency_shape" CHECK ("playbook"."deals"."currency" is null or "playbook"."deals"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "deals_amount_has_currency" CHECK ("playbook"."deals"."amount" is null or "playbook"."deals"."currency" is not null)
);
--> statement-breakpoint
CREATE TABLE "playbook"."rights_confirmations" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"confirmed_by" text NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"wording_version" integer NOT NULL,
	CONSTRAINT "rights_confirmations_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "rights_confirmations_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "rights_confirmations_confirmed_by_shape" CHECK ("confirmed_by" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "rights_confirmations_wording_version_range" CHECK ("playbook"."rights_confirmations"."wording_version" between 1 and 1000000)
);
--> statement-breakpoint
ALTER TABLE "playbook"."work_hints" DROP CONSTRAINT "work_hints_kind_known";--> statement-breakpoint
ALTER TABLE "playbook"."organization_usage" ADD COLUMN "deal_count" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "playbook"."deal_import_rows" ADD CONSTRAINT "deal_import_rows_import_fkey" FOREIGN KEY ("organization_id","import_id") REFERENCES "playbook"."deal_imports"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deal_import_rows_first_key" ON "playbook"."deal_import_rows" USING btree ("organization_id","import_id","deal_id") WHERE "playbook"."deal_import_rows"."deal_id" is not null and "playbook"."deal_import_rows"."reason" is distinct from 'duplicate_in_file';--> statement-breakpoint
CREATE INDEX "deal_import_rows_result_idx" ON "playbook"."deal_import_rows" USING btree ("organization_id","import_id","result","row_number");--> statement-breakpoint
CREATE INDEX "deal_imports_list_idx" ON "playbook"."deal_imports" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "deal_imports_due_idx" ON "playbook"."deal_imports" USING btree ("organization_id","next_attempt_at") WHERE "playbook"."deal_imports"."state" in ('uploaded', 'processing');--> statement-breakpoint
CREATE INDEX "deal_imports_unerased_idx" ON "playbook"."deal_imports" USING btree ("organization_id","id") WHERE "playbook"."deal_imports"."erased_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "deals_deal_id_key" ON "playbook"."deals" USING btree ("organization_id","deal_id");--> statement-breakpoint
CREATE INDEX "deals_list_idx" ON "playbook"."deals" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "deals_outcome_list_idx" ON "playbook"."deals" USING btree ("organization_id","outcome","created_at","id");--> statement-breakpoint
CREATE INDEX "deals_import_list_idx" ON "playbook"."deals" USING btree ("organization_id","appeared_in_import","created_at","id");--> statement-breakpoint
ALTER TABLE "playbook"."organization_usage" ADD CONSTRAINT "organization_usage_deal_count_not_negative" CHECK ("playbook"."organization_usage"."deal_count" >= 0);--> statement-breakpoint
ALTER TABLE "playbook"."work_hints" ADD CONSTRAINT "work_hints_kind_known" CHECK ("playbook"."work_hints"."kind" in ('purge_due', 'jobs_due', 'cleanup_pending', 'consumed_purge', 'idempotency_purge', 'purge_spent', 'orphan_sweep', 'import_apply'));
--> statement-breakpoint
-- Everything below is hand-written (Drizzle cannot express it), appended after the generated SQL
-- as 0009 to 0014 do. Run as closeline_owner.
--
-- 0015 is the first half of the sales-history storage (hub issue 67): Deals, Deal imports with their
-- row reports, and the rights confirmation. Calls, their uploads and the work around them follow in
-- the next migration.

-- Row-level security: the one canonical fail-closed policy on every new table, all tenant tables.
ALTER TABLE "playbook"."deals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."deals" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "deals_tenant_isolation" ON "playbook"."deals" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "playbook"."deal_imports" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."deal_imports" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "deal_imports_tenant_isolation" ON "playbook"."deal_imports" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "playbook"."deal_import_rows" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."deal_import_rows" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "deal_import_rows_tenant_isolation" ON "playbook"."deal_import_rows" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "playbook"."rights_confirmations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."rights_confirmations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "rights_confirmations_tenant_isolation" ON "playbook"."rights_confirmations" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint

-- Privileges. The schema's default privileges give closeline_playbook SELECT, INSERT, UPDATE and
-- DELETE on every new table; what follows only takes privileges away.
--
-- deals: no delete (a Deal goes only with its Organization, through erase_deals below), and the
-- role updates only the columns that move: never the id, the Organization, the customer's deal id
-- or the creation time.
REVOKE UPDATE, DELETE ON "playbook"."deals" FROM closeline_playbook;
--> statement-breakpoint
GRANT UPDATE ("name", "outcome", "outcome_seq", "closed_at", "amount", "currency", "appeared_in_import", "updated_at") ON "playbook"."deals" TO closeline_playbook;
--> statement-breakpoint
-- deal_imports: the role updates only what moves a job along, and deletes only an erased import
-- whose stored CSV is recorded removed (a restrictive policy, ANDed with the tenant policy).
REVOKE UPDATE ON "playbook"."deal_imports" FROM closeline_playbook;
--> statement-breakpoint
GRANT UPDATE ("state", "failure_reason", "attempts", "next_attempt_at", "claim_token", "row_count", "applied_count", "rejected_count", "object_removed_at", "erased_at", "finished_at", "updated_at") ON "playbook"."deal_imports" TO closeline_playbook;
--> statement-breakpoint
CREATE POLICY "deal_imports_erased_only" ON "playbook"."deal_imports" AS RESTRICTIVE FOR DELETE TO PUBLIC USING ("erased_at" IS NOT NULL AND "object_removed_at" IS NOT NULL);
--> statement-breakpoint
-- deal_import_rows: written once and never updated; deleted only while its import is erased.
REVOKE UPDATE ON "playbook"."deal_import_rows" FROM closeline_playbook;
--> statement-breakpoint
CREATE POLICY "deal_import_rows_erased_only" ON "playbook"."deal_import_rows" AS RESTRICTIVE FOR DELETE TO PUBLIC USING (EXISTS (SELECT 1 FROM "playbook"."deal_imports" i WHERE i."organization_id" = "deal_import_rows"."organization_id" AND i."id" = "deal_import_rows"."import_id" AND i."erased_at" IS NOT NULL));
--> statement-breakpoint
-- rights_confirmations: replaced by a newer version, never deleted by the role (erasure deletes it).
REVOKE UPDATE, DELETE ON "playbook"."rights_confirmations" FROM closeline_playbook;
--> statement-breakpoint
GRANT UPDATE ("confirmed_by", "confirmed_at", "wording_version") ON "playbook"."rights_confirmations" TO closeline_playbook;
--> statement-breakpoint

-- Quota count of Deals. organization_usage gains deal_count, moved by an AFTER ROW trigger on deals in
-- the statement's own transaction, as the document counts are, so the quota check of an import row
-- (or a Call upload for an unknown deal id) is one primary-key read.
CREATE FUNCTION "playbook"."track_deal_usage"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO "playbook"."organization_usage" AS u ("organization_id", "deal_count")
      VALUES (NEW."organization_id", 1)
      ON CONFLICT ("organization_id") DO UPDATE
        SET "deal_count" = u."deal_count" + 1, "updated_at" = clock_timestamp();
  ELSE
    UPDATE "playbook"."organization_usage" AS u
      SET "deal_count" = u."deal_count" - 1, "updated_at" = clock_timestamp()
      WHERE u."organization_id" = OLD."organization_id";
    IF NOT FOUND THEN
      RAISE EXCEPTION 'playbook.usage_missing: no usage row for the Organization of a removed Deal'
        USING ERRCODE = 'check_violation', CONSTRAINT = 'organization_usage_track';
    END IF;
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "deals_track_usage" AFTER INSERT OR DELETE ON "playbook"."deals"
  FOR EACH ROW EXECUTE FUNCTION "playbook"."track_deal_usage"();
--> statement-breakpoint

-- A Deal's identity is final, and its Outcome sequence is exact: it rises by one when (and only
-- when) the Outcome or the closing time changes, and never falls, so a re-tag job that carries the
-- sequence compares it as the cleanup compares deletion_seq.
CREATE FUNCTION "playbook"."refuse_deal_change"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'playbook.deal_identity: a Deal''s identity never changes, and its Outcome sequence rises by one exactly when its Outcome or closing time changes'
    USING ERRCODE = 'check_violation', CONSTRAINT = 'deals_identity_final';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "deals_identity_final" BEFORE UPDATE ON "playbook"."deals"
  FOR EACH ROW WHEN (
    ROW(OLD."id", OLD."organization_id", OLD."deal_id", OLD."created_at")
      IS DISTINCT FROM ROW(NEW."id", NEW."organization_id", NEW."deal_id", NEW."created_at")
    OR NEW."outcome_seq" <> OLD."outcome_seq" + (CASE WHEN NEW."outcome" IS DISTINCT FROM OLD."outcome" OR NEW."closed_at" IS DISTINCT FROM OLD."closed_at" THEN 1 ELSE 0 END))
  EXECUTE FUNCTION "playbook"."refuse_deal_change"();
--> statement-breakpoint

-- An import is work from its due time (uploaded) or its lease end (processing). A heartbeat only
-- moves the lease later, so only an insert, a state change or an earlier time notes; the key-share
-- path of note_work means concurrent import uploads of one Organization never wait for each other.
CREATE FUNCTION "playbook"."note_import_work"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  PERFORM "playbook"."note_work"('import_apply', NEW."organization_id", NEW."next_attempt_at");
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "deal_imports_note_work_insert" AFTER INSERT ON "playbook"."deal_imports"
  FOR EACH ROW WHEN (NEW."state" IN ('uploaded', 'processing')) EXECUTE FUNCTION "playbook"."note_import_work"();
--> statement-breakpoint
CREATE TRIGGER "deal_imports_note_work_update" AFTER UPDATE ON "playbook"."deal_imports"
  FOR EACH ROW WHEN (NEW."state" IN ('uploaded', 'processing')
    AND (OLD."state" IS DISTINCT FROM NEW."state" OR NEW."next_attempt_at" < OLD."next_attempt_at"))
  EXECUTE FUNCTION "playbook"."note_import_work"();
--> statement-breakpoint

-- Erase one bounded batch of an Organization's Deals (the service role cannot delete a Deal). It
-- must run in that Organization's scope. It takes the upload lock first, as remove_organization_rest
-- does, because an import batch holds that lock while it updates Deals and then the usage row, and
-- the delete trigger below takes the usage row after the Deal rows: without the lock the two could
-- wait on each other. Returns the number deleted; repeat until 0. A Deal a Call refers to cannot be
-- deleted (a later migration adds that foreign key without cascade), so Calls are erased first.
CREATE FUNCTION "playbook"."erase_deals"(p_organization_id text, p_limit integer) RETURNS integer
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF p_organization_id IS NULL OR p_organization_id !~ '^org_[0-9a-f]{32}$'
     OR p_organization_id = 'org_00000000000000000000000000000000' THEN
    RAISE EXCEPTION 'playbook.erase_deals_organization: not an Organization id' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF current_setting('app.organization_id', true) IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'playbook.erase_deals_scope: the transaction is not scoped to this Organization' USING ERRCODE = 'insufficient_privilege';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_organization_id, 0));
  WITH batch AS (
    SELECT d."id" FROM "playbook"."deals" d
      WHERE d."organization_id" = p_organization_id
      ORDER BY d."id"
      LIMIT least(greatest(coalesce(p_limit, 1), 1), 500)
      FOR UPDATE)
  DELETE FROM "playbook"."deals" t USING batch
    WHERE t."organization_id" = p_organization_id AND t."id" = batch."id";
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END
$$;
--> statement-breakpoint

-- Work discovery: the new kind `import_apply`. Verification reads the first entry of
-- deal_imports_due_idx for the Organization (min next_attempt_at over uploaded and processing).
CREATE OR REPLACE FUNCTION "playbook"."organizations_with_work"(p_kind text, p_after_id text, p_batch integer)
  RETURNS TABLE ("organization_id" text, "resume_after" text) LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = pg_catalog, pg_temp AS $$
#variable_conflict use_column
DECLARE
  v_batch integer := least(greatest(coalesce(p_batch, 1), 1), 500);
  v_limit integer := least(v_batch * 4, 2000);
  v_after text := coalesce(p_after_id, '');
  v_global constant text := 'org_00000000000000000000000000000000';
  v_hint record;
  v_next timestamptz;
  v_ids text[] := ARRAY[]::text[];
  v_visited integer := 0;
  v_last text;
BEGIN
  IF nullif(current_setting('app.organization_id', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'playbook.work_scope: the sweep runs outside any Organization''s scope'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('purge_due', 'jobs_due', 'cleanup_pending', 'consumed_purge', 'idempotency_purge', 'purge_spent', 'orphan_sweep', 'import_apply') THEN
    RAISE EXCEPTION 'playbook.work_kind: unknown kind of work' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  FOR v_hint IN
    SELECT h."organization_id" AS org, h."due_at" AS due FROM "playbook"."work_hints" h
    WHERE h."kind" = p_kind AND h."organization_id" > v_after AND h."due_at" <= clock_timestamp()
      AND (p_kind = 'consumed_purge' OR h."organization_id" <> v_global)
    ORDER BY h."organization_id"
    FOR UPDATE OF h SKIP LOCKED
  LOOP
    v_visited := v_visited + 1;
    v_last := v_hint.org;
    PERFORM set_config('app.organization_id', v_hint.org, true);
    IF p_kind = 'purge_due' THEN
      SELECT min(greatest(d."purge_due_at", coalesce(d."purge_lease_until", d."purge_due_at"))) INTO v_next
        FROM "playbook"."documents" d
        WHERE d."organization_id" = v_hint.org AND d."state" = 'deleted' AND d."purge_attempts" < 20;
    ELSIF p_kind = 'jobs_due' THEN
      SELECT min(j."next_attempt_at") INTO v_next FROM "playbook"."ingestion_jobs" j
        WHERE j."organization_id" = v_hint.org AND j."state" IN ('queued', 'running');
    ELSIF p_kind = 'cleanup_pending' THEN
      SELECT min(d."deleted_at") + interval '5 minutes' INTO v_next FROM "playbook"."documents" d
        WHERE d."organization_id" = v_hint.org AND d."state" = 'deleted'
          AND (d."vectors_removed_seq" IS NULL OR d."vectors_removed_seq" < d."deletion_seq");
    ELSIF p_kind = 'consumed_purge' THEN
      SELECT least(
        (SELECT min(c."completed_at") + interval '15 days' FROM "playbook"."consumed_message" c
          WHERE c."organization_id" = v_hint.org AND c."state" = 'done'),
        (SELECT min(c."lease_expires_at") FROM "playbook"."consumed_message" c
          WHERE c."organization_id" = v_hint.org AND c."state" = 'claimed')) INTO v_next;
    ELSIF p_kind = 'idempotency_purge' THEN
      SELECT min(k."created_at") + interval '26 hours' INTO v_next FROM "playbook"."idempotency_keys" k
        WHERE k."organization_id" = v_hint.org;
    ELSIF p_kind = 'import_apply' THEN
      -- An import is work from its due time (uploaded) or its lease end (processing); a spent one
      -- (attempts at the bound) stays work until the give-up statement fails it.
      SELECT min(i."next_attempt_at") INTO v_next FROM "playbook"."deal_imports" i
        WHERE i."organization_id" = v_hint.org AND i."state" IN ('uploaded', 'processing');
    ELSIF p_kind = 'orphan_sweep' THEN
      -- The object store cannot be looked at from here, so "work exists" is: an upload attempt
      -- newer than the time the service swept through (orphan_sweeps). The attempts are the
      -- idempotency keys, which are purged after IDEMPOTENCY_PURGE_AGE_MS (26 hours), an hour after
      -- an attempt is due (25 hours), so its key is normally still there; the hint's own time is
      -- evidence too, for a sweep that runs late: a hint due at d stands
      -- for an attempt at d - 25 hours, and counts while that is newer than the sweep. Erasure
      -- deletes the keys of an Organization, so the creation time of the latest one it deleted is
      -- kept in orphan_sweeps.erased_attempt_at and counts as an attempt until the sweep covers it.
      SELECT least(
        (SELECT min(k."created_at") + interval '25 hours' FROM "playbook"."idempotency_keys" k
          WHERE k."organization_id" = v_hint.org
            AND k."created_at" > coalesce((SELECT s."swept_through" FROM "playbook"."orphan_sweeps" s
                                            WHERE s."organization_id" = v_hint.org), '-infinity')),
        CASE WHEN v_hint.due - interval '25 hours' > coalesce((SELECT s."swept_through" FROM "playbook"."orphan_sweeps" s
                                                                 WHERE s."organization_id" = v_hint.org), '-infinity')
             THEN v_hint.due END,
        (SELECT s."erased_attempt_at" + interval '25 hours' FROM "playbook"."orphan_sweeps" s
          WHERE s."organization_id" = v_hint.org AND s."erased_attempt_at" > s."swept_through")) INTO v_next;
    ELSE
      SELECT min(d."updated_at") INTO v_next FROM "playbook"."documents" d
        WHERE d."organization_id" = v_hint.org AND d."state" = 'deleted' AND d."purge_attempts" >= 20;
    END IF;
    IF v_next IS NULL THEN
      DELETE FROM "playbook"."work_hints" w WHERE w."kind" = p_kind AND w."organization_id" = v_hint.org;
    ELSE
      UPDATE "playbook"."work_hints" w SET "due_at" = v_next
        WHERE w."kind" = p_kind AND w."organization_id" = v_hint.org;
      IF v_next <= clock_timestamp() THEN
        v_ids := v_ids || v_hint.org;
      END IF;
    END IF;
    EXIT WHEN cardinality(v_ids) >= v_batch OR v_visited >= v_limit;
  END LOOP;
  PERFORM set_config('app.organization_id', '', true);
  IF cardinality(v_ids) > 0 THEN
    RETURN QUERY SELECT u.i, v_last FROM unnest(v_ids) WITH ORDINALITY AS u(i, n) ORDER BY u.n;
  ELSIF v_visited > 0 THEN
    RETURN QUERY SELECT NULL::text, v_last;
  END IF;
  RETURN;
END
$$;
--> statement-breakpoint

-- Erasure: the replaced function refuses while a document, a Deal or an import remains, and removes the
-- rights confirmation with the rest.
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
  -- Deals, imports and their rows are removed in bounded batches first (erase_deals, the import
  -- erase and purge statements); this function refuses while any is left, so it never does work
  -- proportional to the Organization's size.
  IF EXISTS (SELECT 1 FROM "playbook"."documents" d WHERE d."organization_id" = p_organization_id)
     OR EXISTS (SELECT 1 FROM "playbook"."deal_imports" i WHERE i."organization_id" = p_organization_id)
     OR EXISTS (SELECT 1 FROM "playbook"."deals" e WHERE e."organization_id" = p_organization_id) THEN
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
  DELETE FROM "playbook"."work_hints" w
    WHERE w."organization_id" = p_organization_id AND w."kind" NOT IN ('idempotency_purge', 'orphan_sweep');
  DELETE FROM "playbook"."orphan_sweeps" s
    WHERE s."organization_id" = p_organization_id AND s."swept_through" = '-infinity' AND s."erased_attempt_at" IS NULL;
  RETURN true;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "playbook"."organizations_with_work"(text, text, integer), "playbook"."remove_organization_rest"(text, text), "playbook"."erase_deals"(text, integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "playbook"."organizations_with_work"(text, text, integer), "playbook"."remove_organization_rest"(text, text), "playbook"."erase_deals"(text, integer) TO closeline_playbook;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "playbook"."track_deal_usage"(), "playbook"."refuse_deal_change"(), "playbook"."note_import_work"() FROM PUBLIC;
