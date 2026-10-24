ALTER TABLE "core"."approval_decisions" ADD COLUMN "edited_body_sha256" text;--> statement-breakpoint
ALTER TABLE "playbook"."index_settings" ADD COLUMN "learn_from_agent_moments" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."approval_decisions" ADD CONSTRAINT "approval_decisions_edited_body_sha256_shape" CHECK ("core"."approval_decisions"."edited_body_sha256" is null or "core"."approval_decisions"."edited_body_sha256" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE "core"."approval_decisions" ADD CONSTRAINT "approval_decisions_edited_hash_matches_kind" CHECK (("core"."approval_decisions"."kind" = 'edit_approve') = ("core"."approval_decisions"."edited_body_sha256" is not null));
--> statement-breakpoint
-- The switch may change at any time, vectors written or not (the index_settings_final trigger
-- watches only the model, dimension and vectors_written_at); the column grants stay narrow.
GRANT UPDATE ("learn_from_agent_moments") ON "playbook"."index_settings" TO closeline_playbook;
