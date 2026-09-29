# Goal events (Migration 080): production deploy and live run, 2026-09-28/29

Every production step was approved by Justin beforehand. The preflight, apply and push were approved one by one; provision, run and cleanup were approved as one planned sequence.

## Deploy

| Step | Result |
| --- | --- |
| Preflight 080 | PASS. History 001–079; probes 072, 074–078 and 080 passed; txn 19009 aborted |
| Backfill (preflight facts) | `entry_created` note 2 events / 2 Goals, reflection 25 / 17; `milestone_completed` 19 / 12; `task_completed` 83 / 22 |
| Legacy-only Echo goal links | 0 (0 Goals, 0 without a canonical entry) |
| `--apply` 080 | PASS. txn 19075 committed; existing rows unchanged; history 001–080; PostgREST notified |
| Backend push | `0587f9b..9fa9914`; Vercel production deployment 6722945035 succeeded; Database chain green |

## Live run

The same procedure as `goal-work-e2e-verification-2026-09-27.md` ("Repeating"). Cleanup counts `goal_private.goal_events` (added in `8941021`).

| Step | Result |
| --- | --- |
| Before | `enabled false`, `verification_only true`, allowlist 0, synthetic accounts 0 |
| Provision | owner `4c3827a2-b64c-417c-9e25-e8f633a3bc7d`, other `ebdaebad-e82e-4176-82a0-1f0466d31c81` (run `live-20260929-ae70f7b1`); admission `true`, `verification_only true`, allowlist = owner only |
| Live tests | 4/4 passed on iPhone 17 (iOS 26.5), native `b106446`: `deployedReadAndRecoveryContracts` (5.6 s), `deployedCreationReplayRecoveryAndOwnerIsolation` (11.8 s), `deployedGoalCardAndWorkLifecycle` (12.9 s), `deployedOperationLedgerLookupCloseAndRecovery` (13.2 s) |
| Evidence before cleanup | auth users 2, profiles 2, goals 4, tasks 5, milestones 3, **goal_events 3**, operation_ledger 22, manual_operations 0, goal_mutations 0, work_mutations 0, allowlisted 1 |
| Cleanup | admission `false`; both accounts deleted; private `.xctestrun` removed |
| After | all counts 0, including `goal_events`; `enabled false`, `verification_only true`, allowlist 0, synthetic accounts 0 |

The 3 events fit the lifecycle test: one daily Task occurrence completed (the reschedule keeps it), plus a Milestone step and its parent completed. The quantity Task was only adjusted and then archived, so it has no event. Cleanup doesn't split the count by kind, so that breakdown is inferred from the test, not measured.

Local evidence: `/tmp/s021-hosted-preflight.log`, `/tmp/s021-hosted-apply.log`, `/tmp/ohara-080-provision.log`, `/tmp/ohara-080-live-tests.log`, `/tmp/ohara-goal-live-build/native-live-080.xcresult`, `/tmp/ohara-080-cleanup.log`.

## Still out of scope

- The desktop `activity-window` switch (TD-004 A7): TD-005 phase b, behind its D4 gate.
- Momentum onto events (TD-004b).
- Dropping the frozen receipt tables (from about 2026-10-27).
