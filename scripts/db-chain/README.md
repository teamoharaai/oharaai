# Full-chain database tests

`npm run test:goals:db` applies every file in `supabase/migrations` in order to a throwaway PostgreSQL that looks like hosted Supabase, then runs the database suites against copies of it. It needs no Docker, Supabase CLI, credentials or network. The chain applies in about 5 seconds, and the four suites take about 30 seconds.

## Why

Each suite used to load its own hand-written scaffold (`lib/goals/*-db-scaffold.sql`) and only its own migrations. Scaffolds drift from hosted Supabase: on 2026-09-25 they hid two Migration 073 defects that would have failed on hosted (the `auth.uid()` permission error and the ownership transfer). With the real chain, a test only passes if the migrations work the way they will in production (TD-001).

## Setup

- **macOS:** `brew install postgresql@17 pgvector`. PostgreSQL 17 is used because Homebrew's pgvector isn't built for 16. It installs alongside 16 and isn't started as a service.
- **CI:** `.github/workflows/db-chain.yml` installs `postgresql-17` and `postgresql-17-pgvector` from the PostgreSQL apt repository.
- **Node:** 24, from PATH, or set `OHARA_NODE`.

## How it works

1. `initdb` into `/tmp/ohara-goal-chain.*` with bootstrap superuser `supabase_admin`; Unix socket only, port 55450.
2. `supabase-platform.sql` recreates what hosted Supabase provides before any migration runs:
   - the roles `anon`, `authenticated`, `service_role` and `authenticator`;
   - the `auth` schema (`users`, `uid()`, `role()`, `jwt()`, `email()`), `storage` (`buckets`, `objects`, `foldername()`) and `extensions` (`pgcrypto`, `uuid-ossp`, `vector`);
   - Supabase's grants, and the default privileges.
3. Migrations run as **`postgres`, a non-superuser**, as on hosted. The one exception is 001, whose event trigger needs superuser. On hosted, `supautils` permits that, so the runner lifts `postgres` to superuser for 001 only and hands the trigger to `supabase_admin`.
4. Each suite gets a fresh copy of the chain (`create database … template`). A suite can ask for the chain only up to an earlier migration: `task-schedule-continuity` runs on `chain_074` because it applies 075 itself.

Suites receive one env contract: `GOAL_TEST_SOCKET`, `GOAL_TEST_PORT`, `GOAL_TEST_DB`, `GOAL_TEST_PSQL` and `PGUSER=postgres`.

## Options

| Command or variable | Effect |
| --- | --- |
| `bash scripts/db-chain/run.sh --chain-only` | Only prove the chain applies |
| `bash scripts/db-chain/run.sh goal-work` | Run only suites whose path contains `goal-work` |
| `--keep` | Leave the cluster running and print the `psql` and stop commands |
| `OHARA_DEFAULT_ACL=hosted` (default) | Tables and functions `postgres` creates are granted to client roles, as on hosted projects. This is the mode where a forgotten `REVOKE` is a real exposure. |
| `OHARA_DEFAULT_ACL=cli` | No default client grants, as after `supabase db reset` (what Migration 039 restores explicitly). CI runs both modes. |
| `OHARA_PG_BIN` | PostgreSQL bin directory (default: Homebrew `postgresql@17`) |
| `OHARA_MIGRATIONS_DIR` | Apply a different migrations directory, e.g. a copy with a seeded defect to prove a suite catches it |

## Adding a suite

Add `"<path>:all"` (or `:<NNN>` for "chain through NNN") to `SUITES` in `run.sh`. Create test users with `insert into auth.users(id) values(...)`: the first column of the real table is `instance_id`, and signup (008/028) creates the profile, so change its timezone with `UPDATE`. Tests connect as the non-superuser `postgres`. To act as a migration-owned role, borrow it the way the migrations do: `grant <role> to current_user; set role <role>; … reset role; revoke <role> from current_user;`.

If a migration needs something from Supabase that is missing here, add it to `supabase-platform.sql` in its upstream shape. Never patch a migration to suit the harness.

## Known differences from hosted

- PostgreSQL 17 locally, 15 on hosted. `CREATEROLE` semantics differ between them; the 072–074 executor-role pattern works under both.
- No `supautils`, PostgREST, GoTrue or storage API. Only the database is exercised; HTTP routes have their own tests.
- The hosted default-ACL setting isn't verified yet, so CI runs both modes. The rollback-only hosted preflight remains the pre-deploy gate.

## Not yet migrated

The older domain harnesses in `scripts/test-*-security.sh` (tasks, momentum, circles, notes, sticky notes, vault, constellation) still use their own `*-security-bootstrap.sql`. They can move onto this chain the same way. `test:projects:db` expects a Docker-based local Supabase on port 54322.
