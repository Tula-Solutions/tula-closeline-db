ALTER TABLE "outbound"."variants" ADD COLUMN "promotion_min_sample" integer;--> statement-breakpoint
ALTER TABLE "outbound"."variants" ADD COLUMN "promotion_margin_points" double precision;--> statement-breakpoint
ALTER TABLE "outbound"."variants" ADD CONSTRAINT "variants_promotion_policy" CHECK (("outbound"."variants"."promotion_min_sample" is null) = ("outbound"."variants"."promotion_margin_points" is null)
        and ("outbound"."variants"."promotion_min_sample" is null or "outbound"."variants"."promotion_min_sample" between 100 and 100000)
        and ("outbound"."variants"."promotion_margin_points" is null or "outbound"."variants"."promotion_margin_points" between 1 and 50));