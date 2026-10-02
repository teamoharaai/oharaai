# Echo canonical mirror (Migration 086): production deploy and live run, 2026-10-02

Justin approved the 086 deploy sequence (commits, preflight, apply, record, push) in session 022, then the live run across two sessions: two failed attempts in session 022, completed in session 023.

## Deploy (session 022)

| Step | Result |
| --- | --- |
| Preflight 086 | PASS. History 001–085; probes 072, 074–078 and 080–086 passed; txn 21712 aborted |
| `--apply` 086 | PASS. txn 21809 committed; existing rows unchanged (`goal_events` included, `added_echo_entry_events` 0); history 001–086; PostgREST notified |
| Backend push | `150770d..2614baf`; Vercel production deployment `CAajMzh8YdrDitrbi6MpBawBQ6t1` succeeded; Database chain green |
| 086 pre-check | 26 Echo entries, 0 without a canonical Entry, 0 Goal links to add (backlog copy a no-op), 0 copies edited in the library, 1 canonical copy with a Goal link Echo doesn't show (kept; B4a/B10) |

## Live run

The same procedure as `goal-work-desktop-e2e-verification-2026-09-29.md` ("Repeating"), extended with the new `echo` step (new in 086; drives desktop's Echo capture/edit/move/delete routes against the deployed site, needs a Goal the native tests leave).

### Attempt 1 — `live-20261002-ca12637d` (session 022): failed

| Step | Result |
| --- | --- |
| Provision | admission `true`, `verification_only true`, allowlist = owner only |
| Native tests | 4/4 passed on iPhone 17 (iOS 26.5) |
| `echo` | **Failed** at its first request: the script's capture draft sent `title: ''`; the Echo capture route requires a title, so nothing was written |
| Cleanup | Clean |

Fix: `85970b0` — the echo step's capture draft now sends a title.

### Attempt 2 — `live-20261002-f9ec0e72` (session 022): failed

| Step | Result |
| --- | --- |
| Provision | admission `true`, `verification_only true`, allowlist = owner only |
| Native tests | 4/4 passed on iPhone 17 (iOS 26.5) |
| `echo` | First attempt didn't run (`psql` not on `PATH`); rerun **passed** capture → canonical Entry + Goal link + event, and the library listed it `echoOwned`; then **failed** "the library edit is refused with ECHO_OWNED": got 400 `Expected content version is required` — the edit draft lacked `expectedContentVersion`, so `save_entry_v2` refused it before the ECHO_OWNED guard ran |
| Evidence before cleanup | entries 1, echo_entries 1, goal_events 4, operation_ledger 22 |
| Cleanup | Clean: all counts 0 after; admission closed |

Fix (this session): `ff5bc8b` — the library-edit draft now sends `expectedContentVersion: 1`.

### Attempt 3 — `live-20261002-7726c913` (session 023): passed

| Step | Result |
| --- | --- |
| Before | `enabled false`, `verification_only true`, allowlist 0, synthetic accounts 0 |
| Provision | owner `e9e63524-67cf-4b7d-b2ef-d6664bfcca81`, other `f83a5dd4-5462-4b75-bb3d-15ab6482ecf5`; admission `true`, `verification_only true`, allowlist = owner only |
| Native tests | 4/4 passed on iPhone 17 (iOS 26.5): `deployedReadAndRecoveryContracts` (6.1 s), `deployedCreationReplayRecoveryAndOwnerIsolation` (11.0 s), `deployedGoalCardAndWorkLifecycle` (17.1 s), `deployedOperationLedgerLookupCloseAndRecovery` (28.6 s) |
| `echo` | **PASS, all 12 assertions**: capture through `POST /api/entries`; the capture wrote its canonical Entry, Goal link and event; the library lists it `echoOwned`; the library edit is refused with `ECHO_OWNED`; the library delete is refused with `ECHO_OWNED`; edit through `PATCH /api/entries/:id`; the edit reached the canonical Entry; a General capture has a canonical Entry and no Goal; move through `PATCH /api/entries/:id/move`; the move removed the Goal link and its event; delete through `DELETE /api/entries/:id` removed the canonical Entry (both the Goal capture and the General capture) |
| Evidence before cleanup | auth_users 2, profiles 2, goals 4, tasks 5, milestones 3, entries 0, echo_entries 0, goal_events 3, operation_ledger 22, allowlisted 1 (`entries`/`echo_entries` are 0 here because the `echo` step's own deletes already removed both captures) |
| Cleanup | both synthetic accounts deleted; private `.xctestrun` removed; all counts 0 after; admission closed, allowlist empty |

Every Echo route the design names was exercised end to end on production: capture mirrors to a canonical Entry/Goal link/event; a library edit or delete of an Echo-owned Entry is refused with `ECHO_OWNED` (desktop keeps editing/deleting through Echo); an Echo edit reaches the canonical copy; a General (no-Goal) capture mirrors with no Goal link; a move removes the mirrored Goal link and its event; an Echo delete removes the canonical Entry.

Local evidence: `/tmp/ohara-goal-live-build/dd` (build), provision/live-test/echo/cleanup console output captured in this session's transcript.

## Next

TD-005 phase b: the `milestone_work_v1`/`activity_window_v1` per-account flag, desktop Milestone writes and Goal create/clone through `work-v1`, and the `activity-window` → `goal_activity_v1` switch now that D4's gate (legacy-only = 0) looks met at 086.
