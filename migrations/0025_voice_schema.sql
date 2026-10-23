CREATE SCHEMA "voice";
--> statement-breakpoint
-- The voice service's login role (closeline_voice, created by docker/postgres/init.sql locally and
-- by infra elsewhere, before this migration runs) reaches its own schema only, like the other
-- services in migration 0000. The migration runs as the owner, so the default privileges below
-- apply to every table and sequence created here.
REVOKE ALL ON SCHEMA public FROM closeline_voice;
--> statement-breakpoint
REVOKE ALL ON SCHEMA "voice" FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "voice" TO closeline_voice;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "voice" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO closeline_voice;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "voice" GRANT USAGE, SELECT ON SEQUENCES TO closeline_voice;
--> statement-breakpoint
CREATE TABLE "voice"."call_events" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "voice"."call_events_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"call_id" text NOT NULL,
	"kind" text NOT NULL,
	"from_state" text,
	"to_state" text,
	"provider_event_id" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "call_events_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "call_events_id_shape" CHECK ("id" ~ '^vev_[0-9a-f]{32}$'),
	CONSTRAINT "call_events_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "call_events_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "call_events_call_id_shape" CHECK ("call_id" ~ '^call_[0-9a-f]{32}$'),
	CONSTRAINT "call_events_kind_known" CHECK ("voice"."call_events"."kind" in ('state_changed', 'disclosure_played', 'recording_started', 'recording_stored', 'recording_deleted', 'provider_callback')),
	CONSTRAINT "call_events_from_state_known" CHECK ("voice"."call_events"."from_state" is null or "voice"."call_events"."from_state" in ('ringing', 'connecting', 'disclosing', 'live', 'ended', 'failed', 'missed')),
	CONSTRAINT "call_events_to_state_known" CHECK ("voice"."call_events"."to_state" is null or "voice"."call_events"."to_state" in ('ringing', 'connecting', 'disclosing', 'live', 'ended', 'failed', 'missed')),
	CONSTRAINT "call_events_state_change" CHECK (("voice"."call_events"."kind" = 'state_changed') = ("voice"."call_events"."to_state" is not null)
        and ("voice"."call_events"."from_state" is null or "voice"."call_events"."to_state" is not null)),
	CONSTRAINT "call_events_provider_event_id_shape" CHECK ("voice"."call_events"."provider_event_id" is null or char_length("voice"."call_events"."provider_event_id") between 1 and 200)
);
--> statement-breakpoint
CREATE TABLE "voice"."calls" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"direction" text NOT NULL,
	"state" text NOT NULL,
	"line_id" text NOT NULL,
	"rep_membership_id" text,
	"prospect_id" text,
	"prospect_number" text NOT NULL,
	"provider_call_sid" text,
	"idempotency_key" text,
	"request_fingerprint" text,
	"disclosure_wording_version" integer,
	"disclosure_played_at" timestamp with time zone,
	"ai_assisted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer,
	"ended_by" text,
	"failure_reason" text,
	"deal_id" text,
	"note" text,
	"transcript_state" text DEFAULT 'pending' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calls_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "calls_id_shape" CHECK ("id" ~ '^call_[0-9a-f]{32}$'),
	CONSTRAINT "calls_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "calls_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "calls_line_id_shape" CHECK ("line_id" ~ '^line_[0-9a-f]{32}$'),
	CONSTRAINT "calls_rep_membership_id_shape" CHECK ("rep_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "calls_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "calls_prospect_number_shape" CHECK ("voice"."calls"."prospect_number" ~ '^\+[1-9][0-9]{6,14}$'),
	CONSTRAINT "calls_direction_known" CHECK ("voice"."calls"."direction" in ('inbound', 'outbound')),
	CONSTRAINT "calls_state_known" CHECK ("voice"."calls"."state" in ('ringing', 'connecting', 'disclosing', 'live', 'ended', 'failed', 'missed')),
	CONSTRAINT "calls_ended_by_known" CHECK ("voice"."calls"."ended_by" is null or "voice"."calls"."ended_by" in ('rep', 'prospect', 'system')),
	CONSTRAINT "calls_failure_reason_known" CHECK ("voice"."calls"."failure_reason" is null or "voice"."calls"."failure_reason" in ('disclosure_failed', 'carrier_dropped', 'carrier_rejected', 'busy', 'no_answer', 'rep_unreachable', 'provider_error', 'timeout')),
	CONSTRAINT "calls_transcript_state_known" CHECK ("voice"."calls"."transcript_state" in ('pending', 'ready', 'deleted')),
	CONSTRAINT "calls_provider_call_sid_shape" CHECK ("voice"."calls"."provider_call_sid" is null or char_length("voice"."calls"."provider_call_sid") between 1 and 64),
	CONSTRAINT "calls_idempotency_shape" CHECK (("voice"."calls"."idempotency_key" is null) = ("voice"."calls"."request_fingerprint" is null)
        and ("voice"."calls"."idempotency_key" is null or char_length("voice"."calls"."idempotency_key") between 1 and 255)
        and ("voice"."calls"."request_fingerprint" is null or "voice"."calls"."request_fingerprint" ~ '^[0-9a-f]{64}$')),
	CONSTRAINT "calls_disclosure_all_or_none" CHECK (("voice"."calls"."disclosure_wording_version" is null) = ("voice"."calls"."disclosure_played_at" is null)
        and ("voice"."calls"."disclosure_wording_version" is null or "voice"."calls"."disclosure_wording_version" >= 1)),
	CONSTRAINT "calls_live_has_disclosure" CHECK ("voice"."calls"."state" not in ('live', 'ended') or "voice"."calls"."disclosure_played_at" is not null),
	CONSTRAINT "calls_failed_has_reason" CHECK (("voice"."calls"."state" = 'failed') = ("voice"."calls"."failure_reason" is not null)),
	CONSTRAINT "calls_disclosure_failure" CHECK ("voice"."calls"."failure_reason" is distinct from 'disclosure_failed' or "voice"."calls"."disclosure_played_at" is null),
	CONSTRAINT "calls_final_has_end" CHECK (("voice"."calls"."state" in ('ended', 'failed', 'missed')) = ("voice"."calls"."ended_at" is not null)),
	CONSTRAINT "calls_answered" CHECK (("voice"."calls"."state" in ('live', 'ended')) = ("voice"."calls"."answered_at" is not null)),
	CONSTRAINT "calls_duration" CHECK (("voice"."calls"."state" = 'ended') = ("voice"."calls"."duration_seconds" is not null)),
	CONSTRAINT "calls_duration_bounds" CHECK ("voice"."calls"."duration_seconds" is null or "voice"."calls"."duration_seconds" between 0 and 43200),
	CONSTRAINT "calls_ended_by_final" CHECK ("voice"."calls"."ended_by" is null or "voice"."calls"."state" in ('ended', 'failed', 'missed')),
	CONSTRAINT "calls_times_ordered" CHECK (("voice"."calls"."answered_at" is null or "voice"."calls"."answered_at" >= "voice"."calls"."created_at")
        and ("voice"."calls"."ended_at" is null or "voice"."calls"."ended_at" >= "voice"."calls"."created_at")
        and ("voice"."calls"."answered_at" is null or "voice"."calls"."ended_at" is null or "voice"."calls"."ended_at" >= "voice"."calls"."answered_at")),
	CONSTRAINT "calls_wrap_up_only_ended" CHECK ("voice"."calls"."state" = 'ended' or ("voice"."calls"."deal_id" is null and "voice"."calls"."note" is null)),
	CONSTRAINT "calls_deal_id_shape" CHECK ("voice"."calls"."deal_id" is null or (char_length("voice"."calls"."deal_id") between 1 and 128
        and octet_length("voice"."calls"."deal_id") <= 512
        and "voice"."calls"."deal_id" = btrim("voice"."calls"."deal_id", E' \t\n\r\f\v'))),
	CONSTRAINT "calls_note_shape" CHECK ("voice"."calls"."note" is null or char_length("voice"."calls"."note") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "voice"."lines" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"number" text NOT NULL,
	"country" text NOT NULL,
	"label" text,
	"state" text NOT NULL,
	"assignment_kind" text DEFAULT 'unassigned' NOT NULL,
	"assignment_team_id" text,
	"assignment_membership_id" text,
	"provider_sid" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	CONSTRAINT "lines_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "lines_id_shape" CHECK ("id" ~ '^line_[0-9a-f]{32}$'),
	CONSTRAINT "lines_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "lines_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "lines_number_shape" CHECK ("voice"."lines"."number" ~ '^\+[1-9][0-9]{6,14}$'),
	CONSTRAINT "lines_country_shape" CHECK ("voice"."lines"."country" ~ '^[A-Z]{2}$'),
	CONSTRAINT "lines_label_shape" CHECK ("voice"."lines"."label" is null or char_length("voice"."lines"."label") between 1 and 100),
	CONSTRAINT "lines_state_known" CHECK ("voice"."lines"."state" in ('porting', 'active', 'released')),
	CONSTRAINT "lines_assignment_kind_known" CHECK ("voice"."lines"."assignment_kind" in ('unassigned', 'team', 'rep')),
	CONSTRAINT "lines_assignment_team_id_shape" CHECK ("assignment_team_id" ~ '^team_[0-9a-f]{32}$'),
	CONSTRAINT "lines_assignment_membership_id_shape" CHECK ("assignment_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "lines_assignment_matches_kind" CHECK (("voice"."lines"."assignment_kind" = 'team') = ("voice"."lines"."assignment_team_id" is not null)
        and ("voice"."lines"."assignment_kind" = 'rep') = ("voice"."lines"."assignment_membership_id" is not null)),
	CONSTRAINT "lines_provider_sid_shape" CHECK ("voice"."lines"."provider_sid" is null or char_length("voice"."lines"."provider_sid") between 1 and 64),
	CONSTRAINT "lines_released_at" CHECK (("voice"."lines"."state" = 'released') = ("voice"."lines"."released_at" is not null)),
	CONSTRAINT "lines_released_unassigned" CHECK ("voice"."lines"."state" <> 'released' or "voice"."lines"."assignment_kind" = 'unassigned')
);
--> statement-breakpoint
CREATE TABLE "voice"."recordings" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"call_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"size_bytes" bigint,
	"channels" smallint NOT NULL,
	"state" text DEFAULT 'storing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stored_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"purge_due_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recordings_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "recordings_id_shape" CHECK ("id" ~ '^rec_[0-9a-f]{32}$'),
	CONSTRAINT "recordings_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "recordings_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "recordings_call_id_shape" CHECK ("call_id" ~ '^call_[0-9a-f]{32}$'),
	CONSTRAINT "recordings_storage_key_shape" CHECK (char_length("voice"."recordings"."storage_key") between 1 and 512
        and "voice"."recordings"."storage_key" collate "C" ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]*$'),
	CONSTRAINT "recordings_channels_known" CHECK ("voice"."recordings"."channels" in (1, 2)),
	CONSTRAINT "recordings_state_known" CHECK ("voice"."recordings"."state" in ('storing', 'stored', 'deleted')),
	CONSTRAINT "recordings_size_bounds" CHECK ("voice"."recordings"."size_bytes" is null or "voice"."recordings"."size_bytes" >= 0),
	CONSTRAINT "recordings_stored" CHECK (("voice"."recordings"."state" <> 'storing' or ("voice"."recordings"."stored_at" is null and "voice"."recordings"."size_bytes" is null)) and ("voice"."recordings"."state" <> 'stored' or ("voice"."recordings"."stored_at" is not null and "voice"."recordings"."size_bytes" is not null))),
	CONSTRAINT "recordings_deleted" CHECK (("voice"."recordings"."state" = 'deleted') = ("voice"."recordings"."deleted_at" is not null)),
	CONSTRAINT "recordings_purge_only_deleted" CHECK ("voice"."recordings"."purge_due_at" is null or "voice"."recordings"."state" = 'deleted')
);
--> statement-breakpoint
ALTER TABLE "voice"."call_events" ADD CONSTRAINT "call_events_call_fk" FOREIGN KEY ("organization_id","call_id") REFERENCES "voice"."calls"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice"."calls" ADD CONSTRAINT "calls_line_fk" FOREIGN KEY ("organization_id","line_id") REFERENCES "voice"."lines"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice"."recordings" ADD CONSTRAINT "recordings_call_fk" FOREIGN KEY ("organization_id","call_id") REFERENCES "voice"."calls"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "call_events_provider_event_key" ON "voice"."call_events" USING btree ("organization_id","provider_event_id");--> statement-breakpoint
CREATE INDEX "call_events_call_idx" ON "voice"."call_events" USING btree ("organization_id","call_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "calls_provider_call_sid_key" ON "voice"."calls" USING btree ("organization_id","provider_call_sid") WHERE "voice"."calls"."provider_call_sid" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "calls_idempotency_key_key" ON "voice"."calls" USING btree ("organization_id","idempotency_key") WHERE "voice"."calls"."idempotency_key" is not null;--> statement-breakpoint
CREATE INDEX "calls_list_idx" ON "voice"."calls" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "calls_rep_list_idx" ON "voice"."calls" USING btree ("organization_id","rep_membership_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "voice"."calls"."rep_membership_id" is not null;--> statement-breakpoint
CREATE INDEX "calls_state_list_idx" ON "voice"."calls" USING btree ("organization_id","state","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "calls_prospect_list_idx" ON "voice"."calls" USING btree ("organization_id","prospect_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "voice"."calls"."prospect_id" is not null;--> statement-breakpoint
CREATE INDEX "calls_line_list_idx" ON "voice"."calls" USING btree ("organization_id","line_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "lines_number_live_key" ON "voice"."lines" USING btree ("number") WHERE "voice"."lines"."state" <> 'released';--> statement-breakpoint
CREATE UNIQUE INDEX "lines_provider_sid_key" ON "voice"."lines" USING btree ("organization_id","provider_sid") WHERE "voice"."lines"."provider_sid" is not null;--> statement-breakpoint
CREATE INDEX "lines_list_idx" ON "voice"."lines" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "lines_state_list_idx" ON "voice"."lines" USING btree ("organization_id","state","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "lines_team_idx" ON "voice"."lines" USING btree ("organization_id","assignment_team_id") WHERE "voice"."lines"."assignment_team_id" is not null;--> statement-breakpoint
CREATE INDEX "lines_rep_idx" ON "voice"."lines" USING btree ("organization_id","assignment_membership_id") WHERE "voice"."lines"."assignment_membership_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "recordings_call_key" ON "voice"."recordings" USING btree ("organization_id","call_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recordings_storage_key_key" ON "voice"."recordings" USING btree ("organization_id","storage_key");--> statement-breakpoint
CREATE INDEX "recordings_purge_idx" ON "voice"."recordings" USING btree ("organization_id","purge_due_at") WHERE "voice"."recordings"."state" = 'deleted' and "voice"."recordings"."purge_due_at" is not null;
--> statement-breakpoint
-- The event log is append-only: the service role can insert and delete (erasure and retention) but
-- holds no UPDATE, so an entry never changes after it is written.
REVOKE UPDATE ON "voice"."call_events" FROM closeline_voice;
--> statement-breakpoint
ALTER TABLE "voice"."lines" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."lines" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "lines_tenant_isolation" ON "voice"."lines" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "voice"."calls" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."calls" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "calls_tenant_isolation" ON "voice"."calls" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "voice"."call_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."call_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "call_events_tenant_isolation" ON "voice"."call_events" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "voice"."recordings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."recordings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "recordings_tenant_isolation" ON "voice"."recordings" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
