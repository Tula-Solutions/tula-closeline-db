CREATE TABLE "core"."crm_connection" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"provider" text NOT NULL,
	"state" text DEFAULT 'connected' NOT NULL,
	"external_account_id" text NOT NULL,
	"account_label" text,
	"scope_level" text DEFAULT 'read' NOT NULL,
	"access_token_sealed" "bytea",
	"refresh_token_sealed" "bytea",
	"token_key_id" text,
	"access_token_expires_at" timestamp with time zone,
	"connected_by_membership_id" text NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_synced_at" timestamp with time zone,
	"needs_reconnect_since" timestamp with time zone,
	"stage_mapping_confirmed_by_membership_id" text,
	"stage_mapping_confirmed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_connection_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "crm_connection_id_shape" CHECK ("id" ~ '^crn_[0-9a-f]{32}$'),
	CONSTRAINT "crm_connection_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "crm_connection_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "crm_connection_provider_known" CHECK ("core"."crm_connection"."provider" in ('hubspot', 'salesforce')),
	CONSTRAINT "crm_connection_state_known" CHECK ("core"."crm_connection"."state" in ('connected', 'needs_reconnect')),
	CONSTRAINT "crm_connection_scope_level_known" CHECK ("core"."crm_connection"."scope_level" in ('read', 'read_write')),
	CONSTRAINT "crm_connection_external_account_id_shape" CHECK (char_length("external_account_id") between 1 and 128),
	CONSTRAINT "crm_connection_account_label_shape" CHECK ("core"."crm_connection"."account_label" is null or char_length("core"."crm_connection"."account_label") between 1 and 200),
	CONSTRAINT "crm_connection_connected_by_membership_id_shape" CHECK ("connected_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "crm_connection_stage_mapping_confirmed_by_shape" CHECK ("stage_mapping_confirmed_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "crm_connection_access_token_sealed_size" CHECK ("core"."crm_connection"."access_token_sealed" is null or octet_length("core"."crm_connection"."access_token_sealed") between 1 and 16384),
	CONSTRAINT "crm_connection_refresh_token_sealed_size" CHECK ("core"."crm_connection"."refresh_token_sealed" is null or octet_length("core"."crm_connection"."refresh_token_sealed") between 1 and 16384),
	CONSTRAINT "crm_connection_token_key_id_shape" CHECK ("core"."crm_connection"."token_key_id" is null or char_length("core"."crm_connection"."token_key_id") between 1 and 128),
	CONSTRAINT "crm_connection_sealed_tokens_have_key_id" CHECK (("core"."crm_connection"."access_token_sealed" is null and "core"."crm_connection"."refresh_token_sealed" is null) or "core"."crm_connection"."token_key_id" is not null),
	CONSTRAINT "crm_connection_access_expiry_needs_token" CHECK ("core"."crm_connection"."access_token_expires_at" is null or "core"."crm_connection"."access_token_sealed" is not null),
	CONSTRAINT "crm_connection_needs_reconnect_since" CHECK (("core"."crm_connection"."state" = 'needs_reconnect') = ("core"."crm_connection"."needs_reconnect_since" is not null)),
	CONSTRAINT "crm_connection_stage_mapping_confirmation" CHECK (("core"."crm_connection"."stage_mapping_confirmed_by_membership_id" is null) = ("core"."crm_connection"."stage_mapping_confirmed_at" is null))
);
--> statement-breakpoint
CREATE TABLE "core"."crm_external_ref" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"provider" text NOT NULL,
	"object_kind" text NOT NULL,
	"external_id" text,
	"local_id" text NOT NULL,
	"state" text DEFAULT 'linked' NOT NULL,
	"last_seen_version" text,
	"last_seen_at" timestamp with time zone,
	"write_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_external_ref_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "crm_external_ref_id_shape" CHECK ("id" ~ '^cxr_[0-9a-f]{32}$'),
	CONSTRAINT "crm_external_ref_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "crm_external_ref_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "crm_external_ref_connection_id_shape" CHECK ("connection_id" ~ '^crn_[0-9a-f]{32}$'),
	CONSTRAINT "crm_external_ref_provider_known" CHECK ("core"."crm_external_ref"."provider" in ('hubspot', 'salesforce')),
	CONSTRAINT "crm_external_ref_object_kind_known" CHECK ("core"."crm_external_ref"."object_kind" in ('deal', 'call', 'company', 'contact')),
	CONSTRAINT "crm_external_ref_state_known" CHECK ("core"."crm_external_ref"."state" in ('linked', 'pending_write', 'unlinked')),
	CONSTRAINT "crm_external_ref_external_id_shape" CHECK ("core"."crm_external_ref"."external_id" is null or char_length("core"."crm_external_ref"."external_id") between 1 and 128),
	CONSTRAINT "crm_external_ref_local_id_shape" CHECK (char_length("local_id") between 1 and 128),
	CONSTRAINT "crm_external_ref_last_seen_version_shape" CHECK ("core"."crm_external_ref"."last_seen_version" is null or char_length("core"."crm_external_ref"."last_seen_version") between 1 and 1024),
	CONSTRAINT "crm_external_ref_write_key_shape" CHECK ("core"."crm_external_ref"."write_key" is null or char_length("core"."crm_external_ref"."write_key") between 1 and 256),
	CONSTRAINT "crm_external_ref_state_columns" CHECK (("core"."crm_external_ref"."state" = 'pending_write' and "core"."crm_external_ref"."write_key" is not null)
        or ("core"."crm_external_ref"."state" in ('linked', 'unlinked') and "core"."crm_external_ref"."external_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "core"."crm_mapping" (
	"organization_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"outcome" text,
	"label" text,
	"direction" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_mapping_pkey" PRIMARY KEY("organization_id","connection_id","kind","key"),
	CONSTRAINT "crm_mapping_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "crm_mapping_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "crm_mapping_connection_id_shape" CHECK ("connection_id" ~ '^crn_[0-9a-f]{32}$'),
	CONSTRAINT "crm_mapping_kind_known" CHECK ("core"."crm_mapping"."kind" in ('stage', 'field')),
	CONSTRAINT "crm_mapping_key_shape" CHECK (char_length("key") between 1 and 128),
	CONSTRAINT "crm_mapping_outcome_known" CHECK ("core"."crm_mapping"."outcome" is null or "core"."crm_mapping"."outcome" in ('won', 'lost', 'open')),
	CONSTRAINT "crm_mapping_direction_known" CHECK ("core"."crm_mapping"."direction" is null or "core"."crm_mapping"."direction" in ('read_only', 'write_only', 'both')),
	CONSTRAINT "crm_mapping_label_shape" CHECK ("core"."crm_mapping"."label" is null or char_length("core"."crm_mapping"."label") between 1 and 200),
	CONSTRAINT "crm_mapping_kind_columns" CHECK (("core"."crm_mapping"."kind" = 'stage' and "core"."crm_mapping"."outcome" is not null and "core"."crm_mapping"."direction" is null)
        or ("core"."crm_mapping"."kind" = 'field' and "core"."crm_mapping"."direction" is not null and "core"."crm_mapping"."outcome" is null and "core"."crm_mapping"."label" is null and "core"."crm_mapping"."key" in ('deal.outcome', 'company.name', 'company.domain', 'company.industry', 'company.employeeCount', 'company.region', 'company.technologies', 'contact.firstName', 'contact.lastName', 'contact.jobTitle', 'contact.email', 'contact.phone', 'contact.linkedinUrl', 'activity.notes'))),
	CONSTRAINT "crm_mapping_notes_never_both" CHECK ("core"."crm_mapping"."key" <> 'activity.notes' or "core"."crm_mapping"."direction" is distinct from 'both')
);
--> statement-breakpoint
CREATE TABLE "core"."crm_sync_run" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"object_kind" text NOT NULL,
	"trigger" text NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"requested_by_membership_id" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_count" bigint DEFAULT 0 NOT NULL,
	"updated_count" bigint DEFAULT 0 NOT NULL,
	"skipped_count" bigint DEFAULT 0 NOT NULL,
	"failed_count" bigint DEFAULT 0 NOT NULL,
	"unlinked_count" bigint DEFAULT 0 NOT NULL,
	"skipped" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skipped_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"failures" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"failures_truncated" boolean DEFAULT false NOT NULL,
	"error_code" text,
	"retry_of_run_id" text,
	"cursor" text,
	CONSTRAINT "crm_sync_run_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "crm_sync_run_id_shape" CHECK ("id" ~ '^crun_[0-9a-f]{32}$'),
	CONSTRAINT "crm_sync_run_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "crm_sync_run_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "crm_sync_run_connection_id_shape" CHECK ("connection_id" ~ '^crn_[0-9a-f]{32}$'),
	CONSTRAINT "crm_sync_run_requested_by_membership_id_shape" CHECK ("requested_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "crm_sync_run_retry_of_run_id_shape" CHECK ("retry_of_run_id" ~ '^crun_[0-9a-f]{32}$'),
	CONSTRAINT "crm_sync_run_object_kind_known" CHECK ("core"."crm_sync_run"."object_kind" in ('deal', 'call', 'company', 'contact')),
	CONSTRAINT "crm_sync_run_trigger_known" CHECK ("core"."crm_sync_run"."trigger" in ('first_load', 'manual', 'webhook', 'sweep', 'retry')),
	CONSTRAINT "crm_sync_run_state_known" CHECK ("core"."crm_sync_run"."state" in ('queued', 'running', 'completed', 'failed')),
	CONSTRAINT "crm_sync_run_error_code_known" CHECK ("core"."crm_sync_run"."error_code" is null or "core"."crm_sync_run"."error_code" in ('crm.needs_reconnect', 'crm.rate_limited', 'crm.mapping_incomplete', 'crm.rights_not_confirmed')),
	CONSTRAINT "crm_sync_run_counts_bounds" CHECK ("core"."crm_sync_run"."created_count" between 0 and 100000000
        and "core"."crm_sync_run"."updated_count" between 0 and 100000000
        and "core"."crm_sync_run"."skipped_count" between 0 and 100000000
        and "core"."crm_sync_run"."failed_count" between 0 and 100000000
        and "core"."crm_sync_run"."unlinked_count" between 0 and 100000000),
	CONSTRAINT "crm_sync_run_skipped_shape" CHECK (jsonb_typeof("skipped") = 'array' and jsonb_array_length("skipped") <= 4),
	CONSTRAINT "crm_sync_run_skipped_fields_shape" CHECK (jsonb_typeof("skipped_fields") = 'array' and jsonb_array_length("skipped_fields") <= 14),
	CONSTRAINT "crm_sync_run_failures_shape" CHECK (jsonb_typeof("failures") = 'array' and jsonb_array_length("failures") <= 50),
	CONSTRAINT "crm_sync_run_cursor_shape" CHECK ("core"."crm_sync_run"."cursor" is null or char_length("core"."crm_sync_run"."cursor") between 1 and 1024),
	CONSTRAINT "crm_sync_run_lifecycle" CHECK (("core"."crm_sync_run"."state" = 'queued' and "core"."crm_sync_run"."started_at" is null and "core"."crm_sync_run"."completed_at" is null)
        or ("core"."crm_sync_run"."state" = 'running' and "core"."crm_sync_run"."started_at" is not null and "core"."crm_sync_run"."completed_at" is null)
        or ("core"."crm_sync_run"."state" in ('completed', 'failed') and "core"."crm_sync_run"."completed_at" is not null)),
	CONSTRAINT "crm_sync_run_error_code_only_when_failed" CHECK ("core"."crm_sync_run"."error_code" is null or "core"."crm_sync_run"."state" = 'failed')
);
--> statement-breakpoint
CREATE TABLE "core"."crm_webhook_receipt" (
	"organization_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"event_id" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_webhook_receipt_pkey" PRIMARY KEY("organization_id","connection_id","event_id"),
	CONSTRAINT "crm_webhook_receipt_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "crm_webhook_receipt_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "crm_webhook_receipt_connection_id_shape" CHECK ("connection_id" ~ '^crn_[0-9a-f]{32}$'),
	CONSTRAINT "crm_webhook_receipt_event_id_shape" CHECK (char_length("event_id") between 1 and 128)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_connection_provider_id_key" ON "core"."crm_connection" USING btree ("organization_id","id","provider");--> statement-breakpoint
ALTER TABLE "core"."crm_connection" ADD CONSTRAINT "crm_connection_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."crm_external_ref" ADD CONSTRAINT "crm_external_ref_connection_fk" FOREIGN KEY ("organization_id","connection_id","provider") REFERENCES "core"."crm_connection"("organization_id","id","provider") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."crm_mapping" ADD CONSTRAINT "crm_mapping_connection_fk" FOREIGN KEY ("organization_id","connection_id") REFERENCES "core"."crm_connection"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."crm_sync_run" ADD CONSTRAINT "crm_sync_run_connection_fk" FOREIGN KEY ("organization_id","connection_id") REFERENCES "core"."crm_connection"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."crm_sync_run" ADD CONSTRAINT "crm_sync_run_retry_of_fk" FOREIGN KEY ("organization_id","retry_of_run_id") REFERENCES "core"."crm_sync_run"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."crm_webhook_receipt" ADD CONSTRAINT "crm_webhook_receipt_connection_fk" FOREIGN KEY ("organization_id","connection_id") REFERENCES "core"."crm_connection"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_connection_provider_key" ON "core"."crm_connection" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_connection_account_key" ON "core"."crm_connection" USING btree ("provider","external_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_external_ref_object_key" ON "core"."crm_external_ref" USING btree ("organization_id","provider","object_kind","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_external_ref_write_key" ON "core"."crm_external_ref" USING btree ("organization_id","provider","write_key") WHERE "core"."crm_external_ref"."write_key" is not null;--> statement-breakpoint
CREATE INDEX "crm_external_refs_local_idx" ON "core"."crm_external_ref" USING btree ("organization_id","provider","object_kind","local_id");--> statement-breakpoint
CREATE INDEX "crm_external_refs_connection_idx" ON "core"."crm_external_ref" USING btree ("organization_id","connection_id","id");--> statement-breakpoint
CREATE INDEX "crm_sync_runs_list_idx" ON "core"."crm_sync_run" USING btree ("organization_id","connection_id","requested_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "crm_sync_runs_state_list_idx" ON "core"."crm_sync_run" USING btree ("organization_id","connection_id","state","requested_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "crm_sync_runs_kind_list_idx" ON "core"."crm_sync_run" USING btree ("organization_id","connection_id","object_kind","requested_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "crm_webhook_receipts_age_idx" ON "core"."crm_webhook_receipt" USING btree ("organization_id","received_at");--> statement-breakpoint
ALTER TABLE "core"."crm_connection" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."crm_connection" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "crm_connection_tenant_isolation" ON "core"."crm_connection" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."crm_mapping" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."crm_mapping" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "crm_mapping_tenant_isolation" ON "core"."crm_mapping" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."crm_sync_run" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."crm_sync_run" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "crm_sync_run_tenant_isolation" ON "core"."crm_sync_run" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."crm_external_ref" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."crm_external_ref" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "crm_external_ref_tenant_isolation" ON "core"."crm_external_ref" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."crm_webhook_receipt" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."crm_webhook_receipt" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "crm_webhook_receipt_tenant_isolation" ON "core"."crm_webhook_receipt" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
