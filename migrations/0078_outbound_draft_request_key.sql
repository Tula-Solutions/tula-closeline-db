ALTER TABLE "outbound"."drafts" ADD COLUMN "request_key" text;--> statement-breakpoint
ALTER TABLE "outbound"."drafts" ADD COLUMN "regenerate_keys" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "outbound"."drafts" ADD COLUMN "variant_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "drafts_request_key" ON "outbound"."drafts" USING btree ("organization_id","request_key");--> statement-breakpoint
ALTER TABLE "outbound"."drafts" ADD CONSTRAINT "drafts_request_key_shape" CHECK ("outbound"."drafts"."request_key" is null or (char_length("outbound"."drafts"."request_key") between 16 and 128 and "outbound"."drafts"."request_key" ~ '^[A-Za-z0-9_.:-]+$'));--> statement-breakpoint
ALTER TABLE "outbound"."drafts" ADD CONSTRAINT "drafts_regenerate_keys_shape" CHECK (cardinality("outbound"."drafts"."regenerate_keys") <= 32
        and (cardinality("outbound"."drafts"."regenerate_keys") = 0
          or array_to_string("outbound"."drafts"."regenerate_keys", ' ') ~ '^[A-Za-z0-9_.:-]{16,128}( [A-Za-z0-9_.:-]{16,128})*$'));--> statement-breakpoint
ALTER TABLE "outbound"."drafts" ADD CONSTRAINT "drafts_variant_key_shape" CHECK ("outbound"."drafts"."variant_key" is null or (char_length("outbound"."drafts"."variant_key") between 1 and 40
        and "outbound"."drafts"."variant_key" ~ '^[a-z][a-z0-9_-]*$'));