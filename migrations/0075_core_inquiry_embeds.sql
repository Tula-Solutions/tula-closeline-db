CREATE TABLE "core"."inquiry_embeds" (
	"organization_id" text NOT NULL,
	"publishable_key" text NOT NULL,
	"publishable_key_hash" text NOT NULL,
	"allowed_origins" text[] NOT NULL,
	"consent_wording_id" text,
	"consent_wording_version" integer,
	"consent_wording_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiry_embeds_pkey" PRIMARY KEY("organization_id"),
	CONSTRAINT "inquiry_embeds_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "inquiry_embeds_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "inquiry_embeds_key_shape" CHECK ("core"."inquiry_embeds"."publishable_key" ~ '^[A-Za-z0-9_-]{32,64}$'),
	CONSTRAINT "inquiry_embeds_key_hash_shape" CHECK ("core"."inquiry_embeds"."publishable_key_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "inquiry_embeds_origins_bounds" CHECK (cardinality("core"."inquiry_embeds"."allowed_origins") between 0 and 20),
	CONSTRAINT "inquiry_embeds_wording_all_or_none" CHECK (("core"."inquiry_embeds"."consent_wording_id" is null) = ("core"."inquiry_embeds"."consent_wording_version" is null) and ("core"."inquiry_embeds"."consent_wording_id" is null) = ("core"."inquiry_embeds"."consent_wording_text" is null)),
	CONSTRAINT "inquiry_embeds_wording_id_shape" CHECK ("core"."inquiry_embeds"."consent_wording_id" is null or "core"."inquiry_embeds"."consent_wording_id" ~ '^cwd_[0-9a-f]{32}$'),
	CONSTRAINT "inquiry_embeds_wording_version" CHECK ("core"."inquiry_embeds"."consent_wording_version" >= 1),
	CONSTRAINT "inquiry_embeds_wording_text_shape" CHECK (char_length("core"."inquiry_embeds"."consent_wording_text") between 1 and 5000)
);
--> statement-breakpoint
ALTER TABLE "core"."inquiry_embeds" ADD CONSTRAINT "inquiry_embeds_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."inquiry_embeds" ADD CONSTRAINT "inquiry_embeds_wording_fk" FOREIGN KEY ("organization_id","consent_wording_id") REFERENCES "core"."consent_wording"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inquiry_embeds_key_hash_key" ON "core"."inquiry_embeds" USING btree ("publishable_key_hash");
--> statement-breakpoint
ALTER TABLE "core"."inquiry_embeds" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."inquiry_embeds" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "inquiry_embeds_tenant_isolation" ON "core"."inquiry_embeds" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
-- inquiry_embed_for_key_hash: the Organization, allowed origins and consent wording of the embed a
-- publishable key hash opens. The public Inquiry route receives only the key, so no Organization is
-- set and row-level security hides core.inquiry_embeds. Exact match through the unique index; an
-- unknown or malformed hash gives no row, and so does an embed that is not live (no allowed origin
-- or no wording yet). Core checks the Organization's status itself afterwards. At most one row, and
-- no key, key hash or timestamp is returned. Owned by the existing key-lookup definer role, which
-- gets column SELECT on the columns it reads only.
GRANT SELECT ("organization_id", "publishable_key_hash", "allowed_origins", "consent_wording_version", "consent_wording_text") ON "core"."inquiry_embeds" TO closeline_core_key_lookup;
--> statement-breakpoint
CREATE FUNCTION "core"."inquiry_embed_for_key_hash"(p_key_hash text)
RETURNS TABLE ("organization_id" text, "allowed_origins" text[], "consent_wording_version" integer, "consent_wording_text" text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT e."organization_id", e."allowed_origins", e."consent_wording_version", e."consent_wording_text"
    FROM "core"."inquiry_embeds" e
   WHERE e."publishable_key_hash" = p_key_hash
     AND cardinality(e."allowed_origins") > 0
     AND e."consent_wording_text" IS NOT NULL
   LIMIT 1
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "core"."inquiry_embed_for_key_hash"(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."inquiry_embed_for_key_hash"(text) TO closeline_core;
--> statement-breakpoint
GRANT CREATE ON SCHEMA "core" TO closeline_core_key_lookup;
--> statement-breakpoint
ALTER FUNCTION "core"."inquiry_embed_for_key_hash"(text) OWNER TO closeline_core_key_lookup;
--> statement-breakpoint
REVOKE CREATE ON SCHEMA "core" FROM closeline_core_key_lookup;
--> statement-breakpoint
-- voice.orgs_with_due_callbacks: up to p_limit distinct Organization ids (ascending, strictly after
-- p_after; null starts from the beginning; cut to 500; a null or smaller-than-one limit gives no row;
-- page by passing the last id back as p_after, as orgs_with_stale_ringing does) that hold an Inquiry whose callback is due now: still
-- 'pending', or 'no_answer' with a retry time that has passed. Ids only. Owned by the existing
-- purge-scan definer role, which gets SELECT on three columns of voice.inquiries. The origins CHECK
-- on core.inquiry_embeds bounds only the count; core validates each origin at its edge.
GRANT SELECT ("organization_id", "callback_state", "callback_next_attempt_at") ON "voice"."inquiries" TO closeline_voice_purge_scan;
--> statement-breakpoint
CREATE FUNCTION "voice"."orgs_with_due_callbacks"(p_after text, p_limit integer)
RETURNS TABLE ("organization_id" text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT DISTINCT i."organization_id"
    FROM "voice"."inquiries" i
   WHERE (i."callback_state" = 'pending'
          OR (i."callback_state" = 'no_answer' AND i."callback_next_attempt_at" <= now()))
     AND (p_after IS NULL OR i."organization_id" > p_after)
   ORDER BY i."organization_id"
   LIMIT CASE WHEN p_limit >= 1 THEN least(p_limit, 500) ELSE 0 END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "voice"."orgs_with_due_callbacks"(text, integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "voice"."orgs_with_due_callbacks"(text, integer) TO closeline_voice;
--> statement-breakpoint
GRANT CREATE ON SCHEMA "voice" TO closeline_voice_purge_scan;
--> statement-breakpoint
ALTER FUNCTION "voice"."orgs_with_due_callbacks"(text, integer) OWNER TO closeline_voice_purge_scan;
--> statement-breakpoint
REVOKE CREATE ON SCHEMA "voice" FROM closeline_voice_purge_scan;
