-- The pre-Organization lookup of an API key: the SHA-256 hash of a presented key to the
-- Organization, key id, scopes and revoked/expiry state, through a definer role, in the style of
-- migration 0033.
--
-- Why. The key exchange knows only the key it was handed. `api_keys` is guarded by forced
-- row-level security, so `closeline_core` sees no row until it knows the Organization, which is
-- what the exchange is asking. The function runs as closeline_core_key_lookup: NOLOGIN, BYPASSRLS,
-- NOINHERIT, no member but closeline_owner (which can SET ROLE to it, only so that ALTER FUNCTION
-- ... OWNER TO below is allowed). The role is created with the other closeline_* roles
-- (docker/postgres/init.sql locally, the Region bootstrap in tula-closeline-infra elsewhere), not
-- here: a migration does not create roles.
--
-- What it can reach. The role holds USAGE on `core` and SELECT on six columns of `api_keys`:
-- secret_hash (to match on), organization_id, id, scopes, revoked_at and expires_at. It cannot
-- read the name, the prefix, the role ceiling or anything else, in any table, and the function
-- never returns the hash. It reads the unique index `api_keys_secret_hash_key`, so it returns at
-- most one row.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'closeline_core_key_lookup') THEN
    RAISE EXCEPTION 'role closeline_core_key_lookup does not exist: create it as NOLOGIN BYPASSRLS NOINHERIT and grant it to closeline_owner WITH SET TRUE, INHERIT FALSE before this migration (docker/postgres/init.sql locally, the Region bootstrap in tula-closeline-infra elsewhere)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles
     WHERE rolname = 'closeline_core_key_lookup' AND NOT rolcanlogin AND rolbypassrls AND NOT rolsuper
  ) THEN
    RAISE EXCEPTION 'role closeline_core_key_lookup must be NOLOGIN, NOSUPERUSER and BYPASSRLS';
  END IF;
  IF NOT pg_has_role(current_user, 'closeline_core_key_lookup', 'SET') THEN
    RAISE EXCEPTION 'role % must be able to SET ROLE closeline_core_key_lookup: GRANT closeline_core_key_lookup TO % WITH SET TRUE, INHERIT FALSE', current_user, current_user;
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "core" TO closeline_core_key_lookup;
--> statement-breakpoint
GRANT SELECT ("organization_id", "id", "secret_hash", "scopes", "revoked_at", "expires_at") ON "core"."api_keys" TO closeline_core_key_lookup;
--> statement-breakpoint
-- The key whose hash is p_secret_hash, as (organization_id, key_id, scopes, revoked_at,
-- expires_at), or no row. The hash must be 64 lowercase hex characters (the column's own check);
-- anything else, including null, gives no row and raises nothing, so the answer has one shape. It
-- is compared as given: exactly, never as a pattern. A revoked or expired key is returned with
-- its state; refusing it is the caller's job. Argument names carry a p_ prefix because the result
-- columns would otherwise shadow them.
CREATE FUNCTION "core"."api_key_for_hash"(p_secret_hash text)
RETURNS TABLE ("organization_id" text, "key_id" text, "scopes" text[], "revoked_at" timestamptz, "expires_at" timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, core, pg_temp AS $$
BEGIN
  IF p_secret_hash IS NULL OR p_secret_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT k."organization_id", k."id", k."scopes", k."revoked_at", k."expires_at"
    FROM "core"."api_keys" k
   WHERE k."secret_hash" = p_secret_hash
   LIMIT 1;
END
$$;
--> statement-breakpoint
-- Grants first, while closeline_owner owns the function; the ownership change carries them over.
REVOKE ALL ON FUNCTION "core"."api_key_for_hash"(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."api_key_for_hash"(text) TO closeline_core;
--> statement-breakpoint
-- ALTER ... OWNER TO needs CREATE on the schema for the new owner; it is held for this statement only.
GRANT CREATE ON SCHEMA "core" TO closeline_core_key_lookup;
--> statement-breakpoint
ALTER FUNCTION "core"."api_key_for_hash"(text) OWNER TO closeline_core_key_lookup;
--> statement-breakpoint
REVOKE CREATE ON SCHEMA "core" FROM closeline_core_key_lookup;
