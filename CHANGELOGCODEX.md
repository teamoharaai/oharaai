# Ohara Codex Changelog

## [Unreleased]

### Added
- Added a canonical `FeaturePageHeader` for Goals, Entries/Echo, Momentum, and Constellation, including the existing Echo mark and the Sidebar-established Constellation mark in semantic OHARA green.
- Extended the authenticated Momentum response with owner-scoped weekly snapshot history, exposing only the latest immutable revision per algorithm-version/week in chronological order.
- Added a real authenticated `/goals` index route with an intentionally restrained Coming Soon surface and the existing Create a Goal flow; goal-detail and creation routes remain unchanged.
- Added `docs/LOCAL_MANUAL_REVIEW_001_039.md` and local browser screenshots documenting the authenticated post-migration manual review, runtime/API evidence, database/security checks, classified findings, and readiness recommendation.
- Added `supabase/migrations/039_restore_explicit_table_privileges.sql` with an explicit final-state PostgREST privilege matrix, no anon table CRUD, preserved friendship/Momentum mutation revokes, and enumerated service-role access for clean local installs.
- Added `docs/SUPABASE_MIGRATION_CHAIN_REPAIR.md` with root cause, deployment evidence, baseline-versus-forward repair rationale, catalog checks, local validation, risks, and a staged rollout procedure.
- Added the versioned `momentum-v1.0` calculation foundation, local-timezone weekly boundaries, normalized/deduplicated task events, explainable diagnostics, focused tests, open-decisions document, and private snapshot/event schema in migration 038.
- Added the authenticated `/api/momentum` service boundary and Home summary hook for real Momentum value/change, Weekly Streak, and Tasks Completed This Week metrics.
- Added a loopback-only Supabase configuration/target guard, ignored local CLI state, disposable PostgreSQL migration-security harness, local Auth/PostgREST integration fixtures, actual Momentum API smoke test, and local-development guide.
- Integrated the upstream unified Entries workspace, latest-entry invalidation pipeline, active-goal reflection selectors, supporting tests, and migration 037 from `upstream/main` without merging unrelated branch changes.
- Added shared spacing, radius, control, layout, and cross-platform elevation tokens in `constants/design.ts` to establish a consistent UI foundation from the OHARA design system and reference mockups.

### Changed
- Refined the active Echo note-detail workspace in `features/entries/components/NoteEditor.tsx` and both `RichTextEditor` platform implementations: document text now uses an 18px/1.65 long-form rhythm, the web reading measure expands from a padded 760px box to a responsive 900px measure, headings/lists/quotes have clearer hierarchy, linked-goal metadata uses 14px type and 32px chips, and formatting controls use grouped 40px targets with 19px icons.
- Made Ohara Intelligence open by default while preserving its existing close/reopen behavior, 328px desktop width, narrow-screen modal behavior, linked context, related entries, and honest preview copy; the panel now uses the canonical semantic green through translucent, blurred glass surfaces rather than a separate color family.
- Preserved note persistence, autosave, editor commands, routing, linking, export/share, authentication, and backend behavior while improving light/dark contrast, caret/selection styling, responsive document margins, and icon-button accessibility labels/roles.
- Visually verified the authenticated note at the available 1483×960 capture viewport in light/dark mode with Intelligence open and collapsed; confirmed reload-default opening, 900px re-centering when hidden, and no fixture-content mutation. Entries (8) and Echo composer (5) tests, the known-valid source type-check, the 50-route web export, and `git diff --check` pass.
- Replaced the full Momentum page's hardcoded Mon–Sun sample graph, forced SVG stretching, fake `+8%`, and 0–100 axis with a measured responsive chart of real weekly snapshots on the algorithm's open-ended non-negative domain; zero-, one-, multi-period, loading, and error states remain honest and sample-free.
- Removed Preview semantics from the authoritative Momentum page header and overview while retaining explicit Preview labels on Momentum drivers, Goal Momentum, entry patterns, and suggested guidance that Phase 1 does not calculate.
- Verified the unified headers and authoritative single-period chart in authenticated light/dark browser checkpoints at 1707×960; the authenticated/unauthorized local API smoke checks, 31 Momentum tests, 8 Entries tests, 74 Constellation tests, the known-valid TypeScript check, a 50-route web export, and `git diff --check` pass.
- Added `AuthenticatedPageShell` to align Echo/Entries, full Momentum, and Goals with Home’s uncapped authenticated frame (24px desktop and 16px compact outer gutters) without changing Home’s composition.
- Expanded Echo’s outer page frame, reflection start surface, control row, and entry-group surface to the Home workspace width; preserved existing Notes/Reflection behavior and data loading.
- Expanded the full Momentum Preview workspace and responsive plot area to the Home frame while retaining all current preview semantics, range controls, charts, and calculation/data boundaries.
- Added the canonical target-mark Goals navigation item between Home and Echo, with an active `/goals` route and the same selected, hover, and focus states as the established Sidebar items.
- Corrected the Sidebar account fallback to use the user’s display name or username initial with a high-contrast canonical-green avatar in both themes, including hover and keyboard-focus treatment.
- Consolidated active Home and Sidebar branding onto one semantic green family (`#2A7F50` light, `#58C77B` dark), including the original OHARA mark, selected navigation, Today, Echo, Goals, Momentum, project marks, focus dots, links, and actions; inactive navigation and goal-category colors remain intentionally neutral/semantic.
- Updated `BrandIcon` to use the supported image tint prop, restored the canonical target mark for Goals, removed the duplicate legacy project glyph from the Home project row, and widened the Dashboard workspace by removing its 1760px ceiling while standardizing 24px desktop gutters, 20px frame padding, 24px grid gaps, and the existing 30/34/36 column proportions.
- Visually verified the authenticated populated Home in light/dark mode at 1727×1000 plus 1440×900, 1280×800, 900×900 tablet, and 390×844 mobile checkpoints; authoritative Momentum remained `4.52`, Weekly Streak `3`, Tasks Completed `1`, with no horizontal overflow or database/environment changes.
- Reconstructed the active authenticated Home composition in `app/(app)/dashboard.tsx` around the approved light/dark references: the greeting now anchors the left column above unboxed Today priorities and Echo, authoritative Momentum owns the center feature card, two real activity-ranked Goals occupy the right card, and Projects uses a full-width composed surface.
- Updated `components/layout/Sidebar.tsx` for the Home reference rhythm and functional route order (`Home`, `Echo`, `Momentum`, `Constellation`) while intentionally withholding a Goals item because no functional Goals index route exists yet; updated `features/projects/components/ProjectCard.tsx` to surface real aggregate goal progress without changing project behavior.
- Preserved the frozen Momentum API and Phase 1 calculation boundary while displaying its real current value, weekly change, Weekly Streak, and Tasks Completed This Week in the rebuilt Momentum hierarchy; no Supabase configuration, migration, schema, authentication, route, or calculation code was changed.
- Validated the Home reconstruction with authenticated light/dark browser checkpoints against the restored loopback-only stack, including authoritative Momentum values (`4.52`, Weekly Streak `3`, Tasks Completed `1`), the real one-goal/no-project fixture states, the Momentum expand interaction, the known-valid TypeScript command, 29 Momentum tests, 6 active-goal selector tests, 8 Entries tests, a 50-route Expo web export, and `git diff --check`.
- Completed the isolated local product review after migrations 001–039 and recorded **Ready with documented non-blocking issues**: the migration repair, 35/35 RLS state, embedding indexes, PostgREST data grants, authoritative Home Momentum values, and immutable snapshot chain passed; no source code, migration, remote database, or git history was changed.
- Restored the original documented `vector(1024)` embedding contract in squashed baseline migrations 001, 002, and 004 so the existing HNSW indexes can be created from an empty database.
- Updated the guarded Momentum local fixture to use the profile created by the canonical Auth trigger and to supply the required real goal category when validating the complete repository schema.
- Updated Supabase and Momentum local documentation for the repaired chain and next migration number; Migration 038 calculation and security logic remains unchanged.
- Validated three empty local migration replays through 039 and seed loading, identical final catalog fingerprints across the last two replays, 35/35 public tables with RLS, Momentum's 29 source tests/10 scenarios/5 adversarial assertions, Momentum and Constellation database harnesses, live friendship security, authenticated API/Home data, TypeScript, feature tests, and a 50-route web export.
- Remediated Momentum Phase 1's release blockers: the API now separates authenticated canonical reads from service-role-only publication, Migration 038 revokes client publication/DML and enforces immutable snapshots, and planned-action completion intersects completion IDs with the exact normalized denominator set.
- Updated Momentum diagnostics, Supabase types, migration contracts, local setup, tests, and reports to cover per-action eligibility, trusted hashes/reasons, changed-input revisions, adversarial writes, and real local Home values.
- Validated the remediation with 29 source tests, PostgreSQL 15/16 database harnesses, the actual authenticated API, rendered Home metrics, the known-valid source type-check, and a 50-route web export.
- Connected the active Home Momentum preview to backend-authoritative values and explicit loading/unavailable states, removing its static sample values without changing the full Momentum route or Home layout.
- Made completed-week snapshot publication deterministic and idempotent through stable SHA-256 calculation hashes, immutable superseding revisions, row locking, event deduplication, and stale-baseline rejection.
- Replaced the active Home dashboard composition in `app/(app)/dashboard.tsx`: Today’s Focus now has unboxed priority rows, Momentum uses a substantially larger chart composition, Echo sits beside the daily focus, and Goals shows the two most recently reflective active goals with real milestone/reflection context and next steps.
- Corrected the rendered Constellation field in `features/constellation/components/ConstellationCanvasShell.tsx` by using the theme’s graph-space ambient color and visually verified green ring strokes/opacities while retaining the Current Season coordinate anchor and transformed SVG layer.
- Replaced the remaining Home Goals and Project preview JSX compositions and moved Constellation’s radial field into the transformed graph layer, anchored to Current Season beneath three 8%/14%/20% dashed rings.
- Applied the final system-font typography hierarchy, exact semantic light/dark surface tokens, premium Goal card composition, and fixed dual-theme Constellation depth/ring treatment from the approved visual board.
- Re-composed Home Today’s Focus, Momentum, Echo, Goal, and Project presentation around the target card hierarchy while preserving existing data, routes, and actions.
- Restyled the integrated Entries library and reflection launcher with canonical semantic tokens and shared Card, Button, and Modal primitives.
- Modernized the semantic dark theme and focused reflection palette in `constants/colors.ts`, `constants/focused-tokens.ts`, and `tailwind.config.js` with layered blue-green near-black surfaces and restrained brighter green accents.
- Updated shared UI primitives and layouts across `components/ui/` and `components/layout/` with calmer card hierarchy, semantic elevation, consistent radii, refined controls, generous spacing, glass-like overlays, focus treatment, and improved responsive page rhythm.
- Refined dashboard, project, and goal surfaces in `app/(app)/dashboard.tsx`, `features/projects/components/ProjectCard.tsx`, and `features/goals/components/GoalCard.tsx` to use the modernized hierarchy while preserving all existing actions and workflows.
- Improved global web typography rendering, selection, focus visibility, and scrollbar styling in `global.css`.

### Fixed
- Moved Migration 003's `Users can read own and member spaces` policy below creation of `public.space_members`, repairing the clean-install forward reference without changing the final policy expression, schema, or deployed data.

### Added (2026-07-30 — User-authored Constellation goal links)
- **`supabase/migrations/035_constellation_goal_links.sql` and Constellation graph contracts:** added private, owner-authored, undirected goal links with a required bounded note, same-owner goal constraints, duplicate/self-link prevention, a six-link-per-goal limit, CRUD RLS, and a typed `user_goal_link` graph edge that remains separate from system-managed Constellation edges.
- **Goal-link APIs, services, and optimistic state:** added authenticated create, note-update, and remove routes plus owner-visible graph assembly, runtime DTO parsing, exact optimistic reconciliation/rollback, and linked-goal summaries in Goal inspectors.
- **`ConstellationGoalLinkPanel` and interactive graph edges:** added two-goal selection, required-note authoring, existing-link management, note editing/removal, teal dashed edge styling, direct edge selection, and screen-reader connection controls.
- **Goal-link verification:** added focused core/state/API validation tests, an end-to-end browser authoring journey, and disposable PostgreSQL assertions for RLS, forged/cross-owner writes, uniqueness, endpoint immutability, the six-link limit, and goal-delete cascades.

### Changed (2026-07-30 — Constellation modular controls)
- **Constellation header actions:** replaced separate Note and Projection buttons with an Add popover for New note, New projection, and Link goals; removed the manual Refresh action.
- **Layout and viewport controls:** moved Reset layout, zoom out, Fit, and zoom in from the canvas overlay into the header beside Add while preserving compact 44-pixel targets and the existing confirmation/persistence behavior.
- **Acceptance and repository documentation:** updated API, component, data-layer, migration-ledger, decision-contract, feature-changelog, fixture, and responsive visual-baseline coverage for migration 035 and the new authoring model. Migration 035 remains local and has not been applied to the linked Supabase project.

### Added (2026-07-29 — Constellation category hierarchy)
- **`features/constellation/goal-categories.ts` and graph types:** added one canonical presentation registry covering current and legacy goal categories, plus typed virtual goal-category nodes and membership edges so categories can be rendered without becoming persisted or earned domain records.
- **`GoalCategoryShape.tsx` and `ConstellationGoalCategoryInspector.tsx`:** added symbol-led category hubs and an inspectable list of the active goals represented by each visible category.
- **`supabase/migrations/034_constellation_layout_positions.sql`:** added bounded owner-scoped layout coordinates with RLS, timestamp maintenance, canvas/parent coordinate-space checks, and cascade cleanup when an owner is removed.
- **`types/supabase.ts`:** synchronized the generated database contract shape with migration 034's layout-position table for future typed Supabase consumers.
- **Constellation database security harness:** extended the disposable PostgreSQL run to apply migration 034 and assert own-layout writes, cross-user read/write isolation, and coordinate constraints.
- **Linked main database:** applied migration 034 to the OharaAI Supabase project and verified that local and remote migration histories match through 034.

### Changed (2026-07-29 — Constellation category hierarchy)
- **Virtual BRT graph contracts and presentation:** renamed stale `evidenceLinkCount` display metadata to `entryCount`, reflecting that goal satellites summarize canonical attached Entries as well as supplemental evidence references.
- **`groupGoalEvidenceByBrt`:** stopped generating zero-count Bud/Rose/Thorn nodes; a goal now receives only the category satellites supported by at least one connected, categorized Entry.
- **Constellation graph assembly:** derive category hubs from visible goals, connect each goal to its category, and derive BRT satellites from the deduplicated union of confirmed goal-container Entries and explicit evidence references.
- **`lib/db/constellation.ts`:** added owner-scoped, paginated reads for goal categories and confirmed goal-container Entry links so graph derivation uses canonical source tables without per-goal queries.
- **Graph adapter and runtime DTO validation:** recognize category nodes/membership edges, validate every goal category against the canonical taxonomy, and include category hubs in filtering, selection, and render prioritization without adding them to earned-node counts.
- **Deterministic Constellation fixtures:** added category metadata, representative current/legacy-compatible category hubs, and category membership edges so unit and browser previews exercise the new hierarchy.
- **Accessible descriptions and layout typing:** added category-aware labels, dimensions, and exhaustive neighbor descriptions so the new graph entity remains safe across visual and semantic render paths.
- **Constellation graph/evidence/layout tests:** updated expected neighborhoods and optimistic cluster recomputation for category membership plus the new non-empty-only satellite invariant.
- **Render-edge budgeting:** reserve the shared 90-edge ceiling for all relationships while excluding derived category-membership and goal-satellite edges from the six-semantic-relationships-per-node allowance, preventing hierarchy nodes from becoming visually orphaned in dense graphs.
- **Render-node budgeting:** prune a category hub when none of its related goals survives the current canvas budget, enforcing the visible parent/child invariant even in dense owner graphs.
- **`layout.ts`, goal rendering, and BRT rendering:** introduced explicit canvas/parent coordinate spaces, deterministic parent-relative satellite offsets, a smaller circular moon treatment for BRT summaries, and a balanced circular planet treatment for goals. Moving a goal in the pure layout model now preserves every satellite offset automatically.
- **Constellation canvas pointer interaction:** added direct mouse, stylus, and touch dragging for every rendered web node, zoom-aware viewBox coordinate conversion, movement bounds, drag-versus-click suppression, and live connector recomputation while preserving existing background pan and pinch behavior.
- **`ConstellationLegend.tsx` and `store/uiStore.ts`:** made the legend user-collapsible with persisted state, an explicit web-expanded accessibility state, a compact collapsed chip, updated category/planet/moon swatches, and a version-3 migration that preserves existing dashboard-view preferences instead of overwriting them.
- **BRT inspector terminology:** replaced stale Reflection inspector semantics with goal-scoped Entry language while retaining internal database/service identifiers for compatibility.
- **Acceptance empty-state naming:** renamed the obsolete “locked” fixture helper to the real `season_only` state now exercised by the CTA journey.
- **Constellation browser acceptance:** added real journeys proving the authoritative connected-Entry total can exceed the bounded three-card preview, the legend preference persists through collapse/reload/expand, and goal dragging moves its BRT moon by the same delta, suppresses inspector opening, survives reload through the layout API, and returns to deterministic defaults after confirmed reset. All 25 journeys pass, and ten reviewed desktop/tablet/narrow baselines were refreshed for the intentional visual changes.
- **Repository knowledge files:** rewrote the canonical Constellation decision contract and synchronized API, context, immutable-reference, migration-ledger, component/database guidance, feature changelog, and outstanding-work documents with category hubs, canonical Entry reads and terminology, sparse BRT satellites, movable hierarchy, and migration 034.

### Changed (2026-07-29 — Constellation canonical connected Entries)
- **`lib/db/constellation.ts`, goal/BRT inspector DTOs, services, hooks, and API routes:** derive each goal's connected Entry total and three most recent Entries from the deduplicated union of confirmed canonical `echo_entry_links` goal containers and explicit `constellation_evidence_links`, while retaining the existing evidence-management list as a separate domain. BRT inspector reads are now scoped by both goal and category so one goal's Bud/Rose/Thorn node cannot expose another goal's Entries.
- **`ConstellationGoalEvidencePanel.tsx` and `ConstellationScreen.tsx`:** show the authoritative total plus up to three most recent connected Entries with bounded excerpts, source/category context, and functional Entry deep links; relabeled the separate mutable list as Evidence references so canonical containment and supplemental evidence are no longer conflated.
- **Constellation preview, DTO tests, and acceptance API fixtures:** extended deterministic goal-inspector data with connected totals/recent Entries and changed the mocked BRT route to the goal-scoped contract.

### Fixed (2026-07-29 — Constellation canonical connected Entries)
- **`ConstellationGoalEvidencePanel` data contract:** replaced the evidence-reference-array assumption behind the goal inspector's false zero counts with authoritative `connectedEntryCount` and bounded `recentEntries` fields, preparing the UI to show real attached Entries even when no separate Constellation evidence reference exists.
- **`ConstellationCanvasShell.tsx`:** forwarded layout busy/error state into the interactive viewport so reset cannot race an active load/save and persistence failures remain visible to the user.

### Added (2026-07-29 — Constellation production inspector refinement)
- **`app/api/constellation/brt/[category]+api.ts`, `lib/db/constellation.ts`, `features/constellation/hooks/useBrtInspector.ts`, `ConstellationBrtInspector.tsx`, and supporting DTO/service contracts:** added an owner-scoped Bud/Rose/Thorn inspector that lists every entry carrying the selected category with bounded excerpts and supports in-place reclassification.
- **Constellation graph/evidence tests and browser acceptance fixtures/config:** added coverage for always-available goal BRT nodes, nullable/unlinked evidence, the BRT inspector response, goal anchors, and in-place selection without same-page route pushes; updated the Expo preview port argument to the SDK-supported separated form so the acceptance web server starts non-interactively.

### Changed (2026-07-29 — Constellation production inspector refinement)
- **`ConstellationScreen.tsx`, `graph.ts`, `EarnedNodeShape.tsx`, `ConstellationGenericInspector.tsx`, and `ConstellationInspectorSurface.tsx`:** moved node selection into local Constellation state so Season, goal, Reflection, and BRT clicks focus and open their panel without forwarding; kept direct selection URLs as an initial compatibility path; rendered “Current Season” on two contained lines; widened the inspector; and ensured goal focus includes Bud, Rose, and Thorn even when a category has zero entries.
- **`ConstellationGoalEvidencePanel.tsx`, `BrtPicker.tsx`, Echo entry editing, goal-evidence state, and `PATCH /api/entries/:id`:** made BRT explicitly nullable, exposed “Unlinked entries” for goal references, defaulted new evidence to unlinked, allowed later classification, and added the requested Streak/Vault/Edges placeholder cards without changing entry containment.
- **`ConstellationReflectionInspector.tsx` and `docs/API_CONTRACT.md`:** aligned Reflection summary metadata more closely with the supplied inspector concept and documented the current goal-anchor, nullable BRT, entry-category, and BRT-inspector contracts.

### Fixed (2026-07-29 — Constellation production inspector refinement)
- **`lib/api/constellation.ts`:** accepted and validated `anchorGoalId` for annotation create/update requests, fixing the `400 INVALID_INPUT: Unexpected request field: anchorGoalId` failure when a Note/Projection is anchored to a visible goal node.
- **`ConstellationAnnotationPanel.tsx`:** return a successfully edited Note/Projection to its read inspector instead of leaving the editor open after save.
- **`useConstellation.ts` and `evidence-state.ts`:** tracked per-goal evidence-count deltas independently from categorized cluster counts so unlinked entries do not inflate graph metadata during optimistic add/edit/unlink flows.

### Fixed (2026-07-29 — User interface scrolling)
- **`app/(app)/_layout.tsx`:** constrained authenticated route content through the nested navigator so page-owned scroll views receive a bounded viewport instead of being clipped by an auto-sized flex ancestor.
- **`components/layout/AccountModal.tsx` and `SettingsModal.tsx`:** made long account and settings forms scroll inside viewport-bounded modals while keeping their actions accessible.
- **`features/constellation/components/ConstellationInspectorSurface.tsx`:** removed the overflow override that disabled the inspector's own vertical `ScrollView` on web.

### Added (2026-07-29 — App-wide Entry quick create)
- **`components/layout/GlobalCreateControl.tsx`, `app/(app)/_layout.tsx`, `features/echo/components/QuickEntryModal.tsx`, and `features/echo/hooks/useQuickEntry.ts`:** moved the floating Create control into the authenticated app shell and enabled New Entry from every app screen through a bounded modal that lazily loads only goal choices, reuses the canonical entry save path, keeps the current screen visible, preselects goal context on goal routes, blocks dismissal while saving, and updates the shared entry store after confirmed persistence.
- **`features/echo/composer-state.ts`, `composer-state.test.ts`, and `package.json`:** added focused validation, normalization, persistence-outcome, and legacy-draft-migration coverage through `npm run test:echo-composer`.

### Changed (2026-07-29 — App-wide Entry quick create)
- **`features/echo/components/EchoComposer.tsx`, `draft-store.ts`, `hooks/useEntries.ts`, `services/echo-service.ts`, and `app/api/entries/index+api.ts`:** made title and content required across the composer/client/API contract, bounded the modal editor so long content scrolls inside the entry field instead of growing the window, preserved both fields per global/goal draft context, migrated existing body-only drafts without data loss, and kept offline or unconfirmed submissions open with their drafts intact.
- **Authenticated Entry, goal, dashboard, Constellation, and supporting marketing surfaces:** standardized user-facing raw-record labels to Entry/Entries while retaining internal Echo routes, stores, services, APIs, database identifiers, and genuinely derived Reflection concepts. Relevant files include `components/layout/Sidebar.tsx`, `app/(app)/dashboard.tsx`, `features/echo/components/`, `features/constellation/components/`, and goal Entry summaries.

### Refactored (2026-07-29 — App-wide Entry quick create)
- **`app/(app)/dashboard.tsx`:** removed the dashboard-only floating Create implementation now that the authenticated app layout owns the shared control; section-level project creation remains locally scoped.

### Added (2026-07-30 — Entries foundation)
- Added the additive, owner-scoped Entries schema in `supabase/migrations/036_entries_notes_reflections.sql`, including Notes and Reflections, structured/plain-text content, multi-goal links, category-only links, milestone links, timestamps/versioning, RLS policies, and a non-destructive one-time import of existing Echo history as completed Reflections.
- Added `features/entries/types.ts`, `features/entries/utils.ts`, and focused Node tests for recency ordering, unlinked-note classification, multi-category shelving without duplicated records, and retrieval-document normalization.
- Added the complete Entries workspace with category-organized Notes, a focused code-native rich-text editor, debounced autosave and local recovery, persistent relationship controls, working text/PDF/copy exports, and a session-aware Ohara Intelligence panel.
- Added transparent guided Reflections, recent history, completed-reflection editing/export, and goal/milestone context without making unsupported AI requests.
- Added owner-authenticated Entries API routes, transactional save operations, context-query boundaries, and user-scoped relationship-policy tests.

### Changed (2026-07-30 — Entries foundation)
- Renamed the primary Echo navigation destination to Entries, registered canonical Notes/Reflections routes, and retained legacy Echo deep links through compatibility redirects.
- Generalized the goal-creation mode selector into a shared segmented control and reused its presentation for Notes/Reflections navigation.
- Extended session UI state, authenticated-store cleanup, and theme-aware editor styles for the Entries workspace.
- Integrated upstream’s global Create control with the canonical New Note flow so it no longer creates records outside the Notes/Reflections Entries domain.
- Renumbered the additive Entries migration to `036` after synchronizing upstream migrations `033`–`035`.

### Fixed (2026-07-30 — Entries foundation)
- Kept failed note saves in local recovery storage and ensured edits made during an in-flight autosave are queued for the next save.
- Validated Constellation identifiers before interpolating them into the user-scoped Entries context query.
- Preserved supported rich-text alignment markup, returned stable API errors for database failures, and retained both legacy direct and confirmed-container Echo goal relationships during compatibility import.
- Kept the Unlinked Notes shelf’s New Note card first in both grid and list presentations.
- Kept the web rich-text alignment sanitizer type-safe across DOM element variants.

### Added (2026-07-28 — Constellation release certification)
- **`tests/constellation/acceptance-api.ts` and `constellation.acceptance.spec.ts`:** added deterministic delayed-graph coverage that proves the production Constellation screen exposes its intentional initial loading state before real graph content arrives, completing explicit loading/retry/empty-state release evidence.
- **`docs/constellation/RELEASE_CERTIFICATION_2026-07-28.md`:** recorded the controlled two-user live smoke, RLS/privacy/API results, TypeScript/test/database/export/visual gates, rollback exercise, cleanup proof, Expo compatibility review, and pass decision.

### Changed (2026-07-28 — Constellation release certification)
- **`docs/constellation/CHANGELOG.md`:** updated the acceptance count from 21 to 22 after adding the initial-loading journey.

### Added (2026-07-28 — Constellation acceptance contract)
- **`tests/constellation/`, `package.json`, and `package-lock.json`:** added a Playwright acceptance suite for all five handoff concepts and the final production architecture contract, including 15 committed screenshot baselines at the canonical desktop, `768 × 1024` tablet, and `390 × 844` narrow sizes. Browser journeys cover visible SVG node selection, Focus mode, URL-addressable Goal/Reflection inspectors, Close/Escape dismissal, annotation create/edit/archive, Echo search, goal-specific Bud/Rose/Thorn evidence add/edit/unlink, graph/Goal/Reflection/search retry states, and both empty-state CTAs.
- **`previews/constellation/app/constellation.tsx`, `previews/constellation/app/(app)/echo.tsx`, `previews/constellation/app/goals/create.tsx`, and `tests/constellation/acceptance-api.ts`:** added preview-only production-screen hosting and deterministic authenticated API interception so the suite exercises the real Constellation UI, client validation, routing, and mutation state without importing fixtures into production routes or changing product fallbacks.

### Changed (2026-07-28 — Constellation acceptance contract)
- **`features/constellation/dev/inspector-fixtures.dev.ts`, `features/constellation/components/ConstellationGoalEvidencePanel.tsx`, and `previews/constellation/README.md`:** exposed deterministic preview DTOs for the acceptance boundary, added a semantic evidence-card label for stable user-facing scoping, and documented the visual matrix, interaction contract, console gate, and intentional baseline-update command. The existing scalable goal-specific `ConstellationBrtPicker` remains the single user-facing BRT selector and is now covered end to end rather than duplicated.

### Fixed (2026-07-28 — Constellation web interaction and warning gate)
- **`features/constellation/components/InteractiveSvgGroup.tsx`, `InteractiveSvgGroup.web.tsx`, `EarnedNodeShape.tsx`, `AnnotationShape.tsx`, `VirtualBrtClusterShape.tsx`, `ConstellationCanvasShell.tsx`, and `components/ui/Card.tsx`:** preserved native SVG `onPress` while using a DOM-native web `<g onClick>` path, moved the backdrop pointer-events setting into style, kept web pan/pinch handling at the viewport boundary with pointer capture beginning only after a real drag or pinch, and render shared Card elevation with web `boxShadow` while retaining native shadow props. This removes invalid React DOM event/deprecation warnings while preserving tap selection, drag navigation, keyboard access, native behavior, and elevated-card presentation.
- **`tests/constellation/constellation.acceptance.spec.ts` and `features/constellation/svg-rendering.test.ts`:** fail every owning browser test on console errors, uncaught page errors, or React/React Native Web warning signatures and pin the platform-specific SVG interaction boundary. Verification passes all 66 Constellation unit/contract tests and all 21 browser acceptance tests.

### Added (2026-07-28 — Constellation immutable concept references)
- **`docs/constellation/reference/5df3a3b/concepts/` and `docs/constellation/REFERENCE_CONCEPTS.md`:** restored the five original `handoff_constellation` concept PNGs byte-for-byte from commit `5df3a3b` into a commit-addressed documentation-only location, recorded their source and frame sizes, and documented the intentional production deviations for user-authored Note/Projection annotations, goal-specific virtual Bud/Rose/Thorn clusters, inspector data/actions, appearance, responsive behavior, and honest empty states.
- **`features/constellation/fixture-boundary.test.ts`:** pinned the exact reference filename set, PNG dimensions, and SHA-256 digests; added a production-wide import guard for the documentation reference tree; and covered deterministic preview query parsing.

### Changed (2026-07-28 — Deterministic Constellation preview states)
- **`previews/constellation/app/index.tsx`, `previews/constellation/README.md`, and `features/constellation/dev/`:** extended the isolated fixture preview with fixed `appearance=light|dark` and `state=canvas|goal|reflection|empty` parameters, deterministic Goal/Reflection/empty fixtures, production inspector presentation reuse without network reads, and documented canonical screenshot viewports. Production routes and real-data fallback behavior are unchanged.
- **`docs/constellation/DECISIONS.md` and `docs/constellation/CHANGELOG.md`:** recorded the immutable historical-reference boundary and made the prototype reconciliation explicit without changing the current domain contract.

### Added (2026-07-28 — Constellation web-first pan and zoom)
- **`features/constellation/components/ConstellationCanvasShell.tsx` and `features/constellation/viewport.ts`:** added a bounded graph-only viewport with left-pointer and one-finger drag pan, touch pinch zoom, wheel/touchpad pan, Control/Command-wheel zoom, keyboard arrow/plus/minus/zero controls, functional 44px zoom buttons, and an animated reset-to-fit that becomes immediate when reduced motion is enabled. The GPU-composited transform wraps only graph SVG content, leaving the header, legend, inspector, accessible list, and zoom chrome fixed; gesture updates do not rerender the render-budgeted nodes or edges.
- **`features/constellation/viewport.test.ts` and `package.json`:** added deterministic coverage for the `0.65×` to `2.5×` zoom range, focal-point preservation, reset-to-fit, and bounded pan at the existing 30-node/90-edge render limits.

### Changed (2026-07-28 — Constellation gesture dependency)
- **`package.json`, `package-lock.json`, `app/_layout.tsx`, and `previews/constellation/app/_layout.tsx`:** installed Expo SDK 55's supported `react-native-gesture-handler` `~2.30.0` as a direct dependency instead of relying on Expo Router's optional peer, and configured `GestureHandlerRootView` at both application roots. No edge authoring or drag-to-connect path was added; manual evidence linking remains exclusively in the validated Echo-to-goal reference workflow.

### Fixed (2026-07-28 — Constellation web SVG accessibility rendering)
- **`features/constellation/components/EarnedNodeShape.tsx`, `AnnotationShape.tsx`, and `VirtualBrtClusterShape.tsx`:** removed React Native accessibility and keyboard props from interactive SVG groups because React Native Web converted button-role `<G>` elements into invalid HTML `<button>` descendants inside the SVG, hiding earned nodes, annotations, and virtual BRT clusters and producing React DOM nesting/property warnings. SVG groups retain pointer selection.
- **`features/constellation/components/ConstellationAccessibleList.tsx` and `ConstellationCanvasShell.tsx`:** kept keyboard and screen-reader node selection in the existing visually hidden accessible-list layer using real `Pressable` controls, retained post-inspector focus restoration through those controls, and removed the invalid SVG focus path without changing graph selection architecture.
- **`features/constellation/svg-rendering.test.ts` and `package.json`:** added regression guards that prohibit DOM accessibility/keyboard props on interactive SVG groups while requiring pointer handlers and keyboard-selectable controls in the accessible list; the Constellation suite now runs the guard.
- **Verification:** all 63 `npm run test:constellation` tests, `npx tsc --noEmit`, `git diff --check`, and an isolated production-style Constellation web export passed. The exported fixture contains 31 SVG groups and 156 SVG shapes, zero button elements inside SVG, and 27 keyboard-selectable accessible-list node buttons outside SVG.

### Added (2026-07-28 — Constellation viewport navigation)
- **`features/constellation/components/ConstellationCanvasShell.tsx`, `features/constellation/viewport.ts`, `app/_layout.tsx`, `previews/constellation/app/_layout.tsx`, `package.json`, and `package-lock.json`:** added bounded mouse, touch, trackpad, wheel, pinch, button, and keyboard pan/zoom navigation around the existing static graph selection architecture, including reduced-motion-aware reset/zoom transitions, a stationary backdrop, and the required gesture-handler roots.
- **`features/constellation/viewport.test.ts`:** added deterministic coverage for fit reset, zoom limits, focal-point preservation, and bounded pan/zoom translation.

### Changed (2026-07-28 — Constellation production enablement)
- **`constants/features.ts`:** enabled `FEATURES.CONSTELLATION_ENABLED` after the release owner confirmed the current `main` artifact is deployed. The linked Supabase project already has migration 032, the required RLS boundaries, and completed Constellation verification; affected file: `constants/features.ts`.

### Changed (2026-07-28 — Constellation final rollout review)
- **`docs/constellation/DECISIONS.md` and `docs/constellation/CHANGELOG.md`:** documented the final release verification and the exact migration, API deployment, cross-user, retry, responsive-smoke, and build prerequisites for enabling `FEATURES.CONSTELLATION_ENABLED`. The flag remains `false` because this workspace cannot prove the intended deployment has migration 032 and the Constellation API routes live. No production fixture fallback, application code, migration, or feature-flag behavior changed.

### Changed (2026-07-28 — Constellation live database verification)
- **`docs/constellation/CHANGELOG.md`:** recorded that the linked Supabase project already has migration 032, all required Constellation tables, and RLS enabled, and that a self-cleaning two-user owner/cross-user smoke passed. The public flag remains disabled because the authenticated Vercel account has no Ohara project or team target for the required API deployment and deployed-browser smoke. No application code, migration, or feature-flag behavior changed.

### Changed (2026-07-28 — Constellation release hardening)
- **`features/constellation/components/ConstellationCanvasShell.tsx`, `EarnedNodeShape.tsx`, `AnnotationShape.tsx`, `VirtualBrtClusterShape.tsx`, `ConstellationAccessibleList.tsx`, `ConstellationInspectorSurface.tsx`, `ConstellationHeaderMetadata.tsx`, `ConstellationScreen.tsx`, `ConstellationGoalEvidencePanel.tsx`, `ConstellationReflectionInspector.tsx`, `ConstellationGenericInspector.tsx`, and `ConstellationAnnotationPanel.tsx`:** hardened the real-data renderer and inspectors for release: concept 1a remains the flat warm light treatment while concept 1b remains dark-theme-only; SVG nodes now have keyboard activation, visible focus rings, accessible labels, and enlarged hit areas; native uses the semantic node/edge-list fallback; all inspector close and header actions meet 44px targets; long labels are bounded; screen readers receive node provenance plus relationship summaries; and tablet/narrow inspector behavior accounts for both full and compact sidebars. This preserves functional-only controls and the existing Escape/focus-restoration behavior.
- **`features/constellation/graph.ts`, `tokens.ts`, `responsive.ts`, `svg-ids.ts`, `hooks/useReducedMotion.ts`, and `components/ConstellationLoadingMark.tsx`:** added deterministic responsive, render-edge, SVG-ID, and reduced-motion guards. The client now caps live rendering at 30 nodes, 6 edges per node, and 90 edges total; per-canvas SVG paint-server IDs are SSR-safe and unique; and indeterminate loading marks respect the platform reduced-motion preference without adding graph motion.

### Added (2026-07-28 — Constellation release hardening verification)
- **`features/constellation/graph.test.ts`, `responsive.test.ts`, `svg-ids.test.ts`, and `package.json`:** added targeted coverage for the 30-node/90-edge budget, compact-sidebar/tablet/narrow layout decisions, and collision-free SVG IDs. `npm run test:constellation` now includes these release guards.

### Added (2026-07-28 — Live Constellation inspectors and Focus mode)
- **`app/api/constellation/reflections/[id]+api.ts`, `lib/db/constellation.ts`, `features/constellation/services/constellation-server-service.ts`, `constellation-service.ts`, `dto.ts`, `types.ts`, and `hooks/useReflectionInspector.ts`:** added an owner-authenticated, on-demand Reflection inspector read. It resolves only active owned Reflection nodes, reads the matching live candidate and real valence history, verifies every contributing Echo under the same owner, returns server-bounded 240-character excerpts, and drops unavailable Echo IDs instead of disclosing them.
- **`features/constellation/components/ConstellationInspectorSurface.tsx`, `ConstellationGenericInspector.tsx`, and `ConstellationReflectionInspector.tsx`:** added the shared approximately 360px desktop/full-width narrow inspector surface, keyboard Escape close behavior, narrow focus containment, post-close node/canvas focus restoration, read-only earned-node details, and a first-class Reflection presentation with real occurrence, score, valence, and evidence data. No local BRT override or nonfunctional Draft Link action was added.
- **`features/constellation/components/ConstellationGoalEvidencePanel.tsx`:** promoted the existing goal-evidence workflow into the first-class Goal and virtual BRT-cluster inspector. Goal selection now shows live status, deadline, project, connection and evidence counts, grouped Bud/Rose/Thorn references, and Add/Edit/Unlink controls; a selected virtual cluster lists and manages only its referenced Echo group.

### Changed (2026-07-28 — Live Constellation inspectors and Focus mode)
- **`features/constellation/graph.ts`, `ConstellationScreen.tsx`, `ConstellationCanvasShell.tsx`, `ConstellationHeaderMetadata.tsx`, and `ConstellationAccessibleList.tsx`:** URL-selected entities now render their valid one-hop connected neighborhood in labeled Focus mode. Desktop canvas width reflows beside the fixed inspector column; narrow screens replace the canvas with a scrollable full-width inspector and a persistent Back action.
- **`features/constellation/components/ConstellationAnnotationPanel.tsx`:** selected Note and Projection drafts now open in a safe read-only inspector first, with explicit Edit and Archive actions. Create/edit behavior and exact optimistic rollback remain unchanged.
- **`features/echo/components/EchoScreen.tsx`:** added an owner-loaded `entryId` deep-link selection path so Reflection inspectors expose “Read in Echo” only for a returned live Echo destination. Missing or stale IDs produce no selection or disclosure.
- **`docs/API_CONTRACT.md` and `docs/constellation/CHANGELOG.md`:** documented the additive Goal inspector metadata, private Reflection inspector contract, responsive interaction behavior, and privacy/no-fake-override boundaries.

### Fixed (2026-07-28 — Live Constellation inspectors and Focus mode)
- **`features/constellation/components/ConstellationInspectorSurface.tsx` and `ConstellationScreen.tsx`:** close controls remain reachable on narrow screens, mutations cannot be dismissed mid-save, and malformed, missing, archived, or unauthorized URL selections continue to clear with replacement navigation without revealing ownership. Escape focus restoration now waits for the live-data graph target to remount after route navigation; an authenticated browser smoke test exposed the prior timing gap that left focus on the document body.
- **`features/constellation/dto.test.ts`, `graph.test.ts`, and `server.test.ts`:** added targeted coverage for focused-neighborhood isolation, expanded Goal inspector response validation, bounded real Reflection evidence/valence parsing, rejection of fake valence values, and unauthenticated Reflection inspector access.
- **Verification:** baseline and final `npx tsc --noEmit`, all 58 `npm run test:constellation` tests, a production-style Expo web export including the new Reflection API route, and `git diff --check` completed successfully. An authenticated live-Supabase browser smoke verified the real 26-goal/10-Echo empty graph, URL-selected Season inspector, fixed 360px desktop column, narrow Back/focus containment, Escape/Back focus restoration, and safe stale-selection cleanup without creating fixture records; the account had no qualified Goal or Reflection nodes for positive live inspector coverage.

### Added (2026-07-28 — Manual Echo evidence-reference workflow)
- **`app/api/constellation/goals/[id]/`, `lib/db/constellation.ts`, `features/constellation/services/constellation-server-service.ts`, `constellation-service.ts`, `dto.ts`, and `types.ts`:** added owner-scoped goal-evidence and searchable Echo-option reads for the existing evidence-reference mutations. The two thin routes return bounded Echo summaries, identify an existing selected-goal reference, reject non-owned goals or Echoes without disclosure, and never write canonical Echo containers, `echo_entry_links`, or `echo_entries.brt_user`.
- **`features/constellation/components/ConstellationGoalEvidencePanel.tsx`, `ConstellationBrtPicker.tsx`, `hooks/useGoalEvidence.ts`, and `ConstellationScreen.tsx`:** added the selected-goal Evidence inspector with recent/searchable owned Echo selection, semantic Bud/Rose/Thorn categorization, optional bounded notes, category/note editing, confirmed unlink, grouped evidence lists, and explicit loading, empty, duplicate, retry, saving, and rollback-aware interaction states.
- **`features/constellation/evidence-state.ts`, `evidence-state.test.ts`, `server.test.ts`, `dto.test.ts`, and `package.json`:** added deterministic state helpers and focused coverage for duplicate submission, category changes, exact unlink rollback, two-sided cross-user rejection, stale Echo-result suppression, DTO identity/category/bound validation, and virtual cluster/count recomputation.

### Changed (2026-07-28 — Manual Echo evidence-reference workflow)
- **`features/constellation/hooks/useConstellation.ts` and `components/ConstellationScreen.tsx`:** recompute the selected goal's virtual Bud/Rose/Thorn cluster nodes, derived cluster edges, and evidence counts immediately from the complete optimistic or authoritative evidence list while preserving earned nodes, annotations, persisted edges, and every other goal's evidence.
- **`docs/API_CONTRACT.md` and `docs/constellation/CHANGELOG.md`:** documented the owner-only read contracts, bounded Echo summaries, goal-specific category semantics, many-to-many containment boundary, retry behavior, and implementation/test scope.
- **Verification:** baseline and final `npx tsc --noEmit`, all 52 `npm run test:constellation` tests, `git diff --check`, and a production-style Expo web export completed successfully.

### Fixed (2026-07-28 — Manual Echo evidence-reference workflow)
- **`features/constellation/hooks/useGoalEvidence.ts`, `components/ConstellationGoalEvidencePanel.tsx`, `dto.ts`, and `evidence-state.ts`:** ignore stale searches from an older goal, query, or request; block add actions until the authoritative list is ready plus duplicate/in-flight submissions; reject oversized response fields; reconcile server idempotency by Echo/goal pair; and restore the exact prior evidence list and graph clusters when create, edit, or unlink fails.

### Added (2026-07-28 — User-authored Constellation annotations)
- **`features/constellation/components/ConstellationAnnotationPanel.tsx`, `ConstellationScreen.tsx`, `ConstellationCanvasShell.tsx`, `ConstellationHeaderMetadata.tsx`, `ConstellationEmptyState.tsx`, `AnnotationShape.tsx`, `ConstellationAccessibleList.tsx`, and `ConstellationLegend.tsx`:** added focused create/edit/archive authoring for user-authored Note and Projection drafts, including a desktop side inspector, a full-width narrow-screen surface, local cancel-without-write behavior, concise label and bounded-body validation, kind editing, visible earned-node anchors, duplicate-submit blocking, archive confirmation, accessible controls, retryable inline failures, and explicit user-authored origin labels in both visual and accessible graph representations.
- **`features/constellation/annotation-state.ts`, `hooks/useConstellation.ts`, `services/constellation-service.ts`, and `dto.ts`:** added authenticated client mutations with runtime response validation and exact immutable optimistic rollback for create, edit, and archive. Draft mutations update only active annotations and derived anchor presentation edges; earned counts, source evidence, visibility scores, candidate confidence, Traits, Tensions, and persisted system edges remain unchanged.
- **`features/constellation/annotation-state.test.ts`, `server.test.ts`, and `package.json`:** added deterministic coverage for draft-only optimistic updates, authoritative reconciliation, edit/anchor replacement, active-graph archival, immutable rollback snapshots, earned-domain isolation, note/projection-only request validation, bounded content, unknown identity fields, and empty edit rejection.

### Changed (2026-07-28 — User-authored Constellation annotations)
- **`features/constellation/services/constellation-server-core.ts`, `lib/db/constellation.ts`, `server.test.ts`, and `docs/API_CONTRACT.md`:** tightened annotation anchors to active owner nodes at the API data boundary and documented that the authoring surface offers only currently visible earned targets.
- **`features/constellation/state.ts`:** added scoped DTO replacement for annotation mutation reconciliation without moving graph or form data into the persisted global UI store.
- **`components/ui/Input.tsx`:** associated the existing visible input label with its native text input accessibility label so the new annotation fields and existing shared-input consumers are announced correctly.
- **`docs/constellation/CHANGELOG.md`:** recorded the end-to-end annotation authoring slice and its isolation/archival boundaries.
- **Verification:** baseline and final `npx tsc --noEmit`, all 44 `npm run test:constellation` tests, `git diff --check`, and a production-style Expo web export completed successfully.

### Fixed (2026-07-28 — Constellation live mutation smoke test)
- **`features/constellation/annotation-state.ts`, `annotation-state.test.ts`, and `components/ConstellationScreen.tsx`:** excluded synthetic fallback nodes such as `season:<derived-id>` from annotation anchor choices because the existing mutation API accepts only UUID-backed persisted earned nodes. The signed-in smoke test exposed the mismatch when the retryable create failure preserved the form after rejecting the fallback Current Season anchor.
- **`features/constellation/state.ts`, `state.test.ts`, and `components/ConstellationScreen.tsx`:** deferred invalid URL-selection cleanup while an annotation mutation is saving. This prevents optimistic archive from removing its selected draft, navigating the route, and aborting the archive request before it reaches the authenticated API; failures can now restore the exact DTO and remount the retryable inspector.

### Added (2026-07-27 — Live Constellation route integration)
- **`features/constellation/dto.ts`, `state.ts`, `hooks/useConstellation.ts`, and `services/constellation-service.ts`:** added runtime validation for the real versioned `GET /api/constellation` DTO plus feature-owned transient request state with cancellation, stale-response protection, retry classification, and last-successful-data retention during failed refreshes. This replaces the route's dashboard-count proxy without adding Constellation data, selection, filters, or annotations to the persisted global UI store.
- **`features/constellation/layout.ts`:** added deterministic static geometry for arbitrary live view models so earned nodes, user annotations, persisted system edges, and virtual goal-scoped Bud/Rose/Thorn clusters can use the existing renderer without production fixture coordinates or deferred force-layout behavior.
- **`features/constellation/dto.test.ts` and `state.test.ts`:** added client-contract and transient-state coverage for real-only DTO validation, locked-response privacy, retryable first-load errors, and safe stale-data refresh behavior.

### Changed (2026-07-27 — Live Constellation route integration)
- **`features/constellation/components/ConstellationScreen.tsx`, `ConstellationEmptyState.tsx`, `ConstellationSeedPreview.tsx`, `ConstellationCanvasShell.tsx`, `ConstellationHeaderMetadata.tsx`, and `copy.ts`:** connected the thin `/constellation` route to the real feature service and added explicit loading, access-gate, Season-only, patterns-forming, populated-graph, retryable-error, refreshing, and stale-refresh presentations. The graph keeps its accessible list representation, and empty states use real source counts and a neutral Current Season label rather than sample graph entities.
- **`features/constellation/graph.ts`, `graph.test.ts`, `layout.test.ts`, and `package.json`:** made `selected` URL keys resolve only against entities in the owner DTO, retain valid selected entities within the render budget, clear malformed/unknown/unauthorized keys with replacement navigation, and extended the targeted suite for live layout and URL-selection behavior.
- **`features/constellation/hooks/useConstellationGate.ts`:** removed the obsolete dashboard-summary hook after the route adopted the authoritative graph contract. Pure threshold rules remain for server assembly and access-count tests.
- **`constants/features.ts` and the isolated `previews/constellation/` harness:** intentionally remain behaviorally unchanged; the public `CONSTELLATION_ENABLED` flag stays disabled and no user-controlled production preview bypass was added.

### Added (2026-07-27 — Fixture-only static Constellation renderer)
- **`features/constellation/layout.ts` and `visual-tokens.ts`:** added a pure, deterministic layout layer that converts normalized 0–1 fixture coordinates into a stable `1200 × 760` viewBox, calculates curved edge paths and sprouted-label geometry outside rendering, and maps the shared light/dark semantic themes into graph-specific visual roles without component-local RGBA colors.
- **`features/constellation/components/ConstellationCanvasShell.tsx`, `EarnedNodeShape.tsx`, `AnnotationShape.tsx`, `VirtualBrtClusterShape.tsx`, `ConstellationEdge.tsx`, `SelectionRing.tsx`, `SproutedLabel.tsx`, `ConstellationLegend.tsx`, `ConstellationHeaderMetadata.tsx`, and `ConstellationAccessibleList.tsx`:** added the static `react-native-svg` renderer with concept-1a/1b hierarchy, density, orbit/halo treatment, all six earned shapes, visibly dashed and labeled draft annotations/projections, goal-scoped Bud/Rose/Thorn reference summaries, semantic edge styles, working fixture selection, and a native/screen-reader list fallback. Pan/zoom and inactive Timeline, Archive, Filter, Draft Link, and zoom chrome remain absent by design.
- **`features/constellation/dev/`, `previews/constellation/`, and `app.config.js`:** added a synthetic development fixture plus an isolated Expo Router app root for light (`/`) and dark (`/?appearance=dark`) screenshot QA. A preview-only manifest override selects that app root only when the dedicated script sets `OHARA_PREVIEW_ROUTER_ROOT`; the default manifest behavior is unchanged. The preview labels itself as fixture data and does not change or import into the production `/constellation` route.
- **`features/constellation/layout.test.ts` and `fixture-boundary.test.ts`:** added coverage for stable normalized layout output, viewBox bounds, draft/earned provenance, virtual-cluster goal context and counts, sprouted-label geometry, and a static guard that rejects fixture or preview imports from production routes and production Constellation modules.

### Changed (2026-07-27 — Fixture-only static Constellation renderer)
- **`package.json`:** added `npm run preview:constellation` for the isolated QA harness and extended `npm run test:constellation` with the renderer layout and production-import-boundary suites.
- **`docs/constellation/CHANGELOG.md`:** recorded the static renderer slice, its explicit development-only fixture boundary, and the intentionally deferred production wiring and interaction controls.

### Added (2026-07-27 — Constellation server data layer and authenticated APIs)
- **`lib/db/constellation.ts`, `features/constellation/services/constellation-server-core.ts`, and `constellation-server-service.ts`:** added fixed-query, paginated, owner-scoped Supabase reads plus deterministic DTO assembly for real earned nodes, active annotations, valid system/derived edges, exact source counts, and virtual goal-level Bud/Rose/Thorn evidence summaries. The adapter preserves the active/complete-grace goal rules, filters inactive source projects, counts only lifetime non-draft goals toward the retained three-goal access threshold, supplies a stable opaque Season fallback when needed, keeps `accessEligible` distinct from `hasGraphData`, and never selects Echo bodies/excerpts or fixtures.
- **`app/api/constellation/`:** added authenticated `GET /api/constellation`; annotation create/edit/archive routes; and evidence-reference create-or-update/edit/delete routes. All writes derive ownership from the bearer session, use a JWT-scoped Supabase client so RLS remains active, return stable client-safe 400/404/409 envelopes, and restrict evidence mutations to `constellation_evidence_links` so canonical Echo containers and `echo_entries.brt_user` cannot change.
- **`features/constellation/server.test.ts` and `package.json`:** extended `npm run test:constellation` with deterministic auth, ownership, empty-graph, multi-goal Echo evidence, concurrent duplicate recovery, idempotent category-update, annotation lifecycle, private-note bound, deletion, and safe error-translation coverage.

### Changed (2026-07-27 — Constellation server data layer and authenticated APIs)
- **`features/constellation/types.ts` and `graph.ts`:** tightened DTO selection/virtual-ID contracts to the approved template-literal forms and added typed annotation/evidence write contracts while preserving the existing development/test-only fixture boundary.
- **`lib/api/constellation.ts`, `lib/api/auth.ts`, and `docs/API_CONTRACT.md`:** centralized Constellation request validation and stable response translation, made the shared auth helper directly import its database dependency for deterministic route testing without changing behavior, and documented the additive owner-only Expo API contracts and private-data limits.
- **`docs/constellation/CHANGELOG.md`:** recorded the authenticated data-layer slice, its no-N+1/no-fixture/no-Echo-content boundaries, and the deterministic verification scope.

### Added (2026-07-27 — Constellation persistence and database security)
- **`supabase/migrations/032_constellation_persistence.sql`:** added normalized, owner-scoped persistence for system-managed earned nodes and graph edges, user-authored draft annotations, and manual Echo-to-goal Evidence Links. The migration enforces the six-kind earned taxonomy, typed source provenance, same-owner source FKs, duplicate-active-source prevention, annotation provenance/lifecycle checks, immutable evidence endpoints with mutable bounded Bud/Rose/Thorn categorization, explicit source-deletion behavior, graph/source lookup indexes, and RLS on every new table; virtual BRT clusters remain derived and no `echo_entry_links` or `brt_user` behavior is changed.
- **`scripts/test-constellation-security.sh`, `constellation-security-bootstrap.sql`, and `constellation-security.test.sql`:** added a credential-free, disposable PostgreSQL 16 harness that applies migration 032 to an isolated source-schema fixture and verifies cross-user reads/writes, forged ownership, invalid annotation/BRT values, duplicate and updatable evidence relations, annotation archival, FK cascades/anchor nulling, system-table write denial, and preservation of the one-confirmed Echo container invariant.

### Changed (2026-07-27 — Constellation persistence and database security)
- **`types/supabase.ts`:** added generated-style Row/Insert/Update/Relationship shapes for `constellation_nodes`, `constellation_edges`, `constellation_annotations`, and `constellation_evidence_links`.
- **`Context.md`, `supabase/CLAUDE.md`, `docs/constellation/DECISIONS.md`, and `docs/constellation/CHANGELOG.md`:** recorded migration 032 as the current Constellation persistence boundary and advanced the next migration number to 033 so later schema sessions do not reuse 032.

### Added (2026-07-27 — Constellation access gate and concept 1e empty state)
- **`features/constellation/services/constellation-service.ts`, `gate.ts`, and `hooks/useConstellationGate.ts`:** added a typed, authenticated wrapper for the existing dashboard summary endpoint and a feature-owned onboarding gate with explicit loading, success, retryable-error, cancellation, and stale-response handling. The gate exposes `accessEligible` independently from `hasGraphData`, which remains unknown because activity counts cannot prove an earned graph entity exists.
- **`features/constellation/components/ConstellationSeedPreview.tsx`, `ConstellationEmptyState.tsx`, and `ConstellationScreen.tsx`:** added the responsive concept-1e seed-and-ghost-orbit onboarding view, accessible headings and progress bars, intentional loading/retry UI, and working Set a goal / Write an Echo actions without rendering a mock unlocked graph.
- **`features/constellation/gate.test.ts` and `package.json`:** added deterministic coverage for the onboarding thresholds, invalid dashboard-summary payloads, and the rule that counts never infer graph data.

### Changed (2026-07-27 — Constellation access gate and concept 1e empty state)
- **`app/(app)/constellation.tsx` and `features/constellation/copy.ts`:** made the app route a thin feature-screen consumer and centralized the concept-1e copy while retaining `FEATURES.CONSTELLATION_ENABLED: false` and leaving `ConstellationSample` unchanged.
- **`docs/constellation/CHANGELOG.md`:** recorded this shippable slice and the exact dashboard-summary limitation: it returns all-time goals across all statuses, including drafts, so the current “Set 3 goals” progress cannot be strictly lifetime non-draft without a separately scoped endpoint change.

### Added (2026-07-27 — Constellation feature foundation)
- **features/constellation/types.ts, copy.ts, tokens.ts, graph.ts, and fixtures.ts:** added an isolated, production-data-only Constellation domain foundation with discriminated earned nodes, annotations, virtual BRT clusters, and graph edges; semantic lowercase bud/rose/thorn values; explicit kind-versus-valence edge semantics; deterministic development/test fixtures; and pure graph selection, validation, filtering, grouping, adaptation, and render-budget utilities. No route, API, database, feature flag, or UI-store behavior changed.
- **features/constellation/graph.test.ts, package.json, and tsconfig.json:** added the Node built-in Constellation test harness and test:constellation script, with TypeScript extension imports enabled for Node's built-in type stripping. The suite covers malformed edges, duplicate IDs, empty graphs, evidence grouping, stable virtual BRT IDs, annotation exclusion from earned counts, and the 30-node render budget.
- **docs/constellation/CHANGELOG.md:** added the session-ordered Constellation implementation changelog, documenting the feature slice, deterministic-fixture boundary, and verification scope.

### Added (2026-07-27 — Canonical Constellation decision and graph contract)
- **`docs/constellation/DECISIONS.md`:** added the canonical Constellation domain and implementation contract so earned nodes, user-authored annotations, manual Echo evidence, virtual BRT clusters, edge kind/valence semantics, graph DTO, ownership, archival/deletion, URL selection, excerpt privacy, production-data rules, delivery phases, and migration sequencing have one source of truth.

### Changed (2026-07-27 — Canonical Constellation decision and graph contract)
- **`ohara_constellation_spec.md`:** reconciled stale goal statuses and phase language with the current schema, locked the six-kind earned taxonomy, and deferred conflicting annotation, Evidence Link, virtual-cluster, DTO, and production-data details to the canonical decision record.
- **`Context.md`:** replaced the stale migration-011/next-012 and four-status guidance with the repository's current migration-031/next-032 ledger, the six current goal statuses from `lib/goals/schema.ts`, and a compact Constellation contract summary.
- These documentation changes prevent the old handoff's already-consumed migration 012, mock-production graph, future-node, and relationship-as-valence assumptions from driving implementation. Affected files: `docs/constellation/DECISIONS.md`, `ohara_constellation_spec.md`, `Context.md`, and `CHANGELOGCODEX.md`.
### Added
- Added `components/landing/PublicMomentumTrendChart.tsx` with compact, standard, and expanded public chart variants, instance-safe SVG gradients and clipping, responsive axes, and the existing public seven-point sample trend.
- Added reusable public-experience primitives for the shared navigation, responsive page canvas, buttons, feature previews, footer, and authentication shell in `components/landing/PublicPrimitives.tsx` and `components/landing/PublicAuthShell.tsx`, with a consistent accessible focus treatment in `global.css`.
- Added separately exported official vein, branch, and wood-grain artwork under `assets/brand/artwork/` plus the responsive, decorative-only `components/landing/BrandArtwork.tsx` presentation layer.

### Changed
- Upgraded the authenticated shared `MomentumTrendChart` used by the Home dashboard, expanded dashboard preview, and Momentum page with the same polished curved line, clipped sage gradient, restrained markers, subtle axes/gridlines, responsive labels, and light/dark theme treatment as the public preview while preserving all existing sample datasets and range controls.
- Replaced the default-looking public Momentum graphs with a shared curved OHARA-green trend, clipped area gradient, restrained markers, subtle axes and gridlines, responsive tick density, and explicit Preview hierarchy without changing public sample values or Momentum calculations.
- Redesigned the code-native landing page around the official OHARA logo, canonical warm/forest palette, Inter typography, layered product previews, alternating product sections, and responsive editorial layout in `components/landing/LandingPage.tsx`.
- Updated `app/about.tsx`, `app/(auth)/login.tsx`, and `app/(auth)/signup.tsx` to share the same public visual system while preserving their existing routes and authentication handlers.
- Refactored `components/landing/PublicNav.tsx` to expose the shared responsive public header across existing public and authentication routes.
- Rebuilt the landing hero preview stage with coordinated desktop layering, non-overlapping tablet/mobile layouts, a stronger irregular organic imprint, and fully contained preview cards in `components/landing/LandingPage.tsx` and `components/landing/PublicPrimitives.tsx`.
- Replaced the oversized public Constellation examples with shared compact and detailed SVG variants in `components/constellation/PublicConstellation.tsx`, retaining the existing `ConstellationSample` entry points.
- Replaced the landing page’s manual goal-builder mockup with an inert, code-native Chat with Echo preview in `components/landing/AIGoalCreationPreview.tsx`, and changed the hero to preserve one proportional composed stage through desktop and tablet widths before switching to a mobile list.
- Replaced the generated public leaf approximation with the supplied OHARA artwork across the hero, selected landing sections, About page, and authentication shell; reduced public-header and landing-section divider contrast without changing layout or interactions.
- Replaced the hero product stack’s leaf-vein backdrop with the supplied official wood-grain artwork, extending the transparent treatment across the full preview stage to avoid visible artwork boundaries.
- Expanded the subtle official wood-grain treatment behind the complete landing hero row and slightly increased its visibility while preserving hero content hierarchy and responsive structure.
- Removed the hero artwork’s inset/rotation boundary and extended the same lower-contrast, borderless wood-grain backdrop across every remaining light landing-page row.
- Moved the hero artwork layer to the full-width row container so every textured landing section fills both axes while its readable content remains centered at the existing maximum width.

### Fixed
- Made the previously present-but-invisible Constellation rings readable in both rendered themes and replaced the dark light-green spotlight with the semantic deep-green visualization field.
- Made Product, Echo, Momentum, and Constellation public-header links scroll the landing page’s internal web scroll container reliably from both the landing page and other public routes.

### Added (2026-07-27 — Reusable app calendar picker)
- **`components/ui/DatePicker.tsx`:** added a token-driven, cross-platform calendar picker with human-readable trigger text, month navigation, temporary selected-date state, minimum/maximum bounds, accessible 44px day targets, optional clearing, and explicit Cancel/Apply behavior.

### Changed (2026-07-27 — Reusable app calendar picker)
- **`components/ui/DateField.tsx`:** removed the now-unused legacy date-field alias so `components/ui/DatePicker.tsx` is the sole date-input implementation.
- **`app/goals/create.tsx` and `features/goals/components/GoalReviewScreen.tsx`:** routed manual and AI-reviewed goal deadlines and milestone dates through the shared picker.
- **`features/goals/components/CountdownTimer.tsx`, `MilestonesPanel.tsx`, and `ExtendGoalModal.tsx`:** routed goal end-date editing, milestone add/edit dates, and custom goal-extension deadlines through the shared picker and its local-calendar helpers while preserving existing validation and persistence contracts.
- **`components/CLAUDE.md`:** documented `DatePicker` as the sole source of truth for future user-facing date inputs.
- Verification: `npx tsc --noEmit`, `git diff --check`, and a production-style Expo web export passed.

### Changed (2026-07-27 — Momentum page formatting)
- **`app/(app)/momentum.tsx` and `features/goals/components/GoalEchoAnalysisCard.tsx`:** replaced the active-goal preview grid with full-width, category-icon rows whose desktop regions align independently of title length and stack cleanly on narrow screens; also normalized section spacing and removed forced secondary-card heights without changing filters, mappings, values, copy, or navigation.
- **`features/momentum/components/MomentumTrendChart.tsx` and `app/(app)/dashboard.tsx`:** upgraded the shared sample chart with a 0–100 Y-axis, range-appropriate time labels, visible axes and titles, and theme-aware horizontal/vertical gridlines on the Momentum page and expanded dashboard preview while preserving the compact dashboard sparkline.

### Added (2026-07-27 — Momentum page prototype)
- **`app/(app)/momentum.tsx` and `app/(app)/_layout.tsx`:** added the responsive `/momentum` prototype route with a shared sample trend, local time-range controls, preview drivers, active-goal category previews, an explicit activity empty state, sample Echo patterns and guidance, and an accessible How Momentum works modal without new APIs, persistence, AI, or calculations.
- **`features/momentum/components/MomentumTrendChart.tsx`:** extracted the existing code-native SVG trend into a reusable sample-chart component for the dashboard and Momentum page.

### Changed (2026-07-27 — Momentum page prototype)
- **`components/layout/Sidebar.tsx`:** added Momentum between Journey and Echo using the existing Ionicons trend treatment while preserving active, hover, responsive, and collapsed navigation behavior.
- **`app/(app)/dashboard.tsx`, `app/(app)/goals/[id]/index.tsx`, `features/goals/components/IntelligencePanel.tsx`, and `GoalEchoAnalysisCard.tsx`:** added explicit See full Momentum navigation to the dashboard overview and both standalone and embedded goal previews; goal-aware links pass the existing goal ID for safe local highlighting, while the shared preview retains all category mappings and canonical accents.

### Changed (2026-07-27 — Dashboard width and shared Goal Momentum)
- **`app/(app)/dashboard.tsx`:** widened the centered dashboard container to a fluid 1560px maximum with responsive viewport padding and renamed the dashboard sample presentation to Ohara Momentum without changing its placeholder data or interactions.
- **`features/goals/components/GoalEchoAnalysisCard.tsx`:** renamed the shared category-specific preview to Goal Momentum and added an embedded presentation variant that preserves the exact category mappings, canonical accents, Preview label, and neutral fallback.
- **`features/goals/components/IntelligencePanel.tsx` and `app/(app)/goals/[id]/index.tsx`:** embedded the shared Goal Momentum preview directly below the existing AI summary on every goal-detail screen and italicized only the insight prose without changing generation, retrieval, actions, or navigation.

### Added (2026-07-27 — Dashboard hierarchy and Momentum prototype)
- **`app/(app)/dashboard.tsx`:** added a code-native seven-point sample Momentum card and expanded sample panel, plus an accessible floating Create menu backed only by the existing goal route and project modal; the reflection option remains disabled and labeled Coming soon because no safe direct composer route exists.
- **`features/goals/components/GoalEchoAnalysisCard.tsx`:** added a shared, category-aware Echo Analysis preview for expanded standalone dashboard goals using the seven specified sample metrics, canonical category accents, and a neutral fallback without any API, AI, or mutation behavior.

### Changed (2026-07-27 — Dashboard hierarchy and Momentum prototype)
- **`app/(app)/dashboard.tsx`:** consolidated the live Today’s Focus feed into one compact three-row summary, rebalanced responsive section spacing, reduced Echo to a two-line recent-reflection preview, and made section-level creation actions visually secondary.
- **`app/(app)/dashboard.tsx`:** added each focus goal’s existing stored progress percentage and a compact indicator, explicitly labeled Momentum as Preview, and integrated Echo Analysis only into expanded standalone-goal details.
- **`features/goals/components/ProjectGoalRow.tsx` and `store/uiStore.ts`:** made compact standalone-goal rows the migrated default and added optional dashboard disclosure controls while preserving goal navigation and the existing detailed card content.
- **`components/layout/Sidebar.tsx`:** automatically uses the existing collapsed sidebar presentation below 720px so the dashboard remains usable at mobile widths without changing stored desktop sidebar preferences.

### Added (2026-07-27 — Manual goal creation visual alignment)
- **`components/ui/GoalCreationModeToggle.tsx`:** added a shared creation-mode segmented control so manual and Echo goal creation use the same centered dimensions, spacing, styling, and selected states without shifting between modes.

### Changed (2026-07-27 — Manual goal creation visual alignment)
- **`app/goals/create.tsx`:** refined all four manual goal-creation steps with Echo-inspired input surfaces, accessible theme-aware focus treatment, tighter desktop spacing, consistent content rhythm, and a responsive centered 2/3/2 category-card layout while preserving wizard behavior and every canonical category accent.
- **`app/goals/create.tsx`:** kept medium-width categories in two columns while sizing and centering the final Personal Growth card like its peers instead of allowing it to span the row.
- **`features/goals/components/AIGoalCreation.tsx`:** moved the entry-mode toggle presentation to the shared parent-level control and rebalanced entry spacing without changing AI behavior.

### Added (2026-07-24 — Username editing and rolling change limit)
- **`supabase/migrations/031_username_change_limit.sql`:** added a protected per-user rolling-window counter and database trigger that allows at most three successful username changes in any seven-day period, including for direct profile updates.
- **`app/api/profile/index+api.ts`:** added username reads and writes, shared username normalization/validation, duplicate and rate-limit responses, and remaining-change status for the Account UI.

### Changed (2026-07-24 — Username editing and rolling change limit)
- **`components/layout/AccountModal.tsx`:** replaced the Display name field with an availability-checked Username field, remaining-change guidance, and authoritative server error handling while retaining the stored display name for existing avatar and social surfaces.
- **`components/layout/AvatarMenu.tsx`, `components/ui/Input.tsx`, `lib/api/contracts.ts`, and `types/supabase.ts`:** refresh the account chrome immediately after username changes, expose username-ready input behavior and rate-limit contracts, and describe the new limiter table.
- **`supabase/CLAUDE.md`:** documented migration 031 and advanced the next migration number to 032.
- Verification: `npx tsc --noEmit`, `npm run test:friends`, `git diff --check`, and an Expo web export passed; a disposable PostgreSQL 16 harness verified the three-change rolling limit, unchanged/failed update accounting, expiry pruning, and normalization. Migration 031 was applied to the linked Supabase project, local/remote migration history is aligned through 031, and linked `db lint` reported no schema errors.

### Changed (2026-07-24 — Settings in anchored account panel)
- **`features/friends/components/FriendsPopover.tsx`, `features/friends/components/types.ts`, `components/layout/AvatarMenu.tsx`, and `components/layout/SettingsModal.tsx`:** changed desktop Settings navigation to render the existing preferences and archived-goals menu in the anchored account surface's right-side panel, matching Friends, Requests, and Add People while preserving the compact/mobile Settings modal.

### Added (2026-07-24 — Anchored desktop Friends and account UI)
- **`features/friends/components/`:** added the prop-driven 720/240/480 anchored desktop account/Friends surface with Friends, Requests, and Add tabs; viewport-clamped scrolling; intentional loading, refresh, retry, empty, search, and per-row mutation states; structured cooldown copy; accessible tab keyboard navigation; and informational-only friend rows.

### Changed (2026-07-24 — Anchored desktop Friends and account UI)
- **`components/layout/AvatarMenu.tsx`:** routes the avatar trigger to the anchored Friends surface on web at 900 px and above when `SOCIAL_ENABLED`, preserves the existing compact menu below the breakpoint and while the flag is disabled, restores trigger focus on dismissal, reloads account chrome on user changes, and resolves the signed-in account's real username for the rail summary.
- **`constants/colors.ts`:** added semantic overlay and elevated-shadow effect tokens so the new anchored shell uses the shared light/dark theme instead of component-local colors.
- **`constants/features.ts`:** enabled `SOCIAL_ENABLED` for the user-run signed-in desktop verification after the automated Friends tests, typecheck, diff validation, and Expo web export passed.

### Added (2026-07-24 — Friends client state and concurrency)
- **`features/friends/services/friends-service.ts`, `state-core.ts`, `store.ts`, `hooks/useFriends.ts`, and `types.ts`:** added feature-owned authenticated API wrappers, `ApiResponse` error unwrapping with structured cooldown metadata, the Zustand Friends snapshot/search/controller state, and stable per-connection/per-profile mutation state for the anchored Friends UI.
- **`scripts/test-friends-client-state.mjs` and `package.json`:** added deterministic client-state coverage for concurrent entity mutations, exact optimistic rollback, queued refresh during single-flight hydration, authoritative/idempotent sent-request IDs, already-handled reconciliation, stale/cleared searches, query normalization, and reset generation guards.

### Changed (2026-07-24 — Friends client state and concurrency)
- **`store/clearAllStores.ts` and `app/_layout.tsx`:** reset and abort all Friends work during logout or account-ID changes so a prior account's snapshot, searches, or in-flight mutations cannot populate the next account.

### Fixed (2026-07-24 — Friends client state and concurrency)
- **`features/friends/state-core.ts`:** used entity-specific optimistic forward/inverse patches, per-row operation tokens, queued explicit refreshes, abort plus monotonic search guards, and post-race snapshot reconciliation so unrelated successful mutations and newer relationship state survive concurrent failures and out-of-order responses.

### Added (2026-07-24 — Friends API and server data layer)
- **`features/friends/types.ts`, `lib/db/friends-core.ts`, and `lib/db/friends.ts`:** added the typed Friends snapshot/search/mutation contracts, deterministic row-to-domain mapping, paged connection reads, connection-scoped batched profile hydration, relationship annotation, RPC-only mutations, stable domain-error translation, and structured seven-day cooldown metadata required by the initial Friends surface.
- **`app/api/friends/index+api.ts`, `search+api.ts`, `request+api.ts`, `[id]/accept+api.ts`, and `[id]/decline+api.ts`:** added the authenticated production Friends routes without a redundant requests endpoint or any direct `friend_connections` mutation.
- **`scripts/test-friends-api.mjs` and `package.json`:** added a deterministic `npm run test:friends` harness covering snapshot ordering, all search relationship labels, UUID/prefix rejection, and safe RPC error classification without live mutations.

### Changed (2026-07-24 — Friends API and server data layer)
- **`lib/api/friends.ts`:** centralized Friends request validation and `ApiResponse` construction so expected invalid, missing, conflict, forbidden-transition, and cooldown failures have stable client-safe envelopes while unexpected Supabase/PostgreSQL prose remains server-only.

### Fixed (2026-07-24 — Password recovery Site URL fallback)
- **`app/index.tsx` and `app/(auth)/forgot-password.tsx`:** send password recovery through the configured Supabase Site URL and forward one-time PKCE codes that arrive at `/` into the existing auth callback, preventing valid reset links from rendering the marketing landing page and then expiring unused.

### Added (2026-07-24 — End-to-end password recovery)
- **`app/(auth)/login.tsx`, `forgot-password.tsx`, `callback.tsx`, and `reset-password.tsx`:** added a visible Forgot password link, privacy-preserving reset-email request flow through the existing authorized callback, recovery-link validation and routing, matching-password checks, and authenticated Supabase password update with a return to the dashboard.
- **`lib/auth/redirects.ts`:** added a shared environment-aware auth redirect URL resolver so signup confirmations and password recovery both work on local, preview, and production web origins.

### Changed (2026-07-24 — End-to-end password recovery)
- **`app/(auth)/signup.tsx`:** reused the shared auth redirect resolver without changing the existing confirmation callback behavior.
- **`app/_layout.tsx` and `lib/db/client.ts`:** allowed temporary recovery sessions to complete on the callback and reset-password routes, and made the callback the single owner of PKCE code exchange so automatic URL detection cannot consume the same one-time code first.
- Verification: `npx tsc --noEmit`, `git diff --check`, and an Expo web export passed; an isolated auth-js PKCE harness confirmed recovery exchanges return the `PASSWORD_RECOVERY` redirect type used by the callback router.

### Added (2026-07-24 — Friend connection security foundation)
- **`supabase/migrations/030_friend_connection_security.sql`:** added capability-scoped friend mutations, immutable connection participants, a database-enforced pending-to-accepted/declined lifecycle, response timestamp consistency, idempotent outgoing requests, a seven-day same-direction cooldown after decline, and connection-scoped profile hydration so the social graph is secure before the Friends UI consumes it.
- **`scripts/test-friend-security.ts`:** added a self-cleaning three-user Supabase security harness covering forged/direct writes, participant isolation, request/response authorization, idempotency, hydration scope, decline cooldown, and reverse-direction agency.
- **`handoff_account_tab/`:** preserved the anchored desktop account/Friends prototype as an excluded, non-shippable reference bundle for the upcoming implementation sessions.
- **`docs/handoffs/friends/02_api_data_layer.md`, `03_client_state.md`, and `04_anchored_desktop_ui.md`:** added self-contained implementation prompts with explicit API, concurrency, and anchored-UI ownership so decisions and follow-ups remain in the appropriate session.

### Changed (2026-07-24 — Friend connection security foundation)
- **`types/supabase.ts`:** added the generated-contract shapes for `send_friend_request(uuid)` and `respond_to_friend_request(uuid,text)`.
- **`tsconfig.json`:** excluded the non-shippable `handoff_account_tab` reference bundle from application compilation while preserving it as the source prototype for the upcoming anchored Friends surface.
- **`supabase/CLAUDE.md` and `docs/DECISIONS.md`:** documented migration 030, the next migration number, the capability-scoped relationship model, and the intentionally deferred relationship/profile/mobile lifecycle work.
- **Linked Supabase migration state:** confirmed migrations 028 and 029 were already live through read-only table/RPC probes, repaired their missing migration-history records to `applied`, and applied migration 030. The live three-user security harness passed every authorization, isolation, lifecycle, hydration, and cooldown check and deleted its temporary users.

### Fixed (2026-07-24 — Friend connection security foundation)
- **`supabase/migrations/030_friend_connection_security.sql`:** closed migration 028's ability to forge accepted edges through direct inserts, repaired the pending-response path that its implicit `WITH CHECK` blocked, and removed the arbitrary authenticated-profile hydration path from `get_profiles_by_ids(uuid[])`.

### Changed (2026-07-23 — Live migration 029)
- **`supabase/migrations/029_check_username_available.sql` and `supabase/CLAUDE.md`:** applied the committed anonymous-safe username availability function to the live Supabase project and verified taken, available, malformed, null, and anonymous-role calls plus the required `anon` and `authenticated` execute grants.

### Fixed
- **`package.json` and `package-lock.json`:** added the missing `@expo-google-fonts/lora` runtime dependency so clean Vercel installs can resolve the Lora imports in `app/_layout.tsx`.
- **`features/goals/components/AIGoalCreation.tsx` and `app/api/goals/chat+api.ts`:** kept the UI-only greeting out of LLM history and now validate user-first, alternating chat roles, preventing Anthropic goal-creation calls from failing on an initial assistant message.
- **`docs/AI_RESPONSE_SCHEMA.md`:** synchronized the documented finalization contract with the live three-template goal pipeline and current categories, tracker cadence, deadlines, and target-frequency rules.

### Added (2026-07-22 — Echo focused goal-creation redesign)
- **`features/goals/components/AIGoalCreation.tsx`, `components/ui/FocusedChatMessageList.tsx`, `features/goals/components/EchoGoalDraftCards.tsx`, `constants/focused-tokens.ts`, and `app/goals/create.tsx`:** added the focused Echo entry, bubble-less conversation, responsive concrete/open draft pair, and full-draft fallback while preserving the existing AI contract and manual wizard handoff.
- **`supabase/migrations/027_goal_draft_status.sql`, `lib/goals/schema.ts`, `lib/db/goals.ts`, and `app/api/goals/index+api.ts`:** added the persisted `draft` goal status and narrowly extended goal creation so Save draft safely stores the same validated review payload without changing the default active-goal path.
- **`lib/navigation/dashboard.ts` and `app/(app)/dashboard.tsx`:** added the Dashboard Drafts filter and post-save confirmation toast, including drafts associated with projects.

### Changed (2026-07-22 — Echo focused goal-creation redesign)
- **`features/goals/components/GoalTemplateCards.tsx` and `GoalReviewScreen.tsx`:** restyled the template/review stages for the focused dark treatment, added touch-friendly expand-then-choose cards, and added the outlined Save draft footer action.
- **`app/_layout.tsx`, `package.json`, and `package-lock.json`:** restored the bundled Lora faces for the focused Echo-only serif hierarchy while retaining Inter as the shared UI typeface.
- **`components/ui/Badge.tsx`, `GoalCard.tsx`, and `GoalDetailHeader.tsx`:** render the new draft status consistently when users filter or open saved drafts.
- **`tsconfig.json`:** excludes the static `handoff_goal_ui_redesign` reference bundle from app type-checking because its intentionally non-shippable skeletons target a different schema.

### Changed (2026-07-22 — Unified application typography on Inter)
- **`components/ui/Typography.tsx`, `tailwind.config.js`, `app/_layout.tsx`, `package.json`, and `package-lock.json`:** routed shared AI, greeting, and body typography through the loaded Inter faces and removed the Lora registrations/dependency so the app uses one font family with intentional regular, medium, semibold, bold, and italic roles.
- **Goal creation/detail components and landing surfaces:** replaced remaining Lora font overrides with matching Inter weights while preserving existing sizes, line heights, spacing, and canonical color tokens; added Inter to a few raw text/glyph exceptions that could fall back to the platform font.
- **`components/CLAUDE.md`, `docs/CLAUDE.md`, and `Context.md`:** aligned the typography guidance with the Inter-only UI baseline.

### Changed (2026-07-22 — Goal-creation AI reworked for 3-template output)
- **`lib/ai/prompts/goal-creation.ts`:** rewrote `GOAL_CREATION_SYSTEM_PROMPT` from the old three-stage Spark/Shape/Draft flow to a two-phase (Explore/Ready) goal-formation-coach model — natural conversation of 1-3 turns, max 2 follow-up questions, no user-visible SMART jargon, no category-by-name suggestions, warm/direct tone. `[[GOAL_READY]]` now fires after a fixed transition sentence once the AI has enough signal to build 3 distinct approaches. Rewrote `GOAL_CREATION_FINALIZE_PROMPT` and `GOAL_CREATION_FINALIZE_RETRY_PROMPT` to emit exactly 3 goal templates (`templates[]`, `derived_category`, `reasoning`, `assumptions`), each with `strategy_name`, `goal.smart`, milestones, trackers, and `target_frequency`. Tracker `frequency` now allows `null` and the prompts explicitly forbid the removed `once` value; only the 7 `GOAL_CREATION_CATEGORIES` are referenced.
- **`lib/ai/schemas/goal-creation.ts`:** replaced the single-goal `GoalFinalizeResponse` type/validator/parser with the 3-template contract. New exports: `GoalTemplateMilestone`, `GoalTemplateTracker`, `GoalTemplateTargetFrequency`, `GoalTemplateOption`, `GoalTemplateResponse`, `ValidateResult`, `validateGoalTemplateResponse()`, `parseGoalTemplateResponse()`. Validator enforces exactly 3 templates, category ∈ 7 creation categories, future ISO deadline, all 5 SMART keys, counter/checklist tracker rules, nullable frequency, and `target_frequency` shape; returns a `{ success, data|error }` result instead of throwing. The old finalize types/functions were deleted (confirmed no other file imported them).
- **`lib/ai/config.ts`:** raised `maxTokens.goalFinalize` 1024 → 2500 for the 3-template payload; added `goalChat` pipeline (`{ enabled: true, model: 'default' }`) and `maxTokens.goalChat: 1024` as the new alias for conversation turns, keeping `goalCreation` for backward compatibility.

### Validation
- `npx tsc --noEmit` clean. Ran a runtime harness confirming the validator accepts a well-formed 3-template payload, rejects a 2-template payload, rejects a counter tracker missing `targetValue`, rejects `frequency: 'once'`, and that `parseGoalTemplateResponse` strips markdown fences.

### Changed (2026-07-22 — Linear project goal entries)
- **`features/goals/components/ProjectGoalRow.tsx` (new), `features/projects/components/ProjectCard.tsx`, `app/(app)/projects/[id].tsx`, and `app/_layout.tsx`:** replaced project-contained full goal cards with 56px compact rows containing a category-tinted goal icon, Lora title, deadline/commitment summary, and navigation arrow, and registered the intended upright semibold Lora face. The project rows intentionally remove the category/status pills and left-edge category stripe and are at least half the height of the initial linear treatment.
- **`app/(app)/dashboard.tsx`:** replaced the Goals `+` collapse control with an accessible list/grid icon toggle. Standalone goals remain visible and can now switch between the full shared cards and the same compact linear rows used under Projects.
- **`store/uiStore.ts` and `app/(app)/dashboard.tsx`:** persisted the selected dashboard Goals grid/list view in the existing UI settings store, explicitly sorted standalone goals newest-first, limited the initial collection to seven goals, and added `Show N+` / `Hide` controls for revealing or hiding older goals in either view.
- **`app/(app)/projects/[id].tsx`:** removed the Goals collapse control so project goals remain visible in the compact linear format while the Add Goal action stays independent.
- **`components/CLAUDE.md`:** documented the project-specific goal-row presentation so future card work preserves the intended distinction.

### Changed (2026-07-21 — Unified goal-card redesign)
- **`features/goals/components/GoalCard.tsx`, `GoalGrid.tsx`, and `GoalRingGrid.tsx`:** replaced the legacy list and deadline-ring goal treatments with one responsive category-accented card based on the goal-creation design, including category/status/visibility context, the Lora title and reason treatment, target date, time remaining, weekly commitment, activity, consistent navigation, and safe cross-platform goal deletion where actions are available.
- **Dashboard standalone goals, goals expanded inside project cards, and project-detail goal lists:** now render the same shared goal card, including goals without deadlines that the prior ring grid omitted; the specialized 260px **Today’s Focus** carousel card remains unchanged by explicit design direction.
- **`features/goals/types.ts`, `features/goals/services/goal-service.ts`, and `constants/themes.ts`:** exposed persisted `target_frequency` through the goal model and added a non-migrating legacy-category accent resolver so existing goals can display the redesigned metadata and closest new palette without changing stored categories.
- Verification: `npx tsc --noEmit`, `git diff --check`, and a 27-route Expo web export passed; an authenticated desktop dashboard smoke test rendered the shared design for standalone goals with deadlines, overdue dates, no deadline, reasons, and both legacy and new cadence data.

### Added (2026-07-21 — Goal creation wizard redesign)
- **`lib/goals/templates.ts` and `features/goals/hooks/useGoalCreationWizard.ts`:** added seven category-specific starter packs and a four-step wizard state layer with static outcome suggestions, deadline presets, weekly commitments, dirty-aware template switching, milestone/tracker editing, a five-tracker cap, skip-tracking support, project selection, and submission conversion helpers so the redesigned flow remains deterministic and does not add a new AI pipeline.
- **`components/ui/DateField.tsx` and `Toast.tsx`:** added reusable cross-platform date entry and accessible undo-toast primitives for custom deadlines and recoverable milestone/tracker removal.
- **`supabase/migrations/026_goal_category_taxonomy.sql`:** added the seven-category creation taxonomy to the goals constraint and active agent-session RPC while keeping legacy category values valid for existing records.

### Changed (2026-07-21 — Goal creation wizard redesign)
- **`app/goals/create.tsx`:** replaced the single-page manual form with the responsive four-step Start, Details, Tracking, and Confirm experience from `design_goal_creation_flow`, preserving project linking, persistence hydration, dark-mode semantics, explicit success navigation, and the existing application shell without changing goal-card components.
- **`lib/goals/schema.ts`, `constants/themes.ts`, `constants/index.ts`, `lib/ai/prompts/goal-creation.ts`, `app/api/sessions/start+api.ts`, and `features/sessions/types.ts`:** introduced the seven canonical creation categories, category-specific accent quartets, backward-compatible legacy typing, and updated AI/session defaults so new creation uses the redesigned taxonomy without invalidating existing goals.
- **`app/api/goals/index+api.ts` and `lib/db/goals.ts`:** extended manual creation to validate and persist explicit goal visibility, allowing the wizard’s private toggle to create either private or circle-visible goals instead of remaining decorative.

### Fixed (2026-07-21 — Goal creation wizard redesign)
- **`lib/goals/templates.ts` and `features/goals/hooks/useGoalCreationWizard.ts`:** removed the unsupported Timer tracker type, replaced the invalid zero-target Finance counter with a positive No-spend-days habit, converted human milestone timing to deadline-capped ISO dates, and made tracker-limit enforcement atomic so the creation payload always satisfies the existing API contract.

### Changed (2026-07-21 — Landing hero and brand refinement)
- **`components/landing/PublicNav.tsx` and `LandingPage.tsx`:** removed the header logo's enclosing medallion and rendered the mark directly in the canonical high-contrast green, removed the oversized duplicate hero logo, and recentered the hero copy and authentication actions with responsive spacing while preserving all existing destinations and behavior.

### Added (2026-07-21 — Shared public navigation)
- **`components/landing/PublicNav.tsx`, `LandingPage.tsx`, `app/(auth)/login.tsx`, and `signup.tsx`:** added one canonical public header with home, login, signup, and existing About navigation across landing and authentication screens, and aligned auth surfaces, fields, feedback, actions, and responsive spacing with the light semantic palette without changing authentication behavior.

### Changed (2026-07-21 — Canonical goal accents)
- **Goal detail trackers, project goal cards, dashboard goal rings, and deadline-ring color resolution:** stopped using arbitrary category-theme orange, purple, and other decorative accents for structural borders and progress; these elements now use the canonical semantic green while retaining category data and all goal behavior.

### Fixed (2026-07-21 — Authenticated route theme continuity)
- **Project detail/create, goal loading/Vault, Constellation, Explore, and their shared goal/Vault/Constellation content components:** replaced remaining static light surfaces and foregrounds with the persisted semantic theme so push, replace, and back navigation retain the active appearance without changing routes, state, or business behavior.

### Changed (2026-07-21 — Goal detail readability refinement)
- **`features/goals/components/CountdownTimer.tsx`, `MilestonesPanel.tsx`, and `IntelligencePanel.tsx`:** improved semantic light-mode contrast, replaced the milestone timeline treatment with spacious near-white upcoming rows and blank incomplete controls, and added a restrained off-white-to-sage Intelligence gradient while preserving dark-mode hierarchy and all existing interactions.

### Fixed (2026-07-20 — New Goal rebase repair)
- **`app/goals/create.tsx`:** repaired the malformed tracker metadata declaration and reconciled stale pre-rebase measurable identifiers with the upstream tracker/milestone model while retaining runtime semantic theme tokens throughout both editors.
- **`components/layout/AvatarMenu.tsx` and `SettingsModal.tsx`:** repaired mismatched and unclosed JSX introduced by the rebase, restored the upstream archived-goal settings section, and retained the shared themed toggle controls.
- **`scripts/test-rls.ts`:** replaced the undeclared `dotenv` import with Node's built-in environment-file loader so the repository typecheck can include the RLS script without changing its missing-environment behavior.
- **`CHANGELOGCODEX.md`:** removed unresolved rebase markers while retaining both sides' existing phase history.

### Added (2026-07-20 — Phase 3 shared card foundation)
- **`components/ui/Card.tsx`:** added a typed semantic card foundation with canonical surface and divider tokens, a 16px radius, compact/default/spacious padding, optional light-only elevation, section spacing, aligned headers, dividers, and shared title/subtitle/metadata hierarchy.

### Changed (2026-07-20 — Phase 3 shared card foundation)
- **`components/ui/EmptyStateCard.tsx` and `ReflectionCard.tsx`:** adopted the shared card foundation without changing their public APIs or product content; reflection surfaces and text now follow the canonical light/dark card and typography treatment.

### Changed (2026-07-20 — Phase 2 global surfaces and typography)
- **`components/layout/Screen.tsx`:** replaced static cream and landing-dark surface classes with the canonical runtime page and dark-surface tokens while preserving the shared screen API and scrolling behavior.
- **`components/ui/Modal.tsx`, `Input.tsx`, and `AnchoredPopover.tsx`:** wired shared elevated surfaces, inputs, borders, dividers, placeholder text, and action text to canonical semantic theme tokens so the primitives share the same light/dark structure.
- **`components/ui/Typography.tsx`:** routed the shared `section-eyebrow` variant through the approved accent text role and removed its static light-only Tailwind color while retaining caller-owned `badge-text` semantics.

### Changed (2026-07-20 — Phase 1 theme foundation)
- **`constants/colors.ts`:** made the canonical light/dark palette contract explicit with typed semantic theme and text-token interfaces while retaining the existing token structure and values.
- **`app/(app)/dashboard.tsx`, `components/ui/EmptyStateCard.tsx`, `TodayGoalCard.tsx`, and `Typography.tsx`:** replaced Phase 1 dashboard, loading, action, empty-state, and typography color literals with runtime semantic tokens so the shared states respond consistently to light and dark mode.
- **`components/layout/Sidebar.tsx`:** routed the toggle container and selected navigation row through the existing quiet-border and selected-row tokens, preserving navigation behavior and disabled-state handling.
- **`features/projects/components/CreateProjectModal.tsx` and `ProjectCard.tsx`:** removed the dashboard project modal's direct light-theme dependency, applied runtime input and feedback tokens, and disabled project-card shadow elevation in dark mode.
### Fixed (2026-07-20 — Branded web favicon)
- **`app.json`:** replaced the default Expo web favicon with the existing Ohara logo asset so deployed browser tabs and site chrome display the product brand.

### Added (2026-07-20 — Agent session pipeline)
- **`supabase/migrations/023_agent_session_pipeline.sql` and `024_agent_session_idempotency_guard.sql`:** added structured project periods, promoted `echo_sessions` into a project-aware session ledger, added immutable idempotent session events, and introduced authenticated `start`, `record`, `finish`, and approval-gated `publish` RPCs. Replayed keys return the original operation only when their payload matches; conflicting reuse is rejected explicitly.
- **`app/api/sessions/`, `features/sessions/`, and `lib/sessions/schema.ts`:** exposed validated `startSession`, `recordChange`, `finishSession`, and `publishSession` operations. Finished summaries remain structured drafts containing changed files, database records, verification results, unresolved failures, and a reflection until a separate request explicitly supplies user approval.
- **`app/api/entries/index+api.ts`:** added authenticated server-side Echo creation, canonical-container lookup, input bounds, and non-blocking server-side embedding generation.

### Changed (2026-07-20 — Agent session pipeline)
- **`features/echo/services/echo-service.ts`, `features/echo/hooks/useEntries.ts`, `app/api/entries/[id]+api.ts`, and `lib/db/echo-folders.ts`:** replaced the client-side entry insert, embedding call, and separate confirmed-link write with the atomic server endpoint, removed the obsolete browser-side General-folder lookup, and aligned edit-path documentation while preserving advisory AI auto-links and opt-in reflection behavior.
- **`features/projects/types.ts`, `features/projects/services/project-service.ts`, `types/supabase.ts`, and `docs/API_CONTRACT.md`:** surfaced project period/session-ledger fields and documented the new agent-safe contracts.

### Fixed (2026-07-20 — Atomic Echo container persistence)
- **`supabase/migrations/023_agent_session_pipeline.sql`:** made Echo entry creation and its confirmed goal or General-folder link one database transaction. A link failure now rolls back the entry, eliminating the orphaned-entry state that was possible when the two writes committed independently.
- Verification: migrations 023 and 024 were applied to the linked Supabase project; linked `db lint` reported no schema errors; `npx tsc --noEmit` and the 27-route Expo web export passed; a rolled-back live transaction produced one entry with exactly one confirmed link; idempotent session/event replays returned their original ids while a conflicting payload was rejected; and the authenticated Ohara dashboard rendered all five new goals once in the reused July 20–27 project. All five final summaries remain `draft` with no `final_entry_id`, and a live publication attempt without approval was rejected.

### Added (2026-07-20 — Goal project reassignment)
- **`features/goals/components/GoalProjectPickerModal.tsx` and `app/(app)/goals/[id]/index.tsx`:** added an accessible goal-location control and confirmation modal that lets an active goal move into another project or return to the standalone-goal collection from its detail screen.

### Changed (2026-07-20 — Goal project reassignment)
- **`features/goals/services/goal-service.ts` and `features/goals/hooks/useGoalDetail.ts`:** mapped nullable `projectId` updates to `goals.project_id`, applied optimistic goal-store updates with rollback, retained loaded activity signals after persistence, and kept superseded goals read-only.
- Verification: `npx tsc --noEmit` and `npx expo export --platform web --output-dir /tmp/ohara-web-export-goal-project-move` passed; an authenticated Expo web smoke test created a standalone goal, moved it into the weekly project, moved it back to standalone, and moved it into the weekly project again, with the goal-detail location control reflecting every persisted transition.

### Changed (2026-07-20 — Landing page redesign)
- **`app/index.tsx`, `components/landing/LandingPage.tsx`, and `components/landing/GoalTree.tsx`:** replaced the dark placeholder landing route with the warm OharaAI marketing design from `design_handoff_landing_page`, including responsive layouts, routed calls to action, lifecycle cards, and the animated goal-tree story.
- **`tailwind.config.js` and `global.css`:** added landing-only palette tokens, supplied motion keyframes, and a reduced-motion fallback so the new design remains isolated from authenticated application themes.
- **`package.json` and `package-lock.json`:** added Expo-compatible `react-native-svg` support for the landing-page diagram and lifecycle illustrations.

### Fixed (2026-07-20 — Today carousel card consistency)
- **`components/ui/TodayGoalCard.tsx`:** standardized every Today focus card to the same height, reserved stable project/title space, and capped long goal titles at two tail-ellipsized lines so mixed content cannot distort the carousel.
- **`components/ui/TodayGoalCard.tsx`:** routed the completion label through `text.accent` and the progress fill through `accent.primary`, giving dark mode the canonical themed green instead of the primary text color.
- Verification: `npx tsc --noEmit` passed; an authenticated Expo web smoke test measured all 20 mixed-data cards at 260px, confirmed narrow-width title ellipsis, and resolved both dark-mode completion colors to the canonical dark accent value.

### Removed (2026-07-20 — Today carousel dead action cleanup)
- **`components/ui/TodayGoalCard.tsx`:** hid the non-functional `See All Journeys` dashboard loop, including its action divider, until a real Journeys destination exists; the goal chevron remains the card's supported navigation action.
- **`constants/colors.ts`:** removed the now-unused, estimated light/dark `accent.focusButton` tokens so the canonical palette no longer exposes provisional values that were not verified against a design source.
- Verification: `npx tsc --noEmit` passed, and a signed-in Expo web smoke test against mixed records confirmed reflection-first ordering, project-title omission for standalone goals, the empty progress track and `No deadline set` copy for a no-deadline goal, and absence of the dead Journeys action.

### Added (2026-07-20 — Today active-goal carousel)
- **`components/ui/TodayGoalCard.tsx` and `TodayCarousel.tsx`:** added the themed, horizontally scrollable dashboard focus cards for the existing active-goal feed, including project context, deadline progress, reflection recency, goal navigation, and the shared empty-state pattern.
- **`lib/utils/relativeTime.ts`:** extracted the dashboard-relative timestamp labels into a shared nullable formatter so cards can supply their own no-reflection copy.
- **`constants/colors.ts`:** reused existing themed text and divider tokens for the progress bar and chevron.

### Changed (2026-07-20 — Today active-goal carousel)
- **`app/(app)/dashboard.tsx`:** replaced the mounted due-today zone with the active-goal carousel, loaded the existing sorted feed, resolved project titles from the dashboard project cache, and moved Echo recency text to the shared formatter.

### Added (2026-07-20 — Active goal feed data layer)
- **`lib/db/echo-entry-links.ts`:** added a batched confirmed-link query that joins Echo entries and resolves each requested goal's latest entry creation timestamp, including explicit `null` values for goals without confirmed reflections.
- **`features/goals/services/goal-service.ts`:** added optional status filtering to `fetchGoals` and a sorted active-goal feed service that enriches goals with their latest confirmed reflection timestamp while retaining the existing goal mapping.
- **`OUTSTANDING.md`:** recorded the pre-existing unconfirmed-link behavior in `echoLinkCount` for a separately scoped fix.

### Changed (2026-07-19 — Echo raw text theme tokens)
- **`features/echo/components/`:** routed the confirmed exact-match colors on raw Echo `Text` elements through runtime `text.primary`, `text.secondary`, `text.inverse`, and `feedback.danger` theme tokens while preserving their bespoke typography and leaving composer notices, text inputs, modal scrim, and shadows unchanged.

### Changed (2026-07-19 — Echo theme surfaces)
- **`features/echo/components/`:** routed the ten scoped Echo screen, composer, detail, list, tree, picker, modal, and resizer components through `useThemeColors()` for exact-match backgrounds, borders, dividers, icons, indicators, and BRT accents while preserving existing layout and non-color styling. Existing notice, scrim, and shadow colors without clean theme-token matches remain unchanged for follow-up.

### Changed (2026-07-19 — Remaining typography theme tokens)
- **`components/ui/Typography.tsx`:** routed the 27 audited typography variants through their exact `text.primary`, `text.secondary`, `text.muted`, `text.accent`, or `text.inverse` theme tokens while preserving every font, size, weight, line-height, and caller style override.
- **`app/(app)/dashboard.tsx`:** removed redundant `content`, `greeting`, and `meta` light/dark color classes now supplied by the shared typography variants, while retaining the completed-item muted override.

### Added (2026-07-19 — Avatar-menu theme shortcut)
- **`components/layout/AvatarMenu.tsx`, `components/ui/BrandIcon.tsx`, and `assets/brand/theme-mode.png`:** added the supplied day/night logo as an accessible avatar-popover shortcut to the existing persisted theme toggle, and made the open popover react to the selected palette so the change is immediately visible while preserving the Settings switch.

### Added (2026-07-19 — Manual dark theme)
- **`constants/colors.ts`:** added a structurally checked `DARK_THEME` palette with the confirmed Figma values and explicitly documented derived fallbacks for every token without a dark source.
- **`store/uiStore.ts`, `app/_layout.tsx`, and `tailwind.config.js`:** added a persisted, light-defaulting manual `themeMode`, a `toggleTheme` action, NativeWind color-scheme synchronization, manual class-based dark mode, and app-specific `dark-*` Tailwind surface tokens without reusing the separate `landing-*` palette.
- **`components/layout/SettingsModal.tsx`:** added an Appearance section with the sole light/dark switch, following the existing settings row and persisted UI preference pattern.

### Changed (2026-07-19 — Reactive theme surfaces)
- **Authenticated app shell, shared modal/sidebar/ring primitives, dashboard cards, project/goal ring cards, and goal-detail header/milestone/activity surfaces:** switched representative background, text, border, feedback, and accent colors to the persisted theme palette while leaving the separately scoped `Typography.tsx` token refactor untouched.

### Changed (2026-07-16 — Goal detail context rail)
- **`app/(app)/goals/[id]/index.tsx`:** moved the desktop Vault and Reflections shortcuts into compact top-right header actions and placed the Activity feed directly beneath them in the right context rail, matching the requested goal-detail hierarchy while preserving the existing single-column mobile flow and navigation behavior.

### Changed (2026-07-16 — Journey navigation rename)
- **`components/layout/Sidebar.tsx`, `app/goals/create.tsx`, `app/(app)/projects/create.tsx`, and `app/(app)/goals/[id]/index.tsx`:** renamed the dashboard's visible navigation label from `Goals` to `Journey`, including related back-navigation labels, while preserving the existing dashboard and goal route names, APIs, and persistence model.

### Fixed (2026-07-15 — Echo full-viewport background)
- **`app/(app)/_layout.tsx`, `features/echo/components/EchoScreen.tsx`, `EchoContainerTree.tsx`, and `EchoEntryList.tsx`:** applied the canonical dashboard page color to the native-stack scene and every full-height Echo wrapper, including the calendar empty state, while explicitly stretching and clipping the route panes to the available viewport. This prevents the navigation default background from appearing beneath either tree or calendar view.
- Verification: `npx tsc --noEmit` and `npx expo export --platform web --output-dir /tmp/ohara-web-export-background-fix` completed successfully.

### Changed (2026-07-15 — Echo navigation hierarchy and page continuity)
- **`features/echo/components/EchoContainerTree.tsx`, `EchoScreen.tsx`, `GoalFolderPicker.tsx`, `EchoDetailPane.tsx`, and `features/echo/utils/entryDisplay.ts`:** removed the redundant `Folders & Goals` heading, renamed visible `Echo Folders` labels to `Echo`, hid the system `General` container name, and surfaced its unbound entries directly beneath Echo while preserving the underlying catch-all folder and move/filter behavior.
- **`app/(app)/_layout.tsx`:** applied the canonical dashboard page background to the shared authenticated app shell so uncovered Echo pane edges use the same continuous warm background.

### Fixed (2026-07-15 — Echo pane scrolling)
- **`features/echo/components/EchoScreen.tsx`, `EchoContainerTree.tsx`, `EchoEntryList.tsx`, `EchoDetailPane.tsx`, `EchoEntryEditForm.tsx`, and `EchoComposer.tsx`:** constrained nested flex panes to the available viewport height and made the add-entry composer scrollable so Echo content and actions remain reachable on shorter screens.
- Verification: `npx tsc --noEmit` and `npx expo export --platform web --output-dir /tmp/ohara-web-export` completed successfully.

### Changed (2026-07-15 — Dashboard project creation overlay)
- **`features/projects/components/CreateProjectModal.tsx` (new) and `app/(app)/dashboard.tsx`:** replaced the dashboard's navigation to the project-creation page with an in-place modal form. Successful creation continues through `useProjectStore.createProject`, which prepends the returned project so its dashboard card appears immediately without a refresh; failures remain in the modal with retryable inline feedback.

### Added (2026-07-15 — Standalone goals on the dashboard)
- **`app/(app)/dashboard.tsx`:** added explicit, always-visible `New Project` and `New Goal` buttons beside their dashboard section headings, plus clear empty states so either creation flow remains available before any cards exist.

### Changed (2026-07-15 — Shared standalone-goal presentation)
- **`features/goals/components/GoalRingGrid.tsx` (new), `features/projects/components/ProjectCard.tsx`, and `app/(app)/dashboard.tsx`:** extracted the existing project goal-ring grid and reused it for goals whose nullable `project_id` is unset, so project-contained and standalone goals have the same dashboard card presentation without changing persistence or routing.
- **`features/echo/hooks/useContainerGrouping.ts`:** renamed Echo's existing null-project goal bucket from `Ungrouped` to `Standalone Goals`; Echo already fetches, filters, links, and moves all user goals without requiring a project.

### Fixed (2026-07-15 — Checklist completion rollover snapshot)
- **Checklist completion and rollover:** persist checklist completion to its durable measurable value, synchronize that value in the goal-detail cache, and snapshot rollover state from that value so Extend Step 1 and Momentum's `What You Built` panel consistently show completed items as `Done`.
- **Deadline-decay progress:** stopped measurable completion from rewriting `goal.progress`; goal detail and list-card progress now derive exclusively from elapsed time toward the deadline, with no measurable-completion fallback. Updated `lib/db/goals.ts`, `app/api/goals/complete-measurable+api.ts`, `features/goals/hooks/useGoalDetail.ts`, `features/goals/components/GoalDetailHeader.tsx`, `features/goals/components/GoalCard.tsx`, `features/goals/components/GoalRingCard.tsx`, and `docs/API_CONTRACT.md`.

### Fixed (2026-07-15 — Superseded goal cache after extension)
- **`features/goals/components/ExtendGoalModal.tsx`:** immediately mark the cached original goal as superseded after a successful extension, including the new successor id and normalized optional reflection, so returning to the original renders its current read-only state without a reload.

### Fixed (2026-07-15 — Momentum prior-phase measurable formatting)
- **`features/goals/components/WhatYouBuiltPanel.tsx`:** render targetless counters as achieved/— and zero-completion checklists as `0 completions`, matching the established extension summary while preserving existing habit and progress behavior.

### Added (2026-07-15 — Superseded goal detail)
- **`lib/db/goals.ts`, `features/goals/services/goal-service.ts`, `features/goals/types.ts`, and `useGoalDetail.ts`:** added a singular successor lookup and load the successor id plus its continuation reflection for superseded detail views, including when the goal was initially loaded in the shared list.
- **`app/(app)/goals/[id]/index.tsx`, `GoalDetailHeader.tsx`, `MeasurablesPanel.tsx`, `MeasurableCard.tsx`, and `SuccessorReflectionPanel.tsx`:** present superseded goals as archived, read-only phases with a muted header, fixed grey 100% ring, continuation navigation, grey milestone bars, and an optional read-only reflection from the successor while ensuring Superseded takes precedence over Momentum.

### Added (2026-07-15 — Momentum goal detail)
- **`app/(app)/goals/[id]/index.tsx`, `GoalDetailHeader.tsx`, `WhatYouBuiltPanel.tsx`, and `Badge.tsx`:** conditionally present continuation goals with the locked Momentum badge and subtext plus a warm, read-only prior-phase summary, optional reflection, and original-goal link while leaving normal goal-detail rendering unchanged.
- **`features/goals/types.ts` and `features/goals/services/goal-service.ts`:** load and safely map the existing `previous_goal_id`, `prior_phase_summary`, `reflection`, and `reflected_at` fields through the shared goal-detail model so Momentum presentation requires no additional query.

### Added (2026-07-15 — Extend-goal modal reflection and submission)
- **`features/goals/components/ExtendGoalModal.tsx`:** completed Step 3 with the optional shared-state reflection textarea and a single extension submission path for both Skip and Start next phase. The modal now posts the continuation payload, blocks duplicate requests, keeps validation/conflict/server failures inline and retryable, resets only after success, and replaces the ended goal with the returned continuation goal detail route.

### Added (2026-07-15 — Extend-goal modal summary)
- **`features/goals/components/ExtendGoalModal.tsx`:** implemented the second Extend-modal step with an editable, non-empty validated title; 30/60/90-day deadline presets; and a Custom future-date option that keeps the ISO deadline ready for the extend endpoint. Added live deadline readout plus Back/Next state persistence and validation gating.
- **`ExtendGoalModal.tsx` and `GoalDetailHeader.tsx`:** replaced the ended-card extension
  placeholder with the three-step modal container, resettable shared form state, progress
  segments, and a first-step summary that renders the ended goal's live measurable values while
  keeping card and modal dismissal actions independent.
- **`components/ui/Modal.tsx`:** added opt-in backdrop dismissal, configurable surface styling,
  and independent scrim/surface entrance motion so the Extend flow can use the shared modal
  primitive with its specified presentation without changing existing modal defaults.

### Added (2026-07-15 — Goal-detail ended state)
- **`GoalDetailHeader.tsx` and `Badge.tsx`:** reuse deadline ring progress to present ended goals with an ended-status badge, a deadline-passed readout, and a locally dismissible phase-extension prompt; the extension action currently only sets the Task 4 modal state hook.

### Changed (2026-07-15 — Goal-detail ended milestones)
- **`app/(app)/goals/[id]/index.tsx`, `MeasurablesPanel.tsx`, and `MeasurableCard.tsx`:** pass the existing deadline-progress ended state into milestones so ended goals use a single 0.6 dimming layer and hide mutation affordances independently of successor-state handling.

### Changed (2026-07-15 — Ring urgency escalation)
- **`features/goals/utils/ringProgress.ts`, `GoalRingCard.tsx`, and
  `GoalDetailHeader.tsx`:** centralized goal-ring stroke color resolution and
  escalate deadline progress at 75% to `#E0863E` and at 90% to `#C0483A`,
  while retaining the category accent before those thresholds.

### Changed (2026-07-14 — Superseded-goal read-only guard)
- **`lib/db/goals.ts`, `features/goals/services/goal-service.ts`, and
  `app/api/goals/complete-measurable+api.ts`:** centralized successor lookups, annotated
  fetched goals with `has_successor`, and reject completion writes for extended goals with a
  client-safe `409` response.
- **`features/goals/components/GoalCard.tsx`, `GoalDetailHeader.tsx`, `MeasurableCard.tsx`,
  `MeasurablesPanel.tsx`, and `app/(app)/goals/[id]/index.tsx`:** disabled the scoped goal and
  measurable mutation affordances with reduced-opacity treatment when a goal has a successor.

### Fixed (2026-07-14 — Concurrent goal-extension conflict)
- **`lib/db/goals.ts` and `app/api/goals/[id]/extend+api.ts`:** translated only Postgres
  `23505` violations naming `idx_goals_previous_goal_id` at the continuation-goal insert into
  the existing stable `GOAL_ALREADY_EXTENDED` error, and mapped that error to a client-safe
  `409` response while preserving the pre-insert successor check and unrelated error handling.

### Added (2026-07-14 — Extend-goal write path)
- **`app/api/goals/[id]/extend+api.ts` and `lib/db/goals.ts`:** added an auth-gated
  continuation endpoint and dedicated clone helper that reject non-owned, unexpired, or already
  extended goals before writing; snapshot type-aware prior measurable results; create a new goal
  with copied/recomputed continuation fields; reset cloned measurables; and fail immediately on
  insert errors while preserving asynchronous goal embedding.

### Added (2026-07-14 — Goal rollover schema)
- **`supabase/migrations/020_goal_rollover_fields.sql`:** added nullable
  `previous_goal_id` self-reference with `ON DELETE SET NULL`, nullable
  `prior_phase_summary`, and a partial index for continuation-goal lookups;
  no RLS policies were changed.

### Removed (2026-07-14 — Project-level aggregate progress)
- **`app/(app)/projects/[id].tsx`:** removed the project detail hero's flat-average goal progress calculation and bar; projects now surface no aggregate progress metric, while individual goal cards remain unchanged.

### Added (2026-07-14 — AI goal suggestions)
- **`lib/ai/config.ts`, `lib/ai/prompts/goal-suggestion.ts`, and
  `app/api/goals/suggest+api.ts`:** added the short Haiku-backed `goalSuggestion` pipeline,
  strict JSON-only prompt and response validation, shared daily quota enforcement, HTTP 429
  rate-limit mapping, and fail-soft provider/parse handling for one milestone suggestion.
- **`app/goals/create.tsx`:** enabled the existing Ohara suggestion affordance and wired it to
  append a validated `{ title, type }` suggestion with the same local milestone shape used by
  manual additions, without persisting AI provenance.

### Removed (2026-07-14 — Dead project-card category theme lookup)
- **`constants/themes.ts`, `constants/index.ts`, and
  `features/projects/components/ProjectCard.tsx`:** removed the stale
  `CATEGORY_THEME_MAP` and its always-missing project-card lookup; project cards now use the
  already-computed `goal.colorTheme` directly with no behavior change.

### Added (2026-07-14 — Goal creation completion)
- **`app/goals/create.tsx`:** added a `Go back to goal` action beside `Create another` in the
  creation-success overlay, routing directly to the goal that was just created.

### Changed (2026-07-13 — Manual goal creation screen)
- **`app/goals/create.tsx`:** replaced the retired AI chat flow with the manual five-section
  creation form, including the required category/deadline validation, project selection,
  trackable cadence controls, manual milestone management, disabled AI-suggestion affordance,
  generalized `POST /api/goals` payload, store hydration, and animated success overlay. Date-only
  deadlines serialize from local midnight so downstream goal cards retain the selected day.
- **`components/layout/Sidebar.tsx`:** kept Goals highlighted while the standalone manual goal
  creation route is open so the shared sidebar matches the screen's Goals context.

### Changed (2026-07-13 — Manual goal creation write path)
- **`app/api/goals/index+api.ts` and `lib/db/goals.ts`:** replaced the AI-finalize-shaped
  goal persistence contract with the locked manual payload, including server validation for
  required title/deadline/category/cadence/milestones and persistence of `target_frequency`,
  manual authorship flags, project linkage, and category-derived color themes.
- **`lib/db/measurable-inserts.ts` (new) and
  `features/goals/services/goal-service.ts`:** centralized the measurable insert shape so
  creation-time milestones and post-creation milestones share the same defaults and explicit
  `is_ai_suggested: false` behavior.
- **`constants/themes.ts` and `constants/index.ts`:** relocated the six-category creation
  theme mapping to the exported `CATEGORY_COLOR_THEME` constant while leaving the legacy
  `CATEGORY_THEME_MAP` unchanged.
- **`lib/db/goals.ts`:** gated the existing non-blocking vault insert behind an optional vault
  context, so the manual path no longer creates an empty placeholder vault.

### Removed (2026-07-13 — Retire AI goal finalization route)
- **`app/api/goals/create+api.ts`:** removed the AI conversational/finalization endpoint after
  confirming its only caller is the separately scheduled `app/goals/create.tsx` rewrite.

### Changed (2026-07-11 — Revert collapsed sidebar sizing)
- **`components/layout/Sidebar.tsx`:** restored compact collapsed-sidebar logo placement and
  collapsed nav-icon sizing while keeping the enlarged expanded Ohara logo and wordmark.

### Changed (2026-07-11 — Project display icon)
- **`assets/brand/project-logo.png`, `components/ui/BrandIcon.tsx`,
  `features/projects/components/ProjectTitleRow.tsx`, `ProjectCard.tsx`,
  `app/(app)/projects/[id].tsx`, and `app/goals/create.tsx`:** added the project symbol to
  the shared brand-icon map and reused a single project title row so project cards, project
  detail headers, and project picker chips render the icon before project titles without
  duplicating image layout logic.

### Changed (2026-07-11 — Sidebar logo sizing)
- **`components/layout/Sidebar.tsx`:** doubled the expanded Ohara logo and wordmark sizing,
  lowered the collapsed logo-only expand target, and doubled collapsed sidebar nav-icon sizing
  through shared size constants to avoid duplicating layout values.

### Changed (2026-07-11 — Ohara sidebar logo)
- **`assets/brand/ohara-logo.png`, `components/ui/BrandIcon.tsx`, and
  `components/layout/Sidebar.tsx`:** added the Ohara logo beside the sidebar wordmark when
  expanded, and replaced the collapsed sidebar header's text/chevron with a logo-only expand
  target so the collapsed brand display stays clean.

### Changed (2026-07-11 — Echo add-entry icon)
- **`assets/brand/echo-add-entry.png`, `components/ui/BrandIcon.tsx`, and
  `features/echo/components/EchoScreen.tsx`:** added the Figma-exported Echo add-entry symbol
  to the shared brand-icon map and replaced the literal plus sign in the Echo `Add an entry`
  button with that icon, without changing the entry creation flow.

### Changed (2026-07-11 — Goal and Today display icons)
- **`assets/brand/goal-mark.png`, `assets/brand/today-logo.png`,
  `components/ui/BrandIcon.tsx`, `features/goals/components/GoalTitleRow.tsx`,
  `GoalCard.tsx`, `GoalRingCard.tsx`, `GoalDetailHeader.tsx`,
  `app/(app)/dashboard.tsx`, `app/(app)/goals/[id]/index.tsx`, and
  `components/layout/Sidebar.tsx`:** centralized Figma-exported brand-symbol rendering,
  added the goal mark beside actual goal titles across goal surfaces, and added the Today
  symbol beside the dashboard Today list header without changing data or routing logic.

### Changed (2026-07-11 — Goals sidebar logo)
- **`assets/brand/goals-logo.png` and `components/layout/Sidebar.tsx`:** added the
  Figma-exported Goals symbol to the shared sidebar, rendering it beside the Goals label when
  expanded and by itself for the Goals nav item when the sidebar is collapsed.

### Changed (2026-07-11 — Echo sidebar logo)
- **`assets/brand/echo-logo.png` and `components/layout/Sidebar.tsx`:** added the
  Figma-exported Echo symbol as a local sidebar asset, rendering it beside the Echo label when
  expanded and by itself for the Echo nav item when the sidebar is collapsed.

### Changed (2026-07-11 — Follow-up: reuse Echo entry actions in tree)
- **`features/echo/components/EchoEntryRow.tsx`, `EchoContainerTree.tsx`, and
  `EchoScreen.tsx`:** reused the shared Echo entry row/action-menu path for child entries in
  tree view, so tree entries now expose the same Edit, Move to folder, and Delete actions as
  the calendar/list view without duplicating action-menu logic.
- **`features/echo/components/EchoEntryList.tsx` and `features/echo/utils/entryDisplay.ts`:**
  moved shared entry title/snippet/date/container display helpers into one Echo utility used
  by the entry row/list surfaces.
- Verification: `npx tsc --noEmit` clean.

### Changed (2026-07-11 — Follow-up: expand Echo folder entries)
- **`features/echo/components/EchoContainerTree.tsx`:** added the same on-demand child-entry
  dropdown behavior to Echo folder rows that goal rows already use, keeping folders visible
  while revealing their linked Echo entries only after the folder chevron is clicked.
- Verification: `npx tsc --noEmit` clean.

### Changed (2026-07-11 — Follow-up: expand Echo tree goal entries)
- **`features/echo/components/EchoContainerTree.tsx` and `EchoScreen.tsx`:** kept project
  headings and their goal rows visible in Echo tree mode, while adding a per-goal chevron that
  reveals only that goal's child Echo entries on demand. The change reuses the already-loaded
  Echo entries and does not touch backend/container fetching logic.
- Verification: `npx tsc --noEmit` clean.

### Changed (2026-07-11 — Session 7: Echo composer internal editor layout)
- **`features/echo/components/EchoComposer.tsx`:** redesigned the inline right-pane composer
  around a combined title/body editor panel with a larger flexing plain-text body area, while
  preserving the existing mount path, `Link a goal` picker integration, draft/link state, and
  save payload contract. Removed the inactive attachment affordance so the composer remains a
  plain-text entry surface.
- Verification: `npx tsc --noEmit` clean.

### Changed (2026-07-11 — Follow-up: add Echo tree view and loosen pane resizing)
- **`features/echo/components/EchoContainerTree.tsx` (new) and `EchoScreen.tsx`:** added a
  middle-pane tree toggle beside the filter pill, showing folders and project-grouped goals as
  selectable scope targets in the main Echo column.
- **`features/echo/components/EchoScreen.tsx`:** loosened the right-pane resize clamp
  (`280px` detail minimum, `220px` middle-column floor) so the divider can travel farther
  left and right.
- **`features/echo/components/EchoEntryList.tsx`:** moved the entry list rail onto the same
  warm page background so short entry lists do not leave awkward blocks of mismatched color.
- Verification: `npx tsc --noEmit` clean.

### Changed (2026-07-11 — Follow-up: extend Echo entry list rail)
- **`features/echo/components/EchoEntryList.tsx` and `EchoEntryRow.tsx`:** changed the entry
  list from content-height-feeling rows into a full-height vertical list rail with
  full-width entry bands, so a single entry no longer reads as a small isolated tile.
- Verification: `npx tsc --noEmit` clean.

### Changed (2026-07-11 — Follow-up: remove Echo detail collapse arrow)
- **`features/echo/components/EchoPaneResizer.tsx` and `EchoScreen.tsx`:** removed the
  right-pane collapse/expand arrow and docked strip behavior, leaving only the draggable
  vertical resizer between the entry list and detail view.
- **`store/uiStore.ts` and `store/clearAllStores.ts`:** removed the now-unused persisted
  `rightPaneCollapsed` preference so stale collapsed state cannot trap the detail pane.
- Verification: `npx tsc --noEmit` clean.

### Changed (2026-07-11 — Phase 5: scoped flat Echo list)
- **`features/echo/components/EchoScreen.tsx`:** selecting a canonical goal/folder filter now
  filters the already-loaded entries by `goalId` or `folderId`, clears the active detail, and
  switches the list from date-grouped mode to flat scoped mode.
- **`features/echo/components/EchoEntryList.tsx` and `EchoEntryRow.tsx`:** flat scoped mode
  hides date headers, uses date captions, and switches rows to the titles-only variant while
  retaining the same selected-row and action-menu behavior.
- Verification: `npx tsc --noEmit` clean. Live smoke for scoped filtering, empty scoped
  containers, and restoring All/date grouping still needs a real signed-in dev-server session.

### Changed (2026-07-11 — Phase 4: right detail/composer pane and persisted resize)
- **`features/echo/components/EchoComposer.tsx` (new):** moved the new-entry form into the
  right pane, preserving body draft persistence and save-result handling while submitting
  through the existing `saveEntry(text, goalId|null, aiRequested, brt, emotion, title)`
  contract. The composer uses `GoalFolderPicker` in goal-only mode because the create path
  still cannot persist an arbitrary folder id without changing that contract.
- **`features/echo/components/EchoDetailPane.tsx` (new):** added empty, read-only entry, and
  add/composer states with resolved container/date captions and neutral-grey null-BRT dots.
- **`features/echo/components/EchoPaneResizer.tsx` (new), `store/uiStore.ts`,
  `store/clearAllStores.ts`:** added right-pane resize/collapse controls plus persisted
  `rightPaneWidth` and `rightPaneCollapsed`, including the `partialize` whitelist.
- **`features/echo/components/EchoScreen.tsx`, `features/echo/hooks/useEntries.ts`,
  `features/echo/components/GoalFolderPicker.tsx`:** wired three-pane orchestration,
  add/view selection state, route-goal draft restoration, and goal-only picker mode for the
  composer.
- Verification: `npx tsc --noEmit` clean. Live smoke for composer save, row detail view,
  resize clamps, and width/collapse refresh persistence still needs a real signed-in
  dev-server session/JWT.

### Changed (2026-07-11 — Phase 3: shared Goal/Folder picker)
- **`features/echo/components/GoalFolderPicker.tsx` (new):** added the reusable two-section
  container picker: goals grouped under project headers with an explicit Ungrouped group,
  plus flat Echo folders including General as a normal selectable folder.
- **`features/echo/components/MoveEntryModal.tsx`:** replaced the old inline
  "Projects"/folders list with `GoalFolderPicker`, correcting the goal section label to
  "Goals" while preserving the existing single-row move path through `onConfirm`.
- Verification: `npx tsc --noEmit` clean. Live move/write smoke for goal and folder targets,
  including General and one-confirmed-row behavior, still needs a real signed-in dev-server
  session/JWT.

### Changed (2026-07-11 — Phase 2: date-grouped Echo list and canonical filter)
- **`features/echo/services/echo-service.ts`, `features/echo/hooks/useEntries.ts`,
  `features/echo/types.ts`, `features/echo/store.ts`, `features/echo/hooks/useMoveEntry.ts`:**
  threaded canonical goal/folder options into the Echo screen and preserved folder ids on
  confirmed folder links so later scoped filtering can use stable ids.
- **`features/echo/components/EchoEntryRow.tsx`, `EchoEntryList.tsx`,
  `EchoFilterPill.tsx` (new):** added the Phase 2 middle-column list surface with date
  grouping, BRT dots, selected-row styling, container/date captions, action-menu carryover,
  loading/empty states, and the canonical filter dropdown.
- **`features/echo/components/EchoScreen.tsx`:** replaced the old single-scroll
  composer-on-top screen with the Phase 2 list column plus placeholder detail column.
- Verification: `npx tsc --noEmit` clean. Live render smoke for grouping/dots/dropdown still
  needs a real signed-in dev-server session.

### Changed (2026-07-11 — Phase 0: canonical BRT resolver)
- **`lib/utils/resolveBrt.ts` (new):** added the canonical dominant-BRT resolver over
  `EchoBrt`, using count majority with lowercase category output. The original commit
  (7f95880) shipped an unauthorized thorn -> rose -> bud tie-break; this has since been
  reverted to bud -> rose -> thorn, matching the tie-break behavior of the three prior
  resolver implementations it replaced. No decision record ever authorized thorn-first.
  The "real" canonical tie-break philosophy is an open product decision for Ariel, to be
  recorded separately in DECISIONS.md — bud-first here is a safe-default revert, not that
  decision.
- **`features/goals/services/goal-service.ts`:** retired the local `deriveBrtTag`
  first-non-empty heuristic and now uses `resolveBrt()` for goal-card BRT signal tags.
- **`features/goals/hooks/useEchoTrail.ts` and `components/ui/ReflectionCard.tsx`:**
  removed local title-case dominant-BRT mirrors and title-case the canonical lowercase
  category at the UI boundary.
- Verification: `npx tsc --noEmit` clean. Live smoke for EchoTrail labels, goal-card
  dots, and ReflectionCard labels still requires a real signed-in dev-server session.

### Added (2026-07-11 — Phase 1: Echo redesign color tokens)
- **`constants/colors.ts`:** added the locked Echo redesign tokens only:
  `LIGHT_THEME.brt.{bud,rose,thorn}`, `LIGHT_THEME.border.input`,
  `LIGHT_THEME.border.divider`, and `LIGHT_THEME.background.selectedRow`.
- Verification: `npx tsc --noEmit` clean.

### Added (2026-07-10 — Log the intentional embedding-skip in PATCH /api/entries/:id)
- **Context:** a live audit flagged `echo_entries.embedding_text` as null after a content-changing
  edit. Root cause was benign: `buildEchoEmbeddingText` returns null when content falls under
  `EMBEDDING_MIN_WORD_COUNT` (40 words), so the PATCH handler correctly clears `embedding_text`
  and the vector. Not a regression — the re-embed is awaited and its failure path is already
  logged; the confusion was that the *by-design* null had no log line, so it looked like a
  swallowed failure.
- **`app/api/entries/[id]+api.ts`:** in the `contentChanged` block, when `embeddingText` is null,
  emit `console.debug({ event: 'embedding_skipped', reason: 'below_min_word_count', record_id,
  word_count })`. Pure observability — no behavior change. The embedding *failure* path
  (`embedding_write_failed`) was already logged and is untouched.
- `npx tsc --noEmit` clean.

### Removed (2026-07-10 — Delete the `/echo/[id]` detail route and all tap-nav call sites)
- **Context:** with `EntryActionMenu` (Edit/Move/Delete) now the way to act on an echo card, the
  read-only `/echo/[id]` detail screen no longer earns its keep. This removes the route, its
  screen, the service function that fed it, and every tap-through that navigated to it.
- **Deleted:** `app/(app)/echo/[id].tsx` (route — the `app/(app)/echo/` dir is now empty),
  `features/echo/components/EchoDetailScreen.tsx` (its only consumer), and `getEntryById()` in
  `features/echo/services/echo-service.ts` (confirmed sole consumer was `EchoDetailScreen`).
- **`features/echo/components/EchoScreen.tsx`:** removed the `Pressable` wrapper (not just its
  `onPress`) around the list card — `EntryActionMenu` is now the only way to act on this card.
  Dropped the now-unused `router` import (`Pressable` stays; still used by the goal-picker modal).
- **`features/goals/components/EchoTrail.tsx`:** the content `Pressable` is now a plain `Text` —
  the card is view-only. Dropped the now-unused `router` import (`Pressable` stays; still used by
  the Confirm/Dismiss suggestion buttons).
- **`features/goals/components/ActivityFeed.tsx`:** removed the `Pressable` wrapper from both
  branches of `EchoEntryCard` (bare `ReflectionCard` for the AI-reflection path; the raw-preview
  fallback is now a static `View` with the former non-pressed style values). Dropped the unused
  `router` and `Pressable` imports.
- **Decision (Ariel):** goal-trail and activity-feed echo cards are intentionally inert (no tap,
  no action menu) for now — `EntryActionMenu` lives in `features/echo/` and `features/CLAUDE.md`'s
  no-cross-feature-import rule blocks `features/goals/` from importing it. Extracting it to
  `components/ui/` (same move `ReflectionCard` made in Block 2) is logged to OUTSTANDING.md as a
  follow-up, not built this session. Also checked off OUTSTANDING's "EchoTrail links point to a
  screen that doesn't exist" — resolved by this removal.
- `npx tsc --noEmit` clean. Files: deleted `app/(app)/echo/[id].tsx`,
  `features/echo/components/EchoDetailScreen.tsx`; edited `features/echo/services/echo-service.ts`,
  `features/echo/components/EchoScreen.tsx`, `features/goals/components/EchoTrail.tsx`,
  `features/goals/components/ActivityFeed.tsx`.

### Added (2026-07-10 — Echo entry edit from the action menu)
- **Context:** the delete-consolidation patch shipped Delete but deferred Edit (no edit surface
  existed at the time). The server PATCH route (`/api/entries/[id]`) and its client wrapper
  `updateEntry()` in `echo-service.ts` landed separately (content update + re-embed + stale-
  reflection reset are all server-side). This patch adds the missing **Edit** UI on top of them.
- **`features/echo/store.ts`:** new `updateEntryFields(entryId, { content?, title? })` action —
  an optimistic field patch applied after a successful save. Mirrors `setEntryContainer`'s
  map-and-merge shape; only overwrites supplied fields (`title: null` clears the title back to
  `undefined`). Does not touch container assignment — that stays `setEntryContainer`'s job.
- **`features/echo/hooks/useEditEntry.ts` (new):** owns the edit flow the way `useMoveEntry` owns
  the move flow — runs `updateEntry()` (PATCH) → `updateEntryFields()` (optimistic patch),
  tracking `activeEntry` / `isSaving` / `error`. On a `entry_not_found` (404) it calls
  `onEntryGone` (wired to the store's `removeEntry`) and closes; offline/server/generic errors
  keep the sheet open with the message. Keeps service calls out of the component (features/ rule 3).
- **`features/echo/components/EditEntryModal.tsx` (new):** presentational bottom-sheet, pre-filled
  from the entry's content/title, calling no services itself. Reuses the composer's title/content
  `TextInput` styling but none of its draft-persistence / linked-goal logic (doesn't apply to a
  saved entry). Cancel + Save buttons; Save disabled while empty or in flight; dismissal blocked
  mid-save. Does not edit container assignment — that's Move's job.
- **`features/echo/components/EntryActionMenu.tsx`:** added an `onEdit` prop and a third **Edit**
  `<Pressable>` row (above Move / Delete), same styling as the existing rows; no popover
  positioning changes.
- **`features/echo/components/EchoScreen.tsx`:** instantiates `useEditEntry({ onEntryGone:
  removeEntry })`, threads `onEdit` through `EchoEntryListCard` alongside the existing
  `onOpenMoveMenu`/`onDelete`, and renders `EditEntryModal` next to `MoveEntryModal`. No new route
  — the sheet lives inside `EchoScreen`.
- `npx tsc --noEmit` clean. Files: `store.ts`, `hooks/useEditEntry.ts`, `components/EditEntryModal.tsx`,
  `components/EntryActionMenu.tsx`, `components/EchoScreen.tsx`.

### Fixed (2026-07-10 — Consolidate entry delete onto the server route; remove the duplicate)
- **Context / correcting the record:** two Echo-delete implementations landed independently.
  Task 1 ("Entry Delete / hard delete") shipped the **server** route `DELETE /api/entries/[id]`
  (`withAuth` + `isEntryOwnedByUser` → 404) — the approved pattern, mirroring Move, chosen
  specifically because server-side ownership enforcement is stronger than goal-delete's bare-RLS
  approach. Task 4 ("Echo entry delete from the action menu") then separately added a **client-side**
  `deleteEntry()` in `echo-service.ts` doing a direct RLS-scoped Supabase delete
  (`supabase.from('echo_entries').delete().eq('id', ...)`), modeled on `goal-service.deleteGoal`
  — the pattern we had deliberately decided *not* to use here. That direct-delete bypassed the
  Task 1 route entirely. **There was no instruction to skip the server route or to prefer
  goal-delete's pattern; the earlier changelog framing of the client delete as the intended path
  was incorrect.** The Delete menu's network call now goes through the server route.
- **`features/echo/services/echo-service.ts`:** `deleteEntry(entryId)` no longer talks to Supabase
  directly. It now issues a thin `authedFetch('/api/entries/:id', { method: 'DELETE' })` to the
  Task 1 route (same `authedFetch` mechanics as `moveEntryRequest`/`updateEntry`). It keeps its
  `Promise<void>` / throw-on-failure contract — the store's `deleteEntry` action and
  `EchoScreen.handleDeleteEntry`'s try/catch depend on the throw — so it throws on a non-`ok`
  response (surfacing the server `error` message when present) rather than returning a result
  object. Ownership is now enforced server-side; `echo_entry_links` cascade and the
  `interests.source_thorn_id` `ON DELETE SET NULL` behavior are handled by the route.
- **Unchanged:** `store.ts`'s `deleteEntry` action (still persists-then-filters; its underlying
  call now routes through the corrected service fn), and `EntryActionMenu`'s Delete confirmation
  flow (`window.confirm`/`Alert.alert`, "This cannot be undone", Cancel/Delete) — only the
  underlying network call changed.
- `npx tsc --noEmit` clean. Files touched: `features/echo/services/echo-service.ts`.

### Added (2026-07-10 — Echo entry delete from the action menu)
- **Context:** the Echo list's per-entry `···` menu (`EntryActionMenu`) only offered
  "Move to folder". Added an in-menu **Delete** action. Scope was originally "Edit + Delete"
  but Edit was deferred: the repo has no Echo-entry edit surface (`EchoDetailScreen` is
  read-only, no update endpoint), so an "Edit" row would either duplicate the card tap or
  require a new edit flow beyond this patch. Product decision: ship Delete only now.
- **`features/echo/services/echo-service.ts`:** new `deleteEntry(entryId)` — a client-side,
  RLS-scoped `supabase.from('echo_entries').delete().eq('id', entryId)` that throws on error.
  Mirrors `goal-service.deleteGoal`. `echo_entry_links` rows cascade via the FK
  (`echo_entry_id ... on delete cascade`, migration 005).
- **`features/echo/store.ts`:** new async `deleteEntry(entryId)` store action mirroring
  `goal-store.deleteGoal` — persists first (throws on failure), then filters the row out of
  `entries`. The existing `removeEntry` stays a standalone optimistic remove for the move
  flow's "entry gone server-side" (404) path.
- **`features/echo/components/EntryActionMenu.tsx`:** added `onDelete` prop and a second
  `<Pressable>` row inside the existing `AnchoredPopover` (destructive `#C0483A`, matching
  `GoalCard`'s delete color). No positioning changes — the popover re-measures via `onLayout`.
- **`features/echo/components/EchoScreen.tsx`:** threaded `onDelete` through `EchoEntryListCard`
  the same way `onOpenMoveMenu` is. New `handleDeleteEntry` mirrors `GoalCard`'s web/native
  confirmation split exactly (`window.confirm` on web, `Alert.alert` elsewhere; "This cannot be
  undone", Cancel/Delete), then calls the store's `deleteEntry`; failures surface an alert.
- `npx tsc --noEmit` clean. Files touched: `features/echo/services/echo-service.ts`,
  `features/echo/store.ts`, `features/echo/components/EntryActionMenu.tsx`,
  `features/echo/components/EchoScreen.tsx`.
### Added (2026-07-10 — Entry Delete / hard delete)
- **`app/api/entries/[id]+api.ts`:** new route exporting `DELETE`. Hard-deletes an
  Echo entry the caller owns. Coexists with the sibling `app/api/entries/[id]/move+api.ts`
  (different file, no route conflict — `/api/entries/:id` DELETE vs `/api/entries/:id/move`
  PATCH). Shape is a byte-for-byte mirror of the Move route: `isDatabaseConfigured` 503
  guard → `withAuth` → `sanitizeString(params.id)` (400 on bad id) → `createAuthedClient` →
  `isEntryOwnedByUser` (404 if not owned) → `.from('echo_entries').delete().eq('id', entryId)`
  → `{ success: true }`. Same local `sanitizeString` helper and same try/catch 500 shape.
- **Client:** no new store action — the existing `removeEntry(entryId)` in
  `features/echo/store.ts` handles optimistic removal.
- **Provenance note (documented, not changed):** `interests.source_thorn_id` FK is
  `ON DELETE SET NULL` (`supabase/migrations/002_echo.sql:83`). Deleting a thorn-sourced
  entry nulls that provenance pointer on any derived `interests` row without deleting the
  row. Confirmed non-blocking: repo-wide grep found **zero** application-code consumers of
  `source_thorn_id` (lib/app/hooks/features/components/types), so nothing assumes it is
  populated. Behavior left as-is.

### Smoke-test checklist
- DELETE `/api/entries/:id` for an owned entry → 200 `{ success: true }`, row gone.
- DELETE another user's entry id → 404 `Not found` (no delete).
- DELETE with DB unconfigured → 503; malformed/empty id → 400.
- Delete a thorn-sourced entry that seeded an `interests` row → interests row survives with
  `source_thorn_id` nulled.

### Changed (2026-07-10 — Sign-out consolidation cleanup)
- **Context:** closes out audit finding #3 from the 401-handling work: two separate
  sign-out implementations existed (`lib/api/client.ts`'s `signOutAndRedirect()` and
  `features/auth/services/auth-service.ts`'s `signOut()`). Decision (product): local-scope
  sign-out only — signing out on one device must not kill sessions on the user's other
  devices — and `signOutAndRedirect()` is the single implementation going forward.
- **`features/auth/services/auth-service.ts`:** removed the dead `signOut()` export.
  Confirmed via repo-wide grep immediately before deletion that it had zero callers
  (`AvatarMenu.tsx` already calls `signOutAndRedirect()` directly, not this). `signIn`,
  `signUp`, and `getSession` in this file are unrelated and untouched; the `supabase`
  import stays since those three still use it.
- No changes to `signOutAndRedirect()` or `AvatarMenu.tsx` — both were already correct.
- If "sign out of all other devices" is needed later, that should be a new,
  explicitly-named function (e.g. `signOutAllDevices()`) built when actually scoped, not
  a reason this dead function should have been kept speculatively.
- `npx tsc --noEmit` clean. Files touched: `features/auth/services/auth-service.ts`,
  `CHANGELOGCODEX.md`.

### Changed (2026-07-09 — Session 4.4 follow-up: authedFetch migrated to screens/components; sign-out unified)
- **Context:** third and final follow-up to the 401-handling work. Closes out the six
  non-hook call sites flagged as out-of-scope in the previous pass:
  `app/(app)/dashboard.tsx`, `app/(app)/constellation.tsx`, `app/goals/create.tsx`,
  `components/layout/{SettingsModal,AccountModal,AvatarMenu}.tsx`.
- **`dashboard.tsx`:** its local `getAccessToken()` helper (reused across 5 call sites —
  `DueTodayZone`'s load/complete, `ActiveGoalCard`'s status update, the background Echo
  reconcile, and the Intelligence insight fetch) is gone; all 5 now use `authedFetch`.
  The reconcile/insight calls were previously "fail silently" on any error, including a
  missing session — they now redirect-to-login specifically on a genuine 401, same as
  everywhere else, while still swallowing non-auth failures silently (network errors,
  5xx) exactly as before.
- **`constellation.tsx`, `SettingsModal.tsx`:** straightforward `getAccessToken` →
  `authedFetch` swaps, same pattern.
- **`AccountModal.tsx`:** split its `getAccessTokenAndUserId()` helper — the avatar
  upload's Supabase Storage call needs `userId` only (storage calls use the ambient
  client session, never a manual Bearer header) via a slimmed `getUserId()`; the actual
  `/api/profile` GET/PATCH calls (load, avatar-url patch, save) now go through
  `authedFetch` and no longer need a token threaded in at all.
- **`goals/create.tsx`:** the `/api/goals/create` and `/api/goals` POST calls (gated
  behind an explicit `getUser()`+`getSession()` check before this change) now use
  `authedFetch`, which subsumes that gate. **Deliberately NOT migrated:** the
  `/api/actions` POST in the post-finalization "action capture" turn — its own comment
  says "action is a bonus, not a gate," and it already sends the request even with no
  token, treating a non-ok response as a non-fatal warning so the user still navigates
  to their new goal. Migrating this one to `authedFetch` would turn a soft, non-blocking
  failure into a hard redirect-to-login at exactly the moment a goal was just
  successfully created — preserved as-is, same reasoning as `echo/reflect`'s pre-auth
  early return in the previous pass.
- **`AvatarMenu.tsx` — also closes out audit finding #2:** the original Step-0 audit
  named this file's manual sign-out (`clearAllStores` + `signOut({scope:'local'})` +
  redirect) as one of three original divergent 401/session-end behaviors. `lib/api/client.ts`'s
  internal sequence for the same steps is now exported as `signOutAndRedirect()` and
  reused directly here — the profile-chrome fetch also moved to `authedFetch`. All three
  originally-catalogued sites (`onAuthStateChange`, `AvatarMenu`'s sign-out, and
  Vault's local error state) now share one implementation.
- `npx tsc --noEmit` clean. Net: -112 lines across 7 files. Sweep of the whole client
  tree confirms no manual `Authorization: Bearer` header construction remains outside
  the one deliberately-preserved `goals/create.tsx` action-capture call.
- Files touched: `app/(app)/dashboard.tsx`, `app/(app)/constellation.tsx`,
  `app/goals/create.tsx`, `components/layout/{SettingsModal,AccountModal,AvatarMenu}.tsx`,
  `lib/api/client.ts`, `CHANGELOGCODEX.md`.

### Changed (2026-07-09 — Session 4.4 follow-up: authedFetch migrated to all remaining hooks)
- **Context:** second follow-up to the 401-handling work. The server side (all 19 API
  routes on `withAuth`) was finished in the previous pass; this pass finishes the client
  side named in the original audit: `useVault`, `useGoalDetail`, `useActivity`,
  `useEchoTrail`, `useLatestAction`, and `fetchFolders`/`getEntryContainer` in
  `echo-service.ts`.
- **`features/goals/hooks/useVault.ts`:** all five methods (`refresh`, `addNote`,
  `addLink`, `updateItem`, `removeItem`) now call `authedFetch` instead of each
  independently fetching the session and building the `Authorization` header. Previously
  `refresh` was the only method that surfaced `setError('Unauthorized')` on a missing
  session — the other four silently no-op'd; now all five converge on `authedFetch`'s
  redirect-to-login instead of three different behaviors in one file.
- **`features/goals/hooks/useGoalDetail.ts`:** `onCompleteMeasurable`'s manual
  session-check-then-fetch replaced with `authedFetch`; kept the friendlier "You need to
  be signed in..." message by catching `UnauthorizedError` specifically. The unrelated
  `load()` effect (direct `supabase.auth.getUser()` + `lib/db` service calls, no `/api/*`
  fetch involved) is untouched — out of scope for this wrapper.
- **`features/goals/hooks/useActivity.ts`, `features/actions/hooks/useLatestAction.ts`:**
  same pattern — manual session-check-then-fetch replaced with `authedFetch`;
  `useLatestAction` had this duplicated twice in the same file (initial load effect +
  `mutate`), both fixed.
- **`features/goals/hooks/useEchoTrail.ts`:** `confirmLink`/`dismissLink` migrated;
  `refresh` (which calls `lib/db/echo-entry-links` directly, not `/api/*`) untouched.
- **`features/echo/services/echo-service.ts`:** `requestEchoReflection` (used by
  `createEntry`) and `fetchFolders` migrated to `authedFetch`, dropping their
  `accessToken` parameters — the session is now fetched internally by `authedFetch`
  rather than threaded in by every caller.
- **`features/echo/hooks/useMoveEntry.ts`:** its local `getAccessToken` helper (built on
  `supabase.auth.getSession()`) is gone entirely now that `fetchFolders()` no longer
  needs a token passed in — both call sites (`open`, and the `target_not_found` retry in
  `confirm`) simplified accordingly.
- **Not migrated (out of scope — these are screens/components, not the hooks the audit
  named):** `app/(app)/dashboard.tsx`, `app/(app)/constellation.tsx`,
  `app/goals/create.tsx`, `components/layout/{SettingsModal,AccountModal,AvatarMenu}.tsx`
  still build their own `Bearer` header inline. Candidates for a further pass.
- `npx tsc --noEmit` clean. Net: -137 lines across 7 files.
- Files touched: `features/goals/hooks/{useVault,useGoalDetail,useActivity,useEchoTrail}.ts`,
  `features/actions/hooks/useLatestAction.ts`, `features/echo/services/echo-service.ts`,
  `features/echo/hooks/useMoveEntry.ts`, `CHANGELOGCODEX.md`.

### Changed (2026-07-09 — Session 4.4 follow-up: withAuth migrated to all remaining routes)
- **Context:** follow-up to the "first cut" below, which deliberately migrated only one
  route (`entries/[id]/move+api.ts`) as a demo and left the other 18 for incremental
  adoption. Migrated the rest of them now, in one pass.
- **18 route files migrated to `withAuth`:** `actions/[id]`, `actions/index`,
  `dashboard/summary`, `echo-links/index`, `echo-links/[linkId]`, `echo/reconcile`,
  `echo/reflect`, `folders/index`, `folders/[id]`, `goals/activity`,
  `goals/complete-measurable`, `goals/create`, `goals/index`, `intelligence/index`,
  `measurables/due-today`, `profile/index`, `vaults/[goalId]`, `vaults/items/[itemId]`.
  All 12 files that had copy-pasted their own local `getAuthContext`/
  `getAuthContextFromRequest` are gone; the 5 files that hand-rolled the
  header-parse-and-`getUser()` check inline (`goals/activity`, `goals/complete-measurable`,
  `dashboard/summary`, `measurables/due-today`, plus `echo/reconcile`'s locally-shadowed
  `getAuthContext`) are also converted. `goals/index` and `profile/index` already used the
  shared `getAuthContext` export (no duplication) but not the `withAuth` wrapper — migrated
  for full consistency so every route now goes through the same helper. Net: -154 lines
  across 19 files (this pass + the earlier `move+api.ts` demo).
- **`withAuth` extended with an optional `onUnauthorized` hook** (`lib/api/auth.ts`): three
  routes (`goals/create`, `goals/index`, `intelligence/index`, `profile/index`) are
  documented as returning the `AiResponse`/`ApiResponse` envelope on 401
  (`{ok:false, data:null, error:{code:'UNAUTHORIZED', ...}}`), not the plain
  `{error:'Unauthorized'}` body the other routes return. `withAuth` defaults to the plain
  shape and takes `{ onUnauthorized: () => Response }` to preserve the documented envelope
  exactly on those four — de-duplicating the auth check without silently changing a
  response contract (root CLAUDE.md marks AI output contracts L3/team-decision).
- **One behavior-preserving structural note:** `echo/reflect+api.ts`'s `POST` has an early
  return (`aiInsightRequested === false`) that runs *before* the auth check even in the
  original code — i.e. that one path was reachable without a valid session. Preserved
  exactly: the JSON-body parse and that early return still happen before `withAuth` is
  invoked; only the remainder of the handler moved into an auth-wrapped function. Flagged
  here since it's easy to accidentally "fix" (move auth first) while refactoring, which
  would be an authorization behavior change, not a dedup — out of scope for this pass.
  Similarly, `goals/activity+api.ts` previously checked `goalId` presence (400) before
  checking auth (401); migrating flips that order (auth now runs first, matching every
  other route) — a minor, intentional consistency fix rather than a preserved quirk, since
  no legitimate caller is affected (a real client always sends a token).
- `npx tsc --noEmit` clean after the full pass.
- Files touched: the 18 route files listed above, `lib/api/auth.ts`, `CHANGELOGCODEX.md`.

### Added (2026-07-09 — Session 4.4: app-wide 401 handling, first cut)
- **Context:** follows the Step 0 read-only 401-handling audit this session, which found no
  app-wide interceptor — three divergent client-side reactions to auth failure
  (`onAuthStateChange` redirect, `AvatarMenu`'s manual sign-out, `useVault`'s local
  `setError('Unauthorized')`), a fourth flagged-but-deferred gap in `moveEntryRequest`
  (explicit placeholder comment referencing this exact audit), and the server-side identity
  check (`getAuthContext`) duplicated locally in 12 of 14 route files instead of imported from
  `lib/api/auth.ts`. Full cutover this session (not incremental) per explicit instruction —
  pre-pilot, no live-data migration risk.
- **`lib/api/client.ts` (new):** `authedFetch(path, init)` — attaches the current session's
  Bearer token and, on a 401 (missing session or server-rejected token), clears all Zustand
  stores, nulls the auth store's session, calls `supabase.auth.signOut({ scope: 'local' })`, and
  redirects to `/(auth)/login` — converging with what `onAuthStateChange` already does for
  refresh-token expiry, so both paths now produce the same visible behavior instead of a third
  one being invented. Non-401 statuses (404, 500, ...) are returned to the caller unchanged;
  this wrapper only owns the "is this request authenticated" concern.
- **`lib/api/auth.ts`:** added `withAuth(handler)` — wraps a route handler with the existing
  `getAuthContext` check so route files stop hand-rolling `if (!auth) return 401`. Only 2 of 14
  route files used the shared `getAuthContext` export before this; the other 12 are unchanged
  for now (see below) and remain candidates for a follow-up mechanical migration.
- **Retrofit demo (one route + one hook, per audit's minimum-viable-retrofit recommendation):**
  - `app/api/entries/[id]/move+api.ts`: replaced its locally-duplicated
    `getAuthContextFromRequest` with `withAuth`. The pre-existing `isDatabaseConfigured` 503
    check is kept as an outer gate before `withAuth` runs (rather than folded into it), since
    `getAuthContext` itself collapses "not configured" into a 401 — keeping 503 distinct here
    is strictly more correct than the two existing `getAuthContext` call sites (`goals/index`,
    `profile/index`), which don't separate the two.
  - `features/echo/services/echo-service.ts`'s `moveEntryRequest`: now calls `authedFetch`
    instead of building its own `Authorization` header from a passed-in `accessToken`, and its
    401 branch no longer maps to `'generic'` with a stale "no interceptor exists yet" comment —
    401 now can't reach this function's response-handling logic at all (authedFetch intercepts
    and redirects first); the `catch` only needs to distinguish `UnauthorizedError` (session
    expired — user is already being redirected) from a genuine network failure (`'offline'`).
  - `features/echo/hooks/useMoveEntry.ts`: `confirm()` no longer fetches an access token before
    calling `moveEntryRequest` (that's now internal to `authedFetch`); the token is still
    fetched locally for the `target_not_found` retry path, which calls `fetchFolders`
    (unmigrated — takes a token directly, out of scope this session).
- **Explicitly not done this session (per instruction):** the other 11 route files' local
  `getAuthContext` duplicates, and the remaining client hooks (`useVault`, `useGoalDetail`,
  `useActivity`, `useEchoTrail`, `useLatestAction`, `fetchFolders`/`getEntryContainer` in
  `echo-service.ts`) that still hand-roll session-fetch + header-build + `res.ok` checks. These
  are mechanical follow-ups once this pattern has been reviewed — new code should adopt
  `authedFetch`/`withAuth` directly; old call sites migrate opportunistically, not on a
  deadline, since the old and new patterns don't conflict in the meantime.
- Files touched: `lib/api/client.ts` (new), `lib/api/auth.ts`,
  `app/api/entries/[id]/move+api.ts`, `features/echo/services/echo-service.ts`,
  `features/echo/hooks/useMoveEntry.ts`, `CHANGELOGCODEX.md`.

### Changed (2026-07-09 — Session 4.3 follow-up: backfill + constraint-name fix)
- **Pre-existing-profile backfill (migration 017, amended in place — pre-pilot, not yet merged):**
  the eager-provisioning trigger only covers profiles inserted from the migration forward; any
  profile that already existed at migration time would otherwise have no General folder and no
  path to get one (`getGeneralFolderId()` is a read-only, client-side lookup with no creation
  fallback, by design). Added a one-time backfill directly below the trigger: `INSERT ... SELECT`
  over `public.profiles` with a `NOT EXISTS` scoping filter, guarded by the same `ON CONFLICT
  (user_id) WHERE (is_general = true) DO NOTHING` idempotent shape `get_or_create_general_folder()`
  itself uses. Plain SQL rather than a per-row function call, since this is a one-time data
  operation, not ongoing provisioning logic.
- **Migration 018 constraint-name fix:** the previous version guessed between the two plausible
  names for `link_source`'s check constraint (`echo_goal_links_..._check` pre-rename vs.
  `echo_entry_links_..._check` post-rename) via two defensive `DROP CONSTRAINT IF EXISTS`
  statements. Replaced with a dynamic lookup: a `DO` block queries `pg_constraint` for whatever
  check constraint on `echo_entry_links` currently references `link_source` and drops it by its
  actual (discovered) name. This makes the migration correct regardless of which name turns out
  to be live, without requiring a live schema check to confirm it in advance — still no live
  Supabase credentials in this environment, so this was verified by careful read of the query
  logic only, not by running it; worth a live apply-and-verify pass (or `\d echo_entry_links`
  before/after) as part of CTO sign-off, but the migration no longer depends on a guess.
- Files touched: `supabase/migrations/017_eager_general_folder_provisioning.sql` (amended),
  `supabase/migrations/018_echo_entry_links_system_default_source.sql` (rewritten),
  `CHANGELOGCODEX.md`.

### Changed (2026-07-09 — Session 4.3: General Folder eager provisioning + createEntry() cutover)
- **Context:** follows the Step 0 read-only audit and the Opus architectural review of this
  session (General-folder eager-provisioning + `createEntry()` cutover sequencing). Zero
  production data (pre-pilot), so this lands as one coordinated change rather than a staged
  migration.
- **Eager General-folder provisioning:** added `supabase/migrations/
  017_eager_general_folder_provisioning.sql` — a new `AFTER INSERT ON public.profiles` trigger
  (`handle_new_profile_general_folder()`) calling `get_or_create_general_folder()`, mirroring
  `handle_new_user_space()`'s (003) try/exception non-blocking shape. Kept as a separate trigger
  function rather than folded into `handle_new_user_space()`, so each provisioning concern stays
  independently auditable. Not independently verified against a live Supabase instance (no
  credentials in this environment) — flagged in the migration header as the one thing that
  deserves a live signup smoke test, specifically the SECURITY DEFINER-calling-a-service-role-
  locked-RPC interaction.
- **`getActivityByGoalId` cutover (`lib/db/goals.ts`):** removed the legacy direct
  `echo_entries.goal_id` query branch and its `legacyEchoEntryIds` dedup-against-`echo_entry_links`
  logic entirely. The function now reads `echo_entry_links` exclusively for goal-linked
  reflections. The now-unused `DbEchoEntryRow` type and its `EchoEmotion` import were removed.
  Note: this makes `ActivityKind: 'echo_entry'` (`types/activity.ts`) and its renderer
  (`EchoEntryCard` in `features/goals/components/ActivityFeed.tsx`) permanently dead — never
  emitted by this function anymore. Left both in place (out of scope for this pass; `types/*` is
  CEO-owned and `components/*` is VP-Product-owned) — flagging as Codex cleanup candidates.
- **`createEntry()` cutover (`features/echo/services/echo-service.ts`):** the insert no longer
  writes `echo_entries.goal_id` (column preserved per root CLAUDE.md, just no longer populated on
  new rows). STEP 2 (previously "manual goal linking", fire-and-forget) is now "container
  resolution" and is **awaited**, not fire-and-forget: with the legacy FK join gone, it's the only
  way the returned entry can carry an accurate `goalId`/`goalTitle` or `folderId`/`folderName`
  immediately. When `goalId` is provided: writes the confirmed goal link as before, plus a
  one-off `goals.title` lookup (the FK-embed join that used to supply this is now always null).
  When `goalId` is null: unconditionally resolves and assigns a confirmed `echo_entry_links` row
  to the caller's General folder — **not gated on STEP 3's keyword heuristic finding a match**,
  per the architectural review's Question A resolution (an unconfirmed `ai_auto` suggestion is
  advisory, not a container; migration 016 only caps *confirmed* rows at one-per-entry, so both
  coexist). STEP 3 (keyword auto-link) is unchanged in logic and still fire-and-forget/advisory-only.
  The response entry is built via `applyContainer()` (the same overlay `fetchEntries`/`getEntryById`
  already use) against the container just resolved, applied to every return path including the
  post-AI-reflection re-map.
- **Client/service-role boundary fix:** the General-folder resolution deliberately does **not**
  call `getOrCreateGeneralFolderId()` (service_role-only RPC, migration 014) — `echo-service.ts`
  executes client-side (called directly from `useEntries.ts`), and importing that function would
  pull `service-client.ts` into the client bundle, violating `lib/db/CLAUDE.md`'s explicit "never
  import from client-bundled code" rule. Added `getGeneralFolderId()` (`lib/db/echo-folders.ts`)
  instead: a plain RLS-scoped read (`echo_folders` where `is_general = true`), safe client-side,
  relying on migration 017's eager provisioning to guarantee the row exists by the time any user
  can call `createEntry()`. If it's ever missing, the container is skipped (non-blocking), same
  pattern used everywhere else in this codebase.
- **New link source:** added `'system_default'` to `EchoLinkSource` (`types/echo-link.ts`,
  extending the union per `types/CLAUDE.md`) and widened `echo_entry_links.link_source`'s DB check
  constraint (`supabase/migrations/018_echo_entry_links_system_default_source.sql`) to allow it —
  the General-folder fallback assignment is neither a user's manual choice nor an AI suggestion,
  so labeling it `'manual'` would misrepresent it. The migration drops the check constraint
  defensively under both its pre-rename and post-rename possible names (`echo_goal_links_..._check`
  / `echo_entry_links_..._check`) since 012's table rename didn't explicitly rename it and this
  wasn't checked against a live schema — flagged in the migration header.
- **Not touched, per scope:** `entry.folderId` dead-code removal (separate follow-up), menu
  redesign, Edit/Delete backend, 401 handling, migration squash, `handle_new_user()` itself.
- Files touched: `supabase/migrations/017_eager_general_folder_provisioning.sql` (new),
  `supabase/migrations/018_echo_entry_links_system_default_source.sql` (new), `lib/db/goals.ts`,
  `lib/db/echo-folders.ts`, `features/echo/services/echo-service.ts`, `types/echo-link.ts`,
  `CHANGELOGCODEX.md`.

### Changed (2026-07-09 — Cleanup: remove dead client `entry.folderId`)
- Removed the dead client-only `folderId` field from `features/echo/types.ts`'s `EchoEntry` and
  deleted the matching optimistic write-only assignments in `features/echo/store.ts`,
  `features/echo/hooks/useMoveEntry.ts`, and `features/echo/services/echo-service.ts` (including
  the rebased `createEntry()` General-folder container payload) after a fresh grep re-verified
  there were still no read/render sites for `entry.folderId`.

### Added (2026-07-09 — Session 4.2: Anchored entry action popover)
- Added `components/ui/AnchoredPopover.tsx`, a reusable `Modal transparent`-backed popover
  primitive that positions itself from a measured trigger rect, right-edge-aligns to the anchor,
  clamps to the viewport with a small margin, and flips upward when there is not enough room
  below. This keeps the interaction lightweight and web/native-safe without adding a popover
  dependency.

### Changed (2026-07-09 — Session 4.2: EntryActionMenu anchored-menu adoption)
- Replaced `features/echo/components/EntryActionMenu.tsx`'s bottom-anchored sheet with the new
  anchored popover so the existing single "Move to folder" row now opens adjacent to the `···`
  trigger instead of consuming the bottom of the screen. The trigger captures its rect via
  web `getBoundingClientRect()` when available and falls back to `measureInWindow()` without
  changing the existing `onMoveToFolder` wiring. Files touched: `components/ui/AnchoredPopover.tsx`,
  `features/echo/components/EntryActionMenu.tsx`, `CHANGELOGCODEX.md`.

### Changed (2026-07-09 — Session 4.1: Move-to-Folder bug-fix pass, per Opus code review)
- **Step 0 audit:** `get_or_create_general_folder()` fires **only** from the folder DELETE-reassign
  path (`app/api/folders/[id]+api.ts`), never on entry save (`createEntry` writes no folder link)
  and never on folder list (`GET /api/folders` is a plain SELECT). A user who has only saved
  entries has **no** General folder — this is why manual-checklist item 9 had no General target.
  Whether container-less entries *should* auto-land in General is a product-design question and a
  write-path change; **deferred** to the migration-squash session, not touched here. No Supabase
  credentials exist in-repo, so the "has this user saved a container-less entry" DB check was not
  runnable — but the code makes it moot (nothing auto-provisions General on save regardless).
- **Canonical container read (Opus finding #4 — cross-reload pill staleness):**
  `features/echo/services/echo-service.ts` now overlays each entry's pill from its **confirmed
  `echo_entry_links` row** (`fetchConfirmedContainers`, batched, same `confirmed = true`
  single-container scoping as `getEntryContainer`) in both `fetchEntries` and `getEntryById`,
  instead of trusting the legacy `echo_entries.goal_id → goals()` join. A move only rewrites
  `echo_entry_links`, so pre-fix a moved-to-folder entry showed its **old goal pill** after reload.
  `mapEntry`'s legacy join is retained as a fallback for entries with no confirmed link (so
  never-linked entries → no pill, freshly-created entries still show their pill immediately) — the
  **write path (`createEntry`) is deliberately untouched**, this is a read-side fix only. This
  supersedes the Session 4 note below that "`fetchEntries`/`getEntryById` still only join `goals`."
  `setEntryContainer` was **kept** (not removed): it is *not* redundant — it is the in-session
  optimistic update; the canonical read only corrects the picture on the next fetch/reload.
- **Confirmed-row invariant (Opus finding #1):** added `supabase/migrations/
  016_echo_entry_links_one_confirmed.sql` — a partial unique index enforcing at most one
  `confirmed = true` row per `echo_entry_id`, codifying "an entry is never in both a goal and a
  folder at once" that `.maybeSingle()` already assumed.
- **Rapid-switch preselect race + save-state guards (Opus finding #6):** `useMoveEntry.open` now
  captures the requested entry id in a ref and drops a late-resolving fetch if a newer `open`/
  `close` superseded it (no more wrong checkmark when switching entries fast). `MoveEntryModal`
  blocks backdrop / hardware-back dismissal while `isSaving`, and dims + `disabled`s the picker
  rows during an in-flight move.
- **Differentiated move-error UX (Opus finding #3, scoped):** `moveEntryRequest` now returns a
  typed `kind` (`entry_not_found` | `target_not_found` | `offline` | `server` | `generic`).
  `useMoveEntry.confirm` acts on it: 404-entry-gone → remove the entry from the list (`removeEntry`,
  new store action) and close; 404-target-gone → refresh the picker options (folders in-hook, goals
  via `reloadPickerGoals`) and keep the modal open with friendly copy; 500 → generic retry copy.
  **401 is intentionally left as existing behavior** (surface the message) — Step 0 confirmed there
  is **no app-wide 401/re-auth interceptor** to reuse (`onAuthStateChange` in `_layout`, ad-hoc
  `setError('Unauthorized')` in `useVault`), so no one-off flow was invented here. **Gap flagged.**
- **Session outcome:** originated from a read-only Opus code review of merged PR #7 (6 findings
  across the new `echo_entry_links` read, tap isolation, error handling, orphaned fields, the
  store action, and a preselect race). Findings #1/#3/#4/#5/#6 were fixed above and shipped as
  **PR #9 (merged, merge commit `8a13075`)**; `main` synced local + remote. `tsc --noEmit` clean;
  no live-DB/app runtime verification was possible (no Supabase creds in-repo). Deferred/flagged
  items (General-folder-on-save design question, `createEntry` legacy dual-write, orphaned
  `folderId`, the 401 gap, string-based 404 disambiguation, Edit/Delete actions, and applying
  migration `016`) are tracked in `OUTSTANDING.md` → Echo.

### Added (2026-07-09 — Session 4: Entry Action Menu + Move-to-Folder Picker)
- **Step 0 audit (read-only, done before any code):**
  - No edit-entry flow exists anywhere — no edit-composer route, no update-entry API route.
  - No delete-entry API route or DB function exists (`lib/db/echo-entry-links.ts`'s only
    `.delete()` is `dismissLink`, which removes an unconfirmed AI-suggested link row, not an
    entry). Per instruction, the action menu omits Edit/Delete entirely rather than wiring dead
    buttons, and no delete/edit backend was created this session.
  - No existing query read the *full* confirmed `echo_entry_links` row — `moveEntryContainer`
    (Session 3) only ever selected `id` from it, to decide update-vs-insert. Added a new read
    (`getEntryContainer`) rather than duplicating that logic, relying on the same RLS ownership
    path (`echo_entries.user_id = auth.uid()`, `005_echo_goal_links.sql`) already used by
    `fetchEntries`/`getEntryById`.
- **Entry action menu:** `features/echo/components/EntryActionMenu.tsx` (new) — an always-visible
  "···" button, rendered as an absolutely-positioned **sibling** of `EchoEntryListCard`'s existing
  `Pressable` (not nested inside it), so opening the menu can never trigger the card's
  navigate-to-detail `onPress` — no `stopPropagation()` needed, identical behavior on web and
  native. Tapping it opens a small bottom-sheet `Modal` (matching the existing bottom-sheet
  pattern in `EchoScreen.tsx`'s "Link a goal" picker) with a single row, "Move to folder" —
  Edit/Delete rows are omitted per the Step 0 findings above.
- **Move-to-folder/goal picker:** `features/echo/components/MoveEntryModal.tsx` (new) — single-
  select list with two sections: "Projects" (reuses `fetchActiveGoalsForPicker`,
  `echo-service.ts:387-399`, unchanged — not duplicated) and "Echo Folders" (`GET /api/folders`,
  general-folder-first per its existing ordering). On open, preselects/highlights the entry's
  current confirmed container. Confirm calls `PATCH /api/entries/[id]/move` and surfaces all of
  its documented response cases as user-facing text (200 success; 404 `Not found` / `Target goal
  not found` / `Target folder not found`; 401; 500) — no silent error swallowing.
- **New hook:** `features/echo/hooks/useMoveEntry.ts` — orchestrates opening the picker for a
  given entry id (fetches folders + current container in parallel via `supabase.auth.getSession()`
  → access token, same pattern as `createEntry`'s Echo-reflect call), confirming a move, and
  closing. Keeps `MoveEntryModal`/`EntryActionMenu` purely presentational per `features/CLAUDE.md`
  rule 3 (components receive data as props; only hooks/services touch Supabase or fetch).
- **`features/echo/services/echo-service.ts` additions:** `getEntryContainer` (direct
  `echo_entry_links` read, confirmed row only), `fetchFolders` (calls `GET /api/folders` with a
  bearer token, mirroring `requestEchoReflection`'s fetch-with-token convention rather than
  querying `echo_folders` directly, since it's the same server route Session 3 already built and
  auth-checks), `moveEntryRequest` (calls `PATCH /api/entries/[id]/move`, maps all response shapes
  to a typed `MoveEntryResult`).
- **`features/echo/store.ts`:** added `setEntryContainer` action — a **pure synchronous setter**
  (no `await`/service call inside the store), with all async orchestration living in the
  `useMoveEntry` hook. This follows `features/CLAUDE.md`'s services-pure / hooks-wire-services
  convention, and is **not** the same shape as `features/goals/store.ts`'s `deleteGoal` (which
  co-locates an `await deleteGoalRecord(...)` *and* `set(...)` inside the store action). Only the
  local-state map/`set` step is shared between them. It updates the moved entry's `goalId`/
  `goalTitle` or `folderId`/`folderName` locally (clearing the other pair) so the card reflects
  its new destination immediately without a full refetch.
- **`features/echo/types.ts`:** added optional `folderId?: string | null` and `folderName?: string`
  to `EchoEntry`. This is a feature-local type (`features/echo/types.ts`, VP-Product-owned per
  root `CLAUDE.md`'s file ownership, distinct from the CEO-owned top-level `types/` — confirmed
  before extending it) — not a schema or `types/*` L3 change. Entries don't currently carry
  `folder_id` from any fetch (`fetchEntries`/`getEntryById` still only join `goals`, not
  `echo_entry_links`); these fields are populated purely by the optimistic local update above,
  not by any query, and only after a successful folder move.
- **`features/echo/components/EchoScreen.tsx`:** `EchoEntryListCard` now takes an
  `onOpenMoveMenu` prop, renders `EntryActionMenu`, and shows a small pill for `entry.folderName`
  (falling back to the pre-existing `entry.goalTitle`) next to the relative-time/emotion row —
  the only visible container indicator added to the card. `EchoScreen` wires `useMoveEntry` and
  renders `MoveEntryModal` alongside the existing "Link a goal" `Modal`.
- **Explicitly out of scope, not touched:** `EchoDetailScreen.tsx`, `ReflectionCard.tsx` (per
  instruction), and the composer's existing "+Link goal" / "AI insight" controls + bottom-sheet
  modal (`EchoScreen.tsx`'s pre-existing picker, a separate net-new entry point from this one).
  No delete-entry or edit-entry backend route was created, even though Step 0 found both missing.
- Files touched: `features/echo/components/EntryActionMenu.tsx` (new),
  `features/echo/components/MoveEntryModal.tsx` (new), `features/echo/hooks/useMoveEntry.ts`
  (new), `features/echo/components/EchoScreen.tsx`, `features/echo/services/echo-service.ts`,
  `features/echo/store.ts`, `features/echo/types.ts`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean before and after (zero new errors). Not yet manually
  exercised in a running app — flagged as the test plan on the PR.
- Shipped as PR #7 (`worktree-echo-folders-session4` → `main`), merged same session; branch
  deleted (remote + local) after merge.

### Added (2026-07-09 — Session 3: Folder CRUD API Routes, live-verified)
- **Pre-check (per session brief):** confirmed `echo_entry_links.echo_entry_id → echo_entries.id`
  is `ON DELETE CASCADE` (set in `005_echo_goal_links.sql`, carried through the `012` rename
  unchanged) — contrasts with the deliberate `ON DELETE RESTRICT` on `folder_id`
  (`013_echo_folders.sql`). This meant `delete_contents` only needs to delete `echo_entries`
  rows; the DB cascades their `echo_entry_links` rows automatically before the folder row is
  removed.
- **Routes added**, matching the existing `echo-links` route's conventions (local
  `getAuthContextFromRequest`, `sanitizeString`, flat `{error}`/`{data}` JSON shapes — the most
  recently-touched same-domain code at the time):
  - `GET/POST /api/folders` (`app/api/folders/+api.ts`) — list, create. `POST` rejects
    client-supplied `is_general` (server-controlled only).
  - `PATCH/DELETE /api/folders/[id]` (`app/api/folders/[id]+api.ts`) — rename, delete.
    Ownership + `is_general` checked before any mutation (403, not a silent no-op). Delete body
    `{ mode: 'delete_contents' | 'folder_only' }`.
  - `PATCH /api/entries/[id]/move` (`app/api/entries/[id]/move+api.ts`, new `entries` resource —
    none existed before) — body `{ target_type: 'goal' | 'folder', target_id }`. Verifies entry
    ownership, then target ownership (`isGoalOwnedByUser` / `getFolderByIdForUser`), before
    calling `moveEntryContainer`, which repoints only the entry's single *confirmed* link row —
    unconfirmed `ai_suggested` goal-link rows are left untouched by design.
- **Migration `015_folder_delete_functions.sql`:** two `SECURITY INVOKER` plpgsql functions,
  `delete_folder_reassign` and `delete_folder_with_contents`, so each `DELETE` mode runs as one
  atomic transaction (supabase-js has no multi-statement transaction support over PostgREST).
  Both re-verify folder ownership/`is_general` internally via `auth.uid()` on top of RLS.
- **Supporting lib/db changes:** `lib/db/echo-folders.ts` (new — folder CRUD +
  `getOrCreateGeneralFolderId`, `deleteFolderReassign`, `deleteFolderWithContents`);
  `lib/db/echo-entry-links.ts` (`isEntryOwnedByUser`, `moveEntryContainer`); `lib/db/goals.ts`
  (`isGoalOwnedByUser`); `types/echo-folder.ts` (new); `.env.example`
  (`SUPABASE_SERVICE_ROLE_KEY`, server-only, documented). A `createServiceRoleClient()` was
  first added directly to `lib/db/client.ts`, then extracted mid-session into its own
  `lib/db/service-client.ts` to close a client-bundle leak risk — see the "Service role key
  leaking into client web bundle" entry below for that fix's own detail.
- **Live verification (real dev server + real JWTs, not tsc-only):** ran `expo start --web`
  and hit the actual route code over HTTP with two real Supabase test users (created/deleted
  via the admin API for this run only), cross-checking DB state directly via a service-role
  client rather than trusting API responses alone.
  - **Bug found and fixed:** migration `015` had never been applied to the live project — only
    `001`–`014` were tracked in `supabase_migrations.schema_migrations` — so both new RPCs were
    missing (`PGRST202`) and every `DELETE /api/folders/[id]` call 500'd. Applied the migration
    directly via `psql` (using `SUPABASE_DB_PASSWORD`, newly added to `.env.local` for this),
    then recorded it in the tracking table. Re-confirmed both functions are `SECURITY INVOKER`
    (`prosecdef = f`) as designed.
  - **23/23 checks passed** after the fix: `delete_contents` cascade (entries, links, and
    folder row all confirmed gone via direct query); `folder_only` reassignment (entries
    survived, all links' `folder_id` confirmed *equal to* the resolved General folder id, not
    just non-null; original folder row gone); General-folder rename/delete guards (403 on all
    three route paths, DB confirms untouched); cross-user ownership on folder rename/delete
    (404, DB confirms untouched); cross-user ownership on the move endpoint — moving another
    user's entry, moving into another user's folder, and moving into another user's goal all
    rejected with 404, DB confirms untouched, with a positive control (same-user move) verified
    to still succeed (200) so the endpoint isn't just failing closed universally; single call
    site for `get_or_create_general_folder` (`app/api/folders/[id]+api.ts:162`) confirmed to
    source `p_user_id` exclusively from `auth.userId` (server-side session), never the request
    body.
  - Test users, test folders/entries, and the throwaway verification/probe/cleanup scripts
    used for this run were all removed afterward; dev server stopped.
- Files touched: `app/api/folders/+api.ts` (new), `app/api/folders/[id]+api.ts` (new),
  `app/api/entries/[id]/move+api.ts` (new), `supabase/migrations/015_folder_delete_functions.sql`
  (new, applied live), `lib/db/echo-folders.ts` (new), `lib/db/echo-entry-links.ts`,
  `lib/db/goals.ts`, `types/echo-folder.ts` (new), `.env.example`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean throughout. Live HTTP + direct-DB verification per
  above (23/23 passed).
- Out of scope, not touched: `handle_new_user()`, the migration squash, any frontend/UI wiring
  for folders (Session 4+).

### Fixed (2026-07-09 — lib/db/CLAUDE.md was a stray duplicate of components/CLAUDE.md)
- **What it was:** `lib/db/CLAUDE.md` contained component/theming content (NativeWind rules,
  GoalCard/VaultItemCard/etc. component list, BRT hex colors) instead of directory-scoped
  context for `lib/db/`. `git log --follow` showed this wasn't a move/rename gone wrong — the
  file was created from scratch in commit `c27ecf6` (Add Vault route and milestone-tap
  navigation) as a verbatim copy-paste of the already-existing `components/CLAUDE.md`,
  mislabeled from the moment of creation (its header still read
  `# components/CLAUDE.md — Component Rules`). Two later commits (`54a4c68`, `d24932e`)
  applied identical color-token fixes to both files — a grep-replace pattern run across all
  `CLAUDE.md` files without checking each file's actual scope, which is what kept the
  duplicate looking "maintained" instead of surfacing it as dead weight.
- **Fix:** discarded the copied content; wrote a real `lib/db/CLAUDE.md` covering
  `client.ts`/`service-client.ts`'s anon-vs-service-role split, each service module
  (`goals.ts`, `spaces.ts`, `vaults.ts`, `echo-folders.ts`, `echo-entry-links.ts`,
  `embeddings.ts`), and the row-mapping/RLS conventions used throughout. `components/CLAUDE.md`
  was untouched — it already had correct, currently-maintained content (in fact slightly ahead
  of what had been copied, e.g. the `#1A1F1C` near-black fix in `439bb08`).
- **Follow-up cleanup — audited all CLAUDE.md files repo-wide** to check for the same pattern
  elsewhere:
  - `CLAUDE.md` (root) is a symlink to `docs/CLAUDE.md` — the two being byte-identical across
    history is by design, not a duplicate.
  - `components/CLAUDE.md`, `features/CLAUDE.md`, `supabase/CLAUDE.md` — scope matches their
    directories.
  - `lib/ai/CLAUDE.md` — scope correct, but references `vault-insights.ts`, which has never
    existed in git history (root `CLAUDE.md`/`docs/CLAUDE.md` references it too). Stale
    aspirational content, not a duplication issue — flagged, not fixed this pass.
  - `supabase/CLAUDE.md` — says "Next new migration: 013" but 013–015 already exist. Staleness,
    not duplication — flagged, not fixed this pass.
  - `types/CLAUDE.md` — has a stray paragraph (added in commit `26a7e4b`) entirely about
    `components/ui/Modal.tsx`'s confirm/cancel API, instructing that it be documented in
    "CLAUDE.md for components." It was never acted on: `components/CLAUDE.md` has no Modal
    documentation and `Modal.tsx` has no such comment. Misplaced content, not duplication —
    flagged, not fixed this pass (out of scope for this session; needs its own pass).
  - Added a short scope-guard note to `docs/CLAUDE.md` (root `CLAUDE.md`'s symlink target),
    under "File Ownership": nested CLAUDE.md files are directory-scoped and must not be edited
    via blanket find/replace across all CLAUDE.md files — repo-wide patterns (like a
    color-token rename) need to be applied per-file, scope-checked, not copy-propagated.
- Files touched: `lib/db/CLAUDE.md`, `docs/CLAUDE.md`, `CHANGELOGCODEX.md`.

### Fixed (2026-07-09 — Service role key leaking into client web bundle)
- **Pre-check for Session 3 live verification** (`SUPABASE_SERVICE_ROLE_KEY` newly added to
  `.env.local` to unblock test-user creation) found `createServiceRoleClient()` shipping into
  the client web bundle. Root cause: `lib/db/client.ts` mixed client-safe exports (`supabase`,
  `createAuthedClient`, `isDatabaseConfigured`) with the server-only
  `createServiceRoleClient()` in one module. Metro doesn't tree-shake at export granularity —
  any client-side import from the file (`supabase`/`createAuthedClient`) pulled the whole
  module graph, including the server-only function body, into
  `client/_expo/static/js/web/entry-*.js`.
- **Verified before fixing:** `.env.local` is gitignored (`.env*.local`); no `EXPO_PUBLIC_`
  variant of the key exists anywhere in the repo; the only importer of
  `createServiceRoleClient` was `lib/db/echo-folders.ts` → `getOrCreateGeneralFolderId`,
  reachable solely from three server-only `+api.ts` routes (`app/api/folders/+api.ts`,
  `app/api/folders/[id]+api.ts`, `app/api/entries/[id]/move+api.ts`), never from a
  screen/component/hook. Ran `npx expo export --platform web` and grepped the actual
  `client/_expo/static/**` output (not the server bundle): the literal string
  `SUPABASE_SERVICE_ROLE_KEY` and the `service_role` substring were present (2 hits, in the
  function source), but the **actual key value was never present** (zero matches) — the
  browser's `process.env` polyfill only sets `NODE_ENV`, so the runtime lookup resolves to
  `undefined` and the existing fail-closed guard (throws if the key is missing) meant nothing
  ever actually leaked. Still a real gap: safety depended entirely on that polyfill behavior
  rather than the module boundary itself.
- **Fix:** moved `createServiceRoleClient()` out of `lib/db/client.ts` into a new
  `lib/db/service-client.ts` — self-contained (derives its own `supabaseUrl` from
  `EXPO_PUBLIC_SUPABASE_URL` rather than importing it, so it has zero coupling back to
  `client.ts`), fail-closed guard and server-only comment carried over unchanged. Updated the
  sole importer, `lib/db/echo-folders.ts`, to pull `supabase` from `./client` and
  `createServiceRoleClient` from `./service-client`. `lib/db/client.ts`'s other exports
  untouched — pure move, not a refactor.
- **Re-verified after the fix:** rebuilt with `npx expo export --platform web`; grepped
  `client/_expo/static/**` for `SUPABASE_SERVICE_ROLE_KEY`, the actual key value, and
  `service_role` (case-insensitive) — zero matches on all three (previously 2 hits on the
  first and third). Confirmed the three `+api.ts` routes still resolve correctly (only
  `app/api/folders/[id]+api.ts` calls `getOrCreateGeneralFolderId`, via `deleteFolderReassign`'s
  `folder_only` mode; `move+api.ts` only ever used `getFolderByIdForUser`, unaffected).
- **Out of scope, not touched:** test-user creation and the rest of Session 3 live
  verification — paused per instruction until this came back clean; no other `lib/db/client.ts`
  exports.
- Files touched: `lib/db/service-client.ts` (new), `lib/db/client.ts`, `lib/db/echo-folders.ts`,
  `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean. Client bundle grep clean (see above).

### Fixed (2026-07-01 — EchoScreen entry rows now navigate to detail view)
- `EchoEntryListCard` in `features/echo/components/EchoScreen.tsx` had no tap handler, unlike
  `ActivityFeed.tsx` and `EchoTrail.tsx`, which both already navigate to `/echo/[id]` via
  `router.push(\`/(app)/echo/${id}\` as never)` (imported from `expo-router`). Applied the same
  pattern: added `router` to the existing `expo-router` import, wrapped the row's outer `View` in
  a `Pressable` (`onPress` → `router.push(\`/(app)/echo/${entry.id}\` as never)`, opacity dims to
  0.85 while pressed, matching `ActivityFeed.tsx`'s press style). No data fetching, sorting,
  filtering, or visual output changes — the inner `View`/content markup is untouched, only
  wrapped. `npx tsc --noEmit` passes with no errors.

### Added (2026-07-01 — Avatar menu replaces sidebar Account/Settings/Log out)
- **Step 0 audit findings:**
  - Sidebar (`components/layout/Sidebar.tsx`) previously had zero user-data access — no
    display_name, no avatar anywhere in the file. Traced where that data could plausibly live:
    `useAuthStore` (`features/auth/store.ts`) declares `user: AuthUser | null` and
    `profile: Profile | null` with setters, but a repo-wide grep confirmed neither is ever
    set anywhere — dead, always-null state. The only place that actually fetched
    `display_name`/`avatar_url` was the old `app/(app)/account.tsx` route, via its own
    `supabase.auth.getSession()` → `access_token` → `fetch('/api/profile', ...)`. All three new
    components (`AvatarMenu`, `AccountModal`, `SettingsModal`) fetch profile data themselves
    via that same pattern, since no populated store exists to read from.
  - `expo-image-picker` was not installed — flagged and stopped per instruction; user confirmed
    install. Added via `npx expo install expo-image-picker` (`~55.0.21`, SDK-matched). First use
    of this package in the repo.
  - No Supabase Storage upload example existed anywhere in the codebase (`storage.from(...)` /
    `.upload(...)` grepped zero hits) despite the `avatars` bucket + RLS policies existing since
    migration 011. Upload code in `AccountModal.tsx` written fresh against the documented
    Supabase JS SDK API (`fetch(uri) → blob() → .storage.from('avatars').upload(path, blob, ...)`,
    the standard Expo + Supabase pattern for RN).
  - Image component in use: React Native's core `Image` (from `'react-native'`), confirmed via
    `app/index.tsx`. `expo-image` is not a dependency.
  - Modal pattern: `components/ui/Modal.tsx` — RN `Modal` (`transparent`, `animationType="fade"`)
    wrapping a centered NativeWind-styled card, with optional cancel/confirm footer buttons.
    Used directly for `AccountModal` (cancel/confirm shape fits) and `SettingsModal` (close-only
    shape fits). The avatar dropdown itself doesn't fit that shape (menu list + required
    tap-outside-to-dismiss, which the generic `Modal` doesn't support — its outer wrapper is a
    plain `View`, not a `Pressable`) — built as its own transparent `Modal` in `AvatarMenu.tsx`
    with a `Pressable` backdrop (`onPress` → close) and a nested no-op `Pressable` around the
    card content to absorb taps so they don't bubble to the backdrop.
  - Flagged the pre-existing `app/(app)/account.tsx` route (full-screen, display_name/timezone
    only, would become an orphaned-but-still-reachable-by-URL duplicate once the sidebar stopped
    linking to it) — user confirmed deletion. **Deleted** `app/(app)/account.tsx`.
- **Added `components/ui/Avatar.tsx`:** shared circular avatar renderer + `getInitials()` helper
  (first letter of up to first two words, uppercase). Renders the remote image via RN `Image`
  when `avatarUrl` is set, otherwise a forest-green circle with initials. Used by `AvatarMenu`
  (36px trigger, 44px in the dropdown header) and `AccountModal` (72px, with camera-icon overlay).
- **Extended `components/ui/Input.tsx`** (previously unused anywhere in the codebase — safe,
  non-breaking to extend) with optional `multiline` and `autoCapitalize` props, needed for the
  Account modal's `bio` field.
- **Added `components/layout/AvatarMenu.tsx`:** replaces the three static sidebar rows
  (Account / Settings / Log out) with a single pressable avatar (36px, same row padding as the
  removed items to match visual weight). Fetches `{ display_name, avatar_url }` from
  `GET /api/profile` on mount (silent failure — falls back to initials/empty, non-blocking,
  matches the codebase's existing "profile fetch never blocks chrome" convention). Tapping opens
  a centered dropdown modal: avatar (44px) + display_name at top, then `Profile` → opens
  `AccountModal`, `Settings` → opens `SettingsModal`, a divider, then `Log out` in red. Tapping
  outside the card dismisses the menu.
- **Added `components/layout/AccountModal.tsx`:** header "Account". 72px avatar with a
  bottom-right camera-icon overlay; tapping it requests media-library permission
  (`ImagePicker.requestMediaLibraryPermissionsAsync`), launches
  `ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing:
  true, aspect: [1,1] })` (non-deprecated array form of `mediaTypes` — the enum
  `MediaTypeOptions` is `@deprecated` in the installed `expo-image-picker` version), uploads the
  selected image to `avatars/{user_id}/avatar.jpg` via the already-authenticated client-side
  `supabase` singleton (client components carry a live persisted session already — unlike the
  server-side RLS gap flagged in `OUTSTANDING.md` for `reflect+api.ts`, which is specifically an
  API-route-using-the-client-singleton problem), then immediately `PATCH`es `avatar_url` with
  the resulting public URL — this happens on image selection, independent of the Save button.
  Below the avatar: `display_name`, `bio` (multiline, optional), `timezone` (plain text input,
  no picker — v1 per spec), `interests_user` (comma-separated text, split/trimmed/filtered to a
  `string[]` on save, joined with `, ` on load). Cancel dismisses without saving. Save `PATCH`es
  `display_name`/`bio`/`timezone`/`interests_user` via the profile route, dismisses on success,
  shows an inline error on failure. Never renders or sends `interests_ai`,
  `intelligence_enabled`, `character_profile`, `context`, or `onboarding_complete`.
- **Added `components/layout/SettingsModal.tsx`:** header "Settings". Single `Switch` bound to
  `intelligence_enabled`, fetched from `GET /api/profile` on open. Toggling immediately `PATCH`es
  `intelligence_enabled`; shows an `ActivityIndicator` in place of the switch during the request;
  reverts the toggle to its previous value if the `PATCH` fails or the session token is missing.
  Muted caption below: "When off, Echo entries are saved without AI analysis."
- **Updated `components/layout/Sidebar.tsx`:** removed `handleSignOut`, the `Account` row, the
  disabled `Settings` placeholder row (which previously had no handler at all), and the `Log out`
  row. Replaced all three with `<AvatarMenu />`. Removed now-unused `supabase` and
  `clearAllStores` imports (both moved into `AvatarMenu.tsx`). No other sidebar logic touched —
  nav items (`Goals`/`Echo`/`Constellation`/`Explore`) unchanged.
- **Log out sequence** (`AvatarMenu.tsx handleSignOut`), per spec, in order: `clearAllStores()` →
  `supabase.auth.signOut({ scope: 'local' })` (previously plain `supabase.auth.signOut()` with no
  scope, in the old `Sidebar.tsx` handler — this is an intentional behavior change per this
  session's explicit instructions) → no avatar-cache clear (see `OUTSTANDING.md`, no API exists
  for core RN `Image`) → `router.replace('/(auth)/login')` (same hard-reset-to-login pattern as
  before, clearing the stack so back-navigation can't expose authenticated content).
- **Out of scope, not touched:** any route/API beyond `profile/index+api.ts`, Echo/Goal/Vault
  routes or screens, `handle_new_user()`/triggers, `touchLastSummarizedAt` or any other
  pre-existing `OUTSTANDING.md` item, the reflect route or its retry logic.
- Flagged to `OUTSTANDING.md`: `interests_user` comma-separated input (v1 only, tag/chip input is
  the correct long-term pattern), avatar cache-clearing (no API available for core RN `Image`),
  and `expo-image-picker` as a new dependency (first use in the repo).
- Files touched: `components/ui/Avatar.tsx` (new), `components/ui/Input.tsx`,
  `components/layout/AvatarMenu.tsx` (new), `components/layout/AccountModal.tsx` (new),
  `components/layout/SettingsModal.tsx` (new), `components/layout/Sidebar.tsx`,
  `app/(app)/account.tsx` (deleted), `package.json` / `package-lock.json` (added
  `expo-image-picker`), `OUTSTANDING.md`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean.

### Added (2026-07-01 — Profile GET/PATCH route, intelligence_enabled gate on reflect)
- **Step 0 audit findings (see below for full detail) blocked literal Step 2 as drafted; user chose to proceed with a modified approach — flagged for a future architecture/audit session:**
  - `app/api/echo/reflect+api.ts` does **not** follow the canonical `getAuthContext` (`lib/api/auth.ts`) + `createAuthedClient` (`lib/db/client.ts`) pattern used by `app/api/profile/index+api.ts`. It has its own duplicate inline `getAuthContextFromRequest` (identical logic to `getAuthContext`) and, for the `touchLastSummarizedAt` write, uses the raw `supabase` singleton from `lib/db/client.ts` (an anon-key client built for RN client-side session persistence) instead of a per-request authed client — meaning that write runs without the caller's JWT forwarded, so RLS scoped to `auth.uid()` likely evaluates as unauthenticated and silently affects 0 rows. **Not fixed this session per explicit user instruction** — left untouched, logged to `OUTSTANDING.md` as a separate RLS audit item.
  - `ai_status` on `echo_entries` was never written server-side in `reflect+api.ts` — it's written entirely client-side in `features/echo/services/echo-service.ts` (`createEntry`). The reflect route also had no `echo_entry_id` in its request body, so it had no way to scope a DB write to a specific row.
- **Resolution (user-approved):** added `echo_entry_id?: string` to `ReflectRequestBody` in `reflect+api.ts`; wired it through `requestEchoReflection()` and its call site in `createEntry()` (now passes `insertedEntry.id`).
- Added the `intelligence_enabled` gate in `reflect+api.ts`: after auth is established and before any Haiku call, reads `profiles.intelligence_enabled` via `createAuthedClient(auth.accessToken)`. If `false`: updates `echo_entries.ai_status = 'not_requested'` for the given `echo_entry_id` (via the authed client, RLS-scoped), returns `200` with `{ reflection: null, summarized: false, disabled: true }`, does not call Haiku, does not touch `retry_count`. If `true`: existing logic runs unchanged.
- **Second inconsistency found and fixed during Step 2 (user-approved):** `createEntry()`'s existing failure branch (`if (!reflectPayload || !reflectPayload.summarized || !reflectPayload.reflection)`) could not distinguish "intelligence disabled" from "Haiku actually failed" — both produce `summarized: false` — so it was about to immediately overwrite the fresh `ai_status = 'not_requested'` write with `ai_status = 'failed', retry_count: 1`, which would also cause the disabled entry to get swept into `reconcile+api.ts`'s retry queue (calling Haiku anyway, defeating the gate). Fixed by adding `disabled?: boolean` to the client-side `ReflectPayload` type and a new guard in `createEntry()`: `if (reflectPayload?.disabled) return { status: 'saved', entry: insertedEntry };` placed before the existing failure branch. No other ai_status transition logic changed.
- Expanded `app/api/profile/index+api.ts` (pre-existing file, previously only `display_name`/`timezone`):
  - `GET`: now returns `display_name, bio, avatar_url, interests_user, timezone, intelligence_enabled`. Excludes `interests_ai`, `character_profile`, `context`, `onboarding_complete`, all timestamps.
  - `PATCH`: accepts the same 6 fields with validation (`display_name`/`avatar_url` non-empty trimmed strings, `bio` any string including empty, `interests_user` array, `intelligence_enabled` boolean). Update payload is built field-by-field from an explicit allowlist (never spread from the raw request body), so `interests_ai`/`character_profile`/`context`/`onboarding_complete`/`id`/timestamps are structurally impossible to write via this route regardless of what a client sends. Scoped to `auth.uid()` via `createAuthedClient`.
- Updated `Profile` type in `features/auth/types.ts`: added `avatar_url: string | null`, `bio: string | null`, `intelligence_enabled: boolean`. Did **not** add `interests_ai` — schema-only, no client-side type.
- **Out of scope, not touched:** any UI/component, other Echo routes, Goal routes, Vault routes, `handle_new_user()`/triggers, avatar upload itself, `touchLastSummarizedAt`'s RLS gap (see above).
- Files touched: `app/api/profile/index+api.ts`, `app/api/echo/reflect+api.ts`, `features/echo/services/echo-service.ts`, `features/auth/types.ts`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean.

### Added (2026-07-01 — Profiles account expansion + avatars bucket)
- Added `supabase/migrations/011_profiles_account_expansion.sql`:
  - `RENAME COLUMN public.profiles.interests TO interests_user` (disambiguates from the new system-inferred column).
  - Added `avatar_url text`, `bio text`, `interests_ai jsonb` (all nullable), and `intelligence_enabled boolean NOT NULL DEFAULT true` to `public.profiles`.
  - Column comments documenting `interests_user` (Account-screen editable), `interests_ai` (schema-only, no writer yet — must not appear in any client-writable API route), and `intelligence_enabled` (reflect API should skip Haiku + set `ai_status = not_requested` when false — not wired in this session).
  - Created the `avatars` public storage bucket (`storage.buckets` insert) with 4 RLS policies on `storage.objects`: public `select`, and owner-scoped `insert`/`update`/`delete` gated on `(storage.foldername(name))[1] = auth.uid()::text`. No prior bucket/policy pattern existed in this repo to copy from — followed standard Supabase storage RLS conventions instead.
- **Step 0 audit (full codebase search for `profiles.interests` reads/writes) found zero live call sites** — no API route, hook, Zustand store, or component selects/inserts/updates/reads the column anywhere. The only match was a mirrored type field.
- **Step 2 code update:** renamed `Profile.interests` → `Profile.interests_user` in `features/auth/types.ts` (the sole type reference to the DB column). Re-verified post-rename: zero remaining `.interests` property-access sites anywhere in the codebase.
- **Flagged, not renamed (false positives caught during audit — confirmed unrelated to `profiles.interests`, left untouched):**
  - `features/profile/types.ts:4` (`CharacterProfile.interests: string[]`) — models a key inside the separate `character_profile` JSONB blob (Intelligence feature), not the `profiles.interests` column.
  - `lib/ai/isProfileSufficient.ts:15` and `lib/ai/prompts/intelligence.ts:61` (`raw['interests']`) — both read the same `character_profile` JSONB key, unrelated to the renamed column.
  - `public.interests` (table, `001_core_schema_and_rls.sql:235`, FK'd in `002_echo.sql`) — a wholly separate thorn-pattern table with the same name; not touched.
- **Out of scope, not touched this session:** `handle_new_user()` / `on_auth_user_created` (fixed manually via SQL Editor prior to this session per A1 audit), Echo routes, Goal routes, any screen/component beyond the one profile type. `interests_ai` was added schema-only — no read/write path wired to it anywhere.
- Files touched: `supabase/migrations/011_profiles_account_expansion.sql` (new), `features/auth/types.ts`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean. `npx supabase db push` applied successfully to live Supabase (along with two previously-unpushed migrations, 009 and 010).

### Fixed (2026-06-26 — useVault API-layer bypass)
- Rewired `features/goals/hooks/useVault.ts` to call API routes instead of `lib/db/vaults.ts` service functions directly from the client.
- **Auth pattern source:** Copied from `features/goals/hooks/useActivity.ts` — `supabase.auth.getSession()` called per operation, guarded on `session?.access_token`, `Authorization: Bearer ${session.access_token}` header on every fetch.
- **Operations rewired (5):**
  - `refresh()` → `GET /api/vaults/[goalId]` (response shape: `{ vault, items }`)
  - `addNote()` → `POST /api/vaults/[goalId]` (response shape: `{ item }`)
  - `addLink()` → `POST /api/vaults/[goalId]` (response shape: `{ item }`)
  - `updateItem()` → `PUT /api/vaults/items/[itemId]` (response shape: `{ item }`)
  - `removeItem()` → `DELETE /api/vaults/items/[itemId]` (response shape: `{ success: true }`)
- **Removed:** `lib/db/vaults.ts` imports (`getVaultWithItems`, `createVaultItem`, `updateVaultItem`, `deleteVaultItem`), `userIdRef` (userId no longer used client-side), direct `supabase.auth.getSession()` session caching pattern (only supabase import kept for per-call `getSession()`).
- **Title validation fix:** `POST /api/vaults/[goalId]+api.ts` — changed `title` from `sanitizeString` (required, throws on empty) to `sanitizeOptionalString` (accepts null/empty, returns null). Final rule: **title is optional for all vault item types** — no item type (`note`, `link`, `document`, `insight`, `action_update`) requires a non-empty title at the schema level (`VaultItem.title: string | null`).
- **Downstream title-rendering audit (VaultItemCard.tsx):** 5 access sites found, all already null-safe:
  - `NoteCard` line 27: `deriveTitle()` — falls back to first 8 words of content, then `'Untitled'`
  - `NoteCard` lines 40/52/58: `item.title ?? ''` — safe empty string for TextInput state
  - `LinkCard` line 176: `item.title ?? domain ?? item.metadata?.url ?? 'Saved link'` — safe chain
  - `ActionUpdateCard` line 295: `item.content ?? item.title ?? ''` — safe chain
  - `FallbackCard` line 328: `item.title ?? item.content ?? 'Unknown item'` — safe chain
  - `ActivityFeed.tsx` `vault_item_added` case: renders static string `"Added an item to Vault"` — does not access `item.title` at all.
  - **Zero UI patches needed.**
- **Ownership pre-check tightening confirmed:** `removeItem()` now routes through `DELETE /api/vaults/items/[itemId]`, which calls `getVaultItemByIdForUser` before deletion. The previous direct `deleteVaultItem` call bypassed this ownership check. Intentional tightening per "404 not 403" principle — non-owners now receive 404 instead of silently succeeding.
- Files touched: `features/goals/hooks/useVault.ts`, `app/api/vaults/[goalId]+api.ts`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean.

### Fixed (2026-06-26 — BRT read fallback chain)
- Applied `brt_user ?? brt_ai ?? brt` read-priority rule to all 5 consumer sites that access BRT values directly. This is forward-compatible scaffolding: produces identical results on all live rows today (brt_user always NULL; brt_ai equals brt when non-NULL) while correctly prioritising user overrides once brt_user write paths ship.
- **Mapper sites (4):**
  - `features/echo/services/echo-service.ts`: added `brt_ai`, `brt_user` to `DbEchoEntry` type; updated `mapEntry` line 43. Query uses `*` — no SELECT change needed.
  - `lib/db/echo-goal-links.ts`: added `brt_ai`, `brt_user` to `DbEchoEntryRow` type; updated `mapEchoEntry` line 60; added `brt_ai, brt_user` to named SELECT in `getEchoEntriesForGoal`.
  - `lib/db/goals.ts:363` (`getActivityByGoalId` echo_entry path): added `brt_ai`, `brt_user` to `DbEchoEntryRow` type and to the `.select()` at line 347; updated inline mapper.
  - `lib/db/goals.ts:506` (`getActivityByGoalId` echo_linked path): added `brt_ai`, `brt_user` to `DbEchoEntryForLinkRow` type and to the `.select()` at line 495; updated inline mapper.
- **Direct-query site (1):**
  - `features/goals/services/goal-service.ts:227` (`fetchGoalSignals`): added `brt_ai, brt_user` to SELECT; updated cast type; resolved priority into `brtValue` before storing in Map. Lines 241-242 unchanged — they read `entry.brt` which now holds the resolved value.
- **Untouched downstream (8 sites inherit fix automatically):** `EchoDetailScreen.tsx:55`, `ActivityFeed.tsx:38`, `EchoTrail.tsx:97`, `useEchoTrail.ts:53` all consume `EchoEntry.brt` or `ActivityItem.brt` resolved by the fixed upstream mappers. No changes needed.
- **OUT OF SCOPE (deferred):** `lib/db/embeddings.ts` / `match_echo_entries()` — semantic search not in production; requires DB-level function rewrite. Tracked separately.
- **Dead code cleanup:** Deleted `lib/ai/prompts/summarizer.ts` — zero importers confirmed; pipeline that called it was already deleted.
- Files touched: `features/echo/services/echo-service.ts`, `lib/db/echo-goal-links.ts`, `lib/db/goals.ts`, `features/goals/services/goal-service.ts`, `lib/ai/prompts/summarizer.ts` (deleted), `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean.

### Added (2026-06-26 — Echo ai_status column)
- Added `ai_status text NOT NULL DEFAULT 'not_requested' CHECK (ai_status IN ('not_requested', 'pending', 'completed', 'failed'))` to `echo_entries` via `supabase/migrations/009_echo_ai_status.sql`. Backfills `completed` where `summarized = true`; all other pre-existing rows stay `'not_requested'` (pre-squash rows had no way to distinguish failed from not-requested).
- Wired writes in `features/echo/services/echo-service.ts`:
  - INSERT payload: `ai_status: aiInsightRequested ? 'pending' : 'not_requested'` — covers both branches atomically at insert time, no separate round-trip.
  - Catch block (requestEchoReflection throws — rate-limit or other): fire-and-forget UPDATE `'failed'` before returning `rate_limited` or `saved_without_summary`.
  - `!reflectPayload.summarized` guard (covers reflect+api.ts non-rate-limit failure path, which returns `ok:true, summarized:false`): fire-and-forget UPDATE `'failed'`.
  - Success UPDATE: `ai_status: 'completed'` added to the existing `summarized: true` UPDATE — no extra round-trip.
  - `updateError` guard (AI call succeeded but DB UPDATE failed): fire-and-forget UPDATE `'failed'`.
- `summarized` column untouched — still written and read by reconcile. `ai_status` is additive.
- reflect+api.ts not modified — it has no entry ID in its request contract and cannot write ai_status directly. All failure paths propagate back to echo-service.ts where the entry ID is available.
- Files touched: `supabase/migrations/009_echo_ai_status.sql` (new), `features/echo/services/echo-service.ts`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean.

### Fixed (2026-06-26 — Echo reconcile auth fix)
- Fixed silent 401 swallow on the dashboard's mount-time Echo reconcile call in `app/(app)/dashboard.tsx`. The bare `fetch('/api/echo/reconcile', { method: 'POST' })` sent no `Authorization` header, so `reconcile+api.ts:getAuthContext()` returned null and the route returned 401. Because `fetch()` resolves normally on HTTP errors, the `.catch()` never fired and the 401 was silently swallowed with zero log output.
- Replaced the promise chain with an async function matching the established `DueTodayZone` / intelligence-fetch pattern: calls `getAccessToken()` (throws if session not ready → fetch is skipped), sends `Authorization: Bearer <token>`, and checks `res.ok` after await — logging a distinct `console.warn(`Echo reconcile: server responded with status ${res.status}`)` on non-ok responses. Network/auth errors are caught and logged via a separate `console.warn('Echo reconcile: fetch error:', err)`. The `reconcileInFlight` ref reset is preserved in `finally`.
- Code trace: `getAccessToken()` → `supabase.auth.getSession()` → JWT sent as `Authorization: Bearer` → `reconcile+api.ts:getAuthContext()` reads the header, validates via `supabase.auth.getUser(token)`, returns `{ userId, accessToken }` → `if (!auth)` gate passes → reconciliation proceeds.
- Files touched: `app/(app)/dashboard.tsx`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean.

### Added (2026-06-22 — Block 1: API-layer goal creation + mode fix)
- Created `lib/api/auth.ts` (`getAuthContext`) and `lib/api/contracts.ts` (`ApiResponse<T>`
  envelope) as the first routes on the new shared API auth/contract pattern.
- Created `app/api/goals/index+api.ts` (`POST /api/goals`), routing AI-finalized goal
  persistence through `createGoalWithMeasurables` under an authed Supabase client instead of
  calling the DB layer directly from `app/goals/create.tsx`.
- Restored `mode: 'commitment' as const` in `lib/db/goals.ts` (`mapAiGoalDataToDbInserts`),
  reverting the unreviewed H3 cleanup pass that dropped it and caused a NOT-NULL insert
  failure in production.
- Added `supabase/migrations/026_goals_mode_drop_exploration.sql`, tightening
  `goals_mode_check` to `mode = 'commitment'` only ('exploration' was dead — never written or
  read anywhere in the app).
- Files touched: `lib/api/auth.ts` (new), `lib/api/contracts.ts` (new),
  `app/api/goals/index+api.ts` (new), `lib/db/goals.ts`, `app/goals/create.tsx`,
  `supabase/migrations/026_goals_mode_drop_exploration.sql` (new).
- Verification: `POST /api/goals` returns 201 with a real `goalId`; DB row confirms
  `mode: 'commitment'` persists; `npx tsc --noEmit` clean.
- Closes H3 (see Cleanup, 2026-04-08, below) — that entry is now marked CLOSED.

### Changed (2026-06-19 — Block 0 Closeout: Verification and blocker cleanup)
- Session `Block 0 Closeout — Verification and blocker cleanup`: audited the current Block 0.1 callback state, Block 0.2 RLS hardening migration and four audited routes, Block 0.3 Echo reconcile route, `package.json` scripts, and the known verification blockers before making any edits. Confirmed `app/(auth)/callback.tsx` exists, `app/auth/callback.tsx` is absent, signup still redirects to `https://oharaai.vercel.app/callback`, the four audited actions/goals routes still use `createAuthedClient(accessToken)` for their Supabase queries, and `app/api/echo/reconcile+api.ts` still imports the canonical helper from `lib/db/client.ts`.
- Fixed the verification blockers with the smallest safe changes: closed the missing header wrapper `View` in `app/about.tsx` so TypeScript and Expo web bundling can parse the page again; tightened `expo-router` `Link` prop typing in `app/about.tsx` and `app/index.tsx`; registered the existing root `about` screen in `app/_layout.tsx`; added a targeted `Href` cast on the two `/about` links because the generated Expo typed-route file still omits that route in this repo; and repointed `expo.web.favicon` in `app.json` from missing `./assets/images/favicon.png` to the existing `./assets/images/icon.png` instead of inventing new branding.
- Files touched: `app/_layout.tsx`, `app/about.tsx`, `app/index.tsx`, `app.json`, `CHANGELOGCODEX.md`.
- Verification results: `npx tsc --noEmit` passes after the JSX and typed-route fixes; `npx expo export -p web` passes after the JSX and favicon fixes; `npx supabase migration list` shows local and remote are aligned through migration `025`; `npx supabase db push` reports `Remote database is up to date`; there is still no lint script in `package.json`; repo audit still shows no live app-code references to `/auth/callback`; Block 0.2 route state and Block 0.3 Echo reconcile state remain intact from source review after the blocker fixes.
- Supabase status: the repo is linked to project `rrgiqemscnyaqkculnmb`, live CLI access is available from this machine, and `025_action_logs_rls_hardening.sql` is already applied remotely, so no new migration was pushed during this closeout.
- Manual tests still required: signup email confirmation landing on `/callback`; authenticated `POST /api/echo/reconcile` returning `{ reconciled, failed }`; unauthorized `POST /api/echo/reconcile` returning `401`; authenticated `/api/goals/activity` and `/api/goals/complete-measurable` exercising correctly against live RLS.
- Remaining risk: live Supabase migration/application state and runtime route behavior still require environment-backed verification even though local typecheck and web export blockers are now cleared, and the generated Expo typed-route file still appears stale around `/about` despite the route registration fix.

### Added (2026-06-19 — Block 0.2: Anon-client RLS hardening)
- Added `supabase/migrations/025_action_logs_rls_hardening.sql` to tighten `public.action_logs` RLS around both `user_id = auth.uid()` and owned `goal_id`, replacing the earlier user-id-only select/insert/update policies with explicit goal-ownership checks and an update `WITH CHECK`. This closes the anon-client RLS gap for the action routes without widening any access.

### Changed (2026-06-19 — Block 0.2: Anon-client RLS hardening)
- Audited `app/api/actions/index+api.ts`, `app/api/actions/[id]+api.ts`, `app/api/goals/activity+api.ts`, and `app/api/goals/complete-measurable+api.ts`. Confirmed Block 0.1 did not change these API auth paths; it only changed signup/callback flow in the auth screens.
- Updated the four audited routes to run their actual Supabase reads/writes through `createAuthedClient(accessToken)` after token validation, so existing table RLS can enforce the caller boundary instead of relying on the shared anon client. Affected files: `app/api/actions/index+api.ts`, `app/api/actions/[id]+api.ts`, `app/api/goals/activity+api.ts`, `app/api/goals/complete-measurable+api.ts`.
- Threaded an optional authed Supabase client through `getActivityByGoalId`, `completeMeasurable`, and `getGoalProgressById` in `lib/db/goals.ts` so the targeted goal routes can keep their current behavior while executing under the caller JWT.

### Changed (2026-06-19 — Block 0.3: Echo auth client consolidation)
- Session `Block 0.3 — Echo auth client consolidation`: audited `app/api/echo/reconcile+api.ts` against `lib/db/client.ts` and existing API route usage, confirming the private `createAuthedClient(accessToken)` matched the canonical export in function name, input, bearer-header handling, auth flags, and env-backed Supabase configuration. Confirmed Block 0.1 only changed signup/callback flow and Block 0.2 only established the same bearer-validated, RLS-scoped route pattern used here.
- Replaced the private authed Supabase client in `app/api/echo/reconcile+api.ts` with the canonical `createAuthedClient` import from `lib/db/client.ts`, removing the duplicate helper and unused `@supabase/supabase-js` import while preserving the route's auth checks, response shape, and database read/write behavior.
- Files touched: `app/api/echo/reconcile+api.ts`, `CHANGELOGCODEX.md`.
- Verification performed: `git diff -- app/api/echo/reconcile+api.ts` confirmed the route diff is limited to the client import/helper removal; `git status --short` confirmed no `supabase/migrations/*` files were created or modified; `npx tsc --noEmit` was blocked by pre-existing syntax errors in `app/about.tsx`; `npx expo export -p web` was blocked by the same pre-existing `app/about.tsx` JSX error plus a missing `./assets/images/favicon.png`.
- No DB migration was required, no migration files were created or modified, and `npx supabase db push` was not run.
- Manual test still required: call `POST /api/echo/reconcile` with a valid bearer token and confirm unauthorized requests still return `401`, successful requests still return `{ reconciled, failed }`, and the same `echo_entries` plus `profiles.last_summarized_at` writes occur.
- Remaining risk: end-to-end runtime verification of the reconcile route is still pending until the unrelated `app/about.tsx` syntax issue and missing web favicon are resolved, or until the route is exercised manually in an authenticated environment.

### Fixed (2026-06-19 — Block 0.2: Anon-client RLS hardening)
- Repo-based RLS audit results: `action_logs`, `goals`, `measurables`, `measurable_logs`, `echo_entries`, `vaults`, `vault_items`, and `echo_goal_links` were reviewed for the four targeted routes. Matching repo policies already existed for all audited goal/activity tables; the missing hardening was on `action_logs`, whose prior policies did not enforce owned `goal_id`.
- Verification performed: route/table audit completed from repo migrations and helper code; `npx tsc --noEmit` passed and `npx expo export -p web` passed. Live Supabase RLS inspection remains pending because the local repo only provides the public Supabase URL and anon key, not a DB connection string or service-role/admin credential for querying live policy metadata safely.
- Manual DB checks still required when Supabase is reachable: apply `supabase/migrations/025_action_logs_rls_hardening.sql`, then verify user A can read/create/update only their own `action_logs`, cannot insert an `action_logs.goal_id` pointing at another user's goal, and that the authed `/api/goals/activity` and `/api/goals/complete-measurable` flows still succeed under RLS.
- Remaining risk: until the new migration is applied to the live Supabase project, the database will continue using the older `action_logs` policies even though the route code is now RLS-compatible.

### Added (2026-04-08 — Conversation 3 Block 4: embedding_text Population + Write-Path Wiring)
- Created `lib/ai/embedding-text.ts`: three pure helper functions with zero side effects — `buildEchoEmbeddingText(content)` returns trimmed content or null if below 40-word floor; `buildGoalEmbeddingText(title, description, milestones)` concatenates title + description + milestone titles, never returns null; `buildVaultItemEmbeddingText(content)` returns trimmed content or null if below floor. All import `EMBEDDING_MIN_WORD_COUNT` from `lib/ai/constants.ts`.
- Created `scripts/backfill-embedding-text.ts`: idempotent backfill for existing `echo_entries`, `goals`, and `vault_items` where `embedding_text IS NULL`. Pure string computation — no API calls. Batches of 100 rows, parallel within batch. Uses Supabase service role client. For goals, joins `measurables(title)` via PostgREST nested select. Reports: "X echo entries, Y goals, Z vault items updated."
- Created `scripts/backfill-embeddings.ts`: idempotent backfill for records where `embedding_text IS NOT NULL AND embedding IS NULL`. Calls Voyage AI via `generateEmbedding()`. Batches of 10 with 200ms delay between batches. Per-record errors are logged and skipped — batch continues. Reports progress every 10 records. Run AFTER `backfill-embedding-text.ts`.

### Changed (2026-04-08 — Conversation 3 Block 4: embedding_text Population + Write-Path Wiring)
- `features/echo/services/echo-service.ts`: added `buildEchoEmbeddingText`, `generateEmbedding`, `EMBEDDING_MODEL` imports; computes `embeddingText` before the `echo_entries` INSERT; adds `embedding_text` field to the INSERT payload; fire-and-forget `.then().catch()` chain after the insert guard writes `embedding` + `embedding_model` using the saved entry's ID. BRT pipeline, echo_goal_links write, and all existing INSERT fields are untouched.
- `lib/db/goals.ts`: added `buildGoalEmbeddingText`, `generateEmbedding`, `EMBEDDING_MODEL` imports; `mapAiGoalDataToDbInserts()` now computes `embeddingText` from `aiData.goal.title`, `aiData.goal.description`, and `aiData.measurables`, adds `embedding_text` to `goalInsert`, and exposes `embeddingText` in the return value; `createGoalWithMeasurables()` destructures `embeddingText` and runs a sync try/catch embedding call AFTER the measurables insert (goal already saved — embedding failure is isolated). Conversation flow untouched.
- `lib/db/vaults.ts`: added `buildVaultItemEmbeddingText`, `generateEmbedding`, `EMBEDDING_MODEL` imports; `createVaultItem()` computes `embeddingText`, adds to INSERT payload, fire-and-forget embedding after insert guard; `addVaultItem()` (legacy) computes `embeddingText`, adds to INSERT payload, adds `.select('id').single()` to return the new row ID, fire-and-forget embedding using that ID. Return type of `addVaultItem()` unchanged (`Promise<void>`).
- Preserved: `lib/ai/embeddings.ts` unmodified. `lib/ai/client.ts` unmodified. No migration files modified. No existing INSERT fields removed.
- `tsc --noEmit`: clean.

### Added (2026-04-08 — Conversation 3 Block 3: Postgres Match Functions + Retrieval Layer)
- Created `supabase/migrations/024_embedding_match_functions.sql`: three Postgres match functions (`match_echo_entries`, `match_goals`, `match_vault_items`) for semantic vector retrieval. All use `LANGUAGE sql STABLE`, `SECURITY INVOKER` (RLS enforced), and `SET search_path = public, extensions` so pgvector `<=>` operator resolves correctly from the extensions schema. Returns similarity as `1 - (embedding <=> query_embedding)` (cosine). `match_echo_entries` uses `content` column (canonical name after migration 005 rename chain). `match_goals` includes `description` column (confirmed present since migration 003). `match_vault_items` uses `created_by` for ownership (confirmed from migration 017). All functions filter `WHERE embedding IS NOT NULL`.
- Created `lib/db/embeddings.ts`: application-layer retrieval module with three functions — `findSimilarEchoEntries`, `findSimilarGoals`, `findSimilarVaultItems`. Each calls `generateEmbedding(text, 'query')` from `lib/ai/embeddings.ts`, returns empty array on null (text too short), calls the corresponding Postgres function via `supabase.rpc()`, maps snake_case DB rows to camelCase result types via local `DbXxxMatchRow` types and explicit mapper functions following the existing `lib/db/` pattern. Exported result types: `EchoMatchResult`, `GoalMatchResult`, `VaultItemMatchResult`. RPC errors throw with function name and Supabase error message — callers decide retry/fallback. No `any` used; `unknown` cast to typed rows.

### Added (2026-04-08 — Conversation 3 Block 2: Voyage Embedding Pipeline)
- Created `lib/ai/embeddings.ts` as a standalone Voyage REST embedding client with `generateEmbedding()` and `generateEmbeddings()`; applies the 40-word floor and 512-token approximate truncation from `lib/ai/constants.ts`, skips short inputs by returning `null`, validates 1024-dimension numeric vectors, retries once on 5xx/network failures, and emits structured JSON observability logs without routing through `callLLM` or consuming daily AI quota.
- Exported `EmbeddingResult` from `lib/ai/embeddings.ts` for future retrieval/write-path callers; includes `embedding`, `model`, `inputType`, `dimensions`, and `latencyMs`.

### Changed (2026-04-08 — Conversation 3 Block 2: Voyage Embedding Pipeline)
- Updated `lib/ai/errors.ts` with embedding-specific constants and typed errors: `EMBEDDING_FAILED`, `EMBEDDING_RATE_LIMITED`, and `EMBEDDING_KEY_MISSING`, so Voyage failures follow the existing AI error pattern instead of surfacing raw fetch/provider exceptions.
- Updated `lib/ai/contracts.ts` to extend `AiErrorCode` with the new embedding error codes required by `lib/ai/errors.ts` and `lib/ai/embeddings.ts`.
- Preserved existing Anthropic pipeline files: `lib/ai/client.ts` and `lib/ai/echo-client.ts` were left unchanged, and no dependencies were added to `package.json`.

### Added (2026-04-08 — Conversation 3 Block 1: pgvector Setup)
- Created `supabase/migrations/023_pgvector_setup.sql`: enables `vector` extension via `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions`; adds `embedding vector(1024)`, `embedding_text text`, and `embedding_model text` columns (all nullable, `IF NOT EXISTS`) to `echo_entries`, `goals`, and `vault_items`; creates HNSW indexes (`vector_cosine_ops`, m=16, ef_construction=64) on all three tables; adds partial index `idx_vault_items_needs_embedding` filtering for unembedded items with `content` length > 200 chars. Migration is fully idempotent. Model: `voyage-4-lite`, 1024 dimensions. Spec ref: `ohara_constellation_spec.md` Section 7c.
- Added `embedding?: number[] | null`, `embedding_text?: string | null`, `embedding_model?: string | null` to `EchoEntry` in `features/echo/types.ts` — append-only, no existing fields modified.
- Added same three fields to `Goal` in `features/goals/types.ts` — append-only.
- Added same three fields to `VaultItem` in `types/vault.ts` — append-only.
- Created `lib/ai/constants.ts`: `EMBEDDING_DIMENSIONS = 1024`, `EMBEDDING_MODEL = 'voyage-4-lite'`, `EMBEDDING_MIN_WORD_COUNT = 40`, `EMBEDDING_MAX_TOKENS = 512`.
- `tsc --noEmit`: clean.

### Cleanup (2026-04-08 — Second Cleanup Pass)
Passes: H1, H3, H6 (H5 flagged — see below). Batch D items confirmed complete from prior session.

- **H1:** Deleted `store/vaults.ts` and `store/echo-links.ts`. Both confirmed zero live imports. Canonical data access remains via hook layer (`useVault.ts`, `useEchoTrail.ts`).
- **H3:** Removed `mode: 'commitment' as const` from the goal insert block in `lib/db/goals.ts` (~line 68). DB column preserved; application no longer writes to it. **[CLOSED 2026-06-22]** — this removal caused a NOT-NULL insert failure in production; the write was restored and the column's CHECK constraint tightened. See "Added (2026-06-22 — Block 1: API-layer goal creation + mode fix)" above.
- **H6:** Renamed `ActionLog` fields to camelCase in `features/actions/types.ts` (`goal_id → goalId`, `user_id → userId`, `action_text → actionText`, `due_date → dueDate`, `completed_at → completedAt`, `created_at → createdAt`). Added explicit `mapActionLog()` DB→TS mapping functions in both `app/api/actions/index+api.ts` and `app/api/actions/[id]+api.ts` so DB snake_case rows are properly converted before serialization. Updated `displayedAction.action_text → displayedAction.actionText` in `features/actions/components/NextActionSection.tsx` and `app/(app)/dashboard.tsx`. DB column names in Supabase queries unchanged.
- **H5:** Created `features/projects/types.ts` with `ProjectStatus`, `Project`, and `ProjectWithGoals` (moved verbatim from `features/goals/types.ts`; `ProjectWithGoals` imports `GoalWithMeasurables` from `@/features/goals/types`). Removed all three types from `features/goals/types.ts`. Updated four import paths: `features/projects/store.ts`, `features/projects/services/project-service.ts`, `features/projects/components/ProjectCard.tsx`, `app/projects/[id].tsx`. `GoalWithMeasurables` import in project-service.ts preserved from `@/features/goals/types`. H5 completed: Project and ProjectWithGoals moved to features/projects/types.ts. Four import paths updated. tsc clean.
- **Batch D (confirmed complete):** All D2–D6 items were applied in the prior session. Verified: `vaultIdToGoalId` rename in goal-service.ts, Bud color #4A7C5F in both CLAUDE.md files, `if (error) return null` in ActivityFeed.tsx, `onClose` wired to `closeSheet` in vault.tsx, pipeline removal note in lib/ai/CLAUDE.md.

Deferred: H2 (echo prompt consolidation), H4 (useEchoTrail API boundary) — each has its own dedicated session.

`tsc --noEmit`: clean after H1, H3, H6.

### Cleanup (2026-04-07 — Codebase Audit)
Batches: A, B (partial), C (partial), D (partial)

- **Batch A:** Deleted 22 dead files: `lib/ai/queue.ts`, `lib/ai/pipelines/create-goal.ts`, `lib/ai/pipelines/reflect.ts`, `lib/ai/pipelines/summarize.ts`, `lib/rules/{task-recommender,hobby-matcher,thorn-detector}.ts`, `lib/utils/{date,validation,ui-store}.ts`, `lib/activity/mappers.ts`, `features/dashboard/components/DailyView.tsx`, `features/dashboard/hooks/useDailyTasks.ts`, `features/dashboard/services/task-recommender.ts`, `features/dashboard/types.ts`, `features/goals/components/{GoalMediaGallery,GoalEchoEntriesPanel,NewGoalButton}.tsx`, `features/goals/hooks/useMeasurables.ts`, `features/goals/services/mock-data.ts`, `features/echo/services/mock-data.ts`, `features/profile/services/profile-service.ts`. Removed `ECHO_REFLECTION_PROMPT` dead export from `lib/ai/echo/prompts.ts`. Removed `createGoal()` TODO stub from `features/goals/services/goal-service.ts`. Removed stale `TRACKED DEBT — vaultNoteCount → vaultItemCount` entry from `CONTEXT.md` (completed in Prompt 11).
- **Batch B:** Deleted `types/global.ts` and `types/index.ts` after moving live `Profile` type to `features/auth/types.ts` and updating `features/auth/store.ts` import. Removed dead `ActivityEntry` interface from `features/goals/types.ts`. Converted three inline `ActivityItem` union variants (`vault_item_added`, `insight_confirmed`, `echo_linked`) to named interfaces (`VaultItemAddedActivity`, `InsightConfirmedActivity`, `EchoLinkedActivity`). Updated `ActivityKind` union to include all six variants.
- **Batch C (C3 only):** Added refactor-target comment above `getActivityByGoalId()` in `lib/db/goals.ts` documenting that activity assembly logic belongs in the service layer (Phase 2 target).
- **Batch D (partial):** Renamed `vaultGoalMap` → `vaultIdToGoalId` in `features/goals/services/goal-service.ts`. Updated Bud BRT color from `#22C55E` → `#4A7C5F` in `components/CLAUDE.md` and `lib/db/CLAUDE.md`. Removed `void error` suppression in `ActivityFeed.tsx` (replaced with `if (error) return null`). Removed `void onClose` suppression in `vault.tsx` `VaultPickerSheet` (wired to Cancel button). Documented pipeline removal in `lib/ai/CLAUDE.md`.

Excluded: H1–H6 items pending human review (store pattern decision, echo prompt consolidation, mode column, useEchoTrail boundary, Project type move, ActionLog rename).

`tsc --noEmit`: clean after each batch.

### Added (2026-04-07 — Prompt 11: Constellation Sample SVG)
- Added `components/constellation/ConstellationSample.web.tsx` as a static inline SVG constellation sample using the existing React Native Web raw-`<svg>` pattern, with seven labeled nodes, curved connection paths, and a reduced-motion-safe pulse on the Current Season anchor. Added `components/constellation/ConstellationSample.tsx` as a native-safe static fallback so no new SVG dependency was required.

### Changed (2026-04-07)
- Updated `app/(app)/constellation.tsx` to replace the prior star-dot placeholder visual with the new Constellation sample inside a white preview card, while leaving the existing screen structure and summary-gate logic intact.
- Polished `app/projects/[id].tsx` by replacing the stubbed edit row with a local modal form wired to `updateProject()`, updating hero state immediately after save, and consolidating delete confirmation onto a minimally extended shared `components/ui/Modal.tsx` with optional confirm/cancel actions and destructive styling.
- Fixed project detail goal loading in `features/projects/services/project-service.ts` by adding a project-scoped goals query and removing the previous fetch-all-then-filter behavior, while preserving the same mapped goal shape and signal enrichment used by `GoalCard`.
- Extended `app/projects/[id].tsx` below the existing Goals section only: added placeholder `Project Vault` and `Activity` cards, added a `Settings` card with stubbed edit action, space-gated hidden manage-members placeholder, and a local destructive delete confirmation modal wired to the existing `deleteProject()` project service helper. Hero card and Goals section from Prompt 10A were left unchanged.
- Redesigned the top two sections of `app/projects/[id].tsx`: rebuilt the project hero card with shared badge styling, aggregate child-goal progress, and the requested cream/white/forest hierarchy; rebuilt the Goals section as a vertical shared-`GoalCard` list with count badge, filled `+ Add Goal` CTA, and the new empty-state copy. Left lower page sections unchanged. No project model or goal-card variant changes.
- Renamed goal signal field `vaultNoteCount` to `vaultItemCount` in the goal type, goal service, goal card, and goal mock data; updated the GoalCard label from notes to items with no logic changes.

### Added (2026-04-07 — Prompt 9C: Signal Refinement + BRT Centralization)
- Extracted inline BRT derivation logic from `fetchGoalSignals()` into a named helper `deriveBrtTag(brt: DbBrtValue): 'bud' | 'rose' | 'thorn' | null` in `features/goals/services/goal-service.ts`. Annotated with heuristic comment and Phase 2 migration note. No behavior change.
- Fixed GoalCard layout shift: wrapped conditional activity line (`{n} notes · {n} reflections`) in a fixed `minHeight: 20` View so card height is stable whether signals are present or not.
- Confirmed Constellation screen uses API route (`/api/dashboard/summary`) for counts — `supabase` import is auth-token-only (no direct data reads). No logic changes.
- Renamed `{/* Progress section */}` comment to `{/* Progress gates */}` for clarity.
- `tsc --noEmit`: clean.
- Updated `CONTEXT.md`: added Signal Layer Notes section documenting `deriveBrtTag()` location and `vaultNoteCount → vaultItemCount` rename as tracked Phase 1.5 debt.

### ✓ Prompt 9 Complete (9A + 9B + 9C)
- 9A: Echo → Goal auto-linking (keyword heuristic, `echo_goal_links`, non-blocking IIFE)
- 9B: Goal signal enrichment (vaultNoteCount, echoLinkCount, latestBrtTags), GoalCard micro-dots, Constellation screen, dashboard summary API
- 9C: BRT helper centralization, GoalCard layout-shift fix, signal layer documentation

### Added (2026-04-07 — Prompt 9B: Goal Signal Enrichment + Constellation Screen)
- Extended `GoalWithMeasurables` in `features/goals/types.ts` with three signal fields: `vaultNoteCount: number`, `echoLinkCount: number`, `latestBrtTags: string[] | null`.
- Added `fetchGoalSignals()` helper in `features/goals/services/goal-service.ts` that fetches per-goal vault note counts, echo link counts, and latest BRT tags in 4 bulk queries (no N+1). BRT tag derived from `echo_entries.brt` JSONB object (bud → rose → thorn priority). Signal fetch failures are caught and silently ignored so goal list is never blocked.
- Updated `fetchGoals()` in `goal-service.ts` to call `fetchGoalSignals()` and merge results into returned goals. `mapGoal()` now sets default `vaultNoteCount: 0`, `echoLinkCount: 0`, `latestBrtTags: null` so all callers remain valid.
- Updated `features/goals/services/mock-data.ts` to include signal default fields on all 5 mock goals.
- Updated `features/goals/components/GoalCard.tsx`: added activity line below progress bar (`{n} notes · {n} reflections`, only when count > 0); added BRT micro-dots (6×6 circles, flex row, `alignSelf: flex-end`) in footer using color map: bud `#4A7C5F`, rose `#F59E0B`, thorn `#EF4444`. No other GoalCard logic or styles changed.
- Created `app/api/dashboard/summary+api.ts`: authenticated GET route returning `{ goalCount, echoCount }` using Supabase `count: 'exact'` — used by Constellation screen.
- Replaced `app/(app)/constellation.tsx` placeholder with full Phase 1.5 implementation: SafeAreaView + ScrollView, star-node visual (8 positioned Views, no SVG dep), headline, subtext, progress bars toward 3-goal / 10-echo gates, status line. Fetches from `/api/dashboard/summary` via Bearer token. Counts rendered only after loaded (null guard). No direct Supabase data calls.
- Replaced `app/(app)/explore.tsx` content with centered placeholder ("Explore is coming") using inline styles, no icon library, SafeAreaView container.
- Added `CONSTELLATION_ENABLED: false` to `constants/features.ts`.
- Updated `components/layout/Sidebar.tsx` NAV_ITEMS: added Constellation route (gated by `CONSTELLATION_ENABLED`, opacity 0.4, no-nav when disabled).
- Updated `app/(app)/_layout.tsx`: added `constellation` Stack.Screen for sidebar path; added Constellation Tabs.Screen (hidden via `href: null` when `CONSTELLATION_ENABLED` is false); updated `tabBarActiveTintColor` to `#3D5247`.
- `tsc --noEmit`: clean.

### Added (2026-04-07 — Echo → Goal Auto-Linking)
- Updated `features/echo/services/echo-service.ts:createEntry()` to write to `echo_goal_links` after every successful `echo_entries` insert. Manual link fires when `goalId` is provided (`link_source: 'manual'`, `confirmed: true`). AI auto-link fires when no `goalId` is provided — keyword heuristic scores active goal titles against entry content, inserts the single best match above 0.7 threshold (`link_source: 'ai_auto'`, `confirmed: false`). Both paths are non-blocking void IIFEs isolated from the main save flow. Bridge table upsert uses `onConflict: 'echo_entry_id,goal_id'` with `ignoreDuplicates: true` — no duplicate links possible. No new AI calls introduced; Phase 2 classifier can swap in by replacing the auto-link IIFE body. `tsc --noEmit` clean.

### Added (2026-04-07 — Echo Links Zustand Store)
- Added `store/echo-links.ts` with a new `useEchoLinksStore` Zustand store that mirrors `store/vaults.ts`, using the existing goal-fetch helper plus authenticated echo-link confirm, dismiss, and manual-create mutations with exact optimistic rollback paths and recomputed unconfirmed counts.
- Added `EchoEntryWithLink` to `types/echo-link.ts` so the new echo-links store can type its linked-entry state against the existing `getEchoEntriesForGoal()` response shape.
- Added `GET /api/echo-links/:goalId` handling in `app/api/echo-links/[linkId]+api.ts` so goal-linked echo entries can be loaded through the API using the repo’s existing Bearer-token auth pattern and response conventions.

### Changed (2026-04-07 — Echo Links API Fetch)
- Updated `store/echo-links.ts` to load goal-linked echo entries from `/api/echo-links/:goalId` instead of importing `lib/db/echo-goal-links` directly, preserving the existing store logic while moving the read path behind the API boundary.

### Added (2026-04-07 — Vault Zustand Store)
- Added `store/vaults.ts` with a new `useVaultStore` Zustand store for goal-detail vault state, following the existing store architecture while adding authenticated vault fetch/create/update/delete actions plus precise optimistic rollback paths for confirm and dismiss flows.
- Added `CreateVaultItemInput` to `types/vault.ts` so the new vault store can accept a typed create payload that matches the current `POST /api/vaults/[goalId]` request contract.

### Added (2026-04-06 — Goal Vault + Echo Trail)
- Added `features/goals/hooks/useVault.ts`, `features/goals/hooks/useEchoTrail.ts`, `features/goals/components/VaultItemCard.tsx`, and `features/goals/components/EchoTrail.tsx` so the goal vault screen can manage saved notes/links and review linked Echo reflections in dedicated reusable UI/hooks.

### Changed (2026-04-06 — Goal Detail + Vault Surface)
- Updated `app/goals/[id]/index.tsx` to show parent project context plus summary cards for Vault and Reflections, making the goal detail screen a clearer hub into the new vault and journaling flows.
- Updated `app/goals/[id]/vault.tsx`, `features/goals/components/ActivityFeed.tsx`, `lib/db/goals.ts`, and `docs/DECISIONS.md` to reshape Vault into a richer note/link/reflection workspace and surface vault additions, confirmed insights, and linked reflections in the activity timeline.

### Changed (2026-04-06 — Prompt 5 Surgical Fix)
- Updated `lib/db/client.ts` to export `createAuthedClient(accessToken)`, mirroring the existing bearer-token-scoped Supabase pattern so Prompt 5 API routes can execute RLS-gated reads/writes under the authenticated user instead of the shared anon client.
- Updated `lib/db/vaults.ts` service signatures to accept an optional Supabase client and added ownership helpers `getVaultByGoalIdForUser` and `getVaultItemByIdForUser` so vault API routes can keep ownership checks inside the service layer while preserving existing external behavior for other callers.
- Updated `lib/db/echo-goal-links.ts` service signatures to accept an optional Supabase client, added `getUnconfirmedLinksForUserGoals`, `getEchoLinkByIdForUserGoal`, and `createLinkForUserGoal`, and kept `getUnconfirmedLinksForUser` as a compatibility alias. Ownership is now consistently scoped through `goals.user_id` across the Prompt 5 echo-link routes.
- Updated `app/api/vaults/[goalId]+api.ts`, `app/api/vaults/items/[itemId]+api.ts`, `app/api/echo-links/+api.ts`, and `app/api/echo-links/[linkId]+api.ts` to use the canonical bearer-auth extraction shape (`{ userId, accessToken }`), create token-scoped DB clients for their service calls, and apply the canonical string sanitization pattern to route params and request IDs.

### Fixed (2026-04-06 — Prompt 5 Surgical Fix)
- Fixed Prompt 5 vault and echo-link API routes so their DB operations now run under authenticated bearer context, making the routes merge-safe with existing RLS instead of relying on the shared anon client. Affected files: `lib/db/client.ts`, `lib/db/vaults.ts`, `lib/db/echo-goal-links.ts`, `app/api/vaults/[goalId]+api.ts`, `app/api/vaults/items/[itemId]+api.ts`, `app/api/echo-links/+api.ts`, `app/api/echo-links/[linkId]+api.ts`.
- Replaced fragile duplicate echo-link detection in `app/api/echo-links/+api.ts` by preserving structured Supabase/Postgres error metadata from `lib/db/echo-goal-links.ts` and mapping unique violations (`23505`, optional echo-link constraint match) to HTTP 409.

### Added (2026-04-06 — Migration 022)
- Created `supabase/migrations/022_spaces_rename_owner_id.sql`: renames `spaces.user_id` → `spaces.owner_id`. Includes: column rename; drop/recreate `spaces_user_id_idx` → `spaces_owner_id_idx`; drop/recreate `spaces_one_personal_per_user_idx` on `owner_id`; drop/recreate 4 RLS policies on `public.spaces`; drop/recreate 4 RLS policies on `public.space_members` that subquery `spaces.owner_id`; updated `handle_new_user_space()` function INSERT/ON CONFLICT/SELECT to use `owner_id`.

### Changed (2026-04-06 — Migration 022)
- Updated `lib/db/spaces.ts`: `DbSpaceRow.user_id` → `owner_id`; `mapSpace(row.user_id)` → `mapSpace(row.owner_id)`; all `.select()` strings and `.eq('user_id', ...)` against spaces table updated to `owner_id`; insert payload key `user_id` → `owner_id`. `space_members` queries unchanged (their `user_id` column is unaffected).

### Added (2026-04-06 — Prompt 4)
- Created `lib/db/spaces.ts`: `getPersonalSpace`, `getSpacesForUser`, `createSpace`, `getSpaceMembers`, `addSpaceMember`, `removeSpaceMember`. Uses types from `types/space.ts`. Maps DB `owner_id` → `Space.ownerId`; `joined_at` → `joinedAt`. `getSpacesForUser` uses two sequential queries (space_members then spaces IN) to match existing no-complex-join pattern.
- Created `lib/db/echo-goal-links.ts`: `getLinksForEchoEntry`, `getLinksForGoal`, `getEchoEntriesForGoal`, `createLink`, `confirmLink`, `dismissLink`, `getUnconfirmedLinksForUser`. Uses types from `types/echo-link.ts` and `EchoEntry` from `features/echo/types.ts`. `getEchoEntriesForGoal` and `getUnconfirmedLinksForUser` use two sequential queries instead of complex JOINs. Maps `echo_entry_id` → `echoEntryId`, `link_source` → `linkSource`.
- Rewrote `lib/db/vaults.ts` with canonical service API: `getVaultByGoalId`, `getVaultItems` (sort_order ASC), `getVaultItemsByType`, `createVaultItem`, `updateVaultItem`, `deleteVaultItem`, `getVaultWithItems`. All functions use types from `types/vault.ts`; re-exports `VaultItem` from that module. Legacy helpers (`getOrCreateVault`, `addVaultItem`, `getVaultItemCount`) preserved unchanged.

### Changed (2026-04-06 — Prompt 4)
- Updated `app/goals/[id]/vault.tsx`: changed `item.created_at` → `item.createdAt` (strictly necessary — `VaultItem` is now the canonical camelCase type from `types/vault.ts`).

### Added
- Documented `POST /api/goals/create` AI goal creation endpoint in `docs/API_CONTRACT.md`, including full `GoalFinalizeResponse` payload shape (`goal`, `measurables`, `reasoning`, `assumptions`). Affected file: `docs/API_CONTRACT.md`.
- Added `supabase/migrations/012_goals_visibility_model.sql` to replace `goals.is_public` with checked `visibility` values (`private`, `circle`, `public`), backfill existing rows safely, and remove the legacy boolean/index path.
- Added `supabase/migrations/013_daily_ai_usage_rate_limit.sql` with `daily_ai_usage`, authenticated quota consumption via `consume_daily_ai_quota`, and a 30-requests-per-day limit for AI calls.

### Changed
- Added goal-level vault entry counts to the goal detail milestone rows by introducing `getVaultItemCount` in `lib/db/vaults.ts`, fetching it from `app/goals/[id]/index.tsx` on focus, and threading the shared count through `features/goals/components/MeasurablesPanel.tsx` and `features/goals/components/MeasurableCard.tsx` so each milestone shows the current `X entries` text without changing layout structure.
- Removed the placeholder `Activity` card from `app/projects/[id].tsx` after auditing goal/project detail screens, leaving the real goal detail activity feed intact and avoiding fabricated project update copy.
- Changed the `goal_created` activity fallback timestamp in `lib/db/goals.ts` from the Unix epoch to the current time so missing `created_at` values no longer render a 1969/1970 date in the activity feed.
- Moved the goal-level vault entry count display from each milestone row into `features/goals/components/MeasurablesPanel.tsx`, removing the per-row subtitle in `features/goals/components/MeasurableCard.tsx` and rendering a single subdued `X vault entries` line above the milestone list instead.
- Tightened prompt verbosity across `lib/ai/prompts/echo-reflection.ts`, `lib/ai/prompts/intelligence.ts`, `lib/ai/prompts/goal-creation.ts`, `lib/ai/prompts/summarizer.ts`, and `lib/ai/prompts/reflect.ts` to reduce extra wording while preserving downstream prompt contracts and sys tem signals.
- Constrained conversational prompts to shorter, more direct responses where the prompt format allows it, including explicit 2-3 sentence guidance for `lib/ai/prompts/echo-reflection.ts`, `lib/ai/prompts/intelligence.ts`, and Stage 1 of `lib/ai/prompts/goal-creation.ts`.
- Preserved structured prompts with minimal explanation requirements and no extra commentary outside required JSON structure in `lib/ai/prompts/goal-creation.ts` and `lib/ai/prompts/summarizer.ts`, while tightening explanatory response guidance in `lib/ai/prompts/reflect.ts`.
- Updated goal schema/types, service mapping, mock data, and goal card sharing badges to use explicit `visibility` literals instead of `is_public` / `isPublic`. Affected files: `lib/goals/schema.ts`, `types/global.ts`, `features/goals/types.ts`, `features/goals/services/goal-service.ts`, `features/goals/services/mock-data.ts`, `features/goals/components/GoalCard.tsx`, `lib/db/goals.ts`.
- Updated goal-sharing policy/docs references to the new visibility model, keeping Phase 1 access conservative so `circle` is not treated as public before connection-aware rules exist. Affected files: `supabase/migrations/003_goals_measurables_schema.sql`, `docs/API_CONTRACT.md`, `docs/ARCHITECTURE.md`, `Context.md`, `docs/DECISIONS.md`.
- Added daily AI rate limiting at the `lib/ai/client.ts` chokepoint, routing Echo through the same path, requiring authenticated user context for tracked AI calls, and returning structured `RATE_LIMITED` / HTTP 429 responses instead of generic failures. Affected files: `lib/ai/client.ts`, `lib/ai/echo-client.ts`, `lib/ai/errors.ts`, `app/api/goals/create+api.ts`, `app/api/echo/reflect+api.ts`, `app/api/intelligence/index+api.ts`, `lib/ai/pipelines/*.ts`.
- Updated goal creation, Echo, and intelligence frontend handling for AI 429 responses so rate-limited requests do not retry infinitely, Echo keeps the saved reflection path intact, and the UI surfaces the new limit state. Affected files: `app/goals/create.tsx`, `features/echo/services/echo-service.ts`, `features/echo/components/EchoScreen.tsx`, `app/(app)/dashboard.tsx`.
- Added a persisted Echo composer draft store in `features/echo/draft-store.ts` and updated `features/echo/components/EchoScreen.tsx`, `features/echo/hooks/useEntries.ts`, and `features/echo/services/echo-service.ts` so Echo drafts restore per context (`global` or `goal:<goal_id>`), save locally after 500ms of inactivity, clear only after confirmed submission, and show inline submission-state messaging for saved-without-summary, offline, and unconfirmed-submit outcomes. Assumption: the existing Echo flow confirms persistence once the `echo_entries` insert succeeds, while `/api/echo/reflect` semantics only determine whether the AI response is immediately available.
- Added explicit `Inter` font usage to previously implicit dashboard, goals, goal-detail, and activity text styles, and updated `components/ui/Typography.tsx` so the shared `title` variant resolves through the Inter-backed `font-sans` mapping. Affected files: `app/(app)/dashboard.tsx`, `app/goals/index.tsx`, `app/goals/[id].tsx`, `features/goals/components/GoalDetailHeader.tsx`, `features/goals/components/ActivityFeed.tsx`, `components/ui/Typography.tsx`.
- Rewrote `features/projects/components/ProjectCard.tsx` to replace the GoalCard-like shell with a project-specific layout using a status dot, `Last active` metadata from `updated_at`, an optional two-line description, and a neutral placeholder progress rail so Phase 1 project cards reflect available data without inventing progress values.
- Updated `features/echo/components/EchoScreen.tsx`, `features/echo/hooks/useEntries.ts`, and `features/echo/services/echo-service.ts` so Echo entries can capture optional BRT and emotion metadata from new composer pill selectors, persist both fields to `echo_entries`, and render the refreshed cream-themed list cards with relative timestamps and emotion badges.
- Updated Echo and goal-facing schema types, mock data, service mapping, and AI prompt templates to replace legacy `classification` / `is_public` references with `brt`, `emotion`, `model_version`, and `visibility` for the new `echo_entries` schema. Affected files: `features/echo/types.ts`, `features/echo/services/echo-service.ts`, `features/echo/services/mock-data.ts`, `features/goals/types.ts`, `features/goals/services/mock-data.ts`, `lib/ai/prompts/reflect.ts`, `lib/ai/prompts/summarizer.ts`, `types/global.ts`.
- Added `supabase/migrations/009_echo_entries_schema_update.sql` to update `public.echo_entries` by dropping legacy `classification` / `is_public` fields and adding `brt`, `emotion`, `model_version`, and checked `visibility` metadata for the current Echo schema.
- Renamed the reflection and journaling feature to Echo across routes, feature modules, AI helpers, flags, docs, migrations, and generated artifacts so the codebase now consistently uses `Echo` / `echo` / `ECHO`. Affected files include `app/(app)/echo.tsx`, `app/api/echo/reflect+api.ts`, `features/echo/**`, `features/goals/components/GoalEchoEntriesPanel.tsx`, `constants/features.ts`, `lib/ai/echo-client.ts`, `lib/ai/prompts/echo-reflection.ts`, and the related docs/migrations/dist files.
- Updated goal `status` enum throughout `docs/API_CONTRACT.md` — replaced `paused / completed / archived` with canonical DB values `complete / stagnant / discovered` (matches `GOAL_DB_STATUSES` in `lib/goals/schema.ts`). Affected file: `docs/API_CONTRACT.md`.
- Added `smartData` as a required field in `GET /api/v1/goals` list response and `GET /api/v1/goals/:id` hydrated response in `docs/API_CONTRACT.md`.
- Renamed Echo fields in all request/response shapes in `docs/API_CONTRACT.md`: `rawText → content`, `aiOptedIn → aiInsightRequested` (aligns with migration 005 column renames). Affected file: `docs/API_CONTRACT.md`.
- Clarified `assumptions` is always `string[]`, never `null` or `undefined`; empty array when no assumptions were made. Affected file: `docs/API_CONTRACT.md`.
- Bumped contract version to 1.1 and updated `Last updated` date in `docs/API_CONTRACT.md`.
- Updated draft-stage goal-creation guidance in `lib/ai/prompts/goal-creation.ts` to use a stable user-facing structure with `Draft title`, `Summary`, `Why this matters`, `Assumed timeline`, `First milestones`, `Assumptions`, and up to 1-3 targeted questions.
- Clarified in `lib/ai/prompts/goal-creation.ts` that completing the draft structure should not force finalization.
- Consolidated goal schema constants and field types in `lib/goals/schema.ts`, and updated prompt/runtime/frontend imports to use the shared canonical goal categories, measurable enums, smart fields, and DB status values.
- Normalized finalized goal payload handling so `GoalFinalizeResponse` is the single canonical draft-to-save shape across `app/api/goals/create+api.ts`, `app/goals/create.tsx`, and `lib/db/goals.ts`.
- Added goal deletion support across `features/goals/services/goal-service.ts`, `features/goals/store.ts`, and `features/goals/components/GoalCard.tsx` so the existing `⋯` affordance now opens a delete flow with React Native `Alert` confirmation and removes deleted goals from Zustand state.
- Updated `app/(app)/dashboard.tsx` so Projects always remain accessible from the dashboard via the header `+` action, and replaced the fully empty dashboard state with a single guided chooser for creating either a goal or a long-term project.
- Added optional project linking during goal creation in `app/goals/create.tsx`, threading `projectId` through `app/api/goals/create+api.ts` and the existing persistence helper in `lib/db/goals.ts` so a goal can be pre-linked from a project or manually attached before the conversation starts.
- Fixed the `GoalCard` overflow interaction in `features/goals/components/GoalCard.tsx` by replacing the nested alert-only trigger with local menu state, a dismiss backdrop, and a web-safe responder wrapper so tapping `⋯` reliably opens the delete menu on React Native Web.
- Updated `features/goals/components/GoalCard.tsx` to use a web-compatible delete confirmation path (`window.confirm` on web, `Alert.alert` on native) so selecting `Delete goal` now confirms and proceeds reliably on React Native Web.

### Refactored
- Aligned structured draft detection in `evals/goal-creation/run.mjs` with the new draft-stage headings so local evals recognize the updated prompt shape.
- Updated `evals/goal-creation/scoring-rubric.md` to document the new draft-stage draft signals used by the goal-creation eval harness.
- Removed duplicate and dead goal payload validation/types from `app/api/goals/create+api.ts`, normalized `assumptions` to `string[]` in `lib/ai/schemas/goal-creation.ts`, and tightened frontend hydration in `features/goals/services/goal-service.ts` to normalize DB numerics/dates/statuses instead of relying on unsafe casts.
- Aligned frontend goal/measurable models and mock data with the persisted schema in `features/goals/types.ts`, `features/goals/services/mock-data.ts`, and `features/goals/components/GoalDetailHeader.tsx`, including support for hydrated `smartData`.

# CHANGELOGCODEX.md

## [Unreleased]

### Added
- Added a dedicated Echo reflection prompt in `lib/ai/prompts/echo-reflection.ts` and a separate Haiku-backed Echo client in `lib/ai/echo-client.ts` so Echo reflections now use an isolated AI path instead of the goal-creation client.

### Changed
- Added a gated affiliate teaser placeholder to `app/goals/[id].tsx` using the existing `useActivity` items array, and created `components/AffiliateTeaser.tsx` for the new cream-toned informational card that only appears after progress exists and at least one `echo_entry` activity is present.
- Refined the new affiliate teaser placeholder styling in `components/AffiliateTeaser.tsx` and wired its goal-detail placement directly below `ActivityFeed` in `app/goals/[id].tsx` so the Phase 1 card stays informational, non-interactive, and conditionally visible from existing activity state.
- Added `getEntriesByGoalId(goalId)` to `features/echo/services/echo-service.ts` and surfaced linked Echo entry previews on the goal detail screen via `features/goals/hooks/useGoalDetail.ts`, `app/goals/[id].tsx`, and `features/goals/components/GoalEchoEntriesPanel.tsx` so goals now show their related reflections directly below measurables.
- Replaced hardcoded fallback Supabase client credentials in `lib/db/client.ts` with required environment validation so the app no longer initializes against placeholder values when `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` are missing.
- Set `ECHO_ENABLED` to `true` in `constants/features.ts` for Phase 1 shipping, while keeping `DISCOVERY_ENABLED` `false`, and wired `app/(app)/_layout.tsx` so the Echo and Explore tabs now render only when their respective flags are enabled.
- Wired Echo entry creation through a new `app/api/echo/reflect+api.ts` backend path and updated `features/echo/services/echo-service.ts` to request and persist a concise Echo reflection only when `aiInsightRequested` is true, with `processed_at` set after a successful response.
- Replaced the dashboard, goal detail, and Echo bare loading text with dark-theme NativeWind pulse skeletons, and updated the relevant CTAs to match the Phase 1 teal accent. Affected files: `app/(app)/dashboard.tsx`, `app/goals/[id].tsx`, `features/echo/components/EchoScreen.tsx`, `features/goals/components/NewGoalButton.tsx`, `components/ui/EmptyStateCard.tsx`.

### Fixed
- Added a subtle empty state for goal-linked Echo content on the detail screen: `No Echo entries yet.` This keeps the section informative when a goal has no related entries.
- Added `supabase/migrations/006_rls_audit_fixes.sql` to make RLS CRUD coverage explicit for `measurables`, `measurable_logs`, `profiles`, and `ai_usage`, closing gaps where policies relied on `FOR ALL` without `WITH CHECK` or omitted explicit deny coverage for blocked operations.
- Added `supabase/migrations/007_remove_public_goals_policy.sql` to remove the Phase 2 public-goals select policy from `public.goals` without changing any other goals RLS policies.
- Standardized empty-state treatment across Dashboard, Echo, goal-linked Echo entries, and goal measurables so Phase 1 users see centered dark cards with clear next steps instead of bare copy. Affected files: `app/(app)/dashboard.tsx`, `features/echo/components/EchoScreen.tsx`, `features/goals/components/GoalEchoEntriesPanel.tsx`, `features/goals/components/MeasurablesPanel.tsx`, `components/ui/EmptyStateCard.tsx`.
- Tightened Echo summarization success semantics in `app/api/echo/reflect+api.ts` so `summarized` now returns `true` only when the AI response parses into a valid reflection payload; malformed fallback responses keep `summarized: false`, which preserves the existing DB update gate in `features/echo/services/echo-service.ts` and leaves failed summary attempts unsummarized.
- Tightened Echo submission-state branching across `features/echo/services/echo-service.ts`, `features/echo/hooks/useEntries.ts`, and `features/echo/components/EchoScreen.tsx` so pre-persistence network failures resolve to `offline`, unknown pre-persistence failures resolve to `unconfirmed`, and post-persistence summarization failures continue resolving to `saved_without_summary` without relying on the screen-level catch-all message path.
- Hardened Echo draft persistence in `features/echo/components/EchoScreen.tsx` by flushing the latest scoped draft immediately before submit and during teardown/context switches, while keeping the existing 500ms debounce for normal typing so fast submits or navigation-away events do not drop the most recent unsaved text.
- Reset Echo composer inline submission feedback more explicitly in `features/echo/components/EchoScreen.tsx` so prior notices are cleared when a new submit attempt starts and after a later fully confirmed save, preventing stale offline/error messages from lingering into subsequent successful attempts while preserving same-attempt feedback.

### Added (2026-04-05)
- Implemented intelligence gating and one-insight surfacing. Added `lib/ai/isProfileSufficient.ts` (pure function: returns true when at least 2 of `interests`, `strengths`, `challenges`, `patterns` in `character_profile` JSONB are non-empty arrays). Added `lib/ai/prompts/intelligence.ts` with s ystem pr mpt (single sentence, max 120 chars, observational not motivational) and `buildIntelligencePrompt` helper. Added `lib/ai/pipelines/intelligence.ts` to call `callLLM` through the existing chokepoint and enforce the 120-char cap. Added `intelligence` pipeline entry to `lib/ai/config.ts` (`enabled: true`; gated at the feature level by `FEATURES.INTELLIGENCE_ENABLED`). Added `app/api/intelligence/index+api.ts` (`POST /api/intelligence`): authenticates via Bearer token, fetches `character_profile` from Supabase, checks sufficiency, generates insight if sufficient, returns `{ insight, sufficient }` — returns 503 when feature flag is off. Added `cachedInsight`, `insightFetched`, `insightLoading` fields and setters to `features/profile/store.ts` for per-session insight caching. Updated `app/(app)/dashboard.tsx`: removed hardcoded `isProfileSufficient() { return false }` stub; `IntelligenceZone` now accepts `insight` and `isLoading` props and renders the insight text, a loading skeleton, or the dormant "Keep reflecting in Echo" copy; a `useEffect` calls `POST /api/intelligence` once per session when `INTELLIGENCE_ENABLED` is true, caching the result in the profile store. Fails silently — any error leaves the zone in the dormant state. Constraint enforced: max 1 insight, no list, no "see more."

### Changed (2026-04-05)
- Completed `summarized` flag wiring in `features/echo/services/echo-service.ts`: added `summarized: true` to the DB update payload that runs after a successful AI reflection, closing the loop on the `echo_entries.summarized` column added in migration 011.

### Added (2026-04-05)
- Added post-finalization action capture turn to goal creation flow. After goal persistence, `app/goals/create.tsx` now appends a hardcoded action prompt ("What's one action you can take today to start moving on this?") as an assistant message, keeps the chat input active for one more user response, POSTs the response to `POST /api/actions` (with today's date as `due_date`), appends a confirmation ("Locked in. You'll see this on your dashboard."), then navigates to the goal detail page after a 1.5s delay. If the action POST fails, navigation still proceeds — the action is a bonus, not a gate. Affected files: `lib/ai/prompts/goal-creation.ts`, `app/goals/create.tsx`.
- Added `ACTION_CAPTURE_PROMPT` and `ACTION_CAPTURE_CONFIRMATION` exports to `lib/ai/prompts/goal-creation.ts` with inline documentation of the post-finalization turn rules.
- Added `supabase/migrations/010_action_logs.sql`: creates `action_logs` table with `goal_id` (CASCADE), `user_id` (CASCADE), `action_text`, `status` (pending/complete/skipped), `due_date`, `completed_at`, and `created_at`. Indexes on `(goal_id, created_at DESC)` and `(user_id, status)`. RLS policies for SELECT, INSERT, and UPDATE gated on `user_id = auth.uid()`.
- Added `features/actions/types.ts`: `ActionLogStatus` union type and `ActionLog` interface matching the DB schema.
- Added `app/api/actions/index+api.ts`: `GET /api/actions` (query params: `goal_id` required, `status` optional, `limit` optional default 10 max 100) and `POST /api/actions` (body: `goal_id`, `action_text`, `due_date?`). Both read `user_id` from server-side session only.
- Added `app/api/actions/[id]+api.ts`: `PATCH /api/actions/:id` (body: `status?`, `action_text?`). Setting `status = 'complete'` automatically sets `completed_at = now()`. Validated against `user_id` from session; returns 404 if not found or not owned.
- Added `features/actions/hooks/useLatestAction.ts` to fetch the latest pending action for a goal via `GET /api/actions?goal_id=...&status=pending&limit=1`, expose loading/error state, and provide an independent `mutate()` revalidation path for the goal detail Next Action UI.
- Added `features/actions/components/NextActionSection.tsx` to render the goal detail Next Action card with loading, retry, pending-action, and inline create states. The section supports optimistic `Complete` / `Skip` interactions with rollback on PATCH failure and uses post-success revalidation after both PATCH and POST flows. Affected files: `features/actions/components/NextActionSection.tsx`, `features/actions/hooks/useLatestAction.ts`.

### Changed
- Updated `app/goals/[id].tsx` to insert `NextActionSection` directly below `GoalDetailHeader`, above `MeasurablesPanel` (which sits above `ActivityFeed`). Screen order: `GoalDetailHeader → NextActionSection → MeasurablesPanel → ActivityFeed`. Keeps the new action UI isolated from measurables and Echo logic. Affected file: `app/goals/[id].tsx`.
- Kept next-action creation on the lowest-risk path by revalidating with `useLatestAction().mutate()` after a successful `POST /api/actions` instead of introducing optimistic insert state. Notable limitation: the client still sends `status: 'pending'` for clarity, but the existing backend already hardcodes pending on insert, so no API contract change was required.

### Changed (2026-04-05)
- Refactored `app/(app)/dashboard.tsx` into a 3-zone layout: (1) Active Goal + Next Action, (2) Echo, (3) Intelligence placeholder. Removed the projects/goals list view. Zone 1 picks the most recently updated `status === 'active'` goal from `useGoals()`, renders the goal title, and shows the pending action via `useLatestAction(goalId)` with inline Complete/Skip handlers (same PATCH pattern as `NextActionSection`). Zone 2 is gated by `FEATURES.ECHO_ENABLED`, calls `useEntries()` to pre-populate the echo store, and shows a "Reflect in Echo" CTA plus a preview of the latest entry (first 100 chars + relative date). Zone 3 always renders: shows dormant copy while `INTELLIGENCE_ENABLED === false` or `isProfileSufficient()` is false (stub, always returns false; TODO Block 6). Projects remain accessible via the header `+` action. `GoalGrid`, `ProjectCard`, and `useProjectStore` are no longer imported; all other screens unchanged.

### Refactored
- Lifted `useActivity` ownership into `app/goals/[id].tsx` and updated `features/goals/components/ActivityFeed.tsx` to accept typed activity props, removing the duplicate goal activity fetch while preserving the existing feed rendering behavior.

### Fixed (2026-04-05)
- Fixed Vercel crash: `Uncaught SyntaxError: Cannot use 'import.meta' outside a module`. Root cause: Metro resolves `zustand/middleware` to `node_modules/zustand/esm/middleware.mjs` (ESM build), which contains `import.meta.env?.MODE` — a Vite idiom that is not valid in Metro's non-module script output. Patched `esm/middleware.mjs` lines 62 and 124 to replace `(import.meta.env ? import.meta.env.MODE : void 0)` with `process.env.NODE_ENV`. Generated `patches/zustand+5.0.12.patch` via patch-package and added `"postinstall": "patch-package"` to `package.json` so the patch re-applies on every `npm install` and Vercel deploy. Bundle confirmed clean: no `import.meta` in `dist/` after rebuild. TSC passes with no errors.
- Added measurable completion flow across `app/api/goals/complete-measurable+api.ts`, `lib/db/goals.ts`, `features/goals/hooks/useGoalDetail.ts`, `features/goals/components/MeasurablesPanel.tsx`, and `features/goals/components/MeasurableCard.tsx` so tapping a milestone checkmark now logs completion, recalculates persisted goal progress, reorders completed rows after incomplete ones, and updates the goal detail UI optimistically.
- Replaced the Flow A / Flow B ambiguity detection model in `lib/ai/prompts/goal-creation.ts` with a three-stage SPARK → SHAPE → DRAFT conversation model. Stage 1 (Spark) always fires on the first message with domain-aware context and 1-3 questions — no draft. Stage 2 (Shape) proposes a lightweight goal frame for confirmation before committing to structure. Stage 3 (Draft) produces the full 6-section scaffold after frame confirmation. Updated Core behavior to align with the new stage model and remove conflicting draft-first defaults.

### Changed (2026-04-05)
- Added `FEATURE_DISABLED` to `AiErrorCode` in `lib/ai/contracts.ts` and `AI_ERROR_CODES` in `lib/ai/errors.ts`; intelligence 503 now uses typed code `FEATURE_DISABLED` instead of `UNKNOWN_ERROR`. Affected files: `lib/ai/contracts.ts`, `lib/ai/errors.ts`, `app/api/intelligence/index+api.ts`.
- Standardized AI response contracts across all AI-backed endpoints. Created `lib/ai/contracts.ts` as the single source of truth for `AiErrorCode`, `AiSuccessResponse<T>`, `AiErrorResponse`, and `AiResponse<T> = AiSuccessResponse<T> | AiErrorResponse`. Updated `lib/ai/errors.ts` to expand `AI_ERROR_CODES` to all six values (`RATE_LIMITED`, `UNAUTHORIZED`, `INVALID_INPUT`, `AI_PROVIDER_ERROR`, `PARSE_ERROR`, `UNKNOWN_ERROR`), import `AiErrorCode` from contracts, and remove the old flat `AIErrorResponse` interface. Updated `app/api/goals/create+api.ts`, `app/api/echo/reflect+api.ts`, and `app/api/intelligence/index+api.ts` to wrap every response in the `AiResponse<T>` envelope (`ok`, `data`, `error`), preserving all existing HTTP status codes. Updated `features/echo/services/echo-service.ts` to parse `AiResponse<ReflectPayload>` and check `body.ok` / `body.error.code` instead of matching raw `AIErrorResponse` fields. Updated `app/(app)/dashboard.tsx` to parse `AiResponse<IntelligenceData>` and check `body.ok` instead of HTTP status alone. Updated `app/goals/create.tsx` to parse `AiResponse<GoalCreateData>` and read `body.error.message` / `body.data` from the envelope. TSC passes with zero new errors. No business logic, prompt content, pipeline logic, or RLS behavior was changed.

### Changed (2026-04-05)
- Restored GoalGrid and ProjectCard to dashboard; 5-zone layout finalized. Zone order: (1) Active Goal + Next Action, (2) Projects, (3) All Goals, (4) Echo, (5) Intelligence. `useProjectStore`, `GoalGrid`, and `ProjectCard` re-imported. `GoalGrid` receives `standaloneGoals` (goals where `projectId === null`) and `newestId`. `ProjectCard` iterates `projects` from `useProjectStore`. Loading gate updated to `goalsLoading || projectsLoading`. All Block 5 zone logic (active goal, next action, echo, intelligence) unchanged.

### Added (2026-04-05)
- Added pipeline observability to callLLM chokepoint — structured JSON events emitted via console.log, captured by Vercel. Fields: pipeline, model, latency_ms, tokens, error_code, user_id, timestamp. Emits after rate limit check on every provider call (success and failure). Error code classified from thrown value; errors rethrown unchanged. No signature change — user_id already present in CallLLMParams. Affected file: lib/ai/client.ts only.

### Added (2026-04-05)
- Added pipeline observability to callLLM chokepoint — structured JSON events emitted via console.log, captured by Vercel. Fields: pipeline, model, latency_ms, tokens, error_code, user_id, timestamp. Emits after rate limit check on every provider call (success and failure). Error code classified from thrown value; errors rethrown unchanged. No signature change — user_id already present in CallLLMParams. Affected file: lib/ai/client.ts only.
- Added Echo reconciliation: `app/api/echo/reconcile+api.ts` (`POST /api/echo/reconcile`) queries all echo_entries where summarized = false AND ai_insight_requested = true for the authenticated user, re-runs summarization via callEchoReflection, updates summarized = true on each success, and updates profiles.last_summarized_at after the batch. Single-entry failures are caught and logged without aborting the batch. Returns { reconciled: N, failed: M }. Dashboard triggers a fire-and-forget POST on mount via useRef-guarded useEffect (no render blocking, no loading state). Affected files: app/api/echo/reconcile+api.ts (new), app/(app)/dashboard.tsx.

### Added (2026-04-06)
- Created `types/vault.ts`: `VaultItemType` union, `VaultItemMetadata` typed object (url, annotation, fileType, aiConfidence, confirmed, tags), `VaultItem` interface, `Vault` interface. Pure types, no logic, no side effects. Follows L3 type rules from `types/CLAUDE.md`.
- Created `types/space.ts`: `SpaceType` union (`personal | team | institutional | community`), `SpaceRole` union, `SpaceMember` interface, `Space` interface. Pure types, no logic, no side effects.
- Created `types/echo-link.ts`: `EchoLinkSource` union (`manual | ai_suggested | ai_auto`), `EchoGoalLink` interface mirroring the `echo_goal_links` many-to-many bridge table. Pure types, no logic, no side effects.

### Changed (2026-04-06)
- Extended `types/activity.ts` `ActivityItem` discriminated union with three new variants (on `kind` field). All new variants share the required `id` and `timestamp` base fields per union contract. No existing variant shapes modified.
- Applied narrowing fix in `features/goals/components/ActivityFeed.tsx`: exhaustive switch on `kind` is now type-safe against the full `ActivityItem` union; previously unhandled variants no longer produce implicit `any` or dead-branch type errors. TSC clean after change.

## Block 0.1 — Duplicate auth callback fix (2026-06-19)

### Audited
- Compared `app/(auth)/callback.tsx` and `app/auth/callback.tsx`, traced `/callback` and `/auth/callback` references, and confirmed signup was hardcoded to `https://oharaai.vercel.app/auth/callback` while repo context still flagged `/auth/callback` as the broken path.

### Changed
- Updated `app/(auth)/signup.tsx` to send Supabase email confirmations to `https://oharaai.vercel.app/callback`, matching the auth route-group callback path exposed by Expo Router.
- Unified callback handling in `app/(auth)/callback.tsx` by normalizing the `code` param, exchanging PKCE codes, and verifying the resulting session before routing to dashboard or login.

### Fixed
- Removed the duplicate literal route `app/auth/callback.tsx` so the app now has a single callback implementation and a single public callback URL.

### Verification
- Verified route references with repo-wide search before edits.
- Manual verification still required for the live Supabase email-confirmation round-trip.

### Manual Test Required
- Create a test account from the signup screen, open the confirmation email, confirm the browser lands on `/callback`, and verify the user is routed to the expected post-auth screen without a 404.

### Risks
- If Supabase dashboard redirect URL allowlists still only include `https://oharaai.vercel.app/auth/callback`, they must be updated to include `https://oharaai.vercel.app/callback` for email confirmation to succeed in production.

## Entry Edit backend — server-side PATCH + re-embed (2026-07-10)

### Added
- New `PATCH /api/entries/:id` route (`app/api/entries/[id]+api.ts`): server-side
  content/title edit for echo entries. `withAuth` → `isEntryOwnedByUser()` → 404 if
  not owned (same gate as Move). Sanitizes + length-caps `content` (20000) and
  `title` (200) with the same `sanitizeString` discipline Move uses — deliberately
  NOT copying `createEntry`'s unbounded-content gap. `title` is clearable (null /
  empty → null).
- Reads the current entry first to detect a real content change and to check
  `ai_insight_requested`. **Only when `content` actually changed**: re-embeds inline
  server-side via `buildEchoEmbeddingText` → `generateEmbedding` (createEntry's STEP 1
  logic, ported off the client), and — if `ai_insight_requested` — flips
  `ai_status='pending'` (existing `echo/reconcile` job picks it up, untouched) and
  clears the now-stale reflection fields (`ai_response`, `summarized`, `processed_at`,
  `brt`, `brt_ai`, `emotion`, `confidence`, `model_version`; plus `retry_count`/
  `last_attempted_at` reset for a clean retry budget). Title-only edits touch nothing
  else. Embedding write is non-blocking (edit already committed).
- Client `updateEntry()` service fn in `features/echo/services/echo-service.ts`,
  same shape as `moveEntryRequest` (authedFetch + typed error kinds).

### Reconciliation note
- Task described this PATCH as living in `app/api/entries/[id]+api.ts` "same file as
  Delete's DELETE export" and adapting a route-handler `createEntry`. In this repo no
  such file/DELETE exists (only `entries/[id]/move+api.ts`) and `createEntry` is a
  client-side service. Created the file fresh with just the PATCH (natural home;
  DELETE can be added later) and ported createEntry's client-side embedding logic to
  the server, per the task's stated server-side intent.

### Validation
- `npx tsc --noEmit` clean.
