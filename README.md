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
  (26) must have row-level security enabled and forced, no `organization_id`, and exactly one
  permissive policy: for all commands, with `ENVIRONMENT_POLICY_EXPRESSION` as both its USING and
  WITH CHECK, reading the setting `tula.environment_id` (`ENVIRONMENT_SETTING`). Restrictive
  policies (retention floors) may be added to it. `CONTROL_PLANE_TABLES` (6: `api_keys`,
  `attempt_counters`, `workspaces`, `projects`, `environments`, `instance_audit_logs`) have no such policy, only no
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
- **Tables added since `0001`** (not tula-auth's; they keep auth's conventions):
  - `auth.abandon_cases` (migration `0006`, hub issue 36, ADR 0011): an Organization core made
    during a sign-up whose account was never written, kept so a sweep can ask core to abandon it
    and the case is not lost when a process stops. **Ids only, no personal data**: the Organization
    (`core_organization_id`, a uuid the service formats as `org_<32 hex>`; not named
    `organization_id` because no auth table may carry that column), the user id the attempt fixed
    and the flow attempt id (no foreign keys to either: neither has an account or outlives its
    purge). It is environment-scoped like `flow_attempts` (written at the same point of a sign-up,
    when the environment is known), so it is in `ENVIRONMENT_SCOPED_TABLES` and needs no allowlist
    entry. `attempts` is 0 to 100, `outcome` is `done`, `refused` or `gave_up` and is set exactly
    when `resolved_at` is.
    - **One case per Organization and one per attempt** in an environment (two unique keys).
      `core_organization_id` is nullable, for a timed-out create whose Organization id was never
      learned: that case is keyed by its attempt, and the service fills the id in once it learns
      it (`update ... set core_organization_id`). The Organization key relies on Postgres treating
      nulls as distinct in a unique key (`NULLS DISTINCT`, the default), so any number of cases
      without an id coexist.
    - **A resolved case blocks a new case for the same Organization (and attempt) until the purge
      removes it.** That is acceptable because core gives a retrying user a fresh Organization id
      (a create is idempotent on the user id, and abandoning frees it), so the same id is not
      recorded again; and it is why `on conflict do nothing` is silent by design: no row back
      means "already recorded", never an error to retry.
    - **The sweep's rule.** `attempt_expires_at` is the time after which the attempt can no longer
      write an account, supplied at insert (the attempt's expiry), so the sweep does not depend on
      the `flow_attempts` row, which is purged seconds after it expires. The table keeps
      `next_attempt_at >= attempt_expires_at` (`abandon_cases_due_after_expiry`), and a case is due
      when `next_attempt_at` has passed by the database clock: so a case is never due while its
      attempt can still write the account, and the claim needs no second condition.
      **The grace.** An attempt's expiry is not yet proof that no account will be written: a
      request that started before it can commit its account up to the call bound later, and an
      abandon could then delete a working Owner's Organization. So `ABANDON_RECORD` takes a grace
      in milliseconds and stores `next_attempt_at = attempt_expires_at + grace`. The service
      passes its call bound plus a skew margin; a grace below `ABANDON_MIN_GRACE_MS` (10 s, the
      retention floor) is raised to it, and that floor is the least safe value, not a good one.
    - **A spent case cannot wedge the batch.** The claim counts an attempt, and the table bounds
      `attempts` at 100, so a case at 100 would abort the statement for every sweeper. The claim
      therefore skips cases with `attempts >= 100` (the bound is one shared constant,
      `ABANDON_CASE_MAX_ATTEMPTS`). **Who sets `gave_up`**: the service, with `ABANDON_RESOLVE`,
      when a claimed case reaches the service's own attempt limit (lower than the bound); and
      `ABANDON_GIVE_UP_SPENT`, a safety net run now and then, for open cases that nevertheless
      used all 100 and whose lease has ended.
    - **How the statements are run.** Every `abandon_cases` statement runs inside
      `withEnvironment` (the table has forced row-level security, so outside it nothing is visible
      and nothing can be written). Run `ABANDON_PURGE_BATCH` there too, once per environment.
      The strings are plain text, not type-checked against the schema: the integration suite is
      their only guard, and a change to a column needs the statements and their tests changed
      together.
    - **The batch is a lease, not one long transaction.** A short transaction claims due cases
      with `for update skip locked`, pushes `next_attempt_at` forward by the lease and counts the
      attempt, and commits; core is called outside any transaction; a second short transaction
      records the outcome. A worker that dies leaves its cases due again when the lease ends. The
      service gives up (`gave_up`) at its own attempt limit, below the table's bound of 100. The
      service role may update `core_organization_id`, `attempts`, `next_attempt_at`,
      `resolved_at`, `outcome` and `updated_at` and nothing else, and may delete only resolved
      rows (`abandon_cases_resolved_only`). Run the sweep once per environment inside
      `withEnvironment`. The statements, exactly as the integration tests run them (also exported
      from the library as `ABANDON_RECORD`, `ABANDON_CLAIM`, `ABANDON_RESOLVE` and
      `ABANDON_PURGE_BATCH`):

    Record a case:

    ```sql
    insert into auth.abandon_cases
      (id, project_id, environment_id, core_organization_id, user_id, attempt_id,
       attempt_expires_at, next_attempt_at)
    values ($1, $2, $3, $4, $5, $6, $7::timestamptz,
            $7::timestamptz + make_interval(secs => greatest($8::int, 10000)::float8 / 1000))
    on conflict do nothing
    returning id
    ```

    Claim a batch (`$3` is the lease in milliseconds):

    ```sql
    with due as (
      select id from auth.abandon_cases
      where environment_id = $1 and resolved_at is null and attempts < 100
        and next_attempt_at <= clock_timestamp()
      order by next_attempt_at
      limit $2
      for update skip locked)
    update auth.abandon_cases c
    set attempts = c.attempts + 1,
        next_attempt_at = clock_timestamp() + make_interval(secs => $3::float8 / 1000),
        updated_at = clock_timestamp()
    from due
    where c.id = due.id
    returning c.id, c.core_organization_id, c.user_id, c.attempt_id, c.attempts
    ```

    Record the outcome (also how the service sets `gave_up` at its own limit):

    ```sql
    update auth.abandon_cases
    set resolved_at = clock_timestamp(), outcome = $3, updated_at = clock_timestamp()
    where id = $1 and environment_id = $2 and resolved_at is null
    returning id
    ```

    The safety net for spent cases:

    ```sql
    update auth.abandon_cases
    set resolved_at = clock_timestamp(), outcome = 'gave_up', updated_at = clock_timestamp()
    where id in (
      select id from auth.abandon_cases
      where environment_id = $1 and resolved_at is null and attempts >= 100
        and next_attempt_at <= clock_timestamp()
      order by next_attempt_at
      limit $2
      for update skip locked)
    returning id
    ```

    Fill in the Organization id once it is learned. Another case already holding that Organization
    id is the unique violation `abandon_cases_environment_organization_key` (SQLSTATE 23505):
    that Organization is already tracked, so the service resolves this case with `ABANDON_RESOLVE`
    as `gave_up` and does nothing else:

    ```sql
    update auth.abandon_cases
    set core_organization_id = $3, updated_at = clock_timestamp()
    where id = $1 and environment_id = $2 and core_organization_id is null and resolved_at is null
    returning id
    ```

    Purge resolved cases, one bounded batch at a time:

    ```sql
    delete from auth.abandon_cases
    where id in (
      select id from auth.abandon_cases
      where environment_id = $1 and resolved_at is not null
        and resolved_at < clock_timestamp() - interval '1 day'
      order by resolved_at
      limit $2
      for update skip locked)
    ```

  - `auth.attempt_counters` (migration `0007`, hub issue 30, ADR 0014): the sign-in lockout and
    rate-limit counters, moved from process memory so every instance shares one budget. **One
    table for both ports**, `kind` being `lockout` or `rate_limit`: a lockout row is failures, a
    lock and a forgetting time; a rate-limit row is requests and a fixed window; both are a count
    with a start and an end, so a second table would only repeat the columns. The key is
    `(environment_id, kind, key_hash)`, a composite primary key and no surrogate id (an `id` would
    only add an index to a table written on every sign-in). `key_hash` is 32 bytes, an HMAC-SHA-256
    of the port's key computed by the service with a key that never reaches the database: **no
    address and no IP address is stored**, and a guess at one cannot be tested against the rows.
    Rotating the key restarts every counter, and rows live for hours, so nothing is migrated.
    - **The database clock is the authority.** Every statement reads `clock_timestamp()` inside
      itself (in a `do update`, after the row lock is taken) for the lock test, the window expiry
      and every stored time. The service passes durations (the wait schedule, the window length),
      never a point in time, so instance clock skew and two sign-ins that read their clocks before
      waiting for a connection cannot make a stored time go backwards. Tests move time by
      back-dating rows, never by sleeping. **The clock is read once per statement** in the
      `do update` branch (a `with ts as (select clock_timestamp() as tick)` read by every clause),
      so a row cannot take its count from the old window and its times from the new one. That one
      read is made only by the `do update` clauses, which Postgres evaluates after it has locked
      the row (a common table expression runs when it is first read), never by the `values` row,
      which is evaluated before the conflict is found. The `values` row reads the clock itself, so
      a first failure's times differ by microseconds, which is why no check orders a lock against
      `started_at`.
    - **Checks:** kind known; `key_hash` 32 bytes; `hits` 1 to 1,000,000; `expires_at >
      started_at`; a lock exactly on `lockout` rows (`lock_whole`); a lock no later than
      `expires_at` (`lock_before_expiry`). Dropped: `locked_until >= started_at`, which the
      service's own times could violate when two sign-ins were counted out of order and which the
      database clock makes meaningless to enforce.
    - **No row-level security and no `organization_id`** (a sign-in is counted before any account
      is known), so it is a `CONTROL_PLANE_TABLES` entry with its reason, not an
      Organization-allowlist entry (those forbid every service-role privilege, and the service
      must write this one). Its reach is the grants: `SELECT`, `INSERT`, `DELETE`, and `UPDATE` of
      `hits`, `started_at`, `locked_until` and `expires_at` only. Without row-level security the
      service role can delete another environment's counters in the same Region; that is the same
      trust level as the other control-plane tables, and the rows hold only hashes.

    One attempted sign-in is one statement (`$1` environment, `$2` key hash, `$3` the wait in
    milliseconds after failure 1, 2, 3, ... as an `int[]` built from `lockoutDelayMs`, whose last
    element serves every later failure so the policy stays in the service, `$4` the forgetting
    period in milliseconds). A row back means the attempt goes ahead (`wait_ms` is the wait this
    failure imposes). No row back means the address is locked and the attempt was not counted; the
    retry time then comes from a second read, which can race (the row may be cleared or unlocked
    in between, giving no row or 0). In that case the service runs the attempt statement again at
    most once, and otherwise answers locked with a `Retry-After` of at least
    `LOCKOUT_MIN_RETRY_AFTER_MS` (1 s).

    **How they are run.** The attempt-counter statements run on the pool, each with an explicit
    `environment_id` parameter (the table has no row-level security, so nothing scopes them
    for you); `COUNTER_PURGE_BATCH` crosses environments on purpose. The strings are not
    type-checked against the schema; the integration suite is their only guard.

    ```sql
    with ts as (select clock_timestamp() as tick)
    insert into auth.attempt_counters as c
      (environment_id, kind, key_hash, hits, started_at, locked_until, expires_at)
    values ($1, 'lockout', $2, 1, clock_timestamp(),
            clock_timestamp() + make_interval(secs => ($3::int[])[1]::float8 / 1000),
            clock_timestamp() + make_interval(secs => (($3::int[])[1] + $4::int)::float8 / 1000))
    on conflict (environment_id, kind, key_hash) do update set
      hits = least(case when c.expires_at <= (select tick from ts) then 1 else c.hits + 1 end, 1000000),
      started_at = case when c.expires_at <= (select tick from ts) then (select tick from ts) else c.started_at end,
      locked_until = (select tick from ts) + make_interval(secs => ($3::int[])[least(case when c.expires_at <= (select tick from ts) then 1 else c.hits + 1 end, cardinality($3::int[]))]::float8 / 1000),
      expires_at = (select tick from ts) + make_interval(secs => (($3::int[])[least(case when c.expires_at <= (select tick from ts) then 1 else c.hits + 1 end, cardinality($3::int[]))] + $4::int)::float8 / 1000)
    where c.locked_until <= (select tick from ts)
    returning hits, ($3::int[])[least(hits, cardinality($3::int[]))] as wait_ms
    ```

    After a refused attempt:

    ```sql
    select greatest(0, ceil(extract(epoch from locked_until - clock_timestamp()) * 1000))::int as retry_after_ms
    from auth.attempt_counters
    where environment_id = $1 and kind = 'lockout' and key_hash = $2
    ```

    A right password:

    ```sql
    delete from auth.attempt_counters
    where environment_id = $1 and kind = 'lockout' and key_hash = $2
    ```

    A rate-limit hit (`$3` is the window in milliseconds; allowed when `hits <= limit`; requests
    over the limit are counted too, as the memory adapter does):

    ```sql
    with ts as (select clock_timestamp() as tick)
    insert into auth.attempt_counters as c
      (environment_id, kind, key_hash, hits, started_at, expires_at)
    values ($1, 'rate_limit', $2, 1, clock_timestamp(),
            clock_timestamp() + make_interval(secs => $3::float8 / 1000))
    on conflict (environment_id, kind, key_hash) do update set
      hits = case when c.expires_at <= (select tick from ts) then 1 else least(c.hits + 1, 1000000) end,
      started_at = case when c.expires_at <= (select tick from ts) then (select tick from ts) else c.started_at end,
      expires_at = case when c.expires_at <= (select tick from ts)
                        then (select tick from ts) + make_interval(secs => $3::float8 / 1000)
                        else c.expires_at end
    returning hits, greatest(0, ceil(extract(epoch from expires_at - clock_timestamp()) * 1000))::int as retry_after_ms
    ```

    Postgres serialises concurrent statements on the row (a second instance waits for the first
    to commit, then adds to its result), so two instances never lose a count; a first failure that
    races for a new row is counted by the loser's `do update`. A row is dead once `expires_at` has
    passed (the next attempt restarts it), so purge expired rows in bounded batches over
    `attempt_counters_purge_idx`, a minute behind the clock, repeating while a batch comes back
    full:

    ```sql
    delete from auth.attempt_counters
    where (environment_id, kind, key_hash) in (
      select environment_id, kind, key_hash from auth.attempt_counters
      where expires_at < clock_timestamp() - interval '1 minute'
      order by expires_at
      limit $1
      for update skip locked)
    ```

    The **known-device cookie** (ADR 0014) is signed and verified in the service and needs no
    table.
- One fixed project per Region is data, not schema: nothing in the tables limits a Region to one
  project. The auth service must bootstrap one workspace and one project, with a development and a
  production environment, and refuse to create more.

## The core schema

Organizations and who belongs to them (tickets: hub issue 9), and the idempotency keys of its public
`POST` routes (hub issue 33). All six tenant tables carry
`organization_id` and the canonical policy; ids are the contract's prefixed text (`org_`, `usr_`,
`mem_`, `team_`, and `inv_` for invitations), each checked by a constraint.

**Minimum Postgres: 18**, the major version in `docker-compose.yml` and the only one CI runs.
(`ON DELETE SET NULL (team_id)` alone needs 15.)

| Table | Holds |
| --- | --- |
| `organizations` | the Organization; keyed by `organization_id`; Region fixed at creation; `owner_count` is trigger-kept |
| `memberships` | a user (opaque `usr_` id, no cross-schema key) in an Organization with one of the four roles, and core's copy of the member's `email` (required) and `name` (optional); see below |
| `teams`, `team_members` | Teams; composite keys `(organization_id, id)` make a member and Team of different Organizations impossible |
| `invitations` | email, role (never Owner), optional Team, SHA-256 of the token (never the token), expiry, `pending`/`accepted`/`revoked`; indexed by `invitations_state_list_idx` (below) |
| `idempotency_keys` | the outcome of one public `POST`, per Organization, user, route and client key; see below |
| `membership_directory`, `invitation_directory`, `organization_state` | see below |

`invitations` has `invitations_state_list_idx` on `(organization_id, state, created_at, id)`, which
serves the two queries the pending-only list index does not: a page of invitations in any one state,
newest first (read backwards, no sort), and a capped count of those created since a time across all
three states, revoked included. Migration `0003` builds it under a write lock, because migrations
run in a transaction and cannot use `CONCURRENTLY`: apply it before core takes traffic or while
`core.invitations` is small. A later index on a large table needs a separate step outside a
transaction.

**A member's email and name** (`memberships.email`, `memberships.name`, migration `0005`, ADR 0015).
Core keeps a copy so the member list needs no second service; auth stays the source of truth. `email`
is `NOT NULL` with no default and the same check as `invitations.email` (`memberships_email_shape`:
lower-case ASCII, one `@`, printable ASCII, 3 to 320 characters). `name` is nullable (a person may
have none) and, when present, 1 to 201 characters after trimming surrounding spaces
(`memberships_name_shape`; 201 is auth's two optional 100-character names joined by one space, the
contract's `MAX_PERSON_NAME_LENGTH`, one more than the 200 of Organization and Team names). `memberships_organization_email_idx` on `(organization_id, email)` is
plain, not unique, so "is this address already a member" does not scan an Organization's members
(auth owns the address, and a stale copy must not make a later change fail); there is none on
`name`. The database's name rule is the looser bound (it trims spaces only and does not reject
control characters); core stores only the contract's trimmed output. The existing row-level security and
table-wide grants cover both columns.

**Migration `0005` refuses to run over existing memberships.** A membership without an email must
not exist, and the migration invents none, so it raises
`core.memberships already has rows, and the new required column email has no value to give them`
if any membership exists (checked on `membership_directory`, since row-level security hides the
rows from the owner). No deployed environment has any; a developer's local database might. Reset
it: in this repo's compose, `docker compose down -v`, `docker compose up -d --wait`, then
`bun run db:migrate`; in the hub dev stack, `bun run dev --down --volumes`.

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

**Idempotency keys** (`core.idempotency_keys`, migration `0004`). One row per `(organization_id,
user_id, route, key)`, which is the primary key in that order, so another Organization, user or
route can reuse a client key. `route` is a short name such as `invitations.create` (1 to 64 of
`a-z`, `0-9`, `.`, `_`), `key` is 1 to 255 printable ASCII characters (no space), `request_hash` is
the 32-byte SHA-256 of the request body (the body is never stored), `status` is the stored HTTP
status (100 to 599) and `response` the stored body. A request is **in flight** while both are null;
a check ties them together (null exactly together), and `response` is at most 16384 bytes of its
text form (`octet_length(response::text)`, the same however the value reaches the table, so a small
body that is large as binary jsonb, such as an array of 2,000 integers, is accepted and a compressed
stored value over the bound is refused; the exported constants are `IDEMPOTENCY_ROUTE_MAX`,
`IDEMPOTENCY_KEY_MAX`, `IDEMPOTENCY_HASH_BYTES` and `IDEMPOTENCY_RESPONSE_MAX_BYTES`).

- **A row is completed once.** The `idempotency_keys_final` trigger refuses any update of a row whose
  `status` is set, even one that repeats the values, and any change to the Organization, user,
  route, key, hash or creation time of a row, completed or not, so no `UPDATE` can replace a stored
  answer. (A `DELETE` followed by an `INSERT` by the core role can, and the purge relies on
  `DELETE`.) Complete with `UPDATE ... WHERE <key> AND status IS NULL` and read zero rows as already
  completed (a second completion that waited on the first one's lock re-reads the row, finds it
  completed, and writes nothing).
- **The service inserts the row in flight, does its write and completes the row in the same
  transaction.** An in-flight row is therefore never committed, and a request killed half way rolls
  back and strands no key. A concurrent retry with the same key waits on the first transaction's
  primary-key lock (the service bounds that wait with a lock timeout and answers
  `request.idempotency_in_progress`, 409); a retry after the commit reads the completed row.
  **Nothing recovers an in-flight row that was committed on its own** (the trigger forbids
  refreshing its hash or creation time), so the service must never commit one.
- **The purge is per Organization and bounded**, from inside the Organization's scope, so no
  cross-tenant function exists. Remove a batch with `DELETE ... WHERE ctid = ANY (ARRAY(SELECT ctid
  FROM core.idempotency_keys WHERE organization_id = $1 AND created_at < $2 ORDER BY created_at
  LIMIT $n))`, **repeated until a batch removes none**: a short batch does not mean the backlog is
  empty, because a row another session is completing is skipped and goes with the next batch. The
  `ctid` form assumes the table is not partitioned. It runs on `idempotency_keys_purge_idx` on
  `(organization_id, created_at)` with no sort, reading the Organization's range by the leading
  column; the lookup of one key runs on the primary key. `core-plans.integration.ts` asserts both
  plans (including the index condition) and their buffer counts (about two buffers per purged row,
  four for a lookup) on an Organization of 20,000 keys among 44,000, never the time. **The plan is
  checked after `ANALYZE`.** On a table with no statistics the inner select can sort all of the
  Organization's expired rows, so the service runs the purge with the limit in place and relies on autovacuum's analyze.
- **Retention.** The purge runs from an Organization's own write path, so the service's 24 hours is
  a ceiling only for an Organization that keeps writing: an idle Organization keeps its last rows
  until its next write or until it is deleted. **The service must never store a response that
  carries a secret** (an Invitation token, for example); store a redacted body.
- `closeline_core` has the schema's default `SELECT`, `INSERT`, `UPDATE` and `DELETE` and no
  `TRUNCATE`; no other service role can reach the schema. The table is a tenant table, so the
  catalog check needs no allowlist entry.

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
