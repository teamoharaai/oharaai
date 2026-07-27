# Constellation Implementation Changelog

## 2026-07-27 — Access gate and concept 1e empty state

1. Added a feature-owned typed dashboard-summary service and `useConstellationGate`
   hook with loading, success, retryable error, explicit cancellation, and
   stale-response protection. The onboarding result exposes `accessEligible`
   separately from `hasGraphData`; the latter remains unknown because this slice
   does not fetch a graph DTO.
2. Added the responsive concept-1e seed preview and empty-state screen, including
   semantic progress bars, intentional loading/retry states, and working routes
   to set a goal or write an Echo. The route is now a thin feature consumer; no
   mock unlocked graph is rendered and `FEATURES.CONSTELLATION_ENABLED` remains
   false.
3. Limitation: the existing `GET /api/dashboard/summary` endpoint returns
   all-time `goalCount` across every goal status, including `draft`. It does not
   expose a lifetime non-draft goal count, so this session keeps the endpoint
   unchanged and cannot make the displayed “Set 3 goals” count strictly
   non-draft.

## 2026-07-27 — Feature foundation

1. Added the isolated features/constellation domain contract with discriminated
   earned nodes, annotations, virtual BRT clusters, and graph edges. The
   contract keeps relationship kind separate from optional edge valence and
   retains lowercase bud, rose, and thorn values as the semantic representation.
2. Added feature-owned copy and semantic graph tokens, including the 30-node
   render budget and the Bud/Rose/Thorn display-label mapping.
3. Added pure graph utilities for lookup, topology and endpoint validation,
   connected-neighborhood selection, evidence grouping, stable virtual IDs,
   non-mutating filtering, render-budget selection, earned-only counts, and
   graph DTO-to-view-model adaptation.
4. Added deterministic fixtures explicitly limited to development and automated
   tests; they are not imported by application routes or production fetch paths.
5. Added Node built-in test coverage and the test:constellation package script,
   with TypeScript extension imports enabled for Node's native type stripping.
   The tests cover empty graphs, malformed edges, duplicate IDs, evidence
   grouping, stable virtual IDs, annotation exclusion from earned counts, and
   the 30-node render budget.

No route, API, database, feature flag, or UI-store behavior changed in this session.
