CREATE TABLE "core"."booking_types" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"length_minutes" smallint NOT NULL,
	"buffer_before_minutes" smallint DEFAULT 0 NOT NULL,
	"buffer_after_minutes" smallint DEFAULT 0 NOT NULL,
	"min_notice_minutes" integer DEFAULT 0 NOT NULL,
	"mode" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"public_token_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_types_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "booking_types_id_shape" CHECK ("id" ~ '^bkt_[0-9a-f]{32}$'),
	CONSTRAINT "booking_types_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "booking_types_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "booking_types_name_shape" CHECK (char_length("core"."booking_types"."name") between 1 and 200 and "core"."booking_types"."name" = btrim("core"."booking_types"."name")),
	CONSTRAINT "booking_types_length_range" CHECK ("core"."booking_types"."length_minutes" between 5 and 480),
	CONSTRAINT "booking_types_buffers_range" CHECK ("core"."booking_types"."buffer_before_minutes" between 0 and 120 and "core"."booking_types"."buffer_after_minutes" between 0 and 120),
	CONSTRAINT "booking_types_min_notice_range" CHECK ("core"."booking_types"."min_notice_minutes" between 0 and 43200),
	CONSTRAINT "booking_types_mode_known" CHECK ("core"."booking_types"."mode" in ('phone', 'video')),
	CONSTRAINT "booking_types_public_token_hash_shape" CHECK ("core"."booking_types"."public_token_hash" is null or "core"."booking_types"."public_token_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "core"."bookings" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"booking_type_id" text NOT NULL,
	"membership_id" text NOT NULL,
	"prospect_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"mode" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"blocked_from" timestamp with time zone NOT NULL,
	"blocked_until" timestamp with time zone NOT NULL,
	"idempotency_key_hash" text NOT NULL,
	"routing_decision_id" text,
	"calendar_event_id" text,
	"join_url" text,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "bookings_id_shape" CHECK ("id" ~ '^bkg_[0-9a-f]{32}$'),
	CONSTRAINT "bookings_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "bookings_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "bookings_status_known" CHECK ("core"."bookings"."status" in ('pending', 'confirmed', 'cancelled')),
	CONSTRAINT "bookings_mode_known" CHECK ("core"."bookings"."mode" in ('phone', 'video')),
	CONSTRAINT "bookings_ends_after_starts" CHECK ("core"."bookings"."ends_at" > "core"."bookings"."starts_at"),
	CONSTRAINT "bookings_blocked_covers_booking" CHECK ("core"."bookings"."blocked_from" <= "core"."bookings"."starts_at" and "core"."bookings"."blocked_until" >= "core"."bookings"."ends_at"),
	CONSTRAINT "bookings_idempotency_key_hash_shape" CHECK ("core"."bookings"."idempotency_key_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "bookings_routing_decision_id_shape" CHECK ("core"."bookings"."routing_decision_id" is null or "core"."bookings"."routing_decision_id" ~ '^rdc_[0-9a-f]{32}$'),
	CONSTRAINT "bookings_calendar_event_id_shape" CHECK ("core"."bookings"."calendar_event_id" is null or char_length("core"."bookings"."calendar_event_id") between 1 and 1024),
	CONSTRAINT "bookings_join_url_shape" CHECK ("core"."bookings"."join_url" is null or (char_length("core"."bookings"."join_url") <= 2048 and "core"."bookings"."join_url" ~ '^https://')),
	CONSTRAINT "bookings_confirmed_has_event" CHECK ("core"."bookings"."status" <> 'confirmed' or "core"."bookings"."calendar_event_id" is not null),
	CONSTRAINT "bookings_cancelled_at_matches_status" CHECK (("core"."bookings"."status" = 'cancelled') = ("core"."bookings"."cancelled_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "core"."busy_blocks" (
	"organization_id" text NOT NULL,
	"membership_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "busy_blocks_pkey" PRIMARY KEY("organization_id","membership_id","starts_at","ends_at"),
	CONSTRAINT "busy_blocks_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "busy_blocks_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "busy_blocks_ends_after_starts" CHECK ("core"."busy_blocks"."ends_at" > "core"."busy_blocks"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "core"."calendar_connections" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"membership_id" text NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'healthy' NOT NULL,
	"account_email" text NOT NULL,
	"calendar_id" text NOT NULL,
	"tokens_ciphertext" "bytea" NOT NULL,
	"last_refreshed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_connections_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "calendar_connections_id_shape" CHECK ("id" ~ '^cal_[0-9a-f]{32}$'),
	CONSTRAINT "calendar_connections_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "calendar_connections_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "calendar_connections_provider_known" CHECK ("core"."calendar_connections"."provider" in ('google', 'outlook')),
	CONSTRAINT "calendar_connections_status_known" CHECK ("core"."calendar_connections"."status" in ('healthy', 'needs_reconnect')),
	CONSTRAINT "calendar_connections_account_email_shape" CHECK (char_length("core"."calendar_connections"."account_email") between 3 and 320),
	CONSTRAINT "calendar_connections_calendar_id_shape" CHECK (char_length("core"."calendar_connections"."calendar_id") between 1 and 500),
	CONSTRAINT "calendar_connections_tokens_size" CHECK (octet_length("core"."calendar_connections"."tokens_ciphertext") between 1 and 8192)
);
--> statement-breakpoint
CREATE TABLE "core"."routing_decisions" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"purpose" text NOT NULL,
	"prospect_id" text,
	"booking_type_id" text,
	"rule_id" text,
	"chosen_membership_id" text,
	"candidates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skipped" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routing_decisions_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "routing_decisions_id_shape" CHECK ("id" ~ '^rdc_[0-9a-f]{32}$'),
	CONSTRAINT "routing_decisions_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "routing_decisions_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "routing_decisions_purpose_known" CHECK ("core"."routing_decisions"."purpose" in ('booking', 'handoff', 'test')),
	CONSTRAINT "routing_decisions_arrays_shape" CHECK (jsonb_typeof("core"."routing_decisions"."candidates") = 'array' and jsonb_typeof("core"."routing_decisions"."skipped") = 'array'
        and jsonb_array_length("core"."routing_decisions"."candidates") <= 20
        and jsonb_array_length("core"."routing_decisions"."skipped") <= 20),
	CONSTRAINT "routing_decisions_reason_shape" CHECK (char_length("core"."routing_decisions"."reason") between 1 and 500)
);
--> statement-breakpoint
CREATE TABLE "core"."routing_rules" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"target_kind" text NOT NULL,
	"target_membership_id" text,
	"target_team_id" text,
	"pool_name" text,
	"pool_membership_ids" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routing_rules_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "routing_rules_id_shape" CHECK ("id" ~ '^rul_[0-9a-f]{32}$'),
	CONSTRAINT "routing_rules_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "routing_rules_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "routing_rules_position_range" CHECK ("core"."routing_rules"."position" between 0 and 20000),
	CONSTRAINT "routing_rules_name_shape" CHECK (char_length("core"."routing_rules"."name") between 1 and 200 and "core"."routing_rules"."name" = btrim("core"."routing_rules"."name")),
	CONSTRAINT "routing_rules_conditions_shape" CHECK (jsonb_typeof("core"."routing_rules"."conditions") = 'object'),
	CONSTRAINT "routing_rules_target_kind_known" CHECK ("core"."routing_rules"."target_kind" in ('rep', 'team', 'pool')),
	CONSTRAINT "routing_rules_target_matches_kind" CHECK (("core"."routing_rules"."target_kind" = 'rep' and "core"."routing_rules"."target_membership_id" is not null and "core"."routing_rules"."target_team_id" is null and "core"."routing_rules"."pool_name" is null and "core"."routing_rules"."pool_membership_ids" is null)
        or ("core"."routing_rules"."target_kind" = 'team' and "core"."routing_rules"."target_team_id" is not null and "core"."routing_rules"."target_membership_id" is null and "core"."routing_rules"."pool_name" is null and "core"."routing_rules"."pool_membership_ids" is null)
        or ("core"."routing_rules"."target_kind" = 'pool' and "core"."routing_rules"."pool_name" is not null and "core"."routing_rules"."pool_membership_ids" is not null and "core"."routing_rules"."target_membership_id" is null and "core"."routing_rules"."target_team_id" is null)),
	CONSTRAINT "routing_rules_pool_shape" CHECK ("core"."routing_rules"."pool_name" is null or (char_length("core"."routing_rules"."pool_name") between 1 and 100
        and coalesce(cardinality("core"."routing_rules"."pool_membership_ids"), 0) between 1 and 20))
);
--> statement-breakpoint
CREATE TABLE "core"."routing_state" (
	"organization_id" text NOT NULL,
	"target_key" text NOT NULL,
	"last_membership_id" text,
	"cursor" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routing_state_pkey" PRIMARY KEY("organization_id","target_key"),
	CONSTRAINT "routing_state_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "routing_state_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "routing_state_target_key_shape" CHECK ("core"."routing_state"."target_key" ~ '^(rule|team):[a-z0-9_]{1,80}$'),
	CONSTRAINT "routing_state_last_membership_id_shape" CHECK ("core"."routing_state"."last_membership_id" is null or "core"."routing_state"."last_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "routing_state_cursor_not_negative" CHECK ("core"."routing_state"."cursor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "core"."working_hours" (
	"organization_id" text NOT NULL,
	"membership_id" text NOT NULL,
	"timezone" text NOT NULL,
	"windows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"daily_cap" smallint,
	"on_leave_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "working_hours_pkey" PRIMARY KEY("organization_id","membership_id"),
	CONSTRAINT "working_hours_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "working_hours_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "working_hours_timezone_shape" CHECK ("core"."working_hours"."timezone" ~ '^[A-Za-z][A-Za-z0-9_+/-]{0,63}$'),
	CONSTRAINT "working_hours_windows_shape" CHECK (jsonb_typeof("core"."working_hours"."windows") = 'array' and jsonb_array_length("core"."working_hours"."windows") <= 28),
	CONSTRAINT "working_hours_daily_cap_range" CHECK ("core"."working_hours"."daily_cap" is null or "core"."working_hours"."daily_cap" between 1 and 100)
);
--> statement-breakpoint
ALTER TABLE "core"."booking_types" ADD CONSTRAINT "booking_types_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."bookings" ADD CONSTRAINT "bookings_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."bookings" ADD CONSTRAINT "bookings_booking_type_fk" FOREIGN KEY ("organization_id","booking_type_id") REFERENCES "core"."booking_types"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."bookings" ADD CONSTRAINT "bookings_membership_fk" FOREIGN KEY ("organization_id","membership_id") REFERENCES "core"."memberships"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."bookings" ADD CONSTRAINT "bookings_prospect_fk" FOREIGN KEY ("organization_id","prospect_id") REFERENCES "core"."prospects"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."busy_blocks" ADD CONSTRAINT "busy_blocks_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."busy_blocks" ADD CONSTRAINT "busy_blocks_membership_fk" FOREIGN KEY ("organization_id","membership_id") REFERENCES "core"."memberships"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."calendar_connections" ADD CONSTRAINT "calendar_connections_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."calendar_connections" ADD CONSTRAINT "calendar_connections_membership_fk" FOREIGN KEY ("organization_id","membership_id") REFERENCES "core"."memberships"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."routing_decisions" ADD CONSTRAINT "routing_decisions_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."routing_rules" ADD CONSTRAINT "routing_rules_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."routing_rules" ADD CONSTRAINT "routing_rules_target_membership_fk" FOREIGN KEY ("organization_id","target_membership_id") REFERENCES "core"."memberships"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."routing_rules" ADD CONSTRAINT "routing_rules_target_team_fk" FOREIGN KEY ("organization_id","target_team_id") REFERENCES "core"."teams"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."routing_state" ADD CONSTRAINT "routing_state_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."working_hours" ADD CONSTRAINT "working_hours_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."working_hours" ADD CONSTRAINT "working_hours_membership_fk" FOREIGN KEY ("organization_id","membership_id") REFERENCES "core"."memberships"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_types_name_key" ON "core"."booking_types" USING btree ("organization_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "booking_types_public_token_key" ON "core"."booking_types" USING btree ("public_token_hash");--> statement-breakpoint
CREATE INDEX "booking_types_list_idx" ON "core"."booking_types" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_idempotency_key" ON "core"."bookings" USING btree ("organization_id","idempotency_key_hash");--> statement-breakpoint
CREATE INDEX "bookings_rep_idx" ON "core"."bookings" USING btree ("organization_id","membership_id","starts_at","id");--> statement-breakpoint
CREATE INDEX "bookings_list_idx" ON "core"."bookings" USING btree ("organization_id","starts_at","id");--> statement-breakpoint
CREATE INDEX "bookings_prospect_idx" ON "core"."bookings" USING btree ("organization_id","prospect_id","starts_at");--> statement-breakpoint
CREATE INDEX "bookings_booking_type_idx" ON "core"."bookings" USING btree ("organization_id","booking_type_id");--> statement-breakpoint
CREATE INDEX "busy_blocks_expiry_idx" ON "core"."busy_blocks" USING btree ("organization_id","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_connections_membership_key" ON "core"."calendar_connections" USING btree ("organization_id","membership_id");--> statement-breakpoint
CREATE INDEX "calendar_connections_list_idx" ON "core"."calendar_connections" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "routing_decisions_list_idx" ON "core"."routing_decisions" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "routing_decisions_prospect_idx" ON "core"."routing_decisions" USING btree ("organization_id","prospect_id","created_at");--> statement-breakpoint
CREATE INDEX "routing_rules_order_idx" ON "core"."routing_rules" USING btree ("organization_id","position","id");--> statement-breakpoint
CREATE INDEX "routing_rules_target_membership_idx" ON "core"."routing_rules" USING btree ("organization_id","target_membership_id");--> statement-breakpoint
CREATE INDEX "routing_rules_target_team_idx" ON "core"."routing_rules" USING btree ("organization_id","target_team_id");
--> statement-breakpoint
-- A Rep's time cannot be held twice: no two confirmed Bookings of one Rep overlap, buffers included.
-- Drizzle cannot declare an exclusion constraint, so it is written here. btree_gist lets the gist index
-- compare the equality columns.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "core"."bookings" ADD CONSTRAINT "bookings_rep_no_overlap" EXCLUDE USING gist ("organization_id" WITH =, "membership_id" WITH =, tstzrange("blocked_from", "blocked_until", '[)') WITH &&) WHERE ("status" = 'confirmed');
--> statement-breakpoint
ALTER TABLE "core"."booking_types" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."booking_types" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "booking_types_tenant_isolation" ON "core"."booking_types" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."bookings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."bookings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "bookings_tenant_isolation" ON "core"."bookings" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."busy_blocks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."busy_blocks" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "busy_blocks_tenant_isolation" ON "core"."busy_blocks" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."calendar_connections" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."calendar_connections" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "calendar_connections_tenant_isolation" ON "core"."calendar_connections" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."routing_decisions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."routing_decisions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "routing_decisions_tenant_isolation" ON "core"."routing_decisions" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."routing_rules" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."routing_rules" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "routing_rules_tenant_isolation" ON "core"."routing_rules" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."routing_state" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."routing_state" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "routing_state_tenant_isolation" ON "core"."routing_state" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."working_hours" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."working_hours" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "working_hours_tenant_isolation" ON "core"."working_hours" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
