CREATE TABLE "auth"."abandon_cases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"core_organization_id" uuid,
	"user_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"attempt_expires_at" timestamp with time zone NOT NULL,
	"next_attempt_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"outcome" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "abandon_cases_environment_organization_key" UNIQUE("environment_id","core_organization_id"),
	CONSTRAINT "abandon_cases_environment_attempt_key" UNIQUE("environment_id","attempt_id"),
	CONSTRAINT "abandon_cases_due_after_expiry" CHECK ("auth"."abandon_cases"."next_attempt_at" >= "auth"."abandon_cases"."attempt_expires_at"),
	CONSTRAINT "abandon_cases_attempts_bounds" CHECK ("auth"."abandon_cases"."attempts" between 0 and 100),
	CONSTRAINT "abandon_cases_outcome_known" CHECK ("auth"."abandon_cases"."outcome" in ('done', 'refused', 'gave_up')),
	CONSTRAINT "abandon_cases_resolution_whole" CHECK (("auth"."abandon_cases"."resolved_at" is null) = ("auth"."abandon_cases"."outcome" is null))
);
--> statement-breakpoint
ALTER TABLE "auth"."abandon_cases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth"."abandon_cases" ADD CONSTRAINT "abandon_cases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."abandon_cases" ADD CONSTRAINT "abandon_cases_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."abandon_cases" ADD CONSTRAINT "abandon_cases_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abandon_cases_due_idx" ON "auth"."abandon_cases" USING btree ("environment_id","next_attempt_at") WHERE "auth"."abandon_cases"."resolved_at" is null;--> statement-breakpoint
CREATE INDEX "abandon_cases_purge_idx" ON "auth"."abandon_cases" USING btree ("environment_id","resolved_at") WHERE "auth"."abandon_cases"."resolved_at" is not null;--> statement-breakpoint
CREATE POLICY "abandon_cases_tenant_isolation" ON "auth"."abandon_cases" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "abandon_cases_resolved_only" ON "auth"."abandon_cases" AS RESTRICTIVE FOR DELETE TO public USING (resolved_at is not null);
--> statement-breakpoint
-- Everything below is hand-written (Drizzle cannot express it), appended after the generated SQL
-- as 0001 and 0004 do. Run as closeline_owner.

-- FORCE ROW LEVEL SECURITY binds the table owner too, as on every other environment-scoped table.
ALTER TABLE "auth"."abandon_cases" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Privileges. The schema's default privileges for closeline_auth are revoked (0001), so the table
-- grants nothing until here. A case is recorded (INSERT), found by the sweep (SELECT), moved along
-- (UPDATE of the columns that change as the sweep claims, resolves and learns an Organization id) and purged once resolved (DELETE,
-- which `abandon_cases_resolved_only` restricts to resolved rows). The Organization, user,
-- attempt, attempt expiry, environment and creation time of a case never change.
GRANT SELECT, INSERT, DELETE ON "auth"."abandon_cases" TO closeline_auth;
--> statement-breakpoint
GRANT UPDATE ("core_organization_id", "attempts", "next_attempt_at", "resolved_at", "outcome", "updated_at") ON "auth"."abandon_cases" TO closeline_auth;
