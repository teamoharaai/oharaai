# Constellation Implementation Changelog

## 2026-07-30 — Modular actions and user-authored goal links

1. Replaced the separate Note and Projection buttons with an Add popover for
   New note, New projection, and Link goals; removed the manual Refresh action.
2. Moved Reset layout, zoom out, Fit, and zoom in from the canvas overlay into
   the Constellation header beside Add, with compact 44-pixel controls.
3. Added migration 035 and typed owner-only CRUD for private, undirected
   goal-to-goal links. Each pair has a required 1–280-character note, immutable
   endpoints, duplicate/self-link protection, goal-delete cascade, and a
   database-enforced maximum of six user links per goal.
4. Added optimistic link creation, note editing, removal, a dedicated Link
   goals inspector, linked-goal summaries in Goal inspectors, teal dashed graph
   styling, accessible link summaries, and direct edge selection that displays
   the saved note.
5. Extended runtime DTO checks, server/core coverage, acceptance fixtures, and
   the disposable PostgreSQL harness. Strict TypeScript, all 74 focused tests,
   all 26 browser journeys, and the migration-032/034/035 security assertions
   pass. Ten responsive baselines were reviewed and refreshed for the
   intentional toolbar relocation.
6. Migration 035 remains local and has not been applied to the linked Supabase
   project.

## 2026-07-29 — Current state note

`FEATURES.CONSTELLATION_ENABLED` is `true` in `constants/features.ts`. This is
the current, intentional state following the 2026-07-28 "Production
enablement" entry below. Earlier entries in this file (2026-07-28 "Final
rollout review" and older) describe the flag as disabled — that was accurate
at the time each entry was written, before the deploy blocker was resolved,
and should be read as history rather than current state.

## 2026-07-29 — Movable hierarchy, category hubs, and canonical Entries

1. Added virtual goal-category hubs from visible active/complete-grace goals,
   using the canonical category symbol registry. Categories with no visible
   goals do not exist in the graph.
2. Rebuilt Bud/Rose/Thorn nodes as sparse, goal-specific satellites derived
   from distinct categorized Entries across confirmed containers and explicit
   evidence references. Empty categories produce no node.
3. Corrected Goal inspectors to report the authoritative distinct connected
   Entry total and the three most recent Entries. BRT inspection is now scoped
   by both goal and category.
4. Added canvas/parent coordinate spaces, balanced planet/moon sizing, direct
   web node dragging, automatic satellite movement with a dragged goal,
   zoom-aware movement, and live connector recomputation.
5. Added migration 034 and authenticated layout read/save/reset endpoints.
   Saved coordinates are bounded, owner-RLS-protected, current-node validated,
   optimistic in the client, and covered by the disposable PostgreSQL security
   harness.
6. Made the legend collapsible with a persisted preference and synchronized
   its swatches and terminology with category hubs, goal planets, and BRT
   moons.
7. Verification for this slice passes strict TypeScript, 71 focused
   Constellation tests, all 25 browser acceptance journeys, and the
   migration-032/034 disposable PostgreSQL RLS harness. Ten reviewed visual
   baselines now capture the intentional category/planet/moon and Goal
   inspector changes across desktop, tablet, and narrow layouts.
8. Applied migration 034 to the linked OharaAI main Supabase project and
   rechecked that local and remote migration histories match through 034.

## 2026-07-28 — Automated acceptance contract

1. Added 15 Playwright screenshot comparisons for concepts 1a–1e at their
   canonical desktop sizes plus `768 × 1024` tablet and `390 × 844` narrow
   breakpoints. Baselines use the deterministic preview and remain separate
   from production data and routes.
2. Added production-screen browser journeys for visible graph selection, Focus
   mode, URL selection, Goal/Reflection inspector dismissal, annotation
   create/edit/archive, Echo search, Bud/Rose/Thorn evidence
   link/edit/unlink, intentional initial loading, retryable
   graph/evidence/Reflection/search failures, and both empty-state
   destinations. The existing goal-specific BRT picker is the only user
   selector; no global BRT override or duplicate picker was added.
3. Added a browser-wide failure gate for console errors, uncaught page errors,
   React warnings, invalid DOM event handlers, and React Native Web prop
   deprecations. Platform-specific SVG interaction wrappers and viewport-level
   web pointer handling remove those warnings while retaining native
   `onPress`, visible web node clicks, drag/pinch navigation, and keyboard
   selection.
4. Verification passes all 66 targeted Constellation tests and all 22 browser
   acceptance tests. The reviewed visual set contains five concepts across
   desktop, tablet, and narrow layouts without error overlays.

## 2026-07-28 — Immutable concept references and deterministic preview states

1. Restored the five 1a–1e `handoff_constellation` PNGs from commit `5df3a3b`
   into a commit-addressed documentation-only reference tree. Fixture-boundary
   coverage pins each file's name, dimensions, and SHA-256 digest and rejects
   production imports of the reference tree.
2. Extended the isolated preview with fixed `appearance` and `state` parameters
   for restrained light canvas, atmospheric dark canvas, Goal inspector,
   Reflection inspector, and the gated empty state. The inspector fixtures reuse
   the production presentation components without making network requests.
3. Documented canonical screenshot viewports, source-frame dimensions, and the
   intentional model deviations: user-authored Note/Projection drafts,
   goal-specific virtual BRT clusters, read-only Reflection evidence, functional
   controls only, real-count empty states, and responsive inspector replacement.

## 2026-07-28 — Production enablement

1. Enabled `FEATURES.CONSTELLATION_ENABLED` after the release owner confirmed
   that the current `main` artifact is deployed. The linked Supabase project
   already has migration 032, the normalized Constellation tables, RLS, and a
   live cross-user owner/isolation smoke result.

## 2026-07-28 — Final rollout review

1. Reviewed the current real-data Constellation feature slice without adding
   product behavior, changing the migration, or enabling the public feature
   flag. Production routes remain isolated from development/test fixtures.
2. Verified the source-level access/data split, annotation earned-count
   isolation, Evidence Link separation from Echo containers and global BRT,
   deterministic virtual Bud/Rose/Thorn derivation, owner-scoped action
   destinations, explicit retry states, and responsive light/dark/narrow
   implementation paths.
3. Verification passed: `npx tsc --noEmit`, all 58
   `npm run test:constellation` tests, the credential-free disposable
   PostgreSQL migration-032/RLS harness, and `npx expo export --platform web`.
   The export includes the complete Constellation API route set.
4. Confirmed the linked Supabase project has migration `032`, all four required
   Constellation tables, and RLS on each table. A self-cleaning two-user live
   smoke also confirmed owner reads/writes and cross-user read/forged-write
   denial.
5. Kept `FEATURES.CONSTELLATION_ENABLED` disabled. The authenticated Vercel
   account has no Ohara project or team scope, so the intended application/API
   artifact cannot be deployed or browser-smoked. Canonical deployment and
   enablement prerequisites remain in `docs/constellation/DECISIONS.md` section
   13; no mock-data substitute is permitted for that missing evidence.

## 2026-07-28 — Release hardening and concept reconciliation

1. Hardened the real-data Canvas for the delivered visual contract: light mode
   uses the restrained, flat warm 1a treatment; the atmospheric gradient,
   grain, and orbit treatment remains dark-mode-only as 1b. No ambient
   override exists on the light theme, and the public Constellation feature
   flag remains disabled.
2. Added keyboard-operable, labeled SVG graph entities with a visible selection
   ring on focus, enlarged graph hit regions, 44px inspector/header targets,
   stable Escape/back behavior, bounded inspector and SVG labels, and
   screen-reader node provenance plus per-edge relationship summaries. Native
   continues to use the semantic list fallback rather than attempting an SVG
   interaction model it cannot faithfully provide.
3. Standardized desktop, compact-sidebar, tablet, and narrow behavior. A
   compact rail preserves a two-column graph/inspector layout at narrower
   desktop widths; tablets and narrow layouts replace the canvas with a
   full-width, scrollable inspector and visible Back action. Long private
   labels/excerpts remain clipped to their owner-only inspector surfaces.
4. Added deterministic client guardrails for a 30-node render maximum, six
   edges per node, and 90 visible edges; per-canvas SVG paint-server IDs are
   now unique and SSR-stable; reduced-motion users receive static loading marks
   and the graph remains intentionally non-animated.
5. Screenshot/release comparison deviations are intentional: original
   future-self circles render as explicit user-authored Projection drafts;
   Bud/Rose/Thorn clusters are labeled virtual evidence summaries rather than
   earned nodes; Goal and Reflection actions expose only working owner-scoped
   evidence/Vault/Echo operations; and concept-only Timeline, Archive, Filter,
   zoom, and Draft Link controls remain absent rather than appearing inert.
   The 1c/1d side inspector becomes a full-width responsive replacement at
   tablet/narrow widths instead of overlaying the graph.

## 2026-07-28 — Live selection, Focus mode, and inspectors

1. URL-addressable selection now moves the real graph into one-hop Focus mode.
   Desktop reserves an approximately 360px inspector column and reflows the
   canvas; narrow screens use a full-width, scrollable inspector with a visible
   Back action, contained keyboard focus, Escape close, and graph/node focus
   restoration.
2. Added first-class Goal and Reflection inspectors. Goal combines live goal
   metadata with the complete manual Bud/Rose/Thorn evidence groups and Add,
   Edit, and Unlink actions. Reflection reads the active owner candidate on
   demand and shows its real occurrences, score, valence history, and only
   owner-verified bounded Echo evidence; it exposes no local-only BRT override.
3. Added safe read-only inspectors for Season, Ambition, Trait, Tension, Note,
   Projection, and virtual BRT clusters. Annotation drafts expose explicit Edit
   and Archive actions. A virtual cluster lists and manages the referenced
   Echoes for that goal/category while remaining virtual and weightless.
4. Added destination guards: Open in vault appears only when an owned Vault row
   exists, and Read in Echo appears only for an owned Echo returned by the
   Reflection evidence endpoint. Missing deep-link targets select nothing.
   No Draft Link action, production fixture fallback, schema change, migration,
   feature-flag change, or fake graph data was introduced.
5. Added focused tests for neighborhood isolation, private Reflection response
   validation, fake-valence rejection, additive Goal metadata, and
   unauthenticated inspector access. Final strict TypeScript, all 58 targeted
   tests, the Expo web export, and `git diff --check` passed. An authenticated
   live-Supabase browser smoke verified the real 26-goal/10-Echo empty graph,
   URL-selected Season inspector, desktop/narrow layout, Back/Escape focus
   restoration, and stale-selection cleanup without inserting fixtures. That
   account had no qualified Goal or Reflection nodes for positive live UI
   coverage.

## 2026-07-28 — Manual Echo evidence references

1. Added a selected-goal Evidence inspector backed by owner-scoped read routes
   and the existing evidence-reference mutations. Users can browse recent
   owned Echoes, search owned Echo title/content, select one, assign semantic
   `bud`, `rose`, or `thorn`, add an optional 280-character note, and later
   edit the goal-specific category/note or confirm unlinking.
2. Added grouped Bud/Rose/Thorn evidence lists with bounded 240-character Echo
   excerpts and selected-goal duplicate markers. The workflow keeps one
   mutable relation per Echo/goal pair while allowing the same Echo to use a
   different category under another owned goal.
3. Added exact optimistic create, edit, and unlink reconciliation. Failures
   restore the prior evidence list and virtual cluster graph, preserve local
   form input for retry, and never delete or move the Echo. Search results are
   ignored when they belong to an older goal, query, or request.
4. Recomputed the selected goal's virtual Bud/Rose/Thorn cluster nodes,
   derived edges, per-cluster counts, and aggregate evidence count from the
   complete local goal-evidence list. Earned nodes, annotations, persisted
   graph edges, other goals, and all canonical Echo state remain unchanged.
5. Added focused tests for duplicate submission, category changes, exact
   unlink rollback, two-sided cross-user rejection, stale search results,
   DTO identity/category validation, and cluster-count recomputation. No
   fixture data, migration, feature-flag change, `echo_entry_links` write, or
   `echo_entries.brt_user` write was introduced.

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
