-- Indexes for two foreign keys that had none, so a delete or check of the referenced row no longer
-- scans the referencing table. The builds run in the migration transaction (no CONCURRENTLY) and
-- block writes to core.crm_sync_run and outbound.drafts meanwhile.
CREATE INDEX "crm_sync_runs_retry_of_idx" ON "core"."crm_sync_run" USING btree ("organization_id","retry_of_run_id");--> statement-breakpoint
CREATE INDEX "drafts_brand_voice_idx" ON "outbound"."drafts" USING btree ("organization_id","brand_voice_id","voice_version");