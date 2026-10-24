CREATE TABLE "outbound"."health_daily" (
	"organization_id" text NOT NULL,
	"mailbox_id" text NOT NULL,
	"day" date NOT NULL,
	"score" smallint,
	"sent" integer DEFAULT 0 NOT NULL,
	"hard_bounces" integer DEFAULT 0 NOT NULL,
	"soft_bounces" integer DEFAULT 0 NOT NULL,
	"complaints" integer DEFAULT 0 NOT NULL,
	"replies" integer DEFAULT 0 NOT NULL,
	"errors" integer DEFAULT 0 NOT NULL,
	"components" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_daily_pkey" PRIMARY KEY("organization_id","mailbox_id","day"),
	CONSTRAINT "health_daily_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "health_daily_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "health_daily_mailbox_id_shape" CHECK ("mailbox_id" ~ '^mbx_[0-9a-f]{32}$'),
	CONSTRAINT "health_daily_score_range" CHECK ("outbound"."health_daily"."score" is null or "outbound"."health_daily"."score" between 0 and 100),
	CONSTRAINT "health_daily_counts_range" CHECK ("outbound"."health_daily"."sent" between 0 and 10000000
        and "outbound"."health_daily"."hard_bounces" between 0 and 10000000
        and "outbound"."health_daily"."soft_bounces" between 0 and 10000000
        and "outbound"."health_daily"."complaints" between 0 and 10000000
        and "outbound"."health_daily"."replies" between 0 and 10000000
        and "outbound"."health_daily"."errors" between 0 and 10000000),
	CONSTRAINT "health_daily_components_shape" CHECK (jsonb_typeof("outbound"."health_daily"."components") = 'array' and jsonb_array_length("outbound"."health_daily"."components") <= 10)
);
--> statement-breakpoint
CREATE TABLE "outbound"."mail_events" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"mailbox_id" text NOT NULL,
	"kind" text NOT NULL,
	"send_id" text,
	"prospect_id" text,
	"enrollment_id" text,
	"provider_message_id" text NOT NULL,
	"return_date" date,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_events_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "mail_events_id_shape" CHECK ("id" ~ '^mev_[0-9a-f]{32}$'),
	CONSTRAINT "mail_events_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "mail_events_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "mail_events_mailbox_id_shape" CHECK ("mailbox_id" ~ '^mbx_[0-9a-f]{32}$'),
	CONSTRAINT "mail_events_kind_known" CHECK ("outbound"."mail_events"."kind" in ('hard_bounce', 'soft_bounce', 'complaint', 'reply', 'out_of_office', 'unsubscribe')),
	CONSTRAINT "mail_events_send_id_shape" CHECK ("send_id" ~ '^snd_[0-9a-f]{32}$'),
	CONSTRAINT "mail_events_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "mail_events_enrollment_id_shape" CHECK ("enrollment_id" ~ '^enr_[0-9a-f]{32}$'),
	CONSTRAINT "mail_events_provider_message_id_shape" CHECK ("outbound"."mail_events"."provider_message_id" ~ '^[!-~]{1,255}$'),
	CONSTRAINT "mail_events_return_date_only_out_of_office" CHECK ("outbound"."mail_events"."return_date" is null or "outbound"."mail_events"."kind" = 'out_of_office')
);
--> statement-breakpoint
CREATE TABLE "outbound"."mail_messages" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"enrollment_id" text NOT NULL,
	"prospect_id" text NOT NULL,
	"draft_id" text,
	"step" integer NOT NULL,
	"attempt_epoch" integer NOT NULL,
	"send_key" text NOT NULL,
	"mailbox_id" text,
	"state" text NOT NULL,
	"reason" text,
	"checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"retry_at" timestamp with time zone,
	"provider_message_id" text,
	"provider_thread_id" text,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_messages_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "mail_messages_id_mailbox_key" UNIQUE("organization_id","id","mailbox_id"),
	CONSTRAINT "mail_messages_id_shape" CHECK ("id" ~ '^snd_[0-9a-f]{32}$'),
	CONSTRAINT "mail_messages_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "mail_messages_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "mail_messages_campaign_id_shape" CHECK ("campaign_id" ~ '^cpg_[0-9a-f]{32}$'),
	CONSTRAINT "mail_messages_enrollment_id_shape" CHECK ("enrollment_id" ~ '^enr_[0-9a-f]{32}$'),
	CONSTRAINT "mail_messages_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "mail_messages_draft_id_shape" CHECK ("draft_id" ~ '^drf_[0-9a-f]{32}$'),
	CONSTRAINT "mail_messages_mailbox_id_shape" CHECK ("mailbox_id" ~ '^mbx_[0-9a-f]{32}$'),
	CONSTRAINT "mail_messages_step_range" CHECK ("outbound"."mail_messages"."step" between 0 and 1000),
	CONSTRAINT "mail_messages_attempt_epoch_range" CHECK ("outbound"."mail_messages"."attempt_epoch" between 0 and 1000),
	CONSTRAINT "mail_messages_send_key_matches" CHECK ("outbound"."mail_messages"."send_key" = "outbound"."mail_messages"."enrollment_id" || ':' || "outbound"."mail_messages"."step"::text || ':' || "outbound"."mail_messages"."attempt_epoch"::text),
	CONSTRAINT "mail_messages_state_known" CHECK ("outbound"."mail_messages"."state" in ('sending', 'sent', 'refused', 'deferred', 'failed')),
	CONSTRAINT "mail_messages_reason_known" CHECK ("outbound"."mail_messages"."reason" is null or "outbound"."mail_messages"."reason" in ('campaign_not_running', 'outside_window', 'unverified_address', 'suppressed', 'no_consent', 'mailbox_unavailable', 'limit_reached', 'organization_cap_reached', 'duplicate')),
	CONSTRAINT "mail_messages_reason_matches_state" CHECK (("outbound"."mail_messages"."state" in ('refused', 'deferred')) = ("outbound"."mail_messages"."reason" is not null)),
	CONSTRAINT "mail_messages_reason_fits_state" CHECK ("outbound"."mail_messages"."state" not in ('refused', 'deferred')
        or (("outbound"."mail_messages"."state" = 'deferred') = ("outbound"."mail_messages"."reason" in ('outside_window', 'limit_reached', 'organization_cap_reached')))),
	CONSTRAINT "mail_messages_retry_at_matches_state" CHECK (("outbound"."mail_messages"."state" = 'deferred') = ("outbound"."mail_messages"."retry_at" is not null)),
	CONSTRAINT "mail_messages_mailbox_when_sending" CHECK ("outbound"."mail_messages"."state" not in ('sending', 'sent', 'failed') or "outbound"."mail_messages"."mailbox_id" is not null),
	CONSTRAINT "mail_messages_sent_at_matches_state" CHECK (("outbound"."mail_messages"."state" = 'sent') = ("outbound"."mail_messages"."sent_at" is not null)),
	CONSTRAINT "mail_messages_provider_ids_only_when_sent" CHECK (("outbound"."mail_messages"."provider_message_id" is null and "outbound"."mail_messages"."provider_thread_id" is null) or "outbound"."mail_messages"."state" = 'sent'),
	CONSTRAINT "mail_messages_provider_message_id_shape" CHECK ("outbound"."mail_messages"."provider_message_id" is null or "outbound"."mail_messages"."provider_message_id" ~ '^[!-~]{1,255}$'),
	CONSTRAINT "mail_messages_provider_thread_id_shape" CHECK ("outbound"."mail_messages"."provider_thread_id" is null or char_length("outbound"."mail_messages"."provider_thread_id") between 1 and 2048),
	CONSTRAINT "mail_messages_checks_shape" CHECK (jsonb_typeof("outbound"."mail_messages"."checks") = 'array' and jsonb_array_length("outbound"."mail_messages"."checks") <= 9)
);
--> statement-breakpoint
CREATE TABLE "outbound"."mailbox_limits" (
	"organization_id" text NOT NULL,
	"mailbox_id" text NOT NULL,
	"per_day" integer NOT NULL,
	"per_hour" integer NOT NULL,
	"min_gap_seconds" integer DEFAULT 0 NOT NULL,
	"window_time_zone" text NOT NULL,
	"window_days" smallint DEFAULT 31 NOT NULL,
	"window_start_minute" smallint DEFAULT 540 NOT NULL,
	"window_end_minute" smallint DEFAULT 1020 NOT NULL,
	"updated_by_membership_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mailbox_limits_pkey" PRIMARY KEY("organization_id","mailbox_id"),
	CONSTRAINT "mailbox_limits_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "mailbox_limits_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "mailbox_limits_mailbox_id_shape" CHECK ("mailbox_id" ~ '^mbx_[0-9a-f]{32}$'),
	CONSTRAINT "mailbox_limits_per_day_range" CHECK ("outbound"."mailbox_limits"."per_day" between 1 and 500),
	CONSTRAINT "mailbox_limits_per_hour_range" CHECK ("outbound"."mailbox_limits"."per_hour" between 1 and 100),
	CONSTRAINT "mailbox_limits_min_gap_range" CHECK ("outbound"."mailbox_limits"."min_gap_seconds" between 0 and 3600),
	CONSTRAINT "mailbox_limits_window_time_zone_shape" CHECK (char_length("outbound"."mailbox_limits"."window_time_zone") between 1 and 64),
	CONSTRAINT "mailbox_limits_window_days_range" CHECK ("outbound"."mailbox_limits"."window_days" between 1 and 127),
	CONSTRAINT "mailbox_limits_window_minutes_range" CHECK ("outbound"."mailbox_limits"."window_start_minute" between 0 and 1439
        and "outbound"."mailbox_limits"."window_end_minute" between 1 and 1440
        and "outbound"."mailbox_limits"."window_end_minute" > "outbound"."mailbox_limits"."window_start_minute"),
	CONSTRAINT "mailbox_limits_updated_by_membership_id_shape" CHECK ("updated_by_membership_id" ~ '^mem_[0-9a-f]{32}$')
);
--> statement-breakpoint
CREATE TABLE "outbound"."mailboxes" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"provider" text NOT NULL,
	"kind" text NOT NULL,
	"address" text NOT NULL,
	"display_name" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"owner_membership_id" text,
	"team_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"state" text DEFAULT 'warming' NOT NULL,
	"state_reason" text,
	"state_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"access_token_ciphertext" "bytea",
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_ciphertext" "bytea",
	"token_key_id" text,
	"sync_cursor" text,
	"last_synced_at" timestamp with time zone,
	"next_poll_at" timestamp with time zone,
	"health_score" smallint,
	"health_effect" text DEFAULT 'none' NOT NULL,
	"health_scored_at" timestamp with time zone,
	"ramp_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disconnected_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mailboxes_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "mailboxes_id_shape" CHECK ("id" ~ '^mbx_[0-9a-f]{32}$'),
	CONSTRAINT "mailboxes_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "mailboxes_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "mailboxes_provider_known" CHECK ("outbound"."mailboxes"."provider" in ('gmail', 'outlook')),
	CONSTRAINT "mailboxes_kind_known" CHECK ("outbound"."mailboxes"."kind" in ('personal', 'shared')),
	CONSTRAINT "mailboxes_address_shape" CHECK (char_length("outbound"."mailboxes"."address") between 3 and 254
        and "outbound"."mailboxes"."address" = lower("outbound"."mailboxes"."address")
        and "outbound"."mailboxes"."address" ~ '^[^@[:space:]]+@[^@[:space:]]+$'),
	CONSTRAINT "mailboxes_display_name_shape" CHECK (char_length("outbound"."mailboxes"."display_name") between 1 and 100),
	CONSTRAINT "mailboxes_provider_account_id_shape" CHECK (char_length("outbound"."mailboxes"."provider_account_id") between 1 and 2048),
	CONSTRAINT "mailboxes_owner_membership_id_shape" CHECK ("owner_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "mailboxes_owner_matches_kind" CHECK (("outbound"."mailboxes"."kind" = 'personal') = ("outbound"."mailboxes"."owner_membership_id" is not null)),
	CONSTRAINT "mailboxes_team_ids_shape" CHECK (cardinality("outbound"."mailboxes"."team_ids") <= 50
        and array_to_string("outbound"."mailboxes"."team_ids", ',') ~ '^(team_[0-9a-f]{32}(,team_[0-9a-f]{32})*)?$'),
	CONSTRAINT "mailboxes_teams_only_shared" CHECK ("outbound"."mailboxes"."kind" = 'shared' or cardinality("outbound"."mailboxes"."team_ids") = 0),
	CONSTRAINT "mailboxes_state_known" CHECK ("outbound"."mailboxes"."state" in ('warming', 'healthy', 'limited', 'paused', 'disconnected')),
	CONSTRAINT "mailboxes_state_reason_known" CHECK ("outbound"."mailboxes"."state_reason" is null or "outbound"."mailboxes"."state_reason" in ('owner_paused', 'admin_paused', 'complaint_spike', 'bounce_spike', 'provider_suspended', 'auth_revoked', 'disconnected_by_owner', 'health_warning')),
	CONSTRAINT "mailboxes_state_reason_matches_state" CHECK (case when "outbound"."mailboxes"."state" = 'limited' then "outbound"."mailboxes"."state_reason" is not null
        else ("outbound"."mailboxes"."state" in ('paused', 'disconnected')) = ("outbound"."mailboxes"."state_reason" is not null) end),
	CONSTRAINT "mailboxes_disconnected_at_matches_state" CHECK (("outbound"."mailboxes"."state" = 'disconnected') = ("outbound"."mailboxes"."disconnected_at" is not null)),
	CONSTRAINT "mailboxes_tokens_shape" CHECK (("outbound"."mailboxes"."access_token_ciphertext" is null or octet_length("outbound"."mailboxes"."access_token_ciphertext") between 1 and 8192)
        and ("outbound"."mailboxes"."refresh_token_ciphertext" is null or octet_length("outbound"."mailboxes"."refresh_token_ciphertext") between 1 and 8192)
        and ("outbound"."mailboxes"."token_key_id" is null or char_length("outbound"."mailboxes"."token_key_id") between 1 and 64)
        and (("outbound"."mailboxes"."access_token_ciphertext" is null and "outbound"."mailboxes"."refresh_token_ciphertext" is null) = ("outbound"."mailboxes"."token_key_id" is null))
        and ("outbound"."mailboxes"."access_token_expires_at" is null or "outbound"."mailboxes"."access_token_ciphertext" is not null)),
	CONSTRAINT "mailboxes_disconnected_holds_no_tokens" CHECK ("outbound"."mailboxes"."state" <> 'disconnected'
        or ("outbound"."mailboxes"."access_token_ciphertext" is null and "outbound"."mailboxes"."refresh_token_ciphertext" is null)),
	CONSTRAINT "mailboxes_sync_cursor_shape" CHECK ("outbound"."mailboxes"."sync_cursor" is null or char_length("outbound"."mailboxes"."sync_cursor") between 1 and 2048),
	CONSTRAINT "mailboxes_health_score_range" CHECK ("outbound"."mailboxes"."health_score" is null or "outbound"."mailboxes"."health_score" between 0 and 100),
	CONSTRAINT "mailboxes_health_effect_known" CHECK ("outbound"."mailboxes"."health_effect" in ('none', 'limit_halved', 'paused')),
	CONSTRAINT "mailboxes_health_effect_needs_score" CHECK ("outbound"."mailboxes"."health_effect" = 'none' or "outbound"."mailboxes"."health_score" is not null)
);
--> statement-breakpoint
ALTER TABLE "outbound"."health_daily" ADD CONSTRAINT "health_daily_mailbox_fk" FOREIGN KEY ("organization_id","mailbox_id") REFERENCES "outbound"."mailboxes"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."mail_events" ADD CONSTRAINT "mail_events_mailbox_fk" FOREIGN KEY ("organization_id","mailbox_id") REFERENCES "outbound"."mailboxes"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."mail_events" ADD CONSTRAINT "mail_events_send_fk" FOREIGN KEY ("organization_id","send_id","mailbox_id") REFERENCES "outbound"."mail_messages"("organization_id","id","mailbox_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."mail_messages" ADD CONSTRAINT "mail_messages_mailbox_fk" FOREIGN KEY ("organization_id","mailbox_id") REFERENCES "outbound"."mailboxes"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."mailbox_limits" ADD CONSTRAINT "mailbox_limits_mailbox_fk" FOREIGN KEY ("organization_id","mailbox_id") REFERENCES "outbound"."mailboxes"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mail_events_provider_message_key" ON "outbound"."mail_events" USING btree ("organization_id","mailbox_id","provider_message_id");--> statement-breakpoint
CREATE INDEX "mail_events_list_idx" ON "outbound"."mail_events" USING btree ("organization_id","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mail_events_mailbox_idx" ON "outbound"."mail_events" USING btree ("organization_id","mailbox_id","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mail_events_mailbox_kind_idx" ON "outbound"."mail_events" USING btree ("organization_id","mailbox_id","kind","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mail_events_prospect_idx" ON "outbound"."mail_events" USING btree ("organization_id","prospect_id","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "outbound"."mail_events"."prospect_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "mail_messages_send_key_key" ON "outbound"."mail_messages" USING btree ("organization_id","send_key");--> statement-breakpoint
CREATE UNIQUE INDEX "mail_messages_provider_message_key" ON "outbound"."mail_messages" USING btree ("organization_id","mailbox_id","provider_message_id");--> statement-breakpoint
CREATE INDEX "mail_messages_list_idx" ON "outbound"."mail_messages" USING btree ("organization_id","decided_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mail_messages_campaign_idx" ON "outbound"."mail_messages" USING btree ("organization_id","campaign_id","decided_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mail_messages_prospect_idx" ON "outbound"."mail_messages" USING btree ("organization_id","prospect_id","decided_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mail_messages_mailbox_idx" ON "outbound"."mail_messages" USING btree ("organization_id","mailbox_id","decided_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "outbound"."mail_messages"."mailbox_id" is not null;--> statement-breakpoint
CREATE INDEX "mail_messages_state_idx" ON "outbound"."mail_messages" USING btree ("organization_id","state","decided_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mail_messages_enrollment_idx" ON "outbound"."mail_messages" USING btree ("organization_id","enrollment_id","step");--> statement-breakpoint
CREATE INDEX "mail_messages_sent_idx" ON "outbound"."mail_messages" USING btree ("organization_id","mailbox_id","sent_at" DESC NULLS LAST) WHERE "outbound"."mail_messages"."sent_at" is not null;--> statement-breakpoint
CREATE INDEX "mail_messages_sending_idx" ON "outbound"."mail_messages" USING btree ("organization_id","decided_at") WHERE "outbound"."mail_messages"."state" = 'sending';--> statement-breakpoint
CREATE INDEX "mail_messages_deferred_idx" ON "outbound"."mail_messages" USING btree ("organization_id","retry_at") WHERE "outbound"."mail_messages"."state" = 'deferred';--> statement-breakpoint
CREATE UNIQUE INDEX "mailboxes_address_key" ON "outbound"."mailboxes" USING btree ("organization_id","provider","address");--> statement-breakpoint
CREATE INDEX "mailboxes_list_idx" ON "outbound"."mailboxes" USING btree ("organization_id","connected_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mailboxes_owner_idx" ON "outbound"."mailboxes" USING btree ("organization_id","owner_membership_id","connected_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "outbound"."mailboxes"."owner_membership_id" is not null;--> statement-breakpoint
CREATE INDEX "mailboxes_state_idx" ON "outbound"."mailboxes" USING btree ("organization_id","state","connected_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mailboxes_poll_idx" ON "outbound"."mailboxes" USING btree ("organization_id","next_poll_at") WHERE "outbound"."mailboxes"."next_poll_at" is not null;
--> statement-breakpoint
ALTER TABLE "outbound"."mailboxes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."mailboxes" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "mailboxes_tenant_isolation" ON "outbound"."mailboxes" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."mailbox_limits" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."mailbox_limits" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "mailbox_limits_tenant_isolation" ON "outbound"."mailbox_limits" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."mail_messages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."mail_messages" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "mail_messages_tenant_isolation" ON "outbound"."mail_messages" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."mail_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."mail_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "mail_events_tenant_isolation" ON "outbound"."mail_events" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."health_daily" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."health_daily" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "health_daily_tenant_isolation" ON "outbound"."health_daily" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
REVOKE UPDATE ON "outbound"."mail_events" FROM closeline_outbound;
--> statement-breakpoint
REVOKE DELETE ON "outbound"."mailboxes" FROM closeline_outbound;
--> statement-breakpoint
REVOKE DELETE ON "outbound"."mail_messages" FROM closeline_outbound;
--> statement-breakpoint
REVOKE DELETE ON "outbound"."mail_events" FROM closeline_outbound;
