CREATE TABLE "playbook"."documents" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"state" text DEFAULT 'uploaded' NOT NULL,
	"content_hash" "bytea" NOT NULL,
	"size_bytes" bigint NOT NULL,
	"declared_type" text NOT NULL,
	"detected_type" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"object_key" text NOT NULL,
	"failure_reason" text,
	"epoch" integer DEFAULT 0 NOT NULL,
	"deletion_seq" integer DEFAULT 0 NOT NULL,
	"vectors_removed_seq" integer,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"purge_due_at" timestamp with time zone,
	"purge_started_at" timestamp with time zone,
	"purge_lease_until" timestamp with time zone,
	"purge_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "documents_id_shape" CHECK ("id" ~ '^doc_[0-9a-f]{32}$'),
	CONSTRAINT "documents_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "documents_uploaded_by_shape" CHECK ("uploaded_by" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "documents_deleted_by_shape" CHECK ("playbook"."documents"."deleted_by" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "documents_name_shape" CHECK (char_length(btrim("playbook"."documents"."name")) between 1 and 255),
	CONSTRAINT "documents_state_known" CHECK ("playbook"."documents"."state" in ('uploaded', 'processing', 'ready', 'failed', 'deleted')),
	CONSTRAINT "documents_content_hash_length" CHECK (octet_length("playbook"."documents"."content_hash") = 32),
	CONSTRAINT "documents_size_bounds" CHECK ("playbook"."documents"."size_bytes" between 1 and 26214400),
	CONSTRAINT "documents_declared_type_shape" CHECK (char_length("playbook"."documents"."declared_type") between 1 and 255 and "playbook"."documents"."declared_type" collate "C" ~ '^[ -~]+$'),
	CONSTRAINT "documents_detected_type_known" CHECK ("playbook"."documents"."detected_type" in ('pdf', 'docx', 'pptx', 'txt', 'md')),
	CONSTRAINT "documents_object_key_shape" CHECK (char_length("playbook"."documents"."object_key") between 1 and 1024 and "playbook"."documents"."object_key" collate "C" ~ '^[!-~]+$'),
	CONSTRAINT "documents_failure_reason_known" CHECK ("playbook"."documents"."failure_reason" in ('too_many_pages', 'unreadable', 'password_protected', 'no_text', 'processing_failed')),
	CONSTRAINT "documents_failed_has_reason" CHECK (("playbook"."documents"."state" = 'failed') = ("playbook"."documents"."failure_reason" is not null)),
	CONSTRAINT "documents_epoch_bounds" CHECK ("playbook"."documents"."epoch" >= 0 and "playbook"."documents"."deletion_seq" >= 0),
	CONSTRAINT "documents_vectors_removed_seq_bounds" CHECK ("playbook"."documents"."vectors_removed_seq" between 0 and "playbook"."documents"."deletion_seq"),
	CONSTRAINT "documents_deleted_has_times" CHECK (("playbook"."documents"."state" = 'deleted') = ("playbook"."documents"."deleted_at" is not null)
        and ("playbook"."documents"."state" = 'deleted') = ("playbook"."documents"."purge_due_at" is not null)),
	CONSTRAINT "documents_deleted_by_when_deleted" CHECK ("playbook"."documents"."state" = 'deleted' or "playbook"."documents"."deleted_by" is null),
	CONSTRAINT "documents_deleted_is_counted" CHECK (("playbook"."documents"."state" <> 'deleted') or "playbook"."documents"."deletion_seq" >= 1),
	CONSTRAINT "documents_purge_due_after_delete" CHECK ("playbook"."documents"."purge_due_at" >= "playbook"."documents"."deleted_at"),
	CONSTRAINT "documents_purge_only_when_deleted" CHECK (("playbook"."documents"."purge_started_at" is null or "playbook"."documents"."state" = 'deleted')
        and ("playbook"."documents"."purge_started_at" is null) = ("playbook"."documents"."purge_lease_until" is null)
        and ("playbook"."documents"."purge_started_at" is null) = ("playbook"."documents"."purge_attempts" = 0)),
	CONSTRAINT "documents_purge_attempts_bounds" CHECK ("playbook"."documents"."purge_attempts" between 0 and 20)
);
--> statement-breakpoint
CREATE TABLE "playbook"."index_settings" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"embedding_model" text NOT NULL,
	"embedding_dimension" integer NOT NULL,
	"vectors_written_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "index_settings_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "index_settings_model_shape" CHECK (char_length("playbook"."index_settings"."embedding_model") between 1 and 200 and "playbook"."index_settings"."embedding_model" collate "C" ~ '^[A-Za-z0-9._:/-]+$'),
	CONSTRAINT "index_settings_dimension_bounds" CHECK ("playbook"."index_settings"."embedding_dimension" between 1 and 16384)
);
--> statement-breakpoint
CREATE TABLE "playbook"."ingestion_jobs" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"document_id" text NOT NULL,
	"epoch" integer NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"step" text DEFAULT 'parse' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone NOT NULL,
	"claim_token" uuid,
	"artifact_key" text,
	"page_count" integer,
	"chunk_count" integer,
	"chunks_done" integer DEFAULT 0 NOT NULL,
	"failure_reason" text,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingestion_jobs_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "ingestion_jobs_id_shape" CHECK ("id" ~ '^job_[0-9a-f]{32}$'),
	CONSTRAINT "ingestion_jobs_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "ingestion_jobs_epoch_bounds" CHECK ("playbook"."ingestion_jobs"."epoch" >= 0),
	CONSTRAINT "ingestion_jobs_state_known" CHECK ("playbook"."ingestion_jobs"."state" in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
	CONSTRAINT "ingestion_jobs_step_known" CHECK ("playbook"."ingestion_jobs"."step" in ('parse', 'chunk', 'embed', 'index')),
	CONSTRAINT "ingestion_jobs_attempts_bounds" CHECK ("playbook"."ingestion_jobs"."attempts" between 0 and 20),
	CONSTRAINT "ingestion_jobs_running_has_token" CHECK (("playbook"."ingestion_jobs"."state" = 'running') = ("playbook"."ingestion_jobs"."claim_token" is not null)),
	CONSTRAINT "ingestion_jobs_artifact_key_shape" CHECK (char_length("playbook"."ingestion_jobs"."artifact_key") between 1 and 1024 and "playbook"."ingestion_jobs"."artifact_key" collate "C" ~ '^[!-~]+$'),
	CONSTRAINT "ingestion_jobs_counts_bounds" CHECK ("playbook"."ingestion_jobs"."page_count" between 1 and 100000
        and "playbook"."ingestion_jobs"."chunk_count" between 0 and 1000000
        and "playbook"."ingestion_jobs"."chunks_done" >= 0 and "playbook"."ingestion_jobs"."chunks_done" <= coalesce("playbook"."ingestion_jobs"."chunk_count", 0)),
	CONSTRAINT "ingestion_jobs_failure_reason_known" CHECK ("playbook"."ingestion_jobs"."failure_reason" in ('too_many_pages', 'unreadable', 'password_protected', 'no_text', 'processing_failed')),
	CONSTRAINT "ingestion_jobs_failed_has_reason" CHECK (("playbook"."ingestion_jobs"."state" = 'failed') = ("playbook"."ingestion_jobs"."failure_reason" is not null)),
	CONSTRAINT "ingestion_jobs_final_has_finish" CHECK (("playbook"."ingestion_jobs"."state" in ('succeeded', 'failed', 'cancelled')) = ("playbook"."ingestion_jobs"."finished_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "playbook"."organization_usage" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"document_count" bigint DEFAULT 0 NOT NULL,
	"byte_count" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_usage_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "organization_usage_not_negative" CHECK ("playbook"."organization_usage"."document_count" >= 0 and "playbook"."organization_usage"."byte_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "playbook"."ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_document_fk" FOREIGN KEY ("organization_id","document_id") REFERENCES "playbook"."documents"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "documents_content_hash_key" ON "playbook"."documents" USING btree ("organization_id","content_hash") WHERE "playbook"."documents"."purge_started_at" is null;--> statement-breakpoint
CREATE INDEX "documents_list_idx" ON "playbook"."documents" USING btree ("organization_id","created_at","id") WHERE "playbook"."documents"."state" <> 'deleted';--> statement-breakpoint
CREATE INDEX "documents_purge_idx" ON "playbook"."documents" USING btree ("organization_id","purge_due_at","id") WHERE "playbook"."documents"."state" = 'deleted' and "playbook"."documents"."purge_attempts" < 20;--> statement-breakpoint
CREATE INDEX "ingestion_jobs_document_idx" ON "playbook"."ingestion_jobs" USING btree ("organization_id","document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_jobs_active_document_key" ON "playbook"."ingestion_jobs" USING btree ("organization_id","document_id") WHERE "playbook"."ingestion_jobs"."state" in ('queued', 'running');--> statement-breakpoint
CREATE INDEX "ingestion_jobs_due_idx" ON "playbook"."ingestion_jobs" USING btree ("organization_id","next_attempt_at") WHERE "playbook"."ingestion_jobs"."state" in ('queued', 'running');
--> statement-breakpoint
-- Everything below is hand-written (Drizzle cannot express it), appended after the generated SQL
-- as 0002 and 0004 do. Run as closeline_owner.

-- Row-level security: the one canonical fail-closed policy on every table, written by
-- tenantRlsStatements. Each is a tenant table (every row belongs to one Organization), so the
-- catalog check needs no allowlist entry.
ALTER TABLE "playbook"."documents" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."documents" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "documents_tenant_isolation" ON "playbook"."documents" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "playbook"."organization_usage" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."organization_usage" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "organization_usage_tenant_isolation" ON "playbook"."organization_usage" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "playbook"."ingestion_jobs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."ingestion_jobs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "ingestion_jobs_tenant_isolation" ON "playbook"."ingestion_jobs" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "playbook"."index_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."index_settings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "index_settings_tenant_isolation" ON "playbook"."index_settings" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint

-- Privileges. The schema's default privileges give closeline_playbook SELECT, INSERT, UPDATE and
-- DELETE on every new playbook table (TRUNCATE is not among them), and closeline_auth and
-- closeline_core have no privilege on the schema at all. What follows only takes privileges away.
--
-- documents: a document's identity (id, Organization, name, hash, size, types, uploader, object
-- key, creation time) never changes, so the role may update only the columns the lifecycle moves.
-- It may delete only a soft-deleted document (a restrictive policy, ANDed with the tenant policy),
-- so a live document cannot be dropped by a stray statement.
REVOKE UPDATE ON "playbook"."documents" FROM closeline_playbook;
--> statement-breakpoint
GRANT UPDATE ("state", "failure_reason", "epoch", "deletion_seq", "vectors_removed_seq", "deleted_at", "deleted_by", "purge_due_at", "purge_started_at", "purge_lease_until", "purge_attempts", "updated_at") ON "playbook"."documents" TO closeline_playbook;
--> statement-breakpoint
CREATE POLICY "documents_deleted_only" ON "playbook"."documents" AS RESTRICTIVE FOR DELETE TO PUBLIC USING ("state" = 'deleted');
--> statement-breakpoint
-- organization_usage is written only by the documents triggers below (SECURITY DEFINER, as the
-- owner): the role can read its counts and nothing else.
REVOKE INSERT, UPDATE, DELETE ON "playbook"."organization_usage" FROM closeline_playbook;
--> statement-breakpoint
-- ingestion_jobs: the role updates only the columns that move a job along, and cannot delete one
-- (a purge removes a document's jobs by the foreign key's cascade).
REVOKE UPDATE, DELETE ON "playbook"."ingestion_jobs" FROM closeline_playbook;
--> statement-breakpoint
GRANT UPDATE ("state", "step", "attempts", "next_attempt_at", "claim_token", "artifact_key", "page_count", "chunk_count", "chunks_done", "failure_reason", "finished_at", "updated_at") ON "playbook"."ingestion_jobs" TO closeline_playbook;
--> statement-breakpoint
-- index_settings: no delete (deleting and re-inserting would change the model under existing
-- vectors), and no update of the Organization or creation time.
REVOKE UPDATE, DELETE ON "playbook"."index_settings" FROM closeline_playbook;
--> statement-breakpoint
GRANT UPDATE ("embedding_model", "embedding_dimension", "vectors_written_at", "updated_at") ON "playbook"."index_settings" TO closeline_playbook;
--> statement-breakpoint

-- Quota counts. One row per Organization in organization_usage, moved by an AFTER ROW trigger in
-- the statement's own transaction, so a rollback undoes both and no statement, however written,
-- can leave the count out of step with the table. Size never changes (the identity trigger below),
-- so inserts and deletes are the only moves. The function is SECURITY DEFINER because the role
-- cannot write the counts; it runs as the owner, which row-level security also binds, and the
-- transaction is already scoped to the row's Organization. A TRUNCATE of documents skips the row
-- trigger: only the owner can run it, and must truncate organization_usage with it.
CREATE FUNCTION "playbook"."track_organization_usage"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO "playbook"."organization_usage" AS u ("organization_id", "document_count", "byte_count")
      VALUES (NEW."organization_id", 1, NEW."size_bytes")
      ON CONFLICT ("organization_id") DO UPDATE
        SET "document_count" = u."document_count" + 1,
            "byte_count" = u."byte_count" + NEW."size_bytes",
            "updated_at" = clock_timestamp();
  ELSE
    UPDATE "playbook"."organization_usage" AS u
      SET "document_count" = u."document_count" - 1,
          "byte_count" = u."byte_count" - OLD."size_bytes",
          "updated_at" = clock_timestamp()
      WHERE u."organization_id" = OLD."organization_id";
    IF NOT FOUND THEN
      RAISE EXCEPTION 'playbook.usage_missing: no usage row for the Organization of a removed document'
        USING ERRCODE = 'check_violation', CONSTRAINT = 'organization_usage_track';
    END IF;
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "documents_track_usage" AFTER INSERT OR DELETE ON "playbook"."documents"
  FOR EACH ROW EXECUTE FUNCTION "playbook"."track_organization_usage"();
--> statement-breakpoint
-- A document's identity is final, and its epoch and deletion sequence only go up: a cleanup
-- queued for a deletion compares them, so they must not move back.
CREATE FUNCTION "playbook"."refuse_document_identity_change"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'playbook.document_identity: a document''s identity never changes, and its epoch and deletion sequence never go down'
    USING ERRCODE = 'check_violation', CONSTRAINT = 'documents_identity_final';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "documents_identity_final" BEFORE UPDATE ON "playbook"."documents"
  FOR EACH ROW WHEN (
    ROW(OLD."id", OLD."organization_id", OLD."name", OLD."content_hash", OLD."size_bytes", OLD."declared_type", OLD."detected_type", OLD."uploaded_by", OLD."object_key", OLD."created_at")
      IS DISTINCT FROM ROW(NEW."id", NEW."organization_id", NEW."name", NEW."content_hash", NEW."size_bytes", NEW."declared_type", NEW."detected_type", NEW."uploaded_by", NEW."object_key", NEW."created_at")
    OR NEW."epoch" < OLD."epoch" OR NEW."deletion_seq" < OLD."deletion_seq")
  EXECUTE FUNCTION "playbook"."refuse_document_identity_change"();
--> statement-breakpoint
-- Once vectors exist the embedding model and dimension are final (ADR 0010: vectors of two models
-- cannot be compared). The choice is to refuse, not to record that a re-index is needed: a
-- re-index is an operator's migration of the vector store, not a statement.
CREATE FUNCTION "playbook"."refuse_index_settings_change"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'playbook.index_settings_final: vectors exist, so the embedding model and dimension cannot change'
    USING ERRCODE = 'check_violation', CONSTRAINT = 'index_settings_final';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "index_settings_final" BEFORE UPDATE ON "playbook"."index_settings"
  FOR EACH ROW WHEN (
    OLD."vectors_written_at" IS NOT NULL
    AND ROW(OLD."embedding_model", OLD."embedding_dimension", OLD."vectors_written_at")
      IS DISTINCT FROM ROW(NEW."embedding_model", NEW."embedding_dimension", NEW."vectors_written_at"))
  EXECUTE FUNCTION "playbook"."refuse_index_settings_change"();
--> statement-breakpoint
-- Only the triggers run them: no role calls them directly.
REVOKE ALL ON FUNCTION "playbook"."track_organization_usage"(), "playbook"."refuse_document_identity_change"(), "playbook"."refuse_index_settings_change"() FROM PUBLIC;
