CREATE TABLE "playbook"."work_hints" (
	"kind" text NOT NULL,
	"organization_id" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	CONSTRAINT "work_hints_pkey" PRIMARY KEY("kind","organization_id"),
	CONSTRAINT "work_hints_kind_known" CHECK ("playbook"."work_hints"."kind" in ('purge_due', 'jobs_due', 'cleanup_pending', 'consumed_purge', 'idempotency_purge', 'purge_spent')),
	CONSTRAINT "work_hints_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "work_hints_global_only_consumed" CHECK ("playbook"."work_hints"."kind" = 'consumed_purge' or "playbook"."work_hints"."organization_id" <> 'org_00000000000000000000000000000000')
);
--> statement-breakpoint
DROP INDEX "playbook"."documents_content_hash_key";--> statement-breakpoint
ALTER TABLE "playbook"."documents" ADD COLUMN "restore_barred_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "work_hints_due_idx" ON "playbook"."work_hints" USING btree ("kind","due_at","organization_id");--> statement-breakpoint
CREATE INDEX "documents_unbarred_idx" ON "playbook"."documents" USING btree ("organization_id","id") WHERE "playbook"."documents"."restore_barred_at" is null;--> statement-breakpoint
CREATE INDEX "documents_cleanup_idx" ON "playbook"."documents" USING btree ("organization_id","deleted_at") WHERE "playbook"."documents"."state" = 'deleted' and ("playbook"."documents"."vectors_removed_seq" is null or "playbook"."documents"."vectors_removed_seq" < "playbook"."documents"."deletion_seq");--> statement-breakpoint
CREATE INDEX "documents_spent_purge_idx" ON "playbook"."documents" USING btree ("organization_id","id") WHERE "playbook"."documents"."state" = 'deleted' and "playbook"."documents"."purge_attempts" >= 20;--> statement-breakpoint
CREATE UNIQUE INDEX "documents_content_hash_key" ON "playbook"."documents" USING btree ("organization_id","content_hash") WHERE "playbook"."documents"."purge_started_at" is null and "playbook"."documents"."restore_barred_at" is null;--> statement-breakpoint
ALTER TABLE "playbook"."documents" ADD CONSTRAINT "documents_barred_only_when_deleted" CHECK ("playbook"."documents"."restore_barred_at" is null or "playbook"."documents"."state" = 'deleted');
--> statement-breakpoint
-- Everything below is hand-written (Drizzle cannot express it), appended after the generated SQL
-- as 0009 and 0011 do. Run as closeline_owner.

-- Privileges. The new column joins the lifecycle columns the role may update. work_hints is not a
-- tenant table: the schema defaults would give closeline_playbook SELECT, INSERT, UPDATE and
-- DELETE on it, which would let one Organization's service read every Organization's ids and forge
-- hints, so it gets nothing; the triggers and the two functions below, which run as the owner, are
-- the only way in (the pattern of core's directories).
GRANT UPDATE ("restore_barred_at") ON "playbook"."documents" TO closeline_playbook;
--> statement-breakpoint
REVOKE ALL ON "playbook"."work_hints" FROM closeline_playbook;
--> statement-breakpoint

-- Why a registry. Every tenant table is under forced row-level security with exactly one
-- permissive policy (the isolation check enforces it), so no role, the owner included, can read
-- across Organizations, and a sweep cannot ask a tenant table which Organizations have work. The
-- registry says where to look; the discovery function then looks in that Organization's own scope.

-- Record that an Organization may have work of a kind from a time on. Only ever moves the time
-- earlier. It first looks for a hint that is already early enough and takes a KEY SHARE lock on it:
-- key share locks do not conflict with each other, so writers of one Organization and kind do not
-- queue behind each other, and they still conflict with the sweeper's FOR UPDATE and its DELETE.
-- Only when no such row exists does it upsert.
--
-- Why KEY SHARE and not SHARE: two writers each holding SHARE on one hint, each then noting an
-- earlier time, would each need to upgrade to a row update and deadlock (40P01). "due_at" is not a
-- key column, so the upsert's UPDATE takes only the no-key-exclusive lock, which does not conflict
-- with key share; the writers pass each other. The sweeper's FOR UPDATE (also when it only moves
-- "due_at" later: it selects the row FOR UPDATE first, then updates it) conflicts with key share, as
-- does its DELETE, so it still excludes every writer holding the row.
--
-- Why this cannot lose a hint the sweeper is about to remove. The sweeper (organizations_with_work)
-- holds a hint FOR UPDATE while it decides, and deletes it only when it saw no work.
--   * The sweeper holds the row first: the writer's FOR KEY SHARE waits for the sweeper's commit. If
--     the hint was deleted, the re-checked SELECT finds no row, so the writer upserts a new one; if
--     the hint was moved later than the writer's time, the re-checked qual fails and the upsert moves
--     it earlier; if it was kept, the writer finds it and skips, correctly.
--   * The writer holds the key share lock first: the sweeper's FOR UPDATE SKIP LOCKED skips the row,
--     so it can neither delete nor move it while the writer's transaction (which holds the new tenant
--     row, not yet visible to the sweeper) is open.
-- Lock order is unchanged: a hint row is the last lock any transaction takes.
CREATE FUNCTION "playbook"."note_work"(p_kind text, p_organization_id text, p_due_at timestamptz) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  PERFORM 1 FROM "playbook"."work_hints" h
    WHERE h."kind" = p_kind AND h."organization_id" = p_organization_id AND h."due_at" <= p_due_at
    FOR KEY SHARE;
  IF FOUND THEN
    RETURN;
  END IF;
  INSERT INTO "playbook"."work_hints" AS h ("kind", "organization_id", "due_at")
  VALUES (p_kind, p_organization_id, p_due_at)
  ON CONFLICT ("kind", "organization_id") DO UPDATE SET "due_at" = EXCLUDED."due_at"
  WHERE h."due_at" > EXCLUDED."due_at";
END
$$;
--> statement-breakpoint

-- A deleted document is the only kind of document row that carries purge, cleanup or spent-purge
-- work, and only updates produce one, so the trigger fires only for updates that leave a document
-- deleted. A leased purge notes the lease end, a spent one notes now, a cleanup not yet recorded
-- notes five minutes after the delete (the normal path publishes it at once).
CREATE FUNCTION "playbook"."note_document_work"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF NEW."purge_attempts" < 20 THEN
    PERFORM "playbook"."note_work"('purge_due', NEW."organization_id",
      greatest(NEW."purge_due_at", coalesce(NEW."purge_lease_until", NEW."purge_due_at")));
  ELSE
    PERFORM "playbook"."note_work"('purge_spent', NEW."organization_id", clock_timestamp());
  END IF;
  IF NEW."vectors_removed_seq" IS NULL OR NEW."vectors_removed_seq" < NEW."deletion_seq" THEN
    PERFORM "playbook"."note_work"('cleanup_pending', NEW."organization_id", NEW."deleted_at" + interval '5 minutes');
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "documents_note_work" AFTER UPDATE ON "playbook"."documents"
  FOR EACH ROW WHEN (NEW."state" = 'deleted') EXECUTE FUNCTION "playbook"."note_document_work"();
--> statement-breakpoint

-- An active job is work from its due time (a queued job) or its lease end (a running one). A
-- heartbeat only moves the lease later, so only an insert, a state change or an earlier time notes.
CREATE FUNCTION "playbook"."note_job_work"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  PERFORM "playbook"."note_work"('jobs_due', NEW."organization_id", NEW."next_attempt_at");
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "ingestion_jobs_note_work_insert" AFTER INSERT ON "playbook"."ingestion_jobs"
  FOR EACH ROW WHEN (NEW."state" IN ('queued', 'running')) EXECUTE FUNCTION "playbook"."note_job_work"();
--> statement-breakpoint
CREATE TRIGGER "ingestion_jobs_note_work_update" AFTER UPDATE ON "playbook"."ingestion_jobs"
  FOR EACH ROW WHEN (NEW."state" IN ('queued', 'running')
    AND (OLD."state" IS DISTINCT FROM NEW."state" OR NEW."next_attempt_at" < OLD."next_attempt_at"))
  EXECUTE FUNCTION "playbook"."note_job_work"();
--> statement-breakpoint

-- A done consumed message is purgeable only below the queue's retention cutoff: 15 days after it
-- is done (the kit: retention is 14 days at most, 15 is safe), so it is not "due" before that. A
-- lapsed claim is purgeable at its lease end.
CREATE FUNCTION "playbook"."note_consumed_work"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  PERFORM "playbook"."note_work"('consumed_purge', NEW."organization_id",
    CASE WHEN NEW."state" = 'done' THEN NEW."completed_at" + interval '15 days' ELSE NEW."lease_expires_at" END);
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "consumed_message_note_work_insert" AFTER INSERT ON "playbook"."consumed_message"
  FOR EACH ROW EXECUTE FUNCTION "playbook"."note_consumed_work"();
--> statement-breakpoint
CREATE TRIGGER "consumed_message_note_work_update" AFTER UPDATE ON "playbook"."consumed_message"
  FOR EACH ROW WHEN (OLD."state" IS DISTINCT FROM NEW."state") EXECUTE FUNCTION "playbook"."note_consumed_work"();
--> statement-breakpoint

-- An idempotency key is purgeable 24 hours after it was created. Core documents no age for its own
-- keys, so this is the playbook's own (IDEMPOTENCY_PURGE_AGE_MS in the statements).
CREATE FUNCTION "playbook"."note_idempotency_work"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  PERFORM "playbook"."note_work"('idempotency_purge', NEW."organization_id", NEW."created_at" + interval '24 hours');
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "idempotency_keys_note_work" AFTER INSERT ON "playbook"."idempotency_keys"
  FOR EACH ROW EXECUTE FUNCTION "playbook"."note_idempotency_work"();
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
--   cleanup_pending Index Only Scan documents_cleanup_idx, first entry of the Organization (min).
--   consumed_purge  two first-entry reads, consumed_message_done_idx and consumed_message_lease_idx.
--   idempotency     first entry of idempotency_keys_purge_idx for the Organization (min).
--   purge_spent     Index Only Scan documents_spent_purge_idx, the Organization's spent documents.
CREATE FUNCTION "playbook"."organizations_with_work"(p_kind text, p_after_id text, p_batch integer)
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
  IF p_kind IS NULL OR p_kind NOT IN ('purge_due', 'jobs_due', 'cleanup_pending', 'consumed_purge', 'idempotency_purge', 'purge_spent') THEN
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
CREATE FUNCTION "playbook"."remove_organization_rest"(p_organization_id text, p_keep_route text) RETURNS boolean
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
    WHERE w."organization_id" = p_organization_id AND w."kind" <> 'idempotency_purge';
  RETURN true;
END
$$;
--> statement-breakpoint

-- Only the triggers run the note functions; the two entry points are the playbook role's alone.
REVOKE ALL ON FUNCTION "playbook"."note_work"(text, text, timestamptz), "playbook"."note_document_work"(), "playbook"."note_job_work"(), "playbook"."note_consumed_work"(), "playbook"."note_idempotency_work"() FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "playbook"."organizations_with_work"(text, text, integer), "playbook"."remove_organization_rest"(text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "playbook"."organizations_with_work"(text, text, integer), "playbook"."remove_organization_rest"(text, text) TO closeline_playbook;
--> statement-breakpoint

-- Hints for rows that exist already. Row-level security is forced on the owner too, so it is
-- lifted for these four tables for the backfill only, inside the migration's transaction.
ALTER TABLE "playbook"."documents" NO FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."ingestion_jobs" NO FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."consumed_message" NO FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."idempotency_keys" NO FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
INSERT INTO "playbook"."work_hints" ("kind", "organization_id", "due_at")
  SELECT 'purge_due', d."organization_id", min(greatest(d."purge_due_at", coalesce(d."purge_lease_until", d."purge_due_at")))
    FROM "playbook"."documents" d WHERE d."state" = 'deleted' AND d."purge_attempts" < 20 GROUP BY d."organization_id"
  UNION ALL
  SELECT 'purge_spent', d."organization_id", min(d."updated_at")
    FROM "playbook"."documents" d WHERE d."state" = 'deleted' AND d."purge_attempts" >= 20 GROUP BY d."organization_id"
  UNION ALL
  SELECT 'cleanup_pending', d."organization_id", min(d."deleted_at") + interval '5 minutes'
    FROM "playbook"."documents" d WHERE d."state" = 'deleted' AND (d."vectors_removed_seq" IS NULL OR d."vectors_removed_seq" < d."deletion_seq") GROUP BY d."organization_id"
  UNION ALL
  SELECT 'jobs_due', j."organization_id", min(j."next_attempt_at")
    FROM "playbook"."ingestion_jobs" j WHERE j."state" IN ('queued', 'running') GROUP BY j."organization_id"
  UNION ALL
  SELECT 'consumed_purge', c."organization_id",
         least(min(c."completed_at") FILTER (WHERE c."state" = 'done') + interval '15 days', min(c."lease_expires_at") FILTER (WHERE c."state" = 'claimed'))
    FROM "playbook"."consumed_message" c GROUP BY c."organization_id"
  UNION ALL
  SELECT 'idempotency_purge', k."organization_id", min(k."created_at") + interval '24 hours'
    FROM "playbook"."idempotency_keys" k GROUP BY k."organization_id";
--> statement-breakpoint
ALTER TABLE "playbook"."documents" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."ingestion_jobs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."consumed_message" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."idempotency_keys" FORCE ROW LEVEL SECURITY;
