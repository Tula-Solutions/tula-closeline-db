-- Creates the database roles Closeline needs before the first migration. Run once per database,
-- as a role that can create roles (the bootstrap superuser locally; infra elsewhere), with the
-- psql variables owner_password, auth_password, core_password and playbook_password set.
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

-- The owner role owns this database, so it can create the schemas in migration 0000.
SELECT format('ALTER DATABASE %I OWNER TO closeline_owner', current_database()) \gexec
