# Supabase Migration Chain Repair

Date: 2026-08-03

Scope: local clean-install reproducibility only

Status: validated locally; not applied to any remote environment

## Executive result

The repository can now build its complete public schema from an empty isolated Supabase database. Three clean replays applied migrations `001` through `039`, including unchanged Migration `038`, and the final two replays produced the same deterministic schema/security fingerprint:

```text
contract records: 1629
catalog fingerprint: fd93710c7f712ce8e1f66433198b9ff0
```

The final catalog contains 39 tracked migrations, 35 public tables, and RLS enabled on all 35 public tables. `space_members` exists before the `spaces` membership-read policy is created. The eight final `spaces`/`space_members` policies, foreign keys, triggers, indexes, ownership checks, and policy expressions are preserved.

No remote Supabase project was queried, contacted, migrated, or modified. No Momentum engine, service, API, UI, calculation, or Migration `038` logic changed.

## Root cause

### Migration 003 forward reference

Migration `003_spaces_and_projects.sql` is a 2026-06-24 narrative squash of the original incremental migrations. The original history executed these operations in a valid order:

1. archived Migration `014` created `spaces`;
2. archived Migration `015` created `space_members` and the shared-space policy;
3. archived Migration `019` replaced the cyclic read policies with the final non-recursive policies;
4. archived Migration `022` renamed `spaces.user_id` to `owner_id` and recreated the final policies.

The squash copied the final `Users can read own and member spaces` policy above the `CREATE TABLE public.space_members` statement. PostgreSQL resolves relation references when `CREATE POLICY` executes, not at the end of a file or transaction. An empty database therefore failed immediately with `relation "public.space_members" does not exist`.

This was an ordering/transcription defect. `space_members` was neither missing nor renamed, and the policy was not unrelated copied logic.

### Pgvector typmod loss

After the policy order was corrected, the clean replay exposed a second squash transcription defect in Migration `004`: the three HNSW indexes targeted embedding columns declared as unbounded `vector`. pgvector refuses to create an HNSW index when the column has no dimensions.

Archived Migration `023`, `lib/ai/constants.ts`, the Constellation specification, and the embedding client all define `voyage-4-lite` embeddings as 1024 dimensions. The baseline declarations in migrations `001`, `002`, and `004` had lost that typmod during the squash. Restoring `vector(1024)` preserves the original and current application contract and allows the existing indexes to be created.

### Missing explicit PostgREST table privileges

Once all DDL applied, real local API fixtures revealed that tables created by the local migration role inherited a restrictive PostgreSQL default ACL: RLS policies existed, but neither `authenticated` nor `service_role` had the table privileges needed to reach them through PostgREST.

This was repaired forward in Migration `039`, rather than by adding a blanket default privilege or `GRANT ALL ON ALL TABLES`. The migration enumerates each authenticated operation backed by the final RLS/capability design, grants no public-table CRUD to `anon`, enumerates server-role CRUD, and reasserts the direct friendship and Momentum mutation revokes.

## Repository and deployment evidence

Repository evidence indicates that the squashed baseline may already be represented in shared migration ledgers:

- commit `6e86255` states that the 26 original migrations were squashed into `001`-`006`, reconciled with the live schema, and tracked with `supabase migration repair --linked`;
- the current `001`-`006` headers say they were applied on 2026-06-24 and reconciled against `schema_migrations`;
- `supabase/CLAUDE.md` says the archived originals must not be replayed because shared ledgers track the squashed baseline versions;
- repository changelogs record later shared-environment alignment and application through portions of the post-squash chain.

This is evidence about repository history, not a fresh remote verification. The task prohibited remote contact, so the current state of any shared environment was not queried and is not asserted.

## Repair strategy and safety rationale

### Baseline history corrected where a forward migration cannot help

The following clean-install corrections were made directly in the squashed baseline:

- `003_spaces_and_projects.sql`: moved only the final `spaces` read-policy statement below creation and policy setup of `space_members`;
- `001_core_schema_and_rls.sql`, `002_echo.sql`, and `004_vaults_and_embeddings.sql`: restored the documented `vector(1024)` typmod on the three embedding columns.

A new compatibility migration cannot fix either error on a truly empty database because PostgreSQL aborts in `003` or `004` before a later migration can execute. The edits do not change the intended final schema or policy behavior. Databases that already record the baseline versions as applied do not rerun these files and are unaffected.

### History extended where a forward repair is possible

Migration `039_restore_explicit_table_privileges.sql` is additive and idempotent. It:

- grants authenticated users only the operations supported by the final owner-scoped policies or explicit read-only capabilities;
- preserves non-deletable profiles, append-only/event patterns, system-managed Constellation records, function-owned invitation mutations, capability-only friendship mutations, and server-authoritative Momentum writes;
- grants no public-table `SELECT`, `INSERT`, `UPDATE`, or `DELETE` privilege to `anon`;
- explicitly re-revokes authenticated friendship and Momentum DML as defense in depth;
- does not disable RLS, change policy predicates, add ownership bypasses, or change function grants.

The local Momentum integration fixture was adjusted only to use the canonical full-chain data model: it updates the profile created by the Auth trigger instead of inserting a second profile, and supplies the required real goal category. Calculation and persistence assertions are unchanged.

## Clean-database behavior

On an empty local database:

1. `spaces` is created and its owner write policies are installed;
2. `space_members` is created with foreign keys, indexes, RLS, and member-management policies;
3. the `spaces` owner-or-member read policy is then installed;
4. all three 1024-dimensional embedding columns and HNSW indexes are created;
5. migrations `005` through unchanged `038` apply in order;
6. Migration `039` installs the explicit PostgREST privilege matrix;
7. the empty seed file runs without fabricating application data.

The catalog check confirmed:

- `space_members` exists;
- eight expected policies exist across `spaces` and `space_members`;
- the `space_members -> spaces`, `projects -> spaces`, and `goals -> spaces/projects` foreign keys exist with their intended deletion behavior;
- all embedding columns are `vector(1024)`;
- all 35 public tables have RLS enabled;
- direct authenticated inserts into `friend_connections` and `momentum_weekly_snapshots` remain unavailable;
- `service_role` has the explicit profile CRUD required by trusted local server workflows;
- `anon` has zero public-table CRUD privileges.

## Existing-environment considerations

- Existing databases that already track `001`-`004` do not replay the corrected baseline files. Their data and objects are not rewritten.
- Migration `039` can be reviewed and applied forward. Its statements are standard idempotent `GRANT`/`REVOKE` operations and do not rewrite table data.
- Before any shared deployment, compare the environment's current table ACLs with Migration `039`. A shared environment may already have equivalent privileges through different historical defaults.
- If a shared environment intentionally differs, resolve that difference in a separately reviewed superseding migration rather than editing `039` after deployment.
- No down migration was added. If Migration `039` must be superseded, use a new forward migration with explicit per-table revokes/grants; do not drop data or disable RLS.

## Validation results

### Migration and seed replay

- Guarded target: `http://127.0.0.1:54321`; database port `127.0.0.1:54322`.
- Container project: `oharaai-local`.
- Clean replays: three successful empty-database runs through Migration `039` and `supabase/seed.sql`.
- Final two deterministic catalog fingerprints: exact match (`1629|fd93710c7f712ce8e1f66433198b9ff0`).
- Migration ledger: 39 rows, `001` through `039`.

### Momentum preservation

- `npm run test:momentum`: 29/29 passed.
- `npm run test:momentum:db`: passed the disposable PostgreSQL security, idempotency, revision, deduplication, and RLS assertions.
- `npm run test:momentum:local`: passed 10 real local scenarios and 5 adversarial security assertions after each final reset used for application validation.
- Scenarios covered empty data, current-week completion, duplicate completion, previous-week exclusion, consecutive weeks, a gap week, timezone boundaries, identical recalculation, late-arriving revision, and cross-user isolation.
- `npm run test:momentum:api`: authenticated local response returned `Building`, value `4.5192`, weekly change `4.5192`, Weekly Streak `3`, and Tasks Completed `1`; forged query values were ignored and an unauthenticated request returned `401`.
- Authenticated browser Home showed `Building`, `5 · +4.52 this week`, Weekly Streak `3`, and Tasks Completed `1`. `Momentum unavailable` was absent and browser errors were empty.
- Migration `038` has no diff.

### Non-Momentum checks

- Constellation disposable database constraint/RLS harness: passed.
- Three-user local friendship capability/RLS harness: passed, including direct mutation denial and cleanup.
- `npm run test:friends`: 13/13 passed.
- `npm run test:entries`: 8/8 passed.

### Static and build checks

- `npx tsc --noEmit --types node,react`: passed.
- `npx expo export --platform web --output-dir <temporary-output-dir>`: passed with 50 API routes.
- `git diff --check`: passed after final documentation updates.
- No lint script is configured.
- The bare implicit-type TypeScript command remains subject to the pre-existing malformed duplicate `@types` directories already documented by Momentum Phase 1; no dependency cleanup was attempted.

## Remaining risks

- Repository evidence cannot prove the current state of an unqueried remote environment.
- Baseline files `001`-`004` now intentionally differ from the historical versions recorded in already-migrated environments. The differences are clean-install corrections only and must not be reapplied manually to shared databases.
- Migration `039` should receive an ACL-focused staging review because local PostgreSQL defaults exposed a privilege gap that may not exist identically in every hosted environment.
- The local CLI reported Expo package-version recommendations and known source require-cycle warnings during startup; neither affected migration, API, or build validation and neither was changed in this scoped repair.

## Recommended staging procedure

1. Review the baseline diffs and Migration `039` independently; confirm Migration `038` remains unchanged.
2. Create a disposable staging database from an empty project and apply the repository chain in order.
3. Compare the staging ACL matrix with the explicit Migration `039` contract before exposing PostgREST.
4. Run the Momentum 29-test source suite, disposable database harness, 10+5 local/staging scenarios, authenticated API smoke test, friendship security harness, and Constellation database harness.
5. Verify one authenticated owner and one unrelated user across profiles, goals, spaces, Entries, Constellation, friendship, and Momentum reads/writes.
6. Capture and retain the migration ledger, policy list, table-grant list, and deterministic catalog fingerprint.
7. Promote only after manual security review. Apply forward migrations through the established workflow; do not replay archived migrations or manually rerun corrected baseline files on an already-migrated database.
