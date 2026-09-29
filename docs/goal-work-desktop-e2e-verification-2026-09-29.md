# goal_work_v1 for desktop (Migration 081): production deploy and live run, 2026-09-29

Justin approved each step: the preflight, the apply and the push one by one, then the live run and the native push as the rest of the planned sequence.

## Deploy

| Step | Result |
| --- | --- |
| Preflight 081 | PASS. History 001–080; probes 072–078, 080 and 081 passed; txn 19941 aborted |
| Storage grant (TD-005 B9) | Works on hosted: the executor has `usage` on `storage` and `select` on `storage.objects` (owner `supabase_storage_admin`); the probe's photo check answered `PHOTO_NOT_FOUND` |
| `--apply` 081 | PASS. txn 20027 committed; existing rows unchanged, `goal_events` (134 rows) included; history 001–081; PostgREST notified |
| Backend push | `4daa836..3cbaabf`; Vercel production deployment 6745919512 succeeded; Database chain green (first run on actions v7) |
| Native push | `95fbb1f..bdd4903` |

From this push, desktop's Task list (`fetchGoalTasks`), Today list (`fetchTodayTaskItems`) and Momentum make one `reconcile_my_tasks_v1` call instead of one `reconcile_task_occurrences_v1` per Task. Desktop Milestone writes are unchanged until TD-005 phase b.

## Live run

The same procedure as `goal-work-e2e-verification-2026-09-27.md` ("Repeating"), built from native `bdd4903`.

| Step | Result |
| --- | --- |
| Before | `enabled false`, `verification_only true`, allowlist 0, synthetic accounts 0 |
| Provision | owner `f13a0a9d-403a-48fe-8e0f-cc7be18d3ce6`, other `f0c4bca5-c705-4648-b46b-2fb3c20595b5` (run `live-20260929-47cbf57d`); admission `true`, `verification_only true`, allowlist = owner only |
| Live tests | 4/4 passed on iPhone 17 (iOS 26.5): `deployedReadAndRecoveryContracts` (5.5 s), `deployedCreationReplayRecoveryAndOwnerIsolation` (17.7 s), `deployedGoalCardAndWorkLifecycle` (29.2 s), `deployedOperationLedgerLookupCloseAndRecovery` (13.9 s) |
| Evidence before cleanup | auth users 2, profiles 2, goals 4, tasks 5, milestones 3, goal_events 3, operation_ledger 22, old stores 0, allowlisted 1 (identical to the 080 run) |
| Cleanup | admission `false`; both accounts deleted; private `.xctestrun` removed |
| After | all counts 0; `enabled false`, `verification_only true`, allowlist 0, synthetic accounts 0 |

The live tests exercise 081's replaced `goal_work_v1` body (Milestone create, step and complete) and decode Milestone responses that now carry `photoPath` and `isAiSuggested`. The new operations (delete, reorder, photo, evidence under a completed Milestone, batch reconcile) are covered end to end by the 081 probe, which ran on production inside the preflight and the apply.

Local evidence: `/tmp/s021-081-preflight.log`, `/tmp/s021-081-apply.log`, `/tmp/ohara-081-provision.log`, `/tmp/ohara-081-live-tests.log`, `/tmp/ohara-goal-live-build/native-live-081.xcresult`, `/tmp/ohara-081-cleanup.log`.

## Next

TD-005 Migration 082 (Echo → canonical mirror, B3/B4/B10, with native B5), then phase b (desktop Milestone writes behind the per-account flag, B6).
