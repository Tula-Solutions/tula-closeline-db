CREATE TABLE "core"."agent_instruction_pointer" (
	"organization_id" text NOT NULL,
	"agent_kind" text NOT NULL,
	"version_number" integer NOT NULL,
	"published_by_membership_id" text,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_instruction_pointer_pkey" PRIMARY KEY("organization_id","agent_kind"),
	CONSTRAINT "agent_instruction_pointer_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "agent_instruction_pointer_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "agent_instruction_pointer_agent_kind_known" CHECK ("core"."agent_instruction_pointer"."agent_kind" in ('inbound', 'outbound')),
	CONSTRAINT "agent_instruction_pointer_published_by_shape" CHECK ("core"."agent_instruction_pointer"."published_by_membership_id" is null or "core"."agent_instruction_pointer"."published_by_membership_id" ~ '^mem_[0-9a-f]{32}$')
);
--> statement-breakpoint
CREATE TABLE "core"."agent_instruction_versions" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"agent_kind" text NOT NULL,
	"number" integer NOT NULL,
	"text" text NOT NULL,
	"author_membership_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_instruction_versions_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "agent_instruction_versions_id_shape" CHECK ("id" ~ '^ains_[0-9a-f]{32}$'),
	CONSTRAINT "agent_instruction_versions_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "agent_instruction_versions_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "agent_instruction_versions_agent_kind_known" CHECK ("core"."agent_instruction_versions"."agent_kind" in ('inbound', 'outbound')),
	CONSTRAINT "agent_instruction_versions_number_positive" CHECK ("core"."agent_instruction_versions"."number" >= 1),
	CONSTRAINT "agent_instruction_versions_text_length" CHECK (char_length("core"."agent_instruction_versions"."text") between 1 and 20000),
	CONSTRAINT "agent_instruction_versions_author_shape" CHECK ("core"."agent_instruction_versions"."author_membership_id" is null or "core"."agent_instruction_versions"."author_membership_id" ~ '^mem_[0-9a-f]{32}$')
);
--> statement-breakpoint
CREATE TABLE "core"."agent_settings" (
	"organization_id" text NOT NULL,
	"agent_kind" text NOT NULL,
	"channel" text DEFAULT 'default' NOT NULL,
	"level" text,
	"send_window" jsonb,
	"escalation_rules" jsonb,
	"agents_paused" boolean,
	"updated_by_membership_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_settings_pkey" PRIMARY KEY("organization_id","agent_kind","channel"),
	CONSTRAINT "agent_settings_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "agent_settings_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "agent_settings_agent_kind_known" CHECK ("core"."agent_settings"."agent_kind" in ('inbound', 'outbound', 'organization')),
	CONSTRAINT "agent_settings_channel_known" CHECK ("core"."agent_settings"."channel" in ('phone', 'sms', 'whatsapp', 'email', 'linkedin', 'default')),
	CONSTRAINT "agent_settings_level_known" CHECK ("core"."agent_settings"."level" is null or "core"."agent_settings"."level" in ('supervised', 'assisted', 'autonomous')),
	CONSTRAINT "agent_settings_updated_by_shape" CHECK ("core"."agent_settings"."updated_by_membership_id" is null or "core"."agent_settings"."updated_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "agent_settings_send_window_shape" CHECK ("core"."agent_settings"."send_window" is null or jsonb_typeof("core"."agent_settings"."send_window") = 'object'),
	CONSTRAINT "agent_settings_escalation_rules_shape" CHECK ("core"."agent_settings"."escalation_rules" is null or (jsonb_typeof("core"."agent_settings"."escalation_rules") = 'array' and jsonb_array_length("core"."agent_settings"."escalation_rules") <= 7)),
	CONSTRAINT "agent_settings_row_columns" CHECK (("core"."agent_settings"."agent_kind" <> 'organization'
          and "core"."agent_settings"."level" is not null and "core"."agent_settings"."send_window" is not null and "core"."agent_settings"."escalation_rules" is not null
          and "core"."agent_settings"."agents_paused" is null)
        or ("core"."agent_settings"."agent_kind" = 'organization' and "core"."agent_settings"."channel" = 'default'
          and "core"."agent_settings"."agents_paused" is not null
          and "core"."agent_settings"."level" is null and "core"."agent_settings"."send_window" is null and "core"."agent_settings"."escalation_rules" is null))
);
--> statement-breakpoint
CREATE TABLE "core"."api_key_usage" (
	"organization_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"request_count" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "api_key_usage_pkey" PRIMARY KEY("organization_id","api_key_id","window_start"),
	CONSTRAINT "api_key_usage_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "api_key_usage_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "api_key_usage_api_key_id_shape" CHECK ("api_key_id" ~ '^akey_[0-9a-f]{32}$'),
	CONSTRAINT "api_key_usage_request_count_range" CHECK ("core"."api_key_usage"."request_count" between 0 and 1000000000)
);
--> statement-breakpoint
CREATE TABLE "core"."audit_events" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"sequence" bigint NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"actor_kind" text NOT NULL,
	"actor_membership_id" text,
	"actor_agent_kind" text,
	"actor_api_key_id" text,
	"action" text NOT NULL,
	"subject_type" text,
	"subject_id" text,
	"prospect_id" text,
	"instruction_version" integer,
	"request_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"previous_hash" text,
	"hash" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "audit_events_id_shape" CHECK ("id" ~ '^aud_[0-9a-f]{32}$'),
	CONSTRAINT "audit_events_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "audit_events_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "audit_events_sequence_positive" CHECK ("core"."audit_events"."sequence" >= 1),
	CONSTRAINT "audit_events_actor_kind_known" CHECK ("core"."audit_events"."actor_kind" in ('member', 'agent', 'api_key', 'system')),
	CONSTRAINT "audit_events_actor_columns" CHECK (("core"."audit_events"."actor_kind" = 'member' and "core"."audit_events"."actor_membership_id" is not null and "core"."audit_events"."actor_membership_id" ~ '^mem_[0-9a-f]{32}$'
            and "core"."audit_events"."actor_agent_kind" is null and "core"."audit_events"."actor_api_key_id" is null)
        or ("core"."audit_events"."actor_kind" = 'agent' and "core"."audit_events"."actor_agent_kind" is not null and "core"."audit_events"."actor_agent_kind" in ('inbound', 'outbound')
            and "core"."audit_events"."actor_membership_id" is null and "core"."audit_events"."actor_api_key_id" is null)
        or ("core"."audit_events"."actor_kind" = 'api_key' and "core"."audit_events"."actor_api_key_id" is not null and "core"."audit_events"."actor_api_key_id" ~ '^akey_[0-9a-f]{32}$'
            and "core"."audit_events"."actor_membership_id" is null and "core"."audit_events"."actor_agent_kind" is null)
        or ("core"."audit_events"."actor_kind" = 'system'
            and "core"."audit_events"."actor_membership_id" is null and "core"."audit_events"."actor_agent_kind" is null and "core"."audit_events"."actor_api_key_id" is null)),
	CONSTRAINT "audit_events_action_shape" CHECK (char_length("core"."audit_events"."action") <= 100 and "core"."audit_events"."action" ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
	CONSTRAINT "audit_events_subject_shape" CHECK (("core"."audit_events"."subject_type" is null and "core"."audit_events"."subject_id" is null)
        or ("core"."audit_events"."subject_type" is not null and char_length("core"."audit_events"."subject_type") <= 40 and "core"."audit_events"."subject_type" ~ '^[a-z][a-z0-9_]*$'
            and "core"."audit_events"."subject_id" is not null and char_length("core"."audit_events"."subject_id") <= 64 and "core"."audit_events"."subject_id" ~ '^[a-z][a-z0-9_]*_[0-9a-f]{32}$')),
	CONSTRAINT "audit_events_prospect_id_shape" CHECK ("core"."audit_events"."prospect_id" is null or "core"."audit_events"."prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "audit_events_instruction_version_positive" CHECK ("core"."audit_events"."instruction_version" is null or "core"."audit_events"."instruction_version" >= 1),
	CONSTRAINT "audit_events_request_id_shape" CHECK ("core"."audit_events"."request_id" is null or "core"."audit_events"."request_id" ~ '^req_[0-9a-f]{32}$'),
	CONSTRAINT "audit_events_metadata_shape" CHECK (jsonb_typeof("core"."audit_events"."metadata") = 'object' and octet_length("core"."audit_events"."metadata"::text) <= 4096),
	CONSTRAINT "audit_events_hash_shape" CHECK ("hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "audit_events_previous_hash_shape" CHECK ("core"."audit_events"."previous_hash" is null or "core"."audit_events"."previous_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "audit_events_chain_start" CHECK (("core"."audit_events"."sequence" = 1) = ("core"."audit_events"."previous_hash" is null))
);
--> statement-breakpoint
CREATE TABLE "core"."api_keys" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"secret_hash" text NOT NULL,
	"scopes" text[] NOT NULL,
	"role_ceiling" text NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by_membership_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "api_keys_id_shape" CHECK ("id" ~ '^akey_[0-9a-f]{32}$'),
	CONSTRAINT "api_keys_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "api_keys_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "api_keys_name_length" CHECK (char_length("core"."api_keys"."name") between 1 and 80),
	CONSTRAINT "api_keys_prefix_shape" CHECK ("core"."api_keys"."prefix" ~ '^clk_[A-Za-z0-9_-]{8}$'),
	CONSTRAINT "api_keys_secret_hash_shape" CHECK ("secret_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "api_keys_scopes_known" CHECK (cardinality("core"."api_keys"."scopes") between 1 and 16
        and "core"."api_keys"."scopes" <@ array['prospects:read', 'prospects:write', 'consent:read', 'consent:write', 'enrichment:read', 'enrichment:write', 'campaigns:read', 'campaigns:write', 'messaging:read', 'messaging:write', 'bookings:read', 'bookings:write', 'playbook:read', 'playbook:write', 'calls:read', 'calls:write']::text[]),
	CONSTRAINT "api_keys_role_ceiling_known" CHECK ("core"."api_keys"."role_ceiling" in ('owner', 'admin', 'manager', 'rep')),
	CONSTRAINT "api_keys_created_by_shape" CHECK ("created_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "api_keys_expiry_after_creation" CHECK ("core"."api_keys"."expires_at" is null or "core"."api_keys"."expires_at" > "core"."api_keys"."created_at")
);
--> statement-breakpoint
CREATE TABLE "core"."export_jobs" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"kind" text NOT NULL,
	"format" text,
	"filter" jsonb,
	"state" text DEFAULT 'queued' NOT NULL,
	"requested_by_membership_id" text NOT NULL,
	"include_recording_links" boolean DEFAULT false NOT NULL,
	"failure_reason" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	CONSTRAINT "export_jobs_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "export_jobs_id_shape" CHECK ("id" ~ '^exp_[0-9a-f]{32}$'),
	CONSTRAINT "export_jobs_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "export_jobs_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "export_jobs_kind_known" CHECK ("core"."export_jobs"."kind" in ('organization', 'enriched_prospects')),
	CONSTRAINT "export_jobs_format_known" CHECK ("core"."export_jobs"."format" is null or "core"."export_jobs"."format" in ('csv')),
	CONSTRAINT "export_jobs_state_known" CHECK ("core"."export_jobs"."state" in ('queued', 'running', 'ready', 'failed', 'expired')),
	CONSTRAINT "export_jobs_failure_reason_known" CHECK ("core"."export_jobs"."failure_reason" is null or "core"."export_jobs"."failure_reason" in ('part_failed', 'timed_out', 'storage_unavailable')),
	CONSTRAINT "export_jobs_requested_by_shape" CHECK ("requested_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "export_jobs_filter_shape" CHECK ("core"."export_jobs"."filter" is null or jsonb_typeof("core"."export_jobs"."filter") = 'object'),
	CONSTRAINT "export_jobs_kind_columns" CHECK (("core"."export_jobs"."kind" = 'organization' and "core"."export_jobs"."format" is null and "core"."export_jobs"."filter" is null)
        or ("core"."export_jobs"."kind" = 'enriched_prospects' and "core"."export_jobs"."format" is not null and "core"."export_jobs"."include_recording_links" = false)),
	CONSTRAINT "export_jobs_failure_iff_failed" CHECK (("core"."export_jobs"."state" = 'failed') = ("core"."export_jobs"."failure_reason" is not null)),
	CONSTRAINT "export_jobs_completion" CHECK (("core"."export_jobs"."state" in ('queued', 'running') and "core"."export_jobs"."completed_at" is null and "core"."export_jobs"."expires_at" is null)
        or ("core"."export_jobs"."state" in ('ready', 'expired') and "core"."export_jobs"."completed_at" is not null and "core"."export_jobs"."expires_at" is not null)
        or ("core"."export_jobs"."state" = 'failed' and "core"."export_jobs"."completed_at" is not null and "core"."export_jobs"."expires_at" is null))
);
--> statement-breakpoint
CREATE TABLE "core"."export_parts" (
	"organization_id" text NOT NULL,
	"export_id" text NOT NULL,
	"service" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"prefix" text,
	"file_count" integer,
	"bytes" bigint,
	"failure_reason" text,
	"ready_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "export_parts_pkey" PRIMARY KEY("organization_id","export_id","service"),
	CONSTRAINT "export_parts_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "export_parts_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "export_parts_export_id_shape" CHECK ("export_id" ~ '^exp_[0-9a-f]{32}$'),
	CONSTRAINT "export_parts_service_known" CHECK ("core"."export_parts"."service" in ('core', 'playbook', 'voice', 'outbound')),
	CONSTRAINT "export_parts_state_known" CHECK ("core"."export_parts"."state" in ('pending', 'ready', 'failed')),
	CONSTRAINT "export_parts_failure_reason_known" CHECK ("core"."export_parts"."failure_reason" is null or "core"."export_parts"."failure_reason" in ('write_failed', 'storage_unavailable', 'source_unavailable')),
	CONSTRAINT "export_parts_prefix_shape" CHECK ("core"."export_parts"."prefix" is null or (char_length("core"."export_parts"."prefix") <= 300
        and "core"."export_parts"."prefix" ~ '^[A-Za-z0-9_][A-Za-z0-9_./-]*$' and ('/' || "core"."export_parts"."prefix" || '/') not like '%/../%')),
	CONSTRAINT "export_parts_file_count_range" CHECK ("core"."export_parts"."file_count" is null or "core"."export_parts"."file_count" between 0 and 10000),
	CONSTRAINT "export_parts_bytes_range" CHECK ("core"."export_parts"."bytes" is null or "core"."export_parts"."bytes" between 0 and 50000000000),
	CONSTRAINT "export_parts_state_columns" CHECK (("core"."export_parts"."state" = 'pending' and "core"."export_parts"."prefix" is null and "core"."export_parts"."file_count" is null and "core"."export_parts"."bytes" is null and "core"."export_parts"."failure_reason" is null and "core"."export_parts"."ready_at" is null)
        or ("core"."export_parts"."state" = 'ready' and "core"."export_parts"."prefix" is not null and "core"."export_parts"."file_count" is not null and "core"."export_parts"."bytes" is not null and "core"."export_parts"."failure_reason" is null and "core"."export_parts"."ready_at" is not null)
        or ("core"."export_parts"."state" = 'failed' and "core"."export_parts"."failure_reason" is not null and "core"."export_parts"."ready_at" is null))
);
--> statement-breakpoint
ALTER TABLE "core"."agent_instruction_pointer" ADD CONSTRAINT "agent_instruction_pointer_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_instruction_versions_number_key" ON "core"."agent_instruction_versions" USING btree ("organization_id","agent_kind","number");--> statement-breakpoint
ALTER TABLE "core"."agent_instruction_pointer" ADD CONSTRAINT "agent_instruction_pointer_version_fk" FOREIGN KEY ("organization_id","agent_kind","version_number") REFERENCES "core"."agent_instruction_versions"("organization_id","agent_kind","number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."agent_instruction_versions" ADD CONSTRAINT "agent_instruction_versions_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."agent_settings" ADD CONSTRAINT "agent_settings_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."api_key_usage" ADD CONSTRAINT "api_key_usage_key_fk" FOREIGN KEY ("organization_id","api_key_id") REFERENCES "core"."api_keys"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."export_jobs" ADD CONSTRAINT "export_jobs_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."export_parts" ADD CONSTRAINT "export_parts_export_fk" FOREIGN KEY ("organization_id","export_id") REFERENCES "core"."export_jobs"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_usage_age_idx" ON "core"."api_key_usage" USING btree ("organization_id","window_start");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_events_sequence_key" ON "core"."audit_events" USING btree ("organization_id","sequence");--> statement-breakpoint
CREATE INDEX "audit_events_occurred_idx" ON "core"."audit_events" USING btree ("organization_id","occurred_at" DESC NULLS LAST,"sequence" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_events_action_idx" ON "core"."audit_events" USING btree ("organization_id","action","sequence" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_events_subject_idx" ON "core"."audit_events" USING btree ("organization_id","subject_type","subject_id","sequence" DESC NULLS LAST) WHERE "core"."audit_events"."subject_id" is not null;--> statement-breakpoint
CREATE INDEX "audit_events_prospect_idx" ON "core"."audit_events" USING btree ("organization_id","prospect_id","sequence" DESC NULLS LAST) WHERE "core"."audit_events"."prospect_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_secret_hash_key" ON "core"."api_keys" USING btree ("secret_hash");--> statement-breakpoint
CREATE INDEX "api_keys_list_idx" ON "core"."api_keys" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "export_jobs_one_active_key" ON "core"."export_jobs" USING btree ("organization_id") WHERE "core"."export_jobs"."state" in ('queued', 'running');--> statement-breakpoint
CREATE INDEX "export_jobs_list_idx" ON "core"."export_jobs" USING btree ("organization_id","requested_at" DESC NULLS LAST,"id" DESC NULLS LAST);
--> statement-breakpoint
-- Every table is a tenant table: forced row-level security and the one canonical policy.
ALTER TABLE "core"."agent_instruction_pointer" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."agent_instruction_pointer" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "agent_instruction_pointer_tenant_isolation" ON "core"."agent_instruction_pointer" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."agent_instruction_versions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."agent_instruction_versions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "agent_instruction_versions_tenant_isolation" ON "core"."agent_instruction_versions" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."agent_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."agent_settings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "agent_settings_tenant_isolation" ON "core"."agent_settings" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."api_key_usage" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."api_key_usage" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "api_key_usage_tenant_isolation" ON "core"."api_key_usage" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."api_keys" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."api_keys" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "api_keys_tenant_isolation" ON "core"."api_keys" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."audit_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."audit_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "audit_events_tenant_isolation" ON "core"."audit_events" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."export_jobs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."export_jobs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "export_jobs_tenant_isolation" ON "core"."export_jobs" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."export_parts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."export_parts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "export_parts_tenant_isolation" ON "core"."export_parts" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
-- The default privileges of migration 0000 give the service role every statement on a new core
-- table. The audit log and the instruction versions are append-only (ADRs 0003 and 0024): the
-- service role keeps INSERT and SELECT only, so a row can be neither rewritten nor removed. An
-- Organization's removal still cascades, because the foreign key action runs as the table owner.
REVOKE UPDATE, DELETE, TRUNCATE ON "core"."audit_events" FROM closeline_core;
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON "core"."agent_instruction_versions" FROM closeline_core;
--> statement-breakpoint
-- The audit chain has no gaps and no forks: an event is accepted only when it is the first of its
-- Organization (sequence 1, no previous hash) or follows the stored event with the previous
-- sequence and names that event's hash. Two writers racing for one sequence are separated by the
-- unique index on (organization_id, sequence). The lookup runs as the writer, inside the
-- Organization's scope, so it sees only that Organization's events.
CREATE FUNCTION "core"."audit_events_extend_chain"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  stored text;
BEGIN
  IF NEW."sequence" = 1 THEN
    RETURN NEW;
  END IF;
  SELECT e."hash" INTO stored FROM "core"."audit_events" e
    WHERE e."organization_id" = NEW."organization_id" AND e."sequence" = NEW."sequence" - 1;
  IF stored IS NULL OR stored IS DISTINCT FROM NEW."previous_hash" THEN
    RAISE EXCEPTION 'core.audit_chain: an event must extend the chain of its Organization'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'audit_events_chain';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "audit_events_chain" BEFORE INSERT ON "core"."audit_events"
  FOR EACH ROW EXECUTE FUNCTION "core"."audit_events_extend_chain"();
--> statement-breakpoint
-- Only the trigger runs it: no role calls it directly.
REVOKE ALL ON FUNCTION "core"."audit_events_extend_chain"() FROM PUBLIC;
