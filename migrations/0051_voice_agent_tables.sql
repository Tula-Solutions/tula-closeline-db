CREATE TABLE "voice"."agent_settings" (
	"organization_id" text NOT NULL,
	"paused" boolean NOT NULL,
	"greeting" text NOT NULL,
	"voice_style" text NOT NULL,
	"time_zone" text NOT NULL,
	"hours" jsonb NOT NULL,
	"max_call_seconds" integer NOT NULL,
	"max_cost_usd_cents" integer NOT NULL,
	"concurrency_cap" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_membership_id" text,
	CONSTRAINT "agent_settings_pkey" PRIMARY KEY("organization_id"),
	CONSTRAINT "agent_settings_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "agent_settings_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "agent_settings_greeting_shape" CHECK (char_length("voice"."agent_settings"."greeting") between 1 and 500),
	CONSTRAINT "agent_settings_voice_style_known" CHECK ("voice"."agent_settings"."voice_style" in ('warm', 'neutral', 'crisp')),
	CONSTRAINT "agent_settings_time_zone_shape" CHECK (char_length("voice"."agent_settings"."time_zone") between 1 and 64
        and "voice"."agent_settings"."time_zone" collate "C" ~ '^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+){0,2}$'),
	CONSTRAINT "agent_settings_hours_shape" CHECK (jsonb_typeof("voice"."agent_settings"."hours") = 'array'
        and jsonb_array_length("voice"."agent_settings"."hours") between 1 and 7
        and octet_length("voice"."agent_settings"."hours"::text) <= 4096),
	CONSTRAINT "agent_settings_max_call_seconds_range" CHECK ("voice"."agent_settings"."max_call_seconds" between 30 and 1800),
	CONSTRAINT "agent_settings_max_cost_range" CHECK ("voice"."agent_settings"."max_cost_usd_cents" between 1 and 5000),
	CONSTRAINT "agent_settings_concurrency_range" CHECK ("voice"."agent_settings"."concurrency_cap" between 1 and 50),
	CONSTRAINT "agent_settings_updated_by_membership_id_shape" CHECK ("updated_by_membership_id" ~ '^mem_[0-9a-f]{32}$')
);
--> statement-breakpoint
CREATE TABLE "voice"."agent_turn_sources" (
	"organization_id" text NOT NULL,
	"turn_id" text NOT NULL,
	"position" smallint NOT NULL,
	"document_id" text NOT NULL,
	"page" integer,
	"passage" text NOT NULL,
	CONSTRAINT "agent_turn_sources_pkey" PRIMARY KEY("organization_id","turn_id","position"),
	CONSTRAINT "agent_turn_sources_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "agent_turn_sources_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "agent_turn_sources_turn_id_shape" CHECK ("turn_id" ~ '^trn_[0-9a-f]{32}$'),
	CONSTRAINT "agent_turn_sources_position_range" CHECK ("voice"."agent_turn_sources"."position" between 0 and 9),
	CONSTRAINT "agent_turn_sources_document_id_shape" CHECK ("document_id" ~ '^doc_[0-9a-f]{32}$'),
	CONSTRAINT "agent_turn_sources_page_range" CHECK ("voice"."agent_turn_sources"."page" is null or "voice"."agent_turn_sources"."page" between 1 and 300),
	CONSTRAINT "agent_turn_sources_passage_shape" CHECK (char_length("voice"."agent_turn_sources"."passage") between 1 and 512)
);
--> statement-breakpoint
CREATE TABLE "voice"."agent_turns" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"call_id" text,
	"chat_id" text,
	"try_session_id" text,
	"turn_index" integer NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"deferred" boolean DEFAULT false NOT NULL,
	"tool_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_turns_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "agent_turns_id_shape" CHECK ("id" ~ '^trn_[0-9a-f]{32}$'),
	CONSTRAINT "agent_turns_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "agent_turns_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "agent_turns_call_id_shape" CHECK ("call_id" ~ '^call_[0-9a-f]{32}$'),
	CONSTRAINT "agent_turns_chat_id_shape" CHECK ("chat_id" ~ '^cht_[0-9a-f]{32}$'),
	CONSTRAINT "agent_turns_try_session_id_shape" CHECK ("try_session_id" ~ '^try_[0-9a-f]{32}$'),
	CONSTRAINT "agent_turns_one_conversation" CHECK (num_nonnulls("voice"."agent_turns"."call_id", "voice"."agent_turns"."chat_id", "voice"."agent_turns"."try_session_id") = 1),
	CONSTRAINT "agent_turns_index_range" CHECK ("voice"."agent_turns"."turn_index" >= 0),
	CONSTRAINT "agent_turns_role_known" CHECK ("voice"."agent_turns"."role" in ('prospect', 'agent')),
	CONSTRAINT "agent_turns_text_shape" CHECK (char_length("voice"."agent_turns"."text") between 1 and 2000),
	CONSTRAINT "agent_turns_tool_known" CHECK ("voice"."agent_turns"."tool_name" is null or "voice"."agent_turns"."tool_name" in ('record_answer', 'find_slots', 'book', 'hand_off', 'end_call', 'revoke_consent')),
	CONSTRAINT "agent_turns_only_agent_acts" CHECK ("voice"."agent_turns"."role" = 'agent' or ("voice"."agent_turns"."tool_name" is null and not "voice"."agent_turns"."deferred"))
);
--> statement-breakpoint
CREATE TABLE "voice"."chats" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"prospect_id" text,
	"inquiry_id" text,
	"session_token_hash" "bytea" NOT NULL,
	"source_url" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "chats_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "chats_id_shape" CHECK ("id" ~ '^cht_[0-9a-f]{32}$'),
	CONSTRAINT "chats_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "chats_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "chats_state_known" CHECK ("voice"."chats"."state" in ('open', 'handed_off', 'closed')),
	CONSTRAINT "chats_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "chats_inquiry_id_shape" CHECK ("inquiry_id" ~ '^inq_[0-9a-f]{32}$'),
	CONSTRAINT "chats_session_token_hash_length" CHECK (octet_length("voice"."chats"."session_token_hash") = 32),
	CONSTRAINT "chats_source_url_shape" CHECK (char_length("voice"."chats"."source_url") between 1 and 2048
        and "voice"."chats"."source_url" ~ '^https?://[^\s]+$'),
	CONSTRAINT "chats_closed" CHECK (("voice"."chats"."state" = 'closed') = ("voice"."chats"."closed_at" is not null)),
	CONSTRAINT "chats_times_in_order" CHECK ("voice"."chats"."last_message_at" >= "voice"."chats"."started_at" and "voice"."chats"."expires_at" > "voice"."chats"."started_at"
        and ("voice"."chats"."closed_at" is null or "voice"."chats"."closed_at" >= "voice"."chats"."started_at"))
);
--> statement-breakpoint
CREATE TABLE "voice"."handoffs" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"channel" text NOT NULL,
	"call_id" text,
	"chat_id" text,
	"rep_membership_id" text,
	"attempt" smallint DEFAULT 1 NOT NULL,
	"reason" text NOT NULL,
	"result" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "handoffs_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "handoffs_id_shape" CHECK ("id" ~ '^hof_[0-9a-f]{32}$'),
	CONSTRAINT "handoffs_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "handoffs_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "handoffs_state_known" CHECK ("voice"."handoffs"."state" in ('pending', 'accepted', 'completed', 'declined', 'timed_out', 'no_rep')),
	CONSTRAINT "handoffs_channel_known" CHECK ("voice"."handoffs"."channel" in ('call', 'chat')),
	CONSTRAINT "handoffs_reason_known" CHECK ("voice"."handoffs"."reason" in ('asked_for_rep', 'qualified', 'agent_unsure', 'prospect_frustrated')),
	CONSTRAINT "handoffs_result_known" CHECK ("voice"."handoffs"."result" is null or "voice"."handoffs"."result" in ('bridged', 'booking_offered', 'abandoned')),
	CONSTRAINT "handoffs_call_id_shape" CHECK ("call_id" ~ '^call_[0-9a-f]{32}$'),
	CONSTRAINT "handoffs_chat_id_shape" CHECK ("chat_id" ~ '^cht_[0-9a-f]{32}$'),
	CONSTRAINT "handoffs_rep_membership_id_shape" CHECK ("rep_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "handoffs_channel_names_its_conversation" CHECK (("voice"."handoffs"."channel" = 'call' and "voice"."handoffs"."call_id" is not null and "voice"."handoffs"."chat_id" is null)
        or ("voice"."handoffs"."channel" = 'chat' and "voice"."handoffs"."chat_id" is not null and "voice"."handoffs"."call_id" is null)),
	CONSTRAINT "handoffs_attempt_range" CHECK ("voice"."handoffs"."attempt" between 1 and 10),
	CONSTRAINT "handoffs_rep_matches_state" CHECK (("voice"."handoffs"."state" = 'no_rep') = ("voice"."handoffs"."rep_membership_id" is null)),
	CONSTRAINT "handoffs_answered" CHECK ("voice"."handoffs"."state" not in ('accepted', 'completed') or "voice"."handoffs"."answered_at" is not null),
	CONSTRAINT "handoffs_completed" CHECK (("voice"."handoffs"."state" in ('completed', 'no_rep')) = ("voice"."handoffs"."completed_at" is not null)),
	CONSTRAINT "handoffs_result_only_when_over" CHECK ("voice"."handoffs"."result" is null or "voice"."handoffs"."state" in ('completed', 'no_rep')),
	CONSTRAINT "handoffs_times_in_order" CHECK (("voice"."handoffs"."answered_at" is null or "voice"."handoffs"."answered_at" >= "voice"."handoffs"."requested_at")
        and ("voice"."handoffs"."completed_at" is null or "voice"."handoffs"."completed_at" >= coalesce("voice"."handoffs"."answered_at", "voice"."handoffs"."requested_at")))
);
--> statement-breakpoint
CREATE TABLE "voice"."inquiries" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"source" text NOT NULL,
	"prospect_id" text NOT NULL,
	"assigned_to_membership_id" text,
	"chat_id" text,
	"call_id" text,
	"consent_wording_id" text,
	"consent_wording_version" integer,
	"consent_source_url" text,
	"consent_phone_granted" boolean,
	"callback_state" text NOT NULL,
	"callback_skip_reason" text,
	"callback_attempts" smallint DEFAULT 0 NOT NULL,
	"callback_next_attempt_at" timestamp with time zone,
	"callback_last_attempt_at" timestamp with time zone,
	"qualification_summary" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiries_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "inquiries_id_shape" CHECK ("id" ~ '^inq_[0-9a-f]{32}$'),
	CONSTRAINT "inquiries_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "inquiries_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "inquiries_idempotency_key_shape" CHECK (char_length("voice"."inquiries"."idempotency_key") between 16 and 128
        and "voice"."inquiries"."idempotency_key" collate "C" ~ '^[A-Za-z0-9_.:-]+$'),
	CONSTRAINT "inquiries_source_known" CHECK ("voice"."inquiries"."source" in ('form', 'chat', 'call')),
	CONSTRAINT "inquiries_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "inquiries_assigned_to_membership_id_shape" CHECK ("assigned_to_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "inquiries_chat_id_shape" CHECK ("chat_id" ~ '^cht_[0-9a-f]{32}$'),
	CONSTRAINT "inquiries_call_id_shape" CHECK ("call_id" ~ '^call_[0-9a-f]{32}$'),
	CONSTRAINT "inquiries_consent_wording_id_shape" CHECK ("consent_wording_id" ~ '^cwd_[0-9a-f]{32}$'),
	CONSTRAINT "inquiries_callback_state_known" CHECK ("voice"."inquiries"."callback_state" in ('not_applicable', 'pending', 'dialling', 'connected', 'no_answer', 'skipped', 'failed')),
	CONSTRAINT "inquiries_callback_skip_reason_known" CHECK ("voice"."inquiries"."callback_skip_reason" is null or "voice"."inquiries"."callback_skip_reason" in ('agent_paused', 'no_consent', 'consent_revoked', 'suppressed', 'outside_hours', 'consent_check_unavailable', 'no_phone_number', 'concurrency_cap', 'retries_exhausted')),
	CONSTRAINT "inquiries_callback_attempts_range" CHECK ("voice"."inquiries"."callback_attempts" between 0 and 3),
	CONSTRAINT "inquiries_consent_all_or_none" CHECK (("voice"."inquiries"."consent_wording_id" is null) = ("voice"."inquiries"."consent_wording_version" is null)
        and ("voice"."inquiries"."consent_wording_id" is null) = ("voice"."inquiries"."consent_source_url" is null)
        and ("voice"."inquiries"."consent_wording_id" is null) = ("voice"."inquiries"."consent_phone_granted" is null)
        and ("voice"."inquiries"."consent_wording_version" is null or "voice"."inquiries"."consent_wording_version" >= 1)
        and ("voice"."inquiries"."consent_source_url" is null or (char_length("voice"."inquiries"."consent_source_url") between 1 and 2048
          and "voice"."inquiries"."consent_source_url" ~ '^https?://[^\s]+$'))),
	CONSTRAINT "inquiries_form_has_consent" CHECK ("voice"."inquiries"."source" <> 'form' or "voice"."inquiries"."consent_wording_id" is not null),
	CONSTRAINT "inquiries_chat_link" CHECK (("voice"."inquiries"."source" = 'chat') = ("voice"."inquiries"."chat_id" is not null)),
	CONSTRAINT "inquiries_call_link" CHECK ("voice"."inquiries"."source" <> 'call' or "voice"."inquiries"."call_id" is not null),
	CONSTRAINT "inquiries_call_not_called_back" CHECK ("voice"."inquiries"."source" <> 'call' or "voice"."inquiries"."callback_state" = 'not_applicable'),
	CONSTRAINT "inquiries_callback_needs_consent" CHECK ("voice"."inquiries"."callback_state" in ('not_applicable', 'skipped') or "voice"."inquiries"."consent_wording_id" is not null),
	CONSTRAINT "inquiries_dialled_has_phone_consent" CHECK ("voice"."inquiries"."callback_state" in ('not_applicable', 'skipped') or "voice"."inquiries"."consent_phone_granted" is true),
	CONSTRAINT "inquiries_skip_reason" CHECK (("voice"."inquiries"."callback_state" = 'skipped') = ("voice"."inquiries"."callback_skip_reason" is not null)),
	CONSTRAINT "inquiries_next_attempt" CHECK ("voice"."inquiries"."callback_next_attempt_at" is null or "voice"."inquiries"."callback_state" = 'no_answer'),
	CONSTRAINT "inquiries_not_applicable_never_dialled" CHECK ("voice"."inquiries"."callback_state" <> 'not_applicable' or ("voice"."inquiries"."callback_attempts" = 0 and "voice"."inquiries"."callback_last_attempt_at" is null)),
	CONSTRAINT "inquiries_summary_shape" CHECK ("voice"."inquiries"."qualification_summary" is null or char_length("voice"."inquiries"."qualification_summary") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "voice"."qualification_answers" (
	"organization_id" text NOT NULL,
	"inquiry_id" text NOT NULL,
	"question_id" text NOT NULL,
	"value" jsonb,
	"skipped" boolean DEFAULT false NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qualification_answers_pkey" PRIMARY KEY("organization_id","inquiry_id","question_id"),
	CONSTRAINT "qualification_answers_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "qualification_answers_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "qualification_answers_inquiry_id_shape" CHECK ("inquiry_id" ~ '^inq_[0-9a-f]{32}$'),
	CONSTRAINT "qualification_answers_question_id_shape" CHECK ("question_id" ~ '^qst_[0-9a-f]{32}$'),
	CONSTRAINT "qualification_answers_value_shape" CHECK ("voice"."qualification_answers"."value" is null or (jsonb_typeof("voice"."qualification_answers"."value") in ('string', 'number', 'boolean')
        and (jsonb_typeof("voice"."qualification_answers"."value") <> 'string'
          or char_length("voice"."qualification_answers"."value" #>> '{}') between 1 and 500))),
	CONSTRAINT "qualification_answers_skipped_has_no_value" CHECK (not "voice"."qualification_answers"."skipped" or "voice"."qualification_answers"."value" is null)
);
--> statement-breakpoint
CREATE TABLE "voice"."qualification_questions" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"position" integer NOT NULL,
	"prompt" text NOT NULL,
	"kind" text NOT NULL,
	"choices" jsonb,
	"required" boolean DEFAULT false NOT NULL,
	"skip_when" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qualification_questions_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "qualification_questions_id_shape" CHECK ("id" ~ '^qst_[0-9a-f]{32}$'),
	CONSTRAINT "qualification_questions_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "qualification_questions_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "qualification_questions_position_range" CHECK ("voice"."qualification_questions"."position" between 1 and 50),
	CONSTRAINT "qualification_questions_prompt_shape" CHECK (char_length("voice"."qualification_questions"."prompt") between 1 and 500),
	CONSTRAINT "qualification_questions_kind_known" CHECK ("voice"."qualification_questions"."kind" in ('free_text', 'choice', 'number', 'yes_no')),
	CONSTRAINT "qualification_questions_choices_match_kind" CHECK (("voice"."qualification_questions"."kind" = 'choice') = ("voice"."qualification_questions"."choices" is not null)
        and ("voice"."qualification_questions"."choices" is null or (jsonb_typeof("voice"."qualification_questions"."choices") = 'array'
          and jsonb_array_length("voice"."qualification_questions"."choices") between 2 and 10
          and octet_length("voice"."qualification_questions"."choices"::text) <= 8192))),
	CONSTRAINT "qualification_questions_skip_when_shape" CHECK (jsonb_typeof("voice"."qualification_questions"."skip_when") = 'array'
        and jsonb_array_length("voice"."qualification_questions"."skip_when") <= 5
        and octet_length("voice"."qualification_questions"."skip_when"::text) <= 4096)
);
--> statement-breakpoint
ALTER TABLE "voice"."agent_turn_sources" ADD CONSTRAINT "agent_turn_sources_turn_fk" FOREIGN KEY ("organization_id","turn_id") REFERENCES "voice"."agent_turns"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice"."agent_turns" ADD CONSTRAINT "agent_turns_call_fk" FOREIGN KEY ("organization_id","call_id") REFERENCES "voice"."calls"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice"."agent_turns" ADD CONSTRAINT "agent_turns_chat_fk" FOREIGN KEY ("organization_id","chat_id") REFERENCES "voice"."chats"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice"."handoffs" ADD CONSTRAINT "handoffs_call_fk" FOREIGN KEY ("organization_id","call_id") REFERENCES "voice"."calls"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice"."handoffs" ADD CONSTRAINT "handoffs_chat_fk" FOREIGN KEY ("organization_id","chat_id") REFERENCES "voice"."chats"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice"."inquiries" ADD CONSTRAINT "inquiries_chat_fk" FOREIGN KEY ("organization_id","chat_id") REFERENCES "voice"."chats"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice"."inquiries" ADD CONSTRAINT "inquiries_call_fk" FOREIGN KEY ("organization_id","call_id") REFERENCES "voice"."calls"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice"."qualification_answers" ADD CONSTRAINT "qualification_answers_inquiry_fk" FOREIGN KEY ("organization_id","inquiry_id") REFERENCES "voice"."inquiries"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_turns_call_index_key" ON "voice"."agent_turns" USING btree ("organization_id","call_id","turn_index") WHERE "voice"."agent_turns"."call_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_turns_chat_index_key" ON "voice"."agent_turns" USING btree ("organization_id","chat_id","turn_index") WHERE "voice"."agent_turns"."chat_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_turns_try_index_key" ON "voice"."agent_turns" USING btree ("organization_id","try_session_id","turn_index") WHERE "voice"."agent_turns"."try_session_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "chats_session_token_key" ON "voice"."chats" USING btree ("organization_id","session_token_hash");--> statement-breakpoint
CREATE INDEX "chats_list_idx" ON "voice"."chats" USING btree ("organization_id","started_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "chats_state_list_idx" ON "voice"."chats" USING btree ("organization_id","state","started_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "chats_prospect_idx" ON "voice"."chats" USING btree ("organization_id","prospect_id") WHERE "voice"."chats"."prospect_id" is not null;--> statement-breakpoint
CREATE INDEX "chats_expiry_idx" ON "voice"."chats" USING btree ("organization_id","expires_at") WHERE "voice"."chats"."state" <> 'closed';--> statement-breakpoint
CREATE UNIQUE INDEX "handoffs_call_live_key" ON "voice"."handoffs" USING btree ("organization_id","call_id") WHERE "voice"."handoffs"."call_id" is not null and "voice"."handoffs"."state" in ('pending', 'accepted');--> statement-breakpoint
CREATE UNIQUE INDEX "handoffs_chat_live_key" ON "voice"."handoffs" USING btree ("organization_id","chat_id") WHERE "voice"."handoffs"."chat_id" is not null and "voice"."handoffs"."state" in ('pending', 'accepted');--> statement-breakpoint
CREATE INDEX "handoffs_list_idx" ON "voice"."handoffs" USING btree ("organization_id","requested_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "handoffs_state_list_idx" ON "voice"."handoffs" USING btree ("organization_id","state","requested_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "handoffs_rep_pending_idx" ON "voice"."handoffs" USING btree ("organization_id","rep_membership_id","requested_at") WHERE "voice"."handoffs"."state" = 'pending';--> statement-breakpoint
CREATE INDEX "handoffs_call_idx" ON "voice"."handoffs" USING btree ("organization_id","call_id") WHERE "voice"."handoffs"."call_id" is not null;--> statement-breakpoint
CREATE INDEX "handoffs_chat_idx" ON "voice"."handoffs" USING btree ("organization_id","chat_id") WHERE "voice"."handoffs"."chat_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "inquiries_idempotency_key" ON "voice"."inquiries" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "inquiries_chat_key" ON "voice"."inquiries" USING btree ("organization_id","chat_id") WHERE "voice"."inquiries"."chat_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "inquiries_call_key" ON "voice"."inquiries" USING btree ("organization_id","call_id") WHERE "voice"."inquiries"."call_id" is not null;--> statement-breakpoint
CREATE INDEX "inquiries_list_idx" ON "voice"."inquiries" USING btree ("organization_id","received_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inquiries_source_list_idx" ON "voice"."inquiries" USING btree ("organization_id","source","received_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inquiries_callback_list_idx" ON "voice"."inquiries" USING btree ("organization_id","callback_state","received_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inquiries_prospect_idx" ON "voice"."inquiries" USING btree ("organization_id","prospect_id","received_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inquiries_assignee_idx" ON "voice"."inquiries" USING btree ("organization_id","assigned_to_membership_id","received_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "voice"."inquiries"."assigned_to_membership_id" is not null;--> statement-breakpoint
CREATE INDEX "inquiries_retry_idx" ON "voice"."inquiries" USING btree ("organization_id","callback_next_attempt_at") WHERE "voice"."inquiries"."callback_state" = 'no_answer' and "voice"."inquiries"."callback_next_attempt_at" is not null;--> statement-breakpoint
CREATE INDEX "inquiries_pending_idx" ON "voice"."inquiries" USING btree ("organization_id","received_at") WHERE "voice"."inquiries"."callback_state" = 'pending';--> statement-breakpoint
CREATE INDEX "qualification_questions_order_idx" ON "voice"."qualification_questions" USING btree ("organization_id","position","id");
--> statement-breakpoint
ALTER TABLE "voice"."chats" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."chats" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "chats_tenant_isolation" ON "voice"."chats" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "voice"."inquiries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."inquiries" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "inquiries_tenant_isolation" ON "voice"."inquiries" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "voice"."agent_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."agent_settings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "agent_settings_tenant_isolation" ON "voice"."agent_settings" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "voice"."qualification_questions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."qualification_questions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "qualification_questions_tenant_isolation" ON "voice"."qualification_questions" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "voice"."qualification_answers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."qualification_answers" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "qualification_answers_tenant_isolation" ON "voice"."qualification_answers" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "voice"."agent_turns" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."agent_turns" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "agent_turns_tenant_isolation" ON "voice"."agent_turns" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "voice"."agent_turn_sources" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."agent_turn_sources" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "agent_turn_sources_tenant_isolation" ON "voice"."agent_turn_sources" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "voice"."handoffs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."handoffs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "handoffs_tenant_isolation" ON "voice"."handoffs" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
