CREATE TABLE "core"."invitation_directory" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"invitation_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
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
	CONSTRAINT "invitations_email_shape" CHECK ("core"."invitations"."email" = lower("core"."invitations"."email" collate "C")
        and char_length("core"."invitations"."email") between 3 and 320
        and char_length("core"."invitations"."email") - char_length(replace("core"."invitations"."email", '@', '')) = 1
        and position('@' in "core"."invitations"."email") between 2 and char_length("core"."invitations"."email") - 1
        and "core"."invitations"."email" collate "C" !~ '[[:space:][:cntrl:]]'
        and "core"."invitations"."email" collate "C" ~ '^[!-~]+$'),
	CONSTRAINT "invitations_role_known" CHECK ("core"."invitations"."role" in ('owner', 'admin', 'manager', 'rep')),
	CONSTRAINT "invitations_role_not_owner" CHECK ("core"."invitations"."role" <> 'owner'),
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
CREATE TABLE "core"."organization_state" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "organization_state_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "organization_state_status_known" CHECK ("core"."organization_state"."status" in ('active', 'suspended', 'deleted'))
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
	"name_key" text GENERATED ALWAYS AS (lower(name collate "C")) STORED,
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
ALTER TABLE "core"."organization_state" ADD CONSTRAINT "organization_state_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
-- The two directories and organization_state are deliberately not under it (NON_TENANT_TABLES in
-- src/isolation.ts).
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
-- foreign key is replaced. (The column list needs PostgreSQL 15; the supported minimum is 18.)
ALTER TABLE "core"."invitations" DROP CONSTRAINT "invitations_team_fk";
--> statement-breakpoint
ALTER TABLE "core"."invitations" ADD CONSTRAINT "invitations_team_fk" FOREIGN KEY ("organization_id","team_id") REFERENCES "core"."teams"("organization_id","id") ON DELETE SET NULL ("team_id") ON UPDATE no action;
--> statement-breakpoint

-- Privileges. Default privileges give closeline_core SELECT, INSERT, UPDATE and DELETE on every new
-- core table; three cases narrow that.
--
-- The directories and organization_state are not under row-level security, so closeline_core gets
-- no privilege on them at all: it could otherwise list every user, Organization and token hash in
-- the Region. The two SECURITY DEFINER lookups below are its only way in, each for one exact key.
-- The SECURITY DEFINER triggers write them, as the owner. (TRUNCATE is not in the defaults.)
REVOKE ALL ON "core"."membership_directory", "core"."invitation_directory", "core"."organization_state" FROM closeline_core;
--> statement-breakpoint
-- An invitation is revoked, never deleted: deleting and re-inserting the same id and token hash
-- would bring a used token back. Deleting an Organization still removes its invitations (the
-- foreign key cascade runs as the table owner).
REVOKE DELETE ON "core"."invitations" FROM closeline_core;
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
-- The counter moves once per row, not once per statement, so one statement that both promotes a
-- member and demotes the sole Owner is refused or allowed depending on the order its rows are
-- processed (promote first, then demote, passes). Opposite-order updates around the lock can also
-- deadlock (40P01). Callers retry on 40001 and 40P01.
-- The rule holds while the Organization is active or suspended. A deleted Organization (kept for
-- retention) may lose every membership, the last Owner included, so a retention job can empty it
-- and free its users to join another Organization.
-- The function is SECURITY DEFINER so the service role needs no UPDATE on `owner_count`. The
-- Organization row is not found when the Organization itself is being deleted (the cascade runs
-- after its row is gone); then the last Owner may go with it.
--
-- Lock order. This trigger takes the Organization's row (a write lock) before anything else the
-- change writes, so it is named to sort before the directory trigger (AFTER row triggers fire in
-- name order). Two Owner inserts therefore queue on the row instead of each taking a share lock and
-- then waiting to upgrade it, and an Owner's removal queues behind a status change on the row
-- before it touches the directory, not after. Nothing but a statement that changes an Owner takes
-- the row, and no other transaction waits on the directory, so these cannot form a cycle. (The
-- accept guard below takes a share lock on the row; a transaction that accepts an invitation and
-- then changes an Owner can still deadlock with another doing the same, so callers retry 40P01.)
CREATE FUNCTION "core"."track_owner_count"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  delta integer := 0;
  target text;
  remaining integer;
  org_status text;
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
    RETURNING "owner_count", "status" INTO remaining, org_status;
  IF FOUND AND delta < 0 AND remaining < 1 AND org_status <> 'deleted' THEN
    RAISE EXCEPTION 'core.last_owner: an Organization must keep at least one Owner'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'organizations_owner_required';
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "memberships_a_track_owner_count" AFTER INSERT OR DELETE OR UPDATE OF "role" ON "core"."memberships"
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

-- A deleted Organization may have been emptied of its Owners; it cannot then become active or
-- suspended again, or the rule above would have an Organization with no Owner in it.
CREATE FUNCTION "core"."refuse_revived_ownerless_organization"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'core.owner_required: an Organization with no Owner cannot leave the deleted status'
    USING ERRCODE = 'check_violation', CONSTRAINT = 'organizations_owner_required';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "organizations_no_ownerless_revival" BEFORE UPDATE OF "status" ON "core"."organizations"
  FOR EACH ROW WHEN (OLD."status" = 'deleted' AND NEW."status" <> 'deleted' AND OLD."owner_count" < 1)
  EXECUTE FUNCTION "core"."refuse_revived_ownerless_organization"();
--> statement-breakpoint

-- An accepted or revoked invitation is final: no statement that sets its state, either timestamp,
-- its id or its token hash is accepted, not even one that repeats the values. So a used token
-- cannot be brought back to life, an invitation cannot be accepted twice, and a used hash cannot be
-- moved off its row (it stays there, so a new invitation cannot be issued with it).
CREATE FUNCTION "core"."refuse_reopened_invitation"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'core.invitation_state_final: an accepted or revoked invitation cannot change state'
    USING ERRCODE = 'check_violation', CONSTRAINT = 'invitations_state_final';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "invitations_state_final" BEFORE UPDATE OF "state", "accepted_at", "revoked_at", "token_hash", "id" ON "core"."invitations"
  FOR EACH ROW WHEN (OLD."state" <> 'pending')
  EXECUTE FUNCTION "core"."refuse_reopened_invitation"();
--> statement-breakpoint

-- The one rule for "expired": an invitation is expired at the instant it expires, not only after
-- it. The lookup and the accept guard below both decide through this function, so they share the
-- boundary, and it is pure so a test can hold the boundary still (the callers pass the clock). A
-- NULL on either side counts as expired. closeline_core may execute it because the guard runs as
-- the caller.
CREATE FUNCTION "core"."has_expired"(p_expires_at timestamp with time zone, p_at timestamp with time zone)
RETURNS boolean LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, pg_temp AS $$
  SELECT COALESCE(p_expires_at <= p_at, true)
$$;
--> statement-breakpoint

-- Accepting an invitation needs it unexpired and its Organization active. The Organization row is
-- locked FOR SHARE so a suspension in flight in another transaction is waited for, not missed
-- (READ COMMITTED then sees the new status; REPEATABLE READ fails to serialise). Expiry is read
-- from the clock when the guard runs, not when the statement began, so an accept that waited for a
-- lock past the expiry is refused. (The lookup uses the statement's start: a sign-in is one
-- statement, and its answer can only be wrong in the safe direction, a moment too long.) An
-- expired invitation can still be revoked. The service accepts and creates the membership in one
-- transaction.
CREATE FUNCTION "core"."refuse_unacceptable_invitation"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  org_status text;
BEGIN
  IF "core"."has_expired"(OLD."expires_at", pg_catalog.clock_timestamp()) THEN
    RAISE EXCEPTION 'core.invitation_expired: an expired invitation cannot be accepted'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'invitations_not_expired';
  END IF;
  SELECT o."status" INTO org_status FROM "core"."organizations" o
    WHERE o."organization_id" = OLD."organization_id" FOR SHARE;
  IF org_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'core.invitation_organization_inactive: an invitation can be accepted only in an active Organization'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'invitations_organization_active';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "invitations_accept_guard" BEFORE UPDATE OF "state" ON "core"."invitations"
  FOR EACH ROW WHEN (OLD."state" = 'pending' AND NEW."state" = 'accepted')
  EXECUTE FUNCTION "core"."refuse_unacceptable_invitation"();
--> statement-breakpoint

-- The directories. Each is a projection kept by AFTER ROW triggers in the statement's own
-- transaction, so a rollback, a savepoint rollback, a cascade or a failed statement undoes both
-- together. The functions are SECURITY DEFINER (they run as the owner, the only role that can write
-- the directories). A key already present is an error, not skipped: drift must be loud. The unique
-- constraint on membership_directory.user_id (one Organization per user) is violated here, by the
-- insert, which is why it can see across Organizations when an index on memberships behind
-- row-level security cannot.
--
-- Both functions run with plan_cache_mode = force_custom_plan: each execution plans its DELETE for the
-- key it has, from the table's size at that moment. By default a plpgsql statement settles on one
-- generic plan after a few runs and keeps it for the life of the connection; a plan built while the
-- directory was small and unanalysed is a sequential scan, and kept while the table grows to
-- 100,000 rows it makes deleting a large Organization quadratic (every member's row delete scans
-- the whole table). The directories also have no index on organization_id alone, which a
-- generic plan could pick (the primary key and the unique constraint both lead with the key).
--
-- A directory row holds no Organization status: that lives in organization_state, one row per
-- Organization, so writing a member or an invitation reads and locks nothing of the Organization's,
-- and a status change writes no directory row (see the lookups, below).
CREATE FUNCTION "core"."sync_membership_directory"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
SET plan_cache_mode = force_custom_plan AS $$
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
-- Named to sort after memberships_a_track_owner_count: the Owner counter locks the Organization's
-- row first (see there).
CREATE TRIGGER "memberships_b_sync_directory" AFTER INSERT OR DELETE OR UPDATE OF "user_id", "organization_id" ON "core"."memberships"
  FOR EACH ROW EXECUTE FUNCTION "core"."sync_membership_directory"();
--> statement-breakpoint
-- Only pending invitations are in the directory: a row leaves it when its invitation is accepted or
-- revoked, so a used token hash is not kept here.
CREATE FUNCTION "core"."sync_invitation_directory"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
SET plan_cache_mode = force_custom_plan AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    DELETE FROM "core"."invitation_directory" WHERE "token_hash" = OLD."token_hash";
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW."state" = 'pending' THEN
    INSERT INTO "core"."invitation_directory"
        ("token_hash", "organization_id", "invitation_id", "expires_at")
      VALUES (NEW."token_hash", NEW."organization_id", NEW."id", NEW."expires_at");
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "invitations_sync_directory" AFTER INSERT OR DELETE OR UPDATE OF "token_hash", "organization_id", "id", "state", "expires_at" ON "core"."invitations"
  FOR EACH ROW EXECUTE FUNCTION "core"."sync_invitation_directory"();
--> statement-breakpoint

-- organization_state: an Organization's status, one row per Organization. Written only here, in the
-- same transaction as the change to organizations, so a status change writes one row however many
-- members and invitations the Organization has (deleting the Organization removes it by the
-- foreign key's cascade). An update that leaves the status as it was writes nothing. A missing row
-- on update is an error, not repaired: drift must be loud.
CREATE FUNCTION "core"."sync_organization_state"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO "core"."organization_state" ("organization_id", "status")
      VALUES (NEW."organization_id", NEW."status");
  ELSE
    UPDATE "core"."organization_state" SET "status" = NEW."status"
      WHERE "organization_id" = NEW."organization_id";
    IF NOT FOUND THEN
      RAISE EXCEPTION 'core.organization_state_missing: the Organization has no status row'
        USING ERRCODE = 'data_exception';
    END IF;
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "organizations_state_insert" AFTER INSERT ON "core"."organizations"
  FOR EACH ROW EXECUTE FUNCTION "core"."sync_organization_state"();
--> statement-breakpoint
CREATE TRIGGER "organizations_state_update" AFTER UPDATE OF "status" ON "core"."organizations"
  FOR EACH ROW WHEN (OLD."status" IS DISTINCT FROM NEW."status")
  EXECUTE FUNCTION "core"."sync_organization_state"();
--> statement-breakpoint

-- TRUNCATE skips every row trigger, so on a table whose triggers keep the directories, the status
-- and the Owner count in step it would leave them drifted. Refused for every role; DELETE the rows
-- instead.
CREATE FUNCTION "core"."refuse_truncate"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'core.truncate_refused: TRUNCATE skips the triggers that keep the directories, the status and the Owner count in step; DELETE the rows instead'
    USING ERRCODE = 'feature_not_supported';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "organizations_no_truncate" BEFORE TRUNCATE ON "core"."organizations"
  FOR EACH STATEMENT EXECUTE FUNCTION "core"."refuse_truncate"();
--> statement-breakpoint
CREATE TRIGGER "memberships_no_truncate" BEFORE TRUNCATE ON "core"."memberships"
  FOR EACH STATEMENT EXECUTE FUNCTION "core"."refuse_truncate"();
--> statement-breakpoint
CREATE TRIGGER "invitations_no_truncate" BEFORE TRUNCATE ON "core"."invitations"
  FOR EACH STATEMENT EXECUTE FUNCTION "core"."refuse_truncate"();
--> statement-breakpoint
CREATE TRIGGER "membership_directory_no_truncate" BEFORE TRUNCATE ON "core"."membership_directory"
  FOR EACH STATEMENT EXECUTE FUNCTION "core"."refuse_truncate"();
--> statement-breakpoint
CREATE TRIGGER "invitation_directory_no_truncate" BEFORE TRUNCATE ON "core"."invitation_directory"
  FOR EACH STATEMENT EXECUTE FUNCTION "core"."refuse_truncate"();
--> statement-breakpoint
CREATE TRIGGER "organization_state_no_truncate" BEFORE TRUNCATE ON "core"."organization_state"
  FOR EACH STATEMENT EXECUTE FUNCTION "core"."refuse_truncate"();
--> statement-breakpoint

-- The two lookups, closeline_core's only way into the directories. Each is STABLE and SECURITY
-- DEFINER, runs with search_path pinned, takes one exact key and returns at most one row (the keys
-- are unique, and organization_state has one row per Organization). They read only the directories
-- and organization_state, which are not under row-level security, so they need no Organization to
-- be set. An Organization with no state row would give no answer: they fail closed.
--
-- Why a status change cannot leave a member looking up as `active`. The status is not copied into
-- the directories; it is read from organization_state at the lookup's own snapshot. A member
-- written concurrently with a suspension therefore has no status of its own to get stale, whatever
-- the isolation level of either writer (READ COMMITTED, REPEATABLE READ or SERIALIZABLE): once
-- both commit, the member's directory row and the suspended state row are both visible to every
-- later lookup. Two status changes are serialised by organizations' row lock (READ COMMITTED
-- waits and re-reads; the stricter levels fail with 40001), and the state row is written in the
-- same transaction, so it is never out of step with organizations.status at any level. No write
-- path needs to refuse an isolation level.
--
-- organization_of_user: the Organization of a user and that Organization's status.
CREATE FUNCTION "core"."organization_of_user"(p_user_id text)
RETURNS TABLE ("organization_id" text, "status" text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT d."organization_id", s."status"
    FROM "core"."membership_directory" d
    JOIN "core"."organization_state" s ON s."organization_id" = d."organization_id"
   WHERE d."user_id" = p_user_id
$$;
--> statement-breakpoint
-- invitation_for_token: the Organization and invitation of a token hash, only while that invitation
-- is pending and unexpired in an active Organization. Anything else, and any unknown token, gives
-- no row, so the caller cannot tell them apart.
CREATE FUNCTION "core"."invitation_for_token"(p_token_hash text)
RETURNS TABLE ("organization_id" text, "invitation_id" text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT d."organization_id", d."invitation_id"
    FROM "core"."invitation_directory" d
    JOIN "core"."organization_state" s ON s."organization_id" = d."organization_id"
   WHERE d."token_hash" = p_token_hash
     AND NOT "core"."has_expired"(d."expires_at", pg_catalog.statement_timestamp())
     AND s."status" = 'active'
$$;
--> statement-breakpoint

-- Functions are executable by PUBLIC unless revoked. Trigger functions are never called directly:
-- nothing but the owner may execute them. The lookups and the pure expiry rule are granted to
-- closeline_core alone.
REVOKE ALL ON FUNCTION "core"."refuse_region_change"(), "core"."start_organization"(), "core"."track_owner_count"(), "core"."require_owner"(), "core"."refuse_revived_ownerless_organization"(), "core"."refuse_reopened_invitation"(), "core"."refuse_unacceptable_invitation"(), "core"."sync_membership_directory"(), "core"."sync_invitation_directory"(), "core"."sync_organization_state"(), "core"."refuse_truncate"(), "core"."has_expired"(timestamp with time zone, timestamp with time zone), "core"."organization_of_user"(text), "core"."invitation_for_token"(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."organization_of_user"(text), "core"."invitation_for_token"(text), "core"."has_expired"(timestamp with time zone, timestamp with time zone) TO closeline_core;
