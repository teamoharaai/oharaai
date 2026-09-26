# Full-chain database tests

`npm run test:db` applies every file in `supabase/migrations` in order to a throwaway PostgreSQL that looks like hosted Supabase, then runs every database suite against copies of it: the Goal suites and the domain suites (Tasks, Momentum, Circles, Notes/Entries, Sticky Note folders, Vault, Constellation, Projects V1 and V1.1). It needs no Docker, Supabase CLI, credentials or network. The chain applies in about 5 seconds; all 13 suites take about 35 seconds.

| Command | Runs |
| --- | --- |
| `npm run test:db` | Every suite |
| `npm run test:goals:db` | The four Goal suites (`lib/goals`) |
| `npm run test:tasks:db`, `test:momentum:db`, `test:circles:db`, `test:entries:db`, `test:sticky-folders:db`, `test:projects:db`, `test:projects:v11:db` | One domain (the old `scripts/test-*-security.sh` entry points are now thin wrappers) |
| `npm run test:preflight:rehearsal` | The rollback-only hosted preflight, rehearsed locally (below) |

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

- **macOS:** `brew install postgresql@17 pgvector`. PostgreSQL 17 matches hosted (17.6, read 2026-09-26) and Homebrew's pgvector isn't built for 16. It installs alongside 16 and isn't started as a service.
- **CI:** `.github/workflows/db-chain.yml` installs `postgresql-17` and `postgresql-17-pgvector` from the PostgreSQL apt repository.
- **Node:** 24, from PATH, or set `OHARA_NODE`.

## How it works

1. `initdb` into `/tmp/ohara-goal-chain.*` with bootstrap superuser `supabase_admin`; Unix socket only, port 55450.
2. `supabase-platform.sql` recreates what hosted Supabase provides before any migration runs:
   - the roles `anon`, `authenticated`, `service_role` and `authenticator`;
   - the `auth` schema (owned by `supabase_admin`, objects by `supabase_auth_admin`, as on hosted), `storage` and `extensions` (`pgcrypto`, `uuid-ossp`, `vector`);
   - Supabase's grants, and the default privileges.
3. Migrations run as **`postgres`, a non-superuser**, as on hosted. The one exception is 001, whose event trigger needs superuser. On hosted, `supautils` permits that, so the runner lifts `postgres` to superuser for 001 only and hands the trigger to `supabase_admin`.
4. Suites run on copies of the chain, optionally stopped early ("chain through NNN"):
   - **Node suites** (`lib/goals/*-db.test.mjs`) get a template-database copy. `task-schedule-continuity` runs on `chain_075` because it applies 076 itself.
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
| `OHARA_PG_BIN` | PostgreSQL bin directory (default: Homebrew `postgresql@17`) |
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

`scripts/test-manual-goal-hosted.mjs` is the pre-deploy gate. In **one transaction** it applies every local migration after `--applied-through`, runs the probes in `scripts/goal-hosted-preflight/`, prints hosted facts (grants, executor access to `auth`, triggers), then rolls back. The server then confirms the transaction's xid is `aborted`.

Guards, all checked before anything is applied:
- the project ref must match `supabase/.temp/project-ref`;
- the target must be that project's pooler;
- hosted `supabase_migrations.schema_migrations` must equal local 001..`--applied-through`, by version and name;
- each pending migration must be exactly one `BEGIN … COMMIT` with nothing that can't run in a transaction.

Before 076 it counts, read-only, the Task-days 076 would abort on (`TASK_OCCURRENCE_DAY_CONFLICTS`) and the redundant rows it would cancel. A non-zero conflict count skips 076 and exits 2 (BLOCKED).

- **Hosted:** `node scripts/test-manual-goal-hosted.mjs --project-ref <ref> --applied-through 073`. **This needs explicit approval every time.** The project is production.
- **Local rehearsal:** `npm run test:preflight:rehearsal`, with `HOSTED_APPLIED_THROUGH` set to hosted's last migration (default 073; update it after each deploy). CI runs it.

## Known differences from hosted

- No `supautils`, PostgREST, GoTrue or storage API. Only the database is exercised; HTTP routes have their own tests.
- The stand-in grants default privileges only for objects `postgres` creates in `public`. Hosted also has `supabase_admin` defaults in `public`, `storage`, `graphql` and so on. Migrations run as `postgres`, so this doesn't affect them.
- Some retired files still describe the old harnesses: dated reports in `docs/`, and history in `CHANGELOGCODEX.md`.
