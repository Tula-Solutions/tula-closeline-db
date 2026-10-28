CREATE TABLE "outbound"."fit_scores" (
	"organization_id" text NOT NULL,
	"prospect_id" text NOT NULL,
	"score" smallint NOT NULL,
	"max_score" smallint NOT NULL,
	"matches" jsonb NOT NULL,
	"criteria_version" integer NOT NULL,
	"scored_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fit_scores_pkey" PRIMARY KEY("organization_id","prospect_id"),
	CONSTRAINT "fit_scores_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "fit_scores_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "fit_scores_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "fit_scores_score_range" CHECK ("outbound"."fit_scores"."score" between 0 and "outbound"."fit_scores"."max_score"),
	CONSTRAINT "fit_scores_criteria_version_positive" CHECK ("outbound"."fit_scores"."criteria_version" >= 1),
	CONSTRAINT "fit_scores_matches_shape" CHECK (jsonb_typeof("outbound"."fit_scores"."matches") = 'array'
        and octet_length("outbound"."fit_scores"."matches"::text) <= 16384)
);
--> statement-breakpoint
CREATE TABLE "outbound"."signal_settings" (
	"organization_id" text NOT NULL,
	"kinds" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"criteria_version" integer DEFAULT 1 NOT NULL,
	"webhook_secret_ciphertext" "bytea",
	"webhook_key_id" text,
	"webhook_rotated_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signal_settings_pkey" PRIMARY KEY("organization_id"),
	CONSTRAINT "signal_settings_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "signal_settings_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "signal_settings_kinds_shape" CHECK (jsonb_typeof("outbound"."signal_settings"."kinds") = 'array'
        and octet_length("outbound"."signal_settings"."kinds"::text) <= 4096),
	CONSTRAINT "signal_settings_versions_positive" CHECK ("outbound"."signal_settings"."version" >= 1 and "outbound"."signal_settings"."criteria_version" >= 1),
	CONSTRAINT "signal_settings_webhook_shape" CHECK (("outbound"."signal_settings"."webhook_secret_ciphertext" is null or octet_length("outbound"."signal_settings"."webhook_secret_ciphertext") between 1 and 2048)
        and ("outbound"."signal_settings"."webhook_key_id" is null or char_length("outbound"."signal_settings"."webhook_key_id") between 1 and 128)
        and ("outbound"."signal_settings"."webhook_secret_ciphertext" is null) = ("outbound"."signal_settings"."webhook_key_id" is null)
        and ("outbound"."signal_settings"."webhook_secret_ciphertext" is null) = ("outbound"."signal_settings"."webhook_rotated_at" is null))
);
--> statement-breakpoint
CREATE INDEX "fit_scores_list_idx" ON "outbound"."fit_scores" USING btree ("organization_id","score" DESC NULLS LAST,"prospect_id" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "outbound"."signal_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."signal_settings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "signal_settings_tenant_isolation" ON "outbound"."signal_settings" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."fit_scores" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."fit_scores" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "fit_scores_tenant_isolation" ON "outbound"."fit_scores" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
