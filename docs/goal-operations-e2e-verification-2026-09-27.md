# Goal operation ledger end-to-end verification — 2026-09-27

**Passed: native Swift → deployed www.oharaai.com API → production Supabase (`rrgiqemscnyaqkculnmb`)** for `/api/goals/operations-v1` and the three v1 Goal routes now backed by Migration 078's `goal_private.operation_ledger`. This is the gate for pushing the native TD-002 journal and restart recovery. General new-Goal admission stays closed.

Every production step was approved by Justin beforehand. The preflight, apply, push and route probe were approved one by one; provision, run and cleanup were approved as one planned sequence.

## Deployed before the run

- **Migration 078** applied with `scripts/test-manual-goal-hosted.mjs --applied-through 077 --apply`: transaction 18478 committed, existing rows unchanged, history 001–078. Preflight transaction 18423 was aborted first. pg_cron 1.6.4 was already available on hosted; the job `goal-operation-retention` (`17 3 * * *`) is active.
- **Route:** `498e85b` pushed to `main`. Vercel `Production` deployment 6699639088 reached `success`; Database chain CI run 36360127221 is green in both legs.
- **Unauthenticated probe:** `GET /api/goals/card-v1`, `/work-v1` and `/operations-v1?action=discover` each returned `HTTP/2 401`, `cache-control: private, no-store`, `{"ok":false,"error":{"code":"UNAUTHORIZED"}}` (iad1). That confirms the `8468a65` fix is live too.

## Procedure

The same as `goal-work-e2e-verification-2026-09-27.md`: `scripts/goal-live-verification.mjs provision`, `xcodebuild test-without-building -only-testing:OharaAITests/ManualGoalLiveIntegrationTests`, then `cleanup`.

One change first: cleanup's evidence and "nothing remains" counts now include **`goal_private.operation_ledger`**. After 078 every protocol writes the ledger and the three old stores stay empty, so without it the check would have skipped every receipt this run wrote.

## Output

| Step | Result |
| --- | --- |
| Before | `enabled false`, `verification_only true`, allowlist 0, synthetic accounts 0 |
| Provision | owner `9b1be6d8-3b5a-416d-824c-defa2f762099`, other `92f98743-8639-416d-9536-b7e0deb47e9f` (run `live-20260928-2073ff42`); admission `true`, `verification_only true`, allowlist = owner only |
| Live tests | 4/4 passed on iPhone 17 (iOS 26.5): `deployedReadAndRecoveryContracts` (7.9 s), `deployedCreationReplayRecoveryAndOwnerIsolation` (11.5 s), `deployedGoalCardAndWorkLifecycle` (13.8 s), **`deployedOperationLedgerLookupCloseAndRecovery`** (45.6 s) |
| Evidence before cleanup | auth users 2, profiles 2, goals 4, tasks 5, milestones 3, **operation_ledger 22**, manual_operations 0, goal_mutations 0, work_mutations 0, allowlisted 1 |
| Cleanup | admission `false`; both accounts deleted; private `.xctestrun` removed |
| After | all counts 0, including the ledger; `enabled false`, `verification_only true`, allowlist 0, synthetic accounts 0 |

The 22 ledger rows match the tests exactly, and the three frozen stores received none:
- 2 Goal creates (`deployedCreationReplayRecoveryAndOwnerIsolation`);
- 14 in `deployedGoalCardAndWorkLifecycle`: 1 Goal create, 6 Task writes, 1 replay-test create, 5 Milestone writes, and 1 row under the other account for its refused write (operation IDs are per owner);
- 6 in `deployedOperationLedgerLookupCloseAndRecovery`: 1 Goal create, the looked-up Task create, the close tombstone (the delayed create under it added no row), the store's journaled create, the Milestone that "landed" before the restart, and the tombstone recovery wrote for the never-sent record.

## What `deployedOperationLedgerLookupCloseAndRecovery` proves

It uses the real Supabase Swift SDK, `OharaAPIClient`, `SupabaseGoalDataSource` and `GoalCardStore`:

- **Lookup:** a committed `task.create` has protocol `goal.work`, type `task.create`, `entityId` = the Task and `goalId` = the Goal, and is unacknowledged.
- **Discover and ack:** discover (all pages) lists it. After an ack with the receipt's revision it is no longer listed, and lookup shows it acknowledged. This write was sent through the data source directly, because the store acknowledges confirmed writes in the background.
- **Close fences a delayed request:** close on a fresh ID returns `not_committed`/`closed_by_owner`. A Task create sent later under that ID returns `not_committed`/`closed_by_owner` with type `task.create`, and no Task is created.
- **Restart recovery**, with two `GoalCardStore` instances sharing one `MemoryGoalOperationJournal`:
  - a normal save through the first store leaves the journal empty;
  - (a) a journaled Task create that was never sent is looked up (`HISTORY_UNAVAILABLE`), closed, and shown as "An earlier change wasn’t saved"; lookup then shows it `not_committed`/`closed_by_owner`;
  - (b) a Milestone create that committed before the "restart" is cleared without a message;
  - both records leave the journal, and nothing is resent: the Task count is unchanged and the Milestone exists exactly once.
- **Owner isolation:** the other account's lookup of the owner's operation returns `HISTORY_UNAVAILABLE`.

## Repeating

As in the 2026-09-27 work-v1 record. Run cleanup even when the tests fail.

Local evidence: `/tmp/ohara-078-preflight.log`, `/tmp/ohara-078-apply.log`, `/tmp/ohara-078-provision.log`, `/tmp/ohara-078-live-tests.log`, `/tmp/ohara-goal-live-build/native-live-078.xcresult`, `/tmp/ohara-078-cleanup.log`.

## Still out of scope

- Admission for existing accounts (unchanged; a separate rollout).
- Dropping the three frozen receipt tables and the old v1 status actions: a later migration, after 30 days in production.
- Momentum refresh after child writes (TD-004).
- Moving desktop Milestone writes onto work-v1 (TD-005).
