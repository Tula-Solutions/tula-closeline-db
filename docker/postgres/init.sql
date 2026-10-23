-- Creates the database roles Closeline needs before the first migration. Run once per database,
-- as a role that can create roles (the bootstrap superuser locally; infra elsewhere), with the
-- psql variables owner_password, auth_password, core_password, playbook_password and voice_password set.
-- The passwords come from the environment and are for LOCAL use only: real environments create
-- these roles with secrets from the secret store (tula-closeline-infra), not with this file.
--
-- closeline_owner  owns the database and every schema and table, and runs migrations
--                  (`bun run db:migrate`). Not a superuser, so row-level security binds it too.
-- closeline_<svc>  the one login of service <svc>. Owns nothing, has no BYPASSRLS, and gets
--                  rights on its own schema from migration 0000, never on another's.

CREATE ROLE closeline_owner LOGIN PASSWORD :'owner_password'
  NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
CREATE ROLE closeline_auth LOGIN PASSWORD :'auth_password'
  NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT NOBYPASSRLS;
CREATE ROLE closeline_core LOGIN PASSWORD :'core_password'
  NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT NOBYPASSRLS;
CREATE ROLE closeline_playbook LOGIN PASSWORD :'playbook_password'
  NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT NOBYPASSRLS;
CREATE ROLE closeline_voice LOGIN PASSWORD :'voice_password'
  NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT NOBYPASSRLS;

-- closeline_core_search  owns the Prospect search functions (migration 0030) and nothing else. It
--                  cannot log in and no service role is a member of it, so only a function it
--                  owns runs with its BYPASSRLS. That is what lets the trigram indexes serve the
--                  search: `ilike` is not leakproof, so a role bound by row-level security never
--                  gets the index. closeline_owner may SET ROLE to it (not inherit it), which is
--                  what `ALTER FUNCTION ... OWNER TO` needs.
CREATE ROLE closeline_core_search NOLOGIN
  NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT BYPASSRLS;
GRANT closeline_core_search TO closeline_owner WITH SET TRUE, INHERIT FALSE;

-- closeline_core_crm_lookup  owns core.crm_connection_for_account (migration 0033), the lookup a
--                  CRM webhook runs before it knows the Organization. Same shape as the role
--                  above, but it can read four routing columns of crm_connection and no token.
CREATE ROLE closeline_core_crm_lookup NOLOGIN
  NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT BYPASSRLS;
GRANT closeline_core_crm_lookup TO closeline_owner WITH SET TRUE, INHERIT FALSE;

-- closeline_core_key_lookup  owns core.api_key_for_hash (migration 0035), the lookup the API key
--                  exchange runs before it knows the Organization. Same shape as the roles above,
--                  but it can read six columns of api_keys: the hash it matches and the five it
--                  returns. It cannot read the name, prefix or anything else.
CREATE ROLE closeline_core_key_lookup NOLOGIN
  NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT BYPASSRLS;
GRANT closeline_core_key_lookup TO closeline_owner WITH SET TRUE, INHERIT FALSE;

-- The owner role owns this database, so it can create the schemas in migration 0000.
SELECT format('ALTER DATABASE %I OWNER TO closeline_owner', current_database()) \gexec
