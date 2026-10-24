CREATE TABLE "outbound"."enrichment_reservations" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"run_id" text NOT NULL,
	"provider" text NOT NULL,
	"month" date NOT NULL,
	"amount_micros" bigint NOT NULL,
	"hold_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	CONSTRAINT "enrichment_reservations_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "enrichment_reservations_id_shape" CHECK ("id" ~ '^ersv_[0-9a-f]{32}$'),
	CONSTRAINT "enrichment_reservations_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "enrichment_reservations_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "enrichment_reservations_run_id_shape" CHECK ("run_id" ~ '^erun_[0-9a-f]{32}$'),
	CONSTRAINT "enrichment_reservations_provider_shape" CHECK ("outbound"."enrichment_reservations"."provider" ~ '^[a-z][a-z0-9_]{0,31}$'),
	CONSTRAINT "enrichment_reservations_month_first_day" CHECK (extract(day from "outbound"."enrichment_reservations"."month") = 1),
	CONSTRAINT "enrichment_reservations_amount_range" CHECK ("outbound"."enrichment_reservations"."amount_micros" between 0 and 1000000000000),
	CONSTRAINT "enrichment_reservations_hold_key_shape" CHECK (char_length("outbound"."enrichment_reservations"."hold_key") between 1 and 256),
	CONSTRAINT "enrichment_reservations_released_after_created" CHECK ("outbound"."enrichment_reservations"."released_at" is null or "outbound"."enrichment_reservations"."released_at" >= "outbound"."enrichment_reservations"."created_at")
);
--> statement-breakpoint
ALTER TABLE "outbound"."enrichment_runs" ADD COLUMN "lease_token" uuid;--> statement-breakpoint
ALTER TABLE "outbound"."enrichment_runs" ADD COLUMN "heartbeat_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outbound"."enrichment_reservations" ADD CONSTRAINT "enrichment_reservations_run_fk" FOREIGN KEY ("organization_id","run_id") REFERENCES "outbound"."enrichment_runs"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "enrichment_reservations_hold_key" ON "outbound"."enrichment_reservations" USING btree ("organization_id","hold_key");--> statement-breakpoint
CREATE INDEX "enrichment_reservations_open_idx" ON "outbound"."enrichment_reservations" USING btree ("organization_id","month") WHERE "outbound"."enrichment_reservations"."released_at" is null;--> statement-breakpoint
CREATE INDEX "enrichment_reservations_run_idx" ON "outbound"."enrichment_reservations" USING btree ("organization_id","run_id");--> statement-breakpoint
CREATE INDEX "enrichment_runs_request_idx" ON "outbound"."enrichment_runs" USING btree ("organization_id","request_id");
--> statement-breakpoint
ALTER TABLE "outbound"."enrichment_reservations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."enrichment_reservations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "enrichment_reservations_tenant_isolation" ON "outbound"."enrichment_reservations" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
