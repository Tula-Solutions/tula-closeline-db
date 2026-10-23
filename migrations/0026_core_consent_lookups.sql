CREATE TABLE "core"."consent_form_directory" (
	"token" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"form_id" text NOT NULL,
	"wording_id" text NOT NULL,
	"state" text NOT NULL,
	CONSTRAINT "consent_form_directory_token_shape" CHECK (char_length("core"."consent_form_directory"."token") between 22 and 256 and "core"."consent_form_directory"."token" collate "C" ~ '^[A-Za-z0-9_-]+$'),
	CONSTRAINT "consent_form_directory_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "consent_form_directory_form_id_shape" CHECK ("form_id" ~ '^cfm_[0-9a-f]{32}$'),
	CONSTRAINT "consent_form_directory_wording_id_shape" CHECK ("wording_id" ~ '^cwd_[0-9a-f]{32}$'),
	CONSTRAINT "consent_form_directory_state_known" CHECK ("core"."consent_form_directory"."state" in ('published', 'closed'))
);
--> statement-breakpoint
-- Token lookups for the public consent routes (M03-T7, M03-T8). Those routes receive only a token,
-- so no Organization is set and row-level security (forced, so even the owner is bound) hides every
-- tenant table. A hosted-form token is looked up through consent_form_directory, which is not under
-- row-level security and which no service role can touch, by the SECURITY DEFINER function
-- core.consent_form_for_token, exactly like invitation_for_token.
--
-- No backfill: the directory is filled by the trigger from here on. Core has no publish route yet
-- (M03-T8), so no published form with a token exists before this migration.
--
-- One-click unsubscribe needs no lookup and no table: the spec (M03, "signed token") makes the
-- unsubscribe token an HMAC-signed value that carries the Organization, so core verifies it and
-- then opens withOrganization. Nothing about it is stored.
--
-- The form token is stored as is (not hashed): it is the form's public URL, which the Admin copies
-- from the portal, so core must be able to show it again. A stored hash could not be shown.
REVOKE ALL ON "core"."consent_form_directory" FROM closeline_core;
--> statement-breakpoint
-- Only forms with a token are in the directory, so a draft never is. A row follows its form's
-- insert, update, delete and the Organization's cascade. An unpublished form has no token to
-- remove; one whose token changed has its old token removed.
CREATE FUNCTION "core"."sync_consent_form_directory"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD."token" IS NOT NULL THEN
    DELETE FROM "core"."consent_form_directory" WHERE "token" = OLD."token";
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW."token" IS NOT NULL THEN
    INSERT INTO "core"."consent_form_directory"
        ("token", "organization_id", "form_id", "wording_id", "state")
      VALUES (NEW."token", NEW."organization_id", NEW."id", NEW."wording_id", NEW."state");
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "consent_form_sync_directory"
  AFTER INSERT OR DELETE OR UPDATE OF "token", "organization_id", "id", "wording_id", "state" ON "core"."consent_form"
  FOR EACH ROW EXECUTE FUNCTION "core"."sync_consent_form_directory"();
--> statement-breakpoint
-- TRUNCATE skips the row trigger and would leave tokens of dead forms open.
CREATE TRIGGER "consent_form_no_truncate" BEFORE TRUNCATE ON "core"."consent_form"
  FOR EACH STATEMENT EXECUTE FUNCTION "core"."refuse_truncate"();
--> statement-breakpoint
CREATE TRIGGER "consent_form_directory_no_truncate" BEFORE TRUNCATE ON "core"."consent_form_directory"
  FOR EACH STATEMENT EXECUTE FUNCTION "core"."refuse_truncate"();
--> statement-breakpoint
-- consent_form_for_token: the Organization, form, wording and state of a hosted-form token, only
-- for a published or closed form of an active Organization. A draft has no token; an unknown
-- token, a malformed one and a form of a suspended or deleted Organization give no row, so the
-- caller cannot tell them apart. A closed form still answers (state 'closed') so the page can say
-- so. The token is matched as an exact key through the primary key index; nothing is computed on
-- it, and it is a high-entropy credential that is never a pattern.
CREATE FUNCTION "core"."consent_form_for_token"(p_token text)
RETURNS TABLE ("organization_id" text, "form_id" text, "wording_id" text, "state" text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT d."organization_id", d."form_id", d."wording_id", d."state"
    FROM "core"."consent_form_directory" d
    JOIN "core"."organization_state" s ON s."organization_id" = d."organization_id"
   WHERE d."token" = p_token
     AND s."status" = 'active'
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "core"."sync_consent_form_directory"(), "core"."consent_form_for_token"(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."consent_form_for_token"(text) TO closeline_core;
