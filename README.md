# tula-closeline-db

Closeline database migrations and typed schema, one Postgres schema per service

Part of Closeline. The hub repo [`tula-closeline`](https://github.com/Tula-Solutions/tula-closeline)
holds the glossary, decision records, plans, issues and the shared workflow setup.

## Getting started

```bash
gh auth setup-git      # once: lets git fetch the private tula-closeline-* libraries over https
bun install
bun run verify
```

Standards: `AGENTS.md` (this repo) and `.claude/COMMON.md` (shared).

## Database

One Postgres per Region; each service owns one schema (`auth`, `core`, `playbook`) and writes it
through its own login role (`closeline_auth`, `closeline_core`, `closeline_playbook`). Migrations
are generated and applied only from this repo and never edited once on `develop`. Never
`drizzle-kit push`.

```bash
docker compose up -d --wait         # Postgres 18, the minimum; set POSTGRES_PORT if 5432 is taken
export DATABASE_URL=postgres://closeline_owner:closeline_owner_local@127.0.0.1:5432/closeline
bun run db:migrate                  # applies pending migrations as the owner role
```

The first start runs `docker/postgres/init.sh`, which creates the owner and service roles from
`docker/postgres/init.sql` (local passwords only, set in `docker-compose.yml`). To run it again,
`docker compose down -v`.

Integration tests need Postgres from the compose file. With none of the four connection
variables in `.env.example` set they use the compose defaults (port 5432, or `POSTGRES_PORT`), so
this is the whole of what CI runs:

```bash
docker compose up -d --wait && bun run test:integration
```

Set all four variables and `DATABASE_URL_ADMIN`, a superuser, together to test against another
Postgres (`DATABASE_URL_ADMIN` alone, or a partial set, is refused). The suites drop stale test
objects and alter roles, so they refuse any host that is not loopback unless
`ALLOW_NON_LOCAL_TEST_DATABASE=1` is set; use that only for a disposable database. The suites cover
role confinement, tenant isolation, the client's handling of lost connections, the migration
runner and the catalog check below.

`bun run db:migrate` fails unless it connects as `closeline_owner` (default privileges belong to
the role that creates a table), and gives its session a 10 second `lock_timeout`, so `ENABLE` or
`FORCE ROW LEVEL SECURITY` fails instead of queueing behind a long transaction. Retry it when the
database is quiet.

A data backfill on a table with forced row-level security must set the Organization for every
batch (`withOrganization`, or `select set_config('app.organization_id', ..., true)` in the
batch's transaction). Without it the policy matches nothing, and the `UPDATE` or `DELETE` reports
success with zero rows changed.

`bun run db:check:rls` (with `DATABASE_URL` set) fails when any table lacks `organization_id`,
forced row-level security, or exactly the policy `tenantRlsStatements` writes, unless it is on
`NON_TENANT_TABLES` (the two `core` directories and `core.organization_state` today, each with
its reason in `NON_TENANT_TABLE_REASONS`; an entry needs a decision record in the hub), and then
fails if any service role or `PUBLIC` holds any of `SELECT`, `INSERT`, `UPDATE`, `DELETE`,
`TRUNCATE`, `REFERENCES`, `TRIGGER` or `MAINTAIN` on such a table, at table or column level, since only a
`SECURITY DEFINER` function may reach it (a read would list every Organization, a write could forge
a user-to-Organization mapping or free a user). The `auth` tables are not
skipped: each is verified under `ENVIRONMENT_SCOPED_TABLES` or `CONTROL_PLANE_TABLES` (see below),
and an `auth` table in neither is a gap. It scans every schema except `public` and drizzle's own, so a table in a schema that is not `auth`,
`core` or `playbook` is a gap, and so is a `closeline_*` role that is a superuser or has
`BYPASSRLS`, or is a member of any role other than `pg_monitor`, `pg_read_all_settings`,
`pg_read_all_stats` and `pg_stat_scan_tables` (`ALLOWED_PREDEFINED_ROLES`; the service roles are
`NOINHERIT`, so a privilege reached through a role such as `pg_write_all_data` would not show in the
table checks). Roles are created and granted by an account whose name does not start with
`closeline_`, so that a grant made on creation never makes a service role a member. The integration suite runs the same check, so a migration
that forgets `tenantRlsStatements` fails CI. The tests that change role attributes connect as the
compose superuser, or as `DATABASE_URL_ADMIN` when you point at another Postgres.

Changing the schema: edit `src/schema/`, run `bun run db:generate`, read the SQL, commit it.
`bun run db:check` (part of `verify`) fails when the schema and the migrations disagree, when a
migration that exists on `origin/develop` (or `MIGRATIONS_BASE_REF`) was edited or deleted, or when
the journal's `when` values do not strictly increase. Without that ref it warns locally and fails
when `CI` is set. A new
tenant table carries `organization_id` and runs the statements from `tenantRlsStatements` in its
migration; tenant data is read and written only inside `withOrganization(db, organizationId, fn)`.

## The auth schema

The `auth` schema is tula-auth's tables, copied (ADR 0005) with the same names and columns so
`tula-closeline-auth` runs the same code: 30 tables, from `workspaces` and `projects` down to
`users`, `sessions`, `signing_keys` and the webhook outbox. Migration `0001` is all 36 of
tula-auth's migrations (`0000` to `0035`) at their latest state, with `tula` renamed `auth` and
`tula_app` renamed `closeline_auth`.

- Auth users are global within a Region, so no auth table has `organization_id` and none is under
  the Organization policy. Organizations, Teams and roles live in core.
- The check verifies every auth table, in one of two exported categories. `ENVIRONMENT_SCOPED_TABLES`
  (25) must have row-level security enabled and forced, no `organization_id`, and exactly one
  permissive policy: for all commands, with `ENVIRONMENT_POLICY_EXPRESSION` as both its USING and
  WITH CHECK, reading the setting `tula.environment_id` (`ENVIRONMENT_SETTING`). Restrictive
  policies (retention floors) may be added to it. `CONTROL_PLANE_TABLES` (5: `api_keys`,
  `workspaces`, `projects`, `environments`, `instance_audit_logs`) have no such policy, only no
  `organization_id`, each with its reason in `CONTROL_PLANE_TABLE_REASONS`. Run auth queries
  inside `withEnvironment(db, environmentId, fn)`.
- Only `closeline_auth` can reach the schema, with tula-auth's least-privilege grants: no
  `DELETE` on the control plane, no `UPDATE` on the audit logs, column-level `UPDATE` on the
  outbox and the counters. `auth.applied_migrations()` is the only way it reads migration history.
- **Adding an auth table.** Its migration grants `closeline_auth` exactly what its code path needs,
  because the schema's default privileges are revoked: a new table (or sequence) in `auth` grants
  nothing until a `GRANT` in its own migration says so. (`core` and `playbook` keep their defaults,
  and `closeline_core` and `closeline_playbook` hold no privilege on any auth relation.) Then add
  the table to `ENVIRONMENT_SCOPED_TABLES` (with `environment_id` and the
  `tenantConstraints` policy plus `FORCE ROW LEVEL SECURITY` by hand) or to
  `CONTROL_PLANE_TABLE_REASONS` (with a reason) in `src/isolation.ts`, and add its grant to
  `TABLE_GRANTS` in `src/auth.integration.ts`. Without a category the isolation check, and CI, fail.
- One fixed project per Region is data, not schema: nothing in the tables limits a Region to one
  project. The auth service must bootstrap one workspace and one project, with a development and a
  production environment, and refuse to create more.

## The core schema

Organizations and who belongs to them (tickets: hub issue 9). All five tenant tables carry
`organization_id` and the canonical policy; ids are the contract's prefixed text (`org_`, `usr_`,
`mem_`, `team_`, and `inv_` for invitations), each checked by a constraint.

**Minimum Postgres: 18**, the major version in `docker-compose.yml` and the only one CI runs.
(`ON DELETE SET NULL (team_id)` alone needs 15.)

| Table | Holds |
| --- | --- |
| `organizations` | the Organization; keyed by `organization_id`; Region fixed at creation; `owner_count` is trigger-kept |
| `memberships` | a user (opaque `usr_` id, no cross-schema key) in an Organization with one of the four roles |
| `teams`, `team_members` | Teams; composite keys `(organization_id, id)` make a member and Team of different Organizations impossible |
| `invitations` | email, role (never Owner), optional Team, SHA-256 of the token (never the token), expiry, `pending`/`accepted`/`revoked` |
| `membership_directory`, `invitation_directory`, `organization_state` | see below |

Rules held by the database:

- The Region never changes (trigger; the service role also has no `UPDATE` on it).
- An `active` or `suspended` Organization always has an Owner. It commits only with its first Owner,
  and the last Owner cannot be removed or demoted: the `track_owner_count` trigger updates the
  Organization's `owner_count`, whose row lock serialises concurrent changes at any isolation
  level, so ownership transfers by promoting before demoting. A `deleted` Organization (kept for
  retention) may have every membership removed, the last Owner included, so a retention job can
  empty it and free its users to join another Organization; an emptied Organization cannot go back
  to `active` or `suspended`.
- A user belongs to exactly one Organization.
- One pending invitation per email per Organization. An invitation's role is never Owner
  (ownership passes by promotion). `accepted` and `revoked` are final: no statement that sets the
  state, its timestamps, the `id` or the `token_hash` on such a row is accepted, so an invitation
  cannot be accepted twice and a used hash cannot be moved off its row and issued again. The
  database refuses to accept an invitation at or after `expires_at` (it can still be revoked; the
  instant itself is expired, and the check reads the clock when it runs, so an accept that waited
  for a lock past the expiry is refused) or unless its Organization is `active`. `closeline_core`
  cannot remove invitations: they are revoked, and only deleting the Organization removes them.
- **An invitation token must be at least 128 bits from a cryptographically secure generator.** The
  database stores and sees only the hash, so it cannot check the entropy; the service enforces it.
- **Accepting an invitation and creating its membership is one transaction in the service.**
  Update with `WHERE id = $1 AND state = 'pending'` and treat zero rows as already used.
- Emails are stored folded and are checked: lower-case in the ASCII range only (`lower()` in the
  explicit `"C"` collation, so the result does not depend on the cluster's locale), printable
  ASCII only (`^[!-~]+$`: no space, control or non-ASCII character, so no zero-width or no-break
  space, direction override or fullwidth `@`), exactly one `@`, neither first nor last.
  **Internationalised domains are stored in their ASCII (A-label, `xn--`) form; the service
  converts before it writes.** Team `name_key` folds the same way. **The service must fold with the
  same ASCII-only rule** (`replace(/[A-Z]/g, ...)`, not `toLowerCase()`, which also folds `É`) and
  validate the full address at the edge: the database check is a backstop, not an address parser
  (it still allows characters such as `,` and `"` in the local part).
- Bulk emptying with `TRUNCATE` is refused on `organizations`, `memberships`, `invitations` and the
  three no-access tables, because it would skip the row triggers that keep them and the Owner count
  in step. A row `DELETE` fires them.

**Directories and the status table.** Sign-in must find a user's Organization, and accepting an
invitation must find the Organization of a token hash, before any Organization is known, so
neither can sit behind row-level security. Each is a narrow table kept by `SECURITY DEFINER`
triggers in the same transaction as the tenant row, and **no service role holds any privilege on
any of the three no-access tables**: a service connection that could `SELECT` them could list every
user, Organization and token hash in the Region, and with the Organization ids it could set
`app.organization_id` to each in turn. One that could write them could forge a mapping.

| Table | Holds |
| --- | --- |
| `membership_directory` | user id and Organization id: one row per membership |
| `invitation_directory` | token hash, Organization id, invitation id and expiry: one row per pending invitation |
| `organization_state` | Organization id and status: **one row per Organization** |

`closeline_core` has two functions instead, each for one exact key and returning at most one row:

| Function | Returns |
| --- | --- |
| `core.organization_of_user(user_id)` | `organization_id` and `status` of the user's Organization; `organizationOfUser(db, userId)` |
| `core.invitation_for_token(token_hash)` | `organization_id` and `invitation_id`, only for an invitation that is pending, unexpired and in an `active` Organization; `invitationForToken(db, tokenHash)` |

Both are `STABLE SECURITY DEFINER` with `search_path = pg_catalog, pg_temp`; `EXECUTE` is revoked
from `PUBLIC` and granted to `closeline_core` alone (together with `core.has_expired`, the pure
rule that both the lookup and the accept guard use to decide that an invitation has expired). They
run as the owner, which row-level security also binds, and no Organization is set when they run, so
they read only the three no-access tables, joining `organization_state` for the status. A used,
revoked, expired or unknown token, and one of a suspended or deleted Organization, all give no row,
so a caller cannot tell them apart. A service connection can therefore learn, for a user id or
token hash it already holds, that user's Organization and its status, or that token's Organization
and invitation; and, because the unique constraint below fires on insert, that a user id it tries
to add already belongs to some Organization. It learns nothing about ids it does not hold.

**The cost of a status change is one row, whatever the size of the Organization.** The status is
not copied into the directories. A trigger on `organizations` writes `organization_state` (an
insert creates the row, a change of `status` updates it, deleting the Organization cascades) in the
same transaction, and an update that leaves the status as it was writes nothing. Suspending an
Organization of 100,000 members therefore writes two rows (the Organization and its state), takes
milliseconds, and holds no per-member lock; the integration suite seeds such an Organization and
asserts the rows written, which is the proof (a return to a per-member fan-out would write 100,000).
Nothing about the directories goes
stale when a member is written concurrently with a suspension, at any isolation level
(`READ COMMITTED`, `REPEATABLE READ` or `SERIALIZABLE`): the member's directory row and the
suspended state row are separate facts, both visible to every lookup after both commit.

**Deleting an Organization is work proportional to its size, so run it as a background job.** The
cascade removes every membership, and each one's directory row, one row at a time through the row
triggers (a 100,000-member Organization takes a few seconds of database time in one transaction,
holding its rows throughout), so it must never be on a request path. Suspending or reactivating it
is not: that is the one-row status change above. Each directory row is removed by an exact key, and
the two directory writers (`sync_membership_directory`, `sync_invitation_directory`) are pinned to
`plan_cache_mode = force_custom_plan`. Without that, a statement in a function settles on one
generic plan after a few runs and keeps it for the life of the connection; a plan built while the
directory was small is a sequential scan, and kept while the table grows it made deleting a large
Organization quadratic (100,000 members did not finish in two minutes, against about four seconds
now; `src/core-plans.integration.ts` asserts the tuples read, not the time). For the same reason
neither directory has an index on `organization_id` alone: nothing reads them by Organization.

Look up, then `withOrganization` for the Organization it names, then read the real row. The
catalog check (`findTenantIsolationGaps`, `bun run db:check:rls`) reports a gap if any service role
or `PUBLIC` holds any privilege on a table on `NON_TENANT_TABLES`, at table or column level.

**Exactly one Organization per user** is the unique constraint
`membership_directory_one_organization_per_user` on `membership_directory.user_id`. It has to sit
there: a unique index on `memberships` cannot see rows hidden by row-level security. To allow
several Organizations per user, one migration drops that constraint **and** replaces
`organization_of_user`, whose "at most one row" rests on it.

**Concurrency, lock order and retries.** The Owner counter moves once per row, not once per
statement. So one statement that both promotes a member and demotes the sole Owner is refused
(`core.last_owner`) if its rows are processed Owner first and allowed if the promotion comes first,
though both end with one Owner; promote in one statement and demote in the next.

Lock order: a change to an Owner takes the Organization's row (a write lock) first, then the
directory row. The `track_owner_count` trigger is named to sort before the directory trigger
(`memberships_a_track_owner_count`, then `memberships_b_sync_directory`) so that holds, and writing
a member or an invitation otherwise takes only the foreign key's key-share lock on the
Organization row, which a status change does not conflict with. So non-Owner member writes and
invitation creation do not wait for a status change; an accept (which share-locks the row to read
its status) and any Owner change do. Two Owner inserts into one Organization queue on the row, and
an Owner's removal queues behind a status change on it, with no deadlock (both are tested). Three
cases can still deadlock: transactions that update the same rows in opposite orders around the
Organization's Owner lock; one that accepts an invitation and then changes an Owner while another
does the same; and an accept racing the Organization's deletion (the accept holds the invitation
row and waits for the Organization row, the delete holds the Organization row and cascades into the
invitation). Callers retry a transaction on SQLSTATE `40001` (serialization
failure, which `REPEATABLE READ` and `SERIALIZABLE` raise) and `40P01` (deadlock), with a bounded,
jittered retry.

Keyset lists, each on an index (the schema comments name the query): members of an Organization
(`memberships_organization_id_id_key`), Teams (`teams_organization_name_key` on `name_key`, the
ASCII-lower-cased name), members of a Team (`team_members_pkey`), Teams of a member
(`team_members_membership_idx`), pending invitations (`invitations_pending_list_idx`).
