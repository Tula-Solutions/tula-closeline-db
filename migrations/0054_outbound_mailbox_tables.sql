CREATE TABLE "outbound"."mailbox_connect_attempts" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"state_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "mailbox_connect_attempts_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "mailbox_connect_attempts_id_shape" CHECK ("id" ~ '^mca_[0-9a-f]{32}$'),
	CONSTRAINT "mailbox_connect_attempts_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "mailbox_connect_attempts_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "mailbox_connect_attempts_user_id_shape" CHECK ("user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "mailbox_connect_attempts_state_hash_shape" CHECK ("outbound"."mailbox_connect_attempts"."state_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "mailbox_connect_attempts_expires_after_created" CHECK ("outbound"."mailbox_connect_attempts"."expires_at" > "outbound"."mailbox_connect_attempts"."created_at"),
	CONSTRAINT "mailbox_connect_attempts_consumed_after_created" CHECK ("outbound"."mailbox_connect_attempts"."consumed_at" is null or "outbound"."mailbox_connect_attempts"."consumed_at" >= "outbound"."mailbox_connect_attempts"."created_at")
);
--> statement-breakpoint
CREATE TABLE "outbound"."mailbox_test_sends" (
	"organization_id" text NOT NULL,
	"mailbox_id" text NOT NULL,
	"key_hash" text NOT NULL,
	"provider_message_id" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mailbox_test_sends_pkey" PRIMARY KEY("organization_id","mailbox_id","key_hash"),
	CONSTRAINT "mailbox_test_sends_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "mailbox_test_sends_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "mailbox_test_sends_mailbox_id_shape" CHECK ("mailbox_id" ~ '^mbx_[0-9a-f]{32}$'),
	CONSTRAINT "mailbox_test_sends_key_hash_shape" CHECK ("outbound"."mailbox_test_sends"."key_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "mailbox_test_sends_provider_message_id_shape" CHECK ("outbound"."mailbox_test_sends"."provider_message_id" ~ '^[!-~]{1,255}$')
);
--> statement-breakpoint
ALTER TABLE "outbound"."mailbox_test_sends" ADD CONSTRAINT "mailbox_test_sends_mailbox_fk" FOREIGN KEY ("organization_id","mailbox_id") REFERENCES "outbound"."mailboxes"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mailbox_connect_attempts_state_key" ON "outbound"."mailbox_connect_attempts" USING btree ("organization_id","state_hash");--> statement-breakpoint
CREATE INDEX "mailbox_connect_attempts_expiry_idx" ON "outbound"."mailbox_connect_attempts" USING btree ("organization_id","expires_at");--> statement-breakpoint
CREATE INDEX "mailbox_test_sends_recent_idx" ON "outbound"."mailbox_test_sends" USING btree ("organization_id","mailbox_id","sent_at");
--> statement-breakpoint
ALTER TABLE "outbound"."mailbox_connect_attempts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."mailbox_connect_attempts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "mailbox_connect_attempts_tenant_isolation" ON "outbound"."mailbox_connect_attempts" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "outbound"."mailbox_test_sends" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."mailbox_test_sends" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "mailbox_test_sends_tenant_isolation" ON "outbound"."mailbox_test_sends" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
