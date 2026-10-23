CREATE TABLE "voice"."twilio_calls" (
	"organization_id" text NOT NULL,
	"provider_call_id" text NOT NULL,
	"call_id" text,
	"direction" text NOT NULL,
	"disclosure_wording_version" integer,
	"disclosure_ai_assisted" boolean,
	"disclosure_played_at" timestamp with time zone,
	"disclosure_started" boolean DEFAULT false NOT NULL,
	"bridged_to" text,
	"ring_identities" text[] DEFAULT '{}'::text[] NOT NULL,
	"recording_id" text,
	"stream_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "twilio_calls_pkey" PRIMARY KEY("organization_id","provider_call_id"),
	CONSTRAINT "twilio_calls_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "twilio_calls_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "twilio_calls_provider_call_id_shape" CHECK (char_length("provider_call_id") between 1 and 128 and "provider_call_id" collate "C" ~ '^[A-Za-z0-9._:-]+$'),
	CONSTRAINT "twilio_calls_call_id_shape" CHECK ("call_id" ~ '^call_[0-9a-f]{32}$'),
	CONSTRAINT "twilio_calls_bridged_to_shape" CHECK ("bridged_to" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "twilio_calls_direction_known" CHECK ("voice"."twilio_calls"."direction" in ('inbound', 'outbound')),
	CONSTRAINT "twilio_calls_disclosure_all_or_none" CHECK (("voice"."twilio_calls"."disclosure_wording_version" is null) = ("voice"."twilio_calls"."disclosure_ai_assisted" is null)
        and ("voice"."twilio_calls"."disclosure_wording_version" is null) = ("voice"."twilio_calls"."disclosure_played_at" is null)
        and ("voice"."twilio_calls"."disclosure_wording_version" is null or "voice"."twilio_calls"."disclosure_wording_version" >= 1)),
	CONSTRAINT "twilio_calls_ring_identities_bounds" CHECK (coalesce(cardinality("voice"."twilio_calls"."ring_identities"), 0) <= 100
        and array_position("voice"."twilio_calls"."ring_identities", null) is null
        and array_to_string("voice"."twilio_calls"."ring_identities", ',') ~ '^(mem_[0-9a-f]{32}(,mem_[0-9a-f]{32})*)?$'),
	CONSTRAINT "twilio_calls_recording_id_shape" CHECK ("voice"."twilio_calls"."recording_id" is null or (char_length("recording_id") between 1 and 128)),
	CONSTRAINT "twilio_calls_stream_id_shape" CHECK ("voice"."twilio_calls"."stream_id" is null or (char_length("stream_id") between 1 and 128)),
	CONSTRAINT "twilio_calls_expires_after_creation" CHECK ("voice"."twilio_calls"."expires_at" > "voice"."twilio_calls"."created_at")
);
--> statement-breakpoint
CREATE TABLE "voice"."twilio_directory" (
	"kind" text NOT NULL,
	"ref_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"provider_call_id" text NOT NULL,
	CONSTRAINT "twilio_directory_pkey" PRIMARY KEY("kind","ref_id"),
	CONSTRAINT "twilio_directory_kind_known" CHECK ("voice"."twilio_directory"."kind" in ('call', 'recording')),
	CONSTRAINT "twilio_directory_ref_id_shape" CHECK (char_length("ref_id") between 1 and 128 and "ref_id" collate "C" ~ '^[A-Za-z0-9._:-]+$'),
	CONSTRAINT "twilio_directory_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "twilio_directory_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "twilio_directory_provider_call_id_shape" CHECK (char_length("provider_call_id") between 1 and 128 and "provider_call_id" collate "C" ~ '^[A-Za-z0-9._:-]+$')
);
--> statement-breakpoint
CREATE TABLE "voice"."twilio_placements" (
	"organization_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_call_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "twilio_placements_pkey" PRIMARY KEY("organization_id","idempotency_key"),
	CONSTRAINT "twilio_placements_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "twilio_placements_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "twilio_placements_idempotency_key_shape" CHECK (char_length("voice"."twilio_placements"."idempotency_key") between 1 and 255),
	CONSTRAINT "twilio_placements_provider_call_id_shape" CHECK (char_length("provider_call_id") between 1 and 128 and "provider_call_id" collate "C" ~ '^[A-Za-z0-9._:-]+$'),
	CONSTRAINT "twilio_placements_fingerprint_shape" CHECK (char_length("voice"."twilio_placements"."fingerprint") between 1 and 128),
	CONSTRAINT "twilio_placements_expires_after_creation" CHECK ("voice"."twilio_placements"."expires_at" > "voice"."twilio_placements"."created_at")
);
--> statement-breakpoint
CREATE TABLE "voice"."twilio_recordings" (
	"organization_id" text NOT NULL,
	"recording_id" text NOT NULL,
	"provider_call_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "twilio_recordings_pkey" PRIMARY KEY("organization_id","recording_id"),
	CONSTRAINT "twilio_recordings_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "twilio_recordings_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "twilio_recordings_recording_id_shape" CHECK (char_length("recording_id") between 1 and 128 and "recording_id" collate "C" ~ '^[A-Za-z0-9._:-]+$'),
	CONSTRAINT "twilio_recordings_provider_call_id_shape" CHECK (char_length("provider_call_id") between 1 and 128 and "provider_call_id" collate "C" ~ '^[A-Za-z0-9._:-]+$')
);
--> statement-breakpoint
ALTER TABLE "voice"."twilio_recordings" ADD CONSTRAINT "twilio_recordings_call_fk" FOREIGN KEY ("organization_id","provider_call_id") REFERENCES "voice"."twilio_calls"("organization_id","provider_call_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "twilio_calls_purge_idx" ON "voice"."twilio_calls" USING btree ("organization_id","expires_at");--> statement-breakpoint
CREATE INDEX "twilio_placements_purge_idx" ON "voice"."twilio_placements" USING btree ("organization_id","expires_at");--> statement-breakpoint
CREATE INDEX "twilio_recordings_call_idx" ON "voice"."twilio_recordings" USING btree ("organization_id","provider_call_id");
--> statement-breakpoint
-- Everything below is hand-written (Drizzle cannot express it), appended after the generated SQL
-- as 0036 does. Run as closeline_owner.

-- Row-level security: the one canonical fail-closed policy on each tenant table, written by
-- tenantRlsStatements. twilio_directory is deliberately not among them (see below).
ALTER TABLE "voice"."twilio_calls" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."twilio_calls" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "twilio_calls_tenant_isolation" ON "voice"."twilio_calls" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "voice"."twilio_recordings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."twilio_recordings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "twilio_recordings_tenant_isolation" ON "voice"."twilio_recordings" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "voice"."twilio_placements" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "voice"."twilio_placements" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "twilio_placements_tenant_isolation" ON "voice"."twilio_placements" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint

-- Privileges. The schema defaults give closeline_voice SELECT, INSERT, UPDATE and DELETE (no
-- TRUNCATE). A Recording row and a placement are written once and removed by the purge, so UPDATE
-- is taken away; twilio_calls keeps UPDATE (the adapter rewrites a call's record as it goes).
REVOKE UPDATE ON "voice"."twilio_recordings", "voice"."twilio_placements" FROM closeline_voice;
--> statement-breakpoint

-- The call's identity never changes: the Organization and provider call id are what the directory
-- and every foreign key hang on, so a rewrite of either is refused.
CREATE FUNCTION "voice"."refuse_twilio_call_identity_change"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'voice.twilio_call_identity: the Organization and provider call id of a record never change'
    USING ERRCODE = 'check_violation', CONSTRAINT = 'twilio_calls_identity';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "twilio_calls_identity" BEFORE UPDATE ON "voice"."twilio_calls"
  FOR EACH ROW WHEN (
    ROW(OLD."organization_id", OLD."provider_call_id")
    IS DISTINCT FROM ROW(NEW."organization_id", NEW."provider_call_id"))
  EXECUTE FUNCTION "voice"."refuse_twilio_call_identity_change"();
--> statement-breakpoint

-- The directory: who owns a provider call or a Recording, asked before the Organization is known.
-- Like voice.line_directory it is under no row-level security and no service role holds any
-- privilege on it; the only way in is voice.twilio_owner. Triggers (SECURITY DEFINER, running as
-- the owner) keep it in step with the two tenant tables in the same transaction. A provider id
-- already held by another Organization is a unique violation on twilio_directory_pkey, which
-- refuses the insert into the tenant table too, so one Organization can never claim, or shadow,
-- another's call or Recording.
REVOKE ALL ON "voice"."twilio_directory" FROM closeline_voice;
--> statement-breakpoint
CREATE FUNCTION "voice"."sync_twilio_call_directory"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO "voice"."twilio_directory" ("kind", "ref_id", "organization_id", "provider_call_id")
      VALUES ('call', NEW."provider_call_id", NEW."organization_id", NEW."provider_call_id");
  ELSE
    DELETE FROM "voice"."twilio_directory"
     WHERE "kind" = 'call'
       AND "ref_id" = OLD."provider_call_id"
       AND "organization_id" = OLD."organization_id";
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE FUNCTION "voice"."sync_twilio_recording_directory"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO "voice"."twilio_directory" ("kind", "ref_id", "organization_id", "provider_call_id")
      VALUES ('recording', NEW."recording_id", NEW."organization_id", NEW."provider_call_id");
  ELSE
    DELETE FROM "voice"."twilio_directory"
     WHERE "kind" = 'recording'
       AND "ref_id" = OLD."recording_id"
       AND "organization_id" = OLD."organization_id";
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "twilio_calls_sync_directory" AFTER INSERT OR DELETE ON "voice"."twilio_calls"
  FOR EACH ROW EXECUTE FUNCTION "voice"."sync_twilio_call_directory"();
--> statement-breakpoint
CREATE TRIGGER "twilio_recordings_sync_directory" AFTER INSERT OR DELETE ON "voice"."twilio_recordings"
  FOR EACH ROW EXECUTE FUNCTION "voice"."sync_twilio_recording_directory"();
--> statement-breakpoint
-- A bulk emptying skips every row trigger and would leave the directory out of step.
CREATE FUNCTION "voice"."refuse_twilio_truncate"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'voice.truncate_refused: TRUNCATE skips the trigger that keeps the Twilio directory in step; delete the rows instead'
    USING ERRCODE = 'feature_not_supported';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "twilio_calls_no_truncate" BEFORE TRUNCATE ON "voice"."twilio_calls"
  FOR EACH STATEMENT EXECUTE FUNCTION "voice"."refuse_twilio_truncate"();
--> statement-breakpoint
CREATE TRIGGER "twilio_recordings_no_truncate" BEFORE TRUNCATE ON "voice"."twilio_recordings"
  FOR EACH STATEMENT EXECUTE FUNCTION "voice"."refuse_twilio_truncate"();
--> statement-breakpoint
CREATE TRIGGER "twilio_directory_no_truncate" BEFORE TRUNCATE ON "voice"."twilio_directory"
  FOR EACH STATEMENT EXECUTE FUNCTION "voice"."refuse_twilio_truncate"();
--> statement-breakpoint
-- twilio_owner: the Organization and provider call that own a provider call ('call') or a
-- Recording ('recording'), by exact key through the primary key. An unknown id or kind gives no row.
CREATE FUNCTION "voice"."twilio_owner"(p_kind text, p_id text)
RETURNS TABLE ("organization_id" text, "provider_call_id" text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT d."organization_id", d."provider_call_id"
    FROM "voice"."twilio_directory" d
   WHERE d."kind" = p_kind
     AND d."ref_id" = p_id
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "voice"."refuse_twilio_call_identity_change"(), "voice"."sync_twilio_call_directory"(), "voice"."sync_twilio_recording_directory"(), "voice"."refuse_twilio_truncate"(), "voice"."twilio_owner"(text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "voice"."twilio_owner"(text, text) TO closeline_voice;
