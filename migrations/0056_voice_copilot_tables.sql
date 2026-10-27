CREATE TABLE "voice"."call_turns" (
	"organization_id" text NOT NULL,
	"call_id" text NOT NULL,
	"track" text NOT NULL,
	"sequence" integer NOT NULL,
	"text" text NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "call_turns_pkey" PRIMARY KEY("organization_id","call_id","track","sequence"),
	CONSTRAINT "call_turns_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "call_turns_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "call_turns_call_id_shape" CHECK ("call_id" ~ '^call_[0-9a-f]{32}$'),
	CONSTRAINT "call_turns_track_known" CHECK ("voice"."call_turns"."track" in ('rep', 'prospect')),
	CONSTRAINT "call_turns_sequence_range" CHECK ("voice"."call_turns"."sequence" >= 1),
	CONSTRAINT "call_turns_text_shape" CHECK (char_length("voice"."call_turns"."text") between 1 and 4000),
	CONSTRAINT "call_turns_times_range" CHECK ("voice"."call_turns"."start_ms" between 0 and 43200000
        and "voice"."call_turns"."end_ms" between "voice"."call_turns"."start_ms" and 43200000)
);
--> statement-breakpoint
CREATE TABLE "voice"."copilot_cards" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"call_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"kind" text NOT NULL,
	"evidence_moments" integer NOT NULL,
	"evidence_deals" integer NOT NULL,
	"cited_moments" jsonb NOT NULL,
	"quotes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"objection_type" text,
	"response" text,
	"next_step" text,
	"document_id" text,
	"document_page" integer,
	"document_passage" text,
	"shown_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rating" text,
	"dismissed" boolean DEFAULT false NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_cards_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "copilot_cards_id_shape" CHECK ("id" ~ '^ccard_[0-9a-f]{32}$'),
	CONSTRAINT "copilot_cards_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "copilot_cards_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "copilot_cards_call_id_shape" CHECK ("call_id" ~ '^call_[0-9a-f]{32}$'),
	CONSTRAINT "copilot_cards_sequence_range" CHECK ("voice"."copilot_cards"."sequence" between 1 and 60),
	CONSTRAINT "copilot_cards_kind_known" CHECK ("voice"."copilot_cards"."kind" in ('similar_moment', 'objection', 'next_step', 'document')),
	CONSTRAINT "copilot_cards_evidence_range" CHECK ("voice"."copilot_cards"."evidence_moments" between 1 and 100
        and "voice"."copilot_cards"."evidence_deals" between 1 and "voice"."copilot_cards"."evidence_moments"),
	CONSTRAINT "copilot_cards_cited_shape" CHECK (jsonb_typeof("voice"."copilot_cards"."cited_moments") = 'array'
        and jsonb_array_length("voice"."copilot_cards"."cited_moments") between 1 and 5
        and octet_length("voice"."copilot_cards"."cited_moments"::text) <= 1024
        and jsonb_array_length("voice"."copilot_cards"."cited_moments") <= "voice"."copilot_cards"."evidence_moments"
        and jsonb_array_length(jsonb_path_query_array("voice"."copilot_cards"."cited_moments",
          '$[*] ? (@.callId like_regex "^call_[0-9a-f]{32}$" && @.dealRecordId like_regex "^deal_[0-9a-f]{32}$")'))
          = jsonb_array_length("voice"."copilot_cards"."cited_moments")),
	CONSTRAINT "copilot_cards_quotes_shape" CHECK (jsonb_typeof("voice"."copilot_cards"."quotes") = 'array'
        and jsonb_array_length("voice"."copilot_cards"."quotes") <= 5
        and octet_length("voice"."copilot_cards"."quotes"::text) <= 24576),
	CONSTRAINT "copilot_cards_objection_type_known" CHECK ("voice"."copilot_cards"."objection_type" is null or "voice"."copilot_cards"."objection_type" in ('price', 'timing', 'competitor', 'authority', 'need', 'trust')),
	CONSTRAINT "copilot_cards_rating_known" CHECK ("voice"."copilot_cards"."rating" is null or "voice"."copilot_cards"."rating" in ('useful', 'not_useful')),
	CONSTRAINT "copilot_cards_response_shape" CHECK ("voice"."copilot_cards"."response" is null or char_length("voice"."copilot_cards"."response") between 1 and 600),
	CONSTRAINT "copilot_cards_next_step_shape" CHECK ("voice"."copilot_cards"."next_step" is null or char_length("voice"."copilot_cards"."next_step") between 1 and 600),
	CONSTRAINT "copilot_cards_document_id_shape" CHECK ("document_id" ~ '^doc_[0-9a-f]{32}$'),
	CONSTRAINT "copilot_cards_document_page_range" CHECK ("voice"."copilot_cards"."document_page" is null or "voice"."copilot_cards"."document_page" between 1 and 300),
	CONSTRAINT "copilot_cards_document_passage_shape" CHECK ("voice"."copilot_cards"."document_passage" is null or char_length("voice"."copilot_cards"."document_passage") between 1 and 512),
	CONSTRAINT "copilot_cards_kind_columns" CHECK (("voice"."copilot_cards"."kind" = 'objection') = ("voice"."copilot_cards"."objection_type" is not null and "voice"."copilot_cards"."response" is not null)
        and ("voice"."copilot_cards"."kind" = 'objection' or ("voice"."copilot_cards"."objection_type" is null and "voice"."copilot_cards"."response" is null))
        and ("voice"."copilot_cards"."kind" = 'next_step') = ("voice"."copilot_cards"."next_step" is not null)
        and ("voice"."copilot_cards"."kind" = 'document') = ("voice"."copilot_cards"."document_id" is not null and "voice"."copilot_cards"."document_passage" is not null)
        and ("voice"."copilot_cards"."kind" = 'document' or "voice"."copilot_cards"."document_page" is null)),
	CONSTRAINT "copilot_cards_dismissed_or_pinned" CHECK (not ("voice"."copilot_cards"."dismissed" and "voice"."copilot_cards"."pinned"))
);
--> statement-breakpoint
CREATE TABLE "voice"."copilot_settings" (
	"organization_id" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"min_moments" integer DEFAULT 3 NOT NULL,
	"min_deals" integer DEFAULT 2 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_membership_id" text,
	CONSTRAINT "copilot_settings_pkey" PRIMARY KEY("organization_id"),
	CONSTRAINT "copilot_settings_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "copilot_settings_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "copilot_settings_min_range" CHECK ("voice"."copilot_settings"."min_moments" between 1 and 20
        and "voice"."copilot_settings"."min_deals" between 1 and "voice"."copilot_settings"."min_moments"),
	CONSTRAINT "copilot_settings_updated_by_membership_id_shape" CHECK ("updated_by_membership_id" ~ '^mem_[0-9a-f]{32}$')
);
--> statement-breakpoint
ALTER TABLE "voice"."call_turns" ADD CONSTRAINT "call_turns_call_fk" FOREIGN KEY ("organization_id","call_id") REFERENCES "voice"."calls"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice"."copilot_cards" ADD CONSTRAINT "copilot_cards_call_fk" FOREIGN KEY ("organization_id","call_id") REFERENCES "voice"."calls"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_turns_time_idx" ON "voice"."call_turns" USING btree ("organization_id","call_id","start_ms","track","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_cards_call_sequence_key" ON "voice"."copilot_cards" USING btree ("organization_id","call_id","sequence");--> statement-breakpoint
CREATE INDEX "copilot_cards_shown_idx" ON "voice"."copilot_cards" USING btree ("organization_id","call_id","shown_at","id");

--> statement-breakpoint
ALTER TABLE "voice"."call_turns" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."call_turns" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "call_turns_tenant_isolation" ON "voice"."call_turns" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "voice"."copilot_cards" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."copilot_cards" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "copilot_cards_tenant_isolation" ON "voice"."copilot_cards" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "voice"."copilot_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."copilot_settings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "copilot_settings_tenant_isolation" ON "voice"."copilot_settings" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));