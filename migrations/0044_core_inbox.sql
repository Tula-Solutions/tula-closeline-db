-- The labels array of an `except` approval rule: one to ten distinct known reply labels (a
-- function because a CHECK cannot hold a subquery).
CREATE FUNCTION "core"."reply_labels_valid"(labels text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT labels IS NOT NULL
    AND cardinality(labels) BETWEEN 1 AND 10
    AND NOT EXISTS (
      SELECT 1 FROM unnest(labels) AS label
      WHERE label IS NULL OR label NOT IN ('positive', 'question', 'objection', 'not_now', 'wrong_person', 'unsubscribe', 'out_of_office', 'bounce', 'negative', 'other')
    )
    AND (SELECT count(DISTINCT label) FROM unnest(labels) AS label) = cardinality(labels)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "core"."reply_labels_valid"(text[]) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."reply_labels_valid"(text[]) TO closeline_core;
--> statement-breakpoint
CREATE TABLE "core"."approval_decisions" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"draft_id" text,
	"kind" text NOT NULL,
	"decided_by_membership_id" text,
	"note" text,
	"acknowledged_ungrounded" boolean DEFAULT false NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_decisions_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "approval_decisions_id_shape" CHECK ("id" ~ '^dcs_[0-9a-f]{32}$'),
	CONSTRAINT "approval_decisions_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "approval_decisions_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "approval_decisions_conversation_id_shape" CHECK ("conversation_id" ~ '^cnv_[0-9a-f]{32}$'),
	CONSTRAINT "approval_decisions_draft_id_shape" CHECK ("draft_id" ~ '^drf_[0-9a-f]{32}$'),
	CONSTRAINT "approval_decisions_decided_by_membership_id_shape" CHECK ("decided_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "approval_decisions_kind_known" CHECK ("core"."approval_decisions"."kind" in ('approve', 'edit_approve', 'reject', 'auto_release', 'takeover', 'hand_back')),
	CONSTRAINT "approval_decisions_note_shape" CHECK ("core"."approval_decisions"."note" is null or (char_length("core"."approval_decisions"."note") between 1 and 500 and btrim("core"."approval_decisions"."note") <> '')),
	CONSTRAINT "approval_decisions_draft_matches_kind" CHECK (("core"."approval_decisions"."kind" in ('takeover', 'hand_back')) = ("core"."approval_decisions"."draft_id" is null)),
	CONSTRAINT "approval_decisions_member_matches_kind" CHECK (("core"."approval_decisions"."kind" = 'auto_release') = ("core"."approval_decisions"."decided_by_membership_id" is null)),
	CONSTRAINT "approval_decisions_acknowledgement_is_approval" CHECK (not "core"."approval_decisions"."acknowledged_ungrounded" or "core"."approval_decisions"."kind" in ('approve', 'edit_approve')),
	CONSTRAINT "approval_decisions_note_is_rejection" CHECK ("core"."approval_decisions"."note" is null or "core"."approval_decisions"."kind" = 'reject')
);
--> statement-breakpoint
CREATE TABLE "core"."approval_policies" (
	"organization_id" text NOT NULL,
	"channel" text NOT NULL,
	"mode" text NOT NULL,
	"threshold" double precision,
	"labels" text[],
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_membership_id" text,
	CONSTRAINT "approval_policies_pkey" PRIMARY KEY("organization_id","channel"),
	CONSTRAINT "approval_policies_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "approval_policies_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "approval_policies_updated_by_membership_id_shape" CHECK ("updated_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "approval_policies_channel_known" CHECK ("core"."approval_policies"."channel" in ('email', 'linkedin', 'chat')),
	CONSTRAINT "approval_policies_mode_known" CHECK ("core"."approval_policies"."mode" in ('always', 'below_confidence', 'except')),
	CONSTRAINT "approval_policies_mode_matches_fields" CHECK (("core"."approval_policies"."mode" = 'always' and "core"."approval_policies"."threshold" is null and "core"."approval_policies"."labels" is null)
        or ("core"."approval_policies"."mode" = 'below_confidence' and "core"."approval_policies"."threshold" is not null and "core"."approval_policies"."threshold" > 0 and "core"."approval_policies"."threshold" <= 1 and "core"."approval_policies"."labels" is null)
        or ("core"."approval_policies"."mode" = 'except' and "core"."approval_policies"."threshold" is null and core.reply_labels_valid("labels")))
);
--> statement-breakpoint
CREATE TABLE "core"."conversations" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"prospect_id" text NOT NULL,
	"channel" text NOT NULL,
	"controller" text DEFAULT 'agent' NOT NULL,
	"controller_membership_id" text,
	"state" text DEFAULT 'agent' NOT NULL,
	"owner_membership_id" text,
	"latest_label" text,
	"pending_draft_count" integer DEFAULT 0 NOT NULL,
	"last_message_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "conversations_organization_id_channel_key" UNIQUE("organization_id","id","channel"),
	CONSTRAINT "conversations_id_shape" CHECK ("id" ~ '^cnv_[0-9a-f]{32}$'),
	CONSTRAINT "conversations_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "conversations_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "conversations_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "conversations_controller_membership_id_shape" CHECK ("controller_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "conversations_owner_membership_id_shape" CHECK ("owner_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "conversations_channel_known" CHECK ("core"."conversations"."channel" in ('email', 'linkedin', 'chat')),
	CONSTRAINT "conversations_controller_known" CHECK ("core"."conversations"."controller" in ('agent', 'rep')),
	CONSTRAINT "conversations_state_known" CHECK ("core"."conversations"."state" in ('agent', 'awaiting_approval', 'rep', 'escalated', 'closed')),
	CONSTRAINT "conversations_latest_label_known" CHECK ("core"."conversations"."latest_label" is null or "core"."conversations"."latest_label" in ('positive', 'question', 'objection', 'not_now', 'wrong_person', 'unsubscribe', 'out_of_office', 'bounce', 'negative', 'other')),
	CONSTRAINT "conversations_pending_draft_count_bounds" CHECK ("core"."conversations"."pending_draft_count" between 0 and 1000),
	CONSTRAINT "conversations_controller_names_rep" CHECK (("core"."conversations"."controller" = 'rep') = ("core"."conversations"."controller_membership_id" is not null)),
	CONSTRAINT "conversations_rep_state_has_rep" CHECK ("core"."conversations"."state" <> 'rep' or "core"."conversations"."controller" = 'rep'),
	CONSTRAINT "conversations_rep_controls_rep_or_closed" CHECK ("core"."conversations"."controller" <> 'rep' or "core"."conversations"."state" in ('rep', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "core"."draft_sources" (
	"organization_id" text NOT NULL,
	"draft_id" text NOT NULL,
	"kind" text NOT NULL,
	"source_ref" text NOT NULL,
	"position" integer NOT NULL,
	"deal_record_id" text,
	"document_id" text,
	"outcome" text,
	"evidence_count" integer NOT NULL,
	CONSTRAINT "draft_sources_pkey" PRIMARY KEY("organization_id","draft_id","kind","source_ref"),
	CONSTRAINT "draft_sources_position_key" UNIQUE("organization_id","draft_id","position"),
	CONSTRAINT "draft_sources_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "draft_sources_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "draft_sources_draft_id_shape" CHECK ("draft_id" ~ '^drf_[0-9a-f]{32}$'),
	CONSTRAINT "draft_sources_deal_record_id_shape" CHECK ("deal_record_id" ~ '^deal_[0-9a-f]{32}$'),
	CONSTRAINT "draft_sources_document_id_shape" CHECK ("document_id" ~ '^doc_[0-9a-f]{32}$'),
	CONSTRAINT "draft_sources_kind_known" CHECK ("core"."draft_sources"."kind" in ('moment', 'document_chunk')),
	CONSTRAINT "draft_sources_source_ref_shape" CHECK ("core"."draft_sources"."source_ref" collate "C" ~ '^[A-Za-z0-9_.:-]{1,128}$'),
	CONSTRAINT "draft_sources_position_bounds" CHECK ("core"."draft_sources"."position" between 0 and 9),
	CONSTRAINT "draft_sources_outcome_known" CHECK ("core"."draft_sources"."outcome" is null or "core"."draft_sources"."outcome" in ('won', 'lost', 'open')),
	CONSTRAINT "draft_sources_evidence_count_bounds" CHECK ("core"."draft_sources"."evidence_count" between 1 and 100000),
	CONSTRAINT "draft_sources_kind_matches_ids" CHECK (("core"."draft_sources"."kind" = 'moment' and "core"."draft_sources"."deal_record_id" is not null and "core"."draft_sources"."document_id" is null and "core"."draft_sources"."outcome" is not null)
        or ("core"."draft_sources"."kind" = 'document_chunk' and "core"."draft_sources"."document_id" is not null and "core"."draft_sources"."deal_record_id" is null and "core"."draft_sources"."outcome" is null))
);
--> statement-breakpoint
CREATE TABLE "core"."drafts" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"author" text NOT NULL,
	"author_membership_id" text,
	"body" text NOT NULL,
	"reason_trigger_message_id" text,
	"reason_label" text,
	"reason_strategy" text,
	"confidence" double precision,
	"ungrounded" boolean DEFAULT false NOT NULL,
	"checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hold" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "drafts_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "drafts_id_shape" CHECK ("id" ~ '^drf_[0-9a-f]{32}$'),
	CONSTRAINT "drafts_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "drafts_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "drafts_conversation_id_shape" CHECK ("conversation_id" ~ '^cnv_[0-9a-f]{32}$'),
	CONSTRAINT "drafts_author_membership_id_shape" CHECK ("author_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "drafts_reason_trigger_message_id_shape" CHECK ("reason_trigger_message_id" ~ '^msg_[0-9a-f]{32}$'),
	CONSTRAINT "drafts_author_known" CHECK ("core"."drafts"."author" in ('agent', 'rep')),
	CONSTRAINT "drafts_status_known" CHECK ("core"."drafts"."status" in ('pending', 'approved', 'rejected', 'sent', 'superseded', 'void')),
	CONSTRAINT "drafts_hold_known" CHECK ("core"."drafts"."hold" is null or "core"."drafts"."hold" in ('policy', 'ungrounded', 'check_failed', 'escalated', 'first_message')),
	CONSTRAINT "drafts_reason_label_known" CHECK ("core"."drafts"."reason_label" is null or "core"."drafts"."reason_label" in ('positive', 'question', 'objection', 'not_now', 'wrong_person', 'unsubscribe', 'out_of_office', 'bounce', 'negative', 'other')),
	CONSTRAINT "drafts_body_shape" CHECK (char_length("body") between 1 and 20000 and btrim("body") <> ''),
	CONSTRAINT "drafts_reason_strategy_shape" CHECK ("core"."drafts"."reason_strategy" is null or char_length("core"."drafts"."reason_strategy") between 1 and 300),
	CONSTRAINT "drafts_confidence_bounds" CHECK ("core"."drafts"."confidence" is null or "core"."drafts"."confidence" between 0 and 1),
	CONSTRAINT "drafts_checks_shape" CHECK (jsonb_typeof("core"."drafts"."checks") = 'array' and jsonb_array_length("core"."drafts"."checks") <= 20),
	CONSTRAINT "drafts_agent_has_reason" CHECK (("core"."drafts"."author" = 'agent') = ("core"."drafts"."reason_trigger_message_id" is not null)
        and ("core"."drafts"."author" = 'agent') = ("core"."drafts"."reason_label" is not null)
        and ("core"."drafts"."author" = 'agent') = ("core"."drafts"."reason_strategy" is not null)),
	CONSTRAINT "drafts_agent_has_confidence" CHECK (("core"."drafts"."author" = 'agent') = ("core"."drafts"."confidence" is not null)),
	CONSTRAINT "drafts_rep_names_member" CHECK (("core"."drafts"."author" = 'rep') = ("core"."drafts"."author_membership_id" is not null)),
	CONSTRAINT "drafts_rep_is_plain" CHECK ("core"."drafts"."author" = 'agent' or (not "core"."drafts"."ungrounded" and "core"."drafts"."hold" is null)),
	CONSTRAINT "drafts_ungrounded_is_held" CHECK (not "core"."drafts"."ungrounded" or "core"."drafts"."hold" = 'ungrounded'),
	CONSTRAINT "drafts_ungrounded_hold_matches" CHECK ("core"."drafts"."hold" is distinct from 'ungrounded' or "core"."drafts"."ungrounded"),
	CONSTRAINT "drafts_pending_is_held" CHECK ("core"."drafts"."status" <> 'pending' or "core"."drafts"."author" = 'rep' or "core"."drafts"."hold" is not null),
	CONSTRAINT "drafts_pending_is_undecided" CHECK ("core"."drafts"."status" <> 'pending' or "core"."drafts"."decided_at" is null)
);
--> statement-breakpoint
CREATE TABLE "core"."escalation_rules" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"trigger" text NOT NULL,
	"target" text NOT NULL,
	"team_id" text,
	"threshold" double precision,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_membership_id" text,
	CONSTRAINT "escalation_rules_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "escalation_rules_id_shape" CHECK ("id" ~ '^esr_[0-9a-f]{32}$'),
	CONSTRAINT "escalation_rules_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "escalation_rules_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "escalation_rules_team_id_shape" CHECK ("team_id" ~ '^team_[0-9a-f]{32}$'),
	CONSTRAINT "escalation_rules_updated_by_membership_id_shape" CHECK ("updated_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "escalation_rules_trigger_known" CHECK ("core"."escalation_rules"."trigger" in ('asks_for_person', 'pricing_or_legal', 'negative_tone', 'low_confidence', 'writer_failure')),
	CONSTRAINT "escalation_rules_target_known" CHECK ("core"."escalation_rules"."target" in ('prospect_owner', 'team_round_robin', 'admin_queue')),
	CONSTRAINT "escalation_rules_team_matches_target" CHECK (("core"."escalation_rules"."target" = 'team_round_robin') = ("core"."escalation_rules"."team_id" is not null)),
	CONSTRAINT "escalation_rules_threshold_matches_trigger" CHECK (("core"."escalation_rules"."trigger" = 'low_confidence') = ("core"."escalation_rules"."threshold" is not null)
        and ("core"."escalation_rules"."threshold" is null or ("core"."escalation_rules"."threshold" > 0 and "core"."escalation_rules"."threshold" <= 1)))
);
--> statement-breakpoint
CREATE TABLE "core"."messages" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"channel" text NOT NULL,
	"direction" text NOT NULL,
	"author_kind" text NOT NULL,
	"author_membership_id" text,
	"provider_message_id" text NOT NULL,
	"draft_id" text,
	"body" text NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"classification_label" text,
	"classification_confidence" double precision,
	"classification_decided_by" text,
	"classification_corrected_by_membership_id" text,
	"classified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "messages_id_shape" CHECK ("id" ~ '^msg_[0-9a-f]{32}$'),
	CONSTRAINT "messages_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "messages_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "messages_conversation_id_shape" CHECK ("conversation_id" ~ '^cnv_[0-9a-f]{32}$'),
	CONSTRAINT "messages_author_membership_id_shape" CHECK ("author_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "messages_draft_id_shape" CHECK ("draft_id" ~ '^drf_[0-9a-f]{32}$'),
	CONSTRAINT "messages_classification_corrected_by_shape" CHECK ("classification_corrected_by_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "messages_channel_known" CHECK ("core"."messages"."channel" in ('email', 'linkedin', 'chat')),
	CONSTRAINT "messages_direction_known" CHECK ("core"."messages"."direction" in ('inbound', 'outbound')),
	CONSTRAINT "messages_author_kind_known" CHECK ("core"."messages"."author_kind" in ('prospect', 'agent', 'rep')),
	CONSTRAINT "messages_provider_message_id_shape" CHECK ("core"."messages"."provider_message_id" collate "C" ~ '^[\x21-\x7e]{1,255}$'),
	CONSTRAINT "messages_body_shape" CHECK (char_length("body") between 1 and 20000 and btrim("body") <> ''),
	CONSTRAINT "messages_inbound_is_prospect" CHECK (("core"."messages"."direction" = 'inbound') = ("core"."messages"."author_kind" = 'prospect')),
	CONSTRAINT "messages_rep_names_member" CHECK (("core"."messages"."author_kind" = 'rep') = ("core"."messages"."author_membership_id" is not null)),
	CONSTRAINT "messages_inbound_has_no_draft" CHECK ("core"."messages"."direction" <> 'inbound' or "core"."messages"."draft_id" is null),
	CONSTRAINT "messages_rep_has_draft" CHECK ("core"."messages"."author_kind" <> 'rep' or "core"."messages"."draft_id" is not null),
	CONSTRAINT "messages_classification_inbound_only" CHECK ("core"."messages"."direction" = 'inbound' or "core"."messages"."classification_label" is null),
	CONSTRAINT "messages_classification_complete" CHECK (("core"."messages"."classification_label" is null) = ("core"."messages"."classification_confidence" is null)
        and ("core"."messages"."classification_label" is null) = ("core"."messages"."classification_decided_by" is null)
        and ("core"."messages"."classification_label" is null) = ("core"."messages"."classified_at" is null)),
	CONSTRAINT "messages_classification_confidence_bounds" CHECK ("core"."messages"."classification_confidence" is null or "core"."messages"."classification_confidence" between 0 and 1),
	CONSTRAINT "messages_classification_decider_known" CHECK ("core"."messages"."classification_decided_by" is null or "core"."messages"."classification_decided_by" in ('model', 'rep')),
	CONSTRAINT "messages_classification_correction_names_rep" CHECK ("core"."messages"."classification_label" is null
        or ("core"."messages"."classification_decided_by" = 'rep') = ("core"."messages"."classification_corrected_by_membership_id" is not null)),
	CONSTRAINT "messages_correction_needs_label" CHECK ("core"."messages"."classification_corrected_by_membership_id" is null or "core"."messages"."classification_label" is not null),
	CONSTRAINT "messages_classification_label_known" CHECK ("core"."messages"."classification_label" is null or "core"."messages"."classification_label" in ('positive', 'question', 'objection', 'not_now', 'wrong_person', 'unsubscribe', 'out_of_office', 'bounce', 'negative', 'other'))
);
--> statement-breakpoint
ALTER TABLE "core"."approval_decisions" ADD CONSTRAINT "approval_decisions_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."approval_decisions" ADD CONSTRAINT "approval_decisions_conversation_fk" FOREIGN KEY ("organization_id","conversation_id") REFERENCES "core"."conversations"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."approval_decisions" ADD CONSTRAINT "approval_decisions_draft_fk" FOREIGN KEY ("organization_id","draft_id") REFERENCES "core"."drafts"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."approval_policies" ADD CONSTRAINT "approval_policies_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."conversations" ADD CONSTRAINT "conversations_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."conversations" ADD CONSTRAINT "conversations_prospect_fk" FOREIGN KEY ("organization_id","prospect_id") REFERENCES "core"."prospects"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."draft_sources" ADD CONSTRAINT "draft_sources_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."draft_sources" ADD CONSTRAINT "draft_sources_draft_fk" FOREIGN KEY ("organization_id","draft_id") REFERENCES "core"."drafts"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."drafts" ADD CONSTRAINT "drafts_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."drafts" ADD CONSTRAINT "drafts_conversation_fk" FOREIGN KEY ("organization_id","conversation_id") REFERENCES "core"."conversations"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."drafts" ADD CONSTRAINT "drafts_trigger_message_fk" FOREIGN KEY ("organization_id","reason_trigger_message_id") REFERENCES "core"."messages"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."escalation_rules" ADD CONSTRAINT "escalation_rules_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."escalation_rules" ADD CONSTRAINT "escalation_rules_team_fk" FOREIGN KEY ("organization_id","team_id") REFERENCES "core"."teams"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."messages" ADD CONSTRAINT "messages_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."messages" ADD CONSTRAINT "messages_conversation_fk" FOREIGN KEY ("organization_id","conversation_id","channel") REFERENCES "core"."conversations"("organization_id","id","channel") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approval_decisions_conversation_idx" ON "core"."approval_decisions" USING btree ("organization_id","conversation_id","decided_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "approval_decisions_draft_idx" ON "core"."approval_decisions" USING btree ("organization_id","draft_id") WHERE "core"."approval_decisions"."draft_id" is not null;--> statement-breakpoint
CREATE INDEX "conversations_list_idx" ON "core"."conversations" USING btree ("organization_id","last_message_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "conversations_owner_list_idx" ON "core"."conversations" USING btree ("organization_id","owner_membership_id","last_message_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "core"."conversations"."owner_membership_id" is not null;--> statement-breakpoint
CREATE INDEX "conversations_state_list_idx" ON "core"."conversations" USING btree ("organization_id","state","last_message_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "conversations_owner_state_list_idx" ON "core"."conversations" USING btree ("organization_id","owner_membership_id","state","last_message_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "core"."conversations"."owner_membership_id" is not null;--> statement-breakpoint
CREATE INDEX "conversations_prospect_idx" ON "core"."conversations" USING btree ("organization_id","prospect_id","channel");--> statement-breakpoint
CREATE INDEX "drafts_conversation_idx" ON "core"."drafts" USING btree ("organization_id","conversation_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "drafts_trigger_message_idx" ON "core"."drafts" USING btree ("organization_id","reason_trigger_message_id") WHERE "core"."drafts"."reason_trigger_message_id" is not null;--> statement-breakpoint
CREATE INDEX "drafts_pending_queue_idx" ON "core"."drafts" USING btree ("organization_id","created_at","id") WHERE "core"."drafts"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "escalation_rules_trigger_key" ON "core"."escalation_rules" USING btree ("organization_id","trigger");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_provider_message_key" ON "core"."messages" USING btree ("organization_id","channel","provider_message_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "core"."messages" USING btree ("organization_id","conversation_id","sent_at","id");--> statement-breakpoint
CREATE INDEX "messages_draft_idx" ON "core"."messages" USING btree ("organization_id","draft_id") WHERE "core"."messages"."draft_id" is not null;
--> statement-breakpoint
ALTER TABLE "core"."conversations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."conversations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "conversations_tenant_isolation" ON "core"."conversations" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."messages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."messages" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "messages_tenant_isolation" ON "core"."messages" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."drafts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."drafts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "drafts_tenant_isolation" ON "core"."drafts" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."draft_sources" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."draft_sources" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "draft_sources_tenant_isolation" ON "core"."draft_sources" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."approval_decisions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."approval_decisions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "approval_decisions_tenant_isolation" ON "core"."approval_decisions" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."approval_policies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."approval_policies" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "approval_policies_tenant_isolation" ON "core"."approval_policies" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."escalation_rules" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."escalation_rules" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "escalation_rules_tenant_isolation" ON "core"."escalation_rules" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
-- The default privileges of migration 0000 give the service role every statement on a new core
-- table. A Message is a record of what was said: the service role may insert and read it, and
-- may update only the five classification columns (a classifier writes its label after the Message
-- is stored, and a Rep may correct it); the body, the author and the ids are never rewritten and
-- no Message is deleted, and so neither a Conversation nor a Draft (a cascade would remove Messages), which
-- is why DELETE is revoked on them too. An Organization's or a Prospect's removal still cascades, because the
-- foreign key action runs as the table owner. Decisions are append-only; a Source is written once.
REVOKE UPDATE, DELETE, TRUNCATE ON "core"."messages" FROM closeline_core;
--> statement-breakpoint
GRANT UPDATE ("classification_label", "classification_confidence", "classification_decided_by", "classification_corrected_by_membership_id", "classified_at") ON "core"."messages" TO closeline_core;
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON "core"."approval_decisions" FROM closeline_core;
--> statement-breakpoint
REVOKE UPDATE, TRUNCATE ON "core"."draft_sources" FROM closeline_core;
--> statement-breakpoint
REVOKE DELETE ON "core"."conversations", "core"."drafts" FROM closeline_core;
