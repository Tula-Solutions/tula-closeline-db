CREATE TABLE "voice"."line_directory" (
	"number" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"line_id" text NOT NULL,
	"state" text NOT NULL,
	CONSTRAINT "line_directory_number_shape" CHECK ("voice"."line_directory"."number" ~ '^\+[1-9][0-9]{6,14}$'),
	CONSTRAINT "line_directory_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "line_directory_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "line_directory_line_id_shape" CHECK ("line_id" ~ '^line_[0-9a-f]{32}$'),
	CONSTRAINT "line_directory_state_known" CHECK ("voice"."line_directory"."state" in ('porting', 'active'))
);
--> statement-breakpoint
-- Number lookup for the inbound webhook. The webhook knows only the dialled E.164 number, so no
-- Organization is set and row-level security (forced, so even the owner is bound) hides every
-- tenant table. A number is looked up through line_directory, which is not under row-level
-- security and which no service role can touch, by the SECURITY DEFINER function
-- voice.line_for_number, like core.consent_form_for_token.
--
-- Voice cannot read core, so the definer function, which runs as the owner and not as the voice
-- role, reads core.organization_state to answer only for an active Organization. This is a
-- read-only cross-schema read by the owner, the narrowest option. It was chosen over mirroring the
-- status into a voice table because a mirror would need a trigger in core writing into voice's
-- schema, which would break "each service is the only writer to its own schema". The function
-- writes nothing in core, and closeline_voice still holds no privilege on core. A deleted
-- Organization's organization_state row is gone (cascade), so it gives no answer.
--
-- No backfill: the directory is filled by the trigger from here on. The voice schema arrived in
-- the migration just before the previous one and no voice service has run against a deployed
-- database, so no Line exists before this migration. A backfill could not copy one anyway: the
-- migration owner is bound by the forced row-level security on voice.lines and, with no
-- Organization set, reads no row.
REVOKE ALL ON "voice"."line_directory" FROM closeline_voice;
--> statement-breakpoint
-- A bulk emptying of a table skips every row trigger, so on a table whose trigger keeps the
-- directory in step it would leave the numbers of dead Lines open. Refused for every role; remove
-- the rows with a delete instead.
CREATE FUNCTION "voice"."refuse_truncate"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'voice.truncate_refused: TRUNCATE skips the trigger that keeps the line directory in step; delete the rows instead'
    USING ERRCODE = 'feature_not_supported';
END
$$;
--> statement-breakpoint
-- The directory holds only Lines that are not released, so a released Line's number is free for
-- any Organization to take. A row follows its Line's insert, update and removal. A renumbered Line
-- loses its old number. The old row is removed only when it is this Line's own: a released Line's
-- number may already belong to another Organization.
CREATE FUNCTION "voice"."sync_line_directory"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    DELETE FROM "voice"."line_directory"
     WHERE "number" = OLD."number"
       AND "organization_id" = OLD."organization_id"
       AND "line_id" = OLD."id";
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW."state" <> 'released' THEN
    INSERT INTO "voice"."line_directory" ("number", "organization_id", "line_id", "state")
      VALUES (NEW."number", NEW."organization_id", NEW."id", NEW."state");
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "lines_sync_directory"
  AFTER INSERT OR DELETE OR UPDATE OF "number", "organization_id", "id", "state" ON "voice"."lines"
  FOR EACH ROW EXECUTE FUNCTION "voice"."sync_line_directory"();
--> statement-breakpoint
CREATE TRIGGER "lines_no_truncate" BEFORE TRUNCATE ON "voice"."lines"
  FOR EACH STATEMENT EXECUTE FUNCTION "voice"."refuse_truncate"();
--> statement-breakpoint
CREATE TRIGGER "line_directory_no_truncate" BEFORE TRUNCATE ON "voice"."line_directory"
  FOR EACH STATEMENT EXECUTE FUNCTION "voice"."refuse_truncate"();
--> statement-breakpoint
-- line_for_number: the Organization and Line a dialled number reaches, only for an active Line of
-- an active Organization. A Line still porting, a released one, an unknown or malformed number and
-- a Line of a suspended or deleted Organization give no row, so the caller cannot tell them apart.
-- The number is matched as an exact key through the primary key index; no pattern is possible.
CREATE FUNCTION "voice"."line_for_number"(p_number text)
RETURNS TABLE ("organization_id" text, "line_id" text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT d."organization_id", d."line_id"
    FROM "voice"."line_directory" d
    JOIN "core"."organization_state" s ON s."organization_id" = d."organization_id"
   WHERE d."number" = p_number
     AND d."state" = 'active'
     AND s."status" = 'active'
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "voice"."refuse_truncate"(), "voice"."sync_line_directory"(), "voice"."line_for_number"(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "voice"."line_for_number"(text) TO closeline_voice;
