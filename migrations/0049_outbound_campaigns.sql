CREATE TABLE "outbound"."campaigns" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"goal" text NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"audience" jsonb NOT NULL,
	"audience_version" integer DEFAULT 0 NOT NULL,
	"sequence_version" integer DEFAULT 0 NOT NULL,
	"previewed_version" integer,
	"previewed_at" timestamp with time zone,
	"approval_mode" text DEFAULT 'review' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"send_window" jsonb NOT NULL,
	"window_zone" text DEFAULT 'campaign' NOT NULL,
	"daily_cap" integer NOT NULL,
	"owner_membership_id" text NOT NULL,
	"team_id" text,
	"play_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"launched_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	CONSTRAINT "campaigns_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "campaigns_id_shape" CHECK ("id" ~ '^cpg_[0-9a-f]{32}$'),
	CONSTRAINT "campaigns_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "campaigns_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "campaigns_owner_membership_id_shape" CHECK ("owner_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "campaigns_team_id_shape" CHECK ("team_id" ~ '^team_[0-9a-f]{32}$'),
	CONSTRAINT "campaigns_play_id_shape" CHECK ("play_id" ~ '^ply_[0-9a-f]{32}$'),
	CONSTRAINT "campaigns_name_shape" CHECK (char_length("outbound"."campaigns"."name") between 1 and 100),
	CONSTRAINT "campaigns_goal_shape" CHECK (char_length("outbound"."campaigns"."goal") between 1 and 500),
	CONSTRAINT "campaigns_state_known" CHECK ("outbound"."campaigns"."state" in ('draft', 'ready', 'running', 'paused', 'archived')),
	CONSTRAINT "campaigns_approval_mode_known" CHECK ("outbound"."campaigns"."approval_mode" in ('auto', 'review', 'mixed')),
	CONSTRAINT "campaigns_language_known" CHECK ("outbound"."campaigns"."language" in ('en')),
	CONSTRAINT "campaigns_window_zone_known" CHECK ("outbound"."campaigns"."window_zone" in ('campaign', 'prospect')),
	CONSTRAINT "campaigns_audience_shape" CHECK (jsonb_typeof("outbound"."campaigns"."audience") = 'object'),
	CONSTRAINT "campaigns_versions_range" CHECK ("outbound"."campaigns"."audience_version" between 0 and 1000000
        and "outbound"."campaigns"."sequence_version" between 0 and 1000000
        and ("outbound"."campaigns"."previewed_version" is null
          or "outbound"."campaigns"."previewed_version" between 0 and 1000000)),
	CONSTRAINT "campaigns_send_window_shape" CHECK (jsonb_typeof("outbound"."campaigns"."send_window") = 'object'
        and ("outbound"."campaigns"."send_window"->>'startMinute')::int between 0 and 1439
        and ("outbound"."campaigns"."send_window"->>'endMinute')::int between 1 and 1440
        and ("outbound"."campaigns"."send_window"->>'endMinute')::int > ("outbound"."campaigns"."send_window"->>'startMinute')::int),
	CONSTRAINT "campaigns_daily_cap_range" CHECK ("outbound"."campaigns"."daily_cap" between 1 and 5000),
	CONSTRAINT "campaigns_archived_matches_state" CHECK (("outbound"."campaigns"."state" = 'archived') = ("outbound"."campaigns"."archived_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "outbound"."enrollment_events" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"enrollment_id" text NOT NULL,
	"kind" text NOT NULL,
	"step_key" text,
	"variant_key" text,
	"send_id" text,
	"stop_reason" text,
	"actor_membership_id" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollment_events_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "enrollment_events_id_shape" CHECK ("id" ~ '^eev_[0-9a-f]{32}$'),
	CONSTRAINT "enrollment_events_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "enrollment_events_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "enrollment_events_enrollment_id_shape" CHECK ("enrollment_id" ~ '^enr_[0-9a-f]{32}$'),
	CONSTRAINT "enrollment_events_step_key_shape" CHECK ("step_key" is null or "step_key" ~ '^[a-z][a-z0-9_-]{0,39}$'),
	CONSTRAINT "enrollment_events_variant_key_shape" CHECK ("variant_key" is null or "variant_key" ~ '^[a-z][a-z0-9_-]{0,39}$'),
	CONSTRAINT "enrollment_events_send_id_shape" CHECK ("send_id" ~ '^snd_[0-9a-f]{32}$'),
	CONSTRAINT "enrollment_events_actor_membership_id_shape" CHECK ("actor_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "enrollment_events_kind_known" CHECK ("outbound"."enrollment_events"."kind" in ('enrolled', 'step_entered', 'sent', 'deferred', 'refused', 'rep_task_created', 'branch_taken', 'stopped', 'completed')),
	CONSTRAINT "enrollment_events_stop_reason_matches_kind" CHECK (("outbound"."enrollment_events"."kind" = 'stopped') = ("outbound"."enrollment_events"."stop_reason" is not null)
        and ("outbound"."enrollment_events"."stop_reason" is null or "outbound"."enrollment_events"."stop_reason" in ('replied', 'hard_bounce', 'unsubscribed', 'complaint', 'suppressed', 'no_consent', 'unverified_address', 'removed_by_rep', 'meeting_booked', 'prospect_erased', 'campaign_archived')))
);
--> statement-breakpoint
CREATE TABLE "outbound"."enrollments" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"prospect_id" text NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"stop_reason" text,
	"current_step_key" text,
	"current_step" smallint,
	"attempt_epoch" integer DEFAULT 0 NOT NULL,
	"next_due_at" timestamp with time zone,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stopped_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "enrollments_id_shape" CHECK ("id" ~ '^enr_[0-9a-f]{32}$'),
	CONSTRAINT "enrollments_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "enrollments_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "enrollments_campaign_id_shape" CHECK ("campaign_id" ~ '^cpg_[0-9a-f]{32}$'),
	CONSTRAINT "enrollments_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "enrollments_current_step_key_shape" CHECK ("current_step_key" is null or "current_step_key" ~ '^[a-z][a-z0-9_-]{0,39}$'),
	CONSTRAINT "enrollments_state_known" CHECK ("outbound"."enrollments"."state" in ('active', 'completed', 'stopped')),
	CONSTRAINT "enrollments_stop_matches_state" CHECK (("outbound"."enrollments"."state" = 'stopped') = ("outbound"."enrollments"."stop_reason" is not null)
        and ("outbound"."enrollments"."state" = 'stopped') = ("outbound"."enrollments"."stopped_at" is not null)
        and ("outbound"."enrollments"."stop_reason" is null or "outbound"."enrollments"."stop_reason" in ('replied', 'hard_bounce', 'unsubscribed', 'complaint', 'suppressed', 'no_consent', 'unverified_address', 'removed_by_rep', 'meeting_booked', 'prospect_erased', 'campaign_archived'))),
	CONSTRAINT "enrollments_completed_matches_state" CHECK (("outbound"."enrollments"."state" = 'completed') = ("outbound"."enrollments"."completed_at" is not null)),
	CONSTRAINT "enrollments_step_matches_state" CHECK (("outbound"."enrollments"."current_step_key" is null) = ("outbound"."enrollments"."current_step" is null)
        and ("outbound"."enrollments"."state" <> 'active' or "outbound"."enrollments"."current_step_key" is not null)
        and ("outbound"."enrollments"."current_step" is null or "outbound"."enrollments"."current_step" between 0 and 49)),
	CONSTRAINT "enrollments_due_only_when_active" CHECK ("outbound"."enrollments"."state" = 'active' or "outbound"."enrollments"."next_due_at" is null),
	CONSTRAINT "enrollments_attempt_epoch_range" CHECK ("outbound"."enrollments"."attempt_epoch" between 0 and 1000)
);
--> statement-breakpoint
CREATE TABLE "outbound"."play_citations" (
	"organization_id" text NOT NULL,
	"play_id" text NOT NULL,
	"position" smallint NOT NULL,
	"kind" text NOT NULL,
	"call_id" text,
	"deal_record_id" text,
	"document_id" text,
	"page" integer,
	CONSTRAINT "play_citations_pkey" PRIMARY KEY("organization_id","play_id","position"),
	CONSTRAINT "play_citations_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "play_citations_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "play_citations_play_id_shape" CHECK ("play_id" ~ '^ply_[0-9a-f]{32}$'),
	CONSTRAINT "play_citations_call_id_shape" CHECK ("call_id" ~ '^call_[0-9a-f]{32}$'),
	CONSTRAINT "play_citations_deal_record_id_shape" CHECK ("deal_record_id" ~ '^deal_[0-9a-f]{32}$'),
	CONSTRAINT "play_citations_document_id_shape" CHECK ("document_id" ~ '^doc_[0-9a-f]{32}$'),
	CONSTRAINT "play_citations_position_range" CHECK ("outbound"."play_citations"."position" between 0 and 99),
	CONSTRAINT "play_citations_kind_known" CHECK ("outbound"."play_citations"."kind" in ('moment', 'document')),
	CONSTRAINT "play_citations_fields_match_kind" CHECK (("outbound"."play_citations"."kind" = 'moment' and "outbound"."play_citations"."call_id" is not null and "outbound"."play_citations"."deal_record_id" is not null
          and "outbound"."play_citations"."document_id" is null and "outbound"."play_citations"."page" is null)
        or ("outbound"."play_citations"."kind" = 'document' and "outbound"."play_citations"."document_id" is not null
          and "outbound"."play_citations"."call_id" is null and "outbound"."play_citations"."deal_record_id" is null
          and ("outbound"."play_citations"."page" is null or "outbound"."play_citations"."page" >= 1)))
);
--> statement-breakpoint
CREATE TABLE "outbound"."plays" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"intent" text NOT NULL,
	"goal" text NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_count" integer DEFAULT 0 NOT NULL,
	"created_by_membership_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plays_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "plays_id_shape" CHECK ("id" ~ '^ply_[0-9a-f]{32}$'),
	CONSTRAINT "plays_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "plays_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "plays_created_by_membership_id_shape" CHECK ("created_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "plays_name_shape" CHECK (char_length("outbound"."plays"."name") between 1 and 100),
	CONSTRAINT "plays_goal_shape" CHECK (char_length("outbound"."plays"."goal") between 1 and 500),
	CONSTRAINT "plays_intent_known" CHECK ("outbound"."plays"."intent" in ('cold_intro', 'closed_lost_reengagement', 'post_event_follow_up', 'nurture')),
	CONSTRAINT "plays_source_known" CHECK ("outbound"."plays"."source" in ('builtin', 'seeded', 'custom')),
	CONSTRAINT "plays_status_known" CHECK ("outbound"."plays"."status" in ('proposed', 'accepted', 'discarded')),
	CONSTRAINT "plays_steps_shape" CHECK (jsonb_typeof("outbound"."plays"."steps") = 'array' and jsonb_array_length("outbound"."plays"."steps") <= 50),
	CONSTRAINT "plays_evidence_count_range" CHECK ("outbound"."plays"."evidence_count" between 0 and 100000)
);
--> statement-breakpoint
CREATE TABLE "outbound"."send_decisions" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"enrollment_id" text NOT NULL,
	"prospect_id" text NOT NULL,
	"step" smallint NOT NULL,
	"attempt_epoch" integer DEFAULT 0 NOT NULL,
	"mailbox_id" text,
	"state" text NOT NULL,
	"reason" text,
	"checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"retry_at" timestamp with time zone,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "send_decisions_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "send_decisions_id_shape" CHECK ("id" ~ '^snd_[0-9a-f]{32}$'),
	CONSTRAINT "send_decisions_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "send_decisions_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "send_decisions_campaign_id_shape" CHECK ("campaign_id" ~ '^cpg_[0-9a-f]{32}$'),
	CONSTRAINT "send_decisions_enrollment_id_shape" CHECK ("enrollment_id" ~ '^enr_[0-9a-f]{32}$'),
	CONSTRAINT "send_decisions_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "send_decisions_mailbox_id_shape" CHECK ("mailbox_id" ~ '^mbx_[0-9a-f]{32}$'),
	CONSTRAINT "send_decisions_step_range" CHECK ("outbound"."send_decisions"."step" between 0 and 1000),
	CONSTRAINT "send_decisions_attempt_epoch_range" CHECK ("outbound"."send_decisions"."attempt_epoch" between 0 and 1000),
	CONSTRAINT "send_decisions_state_known" CHECK ("outbound"."send_decisions"."state" in ('sending', 'sent', 'refused', 'deferred', 'failed')),
	CONSTRAINT "send_decisions_reason_matches_state" CHECK (("outbound"."send_decisions"."state" in ('refused', 'deferred')) = ("outbound"."send_decisions"."reason" is not null)
        and ("outbound"."send_decisions"."reason" is null or "outbound"."send_decisions"."reason" in ('campaign_not_running', 'outside_window', 'unverified_address', 'suppressed', 'no_consent', 'mailbox_unavailable', 'limit_reached', 'organization_cap_reached', 'duplicate'))
        and ("outbound"."send_decisions"."state" <> 'refused' or "outbound"."send_decisions"."reason" not in ('outside_window', 'limit_reached', 'organization_cap_reached'))
        and ("outbound"."send_decisions"."state" <> 'deferred' or "outbound"."send_decisions"."reason" in ('outside_window', 'limit_reached', 'organization_cap_reached'))),
	CONSTRAINT "send_decisions_retry_matches_state" CHECK (("outbound"."send_decisions"."state" = 'deferred') = ("outbound"."send_decisions"."retry_at" is not null)),
	CONSTRAINT "send_decisions_mailbox_matches_state" CHECK ("outbound"."send_decisions"."state" not in ('sending', 'sent', 'failed') or "outbound"."send_decisions"."mailbox_id" is not null),
	CONSTRAINT "send_decisions_sent_matches_state" CHECK (("outbound"."send_decisions"."state" = 'sent') = ("outbound"."send_decisions"."sent_at" is not null)),
	CONSTRAINT "send_decisions_checks_shape" CHECK (jsonb_typeof("outbound"."send_decisions"."checks") = 'array'
        and jsonb_array_length("outbound"."send_decisions"."checks") <= 9)
);
--> statement-breakpoint
CREATE TABLE "outbound"."sequences" (
	"organization_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"version" integer NOT NULL,
	"created_by_membership_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sequences_pkey" PRIMARY KEY("organization_id","campaign_id","version"),
	CONSTRAINT "sequences_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "sequences_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "sequences_campaign_id_shape" CHECK ("campaign_id" ~ '^cpg_[0-9a-f]{32}$'),
	CONSTRAINT "sequences_created_by_membership_id_shape" CHECK ("created_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "sequences_version_range" CHECK ("outbound"."sequences"."version" between 1 and 1000000)
);
--> statement-breakpoint
CREATE TABLE "outbound"."steps" (
	"organization_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"version" integer NOT NULL,
	"position" smallint NOT NULL,
	"key" text NOT NULL,
	"kind" text NOT NULL,
	"goal" text,
	"next_key" text,
	"wait_hours" integer,
	"task" text,
	"instruction" text,
	"due_in_hours" integer,
	"arms" jsonb,
	"default_next_key" text,
	CONSTRAINT "steps_pkey" PRIMARY KEY("organization_id","campaign_id","version","position"),
	CONSTRAINT "steps_key_key" UNIQUE("organization_id","campaign_id","version","key"),
	CONSTRAINT "steps_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "steps_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "steps_campaign_id_shape" CHECK ("campaign_id" ~ '^cpg_[0-9a-f]{32}$'),
	CONSTRAINT "steps_key_shape" CHECK ("key" ~ '^[a-z][a-z0-9_-]{0,39}$'),
	CONSTRAINT "steps_next_key_shape" CHECK ("next_key" is null or "next_key" ~ '^[a-z][a-z0-9_-]{0,39}$'),
	CONSTRAINT "steps_default_next_key_shape" CHECK ("default_next_key" is null or "default_next_key" ~ '^[a-z][a-z0-9_-]{0,39}$'),
	CONSTRAINT "steps_position_range" CHECK ("outbound"."steps"."position" between 0 and 49),
	CONSTRAINT "steps_kind_known" CHECK ("outbound"."steps"."kind" in ('email', 'wait', 'branch', 'rep_task', 'end')),
	CONSTRAINT "steps_fields_match_kind" CHECK (("outbound"."steps"."kind" = 'email'
          and "outbound"."steps"."goal" is not null and char_length("outbound"."steps"."goal") between 1 and 500
          and "outbound"."steps"."next_key" is not null
          and "outbound"."steps"."wait_hours" is null and "outbound"."steps"."task" is null and "outbound"."steps"."instruction" is null
          and "outbound"."steps"."due_in_hours" is null and "outbound"."steps"."arms" is null and "outbound"."steps"."default_next_key" is null)
        or ("outbound"."steps"."kind" = 'wait'
          and "outbound"."steps"."wait_hours" is not null and "outbound"."steps"."wait_hours" between 1 and 2160
          and "outbound"."steps"."next_key" is not null
          and "outbound"."steps"."goal" is null and "outbound"."steps"."task" is null and "outbound"."steps"."instruction" is null
          and "outbound"."steps"."due_in_hours" is null and "outbound"."steps"."arms" is null and "outbound"."steps"."default_next_key" is null)
        or ("outbound"."steps"."kind" = 'branch'
          and jsonb_typeof("outbound"."steps"."arms") = 'array'
          and jsonb_array_length("outbound"."steps"."arms") between 1 and 5
          and "outbound"."steps"."default_next_key" is not null
          and "outbound"."steps"."goal" is null and "outbound"."steps"."next_key" is null and "outbound"."steps"."wait_hours" is null
          and "outbound"."steps"."task" is null and "outbound"."steps"."instruction" is null and "outbound"."steps"."due_in_hours" is null)
        or ("outbound"."steps"."kind" = 'rep_task'
          and "outbound"."steps"."task" in ('call', 'manual_message', 'research', 'other')
          and "outbound"."steps"."instruction" is not null and char_length("outbound"."steps"."instruction") between 1 and 500
          and "outbound"."steps"."due_in_hours" is not null and "outbound"."steps"."due_in_hours" between 1 and 2160
          and "outbound"."steps"."next_key" is not null
          and "outbound"."steps"."goal" is null and "outbound"."steps"."wait_hours" is null
          and "outbound"."steps"."arms" is null and "outbound"."steps"."default_next_key" is null)
        or ("outbound"."steps"."kind" = 'end'
          and "outbound"."steps"."goal" is null and "outbound"."steps"."next_key" is null and "outbound"."steps"."wait_hours" is null
          and "outbound"."steps"."task" is null and "outbound"."steps"."instruction" is null and "outbound"."steps"."due_in_hours" is null
          and "outbound"."steps"."arms" is null and "outbound"."steps"."default_next_key" is null))
);
--> statement-breakpoint
CREATE TABLE "outbound"."variants" (
	"organization_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"version" integer NOT NULL,
	"step_key" text NOT NULL,
	"key" text NOT NULL,
	"position" smallint NOT NULL,
	"label" text NOT NULL,
	"angle" text NOT NULL,
	"weight" smallint NOT NULL,
	"promoted_source" text,
	"promoted_by_membership_id" text,
	"promoted_at" timestamp with time zone,
	CONSTRAINT "variants_pkey" PRIMARY KEY("organization_id","campaign_id","version","step_key","key"),
	CONSTRAINT "variants_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "variants_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "variants_campaign_id_shape" CHECK ("campaign_id" ~ '^cpg_[0-9a-f]{32}$'),
	CONSTRAINT "variants_step_key_shape" CHECK ("step_key" ~ '^[a-z][a-z0-9_-]{0,39}$'),
	CONSTRAINT "variants_key_shape" CHECK ("key" ~ '^[a-z][a-z0-9_-]{0,39}$'),
	CONSTRAINT "variants_promoted_by_membership_id_shape" CHECK ("promoted_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "variants_position_range" CHECK ("outbound"."variants"."position" between 0 and 3),
	CONSTRAINT "variants_label_shape" CHECK (char_length("outbound"."variants"."label") between 1 and 100),
	CONSTRAINT "variants_angle_shape" CHECK (char_length("outbound"."variants"."angle") between 1 and 500),
	CONSTRAINT "variants_weight_range" CHECK ("outbound"."variants"."weight" between 1 and 99),
	CONSTRAINT "variants_promotion_matches" CHECK (("outbound"."variants"."promoted_source" is null) = ("outbound"."variants"."promoted_at" is null)
        and ("outbound"."variants"."promoted_source" is null or "outbound"."variants"."promoted_source" in ('auto', 'manual'))
        and (("outbound"."variants"."promoted_source" = 'manual') = ("outbound"."variants"."promoted_by_membership_id" is not null)))
);
--> statement-breakpoint
CREATE TABLE "outbound"."work_hints" (
	"kind" text NOT NULL,
	"organization_id" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	CONSTRAINT "work_hints_pkey" PRIMARY KEY("kind","organization_id"),
	CONSTRAINT "work_hints_kind_known" CHECK ("outbound"."work_hints"."kind" in ('step_due')),
	CONSTRAINT "work_hints_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$')
);
--> statement-breakpoint
ALTER TABLE "outbound"."campaigns" ADD CONSTRAINT "campaigns_play_fk" FOREIGN KEY ("organization_id","play_id") REFERENCES "outbound"."plays"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."enrollment_events" ADD CONSTRAINT "enrollment_events_enrollment_fk" FOREIGN KEY ("organization_id","enrollment_id") REFERENCES "outbound"."enrollments"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."enrollments" ADD CONSTRAINT "enrollments_campaign_fk" FOREIGN KEY ("organization_id","campaign_id") REFERENCES "outbound"."campaigns"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."play_citations" ADD CONSTRAINT "play_citations_play_fk" FOREIGN KEY ("organization_id","play_id") REFERENCES "outbound"."plays"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."send_decisions" ADD CONSTRAINT "send_decisions_campaign_fk" FOREIGN KEY ("organization_id","campaign_id") REFERENCES "outbound"."campaigns"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."send_decisions" ADD CONSTRAINT "send_decisions_enrollment_fk" FOREIGN KEY ("organization_id","enrollment_id") REFERENCES "outbound"."enrollments"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."sequences" ADD CONSTRAINT "sequences_campaign_fk" FOREIGN KEY ("organization_id","campaign_id") REFERENCES "outbound"."campaigns"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."steps" ADD CONSTRAINT "steps_sequence_fk" FOREIGN KEY ("organization_id","campaign_id","version") REFERENCES "outbound"."sequences"("organization_id","campaign_id","version") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."variants" ADD CONSTRAINT "variants_step_fk" FOREIGN KEY ("organization_id","campaign_id","version","step_key") REFERENCES "outbound"."steps"("organization_id","campaign_id","version","key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaigns_list_idx" ON "outbound"."campaigns" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "campaigns_state_idx" ON "outbound"."campaigns" USING btree ("organization_id","state","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "enrollment_events_enrollment_idx" ON "outbound"."enrollment_events" USING btree ("organization_id","enrollment_id","occurred_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_prospect_key" ON "outbound"."enrollments" USING btree ("organization_id","campaign_id","prospect_id");--> statement-breakpoint
CREATE INDEX "enrollments_due_idx" ON "outbound"."enrollments" USING btree ("organization_id","next_due_at") WHERE "outbound"."enrollments"."state" = 'active' and "outbound"."enrollments"."next_due_at" is not null;--> statement-breakpoint
CREATE INDEX "enrollments_list_idx" ON "outbound"."enrollments" USING btree ("organization_id","campaign_id","enrolled_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "enrollments_prospect_idx" ON "outbound"."enrollments" USING btree ("organization_id","prospect_id");--> statement-breakpoint
CREATE INDEX "plays_list_idx" ON "outbound"."plays" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "send_decisions_send_key" ON "outbound"."send_decisions" USING btree ("organization_id","enrollment_id","step","attempt_epoch");--> statement-breakpoint
CREATE INDEX "send_decisions_campaign_idx" ON "outbound"."send_decisions" USING btree ("organization_id","campaign_id","decided_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "send_decisions_retry_idx" ON "outbound"."send_decisions" USING btree ("organization_id","retry_at") WHERE "outbound"."send_decisions"."state" = 'deferred';--> statement-breakpoint
CREATE UNIQUE INDEX "variants_position_key" ON "outbound"."variants" USING btree ("organization_id","campaign_id","version","step_key","position");--> statement-breakpoint
CREATE UNIQUE INDEX "variants_promoted_key" ON "outbound"."variants" USING btree ("organization_id","campaign_id","version","step_key") WHERE "outbound"."variants"."promoted_source" is not null;--> statement-breakpoint
CREATE INDEX "work_hints_due_idx" ON "outbound"."work_hints" USING btree ("kind","due_at","organization_id");
--> statement-breakpoint

-- Row-level security: every tenant table fails closed on organization_id.
ALTER TABLE "outbound"."campaigns" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."campaigns" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "campaigns_tenant_isolation" ON "outbound"."campaigns" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."sequences" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."sequences" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "sequences_tenant_isolation" ON "outbound"."sequences" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."steps" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."steps" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "steps_tenant_isolation" ON "outbound"."steps" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."variants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."variants" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "variants_tenant_isolation" ON "outbound"."variants" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."enrollments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."enrollments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "enrollments_tenant_isolation" ON "outbound"."enrollments" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."enrollment_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."enrollment_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "enrollment_events_tenant_isolation" ON "outbound"."enrollment_events" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."plays" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."plays" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "plays_tenant_isolation" ON "outbound"."plays" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."play_citations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."play_citations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "play_citations_tenant_isolation" ON "outbound"."play_citations" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."send_decisions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."send_decisions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "send_decisions_tenant_isolation" ON "outbound"."send_decisions" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint

-- History is append-only for the service role: it may insert and read events, never rewrite them.
REVOKE UPDATE ON "outbound"."enrollment_events" FROM closeline_outbound;
--> statement-breakpoint

-- The work registry is not a tenant table and no service role holds any privilege on it. Mirrors
-- "playbook"."work_hints" (migration 0012): the trigger and the discovery function below, both
-- SECURITY DEFINER, are the only way in.
REVOKE ALL ON "outbound"."work_hints" FROM closeline_outbound;
--> statement-breakpoint

-- Notes that an Organization may have work of a kind from p_due_at on, only ever moving the hint
-- earlier. The locking argument is the one in migration 0012 (FOR KEY SHARE first, then upsert).
CREATE FUNCTION "outbound"."note_work"(p_kind text, p_organization_id text, p_due_at timestamptz) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  PERFORM 1 FROM "outbound"."work_hints" h
    WHERE h."kind" = p_kind AND h."organization_id" = p_organization_id AND h."due_at" <= p_due_at
    FOR KEY SHARE;
  IF FOUND THEN
    RETURN;
  END IF;
  INSERT INTO "outbound"."work_hints" AS h ("kind", "organization_id", "due_at")
  VALUES (p_kind, p_organization_id, p_due_at)
  ON CONFLICT ("kind", "organization_id") DO UPDATE SET "due_at" = EXCLUDED."due_at"
  WHERE h."due_at" > EXCLUDED."due_at";
END
$$;
--> statement-breakpoint

-- An Enrollment that is active with a due time carries step_due work from that time.
CREATE FUNCTION "outbound"."note_enrollment_work"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  PERFORM "outbound"."note_work"('step_due', NEW."organization_id", NEW."next_due_at");
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "enrollments_note_work_insert" AFTER INSERT ON "outbound"."enrollments"
  FOR EACH ROW WHEN (NEW."state" = 'active' AND NEW."next_due_at" IS NOT NULL)
  EXECUTE FUNCTION "outbound"."note_enrollment_work"();
--> statement-breakpoint
CREATE TRIGGER "enrollments_note_work_update" AFTER UPDATE OF "state", "next_due_at" ON "outbound"."enrollments"
  FOR EACH ROW WHEN (NEW."state" = 'active' AND NEW."next_due_at" IS NOT NULL)
  EXECUTE FUNCTION "outbound"."note_enrollment_work"();
--> statement-breakpoint

-- The sweep: the Organizations with work of a kind due now, as ids only. It refuses to run inside an
-- Organization's scope. It takes each due hint FOR UPDATE SKIP LOCKED, re-derives the next due time
-- from "enrollments" in that Organization's scope, then removes the hint (no work), moves it later,
-- or keeps it and returns the id (due now). It visits at most four times the batch (at most 2000)
-- hints per call; when it visited some but returned none it returns one marker row (NULL id) with
-- the place to resume. Unlike the playbook's, it has no global scope and one kind.
CREATE FUNCTION "outbound"."organizations_with_work"(p_kind text, p_after_id text, p_batch integer)
  RETURNS TABLE ("organization_id" text, "resume_after" text) LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = pg_catalog, pg_temp AS $$
#variable_conflict use_column
DECLARE
  v_batch integer := least(greatest(coalesce(p_batch, 1), 1), 500);
  v_limit integer := least(v_batch * 4, 2000);
  v_after text := coalesce(p_after_id, '');
  v_hint record;
  v_next timestamptz;
  v_ids text[] := ARRAY[]::text[];
  v_visited integer := 0;
  v_last text;
BEGIN
  IF nullif(current_setting('app.organization_id', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'outbound.work_scope: the sweep runs outside any Organization''s scope'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('step_due') THEN
    RAISE EXCEPTION 'outbound.work_kind: unknown kind of work' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  FOR v_hint IN
    SELECT h."organization_id" AS org FROM "outbound"."work_hints" h
    WHERE h."kind" = p_kind AND h."organization_id" > v_after AND h."due_at" <= clock_timestamp()
    ORDER BY h."organization_id"
    FOR UPDATE OF h SKIP LOCKED
  LOOP
    v_visited := v_visited + 1;
    v_last := v_hint.org;
    PERFORM set_config('app.organization_id', v_hint.org, true);
    SELECT min(e."next_due_at") INTO v_next FROM "outbound"."enrollments" e
      WHERE e."organization_id" = v_hint.org AND e."state" = 'active' AND e."next_due_at" IS NOT NULL;
    IF v_next IS NULL THEN
      DELETE FROM "outbound"."work_hints" w WHERE w."kind" = p_kind AND w."organization_id" = v_hint.org;
    ELSE
      UPDATE "outbound"."work_hints" w SET "due_at" = v_next
        WHERE w."kind" = p_kind AND w."organization_id" = v_hint.org;
      IF v_next <= clock_timestamp() THEN
        v_ids := v_ids || v_hint.org;
      END IF;
    END IF;
    EXIT WHEN cardinality(v_ids) >= v_batch OR v_visited >= v_limit;
  END LOOP;
  PERFORM set_config('app.organization_id', '', true);
  IF cardinality(v_ids) > 0 THEN
    RETURN QUERY SELECT u.i, v_last FROM unnest(v_ids) WITH ORDINALITY AS u(i, n) ORDER BY u.n;
  ELSIF v_visited > 0 THEN
    RETURN QUERY SELECT NULL::text, v_last;
  END IF;
  RETURN;
END
$$;
--> statement-breakpoint

-- Only the trigger runs the note functions; the one entry point is the outbound role's alone.
REVOKE ALL ON FUNCTION "outbound"."note_work"(text, text, timestamptz), "outbound"."note_enrollment_work"() FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "outbound"."organizations_with_work"(text, text, integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "outbound"."organizations_with_work"(text, text, integer) TO closeline_outbound;
