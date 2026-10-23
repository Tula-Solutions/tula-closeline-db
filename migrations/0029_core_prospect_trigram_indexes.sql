-- Trigram indexes for the Prospect and Prospect Company list filter `q` (ilike '%text%').
-- pg_trgm is a trusted extension, so closeline_owner (not a superuser, owner of the database) can
-- create it. It lives in `public`, where no service role has USAGE (migration 0000); the planner
-- needs no schema access to use an index, and the services call none of its functions.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;--> statement-breakpoint
CREATE INDEX "prospect_companies_name_trgm_idx" ON "core"."prospect_companies" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "prospect_companies_domain_trgm_idx" ON "core"."prospect_companies" USING gin ("domain" gin_trgm_ops) WHERE "core"."prospect_companies"."domain" is not null;--> statement-breakpoint
CREATE INDEX "prospect_fields_value_trgm_idx" ON "core"."prospect_fields" USING gin ("value" gin_trgm_ops) WHERE "core"."prospect_fields"."state" = 'current';