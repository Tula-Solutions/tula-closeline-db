ALTER TABLE "playbook"."documents" ADD COLUMN "page_count" integer;--> statement-breakpoint
-- The index is built inside the migration transaction (not CONCURRENTLY), which blocks writes to
-- playbook.documents while it builds; acceptable while the table is small.
CREATE INDEX "documents_state_list_idx" ON "playbook"."documents" USING btree ("organization_id","state","created_at","id") WHERE "playbook"."documents"."state" <> 'deleted';--> statement-breakpoint
ALTER TABLE "playbook"."documents" ADD CONSTRAINT "documents_page_count_positive" CHECK ("playbook"."documents"."page_count" > 0);--> statement-breakpoint
-- Hand-written: the ingestion complete and fail writes set the page count, so the role may update it.
GRANT UPDATE ("page_count") ON "playbook"."documents" TO closeline_playbook;
