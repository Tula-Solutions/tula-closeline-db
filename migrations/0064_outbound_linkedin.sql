CREATE TABLE "outbound"."linkedin_accounts" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"membership_id" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"status" text DEFAULT 'needs_login' NOT NULL,
	"pause_reason" text,
	"daily_connection_limit" integer DEFAULT 20 NOT NULL,
	"daily_message_limit" integer DEFAULT 40 NOT NULL,
	"weekly_connection_limit" integer DEFAULT 80 NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "linkedin_accounts_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "linkedin_accounts_id_shape" CHECK ("id" ~ '^lia_[0-9a-f]{32}$'),
	CONSTRAINT "linkedin_accounts_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "linkedin_accounts_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "linkedin_accounts_membership_id_shape" CHECK ("membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "linkedin_accounts_provider_account_id_shape" CHECK (char_length("outbound"."linkedin_accounts"."provider_account_id") between 1 and 2048),
	CONSTRAINT "linkedin_accounts_status_known" CHECK ("outbound"."linkedin_accounts"."status" in ('connected', 'needs_login', 'paused', 'restricted', 'disconnected')),
	CONSTRAINT "linkedin_accounts_pause_reason_known" CHECK ("outbound"."linkedin_accounts"."pause_reason" is null or "outbound"."linkedin_accounts"."pause_reason" in ('restricted', 'checkpoint', 'provider_unavailable', 'admin', 'rate_limited')),
	CONSTRAINT "linkedin_accounts_pause_reason_not_connected" CHECK ("outbound"."linkedin_accounts"."status" <> 'connected' or "outbound"."linkedin_accounts"."pause_reason" is null),
	CONSTRAINT "linkedin_accounts_limits_range" CHECK ("outbound"."linkedin_accounts"."daily_connection_limit" between 0 and 20
        and "outbound"."linkedin_accounts"."daily_message_limit" between 0 and 40
        and "outbound"."linkedin_accounts"."weekly_connection_limit" between 0 and 80)
);
--> statement-breakpoint
CREATE TABLE "outbound"."linkedin_channel_settings" (
	"organization_id" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_by_membership_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "linkedin_channel_settings_pkey" PRIMARY KEY("organization_id"),
	CONSTRAINT "linkedin_channel_settings_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "linkedin_channel_settings_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "linkedin_channel_settings_updated_by_shape" CHECK ("updated_by_membership_id" ~ '^mem_[0-9a-f]{32}$')
);
--> statement-breakpoint
CREATE TABLE "outbound"."linkedin_risk_acceptances" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"wording_version" text NOT NULL,
	"accepted_by_membership_id" text NOT NULL,
	"typed_full_name" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "linkedin_risk_acceptances_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "linkedin_risk_acceptances_id_shape" CHECK ("id" ~ '^lra_[0-9a-f]{32}$'),
	CONSTRAINT "linkedin_risk_acceptances_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "linkedin_risk_acceptances_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "linkedin_risk_acceptances_wording_version_shape" CHECK (char_length("outbound"."linkedin_risk_acceptances"."wording_version") between 1 and 40),
	CONSTRAINT "linkedin_risk_acceptances_accepted_by_shape" CHECK ("accepted_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "linkedin_risk_acceptances_typed_full_name_shape" CHECK (char_length("outbound"."linkedin_risk_acceptances"."typed_full_name") between 2 and 200
        and "outbound"."linkedin_risk_acceptances"."typed_full_name" !~ '[[:cntrl:]]'),
	CONSTRAINT "linkedin_risk_acceptances_revoked_after_accepted" CHECK ("outbound"."linkedin_risk_acceptances"."revoked_at" is null or "outbound"."linkedin_risk_acceptances"."revoked_at" >= "outbound"."linkedin_risk_acceptances"."accepted_at")
);
--> statement-breakpoint
CREATE TABLE "outbound"."linkedin_usage" (
	"organization_id" text NOT NULL,
	"account_id" text NOT NULL,
	"day" date NOT NULL,
	"connections" integer DEFAULT 0 NOT NULL,
	"messages" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "linkedin_usage_pkey" PRIMARY KEY("organization_id","account_id","day"),
	CONSTRAINT "linkedin_usage_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "linkedin_usage_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "linkedin_usage_account_id_shape" CHECK ("account_id" ~ '^lia_[0-9a-f]{32}$'),
	CONSTRAINT "linkedin_usage_counters_not_negative" CHECK ("outbound"."linkedin_usage"."connections" >= 0 and "outbound"."linkedin_usage"."messages" >= 0)
);
--> statement-breakpoint
ALTER TABLE "outbound"."linkedin_usage" ADD CONSTRAINT "linkedin_usage_account_fk" FOREIGN KEY ("organization_id","account_id") REFERENCES "outbound"."linkedin_accounts"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "linkedin_accounts_member_key" ON "outbound"."linkedin_accounts" USING btree ("organization_id","membership_id");--> statement-breakpoint
CREATE INDEX "linkedin_accounts_list_idx" ON "outbound"."linkedin_accounts" USING btree ("organization_id","connected_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "linkedin_risk_acceptances_list_idx" ON "outbound"."linkedin_risk_acceptances" USING btree ("organization_id","accepted_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "linkedin_risk_acceptances_active_idx" ON "outbound"."linkedin_risk_acceptances" USING btree ("organization_id","wording_version") WHERE "outbound"."linkedin_risk_acceptances"."revoked_at" is null;
--> statement-breakpoint
ALTER TABLE "outbound"."linkedin_accounts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."linkedin_accounts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "linkedin_accounts_tenant_isolation" ON "outbound"."linkedin_accounts" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."linkedin_risk_acceptances" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."linkedin_risk_acceptances" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "linkedin_risk_acceptances_tenant_isolation" ON "outbound"."linkedin_risk_acceptances" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."linkedin_channel_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."linkedin_channel_settings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "linkedin_channel_settings_tenant_isolation" ON "outbound"."linkedin_channel_settings" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."linkedin_usage" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."linkedin_usage" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "linkedin_usage_tenant_isolation" ON "outbound"."linkedin_usage" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
-- Acceptances are a record: the service role cannot remove one (disconnecting an account keeps its
-- row too), and the one change an UPDATE may make is setting `revoked_at`, once.
REVOKE DELETE ON "outbound"."linkedin_accounts" FROM closeline_outbound;
--> statement-breakpoint
REVOKE DELETE ON "outbound"."linkedin_risk_acceptances" FROM closeline_outbound;
--> statement-breakpoint
CREATE FUNCTION "outbound"."refuse_linkedin_acceptance_rewrite"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'outbound.linkedin_acceptance_final: a risk acceptance changes only by setting its revoked time, once'
    USING ERRCODE = 'check_violation', CONSTRAINT = 'linkedin_risk_acceptances_revoke_only';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "linkedin_risk_acceptances_revoke_only" BEFORE UPDATE ON "outbound"."linkedin_risk_acceptances"
  FOR EACH ROW WHEN (
    OLD."revoked_at" IS NOT NULL
    OR NEW."revoked_at" IS NULL
    OR ROW(OLD."id", OLD."organization_id", OLD."wording_version", OLD."accepted_by_membership_id", OLD."typed_full_name", OLD."accepted_at")
       IS DISTINCT FROM ROW(NEW."id", NEW."organization_id", NEW."wording_version", NEW."accepted_by_membership_id", NEW."typed_full_name", NEW."accepted_at"))
  EXECUTE FUNCTION "outbound"."refuse_linkedin_acceptance_rewrite"();
--> statement-breakpoint
CREATE FUNCTION "outbound"."refuse_linkedin_acceptance_truncate"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'outbound.truncate_refused: risk acceptances are a record and are never truncated'
    USING ERRCODE = 'feature_not_supported';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "linkedin_risk_acceptances_no_truncate" BEFORE TRUNCATE ON "outbound"."linkedin_risk_acceptances"
  FOR EACH STATEMENT EXECUTE FUNCTION "outbound"."refuse_linkedin_acceptance_truncate"();
--> statement-breakpoint
-- Only the triggers run them: no role calls them directly.
REVOKE ALL ON FUNCTION "outbound"."refuse_linkedin_acceptance_rewrite"(), "outbound"."refuse_linkedin_acceptance_truncate"() FROM PUBLIC;
