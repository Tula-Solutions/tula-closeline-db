-- Existing rows are fine: end_reason is null (valid in any state) and the constant default 0 satisfies the cost CHECK; a constant default is metadata-only.
ALTER TABLE "voice"."calls" ADD COLUMN "end_reason" text;--> statement-breakpoint
ALTER TABLE "voice"."calls" ADD COLUMN "agent_cost_micro_cents" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "voice"."calls" ADD CONSTRAINT "calls_end_reason_known" CHECK ("voice"."calls"."end_reason" is null or "voice"."calls"."end_reason" in ('duration_cap', 'cost_cap', 'agent_ended', 'prospect_hung_up', 'rep_ended'));--> statement-breakpoint
ALTER TABLE "voice"."calls" ADD CONSTRAINT "calls_end_reason_ended" CHECK ("voice"."calls"."end_reason" is null or "voice"."calls"."state" = 'ended');--> statement-breakpoint
ALTER TABLE "voice"."calls" ADD CONSTRAINT "calls_agent_cost_non_negative" CHECK ("voice"."calls"."agent_cost_micro_cents" >= 0);