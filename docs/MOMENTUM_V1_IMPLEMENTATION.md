# OHARA Momentum Version 1.0 — Implementation Companion

Status: implemented and validated locally on 2026-08-13.

The canonical Product & Engineering specification is
[`OHARA_Momentum_V1_Implementation_Specification.docx`](./OHARA_Momentum_V1_Implementation_Specification.docx).
This companion records how that specification maps to the current repository. It does not replace or amend the canonical specification.

## Architecture

Momentum V1 retains the Phase 1 trust boundary:

```text
authenticated client
  -> authenticated read API
  -> trusted server service
  -> pure deterministic engines
  -> service-role-only publication RPCs
  -> immutable, versioned snapshots
  -> privacy-bounded response DTOs
```

The client never supplies scores, pillar/component values, hashes, reason codes, aggregate totals, or another user's identity. The authenticated Supabase client performs owner-scoped canonical reads; the service-role client is used only inside the server route to publish derived results.

The two authoritative metrics are intentionally distinct:

- **Goal Momentum** describes one active goal using Consistency, Progress, Reflection, and Initiative.
- **OHARA Momentum** describes collective movement across active goals using portfolio evidence. It is not an average of Goal Momentum and never weights goals by Goal Difficulty.

## Algorithms and versions

### Goal Momentum

```text
rawGM = 0.30 * Consistency
      + 0.30 * Progress
      + 0.20 * Reflection
      + 0.20 * Initiative

GM_t = previousGM == null
  ? rawGM
  : 0.60 * previousGM + 0.40 * rawGM
```

- Algorithm: `goal-momentum-v1.0`
- Range: precise decimal `0–100`; normal UI rounds only for display.
- Resilience is not a V1 pillar. Qualified return, adaptation, scope adjustment, and recovery evidence is bounded inside Initiative.
- Reflection coverage reaches its weekly maximum at two qualified goal-linked reflections. No prose-quality, sentiment, or AI judgment is used.
- True inactivity with nothing due pauses the score. Missed due commitments remain an active calculation.
- Structurally unavailable components are dynamically reweighted and recorded in `effective_weights`.

### OHARA Momentum

```text
rawOM = 0.50 * PortfolioProgress
      + 0.20 * MilestoneVelocity
      + 0.15 * GrowthCadence
      + 0.10 * SustainedGrowth
      + 0.05 * PortfolioCoverage

OM_t = previousOM == null
  ? rawOM
  : 0.65 * previousOM + 0.35 * rawOM
```

- Algorithm and configuration: `ohara-momentum-v1.0`
- Range: precise decimal `0–100`; normal UI rounds only for display.
- Planned commitment allocation is used when all eligible goals provide it; otherwise the deterministic fallback is equal weighting.
- A goal is capped at 40% where a portfolio has enough eligible goals for that constraint to be mathematically satisfiable, followed by renormalization.
- Goal Difficulty and category difficulty are never cross-goal weights.
- Reflection alone cannot create OHARA portfolio progress.
- Sustained Growth remains unavailable until at least four trailing movement weeks exist; the top-level formula records and reweights missing components.

## Goal Difficulty Profile

Goal Difficulty is deterministic, category-relative, and recalculated from a stable plan-revision hash.

```text
GDP = 0.25 * Effort
    + 0.20 * Duration
    + 0.15 * Frequency
    + 0.15 * Complexity
    + 0.15 * Magnitude
    + 0.10 * ExternalDependency
```

- Difficulty version: `difficulty-v1.0`
- Category configuration: `momentum-categories-v1.0`
- Bands: D1 `0–34`, D2 `35–59`, D3 `60–79`, D4 `80–100`.
- Missing dimensions are reweighted rather than guessed.
- The profile uses structured goal data only; AI is not imported or invoked by the engine or service.

The centralized category seeds in `features/momentum/config.ts` are:

| Category | Duration | Frequency | Effort | Milestones |
| --- | ---: | ---: | ---: | ---: |
| Health & Fitness | 12 weeks | 4/week | 45 min | 4 |
| Finance | 26 weeks | 2/week | 30 min | 4 |
| Career | 26 weeks | 3/week | 60 min | 5 |
| Creative | 16 weeks | 4/week | 60 min | 5 |
| Education | 16 weeks | 5/week | 60 min | 5 |
| Relationships | 12 weeks | 3/week | 30 min | 3 |
| Personal Growth | 12 weeks | 5/week | 20 min | 4 |

Goal modes and Progress sub-weights are also centralized: numeric target `55/25/20`, milestone project `25/55/20`, frequency routine `35/15/50`, maintenance `25/15/60`, and qualitative `20/45/35` for pace/milestones/evidence.

## Canonical data mapping

`features/momentum/services/momentum-service.ts` reads only owner-scoped canonical records:

- active `goals`, including category, plan dates, structured frequency, progress, and `smart_data`;
- `action_logs` for planned/due/completed task evidence;
- `milestones` for starts, due expectations, and completions;
- `trackers` and `tracker_logs` for routine and numeric observations;
- canonical `entries` joined through `entry_goal_links` for goal-linked reflections.

The normalizer deduplicates by stable source identity, validates ownership and active-goal eligibility, applies deterministic Monday–Sunday local-week boundaries, and stably orders events before hashing. Raw reflection text is used only inside the trusted service to apply the deterministic qualification rule and is never returned in Momentum responses or persisted in the V1 snapshot payload.

Some canonical V1 event families do not yet have dedicated structured product fields in the current schema. Obstacle identification, explicit intention, explicit plan adaptation/scope adjustment, and recovery-action counters therefore remain zero rather than being inferred from prose. A return after disruption is recognized only when the current canonical commitments establish a qualifying disruption and subsequent progress evidence exists. Adding first-class structured capture for the remaining event families is a future product-data task, not an AI inference task.

## Persistence and migrations

Historical Migration 038 and Phase 1 records remain unchanged and reproducible. The old equation is isolated in `features/momentum/legacy-phase1.ts`; it is not imported by a V1 production path.

### Migration 040

`supabase/migrations/040_momentum_v1.sql` adds:

- bounded OHARA V1 metadata to existing `momentum_profiles` and `momentum_weekly_snapshots`;
- `goal_difficulty_profiles`;
- `goal_momentum_profiles`;
- `goal_momentum_weekly_snapshots`;
- owner-select RLS and explicit client mutation revokes;
- immutable Goal Momentum snapshot enforcement;
- service-role-only Goal and OHARA V1 publication RPCs;
- calculation-hash idempotency, superseding revisions, owner validation, version metadata, and earlier-snapshot baseline checks.

### Migration 041

`supabase/migrations/041_momentum_v1_recalculation_baseline.sql` supersedes only the OHARA V1 publication RPC after local validation exposed a first-week recalculation edge case. A same-week recalculation now compares with the stored first-week baseline (`0` in the legacy non-null column), while a new week still validates against the latest earlier V1 snapshot. Migration 040 had already been applied locally, so the correction is additive rather than a rewrite of applied history.

Unchanged inputs return the existing snapshot. Changed canonical inputs create a new immutable revision linked by `supersedes_snapshot_id`. Goal Difficulty records are immutable per plan revision/configuration. V1 history selectors include only the latest revision for each V1 week and never mix Phase 1 values into a V1 chart.

No hosted database migration was applied during implementation.

## API contracts

- `GET /api/momentum` returns authoritative OHARA Momentum plus V1 history, component values, effective state, calm reason messages, current-week task count, weekly streak, and the already-derived Goal Momentum summaries used by shared product surfaces.
- `GET /api/momentum/goals/:goalId` returns the owner-visible Goal Momentum summary for one active goal. Unknown, inactive, or non-owned IDs return `404` without exposing another user's data.
- `?diagnostics=1` adds privacy-safe normalized diagnostics for internal reproduction. It does not expose reflection text.

Both routes authenticate with `withAuth`, create an owner-bound read client, and keep publication behind the server-only service-role client. Query parameters cannot override identity, scores, hashes, or reason codes.

`useMomentumHomeSummary` is the shared client read/cache. It deduplicates simultaneous requests and scopes cached results to the authenticated user ID so values cannot persist across an account change. `useGoalMomentumSummary` selects a per-goal summary from that same authoritative response without independently recalculating or parsing scores.

## Site-wide integration inventory

| Surface | Metric | Integration |
| --- | --- | --- |
| Home Momentum card | OHARA Momentum | V1 value/status/change/history from `/api/momentum`; chart fixed to `0–100`. |
| Home expanded Momentum modal | OHARA Momentum | Same authoritative summary and V1-only history. |
| Full Momentum overview | OHARA Momentum | V1 value, components, reason codes, and V1-only snapshots; no sample trend. |
| Full Momentum Goal section | Goal Momentum | One authoritative V1 Goal card/history per active goal. |
| Canonical Goals workspace analytics | Goal Momentum | Selected goal's score, status, V1 history, and reason. Progress remains explicitly distinct. |
| Expanded Home standalone-goal analysis | Goal Momentum | Shared authoritative Goal Momentum card. |
| Goal-linked analysis card component | Goal Momentum | Shared loading, active/building/paused/limited, unavailable, and error handling. |

The public unauthenticated landing page retains a clearly labeled product preview illustration. It is not an authenticated production-data surface and does not claim to display the visitor's score.

## Status and explanation behavior

Supported UI states are loading, building, active, paused, limited, zero, unavailable, and error. Values are never silently fabricated. Reason codes are translated to evidence-based copy such as “Your progress matched the pace of this goal” and “Momentum is paused until there is enough new activity to evaluate.”

## Validation commands

```bash
npm run test:momentum
npm run test:momentum:db
OHARA_LOCAL_ENV_PATH=/private/tmp/<local-env> npm run test:momentum:local
OHARA_LOCAL_ENV_PATH=/private/tmp/<local-env> \
  OHARA_LOCAL_WEB_ORIGIN=http://127.0.0.1:<port> \
  OHARA_MOMENTUM_FIXTURE_EMAIL=<generated-local-fixture> \
  npm run test:momentum:api
npx tsc --noEmit --types node,react
npx expo export --platform web --output-dir /private/tmp/<export-dir>
git diff --check
```

The local integration runner verifies the target is exactly `http://127.0.0.1:54321`, provisions unique non-destructive test users, derives fixture timestamps relative to the execution week, and covers ten calculation/data scenarios plus five adversarial assertions. The database harness creates a disposable PostgreSQL cluster under `/tmp`, applies the Phase 1 and V1 migrations, and checks both generations of trusted publication/RLS behavior.

Final local validation passed 53 Momentum source tests, 16 affected Goal/Dashboard tests, 13 Entries tests, the disposable database harness, the ten-scenario/five-adversarial integration harness, authenticated and unauthenticated API smoke checks, the known-valid TypeScript check, `git diff --check`, and a web export containing 51 API routes. Authenticated browser review in light and dark verified Home OHARA Momentum, its expanded chart, the full Momentum workspace, and the selected Goal workspace against the same local authoritative fixture.

## Calibration and follow-up

The category seed references, `0.40` Goal smoothing alpha, `0.35` OHARA smoothing alpha, Reflection cap `2`, Initiative cap `2.5`, minimum Sustained Growth history `4`, and portfolio cap `0.40` are explicit V1 calibration constants. Change them only through a new versioned algorithm/configuration with new test expectations; never silently reinterpret stored snapshots.

Before deploying to a hosted environment:

1. Review and approve migrations 040–041.
2. Apply them through the established hosted-development migration procedure.
3. Run authenticated API and browser checks against that environment.
4. Calibrate distributions by category and goal mode without optimizing for higher scores or engagement.
5. Add structured capture for remaining Initiative event families before awarding those units; do not infer them from private prose.
