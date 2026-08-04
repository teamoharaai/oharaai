# Momentum Phase 1 Implementation Report

Date: 2026-08-03

Algorithm version: `momentum-v1.0`

Status: integrity remediation complete; ready for development/staging review, not deployed

## Executive result

The two release-blocking integrity defects are corrected:

1. An authenticated browser can no longer choose or publish Momentum score, aggregates, hash, reasons, revision, event diagnostics, baseline, or another user's identity. The authenticated API verifies the bearer token, reads canonical owner-scoped records, runs the deterministic engine, creates the SHA-256 hash and reason codes, and uses a server-only service-role client for persistence.
2. Planned-action completion now begins with one normalized eligible action set. The denominator is the number of planned-eligible action IDs; the numerator is the intersection of those IDs with authoritative completion-eligible records. A runtime invariant enforces `0 <= completedEligibleActions <= eligiblePlannedActions`.

Migration 038 was applied only to an isolated local Supabase/PostgreSQL 15 stack at `127.0.0.1`. The final migration also passed a disposable PostgreSQL 16 harness bound to a private Unix socket. No shared, preview, staging, or production project was contacted or changed.

## Original defects and root causes

### Caller-controlled authoritative results

The original security-definer RPC was executable by `authenticated` and accepted every derived result as an argument. Ownership via `auth.uid()` prevented cross-user writes but did not prevent a user from fabricating their own Momentum history.

Root cause: authentication was treated as calculation authority. The database stored supplied outputs without a trusted calculation boundary.

### Inconsistent planned-action evidence

The original denominator counted due-dated actions in the completed local week while the numerator counted every completion in that week. An undated, differently dated, or unrelated completion could therefore inflate planned-action completion.

Root cause: normalization did not retain per-action planning eligibility, so aggregation could not intersect completed action IDs with the denominator set.

## Corrected trust boundary

```text
Browser GET /api/momentum
  -> bearer-token verification
  -> authenticated owner-scoped Supabase reader
  -> canonical profile / goal / action reads
  -> deterministic normalizer and engine
  -> trusted SHA-256 hash + reason codes
  -> server-only service-role publisher
  -> immutable owner-readable snapshot
  -> safe Home summary / optional diagnostic
```

- `app/api/momentum/index+api.ts` accepts no authoritative calculation input. Query parameters requesting diagnostics affect response detail only.
- `createAuthedClient(accessToken)` performs canonical reads under the user's RLS identity.
- `createServiceRoleClient()` exists only in the server route and is not exported to client code.
- `getMomentumHomeSummary(readDb, writeDb, userId)` keeps the authenticated read capability separate from the trusted write capability.
- `publish_momentum_snapshot` requires `auth.role() = 'service_role'`, accepts the already authenticated user ID only from trusted server code, and is granted solely to `service_role`.
- `anon` and `authenticated` have no function execution privilege and no insert/update/delete privilege on Momentum tables.
- RLS permits owner-only reads. Cross-user reads return no rows.
- A database trigger rejects direct update or delete of weekly snapshots even for a trusted role. Recalculation creates a new superseding revision.
- The security-definer function uses the fixed search path `pg_catalog, public`.

The service-role credential remains server-only in `SUPABASE_SERVICE_ROLE_KEY`; no `EXPO_PUBLIC_*` variable contains it.

## Canonical action eligibility

`normalizeActionRecords` records planning and completion eligibility independently for every canonical action.

An action is planned-eligible only when it has:

- the expected user owner;
- a goal and owner-compatible relation;
- a currently scoreable Phase 1 goal status (`active`, `complete`, or `stagnant`);
- a valid due date inside the completed Monday-Sunday local week;
- a valid creation timestamp before the end of that week.

An action is completion-eligible only when it has:

- the expected user owner and a scoreable goal;
- `status = complete`;
- valid creation and completion timestamps, with completion not preceding creation;
- a completion instant inside the completed week's UTC boundary derived from the user's timezone.

Aggregation then computes:

```text
eligibleIds = planned-eligible action IDs
completedIds = completion-eligible action IDs
denominator = size(eligibleIds)
numerator = size(eligibleIds intersection completedIds)
```

Duplicate canonical action IDs are deterministically excluded. A completion outside the denominator can still be a real task/active-day signal, but it cannot count as a completed planned action. Notes, reflections, milestones, generic activity, unsupported statuses, cross-user records, and out-of-period completions are not task completions.

## Determinism, idempotency, and diagnostics

- Inputs are normalized into stable ID order with explicit eligibility and exclusion reasons.
- Local weeks are Monday through Sunday in the profile's IANA timezone; UTC query bounds preserve DST transitions.
- The stable recursively key-sorted hash input includes calculation version/config, boundary, normalized input actions/events, pillars, aggregates, baseline, and result.
- SHA-256 is calculated by trusted server code and cannot be supplied by an authenticated request.
- `(user_id, week_start, algorithm_version, calculation_hash)` prevents duplicate revisions.
- Identical replay returns the existing snapshot and hash.
- Changed canonical input creates the next immutable revision with `supersedes_snapshot_id`.
- Profile row locking and baseline checks reject stale calculations.
- Diagnostics retain included/excluded events, normalized actions, aggregates, version, hash, result, and reason codes without storing action, goal, note, or reflection text.

## Migration 038 safety review

| Area | Final finding |
| --- | --- |
| Additive/destructive | Adds three Momentum tables, two indexes, RLS policies, an immutable-snapshot trigger, and publication functions. It does not drop or alter existing application tables or data. |
| Foreign keys | All Momentum rows reference `profiles(id)` with cascade-on-account-delete; snapshot supersession is self-referential. |
| Uniqueness | Event deduplication, revision uniqueness, and calculation-hash uniqueness are enforced. |
| Snapshot history | Direct mutation is rejected; changed input inserts a superseding revision and preserves earlier rows. |
| Version/hash/reasons | Version, hash, inputs, aggregates, pillars, weights, and reason codes are persisted per revision. |
| Constraints | Nonnegative values, GQS range, difficulty/gain/drag bounds, Monday start, six-day week end, valid IANA timezone, SHA-256 format, and diagnostic JSON shapes are validated. |
| Ownership/RLS | Owner-only selects; no client DML policies; explicit client DML revokes. |
| RPC grants | `PUBLIC`, `anon`, and `authenticated` revoked; `service_role` only. Runtime role check provides defense in depth. |
| Function security | `SECURITY DEFINER` with fixed `pg_catalog, public` search path. |
| Stale baseline | The profile is locked and both initial and recalculation baselines are checked. |
| Rollback/superseding | Corrections use immutable superseding revisions. A future rollback requires a separately reviewed migration; no down migration was added. |

## Local environment architecture

- `.env.local` is git-ignored and was created without changing the existing remote `.env`.
- `.env.local.example` contains only safe placeholders and the standard loopback URL.
- `scripts/momentum-local-target.mjs` accepts only HTTP loopback hostnames on port `54321` and checks local key presence.
- Local wrappers never accept a project reference or database URL; reset always uses `supabase db reset --local`.
- `supabase/config.toml` defines API `54321`, database `54322`, Studio `54323`, and PostgreSQL 15, the version supported by Supabase CLI 2.111.
- `scripts/test-momentum-security.sh` creates a separate PostgreSQL 16 cluster with TCP disabled and deletes it on exit.
- Date-sensitive fixtures are created by `scripts/momentum-local.integration.mjs`, not static seed data.

Follow-up migration-chain repair on 2026-08-03 corrected the squashed-baseline ordering and pgvector typmod defects and added explicit forward table privileges in Migration 039. Three empty local replays now apply the full chain, including unchanged Migration 038, and the final two catalog fingerprints match. See `docs/SUPABASE_MIGRATION_CHAIN_REPAIR.md`.

## Local validation scenarios

All records below were controlled localhost fixtures using real local Supabase Auth and PostgREST.

| Scenario | Result |
| --- | --- |
| Empty account | Passed: tasks `0`, streak `0`, current value `0`; no fabricated values. |
| Current-week task | Passed: one authoritative completion produced tasks `1`. |
| Duplicate event | Passed: duplicate source ID was rejected; normalized duplicates are also deterministically excluded. |
| Previous-week task | Passed: did not increase the current-week count. |
| Consecutive weeks | Passed: current plus two preceding active weeks produced streak `3`. |
| Gap week | Passed: current week plus a two-weeks-old event with a missing intervening week produced streak `1`. |
| Local timezone | Passed: `Pacific/Kiritimati` instants on opposite sides of local Monday were assigned to different weeks; current tasks `1`, streak `2`. |
| Identical recalculation | Passed: same hash/output/reasons and no additional revision. |
| Late-arriving event | Passed: changed hash created revision `3`, linked to revision `2`; revision `1` remained reproducible. |
| Cross-user security | Passed: another authenticated user read zero owner rows. |

Adversarial validation also passed:

- forged score/hash/reason query parameters were ignored by the actual API;
- authenticated RPC execution with a fake score, hash, reasons, and another user ID failed;
- direct authenticated insert, update, and delete failed;
- direct trusted-role snapshot update/delete failed through the immutability trigger;
- unrelated and outside-denominator completions did not inflate the numerator;
- the direct numerator invariant rejects an impossible aggregate.

## Sanitized local API example

`GET http://127.0.0.1:8092/api/momentum?diagnostics=1` with a local bearer token returned:

```json
{
  "algorithmVersion": "momentum-v1.0",
  "currentValue": 4.5192,
  "status": "Building",
  "tasksCompletedThisWeek": 1,
  "weeklyChange": 4.5192,
  "weeklyStreak": 3,
  "diagnostic": {
    "calculationVersion": "momentum-v1.0",
    "includedEvents": 3,
    "excludedEvents": 0,
    "reasonCodes": ["CONSISTENCY_HIGH", "GOAL_PROGRESS"]
  }
}
```

No user ID, token, key, action text, goal text, or calculation hash is included in this example. A request without a bearer token returned `401`. The authenticated forged query values did not replace the trusted result.

## Home verification

The authenticated local browser rendered the active Home Momentum preview with:

- `Building`;
- displayed value `5`;
- `+4.52 this week`;
- `Weekly Streak 3`;
- `Tasks Completed 1 This Week`.

`Momentum unavailable` was absent and the browser console contained no errors. The card's existing structure and navigation were not redesigned in this remediation.

The follow-up full-chain browser run supplied the complete repository schema. Home rendered the same authoritative Momentum values without missing-schema background errors or browser console errors.

## Validation commands and results

| Command/check | Result |
| --- | --- |
| `npm run test:momentum` | Passed: 29 tests. |
| `npm run test:momentum:db` | Passed on disposable PostgreSQL 16, including role grants, RLS, idempotency, supersession, event deduplication, and immutable snapshots. |
| `npm run test:momentum:local` | Passed: 10 local scenarios and 5 explicit security assertions on Supabase/PostgreSQL 15. |
| `npm run test:momentum:api` | Passed: authenticated real response, forged query ignored, unauthenticated `401`. |
| `npx tsc --noEmit --types node,react` | Passed. |
| Browser Home inspection | Passed; real metrics visible and zero console errors. |
| `npx expo export --platform web --output-dir <temporary-output-dir>` | Passed; 50 API routes bundled, including `/api/momentum/index`. |
| `git diff --check` | Passed after final documentation updates. |

No lint script is configured. Bare `npx tsc --noEmit` remains blocked before source checking by pre-existing malformed duplicate ambient directories such as `node_modules/@types/react 3`, `node_modules/@types/node 3`, and `node_modules/@types/babel__core 3`; no dependency cleanup was attempted.

## Readiness and remaining work

The two integrity release blockers are resolved, and Phase 1 is ready for development/staging **review**. It has not been approved or applied to any shared environment.

The local fixture data remains disposable and can be recreated by the documented harness. Local services may be stopped with the guarded commands in `docs/MOMENTUM_LOCAL_DEVELOPMENT.md` after manual review.

Before a shared deployment:

1. review Migration 038 and the server-only service credential boundary;
2. resolve or explicitly accept the open product decisions in `MOMENTUM_OPEN_DECISIONS.md` that affect rollout;
3. review the migration-chain repair and explicit Migration 039 privilege matrix in staging;
4. choose scheduled/queue-backed calculation ownership and recalculation governance; the current Home read performs an idempotent lazy publication for the most recently completed week;
5. add operational monitoring, rollback, retention, and feature-flag controls.

Later Momentum phases may add milestone, goal-delta, reflection, Initiative, and Resilience inputs only under an explicit version and approved policies. The full Momentum workspace remains outside Phase 1.
