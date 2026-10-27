# OHARA Workspace Design System V2.0

Phase 3B amendment (October 21, 2026): Reflections replaces Journal in visible navigation and copy; `/journal` and internal identifiers are retained. The Phase 1 account below is historical. See `OHARA-Goals-V2.0-Phase-3B.md` for the current Goals library/detail implementation and final review decisions.

## Phase 1 — foundation, 2026-10-15

Local implementation only. No commits, pushes, merges, deployments, production access, migrations, or new dependencies. Page redesigns require separate approval.

## Repository audit and isolation

- Expo SDK 55, React 19, React Native / React Native Web, Expo Router file routes; Zustand and NativeWind remain in place.
- Authentication and font bootstrap live in `app/_layout.tsx`. Neither auth logic nor the root provider tree changes. The existing `(app)` stack is wrapped by `WorkspaceShell`.
- The previous global navigation is `AppNavigation.tsx`. It remains the native implementation. Web resolves `WorkspaceShell.web.tsx`; native resolves `WorkspaceShell.tsx`.
- Existing Inter and Lora font assets are loaded at root. No font downloads or new families.
- Existing `constants/design.ts` already supplies typography, spacing, radii, controls, and elevation. `constants/workspace.ts` adds a scoped web workspace overlay, not a replacement global theme.
- The primary checkout (`codex/projects-v1-1-collaboration`, `39c02f2`) contains unrelated edits and duplicate untracked files. It is untouched.
- Isolated worktree: `/private/tmp/ohara-workspace-v2`, branch `codex/workspace-design-system-v2-phase1`, based on landing commit `d286285`. Approved uncommitted landing/auth refinements were copied from `/private/tmp/ohara-landing-v2`, whose files and branch remain untouched. Those carried-over changes are not new Phase 1 work.
- Landing V2 is the concrete visual reference. Skymetrics/Logip/Zaga/Notalx/Stratra are directional references from the brief; no unprovided source designs have been claimed as inspected.

## Navigation architecture

| Group | Destinations | Existing routes |
| --- | --- | --- |
| Workspace | Home, Goals, Projects, Calendar | `/dashboard`, `/goals`, `/projects`, `/calendar` |
| Echo | Notes, Journal (reflections) | `/notes`, `/journal` |
| Vaults | Sources | `/notes?view=sources` |
| Perspective | Momentum, Roots, Circles | `/momentum`, `/constellation`, `/circles` |
| Utility | Settings, appearance, account | Existing modal/panel controls; no invented routes |

Echo is a navigation grouping, not a new editor or API. Journal keeps its approved user-facing name. The existing `/echo` compatibility redirect remains untouched. Vaults has no standalone overview route, so its Sources child uses the existing authorized, federated Sources view. Goal/Project Vaults stay contextual. Tasks remain inside Goals/Projects.

Circles and Roots remain visible because repository feature flags currently enable these real destinations; no new community feature was introduced. Disabled destinations are omitted rather than presented as active links.

Navigation uses the repository's canonical `BrandIcon` marks and `VaultIcon`, including the official OHARA and Echo logos. Home deliberately retains the house icon approved during review. Account/Friends remains the existing panel; its anchoring now supports opening upward from the sidebar footer without leaving the viewport.

All links have real `href` values; ordinary clicks use Expo Router while modifier clicks/new tabs retain browser semantics. Route-family matching supports deep links and legacy reflection paths. The Sources query selects Sources, not Notes. Browser history remains intact.

## Layout and responsiveness

- Desktop >= 1100px: persistent 232px sidebar, collapsible to 76px. Collapse preference is an optional local-storage key (`ohara:workspace-v2:sidebar-collapsed`), independent of auth or data caches. Storage failures are harmless.
- Below 1100px: compact 64px toolbar and a modal navigation drawer. Closed navigation does not consume content space. The native HTML dialog provides modal focus containment and background inertness; Escape/backdrop/close dismiss it and restore focus.
- Sidebar navigation scrolls independently on short windows; settings/account remain logically anchored at its bottom. Expanded labels, collapsed tooltips, accessible names, and active-route indicator are preserved.
- `WorkspaceDimensionsContext` provides usable content width and height after chrome. Existing responsive pages use `useWorkspaceDimensions`; native falls back to unchanged viewport dimensions. This prevents desktop column thresholds from ignoring sidebar space.
- Shell owns chrome and a flexible main region only. Existing pages retain their scroll ownership, tabs, document navigation, analytics grids, and secondary panels. `AuthenticatedPageShell` handles outer spacing; pages continue choosing their own column structure. No universal fixed column layout or forced maximum width.
- Workspace gutters: 16px compact, 32px normal. Existing narrower reading widths remain page-owned. All major frame containers allow shrinking with `min-width: 0` / `min-height: 0`.
- User-requested Home compatibility correction: the desktop Calendar/Today's Focus card aligns with the combined Momentum and Next Step cards. Both columns stretch naturally; mobile cards remain content-sized and native keeps its previous geometry.

## Typography

Inter is the functional family: controls, navigation, inputs, task rows, dense cards, metadata, charts. Lora Regular is used selectively for shared `heading` variants carrying the semantic `header` accessibility role, and for `greeting`, inside the web workspace: 32/42px desktop and 28/36px compact, with restrained tracking. Existing explicit page overrides remain respected. Numeric headings, card titles, and data remain sans-serif; editor typography is not rewritten.

Use existing semantic `Typography` variants rather than direct font names in new page work. Use uppercase only for short overlines/group labels; sentence case for actions, input labels, and explanatory text. No all-caps paragraphs.

## Color and theme conventions

The workspace emphasizes the approved white-over-cream clarification. No large cream fields, gradients, or decorative imagery are added to authenticated screens.

| Role | Light | Dark |
| --- | --- | --- |
| Page | `#F8F8F6` | `#191D1B` |
| Card | `#FFFFFF` | `#222724` |
| Sidebar | `#F1F3EF` | `#1D221F` |
| Action / accent text | `#315743` | `#A6D1B1` |
| Primary action text | `#FFFFFF` | `#17291F` |
| Selected surface | `#E6EDE6` | `#2D3D32` |
| Primary text | `#1C1C1E` | `#F1F4EF` |
| Secondary text | `#6E6E73` | `#B1BAB3` |
| Muted text | `#6B716C` | `#A0ABA3` |

`useThemeColors` honors a scoped workspace appearance context; outside that context it returns existing theme constants unchanged. Workspace modals retain the context through React portals. Semantic warning/error/success-category colors remain the established tokens; status is never communicated only through color. Existing Goal category coding is preserved.

Core text on card/page surfaces, primary controls, and selected-navigation text have automated WCAG AA contrast checks. This is not a claim that every legacy page or status color has undergone a complete accessibility audit.

## Spacing, shape, and depth

Reuse `SPACE` (2/4/6/8/12/16/20/24/32/40/48/64px). Workspace section gap/gutter 32px, card padding 24px when spacious, control gap 8px. Inputs/buttons use 8px corners; cards 16px; dialogs 20px. Avoid making all controls pills. Standard cards use existing low elevation inside the web workspace; explicit `elevation="none"` remains available for dense/repeated content. Do not layer multiple shadows unnecessarily.

## Reusable component inventory

| Primitive | Phase 1 treatment |
| --- | --- |
| Button | Existing behavior, loading/disabled semantics retained; scoped forest palette and 8px corners |
| Card | Existing variants/padding/header/footer composition; scoped subtle standard elevation |
| Input / textarea | Existing labeled `Input`, `multiline` for textarea; themed surfaces/focus/errors and scoped 8px corners |
| Tabs | Existing `SegmentedControl` and page tabs inherit palette; no interaction rewrite |
| Badge | Existing semantic variants inherit contrast-safe accent text; category meaning retained |
| Checkbox / toggle | Existing task controls and `Toggle`; no scheduling/state changes |
| Modal / dialog | Existing `Modal`, settings/account/create panels retained; new navigation drawer uses native HTML dialog only on web |
| Dropdown / select | Existing `AnchoredPopover`/`OverflowMenu` and domain pickers; no speculative universal select API |
| Tooltip | Accessible sidebar icon names, hover/focus rail labels, utility title hints |
| Empty / loading | Existing `EmptyStateCard`, activity indicators, and domain messages inherit tokens; no invented counts/data |
| Page header | Existing `FeaturePageHeader` uses scoped serif title; functional toolbar stays sans-serif |

There is no new dependency or competing component framework. Existing dialogs/pickers are not wholesale rewritten. Web focus CSS is limited to `.workspace-v2`; native controls and public routes keep their defaults.

## Charts and analytics

Audited `features/momentum/components/MomentumTrendChart.tsx`: measured-width SVG, theme-driven green line, muted labels, subtle grid/baseline, existing points and time controls. It inherits workspace palette through the existing hook. Geometry, domain/range, point aggregation, scoring, timezone, and history handling remain unchanged.

Reusable future chart tokens in `WORKSPACE.chart` establish 2px lines, 4px selected points, subtle grids, 11px sans labels, and 8px tooltip radius. They are conventions for later page work, not a silent rewrite of current charts. Legends must include text, time selectors must expose selection, tooltips must be keyboard reachable if interactive, empty states must distinguish absent data from zero, and loading must not show fabricated points. Current Momentum chart is noninteractive; tooltip interaction is deferred.

## Accessibility standards

- Named landmarks/navigation groups and links; one `aria-current="page"` destination per recognized route.
- Keyboard-accessible toggle, create/account/settings actions; visible focus rings and skip-to-content link.
- 44px navigation/control hit targets; icon rail includes accessible labels and focus/hover tooltips.
- Drawer: focus on close button, Tab containment, Escape/backdrop dismissal, no hidden duplicate navigation links in the tab order.
- Reduced motion disables workspace transitions. No content animations or hover-only required actions.
- Screen-reader labels are covered structurally/browser-tested; an assistive-technology user study is not claimed.

## Validation and remaining limits

Run `npx playwright test --config tests/workspace-v2/playwright.config.ts` for workspace and existing landing/auth browser checks against the same local build, with intercepted synthetic accounts/data. Screenshots are in `docs/ui-checkpoints/workspace-v2`. Unit coverage: `node --experimental-strip-types --test tests/workspace-v2/foundation.test.ts`.

Final local checks (2026-10-19):

- Workspace foundation: 3 tests passed, including route selection, native/public isolation, and core text/control contrast.
- All 7 browser tests passed: public landing/auth regressions, desktop sidebar persistence and route selection, account/create/settings controls, Home card-edge alignment, mobile/tablet drawer keyboard behavior and overflow at 320–1280px, and fresh dark loading/reduced motion.
- Auth, prelaunch, Friends, Projects, Entries/shared-collaboration, Calendar, and Momentum suites passed.
- Production web export and iOS JavaScript export passed. Physical-device/native navigation behavior still needs device validation. The environment has no usable `simctl`, so no iOS simulator result is claimed.
- `git diff --check` passed. No new TypeScript diagnostics; the baseline issue below remains.

Screenshots include expanded/collapsed light Home, settled and fresh dark Home, dark Goals, account panel, mobile navigation, mobile Projects, and mobile dark Home. All account/content fixtures are synthetic and network-intercepted. The initially incomplete Momentum and Friends preview payloads were corrected to match their typed contracts; no production domain code was changed to accommodate fixtures. Theme screenshots wait for settled computed colors so an in-progress theme transition is not presented as a persistent white-block defect.

The repository has no configured lint script. Tracked TypeScript retains the known `lib/goals/manual-create-v1.test.ts` URL overload issue. Before Expo generated its ignored environment type file, a clean install also reported React Native Web augmentation diagnostics; generating normal Expo types removes those, leaving the single known baseline issue.

Phase 2 should audit page-owned hard-coded colors, inline type overrides, and dense layouts screen by screen. This phase does not assert that every historic screen is visually redesigned or pixel-identical in both themes. No caching, auth/session infrastructure, API clients, domain services, or production integrations were refactored.
