import { PgSchema as PgSchema_mtt0uw } from "drizzle-orm/pg-core";
/** The `auth` Postgres schema, owned by the auth service (login role `closeline_auth`). */
declare const authSchema: PgSchema_mtt0uw<"auth">;
import { PgSchema as PgSchema_mtt0uw2 } from "drizzle-orm/pg-core";
/** The `core` Postgres schema, owned by the core service (login role `closeline_core`). */
declare const coreSchema: PgSchema_mtt0uw2<"core">;
import { PgSchema as PgSchema_mtt0uw3 } from "drizzle-orm/pg-core";
/** The `playbook` Postgres schema, owned by the playbook service (login role `closeline_playbook`). */
declare const playbookSchema: PgSchema_mtt0uw3<"playbook">;
export { authSchema, coreSchema, playbookSchema };
