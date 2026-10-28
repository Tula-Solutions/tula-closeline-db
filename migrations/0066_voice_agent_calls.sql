CREATE TABLE "voice"."agent_calls" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"source" text NOT NULL,
	"prospect_id" text NOT NULL,
	"line_id" text,
	"enrollment_id" text,
	"step_key" text,
	"requested_by_membership_id" text,
	"attempt" smallint DEFAULT 1 NOT NULL,
	"state" text NOT NULL,
	"result" text,
	"end_reason" text,
	"gate_code" text,
	"retry_at" timestamp with time zone,
	"call_id" text,
	"duration_seconds" integer,
	"number_hash" "bytea",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dialed_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	CONSTRAINT "agent_calls_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "agent_calls_id_shape" CHECK ("id" ~ '^acl_[0-9a-f]{32}$'),
	CONSTRAINT "agent_calls_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "agent_calls_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "agent_calls_idempotency_key_shape" CHECK (char_length("voice"."agent_calls"."idempotency_key") between 16 and 128),
	CONSTRAINT "agent_calls_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "agent_calls_line_id_shape" CHECK ("line_id" ~ '^line_[0-9a-f]{32}$'),
	CONSTRAINT "agent_calls_enrollment_id_shape" CHECK ("enrollment_id" ~ '^enr_[0-9a-f]{32}$'),
	CONSTRAINT "agent_calls_step_key_shape" CHECK ("voice"."agent_calls"."step_key" is null or "voice"."agent_calls"."step_key" ~ '^[a-z][a-z0-9_-]{0,63}$'),
	CONSTRAINT "agent_calls_requested_by_shape" CHECK ("requested_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "agent_calls_call_id_shape" CHECK ("call_id" ~ '^call_[0-9a-f]{32}$'),
	CONSTRAINT "agent_calls_source_known" CHECK ("voice"."agent_calls"."source" in ('campaign_step', 'rep_request')),
	CONSTRAINT "agent_calls_state_known" CHECK ("voice"."agent_calls"."state" in ('queued', 'dialing', 'live', 'ended')),
	CONSTRAINT "agent_calls_result_known" CHECK ("voice"."agent_calls"."result" is null or "voice"."agent_calls"."result" in ('answered', 'voicemail', 'no_answer', 'busy', 'failed', 'blocked')),
	CONSTRAINT "agent_calls_end_reason_known" CHECK ("voice"."agent_calls"."end_reason" is null or "voice"."agent_calls"."end_reason" in ('booked', 'handed_off', 'not_interested', 'not_now', 'opted_out', 'prospect_hung_up', 'cap_reached', 'agent_ended')),
	CONSTRAINT "agent_calls_gate_code_known" CHECK ("voice"."agent_calls"."gate_code" is null or "voice"."agent_calls"."gate_code" in ('agent.paused', 'consent.missing', 'consent.withdrawn', 'consent.suppressed', 'consent.unavailable', 'agent.timezone_unknown', 'agent.outside_hours', 'agent_call.attempts_exhausted', 'agent_call.line_cap_reached')),
	CONSTRAINT "agent_calls_attempt_range" CHECK ("voice"."agent_calls"."attempt" between 1 and 3),
	CONSTRAINT "agent_calls_duration_range" CHECK ("voice"."agent_calls"."duration_seconds" is null or "voice"."agent_calls"."duration_seconds" between 0 and 1800),
	CONSTRAINT "agent_calls_number_hash_length" CHECK ("voice"."agent_calls"."number_hash" is null or octet_length("voice"."agent_calls"."number_hash") = 32),
	CONSTRAINT "agent_calls_result_iff_ended" CHECK (("voice"."agent_calls"."state" = 'ended') = ("voice"."agent_calls"."result" is not null)),
	CONSTRAINT "agent_calls_ended_at_iff_ended" CHECK (("voice"."agent_calls"."state" = 'ended') = ("voice"."agent_calls"."ended_at" is not null)),
	CONSTRAINT "agent_calls_end_reason_iff_answered" CHECK (coalesce("voice"."agent_calls"."result" = 'answered', false) = ("voice"."agent_calls"."end_reason" is not null)),
	CONSTRAINT "agent_calls_blocked_has_gate_code" CHECK ("voice"."agent_calls"."result" is distinct from 'blocked' or "voice"."agent_calls"."gate_code" is not null),
	CONSTRAINT "agent_calls_gate_code_when_blocked_or_queued" CHECK ("voice"."agent_calls"."gate_code" is null or coalesce("voice"."agent_calls"."result" = 'blocked', false) or "voice"."agent_calls"."state" = 'queued'),
	CONSTRAINT "agent_calls_retry_at_iff_queued" CHECK (("voice"."agent_calls"."state" = 'queued') = ("voice"."agent_calls"."retry_at" is not null)),
	CONSTRAINT "agent_calls_live_has_call" CHECK ("voice"."agent_calls"."state" <> 'live' or "voice"."agent_calls"."call_id" is not null),
	CONSTRAINT "agent_calls_undialed_has_no_call" CHECK (not ("voice"."agent_calls"."state" = 'queued' or "voice"."agent_calls"."result" = 'blocked') or "voice"."agent_calls"."call_id" is null),
	CONSTRAINT "agent_calls_duration_needs_call" CHECK ("voice"."agent_calls"."duration_seconds" is null or "voice"."agent_calls"."call_id" is not null),
	CONSTRAINT "agent_calls_dialed_at_iff_dialed" CHECK (("voice"."agent_calls"."dialed_at" is not null)
        = ("voice"."agent_calls"."state" in ('dialing', 'live') or ("voice"."agent_calls"."state" = 'ended' and "voice"."agent_calls"."result" <> 'blocked'))),
	CONSTRAINT "agent_calls_dialed_has_number_hash" CHECK ("voice"."agent_calls"."dialed_at" is null or "voice"."agent_calls"."number_hash" is not null),
	CONSTRAINT "agent_calls_source_shape" CHECK (("voice"."agent_calls"."source" = 'campaign_step'
          and "voice"."agent_calls"."enrollment_id" is not null and "voice"."agent_calls"."step_key" is not null
          and "voice"."agent_calls"."requested_by_membership_id" is null
          and "voice"."agent_calls"."idempotency_key" = "voice"."agent_calls"."enrollment_id" || ':' || "voice"."agent_calls"."step_key" || ':' || "voice"."agent_calls"."attempt"::text)
        or ("voice"."agent_calls"."source" = 'rep_request'
          and "voice"."agent_calls"."enrollment_id" is null and "voice"."agent_calls"."step_key" is null
          and "voice"."agent_calls"."requested_by_membership_id" is not null)),
	CONSTRAINT "agent_calls_times_in_order" CHECK (("voice"."agent_calls"."dialed_at" is null or "voice"."agent_calls"."dialed_at" >= "voice"."agent_calls"."created_at")
        and ("voice"."agent_calls"."ended_at" is null or "voice"."agent_calls"."ended_at" >= coalesce("voice"."agent_calls"."dialed_at", "voice"."agent_calls"."created_at")))
);
--> statement-breakpoint
ALTER TABLE "outbound"."enrollment_events" DROP CONSTRAINT "enrollment_events_kind_known";--> statement-breakpoint
ALTER TABLE "outbound"."enrollment_events" ADD COLUMN "call_result" text;--> statement-breakpoint
ALTER TABLE "voice"."lines" ADD COLUMN "max_concurrent_agent_calls" smallint DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "voice"."lines" ADD COLUMN "daily_agent_dial_cap" integer DEFAULT 150 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_calls_key" ON "voice"."agent_calls" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_calls_prospect_open_key" ON "voice"."agent_calls" USING btree ("organization_id","prospect_id") WHERE "voice"."agent_calls"."state" in ('queued', 'dialing', 'live');--> statement-breakpoint
CREATE INDEX "agent_calls_number_dials_idx" ON "voice"."agent_calls" USING btree ("organization_id","number_hash","dialed_at" DESC NULLS LAST) WHERE "voice"."agent_calls"."dialed_at" is not null;--> statement-breakpoint
CREATE INDEX "agent_calls_line_dials_idx" ON "voice"."agent_calls" USING btree ("organization_id","line_id","dialed_at" DESC NULLS LAST) WHERE "voice"."agent_calls"."dialed_at" is not null;--> statement-breakpoint
CREATE INDEX "agent_calls_line_open_idx" ON "voice"."agent_calls" USING btree ("organization_id","line_id") WHERE "voice"."agent_calls"."state" in ('dialing', 'live');--> statement-breakpoint
CREATE INDEX "agent_calls_enrollment_idx" ON "voice"."agent_calls" USING btree ("organization_id","enrollment_id","step_key") WHERE "voice"."agent_calls"."enrollment_id" is not null;--> statement-breakpoint
CREATE INDEX "agent_calls_list_idx" ON "voice"."agent_calls" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "agent_calls_prospect_idx" ON "voice"."agent_calls" USING btree ("organization_id","prospect_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "outbound"."enrollment_events" ADD CONSTRAINT "enrollment_events_call_result_matches_kind" CHECK (("outbound"."enrollment_events"."kind" = 'call_result') = ("outbound"."enrollment_events"."call_result" is not null)
        and ("outbound"."enrollment_events"."call_result" is null or "outbound"."enrollment_events"."call_result" in ('answered', 'voicemail', 'no_answer', 'busy', 'failed', 'blocked')));--> statement-breakpoint
ALTER TABLE "outbound"."enrollment_events" ADD CONSTRAINT "enrollment_events_kind_known" CHECK ("outbound"."enrollment_events"."kind" in ('enrolled', 'step_entered', 'sent', 'deferred', 'refused', 'rep_task_created', 'call_result', 'branch_taken', 'stopped', 'completed'));--> statement-breakpoint
ALTER TABLE "voice"."lines" ADD CONSTRAINT "lines_agent_call_caps_range" CHECK ("voice"."lines"."max_concurrent_agent_calls" between 1 and 50
        and "voice"."lines"."daily_agent_dial_cap" between 1 and 1000);--> statement-breakpoint
ALTER TABLE "voice"."agent_calls" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."agent_calls" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "agent_calls_tenant_isolation" ON "voice"."agent_calls" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
-- A record: the service role cannot delete a row, an ended row never changes, nothing truncates.
REVOKE DELETE ON "voice"."agent_calls" FROM closeline_voice;
--> statement-breakpoint
CREATE FUNCTION "voice"."refuse_agent_call_rewrite"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'voice.agent_call_final: an ended Agent Call does not change'
    USING ERRCODE = 'check_violation', CONSTRAINT = 'agent_calls_ended_final';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "agent_calls_ended_final" BEFORE UPDATE ON "voice"."agent_calls"
  FOR EACH ROW WHEN (OLD."state" = 'ended') EXECUTE FUNCTION "voice"."refuse_agent_call_rewrite"();
--> statement-breakpoint
CREATE FUNCTION "voice"."refuse_agent_call_truncate"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'voice.truncate_refused: Agent Calls are a record and are never truncated'
    USING ERRCODE = 'feature_not_supported';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "agent_calls_no_truncate" BEFORE TRUNCATE ON "voice"."agent_calls"
  FOR EACH STATEMENT EXECUTE FUNCTION "voice"."refuse_agent_call_truncate"();
--> statement-breakpoint
REVOKE ALL ON FUNCTION "voice"."refuse_agent_call_rewrite"(), "voice"."refuse_agent_call_truncate"() FROM PUBLIC;
