# Constellation Implementation Changelog

## 2026-07-28 — Live annotation mutation smoke follow-up

1. Excluded synthetic fallback nodes from annotation anchor choices. Only
   UUID-backed persisted earned nodes can now be offered to the existing
   annotation mutation API.
2. Verified signed-in create, retry after a rejected synthetic anchor, cancel
   without mutation, edit from Note to Projection, exact earned-count
   isolation, archive persistence, and active-graph removal against the live
   test account.
3. Deferred invalid URL-selection cleanup while an annotation mutation is
   saving so optimistic archive cannot navigate away and abort its own API
   request. Exact rollback can restore the selected draft and retry surface.

## 2026-07-28 — End-to-end user-authored annotations

1. Added focused Note and Projection authoring through the existing
   authenticated annotation APIs: create, edit label/body/kind/optional anchor,
   and archive. Desktop uses a side inspector beside the graph; narrow screens
   use a full-width accessible surface instead of a graph-covering modal.
2. Added client validation for non-empty labels, bounded optional bodies,
   note/projection-only kinds, and anchors offered only from the visible earned
   render set. The server now also requires an active owner node, and
   single-flight mutation guards prevent duplicate submissions.
3. Added exact immutable rollback around optimistic create, edit, and archive.
   Retryable failures retain the local form values and expose retry actions;
   Cancel closes the local draft without calling a mutation API.
4. Kept annotations visibly user-authored and draft-coded. Client
   reconciliation changes only active annotation rows, annotation counts, and
   derived weightless anchor presentation edges; it does not alter earned
   counts, source/evidence counts, visibility scores, candidate confidence,
   Traits, Tensions, or persisted system edges.
5. Archive remains the only removal operation. Archived drafts disappear from
   the active DTO/render, increment the archived contract count, and remain
   persisted for a future archive surface; no hard-delete route or archive UI
   was added.

## 2026-07-27 — Live route, resilient client state, and URL selection

1. Replaced the production route's dashboard-summary proxy with a feature
   service that calls the authenticated real `GET /api/constellation`
   contract, validates the versioned DTO and `dataOrigin: real`, and passes it
   through the tested DTO-to-view-model adapter. Production code has no
   fixture import or fallback.
2. Added feature-owned transient request state for initial load, retryable
   error, cancellation/stale-response guards, refresh, and safe retention of
   the last successful DTO when a refresh fails. No graph data, annotations,
   selection, or filters were added to the persisted global UI store.
3. Added explicit access-gate, Season-only, patterns-forming, and populated
   graph branches. The graph renders real earned nodes, active user
   annotations, valid system edges, and derived goal-scoped Bud/Rose/Thorn
   clusters; the existing accessible list keeps the same information
   available outside SVG geometry.
4. Added deterministic static layout for arbitrary live view models and
   `selected` URL handling. Valid owner DTO entities remain selectable within
   the render budget; malformed, unknown, archived-by-default, or
   unauthorized IDs clear with replacement navigation without revealing
   ownership. Inspectors remain deferred.
5. Kept `FEATURES.CONSTELLATION_ENABLED` false and retained the existing
   isolated development preview. No user-controlled production bypass or
   feature-flag change was introduced.

## 2026-07-27 — Fixture-only static renderer and screenshot harness

1. Added a feature-owned, static `react-native-svg` renderer whose pure layout
   layer maps normalized coordinates into a stable 1200 × 760 viewBox. The
   rendering layer owns the canvas shell, all six earned-node shapes, visibly
   draft-coded annotations/projections, goal-scoped virtual BRT summaries,
   semantic edges, selection ring, sprouted goal label, legend, header metadata,
   and native/screen-reader list representation.
2. Matched concepts 1a and 1b through the current canonical contract: the light
   renderer uses the restrained warm treatment; dark uses atmospheric gradients,
   grain, halos, and orbits; old future-self circles are represented as explicit
   `Projection · Draft` annotations; and BRT clusters show category plus evidence
   reference count without entering earned-node counts.
3. Added an isolated `previews/constellation/` Expo Router app root and synthetic
   fixture under `features/constellation/dev/` for screenshot QA. The production
   `/constellation` route is unchanged and imports neither module. Automated
   boundary tests fail if a production route or production Constellation module
   imports fixtures or the development preview.
4. Deliberately omitted pan/zoom and inactive Timeline, Archive, Filter, Draft
   Link, and zoom controls. Production graph wiring, feature-flag changes, and
   fixture fallback behavior remain outside this slice.

## 2026-07-27 — Authenticated graph and write APIs

1. Added `GET /api/constellation` with a server-only feature service and
   owner-scoped Supabase data access. The service assembles the approved
   versioned graph DTO from real persisted nodes, active annotations, system
   edges, exact source counts, and virtual goal-level BRT summaries. It uses a
   deterministic opaque fallback Season ID where no persisted Season exists,
   distinguishes access eligibility from graph data, performs no per-entity
   reads, counts only non-draft goals toward the retained three-goal access
   threshold, and never selects Echo content or production fixtures.
2. Added note/projection create, edit, and idempotent archive endpoints plus
   Echo/goal evidence-reference create-or-update, edit, and delete endpoints.
   Every write derives the owner from auth, verifies source ownership before
   mutation, runs under the caller JWT for RLS, bounds private notes, and
   exposes stable client-safe 400/404/409 envelopes. Evidence writes only
   mutate `constellation_evidence_links`; they cannot move Echo containers or
   update `echo_entries.brt_user`.
3. Added deterministic server/API coverage for unauthenticated access,
   eligible empty graphs, owner isolation, one Echo across several goals,
   duplicate-insert recovery, idempotent category updates, annotation
   lifecycle, note bounds, and safe database-error translation. Documented
   the additive Expo API contracts in `docs/API_CONTRACT.md`.

## 2026-07-27 — Persistence schema and isolated database security

1. Added migration 032 with normalized owner-scoped earned nodes, persisted
   system edges, user-authored annotations, and manual Echo-to-goal Evidence
   Links. Earned sources use typed provenance and same-owner FKs; annotations
   remain structurally user-authored drafts; evidence categories are limited to
   lowercase bud, rose, or thorn with one mutable relation per Echo/goal pair.
2. Kept Bud/Rose/Thorn goal clusters virtual. The Evidence Link table has no
   trigger or write path into `echo_entry_links`, legacy `echo_entries.goal_id`,
   `echo_entries.brt_user`, or graph-node storage.
3. Added a disposable local PostgreSQL harness covering constraint enforcement,
   cross-user RLS, forged ownership, archival, evidence uniqueness/category
   updates, source deletion, anchor nulling, and the canonical Echo container
   invariant. No linked/live Supabase migration was applied.

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
