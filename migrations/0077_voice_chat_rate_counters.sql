CREATE TABLE "voice"."chat_rate_counters" (
	"organization_id" text NOT NULL,
	"key_hash" "bytea" NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"hits" integer NOT NULL,
	CONSTRAINT "chat_rate_counters_pkey" PRIMARY KEY("organization_id","key_hash","window_start"),
	CONSTRAINT "chat_rate_counters_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "chat_rate_counters_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "chat_rate_counters_key_hash_length" CHECK (octet_length("voice"."chat_rate_counters"."key_hash") = 32),
	CONSTRAINT "chat_rate_counters_hits_positive" CHECK ("voice"."chat_rate_counters"."hits" >= 1)
);
--> statement-breakpoint
CREATE INDEX "chat_rate_counters_window_idx" ON "voice"."chat_rate_counters" USING btree ("organization_id","window_start");
--> statement-breakpoint
ALTER TABLE "voice"."chat_rate_counters" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."chat_rate_counters" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "chat_rate_counters_tenant_isolation" ON "voice"."chat_rate_counters" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
