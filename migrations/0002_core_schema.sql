CREATE TABLE "core"."invitation_directory" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"invitation_id" text NOT NULL,
	CONSTRAINT "invitation_directory_token_hash_shape" CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "invitation_directory_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "invitation_directory_invitation_id_shape" CHECK ("invitation_id" ~ '^inv_[0-9a-f]{32}$')
);
--> statement-breakpoint
CREATE TABLE "core"."invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"team_id" text,
	"invited_by_user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_organization_id_id_key" UNIQUE("organization_id","id"),
	CONSTRAINT "invitations_token_hash_key" UNIQUE("token_hash"),
	CONSTRAINT "invitations_id_shape" CHECK ("id" ~ '^inv_[0-9a-f]{32}$'),
	CONSTRAINT "invitations_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "invitations_invited_by_shape" CHECK ("invited_by_user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "invitations_team_id_shape" CHECK ("core"."invitations"."team_id" is null or "team_id" ~ '^team_[0-9a-f]{32}$'),
	CONSTRAINT "invitations_email_shape" CHECK ("core"."invitations"."email" = lower(btrim("core"."invitations"."email")) and char_length("core"."invitations"."email") between 3 and 320 and position('@' in "core"."invitations"."email") > 1),
	CONSTRAINT "invitations_role_known" CHECK ("core"."invitations"."role" in ('owner', 'admin', 'manager', 'rep')),
	CONSTRAINT "invitations_state_known" CHECK ("core"."invitations"."state" in ('pending', 'accepted', 'revoked')),
	CONSTRAINT "invitations_token_hash_shape" CHECK ("core"."invitations"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "invitations_expiry_after_creation" CHECK ("core"."invitations"."expires_at" > "core"."invitations"."created_at"),
	CONSTRAINT "invitations_state_shape" CHECK (("core"."invitations"."state" = 'pending' and "core"."invitations"."accepted_at" is null and "core"."invitations"."revoked_at" is null)
        or ("core"."invitations"."state" = 'accepted' and "core"."invitations"."accepted_at" is not null and "core"."invitations"."revoked_at" is null)
        or ("core"."invitations"."state" = 'revoked' and "core"."invitations"."revoked_at" is not null and "core"."invitations"."accepted_at" is null))
);
--> statement-breakpoint
CREATE TABLE "core"."membership_directory" (
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	CONSTRAINT "membership_directory_pkey" PRIMARY KEY("user_id","organization_id"),
	CONSTRAINT "membership_directory_one_organization_per_user" UNIQUE("user_id"),
	CONSTRAINT "membership_directory_user_id_shape" CHECK ("user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "membership_directory_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$')
);
--> statement-breakpoint
CREATE TABLE "core"."memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_organization_user_key" UNIQUE("organization_id","user_id"),
	CONSTRAINT "memberships_organization_id_id_key" UNIQUE("organization_id","id"),
	CONSTRAINT "memberships_id_shape" CHECK ("id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "memberships_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "memberships_user_id_shape" CHECK ("user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "memberships_role_known" CHECK ("core"."memberships"."role" in ('owner', 'admin', 'manager', 'rep'))
);
--> statement-breakpoint
CREATE TABLE "core"."organizations" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"region" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"owner_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "organizations_name_shape" CHECK (char_length(btrim("core"."organizations"."name")) between 1 and 200),
	CONSTRAINT "organizations_region_known" CHECK ("core"."organizations"."region" in ('us', 'eu')),
	CONSTRAINT "organizations_status_known" CHECK ("core"."organizations"."status" in ('active', 'suspended', 'deleted')),
	CONSTRAINT "organizations_owner_count_not_negative" CHECK ("core"."organizations"."owner_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "core"."team_members" (
	"organization_id" text NOT NULL,
	"team_id" text NOT NULL,
	"membership_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_members_pkey" PRIMARY KEY("organization_id","team_id","membership_id"),
	CONSTRAINT "team_members_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$')
);
--> statement-breakpoint
CREATE TABLE "core"."teams" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"name_key" text GENERATED ALWAYS AS (lower(name)) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_organization_id_id_key" UNIQUE("organization_id","id"),
	CONSTRAINT "teams_organization_name_key" UNIQUE("organization_id","name_key"),
	CONSTRAINT "teams_id_shape" CHECK ("id" ~ '^team_[0-9a-f]{32}$'),
	CONSTRAINT "teams_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "teams_name_shape" CHECK (char_length(btrim("core"."teams"."name")) between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "core"."invitations" ADD CONSTRAINT "invitations_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."invitations" ADD CONSTRAINT "invitations_team_fk" FOREIGN KEY ("organization_id","team_id") REFERENCES "core"."teams"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."memberships" ADD CONSTRAINT "memberships_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."team_members" ADD CONSTRAINT "team_members_team_fk" FOREIGN KEY ("organization_id","team_id") REFERENCES "core"."teams"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."team_members" ADD CONSTRAINT "team_members_membership_fk" FOREIGN KEY ("organization_id","membership_id") REFERENCES "core"."memberships"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."teams" ADD CONSTRAINT "teams_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_pending_email_key" ON "core"."invitations" USING btree ("organization_id","email") WHERE "core"."invitations"."state" = 'pending';--> statement-breakpoint
CREATE INDEX "invitations_pending_list_idx" ON "core"."invitations" USING btree ("organization_id","created_at","id") WHERE "core"."invitations"."state" = 'pending';--> statement-breakpoint
CREATE INDEX "invitations_team_idx" ON "core"."invitations" USING btree ("organization_id","team_id") WHERE "core"."invitations"."team_id" is not null;--> statement-breakpoint
CREATE INDEX "team_members_membership_idx" ON "core"."team_members" USING btree ("organization_id","membership_id","team_id");
--> statement-breakpoint
-- Everything below is hand-written (Drizzle cannot express it), appended after the generated SQL
-- as 0001 does. Run as closeline_owner.

-- Row-level security: the five tenant tables get the one canonical fail-closed policy, written by
-- tenantRlsStatements. organizations is covered unchanged because its key is `organization_id`.
-- The two directories below are deliberately not under it (NON_TENANT_TABLES in src/isolation.ts).
ALTER TABLE "core"."organizations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."organizations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "organizations_tenant_isolation" ON "core"."organizations" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."memberships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."memberships" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "memberships_tenant_isolation" ON "core"."memberships" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."teams" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."teams" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "teams_tenant_isolation" ON "core"."teams" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."team_members" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."team_members" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "team_members_tenant_isolation" ON "core"."team_members" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."invitations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."invitations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "invitations_tenant_isolation" ON "core"."invitations" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
-- An invitation outlives the Team it named: deleting the Team clears only `team_id`. Drizzle cannot
-- write the column list, and a plain SET NULL would also null `organization_id`, so the generated
-- foreign key is replaced.
ALTER TABLE "core"."invitations" DROP CONSTRAINT "invitations_team_fk";
--> statement-breakpoint
ALTER TABLE "core"."invitations" ADD CONSTRAINT "invitations_team_fk" FOREIGN KEY ("organization_id","team_id") REFERENCES "core"."teams"("organization_id","id") ON DELETE SET NULL ("team_id") ON UPDATE no action;
--> statement-breakpoint

-- Privileges. Default privileges give closeline_core SELECT, INSERT, UPDATE and DELETE on every new
-- core table; two cases narrow that.
--
-- The directories are read-only to the service: only the SECURITY DEFINER triggers below write
-- them, as the owner. (TRUNCATE is not in the defaults.)
REVOKE INSERT, UPDATE, DELETE ON "core"."membership_directory", "core"."invitation_directory" FROM closeline_core;
--> statement-breakpoint
-- An Organization's Region is fixed at creation and owner_count is the triggers' bookkeeping, so
-- the service may change only these columns of an existing Organization. (INSERT stays open on
-- every column because Drizzle names all of them; the BEFORE INSERT trigger zeroes owner_count.)
REVOKE UPDATE ON "core"."organizations" FROM closeline_core;
--> statement-breakpoint
GRANT UPDATE ("name", "status", "updated_at") ON "core"."organizations" TO closeline_core;
--> statement-breakpoint

-- An Organization's Region never changes (ADR 0001). The service role has no UPDATE on the column;
-- this trigger holds for every other role, the owner included.
CREATE FUNCTION "core"."refuse_region_change"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'core.region_immutable: the Region of an Organization cannot change'
    USING ERRCODE = 'check_violation', CONSTRAINT = 'organizations_region_immutable';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "organizations_region_immutable" BEFORE UPDATE OF "region" ON "core"."organizations"
  FOR EACH ROW WHEN (OLD."region" IS DISTINCT FROM NEW."region")
  EXECUTE FUNCTION "core"."refuse_region_change"();
--> statement-breakpoint

-- A new Organization starts with no Owners whatever the insert says; only the membership triggers
-- move the count.
CREATE FUNCTION "core"."start_organization"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  NEW."owner_count" := 0;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "organizations_start" BEFORE INSERT ON "core"."organizations"
  FOR EACH ROW EXECUTE FUNCTION "core"."start_organization"();
--> statement-breakpoint

-- The last-Owner rule. `organizations.owner_count` is the number of memberships with role `owner`,
-- kept by the trigger below. Every change to it is an UPDATE of the Organization's row, and that
-- row lock is what serialises Owner changes within one Organization:
--   * READ COMMITTED: a second transaction waits for the first to commit, then recomputes
--     `owner_count + delta` from the committed value, so two demotions of the last two Owners
--     cannot both see "one other Owner remains". Counting memberships instead would not work: each
--     transaction would count its own snapshot (write skew).
--   * REPEATABLE READ and SERIALIZABLE: updating a row another transaction changed after the
--     snapshot fails with SQLSTATE 40001, so a stale view cannot slip through either.
-- The function is SECURITY DEFINER so the service role needs no UPDATE on `owner_count`. The
-- Organization row is not found when the Organization itself is being deleted (the cascade runs
-- after its row is gone); then the last Owner may go with it.
CREATE FUNCTION "core"."track_owner_count"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  delta integer := 0;
  target text;
  remaining integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    target := NEW."organization_id";
    IF NEW."role" = 'owner' THEN delta := 1; END IF;
  ELSIF TG_OP = 'DELETE' THEN
    target := OLD."organization_id";
    IF OLD."role" = 'owner' THEN delta := -1; END IF;
  ELSE
    target := NEW."organization_id";
    IF NEW."role" = 'owner' THEN delta := delta + 1; END IF;
    IF OLD."role" = 'owner' THEN delta := delta - 1; END IF;
  END IF;
  IF delta = 0 THEN
    RETURN NULL;
  END IF;
  UPDATE "core"."organizations" SET "owner_count" = "owner_count" + delta
    WHERE "organization_id" = target
    RETURNING "owner_count" INTO remaining;
  IF FOUND AND delta < 0 AND remaining < 1 THEN
    RAISE EXCEPTION 'core.last_owner: an Organization must keep at least one Owner'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'organizations_owner_required';
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "memberships_track_owner_count" AFTER INSERT OR DELETE OR UPDATE OF "role" ON "core"."memberships"
  FOR EACH ROW EXECUTE FUNCTION "core"."track_owner_count"();
--> statement-breakpoint

-- An Organization is created together with its first Owner: at commit it must have one. Checked at
-- commit because the Organization row comes first. If the setting no longer names this
-- Organization the check cannot see its rows, so it refuses instead of passing.
CREATE FUNCTION "core"."require_owner"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF NULLIF(current_setting('app.organization_id', true), '') IS DISTINCT FROM NEW."organization_id"
     OR EXISTS (SELECT 1 FROM "core"."organizations" o
                 WHERE o."organization_id" = NEW."organization_id" AND o."owner_count" < 1) THEN
    RAISE EXCEPTION 'core.owner_required: an Organization must be created with its first Owner'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'organizations_owner_required';
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "organizations_owner_required" AFTER INSERT ON "core"."organizations"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "core"."require_owner"();
--> statement-breakpoint

-- An accepted or revoked invitation is final, so a used token cannot be brought back to life.
CREATE FUNCTION "core"."refuse_reopened_invitation"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'core.invitation_state_final: an accepted or revoked invitation cannot change state'
    USING ERRCODE = 'check_violation', CONSTRAINT = 'invitations_state_final';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "invitations_state_final" BEFORE UPDATE OF "state" ON "core"."invitations"
  FOR EACH ROW WHEN (OLD."state" <> 'pending' AND NEW."state" IS DISTINCT FROM OLD."state")
  EXECUTE FUNCTION "core"."refuse_reopened_invitation"();
--> statement-breakpoint

-- The directories. Each is a one-row-per-tenant-row projection kept by AFTER ROW triggers in the
-- statement's own transaction, so a rollback, a savepoint rollback, a cascade or a failed
-- statement undoes both together. The functions are SECURITY DEFINER (they run as the owner, the
-- only role that can write the directories) and touch nothing but the directory from OLD and NEW.
-- A key already present is an error, not skipped: drift must be loud. The unique constraint on
-- membership_directory.user_id (one Organization per user) is violated here, by the insert, which
-- is why it can see across Organizations when an index on memberships behind row-level security
-- cannot.
CREATE FUNCTION "core"."sync_membership_directory"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    DELETE FROM "core"."membership_directory"
      WHERE "user_id" = OLD."user_id" AND "organization_id" = OLD."organization_id";
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO "core"."membership_directory" ("user_id", "organization_id")
      VALUES (NEW."user_id", NEW."organization_id");
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "memberships_sync_directory" AFTER INSERT OR DELETE OR UPDATE OF "user_id", "organization_id" ON "core"."memberships"
  FOR EACH ROW EXECUTE FUNCTION "core"."sync_membership_directory"();
--> statement-breakpoint
CREATE FUNCTION "core"."sync_invitation_directory"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    DELETE FROM "core"."invitation_directory" WHERE "token_hash" = OLD."token_hash";
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO "core"."invitation_directory" ("token_hash", "organization_id", "invitation_id")
      VALUES (NEW."token_hash", NEW."organization_id", NEW."id");
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "invitations_sync_directory" AFTER INSERT OR DELETE OR UPDATE OF "token_hash", "organization_id", "id" ON "core"."invitations"
  FOR EACH ROW EXECUTE FUNCTION "core"."sync_invitation_directory"();
--> statement-breakpoint

-- Trigger functions are never called directly; nothing but the owner may execute them.
REVOKE ALL ON FUNCTION "core"."refuse_region_change"(), "core"."start_organization"(), "core"."track_owner_count"(), "core"."require_owner"(), "core"."refuse_reopened_invitation"(), "core"."sync_membership_directory"(), "core"."sync_invitation_directory"() FROM PUBLIC;
