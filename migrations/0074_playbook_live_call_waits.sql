CREATE TABLE "playbook"."live_call_waits" (
	"organization_id" text NOT NULL,
	"call_id" text NOT NULL,
	"direction" text NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "live_call_waits_pkey" PRIMARY KEY("organization_id","call_id"),
	CONSTRAINT "live_call_waits_call_id_shape" CHECK ("call_id" ~ '^call_[0-9a-f]{32}$'),
	CONSTRAINT "live_call_waits_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "live_call_waits_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "live_call_waits_direction_known" CHECK ("playbook"."live_call_waits"."direction" in ('inbound', 'outbound'))
);
--> statement-breakpoint
CREATE INDEX "live_call_waits_list_idx" ON "playbook"."live_call_waits" USING btree ("organization_id","created_at","call_id");
--> statement-breakpoint
ALTER TABLE "playbook"."live_call_waits" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."live_call_waits" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "live_call_waits_tenant_isolation" ON "playbook"."live_call_waits" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
