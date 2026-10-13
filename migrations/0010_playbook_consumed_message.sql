CREATE TABLE "playbook"."consumed_message" (
	"consumer" text NOT NULL,
	"organization_id" text NOT NULL,
	"message_id" text NOT NULL,
	"state" text NOT NULL,
	"claim_token" uuid NOT NULL,
	"lease_expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "consumed_message_pkey" PRIMARY KEY("consumer","organization_id","message_id"),
	CONSTRAINT "consumed_message_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "consumed_message_consumer_shape" CHECK (char_length("playbook"."consumed_message"."consumer") between 1 and 128 and "playbook"."consumed_message"."consumer" collate "C" ~ '^[A-Za-z0-9_.:-]+$'),
	CONSTRAINT "consumed_message_message_id_shape" CHECK (char_length("playbook"."consumed_message"."message_id") between 1 and 128 and "playbook"."consumed_message"."message_id" collate "C" ~ '^[A-Za-z0-9_.:-]+$'),
	CONSTRAINT "consumed_message_state_known" CHECK ("playbook"."consumed_message"."state" in ('claimed', 'done')),
	CONSTRAINT "consumed_message_state_columns" CHECK (("playbook"."consumed_message"."state" = 'claimed' and "playbook"."consumed_message"."lease_expires_at" is not null and "playbook"."consumed_message"."completed_at" is null)
        or ("playbook"."consumed_message"."state" = 'done' and "playbook"."consumed_message"."lease_expires_at" is null and "playbook"."consumed_message"."completed_at" is not null))
);
--> statement-breakpoint
CREATE INDEX "consumed_message_done_idx" ON "playbook"."consumed_message" USING btree ("organization_id","completed_at") WHERE "playbook"."consumed_message"."state" = 'done';--> statement-breakpoint
CREATE INDEX "consumed_message_lease_idx" ON "playbook"."consumed_message" USING btree ("organization_id","lease_expires_at") WHERE "playbook"."consumed_message"."state" = 'claimed';
--> statement-breakpoint
-- Everything below is hand-written (Drizzle cannot express it), appended after the generated SQL
-- as 0002 and 0004 do. Run as closeline_owner.

-- Row-level security: the one canonical fail-closed policy on every table, written by
-- tenantRlsStatements. Each is a tenant table (every row belongs to one Organization), so the
-- catalog check needs no allowlist entry. No privilege is taken away: the schema defaults give
-- closeline_playbook SELECT, INSERT, UPDATE and DELETE (no TRUNCATE), which claim, renew,
-- complete, release and purge need, each inside one Organization's scope.
ALTER TABLE "playbook"."consumed_message" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."consumed_message" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "consumed_message_tenant_isolation" ON "playbook"."consumed_message" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
