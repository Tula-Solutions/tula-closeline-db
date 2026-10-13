CREATE SCHEMA "auth";
--> statement-breakpoint
CREATE SCHEMA "core";
--> statement-breakpoint
CREATE SCHEMA "playbook";
--> statement-breakpoint
-- Service roles (closeline_auth, closeline_core, closeline_playbook) are created before this runs,
-- by docker/postgres/init.sql locally and by tula-closeline-infra elsewhere. A role may use only
-- its own schema. None of them owns a table or can create one: the owner role that runs this
-- migration does, and the default privileges below make every table it creates later usable by
-- the schema's own role and by no other. Run every migration as that same owner role: default
-- privileges apply to the role that creates the object.
--
-- Nothing in the default public schema is open to the service roles. The first statement removes
-- what every role inherits from PUBLIC (USAGE, and CREATE on a database older than PostgreSQL 15).
REVOKE ALL ON SCHEMA public FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON SCHEMA public FROM closeline_auth;
--> statement-breakpoint
REVOKE ALL ON SCHEMA public FROM closeline_core;
--> statement-breakpoint
REVOKE ALL ON SCHEMA public FROM closeline_playbook;
--> statement-breakpoint
REVOKE ALL ON SCHEMA "auth" FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "auth" TO closeline_auth;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "auth" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO closeline_auth;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "auth" GRANT USAGE, SELECT ON SEQUENCES TO closeline_auth;
--> statement-breakpoint
REVOKE ALL ON SCHEMA "core" FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "core" TO closeline_core;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "core" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO closeline_core;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "core" GRANT USAGE, SELECT ON SEQUENCES TO closeline_core;
--> statement-breakpoint
REVOKE ALL ON SCHEMA "playbook" FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "playbook" TO closeline_playbook;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "playbook" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO closeline_playbook;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "playbook" GRANT USAGE, SELECT ON SEQUENCES TO closeline_playbook;
