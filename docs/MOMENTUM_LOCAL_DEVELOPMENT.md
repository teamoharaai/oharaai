# Momentum Local Development

This workflow is deliberately isolated from the shared Supabase project. Never run Momentum migrations or fixtures with the repository's existing `.env`.

## Prerequisites

For the complete Supabase API/Auth/PostgREST environment:

- Supabase CLI 2.111 or compatible
- Docker Desktop, OrbStack, Colima, or another Supabase CLI-compatible container runtime
- PostgreSQL client tools when applying the isolated Momentum bootstrap directly

For the fast disposable migration/RLS harness:

- PostgreSQL 16 or newer (`pg_config`, `initdb`, `pg_ctl`, and `psql`)

## Environment selection

1. Copy `.env.local.example` to the ignored `.env.local` file.
2. Keep `EXPO_PUBLIC_SUPABASE_URL` exactly `http://127.0.0.1:54321` or `http://localhost:54321`.
3. Start the local stack:

   ```sh
   npm run supabase:local:start
   ```

4. Read the local credentials printed by `supabase status` and place only those local keys in `.env.local`.
5. Verify the resolved target before any reset, migration, fixture, API, or app command:

   ```sh
   npm run supabase:local:verify
   ```

The verification command prints only the environment-file path and local origin. It never prints keys. It rejects HTTPS, non-loopback hosts, and ports other than the standard local API port `54321`.

Expo's environment loading gives `.env.local` precedence over `.env`. Keep the local file present while testing and verify the target again before starting the app.

Current Supabase CLI releases may generate `sb_publishable_...` and `sb_secret_...` local keys. Use the values labeled `PUBLISHABLE_KEY` and `SECRET_KEY` when legacy local JWT keys are rejected by Auth. These credentials remain local-only.

## Commands

```sh
npm run supabase:local:start
npm run supabase:local:status
npm run supabase:local:verify
npm run supabase:local:reset
npm run supabase:local:stop
```

`supabase:local:reset` and `supabase:local:stop` are destructive to local data. The reset wrapper refuses to run until `.env.local` resolves to the loopback API on port 54321 and contains local anon/service credentials. It invokes `supabase db reset --local`; no project reference or database URL is accepted. Stop uses `--no-backup` so disposable validation data is not retained.

`supabase/seed.sql` intentionally creates no accounts or activities. Date-sensitive Momentum fixtures are created by the guarded integration harness after schema setup.

### Full migration-chain status

The clean-reset blocker in the squashed baseline was repaired on 2026-08-03. The normal guarded `supabase:local:start` and `supabase:local:reset` workflows now apply the complete repository chain through Migration 039 and the empty seed file. Do not use the former partial-bootstrap workaround for application/API testing.

See `docs/SUPABASE_MIGRATION_CHAIN_REPAIR.md` for the baseline-ordering, pgvector, privilege, shared-environment, and validation analysis. Migration 038 remains unchanged and can still be tested independently with the disposable database security harness below.

## Disposable database security harness

The repository's established database-security pattern uses a temporary PostgreSQL cluster bound only to a private Unix socket:

```sh
npm run test:momentum:db
```

The harness:

- never reads `.env` or `.env.local`;
- disables TCP listening;
- creates only the minimum Auth/profile/goal/action schema required by migration 038;
- applies migration 038 to the temporary database;
- verifies service-role-only publication, direct mutation denial, owner RLS, identical-hash idempotency, event deduplication, and superseding revisions;
- destroys its temporary data directory on exit.

This harness validates PostgreSQL constraints and permissions but does not replace full Supabase Auth/API/Home validation.

## Source validation

Run before database reset:

```sh
npm run test:momentum
npx tsc --noEmit --types node,react
git diff --check
```

After the local stack is available, run the database harness, then start the application with `.env.local` active. Test the authenticated `/api/momentum` endpoint and Home card only after `npm run supabase:local:verify` succeeds.

The focused local checks are:

```sh
npm run test:momentum:local
npm run test:momentum:api
```

The local integration script recreates three fixed `@local.ohara.test` Auth fixtures, verifies ten calculation scenarios and five security assertions, and prints only a sanitized result. The API smoke check uses the same local-only owner fixture and never prints its access token.

## Trust and credential rules

- Never place a remote URL or remote keys in `.env.local`.
- Never pass `--db-url`, a project reference, or remote credentials to local wrapper commands.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` through an `EXPO_PUBLIC_*` variable or client component.
- Ordinary authenticated and anonymous roles cannot execute `publish_momentum_snapshot` or directly insert, update, or delete Momentum tables.
- The authenticated API derives the user from the bearer token. Trusted server code queries canonical records, calculates every derived result/hash/reason, and uses the server-only service-role client solely for persistence.
- Stop immediately if any target-verification output is not a loopback URL on port 54321.
