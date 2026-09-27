# Goal development end-to-end verification — 2026-09-25

**Passed: native Swift → local existing Expo API → hosted development Supabase.** This is real network/database integration, not the in-memory UI fixture. The hosted `www.oharaai.com` API was not redeployed. General new-Goal admission remains closed.

## Scope and authorization

Justin confirmed `rrgiqemscnyaqkculnmb` is development/test, then clarified that desktop must continue working while Goals, Home summaries, Projects and Reflections/Notes are wired to iOS. No desktop screen was disabled; no existing Goal SELECT grant, legacy RPC permission or hosted bundle was revoked/replaced. The earlier broad reader-retirement proposal is not permission to disrupt desktop. This run verifies the manual Goal slice only; it does not certify the other iOS feature slices.

To avoid exposing new date semantics to existing clients during verification, migration 072 now defaults to a server-admin-controlled verification-owner allowlist behind the global admission kill switch. Only one newly provisioned, isolated account was admitted during the test. All existing accounts and the second test account stayed ineligible for the new creation protocol. No account ID supplied by a client can grant admission.

## Deployed database change

- Applied `072_manual_goal_foundation` after the existing hosted chain through 071; recorded it in `supabase_migrations.schema_migrations` and reloaded PostgREST's schema cache.
- Preflight used a rollback transaction against the actual PostgreSQL 17.6 hosted schema, including existing lifecycle, scoring-profile, project-owner and project-event triggers. It found and fixed two differences missed by the synthetic scaffold: temporary SET ROLE/schema CREATE are needed for function ownership transfer, and the hosted migration role cannot delegate auth-schema permissions. A fixed, identity-only private helper calls `auth.uid()` using the existing trusted migration owner.
- Temporary SET/INHERIT membership and schema CREATE are removed. Supabase retains its automatic admin-only membership for the database migration owner; no client role receives that membership. Private protocol privileges are explicitly denied to anon/authenticated/service_role, with only the fixed public RPC exposed to authenticated callers.
- The apply transaction compared existing Goal counts and a digest of IDs/legacy deadline values before and after, and aborted on any change. It passed. No legacy timestamp or category was converted.

## Executed checks

| Check | Result |
| --- | --- |
| Real API: missing authentication, private/no-store responses, capabilities, calendar context, list and receipt discovery | Passed with two disposable hosted Auth accounts. Only the allowlisted owner reported creation enabled. |
| Native real-network integration | Both `ManualGoalLiveIntegrationTests` passed. The actual Supabase Swift SDK, API client, Goal data source, strict DTOs, store and atomic identifier file were used. |
| Native create/replay | An undated Goal committed; repeating the exact submit returned the same receipt and Goal ID. |
| Restart recovery | A new GoalStore recovered the committed operation from the persisted identifier and server receipt; no content replay was needed. |
| Direct lookup/owner isolation | The owner loaded detail independently; the other account received HTTP 404. Random missing IDs also returned 404. |
| Calendar creation | The server-provided profile-local date round-tripped as strict `YYYY-MM-DD`; the saved legacy deadline remained NULL. |
| Database postconditions | Exactly two private canonical Goals existed, one dated/one undated, with zero Tasks, trackers or milestones. |
| Hosted account cleanup | Only the two verified synthetic accounts were deleted. Their Goals, receipts and allowlist entry cascaded away. |
| Regression | Native run reported 303 tests across 55 suites passing, with the two opt-in live tests skipped in this ordinary run. Separately, 18 Node contract tests and all 12 disposable PostgreSQL tests passed. Concurrent Goal Card work in the workspace was preserved. |

Native environment: Xcode 27.0 (27A266a), iPhone 17 simulator running iOS 26.5. Local API origin: `http://localhost:8081`, from the existing backend repository with its normal Supabase configuration. The production config remains HTTPS; only the opt-in test can select that exact loopback origin. No release transport setting was weakened.

## Final remote state

- Migration 072 installed.
- `enabled = false`, `verification_only = true`.
- Zero verification owners, zero manual-protocol operation rows, zero canonical Goals remain after cleanup.
- Existing anon/authenticated/service_role Goal table grants match the preflight inventory.
- Test credentials were cleared locally and their accounts removed. The private credential-bearing xctestrun file was deleted.
- No Vercel deployment, desktop retirement, legacy data adoption or all-account creation enablement occurred.

## Repeating verification

*Updated 2026-09-27:* this project is **production**, and 072 is applied. The preflight now takes `--applied-through` and covers every pending migration; `--apply` is the checked-in successor to the manual 072 apply described above. See `scripts/db-chain/README.md` ("Hosted preflight" and "Hosted apply"). Every hosted run needs Justin's explicit approval.

```sh
node scripts/test-manual-goal-hosted.mjs --project-ref rrgiqemscnyaqkculnmb --applied-through <hosted last>
```

It reads the existing linked project's pooler URL and local environment file without printing credentials. The history guard refuses a target whose history is not exactly local 001..`--applied-through`.

The native live suite is opt-in with `OHARA_LIVE_GOAL_TEST=1`; creation also requires `OHARA_LIVE_GOAL_CREATE=1`. Use fresh synthetic accounts ending in `@goal-e2e.ohara.test`, supply OWNER/OTHER email and password through a private xctestrun environment, and set `OHARA_LIVE_GOAL_API_URL=http://localhost:8081` for local API verification. Enable only the test owner in `goal_private.verification_owners`, keeping `verification_only=true`. Close admission and remove only those synthetic accounts after verification. Ordinary test runs never contact this backend through the live suite.

Successful local evidence:

- `/tmp/ohara-goal-e2e/native-live-1.xcresult` and `.log` — 2 real-network tests passed.
- `/tmp/ohara-goal-e2e/native-regression.xcresult` and `.log` — native regression passed.
- `/tmp/ohara-goal-e2e/runtime-preflight.log` and `apply072.log` — rollback proof and committed migration.
- `/tmp/ohara-goal-e2e/node-contracts.log`, `/tmp/ohara-goal-e2e-pg/tests.log` — backend tests.

## Remaining delivery boundary

The local development integration gate is passed. A normal installed app still points to `www.oharaai.com`; that origin needs the new API route deployed before these capabilities work there. Enabling creation for existing accounts remains a separate compatibility step: preserve working desktop readers, verify calendar expiration and derived Vault/embedding work, and then expand admission. This test-only run does not claim the older, broader rollout/access obligations are satisfied.
