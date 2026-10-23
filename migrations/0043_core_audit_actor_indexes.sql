-- Partial indexes for the audit list filter by actor (member, API key or Agent kind). The filter
-- ORs the three columns, so each gets its own index and Postgres can BitmapOr them. The builds run
-- in the migration transaction (no CONCURRENTLY) and block writes to core.audit_events meanwhile.
CREATE INDEX "audit_events_actor_member_idx" ON "core"."audit_events" USING btree ("organization_id","actor_membership_id","sequence" DESC NULLS LAST) WHERE "core"."audit_events"."actor_membership_id" is not null;--> statement-breakpoint
CREATE INDEX "audit_events_actor_api_key_idx" ON "core"."audit_events" USING btree ("organization_id","actor_api_key_id","sequence" DESC NULLS LAST) WHERE "core"."audit_events"."actor_api_key_id" is not null;--> statement-breakpoint
CREATE INDEX "audit_events_actor_agent_idx" ON "core"."audit_events" USING btree ("organization_id","actor_agent_kind","sequence" DESC NULLS LAST) WHERE "core"."audit_events"."actor_agent_kind" is not null;