CREATE TABLE "outbound"."linkedin_sends" (
	"organization_id" text NOT NULL,
	"send_key" text NOT NULL,
	"account_id" text NOT NULL,
	"kind" text NOT NULL,
	"state" text DEFAULT 'sending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "linkedin_sends_pkey" PRIMARY KEY("organization_id","send_key"),
	CONSTRAINT "linkedin_sends_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "linkedin_sends_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "linkedin_sends_account_id_shape" CHECK ("account_id" ~ '^lia_[0-9a-f]{32}$'),
	CONSTRAINT "linkedin_sends_send_key_length" CHECK (char_length("outbound"."linkedin_sends"."send_key") between 1 and 200),
	CONSTRAINT "linkedin_sends_kind_known" CHECK ("outbound"."linkedin_sends"."kind" in ('connection', 'message')),
	CONSTRAINT "linkedin_sends_state_known" CHECK ("outbound"."linkedin_sends"."state" in ('sending', 'sent')),
	CONSTRAINT "linkedin_sends_sent_matches_state" CHECK (("outbound"."linkedin_sends"."state" = 'sent') = ("outbound"."linkedin_sends"."sent_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "outbound"."linkedin_sends" ADD CONSTRAINT "linkedin_sends_account_fk" FOREIGN KEY ("organization_id","account_id") REFERENCES "outbound"."linkedin_accounts"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "linkedin_sends_account_idx" ON "outbound"."linkedin_sends" USING btree ("organization_id","account_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "outbound"."linkedin_sends" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."linkedin_sends" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "linkedin_sends_tenant_isolation" ON "outbound"."linkedin_sends" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
