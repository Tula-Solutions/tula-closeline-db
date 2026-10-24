CREATE TABLE "core"."analytics_event" (
	"organization_id" text NOT NULL,
	"metric" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"day" date NOT NULL,
	"channel" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_event_pkey" PRIMARY KEY("organization_id","metric","dedupe_key"),
	CONSTRAINT "analytics_event_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "analytics_event_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "analytics_event_metric_known" CHECK ("core"."analytics_event"."metric" in ('sends', 'replies', 'positive_replies', 'meetings', 'outcomes_won', 'outcomes_lost')),
	CONSTRAINT "analytics_event_dedupe_key_shape" CHECK (char_length("core"."analytics_event"."dedupe_key") between 1 and 64),
	CONSTRAINT "analytics_event_channel_known" CHECK ("core"."analytics_event"."channel" is null or "core"."analytics_event"."channel" in ('email', 'linkedin', 'chat', 'phone'))
);
--> statement-breakpoint
ALTER TABLE "core"."analytics_event" ADD CONSTRAINT "analytics_event_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_event_day_idx" ON "core"."analytics_event" USING btree ("organization_id","day","metric");--> statement-breakpoint
ALTER TABLE "core"."analytics_event" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."analytics_event" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "analytics_event_tenant_isolation" ON "core"."analytics_event" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
