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

One Postgres per Region; each service owns one schema (`auth`, `core`, `playbook`, `voice`) and writes it
through its own login role (`closeline_auth`, `closeline_core`, `closeline_playbook`, `closeline_voice`). Migrations
are generated and applied only from this repo and never edited once on `develop`. Never
`drizzle-kit push`.

```bash
docker compose up -d --wait         # Postgres 18, the minimum; set POSTGRES_PORT if 5432 is taken
export DATABASE_URL=postgres://closeline_owner:closeline_owner_local@127.0.0.1:5432/closeline
bun run db:migrate                  # applies pending migrations as the owner role
```

The first start runs `docker/postgres/init.sh`, which creates the owner and service roles from
`docker/postgres/init.sql` (local passwords only, set in `docker-compose.yml`). To run it again,
`docker compose down -v`. A volume created before v0.32.0 lacks `closeline_core_search` (below), so
migration `0030` stops with a message naming it; recreate the volume.

Integration tests need Postgres from the compose file. With none of the five connection
variables in `.env.example` set they use the compose defaults (port 5432, or `POSTGRES_PORT`), so
this is the whole of what CI runs:

```bash
docker compose up -d --wait && bun run test:integration
```

Set all five variables and `DATABASE_URL_ADMIN`, a superuser, together to test against another
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
`BYPASSRLS` (except `closeline_core_search`, below, which is reported if it can log in or is a
superuser), or is a member of any role other than `pg_monitor`, `pg_read_all_settings`,
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
messages), `0011` (idempotency keys) and `0012` (work discovery, erasure, spent purges) `0013` (page count, the state list index) and `0014` (pending cleanups, the orphan sweep) and `0015` (sales history, part one); released as 0.14.0. Every table carries `organization_id` as the
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
| `orphan_sweeps` | the time the service swept an Organization's stored objects for orphans through (`swept_through`), the creation time of the latest upload attempt whose key erasure deleted (`erased_attempt_at`), and (migration `0032`) the cursor of a sweep cut short (`sweep_cursor`, 1 to 1024 bytes) and the deadline of the claim on it (`sweep_claim_until`); read-only to the role, written only by `ORPHAN_SWEEP_CLAIM` (`playbook.orphan_sweep_claim`), `ORPHAN_SWEEP_PAGE_DONE` (`playbook.orphan_sweep_page_done`, which calls `playbook.orphan_sweep_done`) and `ORGANIZATION_REMOVE_REST` |
| `embed_usage` | how many Moments the service embedded per Organization and UTC day (`day`, `moments`, 0 to 1,000,000,000), added by `EMBED_USAGE_ADD` and purged by `EMBED_USAGE_PURGE`; counts only, no content; removed with the Organization by `ORGANIZATION_REMOVE_REST` (migration `0032`) |
| `deals`, `deal_imports`, `deal_import_rows`, `rights_confirmations` | sales history, part one (see below, migration `0015`) |
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
`IDEMPOTENCY_PURGE_AGE_MS` old, 26 hours, since core documents no age of its own), `purge_spent` and `orphan_sweep` (below). The hints are written by `SECURITY DEFINER`
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
hints (except the `orphan_sweep` hint and its marker row, which stay). It refuses, and deletes nothing, while any document row exists; it acts only on the
Organization the calling transaction is scoped to; and it takes the upload lock first. That is the
smallest grant that cannot strip a live Organization (the service role keeps no `DELETE` on those
tables). `ORGANIZATION_REMOVAL_STATUS` answers the route's end state: `removed` is true when no
document, index settings, usage row or consumed message of the Organization is left.

**Pending cleanups.** `DOCUMENT_LIST_PENDING_CLEANUP` lists an Organization's deleted documents whose
vector cleanup is not recorded for their current `deletion_seq` (and which are not purged: a purged
document is a removed row), oldest deletion first by `deleted_at` then `id`, `LIMIT` clamped to
`PLAYBOOK_MAX_BATCH`. Rows carry `id`, `epoch`, `deletion_seq` (what `DOCUMENT_CLEANUP_BEGIN` takes) and
`deleted_at`; carry the cursor as `deleted_at::text` and the id, `'-infinity'` and `''` for the first page.
The predicate is `PENDING_CLEANUP_PREDICATE`, one text shared by the statement, by `documents_cleanup_idx`
(now on `(organization_id, deleted_at, id)`, so the page is read in order with no sort) and by the
`cleanup_pending` verification, so the discovery kind and the list agree exactly: an Organization is
reported if and only if the list has a row for it (the hint is due five minutes after the delete, the
list has no delay). The list is a plan-tested index read under a generic plan.

**Orphan objects.** An upload whose outcome was unknown can leave a stored object with no document row,
and the service deletes such an orphan only once it is older than 24 hours. Every upload attempt writes
an idempotency key, and the key insert trigger notes an `orphan_sweep` hint due `ORPHAN_SWEEP_AGE_MS`
(25 hours) later, so an idle Organization with one failed upload is still named. **An upload attempt
writes nothing else:** it takes the hint's key-share lock like every other kind, so concurrent attempts
of one Organization never wait for each other, except that the attempt which creates the hint, or
lowers it to an earlier time, waits for a writer of the hint that is still open (two first attempts of
an Organization with no hint queue briefly, and the hint ends at the earlier time). The discovery function reports the Organization while an
upload attempt is newer than the time the service swept through (`orphan_sweeps.swept_through`), due 25
hours after the oldest such attempt. The keys are purged after 26 hours, an hour after an attempt is due,
so a sweep that runs within that hour still finds them; for a later one the hint's own time counts as
evidence too (a hint due at `d` stands for an attempt at `d` minus 25 hours).
**What the service does:** sweep the Organization's stored objects older than 24 hours that have no
document row, then run `ORPHAN_SWEEP_DONE` in that Organization's scope (`$2` the time through which
objects were examined, **taken when the sweep starts, not when `ORPHAN_SWEEP_DONE` is called**: an
object stored while the sweep ran may have been missed, and a time taken at the end would count it as
examined; the database cuts it to 25 hours before now, `ORPHAN_SWEEP_AGE_MS`, because an
attempt's key is made when its transaction starts and its object after, so a younger attempt is never
counted as swept; it never moves the recorded time back). The function waits for any open upload
attempt of the Organization, so call it under a short `lock_timeout` and retry; it reads the attempts again,
and either moves the hint to 25 hours after the oldest attempt newer than the sweep (`more` true) or
removes it (`more` false), so a newer attempt, or one racing the sweep, keeps its hint. When it removes
the hint and the Organization has no idempotency key and no document left, it removes the
`orphan_sweeps` row as well; a later attempt starts again from nothing. A repeat is idempotent.
**Large Organizations (migration `0032`, hub issue 109).** A listing too long for one visit is swept in
pages across visits. The service runs `ORPHAN_SWEEP_CLAIM` first (`$2` the claim length in milliseconds,
1 second to 1 hour): it returns `claimed` true with `swept_through` and the saved `sweep_cursor` (the last
object key listed, null at the start of a sweep), or `claimed` false while another instance holds an
unexpired claim, and `claim_token`, the exact deadline it set (text, microseconds); of concurrent claims exactly one wins and none waits (`for update skip locked`), and a
crashed holder is replaced once its deadline passes. It then lists from the cursor and finishes with
`ORPHAN_SWEEP_PAGE_DONE`, passing the token as `$4`. It is fenced: unless `$4` equals the stored deadline and
the deadline is still in the future it changes nothing and returns `held` false with nulls, so a holder
whose claim expired and was taken over can neither release the new claim nor overwrite its cursor. Held,
with a cursor (`$3`) the listing was cut short, so the cursor is saved,
`swept_through` and the hint are left alone and `more` is true; with `$3` null the listing completed, the
cursor is cleared and it does what `ORPHAN_SWEEP_DONE` does. Take `$2` when the sweep starts, once, and
pass the same value on the visits that continue it. `ORPHAN_SWEEP_STATE` reads the three columns. The
functions take only the `orphan_sweeps` row (then, on completion, the hint), so the lock order below holds.
**Embed counts.** `EMBED_USAGE_ADD` adds a job's Moment count to the Organization's row for the database's
current UTC day in one atomic upsert and returns the day's total, so concurrent jobs all count;
`EMBED_USAGE_PURGE` removes the oldest days beyond the days to keep (never today) in a bounded batch.
`CALL_MOMENTS_RECORD` stores a Call's embedded and skipped Moment counts.
**After
erasure** (`remove_organization_rest`) no idempotency key remains except the remove-all call's own
(the kept route's), so nothing of an upload attempt's request or response is kept, and
`ORGANIZATION_REMOVAL_STATUS` does not look at what follows. What remains, only until a sweep covers
it, is the `orphan_sweep` hint and the `orphan_sweeps` row, which holds two times and no content:
`swept_through` and `erased_attempt_at`, the creation time of the latest upload attempt whose key was
erased (null when none). The discovery function and `ORPHAN_SWEEP_DONE` treat `erased_attempt_at` as a
pending attempt while it is newer than `swept_through`, so the Organization is reported 25 hours after
that attempt and the sweep that covers it removes the hint and the row (when the Organization then has
no key and no document); at most about 25 hours after the last attempt, longer only if the service does
not sweep. Erasure takes the `orphan_sweeps` row before the upload lock, and an upload attempt never
touches the row, so erasure, `ORPHAN_SWEEP_DONE` (row, then hint) and uploads (hint, then upload lock)
cannot wait on each other in a cycle. **This requires every upload transaction to insert its idempotency key
(`IDEMPOTENCY_BEGIN`) before it takes the upload lock (`QUOTA_LOCK`)**; the other order can close a cycle. Keep the idempotency purge at `IDEMPOTENCY_PURGE_AGE_MS` (the
statement enforces it). A server clock stepped forward by 24 hours or more is outside what this
protects.

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
at least `IDEMPOTENCY_MIN_PURGE_AGE_MS` old, which is `IDEMPOTENCY_PURGE_AGE_MS` (26 hours, an hour
more than the orphan sweep's age): an age passed below it is raised to it in SQL, so no caller can purge
the keys of upload attempts whose orphan sweep may not have run. Pass `IDEMPOTENCY_PURGE_AGE_MS`.

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

    `DOCUMENT_SEARCH_STATE`:

    ```sql
    select id, name, state, epoch
    from playbook.documents
    where organization_id = $1 and id = any(($2::text[])[1:100])
    order by id
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

    `DOCUMENT_LIST_PENDING_CLEANUP`:

    ```sql
    select id, epoch, deletion_seq, deleted_at
    from playbook.documents
    where organization_id = $1 and state = 'deleted' and (vectors_removed_seq is null or vectors_removed_seq < deletion_seq)
      and (deleted_at, id) > ($2::timestamptz, $3::text)
    order by deleted_at, id
    limit least(greatest(coalesce($4::int, 1), 1), 500)
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
        and created_at < clock_timestamp() - make_interval(secs => greatest(coalesce($2::float8, 0), 93600000) / 1000)
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
      not exists (select 1 from playbook.deals where organization_id = $1) as no_deals,
      not exists (select 1 from playbook.deal_imports where organization_id = $1) as no_imports,
      not exists (select 1 from playbook.rights_confirmations where organization_id = $1) as no_rights,
      not exists (select 1 from playbook.calls where organization_id = $1) as no_calls,
      (not exists (select 1 from playbook.documents where organization_id = $1)
        and not exists (select 1 from playbook.index_settings where organization_id = $1)
        and not exists (select 1 from playbook.organization_usage where organization_id = $1)
        and not exists (select 1 from playbook.consumed_message where organization_id = $1)
        and not exists (select 1 from playbook.deals where organization_id = $1)
        and not exists (select 1 from playbook.deal_imports where organization_id = $1)
        and not exists (select 1 from playbook.rights_confirmations where organization_id = $1)
        and not exists (select 1 from playbook.calls where organization_id = $1)) as removed
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

    `ORPHAN_SWEEP_DONE`:

    ```sql
    select swept_through, more from playbook.orphan_sweep_done($1::text, $2::timestamptz)
    ```

    `ORPHAN_SWEEP_CLAIM`:

    ```sql
    select claimed, swept_through, sweep_cursor, claim_token::text as claim_token from playbook.orphan_sweep_claim($1::text, $2::int)
    ```

    `ORPHAN_SWEEP_PAGE_DONE`:

    ```sql
    select held, swept_through, more, sweep_cursor from playbook.orphan_sweep_page_done($1::text, $2::timestamptz, $3::text, $4::timestamptz)
    ```

    `ORPHAN_SWEEP_STATE`:

    ```sql
    select swept_through, sweep_cursor, sweep_claim_until from playbook.orphan_sweeps where organization_id = $1
    ```

    `EMBED_USAGE_ADD`:

    ```sql
    insert into playbook.embed_usage as u (organization_id, day, moments)
    values ($1, (clock_timestamp() at time zone 'utc')::date, least(greatest(coalesce($2::int, 0), 0), 1000000))
    on conflict (organization_id, day) do update set moments = least(u.moments + excluded.moments, 1000000000)
    returning day::text as day, moments
    ```

    `EMBED_USAGE_PURGE`:

    ```sql
    with old as (
      select day from playbook.embed_usage
      where organization_id = $1
        and day < (clock_timestamp() at time zone 'utc')::date - greatest(coalesce($2::int, 1), 1)
      order by day
      limit least(greatest(coalesce($3::int, 1), 1), 500)
      for update skip locked)
    delete from playbook.embed_usage e using old
    where e.organization_id = $1 and e.day = old.day
    ```

    `DEAL_GET`:

    ```sql
    select d.id, d.deal_id, d.name, d.outcome, d.outcome_seq, d.closed_at, d.amount, d.currency, d.appeared_in_import, d.created_at, d.updated_at, (select count(*)::int from playbook.calls cc
      where cc.organization_id = d.organization_id and cc.deal_record_id = d.id and cc.state <> 'deleted') as call_count
    from playbook.deals d
    where organization_id = $1 and id = $2
    ```

    `DEAL_BY_DEAL_ID`:

    ```sql
    select d.id, d.deal_id, d.name, d.outcome, d.outcome_seq, d.closed_at, d.amount, d.currency, d.appeared_in_import, d.created_at, d.updated_at, (select count(*)::int from playbook.calls cc
      where cc.organization_id = d.organization_id and cc.deal_record_id = d.id and cc.state <> 'deleted') as call_count
    from playbook.deals d
    where organization_id = $1 and deal_id = $2::text
    ```

    `DEAL_LIST`:

    ```sql
    select d.id, d.deal_id, d.name, d.outcome, d.outcome_seq, d.closed_at, d.amount, d.currency, d.appeared_in_import, d.created_at, d.updated_at, (select count(*)::int from playbook.calls cc
      where cc.organization_id = d.organization_id and cc.deal_record_id = d.id and cc.state <> 'deleted') as call_count, d.created_at::text as cursor_at
    from playbook.deals d
    where organization_id = $1 and (created_at, id) < ($2::timestamptz, $3::text)
    order by created_at desc, id desc
    limit least(greatest(coalesce($4::int, 1), 1), 100)
    ```

    `DEAL_LIST_BY_OUTCOME`:

    ```sql
    select d.id, d.deal_id, d.name, d.outcome, d.outcome_seq, d.closed_at, d.amount, d.currency, d.appeared_in_import, d.created_at, d.updated_at, (select count(*)::int from playbook.calls cc
      where cc.organization_id = d.organization_id and cc.deal_record_id = d.id and cc.state <> 'deleted') as call_count, d.created_at::text as cursor_at
    from playbook.deals d
    where organization_id = $1 and outcome = $5::text and (created_at, id) < ($2::timestamptz, $3::text)
    order by created_at desc, id desc
    limit least(greatest(coalesce($4::int, 1), 1), 100)
    ```

    `DEAL_LIST_BY_IMPORT_FLAG`:

    ```sql
    select d.id, d.deal_id, d.name, d.outcome, d.outcome_seq, d.closed_at, d.amount, d.currency, d.appeared_in_import, d.created_at, d.updated_at, (select count(*)::int from playbook.calls cc
      where cc.organization_id = d.organization_id and cc.deal_record_id = d.id and cc.state <> 'deleted') as call_count, d.created_at::text as cursor_at
    from playbook.deals d
    where organization_id = $1 and appeared_in_import = $5::boolean and (created_at, id) < ($2::timestamptz, $3::text)
    order by created_at desc, id desc
    limit least(greatest(coalesce($4::int, 1), 1), 100)
    ```

    `DEAL_SET_OUTCOME`:

    ```sql
    with cur as (
      select * from playbook.deals where organization_id = $1 and id = $2 for no key update),
    u as (
      update playbook.deals d
      set outcome = $3::text, closed_at = case when $5::boolean then $4::date else d.closed_at end,
          outcome_seq = d.outcome_seq + 1, updated_at = clock_timestamp()
      from cur
      where d.organization_id = $1 and d.id = cur.id
        and (d.outcome is distinct from $3::text or ($5::boolean and d.closed_at is distinct from $4::date))
      returning d.*)
    select u.id, u.deal_id, u.name, u.outcome, u.outcome_seq, u.closed_at, u.amount, u.currency, u.appeared_in_import, u.created_at, u.updated_at, (select count(*)::int from playbook.calls cc
      where cc.organization_id = u.organization_id and cc.deal_record_id = u.id and cc.state <> 'deleted') as call_count, true as changed from u
    union all
    select cur.id, cur.deal_id, cur.name, cur.outcome, cur.outcome_seq, cur.closed_at, cur.amount, cur.currency, cur.appeared_in_import, cur.created_at, cur.updated_at, (select count(*)::int from playbook.calls cc
      where cc.organization_id = cur.organization_id and cc.deal_record_id = cur.id and cc.state <> 'deleted') as call_count, false from cur where not exists (select 1 from u)
    ```

    `DEAL_USAGE`:

    ```sql
    select deal_count
    from playbook.organization_usage
    where organization_id = $1
    ```

    `DEAL_IMPORT_INSERT`:

    ```sql
    select * from playbook.insert_deal_import($1::text, $2::text, $3::text, $4::text, $5::bigint, 5)
    ```

    `DEAL_IMPORT_GET`:

    ```sql
    select id, state, failure_reason,
      case when state = 'completed' then row_count end as row_count,
      case when state = 'completed' then applied_count end as applied_count,
      case when state = 'completed' then rejected_count end as rejected_count,
      uploaded_by, created_at, updated_at
    from playbook.deal_imports
    where organization_id = $1 and id = $2 and erased_at is null
    ```

    `DEAL_IMPORT_LIST`:

    ```sql
    select id, state, failure_reason,
      case when state = 'completed' then row_count end as row_count,
      case when state = 'completed' then applied_count end as applied_count,
      case when state = 'completed' then rejected_count end as rejected_count,
      uploaded_by, created_at, updated_at, created_at::text as cursor_at
    from playbook.deal_imports
    where organization_id = $1 and erased_at is null and (created_at, id) < ($2::timestamptz, $3::text)
    order by created_at desc, id desc
    limit least(greatest(coalesce($4::int, 1), 1), 100)
    ```

    `DEAL_IMPORT_CLAIM`:

    ```sql
    with due as (
      select id from playbook.deal_imports
      where organization_id = $1 and state in ('uploaded', 'processing') and erased_at is null
        and attempts < 20 and next_attempt_at <= clock_timestamp()
      order by next_attempt_at
      limit least(greatest(coalesce($2::int, 1), 1), 500)
      for update skip locked)
    update playbook.deal_imports i
    set state = 'processing', attempts = i.attempts + 1, claim_token = gen_random_uuid(),
        next_attempt_at = clock_timestamp() + make_interval(secs => greatest(coalesce($3::float8, 0), 1000) / 1000), updated_at = clock_timestamp()
    from due
    where i.organization_id = $1 and i.id = due.id
    returning i.id, i.object_key, i.size_bytes, i.attempts, i.claim_token,
      case when i.report_through > 1 then i.report_through end as last_row_number
    ```

    `DEAL_IMPORT_HEARTBEAT`:

    ```sql
    update playbook.deal_imports
    set next_attempt_at = clock_timestamp() + make_interval(secs => greatest(coalesce($4::float8, 0), 1000) / 1000), updated_at = clock_timestamp()
    where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null
    returning id
    ```

    `DEAL_IMPORT_RETRY`:

    ```sql
    update playbook.deal_imports
    set state = 'uploaded', claim_token = null,
        next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), 3600000) / 1000),
        updated_at = clock_timestamp()
    where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null
    returning id, attempts
    ```

    `DEAL_IMPORT_APPLY`:

    ```sql
    with imp as (
      select id, report_through, playbook.require_upload_lock($1) as lock_held from playbook.deal_imports
      where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null
      for update),
    raw as (
      select x.row_number, x.deal_id, x.reason, x.outcome, x.closed_at, x.amount, x.currency, x.name
      from imp, jsonb_to_recordset($4::jsonb) as x(row_number int, deal_id text, reason text, outcome text, closed_at date, amount numeric, currency text, name text)),
    refuse as (
      select case
        when exists (select 1 from raw where row_number is null or row_number not between 2 and 50001) then 'row_number_range'
        when exists (select 1 from raw group by row_number having count(*) > 1) then 'row_number_repeated'
      end as why),
    sent as (
      select raw.row_number, raw.deal_id, raw.reason, raw.outcome, raw.closed_at, raw.amount, raw.currency, raw.name,
        imp.report_through as base, dense_rank() over (order by raw.row_number) as rk
      from imp, raw
      where raw.row_number > imp.report_through and (select why from refuse) is null),
    b as (
      select row_number, deal_id, reason, outcome, closed_at, amount, currency, name
      from sent where row_number = base + rk
      order by row_number
      limit least(greatest(coalesce($6::int, 1), 1), 500)),
    lk as (
      select d.id, d.deal_id, d.outcome, d.outcome_seq, d.closed_at from playbook.deals d
      where d.organization_id = $1 and d.deal_id in (select deal_id from b where deal_id is not null)
      order by d.id
      for update),
    ranked as (
      select b.*, row_number() over (partition by b.deal_id order by b.row_number) as nth from b),
    seen as (
      select r.deal_id from playbook.deal_import_rows r
      where r.organization_id = $1 and r.import_id = $2 and r.reason is distinct from 'duplicate_in_file'
        and r.deal_id in (select deal_id from b)),
    cls as (
      select k.*, d.id as deal_pk, d.outcome as cur_outcome, d.outcome_seq as cur_seq, d.closed_at as cur_closed_at,
        case
          when k.deal_id is not null and (k.nth > 1 or k.deal_id in (select deal_id from seen)) then 'duplicate_in_file'
          when k.reason is not null then k.reason
          when d.id is not null and d.outcome <> 'open' then 'outcome_already_decided'
        end as bad
      from ranked k left join lk d on d.deal_id = k.deal_id),
    fin as (
      select c.*,
        case when c.bad is null and c.deal_pk is null
          and coalesce((select deal_count from playbook.organization_usage where organization_id = $1), 0)
            + count(*) filter (where c.bad is null and c.deal_pk is null) over (order by c.row_number) > $5::bigint
          then 'deal_limit_reached' else c.bad end as final_bad
      from cls c),
    upd as (
      update playbook.deals d
      set outcome = f.outcome,
          outcome_seq = d.outcome_seq + (case when f.outcome <> d.outcome or coalesce(f.closed_at, d.closed_at) is distinct from d.closed_at then 1 else 0 end),
          closed_at = coalesce(f.closed_at, d.closed_at), amount = coalesce(f.amount, d.amount),
          currency = coalesce(f.currency, d.currency), name = coalesce(f.name, d.name),
          appeared_in_import = true, updated_at = clock_timestamp()
      from fin f
      where d.organization_id = $1 and d.id = f.deal_pk and f.final_bad is null and d.outcome = 'open'
      returning d.id, d.deal_id, d.outcome_seq, (d.outcome_seq <> f.cur_seq) as bumped),
    ins as (
      insert into playbook.deals (id, organization_id, deal_id, name, outcome, closed_at, amount, currency, appeared_in_import)
      select 'deal_' || replace(gen_random_uuid()::text, '-', ''), $1, f.deal_id, f.name, f.outcome, f.closed_at, f.amount, f.currency, true
      from fin f where f.final_bad is null and f.deal_pk is null
      returning deal_id),
    res as (
      select f.row_number, f.deal_id, f.final_bad as reason from fin f where f.final_bad is not null
      union all select f.row_number, f.deal_id, null from fin f join upd u on u.id = f.deal_pk where f.final_bad is null
      union all select f.row_number, f.deal_id, null from fin f join ins i on i.deal_id = f.deal_id where f.final_bad is null and f.deal_pk is null),
    rep as (
      insert into playbook.deal_import_rows (organization_id, import_id, row_number, deal_id, result, reason)
      select $1, $2, res.row_number, res.deal_id, case when res.reason is null then 'applied' else 'rejected' end, res.reason
      from res
      returning result),
    cnt as (
      update playbook.deal_imports
      set applied_count = applied_count + (select count(*) from rep where result = 'applied'),
          rejected_count = rejected_count + (select count(*) from rep where result = 'rejected'),
          report_through = report_through + (select count(*) from b),
          updated_at = clock_timestamp()
      where organization_id = $1 and id = $2 and exists (select 1 from imp)
      returning report_through)
    select 'summary' as kind, null::text as deal_record_id, null::int as outcome_seq,
      (select count(*) from b)::int as taken,
      (select count(*) from rep where result = 'applied')::int as applied,
      (select count(*) from rep where result = 'rejected')::int as rejected,
      (select report_through from cnt) as through,
      (select why from refuse) as refusal
    where exists (select 1 from imp)
    union all
    select 'outcome_changed', u.id, u.outcome_seq, null, null, null, null, null from upd u where u.bumped
    ```

    `DEAL_IMPORT_FINISH`:

    ```sql
    update playbook.deal_imports
    set state = 'completed', claim_token = null, row_count = applied_count + rejected_count,
        object_removed_at = clock_timestamp(), finished_at = clock_timestamp(), updated_at = clock_timestamp()
    where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null
      and report_through = $4::int + 1
    returning id, row_count, applied_count, rejected_count
    ```

    `DEAL_IMPORT_FAIL`:

    ```sql
    update playbook.deal_imports
    set state = 'failed', failure_reason = $4::text, claim_token = null,
        object_removed_at = clock_timestamp(), finished_at = clock_timestamp(), updated_at = clock_timestamp()
    where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'processing' and erased_at is null
    returning id
    ```

    `DEAL_IMPORT_GIVE_UP_SPENT`:

    ```sql
    with batch as (
      select id from playbook.deal_imports
      where organization_id = $1 and state in ('uploaded', 'processing') and erased_at is null
        and attempts >= 20 and next_attempt_at <= clock_timestamp()
      order by next_attempt_at
      limit least(greatest(coalesce($2::int, 1), 1), 500)
      for update skip locked)
    update playbook.deal_imports t
    set state = 'failed', failure_reason = 'processing_failed', claim_token = null,
        finished_at = clock_timestamp(), updated_at = clock_timestamp()
    from batch
    where t.organization_id = $1 and t.id = batch.id
    returning t.id, t.object_key
    ```

    `DEAL_IMPORT_OBJECT_REMOVED`:

    ```sql
    update playbook.deal_imports
    set object_removed_at = coalesce(object_removed_at, clock_timestamp()), updated_at = clock_timestamp()
    where organization_id = $1 and id = $2 and (erased_at is not null or state = 'failed')
    returning id
    ```

    `DEAL_IMPORT_ROWS_LIST`:

    ```sql
    select row_number, deal_id, result, reason
    from playbook.deal_import_rows
    where organization_id = $1 and import_id = $2 and row_number > $3::int
    order by row_number
    limit least(greatest(coalesce($4::int, 1), 1), 100)
    ```

    `DEAL_IMPORT_ROWS_LIST_BY_RESULT`:

    ```sql
    select row_number, deal_id, result, reason
    from playbook.deal_import_rows
    where organization_id = $1 and import_id = $2 and result = $5::text and row_number > $3::int
    order by row_number
    limit least(greatest(coalesce($4::int, 1), 1), 100)
    ```

    `DEAL_IMPORT_ERASE_BATCH`:

    ```sql
    with batch as (
      select id from playbook.deal_imports
      where organization_id = $1 and erased_at is null
      order by id
      limit least(greatest(coalesce($2::int, 1), 1), 500)
      for update)
    update playbook.deal_imports i
    set state = case when i.state in ('uploaded', 'processing') then 'failed' else i.state end,
        failure_reason = case when i.state in ('uploaded', 'processing') then 'processing_failed' else i.failure_reason end,
        finished_at = coalesce(i.finished_at, clock_timestamp()), claim_token = null,
        erased_at = clock_timestamp(), updated_at = clock_timestamp()
    from batch
    where i.organization_id = $1 and i.id = batch.id
    returning i.id, i.object_key, (i.object_removed_at is null) as object_pending
    ```

    `DEAL_IMPORT_LIST_ERASED`:

    ```sql
    select id, object_key, (object_removed_at is null) as object_pending
    from playbook.deal_imports
    where organization_id = $1 and erased_at is not null and id > $2::text
    order by id
    limit least(greatest(coalesce($3::int, 1), 1), 100)
    ```

    `DEAL_IMPORT_PURGE_BATCH`:

    ```sql
    with imp as (
      select id from playbook.deal_imports
      where organization_id = $1 and id = $2 and erased_at is not null and object_removed_at is not null
      for update),
    pick as (
      select r.row_number from playbook.deal_import_rows r, imp
      where r.organization_id = $1 and r.import_id = $2
      order by r.row_number
      limit least(greatest(coalesce($3::int, 1), 1), 500)),
    del as (
      delete from playbook.deal_import_rows r
      using pick
      where r.organization_id = $1 and r.import_id = $2 and r.row_number = pick.row_number
      returning 1),
    gone as (
      delete from playbook.deal_imports i
      using imp
      where i.organization_id = $1 and i.id = imp.id
        and not exists (select 1 from playbook.deal_import_rows x where x.organization_id = $1 and x.import_id = $2)
      returning 1)
    select (select count(*) from del)::int as deleted_rows, exists (select 1 from gone) as import_deleted
    where exists (select 1 from imp)
    ```

    `DEAL_ERASE_BATCH`:

    ```sql
    select playbook.erase_deals($1::text, $2::int) as deleted
    ```

    `RIGHTS_GET`:

    ```sql
    select confirmed_by, confirmed_at, wording_version
    from playbook.rights_confirmations
    where organization_id = $1
    ```

    `RIGHTS_CONFIRM`:

    ```sql
    with up as (
      insert into playbook.rights_confirmations as r (organization_id, confirmed_by, confirmed_at, wording_version)
      values ($1, $2::text, clock_timestamp(), $3::int)
      on conflict (organization_id) do update
        set confirmed_by = excluded.confirmed_by, confirmed_at = excluded.confirmed_at, wording_version = excluded.wording_version
        where r.wording_version < excluded.wording_version
      returning confirmed_by, confirmed_at, wording_version)
    select confirmed_by, confirmed_at, wording_version, true as recorded from up
    union all
    select confirmed_by, confirmed_at, wording_version, false
    from playbook.rights_confirmations
    where organization_id = $1 and not exists (select 1 from up)
    ```

    `ORGANIZATIONS_WITH_WORK`:

    ```sql
    select organization_id, resume_after from playbook.organizations_with_work($1::text, $2::text, least(greatest(coalesce($3::int, 1), 1), 500))
    ```

    `CALL_USAGE`:

    ```sql
    select call_count, recording_byte_count
    from playbook.organization_usage
    where organization_id = $1
    ```

    `CALL_INSERT`:

    ```sql
    with rights as (
      select exists (select 1 from playbook.rights_confirmations
                     where organization_id = $1 and wording_version = $19::int) as ok),
    dup as (
      select c.id, c.state, c.failure_reason, (d.deal_id = $3::text) as same_deal
      from playbook.calls c join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id
      where c.organization_id = $1 and c.content_hash = $9::bytea
        and c.purge_started_at is null and c.restore_barred_at is null),
    deal as (
      select id from playbook.deals where organization_id = $1 and deal_id = $3::text),
    usage as (
      select call_count, recording_byte_count, deal_count from playbook.organization_usage where organization_id = $1),
    gate as (
      select (select ok from rights) as rights_ok,
        not exists (select 1 from dup) as no_dup,
        (coalesce((select call_count from usage), 0) < $16::bigint
          and ($7::text <> 'recording' or coalesce((select recording_byte_count from usage), 0) + $8::bigint <= $17::bigint)
          and (exists (select 1 from deal) or coalesce((select deal_count from usage), 0) < $18::bigint)) as quota_ok),
    go as (
      select 1 as one from gate where rights_ok and no_dup and quota_ok),
    made as (
      insert into playbook.deals (id, organization_id, deal_id)
      select $4::text, $1, $3::text from go where not exists (select 1 from deal)
      returning id),
    ins as (
      insert into playbook.calls
        (id, organization_id, deal_record_id, kind, file_name, media_type, size_bytes, content_hash,
         uploaded_by, object_key, rep_by, rep_label, rep_channel)
      select $2::text, $1, coalesce((select id from deal), (select id from made)), $7::text, $5::text, $6::text,
        $8::bigint, $9::bytea, $10::text, $11::text, $12::text, $13::text, $14::text
      from go
      returning id, state, epoch, rep_seq),
    queued as (
      insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)
      select $15::text, $1, id, case when $7::text = 'recording' then 'transcribe' else 'process' end, epoch, rep_seq, clock_timestamp(), clock_timestamp()
      from ins)
    select 'created' as result, id, state, null::text as failure_reason from ins
    union all
    select case when same_deal then 'existing' else 'other_deal' end,
      case when same_deal then id end, case when same_deal then state end, case when same_deal then failure_reason end
    from dup where (select ok from rights)
    union all
    select case when not rights_ok then 'rights_required' else 'quota_exceeded' end, null, null, null
    from gate where not rights_ok or (no_dup and not quota_ok)
    ```

    `CALL_GET`:

    ```sql
    select c.id, c.deal_record_id, d.deal_id, d.outcome as deal_outcome,
      (c.state = 'ready' and d.outcome = 'won' and c.tagged_outcome_seq >= d.outcome_seq) as in_search,
      c.kind, c.file_name, c.media_type, c.size_bytes, c.duration_seconds, c.state, c.failure_reason,
      c.rep_by, c.rep_label, c.rep_channel, c.speaker_labels, c.deleted_at, c.purge_due_at,
      c.uploaded_by, c.created_at, c.updated_at, c.rep_seq, c.epoch, c.deletion_seq,
      (c.state = 'deleted' and (c.purge_due_at <= clock_timestamp() or c.purge_started_at is not null or c.restore_barred_at is not null)) as not_restorable
    from playbook.calls c join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id
    where c.organization_id = $1 and c.id = $2
    ```

    `CALL_SEARCH_STATE`:

    ```sql
    select c.id as call_id,
      (c.state = 'ready' and d.outcome = 'won' and c.tagged_outcome_seq >= d.outcome_seq) as in_search,
      c.epoch, c.rep_seq, c.deal_record_id
    from playbook.calls c
    join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id
    where c.organization_id = $1 and c.id = any(($2::text[])[1:100])
    order by c.id
    ```

    `CALL_LIST`:

    ```sql
    select c.id, c.deal_record_id, d.deal_id, d.outcome as deal_outcome,
      (c.state = 'ready' and d.outcome = 'won' and c.tagged_outcome_seq >= d.outcome_seq) as in_search,
      c.kind, c.file_name, c.media_type, c.size_bytes, c.duration_seconds, c.state, c.failure_reason,
      c.rep_by, c.rep_label, c.rep_channel, c.speaker_labels, c.deleted_at, c.purge_due_at,
      c.uploaded_by, c.created_at, c.updated_at, c.rep_seq, c.epoch, c.deletion_seq,
      (c.state = 'deleted' and (c.purge_due_at <= clock_timestamp() or c.purge_started_at is not null or c.restore_barred_at is not null)) as not_restorable, c.created_at::text as cursor_at
    from playbook.calls c join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id
    where c.organization_id = $1 and c.state <> 'deleted' and (c.created_at, c.id) < ($2::timestamptz, $3::text)
    order by c.created_at desc, c.id desc
    limit least(greatest(coalesce($4::int, 1), 1), 100)
    ```

    `CALL_LIST_BY_STATE`:

    ```sql
    select c.id, c.deal_record_id, d.deal_id, d.outcome as deal_outcome,
      (c.state = 'ready' and d.outcome = 'won' and c.tagged_outcome_seq >= d.outcome_seq) as in_search,
      c.kind, c.file_name, c.media_type, c.size_bytes, c.duration_seconds, c.state, c.failure_reason,
      c.rep_by, c.rep_label, c.rep_channel, c.speaker_labels, c.deleted_at, c.purge_due_at,
      c.uploaded_by, c.created_at, c.updated_at, c.rep_seq, c.epoch, c.deletion_seq,
      (c.state = 'deleted' and (c.purge_due_at <= clock_timestamp() or c.purge_started_at is not null or c.restore_barred_at is not null)) as not_restorable, c.created_at::text as cursor_at
    from playbook.calls c join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id
    where c.organization_id = $1 and c.state = $5::text and (c.created_at, c.id) < ($2::timestamptz, $3::text)
    order by c.created_at desc, c.id desc
    limit least(greatest(coalesce($4::int, 1), 1), 100)
    ```

    `CALL_LIST_BY_DEAL`:

    ```sql
    select c.id, c.deal_record_id, d.deal_id, d.outcome as deal_outcome,
      (c.state = 'ready' and d.outcome = 'won' and c.tagged_outcome_seq >= d.outcome_seq) as in_search,
      c.kind, c.file_name, c.media_type, c.size_bytes, c.duration_seconds, c.state, c.failure_reason,
      c.rep_by, c.rep_label, c.rep_channel, c.speaker_labels, c.deleted_at, c.purge_due_at,
      c.uploaded_by, c.created_at, c.updated_at, c.rep_seq, c.epoch, c.deletion_seq,
      (c.state = 'deleted' and (c.purge_due_at <= clock_timestamp() or c.purge_started_at is not null or c.restore_barred_at is not null)) as not_restorable, c.created_at::text as cursor_at
    from playbook.calls c join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id
    where c.organization_id = $1 and c.deal_record_id = $5::text and c.state <> 'deleted' and (c.created_at, c.id) < ($2::timestamptz, $3::text)
    order by c.created_at desc, c.id desc
    limit least(greatest(coalesce($4::int, 1), 1), 100)
    ```

    `CALL_LIST_BY_DEAL_STATE`:

    ```sql
    select c.id, c.deal_record_id, d.deal_id, d.outcome as deal_outcome,
      (c.state = 'ready' and d.outcome = 'won' and c.tagged_outcome_seq >= d.outcome_seq) as in_search,
      c.kind, c.file_name, c.media_type, c.size_bytes, c.duration_seconds, c.state, c.failure_reason,
      c.rep_by, c.rep_label, c.rep_channel, c.speaker_labels, c.deleted_at, c.purge_due_at,
      c.uploaded_by, c.created_at, c.updated_at, c.rep_seq, c.epoch, c.deletion_seq,
      (c.state = 'deleted' and (c.purge_due_at <= clock_timestamp() or c.purge_started_at is not null or c.restore_barred_at is not null)) as not_restorable, c.created_at::text as cursor_at
    from playbook.calls c join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id
    where c.organization_id = $1 and c.state = $6::text and c.deal_record_id = $5::text and (c.created_at, c.id) < ($2::timestamptz, $3::text)
    order by c.created_at desc, c.id desc
    limit least(greatest(coalesce($4::int, 1), 1), 100)
    ```

    `CALL_MOMENTS_RECORD`:

    ```sql
    update playbook.calls
    set embedded_moments = least(greatest(coalesce($3::int, 0), 0), 1000000),
        skipped_moments = least(greatest(coalesce($4::int, 0), 0), 1000000)
    where organization_id = $1 and id = $2 and state in ('processing', 'ready')
    returning id, embedded_moments, skipped_moments
    ```

    `CALL_SOFT_DELETE`:

    ```sql
    with j as (
      update playbook.call_jobs
      set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp(),
          next_attempt_at = case when state = 'running' then next_attempt_at else clock_timestamp() end
      where organization_id = $1 and call_id = $2 and state in ('queued', 'running')
      returning id),
    x as (
      update playbook.calls
      set state = 'deleted', epoch = epoch + 1, deletion_seq = deletion_seq + 1,
          deleted_at = clock_timestamp(), deleted_by = $3,
          purge_due_at = clock_timestamp() + make_interval(secs => greatest(coalesce($4::float8, 0), 3600000) / 1000),
          failure_reason = null, updated_at = clock_timestamp()
      where organization_id = $1 and id = $2 and state <> 'deleted' and (select count(*) from j) >= 0
      returning id, state, deletion_seq, purge_due_at)
    select id, state, deletion_seq, purge_due_at, true as changed from x
    union all
    select id, state, deletion_seq, purge_due_at, false from playbook.calls
    where organization_id = $1 and id = $2 and state = 'deleted' and not exists (select 1 from x)
    ```

    `CALL_RESTORE`:

    ```sql
    with j as (
      update playbook.call_jobs
      set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
      where organization_id = $1 and call_id = $2 and state in ('queued', 'running')
        and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = $2 and x.state = 'deleted')
      returning id),
    x as (
      update playbook.calls
      set state = case when kind = 'recording' and transcript_key is null then 'uploaded'
                       when rep_by is null then 'awaiting_rep' else 'processing' end,
          epoch = epoch + 1, deleted_at = null, deleted_by = null, purge_due_at = null, updated_at = clock_timestamp()
      where organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is null and restore_barred_at is null
        and purge_due_at > clock_timestamp()
        and (select count(*) from j) >= 0
      returning organization_id, id, epoch, deletion_seq, state, rep_seq),
    queued as (
      insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)
      select $3::text, organization_id, id, case when state = 'uploaded' then 'transcribe' else 'process' end, epoch, rep_seq, clock_timestamp(), clock_timestamp()
      from x where state <> 'awaiting_rep')
    select id, state, epoch, deletion_seq, true as changed from x
    union all
    select id, state, epoch, deletion_seq, false from playbook.calls
    where organization_id = $1 and id = $2 and state <> 'deleted' and not exists (select 1 from x)
    ```

    `CALL_RESTORE_FOR_UPLOAD`:

    ```sql
    with j as (
      update playbook.call_jobs
      set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
      where organization_id = $1 and call_id = $2 and state in ('queued', 'running')
        and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = $2 and x.state = 'deleted')
      returning id),
    x as (
      update playbook.calls
      set state = case when kind = 'recording' and transcript_key is null then 'uploaded'
                       when rep_by is null then 'awaiting_rep' else 'processing' end,
          epoch = epoch + 1, deleted_at = null, deleted_by = null, purge_due_at = null, updated_at = clock_timestamp()
      where organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is null and restore_barred_at is null
        and (select count(*) from j) >= 0
      returning organization_id, id, epoch, deletion_seq, state, rep_seq),
    queued as (
      insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)
      select $3::text, organization_id, id, case when state = 'uploaded' then 'transcribe' else 'process' end, epoch, rep_seq, clock_timestamp(), clock_timestamp()
      from x where state <> 'awaiting_rep')
    select id, state, epoch, deletion_seq, true as changed from x
    union all
    select id, state, epoch, deletion_seq, false from playbook.calls
    where organization_id = $1 and id = $2 and state <> 'deleted' and not exists (select 1 from x)
    ```

    `CALL_REQUEUE`:

    ```sql
    with j as (
      update playbook.call_jobs
      set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
      where organization_id = $1 and call_id = $2 and state in ('queued', 'running')
        and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = $2 and x.state = 'failed'
                    and x.failure_reason in ('transcription_failed', 'transcription_timed_out', 'processing_failed')
                    and x.vendor_send_seq < 20)
      returning id),
    x as (
      update playbook.calls
      set state = 'uploaded', failure_reason = null, epoch = epoch + 1, updated_at = clock_timestamp()
      where organization_id = $1 and id = $2 and state = 'failed'
        and failure_reason in ('transcription_failed', 'transcription_timed_out', 'processing_failed')
        and vendor_send_seq < 20
        and (select count(*) from j) >= 0
      returning organization_id, id, epoch, rep_seq, kind, transcript_key),
    queued as (
      insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)
      select $3::text, organization_id, id, case when kind = 'recording' and transcript_key is null then 'transcribe' else 'process' end,
        epoch, rep_seq, clock_timestamp(), clock_timestamp()
      from x)
    select id, 'uploaded' as state, epoch, true as changed from x
    union all
    select id, state, epoch, false from playbook.calls
    where organization_id = $1 and id = $2 and state <> 'deleted' and not exists (select 1 from x)
    ```

    `CALL_SET_REP`:

    ```sql
    with jl as (
      select id from playbook.call_jobs
      where organization_id = $1 and call_id = $2 and state in ('queued', 'running')
      order by id
      for update),
    cur as (
      select * from playbook.calls where organization_id = $1 and id = $2 and (select count(*) from jl) >= 0 for update),
    v as (
      select cur.id, cur.state, cur.rep_seq,
        case
          when $3::text is null or $3::text not in ('speaker', 'channel') then 'invalid'
          when cur.state <> 'deleted' and cur.rep_by is not distinct from $3::text
            and cur.rep_label is not distinct from (case when $3::text = 'speaker' then $4::text end)
            and cur.rep_channel is not distinct from (case when $3::text = 'channel' then $5::text end)
            and cur.state <> 'failed' then 'unchanged'
          when not (cur.state in ('ready', 'awaiting_rep')
                    or (cur.state = 'failed' and cur.failure_reason in ('rep_label_not_found', 'not_per_side')))
            then 'not_changeable'
          when not coalesce(($3::text = 'speaker' and ($4::text is not null and $4::text = any(cur.speaker_labels)))
                    or ($3::text = 'channel' and cur.kind = 'recording' and $5::text in ('left', 'right')), false) then 'invalid'
          else 'changed'
        end as result
      from cur),
    j as (
      update playbook.call_jobs
      set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
      where organization_id = $1 and id in (select id from jl)
        and exists (select 1 from v where result = 'changed')
      returning id),
    u as (
      update playbook.calls c
      set rep_by = $3::text, rep_label = case when $3::text = 'speaker' then $4::text end,
          rep_channel = case when $3::text = 'channel' then $5::text end,
          rep_seq = c.rep_seq + 1, state = 'processing', failure_reason = null, updated_at = clock_timestamp()
      from v
      where c.organization_id = $1 and c.id = v.id and v.result = 'changed' and (select count(*) from j) >= 0
      returning c.id, c.rep_seq, c.epoch),
    queued as (
      insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)
      select $6::text, $1, id, 'rebuild', epoch, rep_seq, clock_timestamp(), clock_timestamp() from u)
    select 'changed' as result, id, 'processing'::text as state, rep_seq from u
    union all
    select result, id, state, rep_seq from v where result <> 'changed'
    ```

    `CALL_JOB_CLAIM`:

    ```sql
    with due as (
      select j.id, coalesce((c.epoch = j.epoch and (
        (j.kind = 'transcribe' and c.state in ('uploaded', 'transcribing'))
        or (j.kind = 'process' and c.state in ('uploaded', 'processing'))
        or (j.kind = 'rebuild' and c.state = 'processing' and c.rep_seq = j.rep_seq))), false) as live
      from playbook.call_jobs j
      left join playbook.calls c on c.organization_id = j.organization_id and c.id = j.call_id
      where j.organization_id = $1 and j.state in ('queued', 'running')
        and j.attempts < 20 and j.next_attempt_at <= clock_timestamp()
        and ($4::text is null or j.id = $4::text)
      order by j.next_attempt_at
      limit least(greatest(coalesce($2::int, 1), 1), 500)
      for update of j skip locked),
    stale as (
      update playbook.call_jobs t
      set state = 'cancelled', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
      from due
      where t.organization_id = $1 and t.id = due.id and not due.live
      returning t.id),
    claimed as (
      update playbook.call_jobs j
      set state = 'running', attempts = j.attempts + 1, claim_token = gen_random_uuid(),
          next_attempt_at = clock_timestamp() + make_interval(secs => greatest(coalesce($3::float8, 0), 1000) / 1000), updated_at = clock_timestamp()
      from due
      where j.organization_id = $1 and j.id = due.id and due.live
      returning j.id, j.call_id, j.kind, j.epoch, j.rep_seq, j.attempts, j.claim_token, j.created_at as job_created_at),
    moved as (
      update playbook.calls c
      set state = case claimed.kind when 'transcribe' then 'transcribing' when 'process' then 'processing' else c.state end,
          updated_at = clock_timestamp()
      from claimed
      where c.organization_id = $1 and c.id = claimed.call_id
        and (c.epoch = claimed.epoch and (
        (claimed.kind = 'transcribe' and c.state in ('uploaded', 'transcribing'))
        or (claimed.kind = 'process' and c.state in ('uploaded', 'processing'))
        or (claimed.kind = 'rebuild' and c.state = 'processing' and c.rep_seq = claimed.rep_seq)))
      returning c.id, c.kind as call_kind, c.media_type, c.size_bytes, c.object_key, c.transcript_key,
                c.rep_by, c.rep_label, c.rep_channel, c.speaker_labels, c.sent_to_vendor_at, c.content_hash)
    select cl.id, cl.call_id, cl.kind as job_kind, cl.epoch, cl.rep_seq, cl.attempts, cl.claim_token,
      m.call_kind, m.media_type, m.size_bytes, m.object_key, m.transcript_key, m.rep_by, m.rep_label,
      m.rep_channel, m.speaker_labels, m.sent_to_vendor_at,
      cl.job_created_at, m.content_hash,
      (select count(*) from stale)::int as cancelled,
      ((select count(*) from claimed) - (select count(*) from moved))::int as lost
    from claimed cl join moved m on m.id = cl.call_id
    union all
    select null::text, null::text, null::text, null::int, null::int, null::int, null::uuid, null::text, null::text, null::bigint, null::text, null::text, null::text, null::text, null::text, null::text[], null::timestamptz, null::timestamptz, null::bytea,
      (select count(*) from stale)::int, ((select count(*) from claimed) - (select count(*) from moved))::int
    where not exists (select 1 from claimed cl join moved m on m.id = cl.call_id)
      and ((select count(*) from stale) > 0 or (select count(*) from claimed) > 0)
    ```

    `CALL_JOB_HEARTBEAT`:

    ```sql
    update playbook.call_jobs
    set next_attempt_at = clock_timestamp() + make_interval(secs => greatest(coalesce($4::float8, 0), 1000) / 1000), updated_at = clock_timestamp()
    where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
      and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id and (x.epoch = call_jobs.epoch and (
        (call_jobs.kind = 'transcribe' and x.state in ('uploaded', 'transcribing'))
        or (call_jobs.kind = 'process' and x.state in ('uploaded', 'processing'))
        or (call_jobs.kind = 'rebuild' and x.state = 'processing' and x.rep_seq = call_jobs.rep_seq))))
    returning id
    ```

    `CALL_JOB_RETRY`:

    ```sql
    update playbook.call_jobs
    set state = 'queued', claim_token = null,
        next_attempt_at = clock_timestamp() + make_interval(secs => least(greatest(coalesce($4::float8, 0), 0), 3600000) / 1000),
        updated_at = clock_timestamp()
    where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
    returning id, attempts
    ```

    `CALL_SENT_TO_VENDOR`:

    ```sql
    with live as (
      select c.id, c.vendor_send_seq from playbook.calls c
      join playbook.call_jobs j on j.organization_id = c.organization_id and j.call_id = c.id
      where j.organization_id = $1 and j.id = $2 and j.claim_token = $3::uuid and j.state = 'running'
        and (c.epoch = j.epoch and (
        (j.kind = 'transcribe' and c.state in ('uploaded', 'transcribing'))
        or (j.kind = 'process' and c.state in ('uploaded', 'processing'))
        or (j.kind = 'rebuild' and c.state = 'processing' and c.rep_seq = j.rep_seq)))),
    u as (
      update playbook.calls c
      set sent_to_vendor_at = clock_timestamp(), vendor_send_seq = c.vendor_send_seq + 1,
          vendor_removed_at = null, updated_at = clock_timestamp()
      from live
      where c.organization_id = $1 and c.id = live.id and live.vendor_send_seq < 20
      returning c.id, c.vendor_send_seq),
    ins as (
      insert into playbook.call_vendor_sends (organization_id, call_id, seq)
      select $1, id, vendor_send_seq from u)
    select id, vendor_send_seq, true as sent from u
    union all
    select id, vendor_send_seq, false from live where vendor_send_seq >= 20
    ```

    `CALL_JOB_RECORD`:

    ```sql
    with j as (
      update playbook.call_jobs
      set next_attempt_at = clock_timestamp() + make_interval(secs => greatest(coalesce($7::float8, 0), 1000) / 1000), updated_at = clock_timestamp()
      where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
        and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id and (x.epoch = call_jobs.epoch and (
        (call_jobs.kind = 'transcribe' and x.state in ('uploaded', 'transcribing'))
        or (call_jobs.kind = 'process' and x.state in ('uploaded', 'processing'))
        or (call_jobs.kind = 'rebuild' and x.state = 'processing' and x.rep_seq = call_jobs.rep_seq))))
      returning call_id, epoch)
    update playbook.calls c
    set transcript_key = coalesce($4::text, c.transcript_key), duration_seconds = coalesce($5::int, c.duration_seconds),
        speaker_labels = coalesce($6::text[], c.speaker_labels), updated_at = clock_timestamp()
    from j
    where c.organization_id = $1 and c.id = j.call_id and c.epoch = j.epoch
    returning c.id
    ```

    `CALL_JOB_TRANSCRIBED`:

    ```sql
    with j as (
      update playbook.call_jobs
      set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
      where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running' and kind = 'transcribe'
        and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id
                    and x.state = 'transcribing' and x.epoch = call_jobs.epoch and x.transcript_key is not null)
      returning call_id, epoch),
    c as (
      update playbook.calls
      set state = case when rep_by is null then 'awaiting_rep' else 'processing' end, updated_at = clock_timestamp()
      where organization_id = $1 and id = (select call_id from j) and epoch = (select epoch from j) and state = 'transcribing'
      returning id, state, epoch, rep_seq),
    q as (
      insert into playbook.call_jobs (id, organization_id, call_id, kind, epoch, rep_seq, next_attempt_at, created_at)
      select $4::text, $1, id, 'process', epoch, rep_seq, clock_timestamp(), clock_timestamp() from c where state = 'processing')
    select id, state from c
    ```

    `CALL_JOB_COMPLETE`:

    ```sql
    with dk as (
      select d.id, d.outcome_seq from playbook.deals d
      where d.organization_id = $1
        and d.id = (select x.deal_record_id from playbook.calls x join playbook.call_jobs y
                      on y.organization_id = x.organization_id and y.call_id = x.id
                    where y.organization_id = $1 and y.id = $2)
      for no key update),
    j as (
      update playbook.call_jobs
      set state = 'succeeded', claim_token = null, finished_at = clock_timestamp(), updated_at = clock_timestamp()
      where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running' and kind in ('process', 'rebuild')
        and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id
                    and x.state = 'processing' and x.epoch = call_jobs.epoch
                    and (call_jobs.kind = 'process' or x.rep_seq = call_jobs.rep_seq)
                    and x.rep_by is not null and (x.rep_by <> 'speaker' or x.rep_label = any(x.speaker_labels)))
      returning call_id, epoch),
    c as (
      update playbook.calls c
      set state = 'ready', tagged_outcome_seq = greatest(c.tagged_outcome_seq, least($4::int, dk.outcome_seq)), updated_at = clock_timestamp()
      from j, dk
      where c.organization_id = $1 and c.id = j.call_id and c.epoch = j.epoch and c.state = 'processing'
        and dk.id = c.deal_record_id
      returning c.id, c.deal_record_id, c.tagged_outcome_seq),
    dl as (
      update playbook.deals d
      set retag_through = least(d.retag_through, c.tagged_outcome_seq)
      from c, dk
      where d.organization_id = $1 and d.id = c.deal_record_id and dk.id = d.id and c.tagged_outcome_seq < dk.outcome_seq
      returning d.id)
    select id from c
    ```

    `CALL_JOB_FAIL`:

    ```sql
    with j as (
      update playbook.call_jobs
      set state = 'failed', failure_reason = $4::text, claim_token = null,
          finished_at = clock_timestamp(), updated_at = clock_timestamp()
      where organization_id = $1 and id = $2 and claim_token = $3::uuid and state = 'running'
        and exists (select 1 from playbook.calls x where x.organization_id = $1 and x.id = call_jobs.call_id and (x.epoch = call_jobs.epoch and (
        (call_jobs.kind = 'transcribe' and x.state in ('uploaded', 'transcribing'))
        or (call_jobs.kind = 'process' and x.state in ('uploaded', 'processing'))
        or (call_jobs.kind = 'rebuild' and x.state = 'processing' and x.rep_seq = call_jobs.rep_seq))))
      returning call_id, epoch),
    c as (
      update playbook.calls
      set state = 'failed', failure_reason = $4::text,
          speaker_labels = case when $4::text = 'too_many_speakers' then '{}'::text[] else speaker_labels end,
          updated_at = clock_timestamp()
      where organization_id = $1 and id = (select call_id from j) and epoch = (select epoch from j)
        and state in ('uploaded', 'transcribing', 'processing')
      returning id)
    select id from c
    ```

    `CALL_JOB_GIVE_UP_SPENT`:

    ```sql
    with batch as (
      select id from playbook.call_jobs
      where organization_id = $1 and state in ('queued', 'running')
        and attempts >= 20 and next_attempt_at <= clock_timestamp()
      order by next_attempt_at
      limit least(greatest(coalesce($2::int, 1), 1), 500)
      for update skip locked),
    j as (
      update playbook.call_jobs t
      set state = 'failed', failure_reason = 'processing_failed', claim_token = null,
          finished_at = clock_timestamp(), updated_at = clock_timestamp()
      from batch
      where t.organization_id = $1 and t.id = batch.id
      returning t.call_id, t.epoch),
    c as (
      update playbook.calls
      set state = 'failed', failure_reason = 'processing_failed', updated_at = clock_timestamp()
      from j
      where calls.organization_id = $1 and calls.id = j.call_id and calls.epoch = j.epoch
        and calls.state in ('uploaded', 'transcribing', 'processing'))
    select call_id from j
    ```

    `CALL_CLEANUP_BEGIN`:

    ```sql
    select c.id, c.epoch,
      not exists (
        select 1 from playbook.call_jobs j
        where j.organization_id = c.organization_id and j.call_id = c.id
          and j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp()) as clear
    from playbook.calls c
    where c.organization_id = $1 and c.id = $2 and c.state = 'deleted' and c.deletion_seq = $3::int
    ```

    `CALL_LIST_PENDING_CLEANUP`:

    ```sql
    select id, epoch, deletion_seq, deleted_at, deleted_at::text as cursor_at
    from playbook.calls
    where organization_id = $1 and state = 'deleted' and (vectors_removed_seq is null or vectors_removed_seq < deletion_seq)
      and (deleted_at, id) > ($2::timestamptz, $3::text)
    order by deleted_at, id
    limit least(greatest(coalesce($4::int, 1), 1), 500)
    ```

    `CALL_CLEANUP_DONE`:

    ```sql
    update playbook.calls
    set vectors_removed_seq = $3::int, updated_at = clock_timestamp()
    where organization_id = $1 and id = $2 and state = 'deleted' and deletion_seq = $3::int
    returning id
    ```

    `CALL_VENDOR_ID_RECORD`:

    ```sql
    with cur as (
      select vendor_id from playbook.call_vendor_sends
      where organization_id = $1 and call_id = $2 and seq = $3::int
      for update),
    taken as (
      select 1 from playbook.call_vendor_sends t
      where t.organization_id = $1 and t.vendor_id = $4::text and not (t.call_id = $2 and t.seq = $3::int)),
    u as (
      update playbook.call_vendor_sends s
      set vendor_id = $4::text, recorded_at = clock_timestamp()
      from cur
      where s.organization_id = $1 and s.call_id = $2 and s.seq = $3::int and cur.vendor_id is null
        and not exists (select 1 from taken)
        and coalesce($4::text ~ '^[A-Za-z0-9._:-]{1,128}$', false)
      returning 1)
    select case
      when not coalesce($4::text ~ '^[A-Za-z0-9._:-]{1,128}$', false) then 'invalid'
      when exists (select 1 from u) then 'recorded'
      when cur.vendor_id = $4::text then 'unchanged'
      else 'conflict' end as result
    from cur
    ```

    `CALL_VENDOR_REMOVED`:

    ```sql
    update playbook.calls
    set vendor_removed_at = coalesce(vendor_removed_at, clock_timestamp()), updated_at = clock_timestamp()
    where organization_id = $1 and id = $2 and state = 'deleted' and vendor_send_seq = $3::int
      and sent_to_vendor_at is not null
      and not exists (
        select 1 from playbook.call_jobs j
        where j.organization_id = $1 and j.call_id = $2
          and j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp())
    returning id
    ```

    `CALL_PURGE_CLAIM`:

    ```sql
    with due as (
      select id from playbook.calls
      where organization_id = $1 and state = 'deleted' and purge_due_at <= clock_timestamp()
        and purge_attempts < 20
        and (purge_lease_until is null or purge_lease_until <= clock_timestamp())
        and not exists (
          select 1 from playbook.call_jobs j
          where j.organization_id = calls.organization_id and j.call_id = calls.id
            and j.state in ('running', 'cancelled') and j.next_attempt_at > clock_timestamp())
      order by purge_due_at
      limit least(greatest(coalesce($2::int, 1), 1), 500)
      for update skip locked)
    update playbook.calls c
    set purge_started_at = coalesce(c.purge_started_at, clock_timestamp()),
        purge_attempts = c.purge_attempts + 1,
        purge_lease_until = clock_timestamp() + make_interval(secs => greatest(coalesce($3::float8, 0), 1000) / 1000),
        updated_at = clock_timestamp()
    from due
    where c.organization_id = $1 and c.id = due.id
    returning c.id, c.kind, c.object_key, c.transcript_key, c.size_bytes, c.deletion_seq, c.vectors_removed_seq,
      c.sent_to_vendor_at, c.vendor_send_seq, c.vendor_removed_at, c.purge_attempts,
      (select coalesce(jsonb_agg(jsonb_build_object('seq', s.seq, 'vendor_id', s.vendor_id) order by s.seq), '[]'::jsonb)
       from playbook.call_vendor_sends s
       where s.organization_id = c.organization_id and s.call_id = c.id) as vendor_sends
    ```

    `CALL_PURGE_COMPLETE`:

    ```sql
    with jl as (
      select state, next_attempt_at from playbook.call_jobs
      where organization_id = $1 and call_id = $2
      for update)
    delete from playbook.calls
    where organization_id = $1 and id = $2 and state = 'deleted' and purge_started_at is not null
      and vectors_removed_seq = deletion_seq
      and (sent_to_vendor_at is null or vendor_removed_at is not null)
      and not exists (select 1 from jl where jl.state in ('running', 'cancelled') and jl.next_attempt_at > clock_timestamp())
    returning id, size_bytes
    ```

    `CALL_LIST_SPENT_PURGES`:

    ```sql
    select id, kind, object_key, transcript_key, deletion_seq, vectors_removed_seq,
      sent_to_vendor_at, vendor_send_seq, vendor_removed_at, deleted_at, purge_due_at, purge_started_at, purge_lease_until, purge_attempts,
      (select coalesce(jsonb_agg(jsonb_build_object('seq', s.seq, 'vendor_id', s.vendor_id) order by s.seq), '[]'::jsonb)
       from playbook.call_vendor_sends s
       where s.organization_id = c.organization_id and s.call_id = c.id) as vendor_sends
    from playbook.calls c
    where organization_id = $1 and state = 'deleted' and purge_attempts >= 20
      and id > $2::text
    order by id
    limit least(greatest(coalesce($3::int, 1), 1), 100)
    ```

    `CALL_PURGE_RESET`:

    ```sql
    update playbook.calls
    set purge_attempts = 0, purge_started_at = null, purge_lease_until = null,
        restore_barred_at = coalesce(restore_barred_at, clock_timestamp()), updated_at = clock_timestamp()
    where organization_id = $1 and id = $2 and state = 'deleted' and purge_attempts >= 20
    returning id, purge_attempts
    ```

    `CALL_ERASE_BATCH`:

    ```sql
    with t as (select clock_timestamp() as now),
    cand as (
      select id, deletion_seq from playbook.calls
      where organization_id = $1 and restore_barred_at is null
      order by id
      limit least(greatest(coalesce($2::int, 1), 1), 500)),
    jl as (
      select id from playbook.call_jobs
      where organization_id = $1 and state in ('queued', 'running') and call_id in (select id from cand)
      order by id
      for update),
    j as (
      update playbook.call_jobs
      set state = 'cancelled', claim_token = null, finished_at = (select now from t), updated_at = (select now from t),
          next_attempt_at = case when state = 'running' then next_attempt_at else (select now from t) end
      where organization_id = $1 and id in (select id from jl)
      returning id),
    cl as (
      select id from playbook.calls
      where organization_id = $1 and id in (select id from cand) and restore_barred_at is null
        and (select count(*) from j) >= 0
      order by id
      for update),
    x as (
      update playbook.calls c
      set state = 'deleted',
          epoch = case when c.state <> 'deleted' then c.epoch + 1 else c.epoch end,
          deletion_seq = case when c.state <> 'deleted' then c.deletion_seq + 1 else c.deletion_seq end,
          deleted_at = case when c.state <> 'deleted' then (select now from t) else c.deleted_at end,
          deleted_by = case when c.state <> 'deleted' then $3::text else c.deleted_by end,
          purge_due_at = least(coalesce(c.purge_due_at, (select now from t)), (select now from t)),
          restore_barred_at = (select now from t), failure_reason = null, updated_at = (select now from t)
      from cand
      where c.organization_id = $1 and c.id = cand.id and c.id in (select id from cl)
      returning c.id, c.epoch, c.deletion_seq, (c.deletion_seq <> cand.deletion_seq) as changed,
        c.object_key, c.transcript_key, c.kind, c.sent_to_vendor_at, c.vendor_send_seq,
        (select coalesce(jsonb_agg(jsonb_build_object('seq', s.seq, 'vendor_id', s.vendor_id) order by s.seq), '[]'::jsonb)
       from playbook.call_vendor_sends s
       where s.organization_id = c.organization_id and s.call_id = c.id) as vendor_sends)
    select id, epoch, deletion_seq, changed, object_key, transcript_key, kind, sent_to_vendor_at, vendor_send_seq, vendor_sends from x order by id
    ```

    `DEAL_LIST_PENDING_RETAG`:

    ```sql
    select id, outcome, outcome_seq, retag_through
    from playbook.deals
    where organization_id = $1 and retag_through < outcome_seq and id > $2::text
    order by id
    limit least(greatest(coalesce($3::int, 1), 1), 500)
    ```

    `DEAL_RETAG_BATCH`:

    ```sql
    select c.id, d.outcome, d.outcome_seq
    from playbook.calls c
    join playbook.deals d on d.organization_id = c.organization_id and d.id = c.deal_record_id
    where c.organization_id = $1 and c.deal_record_id = $2::text and c.state = 'ready'
      and c.tagged_outcome_seq < d.outcome_seq and c.id > $3::text
    order by c.id
    limit least(greatest(coalesce($4::int, 1), 1), 500)
    ```

    `CALL_RETAGGED`:

    ```sql
    update playbook.calls c
    set tagged_outcome_seq = $3::int, updated_at = clock_timestamp()
    from playbook.deals d
    where c.organization_id = $1 and c.id = any(($2::text[])[1:500]) and c.state = 'ready'
      and c.tagged_outcome_seq < $3::int
      and d.organization_id = $1 and d.id = c.deal_record_id and $3::int <= d.outcome_seq
    returning c.id
    ```

    `DEAL_RETAG_LOCK`:

    ```sql
    select id, outcome, outcome_seq, retag_through
    from playbook.deals
    where organization_id = $1 and id = $2
    for no key update
    ```

    `DEAL_RETAG_DONE`:

    ```sql
    update playbook.deals d
    set retag_through = $3::int
    where d.organization_id = $1 and d.id = $2 and d.retag_through < $3::int and $3::int <= d.outcome_seq
      and not exists (
        select 1 from playbook.calls c
        where c.organization_id = $1 and c.deal_record_id = d.id and c.state = 'ready' and c.tagged_outcome_seq < $3::int)
    returning d.id, d.retag_through, d.outcome_seq
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

## Sales history, part one (migration `0015`)

ADR 0018 loads an Organization's past Calls and Deal Outcomes into its Playbook. This migration is the
first half: **Deals, Deal imports with their row reports, and the rights confirmation.** Calls, their
uploads and the background work around them (transcription, Call processing, Outcome re-tag, Rep
rebuild, Call purge) come in the next migration. Every value mirrors the contract at `v0.8.0` (this
library does not depend on the contract, so each constant names the one it copies, and
`playbook-sales-history.test.ts` pins them).

| Table | Holds |
| --- | --- |
| `deals` | the Deal: opaque `deal_…` id, the customer's `deal_id` (unique per Organization, `deals_deal_id_key`), name, `outcome` (`won`, `lost`, `open`), `outcome_seq`, `closed_at`, `amount` (`numeric(17,2)`), `currency`, `appeared_in_import` |
| `deal_imports` | one row per uploaded CSV and its job: state, failure reason, object key, size, the lease columns, the applied and rejected counts, and `row_count` once completed |
| `deal_import_rows` | the report, one row per CSV data row: row number, deal id, result and reason, **nothing else of the row** |
| `rights_confirmations` | one row per Organization: the confirming member, the time and the wording version |

All four are tenant tables under forced row-level security with the one canonical policy. `deals` has no
delete for the role; `playbook.erase_deals` deletes in bounded batches. `organization_usage` gains
`deal_count`, moved by a trigger, so the Deal quota (`DEAL_USAGE`, the limit is the service's number,
`DEFAULT_MAX_DEALS` in the contract) is one primary-key read.

**Deals.** The customer's deal id is trimmed by the service and compared byte for byte (`A-1` and `a-1`
are two Deals). `DEAL_BY_DEAL_ID` is one index read. `outcome_seq` is exact: a trigger refuses any write
that does not raise it by one when (and only when) the Outcome or the closing time changes, and any that
lowers it, so a re-tag job that carries it compares it as the cleanup compares `deletion_seq`.
`DEAL_SET_OUTCOME` locks the row, so two changes queue and each sees the other's; a repeat changes nothing
and returns `changed` false (publish nothing). The lists are keyset on `(created_at, id)`, newest first,
each on its own index; the first page passes `'infinity'` and any id. **Every list row carries `cursor_at`, the text of
`created_at`: pass that back as the next page's cursor, never a JavaScript Date**, which drops the microseconds
(Deals created by one statement share a `created_at`, and a truncated cursor skips rows at a page boundary).
`DEAL_IMPORT_LIST` does the same. A malformed cursor text raises SQLSTATE 22007, which the service maps to
a validation error. No Deal is created here by a Call:
the Call upload statement of the next migration does, for an unknown deal id, under the upload lock.

**Imports.** The upload route runs `IDEMPOTENCY_BEGIN` and then `DEAL_IMPORT_INSERT` in one transaction.
The key insert is what lets the orphan sweep see a CSV whose outcome was unknown (v0.13.0's evidence rules
are unchanged: any route's key is an upload attempt), and the import row takes no row shared with another
import, so two uploads of one Organization never wait for each other. **The import row is its own job**,
not a row of `ingestion_jobs`: that table is keyed to a document and its parse, chunk, embed and index
steps, and an import has none of them. The lease is the same (`next_attempt_at`, `claim_token`,
`attempts` bound by the table); `DEAL_IMPORT_CLAIM`, `_HEARTBEAT`, `_RETRY`, `_FINISH`, `_FAIL` and
`_GIVE_UP_SPENT` mirror the job statements and fence on the token. The work hint kind is `import_apply`.

`DEAL_IMPORT_APPLY` applies one bounded batch (at most `DEAL_IMPORT_APPLY_BATCH`, 500, rows) and records
the report in one statement. **Run `QUOTA_LOCK` first in the same transaction**: the statement refuses
(`playbook.upload_lock`, no customer text) when the transaction does not hold the Organization upload lock
(it checks `pg_locks` for the transaction's own advisory lock; a session-level lock on the same key would
also pass). `require_upload_lock` reads `pg_locks` once per call, and the apply calls it once per statement.
Two imports of one Organization then apply one at a time and every Deal insert, which holds the
same lock, is seen.

**Every Deal insert must hold the upload lock, and SQL enforces it.** A statement-level `AFTER INSERT`
trigger on `playbook.deals` (`deals_require_lock`, over a transition table of the inserted rows) calls
`require_upload_lock` once for each distinct Organization in the statement, so an inserter that forgot
`QUOTA_LOCK` fails with `playbook.upload_lock` instead of making an import abort on a unique violation. It
is per statement, not per row: an apply of 500 new Deals checks once. There is no bypass for any role,
the owner included. **For issue 68:** the Call upload statement that creates a Deal for an unknown deal id
must run `QUOTA_LOCK` in its transaction first.

**Order.** The report is always contiguous from row 2 (row 1 is the header): the import row keeps
`report_through`, the highest row number in the report, and a check ties `applied_count + rejected_count`
to `report_through - 1`. The statement reads only the rows numbered `report_through + 1`, `+ 2` and so on
without a gap (rows at or below it are skipped, so a batch sent again after a lost answer changes nothing;
rows after a gap are not taken), and `taken` and `through` in the answer say what it took. So a row is
judged only after every row before it, which makes "the first row of a deal id wins" exact. **No row is ever
left undecided:** the statement locks the Deals the batch names (`for update`, in id order), which reads the
newest committed version after waiting for a concurrent Outcome change, and decides every row it takes from
that (a Deal decided meanwhile gives `outcome_already_decided`). A row that could not be decided would break
the check above and abort the statement with nothing recorded. `DEAL_IMPORT_FINISH` takes the CSV's row
count and completes only when `report_through` is that count plus one (a count too high or too low returns
no row).

**What the service must do.** It counts the CSV's records itself and fails the import with `too_many_rows`
before applying anything; it sends each row number once per batch; and it passes the true data-row count to
`DEAL_IMPORT_FINISH`. A row number outside 2 to 50001 or repeated within a batch is refused cleanly: nothing
is taken or recorded and the `summary` row's `refusal` is `row_number_range` or `row_number_repeated`.
A malformed JSON array or a non-integer row number raises a data exception (SQLSTATE class 22), a
programming error.

The rules, per row in row order: a deal id seen earlier in the file is `duplicate_in_file`, whatever else
is wrong with the repeat; the row's own rejection from the contract's `checkDealImportRow` is kept; a `won`
or `lost` Deal is `outcome_already_decided`, even for a row that says the same; an `open` Deal takes the row
(the Outcome, and the closing time, amount, currency and name when the cell is not blank: **a blank cell
never clears a value**); an unknown deal id creates a Deal with `appeared_in_import` true unless the
Organization would pass its limit (`deal_limit_reached`). The answer is one `summary` row and one
`outcome_changed` row per Deal this statement moved, read from the locked row it changed (a portal change
made meanwhile never makes a second message): publish the Outcome-changed message for each. `outcome_seq`
is a 32-bit integer capped at `DEAL_MAX_SEQ`; a Deal at the ceiling cannot take another change (the write
fails). The report is read by row number (`DEAL_IMPORT_ROWS_LIST`, `_BY_RESULT` on its own index).

**The rights confirmation.** `RIGHTS_CONFIRM` stores it once per Organization: a higher wording version
replaces the stored one, the same version keeps the first confirmation (its member and time), a lower one
is ignored. **Who enforces it:** the statement that inserts a Call (next migration) takes the current
wording version as a parameter and inserts only when the stored version equals it, in the same statement
as the insert, so a confirmation cannot be missing by the time the row is written; the service owns the
current number and passes it. This migration has no upload statement that needs it. Existing Calls are
never touched by the check.

**Calls' turns and Moments are not in Postgres.** A Transcript's turns are personal text (Prospects' words)
of up to 5 MB each, and a Moment is a vector with a window of that text: both belong in object storage and
the vector index, where purge and erasure already reach them (ADR 0016, 0018), and a Postgres column of
Transcript text would be one more place that text could leak into a log, a dump or a replica. The Call row
of the next migration holds metadata only (state, reason, the Deal, the Rep, speaker labels, hash, size,
duration, media type); no column holds a turn, a Moment or a Transcript, and none is indexed on text.

**Work hints (ADR 0017).** `import_apply` is noted by a trigger on `deal_imports` (insert in `uploaded`
or `processing`, or a state change, or an earlier due time), through `note_work`'s key-share path, and
verified by the first entry of `deal_imports_due_idx` (min `next_attempt_at` of active imports). A hint
may be early, never missing, as for every kind.

**Locks.** Imports: an upload takes the hint last (after its idempotency key), like every upload. An apply
takes `QUOTA_LOCK`, then the import row (`FOR UPDATE`, the fence), then Deal rows and the usage row. A
claim and an erase batch lock only import rows, so neither waits for anything an apply holds that it
holds in turn. `erase_deals` takes the upload lock first, then the Deal rows in id order, then the usage
row through the trigger: without that lock, an apply that holds a Deal row and wants the usage row could
wait on an erase that holds the usage row and wants that Deal row. Against v0.13.0's order (idempotency
key and hint, then the upload lock; erasure's `orphan_sweeps` row before the upload lock) nothing here
adds a wait the other way: no new statement takes the `orphan_sweeps` row or a hint after the upload lock.
Against job then document: no statement here touches a document or an ingestion job.

**Erasure.** `remove_organization_rest` now also refuses (returns false) while any Deal or Deal import
remains, and deletes the rights confirmation with the rest, so it never does work proportional to the
Organization. Erase in this order, each in bounded batches repeated until it finds nothing: the documents
(`DOCUMENT_ERASE_BATCH` and the purges), then `DEAL_IMPORT_ERASE_BATCH` (it ends an active import, fences
its job and returns `object_pending` for the CSVs still stored: **remove the CSV, then call
`DEAL_IMPORT_OBJECT_REMOVED`**), then `DEAL_IMPORT_PURGE_BATCH` per import (deletes report rows in
steps, then the import row; the foreign key does not cascade), then `DEAL_ERASE_BATCH`, then
`ORGANIZATION_REMOVE_REST`. `ORGANIZATION_REMOVAL_STATUS` adds `no_deals`, `no_imports` and `no_rights`.
The orphan-sweep hint and row still outlive removal, as in v0.13.0. What remains until the sweep covers
the last upload attempt is two times and no content.

**Not covered here, in the next migration:** Calls and the Call upload statement (duplicate and quota
rules, the unknown-deal-id creation), the Rep and its ordering guard, Call delete, restore, purge and
erasure, the jobs for transcription, processing, re-tag and Rep rebuild with their hint kinds, and the
Call erase step that must come before `DEAL_ERASE_BATCH`.

## Sales history, part two (migration `0016`)

The second half of ADR 0018: **Calls, their upload, the Rep, and the background work around them.**
Calls hold metadata only. The Transcript, the Recording and the Moments live in object storage and
in the search index, never in Postgres. Every value mirrors the contract at `v0.8.0`
(`schema/playbook-calls.ts`, pinned by `playbook-calls.test.ts`).

| Table | Holds |
| --- | --- |
| `calls` | the Call: `call_…` id, its Deal (composite foreign key, no cascade), kind (`transcript`, `recording`), state, failure reason, object keys, content hash (unique per Organization), the Rep choice (`rep_by`, `rep_label`, `rep_channel`), the speaker labels, and the counters `epoch`, `rep_seq`, `deletion_seq`, `vectors_removed_seq`, `tagged_outcome_seq`; and (migration `0032`) `embedded_moments` and `skipped_moments`, both null until `CALL_MOMENTS_RECORD` sets them (each 0 to 1,000,000) |
| `call_jobs` | one row per background job of a Call: kind `transcribe`, `process` or `rebuild`, state, attempts, claim token and lease |

`call_jobs` is a **sibling of `ingestion_jobs`, not an extension of it.** An ingestion job is keyed to a
Document and walks its parse, chunk, embed and index steps; a Call job has three kinds and no steps,
and at most one job per Call is active. Widening `ingestion_jobs` would have loosened its checks for
both. `organization_usage` gains `call_count` and `recording_byte_count`, kept by a trigger.

**Upload.** The service takes the idempotency key, then `QUOTA_LOCK` (the Organization upload lock),
then runs `CALL_INSERT` in the same transaction; the insert fails with `playbook.upload_lock` without
the lock. One statement checks the rights confirmation against the wording version the service
passes, the quota (Calls, Recording bytes, Deals; a deleted Call and one in `awaiting_rep` still
count) and the duplicate rule, and answers `created`, `existing`, `other_deal`, `rights_required` or
`quota_exceeded`. The same content under the same Deal returns the stored Call: a deleted one is
restored by `CALL_RESTORE_FOR_UPLOAD`, a failed one is re-queued by `CALL_REQUEUE` only for
`transcription_failed`, `transcription_timed_out` and `processing_failed`. The same content under
another Deal is refused. An unknown deal id creates an open Deal. A Call whose file stopped
part-way has no row; the idempotency key written before streaming is the evidence the orphan sweep
uses, as for Documents.

**Rep.** A Transcript takes a speaker; a Recording takes a speaker label or a channel. `CALL_SET_REP`
answers `changed`, `unchanged` (the same choice again, also while the rebuild is queued), `invalid`
or `not_changeable`. A change bumps `rep_seq`, leaves the Call `processing` and queues a `rebuild`
job carrying that sequence. Every job statement (`CALL_JOB_HEARTBEAT`, `CALL_JOB_COMPLETE`) checks the
sequence it was claimed with, so a stale rebuild returns no row and cannot finish. To avoid a
deadlock the statement locks job rows first, then the Call row, the order the claim uses too.

**Jobs.** `CALL_JOB_CLAIM` leases with `for update skip locked`, bounds the batch, and cancels the job
of a deleted Call instead of running it. Workers record intermediate facts with `CALL_JOB_RECORD`,
finish a transcription with `CALL_JOB_TRANSCRIBED`, and a rebuild or process with `CALL_JOB_COMPLETE`.
`CALL_JOB_RETRY` and `CALL_JOB_FAIL` end an attempt; `CALL_JOB_GIVE_UP_SPENT` fails the Call of a job
out of attempts. None of them takes the Organization upload lock.

**Outcome re-tag and search.** `inSearch` is derived in the same query as the Deal's Outcome:
state `ready`, Deal `won`, and `tagged_outcome_seq >= outcome_seq`. A Deal whose Outcome changes
is found by `DEAL_LIST_PENDING_RETAG` (`retag_through < outcome_seq`, partial index
`deals_retag_idx`). The service re-tags its Calls in bounded batches (`DEAL_RETAG_BATCH`, then
`CALL_RETAGGED` after it rewrote the Moments' Outcome), and finishes with two statements in one
transaction: `DEAL_RETAG_LOCK` takes the Deal row, then `DEAL_RETAG_DONE` sets `retag_through` only
if no ready Call is stale, reading a fresh snapshot. `CALL_JOB_COMPLETE` takes the same Deal row
**before it writes the Call** (`for no key update`; the Call update reads that locked row, so it
waits for it; Postgres does not order the parts of a statement textually, and none holds a Deal row
while waiting for a job or Call row, so either order is safe) and reads `outcome_seq` from that locked row, so a
completion that is open while the Outcome moves holds the change and its re-tag back until it
commits, and one that waits behind them tags against the newer sequence; a Call can never become
`ready` with a stale tag unseen. (`for share` would let two completions deadlock when both then
lower `retag_through`; `no key update` queues them for the length of one statement, so keep an
Outcome change in a short transaction.) The cost of `DEAL_RETAG_DONE` is one indexed read of the
Deal's ready Calls, once per re-tag. `DEAL_RETAG_BATCH` reads the Deal's ready Calls from the
keyset and skips those already tagged: across the batches of one re-tag that is one pass over the
Deal's Calls (bounded by the quota, never by the Organization), and each batch's own write is its
`limit`. `calls_retag_idx` does not carry the tag, because a comparison to another table's column
cannot narrow an index range; a skipped row costs an index entry and a heap read, not a write.

**Delete, restore, purge.** Delete bumps `deletion_seq` once and starts the purge clock; restore (by a
member or by an upload) returns the Call to `uploaded` and `transcribe` if it was never transcribed,
`awaiting_rep` if it has a Transcript and no Rep, otherwise `processing`. The purge needs cleanup of
the index recorded (`CALL_CLEANUP_BEGIN`, `CALL_CLEANUP_DONE`) and, for a Recording sent to the
transcription vendor, the vendor copy confirmed removed (`CALL_SENT_TO_VENDOR`,
`CALL_VENDOR_REMOVED`) before `CALL_PURGE_COMPLETE` deletes the row. A claim (`CALL_PURGE_CLAIM`) means the purge can
finish: a Call is not handed out while a job of it is `running`, or `cancelled` with its lease unexpired,
so a service that retries during that wait spends none of its 20 attempts; erasure reaches the purge
only through this claim and inherits it. The `call_purge` discovery branch is left as it is: an
Organization whose only purgeable Calls are waiting on a job lease is reported due for at most one
lease of wasted visits, which costs less than a second condition in the function. A spent purge shows in
`CALL_LIST_SPENT_PURGES` and `CALL_PURGE_RESET` bars the Call from restore.

**Lists** (`CALL_LIST`, `CALL_LIST_BY_STATE`, `CALL_LIST_BY_DEAL`, `CALL_LIST_BY_DEAL_STATE` and the
pending-cleanup list; the Deal's list is two statements so each keeps its index under a generic plan) page
on `cursor_at`, the timestamp as text, so microseconds survive the round trip. A malformed cursor
fails with SQLSTATE 22007 (`invalid input syntax`); the service maps it to a 400.

**Hint kinds.** Five more, each written by the trigger that creates the work and found by its own
branch of `ORGANIZATIONS_WITH_WORK`, verified against an index:

| Kind | Written when | Found through |
| --- | --- | --- |
| `call_jobs` | a job is queued or comes due | `call_jobs` by state and next attempt |
| `call_purge` | a Call is deleted | `calls_purge_idx` |
| `call_cleanup` | a Call is deleted | `calls_cleanup_idx` |
| `call_purge_spent` | a purge runs out of attempts | `calls_spent_purge_idx` |
| `outcome_retag` | a Deal's Outcome moves ahead of `retag_through` | `deals_retag_idx` |

**Erasure.** The order is: `CALL_ERASE_BATCH` (bars restore, returns the object keys; remove the
objects), the Call purge as above, `DEAL_ERASE_BATCH` (the foreign key refuses while a Call remains),
then `ORGANIZATION_REMOVE_REST`, which also refuses while Calls remain.
`ORGANIZATION_REMOVAL_STATUS` adds `no_calls`.

**Lock order.** Always: idempotency key, `orphan_sweeps`, the upload lock, import and job rows, Call
rows, Deal rows, the usage row; hint rows last. An upload holds the upload lock then touches the Deal
and Call; an import apply holds the same lock; `DEAL_SET_OUTCOME` locks only the Deal row, and the
upload's foreign key takes `KEY SHARE`, which `NO KEY UPDATE` does not conflict with (so
`DEAL_SET_OUTCOME` and `DEAL_RETAG_LOCK` lock the Deal `for no key update`, never `for update`, and an
Outcome change does not hold up an upload). A Rep change and a claim both lock job rows before the
Call row; a completion locks the Deal row before it writes the Call, and no statement that holds a Deal row (an Outcome
change, `DEAL_RETAG_LOCK`, an import apply) then waits for a job or Call row, so that order cannot
close a cycle; a claim skips job rows another transaction holds, so it never waits for an uncommitted Rep
change, and a Rep change on a Call whose job a claim holds waits for the claim. Erasure locks Calls then Deals. No path takes
two of these in the other direction, so no cycle forms.

**Vendor copies.** Every `CALL_SENT_TO_VENDOR` adds one to `vendor_send_seq`, refreshes
`sent_to_vendor_at` and clears `vendor_removed_at`, so a Recording sent again after a restore needs
its own confirmation; `CALL_VENDOR_REMOVED` takes the sequence of the send it confirms (the purge
claim and the erase rows return the current one), so a late confirmation of an earlier copy never
confirms a later one. The Call row holds a count; the vendor's id of each send is in
`call_vendor_sends` (below), but a crash after the vendor accepted a send and before the service
stored its id leaves a send with no id. So **every send carries a client reference derived from the Call id and `vendor_send_seq`** (for
example `<call id>:<n>`), which lets the service find and delete every counted send at the vendor
without a stored id; a confirmation for sequence `n` means every copy with reference 1 to `n` is
gone, not only the one whose id was stored. This needs the vendor to support a client reference or
a lookup, which is unverified for AssemblyAI and belongs to the transcriber adapter ticket.
Delete and erasure cancel a Call's job but keep its lease, and a worker that already recorded a send
may still be mid-request: `CALL_VENDOR_REMOVED` and `CALL_PURGE_COMPLETE` return no row while a
`running` job, or a `cancelled` one whose `next_attempt_at` has not passed, exists (as
`CALL_CLEANUP_BEGIN` already treated it). The confirmation is refused too, not only the purge,
because a confirmation taken before the in-flight request lands is itself the false statement. Retry
after the lease. A Call that erasure (or a delete) reaches is purged only after the latest send is
confirmed gone.

**Deleting.** `closeline_playbook` may delete a Call only once its purge has started and it is
`deleted` (`calls_deleted_only`, restrictive); the purge and the erasure both reach that state
through `CALL_PURGE_CLAIM`, and erasure never deletes a live row. A Transcript Call always has a
Rep (`calls_transcript_has_rep`), so a restore never produces an `awaiting_rep` Transcript.

**Service duties.** Never log `error.detail` (or the `where` text) of a failed Call statement: a
check violation puts the whole row in DETAIL, which carries the speaker labels and the file name.
Log the SQLSTATE and the constraint name. Take the idempotency key and the upload lock before `CALL_INSERT`; stream objects
only after the key is written; remove objects and the vendor copy before the purge completes; send
the current rights wording version on every upload; re-tag by batches rather than inline; send a
Transcript's Rep with its upload.

**Release notes.** v0.15.0 (migration `0016`) also changes `DEAL_SET_OUTCOME`, shipped in v0.14.0:
it now takes the Deal row `for no key update` instead of `for update`, so an open Outcome change no
longer holds up a Call upload (the foreign-key `KEY SHARE`). It is a statement change only; there is
no migration for it.

## Finishing an interrupted import erasure (v0.16.0, migration `0017`)

Once `DEAL_IMPORT_ERASE_BATCH` commits, every other import statement filters `erased_at is null` and
`DEAL_IMPORT_PURGE_BATCH` needs the id, so a crash, a lock timeout or a cut request between the erase
and the end of the purge used to lose the ids: `ORGANIZATION_REMOVAL_STATUS.no_imports` stayed false
for good. `DEAL_IMPORT_LIST_ERASED` lists the Organization's imports that are erased and not yet purged,
by id (`$2` the last id of the previous page, `''` first; the page size is clamped to the usual
maximum), with `object_key` and `object_pending` (true while the CSV is not recorded removed). It runs
on `deal_imports_erased_idx`, a partial index on `erased_at is not null` (the set is small and short
lived, so the index costs next to nothing), added by migration `0017`.

The erase order becomes **finish the erased imports first, then erase more**:

1. List erased imports until the page is empty of work: for each, remove the CSV if `object_pending`
   and call `DEAL_IMPORT_OBJECT_REMOVED` (idempotent), then `DEAL_IMPORT_PURGE_BATCH` until
   `import_deleted`.
2. Run `DEAL_IMPORT_ERASE_BATCH` and handle its rows the same way. Repeat 1 and 2 until the erase finds
   nothing and the list is empty.
3. Then `DEAL_ERASE_BATCH`, then `ORGANIZATION_REMOVE_REST`.

Crash points, and what each leaves: before the erase commits, nothing changed, so run it again; after
it commits and before the CSV is removed, the list shows the import with `object_pending` true; after
the CSV is removed and before `DEAL_IMPORT_OBJECT_REMOVED` committed, it still shows it pending, and
removing the already-gone file again is harmless; between purge steps, the list still shows the
import, and the purge resumes where it stopped. A second Organization never sees these rows (row-level
security).

The other erase paths do not have this shape. `DEAL_ERASE_BATCH` takes no id (it deletes the next
Deals of the Organization), so a lost answer costs nothing. `CALL_ERASE_BATCH` and
`DOCUMENT_ERASE_BATCH` mark rows deleted and due at once, and `CALL_PURGE_CLAIM` and
`DOCUMENT_PURGE_CLAIM` find them by state, not by an id the service must remember (a purge that ran out
of attempts is found by `CALL_LIST_SPENT_PURGES` and its document counterpart).

## Vendor ids per send (v0.17.0, migration `0018`)

The transcriber port returns an opaque `vendorId` for each send (1 to 128 characters of
`[A-Za-z0-9._:-]`). `call_vendor_sends` records it per Call and `vendor_send_seq`:

| Column | Holds |
| --- | --- |
| `organization_id`, `call_id`, `seq` | the key (`call_vendor_sends_pkey`, scoped by Organization), `seq` 1 to 20 |
| `vendor_id` | the vendor's id; null until recorded, and null for good when the service crashed first |
| `created_at`, `recorded_at` | when the send was counted, and when its id was recorded |

It is a tenant table (forced row-level security, the canonical policy, the zero Organization refused).
The role inserts a row and sets `vendor_id` once; it cannot delete or change the key (the purge deletes
the Call and the foreign key cascades, so purge and erasure remove the rows) and a trigger refuses a
change of a recorded id, with a message that carries no value. **The only index on `vendor_id`** is
`call_vendor_sends_org_vendor_id_key`: unique, partial (set ids only) and led by the Organization, so
one vendor copy belongs to one send of one Organization. No statement returns or logs an id except the
purge rows below.

- `CALL_SENT_TO_VENDOR` (before the request, as before) now also inserts the send's row with no id,
  and answers `sent`. **At most 20 sends per Call over its life**: a transcribe job is attempted at
  most 20 times and each attempt sends at most once, but a restore starts a new job, so the bound is on
  the Call (`calls_vendor_send_seq_max`, `call_vendor_sends_seq_bounds`). The twenty-first is not
  counted and the answer has `sent` false: do not send, fail the job with the reason
  `transcription_failed`. `CALL_REQUEUE` does not requeue a Call at the bound: a re-upload of it
  answers the Call unchanged (`changed` false, no job, nothing written), so it cannot loop until its
  purge. A deleted Recording at the bound can still be restored, after which its single transcribe job
  fails once with the same reason. Whether that deserves a dedicated failure reason is a contract question for the owner.
  **The migration refuses rather than caps**: a guard at its top raises an exception when any Call has
  `vendor_send_seq` above 20 (the message names only how many Calls), so the deploy stops and a person
  decides. Capping would silently drop the record of sends 21 and beyond, and the purge would never list
  their vendor copies. Check first: `select count(*) from playbook.calls where vendor_send_seq > 20`.
  The guard and the backfill read `calls` as the owner, which has no BYPASSRLS, so forced row-level
  security is lifted on `calls` for the migration (inside its transaction) and forced again after the
  backfill, as `0014` does for `idempotency_keys`.
- `CALL_VENDOR_ID_RECORD` (after the vendor accepts) records the id of send `seq`: `recorded`,
  `unchanged` (the same id again), `conflict` (a different id is never written over a recorded one,
  and an id another send of the Organization already holds is not taken twice),
  `invalid` (not of the allowed shape: nothing is written and no constraint error carries the id), and
  no row when the Call has no such counted send. **A late answer is allowed**: the id of any counted send
  is recorded whatever the Call's state and whichever send is current, with no claim, because it names
  a real copy that must be deleted.
- `CALL_PURGE_CLAIM`, `CALL_ERASE_BATCH` and `CALL_LIST_SPENT_PURGES` return `vendor_sends`: every
  counted send as `{ seq, vendor_id }` in order, `vendor_id` null where none was recorded, `[]` for a
  Call never sent. It is bounded by the 20 per Call and the batch size, read through the primary key, and
  complete in the purge claim and the spent list. The erase rows are read in the statement's snapshot: a
  send that committed while `CALL_ERASE_BATCH` ran can be counted in `vendor_send_seq` and missing from
  `vendor_sends`, so when `vendor_sends` has fewer entries than `vendor_send_seq` the service deletes the
  missing sequences by client reference (the later purge claim is exact).
- `CALL_VENDOR_REMOVED` still confirms **by sequence** and the lease gate of v0.15.0 is untouched.

**Service duties for a Recording send.** Send a client reference derived from the Call id and the
sequence `CALL_SENT_TO_VENDOR` returned; after the vendor accepts, call `CALL_VENDOR_ID_RECORD` with the
vendor's id (a late answer is still recorded). On purge or erasure, delete each listed send at the
vendor by its `vendor_id` as a hint, and by its client reference when `vendor_id` is null or the hint
finds nothing; then confirm with `CALL_VENDOR_REMOVED` for the Call's `vendor_send_seq`, which means
every copy with reference 1 to that number is gone. **Confirm a send gone only after a purge claim
(`CALL_PURGE_CLAIM`) has returned `vendor_sends` that cover every sequence up to `vendor_send_seq`**;
the erase rows are early hints only. Two records of the same id on two sends that run at the same moment
can still make Postgres raise SQLSTATE 23505 (the unique index; a lock cannot prevent it under read
committed snapshots): treat that error on `CALL_VENDOR_ID_RECORD` as `conflict`. Never log
`error.detail` of these statements; for 23505 it contains the id.
Listing the vendor's jobs by client reference is the transcriber adapter's job and is unverified for
AssemblyAI.

## Claimed rows carry the job's creation time and the audio hash (v0.18.0, no migration)

`CALL_JOB_CLAIM` returns two more fields on every claimed row; the signal row has both null. Both
columns already exist, so there is no migration.

- `job_created_at` is the job's own `created_at`, taken with `clock_timestamp()` (the database
  clock) in the statement that inserts the job, **after** the Call's row lock: every statement that
  creates a Call job (`CALL_INSERT`, `CALL_RESTORE` and `CALL_RESTORE_FOR_UPLOAD`, `CALL_REQUEUE`,
  `CALL_SET_REP`, `CALL_JOB_TRANSCRIBED`) inserts from the row its own update returned, so the insert
  waits behind `CALL_SENT_TO_VENDOR`, which writes `sent_to_vendor_at` with `clock_timestamp()` under
  the same lock. A transaction that began earlier and waited (on `QUOTA_LOCK`, say) therefore cannot
  date a new job before a send made meanwhile. (`CALL_INSERT` creates the Call in the same statement,
  so it has no earlier send.) A send is made during this job when the Call's `sent_to_vendor_at` is at
  or after `job_created_at`, and left over from an earlier job when it is before it. Compare the two
  as `Date`s from the same database; never with the worker's clock.
- `content_hash` is the Call's stored sha256 of the audio, a 32-byte `Buffer` (the `bytea` column).
  The transcribe job keys a resend by this hash instead of by size.

`ClaimedCallJob` types them as `Date` and `Buffer`; `CallJobClaimRow` as nullable.

## Deal call count, the cap of unfinished imports and blank rows (v0.19.0, migration `0019`)

- **`call_count` on every Deal answer.** `DEAL_LIST`, `DEAL_LIST_BY_OUTCOME`,
  `DEAL_LIST_BY_IMPORT_FLAG`, `DEAL_GET`, `DEAL_BY_DEAL_ID` and `DEAL_SET_OUTCOME` return `call_count`,
  an `int` (a number, not a string): the Deal's Calls with `state <> 'deleted'`, as a correlated
  subquery per returned row, so the cost is the Deal's own Calls and only for one page. It is in
  `DEAL_ROW_FIELDS`. **No new index**: the count reads `calls` by Organization and Deal with that
  predicate, which is the leading columns and the predicate of `calls_deal_list_idx` (the Deal is the
  column `deal_record_id`), so a second partial index would only add writes. A plan test pins the
  property (an index condition on both columns, no Seq Scan, no Sort), not a name.
- **`DEAL_IMPORT_INSERT` enforces the cap.** It is now one call, `playbook.insert_deal_import`, that
  takes an advisory lock on the Organization's import cap, counts the imports in `uploaded` or
  `processing`, and inserts when there are fewer than `MAX_QUEUED_DEAL_IMPORTS` (5, the contract's
  value since v0.10.0). One row: `result` is `created` with the import's columns, or `busy` with
  those columns null and nothing stored; on `busy` the service removes the CSV it stored and answers
  the contract's `409`. The count and the insert are separate statements inside the function on
  purpose: a single SQL statement counts in the snapshot taken before it waited for the lock, so two
  inserts at four would both win. Two inserts of one Organization now queue (the second waits for the
  first to commit; a failed or completed import frees its place); other Organizations never wait.
  The function refuses first, before it takes the lock, when the transaction is not scoped to the
  Organization it was given (`app.organization_id`; SQLSTATE `42501`, `playbook.insert_deal_import_scope`),
  so a caller cannot hold another Organization's cap lock.
  The lock is not `QUOTA_LOCK`, so it cannot deadlock with it. The call is still made in the upload's
  idempotency-key transaction, key first.
- **`blank_row`** is a new reason for a rejected row (`DEAL_IMPORT_ROW_REASONS`): a CSV row with no
  cells. The migration replaces `deal_import_rows_reason_known` and
  `deal_import_rows_deal_id_missing_only_when_unusable`. `DEAL_IMPORT_ROW_REASONS_WITHOUT_DEAL_ID`
  (`invalid_deal_id`, `wrong_column_count`, `blank_row`) lists the reasons that may have no deal id;
  the check is built from it, so a service's in-memory double imports the list instead of repeating
  it. A unit test pins that the constant, the check and the migration agree.

## The closing date is a calendar date (v0.20.0, migration `0020`)

A Deal's `closed_at` is a `date`, not a `timestamptz` (hub #90; the contract types `closedAt` as
`YYYY-MM-DD`).

- **Migration.** Existing instants become the date they fall on **in UTC**
  (`("closed_at" AT TIME ZONE 'UTC')::date`, written out so no session or database time zone matters):
  `2026-01-31T23:00:00-05:00` is 04:00 UTC on 1 February and becomes `2026-02-01`. Nothing else held the
  column (`deal_import_rows` keeps no closing date; no index or check uses it). The rewrite is not
  filtered by row-level security, so forced RLS is not lifted; a migration test seeds Deals at 0019,
  migrates and checks the values and that RLS is still forced.
- **Statements.** `DEAL_SET_OUTCOME` takes `$4` as a `date` (pass `YYYY-MM-DD`; a longer ISO string is
  cut to its date text, never converted through a zone) and `DEAL_IMPORT_APPLY` reads `closed_at` from
  the rows as a `date`. A repeat of the same date is not a change.
- **Reading it.** Every Deal answer returns `closed_at` as the string `YYYY-MM-DD` (or null). The driver
  would turn a `date` into a JavaScript `Date` at local midnight, which is the previous day in a process
  whose time zone is behind UTC. `createDb` therefore sets `DB_TYPES` (exported) on its pool; **a pool
  built by hand for these statements must pass `types: DB_TYPES`** too. A test runs the round trip with
  the process time zone set to `America/Chicago`.

## What Postgres says about the Calls a search hit (v0.21.0, no migration)

`CALL_SEARCH_STATE` (hub #16): `$1` Organization, `$2` an array of Call ids. One row per id that is a
Call of that Organization, in id order: `call_id`, `in_search`, `epoch`, `rep_seq` and `deal_record_id`.
These are the fields the playbook's `momentMayBeReturned` needs. `in_search` is derived as in
`CALL_GET` (state `ready`, the Deal `won`, the tag current), so after a Deal turns lost it is false at
once, before the re-tag. Run it through the tenant-scoped helper: another Organization's ids, unknown
ids, an empty array and a null array give no row (a hit with no row is dropped). A repeated id is
answered once. It returns metadata only, no text, and adds no migration, table or column.

**The array is capped at `MAX_SEARCH_STATE_IDS` (100) by the statement taking the first 100**; ids after
the 100th get no row. It does not refuse them (a plain statement cannot raise), so the caller must pass
at most 100, which the search's over-fetch window (`topK` 100) already guarantees. A plan test pins
that `calls` is read through an index with the Organization in its condition and no Seq Scan.

## What Postgres says about the documents a search hit (v0.22.0, no migration)

`DOCUMENT_SEARCH_STATE` (hub #98): `$1` Organization, `$2` an array of document ids. One row per id that
is a document of that Organization, in id order: `id`, `name`, `state` and `epoch`, read as
`DOCUMENT_GET` reads them. The playbook applies the staleness rule (`state = 'ready'` and `epoch` equal
to the vector's epoch), so a deleted document, or one restored and so given a higher epoch, is dropped.
Run it through the tenant-scoped helper: another Organization's ids, unknown ids, an empty array and a
null array give no row. Metadata only, no text, and no migration, table or column.

**The array is capped at `MAX_DOCUMENT_SEARCH_STATE_IDS` (100) by the statement taking the first 100**;
ids after the 100th get no row. It does not refuse them (a plain statement cannot raise), so the caller
must pass at most 100, which the search's over-fetch window (`topK` 100) already guarantees. A plan
test pins that one index condition holds both `organization_id` and `id = ANY`, with no Seq Scan.

## Demo Requests (v0.23.0, migration `0021`)

`core.demo_request` holds a Visitor's submitted wish to see Closeline. Closeline itself holds it, not
an Organization, so it has no `organization_id` and sits outside row-level security, like the core
directories (ADR 0011): it is on the allowlist in `NON_TENANT_TABLE_REASONS`, and the catalog check
fails if any service role holds a privilege on it. The migration revokes the schema's default
privileges from `closeline_core`, so only the owner reaches it; core reaches it through the four
`SECURITY DEFINER` functions below, also in migration `0021`.

| Column | Rule |
| --- | --- |
| `id` | `dreq_` and 32 hex digits, built by the service |
| `name`, `company_name` | 1 to 200 characters after trimming |
| `work_email` | stored lower-cased, the `invitations.email` rule (3 to 320 printable ASCII, one `@`) |
| `message` | null, or at most 2000 characters |
| `source_page` | 1 to 200 characters, starting with `/` |
| `idempotency_key` | 16 to 128 characters, unique across all rows |
| `notification_status` | `pending` (default), `sent` or `failed`; with `notification_attempts` and `notification_last_attempt_at`, the outbox for the notice to the team |
| `submitted_at` | `now()` by default |

The honeypot field is never stored: there is no column for it. `demo_requests_submitted_at_idx`
serves the twelve-month retention purge, and the partial `demo_requests_notice_idx` serves the scan
for notices still `pending`.

### Functions core calls

Each runs as the owner with `search_path = pg_catalog, pg_temp`; `EXECUTE` is revoked from `PUBLIC`
and granted to `closeline_core` alone (the other roles cannot even see schema `core`). Use the typed
wrappers exported from the package; run them on the pooled handle, since the table has no Organization.

| Function | Wrapper | Does |
| --- | --- | --- |
| `core.submit_demo_request(id, name, work_email, company_name, message, source_page, idempotency_key)` | `submitDemoRequest(db, input)` | inserts, or on a repeated key returns the first row's id with `replayed` and `sameFields` (false when the key was reused with a different body) |
| `core.claim_demo_notices(limit, backoff_seconds)` | `claimDemoNotices(db, limit, backoffSeconds)` | takes up to `limit` (capped at 100) pending rows, oldest first, not tried within the backoff; counts the attempt; `FOR UPDATE SKIP LOCKED` so concurrent claims never overlap |
| `core.settle_demo_notice(id, status)` | `settleDemoNotice(db, id, 'sent' \| 'failed')` | settles a pending row; false when unknown or already settled |
| `core.purge_demo_requests(limit)` | `purgeDemoRequests(db, limit)` | deletes up to `limit` (capped at 1000) rows submitted over twelve months ago, oldest first; returns the count, so loop until it is below `limit` |

`submitDemoRequest` throws `DemoRequestRefusedError` (SQLSTATE `code` and `constraint` only) when a
field breaks a table check, never the driver's error, whose text holds the Visitor's name, email and
message. Notice delivery is at least once: a claimed row is retried once its backoff passes, so the
worker must cap `attempts` itself and settle the row `failed` past its cap.

## Demo rate counter (v0.24.0, migration `0022`)

`core.demo_rate_counter` counts requests per address for the public demo-request route, so core
rate-limits in Postgres and not in process memory. Like `core.demo_request` it has no
`organization_id`, sits outside row-level security, is on the allowlist, and is revoked from
`closeline_core`; only the two `SECURITY DEFINER` functions below reach it.

| Column | Rule |
| --- | --- |
| `address_hash` | `bytea`, exactly 32 bytes: an HMAC-SHA256 of the address, made by core. A raw address is never sent or stored |
| `window_start` | `timestamptz`, the start of the fixed window, aligned to the window length |
| `hits` | at least 1; every request in the window counts, including those over the limit |

The primary key is `(address_hash, window_start)`; `demo_rate_counters_window_start_idx` serves the purge.

| Function | Wrapper | Does |
| --- | --- | --- |
| `core.hit_demo_rate_limit(address_hash, window_seconds, limit)` | `hitDemoRateLimit(db, { addressHash, windowSeconds, limit })` | one atomic `insert … on conflict do update set hits = hits + 1`; true while `hits <= limit`, so concurrent calls never let more than `limit` through. `windowSeconds` is 1 to 86400, `limit` at least 1 |
| `core.purge_demo_rate_counters(limit)` | `purgeDemoRateCounters(db, limit)` | deletes up to `limit` (capped at `DEMO_RATE_PURGE_BATCH_MAX`, 1000) counters whose window started over a day ago, oldest first; loop until it returns less than `limit` |

Windows are at most a day long, so a window that started over a day ago has ended. Both wrappers
check their input before any query; the functions check it again and raise `22023`.

## Prospect search through a definer role (v0.32.0, migration `0030`)

Core's search over Prospects (`ilike '%text%'` on field values, Company names and domains) was a
sequential scan whatever the trigram indexes of `0029`: `ilike` is not leakproof, and Postgres
will not give an index a clause that is not leakproof while a row-level security policy guards the
table. A role that bypasses row-level security has no such limit, but `closeline_core` must not be
that role. The search therefore runs in two `SECURITY DEFINER` functions owned by
`closeline_core_search`: `NOLOGIN`, `BYPASSRLS`, `NOINHERIT`, a member of no role and held by no
service role (`closeline_owner` is a member `WITH SET TRUE, INHERIT FALSE`, only so the migration can
run `ALTER FUNCTION ... OWNER TO`). It holds `USAGE` on `core` and column `SELECT` on three tables
(`prospects`, `prospect_fields`, `prospect_companies`), nothing else.

| Function | Returns |
| --- | --- |
| `core.search_prospect_ids(q text, "after" text, max_rows integer)` | `TABLE(id text)`: the Prospects with a current field value, or a Company name or domain, containing `q` |
| `core.search_prospect_company_ids(q text, "after" text, max_rows integer)` | `TABLE(id text)`: the Prospect Companies whose name or domain contains `q` |

Both are `STABLE`, with `search_path = pg_catalog, core, public, pg_temp`, `EXECUTE` revoked from
`PUBLIC` and granted to `closeline_core` alone. Ids are distinct, in id order, strictly after the
cursor `after` (null starts at the beginning). Core calls them inside `withOrganization`, for
example `id IN (select id from core.search_prospect_ids($1, $2, $3))`.

- The Organization is never an argument. It is the `app.organization_id` setting that
  `withOrganization` sets, and every branch filters `organization_id =` it. With the setting unset or
  empty the functions return no row.
- `q` is matched literally, case-insensitively: `%`, `_` and `\` in it are escaped. A null or empty
  `q`, or `max_rows` below 1, returns no row (there is no "match all"); `max_rows` above 101 is
  clamped to 101, so a caller asks for 101 to learn whether a page follows.
- The prospect function matches any current field value, whatever the `field_name`.
- Ids are text (`prs_...`, `pco_...`), so the cursor is text, not uuid.

**Deployed Regions** (tula-closeline-infra) must create the role in the Region bootstrap, before this
migration runs, as a superuser or `CREATEROLE` account whose name does not start with `closeline_`:

```sql
CREATE ROLE closeline_core_search NOLOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT BYPASSRLS;
GRANT closeline_core_search TO closeline_owner WITH SET TRUE, INHERIT FALSE;
```

The migration fails with a message naming the role if it is missing, is not `NOLOGIN`/`BYPASSRLS`,
or `closeline_owner` cannot `SET ROLE` to it. Locally `docker/postgres/init.sql` does this.
`SEARCH_ROLE` is exported for tools that name the role.

## CRM sync tables (v0.33.0, migration `0031`)

Five `core` tables for ADR 0022, all tenant-scoped with forced row-level security, granted to
`closeline_core` alone. Schema in `src/schema/core-crm.ts` (the contract's value sets are mirrored
there as `CRM_*` constants and pinned by a test).

| Table | Key | Notes |
| --- | --- | --- |
| `crm_connection` | `(organization_id, id)`; unique `(organization_id, provider)` | one per provider per Organization. Unique `(provider, external_account_id)` across **all** Organizations (ADR 0022). `access_token_sealed`/`refresh_token_sealed` are `bytea` ciphertext with `token_key_id`; there is no plaintext token column. Disconnect deletes the row, and with it the mapping, runs, refs and receipts (cascade) |
| `crm_mapping` | `(organization_id, connection_id, kind, key)` | `kind` is `stage` (with `outcome`) or `field` (with `direction`; `activity.notes` is never `both`) |
| `crm_sync_run` | `(organization_id, id)` | lifecycle checked per `state`; counts, `skipped`/`failures` reports (at most 50), `cursor`. Lists by `(organization_id, connection_id, requested_at desc, id desc)`, also by state and object kind |
| `crm_external_ref` | `(organization_id, id)`; unique `(organization_id, provider, object_kind, external_id)` | lookup by local id on `(organization_id, provider, object_kind, local_id)`. `pending_write` rows have a null `external_id` and a `write_key`, unique per `(organization_id, provider, write_key)`, recorded before the CRM call |
| `crm_webhook_receipt` | `(organization_id, connection_id, event_id)` | the primary key dedupes on the provider's event id; prune by `(organization_id, received_at)` |

## CRM webhook lookup (v0.35.0, migration `0033`)

A CRM webhook names only the provider's account, before any Organization is known (ADR 0022).
`core.crm_connection_for_account(p_provider text, p_external_account_id text)` answers it:
`TABLE(organization_id text, connection_id text)`, at most one row, from the unique
`(provider, external_account_id)` index. `STABLE SECURITY DEFINER`, `search_path = pg_catalog, core,
pg_temp`, `EXECUTE` revoked from `PUBLIC` and granted to `closeline_core` alone. It is owned by
`closeline_core_crm_lookup` (`CRM_LOOKUP_ROLE`): `NOLOGIN`, `BYPASSRLS`, `NOINHERIT`, a member of no
role and held by no service role (`closeline_owner` is a member `WITH SET TRUE, INHERIT FALSE`, as for
`closeline_core_search`). It holds `USAGE` on `core` and `SELECT` on four columns of
`crm_connection` (`organization_id`, `id`, `provider`, `external_account_id`), so no token or key id
can be returned.

`CRM_CONNECTION_FOR_ACCOUNT` is the statement, with `$1` the provider and `$2` the account id; run it
on the pooled handle, not inside `withOrganization`, then read the connection inside
`withOrganization` for the Organization it names:

```sql
select organization_id, connection_id from core.crm_connection_for_account($1, $2)
```

- No row for an unknown account, for the same account id under the other provider, or once the
  connection is disconnected (disconnecting deletes the row) or its Organization deleted. A
  connection in `needs_reconnect` still routes.
- A null or unknown provider, and an account id that is null, empty or over 128 characters, give no
  row and raise nothing. The account id is matched exactly, never as a pattern.
- The Organization setting is neither read nor needed. The Organization's `status` is not checked:
  the handler reads it after scoping.

**Deployed Regions** (tula-closeline-infra) must create the role in the Region bootstrap, before
migration `0033` runs, as for `closeline_core_search`:

```sql
CREATE ROLE closeline_core_crm_lookup NOLOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT BYPASSRLS;
GRANT closeline_core_crm_lookup TO closeline_owner WITH SET TRUE, INHERIT FALSE;
```

The migration fails naming the role if it is missing or wrongly configured. Locally
`docker/postgres/init.sql` does this; a volume created before v0.35.0 lacks the role, so recreate it.
The tenant isolation check allows `BYPASSRLS` on both definer roles (`DEFINER_ROLES`) and reports
either if it can log in or is a superuser.
