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
-- A technologies history value is the JSON array text of the list, e.g. ["a","b"]. It must parse
-- as a JSON array holding only strings and, as a text[], pass prospect_technologies_valid. Text
-- that is not JSON is a false answer, not an error, so the check reports check_violation.
CREATE FUNCTION "core"."prospect_company_technologies_text_valid"(value text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  parsed jsonb;
BEGIN
  IF value IS NULL THEN
    RETURN false;
  END IF;
  BEGIN
    parsed := value::jsonb;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;
  IF jsonb_typeof(parsed) <> 'array' THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(parsed) AS item WHERE jsonb_typeof(item) <> 'string') THEN
    RETURN false;
  END IF;
  RETURN "core"."prospect_technologies_valid"(
    ARRAY(SELECT jsonb_array_elements_text(parsed))::text[]
  );
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "core"."prospect_company_technologies_text_valid"(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."prospect_company_technologies_text_valid"(text) TO closeline_core;
--> statement-breakpoint
ALTER TABLE "core"."prospect_company_fields" DROP CONSTRAINT "prospect_company_fields_value_shape";--> statement-breakpoint
ALTER TABLE "core"."prospect_company_fields" DROP CONSTRAINT "prospect_company_fields_field_name_known";--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD COLUMN "employee_count" integer;--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD COLUMN "technologies" text[];--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD CONSTRAINT "prospect_companies_industry_shape" CHECK ("core"."prospect_companies"."industry" is null or (char_length("core"."prospect_companies"."industry") between 1 and 200 and "core"."prospect_companies"."industry" = btrim("core"."prospect_companies"."industry")));--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD CONSTRAINT "prospect_companies_region_shape" CHECK ("core"."prospect_companies"."region" is null or (char_length("core"."prospect_companies"."region") between 1 and 200 and "core"."prospect_companies"."region" = btrim("core"."prospect_companies"."region")));--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD CONSTRAINT "prospect_companies_employee_count_shape" CHECK ("core"."prospect_companies"."employee_count" is null or "core"."prospect_companies"."employee_count" >= 0);--> statement-breakpoint
ALTER TABLE "core"."prospect_companies" ADD CONSTRAINT "prospect_companies_technologies_shape" CHECK ("core"."prospect_companies"."technologies" is null or core.prospect_technologies_valid("core"."prospect_companies"."technologies"));--> statement-breakpoint
ALTER TABLE "core"."prospect_company_fields" ADD CONSTRAINT "prospect_company_fields_employee_count_value" CHECK ("core"."prospect_company_fields"."field_name" <> 'employee_count' or "core"."prospect_company_fields"."value" collate "C" ~ '^[0-9]{1,9}$');--> statement-breakpoint
ALTER TABLE "core"."prospect_company_fields" ADD CONSTRAINT "prospect_company_fields_value_shape" CHECK (("field_name" <> 'technologies' and char_length("value") between 1 and 320) or ("field_name" = 'technologies' and char_length("value") between 1 and 5300 and core.prospect_company_technologies_text_valid("value")));--> statement-breakpoint
ALTER TABLE "core"."prospect_company_fields" ADD CONSTRAINT "prospect_company_fields_field_name_known" CHECK ("core"."prospect_company_fields"."field_name" in ('name', 'domain', 'industry', 'employee_count', 'region', 'technologies'));