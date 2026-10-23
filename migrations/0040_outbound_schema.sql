CREATE SCHEMA "outbound";
--> statement-breakpoint
-- The outbound service's login role (closeline_outbound, created by docker/postgres/init.sql
-- locally and by infra elsewhere, before this migration runs) reaches its own schema only, like the
-- other services in migration 0000. The migration runs as the owner, so the default privileges
-- below apply to every table and sequence created here.
REVOKE ALL ON SCHEMA public FROM closeline_outbound;
--> statement-breakpoint
REVOKE ALL ON SCHEMA "outbound" FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "outbound" TO closeline_outbound;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "outbound" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO closeline_outbound;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "outbound" GRANT USAGE, SELECT ON SEQUENCES TO closeline_outbound;
--> statement-breakpoint
CREATE TABLE "outbound"."brand_voices" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"version" integer NOT NULL,
	"tone" text NOT NULL,
	"preferred_words" text[] DEFAULT '{}'::text[] NOT NULL,
	"banned_phrases" text[] DEFAULT '{}'::text[] NOT NULL,
	"sign_off" text,
	"max_length_characters" integer DEFAULT 1500 NOT NULL,
	"created_by_membership_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_voices_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "brand_voices_id_version_key" UNIQUE("organization_id","id","version"),
	CONSTRAINT "brand_voices_id_shape" CHECK ("id" ~ '^bvo_[0-9a-f]{32}$'),
	CONSTRAINT "brand_voices_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "brand_voices_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "brand_voices_version_range" CHECK ("outbound"."brand_voices"."version" between 1 and 1000000),
	CONSTRAINT "brand_voices_tone_shape" CHECK (char_length("outbound"."brand_voices"."tone") between 1 and 500),
	CONSTRAINT "brand_voices_preferred_words_shape" CHECK (cardinality("outbound"."brand_voices"."preferred_words") <= 50
        and array_position("outbound"."brand_voices"."preferred_words", '') is null
        and array_position("outbound"."brand_voices"."preferred_words", null) is null
        and char_length(array_to_string("outbound"."brand_voices"."preferred_words", '')) <= 5000),
	CONSTRAINT "brand_voices_banned_phrases_shape" CHECK (cardinality("outbound"."brand_voices"."banned_phrases") <= 100
        and array_position("outbound"."brand_voices"."banned_phrases", '') is null
        and array_position("outbound"."brand_voices"."banned_phrases", null) is null
        and char_length(array_to_string("outbound"."brand_voices"."banned_phrases", '')) <= 10000),
	CONSTRAINT "brand_voices_sign_off_shape" CHECK ("outbound"."brand_voices"."sign_off" is null or char_length("outbound"."brand_voices"."sign_off") between 1 and 200),
	CONSTRAINT "brand_voices_max_length_range" CHECK ("outbound"."brand_voices"."max_length_characters" between 100 and 5000),
	CONSTRAINT "brand_voices_created_by_membership_id_shape" CHECK ("created_by_membership_id" ~ '^mem_[0-9a-f]{32}$')
);
--> statement-breakpoint
CREATE TABLE "outbound"."brief_statements" (
	"organization_id" text NOT NULL,
	"brief_id" text NOT NULL,
	"position" smallint NOT NULL,
	"role" text NOT NULL,
	"text" text,
	"source_kind" text NOT NULL,
	"source_prospect_id" text,
	"source_field" text,
	"source_signal_id" text,
	"source_observed_at" timestamp with time zone,
	"source_url" text,
	"source_retrieved_at" timestamp with time zone,
	"source_call_id" text,
	"source_deal_record_id" text,
	"source_document_id" text,
	"source_page" smallint,
	CONSTRAINT "brief_statements_pkey" PRIMARY KEY("organization_id","brief_id","position"),
	CONSTRAINT "brief_statements_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "brief_statements_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "brief_statements_brief_id_shape" CHECK ("brief_id" ~ '^brf_[0-9a-f]{32}$'),
	CONSTRAINT "brief_statements_position_range" CHECK ("outbound"."brief_statements"."position" between 0 and 39),
	CONSTRAINT "brief_statements_role_known" CHECK ("outbound"."brief_statements"."role" in ('statement', 'angle_source')),
	CONSTRAINT "brief_statements_text_matches_role" CHECK (("outbound"."brief_statements"."role" = 'statement') = ("outbound"."brief_statements"."text" is not null)
        and ("outbound"."brief_statements"."text" is null or char_length("outbound"."brief_statements"."text") between 1 and 500)),
	CONSTRAINT "brief_statements_source_kind_known" CHECK ("outbound"."brief_statements"."source_kind" in ('prospect_field', 'signal', 'web_page', 'moment', 'document')),
	CONSTRAINT "brief_statements_source_matches_kind" CHECK (("brief_statements"."source_kind" = 'prospect_field' and "brief_statements"."source_prospect_id" is not null and "brief_statements"."source_field" is not null and "brief_statements"."source_signal_id" is null and "brief_statements"."source_observed_at" is null and "brief_statements"."source_url" is null and "brief_statements"."source_retrieved_at" is null and "brief_statements"."source_call_id" is null and "brief_statements"."source_deal_record_id" is null and "brief_statements"."source_document_id" is null and "brief_statements"."source_page" is null) or ("brief_statements"."source_kind" = 'signal' and "brief_statements"."source_prospect_id" is null and "brief_statements"."source_field" is null and "brief_statements"."source_signal_id" is not null and "brief_statements"."source_observed_at" is not null and "brief_statements"."source_url" is null and "brief_statements"."source_retrieved_at" is null and "brief_statements"."source_call_id" is null and "brief_statements"."source_deal_record_id" is null and "brief_statements"."source_document_id" is null and "brief_statements"."source_page" is null) or ("brief_statements"."source_kind" = 'web_page' and "brief_statements"."source_prospect_id" is null and "brief_statements"."source_field" is null and "brief_statements"."source_signal_id" is null and "brief_statements"."source_observed_at" is null and "brief_statements"."source_url" is not null and "brief_statements"."source_retrieved_at" is not null and "brief_statements"."source_call_id" is null and "brief_statements"."source_deal_record_id" is null and "brief_statements"."source_document_id" is null and "brief_statements"."source_page" is null) or ("brief_statements"."source_kind" = 'moment' and "brief_statements"."source_prospect_id" is null and "brief_statements"."source_field" is null and "brief_statements"."source_signal_id" is null and "brief_statements"."source_observed_at" is null and "brief_statements"."source_url" is null and "brief_statements"."source_retrieved_at" is null and "brief_statements"."source_call_id" is not null and "brief_statements"."source_deal_record_id" is not null and "brief_statements"."source_document_id" is null and "brief_statements"."source_page" is null) or ("brief_statements"."source_kind" = 'document' and "brief_statements"."source_prospect_id" is null and "brief_statements"."source_field" is null and "brief_statements"."source_signal_id" is null and "brief_statements"."source_observed_at" is null and "brief_statements"."source_url" is null and "brief_statements"."source_retrieved_at" is null and "brief_statements"."source_call_id" is null and "brief_statements"."source_deal_record_id" is null and "brief_statements"."source_document_id" is not null)),
	CONSTRAINT "brief_statements_source_prospect_id_shape" CHECK ("source_prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "brief_statements_source_signal_id_shape" CHECK ("source_signal_id" ~ '^sig_[0-9a-f]{32}$'),
	CONSTRAINT "brief_statements_source_call_id_shape" CHECK ("source_call_id" ~ '^call_[0-9a-f]{32}$'),
	CONSTRAINT "brief_statements_source_deal_record_id_shape" CHECK ("source_deal_record_id" ~ '^deal_[0-9a-f]{32}$'),
	CONSTRAINT "brief_statements_source_document_id_shape" CHECK ("source_document_id" ~ '^doc_[0-9a-f]{32}$'),
	CONSTRAINT "brief_statements_source_field_known" CHECK ("outbound"."brief_statements"."source_field" is null or "outbound"."brief_statements"."source_field" in ('firstName', 'lastName', 'jobTitle', 'email', 'phone', 'linkedinUrl')),
	CONSTRAINT "brief_statements_source_url_shape" CHECK ("outbound"."brief_statements"."source_url" is null or (char_length("outbound"."brief_statements"."source_url") between 1 and 2048
      and "outbound"."brief_statements"."source_url" ~ '^https?://[^@/?#[:space:]]+([/?#][^[:space:]]*)?$')),
	CONSTRAINT "brief_statements_source_page_shape" CHECK ("outbound"."brief_statements"."source_page" is null or "outbound"."brief_statements"."source_page" between 1 and 300)
);
--> statement-breakpoint
CREATE TABLE "outbound"."briefs" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"prospect_id" text NOT NULL,
	"angle_text" text NOT NULL,
	"angle_origin" text NOT NULL,
	"dropped_count" integer DEFAULT 0 NOT NULL,
	"prospect_updated_at" timestamp with time zone NOT NULL,
	"language" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "briefs_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "briefs_id_prospect_key" UNIQUE("organization_id","id","prospect_id"),
	CONSTRAINT "briefs_id_shape" CHECK ("id" ~ '^brf_[0-9a-f]{32}$'),
	CONSTRAINT "briefs_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "briefs_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "briefs_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "briefs_angle_text_shape" CHECK (char_length("outbound"."briefs"."angle_text") between 1 and 500),
	CONSTRAINT "briefs_angle_origin_known" CHECK ("outbound"."briefs"."angle_origin" in ('won_deals', 'model_default')),
	CONSTRAINT "briefs_dropped_count_range" CHECK ("outbound"."briefs"."dropped_count" between 0 and 1000),
	CONSTRAINT "briefs_language_known" CHECK ("outbound"."briefs"."language" in ('en')),
	CONSTRAINT "briefs_model_shape" CHECK (char_length("outbound"."briefs"."model") between 1 and 100),
	CONSTRAINT "briefs_expires_after_created" CHECK ("outbound"."briefs"."expires_at" > "outbound"."briefs"."created_at")
);
--> statement-breakpoint
CREATE TABLE "outbound"."draft_checks" (
	"organization_id" text NOT NULL,
	"draft_id" text NOT NULL,
	"check_name" text NOT NULL,
	"result" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "draft_checks_pkey" PRIMARY KEY("organization_id","draft_id","check_name"),
	CONSTRAINT "draft_checks_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "draft_checks_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "draft_checks_draft_id_shape" CHECK ("draft_id" ~ '^drf_[0-9a-f]{32}$'),
	CONSTRAINT "draft_checks_name_known" CHECK ("outbound"."draft_checks"."check_name" in ('citations_resolve', 'claims_supported', 'banned_phrase', 'length', 'name_match')),
	CONSTRAINT "draft_checks_result_known" CHECK ("outbound"."draft_checks"."result" in ('pass', 'fail')),
	CONSTRAINT "draft_checks_count_range" CHECK ("outbound"."draft_checks"."count" between 0 and 1000),
	CONSTRAINT "draft_checks_pass_means_none" CHECK (("outbound"."draft_checks"."result" = 'pass') = ("outbound"."draft_checks"."count" = 0))
);
--> statement-breakpoint
CREATE TABLE "outbound"."draft_citations" (
	"organization_id" text NOT NULL,
	"draft_id" text NOT NULL,
	"position" smallint NOT NULL,
	"source_kind" text NOT NULL,
	"source_prospect_id" text,
	"source_field" text,
	"source_signal_id" text,
	"source_observed_at" timestamp with time zone,
	"source_url" text,
	"source_retrieved_at" timestamp with time zone,
	"source_call_id" text,
	"source_deal_record_id" text,
	"source_document_id" text,
	"source_page" smallint,
	"applies" boolean DEFAULT true NOT NULL,
	"score" double precision,
	CONSTRAINT "draft_citations_pkey" PRIMARY KEY("organization_id","draft_id","position"),
	CONSTRAINT "draft_citations_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "draft_citations_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "draft_citations_draft_id_shape" CHECK ("draft_id" ~ '^drf_[0-9a-f]{32}$'),
	CONSTRAINT "draft_citations_position_range" CHECK ("outbound"."draft_citations"."position" between 0 and 19),
	CONSTRAINT "draft_citations_score_shape" CHECK ("outbound"."draft_citations"."score" is null or ("outbound"."draft_citations"."source_kind" in ('moment', 'document') and "outbound"."draft_citations"."score" > -1000000 and "outbound"."draft_citations"."score" < 1000000)),
	CONSTRAINT "draft_citations_source_kind_known" CHECK ("outbound"."draft_citations"."source_kind" in ('prospect_field', 'signal', 'web_page', 'moment', 'document')),
	CONSTRAINT "draft_citations_source_matches_kind" CHECK (("draft_citations"."source_kind" = 'prospect_field' and "draft_citations"."source_prospect_id" is not null and "draft_citations"."source_field" is not null and "draft_citations"."source_signal_id" is null and "draft_citations"."source_observed_at" is null and "draft_citations"."source_url" is null and "draft_citations"."source_retrieved_at" is null and "draft_citations"."source_call_id" is null and "draft_citations"."source_deal_record_id" is null and "draft_citations"."source_document_id" is null and "draft_citations"."source_page" is null) or ("draft_citations"."source_kind" = 'signal' and "draft_citations"."source_prospect_id" is null and "draft_citations"."source_field" is null and "draft_citations"."source_signal_id" is not null and "draft_citations"."source_observed_at" is not null and "draft_citations"."source_url" is null and "draft_citations"."source_retrieved_at" is null and "draft_citations"."source_call_id" is null and "draft_citations"."source_deal_record_id" is null and "draft_citations"."source_document_id" is null and "draft_citations"."source_page" is null) or ("draft_citations"."source_kind" = 'web_page' and "draft_citations"."source_prospect_id" is null and "draft_citations"."source_field" is null and "draft_citations"."source_signal_id" is null and "draft_citations"."source_observed_at" is null and "draft_citations"."source_url" is not null and "draft_citations"."source_retrieved_at" is not null and "draft_citations"."source_call_id" is null and "draft_citations"."source_deal_record_id" is null and "draft_citations"."source_document_id" is null and "draft_citations"."source_page" is null) or ("draft_citations"."source_kind" = 'moment' and "draft_citations"."source_prospect_id" is null and "draft_citations"."source_field" is null and "draft_citations"."source_signal_id" is null and "draft_citations"."source_observed_at" is null and "draft_citations"."source_url" is null and "draft_citations"."source_retrieved_at" is null and "draft_citations"."source_call_id" is not null and "draft_citations"."source_deal_record_id" is not null and "draft_citations"."source_document_id" is null and "draft_citations"."source_page" is null) or ("draft_citations"."source_kind" = 'document' and "draft_citations"."source_prospect_id" is null and "draft_citations"."source_field" is null and "draft_citations"."source_signal_id" is null and "draft_citations"."source_observed_at" is null and "draft_citations"."source_url" is null and "draft_citations"."source_retrieved_at" is null and "draft_citations"."source_call_id" is null and "draft_citations"."source_deal_record_id" is null and "draft_citations"."source_document_id" is not null)),
	CONSTRAINT "draft_citations_source_prospect_id_shape" CHECK ("source_prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "draft_citations_source_signal_id_shape" CHECK ("source_signal_id" ~ '^sig_[0-9a-f]{32}$'),
	CONSTRAINT "draft_citations_source_call_id_shape" CHECK ("source_call_id" ~ '^call_[0-9a-f]{32}$'),
	CONSTRAINT "draft_citations_source_deal_record_id_shape" CHECK ("source_deal_record_id" ~ '^deal_[0-9a-f]{32}$'),
	CONSTRAINT "draft_citations_source_document_id_shape" CHECK ("source_document_id" ~ '^doc_[0-9a-f]{32}$'),
	CONSTRAINT "draft_citations_source_field_known" CHECK ("outbound"."draft_citations"."source_field" is null or "outbound"."draft_citations"."source_field" in ('firstName', 'lastName', 'jobTitle', 'email', 'phone', 'linkedinUrl')),
	CONSTRAINT "draft_citations_source_url_shape" CHECK ("outbound"."draft_citations"."source_url" is null or (char_length("outbound"."draft_citations"."source_url") between 1 and 2048
      and "outbound"."draft_citations"."source_url" ~ '^https?://[^@/?#[:space:]]+([/?#][^[:space:]]*)?$')),
	CONSTRAINT "draft_citations_source_page_shape" CHECK ("outbound"."draft_citations"."source_page" is null or "outbound"."draft_citations"."source_page" between 1 and 300)
);
--> statement-breakpoint
CREATE TABLE "outbound"."drafts" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"prospect_id" text NOT NULL,
	"campaign_id" text,
	"step_key" text,
	"channel" text NOT NULL,
	"goal" text NOT NULL,
	"language" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"source" text DEFAULT 'generated' NOT NULL,
	"ungrounded" boolean NOT NULL,
	"won_deal_count" integer DEFAULT 0 NOT NULL,
	"auto_sendable" boolean DEFAULT false NOT NULL,
	"brand_voice_id" text NOT NULL,
	"voice_version" integer NOT NULL,
	"brief_id" text,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drafts_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "drafts_id_shape" CHECK ("id" ~ '^drf_[0-9a-f]{32}$'),
	CONSTRAINT "drafts_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "drafts_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "drafts_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "drafts_campaign_id_shape" CHECK ("campaign_id" ~ '^cpg_[0-9a-f]{32}$'),
	CONSTRAINT "drafts_step_key_shape" CHECK ("outbound"."drafts"."step_key" is null or (char_length("outbound"."drafts"."step_key") between 1 and 40
        and "outbound"."drafts"."step_key" ~ '^[a-z][a-z0-9_-]*$')),
	CONSTRAINT "drafts_channel_known" CHECK ("outbound"."drafts"."channel" in ('email')),
	CONSTRAINT "drafts_goal_shape" CHECK (char_length("outbound"."drafts"."goal") between 1 and 500),
	CONSTRAINT "drafts_language_known" CHECK ("outbound"."drafts"."language" in ('en')),
	CONSTRAINT "drafts_subject_shape" CHECK (char_length("outbound"."drafts"."subject") between 1 and 200),
	CONSTRAINT "drafts_body_shape" CHECK (char_length("outbound"."drafts"."body") between 1 and 5000),
	CONSTRAINT "drafts_revision_range" CHECK ("outbound"."drafts"."revision" between 1 and 10000),
	CONSTRAINT "drafts_source_known" CHECK ("outbound"."drafts"."source" in ('generated', 'edited')),
	CONSTRAINT "drafts_edited_after_first" CHECK ("outbound"."drafts"."source" = 'generated' or "outbound"."drafts"."revision" > 1),
	CONSTRAINT "drafts_won_deal_count_range" CHECK ("outbound"."drafts"."won_deal_count" between 0 and 100),
	CONSTRAINT "drafts_ungrounded_has_no_deals" CHECK (not "outbound"."drafts"."ungrounded" or "outbound"."drafts"."won_deal_count" = 0),
	CONSTRAINT "drafts_auto_sendable_needs_grounding" CHECK (not ("outbound"."drafts"."auto_sendable" and "outbound"."drafts"."ungrounded")),
	CONSTRAINT "drafts_brand_voice_id_shape" CHECK ("brand_voice_id" ~ '^bvo_[0-9a-f]{32}$'),
	CONSTRAINT "drafts_voice_version_range" CHECK ("outbound"."drafts"."voice_version" between 1 and 1000000),
	CONSTRAINT "drafts_brief_id_shape" CHECK ("brief_id" ~ '^brf_[0-9a-f]{32}$'),
	CONSTRAINT "drafts_model_shape" CHECK (char_length("outbound"."drafts"."model") between 1 and 100),
	CONSTRAINT "drafts_updated_not_before_created" CHECK ("outbound"."drafts"."updated_at" >= "outbound"."drafts"."created_at")
);
--> statement-breakpoint
CREATE TABLE "outbound"."model_usage" (
	"organization_id" text NOT NULL,
	"month" date NOT NULL,
	"model" text NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"request_count" bigint DEFAULT 0 NOT NULL,
	"cost_micros" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_usage_pkey" PRIMARY KEY("organization_id","month","model"),
	CONSTRAINT "model_usage_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "model_usage_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "model_usage_month_first_day" CHECK (extract(day from "outbound"."model_usage"."month") = 1),
	CONSTRAINT "model_usage_model_shape" CHECK (char_length("outbound"."model_usage"."model") between 1 and 100),
	CONSTRAINT "model_usage_counts_not_negative" CHECK ("outbound"."model_usage"."input_tokens" >= 0 and "outbound"."model_usage"."output_tokens" >= 0 and "outbound"."model_usage"."request_count" >= 0 and "outbound"."model_usage"."cost_micros" >= 0)
);
--> statement-breakpoint
ALTER TABLE "outbound"."brief_statements" ADD CONSTRAINT "brief_statements_brief_fk" FOREIGN KEY ("organization_id","brief_id") REFERENCES "outbound"."briefs"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."draft_checks" ADD CONSTRAINT "draft_checks_draft_fk" FOREIGN KEY ("organization_id","draft_id") REFERENCES "outbound"."drafts"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."draft_citations" ADD CONSTRAINT "draft_citations_draft_fk" FOREIGN KEY ("organization_id","draft_id") REFERENCES "outbound"."drafts"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."drafts" ADD CONSTRAINT "drafts_brand_voice_fk" FOREIGN KEY ("organization_id","brand_voice_id","voice_version") REFERENCES "outbound"."brand_voices"("organization_id","id","version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."drafts" ADD CONSTRAINT "drafts_brief_fk" FOREIGN KEY ("organization_id","brief_id","prospect_id") REFERENCES "outbound"."briefs"("organization_id","id","prospect_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brand_voices_version_key" ON "outbound"."brand_voices" USING btree ("organization_id","version");--> statement-breakpoint
CREATE INDEX "briefs_prospect_idx" ON "outbound"."briefs" USING btree ("organization_id","prospect_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "briefs_list_idx" ON "outbound"."briefs" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "briefs_expires_at_idx" ON "outbound"."briefs" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "drafts_list_idx" ON "outbound"."drafts" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "drafts_brief_idx" ON "outbound"."drafts" USING btree ("organization_id","brief_id");--> statement-breakpoint
CREATE INDEX "drafts_prospect_idx" ON "outbound"."drafts" USING btree ("organization_id","prospect_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "drafts_campaign_idx" ON "outbound"."drafts" USING btree ("organization_id","campaign_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "outbound"."drafts"."campaign_id" is not null;--> statement-breakpoint
CREATE INDEX "drafts_ungrounded_idx" ON "outbound"."drafts" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "outbound"."drafts"."ungrounded";
--> statement-breakpoint
-- A Brand Voice version, a Research Brief and its rows never change once written: a change is a new
-- row, so a Draft always names what it was written from.
REVOKE UPDATE ON "outbound"."brand_voices" FROM closeline_outbound;
--> statement-breakpoint
REVOKE UPDATE ON "outbound"."briefs" FROM closeline_outbound;
--> statement-breakpoint
REVOKE UPDATE ON "outbound"."brief_statements" FROM closeline_outbound;
--> statement-breakpoint
ALTER TABLE "outbound"."brand_voices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."brand_voices" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "brand_voices_tenant_isolation" ON "outbound"."brand_voices" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."briefs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."briefs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "briefs_tenant_isolation" ON "outbound"."briefs" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."brief_statements" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."brief_statements" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "brief_statements_tenant_isolation" ON "outbound"."brief_statements" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."drafts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."drafts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "drafts_tenant_isolation" ON "outbound"."drafts" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."draft_citations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."draft_citations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "draft_citations_tenant_isolation" ON "outbound"."draft_citations" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."draft_checks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."draft_checks" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "draft_checks_tenant_isolation" ON "outbound"."draft_checks" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."model_usage" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."model_usage" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "model_usage_tenant_isolation" ON "outbound"."model_usage" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
