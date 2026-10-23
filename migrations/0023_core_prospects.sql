CREATE FUNCTION "core"."prospect_tags_valid"(tags text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT tags IS NOT NULL
    AND cardinality(tags) <= 20
    AND NOT EXISTS (
      SELECT 1 FROM unnest(tags) AS tag WHERE tag IS NULL OR char_length(tag) NOT BETWEEN 1 AND 50
    )
    AND (SELECT count(DISTINCT tag) FROM unnest(tags) AS tag) = cardinality(tags)
$$;
--> statement-breakpoint
CREATE FUNCTION "core"."prospect_merged_ids_valid"(merged text[], survivor text) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT merged IS NOT NULL
    AND cardinality(merged) BETWEEN 1 AND 5
    AND NOT EXISTS (
      SELECT 1 FROM unnest(merged) AS pid
      WHERE pid IS NULL OR pid COLLATE "C" !~ '^prs_[0-9a-f]{32}$' OR pid = survivor
    )
    AND (SELECT count(DISTINCT pid) FROM unnest(merged) AS pid) = cardinality(merged)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "core"."prospect_tags_valid"(text[]), "core"."prospect_merged_ids_valid"(text[], text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."prospect_tags_valid"(text[]), "core"."prospect_merged_ids_valid"(text[], text) TO closeline_core;
--> statement-breakpoint
CREATE TABLE "core"."prospect_companies" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prospect_companies_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "prospect_companies_id_shape" CHECK ("id" ~ '^pco_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_companies_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_companies_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "prospect_companies_name_shape" CHECK (char_length("core"."prospect_companies"."name") between 1 and 200 and "core"."prospect_companies"."name" = btrim("core"."prospect_companies"."name")),
	CONSTRAINT "prospect_companies_domain_shape" CHECK ("core"."prospect_companies"."domain" is null or (char_length("core"."prospect_companies"."domain") between 3 and 253
        and "core"."prospect_companies"."domain" collate "C" ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'))
);
--> statement-breakpoint
CREATE TABLE "core"."prospect_company_fields" (
	"organization_id" text NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "core"."prospect_company_fields_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"field_name" text NOT NULL,
	"state" text NOT NULL,
	"value" text NOT NULL,
	"source" text NOT NULL,
	"source_ref" text,
	"set_at" timestamp with time zone NOT NULL,
	"set_by_user_id" text,
	"company_id" text NOT NULL,
	CONSTRAINT "prospect_company_fields_pkey" PRIMARY KEY("organization_id","seq"),
	CONSTRAINT "prospect_company_fields_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_company_fields_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "prospect_company_fields_state_known" CHECK ("state" in ('current', 'superseded', 'suggested')),
	CONSTRAINT "prospect_company_fields_value_shape" CHECK (char_length("value") between 1 and 320),
	CONSTRAINT "prospect_company_fields_source_known" CHECK ("source" collate "C" ~ '^(manual|import|crm:hubspot|crm:salesforce|form|enrichment:[a-z][a-z0-9_]{0,31})$'),
	CONSTRAINT "prospect_company_fields_source_ref_shape" CHECK (("source_ref" is null or char_length("source_ref") between 1 and 200) and ("source" <> 'manual' or "source_ref" is null)),
	CONSTRAINT "prospect_company_fields_set_by_user_id_shape" CHECK ("set_by_user_id" is null or "set_by_user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_company_fields_company_id_shape" CHECK ("company_id" ~ '^pco_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_company_fields_field_name_known" CHECK ("core"."prospect_company_fields"."field_name" in ('name', 'domain'))
);
--> statement-breakpoint
CREATE TABLE "core"."prospect_fields" (
	"organization_id" text NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "core"."prospect_fields_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"field_name" text NOT NULL,
	"state" text NOT NULL,
	"value" text NOT NULL,
	"source" text NOT NULL,
	"source_ref" text,
	"set_at" timestamp with time zone NOT NULL,
	"set_by_user_id" text,
	"prospect_id" text NOT NULL,
	CONSTRAINT "prospect_fields_pkey" PRIMARY KEY("organization_id","seq"),
	CONSTRAINT "prospect_fields_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_fields_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "prospect_fields_state_known" CHECK ("state" in ('current', 'superseded', 'suggested')),
	CONSTRAINT "prospect_fields_value_shape" CHECK (char_length("value") between 1 and 320),
	CONSTRAINT "prospect_fields_source_known" CHECK ("source" collate "C" ~ '^(manual|import|crm:hubspot|crm:salesforce|form|enrichment:[a-z][a-z0-9_]{0,31})$'),
	CONSTRAINT "prospect_fields_source_ref_shape" CHECK (("source_ref" is null or char_length("source_ref") between 1 and 200) and ("source" <> 'manual' or "source_ref" is null)),
	CONSTRAINT "prospect_fields_set_by_user_id_shape" CHECK ("set_by_user_id" is null or "set_by_user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_fields_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_fields_field_name_known" CHECK ("core"."prospect_fields"."field_name" in ('first_name', 'last_name', 'job_title', 'email', 'phone', 'linkedin_url'))
);
--> statement-breakpoint
CREATE TABLE "core"."prospect_identities" (
	"organization_id" text NOT NULL,
	"kind" text NOT NULL,
	"value" text NOT NULL,
	"prospect_id" text NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prospect_identities_pkey" PRIMARY KEY("organization_id","kind","value"),
	CONSTRAINT "prospect_identities_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_identities_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "prospect_identities_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_identities_kind_known" CHECK ("core"."prospect_identities"."kind" in ('email', 'phone', 'linkedin')),
	CONSTRAINT "prospect_identities_value_shape" CHECK (char_length("core"."prospect_identities"."value") between 3 and 320 and (
        ("core"."prospect_identities"."kind" = 'email'
          and "core"."prospect_identities"."value" = lower("core"."prospect_identities"."value" collate "C")
          and char_length("core"."prospect_identities"."value") - char_length(replace("core"."prospect_identities"."value", '@', '')) = 1
          and position('@' in "core"."prospect_identities"."value") between 2 and char_length("core"."prospect_identities"."value") - 1
          and "core"."prospect_identities"."value" collate "C" ~ '^[!-~]+$')
        or ("core"."prospect_identities"."kind" = 'phone' and "core"."prospect_identities"."value" collate "C" ~ '^\+[1-9][0-9]{6,14}$')
        or ("core"."prospect_identities"."kind" = 'linkedin' and char_length("core"."prospect_identities"."value") <= 300
          and "core"."prospect_identities"."value" collate "C" ~ '^linkedin\.com(/[a-z0-9%._~-]+)+$')))
);
--> statement-breakpoint
CREATE TABLE "core"."prospect_import_rows" (
	"organization_id" text NOT NULL,
	"import_id" text NOT NULL,
	"row_number" integer NOT NULL,
	"result" text NOT NULL,
	"reason" text,
	"prospect_id" text,
	CONSTRAINT "prospect_import_rows_pkey" PRIMARY KEY("organization_id","import_id","row_number"),
	CONSTRAINT "prospect_import_rows_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_import_rows_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "prospect_import_rows_import_id_shape" CHECK ("import_id" ~ '^pimp_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_import_rows_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_import_rows_row_number_bounds" CHECK ("core"."prospect_import_rows"."row_number" between 2 and 50001),
	CONSTRAINT "prospect_import_rows_result_known" CHECK ("core"."prospect_import_rows"."result" in ('created', 'updated', 'skipped', 'rejected')),
	CONSTRAINT "prospect_import_rows_reason_matches_result" CHECK (("core"."prospect_import_rows"."result" = 'skipped' and "core"."prospect_import_rows"."reason" is not null and "core"."prospect_import_rows"."reason" in ('no_change', 'manual_values_kept'))
        or ("core"."prospect_import_rows"."result" = 'rejected' and "core"."prospect_import_rows"."reason" is not null and "core"."prospect_import_rows"."reason" in ('wrong_column_count', 'blank_row', 'missing_identity', 'invalid_email', 'invalid_phone', 'invalid_linkedin_url', 'invalid_name', 'invalid_job_title', 'invalid_company', 'invalid_tags', 'owner_not_found', 'owner_not_allowed', 'duplicate_in_file', 'identity_conflict'))
        or ("core"."prospect_import_rows"."result" in ('created', 'updated') and "core"."prospect_import_rows"."reason" is null)),
	CONSTRAINT "prospect_import_rows_prospect_matches_result" CHECK (("core"."prospect_import_rows"."result" = 'rejected' and "core"."prospect_import_rows"."prospect_id" is null)
        or ("core"."prospect_import_rows"."result" in ('created', 'updated') and "core"."prospect_import_rows"."prospect_id" is not null)
        or "core"."prospect_import_rows"."result" = 'skipped')
);
--> statement-breakpoint
CREATE TABLE "core"."prospect_imports" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"state" text DEFAULT 'uploaded' NOT NULL,
	"failure_reason" text,
	"size_bytes" bigint NOT NULL,
	"content_hash" "bytea" NOT NULL,
	"object_key" text NOT NULL,
	"processed_rows" integer DEFAULT 0 NOT NULL,
	"row_count" integer,
	"created_count" integer,
	"updated_count" integer,
	"skipped_count" integer,
	"rejected_count" integer,
	"uploaded_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prospect_imports_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "prospect_imports_id_shape" CHECK ("id" ~ '^pimp_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_imports_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_imports_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "prospect_imports_uploaded_by_user_id_shape" CHECK ("uploaded_by_user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_imports_state_known" CHECK ("core"."prospect_imports"."state" in ('uploaded', 'processing', 'completed', 'failed')),
	CONSTRAINT "prospect_imports_failure_reason_known" CHECK ("core"."prospect_imports"."failure_reason" in ('too_many_rows', 'unreadable')),
	CONSTRAINT "prospect_imports_failed_has_reason" CHECK (("core"."prospect_imports"."state" = 'failed') = ("core"."prospect_imports"."failure_reason" is not null)),
	CONSTRAINT "prospect_imports_size_bounds" CHECK ("core"."prospect_imports"."size_bytes" between 1 and 10485760),
	CONSTRAINT "prospect_imports_content_hash_length" CHECK (octet_length("core"."prospect_imports"."content_hash") = 32),
	CONSTRAINT "prospect_imports_object_key_shape" CHECK (char_length("core"."prospect_imports"."object_key") between 1 and 1024 and "core"."prospect_imports"."object_key" collate "C" ~ '^[!-~]+$'),
	CONSTRAINT "prospect_imports_processed_rows_bounds" CHECK ("core"."prospect_imports"."processed_rows" between 0 and 50000),
	CONSTRAINT "prospect_imports_counts_when_completed" CHECK (("core"."prospect_imports"."state" = 'completed') = ("core"."prospect_imports"."row_count" is not null)
        and ("core"."prospect_imports"."row_count" is null) = ("core"."prospect_imports"."created_count" is null)
        and ("core"."prospect_imports"."row_count" is null) = ("core"."prospect_imports"."updated_count" is null)
        and ("core"."prospect_imports"."row_count" is null) = ("core"."prospect_imports"."skipped_count" is null)
        and ("core"."prospect_imports"."row_count" is null) = ("core"."prospect_imports"."rejected_count" is null)),
	CONSTRAINT "prospect_imports_counts_add_up" CHECK ("core"."prospect_imports"."row_count" is null or ("core"."prospect_imports"."created_count" >= 0 and "core"."prospect_imports"."updated_count" >= 0
        and "core"."prospect_imports"."skipped_count" >= 0 and "core"."prospect_imports"."rejected_count" >= 0
        and "core"."prospect_imports"."row_count" <= 50000
        and "core"."prospect_imports"."row_count" = "core"."prospect_imports"."created_count" + "core"."prospect_imports"."updated_count" + "core"."prospect_imports"."skipped_count" + "core"."prospect_imports"."rejected_count"))
);
--> statement-breakpoint
CREATE TABLE "core"."prospect_merges" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"survivor_prospect_id" text NOT NULL,
	"merged_prospect_ids" text[] NOT NULL,
	"field_choices" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"state" text DEFAULT 'merged' NOT NULL,
	"merged_by_user_id" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"undoable_until" timestamp with time zone NOT NULL,
	"undone_at" timestamp with time zone,
	CONSTRAINT "prospect_merges_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "prospect_merges_id_shape" CHECK ("id" ~ '^pmrg_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_merges_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_merges_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "prospect_merges_survivor_prospect_id_shape" CHECK ("survivor_prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_merges_merged_by_user_id_shape" CHECK ("merged_by_user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "prospect_merges_state_known" CHECK ("core"."prospect_merges"."state" in ('merged', 'undone')),
	CONSTRAINT "prospect_merges_merged_ids_valid" CHECK (core.prospect_merged_ids_valid("core"."prospect_merges"."merged_prospect_ids", "core"."prospect_merges"."survivor_prospect_id")),
	CONSTRAINT "prospect_merges_field_choices_object" CHECK (jsonb_typeof("core"."prospect_merges"."field_choices") = 'object'),
	CONSTRAINT "prospect_merges_snapshot_bounds" CHECK (jsonb_typeof("core"."prospect_merges"."snapshot") = 'object' and octet_length("core"."prospect_merges"."snapshot"::text) <= 4194304),
	CONSTRAINT "prospect_merges_undo_window" CHECK ("core"."prospect_merges"."undoable_until" = "core"."prospect_merges"."created_at" + interval '30 days'),
	CONSTRAINT "prospect_merges_undone_has_time" CHECK (("core"."prospect_merges"."state" = 'undone') = ("core"."prospect_merges"."undone_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "core"."prospects" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text,
	"owner_membership_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prospects_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "prospects_id_shape" CHECK ("id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "prospects_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "prospects_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "prospects_company_id_shape" CHECK ("company_id" ~ '^pco_[0-9a-f]{32}$'),
	CONSTRAINT "prospects_owner_membership_id_shape" CHECK ("owner_membership_id" ~ '^mem_[0-9a-f]{32}$'),
	CONSTRAINT "prospects_status_known" CHECK ("core"."prospects"."status" in ('active', 'archived')),
	CONSTRAINT "prospects_source_known" CHECK ("core"."prospects"."source" collate "C" ~ '^(manual|import|crm:hubspot|crm:salesforce|form|enrichment:[a-z][a-z0-9_]{0,31})$'),
	CONSTRAINT "prospects_tags_valid" CHECK (core.prospect_tags_valid("core"."prospects"."tags")),
	CONSTRAINT "prospects_notes_shape" CHECK ("core"."prospects"."notes" is null or char_length("core"."prospects"."notes") between 1 and 5000)
);
--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD CONSTRAINT "prospect_companies_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."prospect_company_fields" ADD CONSTRAINT "prospect_company_fields_company_fk" FOREIGN KEY ("organization_id","company_id") REFERENCES "core"."prospect_companies"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."prospect_fields" ADD CONSTRAINT "prospect_fields_prospect_fk" FOREIGN KEY ("organization_id","prospect_id") REFERENCES "core"."prospects"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."prospect_identities" ADD CONSTRAINT "prospect_identities_prospect_fk" FOREIGN KEY ("organization_id","prospect_id") REFERENCES "core"."prospects"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."prospect_import_rows" ADD CONSTRAINT "prospect_import_rows_import_fk" FOREIGN KEY ("organization_id","import_id") REFERENCES "core"."prospect_imports"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."prospect_imports" ADD CONSTRAINT "prospect_imports_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."prospect_merges" ADD CONSTRAINT "prospect_merges_survivor_fk" FOREIGN KEY ("organization_id","survivor_prospect_id") REFERENCES "core"."prospects"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."prospects" ADD CONSTRAINT "prospects_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."prospects" ADD CONSTRAINT "prospects_company_fk" FOREIGN KEY ("organization_id","company_id") REFERENCES "core"."prospect_companies"("organization_id","id") ON DELETE set null ("company_id") ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."prospects" ADD CONSTRAINT "prospects_owner_fk" FOREIGN KEY ("organization_id","owner_membership_id") REFERENCES "core"."memberships"("organization_id","id") ON DELETE set null ("owner_membership_id") ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "prospect_companies_domain_key" ON "core"."prospect_companies" USING btree ("organization_id","domain") WHERE "core"."prospect_companies"."domain" is not null;--> statement-breakpoint
CREATE INDEX "prospect_companies_list_idx" ON "core"."prospect_companies" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "prospect_company_fields_current_key" ON "core"."prospect_company_fields" USING btree ("organization_id","company_id","field_name") WHERE "core"."prospect_company_fields"."state" = 'current';--> statement-breakpoint
CREATE INDEX "prospect_company_fields_history_idx" ON "core"."prospect_company_fields" USING btree ("organization_id","company_id","field_name","set_at" DESC NULLS LAST,"seq" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "prospect_fields_current_key" ON "core"."prospect_fields" USING btree ("organization_id","prospect_id","field_name") WHERE "core"."prospect_fields"."state" = 'current';--> statement-breakpoint
CREATE INDEX "prospect_fields_history_idx" ON "core"."prospect_fields" USING btree ("organization_id","prospect_id","field_name","set_at" DESC NULLS LAST,"seq" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "prospect_identities_primary_key" ON "core"."prospect_identities" USING btree ("organization_id","prospect_id","kind") WHERE "core"."prospect_identities"."is_primary";--> statement-breakpoint
CREATE INDEX "prospect_identities_prospect_idx" ON "core"."prospect_identities" USING btree ("organization_id","prospect_id");--> statement-breakpoint
CREATE INDEX "prospect_import_rows_result_idx" ON "core"."prospect_import_rows" USING btree ("organization_id","import_id","result","row_number");--> statement-breakpoint
CREATE INDEX "prospect_imports_list_idx" ON "core"."prospect_imports" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "prospect_merges_survivor_idx" ON "core"."prospect_merges" USING btree ("organization_id","survivor_prospect_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "prospect_merges_merged_ids_idx" ON "core"."prospect_merges" USING gin ("merged_prospect_ids");--> statement-breakpoint
CREATE INDEX "prospects_list_idx" ON "core"."prospects" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "prospects_status_list_idx" ON "core"."prospects" USING btree ("organization_id","status","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "prospects_owner_list_idx" ON "core"."prospects" USING btree ("organization_id","owner_membership_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "core"."prospects"."owner_membership_id" is not null;--> statement-breakpoint
CREATE INDEX "prospects_company_list_idx" ON "core"."prospects" USING btree ("organization_id","company_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "core"."prospects"."company_id" is not null;--> statement-breakpoint
CREATE INDEX "prospects_source_list_idx" ON "core"."prospects" USING btree ("organization_id","source","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);
--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "prospect_companies_tenant_isolation" ON "core"."prospect_companies" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."prospect_company_fields" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."prospect_company_fields" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "prospect_company_fields_tenant_isolation" ON "core"."prospect_company_fields" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."prospects" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."prospects" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "prospects_tenant_isolation" ON "core"."prospects" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."prospect_identities" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."prospect_identities" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "prospect_identities_tenant_isolation" ON "core"."prospect_identities" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."prospect_fields" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."prospect_fields" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "prospect_fields_tenant_isolation" ON "core"."prospect_fields" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."prospect_imports" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."prospect_imports" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "prospect_imports_tenant_isolation" ON "core"."prospect_imports" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."prospect_import_rows" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."prospect_import_rows" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "prospect_import_rows_tenant_isolation" ON "core"."prospect_import_rows" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."prospect_merges" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."prospect_merges" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "prospect_merges_tenant_isolation" ON "core"."prospect_merges" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
CREATE FUNCTION "core"."limit_field_history"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  owner_column text := TG_ARGV[0];
  owner_id text := to_jsonb(NEW) ->> owner_column;
  kept integer;
BEGIN
  IF TG_OP = 'UPDATE' AND owner_id IS NOT DISTINCT FROM to_jsonb(OLD) ->> owner_column
     AND NEW.field_name = OLD.field_name THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.organization_id || '/' || owner_id || '/' || NEW.field_name, 0)
  );
  EXECUTE format(
    'SELECT count(*) FROM %I.%I WHERE organization_id = $1 AND %I = $2 AND field_name = $3',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, owner_column
  ) INTO kept
  USING NEW.organization_id, owner_id, NEW.field_name;
  IF kept >= 50 THEN
    RAISE EXCEPTION 'field history is full: at most 50 entries per field'
      USING ERRCODE = 'check_violation', CONSTRAINT = TG_TABLE_NAME || '_history_limit';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "core"."limit_field_history"() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER "prospect_fields_history_limit" BEFORE INSERT OR UPDATE OF organization_id, prospect_id, field_name ON "core"."prospect_fields" FOR EACH ROW EXECUTE FUNCTION "core"."limit_field_history"('prospect_id');
--> statement-breakpoint
CREATE TRIGGER "prospect_company_fields_history_limit" BEFORE INSERT OR UPDATE OF organization_id, company_id, field_name ON "core"."prospect_company_fields" FOR EACH ROW EXECUTE FUNCTION "core"."limit_field_history"('company_id');
