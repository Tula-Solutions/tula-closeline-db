-- A Deal's closing date is a calendar date (hub #90). The generated statement alone would convert with
-- the session's time zone; the conversion is made through UTC explicitly, so it does not depend on the
-- role's, database's or server's TimeZone. A closing instant becomes the date it falls on in UTC (so
-- 2026-01-31T23:00:00-05:00, which is 04:00 UTC on 1 February, becomes 2026-02-01).
--
-- The one thing that holds the column is the deals_identity_final trigger (its WHEN clause names
-- closed_at, and Postgres refuses to change the type of a column a trigger definition uses): it is
-- dropped, and recreated below exactly as 0015 defined it (IS DISTINCT FROM works on dates). No index,
-- check or view uses the column (deal_import_rows keeps no closing date) and the column grant stays.
-- Both statements run in the migration's transaction under the table's exclusive lock, so no update
-- can run without the trigger. The type change rewrites the table
-- as the owner; a rewrite is not filtered by row-level security, so forced row-level security is not
-- lifted here (the migration test checks that it is still forced, and that every row converted).
DROP TRIGGER "deals_identity_final" ON "playbook"."deals";--> statement-breakpoint
ALTER TABLE "playbook"."deals" ALTER COLUMN "closed_at" SET DATA TYPE date USING ("closed_at" AT TIME ZONE 'UTC')::date;--> statement-breakpoint
CREATE TRIGGER "deals_identity_final" BEFORE UPDATE ON "playbook"."deals"
  FOR EACH ROW WHEN (
    ROW(OLD."id", OLD."organization_id", OLD."deal_id", OLD."created_at")
      IS DISTINCT FROM ROW(NEW."id", NEW."organization_id", NEW."deal_id", NEW."created_at")
    OR NEW."outcome_seq" <> OLD."outcome_seq" + (CASE WHEN NEW."outcome" IS DISTINCT FROM OLD."outcome" OR NEW."closed_at" IS DISTINCT FROM OLD."closed_at" THEN 1 ELSE 0 END))
  EXECUTE FUNCTION "playbook"."refuse_deal_change"();