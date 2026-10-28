CREATE TABLE "core"."suppression_import_rows" (
	"organization_id" text NOT NULL,
	"import_id" text NOT NULL,
	"row_number" integer NOT NULL,
	"result" text NOT NULL,
	"reason" text,
	CONSTRAINT "suppression_import_rows_pkey" PRIMARY KEY("organization_id","import_id","row_number"),
	CONSTRAINT "suppression_import_rows_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "suppression_import_rows_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "suppression_import_rows_import_id_shape" CHECK ("import_id" ~ '^simp_[0-9a-f]{32}$'),
	CONSTRAINT "suppression_import_rows_row_number_bounds" CHECK ("core"."suppression_import_rows"."row_number" between 2 and 50001),
	CONSTRAINT "suppression_import_rows_result_known" CHECK ("core"."suppression_import_rows"."result" in ('added', 'already_suppressed', 'invalid')),
	CONSTRAINT "suppression_import_rows_reason_matches_result" CHECK (("core"."suppression_import_rows"."result" = 'invalid') = ("core"."suppression_import_rows"."reason" is not null)
        and ("core"."suppression_import_rows"."reason" is null or "core"."suppression_import_rows"."reason" in ('unreadable_address', 'unsupported_address')))
);
--> statement-breakpoint
CREATE TABLE "core"."suppression_imports" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"state" text DEFAULT 'uploaded' NOT NULL,
	"failure_reason" text,
	"size_bytes" bigint NOT NULL,
	"content_hash" "bytea" NOT NULL,
	"object_key" text NOT NULL,
	"processed_rows" integer DEFAULT 0 NOT NULL,
	"total_rows" integer,
	"added_rows" integer,
	"already_suppressed_rows" integer,
	"invalid_rows" integer,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "suppression_imports_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "suppression_imports_id_shape" CHECK ("id" ~ '^simp_[0-9a-f]{32}$'),
	CONSTRAINT "suppression_imports_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "suppression_imports_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "suppression_imports_created_by_user_id_shape" CHECK ("created_by_user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "suppression_imports_state_known" CHECK ("core"."suppression_imports"."state" in ('uploaded', 'processing', 'completed', 'failed')),
	CONSTRAINT "suppression_imports_failure_reason_known" CHECK ("core"."suppression_imports"."failure_reason" in ('too_many_rows', 'unreadable')),
	CONSTRAINT "suppression_imports_failed_has_reason" CHECK (("core"."suppression_imports"."state" = 'failed') = ("core"."suppression_imports"."failure_reason" is not null)),
	CONSTRAINT "suppression_imports_size_bounds" CHECK ("core"."suppression_imports"."size_bytes" between 1 and 10485760),
	CONSTRAINT "suppression_imports_content_hash_length" CHECK (octet_length("core"."suppression_imports"."content_hash") = 32),
	CONSTRAINT "suppression_imports_object_key_shape" CHECK (char_length("core"."suppression_imports"."object_key") between 1 and 1024 and "core"."suppression_imports"."object_key" collate "C" ~ '^[!-~]+$'),
	CONSTRAINT "suppression_imports_processed_rows_bounds" CHECK ("core"."suppression_imports"."processed_rows" between 0 and 50000),
	CONSTRAINT "suppression_imports_counts_when_completed" CHECK (("core"."suppression_imports"."state" = 'completed') = ("core"."suppression_imports"."total_rows" is not null)
        and ("core"."suppression_imports"."total_rows" is null) = ("core"."suppression_imports"."added_rows" is null)
        and ("core"."suppression_imports"."total_rows" is null) = ("core"."suppression_imports"."already_suppressed_rows" is null)
        and ("core"."suppression_imports"."total_rows" is null) = ("core"."suppression_imports"."invalid_rows" is null)
        and ("core"."suppression_imports"."total_rows" is null) = ("core"."suppression_imports"."completed_at" is null)),
	CONSTRAINT "suppression_imports_counts_add_up" CHECK ("core"."suppression_imports"."total_rows" is null or ("core"."suppression_imports"."added_rows" >= 0 and "core"."suppression_imports"."already_suppressed_rows" >= 0
        and "core"."suppression_imports"."invalid_rows" >= 0
        and "core"."suppression_imports"."total_rows" <= 50000
        and "core"."suppression_imports"."total_rows" = "core"."suppression_imports"."added_rows" + "core"."suppression_imports"."already_suppressed_rows" + "core"."suppression_imports"."invalid_rows"))
);
--> statement-breakpoint
ALTER TABLE "core"."suppression_import_rows" ADD CONSTRAINT "suppression_import_rows_import_fk" FOREIGN KEY ("organization_id","import_id") REFERENCES "core"."suppression_imports"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."suppression_imports" ADD CONSTRAINT "suppression_imports_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "suppression_import_rows_result_idx" ON "core"."suppression_import_rows" USING btree ("organization_id","import_id","result","row_number");--> statement-breakpoint
CREATE INDEX "suppression_imports_list_idx" ON "core"."suppression_imports" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);
--> statement-breakpoint
ALTER TABLE "core"."suppression_imports" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."suppression_imports" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "suppression_imports_tenant_isolation" ON "core"."suppression_imports" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."suppression_import_rows" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."suppression_import_rows" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "suppression_import_rows_tenant_isolation" ON "core"."suppression_import_rows" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
