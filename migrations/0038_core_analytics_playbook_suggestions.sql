CREATE TABLE "core"."assessment_findings" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"assessment_id" text NOT NULL,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"span_start" integer NOT NULL,
	"span_end" integer NOT NULL,
	"explanation" text NOT NULL,
	"feedback" text,
	"feedback_by_membership_id" text,
	"feedback_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_findings_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "assessment_findings_id_shape" CHECK ("id" ~ '^fnd_[0-9a-f]{32}$'),
	CONSTRAINT "assessment_findings_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "assessment_findings_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "assessment_findings_assessment_id_shape" CHECK ("assessment_id" ~ '^asm_[0-9a-f]{32}$'),
	CONSTRAINT "assessment_findings_category_known" CHECK ("core"."assessment_findings"."category" in ('unsupported_claim', 'policy_deviation', 'missing_disclosure', 'tone')),
	CONSTRAINT "assessment_findings_severity_known" CHECK ("core"."assessment_findings"."severity" in ('low', 'medium', 'high')),
	CONSTRAINT "assessment_findings_span_bounds" CHECK ("core"."assessment_findings"."span_start" between 0 and 20000
        and "core"."assessment_findings"."span_end" between 1 and 20000
        and "core"."assessment_findings"."span_end" > "core"."assessment_findings"."span_start"),
	CONSTRAINT "assessment_findings_explanation_length" CHECK (char_length("core"."assessment_findings"."explanation") between 1 and 500),
	CONSTRAINT "assessment_findings_feedback_known" CHECK ("core"."assessment_findings"."feedback" in ('correct', 'false_alarm')),
	CONSTRAINT "assessment_findings_feedback_by_shape" CHECK ("core"."assessment_findings"."feedback_by_membership_id" is null or "core"."assessment_findings"."feedback_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "assessment_findings_feedback_complete" CHECK (("core"."assessment_findings"."feedback" is null) = ("core"."assessment_findings"."feedback_by_membership_id" is null)
        and ("core"."assessment_findings"."feedback" is null) = ("core"."assessment_findings"."feedback_at" is null))
);
--> statement-breakpoint
CREATE TABLE "core"."assessments" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"subject_kind" text NOT NULL,
	"draft_id" text,
	"draft_version" integer,
	"call_id" text,
	"turn_index" integer,
	"prospect_id" text,
	"agent_kind" text NOT NULL,
	"instruction_version" integer,
	"verdict" text NOT NULL,
	"judge_source" text DEFAULT 'model' NOT NULL,
	"worst_severity_rank" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "assessments_id_shape" CHECK ("id" ~ '^asm_[0-9a-f]{32}$'),
	CONSTRAINT "assessments_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "assessments_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "assessments_subject_kind_known" CHECK ("core"."assessments"."subject_kind" in ('draft', 'call_turn')),
	CONSTRAINT "assessments_subject_columns" CHECK (("core"."assessments"."subject_kind" = 'draft' and "core"."assessments"."draft_id" ~ '^drf_[0-9a-f]{32}$'
          and "core"."assessments"."draft_version" between 1 and 100000
          and "core"."assessments"."call_id" is null and "core"."assessments"."turn_index" is null)
        or ("core"."assessments"."subject_kind" = 'call_turn' and "core"."assessments"."call_id" ~ '^call_[0-9a-f]{32}$'
          and "core"."assessments"."turn_index" between 0 and 100000
          and "core"."assessments"."draft_id" is null and "core"."assessments"."draft_version" is null)),
	CONSTRAINT "assessments_prospect_id_shape" CHECK ("core"."assessments"."prospect_id" is null or "core"."assessments"."prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "assessments_agent_kind_known" CHECK ("core"."assessments"."agent_kind" in ('inbound', 'outbound')),
	CONSTRAINT "assessments_instruction_version_positive" CHECK ("core"."assessments"."instruction_version" is null or "core"."assessments"."instruction_version" >= 1),
	CONSTRAINT "assessments_verdict_known" CHECK ("core"."assessments"."verdict" in ('pass', 'warn', 'fail')),
	CONSTRAINT "assessments_judge_source_known" CHECK ("core"."assessments"."judge_source" in ('model', 'rules')),
	CONSTRAINT "assessments_severity_rank" CHECK (("core"."assessments"."worst_severity_rank" is null or "core"."assessments"."worst_severity_rank" between 1 and 3)
        and ("core"."assessments"."verdict" <> 'pass' or "core"."assessments"."worst_severity_rank" is null)
        and ("core"."assessments"."verdict" <> 'fail' or "core"."assessments"."worst_severity_rank" is not null))
);
--> statement-breakpoint
CREATE TABLE "core"."conversation_summaries" (
	"organization_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"summary" text NOT NULL,
	"outcome_label" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_summaries_pkey" PRIMARY KEY("organization_id","conversation_id"),
	CONSTRAINT "conversation_summaries_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "conversation_summaries_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "conversation_summaries_conversation_id_shape" CHECK ("conversation_id" ~ '^cnv_[0-9a-f]{32}$'),
	CONSTRAINT "conversation_summaries_summary_length" CHECK (char_length("core"."conversation_summaries"."summary") between 1 and 500),
	CONSTRAINT "conversation_summaries_outcome_label_known" CHECK ("core"."conversation_summaries"."outcome_label" in ('won', 'lost', 'open', 'no_response', 'meeting_booked'))
);
--> statement-breakpoint
CREATE TABLE "core"."rollup_daily" (
	"organization_id" text NOT NULL,
	"metric" text NOT NULL,
	"group_kind" text NOT NULL,
	"day" date NOT NULL,
	"group_key" text DEFAULT '' NOT NULL,
	"count" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rollup_daily_pkey" PRIMARY KEY("organization_id","metric","group_kind","day","group_key"),
	CONSTRAINT "rollup_daily_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "rollup_daily_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "rollup_daily_metric_known" CHECK ("core"."rollup_daily"."metric" in ('sends', 'replies', 'positive_replies', 'meetings', 'outcomes_won', 'outcomes_lost')),
	CONSTRAINT "rollup_daily_group_kind_known" CHECK ("core"."rollup_daily"."group_kind" in ('total', 'channel', 'agent_kind', 'campaign', 'rep')),
	CONSTRAINT "rollup_daily_group_key_shape" CHECK (("core"."rollup_daily"."group_kind" = 'total' and "core"."rollup_daily"."group_key" = '')
        or ("core"."rollup_daily"."group_kind" <> 'total' and char_length("core"."rollup_daily"."group_key") between 1 and 64)),
	CONSTRAINT "rollup_daily_count_bounds" CHECK ("core"."rollup_daily"."count" between 0 and 1000000000000)
);
--> statement-breakpoint
CREATE TABLE "core"."source_performance" (
	"organization_id" text NOT NULL,
	"source_kind" text NOT NULL,
	"source_key" text NOT NULL,
	"deals_touched" integer DEFAULT 0 NOT NULL,
	"deals_won" integer DEFAULT 0 NOT NULL,
	"flag" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_performance_pkey" PRIMARY KEY("organization_id","source_kind","source_key"),
	CONSTRAINT "source_performance_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "source_performance_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "source_performance_kind_known" CHECK ("core"."source_performance"."source_kind" in ('moment', 'document')),
	CONSTRAINT "source_performance_key_length" CHECK (char_length("core"."source_performance"."source_key") between 1 and 120),
	CONSTRAINT "source_performance_counts" CHECK ("core"."source_performance"."deals_touched" between 0 and 1000000000 and "core"."source_performance"."deals_won" between 0 and "core"."source_performance"."deals_touched"),
	CONSTRAINT "source_performance_flag_known" CHECK ("core"."source_performance"."flag" in ('cited_often_lost'))
);
--> statement-breakpoint
CREATE TABLE "core"."touches" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"kind" text NOT NULL,
	"ref_id" text NOT NULL,
	"prospect_id" text NOT NULL,
	"channel" text,
	"agent_kind" text,
	"rep_membership_id" text,
	"campaign_id" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"deal_record_id" text,
	"first_touch" boolean DEFAULT false NOT NULL,
	"last_touch" boolean DEFAULT false NOT NULL,
	"cited_sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "touches_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "touches_id_shape" CHECK ("id" ~ '^tch_[0-9a-f]{32}$'),
	CONSTRAINT "touches_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "touches_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "touches_kind_known" CHECK ("core"."touches"."kind" in ('message', 'call')),
	CONSTRAINT "touches_ref_id_shape" CHECK (("core"."touches"."kind" = 'message' and "core"."touches"."ref_id" ~ '^msg_[0-9a-f]{32}$')
        or ("core"."touches"."kind" = 'call' and "core"."touches"."ref_id" ~ '^call_[0-9a-f]{32}$')),
	CONSTRAINT "touches_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "touches_channel_known" CHECK ("core"."touches"."channel" in ('email', 'linkedin', 'chat', 'phone')),
	CONSTRAINT "touches_agent_kind_known" CHECK ("core"."touches"."agent_kind" in ('inbound', 'outbound')),
	CONSTRAINT "touches_rep_membership_id_shape" CHECK ("core"."touches"."rep_membership_id" is null or "core"."touches"."rep_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "touches_campaign_id_shape" CHECK ("core"."touches"."campaign_id" is null or "core"."touches"."campaign_id" ~ '^cpg_[0-9a-f]{32}$'),
	CONSTRAINT "touches_deal_record_id_shape" CHECK ("core"."touches"."deal_record_id" is null or "core"."touches"."deal_record_id" ~ '^deal_[0-9a-f]{32}$'),
	CONSTRAINT "touches_credit_needs_deal" CHECK ("core"."touches"."deal_record_id" is not null or (not "core"."touches"."first_touch" and not "core"."touches"."last_touch")),
	CONSTRAINT "touches_cited_sources_shape" CHECK (jsonb_typeof("core"."touches"."cited_sources") = 'array' and jsonb_array_length("core"."touches"."cited_sources") <= 20)
);
--> statement-breakpoint
CREATE TABLE "playbook"."suggestions" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"text" text NOT NULL,
	"fingerprint" "bytea" NOT NULL,
	"deal_record_id" text NOT NULL,
	"moments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by_membership_id" text,
	CONSTRAINT "suggestions_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "suggestions_id_shape" CHECK ("id" ~ '^sgs_[0-9a-f]{32}$'),
	CONSTRAINT "suggestions_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "suggestions_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "suggestions_kind_known" CHECK ("playbook"."suggestions"."kind" in ('objection_answer', 'discovery_question', 'closing_move')),
	CONSTRAINT "suggestions_status_known" CHECK ("playbook"."suggestions"."status" in ('pending', 'accepted', 'rejected')),
	CONSTRAINT "suggestions_text_length" CHECK (char_length(btrim("playbook"."suggestions"."text")) between 1 and 1000),
	CONSTRAINT "suggestions_fingerprint_length" CHECK (octet_length("playbook"."suggestions"."fingerprint") = 32),
	CONSTRAINT "suggestions_deal_record_id_shape" CHECK ("deal_record_id" ~ '^deal_[0-9a-f]{32}$'),
	CONSTRAINT "suggestions_moments_shape" CHECK (jsonb_typeof("playbook"."suggestions"."moments") = 'array' and jsonb_array_length("playbook"."suggestions"."moments") <= 10),
	CONSTRAINT "suggestions_decided_by_shape" CHECK ("playbook"."suggestions"."decided_by_membership_id" is null or "playbook"."suggestions"."decided_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "suggestions_decision_columns" CHECK (("playbook"."suggestions"."status" = 'pending' and "playbook"."suggestions"."decided_at" is null and "playbook"."suggestions"."decided_by_membership_id" is null)
        or ("playbook"."suggestions"."status" <> 'pending' and "playbook"."suggestions"."decided_at" is not null and "playbook"."suggestions"."decided_by_membership_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "playbook"."calls" ADD COLUMN "origin" text DEFAULT 'imported' NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."assessment_findings" ADD CONSTRAINT "assessment_findings_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."assessment_findings" ADD CONSTRAINT "assessment_findings_assessment_fk" FOREIGN KEY ("organization_id","assessment_id") REFERENCES "core"."assessments"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."assessments" ADD CONSTRAINT "assessments_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."conversation_summaries" ADD CONSTRAINT "conversation_summaries_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."rollup_daily" ADD CONSTRAINT "rollup_daily_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."source_performance" ADD CONSTRAINT "source_performance_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."touches" ADD CONSTRAINT "touches_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_findings_assessment_idx" ON "core"."assessment_findings" USING btree ("organization_id","assessment_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "assessments_draft_key" ON "core"."assessments" USING btree ("organization_id","draft_id","draft_version") WHERE "core"."assessments"."subject_kind" = 'draft';--> statement-breakpoint
CREATE UNIQUE INDEX "assessments_call_turn_key" ON "core"."assessments" USING btree ("organization_id","call_id","turn_index") WHERE "core"."assessments"."subject_kind" = 'call_turn';--> statement-breakpoint
CREATE INDEX "assessments_list_idx" ON "core"."assessments" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "assessments_verdict_idx" ON "core"."assessments" USING btree ("organization_id","verdict","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "assessments_review_idx" ON "core"."assessments" USING btree ("organization_id","worst_severity_rank" DESC NULLS LAST,"created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "core"."assessments"."verdict" <> 'pass';--> statement-breakpoint
CREATE INDEX "assessments_rate_idx" ON "core"."assessments" USING btree ("organization_id","agent_kind","instruction_version","created_at");--> statement-breakpoint
CREATE INDEX "source_performance_list_idx" ON "core"."source_performance" USING btree ("organization_id","deals_touched" DESC NULLS LAST,"source_kind" DESC NULLS LAST,"source_key" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "source_performance_flag_idx" ON "core"."source_performance" USING btree ("organization_id","source_kind","source_key") WHERE "core"."source_performance"."flag" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "touches_ref_key" ON "core"."touches" USING btree ("organization_id","kind","ref_id");--> statement-breakpoint
CREATE INDEX "touches_prospect_idx" ON "core"."touches" USING btree ("organization_id","prospect_id","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "touches_deal_idx" ON "core"."touches" USING btree ("organization_id","deal_record_id","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "core"."touches"."deal_record_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "suggestions_fingerprint_key" ON "playbook"."suggestions" USING btree ("organization_id","fingerprint");--> statement-breakpoint
CREATE INDEX "suggestions_list_idx" ON "playbook"."suggestions" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "suggestions_status_list_idx" ON "playbook"."suggestions" USING btree ("organization_id","status","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "playbook"."calls" ADD CONSTRAINT "calls_origin_known" CHECK ("playbook"."calls"."origin" in ('imported', 'rep', 'agent'));
--> statement-breakpoint
-- Every table is a tenant table: forced row-level security and the one canonical policy.
ALTER TABLE "core"."assessment_findings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."assessment_findings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "assessment_findings_tenant_isolation" ON "core"."assessment_findings" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."assessments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."assessments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "assessments_tenant_isolation" ON "core"."assessments" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."conversation_summaries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."conversation_summaries" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "conversation_summaries_tenant_isolation" ON "core"."conversation_summaries" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."rollup_daily" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."rollup_daily" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "rollup_daily_tenant_isolation" ON "core"."rollup_daily" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."source_performance" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."source_performance" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "source_performance_tenant_isolation" ON "core"."source_performance" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."touches" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."touches" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "touches_tenant_isolation" ON "core"."touches" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "playbook"."suggestions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."suggestions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "suggestions_tenant_isolation" ON "playbook"."suggestions" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
