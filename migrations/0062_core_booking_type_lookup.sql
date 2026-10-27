CREATE TABLE "core"."booking_type_directory" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"booking_type_id" text NOT NULL,
	CONSTRAINT "booking_type_directory_token_hash_shape" CHECK ("core"."booking_type_directory"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "booking_type_directory_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "booking_type_directory_booking_type_id_shape" CHECK ("booking_type_id" ~ '^bkt_[0-9a-f]{32}$')
);

--> statement-breakpoint
-- Token lookup for the public booking routes. They receive only a token, so no Organization is set
-- and row-level security hides core.booking_types. The directory holds one row per ACTIVE Booking
-- Type that has a public link, keyed by the token's SHA-256 hash; no service role can touch it.
-- Retiring a type, clearing or rotating its hash, or deleting it removes the row. No backfill: booking_types is
-- forced under row-level security, so a seed here would read zero rows; core's public routes
-- (#219) do not exist yet, so no link is live and the trigger fills the directory from here on.
REVOKE ALL ON "core"."booking_type_directory" FROM closeline_core;
--> statement-breakpoint
CREATE FUNCTION "core"."sync_booking_type_directory"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD."public_token_hash" IS NOT NULL THEN
    DELETE FROM "core"."booking_type_directory" WHERE "token_hash" = OLD."public_token_hash";
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW."public_token_hash" IS NOT NULL AND NEW."active" THEN
    INSERT INTO "core"."booking_type_directory" ("token_hash", "organization_id", "booking_type_id")
      VALUES (NEW."public_token_hash", NEW."organization_id", NEW."id");
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "booking_type_sync_directory"
  AFTER INSERT OR DELETE OR UPDATE OF "public_token_hash", "organization_id", "id", "active" ON "core"."booking_types"
  FOR EACH ROW EXECUTE FUNCTION "core"."sync_booking_type_directory"();
--> statement-breakpoint
-- A bulk emptying skips the row trigger and would leave links of dead types open.
CREATE TRIGGER "booking_types_no_truncate" BEFORE TRUNCATE ON "core"."booking_types"
  FOR EACH STATEMENT EXECUTE FUNCTION "core"."refuse_truncate"();
--> statement-breakpoint
CREATE TRIGGER "booking_type_directory_no_truncate" BEFORE TRUNCATE ON "core"."booking_type_directory"
  FOR EACH STATEMENT EXECUTE FUNCTION "core"."refuse_truncate"();
--> statement-breakpoint
-- booking_type_for_token: the Organization and id of the active Booking Type a token hash opens,
-- only in an active Organization. A retired type, an unknown, cleared or rotated hash and a type
-- of a suspended or deleted Organization give no row and cannot be told apart. Exact key match
-- through the primary key; no token, name or other column is returned.
CREATE FUNCTION "core"."booking_type_for_token"(p_token_hash text)
RETURNS TABLE ("organization_id" text, "booking_type_id" text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT d."organization_id", d."booking_type_id"
    FROM "core"."booking_type_directory" d
    JOIN "core"."organization_state" s ON s."organization_id" = d."organization_id"
   WHERE d."token_hash" = p_token_hash
     AND s."status" = 'active'
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "core"."sync_booking_type_directory"(), "core"."booking_type_for_token"(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."booking_type_for_token"(text) TO closeline_core;
