-- The pre-Organization lookup of a CRM webhook (ADR 0022): provider and the provider's account id
-- to the Organization and connection, through a definer role, in the style of migration 0030.
--
-- Why. A webhook names only the provider's account. `crm_connection` is guarded by forced
-- row-level security, so `closeline_core` sees no row until it knows the Organization, which is
-- what the webhook is asking. The function runs as closeline_core_crm_lookup: NOLOGIN, BYPASSRLS,
-- NOINHERIT, no member but closeline_owner (which can SET ROLE to it, only so that ALTER FUNCTION
-- ... OWNER TO below is allowed). The role is created with the other closeline_* roles
-- (docker/postgres/init.sql locally, the Region bootstrap in tula-closeline-infra elsewhere), not
-- here: a migration does not create roles.
--
-- What it can reach. The role holds USAGE on `core` and SELECT on four columns of
-- `crm_connection`: organization_id, id, provider and external_account_id. It cannot read a
-- sealed token, a key id or anything else, in any table, so the function cannot return one.
-- It reads the unique (provider, external_account_id) index `crm_connection_account_key`, so it
-- returns at most one row. Disconnecting deletes the connection, so a disconnected account (and
-- one of a deleted Organization) gives no row; a connection that needs a reconnect still routes.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'closeline_core_crm_lookup') THEN
    RAISE EXCEPTION 'role closeline_core_crm_lookup does not exist: create it as NOLOGIN BYPASSRLS NOINHERIT and grant it to closeline_owner WITH SET TRUE, INHERIT FALSE before this migration (docker/postgres/init.sql locally, the Region bootstrap in tula-closeline-infra elsewhere)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles
     WHERE rolname = 'closeline_core_crm_lookup' AND NOT rolcanlogin AND rolbypassrls AND NOT rolsuper
  ) THEN
    RAISE EXCEPTION 'role closeline_core_crm_lookup must be NOLOGIN, NOSUPERUSER and BYPASSRLS';
  END IF;
  IF NOT pg_has_role(current_user, 'closeline_core_crm_lookup', 'SET') THEN
    RAISE EXCEPTION 'role % must be able to SET ROLE closeline_core_crm_lookup: GRANT closeline_core_crm_lookup TO % WITH SET TRUE, INHERIT FALSE', current_user, current_user;
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "core" TO closeline_core_crm_lookup;
--> statement-breakpoint
GRANT SELECT ("organization_id", "id", "provider", "external_account_id") ON "core"."crm_connection" TO closeline_core_crm_lookup;
--> statement-breakpoint
-- The connection of a provider's account, as (organization_id, connection_id), or no row. The
-- provider must be a known one and the account id 1 to 128 characters (the column's own check);
-- anything else, including null, gives no row and raises nothing, so the answer has one shape. The
-- account id is compared as given: exactly, never as a pattern. Argument names carry a p_ prefix
-- because the result columns would otherwise shadow them.
CREATE FUNCTION "core"."crm_connection_for_account"(p_provider text, p_external_account_id text)
RETURNS TABLE ("organization_id" text, "connection_id" text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, core, pg_temp AS $$
BEGIN
  IF p_provider IS NULL OR p_provider NOT IN ('hubspot', 'salesforce')
     OR p_external_account_id IS NULL
     OR char_length(p_external_account_id) NOT BETWEEN 1 AND 128 THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT c."organization_id", c."id"
    FROM "core"."crm_connection" c
   WHERE c."provider" = p_provider
     AND c."external_account_id" = p_external_account_id
   LIMIT 1;
END
$$;
--> statement-breakpoint
-- Grants first, while closeline_owner owns the function; the ownership change carries them over.
REVOKE ALL ON FUNCTION "core"."crm_connection_for_account"(text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."crm_connection_for_account"(text, text) TO closeline_core;
--> statement-breakpoint
-- ALTER ... OWNER TO needs CREATE on the schema for the new owner; it is held for this statement only.
GRANT CREATE ON SCHEMA "core" TO closeline_core_crm_lookup;
--> statement-breakpoint
ALTER FUNCTION "core"."crm_connection_for_account"(text, text) OWNER TO closeline_core_crm_lookup;
--> statement-breakpoint
REVOKE CREATE ON SCHEMA "core" FROM closeline_core_crm_lookup;
