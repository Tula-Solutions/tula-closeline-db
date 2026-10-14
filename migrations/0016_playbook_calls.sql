-- Speaker labels of a Call: at most 20, unique, none null, each 1 to 64 code points and at most 256
-- bytes (the contract's MAX_CALL_SPEAKERS, MAX_SPEAKER_LABEL_LENGTH and MAX_SPEAKER_LABEL_BYTES).
CREATE FUNCTION "playbook"."speaker_labels_ok"(p_labels text[]) RETURNS boolean
  LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = pg_catalog, pg_temp AS $$
  SELECT p_labels IS NOT NULL
    AND cardinality(p_labels) <= 20
    AND NOT EXISTS (SELECT 1 FROM unnest(p_labels) AS l
                     WHERE l IS NULL OR char_length(l) NOT BETWEEN 1 AND 64 OR octet_length(l) > 256)
    AND (SELECT count(DISTINCT l) FROM unnest(p_labels) AS l) = cardinality(p_labels)
$$;
--> statement-breakpoint
CREATE TABLE "playbook"."call_jobs" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"call_id" text NOT NULL,
	"kind" text NOT NULL,
	"epoch" integer NOT NULL,
	"rep_seq" integer DEFAULT 0 NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone NOT NULL,
	"claim_token" uuid,
	"failure_reason" text,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "call_jobs_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "call_jobs_id_shape" CHECK ("id" ~ '^cjob_[0-9a-f]{32}$'),
	CONSTRAINT "call_jobs_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "call_jobs_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "call_jobs_kind_known" CHECK ("playbook"."call_jobs"."kind" in ('transcribe', 'process', 'rebuild')),
	CONSTRAINT "call_jobs_state_known" CHECK ("playbook"."call_jobs"."state" in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
	CONSTRAINT "call_jobs_epoch_seq_bounds" CHECK ("playbook"."call_jobs"."epoch" >= 0 and "playbook"."call_jobs"."rep_seq" between 0 and 2147483647),
	CONSTRAINT "call_jobs_attempts_bounds" CHECK ("playbook"."call_jobs"."attempts" between 0 and 20),
	CONSTRAINT "call_jobs_running_has_token" CHECK (("playbook"."call_jobs"."state" = 'running') = ("playbook"."call_jobs"."claim_token" is not null)),
	CONSTRAINT "call_jobs_failure_reason_known" CHECK ("playbook"."call_jobs"."failure_reason" in ('no_turns', 'too_few_speakers', 'too_many_speakers', 'rep_label_not_found', 'not_per_side', 'too_long', 'transcription_failed', 'transcription_timed_out', 'unreadable', 'processing_failed')),
	CONSTRAINT "call_jobs_failed_has_reason" CHECK (("playbook"."call_jobs"."state" = 'failed') = ("playbook"."call_jobs"."failure_reason" is not null)),
	CONSTRAINT "call_jobs_final_has_finish" CHECK (("playbook"."call_jobs"."state" in ('succeeded', 'failed', 'cancelled')) = ("playbook"."call_jobs"."finished_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "playbook"."calls" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"deal_record_id" text NOT NULL,
	"kind" text NOT NULL,
	"file_name" text NOT NULL,
	"media_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"content_hash" "bytea" NOT NULL,
	"duration_seconds" integer,
	"state" text DEFAULT 'uploaded' NOT NULL,
	"failure_reason" text,
	"rep_by" text,
	"rep_label" text,
	"rep_channel" text,
	"speaker_labels" text[] DEFAULT '{}'::text[] NOT NULL,
	"uploaded_by" text NOT NULL,
	"object_key" text NOT NULL,
	"transcript_key" text,
	"epoch" integer DEFAULT 0 NOT NULL,
	"rep_seq" integer DEFAULT 0 NOT NULL,
	"deletion_seq" integer DEFAULT 0 NOT NULL,
	"vectors_removed_seq" integer,
	"tagged_outcome_seq" integer DEFAULT 0 NOT NULL,
	"sent_to_vendor_at" timestamp with time zone,
	"vendor_removed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"purge_due_at" timestamp with time zone,
	"purge_started_at" timestamp with time zone,
	"purge_lease_until" timestamp with time zone,
	"purge_attempts" integer DEFAULT 0 NOT NULL,
	"restore_barred_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calls_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "calls_id_shape" CHECK ("id" ~ '^call_[0-9a-f]{32}$'),
	CONSTRAINT "calls_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "calls_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "calls_deal_record_id_shape" CHECK ("deal_record_id" ~ '^deal_[0-9a-f]{32}$'),
	CONSTRAINT "calls_uploaded_by_shape" CHECK ("uploaded_by" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "calls_deleted_by_shape" CHECK ("playbook"."calls"."deleted_by" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "calls_kind_known" CHECK ("playbook"."calls"."kind" in ('transcript', 'recording')),
	CONSTRAINT "calls_media_type_known" CHECK ("playbook"."calls"."media_type" in ('text/plain', 'text/vtt', 'application/x-subrip', 'application/json', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/flac')),
	CONSTRAINT "calls_kind_matches_media_type" CHECK (("playbook"."calls"."kind" = 'recording') = ("playbook"."calls"."media_type" like 'audio/%')),
	CONSTRAINT "calls_file_name_shape" CHECK (char_length(btrim("playbook"."calls"."file_name")) between 1 and 255),
	CONSTRAINT "calls_content_hash_length" CHECK (octet_length("playbook"."calls"."content_hash") = 32),
	CONSTRAINT "calls_size_bounds" CHECK ("playbook"."calls"."size_bytes" between 1 and 524288000
        and ("playbook"."calls"."kind" = 'recording' or "playbook"."calls"."size_bytes" <= 5242880)),
	CONSTRAINT "calls_duration_bounds" CHECK ("playbook"."calls"."duration_seconds" is null or ("playbook"."calls"."duration_seconds" between 1 and 10800
        and "playbook"."calls"."kind" = 'recording')),
	CONSTRAINT "calls_state_known" CHECK ("playbook"."calls"."state" in ('uploaded', 'transcribing', 'awaiting_rep', 'processing', 'ready', 'failed', 'deleted')),
	CONSTRAINT "calls_failure_reason_known" CHECK ("playbook"."calls"."failure_reason" in ('no_turns', 'too_few_speakers', 'too_many_speakers', 'rep_label_not_found', 'not_per_side', 'too_long', 'transcription_failed', 'transcription_timed_out', 'unreadable', 'processing_failed')),
	CONSTRAINT "calls_failed_has_reason" CHECK (("playbook"."calls"."state" = 'failed') = ("playbook"."calls"."failure_reason" is not null)),
	CONSTRAINT "calls_transcript_states" CHECK ("playbook"."calls"."kind" = 'recording' or "playbook"."calls"."state" not in ('transcribing', 'awaiting_rep')),
	CONSTRAINT "calls_rep_shape" CHECK (("playbook"."calls"."rep_by" is null and "playbook"."calls"."rep_label" is null and "playbook"."calls"."rep_channel" is null)
        or ("playbook"."calls"."rep_by" = 'speaker' and "playbook"."calls"."rep_label" is not null and "playbook"."calls"."rep_channel" is null)
        or ("playbook"."calls"."rep_by" = 'channel' and "playbook"."calls"."rep_channel" is not null and "playbook"."calls"."rep_label" is null
            and "playbook"."calls"."kind" = 'recording')),
	CONSTRAINT "calls_rep_label_shape" CHECK ("playbook"."calls"."rep_label" is null or char_length("playbook"."calls"."rep_label") between 1 and 64
      and octet_length("playbook"."calls"."rep_label") <= 256),
	CONSTRAINT "calls_awaiting_rep_has_none" CHECK ("playbook"."calls"."state" <> 'awaiting_rep' or "playbook"."calls"."rep_by" is null),
	CONSTRAINT "calls_ready_has_rep" CHECK ("playbook"."calls"."state" <> 'ready' or "playbook"."calls"."rep_by" is not null),
	CONSTRAINT "calls_ready_label_listed" CHECK ("playbook"."calls"."state" <> 'ready' or "playbook"."calls"."rep_by" is distinct from 'speaker' or "playbook"."calls"."rep_label" = any("playbook"."calls"."speaker_labels")),
	CONSTRAINT "calls_speaker_labels_valid" CHECK (playbook.speaker_labels_ok("playbook"."calls"."speaker_labels")),
	CONSTRAINT "calls_too_many_speakers_lists_none" CHECK ("playbook"."calls"."failure_reason" is distinct from 'too_many_speakers' or cardinality("playbook"."calls"."speaker_labels") = 0),
	CONSTRAINT "calls_object_key_shape" CHECK (char_length("playbook"."calls"."object_key") between 1 and 1024 and "playbook"."calls"."object_key" collate "C" ~ '^[!-~]+$'),
	CONSTRAINT "calls_transcript_key_shape" CHECK (char_length("playbook"."calls"."transcript_key") between 1 and 1024 and "playbook"."calls"."transcript_key" collate "C" ~ '^[!-~]+$'),
	CONSTRAINT "calls_seq_bounds" CHECK ("playbook"."calls"."epoch" >= 0 and "playbook"."calls"."deletion_seq" >= 0
        and "playbook"."calls"."rep_seq" between 0 and 2147483647
        and "playbook"."calls"."tagged_outcome_seq" between 0 and 2147483647),
	CONSTRAINT "calls_vectors_removed_seq_bounds" CHECK ("playbook"."calls"."vectors_removed_seq" between 0 and "playbook"."calls"."deletion_seq"),
	CONSTRAINT "calls_deleted_has_times" CHECK (("playbook"."calls"."state" = 'deleted') = ("playbook"."calls"."deleted_at" is not null)
        and ("playbook"."calls"."state" = 'deleted') = ("playbook"."calls"."purge_due_at" is not null)),
	CONSTRAINT "calls_deleted_by_when_deleted" CHECK ("playbook"."calls"."state" = 'deleted' or "playbook"."calls"."deleted_by" is null),
	CONSTRAINT "calls_deleted_is_counted" CHECK ("playbook"."calls"."state" <> 'deleted' or "playbook"."calls"."deletion_seq" >= 1),
	CONSTRAINT "calls_purge_due_after_delete" CHECK ("playbook"."calls"."purge_due_at" >= "playbook"."calls"."deleted_at"),
	CONSTRAINT "calls_purge_only_when_deleted" CHECK (("playbook"."calls"."purge_started_at" is null or "playbook"."calls"."state" = 'deleted')
        and ("playbook"."calls"."purge_started_at" is null) = ("playbook"."calls"."purge_lease_until" is null)
        and ("playbook"."calls"."purge_started_at" is null) = ("playbook"."calls"."purge_attempts" = 0)),
	CONSTRAINT "calls_purge_attempts_bounds" CHECK ("playbook"."calls"."purge_attempts" between 0 and 20),
	CONSTRAINT "calls_barred_only_when_deleted" CHECK ("playbook"."calls"."restore_barred_at" is null or "playbook"."calls"."state" = 'deleted'),
	CONSTRAINT "calls_vendor_removal_after_send" CHECK ("playbook"."calls"."vendor_removed_at" is null or "playbook"."calls"."sent_to_vendor_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "playbook"."work_hints" DROP CONSTRAINT "work_hints_kind_known";--> statement-breakpoint
ALTER TABLE "playbook"."deals" ADD COLUMN "retag_through" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "playbook"."organization_usage" ADD COLUMN "call_count" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "playbook"."organization_usage" ADD COLUMN "recording_byte_count" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "playbook"."call_jobs" ADD CONSTRAINT "call_jobs_call_fk" FOREIGN KEY ("organization_id","call_id") REFERENCES "playbook"."calls"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook"."calls" ADD CONSTRAINT "calls_deal_fk" FOREIGN KEY ("organization_id","deal_record_id") REFERENCES "playbook"."deals"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_jobs_call_idx" ON "playbook"."call_jobs" USING btree ("organization_id","call_id");--> statement-breakpoint
CREATE UNIQUE INDEX "call_jobs_active_call_key" ON "playbook"."call_jobs" USING btree ("organization_id","call_id") WHERE "playbook"."call_jobs"."state" in ('queued', 'running');--> statement-breakpoint
CREATE INDEX "call_jobs_due_idx" ON "playbook"."call_jobs" USING btree ("organization_id","next_attempt_at") WHERE "playbook"."call_jobs"."state" in ('queued', 'running');--> statement-breakpoint
CREATE UNIQUE INDEX "calls_content_hash_key" ON "playbook"."calls" USING btree ("organization_id","content_hash") WHERE "playbook"."calls"."purge_started_at" is null and "playbook"."calls"."restore_barred_at" is null;--> statement-breakpoint
CREATE INDEX "calls_list_idx" ON "playbook"."calls" USING btree ("organization_id","created_at","id") WHERE "playbook"."calls"."state" <> 'deleted';--> statement-breakpoint
CREATE INDEX "calls_state_list_idx" ON "playbook"."calls" USING btree ("organization_id","state","created_at","id");--> statement-breakpoint
CREATE INDEX "calls_deal_list_idx" ON "playbook"."calls" USING btree ("organization_id","deal_record_id","created_at","id") WHERE "playbook"."calls"."state" <> 'deleted';--> statement-breakpoint
CREATE INDEX "calls_purge_idx" ON "playbook"."calls" USING btree ("organization_id","purge_due_at","id") WHERE "playbook"."calls"."state" = 'deleted' and "playbook"."calls"."purge_attempts" < 20;--> statement-breakpoint
CREATE INDEX "calls_unbarred_idx" ON "playbook"."calls" USING btree ("organization_id","id") WHERE "playbook"."calls"."restore_barred_at" is null;--> statement-breakpoint
CREATE INDEX "calls_cleanup_idx" ON "playbook"."calls" USING btree ("organization_id","deleted_at","id") WHERE state = 'deleted' and (vectors_removed_seq is null or vectors_removed_seq < deletion_seq);--> statement-breakpoint
CREATE INDEX "calls_spent_purge_idx" ON "playbook"."calls" USING btree ("organization_id","id") WHERE "playbook"."calls"."state" = 'deleted' and "playbook"."calls"."purge_attempts" >= 20;--> statement-breakpoint
CREATE INDEX "calls_retag_idx" ON "playbook"."calls" USING btree ("organization_id","deal_record_id","id") WHERE "playbook"."calls"."state" = 'ready';--> statement-breakpoint
CREATE INDEX "deals_retag_idx" ON "playbook"."deals" USING btree ("organization_id","id") WHERE "playbook"."deals"."retag_through" < "playbook"."deals"."outcome_seq";--> statement-breakpoint
ALTER TABLE "playbook"."deals" ADD CONSTRAINT "deals_retag_through_range" CHECK ("playbook"."deals"."retag_through" between 0 and "playbook"."deals"."outcome_seq");--> statement-breakpoint
ALTER TABLE "playbook"."organization_usage" ADD CONSTRAINT "organization_usage_call_counts_not_negative" CHECK ("playbook"."organization_usage"."call_count" >= 0 and "playbook"."organization_usage"."recording_byte_count" >= 0);--> statement-breakpoint
ALTER TABLE "playbook"."work_hints" ADD CONSTRAINT "work_hints_kind_known" CHECK ("playbook"."work_hints"."kind" in ('purge_due', 'jobs_due', 'cleanup_pending', 'consumed_purge', 'idempotency_purge', 'purge_spent', 'orphan_sweep', 'import_apply', 'call_jobs', 'call_purge', 'call_cleanup', 'call_purge_spent', 'outcome_retag'));
--> statement-breakpoint
-- Everything below is hand-written (Drizzle cannot express it), appended after the generated SQL
-- as 0009 to 0015 do. Run as closeline_owner.
--
-- 0016 is the Calls half of the sales-history storage (hub issue 68): Calls (metadata only), their
-- jobs, the quota counts, the work hints and the erasure of Calls.

ALTER TABLE "playbook"."calls" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."calls" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "calls_tenant_isolation" ON "playbook"."calls" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "playbook"."call_jobs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."call_jobs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "call_jobs_tenant_isolation" ON "playbook"."call_jobs" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint

-- Privileges. The schema's default privileges give closeline_playbook SELECT, INSERT, UPDATE and
-- DELETE on every new table; what follows only takes privileges away.
--
-- calls: the role updates only the columns that move, never the identity (the Deal, the file, the
-- hash, the uploader, the object key, the creation time) and deletes (a purge removes the row).
REVOKE UPDATE ON "playbook"."calls" FROM closeline_playbook;
--> statement-breakpoint
GRANT UPDATE ("state", "failure_reason", "duration_seconds", "rep_by", "rep_label", "rep_channel", "speaker_labels", "transcript_key", "epoch", "rep_seq", "deletion_seq", "vectors_removed_seq", "tagged_outcome_seq", "sent_to_vendor_at", "vendor_removed_at", "deleted_at", "deleted_by", "purge_due_at", "purge_started_at", "purge_lease_until", "purge_attempts", "restore_barred_at", "updated_at") ON "playbook"."calls" TO closeline_playbook;
--> statement-breakpoint
-- call_jobs: the role updates what moves a job along; rows go with their Call (the cascade).
REVOKE UPDATE, DELETE ON "playbook"."call_jobs" FROM closeline_playbook;
--> statement-breakpoint
GRANT UPDATE ("state", "attempts", "next_attempt_at", "claim_token", "failure_reason", "finished_at", "updated_at") ON "playbook"."call_jobs" TO closeline_playbook;
--> statement-breakpoint
-- deals: the re-tag marker moves too.
GRANT UPDATE ("retag_through") ON "playbook"."deals" TO closeline_playbook;
--> statement-breakpoint

-- Quota counts of Calls and Recording bytes, moved by an AFTER ROW trigger in the statement's own
-- transaction, as the document and Deal counts are: a soft-deleted Call and one in awaiting_rep
-- count until purged or erased.
CREATE FUNCTION "playbook"."track_call_usage"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO "playbook"."organization_usage" AS u ("organization_id", "call_count", "recording_byte_count")
      VALUES (NEW."organization_id", 1, CASE WHEN NEW."kind" = 'recording' THEN NEW."size_bytes" ELSE 0 END)
      ON CONFLICT ("organization_id") DO UPDATE
        SET "call_count" = u."call_count" + 1,
            "recording_byte_count" = u."recording_byte_count" + CASE WHEN NEW."kind" = 'recording' THEN NEW."size_bytes" ELSE 0 END,
            "updated_at" = clock_timestamp();
  ELSE
    UPDATE "playbook"."organization_usage" AS u
      SET "call_count" = u."call_count" - 1,
          "recording_byte_count" = u."recording_byte_count" - CASE WHEN OLD."kind" = 'recording' THEN OLD."size_bytes" ELSE 0 END,
          "updated_at" = clock_timestamp()
      WHERE u."organization_id" = OLD."organization_id";
    IF NOT FOUND THEN
      RAISE EXCEPTION 'playbook.usage_missing: no usage row for the Organization of a removed Call'
        USING ERRCODE = 'check_violation', CONSTRAINT = 'organization_usage_track';
    END IF;
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "calls_track_usage" AFTER INSERT OR DELETE ON "playbook"."calls"
  FOR EACH ROW EXECUTE FUNCTION "playbook"."track_call_usage"();
--> statement-breakpoint

-- A Call's identity is final, and its epoch, deletion sequence, Rep sequence and tag sequence only
-- go up: a queued cleanup, rebuild or re-tag compares them, so they must not move back.
CREATE FUNCTION "playbook"."refuse_call_change"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'playbook.call_identity: a Call''s identity never changes, and its epoch and sequences never go down'
    USING ERRCODE = 'check_violation', CONSTRAINT = 'calls_identity_final';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "calls_identity_final" BEFORE UPDATE ON "playbook"."calls"
  FOR EACH ROW WHEN (
    ROW(OLD."id", OLD."organization_id", OLD."deal_record_id", OLD."kind", OLD."file_name", OLD."media_type", OLD."size_bytes", OLD."content_hash", OLD."uploaded_by", OLD."object_key", OLD."created_at")
      IS DISTINCT FROM ROW(NEW."id", NEW."organization_id", NEW."deal_record_id", NEW."kind", NEW."file_name", NEW."media_type", NEW."size_bytes", NEW."content_hash", NEW."uploaded_by", NEW."object_key", NEW."created_at")
    OR NEW."epoch" < OLD."epoch" OR NEW."deletion_seq" < OLD."deletion_seq"
    OR NEW."rep_seq" < OLD."rep_seq" OR NEW."tagged_outcome_seq" < OLD."tagged_outcome_seq")
  EXECUTE FUNCTION "playbook"."refuse_call_change"();
--> statement-breakpoint

-- Every Call insert holds the Organization upload lock, once per statement (the quota counts are read
-- under it), as the Deal insert does.
CREATE FUNCTION "playbook"."require_call_insert_lock"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  PERFORM "playbook"."require_upload_lock"(o."organization_id")
    FROM (SELECT DISTINCT "organization_id" FROM inserted_calls) o;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "calls_require_lock" AFTER INSERT ON "playbook"."calls"
  REFERENCING NEW TABLE AS inserted_calls FOR EACH STATEMENT EXECUTE FUNCTION "playbook"."require_call_insert_lock"();
--> statement-breakpoint

-- Work hints, as for documents. A deleted Call is the only kind of Call row that carries purge,
-- cleanup or spent-purge work, and only updates produce one.
CREATE FUNCTION "playbook"."note_call_work"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF NEW."purge_attempts" < 20 THEN
    PERFORM "playbook"."note_work"('call_purge', NEW."organization_id",
      greatest(NEW."purge_due_at", coalesce(NEW."purge_lease_until", NEW."purge_due_at")));
  ELSE
    PERFORM "playbook"."note_work"('call_purge_spent', NEW."organization_id", clock_timestamp());
  END IF;
  IF NEW."vectors_removed_seq" IS NULL OR NEW."vectors_removed_seq" < NEW."deletion_seq" THEN
    PERFORM "playbook"."note_work"('call_cleanup', NEW."organization_id", NEW."deleted_at" + interval '5 minutes');
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "calls_note_work" AFTER UPDATE ON "playbook"."calls"
  FOR EACH ROW WHEN (NEW."state" = 'deleted') EXECUTE FUNCTION "playbook"."note_call_work"();
--> statement-breakpoint
-- An active Call job is work from its due time (queued) or its lease end (running).
CREATE FUNCTION "playbook"."note_call_job_work"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  PERFORM "playbook"."note_work"('call_jobs', NEW."organization_id", NEW."next_attempt_at");
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "call_jobs_note_work_insert" AFTER INSERT ON "playbook"."call_jobs"
  FOR EACH ROW WHEN (NEW."state" IN ('queued', 'running')) EXECUTE FUNCTION "playbook"."note_call_job_work"();
--> statement-breakpoint
CREATE TRIGGER "call_jobs_note_work_update" AFTER UPDATE ON "playbook"."call_jobs"
  FOR EACH ROW WHEN (NEW."state" IN ('queued', 'running')
    AND (OLD."state" IS DISTINCT FROM NEW."state" OR NEW."next_attempt_at" < OLD."next_attempt_at"))
  EXECUTE FUNCTION "playbook"."note_call_job_work"();
--> statement-breakpoint
-- A Deal whose Outcome changed (or whose marker was lowered by a Call that became ready with a stale
-- tag) needs a re-tag: noted now, in the same transaction as the change.
CREATE FUNCTION "playbook"."note_deal_retag"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  PERFORM "playbook"."note_work"('outcome_retag', NEW."organization_id", clock_timestamp());
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "deals_note_retag" AFTER UPDATE ON "playbook"."deals"
  FOR EACH ROW WHEN (NEW."retag_through" < NEW."outcome_seq"
    AND (NEW."outcome_seq" <> OLD."outcome_seq" OR NEW."retag_through" < OLD."retag_through"))
  EXECUTE FUNCTION "playbook"."note_deal_retag"();
--> statement-breakpoint

-- Work discovery: the five Call kinds (call_jobs, call_purge, call_cleanup, call_purge_spent,
-- outcome_retag), each verified in the Organization's own scope against the index named in the
-- README.
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
  IF p_kind IS NULL OR p_kind NOT IN ('purge_due', 'jobs_due', 'cleanup_pending', 'consumed_purge', 'idempotency_purge', 'purge_spent', 'orphan_sweep', 'import_apply', 'call_jobs', 'call_purge', 'call_cleanup', 'call_purge_spent', 'outcome_retag') THEN
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
    ELSIF p_kind = 'call_jobs' THEN
      SELECT min(j."next_attempt_at") INTO v_next FROM "playbook"."call_jobs" j
        WHERE j."organization_id" = v_hint.org AND j."state" IN ('queued', 'running');
    ELSIF p_kind = 'call_purge' THEN
      SELECT min(greatest(c."purge_due_at", coalesce(c."purge_lease_until", c."purge_due_at"))) INTO v_next
        FROM "playbook"."calls" c
        WHERE c."organization_id" = v_hint.org AND c."state" = 'deleted' AND c."purge_attempts" < 20;
    ELSIF p_kind = 'call_cleanup' THEN
      SELECT min(c."deleted_at") + interval '5 minutes' INTO v_next FROM "playbook"."calls" c
        WHERE c."organization_id" = v_hint.org AND c."state" = 'deleted'
          AND (c."vectors_removed_seq" IS NULL OR c."vectors_removed_seq" < c."deletion_seq");
    ELSIF p_kind = 'call_purge_spent' THEN
      SELECT min(c."updated_at") INTO v_next FROM "playbook"."calls" c
        WHERE c."organization_id" = v_hint.org AND c."state" = 'deleted' AND c."purge_attempts" >= 20;
    ELSIF p_kind = 'outcome_retag' THEN
      -- A Deal needs a re-tag while retag_through < outcome_seq (deals_retag_idx): work now.
      SELECT v_hint.due INTO v_next
        WHERE EXISTS (SELECT 1 FROM "playbook"."deals" d
                       WHERE d."organization_id" = v_hint.org AND d."retag_through" < d."outcome_seq");
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

-- Erasure: the replaced function also refuses while a Call remains.
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
  -- Calls, Deals, imports and their rows are removed in bounded batches first (erase_deals, the import
  -- erase and purge statements); this function refuses while any is left, so it never does work
  -- proportional to the Organization's size.
  IF EXISTS (SELECT 1 FROM "playbook"."documents" d WHERE d."organization_id" = p_organization_id)
     OR EXISTS (SELECT 1 FROM "playbook"."deal_imports" i WHERE i."organization_id" = p_organization_id)
     OR EXISTS (SELECT 1 FROM "playbook"."deals" e WHERE e."organization_id" = p_organization_id)
     OR EXISTS (SELECT 1 FROM "playbook"."calls" k WHERE k."organization_id" = p_organization_id) THEN
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
REVOKE ALL ON FUNCTION "playbook"."organizations_with_work"(text, text, integer), "playbook"."remove_organization_rest"(text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "playbook"."organizations_with_work"(text, text, integer), "playbook"."remove_organization_rest"(text, text) TO closeline_playbook;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "playbook"."track_call_usage"(), "playbook"."refuse_call_change"(), "playbook"."require_call_insert_lock"(), "playbook"."note_call_work"(), "playbook"."note_call_job_work"(), "playbook"."note_deal_retag"(), "playbook"."speaker_labels_ok"(text[]) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "playbook"."speaker_labels_ok"(text[]) TO closeline_playbook;
