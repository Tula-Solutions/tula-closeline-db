CREATE TABLE "playbook"."orphan_sweeps" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"pending_since" timestamp with time zone,
	"last_attempt_at" timestamp with time zone NOT NULL,
	"swept_through" timestamp with time zone,
	CONSTRAINT "orphan_sweeps_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "orphan_sweeps_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "orphan_sweeps_pending_not_after_last" CHECK ("playbook"."orphan_sweeps"."pending_since" <= "playbook"."orphan_sweeps"."last_attempt_at")
);
--> statement-breakpoint
ALTER TABLE "playbook"."work_hints" DROP CONSTRAINT "work_hints_kind_known";--> statement-breakpoint
DROP INDEX "playbook"."documents_cleanup_idx";--> statement-breakpoint
CREATE INDEX "documents_cleanup_idx" ON "playbook"."documents" USING btree ("organization_id","deleted_at","id") WHERE state = 'deleted' and (vectors_removed_seq is null or vectors_removed_seq < deletion_seq);--> statement-breakpoint
ALTER TABLE "playbook"."work_hints" ADD CONSTRAINT "work_hints_kind_known" CHECK ("playbook"."work_hints"."kind" in ('purge_due', 'jobs_due', 'cleanup_pending', 'consumed_purge', 'idempotency_purge', 'purge_spent', 'orphan_sweep'));
--> statement-breakpoint
-- Everything below is hand-written (Drizzle cannot express it), appended after the generated SQL
-- as 0009 to 0012 do. Run as closeline_owner.
--
-- 0014 adds two things. (1) documents_cleanup_idx gains the id (above), so the pending-cleanup list's
-- keyset (deleted_at, id) is read from the index in order; its predicate is the one the
-- cleanup_pending verification uses. (2) The `orphan_sweep` work kind and its marker table
-- `orphan_sweeps`. The index build above runs inside the migration transaction (not CONCURRENTLY)
-- and blocks writes to playbook.documents while it builds; acceptable while the table is small.

-- Backfill the marker and its hint from the upload attempts that exist now (keys older than 24 hours
-- are purged, so only recent attempts are known). Row-level security is lifted on idempotency_keys
-- for this only, inside the migration's transaction; the new table has none yet.
ALTER TABLE "playbook"."idempotency_keys" NO FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
INSERT INTO "playbook"."orphan_sweeps" ("organization_id", "pending_since", "last_attempt_at")
  SELECT k."organization_id", min(k."created_at"), max(k."created_at")
    FROM "playbook"."idempotency_keys" k GROUP BY k."organization_id";
--> statement-breakpoint
INSERT INTO "playbook"."work_hints" ("kind", "organization_id", "due_at")
  SELECT 'orphan_sweep', s."organization_id", s."pending_since" + interval '25 hours'
    FROM "playbook"."orphan_sweeps" s;
--> statement-breakpoint
ALTER TABLE "playbook"."idempotency_keys" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Row-level security: the canonical fail-closed policy; orphan_sweeps is a tenant table.
ALTER TABLE "playbook"."orphan_sweeps" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."orphan_sweeps" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "orphan_sweeps_tenant_isolation" ON "playbook"."orphan_sweeps" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint

-- Privileges. Only the upload-attempt trigger (SECURITY DEFINER) creates and advances the attempt
-- times; the role reads the row and may update the two columns ORPHAN_SWEEP_DONE moves, nothing else,
-- and cannot insert or delete (a row is the triggers' and the offboarding function's).
REVOKE INSERT, UPDATE, DELETE ON "playbook"."orphan_sweeps" FROM closeline_playbook;
--> statement-breakpoint
GRANT UPDATE ("pending_since", "swept_through") ON "playbook"."orphan_sweeps" TO closeline_playbook;
--> statement-breakpoint

-- Every upload attempt writes an idempotency key, so the key insert notes the marker and the hint.
-- The marker upsert comes first and the hint last, as the other triggers order their locks.
-- pending_since only moves earlier here (least ignores a null), so it stays a lower bound on the
-- oldest unexamined attempt; the hint is due ORPHAN_SWEEP_AGE_MS (25 hours: the service deletes an
-- orphan only when older than 24 hours) after that bound, which is never later than the real work.
CREATE OR REPLACE FUNCTION "playbook"."note_idempotency_work"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_pending timestamptz;
BEGIN
  PERFORM "playbook"."note_work"('idempotency_purge', NEW."organization_id", NEW."created_at" + interval '24 hours');
  INSERT INTO "playbook"."orphan_sweeps" AS s ("organization_id", "pending_since", "last_attempt_at")
  VALUES (NEW."organization_id", NEW."created_at", NEW."created_at")
  ON CONFLICT ("organization_id") DO UPDATE
    SET "pending_since" = least(s."pending_since", EXCLUDED."pending_since"),
        "last_attempt_at" = greatest(s."last_attempt_at", EXCLUDED."last_attempt_at")
  RETURNING s."pending_since" INTO v_pending;
  PERFORM "playbook"."note_work"('orphan_sweep', NEW."organization_id", v_pending + interval '25 hours');
  RETURN NULL;
END
$$;
--> statement-breakpoint

-- Find the Organizations with due work of one kind, in id order after `p_after_id`, at most
-- `p_batch` returned (clamped to 1..500 here, whatever the caller passes) and at most four times
-- that many hints visited (never more than 2000), so one call holds a bounded number of locks
-- whatever the backlog of stale hints. Returns Organization ids (the all-zero global scope only for
-- `consumed_purge`) and, on every row, `resume_after`: the last hint visited, which is where the
-- next call continues, so a caller neither skips nor repeats an Organization. When nothing was
-- returned but hints were visited, one marker row comes back with a null `organization_id` and the
-- `resume_after` to continue from; no rows at all means the sweep is over.
--
-- It must run unscoped (the sweeper has no Organization): called inside a tenant-scoped
-- transaction it raises insufficient_privilege, so no tenant request path can use it. It reads the
-- due hints of the kind in id order and verifies each in that Organization's own scope, as the
-- owner, by asking the tenant table (on its Organization-leading partial index) for the
-- Organization's earliest due time of the kind: due now, the Organization is returned and the hint
-- kept; due later, the hint moves there; no work left, the hint is removed. Stale hints are
-- therefore cleaned by the sweep that meets them, and a hint is never later than real work. Hints
-- another transaction is changing or sharing are skipped (SKIP LOCKED): that Organization shows up
-- on the next sweep, and nothing here waits on a lock. The hint locks are held until the caller's
-- transaction ends, so run this as the only statement of its transaction. The session ends
-- unscoped, as it began.
--
-- Expected plans (the registry is small: at most one row per kind and Organization with work):
--   candidate scan  Index Scan on work_hints_due_idx / work_hints_pkey (kind = $1, id > $2),
--                   filter due_at <= now(), LockRows, top-N by id: proportional to the due hints
--                   of the kind (and bounded by the visited cap), never to a tenant table.
--   purge_due       Index Only Scan documents_purge_idx, the Organization's deleted documents.
--   jobs_due        Index Only Scan ingestion_jobs_due_idx, first entry of the Organization (min).
--   cleanup_pending Index Only Scan documents_cleanup_idx, first entry of the Organization (min); the
--                   same predicate as the index and the DOCUMENT_LIST_PENDING_CLEANUP statement.
--   consumed_purge  two first-entry reads, consumed_message_done_idx and consumed_message_lease_idx.
--   idempotency     first entry of idempotency_keys_purge_idx for the Organization (min).
--   purge_spent     Index Only Scan documents_spent_purge_idx, the Organization's spent documents.
--   orphan_sweep    Index Scan orphan_sweeps_pkey, the Organization's one row.
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
  IF p_kind IS NULL OR p_kind NOT IN ('purge_due', 'jobs_due', 'cleanup_pending', 'consumed_purge', 'idempotency_purge', 'purge_spent', 'orphan_sweep') THEN
    RAISE EXCEPTION 'playbook.work_kind: unknown kind of work' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  FOR v_hint IN
    SELECT h."organization_id" AS org FROM "playbook"."work_hints" h
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
      SELECT min(k."created_at") + interval '24 hours' INTO v_next FROM "playbook"."idempotency_keys" k
        WHERE k."organization_id" = v_hint.org;
    ELSIF p_kind = 'orphan_sweep' THEN
      -- The object store cannot be looked at from here, so "work exists" is the marker's: an upload
      -- attempt not yet covered by a sweep (pending_since set), due ORPHAN_SWEEP_AGE_MS later.
      SELECT s."pending_since" + interval '25 hours' INTO v_next FROM "playbook"."orphan_sweeps" s
        WHERE s."organization_id" = v_hint.org;
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

-- Remove what an Organization has left once it has no document: its index settings, usage row,
-- consumed messages, idempotency keys (except those of `p_keep_route`, so the remove-all call's own
-- key survives its own work) and work hints. It refuses, and deletes nothing, while any document row
-- exists, so it cannot be used to strip a live Organization; it acts only on the Organization the
-- caller's transaction is scoped to (the service role cannot delete these rows itself: the usage
-- row is the triggers', index settings are never deleted by a statement). It takes the upload
-- lock first, so an upload that has inserted a document is seen, and one that has not waits and
-- then rebuilds what it needs. Returns true when nothing remains (also when called again), false
-- when a document exists.
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
  PERFORM pg_advisory_xact_lock(hashtextextended(p_organization_id, 0));
  IF EXISTS (SELECT 1 FROM "playbook"."documents" d WHERE d."organization_id" = p_organization_id) THEN
    RETURN false;
  END IF;
  DELETE FROM "playbook"."index_settings" s WHERE s."organization_id" = p_organization_id;
  DELETE FROM "playbook"."consumed_message" c WHERE c."organization_id" = p_organization_id;
  DELETE FROM "playbook"."idempotency_keys" k
    WHERE k."organization_id" = p_organization_id AND k."route" IS DISTINCT FROM p_keep_route;
  DELETE FROM "playbook"."organization_usage" u WHERE u."organization_id" = p_organization_id;
  DELETE FROM "playbook"."work_hints" w
    WHERE w."organization_id" = p_organization_id AND w."kind" NOT IN ('idempotency_purge', 'orphan_sweep');
  RETURN true;
END
$$;
-- (0014: the orphan_sweep hint and its marker row stay, like the remove-all key's purge hint: an
-- upload attempt of this Organization may have left an object that only the sweep removes.)
--> statement-breakpoint
-- The functions above keep their signatures, so their grants stand; they are stated again so the
-- migration is the whole truth about who may call them.
REVOKE ALL ON FUNCTION "playbook"."organizations_with_work"(text, text, integer), "playbook"."remove_organization_rest"(text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "playbook"."organizations_with_work"(text, text, integer), "playbook"."remove_organization_rest"(text, text) TO closeline_playbook;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "playbook"."note_idempotency_work"() FROM PUBLIC;
