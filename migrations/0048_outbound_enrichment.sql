CREATE TABLE "outbound"."enrichment_attempts" (
	"organization_id" text NOT NULL,
	"run_id" text NOT NULL,
	"position" smallint NOT NULL,
	"provider" text NOT NULL,
	"field_group" text NOT NULL,
	"outcome" text NOT NULL,
	"failure" text,
	"cost_micros" bigint DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"duration_ms" integer NOT NULL,
	CONSTRAINT "enrichment_attempts_pkey" PRIMARY KEY("organization_id","run_id","position"),
	CONSTRAINT "enrichment_attempts_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "enrichment_attempts_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "enrichment_attempts_run_id_shape" CHECK ("run_id" ~ '^erun_[0-9a-f]{32}$'),
	CONSTRAINT "enrichment_attempts_position_range" CHECK ("outbound"."enrichment_attempts"."position" between 0 and 149),
	CONSTRAINT "enrichment_attempts_provider_shape" CHECK ("outbound"."enrichment_attempts"."provider" ~ '^[a-z][a-z0-9_]{0,31}$'),
	CONSTRAINT "enrichment_attempts_field_group_known" CHECK ("outbound"."enrichment_attempts"."field_group" in ('person', 'company', 'email_verification')),
	CONSTRAINT "enrichment_attempts_outcome_known" CHECK ("outbound"."enrichment_attempts"."outcome" in ('filled', 'no_result', 'failed', 'skipped_disabled', 'skipped_circuit_open', 'skipped_budget')),
	CONSTRAINT "enrichment_attempts_failure_matches_outcome" CHECK (("outbound"."enrichment_attempts"."outcome" = 'failed') = ("outbound"."enrichment_attempts"."failure" is not null)
        and ("outbound"."enrichment_attempts"."failure" is null or "outbound"."enrichment_attempts"."failure" in ('timeout', 'rate_limited', 'provider_error', 'invalid_response', 'key_rejected'))),
	CONSTRAINT "enrichment_attempts_skipped_costs_nothing" CHECK ("outbound"."enrichment_attempts"."outcome" not in ('skipped_disabled', 'skipped_circuit_open', 'skipped_budget') or "outbound"."enrichment_attempts"."cost_micros" = 0),
	CONSTRAINT "enrichment_attempts_cost_range" CHECK ("outbound"."enrichment_attempts"."cost_micros" between 0 and 1000000000000),
	CONSTRAINT "enrichment_attempts_duration_range" CHECK ("outbound"."enrichment_attempts"."duration_ms" between 0 and 600000)
);
--> statement-breakpoint
CREATE TABLE "outbound"."enrichment_runs" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"run_set_id" text,
	"prospect_id" text NOT NULL,
	"request_id" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"stop_reason" text,
	"groups" text[] NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"email_verification" jsonb,
	"cost_micros" bigint DEFAULT 0 NOT NULL,
	"ceiling_micros" bigint NOT NULL,
	"requested_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "enrichment_runs_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "enrichment_runs_id_shape" CHECK ("id" ~ '^erun_[0-9a-f]{32}$'),
	CONSTRAINT "enrichment_runs_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "enrichment_runs_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "enrichment_runs_run_set_id_shape" CHECK ("run_set_id" ~ '^erset_[0-9a-f]{32}$'),
	CONSTRAINT "enrichment_runs_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "enrichment_runs_requested_by_user_id_shape" CHECK ("requested_by_user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "enrichment_runs_request_id_shape" CHECK (char_length("outbound"."enrichment_runs"."request_id") between 1 and 256),
	CONSTRAINT "enrichment_runs_status_known" CHECK ("outbound"."enrichment_runs"."status" in ('queued', 'running', 'complete', 'incomplete', 'stopped')),
	CONSTRAINT "enrichment_runs_stop_reason_matches_status" CHECK (("outbound"."enrichment_runs"."status" = 'stopped') = ("outbound"."enrichment_runs"."stop_reason" is not null)
        and ("outbound"."enrichment_runs"."stop_reason" is null or "outbound"."enrichment_runs"."stop_reason" in ('monthly_budget', 'run_ceiling'))),
	CONSTRAINT "enrichment_runs_times_match_status" CHECK (("outbound"."enrichment_runs"."status" in ('complete', 'incomplete', 'stopped')) = ("outbound"."enrichment_runs"."completed_at" is not null)
        and ("outbound"."enrichment_runs"."status" <> 'queued' or "outbound"."enrichment_runs"."started_at" is null)),
	CONSTRAINT "enrichment_runs_groups_shape" CHECK (cardinality("outbound"."enrichment_runs"."groups") between 1 and 3
        and "outbound"."enrichment_runs"."groups" <@ array['person', 'company', 'email_verification']::text[]
        and (cardinality("outbound"."enrichment_runs"."groups") = 1
          or ("outbound"."enrichment_runs"."groups"[1] <> "outbound"."enrichment_runs"."groups"[2]
            and (cardinality("outbound"."enrichment_runs"."groups") = 2
              or ("outbound"."enrichment_runs"."groups"[3] <> "outbound"."enrichment_runs"."groups"[1] and "outbound"."enrichment_runs"."groups"[3] <> "outbound"."enrichment_runs"."groups"[2]))))),
	CONSTRAINT "enrichment_runs_fields_shape" CHECK (jsonb_typeof("outbound"."enrichment_runs"."fields") = 'array' and jsonb_array_length("outbound"."enrichment_runs"."fields") <= 11),
	CONSTRAINT "enrichment_runs_email_verification_shape" CHECK ("outbound"."enrichment_runs"."email_verification" is null or jsonb_typeof("outbound"."enrichment_runs"."email_verification") = 'object'),
	CONSTRAINT "enrichment_runs_cost_range" CHECK ("outbound"."enrichment_runs"."cost_micros" between 0 and 1000000000000
        and "outbound"."enrichment_runs"."ceiling_micros" between 0 and 1000000000000)
);
--> statement-breakpoint
CREATE TABLE "outbound"."enrichment_spend" (
	"organization_id" text NOT NULL,
	"month" date NOT NULL,
	"provider" text NOT NULL,
	"cost_micros" bigint DEFAULT 0 NOT NULL,
	"calls" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrichment_spend_pkey" PRIMARY KEY("organization_id","month","provider"),
	CONSTRAINT "enrichment_spend_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "enrichment_spend_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "enrichment_spend_month_first_day" CHECK (extract(day from "outbound"."enrichment_spend"."month") = 1),
	CONSTRAINT "enrichment_spend_provider_shape" CHECK ("outbound"."enrichment_spend"."provider" ~ '^[a-z][a-z0-9_]{0,31}$'),
	CONSTRAINT "enrichment_spend_cost_not_negative" CHECK ("outbound"."enrichment_spend"."cost_micros" >= 0),
	CONSTRAINT "enrichment_spend_calls_not_negative" CHECK ("outbound"."enrichment_spend"."calls" >= 0)
);
--> statement-breakpoint
CREATE TABLE "outbound"."fit_criteria" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"field" text NOT NULL,
	"condition" jsonb NOT NULL,
	"weight" smallint NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fit_criteria_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "fit_criteria_id_shape" CHECK ("id" ~ '^fcr_[0-9a-f]{32}$'),
	CONSTRAINT "fit_criteria_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "fit_criteria_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "fit_criteria_name_shape" CHECK (char_length("outbound"."fit_criteria"."name") between 1 and 100),
	CONSTRAINT "fit_criteria_field_known" CHECK ("outbound"."fit_criteria"."field" in ('jobTitle', 'industry', 'employeeCount', 'region', 'technologies')),
	CONSTRAINT "fit_criteria_weight_range" CHECK ("outbound"."fit_criteria"."weight" between 1 and 100),
	CONSTRAINT "fit_criteria_condition_shape" CHECK (jsonb_typeof("outbound"."fit_criteria"."condition") = 'object'
        and octet_length("outbound"."fit_criteria"."condition"::text) <= 4096
        and coalesce("outbound"."fit_criteria"."condition"->>'operator', '') in ('one_of', 'contains_any', 'between')
        and (("outbound"."fit_criteria"."field" = 'employeeCount') = ("outbound"."fit_criteria"."condition"->>'operator' = 'between'))
        and case when "outbound"."fit_criteria"."condition"->>'operator' = 'between' then
          coalesce(jsonb_typeof("outbound"."fit_criteria"."condition"->'min'), 'null') in ('number', 'null')
          and coalesce(jsonb_typeof("outbound"."fit_criteria"."condition"->'max'), 'null') in ('number', 'null')
          and (coalesce(jsonb_typeof("outbound"."fit_criteria"."condition"->'min'), 'null') = 'number'
            or coalesce(jsonb_typeof("outbound"."fit_criteria"."condition"->'max'), 'null') = 'number')
          and case when jsonb_typeof("outbound"."fit_criteria"."condition"->'min') = 'number'
              and jsonb_typeof("outbound"."fit_criteria"."condition"->'max') = 'number'
            then ("outbound"."fit_criteria"."condition"->>'min')::numeric <= ("outbound"."fit_criteria"."condition"->>'max')::numeric
            else true end
        else case when jsonb_typeof("outbound"."fit_criteria"."condition"->'values') = 'array'
          then jsonb_array_length("outbound"."fit_criteria"."condition"->'values') between 1 and 20
          else false end
        end)
);
--> statement-breakpoint
CREATE TABLE "outbound"."provider_settings" (
	"organization_id" text NOT NULL,
	"provider" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"credential_ciphertext" "bytea",
	"credential_key_id" text,
	"credential_updated_at" timestamp with time zone,
	"person_position" smallint,
	"company_position" smallint,
	"email_verification_position" smallint,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_settings_pkey" PRIMARY KEY("organization_id","provider"),
	CONSTRAINT "provider_settings_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "provider_settings_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "provider_settings_provider_shape" CHECK ("outbound"."provider_settings"."provider" ~ '^[a-z][a-z0-9_]{0,31}$'),
	CONSTRAINT "provider_settings_credential_shape" CHECK (("outbound"."provider_settings"."credential_ciphertext" is null or octet_length("outbound"."provider_settings"."credential_ciphertext") between 1 and 2048)
        and ("outbound"."provider_settings"."credential_key_id" is null or char_length("outbound"."provider_settings"."credential_key_id") between 1 and 128)
        and ("outbound"."provider_settings"."credential_ciphertext" is null) = ("outbound"."provider_settings"."credential_key_id" is null)
        and ("outbound"."provider_settings"."credential_ciphertext" is null) = ("outbound"."provider_settings"."credential_updated_at" is null)),
	CONSTRAINT "provider_settings_positions_range" CHECK (("outbound"."provider_settings"."person_position" is null or "outbound"."provider_settings"."person_position" between 0 and 49)
        and ("outbound"."provider_settings"."company_position" is null or "outbound"."provider_settings"."company_position" between 0 and 49)
        and ("outbound"."provider_settings"."email_verification_position" is null or "outbound"."provider_settings"."email_verification_position" between 0 and 49))
);
--> statement-breakpoint
CREATE TABLE "outbound"."signals" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"prospect_id" text NOT NULL,
	"kind" text NOT NULL,
	"source_type" text NOT NULL,
	"source_provider" text,
	"source_user_id" text,
	"event_id" text,
	"observed_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"detail" jsonb NOT NULL,
	CONSTRAINT "signals_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "signals_id_shape" CHECK ("id" ~ '^sig_[0-9a-f]{32}$'),
	CONSTRAINT "signals_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "signals_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "signals_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "signals_source_user_id_shape" CHECK ("source_user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "signals_kind_known" CHECK ("outbound"."signals"."kind" in ('funding', 'hiring_spike', 'job_change', 'technology_change', 'website_visit', 'note')),
	CONSTRAINT "signals_source_type_known" CHECK ("outbound"."signals"."source_type" in ('provider', 'webhook', 'manual')),
	CONSTRAINT "signals_source_provider_shape" CHECK ("outbound"."signals"."source_provider" is null or "outbound"."signals"."source_provider" ~ '^[a-z][a-z0-9_]{0,31}$'),
	CONSTRAINT "signals_event_id_shape" CHECK ("outbound"."signals"."event_id" is null or "outbound"."signals"."event_id" ~ '^[A-Za-z0-9_-]{8,100}$'),
	CONSTRAINT "signals_source_matches_type" CHECK (case "outbound"."signals"."source_type"
        when 'provider' then "outbound"."signals"."source_provider" is not null and "outbound"."signals"."source_user_id" is null and "outbound"."signals"."event_id" is null
        when 'webhook' then "outbound"."signals"."event_id" is not null and "outbound"."signals"."source_provider" is null and "outbound"."signals"."source_user_id" is null
        else "outbound"."signals"."source_user_id" is not null and "outbound"."signals"."source_provider" is null and "outbound"."signals"."event_id" is null
      end),
	CONSTRAINT "signals_expires_after_observed" CHECK ("outbound"."signals"."expires_at" >= "outbound"."signals"."observed_at"),
	CONSTRAINT "signals_detail_shape" CHECK (jsonb_typeof("outbound"."signals"."detail") = 'object'
        and octet_length("outbound"."signals"."detail"::text) <= 4096)
);
--> statement-breakpoint
ALTER TABLE "outbound"."enrichment_attempts" ADD CONSTRAINT "enrichment_attempts_run_fk" FOREIGN KEY ("organization_id","run_id") REFERENCES "outbound"."enrichment_runs"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "enrichment_runs_request_key" ON "outbound"."enrichment_runs" USING btree ("organization_id","prospect_id","request_id");--> statement-breakpoint
CREATE INDEX "enrichment_runs_list_idx" ON "outbound"."enrichment_runs" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "enrichment_runs_prospect_idx" ON "outbound"."enrichment_runs" USING btree ("organization_id","prospect_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "enrichment_runs_run_set_idx" ON "outbound"."enrichment_runs" USING btree ("organization_id","run_set_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "outbound"."enrichment_runs"."run_set_id" is not null;--> statement-breakpoint
CREATE INDEX "enrichment_runs_status_idx" ON "outbound"."enrichment_runs" USING btree ("organization_id","status","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "enrichment_spend_list_idx" ON "outbound"."enrichment_spend" USING btree ("organization_id","month" DESC NULLS LAST,"provider");--> statement-breakpoint
CREATE UNIQUE INDEX "fit_criteria_name_key" ON "outbound"."fit_criteria" USING btree ("organization_id",lower("name"));--> statement-breakpoint
CREATE INDEX "fit_criteria_list_idx" ON "outbound"."fit_criteria" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "signals_event_key" ON "outbound"."signals" USING btree ("organization_id","event_id") WHERE "outbound"."signals"."event_id" is not null;--> statement-breakpoint
CREATE INDEX "signals_prospect_idx" ON "outbound"."signals" USING btree ("organization_id","prospect_id","observed_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "signals_prospect_kind_idx" ON "outbound"."signals" USING btree ("organization_id","prospect_id","kind","observed_at" DESC NULLS LAST,"id" DESC NULLS LAST);
--> statement-breakpoint
ALTER TABLE "outbound"."enrichment_runs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."enrichment_runs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "enrichment_runs_tenant_isolation" ON "outbound"."enrichment_runs" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."enrichment_attempts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."enrichment_attempts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "enrichment_attempts_tenant_isolation" ON "outbound"."enrichment_attempts" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."signals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."signals" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "signals_tenant_isolation" ON "outbound"."signals" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."fit_criteria" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."fit_criteria" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "fit_criteria_tenant_isolation" ON "outbound"."fit_criteria" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."provider_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."provider_settings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "provider_settings_tenant_isolation" ON "outbound"."provider_settings" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."enrichment_spend" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."enrichment_spend" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "enrichment_spend_tenant_isolation" ON "outbound"."enrichment_spend" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
REVOKE UPDATE ON "outbound"."enrichment_attempts" FROM closeline_outbound;
--> statement-breakpoint
REVOKE UPDATE ON "outbound"."signals" FROM closeline_outbound;
