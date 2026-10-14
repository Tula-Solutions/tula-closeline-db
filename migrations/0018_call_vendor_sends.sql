-- Hand-written, first: the bound of 20 sends is new in this migration. A Call counted past it would make
-- the CHECK below fail, and capping its count would silently drop the record of sends 21 and beyond,
-- whose copies at the vendor the purge would then never list. So the migration refuses and a person decides.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "playbook"."calls" WHERE "vendor_send_seq" > 20;
  IF n > 0 THEN
    RAISE EXCEPTION 'playbook.calls: % Call(s) have more than 20 vendor sends; resolve them before migration 0018', n
      USING ERRCODE = 'check_violation';
  END IF;
END
$$;
--> statement-breakpoint
CREATE TABLE "playbook"."call_vendor_sends" (
	"organization_id" text NOT NULL,
	"call_id" text NOT NULL,
	"seq" integer NOT NULL,
	"vendor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_at" timestamp with time zone,
	CONSTRAINT "call_vendor_sends_pkey" PRIMARY KEY("organization_id","call_id","seq"),
	CONSTRAINT "call_vendor_sends_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "call_vendor_sends_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "call_vendor_sends_seq_bounds" CHECK ("playbook"."call_vendor_sends"."seq" between 1 and 20),
	CONSTRAINT "call_vendor_sends_vendor_id_shape" CHECK ("vendor_id" is null or "vendor_id" ~ '^[A-Za-z0-9._:-]{1,128}$'),
	CONSTRAINT "call_vendor_sends_recorded_matches" CHECK (("playbook"."call_vendor_sends"."vendor_id" is null) = ("playbook"."call_vendor_sends"."recorded_at" is null))
);
--> statement-breakpoint
ALTER TABLE "playbook"."call_vendor_sends" ADD CONSTRAINT "call_vendor_sends_call_fk" FOREIGN KEY ("organization_id","call_id") REFERENCES "playbook"."calls"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "call_vendor_sends_org_vendor_id_key" ON "playbook"."call_vendor_sends" USING btree ("organization_id","vendor_id") WHERE "playbook"."call_vendor_sends"."vendor_id" is not null;--> statement-breakpoint
ALTER TABLE "playbook"."calls" ADD CONSTRAINT "calls_vendor_send_seq_max" CHECK ("playbook"."calls"."vendor_send_seq" <= 20);
--> statement-breakpoint

-- Everything below is hand-written (Drizzle cannot express it), appended after the generated SQL
-- as 0009 to 0016 do. Run as closeline_owner.
--
-- 0018 records the transcription vendor's id of each send of a Recording (hub issue 79).

-- Calls that were sent before this migration get one row per counted send, with no id.
INSERT INTO "playbook"."call_vendor_sends" ("organization_id", "call_id", "seq")
SELECT c."organization_id", c."id", g.n
FROM "playbook"."calls" c, generate_series(1, c."vendor_send_seq") AS g(n);
--> statement-breakpoint

ALTER TABLE "playbook"."call_vendor_sends" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "playbook"."call_vendor_sends" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "call_vendor_sends_tenant_isolation" ON "playbook"."call_vendor_sends" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint

-- Privileges, as for call_jobs: the role inserts a row when a send is counted and sets its id once;
-- it never deletes (the purge deletes the Call and the key cascades) and never changes the key.
REVOKE UPDATE, DELETE ON "playbook"."call_vendor_sends" FROM closeline_playbook;
--> statement-breakpoint
GRANT UPDATE ("vendor_id", "recorded_at") ON "playbook"."call_vendor_sends" TO closeline_playbook;
--> statement-breakpoint

-- A recorded id is final: it never changes to another, and a send's key never changes. The message
-- carries no value, so no vendor id reaches an error.
CREATE FUNCTION "playbook"."refuse_vendor_send_change"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'playbook.call_vendor_send: a recorded vendor id and a send''s key never change'
    USING ERRCODE = 'check_violation', CONSTRAINT = 'call_vendor_sends_identity';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "call_vendor_sends_identity" BEFORE UPDATE ON "playbook"."call_vendor_sends"
  FOR EACH ROW WHEN (
    (OLD."vendor_id" IS NOT NULL AND NEW."vendor_id" IS DISTINCT FROM OLD."vendor_id")
    OR OLD."organization_id" IS DISTINCT FROM NEW."organization_id"
    OR OLD."call_id" IS DISTINCT FROM NEW."call_id"
    OR OLD."seq" IS DISTINCT FROM NEW."seq")
  EXECUTE FUNCTION "playbook"."refuse_vendor_send_change"();
--> statement-breakpoint
REVOKE ALL ON FUNCTION "playbook"."refuse_vendor_send_change"() FROM PUBLIC;
