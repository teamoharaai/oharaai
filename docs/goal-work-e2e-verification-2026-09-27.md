# Goal Card and Goal work end-to-end verification — 2026-09-27

**Passed: native Swift → deployed www.oharaai.com API → production Supabase (`rrgiqemscnyaqkculnmb`)** for `/api/goals/manual-v1`, `/api/goals/card-v1` and `/api/goals/work-v1`. This is the gate for the iOS Goal Card, Tasks and Milestones. General new-Goal admission stays closed.

Every production step was approved by Justin beforehand, as one planned sequence: provision, run, cleanup.

## Routes live on www.oharaai.com

- GitHub: `37a8408` has a Vercel `Production` deployment (id 6694294978) with state `success`. Both route files were added in `2bb080f`.
- Unauthenticated `GET /api/goals/card-v1` and `/work-v1` returned **401**, not 404 or 500.
- Their 401 used withAuth's plain body, and Vercel served it as `public, max-age=0, must-revalidate`. Fixed in source (`8468a65`): all three Goal routes now share `lib/goals/goal-route-http.ts`, so every response, including auth failures, is `private, no-store` in the Goal envelope. **It takes effect on the next push to `main`**; this run used the deployed `37a8408`.

## Procedure

`scripts/goal-live-verification.mjs` (new; it resolves the target through `scripts/db-chain/hosted-target.mjs`, the same guards as the hosted preflight/apply):

1. **`provision`**
   - Pre-check: it stops unless admission is closed, `verification_only` is true, the allowlist is empty and no `@goal-e2e.ohara.test` account exists.
   - Two fresh synthetic accounts are created through the Auth admin API.
   - In one transaction: **only the owner** is allow-listed and `enabled` is set to true, with `verification_only` staying true, so no other account can be admitted.
   - A private 0600 copy of the built `.xctestrun` is written with the credentials in the `OharaAITests` environment. The password exists nowhere else.
2. **Run**: `xcodebuild test-without-building -xctestrun <private copy> -only-testing:OharaAITests/ManualGoalLiveIntegrationTests`, against the production config (`https://www.oharaai.com`). No transport setting was weakened.
3. **`cleanup`**
   - Print the synthetic owners' row counts (the evidence below).
   - Set `enabled = false`.
   - Delete only the recorded accounts, after re-checking each one's email; their rows cascade.
   - Delete the private `.xctestrun`.
   - Verify that nothing remains.

## Output

| Step | Result |
| --- | --- |
| Before | `enabled false`, `verification_only true`, allowlist 0, synthetic accounts 0 |
| Provision | owner `b05022b6-f25a-4bf1-8ae7-1cfa8aa2e8e8`, other `c462ff4f-ff01-412f-9827-9ada45154cf3` (run `live-20260927-0ec9a4a6`); admission `true`, `verification_only true`, allowlist = owner only |
| Live tests | 3/3 passed on iPhone 17 (iOS 26.5): `deployedReadAndRecoveryContracts` (6.3 s), `deployedCreationReplayRecoveryAndOwnerIsolation` (7.8 s), `deployedGoalCardAndWorkLifecycle` (12.5 s) |
| Evidence before cleanup | auth users 2, profiles 2, goals 3, tasks 3, milestones 2, manual operations 3, goal_mutations 0, **work_mutations 13**, allowlisted 1 |
| Cleanup | admission `false`; both accounts deleted; private `.xctestrun` removed |
| After | all counts 0; `enabled false`, `verification_only true`, allowlist 0, synthetic accounts 0 |
| Native regression (ordinary run) | 396 tests: **393 passed, 0 failed**, 3 skipped (the opt-in live tests) |

The 13 `work_mutations` match the test exactly:
- 6 Task writes (create, progress and reschedule on the daily Task; create, progress and archive on the quantity Task);
- 1 replay-test create (its replay and the refused mismatch added no row);
- 5 Milestone writes (create, add step, complete step, complete parent, refused re-completion);
- 1 row for the other account's refused write. It's recorded under that account's own owner id, even though it reused the owner's operationId: operation IDs are per owner.

## What `deployedGoalCardAndWorkLifecycle` proves

It uses the real Supabase Swift SDK, `OharaAPIClient`, `SupabaseGoalDataSource` and `GoalCardStore`:

- **Goal Card read:** the header of a newly created Active Goal; an empty Tasks list and empty Milestones page, reported as authoritatively empty; an empty notes page; a 7-day activity window.
- **Tasks:**
  - create a daily Task and complete today's occurrence;
  - reschedule it to every weekday: today stays scheduled, so the completion carries over (076);
  - create a quantity Task (3 chapters), adjust it by 2, then archive it, after which it leaves the list.
- **Replay:** the same operationId applies once, with the same Task; a changed payload under it returns 409 `OPERATION_PAYLOAD_MISMATCH`.
- **Milestones:** create one and add a step. Completing the step leaves the parent open. Completing the parent seals it. Completing it again is `not_committed` with `MILESTONE_COMPLETE`. The store showed no error message.
- **Owner isolation:**
  - The other account gets 404 on the Goal header, activity, Tasks and Milestones.
  - Its write is `not_committed` with `GOAL_UNAVAILABLE`, `goalId` null and no Task. The owner's Task is unchanged.

## Repeating

With Justin's approval for each production step:

```sh
xcodebuild build-for-testing -project OharaAI.xcodeproj -scheme OharaAI \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5' -derivedDataPath /tmp/ohara-goal-live-build/dd
node scripts/goal-live-verification.mjs provision --project-ref rrgiqemscnyaqkculnmb \
  --xctestrun /tmp/ohara-goal-live-build/dd/Build/Products/<built>.xctestrun
xcodebuild test-without-building -xctestrun /tmp/ohara-goal-live-build/dd/Build/Products/ohara-<run>.xctestrun \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5' -only-testing:OharaAITests/ManualGoalLiveIntegrationTests
node scripts/goal-live-verification.mjs cleanup --project-ref rrgiqemscnyaqkculnmb
```

Run cleanup even when the tests fail. `provision` refuses to start while a previous run's `run.json` is still present.

Local evidence: `/tmp/ohara-goal-live-provision.log`, `/tmp/ohara-goal-live-build/native-live.log` and `.xcresult`, `/tmp/ohara-goal-live-cleanup.log`.

## Still out of scope

- Admission for existing accounts. It stays a separate compatibility step: keep desktop readers working, check calendar expiry and the Vault/embedding side effects, then widen admission.
- Operation lookup/close/discovery for child writes (TD-002).
- Momentum refresh after child writes (TD-004).
- Moving desktop Milestone writes onto work-v1 (TD-005).
