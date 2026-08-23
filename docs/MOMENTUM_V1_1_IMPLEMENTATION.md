# Momentum Version 1.1

Momentum Version 1.1 makes the current local week visible immediately while preserving the immutable weekly record introduced in V1.0.

Algorithms:

- `goal-momentum-v1.1`
- `ohara-momentum-v1.1`

The Goal Momentum 30/30/20/20 pillar weights, OHARA Momentum 50/20/15/10/5 component weights, smoothing constants, Goal Difficulty model, category configuration, ownership checks, and event normalization rules are unchanged.

## Period model

Every result explicitly identifies its period state:

- `closed`: an authoritative completed local week stored in the immutable snapshot tables.
- `provisional`: the open local week, calculated from canonical source data when `/api/momentum` is requested and never written to the historical snapshot tables.

The authenticated request first ensures the immediately preceding local week has one authoritative closed OHARA snapshot. If it does not, the service calculates and publishes that completed week through the existing trusted publishers. It then calculates the current week in memory and returns it as provisional.

Historical responses retain the algorithm version recorded on each snapshot. V1.0 rows are neither rewritten nor relabelled.

## Baseline and determinism

A provisional score always starts from the latest closed snapshot for the same score family before the current week, across the V1.0/V1.1 version boundary. It never starts from an earlier provisional response. Legacy pre-OHARA `momentum-v1.0` foundation rows remain stored but are not mistaken for `ohara-momentum-v*` baselines.

Consequences:

- identical canonical input and `asOf` eligibility produce identical results;
- repeated requests do not compound smoothing;
- current-week changes can alter the provisional result;
- the final provisional calculation equals the closed calculation when boundary, baseline, and canonical inputs are identical.

The V1.1 publisher migration also validates a new closed V1.1 snapshot against the latest earlier closed score regardless of that earlier snapshot's algorithm version. This permits an honest V1.0-to-V1.1 transition without weakening immutability.

## Current-week evidence

The provisional calculation reads the existing canonical Goal sources for the current local week:

- action/task completions and commitments whose local due date has arrived;
- milestone completions, including an overdue milestone missed in an older closed week but completed now;
- tracker/progress logs and current Goal progress evidence;
- qualified goal-linked Reflections, using the canonical completion timestamp when present (editor autosave time is not treated as a new Reflection occurrence);
- existing deterministic Initiative signals such as a milestone start, plan adaptation, scope adjustment, next step, weekly intention, and supported recovery/return evidence.

An overdue milestone's completion is new current-week Progress evidence. It does not revise the older week in which it was missed.

Future and still-open date-only commitments are excluded with `DUE_NOT_REACHED` through their local due date. A completed commitment can count immediately; an uncompleted date-only commitment can affect Consistency beginning the following local day. Closed-week calculation includes the full final day.

## Refresh behavior

The client requests a best-effort recalculation after a successful meaningful persistence operation:

- completing a tracker from Home or Goal detail;
- completing a Home action;
- adding, changing, or completing a milestone;
- changing Goal progress, status, or deadline;
- creating or updating a qualified completed Reflection with at least one Goal link;
- completing a Notes V1 Goal progress anchor (only the incomplete-to-complete transition refreshes).

The write remains authoritative. Refresh failure does not roll back or report failure for a successful Goal, action, tracker, milestone, or Reflection mutation. Note autosave and incomplete or unlinked Reflection drafts do not trigger Momentum refresh requests. Subsequent editor autosaves also do not revalidate an already-qualified unchanged Reflection; qualification, Goal-link, weekly-review type, and eligible-entry deletion transitions do.

The shared authenticated cache coalesces an in-flight request and forces one follow-up calculation when a meaningful write arrives during it.

## Status semantics

- `active`: sufficient current-week evidence or due commitments produced a calculable score.
- `paused`: a closed baseline exists, but the current week has no eligible activity and no currently missed commitment. The established score and a zero weekly change are retained.
- `building`: no established closed score exists and there is not yet enough evidence to establish one.
- `limited`: a valid score exists while one or more components cannot be evaluated; available components are reweighted deterministically.
- `unavailable`: reserved for an HTTP, canonical data read, publication, or calculation failure. It is not a successful engine state returned for inactivity.

## API contract

The existing authenticated endpoints remain stable:

- `GET /api/momentum`
- `GET /api/momentum/goals/:goalId`

The returned top-level summary and each Goal summary now include explicit period metadata:

```ts
{
  currentValue: number | null,
  displayedValue: number | null,
  weeklyChange: number,
  status: 'active' | 'paused' | 'building' | 'limited' | 'unavailable',
  periodState: 'provisional' | 'closed',
  asOf: string,
  weekStart: string,
  weekEnd: string,
  algorithmVersion: string,
  history: Array<{
    periodState: 'closed' | 'provisional',
    algorithmVersion: string,
    periodStart: string,
    periodEnd: string,
    value: number
  }>
}
```

Authenticated `?diagnostics=1` output additionally identifies calculation scope, baseline snapshot ID, baseline score, safe normalized aggregate counts, component availability, boundary, status, and algorithm version. It does not expose raw Reflection text or credentials.

HTTP failures map to unavailable/error UI. HTTP 200 responses preserve active, paused, building, and limited states as valid summaries.

## Graph and interface behavior

The graph combines immutable closed history with one in-memory current-week point marked `provisional`. The current point is labelled “This week”; historical points retain `closed` metadata and their recorded algorithm version. Range controls select real historical periods plus the current provisional point and do not relabel V1.0 history.

The Home Momentum card, full Momentum page, expanded Momentum view, Goal Momentum card, and Goal Analytics surface use the same shared V1.1 summary and show current-week/provisional metadata. “This Week” therefore means the current local week, not the last completed week.

## Week close

On the first authenticated calculation after a local week has ended:

1. The service checks for an existing authoritative OHARA snapshot for that week.
2. If absent, it reads that completed week's canonical inputs.
3. It calculates Goal results from each Goal's latest earlier closed baseline and publishes immutable Goal snapshots.
4. It calculates and publishes the immutable OHARA snapshot from the closed Goal results.
5. It begins the new provisional week from those closed values.

Publisher hashes make identical closure requests idempotent. Existing immutable triggers, RLS, service-role-only execution, and user ownership rules remain in force.

## Migration

Migration `043_momentum_v1_1_cross_version_baseline.sql` replaces only the two trusted V1 publisher function bodies. It changes baseline validation from “same algorithm version” to “latest earlier closed snapshot across versions.”

It does not add or alter tables, policies, grants, snapshot records, V1.0 hashes, or client write permissions. Provisional values remain unpersisted.

## Verification scenarios

Coverage includes:

- the overdue-in-a-closed-week milestone completed in the current week;
- stable no-compounding recalculation from one closed baseline;
- current-week action, Progress, and Reflection evidence;
- established Goal/OHARA inactivity retaining values as paused;
- a new user/Goal remaining building;
- commitments ignored before and evaluated after their local due boundary;
- final provisional and closed calculations matching for identical inputs;
- V1.0-to-V1.1 publisher baseline continuity and preserved V1.0 rows;
- publisher idempotency, immutable snapshots, role restrictions, and cross-user RLS;
- mutation refresh wiring and Notes/Reflection regression coverage.

## V1.1 limitations

- Provisional state is calculated on request rather than pushed in real time; the UI refreshes after known client mutations and on ordinary shared-hook loads.
- Only the immediately preceding completed week is automatically closed by a request. This is consistent with the existing request-driven architecture and is not a background backfill scheduler.
- Reflection-only evidence can affect Goal Momentum's Reflection pillar but does not masquerade as OHARA portfolio Progress.
