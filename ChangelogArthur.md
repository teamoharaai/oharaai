# Arthur Implementation Changelog

## Constellation Acceptance Fix — Goal-Link Note Editing

### Interaction reliability
- Fixed Constellation Goal-link note editing so entering edit mode initializes the controlled draft synchronously; saving now replaces the existing note text instead of allowing a delayed state effect to append the new text to the old value.
- Preserved the existing Goal-link record, relationship, optimistic reconciliation, API contract, and database update behavior, with focused replacement assertions and the existing end-to-end acceptance flow retained.

## Goals Version 1.0 — Final UI Polish

### Page hierarchy and three-column workspace
- Normalized the Goals header to the global page-title system with the canonical Goals mark and `Goals` as the primary heading; retained `Your journeys, your becoming.` and the existing philosophy copy as compact subordinate text beside the existing Search, Filter, and New Goal actions.
- Preserved the three-column desktop architecture while giving the Goals library, selected Goal, and analysis rail the same restrained border, radius, elevation, and padding logic as the polished Echo workspace.
- Converted the fragmented center stack into one composed Goal workspace surface. Goal identity, lifecycle state, Overview/Milestones/Tasks/Reflections/Notes/Insights tabs, timing, next step, milestone management, trackers, and recent activity remain distinct through neutral dividers and shared spacing without changing any handlers or data.

### Surface, lifecycle, and responsive polish
- Consolidated left-column filters and Goal rows into one library surface with internal separators, a soft canonical-green selected state, a clear accent edge, and hover feedback. Consolidated the existing right-column Intelligence, analytics, Momentum, recommendations, and linked-entry modules conservatively into one rail surface with internal sections.
- Corrected the enabled `Extend into a new phase` action by routing it through the shared primary-button treatment (`#63C174` via semantic tokens) and made the lifecycle panel a deliberate inset section. Reworked all three New Phase modal steps to use current theme surfaces, borders, typography, radii, inputs, disabled states, and shared primary/secondary actions in light and dark mode.
- Preserved the standardized typography scale, category and Momentum color meaning, all Goal/milestone/tracker/linking/status behavior, and the existing narrow/tablet layout branches. Authenticated light/dark, compact-width, lifecycle-modal, tab, selection, search/filter, and creation-entry checks passed alongside 205 focused tests, a clean-source TypeScript check, the 51-route Expo web export, and `git diff --check`; the normal repository check remains limited to the protected duplicate editor's three pre-existing diagnostics, and no lint script is configured.

## OHARA Global Typography & Readability Polish

### Canonical system and scale
- Standardized authenticated OHARA UI on the already bundled Inter family across web and native; retained Lora only for the OHARA wordmark and intentional reflective/editorial voice. Removed the competing Apple-first page-local web stacks without adding a font dependency.
- Added one semantic type scale in `constants/design.ts` and routed `Typography` through it: 12/17 meta, 13/18 caption, 14/21 supporting body, 15/20 controls, 16/24 body, 17/26 prominent and 17/27 editor copy, 18/24 card titles, 20/26 section titles, and 28/34 page titles. Functional reading text remains regular, controls/metadata medium, hierarchy semibold, and bold remains reserved for explicit emphasis.
- Raised the shared NativeWind aliases and legacy Echo aliases onto the same scale, removed undersized functional 9–11.5px copy from the active Home/Goals/Echo/Momentum shells, and retained an explicit 11/15 chart label plus geometry-bound Constellation node/glyph exceptions.

### Readability and layout protection
- Increased shared button/input and compact-control heights proportionally, preserved one-line button labels, enlarged navigation and creation controls, rebalanced Echo entry rows/filters/search, and improved Goals milestone/tracker titles, metadata, errors, chips, and actions without changing feature behavior or page structure.
- Kept Note and Quick Reflection copy regular-weight with long-form line heights, standardized editor chrome/popovers/references on Inter, and retained Lora only for the intentionally reflective Quick Reflection title and assistant voice.
- Improved the light-theme muted text token from 3.26:1 to 4.65:1 on white and the dark-on-dark special muted token from 4.00:1 to 6.58:1, while preserving primary/secondary hierarchy and the existing color system.
- Responsive light/dark visual QA and final typecheck, focused tests, web export, and diff validation are recorded in the completion report.

## Echo Version 1.0 — UI & Interaction Polish

### Echo library and workspace
- Redesigned Echo as a calm two-area workspace with a collapsible library and a substantially larger active Note or Reflection surface. Replaced date-bucket/category navigation with **Most Recent** and **Projects**, retained a restrained All/Notes/Reflections filter with Notes as the default, and kept search across canonical Notes and Reflections.
- Added optional Project folder browsing without duplicating content: a canonical Entry may appear in Most Recent and its associated Project, with combined Notes and Reflections ordered by recency. Empty library, empty Project, loading, error, selected, hover, focus, and narrow-screen states use the existing OHARA light/dark design language.

### Focused layout and writing-canvas polish
- Replaced Echo's large title/subtitle treatment with a compact `[Echo mark] Echo` + `New` page toolbar aligned directly to the workspace bounds. Restored the canonical Echo asset, removed the persistent subtitle, refined the single primary action's proportions, and reduced the header-to-workspace gap using shared OHARA spacing tokens; the unified Note/Reflection creation flow remains unchanged.
- Replaced the single outer slab with three restrained companion surfaces: a bordered/elevated Echo library card, a separate active workspace card, and a rounded Ohara Intelligence side card. Shared radii, soft semantic borders, subtle `sm` elevation, and a real inter-card gap provide depth in light and dark mode without gradients, glass blur, or heavy shadows.
- Refined library padding, content gutters, entry rhythm, and the selected-state hierarchy. Projects now sits in a quiet inset group rather than reading as an appended list, while search, Notes-default filtering, mixed recency, Project selection, and the explicit return path remain unchanged.
- Added a clear `← Most Recent` Project exit state that clears only the Project context and preserves an open Entry on desktop. Project folders now enter with the combined All view, while returning to Most Recent restores Notes as the default filter.
- Removed the dedicated 42px collapse-divider rail. The collapse chevron now lives in the library header, and a restrained overlay affordance on the active workspace edge restores the library without reserving a permanent column; the selected Entry, Project URL context, editor state, and released workspace width are preserved.
- Expanded the Note sheet from 960px to 1280px, reduced outer editor gutters to 10–18px, and centered a controlled 900px maximum writing measure inside responsive 56–88px document padding. Added editor-container breakpoints at 820px and 600px so the canvas responds to the actual space released by the Echo library and Ohara Intelligence panel rather than only the browser viewport.
- Increased desktop Note body text from 17px/1.65 to 18px/1.68 with 14px paragraph spacing; constrained and mobile editing remains a comfortable 17px/1.65. Narrow canvas padding now scales down to 24–44px and then 18–28px without horizontal overflow.
- Reframed the empty workspace as a compact inset composition inside the workspace card, kept the persistent header `New` action as its clear path forward, and removed the duplicate center button. Refined Ohara Intelligence into a softly tinted, bordered companion card with its canonical mark and preserved references, linked context, close/reopen behavior, and honest non-AI state.
- Validated the focused polish with 50 Entries/Echo source tests, a clean-source TypeScript pass, the 51-route production Expo web export, and `git diff --check`. The normal repository typecheck remains blocked only by the protected duplicate editor's three pre-existing diagnostics, no lint script is configured, and authenticated visual mutation checks remain unavailable without a connected signed-in browser session.

### Echo Version 1.0 — Final Cleanup
- Fixed the remaining Ohara Intelligence/editor collision by keeping the formatting toolbar in a full-width band above the editor-body split. The 328px Intelligence card is now a non-shrinking sibling of the writing canvas beneath the toolbar, with deliberate top/bottom inset so it starts lower, finishes shorter, and cannot occupy or cut into the formatting row.
- Kept the toolbar container-responsive with compact spacing below 960px and contained horizontal overflow as a last resort; all formatting, Goal, image, Intelligence, and overflow actions remain available. The editor body still measures its real available width, uses the existing sheet presentation when both regions cannot coexist comfortably, and immediately returns all released canvas width when Intelligence closes.
- Replaced the library's raw `Load failed` transport text with a restrained semantic error card and Retry action. The observed wording originated from a rejected local browser request being passed through the Entries/Projects stores verbatim; genuine failures remain visible without exposing low-level fetch text.
- Standardized the shared application accent on the vibrant OHARA green `#63C174` in both light and dark themes, with a shared pressed/hover value of `#4EAA60` and soft selected/hover surfaces derived from the same RGB family. The global OHARA mark, Echo mark, navigation, primary actions, selected rows, filters, editor active/focus states, links, Projects, and Intelligence accents now resolve through those semantic tokens; intentional BRT/category, feedback, illustration, and neutral structural colors remain distinct.
- Preserved the approved floating-card hierarchy and edge alignment while adding container-aware responsive behavior for library expanded/collapsed, Intelligence inline/closed/sheet, standard/wide/narrow widths, and light/dark themes.
- Validated the final cleanup with 54 Entries/Echo source tests, a clean-source TypeScript pass, the 51-route production Expo web export, and `git diff --check`. No lint script is configured; the standard repository typecheck continues to report only the protected duplicate editor's three pre-existing diagnostics. The isolated browser reached the local login boundary and Chrome was not running/connected, so the authenticated visual state matrix remains a manual follow-up rather than being represented as completed.

### Creation and reflection behavior
- Replaced separate creation entry points with one **New** flow that first offers New Note or New Reflection. Both may be independent or optionally linked to one existing Goal and/or Project; the mature Notes editor, formatting, references, images, autosave, export, persistence, deletion, and responsive behavior remain intact.
- Introduced **Quick Reflection** as a spacious freestyle, non-AI writing surface with title editing, autosave/recovery, reopen persistence, export, deletion, and optional Goal/Project organization. **Guided Reflection** is visible as an intentional **Coming soon** OHARA Intelligence capability and cannot enter the retained legacy chat implementation or produce fabricated responses.

### Data safety, interaction polish, and validation
- Added additive Migration 044 with a nullable owner-validated `entries.project_id` and atomic `save_entry_v3` wrapper. No existing Entry, legacy Echo row, Goal, Reflection, or Project is copied, backfilled, or destructively migrated; project removal only clears the optional association.
- Added an Echo-specific persisted collapse preference, preserved selected/editor state during desktop transitions, used a list/detail compact layout, and prevented browser caret behavior on non-editable Echo chrome while retaining normal selection inside inputs and editable document content.
- Passed 218 affected source tests, the disposable Entries/Notes database security harness including same-owner/cross-owner Project checks, the 51-route production Expo web export, and `git diff --check`. The Echo changes add no TypeScript diagnostics; the full repository check remains blocked only by three pre-existing diagnostics in the protected untracked `RichTextEditor.web 2.tsx` duplicate. No lint script is configured. Authenticated browser mutation checks were not run because the isolated browser had no local session and Chrome was not running/connected.

**Full Projects Version 1.0 and Guided Reflection intelligence are not part of this release.**

## 2026-09-09 — Application Navigation and Home Layout Polish

### Horizontal application navigation
- Replaced the persistent desktop sidebar with one shared horizontal application toolbar for Home, Goals, Echo, Momentum, and Constellation. Preserved the global create control and profile/account surface, added a compact two-row treatment for smaller screens, and kept active, hover, focus, light, and dark states within the established OHARA design system.
- Removed sidebar width, collapse-state, content-offset, and Constellation breakpoint assumptions from the shared shell and dependent feature code. The separate Goal creation route now uses the same application navigation instead of maintaining its own sidebar composition.

### Home page hierarchy
- Removed the large background card around the Home dashboard. The real greeting now sits directly on the page background above the existing data-backed Today, Momentum, Goals, Project, Echo, draft, and Intelligence modules, with normalized responsive gutters and no replacement wrapper.

### Validation
- Passed 213 focused Entries, Echo, Auth, Friends, Momentum, Constellation, Home, Goals, and navigation-adjacent source tests plus the 51-route production web export. Confirmed the new shell introduces no TypeScript errors; the full repository typecheck remains blocked only by the three pre-existing diagnostics in the protected untracked `RichTextEditor.web 2.tsx` duplicate.

## 2026-08-20 — OHARA Notes Version 1.0

### Final editor reliability and page polish
- Fixed the actual list rendering regression caused by the global CSS reset by explicitly restoring visible bullet, nested-bullet, number, and nested-number markers with theme-aware contrast and consistent indentation. Replaced browser-dependent checkboxes with clear neutral unchecked outlines, restrained OHARA-green checked states, keyboard focus, and persisted task-item state.
- Reframed Notes as a calm document sheet inside the workspace: 960px maximum page width, approximately 740px maximum reading width, responsive 80–110px desktop/40–64px tablet/18–28px mobile inner margins, 56–72px top spacing, a subtle page border/radius/shadow, a visually separate sticky toolbar, and polished 17px long-form typography in light and dark themes.

### References, images, and trusted autosave
- Added inline Goal Reference controls for Open Goal, Change Goal, progress-evidence settings, and Remove Goal Link, plus panel-level jump/open/remove actions. Added equivalent OHARA Intelligence open, question/context edit, and removal actions. Removing either reference preserves source text, paragraphs, external-link marks, Goals, and checkbox state while updating the document and panel together.
- Kept embedded Goal cards separate and authoritative, retained responsive private images and alignment/selection controls, and extended tests proving removed progress links stop future evidence without deleting immutable completion history or rewriting Momentum snapshots. Revision-safe debounced autosave continues to cover formatting, lists, checklists, alignment, images, and reference changes.

### Temporary internal release update
- Added a concise accessible “What’s New in OHARA” modal for **OHARA Notes Version 1.0** and Momentum Version 1.0 Beta. It is integrated once at the root auth lifecycle, appears once per explicit login session, ignores refresh/token/focus/route events, returns after logout and login, and supports X, Escape, backdrop, focus containment/restoration, light/dark themes, and narrow layouts.
- Centralized the temporary feature in `config/internal-release.ts`; setting `SHOW_INTERNAL_RELEASE_NOTES` to `false` disables it without changing authentication or routes. Added `docs/NOTES_V1_IMPLEMENTATION.md` covering the editor, schema, page layout, lists, checklists, images, references, trusted evidence, autosave, responsive behavior, modal lifecycle, and known limitations.

## 2026-08-19 — OHARA Notes V1 Editor Rebuild

### Familiar document editing
- Replaced the web note body’s deprecated browser-command/HTML-blob implementation with a ProseMirror/Tiptap 2 editor and centralized command layer. Notes now support Normal, H1/H2/H3, bold, italic, underline, strikethrough, bullet and numbered lists, interactive nested checklists, left/center/right alignment, links, undo/redo, quotes, and private responsive images with conventional labeled controls and active states.
- Kept the writing surface calm and responsive: the toolbar scrolls/collapses for narrow widths, the existing Intelligence drawer behavior remains, keyboard selection is preserved through toolbar menus, and Tiptap’s schema filters unsupported pasted layout/style content.

### Goal context and OHARA Intelligence
- Added stable inline Goal marks for text, paragraphs, and checklist items plus optional explicit progress-evidence intent. Linked checklist completion creates a canonical server-validated evidence transition; unlinked checkboxes and ordinary Goal references never alter Momentum. Note-level Goal links remain a separate relationship.
- Added deliberate live embedded Goal cards that store only Goal IDs and render current Goal title/category/status/next-milestone data, including a graceful unavailable state.
- Rebuilt Ask OHARA as selection-based citation anchors with action/question metadata, subtle inline markers, panel excerpts, bidirectional editor/panel focus, reference-only deletion, and an honest premium-locked state. No AI call or fabricated response is produced.

### Persistence, compatibility, and validation
- Added document schema V2 using ProseMirror JSON nodes/marks with persistent block IDs; legacy block/HTML notes remain readable and convert on edit rather than through a destructive bulk migration. Autosave retains debounce, local draft recovery, and status/error UI while adding expected-content-version conflict protection.
- Kept schema V2 platform-neutral and protected mobile data: native can edit plain V2 paragraphs, but opens rich V2 notes read-only rather than flattening headings, marks, cards, images, or references while full native rich-editor parity remains future work.
- Added Migration 042 for schema-version tracking, private owner-scoped note-image storage, canonical note progress evidence/events, and atomic revision-checked saves. Added document/security regression tests, passed the TypeScript check and production web export, and verified the signed-in Notes toolbar, active formatting state, Goal picker, progress-evidence control, and Ask OHARA menu without error-level browser logs. Full persistence, upload, and reload validation awaits deployment of Migration 042; the current hosted backend correctly exposes the missing RPC/bucket through save and storage errors, and no hosted account or fixture note was created.

## 2026-08-13 — OHARA Momentum Version 1.0

### Two authoritative scores
- Implemented deterministic `goal-momentum-v1.0` for each active Goal using the canonical 30/30/20/20 Consistency, Progress, Reflection, and Initiative model, plus independent `ohara-momentum-v1.0` using the canonical 50/20/15/10/5 portfolio model. Both are bounded 0–100, smoothed, versioned, reproducible, and pause during true inactivity.
- Added category-relative `difficulty-v1.0` profiles for Health & Fitness, Finance, Career, Creative, Education, Relationships, and Personal Growth. The implementation uses structured inputs and centralized versioned calibration only; AI does not calculate or modify a score, and Goal Difficulty never weights the cross-category OHARA score.

### Trusted persistence and product integration
- Preserved the Phase 1 authenticated API/service-role trust boundary, immutable history, hashes, reason codes, local weeks, and deduplication. Additive migrations 040–041 introduce Goal-level profiles/snapshots and bounded OHARA metadata without modifying Migration 038 or relabeling historical Phase 1 snapshots.
- Connected Home, expanded Home Momentum, the full Momentum workspace, Goal-specific Momentum cards, and canonical Goals analytics to authoritative V1 results and V1-only history. Removed production sample Momentum values, kept Goal progress distinct from Goal Momentum, and added user-scoped request sharing so cards do not duplicate calculation requests or leak cached values across accounts.

### Validation and documentation
- Added the canonical DOCX unchanged under `docs/` and documented formulas, mappings, migrations, APIs, calibration, UI coverage, and known structured-data limits in `docs/MOMENTUM_V1_IMPLEMENTATION.md`.
- Passed 53 Momentum source tests, the disposable Phase 1/V1 PostgreSQL security harness, and the ten-scenario/five-adversarial loopback Supabase integration harness. The latter verified `ohara-momentum-v1.0`, Weekly Streak `3`, Tasks Completed This Week `1`, deterministic recalculation, late-event revisions, local timezones, and cross-user isolation without contacting a hosted database.
- Passed an authenticated local API smoke test (including forged-query rejection and an unauthenticated `401`), affected Goals/Entries suites, the known-valid TypeScript check, and a 51-route web export. Browser verification confirmed authoritative light/dark Home, expanded OHARA Momentum, full Momentum, and selected-Goal Momentum surfaces; a one-snapshot Home history now renders its honest 0–100 chart instead of an unavailable message.

## 2026-08-12 — Canonical Goals Workspace Consolidation

### One Goal destination
- Consolidated Goal reading and management into `/goals?goal=<id>`. Existing Home, Today, Projects, Settings, Momentum analysis, continuation, and creation links now select the requested Goal inside the three-column workspace; saved `/goals/[id]` links forward to the same destination, while create and Vault routes remain distinct.
- Goal selection remains in the URL across refresh and is accepted only when it belongs to the authenticated user’s loaded Goal collection. The former `selected` query remains compatible for already-issued workspace links.

### Mature Goal functionality inside the new shell
- Reused the established Goal detail hook, hero, countdown, milestone panel, tracker panel, and project picker so description editing, completion, archive, deadline changes, milestone CRUD/completion, tracker CRUD/logging, and project movement remain service-backed rather than duplicated.
- Preserved the new Goals header, search/filter controls, responsive three-column master-detail architecture, and selected-card behavior. The center now carries the old detail view’s richer hierarchy, deadline timeline, interactive milestones, trackers, and real activity.

### Honest contextual rail and verification
- Rebuilt the right rail as semantic-green Ohara Intelligence plus data-derived current progress, milestone/activity/entry counts, an explicit unavailable recommendation state, and the latest explicitly linked Note and Reflection. No sample analytics, recommendation, or AI conclusion is presented as authoritative.
- Verified authenticated light/dark wide desktop rendering with real hosted account data, legacy deep-link forwarding, URL selection persistence, interactive controls, and zero browser error logs. Seven focused Goal/routing tests, 13 Entries tests, the known-valid TypeScript check, web export, and `git diff --check` pass.

## 2026-08-11 — Full Goals Workspace Reconstruction

### Real workspace and navigation
- Replaced the authenticated `/goals` Coming Soon surface with the approved responsive Goals workspace: journey header, real search and filters, selectable Goal list, selected-Goal hero, detail tabs, overview, and contextual right rail.
- Preserved the existing New Goal flow, full Goal-detail route, selected Goal state, canonical category colors/icons, progress, milestones, trackers, deadlines, and activity navigation without changing Goal business logic or routes.

### Data integrity and honest states
- Built every region from existing Goals, milestones, trackers, authoritative activity, and explicitly linked Notes/Reflections. Missing progress history, task records, confirmed insights, supporting habits, or notes are described honestly rather than replaced with reference-image content.
- Added deterministic search/status/category and next-milestone selectors with focused tests. The layout responds from three columns to two columns and then a single mobile sequence while retaining accessible controls and light/dark theme tokens.

### Verification
- Verified the authenticated workspace in light and dark mode with real hosted account data, Goal selection, search, filtering, tabs, linked reflection activity, existing creation/detail navigation, and no horizontal overflow at the available wide browser viewport.
- Passed the focused Goals workspace tests, the known-valid TypeScript check, web export, and `git diff --check`. No database, Supabase configuration, authentication, schema, API, Momentum, Home, Echo, Constellation, or Sidebar behavior changed.

## 2026-08-11 — Echo Category Expansion, Priority Ordering, and Hover Stability

### Shelf behavior and ordering
- Made every populated Unlinked or category shelf open by default without adding a reset effect; a user's explicit collapse/expand choice is stored by shelf ID for the current session and remains intact when filtering or changing between Recently edited and Title A–Z.
- Within each shelf, the newest Note appears first and the newest Reflection second using the existing `updatedAt` field (the current Entry model has no access/open/view timestamp). All remaining unique entries retain the selected sort order, with priority items removed by stable ID so they never repeat.

### Header stability and verification
- Scoped out the global web button hover scale on active shelf headers and add controls, kept title type fixed at 18/26, and added a `minWidth: 0`/ellipsis left region plus non-shrinking count, chevron, and add controls. Hover now changes only the surface tint and cannot change row geometry or push content outside the card.
- Verified authenticated dark-mode initial expansion, visible stable hover, collapse persistence after a sort change, and responsive geometry at wide desktop, 1440-class desktop, tablet, and mobile sizes without horizontal page overflow. The live account has one entry per populated category, so mixed 2-Note/2-Reflection and 1-Note/1-Reflection ordering is proven by focused tests without creating or changing user records.

## 2026-08-11 — Home Dashboard Card Reorganization

### Dashboard composition
- Moved the most recently updated real Project into the former lower-left Echo card position, preserving the existing Project detail route and New Project modal.
- Replaced the former full-width Projects list with equal Echo Notes and Echo Reflections cards. Each content type is selected independently from canonical Entries data, exposes its existing open/create route, and shows explicit linked-Goal context only when that relationship exists.

### Goal activity integrity
- Corrected Home Goal recent activity to use only goal-owned milestones/updates plus completed actions and Notes/Reflections carrying an explicit `goal_id` relationship. Category and text similarity are never used to infer a Goal link.
- Project, Note, and Reflection recency uses `updated_at` as the documented fallback because the current schema has no last-accessed/opened/viewed field; no migration or access-tracking field was added.

### Verification
- Verified the authenticated hosted-data Dashboard in light and dark mode at the current 2137×1195 browser viewport, including real separate Note/Reflection previews, the linked Goal reflection, recent Project, unchanged Home width, and no horizontal overflow.
- Passed 8 Entries tests, 31 Momentum tests, 11 focused Goal/Dashboard selector tests, the known-valid TypeScript check, a 50-route web export, and `git diff --check`. No Supabase configuration, schema, authentication, route, Momentum calculation, or database data was changed.

## 2026-08-11 — Supplied Home, Momentum, and Constellation Marks

### Brand inventory and implementation
- Extended the semantic `BrandIcon` inventory with the supplied Home, Momentum, and Constellation marks as transparent 24×24 `currentColor` vectors.
- Preserved the previous visual assets for Goals, individual Goals, Today’s Focus, Echo, Echo Entry, and Projects exactly as requested, together with the existing OHARA master logo, theme-mode utility, Ohara Intelligence sparkle, and all Goal-category colors.

### Site-wide application
- Replaced only the generic Home house, Momentum feature arrow, and Constellation network identity with the three supplied marks across the active Sidebar, Home, page headers, and landing previews.
- Reused the established Goals, Echo, Entry, Today, Goal, and Project artwork in branded create/card contexts while keeping functional utility symbols—including back, close, expand, calendar, link, share, editing controls, data-trend arrows, and Intelligence sparkles—unchanged.
- Added a development-only `preview:brand` router root for light/dark review of the full current family at 16, 20, 24, 32, and 48px plus Sidebar, feature-header, Home-card, Global Create, and Intelligence contexts; no production route was added.

## 2026-08-09 — Echo Note Editor Document-First Refinement

### Long-form writing surface
- Increased the active note editor from 16px/28px text in a 760px padded box (approximately 696px of readable text) to an 18px/1.65 system-font rhythm with a responsive 900px readable measure, calmer paragraph spacing, and 34px/27px H1/H2 hierarchy.
- Enlarged Linked To metadata from 12px to 14px, linked-goal chips to 32px, and formatting controls from 36px/18px to grouped 40px/19px targets while preserving every existing command and keyboard behavior.

### Ohara Intelligence and responsiveness
- Made Ohara Intelligence open by default while retaining its close/reopen control and narrow-screen modal behavior. The 328px panel now uses the existing semantic green through a restrained translucent blur, green-derived border, glass sub-surfaces, and an intentional feature header; linked context, related entries, and preview-only Ask Ohara semantics are unchanged.
- Kept the document centered with clamp-based desktop/mobile margins, strong light/dark text contrast, semantic caret and selection colors, and a writing-first layout when Intelligence is hidden. No persistence, autosave, linking, export/share, authentication, route, Supabase, RLS, or AI behavior changed.
- Verified the authenticated editor in light and dark at the available 1483×960 screenshot viewport with Intelligence open and collapsed, including default-open behavior after reload and document re-centering when hidden. Entries (8) and Echo composer (5) tests, the known-valid TypeScript check, a 50-route web export, and `git diff --check` pass.

## 2026-08-08 — Unified Feature Headers and Authoritative Momentum Trend

### Screen identity
- Consolidated Goals, Entries/Echo, Momentum, and Constellation onto one responsive feature-page title treatment. Entries now carries the existing Echo logo, while Constellation reuses the same network mark already established in the Sidebar; both use the semantic OHARA green.
- Preserved Home's separate greeting hierarchy and left the Constellation visualization, controls, nodes, edges, layout, and interaction behavior unchanged.

### Momentum read path and visualization
- Removed the full Momentum page's hardcoded daily sample series, fake `+8%`, stretched SVG geometry, and assumed 0–100 axis. The overview now renders only persisted weekly Phase 1 snapshots, uses the latest revision for each week, sorts them chronologically, and presents an honest single-period state when history is sparse.
- Extended the existing authenticated Momentum response with an owner-scoped read of weekly history; user identity still comes only from server authentication and RLS, while all calculation, normalization, hashing, reason-code, publication, revision, and migration behavior remains unchanged.
- Kept Momentum Drivers, Goal Momentum, Patterns from entries, and suggested guidance explicitly marked Preview because Phase 1 does not authoritatively calculate those concepts.

### Verification
- Confirmed the isolated local fixture still renders `Building`, `4.52`, `+4.52 this week`, and exactly one legitimate weekly period after superseded revisions are removed. No sample points were substituted and no local or remote Supabase state was reset, seeded, migrated, or reconfigured.
- Verified matching light/dark headers and the responsive single-point chart at a 1707×960 authenticated desktop viewport; the authenticated/unauthorized local API smoke checks, 31 Momentum tests, 8 Entries tests, 74 Constellation tests, the known-valid TypeScript check, a 50-route web export, and `git diff --check` pass.

## 2026-08-08 — Authenticated Page-Frame Extension

### Shared application shell
- Added a small `AuthenticatedPageShell` that mirrors the approved Home outer geometry (24px desktop and 16px compact gutters, no desktop max-width) for Echo/Entries, Momentum, and the new Goals placeholder. Home itself was not moved or re-composed.
- Expanded Echo’s Entries workspace and the full Momentum Preview page to use the Home content boundaries. Momentum’s wider chart now fills its analytical card while preserving its existing preview data, range controls, and Phase 1 calculation boundary.

### Navigation and account control
- Added Goals between Home and Echo in the Sidebar using the canonical target mark. `/goals` is now a real, polished Coming Soon route whose only optional action uses the existing Create a Goal flow; goal creation and detail routes are unchanged.
- Corrected the lower-left profile fallback to show a high-contrast initial from the existing display name or username on the canonical green avatar surface in light and dark modes, with hover and keyboard-focus feedback.

### Visual verification
- Verified authenticated Home, Echo, Momentum, and Goals in light and dark mode at the 2137×1124 browser viewport. Each page now occupies the same 1970px application region after the 168px Sidebar, with no material horizontal overflow. Responsive sweeps across 1440×900, 1280×800, tablet, and 390px mobile found no element extending past the viewport; the browser reports a non-rendering one-pixel scroll-width rounding difference at mobile on every page, including unchanged Home.
- No Supabase process, data, migration, environment, authentication, route behavior, or Momentum calculation/API code was changed; no remote project was contacted.

## 2026-08-04 — Home Brand Green and Width Refinement

### Brand system
- Consolidated the active Home/application-shell sage and olive treatments onto the semantic OHARA green family, now finalized at `#4A7C5F` in light mode and `#8FAE8A` in dark mode, with selected and hover surfaces derived through shared tokens.
- Kept the original OHARA artwork while tinting it green in both themes; the dark wordmark remains white. Inactive Sidebar items stay neutral, while Today, Echo, Goals, Momentum, project marks, focus dots, links, and primary actions share the brand accent.
- Routed raster brand artwork through the supported image tint prop, restored the canonical target mark for Goals, and removed the duplicate untinted project glyph from the Home project preview. Goal-category identity colors remain unchanged.

### Dashboard workspace and validation
- Removed the Dashboard's 1760px centered ceiling, reduced redundant frame padding, and standardized the wide workspace to 24px outer gutters, 20px frame padding, 24px grid gaps, and the existing 30/34/36 column proportions.
- At the current 2137px browser viewport, the frame grew from 1760px to approximately 1920px and the main grid from approximately 1712px to 1880px; left/right outer gutters fell from approximately 105px to 24px.
- Verified the authenticated populated fixture in light/dark mode at 1727×1000 and responsive checkpoints at 1440×900, 1280×800, 900×900 tablet, and 390×844 mobile without horizontal overflow. Momentum remained API-backed at `4.52`, Weekly Streak `3`, Tasks Completed `1`; no Supabase process, data, migration, environment, authentication, route, or Momentum logic was changed.

## 2026-08-04 — Final Home Screen Reconstruction

### Active Home composition
- Rebuilt the authenticated Dashboard JSX around the approved light/dark references instead of preserving the legacy card internals: the greeting, Today’s Focus, Echo, Momentum, Goals, and Projects now follow the target desktop hierarchy and responsive mobile order.
- Kept Today priorities on one open surface without boxed rows or dividers; rebuilt Echo as a reflective “Reflect on today” entry point; ranked the two Home Goal previews by real milestone, reflection, or goal-update activity and retained canonical category colors.
- Kept the frozen Momentum Phase 1 API as the only Home Momentum source and reformatted its real value/change, Weekly Streak, Tasks Completed, trend, loading, and unavailable states without touching calculation, persistence, security, or API contracts.
- Refined the shared Sidebar to the functional Home/Echo/Momentum/Constellation route order shown by the reference. The reference’s Goals item remains intentionally deferred because the repository still has no functional Goals index route.
- Added real aggregate progress to the existing Project preview while preserving project navigation and expansion behavior.

### Scope and review state
- Changed only the active Home screen, its directly rendered Sidebar/Project preview, and changelogs; no Supabase process, configuration, migration, schema, authentication, API, Momentum logic, Entries, Echo workspace, Constellation, goal-detail, or landing-page code was modified for this task.
- The authenticated light/dark browser checkpoints now pass against the restored loopback-only stack, including the real sparse fixture (one active goal and no projects), authoritative Momentum value `4.52`, Weekly Streak `3`, Tasks Completed `1`, and the Momentum expansion interaction. The known-valid TypeScript check, 29 Momentum tests, 6 active-goal selector tests, 8 Entries tests, a 50-route Expo web export, and `git diff --check` pass; Codex did not start, stop, reset, seed, migrate, or reconfigure Supabase.

## 2026-08-04 — Local Manual Review of Migrations 001–039

### Review result
- Completed an authenticated manual browser, runtime, local API, and read-only database/security review against the isolated `127.0.0.1` Supabase stack after migrations 001–039; no remote project was contacted and no application or migration source was changed.
- Confirmed the authoritative Home Momentum fixture (`4.5192`, Weekly Streak `3`, Tasks Completed `1`), stable `3|3|3` snapshot state, 39 migration rows, 35/35 public tables with RLS, valid `vector(1024)` HNSW indexes, zero anonymous table CRUD, and preserved Momentum/friendship mutation boundaries.
- Recorded the result as **Ready with documented non-blocking issues** in `docs/LOCAL_MANUAL_REVIEW_001_039.md`, with route-by-route evidence and local screenshots. The findings are application-level or pre-existing; none appears introduced by the migration-chain repair.

## 2026-08-03 — Clean Supabase Migration Chain Repair

### Root-cause corrections
- Repaired the squashed Migration 003 ordering defect by installing the final `spaces` owner/member read policy only after `space_members` exists; preserved all eight final space/member RLS policies and their ownership predicates.
- Restored the original `vector(1024)` declarations in baseline migrations 001, 002, and 004 so the existing pgvector HNSW indexes apply on an empty database.
- Added forward Migration 039 with explicit per-table PostgREST privileges instead of broad grants; anonymous table CRUD remains absent, direct friendship and Momentum client writes remain revoked, and RLS remains enabled everywhere.

### Compatibility and documentation
- Kept Migration 038 and all Momentum calculation, service, API, UI, and persistence behavior unchanged.
- Updated the local Momentum fixture only for the canonical full-chain Auth/profile and required goal-category schema.
- Added `docs/SUPABASE_MIGRATION_CHAIN_REPAIR.md` and synchronized local Momentum/Supabase migration guidance, including the repository evidence that the squashed baseline may already be tracked in shared environments and the fact that no remote state was queried.

### Local validation
- Completed three empty isolated Supabase replays through Migration 039 and seed loading; the final two deterministic catalog fingerprints matched exactly (`1629|fd93710c7f712ce8e1f66433198b9ff0`).
- Confirmed 39 migration ledger rows, 35/35 public tables with RLS, eight space/member policies, `vector(1024)` embedding columns, no anon table CRUD, and preserved friendship/Momentum mutation boundaries.
- Passed Momentum's 29 source tests, disposable database harness, 10 real local scenarios, 5 adversarial assertions, authenticated API smoke test, and rendered Home verification with real values and no browser errors.
- Passed the Constellation database security harness, live three-user friendship/RLS harness, 13 Friends tests, 8 Entries tests, known-valid TypeScript check, 50-route web export, and `git diff --check`.
- No remote Supabase project was contacted or modified; no commit, push, merge, or migration deployment was performed.

## 2026-08-03 — Momentum Phase 1 Integrity Remediation

### Trusted calculation boundary
- Changed `/api/momentum` to verify the authenticated owner, read canonical records with that user's RLS client, calculate every derived value/hash/reason on the server, and persist only through a server-only service-role client.
- Restricted `publish_momentum_snapshot` to `service_role`, revoked anonymous/authenticated execution and table DML, fixed its search path, added strict payload/week/timezone/hash bounds, and made snapshots database-immutable through superseding revisions.

### Eligibility correction
- Added normalized per-action planning and completion eligibility with owner, goal status, due-date, local-week, timestamp, duplicate, and exclusion checks.
- Defined planned-action numerator as the intersection of completion-eligible IDs with the planned-eligible denominator IDs and added the direct `0 <= numerator <= denominator` invariant.

### Isolated local validation
- Added loopback-only local Supabase guards/configuration, disposable PostgreSQL 16 migration/RLS tests, and real Supabase/PostgreSQL 15 Auth/PostgREST/API fixtures without changing or using the remote `.env`.
- Passed 29 source tests, the PostgreSQL security harness, 10 local data scenarios, 5 adversarial security assertions, actual API smoke testing, known-valid source type-check, a 50-route web export, `git diff --check`, and rendered Home verification with real values (`Weekly Streak 3`, `Tasks Completed 1`).
- Documented the unrelated pre-existing Migration 003 ordering defect that blocks a clean full-repository reset; it was not modified in this task.

## 2026-08-03 — Momentum Migration 038 Safety Review

### Pre-application decision
- Reviewed the complete canonical Momentum specification, Phase 1 report/open decisions, migration 038, calculation service/engine, API route, and Home integration.
- Confirmed migration 038 is structurally additive, but stopped before application because the authenticated publication RPC accepts caller-supplied authoritative values and the planned-action numerator does not share the denominator's due-date eligibility.
- Confirmed the repository has no local Supabase configuration/runtime or documented local migration command and that the active environment targets a non-local Supabase host; no database or browser/API mutation was attempted.

### Validation and readiness
- `npm run test:momentum` — 19 passed; `npx tsc --noEmit --types node,react` — passed; web export — passed with 50 API routes; `git diff --check` — passed after documentation updates.
- A read-only engine probe reproduced the numerator mismatch: three completions against one planned action yielded a raw completion rate of 3 and a clamped Progress score of 100.
- Marked Phase 1 not ready for development/staging database deployment until trusted-only publication, aligned planned-action eligibility, a local-only Supabase workflow, and all requested live scenarios are verified.

## 2026-08-03 — Momentum Foundation Phase 1

### Backend-authoritative calculation
- Added the frozen `momentum-v1.0` calculation contract with canonical pillar weights, difficulty, gain, drag, clamping, unavailable-pillar reweighting, and stable no-activity behavior.
- Added deterministic local-timezone Monday-through-Sunday boundaries, canonical `action.completed` normalization, explicit inclusion/exclusion diagnostics, event deduplication, and stable SHA-256 calculation hashes.
- Used due-dated action records as the planned-action denominator without reinterpreting undated completions; undated completions remain valid task and active-day evidence.

### Persistence and diagnostics
- Added private `momentum_profiles`, `momentum_events`, and immutable versioned `momentum_weekly_snapshots` in migration 038.
- Added authenticated, transaction-safe snapshot publication with profile locking, identical-hash idempotency, superseding revisions, stale-baseline rejection, and normalized-event deduplication.
- Added an authenticated Momentum API with optional owner-safe diagnostics, stage-specific logging, and no stored or logged note, reflection, goal, or action text.

### Home integration
- Replaced the active Home Momentum card's sample values with the published real value/change, strict real Weekly Streak, and authoritative Tasks Completed This Week count.
- Added explicit loading, zero, and unavailable states while preserving the current card layout, expansion behavior, and full Momentum route.

### Product decisions and review
- Added `docs/MOMENTUM_OPEN_DECISIONS.md` without inventing policy for inactivity, reflection limits, AI bounds, decreases, pillar visibility, opt-out, privacy, or later-pillar normalization.
- Added `docs/MOMENTUM_PHASE1_IMPLEMENTATION_REPORT.md` with architecture, sources, version/revision strategy, calculation flow, diagnostics, reason codes, validation, open decisions, and remaining phases.
- Migration 038 remains local and must be reviewed/applied before the linked browser can return authoritative Momentum results.

### Validation
- `npm run test:momentum` — 19 passed, covering formula, boundaries, timezones/DST, duplicates, exclusions, empty data, streaks, hash reproducibility, RLS, idempotency, revisions, and stale baselines.
- `npm run test:entries` — 8 passed; `npm run test:echo-composer` — 5 passed.
- `npx tsc --noEmit --types node,react` — passed. The bare command remains blocked by pre-existing malformed duplicate ambient folders such as `@types/react 3` and `@types/node 3`.
- Web export passed with all 50 API routes, including `/api/momentum/index`.

## 2026-08-03 — Rendered UI Correction

### Live component correction
- Verified the authenticated browser routes and confirmed `/dashboard` renders dashboard-local Today, Momentum, and Echo components, `ProjectCard`, and the legacy `ProjectGoalRow` Goals path; no `.web.tsx` dashboard override was active.
- Rebuilt the active Home layout into the reference’s three-column composition, removed the legacy Today headline and boxed/progress-track rows, enlarged Momentum’s chart, moved Echo into the reflective daily column, and replaced the default Goals rows with two real recently reflective active-goal previews.
- Kept the draft-specific Goals controls on the existing `?goalFilter=drafts` path, preserving draft workflow behavior while removing them from the normal Home preview.

### Constellation rendering diagnosis
- Confirmed the ambient radial gradient and three rings existed in the rendered SVG, but the dark rings used `#38383A` at 8–20% opacity and were effectively invisible.
- Changed the rendered rings to canonical green with verified dark opacities of 28%/20%/14% and light opacities of 24%/18%/12%; the radial field now uses the theme’s soft-green visualization color.
- Verified in the SVG DOM that gradient and rings share the exact Current Season graph coordinates and `userSpaceOnUse`, so the existing transformed visualization group keeps the field aligned through pan, zoom, fit, and reset.

### Visual checkpoints
- Captured authenticated light/dark Home and Constellation screenshots in `docs/ui-checkpoints/` after inspecting the actual browser output.
- Confirmed category identity colors remain visible and unchanged in the rendered Constellation.

### Validation
- `npx tsc --noEmit` remains blocked before project source checking by malformed installed implicit type-library aliases such as `react 3`, `node 3`, and `babel__core 3`.
- `npm run test:constellation` — 74 passed; `npm run test:entries` — 8 passed.
- `npx expo export --platform web --output-dir /private/tmp/ohara-ui-debug-export` — passed with all 49 API routes bundled.

## 2026-08-03 — Home Card Composition and Constellation Anchor Correction

### Home component replacement
- Replaced the Goals preview section’s loose legacy header/list composition with a single elevated feature card containing the existing Goals logo, reflective heading, primary creation action, preserved draft/view controls, and goal content hierarchy.
- Rebuilt Project Preview cards around the existing Project logo, project focal content, connected-goal context, accessible expansion control, and an inset expanded goal region without the legacy divider treatment.
- Retained the previously rebuilt Today’s Focus, Momentum, and Echo compositions and all underlying data, routes, calculations, click targets, and actions.

### Constellation visualization correction
- Moved the radial gradient out of the fixed page backdrop and into the transformed SVG visualization layer.
- Anchored the `#EAF2EA` to transparent radial gradient to the actual Current Season node geometry, so pan, zoom, fit, and recenter transformations move it with the graph.
- Rendered the three existing concentric dashed rings above the gradient at exactly 8%, 14%, and 20% opacity.
- Preserved node movement, selection, graph layout, zoom, pan, edges, category colors, labels, and inspectors.

## 2026-08-03 — Final UI Modernization Acceptance Pass

### Components redesigned
- Refined the canonical typography component around the native Apple/system font stack on web, with calmer 32/40 display, 24/32 heading, 18/26 panel-title, 16/24 body, and 12/16 caption rhythms.
- Rebuilt Goal cards around a large existing goal mark, prominent title and description, canonical category color, real progress ring, next relevant milestone/tracker, and due date while removing decorative badge and divider density.
- Updated native and web progress-ring labels to medium weight for a quieter hierarchy.

### Theme improvements
- Aligned semantic light and dark theme surfaces, text, dividers, and green accents with the final approved token board while retaining existing category palettes.
- Preserved the single semantic theme system; no competing palette or new dependency was introduced.

### Constellation improvements
- Replaced the dark-only center spotlight with a fixed, low-opacity radial depth gradient centered on the orbit system in both themes.
- Increased light and dark orbit readability and standardized the concentric rings to restrained dashed strokes.
- Preserved graph layout, zoom, pan, node sizing, labels, icons, category colors, edges, selection, inspectors, and all data behavior.

### Validation and review
- Final automated test, export, hardcoded-color, and diff results follow the earlier integration entry after this acceptance pass.
- Authenticated before/after Dashboard and Constellation screenshots remain blocked by the available preview session redirecting to login; no authentication bypass or placeholder fixture was introduced.

## 2026-08-03 — Entries Integration and Home Card Modernization

### Integration assessment
- Refreshed `upstream/main` to `5141740` and identified four Entries-specific commits: `373612b` (quick-create routing), `1ec4e52` (dashboard/Entries pipeline), `3d4b1bc` (unified Notes and Reflections workspace), and `5141740` (production runtime and category-link fix).
- Integrated only the Entries workspace, quick-create routing, dashboard latest-entry invalidation, active-goal reflection ordering dependencies, focused tests, and migration `037_fix_entry_category_link_source.sql`.
- Excluded unrelated upstream font-import, general performance, Momentum, Friends, Constellation, and app-bootstrap changes.
- No Git conflict markers occurred. Overlapping `dashboard.tsx`, app layout, Echo service, goal store, and UI store changes were reconciled manually so upstream behavior coexists with the current semantic tokens and modernized shared components.

### Entries files integrated
- Replaced the split Notes/Reflections tabs with the unified `EntriesLibrary` and `ReflectionLauncher` experience from upstream.
- Integrated updated Entries detail, editor, guided/completed reflection, store invalidation, utilities, security coverage, and relationship migration.
- Integrated `features/echo/dashboard-latest-entry*`, `lib/events/entries.ts`, and active-goal reflection selectors/services required by the upstream dashboard pipeline.

### Home modernization
- Rebuilt Today’s Focus as the principal daily card with a strong title, spacious actionable goal rows, quiet progress indicators, and full-row interaction targets.
- Re-composed Momentum with a larger storytelling chart, clearer primary insight, quieter chrome, and accessible chart expansion/navigation controls.
- Re-composed Echo as a reflective entry point using the existing Echo logo and latest real entry summary, without chatbot language or invented content.
- Refined Goal and Project preview rows with stronger title/progress hierarchy, semantic elevation, consistent radii, and 44px controls.

### Shared components and tokens
- Reused the canonical `Card`, `Button`, `Modal`, typography, semantic theme colors, and `constants/design.ts` spacing/radius/elevation tokens.
- Consolidated Entries cards and reflection launcher surfaces onto the shared Card implementation.
- No new dependencies, routes, APIs, schemas beyond upstream migration 037, feature names, logos, or icons were introduced.

### Validation
- `npx tsc --noEmit` remains blocked before project code evaluation by malformed installed type-library aliases such as `react 3`, `node 3`, and `babel__core 3`.
- No lint script is configured in `package.json`.
- `npm run test:entries` — 8 passed; `npm run test:echo-composer` — 5 passed; `npm run test:friends` — 13 passed; `npm run test:constellation` — 74 passed.
- Direct latest-entry and active-goal selector coverage — 10 passed.
- `npx expo export --platform web --output-dir /tmp/ohara-entries-home-final` — passed with all 49 API routes bundled.
- `git diff --check` and changed-file hardcoded-color search — passed after source normalization; no new local color literals were introduced in Home or Entries presentation files.
- Local runtime reached the authenticated route boundary without a bundle error; the available browser session redirected to login, so signed-in Home/Entries interaction and theme screenshots remain manual-review items.

### Remaining limitations and manual review
- Authenticated Home and Entries screenshot coverage requires a valid signed-in preview session.
- The existing Momentum preview source still exposes the repository’s pre-existing static seven-day points; replacing them with computed tracker data would require an approved calculation/data-contract change and was intentionally not performed.

## 2026-07-30 — Entries: Notes and Reflections

### Added
- Added the functional Entries workspace with a Notes library, canonical category shelves, search/filter/sort/view controls, note pinning and deletion, multi-goal/category links, and empty/loading/error states.
- Added a focused note editor with a code-native rich-text toolbar, debounced autosave, local failed-save recovery, export/copy actions, and a responsive session-aware Ohara Intelligence panel.
- Added Reflections landing, transparent guided prompts, goal/milestone context, recent history, and completed-reflection editing, export, conversation viewing, and deletion.
- Added an additive Supabase schema for Notes, Reflections, multi-goal/category relationships, reflection milestones, owner-scoped RLS, timestamps, schema/content versioning, transactional saves, and future retrieval normalization.
- Added a safe compatibility import that preserves the existing Echo tables while exposing existing user-authored Echo history as completed Reflections.
- Added authenticated API and service boundaries plus focused tests for recency ordering, unlinked Notes, multi-goal/multi-category shelving without duplicated records, retrieval-document normalization, transaction use, and owner-scoped policies.

### Synchronization
- Fetched `origin/main` and `upstream/main` on 2026-07-30.
- Fast-forwarded local `main` from `2792687` to upstream commit `18b93d4`, incorporating 11 team commits covering global creation and the latest Constellation work.
- Resolved compatible overlaps in the sidebar, app layout, UI session state, test scripts, and Codex changelog without dropping either implementation.
- Renumbered the Entries migration from `033` to `036` because upstream now owns migrations `033` through `035`.
- Connected upstream’s global New entry action to the canonical Entries New Note flow.

### Affected files
- `app/(app)/entries.tsx`
- `app/(app)/entries/[id].tsx`
- `app/(app)/entries/reflection.tsx`
- `app/api/entries/`
- `features/entries/`
- `lib/db/entries.ts`
- `lib/goals/catalog.ts`
- `supabase/migrations/036_entries_notes_reflections.sql`
- `components/layout/Sidebar.tsx`
- `components/ui/SegmentedControl.tsx`
- `components/ui/GoalCreationModeToggle.tsx`
- `components/ui/Modal.tsx`
- `store/uiStore.ts`
- `store/clearAllStores.ts`
- `app/(app)/_layout.tsx`
- `app/(app)/echo.tsx`
- `global.css`
- `package.json`
- `CHANGELOGCODEX.md`
- `ChangelogArthur.md`

### Validation
- `npx tsc --noEmit` — passed after synchronization.
- `npm run test:entries` — 7 tests passed.
- `npm run test:echo-composer` — 5 tests passed.
- `npm run test:constellation` — 74 tests passed.
- `npm run test:friends` — 13 tests passed.
- `npx expo export --platform web` — passed with 49 API routes.
- `git diff --check` and staged diff validation — passed.
- No repository lint script is currently available.

### Remaining limitations
- Migration `036_entries_notes_reflections.sql` must be applied to the target Supabase project after the upstream Constellation migrations before Entries persistence is available there.
- The editor provides a compatible code-native formatting surface rather than adding a large cross-platform editor dependency; native formatting uses lightweight markup commands while web uses a richer content-editable surface.
- Ohara Intelligence intentionally contains supported linked context and a clearly labeled future placeholder; it makes no AI requests.
- Guided Reflections use transparent configured prompts and do not generate AI summaries.
- Authenticated light/dark visual verification requires a valid signed-in browser session; the available preview session had an expired refresh token.
