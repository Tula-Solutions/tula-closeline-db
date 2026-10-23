CREATE FUNCTION "core"."prospect_technologies_valid"(technologies text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT technologies IS NOT NULL
    AND cardinality(technologies) <= 50
    AND NOT EXISTS (
      SELECT 1 FROM unnest(technologies) AS technology
       WHERE technology IS NULL OR char_length(technology) NOT BETWEEN 1 AND 100
    )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "core"."prospect_technologies_valid"(text[]) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."prospect_technologies_valid"(text[]) TO closeline_core;
--> statement-breakpoint
ALTER TABLE "core"."prospect_company_fields" DROP CONSTRAINT "prospect_company_fields_field_name_known";--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD COLUMN "employee_count" integer;--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD COLUMN "technologies" text[];--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD CONSTRAINT "prospect_companies_industry_shape" CHECK ("core"."prospect_companies"."industry" is null or (char_length("core"."prospect_companies"."industry") between 1 and 200 and "core"."prospect_companies"."industry" = btrim("core"."prospect_companies"."industry")));--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD CONSTRAINT "prospect_companies_region_shape" CHECK ("core"."prospect_companies"."region" is null or (char_length("core"."prospect_companies"."region") between 1 and 200 and "core"."prospect_companies"."region" = btrim("core"."prospect_companies"."region")));--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD CONSTRAINT "prospect_companies_employee_count_shape" CHECK ("core"."prospect_companies"."employee_count" is null or "core"."prospect_companies"."employee_count" >= 0);--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD CONSTRAINT "prospect_companies_technologies_shape" CHECK ("core"."prospect_companies"."technologies" is null or core.prospect_technologies_valid("core"."prospect_companies"."technologies"));--> statement-breakpoint
ALTER TABLE "core"."prospect_company_fields" ADD CONSTRAINT "prospect_company_fields_field_name_known" CHECK ("core"."prospect_company_fields"."field_name" in ('name', 'domain', 'industry', 'employee_count', 'region', 'technologies'));