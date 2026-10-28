CREATE TABLE "core"."booking_manage_directory" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"booking_id" text NOT NULL,
	CONSTRAINT "booking_manage_directory_token_hash_shape" CHECK ("core"."booking_manage_directory"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "booking_manage_directory_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "booking_manage_directory_booking_id_shape" CHECK ("booking_id" ~ '^bkg_[0-9a-f]{32}$')
);
--> statement-breakpoint
ALTER TABLE "core"."bookings" ADD COLUMN "manage_token_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_manage_token_key" ON "core"."bookings" USING btree ("manage_token_hash");--> statement-breakpoint
ALTER TABLE "core"."bookings" ADD CONSTRAINT "bookings_manage_token_hash_shape" CHECK ("core"."bookings"."manage_token_hash" is null or "core"."bookings"."manage_token_hash" ~ '^[0-9a-f]{64}$');
--> statement-breakpoint
-- Token lookup for the public cancel and reschedule routes. They receive only a manage token, so no
-- Organization is set and row-level security hides core.bookings. The directory holds one row per
-- Booking that has a manage token, keyed by the token's SHA-256 hash, whatever the Booking's status
-- (core decides what a cancelled Booking allows); no service role can touch it. Clearing or rotating
-- the hash, or deleting the Booking, removes the row.
-- No backfill: no existing Booking has a manage token, so the directory starts empty and forcing
-- row-level security on core.bookings stays on.
REVOKE ALL ON "core"."booking_manage_directory" FROM closeline_core;
--> statement-breakpoint
CREATE FUNCTION "core"."sync_booking_manage_directory"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD."manage_token_hash" IS NOT NULL THEN
    DELETE FROM "core"."booking_manage_directory" WHERE "token_hash" = OLD."manage_token_hash";
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW."manage_token_hash" IS NOT NULL THEN
    INSERT INTO "core"."booking_manage_directory" ("token_hash", "organization_id", "booking_id")
      VALUES (NEW."manage_token_hash", NEW."organization_id", NEW."id");
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "booking_sync_manage_directory"
  AFTER INSERT OR DELETE OR UPDATE OF "manage_token_hash", "organization_id", "id" ON "core"."bookings"
  FOR EACH ROW EXECUTE FUNCTION "core"."sync_booking_manage_directory"();
--> statement-breakpoint
-- A bulk emptying skips the row trigger and would leave manage links of dead Bookings open.
CREATE TRIGGER "bookings_no_truncate" BEFORE TRUNCATE ON "core"."bookings"
  FOR EACH STATEMENT EXECUTE FUNCTION "core"."refuse_truncate"();
--> statement-breakpoint
CREATE TRIGGER "booking_manage_directory_no_truncate" BEFORE TRUNCATE ON "core"."booking_manage_directory"
  FOR EACH STATEMENT EXECUTE FUNCTION "core"."refuse_truncate"();
--> statement-breakpoint
-- booking_for_manage_token: the Organization and id of the Booking a manage token hash opens, only
-- in an active Organization. An unknown, cleared or rotated hash, a deleted Booking and a Booking of
-- a suspended or deleted Organization give no row and cannot be told apart. Exact key match through
-- the primary key; no token or other column is returned.
CREATE FUNCTION "core"."booking_for_manage_token"(p_token_hash text)
RETURNS TABLE ("organization_id" text, "booking_id" text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT d."organization_id", d."booking_id"
    FROM "core"."booking_manage_directory" d
    JOIN "core"."organization_state" s ON s."organization_id" = d."organization_id"
   WHERE d."token_hash" = p_token_hash
     AND s."status" = 'active'
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "core"."sync_booking_manage_directory"(), "core"."booking_for_manage_token"(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."booking_for_manage_token"(text) TO closeline_core;
