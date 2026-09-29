# Full-chain database tests

`npm run test:db` applies every file in `supabase/migrations` in order to a throwaway PostgreSQL that looks like hosted Supabase, then runs every database suite against copies of it: the Goal suites and the domain suites (Tasks, Momentum, Circles, Notes/Entries, Sticky Note folders, Vault, Constellation, Projects V1 and V1.1). It needs no Docker, Supabase CLI, credentials or network. The chain applies in about 5 seconds; all 15 suites take about 40 seconds.

| Command | Runs |
| --- | --- |
| `npm run test:db` | Every suite |
| `npm run test:goals:db` | The six Goal suites (`lib/goals`), including the operation ledger (078) and Goal events (080) |
| `npm run test:tasks:db`, `test:momentum:db`, `test:circles:db`, `test:entries:db`, `test:sticky-folders:db`, `test:projects:db`, `test:projects:v11:db` | One domain (the old `scripts/test-*-security.sh` entry points are now thin wrappers) |
| `npm run test:preflight:rehearsal` | The rollback-only hosted preflight, rehearsed locally (below) |
| `npm run test:apply:rehearsal` | The committing hosted apply, rehearsed locally with seeded rows (below) |

## Why

Each suite used to load its own hand-written scaffold or bootstrap and only its own migrations. Those drifted from hosted Supabase and hid real problems (TD-001):
- 2026-09-25: two Migration 073 (now 074) defects, the `auth.uid()` permission error and the ownership transfer.
- 2026-09-26, found when the domain suites moved onto the chain:
  - 047 had re-granted `authenticated` EXECUTE on the internal Note evidence synchronizer, which the Notes suite forbids. The Notes bootstrap never applied 047. Fixed forward by Migration 077.
  - The Constellation harness skipped 033 and was testing a column (`constellation_evidence_links.brt_category`) that production dropped.
  - The Tasks RLS isolation check was vacuous: it looked only for Tasks of a user who had none.
  - Several bootstraps allowed values the real constraints reject.

With the real chain, a test only passes if the migrations work the way they will in production.

## Setup

- **macOS:** `brew install postgresql@17 pgvector pg_cron`. PostgreSQL 17 matches hosted (17.6, read 2026-09-26) and Homebrew's pgvector isn't built for 16. It installs alongside 16 and isn't started as a service.
- **CI:** `.github/workflows/db-chain.yml` installs `postgresql-17`, `postgresql-17-pgvector` and `postgresql-17-cron` from the PostgreSQL apt repository.
- **pg_cron** (078's retention job): the cluster preloads it (`shared_preload_libraries`, `cron.database_name=chain`), and the stand-in creates it the way hosted supautils does, so 078's `create extension if not exists` no-ops. Its scheduler is deliberately not started (`max_worker_processes=0`): an idle scheduler session would block the template copies, and suites call `goal_private.prune_operations()` directly.
- **Node:** 24, from PATH, or set `OHARA_NODE`.

## How it works

1. `initdb` into `/tmp/ohara-goal-chain.*` with bootstrap superuser `supabase_admin`; Unix socket only, port 55450.
2. `supabase-platform.sql` recreates what hosted Supabase provides before any migration runs:
   - the roles `anon`, `authenticated`, `service_role` and `authenticator`;
   - the `auth` schema (owned by `supabase_admin`, objects by `supabase_auth_admin`, as on hosted), `storage` and `extensions` (`pgcrypto`, `uuid-ossp`, `vector`), and `pg_cron` with Supabase's documented grants to `postgres`;
   - Supabase's grants, and the default privileges.
3. Migrations run as **`postgres`, a non-superuser**, as on hosted. The one exception is 001, whose event trigger needs superuser. On hosted, `supautils` permits that, so the runner lifts `postgres` to superuser for 001 only and hands the trigger to `supabase_admin`.
4. Suites run on copies of the chain, optionally stopped early ("chain through NNN"):
   - **Node suites** (`lib/goals/*-db.test.mjs`) get a template-database copy. `task-schedule-continuity` runs on `chain_075` because it applies 076 itself; `goal-events` runs on `chain_079`, seeds rows through desktop's paths and applies 080 itself, to prove the backfill.
   - **Shell suites** (`scripts/db-chain/suites/*.sh`) each get their own cluster, copied from a stopped data-directory snapshot. Roles are cluster-wide, so a copied database could not re-run 072's `CREATE ROLE` when a suite continues the chain. They source `lib.sh`, which provides `continue_chain [NNN]` (apply the real migrations after the snapshot), `apply_migration NNN` (re-run one, e.g. for idempotency) and `quiet_sql`. That is how the Tasks and Vault suites load their production-shaped fixtures at the same point as the old bootstraps: through 046 for Tasks, through 069 for Vault.

Suites receive one env contract: `GOAL_TEST_SOCKET`, `GOAL_TEST_PORT`, `GOAL_TEST_DB`, `GOAL_TEST_PSQL`, `PGUSER=postgres`, plus `CHAIN_AT`, `CHAIN_MIGRATIONS_DIR` and `CHAIN_TMP` for shell suites.

## Options

| Command or variable | Effect |
| --- | --- |
| `bash scripts/db-chain/run.sh --chain-only` | Only prove the chain applies |
| `bash scripts/db-chain/run.sh goal-work` | Run only suites whose path contains `goal-work` |
| `--keep` | Leave the cluster running and print the `psql`, env and stop commands |
| `--through NNN` (with `--chain-only`) | Stop the chain after NNN, e.g. at the state hosted is at |
| `OHARA_DEFAULT_ACL=hosted` (default) | Tables, functions and sequences `postgres` creates in `public` are granted to client roles. **This is hosted's setting** (read from `pg_default_acl` on 2026-09-26). It is the mode where a forgotten `REVOKE` is a real exposure. |
| `OHARA_DEFAULT_ACL=cli` | No default client grants, as after `supabase db reset`. This catches code that relies on implicit grants, which is what 039 restored explicitly. CI runs both modes. |
| `OHARA_PG_BIN` | PostgreSQL bin directory with pgvector and pg_cron (default: Homebrew `postgresql@17`) |
| `OHARA_MIGRATIONS_DIR` | Apply a different migrations directory, e.g. a copy with a seeded defect to prove a suite catches it |

## Adding a suite

- **Node:** add `"<path>:all"` (or `:<NNN>` for "chain through NNN") to `SUITES` in `run.sh`.
- **SQL:** add a `scripts/db-chain/suites/<name>.sh` that sources `../lib.sh`, and list it the same way.
- **Test users:** create them with `insert into auth.users(id) values(...)`. The first column of the real table is `instance_id`, and signup (008/028) creates the profile, so change profile fields with `UPDATE`.
- **Real constraints:** Goals need a category valid at that point in the chain (the four product categories after 068, the legacy taxonomy before). Tasks need `completion_mode`, and occurrences need an `occurrence_key`.
- **Roles:** tests connect as the non-superuser `postgres`. To act as a migration-owned role, borrow it the way the migrations do: `grant <role> to current_user; set role <role>; … reset role; revoke <role> from current_user;`.
- **Missing Supabase pieces:** if a migration needs something from Supabase that is missing here, add it to `supabase-platform.sql` in its upstream shape. Never patch a migration to suit the harness.
- **Prove it:** seed a defect into a copy (`OHARA_MIGRATIONS_DIR`) and check that the suite fails. Each ported domain was proven this way on 2026-09-26 (see `CHANGELOGCODEX.md`).

## Hosted preflight

`scripts/test-manual-goal-hosted.mjs` is the pre-deploy gate. In **one transaction** it applies every local migration after `--applied-through`, runs the probes in `scripts/goal-hosted-preflight/`, prints hosted facts (grants, executor access to `auth` and, from 081, read access to `storage.objects`, triggers), then rolls back. The server then confirms the transaction's xid is `aborted`.

Guards, all checked before anything is applied:
- the project ref must match `supabase/.temp/project-ref`;
- the target must be that project's pooler;
- hosted `supabase_migrations.schema_migrations` must equal local 001..`--applied-through`, by version and name;
- each pending migration must be exactly one `BEGIN … COMMIT` with nothing that can't run in a transaction.

Before 076 it counts, read-only, the Task-days 076 would abort on (`TASK_OCCURRENCE_DAY_CONFLICTS`) and the redundant rows it would cancel. A non-zero conflict count skips 076 and exits 2 (BLOCKED).

- **Hosted:** `node scripts/test-manual-goal-hosted.mjs --project-ref <ref> --applied-through $(cat scripts/db-chain/hosted-applied-through)`. **This needs explicit approval every time.** The project is production.
- **Local rehearsal:** `npm run test:preflight:rehearsal` (below). CI runs it.

## Hosted apply

`--apply` on the same script is the deploy. It keeps every preflight guard and runs the same transaction, with these differences:
- **Before:** it fingerprints the existing rows of `goals`, `milestones`, `tasks`, `task_schedules`, `task_occurrences` and `task_mutation_receipts`: a row count plus an md5 over each row as JSON, restricted to the columns the table already had (`scripts/goal-hosted-preflight/invariants-*.sql`).
- **076 pre-check:** any conflict, or any redundant row 076 would cancel, ends the session before 076 (exit 2, nothing committed). An apply therefore never changes existing Task data.
- **Probes** run inside a savepoint that is rolled back, so no synthetic row survives.
- **Then:** the fingerprints must be unchanged (`APPLY_INVARIANT_CHANGED` aborts), the pending migrations are recorded in `supabase_migrations.schema_migrations` (version, name, and the whole file as the single `statements` element), `notify pgrst, 'reload schema'` is queued, and it COMMITs.
- **After:** the server must report the transaction `committed`, the history must equal local 001..last, and each new row's `statements` must hash to its local file.

**History row format** (read-only from hosted, 2026-09-27): rows written by `supabase db push` (e.g. 073) split `statements` per statement, with the trailing `;` removed. 072, applied by hand, stores the whole file as one element. `--apply` follows 072: it is byte-exact and needs no SQL splitter. Tools that only read versions (`db push`, `migration list`) are unaffected either way.

Any failure before COMMIT leaves the target untouched. Migrations are applied in number order, all pending ones at once: history must stay gap-free for the guard and for `supabase db push`.

Deploy steps (**each hosted step needs explicit approval**):
1. Run the hosted preflight the same day, and read its output.
2. `node scripts/test-manual-goal-hosted.mjs --project-ref <ref> --applied-through <hosted last> --apply`. Keep the output.
3. Set `scripts/db-chain/hosted-applied-through` to the new last migration. Both rehearsals read it, and skip while nothing is pending.

**Local rehearsal:** `npm run test:apply:rehearsal`. It builds the chain through `hosted-applied-through`, loads `fixtures/apply-rehearsal-seed.sql`, and proves: a pending migration that edits an existing row aborts with nothing kept; an unclean 076 pre-check blocks; the real apply commits with rows unchanged, the full history and no probe rows; a rerun is refused. CI runs it.

The chain records each migration in `supabase_migrations.schema_migrations` (created by `supabase-platform.sql` in the CLI's shape), so the history guard also runs locally.

## Hosted target and live verification

**One target resolver.** `hosted-target.mjs` is the only code that resolves the hosted project. It checks:
- the explicit `--project-ref` equals `supabase/.temp/project-ref`;
- the database is that project's pooler;
- the API is `https://<ref>.supabase.co`.

Every hosted script imports it; nothing in it connects.

**Live native↔API↔database run:** `node scripts/goal-live-verification.mjs provision|cleanup --project-ref <ref>`.
- `provision` checks that admission is closed and the allowlist is empty, creates two `@goal-e2e.ohara.test` accounts, allow-lists only the owner and opens `enabled` (with `verification_only` staying true), and writes a private `.xctestrun` holding the credentials.
- `cleanup` closes admission, deletes only the recorded accounts and verifies that no row remains.
- **Each step needs explicit approval. Run cleanup even when the tests fail.**
- The full command sequence is in `docs/goal-work-e2e-verification-2026-09-27.md`. The ledger run is recorded in `docs/goal-operations-e2e-verification-2026-09-27.md`.
- Cleanup's evidence and "nothing remains" counts include `goal_private.operation_ledger` and `goal_private.goal_events`. From 078, every protocol writes the ledger; from 080, every Task, Milestone and Entry write also writes an event. Any new receipt or event store a live test writes needs a count here too, or cleanup can't tell whether it's empty.

## Invariants and receipts (078 onward)

`invariants-before.sql` also fingerprints `goal_private.operations`, `goal_mutations`, `work_mutations` and `provenance`: 078 copies the receipts into `goal_private.operation_ledger` and must leave the old rows untouched (the old tables are frozen; a later migration drops them). The apply-rehearsal seed has receipts in all three stores, and the 078 probe checks each copy field by field. A migration that moves rows out of a fingerprinted table needs its own invariant, not an exception. From 080, `goal_private.goal_events` is fingerprinted too (through `to_regclass`, so preflights on a target without it still run): a later apply must not rewrite Activity history.

## Known differences from hosted

- No `supautils`, PostgREST, GoTrue or storage API. Only the database is exercised; HTTP routes have their own tests.
- pg_cron's scheduler doesn't run (see Setup). The hosted preflight facts print whether hosted has pg_cron and grants `postgres` what 078 needs. Hosted had pg_cron 1.6.4 enabled on 2026-09-27, and 078's job is active there.
- **Session timezone.** CI sessions run in UTC; a Mac uses its local zone. A test that compares `current_date` with a date the engine computes in a schedule's timezone (`now() at time zone <tz>`) fails only in some hours. Use the schedule's local date, and check a date-sensitive suite with `PGTZ=UTC` as well as locally (see the 2026-09-28 fix to `tasks-security.test.sql`).
- The stand-in grants default privileges only for objects `postgres` creates in `public`. Hosted also has `supabase_admin` defaults in `public`, `storage`, `graphql` and so on. Migrations run as `postgres`, so this doesn't affect them.
- Some retired files still describe the old harnesses: dated reports in `docs/`, and history in `CHANGELOGCODEX.md`.
