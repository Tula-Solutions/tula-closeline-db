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
    entry. `attempts` is 0 to 100, `outcome` is `done` (core removed the Organization),
    `not_needed` (nothing to remove: an account exists or core holds no Organization for the
    attempt), `refused` (core refused, a person reconciles) or `gave_up` (attempts spent, a person
    reconciles), and is set exactly when `resolved_at` is.
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
      `ABANDON_GIVE_UP_SPENT`, a safety net the sweep runs once per run, after the claim, with a
      small batch, for open cases that nevertheless used all 100 and whose lease has ended. **The
      lease must exceed the service's call bound to core**: a worker slower than its lease can
      find its case already `gave_up`, and `ABANDON_RESOLVE` then returns no row, which the worker
      treats as "already resolved", not as an error.
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

    Settle the case, the last statement of the account transaction (`$1` case id, `$2`
    environment): **the account transaction runs this last; no row means roll back the account and
    tell the person to sign up again.** It locks the same row the claim does and only while
    `attempts = 0`, so "account committed" and "case claimed by the sweep" cannot both happen,
    whatever the clocks say. If it locks first the claim skips the row and the case is never
    claimable; if the claim committed first it returns no row. Call it only when the request
    recorded a case for the attempt: no case at all also returns no row. The case ends as
    `not_needed`:

    ```sql
    update auth.abandon_cases
    set resolved_at = clock_timestamp(), outcome = 'not_needed', updated_at = clock_timestamp()
    where id = $1 and environment_id = $2 and resolved_at is null and attempts = 0
    returning id
    ```

    The safety net for spent cases:

    ```sql
    with batch as (
      select id from auth.abandon_cases
      where environment_id = $1 and resolved_at is null and attempts >= 100
        and next_attempt_at <= clock_timestamp()
      order by next_attempt_at
      limit $2
      for update skip locked)
    update auth.abandon_cases
    set resolved_at = clock_timestamp(), outcome = 'gave_up', updated_at = clock_timestamp()
    where id in (select id from batch)
    returning id
    ```

    Fill in the Organization id once it is learned. Another case already holding that Organization
    id is the unique violation `abandon_cases_environment_organization_key` (SQLSTATE 23505). The
    failed statement aborts its transaction, so the service resolves this case with
    `ABANDON_RESOLVE` as `gave_up` in a new one. It reports the violation by ids only (both case
    ids and the Organization id, never an email) so a person can reconcile: the other case may
    already be resolved or belong to another user, and the Organization may then never be
    abandoned:

    ```sql
    update auth.abandon_cases
    set core_organization_id = $3, updated_at = clock_timestamp()
    where id = $1 and environment_id = $2 and core_organization_id is null and resolved_at is null
    returning id
    ```

    Purge resolved cases, one bounded batch at a time:

    ```sql
    with batch as (
      select id from auth.abandon_cases
      where environment_id = $1 and resolved_at is not null
        and resolved_at < clock_timestamp() - interval '1 day'
      order by resolved_at
      limit $2
      for update skip locked)
    delete from auth.abandon_cases
    where id in (select id from batch)
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

    **No argument makes them throw.** The forgetting period and the rate-limit window are raised
    to `COUNTER_MIN_PERIOD_MS` (1 s) when smaller, null or negative, and a missing, null or
    negative wait counts as 0, so a row never expires the instant it starts and no check can be
    violated by the durations passed in.

    **How they are run.** The attempt-counter statements run on the pool, each with an explicit
    `environment_id` parameter (the table has no row-level security, so nothing scopes them
    for you); `COUNTER_PURGE_BATCH` crosses environments on purpose. The strings are not
    type-checked against the schema; the integration suite is their only guard.

    ```sql
    with ts as (select clock_timestamp() as tick)
    insert into auth.attempt_counters as c
      (environment_id, kind, key_hash, hits, started_at, locked_until, expires_at)
    values ($1, 'lockout', $2, 1, clock_timestamp(),
            clock_timestamp() + make_interval(secs => greatest(coalesce(($3::int[])[1], 0), 0)::float8 / 1000),
            clock_timestamp() + make_interval(secs => (greatest(coalesce(($3::int[])[1], 0), 0)::float8 + greatest(coalesce($4::int, 0), 1000)::float8) / 1000))
    on conflict (environment_id, kind, key_hash) do update set
      hits = least(case when c.expires_at <= (select tick from ts) then 1 else c.hits + 1 end, 1000000),
      started_at = case when c.expires_at <= (select tick from ts) then (select tick from ts) else c.started_at end,
      locked_until = (select tick from ts) + make_interval(secs => greatest(coalesce(($3::int[])[least(case when c.expires_at <= (select tick from ts) then 1 else c.hits + 1 end, cardinality($3::int[]))], 0), 0)::float8 / 1000),
      expires_at = (select tick from ts) + make_interval(secs => (greatest(coalesce(($3::int[])[least(case when c.expires_at <= (select tick from ts) then 1 else c.hits + 1 end, cardinality($3::int[]))], 0), 0)::float8 + greatest(coalesce($4::int, 0), 1000)::float8) / 1000)
    where c.locked_until <= (select tick from ts)
    returning hits, greatest(coalesce(($3::int[])[least(hits, cardinality($3::int[]))], 0), 0)::float8::int as wait_ms
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
            clock_timestamp() + make_interval(secs => greatest(coalesce($3::float8, 0), 1000) / 1000))
    on conflict (environment_id, kind, key_hash) do update set
      hits = case when c.expires_at <= (select tick from ts) then 1 else least(c.hits + 1, 1000000) end,
      started_at = case when c.expires_at <= (select tick from ts) then (select tick from ts) else c.started_at end,
      expires_at = case when c.expires_at <= (select tick from ts)
                        then (select tick from ts) + make_interval(secs => greatest(coalesce($3::float8, 0), 1000) / 1000)
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
    with batch as (
      select environment_id, kind, key_hash from auth.attempt_counters
      where expires_at < clock_timestamp() - interval '1 minute'
      order by expires_at
      limit $1
      for update skip locked)
    delete from auth.attempt_counters c
    using batch b
    where c.environment_id = b.environment_id and c.kind = b.kind and c.key_hash = b.key_hash
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

## The playbook schema

The Playbook service's documents, their ingestion, the quota counts, the per-Organization index
settings, the queue consumer's record of handled messages and the idempotency keys (hub issues 51 and
53, ADR 0016, ADR 0010). Migrations `0009` (documents, usage, jobs, index settings), `0010` (consumed
messages), `0011` (idempotency keys) and `0012` (work discovery, erasure, spent purges) and `0013` (page count, the state list index); released as 0.12.0. Every table carries `organization_id` as the
contract's prefixed text, forced row-level security with the one canonical policy, and grants for
`closeline_playbook` only. **No file content and no extracted text is stored**: the file is in
object storage (`documents.object_key`), the chunks are in the vector store, and a job holds only
its step, attempt count, counts and the object key of its parsed intermediate.

| Table | Holds |
| --- | --- |
| `documents` | one row per uploaded file: state, content hash, size, declared and detected type, uploader, object key, failure reason, page count (set when ingestion ends), deletion and purge times; keyed by `(organization_id, id)` |
| `organization_usage` | document and byte counts per Organization, soft-deleted included, kept by triggers (read-only to the role) |
| `ingestion_jobs` | one job per ingestion of a document: next step, attempts, lease, counts; at most one active job per document |
| `index_settings` | the embedding model and dimension of an Organization (ADR 0010) |
| `consumed_message` | the kit's `ProcessedStore` table |
| `idempotency_keys` | the outcome of one upload or internal call per Organization, user, route and client key; core's pattern without the foreign key |
| `work_hints` | **not a tenant table**: which Organizations may have work of which kind from when; the registry `organizations_with_work` reads (no service role has any privilege on it) |

**Document states** (`DOCUMENT_STATES`, a check constraint, the names of ADR 0016): `uploaded`,
`processing`, `ready`, `failed`, `deleted`. A purged document is a removed row, not a state. Checks
tie each state to its columns: `failed` has a `failure_reason` from `DOCUMENT_FAILURE_REASONS`
(`too_many_pages`, `unreadable`, `password_protected`, `no_text`, `processing_failed`) and no other
state has one; `deleted` has `deleted_at` and `purge_due_at` and no other state does; the purge
columns exist only on a deleted document. Types are `DOCUMENT_FILE_TYPES` (`pdf`, `docx`, `pptx`,
`txt`, `md`); a size is 1 to `DOCUMENT_MAX_BYTES` (25 MiB). Identity columns never change (a
trigger, and the role has no `UPDATE` on them), and `epoch` and `deletion_seq` never go down. The
role may delete only a `deleted` document (a restrictive policy).

**The all-zero Organization id is the global scope of consumed messages only.** Every other
playbook table has a check (`<table>_organization_not_global`) that refuses `org_` and 32 zeros,
so nothing but `consumed_message` can be written under the global scope.

**Duplicates.** `documents_content_hash_key` is unique on `(organization_id, content_hash)` among
documents whose purge has not started and that are not barred from restore (`restore_barred_at`),
so an upload that matches a soft-deleted document finds it (`DOCUMENT_BY_HASH`) and a document being
purged or erased no longer blocks a new one. A matching `failed`
document is re-queued (`DOCUMENT_REQUEUE`), a `deleted` one restored with
`DOCUMENT_RESTORE_FOR_UPLOAD`.

**Two restores.** The explicit restore (`DOCUMENT_RESTORE`) needs `purge_due_at > clock_timestamp()`
as well as a purge that has not started: the contract answers 410 `not_restorable` for a deleted
document past its purge time, and the statement returns no row (read `DOCUMENT_GET` to tell it from
`not_found`). The restore for a matching upload (`DOCUMENT_RESTORE_FOR_UPLOAD`) has no purge-time
check, so it restores a past-due document the purge has not claimed (the uploader has just supplied
the content again, and the hash index would otherwise block a new document); it also refuses once
the purge has started. Both reset the purge time, clear the deletion fields and cancel any stale job
before queueing the new one. **Neither restores a barred document** (`restore_barred_at`, set by
erasure and by the reset of a spent purge): it never comes back.

**Epoch and deletion sequence.** `deletion_seq` is bumped by one in the same statement as every
soft delete; the cleanup job is queued with it and `DOCUMENT_CLEANUP_BEGIN` and
`DOCUMENT_CLEANUP_DONE` apply only while the document is `deleted` at that sequence, so a cleanup
does nothing after a restore. `epoch` is bumped by every delete and restore; the playbook service
tags each vector with its job's epoch and a cleanup removes tags up to the epoch
`DOCUMENT_CLEANUP_BEGIN` returns, so vectors written by a restore are never touched. Deleting also
cancels the document's job (and `INGESTION_JOB_CLAIM` cancels, in its own statement, a job that
a restore or requeue committed while the delete was waiting: it takes only jobs of a document that
is `uploaded` or `processing` at the job's epoch), and `DOCUMENT_CLEANUP_BEGIN` reports `clear = false` until the
cancelled job's lease has ended, so a worker that was mid-step cannot write vectors after the
cleanup.

**Quota counts.** `organization_usage` is moved by `AFTER INSERT OR DELETE` triggers on
`documents` in the statement's own transaction (an update never changes a size), so it cannot drift
from the table; `QUOTA_USAGE` is one primary-key read. Soft-deleted documents count until purged.
Run `QUOTA_LOCK` first in an upload's transaction: it takes a per-Organization advisory lock, so
two uploads queue and the quota check inside `DOCUMENT_INSERT` sees the earlier one. A `TRUNCATE`
of `documents` skips the triggers; only the owner can run it and must truncate
`organization_usage` with it.

**Lists and indexes.** Documents not deleted, newest first, by cursor: `documents_list_idx`
(`DOCUMENT_LIST`, at most 100 a page); deleted ones: `documents_deleted_list_idx`
(`DOCUMENT_LIST_DELETED`). **`DOCUMENT_LIST_FILTERED`** serves any filter in one call, with `$5` the
state or null: null is the not-deleted list (`documents_list_idx`), `uploaded`, `processing`, `ready` or
`failed` is that state (`documents_state_list_idx`, equality on the state then the keyset, so no scan
past other states' rows), `deleted` is the deleted list (`documents_deleted_list_idx`). Every list row
carries all the columns `DOCUMENT_GET` returns (`DOCUMENT_ROW_FIELDS`, row type `DocumentRow`): `updated_at`,
`failure_reason`, `purge_due_at`, `page_count` and the database-computed `not_restorable`, so a listed
document is never read again. `DOCUMENT_LIST` and `DOCUMENT_LIST_DELETED` keep their parameters and
only gained columns, so read rows by column name, never by position. Carry the cursor as the database's `created_at::text`, not a JavaScript
Date, which drops microseconds. `DOCUMENT_GET` reads one document with everything the service
answers and publishes with (including `deletion_seq`). Its `not_restorable` is computed by the database clock (a `deleted` document past its purge time or with a started purge), so the service never compares the purge time with its own clock: an explicit restore that returns no row for a `deleted` document is 410 `not_restorable`. The page count is stored on the document, set by `INGESTION_JOB_COMPLETE` and `INGESTION_JOB_FAIL` from the job's count (record it with `INGESTION_JOB_ADVANCE` first), null until then. Content hash: `documents_content_hash_key`. Due for purge:
`documents_purge_idx`, which also lists an Organization's deleted documents oldest-due first (it
leaves out documents whose purge is spent). Jobs: `ingestion_jobs_due_idx` for the claim,
`ingestion_jobs_active_document_key` for one active job per document and
`ingestion_jobs_document_idx` for lookups and the cascade. There is no index on `state` alone and
none on `organization_id` alone.

**Index settings.** `INDEX_SETTINGS_UPSERT` replaces the model and dimension only while no vector
exists; `INDEX_VECTORS_MARK` fixes them at the first vector write; after that a different model or
dimension gets no row and a trigger refuses any other statement. The choice is to refuse, not to
record that a re-index is needed; the role cannot delete the row.

**Jobs.** A claim is a lease like the auth abandon cases: `next_attempt_at` is the due time while
`queued` and the lease end while `running`, every claim counts an attempt (the table bounds it at
20) and issues a new `claim_token`, and a worker whose lease lapsed holds a stale token and is
refused by every later statement. A claim never takes a job at the bound; `INGESTION_JOB_GIVE_UP_SPENT`
fails it and its document with `processing_failed`, so a spent job cannot wedge a batch. The
service gives up lower, with `INGESTION_JOB_FAIL`.

A claim takes a job only while its document is live at the job's epoch and re-checks the document
after any wait on its row, so a job is not handed out on a document a delete has just taken.
`INGESTION_JOB_HEARTBEAT` and `INGESTION_JOB_ADVANCE` need the same live document, so a worker
whose document was deleted loses its claim at the next heartbeat, and `DOCUMENT_CLEANUP_BEGIN`
reports `clear` false while any cancelled or running job of the document has an unexpired lease.
**The claim's rows:** every claimed job is a row and carries `cancelled`, the number of stale jobs
the call cancelled. When the batch held only stale jobs, one row with a null `id` and `cancelled`
above zero comes back: that is not an empty queue. The row also carries `lost`, the jobs the call
claimed whose document a concurrent delete took first (they stay `running` until their lease
lapses). The worker claims again at once when either count is above zero (no rows at all means
nothing was due). Read the rows with `claimedJobs`:

```ts
import { INGESTION_JOB_CLAIM, claimedJobs } from 'tula-closeline-db'

for (;;) {
  const { jobs, cancelled, lost } = claimedJobs((await claim(INGESTION_JOB_CLAIM)).rows)
  for (const job of jobs) await run(job)
  if (jobs.length === 0 && cancelled === 0 && lost === 0) break
}
```

**Locks.** The claim waits on a document row lock per claimed job while it holds the batch's job
locks, so the service runs it with a short `lock_timeout` (`set local lock_timeout = '1s'`; a longer
wait raises `55P03` and rolls the claim back, leaving the jobs unclaimed) and keeps every
transaction that locks a document short: no queue publish inside one.

**Purge.** `DOCUMENT_PURGE_CLAIM` takes due documents under a lease and sets `purge_started_at`,
which ends restores for good; the worker removes the file, then `DOCUMENT_PURGE_COMPLETE` removes
the row once the current deletion's cleanup is recorded. **Restore against purge:** both lock the
document's row. If the restore takes it first the claim skips it and, after the commit, no longer
sees a deleted document: the restore wins. If the claim takes it first the restore waits, then
finds `purge_started_at` set and returns no row: the purge wins. A purge's claim is capped at 20
attempts; a spent document stays `deleted` until a person resets it (below). **Purge against a
claim.** `DOCUMENT_PURGE_COMPLETE` locks the document's job rows first and the document row second,
the claim's order (job, then document), so an immediate purge of a just-erased document cannot
deadlock with a job claim: it waits for the claim's short transaction. It also refuses while a job of
the document is `running` with an unexpired lease (a claim that raced the delete left it), as the
cleanup does: wait out the lease and run it again.

**Batch sizes** are clamped in SQL, null included: 1 to 500 (`PLAYBOOK_MAX_BATCH`) for the purge
claim, the job claim, the give-up, the erase batch, the discovery page and the two purges, and 1 to
100 for a list page.

**Work discovery.** Every tenant table is under forced row-level security with one permissive policy
(the isolation check enforces it), so no role, the owner included, can read across Organizations.
`playbook.organizations_with_work(kind, after_id, batch)` therefore reads a small registry,
`work_hints` (one row per kind and Organization that may have work, from when), and verifies each
due hint in that Organization's own scope before returning it: `ORGANIZATIONS_WITH_WORK` is the
statement. It is `SECURITY DEFINER` with `search_path = pg_catalog, pg_temp`, every object
schema-qualified, a batch cap of 500 inside the function (a null or huge batch is clamped there and in
the statement), `EXECUTE` revoked from PUBLIC and granted to `closeline_playbook` only, and it returns
Organization ids and nothing else, in id order after `after_id`, each row with `resume_after`. Kinds (`WORK_KINDS`): `purge_due`,
`jobs_due` (queued and due, or running with a lapsed lease, spent jobs included), `cleanup_pending`
(deleted, vector cleanup not recorded, five minutes after the delete), `consumed_purge` (done
messages `CONSUMED_PURGE_AGE_MS` old, 15 days, above the queue's retention, and lapsed claims at their
lease end; the only kind that returns the all-zero global scope), `idempotency_purge` (keys
`IDEMPOTENCY_PURGE_AGE_MS` old, 24 hours, since core documents no age of its own) and `purge_spent`. The hints are written by `SECURITY DEFINER`
triggers on the tenant tables and only ever move a time earlier; the function moves a verified hint
to the next due time, or removes it when no work is left, so a hint is never later than real work and
a stale one is cleaned by the sweep that meets it. Hints another transaction is changing are skipped
(`SKIP LOCKED`), so a short page does not mean the sweep is done.

**The sweep loop.** One call visits at most four times the batch of hints (never more than 2000), so
its work and locks are bounded however many stale hints there are. Every row carries `resume_after`,
the last hint visited; when nothing was returned but hints were visited, one marker row has a null
`organization_id`. `discoveredOrganizations(rows)` returns `{ organizations, resumeAfter }`: run the
kind's statement once per Organization, in that Organization's scope, then call again with
`resumeAfter` as `after_id`; **no row at all ends the sweep** (`resumeAfter` is null). The call
**raises `insufficient_privilege` (`42501`) inside an Organization's scope**, so run it unscoped, and
it must be **the only statement of its transaction**, which commits at once, because it holds the
visited hints' locks until then.

```ts
let after: string | null = ''
while (after !== null) {
  const { organizations, resumeAfter } = discoveredOrganizations(
    await sweeper.query(ORGANIZATIONS_WITH_WORK, [kind, after, 100])
  )
  for (const organization of organizations) await runKind(kind, organization)
  after = resumeAfter
}
```

 Expected plans: the candidate scan is an index scan
of `work_hints` for the kind (proportional to the due hints, never to a tenant table), and each
verification is a first-entry or small-range read of the tenant table on an Organization-leading
partial index: `documents_purge_idx` (purge), `ingestion_jobs_due_idx` (jobs), `documents_cleanup_idx`
(cleanup), `consumed_message_done_idx` and `consumed_message_lease_idx` (messages),
`idempotency_keys_purge_idx` (keys) and `documents_spent_purge_idx` (spent). The cost of the registry is
one hint note per delete, job state change, consumed message and idempotency key: the note first looks
for a hint that is already early enough and takes a key share lock on it (key share locks do not
conflict with each other or with the later update of the time, which is not a key column, so writers
of one Organization and kind neither queue behind each other nor deadlock, while the sweeper's
exclusive lock and delete still conflict with them), and writes the row only when none is. A writer
holding the key share lock keeps the sweeper from removing the hint; a writer queued behind the sweeper re-checks after it
commits and writes the hint again if it was removed, so no hint is lost. The registry is not a tenant table, so it has an entry in
`NON_TENANT_TABLES` (the decision record belongs in the hub).

**Erasure and offboarding.** `DOCUMENT_ERASE_BATCH` takes up to N documents of an Organization that
are not yet barred from restore, in id order: a live document is soft-deleted as `DOCUMENT_SOFT_DELETE`
does (`epoch` and `deletion_seq` up, its job cancelled job-first, a running job's lease kept as the
fence for the cleanup), an already deleted one has its purge time pulled to now, and every one gets
`restore_barred_at`, so neither restore can bring it back, and `purge_due_at` is now, so the normal
purge claim takes it next. It returns `id`, `epoch`, `deletion_seq` and `changed` (the service
publishes the vector cleanup for the changed ones). Repeat until it returns no row; a repeat is
idempotent. It locks the jobs, then the documents, each in id order, so two batches cannot deadlock on
each other; one erase loop per Organization is expected, a `40P01` or `40001` is retried, and the
cleanup message for a `deletion_seq` is idempotent (it may be published twice). The purge then runs as for any deleted document (claim, file removal, cleanup, complete).
When no document row is left, `ORGANIZATION_REMOVE_REST` removes the rest: the function
`playbook.remove_organization_rest` deletes the Organization's index settings, usage row, consumed
messages, idempotency keys (except the remove-all route's own, `REMOVE_ALL_IDEMPOTENCY_ROUTE`) and work
hints. It refuses, and deletes nothing, while any document row exists; it acts only on the
Organization the calling transaction is scoped to; and it takes the upload lock first. That is the
smallest grant that cannot strip a live Organization (the service role keeps no `DELETE` on those
tables). `ORGANIZATION_REMOVAL_STATUS` answers the route's end state: `removed` is true when no
document, index settings, usage row or consumed message of the Organization is left.

**Spent purges.** A document whose purge reached 20 attempts stays `deleted`, counts toward the quota
and is never claimed again. `DOCUMENT_LIST_SPENT_PURGES` lists them per Organization by id
(`documents_spent_purge_idx`), and the discovery kind `purge_spent` says which Organizations have any.
**To clear one**, a person fixes what blocked the purge (the file store, a permission, a bad object
key), then runs `DOCUMENT_PURGE_RESET` for the document inside the Organization's scope: it sets the
attempts back to zero and clears the purge lease and start, bars the document from restore for good
(its file may be half removed), and the next purge claim takes it. It applies only to a spent
document and is idempotent.

**Idempotency keys** follow core's `0004`: the service inserts the row in flight with
`IDEMPOTENCY_BEGIN`, does its write and completes it with `IDEMPOTENCY_COMPLETE` in the same
transaction; a completed row is never rewritten (trigger `idempotency_keys_final`); a replay reads
`IDEMPOTENCY_LOOKUP` and compares the request hash. An internal call (remove-all) has no user and
uses `INTERNAL_CALL_USER_ID`. `IDEMPOTENCY_PURGE` is per Organization and bounded, and removes keys
at least `IDEMPOTENCY_MIN_PURGE_AGE_MS` (an hour) old; the discovery hints keys at
`IDEMPOTENCY_PURGE_AGE_MS` (24 hours), so pass that age.

**Statements.** Exported from the library, exactly as the integration tests run them (the strings
are plain text, not type-checked against the schema). Every time is the database clock; callers pass
durations. They assume READ COMMITTED. Statements that touch a job and a document lock the job
first; callers retry SQLSTATE `40P01` and `40001` with a bounded, jittered retry.

    `QUOTA_LOCK`:

    ```sql
    select pg_advisory_xact_lock(hashtextextended($1::text, 0)) is not null as locked
    ```

    `QUOTA_USAGE`:

    ```sql
    select document_count, byte_count
    from playbook.organization_usage
    where organization_id = $1
    ```

    `DOCUMENT_INSERT`:

    ```sql
    with ins as (
      insert into playbook.documents
        (id, organization_id, name, content_hash, size_bytes, declared_type, detected_type, uploaded_by, object_key)
      select $2::text, $1::text, $3::text, $4::bytea, $5::bigint, $6::text, $7::text, $8::text, $9::text
      where coalesce((select document_count from playbook.organization_usage where organization_id = $1), 0) < $11::bigint
        and coalesce((select byte_count from playbook.organization_usage where organization_id = $1), 0) + $5::bigint <= $12::bigint
      on conflict (organization_id, content_hash) where purge_started_at is null and restore_barred_at is null do nothing
      returning id, organization_id, epoch),
    queued as (
      insert into playbook.ingestion_jobs (id, organization_id, document_id, epoch, next_attempt_at)
      select $10::text, organization_id, id, epoch, clock_timestamp() from ins)
    select id, epoch from ins
    ```

    `DOCUMENT_BY_HASH`:

    ```sql
    select id, state, epoch, deletion_seq
    from playbook.documents
    where organization_id = $1 and content_hash = $2::bytea and purge_started_at is null and restore_barred_at is null
    ```

    `DOCUMENT_GET`:

    ```sql
    select id, name, state, size_bytes, declared_type, detected_type, uploaded_by, failure_reason, epoch, deletion_seq, deleted_at, deleted_by, purge_due_at, purge_started_at, page_count, created_at, updated_at,
      (state = 'deleted' and (purge_due_at <= clock_timestamp() or purge_started_at is not null or restore_barred_at is not null)) as not_restorable
    from playbook.documents
    where organization_id = $1 and id = $2
    ```

    `DOCUMENT_LIST`:

    ```sql
    select id, name, state, size_bytes, declared_type, detected_type, uploaded_by, failure_reason, epoch, deletion_seq, deleted_at, deleted_by, purge_due_at, purge_started_at, page_count, created_at, updated_at,
      (state = 'deleted' and (purge_due_at <= clock_timestamp() or purge_started_at is not null or restore_barred_at is not null)) as not_restorable
    from playbook.documents
    where organization_id = $1 and state <> 'deleted'
      and (created_at, id) < ($2::timestamptz, $3::text)
    order by created_at desc, id desc
    limit least(greatest(coalesce($4::int, 1), 1), 100)
    ```

    `DOCUMENT_LIST_DELETED`:

    ```sql
    select id, name, state, size_bytes, declared_type, detected_type, uploaded_by, failure_reason, epoch, deletion_seq, deleted_at, deleted_by, purge_due_at, purge_started_at, page_count, created_at, updated_at,
      (state = 'deleted' and (purge_due_at <= clock_timestamp() or purge_started_at is not null or restore_barred_at is not null)) as not_restorable
    from playbook.documents
    where organization_id = $1 and state = 'deleted'
      and (created_at, id) < ($2::timestamptz, $3::text)
    order by created_at desc, id desc
    limit least(greatest(coalesce($4::int, 1), 1), 100)
    ```

    `DOCUMENT_SOFT_DELETE`:

    ```sql
    with j as (
      update playbook.ingestion_jobs
      set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp(),
          next_attempt_at = case when state = 'running' then next_attempt_at else clock_timestamp() end
      where organization_id = $1 and document_id = $2 and state in ('queued', 'running')
      returning id),
    d as (
      update playbook.documents
      set state = 'deleted', epoch = epoch + 1, deletion_seq = deletion_seq + 1,
          deleted_at = clock_timestamp(), deleted_by = $3,
          purge_due_at = clock_timestamp() + make_interval(secs => greatest(coalesce($4::float8, 0), 3600000) / 1000),
          failure_reason = null, updated_at = clock_timestamp()
      where organization_id = $1 and id = $2 and state <> 'deleted' and (select count(*) from j) >= 0
      returning id, state, deletion_seq, purge_due_at)
    select id, state, deletion_seq, purge_due_at, true as changed from d
    union all
    select id, state, deletion_seq, purge_due_at, false from playbook.documents
    where organization_id = $1 and id = $2 and state = 'deleted' and not exists (select 1 from d)
    ```

    `DOCUMENT_RESTORE`:

    ```sql
    with j as (
      update playbook.ingestion_jobs
      set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
      where organization_id = $1 and document_id = $2 and state in ('queued', 'running')
        and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = $2 and x.state = 'deleted')
      returning id),
    d as (
      update playbook.documents
      set state = 'processing', epoch = epoch + 1, deleted_at = null, deleted_by = null,
          purge_due_at = null, updated_at = clock_timestamp()
      where organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is null and restore_barred_at is null
        and purge_due_at > clock_timestamp()
        and (select count(*) from j) >= 0
      returning organization_id, id, epoch, deletion_seq),
    queued as (
      insert into playbook.ingestion_jobs (id, organization_id, document_id, epoch, next_attempt_at)
      select $3::text, organization_id, id, epoch, clock_timestamp() from d)
    select id, 'processing' as state, epoch, deletion_seq, true as changed from d
    union all
    select id, state, epoch, deletion_seq, false from playbook.documents
    where organization_id = $1 and id = $2 and state <> 'deleted' and not exists (select 1 from d)
    ```

    `DOCUMENT_RESTORE_FOR_UPLOAD`:

    ```sql
    with j as (
      update playbook.ingestion_jobs
      set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
      where organization_id = $1 and document_id = $2 and state in ('queued', 'running')
        and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = $2 and x.state = 'deleted')
      returning id),
    d as (
      update playbook.documents
      set state = 'processing', epoch = epoch + 1, deleted_at = null, deleted_by = null,
          purge_due_at = null, updated_at = clock_timestamp()
      where organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is null and restore_barred_at is null
        and (select count(*) from j) >= 0
      returning organization_id, id, epoch, deletion_seq),
    queued as (
      insert into playbook.ingestion_jobs (id, organization_id, document_id, epoch, next_attempt_at)
      select $3::text, organization_id, id, epoch, clock_timestamp() from d)
    select id, 'processing' as state, epoch, deletion_seq, true as changed from d
    union all
    select id, state, epoch, deletion_seq, false from playbook.documents
    where organization_id = $1 and id = $2 and state <> 'deleted' and not exists (select 1 from d)
    ```

    `DOCUMENT_REQUEUE`:

    ```sql
    with j as (
      update playbook.ingestion_jobs
      set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
      where organization_id = $1 and document_id = $2 and state in ('queued', 'running')
        and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = $2 and x.state = 'failed')
      returning id),
    d as (
      update playbook.documents
      set state = 'uploaded', failure_reason = null, updated_at = clock_timestamp()
      where organization_id = $1 and id = $2 and state = 'failed' and (select count(*) from j) >= 0
      returning organization_id, id, epoch, deletion_seq),
    queued as (
      insert into playbook.ingestion_jobs (id, organization_id, document_id, epoch, next_attempt_at)
      select $3::text, organization_id, id, epoch, clock_timestamp() from d)
    select id, 'uploaded' as state, epoch, deletion_seq, true as changed from d
    union all
    select id, state, epoch, deletion_seq, false from playbook.documents
    where organization_id = $1 and id = $2 and state in ('uploaded', 'processing', 'ready') and not exists (select 1 from d)
    ```

    `DOCUMENT_CLEANUP_BEGIN`:

    ```sql
    select d.id, d.epoch,
      not exists (
        select 1 from playbook.ingestion_jobs j
        where j.organization_id = d.organization_id and j.document_id = d.id
          and j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp()) as clear
    from playbook.documents d
    where d.organization_id = $1 and d.id = $2 and d.state = 'deleted' and d.deletion_seq = $3::int
    ```

    `DOCUMENT_CLEANUP_DONE`:

    ```sql
    update playbook.documents
    set vectors_removed_seq = $3::int, updated_at = clock_timestamp()
    where organization_id = $1 and id = $2 and state = 'deleted' and deletion_seq = $3::int
    returning id
    ```

    `DOCUMENT_PURGE_CLAIM`:

    ```sql
    with due as (
      select id from playbook.documents
      where organization_id = $1 and state = 'deleted' and purge_due_at <= clock_timestamp()
        and purge_attempts < 20
        and (purge_lease_until is null or purge_lease_until <= clock_timestamp())
      order by purge_due_at
      limit least(greatest(coalesce($2::int, 1), 1), 500)
      for update skip locked)
    update playbook.documents d
    set purge_started_at = coalesce(d.purge_started_at, clock_timestamp()),
        purge_attempts = d.purge_attempts + 1,
        purge_lease_until = clock_timestamp() + make_interval(secs => greatest(coalesce($3::float8, 0), 1000) / 1000),
        updated_at = clock_timestamp()
    from due
    where d.organization_id = $1 and d.id = due.id
    returning d.id, d.object_key, d.size_bytes, d.deletion_seq, d.vectors_removed_seq, d.purge_attempts
    ```

    `DOCUMENT_PURGE_COMPLETE`:

    ```sql
    with jl as (
      select state, next_attempt_at from playbook.ingestion_jobs
      where organization_id = $1 and document_id = $2
      for update)
    delete from playbook.documents
    where organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is not null
      and vectors_removed_seq = deletion_seq
      and not exists (select 1 from jl where jl.state = 'running' and jl.next_attempt_at > clock_timestamp())
    returning id, size_bytes
    ```

    `INGESTION_JOB_CLAIM`:

    ```sql
    with due as (
      select j.id, coalesce(d.state in ('uploaded', 'processing') and d.epoch = j.epoch, false) as live
      from playbook.ingestion_jobs j
      left join playbook.documents d on d.organization_id = j.organization_id and d.id = j.document_id
      where j.organization_id = $1 and j.state in ('queued', 'running')
        and j.attempts < 20 and j.next_attempt_at <= clock_timestamp()
        and ($4::text is null or j.id = $4::text)
      order by j.next_attempt_at
      limit least(greatest(coalesce($2::int, 1), 1), 500)
      for update of j skip locked),
    stale as (
      update playbook.ingestion_jobs t
      set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
      from due
      where t.organization_id = $1 and t.id = due.id and not due.live
      returning t.id),
    claimed as (
      update playbook.ingestion_jobs j
      set state = 'running', attempts = j.attempts + 1, claim_token = gen_random_uuid(),
          next_attempt_at = clock_timestamp() + make_interval(secs => greatest(coalesce($3::float8, 0), 1000) / 1000), updated_at = clock_timestamp()
      from due
      where j.organization_id = $1 and j.id = due.id and due.live
      returning j.id, j.document_id, j.epoch, j.step, j.attempts, j.claim_token, j.artifact_key,
                j.page_count, j.chunk_count, j.chunks_done),
    moved as (
      update playbook.documents d
      set state = 'processing', updated_at = clock_timestamp()
      from claimed
      where d.organization_id = $1 and d.id = claimed.document_id
        and d.state in ('uploaded', 'processing') and d.epoch = claimed.epoch
      returning d.id)
    select c.id, c.document_id, c.epoch, c.step, c.attempts, c.claim_token, c.artifact_key, c.page_count,
      c.chunk_count, c.chunks_done, (select count(*) from stale)::int as cancelled,
      ((select count(*) from claimed) - (select count(*) from moved))::int as lost
    from claimed c join moved m on m.id = c.document_id
    union all
    select null, null, null, null, null, null, null, null, null, null, (select count(*) from stale)::int,
      ((select count(*) from claimed) - (select count(*) from moved))::int
    where not exists (select 1 from claimed c join moved m on m.id = c.document_id)
      and ((select count(*) from stale) > 0 or (select count(*) from claimed) > 0)
    ```

    `INGESTION_JOB_HEARTBEAT`:

    ```sql
    update playbook.ingestion_jobs
    set next_attempt_at = clock_timestamp() + make_interval(secs => greatest(coalesce($4::float8, 0), 1000) / 1000), updated_at = clock_timestamp()
    where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
      and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = ingestion_jobs.document_id
                  and x.state in ('uploaded', 'processing') and x.epoch = ingestion_jobs.epoch)
    returning id
    ```

    `INGESTION_JOB_ADVANCE`:

    ```sql
    update playbook.ingestion_jobs
    set step = $4::text, artifact_key = coalesce($5::text, artifact_key), page_count = coalesce($6::int, page_count),
        chunk_count = coalesce($7::int, chunk_count), chunks_done = coalesce($8::int, chunks_done),
        next_attempt_at = clock_timestamp() + make_interval(secs => greatest(coalesce($9::float8, 0), 1000) / 1000), updated_at = clock_timestamp()
    where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
      and array_position(array['parse', 'chunk', 'embed', 'index'], $4::text) >= array_position(array['parse', 'chunk', 'embed', 'index'], step)
      and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = ingestion_jobs.document_id
                  and x.state in ('uploaded', 'processing') and x.epoch = ingestion_jobs.epoch)
    returning id, step, chunks_done
    ```

    `INGESTION_JOB_RETRY`:

    ```sql
    update playbook.ingestion_jobs
    set state = 'queued', claim_token = null,
        next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), 3600000) / 1000),
        updated_at = clock_timestamp()
    where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
    returning id, attempts
    ```

    `INGESTION_JOB_COMPLETE`:

    ```sql
    with j as (
      update playbook.ingestion_jobs
      set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
      where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
        and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = ingestion_jobs.document_id
                    and x.state = 'processing' and x.epoch = ingestion_jobs.epoch)
      returning document_id, epoch, page_count),
    d as (
      update playbook.documents
      set state = 'ready', page_count = coalesce((select page_count from j), page_count), updated_at = clock_timestamp()
      where organization_id = $1 and id = (select document_id from j) and epoch = (select epoch from j)
        and state = 'processing')
    select document_id from j
    ```

    `INGESTION_JOB_FAIL`:

    ```sql
    with j as (
      update playbook.ingestion_jobs
      set state = 'failed', failure_reason = $4::text, claim_token = null,
          finished_at = clock_timestamp(), updated_at = clock_timestamp()
      where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
        and exists (select 1 from playbook.documents x where x.organization_id = $1 and x.id = ingestion_jobs.document_id
                    and x.state in ('uploaded', 'processing') and x.epoch = ingestion_jobs.epoch)
      returning document_id, epoch, page_count),
    d as (
      update playbook.documents
      set state = 'failed', failure_reason = $4::text, page_count = coalesce((select page_count from j), page_count),
          updated_at = clock_timestamp()
      where organization_id = $1 and id = (select document_id from j) and epoch = (select epoch from j)
        and state in ('uploaded', 'processing'))
    select document_id from j
    ```

    `INGESTION_JOB_GIVE_UP_SPENT`:

    ```sql
    with batch as (
      select id from playbook.ingestion_jobs
      where organization_id = $1 and state in ('queued', 'running')
        and attempts >= 20 and next_attempt_at <= clock_timestamp()
      order by next_attempt_at
      limit least(greatest(coalesce($2::int, 1), 1), 500)
      for update skip locked),
    j as (
      update playbook.ingestion_jobs t
      set state = 'failed', failure_reason = 'processing_failed', claim_token = null,
          finished_at = clock_timestamp(), updated_at = clock_timestamp()
      from batch
      where t.organization_id = $1 and t.id = batch.id
      returning t.document_id, t.epoch),
    d as (
      update playbook.documents
      set state = 'failed', failure_reason = 'processing_failed', updated_at = clock_timestamp()
      from j
      where documents.organization_id = $1 and documents.id = j.document_id and documents.epoch = j.epoch
        and documents.state in ('uploaded', 'processing'))
    select document_id from j
    ```

    `CONSUMED_CLAIM`:

    ```sql
    insert into playbook.consumed_message as m
      (consumer, organization_id, message_id, state, claim_token, lease_expires_at)
    values ($1, $2, $3, 'claimed', $4::uuid, clock_timestamp() + make_interval(secs => greatest(coalesce($5::float8, 0), 1000) / 1000))
    on conflict (consumer, organization_id, message_id) do update set
      claim_token = excluded.claim_token,
      lease_expires_at = clock_timestamp() + make_interval(secs => greatest(coalesce($5::float8, 0), 1000) / 1000)
    where m.state = 'claimed' and m.lease_expires_at <= clock_timestamp()
    returning claim_token
    ```

    `CONSUMED_LOOKUP`:

    ```sql
    select state,
      case when state = 'claimed'
           then greatest(1, ceil(extract(epoch from lease_expires_at - clock_timestamp())))::int end as retry_after_seconds
    from playbook.consumed_message
    where consumer = $1 and organization_id = $2 and message_id = $3
    ```

    `CONSUMED_RENEW`:

    ```sql
    update playbook.consumed_message
    set lease_expires_at = clock_timestamp() + make_interval(secs => greatest(coalesce($5::float8, 0), 1000) / 1000)
    where consumer = $1 and organization_id = $2 and message_id = $3
      and claim_token = $4::uuid and state = 'claimed' and lease_expires_at > clock_timestamp()
    returning claim_token
    ```

    `CONSUMED_COMPLETE`:

    ```sql
    update playbook.consumed_message
    set state = 'done', completed_at = clock_timestamp(), lease_expires_at = null
    where consumer = $1 and organization_id = $2 and message_id = $3
      and claim_token = $4::uuid and state = 'claimed'
    returning claim_token
    ```

    `CONSUMED_RELEASE`:

    ```sql
    delete from playbook.consumed_message
    where consumer = $1 and organization_id = $2 and message_id = $3
      and claim_token = $4::uuid and state = 'claimed'
    ```

    `CONSUMED_PURGE`:

    ```sql
    with batch as (
      select consumer, message_id from playbook.consumed_message
      where organization_id = $1
        and ((state = 'done' and completed_at < $2::timestamptz)
             or (state = 'claimed' and lease_expires_at <= clock_timestamp()))
      limit least(greatest(coalesce($3::int, 1), 1), 500)
      for update skip locked)
    delete from playbook.consumed_message c
    using batch b
    where c.organization_id = $1 and c.consumer = b.consumer and c.message_id = b.message_id
    ```

    `INDEX_SETTINGS_UPSERT`:

    ```sql
    insert into playbook.index_settings as s
      (organization_id, embedding_model, embedding_dimension)
    values ($1, $2, $3::int)
    on conflict (organization_id) do update set
      embedding_model = excluded.embedding_model, embedding_dimension = excluded.embedding_dimension,
      updated_at = clock_timestamp()
    where s.vectors_written_at is null
       or (s.embedding_model = excluded.embedding_model and s.embedding_dimension = excluded.embedding_dimension)
    returning embedding_model, embedding_dimension, vectors_written_at
    ```

    `INDEX_VECTORS_MARK`:

    ```sql
    with m as (
      update playbook.index_settings
      set vectors_written_at = clock_timestamp(), updated_at = clock_timestamp()
      where organization_id = $1 and vectors_written_at is null
      returning embedding_model, embedding_dimension)
    select embedding_model, embedding_dimension from m
    union all
    select embedding_model, embedding_dimension from playbook.index_settings
    where organization_id = $1 and vectors_written_at is not null
    ```

    `IDEMPOTENCY_BEGIN`:

    ```sql
    insert into playbook.idempotency_keys (organization_id, user_id, route, key, request_hash)
    values ($1, $2, $3, $4, $5::bytea)
    on conflict (organization_id, user_id, route, key) do nothing
    returning key
    ```

    `IDEMPOTENCY_LOOKUP`:

    ```sql
    select request_hash, status, response, created_at
    from playbook.idempotency_keys
    where organization_id = $1 and user_id = $2 and route = $3 and key = $4
    ```

    `IDEMPOTENCY_COMPLETE`:

    ```sql
    update playbook.idempotency_keys
    set status = $5::smallint, response = $6::jsonb
    where organization_id = $1 and user_id = $2 and route = $3 and key = $4 and status is null
    returning key
    ```

    `IDEMPOTENCY_PURGE`:

    ```sql
    with batch as (
      select user_id, route, key from playbook.idempotency_keys
      where organization_id = $1
        and created_at < clock_timestamp() - make_interval(secs => greatest(coalesce($2::float8, 0), 3600000) / 1000)
      order by created_at
      limit least(greatest(coalesce($3::int, 1), 1), 500)
      for update skip locked)
    delete from playbook.idempotency_keys k
    using batch b
    where k.organization_id = $1 and k.user_id = b.user_id and k.route = b.route and k.key = b.key
    ```

    `DOCUMENT_ERASE_BATCH`:

    ```sql
    with t as (select clock_timestamp() as now),
    cand as (
      select id, deletion_seq from playbook.documents
      where organization_id = $1 and restore_barred_at is null
      order by id
      limit least(greatest(coalesce($2::int, 1), 1), 500)),
    jl as (
      select id from playbook.ingestion_jobs
      where organization_id = $1 and state in ('queued', 'running') and document_id in (select id from cand)
      order by id
      for update),
    j as (
      update playbook.ingestion_jobs
      set state = 'cancelled', claim_token = null, finished_at = (select now from t), updated_at = (select now from t),
          next_attempt_at = case when state = 'running' then next_attempt_at else (select now from t) end
      where organization_id = $1 and id in (select id from jl)
      returning id),
    dl as (
      select id from playbook.documents
      where organization_id = $1 and id in (select id from cand) and restore_barred_at is null
        and (select count(*) from j) >= 0
      order by id
      for update),
    d as (
      update playbook.documents x
      set state = 'deleted',
          epoch = case when x.state <> 'deleted' then x.epoch + 1 else x.epoch end,
          deletion_seq = case when x.state <> 'deleted' then x.deletion_seq + 1 else x.deletion_seq end,
          deleted_at = case when x.state <> 'deleted' then (select now from t) else x.deleted_at end,
          deleted_by = case when x.state <> 'deleted' then $3::text else x.deleted_by end,
          purge_due_at = least(coalesce(x.purge_due_at, (select now from t)), (select now from t)),
          restore_barred_at = (select now from t), failure_reason = null, updated_at = (select now from t)
      from cand
      where x.organization_id = $1 and x.id = cand.id and x.id in (select id from dl)
      returning x.id, x.epoch, x.deletion_seq, (x.deletion_seq <> cand.deletion_seq) as changed)
    select id, epoch, deletion_seq, changed from d order by id
    ```

    `ORGANIZATION_REMOVE_REST`:

    ```sql
    select playbook.remove_organization_rest($1::text, $2::text) as removed
    ```

    `ORGANIZATION_REMOVAL_STATUS`:

    ```sql
    select
      not exists (select 1 from playbook.documents where organization_id = $1) as no_documents,
      not exists (select 1 from playbook.index_settings where organization_id = $1) as no_settings,
      not exists (select 1 from playbook.organization_usage where organization_id = $1) as no_usage,
      not exists (select 1 from playbook.consumed_message where organization_id = $1) as no_messages,
      (not exists (select 1 from playbook.documents where organization_id = $1)
        and not exists (select 1 from playbook.index_settings where organization_id = $1)
        and not exists (select 1 from playbook.organization_usage where organization_id = $1)
        and not exists (select 1 from playbook.consumed_message where organization_id = $1)) as removed
    where $1::text = nullif(current_setting('app.organization_id', true), '')
    ```

    `DOCUMENT_LIST_SPENT_PURGES`:

    ```sql
    select id, name, size_bytes, object_key, deletion_seq, vectors_removed_seq, deleted_at,
      purge_due_at, purge_started_at, purge_lease_until, purge_attempts, restore_barred_at
    from playbook.documents
    where organization_id = $1 and state = 'deleted' and purge_attempts >= 20
      and id > $2::text
    order by id
    limit least(greatest(coalesce($3::int, 1), 1), 100)
    ```

    `DOCUMENT_PURGE_RESET`:

    ```sql
    update playbook.documents
    set purge_attempts = 0, purge_started_at = null, purge_lease_until = null,
        restore_barred_at = coalesce(restore_barred_at, clock_timestamp()), updated_at = clock_timestamp()
    where organization_id = $1 and id = $2 and state = 'deleted' and purge_attempts >= 20
    returning id, purge_attempts
    ```

    `ORGANIZATIONS_WITH_WORK`:

    ```sql
    select organization_id, resume_after from playbook.organizations_with_work($1::text, $2::text, least(greatest(coalesce($3::int, 1), 1), 500))
    ```

**The consumed-message table** is the kit's `ProcessedStore` store (`claim`, `renew`, `complete`,
`release`, `purge`), with the kit README's rules: the key is `(consumer, organization_id,
message_id)`, `claim` is one statement that inserts or takes over a lapsed claim and returns the
token, `CONSUMED_LOOKUP` says `done` or `busy` with `retry_after_seconds` (at least 1), `renew`
requires an unlapsed lease, `complete` and `release` require the token and `claimed`, and `purge`
removes `done` rows older than the cutoff and lapsed claims. It is a **tenant table**: a message is
recorded under its Organization, in its scope. One difference from the kit's sketch: `organization_id`
is the wire id as text (`org_` and 32 hex digits) and not a uuid, because the canonical policy
compares text and every table here carries the wire id; the store passes the id through with no
conversion. A global message is recorded under the all-zero id `org_00000000000000000000000000000000`
and its consumer runs `withOrganization` with that id, which is not any real Organization's. Because
row-level security hides other scopes, `CONSUMED_PURGE` runs once per Organization and once under
the all-zero scope; the role is not exempt from the policy.
