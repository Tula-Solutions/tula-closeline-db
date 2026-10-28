CREATE TABLE "outbound"."variant_stats" (
	"organization_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"version" integer NOT NULL,
	"step_key" text NOT NULL,
	"variant_key" text NOT NULL,
	"sent" integer DEFAULT 0 NOT NULL,
	"replied" integer DEFAULT 0 NOT NULL,
	"bounced" integer DEFAULT 0 NOT NULL,
	"unsubscribed" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "variant_stats_pkey" PRIMARY KEY("organization_id","campaign_id","version","step_key","variant_key"),
	CONSTRAINT "variant_stats_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "variant_stats_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "variant_stats_campaign_id_shape" CHECK ("campaign_id" ~ '^cpg_[0-9a-f]{32}$'),
	CONSTRAINT "variant_stats_step_key_shape" CHECK ("step_key" ~ '^[a-z][a-z0-9_-]{0,39}$'),
	CONSTRAINT "variant_stats_variant_key_shape" CHECK ("variant_key" ~ '^[a-z][a-z0-9_-]{0,39}$'),
	CONSTRAINT "variant_stats_counts_not_negative" CHECK ("outbound"."variant_stats"."sent" >= 0 and "outbound"."variant_stats"."replied" >= 0 and "outbound"."variant_stats"."bounced" >= 0 and "outbound"."variant_stats"."unsubscribed" >= 0)
);
--> statement-breakpoint
ALTER TABLE "outbound"."variants" ADD COLUMN "promotion_min_sample" integer;--> statement-breakpoint
ALTER TABLE "outbound"."variants" ADD COLUMN "promotion_margin_points" double precision;--> statement-breakpoint
ALTER TABLE "outbound"."variant_stats" ADD CONSTRAINT "variant_stats_variant_fk" FOREIGN KEY ("organization_id","campaign_id","version","step_key","variant_key") REFERENCES "outbound"."variants"("organization_id","campaign_id","version","step_key","key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound"."variants" ADD CONSTRAINT "variants_promotion_policy" CHECK (("outbound"."variants"."promotion_min_sample" is null) = ("outbound"."variants"."promotion_margin_points" is null)
        and ("outbound"."variants"."promotion_min_sample" is null or "outbound"."variants"."promotion_min_sample" between 100 and 100000)
        and ("outbound"."variants"."promotion_margin_points" is null or "outbound"."variants"."promotion_margin_points" between 1 and 50));
--> statement-breakpoint
ALTER TABLE "outbound"."variant_stats" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outbound"."variant_stats" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "variant_stats_tenant_isolation" ON "outbound"."variant_stats" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
