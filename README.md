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
docker compose up -d --wait         # Postgres 18; set POSTGRES_PORT if 5432 is taken
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
`NON_TENANT_TABLES` (the two `core` directories today, each with its reason in `NON_TENANT_TABLE_REASONS`; an entry needs a decision record in the hub). The `auth` tables are not
skipped: each is verified under `ENVIRONMENT_SCOPED_TABLES` or `CONTROL_PLANE_TABLES` (see below),
and an `auth` table in neither is a gap. It scans every schema except `public` and drizzle's own, so a table in a schema that is not `auth`,
`core` or `playbook` is a gap, and so is a `closeline_*` role that is a superuser or has
`BYPASSRLS`. The integration suite runs the same check, so a migration that
forgets `tenantRlsStatements` fails CI. The tests that change role attributes connect as the
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

| Table | Holds |
| --- | --- |
| `organizations` | the Organization; keyed by `organization_id`; Region fixed at creation; `owner_count` is trigger-kept |
| `memberships` | a user (opaque `usr_` id, no cross-schema key) in an Organization with one of the four roles |
| `teams`, `team_members` | Teams; composite keys `(organization_id, id)` make a member and Team of different Organizations impossible |
| `invitations` | email, role, optional Team, SHA-256 of the token (never the token), expiry, `pending`/`accepted`/`revoked` |
| `membership_directory`, `invitation_directory` | see below |

Rules held by the database: the Region never changes (trigger; the service role also has no
`UPDATE` on it); an Organization always has an Owner (an Organization commits only with its first
Owner, and the last Owner cannot be removed or demoted: the `track_owner_count` trigger updates the
Organization's `owner_count`, whose row lock serialises concurrent changes at any isolation level,
so ownership transfers by promoting before demoting); one pending invitation per email per
Organization; accepted and revoked invitations are final; a user belongs to exactly one Organization.

**Directories.** Sign-in must find a user's Organization, and accepting an invitation must find
the Organization of a token hash, before any Organization is known, so neither can sit behind
row-level security. Each is a narrow mapping table (`user_id` to `organization_id`; `token_hash` to
`organization_id` and `invitation_id`), kept by `SECURITY DEFINER` triggers in the same
transaction as the tenant row, readable by `closeline_core` and writable by nothing else. Read the
directory, then `withOrganization` for the Organization it names, then read the real row. A reader
learns which Organization a user or token belongs to, and nothing else.

**Exactly one Organization per user** is the unique constraint
`membership_directory_one_organization_per_user` on `membership_directory.user_id`. It has to sit
there: a unique index on `memberships` cannot see rows hidden by row-level security. To allow
several Organizations per user, one migration runs `ALTER TABLE core.membership_directory DROP
CONSTRAINT membership_directory_one_organization_per_user`; nothing else changes.

Keyset lists, each on an index (the schema comments name the query): members of an Organization
(`memberships_organization_id_id_key`), Teams (`teams_organization_name_key` on `name_key`, the
lower-cased name), members of a Team (`team_members_pkey`), Teams of a member
(`team_members_membership_idx`), pending invitations (`invitations_pending_list_idx`).
