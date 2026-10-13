-- A membership must have an email (ADR 0015), and there is nothing to fill it from: auth owns it.
-- No deployed environment has a membership yet, so there is nothing to backfill; a developer's
-- local database may. Refuse to go on rather than invent an address. Row-level security hides every
-- membership from the owner here, so this reads `membership_directory`, which the triggers keep
-- one-to-one with `memberships` and which has no row-level security.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "core"."membership_directory") THEN
    RAISE EXCEPTION 'core.memberships already has rows, and the new required column email has no value to give them. Reset the local database (the compose of this repo: docker compose down -v, then docker compose up -d --wait; the hub dev stack: bun run dev --down --volumes) and run the migrations again; no deployed environment has memberships.';
  END IF;
END
$$;--> statement-breakpoint
ALTER TABLE "core"."memberships" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."memberships" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "core"."memberships" ADD CONSTRAINT "memberships_email_shape" CHECK ("core"."memberships"."email" = lower("core"."memberships"."email" collate "C")
        and char_length("core"."memberships"."email") between 3 and 320
        and char_length("core"."memberships"."email") - char_length(replace("core"."memberships"."email", '@', '')) = 1
        and position('@' in "core"."memberships"."email") between 2 and char_length("core"."memberships"."email") - 1
        and "core"."memberships"."email" collate "C" !~ '[[:space:][:cntrl:]]'
        and "core"."memberships"."email" collate "C" ~ '^[!-~]+$');--> statement-breakpoint
ALTER TABLE "core"."memberships" ADD CONSTRAINT "memberships_name_shape" CHECK ("core"."memberships"."name" is null or char_length(btrim("core"."memberships"."name")) between 1 and 201);--> statement-breakpoint
CREATE INDEX "memberships_organization_email_idx" ON "core"."memberships" USING btree ("organization_id","email");
