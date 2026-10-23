CREATE TABLE "core"."demo_request" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"work_email" text NOT NULL,
	"company_name" text NOT NULL,
	"message" text,
	"source_page" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"notification_status" text DEFAULT 'pending' NOT NULL,
	"notification_attempts" integer DEFAULT 0 NOT NULL,
	"notification_last_attempt_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demo_request_idempotency_key_key" UNIQUE("idempotency_key"),
	CONSTRAINT "demo_request_id_shape" CHECK ("id" ~ '^dreq_[0-9a-f]{32}$'),
	CONSTRAINT "demo_request_name_shape" CHECK (char_length(btrim("core"."demo_request"."name")) between 1 and 200),
	CONSTRAINT "demo_request_work_email_shape" CHECK ("core"."demo_request"."work_email" = lower("core"."demo_request"."work_email" collate "C")
        and char_length("core"."demo_request"."work_email") between 3 and 320
        and char_length("core"."demo_request"."work_email") - char_length(replace("core"."demo_request"."work_email", '@', '')) = 1
        and position('@' in "core"."demo_request"."work_email") between 2 and char_length("core"."demo_request"."work_email") - 1
        and "core"."demo_request"."work_email" collate "C" !~ '[[:space:][:cntrl:]]'
        and "core"."demo_request"."work_email" collate "C" ~ '^[!-~]+$'),
	CONSTRAINT "demo_request_company_name_shape" CHECK (char_length(btrim("core"."demo_request"."company_name")) between 1 and 200),
	CONSTRAINT "demo_request_message_length" CHECK ("core"."demo_request"."message" is null or char_length("core"."demo_request"."message") <= 2000),
	CONSTRAINT "demo_request_source_page_shape" CHECK (char_length("core"."demo_request"."source_page") between 1 and 200
        and left("core"."demo_request"."source_page", 1) = '/'),
	CONSTRAINT "demo_request_idempotency_key_length" CHECK (char_length("core"."demo_request"."idempotency_key") between 16 and 128),
	CONSTRAINT "demo_request_notification_status_known" CHECK ("core"."demo_request"."notification_status" in ('pending', 'sent', 'failed')),
	CONSTRAINT "demo_request_notification_attempts_not_negative" CHECK ("core"."demo_request"."notification_attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX "demo_requests_submitted_at_idx" ON "core"."demo_request" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "demo_requests_notice_idx" ON "core"."demo_request" USING btree ("submitted_at","id") WHERE "core"."demo_request"."notification_status" = 'pending';--> statement-breakpoint
-- Closeline holds a Demo Request itself, not an Organization, so it has no organization_id and is
-- outside row-level security (ADR 0011). Default privileges give closeline_core SELECT, INSERT, UPDATE
-- and DELETE on every new core table; none is wanted here, or a tenant scope could read every
-- Visitor. The table is on the isolation allowlist, and the check fails if any service role holds
-- a privilege on it.
REVOKE ALL ON "core"."demo_request" FROM closeline_core;
